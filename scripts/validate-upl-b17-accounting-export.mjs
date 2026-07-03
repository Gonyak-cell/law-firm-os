#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const accountingExportService = read("packages/payments/src/accounting-export-service.js");
const financeRuntime = read("apps/api/src/finance-runtime-context.js");
const apiClient = read("apps/web/src/data/apiClient.js");
const mattersSurface = read("apps/web/src/components/MattersSurface.jsx");
const apiTest = read("apps/api/test/cmp-r4-g7-finance.test.js");
const runtimeTest = read("packages/billing/test/runtime-services.test.js");
const uiProofScript = read("scripts/run-lcx-vltui-matter-sections-proof.mjs");
const proofScript = read("scripts/run-upl-b17-accounting-export-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-b17-accounting-export-proof.json"));
const uiProof = JSON.parse(read("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-sections-proof.json"));

assert.match(accountingExportService, /export function buildAccountingExportCsv/);
assert.match(accountingExportService, /export function createAccountingCsvExport/);
for (const field of ["journal_entry_id", "posting_date", "source_ref", "matter_id", "account", "debit", "credit", "currency"]) {
  assert.match(accountingExportService, new RegExp(`"${field}"`));
}
assert.match(accountingExportService, /CSV_FIELDS\.join\(","\)/);
assert.match(accountingExportService, /balanced: Math\.abs\(debitTotal - creditTotal\) <= 0\.001/);
assert.match(accountingExportService, /bank_reference_included: false/);
assert.match(accountingExportService, /credential_material_included: false/);
assert.match(accountingExportService, /raw_journal_payload_included: false/);
assert.match(financeRuntime, /GET \/api\/finance\/accounting-export\.csv/);
assert.match(financeRuntime, /handleFinanceAccountingExportCsv/);
assert.match(financeRuntime, /createAccountingCsvExport/);
assert.match(apiClient, /export async function fetchFinanceAccountingExport/);
assert.match(apiClient, /\/api\/finance\/accounting-export\.csv/);
assert.match(apiClient, /from_date: fromDate/);
assert.match(apiClient, /to_date: toDate/);
assert.match(mattersSurface, /fetchFinanceAccountingExport/);
assert.match(mattersSurface, /data-matter-accounting-export-form="true"/);
assert.match(mattersSurface, /data-matter-accounting-export-summary="true"/);
assert.match(mattersSurface, /onCreateAccountingExport/);
assert.match(apiTest, /G7 accounting CSV export filters period and balances journal rows/);
assert.match(apiTest, /\/api\/finance\/accounting-export\.csv/);
assert.match(runtimeTest, /G7 accounting CSV export filters period and preserves debit credit balance/);
assert.match(runtimeTest, /createAccountingCsvExport/);
assert.match(proofScript, /period-filter-keeps-july-only/);
assert.match(proofScript, /idempotent-replay-and-audit/);
assert.match(uiProofScript, /accounting-export-period-csv-balanced/);

assert.equal(proof.contract_ref, "UPL-B-17");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);
assert.equal(proof.observed.export.status, 201);
assert.equal(proof.observed.export.item.row_count, 2);
assert.equal(proof.observed.export.item.debit_total, 100000);
assert.equal(proof.observed.export.item.credit_total, 100000);
assert.equal(proof.observed.export.item.balanced, true);
assert.equal(proof.observed.export.item.csv_text.includes("journal_upl_b17_july"), true);
assert.equal(proof.observed.export.item.csv_text.includes("journal_upl_b17_june"), false);
assert.equal(proof.observed.export.item.csv_sha256.length, 64);
assert.equal(proof.observed.export.item.bank_reference_included, false);
assert.equal(proof.observed.export.item.credential_material_included, false);
assert.equal(proof.observed.export.item.raw_journal_payload_included, false);
assert.equal(proof.observed.replay.outcome, "idempotent_replay");
assert.equal(proof.observed.audit.actions.includes("accounting.export.csv.create"), true);
assert.equal(proof.observed.audit.actions.includes("finance:accounting_export:read"), true);

assert.equal(uiProof.verdict, "PASS");
const uiCase = uiProof.cases[0];
assert.equal(uiCase.checks.some((check) => check.id === "accounting-export-period-csv-balanced" && check.passed === true), true);
assert.equal(
  uiCase.writes.some(
    (write) =>
      write.kind === "finance_accounting_export" &&
      write.query?.from_date === "2026-07-01" &&
      write.query?.to_date === "2026-07-31" &&
      write.query?.audit_hint_ref === "ui_cmp_g7_finance_probe",
  ),
  true,
);

console.log("UPL-B-17 accounting export validation passed.");
console.log("proof: artifacts/manual-qa/upl-b17-accounting-export-proof.json");
