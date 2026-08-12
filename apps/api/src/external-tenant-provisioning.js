import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import {
  createPostgresIdentityLedger,
  createPostgresTenantProvisioningLedger,
} from "../../../packages/runtime-auth/src/index.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  LAWOS_PRODUCTION_APPLICATION_ROLE,
} from "../../../packages/persistence/src/postgres/application-role.js";
import {
  POSTGRES_TENANT_CONTEXT_SECRET,
  createPostgresPool,
} from "../../../packages/persistence/src/postgres/pool.js";
import { resolveAwsSecretString } from "./aws-secret-reference.js";
import { LAWOS_INTERNAL_PASSWORD_PROVIDER_ID } from "./auth-credential-store.js";
import { ENTRA_OIDC_PROVIDER_ID } from "./entra-oidc-provider.js";
import { verifyClientOperationsPostgresMigrations } from "./client-operations-schema.js";
import {
  postgresUrlFromSecret,
  resolvePostgresConnectionString,
  resolvePostgresTenantContextSecret,
} from "./persistence-authority.js";

export const EXTERNAL_TENANT_PROVISIONING_SCHEMA_VERSION =
  "law-firm-os.external-tenant-provisioning.v1";
export const EXTERNAL_TENANT_PROVISIONING_RECEIPT_VERSION =
  "law-firm-os.external-tenant-provisioning-receipt.v1";
export const LAWOS_TENANT_DEPLOYMENT_MODE_ENV = "LAWOS_TENANT_DEPLOYMENT_MODE";
export const LAWOS_EXTERNAL_TENANT_MANIFEST_SHA256_ENV =
  "LAWOS_EXTERNAL_TENANT_MANIFEST_SHA256";
export const LAWOS_EXTERNAL_TENANT_ADMIN_POSTGRES_SECRET_ID_ENV =
  "LAWOS_EXTERNAL_TENANT_ADMIN_POSTGRES_SECRET_ID";

const SHA256 = /^[a-f0-9]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u;
const TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const AUTHORITY_FIELDS = Object.freeze(["mode", "identity_tenant_id", "database_tenant_id", "staff_auth_authority", "federated_tenant_id"]);
const MEMBER_FIELDS = Object.freeze(["user_id", "email", "display_name", "role_profile_id", "role_ids", "group_ids", "scopes", "hrx_scopes", "federated_subject_id"]);

function failure(code, message, status = 400) {
  return Object.assign(new Error(message), {
    code: `LAWOS_${code}`,
    safe_error_code: code,
    status,
  });
}

function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", `${name} must be an object`);
  }
  return value;
}

function closed(value, fields, name) {
  const source = record(value, name);
  if (Object.keys(source).some((key) => !fields.includes(key))) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", `${name} contains unsupported fields`);
  }
  return source;
}

function text(value, name, { maximum = 200, pattern = null } = {}) {
  if (typeof value !== "string") {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", `${name} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum || (pattern && !pattern.test(normalized))) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", `${name} is invalid`);
  }
  return normalized;
}

function optionalText(value, name, options) {
  return value == null ? null : text(value, name, options);
}

function stringList(value, name, { required = false } = {}) {
  if (!Array.isArray(value) || (required && value.length === 0)) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", `${name} must be an array`);
  }
  const result = [...new Set(value.map((item) => text(item, name, { pattern: IDENTIFIER })))].sort();
  if (required && result.length === 0) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", `${name} cannot be empty`);
  }
  return Object.freeze(result);
}

function sha256(value) {
  if (typeof value !== "string") throw new TypeError("SHA-256 source must be a string");
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function protectedRef(kind, value) {
  return `${kind}_sha256:${sha256(value)}`;
}

function normalizeMember(value, staffAuthAuthority) {
  const source = closed(value, MEMBER_FIELDS, "external tenant member");
  const email = text(source.email, "member email", { maximum: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "member email is invalid");
  }
  const federatedSubjectId = optionalText(
    source.federated_subject_id,
    "member federated_subject_id",
    { maximum: 256, pattern: IDENTIFIER },
  );
  if (federatedSubjectId && staffAuthAuthority !== "entra-oidc") {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "federated member binding requires Entra staff authority");
  }
  return Object.freeze({
    user_id: text(source.user_id, "member user_id", { pattern: IDENTIFIER }),
    email,
    display_name: text(source.display_name, "member display_name", { maximum: 200 }),
    role_profile_id: text(source.role_profile_id, "member role_profile_id", { pattern: IDENTIFIER }),
    role_ids: stringList(source.role_ids, "member role id", { required: true }),
    group_ids: stringList(source.group_ids ?? [], "member group id"),
    scopes: stringList(source.scopes, "member scope", { required: true }),
    hrx_scopes: stringList(source.hrx_scopes ?? [], "member HRX scope"),
    federated_subject_id: federatedSubjectId,
  });
}

export function normalizeExternalTenantProvisioningManifest(value = {}) {
  const source = closed(
    value,
    ["schema_version", "data_scope", "idempotency_key", "operator_ref", "tenant", "members"],
    "external tenant provisioning manifest",
  );
  if (source.schema_version !== EXTERNAL_TENANT_PROVISIONING_SCHEMA_VERSION) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant manifest schema is invalid");
  }
  if (source.data_scope !== "external-law-firm") {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant data_scope is invalid");
  }
  const tenant = closed(source.tenant, ["tenant_id", "display_name", "deployment"], "external tenant");
  const tenantId = text(tenant.tenant_id, "tenant_id", { maximum: 128, pattern: TENANT_ID });
  const deployment = closed(tenant.deployment, AUTHORITY_FIELDS, "external tenant deployment");
  if (
    deployment.mode !== "tenant-pinned"
    || deployment.identity_tenant_id !== tenantId
    || deployment.database_tenant_id !== tenantId
  ) {
    throw failure("EXTERNAL_TENANT_CROSS_TENANT_DENIED", "external tenant deployment is not pinned to one tenant", 403);
  }
  const staffAuthAuthority = text(deployment.staff_auth_authority, "staff_auth_authority");
  if (!["internal-password", "entra-oidc"].includes(staffAuthAuthority)) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "staff_auth_authority is invalid");
  }
  const federatedTenantId = optionalText(
    deployment.federated_tenant_id,
    "federated_tenant_id",
    { maximum: 36, pattern: UUID },
  )?.toLowerCase() ?? null;
  if ((staffAuthAuthority === "entra-oidc") !== Boolean(federatedTenantId)) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant federation configuration is incomplete");
  }
  if (!Array.isArray(source.members) || source.members.length < 1 || source.members.length > 500) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant members must contain 1 to 500 entries");
  }
  const members = source.members.map((member) => normalizeMember(member, staffAuthAuthority))
    .sort((left, right) => left.user_id.localeCompare(right.user_id));
  if (new Set(members.map(({ user_id }) => user_id)).size !== members.length) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant member user_ids must be unique");
  }
  if (new Set(members.map(({ email }) => email)).size !== members.length) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant member emails must be unique");
  }
  if (!members.some(({ scopes }) => scopes.includes("tenant.admin"))) {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "external tenant requires a named tenant administrator");
  }
  return Object.freeze({
    schema_version: EXTERNAL_TENANT_PROVISIONING_SCHEMA_VERSION,
    data_scope: "external-law-firm",
    idempotency_key: text(source.idempotency_key, "idempotency_key", { pattern: IDENTIFIER }),
    operator_ref: text(source.operator_ref, "operator_ref", { pattern: IDENTIFIER }),
    tenant: Object.freeze({
      tenant_id: tenantId,
      display_name: text(tenant.display_name, "tenant display_name", { maximum: 200 }),
      deployment: Object.freeze({
        mode: "tenant-pinned",
        identity_tenant_id: tenantId,
        database_tenant_id: tenantId,
        staff_auth_authority: staffAuthAuthority,
        federated_tenant_id: federatedTenantId,
      }),
    }),
    members: Object.freeze(members),
  });
}

export function externalTenantProvisioningManifestSha256(value) {
  return sha256(canonicalizeJson(normalizeExternalTenantProvisioningManifest(value)));
}

function requestHash(manifest) {
  return sha256(canonicalizeJson({
    schema_version: manifest.schema_version,
    data_scope: manifest.data_scope,
    tenant: manifest.tenant,
    members: manifest.members,
  }));
}

function safeEqual(left, right) {
  const leftBytes = Buffer.isBuffer(left) ? left : typeof left === "string" ? Buffer.from(left, "utf8") : null;
  const rightBytes = Buffer.isBuffer(right) ? right : typeof right === "string" ? Buffer.from(right, "utf8") : null;
  if (!leftBytes || !rightBytes) return false;
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

async function assertDatabaseRoles({ adminPool, appPool }) {
  const admin = (await adminPool.query(
    `SELECT current_user AS role_name,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'SELECT') AS tenant_authority_select,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'INSERT') AS tenant_authority_insert,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'UPDATE') AS tenant_authority_update,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'DELETE') AS tenant_authority_delete,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'SELECT') AS tenant_registry_select,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'INSERT') AS tenant_registry_insert,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'UPDATE') AS tenant_registry_update,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'SELECT') AS provisioning_select,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'INSERT') AS provisioning_insert,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'UPDATE') AS provisioning_update`,
  )).rows[0];
  if (
    !admin
    || admin.role_name === LAWOS_PRODUCTION_APPLICATION_ROLE
    || admin.tenant_authority_select !== true
    || admin.tenant_authority_insert !== true
    || admin.tenant_authority_update !== true
    || admin.tenant_authority_delete !== true
    || admin.tenant_registry_select !== true
    || admin.tenant_registry_insert !== true
    || admin.tenant_registry_update !== true
    || admin.provisioning_select !== true
    || admin.provisioning_insert !== true
    || admin.provisioning_update !== true
  ) {
    throw failure("EXTERNAL_TENANT_ADMIN_DATABASE_ROLE_REQUIRED", "tenant provisioning requires the separate migrator/admin database role", 403);
  }
  const app = (await appPool.query(
    `SELECT current_user AS role_name, roles.rolsuper, roles.rolbypassrls,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'SELECT') AS tenant_authority_select,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'INSERT') AS tenant_authority_insert,
            has_table_privilege(current_user, 'lawos_security.tenant_context_authorities', 'UPDATE') AS tenant_authority_update,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'SELECT') AS tenant_registry_select,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'INSERT') AS tenant_registry_insert,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'UPDATE') AS tenant_registry_update,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'DELETE') AS tenant_registry_delete,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'TRUNCATE') AS tenant_registry_truncate,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'REFERENCES') AS tenant_registry_references,
            has_table_privilege(current_user, 'lawos_identity.tenants', 'TRIGGER') AS tenant_registry_trigger,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'SELECT') AS provisioning_select,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'INSERT') AS provisioning_insert,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'UPDATE') AS provisioning_update,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'DELETE') AS provisioning_delete,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'TRUNCATE') AS provisioning_truncate,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'REFERENCES') AS provisioning_references,
            has_table_privilege(current_user, 'lawos_identity.tenant_provisioning_requests', 'TRIGGER') AS provisioning_trigger
       FROM pg_roles AS roles
      WHERE roles.rolname = current_user`,
  )).rows[0];
  if (
    !app
    || app.role_name !== LAWOS_PRODUCTION_APPLICATION_ROLE
    || app.rolsuper !== false
    || app.rolbypassrls !== false
    || app.tenant_authority_select !== false
    || app.tenant_authority_insert !== false
    || app.tenant_authority_update !== false
    || app.tenant_registry_select !== true
    || app.tenant_registry_insert !== false
    || app.tenant_registry_update !== false
    || app.tenant_registry_delete !== false
    || app.tenant_registry_truncate !== false
    || app.tenant_registry_references !== false
    || app.tenant_registry_trigger !== false
    || app.provisioning_select !== true
    || app.provisioning_insert !== false
    || app.provisioning_update !== false
    || app.provisioning_delete !== false
    || app.provisioning_truncate !== false
    || app.provisioning_references !== false
    || app.provisioning_trigger !== false
  ) {
    throw failure("EXTERNAL_TENANT_APP_DATABASE_ROLE_INVALID", "tenant provisioning application database role is not least privilege", 403);
  }
}

function tenantContextSecretBytes(tenantContextSecret) {
  const secret = Buffer.isBuffer(tenantContextSecret)
    ? Buffer.from(tenantContextSecret)
    : typeof tenantContextSecret === "string"
      ? Buffer.from(tenantContextSecret, "utf8")
      : Buffer.alloc(0);
  if (secret.length < 32) {
    throw failure("EXTERNAL_TENANT_CONTEXT_SECRET_INVALID", "tenant context secret is invalid", 500);
  }
  return secret;
}

function advisoryLockKeys(scope) {
  const digest = createHash("sha256").update(`lawos-external-tenant-provisioning:${scope}`, "utf8").digest();
  return Object.freeze([
    digest.readUInt32BE(0) & 0x7fffffff,
    digest.readUInt32BE(4) & 0x7fffffff,
  ]);
}

function randomAdvisoryLockKeys() {
  const value = randomBytes(8);
  return Object.freeze([
    value.readUInt32BE(0) & 0x7fffffff,
    value.readUInt32BE(4) & 0x7fffffff,
  ]);
}

async function acquireAdvisoryLock(client, keys, heldLocks) {
  await client.query("SELECT pg_advisory_lock($1, $2)", keys);
  heldLocks.push(keys);
}

async function assertSameDatabase({ adminClient, appPool, probeKeys }) {
  const admin = (await adminClient.query("SELECT pg_backend_pid() AS backend_pid")).rows[0];
  const binding = (await appPool.query(
    `SELECT EXISTS (
       SELECT 1
         FROM pg_locks
        WHERE locktype = 'advisory'
          AND pid = $1
          AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
          AND classid = $2::oid
          AND objid = $3::oid
          AND objsubid = 2
          AND granted
     ) AS same_database`,
    [admin?.backend_pid, ...probeKeys],
  )).rows[0];
  if (binding?.same_database !== true) {
    throw failure("EXTERNAL_TENANT_DATABASE_BINDING_INVALID", "admin and application pools are not bound to the same database", 500);
  }
}

async function setAuthenticatedTenantContext(client, tenantId, secret) {
  const contextNonce = randomBytes(32).toString("base64url");
  const contextSignature = createHmac("sha256", secret)
    .update(`${tenantId}\x1f${contextNonce}`)
    .digest("hex");
  await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
  await client.query("SELECT set_config('app.tenant_context_nonce', $1, true)", [contextNonce]);
  await client.query("SELECT set_config('app.tenant_context_signature', $1, true)", [contextSignature]);
  const authenticated = await client.query("SELECT lawos_security.current_tenant_id() AS tenant_id");
  if (authenticated.rows[0]?.tenant_id !== tenantId) {
    throw failure("EXTERNAL_TENANT_ADMIN_CONTEXT_INVALID", "admin tenant context authentication failed", 500);
  }
}

async function beginTenantProvisioningWithAuthority({
  adminPool,
  appPool,
  tenantContextSecret,
  tenantLedger,
  identityLedger,
  beginInput,
  runProvisioning,
}) {
  const secret = tenantContextSecretBytes(tenantContextSecret);
  if (!safeEqual(secret, appPool[POSTGRES_TENANT_CONTEXT_SECRET])) {
    throw failure("EXTERNAL_TENANT_CONTEXT_SECRET_BINDING_INVALID", "application pool tenant context binding differs", 500);
  }
  const tenantId = beginInput.tenant_id;
  const client = await adminPool.connect();
  const heldLocks = [];
  let began = false;
  try {
    const serializedScopes = [`tenant:${tenantId}`];
    if (beginInput.federated_tenant_id) serializedScopes.push(`federated:${beginInput.federated_tenant_id}`);
    for (const scope of serializedScopes.sort()) {
      await acquireAdvisoryLock(client, advisoryLockKeys(scope), heldLocks);
    }
    const probeKeys = randomAdvisoryLockKeys();
    await acquireAdvisoryLock(client, probeKeys, heldLocks);
    await assertSameDatabase({ adminClient: client, appPool, probeKeys });

    await client.query("BEGIN");
    began = true;
    const applicationAuthority = (await client.query(
      `SELECT context_secret, synthetic_wildcard, active
         FROM lawos_security.tenant_context_authorities
        WHERE database_role = $1 AND tenant_id = $2
        FOR UPDATE`,
      [LAWOS_PRODUCTION_APPLICATION_ROLE, tenantId],
    )).rows[0];
    if (applicationAuthority && (
      applicationAuthority.synthetic_wildcard === true
      || applicationAuthority.active !== true
      || !safeEqual(applicationAuthority.context_secret, secret)
    )) {
      throw failure("EXTERNAL_TENANT_AUTHORITY_CONFLICT", "tenant authority already exists with a different binding", 409);
    }

    const adminRole = (await client.query("SELECT current_user AS role_name")).rows[0]?.role_name;
    const adminAuthority = (await client.query(
      `SELECT context_secret, synthetic_wildcard, active
         FROM lawos_security.tenant_context_authorities
        WHERE database_role = current_user AND tenant_id = $1
        FOR UPDATE`,
      [tenantId],
    )).rows[0];
    let temporaryAdminAuthority = false;
    if (adminAuthority) {
      if (
        adminAuthority.synthetic_wildcard === true
        || adminAuthority.active !== true
        || !safeEqual(adminAuthority.context_secret, secret)
      ) {
        throw failure("EXTERNAL_TENANT_ADMIN_CONTEXT_INVALID", "admin tenant context already has a different binding", 409);
      }
    } else {
      await client.query(
        `INSERT INTO lawos_security.tenant_context_authorities
           (database_role, tenant_id, context_secret, synthetic_wildcard, active)
         VALUES (current_user, $1, $2, false, true)`,
        [tenantId, secret],
      );
      temporaryAdminAuthority = true;
    }

    await setAuthenticatedTenantContext(client, tenantId, secret);
    const begun = await tenantLedger.beginInAuthenticatedTransaction(beginInput, client);
    const result = begun.completed
      ? begun.receipt
      : await runProvisioning({ client, identityLedger, tenantLedger });

    if (!applicationAuthority) {
      await client.query(
        `INSERT INTO lawos_security.tenant_context_authorities
           (database_role, tenant_id, context_secret, synthetic_wildcard, active)
         VALUES ($1, $2, $3, false, true)`,
        [LAWOS_PRODUCTION_APPLICATION_ROLE, tenantId, secret],
      );
    }
    if (temporaryAdminAuthority) {
      const removed = await client.query(
        `DELETE FROM lawos_security.tenant_context_authorities
          WHERE database_role = $1 AND tenant_id = $2
            AND context_secret = $3 AND synthetic_wildcard = false AND active = true`,
        [adminRole, tenantId, secret],
      );
      if (removed.rowCount !== 1) {
        throw failure("EXTERNAL_TENANT_ADMIN_CONTEXT_INVALID", "temporary admin tenant context could not be removed", 500);
      }
    }
    await client.query("COMMIT");
    began = false;
    return result;
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    if (error?.code === "23505") {
      throw failure("EXTERNAL_TENANT_PROVISIONING_CONFLICT", "external tenant provisioning identity binding conflicts", 409);
    }
    throw error;
  } finally {
    let unlockError = null;
    for (const keys of heldLocks.reverse()) {
      try {
        await client.query("SELECT pg_advisory_unlock($1, $2)", keys);
      } catch (error) {
        unlockError ??= error;
      }
    }
    client.release(unlockError);
  }
}

function assertRuntimeBinding(manifest, runtimeBinding = {}) {
  const expected = manifest.tenant.deployment;
  if (
    runtimeBinding.deployment_mode !== "tenant-pinned"
    || runtimeBinding.identity_tenant_id !== expected.identity_tenant_id
    || runtimeBinding.database_tenant_id !== expected.database_tenant_id
    || runtimeBinding.staff_auth_authority !== expected.staff_auth_authority
  ) {
    throw failure("EXTERNAL_TENANT_CROSS_TENANT_DENIED", "operator runtime binding differs from the tenant manifest", 403);
  }
}

function provisioningReceipt(manifest, manifestHash, contentHash) {
  const memberRefs = manifest.members.map(({ user_id }) => protectedRef("member", user_id));
  const preboundCount = manifest.members.filter(({ federated_subject_id }) => federated_subject_id).length;
  return Object.freeze({
    schema_version: EXTERNAL_TENANT_PROVISIONING_RECEIPT_VERSION,
    outcome: "completed",
    tenant_ref: protectedRef("tenant", manifest.tenant.tenant_id),
    manifest_ref: `manifest_sha256:${manifestHash}`,
    request_ref: `request_sha256:${contentHash}`,
    deployment_mode: "tenant-pinned",
    staff_auth_authority: manifest.tenant.deployment.staff_auth_authority,
    federated_directory_configured: Boolean(manifest.tenant.deployment.federated_tenant_id),
    member_count: manifest.members.length,
    member_refs: Object.freeze(memberRefs),
    prebound_federated_member_count: preboundCount,
    reset_required_member_count:
      manifest.tenant.deployment.staff_auth_authority === "internal-password"
        ? manifest.members.length
        : 0,
    runtime_binding: Object.freeze({
      separate_deployment_required: true,
      identity_authority_pinned: true,
      database_authority_pinned: true,
      shared_multi_tenant_runtime: false,
    }),
    authentication_material_returned: false,
    pii_returned: false,
    production_ready_claim: false,
  });
}

export async function provisionExternalTenant({
  manifest: rawManifest,
  expectedManifestSha256,
  runtimeBinding,
  adminPool,
  appPool,
  tenantContextSecret,
  clock = () => new Date(),
} = {}) {
  if (!adminPool?.connect || !adminPool?.query || !appPool?.connect || !appPool?.query) {
    throw new TypeError("tenant provisioning requires separate admin and application PostgreSQL pools");
  }
  const manifest = normalizeExternalTenantProvisioningManifest(rawManifest);
  const manifestHash = externalTenantProvisioningManifestSha256(manifest);
  const expectedManifestHash = typeof expectedManifestSha256 === "string"
    ? expectedManifestSha256.toLowerCase()
    : "";
  if (!SHA256.test(expectedManifestHash)
      || !safeEqual(manifestHash, expectedManifestHash)) {
    throw failure("EXTERNAL_TENANT_MANIFEST_HASH_MISMATCH", "tenant provisioning manifest hash does not match the operator binding", 403);
  }
  assertRuntimeBinding(manifest, runtimeBinding);
  await verifyClientOperationsPostgresMigrations(adminPool);
  await assertDatabaseRoles({ adminPool, appPool });
  const tenantId = manifest.tenant.tenant_id;
  const contentHash = requestHash(manifest);
  const tenantRef = protectedRef("tenant", tenantId);
  const operatorRefHash = sha256(manifest.operator_ref);
  const tenantLedger = createPostgresTenantProvisioningLedger({ pool: appPool, clock });
  const identityLedger = createPostgresIdentityLedger({ pool: appPool, clock });
  const idempotencyKeyHash = sha256(manifest.idempotency_key);
  const beginInput = {
    tenant_id: tenantId,
    tenant_ref: tenantRef,
    display_name: manifest.tenant.display_name,
    deployment_mode: "tenant-pinned",
    staff_auth_authority: manifest.tenant.deployment.staff_auth_authority,
    federated_tenant_id: manifest.tenant.deployment.federated_tenant_id,
    idempotency_key_hash: idempotencyKeyHash,
    request_hash: contentHash,
    operator_ref_hash: operatorRefHash,
    requested_member_count: manifest.members.length,
  };
  return beginTenantProvisioningWithAuthority({
    adminPool,
    appPool,
    tenantContextSecret,
    tenantLedger,
    identityLedger,
    beginInput,
    runProvisioning: async ({ client }) => {
      for (const member of manifest.members) {
        const memberRefHash = sha256(member.user_id);
        const memberRequestHash = sha256(canonicalizeJson(member));
        await identityLedger.provisionDirectoryUserOnClient({
          tenant_id: tenantId,
          actor_id: `operator_sha256:${operatorRefHash}`,
          data_scope: "external-law-firm",
          idempotency_key: `external-member:${contentHash}:${memberRefHash}`,
          request_hash: memberRequestHash,
          user: {
            user_id: member.user_id,
            email: member.email,
            status: "active",
            display_name: member.display_name,
            work_email: member.email,
            registration_state: "operator-provisioned",
            login_allowed: true,
            identity_setup_allowed: false,
            access_grant_allowed: false,
            source_ref: `external_tenant_manifest_sha256:${manifestHash}`,
          },
          membership: {
            status: "active",
            role_profile_id: member.role_profile_id,
            role_ids: member.role_ids,
            group_ids: member.group_ids,
            scopes: member.scopes,
            hrx_scopes: member.hrx_scopes,
            source_ref: `external_tenant_manifest_sha256:${manifestHash}`,
          },
        }, client);
        if (member.federated_subject_id) {
          const current = await identityLedger.getAccountOnClient({
            tenant_id: tenantId,
            user_id: member.user_id,
          }, client);
          if (
            current.federated_tenant_id !== manifest.tenant.deployment.federated_tenant_id
            || current.federated_subject_id !== member.federated_subject_id
          ) {
            await identityLedger.ensureFederatedAccountOnClient({
              tenant_id: tenantId,
              user: { user_id: member.user_id, email: member.email, status: "active" },
              provider_id: ENTRA_OIDC_PROVIDER_ID,
              federated_tenant_id: manifest.tenant.deployment.federated_tenant_id,
              federated_subject_id: member.federated_subject_id,
              actor_id: `operator_sha256:${operatorRefHash}`,
              phishing_resistant_mfa: false,
              conditional_access_verified: false,
              audit_action: "auth.external_tenant.federated_identity.provisioned",
            }, client);
          }
        }
      }

      const receipt = provisioningReceipt(manifest, manifestHash, contentHash);
      const completed = await tenantLedger.completeInAuthenticatedTransaction({
        tenant_id: tenantId,
        idempotency_key_hash: idempotencyKeyHash,
        request_hash: contentHash,
        operator_ref_hash: operatorRefHash,
        expected_members: manifest.members.map((member) => ({
          user_id: member.user_id,
          credential_provider: member.federated_subject_id
            ? ENTRA_OIDC_PROVIDER_ID
            : LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
          federated_subject_id: member.federated_subject_id,
        })),
        receipt,
      }, client);
      return completed.receipt;
    },
  });
}

export async function assertTenantPinnedExternalRuntime({
  tenantLedger,
  identityTenantId,
  databaseTenantId,
  deploymentMode,
  staffAuthAuthority,
  staffOidcProvider = null,
} = {}) {
  const tenantId = typeof identityTenantId === "string" ? identityTenantId.trim() : "";
  if (!tenantId || !tenantLedger?.getTenant) {
    if (deploymentMode === "tenant-pinned") {
      throw failure("EXTERNAL_TENANT_RUNTIME_BINDING_INVALID", "external tenant runtime registry authority is unavailable", 500);
    }
    return Object.freeze({ registered: false });
  }
  const deployment = await tenantLedger.getTenant({ tenant_id: tenantId });
  if (!deployment) {
    if (deploymentMode === "tenant-pinned") {
      throw failure("EXTERNAL_TENANT_RUNTIME_BINDING_INVALID", "external tenant runtime is not registered", 500);
    }
    return Object.freeze({ registered: false });
  }
  const providerTenantId = staffOidcProvider?.federated_tenant_id ?? null;
  if (
    deployment.status !== "active"
    || deployment.deployment_mode !== "tenant-pinned"
    || deploymentMode !== "tenant-pinned"
    || databaseTenantId !== tenantId
    || deployment.staff_auth_authority !== staffAuthAuthority
    || (
      staffAuthAuthority === "entra-oidc"
      && providerTenantId !== deployment.federated_tenant_id
    )
    || (staffAuthAuthority === "internal-password" && staffOidcProvider != null)
  ) {
    throw failure("EXTERNAL_TENANT_RUNTIME_BINDING_INVALID", "external tenant runtime binding is not isolated", 500);
  }
  return Object.freeze({
    registered: true,
    active: true,
    tenant_ref: protectedRef("tenant", tenantId),
    deployment_mode: "tenant-pinned",
    shared_multi_tenant_runtime: false,
  });
}

async function readManifestFromStdin() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 1024 * 1024) throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "tenant provisioning manifest is too large", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw failure("EXTERNAL_TENANT_MANIFEST_INVALID", "tenant provisioning manifest is not valid JSON");
  }
}

async function runCli(env = process.env) {
  if (env.LAWOS_RUNTIME_PROFILE !== "operational") {
    throw failure("EXTERNAL_TENANT_OPERATIONAL_PROFILE_REQUIRED", "external tenant provisioning requires the operational profile", 403);
  }
  const region = text(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION ?? "ap-northeast-2", "AWS region");
  const adminSecretId = text(
    env[LAWOS_EXTERNAL_TENANT_ADMIN_POSTGRES_SECRET_ID_ENV],
    LAWOS_EXTERNAL_TENANT_ADMIN_POSTGRES_SECRET_ID_ENV,
  );
  const expectedManifestSha256 = text(
    env[LAWOS_EXTERNAL_TENANT_MANIFEST_SHA256_ENV],
    LAWOS_EXTERNAL_TENANT_MANIFEST_SHA256_ENV,
    { maximum: 64, pattern: SHA256 },
  ).toLowerCase();
  const secretsClient = new SecretsManagerClient({ region });
  const adminConnectionString = postgresUrlFromSecret(await resolveAwsSecretString({
    secretId: adminSecretId,
    region,
    client: secretsClient,
  }));
  const appConnectionString = await resolvePostgresConnectionString({ env, secretsClient });
  const tenantContextSecret = await resolvePostgresTenantContextSecret({ env, secretsClient });
  const adminPool = createPostgresPool({
    connectionString: adminConnectionString,
    sslMode: "verify-full",
    applicationName: "lawos-external-tenant-provisioning-admin",
    max: 1,
  });
  const appPool = createPostgresPool({
    connectionString: appConnectionString,
    sslMode: "verify-full",
    applicationName: "lawos-external-tenant-provisioning-app",
    tenantContextSecret,
    max: 1,
  });
  try {
    return await provisionExternalTenant({
      manifest: await readManifestFromStdin(),
      expectedManifestSha256,
      runtimeBinding: {
        deployment_mode: env[LAWOS_TENANT_DEPLOYMENT_MODE_ENV],
        identity_tenant_id: env.LAWOS_IDENTITY_TENANT_ID,
        database_tenant_id: env.LAWOS_DATABASE_TENANT_ID,
        staff_auth_authority: env.LAWOS_STAFF_AUTHORITY,
      },
      adminPool,
      appPool,
      tenantContextSecret,
    });
  } finally {
    await Promise.allSettled([adminPool.end(), appPool.end()]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then(
    (receipt) => process.stdout.write(`${JSON.stringify(receipt)}\n`),
    (error) => {
      process.stderr.write(`${JSON.stringify({
        outcome: "blocked",
        safe_error_code: error?.safe_error_code ?? "EXTERNAL_TENANT_PROVISIONING_FAILED",
        detail_exposed: false,
        production_ready_claim: false,
      })}\n`);
      process.exitCode = 1;
    },
  );
}
