import { createReportBuilderService } from "../../../packages/reports/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { matchReportRoute } from "./routes/reports.js";

export const REPORTS_API_ERROR_CODES = Object.freeze({
  tenant_required: "REPORTS_TENANT_REQUIRED",
  permission_required: "REPORTS_PERMISSION_REQUIRED",
  audit_hint_required: "REPORTS_AUDIT_HINT_REQUIRED",
  validation_error: "REPORTS_VALIDATION_ERROR",
  not_found: "REPORTS_NOT_FOUND",
  review_required: "REPORTS_REVIEW_REQUIRED",
  approval_required: "REPORTS_APPROVAL_REQUIRED",
});

export const REPORTS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "report-builder",
  contract_ref: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json",
  contract_schema_version: "law-firm-os.sf-client-matter-parity.report-builder.v0.1",
  endpoints: Object.freeze([
    "GET /api/reports",
    "POST /api/reports",
    "GET /api/reports/:reportId",
    "PATCH /api/reports/:reportId",
    "POST /api/reports/:reportId/run",
    "POST /api/reports/:reportId/share",
    "GET /api/reports/:reportId/audit",
    "GET /api/reports/audit",
  ]),
  data_source: "analytics_runtime_repository/report_builder_records",
  runtime_write_ready: true,
  safe_query_runtime_enabled: true,
  owner_gated_effects: true,
  arbitrary_sql_enabled: false,
  raw_query_payload_allowed: false,
  source_object_mutation_allowed: false,
  production_ready_claim: false,
  fail_closed: true,
});

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: status === 403 ? "denied" : "blocked",
      items: [],
      safe_error_codes: codes,
      count_leak_prevented: true,
      production_ready_claim: false,
      ...extra,
    },
  };
}

function validateCommon(query = {}, requestId) {
  if (typeof query.tenant_id !== "string" || query.tenant_id.trim() === "") {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.tenant_required]);
  }
  if (typeof query.permission_ref !== "string" || query.permission_ref.trim() === "") {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.permission_required]);
  }
  if (typeof query.audit_hint_ref !== "string" || query.audit_hint_ref.trim() === "") {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.audit_hint_required]);
  }
  return null;
}

function queryWithBody(query, body) {
  return {
    ...query,
    tenant_id: body?.tenant_id ?? query?.tenant_id,
    permission_ref: body?.permission_ref ?? query?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref ?? query?.audit_hint_ref,
  };
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required") {
    return errorResponse(200, requestId, [REPORTS_API_ERROR_CODES.review_required], {
      outcome: "review_required",
      ui_state: "review_required",
      audit_hint_ref: auditHintRef,
    });
  }
  if (decision.effect === "approval_required") {
    return errorResponse(200, requestId, [REPORTS_API_ERROR_CODES.approval_required], {
      outcome: "approval_required",
      ui_state: "approval_required",
      audit_hint_ref: auditHintRef,
    });
  }
  return errorResponse(403, requestId, [REPORTS_API_ERROR_CODES.permission_required], {
    ui_state: "denied",
    audit_hint_ref: auditHintRef,
  });
}

function routeGate({ context, query, requestId, policy, resourceId }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: policy.resource_type,
      resource_id: resourceId ?? null,
    },
    action: policy.action,
  });
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function createRuntime(runtime = {}) {
  const analyticsRuntime = runtime.analyticsRuntime ?? runtime.analytics ?? {};
  return Object.freeze({ repository: analyticsRuntime.repository });
}

function service(runtime) {
  return createReportBuilderService({ repository: runtime.repository });
}

function idempotencyReplay(repository, query, idempotencyKey, requestId) {
  if (!idempotencyKey) return null;
  const replay = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (!replay?.response) return null;
  return {
    status: 200,
    body: {
      ...replay.response,
      request_id: requestId,
      outcome: "idempotent_replay",
      idempotent_replay: true,
      production_ready_claim: false,
    },
  };
}

function recordIdempotency(repository, query, idempotencyKey, operation, response) {
  if (!idempotencyKey) return;
  repository?.recordIdempotency?.({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation,
    response,
    created_at: new Date().toISOString(),
  });
}

function responseBody(requestId, query, payload = {}) {
  return {
    request_id: requestId,
    safe_error_codes: [],
    audit_hint_ref: query.audit_hint_ref,
    production_ready_claim: false,
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    ...payload,
  };
}

function actorFrom(context, body) {
  return body?.actor_id ?? context?.principal?.user_id;
}

function commonInput(query, body, context) {
  return {
    tenant_id: query.tenant_id,
    permission_ref: query.permission_ref,
    audit_hint_ref: query.audit_hint_ref,
    actor_id: actorFrom(context, body),
  };
}

function validateIdempotentWrite(repository, query, body, requestId, operation) {
  const idempotencyKey = body?.idempotency_key;
  const replay = idempotencyReplay(repository, query, idempotencyKey, requestId);
  if (replay) return { replay };
  return { idempotencyKey, operation };
}

export function handleReportsApiRequest({ pathname, method, query, body, context, requestId, runtime } = {}) {
  const route = matchReportRoute({ pathname, method });
  if (!route) return errorResponse(404, requestId, [REPORTS_API_ERROR_CODES.not_found], { ui_state: "empty" });
  const mergedQuery = queryWithBody(query, body);
  const reportId = route.params[0] ? decodeURIComponent(route.params[0]) : null;
  const gated = routeGate({ context, query: mergedQuery, requestId, policy: route, resourceId: reportId });
  if (gated) return gated;
  const repositories = createRuntime(runtime);
  const reportService = service(repositories);

  try {
    if (route.action === "report:definition:read" && method === "GET" && reportId) {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          item: reportService.getReport({ tenant_id: mergedQuery.tenant_id, report_id: reportId }),
        }),
      };
    }
    if (route.action === "report:definition:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: reportService.listReports({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "report:audit:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: reportService.listAudit({ tenant_id: mergedQuery.tenant_id, report_id: reportId }),
        }),
      };
    }

    const writeCheck = validateIdempotentWrite(repositories.repository, mergedQuery, body, requestId, route.action);
    if (writeCheck.replay) return writeCheck.replay;
    const common = commonInput(mergedQuery, body, context);
    let status = 200;
    let payload;
    if (route.action === "report:definition:write") {
      const result = reportService.createReport({ ...common, ...body });
      status = 201;
      payload = { outcome: "passed", ui_state: "route_mounted", item: result.report, audit_event: result.audit_event };
    } else if (route.action === "report:definition:patch") {
      const result = reportService.patchReport({ ...common, ...body, report_id: reportId });
      payload = { outcome: "passed", ui_state: "route_mounted", item: result.report, audit_event: result.audit_event };
    } else if (route.action === "report:query:run") {
      const result = reportService.runReport({ ...common, ...body, report_id: reportId });
      payload = {
        outcome: "passed",
        ui_state: "route_mounted",
        item: result.query_run,
        audit_event: result.audit_event,
        arbitrary_sql_executed: false,
        source_object_mutated: false,
      };
    } else if (route.action === "report:share:write") {
      const result = reportService.shareReport({ ...common, ...body, report_id: reportId });
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.share_grant, audit_event: result.audit_event };
    } else {
      return errorResponse(404, requestId, [REPORTS_API_ERROR_CODES.not_found], { ui_state: "empty" });
    }
    const response = responseBody(requestId, mergedQuery, payload);
    recordIdempotency(repositories.repository, mergedQuery, writeCheck.idempotencyKey, writeCheck.operation, response);
    return { status, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.validation_error], {
      ui_state: "blocked",
      validation_message: error instanceof Error ? error.message : "report validation failed",
    });
  }
}
