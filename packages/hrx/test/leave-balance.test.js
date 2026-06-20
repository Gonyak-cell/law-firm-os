import assert from "node:assert/strict";
import test from "node:test";
import { calculateLeaveBalance, createInMemoryLeaveBalanceLedger } from "../src/leave/balance.js";

const ledgerEntries = Object.freeze([
  {
    tenant_id: "tenant-a",
    entry_id: "earned-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "earned",
    amount: 40,
    occurred_on: "2026-01-31",
    source_ref: "PolicyAccrual:2026-01",
  },
  {
    tenant_id: "tenant-a",
    entry_id: "carry-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "carryover",
    amount: 8,
    occurred_on: "2026-01-01",
    source_ref: "Carryover:2025",
  },
  {
    tenant_id: "tenant-a",
    entry_id: "used-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "used",
    amount: 16,
    occurred_on: "2026-02-10",
    source_ref: "LeaveRequest:leave-001",
    audit_ref: "audit-001",
  },
]);

test("leave balance computes earned, used, and available values from auditable entries", () => {
  const balance = calculateLeaveBalance(ledgerEntries, {
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    policy_id: "pto-us",
  });
  assert.equal(balance.earned_balance, 40);
  assert.equal(balance.used_balance, 16);
  assert.equal(balance.available_balance, 32);
  assert.deepEqual(balance.entry_ids, ["earned-001", "carry-001", "used-001"]);
});

test("leave balance ledger preserves source references and rejects duplicate entry ids", () => {
  const ledger = createInMemoryLeaveBalanceLedger(ledgerEntries.slice(0, 1));
  ledger.append({
    tenant_id: "tenant-a",
    entry_id: "used-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "used",
    amount: 4,
    occurred_on: "2026-02-11",
    source_ref: "LeaveRequest:leave-002",
  });
  assert.equal(ledger.balance({ tenant_id: "tenant-a", employee_id: "emp-001", policy_id: "pto-us" }).available_balance, 36);
  assert.throws(() => ledger.append(ledger.list({ tenant_id: "tenant-a" })[0]), /Duplicate leave ledger entry/);
});
