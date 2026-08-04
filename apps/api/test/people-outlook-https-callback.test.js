import assert from "node:assert/strict";
import test from "node:test";

import {
  createPeopleOutlookDesktopCallbackLocation,
  isPeopleOutlookOAuthState,
} from "../src/people-outlook-oauth-callback.js";
import { createLambdaHttpHandler } from "../src/lambda.js";
import { startApiServer } from "../src/server.js";

const PEOPLE_STATE = `people_${"A".repeat(43)}`;
const AUTHORIZATION_CODE = "0.ABC_people-outlook-code";
const SESSION_STATE = "fe1540c3-a69a-469a-9fa3-8a2470936421";

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      started.server.close((error) => (error ? reject(error) : resolve()));
      started.server.closeAllConnections?.();
    });
  }
}

test("People Outlook HTTPS callback creates only the bounded desktop deep link", () => {
  const query = new URLSearchParams({
    code: AUTHORIZATION_CODE,
    state: PEOPLE_STATE,
    session_state: SESSION_STATE,
  });
  const location = new URL(
    createPeopleOutlookDesktopCallbackLocation(query),
  );

  assert.equal(isPeopleOutlookOAuthState(PEOPLE_STATE), true);
  assert.equal(location.protocol, "matter:");
  assert.equal(location.hostname, "auth");
  assert.equal(location.pathname, "/callback");
  assert.equal(location.searchParams.get("code"), AUTHORIZATION_CODE);
  assert.equal(location.searchParams.get("state"), PEOPLE_STATE);
  assert.equal(location.searchParams.get("session_state"), SESSION_STATE);
  assert.deepEqual(
    [...new Set(location.searchParams.keys())].sort(),
    ["code", "session_state", "state"],
  );
});

test("People Outlook HTTPS callback redirects before LawOS session auth", async () => {
  await withServer(async (baseUrl) => {
    const query = new URLSearchParams({
      code: AUTHORIZATION_CODE,
      state: PEOPLE_STATE,
      session_state: SESSION_STATE,
    });
    const response = await fetch(
      `${baseUrl}/api/outlook/connection/callback?${query}`,
      { redirect: "manual" },
    );

    assert.equal(response.status, 302);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.protocol, "matter:");
    assert.equal(location.searchParams.get("state"), PEOPLE_STATE);
    assert.equal(location.searchParams.get("session_state"), SESSION_STATE);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  });
});

test("Lambda proxy preserves the desktop redirect instead of following it", async () => {
  const location = createPeopleOutlookDesktopCallbackLocation(
    new URLSearchParams({
      code: AUTHORIZATION_CODE,
      state: PEOPLE_STATE,
      session_state: SESSION_STATE,
    }),
  );
  let forwardedRequest;
  const lambdaHandler = createLambdaHttpHandler({
    runtimeCache: Object.freeze({
      async get() {
        return { port: 32123 };
      },
    }),
    fetchFn: async (url, options) => {
      forwardedRequest = { url, options };
      return new Response(null, {
        status: 302,
        headers: { location },
      });
    },
  });

  const result = await lambdaHandler({
    rawPath: "/api/outlook/connection/callback",
    rawQueryString: new URLSearchParams({
      code: AUTHORIZATION_CODE,
      state: PEOPLE_STATE,
      session_state: SESSION_STATE,
    }).toString(),
    requestContext: { http: { method: "GET" } },
  });

  assert.equal(forwardedRequest.options.redirect, "manual");
  assert.equal(result.statusCode, 302);
  assert.equal(result.headers.location, location);
});

test("People callback rejects duplicate or injected parameters without a redirect", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/outlook/connection/callback?code=${AUTHORIZATION_CODE}`
      + `&state=${PEOPLE_STATE}&state=${PEOPLE_STATE}&access_token=forbidden`,
      { redirect: "manual" },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(response.headers.has("location"), false);
    assert.deepEqual(body.safe_error_codes, ["OUTLOOK_OAUTH_CALLBACK_INVALID"]);
    assert.equal(JSON.stringify(body).includes("forbidden"), false);
  });
});

test("Client Add-in encrypted state is not routed through the People desktop bridge", async () => {
  await withServer(async (baseUrl) => {
    const query = new URLSearchParams({
      code: AUTHORIZATION_CODE,
      state: "v1.iv.ciphertext.tag",
    });
    const response = await fetch(
      `${baseUrl}/api/outlook/connection/callback?${query}`,
      { redirect: "manual" },
    );

    assert.equal(response.status, 401);
    assert.equal(response.headers.has("location"), false);
  });
});
