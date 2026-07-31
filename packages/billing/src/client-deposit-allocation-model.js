export const CLIENT_DEPOSIT_ALLOCATION_SOURCES = Object.freeze([
  "automatic",
  "manual",
]);

export const CLIENT_DEPOSIT_ALLOCATION_STATUSES = Object.freeze([
  "active",
  "reversed",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function wholeKrw(value, field, { positive = false } = {}) {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || (positive ? value <= 0 : value < 0)
  ) {
    const qualifier = positive ? "positive" : "non-negative";
    throw new TypeError(`${field} must be a ${qualifier} whole KRW amount`);
  }
  return value;
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

export function normalizeClientDepositAllocation(input = {}) {
  if (input.model_type && input.model_type !== "ClientDepositAllocation") {
    throw new TypeError("ClientDepositAllocation.model_type is invalid");
  }
  if (input.currency !== "KRW") {
    throw new TypeError("ClientDepositAllocation.currency must be KRW");
  }
  const allocatedAmount = wholeKrw(
    input.allocated_amount,
    "allocated_amount",
    { positive: true },
  );
  const reversedAmount = wholeKrw(input.reversed_amount, "reversed_amount");
  if (reversedAmount > allocatedAmount) {
    throw new TypeError("reversed_amount cannot exceed allocated_amount");
  }
  const refundReversedAmount = input.refund_reversed_amount === undefined
    ? input.adjustment_reversed_amount === undefined
      ? reversedAmount
      : reversedAmount - wholeKrw(
        input.adjustment_reversed_amount,
        "adjustment_reversed_amount",
      )
    : wholeKrw(
      input.refund_reversed_amount,
      "refund_reversed_amount",
    );
  const adjustmentReversedAmount =
    input.adjustment_reversed_amount === undefined
      ? reversedAmount - refundReversedAmount
      : wholeKrw(
        input.adjustment_reversed_amount,
        "adjustment_reversed_amount",
      );
  if (
    refundReversedAmount < 0
    || adjustmentReversedAmount < 0
    || refundReversedAmount + adjustmentReversedAmount !== reversedAmount
  ) {
    throw new TypeError(
      "refund_reversed_amount and adjustment_reversed_amount must equal reversed_amount",
    );
  }
  const allocationSource = requiredString(input, "allocation_source");
  if (!CLIENT_DEPOSIT_ALLOCATION_SOURCES.includes(allocationSource)) {
    throw new TypeError("ClientDepositAllocation.allocation_source is invalid");
  }
  if (typeof input.manual_lock !== "boolean") {
    throw new TypeError("ClientDepositAllocation.manual_lock must be a boolean");
  }
  const expectedManualLock = allocationSource === "manual";
  if (input.manual_lock !== expectedManualLock) {
    throw new TypeError(
      "ClientDepositAllocation.manual_lock must be true only for a manual allocation",
    );
  }
  const status = reversedAmount === allocatedAmount ? "reversed" : "active";
  if (input.status !== undefined && input.status !== status) {
    throw new TypeError("ClientDepositAllocation.status does not match reversed_amount");
  }
  const stateVersion = input.state_version ?? 1;
  if (
    typeof stateVersion !== "number"
    || !Number.isSafeInteger(stateVersion)
    || stateVersion < 1
  ) {
    throw new TypeError("ClientDepositAllocation.state_version must be a positive integer");
  }
  return Object.freeze({
    ...input,
    model_type: "ClientDepositAllocation",
    client_deposit_allocation_id: requiredString(
      input,
      "client_deposit_allocation_id",
    ),
    tenant_id: requiredString(input, "tenant_id"),
    client_group_id: requiredString(input, "client_group_id"),
    bank_transaction_id: requiredString(input, "bank_transaction_id"),
    bank_transaction_classification_id: requiredString(
      input,
      "bank_transaction_classification_id",
    ),
    fee_commitment_id: requiredString(input, "fee_commitment_id"),
    currency: "KRW",
    allocated_amount: allocatedAmount,
    reversed_amount: reversedAmount,
    refund_reversed_amount: refundReversedAmount,
    adjustment_reversed_amount: adjustmentReversedAmount,
    allocation_source: allocationSource,
    manual_lock: input.manual_lock,
    status,
    state_version: stateVersion,
    allocated_at: instant(input.allocated_at, "allocated_at"),
    created_by: requiredString(input, "created_by"),
    updated_by: requiredString(input, "updated_by"),
    reason: requiredString(input, "reason"),
    writes_product_state: true,
    evaluates_runtime_permission: true,
    writes_audit_event: true,
    production_ready_claim: false,
  });
}
