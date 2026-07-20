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

export const PRIVATE_STAGING_BOOTSTRAP_ACTION = "lawos-private-staging-database-bootstrap";
export const PRIVATE_STAGING_CUT005_ACTION = "lawos-private-staging-cut-005";
export const PRIVATE_STAGING_CUT006_ACTION = "lawos-private-staging-cut-006";
export const PRIVATE_STAGING_CUT007_READBACK_ACTION = "lawos-private-staging-cut-007-readback";
export const PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION = "lawos-private-staging-synthetic-baseline";
export const PRIVATE_STAGING_BOOTSTRAP_APPROVAL_ENV = "LAWOS_BOOTSTRAP_APPROVAL_ID";
export const PRIVATE_STAGING_CUT005_APPROVAL_ENV = "LAWOS_CUT005_APPROVAL_ID";
export const PRIVATE_STAGING_CUT006_APPROVAL_ENV = "LAWOS_CUT006_APPROVAL_ID";
export const PRIVATE_STAGING_CUT007_APPROVAL_ENV = "LAWOS_CUT007_APPROVAL_ID";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

export async function bootstrapPrivateStagingDatabase({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
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
  try {
    migrationResults = await runMigrations(pool, { appliedBy: `lawos-private-staging:${expectedSourceSha}` });
    const client = await pool.connect();
    try {
      roleResult = await configureLawosApplicationRole(client, {
        databaseName: applicationSecret.dbname,
        password: applicationSecret.password,
        tenantContextSecret,
        syntheticTenantIds: manifest.tenant_ids,
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
  });
}

export async function executePrivateStagingCut005({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runCut005 = runPrivateStagingCut005,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT005_APPROVAL_ENV], PRIVATE_STAGING_CUT005_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_CUT005_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
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
      runId: `cut005-${sourceSha.slice(0, 12)}`,
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
    });
  } finally {
    await pool.end();
  }
}

export async function executePrivateStagingCut006({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runCut006 = runPrivateStagingCut006,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT006_APPROVAL_ENV], PRIVATE_STAGING_CUT006_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_CUT006_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
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
    });
  } finally {
    await pool.end();
  }
}

export async function executePrivateStagingSyntheticBaseline({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runBaseline = runPrivateStagingSyntheticBaseline,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT007_APPROVAL_ENV], PRIVATE_STAGING_CUT007_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
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
    });
  } finally {
    await pool.end();
  }
}

export async function executePrivateStagingCut007Readback({
  event,
  env = process.env,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyPostgresMigrationState,
  runReadback = runPrivateStagingCut007Readback,
} = {}) {
  const approvalId = requiredText(env[PRIVATE_STAGING_CUT007_APPROVAL_ENV], PRIVATE_STAGING_CUT007_APPROVAL_ENV);
  assertDirectInvoke(event, { action: PRIVATE_STAGING_CUT007_READBACK_ACTION, approvalId });
  const { sourceSha, sourceTree, artifactSha, instructionSha } = exactDeploymentAuthority(event, env);
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
