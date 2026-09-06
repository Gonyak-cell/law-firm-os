import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const AUTH_CALLBACK_CHANNEL = "desktop:auth-callback";
const OUTLOOK_CONNECTION_RESULT_CHANNEL = "desktop:outlook-connection:result";

function loadSessionPreload({ listeners = new Map(), userActivation = false } = {}) {
  const source = readFileSync(new URL("../src/preload/session.cjs", import.meta.url), "utf8");
  const invocations = [];
  const signals = [];
  const exposedApis = new Map();
  let exposed = null;
  vm.runInNewContext(source, {
    process: { env: {} },
    navigator: { userActivation: { isActive: userActivation } },
    require(specifier) {
      assert.equal(specifier, "electron");
      return {
        contextBridge: {
          exposeInMainWorld(name, api) {
            exposed = { name, api };
            exposedApis.set(name, api);
          },
        },
        ipcRenderer: {
          invoke(channel, payload) {
            invocations.push({ channel, payload });
            return Promise.resolve(channel === "desktop:outlook-authorization:copy"
              ? { copied: true }
              : { opened: true });
          },
          send(channel, payload) {
            signals.push({ channel, payload });
          },
          on(channel, listener) {
            listeners.set(channel, listener);
          },
          removeListener(channel, listener) {
            if (listeners.get(channel) === listener) listeners.delete(channel);
          },
        },
      };
    },
  });
  return { exposed, exposedApis, invocations, listeners, signals, source };
}

test("packaged preload forwards corporate workspace only on explicit preview and save, without renderer authority", async () => {
  const harness = loadSessionPreload({ userActivation: true });
  const bridge = harness.exposedApis.get("amicFileBridge");
  const request = { matterId: null, workspaceId: "workspace-corporate", documentId: "document-corporate",
    versionId: "version-corporate", fileObjectId: "file-corporate", sha256: "a".repeat(64), byteSize: 3,
    mimeType: "application/pdf", suggestedName: "synthetic.pdf", tenantId: "forged", filePath: "/forged/path" };
  await bridge.saveDocumentAs(request);
  await bridge.openDocumentPreview(request);
  for (const call of harness.invocations) {
    assert.equal(call.payload.workspaceId, request.workspaceId);
    assert.equal(call.payload.matterId, null);
    assert.equal(call.payload.userActivation, true);
    assert.equal(Object.hasOwn(call.payload, "tenantId"), false);
    assert.equal(Object.hasOwn(call.payload, "filePath"), false);
  }
  assert.throws(() => bridge.saveDocumentAs({ ...request, bytes: new Uint8Array([1]) }), /Renderer-supplied document bytes/u);
  const inactive = loadSessionPreload();
  assert.throws(() => inactive.exposedApis.get("amicFileBridge").saveDocumentAs({ ...request, userActivation: true }), /active user interaction/u);
  assert.equal(inactive.invocations.length, 0);
});

test("session preload has no raw OAuth callback event, API, readiness, or acknowledgement surface", () => {
  const { exposed, listeners, signals, source } = loadSessionPreload();

  assert.equal(exposed.name, "matterSession");
  assert.equal(exposed.api.onAuthCallbackDeepLink, undefined);
  assert.equal(listeners.has(AUTH_CALLBACK_CHANNEL), false);
  assert.deepEqual(JSON.parse(JSON.stringify(signals)), []);
  assert.doesNotMatch(source, /desktop:auth-callback/);
  assert.doesNotMatch(source, /onAuthCallbackDeepLink/);
  assert.doesNotMatch(source, /authCallback(?:Ready|Acknowledge)/);
  assert.doesNotMatch(source, /console\.(?:debug|info|log|warn|error)/);
});

test("session preload buffers only the whitelisted Outlook connection result shape", () => {
  const { exposed, listeners } = loadSessionPreload();
  const received = [];
  const listener = listeners.get(OUTLOOK_CONNECTION_RESULT_CHANNEL);

  assert.equal(typeof exposed.api.onOutlookConnectionResult, "function");
  assert.equal(typeof listener, "function");
  listener({}, {
    type: "outlook_connection_result",
    status: "connected",
    http_status: 200,
    safe_error_code: null,
    employee_id: "emp_amic_jwsuh",
    connection_state: "connected",
    authorization_code: "must-not-render",
    state_ref: "must-not-render",
    email: "must-not-render@example.com",
    access_token: "must-not-render",
    nested: { secret: "must-not-render" },
  });
  listener({}, {
    type: "outlook_connection_result",
    status: "not-allowed",
    http_status: 200,
    safe_error_code: null,
  });
  assert.equal(received.length, 0);

  const unsubscribe = exposed.api.onOutlookConnectionResult((payload) => received.push(payload));
  assert.deepEqual(JSON.parse(JSON.stringify(received)), [{
    type: "outlook_connection_result",
    status: "connected",
    http_status: 200,
    safe_error_code: null,
    employee_id: "emp_amic_jwsuh",
    connection_state: "connected",
  }]);
  const serialized = JSON.stringify(received);
  for (const forbidden of ["authorization_code", "state_ref", "email", "access_token", "secret", "must-not-render"]) {
    assert.equal(serialized.includes(forbidden), false);
  }

  listener({}, {
    type: "outlook_connection_result",
    status: "retryable",
    http_status: 503,
    safe_error_code: "OUTLOOK_PROVIDER_UNAVAILABLE",
  });
  assert.equal(received.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(received[1])), {
    type: "outlook_connection_result",
    status: "retryable",
    http_status: 503,
    safe_error_code: "OUTLOOK_PROVIDER_UNAVAILABLE",
  });

  unsubscribe();
  listener({}, {
    type: "outlook_connection_result",
    status: "expired",
    http_status: 400,
    safe_error_code: "OUTLOOK_OAUTH_STATE_EXPIRED",
  });
  assert.equal(received.length, 2);
  const unsubscribeAgain = exposed.api.onOutlookConnectionResult((payload) => received.push(payload));
  assert.equal(received.length, 3);
  assert.equal(received[2].status, "expired");
  unsubscribeAgain();
});

test("ES module and packaged CommonJS preloads expose the same safe result contract", () => {
  const moduleSource = readFileSync(new URL("../src/preload/session.js", import.meta.url), "utf8");
  const packagedSource = readFileSync(new URL("../src/preload/session.cjs", import.meta.url), "utf8");
  const normalize = (source) => source
    .replace(/^import \{ contextBridge, ipcRenderer \} from "electron";\n\n/, "")
    .replace(/^const \{ contextBridge, ipcRenderer \} = require\("electron"\);\n\n/, "")
    .replace(/^export /gm, "")
    .trim();

  assert.equal(normalize(moduleSource), normalize(packagedSource));
});

test("session preload sends the Outlook authorization URL only through its allowlisted IPC command", async () => {
  const { exposed, invocations } = loadSessionPreload();
  const authorizeUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test";

  assert.deepEqual(
    JSON.parse(JSON.stringify(await exposed.api.openOutlookAuthorization(authorizeUrl))),
    { opened: true }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(invocations)), [{
    channel: "desktop:outlook-authorization:open",
    payload: { url: authorizeUrl }
  }]);
});

test("session preload exposes only the narrow Outlook authorization copy command", async () => {
  const { exposed, invocations } = loadSessionPreload();
  const authorizeUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test";

  assert.equal(exposed.api.clipboard, undefined);
  assert.equal(exposed.api.readClipboard, undefined);
  assert.equal(exposed.api.writeClipboard, undefined);
  assert.deepEqual(
    JSON.parse(JSON.stringify(await exposed.api.copyOutlookAuthorization(authorizeUrl))),
    { copied: true }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(invocations)), [{
    channel: "desktop:outlook-authorization:copy",
    payload: { url: authorizeUrl }
  }]);
});

test("session preload exposes bounded lifecycle intents without ids bodies or signing", async () => {
  const { exposed, invocations, source } = loadSessionPreload();
  assert.equal(typeof exposed.api.outlookLifecycleStatus, "function");
  assert.equal(typeof exposed.api.retryOutlookLifecycle, "function");
  assert.equal(typeof exposed.api.confirmOutlookMicrosoft, "function");
  assert.equal(typeof exposed.api.disconnectOutlookDevice, "function");
  assert.equal(exposed.api.sign, undefined);
  assert.equal(exposed.api.signOutlookLifecycle, undefined);
  assert.equal(exposed.api.outlookInstallationIdentity, undefined);

  await exposed.api.outlookLifecycleStatus();
  await exposed.api.retryOutlookLifecycle();
  await exposed.api.confirmOutlookMicrosoft(
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test",
  );
  await exposed.api.disconnectOutlookDevice();
  assert.deepEqual(JSON.parse(JSON.stringify(invocations)), [
    { channel: "desktop:outlook-lifecycle:status" },
    { channel: "desktop:outlook-lifecycle:retry" },
    {
      channel: "desktop:outlook-lifecycle:confirm-microsoft",
      payload: {
        url: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test",
        confirmed: true,
      },
    },
    {
      channel: "desktop:outlook-lifecycle:disconnect",
      payload: { confirmed: true },
    },
  ]);
  assert.doesNotMatch(
    source,
    /private_key|device_public_key|installation_id|principal_ref|sign\s*:/u,
  );
});
