#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createBillingG5BillingUiDescriptor,
  createBillingG5CBillingCloseoutDescriptor,
  createBillingG5InvoiceCorrectionDescriptor,
  createBillingG5InvoiceIssueDescriptor,
  createBillingG5InvoiceLineReconciliationDescriptor,
  createBillingG5TaxInvoiceDescriptor,
} from "../packages/billing/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G5-W07-T011",
  "LFOS-G5-W07-T012",
  "LFOS-G5-W07-T013",
  "LFOS-G5-W07-T014",
  "LFOS-G5-W07-T015",
  "LFOS-G5-W07-T016",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "41-g5-billing-finance-entry-plan.md"),
  path.join(ROOT, "43-g5-b-wip-prebill-adjustment-report.md"),
  path.join(ROOT, "44-g5-c-invoice-tax-billing-ui-report.md"),
  path.resolve("contracts/billing-core-contract.json"),
  path.resolve("packages/billing/src/client-matter-g5.js"),
  path.resolve("packages/billing/test/client-matter-g5-invoice-tax-billing-ui.test.js"),
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

const tenant_id = "tenant_g5c_validator";
const matter_id = "matter_g5c_validator";

function prebill(overrides = {}) {
  return {
    prebill_id: "prebill_g5c_validator",
    tenant_id,
    matter_id,
    review_status: "partner_approved",
    approved_at: "2026-06-19T08:00:00Z",
    ...overrides,
  };
}

function invoice(overrides = {}) {
  return {
    invoice_id: "invoice_g5c_validator",
    tenant_id,
    matter_id,
    prebill_id: "prebill_g5c_validator",
    idempotency_key: "idem_g5c_validator",
    issue_status: "issued",
    amount: 1200,
    ...overrides,
  };
}

function wipItem(overrides = {}) {
  return {
    wip_item_id: "wip_g5c_validator",
    tenant_id,
    matter_id,
    amount: 1200,
    status: "locked",
    ...overrides,
  };
}

function invoiceLine(overrides = {}) {
  return {
    invoice_line_id: "line_g5c_validator",
    tenant_id,
    matter_id,
    wip_item_id: "wip_g5c_validator",
    amount: 1200,
    ...overrides,
  };
}

function taxInvoice(overrides = {}) {
  return {
    tax_invoice_id: "tax_g5c_validator",
    tenant_id,
    matter_id,
    invoice_id: "invoice_g5c_validator",
    status: "transmit_failed",
    ...overrides,
  };
}

function transmissionEvents() {
  return [
    { action: "issue", event_id: "tax_event_issue" },
    { action: "transmit", event_id: "tax_event_transmit" },
    { action: "fail", event_id: "tax_event_fail", reason_code: "gateway_timeout" },
  ];
}

function issuedInvoice(overrides = {}) {
  return {
    invoice_id: "invoice_g5c_validator",
    tenant_id,
    matter_id,
    issue_status: "issued",
    amount: 1200,
    ...overrides,
  };
}

function correction(overrides = {}) {
  return {
    correction_id: "correction_g5c_validator",
    tenant_id,
    matter_id,
    invoice_id: "invoice_g5c_validator",
    correction_type: "credit_note",
    reason_code: "client_billing_query",
    direct_edit_attempted: true,
    issued_invoice_mutated: false,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G5-C validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const g5bReport = await readText(path.join(ROOT, "43-g5-b-wip-prebill-adjustment-report.md"));
  const report = await readText(path.join(ROOT, "44-g5-c-invoice-tax-billing-ui-report.md"));
  const source = await readText(path.resolve("packages/billing/src/client-matter-g5.js"));
  const indexSource = await readText(path.resolve("packages/billing/src/index.js"));
  const testSource = await readText(path.resolve("packages/billing/test/client-matter-g5-invoice-tax-billing-ui.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const billingContract = await readJson(path.resolve("contracts/billing-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G5-C TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G5-C TUW missing from G5 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G5-C TUW missing from G5-C report.");
  }

  requireIncludes(g5bReport, "G5-B WIP PreBill Adjustment Report", "G5B_DEPENDENCY", "G5-C must build on G5-B evidence.");
  requireIncludes(riskRegister, "R-006", "R006_DEPENDENCY", "G5-C must preserve issued-invoice direct-edit controls.");
  requireIncludes(riskRegister, "R-014", "R014_DEPENDENCY", "G5-C must preserve TaxInvoice retry/failure controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G5-C must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G5-C Invoice Tax Billing UI Report",
    "This slice does not claim G5 runtime readiness",
    "idempotent issue",
    "WIP-to-invoice reconciliation",
    "issue/transmit/fail",
    "direct edit blocked",
    "role-based detail masking",
    "time-to-invoice evidence",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G5-C report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "BILLING_G5C_TUW_COVERAGE",
    "createBillingG5InvoiceIssueDescriptor",
    "createBillingG5InvoiceLineReconciliationDescriptor",
    "createBillingG5TaxInvoiceDescriptor",
    "createBillingG5InvoiceCorrectionDescriptor",
    "createBillingG5BillingUiDescriptor",
    "createBillingG5CBillingCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "BILLING_G5C_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G5-C descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G5-C descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g5.js", "MISSING_INDEX_EXPORT", "billing index must export G5 Client-Matter descriptors.");

  for (const marker of [
    "invoice_issue_idempotency_key_required",
    "invoice_issue_duplicate_attempt_blocked",
    "invoice_line_wip_reconciliation_required",
    "invoice_line_wip_total_mismatch",
    "invoice_line_unmatched_wip_ref_blocked",
    "tax_invoice_issue_event_required",
    "tax_invoice_transmit_event_required",
    "tax_invoice_failure_event_required",
    "tax_invoice_duplicate_transmit_blocked",
    "invoice_correction_direct_edit_blocked",
    "billing_ui_role_detail_mask_required",
    "billing_ui_unauthorized_amount_leak_blocked",
    "g5_billing_closeout_evidence_required",
    "g5_billing_time_to_invoice_evidence_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G5-C source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g5c:validate"] !== "node scripts/validate-client-matter-os-g5-c.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g5c:validate.");
  }

  if (
    billingContract.program?.program_id !== "RP12" ||
    billingContract.program?.descriptor_only !== true ||
    billingContract.no_write_attestation?.dispatches_billing_runtime !== false ||
    billingContract.no_write_attestation?.dispatches_proforma_runtime !== false ||
    billingContract.no_write_attestation?.dispatches_write_down_runtime !== false ||
    billingContract.no_write_attestation?.dispatches_invoice_runtime !== false
  ) {
    addFinding("BILLING_CONTRACT_BOUNDARY", "RP12 Billing contract must remain descriptor-only no-runtime evidence.");
  }

  const issue = createBillingG5InvoiceIssueDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    invoice: invoice(),
    idempotency_key: "idem_g5c_validator",
    duplicate_issue_attempt: true,
    second_invoice_created: false,
  });
  const blockedIssue = createBillingG5InvoiceIssueDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    invoice: invoice({ idempotency_key: "" }),
    duplicate_issue_attempt: false,
  });
  const lines = createBillingG5InvoiceLineReconciliationDescriptor({
    tenant_id,
    matter_id,
    invoice_lines: [invoiceLine()],
    wip_items: [wipItem()],
  });
  const blockedLines = createBillingG5InvoiceLineReconciliationDescriptor({
    tenant_id,
    matter_id,
    invoice_lines: [invoiceLine({ wip_item_id: "wip_missing", amount: 800 })],
    wip_items: [wipItem()],
  });
  const tax = createBillingG5TaxInvoiceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    tax_invoice: taxInvoice(),
    transmission_events: transmissionEvents(),
    duplicate_transmit_attempt: true,
    duplicate_transmission_created: false,
  });
  const blockedTax = createBillingG5TaxInvoiceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    tax_invoice: taxInvoice(),
    transmission_events: [{ action: "issue" }],
  });
  const correctionDescriptor = createBillingG5InvoiceCorrectionDescriptor({
    tenant_id,
    matter_id,
    issued_invoice: issuedInvoice(),
    correction: correction(),
    direct_edit_attempt: true,
    issued_invoice_mutated: false,
  });
  const blockedCorrection = createBillingG5InvoiceCorrectionDescriptor({
    tenant_id,
    matter_id,
    issued_invoice: issuedInvoice(),
    correction: correction({ issued_invoice_mutated: true }),
    direct_edit_attempt: true,
  });
  const ui = createBillingG5BillingUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    invoice: invoice(),
    ui_state: {
      amount_masked: true,
      detail_masked: true,
      amount_visible: false,
      detail_visible: false,
    },
  });
  const blockedUi = createBillingG5BillingUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    invoice: invoice(),
    ui_state: {
      amount_masked: false,
      detail_masked: false,
      amount_visible: true,
      detail_visible: true,
    },
  });
  const closeout = createBillingG5CBillingCloseoutDescriptor({
    tenant_id,
    descriptors: [issue, lines, tax, correctionDescriptor, ui],
    time_to_invoice_evidence: {
      prebill_approved_at: "2026-06-19T08:00:00Z",
      invoice_issue_requested_at: "2026-06-19T08:12:00Z",
      elapsed_minutes: 12,
    },
    command_evidence: { commands_passed: true },
    pr_state: { is_draft: true },
    upstream_disposition: "G1/G2/G3/G4 evidence remains draft-review gated",
    human_review_disposition: "pending_human_review",
  });

  if (
    issue.outcome !== "review_required" ||
    issue.invoice_issue_receipt.idempotent_issue_tested !== true ||
    blockedIssue.outcome !== "blocked" ||
    !blockedIssue.blocked_claims.includes("invoice_issue_idempotency_key_required") ||
    !blockedIssue.blocked_claims.includes("invoice_issue_duplicate_attempt_blocked")
  ) {
    addFinding("INVOICE_ISSUE", "Invoice issue must require idempotency and block duplicate issue evidence gaps.");
  }
  if (
    lines.outcome !== "review_required" ||
    lines.invoice_line_total !== lines.wip_total ||
    blockedLines.outcome !== "blocked" ||
    !blockedLines.blocked_claims.includes("invoice_line_unmatched_wip_ref_blocked") ||
    !blockedLines.blocked_claims.includes("invoice_line_wip_total_mismatch")
  ) {
    addFinding("INVOICE_LINE_RECONCILIATION", "Invoice lines must reconcile to WIP refs and totals.");
  }
  if (
    tax.outcome !== "review_required" ||
    tax.tax_invoice_receipt.issue_transmit_fail_tested !== true ||
    blockedTax.outcome !== "blocked" ||
    !blockedTax.blocked_claims.includes("tax_invoice_transmit_event_required") ||
    !blockedTax.blocked_claims.includes("tax_invoice_failure_event_required")
  ) {
    addFinding("TAX_INVOICE", "TaxInvoice must require issue, transmit, and failure evidence.");
  }
  if (
    correctionDescriptor.outcome !== "review_required" ||
    correctionDescriptor.correction_receipt.direct_edit_blocked_tested !== true ||
    blockedCorrection.outcome !== "blocked" ||
    !blockedCorrection.blocked_claims.includes("invoice_correction_direct_edit_blocked")
  ) {
    addFinding("INVOICE_CORRECTION", "Issued invoice correction must block direct edit mutation.");
  }
  if (
    ui.outcome !== "review_required" ||
    ui.billing_ui_receipt.role_based_detail_masking_tested !== true ||
    blockedUi.outcome !== "blocked" ||
    !blockedUi.blocked_claims.includes("billing_ui_role_detail_mask_required") ||
    !blockedUi.blocked_claims.includes("billing_ui_unauthorized_amount_leak_blocked")
  ) {
    addFinding("BILLING_UI", "Billing UI must mask role-restricted invoice details.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.g5_runtime_evidence_recorded !== true ||
    closeout.time_to_invoice_evidence_recorded !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G5C_CLOSEOUT", "G5-C closeout must summarize six TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5-C validation passed.");
console.log("g5c_tuws: LFOS-G5-W07-T011/LFOS-G5-W07-T012/LFOS-G5-W07-T013/LFOS-G5-W07-T014/LFOS-G5-W07-T015/LFOS-G5-W07-T016");
console.log("invoice_issue: idempotent_issue_required");
console.log("invoice_lines: wip_to_invoice_reconciliation_required");
console.log("tax_invoice: issue_transmit_fail_required");
console.log("billing_ui: role_based_detail_masking_required");
console.log("g5_runtime_readiness_claim: open");
