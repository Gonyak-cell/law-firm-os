import assert from "node:assert/strict";
import test from "node:test";
import { wireSplashToMainWindow } from "../src/main/splash.js";

function makeFakeWindow() {
  const handlers = new Map();
  return {
    closed: false,
    shown: false,
    loadedURL: null,
    webContents: {
      once(eventName, handler) {
        handlers.set(eventName, handler);
      }
    },
    once(eventName, handler) {
      handlers.set(eventName, handler);
    },
    emit(eventName, ...args) {
      return handlers.get(eventName)?.(...args);
    },
    emitWebContents(eventName, ...args) {
      return handlers.get(eventName)?.(...args);
    },
    close() {
      this.closed = true;
    },
    show() {
      this.shown = true;
    },
    async loadURL(url) {
      this.loadedURL = url;
    },
    isDestroyed() {
      return this.closed;
    }
  };
}

test("splash closes only after main renderer ready", () => {
  const splashWindow = makeFakeWindow();
  const mainWindow = makeFakeWindow();
  let timeoutCallback;
  let clearedTimer = false;

  const handoff = wireSplashToMainWindow({
    splashWindow,
    mainWindow,
    setTimeoutFn: (callback) => {
      timeoutCallback = callback;
      return "timer-1";
    },
    clearTimeoutFn: (timer) => {
      if (timer === "timer-1") clearedTimer = true;
    }
  });

  assert.equal(splashWindow.closed, false);
  assert.equal(handoff.state.handedOff, false);
  assert.equal(typeof timeoutCallback, "function");

  mainWindow.emit("ready-to-show");

  assert.equal(splashWindow.closed, true);
  assert.equal(handoff.state.handedOff, true);
  assert.equal(clearedTimer, true);
});

test("splash shows bounded fallback on startup timeout", async () => {
  const splashWindow = makeFakeWindow();
  const mainWindow = makeFakeWindow();
  let timeoutCallback;

  const handoff = wireSplashToMainWindow({
    splashWindow,
    mainWindow,
    setTimeoutFn: (callback) => {
      timeoutCallback = callback;
      return "timer-2";
    },
    clearTimeoutFn: () => {}
  });

  await timeoutCallback();

  assert.equal(splashWindow.closed, false);
  assert.equal(splashWindow.shown, true);
  assert.match(decodeURIComponent(splashWindow.loadedURL), /시작 화면을 준비하고 있습니다/);
  assert.doesNotMatch(decodeURIComponent(splashWindow.loadedURL), /Offline startup fallback|startup-timeout/);
  assert.equal(handoff.state.fallbackActive, true);
});

test("splash shows fallback on renderer load failure", async () => {
  const splashWindow = makeFakeWindow();
  const mainWindow = makeFakeWindow();

  wireSplashToMainWindow({
    splashWindow,
    mainWindow,
    setTimeoutFn: () => "timer-3",
    clearTimeoutFn: () => {}
  });

  await mainWindow.emitWebContents("did-fail-load", {}, -102);

  assert.equal(splashWindow.closed, false);
  assert.match(decodeURIComponent(splashWindow.loadedURL), /시작 화면을 준비하고 있습니다/);
  assert.doesNotMatch(decodeURIComponent(splashWindow.loadedURL), /did-fail-load:-102/);
});
