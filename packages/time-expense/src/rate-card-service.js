import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertRates(roleRates = []) {
  if (!Array.isArray(roleRates) || roleRates.length === 0) throw new Error("role_rates are required");
  for (const rate of roleRates) {
    if (!rate?.role_id) throw new Error("rate role_id is required");
    const amount = Number(rate.hourly_rate);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("hourly_rate must be positive");
  }
}

export function createRateCard({ repository, rate_card, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(rate_card, "tenant_id");
  requiredString(rate_card, "currency");
  requiredString(rate_card, "effective_from");
  assertRates(rate_card.role_rates);
  if (rate_card.effective_to && Date.parse(rate_card.effective_to) < Date.parse(rate_card.effective_from)) {
    throw new Error("rate card effective date range invalid");
  }
  const replay = repository.getIdempotency({ tenant_id: rate_card.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...rate_card,
      model_type: "RateCard",
      status: rate_card.status ?? "active",
      role_rates: Object.freeze(rate_card.role_rates.map((rate) => Object.freeze({ ...rate }))),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "rate_card.create",
        object_type: "RateCard",
        object_id: record.rate_card_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", rate_card: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "rate_card_create", response });
    return response;
  });
}

export function rateForRole(rateCard, roleId) {
  const rate = rateCard?.role_rates?.find((item) => item.role_id === roleId);
  if (!rate) throw new Error(`RateCard missing role rate: ${roleId}`);
  return Number(rate.hourly_rate);
}
