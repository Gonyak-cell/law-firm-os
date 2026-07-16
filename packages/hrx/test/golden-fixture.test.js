import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHrxLeavePayrollGoldenFixture, hashHrxLeavePayrollGoldenFixture } from "../src/golden-fixture.js";

const fixtureInput = JSON.parse(readFileSync(new URL("../fixtures/leave-payroll-golden.synthetic.json", import.meta.url), "utf8"));

test("GOV-005 fixes synthetic leave and payroll boundary rows with reconciled totals", () => {
  const fixture = createHrxLeavePayrollGoldenFixture(fixtureInput);
  assert.equal(fixture.expected_totals.employee_count, 6);
  assert.equal(fixture.expected_totals.hire_boundary_count, 1);
  assert.equal(fixture.expected_totals.termination_boundary_count, 1);
  assert.equal(fixture.expected_totals.paid_leave_minutes + fixture.expected_totals.unpaid_leave_minutes, 360);
  assert.equal(fixture.expected_totals.regular_overtime_minutes + fixture.expected_totals.night_minutes + fixture.expected_totals.holiday_minutes, 660);
  assert.equal(Object.isFrozen(fixture.employees[0].payroll_profile), true);
});

test("GOV-005 fixture hash is stable and PII-safe", () => {
  assert.equal(hashHrxLeavePayrollGoldenFixture(fixtureInput), "sha256:9c8febce970f035242814aa4162a1ce99b38c5203d0de774a88d6d69c879a1b1");
  assert.doesNotMatch(JSON.stringify(fixtureInput), /@amic\.kr|resident|account_number|real_employee/i);
});

test("GOV-005 rejects drifted totals and non-synthetic identities", () => {
  const drifted = structuredClone(fixtureInput);
  drifted.expected_totals.paid_leave_minutes += 1;
  assert.throws(() => createHrxLeavePayrollGoldenFixture(drifted), /does not match/);
  const privateIdentity = structuredClone(fixtureInput);
  privateIdentity.employees[0].work_email = "person@amic.kr";
  assert.throws(() => createHrxLeavePayrollGoldenFixture(privateIdentity), /example\.test/);
});
