import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_ERROR_CODES,
  GRAPH_STATE,
  LAWOS_SESSION_STORAGE_KEY,
  OUTLOOK_OAUTH_DIALOG_OPTIONS,
  createSessionStore,
  detectNestedAppAuth,
  isLawosSessionToken,
  loadOfficeSsoConfig,
  openOfficeOAuthDialog,
  parseDialogMessage,
  parseExchangeResponse,
  parseRuntimeConfig,
  parseSessionValidation,
} from "../src/addin-auth.js";

test("런타임 설정은 API가 내려준 Entra 정보와 고정 콜백을 정규화하고 query 값을 읽지 않는다", () => {
  const config = parseRuntimeConfig({
    client_id: "client-001",
    tenant_id: "tenant-001",
    api_scope: "api://client-001/access_as_user",
    api_base: "https://addin.example.invalid",
    callback_uri: "https://addin.example.invalid/api/outlook/connection/callback",
  });
  assert.equal(config.clientId, "client-001");
  assert.equal(config.tenantId, "tenant-001");
  assert.deepEqual(config.scopes, ["api://client-001/access_as_user"]);
  assert.equal(config.callbackUri, "https://addin.example.invalid/api/outlook/connection/callback");
  assert.equal(config.authority, "https://login.microsoftonline.com/tenant-001");
  assert.equal(config.naaRedirectUri, "https://addin.example.invalid/addin/index.html");
  assert.throws(
    () => parseRuntimeConfig({
      client_id: "client-001",
      tenant_id: "tenant-001",
      api_scope: "api://client-001/access_as_user",
      api_base: "https://addin.example.invalid",
      callback_uri: "https://addin.example.invalid/api/outlook/connection/callback",
      authority: "https://evil.example.invalid/tenant-001",
    }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.runtimeConfigInvalid,
  );
  assert.throws(
    () => parseRuntimeConfig({
      client_id: "client-001",
      tenant_id: "tenant-001",
      api_scope: "api://client-001/access_as_user",
      api_base: "https://addin.example.invalid",
      callback_uri: "https://evil.example.invalid/callback",
    }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.runtimeConfigInvalid,
  );
  assert.throws(
    () => parseRuntimeConfig({
      client_id: "client-001",
      tenant_id: "tenant-001",
      api_scope: "api://client-001/access_as_user",
      api_base: "https://addin.example.invalid",
      callback_uri: "https://addin.example.invalid/api/outlook/connection/callback",
      authority: "https://login.microsoftonline.com/other-tenant",
    }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.runtimeConfigInvalid,
  );
  assert.throws(
    () => parseRuntimeConfig({
      client_id: "client-001",
      tenant_id: "tenant-001",
      api_scope: "Mail.Read",
      api_base: "https://addin.example.invalid",
      callback_uri: "https://addin.example.invalid/api/outlook/connection/callback",
    }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.runtimeConfigInvalid,
  );
});

test("NestedAppAuth는 Office 1.1과 host bridge가 모두 있어야 지원으로 판정된다", () => {
  const calls = [];
  const Office = { context: { requirements: { isSetSupported(...args) { calls.push(args); return true; } } } };
  assert.equal(detectNestedAppAuth({ Office, window: { nestedAppAuthBridge: {} } }).supported, true);
  assert.equal(detectNestedAppAuth({ Office, window: {} }).reason, AUTH_ERROR_CODES.nestedAppAuthUnavailable);
  assert.equal(detectNestedAppAuth({ Office: { context: { requirements: { isSetSupported: () => false } } }, window: { nestedAppAuthBridge: {} } }).supported, false);
  assert.deepEqual(calls, [["NestedAppAuth", "1.1"], ["NestedAppAuth", "1.1"]]);
});

test("Microsoft 로그인 대화상자는 iframe이 아닌 별도 webview로 연다", () => {
  assert.deepEqual(OUTLOOK_OAUTH_DIALOG_OPTIONS, {
    height: 70,
    width: 42,
    displayInIframe: false,
  });
});

test("세션 교환은 LawOS 서명 세션만 허용하고 Entra token을 저장하지 않는다", () => {
  const token = "lawos_session_v1.header.payload";
  assert.equal(isLawosSessionToken(token), true);
  assert.equal(isLawosSessionToken("eyJ.enra.token"), false);
  assert.equal(parseExchangeResponse({ session_token: token }), token);
  assert.throws(
    () => parseExchangeResponse({ access_token: "graph-token" }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.sessionExchangeInvalid,
  );
});

test("대화상자 결과는 same-origin, 고정 type, 기대 state를 모두 검증한다", () => {
  const result = parseDialogMessage({
    origin: "https://addin.example.invalid",
    expectedOrigin: "https://addin.example.invalid",
    expectedState: "state-001",
    rawMessage: JSON.stringify({ type: "lawos-outlook-oauth", state: "state-001", code: "code-001" }),
  });
  assert.deepEqual(result, { type: "lawos-outlook-oauth", state: "state-001", code: "code-001" });
  assert.throws(
    () => parseDialogMessage({ origin: "https://evil.invalid", expectedOrigin: "https://addin.example.invalid", expectedState: "state-001", rawMessage: result }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.dialogOriginInvalid,
  );
  assert.throws(
    () => parseDialogMessage({ origin: "https://addin.example.invalid", expectedOrigin: "https://addin.example.invalid", expectedState: "state-002", rawMessage: result }),
    (error) => error.safe_error_code === AUTH_ERROR_CODES.dialogStateMismatch,
  );
});

function createDialogFixture({ status = "succeeded", onComplete = async () => {}, timeoutMs } = {}) {
  const handlers = new Map();
  let closeCount = 0;
  let displayed = null;
  const dialog = {
    addEventHandler(type, handler) {
      handlers.set(type, handler);
    },
    close() {
      closeCount += 1;
    },
  };
  const Office = {
    AsyncResultStatus: { Succeeded: "succeeded" },
    EventType: {
      DialogMessageReceived: "DialogMessageReceived",
      DialogEventReceived: "DialogEventReceived",
    },
    context: {
      ui: {
        displayDialogAsync(url, options, callback) {
          displayed = { url, options };
          callback({ status, value: dialog });
        },
      },
    },
  };
  const pending = openOfficeOAuthDialog({
    Office,
    origin: "https://addin.example.invalid",
    authorizationUrl: "https://login.microsoftonline.com/tenant-001/oauth2/v2.0/authorize?client_id=client-001",
    state: "state-001",
    callbackUri: "https://addin.example.invalid/api/outlook/connection/callback",
    onComplete,
    ...(timeoutMs ? { timeoutMs } : {}),
  });
  return {
    Office,
    pending,
    handlers,
    dialog,
    get closeCount() { return closeCount; },
    get displayed() { return displayed; },
  };
}

test("Office OAuth 대화상자는 검증된 성공 응답을 한 번만 완료하고 닫는다", async () => {
  const completions = [];
  const dialogFixture = createDialogFixture({ onComplete: async (message) => completions.push(message) });
  const message = {
    origin: "https://addin.example.invalid",
    message: JSON.stringify({ type: "lawos-outlook-oauth", state: "state-001", code: "code-001" }),
  };
  const messageHandler = dialogFixture.handlers.get("DialogMessageReceived");
  assert.equal(typeof messageHandler, "function");
  await Promise.all([messageHandler(message), messageHandler(message)]);
  await dialogFixture.pending;
  assert.deepEqual(completions, [{
    type: "lawos-outlook-oauth",
    state: "state-001",
    code: "code-001",
    callbackUri: "https://addin.example.invalid/api/outlook/connection/callback",
  }]);
  assert.equal(dialogFixture.closeCount, 1);
  assert.equal(dialogFixture.handlers.has("DialogEventReceived"), true);
  assert.match(dialogFixture.displayed.url, /^https:\/\/addin\.example\.invalid\/addin\/oauth-start\.html#/u);
  assert.deepEqual(dialogFixture.displayed.options, OUTLOOK_OAUTH_DIALOG_OPTIONS);
  assert.notEqual(dialogFixture.displayed.options, OUTLOOK_OAUTH_DIALOG_OPTIONS);
  assert.equal(Object.isFrozen(dialogFixture.displayed.options), false);
  assert.equal(Object.isFrozen(OUTLOOK_OAUTH_DIALOG_OPTIONS), true);
});

test("Office OAuth 대화상자는 malformed 응답의 origin과 state를 거부하고 닫는다", async () => {
  const cases = [
    {
      name: "malformed-json",
      event: { origin: "https://addin.example.invalid", message: "not-json" },
      code: AUTH_ERROR_CODES.dialogMessageInvalid,
    },
    {
      name: "wrong-origin",
      event: { origin: "https://evil.invalid", message: JSON.stringify({ type: "lawos-outlook-oauth", state: "state-001", code: "code-001" }) },
      code: AUTH_ERROR_CODES.dialogOriginInvalid,
    },
    {
      name: "wrong-state",
      event: { origin: "https://addin.example.invalid", message: JSON.stringify({ type: "lawos-outlook-oauth", state: "state-002", code: "code-001" }) },
      code: AUTH_ERROR_CODES.dialogStateMismatch,
    },
  ];
  for (const entry of cases) {
    const dialogFixture = createDialogFixture();
    const rejected = assert.rejects(dialogFixture.pending, (error) => error.safe_error_code === entry.code);
    await dialogFixture.handlers.get("DialogMessageReceived")(entry.event);
    await rejected;
    assert.equal(dialogFixture.closeCount, 1, `${entry.name}: dialog should close once`);
  }
});

test("Office OAuth 대화상자는 공급자 오류와 DialogEventReceived를 실패로 닫는다", async () => {
  const providerDialog = createDialogFixture();
  const providerRejected = assert.rejects(providerDialog.pending, (error) => error.safe_error_code === "OUTLOOK_OAUTH_PROVIDER_ERROR");
  await providerDialog.handlers.get("DialogMessageReceived")({
    origin: "https://addin.example.invalid",
    message: JSON.stringify({ type: "lawos-outlook-oauth", state: "state-001", error: "access_denied" }),
  });
  await providerRejected;
  assert.equal(providerDialog.closeCount, 1);

  const eventDialog = createDialogFixture();
  const eventRejected = assert.rejects(eventDialog.pending, (error) => error.safe_error_code === AUTH_ERROR_CODES.dialogUnavailable);
  await eventDialog.handlers.get("DialogEventReceived")({ error: 12006 });
  await eventRejected;
  assert.equal(eventDialog.closeCount, 1);
});

test("Office OAuth 대화상자 열기 실패도 닫기 가능한 대화상자를 정리한다", async () => {
  const failedDialog = createDialogFixture({ status: "failed" });
  await assert.rejects(failedDialog.pending, (error) => error.safe_error_code === AUTH_ERROR_CODES.dialogUnavailable);
  assert.equal(failedDialog.closeCount, 1);
});

test("Office OAuth 대화상자가 응답하지 않으면 제한 시간 뒤 닫고 재시도할 수 있게 한다", async () => {
  const stalledDialog = createDialogFixture({ timeoutMs: 5 });
  await assert.rejects(
    stalledDialog.pending,
    (error) => error.safe_error_code === AUTH_ERROR_CODES.dialogTimeout,
  );
  assert.equal(stalledDialog.closeCount, 1);
});

test("sessionStorage와 OfficeRuntime storage에는 같은 LawOS 세션만 기록한다", async () => {
  const session = new Map();
  const office = new Map();
  const store = createSessionStore({
    key: LAWOS_SESSION_STORAGE_KEY,
    sessionStorage: { getItem: (key) => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: (key) => session.delete(key) },
    officeStorage: { async getItem(key) { return office.get(key) ?? null; }, async setItem(key, value) { office.set(key, value); }, async removeItem(key) { office.delete(key); } },
  });
  await assert.rejects(store.set("graph_access_token"), /LawOS 세션만 저장/);
  await store.set("lawos_session_v1.header.payload");
  assert.equal(await store.get(), "lawos_session_v1.header.payload");
  await store.clear();
  assert.equal(await store.get(), "");
});

test("session endpoint의 401은 인증되지 않은 상태로 파싱한다", () => {
  assert.deepEqual(parseSessionValidation({ safe_error_codes: ["AUTH_SESSION_INVALID"] }, 401), {
    authenticated: false,
    safe_error_code: "AUTH_SESSION_INVALID",
  });
  assert.equal(parseSessionValidation({ ok: true, principal: { user_id: "u1" } }).authenticated, true);
  assert.equal(GRAPH_STATE.connected, "connected");
});

test("Office SSO 설정은 같은 origin API의 공개 설정만 사용한다", async () => {
  const calls = [];
  const config = await loadOfficeSsoConfig({
    location: { origin: "https://addin.example.invalid" },
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() {
          return {
            client_id: "client-001",
            tenant_id: "tenant-001",
            api_scope: "api://client-001/access_as_user",
            callback_uri: "https://addin.example.invalid/api/outlook/connection/callback",
          };
        },
      };
    },
  });
  assert.deepEqual(calls, ["https://addin.example.invalid/api/auth/office-sso/config"]);
  assert.deepEqual(config.scopes, ["api://client-001/access_as_user"]);
  assert.equal(config.authority, "https://login.microsoftonline.com/tenant-001");
});
