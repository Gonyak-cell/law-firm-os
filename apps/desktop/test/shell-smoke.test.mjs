import assert from "node:assert/strict";
import test from "node:test";
import { APPROVED_DEV_RENDERER_URL } from "../src/main/origin-policy.js";
import { startDesktopShell } from "../src/main/main.js";

class FakeBrowserWindow {
  constructor(options) {
    this.options = options;
    this.loadedURL = null;
    this.readyEvent = null;
    this.shown = false;
    this.navigationHandlers = new Map();
    this.windowOpenHandler = null;
    this.webContents = {
      on: (eventName, handler) => {
        this.navigationHandlers.set(eventName, handler);
      },
      setWindowOpenHandler: (handler) => {
        this.windowOpenHandler = handler;
      }
    };
  }

  once(eventName, handler) {
    this.readyEvent = { eventName, handler };
  }

  show() {
    this.shown = true;
  }

  async loadURL(url) {
    this.loadedURL = url;
  }
}

test("desktop shell starts with approved renderer target and hardened options", async () => {
  const { window, target } = await startDesktopShell({ BrowserWindowConstructor: FakeBrowserWindow });

  assert.equal(target, APPROVED_DEV_RENDERER_URL);
  assert.equal(window.loadedURL, APPROVED_DEV_RENDERER_URL);
  assert.equal(window.options.webPreferences.nodeIntegration, false);
  assert.equal(window.options.webPreferences.contextIsolation, true);
  assert.equal(window.options.webPreferences.sandbox, true);
  assert.equal(window.options.webPreferences.webSecurity, true);
  assert.equal(window.readyEvent.eventName, "ready-to-show");

  window.readyEvent.handler();
  assert.equal(window.shown, true);
});

test("desktop shell blocks unapproved renderer target and remote navigation", async () => {
  await assert.rejects(
    () =>
      startDesktopShell({
        BrowserWindowConstructor: FakeBrowserWindow,
        rendererUrl: "https://mater.example.com"
      }),
    /Blocked unapproved desktop renderer origin/
  );

  const { window } = await startDesktopShell({ BrowserWindowConstructor: FakeBrowserWindow });
  let prevented = false;
  window.navigationHandlers.get("will-navigate")(
    { preventDefault: () => { prevented = true; } },
    "https://mater.example.com"
  );
  assert.equal(prevented, true);
  assert.deepEqual(window.windowOpenHandler({ url: "https://mater.example.com" }), { action: "deny" });
});
