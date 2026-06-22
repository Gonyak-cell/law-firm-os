import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { MainProcessAuthCoordinator, memorySecureStore } from "../src/main/auth.js";

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

test("preload session API source does not expose token storage APIs", async () => {
  const preloadSource = await readFile(resolve("src/preload/session.js"), "utf8");

  assert.doesNotMatch(preloadSource, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(preloadSource, /access_token|refresh_token|id_token/);
  assert.doesNotMatch(preloadSource, /exposeInMainWorld\([^)]*ipcRenderer/);
});
