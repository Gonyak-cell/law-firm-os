import assert from "node:assert/strict";
import test from "node:test";

import {
  SETTLEMENT_G5F_TUW_COVERAGE,
  createSettlementG5ApprovalWorkflowDescriptor,
  createSettlementG5FinanceCloseoutDescriptor,
  createSettlementG5FinanceUiDescriptor,
  createSettlementG5OriginationCreditDescriptor,
  createSettlementG5SettlementRunDescriptor,
  createSettlementG5WorkingCreditDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g5f_validator";
const matter_id = "matter_g5f";
const period_id = "period_2026_06";
const settlement_run_id = "settlement_run_g5f_001";

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
    origination_credit_id: "origination_credit_g5f_001",
    tenant_id,
    matter_id,
    partner_id: "partner_originating",
    allocation_percent: 100,
    ...overrides,
  };
}

function workingCredit(overrides = {}) {
  return {
    working_credit_id: "working_credit_g5f_001",
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
    approval_id: "settlement_approval_g5f_001",
    tenant_id,
    settlement_run_id,
    approval_status: "approved",
    approver_id: "finance_admin_001",
    ...overrides,
  };
}

test("G5-F SettlementRun descriptor requires run lock evidence", () => {
  const descriptor = createSettlementG5SettlementRunDescriptor({
    tenant_id,
    period_id,
    settlement_run: settlementRun(),
    lock_test_attempted: true,
    locked_run_mutated: false,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.settlement_run_receipt.run_lock_tested, true);
  assert.equal(descriptor.settlement_run_receipt.settlement_run_persisted, false);
  assert.equal(descriptor.settlement_run_receipt.locked_run_mutated, false);

  const blocked = createSettlementG5SettlementRunDescriptor({
    tenant_id,
    period_id,
    settlement_run: settlementRun({ locked: false, lock_status: "open", locked_run_mutated: true }),
    lock_test_attempted: false,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("settlement_run_lock_required"));
  assert.ok(blocked.blocked_claims.includes("settlement_run_locked_mutation_blocked"));
});

test("G5-F OriginationCredit descriptor requires allocation sum evidence", () => {
  const descriptor = createSettlementG5OriginationCreditDescriptor({
    tenant_id,
    matter_id,
    origination_credits: [originationCredit({ allocation_percent: 60 }), originationCredit({ partner_id: "partner_two", allocation_percent: 40 })],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.allocation_percent_total, 100);
  assert.equal(descriptor.origination_credit_receipt.allocation_sum_tested, true);
  assert.equal(descriptor.origination_credit_receipt.origination_credit_persisted, false);

  const blocked = createSettlementG5OriginationCreditDescriptor({
    tenant_id,
    matter_id,
    origination_credits: [originationCredit({ partner_id: "", allocation_percent: 90 })],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("origination_credit_partner_required"));
  assert.ok(blocked.blocked_claims.includes("origination_credit_allocation_sum_required"));
});

test("G5-F WorkingCredit descriptor requires role allocation evidence", () => {
  const descriptor = createSettlementG5WorkingCreditDescriptor({
    tenant_id,
    matter_id,
    working_credits: [workingCredit()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.working_credit_receipt.role_allocation_tested, true);
  assert.equal(descriptor.working_credit_receipt.working_credit_persisted, false);

  const blocked = createSettlementG5WorkingCreditDescriptor({
    tenant_id,
    matter_id,
    working_credits: [workingCredit({ role: "viewer", allocation_percent: 0 })],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("working_credit_invalid_role_blocked"));
  assert.ok(blocked.blocked_claims.includes("working_credit_role_allocation_required"));
});

test("G5-F approval workflow descriptor blocks direct edits to posted runs", () => {
  const descriptor = createSettlementG5ApprovalWorkflowDescriptor({
    tenant_id,
    settlement_run: settlementRun(),
    approval: approval(),
    posted_run_direct_edit_attempt: true,
    posted_run_mutated: false,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.approval_workflow_receipt.direct_edit_blocked_tested, true);
  assert.equal(descriptor.approval_workflow_receipt.posted_run_mutated, false);
  assert.equal(descriptor.approval_workflow_receipt.approval_persisted, false);

  const blocked = createSettlementG5ApprovalWorkflowDescriptor({
    tenant_id,
    settlement_run: settlementRun({ status: "draft" }),
    approval: approval({ approval_status: "requested", approver_id: "" }),
    posted_run_direct_edit_attempt: true,
    posted_run_mutated: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("settlement_approval_posted_run_required"));
  assert.ok(blocked.blocked_claims.includes("settlement_approval_required"));
  assert.ok(blocked.blocked_claims.includes("posted_settlement_run_direct_edit_blocked"));
});

test("G5-F Finance UI descriptor masks settlement allocations for restricted roles", () => {
  const descriptor = createSettlementG5FinanceUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    ui_state: {
      allocation_masked: true,
      payout_masked: true,
      allocation_visible: false,
      payout_visible: false,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.finance_ui_receipt.permission_masking_tested, true);
  assert.equal(descriptor.finance_ui_receipt.restricted_details_visible, false);
  assert.equal(descriptor.finance_ui_receipt.raw_settlement_payload_loaded, false);

  const blocked = createSettlementG5FinanceUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    ui_state: {
      allocation_masked: false,
      payout_masked: false,
      allocation_visible: true,
      payout_visible: true,
      raw_settlement_payload_loaded: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("finance_ui_permission_masking_required"));
  assert.ok(blocked.blocked_claims.includes("finance_ui_unauthorized_allocation_leak_blocked"));
  assert.ok(blocked.blocked_claims.includes("finance_ui_sensitive_payload_leak_blocked"));
});

test("G5-F closeout descriptor summarizes settlement finance evidence", () => {
  const run = createSettlementG5SettlementRunDescriptor({
    tenant_id,
    period_id,
    settlement_run: settlementRun(),
    lock_test_attempted: true,
    locked_run_mutated: false,
  });
  const origination = createSettlementG5OriginationCreditDescriptor({
    tenant_id,
    matter_id,
    origination_credits: [originationCredit()],
  });
  const working = createSettlementG5WorkingCreditDescriptor({
    tenant_id,
    matter_id,
    working_credits: [workingCredit()],
  });
  const approvalDescriptor = createSettlementG5ApprovalWorkflowDescriptor({
    tenant_id,
    settlement_run: settlementRun(),
    approval: approval(),
    posted_run_direct_edit_attempt: true,
    posted_run_mutated: false,
  });
  const financeUi = createSettlementG5FinanceUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    ui_state: {
      allocation_masked: true,
      payout_masked: true,
      allocation_visible: false,
      payout_visible: false,
    },
  });

  const closeout = createSettlementG5FinanceCloseoutDescriptor({
    tenant_id,
    descriptors: [run, origination, working, approvalDescriptor, financeUi],
    invoice_to_payment_evidence: {
      matter_id,
      invoice_id: "invoice_g5f_001",
      payment_id: "payment_g5f_001",
      settlement_run_id,
    },
    command_evidence: { commands_passed: true },
    pr_state: { is_draft: true },
    upstream_disposition: "G1/G2/G3/G4/G5-A-E evidence remains draft-review gated",
    human_review_disposition: "pending_human_review",
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G5-W08-T009",
    "LFOS-G5-W08-T010",
    "LFOS-G5-W08-T011",
    "LFOS-G5-W08-T012",
    "LFOS-G5-W08-T013",
    "LFOS-G5-W08-T014",
  ]);
  assert.equal(closeout.run_lock_tested, true);
  assert.equal(closeout.allocation_sum_tested, true);
  assert.equal(closeout.role_allocation_tested, true);
  assert.equal(closeout.posted_run_direct_edit_blocked_tested, true);
  assert.equal(closeout.permission_masking_tested, true);
  assert.equal(closeout.invoice_to_payment_evidence_recorded, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(SETTLEMENT_G5F_TUW_COVERAGE.length, 6);
});
