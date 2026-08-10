import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import { OUTLOOK_ATTACHMENT_SAVE_PATH } from "../src/outlook-attachment-actions.js";
import { fileOutlookEmailWithAttachments } from "../src/outlook-filing-orchestration.js";
import { OUTLOOK_EMAIL_FILING_PATH } from "../src/outlook-filing.js";
import { createOutlookOperationReceiptController } from "../src/outlook-operation-receipt-controller.js";
import { createOutlookOperationReceiptArchive } from "../src/outlook-operation-receipts.js";
import { createOutlookOperationSnapshot } from "../src/outlook-item-events.js";

const MATTER_ID = "matter-main-filing-wiring";
const THREAD_ID = "thread-main-filing-wiring";
const SOURCE_IDENTITY = Object.freeze({
  canonical_graph_message_id: "immutable:main-filing-wiring",
  rest_message_id: "rest-main-filing-wiring",
  internet_message_id: "<main-filing-wiring@example.invalid>",
  conversation_id: "conversation-main-filing-wiring",
  item_key: [
    "rest-main-filing-wiring",
    "<main-filing-wiring@example.invalid>",
    "conversation-main-filing-wiring",
  ].join("\u001f"),
});
const CURRENT_ITEM = Object.freeze({
  ...SOURCE_IDENTITY,
  mode: "read",
  provenance: "received",
});

function filedEmailResponse() {
  return {
    request_id: "request-main-filing-wiring-email",
    outcome: "created",
    filing_operation: "manual",
    idempotent_replay: false,
    external_send_state: "not_applicable",
    source_identity: SOURCE_IDENTITY,
    email_thread: {
      email_thread_id: THREAD_ID,
      matter_id: MATTER_ID,
      ...SOURCE_IDENTITY,
      status: "active",
      filing_user: "actor-main-filing-wiring",
      filing_time: "2026-08-09T00:00:00.000Z",
      filed_document_ids: ["document-main-filing-wiring-email"],
    },
    timeline_event: {
      event_id: "timeline-main-filing-wiring-email",
      matter_id: MATTER_ID,
      type: "outlook.email.filed",
      source_ref: THREAD_ID,
    },
    attachment_state: {
      receipts: [],
      retry_attachment_ids: ["attachment-main-a", "attachment-main-b"],
    },
  };
}

function attachment(id) {
  return {
    attachment_id: id,
    name: `${id}.pdf`,
    content_type: "application/pdf",
    content_base64: "YWJj",
  };
}

test("actual main.jsx callback and filing orchestration archive no malformed attachment receipt and send no next write", async (t) => {
  const addinRoot = fileURLToPath(new URL("../", import.meta.url));
  const vite = await createServer({
    root: addinRoot,
    configFile: `${addinRoot}/vite.config.js`,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => vite.close());
  const { createOutlookFilingReceiptCallback } = await vite.ssrLoadModule("/src/main.jsx");
  assert.equal(typeof createOutlookFilingReceiptCallback, "function");

  const archive = createOutlookOperationReceiptArchive({ scopeRef: "main-filing-wiring" });
  const controller = createOutlookOperationReceiptController({
    archive,
    requestJson: async () => ({ items: [] }),
  });
  const operationStartKey = "operation-main-filing-wiring";
  const operationSnapshot = createOutlookOperationSnapshot({
    item: CURRENT_ITEM,
    mode: CURRENT_ITEM.mode,
    provenance: CURRENT_ITEM.provenance,
    matterId: MATTER_ID,
    operationStartKey,
  });
  let attachmentCallbacks = 0;
  const onReceipt = createOutlookFilingReceiptCallback({
    operationSnapshot,
    reconcileOperationReceipt(snapshot, receipt, operation) {
      if (operation === "save_attachments") attachmentCallbacks += 1;
      return controller.recordCompletion({
        operationSnapshot: snapshot,
        receipt,
        operation,
        currentItem: CURRENT_ITEM,
        currentMatterId: MATTER_ID,
        currentOperationStartKey: operationStartKey,
      }).result;
    },
  });
  const paths = [];
  await assert.rejects(fileOutlookEmailWithAttachments({
    matterId: MATTER_ID,
    email: SOURCE_IDENTITY,
    onReceipt,
    requestJson: async (path, options) => {
      paths.push({ path, attachment_id: options.body.selected_attachment_ids?.[0] ?? null });
      if (path === OUTLOOK_EMAIL_FILING_PATH) return filedEmailResponse();
      return {
        request_id: "request-main-filing-wiring-malformed",
        outcome: "attachments_saved",
        items: [],
        duplicate_attachments: [],
        duplicate_count: 0,
        attachment_receipt: { attachment_id: options.body.selected_attachment_ids[0] },
      };
    },
    readAttachments: async ({ attachmentIds }) => ({
      attachments: attachmentIds.map(attachment),
      unsupported: [],
    }),
  }), /no authoritative receipt/u);

  assert.deepEqual(paths, [
    { path: OUTLOOK_EMAIL_FILING_PATH, attachment_id: null },
    { path: OUTLOOK_ATTACHMENT_SAVE_PATH, attachment_id: "attachment-main-a" },
  ]);
  assert.equal(attachmentCallbacks, 0);
  assert.equal(archive.size, 1);
  assert.deepEqual(
    controller.sync({ currentItem: CURRENT_ITEM, matterId: MATTER_ID }).map((entry) => entry.operation),
    ["file_email"],
  );
});
