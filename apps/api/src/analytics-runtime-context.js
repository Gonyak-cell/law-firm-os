import { randomUUID } from "node:crypto";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import {
  refreshAnalyticsReadModels,
  selectFinanceRowsForEmployeeUtilization,
  selectFinanceRowsForMatter,
} from "../../../packages/analytics/src/refresh-job-service.js";
import {
  createClientProfitability,
  createEmployeeUtilization,
  createMatterProfitability,
  createRealizationMetric,
} from "../../../packages/analytics/src/metrics-service.js";
import { createAnalyticsExport } from "../../../packages/analytics/src/export-control-service.js";
import { buildCashflowReadModel, buildFinanceReadModels } from "../../../packages/analytics/src/finance-read-model.js";
import {
  createClientOperationsReadModel,
} from "../../../packages/analytics/src/client-operations-read-model.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const ANALYTICS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "analytics",
  contract_ref: "contracts/analytics-runtime-contract.json",
  contract_schema_version: "law-firm-os.analytics-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/analytics/dashboards",
    "GET /api/analytics/finance/overview",
    "GET /api/analytics/finance/monthly",
    "GET /api/analytics/finance/clients",
    "GET /api/analytics/finance/cashflow",
    "POST /api/analytics/refresh",
    "GET /api/analytics/matter-profitability",
    "POST /api/analytics/matter-profitability",
    "GET /api/analytics/client-profitability",
    "POST /api/analytics/client-profitability",
    "GET /api/analytics/realization",
    "POST /api/analytics/realization",
    "GET /api/analytics/utilization",
    "POST /api/analytics/utilization",
    "POST /api/analytics/exports",
    "GET /api/analytics/audit",
  ]),
  data_source: "analytics_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const ANALYTICS_API_ERROR_CODES = Object.freeze({
  tenant_required: "ANALYTICS_TENANT_REQUIRED",
  permission_required: "ANALYTICS_PERMISSION_REQUIRED",
  audit_hint_required: "ANALYTICS_AUDIT_HINT_REQUIRED",
  validation_error: "ANALYTICS_API_VALIDATION_ERROR",
  unauthorized_omission: "ANALYTICS_UNAUTHORIZED_OMISSION",
  review_required: "ANALYTICS_REVIEW_REQUIRED",
  approval_required: "ANALYTICS_APPROVAL_REQUIRED",
  not_found: "ANALYTICS_NOT_FOUND",
  caller_source_payload_rejected: "ANALYTICS_CALLER_SOURCE_PAYLOAD_REJECTED",
});

export const ANALYTICS_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "MatterProfitability",
    matter_profitability_id: "matter-profit:tenant_cmp_g8_synthetic:matter_rp05_synthetic_opening",
    tenant_id: "tenant_cmp_g8_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    standard_value: 400000,
    billed_value: 400000,
    collected_value: 0,
    profitability_amount: -400000,
  }),
  Object.freeze({
    model_type: "RealizationMetric",
    realization_metric_id: "realization:tenant_cmp_g8_synthetic:matter_rp05_synthetic_opening",
    tenant_id: "tenant_cmp_g8_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    billed_value: 350000,
    standard_value: 400000,
    realization_rate: 0.875,
  }),
  Object.freeze({
    model_type: "EmployeeUtilization",
    employee_utilization_id: "util:tenant_cmp_g8_synthetic:employee_cmp_g8_seed:2026-07",
    tenant_id: "tenant_cmp_g8_synthetic",
    employee_id: "employee_cmp_g8_seed",
    period_id: "2026-07",
    capacity_hours: 160,
    billable_hours: 120,
    utilization_rate: 0.75,
  }),
]);

export function createAnalyticsRuntimeContext({
  repository = createAnalyticsRepository({ seedRecords: ANALYTICS_RUNTIME_SEED }),
  financeRepository = null,
  masterDataRepository = null,
  crmRepository = null,
  matterRepository = null,
} = {}) {
  return Object.freeze({
    repository,
    financeRepository,
    masterDataRepository,
    crmRepository,
    matterRepository,
    clientOperationsReadModel: createClientOperationsReadModel({
      masterDataRepository,
      financeRepository,
      crmRepository,
      matterRepository,
    }),
    seed_ref: "cmp-g8-analytics-synthetic",
  });
}

const DEFAULT_RUNTIME = createAnalyticsRuntimeContext();

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommon(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function appendAnalyticsRouteAudit({ repository, context, query, action, resourceType, decision } = {}) {
  if (!repository || typeof repository.appendAudit !== "function" || !query?.tenant_id || decision?.effect === "allow") return null;
  return repository.appendAudit({
    event_id: `analytics_route_${randomUUID()}`,
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    action,
    object_type: resourceType,
    object_id: resourceType,
    decision: ["review_required", "approval_required"].includes(decision?.effect) ? decision.effect : "deny",
    reason: decision?.reason ?? "analytics_route_denied",
    occurred_at: new Date().toISOString(),
    metadata: {
      permission_ref: query.permission_ref ?? null,
      audit_hint_ref: query.audit_hint_ref ?? null,
      fail_closed: Boolean(decision?.fail_closed),
      denied_route_audit: true,
      raw_payload_included: false,
      credential_material_included: false,
    },
  });
}

function routeGate({ context, query, requestId, action, resourceType, repository }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const explicitScopes = context?.principal?.scopes;
  const financeScopeDenied = action === "analytics:finance:read" && Array.isArray(explicitScopes) && !explicitScopes.includes("analytics.finance.read");
  const decision = financeScopeDenied ? {
    effect: "deny",
    reason: "finance_scope_required:analytics.finance.read",
    fail_closed: true,
  } : evaluateRouteDecision({
    context,
    resource: { tenant_id: query.tenant_id, resource_type: resourceType },
    action,
  });
  if (decision.effect === "allow") return null;
  appendAnalyticsRouteAudit({ repository, context, query, action, resourceType, decision });
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [
          decision.effect === "review_required" ? ANALYTICS_API_ERROR_CODES.review_required : ANALYTICS_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [ANALYTICS_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: query.audit_hint_ref,
    ui_state: "denied",
  });
}

function sanitizeAnalyticsItem(record) {
  const { raw_matter_detail, source_payload, credential_material, ...safe } = record;
  return Object.freeze({
    ...safe,
    raw_matter_detail_included: false,
    source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sumRows(rows = [], fields = []) {
  return rows.reduce((total, row) => {
    for (const field of fields) {
      if (row?.[field] !== undefined) return total + numberValue(row[field]);
    }
    return total;
  }, 0);
}

function containsCallerSourcePayload(body = {}, fields = []) {
  return fields.some((field) => body[field] !== undefined);
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType }).map(sanitizeAnalyticsItem);
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function financeReadModelResponse({ kind, query, context, requestId, runtime }) {
  const cashflow = kind === "cashflow";
  const gated = routeGate({
    context,
    query,
    requestId,
    action: cashflow ? "finance:bank_transaction:read" : "analytics:finance:read",
    resourceType: cashflow ? "bank_transaction" : "finance_read_model",
    repository: runtime.repository,
  });
  if (gated) return gated;
  try {
    if (cashflow) {
      const model = buildCashflowReadModel({
        financeRepository: runtime.financeRepository,
        tenant_id: query.tenant_id,
        from: query.from ?? null,
        to: query.to ?? null,
        currency: query.currency ?? "KRW",
        account_ref: query.account_ref ?? null,
      });
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: model.partial ? "partial" : "passed",
          item: {
            summary: model.summary,
            business_summary: model.business_summary,
            payroll_categories: model.payroll_categories,
            non_payroll_outflow_categories: model.non_payroll_outflow_categories,
            monthly: model.monthly,
            reconciliation: model.reconciliation,
          },
          source_statuses: model.source_statuses,
          filters: model.filters,
          safe_error_codes: model.partial ? ["ANALYTICS_FINANCE_PARTIAL_SOURCE"] : [],
          audit_hint_ref: query.audit_hint_ref,
          ui_state: model.summary.transaction_count === 0 ? "empty" : model.partial ? "partial" : null,
          count_leak_prevented: true,
          raw_source_payload_included: false,
          counterparty_values_included: false,
          credential_material_included: false,
          production_ready_claim: false,
        },
      };
    }
    const model = buildFinanceReadModels({
      financeRepository: runtime.financeRepository,
      masterDataRepository: runtime.masterDataRepository,
      matterRepository: runtime.matterRepository,
      tenant_id: query.tenant_id,
      from: query.from ?? null,
      to: query.to ?? null,
      currency: query.currency ?? null,
      client_group_id: query.client_group_id ?? null,
      matter_id: query.matter_id ?? null,
      recognition_basis: query.recognition_basis ?? "billed",
    });
    const items = kind === "monthly" ? model.monthly : kind === "clients" ? model.clients : model.overview.totals;
    const empty = items.length === 0 || items.every((item) => item.transaction_count === 0);
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: model.partial ? "partial" : "passed",
        ...(kind === "overview" ? { item: model.overview } : { items }),
        source_statuses: model.source_statuses,
        filters: model.filters,
        safe_error_codes: model.partial ? ["ANALYTICS_FINANCE_PARTIAL_SOURCE"] : [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: empty ? "empty" : model.partial ? "partial" : null,
        count_leak_prevented: true,
        raw_source_payload_included: false,
        credential_material_included: false,
        journal_lines_included: false,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export function handleRealizationCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:realization:write", resourceType: "realization_metric" });
  if (gated) return gated;
  try {
    if (containsCallerSourcePayload(body, ["time_entries", "invoices", "billed_value", "standard_value"])) {
      return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.caller_source_payload_rejected], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
    }
    const financeRows = selectFinanceRowsForMatter({
      financeRepository: runtime.financeRepository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
    });
    const result = createRealizationMetric({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      billed_value: sumRows(financeRows.invoices, ["amount_due", "invoice_total"]),
      standard_value: sumRows(financeRows.time_entries, ["standard_value", "amount"]),
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeAnalyticsItem(result.item),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleEmployeeUtilizationCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:utilization:write", resourceType: "employee_utilization" });
  if (gated) return gated;
  try {
    if (containsCallerSourcePayload(body, ["time_entries", "capacity_hours", "billable_hours"])) {
      return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.caller_source_payload_rejected], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
    }
    const financeRows = selectFinanceRowsForEmployeeUtilization({
      financeRepository: runtime.financeRepository,
      tenant_id: body.tenant_id,
      employee_id: body.employee_id,
      period_id: body.period_id,
    });
    const result = createEmployeeUtilization({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      employee_id: body.employee_id,
      period_id: body.period_id,
      capacity_hours: financeRows.capacity_hours,
      billable_hours: financeRows.billable_hours,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeAnalyticsItem(result.item),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAnalyticsRefresh({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:refresh:write", resourceType: "analytics_refresh" });
  if (gated) return gated;
  try {
    const result = refreshAnalyticsReadModels({
      repository: runtime.repository,
      financeRepository: runtime.financeRepository,
      tenant_id: body.tenant_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeAnalyticsItem(result.refresh_run),
        items: result.dashboards.map(sanitizeAnalyticsItem),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleMatterProfitabilityCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:profitability:write", resourceType: "matter_profitability" });
  if (gated) return gated;
  try {
    if (containsCallerSourcePayload(body, ["time_entries", "invoices", "payments"])) {
      return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.caller_source_payload_rejected], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
    }
    const financeRows = selectFinanceRowsForMatter({
      financeRepository: runtime.financeRepository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
    });
    const result = createMatterProfitability({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      client_group_id: body.client_group_id ?? financeRows.client_group_id,
      time_entries: financeRows.time_entries,
      invoices: financeRows.invoices,
      payments: financeRows.payments,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeAnalyticsItem(result.item),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleClientProfitabilityCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:client_profitability:write", resourceType: "client_profitability" });
  if (gated) return gated;
  try {
    if (containsCallerSourcePayload(body, ["matter_rows"])) {
      return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.caller_source_payload_rejected], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
    }
    const matterRows = runtime.repository.list({ tenant_id: body.tenant_id, model_type: "MatterProfitability", client_group_id: body.client_group_id });
    const result = createClientProfitability({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      client_group_id: body.client_group_id,
      matter_rows: matterRows,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeAnalyticsItem({
          ...result.item,
          client_group_label: body.client_group_label ?? "Client Group",
          matter_level_rows_included: false,
          row_level_billing_payload_included: false,
        }),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAnalyticsExportCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.analytics_export?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:export:write", resourceType: "analytics_export" });
  if (gated) return gated;
  try {
    const result = createAnalyticsExport({
      repository: runtime.repository,
      analytics_export: body.analytics_export,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
      permission_ref: body.permission_ref,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeAnalyticsItem(result.analytics_export),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ANALYTICS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAnalyticsAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "analytics:audit:read", resourceType: "analytics_audit" });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.repository.listAudit({ tenant_id: query.tenant_id }),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleAnalyticsApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  if (pathname === "/api/analytics/finance/overview" && method === "GET") {
    return financeReadModelResponse({ kind: "overview", query, context, requestId, runtime });
  }
  if (pathname === "/api/analytics/finance/monthly" && method === "GET") {
    return financeReadModelResponse({ kind: "monthly", query, context, requestId, runtime });
  }
  if (pathname === "/api/analytics/finance/clients" && method === "GET") {
    return financeReadModelResponse({ kind: "clients", query, context, requestId, runtime });
  }
  if (pathname === "/api/analytics/finance/cashflow" && method === "GET") {
    return financeReadModelResponse({ kind: "cashflow", query, context, requestId, runtime });
  }
  if (pathname === "/api/analytics/dashboards" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "analytics:dashboard:read", resourceType: "analytics_dashboard", modelType: "AnalyticsDashboard" });
  }
  if (pathname === "/api/analytics/refresh" && method === "POST") return handleAnalyticsRefresh({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/matter-profitability" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "analytics:profitability:read", resourceType: "matter_profitability", modelType: "MatterProfitability" });
  }
  if (pathname === "/api/analytics/matter-profitability" && method === "POST") return handleMatterProfitabilityCreate({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/client-profitability" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "analytics:client_profitability:read", resourceType: "client_profitability", modelType: "ClientProfitability" });
  }
  if (pathname === "/api/analytics/client-profitability" && method === "POST") return handleClientProfitabilityCreate({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/realization" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "analytics:realization:read", resourceType: "realization_metric", modelType: "RealizationMetric" });
  }
  if (pathname === "/api/analytics/realization" && method === "POST") return handleRealizationCreate({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/utilization" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "analytics:utilization:read", resourceType: "employee_utilization", modelType: "EmployeeUtilization" });
  }
  if (pathname === "/api/analytics/utilization" && method === "POST") return handleEmployeeUtilizationCreate({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/exports" && method === "POST") return handleAnalyticsExportCreate({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/audit" && method === "GET") return handleAnalyticsAudit({ query, context, requestId, runtime });
  return errorResponse(404, requestId, [ANALYTICS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
