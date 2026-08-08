import assert from "node:assert/strict";
import test from "node:test";
import { OUTLOOK_ATTACHMENT_SAVE_PATH } from "../src/outlook-attachment-actions.js";
import { fileOutlookEmailWithAttachments } from "../src/outlook-filing-orchestration.js";
import { OUTLOOK_EMAIL_FILING_PATH } from "../src/outlook-filing.js";

const EMAIL = Object.freeze({
  graph_message_id: "graph-message-001",
  internet_message_id: "<message-001@example.invalid>",
  conversation_id: "conversation-001",
});

function attachment(id) {
  return {
    attachment_id: id,
    name: `${id}.pdf`,
    content_type: "application/pdf",
    content_base64: "YWJj",
  };
}

function receipt(id, outcome = "created") {
  return {
    attachment_id: id,
    name: `${id}.pdf`,
    outcome,
    matter_id: "matter-001",
    email_thread_id: "thread-001",
    document_id: `document-${id}`,
    version_id: `version-${id}`,
    sha256: "a".repeat(64),
    receipt_ref: `receipt-${id}`,
    receipt_token: `token-${id}`,
  };
}

function emailResponse({ saved, ids, emailCalls }) {
  return {
    request_id: `request-email-${emailCalls}`,
    outcome: emailCalls === 1 ? "created" : "idempotent_replay",
    filing_operation: "manual",
    idempotent_replay: emailCalls !== 1,
    external_send_state: "not_applicable",
    email_thread: {
      email_thread_id: "thread-001",
      matter_id: "matter-001",
      graph_message_id: "immutable:graph-message-001",
      internet_message_id: EMAIL.internet_message_id,
      conversation_id: EMAIL.conversation_id,
      status: "active",
      filing_user: "user-001",
      filing_time: "2026-08-08T01:00:00.000Z",
      filed_document_ids: ["document-email-001"],
    },
    timeline_event: {
      event_id: "timeline-email-001",
      matter_id: "matter-001",
      type: "outlook.email.filed",
      source_ref: "thread-001",
    },
    attachment_state: {
      receipts: ids.filter((id) => saved.has(id)).map((id) => saved.get(id)),
      retry_attachment_ids: ids.filter((id) => !saved.has(id)),
    },
  };
}

function filingServer(ids, { fail = new Set(), duplicate = new Set() } = {}) {
  const saved = new Map();
  const calls = [];
  let emailCalls = 0;
  return {
    calls,
    saved,
    allow(id) { fail.delete(id); },
    async requestJson(path, options) {
      calls.push({ path, id: options.body.selected_attachment_ids?.[0] ?? null });
      if (path === OUTLOOK_EMAIL_FILING_PATH) {
        emailCalls += 1;
        return emailResponse({ saved, ids, emailCalls });
      }
      const id = options.body.selected_attachment_ids[0];
      if (fail.has(id)) throw new Error("temporary attachment failure");
      const next = receipt(id, duplicate.has(id) ? "duplicate" : "created");
      saved.set(id, next);
      return {
        outcome: "attachments_saved",
        items: next.outcome === "created" ? [{
          document: { document_id: next.document_id },
          version: { version_id: next.version_id, sha256: next.sha256 },
        }] : [],
        duplicate_attachments: next.outcome === "duplicate" ? [{
          attachment_id: id,
          duplicate_document_id: next.document_id,
          sha256: next.sha256,
        }] : [],
        attachment_receipt: next,
      };
    },
  };
}

test("메일 먼저, 첨부당 한 요청, 서버 readback 순서로 완료한다", async () => {
  const run = filingServer(["attachment-001", "attachment-002"], {
    duplicate: new Set(["attachment-002"]),
  });
  const result = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson: run.requestJson,
    readAttachments: async ({ attachmentIds }) => ({
      attachments: attachmentIds.map(attachment),
      unsupported: [],
    }),
  });

  assert.deepEqual(run.calls.map(({ path }) => path), [
    OUTLOOK_EMAIL_FILING_PATH,
    OUTLOOK_ATTACHMENT_SAVE_PATH,
    OUTLOOK_ATTACHMENT_SAVE_PATH,
    OUTLOOK_EMAIL_FILING_PATH,
  ]);
  assert.deepEqual(run.calls.filter(({ path }) => path === OUTLOOK_ATTACHMENT_SAVE_PATH)
    .map(({ id }) => id), ["attachment-001", "attachment-002"]);
  assert.equal(result.status, "complete");
  assert.equal(result.attachments.created_count, 1);
  assert.equal(result.attachments.duplicate_count, 1);
});

test("부분 영수증 뒤에는 서버가 지정한 실패 첨부만 읽고 재시도한다", async () => {
  const ids = ["attachment-001", "attachment-002", "attachment-003"];
  const run = filingServer(ids, { fail: new Set(["attachment-002"]) });
  const selections = [];
  const execute = (previousReceipt = null) => fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson: run.requestJson,
    previousReceipt,
    errorMessage: () => "retryable",
    readAttachments: async ({ attachmentIds }) => {
      selections.push(attachmentIds);
      return { attachments: attachmentIds.map(attachment), unsupported: [] };
    },
  });
  const first = await execute();
  run.allow("attachment-002");
  const retried = await execute(first);

  assert.equal(first.status, "partial");
  assert.deepEqual(first.retry_attachment_ids, ["attachment-002"]);
  assert.deepEqual(selections, [ids, ["attachment-002"]]);
  assert.deepEqual(run.calls.filter(({ path }) => path === OUTLOOK_ATTACHMENT_SAVE_PATH)
    .map(({ id }) => id), [...ids, "attachment-002"]);
  assert.equal(retried.status, "complete");
});

test("완료 browser 영수증도 서버 replay 없이는 성공하지 않는다", async () => {
  const run = filingServer([]);
  const previousReceipt = { attachments: { receipts: [] }, status: "complete" };
  let reads = 0;
  const result = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    previousReceipt,
    requestJson: run.requestJson,
    readAttachments: async () => { reads += 1; },
  });
  assert.deepEqual(run.calls.map(({ path }) => path), [OUTLOOK_EMAIL_FILING_PATH]);
  assert.equal(reads, 0);
  assert.equal(result.status, "complete");
});
