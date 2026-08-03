import assert from "node:assert/strict";
import test from "node:test";
import {
  MICROSOFT_GRAPH_MAIL_MAX_MIME_BYTES,
  MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES,
  createMicrosoftGraphMailProvider,
} from "../src/microsoft-graph-mail-provider.js";

const REST_ID = "rest-v2-message-synthetic-001";
const IMMUTABLE_ID = "immutable/message+synthetic=001";
const ACCESS_TOKEN = "synthetic-access-token-never-return";
const MIME = Buffer.from([
  "From: Sender <sender@example.invalid>",
  "To: Intake <intake@example.invalid>",
  "Subject: Synthetic inquiry",
  "Message-ID: <synthetic-inquiry@example.invalid>",
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Synthetic inquiry body",
].join("\r\n"));

function mailResult(overrides = {}) {
  return {
    immutable_message_id: IMMUTABLE_ID,
    internet_message_id: "<synthetic-inquiry@example.invalid>",
    message_metadata: {
      id: IMMUTABLE_ID,
      internetMessageId: "<synthetic-inquiry@example.invalid>",
      conversationId: "conversation-synthetic-001",
      subject: "Synthetic inquiry",
      from: {
        emailAddress: {
          name: "Synthetic sender",
          address: "SENDER@example.invalid",
        },
      },
      toRecipients: [{
        emailAddress: {
          name: "Intake",
          address: "INTAKE@example.invalid",
        },
      }],
      ccRecipients: [],
      bccRecipients: [],
      receivedDateTime: "2026-07-30T08:00:00.000Z",
      hasAttachments: false,
    },
    mime_base64: MIME.toString("base64"),
    mime_bytes: MIME.byteLength,
    provider_request_ids: {
      translation: "request-translate-synthetic",
      metadata: "request-metadata-synthetic",
      mime: "request-mime-synthetic",
    },
    ...overrides,
  };
}

function providerFixture({ exportResult = mailResult() } = {}) {
  const calls = [];
  const microsoftEgressTransport = {
    async graphMailMessageExport(input) {
      calls.push({ operation: "graph.mailMessage.export", input });
      return structuredClone(exportResult);
    },
    async graphCalendarEventCreate(input) {
      calls.push({ operation: "graph.calendarEvent.create", input });
      return {
        event_id: "graph-event-client-consultation-t04",
        web_link:
          "https://outlook.office365.com/calendar/item/client-consultation-t04",
        provider_request_id: "graph-request-client-consultation-t04",
      };
    },
  };
  return {
    calls,
    microsoftEgressTransport,
    provider: createMicrosoftGraphMailProvider({
      microsoft_egress_transport: microsoftEgressTransport,
    }),
  };
}

test("CL-P3-W01-T02 Graph provider는 broker의 고정 mail export만 호출해 MIME을 복원한다", async () => {
  const fixture = providerFixture();
  const result = await fixture.provider.getMeMessageMime({
    credential: { access_token: ACCESS_TOKEN },
    rest_message_id: REST_ID,
    mailbox_scope: "me",
    prefer_immutable_id: true,
    source_id_type: "restId",
    target_id_type: "restImmutableEntryId",
  });

  assert.deepEqual(fixture.calls, [{
    operation: "graph.mailMessage.export",
    input: {
      access_token: ACCESS_TOKEN,
      rest_message_id: REST_ID,
    },
  }]);
  assert.equal(Object.hasOwn(fixture.calls[0].input, "url"), false);
  assert.equal(Object.hasOwn(fixture.calls[0].input, "headers"), false);
  assert.equal(result.immutable_message_id, IMMUTABLE_ID);
  assert.equal(
    result.internet_message_id,
    "<synthetic-inquiry@example.invalid>",
  );
  assert.deepEqual(result.message_metadata.sender, {
    display_name: "Synthetic sender",
    address: "sender@example.invalid",
  });
  assert.equal(result.mime_bytes.equals(MIME), true);
  assert.equal(result.provider_request_id, "request-mime-synthetic");
  assert.equal(JSON.stringify({ ...result, mime_bytes: null }).includes(ACCESS_TOKEN), false);
});

test("CL-P3-W01-T02 Graph provider는 공유 mailbox와 3MiB 초과 MIME을 명확히 차단한다", async () => {
  const fixture = providerFixture();
  await assert.rejects(
    fixture.provider.getMeMessageMime({
      credential: { access_token: ACCESS_TOKEN },
      rest_message_id: REST_ID,
      mailbox_scope: "shared",
      prefer_immutable_id: true,
      source_id_type: "restId",
      target_id_type: "restImmutableEntryId",
    }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request
    ),
  );
  assert.equal(fixture.calls.length, 0);

  const oversized = providerFixture({
    exportResult: mailResult({
      mime_bytes: MICROSOFT_GRAPH_MAIL_MAX_MIME_BYTES + 1,
      mime_base64: "TUlNRT0=",
    }),
  });
  await assert.rejects(
    oversized.provider.getMeMessageMime({
      credential: { access_token: ACCESS_TOKEN },
      rest_message_id: REST_ID,
      mailbox_scope: "me",
      prefer_immutable_id: true,
      source_id_type: "restId",
      target_id_type: "restImmutableEntryId",
    }),
    (error) => (
      error.status === 413
      && error.safe_error_code
        === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large
      && error.message.includes("3 MiB")
    ),
  );
});

test("CL-P3-W01-T02 broker의 MIME 상한 오류도 동일한 안전 오류로 변환한다", async () => {
  const transport = {
    async graphMailMessageExport() {
      throw Object.assign(new Error("provider body must stay hidden"), {
        safe_error_code: "MICROSOFT_EGRESS_MIME_TOO_LARGE",
        status: 413,
      });
    },
    async graphCalendarEventCreate() {},
  };
  const provider = createMicrosoftGraphMailProvider({
    microsoft_egress_transport: transport,
  });
  await assert.rejects(
    provider.getMeMessageMime({
      credential: { access_token: ACCESS_TOKEN },
      rest_message_id: REST_ID,
      mailbox_scope: "me",
      prefer_immutable_id: true,
      source_id_type: "restId",
      target_id_type: "restImmutableEntryId",
    }),
    (error) => (
      error.status === 413
      && error.safe_error_code
        === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large
      && !error.message.includes("provider body")
    ),
  );
});

test("CL-P3-W02-T04 Graph provider는 broker에 비공개 UTC 일정 필드만 보낸다", async () => {
  const fixture = providerFixture();
  const result = await fixture.provider.createMeCalendarEvent({
    credential: { access_token: ACCESS_TOKEN },
    mailbox_scope: "me",
    transaction_id: "00000000-0000-5000-8000-000000000004",
    event: {
      subject: "법률 상담",
      start_at: "2026-08-01T01:00:00.000Z",
      end_at: "2026-08-01T02:00:00.000Z",
      time_zone: "UTC",
      sensitivity: "private",
      show_as: "busy",
    },
  });

  assert.deepEqual(fixture.calls, [{
    operation: "graph.calendarEvent.create",
    input: {
      access_token: ACCESS_TOKEN,
      subject: "법률 상담",
      start_at: "2026-08-01T01:00:00.000Z",
      end_at: "2026-08-01T02:00:00.000Z",
      transaction_id: "00000000-0000-5000-8000-000000000004",
    },
  }]);
  assert.equal(Object.hasOwn(fixture.calls[0].input, "url"), false);
  assert.equal(Object.hasOwn(fixture.calls[0].input, "headers"), false);
  assert.equal(result.event_id, "graph-event-client-consultation-t04");
  assert.equal(
    result.web_link,
    "https://outlook.office365.com/calendar/item/client-consultation-t04",
  );
  assert.equal(
    result.provider_request_id,
    "graph-request-client-consultation-t04",
  );
});

test("CL-P3-W02-T04 Graph provider는 공유 mailbox와 상담 원문 필드를 broker 호출 전에 거부한다", async () => {
  const fixture = providerFixture();
  const base = {
    credential: { access_token: ACCESS_TOKEN },
    mailbox_scope: "me",
    transaction_id: "00000000-0000-5000-8000-000000000004",
    event: {
      subject: "법률 상담",
      start_at: "2026-08-01T01:00:00.000Z",
      end_at: "2026-08-01T02:00:00.000Z",
      time_zone: "UTC",
      sensitivity: "private",
      show_as: "busy",
    },
  };
  await assert.rejects(
    fixture.provider.createMeCalendarEvent({ ...base, mailbox_scope: "shared" }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request
    ),
  );
  await assert.rejects(
    fixture.provider.createMeCalendarEvent({
      ...base,
      event: { ...base.event, body: "상담 원문" },
    }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request
    ),
  );
  assert.equal(fixture.calls.length, 0);
});
