import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import test from "node:test";

import {
  CLIENT_OUTLOOK_OAUTH_SCOPES,
  PEOPLE_OUTLOOK_OAUTH_SCOPES,
  createMicrosoftDelegatedOAuthClient,
} from "../src/microsoft-delegated-oauth-client.js";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const REDIRECT_URI = "matter://auth/callback";
const NOW = Date.parse("2026-08-03T03:00:00.000Z");
const NONCE = "delegated-oauth-nonce-20260803";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jwt(privateKey, claims) {
  const header = Buffer.from(JSON.stringify({
    alg: "RS256",
    kid: "people-outlook-test-key",
    typ: "JWT",
  })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    privateKey,
  ).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

function fixture({
  scopes = PEOPLE_OUTLOOK_OAUTH_SCOPES,
  claims = {},
} = {}) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  const idToken = jwt(privateKey, {
    iss: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    tid: TENANT_ID,
    aud: CLIENT_ID,
    oid: "entra-subject-jwsuh",
    preferred_username: "jwsuh@amic.kr",
    nonce: NONCE,
    iat: Math.floor(NOW / 1000),
    nbf: Math.floor(NOW / 1000) - 10,
    exp: Math.floor(NOW / 1000) + 3600,
    ...claims,
  });
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/discovery/v2.0/keys")) {
      return new Response(JSON.stringify({
        keys: [{
          ...jwk,
          kid: "people-outlook-test-key",
          use: "sig",
          alg: "RS256",
        }],
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/oauth2/v2.0/token")) {
      return new Response(JSON.stringify({
        token_type: "Bearer",
        access_token: "provider-access-token-never-persist",
        refresh_token: "provider-refresh-token-never-persist",
        id_token: idToken,
        expires_in: 3600,
        scope: scopes.join(" "),
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected URL: ${url}`);
  };
  return { calls, fetchImpl };
}

test("delegated OAuth requests only Calendars.ReadBasic and validates the signed Microsoft account", async () => {
  const provider = fixture();
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    },
    fetch_impl: provider.fetchImpl,
    clock: () => NOW,
  });
  const authorizationUrl = new URL(client.authorizationUrl({
    state: "A".repeat(43),
    code_challenge: "B".repeat(43),
    nonce: NONCE,
    login_hint: "jwsuh@amic.kr",
  }));
  const requestedScopes = authorizationUrl.searchParams.get("scope").split(" ");
  assert.deepEqual(requestedScopes, PEOPLE_OUTLOOK_OAUTH_SCOPES);
  assert.equal(requestedScopes.includes("Calendars.ReadWrite"), false);
  assert.equal(requestedScopes.includes("Mail.Read"), false);
  assert.equal(requestedScopes.includes("User.Read"), false);
  assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");

  const exchanged = await client.exchange({
    code: "0.ABC_provider_code-20260803",
    code_verifier: "C".repeat(43),
    expected_nonce_hash: digest(NONCE),
    expected_email_hash: digest("jwsuh@amic.kr"),
  });
  assert.equal(exchanged.provider_subject_id, "entra-subject-jwsuh");
  assert.equal(exchanged.mailbox_address, "jwsuh@amic.kr");
  assert.equal(exchanged.expires_at, "2026-08-03T04:00:00.000Z");
  const tokenCall = provider.calls.find(({ url }) => url.endsWith("/token"));
  const tokenForm = new URLSearchParams(tokenCall.options.body);
  assert.equal(tokenForm.get("grant_type"), "authorization_code");
  assert.equal(tokenForm.get("redirect_uri"), REDIRECT_URI);
  assert.equal(tokenForm.get("client_secret"), null);
});

test("Client Outlook OAuth profile requests only the Add-in delegated scopes and validates the Entra subject", async () => {
  const provider = fixture({
    scopes: [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
    ],
  });
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      client_secret: "client-outlook-secret-never-return",
      redirect_uri:
        "https://pilot.example.invalid/api/outlook/connection/callback",
    },
    fetch_impl: provider.fetchImpl,
    clock: () => NOW,
    scope_profile: "client_outlook_addin",
  });
  const authorizationUrl = new URL(client.authorizationUrl({
    state: "encrypted-state.".repeat(30),
    code_challenge: "B".repeat(43),
    nonce: NONCE,
  }));

  assert.deepEqual(
    authorizationUrl.searchParams.get("scope").split(" "),
    CLIENT_OUTLOOK_OAUTH_SCOPES,
  );
  assert.equal(
    authorizationUrl.searchParams.get("scope").includes("Calendars.ReadBasic"),
    false,
  );
  assert.equal(authorizationUrl.searchParams.has("login_hint"), false);
  assert.equal(authorizationUrl.searchParams.get("state").length > 200, true);

  const exchanged = await client.exchange({
    code: "0.ABC_client_outlook_code-20260803",
    code_verifier: "C".repeat(43),
    expected_nonce_hash: digest(NONCE),
    expected_subject_id: "entra-subject-jwsuh",
  });
  assert.equal(exchanged.provider_subject_id, "entra-subject-jwsuh");
  assert.equal(exchanged.mailbox_address, "jwsuh@amic.kr");
  assert.deepEqual(
    [...exchanged.granted_scopes].sort(),
    ["Calendars.ReadWrite", "Mail.Read", "offline_access"].sort(),
  );
  const tokenCall = provider.calls.find(({ url }) => url.endsWith("/token"));
  const tokenForm = new URLSearchParams(tokenCall.options.body);
  assert.equal(tokenForm.get("scope"), CLIENT_OUTLOOK_OAUTH_SCOPES.join(" "));
  assert.equal(tokenForm.get("client_secret"), "client-outlook-secret-never-return");
});

test("delegated OAuth rejects a token carrying broader Graph permissions", async () => {
  const provider = fixture({
    scopes: [...PEOPLE_OUTLOOK_OAUTH_SCOPES, "Mail.Read"],
  });
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    },
    fetch_impl: provider.fetchImpl,
    clock: () => NOW,
  });
  await assert.rejects(
    client.exchange({
      code: "0.ABC_provider_code-20260803",
      code_verifier: "C".repeat(43),
      expected_nonce_hash: digest(NONCE),
      expected_email_hash: digest("jwsuh@amic.kr"),
    }),
    (error) => error.safe_error_code === "OUTLOOK_SCOPE_OVERBROAD",
  );
});

test("delegated OAuth rejects another mailbox, unbound nonce, and ambiguous audience", async () => {
  for (const [claims, expectedCode] of [
    [
      { preferred_username: "other@amic.kr" },
      "OUTLOOK_ACCOUNT_MISMATCH",
    ],
    [
      { nonce: "another-oauth-nonce" },
      "OUTLOOK_ID_TOKEN_INVALID",
    ],
    [
      { aud: [CLIENT_ID, "another-audience"] },
      "OUTLOOK_ID_TOKEN_INVALID",
    ],
  ]) {
    const provider = fixture({ claims });
    const client = createMicrosoftDelegatedOAuthClient({
      config: {
        tenant_id: TENANT_ID,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
      },
      fetch_impl: provider.fetchImpl,
      clock: () => NOW,
    });
    await assert.rejects(
      client.exchange({
        code: "0.ABC_provider_code-20260803",
        code_verifier: "C".repeat(43),
        expected_nonce_hash: digest(NONCE),
        expected_email_hash: digest("jwsuh@amic.kr"),
      }),
      (error) => error.safe_error_code === expectedCode,
    );
  }
});
