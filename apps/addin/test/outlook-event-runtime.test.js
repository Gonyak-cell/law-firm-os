import assert from "node:assert/strict";
import test from "node:test";

import {
  createOutlookEventRequestJson,
  createOutlookEventRuntime,
} from "../src/outlook-event-runtime.js";

const SESSION_TOKEN = "lawos_session_v1.event-runtime-test";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const API_SCOPE = `api://${CLIENT_ID}/access_as_user`;

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
  };
}

function officeSsoConfig() {
  return {
    client_id: CLIENT_ID,
    tenant_id: TENANT_ID,
    api_scope: API_SCOPE,
    callback_uri: "https://lawos.example/api/outlook/connection/callback",
  };
}

test("classic event runtime은 DOM location 없이 Office runtime URL의 origin만 사용한다", async () => {
  const calls = [];
  const requestJson = createOutlookEventRequestJson({
    Office: {
      context: {
        urls: {
          javascriptRuntimeUrl: "https://lawos.example/addin/event-runtime.js",
        },
      },
    },
    location: undefined,
    sessionStorage: { getItem: () => SESSION_TOKEN },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ outcome: "evaluated", item: { warnings: [] } });
    },
  });

  const result = await requestJson("/api/outlook/smart-alerts/evaluate", {
    method: "POST",
    body: { message: { subject: "확인" } },
    timeoutMs: 100,
  });

  assert.equal(result.outcome, "evaluated");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://lawos.example/api/outlook/smart-alerts/evaluate");
  assert.equal(calls[0].options.headers.authorization, `Bearer ${SESSION_TOKEN}`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { message: { subject: "확인" } });
  await assert.rejects(
    requestJson("/api/auth/session"),
    (error) => error.safe_error_code === "OUTLOOK_EVENT_API_PATH_INVALID",
  );
});

test("JavaScript-only event runtime은 window 없이도 NAA 토큰을 LawOS 세션으로 교환한다", async () => {
  const calls = [];
  const stored = [];
  const pcaCalls = [];
  const requestJson = createOutlookEventRequestJson({
    Office: {
      context: {
        urls: {
          javascriptRuntimeUrl: "https://lawos.example/addin/event-runtime.js",
        },
      },
    },
    location: undefined,
    window: undefined,
    officeStorage: {
      async getItem() { return ""; },
      async setItem(key, value) { stored.push({ key, value }); },
    },
    createPca: async (config) => {
      pcaCalls.push(config);
      return {
        async acquireTokenSilent(request) {
          pcaCalls.push(request);
          return { accessToken: "entra-event-token" };
        },
      };
    },
    sessionStorage: { getItem: () => "" },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/office-sso/config")) {
        return response(officeSsoConfig());
      }
      if (url.endsWith("/api/auth/office-sso/exchange")) {
        return response({ session_token: "lawos_session_v1.event-office-runtime-test" });
      }
      return response({ outcome: "evaluated", item: { warnings: [] } });
    },
  });

  const result = await requestJson("/api/outlook/smart-alerts/evaluate", {
    method: "POST",
    body: { message: { subject: "검토" } },
  });

  assert.equal(result.outcome, "evaluated");
  assert.deepEqual(pcaCalls, [
    {
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: "https://lawos.example/addin/index.html",
        postLogoutRedirectUri: "https://lawos.example/addin/index.html",
      },
      cache: {
        cacheLocation: "memoryStorage",
        storeAuthStateInCookie: false,
      },
    },
    { scopes: [API_SCOPE] },
  ]);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "https://lawos.example/api/auth/office-sso/config");
  assert.equal(calls[1].url, "https://lawos.example/api/auth/office-sso/exchange");
  assert.deepEqual(JSON.parse(calls[1].options.body), { access_token: "entra-event-token" });
  assert.equal(
    calls[2].options.headers.authorization,
    "Bearer lawos_session_v1.event-office-runtime-test",
  );
  assert.equal(stored.some(({ value }) => value === "entra-event-token"), false);
});

test("JavaScript-only event runtime은 NAA silent 인증 실패 시 UI 없이 안전한 오류만 반환한다", async () => {
  const calls = [];
  const requestJson = createOutlookEventRequestJson({
    Office: {
      context: {
        urls: {
          javascriptRuntimeUrl: "https://lawos.example/addin/event-runtime.js",
        },
      },
    },
    location: undefined,
    window: undefined,
    sessionStorage: { getItem: () => "" },
    createPca: async () => ({
      async acquireTokenSilent() { throw new Error("interaction required"); },
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(officeSsoConfig());
    },
  });

  await assert.rejects(
    requestJson("/api/outlook/smart-alerts/evaluate"),
    (error) => error.safe_error_code === "OUTLOOK_EVENT_AUTH_UNAVAILABLE",
  );
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://lawos.example/api/auth/office-sso/config",
  ]);
});

test("JavaScript-only event runtime은 401에서 LawOS 세션만 지우고 NAA silent로 한 번 갱신한다", async () => {
  let sessionToken = SESSION_TOKEN;
  const authCalls = [];
  const removed = [];
  const calls = [];
  const requestJson = createOutlookEventRequestJson({
    Office: {
      context: {
        urls: {
          javascriptRuntimeUrl: "https://lawos.example/addin/event-runtime.js",
        },
      },
    },
    location: undefined,
    window: undefined,
    sessionStorage: {
      getItem: () => sessionToken,
      setItem: (_key, value) => { sessionToken = value; },
      removeItem: (key) => {
        removed.push(key);
        sessionToken = "";
      },
    },
    createPca: async () => ({
      async acquireTokenSilent() {
        authCalls.push(true);
        return { accessToken: "entra-refresh-token" };
      },
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/office-sso/config")) return response(officeSsoConfig());
      if (url.endsWith("/api/auth/office-sso/exchange")) {
        return response({ session_token: "lawos_session_v1.event-office-refreshed" });
      }
      if (options.headers.authorization === `Bearer ${SESSION_TOKEN}`) {
        return response({ safe_error_code: "AUTH_SESSION_INVALID" }, 401);
      }
      return response({ outcome: "evaluated", item: { warnings: [] } });
    },
  });

  const result = await requestJson("/api/outlook/smart-alerts/evaluate");

  assert.equal(result.outcome, "evaluated");
  assert.equal(authCalls.length, 1);
  assert.equal(calls.filter(({ url }) => url.endsWith("/api/outlook/smart-alerts/evaluate")).length, 2);
  assert.deepEqual(removed, ["lawos_addin_session_token"]);
  assert.equal(sessionToken, "lawos_session_v1.event-office-refreshed");
});

test("HTML event runtime은 NAA 토큰을 memory-only PCA로 교환하고 provider 토큰을 저장하지 않는다", async () => {
  const calls = [];
  const stored = [];
  const pcaCalls = [];
  const requestJson = createOutlookEventRequestJson({
    location: { origin: "https://lawos.example" },
    window: {},
    sessionStorage: { getItem: () => "" },
    officeStorage: {
      async getItem() { return ""; },
      async setItem(key, value) { stored.push({ key, value }); },
    },
    createPca: async (config) => {
      pcaCalls.push(config);
      return {
        async acquireTokenSilent(request) {
          pcaCalls.push(request);
          return { accessToken: "entra-event-token" };
        },
      };
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/office-sso/config")) {
        return response(officeSsoConfig());
      }
      if (url.endsWith("/api/auth/office-sso/exchange")) {
        return response({ session_token: "lawos_session_v1.event-naa-test" });
      }
      return response({ outcome: "evaluated", item: { warnings: [] } });
    },
  });

  const result = await requestJson("/api/outlook/smart-alerts/evaluate", {
    method: "POST",
    body: { message: { subject: "검토" } },
  });

  assert.equal(result.outcome, "evaluated");
  assert.deepEqual(pcaCalls, [
    {
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: `https://lawos.example/addin/index.html`,
        postLogoutRedirectUri: `https://lawos.example/addin/index.html`,
      },
      cache: {
        cacheLocation: "memoryStorage",
        storeAuthStateInCookie: false,
      },
    },
    { scopes: [API_SCOPE] },
  ]);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "https://lawos.example/api/auth/office-sso/config");
  assert.equal(calls[1].url, "https://lawos.example/api/auth/office-sso/exchange");
  assert.deepEqual(JSON.parse(calls[1].options.body), { access_token: "entra-event-token" });
  assert.equal(
    calls[2].options.headers.authorization,
    "Bearer lawos_session_v1.event-naa-test",
  );
  assert.equal(stored.length, 1);
  assert.equal(stored[0].value, "lawos_session_v1.event-naa-test");
  assert.equal(stored.some(({ value }) => value === "entra-event-token"), false);
});

test("event runtime은 무팝업 NAA 인증 실패 시 안전한 오류만 반환한다", async () => {
  const calls = [];
  const requestJson = createOutlookEventRequestJson({
    location: { origin: "https://lawos.example" },
    window: {},
    sessionStorage: { getItem: () => "" },
    createPca: async () => ({
      async acquireTokenSilent() { throw new Error("interaction required"); },
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(officeSsoConfig());
    },
  });

  await assert.rejects(
    requestJson("/api/outlook/smart-alerts/evaluate"),
    (error) => error.safe_error_code === "OUTLOOK_EVENT_AUTH_UNAVAILABLE",
  );
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://lawos.example/api/auth/office-sso/config",
  ]);
});

test("event runtime은 만료된 LawOS 세션을 한 번만 NAA로 갱신한다", async () => {
  let sessionToken = SESSION_TOKEN;
  const calls = [];
  const requestJson = createOutlookEventRequestJson({
    location: { origin: "https://lawos.example" },
    window: {},
    sessionStorage: {
      getItem: () => sessionToken,
      setItem: (_key, value) => { sessionToken = value; },
      removeItem: () => { sessionToken = ""; },
    },
    createPca: async () => ({
      async acquireTokenSilent() { return { accessToken: "entra-refresh-token" }; },
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/office-sso/config")) return response(officeSsoConfig());
      if (url.endsWith("/api/auth/office-sso/exchange")) {
        return response({ session_token: "lawos_session_v1.event-refreshed" });
      }
      const bearer = options.headers.authorization;
      if (bearer === `Bearer ${SESSION_TOKEN}`) {
        return response({ safe_error_code: "AUTH_SESSION_INVALID" }, 401);
      }
      return response({ outcome: "evaluated", item: { warnings: [] } });
    },
  });

  const result = await requestJson("/api/outlook/smart-alerts/evaluate", {
    method: "POST",
    body: { message: { subject: "재인증" } },
  });

  assert.equal(result.outcome, "evaluated");
  const alertCalls = calls.filter(({ url }) => url.endsWith("/api/outlook/smart-alerts/evaluate"));
  assert.equal(alertCalls.length, 2);
  assert.equal(alertCalls[0].options.headers.authorization, `Bearer ${SESSION_TOKEN}`);
  assert.equal(
    alertCalls[1].options.headers.authorization,
    "Bearer lawos_session_v1.event-refreshed",
  );
  assert.equal(sessionToken, "lawos_session_v1.event-refreshed");
});

test("event runtime은 본문 없는 401도 한 번만 갱신하고 두 번째 401에서 새 세션을 폐기한다", async () => {
  let sessionToken = SESSION_TOKEN;
  let silentAcquisitionCount = 0;
  const removed = [];
  const calls = [];
  const requestJson = createOutlookEventRequestJson({
    location: { origin: "https://lawos.example" },
    sessionStorage: {
      getItem: () => sessionToken,
      setItem: (_key, value) => { sessionToken = value; },
      removeItem: (key) => {
        removed.push(key);
        sessionToken = "";
      },
    },
    createPca: async () => ({
      async acquireTokenSilent() {
        silentAcquisitionCount += 1;
        return { accessToken: "entra-refresh-token" };
      },
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/office-sso/config")) return response(officeSsoConfig());
      if (url.endsWith("/api/auth/office-sso/exchange")) {
        return response({ session_token: "lawos_session_v1.event-refreshed" });
      }
      return {
        ok: false,
        status: 401,
        async json() { throw new Error("empty body"); },
      };
    },
  });

  await assert.rejects(
    requestJson("/api/outlook/smart-alerts/evaluate"),
    (error) => error.safe_error_code === "OUTLOOK_EVENT_REQUEST_FAILED",
  );

  assert.equal(silentAcquisitionCount, 1);
  assert.equal(
    calls.filter(({ url }) => url.endsWith("/api/outlook/smart-alerts/evaluate")).length,
    2,
  );
  assert.deepEqual(removed, [
    "lawos_addin_session_token",
    "lawos_addin_session_token",
  ]);
  assert.equal(sessionToken, "");
});

test("event runtime은 Office.onReady 없이 매니페스트 함수명을 즉시 associate한다", () => {
  const associated = [];
  const Office = {
    actions: {
      associate(name, handler) {
        associated.push({ name, handler });
      },
    },
    context: { mailbox: { item: null } },
  };
  const runtime = createOutlookEventRuntime({
    Office,
    mailbox: Office.context.mailbox,
    requestJson: async () => ({ item: { warnings: [] } }),
    globalObject: {},
  });

  assert.equal(runtime.register(), true);
  assert.equal(associated.length, 1);
  assert.equal(associated[0].name, "onMessageSendHandler");
  assert.equal(associated[0].handler, runtime.onMessageSendHandler);
});
