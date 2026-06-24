import { createClientMatterImportJobService } from "../../../packages/import-data/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { matchImportDataMappingRoute } from "./routes/import-data-mapping.js";

export const IMPORT_DATA_MAPPING_API_ERROR_CODES = Object.freeze({
  tenant_required: "IMPORT_DATA_TENANT_REQUIRED",
  permission_required: "IMPORT_DATA_PERMISSION_REQUIRED",
  audit_hint_required: "IMPORT_DATA_AUDIT_HINT_REQUIRED",
  validation_error: "IMPORT_DATA_VALIDATION_ERROR",
  not_found: "IMPORT_DATA_NOT_FOUND",
  review_required: "IMPORT_DATA_REVIEW_REQUIRED",
  approval_required: "IMPORT_DATA_APPROVAL_REQUIRED",
});

export const IMPORT_DATA_MAPPING_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "import-data-mapping",
  contract_ref: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json",
  contract_schema_version: "law-firm-os.sf-client-matter-parity.import-data-mapping.v0.1",
  endpoints: Object.freeze([
    "GET /api/import-jobs",
    "POST /api/import-jobs",
    "GET /api/import-targets",
    "POST /api/import-jobs/:jobId/source-files",
    "GET /api/import-jobs/:jobId/preview",
    "POST /api/import-jobs/:jobId/field-mappings",
    "POST /api/import-jobs/:jobId/dry-run",
    "POST /api/import-jobs/:jobId/execute",
    "POST /api/import-jobs/:jobId/rollback",
    "GET /api/import-jobs/:jobId/error-report",
  ]),
  data_source: "matter_runtime_repository/import_records",
  runtime_write_ready: true,
  execute_owner_blocked: true,
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
    return errorResponse(400, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.tenant_required]);
  }
  if (typeof query.permission_ref !== "string" || query.permission_ref.trim() === "") {
    return errorResponse(400, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.permission_required]);
  }
  if (typeof query.audit_hint_ref !== "string" || query.audit_hint_ref.trim() === "") {
    return errorResponse(400, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.audit_hint_required]);
  }
  return null;
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required") {
    return errorResponse(200, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.review_required], {
      outcome: "review_required",
      ui_state: "review_required",
      audit_hint_ref: auditHintRef,
    });
  }
  if (decision.effect === "approval_required") {
    return errorResponse(200, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.approval_required], {
      outcome: "approval_required",
      ui_state: "approval_required",
      audit_hint_ref: auditHintRef,
    });
  }
  return errorResponse(403, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.permission_required], {
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
  const matterRuntime = runtime.matterRuntime ?? runtime.matter ?? {};
  return Object.freeze({
    repository: matterRuntime.repository,
  });
}

function service(runtime) {
  return createClientMatterImportJobService({ repository: runtime.repository });
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
    ...payload,
  };
}

function queryWithBody(query, body) {
  return {
    ...query,
    tenant_id: body?.tenant_id ?? query?.tenant_id,
    permission_ref: body?.permission_ref ?? query?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref ?? query?.audit_hint_ref,
  };
}

function actorFrom(context, body) {
  return body?.actor_id ?? context?.principal?.user_id;
}

function withCommonInput(query, body, context, jobId = null) {
  return {
    tenant_id: query.tenant_id,
    permission_ref: query.permission_ref,
    audit_hint_ref: query.audit_hint_ref,
    actor_id: actorFrom(context, body),
    job_id: jobId,
  };
}

function validateIdempotentWrite(repository, query, body, requestId, operation) {
  const idempotencyKey = body?.idempotency_key;
  const replay = idempotencyReplay(repository, query, idempotencyKey, requestId);
  if (replay) return { replay };
  return { idempotencyKey, operation };
}

export function handleImportDataMappingApiRequest({ pathname, method, query, body, context, requestId, runtime } = {}) {
  const route = matchImportDataMappingRoute({ pathname, method });
  if (!route) return errorResponse(404, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.not_found], { ui_state: "empty" });
  const mergedQuery = queryWithBody(query, body);
  const jobId = route.params[0] ? decodeURIComponent(route.params[0]) : null;
  const gated = routeGate({ context, query: mergedQuery, requestId, policy: route, resourceId: jobId });
  if (gated) return gated;
  const repositories = createRuntime(runtime);
  const importService = service(repositories);
  try {
    if (route.action === "import:target:read") {
      const result = importService.listTargets();
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: result.items,
          blocked_targets: result.blocked_targets,
          raw_schema_mutation_allowed: false,
        }),
      };
    }
    if (route.action === "import:job:read") {
      const items = importService.listJobs({ tenant_id: mergedQuery.tenant_id });
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items,
          page_info: { returned_count: items.length, safe_counts_only: true },
        }),
      };
    }
    if (route.action === "import:preview:read") {
      const item = importService.readPreview({ tenant_id: mergedQuery.tenant_id, job_id: jobId });
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, { outcome: "passed", item }),
      };
    }
    if (route.action === "import:error_report:read") {
      const report = importService.errorReport({ tenant_id: mergedQuery.tenant_id, job_id: jobId });
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          item: report,
          items: report.items,
        }),
      };
    }

    const idempotent = validateIdempotentWrite(repositories.repository, mergedQuery, body, requestId, route.action);
    if (idempotent.replay) return idempotent.replay;
    const common = withCommonInput(mergedQuery, body, context, jobId);
    let status = 200;
    let payload;
    if (route.action === "import:job:create") {
      const result = importService.createJob({
        ...common,
        job_id: body?.job_id,
        target_object: body?.target_object,
        source_type: body?.source_type,
      });
      status = 201;
      payload = { outcome: "created", item: result.job, audit_event: result.audit_event };
    } else if (route.action === "import:source:stage") {
      const result = importService.stageSourceFile({ ...common, source_file: body?.source_file });
      status = 201;
      payload = { outcome: "staged", item: result.source, preview: result.preview, audit_event: result.audit_event };
    } else if (route.action === "import:mapping:write") {
      const result = importService.saveFieldMappings({ ...common, field_mappings: body?.field_mappings });
      payload = { outcome: "mapped", item: result.mapping, preview: result.preview, audit_event: result.audit_event };
    } else if (route.action === "import:dry_run") {
      const result = importService.dryRun(common);
      payload = { outcome: result.dry_run.outcome, ui_state: result.dry_run.ui_state, item: result.dry_run, audit_event: result.audit_event };
    } else if (route.action === "import:execute") {
      const result = importService.execute(common);
      payload = { outcome: result.execution.outcome, ui_state: result.execution.ui_state, item: result.execution, audit_event: result.audit_event };
    } else if (route.action === "import:rollback") {
      const result = importService.rollback(common);
      payload = { outcome: result.rollback.outcome, ui_state: result.rollback.ui_state, item: result.rollback, audit_event: result.audit_event };
    } else {
      return errorResponse(404, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.not_found], { ui_state: "empty" });
    }
    const response = responseBody(requestId, mergedQuery, {
      ...payload,
      state_idempotent: true,
      idempotent_replay: false,
    });
    recordIdempotency(repositories.repository, mergedQuery, idempotent.idempotencyKey, idempotent.operation, response);
    return { status, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [IMPORT_DATA_MAPPING_API_ERROR_CODES.validation_error], {
      ui_state: "blocked",
      message: error.message,
      audit_hint_ref: mergedQuery.audit_hint_ref,
    });
  }
}
