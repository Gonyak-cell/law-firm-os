import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUTH_CALLBACK_DEEP_LINK_CHANNEL,
  PASSWORD_RESET_DEEP_LINK_CHANNEL,
  acquireDesktopSingleInstance,
  createDesktopInstanceCoordinator,
} from "../src/main/main.js";

const RENDERER_A = "a443c0b4-467e-4514-8400-58920e99b4a1";
const RENDERER_B = "e64ab9d7-755d-48fb-8652-6867e1612917";

function fakeApp({ lock = true } = {}) {
  const handlers = new Map();
  const calls = [];
  return {
    calls,
    handlers,
    requestSingleInstanceLock() {
      calls.push("requestSingleInstanceLock");
      return lock;
    },
    quit() {
      calls.push("quit");
    },
    on(eventName, handler) {
      handlers.set(eventName, handler);
    },
  };
}

function fakeWindow() {
  const calls = [];
  const sent = [];
  let minimized = true;
  return {
    calls,
    sent,
    isMinimized() {
      return minimized;
    },
    restore() {
      minimized = false;
      calls.push("restore");
    },
    show() {
      calls.push("show");
    },
    focus() {
      calls.push("focus");
    },
    webContents: {
      send(channel, payload) {
        sent.push({ channel, payload });
      },
    },
  };
}

test("desktop refuses a second instance before userData or local API initialization", () => {
  const primary = fakeApp({ lock: true });
  assert.equal(acquireDesktopSingleInstance(primary), true);
  assert.deepEqual(primary.calls, ["requestSingleInstanceLock"]);

  const secondary = fakeApp({ lock: false });
  assert.equal(acquireDesktopSingleInstance(secondary), false);
  assert.deepEqual(secondary.calls, ["requestSingleInstanceLock", "quit"]);

  const source = readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");
  const lockIndex = source.indexOf("acquireDesktopSingleInstance(app)");
  assert.ok(lockIndex >= 0);
  assert.ok(lockIndex < source.indexOf("desktopUserDataPath(app)"));
  assert.ok(lockIndex < source.indexOf("await startDesktopLocalApiServer", lockIndex));
});

test("second-instance and open-url share the redacted deep-link queue and focus the primary window", () => {
  const app = fakeApp();
  const firstToken = "abcdefghijklmnopqrstuvwxyzABCDE_123456";
  const secondToken = "abcdefghijklmnopqrstuvwxyzABCDE_654321";
  const thirdToken = "abcdefghijklmnopqrstuvwxyzABCDE_112233";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: ["matter", `matter://password-reset/confirm?token=${firstToken}`],
  });
  const window = fakeWindow();

  const initial = coordinator.setActiveWindow(window);
  assert.deepEqual(initial.map((entry) => entry.intent.token), ["[reset-token-redacted]"]);
  assert.equal(window.sent[0].channel, PASSWORD_RESET_DEEP_LINK_CHANNEL);
  assert.equal(window.sent[0].payload.token, firstToken);

  app.handlers.get("second-instance")({}, ["matter", `matter://password-reset/confirm?token=${secondToken}`]);
  assert.deepEqual(window.calls, ["restore", "show", "focus"]);
  assert.equal(window.sent[1].payload.token, secondToken);

  let prevented = false;
  app.handlers.get("open-url")({ preventDefault: () => { prevented = true; } }, `matter://password-reset/confirm?token=${thirdToken}`);
  assert.equal(prevented, true);
  assert.equal(window.sent[2].payload.token, thirdToken);
  assert.equal(JSON.stringify(coordinator.snapshot()).includes(firstToken), false);
  assert.equal(JSON.stringify(coordinator.snapshot()).includes(secondToken), false);
  assert.equal(JSON.stringify(coordinator.snapshot()).includes(thirdToken), false);
});

test("OAuth callbacks are delivered from startup open-url and second-instance only once per state", () => {
  const app = fakeApp();
  const startupCode = "0.STARTUP_code-123";
  const duplicateCode = "0.REPLAY_code-456";
  const startupState = "outlook-state:startup-01";
  const nextCode = "0.NEXT_code-789";
  const nextState = "outlook-state:next-02";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: ["matter", `matter://auth/callback?code=${startupCode}&state=${startupState}`],
  });
  const window = fakeWindow();

  const beforeSubscription = coordinator.setActiveWindow(window);
  assert.equal(beforeSubscription.length, 0);
  assert.equal(window.sent.length, 0);
  const startup = coordinator.setAuthCallbackRendererReady(RENDERER_A);
  assert.equal(startup.length, 1);
  assert.deepEqual(window.sent[0], {
    channel: AUTH_CALLBACK_DEEP_LINK_CHANNEL,
    payload: {
      type: "auth_callback",
      routeOnly: true,
      code: startupCode,
      state: startupState,
    },
  });
  assert.deepEqual(
    coordinator.acknowledgeAuthCallback({ rendererId: RENDERER_A, state: startupState }),
    { acknowledged: true }
  );

  app.handlers.get("second-instance")({}, [
    "matter",
    `matter://auth/callback?code=${duplicateCode}&state=${startupState}`,
  ]);
  assert.equal(window.sent.length, 1);

  let prevented = false;
  app.handlers.get("open-url")(
    { preventDefault: () => { prevented = true; } },
    `matter://auth/callback?code=${nextCode}&state=${nextState}`,
  );
  assert.equal(prevented, true);
  assert.equal(window.sent.length, 2);
  assert.deepEqual(window.sent[1].payload, {
    type: "auth_callback",
    routeOnly: true,
    code: nextCode,
    state: nextState,
  });
  assert.deepEqual(
    coordinator.acknowledgeAuthCallback({ rendererId: RENDERER_A, state: nextState }),
    { acknowledged: true }
  );

  app.handlers.get("second-instance")({}, [
    "matter",
    `matter://auth/not-callback?code=${nextCode}&state=outlook-state:wrong-path`,
  ]);
  app.handlers.get("open-url")(
    { preventDefault() {} },
    `https://auth/callback?code=${nextCode}&state=outlook-state:wrong-scheme`,
  );

  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending_deep_link_count, 0);
  assert.equal(snapshot.delivered_deep_link_count, 2);
  assert.equal(snapshot.acknowledged_auth_callback_count, 2);
  assert.equal(snapshot.duplicate_auth_callback_count, 1);
  assert.equal(snapshot.rejected_deep_link_count, 2);
  assert.equal(snapshot.auth_callback_renderer_ready, true);
  assert.deepEqual(snapshot.last_intent, {
    type: "auth_callback",
    routeOnly: true,
    code: "[oauth-code-redacted]",
    state: "[oauth-state-redacted]",
  });
  const serializedSnapshot = JSON.stringify(snapshot);
  assert.equal(serializedSnapshot.includes(startupCode), false);
  assert.equal(serializedSnapshot.includes(duplicateCode), false);
  assert.equal(serializedSnapshot.includes(startupState), false);
  assert.equal(serializedSnapshot.includes(nextCode), false);
  assert.equal(serializedSnapshot.includes(nextState), false);
});

test("OAuth callback readiness is retained when preload subscribes before the active window is attached", () => {
  const app = fakeApp();
  const code = "0.EARLY_ready-123";
  const state = "outlook-state:early-ready";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: ["matter", `matter://auth/callback?code=${code}&state=${state}`],
  });
  const window = fakeWindow();

  assert.deepEqual(coordinator.setAuthCallbackRendererReady(RENDERER_A), []);
  assert.equal(coordinator.snapshot().auth_callback_renderer_ready, true);
  const delivered = coordinator.setActiveWindow(window);

  assert.equal(delivered.length, 1);
  assert.equal(window.sent[0].channel, AUTH_CALLBACK_DEEP_LINK_CHANNEL);
  assert.deepEqual(window.sent[0].payload, {
    type: "auth_callback",
    routeOnly: true,
    code,
    state,
  });
});

test("OAuth callbacks return to the queue while the same renderer reloads or crashes", () => {
  const app = fakeApp();
  const coordinator = createDesktopInstanceCoordinator({ app, argv: [] });
  const window = fakeWindow();
  const code = "0.RELOAD_code-123";
  const state = "outlook-state:reload";
  coordinator.setActiveWindow(window);
  coordinator.setAuthCallbackRendererReady(RENDERER_A);
  coordinator.setAuthCallbackRendererNotReady();

  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?code=${code}&state=${state}`,
  );
  assert.equal(window.sent.length, 0);
  assert.equal(coordinator.snapshot().pending_deep_link_count, 1);
  assert.equal(coordinator.snapshot().auth_callback_renderer_ready, false);

  coordinator.setAuthCallbackRendererReady(RENDERER_B);
  assert.equal(window.sent.length, 1);
  assert.equal(window.sent[0].payload.state, state);
  assert.equal(coordinator.snapshot().pending_deep_link_count, 1);
  assert.deepEqual(
    coordinator.acknowledgeAuthCallback({ rendererId: RENDERER_B, state }),
    { acknowledged: true }
  );
  assert.equal(coordinator.snapshot().pending_deep_link_count, 0);
});

test("OAuth callback delivered before web subscription is redelivered after renderer loss until current-renderer acknowledgement", () => {
  const app = fakeApp();
  const coordinator = createDesktopInstanceCoordinator({ app, argv: [] });
  const window = fakeWindow();
  const state = "outlook-state:preload-buffered";
  coordinator.setActiveWindow(window);
  coordinator.setAuthCallbackRendererReady(RENDERER_A);

  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?code=0.BUFFERED_code-123&state=${state}`,
  );
  assert.equal(window.sent.length, 1);
  assert.equal(coordinator.snapshot().pending_deep_link_count, 1);

  coordinator.setAuthCallbackRendererNotReady();
  assert.deepEqual(
    coordinator.acknowledgeAuthCallback({ rendererId: RENDERER_A, state }),
    { acknowledged: false }
  );
  coordinator.setAuthCallbackRendererReady(RENDERER_B);
  assert.equal(window.sent.length, 2);
  assert.equal(window.sent[1].payload.state, state);
  assert.deepEqual(
    coordinator.acknowledgeAuthCallback({ rendererId: RENDERER_A, state }),
    { acknowledged: false }
  );
  assert.deepEqual(
    coordinator.acknowledgeAuthCallback({ rendererId: RENDERER_B, state }),
    { acknowledged: true }
  );
  assert.equal(coordinator.snapshot().pending_deep_link_count, 0);
  assert.equal(coordinator.snapshot().delivered_deep_link_count, 2);
  assert.equal(coordinator.snapshot().acknowledged_auth_callback_count, 1);
});

test("OAuth callback replay remains blocked after the bounded state guard reaches capacity", () => {
  const app = fakeApp();
  const coordinator = createDesktopInstanceCoordinator({ app, argv: [] });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);
  coordinator.setAuthCallbackRendererReady(RENDERER_A);

  const firstState = "outlook-state:bounded-000";
  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?code=0.CODE_000&state=${firstState}`,
  );
  for (let index = 1; index <= 256; index += 1) {
    app.handlers.get("open-url")(
      { preventDefault() {} },
      `matter://auth/callback?code=0.CODE_${String(index).padStart(3, "0")}&state=outlook-state:bounded-${String(index).padStart(3, "0")}`,
    );
  }
  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?code=0.REPLAY_000&state=${firstState}`,
  );

  assert.equal(window.sent.filter((entry) => entry.payload.state === firstState).length, 1);
  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.delivered_deep_link_count, 256);
  assert.equal(snapshot.auth_callback_limit_rejection_count, 1);
  assert.equal(snapshot.duplicate_auth_callback_count, 1);
});
