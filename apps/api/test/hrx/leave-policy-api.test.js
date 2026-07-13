import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const requestContext = Object.freeze({ tenant_id: "tenant-policy-a", actor_id: "hr-001" });

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  return { store, context: createHrxRuntimeContext({ store }) };
}

async function request(context, pathname, method = "GET", body = {}, tenantId = requestContext.tenant_id) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    query: {},
    context,
    requestContext: { ...requestContext, tenant_id: tenantId },
  });
}

test("leave policy API creates tenant-scoped group, type, and published policy configuration", async () => {
  const { store, context } = setup();
  assert.equal((await request(context, "/api/hrx/leave/groups", "POST", {
    group_id: "group-paid",
    code: "PAID_TIME",
    display_name: "유급 휴가",
  })).status, 201);
  assert.equal((await request(context, "/api/hrx/leave/types", "POST", {
    leave_type_id: "type-annual",
    group_id: "group-paid",
    code: "ANNUAL",
    display_name: "연차",
    request_unit: "minutes",
  })).status, 201);
  assert.equal((await request(context, "/api/hrx/leave/policies", "POST", {
    policy_version_id: "policy-v1",
    group_id: "group-paid",
    policy_code: "annual-kr",
    version: 1,
    effective_from: "2026-01-01",
    rules: { reserve_on_submit: true },
  })).status, 201);
  const published = await request(context, "/api/hrx/leave/policies/policy-v1/publish", "POST");
  assert.equal(published.status, 200);
  assert.equal(published.body.outcome, "published");
  assert.equal(published.body.policy.status, "active");

  const configuration = await request(context, "/api/hrx/leave/configuration");
  assert.equal(configuration.status, 200);
  assert.equal(configuration.body.groups.length, 1);
  assert.equal(configuration.body.types.length, 1);
  assert.equal(configuration.body.policies.length, 1);
  const otherTenant = await request(context, "/api/hrx/leave/configuration", "GET", {}, "tenant-policy-b");
  assert.deepEqual(otherTenant.body.groups, []);
  assert.deepEqual(otherTenant.body.types, []);
  assert.deepEqual(otherTenant.body.policies, []);
  store.close();
});

test("leave policy routes require granular policy scopes and active type lookup uses self read", () => {
  assert.equal(
    resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/configuration" }).required_scope,
    "hrx.leave.policy.read",
  );
  assert.equal(
    resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/groups" }).required_scope,
    "hrx.leave.policy.write",
  );
  assert.equal(
    resolveHrxRoutePolicy({ method: "PATCH", pathname: "/api/hrx/leave/types/type-annual" }).resource_id,
    "type-annual",
  );
  assert.equal(
    resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/types/active" }).required_scope,
    "hrx.leave.self.read",
  );
});
