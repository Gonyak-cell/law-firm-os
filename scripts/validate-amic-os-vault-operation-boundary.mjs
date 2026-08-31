#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VAULT_OPERATION_KINDS,
  VAULT_OPERATION_RECEIPT_SCHEMA_VERSION,
  VAULT_OPERATION_STAGES,
} from "../packages/dms/src/vault-operation-receipt.js";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");
const contractPath = "contracts/amic-os-vault-operation-boundary.json";

const DATA_CLASS_IDS = Object.freeze([
  "native_identity",
  "local_path",
  "document_bytes",
  "credentials",
  "storage_locator",
  "mail_pii",
  "exact_version",
]);
const SURFACE_IDS = Object.freeze([
  "desktop_renderer",
  "desktop_main",
  "api_bff",
  "vault_authority",
  "office_js",
  "classic_native",
  "local_broker",
  "protected_temp",
]);
const CROSSING_IDS = Object.freeze([
  "renderer_to_main_choose",
  "main_to_api_upload",
  "api_to_vault_authority",
  "officejs_to_api_attach",
  "native_to_broker_attach",
  "broker_to_api_attach",
  "broker_to_native_stream",
  "native_to_protected_temp",
]);
const NEGATIVE_IDS = Object.freeze([
  "SEC-N01", "SEC-N02", "SEC-N03", "SEC-N04", "SEC-N05", "SEC-N06",
  "AUD-N01", "AUD-N02", "AUD-N03", "AUD-N04",
]);
const EXACT_VERSION_FIELDS = Object.freeze([
  "document_id", "version_id", "file_object_id", "sha256", "byte_size", "mime_type",
]);

function fail(message) {
  throw new Error(`AMIC_OS_VAULT_OPERATION_BOUNDARY_INVALID: ${message}`);
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drifted`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  exact(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function uniqueStrings(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array`);
  if (value.some((entry) => typeof entry !== "string" || entry.trim() !== entry || !entry)) {
    fail(`${label} must contain trimmed non-empty strings`);
  }
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
}

function includesText(values, pattern, label) {
  if (!values.some((value) => pattern.test(value))) fail(`${label} is missing`);
}

function validateDecision(value) {
  exactKeys(value, [
    "authority",
    "automatic_latest_version_allowed",
    "client_authority_fields_trusted",
    "database_migration_required",
    "lawos_database_migration_count",
    "operation_receipts_append_only",
    "production_ready_claim",
    "runtime_integration_pending",
    "vault_database_migration_count",
  ], "decision");
  if (value.authority !== "vault") fail("Vault must remain the document and policy authority");
  if (value.database_migration_required !== false
      || value.lawos_database_migration_count !== 0
      || value.vault_database_migration_count !== 0) {
    fail("SEC-00/AUD-00 must not add a database migration");
  }
  if (value.client_authority_fields_trusted !== false) fail("client authority must remain untrusted");
  if (value.automatic_latest_version_allowed !== false) fail("latest-version substitution must remain forbidden");
  if (value.operation_receipts_append_only !== true) fail("operation receipts must remain append-only");
  if (value.runtime_integration_pending !== true || value.production_ready_claim !== false) {
    fail("the source contract cannot claim runtime or production completion");
  }
}

function validateDataClasses(value) {
  if (!Array.isArray(value)) fail("data_classes must be an array");
  exact(value.map((item) => item?.id), DATA_CLASS_IDS, "data class order and IDs");
  for (const item of value) {
    exactKeys(item, ["id", "rule"], `data class ${item?.id ?? "unknown"}`);
    if (typeof item.rule !== "string" || item.rule.length < 40) fail(`data class ${item.id} rule is incomplete`);
  }
  const rules = value.map((item) => item.rule);
  includesText(rules, /verified server session/iu, "server-derived identity rule");
  includesText(rules, /never crosses IPC, HTTP, UI, audit, or logging/iu, "raw-path boundary rule");
  includesText(rules, /bounded streaming/iu, "bounded byte-stream rule");
  includesText(rules, /unrestricted URLs/iu, "unrestricted URL rule");
  includesText(rules, /latest substitution is forbidden/iu, "exact-version rule");
}

function validateSurfaces(value) {
  if (!Array.isArray(value)) fail("surfaces must be an array");
  exact(value.map((item) => item?.id), SURFACE_IDS, "surface order and IDs");
  for (const surface of value) {
    if (typeof surface.trust !== "string" || !surface.trust) fail(`surface ${surface.id} trust is missing`);
    const listKeys = Object.keys(surface).filter((key) => key.endsWith("inputs") || key.endsWith("outputs"));
    if (listKeys.length !== 2) fail(`surface ${surface.id} must define one allowed and one forbidden list`);
    for (const key of listKeys) uniqueStrings(surface[key], `surface ${surface.id} ${key}`);
  }
  const byId = new Map(value.map((item) => [item.id, item]));
  includesText(byId.get("desktop_renderer").forbidden_inputs, /raw local path/iu, "renderer raw-path prohibition");
  includesText(byId.get("desktop_renderer").forbidden_inputs, /session token/iu, "renderer token prohibition");
  includesText(byId.get("api_bff").forbidden_outputs, /storage locator/iu, "API storage-locator prohibition");
  includesText(byId.get("office_js").forbidden_inputs, /long-lived bearer/iu, "Office.js long-bearer prohibition");
  includesText(byId.get("classic_native").forbidden_inputs, /session token/iu, "native token prohibition");
  includesText(byId.get("local_broker").forbidden_outputs, /private key/iu, "broker private-key prohibition");
  includesText(byId.get("protected_temp").forbidden_outputs, /raw path over IPC or HTTP/iu, "temp path prohibition");
}

function validateCrossings(value) {
  if (!Array.isArray(value)) fail("crossings must be an array");
  exact(value.map((item) => item?.id), CROSSING_IDS, "crossing order and IDs");
  for (const crossing of value) {
    exactKeys(crossing, ["from", "id", "invariants", "payload", "to", "trigger"], `crossing ${crossing?.id ?? "unknown"}`);
    if (!SURFACE_IDS.includes(crossing.from) || !SURFACE_IDS.includes(crossing.to)) {
      fail(`crossing ${crossing.id} references an unknown surface`);
    }
    uniqueStrings(crossing.invariants, `crossing ${crossing.id} invariants`);
  }
  const byId = new Map(value.map((item) => [item.id, item]));
  includesText(byId.get("renderer_to_main_choose").invariants, /raw path and bytes do not cross/iu, "renderer/main data rule");
  includesText(byId.get("main_to_api_upload").invariants, /tenant and actor are server-derived/iu, "server identity crossing rule");
  includesText(byId.get("api_to_vault_authority").invariants, /missing authority fails closed/iu, "Vault authority outage rule");
  includesText(byId.get("officejs_to_api_attach").invariants, /ItemChanged performs zero login, readiness, Vault network, or processing/iu, "ItemChanged zero-work rule");
  includesText(byId.get("native_to_broker_attach").invariants, /startup and item selection perform zero network work/iu, "native quiet-start rule");
  includesText(byId.get("broker_to_native_stream").invariants, /path never crosses IPC/iu, "native stream/path rule");
}

function validateReceipt(value) {
  exactKeys(value, [
    "client_safe_identity_fields",
    "exact_version_fields",
    "never_included",
    "operation_kinds",
    "replay_rule",
    "schema_version",
    "server_internal_only_fields",
    "stages",
    "transition_rule",
  ], "receipt");
  if (value.schema_version !== VAULT_OPERATION_RECEIPT_SCHEMA_VERSION) fail("receipt schema differs from runtime code");
  exact(value.operation_kinds, VAULT_OPERATION_KINDS, "receipt operation kinds");
  exact(value.stages, VAULT_OPERATION_STAGES, "receipt stages");
  exact(value.exact_version_fields, EXACT_VERSION_FIELDS, "receipt exact-version fields");
  uniqueStrings(value.server_internal_only_fields, "server internal receipt fields");
  uniqueStrings(value.client_safe_identity_fields, "client-safe receipt fields");
  uniqueStrings(value.never_included, "never-included receipt fields");
  for (const field of ["tenant_id", "actor_id", "idempotency_key"]) {
    if (!value.server_internal_only_fields.includes(field)) fail(`${field} must remain server-internal`);
    if (value.client_safe_identity_fields.includes(field)) fail(`${field} cannot become client-visible`);
  }
  for (const field of ["document_id", "version_id", "file_object_id", "sha256"]) {
    if (!value.exact_version_fields.includes(field)) fail(`receipt is missing exact ${field}`);
  }
  if (!/should_execute false/iu.test(value.replay_rule)) fail("replay must explicitly suppress execution");
  if (!/append-only/iu.test(value.transition_rule)) fail("receipt transition must remain append-only");
}

function validateNegativeMatrix(value) {
  if (!Array.isArray(value)) fail("negative_matrix must be an array");
  exact(value.map((item) => item?.id), NEGATIVE_IDS, "negative matrix order and IDs");
  for (const item of value) {
    exactKeys(item, ["attack", "expected_safe_error_code", "id"], `negative case ${item?.id ?? "unknown"}`);
    if (!/^VAULT_[A-Z0-9_]+$/u.test(item.expected_safe_error_code)) fail(`negative case ${item.id} safe code is invalid`);
    if (typeof item.attack !== "string" || item.attack.length < 30) fail(`negative case ${item.id} is incomplete`);
  }
  const byId = new Map(value.map((item) => [item.id, item.expected_safe_error_code]));
  for (const id of ["SEC-N01", "SEC-N02", "SEC-N03", "SEC-N05", "SEC-N06"]) {
    if (byId.get(id) !== "VAULT_BOUNDARY_SECRET_FORBIDDEN") fail(`${id} must fail at the boundary`);
  }
  if (byId.get("SEC-N04") !== "VAULT_CLIENT_AUTHORITY_FIELD_FORBIDDEN") fail("tenant confusion code drifted");
  if (byId.get("AUD-N01") !== "VAULT_OPERATION_IDEMPOTENCY_CONFLICT") fail("replay conflict code drifted");
  if (byId.get("AUD-N03") !== "VAULT_OPERATION_EXACT_VERSION_MISMATCH") fail("version substitution code drifted");
  if (byId.get("AUD-N04") !== "VAULT_OPERATION_TRANSITION_INVALID") fail("transition code drifted");
}

export async function validateAmicOsVaultOperationBoundary({
  repoRoot = defaultRepoRoot,
  contractOverride,
} = {}) {
  const contract = contractOverride ?? JSON.parse(await readFile(path.join(repoRoot, contractPath), "utf8"));
  exactKeys(contract, [
    "crossings", "data_classes", "decision", "negative_matrix", "receipt", "schema_version", "surfaces",
  ], "contract");
  if (contract.schema_version !== "law-firm-os.amic-os-vault-operation-boundary.v1") fail("schema version drifted");
  validateDecision(contract.decision);
  validateDataClasses(contract.data_classes);
  validateSurfaces(contract.surfaces);
  validateCrossings(contract.crossings);
  validateReceipt(contract.receipt);
  validateNegativeMatrix(contract.negative_matrix);
  return Object.freeze({
    schema_version: "law-firm-os.amic-os-vault-operation-boundary-validation.v1",
    verdict: "PASS",
    surface_count: SURFACE_IDS.length,
    crossing_count: CROSSING_IDS.length,
    negative_case_count: NEGATIVE_IDS.length,
    operation_kind_count: VAULT_OPERATION_KINDS.length,
    receipt_stage_count: VAULT_OPERATION_STAGES.length,
    database_migration_required: false,
    runtime_integration_pending: true,
    production_ready_claim: false,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  validateAmicOsVaultOperationBoundary()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
