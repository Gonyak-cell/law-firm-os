import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  CONTRACT_VERSION,
  MAX_MIME_BYTES,
  OPERATION_NAMES,
  REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV,
  REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV,
  createHandler as createBrokerHandler,
  refreshProfileProofKeyringFromEnvironment,
} from "./index.mjs";

const TENANT = "11111111-1111-4111-8111-111111111111";
const CLIENT = "22222222-2222-4222-8222-222222222222";
const PEOPLE_SCOPES = Object.freeze([
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadBasic",
]);
const CLIENT_SCOPES = Object.freeze([
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
  "Mail.Read",
]);
const SHARED_CLIENT_SECRET = "shared-client-secret-never-log";
const CURRENT_PROOF_KEY = Buffer.alloc(32, 0x41);
const PREVIOUS_PROOF_KEY = Buffer.alloc(32, 0x42);
const UNKNOWN_PROOF_KEY = Buffer.alloc(32, 0x43);
const REFRESH_PROFILE_PROOF_CONTEXT =
  "lawos.microsoft-egress.refresh-profile.v1";

function createHandler(options = {}) {
  return createBrokerHandler({
    refresh_profile_proof_keyring: { current: CURRENT_PROOF_KEY },
    ...options,
  });
}

function profileProof({ key, profile, refreshToken }) {
  return createHmac("sha256", key)
    .update([
      REFRESH_PROFILE_PROOF_CONTEXT,
      TENANT,
      CLIENT,
      profile,
      refreshToken,
    ].join("\u0000"), "utf8")
    .digest("base64url");
}

function envelope(operation, request) {
  return { contract_version: CONTRACT_VERSION, operation, request };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("exports only the fixed allowlisted operations", () => {
  assert.deepEqual(OPERATION_NAMES, [
    "oauth.jwks.get",
    "oauth.token.exchange",
    "oauth.token.refresh",
    "oauth.refresh-profile.bind-legacy-people",
    "graph.calendarView.list",
    "graph.calendarEvent.create",
    "graph.mailMessage.export",
    "graph.messageSubscription.create",
    "graph.messageSubscription.renew",
    "graph.messageSubscription.list",
    "graph.messageSubscription.delete",
    "graph.messageDelta.list",
  ]);
});

test("broker proof key environment contract requires one 32-byte base64url current key and permits one distinct previous key", () => {
  assert.equal(
    REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV,
    "LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_CURRENT_KEY_B64URL",
  );
  assert.equal(
    REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV,
    "LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_PREVIOUS_KEY_B64URL",
  );
  assert.throws(
    () => refreshProfileProofKeyringFromEnvironment({}),
    /CURRENT_KEY_B64URL is required/u,
  );
  assert.throws(
    () => refreshProfileProofKeyringFromEnvironment({
      [REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV]: "not-base64url",
    }),
    /unpadded base64url for 32 bytes/u,
  );
  assert.throws(
    () => refreshProfileProofKeyringFromEnvironment({
      [REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV]:
        CURRENT_PROOF_KEY.toString("base64url"),
      [REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV]:
        CURRENT_PROOF_KEY.toString("base64url"),
    }),
    /current and previous proof keys must differ/u,
  );
  const keyring = refreshProfileProofKeyringFromEnvironment({
    [REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV]:
      CURRENT_PROOF_KEY.toString("base64url"),
    [REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV]:
      PREVIOUS_PROOF_KEY.toString("base64url"),
  });
  assert.equal(keyring.current.byteLength, 32);
  assert.equal(keyring.previous.byteLength, 32);
});

test("JWKS remains available when the proof-key environment is absent", async () => {
  let externalFetchCount = 0;
  const handler = createBrokerHandler({
    refresh_profile_proof_keyring_from_environment: () => (
      refreshProfileProofKeyringFromEnvironment({})
    ),
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({
        keys: [{ kty: "RSA", kid: "jwks-key" }],
      });
    },
  });
  const result = await handler(envelope("oauth.jwks.get", {
    tenant_id: TENANT,
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.result.keys, [{ kty: "RSA", kid: "jwks-key" }]);
  assert.equal(externalFetchCount, 1);
});

test("proof-dependent operations fail closed with a safe 503 when proof keys are absent", async () => {
  let externalFetchCount = 0;
  const handler = createBrokerHandler({
    refresh_profile_proof_keyring_from_environment: () => (
      refreshProfileProofKeyringFromEnvironment({})
    ),
    fetch_impl: async () => {
      externalFetchCount += 1;
      throw new Error("unexpected Microsoft egress");
    },
  });
  const requests = [
    ["oauth.token.exchange", {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      authorization_code: "code-value",
      code_verifier: "a".repeat(43),
      redirect_profile: "people",
      scopes: PEOPLE_SCOPES,
    }],
    ["oauth.token.refresh", {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "refresh-token",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: "people",
      scopes: PEOPLE_SCOPES,
    }],
    ["oauth.refresh-profile.bind-legacy-people", {
      tenant_id: TENANT,
      client_id: CLIENT,
      refresh_token: "refresh-token",
    }],
  ];
  for (const [operation, request] of requests) {
    const result = await handler(envelope(operation, request));
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
    assert.equal(result.error.code, "BROKER_CONFIG_UNAVAILABLE");
    assert.deepEqual(Object.keys(result.error), ["code"]);
    assert.equal(JSON.stringify(result).includes("LAWOS_"), false);
  }
  assert.equal(externalFetchCount, 0);
});

test("a lazily loaded configured proof keyring allows token exchange", async () => {
  let externalFetchCount = 0;
  const handler = createBrokerHandler({
    refresh_profile_proof_keyring_from_environment: () => (
      refreshProfileProofKeyringFromEnvironment({
        [REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV]:
          CURRENT_PROOF_KEY.toString("base64url"),
      })
    ),
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({
        token_type: "Bearer",
        scope: PEOPLE_SCOPES.join(" "),
        expires_in: 3600,
        access_token: "access",
        refresh_token: "refresh",
      });
    },
  });
  const result = await handler(envelope("oauth.token.exchange", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    authorization_code: "code-value",
    code_verifier: "a".repeat(43),
    redirect_profile: "people",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(result.ok, true);
  assert.match(result.result.refresh_profile_proof, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(externalFetchCount, 1);
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
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(result.ok, true);
  assert.equal(
    calls[0].url,
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
  );
  assert.equal(calls[0].options.redirect, "error");
  const form = new URLSearchParams(calls[0].options.body);
  assert.equal(
    form.get("redirect_uri"),
    "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
  );
  assert.equal(result.result.ignored, undefined);
  assert.equal(result.result.access_token, "access");
  assert.equal(result.result.refresh_profile, "people");
  assert.match(result.result.refresh_profile_proof, /^[A-Za-z0-9_-]{43}$/u);
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
    client_secret: SHARED_CLIENT_SECRET,
    authorization_code: "code-value",
    code_verifier: "a".repeat(43),
    redirect_profile: "https://attacker.example/callback",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INVALID_REQUEST");
  assert.equal(calls, 0);
});

test("token refresh accepts only an exact profile scope set", async () => {
  let call;
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      call = { url, options };
      return json({
        token_type: "Bearer",
        scope: CLIENT_SCOPES.join(" "),
        expires_in: 3600,
        access_token: "access",
        refresh_token: "refresh-rotated",
      });
    },
  });
  const exchanged = await handler(envelope("oauth.token.exchange", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    authorization_code: "code-value",
    code_verifier: "a".repeat(43),
    redirect_profile: "client",
    scopes: CLIENT_SCOPES,
  }));
  assert.equal(exchanged.ok, true);
  const result = await handler(envelope("oauth.token.refresh", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    refresh_token: exchanged.result.refresh_token,
    refresh_profile_proof: exchanged.result.refresh_profile_proof,
    redirect_profile: "client",
    scopes: CLIENT_SCOPES,
  }));

  assert.equal(result.ok, true);
  assert.equal(result.result.refresh_profile, "client");
  assert.match(result.result.refresh_profile_proof, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(
    new URLSearchParams(call.options.body).get("scope"),
    CLIENT_SCOPES.join(" "),
  );
});

test("token exchange and refresh reject mixed People and Client scopes", async () => {
  let calls = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      return json({});
    },
  });
  const mixedScopes = [...new Set([...PEOPLE_SCOPES, ...CLIENT_SCOPES])];

  for (const request of [
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      authorization_code: "code-value",
      code_verifier: "a".repeat(43),
      redirect_profile: "people",
      scopes: mixedScopes,
    },
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "refresh",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: "people",
      scopes: mixedScopes,
    },
  ]) {
    const operation = Object.hasOwn(request, "authorization_code")
      ? "oauth.token.exchange"
      : "oauth.token.refresh";
    const result = await handler(envelope(operation, request));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "INVALID_REQUEST");
  }
  assert.equal(calls, 0);
});

test("token refresh rejects missing, cross-profile, and injected profiles before egress", async () => {
  let calls = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      return json({});
    },
  });

  for (const request of [
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "people-refresh-token",
      scopes: PEOPLE_SCOPES,
    },
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "people-refresh-token",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: "client",
      scopes: PEOPLE_SCOPES,
    },
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "client-refresh-token",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: "people",
      scopes: CLIENT_SCOPES,
    },
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "people-refresh-token",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: "https://attacker.example/callback",
      scopes: PEOPLE_SCOPES,
    },
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "people-refresh-token",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: " people ",
      scopes: PEOPLE_SCOPES,
    },
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      client_secret: SHARED_CLIENT_SECRET,
      refresh_token: "people-refresh-token",
      refresh_profile_proof: "P".repeat(43),
      redirect_profile: "people",
      redirect_uri: "https://attacker.example/callback",
      scopes: PEOPLE_SCOPES,
    },
  ]) {
    const result = await handler(envelope("oauth.token.refresh", request));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "INVALID_REQUEST");
  }
  assert.equal(calls, 0);
});

test("a People refresh token and proof cannot be relabeled as Client before egress", async () => {
  let externalFetchCount = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({
        token_type: "Bearer",
        scope: PEOPLE_SCOPES.join(" "),
        expires_in: 3600,
        access_token: "people-access-token",
        refresh_token: "people-refresh-token",
      });
    },
  });
  const exchanged = await handler(envelope("oauth.token.exchange", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    authorization_code: "people-code-value",
    code_verifier: "a".repeat(43),
    redirect_profile: "people",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(exchanged.ok, true);
  const beforeRelabel = externalFetchCount;

  const relabeled = await handler(envelope("oauth.token.refresh", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    refresh_token: exchanged.result.refresh_token,
    refresh_profile_proof: exchanged.result.refresh_profile_proof,
    redirect_profile: "client",
    scopes: CLIENT_SCOPES,
  }));
  assert.equal(relabeled.ok, false);
  assert.equal(relabeled.error.code, "INVALID_REQUEST");
  assert.equal(externalFetchCount - beforeRelabel, 0);
});

test("an OAuth client secret cannot recompute the broker-owned proof key", async () => {
  let externalFetchCount = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({});
    },
  });
  const refreshToken = "people-refresh-token-forged-proof";
  const forged = profileProof({
    key: Buffer.from(SHARED_CLIENT_SECRET, "utf8"),
    profile: "people",
    refreshToken,
  });
  const result = await handler(envelope("oauth.token.refresh", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    refresh_token: refreshToken,
    refresh_profile_proof: forged,
    redirect_profile: "people",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INVALID_REQUEST");
  assert.equal(externalFetchCount, 0);
});

test("refresh accepts the previous proof key and always reissues the current proof", async () => {
  let externalFetchCount = 0;
  const oldHandler = createBrokerHandler({
    refresh_profile_proof_keyring: { current: PREVIOUS_PROOF_KEY },
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({
        token_type: "Bearer",
        scope: PEOPLE_SCOPES.join(" "),
        expires_in: 3600,
        access_token: "legacy-key-access-token",
        refresh_token: "legacy-key-refresh-token",
      });
    },
  });
  const exchanged = await oldHandler(envelope("oauth.token.exchange", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    authorization_code: "legacy-key-code",
    code_verifier: "k".repeat(43),
    redirect_profile: "people",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(exchanged.ok, true);

  const rotatingHandler = createBrokerHandler({
    refresh_profile_proof_keyring: {
      current: CURRENT_PROOF_KEY,
      previous: PREVIOUS_PROOF_KEY,
    },
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({
        token_type: "Bearer",
        scope: PEOPLE_SCOPES.join(" "),
        expires_in: 3600,
        access_token: "rotated-key-access-token",
        refresh_token: "rotated-key-refresh-token",
      });
    },
  });
  const refreshed = await rotatingHandler(envelope("oauth.token.refresh", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    refresh_token: exchanged.result.refresh_token,
    refresh_profile_proof: exchanged.result.refresh_profile_proof,
    redirect_profile: "people",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(refreshed.ok, true);
  assert.equal(
    refreshed.result.refresh_profile_proof,
    profileProof({
      key: CURRENT_PROOF_KEY,
      profile: "people",
      refreshToken: "rotated-key-refresh-token",
    }),
  );
  assert.equal(externalFetchCount, 2);
});

test("refresh rejects a proof from an unknown broker key before egress", async () => {
  let externalFetchCount = 0;
  const handler = createBrokerHandler({
    refresh_profile_proof_keyring: {
      current: CURRENT_PROOF_KEY,
      previous: PREVIOUS_PROOF_KEY,
    },
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({});
    },
  });
  const refreshToken = "unknown-key-refresh-token";
  const result = await handler(envelope("oauth.token.refresh", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    refresh_token: refreshToken,
    refresh_profile_proof: profileProof({
      key: UNKNOWN_PROOF_KEY,
      profile: "people",
      refreshToken,
    }),
    redirect_profile: "people",
    scopes: PEOPLE_SCOPES,
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INVALID_REQUEST");
  assert.equal(externalFetchCount, 0);
});

test("legacy binding is hard-coded to People and cannot mint a Client proof", async () => {
  let externalFetchCount = 0;
  const handler = createHandler({
    fetch_impl: async () => {
      externalFetchCount += 1;
      return json({});
    },
  });
  const refreshToken = "legacy-unbound-people-refresh-token";
  const bound = await handler(envelope(
    "oauth.refresh-profile.bind-legacy-people",
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      refresh_token: refreshToken,
    },
  ));
  assert.equal(bound.ok, true);
  assert.deepEqual(bound.result, {
    refresh_profile: "people",
    refresh_profile_proof: profileProof({
      key: CURRENT_PROOF_KEY,
      profile: "people",
      refreshToken,
    }),
  });
  const injected = await handler(envelope(
    "oauth.refresh-profile.bind-legacy-people",
    {
      tenant_id: TENANT,
      client_id: CLIENT,
      refresh_token: refreshToken,
      refresh_profile: "client",
    },
  ));
  assert.equal(injected.ok, false);
  assert.equal(injected.error.code, "INVALID_REQUEST");
  const relabeled = await handler(envelope("oauth.token.refresh", {
    tenant_id: TENANT,
    client_id: CLIENT,
    client_secret: SHARED_CLIENT_SECRET,
    refresh_token: refreshToken,
    refresh_profile_proof: bound.result.refresh_profile_proof,
    redirect_profile: "client",
    scopes: CLIENT_SCOPES,
  }));
  assert.equal(relabeled.ok, false);
  assert.equal(relabeled.error.code, "INVALID_REQUEST");
  assert.equal(externalFetchCount, 0);
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

test("mail export proves exact Sent Items provenance from fixed Graph paths without exposing folder IDs", async () => {
  const calls = [];
  const immutable = "immutable-1";
  const inboxId = "inbox-folder-1";
  const sentItemsId = "sent-items-folder-1";
  const metadata = {
    id: immutable,
    internetMessageId: "<message@example.test>",
    conversationId: "conversation-1",
    subject: "Sent subject",
    toRecipients: [{ emailAddress: { name: "To", address: "to@example.test" } }],
    ccRecipients: [{ emailAddress: { name: "Cc", address: "cc@example.test" } }],
    bccRecipients: [{ emailAddress: { name: "Bcc", address: "bcc@example.test" } }],
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: "2026-08-08T00:59:00Z",
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-1",
    parentFolderId: sentItemsId,
    isDraft: false,
  };
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) return json({ ...metadata, id: "rest-1" });
      if (calls.length === 2) return json({ value: [metadata] });
      if (calls.length === 3) {
        return json({ id: inboxId });
      }
      if (calls.length === 4) {
        return json({ id: sentItemsId });
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
  assert.equal(result.result.message_metadata.is_in_sent_items, true);
  assert.equal(result.result.message_metadata.folder_kind, "sentitems");
  assert.equal(result.result.message_metadata.sent_at, "2026-08-08T00:59:00.000Z");
  assert.deepEqual(result.result.message_metadata.to_recipients, [{ name: "To", address: "to@example.test" }]);
  assert.deepEqual(result.result.message_metadata.cc_recipients, [{ name: "Cc", address: "cc@example.test" }]);
  assert.deepEqual(result.result.message_metadata.bcc_recipients, [{ name: "Bcc", address: "bcc@example.test" }]);
  assert.equal(result.result.message_metadata.is_draft, false);
  assert.equal(JSON.stringify(result.result).includes(sentItemsId), false);
  assert.equal(JSON.stringify(result.result).includes(inboxId), false);
  assert.equal(calls.length, 5);
  assert.ok(calls.every(({ url }) => (
    url.startsWith("https://graph.microsoft.com/v1.0/me/")
  )));
  assert.ok(calls.every(({ url }) => !url.includes("translateExchangeIds")));
  assert.ok(calls.every(({ options }) => options.redirect === "error"));
  assert.equal(Object.hasOwn(calls[0].options.headers, "Prefer"), false);
  assert.ok(calls.slice(1).every(({ options }) => (
    options.headers.Prefer === 'IdType="ImmutableId"'
  )));
  assert.equal(
    new URL(calls[0].url).pathname,
    "/v1.0/me/messages/rest-1",
  );
  assert.equal(
    new URL(calls[0].url).searchParams.get("$select").includes("parentFolderId"),
    true,
  );
  assert.equal(
    new URL(calls[1].url).pathname,
    "/v1.0/me/messages",
  );
  assert.equal(new URL(calls[1].url).searchParams.get("$top"), "2");
  assert.equal(
    new URL(calls[2].url).pathname,
    "/v1.0/me/mailFolders/inbox",
  );
  assert.equal(new URL(calls[2].url).searchParams.get("$select"), "id");
  assert.equal(
    new URL(calls[3].url).pathname,
    "/v1.0/me/mailFolders/sentitems",
  );
  assert.equal(new URL(calls[3].url).searchParams.get("$select"), "id");
  assert.equal(
    new URL(calls[4].url).pathname,
    "/v1.0/me/messages/immutable-1/$value",
  );
});

test("mail export resolves an Office REST v2 ID through a bounded immutable identity lookup", async () => {
  const calls = [];
  const internetMessageId = "<lawyer's-fallback@example.test>";
  const regularMetadata = {
    id: "rest-office-404",
    internetMessageId,
    conversationId: "conversation-fallback",
    subject: "Fallback subject",
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: null,
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-fallback",
    parentFolderId: "inbox-fallback",
    isDraft: false,
  };
  const immutableMetadata = {
    id: "immutable/fallback+1=",
    internetMessageId,
    conversationId: regularMetadata.conversationId,
    parentFolderId: regularMetadata.parentFolderId,
    isDraft: regularMetadata.isDraft,
    changeKey: regularMetadata.changeKey,
    createdDateTime: regularMetadata.createdDateTime,
    receivedDateTime: regularMetadata.receivedDateTime,
    sentDateTime: regularMetadata.sentDateTime,
  };
  const handler = createHandler({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) return json(regularMetadata);
      if (calls.length === 2) {
        return json({ value: [immutableMetadata] }, 200, {
          "request-id": "immutable-identity-request",
        });
      }
      if (calls.length === 3) return json({ id: "inbox-fallback" });
      if (calls.length === 4) return json({ id: "sent-items-fallback" });
      return new Response("From: sender@example.test\r\n\r\nbody", {
        status: 200,
      });
    },
  });

  const result = await handler(envelope("graph.mailMessage.export", {
    access_token: "token",
    rest_message_id: "rest-office-404",
  }));

  assert.equal(result.ok, true);
  assert.equal(result.result.immutable_message_id, "immutable/fallback+1=");
  assert.equal(result.result.message_metadata.received_at, "2026-08-08T01:00:00.000Z");
  assert.equal(result.result.message_metadata.sent_at, "2026-08-08T01:00:00.000Z");
  assert.equal(result.result.message_metadata.subject, "Fallback subject");
  assert.equal(
    result.result.provider_request_ids.metadata,
    "immutable-identity-request",
  );
  assert.equal(calls.length, 5);
  assert.equal(
    new URL(calls[0].url).pathname,
    "/v1.0/me/messages/rest-office-404",
  );
  assert.equal(Object.hasOwn(calls[0].options.headers, "Prefer"), false);
  assert.equal(calls[0].options.headers.authorization, "Bearer token");
  const sourceSelect = new URL(calls[0].url).searchParams.get("$select");
  assert.equal(sourceSelect.includes("subject"), true);
  assert.equal(sourceSelect.includes("changeKey"), true);
  assert.equal(sourceSelect.includes("createdDateTime"), true);
  const identityUrl = new URL(calls[1].url);
  assert.equal(identityUrl.pathname, "/v1.0/me/messages");
  assert.equal(
    identityUrl.searchParams.get("$filter"),
    "internetMessageId eq '<lawyer''s-fallback@example.test>'",
  );
  assert.equal(identityUrl.searchParams.get("$top"), "2");
  assert.equal(
    identityUrl.searchParams.get("$select"),
    "id,internetMessageId,conversationId,parentFolderId,isDraft,changeKey,createdDateTime,receivedDateTime,sentDateTime",
  );
  assert.equal(identityUrl.searchParams.get("$select").includes("subject"), false);
  assert.equal(identityUrl.searchParams.get("$select").includes("toRecipients"), false);
  assert.equal(calls[1].options.headers.Prefer, 'IdType="ImmutableId"');
  assert.equal(
    new URL(calls[4].url).pathname,
    "/v1.0/me/messages/immutable%2Ffallback%2B1%3D/$value",
  );
});

test("mail export fails closed when immutable identity lookup is absent, ambiguous, paged, or mismatched", async () => {
  const restId = "rest-id-NEVER-LOG-immutable-lookup";
  const regularMetadata = {
    id: restId,
    internetMessageId: "<internet-message-id-NEVER-LOG@example.test>",
    conversationId: "conversation-id-NEVER-LOG",
    parentFolderId: "folder-id-NEVER-LOG",
    isDraft: false,
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: "2026-08-08T00:59:00Z",
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-NEVER-LOG",
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
  };
  const candidate = {
    ...regularMetadata,
    id: "immutable-id-NEVER-LOG",
  };
  const scenarios = [
    { label: "absent", body: { value: [] } },
    { label: "ambiguous", body: { value: [candidate, candidate] } },
    {
      label: "paged",
      body: {
        value: [candidate],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/messages?$skiptoken=NEVER-LOG",
      },
    },
    {
      label: "internet message mismatch",
      body: { value: [{ ...candidate, internetMessageId: "<other@example.test>" }] },
    },
    {
      label: "conversation mismatch",
      body: { value: [{ ...candidate, conversationId: "other-conversation" }] },
    },
    {
      label: "folder mismatch",
      body: { value: [{ ...candidate, parentFolderId: "other-folder" }] },
    },
    {
      label: "draft mismatch",
      body: { value: [{ ...candidate, isDraft: true }] },
    },
    {
      label: "change key mismatch",
      body: { value: [{ ...candidate, changeKey: "other-change-key" }] },
    },
    {
      label: "created timestamp mismatch",
      body: { value: [{ ...candidate, createdDateTime: "2026-08-08T00:58:01Z" }] },
    },
    {
      label: "received timestamp mismatch",
      body: { value: [{ ...candidate, receivedDateTime: "2026-08-08T01:00:01Z" }] },
    },
    {
      label: "sent timestamp mismatch",
      body: { value: [{ ...candidate, sentDateTime: null }] },
    },
  ];

  for (const scenario of scenarios) {
    let calls = 0;
    const lines = [];
    const originalConsoleError = console.error;
    console.error = (...values) => lines.push(values);
    let result;
    try {
      const handler = createHandler({
        fetch_impl: async () => {
          calls += 1;
          if (calls === 1) return json(regularMetadata);
          return json(scenario.body);
        },
      });
      result = await handler(envelope("graph.mailMessage.export", {
        access_token: "token-NEVER-LOG-immutable-lookup",
        rest_message_id: restId,
      }));
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(result.ok, false, scenario.label);
    assert.equal(result.error.code, "UPSTREAM_RESPONSE_INVALID", scenario.label);
    assert.equal(calls, 2, scenario.label);
    assert.equal(lines.length, 1, scenario.label);
    const serialized = String(lines[0][0]);
    assert.deepEqual(JSON.parse(serialized), {
      event: "lawos.microsoft_egress.mail_export_failed",
      operation: "graph.mailMessage.export",
      stage: "immutable_identity",
      error_code: "UPSTREAM_RESPONSE_INVALID",
      status: 502,
    }, scenario.label);
    for (const sentinel of [
      restId,
      regularMetadata.internetMessageId,
      regularMetadata.conversationId,
      regularMetadata.parentFolderId,
      candidate.id,
      "token-NEVER-LOG-immutable-lookup",
    ]) {
      assert.equal(serialized.includes(sentinel), false, scenario.label);
    }
  }
});

test("mail export rejects regular metadata that is not exactly bound to the Office REST ID", async () => {
  let calls = 0;
  const lines = [];
  const originalConsoleError = console.error;
  console.error = (...values) => lines.push(values);
  let result;
  try {
    const handler = createHandler({
      fetch_impl: async () => {
        calls += 1;
        return json({
          id: "another-rest-id-NEVER-LOG",
          internetMessageId: "<id-binding-NEVER-LOG@example.test>",
          conversationId: "conversation-id-binding-NEVER-LOG",
          parentFolderId: "folder-id-binding-NEVER-LOG",
          isDraft: false,
          changeKey: "change-key-id-binding-NEVER-LOG",
          createdDateTime: "2026-08-08T00:58:00Z",
          receivedDateTime: "2026-08-08T01:00:00Z",
          sentDateTime: "2026-08-08T00:59:00Z",
        });
      },
    });
    result = await handler(envelope("graph.mailMessage.export", {
      access_token: "token-id-binding-NEVER-LOG",
      rest_message_id: "office-rest-id-NEVER-LOG",
    }));
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "UPSTREAM_RESPONSE_INVALID");
  assert.equal(calls, 1);
  assert.deepEqual(JSON.parse(String(lines[0][0])), {
    event: "lawos.microsoft_egress.mail_export_failed",
    operation: "graph.mailMessage.export",
    stage: "metadata",
    error_code: "UPSTREAM_RESPONSE_INVALID",
    status: 502,
  });
  assert.equal(String(lines[0][0]).includes("NEVER-LOG"), false);
});

test("mail export preserves divergent Graph sender and from provenance without synthesis", async () => {
  let calls = 0;
  const metadata = {
    id: "immutable-divergent",
    internetMessageId: "<divergent@example.test>",
    conversationId: "conversation-divergent",
    sender: {
      emailAddress: {
        name: "Delegate Sender",
        address: "delegate.sender@example.test",
      },
    },
    from: {
      emailAddress: {
        name: "Mailbox Principal",
        address: "mailbox.principal@example.test",
      },
    },
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: "2026-08-08T00:59:00Z",
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-divergent",
    parentFolderId: "inbox-divergent",
    isDraft: false,
  };
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) return json({ ...metadata, id: "rest-divergent" });
      if (calls === 2) return json({ value: [metadata] });
      if (calls === 3) return json({ id: "inbox-divergent" });
      if (calls === 4) return json({ id: "sent-items-divergent" });
      return new Response(
        "From: mailbox.principal@example.test\r\n\r\nbody",
        { status: 200 },
      );
    },
  });
  const result = await handler(envelope("graph.mailMessage.export", {
    access_token: "token",
    rest_message_id: "rest-divergent",
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.result.message_metadata.sender, {
    name: "Delegate Sender",
    address: "delegate.sender@example.test",
  });
  assert.deepEqual(result.result.message_metadata.from, {
    name: "Mailbox Principal",
    address: "mailbox.principal@example.test",
  });
  assert.notDeepEqual(
    result.result.message_metadata.sender,
    result.result.message_metadata.from,
  );
});

test("mail export normalizes nullable Graph message timestamps from the available instant", async () => {
  const run = async ({ receivedDateTime, sentDateTime }) => {
    let calls = 0;
    const metadata = {
      id: "immutable-nullable-time",
      internetMessageId: "<nullable-time@example.test>",
      conversationId: "conversation-nullable-time",
      parentFolderId: "inbox-nullable-time",
      isDraft: false,
      receivedDateTime,
      sentDateTime,
      createdDateTime: "2026-08-08T00:58:00Z",
      changeKey: "change-key-nullable-time",
      toRecipients: [],
      ccRecipients: [],
      bccRecipients: [],
    };
    const handler = createHandler({
      fetch_impl: async () => {
        calls += 1;
        if (calls === 1) return json({ ...metadata, id: "rest-nullable-time" });
        if (calls === 2) return json({ value: [metadata] });
        if (calls === 3) return json({ id: "inbox-nullable-time" });
        if (calls === 4) return json({ id: "sent-items-nullable-time" });
        return new Response("From: sender@example.test\r\n\r\nbody", { status: 200 });
      },
    });
    return handler(envelope("graph.mailMessage.export", {
      access_token: "token",
      rest_message_id: "rest-nullable-time",
    }));
  };

  for (const [timestamps, expected] of [
    [{ receivedDateTime: "2026-08-08T01:00:00Z", sentDateTime: null }, "2026-08-08T01:00:00.000Z"],
    [{ receivedDateTime: null, sentDateTime: "2026-08-08T00:59:00Z" }, "2026-08-08T00:59:00.000Z"],
  ]) {
    const result = await run(timestamps);
    assert.equal(result.ok, true);
    assert.equal(result.result.message_metadata.received_at, expected);
    assert.equal(result.result.message_metadata.sent_at, expected);
  }

  const invalid = await run({ receivedDateTime: null, sentDateTime: null });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "UPSTREAM_RESPONSE_INVALID");
});

test("mail export rejects a metadata response without an immutable message ID", async () => {
  let calls = 0;
  let requestUrl = null;
  const regularMetadata = {
    id: "rest/+?=1",
    internetMessageId: "<missing-immutable@example.test>",
    conversationId: "conversation-missing-immutable",
    parentFolderId: "inbox-1",
    isDraft: false,
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: "2026-08-08T00:59:00Z",
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-missing-immutable",
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
  };
  const handler = createHandler({
    fetch_impl: async (url) => {
      calls += 1;
      requestUrl ??= url;
      if (calls === 1) return json(regularMetadata);
      return json({ value: [{ ...regularMetadata, id: null }] });
    },
  });
  const result = await handler(envelope("graph.mailMessage.export", {
    access_token: "token",
    rest_message_id: "rest/+?=1",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "UPSTREAM_RESPONSE_INVALID");
  assert.equal(calls, 2);
  assert.equal(
    new URL(requestUrl).pathname,
    "/v1.0/me/messages/rest%2F%2B%3F%3D1",
  );
});

test("mail export classifies Inbox, Sent Items, and other folders without inference", async () => {
  const immutable = "immutable-1";
  const inboxId = "inbox-folder-1";
  const sentItemsId = "sent-items-folder-1";
  const run = async ({ parentFolderId, isDraft, inbox = { id: inboxId }, sent = { id: sentItemsId } }) => {
    let calls = 0;
    const metadata = {
      id: immutable,
      internetMessageId: "<folder-classification@example.test>",
      conversationId: "conversation-folder-classification",
      parentFolderId,
      isDraft,
      receivedDateTime: "2026-08-08T01:00:00Z",
      sentDateTime: "2026-08-08T00:59:00Z",
      createdDateTime: "2026-08-08T00:58:00Z",
      changeKey: "change-key-folder-classification",
      toRecipients: [],
      ccRecipients: [],
      bccRecipients: [],
    };
    const handler = createHandler({
      fetch_impl: async () => {
        calls += 1;
        if (calls === 1) return json({ ...metadata, id: "rest-1" });
        if (calls === 2) return json({ value: [metadata] });
        if (calls === 3) return json(inbox);
        if (calls === 4) return json(sent);
        return new Response(
          "From: sender@example.test\r\nTo: receiver@example.test\r\n\r\nbody",
          { status: 200 },
        );
      },
    });
    return handler(envelope("graph.mailMessage.export", {
      access_token: "token",
      rest_message_id: "rest-1",
    }));
  };

  const nonSent = await run({
    parentFolderId: inboxId,
    isDraft: false,
  });
  assert.equal(nonSent.ok, true);
  assert.equal(nonSent.result.message_metadata.is_in_sent_items, false);
  assert.equal(nonSent.result.message_metadata.folder_kind, "inbox");
  assert.equal(nonSent.result.message_metadata.is_draft, false);

  const draft = await run({
    parentFolderId: sentItemsId,
    isDraft: true,
  });
  assert.equal(draft.ok, true);
  assert.equal(draft.result.message_metadata.is_in_sent_items, true);
  assert.equal(draft.result.message_metadata.folder_kind, "sentitems");
  assert.equal(draft.result.message_metadata.is_draft, true);

  const other = await run({ parentFolderId: "archive-folder-1", isDraft: false });
  assert.equal(other.ok, true);
  assert.equal(other.result.message_metadata.folder_kind, "other");

  for (const invalid of [
    { parentFolderId: null, isDraft: false },
    { parentFolderId: sentItemsId, isDraft: "false" },
    { parentFolderId: sentItemsId, isDraft: false, inbox: {} },
    { parentFolderId: sentItemsId, isDraft: false, sent: {} },
  ]) {
    const result = await run(invalid);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "UPSTREAM_RESPONSE_INVALID");
  }
});

test("mail export rejects MIME larger than synchronous invoke limit", async () => {
  let calls = 0;
  const immutable = "immutable-1";
  const metadata = {
    id: immutable,
    internetMessageId: "<oversized-mime@example.test>",
    conversationId: "conversation-oversized-mime",
    parentFolderId: "sent-items-folder-1",
    isDraft: false,
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: "2026-08-08T00:59:00Z",
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-oversized-mime",
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
  };
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) return json({ ...metadata, id: "rest-1" });
      if (calls === 2) return json({ value: [metadata] });
      if (calls === 3) {
        return json({ id: "inbox-folder-1" });
      }
      if (calls === 4) {
        return json({ id: "sent-items-folder-1" });
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

test("mail export failure log contains only fixed non-payload fields", async () => {
  const tokenSentinel = "token-NEVER-LOG-4d8f4d";
  const restIdSentinel = "rest-id-NEVER-LOG-7a6b";
  const payloadSentinels = [
    tokenSentinel,
    restIdSentinel,
    "immutable-id-NEVER-LOG",
    "subject-NEVER-LOG",
    "recipient-NEVER-LOG@example.test",
    "folder-id-NEVER-LOG",
    "mime-body-NEVER-LOG",
    "provider-request-id-NEVER-LOG",
    "upstream-body-NEVER-LOG",
    "graph.microsoft.com",
    "internet-message-id-NEVER-LOG",
  ];
  const metadata = (overrides = {}) => ({
    id: "immutable-id-NEVER-LOG",
    internetMessageId: "<internet-message-id-NEVER-LOG@example.test>",
    conversationId: "conversation-id-NEVER-LOG",
    subject: "subject-NEVER-LOG",
    parentFolderId: "folder-id-NEVER-LOG",
    isDraft: false,
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: "2026-08-08T00:59:00Z",
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-NEVER-LOG",
    toRecipients: [{
      emailAddress: {
        name: "recipient-NEVER-LOG",
        address: "recipient-NEVER-LOG@example.test",
      },
    }],
    ccRecipients: [],
    bccRecipients: [],
    ...overrides,
  });
  const upstreamError = () => json(
    { error: "upstream-body-NEVER-LOG" },
    500,
    { "request-id": "provider-request-id-NEVER-LOG" },
  );
  const regularMetadata = (overrides = {}) => () => json(metadata({
    id: restIdSentinel,
    ...overrides,
  }));
  const immutableIdentity = (overrides = {}) => () => json({
    value: [metadata(overrides)],
  });
  const scenarios = [
    {
      stage: "metadata",
      code: "UPSTREAM_REJECTED",
      responses: [upstreamError],
    },
    {
      stage: "immutable_identity",
      code: "UPSTREAM_REJECTED",
      responses: [
        regularMetadata(),
        upstreamError,
      ],
    },
    {
      stage: "inbox_folder",
      code: "UPSTREAM_REJECTED",
      responses: [regularMetadata(), immutableIdentity(), upstreamError],
    },
    {
      stage: "sent_items_folder",
      code: "UPSTREAM_REJECTED",
      responses: [
        regularMetadata(),
        immutableIdentity(),
        () => json({ id: "inbox-id-NEVER-LOG" }),
        upstreamError,
      ],
    },
    {
      stage: "metadata_normalization",
      code: "UPSTREAM_RESPONSE_INVALID",
      responses: [
        regularMetadata({
          receivedDateTime: null,
          sentDateTime: null,
        }),
        immutableIdentity({
          receivedDateTime: null,
          sentDateTime: null,
        }),
        () => json({ id: "inbox-id-NEVER-LOG" }),
        () => json({ id: "sent-items-id-NEVER-LOG" }),
      ],
    },
    {
      stage: "mime",
      code: "UPSTREAM_RESPONSE_INVALID",
      responses: [
        regularMetadata(),
        immutableIdentity(),
        () => json({ id: "inbox-id-NEVER-LOG" }),
        () => json({ id: "sent-items-id-NEVER-LOG" }),
        () => new Response("mime-body-NEVER-LOG", { status: 200 }),
      ],
    },
  ];

  for (const scenario of scenarios) {
    const lines = [];
    const originalConsoleError = console.error;
    console.error = (...values) => lines.push(values);
    let result;
    try {
      let calls = 0;
      const handler = createHandler({
        fetch_impl: async () => scenario.responses[calls++](),
      });
      result = await handler(envelope("graph.mailMessage.export", {
        access_token: tokenSentinel,
        rest_message_id: restIdSentinel,
      }));
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(result.ok, false);
    assert.equal(result.error.code, scenario.code);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].length, 1);
    const serialized = String(lines[0][0]);
    assert.deepEqual(JSON.parse(serialized), {
      event: "lawos.microsoft_egress.mail_export_failed",
      operation: "graph.mailMessage.export",
      stage: scenario.stage,
      error_code: scenario.code,
      status: 502,
    });
    for (const sentinel of payloadSentinels) {
      assert.equal(serialized.includes(sentinel), false);
    }
  }
});

test("successful mail export emits no failure log", async () => {
  let calls = 0;
  const metadata = {
    id: "immutable-success",
    internetMessageId: "<success@example.test>",
    conversationId: "conversation-success",
    parentFolderId: "inbox-success",
    isDraft: false,
    receivedDateTime: "2026-08-08T01:00:00Z",
    sentDateTime: null,
    createdDateTime: "2026-08-08T00:58:00Z",
    changeKey: "change-key-success",
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
  };
  const handler = createHandler({
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) return json({ ...metadata, id: "rest-success" });
      if (calls === 2) return json({ value: [metadata] });
      if (calls === 3) return json({ id: "inbox-success" });
      if (calls === 4) return json({ id: "sent-items-success" });
      return new Response("From: sender@example.test\r\n\r\nbody", {
        status: 200,
      });
    },
  });
  const lines = [];
  const originalConsoleError = console.error;
  console.error = (...values) => lines.push(values);
  let result;
  try {
    result = await handler(envelope("graph.mailMessage.export", {
      access_token: "token",
      rest_message_id: "rest-success",
    }));
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(result.ok, true);
  assert.deepEqual(lines, []);
});
