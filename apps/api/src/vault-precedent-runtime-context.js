import { createHash } from "node:crypto";
import {
  PRECEDENT_APPROVAL_AUTHORITY,
  PRECEDENT_PRIVILEGE_AUTHORITY,
  hashValue,
} from "../../../packages/dms/src/search/precedent-common.js";
import { evaluateRouteDecision } from "./permission-gate.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function requiredId(value, field) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!SAFE_ID.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function blocked(status, requestId, code) {
  return { status, body: { request_id: requestId, outcome: "blocked", item: null,
    safe_error_codes: [code], count_leak_prevented: true,
    production_ready_claim: false } };
}

function actualDecisionId(decision, requestId, resourceId) {
  return `decision:${createHash("sha256").update(JSON.stringify({ request_id: requestId,
    resource_id: resourceId, effect: decision.effect, reason: decision.reason ?? null,
    matched_rule_id: decision.matched_rule_id ?? null })).digest("hex")}`;
}

function authorized({ context, action, tenantId, matterId = null,
  resourceId, resourceType = "precedent_source" }) {
  const decision = evaluateRouteDecision({ context, action,
    resource: { tenant_id: tenantId, matter_id: matterId,
      resource_type: resourceType, resource_id: resourceId } });
  return decision.effect === "allow" ? decision : null;
}

function runtimeRepository(runtime) {
  const repository = runtime?.precedent_search_runtime?.repository;
  return repository?.registerSource && repository?.disableSource
    && repository?.unapproveSource && repository?.classifyDocumentPrivilege
    && repository?.readiness ? repository : null;
}

export async function handleVaultPrecedentApiRequest({
  pathname, method, query = {}, body = {}, context, requestId, runtime,
} = {}) {
  const repository = runtimeRepository(runtime);
  if (!repository) return blocked(503, requestId, "VAULT_PRECEDENT_RUNTIME_UNAVAILABLE");
  try {
    const tenantId = requiredId(context?.principal?.tenant_id, "principal.tenant_id");
    const requestedTenant = body.tenant_id ?? query.tenant_id;
    if (requestedTenant != null && requestedTenant !== ""
        && requiredId(requestedTenant, "tenant_id") !== tenantId) {
      return blocked(403, requestId, "VAULT_PRECEDENT_TENANT_MISMATCH");
    }
    const actorId = requiredId(context.principal.user_id ?? context.principal.actor_id,
      "principal.user_id");
    const privilege = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/privilege-label$/u);
    if (privilege && method === "POST") {
      const documentId = requiredId(decodeURIComponent(privilege[1]), "document_id");
      const decision = authorized({ context, action: "dms:document:privilege:classify",
        tenantId, resourceId: documentId, resourceType: "dms_document" });
      if (!decision) return blocked(403, requestId, "VAULT_PRECEDENT_PERMISSION_DENIED");
      const decisionId = actualDecisionId(decision, requestId, documentId);
      const result = await repository.classifyDocumentPrivilege({ tenant_id: tenantId,
        document_id: documentId, classification: body.classification,
        label_id: `privilege:${hashValue({ request_id: requestId, document_id: documentId })}`,
        authority: PRECEDENT_PRIVILEGE_AUTHORITY, decision_id: decisionId,
        provenance_sha256: hashValue({ request_id: requestId, document_id: documentId,
          classification: body.classification, decision_id: decisionId }),
        applied_by: actorId, applied_at: new Date().toISOString() });
      return { status: 200, body: { request_id: requestId, outcome: "passed",
        item: result, safe_error_codes: [], production_ready_claim: false } };
    }
    if (pathname === "/api/vault/precedent-sources" && method === "POST") {
      const sourceId = requiredId(body.source_id, "source_id");
      const matterId = requiredId(body.matter_id, "matter_id");
      const decision = authorized({ context, action: "dms:precedent:source:register",
        tenantId, matterId, resourceId: body.document_id });
      if (!decision) return blocked(403, requestId, "VAULT_PRECEDENT_PERMISSION_DENIED");
      const result = await repository.registerSource({ ...body, tenant_id: tenantId,
        source_id: sourceId, matter_id: matterId, actor_id: actorId,
        approval_decision_id: actualDecisionId(decision, requestId, sourceId),
        approval_authority: PRECEDENT_APPROVAL_AUTHORITY,
        approved_by: actorId, approved_at: new Date().toISOString() });
      return { status: 200, body: { request_id: requestId, outcome: "passed",
        item: result.source, index_stale: true, safe_error_codes: [],
        production_ready_claim: false } };
    }
    const transition = pathname.match(/^\/api\/vault\/precedent-sources\/([^/]+)\/(disable|unapprove)$/u);
    if (transition && method === "POST") {
      const sourceId = requiredId(decodeURIComponent(transition[1]), "source_id");
      const action = `dms:precedent:source:${transition[2]}`;
      if (!authorized({ context, action, tenantId, resourceId: sourceId })) {
        return blocked(403, requestId, "VAULT_PRECEDENT_PERMISSION_DENIED");
      }
      const operation = transition[2] === "disable"
        ? repository.disableSource : repository.unapproveSource;
      const result = await operation({ tenant_id: tenantId, source_id: sourceId,
        actor_id: actorId, idempotency_key: body.idempotency_key });
      return { status: 200, body: { request_id: requestId, outcome: "passed",
        item: result.source, safe_error_codes: [], production_ready_claim: false } };
    }
    if (pathname === "/api/vault/precedents/readiness" && method === "GET") {
      if (!authorized({ context, action: "dms:precedent:readiness:read",
        tenantId, resourceId: "precedent-runtime" })) {
        return blocked(403, requestId, "VAULT_PRECEDENT_PERMISSION_DENIED");
      }
      const readiness = await repository.readiness({ tenant_id: tenantId });
      return { status: readiness.runtime_ready ? 200 : 503,
        body: { request_id: requestId, outcome: readiness.runtime_ready ? "passed" : "blocked",
          runtime_ready: readiness.runtime_ready === true,
          authoritative: readiness.authoritative === true,
          index_version: readiness.index_version ?? null,
          safe_error_codes: readiness.safe_error_code ? [readiness.safe_error_code] : [],
          production_ready_claim: false } };
    }
    return null;
  } catch (error) {
    const code = /^[A-Z0-9_]+$/u.test(error?.safe_error_code ?? "")
      ? error.safe_error_code : "VAULT_PRECEDENT_VALIDATION_ERROR";
    return blocked(Number.isInteger(error?.status) ? error.status : 400, requestId, code);
  }
}
