import assert from "node:assert/strict";
import test from "node:test";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

import { AUTH_STATE } from "../src/addin-auth.js";
import { createOutlookAuthRuntime } from "../src/outlook-auth-runtime.js";
import { createOutlookTaskPaneRuntime } from "../src/outlook-taskpane-runtime.js";

function mailbox(item) {
  return {
    context: { mailbox: { item } },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
}

function item(itemId, subject) {
  return {
    itemId,
    internetMessageId: `<${itemId}@example.test>`,
    conversationId: `conversation-${itemId}`,
    subject,
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("a 401 followed by silent interaction-required recovery exposes login state", async () => {
  let recoveryOptions;
  const interactionRequired = Object.assign(
    new Error("LAWOS_INTERACTION_REQUIRED"),
    { safe_error_code: "LAWOS_INTERACTION_REQUIRED" },
  );
  const runtime = createOutlookTaskPaneRuntime({
    Office: mailbox(item("office-auth", "auth")),
    windowObject: {},
    authenticateOnStart: false,
    initialAuthState: AUTH_STATE.authenticated,
    resolveRestId: ({ Office }) => ({ rest_message_id: Office.context.mailbox.item.itemId }),
    readBody: async () => "auth",
    readClassification: async () => ({}),
    acquireLawosSession: async (options) => {
      recoveryOptions = options;
      throw interactionRequired;
    },
    actionHandler: ({ requestJson }) => requestJson("/api/outlook/inquiries", { method: "POST" }),
    requestJson: async () => {
      throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
        status: 401,
        safe_error_code: "AUTH_SESSION_INVALID",
      });
    },
  });

  await runtime.refreshItem();
  await runtime.runAction("new");

  assert.deepEqual(recoveryOptions, { interactive: false, force: true });
  assert.equal(runtime.getState().authState, AUTH_STATE.loginRequired);
  assert.equal(runtime.getState().authError, interactionRequired);
  assert.equal(runtime.getState().busy, "");
  runtime.dispose();
});

test("non-override inquiry-list requestJson converges expired sessions to login state", async () => {
  const office = {
    context: {
      requirements: { isSetSupported: () => true },
      mailbox: {},
    },
  };
  let storedToken = "lawos_session_v1.expired-inquiry-list";
  const fetchCalls = [];
  const windowObject = {
    location: { origin: "https://lawos.example" },
    sessionStorage: {
      getItem: () => storedToken,
      setItem: (_key, value) => { storedToken = value; },
      removeItem: () => { storedToken = ""; },
    },
    nestedAppAuthBridge: {},
  };
  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });
    if (url.endsWith("/api/auth/office-sso/config")) {
      return new Response(JSON.stringify({
        client_id: "22222222-2222-4222-8222-222222222222",
        tenant_id: "11111111-1111-4111-8111-111111111111",
        api_scope: "api://22222222-2222-4222-8222-222222222222/access_as_user",
        callback_uri: "https://lawos.example/api/outlook/connection/callback",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ safe_error_codes: ["AUTH_SESSION_INVALID"] }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  };
  const runtime = createOutlookTaskPaneRuntime({
    Office: office,
    windowObject,
    fetchImpl,
    authenticateOnStart: false,
    initialAuthState: AUTH_STATE.authenticated,
    createPca: async () => ({
      getActiveAccount: () => null,
      acquireTokenSilent: async () => { throw new InteractionRequiredAuthError("interaction_required"); },
    }),
  });
  const states = [];
  runtime.subscribe((state) => states.push(state));
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  try {
    await assert.rejects(
      runtime.requestJson("/api/outlook/inquiries?limit=50"),
      (error) => error?.safe_error_code === "LAWOS_INTERACTION_REQUIRED",
    );
    await flush();
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }

  assert.equal(unhandled.length, 0);
  assert.equal(runtime.getState().authState, AUTH_STATE.loginRequired);
  assert.equal(runtime.getState().authError?.safe_error_code, "LAWOS_INTERACTION_REQUIRED");
  assert.ok(states.some(({ authState }) => authState === AUTH_STATE.loginRequired));
  assert.equal(fetchCalls.filter(({ url }) => url.endsWith("/api/outlook/inquiries?limit=50")).length, 1);
  runtime.dispose();
});

test("a non-interaction NAA failure stays transient and never calls acquireTokenPopup", async () => {
  const networkError = Object.assign(new Error("provider network detail"), { status: 503 });
  let popupCount = 0;
  const windowObject = {
    location: { origin: "https://lawos.example" },
    nestedAppAuthBridge: {},
    sessionStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  };
  const auth = createOutlookAuthRuntime({
    windowObject,
    Office: {
      context: { requirements: { isSetSupported: () => true } },
    },
    fetchImpl: async () => new Response(JSON.stringify({
      client_id: "22222222-2222-4222-8222-222222222222",
      tenant_id: "11111111-1111-4111-8111-111111111111",
      api_scope: "api://22222222-2222-4222-8222-222222222222/access_as_user",
      callback_uri: "https://lawos.example/api/outlook/connection/callback",
    }), { status: 200, headers: { "content-type": "application/json" } }),
    createPca: async () => ({
      getActiveAccount: () => null,
      acquireTokenSilent: async () => { throw networkError; },
      acquireTokenPopup: async () => { popupCount += 1; return null; },
    }),
  });

  await assert.rejects(
    auth.acquireLawosSession({ interactive: false, force: true }),
    (error) => error === networkError,
  );
  assert.equal(popupCount, 0);
});

test("one business-action 401 performs at most one silent recovery and never replays the action body", async () => {
  let storedToken = "lawos_session_v1.initial-action";
  let recoveryCount = 0;
  let requestCount = 0;
  let actionCount = 0;
  const office = mailbox(item("office-one-recovery", "one recovery"));
  const runtime = createOutlookTaskPaneRuntime({
    Office: office,
    windowObject: {
      sessionStorage: {
        getItem: () => storedToken,
        setItem: (_key, value) => { storedToken = value; },
        removeItem: () => { storedToken = ""; },
      },
    },
    authenticateOnStart: false,
    initialAuthState: AUTH_STATE.authenticated,
    resolveRestId: ({ Office }) => ({ rest_message_id: Office.context.mailbox.item.itemId }),
    readBody: async () => "one recovery",
    readClassification: async () => ({}),
    acquireLawosSession: async () => {
      recoveryCount += 1;
      return {
        authenticated: true,
        session_token: `lawos_session_v1.recovered-${recoveryCount}`,
      };
    },
    actionHandler: async ({ requestJson }) => {
      actionCount += 1;
      return requestJson("/api/outlook/inquiries", { method: "POST" });
    },
    requestJson: async () => {
      requestCount += 1;
      throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
        status: 401,
        safe_error_code: "AUTH_SESSION_INVALID",
      });
    },
  });

  await runtime.refreshItem();
  assert.equal(await runtime.runAction("new"), null);
  assert.deepEqual({ recoveryCount, requestCount, actionCount }, {
    recoveryCount: 1,
    requestCount: 2,
    actionCount: 1,
  });
  assert.equal(runtime.getState().authState, AUTH_STATE.loginRequired);
  runtime.dispose();
});
