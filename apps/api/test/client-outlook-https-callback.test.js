import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_OUTLOOK_OAUTH_CALLBACK_DESTINATION,
  createClientOutlookAddinCallbackLocation,
  createClientOutlookLegacyAddinCallbackLocation,
  isClientOutlookOAuthState,
  parseClientOutlookAuthorizationCallback,
} from "../src/client-outlook-oauth-callback.js";

const CLIENT_STATE = "v1.iv.ciphertext.tag";
const AUTHORIZATION_CODE = "0.ABC_client-outlook-code";
const SESSION_STATE = "fe1540c3-a69a-469a-9fa3-8a2470936421";

test("Client Outlook HTTPS callback parses the authorization result but redirects with status only", () => {
  const parsed = parseClientOutlookAuthorizationCallback(new URLSearchParams({
    code: AUTHORIZATION_CODE,
    state: CLIENT_STATE,
    session_state: SESSION_STATE,
  }));
  const location = new URL(createClientOutlookAddinCallbackLocation("connected"));
  const fragment = new URLSearchParams(location.hash.slice(1));

  assert.deepEqual(parsed, {
    code: AUTHORIZATION_CODE,
    error: null,
    state: CLIENT_STATE,
  });
  assert.equal(location.toString().startsWith(CLIENT_OUTLOOK_OAUTH_CALLBACK_DESTINATION), true);
  assert.equal(location.origin, "https://d2mthcc8vp3cr2.cloudfront.net");
  assert.equal(location.pathname, "/addin/oauth-callback.html");
  assert.equal(location.search, "");
  assert.deepEqual([...fragment.entries()], [["status", "connected"]]);
  assert.equal(location.toString().includes(AUTHORIZATION_CODE), false);
  assert.equal(location.toString().includes(CLIENT_STATE), false);
});

test("Client Outlook HTTPS callback parses access denial without forwarding provider details", () => {
  const privateDescription = "User declined consent for a private account";
  const parsed = parseClientOutlookAuthorizationCallback(new URLSearchParams({
    error: "access_denied",
    error_description: privateDescription,
    error_uri: "https://login.microsoftonline.com/error?code=65004",
    state: CLIENT_STATE,
    session_state: SESSION_STATE,
  }));
  const location = new URL(createClientOutlookAddinCallbackLocation("failed"));

  assert.deepEqual(parsed, {
    code: null,
    error: "access_denied",
    state: CLIENT_STATE,
  });
  assert.deepEqual([...new URLSearchParams(location.hash.slice(1)).entries()], [["status", "failed"]]);
  assert.equal(location.toString().includes(privateDescription), false);
  assert.equal(location.toString().includes(CLIENT_STATE), false);
});

test("Client Outlook HTTPS callback relays other safe provider errors without details", () => {
  for (const providerError of [
    "interaction_required",
    "temporarily_unavailable",
    "consent_required",
  ]) {
    const parsed = parseClientOutlookAuthorizationCallback(new URLSearchParams({
      error: providerError,
      error_description: "provider detail must not cross the callback",
      state: CLIENT_STATE,
    }));
    assert.equal(parsed.error, providerError);
    assert.equal(parsed.state, CLIENT_STATE);
  }
});

test("Client Outlook state recognition accepts only a v1 base64url envelope", () => {
  assert.equal(isClientOutlookOAuthState(CLIENT_STATE), true);
  assert.equal(isClientOutlookOAuthState("v1.a.b.c"), true);
  assert.equal(isClientOutlookOAuthState("people_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), false);
  assert.equal(isClientOutlookOAuthState("v2.iv.ciphertext.tag"), false);
  assert.equal(isClientOutlookOAuthState("v1.iv.ciphertext.tag="), false);
  assert.equal(isClientOutlookOAuthState("v1.iv..tag"), false);
  assert.equal(isClientOutlookOAuthState("v1.iv.ciphertext"), false);
  assert.equal(isClientOutlookOAuthState(`v1.${"a".repeat(4094)}.b.c`), false);
});

test("Client Outlook HTTPS callback rejects duplicate, unsupported, mixed, and overlong input", () => {
  const invalidQueries = [
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      state: CLIENT_STATE,
      extra: "forbidden",
    }),
    new URLSearchParams([
      ["code", AUTHORIZATION_CODE],
      ["state", CLIENT_STATE],
      ["state", CLIENT_STATE],
    ]),
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      error: "access_denied",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      code: "",
      error: "access_denied",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      error: "",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      state: CLIENT_STATE,
    }),
    new URLSearchParams({ error: "INVALID_REQUEST", state: CLIENT_STATE }),
    new URLSearchParams({ error: "invalid-request", state: CLIENT_STATE }),
    new URLSearchParams({ error: `e${"r".repeat(64)}`, state: CLIENT_STATE }),
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      error_description: "description without an error",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      error_uri: "https://login.microsoftonline.com/error?code=65004",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      error: "access_denied",
      error_uri: "javascript:alert(1)",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      error: "access_denied",
      error_uri: `https://example.test/${"e".repeat(2048)}`,
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      code: `${AUTHORIZATION_CODE}\u0000`,
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      error: "access_denied",
      error_description: "d\u0000",
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      error: "access_denied",
      state: CLIENT_STATE,
      session_state: "s\u0001",
    }),
    new URLSearchParams({
      code: "c".repeat(4097),
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      error: "access_denied",
      error_description: "d".repeat(2049),
      state: CLIENT_STATE,
    }),
    new URLSearchParams({
      error: "access_denied",
      state: CLIENT_STATE,
      session_state: "s".repeat(513),
    }),
  ];

  for (const query of invalidQueries) {
    assert.throws(
      () => parseClientOutlookAuthorizationCallback(query),
      /invalid|duplicated/u,
    );
  }
});

test("Client Outlook callback destination accepts only bounded status values", () => {
  assert.throws(
    () => createClientOutlookAddinCallbackLocation("connected&code=forbidden"),
    /status/u,
  );
});

test("Client Outlook legacy callback keeps the signed completion bridge isolated", () => {
  const location = new URL(createClientOutlookLegacyAddinCallbackLocation(
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      state: CLIENT_STATE,
    }),
  ));
  const fragment = new URLSearchParams(location.hash.slice(1));
  assert.equal(fragment.get("code"), AUTHORIZATION_CODE);
  assert.equal(fragment.get("state"), CLIENT_STATE);
  assert.equal(fragment.has("status"), false);
});
