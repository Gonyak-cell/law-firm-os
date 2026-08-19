import {
  CATALOG_READBACK_SHA256 as SHA256,
  CATALOG_READBACK_TOKEN as REVISION_ID,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization-fields.js";

export const CATALOG_READBACK_COUNT_KEYS = Object.freeze([
  "update_function_code",
  "invoke_function",
  "get_function_state",
  "diagnostic_recovery_reads",
  "rollback_recovery_reads",
  "wait_for_function_active",
  "update_function_configuration",
  "iam_writes",
  "secret_writes",
  "vpc_writes",
  "concurrency_writes",
  "database_writes",
]);
export const CATALOG_READBACK_ROLLBACK_KEYS = Object.freeze([
  "policy_required",
  "action_required",
  "attempted",
  "status",
  "restored_state_verified",
  "diagnostic_may_remain",
]);
const FORBIDDEN_COUNTS = Object.freeze([
  "update_function_configuration",
  "iam_writes",
  "secret_writes",
  "vpc_writes",
  "concurrency_writes",
  "database_writes",
]);
const RESERVED_BLOCK_CODES = new Set([
  "BLOCKED_ROLLBACK_FAILED",
  "CATALOG_READBACK_AUTHORITY_NOT_READY",
  "CODE_STATE_UNKNOWN",
  "TASK3_CODE_UPDATE_REJECTED",
]);

function transitionTailIsNull(transitions) {
  return Object.values(transitions).every(
    (entries) => entries[1] === null && entries[2] === null,
  );
}

function exactDiagnosticTransition(transitions, lineage) {
  return REVISION_ID.test(transitions.revisions[1] ?? "")
    && transitions.revisions[1] !== transitions.revisions[0]
    && transitions.code_sha256_base64[1]
      === lineage.artifacts.diagnostic.code_sha256_base64
    && SHA256.test(
      transitions.configuration_fingerprint_sha256[1] ?? "",
    )
    && transitions.configuration_fingerprint_sha256[1]
      !== lineage.input_state.configuration_fingerprint_sha256
    && transitions.non_code_configuration_fingerprint_sha256[1]
      === lineage.input_state.non_code_configuration_fingerprint_sha256;
}

function exactRestoredTransition(transitions, lineage) {
  return REVISION_ID.test(transitions.revisions[2] ?? "")
    && new Set(transitions.revisions).size === 3
    && transitions.code_sha256_base64[2]
      === lineage.input_state.code_sha256_base64
    && transitions.configuration_fingerprint_sha256[2]
      === lineage.input_state.configuration_fingerprint_sha256
    && transitions.non_code_configuration_fingerprint_sha256[2]
      === lineage.input_state.non_code_configuration_fingerprint_sha256;
}

function transitionAtIsNull(transitions, index) {
  return Object.values(transitions).every((entries) => entries[index] === null);
}

function exactDiagnosticOnlyCounts(counts, { failed }) {
  if (counts.update_function_code !== 2
    || counts.wait_for_function_active < 1
    || counts.wait_for_function_active > 2
    || (failed && counts.rollback_recovery_reads < 1)) return false;
  const diagnosticWaits = counts.wait_for_function_active - 1;
  const directReads = counts.get_function_state - 1
    - counts.diagnostic_recovery_reads
    - counts.rollback_recovery_reads;
  for (let diagnosticRead = 0; diagnosticRead <= 1; diagnosticRead += 1) {
    const rollbackRead = directReads - diagnosticRead;
    if (diagnosticRead <= diagnosticWaits
      && rollbackRead >= 0 && rollbackRead <= 1
      && (counts.diagnostic_recovery_reads > 0 || diagnosticRead === 1)
      && (failed
        || counts.rollback_recovery_reads > 0
        || rollbackRead === 1)) return true;
  }
  return false;
}

function exactUnknownCounts(counts) {
  const directDiagnosticReads = counts.get_function_state - 1
    - counts.diagnostic_recovery_reads;
  return counts.update_function_code === 1
    && counts.invoke_function === 0
    && counts.diagnostic_recovery_reads >= 1
    && counts.rollback_recovery_reads === 0
    && counts.wait_for_function_active <= 1
    && directDiagnosticReads >= 0
    && directDiagnosticReads <= counts.wait_for_function_active;
}

export function validateCatalogReadbackReceiptPolicy(
  receipt,
  lineage,
  fail,
) {
  const counts = receipt.operation_counts;
  const rollback = receipt.rollback;
  if (CATALOG_READBACK_COUNT_KEYS.some(
    (key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0,
  )
    || counts.update_function_code > 2
    || counts.invoke_function > 1
    || counts.get_function_state < 1
    || counts.get_function_state > 7
    || counts.diagnostic_recovery_reads > 2
    || counts.rollback_recovery_reads > 2
    || counts.wait_for_function_active > 2
    || counts.diagnostic_recovery_reads + counts.rollback_recovery_reads
      > counts.get_function_state
    || FORBIDDEN_COUNTS.some((key) => counts[key] !== 0)
    || rollback.policy_required !== true
    || typeof rollback.action_required !== "boolean"
    || typeof rollback.attempted !== "boolean"
    || typeof rollback.restored_state_verified !== "boolean"
    || typeof rollback.diagnostic_may_remain !== "boolean"
    || !new Set([
      "VERIFIED_RESTORED",
      "NOT_REQUIRED_NO_CODE_CHANGE",
      "ROLLBACK_UNVERIFIED",
      "FAILED",
    ]).has(rollback.status)
    || receipt.rollback_verified
      !== (rollback.status === "VERIFIED_RESTORED")) {
    fail("execution receipt operation or rollback binding is invalid");
  }

  if (rollback.status === "VERIFIED_RESTORED") {
    if (!rollback.action_required || !rollback.attempted
      || !rollback.restored_state_verified
      || rollback.diagnostic_may_remain
      || !exactDiagnosticTransition(receipt.transitions, lineage)
      || !exactRestoredTransition(receipt.transitions, lineage)
      || !exactDiagnosticOnlyCounts(counts, { failed: false })) {
      fail("verified rollback transition is invalid");
    }
  } else if (rollback.status === "NOT_REQUIRED_NO_CODE_CHANGE") {
    if (receipt.outcome !== "BLOCKED"
      || receipt.safe_error_code !== "TASK3_CODE_UPDATE_REJECTED"
      || rollback.action_required || rollback.attempted
      || !rollback.restored_state_verified
      || rollback.diagnostic_may_remain
      || receipt.catalog !== null
      || counts.update_function_code !== 1
      || counts.invoke_function !== 0
      || counts.diagnostic_recovery_reads < 1
      || counts.get_function_state
        !== 1 + counts.diagnostic_recovery_reads
      || counts.rollback_recovery_reads !== 0
      || counts.wait_for_function_active !== 0
      || !transitionTailIsNull(receipt.transitions)) {
      fail("no-code-change rollback result is invalid");
    }
  } else if (rollback.status === "ROLLBACK_UNVERIFIED") {
    if (receipt.outcome !== "BLOCKED"
      || receipt.safe_error_code !== "CODE_STATE_UNKNOWN"
      || !rollback.action_required || rollback.attempted
      || rollback.restored_state_verified
      || !rollback.diagnostic_may_remain
      || receipt.catalog !== null
      || !exactUnknownCounts(counts)
      || !transitionTailIsNull(receipt.transitions)) {
      fail("unknown-code-state rollback result is invalid");
    }
  } else if (receipt.outcome !== "BLOCKED"
    || receipt.safe_error_code !== "BLOCKED_ROLLBACK_FAILED"
    || !rollback.action_required || !rollback.attempted
    || rollback.restored_state_verified
    || !rollback.diagnostic_may_remain
    || !exactDiagnosticTransition(receipt.transitions, lineage)
    || !transitionAtIsNull(receipt.transitions, 2)
    || !exactDiagnosticOnlyCounts(counts, { failed: true })) {
    fail("failed rollback result is invalid");
  }

  if (receipt.outcome === "PASS"
    && (receipt.safe_error_code !== null
      || rollback.status !== "VERIFIED_RESTORED"
      || counts.invoke_function !== 1
      || receipt.catalog?.tenant_context_authority_ready !== true)) {
    fail("PASS receipt is incomplete");
  }
  if (receipt.outcome === "BLOCKED"
    && rollback.status === "VERIFIED_RESTORED"
    && receipt.catalog !== null
    && (receipt.safe_error_code !== "CATALOG_READBACK_AUTHORITY_NOT_READY"
      || receipt.catalog.tenant_context_authority_ready !== false)) {
    fail("blocked verified receipt catalog result is invalid");
  }
  if (receipt.outcome === "BLOCKED"
    && rollback.status === "VERIFIED_RESTORED"
    && receipt.catalog === null
    && RESERVED_BLOCK_CODES.has(receipt.safe_error_code)) {
    fail("blocked verified receipt error classification is invalid");
  }
  if (receipt.outcome === "BLOCKED" && receipt.safe_error_code === null) {
    fail("BLOCKED receipt is missing its safe error code");
  }
}
