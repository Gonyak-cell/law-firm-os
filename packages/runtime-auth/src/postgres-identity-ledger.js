import { randomUUID } from "node:crypto";
import { requireRepositoryTenantId } from "../../persistence/src/repository-port-v2.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { IDENTITY_LEDGER_CONTRACT_VERSION } from "./identity-ledger.js";

const ACCOUNT_STATUSES = new Set(["active", "disabled"]);
const CREDENTIAL_STATUSES = new Set(["active", "must_change", "reset_required", "locked", "disabled"]);
const CHALLENGE_TYPES = new Set(["password_reset", "step_up", "oidc_login"]);
const FORBIDDEN_AUDIT_DETAIL_KEY = /(^|_)(password|secret|token|totp|proof|authorization|challenge_hash|password_hash)(_|$)/iu;

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
    federated_tenant_id: row.federated_tenant_id,
    federated_subject_id: row.federated_subject_id,
    failed_login_count: Number(row.failed_login_count),
    locked_until: row.locked_until ? iso(row.locked_until) : null,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
}

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

async function ensureAccountRow(client, tenantId, user, clock) {
  const account = normalizeAccountSeed(user);
  const timestamp = iso(nowMs(clock));
  await client.query(
    `INSERT INTO lawos_identity.accounts
       (tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz, $9::timestamptz)
     ON CONFLICT (tenant_id, user_id) DO NOTHING`,
    [tenantId, account.user_id, account.email, account.account_status, account.credential_provider, account.credential_status, account.credential_rev, JSON.stringify(account.password_hash), timestamp],
  );
  const result = await client.query(
    `SELECT tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
            password_hash, federated_tenant_id, federated_subject_id,
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
                password_hash, federated_tenant_id, federated_subject_id,
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
        current.credential_provider !== providerId
        || current.federated_tenant_id !== federatedTenantId
        || current.federated_subject_id !== federatedSubjectId
      )) {
        throw Object.assign(new Error("federated identity subject does not match the bound account"), {
          code: "LAWOS_FEDERATED_IDENTITY_CONFLICT",
          safe_error_code: "FEDERATED_IDENTITY_CONFLICT",
          status: 403,
        });
      }
      const bindingChanged = current.credential_provider !== providerId
        || current.federated_tenant_id !== federatedTenantId
        || current.federated_subject_id !== federatedSubjectId;
      const credentialRev = Number(current.credential_rev) + (current.credential_provider && bindingChanged ? 1 : 0);
      const timestamp = iso(nowMs(clock));
      const result = await client.query(
        `UPDATE lawos_identity.accounts
            SET email = $3,
                credential_provider = $4,
                credential_status = 'active',
                credential_rev = $5,
                password_hash = '{}'::jsonb,
                federated_tenant_id = $6,
                federated_subject_id = $7,
                failed_login_count = 0,
                locked_until = NULL,
                updated_at = $8::timestamptz
          WHERE tenant_id = $1 AND user_id = $2
        RETURNING tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                  password_hash, federated_tenant_id, federated_subject_id,
                  failed_login_count, locked_until, created_at, updated_at`,
        [tenantId, seed.user_id, seed.email, providerId, credentialRev, federatedTenantId, federatedSubjectId, timestamp],
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
        action: bindingChanged ? "auth.federated_identity.bound" : "auth.federated_identity.verified",
        object_id: seed.user_id,
        actor_id: input.actor_id ?? seed.user_id,
        details: {
          provider_id: providerId,
          subject_bound: true,
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
      const result = await client.query(
        `UPDATE lawos_identity.accounts
            SET credential_status = 'reset_required', credential_rev = credential_rev + 1, updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND user_id = $2
        RETURNING tenant_id, user_id, email, account_status, credential_provider, credential_status, credential_rev,
                  password_hash, federated_tenant_id, federated_subject_id,
                  failed_login_count, locked_until, created_at, updated_at`,
        [tenantId, seed.user_id, iso(nowMs(clock))],
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
    return scoped(tenantId, async (client) => {
      await ensureAccountRow(client, tenantId, seed, clock);
      const currentResult = await client.query(
        `SELECT tenant_id, user_id, account_status, credential_status, credential_rev, failed_login_count, locked_until
           FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = $2 FOR UPDATE`,
        [tenantId, seed.user_id],
      );
      const current = currentResult.rows[0];
      if (current.account_status !== "active") return Object.freeze({ ok: false, reason: "account_disabled", safe_error_code: "AUTH_ACCOUNT_DISABLED", status: 403 });
      if (!["active", "must_change"].includes(current.credential_status)) {
        return Object.freeze({ ok: false, reason: "credential_inactive", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
      }
      if (current.locked_until && millis(current.locked_until) > nowMs(clock)) {
        return Object.freeze({ ok: false, reason: "auth_login_locked", safe_error_code: "AUTH_LOGIN_LOCKED", status: 423, locked_until: iso(current.locked_until) });
      }
      if (credentialRev !== Number(current.credential_rev)) {
        return Object.freeze({ ok: false, reason: "credential_revision_mismatch", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
      }
      const wasLocked = current.locked_until != null;
      await client.query(
        `UPDATE lawos_identity.accounts SET failed_login_count = 0, locked_until = NULL, updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, seed.user_id, iso(nowMs(clock))],
      );
      await client.query(
        `INSERT INTO lawos_identity.sessions
           (tenant_id, session_jti, session_id, user_id, credential_rev, issued_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)`,
        [tenantId, sessionJti, sessionId, seed.user_id, credentialRev, issuedAt, expiresAt],
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
        `SELECT s.session_jti, s.user_id, s.credential_rev AS session_credential_rev, s.expires_at, s.revoked_at,
                a.account_status, a.credential_status, a.credential_rev
           FROM lawos_identity.sessions s
           JOIN lawos_identity.accounts a ON a.tenant_id = s.tenant_id AND a.user_id = s.user_id
          WHERE s.tenant_id = $1 AND s.session_jti = $2`,
        [tenantId, sessionJti],
      );
      const row = result.rows[0];
      if (!row || row.user_id !== input.user_id) return Object.freeze({ ok: false, reason: "session_not_active", safe_error_code: "AUTH_SESSION_REVOKED", status: 401 });
      if (row.revoked_at) return Object.freeze({ ok: false, reason: "session_revoked", safe_error_code: "AUTH_SESSION_REVOKED", status: 401 });
      if (millis(row.expires_at) <= nowMs(clock)) return Object.freeze({ ok: false, reason: "auth_session_expired", safe_error_code: "AUTH_SESSION_EXPIRED", status: 401 });
      if (row.account_status !== "active") return Object.freeze({ ok: false, reason: "account_disabled", safe_error_code: "AUTH_ACCOUNT_DISABLED", status: 403 });
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
    capabilities: Object.freeze({ authority: "postgres-v2", tenant_scoped: true, rls_required: true, async_transactions: true, production_ready_claim: false }),
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
    createBreakGlassRequest,
    transitionBreakGlassRequest,
    listBreakGlassRequests,
    appendSecurityAudit,
    listSecurityAudit,
  });
}
