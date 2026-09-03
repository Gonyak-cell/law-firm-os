import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { APPROVED_DEV_RENDERER_URL } from "../src/main/origin-policy.js";
import { FILE_BRIDGE_CHANNELS } from "../src/main/fileBridge.js";
import {
  PASSWORD_RESET_DEEP_LINK_CHANNEL,
  authCallbackDeepLinkIntent,
  collectMatterDeepLinkArgs,
  configureDesktopAppIcon,
  configureDesktopProtocol,
  createDesktopFileBridgePermissionClient,
  createDesktopVaultDocumentProvider,
  createDesktopVaultUploadProvider,
  desktopSecureStoreForRuntime,
  desktopPreloadPath,
  desktopWindowIconPath,
  desktopUserDataPath,
  isFormalReleasePackage,
  isInternalUnsignedReleasePackage,
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
      sender: { id: 17 },
      senderFrame: { url: packagedRendererUrl(), routingId: 3 }
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
  assert.equal(window.options.title, "AMIC OS");
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
  assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("amicFileBridge"/);
});

test("desktop shell registers the active file bridge on the same trusted renderer boundary", async () => {
  const ipcMain = new FakeIpcMain();
  const calls = [];
  const fileBridgeController = {
    status: () => ({ bridgeExposed: true, uploadReady: false }),
    precheckUpload: async (request, owner) => {
      calls.push({ request, owner });
      return { state: "allowed", preflightId: "file-preflight-001" };
    },
    chooseFileForUpload: async () => ({ state: "cancelled" }),
    cancelUpload: async () => ({ state: "cancelled" }),
    uploadSelectedFile: async () => ({ state: "uploaded" }),
    saveDocumentAs: async () => ({ state: "cancelled" }),
    openDocumentPreview: async () => ({ state: "opened" })
  };
  const shell = await startDesktopShell({
    BrowserWindowConstructor: FakeBrowserWindow,
    ipcMain,
    fileBridgeController
  });

  assert.deepEqual(shell.fileBridgeIpc.channels.slice().sort(), Object.values(FILE_BRIDGE_CHANNELS).sort());
  assert.deepEqual(await ipcMain.invoke(FILE_BRIDGE_CHANNELS.status), {
    bridgeExposed: true,
    uploadReady: false
  });
  assert.deepEqual(
    await ipcMain.invoke(FILE_BRIDGE_CHANNELS.precheckUpload, { matterId: "matter_001" }),
    { state: "allowed", preflightId: "file-preflight-001" }
  );
  assert.deepEqual(calls[0], {
    request: { matterId: "matter_001" },
    owner: { ownerId: "web-contents:17:frame:3" }
  });
  shell.fileBridgeIpc.dispose();
  assert.equal(ipcMain.handlers.size, 0);
});

test("desktop file bridge permission adapter accepts only a server-enabled exact upload preflight", async () => {
  const calls = [];
  let writeEnabled = false;
  const permissionClient = createDesktopFileBridgePermissionClient({
    async precheckVaultUpload(request) {
      calls.push(request);
      return {
        http_status: 200,
        ok: true,
        outcome: "preflight_passed",
        item: {
          permission_checked: true,
          vault_document_write_enabled: writeEnabled,
          operation_id: "operation-001",
          max_upload_bytes: 1048576
        },
        vault_document_write_enabled: writeEnabled,
        safe_error_codes: writeEnabled ? [] : ["VAULT_DOCUMENT_WRITE_DISABLED"]
      };
    }
  });
  const request = {
    actionId: "precheck_file_upload",
    matterId: "matter_001",
    workspaceId: "workspace_001",
    folderId: "folder_001"
  };

  assert.deepEqual(await permissionClient.precheckFileBridgeAction(request), {
    allowed: false,
    reason: "VAULT_DOCUMENT_WRITE_DISABLED",
    operationId: null,
    maxUploadBytes: null
  });
  writeEnabled = true;
  assert.deepEqual(await permissionClient.precheckFileBridgeAction(request), {
    allowed: true,
    reason: null,
    operationId: "operation-001",
    maxUploadBytes: 1048576
  });
  assert.deepEqual(calls[1], {
    matterId: "matter_001",
    workspaceId: "workspace_001",
    folderId: "folder_001"
  });
  assert.equal(JSON.stringify(calls).includes("tenant"), false);
  assert.equal(JSON.stringify(calls).includes("actor"), false);
  assert.deepEqual(
    await permissionClient.precheckFileBridgeAction({ actionId: "save_document_as" }),
    { allowed: false, reason: "vault_export_precheck_unavailable" }
  );
});

test("desktop file bridge export adapters preserve exact version binding and keep bytes in main", async () => {
  const bytes = Buffer.from("exact desktop bytes");
  const exactVersion = {
    document_id: "document-001",
    version_id: "version-007",
    file_object_id: "file-object-007",
    sha256: "c".repeat(64),
    byte_size: bytes.byteLength,
    mime_type: "application/pdf",
  };
  const coordinator = {
    async precheckVaultUpload() { throw new Error("not used"); },
    async precheckVaultExport(request) {
      assert.deepEqual(request, { matterId: "matter-001", exactVersion });
      return {
        http_status: 200,
        ok: true,
        outcome: "preflight_passed",
        request_id: "request-export-preflight",
        exact_version: exactVersion,
        lawos_permission_checked: true,
        provider_authority_checked: false,
        provider_grant_created: false,
      };
    },
    async downloadVaultExactVersion(request) {
      assert.deepEqual(request, { matterId: "matter-001", exactVersion });
      return {
        http_status: 200,
        ok: true,
        operation_id: "vaultop_ffffffffffffffffffffffffffffffff",
        attachment_name: "contract.pdf",
        exact_version: exactVersion,
        bytes,
      };
    },
    async completeVaultExport(request) {
      assert.deepEqual(request, {
        operationId: "vaultop_ffffffffffffffffffffffffffffffff",
        exactVersion,
      });
      return {
        http_status: 200,
        ok: true,
        outcome: "delivered",
        operation_id: request.operationId,
        receipt: { stage: "delivered", receipt_id: "receipt-export-001" },
      };
    },
  };
  const permission = createDesktopFileBridgePermissionClient(coordinator);
  assert.deepEqual(await permission.precheckFileBridgeAction({
    actionId: "save_document_as",
    matterId: "matter-001",
    exactVersion,
  }), {
    allowed: true,
    reason: null,
    decisionId: "request-export-preflight",
  });
  assert.deepEqual(await permission.precheckFileBridgeAction({
    actionId: "open_temp_preview",
    matterId: "matter-001",
    exactVersion,
  }), {
    allowed: true,
    reason: null,
    decisionId: "request-export-preflight",
  });
  const provider = createDesktopVaultDocumentProvider(coordinator);
  const downloaded = await provider.fetchDocumentForSave({
    matterId: "matter-001",
    exactVersion,
  });
  assert.equal(downloaded.bytes, bytes);
  assert.equal(downloaded.operationId, "vaultop_ffffffffffffffffffffffffffffffff");
  assert.deepEqual(await provider.completeDocumentSave({
    operationId: downloaded.operationId,
    exactVersion,
  }), {
    state: "delivered",
    operationId: downloaded.operationId,
    receiptId: "receipt-export-001",
  });
});

test("desktop Vault document provider forwards only a safe Outlook failure completion", async () => {
  const exactVersion = {
    document_id: "document-001",
    version_id: "version-007",
    file_object_id: "file-object-007",
    sha256: "c".repeat(64),
    byte_size: 19,
    mime_type: "application/pdf",
  };
  const coordinator = {
    async downloadVaultExactVersion() { throw new Error("not used"); },
    async completeVaultExport(request) {
      assert.deepEqual(request, {
        operationId: "vaultop_ffffffffffffffffffffffffffffffff",
        exactVersion,
        operationKind: "attach_outlook",
        completionStage: "failed",
        installationRefSha256: "4".repeat(64),
        composeTargetSha256: "5".repeat(64),
        safeReasonCode: "CLASSIC_OUTLOOK_HOST_UNAVAILABLE",
      });
      return {
        http_status: 200,
        ok: true,
        outcome: "failed",
        operation_id: request.operationId,
        receipt: { stage: "failed", receipt_id: "receipt-export-failed-001" },
      };
    },
  };
  const provider = createDesktopVaultDocumentProvider(coordinator);
  assert.deepEqual(await provider.completeDocumentSave({
    operationId: "vaultop_ffffffffffffffffffffffffffffffff",
    exactVersion,
    operationKind: "attach_outlook",
    completionStage: "failed",
    safeReasonCode: "CLASSIC_OUTLOOK_HOST_UNAVAILABLE",
    installationRefSha256: "4".repeat(64),
    composeTargetSha256: "5".repeat(64),
  }), {
    state: "failed",
    operationId: "vaultop_ffffffffffffffffffffffffffffffff",
    receiptId: "receipt-export-failed-001",
  });
});

test("desktop Vault upload provider returns only the exact server receipt projection", async () => {
  const provider = createDesktopVaultUploadProvider({
    async uploadVaultFile(request) {
      assert.equal(request.operationId, "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      assert.equal(request.stream.kind, "test-stream");
      return {
        ok: true,
        http_status: 201,
        request_id: "request-001",
        item: {
          operation_id: request.operationId,
          document_id: "document-001",
          version_id: "version-001",
          file_object_id: "file-object-001",
          sha256: "b".repeat(64),
          byte_size: 12,
          mime_type: "text/plain",
          audit_event_id: "audit-001",
          exact_readback_verified: true,
          raw_path: "/must/not/cross"
        }
      };
    },
    async continueVaultUpload() { throw new Error("unexpected continuation"); },
    async rememberPendingVaultUpload() { throw new Error("unexpected pending state"); },
    async pendingVaultUploads() { return []; },
    async forgetPendingVaultUpload() { return { forgotten: false }; },
  });
  const receipt = await provider.uploadSelectedFile({
    stream: { kind: "test-stream" },
    file: { name: "note.txt", mimeType: "text/plain", size: 12 },
    operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  });
  assert.deepEqual(receipt, {
    state: "uploaded",
    requestId: "request-001",
    operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    documentId: "document-001",
    versionId: "version-001",
    fileObjectId: "file-object-001",
    sha256: "b".repeat(64),
    byteSize: 12,
    mimeType: "text/plain",
    auditEventId: "audit-001"
  });
  assert.equal(JSON.stringify(receipt).includes("/must/not/cross"), false);
});

test("desktop Vault upload provider polls continuation without passing the file stream again", async () => {
  const operationId = "vaultop_dddddddddddddddddddddddddddddddd";
  const sha256 = "c".repeat(64);
  const calls = [];
  const pending = new Map();
  const provider = createDesktopVaultUploadProvider({
    async uploadVaultFile(request) {
      calls.push({ method: "upload", request });
      return {
        ok: true,
        http_status: 202,
        outcome: "processing",
        local_stream_sha256: sha256,
        local_stream_byte_size: 12,
        item: {
          operation_id: operationId,
          stage: "scanning",
          retry_after_ms: 250,
          exact_readback_verified: false,
        },
      };
    },
    async continueVaultUpload(request) {
      calls.push({ method: "status", request });
      return {
        ok: true,
        http_status: 201,
        outcome: "readback_verified",
        request_id: "request-status-complete",
        item: {
          operation_id: operationId,
          document_id: "document-status-001",
          version_id: "version-status-001",
          file_object_id: "file-status-001",
          sha256,
          byte_size: 12,
          mime_type: "text/plain",
          audit_event_id: "audit-status-001",
          exact_readback_verified: true,
        },
      };
    },
    async rememberPendingVaultUpload(request) {
      calls.push({ method: "remember", request });
      pending.set(request.operationId, request.expected);
    },
    async pendingVaultUploads() { return []; },
    async forgetPendingVaultUpload(request) {
      calls.push({ method: "forget", request });
      return { forgotten: pending.delete(request.operationId) };
    },
  }, { wait: async () => {} });
  const stream = { kind: "one-use-stream" };
  const receipt = await provider.uploadSelectedFile({
    stream,
    file: { name: "note.txt", mimeType: "text/plain", size: 12 },
    operationId,
  });
  assert.equal(receipt.versionId, "version-status-001");
  assert.deepEqual(calls.map(({ method }) => method), ["upload", "remember", "status", "forget"]);
  assert.equal(calls[0].request.stream, stream);
  assert.equal("stream" in calls[2].request, false);
  assert.deepEqual(calls[2].request.expected, {
    sha256,
    byteSize: 12,
    mimeType: "text/plain",
  });
  assert.equal(pending.size, 0);
});

test("desktop Vault upload provider resumes a persisted pending operation after provider recreation", async () => {
  const operationId = "vaultop_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const sha256 = "d".repeat(64);
  const pending = new Map();
  const calls = [];
  let statusCalls = 0;
  const coordinator = {
    async uploadVaultFile(request) {
      calls.push({ method: "upload", request });
      return {
        ok: true,
        http_status: 202,
        outcome: "processing",
        request_id: "request-persisted-pending",
        local_stream_sha256: sha256,
        local_stream_byte_size: 12,
        item: {
          operation_id: operationId,
          stage: "quarantined",
          retry_after_ms: 250,
          exact_readback_verified: false,
        },
      };
    },
    async continueVaultUpload(request) {
      calls.push({ method: "status", request });
      statusCalls += 1;
      return {
        ok: true,
        http_status: 201,
        outcome: "readback_verified",
        request_id: `request-resumed-${statusCalls}`,
        item: {
          operation_id: operationId,
          document_id: "document-resumed-001",
          version_id: "version-resumed-001",
          file_object_id: "file-resumed-001",
          sha256,
          byte_size: 12,
          mime_type: "text/plain",
          audit_event_id: "audit-resumed-001",
          exact_readback_verified: true,
        },
      };
    },
    async rememberPendingVaultUpload(request) {
      pending.set(request.operationId, Object.freeze({
        schema_version: "law-firm-os.desktop-vault-upload-pending.v1",
        operation_id: request.operationId,
        expected: Object.freeze({
          sha256: request.expected.sha256,
          byte_size: request.expected.byteSize,
          mime_type: request.expected.mimeType,
        }),
      }));
    },
    async pendingVaultUploads() { return Object.freeze([...pending.values()]); },
    async forgetPendingVaultUpload(request) {
      return { forgotten: pending.delete(request.operationId) };
    },
  };
  const firstProcessProvider = createDesktopVaultUploadProvider(coordinator, {
    wait: async () => {},
    maxStatusChecks: 0,
  });
  const accepted = await firstProcessProvider.uploadSelectedFile({
    stream: { kind: "single-stream" },
    file: { name: "resume.txt", mimeType: "text/plain", size: 12 },
    operationId,
  });
  assert.equal(accepted.state, "processing");
  assert.equal(accepted.operationId, operationId);
  assert.equal(accepted.pathVisibleToRenderer, false);
  assert.equal(pending.size, 1);

  const recreatedProvider = createDesktopVaultUploadProvider(coordinator, {
    wait: async () => {},
  });
  const resumed = await recreatedProvider.resumePendingUploads();
  assert.equal(resumed.length, 1);
  assert.equal(resumed[0].state, "uploaded");
  assert.equal(resumed[0].versionId, "version-resumed-001");
  assert.equal(pending.size, 0);
  assert.deepEqual(calls.map(({ method }) => method), ["upload", "status"]);
  assert.equal("stream" in calls[1].request, false);
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
  assert.equal(isInternalUnsignedReleasePackage({
    resourcesPath: "/App/resources",
    existsSyncImpl: (path) => path.endsWith("matter-internal-unsigned-release.json"),
  }), true);
  assert.equal(isInternalUnsignedReleasePackage({
    resourcesPath: "/App/resources",
    existsSyncImpl: () => false,
  }), false);
  assert.equal(shouldStartDesktopLocalApi({}), true);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "0" }), true);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_DISABLED: "1" }), false);
  assert.equal(shouldStartDesktopLocalApi({}, { packaged: true }), false);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "0" }, { packaged: true }), false);
  assert.equal(shouldStartDesktopLocalApi({ MATTER_DESKTOP_LOCAL_API_ENABLED: "1" }, { packaged: true }), true);
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
      { MATTER_DESKTOP_LOCAL_API_ENABLED: "1" },
      { internalUnsignedRelease: true, packaged: true },
    ),
    false,
  );
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
