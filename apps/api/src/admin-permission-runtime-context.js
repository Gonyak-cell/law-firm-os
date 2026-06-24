import { createPermissionAdminSetupService } from "../../../packages/admin/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { matchAdminPermissionRoute } from "./routes/admin-permission.js";

export const ADMIN_PERMISSION_API_ERROR_CODES = Object.freeze({
  tenant_required: "ADMIN_PERMISSION_TENANT_REQUIRED",
  permission_required: "ADMIN_PERMISSION_PERMISSION_REQUIRED",
  audit_hint_required: "ADMIN_PERMISSION_AUDIT_HINT_REQUIRED",
  validation_error: "ADMIN_PERMISSION_VALIDATION_ERROR",
  not_found: "ADMIN_PERMISSION_NOT_FOUND",
  review_required: "ADMIN_PERMISSION_REVIEW_REQUIRED",
  approval_required: "ADMIN_PERMISSION_APPROVAL_REQUIRED",
});

export const ADMIN_PERMISSION_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "admin-permission-setup",
  contract_ref: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json",
  contract_schema_version: "law-firm-os.sf-client-matter-parity.permission-admin.v0.1",
  endpoints: Object.freeze([
    "GET /api/admin/permission-sets",
    "POST /api/admin/permission-sets",
    "PATCH /api/admin/permission-sets/:permissionSetId",
    "GET /api/admin/permission-assignments",
    "POST /api/admin/permission-assignments",
    "DELETE /api/admin/permission-assignments/:assignmentId",
    "GET /api/admin/object-manager/objects",
    "GET /api/admin/object-manager/objects/:objectName/fields",
    "PATCH /api/admin/object-manager/objects/:objectName/fields/:fieldName",
    "GET /api/admin/connected-apps",
    "POST /api/admin/connected-apps",
    "POST /api/admin/connected-apps/:appId/disable",
    "GET /api/admin/audit",
  ]),
  data_source: "matter_runtime_repository/admin_permission_records",
  runtime_write_ready: true,
  owner_gated_effects: true,
  provider_gated_effects: true,
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
    return errorResponse(400, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.tenant_required]);
  }
  if (typeof query.permission_ref !== "string" || query.permission_ref.trim() === "") {
    return errorResponse(400, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.permission_required]);
  }
  if (typeof query.audit_hint_ref !== "string" || query.audit_hint_ref.trim() === "") {
    return errorResponse(400, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.audit_hint_required]);
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
    return errorResponse(200, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.review_required], {
      outcome: "review_required",
      ui_state: "review_required",
      audit_hint_ref: auditHintRef,
    });
  }
  if (decision.effect === "approval_required") {
    return errorResponse(200, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.approval_required], {
      outcome: "approval_required",
      ui_state: "approval_required",
      audit_hint_ref: auditHintRef,
    });
  }
  return errorResponse(403, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.permission_required], {
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
  return createPermissionAdminSetupService({ repository: runtime.repository });
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

export function handleAdminPermissionApiRequest({ pathname, method, query, body, context, requestId, runtime } = {}) {
  const route = matchAdminPermissionRoute({ pathname, method });
  if (!route) return errorResponse(404, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.not_found], { ui_state: "empty" });
  const mergedQuery = queryWithBody(query, body);
  const resourceId = route.params[0] ? decodeURIComponent(route.params[0]) : null;
  const gated = routeGate({ context, query: mergedQuery, requestId, policy: route, resourceId });
  if (gated) return gated;
  const repositories = createRuntime(runtime);
  const adminService = service(repositories);

  try {
    if (route.action === "admin:permission_set:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: adminService.listPermissionSets({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "admin:permission_assignment:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: adminService.listAssignments({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "admin:object_manager:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: adminService.listObjects({ tenant_id: mergedQuery.tenant_id }),
          physical_schema_mutation_allowed: false,
        }),
      };
    }
    if (route.action === "admin:object_manager:field_read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: adminService.listObjectFields({ tenant_id: mergedQuery.tenant_id, object_name: decodeURIComponent(route.params[0]) }),
          physical_schema_mutation_allowed: false,
        }),
      };
    }
    if (route.action === "admin:connected_app:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: adminService.listConnectedApps({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "admin:audit:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: adminService.listAudit({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }

    const writeCheck = validateIdempotentWrite(repositories.repository, mergedQuery, body, requestId, route.action);
    if (writeCheck.replay) return writeCheck.replay;
    const common = commonInput(mergedQuery, body, context);
    let status = 200;
    let payload;
    if (route.action === "admin:permission_set:write") {
      const result = adminService.createPermissionSet({ ...common, ...body });
      status = 201;
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.permission_set, audit_event: result.audit_event };
    } else if (route.action === "admin:permission_set:patch") {
      const result = adminService.patchPermissionSet({ ...common, permission_set_id: decodeURIComponent(route.params[0]), patch: body?.patch ?? body });
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.permission_set, audit_event: result.audit_event };
    } else if (route.action === "admin:permission_assignment:write") {
      const result = adminService.assignPermissionSet({ ...common, ...body });
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.assignment, audit_event: result.audit_event };
    } else if (route.action === "admin:permission_assignment:revoke") {
      const result = adminService.revokePermissionSetAssignment({ ...common, ...body, assignment_id: decodeURIComponent(route.params[0]) });
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.assignment, audit_event: result.audit_event };
    } else if (route.action === "admin:object_manager:patch") {
      const result = adminService.patchObjectFieldPolicy({
        ...common,
        ...body,
        object_name: decodeURIComponent(route.params[0]),
        field_name: decodeURIComponent(route.params[1]),
      });
      payload = {
        outcome: "owner_blocked",
        ui_state: "owner_blocked",
        item: result.field_policy,
        audit_event: result.audit_event,
        physical_schema_mutated: false,
      };
    } else if (route.action === "admin:connected_app:write") {
      const result = adminService.createConnectedApp({ ...common, ...body });
      status = 201;
      payload = { outcome: "provider_blocked", ui_state: "provider_blocked", item: result.connected_app, audit_event: result.audit_event };
    } else if (route.action === "admin:connected_app:disable") {
      const result = adminService.disableConnectedApp({ ...common, ...body, app_id: decodeURIComponent(route.params[0]) });
      payload = { outcome: "provider_blocked", ui_state: "provider_blocked", item: result.connected_app, audit_event: result.audit_event };
    } else {
      return errorResponse(404, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.not_found], { ui_state: "empty" });
    }
    const response = responseBody(requestId, mergedQuery, payload);
    recordIdempotency(repositories.repository, mergedQuery, writeCheck.idempotencyKey, writeCheck.operation, response);
    return { status, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [ADMIN_PERMISSION_API_ERROR_CODES.validation_error], {
      ui_state: "blocked",
      validation_message: error instanceof Error ? error.message : "admin permission validation failed",
    });
  }
}
