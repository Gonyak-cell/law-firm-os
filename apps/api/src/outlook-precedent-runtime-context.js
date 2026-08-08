import { createHash } from "node:crypto";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

const SAFE_CODE = /^[A-Z0-9_]+$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function requiredId(value, field) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!SAFE_ID.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function safeError(status, requestId, safeErrorCode, auditHintRef = null) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      next_cursor: null,
      audit_hint_ref: auditHintRef,
      safe_error_codes: [safeErrorCode],
      count_leak_prevented: true,
      raw_body_included: false,
      storage_pointer_ref_included: false,
      production_ready_claim: false,
    },
  };
}

function principalForRequest(context, requestedTenantId) {
  const tenantId = requiredId(context?.principal?.tenant_id, "principal.tenant_id");
  if (requestedTenantId != null && requestedTenantId !== ""
      && requiredId(requestedTenantId, "tenant_id") !== tenantId) {
    throw Object.assign(new Error("Outlook precedent tenant mismatch"), {
      status: 403,
      safe_error_code: "OUTLOOK_PRECEDENT_TENANT_MISMATCH",
    });
  }
  return Object.freeze({
    tenant_id: tenantId,
    actor_id: requiredId(
      context.principal.user_id ?? context.principal.actor_id,
      "principal.user_id",
    ),
  });
}

function permissionDecisionId(permissionRef, requestId) {
  return `decision:${createHash("sha256")
    .update(`${permissionRef}\u0000${requestId}`)
    .digest("hex")}`;
}

export async function handleOutlookPrecedentSearch({
  query = {},
  context,
  requestId,
  runtime,
} = {}) {
  let auditHintRef = null;
  try {
    auditHintRef = requiredId(query.audit_hint_ref, "audit_hint_ref");
    const permissionRef = requiredId(query.permission_ref, "permission_ref");
    const principal = principalForRequest(context, query.tenant_id);
    const matterId = requiredId(query.matter_id, "matter_id");
    const repository = runtime?.precedentSearchRuntime?.repository;
    const matterRepository = runtime?.matterRuntime?.repository;
    if (!repository
        || typeof repository.listSourceDescriptors !== "function"
        || typeof repository.readiness !== "function"
        || typeof repository.search !== "function"
        || !matterRepository
        || typeof matterRepository.get !== "function") {
      return safeError(503, requestId, "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE", auditHintRef);
    }

    const matterDecision = evaluateRouteDecision({
      context,
      action: "outlook:precedent:search",
      resource: {
        tenant_id: principal.tenant_id,
        matter_id: matterId,
        resource_type: "matter",
        resource_id: matterId,
      },
    });
    if (matterDecision.effect !== "allow") {
      return safeError(403, requestId, "OUTLOOK_PRECEDENT_PERMISSION_DENIED", auditHintRef);
    }
    const matter = matterRepository.get({
      tenant_id: principal.tenant_id,
      model_type: "Matter",
      matter_id: matterId,
    });
    if (!matter) {
      return safeError(404, requestId, "OUTLOOK_PRECEDENT_MATTER_NOT_FOUND", auditHintRef);
    }

    const descriptors = await repository.listSourceDescriptors({
      tenant_id: principal.tenant_id,
    });
    const { allowed } = trimItemsByPermission({
      context,
      items: descriptors,
      action: "dms:document:read",
      resourceType: "dms_document",
    });
    const allowedDocumentIds = allowed.map((item) => item.document_id);
    const readiness = await repository.readiness({
      tenant_id: principal.tenant_id,
      allowed_document_ids: allowedDocumentIds,
    });
    if (readiness.runtime_ready !== true) {
      const code = SAFE_CODE.test(readiness.safe_error_code ?? "")
        ? readiness.safe_error_code
        : "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE";
      return safeError(code === "PRECEDENT_INDEX_STALE" ? 409 : 503, requestId, code, auditHintRef);
    }

    const result = await repository.search({
      tenant_id: principal.tenant_id,
      matter_id: matterId,
      actor_id: principal.actor_id,
      audit_hint_ref: auditHintRef,
      permission_decision_id: permissionDecisionId(permissionRef, requestId),
      query: query.q,
      limit: query.limit == null || query.limit === "" ? 10 : Number(query.limit),
      cursor: query.cursor,
      allowed_document_ids: allowedDocumentIds,
      include_current_matter: false,
      search_mode: "precedent",
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: result.items,
        next_cursor: result.next_cursor,
        page_info: {
          returned_count: result.items.length,
          has_more: result.next_cursor != null,
        },
        audit_hint_ref: auditHintRef,
        safe_error_codes: [],
        count_leak_prevented: true,
        raw_body_included: false,
        storage_pointer_ref_included: false,
        index_version: result.index_version,
        index_stale: false,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    const code = SAFE_CODE.test(error?.safe_error_code ?? "")
      ? error.safe_error_code
      : "OUTLOOK_PRECEDENT_VALIDATION_ERROR";
    return safeError(Number.isInteger(error?.status) ? error.status : 400, requestId, code, auditHintRef);
  }
}
