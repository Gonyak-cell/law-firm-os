import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export const FEE_ARRANGEMENT_TYPES = Object.freeze(["hourly", "fixed", "success_fee", "retainer"]);

function moneyValue(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new TypeError(`${field} must be zero or positive`);
  return Math.round(parsed * 100) / 100;
}

export function normalizeFeeArrangementType(feeArrangement = {}) {
  const type = feeArrangement.type ?? feeArrangement.arrangement_type ?? "hourly";
  if (type === "fixed_fee") return "fixed";
  if (type === "upfront_success" || type === "success") return "success_fee";
  if (!FEE_ARRANGEMENT_TYPES.includes(type)) throw new Error("unsupported fee arrangement type");
  return type;
}

function assertPositive(value, field) {
  if (moneyValue(value, field) <= 0) throw new TypeError(`${field} must be positive`);
}

function validateFeeArrangementTerms(feeArrangement = {}, type) {
  if (type === "fixed") assertPositive(feeArrangement.fixed_fee_amount, "fixed_fee_amount");
  if (type === "success_fee") {
    moneyValue(feeArrangement.upfront_fee_amount ?? 0, "upfront_fee_amount");
    assertPositive(feeArrangement.success_fee_amount, "success_fee_amount");
  }
  if (type === "retainer") assertPositive(feeArrangement.retainer_amount, "retainer_amount");
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
  const type = normalizeFeeArrangementType(fee_arrangement);
  validateFeeArrangementTerms(fee_arrangement, type);
  const replay = repository.getIdempotency({ tenant_id: fee_arrangement.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...fee_arrangement,
      model_type: "FeeArrangement",
      status: fee_arrangement.status ?? "active",
      type,
      arrangement_type: type,
      fixed_fee_amount: type === "fixed" ? moneyValue(fee_arrangement.fixed_fee_amount, "fixed_fee_amount") : null,
      upfront_fee_amount: type === "success_fee" ? moneyValue(fee_arrangement.upfront_fee_amount ?? 0, "upfront_fee_amount") : null,
      success_fee_amount: type === "success_fee" ? moneyValue(fee_arrangement.success_fee_amount, "success_fee_amount") : null,
      success_condition_met: type === "success_fee" ? fee_arrangement.success_condition_met === true : false,
      retainer_amount: type === "retainer" ? moneyValue(fee_arrangement.retainer_amount, "retainer_amount") : null,
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

export function findFeeArrangementForMatter({ repository, tenant_id, matter_id, fee_arrangement_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  if (fee_arrangement_id) return repository.get({ tenant_id, model_type: "FeeArrangement", fee_arrangement_id });
  return repository
    .list({ tenant_id, matter_id, model_type: "FeeArrangement" })
    .filter((arrangement) => arrangement.status === "active")
    .at(-1) ?? null;
}
