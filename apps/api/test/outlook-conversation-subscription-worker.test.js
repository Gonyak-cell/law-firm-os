import assert from "node:assert/strict";
import test from "node:test";

import { createOutlookConversationSubscriptionWorker } from "../src/outlook-conversation-subscription-worker.js";

test("OUTM-26 lifecycle worker reconciles only the durable subscription owner", async () => {
  const events = [];
  const worker = createOutlookConversationSubscriptionWorker({
    queue: {
      async claim(input) { events.push(["claim", input]); return [{ tenant_id: "tenant", job_id: "job", subscription_id: "subscription", resource: "me/mailFolders('inbox')/messages" }]; },
      async complete(input) { events.push(["complete", input]); return { status: "completed" }; },
      async fail(input) { events.push(["fail", input]); return { status: "retry" }; },
    },
    authority_lookup: async () => ({
      subscription: { tenant_id: "tenant", subscription_id: "subscription", user_id: "user", entra_subject_id: "subject", m365_connection_id: "connection", resource: "me/mailFolders('inbox')/messages" },
      connection: { tenant_id: "tenant", user_id: "user", entra_subject_id: "subject", m365_connection_id: "connection" },
    }),
    subscription_service: {
      async reconcile(input) { events.push(["reconcile", input]); return { outcome: "active" }; },
    },
  });
  assert.deepEqual(await worker.runOnce({ tenant_id: "tenant", worker_id: "worker" }), { claimed: 1, outcomes: [{ job_id: "job", status: "completed" }] });
  assert.equal(events.find(([event]) => event === "claim")[1].job_kinds[0], "subscription_reconcile");
  assert.equal(events.find(([event]) => event === "reconcile")[1].actor_id, "graph-subscription-reconciler");
  assert.equal(events.some(([event]) => event === "fail"), false);
});
