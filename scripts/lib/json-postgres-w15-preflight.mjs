import { createHash } from "node:crypto";
import {
  JSON_POSTGRES_W12_RECEIPTS,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_W15_BASELINE_INPUT_VERSION =
  "law-firm-os.json-postgres-w15-baseline-input.v1";
export const JSON_POSTGRES_W15_BASELINE_VERSION =
  "law-firm-os.json-postgres-w15-baseline-manifest.v1";
export const JSON_POSTGRES_W15_PREDECESSOR_VERIFICATION_VERSION =
  "law-firm-os.json-postgres-w15-predecessor-verification.v1";
export const JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS = Object.freeze([
  "w12-terminal",
  "cut-012",
  "go-live",
]);

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:/+-]{1,240}$/u;

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : canonicalizeJson(value))
    .digest("hex");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} fields are invalid`);
  }
}

export function validateJsonPostgresW15ProductionTarget(target) {
  exactKeys(target, [
    "target_ref",
    "aws_account",
    "aws_region",
    "database_identifier",
    "database_host",
    "database_name",
    "projection_writer_secret_ref",
    "projection_auditor_secret_ref",
    "tenant_context_secret_ref",
    "approved_tenant_ids",
    "monthly_cost_ceiling_krw",
    "tls_mode",
    "public_access",
    "generic_ledger_authority",
    "json_fallback",
    "dual_write",
    "authority_promotion",
  ], "W15 production target");
  for (const key of [
    "target_ref",
    "aws_region",
    "database_identifier",
    "database_host",
    "database_name",
    "projection_writer_secret_ref",
    "projection_auditor_secret_ref",
    "tenant_context_secret_ref",
  ]) {
    if (!TOKEN.test(target[key] ?? "")) fail(`W15 target ${key} is invalid`);
  }
  if (target.target_ref !== "lawos-production"
    || target.aws_account !== "770880870480"
    || target.aws_region !== "ap-northeast-2"
    || target.database_identifier !== "lawos-production-postgres"
    || !/^[a-z0-9][a-z0-9.-]{1,251}[a-z0-9]$/u.test(target.database_host)
    || target.database_name !== "lawos"
    || target.monthly_cost_ceiling_krw !== 300_000
    || target.tls_mode !== "verify-full"
    || target.public_access !== false
    || target.generic_ledger_authority !== "postgres-v2"
    || target.json_fallback !== false
    || target.dual_write !== false
    || target.authority_promotion !== false
    || !Array.isArray(target.approved_tenant_ids)
    || target.approved_tenant_ids.length < 1
    || new Set(target.approved_tenant_ids).size
      !== target.approved_tenant_ids.length
    || target.approved_tenant_ids.some((tenantId) =>
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(tenantId)
      || tenantId === "*"
      || /^tenant_lawos_staging_/u.test(tenantId))) {
    fail("W15 production target is outside the closed authority boundary");
  }
  return Object.freeze({
    ...target,
    approved_tenant_ids: Object.freeze([...target.approved_tenant_ids].sort()),
  });
}

export function createJsonPostgresW15BaselineManifest({
  input,
  exactMainSha,
  exactMainTree,
  predecessorVerification,
} = {}) {
  exactKeys(input, [
    "schema_version",
    "expected_origin_main_sha",
    "expected_origin_main_tree",
    "target",
  ], "W15 baseline input");
  if (input.schema_version !== JSON_POSTGRES_W15_BASELINE_INPUT_VERSION
    || !SHA1.test(exactMainSha ?? "")
    || !SHA1.test(exactMainTree ?? "")
    || input.expected_origin_main_sha !== exactMainSha
    || input.expected_origin_main_tree !== exactMainTree
    || predecessorVerification?.outcome !== "PASS"
    || predecessorVerification?.required_receipt_count
      !== JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length) {
    fail("W15 exact-main baseline or predecessor binding drifted");
  }
  const target = validateJsonPostgresW15ProductionTarget(input.target);
  const material = {
    schema_version: JSON_POSTGRES_W15_BASELINE_VERSION,
    outcome: "PASS",
    exact_main_sha: exactMainSha,
    exact_main_tree: exactMainTree,
    target,
    predecessor_verification_sha256:
      predecessorVerification.result_sha256,
    w12_terminal_receipt_sha256:
      predecessorVerification.terminal_receipts["w12-terminal"],
    cut012_terminal_receipt_sha256:
      predecessorVerification.terminal_receipts["cut-012"],
    go_live_receipt_sha256:
      predecessorVerification.terminal_receipts["go-live"],
    approved_tenant_set_sha256: sha256(target.approved_tenant_ids),
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    production_write: false,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresW15BaselineManifest(value = {}) {
  exactKeys(value, [
    "schema_version",
    "outcome",
    "exact_main_sha",
    "exact_main_tree",
    "target",
    "predecessor_verification_sha256",
    "w12_terminal_receipt_sha256",
    "cut012_terminal_receipt_sha256",
    "go_live_receipt_sha256",
    "approved_tenant_set_sha256",
    "raw_value_returned",
    "pii_returned",
    "secret_material_returned",
    "production_write",
    "result_sha256",
  ], "W15 baseline manifest");
  const material = {
    schema_version: value.schema_version,
    outcome: value.outcome,
    exact_main_sha: value.exact_main_sha,
    exact_main_tree: value.exact_main_tree,
    target: validateJsonPostgresW15ProductionTarget(value.target),
    predecessor_verification_sha256: value.predecessor_verification_sha256,
    w12_terminal_receipt_sha256: value.w12_terminal_receipt_sha256,
    cut012_terminal_receipt_sha256: value.cut012_terminal_receipt_sha256,
    go_live_receipt_sha256: value.go_live_receipt_sha256,
    approved_tenant_set_sha256: value.approved_tenant_set_sha256,
    raw_value_returned: value.raw_value_returned,
    pii_returned: value.pii_returned,
    secret_material_returned: value.secret_material_returned,
    production_write: value.production_write,
  };
  if (value.schema_version !== JSON_POSTGRES_W15_BASELINE_VERSION
    || value.outcome !== "PASS"
    || !SHA1.test(value.exact_main_sha ?? "")
    || !SHA1.test(value.exact_main_tree ?? "")
    || [
      value.predecessor_verification_sha256,
      value.w12_terminal_receipt_sha256,
      value.cut012_terminal_receipt_sha256,
      value.go_live_receipt_sha256,
      value.approved_tenant_set_sha256,
      value.result_sha256,
    ].some((digest) => !SHA256.test(digest ?? ""))
    || value.approved_tenant_set_sha256
      !== sha256(material.target.approved_tenant_ids)
    || value.raw_value_returned !== false
    || value.pii_returned !== false
    || value.secret_material_returned !== false
    || value.production_write !== false
    || value.result_sha256 !== sha256(material)) {
    fail("W15 baseline manifest is invalid or digest-drifted");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    target: material.target,
  });
}

export function createJsonPostgresW15PredecessorVerification({
  verifiedReceipts,
  receiptLocators,
} = {}) {
  if (!Array.isArray(verifiedReceipts)
    || !Array.isArray(receiptLocators)
    || verifiedReceipts.length
      !== JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length
    || receiptLocators.length !== verifiedReceipts.length) {
    fail("W15 predecessor receipt set is incomplete");
  }
  const byKind = new Map(verifiedReceipts.map((item) => [
    item.verified.receipt_kind,
    item.verified,
  ]));
  const locatorsByKind = new Map(receiptLocators.map((locator) => [
    locator.receipt_kind,
    locator,
  ]));
  const w12Terminal = byKind.get("w12-terminal");
  const cut012 = byKind.get("cut-012");
  const goLive = byKind.get("go-live");
  const hasClosedLineage = (receipt, expectedCount) =>
    Array.isArray(receipt?.predecessor_receipt_sha256)
    && receipt.predecessor_receipt_sha256.length === expectedCount
    && new Set(receipt.predecessor_receipt_sha256).size === expectedCount
    && receipt.predecessor_receipt_sha256.every((digest) =>
      SHA256.test(digest));
  if (byKind.size !== JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length
    || locatorsByKind.size
      !== JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length
    || JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.some((kind) =>
      byKind.get(kind)?.execution_state !== "PASS"
      || byKind.get(kind)?.signature_valid !== true
      || locatorsByKind.get(kind)?.canonical_sha256
        !== byKind.get(kind)?.canonical_sha256)
    || !hasClosedLineage(
      w12Terminal,
      JSON_POSTGRES_W12_RECEIPTS.length - 1,
    )
    || !hasClosedLineage(cut012, 4)
    || !hasClosedLineage(goLive, 2)
    || !goLive.predecessor_receipt_sha256.includes(
      cut012.canonical_sha256,
    )
    || cut012.source_sha !== goLive.source_sha
    || cut012.source_tree !== goLive.source_tree
    || cut012.claims?.json_authority_disabled !== true
    || goLive.claims?.json_authority_disabled !== true
    || goLive.claims?.release !== true
    || goLive.claims?.go_live !== true) {
    fail("W15 predecessor receipt claims are incomplete");
  }
  const terminalReceipts = {
    "w12-terminal": w12Terminal.canonical_sha256,
    "cut-012": cut012.canonical_sha256,
    "go-live": goLive.canonical_sha256,
  };
  if (Object.values(terminalReceipts).some((value) => !SHA256.test(value))) {
    fail("W15 terminal predecessor digest is invalid");
  }
  const material = {
    schema_version: JSON_POSTGRES_W15_PREDECESSOR_VERIFICATION_VERSION,
    outcome: "PASS",
    required_receipt_count:
      JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length,
    verified_receipt_count: verifiedReceipts.length,
    terminal_receipts: terminalReceipts,
    receipt_set_sha256: sha256(
      JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.map((kind) => [
        kind,
        byKind.get(kind).canonical_sha256,
      ]),
    ),
    locators_sha256: sha256(receiptLocators),
    signature_verification_failure_count: 0,
    predecessor_chain_failure_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    production_write: false,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresW15PredecessorVerification(value = {}) {
  exactKeys(value, [
    "schema_version",
    "outcome",
    "required_receipt_count",
    "verified_receipt_count",
    "terminal_receipts",
    "receipt_set_sha256",
    "locators_sha256",
    "signature_verification_failure_count",
    "predecessor_chain_failure_count",
    "raw_value_returned",
    "pii_returned",
    "secret_material_returned",
    "production_write",
    "result_sha256",
  ], "W15 predecessor verification");
  exactKeys(value.terminal_receipts, [
    "w12-terminal",
    "cut-012",
    "go-live",
  ], "W15 terminal predecessor receipts");
  const material = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "result_sha256"),
  );
  if (value.schema_version !== JSON_POSTGRES_W15_PREDECESSOR_VERIFICATION_VERSION
    || value.outcome !== "PASS"
    || value.required_receipt_count
      !== JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length
    || value.verified_receipt_count !== value.required_receipt_count
    || Object.values(value.terminal_receipts)
      .some((digest) => !SHA256.test(digest ?? ""))
    || !SHA256.test(value.receipt_set_sha256 ?? "")
    || !SHA256.test(value.locators_sha256 ?? "")
    || value.signature_verification_failure_count !== 0
    || value.predecessor_chain_failure_count !== 0
    || value.raw_value_returned !== false
    || value.pii_returned !== false
    || value.secret_material_returned !== false
    || value.production_write !== false
    || value.result_sha256 !== sha256(material)) {
    fail("W15 predecessor verification is invalid or digest-drifted");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    terminal_receipts: Object.freeze({ ...value.terminal_receipts }),
  });
}

export function createJsonPostgresW15ReceiptLocator({
  kind,
  receiptBytes,
  signatureBytes,
  canonicalSha256,
} = {}) {
  if (!JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.includes(kind)
    || !Buffer.isBuffer(receiptBytes)
    || !Buffer.isBuffer(signatureBytes)
    || !SHA256.test(canonicalSha256 ?? "")) {
    fail("W15 predecessor receipt locator is invalid");
  }
  return Object.freeze({
    receipt_kind: kind,
    canonical_sha256: canonicalSha256,
    receipt_file_sha256: sha256(receiptBytes),
    signature_sha256: sha256(signatureBytes),
  });
}
