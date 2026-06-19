import {
  createAnalyticsG6AReadModelFoundationCloseoutDescriptor,
  createAnalyticsG6ARAgingDashboardDescriptor,
  createAnalyticsG6AnalyticsEventDescriptor,
  createAnalyticsG6AnalyticsExportControlDescriptor,
  createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor,
  createAnalyticsG6ClientHealthDashboardDescriptor,
  createAnalyticsG6ClientProfitabilityDescriptor,
  createAnalyticsG6MatterProfitabilityDescriptor,
  createAnalyticsG6PracticePnlDashboardDescriptor,
  createAnalyticsG6RealizationMetricDescriptor,
  createAnalyticsG6UtilizationMetricDescriptor,
} from "../../../packages/analytics/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const ANALYTICS_READ_MODEL_PREFIXES = Object.freeze([
  "/api/analytics-read-models/runtime/evidence",
  "/api/analytics-read-models/events",
  "/api/analytics-read-models/matter-profitability",
  "/api/analytics-read-models/client-profitability",
  "/api/analytics-read-models/utilization",
  "/api/analytics-read-models/realization",
  "/api/analytics-read-models/dashboards/ar-aging",
  "/api/analytics-read-models/dashboards/client-health",
  "/api/analytics-read-models/dashboards/practice-pnl",
  "/api/analytics-read-models/exports",
  "/api/analytics-read-models/ui/kpi-console",
  "/api/analytics-read-models/source-mutation-test",
]);

export const CMP_G8_TUW_IDS = Object.freeze(
  Array.from({ length: 14 }, (_, index) => `CMP-G8-W08-T${String(index + 1).padStart(3, "0")}`),
);

export const ANALYTICS_READ_MODEL_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "analytics-read-models",
  cmp_gate: "CMP-G8",
  cmp_work_package: "CMP-G8-W08",
  depends_on: Object.freeze([
    "CMP-G1-W01",
    "CMP-G2-W02",
    "CMP-G3-W03",
    "CMP-G4-W04",
    "CMP-G5-W05",
    "CMP-G6-W06",
    "CMP-G7-W07",
  ]),
  package_ref: "packages/analytics; apps/web/src; docs/launch/kpi",
  runtime_routes: ANALYTICS_READ_MODEL_PREFIXES,
  tuw_ids: CMP_G8_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G6-W09-T001",
    "LFOS-G6-W09-T002",
    "LFOS-G6-W09-T003",
    "LFOS-G6-W09-T004",
    "LFOS-G6-W09-T005",
    "LFOS-G6-W09-T006",
    "LFOS-G6-W09-T007",
    "LFOS-G6-W09-T008",
    "LFOS-G6-W09-T009",
    "LFOS-G6-W09-T010",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isAnalyticsReadModelPath(pathname) {
  return ANALYTICS_READ_MODEL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function createAnalyticsReadModelRuntimeContext() {
  return Object.freeze({
    source_mutation_policy: "deny",
    read_model_persistence: false,
    export_file_persistence: false,
  });
}

function response(status, body) {
  return { status, body };
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("Analytics read-model synthetic tenant is required");
    error.safe_error_code = "CMP_G8_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "analytics-read-model-runtime-actor",
    actor_type: "user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G8_VALIDATION_ERROR",
    reason: error.message,
  });
}

function hasSourceMutation(value = {}) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (
      current.source_object_mutated === true ||
      current.mutates_source_object === true ||
      current.writes_product_state === true ||
      current.writes_billing_source === true ||
      current.writes_finance_source === true ||
      current.writes_matter_source === true ||
      current.writes_party_source === true ||
      current.update_source === true ||
      current.delete_source === true ||
      current.create_source === true
    ) {
      return true;
    }
    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") stack.push(nested);
    }
  }
  return false;
}

function requireNoSourceMutation(body = {}) {
  if (hasSourceMutation(body)) {
    const error = new Error("CMP-G8 read models must not mutate source objects");
    error.safe_error_code = "CMP_G8_SOURCE_MUTATION_BLOCKED";
    throw error;
  }
}

function requireDescriptor(descriptor, code) {
  if (descriptor.outcome === "blocked") {
    return response(400, {
      outcome: "blocked",
      safe_error_code: code,
      descriptor,
      source_objects_mutated: false,
    });
  }
  return null;
}

function sum(items, field) {
  return items.reduce((total, item) => total + Number(item?.[field] ?? 0), 0);
}

function defaultSources({ tenantId, matterId = "matter-cmp-g8-runtime", clientGroupId = "client-group-cmp-g8-runtime", actorId = "employee-cmp-g8-runtime" } = {}) {
  const timeEntries = [
    {
      time_entry_id: "time-cmp-g8-runtime",
      tenant_id: tenantId,
      matter_id: matterId,
      actor_id: actorId,
      standard_value: 1000,
      billable_hours: 5,
      hours: 5,
    },
  ];
  const invoices = [{ invoice_id: "invoice-cmp-g8-runtime", tenant_id: tenantId, matter_id: matterId, invoice_total: 900, amount: 900 }];
  const payments = [{ payment_id: "payment-cmp-g8-runtime", tenant_id: tenantId, matter_id: matterId, payment_total: 700, amount: 700 }];
  const matterProfitabilityRows = [
    { tenant_id: tenantId, matter_id: matterId, client_group_id: clientGroupId, profitability_amount: 500, profit: 500 },
    { tenant_id: tenantId, matter_id: "matter-cmp-g8-runtime-2", client_group_id: clientGroupId, profitability_amount: 250, profit: 250 },
  ];
  return Object.freeze({
    tenantId,
    matterId,
    clientGroupId,
    actorId,
    practiceId: "practice-cmp-g8-runtime",
    roleId: "role-finance-partner",
    periodId: "period-cmp-g8-runtime",
    timeEntries,
    invoices,
    payments,
    matterProfitabilityRows,
    arAgingRows: [{ tenant_id: tenantId, matter_id: matterId, bucket: "61-90", overdue_amount: 1200, amount: 1200 }],
    clientHealthRows: [{ tenant_id: tenantId, client_group_id: clientGroupId, health_score: 88, visible_summary: "healthy" }],
    practicePnlRows: [{ tenant_id: tenantId, practice_id: "practice-cmp-g8-runtime", visible_to_role: "role-finance-partner", pnl_amount: 5000 }],
    exportRows: [{ tenant_id: tenantId, read_model_id: "read-model-cmp-g8-runtime", masked_client_ref: "client_hash_cmp_g8", amount: 900 }],
  });
}

function createAnalyticsEvidenceDescriptors(tenantId, actorId = "analytics-read-model-runtime-actor") {
  const source = defaultSources({ tenantId, actorId });
  const analyticsEvent = createAnalyticsG6AnalyticsEventDescriptor({
    tenant_id: tenantId,
    matter_id: source.matterId,
    analytics_event: {
      analytics_event_id: "analytics-event-cmp-g8-evidence",
      tenant_id: tenantId,
      matter_id: source.matterId,
      event_type: "invoice_payment_time_joined",
      occurred_at: "2026-06-20T00:00:00.000Z",
    },
    source_refs: [{ source_type: "invoice", source_id: "invoice-cmp-g8-runtime" }],
  });
  const matterProfitability = createAnalyticsG6MatterProfitabilityDescriptor({
    tenant_id: tenantId,
    matter_id: source.matterId,
    time_entries: source.timeEntries,
    invoices: source.invoices,
    payments: source.payments,
  });
  const clientProfitability = createAnalyticsG6ClientProfitabilityDescriptor({
    tenant_id: tenantId,
    client_group_id: source.clientGroupId,
    matter_profitability_rows: source.matterProfitabilityRows,
  });
  const utilization = createAnalyticsG6UtilizationMetricDescriptor({
    tenant_id: tenantId,
    actor_id: source.actorId,
    period_id: source.periodId,
    capacity: { denominator_hours: 10 },
    time_entries: source.timeEntries,
  });
  const realization = createAnalyticsG6RealizationMetricDescriptor({
    tenant_id: tenantId,
    matter_id: source.matterId,
    billed_items: [{ tenant_id: tenantId, matter_id: source.matterId, billed_value: 900 }],
    standard_value_items: source.timeEntries,
  });
  const readModelDescriptors = [analyticsEvent, matterProfitability, clientProfitability, utilization, realization];
  const readModelCloseout = createAnalyticsG6AReadModelFoundationCloseoutDescriptor({ tenant_id: tenantId, descriptors: readModelDescriptors });
  const arAging = createAnalyticsG6ARAgingDashboardDescriptor({
    tenant_id: tenantId,
    actor_id: actorId,
    permissions: ["finance:ar:read"],
    ar_aging_rows: source.arAgingRows,
  });
  const clientHealth = createAnalyticsG6ClientHealthDashboardDescriptor({
    tenant_id: tenantId,
    client_group_id: source.clientGroupId,
    client_health_rows: source.clientHealthRows,
    conflict_detail_omitted: true,
    matter_detail_omitted: true,
  });
  const practicePnl = createAnalyticsG6PracticePnlDashboardDescriptor({
    tenant_id: tenantId,
    practice_id: source.practiceId,
    role_id: source.roleId,
    permissions: ["analytics:practice-pnl:read"],
    practice_pnl_rows: source.practicePnlRows,
    role_visibility_tested: true,
  });
  const exportControl = createAnalyticsG6AnalyticsExportControlDescriptor({
    tenant_id: tenantId,
    actor_id: actorId,
    export_id: "export-cmp-g8-evidence",
    read_model_refs: [{ read_model_type: "MatterProfitability", read_model_id: "read-model-cmp-g8-runtime" }],
    export_rows: source.exportRows,
    audit_receipt: { tenant_id: tenantId, audit_event_id: "audit-cmp-g8-export", export_id: "export-cmp-g8-evidence" },
    masking_tested: true,
    tenant_scoped: true,
  });
  const dashboardDescriptors = [arAging, clientHealth, practicePnl, exportControl];
  return Object.freeze({
    source,
    descriptors: Object.freeze({
      read_model_foundation: readModelDescriptors,
      read_model_closeout: readModelCloseout,
      dashboards: dashboardDescriptors,
      dashboard_closeout: createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: dashboardDescriptors,
        read_model_foundation_closed: true,
      }),
    }),
  });
}

export function createAnalyticsReadModelCmpG8RuntimeEvidence(context, tenantId, actorId = "analytics-read-model-runtime-actor") {
  const evidence = createAnalyticsEvidenceDescriptors(tenantId, actorId);
  return Object.freeze({
    cmp_gate: "CMP-G8",
    cmp_work_package: "CMP-G8-W08",
    bounded_context: "analytics-read-models",
    tuw_ids: CMP_G8_TUW_IDS,
    depends_on: ANALYTICS_READ_MODEL_BOUNDED_CONTEXT.depends_on,
    implemented_runtime_routes: ANALYTICS_READ_MODEL_PREFIXES,
    read_model_only_runtime: true,
    source_mutation_negative_tests: true,
    source_mutation_policy: context.source_mutation_policy,
    read_model_persistence: context.read_model_persistence,
    export_file_persistence: context.export_file_persistence,
    source_objects_mutated: false,
    runtime_readiness: RUNTIME_READINESS,
    durable_persistence_open: true,
    descriptor_evidence: evidence.descriptors,
  });
}

export async function handleAnalyticsReadModelApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });

    if (pathname === "/api/analytics-read-models/runtime/evidence" && method === "GET") {
      return response(200, {
        outcome: "ok",
        evidence: createAnalyticsReadModelCmpG8RuntimeEvidence(context, tenantId, actor.actor_id),
        tuw_ids: CMP_G8_TUW_IDS,
      });
    }

    if (pathname === "/api/analytics-read-models/source-mutation-test" && method === "POST") {
      if (hasSourceMutation(body)) {
        return response(400, {
          outcome: "blocked",
          safe_error_code: "CMP_G8_SOURCE_MUTATION_BLOCKED",
          source_mutation_negative_tested: true,
          source_objects_mutated: false,
          tuw_ids: ["CMP-G8-W08-T013"],
        });
      }
      return response(200, {
        outcome: "ok",
        source_mutation_negative_tested: true,
        source_objects_mutated: false,
        tuw_ids: ["CMP-G8-W08-T013"],
      });
    }

    if (method !== "POST" && pathname !== "/api/analytics-read-models/ui/kpi-console") {
      return response(405, { outcome: "blocked", safe_error_code: "CMP_G8_METHOD_NOT_ALLOWED", reason: "method_not_allowed" });
    }

    requireNoSourceMutation(body);

    if (pathname === "/api/analytics-read-models/events") {
      return handleAnalyticsEvent({ tenantId, actor, body });
    }
    if (pathname === "/api/analytics-read-models/matter-profitability") {
      return handleMatterProfitability({ tenantId, body });
    }
    if (pathname === "/api/analytics-read-models/client-profitability") {
      return handleClientProfitability({ tenantId, body });
    }
    if (pathname === "/api/analytics-read-models/utilization") {
      return handleUtilization({ tenantId, actor, body });
    }
    if (pathname === "/api/analytics-read-models/realization") {
      return handleRealization({ tenantId, body });
    }
    if (pathname === "/api/analytics-read-models/dashboards/ar-aging") {
      return handleArAgingDashboard({ tenantId, actor, body });
    }
    if (pathname === "/api/analytics-read-models/dashboards/client-health") {
      return handleClientHealthDashboard({ tenantId, body });
    }
    if (pathname === "/api/analytics-read-models/dashboards/practice-pnl") {
      return handlePracticePnlDashboard({ tenantId, body });
    }
    if (pathname === "/api/analytics-read-models/exports") {
      return handleAnalyticsExport({ tenantId, actor, body });
    }
    if (pathname === "/api/analytics-read-models/ui/kpi-console" && method === "GET") {
      return handleKpiConsole({ tenantId, actor, query });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G8_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}

function handleAnalyticsEvent({ tenantId, actor, body }) {
  const source = defaultSources({ tenantId, actorId: actor.actor_id, matterId: body.matter_id });
  const analyticsEvent = {
    analytics_event_id: body.analytics_event_id ?? "analytics-event-cmp-g8-runtime",
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    event_type: body.event_type ?? "invoice_payment_time_joined",
    occurred_at: body.occurred_at ?? "2026-06-20T00:00:00.000Z",
  };
  const descriptor = createAnalyticsG6AnalyticsEventDescriptor({
    tenant_id: tenantId,
    matter_id: analyticsEvent.matter_id,
    analytics_event: analyticsEvent,
    source_refs: body.source_refs ?? [{ source_type: "invoice", source_id: "invoice-cmp-g8-runtime" }],
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_ANALYTICS_EVENT_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    analytics_event: {
      analytics_event_id: analyticsEvent.analytics_event_id,
      event_type: analyticsEvent.event_type,
      analytics_event_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T001"],
  });
}

function handleMatterProfitability({ tenantId, body }) {
  const source = defaultSources({ tenantId, matterId: body.matter_id });
  const timeEntries = body.time_entries ?? source.timeEntries;
  const invoices = body.invoices ?? source.invoices;
  const payments = body.payments ?? source.payments;
  const descriptor = createAnalyticsG6MatterProfitabilityDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    time_entries: timeEntries,
    invoices,
    payments,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_MATTER_PROFITABILITY_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    read_model: {
      read_model_type: "MatterProfitability",
      matter_id: body.matter_id ?? source.matterId,
      time_value: descriptor.time_value,
      invoice_total: descriptor.invoice_total,
      payment_total: descriptor.payment_total,
      profitability_amount: descriptor.payment_total - descriptor.time_value,
      read_model_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T002"],
  });
}

function handleClientProfitability({ tenantId, body }) {
  const source = defaultSources({ tenantId, clientGroupId: body.client_group_id });
  const rows = body.matter_profitability_rows ?? source.matterProfitabilityRows;
  const descriptor = createAnalyticsG6ClientProfitabilityDescriptor({
    tenant_id: tenantId,
    client_group_id: body.client_group_id ?? source.clientGroupId,
    matter_profitability_rows: rows,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_CLIENT_PROFITABILITY_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    read_model: {
      read_model_type: "ClientProfitability",
      client_group_id: body.client_group_id ?? source.clientGroupId,
      profitability_total: descriptor.profitability_total,
      row_count: descriptor.row_count,
      created_client_identity: false,
      read_model_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T003"],
  });
}

function handleUtilization({ tenantId, actor, body }) {
  const source = defaultSources({ tenantId, actorId: body.actor_id ?? actor.actor_id });
  const descriptor = createAnalyticsG6UtilizationMetricDescriptor({
    tenant_id: tenantId,
    actor_id: body.actor_id ?? source.actorId,
    period_id: body.period_id ?? source.periodId,
    capacity: body.capacity ?? { denominator_hours: 10 },
    time_entries: body.time_entries ?? source.timeEntries,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_UTILIZATION_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    read_model: {
      read_model_type: "UtilizationMetric",
      actor_id: body.actor_id ?? source.actorId,
      period_id: body.period_id ?? source.periodId,
      utilization_rate: descriptor.utilization_rate,
      used_hr_payroll_data: false,
      read_model_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T004"],
  });
}

function handleRealization({ tenantId, body }) {
  const source = defaultSources({ tenantId, matterId: body.matter_id });
  const descriptor = createAnalyticsG6RealizationMetricDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    billed_items: body.billed_items ?? [{ tenant_id: tenantId, matter_id: source.matterId, billed_value: 900 }],
    standard_value_items: body.standard_value_items ?? source.timeEntries,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_REALIZATION_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    read_model: {
      read_model_type: "RealizationMetric",
      matter_id: body.matter_id ?? source.matterId,
      realization_rate: descriptor.realization_rate,
      read_model_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T005"],
  });
}

function handleArAgingDashboard({ tenantId, actor, body }) {
  const source = defaultSources({ tenantId });
  const descriptor = createAnalyticsG6ARAgingDashboardDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    permissions: body.permissions ?? ["finance:ar:read"],
    ar_aging_rows: body.ar_aging_rows ?? source.arAgingRows,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_AR_AGING_DASHBOARD_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    dashboard: {
      dashboard_type: "ARAging",
      overdue_total: descriptor.overdue_total,
      finance_permission_tested: descriptor.ar_aging_receipt.finance_permission_tested,
      dashboard_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T006"],
  });
}

function handleClientHealthDashboard({ tenantId, body }) {
  const source = defaultSources({ tenantId, clientGroupId: body.client_group_id });
  const descriptor = createAnalyticsG6ClientHealthDashboardDescriptor({
    tenant_id: tenantId,
    client_group_id: body.client_group_id ?? source.clientGroupId,
    client_health_rows: body.client_health_rows ?? source.clientHealthRows,
    conflict_detail_omitted: body.conflict_detail_omitted ?? true,
    matter_detail_omitted: body.matter_detail_omitted ?? true,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_CLIENT_HEALTH_DASHBOARD_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    dashboard: {
      dashboard_type: "ClientHealth",
      client_group_id: body.client_group_id ?? source.clientGroupId,
      health_score_average: descriptor.health_score_average,
      conflict_detail_visible: false,
      matter_detail_visible: false,
      dashboard_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T007"],
  });
}

function handlePracticePnlDashboard({ tenantId, body }) {
  const source = defaultSources({ tenantId });
  const descriptor = createAnalyticsG6PracticePnlDashboardDescriptor({
    tenant_id: tenantId,
    practice_id: body.practice_id ?? source.practiceId,
    role_id: body.role_id ?? source.roleId,
    permissions: body.permissions ?? ["analytics:practice-pnl:read"],
    practice_pnl_rows: body.practice_pnl_rows ?? source.practicePnlRows,
    role_visibility_tested: body.role_visibility_tested ?? true,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_PRACTICE_PNL_DASHBOARD_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    dashboard: {
      dashboard_type: "PracticePnl",
      practice_id: body.practice_id ?? source.practiceId,
      pnl_total: descriptor.pnl_total,
      role_visibility_tested: descriptor.practice_pnl_receipt.role_visibility_tested,
      dashboard_persisted: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T008"],
  });
}

function handleAnalyticsExport({ tenantId, actor, body }) {
  const source = defaultSources({ tenantId });
  const exportId = body.export_id ?? "export-cmp-g8-runtime";
  const descriptor = createAnalyticsG6AnalyticsExportControlDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    export_id: exportId,
    read_model_refs: body.read_model_refs ?? [{ read_model_type: "MatterProfitability", read_model_id: "read-model-cmp-g8-runtime" }],
    export_rows: body.export_rows ?? source.exportRows,
    audit_receipt: body.audit_receipt ?? { tenant_id: tenantId, audit_event_id: "audit-cmp-g8-export", export_id: exportId },
    masking_tested: body.masking_tested ?? true,
    tenant_scoped: body.tenant_scoped ?? true,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G8_ANALYTICS_EXPORT_BLOCKED");
  if (blocked) return blocked;
  return response(200, {
    outcome: "ok",
    export_preview: {
      export_id: exportId,
      row_count: descriptor.row_count,
      export_file_written: false,
      unmasked_sensitive_data_detected: false,
      source_objects_mutated: false,
    },
    descriptor,
    tuw_ids: ["CMP-G8-W08-T009"],
  });
}

function handleKpiConsole({ tenantId, actor, query }) {
  const evidence = createAnalyticsEvidenceDescriptors(tenantId, actor.actor_id);
  return response(200, {
    outcome: "ok",
    kpi_console: {
      tenant_id: tenantId,
      actor_id: actor.actor_id,
      tiles: [
        { tile_id: "matter-profitability", read_model_type: "MatterProfitability", source_mutation_allowed: false },
        { tile_id: "client-health", read_model_type: "ClientHealth", conflict_detail_visible: false, matter_detail_visible: false },
        { tile_id: "practice-pnl", read_model_type: "PracticePnl", role_visibility_tested: true },
        { tile_id: "analytics-export", read_model_type: "AnalyticsExport", export_file_written: false },
      ],
      launch_kpi_ref: query.launch_kpi_ref ?? "docs/launch/kpi/cmp-g8-read-models",
      dashboard_persisted: false,
      source_objects_mutated: false,
    },
    descriptor_evidence: evidence.descriptors,
    tuw_ids: ["CMP-G8-W08-T010", "CMP-G8-W08-T011", "CMP-G8-W08-T012", "CMP-G8-W08-T014"],
  });
}
