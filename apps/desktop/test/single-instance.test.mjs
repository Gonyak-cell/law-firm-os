import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OUTLOOK_CALLBACK_TTL_MS,
  OUTLOOK_CONNECTION_COMPLETE_ROUTE,
  OUTLOOK_CONNECTION_RESULT_CHANNEL,
  PASSWORD_RESET_DEEP_LINK_CHANNEL,
  acquireDesktopSingleInstance,
  createDesktopInstanceCoordinator,
} from "../src/main/main.js";

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

test("OAuth callback completion stays in main, uses the exact route, focuses open-url, and emits only a safe result", async () => {
  const app = fakeApp();
  const calls = [];
  let lifecycleRefreshes = 0;
  const code = "0.MAIN_ONLY_code-123";
  const state = "outlook-state:main-only-01";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    getAuthCoordinator: () => ({
      async api(input) {
        calls.push(input);
        return {
          http_status: 200,
          body: {
            outcome: "ok",
            employee_id: "emp_amic_jwsuh",
            connection: {
              connection_state: "connected",
              safe_error_code: null,
              email: "must-not-render@example.com",
              access_token: "must-not-render",
            },
          },
        };
      },
      async refreshOutlookLifecycle() {
        lifecycleRefreshes += 1;
        return { state: "ready" };
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);

  let prevented = false;
  app.handlers.get("open-url")(
    { preventDefault: () => { prevented = true; } },
    `matter://auth/callback?code=${code}&state=${state}&session_state=main-only-session-secret`,
  );
  await coordinator.retryPendingAuthCallbacks();

  assert.equal(prevented, true);
  assert.deepEqual(window.calls, ["restore", "show", "focus"]);
  assert.deepEqual(calls, [{
    path: OUTLOOK_CONNECTION_COMPLETE_ROUTE,
    method: "POST",
    body: JSON.stringify({ authorization_code: code, state_ref: state }),
  }]);
  assert.equal(lifecycleRefreshes, 1);
  assert.deepEqual(window.sent, [{
    channel: OUTLOOK_CONNECTION_RESULT_CHANNEL,
    payload: {
      type: "outlook_connection_result",
      status: "connected",
      http_status: 200,
      safe_error_code: null,
      employee_id: "emp_amic_jwsuh",
      connection_state: "connected",
    },
  }]);
  const serializedResult = JSON.stringify(window.sent[0]);
  assert.equal(serializedResult.includes(code), false);
  assert.equal(serializedResult.includes(state), false);
  assert.equal(serializedResult.includes("main-only-session-secret"), false);
  assert.equal(serializedResult.includes("must-not-render"), false);

  app.handlers.get("second-instance")({}, [
    "matter",
    `matter://auth/callback?code=0.REPLAY_code-456&state=${state}`,
  ]);
  await coordinator.retryPendingAuthCallbacks();
  assert.equal(calls.length, 1);
  assert.equal(lifecycleRefreshes, 1);
  assert.equal(window.sent.length, 1);

  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending_auth_callback_count, 0);
  assert.equal(snapshot.completed_auth_callback_count, 1);
  assert.equal(snapshot.duplicate_auth_callback_count, 1);
  assert.ok(snapshot.auth_callback_phase_trace.length > 0);
  assert.ok(snapshot.auth_callback_phase_trace.every((entry) => (
    Object.keys(entry).sort().join(",") === "phase,state_fingerprint,timestamp"
  )));
  const serializedSnapshot = JSON.stringify(snapshot);
  for (const secret of [code, state, "0.REPLAY_code-456", "main-only-session-secret", "must-not-render@example.com"]) {
    assert.equal(serializedSnapshot.includes(secret), false);
  }
});

test("startup OAuth callbacks wait for the active window and still complete exactly once", async () => {
  const app = fakeApp();
  const calls = [];
  const code = "0.STARTUP_code-123";
  const state = "outlook-state:startup-01";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: ["matter", `matter://auth/callback?code=${code}&state=${state}`],
    getAuthCoordinator: () => ({
      async api(input) {
        calls.push(input);
        return {
          http_status: 200,
          body: { connection: { employee_id: "emp_startup", connection_state: "connected" } },
        };
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });
  const window = fakeWindow();

  assert.equal(calls.length, 0);
  coordinator.setActiveWindow(window);
  await coordinator.retryPendingAuthCallbacks();

  assert.equal(calls.length, 1);
  assert.equal(window.sent.length, 1);
  assert.equal(window.sent[0].channel, OUTLOOK_CONNECTION_RESULT_CHANNEL);
  assert.equal(window.sent[0].payload.status, "connected");
  assert.equal(coordinator.snapshot().pending_auth_callback_count, 0);
});

test("OAuth access_denied is terminal, sanitized, focused, and never sent to the API", async () => {
  const app = fakeApp();
  const apiCalls = [];
  const state = "outlook-state:cancelled-01";
  const description = "User cancelled with private details";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    getAuthCoordinator: () => ({
      async api(input) {
        apiCalls.push(input);
        throw new Error("access_denied must not call the API");
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);

  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?error=access_denied&error_description=${encodeURIComponent(description)}&state=${state}`,
  );
  await coordinator.retryPendingAuthCallbacks();

  assert.deepEqual(apiCalls, []);
  assert.deepEqual(window.calls, ["restore", "show", "focus"]);
  assert.deepEqual(window.sent, [{
    channel: OUTLOOK_CONNECTION_RESULT_CHANNEL,
    payload: {
      type: "outlook_connection_result",
      status: "error",
      http_status: 0,
      safe_error_code: "OUTLOOK_AUTHORIZATION_DENIED",
    },
  }]);
  const serialized = JSON.stringify({ sent: window.sent, snapshot: coordinator.snapshot() });
  assert.equal(serialized.includes(state), false);
  assert.equal(serialized.includes(description), false);
  assert.equal(coordinator.snapshot().pending_auth_callback_count, 0);
});

test("startup OAuth access_denied purges raw state before a renderer window exists", async () => {
  const app = fakeApp();
  const state = "outlook-state:startup-cancelled-01";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: ["matter", `matter://auth/callback?error=access_denied&state=${state}`],
    getAuthCoordinator: () => ({
      async api() {
        throw new Error("access_denied must not call the API");
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });

  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending_auth_callback_count, 0);
  assert.equal(snapshot.pending_outlook_result_count, 1);
  assert.equal(snapshot.terminal_auth_callback_count, 1);
  assert.equal(JSON.stringify(snapshot).includes(state), false);
});

test("OAuth callback retries transient and session-required responses until connected", async () => {
  const app = fakeApp();
  const responses = [
    { http_status: 503, body: { safe_error_code: "OUTLOOK_PROVIDER_UNAVAILABLE" } },
    { http_status: 401, body: { safe_error_code: "AUTH_SESSION_REQUIRED" } },
    { http_status: 409, body: { safe_error_code: "OUTLOOK_AUTHORIZATION_IN_PROGRESS" } },
    {
      http_status: 200,
      body: { connection: { employee_id: "emp_retry", connection_state: "connected" } },
    },
  ];
  let calls = 0;
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    getAuthCoordinator: () => ({
      async api() {
        const response = responses[Math.min(calls, responses.length - 1)];
        calls += 1;
        return response;
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);
  app.handlers.get("open-url")(
    { preventDefault() {} },
    "matter://auth/callback?code=0.RETRY_code-123&state=outlook-state:retry-01",
  );

  await coordinator.retryPendingAuthCallbacks();
  await coordinator.retryPendingAuthCallbacks();
  await coordinator.retryPendingAuthCallbacks();
  await coordinator.retryPendingAuthCallbacks();

  assert.equal(calls, 4);
  assert.deepEqual(window.sent.map(({ payload }) => payload.status), [
    "retryable",
    "session_required",
    "retryable",
    "connected",
  ]);
  assert.equal(coordinator.snapshot().pending_auth_callback_count, 0);
});

test("OAuth account mismatch is terminal instead of being retried as a missing session", async () => {
  const app = fakeApp();
  let calls = 0;
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    getAuthCoordinator: () => ({
      async api() {
        calls += 1;
        return {
          http_status: 403,
          body: { safe_error_code: "OUTLOOK_ACCOUNT_MISMATCH" },
        };
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);
  app.handlers.get("open-url")(
    { preventDefault() {} },
    "matter://auth/callback?code=0.MISMATCH_code-123&state=outlook-state:mismatch-01",
  );
  await coordinator.retryPendingAuthCallbacks();

  assert.equal(calls, 1);
  assert.equal(window.sent.at(-1).payload.status, "error");
  assert.equal(window.sent.at(-1).payload.safe_error_code, "OUTLOOK_ACCOUNT_MISMATCH");
  assert.equal(coordinator.snapshot().pending_auth_callback_count, 0);
});

test("OAuth callback TTL purges retryable raw material and emits a terminal safe expiry", async () => {
  const app = fakeApp();
  let now = 1_000;
  let calls = 0;
  const code = "0.TTL_code-123";
  const state = "outlook-state:ttl-01";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    now: () => now,
    getAuthCoordinator: () => ({
      async api() {
        calls += 1;
        return { http_status: 503, body: { safe_error_code: "OUTLOOK_PROVIDER_UNAVAILABLE" } };
      },
    }),
    setTimeoutImpl: () => ({ unref() {} }),
  });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);
  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?code=${code}&state=${state}`,
  );
  await coordinator.retryPendingAuthCallbacks();
  assert.equal(calls, 1);
  assert.equal(coordinator.snapshot().pending_auth_callback_count, 1);

  now += OUTLOOK_CALLBACK_TTL_MS + 1;
  await coordinator.retryPendingAuthCallbacks();

  assert.equal(calls, 1);
  assert.equal(coordinator.snapshot().pending_auth_callback_count, 0);
  assert.equal(window.sent.at(-1).payload.status, "expired");
  assert.equal(window.sent.at(-1).payload.safe_error_code, "OUTLOOK_OAUTH_CALLBACK_EXPIRED");
  const serialized = JSON.stringify(coordinator.snapshot());
  assert.equal(serialized.includes(code), false);
  assert.equal(serialized.includes(state), false);
});

test("OAuth callback absolute TTL purges raw material while the API request is still pending", () => {
  const app = fakeApp();
  const scheduled = [];
  let now = 1_000;
  const code = "0.HUNG_code-123";
  const state = "outlook-state:hung-01";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    now: () => now,
    getAuthCoordinator: () => ({ api: () => new Promise(() => {}) }),
    setTimeoutImpl(callback, delay) {
      const timer = { callback, delay, unref() {} };
      scheduled.push(timer);
      return timer;
    },
  });
  const window = fakeWindow();
  coordinator.setActiveWindow(window);
  app.handlers.get("open-url")(
    { preventDefault() {} },
    `matter://auth/callback?code=${code}&state=${state}`,
  );

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, OUTLOOK_CALLBACK_TTL_MS);
  now += OUTLOOK_CALLBACK_TTL_MS;
  scheduled[0].callback();

  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending_auth_callback_count, 0);
  assert.equal(window.sent.at(-1).payload.status, "expired");
  assert.equal(JSON.stringify(snapshot).includes(code), false);
  assert.equal(JSON.stringify(snapshot).includes(state), false);
});

test("startup OAuth callback cannot remain queued beyond the ten-minute TTL without a window", async () => {
  const app = fakeApp();
  const scheduled = [];
  let now = 1_000;
  const code = "0.STARTUP_TTL_code-123";
  const state = "outlook-state:startup-ttl-01";
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: ["matter", `matter://auth/callback?code=${code}&state=${state}`],
    now: () => now,
    getAuthCoordinator: () => ({
      async api() {
        throw new Error("callback without a window must not call the API");
      },
    }),
    setTimeoutImpl(callback, delay) {
      const timer = { callback, delay, unref() {} };
      scheduled.push(timer);
      return timer;
    },
  });

  assert.equal(coordinator.snapshot().pending_auth_callback_count, 1);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, OUTLOOK_CALLBACK_TTL_MS);
  now += OUTLOOK_CALLBACK_TTL_MS;
  scheduled[0].callback();
  await coordinator.retryPendingAuthCallbacks();

  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending_auth_callback_count, 0);
  assert.equal(snapshot.pending_outlook_result_count, 1);
  assert.equal(JSON.stringify(snapshot).includes(code), false);
  assert.equal(JSON.stringify(snapshot).includes(state), false);
});

test("OAuth completion mapping prioritizes expired state and fails closed on non-connected 2xx", async () => {
  const scenarios = [
    {
      state: "outlook-state:server-expired",
      response: { http_status: 503, body: { safe_error_code: "OUTLOOK_OAUTH_STATE_EXPIRED" } },
      expectedStatus: "expired",
    },
    {
      state: "outlook-state:not-connected",
      response: { http_status: 200, body: { connection: { connection_state: "consent_pending" } } },
      expectedStatus: "error",
    },
  ];

  for (const scenario of scenarios) {
    const app = fakeApp();
    const coordinator = createDesktopInstanceCoordinator({
      app,
      argv: [],
      getAuthCoordinator: () => ({ api: async () => scenario.response }),
      setTimeoutImpl: () => ({ unref() {} }),
    });
    const window = fakeWindow();
    coordinator.setActiveWindow(window);
    app.handlers.get("open-url")(
      { preventDefault() {} },
      `matter://auth/callback?code=0.MAPPING_code-123&state=${scenario.state}`,
    );
    await coordinator.retryPendingAuthCallbacks();

    assert.equal(window.sent.at(-1).payload.status, scenario.expectedStatus);
    assert.equal(coordinator.snapshot().pending_auth_callback_count, 0);
  }
});

test("OAuth callback queue remains bounded and rejects overflow without retaining raw values", () => {
  const app = fakeApp();
  const coordinator = createDesktopInstanceCoordinator({
    app,
    argv: [],
    getAuthCoordinator: () => null,
    setTimeoutImpl: () => ({ unref() {} }),
  });

  for (let index = 0; index <= 256; index += 1) {
    app.handlers.get("open-url")(
      { preventDefault() {} },
      `matter://auth/callback?code=0.CODE_${String(index).padStart(3, "0")}&state=outlook-state:bounded-${String(index).padStart(3, "0")}`,
    );
  }

  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending_auth_callback_count, 256);
  assert.equal(snapshot.auth_callback_limit_rejection_count, 1);
  assert.ok(snapshot.auth_callback_phase_trace.length <= 128);
  assert.equal(JSON.stringify(snapshot).includes("0.CODE_000"), false);
  assert.equal(JSON.stringify(snapshot).includes("outlook-state:bounded-000"), false);
});
