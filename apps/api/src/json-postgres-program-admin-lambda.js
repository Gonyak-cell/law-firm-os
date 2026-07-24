import { createHash } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  prepareJsonPostgresDmsObjectManifest,
  runJsonPostgresDmsObjectMigration,
} from "../../../packages/dms/src/json-postgres-dms-migration.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createS3StorageAdapter } from "../../../packages/dms/src/storage/s3-storage-adapter.js";
import {
  configureHrxProjectionRole,
  HRX_PROJECTION_WRITER_ROLE,
} from "../../../packages/hrx/src/postgres-projection-role.js";
import { runHrxPostgresMigrations } from "../../../packages/hrx/src/postgres-migrations.js";
import { projectHrxRelationalReadModel } from "../../../packages/hrx/src/relational-read-projection.js";
import {
  configureLawosProductionApplicationRole,
  configureLawosRehearsalApplicationRole,
  LAWOS_PRODUCTION_APPLICATION_ROLE,
  LAWOS_REHEARSAL_APPLICATION_ROLE,
} from "../../../packages/persistence/src/postgres/application-role.js";
import { createJsonPostgresAuthorityBundle } from "../../../packages/persistence/src/postgres/authority-bundle.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { runJsonPostgresExecutionMode } from "../../../packages/persistence/src/postgres/migration-executor.js";
import {
  runPostgresMigrations,
  verifyPostgresMigrationState,
} from "../../../packages/persistence/src/postgres/migration-runner.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import {
  runJsonPostgresRehearsalFailureInjection,
  runJsonPostgresRehearsalOwnerSampling,
} from "../../../packages/persistence/src/postgres/rehearsal-runtime-validation.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import {
  claimJsonPostgresProgramInvocation,
  JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
  JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
  JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
  JSON_POSTGRES_JSON_RETIREMENT_ACTION,
  JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
  loadJsonPostgresRetirementInputs,
  loadJsonPostgresMigrationInputs,
  loadJsonPostgresDrRecoveryInputs,
  loadJsonPostgresRehearsalRestoreInputs,
  loadJsonPostgresProjectionInputs,
  loadJsonPostgresProgramAuthorization,
} from "./json-postgres-program-inputs.js";
import { postgresUrlFromSecret } from "./persistence-authority.js";
import { validatePostgresOnlyRuntimeConfiguration } from "./postgres-only-runtime-configuration.js";
import { programEvidenceRetainUntil } from "./program-evidence-retention.js";

const SHA256 = /^[0-9a-f]{64}$/u;
const REHEARSAL_DATABASE_NAME = "lawos_rehearsal";
const REHEARSAL_VALIDATION_KINDS = new Set([
  "failure-injection",
  "owner-sampling",
]);
const SENSITIVE_KEY = /(^|_)(?:password|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_NEGATIVE_BOOLEAN_KEYS = new Set([
  "raw_value_returned",
  "pii_returned",
  "secret_material_returned",
  "dms_bytes_in_evidence",
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function exactDigest(value, label) {
  const digest = requiredText(value, label).toLowerCase();
  if (!SHA256.test(digest)) throw new TypeError(`${label} must be a SHA-256 digest`);
  return digest;
}

function assertEvidenceSafe(value, path = "evidence") {
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) fail("LAWOS_PROGRAM_EVIDENCE", `${path} contains bytes`);
  if (Array.isArray(value)) return value.forEach((item, index) => assertEvidenceSafe(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)
      && !(SAFE_NEGATIVE_BOOLEAN_KEYS.has(key) && item === false)) {
      fail("LAWOS_PROGRAM_EVIDENCE", `${path} contains a sensitive field`);
    }
    assertEvidenceSafe(item, `${path}.${key}`);
  }
}

async function bodyToBuffer(body, expectedByteSize) {
  if (!body) fail("LAWOS_PROGRAM_DMS_SOURCE", "DMS source object has no body");
  let bytes;
  if (typeof body.transformToByteArray === "function") bytes = Buffer.from(await body.transformToByteArray());
  else {
    const chunks = [];
    let size = 0;
    for await (const chunk of body) {
      const value = Buffer.from(chunk);
      size += value.byteLength;
      if (size > expectedByteSize) fail("LAWOS_PROGRAM_DMS_SOURCE", "DMS source object exceeds the approved size");
      chunks.push(value);
    }
    bytes = Buffer.concat(chunks);
  }
  if (bytes.byteLength !== expectedByteSize) fail("LAWOS_PROGRAM_DMS_SOURCE", "DMS source object size drifted");
  return bytes;
}

export async function loadApprovedDmsSourceObject({
  object,
  packet,
  env = process.env,
  client = new S3Client({ region: packet?.target?.aws_region }),
  now = Date.now(),
} = {}) {
  if (object?.source_path != null || !object?.source_object) {
    fail("LAWOS_PROGRAM_DMS_SOURCE", "deployed execution requires an immutable S3 DMS source object");
  }
  const source = object.source_object;
  if (source.bucket !== packet.target.program_input_bucket_name
    || source.expected_bucket_owner !== packet.target.program_input_expected_bucket_owner
    || source.expected_bucket_owner !== packet.target.aws_account) {
    fail("LAWOS_PROGRAM_DMS_SOURCE", "DMS source object drifted from the approved program input target");
  }
  const response = await client.send(new GetObjectCommand({
    Bucket: source.bucket,
    Key: source.key,
    VersionId: source.version_id,
    ExpectedBucketOwner: source.expected_bucket_owner,
    ChecksumMode: "ENABLED",
  }));
  if (response.VersionId !== source.version_id
    || Number(response.ContentLength) !== object.byte_size
    || response.ServerSideEncryption !== "aws:kms"
    || response.SSEKMSKeyId !== requiredText(env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN, "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN")
    || !["GOVERNANCE", "COMPLIANCE"].includes(response.ObjectLockMode)
    || !Number.isFinite(Date.parse(response.ObjectLockRetainUntilDate))
    || Date.parse(response.ObjectLockRetainUntilDate) <= now) {
    fail("LAWOS_PROGRAM_DMS_SOURCE", "DMS source object storage governance drifted");
  }
  const bytes = await bodyToBuffer(response.Body, object.byte_size);
  if (createHash("sha256").update(bytes).digest("hex") !== object.sha256) {
    fail("LAWOS_PROGRAM_DMS_SOURCE", "DMS source object digest drifted");
  }
  return bytes;
}

function structuredApplicationSecret({ current, env, expectedUsername = null }) {
  const username = requiredText(current.username, "application database username");
  if (expectedUsername && username !== expectedUsername) {
    fail("LAWOS_PROGRAM_DATABASE_ROLE", "application database username drifted");
  }
  const value = {
    schema_version: "law-firm-os.postgres-application-secret.v1",
    configuration_state: "ready",
    engine: "postgres",
    host: requiredText(env.LAWOS_DATABASE_HOST, "LAWOS_DATABASE_HOST"),
    port: Number(requiredText(env.LAWOS_DATABASE_PORT, "LAWOS_DATABASE_PORT")),
    dbname: requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME"),
    username,
    password: requiredText(current.password, "application database password"),
  };
  if (!Number.isSafeInteger(value.port) || value.port < 1 || value.port > 65535) throw new TypeError("LAWOS_DATABASE_PORT is invalid");
  return value;
}

export async function ensureJsonPostgresRehearsalDatabase(client, {
  databaseName = REHEARSAL_DATABASE_NAME,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  if (databaseName !== REHEARSAL_DATABASE_NAME) {
    fail("LAWOS_PROGRAM_DATABASE", "private rehearsal database name drifted");
  }
  const existing = await client.query(
    "SELECT datname FROM pg_database WHERE datname = $1",
    [databaseName],
  );
  if (existing.rowCount > 1) {
    fail("LAWOS_PROGRAM_DATABASE", "private rehearsal database catalog is inconsistent");
  }
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE ${REHEARSAL_DATABASE_NAME}`);
  }
  return Object.freeze({
    database_name: databaseName,
    database_created: existing.rowCount === 0,
  });
}

export async function bootstrapJsonPostgresRehearsalDatabase({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
  createPool = createPostgresPool,
  ensureDatabase = ensureJsonPostgresRehearsalDatabase,
  runMigrations = runPostgresMigrations,
  verifyMigrations = verifyPostgresMigrationState,
  configureRole = configureLawosRehearsalApplicationRole,
} = {}) {
  if (event.action !== JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION
    || event.mode !== "preflight") {
    fail("LAWOS_PROGRAM_ACTION", "private rehearsal bootstrap requires its direct preflight action");
  }
  const authorization = await authorize({ event, env });
  if (authorization.packet.phase !== "w12-real-data-rehearsal") {
    fail("LAWOS_PROGRAM_PHASE", "private rehearsal bootstrap requires a W12 packet");
  }
  if (requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME")
    !== REHEARSAL_DATABASE_NAME) {
    fail("LAWOS_PROGRAM_DATABASE", "private rehearsal database target drifted");
  }
  const claimEvidence = await claim({ event, authorization, env });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const [master, application, tenantContext] = await Promise.all([
    resolveSecret({
      secretId: requiredText(
        env.LAWOS_MASTER_DATABASE_SECRET_ID,
        "LAWOS_MASTER_DATABASE_SECRET_ID",
      ),
      region,
    }),
    resolveSecret({
      secretId: requiredText(
        env.LAWOS_APPLICATION_DATABASE_SECRET_ID,
        "LAWOS_APPLICATION_DATABASE_SECRET_ID",
      ),
      region,
    }),
    resolveSecret({
      secretId: requiredText(
        env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
        "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
      ),
      region,
    }),
  ]);
  const applicationSecret = structuredApplicationSecret({
    current: application,
    env,
    expectedUsername: LAWOS_REHEARSAL_APPLICATION_ROLE,
  });
  const adminDatabaseName = requiredText(
    env.LAWOS_ADMIN_DATABASE_NAME,
    "LAWOS_ADMIN_DATABASE_NAME",
  );
  if (adminDatabaseName !== "lawos") {
    fail("LAWOS_PROGRAM_DATABASE", "private rehearsal admin database drifted");
  }
  const masterSecret = (dbname) => JSON.stringify({
    ...master,
    host: env.LAWOS_DATABASE_HOST,
    port: env.LAWOS_DATABASE_PORT,
    dbname,
  });
  const tenantContextSecret = tenantContextValue(tenantContext);
  const adminPool = createPool({
    connectionString: postgresUrlFromSecret(masterSecret(adminDatabaseName)),
    sslMode: "verify-full",
    applicationName: "lawos-private-rehearsal-database-create",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let database;
  try {
    const client = await adminPool.connect();
    try {
      database = await ensureDatabase(client, {
        databaseName: REHEARSAL_DATABASE_NAME,
      });
    } finally {
      client.release();
    }
  } finally {
    await adminPool.end();
  }
  const rehearsalPool = createPool({
    connectionString: postgresUrlFromSecret(masterSecret(REHEARSAL_DATABASE_NAME)),
    sslMode: "verify-full",
    applicationName: "lawos-private-rehearsal-admin-bootstrap",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let migrations;
  let role;
  try {
    migrations = await runMigrations(rehearsalPool, {
      appliedBy: `lawos-w12:${authorization.exact.sourceSha}`,
    });
    const client = await rehearsalPool.connect();
    try {
      role = await configureRole(client, {
        password: applicationSecret.password,
        tenantContextSecret,
        approvedTenantIds: authorization.packet.target.approved_tenant_ids,
      });
    } finally {
      client.release();
    }
    await verifyMigrations(rehearsalPool);
    const writer = putSecret ?? (async ({ secretId, secretString }) => {
      const client = new SecretsManagerClient({ region });
      try {
        await client.send(new PutSecretValueCommand({
          SecretId: secretId,
          SecretString: secretString,
        }));
      } finally {
        client.destroy();
      }
    });
    await writer({
      secretId: requiredText(
        env.LAWOS_APPLICATION_DATABASE_SECRET_ID,
        "LAWOS_APPLICATION_DATABASE_SECRET_ID",
      ),
      secretString: JSON.stringify(applicationSecret),
    });
  } finally {
    await rehearsalPool.end();
  }
  return Object.freeze({
    outcome: "PASS",
    action: JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
    phase: authorization.packet.phase,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    rehearsal_database_created_count: database.database_created ? 1 : 0,
    rehearsal_database_ready_count: 1,
    migration_count: migrations.length,
    migration_applied_count: migrations.filter((item) => item.applied).length,
    application_role_grant_count: role.grant_statement_count,
    approved_tenant_count: role.tenant_authority_count,
    synthetic_wildcard_count: role.synthetic_wildcard_count,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    production_data_write_count: 0,
    external_email_send_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
    authorization_claim_sha256: claimEvidence.claim_sha256,
  });
}

function structuredProjectionSecret({ current, env }) {
  const username = requiredText(current.username, "projection database username");
  if (username !== HRX_PROJECTION_WRITER_ROLE) {
    fail("LAWOS_HRX_PROJECTION_SECRET", "projection database username drifted");
  }
  const value = {
    schema_version: "law-firm-os.hrx-projection-database-secret.v1",
    configuration_state: "ready",
    engine: "postgres",
    host: requiredText(env.LAWOS_DATABASE_HOST, "LAWOS_DATABASE_HOST"),
    port: Number(requiredText(env.LAWOS_DATABASE_PORT, "LAWOS_DATABASE_PORT")),
    dbname: requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME"),
    username,
    password: requiredText(current.password, "projection database password"),
  };
  if (!Number.isSafeInteger(value.port) || value.port < 1 || value.port > 65535) {
    throw new TypeError("LAWOS_DATABASE_PORT is invalid");
  }
  return value;
}

function tenantContextValue(secret) {
  const value = requiredText(
    secret.tenant_context_secret ?? secret.TENANT_CONTEXT_SECRET,
    "tenant context secret",
  );
  if (Buffer.byteLength(value, "utf8") < 32) throw new TypeError("tenant context secret must contain at least 32 bytes");
  return value;
}

export async function writeJsonPostgresProgramEvidence({
  kind,
  value,
  event,
  authorization,
  env = process.env,
  client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  now = Date.now(),
} = {}) {
  assertEvidenceSafe(value);
  const body = Buffer.from(`${canonicalizeJson(value)}\n`);
  const sha256 = createHash("sha256").update(body).digest("hex");
  const safeKind = requiredText(kind, "evidence kind").replace(/[^a-z0-9-]/gu, "-").slice(0, 64);
  const safeAttempt = requiredText(event.attempt_ref, "attempt_ref").replace(/[^A-Za-z0-9._:-]/gu, "-").slice(0, 200);
  await client.send(new PutObjectCommand({
    Bucket: requiredText(env.LAWOS_APPROVAL_AUDIT_BUCKET, "LAWOS_APPROVAL_AUDIT_BUCKET"),
    Key: `program-execution/${authorization.packet.packet_sha256}/${safeAttempt}/${safeKind}-${sha256}.json`,
    Body: body,
    ContentType: "application/json",
    IfNoneMatch: "*",
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: requiredText(env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN, "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN"),
    ObjectLockMode: "COMPLIANCE",
    ObjectLockRetainUntilDate: programEvidenceRetainUntil({
      approvalExpiresAt: authorization.approval.expires_at,
      now,
    }),
  }));
  return Object.freeze({ sha256, byte_size: body.byteLength });
}

export async function bootstrapJsonPostgresProductionDatabase({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
  createPool = createPostgresPool,
  runMigrations = runPostgresMigrations,
  verifyMigrations = verifyPostgresMigrationState,
  configureRole = configureLawosProductionApplicationRole,
} = {}) {
  if (event.action !== JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION || event.mode !== "preflight") {
    fail("LAWOS_PROGRAM_ACTION", "production bootstrap requires its direct preflight action");
  }
  const authorization = await authorize({ event, env });
  if (authorization.packet.phase !== "w13-production-cutover") fail("LAWOS_PROGRAM_PHASE", "production bootstrap requires a W13 packet");
  const claimEvidence = await claim({ event, authorization, env });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const [master, application, tenantContext] = await Promise.all([
    resolveSecret({ secretId: requiredText(env.LAWOS_MASTER_DATABASE_SECRET_ID, "LAWOS_MASTER_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
    resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
  ]);
  const applicationSecret = structuredApplicationSecret({
    current: application,
    env,
    expectedUsername: LAWOS_PRODUCTION_APPLICATION_ROLE,
  });
  const masterConnectionString = postgresUrlFromSecret(JSON.stringify({
    ...master,
    host: env.LAWOS_DATABASE_HOST,
    port: env.LAWOS_DATABASE_PORT,
    dbname: env.LAWOS_DATABASE_NAME,
  }));
  const tenantContextSecret = tenantContextValue(tenantContext);
  const pool = createPool({
    connectionString: masterConnectionString,
    sslMode: "verify-full",
    applicationName: "lawos-production-admin-bootstrap",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let migrations;
  let role;
  try {
    migrations = await runMigrations(pool, { appliedBy: `lawos-production:${authorization.exact.sourceSha}` });
    const client = await pool.connect();
    try {
      role = await configureRole(client, {
        password: applicationSecret.password,
        tenantContextSecret,
        approvedTenantIds: authorization.packet.target.approved_tenant_ids,
      });
    } finally {
      client.release();
    }
    await verifyMigrations(pool);
    const writer = putSecret ?? (async ({ secretId, secretString }) => {
      const client = new SecretsManagerClient({ region });
      try {
        await client.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: secretString }));
      } finally {
        client.destroy();
      }
    });
    await writer({
      secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"),
      secretString: JSON.stringify(applicationSecret),
    });
  } finally {
    await pool.end();
  }
  return Object.freeze({
    outcome: "PASS",
    action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
    phase: authorization.packet.phase,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    migration_count: migrations.length,
    migration_applied_count: migrations.filter((item) => item.applied).length,
    application_role_grant_count: role.grant_statement_count,
    approved_tenant_count: role.tenant_authority_count,
    synthetic_wildcard_count: role.synthetic_wildcard_count,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    production_data_write_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
    authorization_claim_sha256: claimEvidence.claim_sha256,
  });
}

export async function executeJsonPostgresProgram({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  loadInputs = loadJsonPostgresMigrationInputs,
  loadDrInputs = loadJsonPostgresDrRecoveryInputs,
  loadRehearsalRestoreInputs =
    loadJsonPostgresRehearsalRestoreInputs,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  createAuthorityBundle = createJsonPostgresAuthorityBundle,
  prepareDmsManifest = prepareJsonPostgresDmsObjectManifest,
  createDmsStorage = createS3StorageAdapter,
  createDmsRuntime = createPostgresDmsUploadRuntime,
  runDms = runJsonPostgresDmsObjectMigration,
  runExecution = runJsonPostgresExecutionMode,
  runFailureInjection = runJsonPostgresRehearsalFailureInjection,
  runOwnerSampling = runJsonPostgresRehearsalOwnerSampling,
  verifyMigrations = verifyPostgresMigrationState,
  writeEvidence = writeJsonPostgresProgramEvidence,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
} = {}) {
  if (event.action !== JSON_POSTGRES_PROGRAM_ADMIN_ACTION) fail("LAWOS_PROGRAM_ACTION", "program execution action is invalid");
  const authorization = await authorize({ event, env, s3Client });
  const rehearsalValidationKind = event.rehearsal_validation_kind ?? null;
  if (rehearsalValidationKind != null
    && (!REHEARSAL_VALIDATION_KINDS.has(rehearsalValidationKind)
      || authorization.packet.phase !== "w12-real-data-rehearsal"
      || event.stage !== `w12-${rehearsalValidationKind}`
      || event.mode !== "readback")) {
    fail(
      "LAWOS_PROGRAM_REHEARSAL_VALIDATION_SCOPE",
      "rehearsal validation is limited to an exact W12 readback stage",
    );
  }
  const drRecoveryRequested = event.dr_recovery != null;
  const rehearsalRestoreRequested = event.rehearsal_restore != null;
  if (drRecoveryRequested && rehearsalRestoreRequested) {
    fail(
      "LAWOS_PROGRAM_DR_SCOPE",
      "one isolated restore target may be selected per invocation",
    );
  }
  if (drRecoveryRequested
    && (authorization.packet.phase !== "w13-production-cutover"
      || event.stage !== "cut-010"
      || !["readback", "reconcile"].includes(event.mode))) {
    fail("LAWOS_PROGRAM_DR_SCOPE", "DR recovery is limited to CUT-010 readback and reconciliation");
  }
  if (rehearsalRestoreRequested
    && (authorization.packet.phase !== "w12-real-data-rehearsal"
      || event.stage !== "w12-restore"
      || !["readback", "reconcile"].includes(event.mode))) {
    fail(
      "LAWOS_PROGRAM_DR_SCOPE",
      "W12 restore is limited to rehearsal readback and reconciliation",
    );
  }
  const claimEvidence = await claim({ event, authorization, env, client: s3Client });
  const inputs = await loadInputs({
    inputLocators: event.inputs,
    mode: event.mode,
    trustRegistry: authorization.trustRegistry,
    packet: authorization.packet,
    env,
    s3Client,
  });
  const drRecovery = drRecoveryRequested
    ? await loadDrInputs({
      inputLocators: event.dr_recovery,
      packet: authorization.packet,
      env,
      s3Client,
    })
    : null;
  const rehearsalRestore = rehearsalRestoreRequested
    ? await loadRehearsalRestoreInputs({
      inputLocators: event.rehearsal_restore,
      packet: authorization.packet,
      env,
      s3Client,
    })
    : null;
  if (drRecovery) {
    const cut009 = inputs.predecessors.find((item) => item.receipt_kind === "cut-009");
    if (!cut009
      || cut009.execution_state !== "PASS"
      || cut009.canonical_sha256 !== drRecovery.drTarget.cut009_receipt_sha256) {
      fail("LAWOS_PROGRAM_DR_PREDECESSOR", "DR recovery requires the exact CUT-009 PASS receipt");
    }
  }
  let authorityBundle = inputs.authorityBundle;
  let dmsManifest = null;
  if (event.mode !== "preflight") {
    authorityBundle = await createAuthorityBundle({
      inventory: inputs.inventory,
      decisions: inputs.decisions,
      recordAuthority: inputs.recordAuthority,
      recordTypeCatalog: inputs.recordTypeCatalog,
      corpus: inputs.corpus,
      sourceTransformResult: inputs.sourceTransformResult,
    });
    dmsManifest = prepareDmsManifest(inputs.dmsManifest);
    if (dmsManifest.manifest_sha256 !== authorization.packet.bindings.dms_object_manifest_sha256
      || dmsManifest.authority_manifest_sha256 !== authorityBundle.summary.authority_manifest_sha256) {
      fail("LAWOS_PROGRAM_DMS_BINDING", "DMS manifest drifted from the execution packet");
    }
  }
  const needsDatabase = ["commit", "resume", "readback", "reconcile"].includes(event.mode);
  let pool = null;
  let dmsStorage = null;
  let dmsRuntime = null;
  if (needsDatabase) {
    const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
    const [application, tenantContext] = await Promise.all([
      resolveSecret({ secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"), region }),
      resolveSecret({ secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"), region }),
    ]);
    if (application.configuration_state !== "ready") fail("LAWOS_PROGRAM_DATABASE", "application database secret is not bootstrapped");
    const isolatedRestore = drRecovery ?? rehearsalRestore;
    const isolatedRestoreTarget = drRecovery?.drTarget
      ?? rehearsalRestore?.restoreTarget;
    const databaseConnection = isolatedRestore
      ? {
        ...application,
        host: isolatedRestoreTarget.endpoint_address,
        port: isolatedRestoreTarget.endpoint_port,
        dbname: isolatedRestoreTarget.database_name,
      }
      : application;
    pool = createPool({
      connectionString: postgresUrlFromSecret(JSON.stringify(databaseConnection)),
      sslMode: "verify-full",
      tenantContextSecret: tenantContextValue(tenantContext),
      applicationName: rehearsalRestore
        ? `lawos-json-postgres-w12-restore-${event.mode}`
        : drRecovery
          ? `lawos-json-postgres-dr-${event.mode}`
        : `lawos-json-postgres-${event.mode}`,
      connectionTimeoutMillis: 10_000,
      statementTimeoutMillis: 120_000,
      max: 2,
    });
    await verifyMigrations(pool);
    dmsStorage = createDmsStorage({
      adapter_id: authorization.packet.phase === "w13-production-cutover" ? "lawos-production-s3" : "lawos-rehearsal-s3",
      credential_ref: "aws-runtime-role",
      bucket: authorization.packet.target.dms_bucket_name,
      expected_bucket_owner: authorization.packet.target.dms_expected_bucket_owner,
      region: authorization.packet.target.aws_region,
      prefix: authorization.packet.target.dms_prefix,
      kms_key_id: authorization.packet.target.dms_kms_key_ref,
      object_lock_enabled: true,
      default_retention_days: authorization.packet.target.dms_default_retention_days,
    });
    dmsRuntime = createDmsRuntime({ pool, storage: dmsStorage });
  }
  let checkpointIndex = 0;
  let dmsCheckpointIndex = 0;
  const dmsRunner = event.mode === "preflight" ? null : async ({ mode }) => runDms({
    manifest: dmsManifest,
    mode: mode === "stage" ? "dry-run" : mode === "commit" ? "import" : mode,
    runtime: dmsRuntime,
    storage: dmsStorage,
    checkpoint: inputs.dmsCheckpoint,
    negativeTenantId: event.negative_tenant_id ?? null,
    loadBytes: async (object) => loadApprovedDmsSourceObject({
      object,
      packet: authorization.packet,
      env,
      client: s3Client,
    }),
    onCheckpoint: async (checkpoint) => {
      dmsCheckpointIndex += 1;
      await writeEvidence({
        kind: `dms-checkpoint-${String(dmsCheckpointIndex).padStart(4, "0")}`,
        value: checkpoint,
        event,
        authorization,
        env,
        client: s3Client,
      });
    },
  });
  let result;
  let rehearsalValidation = null;
  try {
    result = await runExecution({
      packet: authorization.packet,
      approval: authorization.approval,
      authorityBundle,
      corpus: inputs.corpus,
      mode: event.mode,
      pool,
      negativeTenantId: event.negative_tenant_id ?? null,
      checkpoint: inputs.checkpoint,
      onCheckpoint: async (checkpoint) => {
        checkpointIndex += 1;
        await writeEvidence({
          kind: `checkpoint-${String(checkpointIndex).padStart(4, "0")}`,
          value: checkpoint,
          event,
          authorization,
          env,
          client: s3Client,
        });
      },
      predecessors: inputs.predecessors,
      dmsRunner,
    });
    if (rehearsalValidationKind === "failure-injection") {
      rehearsalValidation = await runFailureInjection({
        pool,
        tenantId: inputs.corpus.tenant_id,
        negativeTenantId: event.negative_tenant_id,
        probeRef: event.attempt_ref,
      });
    } else if (rehearsalValidationKind === "owner-sampling") {
      rehearsalValidation = await runOwnerSampling({
        pool,
        corpus: inputs.corpus,
        packetSha256: authorization.packet.packet_sha256,
      });
    }
  } finally {
    await pool?.end();
  }
  const evidence = await writeEvidence({
    kind: "execution-result",
    value: result,
    event,
    authorization,
    env,
    client: s3Client,
  });
  const drEvidence = drRecovery
    ? await writeEvidence({
      kind: `cut-010-dr-${event.mode}`,
      value: {
        schema_version: "law-firm-os.json-postgres-dr-readback-result.v1",
        outcome: result.outcome,
        mode: result.mode,
        source_sha: result.source_sha,
        source_tree: result.source_tree,
        packet_sha256: result.packet_sha256,
        dr_target_sha256: drRecovery.target.dr_target_sha256,
        performance_acceptance_sha256: drRecovery.acceptance.acceptance_sha256,
        migration_result_sha256: drRecovery.drTarget.migration_result_sha256,
        rpo_ms: drRecovery.target.rpo_ms,
        rto_ms: drRecovery.target.rto_ms,
        rpo_target_met: true,
        rto_target_met: true,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
      event,
      authorization,
      env,
      client: s3Client,
    })
    : null;
  const rehearsalRestoreEvidence = rehearsalRestore
    ? await writeEvidence({
      kind: `w12-restore-${event.mode}`,
      value: {
        schema_version:
          "law-firm-os.json-postgres-rehearsal-restore-readback-result.v1",
        outcome: result.outcome,
        mode: result.mode,
        source_sha: result.source_sha,
        source_tree: result.source_tree,
        packet_sha256: result.packet_sha256,
        restore_target_sha256:
          rehearsalRestore.target.restore_target_sha256,
        performance_acceptance_sha256:
          rehearsalRestore.acceptance.acceptance_sha256,
        migration_result_sha256:
          rehearsalRestore.restoreTarget.migration_result_sha256,
        rpo_ms: rehearsalRestore.target.rpo_ms,
        rto_ms: rehearsalRestore.target.rto_ms,
        rpo_target_met: true,
        rto_target_met: true,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
      event,
      authorization,
      env,
      client: s3Client,
    })
    : null;
  const rehearsalValidationEvidence = rehearsalValidation
    ? await writeEvidence({
      kind: `w12-${rehearsalValidationKind}`,
      value: rehearsalValidation,
      event,
      authorization,
      env,
      client: s3Client,
    })
    : null;
  return Object.freeze({
    outcome: result.outcome,
    action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
    phase: result.phase,
    mode: result.mode,
    source_sha: result.source_sha,
    source_tree: result.source_tree,
    packet_sha256: result.packet_sha256,
    result_sha256: result.result_sha256,
    execution_evidence_sha256: evidence.sha256,
    ...(drEvidence ? {
      dr_target_sha256: drRecovery.target.dr_target_sha256,
      dr_evidence_sha256: drEvidence.sha256,
      rpo_ms: drRecovery.target.rpo_ms,
      rto_ms: drRecovery.target.rto_ms,
    } : {}),
    ...(rehearsalRestore ? {
      rehearsal_restore_target_sha256:
        rehearsalRestore.target.restore_target_sha256,
      rehearsal_restore_evidence_sha256:
        rehearsalRestoreEvidence.sha256,
      rpo_ms: rehearsalRestore.target.rpo_ms,
      rto_ms: rehearsalRestore.target.rto_ms,
    } : {}),
    ...(rehearsalValidation ? {
      rehearsal_validation_kind: rehearsalValidationKind,
      rehearsal_validation_result_sha256:
        rehearsalValidation.result_sha256,
      rehearsal_validation_evidence_sha256:
        rehearsalValidationEvidence.sha256,
    } : {}),
    first_write_state: result.first_write_state,
    safe_counts: result.safe_counts,
    performance: result.performance,
    claims: result.claims,
    approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
    authorization_claim_sha256: claimEvidence.claim_sha256,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
}

function unapprovedProjectionTenant(approvedTenantIds) {
  const preferred = "tenant_unapproved_projection_probe";
  if (!approvedTenantIds.includes(preferred)) return preferred;
  return `tenant_unapproved_${createHash("sha256").update(approvedTenantIds.join("\n")).digest("hex").slice(0, 16)}`;
}

export async function executeJsonPostgresRelationalProjection({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  loadInputs = loadJsonPostgresProjectionInputs,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
  createPool = createPostgresPool,
  runMigrations = runHrxPostgresMigrations,
  configureRole = configureHrxProjectionRole,
  verifyMigrations = verifyPostgresMigrationState,
  project = projectHrxRelationalReadModel,
  writeEvidence = writeJsonPostgresProgramEvidence,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
} = {}) {
  if (event.action !== JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION
    || !["commit", "resume"].includes(event.mode)) {
    fail("LAWOS_PROGRAM_ACTION", "relational projection requires a direct commit or resume action");
  }
  const authorization = await authorize({ event, env, s3Client });
  if (authorization.packet.phase !== "w15-relational-projection") {
    fail("LAWOS_PROGRAM_PHASE", "relational projection requires a W15 packet");
  }
  const claimEvidence = await claim({ event, authorization, env, client: s3Client });
  const inputs = await loadInputs({
    inputLocators: event.inputs,
    trustRegistry: authorization.trustRegistry,
    packet: authorization.packet,
    env,
    s3Client,
  });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const [master, projection, tenantContext] = await Promise.all([
    resolveSecret({
      secretId: requiredText(env.LAWOS_MASTER_DATABASE_SECRET_ID, "LAWOS_MASTER_DATABASE_SECRET_ID"),
      region,
    }),
    resolveSecret({
      secretId: requiredText(env.LAWOS_PROJECTION_DATABASE_SECRET_ID, "LAWOS_PROJECTION_DATABASE_SECRET_ID"),
      region,
    }),
    resolveSecret({
      secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"),
      region,
    }),
  ]);
  const projectionSecret = structuredProjectionSecret({ current: projection, env });
  const tenantContextSecret = tenantContextValue(tenantContext);
  const masterConnectionString = postgresUrlFromSecret(JSON.stringify({
    ...master,
    host: env.LAWOS_DATABASE_HOST,
    port: env.LAWOS_DATABASE_PORT,
    dbname: env.LAWOS_DATABASE_NAME,
  }));
  const masterPool = createPool({
    connectionString: masterConnectionString,
    sslMode: "verify-full",
    applicationName: "lawos-hrx-projection-admin",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let migrations;
  let role;
  try {
    migrations = await runMigrations(masterPool, {
      appliedBy: `lawos-w15:${authorization.exact.sourceSha}`,
    });
    const client = await masterPool.connect();
    try {
      role = await configureRole(client, {
        password: projectionSecret.password,
        tenantContextSecret,
        approvedTenantIds: authorization.packet.target.approved_tenant_ids,
      });
    } finally {
      client.release();
    }
    const writer = putSecret ?? (async ({ secretId, secretString }) => {
      const client = new SecretsManagerClient({ region });
      try {
        await client.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: secretString }));
      } finally {
        client.destroy();
      }
    });
    await writer({
      secretId: requiredText(env.LAWOS_PROJECTION_DATABASE_SECRET_ID, "LAWOS_PROJECTION_DATABASE_SECRET_ID"),
      secretString: JSON.stringify(projectionSecret),
    });
  } finally {
    await masterPool.end();
  }
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(projectionSecret)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: "lawos-hrx-relational-projection",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 2,
  });
  const approvedTenantIds = authorization.packet.target.approved_tenant_ids;
  const negativeTenantId = unapprovedProjectionTenant(approvedTenantIds);
  const projectionMode = event.mode === "commit" ? "backfill" : "incremental";
  const projected = [];
  try {
    await verifyMigrations(pool);
    for (const tenantId of approvedTenantIds) {
      projected.push(await project({
        pool,
        tenant_id: tenantId,
        mode: projectionMode,
        negativeTenantId,
      }));
    }
  } finally {
    await pool.end();
  }
  if (projected.some((item) =>
    item.outcome !== "PASS"
    || item.claims?.one_way_projection !== true
    || item.claims?.operational_request_dual_write !== false
    || item.claims?.generic_ledger_authority_preserved !== true
    || item.claims?.projection_write_authority !== false
    || item.safe_counts?.tenant_negative_visible_count !== 0
    || item.safe_counts?.source_authority_write_count !== 0
    || item.safe_counts?.dual_write_count !== 0
    || item.safe_counts?.partial_commit_count !== 0)) {
    fail("LAWOS_HRX_PROJECTION_GATE", "relational projection result violated the one-way authority gate");
  }
  const sum = (key) => projected.reduce((total, item) => total + Number(item.safe_counts?.[key] ?? 0), 0);
  const material = {
    schema_version: "law-firm-os.hrx-relational-projection-execution.v1",
    outcome: "PASS",
    action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
    phase: authorization.packet.phase,
    mode: projectionMode,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    predecessor_receipt_count: inputs.predecessors.length,
    migration_count: migrations.length,
    migration_applied_count: migrations.filter((item) => item.applied).length,
    projection_role_grant_count: role.grant_statement_count,
    safe_counts: {
      approved_tenant_count: approvedTenantIds.length,
      source_record_count: sum("source_record_count"),
      projected_insert_count: sum("projected_insert_count"),
      projected_update_count: sum("projected_update_count"),
      projected_noop_count: sum("projected_noop_count"),
      consumed_outbox_event_count: sum("consumed_outbox_event_count"),
      tenant_negative_visible_count: sum("tenant_negative_visible_count"),
      negative_tenant_context_denied_count: sum("negative_tenant_context_denied_count"),
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
      consumer_write_grant_count: role.consumer_write_grant_count,
      authority_promotion_count: 0,
    },
    claims: {
      one_way_projection: true,
      operational_request_dual_write: false,
      generic_ledger_authority_preserved: true,
      projection_write_authority: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = Object.freeze({
    ...material,
    result_sha256: createHash("sha256").update(canonicalizeJson(material)).digest("hex"),
  });
  const evidence = await writeEvidence({
    kind: "w15-relational-projection-result",
    value: result,
    event,
    authorization,
    env,
    client: s3Client,
  });
  return Object.freeze({
    ...result,
    execution_evidence_sha256: evidence.sha256,
    approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
    authorization_claim_sha256: claimEvidence.claim_sha256,
  });
}

function retirementNegativeTenant(approved) {
  const candidate = "tenant_lawos_retirement_negative";
  return approved.includes(candidate)
    ? `tenant_lawos_retirement_${createHash("sha256").update(approved.join("\n")).digest("hex").slice(0, 16)}`
    : candidate;
}

export async function executeJsonPostgresRetirementSmoke({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  loadInputs = loadJsonPostgresRetirementInputs,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  createLedger = createPostgresDomainLedger,
  verifyMigrations = verifyPostgresMigrationState,
  writeEvidence = writeJsonPostgresProgramEvidence,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
} = {}) {
  if (event.action !== JSON_POSTGRES_JSON_RETIREMENT_ACTION
    || event.stage !== "cut-011"
    || event.mode !== "commit"
    || !["warm", "cold"].includes(event.startup_kind)) {
    fail("LAWOS_PROGRAM_ACTION", "JSON retirement requires a CUT-011 warm or cold commit smoke");
  }
  const runtimeGeneration = Number(env.LAWOS_RUNTIME_GENERATION);
  if (!Number.isSafeInteger(runtimeGeneration)
    || runtimeGeneration < 1
    || event.runtime_generation !== runtimeGeneration) {
    fail("LAWOS_PROGRAM_RUNTIME_GENERATION", "JSON retirement runtime generation drifted");
  }
  const logStream = requiredText(
    env.AWS_LAMBDA_LOG_STREAM_NAME,
    "AWS_LAMBDA_LOG_STREAM_NAME",
  );
  const authorization = await authorize({ event, env, s3Client });
  if (authorization.packet.phase !== "w13-production-cutover") {
    fail("LAWOS_PROGRAM_PHASE", "JSON retirement requires a W13 packet");
  }
  const claimEvidence = await claim({ event, authorization, env, client: s3Client });
  const inputs = await loadInputs({
    inputLocators: event.retirement,
    trustRegistry: authorization.trustRegistry,
    packet: authorization.packet,
    env,
    s3Client,
  });
  const configuration = validatePostgresOnlyRuntimeConfiguration({
    env,
    artifactRuntimeStoreEntryCount:
      inputs.deploymentManifest.artifact_runtime_store_entry_count,
    artifactRealJsonStoreCount:
      inputs.deploymentManifest.artifact_real_json_store_count,
    fileCurrentInitializedCount: 0,
    coldStartObserved: true,
  });
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const [application, tenantContext] = await Promise.all([
    resolveSecret({
      secretId: requiredText(env.LAWOS_APPLICATION_DATABASE_SECRET_ID, "LAWOS_APPLICATION_DATABASE_SECRET_ID"),
      region,
    }),
    resolveSecret({
      secretId: requiredText(env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID, "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID"),
      region,
    }),
  ]);
  if (application.configuration_state !== "ready") {
    fail("LAWOS_PROGRAM_DATABASE", "application database secret is not bootstrapped");
  }
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(application)),
    sslMode: "verify-full",
    tenantContextSecret: tenantContextValue(tenantContext),
    applicationName: `lawos-json-retirement-${event.startup_kind}`,
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  const tenantId = authorization.packet.target.approved_tenant_ids[0];
  const recordId = `cut011-${authorization.packet.packet_sha256.slice(0, 24)}`;
  const idempotencyKey = `lawos-cut011:${authorization.packet.packet_sha256}`;
  const eventId = `lawos-cut011-${authorization.packet.packet_sha256.slice(0, 24)}`;
  let transactionResult;
  let negativeVisible;
  try {
    await verifyMigrations(pool);
    const ledger = createLedger({ pool });
    transactionResult = await ledger.transaction({
      tenant_id: tenantId,
      domain_id: "master-data",
    }, async (tx) => {
      const claimed = await tx.claimIdempotency({
        key: idempotencyKey,
        request_hash: hashDomainValue({
          action: "json-authority-retirement-smoke",
          record_id: recordId,
          packet_sha256: authorization.packet.packet_sha256,
        }),
        response: { accepted: true, authority: "postgres-v2" },
      });
      let record;
      let audit;
      let outbox;
      if (claimed.replayed) {
        record = await tx.read({
          record_type: "OperationalAuthoritySmoke",
          record_id: recordId,
        });
        audit = (await tx.listAudit({ object_id: recordId }))
          .find((item) => item.event_id === eventId);
        outbox = (await tx.listOutbox())
          .find((item) => item.event_id === eventId);
      } else {
        record = await tx.write({
          expected_version: 0,
          record_type: "OperationalAuthoritySmoke",
          record_id: recordId,
          unique_key: idempotencyKey,
          payload: {
            model_type: "OperationalAuthoritySmoke",
            authority: "postgres-v2",
            source_sha: authorization.exact.sourceSha,
          },
        });
        audit = await tx.appendAudit({
          event_id: eventId,
          event_type: "runtime_safety.json_authority_retirement_smoke",
          actor_id: "lawos-production-cut011",
          object_type: "OperationalAuthoritySmoke",
          object_id: recordId,
          payload: { authority: "postgres-v2" },
        });
        outbox = (await tx.enqueueOutbox({
          event_id: eventId,
          topic: "lawos.runtime.json-authority-retired",
          aggregate_type: "OperationalAuthoritySmoke",
          aggregate_id: recordId,
          payload: { authority: "postgres-v2" },
        })).event;
      }
      if (!record || !audit || !outbox) {
        fail("LAWOS_PROGRAM_RETIREMENT_SMOKE", "PostgreSQL read/write/audit/outbox smoke is incomplete");
      }
      return Object.freeze({
        replayed: claimed.replayed,
        state_version: record.state_version,
        audit_event_present: true,
        outbox_event_present: true,
      });
    });
    negativeVisible = await ledger.transaction({
      tenant_id: retirementNegativeTenant(authorization.packet.target.approved_tenant_ids),
      domain_id: "master-data",
    }, (tx) => tx.read({
      record_type: "OperationalAuthoritySmoke",
      record_id: recordId,
    }));
  } finally {
    await pool.end();
  }
  if (negativeVisible !== undefined && negativeVisible !== null) {
    fail("LAWOS_PROGRAM_RETIREMENT_TENANT", "retirement smoke record is visible to a wrong tenant");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-json-retirement-smoke.v1",
    outcome: "PASS",
    action: JSON_POSTGRES_JSON_RETIREMENT_ACTION,
    stage: "cut-011",
    startup_kind: event.startup_kind,
    runtime_generation: runtimeGeneration,
    runtime_log_stream_sha256: createHash("sha256").update(logStream).digest("hex"),
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    predecessor_receipt_count: inputs.predecessors.length,
    safe_counts: {
      postgres_record_count: 1,
      postgres_audit_event_count: 1,
      postgres_outbox_event_count: 1,
      idempotent_replay_count: transactionResult.replayed ? 1 : 0,
      tenant_negative_visible_count: 0,
      operational_json_path_count: configuration.populated_store_path_key_count,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
    },
    claims: {
      postgres_only_authority: true,
      legacy_json_immutable_only: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = Object.freeze({
    ...material,
    result_sha256: createHash("sha256").update(canonicalizeJson(material)).digest("hex"),
  });
  const evidence = await writeEvidence({
    kind: `cut-011-${event.startup_kind}`,
    value: result,
    event,
    authorization,
    env,
    client: s3Client,
  });
  return Object.freeze({
    ...result,
    execution_evidence_sha256: evidence.sha256,
    approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
    authorization_claim_sha256: claimEvidence.claim_sha256,
  });
}

export async function handler(event = {}) {
  try {
    if (event.action === JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION) {
      return await bootstrapJsonPostgresRehearsalDatabase({ event });
    }
    if (event.action === JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION) {
      return await bootstrapJsonPostgresProductionDatabase({ event });
    }
    if (event.action === JSON_POSTGRES_PROGRAM_ADMIN_ACTION) {
      return await executeJsonPostgresProgram({ event });
    }
    if (event.action === JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION) {
      return await executeJsonPostgresRelationalProjection({ event });
    }
    if (event.action === JSON_POSTGRES_JSON_RETIREMENT_ACTION) {
      return await executeJsonPostgresRetirementSmoke({ event });
    }
    throw Object.assign(new Error("unsupported program administration action"), { code: "LAWOS_PROGRAM_ACTION" });
  } catch (error) {
    return Object.freeze({
      outcome: "BLOCKED",
      action: [
        JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
        JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
        JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
        JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        JSON_POSTGRES_JSON_RETIREMENT_ACTION,
      ].includes(event.action)
        ? event.action
        : "unsupported-program-action",
      safe_error_code: String(error?.code ?? "LAWOS_PROGRAM_EXECUTION_FAILED").replace(/[^A-Z0-9_]/gu, "_").slice(0, 96),
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    });
  }
}
