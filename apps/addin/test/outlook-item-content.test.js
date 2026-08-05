import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_OUTLOOK_OFFICE_TIMEOUT_MS,
  OUTLOOK_ITEM_CONTENT_ERROR_CODES,
  assertStableOutlookItemIdentity,
  attachmentContentToPayload,
  readOutlookAttachments,
  readOutlookComposeMessage,
  readOutlookItemBody,
  readOutlookItemTimestamps,
  outlookMessageTimestamps,
} from "../src/outlook-item-content.js";

const Office = {
  CoercionType: { Text: "text" },
  MailboxEnums: {
    AttachmentContentFormat: {
      Base64: "base64",
      Eml: "eml",
      ICalendar: "iCalendar",
      Url: "url",
    },
  },
};

test("Office.js 본문 API에서 읽은 실제 텍스트만 bounded body_preview로 전달할 수 있다", async () => {
  const calls = [];
  const body = {
    getAsync(coercionType, callback) {
      calls.push(coercionType);
      callback({ status: "succeeded", value: "실제 메일 본문입니다." });
    },
  };
  assert.equal(await readOutlookItemBody({ item: { body }, Office }), "실제 메일 본문입니다.");
  assert.deepEqual(calls, ["text"]);
});

test("Office.js 콜백이 오지 않으면 제한 시간 뒤 본문 읽기를 종료한다", async () => {
  assert.equal(DEFAULT_OUTLOOK_OFFICE_TIMEOUT_MS, 8_000);
  await assert.rejects(
    readOutlookItemBody({
      item: { body: { getAsync() {} } },
      Office,
      timeoutMs: 5,
    }),
    (error) => (
      error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.body_unavailable
      && error.office_timeout === true
    ),
  );
});

test("메일 Date 헤더와 mailbox 생성 시각을 sent/received 시각으로 구분한다", async () => {
  const expected = outlookMessageTimestamps({
    dateTimeCreated: "2026-08-05T10:40:02.000Z",
    internetHeaders: "From: sender@example.test\r\nDate: Wed, 05 Aug 2026 10:39:40 +0000\r\nSubject: Test",
  });
  assert.deepEqual(expected, {
    sent_at: "2026-08-05T10:39:40.000Z",
    received_at: "2026-08-05T10:40:02.000Z",
  });

  const result = await readOutlookItemTimestamps({
    item: {
      dateTimeCreated: new Date("2026-08-05T10:40:02.000Z"),
      getAllInternetHeadersAsync(callback) {
        callback({ status: "succeeded", value: "Date: Wed, 05 Aug 2026 10:39:40 +0000\r\n" });
      },
    },
  });
  assert.deepEqual(result, expected);
});

test("인터넷 헤더를 읽지 못해도 수정 시각 대신 mailbox 생성 시각만 사용한다", async () => {
  const result = await readOutlookItemTimestamps({
    item: {
      dateTimeCreated: "2026-08-05T10:40:02.000Z",
      dateTimeModified: "2026-08-05T12:00:00.000Z",
      getAllInternetHeadersAsync(callback) {
        callback({ status: "failed", error: { code: 902 } });
      },
    },
  });
  assert.deepEqual(result, {
    sent_at: "2026-08-05T10:40:02.000Z",
    received_at: "2026-08-05T10:40:02.000Z",
  });
});

test("Smart Alerts 작성 화면은 수신자·제목·본문을 compose getAsync 계약으로 읽는다", async () => {
  const asyncValue = (value) => ({
    getAsync(callback) {
      callback({ status: "succeeded", value });
    },
  });
  const message = await readOutlookComposeMessage({
    Office,
    mailbox: {
      userProfile: {
        displayName: "AMIC",
        emailAddress: "sender@amic.kr",
      },
    },
    item: {
      subject: asyncValue("실제 작성 제목"),
      to: asyncValue([{ displayName: "외부", emailAddress: "outside@example.test" }]),
      cc: asyncValue([{ displayName: "내부", emailAddress: "lawyer@amic.kr" }]),
      bcc: asyncValue([]),
      body: {
        getAsync(_coercionType, callback) {
          callback({ status: "succeeded", value: "첨부 확인 부탁드립니다." });
        },
      },
      attachments: [{ id: "att-001", name: "계약서.pdf", contentType: "application/pdf", size: 3 }],
    },
  });
  assert.deepEqual(message.from, { name: "AMIC", email: "sender@amic.kr" });
  assert.deepEqual(message.to, [{ name: "외부", email: "outside@example.test" }]);
  assert.deepEqual(message.cc, [{ name: "내부", email: "lawyer@amic.kr" }]);
  assert.equal(message.subject, "실제 작성 제목");
  assert.equal(message.body_preview, "첨부 확인 부탁드립니다.");
  assert.deepEqual(message.attachments, [{
    attachment_id: "att-001",
    name: "계약서.pdf",
    content_type: "application/pdf",
    size: 3,
    confidentiality: "internal",
  }]);
});

test("Base64 첨부는 원문 바이트를 유지하고 EML/iCalendar는 텍스트 바이트로 변환한다", () => {
  const base64 = attachmentContentToPayload({
    Office,
    attachment: { id: "att-pdf", name: "계약서.pdf", contentType: "application/pdf", size: 3 },
    content: { format: "base64", content: "YWJj" },
  });
  assert.equal(base64.content_base64, "YWJj");
  assert.equal(base64.content_text, undefined);

  const eml = attachmentContentToPayload({
    Office,
    attachment: { id: "att-eml", name: "원문.eml" },
    content: { format: Office.MailboxEnums.AttachmentContentFormat.Eml, content: "From: sender@example.test\r\n\r\n본문" },
  });
  assert.equal(eml.content_text, "From: sender@example.test\r\n\r\n본문");
  assert.equal(eml.content_type, "message/rfc822");

  const calendar = attachmentContentToPayload({
    Office,
    attachment: { id: "att-ics", name: "일정.ics" },
    content: { format: "iCalendar", content: "BEGIN:VCALENDAR\nEND:VCALENDAR" },
  });
  assert.equal(calendar.content_text, "BEGIN:VCALENDAR\nEND:VCALENDAR");
  assert.equal(calendar.content_type, "text/calendar");
});

test("URL/클라우드 첨부는 URL을 바이트로 취급하지 않고 건너뛴다", async () => {
  const result = await readOutlookAttachments({
    Office,
    item: {
      getAttachmentContentAsync(id, callback) {
        assert.equal(id, "att-link");
        callback({ status: "succeeded", value: { format: "url", content: "https://share.example.test/file" } });
      },
    },
    attachments: [{ id: "att-link", name: "공유 링크" }],
  });
  assert.deepEqual(result.attachments, []);
  assert.equal(result.unsupported.length, 1);
  assert.match(result.unsupported[0].message, /링크\/클라우드 첨부/);

  const cloud = await readOutlookAttachments({
    Office: {
      ...Office,
      MailboxEnums: {
        ...Office.MailboxEnums,
        AttachmentType: { Cloud: "cloud" },
      },
    },
    item: {
      getAttachmentContentAsync() {
        throw new Error("cloud bytes must not be requested");
      },
    },
    attachments: [{ id: "cloud-attachment", attachmentType: "cloud", name: "OneDrive 링크" }],
  });
  assert.equal(cloud.attachments.length, 0);
  assert.equal(cloud.unsupported.length, 1);
});

test("읽지 못한 첨부 하나가 다른 정상 첨부 저장을 막지 않는다", async () => {
  const result = await readOutlookAttachments({
    Office,
    item: {
      getAttachmentContentAsync(id, callback) {
        if (id === "att-fail") {
          callback({ status: "failed", error: { code: 901 } });
          return;
        }
        callback({ status: "succeeded", value: { format: "base64", content: "YWJj" } });
      },
    },
    attachments: [
      { id: "att-fail", name: "읽기실패.pdf" },
      { id: "att-ok", name: "정상.pdf" },
    ],
  });
  assert.equal(result.attachments.length, 1);
  assert.equal(result.attachments[0].attachment_id, "att-ok");
  assert.equal(result.unsupported.length, 1);
  assert.equal(result.unsupported[0].safe_error_code, OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_content_unavailable);

  assert.throws(
    () => attachmentContentToPayload({
      Office,
      attachment: { id: "att-bad", name: "문서.pdf" },
      content: { format: "base64", content: "not base64" },
    }),
    (error) => error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_invalid_base64,
  );
});

test("2MiB를 초과하는 첨부는 API 호출 전에 거부한다", () => {
  const tooLargeBase64 = "A".repeat(Math.ceil((2 * 1024 * 1024 + 1) / 3) * 4);
  assert.throws(
    () => attachmentContentToPayload({
      Office,
      attachment: { id: "att-large", name: "대용량.bin" },
      content: { format: "base64", content: tooLargeBase64 },
    }),
    (error) => (
      error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_too_large
      && /2MiB/.test(error.user_message)
    ),
  );
});

test("안정적인 Outlook 메일 식별자가 없으면 파일 보관 경로를 닫는다", () => {
  const valid = {
    graph_message_id: "rest-message-id",
    internet_message_id: "<message@example.test>",
    conversation_id: "conversation-id",
  };
  assert.equal(assertStableOutlookItemIdentity(valid), valid);
  assert.throws(
    () => assertStableOutlookItemIdentity({ ...valid, conversation_id: null }),
    (error) => error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.item_identity_required,
  );
});
