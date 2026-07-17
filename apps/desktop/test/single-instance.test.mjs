import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
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
