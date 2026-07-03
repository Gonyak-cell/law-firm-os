import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const artifact = JSON.parse(readFileSync("artifacts/manual-qa/upl-b13-withholding-proof.json", "utf8"));
const matrix = readFileSync("artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md", "utf8");

assert.equal(artifact.row_id, "UPL-B-13");
assert.equal(artifact.status, "LOCAL_WITHHOLDING_PASS_VENDOR_BLOCKED");
assert.equal(artifact.strict_boundary.local_3_3_withholding_model_passed, true);
assert.equal(artifact.strict_boundary.external_tax_invoice_vendor_selected, false);
assert.equal(artifact.strict_boundary.external_vendor_sandbox_roundtrip, false);
assert.equal(artifact.withholding.withholding_rate, 0.033);
assert.equal(artifact.withholding.total_withholding_amount, 33_000);
assert.equal(artifact.withholding.net_payable_amount, 967_000);
assert.match(
  matrix,
  /\| UPL-B-13 \| PARTIAL \| Local 3\.3% Korean business-income withholding model and TaxInvoice proof now pass/,
);

console.log("UPL-B-13 withholding validator PASS; vendor sandbox remains blocked");
