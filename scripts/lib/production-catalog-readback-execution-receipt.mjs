import {
  catalogReadbackCanonicalSha256,
  catalogReadbackCanonicalSnapshot,
} from "../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import {
  createCatalogReadbackLineage,
  validateCatalogReadbackLineage,
} from "../../packages/persistence/src/postgres/catalog-readback-lineage.js";
import {
  validateCatalogReadbackCatalogReceipt,
} from "../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  task3ValidCodeSha256 as validCodeSha,
} from "./production-catalog-readback-common.mjs";
import {
  CATALOG_READBACK_COUNT_KEYS as COUNT_KEYS,
  CATALOG_READBACK_ROLLBACK_KEYS as ROLLBACK_KEYS,
  validateCatalogReadbackReceiptPolicy,
} from "./production-catalog-readback-execution-receipt-policy.mjs";

export const PRODUCTION_CATALOG_READBACK_EXECUTION_RECEIPT_SCHEMA_VERSION = "law-firm-os.production-migration-catalog-readback-execution-receipt.v2";

const SHA256 = /^[a-f0-9]{64}$/u;
const RECEIPT_KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "safe_error_code",
  "lineage",
  "preflight_receipt_sha256",
  "catalog",
  "catalog_receipt",
  "operation_counts",
  "transitions",
  "rollback",
  "rollback_verified",
  "receipt_sha256",
]);
const TRANSITION_KEYS = Object.freeze([
  "revisions",
  "code_sha256_base64",
  "configuration_fingerprint_sha256",
  "non_code_configuration_fingerprint_sha256",
]);

function fail(message) {
  throw Object.assign(new Error(message), {
    code: "TASK3_EXECUTION_RECEIPT_INVALID",
  });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} fields are invalid`);
  }
}

function transitions(pre, diagnostic, restored) {
  const value = {};
  for (const [key, field] of [
    ["revisions", "revision_id"],
    ["code_sha256_base64", "code_sha256_base64"],
    ["configuration_fingerprint_sha256", "configuration_fingerprint_sha256"],
    ["non_code_configuration_fingerprint_sha256", "non_code_configuration_fingerprint_sha256"],
  ]) {
    value[key] = [pre?.[field] ?? null, diagnostic?.[field] ?? null, restored?.[field] ?? null];
  }
  return value;
}

function selfDigest(value) {
  return catalogReadbackCanonicalSha256({ ...value, receipt_sha256: "" });
}

export function createProductionCatalogReadbackExecutionReceipt({
  outcome,
  safeErrorCode,
  lineage,
  preflightReceiptSha256,
  catalogReceipt,
  counts,
  pre,
  diagnostic,
  restored,
  rollback,
} = {}) {
  const receipt = {
    schema_version:
      PRODUCTION_CATALOG_READBACK_EXECUTION_RECEIPT_SCHEMA_VERSION,
    outcome,
    safe_error_code: safeErrorCode,
    lineage: validateCatalogReadbackLineage(lineage),
    preflight_receipt_sha256: preflightReceiptSha256,
    catalog: catalogReceipt?.catalog ?? null,
    catalog_receipt: catalogReceipt ?? null,
    operation_counts: counts,
    transitions: transitions(pre, diagnostic, restored),
    rollback,
    rollback_verified: rollback?.status === "VERIFIED_RESTORED",
    receipt_sha256: "",
  };
  receipt.receipt_sha256 = selfDigest(receipt);
  return validateProductionCatalogReadbackExecutionReceipt(receipt);
}

export function validateProductionCatalogReadbackExecutionReceipt(
  value,
  expected = {},
) {
  const receipt = catalogReadbackCanonicalSnapshot(value);
  exactKeys(receipt, RECEIPT_KEYS, "execution receipt");
  exactKeys(receipt.operation_counts, COUNT_KEYS, "operation counts");
  exactKeys(receipt.transitions, TRANSITION_KEYS, "state transitions");
  exactKeys(receipt.rollback, ROLLBACK_KEYS, "rollback result");
  const lineage = validateCatalogReadbackLineage(receipt.lineage);
  if (expected.packet && expected.approval) {
    const recomputed = createCatalogReadbackLineage({
      packet: expected.packet,
      packetSha256: expected.packetSha256,
      approval: expected.approval,
    });
    if (canonicalizeJson(recomputed) !== canonicalizeJson(lineage)) {
      fail("execution receipt lineage does not match the packet and approval");
    }
  }
  if (receipt.schema_version
      !== PRODUCTION_CATALOG_READBACK_EXECUTION_RECEIPT_SCHEMA_VERSION
    || !new Set(["PASS", "BLOCKED"]).has(receipt.outcome)
    || (receipt.safe_error_code !== null
      && (typeof receipt.safe_error_code !== "string"
        || !receipt.safe_error_code))
    || !SHA256.test(receipt.preflight_receipt_sha256 ?? "")
    || !SHA256.test(receipt.receipt_sha256 ?? "")
    || receipt.receipt_sha256 !== selfDigest(receipt)
    || TRANSITION_KEYS.some((key) => !Array.isArray(
      receipt.transitions[key],
    ) || receipt.transitions[key].length !== 3)
    || receipt.transitions.code_sha256_base64.some(
      (value) => !validCodeSha(value),
    )
    || receipt.transitions.configuration_fingerprint_sha256.some(
      (value) => value !== null && !SHA256.test(value),
    )
    || receipt.transitions.non_code_configuration_fingerprint_sha256.some(
      (value) => value !== null && !SHA256.test(value),
    )
    || receipt.transitions.revisions[0] !== lineage.input_state.revision_id
    || receipt.transitions.code_sha256_base64[0]
      !== lineage.input_state.code_sha256_base64
    || receipt.transitions.configuration_fingerprint_sha256[0]
      !== lineage.input_state.configuration_fingerprint_sha256
    || receipt.transitions.non_code_configuration_fingerprint_sha256[0]
      !== lineage.input_state.non_code_configuration_fingerprint_sha256
    || (receipt.transitions.code_sha256_base64[1] !== null
      && receipt.transitions.code_sha256_base64[1]
        !== lineage.artifacts.diagnostic.code_sha256_base64)
    || receipt.transitions.non_code_configuration_fingerprint_sha256
      .some((value) => value !== null
        && value
          !== lineage.input_state.non_code_configuration_fingerprint_sha256)
  ) {
    fail("execution receipt binding is invalid");
  }

  if (receipt.catalog_receipt === null) {
    if (receipt.catalog !== null) fail("catalog receipt is missing");
  } else {
    const catalogReceipt = validateCatalogReadbackCatalogReceipt(
      receipt.catalog_receipt,
      {
        packetSha256: lineage.packet_sha256,
        sourceSha: lineage.source_sha,
        sourceTree: lineage.source_tree,
        preflightReceiptSha256: receipt.preflight_receipt_sha256,
        packet: expected.packet,
        approval: expected.approval,
      },
    );
    if (canonicalizeJson(catalogReceipt.lineage)
        !== canonicalizeJson(lineage)
      || canonicalizeJson(catalogReceipt.catalog)
        !== canonicalizeJson(receipt.catalog)) {
      fail("catalog receipt lineage drifted");
    }
    if (receipt.operation_counts.invoke_function !== 1
      || receipt.transitions.revisions[1] === null) {
      fail("catalog receipt has no diagnostic invocation transition");
    }
  }

  validateCatalogReadbackReceiptPolicy(receipt, lineage, fail);
  return receipt;
}
