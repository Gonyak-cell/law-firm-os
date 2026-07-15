import assert from "node:assert/strict";
import test from "node:test";
import { MainProcessAuthCoordinator } from "../src/main/auth.js";
import { APPROVED_DEV_RENDERER_URL } from "../src/main/origin-policy.js";
import { registerSessionIpcHandlers, SESSION_CHANNELS } from "../src/main/session-ipc.js";

const trustedSender = (event) => event?.senderFrame?.url === APPROVED_DEV_RENDERER_URL;

class FakeIpcMain {
  handlers = new Map();

  handle(channel, handler) {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel) {
    this.handlers.delete(channel);
  }

  invoke(channel, payload, event = { senderFrame: { url: APPROVED_DEV_RENDERER_URL } }) {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`missing handler: ${channel}`);
    return handler(event, payload);
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
  const registration = registerSessionIpcHandlers({ ipcMain, coordinator, isTrustedSender: trustedSender });

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

  registration.dispose();
  assert.equal(ipcMain.handlers.size, 0);
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
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.status)).state, "signed_in");
  assert.equal(calls, 1);
  registration.dispose();
});
