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
import {
  MICROSOFT_EGRESS_REDIRECT_URIS,
} from "../src/microsoft-egress-broker-transport.js";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const REDIRECT_URI = MICROSOFT_EGRESS_REDIRECT_URIS.people;
const PEOPLE_CLIENT_SECRET = "people-outlook-secret-never-return";
const NOW = Date.parse("2026-08-03T03:00:00.000Z");
const NONCE = "delegated-oauth-nonce-20260803";
const PEOPLE_REFRESH_PROOF = "P".repeat(43);
const CLIENT_REFRESH_PROOF = "C".repeat(43);

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
  const refreshProfile = scopes.some((scope) => (
    scope.toLowerCase().endsWith("calendars.readbasic")
  )) ? "people" : "client";
  const refreshProfileProof = refreshProfile === "people"
    ? PEOPLE_REFRESH_PROOF
    : CLIENT_REFRESH_PROOF;
  const transport = {
    async oauthJwksGet(input) {
      calls.push({ method: "oauthJwksGet", input });
      return {
        keys: [{
          ...jwk,
          kid: "people-outlook-test-key",
          use: "sig",
          alg: "RS256",
        }],
      };
    },
    async oauthTokenExchange(input) {
      calls.push({ method: "oauthTokenExchange", input });
      return {
        token_type: "Bearer",
        access_token: "provider-access-token-never-persist",
        refresh_token: "provider-refresh-token-never-persist",
        refresh_profile: refreshProfile,
        refresh_profile_proof: refreshProfileProof,
        id_token: idToken,
        expires_in: 3600,
        scope: scopes.join(" "),
      };
    },
    async oauthTokenRefresh(input) {
      calls.push({ method: "oauthTokenRefresh", input });
      return {
        token_type: "Bearer",
        access_token: "provider-refreshed-access-token-never-persist",
        refresh_token: "provider-refreshed-refresh-token-never-persist",
        refresh_profile: refreshProfile,
        refresh_profile_proof: refreshProfileProof,
        expires_in: 3600,
        scope: scopes.join(" "),
      };
    },
    async oauthLegacyPeopleRefreshBind(input) {
      calls.push({ method: "oauthLegacyPeopleRefreshBind", input });
      return {
        refresh_profile: "people",
        refresh_profile_proof: PEOPLE_REFRESH_PROOF,
      };
    },
  };
  return { calls, transport };
}

test("delegated OAuth requires a server-side client secret for the HTTPS callback", () => {
  assert.throws(
    () => createMicrosoftDelegatedOAuthClient({
      config: {
        tenant_id: TENANT_ID,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
      },
      microsoft_egress_transport: fixture().transport,
    }),
    /client_secret is required/u,
  );
});

test("delegated OAuth requests only Calendars.ReadBasic and validates the signed Microsoft account", async () => {
  const provider = fixture();
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      client_secret: PEOPLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    },
    microsoft_egress_transport: provider.transport,
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
  assert.equal(authorizationUrl.searchParams.get("login_hint"), "jwsuh@amic.kr");
  assert.equal(authorizationUrl.searchParams.has("prompt"), false);

  const exchanged = await client.exchange({
    code: "0.ABC_provider_code-20260803",
    code_verifier: "C".repeat(43),
    expected_nonce_hash: digest(NONCE),
    expected_email_hash: digest("jwsuh@amic.kr"),
  });
  assert.equal(exchanged.provider_subject_id, "entra-subject-jwsuh");
  assert.equal(exchanged.mailbox_address, "jwsuh@amic.kr");
  assert.equal(exchanged.expires_at, "2026-08-03T04:00:00.000Z");
  assert.equal(exchanged.refresh_profile, "people");
  assert.equal(exchanged.refresh_profile_proof, PEOPLE_REFRESH_PROOF);
  const tokenCall = provider.calls.find(
    ({ method }) => method === "oauthTokenExchange",
  );
  assert.equal(tokenCall.input.redirect_profile, "people");
  assert.equal(Object.hasOwn(tokenCall.input, "redirect_uri"), false);
  assert.equal(tokenCall.input.client_secret, PEOPLE_CLIENT_SECRET);
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
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.client,
    },
    microsoft_egress_transport: provider.transport,
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
  assert.equal(authorizationUrl.searchParams.get("prompt"), "select_account");
  assert.equal(authorizationUrl.searchParams.get("state").length > 200, true);

  const exchanged = await client.exchange({
    code: "0.ABC_client_outlook_code-20260803",
    code_verifier: "C".repeat(43),
    expected_nonce_hash: digest(NONCE),
    expected_subject_id: "entra-subject-jwsuh",
  });
  assert.equal(exchanged.provider_subject_id, "entra-subject-jwsuh");
  assert.equal(exchanged.mailbox_address, "jwsuh@amic.kr");
  assert.equal(exchanged.refresh_profile, "client");
  assert.equal(exchanged.refresh_profile_proof, CLIENT_REFRESH_PROOF);
  assert.deepEqual(
    [...exchanged.granted_scopes].sort(),
    ["Calendars.ReadWrite", "Mail.Read", "offline_access"].sort(),
  );
  const tokenCall = provider.calls.find(
    ({ method }) => method === "oauthTokenExchange",
  );
  assert.deepEqual(tokenCall.input.scopes, CLIENT_OUTLOOK_OAUTH_SCOPES);
  assert.equal(tokenCall.input.redirect_profile, "client");
  assert.equal(
    tokenCall.input.client_secret,
    "client-outlook-secret-never-return",
  );
});

test("delegated OAuth rejects a token carrying broader Graph permissions", async () => {
  const provider = fixture({
    scopes: [...PEOPLE_OUTLOOK_OAUTH_SCOPES, "Mail.Read"],
  });
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      client_secret: PEOPLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    },
    microsoft_egress_transport: provider.transport,
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
        client_secret: PEOPLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      },
      microsoft_egress_transport: provider.transport,
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

test("delegated OAuth refresh uses only the fixed broker refresh request", async () => {
  const provider = fixture();
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      client_secret: PEOPLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    },
    microsoft_egress_transport: provider.transport,
    clock: () => NOW,
  });

  const refreshed = await client.refresh({
    refresh_token: "provider-current-refresh-token-never-persist",
    refresh_profile: "people",
    refresh_profile_proof: PEOPLE_REFRESH_PROOF,
  });
  const refreshCall = provider.calls.find(
    ({ method }) => method === "oauthTokenRefresh",
  );
  assert.deepEqual(refreshCall.input, {
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    client_secret: PEOPLE_CLIENT_SECRET,
    refresh_token: "provider-current-refresh-token-never-persist",
    refresh_profile_proof: PEOPLE_REFRESH_PROOF,
    redirect_profile: "people",
    scopes: PEOPLE_OUTLOOK_OAUTH_SCOPES,
  });
  assert.equal(
    refreshed.access_token,
    "provider-refreshed-access-token-never-persist",
  );
});

test("Client Outlook refresh carries the server-fixed client profile", async () => {
  const provider = fixture({ scopes: CLIENT_OUTLOOK_OAUTH_SCOPES });
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      client_secret: "client-outlook-secret-never-return",
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.client,
    },
    microsoft_egress_transport: provider.transport,
    clock: () => NOW,
    scope_profile: "client_outlook_addin",
  });

  await client.refresh({
    refresh_token: "client-refresh-token-never-persist",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
  });
  const refreshCall = provider.calls.find(
    ({ method }) => method === "oauthTokenRefresh",
  );
  assert.deepEqual(refreshCall.input, {
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    client_secret: "client-outlook-secret-never-return",
    refresh_token: "client-refresh-token-never-persist",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    redirect_profile: "client",
    scopes: CLIENT_OUTLOOK_OAUTH_SCOPES,
  });
  await assert.rejects(
    client.bindLegacyPeopleRefresh({
      refresh_token: "client-refresh-token-never-persist",
    }),
    (error) => (
      error.safe_error_code === "OUTLOOK_REFRESH_PROFILE_INVALID"
      && error.status === 403
    ),
  );
  assert.equal(
    provider.calls.some(
      ({ method }) => method === "oauthLegacyPeopleRefreshBind",
    ),
    false,
  );
});

test("People legacy refresh binding invokes a fixed broker operation without client secret or profile input", async () => {
  const provider = fixture();
  const client = createMicrosoftDelegatedOAuthClient({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      client_secret: PEOPLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    },
    microsoft_egress_transport: provider.transport,
    clock: () => NOW,
  });
  const binding = await client.bindLegacyPeopleRefresh({
    refresh_token: "legacy-people-refresh-token-never-persist",
  });
  assert.deepEqual(binding, {
    refresh_profile: "people",
    refresh_profile_proof: PEOPLE_REFRESH_PROOF,
  });
  const call = provider.calls.find(
    ({ method }) => method === "oauthLegacyPeopleRefreshBind",
  );
  assert.deepEqual(call.input, {
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    refresh_token: "legacy-people-refresh-token-never-persist",
  });
  assert.equal(Object.hasOwn(call.input, "client_secret"), false);
  assert.equal(Object.hasOwn(call.input, "refresh_profile"), false);
});
