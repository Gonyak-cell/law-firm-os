export const FEE_COMMITMENT_STATUSES = Object.freeze([
  "active",
  "superseded",
  "cancelled",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(value, field) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString({ [field]: value }, field);
}

function calendarDate(value, field) {
  const normalized = optionalString(value, field);
  if (normalized === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    throw new TypeError(`${field} must be YYYY-MM-DD`);
  }
  const milliseconds = Date.parse(`${normalized}T00:00:00.000Z`);
  if (
    !Number.isFinite(milliseconds)
    || new Date(milliseconds).toISOString().slice(0, 10) !== normalized
  ) {
    throw new TypeError(`${field} must be a valid calendar date`);
  }
  return normalized;
}

function instant(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (
    !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(normalized)
    || !Number.isFinite(Date.parse(normalized))
  ) {
    throw new TypeError(`${field} must be a valid instant with an explicit UTC offset`);
  }
  return normalized;
}

function agreedAmount(value) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("agreed_amount must be null or a non-negative whole KRW amount");
  }
  return value;
}

export function normalizeFeeCommitment(input = {}) {
  if (input.model_type && input.model_type !== "FeeCommitment") {
    throw new TypeError("FeeCommitment.model_type is invalid");
  }
  const status = input.status ?? "active";
  if (!FEE_COMMITMENT_STATUSES.includes(status)) throw new TypeError("FeeCommitment.status is invalid");
  if (input.currency !== "KRW") throw new TypeError("FeeCommitment.currency must be KRW");
  if (input.agreed_amount === undefined) {
    throw new TypeError("agreed_amount must be explicitly set to a whole KRW amount or null");
  }
  const stateVersion = input.state_version ?? 1;
  if (typeof stateVersion !== "number" || !Number.isSafeInteger(stateVersion) || stateVersion < 1) {
    throw new TypeError("FeeCommitment.state_version must be a positive integer");
  }
  return Object.freeze({
    ...input,
    model_type: "FeeCommitment",
    fee_commitment_id: requiredString(input, "fee_commitment_id"),
    tenant_id: requiredString(input, "tenant_id"),
    client_group_id: requiredString(input, "client_group_id"),
    opportunity_id: requiredString(input, "opportunity_id"),
    matter_id: optionalString(input.matter_id, "matter_id"),
    currency: "KRW",
    agreed_amount: agreedAmount(input.agreed_amount),
    due_date: calendarDate(input.due_date, "due_date"),
    accepted_at: instant(input.accepted_at, "accepted_at"),
    status,
    source_fee_arrangement_id: optionalString(
      input.source_fee_arrangement_id,
      "source_fee_arrangement_id",
    ),
    state_version: stateVersion,
    created_by: requiredString(input, "created_by"),
    updated_by: requiredString(input, "updated_by"),
    reason: requiredString(input, "reason"),
    writes_product_state: true,
    evaluates_runtime_permission: true,
    writes_audit_event: true,
    production_ready_claim: false,
  });
}
