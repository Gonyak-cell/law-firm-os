import assert from "node:assert/strict";
import test from "node:test";
import {
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

function jsonResponse(value, requestId) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "request-id": requestId,
    },
  });
}

function providerFixture() {
  const calls = [];
  const provider = createMicrosoftGraphMailProvider({
    graph_base_url: "https://graph.example.invalid/v1.0",
    fetch_impl: async (url, options) => {
      const parsed = new URL(url);
      const authorization = new Headers(options.headers)
        .get("authorization");
      assert.equal(authorization, `Bearer ${ACCESS_TOKEN}`);
      calls.push({
        pathname: parsed.pathname,
        search: parsed.search,
        method: options.method,
        prefer: new Headers(options.headers).get("prefer"),
      });
      if (parsed.pathname.endsWith("/me/translateExchangeIds")) {
        assert.deepEqual(JSON.parse(options.body), {
          inputIds: [REST_ID],
          sourceIdType: "restId",
          targetIdType: "restImmutableEntryId",
        });
        return jsonResponse({
          value: [{
            sourceId: REST_ID,
            targetId: IMMUTABLE_ID,
          }],
        }, "request-translate-synthetic");
      }
      if (parsed.pathname.endsWith("/$value")) {
        return new Response(MIME, {
          status: 200,
          headers: {
            "content-type": "message/rfc822",
            "content-length": String(MIME.byteLength),
            "request-id": "request-mime-synthetic",
          },
        });
      }
      return jsonResponse({
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
      }, "request-metadata-synthetic");
    },
  });
  return { calls, provider };
}

test("CL-P3-W01-T02 Graph provider는 REST ID를 immutable ID로 바꾼 뒤 /me metadata와 $value MIME만 조회한다", async () => {
  const fixture = providerFixture();
  const result = await fixture.provider.getMeMessageMime({
    credential: { access_token: ACCESS_TOKEN },
    rest_message_id: REST_ID,
    mailbox_scope: "me",
    prefer_immutable_id: true,
    source_id_type: "restId",
    target_id_type: "restImmutableEntryId",
  });
  assert.deepEqual(
    fixture.calls.map((call) => call.pathname),
    [
      "/v1.0/me/translateExchangeIds",
      `/v1.0/me/messages/${encodeURIComponent(IMMUTABLE_ID)}`,
      `/v1.0/me/messages/${encodeURIComponent(IMMUTABLE_ID)}/$value`,
    ],
  );
  assert.equal(fixture.calls[1].prefer, 'IdType="ImmutableId"');
  assert.equal(fixture.calls[2].prefer, 'IdType="ImmutableId"');
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
  assert.equal(
    JSON.stringify({
      ...result,
      mime_bytes: null,
    }).includes(ACCESS_TOKEN),
    false,
  );
});

test("CL-P3-W01-T02 Graph provider는 /users mailbox, 잘못된 변환 응답, 과대 MIME를 fail-closed로 차단한다", async () => {
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

  const invalidTranslation = createMicrosoftGraphMailProvider({
    fetch_impl: async () => jsonResponse({
      value: [{
        sourceId: "another-message",
        targetId: IMMUTABLE_ID,
      }],
    }, "request-invalid-translation"),
  });
  await assert.rejects(
    invalidTranslation.getMeMessageMime({
      credential: { access_token: ACCESS_TOKEN },
      rest_message_id: REST_ID,
      mailbox_scope: "me",
      prefer_immutable_id: true,
      source_id_type: "restId",
      target_id_type: "restImmutableEntryId",
    }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES
        .provider_response_invalid
    ),
  );

  let call = 0;
  const oversized = createMicrosoftGraphMailProvider({
    max_mime_bytes: 64,
    fetch_impl: async () => {
      call += 1;
      if (call === 1) {
        return jsonResponse({
          value: [{ sourceId: REST_ID, targetId: IMMUTABLE_ID }],
        }, "request-translate-oversized");
      }
      if (call === 2) {
        return jsonResponse({
          id: IMMUTABLE_ID,
          receivedDateTime: "2026-07-30T08:00:00.000Z",
        }, "request-metadata-oversized");
      }
      return new Response("x".repeat(65), {
        status: 200,
        headers: { "content-length": "65" },
      });
    },
  });
  await assert.rejects(
    oversized.getMeMessageMime({
      credential: { access_token: ACCESS_TOKEN },
      rest_message_id: REST_ID,
      mailbox_scope: "me",
      prefer_immutable_id: true,
      source_id_type: "restId",
      target_id_type: "restImmutableEntryId",
    }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large
    ),
  );
});

test("CL-P3-W02-T04 Graph provider는 명시적 /me/events 요청에 transactionId와 비공개 UTC 일정만 보낸다", async () => {
  const calls = [];
  const provider = createMicrosoftGraphMailProvider({
    graph_base_url: "https://graph.example.invalid/v1.0",
    fetch_impl: async (url, options) => {
      const parsed = new URL(url);
      const headers = new Headers(options.headers);
      calls.push({
        pathname: parsed.pathname,
        method: options.method,
        body: JSON.parse(options.body),
      });
      assert.equal(
        headers.get("authorization"),
        `Bearer ${ACCESS_TOKEN}`,
      );
      assert.equal(headers.get("content-type"), "application/json");
      return new Response(JSON.stringify({
        id: "graph-event-client-consultation-t04",
        webLink:
          "https://outlook.office365.com/calendar/item/client-consultation-t04",
      }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "request-id": "graph-request-client-consultation-t04",
        },
      });
    },
  });
  const result = await provider.createMeCalendarEvent({
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

  assert.deepEqual(calls, [{
    pathname: "/v1.0/me/events",
    method: "POST",
    body: {
      subject: "법률 상담",
      start: {
        dateTime: "2026-08-01T01:00:00.000",
        timeZone: "UTC",
      },
      end: {
        dateTime: "2026-08-01T02:00:00.000",
        timeZone: "UTC",
      },
      transactionId: "00000000-0000-5000-8000-000000000004",
      sensitivity: "private",
      showAs: "busy",
    },
  }]);
  assert.equal(
    result.event_id,
    "graph-event-client-consultation-t04",
  );
  assert.equal(
    result.web_link,
    "https://outlook.office365.com/calendar/item/client-consultation-t04",
  );
  assert.equal(
    result.provider_request_id,
    "graph-request-client-consultation-t04",
  );
  assert.equal(
    JSON.stringify(calls).includes(ACCESS_TOKEN),
    false,
  );
});

test("CL-P3-W02-T04 Graph provider는 공유 mailbox와 상담 원문 필드를 일정 생성 전에 거부한다", async () => {
  let providerCalls = 0;
  const provider = createMicrosoftGraphMailProvider({
    fetch_impl: async () => {
      providerCalls += 1;
      return new Response("{}", { status: 201 });
    },
  });
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
    provider.createMeCalendarEvent({
      ...base,
      mailbox_scope: "shared",
    }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request
    ),
  );
  await assert.rejects(
    provider.createMeCalendarEvent({
      ...base,
      event: {
        ...base.event,
        body: "상담 원문",
      },
    }),
    (error) => (
      error.safe_error_code
      === MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request
    ),
  );
  assert.equal(providerCalls, 0);
});
