import assert from "node:assert/strict";
import test from "node:test";

import {
  MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION,
  MICROSOFT_EGRESS_BROKER_FUNCTION_NAME,
  MICROSOFT_EGRESS_MAX_MIME_BYTES,
  createMicrosoftEgressBrokerTransport,
} from "../src/microsoft-egress-broker-transport.js";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";

function success(operation, result = {}) {
  return {
    StatusCode: 200,
    Payload: Buffer.from(JSON.stringify({
      contract_version: MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION,
      operation,
      ok: true,
      status: operation === "graph.calendarEvent.create" ? 201 : 200,
      result,
    })),
  };
}

test("Microsoft egress transport invokes only the six fixed broker operations", async () => {
  const calls = [];
  const transport = createMicrosoftEgressBrokerTransport({
    lambda_client: {
      async send(command) {
        assert.equal(command.constructor.name, "InvokeCommand");
        assert.equal(
          command.input.FunctionName,
          MICROSOFT_EGRESS_BROKER_FUNCTION_NAME,
        );
        assert.equal(command.input.InvocationType, "RequestResponse");
        assert.equal(command.input.LogType, "None");
        const envelope = JSON.parse(
          Buffer.from(command.input.Payload).toString("utf8"),
        );
        calls.push(envelope);
        return success(
          envelope.operation,
          envelope.operation === "graph.mailMessage.export"
            ? { mime_bytes: 1 }
            : {},
        );
      },
    },
  });

  await transport.oauthJwksGet({ tenant_id: TENANT_ID });
  await transport.oauthTokenExchange({
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    authorization_code: "0.ABC_broker-code",
    code_verifier: "V".repeat(43),
    redirect_profile: "people",
    scopes: ["openid", "offline_access", "Calendars.ReadBasic"],
  });
  await transport.oauthTokenRefresh({
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    refresh_token: "refresh-token-never-log",
    scopes: ["offline_access", "Calendars.ReadBasic"],
  });
  await transport.graphCalendarViewList({
    access_token: "calendar-access-token-never-log",
    start_date_time: "2026-08-03T00:00:00+09:00",
    end_date_time: "2026-08-04T00:00:00+09:00",
    timezone: "Asia/Seoul",
  });
  await transport.graphCalendarEventCreate({
    access_token: "calendar-write-token-never-log",
    subject: "상담",
    start_at: "2026-08-03T01:00:00.000Z",
    end_at: "2026-08-03T02:00:00.000Z",
    transaction_id: "transaction-broker-001",
  });
  await transport.graphMailMessageExport({
    access_token: "mail-access-token-never-log",
    rest_message_id: "rest-message-broker-001",
  });

  assert.deepEqual(calls.map(({ operation }) => operation), [
    "oauth.jwks.get",
    "oauth.token.exchange",
    "oauth.token.refresh",
    "graph.calendarView.list",
    "graph.calendarEvent.create",
    "graph.mailMessage.export",
  ]);
  for (const envelope of calls) {
    assert.equal(
      envelope.contract_version,
      MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION,
    );
    assert.equal(Object.hasOwn(envelope.request, "url"), false);
    assert.equal(Object.hasOwn(envelope.request, "headers"), false);
  }
  const exchange = calls[1].request;
  assert.equal(exchange.redirect_profile, "people");
  assert.equal(Object.hasOwn(exchange, "redirect_uri"), false);
  assert.equal(Object.hasOwn(exchange, "client_secret"), false);
});

test("Microsoft egress transport rejects URL injection before Lambda Invoke", async () => {
  let invokeCount = 0;
  const transport = createMicrosoftEgressBrokerTransport({
    lambda_client: {
      async send() {
        invokeCount += 1;
        return success("graph.mailMessage.export");
      },
    },
  });

  await assert.rejects(
    transport.graphMailMessageExport({
      access_token: "mail-access-token-never-log",
      rest_message_id: "rest-message-broker-001",
      url: "https://example.invalid/exfiltrate",
    }),
    /unsupported fields/u,
  );
  assert.equal(invokeCount, 0);
});

test("Microsoft egress transport validates and sanitizes broker failures", async () => {
  const transport = createMicrosoftEgressBrokerTransport({
    lambda_client: {
      async send(command) {
        const { operation } = JSON.parse(
          Buffer.from(command.input.Payload).toString("utf8"),
        );
        return {
          StatusCode: 200,
          Payload: Buffer.from(JSON.stringify({
            contract_version: MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION,
            operation,
            ok: false,
            status: 429,
            error: {
              code: "THROTTLED",
              retry_after_seconds: 7,
              provider_request_id: "provider-request-safe-001",
            },
          })),
        };
      },
    },
  });

  await assert.rejects(
    transport.graphCalendarViewList({
      access_token: "calendar-access-token-never-log",
      start_date_time: "2026-08-03T00:00:00+09:00",
      end_date_time: "2026-08-04T00:00:00+09:00",
      timezone: "Asia/Seoul",
    }),
    (error) => (
      error.safe_error_code === "MICROSOFT_EGRESS_THROTTLED"
      && error.status === 429
      && error.retry_after_seconds === 7
      && error.provider_request_id === "provider-request-safe-001"
    ),
  );
});

test("Microsoft egress transport rejects an oversized successful MIME envelope", async () => {
  const transport = createMicrosoftEgressBrokerTransport({
    lambda_client: {
      async send() {
        return success("graph.mailMessage.export", {
          mime_bytes: MICROSOFT_EGRESS_MAX_MIME_BYTES + 1,
          mime_base64: "TUlNRT0=",
        });
      },
    },
  });

  await assert.rejects(
    transport.graphMailMessageExport({
      access_token: "mail-access-token-never-log",
      rest_message_id: "rest-message-broker-oversized",
    }),
    (error) => (
      error.safe_error_code === "MICROSOFT_EGRESS_MIME_TOO_LARGE"
      && error.status === 413
      && error.message.includes("3 MiB")
    ),
  );
});
