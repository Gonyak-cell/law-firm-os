export const SETTLEMENT_G5F_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W08-T009",
  "LFOS-G5-W08-T010",
  "LFOS-G5-W08-T011",
  "LFOS-G5-W08-T012",
  "LFOS-G5-W08-T013",
  "LFOS-G5-W08-T014",
]);

const WORKING_CREDIT_ROLES = Object.freeze(["responsible_partner", "working_partner", "matter_manager"]);
const FINANCE_DETAIL_ROLES = Object.freeze(["finance_admin", "managing_partner", "settlement_admin"]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountTotal(items, field = "amount") {
  return items.reduce((total, item) => {
    const amount = asNumber(item?.[field]);
    return amount === null ? total : total + amount;
  }, 0);
}

function allocationTotal(items) {
  return items.reduce((total, item) => {
    const allocation = asNumber(item?.allocation_percent ?? item?.percent);
    return allocation === null ? total : total + allocation;
  }, 0);
}

function nearlyEqual(left, right) {
  return Math.abs(left - right) <= 0.0001;
}

function noWriteBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    dispatches_settlement_runtime: false,
    dispatches_origination_runtime: false,
    dispatches_working_credit_runtime: false,
    dispatches_allocation_runtime: false,
    dispatches_finance_ui_runtime: false,
    locks_settlement_run: false,
    posts_settlement_run: false,
    mutates_posted_settlement_run: false,
    creates_payout: false,
    g5_runtime_readiness_claim: "open",
    settlement_runtime_readiness_claim: "open",
  };
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

export function createSettlementG5SettlementRunDescriptor(request = {}) {
  const settlementRun = request.settlement_run ?? {};
  const locked = settlementRun.locked === true || settlementRun.lock_status === "locked";
  const lockTestAttempted =
    request.lock_test_attempted === true ||
    request.mutates_locked_run === true ||
    settlementRun.lock_test_attempted === true ||
    settlementRun.mutates_locked_run === true;
  const lockedRunMutated =
    request.locked_run_mutated === true ||
    request.mutates_locked_run_succeeded === true ||
    settlementRun.locked_run_mutated === true ||
    settlementRun.mutates_locked_run_succeeded === true;
  const runtimeDispatch =
    request.dispatched_runtime === true ||
    settlementRun.dispatched_runtime === true ||
    settlementRun.dispatches_settlement_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "period_id", "settlement_run"], request).length > 0) {
    blockedClaims.push("settlement_run_required_context_missing");
  }
  if (!settlementRun.settlement_run_id) blockedClaims.push("settlement_run_id_required");
  if (!settlementRun.period_id || settlementRun.period_id !== request.period_id) {
    blockedClaims.push("settlement_run_period_trace_required");
  }
  if (settlementRun.tenant_id && settlementRun.tenant_id !== request.tenant_id) {
    blockedClaims.push("settlement_run_cross_tenant_blocked");
  }
  if (!locked) blockedClaims.push("settlement_run_lock_required");
  if (!lockTestAttempted || lockedRunMutated) blockedClaims.push("settlement_run_locked_mutation_blocked");
  if (runtimeDispatch) blockedClaims.push("settlement_run_runtime_dispatch_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T009"),
    descriptor_type: "settlement_g5_settlement_run_descriptor",
    tenant_id: request.tenant_id ?? settlementRun.tenant_id ?? null,
    period_id: request.period_id ?? settlementRun.period_id ?? null,
    settlement_run_id: settlementRun.settlement_run_id ?? null,
    lock_status: settlementRun.lock_status ?? (locked ? "locked" : null),
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    settlement_run_receipt: freezeRecord({
      run_lock_tested: locked && lockTestAttempted && !lockedRunMutated,
      settlement_run_persisted: false,
      locked_run_mutated: lockedRunMutated,
      runtime_dispatched: runtimeDispatch,
      audit_event_written: false,
    }),
  });
}

export function createSettlementG5OriginationCreditDescriptor(request = {}) {
  const credits = freezeArray(request.origination_credits);
  const totalPercent = allocationTotal(credits);
  const runtimeDispatch =
    request.dispatched_runtime === true || credits.some((credit) => credit?.dispatched_runtime === true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "origination_credits"], request).length > 0) {
    blockedClaims.push("origination_credit_required_context_missing");
  }
  if (credits.length === 0) blockedClaims.push("origination_credit_required");
  if (credits.some((credit) => !credit?.partner_id)) blockedClaims.push("origination_credit_partner_required");
  if (!nearlyEqual(totalPercent, 100)) blockedClaims.push("origination_credit_allocation_sum_required");
  if (credits.some((credit) => credit?.matter_id && credit.matter_id !== request.matter_id)) {
    blockedClaims.push("origination_credit_matter_trace_mismatch");
  }
  if (credits.some((credit) => credit?.tenant_id && credit.tenant_id !== request.tenant_id)) {
    blockedClaims.push("origination_credit_cross_tenant_blocked");
  }
  if (runtimeDispatch) blockedClaims.push("origination_credit_runtime_dispatch_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T010"),
    descriptor_type: "settlement_g5_origination_credit_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    credit_count: credits.length,
    allocation_percent_total: totalPercent,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    origination_credit_receipt: freezeRecord({
      allocation_sum_tested: credits.length > 0 && nearlyEqual(totalPercent, 100),
      origination_credit_persisted: false,
      runtime_dispatched: runtimeDispatch,
      audit_event_written: false,
    }),
  });
}

export function createSettlementG5WorkingCreditDescriptor(request = {}) {
  const credits = freezeArray(request.working_credits);
  const totalPercent = allocationTotal(credits);
  const validRoles = new Set(WORKING_CREDIT_ROLES);
  const invalidRole = credits.some((credit) => !validRoles.has(credit?.role));
  const invalidAllocation = credits.some((credit) => {
    const allocation = asNumber(credit?.allocation_percent ?? credit?.percent ?? credit?.amount);
    return allocation === null || allocation <= 0;
  });
  const runtimeDispatch =
    request.dispatched_runtime === true || credits.some((credit) => credit?.dispatched_runtime === true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "working_credits"], request).length > 0) {
    blockedClaims.push("working_credit_required_context_missing");
  }
  if (credits.length === 0) blockedClaims.push("working_credit_role_allocation_required");
  if (invalidRole) blockedClaims.push("working_credit_invalid_role_blocked");
  if (invalidAllocation) blockedClaims.push("working_credit_role_allocation_required");
  if (totalPercent <= 0 || totalPercent > 100) blockedClaims.push("working_credit_allocation_sum_required");
  if (credits.some((credit) => credit?.matter_id && credit.matter_id !== request.matter_id)) {
    blockedClaims.push("working_credit_matter_trace_mismatch");
  }
  if (credits.some((credit) => credit?.tenant_id && credit.tenant_id !== request.tenant_id)) {
    blockedClaims.push("working_credit_cross_tenant_blocked");
  }
  if (runtimeDispatch) blockedClaims.push("working_credit_runtime_dispatch_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T011"),
    descriptor_type: "settlement_g5_working_credit_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    credit_count: credits.length,
    allocation_percent_total: totalPercent,
    allowed_roles: WORKING_CREDIT_ROLES,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    working_credit_receipt: freezeRecord({
      role_allocation_tested: credits.length > 0 && !invalidRole && !invalidAllocation && totalPercent > 0 && totalPercent <= 100,
      working_credit_persisted: false,
      runtime_dispatched: runtimeDispatch,
      audit_event_written: false,
    }),
  });
}

export function createSettlementG5ApprovalWorkflowDescriptor(request = {}) {
  const settlementRun = request.settlement_run ?? {};
  const approval = request.approval ?? {};
  const status = settlementRun.status ?? settlementRun.run_status ?? null;
  const posted = status === "posted" || settlementRun.posted === true;
  const directEditAttempt =
    request.posted_run_direct_edit_attempt === true ||
    request.direct_edit_attempt === true ||
    approval.posted_run_direct_edit_attempt === true;
  const postedRunMutated =
    request.posted_run_mutated === true ||
    request.direct_edit_succeeded === true ||
    settlementRun.posted_run_mutated === true ||
    approval.posted_run_mutated === true;
  const runtimeDispatch =
    request.dispatched_runtime === true ||
    approval.dispatched_runtime === true ||
    settlementRun.dispatches_settlement_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "settlement_run", "approval"], request).length > 0) {
    blockedClaims.push("settlement_approval_required_context_missing");
  }
  if (!settlementRun.settlement_run_id) blockedClaims.push("settlement_approval_run_required");
  if (!posted) blockedClaims.push("settlement_approval_posted_run_required");
  if (approval.approval_status !== "approved" || !approval.approver_id) {
    blockedClaims.push("settlement_approval_required");
  }
  if (!directEditAttempt || postedRunMutated) {
    blockedClaims.push("posted_settlement_run_direct_edit_blocked");
  }
  if (settlementRun.tenant_id && settlementRun.tenant_id !== request.tenant_id) {
    blockedClaims.push("settlement_approval_cross_tenant_blocked");
  }
  if (approval.tenant_id && approval.tenant_id !== request.tenant_id) {
    blockedClaims.push("settlement_approval_cross_tenant_blocked");
  }
  if (runtimeDispatch) blockedClaims.push("settlement_approval_runtime_dispatch_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T012"),
    descriptor_type: "settlement_g5_approval_workflow_descriptor",
    tenant_id: request.tenant_id ?? settlementRun.tenant_id ?? approval.tenant_id ?? null,
    settlement_run_id: settlementRun.settlement_run_id ?? approval.settlement_run_id ?? null,
    approval_status: approval.approval_status ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    approval_workflow_receipt: freezeRecord({
      direct_edit_blocked_tested: posted && directEditAttempt && !postedRunMutated,
      posted_run_mutated: postedRunMutated,
      approval_persisted: false,
      runtime_dispatched: runtimeDispatch,
      audit_event_written: false,
    }),
  });
}

export function createSettlementG5FinanceUiDescriptor(request = {}) {
  const uiState = request.ui_state ?? {};
  const actorRole = request.actor_role ?? uiState.actor_role ?? null;
  const allowedDetailRoles = new Set(FINANCE_DETAIL_ROLES);
  const roleCanSeeDetails = allowedDetailRoles.has(actorRole);
  const allocationMasked = uiState.allocation_masked === true;
  const payoutMasked = uiState.payout_masked === true;
  const restrictedDetailVisible =
    roleCanSeeDetails === false &&
    (uiState.allocation_visible === true ||
      uiState.payout_visible === true ||
      uiState.payment_detail_visible === true ||
      uiState.export_payload_visible === true ||
      uiState.role_restricted_details_visible === true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_role", "ui_state"], { ...request, actor_role: actorRole }).length > 0) {
    blockedClaims.push("finance_ui_required_context_missing");
  }
  if (!roleCanSeeDetails && (!allocationMasked || !payoutMasked)) {
    blockedClaims.push("finance_ui_permission_masking_required");
  }
  if (restrictedDetailVisible) blockedClaims.push("finance_ui_unauthorized_allocation_leak_blocked");
  if (uiState.raw_settlement_payload_loaded === true) blockedClaims.push("finance_ui_sensitive_payload_leak_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T013"),
    descriptor_type: "settlement_g5_finance_ui_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_role: actorRole,
    role_can_see_details: roleCanSeeDetails,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    finance_ui_receipt: freezeRecord({
      permission_masking_tested: !roleCanSeeDetails && allocationMasked && payoutMasked && !restrictedDetailVisible,
      restricted_details_visible: restrictedDetailVisible,
      raw_settlement_payload_loaded: uiState.raw_settlement_payload_loaded === true,
      ui_state_persisted: false,
    }),
  });
}

export function createSettlementG5FinanceCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const invoiceToPaymentEvidence = request.invoice_to_payment_evidence ?? {};
  const commandEvidence = request.command_evidence ?? {};
  const prState = request.pr_state ?? {};
  const blockedClaims = [];

  for (const tuwId of SETTLEMENT_G5F_TUW_COVERAGE.slice(0, 5)) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g5_finance_closeout_evidence_required");
  }
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g5_finance_closeout_blocked_descriptor_present");
  }
  if (
    !invoiceToPaymentEvidence.invoice_id ||
    !invoiceToPaymentEvidence.payment_id ||
    !invoiceToPaymentEvidence.settlement_run_id ||
    !invoiceToPaymentEvidence.matter_id
  ) {
    blockedClaims.push("g5_finance_invoice_to_payment_evidence_required");
  }
  if (commandEvidence.commands_passed !== true || prState.is_draft !== true || !request.upstream_disposition) {
    blockedClaims.push("g5_finance_closeout_evidence_required");
  }
  if (!request.human_review_disposition) blockedClaims.push("g5_finance_closeout_evidence_required");

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T009..LFOS-G5-W08-T014"),
    descriptor_type: "settlement_g5_finance_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G5-F",
    tuw_coverage: SETTLEMENT_G5F_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    run_lock_tested: descriptorTuws.has("LFOS-G5-W08-T009"),
    allocation_sum_tested: descriptorTuws.has("LFOS-G5-W08-T010"),
    role_allocation_tested: descriptorTuws.has("LFOS-G5-W08-T011"),
    posted_run_direct_edit_blocked_tested: descriptorTuws.has("LFOS-G5-W08-T012"),
    permission_masking_tested: descriptorTuws.has("LFOS-G5-W08-T013"),
    invoice_to_payment_evidence_recorded:
      Boolean(invoiceToPaymentEvidence.invoice_id) &&
      Boolean(invoiceToPaymentEvidence.payment_id) &&
      Boolean(invoiceToPaymentEvidence.settlement_run_id),
    g5_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      settlement_runtime_opened: false,
      draft_pr_self_merged: false,
    }),
  });
}
