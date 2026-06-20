import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createFeeArrangement({ repository, fee_arrangement, rate_card, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(fee_arrangement, "tenant_id");
  requiredString(fee_arrangement, "matter_id");
  requiredString(fee_arrangement, "billing_profile_id");
  requiredString(fee_arrangement, "rate_card_id");
  if (rate_card && fee_arrangement.rate_card_id !== rate_card.rate_card_id) throw new Error("fee arrangement rate card mismatch");
  const rateRoles = new Set((rate_card?.role_rates ?? []).map((rate) => rate.role_id));
  for (const override of fee_arrangement.rate_overrides ?? []) {
    if (rateRoles.size > 0 && !rateRoles.has(override.role_id)) throw new Error("fee arrangement override role unknown");
    if (Number(override.hourly_rate) <= 0) throw new Error("fee arrangement override rate must be positive");
  }
  const replay = repository.getIdempotency({ tenant_id: fee_arrangement.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...fee_arrangement,
      model_type: "FeeArrangement",
      status: fee_arrangement.status ?? "active",
      rate_overrides: Object.freeze([...(fee_arrangement.rate_overrides ?? [])]),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "fee_arrangement.create",
        object_type: "FeeArrangement",
        object_id: record.fee_arrangement_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", fee_arrangement: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "fee_arrangement_create", response });
    return response;
  });
}
