import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import {
  handleOutlookDesktopInstallationApiRequest,
  projectOutlookDesktopRegistrationAuthorityResult,
} from "../src/outlook-desktop-installation-runtime-context.js";

const TENANT_ID = "tenant-desktop-api-a";
const USER_ID = "user-desktop-api-01";
const SUBJECT_ID = "subject-desktop-api-01";
const INSTALLATION_ID = "odi_desktop_api_000000000001";

function roster() {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "synthetic-api-v1",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT_ID,
      user_id: `user-desktop-api-${String(index + 1).padStart(2, "0")}`,
      entra_subject_id: `subject-desktop-api-${String(index + 1).padStart(2, "0")}`,
      enabled: true,
    })),
  });
}

function principal(overrides = {}) {
  return {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    entra_subject_id: SUBJECT_ID,
    scopes: [OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE],
    ...overrides,
  };
}

function permissionContext({ allowed = true, value = principal() } = {}) {
  return {
    principal: value,
    rules: allowed ? [{
      id: "outlook-desktop-connection-manage",
      effect: "allow",
      action_prefix: "outlook:connection:",
    }] : [],
    object_acl: [],
  };
}

function authorityEnvelope(overrides = {}) {
  return {
    installation_id: INSTALLATION_ID,
    user_id: USER_ID,
    entra_subject_id: SUBJECT_ID,
    device_key_fingerprint: "a".repeat(64),
    lifecycle_authorization_id: "lifecycle_authorization_api_001",
    proof_transcript_sha256: "b".repeat(64),
    request_id: "request_desktop_api_001",
    event_id: "event_desktop_api_001",
    idempotency_key: "idem_desktop_api_0001",
    request_fingerprint: "c".repeat(64),
    nonce_hash: "d".repeat(64),
    device_signature_sha256: "e".repeat(64),
    issued_at: "2026-08-11T00:00:00.000Z",
    expires_at: "2026-08-11T00:02:00.000Z",
    ...overrides,
  };
}

function registrationBody(overrides = {}) {
  return {
    platform: "darwin",
    app_version: "0.1.26",
    source_sha: "2".repeat(40),
    device_public_key: "public_key_material_must_never_return",
    activation_authorization_id: "activation_authorization_api_001",
    ...authorityEnvelope(),
    ...overrides,
  };
}

function heartbeatBody(overrides = {}) {
  return {
    expected_state_version: 1,
    ...authorityEnvelope({
      event_id: "event_desktop_api_heartbeat_002",
      request_id: "request_desktop_api_heartbeat_002",
      idempotency_key: "idem_desktop_api_heartbeat_0002",
      request_fingerprint: "f".repeat(64),
      nonce_hash: "1".repeat(64),
      device_signature_sha256: "2".repeat(64),
    }),
    ...overrides,
  };
}

function retireBody(overrides = {}) {
  return {
    expected_state_version: 2,
    retire_reason: "device_disconnect",
    ...authorityEnvelope({
      event_id: "event_desktop_api_retire_003",
      request_id: "request_desktop_api_retire_003",
      idempotency_key: "idem_desktop_api_retire_0003",
      request_fingerprint: "3".repeat(64),
      nonce_hash: "4".repeat(64),
      device_signature_sha256: "5".repeat(64),
    }),
    ...overrides,
  };
}

function legacyProof(overrides = {}) {
  return {
    idempotency_key: "idem_desktop_legacy_0001",
    nonce: "AAAAAAAAAAAAAAAAAAAAAA",
    issued_at: "2026-08-11T00:00:00.000Z",
    expires_at: "2026-08-11T00:02:00.000Z",
    signature: "legacy_signature_material",
    ...overrides,
  };
}

function legacyRegistrationBody(overrides = {}) {
  return {
    platform: "darwin",
    app_version: "0.1.26",
    source_sha: "2".repeat(40),
    device_public_key: "legacy_public_key_material",
    ...legacyProof(),
    ...overrides,
  };
}

function legacyRegistrationBodyWithoutSignature() {
  const body = legacyRegistrationBody();
  delete body.signature;
  return body;
}

function legacyHeartbeatBody(overrides = {}) {
  return {
    expected_state_version: 1,
    ...legacyProof({
      idempotency_key: "idem_desktop_legacy_heartbeat_0002",
      nonce: "AQEBAQEBAQEBAQEBAQEBAQ",
    }),
    ...overrides,
  };
}

function legacyRetireBody(overrides = {}) {
  return {
    expected_state_version: 2,
    retire_reason: "device_disconnect",
    ...legacyProof({
      idempotency_key: "idem_desktop_legacy_retire_0003",
      nonce: "AgICAgICAgICAgICAgICAg",
    }),
    ...overrides,
  };
}

function serviceEnvelope(operation, command) {
  const stateVersion = operation === "register" ? 1
    : operation === "heartbeat" ? 2 : 3;
  return Object.freeze({
    response_status: operation === "register" ? 201 : 200,
    body: Object.freeze({
      outcome: operation === "register"
        ? "registered"
        : operation === "retire" ? "retired" : operation,
      installation: Object.freeze({
        installation_id: command.authorization.installation_id,
        status: operation === "retire" ? "retired" : "active",
        state_version: stateVersion,
        lease_expires_at: "2026-08-18T00:00:00.000Z",
        retired_at: operation === "retire"
          ? "2026-08-11T00:01:00.000Z"
          : null,
      }),
      forbidden_service_extra: "must_not_escape",
    }),
  });
}

function fakeService() {
  const calls = [];
  const invoke = (operation) => async (...args) => {
    assert.equal(args.length, 1);
    const [command] = args;
    calls.push({ operation, command });
    return serviceEnvelope(operation, command);
  };
  return {
    calls,
    service: Object.freeze({
      register: invoke("register"),
      heartbeat: invoke("heartbeat"),
      retire: invoke("retire"),
      async read(...args) {
        assert.equal(args.length, 1);
        const [input] = args;
        calls.push({ operation: "read", input });
        return {
          ...serviceEnvelope("heartbeat", {
            authorization: { installation_id: input.installation_id },
          }).body.installation,
          state_version: 4,
          forbidden_service_extra: "must_not_escape",
        };
      },
    }),
  };
}

function legacyServiceEnvelope(operation, command) {
  const stateVersion = operation === "register" ? 1
    : operation === "heartbeat" ? 2 : 3;
  return Object.freeze({
    response_status: operation === "register" ? 201 : 200,
    body: Object.freeze({
      outcome: operation === "register"
        ? "registered"
        : operation === "retire" ? "retired" : "heartbeat",
      installation: Object.freeze({
        installation_id: operation === "register"
          ? INSTALLATION_ID
          : command.request.installation_id,
        status: operation === "retire" ? "retired" : "active",
        state_version: stateVersion,
        lease_expires_at: "2026-08-18T00:00:00.000Z",
        retired_at: operation === "retire"
          ? "2026-08-11T00:01:00.000Z"
          : null,
      }),
      forbidden_service_extra: "must_not_escape",
    }),
  });
}

function fakeLegacyService() {
  const calls = [];
  const invoke = (operation) => async (...args) => {
    assert.equal(args.length, 2);
    const [command, options] = args;
    assert.equal(typeof options?.authorize, "function");
    const authorized = await options.authorize({
      operation,
      principal: command.principal,
      installation_id: operation === "register"
        ? "NEW"
        : command.request.installation_id,
    });
    assert.equal(authorized, true);
    calls.push({ operation, command });
    return legacyServiceEnvelope(operation, command);
  };
  return {
    calls,
    service: Object.freeze({
      register: invoke("register"),
      heartbeat: invoke("heartbeat"),
      retire: invoke("retire"),
    }),
  };
}

async function directRequest({
  pathname = "/api/desktop/installations",
  method = "POST",
  body = registrationBody(),
  value = principal(),
  context = permissionContext({ value }),
  runtime,
  requestId = "request-desktop-api",
} = {}) {
  return handleOutlookDesktopInstallationApiRequest({
    pathname,
    method,
    body,
    principal: value,
    context,
    requestId,
    runtime,
  });
}

test("private registration result projects only the bounded installation", () => {
  const result = projectOutlookDesktopRegistrationAuthorityResult(
    serviceEnvelope("register", { authorization: registrationBody() }),
    INSTALLATION_ID,
  );

  assert.deepEqual(result, {
    response_status: 201,
    outcome: "registered",
    installation: {
      installation_id: INSTALLATION_ID,
      status: "active",
      state_version: 1,
      lease_expires_at: "2026-08-18T00:00:00.000Z",
      retired_at: null,
    },
  });
  assert.doesNotMatch(JSON.stringify(result), /forbidden_service_extra/u);
});

test("authoritative read is GET-only, bodyless, binding-safe, and fail-closed", async () => {
  const fake = fakeService();
  const runtime = {
    entitlement_roster: roster(),
    installation_service: fake.service,
  };
  const path = `/api/desktop/installations/${INSTALLATION_ID}`;
  const success = await directRequest({
    pathname: path,
    method: "GET",
    body: {},
    runtime,
  });
  const wrongMethod = await directRequest({
    pathname: path,
    method: "POST",
    body: {},
    runtime,
  });
  const clientFields = await directRequest({
    pathname: path,
    method: "GET",
    body: { expected_state_version: 1 },
    runtime,
  });
  const mismatch = await directRequest({
    pathname: path,
    method: "GET",
    body: {},
    value: principal(),
    context: permissionContext({
      value: principal({
        user_id: "user-desktop-api-02",
        entra_subject_id: "subject-desktop-api-02",
      }),
    }),
    runtime,
  });
  const missing = await directRequest({
    pathname: path,
    method: "GET",
    body: {},
    runtime: {
      entitlement_roster: roster(),
      installation_service: { async read() { return null; } },
    },
  });
  const serviceBindingMismatch = await directRequest({
    pathname: path,
    method: "GET",
    body: {},
    runtime: {
      entitlement_roster: roster(),
      installation_service: {
        async read() {
          throw Object.assign(new Error("private binding details"), {
            safe_error_code: "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
            status: 403,
          });
        },
      },
    },
  });
  let lazyFactoryCalls = 0;
  const lazyFactory = await directRequest({
    pathname: path,
    method: "GET",
    body: {},
    runtime: {
      entitlement_roster: roster(),
      installation_service_factory() {
        lazyFactoryCalls += 1;
        return fake.service;
      },
    },
  });

  assert.equal(success.status, 200);
  assert.equal(wrongMethod.status, 405);
  assert.equal(clientFields.status, 400);
  assert.equal(mismatch.status, 403);
  assert.equal(missing.status, 404);
  assert.equal(serviceBindingMismatch.status, 403);
  assert.equal(lazyFactory.status, 503);
  assert.deepEqual(lazyFactory.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
  ]);
  assert.equal(lazyFactoryCalls, 0);
  assert.deepEqual(mismatch.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
  ]);
  assert.deepEqual(serviceBindingMismatch.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
  ]);
  assert.doesNotMatch(
    JSON.stringify(serviceBindingMismatch.body),
    /private binding details/u,
  );
  assert.equal(fake.calls.filter(({ operation }) => operation === "read").length, 1);
});

test("missing identity, roster, cohort, scope, or permission fails closed before service access", async () => {
  const scenarios = [
    {
      value: null,
      context: null,
      rosterValue: roster(),
      status: 401,
      code: "AUTH_SESSION_REQUIRED",
    },
    {
      value: principal({ entra_subject_id: null }),
      rosterValue: roster(),
      status: 403,
      code: "OUTLOOK_DESKTOP_IDENTITY_BINDING_REQUIRED",
    },
    {
      value: principal(),
      rosterValue: null,
      status: 503,
      code: "OUTLOOK_DESKTOP_ROSTER_UNAVAILABLE",
    },
    {
      value: principal({ user_id: "user-desktop-api-11" }),
      rosterValue: roster(),
      status: 403,
      code: "OUTLOOK_DESKTOP_NOT_ENTITLED",
    },
    {
      value: principal({ scopes: [] }),
      rosterValue: roster(),
      status: 403,
      code: "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
    },
    {
      value: principal(),
      context: permissionContext({ allowed: false }),
      rosterValue: roster(),
      status: 403,
      code: "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
    },
  ];
  for (const scenario of scenarios) {
    const fake = fakeService();
    const response = await directRequest({
      pathname: `/api/desktop/installations/${INSTALLATION_ID}`,
      method: "GET",
      body: {},
      value: scenario.value,
      context: scenario.context === undefined
        ? permissionContext({ value: scenario.value })
        : scenario.context,
      runtime: {
        entitlement_roster: scenario.rosterValue,
        installation_service: fake.service,
      },
    });
    assert.equal(response.status, scenario.status);
    assert.deepEqual(response.body.safe_error_codes, [scenario.code]);
    assert.equal(fake.calls.length, 0);
  }
});

test("public mutation routes reject 007 authority or malformed legacy bodies before service access", async () => {
  const fake = fakeLegacyService();
  const runtime = {
    entitlement_roster: roster(),
    legacy_installation_service: fake.service,
  };
  for (const [pathname, body] of [
    ["/api/desktop/installations", registrationBody()],
    [
      `/api/desktop/installations/${INSTALLATION_ID}/heartbeat`,
      heartbeatBody(),
    ],
    [
      `/api/desktop/installations/${INSTALLATION_ID}/retire`,
      retireBody(),
    ],
    ["/api/desktop/installations", {}],
    ["/api/desktop/installations", { authorization: registrationBody() }],
    ["/api/desktop/installations", { proof: registrationBody() }],
    ["/api/desktop/installations", legacyRegistrationBody({ tenant_id: TENANT_ID })],
    ["/api/desktop/installations", legacyRegistrationBody({ email: "pii@example.invalid" })],
    ["/api/desktop/installations", legacyRegistrationBodyWithoutSignature()],
    [
      `/api/desktop/installations/${INSTALLATION_ID}/heartbeat`,
      legacyHeartbeatBody({ device_public_key: "unexpected" }),
    ],
    [
      `/api/desktop/installations/${INSTALLATION_ID}/retire`,
      legacyRetireBody({ revoke_user_connection: true }),
    ],
  ]) {
    const response = await directRequest({ pathname, body, runtime });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body.safe_error_codes, [
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
    ]);
  }
  assert.equal(fake.calls.length, 0);
});

test("legacy signed writes retain the signed request and let the service replay it", async () => {
  const legacy = fakeLegacyService();
  const runtime = {
    entitlement_roster: roster(),
    legacy_installation_service: legacy.service,
  };
  const registration = legacyRegistrationBody();
  const registered = await directRequest({ body: registration, runtime });
  const replayed = await directRequest({ body: registration, runtime });
  const heartbeat = await directRequest({
    pathname: `/api/desktop/installations/${INSTALLATION_ID}/heartbeat`,
    body: legacyHeartbeatBody(),
    runtime,
  });
  const retired = await directRequest({
    pathname: `/api/desktop/installations/${INSTALLATION_ID}/retire`,
    body: legacyRetireBody(),
    runtime,
  });

  assert.deepEqual(
    [registered.status, replayed.status, heartbeat.status, retired.status],
    [201, 201, 200, 200],
  );
  assert.deepEqual(
    legacy.calls.map(({ operation }) => operation),
    ["register", "register", "heartbeat", "retire"],
  );
  assert.deepEqual(legacy.calls[0].command, {
    principal: {
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      entra_subject_id: SUBJECT_ID,
    },
    request_id: "request-desktop-api",
    request: {
      method: "POST",
      path: "/api/desktop/installations",
      body: {
        platform: "darwin",
        app_version: "0.1.26",
        source_sha: "2".repeat(40),
        device_public_key: "legacy_public_key_material",
      },
      installation_id: "NEW",
      idempotency_key: "idem_desktop_legacy_0001",
      nonce: "AAAAAAAAAAAAAAAAAAAAAA",
      issued_at: "2026-08-11T00:00:00.000Z",
      expires_at: "2026-08-11T00:02:00.000Z",
    },
    signature: "legacy_signature_material",
  });
  assert.deepEqual(
    legacy.calls[1].command.request,
    legacy.calls[0].command.request,
  );
  assert.doesNotMatch(JSON.stringify(registered.body), /forbidden_service_extra/u);
});

async function withServer(options, callback) {
  const { createApiServer } = await import("../src/server.js");
  const server = createApiServer(options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postJson(baseUrl, path, body, authorization) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function postRaw(baseUrl, path, body, authorization) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body,
  });
  return { status: response.status, body: await response.json() };
}

async function getJson(baseUrl, path, authorization) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: authorization ? { authorization } : {},
  });
  return { status: response.status, body: await response.json() };
}

test("node HTTP dispatcher authenticates and forwards only legacy signed lifecycle writes", async () => {
  const fake = fakeService();
  const legacy = fakeLegacyService();
  let genericRuntimeCalls = 0;
  const signedPrincipal = principal();
  const context = permissionContext({ value: signedPrincipal });
  const sessionAuth = {
    capabilities: {},
    async resolvePermissionContextFromHeaders(headers) {
      if (headers.authorization !== "Bearer signed-desktop-session") {
        return {
          ok: false,
          status: 401,
          body: {
            outcome: "blocked",
            safe_error_codes: ["AUTH_SESSION_REQUIRED"],
          },
        };
      }
      return {
        ok: true,
        principal: signedPrincipal,
        context,
        token_payload: { surface: "desktop" },
      };
    },
  };
  await withServer({
    sessionAuth,
    outlookDesktopRuntime: {
      entitlement_roster: roster(),
      installation_service: fake.service,
      legacy_installation_service: legacy.service,
    },
    requestRuntimeAuthority: {
      capabilities: {},
      async run() {
        genericRuntimeCalls += 1;
        throw new Error("generic runtime must not wrap installation lifecycle");
      },
    },
  }, async (baseUrl) => {
    const unauthenticated = await postJson(
      baseUrl,
      "/api/desktop/installations",
      legacyRegistrationBody(),
    );
    assert.equal(unauthenticated.status, 401);
    assert.equal(fake.calls.length, 0);

    const invalidJson = await postRaw(
      baseUrl,
      "/api/desktop/installations",
      "{",
      "Bearer signed-desktop-session",
    );
    assert.equal(invalidJson.status, 400);
    assert.deepEqual(invalidJson.body.safe_error_codes, [
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
    ]);

    const oversized = await postJson(
      baseUrl,
      "/api/desktop/installations",
      legacyRegistrationBody({ app_version: "x".repeat(9 * 1024) }),
      "Bearer signed-desktop-session",
    );
    assert.equal(oversized.status, 413);
    assert.deepEqual(oversized.body.safe_error_codes, [
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_TOO_LARGE",
    ]);

    const authenticated = await postJson(
      baseUrl,
      "/api/desktop/installations",
      legacyRegistrationBody(),
      "Bearer signed-desktop-session",
    );
    assert.equal(authenticated.status, 201);
    const replay = await postJson(
      baseUrl,
      "/api/desktop/installations",
      legacyRegistrationBody(),
      "Bearer signed-desktop-session",
    );
    const heartbeat = await postJson(
      baseUrl,
      `/api/desktop/installations/${INSTALLATION_ID}/heartbeat`,
      legacyHeartbeatBody(),
      "Bearer signed-desktop-session",
    );
    const read = await getJson(
      baseUrl,
      `/api/desktop/installations/${INSTALLATION_ID}`,
      "Bearer signed-desktop-session",
    );
    const retire = await postJson(
      baseUrl,
      `/api/desktop/installations/${INSTALLATION_ID}/retire`,
      legacyRetireBody(),
      "Bearer signed-desktop-session",
    );
    assert.deepEqual(
      [replay.status, heartbeat.status, read.status, retire.status],
      [201, 200, 200, 200],
    );
    assert.deepEqual(
      [
        ...legacy.calls.map(({ operation }) => operation),
        ...fake.calls.map(({ operation }) => operation),
      ],
      ["register", "register", "heartbeat", "retire", "read"],
    );
    assert.deepEqual(Object.keys(read.body.installation).sort(), [
      "installation_id",
      "lease_expires_at",
      "retired_at",
      "state_version",
      "status",
    ]);
    assert.deepEqual(fake.calls[0].input.principal, {
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      entra_subject_id: SUBJECT_ID,
    });
    assert.equal(genericRuntimeCalls, 0);
  });
});

test("authority response ODI must match the requested or continued installation ODI", async () => {
  const mismatchedInstallationId = "odi_desktop_api_000000000099";
  let serviceCalls = 0;
  const installation = Object.freeze({
    installation_id: mismatchedInstallationId,
    status: "active",
    state_version: 1,
    lease_expires_at: "2026-08-18T00:00:00.000Z",
    retired_at: null,
  });
  const runtime = {
    entitlement_roster: roster(),
    installation_service: {
      async read() {
        serviceCalls += 1;
        return installation;
      },
    },
  };

  const read = await directRequest({
    pathname: `/api/desktop/installations/${INSTALLATION_ID}`,
    method: "GET",
    body: {},
    runtime,
  });
  assert.throws(
    () => projectOutlookDesktopRegistrationAuthorityResult({
      response_status: 201,
      body: { outcome: "registered", installation },
    }, INSTALLATION_ID),
    /projection is invalid/u,
  );

  assert.equal(read.status, 503);
  assert.equal(read.body.installation, undefined);
  assert.equal(serviceCalls, 1);
});

test("installation projection rejects invalid time or state and emits canonical UTC milliseconds", async () => {
  const readProjection = async (installation) => directRequest({
    pathname: `/api/desktop/installations/${INSTALLATION_ID}`,
    method: "GET",
    body: {},
    runtime: {
      entitlement_roster: roster(),
      installation_service: {
        async read() {
          return installation;
        },
      },
    },
  });
  const base = {
    installation_id: INSTALLATION_ID,
    status: "active",
    state_version: 1,
    lease_expires_at: "2026-08-18T00:00:00+00:00",
    retired_at: null,
  };
  const [invalidTime, contradictoryState, canonical] = await Promise.all([
    readProjection({ ...base, lease_expires_at: "not-a-timestamp" }),
    readProjection({
      ...base,
      retired_at: "2026-08-17T00:00:00+00:00",
    }),
    readProjection(base),
  ]);

  assert.deepEqual(
    [invalidTime.status, contradictoryState.status, canonical.status],
    [503, 503, 200],
  );
  assert.equal(
    canonical.body.installation.lease_expires_at,
    "2026-08-18T00:00:00.000Z",
  );
});
