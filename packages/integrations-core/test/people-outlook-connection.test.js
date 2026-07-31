import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createDurablePeopleOutlookStateAuthority,
  createPeopleOutlookConnectionService,
  createTestPeopleOutlookStateAuthority,
} from "../src/people-outlook-connection.js";
import { createPeopleProviderIdentityRegistry } from "../src/people-provider-identity.js";
import {
  createOutlookConsentService,
  createTestOnlyInMemoryOpaqueTokenVault,
} from "../src/outlook-token-vault.js";

function fixture({
  stateTtlMs = 10 * 60 * 1000,
  exchange,
  consentService: providedConsentService,
  stateAuthority = createTestPeopleOutlookStateAuthority(),
} = {}) {
  let now = "2026-07-30T00:00:00.000Z";
  let beginCount = 0;
  const exchangeCalls = [];
  const identityRegistry = createPeopleProviderIdentityRegistry({
    clock: () => now,
  });
  const consentService = providedConsentService ?? createOutlookConsentService({
    vault: createTestOnlyInMemoryOpaqueTokenVault(),
    clock: () => now,
  });
  const oauthPort = {
    begin() {
      beginCount += 1;
      return {
        state_ref: `state-${beginCount}`,
        authorize_url: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
      };
    },
    exchange(input) {
      exchangeCalls.push(input);
      if (exchange) return exchange(input, exchangeCalls.length);
      return {
        provider_subject_id: `subject-${input.tenant_id}-${input.employee_id}`,
        grant_type: "delegated",
        scopes: ["Calendars.ReadBasic"],
        access_token: `access-${exchangeCalls.length}`,
        refresh_token: `refresh-${exchangeCalls.length}`,
        expires_at: "2026-07-30T01:00:00.000Z",
        key_version: "v1",
      };
    },
  };
  function makeService(authority = stateAuthority, options = {}) {
    return createPeopleOutlookConnectionService({
      identityRegistry,
      consentService,
      oauthPort,
      clock: () => now,
      stateTtlMs,
      stateAuthority: authority,
      ...options,
    });
  }
  const service = makeService();
  return {
    service,
    makeService,
    identityRegistry,
    consentService,
    exchangeCalls,
    setNow(value) {
      now = value;
    },
  };
}

function begin(service, tenantId = "tenant-a", employeeId = "emp-1") {
  return service.begin({
    tenant_id: tenantId,
    employee_id: employeeId,
    can_manage: true,
  });
}

function complete(service, {
  tenantId = "tenant-a",
  employeeId = "emp-1",
  stateRef = "state-1",
  authorizationCode = "authorization-code-1",
} = {}) {
  return service.complete({
    tenant_id: tenantId,
    employee_id: employeeId,
    can_manage: true,
    authorization_code: authorizationCode,
    state_ref: stateRef,
  });
}

test("completion requires a pending exact state and consumes it once", () => {
  const { service, exchangeCalls } = fixture();
  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 0);

  const authorization = begin(service);
  assert.equal(authorization.state_ref, "state-1");
  assert.equal(complete(service).connection_state, "connected");
  assert.equal(exchangeCalls.length, 1);

  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 1);
});

test("state is bound to tenant and employee before provider exchange", () => {
  const { service, exchangeCalls } = fixture();
  begin(service);

  assert.throws(
    () => complete(service, { tenantId: "tenant-b" }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.throws(
    () => complete(service, { employeeId: "emp-2" }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 0);

  assert.equal(complete(service).connection_state, "connected");
  assert.equal(exchangeCalls.length, 1);
});

test("mismatch invalidates the pending attempt and requires a fresh begin", () => {
  const { service, exchangeCalls } = fixture();
  begin(service);
  assert.throws(
    () => complete(service, { stateRef: "state-wrong" }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 0);
  assert.deepEqual(service.status({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    can_manage: true,
  }), {
    provider: "microsoft_graph",
    connection_state: "reauthorization_required",
    can_manage: true,
    delegated_scope: "Calendars.ReadBasic",
    connected_at: null,
    expires_at: null,
    safe_error_code: "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED",
  });

  const retry = begin(service);
  assert.equal(retry.state_ref, "state-2");
  assert.equal(complete(service, { stateRef: retry.state_ref }).connection_state, "connected");
  assert.equal(exchangeCalls.length, 1);
});

test("state comparison does not normalize a callback value", () => {
  const { service, exchangeCalls } = fixture();
  begin(service);
  assert.throws(
    () => complete(service, { stateRef: "state-1 " }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 0);
});

test("a new begin supersedes every earlier callback state", () => {
  const { service, exchangeCalls } = fixture();
  const first = begin(service);
  const second = begin(service);
  assert.notEqual(first.state_ref, second.state_ref);

  assert.throws(
    () => complete(service, { stateRef: first.state_ref }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 0);

  const retry = begin(service);
  assert.equal(complete(service, { stateRef: retry.state_ref }).connection_state, "connected");
  assert.equal(exchangeCalls.length, 1);
});

test("expired state is rejected without exchange and cannot be replayed", () => {
  const {
    service,
    exchangeCalls,
    setNow,
  } = fixture({ stateTtlMs: 60_000 });
  begin(service);
  setNow("2026-07-30T00:01:00.000Z");

  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_EXPIRED",
  );
  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 0);
  assert.equal(
    service.status({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      can_manage: true,
    }).safe_error_code,
    "OUTLOOK_OAUTH_STATE_EXPIRED",
  );
});

test("provider exchange failure consumes state and only a new begin may retry", () => {
  let providerAvailable = false;
  const {
    service,
    exchangeCalls,
  } = fixture({
    exchange(input, callCount) {
      if (!providerAvailable) throw new Error("provider unavailable");
      return {
        provider_subject_id: `subject-${input.tenant_id}-${input.employee_id}`,
        grant_type: "delegated",
        scopes: ["Calendars.ReadBasic"],
        access_token: `access-${callCount}`,
        refresh_token: `refresh-${callCount}`,
        expires_at: "2026-07-30T01:00:00.000Z",
      };
    },
  });
  begin(service);

  assert.throws(
    () => complete(service),
    (error) => (
      error.safe_error_code === "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED"
      && error.cause?.message === "provider unavailable"
    ),
  );
  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 1);

  providerAvailable = true;
  const retry = begin(service);
  assert.equal(complete(service, { stateRef: retry.state_ref }).connection_state, "connected");
  assert.equal(exchangeCalls.length, 2);
});

test("a new begin cannot replace an authorization already being consumed", () => {
  let activeService;
  const harness = fixture({
    exchange(input) {
      assert.throws(
        () => begin(activeService),
        (error) => error.safe_error_code === "OUTLOOK_AUTHORIZATION_IN_PROGRESS",
      );
      return {
        provider_subject_id: `subject-${input.tenant_id}-${input.employee_id}`,
        grant_type: "delegated",
        scopes: ["Calendars.ReadBasic"],
        access_token: "access-consuming",
        refresh_token: "refresh-consuming",
        expires_at: "2026-07-30T01:00:00.000Z",
      };
    },
  });
  activeService = harness.service;
  const authorization = begin(activeService);
  assert.equal(
    complete(activeService, { stateRef: authorization.state_ref }).connection_state,
    "connected",
  );
  assert.equal(harness.exchangeCalls.length, 1);
});

test("consent persistence failure also consumes state before a safe fresh retry", () => {
  const backingConsentService = createOutlookConsentService({
    vault: createTestOnlyInMemoryOpaqueTokenVault(),
    clock: () => "2026-07-30T00:00:00.000Z",
  });
  let failGrant = true;
  const consentService = Object.freeze({
    ...backingConsentService,
    grant(input) {
      if (failGrant) throw new Error("consent persistence unavailable");
      return backingConsentService.grant(input);
    },
  });
  const {
    service,
    exchangeCalls,
  } = fixture({ consentService });
  begin(service);

  assert.throws(
    () => complete(service),
    (error) => (
      error.safe_error_code === "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED"
      && error.cause?.message === "consent persistence unavailable"
    ),
  );
  assert.throws(
    () => complete(service),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 1);

  failGrant = false;
  const retry = begin(service);
  assert.equal(complete(service, { stateRef: retry.state_ref }).connection_state, "connected");
  assert.equal(exchangeCalls.length, 2);
});

test("durable authority completes once across service and authority recreation", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-outlook-state-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "outlook-oauth-state.json");
  const firstAuthority = createDurablePeopleOutlookStateAuthority({ filePath });
  const {
    service,
    makeService,
    exchangeCalls,
  } = fixture({ stateAuthority: firstAuthority });
  const authorization = begin(service);
  assert.equal(readFileSync(filePath, "utf8").includes(authorization.state_ref), false);

  const callbackService = makeService(
    createDurablePeopleOutlookStateAuthority({ filePath }),
    { operational: true },
  );
  assert.equal(
    complete(callbackService, { stateRef: authorization.state_ref }).connection_state,
    "connected",
  );
  assert.equal(exchangeCalls.length, 1);

  const replayService = makeService(
    createDurablePeopleOutlookStateAuthority({ filePath }),
    { operational: true },
  );
  assert.throws(
    () => complete(replayService, { stateRef: authorization.state_ref }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(exchangeCalls.length, 1);
});

test("operational connection rejects the in-memory state authority", () => {
  const { makeService } = fixture();
  assert.throws(
    () => makeService(createTestPeopleOutlookStateAuthority(), { operational: true }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_DURABLE_STATE_REQUIRED",
  );
});
