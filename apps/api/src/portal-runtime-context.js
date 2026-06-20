import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { createExternalUser } from "../../../packages/client-portal/src/external-user-service.js";
import { createExternalAcl, createPortalDashboardProjection, createPortalProjection } from "../../../packages/client-portal/src/portal-projection-service.js";
import { createRfiRequest, createRfiResponse } from "../../../packages/client-portal/src/rfi-service.js";
import { createClientApproval } from "../../../packages/client-portal/src/approval-service.js";
import { createSecureLink } from "../../../packages/client-portal/src/secure-link-service.js";
import { createDataRoom, syncDataRoomProjection } from "../../../packages/data-room/src/data-room-runtime-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const PORTAL_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "client-portal-data-room",
  contract_ref: "contracts/client-portal-core-contract.json; contracts/data-room-vdr-core-contract.json",
  contract_schema_version: "law-firm-os.portal-data-room-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/portal/projections",
    "GET /api/portal/rfi",
    "GET /api/portal/dashboard",
    "POST /api/portal/external-users",
    "POST /api/portal/external-acls",
    "POST /api/portal/rfi",
    "POST /api/portal/rfi-responses",
    "POST /api/portal/approvals",
    "POST /api/portal/secure-links",
    "GET /api/data-room/rooms",
    "POST /api/data-room/rooms",
    "GET /api/data-room/projections",
    "POST /api/data-room/projections",
    "GET /api/portal/audit",
  ]),
  data_source: "client_portal_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const PORTAL_API_ERROR_CODES = Object.freeze({
  tenant_required: "PORTAL_TENANT_REQUIRED",
  permission_required: "PORTAL_PERMISSION_REQUIRED",
  audit_hint_required: "PORTAL_AUDIT_HINT_REQUIRED",
  validation_error: "PORTAL_API_VALIDATION_ERROR",
  unauthorized_omission: "PORTAL_UNAUTHORIZED_OMISSION",
  review_required: "PORTAL_REVIEW_REQUIRED",
  approval_required: "PORTAL_APPROVAL_REQUIRED",
  not_found: "PORTAL_NOT_FOUND",
});

export const PORTAL_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "ExternalUser",
    external_user_id: "external_user_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    client_group_id: "client_group_rp04_synthetic_atlas",
    email: "client-contact@example.invalid",
    status: "active",
  }),
  Object.freeze({
    model_type: "ExternalAcl",
    external_acl_id: "external_acl_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    external_user_id: "external_user_cmp_g10_seed",
    matter_id: "matter_rp05_synthetic_opening",
    allowed_object_refs: Object.freeze([{ object_type: "document", object_id: "document_cmp_g5_seed" }]),
    dms_acl_inherited: true,
    status: "active",
  }),
  Object.freeze({
    model_type: "PortalProjection",
    portal_projection_id: "portal_projection_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    external_user_id: "external_user_cmp_g10_seed",
    matter_id: "matter_rp05_synthetic_opening",
    visible_object_refs: Object.freeze([{ object_type: "rfi", object_id: "rfi_cmp_g10_seed" }]),
    dms_acl_inherited: true,
    status: "synced",
  }),
  Object.freeze({
    model_type: "RfiRequest",
    rfi_request_id: "rfi_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    external_user_id: "external_user_cmp_g10_seed",
    title: "Upload board minutes",
    status: "open",
  }),
  Object.freeze({
    model_type: "PortalDashboardProjection",
    dashboard_projection_id: "dashboard_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    client_group_id: "client_group_rp04_synthetic_atlas",
    matter_count: 1,
    open_rfi_count: 1,
    aggregate_only: true,
    status: "ready",
  }),
  Object.freeze({
    model_type: "DataRoom",
    data_room_id: "data_room_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    name: "Project Atlas diligence room",
    external_acl_required: true,
    status: "open",
  }),
  Object.freeze({
    model_type: "DataRoomProjection",
    data_room_projection_id: "data_room_projection_cmp_g10_seed",
    tenant_id: "tenant_cmp_g10_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    data_room_id: "data_room_cmp_g10_seed",
    source_document_refs: Object.freeze([{ object_type: "document", object_id: "document_cmp_g5_seed" }]),
    dms_acl_inherited: true,
    external_acl_applied: true,
    status: "synced",
  }),
]);

export function createPortalRuntimeContext({
  repository = createClientPortalRepository({ seedRecords: PORTAL_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({ repository, seed_ref: "cmp-g10-portal-data-room-synthetic" });
}

const DEFAULT_RUNTIME = createPortalRuntimeContext();

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
  if (!query.tenant_id) return errorResponse(400, requestId, [PORTAL_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [PORTAL_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [PORTAL_API_ERROR_CODES.audit_hint_required]);
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
        safe_error_codes: [decision.effect === "review_required" ? PORTAL_API_ERROR_CODES.review_required : PORTAL_API_ERROR_CODES.approval_required],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [PORTAL_API_ERROR_CODES.unauthorized_omission], { audit_hint_ref: query.audit_hint_ref, ui_state: "denied" });
}

function sanitizePortalItem(record) {
  const { document_bytes, storage_pointer, secret_token, credential_material, raw_payload, source_payload, ...safe } = record;
  return Object.freeze({
    ...safe,
    document_bytes_included: false,
    storage_pointer_ref_included: false,
    token_material_included: false,
    credential_material_included: false,
    raw_payload_included: false,
    source_payload_included: false,
    production_ready_claim: false,
  });
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType }).map(sanitizePortalItem);
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function writeResponse({ body, context, requestId, runtime, action, resourceType, tenantId, fn, itemKey }) {
  const query = { tenant_id: tenantId, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  try {
    const result = fn();
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
        item: sanitizePortalItem(result[itemKey]),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [PORTAL_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handlePortalAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "portal:audit:read", resourceType: "portal_audit" });
  if (gated) return gated;
  return { status: 200, body: { request_id: requestId, outcome: "passed", items: runtime.repository.listAudit({ tenant_id: query.tenant_id }), safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, count_leak_prevented: true, production_ready_claim: false } };
}

export async function handlePortalApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  if (pathname === "/api/portal/projections" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "portal:projection:read", resourceType: "portal_projection", modelType: "PortalProjection" });
  if (pathname === "/api/portal/rfi" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "portal:rfi:read", resourceType: "rfi_request", modelType: "RfiRequest" });
  if (pathname === "/api/portal/dashboard" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "portal:dashboard:read", resourceType: "portal_dashboard_projection", modelType: "PortalDashboardProjection" });
  if (pathname === "/api/data-room/rooms" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "data_room:read", resourceType: "data_room", modelType: "DataRoom" });
  if (pathname === "/api/data-room/projections" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "data_room:projection:read", resourceType: "data_room_projection", modelType: "DataRoomProjection" });
  if (pathname === "/api/portal/audit" && method === "GET") return handlePortalAudit({ query, context, requestId, runtime });

  if (pathname === "/api/portal/external-users" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:external_user:write", resourceType: "external_user", tenantId: body?.external_user?.tenant_id ?? body?.tenant_id, itemKey: "external_user", fn: () => createExternalUser({ repository: runtime.repository, external_user: body.external_user, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/external-acls" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:external_acl:write", resourceType: "external_acl", tenantId: body?.external_acl?.tenant_id ?? body?.tenant_id, itemKey: "external_acl", fn: () => createExternalAcl({ repository: runtime.repository, external_acl: body.external_acl, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/rfi" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:rfi:write", resourceType: "rfi_request", tenantId: body?.rfi_request?.tenant_id ?? body?.tenant_id, itemKey: "rfi_request", fn: () => createRfiRequest({ repository: runtime.repository, rfi_request: body.rfi_request, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/rfi-responses" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:rfi_response:write", resourceType: "rfi_response", tenantId: body?.rfi_response?.tenant_id ?? body?.tenant_id, itemKey: "rfi_response", fn: () => createRfiResponse({ repository: runtime.repository, rfi_response: body.rfi_response, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/approvals" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:approval:write", resourceType: "client_approval", tenantId: body?.client_approval?.tenant_id ?? body?.tenant_id, itemKey: "client_approval", fn: () => createClientApproval({ repository: runtime.repository, client_approval: body.client_approval, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/secure-links" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:secure_link:write", resourceType: "secure_link", tenantId: body?.secure_link?.tenant_id ?? body?.tenant_id, itemKey: "secure_link", fn: () => createSecureLink({ repository: runtime.repository, secure_link: body.secure_link, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/dashboard" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:dashboard:write", resourceType: "portal_dashboard_projection", tenantId: body?.dashboard_projection?.tenant_id ?? body?.tenant_id, itemKey: "dashboard_projection", fn: () => createPortalDashboardProjection({ repository: runtime.repository, dashboard_projection: body.dashboard_projection, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/portal/projections" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "portal:projection:write", resourceType: "portal_projection", tenantId: body?.portal_projection?.tenant_id ?? body?.tenant_id, itemKey: "portal_projection", fn: () => createPortalProjection({ repository: runtime.repository, portal_projection: body.portal_projection, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/data-room/rooms" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "data_room:write", resourceType: "data_room", tenantId: body?.data_room?.tenant_id ?? body?.tenant_id, itemKey: "data_room", fn: () => createDataRoom({ repository: runtime.repository, data_room: body.data_room, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/data-room/projections" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "data_room:projection:write", resourceType: "data_room_projection", tenantId: body?.data_room_projection?.tenant_id ?? body?.tenant_id, itemKey: "data_room_projection", fn: () => syncDataRoomProjection({ repository: runtime.repository, data_room_projection: body.data_room_projection, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });

  return errorResponse(404, requestId, [PORTAL_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
