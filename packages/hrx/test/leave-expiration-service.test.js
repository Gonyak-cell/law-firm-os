import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveExpirationService } from "../src/leave/expiration-service.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-expiration-synthetic";
const NOW = "2026-07-01T01:00:00.000Z";

function fixture() {
  const store = createFileHrxStore();
  store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id: "emp-001", display_name: "합성 구성원", status: "active" } });
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  for (const [entitlementId, minutes, expiresOn] of [["earlier", 240, "2026-05-31"], ["later", 480, "2026-06-30"], ["active", 600, "2026-12-31"]]) {
    store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: entitlementId, employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: minutes, valid_from: "2026-01-01", expires_on: expiresOn, source_ref: `LeaveAccrualRun:${entitlementId}`, idempotency_key: `entitlement:${entitlementId}`, state_version: 1 } });
    createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: `earned:${entitlementId}`, employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: entitlementId, idempotency_key: `earned:${entitlementId}`, entry_type: "earned", amount_minutes: minutes, occurred_on: "2026-01-01", source_ref: `LeaveAccrualRun:${entitlementId}` });
  }
  const ledger = createSqlLeaveBalanceLedger({ store });
  ledger.append({ tenant_id: TENANT, entry_id: "used:later", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "later", idempotency_key: "used:later", entry_type: "used", amount_minutes: 120, occurred_on: "2026-04-01", source_ref: "LeaveRequest:used" });
  ledger.append({ tenant_id: TENANT, entry_id: "reserved:later", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "later", idempotency_key: "reserved:later", entry_type: "reserved", amount_minutes: 60, occurred_on: "2026-06-20", source_ref: "LeaveRequest:reserved" });
  let sequence = 0;
  const service = createLeaveExpirationService({
    store,
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
  });
  const context = { tenant_id: TENANT, actor_id: "hr-operator", step_up_verified: true };
  return { store, service, context };
}

test("LV-LIFE-003 executes a matching preview once and reconciles the ledger", () => {
  const { store, service, context } = fixture();
  const preview = service.preview(context, { as_of: "2026-07-01", timezone: "Asia/Seoul" });
  assert.deepEqual(preview.rows.map((row) => [row.entitlement_id, row.remaining_minutes]), [["earlier", 240], ["later", 300]]);

  const executed = service.execute(context, { preview_id: preview.preview_id });
  assert.deepEqual(executed.totals, { expired_count: 2, expired_minutes: 540 });
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "expired" } }).length, 2);
  assert.deepEqual(service.preview(context, { as_of: "2026-07-01", timezone: "Asia/Seoul" }).totals, { candidate_count: 0, expiration_minutes: 0 });

  const replay = service.execute(context, { preview_id: preview.preview_id });
  assert.equal(replay.replayed, true);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "expired" } }).length, 2);
  const audit = store.query("selectOne", { table: "hrx_audit_events", where: { tenant_id: TENANT, action: "hrx.leave.expiration.execute" } });
  assert.equal(JSON.parse(audit.metadata_json).expired_minutes, 540);
});

test("LV-LIFE-003 rejects a stale preview without partial expiration", () => {
  const { store, service, context } = fixture();
  const preview = service.preview(context, { as_of: "2026-07-01" });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "late-used:earlier", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "earlier", idempotency_key: "late-used:earlier", entry_type: "used", amount_minutes: 60, occurred_on: "2026-06-30", source_ref: "LeaveRequest:late" });

  assert.throws(
    () => service.execute(context, { preview_id: preview.preview_id }),
    (error) => error.safe_error_code === "HRX_LEAVE_EXPIRATION_PREVIEW_STALE",
  );
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "expired" } }).length, 0);
  assert.equal(store.query("select", { table: "hrx_leave_command_receipts", where: { tenant_id: TENANT, command_type: "leave_entitlement_expiration_execute" } }).length, 0);
});

test("LV-LIFE-003 requires step-up and keeps preview IDs tenant scoped", () => {
  const { service, context } = fixture();
  const preview = service.preview(context, { as_of: "2026-07-01" });
  assert.throws(
    () => service.execute({ ...context, step_up_verified: false }, { preview_id: preview.preview_id }),
    (error) => error.safe_error_code === "HRX_STEP_UP_REQUIRED" && error.status === 403,
  );
  assert.throws(
    () => service.execute({ ...context, tenant_id: "tenant-other" }, { preview_id: preview.preview_id }),
    (error) => error.safe_error_code === "HRX_LEAVE_EXPIRATION_PREVIEW_NOT_FOUND" && error.status === 404,
  );
});
