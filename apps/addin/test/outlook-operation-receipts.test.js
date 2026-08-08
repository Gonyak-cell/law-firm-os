import assert from "node:assert/strict";
import test from "node:test";
import {
  createOutlookOperationItemContextRef,
  createOutlookOperationReceiptArchive,
  collectOutlookOperationReadbackRefs,
  sanitizeOutlookOperationReceipt,
} from "../src/outlook-operation-receipts.js";
import { sanitizeOutlookOperationReceiptSummary } from "../src/outlook-operation-receipt-readback.js";
import { createOutlookOperationReceiptController } from "../src/outlook-operation-receipt-controller.js";
import {
  createOutlookOperationSnapshot,
  outlookItemContextKey,
  reconcileOutlookOperationResult,
} from "../src/outlook-item-events.js";

function item(suffix) {
  return {
    rest_message_id: `rest-${suffix}`,
    graph_message_id: `rest-${suffix}`,
    canonical_graph_message_id: `immutable-${suffix}`,
    internet_message_id: `<message-${suffix}@example.invalid>`,
    conversation_id: `conversation-${suffix}`,
    mode: "read",
    provenance: "received",
  };
}

function snapshot(suffix, matterId = "matter-001", operationStartKey = `operation-${suffix}`) {
  return createOutlookOperationSnapshot({
    item: item(suffix),
    mode: "read",
    provenance: "received",
    matterId,
    operationStartKey,
  });
}

function contextRef(operationSnapshot) {
  return createOutlookOperationItemContextRef({
    itemContextKey: operationSnapshot.item_context_key,
    canonicalGraphMessageId: operationSnapshot.item_identity.canonical_graph_message_id,
  });
}

test("ItemChanged 중 완료된 결과는 원래 item/Matter에 보관되고 새 item에는 적용되지 않는다", () => {
  let now = 100;
  const archive = createOutlookOperationReceiptArchive({ now: () => now });
  const original = snapshot("a");
  const receipt = {
    request_id: "request-a",
    outcome: "created",
    item: {
      subject: "비공개 제목",
      body_preview: "비공개 본문",
      email_thread_id: "thread-a",
      filed_document_ids: ["doc-a"],
      participants: [{ email: "person@example.invalid" }],
    },
    email_thread: { email_thread_id: "thread-a", filed_document_ids: ["doc-a"] },
    timeline_event: { event_id: "event-a" },
    access_token: "secret-token",
  };
  const stale = reconcileOutlookOperationResult({
    snapshot: original,
    currentItem: item("b"),
    currentMode: "read",
    currentProvenance: "received",
    currentMatterId: "matter-002",
    currentOperationStartKey: "invalidated-after-item-change",
    actualCanonicalGraphMessageId: "immutable-a",
    receipt,
  });
  archive.record({ operationSnapshot: original, receipt, operation: "file_email" });

  assert.equal(stale.apply_to_current_view, false);
  assert.equal(stale.rollback_requested, false);
  assert.equal(archive.listForContext({
    itemContextRef: contextRef(original),
    matterId: "matter-002",
  }).length, 0);
  assert.equal(archive.listForContext({
    itemContextRef: contextRef(original),
    matterId: original.matter_id,
  }).length, 1);
  assert.equal(archive.listForContext({
    itemContextRef: contextRef(snapshot("b", "matter-002")),
    matterId: "matter-002",
  }).length, 0);
  now += 1;
});

test("원래 item을 다시 선택하고 같은 Matter를 선택하면 durable readback과 교차 확인된 receipt만 보인다", () => {
  const archive = createOutlookOperationReceiptArchive();
  const original = snapshot("a");
  archive.record({
    operationSnapshot: original,
    operation: "file_email",
    receipt: {
      request_id: "request-a",
      outcome: "created",
      email_thread: { email_thread_id: "thread-a" },
      timeline_event: { event_id: "event-a" },
      document_id: "doc-a",
    },
  });
  const recovered = archive.reconcileReadback({
    itemContextRef: contextRef(original),
    matterId: original.matter_id,
    timeline: [{ event_id: "event-a", source_ref: "thread-a" }],
    documents: [{ document_id: "doc-a", source_email_thread_id: "thread-a" }],
  });
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].operation, "file_email");
  assert.deepEqual(collectOutlookOperationReadbackRefs({
    timeline: [{ event_id: "event-a", source_ref: "thread-a" }],
    documents: [{ document_id: "doc-a", source_email_thread_id: "thread-a" }],
  }), ["doc-a", "event-a", "thread-a"]);
  assert.deepEqual(archive.reconcileReadback({
    itemContextRef: contextRef(original),
    matterId: original.matter_id,
    timeline: [{ event_id: "unrelated-event" }],
    documents: [],
  }), []);
});

test("같은 작업의 duplicate/replay는 같은 sanitized 객체로 결정적으로 합쳐진다", () => {
  const archive = createOutlookOperationReceiptArchive();
  const operationSnapshot = snapshot("replay");
  const input = {
    operationSnapshot,
    operation: "file_email",
    receipt: {
      request_id: "request-first",
      outcome: "idempotent_replay",
      email_thread_id: "thread-replay",
      document_id: "doc-replay",
      timeline_event_id: "event-replay",
    },
  };
  const first = archive.record(input);
  const second = archive.record({
    ...input,
    receipt: { ...input.receipt, request_id: "request-second" },
  });
  assert.strictEqual(first, second);
  assert.equal(archive.size, 1);
  assert.equal(first.request_id, "request-first");
});

test("archive는 count와 TTL을 모두 사용해 deterministic eviction한다", () => {
  let now = 1_000;
  const archive = createOutlookOperationReceiptArchive({
    maxEntries: 2,
    ttlMs: 10,
    now: () => now,
  });
  const one = snapshot("one");
  const two = snapshot("two");
  const three = snapshot("three");
  archive.record({ operationSnapshot: one, operation: "file_email", receipt: { outcome: "created", document_id: "doc-one" } });
  now += 1;
  archive.record({ operationSnapshot: two, operation: "file_email", receipt: { outcome: "created", document_id: "doc-two" } });
  now += 1;
  archive.record({ operationSnapshot: three, operation: "file_email", receipt: { outcome: "created", document_id: "doc-three" } });
  assert.equal(archive.size, 2);
  assert.deepEqual(archive.listForContext({ itemContextRef: contextRef(one), matterId: one.matter_id }), []);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(two), matterId: two.matter_id }).length, 1);
  now += 10;
  assert.equal(archive.size, 0);
});

test("rehydrated old completed_at gets a fresh cached TTL while provenance stays immutable", () => {
  let now = 10_000;
  const archive = createOutlookOperationReceiptArchive({ ttlMs: 10, now: () => now });
  const operationSnapshot = snapshot("old-readback");
  const summary = sanitizeOutlookOperationReceiptSummary({
    item_context_ref: contextRef(operationSnapshot),
    matter_id: operationSnapshot.matter_id,
    operation: "file_email",
    outcome: "created",
    email_thread_id: "thread-old-readback",
    completed_at: "1970-01-01T00:00:00.000Z",
  });
  archive.recordSummary(summary);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(operationSnapshot), matterId: operationSnapshot.matter_id })[0].completed_at, "1970-01-01T00:00:00.000Z");
  now += 9;
  assert.equal(archive.size, 1);
  now += 1;
  assert.equal(archive.size, 0);
});

test("session scope rotation clears prior receipts without exposing token or tenant", () => {
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "session-a" });
  const operationSnapshot = snapshot("session-scope");
  archive.record({
    operationSnapshot,
    operation: "file_email",
    receipt: { outcome: "created", email_thread_id: "thread-session" },
  });
  assert.equal(archive.size, 1);
  archive.setScope("session-b");
  assert.equal(archive.size, 0);
  assert.doesNotMatch(JSON.stringify(archive), /token|tenant/u);
});

test("public summary/index에는 subject, body, participant, token, raw nested payload가 없다", () => {
  const operationSnapshot = snapshot("safe");
  const summary = sanitizeOutlookOperationReceipt({
    operationSnapshot,
    operation: "file_email",
    receipt: {
      request_id: "request-safe",
      outcome: "created",
      subject: "should-not-appear",
      body: "should-not-appear",
      body_preview: "should-not-appear",
      from: { email: "person@example.invalid" },
      to: [{ email: "other@example.invalid" }],
      token: "should-not-appear",
      payload: { raw: "should-not-appear" },
      email_thread_id: "thread-safe",
      document_id: "doc-safe",
      timeline_event_id: "event-safe",
    },
  });
  const json = JSON.stringify(summary);
  for (const forbidden of ["subject", "body", "body_preview", "person@example.invalid", "should-not-appear", "token", "payload"]) {
    assert.equal(json.includes(forbidden), false, `summary leaked ${forbidden}`);
  }
  assert.deepEqual(Object.keys(summary).sort(), [
    "completed_at",
    "document_ids",
    "email_thread_id",
    "item_context_ref",
    "matter_id",
    "operation",
    "outcome",
    "request_id",
    "timeline_event_ids",
  ]);
});

test("context ref는 immutable item context와 canonical identity가 다르면 달라진다", () => {
  const operationSnapshot = snapshot("ref");
  const ref = contextRef(operationSnapshot);
  assert.match(ref, /^item-context:[a-f0-9]{16}$/u);
  assert.notEqual(ref, createOutlookOperationItemContextRef({
    itemContextKey: operationSnapshot.item_context_key,
    canonicalGraphMessageId: "immutable-other",
  }));
  assert.equal(outlookItemContextKey({
    item: item("ref"),
    mode: "read",
    provenance: "received",
  }), operationSnapshot.item_context_key);
});

test("server readback restores only an exact sanitized summary into the bounded archive", () => {
  const operationSnapshot = snapshot("remount");
  const itemContextRef = contextRef(operationSnapshot);
  const archive = createOutlookOperationReceiptArchive();
  const restored = sanitizeOutlookOperationReceiptSummary({
    item_context_ref: itemContextRef,
    matter_id: operationSnapshot.matter_id,
    operation: "file_email",
    outcome: "created",
    email_thread_id: "thread-remount",
    document_ids: ["doc-remount"],
    timeline_event_ids: ["event-remount"],
    completed_at: new Date().toISOString(),
  });
  assert.ok(restored);
  assert.deepEqual(archive.recordSummary(restored), restored);
  assert.deepEqual(archive.listForContext({ itemContextRef, matterId: operationSnapshot.matter_id }), [restored]);
  assert.equal(sanitizeOutlookOperationReceiptSummary({
    ...restored,
    subject: "PII must be rejected",
  }), null);
});

test("controller quarantines A completion from B and restores it only after fresh remount readback", async () => {
  const original = item("controller-a");
  const other = item("controller-b");
  const originalSnapshot = snapshot("controller-a", "matter-controller-a", "operation-controller-a");
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "session-a" });
  const requests = [];
  const controller = createOutlookOperationReceiptController({
    archive,
    requestJson: async (_path, options) => {
      requests.push(options);
      return { items: [] };
    },
  });
  const stale = controller.recordCompletion({
    operationSnapshot: originalSnapshot,
    receipt: {
      outcome: "created",
      request_id: "request-controller-a",
      email_thread: { email_thread_id: "thread-controller-a" },
      document_id: "document-controller-a",
      timeline_event_id: "timeline-controller-a",
    },
    operation: "file_email",
    currentItem: other,
    currentMatterId: "matter-controller-b",
    currentOperationStartKey: "operation-controller-b",
  });
  assert.equal(stale.result.apply_to_current_view, false);
  assert.equal(stale.result.rollback_requested, false);
  assert.deepEqual(controller.sync({ currentItem: other, matterId: "matter-controller-b" }), []);
  assert.deepEqual(controller.sync({
    currentItem: original,
    matterId: "matter-controller-a",
    timeline: [{ event_id: "unrelated" }],
    documents: [],
  }), []);

  const freshArchive = createOutlookOperationReceiptArchive({ scopeRef: "session-b" });
  const freshController = createOutlookOperationReceiptController({
    archive: freshArchive,
    requestJson: async (_path, options) => {
      requests.push(options);
      return {
        items: [{
          item_context_ref: controller.itemContextRef(original),
          matter_id: "matter-controller-a",
          operation: "file_email",
          outcome: "created",
          email_thread_id: "thread-controller-a",
          document_ids: ["document-controller-a"],
          timeline_event_ids: ["timeline-controller-a"],
          completed_at: "2026-08-08T00:00:00.000Z",
        }],
      };
    },
  });
  assert.equal(freshController.archive.size, 0);
  const recovered = await freshController.restore({
    matterId: "matter-controller-a",
    currentItem: original,
  });
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].email_thread_id, "thread-controller-a");
  assert.equal(requests.at(-1).body.current_item.rest_message_id, original.rest_message_id);
  assert.equal("item" in requests.at(-1).body, false);
});

test("pending readback from an old session cannot repopulate after clear or dispose", async () => {
  const current = item("owner-barrier");
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "owner-a" });
  let resolveReadback;
  let displayed = null;
  const controller = createOutlookOperationReceiptController({
    archive,
    requestJson: async () => new Promise((resolve) => { resolveReadback = resolve; }),
  });
  const pending = controller.restore({
    matterId: "matter-owner-barrier",
    currentItem: current,
  }).then((receipts) => {
    displayed = receipts[0] ?? null;
    return receipts;
  });
  controller.clear();
  resolveReadback({ items: [{
    item_context_ref: controller.itemContextRef(current),
    matter_id: "matter-owner-barrier",
    operation: "file_email",
    outcome: "created",
    email_thread_id: "thread-owner-barrier",
    completed_at: "2026-08-08T00:00:00.000Z",
  }] });
  assert.deepEqual(await pending, []);
  assert.equal(displayed, null);
  assert.equal(archive.size, 0);
  let resolveDisposed;
  const disposedPending = controller.restore({
    matterId: "matter-disposed",
    currentItem: item("disposed"),
  });
  resolveDisposed = resolveReadback;
  controller.dispose();
  resolveDisposed({ items: [{
    item_context_ref: controller.itemContextRef(item("disposed")),
    matter_id: "matter-disposed",
    operation: "file_email",
    outcome: "created",
    email_thread_id: "thread-disposed",
    completed_at: "2026-08-08T00:00:00.000Z",
  }] });
  assert.deepEqual(await disposedPending, []);
  assert.equal(archive.size, 0);
});

test("matter restore generation fences A response after B selection and permits only fresh A readback", async () => {
  const original = item("matter-race-a");
  const other = item("matter-race-b");
  let currentMatter = "matter-race-a";
  let resolveFirstA;
  let resolveSecondA;
  const aResponses = [
    new Promise((resolve) => { resolveFirstA = resolve; }),
    new Promise((resolve) => { resolveSecondA = resolve; }),
  ];
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "matter-race" });
  const controller = createOutlookOperationReceiptController({
    archive,
    requestJson: async (_path, options) => {
      if (options.body.current_item.rest_message_id === original.rest_message_id) return aResponses.shift();
      throw new Error("matter B readback unavailable");
    },
  });
  let displayed = null;
  const applyRestore = (matterId, currentItem) => controller.restore({
    matterId,
    currentItem,
    isCurrent: () => currentMatter === matterId,
  }).then((receipts) => {
    if (receipts[0]) displayed = receipts[0];
  }).catch(() => {});

  const firstA = applyRestore("matter-race-a", original);
  currentMatter = "matter-race-b";
  const b = applyRestore("matter-race-b", other);
  currentMatter = "matter-race-a";
  const secondA = applyRestore("matter-race-a", original);
  resolveFirstA({ items: [{
    item_context_ref: controller.itemContextRef(original),
    matter_id: "matter-race-a",
    operation: "file_email",
    outcome: "created",
    email_thread_id: "thread-old-a",
    completed_at: "2026-08-08T00:00:00.000Z",
  }] });
  await Promise.all([firstA, b]);
  assert.equal(displayed, null);
  assert.equal(archive.size, 0);
  resolveSecondA({ items: [{
    item_context_ref: controller.itemContextRef(original),
    matter_id: "matter-race-a",
    operation: "file_email",
    outcome: "created",
    email_thread_id: "thread-fresh-a",
    completed_at: "2026-08-08T00:01:00.000Z",
  }] });
  await secondA;
  assert.equal(displayed.email_thread_id, "thread-fresh-a");
  assert.equal(archive.size, 1);
});

test("fresh empty-memory remount restores each durable Outlook operation kind without relabeling", async () => {
  const current = item("remount-operation-kinds");
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "remount-operation-kinds" });
  const controller = createOutlookOperationReceiptController({
    archive,
    requestJson: async () => ({ items: [
      {
        item_context_ref: createOutlookOperationItemContextRef({
          itemContextKey: outlookItemContextKey({ item: current, mode: current.mode, provenance: current.provenance }),
          canonicalGraphMessageId: current.canonical_graph_message_id,
        }),
        matter_id: "matter-remount-operation-kinds",
        operation: "file_email",
        outcome: "created",
        email_thread_id: "thread-remount-operation-kinds",
        document_ids: ["document-original"],
        timeline_event_ids: ["timeline-file"],
        completed_at: "2026-08-08T00:00:00.000Z",
      },
      {
        item_context_ref: createOutlookOperationItemContextRef({
          itemContextKey: outlookItemContextKey({ item: current, mode: current.mode, provenance: current.provenance }),
          canonicalGraphMessageId: current.canonical_graph_message_id,
        }),
        matter_id: "matter-remount-operation-kinds",
        operation: "save_attachments",
        outcome: "attachments_saved",
        email_thread_id: "thread-remount-operation-kinds",
        document_ids: ["document-attachment"],
        timeline_event_ids: ["timeline-attachment"],
        completed_at: "2026-08-08T00:01:00.000Z",
      },
      {
        item_context_ref: createOutlookOperationItemContextRef({
          itemContextKey: outlookItemContextKey({ item: current, mode: current.mode, provenance: current.provenance }),
          canonicalGraphMessageId: current.canonical_graph_message_id,
        }),
        matter_id: "matter-remount-operation-kinds",
        operation: "create_followup",
        outcome: "created",
        email_thread_id: "thread-remount-operation-kinds",
        timeline_event_ids: ["timeline-followup"],
        completed_at: "2026-08-08T00:02:00.000Z",
      },
    ]}),
  });
  const restored = await controller.restore({
    matterId: "matter-remount-operation-kinds",
    currentItem: current,
  });
  assert.deepEqual(restored.map((entry) => entry.operation), [
    "create_followup",
    "save_attachments",
    "file_email",
  ]);
  assert.deepEqual(restored.find((entry) => entry.operation === "save_attachments").document_ids, ["document-attachment"]);
  assert.deepEqual(restored.find((entry) => entry.operation === "create_followup").timeline_event_ids, ["timeline-followup"]);
});
