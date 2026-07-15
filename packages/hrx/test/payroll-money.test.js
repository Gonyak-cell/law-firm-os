import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPayrollBasisPoints,
  payrollKrwForMinutes,
  payrollKrwForMinutesAtBasisPoints,
  proratePayrollKrw,
  roundPayrollRatio,
} from "../src/payroll/money.js";

test("PY-CALC-001 rounds integer KRW ratios explicitly at positive and negative half boundaries", () => {
  assert.equal(roundPayrollRatio(1, 2, "nearest"), 1);
  assert.equal(roundPayrollRatio(-1, 2, "nearest"), -1);
  assert.equal(roundPayrollRatio(-1, 2, "truncate"), 0);
  assert.equal(roundPayrollRatio(-1, 2, "floor"), -1);
  assert.equal(roundPayrollRatio(-1, 2, "ceil"), 0);
  assert.equal(proratePayrollKrw(3_000_000, 17, 31), 1_645_161);
  assert.equal(applyPayrollBasisPoints(1_000_000, 1_250), 125_000);
  assert.equal(payrollKrwForMinutes(12_000, 91), 18_200);
  assert.equal(payrollKrwForMinutesAtBasisPoints(12_000, 60, 60, 5_000), 6_000);
});

test("PY-CALC-001 rejects invalid divisors, unsafe input, negative quantities, and unsafe output", () => {
  assert.throws(() => roundPayrollRatio(1, 0), /greater than zero/);
  assert.throws(() => roundPayrollRatio(Number.MAX_SAFE_INTEGER + 1, 1), /safe integer/);
  assert.throws(() => proratePayrollKrw(1, -1, 31), /non-negative/);
  assert.throws(() => payrollKrwForMinutes(1, -1), /non-negative/);
  assert.throws(() => applyPayrollBasisPoints(1, -1), /non-negative/);
  assert.throws(() => applyPayrollBasisPoints(Number.MAX_SAFE_INTEGER, 10_001), /overflow/);
});
