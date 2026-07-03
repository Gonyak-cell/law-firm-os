export const HRX_LEAVE_POLICY_SCHEMA_VERSION = "law-firm-os.hrx-leave-policy.v0.1";

export const HRX_LEAVE_ACCRUAL_UNITS = Object.freeze(["hours", "days"]);
export const KOREAN_ANNUAL_PAID_LEAVE_MAX_DAYS = 25;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredNumber(input, field) {
  const value = input?.[field];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${field} must be a finite number`);
  if (value < 0) throw new TypeError(`${field} must be greater than or equal to 0`);
  return value;
}

function optionalNumber(input, field, fallback) {
  const value = input?.[field] ?? fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${field} must be a finite number greater than or equal to 0`);
  }
  return value;
}

function wholeMonths(value) {
  return Math.max(0, Math.floor(value));
}

export function createLeavePolicy(input = {}) {
  const accrualUnit = input.accrual_unit ?? "hours";
  if (!HRX_LEAVE_ACCRUAL_UNITS.includes(accrualUnit)) {
    throw new TypeError(`accrual_unit must be one of ${HRX_LEAVE_ACCRUAL_UNITS.join(", ")}`);
  }
  const negativeBalanceAllowed = input.negative_balance_allowed === true;
  const maxNegativeBalance = input.max_negative_balance ?? 0;
  if (!negativeBalanceAllowed && maxNegativeBalance !== 0) {
    throw new TypeError("max_negative_balance must be 0 when negative_balance_allowed is false");
  }

  return Object.freeze({
    schema_version: HRX_LEAVE_POLICY_SCHEMA_VERSION,
    tenant_id: requiredString(input, "tenant_id"),
    policy_id: requiredString(input, "policy_id"),
    policy_version: requiredString(input, "policy_version"),
    leave_type: requiredString(input, "leave_type"),
    accrual_unit: accrualUnit,
    accrual_rate_per_month: requiredNumber(input, "accrual_rate_per_month"),
    annual_entitlement: requiredNumber(input, "annual_entitlement"),
    carryover_limit: requiredNumber(input, "carryover_limit"),
    negative_balance_allowed: negativeBalanceAllowed,
    max_negative_balance: requiredNumber({ max_negative_balance: maxNegativeBalance }, "max_negative_balance"),
    approval_required: input.approval_required !== false,
    effective_from: requiredString(input, "effective_from"),
    effective_to: input.effective_to ?? null,
  });
}

export function calculateLeaveAccrual(policy, months) {
  const normalizedPolicy = createLeavePolicy(policy);
  if (typeof months !== "number" || !Number.isFinite(months) || months < 0) {
    throw new TypeError("months must be a finite number greater than or equal to 0");
  }
  const accrued = normalizedPolicy.accrual_rate_per_month * months;
  return Math.min(accrued, normalizedPolicy.annual_entitlement);
}

export function calculateKoreanAnnualPaidLeaveEntitlement(input = {}) {
  const serviceMonths = wholeMonths(optionalNumber(input, "service_months", 0));
  const yearsOfService = wholeMonths(input.years_of_service ?? Math.floor(serviceMonths / 12));
  const fullMonthsWithoutAbsence = Math.min(
    11,
    wholeMonths(optionalNumber(input, "full_months_without_absence", Math.min(serviceMonths, 11))),
  );
  const attendanceRate = optionalNumber(input, "yearly_attendance_rate", 1);
  const maxDays = optionalNumber(input, "statutory_max_days", KOREAN_ANNUAL_PAID_LEAVE_MAX_DAYS);

  if (serviceMonths < 12 || attendanceRate < 0.8) return Math.min(fullMonthsWithoutAbsence, maxDays);

  const seniorityDays = yearsOfService >= 3 ? Math.floor((yearsOfService - 1) / 2) : 0;
  return Math.min(15 + seniorityDays, maxDays);
}

export function createLeaveAccrualLedgerEntry(input = {}) {
  const policy = createLeavePolicy(input.policy);
  const tenantId = requiredString(input, "tenant_id");
  const employeeId = requiredString(input, "employee_id");
  const occurredOn = requiredString(input, "occurred_on");
  const amount = input.amount ?? calculateKoreanAnnualPaidLeaveEntitlement(input);
  if (amount <= 0) throw new TypeError("accrual amount must be greater than 0");
  return Object.freeze({
    tenant_id: tenantId,
    entry_id: input.entry_id ?? `leave_accrual_${employeeId}_${occurredOn}`,
    employee_id: employeeId,
    policy_id: policy.policy_id,
    entry_type: "earned",
    amount,
    occurred_on: occurredOn,
    source_ref: input.source_ref ?? `LeaveAccrual:${policy.policy_id}:${employeeId}:${occurredOn}`,
    metadata: Object.freeze({
      policy_version: policy.policy_version,
      accrual_unit: policy.accrual_unit,
      statutory_basis: "KR_LSA_ARTICLE_60",
    }),
  });
}

export function applyLeaveCarryover(policy, closingBalance) {
  const normalizedPolicy = createLeavePolicy(policy);
  if (typeof closingBalance !== "number" || !Number.isFinite(closingBalance)) {
    throw new TypeError("closingBalance must be a finite number");
  }
  if (closingBalance <= 0) return 0;
  return Math.min(closingBalance, normalizedPolicy.carryover_limit);
}

export function createLeaveCarryoverLedgerEntry(input = {}) {
  const policy = createLeavePolicy(input.policy);
  const tenantId = requiredString(input, "tenant_id");
  const employeeId = requiredString(input, "employee_id");
  const occurredOn = requiredString(input, "occurred_on");
  const closingBalance = optionalNumber(input, "closing_balance", 0);
  const amount = applyLeaveCarryover(policy, closingBalance);
  if (amount <= 0) throw new TypeError("carryover amount must be greater than 0");
  return Object.freeze({
    tenant_id: tenantId,
    entry_id: input.entry_id ?? `leave_carryover_${employeeId}_${occurredOn}`,
    employee_id: employeeId,
    policy_id: policy.policy_id,
    entry_type: "carryover",
    amount,
    occurred_on: occurredOn,
    source_ref: input.source_ref ?? `LeaveCarryover:${policy.policy_id}:${employeeId}:${occurredOn}`,
    metadata: Object.freeze({
      policy_version: policy.policy_version,
      closing_balance: closingBalance,
      carryover_limit: policy.carryover_limit,
    }),
  });
}

export function evaluateLeaveUsage(policy, currentBalance, requestedAmount) {
  const normalizedPolicy = createLeavePolicy(policy);
  if (typeof currentBalance !== "number" || !Number.isFinite(currentBalance)) {
    throw new TypeError("currentBalance must be a finite number");
  }
  if (typeof requestedAmount !== "number" || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new TypeError("requestedAmount must be a finite number greater than 0");
  }
  const availableAfter = currentBalance - requestedAmount;
  if (availableAfter >= 0) {
    return Object.freeze({ allowed: true, available_after: availableAfter, reason: "within_balance" });
  }
  if (!normalizedPolicy.negative_balance_allowed) {
    return Object.freeze({ allowed: false, available_after: availableAfter, reason: "negative_balance_not_allowed" });
  }
  if (Math.abs(availableAfter) > normalizedPolicy.max_negative_balance) {
    return Object.freeze({ allowed: false, available_after: availableAfter, reason: "negative_balance_limit_exceeded" });
  }
  return Object.freeze({ allowed: true, available_after: availableAfter, reason: "within_negative_balance_limit" });
}
