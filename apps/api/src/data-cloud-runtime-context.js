import { createDataCloudEnrichmentService } from "../../../packages/data-cloud/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { matchDataCloudRoute } from "./routes/data-cloud.js";

export const DATA_CLOUD_API_ERROR_CODES = Object.freeze({
  tenant_required: "DATA_CLOUD_TENANT_REQUIRED",
  permission_required: "DATA_CLOUD_PERMISSION_REQUIRED",
  audit_hint_required: "DATA_CLOUD_AUDIT_HINT_REQUIRED",
  validation_error: "DATA_CLOUD_VALIDATION_ERROR",
  not_found: "DATA_CLOUD_NOT_FOUND",
  review_required: "DATA_CLOUD_REVIEW_REQUIRED",
  approval_required: "DATA_CLOUD_APPROVAL_REQUIRED",
});

export const DATA_CLOUD_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "data-cloud-enrichment",
  contract_ref: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json",
  contract_schema_version: "law-firm-os.sf-client-matter-parity.data-cloud-enrichment.v0.1",
  endpoints: Object.freeze([
    "GET /api/data-cloud/providers",
    "POST /api/data-cloud/providers",
    "POST /api/data-cloud/consent-records",
    "POST /api/data-cloud/enrichment-jobs",
    "GET /api/data-cloud/enrichment-jobs/:jobId/preview",
    "POST /api/data-cloud/enrichment-jobs/:jobId/execute",
    "GET /api/data-cloud/enrichment-results",
    "POST /api/data-cloud/identity-resolution",
    "GET /api/data-cloud/unified-profiles/:profileId",
    "POST /api/data-cloud/segment-activations",
    "GET /api/data-cloud/audit",
  ]),
  data_source: "matter_runtime_repository/data_cloud_records",
  runtime_write_ready: true,
  owner_gated_effects: true,
  provider_gated_effects: true,
  external_provider_runtime_enabled: false,
  product_record_mutation_allowed: false,
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
    return errorResponse(400, requestId, [DATA_CLOUD_API_ERROR_CODES.tenant_required]);
  }
  if (typeof query.permission_ref !== "string" || query.permission_ref.trim() === "") {
    return errorResponse(400, requestId, [DATA_CLOUD_API_ERROR_CODES.permission_required]);
  }
  if (typeof query.audit_hint_ref !== "string" || query.audit_hint_ref.trim() === "") {
    return errorResponse(400, requestId, [DATA_CLOUD_API_ERROR_CODES.audit_hint_required]);
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
    return errorResponse(200, requestId, [DATA_CLOUD_API_ERROR_CODES.review_required], {
      outcome: "review_required",
      ui_state: "review_required",
      audit_hint_ref: auditHintRef,
    });
  }
  if (decision.effect === "approval_required") {
    return errorResponse(200, requestId, [DATA_CLOUD_API_ERROR_CODES.approval_required], {
      outcome: "approval_required",
      ui_state: "approval_required",
      audit_hint_ref: auditHintRef,
    });
  }
  return errorResponse(403, requestId, [DATA_CLOUD_API_ERROR_CODES.permission_required], {
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
  return Object.freeze({ repository: matterRuntime.repository });
}

function service(runtime) {
  return createDataCloudEnrichmentService({ repository: runtime.repository });
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
    provider_payload_included: false,
    raw_identifiers_included: false,
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

export function handleDataCloudApiRequest({ pathname, method, query, body, context, requestId, runtime } = {}) {
  const route = matchDataCloudRoute({ pathname, method });
  if (!route) return errorResponse(404, requestId, [DATA_CLOUD_API_ERROR_CODES.not_found], { ui_state: "empty" });
  const mergedQuery = queryWithBody(query, body);
  const resourceId = route.params[0] ? decodeURIComponent(route.params[0]) : null;
  const gated = routeGate({ context, query: mergedQuery, requestId, policy: route, resourceId });
  if (gated) return gated;
  const repositories = createRuntime(runtime);
  const dataCloudService = service(repositories);

  try {
    if (route.action === "data_cloud:provider:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: dataCloudService.listProviders({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "data_cloud:enrichment_preview:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          item: dataCloudService.previewEnrichmentJob({
            tenant_id: mergedQuery.tenant_id,
            job_id: decodeURIComponent(route.params[0]),
          }),
        }),
      };
    }
    if (route.action === "data_cloud:enrichment_result:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: dataCloudService.listEnrichmentResults({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "data_cloud:unified_profile:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          item: dataCloudService.getUnifiedProfile({
            tenant_id: mergedQuery.tenant_id,
            profile_id: decodeURIComponent(route.params[0]),
          }),
        }),
      };
    }
    if (route.action === "data_cloud:audit:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: dataCloudService.listAudit({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }

    const writeCheck = validateIdempotentWrite(repositories.repository, mergedQuery, body, requestId, route.action);
    if (writeCheck.replay) return writeCheck.replay;
    const common = commonInput(mergedQuery, body, context);
    let status = 200;
    let payload;
    if (route.action === "data_cloud:provider:register") {
      const result = dataCloudService.registerProvider({ ...common, ...body });
      status = 201;
      payload = { outcome: "provider_blocked", ui_state: "provider_blocked", item: result.provider, audit_event: result.audit_event };
    } else if (route.action === "data_cloud:consent:write") {
      const result = dataCloudService.recordConsent({ ...common, ...body });
      status = 201;
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.consent_record, audit_event: result.audit_event };
    } else if (route.action === "data_cloud:enrichment_job:create") {
      const result = dataCloudService.createEnrichmentJob({ ...common, ...body });
      status = 201;
      payload = {
        outcome: "passed",
        ui_state: "route_mounted",
        item: result.job,
        audit_event: result.audit_event,
        provider_call_performed: false,
        product_records_mutated: false,
      };
    } else if (route.action === "data_cloud:enrichment_job:execute") {
      const result = dataCloudService.executeEnrichmentJob({
        ...common,
        ...body,
        job_id: decodeURIComponent(route.params[0]),
      });
      payload = {
        outcome: "provider_blocked",
        ui_state: "provider_blocked",
        item: result.job,
        result: result.result,
        audit_event: result.audit_event,
      };
    } else if (route.action === "data_cloud:identity_resolution:write") {
      const result = dataCloudService.runIdentityResolution({ ...common, ...body });
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.identity_resolution, audit_event: result.audit_event };
    } else if (route.action === "data_cloud:segment_activation:create") {
      const result = dataCloudService.createSegmentActivation({ ...common, ...body });
      status = 201;
      payload = { outcome: "provider_blocked", ui_state: "provider_blocked", item: result.segment_activation, audit_event: result.audit_event };
    } else {
      return errorResponse(404, requestId, [DATA_CLOUD_API_ERROR_CODES.not_found], { ui_state: "empty" });
    }
    const response = responseBody(requestId, mergedQuery, payload);
    recordIdempotency(repositories.repository, mergedQuery, writeCheck.idempotencyKey, writeCheck.operation, response);
    return { status, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [DATA_CLOUD_API_ERROR_CODES.validation_error], {
      ui_state: "blocked",
      validation_message: error instanceof Error ? error.message : "data cloud validation failed",
    });
  }
}
