import { createHash } from "node:crypto";
import {
  normalizeImmutableProgramInputLocator,
} from "../../apps/api/src/immutable-program-input.js";
import {
  JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
} from "../../apps/api/src/json-postgres-program-inputs.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_REHEARSAL_ACCOUNT,
  JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
  JSON_POSTGRES_REHEARSAL_PROFILE,
} from "./json-postgres-rehearsal-execution.mjs";

export const JSON_POSTGRES_REHEARSAL_LOCATOR_SET_VERSION =
  "law-firm-os.json-postgres-rehearsal-locator-set.v1";
export const JSON_POSTGRES_REHEARSAL_READONLY_PROFILE =
  "matter-readonly-auditor";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const MODES = new Set([
  "preflight",
  "dry-run",
  "stage",
  "commit",
  "resume",
  "readback",
  "reconcile",
]);
const WRITE_MODES = new Set(["commit", "resume"]);
const DATABASE_MODES = new Set(["commit", "resume", "readback", "reconcile"]);
const VALIDATION_KINDS = new Set([
  "failure-injection",
  "owner-sampling",
]);
const RESTORE_INPUT_KEYS = Object.freeze([
  "restore_target",
  "performance_acceptance",
  "capacity_result",
]);
const AUTHORIZATION_KEYS = Object.freeze([
  "packet",
  "trust_registry",
  "approval_receipt",
  "approval_signature",
]);
const REQUIRED_INPUT_KEYS = Object.freeze([
  "authority_summary",
  "base_manifest",
  "record_type_catalog",
  "inventory",
  "authority_decisions",
  "record_authority",
  "migration_corpus",
  "source_transform_result",
  "dms_manifest",
]);
const OPTIONAL_INPUT_KEYS = Object.freeze(["checkpoint", "dms_checkpoint"]);
const TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "bucket",
  "expected_bucket_owner",
  "authorization",
  "inputs",
  "predecessors",
  "locator_set_sha256",
]);
const ZERO_AUTHORITY_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);

function fail(message) {
  throw new Error(message);
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))) {
    fail(`${label} schema is invalid`);
  }
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : canonicalizeJson(value))
    .digest("hex");
}

function locatorSetMaterial(value) {
  return Object.fromEntries(
    TOP_LEVEL_KEYS
      .filter((key) => key !== "locator_set_sha256")
      .map((key) => [key, value[key]]),
  );
}

function normalizeLocator(locator, packet) {
  const normalized = normalizeImmutableProgramInputLocator(locator, {
    bucket: packet.target.program_input_bucket_name,
    expectedBucketOwner:
      packet.target.program_input_expected_bucket_owner,
  });
  const prefix = `program-input/${packet.packet_sha256}/`;
  if (!normalized.key.startsWith(prefix)) {
    fail("W12 immutable input key is outside the exact packet prefix");
  }
  return normalized;
}

function normalizeLocatorMap(value, keys, packet, label) {
  closed(value, keys, label);
  return Object.freeze(Object.fromEntries(keys.map((key) => {
    if (!value[key]) fail(`${label}.${key} is required`);
    return [key, normalizeLocator(value[key], packet)];
  })));
}

export function jsonPostgresRehearsalProfileForMode(mode) {
  if (!MODES.has(mode)) fail("W12 execution mode is invalid");
  return ["readback", "reconcile"].includes(mode)
    ? JSON_POSTGRES_REHEARSAL_READONLY_PROFILE
    : JSON_POSTGRES_REHEARSAL_PROFILE;
}

export function assertJsonPostgresRehearsalProgramCaller(identity = {}, {
  profile,
  mode = null,
  prepare = false,
} = {}) {
  const expectedProfile = prepare
    ? JSON_POSTGRES_REHEARSAL_PROFILE
    : jsonPostgresRehearsalProfileForMode(mode);
  const escaped = expectedProfile.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (profile !== expectedProfile
    || identity.Account !== JSON_POSTGRES_REHEARSAL_ACCOUNT
    || !new RegExp(
      `^arn:aws:sts::${JSON_POSTGRES_REHEARSAL_ACCOUNT}:assumed-role/${escaped}/[^/]+$`,
      "u",
    ).test(identity.Arn ?? "")) {
    fail("AWS caller is outside the exact W12 operation role/account");
  }
  return Object.freeze({
    account: identity.Account,
    role: expectedProfile,
    caller_arn_sha256: sha256(identity.Arn),
  });
}

export function createJsonPostgresRehearsalLocatorSet({
  packet,
  authorization,
  inputs,
  predecessors = [],
} = {}) {
  const value = {
    schema_version: JSON_POSTGRES_REHEARSAL_LOCATOR_SET_VERSION,
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    packet_sha256: packet?.packet_sha256,
    bucket: packet?.target?.program_input_bucket_name,
    expected_bucket_owner:
      packet?.target?.program_input_expected_bucket_owner,
    authorization: { ...authorization },
    inputs: { ...inputs },
    predecessors: predecessors.map((item) => ({ ...item })),
  };
  value.locator_set_sha256 = sha256(locatorSetMaterial(value));
  validateJsonPostgresRehearsalLocatorSet(value, { packet });
  return Object.freeze(value);
}

export function validateJsonPostgresRehearsalLocatorSet(value = {}, {
  packet,
} = {}) {
  closed(value, TOP_LEVEL_KEYS, "W12 locator set");
  if (value.schema_version !== JSON_POSTGRES_REHEARSAL_LOCATOR_SET_VERSION
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || !SHA256.test(value.packet_sha256 ?? "")
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.bucket !== JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET
    || value.bucket !== packet?.target?.program_input_bucket_name
    || value.expected_bucket_owner !== JSON_POSTGRES_REHEARSAL_ACCOUNT
    || value.expected_bucket_owner
      !== packet?.target?.program_input_expected_bucket_owner) {
    fail("W12 locator set exact packet binding drifted");
  }
  const authorization = normalizeLocatorMap(
    value.authorization,
    AUTHORIZATION_KEYS,
    packet,
    "W12 authorization locators",
  );
  const inputKeys = Object.keys(value.inputs ?? {});
  if (REQUIRED_INPUT_KEYS.some((key) => !inputKeys.includes(key))
    || inputKeys.some((key) =>
      ![...REQUIRED_INPUT_KEYS, ...OPTIONAL_INPUT_KEYS].includes(key))) {
    fail("W12 migration input locator set is incomplete");
  }
  const inputs = Object.freeze(Object.fromEntries(
    inputKeys.sort().map((key) => [
      key,
      normalizeLocator(value.inputs[key], packet),
    ]),
  ));
  if (!Array.isArray(value.predecessors) || value.predecessors.length > 32) {
    fail("W12 predecessor locator set is invalid");
  }
  const predecessors = Object.freeze(value.predecessors.map((item) => {
    closed(item, ["receipt", "signature"], "W12 predecessor locators");
    return Object.freeze({
      receipt: normalizeLocator(item.receipt, packet),
      signature: normalizeLocator(item.signature, packet),
    });
  }));
  const locatorIdentities = [
    ...Object.values(authorization),
    ...Object.values(inputs),
    ...predecessors.flatMap((item) => [item.receipt, item.signature]),
  ].map((locator) => `${locator.key}:${locator.version_id}`);
  if (new Set(locatorIdentities).size !== locatorIdentities.length) {
    fail("W12 locator set contains a duplicate immutable object version");
  }
  if (!SHA256.test(value.locator_set_sha256 ?? "")
    || value.locator_set_sha256 !== sha256(locatorSetMaterial(value))) {
    fail("W12 locator set digest drifted");
  }
  return Object.freeze({
    valid: true,
    locator_set_sha256: value.locator_set_sha256,
    authorization,
    inputs,
    predecessors,
  });
}

export function createJsonPostgresRehearsalProgramEvent({
  packet,
  locatorSet,
  mode,
  attemptRef,
  negativeTenantId = null,
  validationKind = null,
  rehearsalRestore = null,
} = {}) {
  const validated = validateJsonPostgresRehearsalLocatorSet(
    locatorSet,
    { packet },
  );
  if (!MODES.has(mode) || !packet?.allowed_modes?.includes(mode)) {
    fail("W12 execution mode is not approved");
  }
  if (!TOKEN.test(attemptRef ?? "")) {
    fail("W12 execution attempt_ref is invalid");
  }
  if (DATABASE_MODES.has(mode)
    && (!TOKEN.test(negativeTenantId ?? "")
      || packet.target.approved_tenant_ids.includes(negativeTenantId))) {
    fail("W12 database execution requires a distinct negative tenant");
  }
  if (validationKind != null
    && (!VALIDATION_KINDS.has(validationKind) || mode !== "readback")) {
    fail("W12 rehearsal validation requires an approved readback kind");
  }
  if (rehearsalRestore != null
    && !["readback", "reconcile"].includes(mode)) {
    fail("W12 rehearsal restore requires readback or reconciliation");
  }
  if (validationKind != null && rehearsalRestore != null) {
    fail("W12 validation and isolated restore cannot share an invocation");
  }
  const restoreLocators = rehearsalRestore == null
    ? null
    : normalizeLocatorMap(
      rehearsalRestore,
      RESTORE_INPUT_KEYS,
      packet,
      "W12 restore locators",
    );
  return Object.freeze({
    action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
    attempt_ref: attemptRef,
    phase: "w12-real-data-rehearsal",
    mode,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: packet.bindings.artifact_sha256,
    packet_sha256: packet.packet_sha256,
    ...(validationKind ? {
      stage: `w12-${validationKind}`,
      rehearsal_validation_kind: validationKind,
    } : {}),
    ...(restoreLocators ? {
      stage: "w12-restore",
      rehearsal_restore: restoreLocators,
    } : {}),
    authorization: validated.authorization,
    inputs: Object.freeze({
      ...validated.inputs,
      predecessors: validated.predecessors,
    }),
    ...(negativeTenantId
      ? { negative_tenant_id: negativeTenantId }
      : {}),
  });
}

function expectedClaims(mode) {
  const writes = WRITE_MODES.has(mode);
  return Object.freeze({
    real_data_read: mode !== "preflight",
    real_data_mutated: writes,
    database_write: writes,
    production_contacted: false,
    production_write: false,
    authority_activated: false,
    json_authority_disabled: false,
    dms_bytes_in_evidence: false,
    release: false,
    go_live: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
}

function validateSafeCounts(safeCounts) {
  if (!safeCounts || typeof safeCounts !== "object"
    || Array.isArray(safeCounts)) {
    fail("W12 result safe_counts is invalid");
  }
  for (const [key, value] of Object.entries(safeCounts)) {
    if (!/^[a-z][a-z0-9_]{1,95}$/u.test(key)
      || !Number.isSafeInteger(value)
      || value < 0) {
      fail("W12 result contains an unsafe count");
    }
  }
  if (ZERO_AUTHORITY_COUNTERS.some((key) => safeCounts[key] !== 0)) {
    fail("W12 result retains a legacy authority counter");
  }
}

function validatePerformance(value, mode) {
  const expected = [
    "dry-run",
    "stage",
    "commit",
    "resume",
    "readback",
    "reconcile",
  ]
    .includes(mode);
  if (!expected) {
    if (value != null) fail("W12 result contains unexpected performance data");
    return;
  }
  const integerKeys = [
    "measurement_count",
    "elapsed_ms",
    "operation_p50_ms",
    "operation_p95_ms",
    "operation_p99_ms",
    "records_per_tenant",
    "largest_domain_batch_size",
    "materialized_payload_bytes",
    "retry_count",
    "conflict_count",
    "pool_total_count",
    "pool_idle_count",
    "pool_waiting_count",
    "outbox_lag_p95_ms",
  ];
  if (!value || typeof value !== "object" || Array.isArray(value)
    || integerKeys.some((key) => (
      !Number.isSafeInteger(value[key]) || value[key] < 0
    ))
    || value.measurement_count < 1
    || value.elapsed_ms < 1
    || value.operation_p50_ms < 1
    || value.operation_p95_ms < value.operation_p50_ms
    || value.operation_p99_ms < value.operation_p95_ms) {
    fail("W12 performance measurement is missing or invalid");
  }
}

function validateClaims(claims, mode) {
  const expected = expectedClaims(mode);
  if (!claims || typeof claims !== "object" || Array.isArray(claims)
    || Object.keys(expected).some((key) => claims[key] !== expected[key])) {
    fail("W12 result claims drifted");
  }
}

export function validateJsonPostgresRehearsalProgramResponse(response = {}, {
  packet,
  mode,
  validationKind = null,
  rehearsalRestore = false,
} = {}) {
  if (response.outcome !== "PASS"
    || response.action !== JSON_POSTGRES_PROGRAM_ADMIN_ACTION
    || response.phase !== "w12-real-data-rehearsal"
    || response.mode !== mode
    || response.source_sha !== packet?.source_sha
    || response.source_tree !== packet?.source_tree
    || response.packet_sha256 !== packet?.packet_sha256
    || response.first_write_state !== "NOT_PRODUCTION"
    || !SHA256.test(response.result_sha256 ?? "")
    || !SHA256.test(response.execution_evidence_sha256 ?? "")
    || !SHA256.test(response.approval_receipt_sha256 ?? "")
    || !SHA256.test(response.authorization_claim_sha256 ?? "")
    || response.raw_value_returned !== false
    || response.pii_returned !== false
    || response.secret_material_returned !== false) {
    fail("W12 Lambda execution response failed or drifted");
  }
  if (validationKind == null) {
    if (response.rehearsal_validation_kind != null
      || response.rehearsal_validation_result_sha256 != null
      || response.rehearsal_validation_evidence_sha256 != null) {
      fail("W12 Lambda execution response contains an unrequested validation");
    }
  } else if (!VALIDATION_KINDS.has(validationKind)
    || response.rehearsal_validation_kind !== validationKind
    || !SHA256.test(response.rehearsal_validation_result_sha256 ?? "")
    || !SHA256.test(response.rehearsal_validation_evidence_sha256 ?? "")) {
    fail("W12 Lambda rehearsal validation response failed or drifted");
  }
  if (!rehearsalRestore) {
    if (response.rehearsal_restore_target_sha256 != null
      || response.rehearsal_restore_evidence_sha256 != null
      || response.rpo_ms != null
      || response.rto_ms != null) {
      fail("W12 Lambda response contains an unrequested restore");
    }
  } else if (!["readback", "reconcile"].includes(mode)
    || !SHA256.test(response.rehearsal_restore_target_sha256 ?? "")
    || !SHA256.test(response.rehearsal_restore_evidence_sha256 ?? "")
    || !Number.isSafeInteger(response.rpo_ms)
    || response.rpo_ms < 0
    || !Number.isSafeInteger(response.rto_ms)
    || response.rto_ms < 0) {
    fail("W12 Lambda rehearsal restore response failed or drifted");
  }
  validateSafeCounts(response.safe_counts);
  validatePerformance(response.performance, mode);
  validateClaims(response.claims, mode);
  return Object.freeze({
    valid: true,
    result_sha256: response.result_sha256,
    execution_evidence_sha256: response.execution_evidence_sha256,
  });
}

export function validateJsonPostgresRehearsalRestoreEvidence(value = {}, {
  packet,
  mode,
  response,
  restoreTarget,
  performanceAcceptance,
} = {}) {
  if (value.schema_version
      !== "law-firm-os.json-postgres-rehearsal-restore-readback-result.v1"
    || !["readback", "reconcile"].includes(mode)
    || value.mode !== mode
    || value.outcome !== "PASS"
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.restore_target_sha256
      !== restoreTarget?.restore_target_sha256
    || value.restore_target_sha256
      !== response?.rehearsal_restore_target_sha256
    || value.performance_acceptance_sha256
      !== performanceAcceptance?.acceptance_sha256
    || value.migration_result_sha256
      !== restoreTarget?.migration_result_sha256
    || value.rpo_ms !== restoreTarget?.rpo_ms
    || value.rto_ms !== restoreTarget?.rto_ms
    || value.rpo_target_met !== true
    || value.rto_target_met !== true
    || value.raw_value_returned !== false
    || value.pii_returned !== false
    || value.secret_material_returned !== false) {
    fail("W12 immutable rehearsal restore evidence failed or drifted");
  }
  return Object.freeze({
    valid: true,
    restore_target_sha256: value.restore_target_sha256,
    rpo_ms: value.rpo_ms,
    rto_ms: value.rto_ms,
  });
}

export function validateJsonPostgresRehearsalValidationEvidence(value = {}, {
  packet,
  validationKind,
  response,
} = {}) {
  const expectedVersion = validationKind === "failure-injection"
    ? "law-firm-os.json-postgres-rehearsal-failure-injection.v1"
    : validationKind === "owner-sampling"
      ? "law-firm-os.json-postgres-rehearsal-owner-sampling.v1"
      : null;
  if (!expectedVersion
    || value.schema_version !== expectedVersion
    || value.outcome !== "PASS"
    || value.result_sha256
      !== response?.rehearsal_validation_result_sha256
    || !SHA256.test(value.result_sha256 ?? "")
    || value.claims?.raw_value_returned !== false
    || value.claims?.pii_returned !== false
    || value.claims?.secret_material_returned !== false) {
    fail("W12 immutable rehearsal validation evidence failed or drifted");
  }
  if (validationKind === "failure-injection") {
    if (value.claims.durable_probe_write !== false
      || value.claims.source_mutated !== false
      || value.safe_counts?.partial_commit_count !== 0
      || value.safe_counts?.residual_probe_record_count !== 0
      || value.safe_counts?.residual_probe_audit_count !== 0
      || value.safe_counts?.residual_probe_outbox_count !== 0
      || value.safe_counts?.cross_tenant_write_count !== 0
      || Object.values(value.checks ?? {}).some((item) => item !== true)) {
      fail("W12 failure-injection evidence contains a failed invariant");
    }
  } else {
    if (value.packet_sha256 !== packet?.packet_sha256
      || !SHA256.test(value.sample_set_sha256 ?? "")
      || !Array.isArray(value.samples)
      || value.samples.length < 5
      || value.safe_counts?.owner_sample_variance_count !== 0
      || value.claims.read_only !== true
      || value.samples.some((sample) => (
        !["account", "employee", "client", "matter", "document"]
          .includes(sample?.sample_kind)
        || !SHA256.test(sample?.sample_ref ?? "")
        || !SHA256.test(sample?.content_sha256 ?? "")
        || !Number.isSafeInteger(sample?.state_version)
        || sample.state_version < 1
      ))) {
      fail("W12 owner-sampling evidence contains a failed invariant");
    }
  }
  const material = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "result_sha256"),
  );
  if (sha256(canonicalizeJson(material)) !== value.result_sha256) {
    fail("W12 immutable rehearsal validation evidence digest drifted");
  }
  return Object.freeze({
    valid: true,
    validation_kind: validationKind,
    result_sha256: value.result_sha256,
  });
}

export function validateJsonPostgresRehearsalExecutionEvidence(value = {}, {
  packet,
  mode,
  response,
} = {}) {
  if (value.schema_version
      !== "law-firm-os.json-postgres-execution-result.v1"
    || value.phase !== "w12-real-data-rehearsal"
    || value.mode !== mode
    || value.outcome !== "PASS"
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.first_write_state !== "NOT_PRODUCTION"
    || value.result_sha256 !== response?.result_sha256
    || value.claims?.dms_bytes_in_evidence !== false
    || value.claims?.raw_value_returned !== false
    || value.claims?.pii_returned !== false
    || value.claims?.secret_material_returned !== false) {
    fail("W12 immutable execution evidence failed or drifted");
  }
  validateSafeCounts(value.safe_counts);
  validatePerformance(value.performance, mode);
  validateClaims(value.claims, mode);
  if (sha256(canonicalizeJson(Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "result_sha256"),
  ))) !== value.result_sha256) {
    fail("W12 immutable execution evidence result digest drifted");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
  });
}
