import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fallbackHtml, splashHtml, wireSplashToMainWindow } from "../src/main/splash.js";

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

test("startup surfaces embed the existing AMIC Law logo and SUITE Regular", () => {
  const fontDataUrl = "data:font/otf;base64,Zm9udA==";
  const logoDataUrl = "data:image/svg+xml;base64,PHN2Zy8+";
  const source = `${splashHtml(fontDataUrl, logoDataUrl)}\n${fallbackHtml("test", fontDataUrl, logoDataUrl)}`;

  assert.match(source, /@font-face\{font-family:"SUITE Matter"/);
  assert.match(source, /data:font\/otf;base64,Zm9udA==/);
  assert.match(source, /data:image\/svg\+xml;base64,PHN2Zy8\+/);
  assert.match(source, /aria-label="AMIC Law"/);
  assert.doesNotMatch(source, /mark-stroke|#ff2d55|#ffcc00|#00ca72/i);
  assert.doesNotMatch(source, /Pretendard,SUIT|-apple-system|BlinkMacSystemFont|Segoe UI|Avenir Next|SF Pro Rounded|IBM Plex/);
});

test("offline renderer uses bundled Pretendard and SUITE at regular weight", async () => {
  const source = await readFile(new URL("../src/renderer/offline.html", import.meta.url), "utf8");

  assert.match(source, /font-family: "Pretendard Matter", "SUITE Matter", sans-serif;/);
  assert.match(source, /font-family: "SUITE Matter", "Pretendard Matter", sans-serif;/);
  assert.match(source, /Pretendard-Regular\.otf/);
  assert.match(source, /SUITE-Regular\.otf/);
  assert.doesNotMatch(source, /Comfortaa|Avenir Next|SF Pro Rounded|Inter|-apple-system|BlinkMacSystemFont|Segoe UI/);
  const fontWeights = new Set([...source.matchAll(/font-weight:\s*([^;]+);/g)].map((match) => match[1].trim()));
  assert.deepEqual(fontWeights, new Set(["400"]));
  assert.match(source, /font-synthesis:\s*none/);
});

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
