import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { APPROVED_DEV_RENDERER_URL } from "../src/main/origin-policy.js";
import {
  PASSWORD_RESET_DEEP_LINK_CHANNEL,
  collectMatterDeepLinkArgs,
  configureDesktopAppIcon,
  configureDesktopProtocol,
  desktopSecureStoreForRuntime,
  desktopPreloadPath,
  desktopWindowIconPath,
  desktopUserDataPath,
  isFormalReleasePackage,
  isMainEntryPoint,
  passwordResetDeepLinkIntent,
  packagedRendererUrl,
  rendererTargetFromEnv,
  sendPasswordResetDeepLink,
  shouldStartDesktopLocalApi,
  shouldUseVolatileDesktopSessionStore,
  shouldAutoStartElectronApp,
  startDesktopShell
} from "../src/main/main.js";
import {
  LAWOS_DURABLE_RUNTIME_HOME,
  desktopRuntimeStorePaths,
  desktopApiServerEntryCandidates,
  resolveDesktopApiServerEntry,
  startDesktopLocalApiServer
} from "../src/main/local-api.js";

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
  const preloadSource = readFileSync(new URL("../src/preload/session.cjs", import.meta.url), "utf8");

  assert.equal(target, packagedRendererUrl());
  assert.equal(window.loadedURL, packagedRendererUrl());
  const packagedUrl = new URL(packagedRendererUrl());
  assert.equal(packagedUrl.pathname.endsWith("/renderer/web/index.html"), true);
  assert.equal(packagedUrl.searchParams.get("desktop"), "1");
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
  assert.match(preloadSource, /desktopApiBaseUrl/);
  assert.match(preloadSource, /claimLogoIntro/);
  assert.match(preloadSource, /api: "session:api"/);
  assert.match(preloadSource, /api: \(payload\) => invokeAllowed\("api", payload\)/);
});

test("desktop startup cannot select the retired offline login renderers", () => {
  assert.equal(rendererTargetFromEnv({}), packagedRendererUrl());
  assert.equal(
    rendererTargetFromEnv({ MATTER_DESKTOP_RENDERER_URL: "file:///Applications/matter.app/Contents/Resources/app/src/renderer/offline.html" }),
    packagedRendererUrl()
  );
  assert.equal(
    rendererTargetFromEnv({ MATTER_DESKTOP_RENDERER_URL: "file:///Applications/matter.app/Contents/Resources/app/src/renderer/offline.matter.html" }),
    packagedRendererUrl()
  );
  assert.equal(
    rendererTargetFromEnv({ MATTER_DESKTOP_RENDERER_URL: APPROVED_DEV_RENDERER_URL }),
    APPROVED_DEV_RENDERER_URL
  );
});

test("desktop shell can resolve bundled or repo-local API server for web renderer data", () => {
  const packagedStart = "/App/Contents/Resources/app/src/main";
  const packagedEntry = "/App/Contents/Resources/app/runtime/apps/api/src/server.js";
  assert.equal(desktopApiServerEntryCandidates({ start: packagedStart })[0], packagedEntry);
  assert.equal(
    resolveDesktopApiServerEntry({
      start: packagedStart,
      existsSyncImpl: (candidate) => candidate === packagedEntry
    }),
    packagedEntry
  );
});

test("desktop local API maps runtime stores under the durable LawFirmOS home", () => {
  const userDataPath = join("/Users/test/Library/Application Support", "matter");
  const madeDirs = [];
  const stores = desktopRuntimeStorePaths({
    env: {},
    userDataPath,
    mkdirSyncImpl: (dir, options) => {
      madeDirs.push({ dir, options });
    }
  });
  const storeDir = LAWOS_DURABLE_RUNTIME_HOME;

  assert.deepEqual(madeDirs, [{ dir: storeDir, options: { recursive: true } }]);
  assert.equal(stores.hrxStorePath, join(storeDir, "hrx-store.json"));
  assert.equal(stores.masterDataStorePath, join(storeDir, "master-data-store.json"));
  assert.equal(stores.matterStorePath, join(storeDir, "matter-store.json"));
  assert.equal(stores.dmsStorePath, join(storeDir, "dms-store.json"));
  assert.equal(stores.crmStorePath, join(storeDir, "crm-store.json"));
  assert.equal(stores.intakeStorePath, join(storeDir, "intake-store.json"));
  assert.equal(stores.crmMasterDataStorePath, join(storeDir, "crm-master-data-store.json"));
  assert.equal(stores.financeStorePath, join(storeDir, "finance-store.json"));
  assert.equal(stores.analyticsStorePath, join(storeDir, "analytics-store.json"));
  assert.equal(stores.aiStorePath, join(storeDir, "ai-store.json"));
  assert.equal(stores.portalStorePath, join(storeDir, "portal-store.json"));
  assert.equal(stores.uiReadinessStorePath, join(storeDir, "ui-readiness-store.json"));
  assert.equal(stores.enterpriseReadinessStorePath, join(storeDir, "enterprise-readiness-store.json"));
});

test("desktop local API preserves explicit store overrides", () => {
  const storeDir = "/tmp/lawos-desktop-stores";
  const madeDirs = [];
  const stores = desktopRuntimeStorePaths({
    env: {
      MATTER_DESKTOP_RUNTIME_STORE_DIR: storeDir,
      LAWOS_MATTER_STORE_PATH: "/tmp/matter-override.json"
    },
    userDataPath: "/ignored/user-data",
    mkdirSyncImpl: (dir, options) => {
      madeDirs.push({ dir, options });
    }
  });

  assert.deepEqual(madeDirs, [{ dir: storeDir, options: { recursive: true } }]);
  assert.equal(stores.matterStorePath, "/tmp/matter-override.json");
  assert.equal(stores.hrxStorePath, join(storeDir, "hrx-store.json"));
});

test("desktop userData can be isolated for packaged QA runs", () => {
  const app = {
    calls: [],
    setPath(name, value) {
      this.calls.push({ name, value });
    },
    getPath() {
      return "/default/user-data";
    }
  };

  assert.equal(
    desktopUserDataPath(app, { MATTER_DESKTOP_USER_DATA_PATH: "/tmp/matter-desktop-qa-profile" }),
    "/tmp/matter-desktop-qa-profile"
  );
  assert.deepEqual(app.calls, [{ name: "userData", value: "/tmp/matter-desktop-qa-profile" }]);
  assert.equal(desktopUserDataPath(app, {}), "/default/user-data");
});

test("desktop local API defaults off for formal packages and remains opt-in for isolated QA", () => {
  assert.equal(isFormalReleasePackage({ resourcesPath: "/App/resources", existsSyncImpl: (path) => path.endsWith("matter-formal-release.json") }), true);
  assert.equal(isFormalReleasePackage({ resourcesPath: "/App/resources", existsSyncImpl: () => false }), false);
  assert.equal(shouldStartDesktopLocalApi({}), true);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "0" }), true);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_DISABLED: "1" }), false);
  assert.equal(shouldStartDesktopLocalApi({}, { formalRelease: true }), false);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "1" }, { formalRelease: true }), true);
  assert.equal(
    shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "1", MATTER_DESKTOP_LOCAL_API_DISABLED: "1" }, { formalRelease: true }),
    false
  );
});

test("desktop uses volatile session storage for loopback local API to avoid Keychain prompts", async () => {
  const localRuntimeClient = {
    runtimeStatus() {
      return {
        baseUrl: "http://127.0.0.1:4812",
        operatorRuntimeConfigured: false
      };
    }
  };
  const remoteRuntimeClient = {
    runtimeStatus() {
      return {
        baseUrl: "https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging",
        operatorRuntimeConfigured: true
      };
    }
  };
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value),
    decryptString: (value) => value.toString()
  };

  assert.equal(shouldUseVolatileDesktopSessionStore(localRuntimeClient), true);
  assert.equal(shouldUseVolatileDesktopSessionStore(remoteRuntimeClient), false);

  const localStore = desktopSecureStoreForRuntime({
    runtimeClient: localRuntimeClient,
    filePath: "/tmp/should-not-write-secure-session-store.json",
    safeStorage
  });
  await localStore.set("session_token", "local-session-token");
  assert.deepEqual(localStore.snapshot(), { session_token: "local-session-token" });
});

test("desktop local API starts bundled API with durable LawFirmOS stores", async () => {
  const packagedStart = "/App/Contents/Resources/app/src/main";
  const packagedEntry = "/App/Contents/Resources/app/runtime/apps/api/src/server.js";
  const userDataPath = join("/Users/test/Library/Application Support", "matter");
  const storeDir = LAWOS_DURABLE_RUNTIME_HOME;
  let apiOptions = null;
  const localApi = await startDesktopLocalApiServer({
    env: {},
    start: packagedStart,
    userDataPath,
    existsSyncImpl: (candidate) => candidate === packagedEntry,
    mkdirSyncImpl: () => {},
    startApiServerImpl: async (options) => {
      apiOptions = options;
      return {
        server: { close() {} },
        host: "127.0.0.1",
        port: 4812
      };
    }
  });

  assert.equal(apiOptions.port, 0);
  assert.equal(apiOptions.matterStorePath, join(storeDir, "matter-store.json"));
  assert.equal(apiOptions.hrxStorePath, join(storeDir, "hrx-store.json"));
  assert.equal(localApi.entry, packagedEntry);
  assert.equal(localApi.baseUrl, "http://127.0.0.1:4812");
  assert.equal(localApi.storePaths.matterStorePath, apiOptions.matterStorePath);
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

test("desktop app configures the macOS Dock icon from the packaged application icon", () => {
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

test("desktop app registers matter deep links with the OS protocol handler", () => {
  const calls = [];
  const registered = configureDesktopProtocol({
    setAsDefaultProtocolClient(scheme) {
      calls.push(scheme);
      return true;
    }
  });

  assert.equal(registered, true);
  assert.deepEqual(calls, ["matter"]);
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

test("desktop auto-starts in packaged Electron browser process", () => {
  assert.equal(shouldAutoStartElectronApp({ versions: {}, processType: "browser" }), false);
  assert.equal(shouldAutoStartElectronApp({ versions: { electron: "42.4.1" }, processType: "renderer" }), false);
  assert.equal(
    shouldAutoStartElectronApp({
      versions: { electron: "42.4.1" },
      processType: "browser",
      argv: ["matter"],
      resourcesPath: "",
      modulePath: "/unexpected/path/main.js"
    }),
    true
  );
});
