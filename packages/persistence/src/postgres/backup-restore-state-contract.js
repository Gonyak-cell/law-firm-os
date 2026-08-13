import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import { validateJsonPostgresPerformanceAcceptance } from "./performance-acceptance.js";

export const JSON_POSTGRES_BACKUP_RESTORE_STATE_VERSION = "law-firm-os.json-postgres-backup-restore-state.v1";
export const JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS = Object.freeze([
  "identity_directory", "domain_records", "idempotency_ledger", "security_audit",
  "outbox", "dms_metadata", "dms_original_versions",
]);

const COMPONENT_SET = new Set(JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS);
const STATE_KEYS = Object.freeze([
  "schema_version", "source_sha", "source_tree", "pilot_id", "lawos_tenant_id",
  "entra_tenant_id", "backup_point_at", "authority_manifest_sha256", "components", "state_sha256",
]);
const INPUT_KEYS = Object.freeze(STATE_KEYS.filter((key) => !["schema_version", "state_sha256"].includes(key)));
const COMPONENT_KEYS = Object.freeze(["component_id", "item_count", "content_sha256"]);
const BINDING_KEYS = Object.freeze([
  ["source_sha", "sourceSha", "source_sha"], ["source_tree", "sourceTree", "source_tree"],
  ["pilot_id", "pilotId", "pilot_id"], ["lawos_tenant_id", "lawosTenantId", "lawos_tenant_id"],
  ["entra_tenant_id", "entraTenantId", "entra_tenant_id"], ["backup_point_at", "backupPointAt", "backup_point_at"],
  ["authority_manifest_sha256", "authorityManifestSha256", "authority_manifest_sha256"],
  ["state_sha256", "stateSha256", "state_sha256"],
]);
const EXPECTED_KEYS = Object.freeze(BINDING_KEYS.map(([, camel]) => camel));
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (message) => { throw new TypeError(message); };

function exactKeys(value, keys, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const unsupported = Object.keys(value).filter((key) => !keys.includes(key));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (unsupported.length) fail(`${label} contains unsupported fields: ${unsupported.join(",")}`);
  if (missing.length) fail(`${label} is missing required fields: ${missing.join(",")}`);
}

function exactSha(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${label} must be an exact lowercase digest`);
}

function exactToken(value, label) {
  if (typeof value !== "string" || !TOKEN.test(value)) fail(`${label} must be an ASCII identifier`);
}

function exactUtc(value, label) {
  if (typeof value !== "string" || !UTC.test(value)) fail(`${label} must be an RFC 3339 UTC timestamp`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${label} is invalid`);
  const canonical = new Date(parsed).toISOString();
  if (canonical !== value) fail(`${label} is not a real UTC timestamp`);
  return parsed;
}

function stateMaterial(value) {
  return {
    schema_version: value.schema_version, source_sha: value.source_sha, source_tree: value.source_tree,
    pilot_id: value.pilot_id, lawos_tenant_id: value.lawos_tenant_id, entra_tenant_id: value.entra_tenant_id,
    backup_point_at: value.backup_point_at, authority_manifest_sha256: value.authority_manifest_sha256,
    components: value.components.map(({ component_id, item_count, content_sha256 }) => ({ component_id, item_count, content_sha256 })),
  };
}

function stateDigest(value) {
  return createHash("sha256").update(canonicalizeJson(stateMaterial(value))).digest("hex");
}

function normalizeComponents(components) {
  if (!Array.isArray(components) || components.length !== COMPONENT_SET.size) {
    fail("components must contain exactly the seven required components");
  }
  const seen = new Set();
  const normalized = components.map((component) => {
    exactKeys(component, COMPONENT_KEYS, "backup/restore component");
    const id = component.component_id;
    exactToken(id, "component_id");
    if (!COMPONENT_SET.has(id)) fail(`unsupported backup/restore component: ${id}`);
    if (seen.has(id)) fail(`duplicate backup/restore component: ${id}`);
    seen.add(id);
    if (!Number.isSafeInteger(component.item_count) || component.item_count < 0) {
      fail(`component ${id} item_count must be a non-negative safe integer`);
    }
    exactSha(component.content_sha256, SHA256, `${id}.content_sha256`);
    return { component_id: id, item_count: component.item_count, content_sha256: component.content_sha256 };
  });
  if (seen.size !== COMPONENT_SET.size) {
    fail(`missing backup/restore components: ${JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS.filter((id) => !seen.has(id)).join(",")}`);
  }
  return normalized.sort((left, right) => left.component_id.localeCompare(right.component_id));
}

function validateIdentity(value) {
  exactSha(value.source_sha, SHA1, "source_sha");
  exactSha(value.source_tree, SHA1, "source_tree");
  exactToken(value.pilot_id, "pilot_id");
  exactToken(value.lawos_tenant_id, "lawos_tenant_id");
  if (UUID.test(value.lawos_tenant_id)) fail("lawos_tenant_id must not be an Entra UUID");
  if (typeof value.entra_tenant_id !== "string" || !UUID.test(value.entra_tenant_id)) fail("entra_tenant_id must be a UUID");
  if (value.lawos_tenant_id.toLowerCase() === value.entra_tenant_id.toLowerCase()) fail("lawos_tenant_id and entra_tenant_id must be distinct");
  exactUtc(value.backup_point_at, "backup_point_at");
  exactSha(value.authority_manifest_sha256, SHA256, "authority_manifest_sha256");
}

function assertExpectedBindings(value, expected = {}) {
  if (!isRecord(expected)) fail("expected bindings must be an object");
  const unsupported = Object.keys(expected).filter((key) => !EXPECTED_KEYS.includes(key));
  if (unsupported.length) fail(`expected bindings contain unsupported fields: ${unsupported.join(",")}`);
  for (const [field, camel] of BINDING_KEYS) {
    if (Object.hasOwn(expected, camel) && value[field] !== expected[camel]) fail(`backup/restore state ${field} binding drifted`);
  }
}

export function createJsonPostgresBackupRestoreState(input = {}) {
  exactKeys(input, INPUT_KEYS, "backup/restore state input");
  const value = {
    schema_version: JSON_POSTGRES_BACKUP_RESTORE_STATE_VERSION,
    source_sha: input.source_sha, source_tree: input.source_tree, pilot_id: input.pilot_id,
    lawos_tenant_id: input.lawos_tenant_id, entra_tenant_id: input.entra_tenant_id,
    backup_point_at: input.backup_point_at, authority_manifest_sha256: input.authority_manifest_sha256,
    components: normalizeComponents(input.components),
  };
  validateIdentity(value);
  value.state_sha256 = stateDigest(value);
  const frozen = Object.freeze({
    ...value,
    components: Object.freeze(value.components.map((component) => Object.freeze({ ...component }))),
  });
  validateJsonPostgresBackupRestoreState(frozen);
  return frozen;
}

export function validateJsonPostgresBackupRestoreState(value = {}, expected = {}) {
  exactKeys(value, STATE_KEYS, "backup/restore state");
  if (value.schema_version !== JSON_POSTGRES_BACKUP_RESTORE_STATE_VERSION) fail("backup/restore state schema_version is invalid");
  validateIdentity(value);
  const normalized = normalizeComponents(value.components);
  if (normalized.some((component, index) => {
    const actual = value.components[index];
    return actual.component_id !== component.component_id
      || actual.item_count !== component.item_count
      || actual.content_sha256 !== component.content_sha256;
  })) {
    fail("components must be in canonical sorted order");
  }
  exactSha(value.state_sha256, SHA256, "state_sha256");
  if (value.state_sha256 !== stateDigest(value)) fail("backup/restore state_sha256 digest drifted");
  assertExpectedBindings(value, expected);
  let itemCountTotal = 0;
  for (const component of value.components) {
    itemCountTotal += component.item_count;
    if (!Number.isSafeInteger(itemCountTotal)) fail("backup/restore aggregate item count exceeds safe integer range");
  }
  return Object.freeze({ valid: true, state_sha256: value.state_sha256, component_count: value.components.length, item_count_total: itemCountTotal });
}

export function assertExactJsonPostgresBackupRestore({ expected, restored } = {}) {
  const expectedValidation = validateJsonPostgresBackupRestoreState(expected);
  const restoredValidation = validateJsonPostgresBackupRestoreState(restored);
  const tupleFields = ["schema_version", "source_sha", "source_tree", "pilot_id", "lawos_tenant_id", "entra_tenant_id", "backup_point_at", "authority_manifest_sha256"];
  if (tupleFields.some((field) => expected[field] !== restored[field])) fail("backup/restore exact binding tuple mismatched");
  if (expectedValidation.state_sha256 !== restoredValidation.state_sha256) fail("backup/restore state hashes mismatched");
  return Object.freeze({
    valid: true, exact_state_match: true, provider_restore_observed: false,
    expected_state_sha256: expectedValidation.state_sha256, restored_state_sha256: restoredValidation.state_sha256,
  });
}

export function calculateJsonPostgresBackupRestoreObjectives({
  backupPointAt, startedAt, finishedAt, performanceAcceptance, approvedRpoSeconds, approvedRtoSeconds, approvedThresholdSha256,
} = {}) {
  const backupPointMs = exactUtc(backupPointAt, "backupPointAt");
  const startedMs = exactUtc(startedAt, "startedAt");
  const finishedMs = exactUtc(finishedAt, "finishedAt");
  if (backupPointMs > startedMs || startedMs > finishedMs) fail("backup/restore objective timestamps are out of order");
  const acceptance = validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  for (const [value, label, maximum] of [[approvedRpoSeconds, "approvedRpoSeconds", 86_400], [approvedRtoSeconds, "approvedRtoSeconds", 14_400]]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) fail(`${label} must be a safe integer between 0 and ${maximum} seconds`);
  }
  exactSha(approvedThresholdSha256, SHA256, "approvedThresholdSha256");
  if (approvedThresholdSha256 !== acceptance.acceptance_sha256) fail("approved threshold digest does not match performance acceptance");
  const effectiveRpoLimitSeconds = Math.min(approvedRpoSeconds, Math.floor(acceptance.rpo_target_ms / 1_000));
  const effectiveRtoLimitSeconds = Math.min(approvedRtoSeconds, Math.floor(acceptance.rto_target_ms / 1_000));
  const rpoSeconds = Math.ceil((startedMs - backupPointMs) / 1_000);
  const rtoSeconds = Math.ceil((finishedMs - startedMs) / 1_000);
  if (rpoSeconds > effectiveRpoLimitSeconds || rtoSeconds > effectiveRtoLimitSeconds) fail("backup/restore objective exceeds the effective approved threshold");
  return Object.freeze({
    valid: true, rpo_seconds: rpoSeconds, rto_seconds: rtoSeconds,
    effective_rpo_limit_seconds: effectiveRpoLimitSeconds, effective_rto_limit_seconds: effectiveRtoLimitSeconds,
    approved_threshold_sha256: approvedThresholdSha256,
  });
}
