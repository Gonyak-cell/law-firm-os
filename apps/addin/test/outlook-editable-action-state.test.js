import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import test from "node:test";
import {
  createOutlookEditorContextStore,
  createOutlookIntentIdempotencyKey,
  resolveOutlookTaskSourceEmailThreadId,
  withOptionalOutlookMatterReadback,
} from "../src/outlook-editable-action-state.js";
import {
  outlookItemContextKey,
  outlookItemIdentityKey,
} from "../src/outlook-item-events.js";

function item(suffix, canonical = undefined) {
  return {
    rest_message_id: `rest-${suffix}`,
    internet_message_id: `<internet-${suffix}@example.invalid>`,
    conversation_id: `conversation-${suffix}`,
    mode: "read",
    provenance: "received",
    ...(canonical ? { canonical_graph_message_id: canonical } : {}),
  };
}

function filedResult(currentItem, matterId, threadId = "thread-1") {
  return {
    local_outlook_item_key: outlookItemIdentityKey(currentItem),
    local_matter_id: matterId,
    email_thread_id: threadId,
  };
}

test("editor state is isolated by exact item plus Matter and evicts least recently used entries", () => {
  const current = item("a");
  const other = item("b");
  const isolated = createOutlookEditorContextStore(4);
  const currentMatter = { item: current, matterId: "matter-a", value: "current" };
  const otherMatter = { item: current, matterId: "matter-b", value: "other-matter" };
  const otherItem = { item: other, matterId: "matter-a", value: "other-item" };

  assert.equal(isolated.save(currentMatter), true);
  assert.equal(isolated.save(otherMatter), true);
  assert.equal(isolated.save(otherItem), true);
  assert.equal(isolated.load(currentMatter), "current");
  assert.equal(isolated.load(otherMatter), "other-matter");
  assert.equal(isolated.load(otherItem), "other-item");

  const lru = createOutlookEditorContextStore(2);
  lru.save({ item: current, matterId: "matter-a", value: "old-a" });
  lru.save({ item: current, matterId: "matter-b", value: "keep-b" });
  lru.save({ item: other, matterId: "matter-a", value: "new-a" });
  assert.equal(lru.size, 2);
  assert.equal(lru.load({ item: current, matterId: "matter-a" }), null);
  assert.equal(lru.load({ item: current, matterId: "matter-b" }), "keep-b");
  assert.equal(lru.load({ item: other, matterId: "matter-a" }), "new-a");
});

test("A to B to A restores create and PATCH task identity/version, drafts, time, and source", () => {
  const current = item("a");
  const other = item("b");
  const store = createOutlookEditorContextStore();
  const created = {
    taskDraft: { title: "Create A", status: "todo" },
    taskResult: { outcome: "task_created", item: { activity_id: "task-a", version: 1 } },
    taskSourceEmailThreadId: "thread-a",
    timeDraft: { narrative: "Review A", duration_minutes: "30", billable: true },
    timeDraftResult: { item: { draft_ref: "draft-a", version: 1 } },
  };
  const otherState = {
    taskDraft: { title: "Create B", status: "todo" },
    taskResult: { outcome: "task_created", item: { activity_id: "task-b", version: 1 } },
    taskSourceEmailThreadId: "thread-b",
    timeDraft: { narrative: "Review B", duration_minutes: "45", billable: false },
    timeDraftResult: { item: { draft_ref: "draft-b", version: 1 } },
  };
  const patched = {
    ...created,
    taskDraft: { title: "Patched A", status: "in_progress" },
    taskResult: { outcome: "task_updated", item: { activity_id: "task-a", version: 2 } },
    timeDraft: { narrative: "Review A again", duration_minutes: "60", billable: true },
    timeDraftResult: { item: { draft_ref: "draft-a", version: 2 } },
  };

  store.save({ item: current, matterId: "matter-a", value: created });
  store.save({ item: other, matterId: "matter-b", value: otherState });
  assert.deepEqual(store.load({ item: current, matterId: "matter-a" }), created);
  store.save({ item: current, matterId: "matter-a", value: patched });
  assert.deepEqual(store.load({ item: other, matterId: "matter-b" }), otherState);
  assert.deepEqual(store.load({ item: current, matterId: "matter-a" }), patched);
  assert.equal(resolveOutlookTaskSourceEmailThreadId({
    retainedContextSourceEmailThreadId: patched.taskSourceEmailThreadId,
    currentItem: current,
    matterId: "matter-a",
  }), "thread-a");
});

test("auth or Outlook disconnect can clear every retained editor context", () => {
  const store = createOutlookEditorContextStore();
  const current = item("clear");
  store.save({ item: current, matterId: "matter-clear", value: { taskDraft: { title: "clear me" } } });
  assert.equal(store.size, 1);
  store.clear();
  assert.equal(store.size, 0);
  assert.equal(store.load({ item: current, matterId: "matter-clear" }), null);
});

test("delayed canonical identity keeps the same context key and restores state", () => {
  const beforeCanonical = item("canonical");
  const afterCanonical = item("canonical", "immutable-canonical");
  const beforeKey = outlookItemContextKey({ item: beforeCanonical, mode: "read", provenance: "received" });
  const afterKey = outlookItemContextKey({ item: afterCanonical, mode: "read", provenance: "received" });
  assert.equal(beforeKey, afterKey);

  const state = { taskResult: { item: { activity_id: "task-canonical", version: 3 } }, state: "working" };
  const store = createOutlookEditorContextStore();
  store.save({ item: beforeCanonical, matterId: "matter-canonical", value: state });
  assert.deepEqual(store.load({ item: afterCanonical, matterId: "matter-canonical" }), state);
});

test("intent keys are exact SHA-256 fingerprints and change for every canonical field", async () => {
  const intent = {
    operation: "create",
    item_context_key: "item-context-a",
    matter_id: "matter-a",
    task_id: null,
    expected_version: null,
    source_email_thread_id: "thread-a",
    task: { title: "Draft A", status: "todo" },
  };
  const first = await createOutlookIntentIdempotencyKey("outlook-task", intent, webcrypto);
  const second = await createOutlookIntentIdempotencyKey("outlook-task", { ...intent }, webcrypto);
  assert.equal(first, second);
  assert.equal(
    first,
    `outlook-task:${createHash("sha256").update(JSON.stringify(intent)).digest("hex")}`,
  );

  const changes = [
    ["item_context_key", "item-context-b"],
    ["matter_id", "matter-b"],
    ["task", { title: "Draft B", status: "todo" }],
    ["source_email_thread_id", "thread-b"],
    ["task_id", "task-a"],
    ["expected_version", 2],
  ];
  for (const [field, value] of changes) {
    assert.notEqual(
      await createOutlookIntentIdempotencyKey("outlook-task", { ...intent, [field]: value }, webcrypto),
      first,
      `${field} must change the idempotency key`,
    );
  }
});

test("intent key fails closed when WebCrypto is unavailable", async () => {
  await assert.rejects(
    createOutlookIntentIdempotencyKey("outlook-task", { operation: "create" }, {}),
    (error) => error?.safe_error_code === "OUTLOOK_OPERATION_KEY_UNAVAILABLE",
  );
});

test("task source includes only the current filed email and is null for stale, foreign, or updates", () => {
  const current = item("source");
  const filed = filedResult(current, "matter-source");
  assert.equal(resolveOutlookTaskSourceEmailThreadId({
    emailResult: filed,
    currentItem: current,
    matterId: "matter-source",
  }), "thread-1");
  assert.equal(resolveOutlookTaskSourceEmailThreadId({
    emailResult: filed,
    currentItem: item("different"),
    matterId: "matter-source",
  }), null);
  assert.equal(resolveOutlookTaskSourceEmailThreadId({
    emailResult: filed,
    currentItem: current,
    matterId: "matter-foreign",
  }), null);
  assert.equal(resolveOutlookTaskSourceEmailThreadId({
    existingTask: { activity_id: "task-source", version: 4 },
    emailResult: filed,
    currentItem: current,
    matterId: "matter-source",
  }), null);
});

test("optional readback preserves success and returns one durable pending result on failure", async () => {
  const result = { outcome: "task_created", item: { activity_id: "task-readback", version: 1 } };
  let successCalls = 0;
  assert.strictEqual(
    await withOptionalOutlookMatterReadback(result, async () => { successCalls += 1; }),
    result,
  );
  assert.equal(successCalls, 1);

  let failureCalls = 0;
  const pending = await withOptionalOutlookMatterReadback(result, async () => {
    failureCalls += 1;
    throw new Error("readback unavailable");
  });
  assert.deepEqual(pending, { ...result, outlook_readback_pending: true });
  assert.equal(failureCalls, 1);
  assert.deepEqual(result, { outcome: "task_created", item: { activity_id: "task-readback", version: 1 } });
});
