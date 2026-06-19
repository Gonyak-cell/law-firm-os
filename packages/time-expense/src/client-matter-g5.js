export const TIME_EXPENSE_G5A_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W07-T001",
  "LFOS-G5-W07-T002",
  "LFOS-G5-W07-T003",
  "LFOS-G5-W07-T004",
  "LFOS-G5-W07-T005",
  "LFOS-G5-W07-T006",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function hasBoolean(value) {
  return typeof value === "boolean";
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateTime(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
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
    executes_time_entry_runtime: false,
    executes_rate_card_runtime: false,
    executes_expense_runtime: false,
    executes_disbursement_runtime: false,
    calculates_invoice: false,
    posts_gl_entries: false,
    exposes_billing_amount_detail_to_unauthorized_actor: false,
    g5_runtime_readiness_claim: "open",
    revenue_runtime_readiness_claim: "open",
  };
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function actionsInOrder(events, actions) {
  let cursor = 0;
  for (const event of events) {
    if (event?.action === actions[cursor]) cursor += 1;
    if (cursor === actions.length) return true;
  }
  return false;
}

export function createTimeExpenseG5TimeEntryDescriptor(request = {}) {
  const timeEntry = request.time_entry ?? {};
  const blockedClaims = [];
  const entryActor = timeEntry.actor_id ?? timeEntry.timekeeper_actor_id;
  const duration = asNumber(timeEntry.duration_minutes);

  if (missingFields(["tenant_id", "actor_id", "time_entry"], request).length > 0) {
    blockedClaims.push("time_entry_required_context_missing");
  }
  if (!timeEntry.matter_id) blockedClaims.push("time_entry_matter_required");
  if (!entryActor) blockedClaims.push("time_entry_actor_required");
  if (!timeEntry.role_id) blockedClaims.push("time_entry_role_required");
  if (!timeEntry.work_date) blockedClaims.push("time_entry_work_date_required");
  if (!timeEntry.narrative) blockedClaims.push("time_entry_narrative_required");
  if (!timeEntry.status) blockedClaims.push("time_entry_status_required");
  if (duration === null) blockedClaims.push("time_entry_duration_required");
  if (duration !== null && duration <= 0) blockedClaims.push("time_entry_non_positive_duration_blocked");
  if (!hasBoolean(timeEntry.billable)) blockedClaims.push("time_entry_billable_flag_required");
  if (request.matter_id && timeEntry.matter_id && request.matter_id !== timeEntry.matter_id) {
    blockedClaims.push("time_entry_matter_trace_mismatch");
  }
  if (request.tenant_id && timeEntry.tenant_id && request.tenant_id !== timeEntry.tenant_id) {
    blockedClaims.push("time_entry_cross_tenant_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T001"),
    descriptor_type: "time_expense_g5_time_entry_descriptor",
    tenant_id: request.tenant_id ?? timeEntry.tenant_id ?? null,
    actor_id: entryActor ?? request.actor_id ?? null,
    matter_id: request.matter_id ?? timeEntry.matter_id ?? null,
    time_entry_id: timeEntry.time_entry_id ?? null,
    status: timeEntry.status ?? null,
    billable: hasBoolean(timeEntry.billable) ? timeEntry.billable : null,
    duration_minutes: duration,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    required_field_coverage: freezeRecord({
      tenant: Boolean(request.tenant_id ?? timeEntry.tenant_id),
      actor: Boolean(entryActor),
      matter: Boolean(request.matter_id ?? timeEntry.matter_id),
      role: Boolean(timeEntry.role_id),
      work_date: Boolean(timeEntry.work_date),
      narrative: Boolean(timeEntry.narrative),
      status: Boolean(timeEntry.status),
      duration: duration !== null && duration > 0,
      billable_flag: hasBoolean(timeEntry.billable),
    }),
    time_entry_receipt: freezeRecord({
      matter_required_tested: true,
      time_entry_created: false,
      audit_event_written: false,
      permission_evaluated: false,
    }),
  });
}

export function createTimeExpenseG5RateCardDescriptor(request = {}) {
  const rateCard = request.rate_card ?? {};
  const roleRates = freezeArray(rateCard.role_rates);
  const blockedClaims = [];
  const effectiveFrom = dateTime(rateCard.effective_from);
  const effectiveTo = rateCard.effective_to ? dateTime(rateCard.effective_to) : null;

  if (missingFields(["tenant_id", "rate_card"], request).length > 0) {
    blockedClaims.push("rate_card_required_context_missing");
  }
  if (request.tenant_id && rateCard.tenant_id && request.tenant_id !== rateCard.tenant_id) {
    blockedClaims.push("rate_card_cross_tenant_blocked");
  }
  if (!rateCard.rate_card_id) blockedClaims.push("rate_card_id_required");
  if (!rateCard.currency) blockedClaims.push("rate_card_currency_required");
  if (!rateCard.effective_from) blockedClaims.push("rate_card_effective_from_required");
  if (rateCard.effective_from && effectiveFrom === null) blockedClaims.push("rate_card_effective_date_invalid");
  if (rateCard.effective_to && effectiveTo === null) blockedClaims.push("rate_card_effective_date_invalid");
  if (effectiveFrom !== null && effectiveTo !== null && effectiveFrom > effectiveTo) {
    blockedClaims.push("rate_card_effective_date_range_invalid");
  }
  if (roleRates.length === 0) blockedClaims.push("rate_card_role_rates_required");
  if (roleRates.some((rate) => !rate?.role_id)) blockedClaims.push("rate_card_role_id_required");
  if (roleRates.some((rate) => asNumber(rate?.hourly_rate) === null || asNumber(rate?.hourly_rate) <= 0)) {
    blockedClaims.push("rate_card_non_positive_rate_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T002"),
    descriptor_type: "time_expense_g5_rate_card_descriptor",
    tenant_id: request.tenant_id ?? rateCard.tenant_id ?? null,
    rate_card_id: rateCard.rate_card_id ?? null,
    currency: rateCard.currency ?? null,
    effective_from: rateCard.effective_from ?? null,
    effective_to: rateCard.effective_to ?? null,
    role_rate_count: roleRates.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    rate_card_receipt: freezeRecord({
      effective_date_tested: true,
      rate_card_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createTimeExpenseG5FeeArrangementDescriptor(request = {}) {
  const feeArrangement = request.fee_arrangement ?? {};
  const rateCard = request.rate_card ?? {};
  const overrides = freezeArray(feeArrangement.rate_overrides);
  const rateRoles = new Set(freezeArray(rateCard.role_rates).map((rate) => rate?.role_id).filter(Boolean));
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "fee_arrangement", "rate_card"], request).length > 0) {
    blockedClaims.push("fee_arrangement_required_context_missing");
  }
  if (!feeArrangement.matter_id && !request.matter_id) blockedClaims.push("fee_arrangement_matter_required");
  if (!feeArrangement.billing_profile_id) blockedClaims.push("fee_arrangement_billing_profile_required");
  if (!feeArrangement.rate_card_id || !rateCard.rate_card_id) blockedClaims.push("fee_arrangement_rate_card_required");
  if (feeArrangement.rate_card_id && rateCard.rate_card_id && feeArrangement.rate_card_id !== rateCard.rate_card_id) {
    blockedClaims.push("fee_arrangement_rate_card_trace_mismatch");
  }
  if (request.matter_id && feeArrangement.matter_id && request.matter_id !== feeArrangement.matter_id) {
    blockedClaims.push("fee_arrangement_matter_trace_mismatch");
  }
  if (request.tenant_id && feeArrangement.tenant_id && request.tenant_id !== feeArrangement.tenant_id) {
    blockedClaims.push("fee_arrangement_cross_tenant_blocked");
  }
  if (overrides.some((override) => override?.role_id && !rateRoles.has(override.role_id))) {
    blockedClaims.push("fee_arrangement_override_role_unknown");
  }
  if (overrides.some((override) => asNumber(override?.hourly_rate) === null || asNumber(override?.hourly_rate) <= 0)) {
    blockedClaims.push("fee_arrangement_non_positive_override_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T003"),
    descriptor_type: "time_expense_g5_fee_arrangement_descriptor",
    tenant_id: request.tenant_id ?? feeArrangement.tenant_id ?? null,
    matter_id: request.matter_id ?? feeArrangement.matter_id ?? null,
    fee_arrangement_id: feeArrangement.fee_arrangement_id ?? null,
    billing_profile_id: feeArrangement.billing_profile_id ?? null,
    rate_card_id: feeArrangement.rate_card_id ?? null,
    override_count: overrides.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    fee_arrangement_receipt: freezeRecord({
      rate_override_tested: true,
      billing_mapping_tested: true,
      fee_arrangement_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createTimeExpenseG5TimeEntryWorkflowDescriptor(request = {}) {
  const timeEntry = request.time_entry ?? {};
  const workflowEvents = freezeArray(request.workflow_events);
  const actions = new Set(workflowEvents.map((event) => event?.action));
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "time_entry", "workflow_events"], request).length > 0) {
    blockedClaims.push("time_entry_workflow_required_context_missing");
  }
  if (!actions.has("submit")) blockedClaims.push("time_entry_submit_action_required");
  if (!actions.has("approve")) blockedClaims.push("time_entry_approve_action_required");
  if (!actions.has("lock")) blockedClaims.push("time_entry_lock_action_required");
  if (workflowEvents.length > 0 && !actionsInOrder(workflowEvents, ["submit", "approve", "lock"])) {
    blockedClaims.push("time_entry_submit_approve_lock_order_required");
  }
  if (request.mutates_locked_entry === true || timeEntry.locked_mutation_attempted === true) {
    blockedClaims.push("time_entry_locked_mutation_blocked");
  }
  if (request.matter_id && timeEntry.matter_id && request.matter_id !== timeEntry.matter_id) {
    blockedClaims.push("time_entry_workflow_matter_trace_mismatch");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T004"),
    descriptor_type: "time_expense_g5_time_entry_workflow_descriptor",
    tenant_id: request.tenant_id ?? timeEntry.tenant_id ?? null,
    actor_id: request.actor_id ?? timeEntry.actor_id ?? null,
    matter_id: request.matter_id ?? timeEntry.matter_id ?? null,
    time_entry_id: timeEntry.time_entry_id ?? null,
    workflow_actions: freezeArray(workflowEvents.map((event) => event?.action).filter(Boolean)),
    submit_approve_lock_in_order: actionsInOrder(workflowEvents, ["submit", "approve", "lock"]),
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    workflow_receipt: freezeRecord({
      submit_approve_lock_tested: true,
      status_transition_written: false,
      runtime_lock_acquired: false,
      audit_event_written: false,
    }),
  });
}

export function createTimeExpenseG5ExpenseDescriptor(request = {}) {
  const expense = request.expense ?? {};
  const amount = asNumber(expense.amount);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "expense"], request).length > 0) {
    blockedClaims.push("expense_required_context_missing");
  }
  if (!expense.matter_id && !request.matter_id) blockedClaims.push("expense_matter_required");
  if (!expense.evidence_document_id) blockedClaims.push("expense_evidence_document_required");
  if (!expense.incurred_date) blockedClaims.push("expense_incurred_date_required");
  if (!expense.currency) blockedClaims.push("expense_currency_required");
  if (amount === null) blockedClaims.push("expense_amount_required");
  if (amount !== null && amount <= 0) blockedClaims.push("expense_non_positive_amount_blocked");
  if (!hasBoolean(expense.billable)) blockedClaims.push("expense_billable_flag_required");
  if (request.matter_id && expense.matter_id && request.matter_id !== expense.matter_id) {
    blockedClaims.push("expense_matter_trace_mismatch");
  }
  if (request.tenant_id && expense.tenant_id && request.tenant_id !== expense.tenant_id) {
    blockedClaims.push("expense_cross_tenant_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T005"),
    descriptor_type: "time_expense_g5_expense_descriptor",
    tenant_id: request.tenant_id ?? expense.tenant_id ?? null,
    actor_id: request.actor_id ?? expense.actor_id ?? null,
    matter_id: request.matter_id ?? expense.matter_id ?? null,
    expense_id: expense.expense_id ?? null,
    evidence_document_id: expense.evidence_document_id ?? null,
    billable: hasBoolean(expense.billable) ? expense.billable : null,
    amount,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    expense_receipt: freezeRecord({
      evidence_document_tested: true,
      expense_persisted: false,
      object_storage_read: false,
      audit_event_written: false,
    }),
  });
}

export function createTimeExpenseG5DisbursementDescriptor(request = {}) {
  const disbursement = request.disbursement ?? {};
  const expense = request.expense ?? {};
  const amount = asNumber(disbursement.amount);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "disbursement"], request).length > 0) {
    blockedClaims.push("disbursement_required_context_missing");
  }
  if (!disbursement.matter_id && !request.matter_id) blockedClaims.push("disbursement_matter_required");
  if (!disbursement.currency) blockedClaims.push("disbursement_currency_required");
  if (amount === null) blockedClaims.push("disbursement_amount_required");
  if (amount !== null && amount <= 0) blockedClaims.push("disbursement_non_positive_amount_blocked");
  if (!hasBoolean(disbursement.billable)) blockedClaims.push("disbursement_billable_flag_required");
  if (request.matter_id && disbursement.matter_id && request.matter_id !== disbursement.matter_id) {
    blockedClaims.push("disbursement_matter_trace_mismatch");
  }
  if (request.tenant_id && disbursement.tenant_id && request.tenant_id !== disbursement.tenant_id) {
    blockedClaims.push("disbursement_cross_tenant_blocked");
  }
  if (expense.expense_id && disbursement.expense_id && expense.expense_id !== disbursement.expense_id) {
    blockedClaims.push("disbursement_expense_trace_mismatch");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T006"),
    descriptor_type: "time_expense_g5_disbursement_descriptor",
    tenant_id: request.tenant_id ?? disbursement.tenant_id ?? null,
    actor_id: request.actor_id ?? disbursement.actor_id ?? null,
    matter_id: request.matter_id ?? disbursement.matter_id ?? null,
    disbursement_id: disbursement.disbursement_id ?? null,
    expense_id: disbursement.expense_id ?? null,
    billable: hasBoolean(disbursement.billable) ? disbursement.billable : null,
    amount,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    disbursement_receipt: freezeRecord({
      billable_flag_tested: true,
      disbursement_persisted: false,
      invoice_line_created: false,
      audit_event_written: false,
    }),
  });
}

export function createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of TIME_EXPENSE_G5A_TUW_COVERAGE) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g5_time_expense_closeout_evidence_required");
  }
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g5_time_expense_closeout_blocked_descriptor_present");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T001..LFOS-G5-W07-T006"),
    descriptor_type: "time_expense_g5a_time_expense_foundation_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G5-A",
    tuw_coverage: TIME_EXPENSE_G5A_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    time_entry_schema_tested: descriptorTuws.has("LFOS-G5-W07-T001"),
    rate_card_effective_date_tested: descriptorTuws.has("LFOS-G5-W07-T002"),
    fee_arrangement_rate_override_tested: descriptorTuws.has("LFOS-G5-W07-T003"),
    submit_approve_lock_tested: descriptorTuws.has("LFOS-G5-W07-T004"),
    expense_evidence_document_tested: descriptorTuws.has("LFOS-G5-W07-T005"),
    disbursement_billable_flag_tested: descriptorTuws.has("LFOS-G5-W07-T006"),
    g5_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      revenue_runtime_opened: false,
      draft_pr_self_merged: false,
    }),
  });
}
