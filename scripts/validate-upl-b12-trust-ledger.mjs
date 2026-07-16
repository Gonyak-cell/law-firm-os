#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const trustLedgerService = read("packages/payments/src/trust-ledger-service.js");
const financeRuntime = read("apps/api/src/finance-runtime-context.js");
const apiTest = read("apps/api/test/cmp-r4-g7-finance.test.js");
const proofScript = read("scripts/run-upl-b12-trust-ledger-proof.mjs");
await assertNodeProofPass("scripts/run-upl-b12-trust-ledger-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-b12-trust-ledger-proof.json"));

assert.match(trustLedgerService, /segregated_client_funds: true/);
assert.match(trustLedgerService, /negative trust balance blocked/);
assert.match(trustLedgerService, /trust_drawdown_amount/);
assert.match(trustLedgerService, /refund_liability_amount/);
assert.match(financeRuntime, /handleFinanceTrustDepositCreate/);
assert.match(financeRuntime, /handleFinanceTrustDrawdownCreate/);
assert.match(financeRuntime, /handleFinanceTrustRefundCreate/);
assert.match(financeRuntime, /handleFinanceTrustBalances/);
assert.match(apiTest, /G7 trust ledger API drives deposit drawdown refund balance report/);
assert.match(apiTest, /api-trust-ledger-g7-b12-negative/);
assert.match(proofScript, /negative-balance-blocked/);
assert.equal(proof.contract_ref, "UPL-B-12");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);

assert.equal(proof.observed.deposit.trust_balance.available_balance, 400000);
assert.equal(proof.observed.deposit.trust_balance.refund_liability_amount, 400000);
assert.equal(proof.observed.drawdown.invoice.status, "paid");
assert.equal(proof.observed.drawdown.invoice.amount_paid, 250000);
assert.equal(proof.observed.drawdown.invoice.trust_drawdown_amount, 250000);
assert.equal(proof.observed.refund.trust_balance.available_balance, 0);
assert.equal(proof.observed.refund.trust_balance.refund_total, 150000);
assert.equal(proof.observed.refund.trust_balance.refund_liability_amount, 0);
assert.equal(proof.observed.balances.summary.deposit_total, 400000);
assert.equal(proof.observed.balances.summary.drawdown_total, 250000);
assert.equal(proof.observed.balances.summary.refund_total, 150000);
assert.equal(proof.observed.balances.summary.negative_trust_balance_blocked, true);
assert.equal(proof.observed.negative_drawdown.status, 400);
for (const action of ["trust_ledger.deposit.receive", "trust_ledger.drawdown.invoice", "trust_ledger.refund_liability.record"]) {
  assert.equal(proof.observed.audit.actions.includes(action), true, action);
}

console.log("UPL-B-12 trust ledger validation passed.");
console.log("proof: artifacts/manual-qa/upl-b12-trust-ledger-proof.json");
