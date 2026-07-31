import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createDesktopInstanceCoordinator } from "../src/main/main.js";

const AUTH_CALLBACK_CHANNEL = "desktop:auth-callback";
const RENDERER_ID = "4f40dbce-3cd6-4d61-a04c-15aa324eb191";

function loadSessionPreload({
  listeners = new Map(),
  rendererId = RENDERER_ID,
  onSend = () => undefined
} = {}) {
  const source = readFileSync(new URL("../src/preload/session.cjs", import.meta.url), "utf8");
  const invocations = [];
  const signals = [];
  let exposed = null;
  vm.runInNewContext(source, {
    process: { env: {} },
    crypto: { randomUUID: () => rendererId },
    require(specifier) {
      assert.equal(specifier, "electron");
      return {
        contextBridge: {
          exposeInMainWorld(name, api) {
            exposed = { name, api };
          },
        },
        ipcRenderer: {
          invoke(channel, payload) {
            invocations.push({ channel, payload });
            return Promise.resolve({ opened: true });
          },
          send(channel, payload) {
            signals.push({ channel, payload });
            onSend(channel, payload);
          },
          on(channel, listener) {
            listeners.set(channel, listener);
          },
          removeListener(channel, listener) {
            if (listeners.get(channel) === listener) listeners.delete(channel);
          },
        },
      };
    },
  });
  return { exposed, invocations, listeners, signals, source };
}

test("session preload exposes a narrow auth callback subscription and drops every other field", () => {
  const { exposed, listeners, signals, source } = loadSessionPreload();
  const received = [];

  assert.equal(exposed.name, "matterSession");
  assert.equal(typeof exposed.api.onAuthCallbackDeepLink, "function");
  const listener = listeners.get(AUTH_CALLBACK_CHANNEL);
  assert.equal(typeof listener, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(signals)), [{
    channel: "desktop:auth-callback:ready",
    payload: { renderer_id: RENDERER_ID }
  }]);

  listener({}, {
    type: "auth_callback",
    routeOnly: false,
    code: "0.ABC_def-123",
    state: "outlook-state:01HQ",
    issuer: "must-not-cross-preload",
    email: "must-not-cross-preload@example.com",
    access_token: "must-not-cross-preload",
  });
  assert.equal(received.length, 0);
  const unsubscribe = exposed.api.onAuthCallbackDeepLink((payload) => received.push(payload));
  assert.equal(received.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(signals[1])), {
    channel: "desktop:auth-callback:acknowledge",
    payload: {
      renderer_id: RENDERER_ID,
      state: "outlook-state:01HQ"
    }
  });
  listener({}, { type: "auth_callback", code: null, state: "outlook-state:01HQ" });
  listener({}, { type: "password_reset_confirm", code: "0.WRONG_type", state: "outlook-state:01HQ" });
  listener({}, { type: "auth_callback", code: "0.LIVE_code-2", state: "outlook-state:live-2" });

  assert.deepEqual(JSON.parse(JSON.stringify(received)), [{
    type: "auth_callback",
    routeOnly: true,
    code: "0.ABC_def-123",
    state: "outlook-state:01HQ",
  }, {
    type: "auth_callback",
    routeOnly: true,
    code: "0.LIVE_code-2",
    state: "outlook-state:live-2",
  }]);
  assert.equal(JSON.stringify(received).includes("issuer"), false);
  assert.equal(JSON.stringify(received).includes("email"), false);
  assert.equal(JSON.stringify(received).includes("access_token"), false);
  assert.doesNotMatch(source, /console\.(?:debug|info|log|warn|error)/);

  unsubscribe();
  listener({}, { type: "auth_callback", code: "0.QUEUED_code-3", state: "outlook-state:queued-3" });
  assert.equal(received.length, 2);
  const unsubscribeAgain = exposed.api.onAuthCallbackDeepLink((payload) => received.push(payload));
  assert.equal(received.length, 3);
  assert.equal(received[2].state, "outlook-state:queued-3");
  unsubscribeAgain();
  assert.equal(listeners.has(AUTH_CALLBACK_CHANNEL), true);
  assert.deepEqual(
    JSON.parse(JSON.stringify(signals.filter((signal) => (
      signal.channel === "desktop:auth-callback:acknowledge"
    )).map((signal) => signal.payload.state))),
    [
      "outlook-state:01HQ",
      "outlook-state:live-2",
      "outlook-state:queued-3"
    ]
  );
});

test("main retains a preload-buffered callback across renderer crash until the new web consumer acknowledges it", () => {
  const handlers = new Map();
  const app = {
    on(eventName, handler) {
      handlers.set(eventName, handler);
    }
  };
  const coordinator = createDesktopInstanceCoordinator({ app, argv: [] });
  let activeListeners = new Map();
  const sent = [];
  coordinator.setActiveWindow({
    webContents: {
      send(channel, payload) {
        sent.push({ channel, payload });
        activeListeners.get(channel)?.({}, payload);
      }
    }
  });
  const routePreloadSignal = (channel, payload) => {
    if (channel === "desktop:auth-callback:ready") {
      coordinator.setAuthCallbackRendererReady(payload?.renderer_id);
    }
    if (channel === "desktop:auth-callback:acknowledge") {
      coordinator.acknowledgeAuthCallback({
        rendererId: payload?.renderer_id,
        state: payload?.state
      });
    }
  };

  const firstListeners = new Map();
  activeListeners = firstListeners;
  loadSessionPreload({
    listeners: firstListeners,
    rendererId: "a443c0b4-467e-4514-8400-58920e99b4a1",
    onSend: routePreloadSignal
  });
  handlers.get("open-url")(
    { preventDefault() {} },
    "matter://auth/callback?code=0.BUFFERED_code-1&state=outlook-state:buffered-before-crash"
  );
  assert.equal(sent.length, 1);
  assert.equal(coordinator.snapshot().pending_deep_link_count, 1);
  assert.equal(coordinator.snapshot().acknowledged_auth_callback_count, 0);

  coordinator.setAuthCallbackRendererNotReady();
  const secondListeners = new Map();
  activeListeners = secondListeners;
  const secondPreload = loadSessionPreload({
    listeners: secondListeners,
    rendererId: "e64ab9d7-755d-48fb-8652-6867e1612917",
    onSend: routePreloadSignal
  });
  assert.equal(sent.length, 2);
  const receivedAfterReload = [];
  secondPreload.exposed.api.onAuthCallbackDeepLink((payload) => receivedAfterReload.push(payload));

  assert.equal(receivedAfterReload.length, 1);
  assert.equal(receivedAfterReload[0].state, "outlook-state:buffered-before-crash");
  assert.equal(coordinator.snapshot().pending_deep_link_count, 0);
  assert.equal(coordinator.snapshot().acknowledged_auth_callback_count, 1);
});

test("preload acknowledges an async web consumer only after callback completion", async () => {
  const { exposed, listeners, signals } = loadSessionPreload();
  let finish;
  const completion = new Promise((resolve) => {
    finish = resolve;
  });
  exposed.api.onAuthCallbackDeepLink(() => completion);
  listeners.get(AUTH_CALLBACK_CHANNEL)?.({}, {
    type: "auth_callback",
    code: "0.ASYNC_code-1",
    state: "outlook-state:async-completion"
  });

  assert.equal(signals.some((signal) => (
    signal.channel === "desktop:auth-callback:acknowledge"
  )), false);
  finish();
  await completion;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(signals.at(-1))), {
    channel: "desktop:auth-callback:acknowledge",
    payload: {
      renderer_id: RENDERER_ID,
      state: "outlook-state:async-completion"
    }
  });
});

test("ES module and packaged CommonJS preloads expose the same auth callback contract", () => {
  const moduleSource = readFileSync(new URL("../src/preload/session.js", import.meta.url), "utf8");
  const packagedSource = readFileSync(new URL("../src/preload/session.cjs", import.meta.url), "utf8");
  const normalize = (source) => source
    .replace(/^import \{ contextBridge, ipcRenderer \} from "electron";\n\n/, "")
    .replace(/^const \{ contextBridge, ipcRenderer \} = require\("electron"\);\n\n/, "")
    .replace(/^export /gm, "")
    .trim();

  assert.equal(normalize(moduleSource), normalize(packagedSource));
});

test("session preload sends the Outlook authorization URL only through its allowlisted IPC command", async () => {
  const { exposed, invocations } = loadSessionPreload();
  const authorizeUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test";

  assert.deepEqual(
    JSON.parse(JSON.stringify(await exposed.api.openOutlookAuthorization(authorizeUrl))),
    { opened: true }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(invocations)), [{
    channel: "desktop:outlook-authorization:open",
    payload: { url: authorizeUrl }
  }]);
});
