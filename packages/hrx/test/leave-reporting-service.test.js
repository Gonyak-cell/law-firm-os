import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveReportingService } from "../src/leave/reporting-service.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-leave-report-synthetic";
const NOW = "2026-07-13T01:00:00.000Z";

function fixture() {
  const store = createFileHrxStore();
  for (const [employee_id, display_name] of [["emp-001", "김하늘"], ["emp-002", "이바다"]]) {
    store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id, display_name, status: "active" } });
  }
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  const ledger = createSqlLeaveBalanceLedger({ store });
  for (const employeeId of ["emp-001", "emp-002"]) {
    const entitlementId = `entitlement-${employeeId}`;
    store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: entitlementId, employee_id: employeeId, group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:synthetic", idempotency_key: `entitlement-${employeeId}`, state_version: 1 } });
    ledger.append({ tenant_id: TENANT, entry_id: `earned-${employeeId}`, employee_id: employeeId, policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: entitlementId, idempotency_key: `earned-${employeeId}`, entry_type: "earned", amount_minutes: 960, occurred_on: "2026-01-01", source_ref: "LeaveAccrualRun:synthetic", metadata: employeeId === "emp-002" ? { reason: "내보내면 안 되는 사유", attachment_id: "secret-doc" } : {} });
  }
  let sequence = 0;
  const service = createLeaveReportingService({
    store,
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    employeeDirectory: () => [
      { employee_id: "emp-001", display_name: "김하늘" },
      { employee_id: "emp-002", display_name: "이바다" },
    ],
  });
  return { store, service, ledger };
}

function context(ids = ["emp-001", "emp-002"]) {
  return { tenant_id: TENANT, actor_id: "hr-operator", authorized_employee_ids: ids };
}

test("leave reporting filters before counting and exports the exact visible totals without private fields", () => {
  const { service } = fixture();
  const visible = service.query(context(["emp-001"]), { employee_id: "emp-001", entry_type: "earned" });
  assert.equal(visible.rows.length, 1);
  assert.equal(visible.totals.row_count, 1);
  assert.equal(visible.totals.earned, 960);
  assert.equal(visible.rows[0].employee_display_name, "김하늘");

  const unauthorized = service.query(context(["emp-001"]), { employee_id: "emp-002" });
  assert.equal(unauthorized.rows.length, 0);
  assert.equal(unauthorized.totals.row_count, 0);
  assert.equal(JSON.stringify(unauthorized).includes("이바다"), false);

  const csv = service.exportReport(context(), { format: "csv" });
  const csvText = Buffer.from(csv.content_base64, "base64").toString("utf8");
  assert.equal(csv.row_count, 2);
  assert.equal(csv.totals.earned, 1920);
  assert.match(csvText, /김하늘/);
  assert.doesNotMatch(csvText, /내보내면 안 되는 사유|secret-doc/);

  const xlsx = service.exportReport(context(), { format: "xlsx" });
  const xlsxBuffer = Buffer.from(xlsx.content_base64, "base64");
  assert.equal(xlsxBuffer.subarray(0, 2).toString("ascii"), "PK");
  assert.equal(xlsx.row_count, visible.totals.row_count + 1);
  assert.equal(xlsx.privacy_boundary, "reason_and_attachment_excluded");
});

test("balance snapshot validator distinguishes match, mismatch, and missing", () => {
  const { service, store, ledger } = fixture();
  const scoped = context(["emp-001"]);
  const missing = service.validateBalances(scoped, { as_of: "2026-07-13" });
  assert.deepEqual(missing.counts, { match: 0, mismatch: 0, missing: 1 });

  service.captureSnapshots(scoped, { as_of: "2026-07-13" });
  assert.deepEqual(service.validateBalances(scoped, { as_of: "2026-07-13" }).counts, { match: 1, mismatch: 0, missing: 0 });

  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "adjustment-entitlement", employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 60, valid_from: "2026-07-13", expires_on: "2026-12-31", source_ref: "HRDocument:synthetic", idempotency_key: "adjustment-entitlement", state_version: 1 } });
  ledger.append({ tenant_id: TENANT, entry_id: "adjustment-credit", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "adjustment-entitlement", idempotency_key: "adjustment-credit", entry_type: "adjustment", adjustment_direction: "credit", amount_minutes: 60, occurred_on: "2026-07-13", source_ref: "HRDocument:synthetic" });
  const mismatch = service.validateBalances(scoped, { as_of: "2026-07-13" });
  assert.deepEqual(mismatch.counts, { match: 0, mismatch: 1, missing: 0 });
  assert.equal(mismatch.rows[0].delta_minutes, 60);
});
