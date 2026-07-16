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

test("leave policy API normalizes, versions, reads, and freezes leave type economics", async () => {
  const { store, context } = setup();
  await request(context, "/api/hrx/leave/groups", "POST", {
    group_id: "group-economics",
    code: "ECONOMICS",
    display_name: "차감 규칙",
  });
  await request(context, "/api/hrx/leave/types", "POST", {
    leave_type_id: "type-economics",
    group_id: "group-economics",
    code: "ECONOMICS",
    display_name: "시간 규칙",
    request_unit: "minutes",
  });

  const created = await request(context, "/api/hrx/leave/policies", "POST", {
    policy_version_id: "policy-economics-v1",
    group_id: "group-economics",
    policy_code: "economics-kr",
    version: 1,
    effective_from: "2026-01-01",
    rules: {
      type_rules: {
        "type-economics": {
          usage_modes: ["full_day", "half_day", "quarter_day", "hours"],
          paid_ratio_bps: 10_000,
          deduction_ratio_bps: 10_000,
        },
      },
    },
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.policy.rules.type_rules["type-economics"], {
    usage_modes: ["full_day", "half_day", "quarter_day", "hours"],
    standard_day_minutes: 480,
    paid_ratio_bps: 10_000,
    deduction_ratio_bps: 10_000,
    rounding_minutes: 1,
    rounding_mode: "none",
  });

  const updated = await request(context, "/api/hrx/leave/policies/policy-economics-v1", "PATCH", {
    rules: {
      type_rules: {
        "type-economics": {
          usage_modes: ["hours"],
          standard_day_minutes: 480,
          paid_ratio_bps: 5_000,
          deduction_ratio_bps: 7_500,
          rounding_minutes: 15,
          rounding_mode: "ceil",
        },
      },
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.policy.rules.type_rules["type-economics"].paid_ratio_bps, 5_000);

  const configuration = await request(context, "/api/hrx/leave/configuration");
  assert.deepEqual(configuration.body.policies[0].rules.type_rules, updated.body.policy.rules.type_rules);

  const published = await request(context, "/api/hrx/leave/policies/policy-economics-v1/publish", "POST");
  assert.equal(published.status, 200);
  const immutable = await request(context, "/api/hrx/leave/policies/policy-economics-v1", "PATCH", {
    rules: { type_rules: {} },
  });
  assert.equal(immutable.status, 409);
  assert.equal(immutable.body.safe_error_code, "HRX_LEAVE_POLICY_VERSION_IMMUTABLE");

  const nextVersion = await request(context, "/api/hrx/leave/policies/policy-economics-v1/versions", "POST", {
    policy_version_id: "policy-economics-v2",
    effective_from: "2027-01-01",
  });
  assert.equal(nextVersion.status, 201);
  assert.equal(nextVersion.body.policy.version, 2);
  assert.deepEqual(nextVersion.body.policy.rules.type_rules, updated.body.policy.rules.type_rules);

  const invalid = await request(context, "/api/hrx/leave/policies", "POST", {
    policy_version_id: "policy-economics-invalid",
    group_id: "group-economics",
    policy_code: "economics-invalid",
    version: 1,
    effective_from: "2026-01-01",
    rules: { type_rules: { "type-economics": { paid_ratio_bps: 10_001 } } },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.safe_error_code, "HRX_API_VALIDATION_ERROR");

  const otherTenant = await request(context, "/api/hrx/leave/configuration", "GET", {}, "tenant-policy-b");
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
