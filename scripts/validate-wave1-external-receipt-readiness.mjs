#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const artifactPath = "artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json";
const matrixPath = "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md";
const c09ExternalReceiptReadinessPath = "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json";

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function loadEnv(path) {
  if (!existsSync(resolve(ROOT, path))) return {};
  return Object.fromEntries(
    read(path)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? null : [line.slice(0, index), line.slice(index + 1)];
      })
      .filter(Boolean),
  );
}

assert.equal(existsSync(resolve(ROOT, artifactPath)), true, `missing ${artifactPath}`);
assert.equal(existsSync(resolve(ROOT, matrixPath)), true, `missing ${matrixPath}`);
assert.equal(existsSync(resolve(ROOT, c09ExternalReceiptReadinessPath)), true, `missing ${c09ExternalReceiptReadinessPath}`);

const artifactText = read(artifactPath);
const artifact = JSON.parse(artifactText);
const matrix = read(matrixPath);
const c09ExternalReceiptReadiness = JSON.parse(read(c09ExternalReceiptReadinessPath));

assert.equal(artifact.schema_version, "lawos.wave1.external-receipt-readiness.v1");
assert.equal(artifact.status, "PASS_EXTERNAL_RECEIPT_READINESS_LEDGER");
assert.equal(artifact.strict_completion_claim, false);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.matrix_snapshot.total, 70);
assert.equal(artifact.matrix_snapshot.counts.PASS, 64);
assert.equal(artifact.matrix_snapshot.counts.PARTIAL, 5);
assert.equal(artifact.matrix_snapshot.counts.BLOCKED, 1);
assert.equal(artifact.matrix_snapshot.counts.FAIL ?? 0, 0);

const rowById = Object.fromEntries(artifact.external_blocker_rows.map((row) => [row.row_id, row]));
for (const rowId of ["UPL-C-09", "UPL-B-13"]) {
  assert.ok(rowById[rowId], `missing external blocker row ${rowId}`);
  assert.equal(rowById[rowId].external_receipt_present, false);
  assert.equal(rowById[rowId].strict_pass_claim, false);
  assert.ok(Array.isArray(rowById[rowId].external_receipts_required));
  assert.ok(rowById[rowId].external_receipts_required.length >= 4);
}
assert.equal(rowById["UPL-A-12"], undefined, "UPL-A-12 must not remain an external blocker after local model receipt closure");

assert.deepEqual(artifact.inherited_partial_rows, ["UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]);
assert.ok(artifact.closed_local_model_rows.some((row) => row.row_id === "UPL-A-12" && row.artifact === "artifacts/manual-qa/upl-a12-local-model-gateway-proof.json"));
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.passed, true);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.provider_runtime_executed, false);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.msal_bridge_initialized, true);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.msal_bridge_provider_runtime_executed, false);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.msal_bridge_token_material_returned, false);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.automatic_send_handler_absent, true);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.automatic_send_event_probe_absent, true);
assert.equal(rowById["UPL-C-09"].local_proof.local_addin_browser_receipt.explicit_send_review_warning_proved, true);
assert.equal(c09ExternalReceiptReadiness.schema_version, "lawos.wave1.upl-c09.outlook-external-receipt-readiness.v1");
assert.equal(c09ExternalReceiptReadiness.status, "READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT");
assert.equal(c09ExternalReceiptReadiness.external_receipt_present, false);
assert.equal(c09ExternalReceiptReadiness.strict_pass_claim, false);
assert.equal(c09ExternalReceiptReadiness.external_runtime.provider_runtime_executed, false);
assert.equal(c09ExternalReceiptReadiness.safety.token_or_secret_material_written, false);
assert.equal(c09ExternalReceiptReadiness.safety.body_or_attachment_material_written, false);
assert.equal(rowById["UPL-C-09"].local_proof.external_receipt_intake.status, "READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT");
assert.equal(rowById["UPL-C-09"].local_proof.external_receipt_intake.external_receipt_present, false);
assert.equal(rowById["UPL-C-09"].local_proof.external_receipt_intake.strict_pass_claim, false);
assert.equal(rowById["UPL-C-09"].local_proof.external_receipt_intake.production_write_claim, false);
assert.equal(rowById["UPL-C-09"].local_proof.external_receipt_intake.token_or_secret_material_written, false);
assert.equal(rowById["UPL-C-09"].local_proof.external_receipt_intake.body_or_attachment_material_written, false);
assert.equal(rowById["UPL-B-13"].local_proof.local_withholding_receipt.local_3_3_withholding_model_passed, true);
assert.equal(rowById["UPL-B-13"].local_proof.local_withholding_receipt.external_vendor_sandbox_roundtrip, false);
assert.equal(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.exists, true);
assert.equal(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.sandbox_mode, true);
assert.equal(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.credential_fingerprint_present, true);
assert.equal(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.production_tax_invoice_issued, false);
assert.equal(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.prepared_request_hash_present, true);
assert.equal(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.withholding_payload_mapping_present, true);
assert.match(rowById["UPL-B-13"].local_proof.popbill_sandbox_receipt.status, /^(READY_NEEDS_SANDBOX_ISSUE_APPROVAL|PASS_POPBILL_SANDBOX_ROUNDTRIP|BLOCKED_POPBILL_SANDBOX_ISSUE_FAILED)$/);

for (const id of [
  "matrix-has-70-rows",
  "matrix-open-rows-match-current-strict-boundary",
  "a12-local-model-gateway-proof-present",
  "c09-local-addin-proof-present-but-provider-runtime-missing",
  "b13-local-withholding-proof-present-but-sandbox-missing",
  "no-strict-pass-claim-for-external-blockers",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

for (const [rowId, status] of [
  ["UPL-A-12", "PASS"],
  ["UPL-B-13", "PARTIAL"],
  ["UPL-C-09", "BLOCKED"],
  ["UPL-C-10", "PARTIAL"],
  ["UPL-C-11", "PARTIAL"],
  ["UPL-C-12", "PARTIAL"],
  ["UPL-D-16", "PASS"],
  ["UPL-E-04", "PARTIAL"],
]) {
  assert.match(matrix, new RegExp(`\\| ${rowId} \\| ${status} \\|`));
}

for (const key of [
  "ANTHROPIC_API_KEY",
  "LAWOS_MODEL_GATEWAY_API_KEY",
  "TAX_INVOICE_SANDBOX_API_KEY",
  "POPBILL_LINK_ID",
  "POPBILL_SECRET_KEY",
]) {
  const value = process.env[key] ?? loadEnv(".env.popbill.local")[key];
  if (value && value.length >= 8) assert.equal(artifactText.includes(value), false, `${key} leaked into artifact`);
}

console.log("Wave-1 external receipt readiness validator PASS");
