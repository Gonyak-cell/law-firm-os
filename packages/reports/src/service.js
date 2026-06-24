import { randomUUID } from "node:crypto";

export const REPORT_MODEL = Object.freeze({
  definition: "ReportDefinition",
  queryRun: "ReportQueryRun",
  shareGrant: "ReportShareGrant",
});

const DEFAULT_REPORTS = Object.freeze([
  Object.freeze({
    report_id: "report-client-profitability",
    name: "Client profitability overview",
    object_scope: "Client",
    column_refs: Object.freeze(["client_group", "matter_count", "profitability_amount"]),
    filter_manifest: Object.freeze([{ field: "period", operator: "current", value_label: "현재" }]),
    grouping_manifest: Object.freeze(["client_group"]),
    chart_manifest: Object.freeze({ type: "bar", metric: "profitability_amount" }),
    owner_label: "Finance operations",
    share_state: "private",
  }),
  Object.freeze({
    report_id: "report-matter-business-overview",
    name: "Matter business overview",
    object_scope: "Matter",
    column_refs: Object.freeze(["matter", "standard_value", "collected_value", "profitability_amount"]),
    filter_manifest: Object.freeze([{ field: "status", operator: "not_empty", value_label: "활성" }]),
    grouping_manifest: Object.freeze(["matter"]),
    chart_manifest: Object.freeze({ type: "table", metric: "profitability_amount" }),
    owner_label: "Matter operations",
    share_state: "private",
  }),
]);

const ALLOWED_SCOPES = Object.freeze({
  Client: Object.freeze(["client_group", "matter_count", "profitability_amount", "realization_band"]),
  Matter: Object.freeze(["matter", "standard_value", "billed_value", "collected_value", "profitability_amount"]),
  Finance: Object.freeze(["period", "wip_bucket", "ar_bucket", "collection_band"]),
  Analytics: Object.freeze(["dashboard", "metric_value", "status", "updated_at"]),
});

const ALLOWED_CHART_TYPES = new Set(["table", "bar", "line"]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function tenantIdOf(input) {
  return requiredString(input, "tenant_id");
}

function actorIdOf(input) {
  return requiredString(input, "actor_id");
}

function recordRef(tenantId, modelType, resourceId) {
  return { tenant_id: tenantId, model_type: modelType, resource_id: resourceId };
}

function listRecords(repository, tenantId, modelType) {
  return repository.list({ tenant_id: tenantId, model_type: modelType });
}

function getRecord(repository, tenantId, modelType, resourceId) {
  return repository.get(recordRef(tenantId, modelType, resourceId));
}

function upsertRecord(repository, record) {
  return repository.upsert({
    ...clone(record),
    resource_id: record.resource_id ?? record.report_id ?? record.query_run_id ?? record.share_grant_id,
  });
}

function audit(repository, input = {}) {
  return repository.appendAudit({
    tenant_id: input.tenant_id,
    event_id: input.event_id ?? `report_audit_${randomUUID()}`,
    object_id: input.object_id ?? input.report_id ?? "report",
    actor_ref: "actor:omitted",
    action: input.action,
    permission_ref: input.permission_ref,
    audit_hint_ref: input.audit_hint_ref,
    metadata: {
      raw_sql_included: false,
      raw_query_payload_included: false,
      source_payload_included: false,
      direct_recipient_contact_values_included: false,
      source_object_mutated: false,
      owner_decision_required: Boolean(input.owner_decision_required),
      production_ready_claim: false,
    },
    created_at: nowIso(),
  });
}

function seedTenant(repository, tenantId) {
  if (listRecords(repository, tenantId, REPORT_MODEL.definition).length > 0) return;
  for (const report of DEFAULT_REPORTS) {
    upsertRecord(repository, {
      ...clone(report),
      tenant_id: tenantId,
      model_type: REPORT_MODEL.definition,
      resource_id: report.report_id,
      owner_ref: "owner:omitted",
      permission_ref: "report:metadata",
      raw_sql: null,
      source_payload: null,
      row_data: null,
      created_at: nowIso(),
      production_ready_claim: false,
    });
  }
}

function normalizeScope(value) {
  const scope = String(value ?? "Client").trim();
  if (!Object.hasOwn(ALLOWED_SCOPES, scope)) throw new TypeError("object_scope is not allowlisted");
  return scope;
}

function normalizeColumns(scope, value = []) {
  const requested = Array.isArray(value) ? value.map(String) : [];
  const allowed = ALLOWED_SCOPES[scope];
  const columns = requested.filter((column) => allowed.includes(column)).slice(0, 8);
  return columns.length > 0 ? columns : allowed.slice(0, 3);
}

function normalizeFilters(value = []) {
  const filters = Array.isArray(value) ? value : [];
  return filters.slice(0, 6).map((filter, index) => Object.freeze({
    filter_id: `filter_${index + 1}`,
    field: String(filter?.field ?? "period").replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 80),
    operator: String(filter?.operator ?? "current").replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 40),
    value_label: String(filter?.value_label ?? "검토").slice(0, 80),
    raw_value_included: false,
  }));
}

function normalizeGrouping(scope, value = []) {
  const requested = Array.isArray(value) ? value.map(String) : [];
  const allowed = ALLOWED_SCOPES[scope];
  const groups = requested.filter((group) => allowed.includes(group)).slice(0, 4);
  return groups.length > 0 ? groups : [allowed[0]];
}

function normalizeChart(value = {}) {
  const type = ALLOWED_CHART_TYPES.has(value?.type) ? value.type : "table";
  return Object.freeze({
    type,
    metric: String(value?.metric ?? "profitability_amount").replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 80),
    raw_config_included: false,
  });
}

function safeAuditEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id,
    object_id: event.object_id,
    action: event.action,
    actor_ref_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    direct_recipient_contact_values_included: false,
    production_ready_claim: false,
  });
}

function safeDefinition(record = {}) {
  return Object.freeze({
    report_id: record.report_id,
    name: record.name,
    object_scope: record.object_scope,
    column_refs: Array.isArray(record.column_refs) ? [...record.column_refs] : [],
    filter_manifest: Array.isArray(record.filter_manifest) ? clone(record.filter_manifest) : [],
    grouping_manifest: Array.isArray(record.grouping_manifest) ? [...record.grouping_manifest] : [],
    chart_manifest: clone(record.chart_manifest ?? {}),
    owner_label: record.owner_label ?? "Report owner",
    share_state: record.share_state ?? "private",
    ui_state: record.ui_state ?? "route_mounted",
    raw_sql_included: false,
    row_data_included: false,
    source_payload_included: false,
    tenant_id_included: false,
    owner_ref_included: false,
    production_ready_claim: false,
  });
}

function amountBand(value) {
  const amount = Number(value ?? 0);
  if (amount >= 100000) return "positive_large";
  if (amount >= 0) return "positive";
  if (amount > -100000) return "review";
  return "loss_review";
}

function reportRowsFor(repository, tenantId, definition) {
  if (definition.object_scope === "Client") {
    const rows = listRecords(repository, tenantId, "ClientProfitability");
    return rows.slice(0, 25).map((item, index) => Object.freeze({
      label: item.client_group_label ?? `Client Group ${index + 1}`,
      matter_count: Number(item.matter_count ?? 0),
      profitability_amount: Number(item.profitability_amount ?? 0),
      profitability_band: amountBand(item.profitability_amount),
      source_payload_included: false,
      matter_level_rows_included: false,
    }));
  }
  if (definition.object_scope === "Matter") {
    const rows = listRecords(repository, tenantId, "MatterProfitability");
    return rows.slice(0, 25).map((item, index) => Object.freeze({
      label: item.matter_label ?? `Matter ${index + 1}`,
      standard_value: Number(item.standard_value ?? 0),
      collected_value: Number(item.collected_value ?? 0),
      profitability_amount: Number(item.profitability_amount ?? 0),
      profitability_band: amountBand(item.profitability_amount),
      raw_matter_detail_included: false,
      source_payload_included: false,
    }));
  }
  return [];
}

function chartRows(rows = []) {
  return rows.slice(0, 8).map((row) => Object.freeze({
    label: row.label,
    value: Number(row.profitability_amount ?? row.metric_value ?? 0),
    band: row.profitability_band ?? "review",
  }));
}

function safeQueryRun(record = {}) {
  return Object.freeze({
    query_run_id: record.query_run_id,
    report_id: record.report_id,
    status: record.status,
    ui_state: record.ui_state ?? "route_mounted",
    row_count: Number(record.row_count ?? 0),
    omitted_row_count: Number(record.omitted_row_count ?? 0),
    table_rows: Array.isArray(record.table_rows) ? clone(record.table_rows) : [],
    chart_rows: Array.isArray(record.chart_rows) ? clone(record.chart_rows) : [],
    raw_sql_included: false,
    arbitrary_sql_executed: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    raw_matter_detail_included: false,
    row_level_billing_payload_included: false,
    source_object_mutated: false,
    bounded_result: true,
    production_ready_claim: false,
  });
}

function safeShareGrant(record = {}) {
  return Object.freeze({
    share_grant_id: record.share_grant_id,
    report_id: record.report_id,
    target_type: record.target_type,
    target_ref_label: record.target_ref_label,
    status: record.status,
    ui_state: record.ui_state ?? "owner_blocked",
    share_grant_applied: false,
    owner_decision_required: true,
    direct_recipient_contact_values_included: false,
    row_level_permission_bypass_performed: false,
    production_ready_claim: false,
  });
}

export function createReportBuilderService({ repository } = {}) {
  if (!repository) throw new TypeError("repository is required");

  return Object.freeze({
    listReports({ tenant_id }) {
      const tenantId = tenantIdOf({ tenant_id });
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, REPORT_MODEL.definition).map(safeDefinition));
    },

    getReport({ tenant_id, report_id }) {
      const tenantId = tenantIdOf({ tenant_id });
      seedTenant(repository, tenantId);
      const report = getRecord(repository, tenantId, REPORT_MODEL.definition, requiredString({ report_id }, "report_id"));
      if (!report) throw new TypeError("report not found");
      return safeDefinition(report);
    },

    createReport(input = {}) {
      const tenantId = tenantIdOf(input);
      actorIdOf(input);
      seedTenant(repository, tenantId);
      const reportId = requiredString({ report_id: input.report_id ?? `report_${randomUUID()}` }, "report_id");
      const objectScope = normalizeScope(input.object_scope);
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: REPORT_MODEL.definition,
        resource_id: reportId,
        report_id: reportId,
        name: String(input.name ?? "Client profitability report").slice(0, 120),
        object_scope: objectScope,
        column_refs: normalizeColumns(objectScope, input.column_refs),
        filter_manifest: normalizeFilters(input.filter_manifest),
        grouping_manifest: normalizeGrouping(objectScope, input.grouping_manifest),
        chart_manifest: normalizeChart(input.chart_manifest),
        owner_label: String(input.owner_label ?? "Report owner").slice(0, 120),
        owner_ref: "owner:omitted",
        share_state: "private",
        ui_state: "route_mounted",
        raw_sql: null,
        source_payload: null,
        row_data: null,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: input.actor_id,
        action: "report.definition.created",
        report_id: reportId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ report: safeDefinition(record), audit_event: safeAuditEvent(auditEvent) });
    },

    patchReport(input = {}) {
      const tenantId = tenantIdOf(input);
      actorIdOf(input);
      seedTenant(repository, tenantId);
      const reportId = requiredString(input, "report_id");
      const current = getRecord(repository, tenantId, REPORT_MODEL.definition, reportId);
      if (!current) throw new TypeError("report not found");
      const objectScope = normalizeScope(input.object_scope ?? current.object_scope);
      const record = upsertRecord(repository, {
        ...current,
        name: input.name === undefined ? current.name : String(input.name).slice(0, 120),
        object_scope: objectScope,
        column_refs: input.column_refs === undefined ? current.column_refs : normalizeColumns(objectScope, input.column_refs),
        filter_manifest: input.filter_manifest === undefined ? current.filter_manifest : normalizeFilters(input.filter_manifest),
        grouping_manifest: input.grouping_manifest === undefined ? current.grouping_manifest : normalizeGrouping(objectScope, input.grouping_manifest),
        chart_manifest: input.chart_manifest === undefined ? current.chart_manifest : normalizeChart(input.chart_manifest),
        row_data: null,
        raw_sql: null,
        source_payload: null,
        updated_at: nowIso(),
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: input.actor_id,
        action: "report.definition.patched",
        report_id: reportId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ report: safeDefinition(record), audit_event: safeAuditEvent(auditEvent) });
    },

    runReport(input = {}) {
      const tenantId = tenantIdOf(input);
      actorIdOf(input);
      seedTenant(repository, tenantId);
      const reportId = requiredString(input, "report_id");
      const definition = getRecord(repository, tenantId, REPORT_MODEL.definition, reportId);
      if (!definition) throw new TypeError("report not found");
      const rows = reportRowsFor(repository, tenantId, definition);
      const queryRunId = input.query_run_id ?? `report_run_${randomUUID()}`;
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: REPORT_MODEL.queryRun,
        resource_id: queryRunId,
        query_run_id: queryRunId,
        report_id: reportId,
        status: "completed",
        ui_state: "route_mounted",
        row_count: rows.length,
        omitted_row_count: 0,
        table_rows: rows,
        chart_rows: chartRows(rows),
        raw_sql: null,
        raw_query_payload: null,
        source_payload: null,
        source_object_mutated: false,
        bounded_result: true,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: input.actor_id,
        action: "report.query_run.completed",
        report_id: reportId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ query_run: safeQueryRun(record), audit_event: safeAuditEvent(auditEvent) });
    },

    shareReport(input = {}) {
      const tenantId = tenantIdOf(input);
      actorIdOf(input);
      seedTenant(repository, tenantId);
      const reportId = requiredString(input, "report_id");
      if (!getRecord(repository, tenantId, REPORT_MODEL.definition, reportId)) throw new TypeError("report not found");
      const shareGrantId = input.share_grant_id ?? `report_share_${randomUUID()}`;
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: REPORT_MODEL.shareGrant,
        resource_id: shareGrantId,
        share_grant_id: shareGrantId,
        report_id: reportId,
        target_type: ["user", "group", "role"].includes(input.target_type) ? input.target_type : "role",
        target_ref_label: String(input.target_ref_label ?? "승인 대상").slice(0, 120),
        status: "owner_review_required",
        ui_state: "owner_blocked",
        share_grant_applied: false,
        owner_decision_required: true,
        direct_recipient_contact_values_included: false,
        row_level_permission_bypass_performed: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: input.actor_id,
        action: "report.share.owner_blocked",
        report_id: reportId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_decision_required: true,
      });
      return Object.freeze({ share_grant: safeShareGrant(record), audit_event: safeAuditEvent(auditEvent) });
    },

    listAudit({ tenant_id, report_id } = {}) {
      const tenantId = tenantIdOf({ tenant_id });
      return Object.freeze(
        repository
          .listAudit({ tenant_id: tenantId })
          .filter((event) => String(event.action ?? "").startsWith("report."))
          .filter((event) => !report_id || event.object_id === report_id)
          .slice(0, 50)
          .map(safeAuditEvent),
      );
    },
  });
}
