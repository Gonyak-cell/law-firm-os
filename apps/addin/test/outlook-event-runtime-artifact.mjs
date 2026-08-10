import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("built no-window event runtime uses NAA silently, exchanges it, and calls LawOS", async () => {
  const source = await readFile(
    new URL("../dist/event-runtime.js", import.meta.url),
    "utf8",
  );
  const fetchCalls = [];
  const storageWrites = [];
  const bridgeCalls = [];
  const completions = [];
  let handler = null;
  const Office = {
    actions: {
      associate(name, candidate) {
        assert.equal(name, "onMessageSendHandler");
        handler = candidate;
      },
    },
    AsyncResultStatus: { Succeeded: "succeeded" },
    CoercionType: { Text: "text" },
    MailboxEnums: {
      ItemNotificationMessageType: {
        InformationalMessage: "informationalMessage",
      },
    },
    context: {
      urls: {
        javascriptRuntimeUrl:
          "https://lawos.example/addin/event-runtime.js",
      },
      mailbox: {
        userProfile: {
          displayName: "Pilot User",
          emailAddress: "pilot.user@example.test",
        },
        item: {
          subject: "검토 메일",
          to: [],
          cc: [],
          bcc: [],
          attachments: [],
          body: {
            getAsync(_coercion, callback) {
              callback({ status: "succeeded", value: "본문" });
            },
          },
          notificationMessages: {
            addAsync(_key, _details, callback) {
              callback({ status: "succeeded" });
            },
          },
        },
      },
    },
  };
  let bridgeMessageHandler = null;
  const idTokenPayload = Buffer.from(JSON.stringify({
    oid: "artifact-local-account",
    tid: "11111111-1111-4111-8111-111111111111",
    preferred_username: "pilot.user@example.test",
    name: "Pilot User",
  })).toString("base64url");
  const idToken = `eyJhbGciOiJub25lIn0.${idTokenPayload}.signature`;
  const windowShim = {
    crypto: webcrypto,
    location: {
      href: "https://lawos.example/addin/event-runtime.js",
      origin: "https://lawos.example",
      hash: "",
      search: "",
    },
    console: Object.freeze({ log() {}, warn() {}, error() {} }),
    navigator: { onLine: true },
    performance,
    setTimeout,
    clearTimeout,
    addEventListener() {},
    removeEventListener() {},
    nestedAppAuthBridge: {
      addEventListener(_type, bridgeHandler) {
        bridgeMessageHandler = bridgeHandler;
      },
      postMessage(rawMessage) {
        const request = JSON.parse(rawMessage);
        bridgeCalls.push(request.method);
        const response = request.method === "GetInitContext"
          ? {
            requestId: request.requestId,
            success: true,
            initContext: {
              sdkName: "artifact-host",
              sdkVersion: "1.0.0",
              accountContext: null,
              capabilities: {},
            },
          }
          : {
            requestId: request.requestId,
            success: true,
            token: {
              id_token: idToken,
              access_token: "entra-event-artifact-token",
              expires_in: 3600,
              scope: "api://22222222-2222-4222-8222-222222222222/access_as_user",
              authority: "https://login.microsoftonline.com/11111111-1111-4111-8111-111111111111",
            },
            account: {
              homeAccountId: "artifact-local-account.11111111-1111-4111-8111-111111111111",
              environment: "login.microsoftonline.com",
              tenantId: "11111111-1111-4111-8111-111111111111",
              localAccountId: "artifact-local-account",
              username: "pilot.user@example.test",
            },
          };
        queueMicrotask(() => bridgeMessageHandler?.({ data: JSON.stringify(response) }));
      },
    },
  };
  const context = vm.createContext({
    Office,
    OfficeRuntime: {
      storage: {
        async getItem() { return ""; },
        async setItem(key, value) { storageWrites.push({ key, value }); },
        async removeItem() {},
      },
    },
    fetch: async (url, options) => {
      fetchCalls.push({ url, options });
      if (url.endsWith("/api/auth/office-sso/config")) {
        return new Response(JSON.stringify({
          client_id: "22222222-2222-4222-8222-222222222222",
          tenant_id: "11111111-1111-4111-8111-111111111111",
          api_scope: "api://22222222-2222-4222-8222-222222222222/access_as_user",
          callback_uri: "https://lawos.example/api/outlook/connection/callback",
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/api/auth/office-sso/exchange")) {
        return new Response(JSON.stringify({
          session_token: "lawos_session_v1.event-artifact-test",
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        outcome: "evaluated",
        item: { warnings: [] },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    AbortController,
    Blob,
    Date,
    Error,
    Headers,
    Promise,
    Request,
    Response,
    TextDecoder,
    TextEncoder,
    URL,
    URLSearchParams,
    atob,
    btoa,
    clearTimeout,
    console: Object.freeze({ log() {}, warn() {}, error() {} }),
    crypto: webcrypto,
    performance,
    queueMicrotask,
    setTimeout,
  });
  // MSAL's NAA bridge is supplied by the Outlook host. Keep it inherited so
  // this remains a no-window VM fixture from the runtime's perspective.
  Object.setPrototypeOf(context, { window: windowShim });

  vm.runInContext(source, context, { filename: "event-runtime.js" });
  assert.equal(typeof handler, "function");
  assert.equal(Object.hasOwn(context, "window"), false);
  assert.equal(Object.hasOwn(context, "document"), false);
  assert.equal(Object.hasOwn(context, "location"), false);

  await handler({ completed: (payload) => completions.push(payload) });

  assert.equal(completions.length, 1);
  assert.equal(completions[0].allowEvent, true);
  assert.deepEqual(bridgeCalls, ["GetInitContext", "GetToken"]);
  assert.equal(fetchCalls.length, 3);
  assert.equal(
    fetchCalls[0].url,
    "https://lawos.example/api/auth/office-sso/config",
  );
  assert.equal(
    fetchCalls[1].url,
    "https://lawos.example/api/auth/office-sso/exchange",
  );
  assert.equal(
    JSON.parse(fetchCalls[1].options.body).access_token,
    "entra-event-artifact-token",
  );
  assert.equal(
    fetchCalls[1].options.credentials,
    "same-origin",
  );
  assert.equal(
    fetchCalls[2].url,
    "https://lawos.example/api/outlook/smart-alerts/evaluate",
  );
  assert.equal(
    fetchCalls[2].options.headers.authorization,
    "Bearer lawos_session_v1.event-artifact-test",
  );
  assert.equal(fetchCalls[2].options.credentials, "same-origin");
  assert.deepEqual(storageWrites, [{
    key: "lawos_addin_session_token",
    value: "lawos_session_v1.event-artifact-test",
  }]);
  assert.equal(storageWrites.some(({ value }) => value === "entra-event-artifact-token"), false);
});
