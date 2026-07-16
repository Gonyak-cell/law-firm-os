import assert from "node:assert/strict";
import test from "node:test";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
  seedHrxDurableRuntimeStore,
} from "../../src/hrx-runtime-context.js";
import { requiredPurposeForAction } from "../../src/middleware/hrx-step-up.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { createSqlLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = "tenant-a";
const OTHER_TENANT = "tenant-entitlement-other";
const NOW = "2026-07-14T01:00:00.000Z";

function insertPolicy(store, tenantId) {
  store.query("insert", {
    table: "hrx_leave_groups",
    row: { tenant_id: tenantId, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: { tenant_id: tenantId, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" },
  });
}

function insertEntitlement(store, { tenantId = TENANT, entitlementId, employeeId, validFrom, expiresOn, minutes }) {
  store.query("insert", {
    table: "hrx_leave_entitlements",
    row: {
      tenant_id: tenantId,
      entitlement_id: entitlementId,
      employee_id: employeeId,
      group_id: "annual",
      policy_version_id: "annual-v1",
      granted_minutes: minutes,
      valid_from: validFrom,
      expires_on: expiresOn,
      source_ref: `SyntheticLifecycle:${entitlementId}`,
      idempotency_key: `entitlement:${entitlementId}`,
      state_version: 1,
    },
  });
  createSqlLeaveBalanceLedger({ store }).append({
    tenant_id: tenantId,
    entry_id: `earned:${entitlementId}`,
    employee_id: employeeId,
    policy_id: "ANNUAL-2026",
    group_id: "annual",
    policy_version_id: "annual-v1",
    entitlement_id: entitlementId,
    idempotency_key: `earned:${entitlementId}`,
    entry_type: "earned",
    amount_minutes: minutes,
    occurred_on: validFrom,
    source_ref: `SyntheticLifecycle:${entitlementId}`,
  });
}

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  insertPolicy(store, TENANT);
  insertEntitlement(store, { entitlementId: "ent-manager-active", employeeId: "emp-001", validFrom: "2026-01-01", expiresOn: "2026-12-31", minutes: 480 });
  insertEntitlement(store, { entitlementId: "ent-self-active", employeeId: "emp-002", validFrom: "2026-01-01", expiresOn: "2026-12-31", minutes: 480 });
  insertEntitlement(store, { entitlementId: "ent-self-expired", employeeId: "emp-002", validFrom: "2026-01-01", expiresOn: "2026-06-30", minutes: 240 });
  store.query("insert", { table: "hrx_employees", row: { tenant_id: OTHER_TENANT, employee_id: "emp-other", display_name: "다른 테넌트", status: "active" } });
  insertPolicy(store, OTHER_TENANT);
  insertEntitlement(store, { tenantId: OTHER_TENANT, entitlementId: "ent-other", employeeId: "emp-other", validFrom: "2026-01-01", expiresOn: "2026-12-31", minutes: 960 });
  const context = createHrxRuntimeContext({ store, clock: () => NOW });
  return { store, context };
}

function actor(actorId, scopes, stepUp = false) {
  return {
    tenant_id: TENANT,
    actor_id: actorId,
    actor_role: "synthetic_test",
    hrx_scopes: scopes,
    session_bound: true,
    step_up_verified: stepUp,
  };
}

function request(context, pathname, method, { body = {}, query = {}, requestContext } = {}) {
  return handleHrxApiRequest({ pathname, method, body, query, context, requestContext });
}

test("LV-LIFE-006 route policies separate lifecycle reads from expiration execution", () => {
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/entitlements" }).required_scope, "hrx.leave.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/entitlements/ent-001" }).resource_id, "ent-001");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/entitlements/expiration-preview" }).required_scope, "hrx.leave.ledger.adjust");
  const execute = resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/entitlements/expiration-execute" });
  assert.equal(execute.required_scope, "hrx.leave.ledger.adjust");
  assert.equal(requiredPurposeForAction(execute.action), "leave_ledger_adjustment");
  for (const [method, pathname] of [
    ["PATCH", "/api/hrx/leave/entitlements/ent-001"],
    ["POST", "/api/hrx/leave/entitlements/ent-001/cancel"],
    ["POST", "/api/hrx/leave/entitlements/ent-001/adjust"],
  ]) {
    const policy = resolveHrxRoutePolicy({ method, pathname });
    assert.equal(policy.required_scope, "hrx.leave.ledger.adjust");
    assert.equal(requiredPurposeForAction(policy.action), "leave_ledger_adjustment");
  }
});

test("LV-LIFE-006 lists only authorized rows with lifecycle filters and opaque pagination", () => {
  const { store, context } = setup();
  const employee = actor("user-hrx-002", ["hrx.leave.self.read"]);
  const first = request(context, "/api/hrx/leave/entitlements", "GET", {
    query: { as_of: "2026-07-14", limit: "1" },
    requestContext: employee,
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.pagination.total, 2);
  assert.equal(first.body.entitlements.length, 1);
  assert.equal(first.body.entitlements[0].employee_id, "emp-002");
  assert.ok(first.body.pagination.next_cursor);
  const second = request(context, "/api/hrx/leave/entitlements", "GET", {
    query: { as_of: "2026-07-14", limit: "1", cursor: first.body.pagination.next_cursor },
    requestContext: employee,
  });
  assert.equal(second.body.entitlements.length, 1);
  assert.equal(second.body.pagination.next_cursor, null);
  const expired = request(context, "/api/hrx/leave/entitlements", "GET", {
    query: { as_of: "2026-07-14", state: "expired" },
    requestContext: employee,
  });
  assert.deepEqual(expired.body.entitlements.map((row) => row.entitlement_id), ["ent-self-expired"]);
  assert.equal(expired.body.entitlements[0].available_minutes, 240);
  const forcedOtherEmployee = request(context, "/api/hrx/leave/entitlements", "GET", {
    query: { as_of: "2026-07-14", employee_id: "emp-001" },
    requestContext: employee,
  });
  assert.equal(forcedOtherEmployee.body.pagination.total, 0);
  assert.deepEqual(forcedOtherEmployee.body.entitlements, []);
  store.close();
});

test("LV-LIFE-006 exposes direct reports to a manager, tenant rows to HR, and hides unauthorized detail", () => {
  const { store, context } = setup();
  const manager = actor("user-hrx-001", ["hrx.leave.self.read", "hrx.leave.team.read"]);
  const managerRows = request(context, "/api/hrx/leave/entitlements", "GET", {
    query: { as_of: "2026-07-14" },
    requestContext: manager,
  });
  assert.equal(managerRows.body.pagination.total, 3);
  const employee = actor("user-hrx-002", ["hrx.leave.self.read"]);
  const hidden = request(context, "/api/hrx/leave/entitlements/ent-manager-active", "GET", {
    query: { as_of: "2026-07-14" },
    requestContext: employee,
  });
  assert.equal(hidden.status, 404);
  assert.equal(hidden.body.count_leak_prevented, true);
  const hr = actor("hr-operator", ["hrx.leave.self.read", "hrx.leave.ledger.adjust"]);
  const hrRows = request(context, "/api/hrx/leave/entitlements", "GET", {
    query: { as_of: "2026-07-14" },
    requestContext: hr,
  });
  assert.equal(hrRows.body.pagination.total, 3);
  assert.equal(hrRows.body.entitlements.some((row) => row.entitlement_id === "ent-other"), false);
  store.close();
});

test("LV-LIFE-006 previews and executes expiration once with HR scope and fresh step-up", () => {
  const { store, context } = setup();
  const hr = actor("hr-operator", ["hrx.leave.self.read", "hrx.leave.ledger.adjust"]);
  const preview = request(context, "/api/hrx/leave/entitlements/expiration-preview", "POST", {
    body: { as_of: "2026-07-14", timezone: "Asia/Seoul" },
    requestContext: hr,
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.preview.totals.candidate_count, 1);
  assert.equal(preview.body.preview.totals.expiration_minutes, 240);
  const challenged = request(context, "/api/hrx/leave/entitlements/expiration-execute", "POST", {
    body: { preview_id: preview.body.preview.preview_id },
    requestContext: hr,
  });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  const executed = request(context, "/api/hrx/leave/entitlements/expiration-execute", "POST", {
    body: { preview_id: preview.body.preview.preview_id },
    requestContext: actor("hr-operator", ["hrx.leave.self.read", "hrx.leave.ledger.adjust"], true),
  });
  assert.equal(executed.status, 200);
  assert.equal(executed.body.execution.totals.expired_count, 1);
  assert.equal(executed.body.execution.totals.expired_minutes, 240);
  const replay = request(context, "/api/hrx/leave/entitlements/expiration-execute", "POST", {
    body: { preview_id: preview.body.preview.preview_id },
    requestContext: actor("hr-operator", ["hrx.leave.self.read", "hrx.leave.ledger.adjust"], true),
  });
  assert.equal(replay.body.execution.replayed, true);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entitlement_id: "ent-self-expired", entry_type: "expired" } }).length, 1);
  store.close();
});

test("LV-OCC-004A patches and cancels scheduled occurrences and adjusts active ones through the API", () => {
  const { store, context } = setup();
  insertEntitlement(store, { entitlementId: "ent-scheduled", employeeId: "emp-002", validFrom: "2026-08-01", expiresOn: "2027-07-31", minutes: 480 });
  const hr = actor("hr-operator", ["hrx.leave.self.read", "hrx.leave.ledger.adjust"], true);

  const noStepUp = request(context, "/api/hrx/leave/entitlements/ent-scheduled", "PATCH", {
    body: { expected_version: 1, idempotency_key: "patch-no-step", valid_from: "2026-09-01", as_of: "2026-07-14" },
    requestContext: actor("hr-operator", ["hrx.leave.self.read", "hrx.leave.ledger.adjust"]),
  });
  assert.equal(noStepUp.status, 403);
  assert.equal(noStepUp.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(noStepUp.body.step_up_required, true);
  assert.equal(noStepUp.body.required_purpose, "leave_ledger_adjustment");
  assert.equal(noStepUp.body.fail_closed, true);

  const patched = request(context, "/api/hrx/leave/entitlements/ent-scheduled", "PATCH", {
    body: { expected_version: 1, idempotency_key: "patch-api-001", valid_from: "2026-09-01", expires_on: "2027-08-31", as_of: "2026-07-14" },
    requestContext: hr,
  });
  assert.equal(patched.status, 200, JSON.stringify(patched.body));
  assert.deepEqual({ state: patched.body.entitlement.state, version: patched.body.entitlement.state_version }, { state: "scheduled", version: 2 });

  const cancelled = request(context, "/api/hrx/leave/entitlements/ent-scheduled/cancel", "POST", {
    body: { expected_version: 2, idempotency_key: "cancel-api-001", reason_code: "approved_cancellation", as_of: "2026-07-14" },
    requestContext: hr,
  });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(cancelled.body.entitlement.state, "cancelled");
  assert.equal(cancelled.body.entitlement.reversed_minutes, 480);

  const adjusted = request(context, "/api/hrx/leave/entitlements/ent-self-active/adjust", "POST", {
    body: { expected_version: 1, idempotency_key: "adjust-api-001", direction: "debit", amount_minutes: 60, reason_code: "approved_correction", as_of: "2026-07-14" },
    requestContext: hr,
  });
  assert.equal(adjusted.status, 200, JSON.stringify(adjusted.body));
  assert.equal(adjusted.body.entitlement.available_minutes_after, 420);
  assert.equal(store.query("select", { table: "hrx_audit_events", where: { tenant_id: TENANT, action: "hrx.leave.entitlement.cancel" } }).length, 1);
  store.close();
});
