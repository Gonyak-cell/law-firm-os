import { createHash } from "node:crypto";
import {
  RepositoryIdempotencyConflictError,
  requireRepositoryTenantId,
} from "../../persistence/src/repository-port-v2.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";

export const EXTERNAL_TENANT_PROVISIONING_LEDGER_VERSION =
  "law-firm-os.external-tenant-provisioning-ledger.v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const RECEIPT_FORBIDDEN_KEY = /(?:^|_)(?:password|secret|token|credential|email|display_name|tenant_id|user_id|subject)(?:_|$)/iu;
const RECEIPT_PROTECTED_REF = /^(?:tenant|member|manifest|request)_sha256:[a-f0-9]{64}$/u;
const RECEIPT_SAFE_TEXT = new Set([
  "law-firm-os.external-tenant-provisioning-receipt.v1",
  "completed",
  "tenant-pinned",
  "internal-password",
  "entra-oidc",
]);

function required(value, name) {
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
  const text = value.trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function sha256(value, name) {
  const text = required(value, name).toLowerCase();
  if (!SHA256.test(text)) throw new TypeError(`${name} must be a SHA-256 digest`);
  return text;
}

function timestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("tenant provisioning timestamp is invalid");
  return date.toISOString();
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function conflict(message) {
  return Object.assign(new RepositoryIdempotencyConflictError(message), {
    safe_error_code: "EXTERNAL_TENANT_PROVISIONING_CONFLICT",
    status: 409,
  });
}

function assertSafeReceipt(value, path = "receipt", depth = 0) {
  if (depth > 16) throw new TypeError("tenant provisioning receipt exceeds the maximum depth");
  if (typeof value === "string") {
    if (!RECEIPT_SAFE_TEXT.has(value) && !RECEIPT_PROTECTED_REF.test(value)) {
      throw new TypeError(`tenant provisioning receipt contains unprotected text: ${path}`);
    }
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`tenant provisioning receipt contains an invalid number: ${path}`);
    }
    return;
  }
  if (typeof value === "boolean" || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeReceipt(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") {
    throw new TypeError(`tenant provisioning receipt contains an unsupported value: ${path}`);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new TypeError(`tenant provisioning receipt contains an unsupported value: ${path}`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (RECEIPT_FORBIDDEN_KEY.test(key)) {
      throw new TypeError(`tenant provisioning receipt contains a protected field: ${path}.${key}`);
    }
    assertSafeReceipt(item, `${path}.${key}`, depth + 1);
  }
}

function mapTenant(row) {
  if (!row) return null;
  return Object.freeze({
    tenant_id: row.tenant_id,
    display_name: row.display_name,
    deployment_mode: row.deployment_mode,
    staff_auth_authority: row.staff_auth_authority,
    federated_tenant_id: row.federated_tenant_id,
    status: row.status,
    member_count: Number(row.member_count),
    state_version: Number(row.state_version),
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  });
}

function provisioningEventId(requestHash, state) {
  return `external_tenant_${state}_${createHash("sha256").update(`${requestHash}:${state}`).digest("hex").slice(0, 40)}`;
}

async function appendProvisioningAudit(client, tenantId, input, state, now) {
  await client.query(
    `INSERT INTO lawos_identity.security_audit_events
       (tenant_id, audit_event_id, action, object_id, actor_id, occurred_at, details)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)
     ON CONFLICT (tenant_id, audit_event_id) DO NOTHING`,
    [
      tenantId,
      provisioningEventId(input.request_hash, state),
      `auth.external_tenant.provisioning.${state}`,
      input.tenant_ref,
      `operator_sha256:${input.operator_ref_hash}`,
      timestamp(now()),
      JSON.stringify({
        request_ref: `request_sha256:${input.request_hash}`,
        requested_member_count: input.requested_member_count,
        deployment_mode: "tenant-pinned",
        staff_auth_authority: input.staff_auth_authority,
        federated_directory_configured: Boolean(input.federated_tenant_id),
      }),
    ],
  );
}

function normalizeBeginInput(input = {}) {
  const tenantId = requireRepositoryTenantId(input.tenant_id);
  const displayName = required(input.display_name, "tenant display_name");
  if (displayName.length > 200) throw new TypeError("tenant display_name is too long");
  const deploymentMode = required(input.deployment_mode, "tenant deployment_mode");
  if (deploymentMode !== "tenant-pinned") throw new TypeError("external tenant deployment must be tenant-pinned");
  const staffAuthAuthority = required(input.staff_auth_authority, "staff auth authority");
  if (!["internal-password", "entra-oidc"].includes(staffAuthAuthority)) {
    throw new TypeError("external tenant staff auth authority is invalid");
  }
  const federatedTenantId = input.federated_tenant_id == null
    ? null
    : required(input.federated_tenant_id, "federated tenant id");
  if ((staffAuthAuthority === "entra-oidc") !== Boolean(federatedTenantId)) {
    throw new TypeError("external tenant federation configuration is inconsistent");
  }
  const idempotencyKeyHash = sha256(input.idempotency_key_hash, "tenant provisioning idempotency_key_hash");
  const requestHash = sha256(input.request_hash, "tenant provisioning request_hash");
  const operatorRefHash = sha256(input.operator_ref_hash, "tenant provisioning operator_ref_hash");
  const memberCount = input.requested_member_count;
  if (!Number.isSafeInteger(memberCount) || memberCount < 1) {
    throw new TypeError("tenant provisioning requires at least one member");
  }
  return Object.freeze({
    tenant_id: tenantId,
    tenant_ref: required(input.tenant_ref, "protected tenant reference"),
    display_name: displayName,
    deployment_mode: deploymentMode,
    staff_auth_authority: staffAuthAuthority,
    federated_tenant_id: federatedTenantId,
    idempotency_key_hash: idempotencyKeyHash,
    request_hash: requestHash,
    operator_ref_hash: operatorRefHash,
    requested_member_count: memberCount,
  });
}

async function beginOnClient(client, input, clock) {
  const tenantId = input.tenant_id;
  const existingTenant = await client.query(
    `SELECT tenant_id, display_name, deployment_mode, staff_auth_authority,
            federated_tenant_id, status, member_count, state_version,
            created_at, updated_at
       FROM lawos_identity.tenants
      WHERE tenant_id = $1
      FOR UPDATE`,
    [tenantId],
  );
  if (!existingTenant.rows[0]) {
    const accountCount = await client.query(
      "SELECT count(*)::integer AS count FROM lawos_identity.accounts WHERE tenant_id = $1",
      [tenantId],
    );
    if (Number(accountCount.rows[0]?.count) !== 0) {
      throw conflict("external tenant id already has identity data");
    }
    await client.query(
      `INSERT INTO lawos_identity.tenants
         (tenant_id, display_name, deployment_mode, staff_auth_authority,
          federated_tenant_id, status, member_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'provisioning', 0, $6::timestamptz, $6::timestamptz)`,
      [
        tenantId,
        input.display_name,
        input.deployment_mode,
        input.staff_auth_authority,
        input.federated_tenant_id,
        timestamp(clock()),
      ],
    );
  } else {
    const current = existingTenant.rows[0];
    if (
      current.display_name !== input.display_name
      || current.deployment_mode !== input.deployment_mode
      || current.staff_auth_authority !== input.staff_auth_authority
      || current.federated_tenant_id !== input.federated_tenant_id
      || current.status === "disabled"
    ) {
      throw conflict("external tenant immutable deployment binding differs");
    }
    const ownedRequest = await client.query(
      `SELECT request_hash, operator_ref_hash, requested_member_count
         FROM lawos_identity.tenant_provisioning_requests
        WHERE tenant_id = $1 AND idempotency_key_hash = $2
        FOR UPDATE`,
      [tenantId, input.idempotency_key_hash],
    );
    const ownership = ownedRequest.rows[0];
    if (
      !ownership
      || ownership.request_hash !== input.request_hash
      || ownership.operator_ref_hash !== input.operator_ref_hash
      || Number(ownership.requested_member_count) !== input.requested_member_count
    ) {
      throw conflict("existing external tenant has no matching provisioning ownership");
    }
  }

  const inserted = await client.query(
    `INSERT INTO lawos_identity.tenant_provisioning_requests
       (tenant_id, idempotency_key_hash, request_hash, operator_ref_hash,
        requested_member_count, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'in_progress', $6::timestamptz)
     ON CONFLICT (tenant_id, idempotency_key_hash) DO NOTHING
     RETURNING request_hash, operator_ref_hash, requested_member_count, status, receipt`,
    [
      tenantId,
      input.idempotency_key_hash,
      input.request_hash,
      input.operator_ref_hash,
      input.requested_member_count,
      timestamp(clock()),
    ],
  );
  const request = inserted.rows[0] ?? (await client.query(
    `SELECT request_hash, operator_ref_hash, requested_member_count, status, receipt
       FROM lawos_identity.tenant_provisioning_requests
      WHERE tenant_id = $1 AND idempotency_key_hash = $2
      FOR UPDATE`,
    [tenantId, input.idempotency_key_hash],
  )).rows[0];
  if (
    request.request_hash !== input.request_hash
    || request.operator_ref_hash !== input.operator_ref_hash
    || Number(request.requested_member_count) !== input.requested_member_count
  ) {
    throw conflict("tenant provisioning idempotency key was reused with different content");
  }
  if (inserted.rowCount > 0) {
    await appendProvisioningAudit(client, tenantId, input, "started", clock);
  }
  const storedReceipt = request.receipt ? clone(request.receipt) : null;
  if (request.status === "completed") {
    if (!storedReceipt) throw conflict("completed tenant provisioning receipt is missing");
    assertSafeReceipt(storedReceipt);
  }
  return Object.freeze({
    replayed: inserted.rowCount === 0,
    completed: request.status === "completed",
    receipt: storedReceipt ? Object.freeze(storedReceipt) : null,
  });
}

function tenantContextDenied() {
  return Object.assign(new Error("PostgreSQL tenant context authentication failed"), {
    code: "LAWOS_POSTGRES_ACCESS_DENIED",
    safe_error_code: "POSTGRES_ACCESS_DENIED",
    status: 403,
  });
}

export function createPostgresTenantProvisioningLedger({
  pool,
  clock = () => new Date(),
  transactionOptions = {},
} = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("PostgreSQL pool is required for tenant provisioning");
  }
  const scoped = (tenantId, callback) => withPostgresTransaction(
    pool,
    { ...transactionOptions, tenant_id: requireRepositoryTenantId(tenantId), readOnly: true },
    callback,
  );

  async function getTenant(input = {}) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    return scoped(tenantId, async (client) => {
      const result = await client.query(
        `SELECT tenant_id, display_name, deployment_mode, staff_auth_authority,
                federated_tenant_id, status, member_count, state_version,
                created_at, updated_at
           FROM lawos_identity.tenants
          WHERE tenant_id = $1`,
        [tenantId],
      );
      return mapTenant(result.rows[0]);
    });
  }

  async function beginInAuthenticatedTransaction(input = {}, client) {
    if (!client || typeof client.query !== "function") {
      throw new TypeError("authenticated PostgreSQL transaction client is required");
    }
    const normalized = normalizeBeginInput(input);
    const authenticated = await client.query("SELECT lawos_security.current_tenant_id() AS tenant_id");
    if (authenticated.rows[0]?.tenant_id !== normalized.tenant_id) throw tenantContextDenied();
    return beginOnClient(client, normalized, clock);
  }

  async function completeOnClient(normalized, client) {
    const {
      tenantId,
      idempotencyKeyHash,
      requestHash,
      operatorRefHash,
      expectedMembers,
      expectedIds,
      receipt,
    } = normalized;
      const request = (await client.query(
        `SELECT request_hash, operator_ref_hash, requested_member_count, status, receipt
           FROM lawos_identity.tenant_provisioning_requests
          WHERE tenant_id = $1 AND idempotency_key_hash = $2
          FOR UPDATE`,
        [tenantId, idempotencyKeyHash],
      )).rows[0];
      if (
        !request
        || request.request_hash !== requestHash
        || request.operator_ref_hash !== operatorRefHash
      ) {
        throw conflict("tenant provisioning request is missing or differs");
      }
      if (request.status === "completed") {
        const storedReceipt = clone(request.receipt);
        if (!storedReceipt) throw conflict("completed tenant provisioning receipt is missing");
        assertSafeReceipt(storedReceipt);
        return Object.freeze({ replayed: true, receipt: Object.freeze(storedReceipt) });
      }
      if (Number(request.requested_member_count) !== expectedMembers.length) {
        throw conflict("tenant provisioning member count differs");
      }
      const tenant = (await client.query(
        `SELECT tenant_id, staff_auth_authority, federated_tenant_id, status
           FROM lawos_identity.tenants
          WHERE tenant_id = $1
          FOR UPDATE`,
        [tenantId],
      )).rows[0];
      if (!tenant || tenant.status === "disabled") throw conflict("external tenant is unavailable");
      const rows = (await client.query(
        `SELECT accounts.user_id, accounts.account_status, accounts.credential_provider,
                accounts.credential_status, accounts.federated_tenant_id,
                accounts.federated_subject_id,
                accounts.password_hash = '{}'::jsonb AS authentication_material_absent,
                memberships.status AS membership_status
           FROM lawos_identity.accounts AS accounts
           JOIN lawos_identity.account_memberships AS memberships
             ON memberships.tenant_id = accounts.tenant_id
            AND memberships.user_id = accounts.user_id
          WHERE accounts.tenant_id = $1 AND accounts.user_id = ANY($2::text[])`,
        [tenantId, expectedIds],
      )).rows;
      const byId = new Map(rows.map((row) => [row.user_id, row]));
      for (const expected of expectedMembers) {
        const row = byId.get(expected.user_id);
        const federated = expected.federated_subject_id != null;
        const unboundEntra = !federated && tenant.staff_auth_authority === "entra-oidc";
        if (
          !row
          || row.account_status !== "active"
          || row.membership_status !== "active"
          || row.authentication_material_absent !== true
          || (federated && (
            row.credential_status !== "active"
            || row.credential_provider !== expected.credential_provider
            || row.federated_tenant_id !== tenant.federated_tenant_id
            || row.federated_subject_id !== expected.federated_subject_id
          ))
          || (unboundEntra && (
            row.credential_provider !== expected.credential_provider
            || row.federated_tenant_id !== null
            || row.federated_subject_id !== null
            || row.credential_status !== "reset_required"
          ))
          || (!federated && !unboundEntra && (
            tenant.staff_auth_authority !== "internal-password"
            || row.credential_provider !== expected.credential_provider
            || row.credential_status !== "reset_required"
            || row.federated_tenant_id !== null
            || row.federated_subject_id !== null
          ))
        ) {
          throw conflict("tenant provisioning member authority is incomplete");
        }
      }
      const activeCount = await client.query(
        `SELECT count(*)::integer AS count
           FROM lawos_identity.accounts AS accounts
           JOIN lawos_identity.account_memberships AS memberships
             ON memberships.tenant_id = accounts.tenant_id
            AND memberships.user_id = accounts.user_id
          WHERE accounts.tenant_id = $1
            AND accounts.account_status = 'active'
            AND memberships.status = 'active'`,
        [tenantId],
      );
      await client.query(
        `UPDATE lawos_identity.tenants
            SET status = 'active', member_count = $2,
                state_version = state_version + CASE WHEN status = 'active' AND member_count = $2 THEN 0 ELSE 1 END,
                updated_at = $3::timestamptz
          WHERE tenant_id = $1`,
        [tenantId, Number(activeCount.rows[0]?.count), timestamp(clock())],
      );
      await client.query(
        `UPDATE lawos_identity.tenant_provisioning_requests
            SET status = 'completed', receipt = $3::jsonb, completed_at = $4::timestamptz
          WHERE tenant_id = $1 AND idempotency_key_hash = $2`,
        [tenantId, idempotencyKeyHash, JSON.stringify(receipt), timestamp(clock())],
      );
      await appendProvisioningAudit(client, tenantId, {
        request_hash: requestHash,
        tenant_ref: required(receipt.tenant_ref, "receipt tenant_ref"),
        operator_ref_hash: operatorRefHash,
        requested_member_count: expectedMembers.length,
        staff_auth_authority: tenant.staff_auth_authority,
        federated_tenant_id: tenant.federated_tenant_id,
      }, "completed", clock);
      return Object.freeze({ replayed: false, receipt: Object.freeze(receipt) });
  }

  async function completeInAuthenticatedTransaction(input = {}, client) {
    if (!client || typeof client.query !== "function") {
      throw new TypeError("authenticated PostgreSQL transaction client is required");
    }
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    const idempotencyKeyHash = sha256(input.idempotency_key_hash, "tenant provisioning idempotency_key_hash");
    const requestHash = sha256(input.request_hash, "tenant provisioning request_hash");
    const operatorRefHash = sha256(input.operator_ref_hash, "tenant provisioning operator_ref_hash");
    const expectedMembers = input.expected_members;
    if (!Array.isArray(expectedMembers) || expectedMembers.length < 1) {
      throw new TypeError("tenant provisioning expected_members are required");
    }
    const expectedIds = expectedMembers.map((member) => required(member.user_id, "member user_id"));
    if (new Set(expectedIds).size !== expectedIds.length) throw new TypeError("tenant provisioning member user_ids must be unique");
    const receipt = clone(input.receipt);
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
      throw new TypeError("tenant provisioning receipt is required");
    }
    assertSafeReceipt(receipt);
    const authenticated = await client.query("SELECT lawos_security.current_tenant_id() AS tenant_id");
    if (authenticated.rows[0]?.tenant_id !== tenantId) throw tenantContextDenied();
    return completeOnClient({
      tenantId,
      idempotencyKeyHash,
      requestHash,
      operatorRefHash,
      expectedMembers,
      expectedIds,
      receipt,
    }, client);
  }

  return Object.freeze({
    contract_version: EXTERNAL_TENANT_PROVISIONING_LEDGER_VERSION,
    capabilities: Object.freeze({
      tenant_scoped: true,
      rls_required: true,
      idempotent: true,
      append_only_audit: true,
    }),
    getTenant,
    beginInAuthenticatedTransaction,
    completeInAuthenticatedTransaction,
  });
}
