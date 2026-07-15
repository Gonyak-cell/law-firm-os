const ROUNDING_MODES = new Set(["truncate", "floor", "ceil", "nearest"]);

function safeInteger(value, field) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${field} must be a safe integer`);
  return value;
}

function positiveInteger(value, field) {
  safeInteger(value, field);
  if (value <= 0) throw new RangeError(`${field} must be greater than zero`);
  return value;
}

function roundingMode(value) {
  if (!ROUNDING_MODES.has(value)) throw new TypeError("rounding mode is invalid");
  return value;
}

function safeNumber(value) {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new RangeError("payroll integer overflow");
  return result;
}

function roundBigIntRatio(numerator, denominator, mode) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n || mode === "truncate") return quotient;
  if (mode === "floor") return numerator < 0n ? quotient - 1n : quotient;
  if (mode === "ceil") return numerator > 0n ? quotient + 1n : quotient;
  return (remainder < 0n ? -remainder : remainder) * 2n >= denominator
    ? quotient + (numerator < 0n ? -1n : 1n)
    : quotient;
}

export function roundPayrollProduct(factors, divisors = [1], mode = "nearest") {
  if (!Array.isArray(factors) || factors.length === 0) throw new TypeError("factors must be a non-empty array");
  if (!Array.isArray(divisors) || divisors.length === 0) throw new TypeError("divisors must be a non-empty array");
  roundingMode(mode);
  const numerator = factors.reduce((product, value, index) => product * BigInt(safeInteger(value, `factors[${index}]`)), 1n);
  const denominator = divisors.reduce((product, value, index) => product * BigInt(positiveInteger(value, `divisors[${index}]`)), 1n);
  return safeNumber(roundBigIntRatio(numerator, denominator, mode));
}

export function roundPayrollRatio(numerator, denominator, mode = "nearest") {
  return roundPayrollProduct([numerator], [denominator], mode);
}

export function proratePayrollKrw(amountKrw, activeUnits, periodUnits, mode = "nearest") {
  safeInteger(amountKrw, "amountKrw");
  if (amountKrw < 0) throw new RangeError("amountKrw must be non-negative");
  safeInteger(activeUnits, "activeUnits");
  if (activeUnits < 0) throw new RangeError("activeUnits must be non-negative");
  return roundPayrollProduct([amountKrw, activeUnits], [periodUnits], mode);
}

export function applyPayrollBasisPoints(amountKrw, basisPoints, mode = "nearest") {
  safeInteger(amountKrw, "amountKrw");
  safeInteger(basisPoints, "basisPoints");
  if (basisPoints < 0) throw new RangeError("basisPoints must be non-negative");
  return roundPayrollProduct([amountKrw, basisPoints], [10_000], mode);
}

export function payrollKrwForMinutes(rateKrw, minutes, rateUnitMinutes = 60, mode = "nearest") {
  safeInteger(rateKrw, "rateKrw");
  if (rateKrw < 0) throw new RangeError("rateKrw must be non-negative");
  safeInteger(minutes, "minutes");
  if (minutes < 0) throw new RangeError("minutes must be non-negative");
  return roundPayrollProduct([rateKrw, minutes], [rateUnitMinutes], mode);
}

export function payrollKrwForMinutesAtBasisPoints(rateKrw, minutes, rateUnitMinutes, basisPoints, mode = "nearest") {
  safeInteger(rateKrw, "rateKrw");
  if (rateKrw < 0) throw new RangeError("rateKrw must be non-negative");
  safeInteger(minutes, "minutes");
  if (minutes < 0) throw new RangeError("minutes must be non-negative");
  safeInteger(basisPoints, "basisPoints");
  if (basisPoints < 0) throw new RangeError("basisPoints must be non-negative");
  return roundPayrollProduct([rateKrw, minutes, basisPoints], [rateUnitMinutes, 10_000], mode);
}

export const PAYROLL_ROUNDING_MODES = Object.freeze([...ROUNDING_MODES]);
