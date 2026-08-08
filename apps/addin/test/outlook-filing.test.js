import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_EMAIL_FILING_PATH,
  OUTLOOK_SENT_FILING_PATH,
  createOutlookFilingRequest,
  fileOutlookEmail,
} from "../src/outlook-filing.js";
import {
  handleOutlookMessageSend,
  OUTLOOK_SMART_ALERTS_PATH,
} from "../src/outlook-send-events.js";

const email = {
  graph_message_id: "graph-message-001",
  internet_message_id: "<message-001@example.invalid>",
  conversation_id: "conversation-001",
};

function filingResponse({ mode = "manual", outcome = "created", overrides = {} } = {}) {
  const sent = mode === "sent";
  return {
    request_id: `request-${mode}-001`,
    outcome,
    filing_operation: mode,
    idempotent_replay: outcome === "idempotent_replay",
    external_send_state: sent ? "provider_gated_no_external_send_claim" : "not_applicable",
    email_thread: {
      email_thread_id: `thread-${mode}-001`,
      matter_id: "matter-001",
      status: "active",
      filing_user: "actor-001",
      filing_time: "2026-08-08T01:00:00.000Z",
      filed_document_ids: [`document-${mode}-001`],
    },
    timeline_event: {
      event_id: `timeline-${mode}-001`,
      type: sent ? "outlook.email.sent_filed" : "outlook.email.filed",
      matter_id: "matter-001",
      source_ref: `thread-${mode}-001`,
    },
    attachment_state: { receipts: [], retry_attachment_ids: [] },
    ...overrides,
  };
}

test("일반 Matter 보관과 명시적 보낸 메일 보관은 서로 다른 API 경로를 사용한다", () => {
  const ordinary = createOutlookFilingRequest({ matterId: "matter-001", email });
  const sent = createOutlookFilingRequest({
    matterId: "matter-001",
    email,
    mode: "sent",
  });

  assert.equal(ordinary.path, OUTLOOK_EMAIL_FILING_PATH);
  assert.equal(sent.path, OUTLOOK_SENT_FILING_PATH);
});

test("OnMessageSend는 발송 전 경고만 평가하고 메일 보관 API를 호출하지 않는다", async () => {
  const paths = [];
  let completion = null;
  await handleOutlookMessageSend({
    event: { completed: (value) => { completion = value; } },
    readMessage: async () => email,
    requestJson: async (path) => {
      paths.push(path);
      return { item: { warnings: [], warning_count: 0, send_blocked: false } };
    },
  });

  assert.deepEqual(paths, [OUTLOOK_SMART_ALERTS_PATH]);
  assert.equal(paths.includes(OUTLOOK_EMAIL_FILING_PATH), false);
  assert.equal(paths.includes(OUTLOOK_SENT_FILING_PATH), false);
  assert.deepEqual(completion, { allowEvent: true });
});

test("명시적 받은 메일 보관은 불변 문서 상세과 현재 item key를 보존한다", async () => {
  // Given
  const calls = [];

  // When
  const receipt = await fileOutlookEmail({
    matterId: "matter-001",
    email,
    requestJson: async (path, options) => {
      calls.push({ path, options });
      return filingResponse({
        overrides: {
          email_thread: {
            ...filingResponse().email_thread,
            filed_document_ids: ["document-original-mime-001"],
          },
        },
      });
    },
  });

  // Then
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, OUTLOOK_EMAIL_FILING_PATH);
  assert.deepEqual(calls[0].options.body, { matter_id: "matter-001", email });
  assert.deepEqual(receipt.document_ids, ["document-original-mime-001"]);
  assert.equal(receipt.matter_id, "matter-001");
  assert.equal(receipt.item_key.includes("graph-message-001"), true);
  assert.equal(receipt.duplicate, false);
});

test("서버 idempotent replay는 받은 메일을 다시 만들지 않은 중복 영수증으로 정규화한다", async () => {
  // Given
  const response = filingResponse({
    outcome: "idempotent_replay",
    overrides: {
      email_thread: {
        ...filingResponse().email_thread,
        filing_user: "original-actor",
        filed_document_ids: ["document-original-mime-001"],
      },
    },
  });

  // When
  const receipt = await fileOutlookEmail({
    matterId: "matter-001",
    email,
    requestJson: async () => response,
  });

  // Then
  assert.equal(receipt.outcome, "idempotent_replay");
  assert.equal(receipt.duplicate, true);
  assert.equal(receipt.filing_actor_id, "original-actor");
  assert.equal(receipt.filed_at, "2026-08-08T01:00:00.000Z");
});

test("보낸 메일은 사용자 명시 동작에서만 sent endpoint를 사용한다", async () => {
  // Given
  const paths = [];

  // When
  const receipt = await fileOutlookEmail({
    matterId: "matter-001",
    email,
    mode: "sent",
    requestJson: async (path) => {
      paths.push(path);
      return filingResponse({ mode: "sent" });
    },
  });

  // Then
  assert.deepEqual(paths, [OUTLOOK_SENT_FILING_PATH]);
  assert.equal(receipt.mode, "sent");
  assert.equal(receipt.timeline_event_type, "outlook.email.sent_filed");
});

test("불완전하거나 작업 종류가 다른 서버 영수증은 성공으로 적용하지 않는다", async () => {
  const attachmentReceipt = {
    attachment_id: "attachment-001",
    name: "contract.pdf",
    outcome: "created",
    matter_id: "matter-001",
    email_thread_id: "thread-manual-001",
    document_id: "document-attachment-001",
    version_id: "version-attachment-001",
    sha256: "a".repeat(64),
    receipt_ref: "receipt-attachment-001",
    receipt_token: "token-attachment-001",
  };
  for (const response of [
    filingResponse({ overrides: { request_id: null } }),
    filingResponse({ overrides: { timeline_event: null } }),
    filingResponse({ overrides: { timeline_event: { ...filingResponse().timeline_event, matter_id: "matter-other" } } }),
    filingResponse({ overrides: { timeline_event: { ...filingResponse().timeline_event, source_ref: "thread-other" } } }),
    filingResponse({ overrides: { email_thread: { ...filingResponse().email_thread, filing_user: null } } }),
    filingResponse({ mode: "sent", overrides: { filing_operation: "manual" } }),
    filingResponse({ mode: "sent", overrides: { timeline_event: { event_id: "timeline", type: "outlook.email.filed" } } }),
    filingResponse({ overrides: { attachment_state: { receipts: [{}], retry_attachment_ids: [] } } }),
    filingResponse({ overrides: { attachment_state: { receipts: [{ ...attachmentReceipt, matter_id: "matter-other" }], retry_attachment_ids: [] } } }),
    filingResponse({ overrides: { attachment_state: { receipts: [{ ...attachmentReceipt, email_thread_id: "thread-other" }], retry_attachment_ids: [] } } }),
  ]) {
    await assert.rejects(
      fileOutlookEmail({
        matterId: "matter-001",
        email,
        mode: response.external_send_state === "provider_gated_no_external_send_claim" ? "sent" : "manual",
        requestJson: async () => response,
      }),
      /required|incomplete|mismatched/u,
    );
  }
});

test("이전 첨부 영수증은 서버 재검증을 위해 받은 메일 요청에만 전달한다", async () => {
  let request;
  await fileOutlookEmail({
    matterId: "matter-001",
    email,
    priorAttachmentReceipts: [{ receipt_ref: "receipt-001", receipt_token: "token-001" }],
    requestJson: async (_path, options) => {
      request = options.body;
      return filingResponse();
    },
  });
  assert.deepEqual(request.attachment_receipts, [
    { receipt_ref: "receipt-001", receipt_token: "token-001" },
  ]);
});
