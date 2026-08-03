import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONTRACT_VERSION,
  MAX_MIME_BYTES,
  OPERATION_NAMES,
  createHandler,
} from "./index.mjs";

const TENANT = "11111111-1111-4111-8111-111111111111";
const CLIENT = "22222222-2222-4222-8222-222222222222";

function envelope(operation, request) {
  return { contract_version: CONTRACT_VERSION, operation, request };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("exports only the six fixed operations", () => {
  assert.deepEqual(OPERATION_NAMES, [
    "oauth.jwks.get",
    "oauth.token.exchange",
    "oauth.token.refresh",
    "graph.calendarView.list",
    "graph.calendarEvent.create",
    "graph.mailMessage.export",
  ]);
});

test("rejects unsupported operations and caller-supplied URL fields", async () => {
  let calls = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      throw new Error("unexpected fetch");
    },
  });
  const unsupported = await handler(
    envelope("http.fetch", { url: "https://example.com" }),
  );
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.error.code, "UNSUPPORTED_OPERATION");
  const injected = await handler(envelope("oauth.jwks.get", {
    tenant_id: TENANT,
    url: "https://example.com",
  }));
  assert.equal(injected.ok, false);
  assert.equal(injected.error.code, "INVALID_REQUEST");
  assert.equal(calls, 0);
});

test("token exchange fixes host, callback profile, and redirect policy", async () => {
  const calls = [];
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return json({
        token_type: "Bearer",
        scope: "offline_access Calendars.ReadBasic",
        expires_in: 3600,
        access_token: "access",
        refresh_token: "refresh",
        ignored: "not returned",
      }, 200, { "request-id": "request-1" });
    },
  });
  const result = await handler(envelope("oauth.token.exchange", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: "secret",
    authorization_code: "code-value",
    code_verifier: "a".repeat(43),
    redirect_profile: "people",
    scopes: ["offline_access", "Calendars.ReadBasic"],
  }));
  assert.equal(result.ok, true);
  assert.equal(
    calls[0].url,
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
  );
  assert.equal(calls[0].options.redirect, "error");
  const form = new URLSearchParams(calls[0].options.body);
  assert.equal(form.get("redirect_uri"), "matter://auth/callback");
  assert.equal(result.result.ignored, undefined);
  assert.equal(result.result.access_token, "access");
});

test("token exchange rejects unknown redirect profiles", async () => {
  let calls = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      return json({});
    },
  });
  const result = await handler(envelope("oauth.token.exchange", {
    tenant_id: TENANT,
    client_id: CLIENT,
    authorization_code: "code-value",
    code_verifier: "a".repeat(43),
    redirect_profile: "https://attacker.example/callback",
    scopes: ["offline_access", "Calendars.ReadBasic"],
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INVALID_REQUEST");
  assert.equal(calls, 0);
});

test("calendar view follows only Graph pagination and normalizes events", async () => {
  const calls = [];
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) {
        return json({
          value: [{ id: "event-1", subject: "회의", attendees: [] }],
          "@odata.nextLink":
            "https://graph.microsoft.com/v1.0/me/calendarView?$skiptoken=next",
        }, 200, { "request-id": "calendar-1" });
      }
      return json({
        value: [{ id: "event-2", subject: "검토", attendees: [] }],
      }, 200, { "request-id": "calendar-2" });
    },
  });
  const result = await handler(envelope("graph.calendarView.list", {
    access_token: "token",
    start_date_time: "2026-08-03T00:00:00+09:00",
    end_date_time: "2026-08-04T00:00:00+09:00",
    timezone: "Asia/Seoul",
  }));
  assert.equal(result.ok, true);
  assert.equal(result.result.events.length, 2);
  assert.equal(result.result.page_count, 2);
  assert.ok(calls.every(({ options }) => options.redirect === "error"));
});

test("calendar view rejects an off-origin pagination URL", async () => {
  const handler = createHandler({
    fetch_impl: async () => json({
      value: [],
      "@odata.nextLink":
        "https://attacker.example/v1.0/me/calendarView?$skiptoken=x",
    }),
  });
  const result = await handler(envelope("graph.calendarView.list", {
    access_token: "token",
    start_date_time: "2026-08-03T00:00:00+09:00",
    end_date_time: "2026-08-04T00:00:00+09:00",
    timezone: "Asia/Seoul",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "TARGET_POLICY_VIOLATION");
});

test("calendar create fixes private and busy Graph fields", async () => {
  let call;
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      call = { url, options };
      return json({
        id: "event-1",
        webLink: "https://outlook.office.com/calendar/item/1",
      }, 201, { "request-id": "create-1" });
    },
  });
  const result = await handler(envelope("graph.calendarEvent.create", {
    access_token: "token",
    subject: "상담",
    start_at: "2026-08-03T01:00:00Z",
    end_at: "2026-08-03T02:00:00Z",
    transaction_id: "tx-1",
  }));
  assert.equal(result.ok, true);
  assert.equal(call.url, "https://graph.microsoft.com/v1.0/me/events");
  assert.equal(call.options.redirect, "error");
  assert.deepEqual(JSON.parse(call.options.body), {
    subject: "상담",
    start: {
      dateTime: "2026-08-03T01:00:00.000",
      timeZone: "UTC",
    },
    end: {
      dateTime: "2026-08-03T02:00:00.000",
      timeZone: "UTC",
    },
    transactionId: "tx-1",
    sensitivity: "private",
    showAs: "busy",
  });
});

test("mail export uses three fixed Graph paths and bounded base64 MIME", async () => {
  const calls = [];
  const immutable = "immutable-1";
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) {
        return json({
          value: [{ sourceId: "rest-1", targetId: immutable }],
        });
      }
      if (calls.length === 2) {
        return json({
          id: immutable,
          internetMessageId: "<message@example.test>",
          toRecipients: [],
          ccRecipients: [],
          bccRecipients: [],
        });
      }
      return new Response(
        "From: sender@example.test\r\n"
          + "To: receiver@example.test\r\n\r\nbody",
        {
          status: 200,
          headers: { "content-type": "message/rfc822" },
        },
      );
    },
  });
  const result = await handler(envelope("graph.mailMessage.export", {
    access_token: "token",
    rest_message_id: "rest-1",
  }));
  assert.equal(result.ok, true);
  assert.equal(
    Buffer.from(result.result.mime_base64, "base64")
      .toString("utf8")
      .startsWith("From:"),
    true,
  );
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ url }) => (
    url.startsWith("https://graph.microsoft.com/v1.0/me/")
  )));
  assert.ok(calls.every(({ options }) => options.redirect === "error"));
});

test("mail export rejects MIME larger than synchronous invoke limit", async () => {
  let calls = 0;
  const immutable = "immutable-1";
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) {
        return json({
          value: [{ sourceId: "rest-1", targetId: immutable }],
        });
      }
      if (calls === 2) {
        return json({
          id: immutable,
          toRecipients: [],
          ccRecipients: [],
          bccRecipients: [],
        });
      }
      return new Response(Buffer.alloc(MAX_MIME_BYTES + 1, 65), {
        status: 200,
      });
    },
  });
  const result = await handler(envelope("graph.mailMessage.export", {
    access_token: "token",
    rest_message_id: "rest-1",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "RESPONSE_TOO_LARGE");
});

test("implementation contains no application payload logging", async () => {
  const source = await readFile(
    new URL("./index.mjs", import.meta.url),
    "utf8",
  );
  assert.equal(
    /console\.|process\.stdout|process\.stderr/u.test(source),
    false,
  );
});
