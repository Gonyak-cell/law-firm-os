import {
  canonicalizeJson,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  catalogReadbackBytesSha256,
  catalogReadbackCanonicalSnapshot,
} from "./catalog-readback-canonical.js";
import {
  POSTGRES_MIGRATION_CATALOG_READBACK_OUTPUT_CONTRACT_SHA256,
} from "./migration-catalog-readback.js";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const AUTHORIZATION_KEYS = Object.freeze([
  "trust_registry_json",
  "approval_receipt_json",
  "approval_signature_base64",
]);
const APPROVAL_KEYS = Object.freeze([
  "valid",
  "decision",
  "approval_id",
  "signed_at",
  "expires_at",
  "registry_sha256",
  "receipt_sha256",
  "signature_sha256",
  "packet_sha256",
]);
const APPROVAL_BINDING_KEYS = Object.freeze([
  "approval_id",
  "signed_at",
  "expires_at",
  "registry_sha256",
  "receipt_sha256",
  "signature_sha256",
]);
const LINEAGE_KEYS = Object.freeze([
  "source_sha",
  "source_tree",
  "packet_sha256",
  "output_contract_sha256",
  "approval",
  "target",
  "artifacts",
  "input_state",
  "task2_inventory",
]);
const TARGET_KEYS = Object.freeze([
  "aws_account",
  "aws_region",
  "function_name",
  "execution_role",
]);
const ARTIFACTS_KEYS = Object.freeze(["diagnostic", "rollback"]);
const ARTIFACT_KEYS = Object.freeze([
  "sha256",
  "bytes",
  "manifest_sha256",
  "code_sha256_base64",
]);
const INPUT_STATE_KEYS = Object.freeze([
  "revision_id",
  "code_sha256_base64",
  "configuration_fingerprint_sha256",
  "non_code_configuration_fingerprint_sha256",
]);
const TASK2_INVENTORY_KEYS = Object.freeze([
  "schema_version",
  "inventory_sha256",
  "observed_at",
  "projection_auditor_row_sha256",
]);

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_SCHEMA", `${label} fields are invalid`);
  }
}

function parseCanonicalJson(value, label) {
  if (typeof value !== "string") {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_APPROVAL", `${label} is invalid`);
  }
  try {
    const parsed = JSON.parse(value);
    if (canonicalizeJson(parsed) !== value) throw new Error("not canonical");
    return parsed;
  } catch {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_APPROVAL", `${label} is invalid`);
  }
}

function signatureBytes(value) {
  const bytes = Buffer.from(value ?? "", "base64");
  if (typeof value !== "string" || bytes.byteLength !== 64
    || bytes.toString("base64") !== value) {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_APPROVAL", "approval signature is invalid");
  }
  return bytes;
}

export function catalogReadbackApprovalBinding({
  approval,
  authorization,
  packetSha256,
} = {}) {
  const verified = catalogReadbackCanonicalSnapshot(approval);
  const raw = catalogReadbackCanonicalSnapshot(authorization);
  exactKeys(verified, APPROVAL_KEYS, "verified approval");
  exactKeys(raw, AUTHORIZATION_KEYS, "approval authorization");
  if (verified.valid !== true || verified.decision !== "approved"
    || typeof verified.approval_id !== "string" || !verified.approval_id
    || !TIMESTAMP.test(verified.signed_at ?? "")
    || !TIMESTAMP.test(verified.expires_at ?? "")
    || Date.parse(verified.signed_at) >= Date.parse(verified.expires_at)
    || !SHA256.test(verified.registry_sha256 ?? "")
    || !SHA256.test(verified.receipt_sha256 ?? "")
    || !SHA256.test(verified.signature_sha256 ?? "")
    || verified.packet_sha256 !== packetSha256) {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_APPROVAL", "verified approval binding is invalid");
  }
  parseCanonicalJson(raw.trust_registry_json, "trust registry JSON");
  parseCanonicalJson(raw.approval_receipt_json, "approval receipt JSON");
  if (catalogReadbackBytesSha256(Buffer.from(raw.trust_registry_json))
      !== verified.registry_sha256
    || catalogReadbackBytesSha256(Buffer.from(raw.approval_receipt_json))
      !== verified.receipt_sha256
    || catalogReadbackBytesSha256(
      signatureBytes(raw.approval_signature_base64),
    ) !== verified.signature_sha256) {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_APPROVAL", "approval bytes drifted");
  }
  return catalogReadbackCanonicalSnapshot({
    approval_id: verified.approval_id,
    signed_at: verified.signed_at,
    expires_at: verified.expires_at,
    registry_sha256: verified.registry_sha256,
    receipt_sha256: verified.receipt_sha256,
    signature_sha256: verified.signature_sha256,
  });
}

export function createCatalogReadbackLineage({
  packet,
  packetSha256,
  approval,
} = {}) {
  return validateCatalogReadbackLineage({
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    packet_sha256: packetSha256,
    output_contract_sha256: packet?.output_contract_sha256,
    approval,
    target: packet?.target,
    artifacts: {
      diagnostic: packet?.diagnostic_artifact,
      rollback: packet?.rollback_artifact,
    },
    input_state: packet?.pre_state,
    task2_inventory: packet?.task2_inventory,
  });
}

export function validateCatalogReadbackLineage(value) {
  const lineage = catalogReadbackCanonicalSnapshot(value);
  exactKeys(lineage, LINEAGE_KEYS, "catalog readback lineage");
  exactKeys(lineage.approval, APPROVAL_BINDING_KEYS, "approval binding");
  exactKeys(lineage.target, TARGET_KEYS, "target binding");
  exactKeys(lineage.artifacts, ARTIFACTS_KEYS, "artifact bindings");
  exactKeys(lineage.artifacts.diagnostic, ARTIFACT_KEYS, "diagnostic artifact binding");
  exactKeys(lineage.artifacts.rollback, ARTIFACT_KEYS, "rollback artifact binding");
  exactKeys(lineage.input_state, INPUT_STATE_KEYS, "input state binding");
  exactKeys(
    lineage.task2_inventory,
    TASK2_INVENTORY_KEYS,
    "Task 2 inventory binding",
  );
  const diagnosticCode = Buffer.from(
    lineage.artifacts.diagnostic.code_sha256_base64 ?? "",
    "base64",
  );
  const rollbackCode = Buffer.from(
    lineage.artifacts.rollback.code_sha256_base64 ?? "",
    "base64",
  );
  if (!SHA1.test(lineage.source_sha ?? "")
    || !SHA1.test(lineage.source_tree ?? "")
    || !SHA256.test(lineage.packet_sha256 ?? "")
    || lineage.output_contract_sha256
      !== POSTGRES_MIGRATION_CATALOG_READBACK_OUTPUT_CONTRACT_SHA256
    || !TIMESTAMP.test(lineage.approval.signed_at ?? "")
    || !Number.isFinite(Date.parse(lineage.approval.signed_at))
    || !TIMESTAMP.test(lineage.approval.expires_at ?? "")
    || !Number.isFinite(Date.parse(lineage.approval.expires_at))
    || Date.parse(lineage.approval.signed_at)
      >= Date.parse(lineage.approval.expires_at)
    || typeof lineage.approval.approval_id !== "string"
    || !lineage.approval.approval_id
    || lineage.target.aws_account !== "770880870480"
    || lineage.target.aws_region !== "ap-northeast-2"
    || lineage.target.function_name
      !== "lawos-production-projection-auditor"
    || lineage.target.execution_role !== "projection-auditor"
    || [
      lineage.approval.registry_sha256,
      lineage.approval.receipt_sha256,
      lineage.approval.signature_sha256,
      lineage.artifacts.diagnostic.sha256,
      lineage.artifacts.diagnostic.manifest_sha256,
      lineage.artifacts.rollback.sha256,
      lineage.artifacts.rollback.manifest_sha256,
      lineage.input_state.configuration_fingerprint_sha256,
      lineage.input_state.non_code_configuration_fingerprint_sha256,
      lineage.task2_inventory.inventory_sha256,
      lineage.task2_inventory.projection_auditor_row_sha256,
    ].some((digest) => !SHA256.test(digest ?? ""))
    || lineage.task2_inventory.schema_version
      !== "amic-os.outlook.production-aws-inventory.v2"
    || !TIMESTAMP.test(lineage.task2_inventory.observed_at ?? "")
    || !Number.isFinite(Date.parse(lineage.task2_inventory.observed_at))
    || !Number.isSafeInteger(lineage.artifacts.diagnostic.bytes)
    || lineage.artifacts.diagnostic.bytes < 1
    || !Number.isSafeInteger(lineage.artifacts.rollback.bytes)
    || lineage.artifacts.rollback.bytes < 1
    || diagnosticCode.byteLength !== 32
    || diagnosticCode.toString("base64")
      !== lineage.artifacts.diagnostic.code_sha256_base64
    || diagnosticCode.toString("hex")
      !== lineage.artifacts.diagnostic.sha256
    || rollbackCode.byteLength !== 32
    || rollbackCode.toString("base64")
      !== lineage.artifacts.rollback.code_sha256_base64
    || rollbackCode.toString("hex") !== lineage.artifacts.rollback.sha256
    || typeof lineage.input_state.revision_id !== "string"
    || !lineage.input_state.revision_id
    || lineage.artifacts.rollback.code_sha256_base64
      !== lineage.input_state.code_sha256_base64) {
    fail("LAWOS_CATALOG_READBACK_LINEAGE_BINDING", "catalog readback lineage is invalid");
  }
  return lineage;
}
