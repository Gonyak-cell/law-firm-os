import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCESS_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  CREDENTIAL_REF,
  PRINCIPAL_ID,
  SECOND_PRINCIPAL_ID,
  TENANT_ID,
  assertSafeEnvelope,
  createController,
  envelope,
  group,
  json,
  targetRequest,
  tokenResponse,
} from "./test-fixtures.mjs";
import { createMicrosoftGroupEgressController } from "./index.mjs";
import { GroupEgressError } from "./contract.mjs";

test("credential material is accepted only through one opaque-reference callback", async () => {
  const references = [];
  const { controller } = createController({
    with_credential: async (reference, consume) => {
      references.push(reference);
      return consume({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
    },
    fetch_impl: async (url) => (
      new URL(url).hostname === "login.microsoftonline.com"
        ? tokenResponse()
        : json(group())
    ),
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, true);
  assert.deepEqual(references, [CREDENTIAL_REF]);
  assertSafeEnvelope(assert, result);
});

test("malformed credentials fail before HTTP and never leak", async () => {
  for (const credential of [
    { client_id: "not-a-uuid", client_secret: CLIENT_SECRET },
    { client_id: CLIENT_ID, client_secret: "" },
    { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, access_token: ACCESS_TOKEN },
  ]) {
    let httpCalls = 0;
    const { controller } = createController({
      with_credential: async (_reference, consume) => consume(credential),
      fetch_impl: async () => { httpCalls += 1; return tokenResponse(); },
    });
    const result = await controller(envelope("group.target.inspect", targetRequest()));
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
    assert.equal(result.error.code, "CREDENTIAL_UNAVAILABLE");
    assert.equal(httpCalls, 0);
    assertSafeEnvelope(assert, result);
  }
});

test("injected resolver and retry hooks cannot forge public error details", async () => {
  const forged = new GroupEgressError("FORGED", 418, {
    leaked: `${CLIENT_SECRET}:${ACCESS_TOKEN}`,
  });
  const resolverCase = createController({
    with_credential: async () => { throw forged; },
    fetch_impl: async () => tokenResponse(),
  }).controller;
  const resolverResult = await resolverCase(
    envelope("group.target.inspect", targetRequest()),
  );
  assert.equal(resolverResult.error.code, "CREDENTIAL_UNAVAILABLE");
  assertSafeEnvelope(assert, resolverResult);

  let calls = 0;
  const sleepCase = createController({
    sleep: async () => { throw forged; },
    fetch_impl: async () => {
      calls += 1;
      return calls === 1 ? tokenResponse() : json({}, 503);
    },
  }).controller;
  const sleepResult = await sleepCase(envelope("group.target.inspect", targetRequest()));
  assert.equal(sleepResult.error.code, "UPSTREAM_UNAVAILABLE");
  assertSafeEnvelope(assert, sleepResult);
});

test("injected fetch errors cannot define the public error envelope", async () => {
  const leaked = `${CLIENT_SECRET}:${ACCESS_TOKEN}`;
  let calls = 0;
  const { controller } = createController({
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) return tokenResponse();
      throw new GroupEgressError("FORGED", 418, {
        leaked,
        remote_commit_state: "applied",
        retry_after_seconds: 31_337,
      });
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(calls, 2);
  assert.equal(result.status, 500);
  assert.deepEqual(result.error, { code: "CONTROLLER_INTERNAL_ERROR" });
  assertSafeEnvelope(assert, result);
});

test("injected fetch error details are reduced to the closed public schema", async () => {
  const leaked = `${CLIENT_SECRET}:${ACCESS_TOKEN}`;
  let calls = 0;
  const { controller } = createController({
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) return tokenResponse();
      throw new GroupEgressError("UPSTREAM_UNAVAILABLE", 503, {
        leaked,
        remote_commit_state: "applied",
        retry_after_seconds: 31_337,
      });
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(calls, 2);
  assert.equal(result.status, 503);
  assert.deepEqual(result.error, { code: "UPSTREAM_UNAVAILABLE" });
  assertSafeEnvelope(assert, result);
});

test("token response scope, schema, size, and transport errors fail closed", async () => {
  const cases = [
    () => tokenResponse({ scope: "User.Read" }),
    () => tokenResponse({ refresh_token: "must-not-be-accepted" }),
    () => tokenResponse({ token_type: "bearer" }),
    () => tokenResponse({ expires_in: 0 }),
    () => tokenResponse({ ext_expires_in: "3600" }),
    () => json({ padding: "x".repeat(300 * 1024) }),
    () => { throw new Error(`${CLIENT_SECRET}:${ACCESS_TOKEN}`); },
  ];
  for (const response of cases) {
    const { controller } = createController({ fetch_impl: async () => response() });
    const result = await controller(envelope("group.target.inspect", targetRequest()));
    assert.equal(result.ok, false);
    assert.ok(["UPSTREAM_RESPONSE_INVALID", "UPSTREAM_UNAVAILABLE"].includes(
      result.error.code,
    ));
    assertSafeEnvelope(assert, result);
  }
});

test("binding rejects duplicate, oversized, or confused allowlists and non-reference secrets", () => {
  const base = {
    tenant_id: TENANT_ID,
    group_id: "22222222-2222-4222-8222-222222222222",
    allowed_principal_ids: [PRINCIPAL_ID],
    credential_ref: CREDENTIAL_REF,
    with_credential: async () => {},
    fetch_impl: async () => tokenResponse(),
  };
  for (const override of [
    { allowed_principal_ids: [PRINCIPAL_ID, PRINCIPAL_ID] },
    { allowed_principal_ids: Array.from({ length: 11 }, (_, index) => (
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
    )) },
    { allowed_principal_ids: [TENANT_ID] },
    { allowed_principal_ids: [base.group_id] },
    { credential_ref: CLIENT_SECRET },
    { allowed_principal_ids: [PRINCIPAL_ID, SECOND_PRINCIPAL_ID], logger: console },
  ]) {
    assert.throws(
      () => createMicrosoftGroupEgressController({ ...base, ...override }),
      /configuration is invalid/u,
    );
  }
});
