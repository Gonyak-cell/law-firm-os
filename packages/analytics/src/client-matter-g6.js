export const ANALYTICS_G6A_TUW_COVERAGE = Object.freeze([
  "LFOS-G6-W09-T001",
  "LFOS-G6-W09-T002",
  "LFOS-G6-W09-T003",
  "LFOS-G6-W09-T004",
  "LFOS-G6-W09-T005",
]);

export const ANALYTICS_G6B_TUW_COVERAGE = Object.freeze([
  "LFOS-G6-W09-T006",
  "LFOS-G6-W09-T007",
  "LFOS-G6-W09-T008",
  "LFOS-G6-W09-T009",
  "LFOS-G6-W09-T010",
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

function hasPermission(permissions, expected) {
  return freezeArray(permissions).includes(expected);
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

export function createAnalyticsG6ARAgingDashboardDescriptor(request = {}) {
  const rows = freezeArray(request.ar_aging_rows);
  const sourceMutation = sourceMutationRequested(request, request.dashboard ?? {});
  const runtimeDispatch = request.dispatched_runtime === true || request.dashboard?.dispatched_runtime === true;
  const financePermissionTested = hasPermission(request.permissions, "finance:ar:read");
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "permissions", "ar_aging_rows"], request).length > 0) {
    blockedClaims.push("ar_aging_required_context_missing");
  }
  if (!financePermissionTested) blockedClaims.push("ar_aging_finance_permission_required");
  if (rows.length === 0) blockedClaims.push("ar_aging_read_model_rows_required");
  if (rows.some((row) => row?.tenant_id && row.tenant_id !== request.tenant_id)) {
    blockedClaims.push("ar_aging_cross_tenant_blocked");
  }
  if (sourceMutation) blockedClaims.push("ar_aging_source_mutation_blocked");
  if (runtimeDispatch) blockedClaims.push("ar_aging_dashboard_runtime_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T006"),
    descriptor_type: "analytics_g6_ar_aging_dashboard_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    row_count: rows.length,
    overdue_total: totalFor(rows, ["overdue_amount", "amount", "total"]),
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    ar_aging_receipt: freezeRecord({
      finance_permission_tested: financePermissionTested,
      dashboard_persisted: false,
      runtime_dispatched: runtimeDispatch,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6ClientHealthDashboardDescriptor(request = {}) {
  const rows = freezeArray(request.client_health_rows);
  const sourceMutation = sourceMutationRequested(request, request.dashboard ?? {});
  const omittedConflictDetails = request.conflict_detail_omitted === true || request.dashboard?.conflict_detail_omitted === true;
  const omittedMatterDetails = request.matter_detail_omitted === true || request.dashboard?.matter_detail_omitted === true;
  const exposedConflictDetails =
    request.exposed_conflict_detail === true ||
    request.dashboard?.exposed_conflict_detail === true ||
    rows.some((row) => row?.conflict_memo || row?.conflict_detail);
  const exposedMatterDetails =
    request.exposed_matter_detail === true ||
    request.dashboard?.exposed_matter_detail === true ||
    rows.some((row) => row?.internal_matter_detail || row?.hidden_matter_detail);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "client_group_id", "client_health_rows"], request).length > 0) {
    blockedClaims.push("client_health_required_context_missing");
  }
  if (rows.length === 0 || !omittedConflictDetails || !omittedMatterDetails) {
    blockedClaims.push("client_health_conflict_matter_detail_omission_required");
  }
  if (rows.some((row) => row?.client_group_id && row.client_group_id !== request.client_group_id)) {
    blockedClaims.push("client_health_client_group_trace_mismatch");
  }
  if (rows.some((row) => row?.tenant_id && row.tenant_id !== request.tenant_id)) {
    blockedClaims.push("client_health_cross_tenant_blocked");
  }
  if (exposedConflictDetails) blockedClaims.push("client_health_conflict_detail_exposure_blocked");
  if (exposedMatterDetails) blockedClaims.push("client_health_matter_detail_exposure_blocked");
  if (sourceMutation) blockedClaims.push("client_health_source_mutation_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T007"),
    descriptor_type: "analytics_g6_client_health_dashboard_descriptor",
    tenant_id: request.tenant_id ?? null,
    client_group_id: request.client_group_id ?? null,
    row_count: rows.length,
    health_score_average: rows.length > 0 ? totalFor(rows, ["health_score", "score"]) / rows.length : null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    client_health_receipt: freezeRecord({
      conflict_detail_omission_tested: omittedConflictDetails,
      matter_detail_omission_tested: omittedMatterDetails,
      conflict_detail_exposed: exposedConflictDetails,
      matter_detail_exposed: exposedMatterDetails,
      dashboard_persisted: false,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6PracticePnlDashboardDescriptor(request = {}) {
  const rows = freezeArray(request.practice_pnl_rows);
  const sourceMutation = sourceMutationRequested(request, request.dashboard ?? {});
  const roleVisibilityTested = hasPermission(request.permissions, "analytics:practice-pnl:read") && request.role_visibility_tested === true;
  const unauthorizedVisibility =
    request.unauthorized_visibility === true ||
    request.dashboard?.unauthorized_visibility === true ||
    rows.some((row) => row?.visible_to_role && row.visible_to_role !== request.role_id);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "practice_id", "role_id", "permissions", "practice_pnl_rows"], request).length > 0) {
    blockedClaims.push("practice_pnl_required_context_missing");
  }
  if (rows.length === 0 || !roleVisibilityTested) blockedClaims.push("practice_pnl_role_visibility_required");
  if (rows.some((row) => row?.practice_id && row.practice_id !== request.practice_id)) {
    blockedClaims.push("practice_pnl_practice_trace_mismatch");
  }
  if (rows.some((row) => row?.tenant_id && row.tenant_id !== request.tenant_id)) {
    blockedClaims.push("practice_pnl_cross_tenant_blocked");
  }
  if (unauthorizedVisibility) blockedClaims.push("practice_pnl_unauthorized_visibility_blocked");
  if (sourceMutation) blockedClaims.push("practice_pnl_source_mutation_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T008"),
    descriptor_type: "analytics_g6_practice_pnl_dashboard_descriptor",
    tenant_id: request.tenant_id ?? null,
    practice_id: request.practice_id ?? null,
    role_id: request.role_id ?? null,
    row_count: rows.length,
    pnl_total: totalFor(rows, ["pnl_amount", "profit", "amount"]),
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    practice_pnl_receipt: freezeRecord({
      role_visibility_tested: roleVisibilityTested,
      unauthorized_visibility_detected: unauthorizedVisibility,
      dashboard_persisted: false,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6AnalyticsExportControlDescriptor(request = {}) {
  const rows = freezeArray(request.export_rows);
  const readModelRefs = freezeArray(request.read_model_refs);
  const auditReceipt = request.audit_receipt ?? {};
  const sourceMutation = sourceMutationRequested(request, request.export_request ?? {});
  const maskingTested = request.masking_tested === true || request.export_request?.masking_tested === true;
  const tenantScoped = request.tenant_scoped === true || request.export_request?.tenant_scoped === true;
  const runtimeExport = request.executed_export_runtime === true || request.export_request?.executed_export_runtime === true;
  const unmaskedSensitiveData =
    request.unmasked_sensitive_data === true ||
    request.export_request?.unmasked_sensitive_data === true ||
    rows.some((row) => row?.privileged_text || row?.personal_identifier || row?.unmasked_sensitive_data);
  const auditBound = auditReceipt.audit_event_id && auditReceipt.tenant_id === request.tenant_id && auditReceipt.export_id;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "export_id", "read_model_refs", "export_rows", "audit_receipt"], request).length > 0) {
    blockedClaims.push("analytics_export_required_context_missing");
  }
  if (readModelRefs.length === 0 || rows.length === 0) blockedClaims.push("analytics_export_read_model_rows_required");
  if (!auditBound || !maskingTested) blockedClaims.push("analytics_export_audit_masking_required");
  if (!tenantScoped) blockedClaims.push("analytics_export_tenant_scope_required");
  if (rows.some((row) => row?.tenant_id && row.tenant_id !== request.tenant_id)) {
    blockedClaims.push("analytics_export_cross_tenant_blocked");
  }
  if (unmaskedSensitiveData) blockedClaims.push("analytics_export_unmasked_sensitive_data_blocked");
  if (sourceMutation) blockedClaims.push("analytics_export_source_mutation_blocked");
  if (runtimeExport) blockedClaims.push("analytics_export_runtime_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T009"),
    descriptor_type: "analytics_g6_analytics_export_control_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    export_id: request.export_id ?? null,
    read_model_ref_count: readModelRefs.length,
    row_count: rows.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    analytics_export_receipt: freezeRecord({
      export_audit_tested: Boolean(auditBound),
      masking_tested: maskingTested,
      tenant_scope_tested: tenantScoped,
      unmasked_sensitive_data_detected: unmaskedSensitiveData,
      export_runtime_executed: runtimeExport,
      source_objects_mutated: sourceMutation,
    }),
  });
}

export function createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of ANALYTICS_G6B_TUW_COVERAGE.slice(0, 4)) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g6_analytics_dashboard_export_closeout_evidence_required");
  }
  if (request.read_model_foundation_closed !== true) blockedClaims.push("g6_analytics_read_model_foundation_required");
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g6_analytics_dashboard_export_blocked_descriptor_present");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G6-W09-T006..LFOS-G6-W09-T010"),
    descriptor_type: "analytics_g6b_dashboard_export_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G6-B",
    tuw_coverage: ANALYTICS_G6B_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    finance_permission_tested: descriptorTuws.has("LFOS-G6-W09-T006"),
    conflict_matter_detail_omission_tested: descriptorTuws.has("LFOS-G6-W09-T007"),
    role_visibility_tested: descriptorTuws.has("LFOS-G6-W09-T008"),
    export_audit_masking_tested: descriptorTuws.has("LFOS-G6-W09-T009"),
    read_model_only_evidence_tested: request.read_model_foundation_closed === true,
    g6_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      analytics_runtime_opened: false,
      dashboards_persisted: false,
      export_runtime_executed: false,
      draft_pr_self_merged: false,
    }),
  });
}
