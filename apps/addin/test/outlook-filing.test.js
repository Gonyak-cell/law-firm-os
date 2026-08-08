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

function sourceIdentity(overrides = {}) {
  const identity = {
    canonical_graph_message_id: "immutable:graph-message-001",
    rest_message_id: "graph-message-001",
    internet_message_id: "<message-001@example.invalid>",
    conversation_id: "conversation-\u00e9-001",
    ...overrides,
  };
  return {
    ...identity,
    item_key: Object.hasOwn(overrides, "item_key")
      ? overrides.item_key
      : [
          identity.rest_message_id,
          identity.internet_message_id,
          identity.conversation_id,
        ].join("\u001f"),
  };
}

const email = sourceIdentity();

function filingResponse({ mode = "manual", outcome = "created", overrides = {} } = {}) {
  const sent = mode === "sent";
  const identity = sourceIdentity();
  return {
    request_id: `request-${mode}-001`,
    outcome,
    filing_operation: mode,
    idempotent_replay: outcome === "idempotent_replay",
    external_send_state: sent ? "provider_gated_no_external_send_claim" : "not_applicable",
    source_identity: identity,
    email_thread: {
      email_thread_id: `thread-${mode}-001`,
      matter_id: "matter-001",
      ...identity,
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
      /required|malformed|incomplete|mismatched/u,
    );
  }
});

function filingResponseWithIdentity(identity) {
  const response = filingResponse();
  const thread = { ...response.email_thread };
  for (const field of [
    "canonical_graph_message_id",
    "rest_message_id",
    "internet_message_id",
    "conversation_id",
    "item_key",
  ]) delete thread[field];
  return {
    ...response,
    source_identity: identity,
    email_thread: { ...thread, ...identity },
  };
}

async function rejectsSourceIdentity(response, filingEmail = email) {
  await assert.rejects(
    fileOutlookEmail({
      matterId: "matter-001",
      email: filingEmail,
      requestJson: async () => response,
    }),
    /Outlook source identity/u,
  );
}

test("다른 canonical Graph immutable ID 영수증은 현재 항목에 적용되지 않는다", async () => {
  await rejectsSourceIdentity(filingResponseWithIdentity(sourceIdentity({
    canonical_graph_message_id: "immutable:graph-message-other",
  })));
});

test("REST ID가 빠진 영수증은 현재 항목에 적용되지 않는다", async () => {
  const identity = sourceIdentity();
  delete identity.rest_message_id;
  await rejectsSourceIdentity(filingResponseWithIdentity(identity));
});

test("item_key가 빠진 영수증은 현재 항목에 적용되지 않는다", async () => {
  const identity = sourceIdentity();
  delete identity.item_key;
  await rejectsSourceIdentity(filingResponseWithIdentity(identity));
});

test("Internet Message-ID의 대소문자만 다른 영수증도 거부한다", async () => {
  await rejectsSourceIdentity(filingResponseWithIdentity(sourceIdentity({
    internet_message_id: "<MESSAGE-001@example.invalid>",
  })));
});

test("Internet Message-ID의 공백만 다른 영수증도 거부한다", async () => {
  await rejectsSourceIdentity(filingResponseWithIdentity(sourceIdentity({
    internet_message_id: "<message-001 @example.invalid>",
  })));
});

test("conversation ID의 NFKC 표현만 다른 영수증도 거부한다", async () => {
  await rejectsSourceIdentity(filingResponseWithIdentity(sourceIdentity({
    conversation_id: email.conversation_id.normalize("NFD"),
  })));
});

for (const [field, label] of [
  ["canonical_graph_message_id", "canonical Graph ID"],
  ["rest_message_id", "REST ID"],
  ["item_key", "item_key"],
]) {
  test(`현재 Outlook snapshot에 ${label}가 없으면 네트워크 전에 막는다`, async () => {
    const incomplete = { ...email };
    delete incomplete[field];
    let requests = 0;
    await assert.rejects(fileOutlookEmail({
      matterId: "matter-001",
      email: incomplete,
      requestJson: async () => { requests += 1; },
    }), new RegExp(field, "u"));
    assert.equal(requests, 0);
  });
}

test("legacy graph_message_id 별칭은 exact REST ID와 같아도 네트워크 전에 거부한다", async () => {
  let requests = 0;
  await assert.rejects(fileOutlookEmail({
    matterId: "matter-001",
    email: { ...email, graph_message_id: email.rest_message_id },
    requestJson: async () => { requests += 1; },
  }), /unsupported alias/u);
  assert.equal(requests, 0);
});

test("응답 thread의 legacy graph_message_id 별칭도 성공 영수증에 허용하지 않는다", async () => {
  const response = filingResponse();
  response.email_thread.graph_message_id = response.source_identity.canonical_graph_message_id;
  await rejectsSourceIdentity(response);
});

test("source_identity의 추가 immutable ID 별칭도 exact shape 계약에서 거부한다", async () => {
  const response = filingResponse();
  response.source_identity = {
    ...response.source_identity,
    immutable_message_id: response.source_identity.canonical_graph_message_id,
  };
  await rejectsSourceIdentity(response);
});

test("filed_document_ids가 없으면 영수증을 만들지 않는다", async () => {
  const response = filingResponse();
  response.email_thread.filed_document_ids = null;
  await assert.rejects(fileOutlookEmail({
    matterId: "matter-001", email, requestJson: async () => response,
  }), /incomplete or mismatched/u);
});

test("filed_document_ids 원배열에 null이 있으면 필터링하지 않고 거부한다", async () => {
  const response = filingResponse();
  response.email_thread.filed_document_ids = ["document-valid", null];
  await assert.rejects(fileOutlookEmail({
    matterId: "matter-001", email, requestJson: async () => response,
  }), /filed_document_id/u);
});

test("filed_document_ids가 둘이면 완전한 문자열이어도 거부한다", async () => {
  const response = filingResponse();
  response.email_thread.filed_document_ids = ["document-valid", "document-extra"];
  await assert.rejects(fileOutlookEmail({
    matterId: "matter-001", email, requestJson: async () => response,
  }), /incomplete or mismatched/u);
});

test("filed_document_ids의 공백 보정은 허용하지 않는다", async () => {
  const response = filingResponse();
  response.email_thread.filed_document_ids = [" document-valid "];
  await assert.rejects(fileOutlookEmail({
    matterId: "matter-001", email, requestJson: async () => response,
  }), /malformed/u);
});

test("OUTM13 exact item_identity shape은 alias fallback 없이 filing 계약으로 전달된다", () => {
  const itemIdentity = {
    rest_message_id: email.rest_message_id,
    internet_message_id: email.internet_message_id,
    conversation_id: email.conversation_id,
    immutable_item_key: email.item_key,
    canonical_graph_message_id: email.canonical_graph_message_id,
  };
  assert.throws(
    () => createOutlookFilingRequest({ matterId: "matter-001", email: itemIdentity }),
    /item_key/u,
  );
  const requestEmail = {
    rest_message_id: itemIdentity.rest_message_id,
    internet_message_id: itemIdentity.internet_message_id,
    conversation_id: itemIdentity.conversation_id,
    item_key: itemIdentity.immutable_item_key,
    canonical_graph_message_id: itemIdentity.canonical_graph_message_id,
  };
  const request = createOutlookFilingRequest({ matterId: "matter-001", email: requestEmail });
  assert.deepEqual(request.body.email, requestEmail);
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
