#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createPaymentsG5AccountingExportDescriptor,
  createPaymentsG5JournalEntryDescriptor,
  createPaymentsG5VatTaxExportDescriptor,
} from "../packages/payments/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G5-W08-T006", "LFOS-G5-W08-T007", "LFOS-G5-W08-T008"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "41-g5-billing-finance-entry-plan.md"),
  path.join(ROOT, "45-g5-d-payment-ar-foundation-report.md"),
  path.join(ROOT, "46-g5-e-accounting-tax-export-report.md"),
  path.resolve("contracts/payments-core-contract.json"),
  path.resolve("packages/payments/src/client-matter-g5.js"),
  path.resolve("packages/payments/test/client-matter-g5-accounting-tax-export.test.js"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

const tenant_id = "tenant_g5e_validator";
const matter_id = "matter_g5e_validator";

function journalEntry(overrides = {}) {
  return {
    journal_entry_id: "journal_g5e_validator",
    tenant_id,
    matter_id,
    source_ref: "invoice_g5e_validator",
    lines: [
      { line_id: "journal_line_debit", side: "debit", account_code: "1100", amount: 1200 },
      { line_id: "journal_line_credit", side: "credit", account_code: "4000", amount: 1200 },
    ],
    posted_to_gl: false,
    ...overrides,
  };
}

function sourceEvent(overrides = {}) {
  return {
    event_id: "invoice_issued_g5e_validator",
    event_type: "invoice_issued",
    tenant_id,
    matter_id,
    amount: 1200,
    ...overrides,
  };
}

function exportBatch(overrides = {}) {
  return {
    export_batch_id: "accounting_export_g5e_validator",
    tenant_id,
    export_format: "csv",
    dispatched_runtime: false,
    ...overrides,
  };
}

function taxExport(overrides = {}) {
  return {
    tax_export_id: "vat_export_g5e_validator",
    tenant_id,
    period_id: "period_2026_06",
    tax_total: 120,
    exported_without_lock: false,
    ...overrides,
  };
}

function period(overrides = {}) {
  return {
    period_id: "period_2026_06",
    locked: true,
    ...overrides,
  };
}

function invoiceTaxSummary(overrides = {}) {
  return {
    invoice_id: "invoice_g5e_validator",
    tenant_id,
    matter_id,
    tax_amount: 120,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G5-E validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const g5dReport = await readText(path.join(ROOT, "45-g5-d-payment-ar-foundation-report.md"));
  const report = await readText(path.join(ROOT, "46-g5-e-accounting-tax-export-report.md"));
  const source = await readText(path.resolve("packages/payments/src/client-matter-g5.js"));
  const testSource = await readText(path.resolve("packages/payments/test/client-matter-g5-accounting-tax-export.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const paymentsContract = await readJson(path.resolve("contracts/payments-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G5-E TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G5-E TUW missing from G5 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G5-E TUW missing from G5-E report.");
  }

  requireIncludes(g5dReport, "G5-D Payment AR Foundation Report", "G5D_DEPENDENCY", "G5-E must build on G5-D evidence.");
  requireIncludes(riskRegister, "R-014", "R014_DEPENDENCY", "G5-E must preserve tax export retry/reconciliation controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G5-E must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G5-E Accounting Tax Export Report",
    "This slice does not claim G5 runtime readiness",
    "balanced entry",
    "export audit evidence",
    "period lock evidence",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G5-E report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "PAYMENTS_G5E_TUW_COVERAGE",
    "createPaymentsG5JournalEntryDescriptor",
    "createPaymentsG5AccountingExportDescriptor",
    "createPaymentsG5VatTaxExportDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "PAYMENTS_G5E_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G5-E descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G5-E descriptor export missing test coverage.");
  }

  for (const marker of [
    "journal_entry_source_event_required",
    "journal_entry_balanced_entry_required",
    "journal_entry_posting_blocked",
    "accounting_export_audit_evidence_required",
    "accounting_export_balanced_entry_required",
    "accounting_export_runtime_dispatch_blocked",
    "vat_tax_export_period_lock_required",
    "vat_tax_export_invoice_tax_summary_required",
    "vat_tax_export_amount_reconciliation_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G5-E source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g5e:validate"] !== "node scripts/validate-client-matter-os-g5-e.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g5e:validate.");
  }

  if (
    paymentsContract.program?.program_id !== "RP13" ||
    paymentsContract.program?.descriptor_only !== true ||
    paymentsContract.no_write_attestation?.dispatches_payments_runtime !== false ||
    paymentsContract.no_write_attestation?.dispatches_journal_entry_runtime !== false ||
    paymentsContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("PAYMENTS_CONTRACT_BOUNDARY", "RP13 Payments contract must remain descriptor-only no-runtime evidence.");
  }

  const journal = createPaymentsG5JournalEntryDescriptor({
    tenant_id,
    matter_id,
    journal_entry: journalEntry(),
    source_events: [sourceEvent()],
  });
  const blockedJournal = createPaymentsG5JournalEntryDescriptor({
    tenant_id,
    matter_id,
    journal_entry: journalEntry({
      lines: [
        { line_id: "journal_line_debit", side: "debit", account_code: "1100", amount: 1200 },
        { line_id: "journal_line_credit", side: "credit", account_code: "4000", amount: 900 },
      ],
      posted_to_gl: true,
    }),
    source_events: [],
  });
  const accountingExport = createPaymentsG5AccountingExportDescriptor({
    tenant_id,
    export_batch: exportBatch(),
    journal_entries: [journalEntry()],
    audit_evidence: { export_audit_ref: "audit_export_g5e_validator" },
  });
  const blockedAccountingExport = createPaymentsG5AccountingExportDescriptor({
    tenant_id,
    export_batch: exportBatch({ export_format: "", dispatched_runtime: true }),
    journal_entries: [journalEntry({ lines: [{ side: "debit", amount: 1200 }] })],
    audit_evidence: {},
  });
  const tax = createPaymentsG5VatTaxExportDescriptor({
    tenant_id,
    tax_export: taxExport(),
    period: period(),
    invoice_tax_summaries: [invoiceTaxSummary()],
  });
  const blockedTax = createPaymentsG5VatTaxExportDescriptor({
    tenant_id,
    tax_export: taxExport({ tax_total: 200, exported_without_lock: true }),
    period: period({ locked: false }),
    invoice_tax_summaries: [invoiceTaxSummary()],
  });

  if (
    journal.outcome !== "review_required" ||
    journal.journal_entry_receipt.balanced_entry_tested !== true ||
    blockedJournal.outcome !== "blocked" ||
    !blockedJournal.blocked_claims.includes("journal_entry_balanced_entry_required") ||
    !blockedJournal.blocked_claims.includes("journal_entry_posting_blocked")
  ) {
    addFinding("JOURNAL_ENTRY", "JournalEntry descriptor must require balanced entry evidence and block GL posting.");
  }
  if (
    accountingExport.outcome !== "review_required" ||
    accountingExport.accounting_export_receipt.export_audit_tested !== true ||
    blockedAccountingExport.outcome !== "blocked" ||
    !blockedAccountingExport.blocked_claims.includes("accounting_export_audit_evidence_required") ||
    !blockedAccountingExport.blocked_claims.includes("accounting_export_runtime_dispatch_blocked")
  ) {
    addFinding("ACCOUNTING_EXPORT", "Accounting export descriptor must require export audit evidence and block runtime dispatch.");
  }
  if (
    tax.outcome !== "review_required" ||
    tax.vat_tax_export_receipt.period_lock_tested !== true ||
    blockedTax.outcome !== "blocked" ||
    !blockedTax.blocked_claims.includes("vat_tax_export_period_lock_required") ||
    !blockedTax.blocked_claims.includes("vat_tax_export_amount_reconciliation_required")
  ) {
    addFinding("VAT_TAX_EXPORT", "VAT/tax export descriptor must require period lock and amount reconciliation evidence.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5-E validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5-E validation passed.");
console.log("g5e_tuws: LFOS-G5-W08-T006/LFOS-G5-W08-T007/LFOS-G5-W08-T008");
console.log("journal_entry: balanced_entry_required");
console.log("accounting_export: export_audit_required");
console.log("vat_tax_export: period_lock_required");
console.log("g5_runtime_readiness_claim: open");
