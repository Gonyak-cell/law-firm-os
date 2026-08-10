import assert from "node:assert/strict";
import test from "node:test";
import {
  collectOutlookOperationReadbackRefs,
  createOutlookOperationItemContextRef,
  createOutlookOperationReceiptArchive,
  sanitizeOutlookOperationReceipt,
} from "../src/outlook-operation-receipts.js";
import { sanitizeOutlookOperationReceiptSummary } from "../src/outlook-operation-receipt-readback.js";
import { createOutlookOperationSnapshot, outlookItemContextKey, reconcileOutlookOperationResult } from "../src/outlook-item-events.js";

function item(suffix) {
  return {
    rest_message_id: `rest-${suffix}`, graph_message_id: `rest-${suffix}`, canonical_graph_message_id: `immutable-${suffix}`,
    internet_message_id: `<message-${suffix}@example.invalid>`, conversation_id: `conversation-${suffix}`, mode: "read", provenance: "received",
  };
}
function snapshot(suffix, matterId = "matter-001", operationStartKey = `operation-${suffix}`) {
  return createOutlookOperationSnapshot({ item: item(suffix), mode: "read", provenance: "received", matterId, operationStartKey });
}
function contextRef(operationSnapshot) {
  return createOutlookOperationItemContextRef({ itemContextKey: operationSnapshot.item_context_key, canonicalGraphMessageId: operationSnapshot.item_identity.canonical_graph_message_id });
}

test("ItemChanged 중 완료된 결과는 원래 item/Matter에 보관되고 새 item에는 적용되지 않는다", () => {
  const archive = createOutlookOperationReceiptArchive();
  const original = snapshot("a");
  const receipt = { request_id: "request-a", outcome: "created", item: { subject: "비공개 제목", body_preview: "비공개 본문", email_thread_id: "thread-a", filed_document_ids: ["doc-a"], participants: [{ email: "person@example.invalid" }] }, email_thread: { email_thread_id: "thread-a", filed_document_ids: ["doc-a"] }, timeline_event: { event_id: "event-a" }, access_token: "secret-token" };
  const stale = reconcileOutlookOperationResult({ snapshot: original, currentItem: item("b"), currentMode: "read", currentProvenance: "received", currentMatterId: "matter-002", currentOperationStartKey: "invalidated-after-item-change", actualCanonicalGraphMessageId: "immutable-a", receipt });
  archive.record({ operationSnapshot: original, receipt, operation: "file_email" });
  assert.equal(stale.apply_to_current_view, false);
  assert.equal(stale.rollback_requested, false);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(original), matterId: "matter-002" }).length, 0);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(original), matterId: original.matter_id }).length, 1);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(snapshot("b", "matter-002")), matterId: "matter-002" }).length, 0);
});

test("원래 item을 다시 선택하고 같은 Matter를 선택하면 durable readback과 교차 확인된 receipt만 보인다", () => {
  const archive = createOutlookOperationReceiptArchive();
  const original = snapshot("a");
  archive.record({ operationSnapshot: original, operation: "file_email", receipt: { request_id: "request-a", outcome: "created", email_thread: { email_thread_id: "thread-a" }, timeline_event: { event_id: "event-a" }, document_id: "doc-a" } });
  const durable = { timeline: [{ event_id: "event-a", source_ref: "thread-a" }], documents: [{ document_id: "doc-a", source_email_thread_id: "thread-a" }] };
  const recovered = archive.reconcileReadback({ itemContextRef: contextRef(original), matterId: original.matter_id, ...durable });
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].operation, "file_email");
  assert.deepEqual(collectOutlookOperationReadbackRefs(durable), ["doc-a", "event-a", "thread-a"]);
  assert.deepEqual(archive.reconcileReadback({ itemContextRef: contextRef(original), matterId: original.matter_id, timeline: [{ event_id: "unrelated-event" }], documents: [] }), []);
});

test("같은 작업의 duplicate/replay는 같은 sanitized 객체로 결정적으로 합쳐진다", () => {
  const archive = createOutlookOperationReceiptArchive();
  const operationSnapshot = snapshot("replay");
  const input = { operationSnapshot, operation: "file_email", receipt: { request_id: "request-first", outcome: "idempotent_replay", email_thread_id: "thread-replay", document_id: "doc-replay", timeline_event_id: "event-replay" } };
  const first = archive.record(input);
  assert.strictEqual(first, archive.record({ ...input, receipt: { ...input.receipt, request_id: "request-second" } }));
  assert.equal(archive.size, 1);
  assert.equal(first.request_id, "request-first");
});

test("archive는 count와 TTL을 모두 사용해 deterministic eviction한다", () => {
  let now = 1_000;
  const archive = createOutlookOperationReceiptArchive({ maxEntries: 2, ttlMs: 10, now: () => now });
  for (const suffix of ["one", "two", "three"]) { archive.record({ operationSnapshot: snapshot(suffix), operation: "file_email", receipt: { outcome: "created", document_id: `doc-${suffix}` } }); now += 1; }
  assert.equal(archive.size, 2);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(snapshot("one")), matterId: "matter-001" }).length, 0);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(snapshot("two")), matterId: "matter-001" }).length, 1);
  now += 10;
  assert.equal(archive.size, 0);
});

test("rehydrated old completed_at gets a fresh cached TTL while provenance stays immutable", () => {
  let now = 10_000;
  const archive = createOutlookOperationReceiptArchive({ ttlMs: 10, now: () => now });
  const operationSnapshot = snapshot("old-readback");
  const summary = sanitizeOutlookOperationReceiptSummary({ item_context_ref: contextRef(operationSnapshot), matter_id: operationSnapshot.matter_id, operation: "file_email", outcome: "created", email_thread_id: "thread-old-readback", completed_at: "1970-01-01T00:00:00.000Z" });
  archive.recordSummary(summary);
  assert.equal(archive.listForContext({ itemContextRef: contextRef(operationSnapshot), matterId: operationSnapshot.matter_id })[0].completed_at, "1970-01-01T00:00:00.000Z");
  now += 9; assert.equal(archive.size, 1); now += 1; assert.equal(archive.size, 0);
});

test("session scope rotation clears prior receipts without exposing token or tenant", () => {
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "session-a" });
  archive.record({ operationSnapshot: snapshot("session-scope"), operation: "file_email", receipt: { outcome: "created", email_thread_id: "thread-session" } });
  assert.equal(archive.size, 1); archive.setScope("session-b"); assert.equal(archive.size, 0);
});

test("public summary/index에는 subject, body, participant, token, raw nested payload가 없다", () => {
  const summary = sanitizeOutlookOperationReceipt({ operationSnapshot: snapshot("safe"), operation: "file_email", receipt: { request_id: "request-safe", outcome: "created", subject: "should-not-appear", body: "should-not-appear", body_preview: "should-not-appear", from: { email: "person@example.invalid" }, to: [{ email: "other@example.invalid" }], token: "should-not-appear", payload: { raw: "should-not-appear" }, email_thread_id: "thread-safe", document_id: "doc-safe", timeline_event_id: "event-safe" } });
  const json = JSON.stringify(summary);
  for (const forbidden of ["subject", "body", "body_preview", "person@example.invalid", "should-not-appear", "token", "payload"]) assert.equal(json.includes(forbidden), false, `summary leaked ${forbidden}`);
  assert.deepEqual(Object.keys(summary).sort(), ["completed_at", "document_ids", "email_thread_id", "item_context_ref", "matter_id", "operation", "outcome", "request_id", "timeline_event_ids"]);
});

test("context ref는 immutable item context와 canonical identity가 다르면 달라진다", () => {
  const operationSnapshot = snapshot("ref");
  assert.match(contextRef(operationSnapshot), /^item-context:[a-f0-9]{16}$/u);
  assert.notEqual(contextRef(operationSnapshot), createOutlookOperationItemContextRef({ itemContextKey: operationSnapshot.item_context_key, canonicalGraphMessageId: "immutable-other" }));
  assert.equal(outlookItemContextKey({ item: item("ref"), mode: "read", provenance: "received" }), operationSnapshot.item_context_key);
});

test("server readback restores only an exact sanitized summary into the bounded archive", () => {
  const operationSnapshot = snapshot("remount");
  const itemContextRef = contextRef(operationSnapshot);
  const archive = createOutlookOperationReceiptArchive();
  const restored = sanitizeOutlookOperationReceiptSummary({ item_context_ref: itemContextRef, matter_id: operationSnapshot.matter_id, operation: "file_email", outcome: "created", email_thread_id: "thread-remount", document_ids: ["doc-remount"], timeline_event_ids: ["event-remount"], completed_at: new Date().toISOString() });
  assert.ok(restored);
  assert.deepEqual(archive.recordSummary(restored), restored);
  assert.deepEqual(archive.listForContext({ itemContextRef, matterId: operationSnapshot.matter_id }), [restored]);
  assert.equal(sanitizeOutlookOperationReceiptSummary({ ...restored, subject: "PII must be rejected" }), null);
});
