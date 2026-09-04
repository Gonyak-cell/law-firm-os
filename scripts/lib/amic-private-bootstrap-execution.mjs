import { createHash } from "node:crypto";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  prepareJsonPostgresMigrationCorpus,
  runJsonPostgresMigration,
} from "../../packages/persistence/src/postgres/json-postgres-migration.js";
import {
  createJsonPostgresRecordTypeCatalog,
} from "../../packages/persistence/src/postgres/record-type-catalog.js";
import {
  AMIC_PRIVATE_BOOTSTRAP_MIGRATION_DRY_RUN_VERSION,
  AMIC_PRIVATE_BOOTSTRAP_PHOTO_VERSION_PLACEHOLDER,
  compileAmicPrivateBootstrapMigration,
  createAmicPrivateBootstrapDryRunReceipt,
} from "./amic-private-bootstrap-migration.mjs";

export const AMIC_PRIVATE_BOOTSTRAP_EXECUTION_ACTION =
  "lawos-amic-private-bootstrap-import";
export const AMIC_PRIVATE_BOOTSTRAP_EXECUTION_PACKET_VERSION =
  "law-firm-os.amic-private-bootstrap-execution-packet.v1";
export const AMIC_PRIVATE_BOOTSTRAP_EXECUTION_RESULT_VERSION =
  "law-firm-os.amic-private-bootstrap-execution-result.v1";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const AWS_ACCOUNT = /^\d{12}$/u;
const AWS_SECRET_NAME = /^[A-Za-z0-9_+=.@/-]{1,512}$/u;
const AWS_SECRET_ARN =
  /^arn:aws:secretsmanager:([a-z0-9-]+):(\d{12}):secret:([A-Za-z0-9_+=.@/-]{1,512})$/u;
const AWS_KMS_KEY_ARN =
  /^arn:aws:kms:([a-z0-9-]+):(\d{12}):key\/([A-Za-z0-9-]{1,128})$/u;
const S3_BUCKET = /^(?!\d+\.\d+\.\d+\.\d+$)(?!.*\.\.)(?!.*\.-)(?!.*-\.)(?!xn--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u;
const S3_PREFIX = /^[A-Za-z0-9_./-]{1,200}$/u;
const ENVIRONMENTS = new Set([
  "synthetic-test",
  "lawos-private-rehearsal",
  "lawos-production",
]);
const PACKET_KEYS = Object.freeze([
  "schema_version",
  "packet_id",
  "packet_sha256",
  "source_sha",
  "source_tree",
  "action",
  "environment",
  "mode",
  "bindings",
  "target",
  "counts",
  "allowed_effects",
  "current_state",
  "external_actions_authorized",
  "claims",
]);
const BINDING_KEYS = Object.freeze([
  "inventory_sha256",
  "mapping_sha256",
  "migration_manifest_sha256",
  "record_type_catalog_sha256",
  "photo_aggregate_sha256",
]);
const COUNT_KEYS = Object.freeze([
  "source_subject_count",
  "assigned_subject_count",
  "quarantined_subject_count",
  "directory_target_count",
  "hrx_record_count",
  "photo_target_count",
]);
const PRODUCTION_TARGET_KEYS = Object.freeze([
  "aws_account",
  "aws_region",
  "database_secret_ref",
  "tenant_context_secret_ref",
  "photo_bucket_name",
  "photo_expected_bucket_owner",
  "photo_kms_key_arn",
  "photo_prefix",
  "bucket_versioning_required",
  "bucket_owner_enforced",
  "public_access_block_required",
  "server_side_encryption",
]);

function fail(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requiredRef(value, label) {
  const ref = String(value ?? "").trim();
  if (!SAFE_REF.test(ref)) fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA", `${label} is invalid`);
  return ref;
}

function requiredDigest(value, label) {
  const digest = String(value ?? "");
  if (!SHA256.test(digest)) fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_BINDING", `${label} is invalid`);
  return digest;
}

function requiredAwsSecretRef(value, label, { awsRegion, awsAccount }) {
  const ref = String(value ?? "").trim();
  const arn = AWS_SECRET_ARN.exec(ref);
  if ((!arn && !AWS_SECRET_NAME.test(ref))
      || (arn && (arn[1] !== awsRegion || arn[2] !== awsAccount))) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET", `${label} is invalid`);
  }
  return ref;
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA", `${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA",
      `${label} contains unsupported fields`,
      { extras },
    );
  }
}

function packetMaterial(packet) {
  return Object.fromEntries(PACKET_KEYS
    .filter((key) => key !== "packet_sha256")
    .map((key) => [key, packet[key]]));
}

export function validateAmicPrivateBootstrapProductionTarget(target = {}) {
  closedObject(target, PRODUCTION_TARGET_KEYS, "production target");
  const awsAccount = String(target.aws_account ?? "");
  const awsRegion = String(target.aws_region ?? "");
  const bucket = String(target.photo_bucket_name ?? "");
  const expectedOwner = String(target.photo_expected_bucket_owner ?? "");
  const kmsArn = String(target.photo_kms_key_arn ?? "");
  const kmsMatch = AWS_KMS_KEY_ARN.exec(kmsArn);
  const prefix = String(target.photo_prefix ?? "");
  const databaseSecretRef = requiredAwsSecretRef(
    target.database_secret_ref,
    "database_secret_ref",
    { awsRegion, awsAccount },
  );
  const tenantContextSecretRef = requiredAwsSecretRef(
    target.tenant_context_secret_ref,
    "tenant_context_secret_ref",
    { awsRegion, awsAccount },
  );
  if (!AWS_ACCOUNT.test(awsAccount)
      || awsRegion !== "ap-northeast-2"
      || expectedOwner !== awsAccount
      || !S3_BUCKET.test(bucket)
      || !S3_PREFIX.test(prefix)
      || prefix.startsWith("/")
      || prefix.endsWith("/")
      || prefix.split("/").some((part) => part === "." || part === "..")
      || kmsMatch?.[1] !== awsRegion
      || kmsMatch?.[2] !== awsAccount
      || target.bucket_versioning_required !== true
      || target.bucket_owner_enforced !== true
      || target.public_access_block_required !== true
      || target.server_side_encryption !== "aws:kms"
      || databaseSecretRef === tenantContextSecretRef) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
      "production target infrastructure boundary is invalid",
    );
  }
  return Object.freeze({
    aws_account: awsAccount,
    aws_region: awsRegion,
    database_secret_ref: databaseSecretRef,
    tenant_context_secret_ref: tenantContextSecretRef,
    photo_bucket_name: bucket,
    photo_expected_bucket_owner: expectedOwner,
    photo_kms_key_arn: kmsArn,
    photo_prefix: prefix,
    bucket_versioning_required: true,
    bucket_owner_enforced: true,
    public_access_block_required: true,
    server_side_encryption: "aws:kms",
  });
}

function hashPacket(packet) {
  return sha256(Buffer.from(canonicalizeJson(packetMaterial(packet))));
}

function exactFalseClaims(claims) {
  closedObject(claims, [
    "source_mutated",
    "real_data_mutated",
    "postgres_write",
    "object_storage_write",
    "raw_identity_returned",
    "raw_photo_returned",
    "production_ready",
  ], "execution claims");
  if (Object.values(claims).some((value) => value !== false)) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_PACKET_CLAIM",
      "unsigned execution packet contains an affirmative claim",
    );
  }
}

export function validateAmicPrivateBootstrapExecutionPacket(packet = {}, {
  sourceSha = null,
  sourceTree = null,
} = {}) {
  closedObject(packet, PACKET_KEYS, "execution packet");
  if (packet.schema_version !== AMIC_PRIVATE_BOOTSTRAP_EXECUTION_PACKET_VERSION) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA", "execution packet schema is invalid");
  }
  requiredRef(packet.packet_id, "packet_id");
  if (!SHA1.test(packet.source_sha ?? "") || !SHA1.test(packet.source_tree ?? "")) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SOURCE", "source SHA and tree are invalid");
  }
  if ((sourceSha && packet.source_sha !== sourceSha)
      || (sourceTree && packet.source_tree !== sourceTree)) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SOURCE", "source binding drifted");
  }
  if (packet.action !== AMIC_PRIVATE_BOOTSTRAP_EXECUTION_ACTION
      || !ENVIRONMENTS.has(packet.environment)
      || packet.mode !== "commit") {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCOPE", "execution scope is invalid");
  }
  closedObject(packet.bindings, BINDING_KEYS, "execution bindings");
  if (Object.keys(packet.bindings).length !== BINDING_KEYS.length) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_BINDING", "execution bindings are incomplete");
  }
  for (const key of BINDING_KEYS) requiredDigest(packet.bindings[key], key);

  closedObject(packet.target, [
    "tenant_ref_sha256",
    "negative_tenant_ref_sha256",
    "photo_storage_provider",
    "photo_storage_adapter_ref_sha256",
    "object_versioning_required",
    "public_access",
    "production",
  ], "execution target");
  const tenantRef = requiredDigest(packet.target.tenant_ref_sha256, "tenant_ref_sha256");
  const negativeTenantRef = requiredDigest(
    packet.target.negative_tenant_ref_sha256,
    "negative_tenant_ref_sha256",
  );
  if (tenantRef === negativeTenantRef) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET", "negative tenant must be distinct");
  }
  const storageProvider = requiredRef(
    packet.target.photo_storage_provider,
    "photo_storage_provider",
  );
  requiredDigest(
    packet.target.photo_storage_adapter_ref_sha256,
    "photo_storage_adapter_ref_sha256",
  );
  if (packet.target.object_versioning_required !== true
      || packet.target.public_access !== false
      || (packet.environment !== "synthetic-test" && storageProvider !== "s3")) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
      "photo storage target must be private and versioned S3 outside synthetic tests",
    );
  }
  if (packet.environment === "synthetic-test") {
    if (packet.target.production !== null) {
      fail(
        "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
        "synthetic execution must not carry production infrastructure",
      );
    }
  } else {
    const normalizedProduction = validateAmicPrivateBootstrapProductionTarget(
      packet.target.production,
    );
    if (canonicalizeJson(normalizedProduction)
        !== canonicalizeJson(packet.target.production)) {
      fail(
        "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
        "production infrastructure target is not canonical",
      );
    }
  }

  closedObject(packet.counts, COUNT_KEYS, "execution counts");
  if (Object.keys(packet.counts).length !== COUNT_KEYS.length) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA", "execution counts are incomplete");
  }
  for (const key of COUNT_KEYS) {
    if (!Number.isSafeInteger(packet.counts[key]) || packet.counts[key] < 0) {
      fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA", `${key} is invalid`);
    }
  }
  if (packet.counts.assigned_subject_count
        + packet.counts.quarantined_subject_count
      !== packet.counts.source_subject_count) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA", "subject disposition counts do not close");
  }

  closedObject(packet.allowed_effects, [
    "postgres_write",
    "object_storage_write",
    "source_mutation",
    "public_distribution",
  ], "allowed effects");
  if (packet.allowed_effects.postgres_write !== true
      || packet.allowed_effects.object_storage_write !== true
      || packet.allowed_effects.source_mutation !== false
      || packet.allowed_effects.public_distribution !== false
      || packet.current_state !== "PENDING_HUMAN_APPROVAL"
      || packet.external_actions_authorized !== false) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_SCOPE", "unsigned packet effect boundary is invalid");
  }
  exactFalseClaims(packet.claims);
  const packetSha256 = hashPacket(packet);
  if (packet.packet_sha256 !== packetSha256) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_DIGEST", "execution packet digest drifted");
  }
  return Object.freeze({
    valid: true,
    packet_sha256: packetSha256,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    environment: packet.environment,
    action: packet.action,
  });
}

export function createAmicPrivateBootstrapExecutionPacket({
  packetId,
  sourceSha,
  sourceTree,
  environment = "lawos-private-rehearsal",
  preflightReceipt,
  negativeTenantId,
  photoStorageProvider,
  photoStorageAdapterId,
  productionTarget = null,
} = {}) {
  if (preflightReceipt?.schema_version
        !== AMIC_PRIVATE_BOOTSTRAP_MIGRATION_DRY_RUN_VERSION
      || preflightReceipt.outcome !== "PASS"
      || preflightReceipt.rejected_item_count !== 0
      || preflightReceipt.postgres_write_count !== 0
      || preflightReceipt.object_storage_write_count !== 0) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PACKET_PREFLIGHT", "a safe PASS dry-run receipt is required");
  }
  if (environment === "synthetic-test" && productionTarget != null) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
      "synthetic execution must not accept production infrastructure",
    );
  }
  if (environment !== "synthetic-test" && productionTarget == null) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
      "non-synthetic execution requires production infrastructure",
    );
  }
  const packet = {
    schema_version: AMIC_PRIVATE_BOOTSTRAP_EXECUTION_PACKET_VERSION,
    packet_id: requiredRef(packetId, "packet_id"),
    source_sha: sourceSha,
    source_tree: sourceTree,
    action: AMIC_PRIVATE_BOOTSTRAP_EXECUTION_ACTION,
    environment,
    mode: "commit",
    bindings: Object.fromEntries(BINDING_KEYS.map((key) => [
      key,
      requiredDigest(preflightReceipt[key], key),
    ])),
    target: {
      tenant_ref_sha256: requiredDigest(
        preflightReceipt.tenant_ref_sha256,
        "tenant_ref_sha256",
      ),
      negative_tenant_ref_sha256: sha256(Buffer.from(requiredRef(
        negativeTenantId,
        "negativeTenantId",
      ))),
      photo_storage_provider: requiredRef(
        photoStorageProvider,
        "photoStorageProvider",
      ),
      photo_storage_adapter_ref_sha256: sha256(Buffer.from(requiredRef(
        photoStorageAdapterId,
        "photoStorageAdapterId",
      ))),
      object_versioning_required: true,
      public_access: false,
      production: environment === "synthetic-test"
        ? null
        : validateAmicPrivateBootstrapProductionTarget(productionTarget),
    },
    counts: Object.fromEntries(COUNT_KEYS.map((key) => [key, preflightReceipt[key]])),
    allowed_effects: {
      postgres_write: true,
      object_storage_write: true,
      source_mutation: false,
      public_distribution: false,
    },
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    claims: {
      source_mutated: false,
      real_data_mutated: false,
      postgres_write: false,
      object_storage_write: false,
      raw_identity_returned: false,
      raw_photo_returned: false,
      production_ready: false,
    },
  };
  const sealed = Object.freeze({
    ...packet,
    packet_sha256: hashPacket(packet),
  });
  validateAmicPrivateBootstrapExecutionPacket(sealed, {
    sourceSha,
    sourceTree,
  });
  return sealed;
}

export function createAmicPrivateBootstrapApprovalDataScope(packet) {
  return Object.freeze([
    "approved-real-manifest",
    `private-bootstrap-inventory:${packet.bindings.inventory_sha256}`,
    `private-bootstrap-mapping:${packet.bindings.mapping_sha256}`,
    `private-bootstrap-migration:${packet.bindings.migration_manifest_sha256}`,
    `private-bootstrap-catalog:${packet.bindings.record_type_catalog_sha256}`,
    `private-bootstrap-photos:${packet.bindings.photo_aggregate_sha256}`,
  ]);
}

export function verifyAmicPrivateBootstrapExecutionApprovalPayload({
  packet,
  trustRegistryBytes,
  trustRegistrySha256,
  approvalReceiptBytes,
  approvalSignatureBytes,
  now,
} = {}) {
  const validated = validateAmicPrivateBootstrapExecutionPacket(packet);
  let receipt;
  try {
    receipt = JSON.parse(Buffer.from(approvalReceiptBytes ?? "").toString("utf8"));
  } catch {
    fail("AMIC_PRIVATE_BOOTSTRAP_APPROVAL_JSON", "approval receipt is not valid JSON");
  }
  const requiredScope = createAmicPrivateBootstrapApprovalDataScope(packet);
  if (JSON.stringify(receipt.data_scope) !== JSON.stringify(requiredScope)
      || JSON.stringify(receipt.contact_scope) !== "[]") {
    fail("AMIC_PRIVATE_BOOTSTRAP_APPROVAL_SCOPE", "approval scope is not exact");
  }
  const approval = validateRuntimeSafetyApprovalPayload({
    registryBytes: trustRegistryBytes,
    receiptBytes: approvalReceiptBytes,
    signatureBytes: approvalSignatureBytes,
    expectedRegistrySha256: trustRegistrySha256,
    expectedRole: "owner",
    expectedAction: AMIC_PRIVATE_BOOTSTRAP_EXECUTION_ACTION,
    expectedEnvironment: packet.environment,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: packet.source_sha,
    expectedSourceTree: packet.source_tree,
    allowedDataScope: requiredScope,
    allowedContactScope: [],
    now,
  });
  if (approval.decision !== "approved") {
    fail("AMIC_PRIVATE_BOOTSTRAP_APPROVAL_REJECTED", "owner rejected the import");
  }
  return Object.freeze({
    ...approval,
    packet_sha256: validated.packet_sha256,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    action: packet.action,
    environment: packet.environment,
  });
}

function validateVerifiedApproval(approval, packet) {
  if (approval?.valid !== true
      || approval.decision !== "approved"
      || approval.packet_sha256 !== packet.packet_sha256
      || approval.source_sha !== packet.source_sha
      || approval.source_tree !== packet.source_tree
      || approval.action !== packet.action
      || approval.environment !== packet.environment) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_APPROVAL_REQUIRED",
      "verified exact owner approval is required",
    );
  }
}

async function preflightCompiledMigration(compiled) {
  const result = await runJsonPostgresMigration({
    corpus: compiled.corpus,
    mode: "dry-run",
    allowRealData: true,
    recordTypeCatalog: compiled.record_type_catalog,
  });
  return createAmicPrivateBootstrapDryRunReceipt(compiled, result);
}

export function validateAmicPrivateBootstrapExecutionPreflightBinding({
  packet,
  preflightReceipt,
  negativeTenantId,
  photoStorageProvider,
  photoStorageAdapterId,
} = {}) {
  validateAmicPrivateBootstrapExecutionPacket(packet);
  for (const key of BINDING_KEYS) {
    if (packet.bindings[key] !== preflightReceipt?.[key]) {
      fail("AMIC_PRIVATE_BOOTSTRAP_EXECUTION_DRIFT", `${key} drifted after approval`);
    }
  }
  for (const key of COUNT_KEYS) {
    if (packet.counts[key] !== preflightReceipt?.[key]) {
      fail("AMIC_PRIVATE_BOOTSTRAP_EXECUTION_DRIFT", `${key} drifted after approval`);
    }
  }
  if (packet.target.tenant_ref_sha256 !== preflightReceipt?.tenant_ref_sha256
      || packet.target.negative_tenant_ref_sha256
        !== sha256(Buffer.from(requiredRef(negativeTenantId, "negativeTenantId")))
      || packet.target.photo_storage_provider !== requiredRef(
        photoStorageProvider,
        "photoStorageProvider",
      )
      || packet.target.photo_storage_adapter_ref_sha256
        !== sha256(Buffer.from(requiredRef(
          photoStorageAdapterId,
          "photo storage adapter id",
        )))) {
    fail("AMIC_PRIVATE_BOOTSTRAP_EXECUTION_TARGET", "execution target drifted after approval");
  }
  return Object.freeze({
    packet_sha256: packet.packet_sha256,
    preflight_bound: true,
    source_mutated: false,
    external_write: false,
  });
}

function bindCommittedPhotoVersions(compiled, committedPhotos) {
  const byObject = new Map(committedPhotos.map((photo) => [photo.photo_object_id, photo]));
  if (byObject.size !== committedPhotos.length
      || committedPhotos.length !== compiled.photo_stages.length) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PHOTO_BINDING", "committed photo set is incomplete");
  }
  const corpus = structuredClone(compiled.corpus);
  delete corpus.manifest_sha256;
  let boundCount = 0;
  for (const domain of corpus.domains) {
    if (domain.domain_id !== "hrx") continue;
    for (const record of domain.records) {
      if (record.record_type !== "hrx_employees"
          || record.payload.photo_object_id == null) continue;
      const committed = byObject.get(record.payload.photo_object_id);
      if (!committed
          || committed.photo_sha256 !== record.payload.photo_sha256
          || committed.photo_byte_size !== record.payload.photo_byte_size
          || committed.photo_content_type !== "image/png"
          || !committed.photo_version_id
          || committed.photo_version_id
            === AMIC_PRIVATE_BOOTSTRAP_PHOTO_VERSION_PLACEHOLDER) {
        fail("AMIC_PRIVATE_BOOTSTRAP_PHOTO_BINDING", "photo version binding is invalid");
      }
      record.payload.photo_version_id = committed.photo_version_id;
      boundCount += 1;
    }
  }
  if (boundCount !== committedPhotos.length) {
    fail("AMIC_PRIVATE_BOOTSTRAP_PHOTO_BINDING", "photo version coverage is incomplete");
  }
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, {
    allowRealData: true,
  });
  if (prepared.rejected.length !== 0) {
    fail("AMIC_PRIVATE_BOOTSTRAP_CORPUS", "version-bound corpus contains rejected items");
  }
  const sealed = Object.freeze({
    ...corpus,
    manifest_sha256: prepared.manifest_sha256,
  });
  const catalog = createJsonPostgresRecordTypeCatalog({ corpus: sealed });
  if (catalog.catalog_sha256 !== compiled.record_type_catalog.catalog_sha256) {
    fail("AMIC_PRIVATE_BOOTSTRAP_CATALOG_DRIFT", "photo version changed the approved schema");
  }
  return sealed;
}

function safeFailureReceipt({ packet, preflight, committedCount, phase, error }) {
  const code = String(error?.code ?? error?.safe_error_code ?? "AMIC_PRIVATE_BOOTSTRAP_FAILED")
    .replace(/[^A-Za-z0-9_.:-]/gu, "_")
    .slice(0, 96);
  const externalWriteMayHaveOccurred = committedCount > 0 || new Set([
    "photo-finalize",
    "corpus-reseal",
    "postgres-import",
    "photo-readback",
  ]).has(phase);
  return Object.freeze({
    schema_version: AMIC_PRIVATE_BOOTSTRAP_EXECUTION_RESULT_VERSION,
    outcome: "BLOCKED",
    packet_sha256: packet.packet_sha256,
    inventory_sha256: preflight?.inventory_sha256 ?? packet.bindings.inventory_sha256,
    mapping_sha256: preflight?.mapping_sha256 ?? packet.bindings.mapping_sha256,
    failed_phase: phase,
    failure_code: code,
    photo_committed_count: committedCount,
    external_write_may_have_occurred: externalWriteMayHaveOccurred,
    repair_required: externalWriteMayHaveOccurred,
    source_mutated: false,
    raw_identity_returned: false,
    raw_photo_returned: false,
    production_ready_claim: false,
  });
}

export async function executeAmicPrivateBootstrapMigration({
  packet,
  approval,
  sourceSha,
  sourceTree,
  negativeTenantId,
  pool,
  memberPhotoStorage,
  onCheckpoint = null,
  ...compileOptions
} = {}) {
  validateAmicPrivateBootstrapExecutionPacket(packet, { sourceSha, sourceTree });
  validateVerifiedApproval(approval, packet);
  if (!pool || typeof pool.connect !== "function"
      || !memberPhotoStorage
      || typeof memberPhotoStorage.storePhoto !== "function"
      || typeof memberPhotoStorage.readPhoto !== "function") {
    fail("AMIC_PRIVATE_BOOTSTRAP_EXECUTION_TARGET", "PostgreSQL and photo storage targets are required");
  }
  let phase = "preflight";
  let preflight = null;
  const committed = [];
  try {
    const compiled = await compileAmicPrivateBootstrapMigration(compileOptions);
    preflight = await preflightCompiledMigration(compiled);
    validateAmicPrivateBootstrapExecutionPreflightBinding({
      packet,
      preflightReceipt: preflight,
      negativeTenantId,
      photoStorageProvider: memberPhotoStorage.storage_provider,
      photoStorageAdapterId: memberPhotoStorage.storage_adapter_id,
    });
    phase = "photo-finalize";
    for (const photo of compiled.photo_stages) {
      const metadata = await memberPhotoStorage.storePhoto({
        tenant_id: photo.tenant_id,
        legal_entity_id: photo.legal_entity_id,
        employee_id: photo.employee_id,
        idempotency_key: `amic-private-bootstrap:${packet.packet_sha256}`,
        bytes: photo.bytes,
        expected_sha256: photo.photo_sha256,
      });
      committed.push(metadata);
      if (!metadata.photo_version_id) {
        fail(
          "AMIC_PRIVATE_BOOTSTRAP_PHOTO_VERSION_REQUIRED",
          "photo storage did not return an immutable object version",
        );
      }
    }
    phase = "corpus-reseal";
    const corpus = bindCommittedPhotoVersions(compiled, committed);
    const finalDryRun = await runJsonPostgresMigration({
      corpus,
      mode: "dry-run",
      allowRealData: true,
      recordTypeCatalog: compiled.record_type_catalog,
    });
    if (finalDryRun.outcome !== "PASS" || finalDryRun.safe_counts.rejected_item_count !== 0) {
      fail("AMIC_PRIVATE_BOOTSTRAP_FINAL_DRY_RUN", "version-bound dry-run failed");
    }
    phase = "postgres-import";
    const migration = await runJsonPostgresMigration({
      pool,
      corpus,
      mode: "import",
      allowRealData: true,
      recordTypeCatalog: compiled.record_type_catalog,
      negativeTenantId,
      onCheckpoint,
    });
    if (migration.outcome !== "PASS"
        || migration.safe_counts.tenant_negative_visible_count !== 0
        || migration.directory.orphan_count !== 0
        || migration.domains.some((domain) => (
          domain.readback_equal !== true || domain.orphan_count !== 0
        ))) {
      fail("AMIC_PRIVATE_BOOTSTRAP_POSTGRES_READBACK", "PostgreSQL readback did not close");
    }
    phase = "photo-readback";
    for (const [index, metadata] of committed.entries()) {
      const source = compiled.photo_stages[index];
      const readback = await memberPhotoStorage.readPhoto({
        tenant_id: source.tenant_id,
        legal_entity_id: source.legal_entity_id,
        employee_id: source.employee_id,
        photo: metadata,
      });
      if (readback.sha256 !== source.photo_sha256
          || readback.byte_size !== source.photo_byte_size) {
        fail("AMIC_PRIVATE_BOOTSTRAP_PHOTO_READBACK", "photo readback did not close");
      }
    }
    return Object.freeze({
      schema_version: AMIC_PRIVATE_BOOTSTRAP_EXECUTION_RESULT_VERSION,
      outcome: "PASS",
      packet_sha256: packet.packet_sha256,
      approval_receipt_sha256: approval.receipt_sha256,
      inventory_sha256: preflight.inventory_sha256,
      mapping_sha256: preflight.mapping_sha256,
      planned_migration_manifest_sha256: preflight.migration_manifest_sha256,
      committed_migration_manifest_sha256: migration.source_manifest_sha256,
      record_type_catalog_sha256: migration.record_type_catalog_sha256,
      source_subject_count: preflight.source_subject_count,
      assigned_subject_count: preflight.assigned_subject_count,
      quarantined_subject_count: preflight.quarantined_subject_count,
      directory_readback_count: migration.directory.target_count,
      directory_idempotency_count: migration.directory.idempotency_count,
      directory_audit_count: migration.directory.audit_count,
      directory_outbox_count: migration.directory.outbox_count,
      hrx_record_readback_count: migration.domains.find(
        (domain) => domain.domain_id === "hrx",
      )?.accepted_count ?? 0,
      photo_committed_count: committed.length,
      photo_readback_count: committed.length,
      tenant_negative_visible_count:
        migration.safe_counts.tenant_negative_visible_count,
      source_mutated: false,
      raw_identity_returned: false,
      raw_photo_returned: false,
      repair_required: false,
      production_ready_claim: false,
      invariant_hash: migration.invariant_hash,
    });
  } catch (error) {
    const failure = error instanceof Error
      ? error
      : new Error("private bootstrap execution failed");
    failure.safe_receipt = safeFailureReceipt({
      packet,
      preflight,
      committedCount: committed.length,
      phase,
      error: failure,
    });
    throw failure;
  }
}
