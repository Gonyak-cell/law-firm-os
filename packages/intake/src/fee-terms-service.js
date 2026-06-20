import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function approveFeeTerms({ repository, fee_terms, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(fee_terms, "tenant_id");
  requiredString(fee_terms, "billing_profile_id");
  requiredString(fee_terms, "rate_card_ref");
  const replay = repository.getIdempotency({ tenant_id: fee_terms.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...fee_terms,
      model_type: "FeeTerms",
      status: "approved",
      approved_at: fee_terms.approved_at ?? new Date().toISOString(),
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "fee_terms.approved",
        object_type: "FeeTerms",
        object_id: record.fee_terms_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "approved", fee_terms: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "fee_terms_approve", response });
    return response;
  });
}
