import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest, seedHrxDurableRuntimeStore } from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { createSqlLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const EMPLOYEE = "emp_amic_yjlee";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "report-group", code: "REPORT_ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "report-policy-v1", group_id: "report-group", policy_code: "REPORT-ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: JSON.stringify({ termination_unused_payout: true }) } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "report-entitlement", employee_id: EMPLOYEE, group_id: "report-group", policy_version_id: "report-policy-v1", granted_minutes: 480, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:LV05", idempotency_key: "report-entitlement", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "report-earned", employee_id: EMPLOYEE, policy_id: "REPORT-ANNUAL-2026", group_id: "report-group", policy_version_id: "report-policy-v1", entitlement_id: "report-entitlement", idempotency_key: "report-earned", entry_type: "earned", amount_minutes: 480, occurred_on: "2026-07-13", source_ref: "LeaveAccrualRun:LV05", metadata: { reason: "비공개 사유", attachment_id: "private-proof" } });
  return { store, context: createHrxRuntimeContext({ store }) };
}

function staffActor() {
  return { tenant_id: TENANT, actor_id: "user_amic_yjlee", actor_role: "lawos_staff", hrx_scopes: ["hrx.leave.self.read"], session_bound: true };
}

function hrActor(stepUp = false, actorId = "user_amic_tryoon") {
  return { tenant_id: TENANT, actor_id: actorId, actor_role: "lawos_hr", hrx_scopes: ["hrx.leave.self.read", "hrx.leave.team.read", "hrx.leave.report.export", "hrx.leave.termination.settle"], session_bound: true, step_up_verified: stepUp, step_up_purpose: stepUp ? "leave_termination_settlement" : null };
}

function request(context, pathname, method = "GET", body = {}, requestContext = hrActor(), query = {}) {
  return handleHrxApiRequest({ pathname, method, body, query, context, requestContext });
}

test("LV-05 route policies bind read, export, snapshot, and termination to granular scopes", () => {
  const expectations = [
    ["GET", "/api/hrx/leave/occurrences", "hrx.leave.self.read", "hrx.leave.occurrence.read"],
    ["GET", "/api/hrx/leave/occurrences/projections", "hrx.leave.self.read", "hrx.leave.occurrence.project"],
    ["GET", "/api/hrx/leave/occurrences/export", "hrx.leave.report.export", "hrx.leave.occurrence.export"],
    ["GET", "/api/hrx/leave/ledger", "hrx.leave.self.read", "hrx.leave.ledger.read"],
    ["GET", "/api/hrx/leave/ledger/validate", "hrx.leave.self.read", "hrx.leave.ledger.validate"],
    ["POST", "/api/hrx/leave/ledger/snapshots", "hrx.leave.report.export", "hrx.leave.report.snapshot"],
    ["GET", "/api/hrx/leave/reports/export", "hrx.leave.report.export", "hrx.leave.report.export"],
    ["POST", "/api/hrx/leave/termination-reconciliations/preview", "hrx.leave.termination.settle", "hrx.leave.termination.preview"],
    ["POST", "/api/hrx/leave/termination-reconciliations/approve", "hrx.leave.termination.settle", "hrx.leave.termination.settle"],
    ["POST", "/api/hrx/leave/termination-reconciliations/execute", "hrx.leave.termination.settle", "hrx.leave.termination.settle"],
  ];
  for (const [method, pathname, scope, action] of expectations) {
    const policy = resolveHrxRoutePolicy({ method, pathname });
    assert.equal(policy?.required_scope, scope);
    assert.equal(policy?.action, action);
  }
});

test("LV-05 API filters ledger rows before counts and exports the same totals without private fields", () => {
  const { context } = setup();
  const self = request(context, "/api/hrx/leave/ledger", "GET", {}, staffActor());
  assert.equal(self.status, 200, JSON.stringify(self.body));
  assert.equal(self.body.report.totals.row_count, 1);
  assert.equal(self.body.report.totals.earned, 480);

  const unauthorized = request(context, "/api/hrx/leave/ledger", "GET", {}, staffActor(), { employee_id: "emp_amic_ytkim" });
  assert.equal(unauthorized.body.report.totals.row_count, 0);
  assert.equal(JSON.stringify(unauthorized.body).includes("김양태"), false);

  const exported = request(context, "/api/hrx/leave/reports/export", "GET", {}, hrActor(), { format: "csv", employee_id: EMPLOYEE });
  assert.equal(exported.status, 200, JSON.stringify(exported.body));
  assert.equal(exported.body.export.row_count, self.body.report.totals.row_count);
  assert.deepEqual(exported.body.export.totals, self.body.report.totals);
  const csv = Buffer.from(exported.body.export.content_base64, "base64").toString("utf8");
  assert.doesNotMatch(csv, /비공개 사유|private-proof/);

  const xlsx = request(context, "/api/hrx/leave/reports/export", "GET", {}, hrActor(), { format: "xlsx", employee_id: EMPLOYEE });
  assert.equal(Buffer.from(xlsx.body.export.content_base64, "base64").subarray(0, 2).toString("ascii"), "PK");
});

test("LV-OCC-001 and LV-OCC-002 APIs expose scoped occurrence rows and matching projections", () => {
  const { context } = setup();
  const occurrences = request(context, "/api/hrx/leave/occurrences", "GET", {}, staffActor(), { as_of: "2026-07-13" });
  assert.equal(occurrences.status, 200, JSON.stringify(occurrences.body));
  assert.equal(occurrences.body.occurrences.totals.row_count, 1);
  assert.equal(occurrences.body.occurrences.totals.total_minutes, 480);
  assert.equal(occurrences.body.occurrences.totals.remaining_minutes, 480);
  assert.equal(JSON.stringify(occurrences.body).includes("private-proof"), false);

  const projections = request(context, "/api/hrx/leave/occurrences/projections", "GET", {}, staffActor(), { as_of: "2026-07-13" });
  assert.equal(projections.status, 200, JSON.stringify(projections.body));
  assert.deepEqual(projections.body.projections.list.totals, projections.body.projections.totals);
  assert.equal(projections.body.projections.source_version, occurrences.body.occurrences.source_version);
  assert.equal(projections.body.projections.by_month[0].key, "2026-01");
  assert.equal(projections.body.projections.by_type[0].label, "연차");
});

test("LV-OCC-008 API exports the filtered occurrence views and denies self-only access", () => {
  const { context } = setup();
  const filters = { as_of: "2026-07-13", employee_id: EMPLOYEE };
  const queried = request(context, "/api/hrx/leave/occurrences", "GET", {}, hrActor(), filters);
  const csv = request(context, "/api/hrx/leave/occurrences/export", "GET", {}, hrActor(), { ...filters, format: "csv", view: "list" });
  assert.equal(csv.status, 200, JSON.stringify(csv.body));
  assert.deepEqual(csv.body.export.totals, queried.body.occurrences.totals);
  assert.equal(csv.body.export.source_version, queried.body.occurrences.source_version);
  assert.equal(csv.body.export.row_count, queried.body.occurrences.totals.row_count);
  const csvText = Buffer.from(csv.body.export.content_base64, "base64").toString("utf8");
  assert.match(csvText, /연차/);
  assert.doesNotMatch(csvText, /비공개 사유|private-proof|LeaveAccrualRun:LV05/);

  const xlsx = request(context, "/api/hrx/leave/occurrences/export", "GET", {}, hrActor(), { ...filters, format: "xlsx", view: "month" });
  assert.equal(xlsx.status, 200, JSON.stringify(xlsx.body));
  assert.equal(Buffer.from(xlsx.body.export.content_base64, "base64").subarray(0, 2).toString("ascii"), "PK");
  assert.deepEqual(xlsx.body.export.totals, queried.body.occurrences.totals);

  const denied = request(context, "/api/hrx/leave/occurrences/export", "GET", {}, staffActor(), { ...filters, format: "csv" });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.safe_error_code, "HRX_LEAVE_REPORT_EXPORT_SCOPE_DENIED");
  assert.equal(denied.body.count_leak_prevented, true);
});

test("LV-05 termination API scopes candidates, rejects missing step-up, and leaves payroll outbox pending", () => {
  const { store, context } = setup();
  const candidates = request(context, "/api/hrx/leave/termination-reconciliations/candidates", "GET");
  assert.equal(candidates.status, 200, JSON.stringify(candidates.body));
  assert.deepEqual(candidates.body.candidates.map((row) => row.employee_id), [EMPLOYEE]);

  const preview = request(context, "/api/hrx/leave/termination-reconciliations/preview", "POST", { employee_id: EMPLOYEE, termination_date: "2026-12-31" });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.reconciliation.result.totals.unused_minutes, 480);

  const approvalChallenged = request(context, "/api/hrx/leave/termination-reconciliations/approve", "POST", { preview_reconciliation_id: preview.body.reconciliation.reconciliation_id });
  assert.equal(approvalChallenged.status, 403);
  assert.equal(approvalChallenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const approved = request(context, "/api/hrx/leave/termination-reconciliations/approve", "POST", { preview_reconciliation_id: preview.body.reconciliation.reconciliation_id }, hrActor(true, "user_amic_jwsuh"));
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.approval_receipt.approved_by_actor_id, "user_amic_jwsuh");

  const challenged = request(context, "/api/hrx/leave/termination-reconciliations/execute", "POST", { preview_reconciliation_id: preview.body.reconciliation.reconciliation_id, approval_receipt_id: approved.body.approval_receipt.approval_receipt_id, idempotency_key: "termination-api-001" });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const executed = request(context, "/api/hrx/leave/termination-reconciliations/execute", "POST", { preview_reconciliation_id: preview.body.reconciliation.reconciliation_id, approval_receipt_id: approved.body.approval_receipt.approval_receipt_id, idempotency_key: "termination-api-001" }, hrActor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.equal(executed.body.reconciliation.state, "approved_pending_sync");
  assert.equal(store.query("selectOne", { table: "hrx_offboarding_cases", where: { tenant_id: TENANT, offboarding_id: "off-leave-synthetic-001" } }).leave_reconciliation_status, "approved_pending_sync");
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.termination.payroll_reconciliation_requested" } }).length, 1);
});
