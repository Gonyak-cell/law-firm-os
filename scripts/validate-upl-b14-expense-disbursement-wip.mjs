#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const expenseService = read("packages/time-expense/src/expense-service.js");
const disbursementService = read("packages/time-expense/src/disbursement-service.js");
const wipService = read("packages/billing/src/wip-service.js");
const apiClient = read("apps/web/src/data/apiClient.js");
const mattersSurface = read("apps/web/src/components/MattersSurface.jsx");
const apiTest = read("apps/api/test/cmp-r4-g7-finance.test.js");
const uiProofScript = read("scripts/run-lcx-vltui-matter-sections-proof.mjs");
const proofScript = read("scripts/run-upl-b14-expense-disbursement-wip-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-b14-expense-disbursement-wip-proof.json"));
const uiProof = JSON.parse(read("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-sections-proof.json"));

assert.match(expenseService, /model_type: "Expense"/);
assert.match(expenseService, /approved_for_wip: expense\.status === "approved"/);
assert.match(expenseService, /action: "expense\.create"/);
assert.match(disbursementService, /model_type: "Disbursement"/);
assert.match(disbursementService, /recoverable: disbursement\.recoverable !== false/);
assert.match(disbursementService, /action: "disbursement\.create"/);
assert.match(wipService, /\["TimeEntry", "Expense", "Disbursement"\]\.includes\(item\.model_type\)/);
assert.match(wipService, /item\.status === "approved" \|\| item\.approved_for_wip === true/);
assert.match(wipService, /item\.billable !== false/);
assert.match(apiTest, /G7 approval expense disbursement and WIP lock routes feed WIP sources/);
assert.match(apiTest, /new Set\(\["TimeEntry", "Expense", "Disbursement"\]\)/);
assert.match(apiTest, /expense\.body\.item\.approved_for_wip/);
assert.match(apiTest, /disbursement\.body\.item\.recoverable/);
assert.match(apiClient, /export function createFinanceExpense/);
assert.match(apiClient, /path: "\/api\/finance\/expenses"/);
assert.match(apiClient, /status: "approved"/);
assert.match(apiClient, /export function createFinanceDisbursement/);
assert.match(apiClient, /path: "\/api\/finance\/disbursements"/);
assert.match(apiClient, /recoverable: true/);
assert.match(mattersSurface, /data-matter-expense-form="true"/);
assert.match(mattersSurface, /data-matter-disbursement-form="true"/);
assert.match(mattersSurface, /onCreateExpense=\{handleCreateExpense\}/);
assert.match(mattersSurface, /onCreateDisbursement=\{handleCreateDisbursement\}/);
assert.match(uiProofScript, /finance_expense/);
assert.match(uiProofScript, /finance_disbursement/);
assert.match(uiProofScript, /expense-disbursement-inputs-feed-wip/);
assert.match(proofScript, /wip-includes-time-expense-disbursement-sources/);
assert.equal(proof.contract_ref, "UPL-B-14");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);
assert.equal(uiProof.verdict, "PASS");
const uiCase = uiProof.cases[0];
assert.equal(uiCase.checks.some((check) => check.id === "expense-disbursement-inputs-feed-wip" && check.passed === true), true);
for (const kind of ["finance_time_entry", "finance_expense", "finance_disbursement", "finance_wip"]) {
  assert.equal(uiCase.writes.some((write) => write.kind === kind && write.audit_hint_ref === "ui_cmp_g7_finance_probe"), true, kind);
}

assert.deepEqual(proof.observed.wip.source_types, ["Disbursement", "Expense", "TimeEntry"]);
assert.equal(proof.observed.wip.total_amount, 140000);
assert.equal(proof.observed.expense.approved_for_wip, true);
assert.equal(proof.observed.expense.amount, 25000);
assert.equal(proof.observed.disbursement.recoverable, true);
assert.equal(proof.observed.disbursement.amount, 15000);
assert.equal(proof.observed.snapshot.total_amount, 140000);
assert.equal(proof.observed.snapshot.immutable_snapshot, true);
assert.equal(proof.observed.non_partner_approval.status, 403);
assert.equal(proof.observed.non_partner_approval.count_leak_prevented, true);
for (const action of ["time.entry.approve_for_wip", "expense.create", "disbursement.create", "wip.generate", "wip.snapshot.lock"]) {
  assert.equal(proof.observed.audit.actions.includes(action), true, action);
}
assert.equal(proof.observed.audit.reasons.includes("finance_partner_role_required"), true);

console.log("UPL-B-14 expense/disbursement WIP validation passed.");
console.log("proof: artifacts/manual-qa/upl-b14-expense-disbursement-wip-proof.json");
