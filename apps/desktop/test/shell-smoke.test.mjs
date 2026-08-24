import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { APPROVED_DEV_RENDERER_URL } from "../src/main/origin-policy.js";
import {
  PASSWORD_RESET_DEEP_LINK_CHANNEL,
  authCallbackDeepLinkIntent,
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
    this.windowEvents = new Map();
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
    this.windowEvents.set(eventName, handler);
    if (eventName === "ready-to-show") this.readyEvent = { eventName, handler };
  }

  show() {
    this.shown = true;
    const handler = this.windowEvents.get("show");
    this.windowEvents.delete("show");
    handler?.();
  }

  focus() {
    this.focused = true;
  }

  isVisible() {
    return this.shown;
  }

  async loadURL(url) {
    this.loadedURL = url;
  }
}

class FakeIpcMain {
  handlers = new Map();

  handle(channel, handler) {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel) {
    this.handlers.delete(channel);
  }

  invoke(channel, payload) {
    return this.handlers.get(channel)?.({
      senderFrame: { url: packagedRendererUrl() }
    }, payload);
  }
}

test("desktop shell starts with packaged renderer target, preload, and hardened options", async () => {
  const { window, target } = await startDesktopShell({ BrowserWindowConstructor: FakeBrowserWindow });
  const preloadSource = readFileSync(new URL("../src/preload/session.cjs", import.meta.url), "utf8");

  assert.equal(target, packagedRendererUrl());
  assert.equal(window.loadedURL, packagedRendererUrl());
  const packagedUrl = new URL(packagedRendererUrl());
  assert.equal(packagedUrl.protocol, "matter-app:");
  assert.equal(packagedUrl.hostname, "app");
  assert.equal(packagedUrl.pathname, "/index.html");
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

test("desktop logo intro claim remains pending until the hidden main window is shown", async () => {
  const ipcMain = new FakeIpcMain();
  let claimed = false;
  const shell = await startDesktopShell({
    BrowserWindowConstructor: FakeBrowserWindow,
    ipcMain,
    coordinator: {
      claimLogoIntro() {
        claimed = true;
        return { play_logo_animation: true };
      }
    }
  });

  let settled = false;
  const claim = ipcMain.invoke("session:logo-intro:claim").then((result) => {
    settled = true;
    return result;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(claimed, false);

  shell.window.readyEvent.handler();
  assert.equal((await claim).play_logo_animation, true);
  assert.equal(claimed, true);
  shell.sessionIpc.dispose();
});

test("desktop shell wires the Outlook authorization copy command to the main-process clipboard writer", async () => {
  const ipcMain = new FakeIpcMain();
  const copied = [];
  const shell = await startDesktopShell({
    BrowserWindowConstructor: FakeBrowserWindow,
    ipcMain,
    coordinator: {},
    writeClipboard: (url) => {
      copied.push(url);
    }
  });
  const authorizeUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test&state=outlook-state:01HQ";

  const result = await ipcMain.invoke("desktop:outlook-authorization:copy", { url: authorizeUrl });
  assert.deepEqual(result, { copied: true });
  assert.deepEqual(copied, [authorizeUrl]);
  assert.equal(JSON.stringify(result).includes("outlook-state"), false);
  shell.sessionIpc.dispose();
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

test("packaged desktop resolves only its bundled API server", () => {
  const packagedStart = "/App/Contents/Resources/app/src/main";
  const packagedEntry = "/App/Contents/Resources/app/runtime/apps/api/src/server.js";
  assert.deepEqual(desktopApiServerEntryCandidates({ start: packagedStart, packaged: true }), [packagedEntry]);
  assert.equal(
    resolveDesktopApiServerEntry({
      start: packagedStart,
      packaged: true,
      existsSyncImpl: (candidate) => candidate === packagedEntry
    }),
    packagedEntry
  );
  assert.equal(
    resolveDesktopApiServerEntry({
      start: packagedStart,
      packaged: true,
      existsSyncImpl: (candidate) => candidate.endsWith("/apps/api/src/server.js") && candidate !== packagedEntry
    }),
    null
  );
});

test("development desktop retains the repo-local API server fallback", () => {
  const start = "/repo/apps/desktop/src/main";
  const repoEntry = "/repo/apps/api/src/server.js";
  assert.equal(
    resolveDesktopApiServerEntry({ start, existsSyncImpl: (candidate) => candidate === repoEntry }),
    repoEntry
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

test("packaged desktop defaults to production auth and local API requires explicit non-formal opt-in", () => {
  assert.equal(isFormalReleasePackage({ resourcesPath: "/App/resources", existsSyncImpl: (path) => path.endsWith("matter-formal-release.json") }), true);
  assert.equal(isFormalReleasePackage({ resourcesPath: "/App/resources", existsSyncImpl: () => false }), false);
  assert.equal(shouldStartDesktopLocalApi({}), true);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "0" }), true);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_DISABLED: "1" }), false);
  assert.equal(shouldStartDesktopLocalApi({}, { packaged: true }), false);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "0" }, { packaged: true }), false);
  assert.equal(
    shouldStartDesktopLocalApi(
      { MATTER_DESKTOP_LOCAL_API_ENABLED: "1" },
      { packaged: true, packagedRuntimePresent: true }
    ),
    true
  );
  assert.equal(
    shouldStartDesktopLocalApi(
      { MATTER_DESKTOP_LOCAL_API_ENABLED: "1" },
      { packaged: true, packagedRuntimePresent: false }
    ),
    false
  );
  assert.equal(
    shouldStartDesktopLocalApi(
      { MATTER_DESKTOP_LOCAL_API_ENABLED: "1", MATTER_DESKTOP_LOCAL_API_DISABLED: "1" },
      { packaged: true }
    ),
    false
  );
  assert.equal(shouldStartDesktopLocalApi({}, { formalRelease: true }), false);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "1" }, { formalRelease: true, packaged: true }), false);
  assert.equal(
    shouldStartDesktopLocalApi(
      { MATTER_DESKTOP_LOCAL_API_ENABLED: "1", MATTER_DESKTOP_LOCAL_API_DISABLED: "1" },
      { formalRelease: true, packaged: true }
    ),
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

  const formalStoreRoot = mkdtempSync(join(tmpdir(), "matter-formal-session-store-"));
  try {
    const filePath = join(formalStoreRoot, "secure-session-store.json");
    const formalStore = desktopSecureStoreForRuntime({
      runtimeClient: localRuntimeClient,
      filePath,
      safeStorage,
      formalRelease: true
    });
    await formalStore.set("session_token", "formal-session-token");

    const reopenedFormalStore = desktopSecureStoreForRuntime({
      runtimeClient: localRuntimeClient,
      filePath,
      safeStorage,
      formalRelease: true
    });
    assert.equal(await reopenedFormalStore.get("session_token"), "formal-session-token");
  } finally {
    rmSync(formalStoreRoot, { recursive: true, force: true });
  }
});

test("desktop local API starts bundled API with durable LawFirmOS stores", async () => {
  const packagedStart = "/App/Contents/Resources/app/src/main";
  const packagedEntry = "/App/Contents/Resources/app/runtime/apps/api/src/server.js";
  const userDataPath = join("/Users/test/Library/Application Support", "matter");
  const storeDir = LAWOS_DURABLE_RUNTIME_HOME;
  let apiOptions = null;
  const localApi = await startDesktopLocalApiServer({
    env: {},
    packaged: true,
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

test("packaged desktop fails closed when its bundled local API runtime is missing", async () => {
  await assert.rejects(
    () => startDesktopLocalApiServer({
      env: {},
      packaged: true,
      start: "/App/Contents/Resources/app/src/main",
      existsSyncImpl: () => false
    }),
    /Packaged desktop local API runtime is missing/
  );
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

test("desktop deep link helpers accept only their own routes and collect matter argv URLs", () => {
  const token = "abcdefghijklmnopqrstuvwxyzABCDE_123456";
  const callback = "matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ";
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
  assert.deepEqual(authCallbackDeepLinkIntent(callback), {
    type: "auth_callback",
    routeOnly: true,
    code: "0.ABC_def-123",
    state: "outlook-state:01HQ"
  });
  assert.equal(authCallbackDeepLinkIntent("matter://auth/wrong?code=0.ABC_def-123&state=outlook-state:01HQ"), null);
  assert.equal(authCallbackDeepLinkIntent("https://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ"), null);
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

test("packaged desktop cannot target or trust the development renderer", async () => {
  await assert.rejects(
    () => startDesktopShell({
      BrowserWindowConstructor: FakeBrowserWindow,
      rendererUrl: APPROVED_DEV_RENDERER_URL,
      packaged: true
    }),
    /Blocked unapproved desktop renderer origin/
  );
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
  assert.match(macBuildSource, /receipt: writeBuildReceipt \? [^:]+ : null/);
});

test("formal macOS builds reject disabling the external receipt before packaging", () => {
  const buildScript = fileURLToPath(new URL("../../../scripts/build-matter-desktop-mac.mjs", import.meta.url));
  const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MATTER_DESKTOP_BUILD_RECEIPT: "0",
      MATTER_DESKTOP_RELEASE_CHANNEL: "formal",
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /formal builds cannot disable the external build receipt/);
  assert.doesNotMatch(output, /notarytool|Developer ID Application|electron-packager/i);
});

test("formal macOS builds require Developer ID signing and notarization before packaging", () => {
  const buildScript = fileURLToPath(new URL("../../../scripts/build-matter-desktop-mac.mjs", import.meta.url));
  const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MATTER_DESKTOP_RELEASE_CHANNEL: "formal",
      MATTER_DESKTOP_SIGN: "internal",
      MATTER_DESKTOP_NOTARIZE: "0",
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /formal macOS builds require Developer ID signing and notarization/);
  assert.doesNotMatch(output, /notarytool|electron-packager/i);
});

test("macOS notarization rejects missing Developer ID signing before packaging", () => {
  const buildScript = fileURLToPath(new URL("../../../scripts/build-matter-desktop-mac.mjs", import.meta.url));
  const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MATTER_DESKTOP_RELEASE_CHANNEL: "internal",
      MATTER_DESKTOP_SIGN: "internal",
      MATTER_DESKTOP_NOTARIZE: "1",
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /macOS notarization requires Developer ID signing/);
  assert.doesNotMatch(output, /notarytool|electron-packager/i);
});

test("signed internal macOS builds require an exact clean source SHA before packaging", () => {
  const buildScript = fileURLToPath(new URL("../../../scripts/build-matter-desktop-mac.mjs", import.meta.url));
  const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MATTER_DESKTOP_RELEASE_CHANNEL: "internal",
      MATTER_DESKTOP_SIGN: "developer-id",
      MATTER_DESKTOP_NOTARIZE: "1",
      MATTER_DESKTOP_EXPECTED_SOURCE_SHA: "",
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /distribution-ready macOS builds require MATTER_DESKTOP_EXPECTED_SOURCE_SHA/);
  assert.doesNotMatch(output, /notarytool|electron-packager/i);
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
