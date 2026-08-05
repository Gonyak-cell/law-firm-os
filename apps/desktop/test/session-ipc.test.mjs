import assert from "node:assert/strict";
import test from "node:test";
import { MainProcessAuthCoordinator } from "../src/main/auth.js";
import { APPROVED_DEV_RENDERER_URL, isApprovedRendererUrl } from "../src/main/origin-policy.js";
import {
  isAllowedOutlookAuthorizationUrl,
  registerSessionIpcHandlers,
  SESSION_CHANNELS
} from "../src/main/session-ipc.js";

const trustedSender = (event) => isApprovedRendererUrl(event?.senderFrame?.url ?? event?.sender?.getURL?.());

class FakeIpcMain {
  handlers = new Map();
  listeners = new Map();

  handle(channel, handler) {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel) {
    this.handlers.delete(channel);
  }

  on(channel, handler) {
    this.listeners.set(channel, handler);
  }

  removeListener(channel, handler) {
    if (this.listeners.get(channel) === handler) this.listeners.delete(channel);
  }

  invoke(channel, payload, event = { senderFrame: { url: APPROVED_DEV_RENDERER_URL } }) {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`missing handler: ${channel}`);
    return handler(event, payload);
  }

  emit(channel, event = { senderFrame: { url: APPROVED_DEV_RENDERER_URL } }, payload) {
    this.listeners.get(channel)?.(event, payload);
  }
}

function fakeRuntimeClient() {
  return {
    runtimeStatus: () => ({
      configured: true,
      mode: "aws-temporary-execute-api",
      operatorTokenMaterialExposed: false
    }),
    accounts: async () => ({
      ok: true,
      users: [
        { email: "jwsuh@amic.kr", highest_privilege: "system_super_admin", role_ids: ["system_super_admin"] },
        { email: "general@amic.kr", highest_privilege: "matter_vault_user", role_ids: ["matter_vault_user"] }
      ],
      token_material_returned: false
    }),
    requestPasswordReset: async ({ email }) => ({
      ok: true,
      accepted: true,
      email,
      token_material_returned: false
    }),
    latestResetEmail: async ({ email }) => ({
      ok: true,
      email_message: {
        to: email,
        reset_token: "reset-token",
        reset_url: "matter://password-reset/confirm?token=reset-token"
      },
      token_material_returned: true
    }),
    confirmPasswordReset: async ({ token, password }) => ({
      ok: token === "reset-token" && password === "new-password",
      accepted: token === "reset-token" && password === "new-password",
      token_material_returned: false
    }),
    login: async ({ email, password }) => ({
      ok: true,
      session: {
        state: "signed_in",
        email,
        highest_privilege: email === "jwsuh@amic.kr" ? "system_super_admin" : "matter_vault_user",
        role_ids: email === "jwsuh@amic.kr" ? ["system_super_admin"] : ["matter_vault_user"],
        operatorToken: "must-not-render"
      },
      password_seen: Boolean(password),
      features: [{ feature_id: "matter_vault_admin", allowed: email === "jwsuh@amic.kr", decision: email === "jwsuh@amic.kr" ? "allow" : "deny" }]
    }),
    features: async ({ email }) => ({
      ok: true,
      features: [{ feature_id: "matter_vault_admin", allowed: email === "jwsuh@amic.kr", decision: email === "jwsuh@amic.kr" ? "allow" : "deny" }]
    }),
    smoke: async ({ email, featureId }) => ({
      ok: email === "jwsuh@amic.kr" || featureId !== "matter_vault_admin",
      decision: email === "jwsuh@amic.kr" || featureId !== "matter_vault_admin" ? "allow" : "deny",
      feature_id: featureId,
      actor_email: email,
      http_status: email === "jwsuh@amic.kr" || featureId !== "matter_vault_admin" ? 200 : 403
    }),
    api: async ({ path, sessionToken }) => ({
      http_status: 200,
      body: {
        request_id: "req-api",
        path,
        items: [{ matter_id: "matter-001" }]
      },
      sessionToken,
      token_material_returned: false
    })
  };
}

test("session IPC exposes account login and smoke without renderer token material", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  let sessionAvailableCount = 0;
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator,
    isTrustedSender: trustedSender,
    onSessionAvailable: () => { sessionAvailableCount += 1; }
  });

  assert.deepEqual(registration.channels.sort(), Object.values(SESSION_CHANNELS).sort());
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.runtime)).configured, true);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.claimLogoIntro)).play_logo_animation, true);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.claimLogoIntro)).play_logo_animation, false);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.accounts)).users.length, 2);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.requestPasswordReset, { email: "jwsuh@amic.kr" })).accepted, true);
  const resetEmail = await ipcMain.invoke(SESSION_CHANNELS.latestResetEmail, { email: "jwsuh@amic.kr" });
  assert.equal(resetEmail.email_message.reset_token, undefined);
  assert.equal(JSON.stringify(resetEmail).includes("reset-token"), false);
  assert.equal(
    (await ipcMain.invoke(SESSION_CHANNELS.confirmPasswordReset, { token: "reset-token", password: "new-password" })).accepted,
    true
  );

  const login = await ipcMain.invoke(SESSION_CHANNELS.login, { email: "jwsuh@amic.kr", password: "new-password" });
  assert.equal(login.session.email, "jwsuh@amic.kr");
  assert.equal(login.session.highest_privilege, "system_super_admin");
  assert.equal(JSON.stringify(login).includes("must-not-render"), false);
  assert.equal(JSON.stringify(login).includes("operatorToken"), false);
  assert.equal(JSON.stringify(login).includes("new-password"), false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sessionAvailableCount, 1);

  const denied = await ipcMain.invoke(SESSION_CHANNELS.smoke, {
    email: "general@amic.kr",
    featureId: "matter_vault_admin"
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.decision, "deny");
  assert.equal(denied.http_status, 403);
  const api = await ipcMain.invoke(SESSION_CHANNELS.api, { path: "/api/matters", method: "GET" });
  assert.equal(api.body.items.length, 1);
  assert.equal(JSON.stringify(api).includes("sessionToken"), false);
  const mainOnlyCompletion = await ipcMain.invoke(SESSION_CHANNELS.api, {
    path: "/api/hrx/people/me/outlook-connection/complete",
    method: "POST",
    body: JSON.stringify({ authorization_code: "must-not-forward", state_ref: "must-not-forward" })
  });
  assert.deepEqual(mainOnlyCompletion, {
    ok: false,
    reason: "desktop_main_only_route",
    http_status: 403,
    token_material_returned: false
  });
  assert.equal(JSON.stringify(mainOnlyCompletion).includes("must-not-forward"), false);

  registration.dispose();
  assert.equal(ipcMain.handlers.size, 0);
});

test("session IPC does not consume the logo intro before the desktop window is shown", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  let releaseWindow;
  const windowShown = new Promise((resolve) => {
    releaseWindow = resolve;
  });
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator,
    isTrustedSender: trustedSender,
    waitForLogoIntroReady: () => windowShown
  });

  let settled = false;
  const firstClaim = ipcMain.invoke(SESSION_CHANNELS.claimLogoIntro).then((result) => {
    settled = true;
    return result;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);

  releaseWindow();
  assert.equal((await firstClaim).play_logo_animation, true);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.claimLogoIntro)).play_logo_animation, false);
  registration.dispose();
});

test("session IPC opens only the Microsoft Outlook authorization endpoint without returning its query", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  const opened = [];
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator,
    isTrustedSender: trustedSender,
    openExternal: async (url) => {
      opened.push(url);
    }
  });
  const allowedUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test&state=outlook-state:01HQ";

  assert.equal(isAllowedOutlookAuthorizationUrl(allowedUrl), true);
  const result = await ipcMain.invoke(SESSION_CHANNELS.openOutlookAuthorization, { url: allowedUrl });
  assert.deepEqual(result, { opened: true, handoff_accepted: true });
  assert.deepEqual(opened, [allowedUrl]);
  assert.equal(JSON.stringify(result).includes("client_id"), false);
  assert.equal(JSON.stringify(result).includes("outlook-state"), false);

  const rejected = [
    "http://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.com.evil.example/common/oauth2/v2.0/authorize",
    "https://evil.example@login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.com:444/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.com/oauth2/v2.0/authorize",
    "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize#fragment",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?access_token=must-not-open",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?refresh_token=must-not-open",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?id_token=must-not-open",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_secret=must-not-open",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?credential_ref=must-not-open",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?token=must-not-open"
  ];
  for (const url of rejected) {
    assert.equal(isAllowedOutlookAuthorizationUrl(url), false);
    assert.deepEqual(
      await ipcMain.invoke(SESSION_CHANNELS.openOutlookAuthorization, { url }),
      { opened: false, handoff_accepted: false, reason: "outlook_authorization_url_not_allowed" }
    );
  }
  assert.deepEqual(opened, [allowedUrl]);

  registration.dispose();
});

test("session IPC copies only an allowed Outlook authorization URL without returning its query", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  const copied = [];
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator,
    isTrustedSender: trustedSender,
    writeClipboard: async (url) => {
      copied.push(url);
    }
  });
  const allowedUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test&state=outlook-state:01HQ";

  const result = await ipcMain.invoke(SESSION_CHANNELS.copyOutlookAuthorization, { url: allowedUrl });
  assert.deepEqual(result, { copied: true });
  assert.deepEqual(copied, [allowedUrl]);
  assert.equal(JSON.stringify(result).includes("client_id"), false);
  assert.equal(JSON.stringify(result).includes("outlook-state"), false);

  const fixedFailure = {
    copied: false,
    reason: "outlook_authorization_copy_failed"
  };
  assert.deepEqual(
    await ipcMain.invoke(SESSION_CHANNELS.copyOutlookAuthorization, {
      url: "https://evil.example/common/oauth2/v2.0/authorize?state=must-not-copy"
    }),
    fixedFailure
  );
  await assert.rejects(
    () => ipcMain.invoke(
      SESSION_CHANNELS.copyOutlookAuthorization,
      { url: allowedUrl },
      { senderFrame: { url: "file:///tmp/untrusted.html" } }
    ),
    (error) => error?.code === "UNTRUSTED_RENDERER_IPC_SENDER"
  );
  assert.deepEqual(copied, [allowedUrl]);

  registration.dispose();
});

test("Outlook authorization copy IPC fails closed when clipboard writing is unavailable or fails", async () => {
  const allowedUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=lawos-test";
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  const fixedFailure = {
    copied: false,
    reason: "outlook_authorization_copy_failed"
  };

  const unavailableIpc = new FakeIpcMain();
  const unavailableRegistration = registerSessionIpcHandlers({
    ipcMain: unavailableIpc,
    coordinator,
    isTrustedSender: trustedSender
  });
  assert.deepEqual(
    await unavailableIpc.invoke(SESSION_CHANNELS.copyOutlookAuthorization, { url: allowedUrl }),
    fixedFailure
  );
  unavailableRegistration.dispose();

  const failingIpc = new FakeIpcMain();
  const failingRegistration = registerSessionIpcHandlers({
    ipcMain: failingIpc,
    coordinator,
    isTrustedSender: trustedSender,
    writeClipboard: async () => {
      throw new Error(`clipboard failure containing ${allowedUrl}`);
    }
  });
  const result = await failingIpc.invoke(SESSION_CHANNELS.copyOutlookAuthorization, { url: allowedUrl });
  assert.deepEqual(result, fixedFailure);
  assert.equal(JSON.stringify(result).includes("lawos-test"), false);
  failingRegistration.dispose();
});

test("session IPC exposes no raw OAuth callback readiness or acknowledgement channel", () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator,
    isTrustedSender: trustedSender
  });

  assert.equal(SESSION_CHANNELS.authCallbackReady, undefined);
  assert.equal(SESSION_CHANNELS.authCallbackAcknowledge, undefined);
  assert.equal(registration.channels.some((channel) => channel.includes("auth-callback")), false);
  assert.equal(ipcMain.listeners.size, 0);
  registration.dispose();
});

test("Outlook authorization IPC fails closed for missing opener errors and untrusted renderers", async () => {
  const allowedUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=lawos-test";
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });

  const unavailableIpc = new FakeIpcMain();
  const unavailableRegistration = registerSessionIpcHandlers({
    ipcMain: unavailableIpc,
    coordinator,
    isTrustedSender: trustedSender
  });
  assert.deepEqual(
    await unavailableIpc.invoke(SESSION_CHANNELS.openOutlookAuthorization, { url: allowedUrl }),
    { opened: false, handoff_accepted: false, reason: "outlook_authorization_opener_unavailable" }
  );
  unavailableRegistration.dispose();

  const failingIpc = new FakeIpcMain();
  let calls = 0;
  const failingRegistration = registerSessionIpcHandlers({
    ipcMain: failingIpc,
    coordinator,
    isTrustedSender: trustedSender,
    openExternal: async () => {
      calls += 1;
      throw new Error(`provider failure containing ${allowedUrl}`);
    }
  });
  assert.deepEqual(
    await failingIpc.invoke(SESSION_CHANNELS.openOutlookAuthorization, { url: allowedUrl }),
    { opened: false, handoff_accepted: false, reason: "outlook_authorization_open_failed" }
  );
  await assert.rejects(
    () => failingIpc.invoke(
      SESSION_CHANNELS.openOutlookAuthorization,
      { url: allowedUrl },
      { senderFrame: { url: "file:///tmp/untrusted.html" } }
    ),
    (error) => error?.code === "UNTRUSTED_RENDERER_IPC_SENDER"
  );
  assert.equal(calls, 1);
  failingRegistration.dispose();
});

test("Outlook authorization handoff fails closed when the opener never settles", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator,
    isTrustedSender: trustedSender,
    outlookAuthorizationOpenTimeoutMs: 1,
    openExternal: () => new Promise(() => {})
  });

  const result = await ipcMain.invoke(SESSION_CHANNELS.openOutlookAuthorization, {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=lawos-test"
  });
  assert.deepEqual(result, {
    opened: false,
    handoff_accepted: false,
    reason: "outlook_authorization_open_timeout"
  });
  assert.equal(JSON.stringify(result).includes("lawos-test"), false);
  registration.dispose();
});

test("session IPC preserves login lockout state without signing the renderer in", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({
    runtimeClient: {
      login: async () => ({
        ok: false,
        reason: "auth_login_locked",
        safe_error_codes: ["AUTH_LOGIN_LOCKED"],
        locked_until: "2026-07-02T00:15:00.000Z",
        token_material_returned: false
      })
    }
  });
  const registration = registerSessionIpcHandlers({ ipcMain, coordinator, isTrustedSender: trustedSender });

  const locked = await ipcMain.invoke(SESSION_CHANNELS.login, { email: "jwsuh@amic.kr", password: "bad-password" });
  assert.equal(locked.ok, false);
  assert.deepEqual(locked.safe_error_codes, ["AUTH_LOGIN_LOCKED"]);
  assert.equal(locked.locked_until, "2026-07-02T00:15:00.000Z");
  assert.equal(locked.session.state, "signed_out");
  assert.equal(locked.session.reason, "auth_login_locked");
  assert.equal(locked.token_material_returned, false);
  assert.equal(JSON.stringify(locked).includes("bad-password"), false);

  registration.dispose();
});

test("session IPC rejects an untrusted sender before coordinator access", async () => {
  const ipcMain = new FakeIpcMain();
  let calls = 0;
  const registration = registerSessionIpcHandlers({
    ipcMain,
    coordinator: {
      sessionStatus() {
        calls += 1;
        return { state: "signed_in" };
      }
    },
    isTrustedSender: trustedSender
  });

  await assert.rejects(
    () => ipcMain.invoke(SESSION_CHANNELS.status, undefined, { senderFrame: { url: "file:///tmp/untrusted.html" } }),
    (error) => error?.code === "UNTRUSTED_RENDERER_IPC_SENDER"
  );
  assert.equal(calls, 0);
  assert.equal((await ipcMain.invoke(
    SESSION_CHANNELS.status,
    undefined,
    { senderFrame: { url: "matter-app://app/index.html?desktop=1" } },
  )).state, "signed_in");
  assert.equal(calls, 1);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.status)).state, "signed_in");
  assert.equal(calls, 2);
  registration.dispose();
});
