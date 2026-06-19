#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createPaymentsG5ARAgingDescriptor,
  createPaymentsG5ARBalanceDescriptor,
  createPaymentsG5PaymentImportDescriptor,
  createPaymentsG5PaymentMatchingDescriptor,
  createPaymentsG5PaymentSchemaDescriptor,
} from "../packages/payments/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G5-W08-T001",
  "LFOS-G5-W08-T002",
  "LFOS-G5-W08-T003",
  "LFOS-G5-W08-T004",
  "LFOS-G5-W08-T005",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "41-g5-billing-finance-entry-plan.md"),
  path.join(ROOT, "44-g5-c-invoice-tax-billing-ui-report.md"),
  path.join(ROOT, "45-g5-d-payment-ar-foundation-report.md"),
  path.resolve("contracts/payments-core-contract.json"),
  path.resolve("packages/payments/src/client-matter-g5.js"),
  path.resolve("packages/payments/test/client-matter-g5-payment-ar-foundation.test.js"),
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

const tenant_id = "tenant_g5d_validator";
const matter_id = "matter_g5d_validator";

function payment(overrides = {}) {
  return {
    payment_id: "payment_g5d_validator",
    tenant_id,
    matter_id,
    import_ref: "bank_import_g5d_validator",
    idempotency_key: "idem_g5d_validator",
    amount: 1200,
    status: "unmatched",
    ...overrides,
  };
}

function importBatch(overrides = {}) {
  return {
    import_batch_id: "import_batch_g5d_validator",
    tenant_id,
    import_ref: "bank_import_g5d_validator",
    idempotency_key: "idem_g5d_validator",
    ...overrides,
  };
}

function invoice(overrides = {}) {
  return {
    invoice_id: "invoice_g5d_validator",
    tenant_id,
    matter_id,
    issue_status: "issued",
    amount: 1200,
    outstanding_amount: 1200,
    ...overrides,
  };
}

function match(overrides = {}) {
  return {
    match_id: "match_g5d_validator",
    tenant_id,
    matter_id,
    payment_id: "payment_g5d_validator",
    invoice_id: "invoice_g5d_validator",
    match_type: "partial",
    amount: 600,
    ...overrides,
  };
}

function arBalance(overrides = {}) {
  return {
    ar_balance_id: "ar_g5d_validator",
    tenant_id,
    matter_id,
    invoice_id: "invoice_g5d_validator",
    outstanding_amount: 1200,
    editable_source_object: false,
    ...overrides,
  };
}

function agingSnapshot(overrides = {}) {
  return {
    aging_snapshot_id: "aging_g5d_validator",
    tenant_id,
    matter_id,
    as_of_date: "2026-06-19",
    bucket: "1_30",
    bucket_amount: 1200,
    balance_refs: ["ar_g5d_validator"],
    editable_source_object: false,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G5-D validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const g5cReport = await readText(path.join(ROOT, "44-g5-c-invoice-tax-billing-ui-report.md"));
  const report = await readText(path.join(ROOT, "45-g5-d-payment-ar-foundation-report.md"));
  const source = await readText(path.resolve("packages/payments/src/client-matter-g5.js"));
  const indexSource = await readText(path.resolve("packages/payments/src/index.js"));
  const testSource = await readText(path.resolve("packages/payments/test/client-matter-g5-payment-ar-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const paymentsContract = await readJson(path.resolve("contracts/payments-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G5-D TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G5-D TUW missing from G5 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G5-D TUW missing from G5-D report.");
  }

  requireIncludes(g5cReport, "G5-C Invoice Tax Billing UI Report", "G5C_DEPENDENCY", "G5-D must build on G5-C evidence.");
  requireIncludes(riskRegister, "R-006", "R006_DEPENDENCY", "G5-D must preserve issued-invoice mutation controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G5-D must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G5-D Payment AR Foundation Report",
    "This slice does not claim G5 runtime readiness",
    "imported/unmatched state",
    "duplicate import idempotency",
    "partial match",
    "issued invoice",
    "aging bucket",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G5-D report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "PAYMENTS_G5D_TUW_COVERAGE",
    "createPaymentsG5PaymentSchemaDescriptor",
    "createPaymentsG5PaymentImportDescriptor",
    "createPaymentsG5PaymentMatchingDescriptor",
    "createPaymentsG5ARBalanceDescriptor",
    "createPaymentsG5ARAgingDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "PAYMENTS_G5D_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G5-D descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G5-D descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g5.js", "MISSING_INDEX_EXPORT", "payments index must export G5 Client-Matter descriptors.");

  for (const marker of [
    "payment_imported_unmatched_state_required",
    "payment_import_idempotency_key_required",
    "payment_import_duplicate_attempt_blocked",
    "payment_match_partial_match_required",
    "payment_match_overallocation_blocked",
    "payment_match_duplicate_cash_blocked",
    "ar_balance_invoice_issue_source_required",
    "ar_balance_amount_reconciliation_required",
    "ar_balance_editable_source_blocked",
    "ar_aging_bucket_required",
    "ar_aging_balance_ref_required",
    "ar_aging_bucket_calculation_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G5-D source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g5d:validate"] !== "node scripts/validate-client-matter-os-g5-d.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g5d:validate.");
  }

  if (
    paymentsContract.program?.program_id !== "RP13" ||
    paymentsContract.program?.descriptor_only !== true ||
    paymentsContract.no_write_attestation?.dispatches_payments_runtime !== false ||
    paymentsContract.no_write_attestation?.dispatches_payment_matching_runtime !== false ||
    paymentsContract.no_write_attestation?.dispatches_ar_aging_runtime !== false ||
    paymentsContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("PAYMENTS_CONTRACT_BOUNDARY", "RP13 Payments contract must remain descriptor-only no-runtime evidence.");
  }

  const schema = createPaymentsG5PaymentSchemaDescriptor({
    tenant_id,
    matter_id,
    payment: payment(),
  });
  const blockedSchema = createPaymentsG5PaymentSchemaDescriptor({
    tenant_id,
    matter_id,
    payment: payment({ status: "matched", amount: 0 }),
  });
  const importDescriptor = createPaymentsG5PaymentImportDescriptor({
    tenant_id,
    import_batch: importBatch(),
    payment: payment(),
    idempotency_key: "idem_g5d_validator",
    duplicate_import_attempt: true,
    second_payment_created: false,
  });
  const blockedImport = createPaymentsG5PaymentImportDescriptor({
    tenant_id,
    import_batch: importBatch({ idempotency_key: "" }),
    payment: payment({ idempotency_key: "" }),
    duplicate_import_attempt: false,
  });
  const matching = createPaymentsG5PaymentMatchingDescriptor({
    tenant_id,
    matter_id,
    payment: payment(),
    invoice: invoice(),
    match: match(),
  });
  const blockedMatching = createPaymentsG5PaymentMatchingDescriptor({
    tenant_id,
    matter_id,
    payment: payment({ amount: 500 }),
    invoice: invoice({ outstanding_amount: 500 }),
    match: match({ amount: 800, duplicate_cash_recognized: true }),
  });
  const ar = createPaymentsG5ARBalanceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    ar_balance: arBalance(),
  });
  const blockedAr = createPaymentsG5ARBalanceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice({ issue_status: "draft", amount: 1200 }),
    ar_balance: arBalance({ outstanding_amount: 900, editable_source_object: true }),
  });
  const aging = createPaymentsG5ARAgingDescriptor({
    tenant_id,
    matter_id,
    ar_balance: arBalance(),
    aging_snapshot: agingSnapshot(),
  });
  const blockedAging = createPaymentsG5ARAgingDescriptor({
    tenant_id,
    matter_id,
    ar_balance: arBalance(),
    aging_snapshot: agingSnapshot({ bucket: "unknown", bucket_amount: 900, balance_refs: [] }),
  });

  if (
    schema.outcome !== "review_required" ||
    schema.payment_schema_receipt.imported_unmatched_state_tested !== true ||
    blockedSchema.outcome !== "blocked" ||
    !blockedSchema.blocked_claims.includes("payment_imported_unmatched_state_required")
  ) {
    addFinding("PAYMENT_SCHEMA", "Payment descriptor must preserve imported/unmatched state evidence.");
  }
  if (
    importDescriptor.outcome !== "review_required" ||
    importDescriptor.payment_import_receipt.duplicate_import_idempotency_tested !== true ||
    blockedImport.outcome !== "blocked" ||
    !blockedImport.blocked_claims.includes("payment_import_idempotency_key_required") ||
    !blockedImport.blocked_claims.includes("payment_import_duplicate_attempt_blocked")
  ) {
    addFinding("PAYMENT_IMPORT", "Payment import descriptor must require idempotent duplicate import evidence.");
  }
  if (
    matching.outcome !== "review_required" ||
    matching.payment_match_receipt.partial_match_tested !== true ||
    blockedMatching.outcome !== "blocked" ||
    !blockedMatching.blocked_claims.includes("payment_match_overallocation_blocked") ||
    !blockedMatching.blocked_claims.includes("payment_match_duplicate_cash_blocked")
  ) {
    addFinding("PAYMENT_MATCHING", "Payment matching descriptor must support partial match and block duplicate cash recognition.");
  }
  if (
    ar.outcome !== "review_required" ||
    ar.ar_balance_receipt.invoice_issue_creates_ar_tested !== true ||
    blockedAr.outcome !== "blocked" ||
    !blockedAr.blocked_claims.includes("ar_balance_invoice_issue_source_required") ||
    !blockedAr.blocked_claims.includes("ar_balance_editable_source_blocked")
  ) {
    addFinding("AR_BALANCE", "ARBalance descriptor must derive from issued invoice and remain a read model.");
  }
  if (
    aging.outcome !== "review_required" ||
    aging.ar_aging_receipt.aging_bucket_tested !== true ||
    blockedAging.outcome !== "blocked" ||
    !blockedAging.blocked_claims.includes("ar_aging_bucket_required") ||
    !blockedAging.blocked_claims.includes("ar_aging_bucket_calculation_required")
  ) {
    addFinding("AR_AGING", "AR aging descriptor must require bucket calculation evidence.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5-D validation passed.");
console.log("g5d_tuws: LFOS-G5-W08-T001/LFOS-G5-W08-T002/LFOS-G5-W08-T003/LFOS-G5-W08-T004/LFOS-G5-W08-T005");
console.log("payment_schema: imported_unmatched_state_required");
console.log("payment_import: duplicate_import_idempotency_required");
console.log("payment_matching: partial_match_without_duplicate_cash");
console.log("ar: invoice_issue_creates_ar_and_aging_bucket_required");
console.log("g5_runtime_readiness_claim: open");
