import assert from "node:assert/strict";
import test from "node:test";
import { OUTLOOK_ATTACHMENT_SAVE_PATH } from "../src/outlook-attachment-actions.js";
import { fileOutlookEmailWithAttachments } from "../src/outlook-filing-orchestration.js";
import { OUTLOOK_EMAIL_FILING_PATH } from "../src/outlook-filing.js";

const SOURCE_IDENTITY = Object.freeze({
  canonical_graph_message_id: "immutable:graph-zero-trust",
  rest_message_id: "graph-zero-trust",
  internet_message_id: "<zero-trust@example.invalid>",
  conversation_id: "conversation-zero-trust",
  item_key: [
    "graph-zero-trust",
    "<zero-trust@example.invalid>",
    "conversation-zero-trust",
  ].join("\u001f"),
});

const EMAIL = SOURCE_IDENTITY;

function serverReceipt(id, outcome = "created") {
  return {
    attachment_id: id,
    name: `${id}.pdf`,
    outcome,
    matter_id: "matter-001",
    email_thread_id: "thread-zero-trust",
    document_id: `document-${id}`,
    version_id: outcome === "created" ? `version-${id}` : null,
    sha256: "a".repeat(64),
    receipt_ref: `receipt-${id}`,
    receipt_token: `token-${id}`,
  };
}

function emailResponse({ receipts = [], retry = [] } = {}) {
  return {
    request_id: "request-email-zero-trust",
    outcome: "idempotent_replay",
    filing_operation: "manual",
    idempotent_replay: true,
    external_send_state: "not_applicable",
    source_identity: SOURCE_IDENTITY,
    email_thread: {
      email_thread_id: "thread-zero-trust",
      matter_id: "matter-001",
      ...SOURCE_IDENTITY,
      status: "active",
      filing_user: "actor-001",
      filing_time: "2026-08-08T01:00:00.000Z",
      filed_document_ids: ["document-email-zero-trust"],
    },
    timeline_event: {
      event_id: "timeline-zero-trust",
      matter_id: "matter-001",
      type: "outlook.email.filed",
      source_ref: "thread-zero-trust",
    },
    attachment_state: { receipts, retry_attachment_ids: retry },
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

function attachmentResponse(id) {
  return {
    outcome: "attachments_saved",
    items: [{
      document: { document_id: `document-${id}` },
      version: { version_id: `version-${id}`, sha256: "a".repeat(64) },
    }],
    duplicate_attachments: [],
    attachment_receipt: serverReceipt(id),
  };
}

test("브라우저의 forged complete 영수증은 네트워크 없는 성공이 될 수 없다", async () => {
  const paths = [];
  let reads = 0;
  let emailCalls = 0;
  const forged = {
    status: "complete",
    matter_id: "matter-001",
    item_key: "forged",
    email: { matter_id: "matter-001", email_thread_id: "forged-thread" },
    attachments: { receipts: [], failed: [], skipped: [], request_count: 0 },
    retry_attachment_ids: [],
  };
  const result = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    previousReceipt: forged,
    requestJson: async (path, options) => {
      paths.push(path);
      if (path === OUTLOOK_EMAIL_FILING_PATH) {
        emailCalls += 1;
        assert.deepEqual(
          options.body.attachment_receipts,
          emailCalls === 1 ? [] : [{
            receipt_ref: "receipt-attachment-001",
            receipt_token: "token-attachment-001",
          }],
        );
        return emailCalls === 1
          ? emailResponse({ retry: ["attachment-001"] })
          : emailResponse({ receipts: [serverReceipt("attachment-001")] });
      }
      return attachmentResponse(options.body.selected_attachment_ids[0]);
    },
    readAttachments: async ({ attachmentIds }) => {
      reads += 1;
      assert.deepEqual(attachmentIds, ["attachment-001"]);
      return { attachments: [attachment("attachment-001")], unsupported: [] };
    },
  });
  assert.deepEqual(paths, [
    OUTLOOK_EMAIL_FILING_PATH,
    OUTLOOK_ATTACHMENT_SAVE_PATH,
    OUTLOOK_EMAIL_FILING_PATH,
  ]);
  assert.equal(reads, 1);
  assert.notEqual(result, forged);
  assert.equal(result.status, "complete");
});

test("forged server receipt는 서버 재검증 실패 뒤 첨부를 읽지 않는다", async () => {
  let reads = 0;
  const previousReceipt = {
    status: "partial",
    matter_id: "matter-001",
    item_key: "ignored-browser-key",
    email: { matter_id: "matter-001" },
    attachments: {
      receipts: [{ ...serverReceipt("attachment-001"), receipt_token: "forged" }],
      failed: [{ attachment_id: "attachment-002", retryable: true }],
      skipped: [],
      request_count: 2,
    },
  };
  await assert.rejects(fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    previousReceipt,
    requestJson: async (path, options) => {
      assert.equal(path, OUTLOOK_EMAIL_FILING_PATH);
      assert.deepEqual(options.body.attachment_receipts, [{
        receipt_ref: "receipt-attachment-001",
        receipt_token: "forged",
      }]);
      throw new Error("server rejected forged receipt");
    },
    readAttachments: async () => { reads += 1; },
  }), /forged receipt/u);
  assert.equal(reads, 0);
});

test("서버 readback만 성공 첨부를 확정하고 실패한 ID만 다시 읽는다", async () => {
  const requestedAttachmentIds = [];
  let emailCalls = 0;
  const previousReceipt = {
    status: "partial",
    attachments: {
      receipts: [serverReceipt("attachment-001")],
      failed: [{ attachment_id: "forged-failure", retryable: true }],
      skipped: [],
    },
  };
  const result = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    previousReceipt,
    requestJson: async (path, options) => {
      if (path === OUTLOOK_EMAIL_FILING_PATH) {
        emailCalls += 1;
        return emailCalls === 1
          ? emailResponse({ receipts: [serverReceipt("attachment-001")], retry: ["attachment-002"] })
          : emailResponse({ receipts: [serverReceipt("attachment-001"), serverReceipt("attachment-002")] });
      }
      requestedAttachmentIds.push(options.body.selected_attachment_ids[0]);
      return attachmentResponse("attachment-002");
    },
    readAttachments: async ({ attachmentIds }) => {
      assert.deepEqual(attachmentIds, ["attachment-002"]);
      return { attachments: [attachment("attachment-002")], unsupported: [] };
    },
  });
  assert.deepEqual(requestedAttachmentIds, ["attachment-002"]);
  assert.deepEqual(result.attachments.receipts.map(({ attachment_id }) => attachment_id), [
    "attachment-001",
    "attachment-002",
  ]);
  assert.equal(result.status, "complete");
});
