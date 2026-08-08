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
    policies: [policy()],
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
  let claimed = false;
  const queue = {
    async claim(input) {
      queueEvents.push(["claim", input]);
      if (claimed) return [];
      claimed = true;
      return [job()];
    },
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
    pause_connection_policies: async (input) => { paused.push(input); return { outcome: "paused" }; },
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
    pause_connection_policies: async () => ({}),
    filing_adapter: { async fileCanonicalMessage() {} },
  });
  const result = await worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 1 });
  assert.equal(result.dead_lettered, 1);
  assert.equal(fetched, false);
});

test("OUTM-28 worker pauses revoked, expired, and scope-lost connection policies before Graph credential access", async () => {
  for (const [connection, expectedReason] of [
    [{ revoked_at: "2026-08-08T00:00:00.000Z" }, "connection_revoked"],
    [{ expires_at: "2026-08-07T23:59:59.000Z" }, "connection_expired"],
    [{ granted_scopes: ["User.Read"] }, "mail_read_scope_lost"],
  ]) {
    const events = [];
    let claimed = false;
    const worker = createOutlookConversationMessageWorker({
      queue: {
        async claim() { if (claimed) return []; claimed = true; return [job()]; },
        async extendLease() { throw new Error("must not bind credentials"); },
        async complete(input) { events.push(["complete", input]); return { status: "completed" }; },
        async fail() { throw new Error("must not fail"); },
      },
      authority_lookup: async () => authority({
        connection: { ...authority().connection, ...connection },
      }),
      canonical_message_source: { async getOwnMessage() { throw new Error("must not bind credentials"); } },
      policy_lookup: async () => policy(),
      current_authority: async () => ({ allowed: true }),
      pause_policy: async () => ({}),
      pause_connection_policies: async (input) => { events.push(["pause", input]); return { outcome: "paused" }; },
      filing_adapter: { async fileCanonicalMessage() { throw new Error("must not file"); } },
      clock: () => new Date("2026-08-08T00:00:00.000Z"),
    });

    const result = await worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 1 });

    assert.equal(result.paused, 1);
    assert.equal(events[0][0], "pause");
    assert.equal(events[0][1].reason, expectedReason);
    assert.equal(events[1][1].result_code, `policies_paused_${expectedReason}`);
  }
});

test("OUTM-28 worker leases one job at a time before Graph fetch and a lost lease does not abort the next job", async () => {
  const pending = [job({ job_id: "job-lost" }), job({ job_id: "job-next", message_id: "message-next" })];
  const fetched = [];
  const completed = [];
  const worker = createOutlookConversationMessageWorker({
    queue: {
      async claim(input) {
        assert.equal(input.limit, 1);
        return pending.length ? [pending.shift()] : [];
      },
      async extendLease({ job_id }) {
        if (job_id === "job-lost") throw new Error("Graph notification job lease was lost");
        return {};
      },
      async complete(input) { completed.push(input); return { status: "completed" }; },
      async fail({ job_id }) {
        if (job_id === "job-lost") throw new Error("Graph notification job lease was lost");
        return { status: "retry" };
      },
    },
    authority_lookup: async () => authority(),
    canonical_message_source: { async getOwnMessage(input) { fetched.push(input.message_id); return canonical(); } },
    policy_lookup: async () => policy(),
    current_authority: async () => ({ allowed: true }),
    pause_policy: async () => ({}),
    pause_connection_policies: async () => ({}),
    filing_adapter: { async fileCanonicalMessage() { return { outcome: "created" }; } },
  });

  const result = await worker.runOnce({ tenant_id: "tenant-outm28", worker_id: "worker-outm28", limit: 2 });

  assert.deepEqual(result, { claimed: 2, filed: 1, ignored: 0, paused: 0, retried: 1, dead_lettered: 0 });
  assert.deepEqual(fetched, ["message-next"]);
  assert.deepEqual(completed.map(({ job_id }) => job_id), ["job-next"]);
});
