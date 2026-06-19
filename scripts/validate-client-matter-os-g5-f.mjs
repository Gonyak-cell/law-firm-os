#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createSettlementG5ApprovalWorkflowDescriptor,
  createSettlementG5FinanceCloseoutDescriptor,
  createSettlementG5FinanceUiDescriptor,
  createSettlementG5OriginationCreditDescriptor,
  createSettlementG5SettlementRunDescriptor,
  createSettlementG5WorkingCreditDescriptor,
} from "../packages/settlement/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G5-W08-T009",
  "LFOS-G5-W08-T010",
  "LFOS-G5-W08-T011",
  "LFOS-G5-W08-T012",
  "LFOS-G5-W08-T013",
  "LFOS-G5-W08-T014",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "41-g5-billing-finance-entry-plan.md"),
  path.join(ROOT, "46-g5-e-accounting-tax-export-report.md"),
  path.join(ROOT, "47-g5-f-settlement-finance-ui-closeout-report.md"),
  path.resolve("contracts/settlement-core-contract.json"),
  path.resolve("packages/settlement/src/client-matter-g5.js"),
  path.resolve("packages/settlement/test/client-matter-g5-settlement-finance-ui-closeout.test.js"),
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

const tenant_id = "tenant_g5f_validator";
const matter_id = "matter_g5f_validator";
const period_id = "period_2026_06";
const settlement_run_id = "settlement_run_g5f_validator";

function settlementRun(overrides = {}) {
  return {
    settlement_run_id,
    tenant_id,
    period_id,
    lock_status: "locked",
    locked: true,
    status: "posted",
    locked_run_mutated: false,
    ...overrides,
  };
}

function originationCredit(overrides = {}) {
  return {
    origination_credit_id: "origination_credit_g5f_validator",
    tenant_id,
    matter_id,
    partner_id: "partner_originating",
    allocation_percent: 100,
    ...overrides,
  };
}

function workingCredit(overrides = {}) {
  return {
    working_credit_id: "working_credit_g5f_validator",
    tenant_id,
    matter_id,
    partner_id: "partner_working",
    role: "working_partner",
    allocation_percent: 80,
    ...overrides,
  };
}

function approval(overrides = {}) {
  return {
    approval_id: "settlement_approval_g5f_validator",
    tenant_id,
    settlement_run_id,
    approval_status: "approved",
    approver_id: "finance_admin_001",
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G5-F validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const g5eReport = await readText(path.join(ROOT, "46-g5-e-accounting-tax-export-report.md"));
  const report = await readText(path.join(ROOT, "47-g5-f-settlement-finance-ui-closeout-report.md"));
  const source = await readText(path.resolve("packages/settlement/src/client-matter-g5.js"));
  const testSource = await readText(path.resolve("packages/settlement/test/client-matter-g5-settlement-finance-ui-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const settlementContract = await readJson(path.resolve("contracts/settlement-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G5-F TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G5-F TUW missing from G5 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G5-F TUW missing from G5-F report.");
  }

  requireIncludes(g5eReport, "G5-E Accounting Tax Export Report", "G5E_DEPENDENCY", "G5-F must build on G5-E evidence.");
  requireIncludes(riskRegister, "R-013", "R013_DEPENDENCY", "G5-F must preserve settlement run mutation controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G5-F must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G5-F Settlement Finance UI Closeout Report",
    "This slice does not claim G5 runtime readiness",
    "run lock",
    "allocation sum",
    "role allocation",
    "posted run direct-edit block",
    "permission masking",
    "invoice-to-payment evidence",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G5-F report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "SETTLEMENT_G5F_TUW_COVERAGE",
    "createSettlementG5SettlementRunDescriptor",
    "createSettlementG5OriginationCreditDescriptor",
    "createSettlementG5WorkingCreditDescriptor",
    "createSettlementG5ApprovalWorkflowDescriptor",
    "createSettlementG5FinanceUiDescriptor",
    "createSettlementG5FinanceCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "SETTLEMENT_G5F_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G5-F descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G5-F descriptor export missing test coverage.");
  }

  for (const marker of [
    "settlement_run_lock_required",
    "settlement_run_period_trace_required",
    "settlement_run_locked_mutation_blocked",
    "origination_credit_allocation_sum_required",
    "origination_credit_partner_required",
    "origination_credit_matter_trace_mismatch",
    "working_credit_role_allocation_required",
    "working_credit_invalid_role_blocked",
    "working_credit_allocation_sum_required",
    "settlement_approval_required",
    "posted_settlement_run_direct_edit_blocked",
    "settlement_approval_posted_run_required",
    "finance_ui_permission_masking_required",
    "finance_ui_unauthorized_allocation_leak_blocked",
    "g5_finance_closeout_evidence_required",
    "g5_finance_invoice_to_payment_evidence_required",
    "g5_finance_closeout_blocked_descriptor_present",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G5-F source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g5f:validate"] !== "node scripts/validate-client-matter-os-g5-f.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g5f:validate.");
  }

  if (
    settlementContract.program?.program_id !== "RP14" ||
    settlementContract.program?.descriptor_only !== true ||
    settlementContract.no_write_attestation?.dispatches_settlement_runtime !== false ||
    settlementContract.no_write_attestation?.dispatches_origination_runtime !== false ||
    settlementContract.no_write_attestation?.dispatches_working_credit_runtime !== false ||
    settlementContract.no_write_attestation?.dispatches_allocation_runtime !== false ||
    settlementContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("SETTLEMENT_CONTRACT_BOUNDARY", "RP14 Settlement contract must remain descriptor-only no-runtime evidence.");
  }

  const run = createSettlementG5SettlementRunDescriptor({
    tenant_id,
    period_id,
    settlement_run: settlementRun(),
    lock_test_attempted: true,
    locked_run_mutated: false,
  });
  const blockedRun = createSettlementG5SettlementRunDescriptor({
    tenant_id,
    period_id,
    settlement_run: settlementRun({ locked: false, lock_status: "open", locked_run_mutated: true }),
  });
  const origination = createSettlementG5OriginationCreditDescriptor({
    tenant_id,
    matter_id,
    origination_credits: [originationCredit()],
  });
  const blockedOrigination = createSettlementG5OriginationCreditDescriptor({
    tenant_id,
    matter_id,
    origination_credits: [originationCredit({ partner_id: "", allocation_percent: 90 })],
  });
  const working = createSettlementG5WorkingCreditDescriptor({
    tenant_id,
    matter_id,
    working_credits: [workingCredit()],
  });
  const blockedWorking = createSettlementG5WorkingCreditDescriptor({
    tenant_id,
    matter_id,
    working_credits: [workingCredit({ role: "viewer", allocation_percent: 0 })],
  });
  const approvalDescriptor = createSettlementG5ApprovalWorkflowDescriptor({
    tenant_id,
    settlement_run: settlementRun(),
    approval: approval(),
    posted_run_direct_edit_attempt: true,
    posted_run_mutated: false,
  });
  const blockedApproval = createSettlementG5ApprovalWorkflowDescriptor({
    tenant_id,
    settlement_run: settlementRun({ status: "draft" }),
    approval: approval({ approval_status: "requested", approver_id: "" }),
    posted_run_direct_edit_attempt: true,
    posted_run_mutated: true,
  });
  const ui = createSettlementG5FinanceUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    ui_state: {
      allocation_masked: true,
      payout_masked: true,
      allocation_visible: false,
      payout_visible: false,
    },
  });
  const blockedUi = createSettlementG5FinanceUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    ui_state: {
      allocation_masked: false,
      payout_masked: false,
      allocation_visible: true,
      payout_visible: true,
    },
  });
  const closeout = createSettlementG5FinanceCloseoutDescriptor({
    tenant_id,
    descriptors: [run, origination, working, approvalDescriptor, ui],
    invoice_to_payment_evidence: {
      matter_id,
      invoice_id: "invoice_g5f_validator",
      payment_id: "payment_g5f_validator",
      settlement_run_id,
    },
    command_evidence: { commands_passed: true },
    pr_state: { is_draft: true },
    upstream_disposition: "G1/G2/G3/G4/G5-A-E evidence remains draft-review gated",
    human_review_disposition: "pending_human_review",
  });

  if (
    run.outcome !== "review_required" ||
    run.settlement_run_receipt.run_lock_tested !== true ||
    blockedRun.outcome !== "blocked" ||
    !blockedRun.blocked_claims.includes("settlement_run_lock_required") ||
    !blockedRun.blocked_claims.includes("settlement_run_locked_mutation_blocked")
  ) {
    addFinding("SETTLEMENT_RUN", "SettlementRun descriptor must require run lock evidence and block locked-run mutation.");
  }
  if (
    origination.outcome !== "review_required" ||
    origination.origination_credit_receipt.allocation_sum_tested !== true ||
    blockedOrigination.outcome !== "blocked" ||
    !blockedOrigination.blocked_claims.includes("origination_credit_partner_required") ||
    !blockedOrigination.blocked_claims.includes("origination_credit_allocation_sum_required")
  ) {
    addFinding("ORIGINATION_CREDIT", "OriginationCredit descriptor must require partner and allocation-sum evidence.");
  }
  if (
    working.outcome !== "review_required" ||
    working.working_credit_receipt.role_allocation_tested !== true ||
    blockedWorking.outcome !== "blocked" ||
    !blockedWorking.blocked_claims.includes("working_credit_invalid_role_blocked") ||
    !blockedWorking.blocked_claims.includes("working_credit_role_allocation_required")
  ) {
    addFinding("WORKING_CREDIT", "WorkingCredit descriptor must require allowed role and allocation evidence.");
  }
  if (
    approvalDescriptor.outcome !== "review_required" ||
    approvalDescriptor.approval_workflow_receipt.direct_edit_blocked_tested !== true ||
    blockedApproval.outcome !== "blocked" ||
    !blockedApproval.blocked_claims.includes("settlement_approval_required") ||
    !blockedApproval.blocked_claims.includes("posted_settlement_run_direct_edit_blocked")
  ) {
    addFinding("SETTLEMENT_APPROVAL", "Settlement approval descriptor must require approval and block posted-run direct edit.");
  }
  if (
    ui.outcome !== "review_required" ||
    ui.finance_ui_receipt.permission_masking_tested !== true ||
    blockedUi.outcome !== "blocked" ||
    !blockedUi.blocked_claims.includes("finance_ui_permission_masking_required") ||
    !blockedUi.blocked_claims.includes("finance_ui_unauthorized_allocation_leak_blocked")
  ) {
    addFinding("FINANCE_UI", "Finance UI descriptor must require permission masking for restricted roles.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.invoice_to_payment_evidence_recorded !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G5F_CLOSEOUT", "G5-F closeout must summarize six TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5-F validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5-F validation passed.");
console.log("g5f_tuws: LFOS-G5-W08-T009/LFOS-G5-W08-T010/LFOS-G5-W08-T011/LFOS-G5-W08-T012/LFOS-G5-W08-T013/LFOS-G5-W08-T014");
console.log("settlement_run: run_lock_required");
console.log("origination_credit: allocation_sum_required");
console.log("working_credit: role_allocation_required");
console.log("finance_closeout: invoice_to_payment_required");
console.log("g5_runtime_readiness_claim: open");
