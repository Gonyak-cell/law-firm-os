import assert from "node:assert/strict";
import test from "node:test";
import { canMutateHrxObjectUnderLegalHold, createHrxLegalHold } from "../src/legal-hold.js";
import { canPurgeHrxRecord, createHrxRetentionPolicy } from "../src/retention.js";

test("HRX retention allows purge only when due and no legal hold exists", () => {
  const policy = createHrxRetentionPolicy({
    tenant_id: "tenant-a",
    policy_id: "ret-001",
    object_type: "HRDocument",
    retain_until: "2026-06-19",
  });
  assert.equal(canPurgeHrxRecord({ policy, as_of: "2026-06-18" }).allowed, false);
  assert.equal(canPurgeHrxRecord({ policy, as_of: "2026-06-20" }).allowed, true);
});

test("HRX retention blocks purge under legal hold", () => {
  const policy = createHrxRetentionPolicy({
    tenant_id: "tenant-a",
    policy_id: "ret-001",
    object_type: "HRDocument",
    retain_until: "2026-06-19",
  });
  const hold = createHrxLegalHold({
    tenant_id: "tenant-a",
    hold_id: "hold-001",
    object_type: "HRDocument",
    object_id: "doc-001",
    reason: "employment dispute",
  });
  const decision = canPurgeHrxRecord({ policy, legal_holds: [hold], as_of: "2026-06-20" });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "legal_hold_active");
});

test("HRX legal hold blocks delete mutation for the exact held object", () => {
  const hold = createHrxLegalHold({
    tenant_id: "tenant-a",
    hold_id: "hold-001",
    object_type: "HRDocument",
    object_id: "doc-001",
    reason: "employment dispute",
  });
  const blocked = canMutateHrxObjectUnderLegalHold({
    tenant_id: "tenant-a",
    object_type: "HRDocument",
    object_id: "doc-001",
    mutation: "delete",
    legal_holds: [hold],
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "legal_hold_active");

  const allowed = canMutateHrxObjectUnderLegalHold({
    tenant_id: "tenant-a",
    object_type: "HRDocument",
    object_id: "doc-002",
    mutation: "delete",
    legal_holds: [hold],
  });
  assert.equal(allowed.allowed, true);
});
