import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { refreshAnalyticsReadModels } from "../../../packages/analytics/src/refresh-job-service.js";
import { createClientProfitability, createMatterProfitability } from "../../../packages/analytics/src/metrics-service.js";
import { createAnalyticsExport } from "../../../packages/analytics/src/export-control-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const ANALYTICS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "analytics",
  contract_ref: "contracts/analytics-runtime-contract.json",
  contract_schema_version: "law-firm-os.analytics-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/analytics/dashboards",
    "POST /api/analytics/refresh",
    "GET /api/analytics/matter-profitability",
    "POST /api/analytics/matter-profitability",
    "GET /api/analytics/client-profitability",
    "POST /api/analytics/client-profitability",
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
});

export const ANALYTICS_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "AnalyticsDashboard",
    dashboard_id: "dashboard-ar-aging",
    tenant_id: "tenant_cmp_g8_synthetic",
    dashboard_type: "ar_aging",
    title: "AR Aging",
    metric_value: 400000,
    matter_detail_omitted: true,
    status: "published",
  }),
  Object.freeze({
    model_type: "AnalyticsDashboard",
    dashboard_id: "dashboard-client-health",
    tenant_id: "tenant_cmp_g8_synthetic",
    dashboard_type: "client_health",
    title: "Client Health",
    metric_value: 87,
    matter_detail_omitted: true,
    status: "published",
  }),
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
]);

export function createAnalyticsRuntimeContext({
  repository = createAnalyticsRepository({ seedRecords: ANALYTICS_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({ repository, seed_ref: "cmp-g8-analytics-synthetic" });
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

function routeGate({ context, query, requestId, action, resourceType }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: { tenant_id: query.tenant_id, resource_type: resourceType },
    action,
  });
  if (decision.effect === "allow") return null;
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

export function handleAnalyticsRefresh({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "analytics:refresh:write", resourceType: "analytics_refresh" });
  if (gated) return gated;
  try {
    const result = refreshAnalyticsReadModels({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      actor_id: body.actor_id ?? context.principal.user_id,
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
    const result = createMatterProfitability({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      time_entries: body.time_entries,
      invoices: body.invoices,
      payments: body.payments,
      actor_id: body.actor_id ?? context.principal.user_id,
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
    const matterRows =
      Array.isArray(body.matter_rows) && body.matter_rows.length > 0
        ? body.matter_rows
        : runtime.repository.list({ tenant_id: body.tenant_id, model_type: "MatterProfitability" });
    const result = createClientProfitability({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      client_group_id: body.client_group_id,
      matter_rows: matterRows,
      actor_id: body.actor_id ?? context.principal.user_id,
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
      actor_id: body.actor_id ?? context.principal.user_id,
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
  if (pathname === "/api/analytics/exports" && method === "POST") return handleAnalyticsExportCreate({ body, context, requestId, runtime });
  if (pathname === "/api/analytics/audit" && method === "GET") return handleAnalyticsAudit({ query, context, requestId, runtime });
  return errorResponse(404, requestId, [ANALYTICS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
