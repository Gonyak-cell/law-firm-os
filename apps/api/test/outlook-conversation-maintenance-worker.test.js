import assert from "node:assert/strict";
import test from "node:test";

import { createOutlookConversationMaintenanceWorker } from "../src/outlook-conversation-maintenance-worker.js";

test("OUTM-26~28 maintenance is bounded and keeps subscription, recovery, and filing stages isolated", async () => {
  const calls = [];
  const stage = (name, result) => ({
    async runOnce(input) {
      calls.push([name, input]);
      return result;
    },
  });
  const worker = createOutlookConversationMaintenanceWorker({
    maintenance_store: {
      async listDueSubscriptionPrincipals(input) {
        calls.push(["candidates", input]);
        return [
          { tenant_id: "tenant", user_id: "user-a", entra_subject_id: "subject-a", m365_connection_id: "connection-a" },
          { tenant_id: "tenant", user_id: "user-b", entra_subject_id: "subject-b", m365_connection_id: "connection-b" },
        ];
      },
    },
    subscription_service: {
      async reconcile(input) {
        calls.push(["reconcile", input]);
        if (input.user_id === "user-b") throw new Error("synthetic provider failure");
        return { outcome: "active" };
      },
    },
    subscription_worker: stage("subscription", { claimed: 1, outcomes: [{ status: "completed" }] }),
    recovery_worker: stage("recovery", { claimed: 1, outcomes: [{ status: "completed" }] }),
    message_worker: stage("message", { claimed: 1, filed: 1 }),
  });
  const result = await worker.runOnce({ tenant_id: "tenant", worker_id: "worker", limit: 7 });
  assert.deepEqual(result.subscription_reconciliation, { attempted: 2, succeeded: 1, failed: 1 });
  assert.equal(result.recovery_jobs.claimed, 1);
  assert.equal(result.message_jobs.filed, 1);
  assert.deepEqual(calls[0], ["candidates", { limit: 7 }]);
  assert.deepEqual(calls.slice(-3).map(([name, input]) => [name, input.worker_id, input.limit]), [
    ["subscription", "worker:subscription", 7],
    ["recovery", "worker:recovery", 7],
    ["message", "worker:message", 7],
  ]);
  await assert.rejects(
    worker.runOnce({ tenant_id: "tenant", worker_id: "worker", limit: 101 }),
    /limit must be between 1 and 100/u,
  );
});
