import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
} from "../../src/hrx-runtime-context.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";

const TENANT = "tenant-outlook-consent";
const EMPLOYEE = "emp-outlook";
const USER = "user-outlook";
const ACCESS_TOKEN = "access-token-must-never-leak";
const REFRESH_TOKEN = "refresh-token-must-never-leak";
const BEGIN_IDEMPOTENCY_KEY = "people-outlook-begin-001";

function repository() {
  return createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: EMPLOYEE,
      display_name: "김변호사",
      status: "active",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-outlook",
      employee_id: EMPLOYEE,
      user_id: USER,
      purpose: "login_mapping",
      source_ref: "test:outlook-consent",
    }],
  });
}

function permissionContext() {
  return {
    principal: { user_id: USER, tenant_id: TENANT, role_ids: ["staff"] },
    rules: [{ id: "employee-read", effect: "allow", action: "hrx.employee.read" }],
    object_acl: [],
  };
}

function actor(actorId = USER) {
  return {
    tenant_id: TENANT,
    actor_id: actorId,
    actor_role: "staff",
    hrx_scopes: ["hrx.employee.read"],
    session_bound: true,
  };
}

function request(context, method, body = {}, actorId = USER) {
  return handleHrxApiRequest({
    pathname: `/api/hrx/people/members/${EMPLOYEE}/outlook-connection`,
    method,
    body,
    context,
    requestContext: actor(actorId),
    permissionContext: permissionContext(),
  });
}

function completeRequest(context, body = {}, actorId = USER) {
  return handleHrxApiRequest({
    pathname: "/api/hrx/people/me/outlook-connection/complete",
    method: "POST",
    body,
    context,
    requestContext: actor(actorId),
    permissionContext: permissionContext(),
  });
}

function context(overrides = {}) {
  return createHrxRuntimeContext({
    repository: repository(),
    seedRuntimeFixtures: false,
    allowInMemoryOutlookTokenVault: true,
    clock: () => "2026-07-30T00:30:00.000Z",
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: true,
      people_capacity: false,
    },
    outlookOauthPort: {
      begin() {
        return {
          state_ref: "oauth-state-1",
          authorize_url: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
        };
      },
      exchange() {
        return {
          provider_subject_id: "m365-subject-1",
          grant_type: "delegated",
          scopes: ["Calendars.ReadBasic"],
          access_token: ACCESS_TOKEN,
          refresh_token: REFRESH_TOKEN,
          expires_at: "2026-07-30T01:30:00.000Z",
          key_version: "v1",
        };
      },
    },
    ...overrides,
  });
}

test("Outlook connection routes are mapped to employee read plus a self-service runtime guard", () => {
  for (const method of ["GET", "POST", "DELETE"]) {
    const policy = resolveHrxRoutePolicy({
      method,
      pathname: `/api/hrx/people/members/${EMPLOYEE}/outlook-connection`,
    });
    assert.equal(policy.required_scope, "hrx.employee.read");
    assert.equal(policy.resource_id, EMPLOYEE);
  }
  const result = request(context(), "POST", {
    action: "begin",
    idempotency_key: BEGIN_IDEMPOTENCY_KEY,
  }, "user-other");
  assert.equal(result.status, 403);
  assert.equal(result.body.safe_error_code, "PEOPLE_MEMBER_READ_DENIED");
});

test("OAuth begin requires an explicit idempotency key before changing connection state", () => {
  const runtime = context();
  const missing = request(runtime, "POST", { action: "begin" });
  assert.equal(missing.status, 400);
  assert.equal(
    missing.body.safe_error_code,
    "OUTLOOK_CONNECTION_IDEMPOTENCY_KEY_REQUIRED",
  );
  const oversized = request(runtime, "POST", {
    action: "retry",
    idempotency_key: "x".repeat(256),
  });
  assert.equal(oversized.status, 400);
  assert.equal(
    oversized.body.safe_error_code,
    "OUTLOOK_CONNECTION_IDEMPOTENCY_KEY_REQUIRED",
  );
  assert.equal(
    request(runtime, "GET").body.connection.connection_state,
    "not_connected",
  );
});

test("OAuth begin accepts the authenticated actor injected by the HTTP boundary", () => {
  const runtime = context();
  const begun = request(runtime, "POST", {
    action: "retry",
    actor_id: USER,
    idempotency_key: "people-outlook-retry-authenticated-actor-001",
  });
  assert.equal(begun.status, 200);
  assert.equal(begun.body.connection.connection_state, "consent_pending");
  assert.equal(
    request(runtime, "DELETE").body.connection.connection_state,
    "not_connected",
  );

  const blocked = request(context(), "POST", {
    action: "retry",
    actor_id: USER,
    idempotency_key: "people-outlook-retry-extra-key-001",
    tenant_id: TENANT,
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.safe_error_code, "OUTLOOK_CONNECTION_ACTION_INVALID");
});

test("OAuth completion stores delegated consent without returning or auditing token material", () => {
  const runtime = context();
  assert.equal(request(runtime, "GET").body.connection.connection_state, "not_connected");
  assert.equal(request(runtime, "POST", {
    action: "begin",
    idempotency_key: BEGIN_IDEMPOTENCY_KEY,
  }).body.connection.connection_state, "consent_pending");

  const completed = completeRequest(runtime, {
    authorization_code: "authorization-code-1",
    state_ref: "oauth-state-1",
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.employee_id, EMPLOYEE);
  assert.equal(completed.body.connection.connection_state, "connected");
  assert.equal(completed.body.connection.delegated_scope, "Calendars.ReadBasic");

  const serialized = JSON.stringify({
    response: completed,
    identities: runtime.peopleProviderIdentities.snapshot(),
    consents: runtime.outlookConsentService.snapshot(),
    vault: runtime.outlookTokenVault.snapshot(),
    audit: runtime.audit.list({ tenant_id: TENANT }),
  });
  assert.equal(serialized.includes(ACCESS_TOKEN), false);
  assert.equal(serialized.includes(REFRESH_TOKEN), false);
  const publicSerialized = JSON.stringify({
    response: completed,
    audit: runtime.audit.list({ tenant_id: TENANT }),
  });
  assert.equal(publicSerialized.includes("access_token"), false);
  assert.equal(publicSerialized.includes("refresh_token"), false);
  assert.equal(publicSerialized.includes("credential"), false);
});

test("client-supplied tokens are rejected and revoke immediately removes active identity", () => {
  const runtime = context();
  const invalid = completeRequest(runtime, {
    authorization_code: "authorization-code-1",
    access_token: "client-token",
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.safe_error_code, "OUTLOOK_OAUTH_BOUNDARY_INVALID");

  const begun = request(runtime, "POST", {
    action: "begin",
    idempotency_key: BEGIN_IDEMPOTENCY_KEY,
  });
  completeRequest(runtime, {
    authorization_code: "authorization-code-2",
    state_ref: begun.body.connection.state_ref,
  });
  assert.equal(request(runtime, "GET").body.connection.connection_state, "connected");
  const disconnected = request(runtime, "DELETE");
  assert.equal(disconnected.status, 200);
  assert.equal(disconnected.body.connection.connection_state, "not_connected");
  assert.equal(runtime.peopleProviderIdentities.get({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
  }), null);
  assert.throws(
    () => runtime.outlookConsentService.resolveCredential({
      tenant_id: TENANT,
      consent_ref: runtime.outlookConsentService.snapshot()[0].consent_ref,
    }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_REVOKED",
  );
});

test("Outlook flag off leaves the connection route unavailable", () => {
  const runtime = context({
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: false,
      people_capacity: false,
    },
  });
  const result = request(runtime, "GET");
  assert.equal(result.status, 404);
  assert.equal(result.body.safe_error_code, "OUTLOOK_CALENDAR_DISABLED");
});
