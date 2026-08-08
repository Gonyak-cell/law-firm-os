import assert from "node:assert/strict";
import test from "node:test";
import {
  fileOutlookEmailWithAttachments,
} from "../src/outlook-filing-orchestration.js";
import {
  OUTLOOK_ATTACHMENT_SAVE_PATH,
} from "../src/outlook-attachment-actions.js";
import {
  OUTLOOK_EMAIL_FILING_PATH,
} from "../src/outlook-filing.js";

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

function emailResponse(outcome = "created") {
  return {
    request_id: "request-email-001",
    outcome,
    idempotent_replay: outcome === "idempotent_replay",
    email_thread: {
      email_thread_id: "thread-001",
      matter_id: "matter-001",
      status: "active",
      filing_user: "user-001",
      filing_time: "2026-08-08T01:00:00.000Z",
      filed_document_ids: ["document-email-001"],
    },
    timeline_event: { event_id: "timeline-email-001" },
  };
}

test("메일을 먼저 보관한 뒤 첨부마다 한 요청을 보내고 하나의 완료 영수증을 만든다", async () => {
  // Given
  const calls = [];
  const requestJson = async (path, options) => {
    calls.push({ kind: "request", path, options });
    if (path === OUTLOOK_EMAIL_FILING_PATH) return emailResponse();
    const attachmentId = options.body.selected_attachment_ids[0];
    if (attachmentId === "attachment-002") {
      return {
        outcome: "attachments_saved",
        items: [],
        duplicate_count: 1,
        duplicate_attachments: [{
          attachment_id: attachmentId,
          duplicate_document_id: "document-attachment-002",
          sha256: "b".repeat(64),
        }],
      };
    }
    return {
      outcome: "attachments_saved",
      items: [{
        document: { document_id: "document-attachment-001" },
        version: { version_id: "version-attachment-001", sha256: "a".repeat(64) },
      }],
      duplicate_count: 0,
      duplicate_attachments: [],
    };
  };

  // When
  const receipt = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson,
    readAttachments: async ({ attachmentIds }) => {
      calls.push({ kind: "read", attachmentIds });
      return {
        attachments: [attachment("attachment-001"), attachment("attachment-002")],
        unsupported: [],
      };
    },
  });

  // Then
  assert.deepEqual(calls.map((call) => call.kind === "read" ? "read" : call.path), [
    OUTLOOK_EMAIL_FILING_PATH,
    "read",
    OUTLOOK_ATTACHMENT_SAVE_PATH,
    OUTLOOK_ATTACHMENT_SAVE_PATH,
  ]);
  assert.deepEqual(
    calls.filter((call) => call.path === OUTLOOK_ATTACHMENT_SAVE_PATH)
      .map((call) => call.options.body.attachments.length),
    [1, 1],
  );
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.email.document_ids[0], "document-email-001");
  assert.equal(receipt.attachments.created_count, 1);
  assert.equal(receipt.attachments.duplicate_count, 1);
  assert.equal(receipt.attachments.failed_count, 0);
  assert.deepEqual(receipt.retry_attachment_ids, []);
  assert.equal(receipt.item_key.includes("graph-message-001"), true);
});

test("메일 보관이 실패하면 첨부 바이트를 읽거나 첨부 API를 호출하지 않는다", async () => {
  // Given
  let attachmentReadCount = 0;
  const paths = [];

  // When
  const error = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson: async (path) => {
      paths.push(path);
      throw new Error("email filing failed");
    },
    readAttachments: async () => {
      attachmentReadCount += 1;
      return { attachments: [attachment("attachment-001")], unsupported: [] };
    },
  }).catch((nextError) => nextError);

  // Then
  assert.equal(error.message, "email filing failed");
  assert.deepEqual(paths, [OUTLOOK_EMAIL_FILING_PATH]);
  assert.equal(attachmentReadCount, 0);
});

test("부분 실패 영수증은 성공을 보존하고 재시도 때 실패한 첨부만 다시 읽고 보낸다", async () => {
  // Given
  const paths = [];
  let failSecond = true;
  const requestJson = async (path, options) => {
    paths.push({ path, id: options.body.selected_attachment_ids?.[0] ?? null });
    if (path === OUTLOOK_EMAIL_FILING_PATH) return emailResponse();
    const id = options.body.selected_attachment_ids[0];
    if (id === "attachment-002" && failSecond) throw new Error("temporary network failure");
    return {
      outcome: "attachments_saved",
      items: [{
        document: { document_id: `document-${id}` },
        version: { version_id: `version-${id}`, sha256: "c".repeat(64) },
      }],
      duplicate_count: 0,
      duplicate_attachments: [],
    };
  };
  const allAttachments = [
    attachment("attachment-001"),
    attachment("attachment-002"),
    attachment("attachment-003"),
  ];
  const first = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson,
    errorMessage: () => "다시 시도할 수 있습니다.",
    readAttachments: async () => ({ attachments: allAttachments, unsupported: [] }),
  });
  failSecond = false;
  let retrySelection = null;

  // When
  const retried = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson,
    previousReceipt: first,
    readAttachments: async ({ attachmentIds }) => {
      retrySelection = attachmentIds;
      // The helper must still filter a careless reader that returns every item.
      return { attachments: allAttachments, unsupported: [] };
    },
  });

  // Then
  assert.equal(first.status, "partial");
  assert.equal(first.attachments.created_count, 2);
  assert.equal(first.attachments.failed_count, 1);
  assert.deepEqual(first.retry_attachment_ids, ["attachment-002"]);
  assert.deepEqual(retrySelection, ["attachment-002"]);
  assert.equal(paths.filter((call) => call.path === OUTLOOK_EMAIL_FILING_PATH).length, 1);
  assert.deepEqual(paths.slice(-1), [{ path: OUTLOOK_ATTACHMENT_SAVE_PATH, id: "attachment-002" }]);
  assert.equal(retried.status, "complete");
  assert.equal(retried.attachments.created_count, 3);
  assert.equal(retried.attachments.failed_count, 0);
  assert.deepEqual(retried.retry_attachment_ids, []);
});

test("지원하지 않는 대용량 첨부는 부분 영수증에 남지만 재시도 집합에는 들어가지 않는다", async () => {
  // Given
  let attachmentRequestCount = 0;

  // When
  const receipt = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson: async (path) => {
      if (path === OUTLOOK_EMAIL_FILING_PATH) return emailResponse();
      attachmentRequestCount += 1;
      return {};
    },
    readAttachments: async () => ({
      attachments: [],
      unsupported: [{
        attachment_id: "attachment-oversize",
        name: "oversize.bin",
        safe_error_code: "OUTLOOK_ATTACHMENT_TOO_LARGE",
        message: "2MiB를 초과해 저장할 수 없습니다.",
      }],
    }),
  });

  // Then
  assert.equal(receipt.status, "partial");
  assert.equal(receipt.attachments.failed_count, 1);
  assert.equal(receipt.attachments.skipped_count, 1);
  assert.deepEqual(receipt.retry_attachment_ids, []);
  assert.equal(attachmentRequestCount, 0);
});

test("모든 첨부 요청이 실패해도 이미 저장된 메일 영수증을 부분 성공으로 보존한다", async () => {
  // Given
  let emailRequestCount = 0;

  // When
  const receipt = await fileOutlookEmailWithAttachments({
    matterId: "matter-001",
    email: EMAIL,
    requestJson: async (path) => {
      if (path === OUTLOOK_EMAIL_FILING_PATH) {
        emailRequestCount += 1;
        return emailResponse();
      }
      throw new Error("temporary attachment failure");
    },
    errorMessage: () => "다시 시도할 수 있습니다.",
    readAttachments: async () => ({
      attachments: [attachment("attachment-001"), attachment("attachment-002")],
      unsupported: [],
    }),
  });

  // Then
  assert.equal(emailRequestCount, 1);
  assert.equal(receipt.email.document_ids[0], "document-email-001");
  assert.equal(receipt.status, "partial");
  assert.equal(receipt.attachments.created_count, 0);
  assert.equal(receipt.attachments.failed_count, 2);
  assert.deepEqual(receipt.retry_attachment_ids, ["attachment-001", "attachment-002"]);
});
