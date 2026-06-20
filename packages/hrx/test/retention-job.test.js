import assert from "node:assert/strict";
import test from "node:test";
import { createHrxLegalHold } from "../src/legal-hold.js";
import { runHrxRetentionJob } from "../src/retention-job.js";

test("HRX retention job blocks purge for held records and allows due unheld records", () => {
  const result = runHrxRetentionJob({
    tenant_id: "tenant-a",
    as_of: "2026-06-20",
    policies: [
      {
        tenant_id: "tenant-a",
        policy_id: "ret-hr-docs",
        object_type: "HRDocument",
        retain_until: "2026-06-19",
      },
    ],
    legal_holds: [
      createHrxLegalHold({
        tenant_id: "tenant-a",
        hold_id: "hold-001",
        object_type: "HRDocument",
        object_id: "doc-held",
        reason: "litigation hold",
      }),
    ],
    records: [
      { tenant_id: "tenant-a", object_type: "HRDocument", object_id: "doc-held" },
      { tenant_id: "tenant-a", object_type: "HRDocument", object_id: "doc-clear" },
    ],
  });
  const held = result.decisions.find((decision) => decision.object_id === "doc-held");
  const clear = result.decisions.find((decision) => decision.object_id === "doc-clear");
  assert.equal(held.allowed, false);
  assert.equal(held.reason, "legal_hold_active");
  assert.equal(clear.allowed, true);
  assert.equal(clear.reason, "purge_allowed");
});
