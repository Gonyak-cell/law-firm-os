import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCESS_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  CREDENTIAL_REF,
  GRAPH_ORIGIN,
  GROUP_ID,
  LOGIN_ORIGIN,
  OUTSIDE_PRINCIPAL_ID,
  PRINCIPAL_ID,
  SECOND_PRINCIPAL_ID,
  TENANT_ID,
  assertSafeEnvelope,
  createController,
  empty,
  envelope,
  fingerprint,
  group,
  json,
  memberRequest,
  membersResponse,
  targetRequest,
  tokenResponse,
  user,
} from "./test-fixtures.mjs";
import {
  CONTRACT_VERSION,
  OPERATION_NAMES,
  createMicrosoftGroupEgressController,
} from "./index.mjs";

test("the closed v1 contract exposes only four group-membership operations", () => {
  assert.equal(CONTRACT_VERSION, "lawos.microsoft-group-egress.v1");
  assert.deepEqual(OPERATION_NAMES, [
    "group.target.inspect",
    "group.members.read",
    "group.member.add",
    "group.member.remove",
  ]);
});

test("inspect uses the fixed tenant authority and exact Graph group projection", async () => {
  const calls = [];
  const { controller, credentialCalls } = createController({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? tokenResponse() : json(group());
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, true);
  assert.deepEqual(result.result, {
    target_verified: true,
    group_type: "Unified",
    visibility: "Private",
    dynamic_membership: false,
    team_enabled: false,
    role_assignable: false,
  });
  assert.deepEqual(credentialCalls, [CREDENTIAL_REF]);
  assert.equal(calls[0].url, `${LOGIN_ORIGIN}/${TENANT_ID}/oauth2/v2.0/token`);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.redirect, "error");
  const form = new URLSearchParams(calls[0].options.body);
  assert.deepEqual(Object.fromEntries(form), {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: `${GRAPH_ORIGIN}/.default`,
  });
  const groupUrl = new URL(calls[1].url);
  assert.equal(groupUrl.origin, GRAPH_ORIGIN);
  assert.equal(groupUrl.pathname, `/v1.0/groups/${GROUP_ID}`);
  assert.equal(groupUrl.searchParams.get("$select"), [
    "id", "groupTypes", "mailEnabled", "securityEnabled", "visibility",
    "membershipRule", "membershipRuleProcessingState",
    "resourceProvisioningOptions", "isAssignableToRole",
  ].join(","));
  assert.equal(calls[1].options.method, "GET");
  assert.equal(calls[1].options.headers.authorization, `Bearer ${ACCESS_TOKEN}`);
  assert.equal(Object.hasOwn(calls[1].options.headers, "content-type"), false);
  assertSafeEnvelope(assert, result);
});

test("members read returns only deterministic principal fingerprints", async () => {
  let call = 0;
  const { controller } = createController({
    fetch_impl: async () => {
      call += 1;
      if (call === 1) return tokenResponse();
      if (call === 2) return json(group());
      return membersResponse([SECOND_PRINCIPAL_ID, PRINCIPAL_ID]);
    },
  });

  const result = await controller(envelope("group.members.read", targetRequest()));

  assert.equal(result.ok, true);
  assert.deepEqual(result.result, {
    member_count: 2,
    principal_fingerprints: [
      fingerprint(PRINCIPAL_ID),
      fingerprint(SECOND_PRINCIPAL_ID),
    ].sort(),
  });
  assert.equal(JSON.stringify(result).includes(PRINCIPAL_ID), false);
  assertSafeEnvelope(assert, result);
});

test("wrong schema, operation, tenant, group, or principal reaches no credential or HTTP adapter", async () => {
  let credentialCalls = 0;
  let httpCalls = 0;
  const { controller } = createController({
    with_credential: async () => { credentialCalls += 1; },
    fetch_impl: async () => { httpCalls += 1; return tokenResponse(); },
  });
  const cases = [
    { ...envelope("group.target.inspect", targetRequest()), contract_version: "v2" },
    envelope("group.create", targetRequest()),
    envelope("group.target.inspect", { ...targetRequest(), tenant_id: GROUP_ID }),
    envelope("group.target.inspect", { ...targetRequest(), group_id: TENANT_ID }),
    envelope("group.member.add", memberRequest(OUTSIDE_PRINCIPAL_ID)),
    envelope("group.member.remove", memberRequest("../owners?$expand=members")),
    envelope("group.member.add", { ...memberRequest(), url: "https://evil.invalid" }),
    envelope("group.member.add", { ...memberRequest(), method: "DELETE" }),
    envelope("group.member.add", { ...memberRequest(), query: "$filter=x" }),
    envelope("group.member.add", { ...memberRequest(), body: { owners: [] } }),
    envelope("group.member.add", { ...memberRequest(), access_token: ACCESS_TOKEN }),
    envelope("group.member.add", { ...memberRequest(), client_secret: CLIENT_SECRET }),
    envelope("group.target.inspect", { ...targetRequest(), nested: {} }),
    ...[
      "http.fetch",
      "group.update",
      "group.delete",
      "directoryRole.assign",
      "integratedApp.assign",
      "group.assignToEveryone",
    ].map((operation) => envelope(operation, targetRequest())),
    { ...envelope("group.target.inspect", targetRequest()), extra: true },
  ];
  for (const event of cases) {
    const result = await controller(event);
    assert.equal(result.ok, false);
    assert.ok(["INVALID_REQUEST", "UNSUPPORTED_OPERATION"].includes(result.error.code));
    assertSafeEnvelope(assert, result);
    if (!OPERATION_NAMES.includes(event.operation)) assert.equal(result.operation, null);
  }
  assert.equal(credentialCalls, 0);
  assert.equal(httpCalls, 0);
});

test("configuration is exact and cannot accept a raw credential or arbitrary endpoint", () => {
  const base = {
    tenant_id: TENANT_ID,
    group_id: GROUP_ID,
    allowed_principal_ids: [PRINCIPAL_ID],
    credential_ref: CREDENTIAL_REF,
    with_credential: async () => {},
    fetch_impl: async () => tokenResponse(),
  };
  for (const extra of [
    { client_secret: CLIENT_SECRET },
    { access_token: ACCESS_TOKEN },
    { graph_origin: "https://evil.invalid" },
    { login_origin: "https://evil.invalid" },
  ]) {
    assert.throws(
      () => createMicrosoftGroupEgressController({ ...base, ...extra }),
      /configuration is invalid/u,
    );
  }
});

test("group metadata drift and response schema drift fail closed", async () => {
  const driftCases = [
    group({ id: TENANT_ID }),
    group({ groupTypes: ["DynamicMembership", "Unified"] }),
    group({ mailEnabled: false }),
    group({ securityEnabled: true }),
    group({ visibility: "Public" }),
    group({ membershipRule: "user.department -eq 'Legal'" }),
    group({ membershipRuleProcessingState: "On" }),
    group({ resourceProvisioningOptions: ["Team"] }),
    group({ isAssignableToRole: true }),
    group({ displayName: "unexpected and potentially identifying" }),
  ];
  for (const body of driftCases) {
    let calls = 0;
    const { controller } = createController({
      fetch_impl: async () => (++calls === 1 ? tokenResponse() : json(body)),
    });
    const result = await controller(envelope("group.target.inspect", targetRequest()));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "TARGET_POLICY_VIOLATION");
    assert.equal(calls, 2);
  }
});

test("guest, disabled, wrong, nested, service, and schema-drift principals never mutate", async () => {
  const principalBodies = [
    user(PRINCIPAL_ID, { userType: "Guest" }),
    user(PRINCIPAL_ID, { accountEnabled: false }),
    user(SECOND_PRINCIPAL_ID),
    user(PRINCIPAL_ID, { "@odata.type": "#microsoft.graph.group" }),
    user(PRINCIPAL_ID, { servicePrincipalType: "Application" }),
  ];
  for (const principalBody of principalBodies) {
    const calls = [];
    let call = 0;
    const { controller } = createController({
      fetch_impl: async (url, options) => {
        calls.push({ url, options });
        call += 1;
        if (call === 1) return tokenResponse();
        if (call === 2) return json(group());
        return json(principalBody);
      },
    });
    const result = await controller(envelope("group.member.add", memberRequest()));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "PRINCIPAL_POLICY_VIOLATION");
    assert.equal(calls.filter(({ url, options }) => (
      new URL(url).hostname === "graph.microsoft.com"
      && ["POST", "DELETE"].includes(options.method)
    )).length, 0);
  }
});

test("raw resolver, upstream, and provider errors never enter the envelope or console", async () => {
  const output = [];
  const original = { error: console.error, log: console.log, warn: console.warn };
  console.error = (...values) => output.push(values);
  console.log = (...values) => output.push(values);
  console.warn = (...values) => output.push(values);
  try {
    const { controller } = createController({
      with_credential: async () => {
        throw new Error(`resolver leaked ${CLIENT_SECRET}`);
      },
      fetch_impl: async () => {
        throw new Error(`fetch leaked ${ACCESS_TOKEN}`);
      },
    });
    const result = await controller(envelope("group.target.inspect", targetRequest()));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "CREDENTIAL_UNAVAILABLE");
    assertSafeEnvelope(assert, result, result.error, output);
  } finally {
    console.error = original.error;
    console.log = original.log;
    console.warn = original.warn;
  }
  assert.deepEqual(output, []);
});
