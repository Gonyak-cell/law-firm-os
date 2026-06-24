import { createRecordActionService, normalizeRecordActionObject } from "../../../packages/record-actions/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { matchRecordActionRoute } from "./routes/record-actions.js";

export const RECORD_ACTIONS_API_ERROR_CODES = Object.freeze({
  tenant_required: "RECORD_ACTIONS_TENANT_REQUIRED",
  permission_required: "RECORD_ACTIONS_PERMISSION_REQUIRED",
  audit_hint_required: "RECORD_ACTIONS_AUDIT_HINT_REQUIRED",
  validation_error: "RECORD_ACTIONS_VALIDATION_ERROR",
  not_found: "RECORD_ACTIONS_NOT_FOUND",
  review_required: "RECORD_ACTIONS_REVIEW_REQUIRED",
  approval_required: "RECORD_ACTIONS_APPROVAL_REQUIRED",
});

export const RECORD_ACTIONS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "record-actions",
  contract_ref: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json",
  contract_schema_version: "law-firm-os.sf-client-matter-parity.record-actions.v0.1",
  endpoints: Object.freeze([
    "GET /api/record-actions/:object_name/fields",
    "GET /api/record-actions/:object_name/bulk-actions",
    "POST /api/record-actions/:object_name/:record_id/field-update",
    "POST /api/record-actions/:object_name/bulk-updates",
    "GET /api/record-actions/:object_name/:record_id/audit",
  ]),
  data_source: "matter_runtime_repository + crm_runtime_repository + master_data_repository",
  runtime_write_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

function createRuntime(runtime = {}) {
  const matterRuntime = runtime.matterRuntime ?? runtime.matter ?? {};
  const crmIntakeRuntime = runtime.crmIntakeRuntime ?? runtime.crm ?? {};
  const masterDataRuntime = runtime.masterDataRuntime ?? runtime.masterData ?? {};
  return Object.freeze({
    matterRepository: matterRuntime.repository,
    crmRepository: crmIntakeRuntime.crmRepository,
    masterDataRepository: masterDataRuntime.repository ?? crmIntakeRuntime.masterDataRepository,
  });
}

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
    return errorResponse(400, requestId, [RECORD_ACTIONS_API_ERROR_CODES.tenant_required]);
  }
  if (typeof query.permission_ref !== "string" || query.permission_ref.trim() === "") {
    return errorResponse(400, requestId, [RECORD_ACTIONS_API_ERROR_CODES.permission_required]);
  }
  if (typeof query.audit_hint_ref !== "string" || query.audit_hint_ref.trim() === "") {
    return errorResponse(400, requestId, [RECORD_ACTIONS_API_ERROR_CODES.audit_hint_required]);
  }
  return null;
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required") {
    return errorResponse(200, requestId, [RECORD_ACTIONS_API_ERROR_CODES.review_required], {
      outcome: "review_required",
      ui_state: "review_required",
      audit_hint_ref: auditHintRef,
    });
  }
  if (decision.effect === "approval_required") {
    return errorResponse(200, requestId, [RECORD_ACTIONS_API_ERROR_CODES.approval_required], {
      outcome: "approval_required",
      ui_state: "approval_required",
      audit_hint_ref: auditHintRef,
    });
  }
  return errorResponse(403, requestId, [RECORD_ACTIONS_API_ERROR_CODES.permission_required], {
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

function idempotencyRepository(objectName, runtime) {
  if (objectName === "matter") return runtime.matterRepository;
  return runtime.crmRepository;
}

function idempotencyReplay(repository, query, idempotencyKey, requestId) {
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
  repository?.recordIdempotency?.({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation,
    response,
    created_at: new Date().toISOString(),
  });
}

function service(runtime) {
  return createRecordActionService(runtime);
}

function registryResponse({ result, requestId, query }) {
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: result,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      production_ready_claim: false,
    },
  };
}

export function handleRecordActionsApiRequest({ pathname, method, query, body, context, requestId, runtime } = {}) {
  const route = matchRecordActionRoute({ pathname, method });
  if (!route) {
    return errorResponse(404, requestId, [RECORD_ACTIONS_API_ERROR_CODES.not_found], { ui_state: "empty" });
  }
  const objectName = normalizeRecordActionObject(route.params[0]);
  if (!objectName) {
    return errorResponse(400, requestId, [RECORD_ACTIONS_API_ERROR_CODES.validation_error], { ui_state: "blocked" });
  }
  const queryWithBody = {
    ...query,
    tenant_id: body?.tenant_id ?? query?.tenant_id,
    permission_ref: body?.permission_ref ?? query?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref ?? query?.audit_hint_ref,
  };
  const gated = routeGate({ context, query: queryWithBody, requestId, policy: route, resourceId: route.params[1] });
  if (gated) return gated;
  const repositories = createRuntime(runtime);
  const recordActionService = service(repositories);
  try {
    if (route.action === "record_action:field_registry:read") {
      return registryResponse({ result: recordActionService.registryFor(objectName), requestId, query: queryWithBody });
    }
    if (route.action === "record_action:bulk_registry:read") {
      return registryResponse({ result: recordActionService.bulkRegistryFor(objectName), requestId, query: queryWithBody });
    }
    if (route.action === "record_action:audit:read") {
      const audit = recordActionService.listAudit({
        objectName,
        tenant_id: queryWithBody.tenant_id,
        record_id: decodeURIComponent(route.params[1]),
      });
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: "passed",
          items: audit.items,
          page_info: { returned_count: audit.items.length, omitted_actor_count: null },
          safe_error_codes: [],
          audit_hint_ref: queryWithBody.audit_hint_ref,
          production_ready_claim: false,
        },
      };
    }
    const actorId = body?.actor_id ?? context?.principal?.user_id;
    if (route.action === "record_action:field_update") {
      const recordId = decodeURIComponent(route.params[1]);
      const idempotencyKey = body?.idempotency_key ?? `record-action-field-update:${objectName}:${recordId}:${Object.keys(body?.field_updates ?? {}).join(",")}`;
      const idempotencyRepo = idempotencyRepository(objectName, repositories);
      const replay = idempotencyReplay(idempotencyRepo, queryWithBody, idempotencyKey, requestId);
      if (replay) return replay;
      const result = recordActionService.patchRecord({
        objectName,
        tenant_id: queryWithBody.tenant_id,
        record_id: recordId,
        field_updates: body?.field_updates,
        actor_id: actorId,
        permission_ref: queryWithBody.permission_ref,
        audit_hint_ref: queryWithBody.audit_hint_ref,
        reason: body?.reason,
        occurred_at: body?.occurred_at,
      });
      const response = {
        request_id: requestId,
        outcome: "updated",
        item: result.item,
        field_patch: result.field_patch,
        audit_event: result.audit_event,
        state_idempotent: true,
        idempotent_replay: false,
        safe_error_codes: [],
        audit_hint_ref: queryWithBody.audit_hint_ref,
        production_ready_claim: false,
      };
      recordIdempotency(idempotencyRepo, queryWithBody, idempotencyKey, `record_action_field_update_${objectName}`, response);
      return { status: 200, body: response };
    }
    if (route.action === "record_action:bulk_update") {
      const idempotencyKey = body?.idempotency_key ?? `record-action-bulk:${objectName}:${body?.action_type}:${(body?.record_ids ?? []).join(":")}`;
      const idempotencyRepo = idempotencyRepository(objectName, repositories);
      const replay = idempotencyReplay(idempotencyRepo, queryWithBody, idempotencyKey, requestId);
      if (replay) return replay;
      const result = recordActionService.bulkUpdate({
        objectName,
        tenant_id: queryWithBody.tenant_id,
        record_ids: body?.record_ids,
        action_type: body?.action_type,
        field_updates: body?.field_updates,
        target_status: body?.target_status,
        actor_id: actorId,
        permission_ref: queryWithBody.permission_ref,
        audit_hint_ref: queryWithBody.audit_hint_ref,
        reason: body?.reason,
        occurred_at: body?.occurred_at,
        bulk_action_ref: body?.bulk_action_ref,
      });
      const response = {
        request_id: requestId,
        outcome: result.outcome,
        ui_state: result.ui_state,
        items: result.items ?? [],
        bulk_action: result.bulk_action,
        audit_event: result.audit_event,
        state_idempotent: true,
        idempotent_replay: false,
        safe_error_codes: [],
        audit_hint_ref: queryWithBody.audit_hint_ref,
        production_ready_claim: false,
      };
      recordIdempotency(idempotencyRepo, queryWithBody, idempotencyKey, `record_action_bulk_update_${objectName}`, response);
      return { status: 200, body: response };
    }
    return errorResponse(404, requestId, [RECORD_ACTIONS_API_ERROR_CODES.not_found], { ui_state: "empty" });
  } catch (error) {
    return errorResponse(error.message === "record not found" ? 404 : 400, requestId, [RECORD_ACTIONS_API_ERROR_CODES.validation_error], {
      ui_state: error.message === "record not found" ? "empty" : "blocked",
    });
  }
}
