import assert from "node:assert/strict";
import test from "node:test";
import { MainProcessAuthCoordinator } from "../src/main/auth.js";
import { registerSessionIpcHandlers, SESSION_CHANNELS } from "../src/main/session-ipc.js";

class FakeIpcMain {
  handlers = new Map();

  handle(channel, handler) {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel) {
    this.handlers.delete(channel);
  }

  invoke(channel, payload) {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`missing handler: ${channel}`);
    return handler({}, payload);
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
    })
  };
}

test("session IPC exposes account login and smoke without renderer token material", async () => {
  const ipcMain = new FakeIpcMain();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient: fakeRuntimeClient() });
  const registration = registerSessionIpcHandlers({ ipcMain, coordinator });

  assert.deepEqual(registration.channels.sort(), Object.values(SESSION_CHANNELS).sort());
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.runtime)).configured, true);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.accounts)).users.length, 2);
  assert.equal((await ipcMain.invoke(SESSION_CHANNELS.requestPasswordReset, { email: "jwsuh@amic.kr" })).accepted, true);
  const resetEmail = await ipcMain.invoke(SESSION_CHANNELS.latestResetEmail, { email: "jwsuh@amic.kr" });
  assert.equal(resetEmail.email_message.reset_token, "reset-token");
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

  registration.dispose();
  assert.equal(ipcMain.handlers.size, 0);
});
