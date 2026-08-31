import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MainProcessAuthCoordinator, memorySecureStore } from "../src/main/auth.js";
import { desktopPreloadPath } from "../src/main/main.js";

function fakeCache() {
  return {
    cleared: false,
    async clear() {
      this.cleared = true;
    }
  };
}

test("session status omits token bodies while secure store retains main-process material", async () => {
  const secureStore = memorySecureStore();
  const coordinator = new MainProcessAuthCoordinator({ secureStore });
  const request = coordinator.startLogin({
    issuerUrl: "https://idp.example.com",
    clientId: "matter-desktop",
    redirectUri: "matter://auth/callback"
  });

  const status = await coordinator.completeCallback({
    code: "auth_code_001",
    state: request.state,
    tokenSet: {
      access_token: "access_secret",
      refresh_token: "refresh_secret",
      id_token: "id_secret"
    }
  });

  assert.equal(JSON.stringify(status).includes("access_token"), false);
  assert.equal(JSON.stringify(status).includes("refresh_token"), false);
  assert.equal(JSON.stringify(status).includes("access_secret"), false);
  assert.equal(secureStore.snapshot().token_set.refresh_token, "refresh_secret");
});

test("explicit login clears the prior account cache before persisting the new session", async () => {
  const secureStore = memorySecureStore();
  const order = [];
  await secureStore.set("session_token", "prior-session");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    cacheStores: [{
      async clear() {
        order.push("cache-clear");
      },
    }],
    runtimeClient: {
      async login() {
        order.push("runtime-login");
        return {
          ok: true,
          session_token: "new-session",
          session: { state: "signed_in", email: "new@example.com" },
        };
      },
    },
  });

  const result = await coordinator.login({ email: "new@example.com", password: "secret" });

  assert.deepEqual(order, ["cache-clear", "runtime-login"]);
  assert.equal(secureStore.snapshot().session_token, "new-session");
  assert.equal(result.session.email, "new@example.com");
  assert.equal(JSON.stringify(result).includes("new-session"), false);
});

test("explicit login fails closed before authentication when local preview cleanup fails", async () => {
  const secureStore = memorySecureStore();
  let runtimeLoginCount = 0;
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    cacheStores: [{
      async clear() {
        throw new Error("preview cleanup failed");
      },
    }],
    runtimeClient: {
      async login() {
        runtimeLoginCount += 1;
        return { ok: true };
      },
    },
  });

  const result = await coordinator.login({ email: "new@example.com", password: "secret" });

  assert.equal(runtimeLoginCount, 0);
  assert.deepEqual(secureStore.snapshot(), {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, "local_session_cleanup_failed");
  assert.equal(result.session.state, "signed_out");
  assert.equal(JSON.stringify(result).includes("preview cleanup failed"), false);
});

test("logout clears secure store and registered cache stores", async () => {
  const secureStore = memorySecureStore();
  const apiCache = fakeCache();
  const rendererCache = fakeCache();
  const coordinator = new MainProcessAuthCoordinator({ secureStore, cacheStores: [apiCache, rendererCache] });
  const request = coordinator.startLogin({
    issuerUrl: "https://idp.example.com",
    clientId: "matter-desktop",
    redirectUri: "matter://auth/callback"
  });

  await coordinator.completeCallback({
    code: "auth_code_001",
    state: request.state,
    tokenSet: { access_token: "access_secret", refresh_token: "refresh_secret" }
  });
  await coordinator.logout();

  assert.deepEqual(secureStore.snapshot(), {});
  assert.equal(apiCache.cleared, true);
  assert.equal(rendererCache.cleared, true);
});

test("logout revokes the server session before clearing every local cache", async () => {
  const secureStore = memorySecureStore();
  const cache = fakeCache();
  const calls = [];
  await secureStore.set("session_token", "lawos_session_v1.secret");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    cacheStores: [cache],
    runtimeClient: {
      async logout({ sessionToken }) {
        calls.push(sessionToken);
        return { ok: true, replayed: false, http_status: 200, session_token: "must-not-render" };
      }
    }
  });

  const result = await coordinator.logout();

  assert.deepEqual(calls, ["lawos_session_v1.secret"]);
  assert.deepEqual(secureStore.snapshot(), {});
  assert.equal(cache.cleared, true);
  assert.deepEqual(result.server_revoke, { attempted: true, ok: true, reason: null, http_status: 200 });
  assert.equal(result.local_cache_cleared, true);
  assert.equal(JSON.stringify(result).includes("lawos_session_v1.secret"), false);
  assert.equal(JSON.stringify(result).includes("must-not-render"), false);
});

test("logout clears local session material when server revocation fails", async () => {
  const secureStore = memorySecureStore();
  const cache = fakeCache();
  await secureStore.set("session_token", "lawos_session_v1.secret");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    cacheStores: [cache],
    runtimeClient: {
      async logout() {
        throw new Error("network response included lawos_session_v1.secret");
      }
    }
  });

  const result = await coordinator.logout();

  assert.deepEqual(secureStore.snapshot(), {});
  assert.equal(cache.cleared, true);
  assert.deepEqual(result.server_revoke, {
    attempted: true,
    ok: false,
    reason: "server_session_revoke_failed",
    http_status: 0
  });
  assert.equal(result.local_cache_cleared, true);
  assert.equal(JSON.stringify(result).includes("lawos_session_v1.secret"), false);
  assert.equal(JSON.stringify(result).includes("network response"), false);
});

test("logout still clears every local cache when reading the signed session fails", async () => {
  let secureStoreCleared = false;
  let runtimeCalls = 0;
  const cache = fakeCache();
  const coordinator = new MainProcessAuthCoordinator({
    secureStore: {
      async get() {
        throw new Error("secure store read included secret material");
      },
      async clear() {
        secureStoreCleared = true;
      }
    },
    cacheStores: [cache],
    runtimeClient: {
      async logout() {
        runtimeCalls += 1;
      }
    }
  });

  const result = await coordinator.logout();

  assert.equal(secureStoreCleared, true);
  assert.equal(cache.cleared, true);
  assert.equal(runtimeCalls, 0);
  assert.equal(result.local_cache_cleared, true);
  assert.deepEqual(result.server_revoke, {
    attempted: true,
    ok: false,
    reason: "server_session_revoke_failed",
    http_status: 0
  });
  assert.equal(JSON.stringify(result).includes("secret material"), false);
});

test("logout attempts all local cache clears and reports an incomplete wipe safely", async () => {
  const secureStore = memorySecureStore();
  const laterCache = fakeCache();
  await secureStore.set("session_token", "lawos_session_v1.secret");
  const coordinator = new MainProcessAuthCoordinator({
    secureStore,
    cacheStores: [
      { async clear() { throw new Error("cache contained lawos_session_v1.secret"); } },
      laterCache
    ],
    runtimeClient: { async logout() { return { ok: true, http_status: 200 }; } }
  });

  const result = await coordinator.logout();

  assert.deepEqual(secureStore.snapshot(), {});
  assert.equal(laterCache.cleared, true);
  assert.equal(result.local_cache_cleared, false);
  assert.equal(JSON.stringify(result).includes("lawos_session_v1.secret"), false);
});

test("preload session API source does not expose token storage APIs", async () => {
  const preloadSource = await readFile(desktopPreloadPath(), "utf8");

  assert.doesNotMatch(preloadSource, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(preloadSource, /access_token|refresh_token|id_token/);
  assert.doesNotMatch(preloadSource, /exposeInMainWorld\([^)]*ipcRenderer/);
});
