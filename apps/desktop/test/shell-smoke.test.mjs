import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { APPROVED_DEV_RENDERER_URL } from "../src/main/origin-policy.js";
import {
  PASSWORD_RESET_DEEP_LINK_CHANNEL,
  collectMatterDeepLinkArgs,
  configureDesktopAppIcon,
  desktopPreloadPath,
  desktopWindowIconPath,
  isMainEntryPoint,
  passwordResetDeepLinkIntent,
  packagedRendererUrl,
  sendPasswordResetDeepLink,
  startDesktopShell
} from "../src/main/main.js";

class FakeBrowserWindow {
  constructor(options) {
    this.options = options;
    this.loadedURL = null;
    this.readyEvent = null;
    this.webContentsReadyEvent = null;
    this.shown = false;
    this.focused = false;
    this.navigationHandlers = new Map();
    this.sentMessages = [];
    this.windowOpenHandler = null;
    this.webContents = {
      once: (eventName, handler) => {
        this.webContentsReadyEvent = { eventName, handler };
      },
      on: (eventName, handler) => {
        this.navigationHandlers.set(eventName, handler);
      },
      send: (channel, payload) => {
        this.sentMessages.push({ channel, payload });
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

  focus() {
    this.focused = true;
  }

  async loadURL(url) {
    this.loadedURL = url;
  }
}

test("desktop shell starts with packaged renderer target, preload, and hardened options", async () => {
  const { window, target } = await startDesktopShell({ BrowserWindowConstructor: FakeBrowserWindow });

  assert.equal(target, packagedRendererUrl());
  assert.equal(window.loadedURL, packagedRendererUrl());
  assert.equal(window.options.webPreferences.nodeIntegration, false);
  assert.equal(window.options.webPreferences.contextIsolation, true);
  assert.equal(window.options.webPreferences.sandbox, true);
  assert.equal(window.options.webPreferences.webSecurity, true);
  assert.equal(window.options.webPreferences.preload, desktopPreloadPath());
  assert.equal(window.options.icon, desktopWindowIconPath());
  assert.equal(window.readyEvent.eventName, "ready-to-show");
  assert.equal(window.webContentsReadyEvent.eventName, "did-finish-load");

  window.readyEvent.handler();
  assert.equal(window.shown, true);
  assert.equal(window.focused, true);
});

test("desktop shell hands password reset deep link intent to renderer without exposing it in return value", async () => {
  const token = "abcdefghijklmnopqrstuvwxyzABCDE_123456";
  const { window, initialDeepLink } = await startDesktopShell({
    BrowserWindowConstructor: FakeBrowserWindow,
    initialDeepLinkUrl: `matter://password-reset/confirm?token=${token}`
  });

  assert.equal(initialDeepLink.sent, true);
  assert.equal(initialDeepLink.intent.token, "[reset-token-redacted]");
  assert.deepEqual(window.sentMessages, [
    {
      channel: PASSWORD_RESET_DEEP_LINK_CHANNEL,
      payload: {
        type: "password_reset_confirm",
        routeOnly: true,
        token
      }
    }
  ]);
});

test("desktop deep link helpers ignore non-reset routes and collect matter argv URLs", () => {
  const token = "abcdefghijklmnopqrstuvwxyzABCDE_123456";
  assert.equal(passwordResetDeepLinkIntent("matter://matter/MAT-248"), null);
  assert.equal(passwordResetDeepLinkIntent("https://example.com"), null);
  assert.deepEqual(passwordResetDeepLinkIntent(`matter://password-reset/confirm?token=${token}`), {
    type: "password_reset_confirm",
    routeOnly: true,
    token
  });
  assert.deepEqual(collectMatterDeepLinkArgs(["matter", "--flag", `matter://password-reset/confirm?token=${token}`]), [
    `matter://password-reset/confirm?token=${token}`
  ]);
  assert.deepEqual(sendPasswordResetDeepLink(null, "matter://matter/MAT-248"), {
    sent: false,
    reason: "not_password_reset_deep_link"
  });
});

test("desktop shell can still target the approved local dev renderer when explicitly requested", async () => {
  const { window, target } = await startDesktopShell({
    BrowserWindowConstructor: FakeBrowserWindow,
    rendererUrl: APPROVED_DEV_RENDERER_URL
  });

  assert.equal(target, APPROVED_DEV_RENDERER_URL);
  assert.equal(window.loadedURL, APPROVED_DEV_RENDERER_URL);
});

test("desktop app configures the macOS Dock icon from the packaged matter mark", () => {
  const calls = [];
  configureDesktopAppIcon({
    dock: {
      setIcon(iconPath) {
        calls.push(iconPath);
      }
    }
  });

  assert.deepEqual(calls, [desktopWindowIconPath()]);
});

test("macOS app bundle uses matter.icns instead of inherited Electron icon metadata", () => {
  const macBuildSource = readFileSync(new URL("../../../scripts/build-matter-desktop-mac.mjs", import.meta.url), "utf8");

  assert.match(macBuildSource, /packagedIconFile\s*=\s*"matter\.icns"/);
  assert.match(macBuildSource, /Set :CFBundleIconFile/);
  assert.match(macBuildSource, /CFBundleIconFile \$\{packagedIconFile\}/);
  assert.match(macBuildSource, /rm\(join\(targetResourcesDir,\s*"electron\.icns"\)/);
  assert.match(macBuildSource, /CFBundleURLTypes/);
  assert.match(macBuildSource, /CFBundleURLSchemes:0 string matter/);
  assert.doesNotMatch(macBuildSource, /packagedIconPath\s*=\s*join\(resourcesDir,\s*"electron\.icns"\)/);
});

test("desktop shell blocks unapproved renderer target and remote navigation", async () => {
  await assert.rejects(
    () =>
      startDesktopShell({
        BrowserWindowConstructor: FakeBrowserWindow,
        rendererUrl: "https://matter.example.com"
      }),
    /Blocked unapproved desktop renderer origin/
  );

  const { window } = await startDesktopShell({ BrowserWindowConstructor: FakeBrowserWindow });
  let prevented = false;
  window.navigationHandlers.get("will-navigate")(
    { preventDefault: () => { prevented = true; } },
    "https://matter.example.com"
  );
  assert.equal(prevented, true);
  assert.deepEqual(window.windowOpenHandler({ url: "https://matter.example.com" }), { action: "deny" });
});

test("desktop main entrypoint detection tolerates filesystem paths with spaces", () => {
  const modulePath = decodeURIComponent(new URL("../src/main/main.js", import.meta.url).pathname);
  const packageRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");

  assert.equal(
    isMainEntryPoint({
      argv: ["/usr/bin/electron", "."],
      cwd: packageRoot,
      versions: { electron: "42.4.1" },
      defaultApp: true,
      resourcesPath: "/Users/jws/Documents/Codex/Law Firm OS/node_modules/electron/dist/Electron.app/Contents/Resources",
      modulePath
    }),
    true
  );

  assert.equal(
    isMainEntryPoint({
      argv: ["/usr/bin/electron", packageRoot],
      cwd: "/tmp",
      versions: { electron: "42.4.1" },
      defaultApp: true,
      resourcesPath: "/Users/jws/Documents/Codex/Law Firm OS/node_modules/electron/dist/Electron.app/Contents/Resources",
      modulePath
    }),
    true
  );

  assert.equal(
    isMainEntryPoint({
      argv: ["/usr/bin/electron", new URL("../src/main/main.js", import.meta.url).pathname],
      versions: { electron: "42.4.1" },
      defaultApp: true
    }),
    true
  );
  assert.equal(
    isMainEntryPoint({
      argv: ["/usr/bin/electron", decodeURIComponent(new URL("../src/main/main.js", import.meta.url).pathname)],
      versions: { electron: "42.4.1" },
      defaultApp: true
    }),
    true
  );
  assert.equal(
    isMainEntryPoint({
      argv: ["/usr/bin/electron", "--inspect=0", "--remote-debugging-port=0", decodeURIComponent(new URL("../src/main/main.js", import.meta.url).pathname)],
      versions: { electron: "42.4.1" },
      defaultApp: true
    }),
    true
  );
  assert.equal(
    isMainEntryPoint({
      argv: ["/Applications/matter.app/Contents/MacOS/matter"],
      versions: { electron: "42.4.1" },
      defaultApp: false
    }),
    true
  );
  assert.equal(
    isMainEntryPoint({
      argv: ["/Applications/matter.app/Contents/MacOS/matter", "--inspect=0"],
      versions: { electron: "42.4.1" },
      resourcesPath: "/Applications/matter.app/Contents/Resources",
      modulePath: "/Applications/matter.app/Contents/Resources/app/src/main/main.js"
    }),
    true
  );
});
