import assert from "node:assert/strict";
import test from "node:test";
import { MainProcessAuthCoordinator, memorySecureStore } from "../src/main/auth.js";

test("auth coordinator starts PKCE login without exposing verifier or tokens", () => {
  const coordinator = new MainProcessAuthCoordinator();
  const request = coordinator.startLogin({
    issuerUrl: "https://idp.example.com",
    clientId: "mater-desktop",
    redirectUri: "mater://auth/callback",
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
    clientId: "mater-desktop",
    redirectUri: "mater://auth/callback",
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
    clientId: "mater-desktop",
    redirectUri: "mater://auth/callback"
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

  assert.deepEqual(await coordinator.logout(), { state: "signed_out" });
  assert.deepEqual(secureStore.snapshot(), {});
});
