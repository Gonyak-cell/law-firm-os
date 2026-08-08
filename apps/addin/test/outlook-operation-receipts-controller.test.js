import assert from "node:assert/strict";
import test from "node:test";
import { handleOutlookAddinApiRequest } from "../../api/src/outlook-addin-runtime-context.js";
import { runtimeFixture, CANONICAL_ID, CONVERSATION_ID, DOCUMENT_ID, FILE_KEY, INTERNET_ID, MATTER, REST_ID, TENANT, THREAD_ID } from "../../api/test/outlook-operation-receipt-readback-fixture.js";
import { createOutlookOperationReceiptController } from "../src/outlook-operation-receipt-controller.js";
import { createOutlookOperationItemContextRef, createOutlookOperationReceiptArchive } from "../src/outlook-operation-receipts.js";
import { createOutlookOperationSnapshot, outlookItemContextKey } from "../src/outlook-item-events.js";

function item(suffix) {
  return { rest_message_id: `rest-${suffix}`, graph_message_id: `rest-${suffix}`, canonical_graph_message_id: `immutable-${suffix}`, internet_message_id: `<message-${suffix}@example.invalid>`, conversation_id: `conversation-${suffix}`, mode: "read", provenance: "received" };
}
function snapshot(suffix, matterId = "matter-001", operationStartKey = `operation-${suffix}`) {
  return createOutlookOperationSnapshot({ item: item(suffix), mode: "read", provenance: "received", matterId, operationStartKey });
}
function contextRef(operationSnapshot) {
  return createOutlookOperationItemContextRef({ itemContextKey: operationSnapshot.item_context_key, canonicalGraphMessageId: operationSnapshot.item_identity.canonical_graph_message_id });
}

test("controller quarantines A completion from B and restores it only after fresh remount readback", async () => {
  const original = item("controller-a");
  const other = item("controller-b");
  const originalSnapshot = snapshot("controller-a", "matter-controller-a", "operation-controller-a");
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "session-a" });
  const requests = [];
  const controller = createOutlookOperationReceiptController({ archive, requestJson: async (_path, options) => { requests.push(options); return { items: [] }; } });
  const stale = controller.recordCompletion({ operationSnapshot: originalSnapshot, receipt: { outcome: "created", request_id: "request-controller-a", email_thread: { email_thread_id: "thread-controller-a" }, document_id: "document-controller-a", timeline_event_id: "timeline-controller-a" }, operation: "file_email", currentItem: other, currentMatterId: "matter-controller-b", currentOperationStartKey: "operation-controller-b" });
  assert.equal(stale.result.apply_to_current_view, false);
  assert.equal(stale.result.rollback_requested, false);
  assert.deepEqual(controller.sync({ currentItem: other, matterId: "matter-controller-b" }), []);
  assert.deepEqual(controller.sync({ currentItem: original, matterId: "matter-controller-a", timeline: [{ event_id: "unrelated" }], documents: [] }), []);
  const freshArchive = createOutlookOperationReceiptArchive({ scopeRef: "session-b" });
  const freshController = createOutlookOperationReceiptController({ archive: freshArchive, requestJson: async (_path, options) => { requests.push(options); return { items: [{ item_context_ref: controller.itemContextRef(original), matter_id: "matter-controller-a", operation: "file_email", outcome: "created", email_thread_id: "thread-controller-a", document_ids: ["document-controller-a"], timeline_event_ids: ["timeline-controller-a"], completed_at: "2026-08-08T00:00:00.000Z" }] }; } });
  assert.equal(freshController.archive.size, 0);
  const recovered = await freshController.restore({ matterId: "matter-controller-a", currentItem: original });
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
  const controller = createOutlookOperationReceiptController({ archive, requestJson: async () => new Promise((resolve) => { resolveReadback = resolve; }) });
  const pending = controller.restore({ matterId: "matter-owner-barrier", currentItem: current }).then((receipts) => { displayed = receipts[0] ?? null; return receipts; });
  controller.clear();
  resolveReadback({ items: [{ item_context_ref: controller.itemContextRef(current), matter_id: "matter-owner-barrier", operation: "file_email", outcome: "created", email_thread_id: "thread-owner-barrier", completed_at: "2026-08-08T00:00:00.000Z" }] });
  assert.deepEqual(await pending, []); assert.equal(displayed, null); assert.equal(archive.size, 0);
  let resolveDisposed;
  const disposedPending = controller.restore({ matterId: "matter-disposed", currentItem: item("disposed") });
  resolveDisposed = resolveReadback; controller.dispose();
  resolveDisposed({ items: [{ item_context_ref: controller.itemContextRef(item("disposed")), matter_id: "matter-disposed", operation: "file_email", outcome: "created", email_thread_id: "thread-disposed", completed_at: "2026-08-08T00:00:00.000Z" }] });
  assert.deepEqual(await disposedPending, []); assert.equal(archive.size, 0);
});

test("matter restore generation fences A response after B selection and permits only fresh A readback", async () => {
  const original = item("matter-race-a");
  const other = item("matter-race-b");
  let currentMatter = "matter-race-a";
  let resolveFirstA;
  let resolveSecondA;
  const aResponses = [new Promise((resolve) => { resolveFirstA = resolve; }), new Promise((resolve) => { resolveSecondA = resolve; })];
  const archive = createOutlookOperationReceiptArchive({ scopeRef: "matter-race" });
  const controller = createOutlookOperationReceiptController({ archive, requestJson: async (_path, options) => options.body.current_item.rest_message_id === original.rest_message_id ? aResponses.shift() : Promise.reject(new Error("matter B readback unavailable")) });
  let displayed = null;
  const restore = (matterId, currentItem) => controller.restore({ matterId, currentItem, isCurrent: () => currentMatter === matterId }).then((receipts) => { if (receipts[0]) displayed = receipts[0]; }).catch(() => {});
  const firstA = restore("matter-race-a", original); currentMatter = "matter-race-b"; const b = restore("matter-race-b", other); currentMatter = "matter-race-a"; const secondA = restore("matter-race-a", original);
  resolveFirstA({ items: [{ item_context_ref: controller.itemContextRef(original), matter_id: "matter-race-a", operation: "file_email", outcome: "created", email_thread_id: "thread-old-a", completed_at: "2026-08-08T00:00:00.000Z" }] });
  await Promise.all([firstA, b]); assert.equal(displayed, null); assert.equal(archive.size, 0);
  resolveSecondA({ items: [{ item_context_ref: controller.itemContextRef(original), matter_id: "matter-race-a", operation: "file_email", outcome: "created", email_thread_id: "thread-fresh-a", completed_at: "2026-08-08T00:01:00.000Z" }] });
  await secondA; assert.equal(displayed.email_thread_id, "thread-fresh-a"); assert.equal(archive.size, 1);
});

test("fresh empty-memory remount restores each durable Outlook operation kind without relabeling", async () => {
  const current = item("remount-operation-kinds");
  const ref = createOutlookOperationItemContextRef({ itemContextKey: outlookItemContextKey({ item: current, mode: current.mode, provenance: current.provenance }), canonicalGraphMessageId: current.canonical_graph_message_id });
  const controller = createOutlookOperationReceiptController({ archive: createOutlookOperationReceiptArchive({ scopeRef: "remount-operation-kinds" }), requestJson: async () => ({ items: [
    { item_context_ref: ref, matter_id: "matter-remount-operation-kinds", operation: "file_email", outcome: "created", filing_mode: "sent", email_thread_id: "thread-remount-operation-kinds", document_ids: ["document-original"], timeline_event_ids: ["timeline-file"], completed_at: "2026-08-08T00:00:00.000Z" },
    { item_context_ref: ref, matter_id: "matter-remount-operation-kinds", operation: "save_attachments", outcome: "attachments_saved", email_thread_id: "thread-remount-operation-kinds", document_ids: ["document-attachment"], timeline_event_ids: ["timeline-attachment"], completed_at: "2026-08-08T00:01:00.000Z" },
    { item_context_ref: ref, matter_id: "matter-remount-operation-kinds", operation: "create_followup", outcome: "created", email_thread_id: "thread-remount-operation-kinds", timeline_event_ids: ["timeline-followup"], completed_at: "2026-08-08T00:02:00.000Z" },
  ] }) });
  const restored = await controller.restore({ matterId: "matter-remount-operation-kinds", currentItem: current });
  assert.deepEqual(restored.map((entry) => entry.operation), ["create_followup", "save_attachments", "file_email"]);
  assert.deepEqual(restored.find((entry) => entry.operation === "save_attachments").document_ids, ["document-attachment"]);
  assert.deepEqual(restored.find((entry) => entry.operation === "create_followup").timeline_event_ids, ["timeline-followup"]);
  assert.equal(restored.find((entry) => entry.operation === "file_email").filing_mode, "sent");
});

test("fresh controller stays empty when the API rejects a wrong durable receipt binding", async () => {
  const currentItem = { rest_message_id: REST_ID, canonical_graph_message_id: CANONICAL_ID, internet_message_id: INTERNET_ID, conversation_id: CONVERSATION_ID, mode: "read", provenance: "received" };
  for (const overrides of [{ operation: "different_operation" }, { response: { email_thread_id: THREAD_ID, matter_id: MATTER, filed_document_ids: ["document:other"], outcome: "created" } }, { request_fingerprint: "0".repeat(64) }]) {
    const fixture = runtimeFixture();
    const key = `${FILE_KEY}:dms`;
    const before = fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: key });
    fixture.dmsRepository.recordIdempotency({ ...before, ...overrides, response: overrides.response ?? before.response });
    const controller = createOutlookOperationReceiptController({ archive: createOutlookOperationReceiptArchive({ scopeRef: `adversarial-${String(overrides.operation ?? "binding")}` }), requestJson: async (_path, options) => (await handleOutlookAddinApiRequest({ pathname: "/api/outlook/operation-receipts/readback", method: "POST", body: options.body, requestId: "request:fresh-controller", context: fixture.context, runtime: fixture.runtime })).body });
    assert.deepEqual(await controller.restore({ matterId: MATTER, currentItem }), []);
    assert.equal(controller.archive.size, 0);
  }
});

test("fresh controller stays empty for a foreign digest or legacy receipt without canonical audit", async () => {
  const currentItem = { rest_message_id: REST_ID, canonical_graph_message_id: CANONICAL_ID, internet_message_id: INTERNET_ID, conversation_id: CONVERSATION_ID, mode: "read", provenance: "received" };
  for (const mode of ["foreign-digest", "missing-audit"]) {
    const fixture = runtimeFixture();
    const key = `${FILE_KEY}:dms`;
    const existing = fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: key });
    if (mode === "foreign-digest") {
      fixture.dmsRepository.recordIdempotency({ ...existing, operation: "foreign_operation" });
      fixture.dmsRepository.recordIdempotency({ ...existing, idempotency_key: `outlook-email-file:${THREAD_ID}:${"f".repeat(64)}:dms` });
    } else {
      fixture.dmsRepository.recordIdempotency({ ...existing, request_fingerprint: null });
      fixture.dmsRepository.appendAudit({ event_id: `outlook.email.file:${TENANT}:${THREAD_ID}`, tenant_id: TENANT, actor_id: "foreign-audit-actor", action: "dms.email.thread.file", object_type: "DmsEmailThread", object_id: THREAD_ID, decision: "allow", reason: "email_thread_filed_to_matter" });
    }
    const controller = createOutlookOperationReceiptController({ archive: createOutlookOperationReceiptArchive({ scopeRef: `adversarial-${mode}` }), requestJson: async (_path, options) => (await handleOutlookAddinApiRequest({ pathname: "/api/outlook/operation-receipts/readback", method: "POST", body: options.body, requestId: `request:fresh-controller-${mode}`, context: fixture.context, runtime: fixture.runtime })).body });
    assert.deepEqual(await controller.restore({ matterId: MATTER, currentItem }), []);
    assert.equal(controller.archive.size, 0);
  }
});

test("fresh controller stays empty when DMS FileObject is deleted or filing audit is absent", async () => {
  const currentItem = { rest_message_id: REST_ID, canonical_graph_message_id: CANONICAL_ID, internet_message_id: INTERNET_ID, conversation_id: CONVERSATION_ID, mode: "read", provenance: "received" };
  for (const mode of ["deleted-file-object", "missing-filing-audit"]) {
    const fixture = runtimeFixture();
    const key = `${FILE_KEY}:dms`;
    if (mode === "deleted-file-object") {
      const version = fixture.dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocumentVersion", version_id: "version:readback-a" });
      fixture.dmsRepository.delete({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: version.file_object_id });
    } else {
      fixture.dmsRepository.appendAudit({
        event_id: `outlook.email.file:${TENANT}:${THREAD_ID}`,
        tenant_id: TENANT,
        actor_id: "foreign-audit",
        action: "dms.email.thread.file",
        object_type: "DmsEmailThread",
        object_id: THREAD_ID,
        decision: "allow",
        reason: "email_thread_filed_to_matter",
        occurred_at: "2026-08-08T00:00:00.000Z",
      });
    }
    const controller = createOutlookOperationReceiptController({
      archive: createOutlookOperationReceiptArchive({ scopeRef: `deleted-authority-${mode}` }),
      requestJson: async (_path, options) => (await handleOutlookAddinApiRequest({
        pathname: "/api/outlook/operation-receipts/readback",
        method: "POST",
        body: options.body,
        requestId: `request:deleted-authority-${mode}`,
        context: fixture.context,
        runtime: fixture.runtime,
      })).body,
    });
    assert.deepEqual(await controller.restore({ matterId: MATTER, currentItem }), []);
    assert.equal(controller.archive.size, 0);
    assert.equal(fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: key }).request_fingerprint.length, 64);
  }
});
