import { createHash } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  GetSecretValueCommand,
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
  HRX_PROJECTION_AUDITOR_ROLE,
  HRX_PROJECTION_WRITER_ROLE,
} from "../../../packages/hrx/src/postgres-projection-role.js";
import {
  runHrxPostgresMigrations,
} from "../../../packages/hrx/src/postgres-migrations.js";
import { projectHrxRelationalReadModel } from "../../../packages/hrx/src/relational-read-projection.js";
import {
  collectHrxRelationalProductionInventory,
  validateHrxRelationalReadModel,
} from "../../../packages/hrx/src/relational-projection-validation.js";
import {
  inspectHrxRelationalSchema,
} from "../../../packages/hrx/src/relational-projection-contract.js";
import {
  activateHrxProjectionConsumerRoute,
  disableHrxProjectionConsumerRoutes,
  HRX_RELATIONAL_QUERY_FAMILIES,
  refreshHrxProjectionConsumerRoutes,
} from "../../../packages/hrx/src/relational-projection-reader.js";
import {
  configureLawosRehearsalApplicationRole,
  LAWOS_REHEARSAL_APPLICATION_ROLE,
} from "../../../packages/persistence/src/postgres/application-role.js";
import {
  LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
  LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
  LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
  LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
  assertLawosOutlookRoleBootstrapReceipt,
} from "../../../packages/persistence/src/postgres/outlook-authority-roles.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { createJsonPostgresAuthorityBundle } from "../../../packages/persistence/src/postgres/authority-bundle.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { runJsonPostgresExecutionMode } from "../../../packages/persistence/src/postgres/migration-executor.js";
import {
  assertOutlookAuthorityMigrationFailureReceipt,
  assertOutlookAuthorityMigrationRunReceipt,
  runPostgresMigrations,
  verifyPostgresMigrationState,
} from "../../../packages/persistence/src/postgres/migration-runner.js";
import {
  normalizeClientOperationsMigrationCatalog,
  selectClientOperationsMigrationReadback,
  selectClientOperationsMigrationTarget,
  runClientOperationsPostgresMigrations,
  verifyClientOperationsMigrationReadback,
  verifyClientOperationsPostgresMigrations,
} from "./client-operations-schema.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import {
  validateJsonPostgresDatabaseTargetReceiptBinding,
} from "../../../packages/persistence/src/postgres/database-target-receipt.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import {
  runJsonPostgresRehearsalFailureInjection,
  runJsonPostgresRehearsalOwnerSampling,
} from "../../../packages/persistence/src/postgres/rehearsal-runtime-validation.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  createJsonPostgresW15InventoryProvenance,
} from "../../../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import {
  assertJsonPostgresOutlookAuthorityBootstrapEvent,
  claimJsonPostgresProgramInvocation,
  JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
  JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
  JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
  JSON_POSTGRES_JSON_RETIREMENT_ACTION,
  JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
  loadJsonPostgresW15BootstrapAuthorization,
  loadJsonPostgresW15BootstrapInputs,
  loadJsonPostgresRetirementInputs,
  loadJsonPostgresMigrationInputs,
  loadJsonPostgresDrRecoveryInputs,
  loadJsonPostgresRehearsalRestoreInputs,
  loadJsonPostgresProjectionInputs,
  loadJsonPostgresProgramAuthorization,
  JSON_POSTGRES_SCHEMA_GOVERNANCE_READBACK_ACTION,
  readJsonPostgresSchemaGovernance,
  resolveJsonPostgresScheduledProgramEvent,
} from "./json-postgres-program-inputs.js";
import {
  JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
  createJsonPostgresOutlookAuthorityTerminal,
  createJsonPostgresOutlookAuthorityPublicResult,
  createJsonPostgresOutlookAuthorityReplayReceipt,
  jsonPostgresOutlookAuthorityTerminalSha256,
  readJsonPostgresOutlookAuthorityTerminal,
  writeJsonPostgresOutlookAuthorityTerminal,
} from "./json-postgres-outlook-authority-terminal.js";
import {
  normalizeJsonPostgresOutlookSecretReference,
  publishJsonPostgresOutlookDatabaseSecret,
} from "./json-postgres-outlook-secret-publication.js";
import {
  createJsonPostgresOutlookAuthorityMigrationAdapter,
} from "./json-postgres-outlook-authority-migration-adapter.js";
import { readOutlookAssignmentMigrationPauseExpectation } from "../../../packages/email-dms/src/outlook-desktop-assignment-bootstrap-authority.js";
import {
  CATALOG_READBACK_ACTION,
  executeProductionMigrationCatalogReadback,
} from "./production-migration-catalog-readback.js";
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

export function safeJsonPostgresProgramErrorCode(error) {
  return String(error?.code ?? error?.name ?? "LAWOS_PROGRAM_EXECUTION_FAILED")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/gu, "_")
    .slice(0, 96);
}

function safeOutlookAuthorityFailureCode(error) {
  const code = safeJsonPostgresProgramErrorCode(error);
  if (code.startsWith("LAWOS_OUTLOOK_")) return code;
  const suffix = code.startsWith("LAWOS_")
    ? code.slice("LAWOS_".length)
    : code;
  return `LAWOS_OUTLOOK_AUTHORITY_${suffix}`.slice(0, 96);
}

function safeMetricCount(value, label) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
  return count;
}

export function createW15ProjectionWorkerMetric(result, {
  timestamp = Date.now(),
} = {}) {
  if (result?.outcome !== "PASS"
    || result.action !== JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION
    || result.mode !== "incremental"
    || !Number.isSafeInteger(timestamp)
    || timestamp < 0) {
    throw new TypeError("W15 projection worker metric input is invalid");
  }
  return Object.freeze({
    _aws: {
      Timestamp: timestamp,
      CloudWatchMetrics: [{
        Namespace: "LawOS/W15",
        Dimensions: [["Worker"]],
        Metrics: [
          { Name: "OutboxLagMilliseconds", Unit: "Milliseconds" },
          { Name: "RemainingOutboxEventCount", Unit: "Count" },
          { Name: "ConsumedOutboxEventCount", Unit: "Count" },
        ],
      }],
    },
    Worker: "relational-projection",
    OutboxLagMilliseconds: safeMetricCount(
      result.safe_counts?.observed_outbox_lag_ms,
      "observed_outbox_lag_ms",
    ),
    RemainingOutboxEventCount: safeMetricCount(
      result.safe_counts?.remaining_outbox_event_count,
      "remaining_outbox_event_count",
    ),
    ConsumedOutboxEventCount: safeMetricCount(
      result.safe_counts?.consumed_outbox_event_count,
      "consumed_outbox_event_count",
    ),
  });
}

async function withAwsAccessDeniedCode(code, operation) {
  try {
    return await operation();
  } catch (error) {
    if (["ACCESSDENIED", "ACCESSDENIEDEXCEPTION"].includes(
      safeJsonPostgresProgramErrorCode(error),
    )) {
      fail(code, "AWS denied access at a protected program boundary");
    }
    throw error;
  }
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function exactRequiredText(value, label) {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError(`${label} is required`);
  }
  return value;
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

function isPreconditionFailed(error) {
  return error?.name === "PreconditionFailed"
    || error?.$metadata?.httpStatusCode === 412;
}

function assertClientOperationsPacketCatalogBinding(packet, { readOnly = false } = {}) {
  const packetSha256 = packet?.bindings?.migration_catalog_sha256;
  try {
    if (typeof packetSha256 !== "string" || !SHA256.test(packetSha256)) throw new TypeError();
    (readOnly ? selectClientOperationsMigrationReadback : selectClientOperationsMigrationTarget)(packetSha256);
  } catch {
    fail(
      "LAWOS_PROGRAM_MIGRATION_CATALOG",
      "Client operations migration catalog is not bound to the exact packet",
    );
  }
  return packetSha256;
}

async function evidenceBodyToBuffer(body, expectedByteSize) {
  if (!body) fail("LAWOS_PROGRAM_EVIDENCE_CONFLICT", "immutable program evidence has no body");
  let bytes;
  if (typeof body.transformToByteArray === "function") {
    bytes = Buffer.from(await body.transformToByteArray());
  } else {
    const chunks = [];
    let size = 0;
    for await (const chunk of body) {
      const value = Buffer.from(chunk);
      size += value.byteLength;
      if (size > expectedByteSize) {
        fail("LAWOS_PROGRAM_EVIDENCE_CONFLICT", "immutable program evidence exceeds the expected size");
      }
      chunks.push(value);
    }
    bytes = Buffer.concat(chunks);
  }
  if (bytes.byteLength !== expectedByteSize) {
    fail("LAWOS_PROGRAM_EVIDENCE_CONFLICT", "immutable program evidence size drifted");
  }
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

function outlookDatabaseSecretIds(env) {
  const normalize = (value) => value == null || value === ""
    ? null
    : normalizeJsonPostgresOutlookSecretReference(exactRequiredText(
      value,
      "Outlook database credential secret id",
    ));
  let control;
  let assignment;
  let lifecycleVerifier;
  try {
    control = normalize(env.LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID);
    assignment = normalize(env.LAWOS_OUTLOOK_ASSIGNMENT_DATABASE_SECRET_ID);
    lifecycleVerifier = normalize(
      env.LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID,
    );
  } catch {
    fail(
      "LAWOS_OUTLOOK_DATABASE_SECRET_IDS",
      "Outlook database credential secret ids must be canonical strings",
    );
  }
  const secretRefs = [control, assignment, lifecycleVerifier];
  if (secretRefs.every((secretRef) => secretRef === null)) return null;
  let reserved;
  try {
    reserved = [
      env.LAWOS_APPLICATION_DATABASE_SECRET_ID,
      env.LAWOS_MASTER_DATABASE_SECRET_ID,
      env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
    ].filter((value) => value != null && value !== "")
      .map((value) => normalizeJsonPostgresOutlookSecretReference(
        exactRequiredText(value, "reserved database credential secret id"),
        { allowRdsManagedArn: true },
      ).secret_name);
  } catch {
    reserved = null;
  }
  const names = secretRefs.map((secretRef) => secretRef?.secret_name);
  if (secretRefs.some((secretRef) => secretRef === null)
    || new Set(names).size !== names.length
    || reserved === null
    || names.some((name) => reserved.includes(name))) {
    fail(
      "LAWOS_OUTLOOK_DATABASE_SECRET_IDS",
      "Outlook database credential secret ids must be complete and isolated",
    );
  }
  return Object.freeze({ control: control.secret_id,
    assignment: assignment.secret_id,
    lifecycleVerifier: lifecycleVerifier.secret_id });
}

function structuredOutlookDatabaseSecret({
  current,
  env,
  expectedUsername,
}) {
  let username;
  let password;
  try {
    username = exactRequiredText(
      current?.username,
      "Outlook database username",
    );
    password = exactRequiredText(
      current?.password,
      "Outlook database password",
    );
  } catch {
    fail(
      "LAWOS_OUTLOOK_DATABASE_SECRET",
      "Outlook database credential is invalid",
    );
  }
  if (username !== expectedUsername) {
    fail(
      "LAWOS_OUTLOOK_DATABASE_SECRET",
      "Outlook database credential username drifted",
    );
  }
  const value = {
    schema_version: "law-firm-os.outlook-database-secret.v1",
    configuration_state: "ready",
    engine: "postgres",
    host: requiredText(env.LAWOS_DATABASE_HOST, "LAWOS_DATABASE_HOST"),
    port: Number(requiredText(env.LAWOS_DATABASE_PORT, "LAWOS_DATABASE_PORT")),
    dbname: requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME"),
    username,
    password,
  };
  if (!Number.isSafeInteger(value.port) || value.port < 1 || value.port > 65535) {
    throw new TypeError("LAWOS_DATABASE_PORT is invalid");
  }
  return value;
}

const OUTLOOK_CLAIM_RECEIPT_KEYS = Object.freeze([
  "claim_sha256",
  "claim_ref_sha256",
  "request_sha256",
  "operation_binding_sha256",
  "program_input_kms_key_ref",
  "approval_signature_sha256",
  "approval_receipt_sha256",
  "registry_sha256",
  "registry_serial",
  "trust_anchor_sha256",
  "registry_signature_sha256",
  "external_authority_binding_sha256",
  "database_target_receipt",
  "database_target_receipt_sha256",
  "claimed_at",
  "expires_at",
]);

function exactCanonicalInstant(value) {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    && new Date(milliseconds).toISOString() === value;
}

function assertOutlookClaimEnvelope(value, { authorization, now }) {
  const receipt = value?.receipt;
  const claimed = value?.outcome === "claimed";
  const replayed = value?.outcome === "replayed";
  if (!hasExactKeys(value, [
    "outcome",
    "claim_write_attempted",
    "claim_write_committed",
    "receipt",
  ])
    || !hasExactKeys(receipt, OUTLOOK_CLAIM_RECEIPT_KEYS)
    || (!claimed && !replayed)
    || typeof value.claim_write_attempted !== "boolean"
    || typeof value.claim_write_committed !== "boolean"
    || value.claim_write_committed !== claimed
    || (claimed && !value.claim_write_attempted)
    || !Number.isSafeInteger(now)
    || now < 0
    || [
      receipt.claim_sha256,
      receipt.claim_ref_sha256,
      receipt.request_sha256,
      receipt.approval_signature_sha256,
      receipt.trust_anchor_sha256,
      receipt.registry_signature_sha256,
      receipt.external_authority_binding_sha256,
      receipt.database_target_receipt_sha256,
    ].some((digest) => typeof digest !== "string" || !SHA256.test(digest))
    || receipt.operation_binding_sha256
      !== authorization?.operation_binding_sha256
    || receipt.program_input_kms_key_ref
      !== authorization?.packet?.target?.program_input_kms_key_ref
    || receipt.approval_receipt_sha256
      !== authorization?.approval?.receipt_sha256
    || receipt.registry_sha256 !== authorization?.approval?.registry_sha256
    || receipt.approval_signature_sha256
      !== authorization?.approval?.signature_sha256
    || receipt.registry_serial !== authorization?.approval?.registry_serial
    || receipt.trust_anchor_sha256
      !== authorization?.approval?.trust_anchor_sha256
    || receipt.registry_signature_sha256
      !== authorization?.approval?.registry_signature_sha256
    || receipt.external_authority_binding_sha256
      !== authorization?.approval?.external_authority_binding_sha256
    || receipt.database_target_receipt_sha256
      !== authorization?.database_target_receipt_sha256
    || receipt.database_target_receipt_sha256
      !== authorization?.packet?.target?.database_target_receipt_sha256
    || canonicalizeJson(receipt.database_target_receipt)
      !== canonicalizeJson(authorization?.databaseTargetReceipt)
    || receipt.expires_at !== authorization?.approval?.expires_at
    || !exactCanonicalInstant(receipt.claimed_at)
    || !exactCanonicalInstant(receipt.expires_at)
    || Date.parse(receipt.claimed_at) > now) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_CLAIM_BINDING",
      "Outlook authority claim envelope is invalid or unbound",
    );
  }
  return Object.freeze({
    outcome: value.outcome,
    claim_write_attempted: value.claim_write_attempted,
    claim_write_committed: value.claim_write_committed,
    receipt: Object.freeze({ ...receipt }),
  });
}

function assertOutlookDatabaseTarget(authorization, env) {
  let binding;
  try {
    binding = validateJsonPostgresDatabaseTargetReceiptBinding(
      authorization?.packet?.target,
    );
  } catch {
    fail(
      "LAWOS_OUTLOOK_DATABASE_TARGET",
      "Outlook authority database target receipt is invalid",
    );
  }
  const receipt = binding?.database_target_receipt;
  const port = String(receipt?.endpoint_port ?? "");
  if (!receipt
    || authorization?.database_target_receipt_sha256
      !== binding.database_target_receipt_sha256
    || canonicalizeJson(authorization?.databaseTargetReceipt)
      !== canonicalizeJson(receipt)
    || env.LAWOS_DATABASE_HOST !== receipt.endpoint_host
    || env.LAWOS_DATABASE_PORT !== port
    || env.LAWOS_DATABASE_NAME !== receipt.database_name) {
    fail(
      "LAWOS_OUTLOOK_DATABASE_TARGET",
      "Outlook authority runtime database target drifted",
    );
  }
  return receipt;
}

function assertOutlookMasterDatabaseTarget(master, receipt) {
  const hasDbname = Object.hasOwn(master ?? {}, "dbname");
  const hasDatabase = Object.hasOwn(master ?? {}, "database");
  const database = hasDbname ? master.dbname : master?.database;
  if (typeof master?.host !== "string"
    || master.host !== receipt.endpoint_host
    || !Number.isSafeInteger(master.port)
    || master.port !== receipt.endpoint_port
    || hasDbname === hasDatabase
    || database !== receipt.database_name
    || master.username !== receipt.master_username) {
    fail(
      "LAWOS_OUTLOOK_DATABASE_TARGET",
      "Outlook authority master credential target drifted",
    );
  }
}

function outlookTerminalBindings({
  authorization,
  claimReceipt,
  authorityCatalogSha256,
  migrationCatalogSha256,
  roleBootstrapSha256,
}) {
  const bindings = {
    operation_binding_sha256: claimReceipt.operation_binding_sha256,
    claim_sha256: claimReceipt.claim_sha256,
    packet_sha256: authorization.packet.packet_sha256,
    approval_receipt_sha256: claimReceipt.approval_receipt_sha256,
    registry_sha256: claimReceipt.registry_sha256,
    database_target_receipt_sha256:
      claimReceipt.database_target_receipt_sha256,
    authority_catalog_sha256: authorityCatalogSha256,
    migration_catalog_sha256: migrationCatalogSha256,
  };
  if (roleBootstrapSha256 !== undefined) {
    bindings.role_bootstrap_sha256 = roleBootstrapSha256;
  }
  return Object.freeze(bindings);
}

function outlookInvocationCounts({
  claimEnvelope,
  postgresAttempted = 0,
  postgresCommitted = 0,
  secretAttempted = 0,
  secretCommitted = 0,
}) {
  const claimAttempted = claimEnvelope.claim_write_attempted ? 1 : 0;
  const claimCommitted = claimEnvelope.claim_write_committed ? 1 : 0;
  const attempted = [postgresAttempted, secretAttempted];
  const committed = [postgresCommitted, secretCommitted];
  const unknownCommittedCount = committed.filter((count) => count === null)
    .length;
  if (!attempted.every((count) => Number.isSafeInteger(count) && count >= 0)
    || !committed.every((count) => count === null
      || (Number.isSafeInteger(count) && count >= 0))
    || unknownCommittedCount > 1
    || (postgresCommitted !== null && postgresCommitted > postgresAttempted)
    || (secretCommitted !== null && secretCommitted > secretAttempted)) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_WRITE_COUNTS",
      "Outlook authority mutation counts are invalid",
    );
  }
  return Object.freeze({
    authorization_claim_write_attempt_count: claimAttempted,
    authorization_claim_write_committed_count: claimCommitted,
    postgres_mutation_attempt_count: postgresAttempted,
    postgres_mutation_committed_count: postgresCommitted,
    secretsmanager_put_secret_value_attempt_count: secretAttempted,
    secretsmanager_put_secret_value_committed_count: secretCommitted,
    production_write_count: unknownCommittedCount === 0
      ? claimCommitted + postgresCommitted + secretCommitted
      : null,
  });
}

function assertOutlookTerminalRead(value, { expectedBindings, now }) {
  if (hasExactKeys(value, ["outcome"]) && value.outcome === "absent") {
    return Object.freeze({ outcome: "absent" });
  }
  if (!hasExactKeys(value, ["outcome", "terminal", "terminal_sha256"])
    || !["pass", "partial"].includes(value.outcome)) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Outlook authority terminal read is invalid",
    );
  }
  let terminal;
  try {
    terminal = createJsonPostgresOutlookAuthorityTerminal(value.terminal);
  } catch {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Outlook authority terminal schema is invalid",
    );
  }
  if ((value.outcome === "pass") !== (terminal.status === "PASS")
    || value.terminal_sha256
      !== jsonPostgresOutlookAuthorityTerminalSha256(terminal)
    || Date.parse(terminal.recorded_at) > now
    || Object.entries(expectedBindings).some(
      ([key, expected]) => terminal.bindings[key] !== expected,
    )) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Outlook authority terminal drifted from the consumed claim",
    );
  }
  return Object.freeze({
    outcome: value.outcome,
    terminal,
    terminal_sha256: value.terminal_sha256,
  });
}

function assertOutlookTerminalWrite(value, terminal) {
  if (!hasExactKeys(value, ["outcome", "terminal", "terminal_sha256"])
    || !["written", "existing"].includes(value.outcome)) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Outlook authority terminal write receipt is invalid",
    );
  }
  let written;
  try {
    written = createJsonPostgresOutlookAuthorityTerminal(value.terminal);
  } catch {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Outlook authority terminal write receipt is invalid",
    );
  }
  if (canonicalizeJson(written) !== canonicalizeJson(terminal)
    || value.terminal_sha256
      !== jsonPostgresOutlookAuthorityTerminalSha256(written)) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Outlook authority terminal write receipt drifted",
    );
  }
  return Object.freeze({
    outcome: value.outcome,
    terminal: written,
    terminal_sha256: value.terminal_sha256,
  });
}

function outlookPassReplayResult({
  claimEnvelope,
  terminal,
}) {
  const result = terminal.result;
  const replayReceipt = createJsonPostgresOutlookAuthorityReplayReceipt({
    operationBindingSha256:
      claimEnvelope.receipt.operation_binding_sha256,
    claimSha256: claimEnvelope.receipt.claim_sha256,
    claimWriteAttempted: claimEnvelope.claim_write_attempted,
    claimWriteCommitted: claimEnvelope.claim_write_committed,
    terminal,
  });
  return createJsonPostgresOutlookAuthorityPublicResult({
    outcome: "PASS",
    operation_binding_sha256: claimEnvelope.receipt.operation_binding_sha256,
    terminal_state: "PASS",
    terminal_sha256: replayReceipt.terminal_sha256,
    postgres_receipt: Object.freeze({
      kind: "run",
      receipt_sha256: result.migration_run_receipt_sha256,
    }),
    replay_receipt_sha256: replayReceipt.replay_receipt_sha256,
    ...outlookInvocationCounts({ claimEnvelope }),
  }, { terminal });
}

function hasExactKeys(value, keys) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...keys].sort());
}

function assertOutlookRoleReadiness(
  value,
  approvedTenantIds,
  { expectedRoleBootstrap = null } = {},
) {
  const tenantCount = new Set(approvedTenantIds).size;
  let readiness;
  try {
    readiness = assertLawosOutlookRoleBootstrapReceipt(value, {
      expectedRoleBootstrap,
    });
  } catch {
    fail(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook database role readiness is incomplete",
    );
  }
  if (readiness.tenant_authority_count !== tenantCount * 3
    || ![4, 5].includes(readiness.membership_edge_count)) {
    fail(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook database role readiness is incomplete",
    );
  }
  return readiness;
}

function assertOutlookMigrationAdapter(value, expected) {
  const runner = value?.runnerOptions;
  if (!hasExactKeys(value, [
    "runnerOptions", "normalizeRunReceipt", "normalizeFailureReceipt",
    "getRoleReadiness", "dispose",
  ])
    || !Object.isFrozen(value)
    || !hasExactKeys(runner, [
      "authorityManifestSha256", "databaseTargetReceiptSha256",
      "migrationCatalogSha256", "onBeforeMigrations",
      "onOutlookAuthorityPaused", "onOutlookAuthorityPostMigration",
      "onInternalUnsignedInstallationAuthorityPostMigration",
      ...(expected.historicalOutlookBootstrapSha256 === undefined
        ? [] : ["historicalOutlookBootstrapSha256"]),
    ])
    || !Object.isFrozen(runner)
    || runner.authorityManifestSha256 !== expected.authorityManifestSha256
    || runner.databaseTargetReceiptSha256
      !== expected.databaseTargetReceiptSha256
    || runner.migrationCatalogSha256 !== expected.migrationCatalogSha256
    || runner.historicalOutlookBootstrapSha256 !== expected.historicalOutlookBootstrapSha256
    || [runner.onBeforeMigrations, runner.onOutlookAuthorityPaused,
      runner.onOutlookAuthorityPostMigration,
      runner.onInternalUnsignedInstallationAuthorityPostMigration, value.normalizeRunReceipt,
      value.normalizeFailureReceipt, value.getRoleReadiness, value.dispose]
      .some((callback) => typeof callback !== "function")) {
    fail(
      "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT",
      "Outlook authority migration adapter is invalid or unbound",
    );
  }
  return value;
}

const OUTLOOK_FAILURE_PHASES = Object.freeze({
  preflight: "postgres-precondition",
  before_migrations: "postgres-precondition",
  migration: "postgres-bootstrap-before-observation",
  outlook_authority_paused: "postgres-bootstrap",
  outlook_authority_migration: "postgres-postflight",
  outlook_authority_replay: "postgres-postflight",
  internal_installation_postflight: "postgres-postflight",
  complete: "postgres-postflight",
});

function outlookTerminalFailurePhase(receipt) {
  const phase = OUTLOOK_FAILURE_PHASES[receipt?.failure_phase];
  if (!phase) {
    fail(
      "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT",
      "Outlook authority migration failure phase is invalid",
    );
  }
  return phase;
}

function assertOutlookMigrationRunSummary(value, {
  roleBootstrap,
  approvedTenantIds,
  authorityManifestSha256,
  databaseTargetReceiptSha256,
  migrationCatalogSha256,
  historicalOutlookBootstrapSha256,
} = {}) {
  const readiness = assertOutlookRoleReadiness(
    roleBootstrap,
    approvedTenantIds,
    { expectedRoleBootstrap: roleBootstrap },
  );
  let receipt;
  try {
    receipt = assertOutlookAuthorityMigrationRunReceipt(value, {
      authority_manifest_sha256: authorityManifestSha256,
      database_target_receipt_sha256: databaseTargetReceiptSha256,
      migration_catalog_sha256: migrationCatalogSha256,
      historical_outlook_bootstrap_sha256: historicalOutlookBootstrapSha256,
      role_bootstrap_sha256: readiness.role_bootstrap_sha256,
    });
  } catch {
    fail(
      "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT",
      "Outlook authority migration run receipt is invalid or unbound",
    );
  }
  return receipt;
}

function assertOutlookMigrationFailureSummary(value, {
  roleBootstrap,
  authorityManifestSha256,
  databaseTargetReceiptSha256,
  migrationCatalogSha256,
} = {}) {
  let receipt;
  try {
    receipt = assertOutlookAuthorityMigrationFailureReceipt(value, {
      authority_manifest_sha256: authorityManifestSha256,
      database_target_receipt_sha256: databaseTargetReceiptSha256,
      migration_catalog_sha256: migrationCatalogSha256,
    });
  } catch {
    fail(
      "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT",
      "Outlook authority migration failure receipt is invalid or unbound",
    );
  }
  if (roleBootstrap !== null
    && receipt.role_bootstrap_sha256 !== roleBootstrap.role_bootstrap_sha256) {
    fail(
      "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT",
      "Outlook authority migration failure role receipt drifted",
    );
  }
  return receipt;
}

function outlookPassResult({
  claimEnvelope,
  migrationRun,
  counts,
  terminalWrite,
}) {
  return createJsonPostgresOutlookAuthorityPublicResult({
    outcome: "PASS",
    operation_binding_sha256: claimEnvelope.receipt.operation_binding_sha256,
    terminal_state: "PASS",
    terminal_sha256: terminalWrite.terminal_sha256,
    postgres_receipt: Object.freeze({
      kind: "run",
      receipt_sha256: migrationRun.migration_run_receipt_sha256,
    }),
    replay_receipt_sha256: null,
    ...counts,
  }, { terminal: terminalWrite.terminal });
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
  const authorization = await withAwsAccessDeniedCode(
    "LAWOS_PROGRAM_AUTHORIZATION_READ_ACCESS_DENIED",
    () => authorize({ event, env }),
  );
  if (authorization.packet.phase !== "w12-real-data-rehearsal") {
    fail("LAWOS_PROGRAM_PHASE", "private rehearsal bootstrap requires a W12 packet");
  }
  if (requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME")
    !== REHEARSAL_DATABASE_NAME) {
    fail("LAWOS_PROGRAM_DATABASE", "private rehearsal database target drifted");
  }
  const claimEvidence = await withAwsAccessDeniedCode(
    "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_ACCESS_DENIED",
    () => claim({ event, authorization, env }),
  );
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const [master, application, tenantContext] = await Promise.all([
    withAwsAccessDeniedCode("LAWOS_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED", () => resolveSecret({
      secretId: requiredText(
        env.LAWOS_MASTER_DATABASE_SECRET_ID,
        "LAWOS_MASTER_DATABASE_SECRET_ID",
      ),
      region,
    })),
    withAwsAccessDeniedCode("LAWOS_PROGRAM_APPLICATION_SECRET_READ_ACCESS_DENIED", () => resolveSecret({
      secretId: requiredText(
        env.LAWOS_APPLICATION_DATABASE_SECRET_ID,
        "LAWOS_APPLICATION_DATABASE_SECRET_ID",
      ),
      region,
    })),
    withAwsAccessDeniedCode("LAWOS_PROGRAM_TENANT_CONTEXT_SECRET_READ_ACCESS_DENIED", () => resolveSecret({
      secretId: requiredText(
        env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
        "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
      ),
      region,
    })),
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
    await withAwsAccessDeniedCode(
      "LAWOS_PROGRAM_APPLICATION_SECRET_WRITE_ACCESS_DENIED",
      () => writer({
        secretId: requiredText(
          env.LAWOS_APPLICATION_DATABASE_SECRET_ID,
          "LAWOS_APPLICATION_DATABASE_SECRET_ID",
        ),
        secretString: JSON.stringify(applicationSecret),
      }),
    );
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

function structuredProjectionSecret({
  current,
  env,
  expectedUsername = HRX_PROJECTION_WRITER_ROLE,
}) {
  const username = requiredText(current.username, "projection database username");
  if (username !== expectedUsername) {
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
  const bucket = requiredText(env.LAWOS_APPROVAL_AUDIT_BUCKET, "LAWOS_APPROVAL_AUDIT_BUCKET");
  const expectedBucketOwner = requiredText(
    authorization.packet.target.program_input_expected_bucket_owner,
    "program input expected bucket owner",
  );
  if (bucket !== authorization.packet.target.program_input_bucket_name) {
    fail("LAWOS_PROGRAM_EVIDENCE", "program evidence bucket drifted from the execution packet");
  }
  const key = `program-execution/${authorization.packet.packet_sha256}/${safeAttempt}/${safeKind}-${sha256}.json`;
  const kmsKeyId = requiredText(env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN, "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN");
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      ExpectedBucketOwner: expectedBucketOwner,
      IfNoneMatch: "*",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: programEvidenceRetainUntil({
        approvalExpiresAt: authorization.approval.expires_at,
        now,
      }),
    }));
  } catch (error) {
    if (!isPreconditionFailed(error)
      || authorization.packet.phase !== "w15-relational-projection"
      || event.mode !== "resume") {
      throw error;
    }
    const existing = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ExpectedBucketOwner: expectedBucketOwner,
      ChecksumMode: "ENABLED",
    }));
    if (typeof existing.VersionId !== "string" || !existing.VersionId.trim()
      || Number(existing.ContentLength) !== body.byteLength
      || existing.ContentType !== "application/json"
      || existing.ServerSideEncryption !== "aws:kms"
      || existing.SSEKMSKeyId !== kmsKeyId
      || existing.ObjectLockMode !== "COMPLIANCE"
      || !Number.isFinite(Date.parse(existing.ObjectLockRetainUntilDate))
      || Date.parse(existing.ObjectLockRetainUntilDate) <= now) {
      fail("LAWOS_PROGRAM_EVIDENCE_CONFLICT", "immutable program evidence governance drifted");
    }
    const existingBody = await evidenceBodyToBuffer(existing.Body, body.byteLength);
    if (createHash("sha256").update(existingBody).digest("hex") !== sha256) {
      fail("LAWOS_PROGRAM_EVIDENCE_CONFLICT", "immutable program evidence content drifted");
    }
  }
  return Object.freeze({ sha256, byte_size: body.byteLength });
}

function authoritativeClientOperationsCatalog(verified, { packet } = {}) {
  const suppliedEntries = Array.isArray(verified)
    ? verified
    : verified?.entries;
  if (!Array.isArray(suppliedEntries)) {
    fail(
      "LAWOS_PROGRAM_MIGRATION_CATALOG",
      "verified Client operations migration catalog is missing",
    );
  }
  const entries = suppliedEntries;
  const packetSha256 = assertClientOperationsPacketCatalogBinding(packet, { readOnly: true });
  const target = selectClientOperationsMigrationReadback(packetSha256).normalized;
  const expected = target.ledger_entries;
  if (entries.length !== expected.length) {
    fail(
      "LAWOS_PROGRAM_MIGRATION_CATALOG",
      "verified Client operations migration catalog count drifted",
    );
  }
  const normalized = entries.map((entry, index) => {
    const id = entry?.id ?? entry?.migration_id;
    const checksum = entry?.checksum;
    if (typeof id !== "string"
      || typeof checksum !== "string"
      || id !== expected[index].id
      || checksum !== expected[index].checksum) {
      fail(
        "LAWOS_PROGRAM_MIGRATION_CATALOG",
        "verified Client operations migration catalog drifted",
      );
    }
    return Object.freeze({ id, checksum });
  });
  const computedSha256 = hashDomainValue(normalized);
  if (verified?.schema_sha256 != null
    && verified.schema_sha256 !== computedSha256) {
    fail(
      "LAWOS_PROGRAM_MIGRATION_CATALOG",
      "verified Client operations migration catalog digest drifted",
    );
  }
  if (computedSha256 !== target.ledger_sha256) {
    fail(
      "LAWOS_PROGRAM_MIGRATION_CATALOG",
      "verified Client operations migration catalog is not bound to the schema manifest",
    );
  }
  const final = normalized.at(-1);
  return Object.freeze({
    migration_catalog_count: normalized.length,
    migration_catalog_sha256: packetSha256,
    final_migration_id: final.id,
    final_migration_checksum: final.checksum,
  });
}

export async function readJsonPostgresProductionSchemaLedger({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyClientOperationsMigrationReadback,
} = {}) {
  if (event.action !== JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION
    || !["preflight", "readback"].includes(event.mode)) {
    fail(
      "LAWOS_PROGRAM_ACTION",
      "production schema ledger diagnostics require preflight or readback mode",
    );
  }
  const authorization = await withAwsAccessDeniedCode(
    "LAWOS_PROGRAM_AUTHORIZATION_READ_ACCESS_DENIED",
    () => authorize({ event, env }),
  );
  if (authorization.packet.phase !== "w13-production-cutover") {
    fail(
      "LAWOS_PROGRAM_PHASE",
      "production schema ledger readback requires a W13 packet",
    );
  }
  assertClientOperationsPacketCatalogBinding(authorization.packet, { readOnly: true });
  const region = requiredText(
    env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
    "AWS region",
  );
  const master = await withAwsAccessDeniedCode(
    "LAWOS_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED",
    () => resolveSecret({
      secretId: requiredText(
        env.LAWOS_MASTER_DATABASE_SECRET_ID,
        "LAWOS_MASTER_DATABASE_SECRET_ID",
      ),
      region,
    }),
  );
  let masterUsername;
  let masterPassword;
  try {
    masterUsername = exactRequiredText(
      master?.username,
      "master database username",
    );
    masterPassword = exactRequiredText(
      master?.password,
      "master database password",
    );
  } catch {
    fail(
      "LAWOS_PROGRAM_DATABASE_ROLE",
      "production schema ledger master credential is invalid",
    );
  }
  const masterConnectionString = postgresUrlFromSecret(JSON.stringify({
    username: masterUsername,
    password: masterPassword,
    host: env.LAWOS_DATABASE_HOST,
    port: env.LAWOS_DATABASE_PORT,
    dbname: env.LAWOS_DATABASE_NAME,
  }));
  const pool = createPool({
    connectionString: masterConnectionString,
    sslMode: "verify-full",
    applicationName: "lawos-production-schema-ledger-readback",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let catalog;
  let bootstrap;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const verified = await verifyMigrations(client, {
      migrationCatalogSha256: authorization.packet.bindings.migration_catalog_sha256,
    });
    catalog = authoritativeClientOperationsCatalog(verified, { packet: authorization.packet });
    bootstrap = await readOutlookAssignmentMigrationPauseExpectation(client);
    await client.query("COMMIT");
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
  return Object.freeze({
    outcome: "PASS",
    action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
    phase: authorization.packet.phase,
    mode: event.mode,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    migration_count: catalog.migration_catalog_count,
    migration_applied_count: 0,
    ...catalog,
    historical_outlook_bootstrap_receipt: bootstrap,
    historical_outlook_bootstrap_sha256: hashDomainValue(bootstrap),
    server_enforced_read_only: true,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    production_data_write_count: 0,
    authorization_claim_write_attempt_count: 0,
    authorization_claim_write_committed_count: 0,
    postgres_mutation_attempt_count: 0,
    postgres_mutation_committed_count: 0,
    secretsmanager_put_secret_value_attempt_count: 0,
    secretsmanager_put_secret_value_committed_count: 0,
    production_write_count: 0,
    external_email_send_count: 0,
    real_data_count: 0,
    legacy_authority_counter_total: 0,
    raw_value_returned: false,
    raw_pii_returned: false,
    raw_secret_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    approval_receipt_sha256: authorization.approval.receipt_sha256,
  });
}

export async function bootstrapJsonPostgresProductionDatabase({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
  getSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyClientOperationsMigrationReadback,
  outlookAuthorityManifestSha256 =
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
  outlookMigrationCatalog,
  normalizeOutlookMigrationCatalog =
    normalizeClientOperationsMigrationCatalog,
  createOutlookMigrationAdapter =
    createJsonPostgresOutlookAuthorityMigrationAdapter,
  runOutlookAuthorityMigrations =
    runClientOperationsPostgresMigrations,
  readOutlookTerminal = readJsonPostgresOutlookAuthorityTerminal,
  writeOutlookTerminal = writeJsonPostgresOutlookAuthorityTerminal,
  s3Client = new S3Client({
    region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
  }),
  now = Date.now(),
} = {}) {
  if (event.action !== JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION
    || !["preflight", "readback", "commit"].includes(event.mode)) {
    fail("LAWOS_PROGRAM_ACTION", "production bootstrap mode is invalid");
  }
  if (event.mode === "commit") {
    assertJsonPostgresOutlookAuthorityBootstrapEvent(event);
  }
  if (["preflight", "readback"].includes(event.mode)) {
    return readJsonPostgresProductionSchemaLedger({
      event,
      env,
      authorize,
      resolveSecret,
      createPool,
      verifyMigrations,
    });
  }
  const authorization = await withAwsAccessDeniedCode(
    "LAWOS_PROGRAM_AUTHORIZATION_READ_ACCESS_DENIED",
    () => authorize({ event, env, s3Client, now }),
  );
  if (authorization.packet.phase !== "w13-production-cutover") fail("LAWOS_PROGRAM_PHASE", "production bootstrap requires a W13 packet");
  if (authorization.packet.packet_sha256 !== event.packet_sha256
    || typeof authorization.operation_binding_sha256 !== "string"
    || !SHA256.test(authorization.operation_binding_sha256)) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
      "Outlook authority authorization is not bound to the exact operation",
    );
  }
  const outlookSecretIds = outlookDatabaseSecretIds(env);
  let normalizedOutlookMigrationCatalog = null;
  if (!outlookSecretIds) {
    fail(
      "LAWOS_OUTLOOK_DATABASE_SECRET_IDS",
      "Outlook authority commit requires all exact role credential secret ids",
    );
  }
  const reviewedTarget = selectClientOperationsMigrationTarget(
    assertClientOperationsPacketCatalogBinding(authorization.packet),
  );
  const selectedOutlookMigrationCatalog = outlookMigrationCatalog ?? reviewedTarget.catalog;
  if (!SHA256.test(outlookAuthorityManifestSha256 ?? "")
    || !selectedOutlookMigrationCatalog
    || typeof normalizeOutlookMigrationCatalog !== "function"
    || typeof createOutlookMigrationAdapter !== "function"
    || typeof runOutlookAuthorityMigrations !== "function") {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
      "Outlook authority catalog, adapter, and migration runner must be bound",
    );
  }
  try {
    normalizedOutlookMigrationCatalog =
      normalizeOutlookMigrationCatalog(selectedOutlookMigrationCatalog);
  } catch {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
      "Outlook migration catalog is invalid",
    );
  }
  const migrationCatalogSha256 =
    normalizedOutlookMigrationCatalog?.migration_catalog_sha256;
  if (!SHA256.test(migrationCatalogSha256 ?? "")) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
      "Outlook migration catalog normalization is incomplete",
    );
  }
  if (outlookAuthorityManifestSha256
    !== authorization.packet.bindings.authority_manifest_sha256) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
      "Outlook authority catalog drifted from the owner-signed manifest",
    );
  }
  if (migrationCatalogSha256
    !== authorization.packet.bindings.migration_catalog_sha256) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
      "Outlook migration catalog drifted from the owner-signed manifest",
    );
  }
  if (env.LAWOS_MASTER_DATABASE_SECRET_ID
    !== authorization.packet.target.database_secret_ref) {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
      "Outlook authority master database secret ref drifted from the signed target",
    );
  }
  const databaseTarget = assertOutlookDatabaseTarget(authorization, env);
  const claimEnvelope = assertOutlookClaimEnvelope(
    await withAwsAccessDeniedCode(
    "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_ACCESS_DENIED",
      () => claim({ event, authorization, env, client: s3Client, now }),
    ),
    { authorization, now },
  );
  const claimEvidence = claimEnvelope.receipt;
  const terminalBindings = outlookTerminalBindings({
    authorization,
    claimReceipt: claimEvidence,
    authorityCatalogSha256:
      outlookAuthorityManifestSha256,
    migrationCatalogSha256:
      migrationCatalogSha256,
  });
  const terminalStorage = {
    bucket: env.LAWOS_APPROVAL_AUDIT_BUCKET,
    expectedBucketOwner:
      authorization.packet.target.program_input_expected_bucket_owner,
    kmsKeyId: claimEvidence.program_input_kms_key_ref,
    approvalExpiresAt: claimEvidence.expires_at,
    client: s3Client,
    now,
  };
  let terminalRead;
  try {
    terminalRead = assertOutlookTerminalRead(
      await withAwsAccessDeniedCode(
        "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_READ_ACCESS_DENIED",
        () => readOutlookTerminal({
          bindings: terminalBindings,
          ...terminalStorage,
        }),
      ),
      { expectedBindings: terminalBindings, now },
    );
  } catch (error) {
    if (claimEnvelope.outcome === "claimed") {
      try {
        const partialBindings = outlookTerminalBindings({
          authorization,
          claimReceipt: claimEvidence,
          authorityCatalogSha256:
            outlookAuthorityManifestSha256,
          migrationCatalogSha256:
            migrationCatalogSha256,
          roleBootstrapSha256: null,
        });
        const terminal = createJsonPostgresOutlookAuthorityTerminal({
          schema_version:
            JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
          status: "PARTIAL",
          bindings: partialBindings,
          recorded_at: new Date(now).toISOString(),
          ...outlookInvocationCounts({ claimEnvelope }),
          result: null,
          failure: {
            error_code: safeOutlookAuthorityFailureCode(error),
            failure_phase: "terminal-read",
            post_state_sha256: null,
          },
          postgres_receipt: null,
        });
        await writeOutlookTerminal({
          terminal,
          bindings: partialBindings,
          ...terminalStorage,
        });
      } catch {
        // Preserve the primary terminal-read failure.
      }
    }
    throw error;
  }
  if (claimEnvelope.outcome === "replayed") {
    if (terminalRead.outcome !== "pass") {
      fail(
        "LAWOS_OUTLOOK_AUTHORITY_RECOVERY_REQUIRED",
        "Outlook authority claim replay requires a terminal PASS",
      );
    }
    return outlookPassReplayResult({
      event,
      authorization,
      claimEnvelope,
      terminal: terminalRead.terminal,
    });
  }
  if (terminalRead.outcome !== "absent") {
    fail(
      "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
      "Fresh Outlook authority claim conflicts with terminal evidence",
    );
  }
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const approvedTenantIds = authorization.packet.target.approved_tenant_ids;
  const mutation = {
    postgresAttempted: 0,
    postgresCommitted: 0,
    secretAttempted: 0,
    secretCommitted: 0,
  };
  let pool = null;
  let runnerStarted = false;
  let runnerCompleted = false;
  let roleBootstrap = null;
  let migrationRun = null;
  let migrationFailure = null;
  let migrationAdapter = null;
  let tenantContextBuffer = null;
  let failurePhase = "credential-input";
  let failurePostStateSha256 = null;
  let migrationFailureCanBeRecorded = true;
  let secretsManagerClient = null;
  try {
    const master = await withAwsAccessDeniedCode(
      "LAWOS_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED",
      () => resolveSecret({
        secretId: requiredText(
          env.LAWOS_MASTER_DATABASE_SECRET_ID,
          "LAWOS_MASTER_DATABASE_SECRET_ID",
        ),
        region,
      }),
    );
    let masterUsername;
    let masterPassword;
    try {
      masterUsername = exactRequiredText(
        master?.username,
        "master database username",
      );
      masterPassword = exactRequiredText(
        master?.password,
        "master database password",
      );
    } catch {
      fail(
        "LAWOS_OUTLOOK_DATABASE_MASTER_ROLE",
        "Outlook database bootstrap master credential is invalid",
      );
    }
    assertOutlookMasterDatabaseTarget(master, databaseTarget);
    const tenantContext = await withAwsAccessDeniedCode(
      "LAWOS_PROGRAM_TENANT_CONTEXT_SECRET_READ_ACCESS_DENIED",
      () => resolveSecret({
        secretId: requiredText(
          env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
          "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
        ),
        region,
      }),
    );
    const outlookControl = await withAwsAccessDeniedCode(
      "LAWOS_PROGRAM_OUTLOOK_CONTROL_SECRET_READ_ACCESS_DENIED",
      () => resolveSecret({ secretId: outlookSecretIds.control, region }),
    );
    const outlookAssignment = await withAwsAccessDeniedCode(
      "LAWOS_PROGRAM_OUTLOOK_ASSIGNMENT_SECRET_READ_ACCESS_DENIED",
      () => resolveSecret({ secretId: outlookSecretIds.assignment, region }),
    );
    const outlookLifecycleVerifier = await withAwsAccessDeniedCode(
      "LAWOS_PROGRAM_OUTLOOK_LIFECYCLE_VERIFIER_SECRET_READ_ACCESS_DENIED",
      () => resolveSecret({
        secretId: outlookSecretIds.lifecycleVerifier,
        region,
      }),
    );
    const outlookControlSecret = structuredOutlookDatabaseSecret({
      current: outlookControl,
      env,
      expectedUsername: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
    });
    const outlookAssignmentSecret = structuredOutlookDatabaseSecret({
      current: outlookAssignment,
      env,
      expectedUsername: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
    });
    const outlookLifecycleVerifierSecret = structuredOutlookDatabaseSecret({
      current: outlookLifecycleVerifier,
      env,
      expectedUsername: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    });
    if (new Set([
      outlookControlSecret.password,
      outlookAssignmentSecret.password,
      outlookLifecycleVerifierSecret.password,
    ]).size !== 3) {
      fail(
        "LAWOS_OUTLOOK_DATABASE_SECRET",
        "Outlook database credentials must use independent passwords",
      );
    }
    let tenantContextSecret;
    try {
      tenantContextSecret = exactRequiredText(
        tenantContext?.tenant_context_secret
          ?? tenantContext?.TENANT_CONTEXT_SECRET,
        "tenant context secret",
      );
      if (Buffer.byteLength(tenantContextSecret, "utf8") < 32) {
        throw new TypeError("tenant context secret is too short");
      }
    } catch {
      fail(
        "LAWOS_OUTLOOK_DATABASE_SECRET",
        "Outlook tenant context credential is invalid",
      );
    }
    tenantContextBuffer = Buffer.from(tenantContextSecret, "utf8");
    const historicalBootstrapOptions = Object.hasOwn(authorization.packet.target,
      "historical_outlook_bootstrap_sha256") ? {
        historicalOutlookBootstrapSha256: authorization.packet.target.historical_outlook_bootstrap_sha256,
      } : {};
    migrationAdapter = assertOutlookMigrationAdapter(
      createOutlookMigrationAdapter({
        ...historicalBootstrapOptions,
        approvedTenantIds,
        controlPassword: outlookControlSecret.password,
        assignmentPassword: outlookAssignmentSecret.password,
        lifecycleVerifierPassword:
          outlookLifecycleVerifierSecret.password,
        tenantContextSecret: tenantContextBuffer,
        authorityManifestSha256: outlookAuthorityManifestSha256,
        databaseTargetReceiptSha256:
          authorization.database_target_receipt_sha256,
        migrationCatalogSha256,
      }),
      {
        ...historicalBootstrapOptions,
        authorityManifestSha256: outlookAuthorityManifestSha256,
        databaseTargetReceiptSha256:
          authorization.database_target_receipt_sha256,
        migrationCatalogSha256,
      },
    );
    pool = createPool({
      connectionString: postgresUrlFromSecret(JSON.stringify({
        username: masterUsername,
        password: masterPassword,
        host: databaseTarget.endpoint_host,
        port: databaseTarget.endpoint_port,
        dbname: databaseTarget.database_name,
      })),
      sslMode: "verify-full",
      applicationName: "lawos-outlook-authority-bootstrap-001-007",
      connectionTimeoutMillis: 10_000,
      statementTimeoutMillis: 120_000,
      max: 1,
    });
    failurePhase = "postgres-precondition";
    runnerStarted = true;
    const rawMigrationRun = await runOutlookAuthorityMigrations(pool, {
      appliedBy: `lawos-production:${authorization.exact.sourceSha}`,
      ...migrationAdapter.runnerOptions,
    });
    roleBootstrap = assertOutlookRoleReadiness(
      migrationAdapter.getRoleReadiness(),
      approvedTenantIds,
    );
    migrationRun = assertOutlookMigrationRunSummary(
      migrationAdapter.normalizeRunReceipt(rawMigrationRun),
      {
        ...historicalBootstrapOptions,
        roleBootstrap,
        approvedTenantIds,
        authorityManifestSha256: outlookAuthorityManifestSha256,
        databaseTargetReceiptSha256:
          authorization.database_target_receipt_sha256,
        migrationCatalogSha256,
      },
    );
    runnerCompleted = true;
    mutation.postgresAttempted =
      migrationRun.postgres_mutation_attempt_count;
    mutation.postgresCommitted =
      migrationRun.postgres_mutation_committed_count;
    failurePostStateSha256 = migrationRun.authority_postflight_sha256;
    const secretsClient = () => {
      secretsManagerClient ??= new SecretsManagerClient({ region });
      return secretsManagerClient;
    };
    const writer = putSecret ?? (async ({
      secretId,
      secretString,
      clientRequestToken,
    }) => secretsClient().send(new PutSecretValueCommand({
          SecretId: secretId,
          SecretString: secretString,
          ClientRequestToken: clientRequestToken,
        })));
    const reader = getSecret ?? (async ({
      secretId,
      versionId,
      versionStage,
    }) => secretsClient().send(new GetSecretValueCommand({
      SecretId: secretId,
      ...(versionId === undefined ? {} : { VersionId: versionId }),
      ...(versionStage === undefined ? {} : { VersionStage: versionStage }),
    })));
    failurePhase = "secret-publication";
    const roleSecretsToPublish =
      migrationRun.role_configuration_transaction_committed_count === 1 ? [
        [outlookSecretIds.control, outlookControlSecret],
        [outlookSecretIds.assignment, outlookAssignmentSecret],
        [outlookSecretIds.lifecycleVerifier, outlookLifecycleVerifierSecret],
      ] : [];
    for (const [secretId, secret] of roleSecretsToPublish) {
      mutation.secretAttempted += 1;
      try {
        await publishJsonPostgresOutlookDatabaseSecret({
          secretId,
          secretString: canonicalizeJson(secret),
          operationBindingSha256: claimEvidence.operation_binding_sha256,
          claimSha256: claimEvidence.claim_sha256,
          putSecretValue: writer,
          getSecretValue: reader,
        });
        mutation.secretCommitted += 1;
      } catch (error) {
        if (error?.outlook_secret_publication
          ?.secret_write_commit_ambiguous === true) {
          mutation.secretCommitted = null;
        }
        throw error;
      }
    }
    const counts = outlookInvocationCounts({
      claimEnvelope,
      ...mutation,
    });
    const observedTerminalBindings = outlookTerminalBindings({
      authorization,
      claimReceipt: claimEvidence,
      authorityCatalogSha256: outlookAuthorityManifestSha256,
      migrationCatalogSha256,
      roleBootstrapSha256: roleBootstrap.role_bootstrap_sha256,
    });
    const terminal = createJsonPostgresOutlookAuthorityTerminal({
      schema_version: JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
      status: "PASS",
      bindings: observedTerminalBindings,
      recorded_at: new Date(now).toISOString(),
      ...counts,
      result: {
        outcome: "PASS",
        migration_applied_count: migrationRun.migration_applied_count,
        role_configuration_transaction_committed_count:
          migrationRun.role_configuration_transaction_committed_count,
        outlook_database_role_count: roleBootstrap.role_count,
        outlook_login_role_count: roleBootstrap.login_role_count,
        outlook_tenant_authority_count:
          roleBootstrap.tenant_authority_count,
        outlook_membership_edge_count: roleBootstrap.membership_edge_count,
        synthetic_wildcard_count: roleBootstrap.synthetic_wildcard_count,
        migration_run_receipt_sha256:
          migrationRun.migration_run_receipt_sha256,
        authority_postflight_sha256:
          migrationRun.authority_postflight_sha256,
        password_returned: false,
        secret_material_returned: false,
      },
      failure: null,
      postgres_receipt: { kind: "run", receipt: migrationRun },
    });
    failurePhase = "terminal-evidence";
    const terminalWrite = assertOutlookTerminalWrite(
      await withAwsAccessDeniedCode(
        "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_WRITE_ACCESS_DENIED",
        () => writeOutlookTerminal({
          terminal,
          bindings: observedTerminalBindings,
          ...terminalStorage,
        }),
      ),
      terminal,
    );
    await pool.end();
    pool = null;
    return outlookPassResult({
      claimEnvelope,
      migrationRun,
      counts,
      terminalWrite,
    });
  } catch (error) {
    if (runnerStarted && !runnerCompleted) {
      try {
        migrationFailure = assertOutlookMigrationFailureSummary(
          migrationAdapter.normalizeFailureReceipt(error),
          {
            roleBootstrap,
            authorityManifestSha256: outlookAuthorityManifestSha256,
            databaseTargetReceiptSha256:
              authorization.database_target_receipt_sha256,
            migrationCatalogSha256,
          },
        );
        failurePhase = outlookTerminalFailurePhase(migrationFailure);
        mutation.postgresAttempted =
          migrationFailure.postgres_mutation_attempt_count;
        mutation.postgresCommitted =
          migrationFailure.postgres_mutation_committed_count;
        failurePostStateSha256 = migrationFailure.failure_receipt_sha256;
      } catch {
        migrationFailureCanBeRecorded = false;
      }
    }
    if (migrationFailureCanBeRecorded) {
      try {
        const counts = outlookInvocationCounts({
          claimEnvelope,
          ...mutation,
        });
        const roleBootstrapSha256 = migrationFailure?.role_bootstrap_sha256
          ?? roleBootstrap?.role_bootstrap_sha256 ?? null;
        const partialBindings = outlookTerminalBindings({
          authorization,
          claimReceipt: claimEvidence,
          authorityCatalogSha256: outlookAuthorityManifestSha256,
          migrationCatalogSha256,
          roleBootstrapSha256,
        });
        const terminal = createJsonPostgresOutlookAuthorityTerminal({
          schema_version:
            JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
          status: "PARTIAL",
          bindings: partialBindings,
          recorded_at: new Date(now).toISOString(),
          ...counts,
          result: null,
          failure: {
            error_code: safeOutlookAuthorityFailureCode(error),
            failure_phase: failurePhase,
            post_state_sha256: failurePostStateSha256,
          },
          postgres_receipt: migrationRun === null
            ? migrationFailure === null ? null
              : { kind: "failure", receipt: migrationFailure }
            : { kind: "run", receipt: migrationRun },
        });
        await writeOutlookTerminal({
          terminal,
          bindings: partialBindings,
          ...terminalStorage,
        });
      } catch {
        // Preserve the primary failure when immutable PARTIAL recording fails.
      }
    }
    throw error;
  } finally {
    try { migrationAdapter?.dispose(); } catch {}
    tenantContextBuffer?.fill(0);
    if (pool) await pool.end();
    secretsManagerClient?.destroy();
  }
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
      baseManifest: inputs.baseManifest,
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

const W15_CONSUMER_FAMILY_BY_WAVE = Object.freeze({
  1: "core-employee-roster",
  2: "recruiting-lifecycle",
  3: "leave-attendance",
  4: "payroll-compensation",
});

function relationalProjectionRolloutRequest(event) {
  if (event.rollout_action === "disable") {
    return Object.freeze({ action: "disable" });
  }
  const rolloutWave = Number(event.rollout_wave);
  const queryFamily = String(event.query_family ?? "");
  const maxStalenessMs = Number(event.max_staleness_ms);
  if (event.rollout_action !== "enable"
    || !HRX_RELATIONAL_QUERY_FAMILIES.includes(queryFamily)
    || queryFamily === "shadow-only"
    || !Number.isSafeInteger(rolloutWave)
    || W15_CONSUMER_FAMILY_BY_WAVE[rolloutWave] !== queryFamily
    || !Number.isSafeInteger(maxStalenessMs)
    || maxStalenessMs < 1
    || maxStalenessMs > 3_600_000) {
    fail(
      "LAWOS_HRX_PROJECTION_ROLLOUT_INPUT",
      "relational projection rollout request is invalid",
    );
  }
  return Object.freeze({
    action: "enable",
    queryFamily,
    rolloutWave,
    maxStalenessMs,
  });
}

export async function executeJsonPostgresW15InventoryBootstrap({
  event,
  env = process.env,
  authorize = loadJsonPostgresW15BootstrapAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  loadInputs = loadJsonPostgresW15BootstrapInputs,
  resolveSecret = resolveAwsJsonSecret,
  putSecret,
  createPool = createPostgresPool,
  runMigrations = runHrxPostgresMigrations,
  configureRole = configureHrxProjectionRole,
  collectInventory = collectHrxRelationalProductionInventory,
  inspectSchema = inspectHrxRelationalSchema,
  writeEvidence = writeJsonPostgresProgramEvidence,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
} = {}) {
  if (event.action !== JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION
    || !["schema-bootstrap", "inventory-read"].includes(event.mode)) {
    fail(
      "LAWOS_PROGRAM_ACTION",
      "W15 inventory bootstrap mode is invalid",
    );
  }
  const executionRole = env.LAWOS_PROGRAM_EXECUTION_ROLE
    ?? "projection-admin";
  if ((event.mode === "schema-bootstrap"
      && executionRole !== "projection-admin")
    || (event.mode === "inventory-read"
      && executionRole !== "projection-auditor")) {
    fail(
      "LAWOS_HRX_PROJECTION_EXECUTION_ROLE",
      "W15 inventory bootstrap role cannot run the requested mode",
    );
  }
  const authorization = await authorize({ event, env, s3Client });
  const claimEvidence = await claim({
    event,
    authorization,
    env,
    client: s3Client,
  });
  const inputs = await loadInputs({
    inputLocators: event.inputs,
    trustRegistry: authorization.trustRegistry,
    packet: authorization.packet,
    mode: event.mode,
    schemaBootstrapResultSha256:
      event.schema_bootstrap_result_sha256 ?? null,
    env,
    s3Client,
  });
  const region = requiredText(
    env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
    "AWS region",
  );
  const tenantContext = await resolveSecret({
    secretId: requiredText(
      env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
      "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
    ),
    region,
  });
  const tenantContextSecret = tenantContextValue(tenantContext);
  const approvedTenantIds =
    authorization.packet.target.approved_tenant_ids;

  if (event.mode === "schema-bootstrap") {
    if (event.schema_bootstrap_result_sha256 != null) {
      fail(
        "LAWOS_HRX_PROJECTION_BOOTSTRAP_INPUT",
        "schema bootstrap cannot accept a prior bootstrap result",
      );
    }
    const [master, writerValue, auditorValue] = await Promise.all([
      resolveSecret({
        secretId: requiredText(
          env.LAWOS_MASTER_DATABASE_SECRET_ID,
          "LAWOS_MASTER_DATABASE_SECRET_ID",
        ),
        region,
      }),
      resolveSecret({
        secretId: requiredText(
          env.LAWOS_PROJECTION_DATABASE_SECRET_ID,
          "LAWOS_PROJECTION_DATABASE_SECRET_ID",
        ),
        region,
      }),
      resolveSecret({
        secretId: requiredText(
          env.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
          "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
        ),
        region,
      }),
    ]);
    const writerSecret = structuredProjectionSecret({
      current: writerValue,
      env,
      expectedUsername: HRX_PROJECTION_WRITER_ROLE,
    });
    const auditorSecret = structuredProjectionSecret({
      current: auditorValue,
      env,
      expectedUsername: HRX_PROJECTION_AUDITOR_ROLE,
    });
    const masterPool = createPool({
      connectionString: postgresUrlFromSecret(JSON.stringify({
        ...master,
        host: env.LAWOS_DATABASE_HOST,
        port: env.LAWOS_DATABASE_PORT,
        dbname: env.LAWOS_DATABASE_NAME,
      })),
      sslMode: "verify-full",
      applicationName: "lawos-w15-inventory-bootstrap-admin",
      connectionTimeoutMillis: 10_000,
      statementTimeoutMillis: 120_000,
      max: 1,
    });
    let migrations;
    let role;
    try {
      migrations = await runMigrations(masterPool, {
        appliedBy: `lawos-w15-bootstrap:${authorization.exact.sourceSha}`,
      });
      const client = await masterPool.connect();
      try {
        role = await configureRole(client, {
          password: writerSecret.password,
          auditorPassword: auditorSecret.password,
          tenantContextSecret,
          approvedTenantIds,
        });
      } finally {
        client.release();
      }
    } finally {
      await masterPool.end();
    }
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
    await Promise.all([
      writer({
        secretId: requiredText(
          env.LAWOS_PROJECTION_DATABASE_SECRET_ID,
          "LAWOS_PROJECTION_DATABASE_SECRET_ID",
        ),
        secretString: JSON.stringify(writerSecret),
      }),
      writer({
        secretId: requiredText(
          env.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
          "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
        ),
        secretString: JSON.stringify(auditorSecret),
      }),
    ]);
    const material = {
      schema_version:
        "law-firm-os.json-postgres-w15-inventory-schema-bootstrap.v1",
      outcome: "PASS",
      action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
      phase: authorization.packet.phase,
      mode: event.mode,
      source_sha: authorization.exact.sourceSha,
      source_tree: authorization.exact.sourceTree,
      packet_sha256: authorization.packet.packet_sha256,
      migration_catalog_sha256:
        authorization.packet.bindings.migration_catalog_sha256,
      predecessor_receipt_count: inputs.predecessors.length,
      safe_counts: {
        approved_tenant_count: approvedTenantIds.length,
        migration_count: migrations.length,
        migration_applied_count:
          migrations.filter((migration) => migration.applied).length,
        projection_role_grant_count: role.grant_statement_count,
        consumer_write_grant_count: role.consumer_write_grant_count,
        auditor_write_grant_count: role.auditor_write_grant_count,
        projection_data_write_count: 0,
        source_authority_write_count: 0,
        consumer_route_change_count: 0,
      },
      claims: {
        generic_ledger_authority_preserved: true,
        schema_and_role_bootstrap_only: true,
        projection_data_written: false,
        consumer_rollout_performed: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    };
    const result = Object.freeze({
      ...material,
      result_sha256: createHash("sha256")
        .update(canonicalizeJson(material))
        .digest("hex"),
    });
    const evidence = await writeEvidence({
      kind: "w15-inventory-schema-bootstrap",
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

  const schemaBootstrapResultSha256 = exactDigest(
    event.schema_bootstrap_result_sha256,
    "schema_bootstrap_result_sha256",
  );
  if (inputs.schemaBootstrapResult?.result_sha256
      !== schemaBootstrapResultSha256) {
    fail(
      "LAWOS_HRX_PROJECTION_BOOTSTRAP_INPUT",
      "inventory read is not bound to immutable schema bootstrap evidence",
    );
  }
  const auditorValue = await resolveSecret({
    secretId: requiredText(
      env.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
      "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
    ),
    region,
  });
  const auditorSecret = structuredProjectionSecret({
    current: auditorValue,
    env,
    expectedUsername: HRX_PROJECTION_AUDITOR_ROLE,
  });
  const provenance = createJsonPostgresW15InventoryProvenance({
    sourceSha: authorization.exact.sourceSha,
    sourceTree: authorization.exact.sourceTree,
    bootstrapPacketSha256: authorization.packet.packet_sha256,
    schemaBootstrapResultSha256,
  });
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(auditorSecret)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: "lawos-w15-production-inventory-auditor",
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 120_000,
    max: 1,
  });
  let inventory;
  let schema;
  try {
    [inventory, schema] = await Promise.all([
      collectInventory({
        pool,
        approvedTenantIds,
        inventoryProvenanceSha256: provenance.provenance_sha256,
      }),
      inspectSchema(pool),
    ]);
  } finally {
    await pool.end();
  }
  const material = {
    schema_version:
      "law-firm-os.json-postgres-w15-inventory-observation.v1",
    outcome: "PASS",
    action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    phase: authorization.packet.phase,
    mode: event.mode,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    schema_bootstrap_result_sha256: schemaBootstrapResultSha256,
    provenance,
    inventory,
    schema,
    predecessor_receipt_count: inputs.predecessors.length,
    safe_counts: {
      approved_tenant_count: approvedTenantIds.length,
      source_record_count: inventory.source_record_count,
      table_count: inventory.table_count,
      projection_data_write_count: 0,
      source_authority_write_count: 0,
      consumer_route_change_count: 0,
    },
    claims: {
      generic_ledger_authority_preserved: true,
      aggregate_inventory_only: true,
      projection_data_written: false,
      consumer_rollout_performed: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = Object.freeze({
    ...material,
    result_sha256: createHash("sha256")
      .update(canonicalizeJson(material))
      .digest("hex"),
  });
  const evidence = await writeEvidence({
    kind: "w15-production-inventory",
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

export async function executeJsonPostgresRelationalProjection({
  event,
  env = process.env,
  authorize = loadJsonPostgresProgramAuthorization,
  claim = claimJsonPostgresProgramInvocation,
  loadInputs = loadJsonPostgresProjectionInputs,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  verifyMigrations = verifyClientOperationsPostgresMigrations,
  project = projectHrxRelationalReadModel,
  collectInventory = collectHrxRelationalProductionInventory,
  validateProjection = validateHrxRelationalReadModel,
  activateConsumerRoute = activateHrxProjectionConsumerRoute,
  disableConsumerRoutes = disableHrxProjectionConsumerRoutes,
  refreshConsumerRoutes = refreshHrxProjectionConsumerRoutes,
  transaction = withPostgresTransaction,
  writeEvidence = writeJsonPostgresProgramEvidence,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
} = {}) {
  if (event.action !== JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION
    || !["commit", "resume", "readback", "reconcile", "rollout"].includes(event.mode)) {
    fail("LAWOS_PROGRAM_ACTION", "relational projection mode is invalid");
  }
  const executionRole = env.LAWOS_PROGRAM_EXECUTION_ROLE
    ?? "projection-admin";
  if (![
    "projection-admin",
    "projection-auditor",
    "projection-writer",
  ].includes(executionRole)
    || (executionRole === "projection-auditor"
      && !["readback", "reconcile"].includes(event.mode))
    || (executionRole === "projection-writer" && event.mode !== "resume")) {
    fail(
      "LAWOS_HRX_PROJECTION_EXECUTION_ROLE",
      "relational projection execution role cannot run the requested mode",
    );
  }
  const requestedBackfillWave = event.backfill_wave == null
    ? null
    : Number(event.backfill_wave);
  if ((event.mode === "commit" && requestedBackfillWave !== 1)
    || (event.mode === "resume"
      && requestedBackfillWave != null
      && (!Number.isSafeInteger(requestedBackfillWave)
        || requestedBackfillWave < 1
        || requestedBackfillWave > 5))
    || (!["commit", "resume"].includes(event.mode)
      && requestedBackfillWave != null)) {
    fail(
      "LAWOS_HRX_PROJECTION_WAVE_INPUT",
      "relational projection backfill wave is invalid",
    );
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
  const rolloutRequest = event.mode === "rollout"
    ? relationalProjectionRolloutRequest(event)
    : null;
  if (rolloutRequest?.action === "enable" && !inputs.validationEvidence) {
    fail(
      "LAWOS_HRX_PROJECTION_VALIDATION_GATE",
      "consumer rollout requires exact independent PASS validation evidence",
    );
  }
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const readback = ["readback", "reconcile"].includes(event.mode);
  const runtimeSecretId = readback
    ? requiredText(
      env.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
      "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
    )
    : requiredText(
      env.LAWOS_PROJECTION_DATABASE_SECRET_ID,
      "LAWOS_PROJECTION_DATABASE_SECRET_ID",
    );
  const [runtimeSecretValue, tenantContext] = await Promise.all([
    resolveSecret({ secretId: runtimeSecretId, region }),
    resolveSecret({
      secretId: requiredText(
        env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
        "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
      ),
      region,
    }),
  ]);
  const runtimeSecret = structuredProjectionSecret({
    current: runtimeSecretValue,
    env,
    expectedUsername: readback
      ? HRX_PROJECTION_AUDITOR_ROLE
      : HRX_PROJECTION_WRITER_ROLE,
  });
  const tenantContextSecret = tenantContextValue(tenantContext);
  const role = {
    grant_statement_count: 0,
    consumer_write_grant_count: 0,
    auditor_write_grant_count: 0,
  };
  const pool = createPool({
    connectionString: postgresUrlFromSecret(JSON.stringify(runtimeSecret)),
    sslMode: "verify-full",
    tenantContextSecret,
    applicationName: readback
      ? "lawos-hrx-relational-auditor"
      : "lawos-hrx-relational-projection",
    connectionTimeoutMillis:
      inputs.performanceAcceptance.connection_timeout_ms,
    statementTimeoutMillis:
      inputs.performanceAcceptance.statement_timeout_ms,
    max: Math.min(2, inputs.performanceAcceptance.pool_max),
  });
  const approvedTenantIds = authorization.packet.target.approved_tenant_ids;
  if (event.mode === "rollout") {
    const rollout = rolloutRequest;
    const routeResults = [];
    try {
      await verifyMigrations(pool);
      for (const tenantId of approvedTenantIds) {
        routeResults.push(await transaction(
          pool,
          {
            tenant_id: tenantId,
            statementTimeoutMillis:
              inputs.performanceAcceptance.statement_timeout_ms,
            maxAttempts: 1,
          },
          (client) => rollout.action === "enable"
            ? activateConsumerRoute(client, {
              tenantId,
              queryFamily: rollout.queryFamily,
              rolloutWave: rollout.rolloutWave,
              mappingManifest: inputs.mappingManifest,
              validationEvidence: inputs.validationEvidence,
              maxStalenessMs: rollout.maxStalenessMs,
            })
            : disableConsumerRoutes(client, { tenantId }),
        ));
      }
    } finally {
      await pool.end();
    }
    if (routeResults.some((item) =>
      rollout.action === "enable"
        ? item.enabled !== true
          || item.authority_promoted !== false
          || item.mapping_sha256 !== inputs.mappingManifest.manifest_sha256
          || item.validation_result_sha256
            !== inputs.validationEvidence.result_sha256
        : item.generic_ledger_fallback !== true
          || item.projection_rows_deleted !== false)) {
      fail(
        "LAWOS_HRX_PROJECTION_ROLLOUT_GATE",
        "consumer rollout result violated the read-only authority contract",
      );
    }
    const enabledCount = rollout.action === "enable"
      ? routeResults.length
      : 0;
    const disabledCount = rollout.action === "disable"
      ? routeResults.reduce(
        (total, item) => total + Number(item.disabled_route_count ?? 0),
        0,
      )
      : 0;
    const material = {
      schema_version:
        "law-firm-os.hrx-relational-projection-consumer-rollout.v1",
      outcome: "PASS",
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      phase: authorization.packet.phase,
      mode: "rollout",
      rollout_action: rollout.action,
      source_sha: authorization.exact.sourceSha,
      source_tree: authorization.exact.sourceTree,
      packet_sha256: authorization.packet.packet_sha256,
      mapping_manifest_sha256: inputs.mappingManifest.manifest_sha256,
      validation_result_sha256: rollout.action === "enable"
        ? inputs.validationEvidence.result_sha256
        : null,
      query_family: rollout.queryFamily ?? null,
      rollout_wave: rollout.rolloutWave ?? null,
      safe_counts: {
        approved_tenant_count: approvedTenantIds.length,
        consumer_route_enabled_count: enabledCount,
        consumer_route_disabled_count: disabledCount,
        source_authority_write_count: 0,
        projection_authority_promotion_count: 0,
        json_fallback_count: 0,
        consumer_write_grant_count: 0,
      },
      claims: {
        generic_ledger_authority_preserved: true,
        projection_consumers_read_only: true,
        authority_promotion_not_granted: true,
        fallback_authority: "postgres-v2-generic-ledger",
        rollback_deletes_projection_rows: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    };
    const result = Object.freeze({
      ...material,
      result_sha256: createHash("sha256")
        .update(canonicalizeJson(material))
        .digest("hex"),
    });
    const evidence = await writeEvidence({
      kind: "w15-consumer-rollout-result",
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
  const negativeTenantId = unapprovedProjectionTenant(approvedTenantIds);
  if (readback) {
    let validation;
    try {
      await verifyMigrations(pool);
      validation = await validateProjection({
        pool,
        approvedTenantIds,
        negativeTenantId,
        mappingManifest: inputs.mappingManifest,
        performanceAcceptance: inputs.performanceAcceptance,
        sourceSha: authorization.exact.sourceSha,
        sourceTree: authorization.exact.sourceTree,
        packetSha256: authorization.packet.packet_sha256,
        receiptVerificationFailureCount: 0,
      });
    } finally {
      await pool.end();
    }
    if (validation.outcome !== "PASS") {
      return Object.freeze({
        ...validation,
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        phase: authorization.packet.phase,
        source_sha: authorization.exact.sourceSha,
        source_tree: authorization.exact.sourceTree,
        packet_sha256: authorization.packet.packet_sha256,
        validation_evidence_sha256: null,
        approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
        authorization_claim_sha256: claimEvidence.claim_sha256,
      });
    }
    const evidence = await writeEvidence({
      kind: "w15-relational-projection-validation",
      value: validation,
      event,
      authorization,
      env,
      client: s3Client,
    });
    return Object.freeze({
      ...validation,
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      phase: authorization.packet.phase,
      source_sha: authorization.exact.sourceSha,
      source_tree: authorization.exact.sourceTree,
      packet_sha256: authorization.packet.packet_sha256,
      validation_evidence_sha256: evidence.sha256,
      approval_receipt_sha256: claimEvidence.approval_receipt_sha256,
      authorization_claim_sha256: claimEvidence.claim_sha256,
    });
  }
  const requestedProjectionMode =
    event.mode === "commit" ? "backfill" : "resume";
  const projected = [];
  const refreshedRoutes = [];
  const projectionResultIsSafe = (item) =>
    item.outcome === "PASS"
    && item.claims?.one_way_projection === true
    && item.claims?.operational_request_dual_write === false
    && item.claims?.generic_ledger_authority_preserved === true
    && item.claims?.projection_write_authority === false
    && item.safe_counts?.remaining_outbox_event_count === 0
    && item.safe_counts?.tenant_negative_visible_count === 0
    && item.safe_counts?.source_authority_write_count === 0
    && item.safe_counts?.dual_write_count === 0
    && item.safe_counts?.partial_commit_count === 0
    && item.safe_counts?.unmapped_nonnull_field_count === 0
    && item.safe_counts?.physical_delete_count === 0;
  try {
    await verifyMigrations(pool);
    if (event.mode === "commit") {
      const observedInventory = await collectInventory({
        pool,
        approvedTenantIds,
        inventoryProvenanceSha256:
          inputs.productionInventory.inventory_provenance_sha256,
      });
      if (observedInventory.inventory_sha256
        !== inputs.productionInventory.inventory_sha256) {
        fail(
          "LAWOS_HRX_PROJECTION_INVENTORY_DRIFT",
          "production HRX inventory drifted before the first backfill write",
        );
      }
    }
    for (const tenantId of approvedTenantIds) {
      projected.push(await project({
        pool,
        tenant_id: tenantId,
        mode: requestedProjectionMode,
        mappingManifest: inputs.mappingManifest,
        performanceAcceptance: inputs.performanceAcceptance,
        workerRef: event.attempt_ref,
        backfillWave: requestedBackfillWave,
        negativeTenantId,
      }));
    }
    const projectedModes = new Set(projected.map((item) => item.mode));
    const incrementalProjection =
      projectedModes.size === 1 && projected[0]?.mode === "incremental";
    if (incrementalProjection) {
      if (!inputs.validationEvidence
        || projected.some((item) => !projectionResultIsSafe(item))) {
        fail(
          "LAWOS_HRX_PROJECTION_ROUTE_REFRESH_GATE",
          "incremental route refresh requires exact PASS validation and a complete safe catch-up",
        );
      }
      for (const tenantId of approvedTenantIds) {
        refreshedRoutes.push(await transaction(
          pool,
          {
            tenant_id: tenantId,
            statementTimeoutMillis:
              inputs.performanceAcceptance.statement_timeout_ms,
            maxAttempts: 1,
          },
          (client) => refreshConsumerRoutes(client, {
            tenantId,
            mappingManifest: inputs.mappingManifest,
            validationEvidence: inputs.validationEvidence,
          }),
        ));
      }
    }
  } finally {
    await pool.end();
  }
  if (projected.some((item) => !projectionResultIsSafe(item))) {
    fail("LAWOS_HRX_PROJECTION_GATE", "relational projection result violated the one-way authority gate");
  }
  const resolvedProjectionModes =
    new Set(projected.map((item) => item.mode));
  if (resolvedProjectionModes.size !== 1
    || !["backfill", "incremental"].includes(
      projected[0]?.mode,
    )
    || (event.mode === "commit" && projected[0].mode !== "backfill")) {
    fail(
      "LAWOS_HRX_PROJECTION_MODE",
      "relational projection result mode drifted from the executed boundary",
    );
  }
  const resolvedProjectionMode = projected[0].mode;
  const sum = (key) => projected.reduce((total, item) => total + Number(item.safe_counts?.[key] ?? 0), 0);
  const maximum = (key) => projected.reduce(
    (result, item) =>
      Math.max(result, Number(item.safe_counts?.[key] ?? 0)),
    0,
  );
  const material = {
    schema_version: "law-firm-os.hrx-relational-projection-execution.v2",
    outcome: "PASS",
    action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
    phase: authorization.packet.phase,
    mode: resolvedProjectionMode,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    mapping_manifest_sha256: inputs.mappingManifest.manifest_sha256,
    production_inventory_sha256: inputs.productionInventory.inventory_sha256,
    performance_acceptance_sha256:
      inputs.performanceAcceptance.acceptance_sha256,
    backfill_wave: projected[0]?.backfill_wave ?? null,
    predecessor_receipt_count: inputs.predecessors.length,
    bootstrap_performed: false,
    migration_count: 0,
    migration_applied_count: 0,
    projection_role_grant_count: role.grant_statement_count,
    safe_counts: {
      approved_tenant_count: approvedTenantIds.length,
      source_record_count: sum("source_record_count"),
      projected_insert_count: sum("projected_insert_count"),
      projected_update_count: sum("projected_update_count"),
      projected_noop_count: sum("projected_noop_count"),
      committed_batch_count: sum("committed_batch_count"),
      completed_backfill_wave_count:
        sum("completed_backfill_wave_count"),
      consumed_outbox_event_count: sum("consumed_outbox_event_count"),
      observed_event_wave_1_count: sum("observed_event_wave_1_count"),
      observed_event_wave_2_count: sum("observed_event_wave_2_count"),
      observed_event_wave_3_count: sum("observed_event_wave_3_count"),
      observed_event_wave_4_count: sum("observed_event_wave_4_count"),
      observed_event_wave_5_count: sum("observed_event_wave_5_count"),
      remaining_outbox_event_count: sum("remaining_outbox_event_count"),
      observed_outbox_lag_ms: maximum("observed_outbox_lag_ms"),
      tenant_negative_visible_count: sum("tenant_negative_visible_count"),
      negative_tenant_context_denied_count: sum("negative_tenant_context_denied_count"),
      unmapped_nonnull_field_count: 0,
      physical_delete_count: 0,
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
      consumer_write_grant_count: role.consumer_write_grant_count,
      auditor_write_grant_count: role.auditor_write_grant_count,
      authority_promotion_count: 0,
      consumer_route_refresh_count: refreshedRoutes.reduce(
        (total, item) =>
          total + Number(item.refreshed_route_count ?? 0),
        0,
      ),
    },
    claims: {
      one_way_projection: true,
      bounded_checkpoint_resume: true,
      event_scoped_incremental_projection: true,
      physical_delete_prohibited: true,
      recurring_worker_uses_master_credentials: false,
      operational_request_dual_write: false,
      generic_ledger_authority_preserved: true,
      projection_write_authority: false,
      consumer_route_refresh_requires_zero_backlog: true,
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
    try {
      negativeVisible = await ledger.transaction({
        tenant_id: retirementNegativeTenant(authorization.packet.target.approved_tenant_ids),
        domain_id: "master-data",
      }, (tx) => tx.read({
        record_type: "OperationalAuthoritySmoke",
        record_id: recordId,
      }));
    } catch (error) {
      if (error?.code !== "LAWOS_POSTGRES_ACCESS_DENIED" || error?.status !== 403) throw error;
      negativeVisible = null;
    }
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
    if (event.action === JSON_POSTGRES_SCHEMA_GOVERNANCE_READBACK_ACTION) {
      return readJsonPostgresSchemaGovernance({ event });
    }
    event = await resolveJsonPostgresScheduledProgramEvent({
      event,
    });
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
      const result = await executeJsonPostgresRelationalProjection({ event });
      if (process.env.LAWOS_PROGRAM_EXECUTION_ROLE === "projection-writer") {
        console.log(JSON.stringify(createW15ProjectionWorkerMetric(result)));
      }
      return result;
    }
    if (event.action === JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION) {
      return await executeJsonPostgresW15InventoryBootstrap({ event });
    }
    if (event.action === JSON_POSTGRES_JSON_RETIREMENT_ACTION) {
      return await executeJsonPostgresRetirementSmoke({ event });
    }
    if (event.action === CATALOG_READBACK_ACTION) {
      return await executeProductionMigrationCatalogReadback({ event });
    }
    throw Object.assign(new Error("unsupported program administration action"), { code: "LAWOS_PROGRAM_ACTION" });
  } catch (error) {
    const safeErrorCode = safeJsonPostgresProgramErrorCode(error);
    if (process.env.LAWOS_PROGRAM_EXECUTION_ROLE === "projection-writer") {
      const workerError = new Error(
        "W15 projection worker invocation failed at a protected boundary",
      );
      workerError.name = "LawOSProjectionWorkerInvocationError";
      workerError.code = safeErrorCode;
      throw workerError;
    }
    return Object.freeze({
      outcome: "BLOCKED",
      action: [
        JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
        JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
        JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
        JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
        JSON_POSTGRES_JSON_RETIREMENT_ACTION,
        CATALOG_READBACK_ACTION,
        JSON_POSTGRES_SCHEMA_GOVERNANCE_READBACK_ACTION,
      ].includes(event.action)
        ? event.action
        : "unsupported-program-action",
      safe_error_code: safeErrorCode,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    });
  }
}
