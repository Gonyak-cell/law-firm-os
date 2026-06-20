import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function assertPermissionBeforeAi({ policy, candidate_docs = [], authorized_doc_ids = [] } = {}) {
  if (policy?.disable_switch_on === true) throw new Error("AI disable switch is on");
  const allowed = new Set(authorized_doc_ids);
  const retrieved = candidate_docs.filter((doc) => allowed.has(doc.document_id));
  if (retrieved.some((doc) => doc.privilege_label && doc.privilege_label_inherited !== true)) {
    throw new Error("privilege label inheritance required before AI retrieval");
  }
  return Object.freeze({ retrieved_doc_ids: Object.freeze(retrieved.map((doc) => doc.document_id)), unauthorized_doc_excluded: true });
}

export function createRetrievalRequest({ repository, retrieval_request, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(retrieval_request, "tenant_id");
  requiredString(retrieval_request, "matter_id");
  if (!Array.isArray(retrieval_request.source_refs) || retrieval_request.source_refs.length === 0) throw new Error("source_refs are required");
  const replay = repository.getIdempotency({ tenant_id: retrieval_request.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...retrieval_request, model_type: "RetrievalRequest", status: "permission_checked", raw_payload_included: false });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.retrieval.request", object_type: "RetrievalRequest", object_id: record.retrieval_request_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", retrieval_request: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_retrieval_request", response });
    return response;
  });
}
