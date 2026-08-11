import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { MainProcessAuthCoordinator, encryptedFileSecureStore, memorySecureStore } from "../src/main/auth.js";

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`encrypted:${value}`, "utf8"),
    decryptString: (value) => String(value).replace(/^encrypted:/, "")
  };
}

test("auth coordinator starts PKCE login without exposing verifier or tokens", () => {
  const coordinator = new MainProcessAuthCoordinator();
  const request = coordinator.startLogin({
    issuerUrl: "https://idp.example.com",
    clientId: "matter-desktop",
    redirectUri: "matter://auth/callback",
    tenantIdHash: "tenant_hash_001"
  });

  assert.match(request.authorizationUrl, /code_challenge=/);
  assert.match(request.authorizationUrl, /code_challenge_method=S256/);
  assert.equal("verifier" in request, false);
  assert.equal(JSON.stringify(request).includes("access_token"), false);
  assert.equal(JSON.stringify(request).includes("refresh_token"), false);
});

test("auth coordinator stores token material in secure store and returns session status only", async () => {
  const secureStore = memorySecureStore();
  const coordinator = new MainProcessAuthCoordinator({ secureStore, now: () => 1000 });
  const request = coordinator.startLogin({
    issuerUrl: "https://idp.example.com",
    clientId: "matter-desktop",
    redirectUri: "matter://auth/callback",
    tenantIdHash: "tenant_hash_001"
  });

  const status = await coordinator.completeCallback({
    code: "auth_code_001",
    state: request.state,
    tokenSet: {
      access_token: "access_secret",
      refresh_token: "refresh_secret",
      id_token: "id_secret",
      expires_at: 2000
    }
  });

  assert.deepEqual(status, {
    state: "signed_in",
    tenantIdHash: "tenant_hash_001",
    expiresAt: 2000
  });
  assert.equal(JSON.stringify(status).includes("access_secret"), false);
  assert.equal(JSON.stringify(status).includes("refresh_secret"), false);
  assert.equal(secureStore.snapshot().token_set.access_token, "access_secret");
});

test("auth coordinator rejects state mismatch and clears session on logout", async () => {
  const secureStore = memorySecureStore();
  const coordinator = new MainProcessAuthCoordinator({ secureStore });
  coordinator.startLogin({
    issuerUrl: "https://idp.example.com",
    clientId: "matter-desktop",
    redirectUri: "matter://auth/callback"
  });

  await assert.rejects(
    () =>
      coordinator.completeCallback({
        code: "auth_code_001",
        state: "wrong_state",
        tokenSet: { access_token: "secret" }
      }),
    /state mismatch/
  );

  assert.deepEqual(await coordinator.logout(), {
    state: "signed_out",
    server_revoke: {
      attempted: false,
      ok: false,
      reason: "signed_session_not_available",
      http_status: 0
    },
    local_cache_cleared: true,
    token_material_returned: false
  });
  assert.deepEqual(secureStore.snapshot(), {});
});

test("auth coordinator signs into AWS runtime account without exposing operator material", async () => {
  const secureStore = memorySecureStore();
  let featureSessionToken = "";
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      login: async ({ email, password }) => ({
        ok: true,
        session_token: "lawos_session_v1.secret",
        session: {
          state: "signed_in",
          email,
          highest_privilege: "system_super_admin",
          role_ids: ["system_super_admin"],
          operatorToken: "must-not-render"
        },
        password_seen_by_runtime: Boolean(password),
        features: [{ feature_id: "matter_vault_admin", allowed: true, decision: "allow" }]
      }),
      features: async ({ sessionToken }) => {
        featureSessionToken = sessionToken;
        return { ok: true, features: [{ feature_id: "matter_vault_dashboard", allowed: true }] };
      }
    }
  });

  const response = await coordinator.login({ email: "jwsuh@amic.kr", password: "new-password" });
  const features = await coordinator.features();

  assert.equal(response.session.email, "jwsuh@amic.kr");
  assert.equal(response.session.highest_privilege, "system_super_admin");
  assert.equal(JSON.stringify(response).includes("must-not-render"), false);
  assert.equal(JSON.stringify(response).includes("operatorToken"), false);
  assert.equal(JSON.stringify(response).includes("new-password"), false);
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
  assert.equal(secureStore.snapshot().session_token, "lawos_session_v1.secret");
  assert.equal(featureSessionToken, "lawos_session_v1.secret");
  assert.equal(features.features[0].feature_id, "matter_vault_dashboard");
});

test("encrypted file secure store persists session token without plaintext token material", async () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "matter-desktop-secure-store-")), "secure-session-store.json");
  const store = encryptedFileSecureStore({ filePath, safeStorage: fakeSafeStorage() });

  await store.set("session_token", "lawos_session_v1.secret");
  await store.set("session_snapshot", { email: "matter.desktop.qa@amic.kr", state: "signed_in" });
  await store.set("token_set", { access_token: "access_secret" });

  const raw = readFileSync(filePath, "utf8");
  assert.equal(raw.includes("lawos_session_v1.secret"), false);
  assert.equal(raw.includes("matter.desktop.qa@amic.kr"), false);
  assert.equal(raw.includes("access_secret"), false);

  const reloaded = encryptedFileSecureStore({ filePath, safeStorage: fakeSafeStorage() });
  assert.equal(await reloaded.get("session_token"), "lawos_session_v1.secret");
  assert.deepEqual(await reloaded.get("session_snapshot"), { email: "matter.desktop.qa@amic.kr", state: "signed_in" });
  assert.equal(await reloaded.get("token_set"), undefined);
  await reloaded.clear();
  assert.equal(existsSync(filePath), false);
});

test("encrypted file secure store preserves persisted file when parsing fails", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "matter-desktop-secure-store-")), "secure-session-store.json");
  writeFileSync(filePath, "{not-json");
  const before = readFileSync(filePath, "utf8");

  const store = encryptedFileSecureStore({ filePath, safeStorage: fakeSafeStorage() });

  assert.equal(existsSync(filePath), true);
  assert.equal(readFileSync(filePath, "utf8"), before);
  assert.deepEqual(store.snapshot(), {});
});

test("encrypted file secure store preserves persisted file when decryption fails", async () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "matter-desktop-secure-store-")), "secure-session-store.json");
  const store = encryptedFileSecureStore({ filePath, safeStorage: fakeSafeStorage() });
  await store.set("session_token", "lawos_session_v1.secret");
  const before = readFileSync(filePath, "utf8");

  const unavailableKeychain = {
    isEncryptionAvailable: () => true,
    decryptString: () => {
      throw new Error("Keychain unavailable");
    }
  };
  const reloaded = encryptedFileSecureStore({ filePath, safeStorage: unavailableKeychain });

  assert.equal(existsSync(filePath), true);
  assert.equal(readFileSync(filePath, "utf8"), before);
  assert.deepEqual(reloaded.snapshot(), {});
});

test("auth coordinator restores a persisted session through runtime verification", async () => {
  const secureStore = memorySecureStore();
  await secureStore.set("session_token", "lawos_session_v1.secret");
  let observedSessionToken = "";
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      features: async ({ sessionToken }) => {
        observedSessionToken = sessionToken;
        return {
          ok: true,
          session: {
            state: "signed_in",
            email: "jwsuh@amic.kr",
            user_id: "user_amic_jwsuh",
            tenant_id: "tenant_amic_matter_vault",
            role_ids: ["system_super_admin"],
            session_token: "must-not-render"
          }
        };
      }
    }
  });

  const session = await coordinator.restoreSession();

  assert.equal(observedSessionToken, "lawos_session_v1.secret");
  assert.equal(session.email, "jwsuh@amic.kr");
  assert.deepEqual(session.role_ids, ["system_super_admin"]);
  assert.equal(JSON.stringify(session).includes("lawos_session_v1.secret"), false);
  assert.equal(JSON.stringify(session).includes("must-not-render"), false);
});

test("auth coordinator persists and restores tokenless desktop sessions through account validation", async () => {
  const secureStore = memorySecureStore();
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      login: async ({ email }) => ({
        ok: true,
        session: {
          state: "signed_in",
          email,
          user_id: "user_amic_matter_desktop_qa",
          tenant_id: "tenant_amic_matter_vault",
          role_ids: ["matter_vault_user"],
          password: "must-not-render"
        },
        token_material_returned: false
      }),
      accounts: async () => ({
        ok: true,
        users: [
          {
            email: "matter.desktop.qa@amic.kr",
            status: "active",
            role_ids: ["matter_vault_user"],
            tenant_ids: ["tenant_amic_matter_vault"],
            scopes: ["matter.read"]
          }
        ],
        token_material_returned: false
      })
    }
  });

  const login = await coordinator.login({ email: "matter.desktop.qa@amic.kr", password: "qa-password" });
  assert.equal(login.ok, true);
  assert.equal(await secureStore.get("session_token"), undefined);
  assert.equal((await secureStore.get("session_snapshot")).email, "matter.desktop.qa@amic.kr");
  assert.equal(JSON.stringify(await secureStore.get("session_snapshot")).includes("must-not-render"), false);

  const restoredCoordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      accounts: async () => ({
        ok: true,
        users: [
          {
            email: "matter.desktop.qa@amic.kr",
            status: "active",
            role_ids: ["matter_vault_user"],
            tenant_ids: ["tenant_amic_matter_vault"],
            scopes: ["matter.read"]
          }
        ],
        token_material_returned: false
      })
    }
  });
  const restored = await restoredCoordinator.restoreSession();

  assert.equal(restored.email, "matter.desktop.qa@amic.kr");
  assert.equal(restored.state, "signed_in");
  assert.deepEqual(restored.scopes, ["matter.read"]);
});

test("auth coordinator preserves persisted session when runtime verification returns 5xx", async () => {
  const secureStore = memorySecureStore();
  await secureStore.set("session_token", "lawos_session_v1.server-error");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      features: async () => ({
        ok: false,
        reason: "dependency_unavailable",
        safe_error_codes: ["API_DEPENDENCY_UNAVAILABLE"],
        http_status: 503,
        token_material_returned: false
      })
    }
  });

  const session = await coordinator.restoreSession();

  assert.deepEqual(session, { state: "signed_out", reason: "dependency_unavailable" });
  assert.equal(await secureStore.get("session_token"), "lawos_session_v1.server-error");
  assert.equal(JSON.stringify(session).includes("lawos_session_v1.server-error"), false);
});

test("auth coordinator preserves persisted session when runtime verification throws a network error", async () => {
  const secureStore = memorySecureStore();
  await secureStore.set("session_token", "lawos_session_v1.network-error");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      features: async () => {
        throw new Error("network failed while handling lawos_session_v1.network-error");
      }
    }
  });

  const session = await coordinator.restoreSession();

  assert.deepEqual(session, { state: "signed_out", reason: "runtime_request_failed" });
  assert.equal(await secureStore.get("session_token"), "lawos_session_v1.network-error");
  assert.equal(JSON.stringify(session).includes("lawos_session_v1.network-error"), false);
});

test("auth coordinator preserves persisted session for unclassified upstream auth failures", async () => {
  for (const httpStatus of [401, 403]) {
    const secureStore = memorySecureStore();
    const sessionToken = `lawos_session_v1.proxy-${httpStatus}`;
    await secureStore.set("session_token", sessionToken);
    const coordinator = new MainProcessAuthCoordinator({
      secureStore,
      runtimeClient: {
        features: async () => ({
          ok: false,
          reason: "upstream_auth_proxy_error",
          http_status: httpStatus,
          token_material_returned: false
        })
      }
    });

    const session = await coordinator.restoreSession();

    assert.deepEqual(session, { state: "signed_out", reason: "session_restore_deferred" });
    assert.equal(await secureStore.get("session_token"), sessionToken);
    assert.equal(JSON.stringify(session).includes(sessionToken), false);
  }
});

test("auth coordinator preserves persisted session when the server received no bearer", async () => {
  const secureStore = memorySecureStore();
  await secureStore.set("session_token", "lawos_session_v1.missing-bearer");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      features: async () => ({
        ok: false,
        reason: "auth_session_required",
        safe_error_codes: ["AUTH_SESSION_REQUIRED"],
        http_status: 401,
        token_material_returned: false
      })
    }
  });

  const session = await coordinator.restoreSession();

  assert.deepEqual(session, { state: "signed_out", reason: "session_restore_deferred" });
  assert.equal(await secureStore.get("session_token"), "lawos_session_v1.missing-bearer");
  assert.equal(JSON.stringify(session).includes("lawos_session_v1.missing-bearer"), false);
});

test("auth coordinator preserves persisted session for login-only credential errors", async () => {
  const secureStore = memorySecureStore();
  await secureStore.set("session_token", "lawos_session_v1.login-error");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      features: async () => ({
        ok: false,
        reason: "auth_credential_invalid",
        safe_error_codes: ["AUTH_CREDENTIAL_INVALID"],
        http_status: 401,
        token_material_returned: false
      })
    }
  });

  const session = await coordinator.restoreSession();

  assert.deepEqual(session, { state: "signed_out", reason: "session_restore_deferred" });
  assert.equal(await secureStore.get("session_token"), "lawos_session_v1.login-error");
});

test("auth coordinator ignores terminal-looking error codes on non-auth responses", async () => {
  for (const httpStatus of [0, 200, 429, 503]) {
    const secureStore = memorySecureStore();
    const sessionToken = `lawos_session_v1.stale-code-${httpStatus}`;
    await secureStore.set("session_token", sessionToken);
    const coordinator = new MainProcessAuthCoordinator({
      secureStore,
      runtimeClient: {
        features: async () => ({
          ok: false,
          reason: "auth_session_invalid",
          safe_error_codes: ["AUTH_SESSION_INVALID"],
          http_status: httpStatus,
          token_material_returned: false
        })
      }
    });

    await coordinator.restoreSession();

    assert.equal(await secureStore.get("session_token"), sessionToken);
  }
});

test("auth coordinator drops persisted session on terminal authentication failure", async () => {
  const secureStore = memorySecureStore();
  await secureStore.set("session_token", "lawos_session_v1.revoked");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    runtimeClient: {
      features: async () => ({
        ok: false,
        reason: "auth_session_invalid",
        safe_error_codes: ["AUTH_SESSION_INVALID"],
        http_status: 401,
        token_material_returned: false
      })
    }
  });

  const session = await coordinator.restoreSession();

  assert.deepEqual(session, { state: "signed_out", reason: "auth_session_invalid" });
  assert.equal(await secureStore.get("session_token"), undefined);
});

test("verified desktop principal reaches only the lifecycle hook and logout only stops it", async () => {
  const secureStore = memorySecureStore();
  const events = [];
  const principalRef =
    "odpr_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    outlookLifecycle: {
      async sessionAvailable(session) {
        events.push({ type: "session", session });
        return { state: "ready" };
      },
      stop(input) {
        events.push({ type: "stop", input });
      },
      async refresh() {
        events.push({ type: "refresh" });
        return {
          state: "ready",
          next_action: "none",
          browser_required: false,
          safe_error_codes: [],
          token_material_returned: false,
          private_key_material_returned: false,
          production_ready_claim: false,
        };
      },
    },
    runtimeClient: {
      async login() {
        return {
          ok: true,
          session_token: "lawos_session_v1.lifecycle-secret",
          session: {
            state: "signed_in",
            email: "lifecycle-user@example.invalid",
            tenant_id: "tenant-lifecycle",
            user_id: "user-lifecycle",
            outlook_desktop_principal_ref: principalRef,
          },
        };
      },
      async logout() {
        return { ok: true, http_status: 200 };
      },
    },
  });

  const login = await coordinator.login({
    email: "lifecycle-user@example.invalid",
    password: "not-rendered",
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].session.outlook_desktop_principal_ref, principalRef);
  assert.equal(
    JSON.stringify(login).includes("outlook_desktop_principal_ref"),
    false,
  );
  assert.equal(JSON.stringify(login).includes(principalRef), false);
  assert.equal((await coordinator.refreshOutlookLifecycle()).state, "ready");
  await coordinator.logout();
  assert.deepEqual(events.map(({ type }) => type), [
    "session",
    "refresh",
    "stop",
  ]);
  assert.deepEqual(events[2].input, { reason: "logout" });
});
