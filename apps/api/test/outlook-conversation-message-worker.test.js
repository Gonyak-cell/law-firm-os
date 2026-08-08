import assert from "node:assert/strict";
import test from "node:test";

import { createOutlookConversationMessageWorker } from "../src/outlook-conversation-message-worker.js";

function job(overrides = {}) {
  return {
    tenant_id: "tenant-outm28",
    job_id: "job-outm28",
    subscription_id: "subscription-outm28",
    resource: "me/mailFolders('inbox')/messages",
    message_id: "message-outm28",
    ...overrides,
  };
}

function authority(overrides = {}) {
  return {
    subscription: {
      tenant_id: "tenant-outm28",
      subscription_id: "subscription-outm28",
      m365_connection_id: "connection-outm28",
      user_id: "user-outm28",
      entra_subject_id: "subject-outm28",
      resource: "me/mailFolders('inbox')/messages",
      status: "active",
    },
    connection: {
      tenant_id: "tenant-outm28",
      user_id: "user-outm28",
      entra_subject_id: "subject-outm28",
      m365_connection_id: "connection-outm28",
      revoked_at: null,
      expires_at: "2027-08-08T00:00:00.000Z",
      granted_scopes: ["Mail.Read"],
      connection_authority: "delegated",
      mailbox_scope: "me",
    },
    ...overrides,
  };
}

function canonical(overrides = {}) {
  return {
    immutable_message_id: "message-outm28",
    conversation_id: "conversation-outm28",
    folder_kind: "inbox",
    is_draft: false,
    mime_bytes: Buffer.from("From: sender@example.test\r\n\r\nbody"),
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    tenant_id: "tenant-outm28",
    policy_id: "policy-outm28",
    user_id: "user-outm28",
    entra_subject_id: "subject-outm28",
    m365_connection_id: "connection-outm28",
    matter_id: "matter-outm28",
    conversation_id: "conversation-outm28",
    status: "active",
    version: 1,
    enabling_actor_id: "user-outm28",
    ...overrides,
  };
}

function fixture({ canonicalValue = canonical(), policyValue = policy(), currentAllowed = true } = {}) {
  const queueEvents = [];
  const filed = [];
  const paused = [];
  const queue = {
    async claim(input) { queueEvents.push(["claim", input]); return [job()]; },
    async extendLease(input) { queueEvents.push(["extend", input]); return {}; },
    async complete(input) { queueEvents.push(["complete", input]); return { status: "completed" }; },
    async fail(input) { queueEvents.push(["fail", input]); return { status: "retry" }; },
  };
  const worker = createOutlookConversationMessageWorker({
    queue,
    authority_lookup: async () => authority(),
    canonical_message_source: { async getOwnMessage() { return canonicalValue; } },
    policy_lookup: async () => policyValue,
    current_authority: async () => ({ allowed: currentAllowed, reason: currentAllowed ? null : "matter_access_changed" }),
    pause_policy: async (input) => { paused.push(input); return { status: "paused" }; },
    filing_adapter: { async fileCanonicalMessage(input) { filed.push(input); return { outcome: "created" }; } },
  });
  return { filed, paused, queueEvents, worker };
}

test("OUTM-28 worker files a matched message as the service actor and completes once", async () => {
  const runtime = fixture();
  const result = await runtime.worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 1 });
  assert.deepEqual(result, { claimed: 1, filed: 1, ignored: 0, paused: 0, retried: 0, dead_lettered: 0 });
  assert.equal(runtime.filed[0].actor_id, "outlook-conversation-sync-service");
  assert.equal(runtime.filed[0].authorized_by_actor_id, "user-outm28");
  assert.equal(runtime.queueEvents.filter(([event]) => event === "complete").length, 1);
  assert.equal(runtime.queueEvents.some(([event]) => event === "fail"), false);
});

test("OUTM-28 worker pauses permission loss and never treats the historic enabling actor as current authority", async () => {
  const runtime = fixture({ currentAllowed: false });
  const result = await runtime.worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 1 });
  assert.equal(result.paused, 1);
  assert.equal(runtime.filed.length, 0);
  assert.equal(runtime.paused[0].actor_id, "outlook-conversation-sync-service");
  assert.equal(runtime.paused[0].expected_version, 1);
  assert.equal(runtime.queueEvents.find(([event]) => event === "complete")[1].result_code, "policy_paused_matter_access_changed");
});

test("OUTM-28 worker ignores unmatched and draft messages without filing", async () => {
  for (const options of [
    { policyValue: null },
    { canonicalValue: canonical({ is_draft: true }) },
  ]) {
    const runtime = fixture(options);
    const result = await runtime.worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 1 });
    assert.equal(result.ignored, 1);
    assert.equal(runtime.filed.length, 0);
  }
});

test("OUTM-28 worker rejects a subscription binding drift before Graph fetch", async () => {
  let fetched = false;
  const queue = {
    async claim() { return [job()]; },
    async fail() { return { status: "dead_letter" }; },
    async complete() { throw new Error("must not complete"); },
    async extendLease() { throw new Error("must not extend"); },
  };
  const worker = createOutlookConversationMessageWorker({
    queue,
    authority_lookup: async () => authority({ subscription: { ...authority().subscription, resource: "me/mailFolders('sentitems')/messages" } }),
    canonical_message_source: { async getOwnMessage() { fetched = true; } },
    policy_lookup: async () => policy(),
    current_authority: async () => ({ allowed: true }),
    pause_policy: async () => ({}),
    filing_adapter: { async fileCanonicalMessage() {} },
  });
  const result = await worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 1 });
  assert.equal(result.dead_lettered, 1);
  assert.equal(fetched, false);
});
