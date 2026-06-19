import assert from "node:assert/strict";
import test from "node:test";

import {
  createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor,
  createTimeExpenseG5DisbursementDescriptor,
  createTimeExpenseG5ExpenseDescriptor,
  createTimeExpenseG5FeeArrangementDescriptor,
  createTimeExpenseG5RateCardDescriptor,
  createTimeExpenseG5TimeEntryDescriptor,
  createTimeExpenseG5TimeEntryWorkflowDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g5a_validator";
const actor_id = "actor_g5a_validator";
const matter_id = "matter_g5a";

function timeEntry(overrides = {}) {
  return {
    time_entry_id: "time_g5a_001",
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
    rate_card_id: "rate_card_g5a",
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
    fee_arrangement_id: "fee_g5a",
    tenant_id,
    matter_id,
    billing_profile_id: "billing_profile_g5a",
    rate_card_id: "rate_card_g5a",
    rate_overrides: [{ role_id: "partner", hourly_rate: 550 }],
    ...overrides,
  };
}

function expense(overrides = {}) {
  return {
    expense_id: "expense_g5a",
    tenant_id,
    matter_id,
    actor_id,
    amount: 125,
    currency: "USD",
    incurred_date: "2026-06-19",
    evidence_document_id: "doc_receipt_g5a",
    billable: true,
    ...overrides,
  };
}

function disbursement(overrides = {}) {
  return {
    disbursement_id: "disbursement_g5a",
    tenant_id,
    matter_id,
    actor_id,
    expense_id: "expense_g5a",
    amount: 125,
    currency: "USD",
    billable: true,
    ...overrides,
  };
}

test("G5-A TimeEntry descriptor requires Matter, actor, role, duration, and billable flag", () => {
  const descriptor = createTimeExpenseG5TimeEntryDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.required_field_coverage.matter, true);
  assert.equal(descriptor.required_field_coverage.billable_flag, true);
  assert.equal(descriptor.writes_product_state, false);
  assert.equal(descriptor.time_entry_receipt.time_entry_created, false);

  const blocked = createTimeExpenseG5TimeEntryDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry({ matter_id: "", duration_minutes: -1, billable: undefined }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("time_entry_matter_required"));
  assert.ok(blocked.blocked_claims.includes("time_entry_non_positive_duration_blocked"));
  assert.ok(blocked.blocked_claims.includes("time_entry_billable_flag_required"));
});

test("G5-A RateCard and FeeArrangement descriptors preserve effective dates and rate overrides", () => {
  const rates = createTimeExpenseG5RateCardDescriptor({ tenant_id, rate_card: rateCard() });
  const arrangement = createTimeExpenseG5FeeArrangementDescriptor({
    tenant_id,
    matter_id,
    fee_arrangement: feeArrangement(),
    rate_card: rateCard(),
  });

  assert.equal(rates.outcome, "review_required");
  assert.equal(rates.rate_card_receipt.effective_date_tested, true);
  assert.equal(arrangement.outcome, "review_required");
  assert.equal(arrangement.fee_arrangement_receipt.rate_override_tested, true);

  const blockedRates = createTimeExpenseG5RateCardDescriptor({
    tenant_id,
    rate_card: rateCard({ effective_from: "2026-12-31", effective_to: "2026-01-01" }),
  });
  const blockedArrangement = createTimeExpenseG5FeeArrangementDescriptor({
    tenant_id,
    matter_id,
    fee_arrangement: feeArrangement({ rate_card_id: "wrong", rate_overrides: [{ role_id: "unknown", hourly_rate: 1 }] }),
    rate_card: rateCard(),
  });

  assert.equal(blockedRates.outcome, "blocked");
  assert.ok(blockedRates.blocked_claims.includes("rate_card_effective_date_range_invalid"));
  assert.equal(blockedArrangement.outcome, "blocked");
  assert.ok(blockedArrangement.blocked_claims.includes("fee_arrangement_rate_card_trace_mismatch"));
  assert.ok(blockedArrangement.blocked_claims.includes("fee_arrangement_override_role_unknown"));
});

test("G5-A TimeEntry workflow descriptor requires submit approve lock ordering", () => {
  const descriptor = createTimeExpenseG5TimeEntryWorkflowDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry({ status: "locked" }),
    workflow_events: [{ action: "submit" }, { action: "approve" }, { action: "lock" }],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.submit_approve_lock_in_order, true);
  assert.equal(descriptor.workflow_receipt.status_transition_written, false);

  const blocked = createTimeExpenseG5TimeEntryWorkflowDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    time_entry: timeEntry({ status: "locked" }),
    workflow_events: [{ action: "approve" }, { action: "submit" }],
    mutates_locked_entry: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("time_entry_lock_action_required"));
  assert.ok(blocked.blocked_claims.includes("time_entry_submit_approve_lock_order_required"));
  assert.ok(blocked.blocked_claims.includes("time_entry_locked_mutation_blocked"));
});

test("G5-A Expense and Disbursement descriptors require evidence document and billable flag", () => {
  const expenseDescriptor = createTimeExpenseG5ExpenseDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense(),
  });
  const disbursementDescriptor = createTimeExpenseG5DisbursementDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense(),
    disbursement: disbursement(),
  });

  assert.equal(expenseDescriptor.outcome, "review_required");
  assert.equal(expenseDescriptor.expense_receipt.evidence_document_tested, true);
  assert.equal(disbursementDescriptor.outcome, "review_required");
  assert.equal(disbursementDescriptor.disbursement_receipt.billable_flag_tested, true);

  const blockedExpense = createTimeExpenseG5ExpenseDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense({ evidence_document_id: "", billable: undefined }),
  });
  const blockedDisbursement = createTimeExpenseG5DisbursementDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    expense: expense(),
    disbursement: disbursement({ billable: undefined, expense_id: "wrong" }),
  });

  assert.equal(blockedExpense.outcome, "blocked");
  assert.ok(blockedExpense.blocked_claims.includes("expense_evidence_document_required"));
  assert.ok(blockedExpense.blocked_claims.includes("expense_billable_flag_required"));
  assert.equal(blockedDisbursement.outcome, "blocked");
  assert.ok(blockedDisbursement.blocked_claims.includes("disbursement_billable_flag_required"));
  assert.ok(blockedDisbursement.blocked_claims.includes("disbursement_expense_trace_mismatch"));
});

test("G5-A closeout descriptor summarizes Time Expense foundation evidence", () => {
  const descriptors = [
    createTimeExpenseG5TimeEntryDescriptor({ tenant_id, actor_id, matter_id, time_entry: timeEntry() }),
    createTimeExpenseG5RateCardDescriptor({ tenant_id, rate_card: rateCard() }),
    createTimeExpenseG5FeeArrangementDescriptor({
      tenant_id,
      matter_id,
      fee_arrangement: feeArrangement(),
      rate_card: rateCard(),
    }),
    createTimeExpenseG5TimeEntryWorkflowDescriptor({
      tenant_id,
      actor_id,
      matter_id,
      time_entry: timeEntry({ status: "locked" }),
      workflow_events: [{ action: "submit" }, { action: "approve" }, { action: "lock" }],
    }),
    createTimeExpenseG5ExpenseDescriptor({ tenant_id, actor_id, matter_id, expense: expense() }),
    createTimeExpenseG5DisbursementDescriptor({
      tenant_id,
      actor_id,
      matter_id,
      expense: expense(),
      disbursement: disbursement(),
    }),
  ];

  const closeout = createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor({ tenant_id, descriptors });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G5-W07-T001",
    "LFOS-G5-W07-T002",
    "LFOS-G5-W07-T003",
    "LFOS-G5-W07-T004",
    "LFOS-G5-W07-T005",
    "LFOS-G5-W07-T006",
  ]);
  assert.equal(closeout.time_entry_schema_tested, true);
  assert.equal(closeout.rate_card_effective_date_tested, true);
  assert.equal(closeout.fee_arrangement_rate_override_tested, true);
  assert.equal(closeout.submit_approve_lock_tested, true);
  assert.equal(closeout.expense_evidence_document_tested, true);
  assert.equal(closeout.disbursement_billable_flag_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
