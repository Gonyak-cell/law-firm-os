import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveEntitlementCommandService } from "../src/leave/entitlement-command-service.js";
import { deriveLeaveEntitlementLifecycle } from "../src/leave/entitlement-lifecycle.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-entitlement-command-synthetic";
const NOW = "2026-07-14T01:00:00.000Z";

function fixture({ validFrom = "2026-08-01", expiresOn = "2027-07-31" } = {}) {
  const store = createFileHrxStore();
  store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id: "emp-001", display_name: "합성 구성원", status: "active" } });
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "ent-001", employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 480, valid_from: validFrom, expires_on: expiresOn, source_ref: "LeaveAccrualRun:scheduled", idempotency_key: "entitlement:scheduled", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "earned:ent-001", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "ent-001", idempotency_key: "earned:ent-001", entry_type: "earned", amount_minutes: 480, occurred_on: validFrom, source_ref: "LeaveAccrualRun:scheduled" });
  let sequence = 0;
  const service = createLeaveEntitlementCommandService({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` });
  const context = { tenant_id: TENANT, actor_id: "hr-operator", step_up_verified: true };
  return { store, service, context };
}

test("LV-LIFE-005 patches only future scheduled dates with optimistic versioning", () => {
  const { store, service, context } = fixture();
  const result = service.patchScheduled(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "patch-001", valid_from: "2026-09-01", expires_on: "2027-08-31", as_of: "2026-07-14" });
  assert.deepEqual({ state: result.state, version: result.state_version, from: result.valid_from, to: result.expires_on }, { state: "scheduled", version: 2, from: "2026-09-01", to: "2027-08-31" });
  assert.equal(service.patchScheduled(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "patch-001", valid_from: "2026-09-01", expires_on: "2027-08-31", as_of: "2026-07-14" }).replayed, true);
  assert.throws(
    () => service.patchScheduled(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "patch-stale", valid_from: "2026-10-01", as_of: "2026-07-14" }),
    (error) => error.safe_error_code === "HRX_STATE_VERSION_CONFLICT",
  );
  assert.throws(
    () => service.patchScheduled(context, { entitlement_id: "ent-001", expected_version: 2, idempotency_key: "patch-amount", granted_minutes: 600, as_of: "2026-07-14" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ENTITLEMENT_PATCH_FIELD_UNSUPPORTED",
  );
  assert.equal(store.query("select", { table: "hrx_audit_events", where: { tenant_id: TENANT, action: "hrx.leave.entitlement.patch" } }).length, 1);
});

test("LV-LIFE-005 cancels a future grant immediately through an exact ledger reversal", () => {
  const { store, service, context } = fixture();
  const cancelled = service.cancelScheduled(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "cancel-001", reason_code: "schedule_removed", as_of: "2026-07-14" });
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.reversed_minutes, 480);
  const entries = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entitlement_id: "ent-001" } });
  assert.equal(entries.length, 2);
  assert.equal(entries.find((entry) => entry.reverses_entry_id === "earned:ent-001").adjustment_direction, "debit");
  assert.equal(deriveLeaveEntitlementLifecycle({ entitlement: store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-001" } }), ledger_entries: entries, as_of: "2026-07-14" }).state, "cancelled");
  assert.equal(service.cancelScheduled(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "cancel-001", reason_code: "schedule_removed", as_of: "2026-07-14" }).replayed, true);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entitlement_id: "ent-001" } }).length, 2);
});

test("LV-LIFE-005 keeps active entitlement fields immutable and appends a bounded adjustment", () => {
  const { store, service, context } = fixture({ validFrom: "2026-01-01", expiresOn: "2026-12-31" });
  assert.throws(
    () => service.patchScheduled(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "active-patch", expires_on: "2027-01-31", as_of: "2026-07-14" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ENTITLEMENT_IMMUTABLE",
  );
  const adjusted = service.adjustActive(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "adjust-001", direction: "debit", amount_minutes: 120, reason_code: "approved_correction", as_of: "2026-07-14" });
  assert.deepEqual({ state: adjusted.state, version: adjusted.state_version, remaining: adjusted.available_minutes_after }, { state: "active", version: 2, remaining: 360 });
  assert.equal(store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-001" } }).granted_minutes, 480);
  assert.equal(service.adjustActive(context, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "adjust-001", direction: "debit", amount_minutes: 120, reason_code: "approved_correction", as_of: "2026-07-14" }).replayed, true);
  assert.throws(
    () => service.adjustActive(context, { entitlement_id: "ent-001", expected_version: 2, idempotency_key: "adjust-too-large", direction: "debit", amount_minutes: 361, reason_code: "invalid", as_of: "2026-07-14" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ENTITLEMENT_ADJUSTMENT_EXCEEDS_BALANCE",
  );
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entitlement_id: "ent-001" } }).length, 2);
});

test("LV-LIFE-005 requires step-up and keeps commands tenant scoped", () => {
  const { service, context } = fixture();
  assert.throws(
    () => service.cancelScheduled({ ...context, step_up_verified: false }, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "cancel-no-step-up", reason_code: "invalid", as_of: "2026-07-14" }),
    (error) => error.safe_error_code === "HRX_STEP_UP_REQUIRED" && error.status === 403,
  );
  assert.throws(
    () => service.cancelScheduled({ ...context, tenant_id: "tenant-other" }, { entitlement_id: "ent-001", expected_version: 1, idempotency_key: "cancel-other", reason_code: "invalid", as_of: "2026-07-14" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ENTITLEMENT_NOT_FOUND" && error.status === 404,
  );
});
