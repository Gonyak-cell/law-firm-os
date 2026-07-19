import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import test from "node:test";
import { createEntraOidcProvider } from "../src/entra-oidc-provider.js";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_ID = "33333333-3333-4333-8333-333333333333";
const REDIRECT_URI = "matter://auth/callback";
const NOW = Date.parse("2026-07-18T01:00:00.000Z");

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = publicKey.export({ format: "jwk" });
  Object.assign(jwk, { kid: "entra-test-key", use: "sig", alg: "RS256" });
  let tokenResponse = null;
  const fetchFn = async (url) => {
    if (String(url).endsWith("/discovery/v2.0/keys")) {
      return { ok: true, json: async () => ({ keys: [jwk] }) };
    }
    return { ok: true, json: async () => tokenResponse };
  };
  const provider = createEntraOidcProvider({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      redirect_uris: [REDIRECT_URI],
      conditional_access_auth_context_id: "c1",
    },
    fetchFn,
    now: () => NOW,
  });
  function token(claims = {}) {
    const header = encode({ alg: "RS256", kid: jwk.kid, typ: "JWT" });
    const payload = encode({
      iss: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      tid: TENANT_ID,
      aud: CLIENT_ID,
      oid: SUBJECT_ID,
      sub: SUBJECT_ID,
      preferred_username: "owner@example.test",
      name: "Owner Test",
      iat: Math.floor(NOW / 1000) - 60,
      auth_time: Math.floor(NOW / 1000) - 60,
      nbf: Math.floor(NOW / 1000) - 60,
      exp: Math.floor(NOW / 1000) + 300,
      nonce: "nonce-value",
      amr: ["mfa", "fido2"],
      acrs: ["c1"],
      ...claims,
    });
    const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
    return `${header}.${payload}.${signature}`;
  }
  return { provider, token, setTokenResponse: (value) => { tokenResponse = value; } };
}

test("Entra OIDC provider requires PKCE, MFA, FIDO2/WebAuthn and Conditional Access context", async () => {
  const fixture = createFixture();
  const authorization = fixture.provider.createAuthorizationRequest({
    redirect_uri: REDIRECT_URI,
    code_challenge: "a".repeat(43),
    login_hint: "owner@example.test",
  });
  const authorizeUrl = new URL(authorization.authorization_url);
  assert.equal(authorizeUrl.searchParams.get("code_challenge_method"), "S256");
  assert.equal(authorizeUrl.searchParams.get("client_id"), CLIENT_ID);
  assert.equal(authorizeUrl.searchParams.has("max_age"), false);
  assert.equal(authorization.token_material_returned, true);

  const verified = await fixture.provider.verifyIdToken(fixture.token(), {
    expected_nonce_hash: createHash("sha256").update("different-nonce").digest("hex"),
  }).catch((error) => error);
  assert.equal(verified.safe_error_code, "ENTRA_NONCE_INVALID");

  const nonceHash = createHash("sha256").update("nonce-value").digest("hex");
  const accepted = await fixture.provider.verifyIdToken(fixture.token(), { expected_nonce_hash: nonceHash });
  assert.equal(accepted.assurance_level, "phishing-resistant-mfa");
  assert.equal(accepted.factor, "fido2-webauthn");

  await assert.rejects(
    fixture.provider.verifyIdToken(fixture.token({ amr: ["mfa"] }), { expected_nonce_hash: nonceHash }),
    (error) => error?.safe_error_code === "ENTRA_PHISHING_RESISTANT_MFA_REQUIRED",
  );
  await assert.rejects(
    fixture.provider.verifyIdToken(fixture.token({ acrs: [] }), { expected_nonce_hash: nonceHash }),
    (error) => error?.safe_error_code === "ENTRA_CONDITIONAL_ACCESS_REQUIRED",
  );
  await assert.rejects(
    fixture.provider.verifyIdToken(fixture.token({ amr: ["fido2"] }), { expected_nonce_hash: nonceHash }),
    (error) => error?.safe_error_code === "ENTRA_MFA_REQUIRED",
  );
});

test("Entra OIDC provider binds multi-audience tokens to this client", async () => {
  const fixture = createFixture();
  const nonceHash = createHash("sha256").update("nonce-value").digest("hex");

  await assert.rejects(
    fixture.provider.verifyIdToken(fixture.token({ aud: [CLIENT_ID, "api://other"] }), {
      expected_nonce_hash: nonceHash,
    }),
    (error) => error?.safe_error_code === "ENTRA_AUTHORIZED_PARTY_INVALID",
  );
  await assert.rejects(
    fixture.provider.verifyIdToken(fixture.token({ aud: [CLIENT_ID, "api://other"], azp: "api://other" }), {
      expected_nonce_hash: nonceHash,
    }),
    (error) => error?.safe_error_code === "ENTRA_AUTHORIZED_PARTY_INVALID",
  );
  const accepted = await fixture.provider.verifyIdToken(
    fixture.token({ aud: [CLIENT_ID, "api://other"], azp: CLIENT_ID }),
    { expected_nonce_hash: nonceHash },
  );
  assert.equal(accepted.assertion_id, SUBJECT_ID);
});

test("Entra OIDC step-up requires a fresh auth_time and sends max_age", async () => {
  const fixture = createFixture();
  const nonceHash = createHash("sha256").update("nonce-value").digest("hex");
  const authorization = fixture.provider.createAuthorizationRequest({
    redirect_uri: REDIRECT_URI,
    code_challenge: "a".repeat(43),
    login_hint: "owner@example.test",
    max_age_seconds: 300,
  });
  assert.equal(new URL(authorization.authorization_url).searchParams.get("max_age"), "300");

  for (const authTime of [undefined, Math.floor(NOW / 1000) - 301, Math.floor(NOW / 1000) + 61]) {
    const claims = authTime == null ? { auth_time: null } : { auth_time: authTime };
    await assert.rejects(
      fixture.provider.verifyIdToken(fixture.token(claims), {
        expected_nonce_hash: nonceHash,
        max_auth_age_ms: 300_000,
      }),
      (error) => error?.safe_error_code === "ENTRA_REAUTHENTICATION_REQUIRED",
    );
  }
  const accepted = await fixture.provider.verifyIdToken(
    fixture.token({ auth_time: Math.floor(NOW / 1000) - 299 }),
    { expected_nonce_hash: nonceHash, max_auth_age_ms: 300_000 },
  );
  assert.equal(accepted.authenticated_at, "2026-07-18T00:55:01.000Z");
});

test("Entra authorization-code completion returns only validated identity assurance", async () => {
  const fixture = createFixture();
  const nonceHash = createHash("sha256").update("nonce-value").digest("hex");
  fixture.setTokenResponse({ id_token: fixture.token(), access_token: "must-not-return" });
  const completed = await fixture.provider.completeAuthorization({
    code: "one-time-code",
    redirect_uri: REDIRECT_URI,
    code_verifier: "b".repeat(43),
    expected_nonce_hash: nonceHash,
  });
  assert.equal(completed.email, "owner@example.test");
  assert.equal(completed.provider_id, "microsoft-entra-id-oidc");
  assert.equal(Object.hasOwn(completed, "access_token"), false);
  assert.equal(Object.hasOwn(completed, "id_token"), false);
});
