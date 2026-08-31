#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");
const contractPath = "contracts/amic-os-vault-upload-migration-zero.json";

const DEFAULT_NAMESPACE_UUID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
const DEFAULT_NAME_DOMAIN = "amic-os-vault:quarantine-ref:v1";
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const UUID_V5 = /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

const PROOF_IDS = Object.freeze(["M0-01", "M0-02", "M0-03", "M0-04", "M0-05"]);
const NEGATIVE_IDS = Object.freeze([
  "M0-N01", "M0-N02", "M0-N03", "M0-N04", "M0-N05", "M0-N06",
]);
const GAP_IDS = Object.freeze(["G1", "G2", "G3", "G4", "G5"]);
const ALGORITHM_IDS = Object.freeze(["A1", "A2", "A3", "A4", "A5", "A6", "A7"]);
const SOURCE_PATHS = Object.freeze([
  "db/migrations/0001_initial_schema.sql",
  "db/migrations/0199_create_file_security_scans.sql",
  "db/migrations/0204_create_file_security_promotion_inputs.sql",
  "db/migrations/0207_make_file_security_promotions_version_scoped.sql",
  "apps/api/src/modules/file-security/quarantine-intake.service.ts",
  "apps/api/src/modules/file-security/file-security.service.ts",
  "apps/api/src/modules/file-security/file-promotion.service.ts",
  "apps/api/src/modules/file-security/file-security-reconciler.service.ts",
  "apps/api/src/modules/file-security/file-scan-queue.service.ts",
  "apps/api/src/modules/storage/storage.service.ts",
  "apps/api/src/modules/storage/s3-storage.adapter.ts",
  "apps/api/src/modules/storage/storage-path.resolver.ts",
  "apps/api/src/modules/audit/audit.service.ts",
  "packages/shared/src/audit/audit-metadata-keys.ts",
  "apps/api/src/modules/document/document-upload.service.ts",
]);

function fail(message) {
  throw new Error(`AMIC_OS_VAULT_UPLOAD_MIGRATION_ZERO_INVALID: ${message}`);
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drifted`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  exact(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function nonEmptyStrings(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array`);
  if (value.some((item) => typeof item !== "string" || !item || item !== item.trim())) {
    fail(`${label} must contain trimmed strings`);
  }
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
}

function uuidBytes(value) {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/u.test(value)) {
    fail("namespace_uuid is invalid");
  }
  const compact = value.replaceAll("-", "");
  if (compact.length !== 32) fail("namespace_uuid is invalid");
  return Buffer.from(compact, "hex");
}

function formatUuid(bytes) {
  const value = bytes.toString("hex");
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20, 32),
  ].join("-");
}

/**
 * Derives the deterministic opaque reference used by the schema proof. This is
 * UUIDv5 identity mapping, not encryption and not a reversible encoding. A
 * provider must still compare the immutable audit binding after lookup.
 */
export function deriveVaultQuarantineReference(
  operationId,
  {
    namespaceUuid = DEFAULT_NAMESPACE_UUID,
    nameDomain = DEFAULT_NAME_DOMAIN,
  } = {},
) {
  if (!OPERATION_ID.test(operationId ?? "")) fail("operation_id is invalid");
  const digest = createHash("sha1")
    .update(uuidBytes(namespaceUuid))
    .update(Buffer.from(`${nameDomain}\u0000${operationId}`, "utf8"))
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const result = formatUuid(bytes);
  if (!UUID_V5.test(result)) fail("derived quarantine reference is not a UUIDv5");
  return result;
}

function validateDecision(value) {
  exactKeys(value, [
    "database_migration_required",
    "production_ready_claim",
    "proof_scope",
    "provider_ready",
    "successor_provider_source_change_required",
    "vault_database_migration_count",
    "vault_source_clean_at_inspection",
    "vault_source_commit",
    "vault_source_mutated_by_proof",
  ], "decision");
  if (value.database_migration_required !== false || value.vault_database_migration_count !== 0) {
    fail("migration-zero decision is not closed");
  }
  if (value.successor_provider_source_change_required !== true) {
    fail("schema proof must not erase the required Vault source work");
  }
  if (value.provider_ready !== false || value.production_ready_claim !== false) {
    fail("schema proof cannot claim provider or production readiness");
  }
  if (value.proof_scope !== "pinned_source_and_executable_model") fail("proof scope is invalid");
  if (!/^[a-f0-9]{40}$/u.test(value.vault_source_commit)) fail("Vault source commit is invalid");
  if (value.vault_source_clean_at_inspection !== true || value.vault_source_mutated_by_proof !== false) {
    fail("Vault read-only source boundary is invalid");
  }
}

function validateOperationMapping(value) {
  exactKeys(value, [
    "algorithm",
    "collision_rule",
    "name_domain",
    "namespace_uuid",
    "operation_id_pattern",
    "raw_idempotency_key_stored",
    "reversible",
    "test_vectors",
  ], "operation_mapping");
  if (value.operation_id_pattern !== "^vaultop_[a-f0-9]{32}$") fail("operation pattern drifted");
  if (value.algorithm !== "uuid_v5"
      || value.namespace_uuid !== DEFAULT_NAMESPACE_UUID
      || value.name_domain !== DEFAULT_NAME_DOMAIN) {
    fail("deterministic reference mapping drifted");
  }
  if (value.reversible !== false || value.raw_idempotency_key_stored !== false) {
    fail("reference mapping must be opaque and non-reversible");
  }
  if (typeof value.collision_rule !== "string"
      || !/correlation_id/iu.test(value.collision_rule)
      || !/request_id/iu.test(value.collision_rule)
      || !/fails closed/iu.test(value.collision_rule)) {
    fail("derived-reference collision rule is incomplete");
  }
  if (!Array.isArray(value.test_vectors) || value.test_vectors.length !== 2) {
    fail("two mapping test vectors are required");
  }
  for (const vector of value.test_vectors) {
    exactKeys(vector, ["operation_id", "quarantine_ref"], "mapping test vector");
    const derived = deriveVaultQuarantineReference(vector.operation_id, {
      namespaceUuid: value.namespace_uuid,
      nameDomain: value.name_domain,
    });
    if (derived !== vector.quarantine_ref) fail(`mapping vector ${vector.operation_id} drifted`);
  }
  if (value.test_vectors[0].quarantine_ref === value.test_vectors[1].quarantine_ref) {
    fail("mapping test vectors collided");
  }
}

function validateOwnerBinding(value) {
  exactKeys(value, [
    "advisory_lock_scope",
    "audit_binding",
    "immutable_input_fields",
    "immutable_scan_fields",
    "owner_uniqueness",
    "same_request_comparison",
  ], "owner_binding");
  if (value.advisory_lock_scope !== "tenant_id + operation_id") fail("lock scope drifted");
  nonEmptyStrings(value.owner_uniqueness, "owner uniqueness");
  nonEmptyStrings(value.immutable_scan_fields, "immutable scan fields");
  nonEmptyStrings(value.immutable_input_fields, "immutable input fields");
  nonEmptyStrings(value.same_request_comparison, "same request comparison");
  for (const field of ["tenant_id", "matter_id", "quarantine_ref", "expected_sha256", "size_bytes", "created_by"]) {
    if (!value.immutable_scan_fields.includes(field)) fail(`immutable scan field ${field} is missing`);
  }
  for (const field of ["original_filename", "normalized_filename", "mime_type", "source_system", "fields_json"]) {
    if (!value.immutable_input_fields.includes(field)) fail(`immutable input field ${field} is missing`);
  }
  for (const field of [
    "tenant_id", "actor_id", "matter_id", "operation_kind", "request_fingerprint",
    "sha256", "byte_size", "mime_type", "document_fields",
  ]) {
    if (!value.same_request_comparison.includes(field)) fail(`replay comparison ${field} is missing`);
  }
  exactKeys(value.audit_binding, [
    "action",
    "atomic_with_owner_and_queue",
    "correlation_id",
    "hash",
    "request_id",
    "target_type",
  ], "audit_binding");
  if (value.audit_binding.action !== "FILE_QUARANTINED"
      || value.audit_binding.target_type !== "file_security_scan"
      || value.audit_binding.correlation_id !== "binding.correlation_id"
      || value.audit_binding.request_id !== "binding.request_fingerprint"
      || value.audit_binding.hash !== "expected_sha256"
      || value.audit_binding.atomic_with_owner_and_queue !== true) {
    fail("atomic audit binding drifted");
  }
}

function validateAlgorithm(value) {
  if (!Array.isArray(value)) fail("successor_algorithm must be an array");
  exact(value.map((entry) => entry?.id), ALGORITHM_IDS, "successor algorithm IDs");
  for (const entry of value) {
    exactKeys(entry, ["id", "rule"], `algorithm ${entry?.id ?? "unknown"}`);
    if (typeof entry.rule !== "string" || entry.rule.length < 100) {
      fail(`algorithm ${entry.id} is incomplete`);
    }
  }
  const joined = value.map((entry) => entry.rule).join(" ");
  for (const pattern of [
    /no client tenant or actor is trusted/iu,
    /transaction advisory lock/iu,
    /request fingerprint/iu,
    /putIfAbsent/iu,
    /one tenant transaction/iu,
    /FOR UPDATE/iu,
    /exactly one promotion/iu,
  ]) {
    if (!pattern.test(joined)) fail(`successor algorithm is missing ${pattern}`);
  }
}

function validateProofCases(value) {
  if (!Array.isArray(value)) fail("proof_cases must be an array");
  exact(value.map((entry) => entry?.id), PROOF_IDS, "proof case IDs");
  for (const entry of value) {
    exactKeys(entry, [
      "claim", "existing_primitives", "id", "provider_implementation_present", "result",
    ], `proof ${entry?.id ?? "unknown"}`);
    if (typeof entry.claim !== "string" || entry.claim.length < 50) fail(`proof ${entry.id} claim is incomplete`);
    nonEmptyStrings(entry.existing_primitives, `proof ${entry.id} primitives`);
    if (entry.result !== "pass_schema_only" || entry.provider_implementation_present !== false) {
      fail(`proof ${entry.id} overclaims implementation`);
    }
  }
}

function validateNegativeCases(value) {
  if (!Array.isArray(value)) fail("negative_cases must be an array");
  exact(value.map((entry) => entry?.id), NEGATIVE_IDS, "negative case IDs");
  for (const entry of value) {
    exactKeys(entry, ["expected", "id", "scenario"], `negative ${entry?.id ?? "unknown"}`);
    if (typeof entry.scenario !== "string" || entry.scenario.length < 40
        || typeof entry.expected !== "string" || entry.expected.length < 40) {
      fail(`negative ${entry.id} is incomplete`);
    }
  }
}

function validateCurrentGaps(value) {
  if (!Array.isArray(value)) fail("current_source_gaps must be an array");
  exact(value.map((entry) => entry?.id), GAP_IDS, "current source gap IDs");
  for (const entry of value) {
    exactKeys(entry, ["gap", "id"], `gap ${entry?.id ?? "unknown"}`);
    if (typeof entry.gap !== "string" || entry.gap.length < 80) fail(`gap ${entry.id} is incomplete`);
  }
}

async function validateSourceReceipt(value, { vaultRoot, expectedCommit }) {
  if (!Array.isArray(value)) fail("source_receipt must be an array");
  exact(value.map((entry) => entry?.path), SOURCE_PATHS, "source receipt paths");
  for (const entry of value) {
    exactKeys(entry, ["path", "role", "sha256"], `source receipt ${entry?.path ?? "unknown"}`);
    if (path.isAbsolute(entry.path) || entry.path.split("/").includes("..")) {
      fail(`source receipt path ${entry.path} is unsafe`);
    }
    if (!SHA256.test(entry.sha256)) fail(`source receipt hash ${entry.path} is invalid`);
    if (typeof entry.role !== "string" || entry.role.length < 20) fail(`source receipt role ${entry.path} is incomplete`);
  }
  if (!vaultRoot) return false;

  const resolvedVaultRoot = path.resolve(vaultRoot);
  const [{ stdout: head }, { stdout: status }] = await Promise.all([
    execFileAsync("git", ["-C", resolvedVaultRoot, "rev-parse", "HEAD"], { encoding: "utf8" }),
    execFileAsync("git", ["-C", resolvedVaultRoot, "status", "--porcelain=v1"], { encoding: "utf8" }),
  ]);
  if (head.trim() !== expectedCommit) fail("live Vault HEAD differs from the pinned source commit");
  if (status.trim() !== "") fail("live Vault source is dirty");
  for (const entry of value) {
    const body = await readFile(path.join(resolvedVaultRoot, entry.path));
    const actual = createHash("sha256").update(body).digest("hex");
    if (actual !== entry.sha256) fail(`live Vault source hash drifted: ${entry.path}`);
  }
  return true;
}

function validateVerification(value) {
  exactKeys(value, [
    "integration_database_executed",
    "integration_database_reason",
    "lawos_contract_test_command",
    "vault_node_runtime",
    "vault_unit_command",
    "vault_unit_result",
  ], "verification");
  if (value.vault_node_runtime !== "v22.22.3") fail("Vault test runtime drifted");
  if (typeof value.vault_unit_command !== "string" || !/vitest run/iu.test(value.vault_unit_command)) {
    fail("Vault unit command is missing");
  }
  exactKeys(value.vault_unit_result, ["files_passed", "tests_failed", "tests_passed"], "Vault unit result");
  if (value.vault_unit_result.files_passed !== 6
      || value.vault_unit_result.tests_passed !== 34
      || value.vault_unit_result.tests_failed !== 0) {
    fail("Vault unit result drifted");
  }
  if (value.integration_database_executed !== false
      || typeof value.integration_database_reason !== "string"
      || !/does not claim/iu.test(value.integration_database_reason)) {
    fail("integration database boundary is not explicit");
  }
  if (value.lawos_contract_test_command !== "node --test scripts/test/amic-os-vault-upload-migration-zero.test.mjs") {
    fail("LawOS contract test command drifted");
  }
}

export async function validateAmicOsVaultUploadMigrationZero({
  repoRoot = defaultRepoRoot,
  contractOverride,
  vaultRoot,
} = {}) {
  const contract = contractOverride ?? JSON.parse(
    await readFile(path.join(repoRoot, contractPath), "utf8"),
  );
  exactKeys(contract, [
    "current_source_gaps",
    "decision",
    "negative_cases",
    "operation_mapping",
    "owner_binding",
    "proof_cases",
    "schema_version",
    "source_receipt",
    "successor_algorithm",
    "verification",
  ], "contract");
  if (contract.schema_version !== "law-firm-os.amic-os-vault-upload-migration-zero.v1") {
    fail("schema version drifted");
  }
  validateDecision(contract.decision);
  validateOperationMapping(contract.operation_mapping);
  validateOwnerBinding(contract.owner_binding);
  validateAlgorithm(contract.successor_algorithm);
  validateProofCases(contract.proof_cases);
  validateNegativeCases(contract.negative_cases);
  validateCurrentGaps(contract.current_source_gaps);
  validateVerification(contract.verification);
  const liveSourceVerified = await validateSourceReceipt(contract.source_receipt, {
    vaultRoot,
    expectedCommit: contract.decision.vault_source_commit,
  });
  return Object.freeze({
    schema_version: "law-firm-os.amic-os-vault-upload-migration-zero-validation.v1",
    database_migration_required: false,
    vault_database_migration_count: 0,
    successor_provider_source_change_required: true,
    provider_ready: false,
    production_ready_claim: false,
    proof_case_count: PROOF_IDS.length,
    negative_case_count: NEGATIVE_IDS.length,
    source_receipt_count: SOURCE_PATHS.length,
    live_source_verified: liveSourceVerified,
  });
}

function parseCliVaultRoot(argv) {
  if (argv.length === 0) return undefined;
  if (argv.length !== 2 || argv[0] !== "--vault-root" || !argv[1]) {
    fail("usage: validate-amic-os-vault-upload-migration-zero.mjs [--vault-root PATH]");
  }
  return argv[1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const result = await validateAmicOsVaultUploadMigrationZero({
    vaultRoot: parseCliVaultRoot(process.argv.slice(2)),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
