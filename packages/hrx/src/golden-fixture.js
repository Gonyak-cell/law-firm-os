import { createHash } from "node:crypto";

export const HRX_LEAVE_PAYROLL_GOLDEN_FIXTURE_SCHEMA_VERSION = "law-firm-os.hrx.leave-payroll-golden.v0.1";

const PAY_BASES = Object.freeze(["monthly", "hourly", "daily", "freelancer"]);
const TOTAL_FIELDS = Object.freeze([
  "employee_count",
  "hire_boundary_count",
  "termination_boundary_count",
  "paid_leave_minutes",
  "unpaid_leave_minutes",
  "unused_leave_minutes",
  "regular_overtime_minutes",
  "night_minutes",
  "holiday_minutes",
  "dependent_count",
]);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function isoDate(value, field) {
  const text = requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return text;
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return value;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function normalizeEmployee(input, index, period) {
  const field = `employees[${index}]`;
  const employeeId = requiredString(input?.employee_id, `${field}.employee_id`);
  const workEmail = requiredString(input?.work_email, `${field}.work_email`).toLowerCase();
  if (!workEmail.endsWith("@example.test")) throw new TypeError(`${field}.work_email must use example.test`);
  const sourceRef = requiredString(input?.source_ref, `${field}.source_ref`);
  if (!sourceRef.startsWith("Synthetic:")) throw new TypeError(`${field}.source_ref must be synthetic`);
  const employmentStart = isoDate(input?.employment_start, `${field}.employment_start`);
  const employmentEnd = input?.employment_end == null ? null : isoDate(input.employment_end, `${field}.employment_end`);
  if (employmentEnd && employmentEnd < employmentStart) throw new TypeError(`${field}.employment_end must not precede employment_start`);
  const payroll = input?.payroll_profile ?? {};
  const payBasis = requiredString(payroll.pay_basis, `${field}.payroll_profile.pay_basis`);
  if (!PAY_BASES.includes(payBasis)) throw new TypeError(`${field}.payroll_profile.pay_basis is unsupported`);
  if (payroll.currency !== "KRW") throw new TypeError(`${field}.payroll_profile.currency must be KRW`);
  const leave = input?.leave ?? {};
  const approvedTime = input?.approved_time ?? {};
  const normalized = {
    employee_id: employeeId,
    work_email: workEmail,
    source_ref: sourceRef,
    employment_start: employmentStart,
    employment_end: employmentEnd,
    employment_type: requiredString(input?.employment_type, `${field}.employment_type`),
    payroll_profile: {
      pay_basis: payBasis,
      currency: "KRW",
      rate_krw: nonNegativeInteger(payroll.rate_krw, `${field}.payroll_profile.rate_krw`),
    },
    leave: {
      paid_minutes: nonNegativeInteger(leave.paid_minutes ?? 0, `${field}.leave.paid_minutes`),
      unpaid_minutes: nonNegativeInteger(leave.unpaid_minutes ?? 0, `${field}.leave.unpaid_minutes`),
      unused_minutes: nonNegativeInteger(leave.unused_minutes ?? 0, `${field}.leave.unused_minutes`),
    },
    approved_time: {
      regular_overtime_minutes: nonNegativeInteger(approvedTime.regular_overtime_minutes ?? 0, `${field}.approved_time.regular_overtime_minutes`),
      night_minutes: nonNegativeInteger(approvedTime.night_minutes ?? 0, `${field}.approved_time.night_minutes`),
      holiday_minutes: nonNegativeInteger(approvedTime.holiday_minutes ?? 0, `${field}.approved_time.holiday_minutes`),
    },
    dependent_count: nonNegativeInteger(input?.dependent_count ?? 0, `${field}.dependent_count`),
  };
  if (employmentStart > period.end || (employmentEnd && employmentEnd < period.start)) {
    throw new TypeError(`${field} must overlap the fixture period`);
  }
  return normalized;
}

function calculateTotals(employees, period) {
  return Object.freeze({
    employee_count: employees.length,
    hire_boundary_count: employees.filter((row) => row.employment_start > period.start && row.employment_start <= period.end).length,
    termination_boundary_count: employees.filter((row) => row.employment_end && row.employment_end >= period.start && row.employment_end < period.end).length,
    paid_leave_minutes: employees.reduce((sum, row) => sum + row.leave.paid_minutes, 0),
    unpaid_leave_minutes: employees.reduce((sum, row) => sum + row.leave.unpaid_minutes, 0),
    unused_leave_minutes: employees.reduce((sum, row) => sum + row.leave.unused_minutes, 0),
    regular_overtime_minutes: employees.reduce((sum, row) => sum + row.approved_time.regular_overtime_minutes, 0),
    night_minutes: employees.reduce((sum, row) => sum + row.approved_time.night_minutes, 0),
    holiday_minutes: employees.reduce((sum, row) => sum + row.approved_time.holiday_minutes, 0),
    dependent_count: employees.reduce((sum, row) => sum + row.dependent_count, 0),
  });
}

export function createHrxLeavePayrollGoldenFixture(input = {}) {
  if (input.schema_version !== HRX_LEAVE_PAYROLL_GOLDEN_FIXTURE_SCHEMA_VERSION) throw new TypeError("golden fixture schema_version is unsupported");
  if (input.environment !== "synthetic") throw new TypeError("golden fixture environment must be synthetic");
  if (input.timezone !== "Asia/Seoul") throw new TypeError("golden fixture timezone must be Asia/Seoul");
  const period = Object.freeze({
    start: isoDate(input.period?.start, "period.start"),
    end: isoDate(input.period?.end, "period.end"),
  });
  if (period.end < period.start) throw new TypeError("period.end must not precede period.start");
  if (!Array.isArray(input.employees) || input.employees.length === 0) throw new TypeError("employees must be a non-empty array");
  const employees = input.employees.map((employee, index) => normalizeEmployee(employee, index, period));
  if (new Set(employees.map((row) => row.employee_id)).size !== employees.length) throw new TypeError("employee_id values must be unique");
  const expectedTotals = input.expected_totals ?? {};
  const calculatedTotals = calculateTotals(employees, period);
  for (const field of TOTAL_FIELDS) {
    if (nonNegativeInteger(expectedTotals[field], `expected_totals.${field}`) !== calculatedTotals[field]) {
      throw new TypeError(`expected_totals.${field} does not match the fixture rows`);
    }
  }
  return deepFreeze({
    schema_version: input.schema_version,
    fixture_id: requiredString(input.fixture_id, "fixture_id"),
    environment: "synthetic",
    timezone: "Asia/Seoul",
    period,
    employees,
    expected_totals: calculatedTotals,
  });
}

export function hashHrxLeavePayrollGoldenFixture(input) {
  const fixture = createHrxLeavePayrollGoldenFixture(input);
  return `sha256:${createHash("sha256").update(stableStringify(fixture)).digest("hex")}`;
}
