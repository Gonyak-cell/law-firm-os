export const ANALYTICS_G6A_TUW_COVERAGE = Object.freeze([
  "LFOS-G6-W09-T001",
  "LFOS-G6-W09-T002",
  "LFOS-G6-W09-T003",
  "LFOS-G6-W09-T004",
  "LFOS-G6-W09-T005",
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

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueOf(item, fields) {
  for (const field of fields) {
    const value = asNumber(item?.[field]);
    if (value !== null) return value;
  }
  return null;
}

function totalFor(items, fields) {
  return items.reduce((total, item) => {
    const value = valueOf(item, fields);
    return value === null ? total : total + value;
  }, 0);
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
    dispatches_analytics_runtime: false,
    dispatches_matter_pnl_runtime: false,
    dispatches_wip_runtime: false,
    dispatches_forecast_runtime: false,
    mutates_source_object: false,
    writes_billing_source: false,
    writes_finance_source: false,
    writes_matter_source: false,
    writes_party_source: false,
    g6_runtime_readiness_claim: "open",
    analytics_runtime_readiness_claim: "open",
  };
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function sourceMutationRequested(request, nested = {}) {
  return (
    request.source_object_mutated === true ||
    request.mutates_source_object === true ||
    nested.source_object_mutated === true ||
    nested.mutates_source_object === true ||
    nested.writes_product_state === true
  );
}

export function createAnalyticsG6AnalyticsEventDescriptor(request = {}) {
  const analyticsEvent = request.analytics_event ?? {};
  const sourceRefs = freezeArray(request.source_refs);
  const runtimeDispatch =
    request.dispatched_runtime === true ||
    analyticsEvent.dispatched_runtime === true ||
    analyticsEvent.dispatches_analytics_runtime === true;
  const sourceMutation = sourceMutationRequested(request, analyticsEvent);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "analytics_event", "source_refs"], request).length > 0) {
    blockedClaims.push("analytics_event_required_context_missing");
  }
  if (!analyticsEvent.analytics_event_id) blockedClaims.push("analytics_event_id_required");
  if (!analyticsEvent.event_type) blockedClaims.push("analytics_event_type_required");
  if (!analyticsEvent.occurred_at) blockedClaims.push("analytics_event_occurred_at_required");
  if (sourceRefs.length === 0) blockedClaims.push("analytics_event_source_ref_required");
  if (analyticsEvent.matter_id && analyticsEvent.matter_id !== request.matter_id) {
    blockedClaims.push("analytics_event_matter_trace_mismatch");
  }
  if (analyticsEvent.tenant_id && analyticsEvent.tenant_id !== request.tenant_id) {
    blockedClaims.push("analytics_event_cross_tenant_blocked");
  }
  if (sourceMutation) blockedClaims.push("analytics_event_no_source_mutation_required");
  if (runtimeDispatch) blockedClaims.push("analytics_event_runtime_dispatch_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T001"),
    descriptor_type: "analytics_g6_analytics_event_descriptor",
    tenant_id: request.tenant_id ?? analyticsEvent.tenant_id ?? null,
    matter_id: request.matter_id ?? analyticsEvent.matter_id ?? null,
    analytics_event_id: analyticsEvent.analytics_event_id ?? null,
    event_type: analyticsEvent.event_type ?? null,
    source_ref_count: sourceRefs.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    analytics_event_receipt: freezeRecord({
      no_source_mutation_tested: sourceRefs.length > 0 && !sourceMutation,
      analytics_event_persisted: false,
      source_object_mutated: sourceMutation,
      runtime_dispatched: runtimeDispatch,
      audit_event_written: false,
    }),
  });
}

export function createAnalyticsG6MatterProfitabilityDescriptor(request = {}) {
  const timeEntries = freezeArray(request.time_entries);
  const invoices = freezeArray(request.invoices);
  const payments = freezeArray(request.payments);
  const timeValue = totalFor(timeEntries, ["standard_value", "amount", "value"]);
  const invoiceTotal = totalFor(invoices, ["invoice_total", "amount", "total"]);
  const paymentTotal = totalFor(payments, ["payment_total", "amount", "total"]);
  const sourceMutation = sourceMutationRequested(request, request.read_model ?? {});
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "time_entries", "invoices", "payments"], request).length > 0) {
    blockedClaims.push("matter_profitability_required_context_missing");
  }
  if (timeEntries.length === 0 || invoices.length === 0 || payments.length === 0) {
    blockedClaims.push("matter_profitability_join_evidence_required");
  }
  if ([...timeEntries, ...invoices, ...payments].some((item) => item?.matter_id && item.matter_id !== request.matter_id)) {
    blockedClaims.push("matter_profitability_matter_trace_mismatch");
  }
  if ([...timeEntries, ...invoices, ...payments].some((item) => item?.tenant_id && item.tenant_id !== request.tenant_id)) {
    blockedClaims.push("matter_profitability_cross_tenant_blocked");
  }
  if (sourceMutation) blockedClaims.push("matter_profitability_source_mutation_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T002"),
    descriptor_type: "analytics_g6_matter_profitability_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    time_entry_count: timeEntries.length,
    invoice_count: invoices.length,
    payment_count: payments.length,
    time_value: timeValue,
    invoice_total: invoiceTotal,
    payment_total: paymentTotal,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    matter_profitability_receipt: freezeRecord({
      invoice_payment_time_join_tested: timeEntries.length > 0 && invoices.length > 0 && payments.length > 0,
      read_model_persisted: false,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6ClientProfitabilityDescriptor(request = {}) {
  const rows = freezeArray(request.matter_profitability_rows);
  const sourceMutation = sourceMutationRequested(request, request.read_model ?? {});
  const createdClientIdentity = request.created_client_identity === true || request.read_model?.created_client_identity === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "client_group_id", "matter_profitability_rows"], request).length > 0) {
    blockedClaims.push("client_profitability_required_context_missing");
  }
  if (rows.length === 0) blockedClaims.push("client_profitability_client_group_aggregation_required");
  if (rows.some((row) => row?.client_group_id && row.client_group_id !== request.client_group_id)) {
    blockedClaims.push("client_profitability_client_group_trace_mismatch");
  }
  if (rows.some((row) => row?.tenant_id && row.tenant_id !== request.tenant_id)) {
    blockedClaims.push("client_profitability_cross_tenant_blocked");
  }
  if (createdClientIdentity) blockedClaims.push("client_profitability_duplicate_client_identity_blocked");
  if (sourceMutation) blockedClaims.push("client_profitability_source_mutation_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T003"),
    descriptor_type: "analytics_g6_client_profitability_descriptor",
    tenant_id: request.tenant_id ?? null,
    client_group_id: request.client_group_id ?? null,
    row_count: rows.length,
    profitability_total: totalFor(rows, ["profitability_amount", "profit", "amount"]),
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    client_profitability_receipt: freezeRecord({
      client_group_aggregation_tested: rows.length > 0,
      duplicate_client_identity_created: createdClientIdentity,
      read_model_persisted: false,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6UtilizationMetricDescriptor(request = {}) {
  const timeEntries = freezeArray(request.time_entries);
  const capacity = request.capacity ?? {};
  const denominatorHours = asNumber(capacity.denominator_hours);
  const billableHours = totalFor(timeEntries, ["billable_hours", "hours"]);
  const sourceMutation = sourceMutationRequested(request, request.metric ?? {});
  const usedHrPayrollData = request.used_hr_payroll_data === true || request.metric?.used_hr_payroll_data === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "period_id", "capacity", "time_entries"], request).length > 0) {
    blockedClaims.push("utilization_required_context_missing");
  }
  if (denominatorHours === null || denominatorHours <= 0) blockedClaims.push("utilization_capacity_denominator_required");
  if (timeEntries.length === 0) blockedClaims.push("utilization_time_entries_required");
  if (timeEntries.some((entry) => entry?.actor_id && entry.actor_id !== request.actor_id)) {
    blockedClaims.push("utilization_actor_trace_mismatch");
  }
  if (usedHrPayrollData) blockedClaims.push("utilization_hrx_boundary_blocked");
  if (sourceMutation) blockedClaims.push("utilization_source_mutation_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T004"),
    descriptor_type: "analytics_g6_utilization_metric_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    period_id: request.period_id ?? null,
    denominator_hours: denominatorHours,
    billable_hours: billableHours,
    utilization_rate: denominatorHours && denominatorHours > 0 ? billableHours / denominatorHours : null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    utilization_receipt: freezeRecord({
      capacity_denominator_tested: denominatorHours !== null && denominatorHours > 0,
      metric_persisted: false,
      source_objects_mutated: sourceMutation,
      used_hr_payroll_data: usedHrPayrollData,
    }),
  });
}

export function createAnalyticsG6RealizationMetricDescriptor(request = {}) {
  const billedItems = freezeArray(request.billed_items);
  const standardValueItems = freezeArray(request.standard_value_items);
  const billedTotal = totalFor(billedItems, ["billed_value", "amount", "total"]);
  const standardTotal = totalFor(standardValueItems, ["standard_value", "amount", "total"]);
  const sourceMutation = sourceMutationRequested(request, request.metric ?? {});
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "billed_items", "standard_value_items"], request).length > 0) {
    blockedClaims.push("realization_required_context_missing");
  }
  if (billedItems.length === 0 || standardValueItems.length === 0 || standardTotal <= 0) {
    blockedClaims.push("realization_billed_standard_value_required");
  }
  if ([...billedItems, ...standardValueItems].some((item) => item?.matter_id && item.matter_id !== request.matter_id)) {
    blockedClaims.push("realization_matter_trace_mismatch");
  }
  if ([...billedItems, ...standardValueItems].some((item) => item?.tenant_id && item.tenant_id !== request.tenant_id)) {
    blockedClaims.push("realization_cross_tenant_blocked");
  }
  if (sourceMutation) blockedClaims.push("realization_source_mutation_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T005"),
    descriptor_type: "analytics_g6_realization_metric_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    billed_total: billedTotal,
    standard_total: standardTotal,
    realization_rate: standardTotal > 0 ? billedTotal / standardTotal : null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    realization_receipt: freezeRecord({
      billed_vs_standard_value_tested: billedItems.length > 0 && standardValueItems.length > 0 && standardTotal > 0,
      metric_persisted: false,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6AReadModelFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of ANALYTICS_G6A_TUW_COVERAGE) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g6_analytics_read_model_closeout_evidence_required");
  }
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g6_analytics_read_model_blocked_descriptor_present");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T001..LFOS-G6-W09-T005"),
    descriptor_type: "analytics_g6a_read_model_foundation_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G6-A",
    tuw_coverage: ANALYTICS_G6A_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    no_source_mutation_tested: descriptorTuws.has("LFOS-G6-W09-T001"),
    invoice_payment_time_join_tested: descriptorTuws.has("LFOS-G6-W09-T002"),
    client_group_aggregation_tested: descriptorTuws.has("LFOS-G6-W09-T003"),
    capacity_denominator_tested: descriptorTuws.has("LFOS-G6-W09-T004"),
    billed_vs_standard_value_tested: descriptorTuws.has("LFOS-G6-W09-T005"),
    g6_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      analytics_runtime_opened: false,
      draft_pr_self_merged: false,
    }),
  });
}
