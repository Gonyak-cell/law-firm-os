import { createHash, randomUUID } from "node:crypto";
import {
  RepositoryIdempotencyConflictError,
  requireRepositoryTenantId,
} from "../../persistence/src/repository-port-v2.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { IDENTITY_LEDGER_CONTRACT_VERSION } from "./identity-ledger.js";

const ACCOUNT_STATUSES = new Set(["active", "disabled"]);
const CREDENTIAL_STATUSES = new Set(["active", "must_change", "reset_required", "locked", "disabled"]);
const CHALLENGE_TYPES = new Set(["password_reset", "step_up", "oidc_login"]);
const INTERNAL_PASSWORD_PROVIDER_ID = "lawos-internal-password-provider-v1";
const FORBIDDEN_AUDIT_DETAIL_KEY = /(^|_)(password|secret|token|totp|proof|authorization|challenge_hash|password_hash)(_|$)/iu;
const FORBIDDEN_DIRECTORY_PROFILE_KEY =
  /(^|_)(?:password|password_hash|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const DIRECTORY_PROFILE_KEYS = Object.freeze([
  "display_name",
  "english_name",
  "source_title",
  "employee_id",
  "legal_name",
  "work_email",
  "title",
  "employment_type",
  "affiliation",
  "department",
  "organization_group",
  "org_unit_id",
  "country",
  "professional_profile",
  "source_attributes",
  "mfa_required",
  "production_status",
  "qa_tenant_scope",
  "registration_state",
  "highest_privilege",
  "privilege_rank",
  "assurance_level",
  "roster_link_status",
  "login_allowed",
  "identity_setup_allowed",
  "access_grant_allowed",
  "source_ref",
]);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function required(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}

function optional(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function millis(value) {
  const resolved = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(resolved)) throw new TypeError("identity ledger timestamp must be valid");
  return resolved;
}

function iso(value) {
  return new Date(millis(value)).toISOString();
}

function nowMs(clock) {
  return millis(typeof clock === "function" ? clock() : clock);
}

function normalizeAccountStatus(value) {
  return ACCOUNT_STATUSES.has(value) ? value : "active";
}

function requireAccountStatus(value) {
  const status = required(value, "account status");
  if (!ACCOUNT_STATUSES.has(status)) throw new TypeError(`unsupported account status: ${status}`);
  return status;
}

function requireCredentialRevision(value) {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError("credential_rev must be a positive integer");
  return revision;
}

function normalizeCredentialStatus(value, accountStatus = "active") {
  if (accountStatus === "disabled") return "disabled";
  return CREDENTIAL_STATUSES.has(value) ? value : "reset_required";
}

function normalizeStringArray(value, name) {
  if (value == null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return Object.freeze([...new Set(value.map((item) => required(item, name)))]);
}

function assertDirectoryProfileSafe(value, path = "profile", depth = 0) {
  if (depth > 24) throw new TypeError("identity directory profile exceeds the maximum depth");
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) {
    throw new TypeError(`${path} contains raw bytes`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertDirectoryProfileSafe(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_DIRECTORY_PROFILE_KEY.test(key)) {
      throw new TypeError(`${path} contains forbidden sensitive material`);
    }
    assertDirectoryProfileSafe(item, `${path}.${key}`, depth + 1);
  }
}

function normalizeDirectoryProfile(user = {}) {
  const source = user.profile && typeof user.profile === "object" && !Array.isArray(user.profile)
    ? user.profile
    : user;
  const profile = Object.fromEntries(DIRECTORY_PROFILE_KEYS
    .filter((key) => source[key] !== undefined && source[key] !== null)
    .map((key) => [key, clone(source[key])]));
  assertDirectoryProfileSafe(profile);
  return Object.freeze(profile);
}

function normalizeDirectoryMembership(input = {}, tenantId, userId) {
  const membership = input.membership
    ?? (input.user?.tenant_memberships ?? []).find((entry) => entry?.tenant_id === tenantId)
    ?? input.user
    ?? {};
  const status = membership.status === "active" ? "active" : "disabled";
  return Object.freeze({
    tenant_id: tenantId,
    user_id: userId,
    status,
    role_profile_id: optional(membership.role_profile_id),
    role_ids: normalizeStringArray(membership.role_ids, "directory role id"),
    group_ids: normalizeStringArray(membership.group_ids, "directory group id"),
    scopes: normalizeStringArray(membership.scopes, "directory scope"),
    hrx_scopes: normalizeStringArray(membership.hrx_scopes, "directory HRX scope"),
    source_ref: optional(membership.source_ref ?? input.user?.source_ref),
  });
}

function normalizeAccountSeed(user = {}) {
  const accountStatus = normalizeAccountStatus(user.account_status ?? user.status);
  const credentialRev = Number(user.credential_rev ?? 1);
  return Object.freeze({
    user_id: required(user.user_id, "identity user_id"),
    email: optional(user.email)?.toLowerCase() ?? null,
    account_status: accountStatus,
    credential_provider: optional(user.credential_provider),
    credential_status: normalizeCredentialStatus(user.credential_status, accountStatus),
    credential_rev: Number.isSafeInteger(credentialRev) && credentialRev > 0 ? credentialRev : 1,
    password_hash: clone(user.password_hash ?? {}),
    profile: normalizeDirectoryProfile(user),
  });
}

function mapAccount(row) {
  if (!row) return null;
  return Object.freeze({
    tenant_id: row.tenant_id,
    user_id: row.user_id,
    email: row.email,
    account_status: row.account_status,
    credential_provider: row.credential_provider,
    credential_status: row.credential_status,
    credential_rev: Number(row.credential_rev),
    password_hash: Object.freeze(clone(row.password_hash ?? {})),
    profile: Object.freeze(clone(row.profile ?? {})),
    federated_tenant_id: row.federated_tenant_id,
    federated_subject_id: row.federated_subject_id,
    failed_login_count: Number(row.failed_login_count),
    locked_until: row.locked_until ? iso(row.locked_until) : null,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
}

function mapDirectoryUser(row) {
  if (!row) return null;
  const profile = Object.freeze(clone(row.profile ?? {}));
  const membership = Object.freeze({
    tenant_id: row.tenant_id,
    status: row.membership_status,
    role_profile_id: row.role_profile_id,
    role_ids: Object.freeze(clone(row.role_ids ?? [])),
    group_ids: Object.freeze(clone(row.group_ids ?? [])),
    scopes: Object.freeze(clone(row.scopes ?? [])),
    hrx_scopes: Object.freeze(clone(row.hrx_scopes ?? [])),
    source_ref: row.membership_source_ref,
    state_version: Number(row.membership_state_version),
  });
  return Object.freeze({
    tenant_id: row.tenant_id,
    user_id: row.user_id,
    email: row.email,
    status: row.account_status,
    account_status: row.account_status,
    credential_provider: row.credential_provider,
    credential_status: row.credential_status,
    credential_rev: Number(row.credential_rev),
    failed_login_count: Number(row.failed_login_count),
    locked_until: row.locked_until ? iso(row.locked_until) : null,
    ...profile,
    profile,
    role_profile_id: membership.role_profile_id,
    role_ids: membership.role_ids,
    group_ids: membership.group_ids,
    scopes: membership.scopes,
    hrx_scopes: membership.hrx_scopes,
    directory_state_version: membership.state_version,
    tenant_memberships: Object.freeze([membership]),
    directory_source: "postgres-v2",
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
}

const DIRECTORY_SELECT = `SELECT accounts.tenant_id, accounts.user_id, accounts.email,
       accounts.account_status, accounts.credential_provider, accounts.credential_status,
       accounts.credential_rev, accounts.failed_login_count, accounts.locked_until,
       accounts.profile, accounts.created_at, accounts.updated_at,
       memberships.status AS membership_status,
       memberships.role_profile_id, memberships.role_ids, memberships.group_ids,
       memberships.scopes, memberships.hrx_scopes,
       memberships.source_ref AS membership_source_ref,
       memberships.state_version AS membership_state_version
  FROM lawos_identity.accounts AS accounts
  JOIN lawos_identity.account_memberships AS memberships
    ON memberships.tenant_id = accounts.tenant_id
   AND memberships.user_id = accounts.user_id`;

function mapChallenge(row) {
  if (!row) return null;
  return Object.freeze({
    tenant_id: row.tenant_id,
    challenge_id: row.challenge_id,
    challenge_type: row.challenge_type,
    user_id: row.user_id,
    email: row.email,
    purpose: row.purpose,
    provider_id: row.provider_id,
    requested_at: iso(row.requested_at),
    expires_at: iso(row.expires_at),
    used_at: row.used_at ? iso(row.used_at) : null,
    revoked_at: row.revoked_at ? iso(row.revoked_at) : null,
    revoke_reason: row.revoke_reason,
    metadata: Object.freeze(clone(row.metadata ?? {})),
  });
}

function mapPasswordResetJob(row) {
  if (!row) return null;
  return Object.freeze({
    tenant_id: row.tenant_id,
    job_id: row.job_id,
    email: row.email,
    request_id: row.request_id,
    state: row.state,
    attempt_count: Number(row.attempt_count),
    available_at: iso(row.available_at),
    lease_owner: row.lease_owner,
    lease_expires_at: row.lease_expires_at ? iso(row.lease_expires_at) : null,
    last_error_code: row.last_error_code,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
}

function mapBreakGlass(row) {
  if (!row) return null;
  return Object.freeze({
    tenant_id: row.tenant_id,
    break_glass_request_id: row.break_glass_request_id,
    requester_user_id: row.requester_user_id,
    requester_label: row.requester_label,
    reason: row.reason,
    break_glass_account_ref: row.break_glass_account_ref,
    minimum_privilege_profile: row.minimum_privilege_profile,
    required_approvals: Number(row.required_approvals ?? 2),
    approval_count: Number(row.approval_count ?? 0),
    state: row.state,
    requested_at: iso(row.requested_at),
    expires_at: row.expires_at ? iso(row.expires_at) : null,
    activated_at: row.activated_at ? iso(row.activated_at) : null,
    decided_by: row.decided_by,
    decided_at: row.decided_at ? iso(row.decided_at) : null,
  });
}

function assertAuditDetails(details, path = "details") {
  if (!details || typeof details !== "object") return;
  for (const [key, value] of Object.entries(details)) {
    if (FORBIDDEN_AUDIT_DETAIL_KEY.test(key)) throw new TypeError(`security audit secret field is forbidden: ${path}.${key}`);
    if (value && typeof value === "object") assertAuditDetails(value, `${path}.${key}`);
  }
}

async function insertAudit(client, tenantId, input, clock) {
  const details = clone(input.details ?? {});
  assertAuditDetails(details);
  const event = {
    audit_event_id: optional(input.audit_event_id) ?? `security_audit_${randomUUID()}`,
    action: required(input.action, "security audit action"),
    object_id: optional(input.object_id),
    actor_id: optional(input.actor_id),
    occurred_at: iso(input.occurred_at ?? nowMs(clock)),
    details,
  };
  const result = await client.query(
    `INSERT INTO lawos_identity.security_audit_events
       (tenant_id, audit_event_id, action, object_id, actor_id, occurred_at, details)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)
     RETURNING tenant_id, audit_event_id, action, object_id, actor_id, occurred_at, details`,
    [tenantId, event.audit_event_id, event.action, event.object_id, event.actor_id, event.occurred_at, JSON.stringify(event.details)],
  );
  const row = result.rows[0];
  return Object.freeze({ ...clone(row), occurred_at: iso(row.occurred_at) });
}

function requireSha256(value, name) {
  const hash = required(value, name).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(hash)) throw new TypeError(`${name} must be a SHA-256 digest`);
  return hash;
}

function directoryOutboxEventId(idempotencyKey) {
  return `identity_directory_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 40)}`;
}

async function claimDirectoryIdempotency(client, tenantId, input, clock) {
  if (input.idempotency_key == null && input.request_hash == null) return null;
  const key = required(input.idempotency_key, "directory idempotency key");
  const requestHash = requireSha256(input.request_hash, "directory idempotency request_hash");
  const createdAt = iso(nowMs(clock));
  const inserted = await client.query(
    `INSERT INTO lawos_identity.directory_idempotency_keys
       (tenant_id, idempotency_key, request_hash, response, created_at)
     VALUES ($1, $2, $3, NULL, $4::timestamptz)
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
     RETURNING tenant_id, idempotency_key, request_hash, response, created_at`,
    [tenantId, key, requestHash, createdAt],
  );
  const row = inserted.rows[0] ?? (await client.query(
    `SELECT tenant_id, idempotency_key, request_hash, response, created_at
       FROM lawos_identity.directory_idempotency_keys
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [tenantId, key],
  )).rows[0];
  if (row.request_hash !== requestHash) throw new RepositoryIdempotencyConflictError();
  return Object.freeze({
    key,
    request_hash: requestHash,
    replayed: inserted.rowCount === 0,
    response: clone(row.response),
    created_at: iso(row.created_at),
  });
}

async function completeDirectoryIdempotency(client, tenantId, claim, response) {
  if (!claim || claim.replayed) return;
  await client.query(
    `UPDATE lawos_identity.directory_idempotency_keys
        SET response = $3::jsonb
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [tenantId, claim.key, JSON.stringify(response ?? null)],
  );
}

function mapDirectoryOutbox(row, replayed = false) {
  if (!row) return null;
  return Object.freeze({
    tenant_id: row.tenant_id,
    event_id: row.event_id,
    topic: row.topic,
    aggregate_type: row.aggregate_type,
    aggregate_id: row.aggregate_id,
    payload: Object.freeze(clone(row.payload ?? {})),
    status: row.status,
    attempt_count: Number(row.attempt_count),
    created_at: iso(row.created_at),
    published_at: row.published_at ? iso(row.published_at) : null,
    replayed,
  });
}

async function enqueueDirectoryOutbox(client, tenantId, input, claim, clock) {
  if (!claim) return null;
  const eventId = optional(input.outbox_event_id) ?? directoryOutboxEventId(claim.key);
  const topic = optional(input.outbox_topic) ?? "identity.directory.user.changed";
  const payload = {
    synthetic_only: input.data_scope === "synthetic-only",
    user_id: required(input.user?.user_id, "identity user_id"),
    directory_state_version: Number(input.directory_state_version),
  };
  assertAuditDetails(payload, "outbox.payload");
  const inserted = await client.query(
    `INSERT INTO lawos_identity.directory_outbox_events
       (tenant_id, event_id, topic, aggregate_type, aggregate_id, payload, created_at)
     VALUES ($1, $2, $3, 'identity-directory-user', $4, $5::jsonb, $6::timestamptz)
     ON CONFLICT (tenant_id, event_id) DO NOTHING
     RETURNING tenant_id, event_id, topic, aggregate_type, aggregate_id, payload,
               status, attempt_count, created_at, published_at`,
    [tenantId, eventId, topic, input.user.user_id, JSON.stringify(payload), iso(nowMs(clock))],
  );
  const row = inserted.rows[0] ?? (await client.query(
    `SELECT tenant_id, event_id, topic, aggregate_type, aggregate_id, payload,
            status, attempt_count, created_at, published_at
       FROM lawos_identity.directory_outbox_events
      WHERE tenant_id = $1 AND event_id = $2`,
    [tenantId, eventId],
  )).rows[0];
  if (row.topic !== topic || row.aggregate_id !== input.user.user_id) {
    throw new RepositoryIdempotencyConflictError("directory outbox event already exists with different content");
  }
  return mapDirectoryOutbox(row, inserted.rowCount === 0);
}

async function ensureAccountRow(client, tenantId, user, clock) {
  const account = normalizeAccountSeed(user);
  const timestamp = iso(nowMs(clock));
  await client.query(
    `INSERT INTO lawos_identity.accounts
       (tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev, password_hash, profile, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::timestamptz, $10::timestamptz)
     ON CONFLICT (tenant_id, user_id) DO NOTHING`,
    [tenantId, account.user_id, account.email, account.account_status, account.credential_provider, account.credential_status, account.credential_rev, JSON.stringify(account.password_hash), JSON.stringify(account.profile), timestamp],
  );
  const result = await client.query(
    `SELECT tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
            password_hash, profile, federated_tenant_id, federated_subject_id,
            failed_login_count, locked_until, created_at, updated_at
       FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, account.user_id],
  );
  return mapAccount(result.rows[0]);
}

function expectedChallengeError(record, currentTime) {
  if (!record) return Object.freeze({ ok: false, reason: "invalid_challenge", safe_error_code: "AUTH_CHALLENGE_INVALID", status: 401 });
  if (record.revoked_at) return Object.freeze({ ok: false, reason: "challenge_revoked", safe_error_code: "AUTH_CHALLENGE_INVALID", status: 401 });
  if (record.used_at) return Object.freeze({ ok: false, reason: "challenge_used", safe_error_code: "AUTH_CHALLENGE_USED", status: 401 });
  if (millis(record.expires_at) <= currentTime) return Object.freeze({ ok: false, reason: "challenge_expired", safe_error_code: "AUTH_CHALLENGE_EXPIRED", status: 401 });
  return null;
}

export function createPostgresIdentityLedger({ pool, clock = () => Date.now(), transactionOptions = {} } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required for identity ledger");

  const scoped = (tenantId, callback) => withPostgresTransaction(
    pool,
    { ...transactionOptions, tenant_id: requireRepositoryTenantId(tenantId) },
    callback,
  );

  async function provisionDirectoryUser(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed({
      ...input.user,
      credential_provider: input.user?.credential_provider ?? INTERNAL_PASSWORD_PROVIDER_ID,
      credential_status: input.user?.credential_status ?? "reset_required",
      password_hash: {},
    });
    const membership = normalizeDirectoryMembership(input, tenantId, seed.user_id);
    return scoped(tenantId, async (client) => {
      const idempotency = await claimDirectoryIdempotency(client, tenantId, input, clock);
      if (idempotency?.replayed) {
        const existing = await client.query(
          `${DIRECTORY_SELECT}
            WHERE accounts.tenant_id = $1 AND accounts.user_id = $2`,
          [tenantId, seed.user_id],
        );
        if (!existing.rows[0]) throw new RepositoryIdempotencyConflictError("directory replay target is missing");
        const outbox = await client.query(
          `SELECT tenant_id, event_id, topic, aggregate_type, aggregate_id, payload,
                  status, attempt_count, created_at, published_at
             FROM lawos_identity.directory_outbox_events
            WHERE tenant_id = $1 AND event_id = $2`,
          [tenantId, optional(input.outbox_event_id) ?? directoryOutboxEventId(idempotency.key)],
        );
        return Object.freeze({
          user: mapDirectoryUser(existing.rows[0]),
          replayed: true,
          account_changed: false,
          membership_changed: false,
          idempotency_replayed: true,
          outbox: mapDirectoryOutbox(outbox.rows[0], Boolean(outbox.rows[0])),
        });
      }
      const timestamp = iso(nowMs(clock));
      const insertedAccount = await client.query(
        `INSERT INTO lawos_identity.accounts
           (tenant_id, user_id, email, account_status, credential_provider, credential_status,
            credential_rev, password_hash, profile, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, $8::jsonb, $9::timestamptz, $9::timestamptz)
         ON CONFLICT (tenant_id, user_id) DO NOTHING
         RETURNING user_id`,
        [
          tenantId,
          seed.user_id,
          seed.email,
          seed.account_status,
          seed.credential_provider,
          seed.credential_status,
          seed.credential_rev,
          JSON.stringify(seed.profile),
          timestamp,
        ],
      );
      let accountChanged = insertedAccount.rowCount > 0;
      let accountStatusChanged = false;
      if (!accountChanged) {
        const currentAccount = await client.query(
          `SELECT account_status
             FROM lawos_identity.accounts
            WHERE tenant_id = $1 AND user_id = $2
            FOR UPDATE`,
          [tenantId, seed.user_id],
        );
        accountStatusChanged = currentAccount.rows[0]?.account_status !== seed.account_status;
        const updatedAccount = await client.query(
          `UPDATE lawos_identity.accounts
              SET email = $3,
                  account_status = $4,
                  credential_provider = COALESCE(credential_provider, $5),
                  credential_status = CASE
                    WHEN $4 = 'disabled' THEN 'disabled'
                    WHEN account_status = 'disabled' AND $4 = 'active' THEN 'reset_required'
                    ELSE credential_status
                  END,
                  credential_rev = credential_rev + CASE WHEN account_status IS DISTINCT FROM $4 THEN 1 ELSE 0 END,
                  profile = $6::jsonb,
                  updated_at = $7::timestamptz
            WHERE tenant_id = $1
              AND user_id = $2
              AND (email, account_status, credential_provider, profile)
                    IS DISTINCT FROM ($3, $4, COALESCE(credential_provider, $5), $6::jsonb)
          RETURNING user_id`,
          [tenantId, seed.user_id, seed.email, seed.account_status, seed.credential_provider, JSON.stringify(seed.profile), timestamp],
        );
        accountChanged = updatedAccount.rowCount > 0;
        if (!accountChanged) accountStatusChanged = false;
      }

      const insertedMembership = await client.query(
        `INSERT INTO lawos_identity.account_memberships
           (tenant_id, user_id, status, role_profile_id, role_ids, group_ids, scopes, hrx_scopes,
            source_ref, state_version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, 1, $10::timestamptz, $10::timestamptz)
         ON CONFLICT (tenant_id, user_id) DO NOTHING
         RETURNING user_id`,
        [
          tenantId,
          seed.user_id,
          membership.status,
          membership.role_profile_id,
          JSON.stringify(membership.role_ids),
          JSON.stringify(membership.group_ids),
          JSON.stringify(membership.scopes),
          JSON.stringify(membership.hrx_scopes),
          membership.source_ref,
          timestamp,
        ],
      );
      let membershipChanged = insertedMembership.rowCount > 0;
      if (!membershipChanged) {
        const updatedMembership = await client.query(
          `UPDATE lawos_identity.account_memberships
              SET status = $3,
                  role_profile_id = $4,
                  role_ids = $5::jsonb,
                  group_ids = $6::jsonb,
                  scopes = $7::jsonb,
                  hrx_scopes = $8::jsonb,
                  source_ref = $9,
                  state_version = state_version + 1,
                  updated_at = $10::timestamptz
            WHERE tenant_id = $1
              AND user_id = $2
              AND (status, role_profile_id, role_ids, group_ids, scopes, hrx_scopes, source_ref)
                    IS DISTINCT FROM ($3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9)
          RETURNING user_id`,
          [
            tenantId,
            seed.user_id,
            membership.status,
            membership.role_profile_id,
            JSON.stringify(membership.role_ids),
            JSON.stringify(membership.group_ids),
            JSON.stringify(membership.scopes),
            JSON.stringify(membership.hrx_scopes),
            membership.source_ref,
            timestamp,
          ],
        );
        membershipChanged = updatedMembership.rowCount > 0;
      }

      if (accountChanged || membershipChanged) {
        await insertAudit(client, tenantId, {
          action: "auth.directory.user.provisioned",
          object_id: seed.user_id,
          actor_id: input.actor_id,
          details: {
            account_changed: accountChanged,
            membership_changed: membershipChanged,
            account_status_changed: accountStatusChanged,
            account_status: seed.account_status,
            membership_status: membership.status,
          },
        }, clock);
      }
      const result = await client.query(
        `${DIRECTORY_SELECT}
          WHERE accounts.tenant_id = $1 AND accounts.user_id = $2`,
        [tenantId, seed.user_id],
      );
      const user = mapDirectoryUser(result.rows[0]);
      const outbox = accountChanged || membershipChanged
        ? await enqueueDirectoryOutbox(client, tenantId, {
          ...input,
          user: { ...input.user, user_id: seed.user_id },
          directory_state_version: user.directory_state_version,
        }, idempotency, clock)
        : null;
      await completeDirectoryIdempotency(client, tenantId, idempotency, {
        user_id: seed.user_id,
        directory_state_version: user.directory_state_version,
        changed: accountChanged || membershipChanged,
      });
      return Object.freeze({
        user,
        replayed: !accountChanged && !membershipChanged,
        account_changed: accountChanged,
        membership_changed: membershipChanged,
        idempotency_replayed: false,
        outbox,
      });
    });
  }

  async function findDirectoryUserByEmail(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const email = required(input.email, "directory email").toLowerCase();
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `${DIRECTORY_SELECT}
          WHERE accounts.tenant_id = $1 AND lower(accounts.email) = $2`,
        [tenantId, email],
      );
      return mapDirectoryUser(result.rows[0]);
    });
  }

  async function findDirectoryUserByUserId(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const userId = required(input.user_id, "directory user_id");
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `${DIRECTORY_SELECT}
          WHERE accounts.tenant_id = $1 AND accounts.user_id = $2`,
        [tenantId, userId],
      );
      return mapDirectoryUser(result.rows[0]);
    });
  }

  async function listDirectoryUsers(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `${DIRECTORY_SELECT}
          WHERE accounts.tenant_id = $1
          ORDER BY lower(accounts.email) NULLS LAST, accounts.user_id`,
        [tenantId],
      );
      return Object.freeze(result.rows.map(mapDirectoryUser));
    });
  }

  async function listDirectoryOutbox(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, event_id, topic, aggregate_type, aggregate_id, payload,
                status, attempt_count, created_at, published_at
           FROM lawos_identity.directory_outbox_events
          WHERE tenant_id = $1
          ORDER BY created_at, event_id`,
        [tenantId],
      );
      return Object.freeze(result.rows.map((row) => mapDirectoryOutbox(row)));
    });
  }

  async function listDirectoryIdempotency(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, idempotency_key, request_hash, response, created_at
           FROM lawos_identity.directory_idempotency_keys
          WHERE tenant_id = $1
          ORDER BY created_at, idempotency_key`,
        [tenantId],
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({
        tenant_id: row.tenant_id,
        key: row.idempotency_key,
        request_hash: row.request_hash,
        response: Object.freeze(clone(row.response ?? {})),
        created_at: iso(row.created_at),
      })));
    });
  }

  async function ensureAccount(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, (client) => ensureAccountRow(client, tenantId, input.user, clock));
  }

  async function getAccount(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const userId = required(input.user_id, "identity user_id");
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                password_hash, profile, federated_tenant_id, federated_subject_id,
                failed_login_count, locked_until, created_at, updated_at
           FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId],
      );
      return mapAccount(result.rows[0]);
    });
  }

  async function setCredential(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed({ ...input.user, credential_provider: input.provider_id, credential_status: input.status, password_hash: input.password_hash });
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const locked = await client.query("SELECT credential_rev FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = $2 FOR UPDATE", [tenantId, seed.user_id]);
      const requestedRevision = Number(input.credential_rev);
      const nextRevision = Number(locked.rows[0].credential_rev) + 1;
      const credentialRev = Number.isSafeInteger(requestedRevision) && requestedRevision > 0
        ? Math.max(nextRevision, requestedRevision)
        : nextRevision;
      const status = normalizeCredentialStatus(input.status ?? "active");
      const timestamp = iso(nowMs(clock));
      const result = await client.query(
        `UPDATE lawos_identity.accounts
            SET email = $3, credential_provider = $4, credential_status = $5, credential_rev = $6,
                password_hash = $7::jsonb, failed_login_count = 0, locked_until = NULL, updated_at = $8::timestamptz
          WHERE tenant_id = $1 AND user_id = $2
        RETURNING tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                  password_hash, federated_tenant_id, federated_subject_id,
                  failed_login_count, locked_until, created_at, updated_at`,
        [tenantId, seed.user_id, seed.email, input.provider_id ?? seed.credential_provider, status, credentialRev, JSON.stringify(input.password_hash ?? {}), timestamp],
      );
      await insertAudit(client, tenantId, {
        action: input.audit_action ?? "auth.credential.updated",
        object_id: seed.user_id,
        actor_id: input.actor_id ?? seed.user_id,
        details: { credential_rev: credentialRev, credential_status: status },
      }, clock);
      return mapAccount(result.rows[0]);
    });
  }

  async function ensureFederatedAccount(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed(input.user);
    const providerId = required(input.provider_id, "federated provider_id");
    const federatedTenantId = required(input.federated_tenant_id, "federated_tenant_id");
    const federatedSubjectId = required(input.federated_subject_id, "federated_subject_id");
    const preservePrimaryCredential = input.preserve_primary_credential === true;
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const locked = await client.query(
        `SELECT credential_provider, credential_status, credential_rev,
                federated_tenant_id, federated_subject_id
           FROM lawos_identity.accounts
          WHERE tenant_id = $1 AND user_id = $2 FOR UPDATE`,
        [tenantId, seed.user_id],
      );
      const current = locked.rows[0];
      if (current.federated_subject_id && (
        (!preservePrimaryCredential && current.credential_provider !== providerId)
        || current.federated_tenant_id !== federatedTenantId
        || current.federated_subject_id !== federatedSubjectId
      )) {
        throw Object.assign(new Error("federated identity subject does not match the bound account"), {
          code: "LAWOS_FEDERATED_IDENTITY_CONFLICT",
          safe_error_code: "FEDERATED_IDENTITY_CONFLICT",
          status: 403,
        });
      }
      const bindingChanged = (!preservePrimaryCredential && current.credential_provider !== providerId)
        || current.federated_tenant_id !== federatedTenantId
        || current.federated_subject_id !== federatedSubjectId;
      const credentialRev = Number(current.credential_rev)
        + (!preservePrimaryCredential && current.credential_provider && bindingChanged ? 1 : 0);
      const timestamp = iso(nowMs(clock));
      const result = await client.query(
        `UPDATE lawos_identity.accounts
            SET email = $3,
                credential_provider = CASE WHEN $9::boolean THEN credential_provider ELSE $4 END,
                credential_status = CASE WHEN $9::boolean THEN credential_status ELSE 'active' END,
                credential_rev = $5,
                password_hash = CASE WHEN $9::boolean THEN password_hash ELSE '{}'::jsonb END,
                federated_tenant_id = $6,
                federated_subject_id = $7,
                failed_login_count = CASE WHEN $9::boolean THEN failed_login_count ELSE 0 END,
                locked_until = CASE WHEN $9::boolean THEN locked_until ELSE NULL END,
                updated_at = $8::timestamptz
          WHERE tenant_id = $1 AND user_id = $2
        RETURNING tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                  password_hash, federated_tenant_id, federated_subject_id,
                  failed_login_count, locked_until, created_at, updated_at`,
        [tenantId, seed.user_id, seed.email, providerId, credentialRev, federatedTenantId, federatedSubjectId, timestamp, preservePrimaryCredential],
      );
      if (credentialRev !== Number(current.credential_rev)) {
        await client.query(
          `UPDATE lawos_identity.sessions
              SET revoked_at = $3::timestamptz,
                  revoked_by = $2,
                  revocation_reason = 'federated_identity_rebound'
            WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
          [tenantId, seed.user_id, timestamp],
        );
      }
      await insertAudit(client, tenantId, {
        action: input.audit_action
          ?? (bindingChanged ? "auth.federated_identity.bound" : "auth.federated_identity.verified"),
        object_id: seed.user_id,
        actor_id: input.actor_id ?? seed.user_id,
        details: {
          provider_id: providerId,
          subject_bound: true,
          primary_credential_preserved: preservePrimaryCredential,
          phishing_resistant_mfa: input.phishing_resistant_mfa === true,
          conditional_access_verified: input.conditional_access_verified === true,
        },
      }, clock);
      return mapAccount(result.rows[0]);
    });
  }

  async function requirePasswordReset(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed(input.user);
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const timestamp = iso(nowMs(clock));
      const result = await client.query(
        `UPDATE lawos_identity.accounts
            SET credential_status = 'reset_required', credential_rev = credential_rev + 1, updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND user_id = $2
        RETURNING tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                  password_hash, federated_tenant_id, federated_subject_id,
                  failed_login_count, locked_until, created_at, updated_at`,
        [tenantId, seed.user_id, timestamp],
      );
      await client.query(
        `UPDATE lawos_identity.sessions
            SET revoked_at = $3::timestamptz,
                revoked_by = $2,
                revocation_reason = 'password_reset_required'
          WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [tenantId, seed.user_id, timestamp],
      );
      await insertAudit(client, tenantId, {
        action: "auth.password_reset.required",
        object_id: seed.user_id,
        actor_id: input.actor_id ?? seed.user_id,
        details: { credential_rev: Number(result.rows[0].credential_rev) },
      }, clock);
      return mapAccount(result.rows[0]);
    });
  }

  async function recordLoginFailure(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed(input.user);
    const maximum = Number(input.max_failed_logins);
    const lockMs = Number(input.lock_ms);
    if (!Number.isSafeInteger(maximum) || maximum < 1) throw new TypeError("max_failed_logins must be a positive integer");
    if (!Number.isFinite(lockMs) || lockMs <= 0) throw new TypeError("login lock_ms must be positive");
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const currentResult = await client.query(
        `SELECT tenant_id, user_id, account_status, failed_login_count, locked_until
           FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = $2 FOR UPDATE`,
        [tenantId, seed.user_id],
      );
      const current = currentResult.rows[0];
      const currentTime = nowMs(clock);
      const existingLock = current.locked_until ? millis(current.locked_until) : 0;
      if (existingLock > currentTime) {
        return Object.freeze({ count: Number(current.failed_login_count), locked: true, locked_until: iso(existingLock), account_status: current.account_status });
      }
      const count = (existingLock > 0 ? 0 : Number(current.failed_login_count)) + 1;
      const lockedUntil = count >= maximum ? currentTime + lockMs : null;
      await client.query(
        `UPDATE lawos_identity.accounts
            SET failed_login_count = $3, locked_until = $4::timestamptz, updated_at = $5::timestamptz
          WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, seed.user_id, count, lockedUntil ? iso(lockedUntil) : null, iso(currentTime)],
      );
      await insertAudit(client, tenantId, {
        action: lockedUntil ? "auth.login.locked" : "auth.login.failed",
        object_id: seed.user_id,
        actor_id: seed.user_id,
        details: { failed_login_count: count, locked: Boolean(lockedUntil) },
      }, clock);
      return Object.freeze({ count, locked: Boolean(lockedUntil), locked_until: lockedUntil ? iso(lockedUntil) : null, account_status: current.account_status });
    });
  }

  async function completeLogin(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed(input.user);
    const sessionJti = required(input.session_jti, "session_jti");
    const sessionId = required(input.session_id, "session_id");
    const credentialRev = requireCredentialRevision(input.credential_rev);
    const issuedAt = iso(input.issued_at);
    const expiresAt = iso(input.expires_at);
    const preserveLoginFailureState = input.preserve_login_failure_state === true;
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const currentResult = await client.query(
        `SELECT accounts.tenant_id, accounts.user_id, accounts.account_status, accounts.credential_status,
                accounts.credential_rev, accounts.failed_login_count, accounts.locked_until,
                memberships.status AS membership_status,
                memberships.state_version AS membership_state_version
           FROM lawos_identity.accounts AS accounts
           JOIN lawos_identity.account_memberships AS memberships
             ON memberships.tenant_id = accounts.tenant_id
            AND memberships.user_id = accounts.user_id
          WHERE accounts.tenant_id = $1 AND accounts.user_id = $2
          FOR UPDATE OF accounts, memberships`,
        [tenantId, seed.user_id],
      );
      const current = currentResult.rows[0];
      if (!current || current.membership_status !== "active") {
        return Object.freeze({ ok: false, reason: "tenant_membership_inactive", safe_error_code: "AUTH_CREDENTIAL_INVALID", status: 401 });
      }
      if (current.account_status !== "active") return Object.freeze({ ok: false, reason: "account_disabled", safe_error_code: "AUTH_ACCOUNT_DISABLED", status: 403 });
      if (!["active", "must_change"].includes(current.credential_status)) {
        return Object.freeze({ ok: false, reason: "credential_inactive", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
      }
      if (!preserveLoginFailureState && current.locked_until && millis(current.locked_until) > nowMs(clock)) {
        return Object.freeze({ ok: false, reason: "auth_login_locked", safe_error_code: "AUTH_LOGIN_LOCKED", status: 423, locked_until: iso(current.locked_until) });
      }
      if (credentialRev !== Number(current.credential_rev)) {
        return Object.freeze({ ok: false, reason: "credential_revision_mismatch", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
      }
      const wasLocked = !preserveLoginFailureState && current.locked_until != null;
      if (!preserveLoginFailureState) {
        await client.query(
          `UPDATE lawos_identity.accounts SET failed_login_count = 0, locked_until = NULL, updated_at = $3::timestamptz
            WHERE tenant_id = $1 AND user_id = $2`,
          [tenantId, seed.user_id, iso(nowMs(clock))],
        );
      }
      await client.query(
        `INSERT INTO lawos_identity.sessions
           (tenant_id, session_jti, session_id, user_id, credential_rev, membership_state_version, issued_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)`,
        [tenantId, sessionJti, sessionId, seed.user_id, credentialRev, Number(current.membership_state_version), issuedAt, expiresAt],
      );
      if (wasLocked) await insertAudit(client, tenantId, { action: "auth.login.unlocked", object_id: seed.user_id, actor_id: seed.user_id, details: { reason: "successful_login_after_lock_expiry" } }, clock);
      await insertAudit(client, tenantId, { action: "auth.login.succeeded", object_id: seed.user_id, actor_id: seed.user_id, details: { session_registered: true } }, clock);
      return Object.freeze({ ok: true, session_jti: sessionJti, expires_at: expiresAt });
    });
  }

  async function validateSession(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const sessionJti = required(input.session_jti, "session_jti");
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT s.session_jti, s.user_id, s.credential_rev AS session_credential_rev,
                s.membership_state_version AS session_membership_state_version,
                s.expires_at, s.revoked_at,
                a.account_status, a.credential_status, a.credential_rev,
                m.status AS membership_status, m.state_version AS membership_state_version
           FROM lawos_identity.sessions s
           JOIN lawos_identity.accounts a ON a.tenant_id = s.tenant_id AND a.user_id = s.user_id
           JOIN lawos_identity.account_memberships m ON m.tenant_id = s.tenant_id AND m.user_id = s.user_id
          WHERE s.tenant_id = $1 AND s.session_jti = $2`,
        [tenantId, sessionJti],
      );
      const row = result.rows[0];
      if (!row || row.user_id !== input.user_id) return Object.freeze({ ok: false, reason: "session_not_active", safe_error_code: "AUTH_SESSION_REVOKED", status: 401 });
      if (row.revoked_at) return Object.freeze({ ok: false, reason: "session_revoked", safe_error_code: "AUTH_SESSION_REVOKED", status: 401 });
      if (millis(row.expires_at) <= nowMs(clock)) return Object.freeze({ ok: false, reason: "auth_session_expired", safe_error_code: "AUTH_SESSION_EXPIRED", status: 401 });
      if (row.account_status !== "active") return Object.freeze({ ok: false, reason: "account_disabled", safe_error_code: "AUTH_ACCOUNT_DISABLED", status: 403 });
      if (row.membership_status !== "active") {
        return Object.freeze({ ok: false, reason: "tenant_membership_inactive", safe_error_code: "AUTH_SESSION_REVOKED", status: 401 });
      }
      if (Number(row.session_membership_state_version) !== Number(row.membership_state_version)) {
        return Object.freeze({ ok: false, reason: "membership_revision_mismatch", safe_error_code: "AUTH_SESSION_REVOKED", status: 401 });
      }
      if (["disabled", "reset_required", "locked"].includes(row.credential_status)) {
        return Object.freeze({ ok: false, reason: "credential_inactive", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
      }
      if (row.session_credential_rev != null && Number(row.session_credential_rev) !== Number(row.credential_rev)) {
        return Object.freeze({ ok: false, reason: "credential_revision_mismatch", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
      }
      return Object.freeze({ ok: true, user_id: row.user_id, credential_rev: Number(row.credential_rev), credential_status: row.credential_status });
    });
  }

  async function revokeSession(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const sessionJti = required(input.session_jti, "session_jti");
    const timestamp = iso(input.revoked_at ?? nowMs(clock));
    return scoped(tenantId, async (client) => {
      const current = await client.query(
        "SELECT user_id, revoked_at FROM lawos_identity.sessions WHERE tenant_id = $1 AND session_jti = $2 FOR UPDATE",
        [tenantId, sessionJti],
      );
      if (!current.rows[0]) return Object.freeze({ ok: true, replayed: true, session_found: false });
      if (current.rows[0].revoked_at) return Object.freeze({ ok: true, replayed: true, session_found: true, revoked_at: iso(current.rows[0].revoked_at) });
      const userId = current.rows[0].user_id;
      await client.query(
        `UPDATE lawos_identity.sessions SET revoked_at = $3::timestamptz, revoked_by = $4, revocation_reason = $5
          WHERE tenant_id = $1 AND session_jti = $2`,
        [tenantId, sessionJti, timestamp, input.actor_id ?? userId, input.reason ?? "logout"],
      );
      await client.query(
        `UPDATE lawos_identity.challenges SET revoked_at = $3::timestamptz, revoke_reason = $4
          WHERE tenant_id = $1 AND user_id = $2 AND challenge_type = 'step_up' AND used_at IS NULL AND revoked_at IS NULL`,
        [tenantId, userId, timestamp, input.reason ?? "logout"],
      );
      await insertAudit(client, tenantId, {
        action: "auth.logout",
        object_id: userId,
        actor_id: input.actor_id ?? userId,
        details: { session_revoked: true, reason_present: Boolean(String(input.reason ?? "").trim()) },
      }, clock);
      return Object.freeze({ ok: true, replayed: false, session_found: true, revoked_at: timestamp });
    });
  }

  async function setAccountStatus(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const seed = normalizeAccountSeed(input.user);
    const status = requireAccountStatus(input.status);
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const timestamp = iso(nowMs(clock));
      const result = await client.query(
        `UPDATE lawos_identity.accounts
            SET account_status = $3,
                credential_status = CASE WHEN $3 = 'disabled' THEN 'disabled' ELSE 'reset_required' END,
                credential_rev = credential_rev + 1,
                failed_login_count = 0,
                locked_until = NULL,
                updated_at = $4::timestamptz
          WHERE tenant_id = $1 AND user_id = $2
        RETURNING tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                  password_hash, federated_tenant_id, federated_subject_id,
                  failed_login_count, locked_until, created_at, updated_at`,
        [tenantId, seed.user_id, status, timestamp],
      );
      if (status === "disabled") {
        await client.query(
          `UPDATE lawos_identity.sessions SET revoked_at = $3::timestamptz, revoked_by = $4, revocation_reason = 'account_disabled'
            WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
          [tenantId, seed.user_id, timestamp, input.actor_id ?? seed.user_id],
        );
      }
      await insertAudit(client, tenantId, {
        action: status === "disabled" ? "admin.security.user.disabled" : "admin.security.user.reactivated",
        object_id: seed.user_id,
        actor_id: input.actor_id,
        details: {
          reason_present: Boolean(String(input.reason ?? "").trim()),
          status,
          credential_status: result.rows[0].credential_status,
          credential_rev: Number(result.rows[0].credential_rev),
        },
      }, clock);
      return mapAccount(result.rows[0]);
    });
  }

  async function createChallenge(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const type = required(input.challenge_type, "challenge_type");
    if (!CHALLENGE_TYPES.has(type)) throw new TypeError(`unsupported identity challenge type: ${type}`);
    const seed = normalizeAccountSeed(input.user);
    const challengeHash = required(input.challenge_hash, "challenge_hash");
    const metadata = clone(input.metadata ?? {});
    assertAuditDetails(metadata, "challenge metadata");
    const requestedAt = iso(input.requested_at ?? nowMs(clock));
    const expiresAt = iso(input.expires_at);
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      await client.query(
        `UPDATE lawos_identity.challenges SET revoked_at = $4::timestamptz, revoke_reason = 'superseded'
          WHERE tenant_id = $1 AND user_id = $2 AND challenge_type = $3 AND used_at IS NULL AND revoked_at IS NULL`,
        [tenantId, seed.user_id, type, requestedAt],
      );
      const result = await client.query(
        `INSERT INTO lawos_identity.challenges
           (tenant_id, challenge_id, challenge_type, challenge_hash, user_id, email, purpose, provider_id,
            requested_at, expires_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11::jsonb)
         RETURNING tenant_id, challenge_id, challenge_type, user_id, email, purpose, provider_id,
                   requested_at, expires_at, used_at, revoked_at, revoke_reason, metadata`,
        [tenantId, input.challenge_id ?? `challenge_${randomUUID()}`, type, challengeHash, seed.user_id, seed.email, input.purpose ?? null, input.provider_id ?? null, requestedAt, expiresAt, JSON.stringify(metadata)],
      );
      await insertAudit(client, tenantId, {
        action: input.audit_action ?? (type === "password_reset" ? "auth.password_reset.requested" : "auth.step_up.succeeded"),
        object_id: seed.user_id,
        actor_id: input.actor_id ?? seed.user_id,
        details: { challenge_type: type, purpose: input.purpose ?? null, provider_id: input.provider_id ?? null },
      }, clock);
      return mapChallenge(result.rows[0]);
    });
  }

  async function validateChallenge(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const type = required(input.challenge_type, "challenge_type");
    if (!CHALLENGE_TYPES.has(type)) throw new TypeError(`unsupported identity challenge type: ${type}`);
    const challengeHash = required(input.challenge_hash, "challenge_hash");
    const userId = optional(input.user_id);
    const purpose = optional(input.purpose);
    const currentTime = nowMs(clock);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, challenge_id, challenge_type, user_id, email, purpose, provider_id,
                requested_at, expires_at, used_at, revoked_at, revoke_reason, metadata
           FROM lawos_identity.challenges
          WHERE tenant_id = $1 AND challenge_type = $2 AND challenge_hash = $3`,
        [tenantId, type, challengeHash],
      );
      const record = mapChallenge(result.rows[0]);
      const rejected = expectedChallengeError(record, currentTime);
      if (rejected) return rejected;
      if ((userId && record.user_id !== userId) || (purpose && record.purpose !== purpose)) {
        return Object.freeze({ ok: false, reason: "challenge_context_mismatch", safe_error_code: "AUTH_CHALLENGE_INVALID", status: 401 });
      }
      return Object.freeze({ ok: true, record });
    });
  }

  async function consumeChallenge(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const type = required(input.challenge_type, "challenge_type");
    const challengeHash = required(input.challenge_hash, "challenge_hash");
    const userId = optional(input.user_id);
    const purpose = optional(input.purpose);
    const expectedMetadata = clone(input.expected_metadata ?? {});
    assertAuditDetails(expectedMetadata, "expected challenge metadata");
    const currentTime = nowMs(clock);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, challenge_id, challenge_type, user_id, email, purpose, provider_id,
                requested_at, expires_at, used_at, revoked_at, revoke_reason, metadata
           FROM lawos_identity.challenges
          WHERE tenant_id = $1 AND challenge_type = $2 AND challenge_hash = $3 FOR UPDATE`,
        [tenantId, type, challengeHash],
      );
      const record = mapChallenge(result.rows[0]);
      const rejected = expectedChallengeError(record, currentTime);
      if (rejected) return rejected;
      const metadataMatches = Object.entries(expectedMetadata).every(
        ([key, value]) => JSON.stringify(record.metadata?.[key]) === JSON.stringify(value),
      );
      if ((userId && record.user_id !== userId) || (purpose && record.purpose !== purpose) || !metadataMatches) {
        return Object.freeze({ ok: false, reason: "challenge_context_mismatch", safe_error_code: "AUTH_CHALLENGE_INVALID", status: 401 });
      }
      const usedAt = iso(currentTime);
      await client.query(
        "UPDATE lawos_identity.challenges SET used_at = $4::timestamptz WHERE tenant_id = $1 AND challenge_type = $2 AND challenge_hash = $3",
        [tenantId, type, challengeHash, usedAt],
      );
      await insertAudit(client, tenantId, {
        action: input.audit_action ?? (type === "password_reset" ? "auth.password_reset.consumed" : "auth.step_up.consumed"),
        object_id: record.user_id,
        actor_id: input.actor_id ?? record.user_id,
        details: { challenge_type: type, purpose: record.purpose },
      }, clock);
      return Object.freeze({ ok: true, record: Object.freeze({ ...record, used_at: usedAt }) });
    });
  }

  async function revokeChallengesForUser(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const userId = required(input.user_id, "identity user_id");
    const timestamp = iso(nowMs(clock));
    return scoped(tenantId, async (client) => {
      const values = [tenantId, userId, timestamp, input.reason ?? "revoked"];
      const typeFilter = input.challenge_type ? " AND challenge_type = $5" : "";
      if (input.challenge_type) values.push(input.challenge_type);
      const result = await client.query(
        `UPDATE lawos_identity.challenges SET revoked_at = $3::timestamptz, revoke_reason = $4
          WHERE tenant_id = $1 AND user_id = $2 AND used_at IS NULL AND revoked_at IS NULL${typeFilter}`,
        values,
      );
      if (result.rowCount > 0) await insertAudit(client, tenantId, {
        action: input.audit_action ?? "auth.challenge.revoked",
        object_id: userId,
        actor_id: input.actor_id ?? userId,
        details: { challenge_type: input.challenge_type ?? "all", revoked_count: result.rowCount, reason_present: Boolean(String(input.reason ?? "").trim()) },
      }, clock);
      return Object.freeze({ revoked_count: result.rowCount });
    });
  }

  async function enqueuePasswordReset(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const email = required(input.email, "password reset email").toLowerCase();
    const requestId = required(input.request_id, "password reset request_id");
    const jobId = optional(input.job_id) ?? `password-reset:${randomUUID()}`;
    const timestamp = iso(nowMs(clock));
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `INSERT INTO lawos_identity.password_reset_jobs
           (tenant_id, job_id, email, request_id, state, attempt_count, available_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', 0, $5::timestamptz, $5::timestamptz, $5::timestamptz)
         RETURNING *`,
        [tenantId, jobId, email, requestId, timestamp],
      );
      return mapPasswordResetJob(result.rows[0]);
    });
  }

  async function claimPasswordResetJobs(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const workerId = required(input.worker_id, "password reset worker_id");
    const limit = Number(input.limit ?? 10);
    const leaseMs = Number(input.lease_ms ?? 60_000);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new TypeError("password reset claim limit is invalid");
    if (!Number.isFinite(leaseMs) || leaseMs < 1_000 || leaseMs > 15 * 60_000) throw new TypeError("password reset lease_ms is invalid");
    const timestamp = nowMs(clock);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `WITH candidates AS (
           SELECT job_id
             FROM lawos_identity.password_reset_jobs
            WHERE tenant_id = $1
              AND ((state = 'pending' AND available_at <= $2::timestamptz)
                OR (state = 'processing' AND lease_expires_at <= $2::timestamptz))
            ORDER BY available_at, created_at, job_id
            FOR UPDATE SKIP LOCKED
            LIMIT $3
         )
         UPDATE lawos_identity.password_reset_jobs AS jobs
            SET state = 'processing', attempt_count = attempt_count + 1,
                lease_owner = $4, lease_expires_at = $5::timestamptz,
                updated_at = $2::timestamptz
           FROM candidates
          WHERE jobs.tenant_id = $1 AND jobs.job_id = candidates.job_id
         RETURNING jobs.*`,
        [tenantId, iso(timestamp), limit, workerId, iso(timestamp + leaseMs)],
      );
      return Object.freeze(result.rows.map(mapPasswordResetJob));
    });
  }

  async function finishPasswordResetJob(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const jobId = required(input.job_id, "password reset job_id");
    const workerId = required(input.worker_id, "password reset worker_id");
    const outcome = required(input.outcome, "password reset job outcome");
    if (!["completed", "dropped", "retry"].includes(outcome)) throw new TypeError("password reset job outcome is invalid");
    const retryDelayMs = Number(input.retry_delay_ms ?? 60_000);
    const timestamp = nowMs(clock);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `UPDATE lawos_identity.password_reset_jobs
            SET state = CASE
                  WHEN $4 = 'retry' AND attempt_count < 3 THEN 'pending'
                  WHEN $4 = 'retry' THEN 'failed'
                  ELSE $4
                END,
                available_at = CASE WHEN $4 = 'retry' AND attempt_count < 3 THEN $6::timestamptz ELSE available_at END,
                lease_owner = NULL, lease_expires_at = NULL,
                last_error_code = $5, updated_at = $7::timestamptz
          WHERE tenant_id = $1 AND job_id = $2 AND state = 'processing' AND lease_owner = $3
        RETURNING *`,
        [tenantId, jobId, workerId, outcome, optional(input.last_error_code), iso(timestamp + retryDelayMs), iso(timestamp)],
      );
      if (!result.rows[0]) throw new Error("password reset queue lease is not owned by this worker");
      return mapPasswordResetJob(result.rows[0]);
    });
  }

  async function createBreakGlassRequest(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const requester = normalizeAccountSeed(input.requester);
    const requestId = required(input.break_glass_request_id, "break_glass_request_id");
    const reason = required(input.reason, "break-glass reason");
    const breakGlassAccountRef = required(input.break_glass_account_ref, "break_glass_account_ref");
    if (breakGlassAccountRef === requester.user_id) throw new TypeError("break-glass account must be separate from the requester account");
    const requiredApprovals = Number(input.required_approvals ?? 2);
    if (!Number.isSafeInteger(requiredApprovals) || requiredApprovals < 2 || requiredApprovals > 5) {
      throw new TypeError("break-glass required_approvals must be between 2 and 5");
    }
    const requestedAt = iso(input.requested_at ?? nowMs(clock));
    const expiresAt = iso(input.expires_at ?? (millis(requestedAt) + 15 * 60 * 1_000));
    if (millis(expiresAt) <= millis(requestedAt)) throw new TypeError("break-glass expires_at must be after requested_at");
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, requester, clock);
      const result = await client.query(
        `INSERT INTO lawos_identity.break_glass_requests
           (tenant_id, break_glass_request_id, requester_user_id, requester_label, reason,
            break_glass_account_ref, minimum_privilege_profile, required_approvals,
            approval_count, state, requested_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'break_glass_minimum', $7, 0, 'pending', $8::timestamptz, $9::timestamptz)
         RETURNING *`,
        [tenantId, requestId, requester.user_id, input.requester_label ?? null, reason,
          breakGlassAccountRef, requiredApprovals, requestedAt, expiresAt],
      );
      await insertAudit(client, tenantId, {
        action: "admin.security.break_glass.requested",
        object_id: requestId,
        actor_id: input.actor_id,
        details: {
          requester_user_id: requester.user_id,
          separate_account_reference_present: true,
          minimum_privilege_profile: "break_glass_minimum",
          required_approvals: requiredApprovals,
        },
      }, clock);
      return mapBreakGlass(result.rows[0]);
    });
  }

  async function transitionBreakGlassRequest(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const requestId = required(input.break_glass_request_id, "break_glass_request_id");
    const state = required(input.state, "break-glass state");
    if (!["approved", "revoked"].includes(state)) throw new TypeError("break-glass transition must be approved or revoked");
    const actorId = required(input.actor_id, "break-glass actor_id");
    return scoped(tenantId, async (client) => {
      const current = await client.query(
        `SELECT *
           FROM lawos_identity.break_glass_requests
          WHERE tenant_id = $1 AND break_glass_request_id = $2 FOR UPDATE`,
        [tenantId, requestId],
      );
      if (!current.rows[0]) return Object.freeze({ ok: false, reason: "break_glass_not_found", safe_error_code: "ADMIN_SECURITY_BREAK_GLASS_NOT_FOUND", status: 404 });
      const currentRecord = mapBreakGlass(current.rows[0]);
      if (currentRecord.state === "revoked") {
        return Object.freeze({ ok: false, reason: "break_glass_transition_invalid", safe_error_code: "ADMIN_SECURITY_BREAK_GLASS_TRANSITION_INVALID", status: 409 });
      }
      const decidedAt = iso(input.decided_at ?? nowMs(clock));
      if (state === "revoked") {
        const result = await client.query(
          `UPDATE lawos_identity.break_glass_requests
              SET state = 'revoked', decided_by = $3, decided_at = $4::timestamptz
            WHERE tenant_id = $1 AND break_glass_request_id = $2
          RETURNING *`,
          [tenantId, requestId, actorId, decidedAt],
        );
        await insertAudit(client, tenantId, {
          action: "admin.security.break_glass.revoked",
          object_id: requestId,
          actor_id: actorId,
          details: { state: "revoked", approval_count: currentRecord.approval_count },
        }, clock);
        return Object.freeze({ ok: true, replayed: false, record: mapBreakGlass(result.rows[0]) });
      }
      if (currentRecord.state === "approved") return Object.freeze({ ok: true, replayed: true, record: currentRecord, approvals_remaining: 0 });
      if (millis(currentRecord.expires_at) <= millis(decidedAt)) {
        return Object.freeze({ ok: false, reason: "break_glass_expired", safe_error_code: "ADMIN_SECURITY_BREAK_GLASS_EXPIRED", status: 409 });
      }
      if (actorId === currentRecord.requester_user_id) {
        return Object.freeze({ ok: false, reason: "break_glass_self_approval_denied", safe_error_code: "ADMIN_SECURITY_BREAK_GLASS_SELF_APPROVAL_DENIED", status: 403 });
      }
      const evidenceSha256 = optional(input.evidence_sha256);
      if (evidenceSha256 && !/^[a-f0-9]{64}$/u.test(evidenceSha256)) throw new TypeError("break-glass evidence_sha256 is invalid");
      const approvalId = optional(input.approval_id) ?? `break-glass-approval:${randomUUID()}`;
      const approval = await client.query(
        `INSERT INTO lawos_identity.break_glass_approvals
           (tenant_id, approval_id, break_glass_request_id, approver_id, approved_at, evidence_sha256)
         VALUES ($1, $2, $3, $4, $5::timestamptz, $6)
         ON CONFLICT (tenant_id, break_glass_request_id, approver_id) DO NOTHING
         RETURNING approval_id`,
        [tenantId, approvalId, requestId, actorId, decidedAt, evidenceSha256],
      );
      const countResult = await client.query(
        `SELECT count(*)::integer AS approval_count
           FROM lawos_identity.break_glass_approvals
          WHERE tenant_id = $1 AND break_glass_request_id = $2`,
        [tenantId, requestId],
      );
      const approvalCount = Number(countResult.rows[0].approval_count);
      const activated = approvalCount >= currentRecord.required_approvals;
      const result = await client.query(
        `UPDATE lawos_identity.break_glass_requests
            SET approval_count = $3,
                state = CASE WHEN $4::boolean THEN 'approved' ELSE 'pending' END,
                activated_at = CASE WHEN $4::boolean THEN $5::timestamptz ELSE NULL END,
                decided_by = CASE WHEN $4::boolean THEN $6 ELSE NULL END,
                decided_at = CASE WHEN $4::boolean THEN $5::timestamptz ELSE NULL END
          WHERE tenant_id = $1 AND break_glass_request_id = $2
        RETURNING *`,
        [tenantId, requestId, approvalCount, activated, decidedAt, actorId],
      );
      if (approval.rowCount > 0) {
        await insertAudit(client, tenantId, {
          action: "admin.security.break_glass.approval_recorded",
          object_id: requestId,
          actor_id: actorId,
          details: { approval_count: approvalCount, required_approvals: currentRecord.required_approvals, evidence_reference_present: Boolean(evidenceSha256) },
        }, clock);
      }
      if (activated) {
        await insertAudit(client, tenantId, {
          action: "admin.security.break_glass.approved",
          object_id: requestId,
          actor_id: actorId,
          details: { state: "approved", approval_count: approvalCount, minimum_privilege_profile: currentRecord.minimum_privilege_profile },
        }, clock);
      }
      return Object.freeze({
        ok: true,
        replayed: approval.rowCount === 0,
        approval_recorded: approval.rowCount > 0,
        approvals_remaining: Math.max(0, currentRecord.required_approvals - approvalCount),
        record: mapBreakGlass(result.rows[0]),
      });
    });
  }

  async function listBreakGlassRequests(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT *
           FROM lawos_identity.break_glass_requests WHERE tenant_id = $1 ORDER BY requested_at DESC, break_glass_request_id DESC`,
        [tenantId],
      );
      return Object.freeze(result.rows.map(mapBreakGlass));
    });
  }

  async function appendSecurityAudit(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, (client) => insertAudit(client, tenantId, input, clock));
  }

  async function listSecurityAudit(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, audit_event_id, action, object_id, actor_id, occurred_at, details
           FROM lawos_identity.security_audit_events WHERE tenant_id = $1 ORDER BY occurred_at DESC, audit_event_id DESC`,
        [tenantId],
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({ ...clone(row), occurred_at: iso(row.occurred_at) })));
    });
  }

  return Object.freeze({
    contract_version: IDENTITY_LEDGER_CONTRACT_VERSION,
    capabilities: Object.freeze({
      authority: "postgres-v2",
      tenant_scoped: true,
      rls_required: true,
      async_transactions: true,
      optimistic_version: true,
      idempotency: true,
      audit: true,
      outbox: true,
      production_ready_claim: false,
    }),
    provisionDirectoryUser,
    findDirectoryUserByEmail,
    findDirectoryUserByUserId,
    listDirectoryUsers,
    listDirectoryOutbox,
    listDirectoryIdempotency,
    ensureAccount,
    getAccount,
    setCredential,
    ensureFederatedAccount,
    requirePasswordReset,
    recordLoginFailure,
    completeLogin,
    validateSession,
    revokeSession,
    setAccountStatus,
    createChallenge,
    validateChallenge,
    consumeChallenge,
    revokeChallengesForUser,
    enqueuePasswordReset,
    claimPasswordResetJobs,
    finishPasswordResetJob,
    createBreakGlassRequest,
    transitionBreakGlassRequest,
    listBreakGlassRequests,
    appendSecurityAudit,
    listSecurityAudit,
  });
}
