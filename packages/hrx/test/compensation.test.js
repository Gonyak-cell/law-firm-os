import assert from "node:assert/strict";
import test from "node:test";
import { createCompensationRecordMetadata } from "../src/compensation.js";

test("compensation metadata stores encrypted amount refs only", () => {
  const record = createCompensationRecordMetadata({
    tenant_id: "tenant-a",
    compensation_id: "comp-001",
    employee_id: "emp-001",
    encrypted_amount_ref: "vault://amount-001",
    effective_from: "2026-06-19",
    source_ref: "hris://comp-001",
  });
  assert.equal(record.encrypted_amount_ref, "vault://amount-001");
  assert.equal(record.raw_amount_included, false);
});

test("compensation metadata rejects raw amount fields", () => {
  assert.throws(
    () =>
      createCompensationRecordMetadata({
        tenant_id: "tenant-a",
        compensation_id: "comp-001",
        employee_id: "emp-001",
        encrypted_amount_ref: "vault://amount-001",
        amount: 100,
        effective_from: "2026-06-19",
        source_ref: "hris://comp-001",
      }),
    /must not include raw amount/,
  );
});
