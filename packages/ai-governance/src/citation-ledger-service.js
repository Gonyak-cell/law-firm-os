import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createCitationLedger({ repository, citation_ledger, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(citation_ledger, "tenant_id");
  requiredString(citation_ledger, "ai_output_id");
  if (!Array.isArray(citation_ledger.sources) || citation_ledger.sources.length === 0) throw new Error("citation sources are required");
  const replay = repository.getIdempotency({ tenant_id: citation_ledger.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...citation_ledger, model_type: "CitationLedger", citation_source_validation: true, raw_source_payload_included: false });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.citation.ledger", object_type: "CitationLedger", object_id: record.citation_ledger_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", citation_ledger: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_citation_ledger", response });
    return response;
  });
}
