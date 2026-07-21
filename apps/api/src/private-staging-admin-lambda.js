import { createHash } from "node:crypto";
import {
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { configureLawosApplicationRole } from "../../../packages/persistence/src/postgres/application-role.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import {
  runPostgresMigrations,
  verifyPostgresMigrationState,
} from "../../../packages/persistence/src/postgres/migration-runner.js";
import { runPrivateStagingCut005 } from "../../../packages/persistence/src/postgres/private-staging-cut005.js";
import { runPrivateStagingCut006 } from "./private-staging-cut006.js";
import { runPrivateStagingCut007Readback } from "./private-staging-cut007-readback.js";
import { runPrivateStagingSyntheticBaseline } from "./private-staging-synthetic-baseline.js";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import { postgresUrlFromSecret } from "./persistence-authority.js";
import { authorizePrivateStagingAdminInvocation } from "./private-staging-owner-authorization.js";

export const PRIVATE_STAGING_BOOTSTRAP_ACTION = "lawos-private-staging-database-bootstrap";
export const PRIVATE_STAGING_CUT005_ACTION = "lawos-private-staging-cut-005";
export const PRIVATE_STAGING_CUT006_ACTION = "lawos-private-staging-cut-006";
export const PRIVATE_STAGING_CUT007_READBACK_ACTION = "lawos-private-staging-cut-007-readback";
export const PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION = "lawos-private-staging-synthetic-baseline";
export const PRIVATE_STAGING_BOOTSTRAP_APPROVAL_ENV = "LAWOS_BOOTSTRAP_APPROVAL_ID";
export const PRIVATE_STAGING_CUT005_APPROVAL_ENV = "LAWOS_CUT005_APPROVAL_ID";
export const PRIVATE_STAGING_CUT006_APPROVAL_ENV = "LAWOS_CUT006_APPROVAL_ID";
export const PRIVATE_STAGING_CUT007_APPROVAL_ENV = "LAWOS_CUT007_APPROVAL_ID";
// Stable for the lifetime of the purpose-bound CUT-005 tenants. A new value requires tenant reset or replacement.
export const PRIVATE_STAGING_CUT005_CORPUS_RUN_ID = "cut005-796c21afe773";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function cut005DirectoryIdentity(runId) {
  const runRef = sha256(requiredText(runId, "CUT-005 corpus run id"));
  const suffix = runRef.slice(0, 12);
  return Object.freeze({
    user_id: `synthetic-cut005-user-${suffix}`,
    email: `cut005-${suffix}@example.test`,
    source_ref: `synthetic-cut005:${runRef}`,
  });
}

function cut005RepairScopeError(message) {
  return Object.assign(new Error(message), {
    code: "LAWOS_PRIVATE_STAGING_CUT005_REPAIR_SCOPE_DRIFT",
    safe_error_code: "PRIVATE_STAGING_CUT005_REPAIR_SCOPE_DRIFT",
  });
}

function assertCut005RepairCandidate(row) {
  const user = /^synthetic-cut005-user-([a-f0-9]{12})$/u.exec(String(row?.user_id ?? ""));
  const email = /^cut005-([a-f0-9]{12})@example\.test$/u.exec(String(row?.email ?? "").toLowerCase());
  const source = /^synthetic-cut005:([a-f0-9]{64})$/u.exec(String(row?.source_ref ?? ""));
  if (!user || !email || !source || user[1] !== email[1] || user[1] !== source[1].slice(0, 12)
    || row?.profile?.source_ref !== row.source_ref
    || row.account_status !== "active"
    || row.membership_status !== "active"
    || row.credential_provider !== "internal-password"
    || row.credential_status !== "reset_required"
    || !row.password_hash || Object.keys(row.password_hash).length !== 0) {
    throw cut005RepairScopeError("CUT-005 directory repair candidate escaped the synthetic-only boundary");
  }
}

export async function repairPrivateStagingCut005Directory(client, { tenantIds, runId = PRIVATE_STAGING_CUT005_CORPUS_RUN_ID } = {}) {
  if (!client || typeof client.query !== "function") throw new TypeError("PostgreSQL client is required for CUT-005 repair");
  const tenants = [...new Set((tenantIds ?? []).map((value) => requiredText(value, "CUT-005 tenant id")))];
  if (tenants.length !== 2 || tenants.some((tenantId) => !/^tenant_lawos_staging_cut005_[a-z0-9_-]+$/u.test(tenantId))) {
    throw cut005RepairScopeError("CUT-005 directory repair requires two purpose-bound synthetic tenants");
  }
  const expected = cut005DirectoryIdentity(runId);
  let began = false;
  let scannedAccountCount = 0;
  let repairedAccountCount = 0;
  try {
    await client.query("BEGIN");
    began = true;
    await client.query("SET LOCAL row_security = off");
    for (const tenantId of tenants) {
      const candidates = await client.query(
        `SELECT accounts.user_id, accounts.email, accounts.account_status,
                accounts.credential_provider, accounts.credential_status,
                accounts.password_hash, accounts.profile,
                memberships.status AS membership_status, memberships.source_ref
           FROM lawos_identity.accounts AS accounts
           JOIN lawos_identity.account_memberships AS memberships
             ON memberships.tenant_id = accounts.tenant_id
            AND memberships.user_id = accounts.user_id
          WHERE accounts.tenant_id = $1
            AND (accounts.user_id LIKE 'synthetic-cut005-user-%'
              OR lower(accounts.email) LIKE 'cut005-%@example.test'
              OR memberships.source_ref LIKE 'synthetic-cut005:%')
          ORDER BY accounts.user_id
          FOR UPDATE OF accounts, memberships`,
        [tenantId],
      );
      if (candidates.rows.length > 8) {
        throw cut005RepairScopeError("CUT-005 directory repair candidate count exceeded the synthetic recovery bound");
      }
      scannedAccountCount += candidates.rows.length;
      for (const row of candidates.rows) assertCut005RepairCandidate(row);
      const staleUserIds = candidates.rows.filter((row) => row.user_id !== expected.user_id).map((row) => row.user_id);
      if (!staleUserIds.length) continue;
      const dependencies = await client.query(
        `SELECT
           (SELECT count(*)::integer FROM lawos_identity.sessions WHERE tenant_id = $1 AND user_id = ANY($2::text[])) AS session_count,
           (SELECT count(*)::integer FROM lawos_identity.challenges WHERE tenant_id = $1 AND user_id = ANY($2::text[])) AS challenge_count,
           (SELECT count(*)::integer FROM lawos_identity.break_glass_requests WHERE tenant_id = $1 AND requester_user_id = ANY($2::text[])) AS break_glass_count`,
        [tenantId, staleUserIds],
      );
      const counts = dependencies.rows[0] ?? {};
      if (Number(counts.session_count) !== 0 || Number(counts.challenge_count) !== 0 || Number(counts.break_glass_count) !== 0) {
        throw cut005RepairScopeError("CUT-005 stale synthetic account has protected runtime references");
      }
      const memberships = await client.query(
        "DELETE FROM lawos_identity.account_memberships WHERE tenant_id = $1 AND user_id = ANY($2::text[])",
        [tenantId, staleUserIds],
      );
      const accounts = await client.query(
        "DELETE FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = ANY($2::text[])",
        [tenantId, staleUserIds],
      );
      if (memberships.rowCount !== staleUserIds.length || accounts.rowCount !== staleUserIds.length) {
        throw cut005RepairScopeError("CUT-005 stale synthetic account repair count drifted");
      }
      repairedAccountCount += accounts.rowCount;
    }
    await client.query("COMMIT");
    began = false;
    return Object.freeze({
      tenant_count: tenants.length,
      scanned_account_count: scannedAccountCount,
      repaired_account_count: repairedAccountCount,
      real_data_count: 0,
      audit_history_deleted_count: 0,
    });
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

function requiredSha256(value, name) {
  const digest = requiredText(value, name).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${name} must be a SHA-256 digest`);
  return digest;
}

function normalizeManifest(input) {
  if (input?.schema_version !== "law-firm-os.synthetic-staging-manifest.v2") throw new TypeError("synthetic manifest schema is invalid");
  if (input?.data_scope !== "synthetic-only" || input?.real_data_allowed !== false) throw new TypeError("synthetic-only manifest is required");
  const tenantIds = [...new Set((input.tenant_ids ?? []).map((value) => requiredText(value, "synthetic tenant id")))].sort();
  const purposeTenants = Object.fromEntries(["cut005", "cut006", "cut007"].map((purpose) => {
    const values = [...new Set((input.purpose_tenants?.[purpose] ?? []).map((value) => requiredText(value, `${purpose} tenant id`)))];
    if (values.length !== 2 || values.some((tenantId) => !tenantIds.includes(tenantId))) {
      throw new TypeError(`${purpose} requires two purpose-bound synthetic tenants`);
    }
    return [purpose, Object.freeze(values)];
  }));
  if (tenantIds.length !== 6 || new Set(Object.values(purposeTenants).flat()).size !== 6) {
    throw new TypeError("synthetic staging purposes require six distinct tenants");
  }
  return Object.freeze({
    tenant_ids: Object.freeze(tenantIds),
    purpose_tenants: Object.freeze(purposeTenants),
    manifest_sha256: sha256(JSON.stringify(input)),
  });
}

function structuredApplicationSecret({ current, env }) {
  const value = {
    schema_version: "law-firm-os.postgres-application-secret.v1",
    configuration_state: "ready",
    engine: "postgres",
    host: requiredText(env.LAWOS_DATABASE_HOST, "LAWOS_DATABASE_HOST"),
    port: Number(requiredText(env.LAWOS_DATABASE_PORT, "LAWOS_DATABASE_PORT")),
    dbname: requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME"),
    username: requiredText(current.username, "application database username"),
    password: requiredText(current.password, "application database password"),
  };
  if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535) throw new TypeError("LAWOS_DATABASE_PORT is invalid");
  return value;
}

function assertDirectInvoke(event, { action, approvalId }) {
  if (event?.requestContext || event?.rawPath || event?.httpMethod) throw new Error("private staging administration is direct-invoke only");
  if (event?.action !== action) throw new Error("unsupported private staging administration action");
  if (event?.approval_id !== approvalId) throw new Error("matching private staging approval id is required");
  if (event?.data_scope !== "synthetic-only") throw new Error("synthetic-only data scope is required");
}

function exactDeploymentAuthority(event, env) {
  const sourceSha = requiredText(env.LAWOS_DEPLOYMENT_COMMIT, "LAWOS_DEPLOYMENT_COMMIT");
  const sourceTree = requiredText(env.LAWOS_DEPLOYMENT_TREE, "LAWOS_DEPLOYMENT_TREE");
  const artifactSha = requiredText(env.LAWOS_DEPLOYMENT_ARTIFACT_SHA256, "LAWOS_DEPLOYMENT_ARTIFACT_SHA256");
  const instructionSha = requiredText(env.LAWOS_OWNER_INSTRUCTION_SHA256, "LAWOS_OWNER_INSTRUCTION_SHA256");
  if (event.source_sha !== sourceSha || event.source_tree !== sourceTree || event.artifact_sha256 !== artifactSha) {
    throw new Error("private staging direct invoke does not match the deployed exact head");
  }
  if (event.owner_instruction_sha256 !== instructionSha) throw new Error("owner instruction digest does not match deployment authority");
  return Object.freeze({ sourceSha, sourceTree, artifactSha, instructionSha });
}

function authorizationEvidence(authorization) {
  return Object.freeze({
    authorization_key_id: authorization.key_id,
    authorization_receipt_sha256: authorization.receipt_sha256,
    authorization_claim_fingerprint: authorization.claim_fingerprint,
    authorization_claim_body_sha256: authorization.claim_body_sha256,
  });
}

export async function bootstrapPrivateStagingDatabase({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
  authorize = authorizePrivateStagingAdminInvocation,
  createPool = createPostgresPool,
  runMigrations = runPostgresMigrations,
  verifyMigrations = verifyPostgresMigrationState,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_BOOTSTRAP_APPROVAL_ENV], PRIVATE_STAGING_BOOTSTRAP_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_BOOTSTRAP_ACTION, approvalId });
  const {
    sourceSha: expectedSourceSha,
    sourceTree: expectedSourceTree,
    artifactSha,
    instructionSha,
  } = exactDeploymentAuthority(event, env);
  const authorization = await authorize({ event, env, action: PRIVATE_STAGING_BOOTSTRAP_ACTION, approvalId });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION, "AWS region");
  const [master, application, tenantContext, rawManifest] = await Promise.all([
    resolveSecret({ secretId: requiredText(env.LAWOS_MASTER_DATABASE_SECRET_ID, "LAWOS_MASTER_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID, "LAWOS_SYNTHETIC_MANIFEST_SECRET_ID"), region }),
  ]);
  const manifest = normalizeManifest(rawManifest);
  if (event.synthetic_manifest_sha256 !== manifest.manifest_sha256) throw new Error("synthetic manifest digest does not match invocation authority");
  const applicationSecret = structuredApplicationSecret({ current: application, env });
  const masterConnectionString = postgresUrlFromSecret(JSON.stringify({
    ...master,
    host: env.LAWOS_DATABASE_HOST,
    port: env.LAWOS_DATABASE_PORT,
    dbname: env.LAWOS_DATABASE_NAME,
  }));
  const tenantContextSecret = requiredText(
    tenantContext.tenant_context_secret ?? tenantContext.TENANT_CONTEXT_SECRET,
    "tenant context secret",
  );
  const pool = createPool({
    connectionString: masterConnectionString,
    sslMode: "verify-full",
    applicationName: "lawos-private-staging-admin-bootstrap",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let migrationResults;
  let roleResult;
  let cut005RepairResult;
  try {
    migrationResults = await runMigrations(pool, { appliedBy: `lawos-private-staging:${expectedSourceSha}` });
    const client = await pool.connect();
    try {
      roleResult = await configureLawosApplicationRole(client, {
        password: applicationSecret.password,
        tenantContextSecret,
        syntheticTenantIds: manifest.tenant_ids,
      });
      cut005RepairResult = await repairPrivateStagingCut005Directory(client, {
        tenantIds: manifest.purpose_tenants.cut005,
      });
    } finally {
      client.release();
    }
    await verifyMigrations(pool);
    const writeApplicationSecret = putSecret ?? (async ({ secretId, secretString }) => {
      const client = new SecretsManagerClient({ region });
      await client.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: secretString }));
    });
    await writeApplicationSecret({
      secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"),
      secretString: JSON.stringify(applicationSecret),
    });
  } finally {
    await pool.end();
  }
  return Object.freeze({
    outcome: "PASS",
    action: PRIVATE_STAGING_BOOTSTRAP_ACTION,
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    source_sha: expectedSourceSha,
    source_tree: expectedSourceTree,
    artifact_sha256: artifactSha,
    owner_instruction_sha256: instructionSha,
    synthetic_manifest_sha256: manifest.manifest_sha256,
    migration_count: migrationResults.length,
    migration_applied_count: migrationResults.filter((item) => item.applied).length,
    application_role_grant_count: roleResult.grant_statement_count,
    tenant_authority_count: roleResult.tenant_authority_count,
    cut005_directory_repair_count: cut005RepairResult.repaired_account_count,
    cut005_directory_repair_scanned_count: cut005RepairResult.scanned_account_count,
    cut005_directory_repair_audit_delete_count: 0,
    synthetic_wildcard_count: 0,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    real_data_count: 0,
    password_returned: false,
    secret_material_returned: false,
    production_contacted: false,
    production_ready_claim: false,
    approval_id: approvalId,
    ...authorizationEvidence(authorization),
  });
}

export async function executePrivateStagingCut005({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  authorize = authorizePrivateStagingAdminInvocation,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runCut005 = runPrivateStagingCut005,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT005_APPROVAL_ENV], PRIVATE_STAGING_CUT005_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_CUT005_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
  const authorization = await authorize({ event, env, action: PRIVATE_STAGING_CUT005_ACTION, approvalId });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION, "AWS region");
  const [application, tenantContext, rawManifest] = await Promise.all([
    resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID, "LAWOS_SYNTHETIC_MANIFEST_SECRET_ID"), region }),
  ]);
  const manifest = normalizeManifest(rawManifest);
  if (event.synthetic_manifest_sha256 !== manifest.manifest_sha256) throw new Error("synthetic manifest digest does not match invocation authority");
  if (application.configuration_state !== "ready") throw new Error("application database secret is not bootstrapped");
  const tenantContextSecret = requiredText(
    tenantContext.tenant_context_secret ?? tenantContext.TENANT_CONTEXT_SECRET,
    "tenant context secret",
  );
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(application)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: "lawos-private-staging-cut005",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 2,
  });
  try {
    await verifyMigrations(pool);
    const result = await runCut005({
      pool,
      tenantIds: manifest.purpose_tenants.cut005,
      runId: PRIVATE_STAGING_CUT005_CORPUS_RUN_ID,
    });
    return Object.freeze({
      ...result,
      action: PRIVATE_STAGING_CUT005_ACTION,
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_sha256: artifactSha,
      owner_instruction_sha256: instructionSha,
      synthetic_manifest_sha256: manifest.manifest_sha256,
      approval_id: approvalId,
      secret_material_returned: false,
      production_ready_claim: false,
      ...authorizationEvidence(authorization),
    });
  } finally {
    await pool.end();
  }
}

export async function executePrivateStagingCut006({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  authorize = authorizePrivateStagingAdminInvocation,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runCut006 = runPrivateStagingCut006,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT006_APPROVAL_ENV], PRIVATE_STAGING_CUT006_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_CUT006_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
  const authorization = await authorize({ event, env, action: PRIVATE_STAGING_CUT006_ACTION, approvalId });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION, "AWS region");
  const [application, tenantContext, rawManifest] = await Promise.all([
    resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID, "LAWOS_SYNTHETIC_MANIFEST_SECRET_ID"), region }),
  ]);
  const manifest = normalizeManifest(rawManifest);
  if (event.synthetic_manifest_sha256 !== manifest.manifest_sha256) throw new Error("synthetic manifest digest does not match invocation authority");
  if (application.configuration_state !== "ready") throw new Error("application database secret is not bootstrapped");
  const tenantContextSecret = requiredText(
    tenantContext.tenant_context_secret ?? tenantContext.TENANT_CONTEXT_SECRET,
    "tenant context secret",
  );
  const artifactEntryManifestSha256 = requiredSha256(event.artifact_entry_manifest_sha256, "artifact_entry_manifest_sha256");
  const apiConfigurationSha256 = requiredSha256(event.api_configuration_sha256, "api_configuration_sha256");
  const coldStartRequestId = requiredText(event.api_cold_start_request_id, "api_cold_start_request_id");
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(application)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: "lawos-private-staging-cut006",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 2,
  });
  try {
    await verifyMigrations(pool);
    const result = await runCut006({
      pool,
      tenantIds: manifest.purpose_tenants.cut006,
      runId: `cut006-${sourceSha.slice(0, 12)}`,
      configuration: {
        env,
        artifactRuntimeStoreEntryCount: event.artifact_runtime_store_entry_count,
        artifactRealJsonStoreCount: event.artifact_real_json_store_count,
        fileCurrentInitializedCount: event.file_current_initialized_count,
        coldStartObserved: event.api_cold_start_observed === true,
      },
    });
    return Object.freeze({
      ...result,
      action: PRIVATE_STAGING_CUT006_ACTION,
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_sha256: artifactSha,
      owner_instruction_sha256: instructionSha,
      synthetic_manifest_sha256: manifest.manifest_sha256,
      artifact_entry_manifest_sha256: artifactEntryManifestSha256,
      api_configuration_sha256: apiConfigurationSha256,
      api_cold_start_request_fingerprint: sha256(coldStartRequestId),
      approval_id: approvalId,
      secret_material_returned: false,
      production_ready_claim: false,
      ...authorizationEvidence(authorization),
    });
  } finally {
    await pool.end();
  }
}

export async function executePrivateStagingSyntheticBaseline({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  authorize = authorizePrivateStagingAdminInvocation,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runBaseline = runPrivateStagingSyntheticBaseline,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT007_APPROVAL_ENV], PRIVATE_STAGING_CUT007_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
  const authorization = await authorize({ event, env, action: PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION, approvalId });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION, "AWS region");
  const [application, tenantContext, rawManifest] = await Promise.all([
    resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID, "LAWOS_SYNTHETIC_MANIFEST_SECRET_ID"), region }),
  ]);
  const manifest = normalizeManifest(rawManifest);
  if (event.synthetic_manifest_sha256 !== manifest.manifest_sha256) throw new Error("synthetic manifest digest does not match invocation authority");
  if (application.configuration_state !== "ready") throw new Error("application database secret is not bootstrapped");
  const tenantContextSecret = requiredText(
    tenantContext.tenant_context_secret ?? tenantContext.TENANT_CONTEXT_SECRET,
    "tenant context secret",
  );
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(application)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: "lawos-private-staging-cut007-baseline",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 2,
  });
  try {
    await verifyMigrations(pool);
    const result = await runBaseline({
      pool,
      tenantIds: manifest.purpose_tenants.cut007,
    });
    return Object.freeze({
      ...result,
      action: PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION,
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_sha256: artifactSha,
      owner_instruction_sha256: instructionSha,
      synthetic_manifest_sha256: manifest.manifest_sha256,
      approval_id: approvalId,
      secret_material_returned: false,
      production_ready_claim: false,
      ...authorizationEvidence(authorization),
    });
  } finally {
    await pool.end();
  }
}

export async function executePrivateStagingCut007Readback({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  authorize = authorizePrivateStagingAdminInvocation,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runReadback = runPrivateStagingCut007Readback,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT007_APPROVAL_ENV], PRIVATE_STAGING_CUT007_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_CUT007_READBACK_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
  const authorization = await authorize({ event, env, action: PRIVATE_STAGING_CUT007_READBACK_ACTION, approvalId });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION, "AWS region");
  const [application, tenantContext, rawManifest] = await Promise.all([
    resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID, "LAWOS_SYNTHETIC_MANIFEST_SECRET_ID"), region }),
  ]);
  const manifest = normalizeManifest(rawManifest);
  if (event.synthetic_manifest_sha256 !== manifest.manifest_sha256) throw new Error("synthetic manifest digest does not match invocation authority");
  if (application.configuration_state !== "ready") throw new Error("application database secret is not bootstrapped");
  const tenantContextSecret = requiredText(
    tenantContext.tenant_context_secret ?? tenantContext.TENANT_CONTEXT_SECRET,
    "tenant context secret",
  );
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(application)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: "lawos-private-staging-cut007-readback",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 2,
  });
  try {
    await verifyMigrations(pool);
    const result = await runReadback({
      pool,
      tenantIds: manifest.purpose_tenants.cut007,
      runId: event.run_id,
      expected: event.expected,
    });
    return Object.freeze({
      ...result,
      action: PRIVATE_STAGING_CUT007_READBACK_ACTION,
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_sha256: artifactSha,
      owner_instruction_sha256: instructionSha,
      synthetic_manifest_sha256: manifest.manifest_sha256,
      approval_id: approvalId,
      secret_material_returned: false,
      production_ready_claim: false,
      ...authorizationEvidence(authorization),
    });
  } finally {
    await pool.end();
  }
}

export async function handler(event = {}) {
  try {
    if (event.action === PRIVATE_STAGING_BOOTSTRAP_ACTION) return await bootstrapPrivateStagingDatabase({ event });
    if (event.action === PRIVATE_STAGING_CUT005_ACTION) return await executePrivateStagingCut005({ event });
    if (event.action === PRIVATE_STAGING_CUT006_ACTION) return await executePrivateStagingCut006({ event });
    if (event.action === PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION) return await executePrivateStagingSyntheticBaseline({ event });
    if (event.action === PRIVATE_STAGING_CUT007_READBACK_ACTION) return await executePrivateStagingCut007Readback({ event });
    throw new Error("unsupported private staging administration action");
  } catch (error) {
    return Object.freeze({
      outcome: "BLOCKED",
      action: [PRIVATE_STAGING_BOOTSTRAP_ACTION, PRIVATE_STAGING_CUT005_ACTION, PRIVATE_STAGING_CUT006_ACTION, PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION, PRIVATE_STAGING_CUT007_READBACK_ACTION].includes(event.action)
        ? event.action
        : "unsupported-private-staging-action",
      safe_error_code: String(error?.code ?? "PRIVATE_STAGING_BOOTSTRAP_FAILED").replace(/[^A-Z0-9_]/gu, "_").slice(0, 96),
      error_name: error?.name ?? "Error",
      secret_material_returned: false,
      production_contacted: false,
      production_ready_claim: false,
    });
  }
}
