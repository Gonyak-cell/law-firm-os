import assert from "node:assert/strict";
import test from "node:test";

import { AUTH_STATE } from "../src/addin-auth.js";
import { createOutlookTaskPaneRuntime } from "../src/outlook-taskpane-runtime.js";

function mailbox(item) {
  return {
    context: { mailbox: { item } },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
}

function item(itemId, subject) {
  return {
    itemId,
    internetMessageId: `<${itemId}@example.test>`,
    conversationId: `conversation-${itemId}`,
    subject,
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("late Office readiness refreshes the item and replaces the item subscription", async () => {
  const office = mailbox(item("office-1", "첫 메일"));
  let lateReady;
  let subscriptionCount = 0;
  let unsubscribeCount = 0;
  const runtime = createOutlookTaskPaneRuntime({
    Office: office,
    windowObject: {},
    authenticateOnStart: false,
    waitForReady({ onLateReady }) {
      lateReady = onLateReady;
      return Promise.resolve({ status: "timed_out" });
    },
    resolveRestId: ({ Office }) => ({ rest_message_id: Office.context.mailbox.item.itemId }),
    readBody: async ({ item: current }) => current.subject,
    readClassification: async () => ({}),
    subscribeToItems() {
      subscriptionCount += 1;
      return () => { unsubscribeCount += 1; };
    },
  });
  const states = [];
  runtime.subscribe((state) => states.push(state));

  await runtime.start();
  await flush();
  assert.equal(subscriptionCount, 1);
  assert.equal(runtime.getState().item.subject, "첫 메일");

  office.context.mailbox.item = item("office-2", "늦게 준비된 메일");
  lateReady();
  await flush();
  await flush();

  assert.equal(unsubscribeCount, 1);
  assert.equal(subscriptionCount, 2);
  assert.equal(runtime.getState().item.subject, "늦게 준비된 메일");
  assert.ok(states.some(({ item: current }) => current?.subject === "늦게 준비된 메일"));
  runtime.dispose();
});

test("out-of-order Office item reads are discarded by generation and identity", async () => {
  const office = mailbox(item("office-a", "A"));
  const resolvers = new Map();
  const runtime = createOutlookTaskPaneRuntime({
    Office: office,
    windowObject: {},
    authenticateOnStart: false,
    resolveRestId: ({ Office }) => ({ rest_message_id: Office.context.mailbox.item.itemId }),
    readBody: ({ item: current }) => new Promise((resolve) => resolvers.set(current.itemId, resolve)),
    readClassification: async () => ({}),
    subscribeToItems: () => () => {},
  });

  const first = runtime.refreshItem();
  office.context.mailbox.item = item("office-b", "B");
  const second = runtime.refreshItem();
  resolvers.get("office-b")("body B");
  await second;
  resolvers.get("office-a")("body A");
  await first;

  assert.equal(runtime.getState().item.subject, "B");
  assert.equal(runtime.getState().item.body_preview, "body B");
  runtime.dispose();
});

test("ItemChanged clears the displayed capture and makes action POST impossible while B is pending", async () => {
  const office = mailbox(item("office-a", "A"));
  let itemChanged;
  let resolveB;
  let postCount = 0;
  const runtime = createOutlookTaskPaneRuntime({
    Office: office,
    windowObject: {},
    authenticateOnStart: false,
    initialAuthState: AUTH_STATE.authenticated,
    resolveRestId: ({ Office }) => ({ rest_message_id: Office.context.mailbox.item.itemId }),
    readBody: ({ item: current }) => current.itemId === "office-b"
      ? new Promise((resolve) => { resolveB = resolve; })
      : Promise.resolve(current.subject),
    readClassification: async () => ({}),
    subscribeToItems({ onChange }) {
      itemChanged = onChange;
      return () => {};
    },
    actionHandler: async ({ requestJson }) => {
      postCount += 1;
      return requestJson("/api/outlook/inquiries", { method: "POST" });
    },
    requestJson: async () => ({ outcome: "created" }),
  });

  runtime.start();
  await flush();
  await flush();
  assert.equal(runtime.getState().item.subject, "A");

  office.context.mailbox.item = item("office-b", "B");
  itemChanged();
  assert.equal(runtime.getState().item, null);
  assert.equal(runtime.getState().itemPending, true);
  await runtime.runAction("new");
  assert.equal(postCount, 0);

  resolveB("body B");
  await flush();
  assert.equal(runtime.getState().item.subject, "B");
  runtime.dispose();
});

test("overlapping timeout and late-ready reads install one subscription and dispose it once", async () => {
  const office = mailbox(item("office-a", "A"));
  let lateReady;
  let subscriptionCount = 0;
  let unsubscribeCount = 0;
  const readResolvers = [];
  const runtime = createOutlookTaskPaneRuntime({
    Office: office,
    windowObject: {},
    authenticateOnStart: false,
    waitForReady({ onLateReady }) {
      lateReady = onLateReady;
      return Promise.resolve({ status: "timed_out" });
    },
    resolveRestId: ({ Office }) => ({ rest_message_id: Office.context.mailbox.item.itemId }),
    readBody: () => new Promise((resolve) => { readResolvers.push(resolve); }),
    readClassification: async () => ({}),
    subscribeToItems() {
      subscriptionCount += 1;
      return () => { unsubscribeCount += 1; };
    },
  });

  runtime.start();
  await flush();
  await flush();
  assert.equal(readResolvers.length, 1);
  lateReady();
  await flush();
  await flush();
  assert.equal(readResolvers.length, 2);

  readResolvers[0]("stale");
  await flush();
  assert.equal(subscriptionCount, 0);
  readResolvers[1]("late");
  await flush();
  await flush();
  assert.equal(subscriptionCount, 1);

  runtime.dispose();
  assert.equal(unsubscribeCount, 1);
});
