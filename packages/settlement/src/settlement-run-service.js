import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createSettlementRun({ repository, settlement_run, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(settlement_run, "tenant_id");
  const paymentRefs = settlement_run.payment_match_refs ?? [];
  if (!Array.isArray(paymentRefs) || paymentRefs.length === 0) throw new Error("settlement run requires payment_match_refs");
  const replay = repository.getIdempotency({ tenant_id: settlement_run.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...settlement_run,
      model_type: "SettlementRun",
      status: "closed",
      closed_at: settlement_run.closed_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "settlement.run.close",
        object_type: "SettlementRun",
        object_id: record.settlement_run_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", settlement_run: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "settlement_run_close", response });
    return response;
  });
}
