import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
} from "node:crypto";
import test from "node:test";

import {
  MICROSOFT_OFFICE_SSO_PROVIDER_ID,
  createMicrosoftOfficeSsoProvider,
} from "../src/microsoft-office-sso-provider.js";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const CALLBACK_URI =
  "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback";
const NOW = Date.parse("2026-08-05T06:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW / 1000);
const OID = "33333333-3333-4333-8333-333333333333";
const ACCESS_TOKEN = "office-naa-access-token-never-return";

const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = {
  ...keyPair.publicKey.export({ format: "jwk" }),
  kid: "office-sso-test-key",
  use: "sig",
  alg: "RS256",
};

function claims(overrides = {}) {
  return {
    iss: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    tid: TENANT_ID,
    ver: "2.0",
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    oid: OID,
    preferred_username: "Pilot.User@Amic.Kr",
    name: "Pilot User",
    scp: "access_as_user",
    iat: NOW_SECONDS - 10,
    nbf: NOW_SECONDS - 10,
    exp: NOW_SECONDS + 3600,
    ...overrides,
  };
}

function jwt({
  tokenClaims = claims(),
  algorithm = "RS256",
  kid = publicJwk.kid,
  privateKey = keyPair.privateKey,
} = {}) {
  const headerPart = Buffer.from(JSON.stringify({
    alg: algorithm,
    kid,
    typ: "JWT",
  })).toString("base64url");
  const payloadPart = Buffer.from(JSON.stringify(tokenClaims))
    .toString("base64url");
  const signaturePart = sign(
    "RSA-SHA256",
    Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
    privateKey,
  ).toString("base64url");
  return `${headerPart}.${payloadPart}.${signaturePart}`;
}

function fixture() {
  const calls = [];
  const provider = createMicrosoftOfficeSsoProvider({
    config: {
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      callback_uri: CALLBACK_URI,
      client_secret: "must-not-be-observed",
    },
    microsoft_egress_transport: {
      async oauthJwksGet(input) {
        calls.push(input);
        return { keys: [publicJwk] };
      },
    },
    clock: () => NOW,
  });
  return { calls, provider };
}

test("Office NAA SSO verifies a delegated access token only through broker JWKS", async () => {
  const { calls, provider } = fixture();
  assert.equal(provider.provider_id, MICROSOFT_OFFICE_SSO_PROVIDER_ID);
  assert.deepEqual(provider.public_config, {
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    api_scope: `api://${CLIENT_ID}/access_as_user`,
    callback_uri: CALLBACK_URI,
  });
  assert.equal(JSON.stringify(provider.public_config).includes("secret"), false);

  const token = jwt();
  const verified = await provider.verifyAccessToken(token);
  assert.deepEqual(calls, [{ tenant_id: TENANT_ID }]);
  assert.equal(verified.assertion_id, OID);
  assert.equal(verified.email, "pilot.user@amic.kr");
  assert.equal(verified.tenant_id, TENANT_ID);
  assert.equal(verified.api_scope, `api://${CLIENT_ID}/access_as_user`);
  assert.equal(verified.delegated_scopes.includes("access_as_user"), true);
  assert.equal(verified.token_material_returned, false);
  assert.equal(JSON.stringify(verified).includes(token), false);

  await provider.verifyAccessToken(token);
  assert.equal(calls.length, 1, "cached broker JWKS should be reused");
  const withoutEmail = await provider.verifyAccessToken(jwt({
    tokenClaims: claims({ preferred_username: undefined }),
  }));
  assert.equal(withoutEmail.email, null);
});

test("Office NAA SSO rejects non-RS256, wrong key, claim drift, and app-only tokens", async (t) => {
  const cases = [
    ["non-RS256", { algorithm: "HS256" }, "OFFICE_SSO_ALGORITHM_INVALID"],
    ["missing kid", { kid: "" }, "OFFICE_SSO_ALGORITHM_INVALID"],
    ["unknown kid", { kid: "unknown-key" }, "OFFICE_SSO_SIGNING_KEY_UNKNOWN"],
    ["wrong signature", { privateKey: otherKeyPair.privateKey }, "OFFICE_SSO_SIGNATURE_INVALID"],
    ["wrong issuer", { tokenClaims: claims({ iss: "https://login.microsoftonline.com/common/v2.0" }) }, "OFFICE_SSO_TENANT_DENIED"],
    ["wrong tenant", { tokenClaims: claims({ tid: "44444444-4444-4444-8444-444444444444" }) }, "OFFICE_SSO_TENANT_DENIED"],
    ["missing v2 version", { tokenClaims: claims({ ver: undefined }) }, "OFFICE_SSO_TOKEN_VERSION_INVALID"],
    ["wrong token version", { tokenClaims: claims({ ver: "1.0" }) }, "OFFICE_SSO_TOKEN_VERSION_INVALID"],
    ["audience array", { tokenClaims: claims({ aud: [CLIENT_ID] }) }, "OFFICE_SSO_AUDIENCE_INVALID"],
    ["wrong audience", { tokenClaims: claims({ aud: "44444444-4444-4444-8444-444444444444" }) }, "OFFICE_SSO_AUDIENCE_INVALID"],
    ["missing azp", { tokenClaims: claims({ azp: undefined }) }, "OFFICE_SSO_AUTHORIZED_PARTY_INVALID"],
    ["wrong azp", { tokenClaims: claims({ azp: "44444444-4444-4444-8444-444444444444" }) }, "OFFICE_SSO_AUTHORIZED_PARTY_INVALID"],
    ["missing exp", { tokenClaims: claims({ exp: undefined }) }, "OFFICE_SSO_ACCESS_TOKEN_EXPIRED"],
    ["expired", { tokenClaims: claims({ exp: NOW_SECONDS }) }, "OFFICE_SSO_ACCESS_TOKEN_EXPIRED"],
    ["missing nbf", { tokenClaims: claims({ nbf: undefined }) }, "OFFICE_SSO_ACCESS_TOKEN_EXPIRED"],
    ["future nbf", { tokenClaims: claims({ nbf: NOW_SECONDS + 61 }) }, "OFFICE_SSO_ACCESS_TOKEN_EXPIRED"],
    ["missing iat", { tokenClaims: claims({ iat: undefined }) }, "OFFICE_SSO_ACCESS_TOKEN_EXPIRED"],
    ["future iat", { tokenClaims: claims({ iat: NOW_SECONDS + 61 }) }, "OFFICE_SSO_ACCESS_TOKEN_EXPIRED"],
    ["missing oid", { tokenClaims: claims({ oid: undefined }) }, "OFFICE_SSO_SUBJECT_REQUIRED"],
    ["non-UUID oid", { tokenClaims: claims({ oid: "entra-subject" }) }, "OFFICE_SSO_SUBJECT_REQUIRED"],
    ["missing delegated scope", { tokenClaims: claims({ scp: "openid profile" }) }, "OFFICE_SSO_SCOPE_REQUIRED"],
    ["unexpected extra scope", { tokenClaims: claims({ scp: "access_as_user other_scope" }) }, "OFFICE_SSO_SCOPE_REQUIRED"],
    ["array delegated scope", { tokenClaims: claims({ scp: ["access_as_user"] }) }, "OFFICE_SSO_SCOPE_REQUIRED"],
    ["app-only roles", { tokenClaims: claims({ roles: ["access_as_user"] }) }, "OFFICE_SSO_APP_ONLY_TOKEN_DENIED"],
  ];

  for (const [name, tokenOptions, safeErrorCode] of cases) {
    await t.test(name, async () => {
      const { provider } = fixture();
      await assert.rejects(
        provider.verifyAccessToken(jwt(tokenOptions)),
        (error) => error?.safe_error_code === safeErrorCode,
      );
    });
  }

  const { provider } = fixture();
  await assert.rejects(
    provider.verifyAccessToken(ACCESS_TOKEN),
    (error) => error?.safe_error_code === "OFFICE_SSO_ACCESS_TOKEN_INVALID",
  );
});
