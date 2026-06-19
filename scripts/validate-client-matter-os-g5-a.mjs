#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor,
  createTimeExpenseG5DisbursementDescriptor,
  createTimeExpenseG5ExpenseDescriptor,
  createTimeExpenseG5FeeArrangementDescriptor,
  createTimeExpenseG5RateCardDescriptor,
  createTimeExpenseG5TimeEntryDescriptor,
  createTimeExpenseG5TimeEntryWorkflowDescriptor,
} from "../packages/time-expense/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G5-W07-T001",
  "LFOS-G5-W07-T002",
  "LFOS-G5-W07-T003",
  "LFOS-G5-W07-T004",
  "LFOS-G5-W07-T005",
  "LFOS-G5-W07-T006",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "40-g4-f-dms-ui-audit-closeout-report.md"),
  path.join(ROOT, "41-g5-billing-finance-entry-plan.md"),
  path.join(ROOT, "42-g5-a-time-expense-foundation-report.md"),
  path.resolve("contracts/time-expense-core-contract.json"),
  path.resolve("packages/time-expense/src/client-matter-g5.js"),
  path.resolve("packages/time-expense/test/client-matter-g5-time-expense-foundation.test.js"),
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

const tenant_id = "tenant_g5a_validator";
const actor_id = "actor_g5a_validator";
const matter_id = "matter_g5a_validator";

function timeEntry(overrides = {}) {
  return {
    time_entry_id: "time_g5a_validator",
    tenant_id,
    matter_id,
    actor_id,
    role_id: "partner",
    work_date: "2026-06-19",
    narrative: "Synthetic matter strategy review.",
    status: "draft",
    duration_minutes: 90,
    billable: true,
    ...overrides,
  };
}

function rateCard(overrides = {}) {
  return {
    rate_card_id: "rate_card_g5a_validator",
    tenant_id,
    currency: "USD",
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    role_rates: [{ role_id: "partner", hourly_rate: 600 }],
    ...overrides,
  };
}

function feeArrangement(overrides = {}) {
  return {
    fee_arrangement_id: "fee_g5a_validator",
    tenant_id,
    matter_id,
    billing_profile_id: "billing_profile_g5a_validator",
    rate_card_id: "rate_card_g5a_validator",
    rate_overrides: [{ role_id: "partner", hourly_rate: 550 }],
    ...overrides,
  };
}

function expense(overrides = {}) {
  return {
    expense_id: "expense_g5a_validator",
    tenant_id,
    matter_id,
    actor_id,
    amount: 125,
    currency: "USD",
    incurred_date: "2026-06-19",
    evidence_document_id: "doc_receipt_g5a_validator",
    billable: true,
    ...overrides,
  };
}

function disbursement(overrides = {}) {
  return {
    disbursement_id: "disbursement_g5a_validator",
    tenant_id,
    matter_id,
    actor_id,
    expense_id: "expense_g5a_validator",
    amount: 125,
    currency: "USD",
    billable: true,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G5-A validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const g4fReport = await readText(path.join(ROOT, "40-g4-f-dms-ui-audit-closeout-report.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const report = await readText(path.join(ROOT, "42-g5-a-time-expense-foundation-report.md"));
  const source = await readText(path.resolve("packages/time-expense/src/client-matter-g5.js"));
  const indexSource = await readText(path.resolve("packages/time-expense/src/index.js"));
  const testSource = await readText(path.resolve("packages/time-expense/test/client-matter-g5-time-expense-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const timeExpenseContract = await readJson(path.resolve("contracts/time-expense-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G5-A TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G5-A TUW missing from G5 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G5-A TUW missing from G5-A report.");
  }

  requireIncludes(g4fReport, "G4-F DMS UI Audit Closeout Report", "G4F_HANDOFF", "G5-A must depend on G4-F handoff evidence.");
  requireIncludes(riskRegister, "R-001", "R001_DEPENDENCY", "G5-A must preserve duplicate identity control.");
  requireIncludes(riskRegister, "R-006", "R006_DEPENDENCY", "G5-A must preserve billing-profile ownership control.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G5-A must preserve descriptor/runtime confusion control.");

  for (const phrase of [
    "G5-A Time Expense Foundation Report",
    "This slice does not claim G5 runtime readiness",
    "TimeEntry requires Matter",
    "RateCard effective dates",
    "FeeArrangement rate override",
    "submit/approve/lock",
    "expense evidence document",
    "disbursement billable flag",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G5-A report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createTimeExpenseG5TimeEntryDescriptor",
    "createTimeExpenseG5RateCardDescriptor",
    "createTimeExpenseG5FeeArrangementDescriptor",
    "createTimeExpenseG5TimeEntryWorkflowDescriptor",
    "createTimeExpenseG5ExpenseDescriptor",
    "createTimeExpenseG5DisbursementDescriptor",
    "createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G5-A descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G5-A descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g5.js", "MISSING_INDEX_EXPORT", "time-expense index must export G5 Client-Matter descriptors.");

  for (const marker of [
    "time_entry_matter_required",
    "rate_card_effective_date_range_invalid",
    "fee_arrangement_rate_card_trace_mismatch",
    "time_entry_locked_mutation_blocked",
    "expense_evidence_document_required",
    "disbursement_billable_flag_required",
    "g5_time_expense_closeout_evidence_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G5-A source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g5a:validate"] !== "node scripts/validate-client-matter-os-g5-a.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g5a:validate.");
  }

  if (
    timeExpenseContract.program?.program_id !== "RP11" ||
    timeExpenseContract.program?.descriptor_only !== true ||
    timeExpenseContract.no_write_attestation?.dispatches_time_entry_runtime !== false ||
    timeExpenseContract.no_write_attestation?.dispatches_rate_card_runtime !== false ||
    timeExpenseContract.no_write_attestation?.dispatches_expense_runtime !== false ||
    timeExpenseContract.no_write_attestation?.dispatches_disbursement_runtime !== false
  ) {
    addFinding("TIME_EXPENSE_CONTRACT_BOUNDARY", "RP11 Time Expense contract must remain descriptor-only no-runtime evidence.");
  }

  const time = createTimeExpenseG5TimeEntryDescriptor({ tenant_id, actor_id, matter_id, time_entry: timeEntry() });
  const blockedTime = createTimeExpenseG5TimeEntryDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry({ matter_id: "", duration_minutes: 0, billable: undefined }),
  });
  const rates = createTimeExpenseG5RateCardDescriptor({ tenant_id, rate_card: rateCard() });
  const blockedRates = createTimeExpenseG5RateCardDescriptor({
    tenant_id,
    rate_card: rateCard({ effective_from: "2026-12-31", effective_to: "2026-01-01" }),
  });
  const fees = createTimeExpenseG5FeeArrangementDescriptor({
    tenant_id,
    matter_id,
    fee_arrangement: feeArrangement(),
    rate_card: rateCard(),
  });
  const blockedFees = createTimeExpenseG5FeeArrangementDescriptor({
    tenant_id,
    matter_id,
    fee_arrangement: feeArrangement({ rate_card_id: "wrong" }),
    rate_card: rateCard(),
  });
  const workflow = createTimeExpenseG5TimeEntryWorkflowDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry({ status: "locked" }),
    workflow_events: [{ action: "submit" }, { action: "approve" }, { action: "lock" }],
  });
  const blockedWorkflow = createTimeExpenseG5TimeEntryWorkflowDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry({ status: "locked" }),
    workflow_events: [{ action: "approve" }, { action: "submit" }],
    mutates_locked_entry: true,
  });
  const expenseDescriptor = createTimeExpenseG5ExpenseDescriptor({ tenant_id, actor_id, matter_id, expense: expense() });
  const blockedExpense = createTimeExpenseG5ExpenseDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense({ evidence_document_id: "", billable: undefined }),
  });
  const disbursementDescriptor = createTimeExpenseG5DisbursementDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense(),
    disbursement: disbursement(),
  });
  const blockedDisbursement = createTimeExpenseG5DisbursementDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense(),
    disbursement: disbursement({ billable: undefined }),
  });
  const closeout = createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [time, rates, fees, workflow, expenseDescriptor, disbursementDescriptor],
  });

  if (
    time.outcome !== "review_required" ||
    time.required_field_coverage.matter !== true ||
    blockedTime.outcome !== "blocked" ||
    !blockedTime.blocked_claims.includes("time_entry_matter_required") ||
    !blockedTime.blocked_claims.includes("time_entry_billable_flag_required")
  ) {
    addFinding("TIME_ENTRY_DESCRIPTOR", "TimeEntry descriptor must require Matter and billable field coverage.");
  }
  if (
    rates.outcome !== "review_required" ||
    rates.rate_card_receipt.effective_date_tested !== true ||
    blockedRates.outcome !== "blocked" ||
    !blockedRates.blocked_claims.includes("rate_card_effective_date_range_invalid")
  ) {
    addFinding("RATE_CARD_DESCRIPTOR", "RateCard descriptor must require valid effective date ranges.");
  }
  if (
    fees.outcome !== "review_required" ||
    fees.fee_arrangement_receipt.rate_override_tested !== true ||
    blockedFees.outcome !== "blocked" ||
    !blockedFees.blocked_claims.includes("fee_arrangement_rate_card_trace_mismatch")
  ) {
    addFinding("FEE_ARRANGEMENT_DESCRIPTOR", "FeeArrangement descriptor must validate rate-card trace and overrides.");
  }
  if (
    workflow.outcome !== "review_required" ||
    workflow.submit_approve_lock_in_order !== true ||
    blockedWorkflow.outcome !== "blocked" ||
    !blockedWorkflow.blocked_claims.includes("time_entry_locked_mutation_blocked")
  ) {
    addFinding("TIME_ENTRY_WORKFLOW_DESCRIPTOR", "TimeEntry workflow descriptor must require submit/approve/lock and block locked mutation.");
  }
  if (
    expenseDescriptor.outcome !== "review_required" ||
    expenseDescriptor.expense_receipt.evidence_document_tested !== true ||
    blockedExpense.outcome !== "blocked" ||
    !blockedExpense.blocked_claims.includes("expense_evidence_document_required")
  ) {
    addFinding("EXPENSE_DESCRIPTOR", "Expense descriptor must require evidence document references.");
  }
  if (
    disbursementDescriptor.outcome !== "review_required" ||
    disbursementDescriptor.disbursement_receipt.billable_flag_tested !== true ||
    blockedDisbursement.outcome !== "blocked" ||
    !blockedDisbursement.blocked_claims.includes("disbursement_billable_flag_required")
  ) {
    addFinding("DISBURSEMENT_DESCRIPTOR", "Disbursement descriptor must require billable flag evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.g5_runtime_evidence_recorded !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G5A_CLOSEOUT", "G5-A closeout must summarize six TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5-A validation passed.");
console.log("g5a_tuws: LFOS-G5-W07-T001/LFOS-G5-W07-T002/LFOS-G5-W07-T003/LFOS-G5-W07-T004/LFOS-G5-W07-T005/LFOS-G5-W07-T006");
console.log("time_entry: matter_required_duration_billable");
console.log("rate_fee: effective_dates_rate_override_mapping");
console.log("workflow_expense_disbursement: submit_approve_lock_evidence_billable");
console.log("g5_runtime_readiness_claim: open");
