import { createHash } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApprovalPayload,
} from "../../../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../../../packages/persistence/src/postgres/program-receipt.js";
import {
  validateJsonPostgresRecordAuthorityBinding,
} from "../../../packages/persistence/src/postgres/source-adjudication.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  readImmutableProgramInput,
  readImmutableProgramJson,
} from "./immutable-program-input.js";
import {
  validateJsonPostgresSourceTransformResult,
} from "./json-postgres-source-transform.js";
import {
  validateJsonPostgresDrTarget,
} from "../../../packages/persistence/src/postgres/dr-recovery-contract.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  validateJsonPostgresRehearsalRestoreTarget,
} from "../../../packages/persistence/src/postgres/rehearsal-restore-contract.js";
import {
  validateJsonPostgresRehearsalCapacityResult,
} from "../../../packages/persistence/src/postgres/rehearsal-capacity-result.js";
import { programEvidenceRetainUntil } from "./program-evidence-retention.js";

export const JSON_POSTGRES_PROGRAM_ADMIN_ACTION = "lawos-json-postgres-program-execution";
export const JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION = "lawos-json-postgres-production-bootstrap";
export const JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION = "lawos-json-postgres-rehearsal-bootstrap";
export const JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION = "lawos-json-postgres-relational-projection";
export const JSON_POSTGRES_JSON_RETIREMENT_ACTION = "lawos-json-postgres-json-retirement-smoke";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const AUTHORIZATION_KEYS = Object.freeze([
  "packet",
  "trust_registry",
  "approval_receipt",
  "approval_signature",
]);
const INPUT_KEYS = Object.freeze([
  "authority_summary",
  "record_type_catalog",
  "inventory",
  "authority_decisions",
  "record_authority",
  "migration_corpus",
  "source_transform_result",
  "dms_manifest",
  "checkpoint",
  "dms_checkpoint",
  "predecessors",
]);
const PROJECTION_INPUT_KEYS = Object.freeze(["predecessors"]);
const DR_INPUT_KEYS = Object.freeze(["dr_target", "performance_acceptance"]);
const REHEARSAL_RESTORE_INPUT_KEYS = Object.freeze([
  "restore_target",
  "performance_acceptance",
  "capacity_result",
]);
const RETIREMENT_INPUT_KEYS = Object.freeze(["deployment_manifest", "predecessors"]);
const MAX_BYTES = Object.freeze({
  packet: 256 * 1024,
  trust_registry: 128 * 1024,
  approval_receipt: 64 * 1024,
  approval_signature: 4096,
  authority_summary: 2 * 1024 * 1024,
  record_type_catalog: 16 * 1024 * 1024,
  inventory: 64 * 1024 * 1024,
  authority_decisions: 64 * 1024 * 1024,
  record_authority: 64 * 1024 * 1024,
  migration_corpus: 128 * 1024 * 1024,
  source_transform_result: 2 * 1024 * 1024,
  dms_manifest: 64 * 1024 * 1024,
  checkpoint: 16 * 1024 * 1024,
  dms_checkpoint: 16 * 1024 * 1024,
  predecessor_receipt: 2 * 1024 * 1024,
  predecessor_signature: 4096,
  dr_target: 128 * 1024,
  restore_target: 128 * 1024,
  performance_acceptance: 128 * 1024,
  capacity_result: 256 * 1024,
  deployment_manifest: 2 * 1024 * 1024,
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredText(value, label, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) fail("LAWOS_PROGRAM_INPUT_SCHEMA", `${label} is invalid`);
  return text;
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("LAWOS_PROGRAM_INPUT_SCHEMA", `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) fail("LAWOS_PROGRAM_INPUT_SCHEMA", `${label} contains unsupported fields`);
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes);
  } catch {
    fail("LAWOS_PROGRAM_INPUT_JSON", `${label} is not valid JSON`);
  }
}

function inputReadOptions(locator, env, maxBytes, s3Client) {
  return {
    locator,
    client: s3Client,
    expectedBucket: requiredText(env.LAWOS_PROGRAM_INPUT_BUCKET, "LAWOS_PROGRAM_INPUT_BUCKET"),
    expectedBucketOwner: requiredText(env.LAWOS_AWS_ACCOUNT_ID, "LAWOS_AWS_ACCOUNT_ID", /^\d{12}$/u),
    expectedKmsKeyArn: requiredText(env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN, "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN"),
    maxBytes,
  };
}

function exactDeployment(event, env) {
  const sourceSha = requiredText(env.LAWOS_DEPLOYMENT_COMMIT, "LAWOS_DEPLOYMENT_COMMIT", SHA1);
  const sourceTree = requiredText(env.LAWOS_DEPLOYMENT_TREE, "LAWOS_DEPLOYMENT_TREE", SHA1);
  const artifactSha256 = requiredText(env.LAWOS_DEPLOYMENT_ARTIFACT_SHA256, "LAWOS_DEPLOYMENT_ARTIFACT_SHA256", SHA256);
  if (event.source_sha !== sourceSha
    || event.source_tree !== sourceTree
    || event.artifact_sha256 !== artifactSha256) {
    fail("LAWOS_PROGRAM_DEPLOYMENT_BINDING", "program invocation does not match the deployed exact source");
  }
  return Object.freeze({ sourceSha, sourceTree, artifactSha256 });
}

export function assertJsonPostgresProgramDirectInvoke(event = {}, {
  allowedActions = [
    JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
    JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
    JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
    JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
    JSON_POSTGRES_JSON_RETIREMENT_ACTION,
  ],
} = {}) {
  if (event.requestContext || event.rawPath || event.httpMethod) {
    fail("LAWOS_PROGRAM_DIRECT_INVOKE", "program administration is direct-invoke only");
  }
  if (!allowedActions.includes(event.action)) fail("LAWOS_PROGRAM_ACTION", "program administration action is invalid");
  requiredText(event.attempt_ref, "attempt_ref", TOKEN);
  return true;
}

function validateRetirementDeploymentManifest(manifest) {
  if (manifest?.schema_version !== "law-firm-os.json-postgres-production-artifact.v1"
    || manifest.operational_authority !== "postgres-v2"
    || manifest.json_fallback !== false
    || manifest.json_writer !== false
    || manifest.dual_write !== false
    || manifest.file_current_authority !== false
    || manifest.offline_mutation !== false
    || manifest.memory_fallback !== false
    || manifest.artifact_runtime_store_entry_count !== 0
    || manifest.artifact_real_json_store_count !== 0) {
    fail("LAWOS_PROGRAM_RETIREMENT_MANIFEST", "production deployment manifest retains a legacy authority");
  }
  return manifest;
}

export async function loadJsonPostgresProgramAuthorization({
  event,
  env = process.env,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  readBytes = readImmutableProgramInput,
  now = Date.now(),
} = {}) {
  assertJsonPostgresProgramDirectInvoke(event);
  closedObject(event.authorization, AUTHORIZATION_KEYS, "program authorization locators");
  const exact = exactDeployment(event, env);
  const read = (key) => readBytes(inputReadOptions(
    event.authorization[key],
    env,
    MAX_BYTES[key],
    s3Client,
  ));
  const [packetBytes, registryBytes, receiptBytes, signatureBytes] = await Promise.all([
    read("packet"),
    read("trust_registry"),
    read("approval_receipt"),
    read("approval_signature"),
  ]);
  const packet = parseJson(packetBytes, "execution packet");
  const validated = validateJsonPostgresExecutionPacket(packet, {
    sourceSha: exact.sourceSha,
    sourceTree: exact.sourceTree,
    phase: requiredText(event.phase, "phase"),
  });
  if (validated.packet_sha256 !== event.packet_sha256
    || packet.bindings.artifact_sha256 !== exact.artifactSha256
    || packet.target.aws_account !== requiredText(env.LAWOS_AWS_ACCOUNT_ID, "LAWOS_AWS_ACCOUNT_ID")
    || packet.target.aws_region !== requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region")
    || packet.target.program_input_bucket_name !== requiredText(env.LAWOS_PROGRAM_INPUT_BUCKET, "LAWOS_PROGRAM_INPUT_BUCKET")
    || packet.target.program_input_expected_bucket_owner !== packet.target.aws_account
    || !packet.allowed_modes.includes(event.mode)) {
    fail("LAWOS_PROGRAM_PACKET_BINDING", "execution packet drifted from the deployed target or requested mode");
  }
  const trustRegistrySha256 = requiredText(
    env.LAWOS_OWNER_TRUST_REGISTRY_SHA256,
    "LAWOS_OWNER_TRUST_REGISTRY_SHA256",
    SHA256,
  );
  const approval = verifyJsonPostgresExecutionApprovalPayload({
    packet,
    sourceSha: exact.sourceSha,
    sourceTree: exact.sourceTree,
    trustRegistryBytes: registryBytes,
    trustRegistrySha256,
    approvalReceiptBytes: receiptBytes,
    approvalSignatureBytes: signatureBytes,
    now,
  });
  return Object.freeze({
    exact,
    packet: Object.freeze({ ...packet, packet_sha256: validated.packet_sha256 }),
    approval,
    trustRegistry: parseJson(registryBytes, "owner trust registry"),
    authorization_input_sha256: createHash("sha256").update(canonicalizeJson(event.authorization)).digest("hex"),
  });
}

function requireProgramInputs(value, mode) {
  closedObject(value, INPUT_KEYS, "program input locators");
  for (const key of ["authority_summary", "record_type_catalog"]) {
    if (!value[key]) fail("LAWOS_PROGRAM_INPUT_SCHEMA", `${key} locator is required`);
  }
  if (mode !== "preflight") {
    for (const key of ["inventory", "authority_decisions", "record_authority", "migration_corpus", "source_transform_result", "dms_manifest"]) {
      if (!value[key]) fail("LAWOS_PROGRAM_INPUT_SCHEMA", `${key} locator is required`);
    }
  }
  if (value.predecessors != null && !Array.isArray(value.predecessors)) {
    fail("LAWOS_PROGRAM_INPUT_SCHEMA", "predecessor locators must be an array");
  }
}

function assertAuthoritySummaryBindings(summary, catalog, packet) {
  const expected = {
    bundle_sha256: packet.bindings.authority_bundle_sha256,
    inventory_content_sha256: packet.bindings.inventory_content_sha256,
    inventory_delta_policy_sha256: packet.bindings.inventory_delta_policy_sha256,
    record_type_catalog_sha256: packet.bindings.record_type_catalog_sha256,
    record_authority_sha256: packet.bindings.record_authority_sha256,
    field_crosswalk_sha256: packet.bindings.field_crosswalk_sha256,
    authority_manifest_sha256: packet.bindings.authority_manifest_sha256,
    migration_manifest_sha256: packet.bindings.migration_manifest_sha256,
    transform_sha256: packet.bindings.transform_sha256,
  };
  for (const [key, digest] of Object.entries(expected)) {
    if (summary?.[key] !== digest) {
      fail("LAWOS_PROGRAM_AUTHORITY_BINDING", `authority summary ${key} drifted from the execution packet`);
    }
  }
  if (catalog?.catalog_sha256 !== packet.bindings.record_type_catalog_sha256) {
    fail("LAWOS_PROGRAM_AUTHORITY_BINDING", "record-type catalog drifted from the execution packet");
  }
}

async function loadSignedProgramPredecessors({
  locators,
  trustRegistry,
  env,
  s3Client,
  readJson,
  readBytes,
  now,
} = {}) {
  if (!Array.isArray(locators)) {
    fail("LAWOS_PROGRAM_PREDECESSOR", "predecessor locators must be an array");
  }
  if (locators.length > 32) {
    fail("LAWOS_PROGRAM_PREDECESSOR", "predecessor receipt count exceeds the closed bound");
  }
  const predecessors = [];
  for (const item of locators) {
    closedObject(item, ["receipt", "signature"], "program predecessor locators");
    const [receipt, signature] = await Promise.all([
      readJson(inputReadOptions(item.receipt, env, MAX_BYTES.predecessor_receipt, s3Client)),
      readBytes(inputReadOptions(item.signature, env, MAX_BYTES.predecessor_signature, s3Client)),
    ]);
    predecessors.push(verifyJsonPostgresProgramReceipt({
      receipt,
      signature,
      trustRegistry,
      now,
    }));
  }
  const kinds = predecessors.map((item) => item.receipt_kind);
  if (new Set(kinds).size !== kinds.length) {
    fail("LAWOS_PROGRAM_PREDECESSOR", "predecessor receipt kinds must be unique");
  }
  return Object.freeze(predecessors);
}

export async function loadJsonPostgresMigrationInputs({
  inputLocators,
  mode,
  trustRegistry,
  packet,
  env = process.env,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  readJson = readImmutableProgramJson,
  readBytes = readImmutableProgramInput,
  now = Date.now(),
} = {}) {
  requireProgramInputs(inputLocators, mode);
  const json = (key, locator = inputLocators[key], maxBytes = MAX_BYTES[key]) =>
    readJson(inputReadOptions(locator, env, maxBytes, s3Client));
  const [authoritySummary, recordTypeCatalog] = await Promise.all([
    json("authority_summary"),
    json("record_type_catalog"),
  ]);
  assertAuthoritySummaryBindings(authoritySummary, recordTypeCatalog, packet);
  if (mode === "preflight") {
    return Object.freeze({
      authorityBundle: Object.freeze({ summary: authoritySummary, record_type_catalog: recordTypeCatalog }),
      corpus: null,
      dmsManifest: null,
      checkpoint: null,
      dmsCheckpoint: null,
      predecessors: Object.freeze([]),
    });
  }
  const [inventory, decisions, recordAuthority, corpus, sourceTransformResult, dmsManifest, checkpoint, dmsCheckpoint] = await Promise.all([
    json("inventory"),
    json("authority_decisions"),
    json("record_authority"),
    json("migration_corpus"),
    json("source_transform_result"),
    json("dms_manifest"),
    inputLocators.checkpoint ? json("checkpoint") : null,
    inputLocators.dms_checkpoint ? json("dms_checkpoint") : null,
  ]);
  if (!packet.target.approved_tenant_ids.includes(corpus.tenant_id)) {
    fail("LAWOS_PROGRAM_TENANT_BINDING", "migration corpus tenant is not in the exact approved tenant set");
  }
  try {
    validateJsonPostgresRecordAuthorityBinding(recordAuthority, {
      inventory,
    });
  } catch {
    fail(
      "LAWOS_PROGRAM_AUTHORITY_BINDING",
      "record authority manifest is invalid",
    );
  }
  if (recordAuthority.authority_sha256
      !== packet.bindings.record_authority_sha256) {
    fail(
      "LAWOS_PROGRAM_AUTHORITY_BINDING",
      "record authority manifest drifted from the execution packet",
    );
  }
  const transform = validateJsonPostgresSourceTransformResult(sourceTransformResult);
  if (transform.result_sha256 !== packet.bindings.transform_sha256
    || transform.migration_manifest_sha256 !== packet.bindings.migration_manifest_sha256
    || sourceTransformResult.inventory_content_sha256 !== packet.bindings.inventory_content_sha256
    || corpus.manifest_sha256 !== packet.bindings.migration_manifest_sha256
    || inventory.inventory_content_sha256 !== packet.bindings.inventory_content_sha256) {
    fail("LAWOS_PROGRAM_TRANSFORM_BINDING", "migration source transform drifted from the execution packet");
  }
  const predecessors = await loadSignedProgramPredecessors({
    locators: inputLocators.predecessors ?? [],
    trustRegistry,
    env,
    s3Client,
    readJson,
    readBytes,
    now,
  });
  return Object.freeze({
    authoritySummary,
    recordTypeCatalog,
    inventory,
    decisions,
    recordAuthority,
    corpus,
    sourceTransformResult,
    dmsManifest,
    checkpoint,
    dmsCheckpoint,
    predecessors,
  });
}

export async function loadJsonPostgresProjectionInputs({
  inputLocators,
  trustRegistry,
  packet,
  env = process.env,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  readJson = readImmutableProgramJson,
  readBytes = readImmutableProgramInput,
  now = Date.now(),
} = {}) {
  closedObject(inputLocators, PROJECTION_INPUT_KEYS, "projection input locators");
  const predecessors = await loadSignedProgramPredecessors({
    locators: inputLocators.predecessors,
    trustRegistry,
    env,
    s3Client,
    readJson,
    readBytes,
    now,
  });
  const byKind = new Map(predecessors.map((item) => [item.receipt_kind, item]));
  const required = [
    ["w12-terminal", packet.bindings.w12_terminal_receipt_sha256],
    ["cut-012", packet.bindings.cut012_terminal_receipt_sha256],
    ["go-live", packet.bindings.go_live_receipt_sha256],
  ];
  if (predecessors.length !== required.length) {
    fail("LAWOS_PROGRAM_PREDECESSOR", "W15 requires exactly the W12 terminal, CUT-012, and go-live receipts");
  }
  for (const [kind, digest] of required) {
    const receipt = byKind.get(kind);
    if (!receipt
      || receipt.execution_state !== "PASS"
      || receipt.canonical_sha256 !== digest) {
      fail("LAWOS_PROGRAM_PREDECESSOR", `W15 ${kind} predecessor is missing, failed, or drifted`);
    }
  }
  if (byKind.get("cut-012").claims.json_authority_disabled !== true
    || byKind.get("go-live").claims.json_authority_disabled !== true
    || byKind.get("go-live").claims.release !== true
    || byKind.get("go-live").claims.go_live !== true) {
    fail("LAWOS_PROGRAM_PREDECESSOR", "W15 predecessor claims do not prove completed PostgreSQL go-live");
  }
  return Object.freeze({ predecessors });
}

export async function loadJsonPostgresDrRecoveryInputs({
  inputLocators,
  packet,
  env = process.env,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  readJson = readImmutableProgramJson,
} = {}) {
  closedObject(inputLocators, DR_INPUT_KEYS, "DR recovery input locators");
  for (const key of DR_INPUT_KEYS) {
    if (!inputLocators[key]) fail("LAWOS_PROGRAM_INPUT_SCHEMA", `${key} locator is required`);
  }
  const json = (key) => readJson(inputReadOptions(
    inputLocators[key],
    env,
    MAX_BYTES[key],
    s3Client,
  ));
  const [drTarget, performanceAcceptance] = await Promise.all([
    json("dr_target"),
    json("performance_acceptance"),
  ]);
  const acceptance = validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (acceptance.acceptance_sha256 !== packet.bindings.performance_acceptance_sha256) {
    fail("LAWOS_PROGRAM_DR_BINDING", "DR performance acceptance drifted from the execution packet");
  }
  const target = validateJsonPostgresDrTarget(drTarget, {
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    performanceAcceptance,
  });
  return Object.freeze({
    drTarget: Object.freeze(drTarget),
    performanceAcceptance: Object.freeze(performanceAcceptance),
    target,
    acceptance,
  });
}

export async function loadJsonPostgresRehearsalRestoreInputs({
  inputLocators,
  packet,
  env = process.env,
  s3Client = new S3Client({
    region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
  }),
  readJson = readImmutableProgramJson,
} = {}) {
  closedObject(
    inputLocators,
    REHEARSAL_RESTORE_INPUT_KEYS,
    "W12 restore input locators",
  );
  for (const key of REHEARSAL_RESTORE_INPUT_KEYS) {
    if (!inputLocators[key]) {
      fail(
        "LAWOS_PROGRAM_INPUT_SCHEMA",
        `${key} locator is required`,
      );
    }
  }
  const json = (key) => readJson(inputReadOptions(
    inputLocators[key],
    env,
    MAX_BYTES[key],
    s3Client,
  ));
  const [restoreTarget, performanceAcceptance, capacityResult] =
    await Promise.all([
    json("restore_target"),
    json("performance_acceptance"),
    json("capacity_result"),
  ]);
  const acceptance =
    validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  let capacity;
  try {
    capacity = validateJsonPostgresRehearsalCapacityResult(
      capacityResult,
      { packet, performanceAcceptance },
    );
  } catch {
    fail(
      "LAWOS_PROGRAM_DR_BINDING",
      "W12 restore capacity lineage drifted from the execution packet",
    );
  }
  const target = validateJsonPostgresRehearsalRestoreTarget(
    restoreTarget,
    {
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      packetSha256: packet.packet_sha256,
      performanceAcceptance,
    },
  );
  return Object.freeze({
    restoreTarget: Object.freeze(restoreTarget),
    performanceAcceptance: Object.freeze(performanceAcceptance),
    capacityResult: Object.freeze(capacityResult),
    target,
    acceptance,
    capacity,
  });
}

export async function loadJsonPostgresRetirementInputs({
  inputLocators,
  trustRegistry,
  packet,
  env = process.env,
  s3Client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  readJson = readImmutableProgramJson,
  readBytes = readImmutableProgramInput,
  now = Date.now(),
} = {}) {
  closedObject(inputLocators, RETIREMENT_INPUT_KEYS, "JSON retirement input locators");
  if (!inputLocators.deployment_manifest || !Array.isArray(inputLocators.predecessors)) {
    fail("LAWOS_PROGRAM_INPUT_SCHEMA", "JSON retirement deployment manifest and predecessors are required");
  }
  if (inputLocators.deployment_manifest.sha256 !== packet.bindings.artifact_manifest_sha256) {
    fail("LAWOS_PROGRAM_RETIREMENT_MANIFEST", "deployment manifest locator drifted from the packet");
  }
  const [manifest, predecessors] = await Promise.all([
    readJson(inputReadOptions(
      inputLocators.deployment_manifest,
      env,
      MAX_BYTES.deployment_manifest,
      s3Client,
    )),
    loadSignedProgramPredecessors({
      locators: inputLocators.predecessors,
      trustRegistry,
      env,
      s3Client,
      readJson,
      readBytes,
      now,
    }),
  ]);
  validateRetirementDeploymentManifest(manifest);
  const byKind = new Map(predecessors.map((item) => [item.receipt_kind, item]));
  for (const kind of ["cut-009", "cut-010"]) {
    const receipt = byKind.get(kind);
    if (!receipt
      || receipt.execution_state !== "PASS"
      || receipt.source_sha !== packet.source_sha
      || receipt.source_tree !== packet.source_tree
      || receipt.packet_sha256 !== packet.packet_sha256) {
      fail("LAWOS_PROGRAM_RETIREMENT_PREDECESSOR", `JSON retirement requires exact ${kind} PASS`);
    }
  }
  if (predecessors.length !== 2) {
    fail("LAWOS_PROGRAM_RETIREMENT_PREDECESSOR", "JSON retirement accepts only CUT-009 and CUT-010 predecessors");
  }
  return Object.freeze({
    deploymentManifest: Object.freeze(manifest),
    predecessors,
  });
}

export async function claimJsonPostgresProgramInvocation({
  event,
  authorization,
  env = process.env,
  client = new S3Client({ region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION }),
  now = Date.now(),
} = {}) {
  const attemptRef = requiredText(event.attempt_ref, "attempt_ref", TOKEN);
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION, "AWS region");
  const bucket = requiredText(env.LAWOS_APPROVAL_AUDIT_BUCKET, "LAWOS_APPROVAL_AUDIT_BUCKET");
  const kmsKeyId = requiredText(env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN, "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN");
  const claim = {
    schema_version: "law-firm-os.json-postgres-program-authorization-claim.v1",
    approval_id: authorization.approval.approval_id,
    key_id: authorization.approval.key_id,
    action: event.action,
    phase: event.phase,
    mode: event.mode,
    attempt_ref: attemptRef,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: authorization.packet.packet_sha256,
    approval_receipt_sha256: authorization.approval.receipt_sha256,
    registry_sha256: authorization.approval.registry_sha256,
    authorization_input_sha256: authorization.authorization_input_sha256,
    claimed_at: new Date(now).toISOString(),
    expires_at: authorization.approval.expires_at,
  };
  const claimBytes = Buffer.from(`${canonicalizeJson(claim)}\n`);
  const claimSha256 = createHash("sha256").update(claimBytes).digest("hex");
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `program-approval-audit/${region}/${claimSha256}.json`,
    Body: claimBytes,
    ContentType: "application/json",
    IfNoneMatch: "*",
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: kmsKeyId,
    ObjectLockMode: "COMPLIANCE",
    ObjectLockRetainUntilDate: programEvidenceRetainUntil({
      approvalExpiresAt: authorization.approval.expires_at,
      now,
    }),
  }));
  return Object.freeze({
    claim_sha256: claimSha256,
    approval_receipt_sha256: authorization.approval.receipt_sha256,
    registry_sha256: authorization.approval.registry_sha256,
  });
}
