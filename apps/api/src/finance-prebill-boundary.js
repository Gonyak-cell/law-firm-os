const PREBILL_VALIDATION_ERROR_CODE = "FINANCE_API_VALIDATION_ERROR";
const PREBILL_VALIDATION_ERROR_DEFINITIONS = new Map([
  ["adjustment_object", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment must be an object" })],
  ["adjustment_unsupported_fields", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment contains unsupported fields" })],
  ["prebill_id_required", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "prebill_id is required" })],
  ["adjustment_prebill_id_mismatch", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment prebill_id must match prebill_id" })],
  ["adjustment_type_invalid", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment_type must be write_down" })],
  ["adjustment_amount_invalid", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment amount must be a finite number" })],
  ["adjustment_id_required", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment_id is required" })],
  ["reason_code_required", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "reason_code is required" })],
]);

const GENERIC_PREBILL_VALIDATION_ERROR = Object.freeze({
  status: 400,
  code: PREBILL_VALIDATION_ERROR_CODE,
  message: "PreBill request is invalid",
});

const PREBILL_DOMAIN_ERROR_DEFINITIONS = new Map([
  ["adjustment amount must be positive", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment amount must be positive" })],
  ["adjustment amount exceeds PreBill remaining amount", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "adjustment amount exceeds PreBill remaining amount" })],
  ["PreBill not found", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "PreBill not found" })],
  ["PreBill linked to an Invoice is immutable", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "PreBill linked to an Invoice is immutable" })],
  ["idempotency_key is required", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "idempotency_key is required" })],
  ["prebill_id is required", Object.freeze({ status: 400, code: PREBILL_VALIDATION_ERROR_CODE, message: "prebill_id is required" })],
]);

function safePreBillErrorDefinition(error) {
  if (error instanceof FinancePreBillApprovalValidationError) {
    return PREBILL_VALIDATION_ERROR_DEFINITIONS.get(error.code) ?? GENERIC_PREBILL_VALIDATION_ERROR;
  }
  const errorMessage = error?.message;
  const safeDefinition = typeof errorMessage === "string"
    ? PREBILL_DOMAIN_ERROR_DEFINITIONS.get(errorMessage)
    : null;
  if (safeDefinition) return safeDefinition;
  if (typeof errorMessage === "string" && /^invalid PreBill transition: [a-z_]+ -> approve_(with|without)_adjustment$/u.test(errorMessage)) {
    return Object.freeze({
      status: 400,
      code: PREBILL_VALIDATION_ERROR_CODE,
      message: "PreBill cannot be approved from its current status",
    });
  }
  return null;
}

export class FinancePreBillApprovalValidationError extends TypeError {
  constructor(code) {
    const definition = PREBILL_VALIDATION_ERROR_DEFINITIONS.get(code);
    super(definition?.message ?? GENERIC_PREBILL_VALIDATION_ERROR.message);
    this.name = "FinancePreBillApprovalValidationError";
    this.code = code;
  }
}

export function parsePreBillApprovalInput(body) {
  const adjustment = body?.adjustment;
  if (!adjustment || typeof adjustment !== "object" || Array.isArray(adjustment)) {
    throw new FinancePreBillApprovalValidationError("adjustment_object");
  }
  const allowedFields = new Set([
    "adjustment_id",
    "prebill_id",
    "adjustment_type",
    "amount",
    "reason_code",
  ]);
  const unsupportedFields = Object.keys(adjustment)
    .filter((field) => !allowedFields.has(field))
    .sort();
  if (unsupportedFields.length > 0) {
    throw new FinancePreBillApprovalValidationError("adjustment_unsupported_fields");
  }
  const requiredString = (field) => {
    const value = adjustment[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw new FinancePreBillApprovalValidationError(`${field}_required`);
    }
    return value.trim();
  };
  const prebillId = typeof body?.prebill_id === "string" ? body.prebill_id.trim() : "";
  if (!prebillId) throw new FinancePreBillApprovalValidationError("prebill_id_required");
  const adjustmentPrebillId = requiredString("prebill_id");
  if (adjustmentPrebillId !== prebillId) {
    throw new FinancePreBillApprovalValidationError("adjustment_prebill_id_mismatch");
  }
  if (adjustment.adjustment_type !== "write_down") {
    throw new FinancePreBillApprovalValidationError("adjustment_type_invalid");
  }
  if (typeof adjustment.amount !== "number" || !Number.isFinite(adjustment.amount)) {
    throw new FinancePreBillApprovalValidationError("adjustment_amount_invalid");
  }
  return Object.freeze({
    adjustment_id: requiredString("adjustment_id"),
    tenant_id: body.tenant_id,
    prebill_id: adjustmentPrebillId,
    adjustment_type: "write_down",
    amount: adjustment.amount,
    reason_code: requiredString("reason_code"),
  });
}

export function classifyPreBillApprovalError(error) {
  return safePreBillErrorDefinition(error)?.message ?? null;
}

export function mapPreBillApprovalDomainError(error) {
  return safePreBillErrorDefinition(error);
}
