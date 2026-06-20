import assert from "node:assert/strict";
import test from "node:test";
import { maskHrxFields } from "../src/field-masker.js";

test("HRX field masker masks compensation without scope", () => {
  const masked = maskHrxFields(
    { employee_id: "emp-001", amount: 100, currency: "USD", payroll_ref: "payroll-1" },
    { sensitivity: "compensation", granted_scopes: ["hrx.employee.read"] },
  );
  assert.equal(masked.amount, null);
  assert.equal(masked.currency, null);
  assert.equal(masked.payroll_ref, null);
  assert.equal(masked.masked, true);
});

test("HRX field masker preserves fields with matching scope", () => {
  const visible = maskHrxFields(
    { employee_id: "emp-001", rating: "meets", manager_notes: "ok" },
    { sensitivity: "evaluation", granted_scopes: ["hrx.evaluation.read"] },
  );
  assert.equal(visible.rating, "meets");
  assert.equal(visible.manager_notes, "ok");
  assert.equal(visible.masked, undefined);
});

test("HRX field masker blocks final evaluation score without evaluation scope", () => {
  const masked = maskHrxFields(
    { employee_id: "emp-001", rating: "meets", final_score: 4.2 },
    { sensitivity: "evaluation", granted_scopes: ["hrx.employee.read"] },
  );
  assert.equal(masked.rating, null);
  assert.equal(masked.final_score, null);
  assert.equal(masked.masked, true);
});

test("HRX field masker masks candidate and payroll fields", () => {
  assert.equal(maskHrxFields({ email: "candidate@example.com" }, { sensitivity: "candidate" }).email, null);
  assert.equal(maskHrxFields({ net_pay: 100 }, { sensitivity: "payroll" }).net_pay, null);
});
