#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const feeArrangementService = read("packages/time-expense/src/fee-arrangement-service.js");
const wipService = read("packages/billing/src/wip-service.js");
const invoiceService = read("packages/billing/src/invoice-service.js");
const apiTest = read("apps/api/test/cmp-r4-g7-finance.test.js");
const proofScript = read("scripts/run-upl-b11-fee-arrangement-types-proof.mjs");
await assertNodeProofPass("scripts/run-upl-b11-fee-arrangement-types-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-b11-fee-arrangement-types-proof.json"));

assert.match(feeArrangementService, /FEE_ARRANGEMENT_TYPES = Object\.freeze\(\["hourly", "fixed", "success_fee", "retainer"\]\)/);
assert.match(wipService, /fee_arrangement\.success_fee/);
assert.match(wipService, /fee_arrangement\.retainer_drawdown/);
assert.match(invoiceService, /retainer_drawdown_total/);
assert.match(invoiceService, /success_fee_applied/);
assert.match(apiTest, /drives success-fee and retainer billing branches through invoice/);
assert.match(apiTest, /success_condition_met: true/);
assert.match(apiTest, /success_condition_met: false/);
assert.match(apiTest, /retainer_amount: 80000/);
assert.match(proofScript, /checks: branchResults\.map/);
assert.equal(proof.contract_ref, "UPL-B-11");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);

const branches = Object.fromEntries(proof.branches.map((branch) => [branch.id, branch]));
for (const branchId of ["hourly", "fixed", "success_met", "success_unmet", "retainer"]) {
  assert.ok(branches[branchId], `missing proof branch ${branchId}`);
  assert.equal(proof.checks.some((check) => check.id === `fee-arrangement-${branchId}` && check.passed === true), true);
}
assert.equal(branches.hourly.observed.invoice.amount_due, 120000);
assert.equal(branches.fixed.observed.invoice.amount_due, 275000);
assert.equal(branches.success_met.observed.invoice.amount_due, 250000);
assert.equal(branches.success_met.observed.invoice.success_fee_applied, true);
assert.equal(branches.success_unmet.observed.invoice.amount_due, 50000);
assert.equal(branches.success_unmet.observed.invoice.success_fee_applied, false);
assert.equal(branches.retainer.observed.invoice.amount_due, 40000);
assert.equal(branches.retainer.observed.invoice.retainer_drawdown_total, 80000);

console.log("UPL-B-11 fee arrangement type validation passed.");
console.log("proof: artifacts/manual-qa/upl-b11-fee-arrangement-types-proof.json");
