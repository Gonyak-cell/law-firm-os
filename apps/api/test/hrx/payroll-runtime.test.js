import assert from "node:assert/strict";
import test from "node:test";
import { createHrxPayrollRuntime, seedSyntheticPayrollRuntimeStore } from "../../src/hrx-payroll-runtime.js";
import { createHrxPayrollRuntimeRoute } from "../../src/routes/hrx/payroll-runtime.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = "tenant-payroll-api";
const NOW = "2026-07-15T01:00:00.000Z";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store, clock: () => NOW });
  for (const [index, displayName] of ["서지원", "김양태"].entries()) {
    const employeeId = `emp-${index + 1}`;
    repository.createEmployee({ tenant_id: TENANT, employee_id: employeeId, display_name: displayName, status: "active" });
    repository.createEmploymentProfile({
      tenant_id: TENANT,
      profile_id: `profile-${employeeId}`,
      employee_id: employeeId,
      employment_type: "full_time",
      status: "active",
      title: index === 0 ? "대표변호사" : "변호사",
      effective_from: "2026-01-01",
    });
    repository.createEmployeeUserLink({ tenant_id: TENANT, link_id: `link-${employeeId}`, employee_id: employeeId, user_id: `user-${index + 1}`, purpose: "login_mapping" });
  }
  seedSyntheticPayrollRuntimeStore(store, [TENANT], { clock: () => NOW });
  const runtime = createHrxPayrollRuntime({ store, clock: () => NOW });
  const route = createHrxPayrollRuntimeRoute({ runtime, store, clock: () => NOW });
  return { store, runtime, route };
}

async function call(route, context, action, params = {}, body = {}, method = "POST") {
  return route.handle({ method, context, params: { action, ...params }, body });
}

test("PY-UI-001/002 runtime API lists, snapshots, previews, approves, and closes the persisted payroll run", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const listed = await call(value.route, preparer, "list", {}, {}, "GET");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.workspace.periods[0].period_code, "2026-07");
  const runId = listed.body.workspace.periods[0].runs[0].run_id;

  const captured = await call(value.route, preparer, "snapshot", { run_id: runId });
  assert.equal(captured.status, 200, JSON.stringify(captured.body));
  assert.equal(captured.body.capture.ready, true);
  assert.equal(captured.body.bundle.employees.length, 2);

  const previewed = await call(value.route, preparer, "preview", { run_id: runId });
  assert.equal(previewed.status, 200);
  assert.equal(previewed.body.bundle.run.status, "previewed");
  assert.equal(previewed.body.bundle.employees.every((row) => row.net_krw > 0), true);
  assert.equal(previewed.body.bundle.totals.gross_krw, 6_250_000);

  const challenged = await call(value.route, { ...approver, step_up_verified: false }, "approve", { run_id: runId });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const approved = await call(value.route, approver, "approve", { run_id: runId });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.bundle.run.status, "approved");
  const closed = await call(value.route, approver, "close", { run_id: runId });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.bundle.run.status, "closed");
  assert.deepEqual(value.runtime.payrollRepository.listOutboxEvents(preparer, { run_id: runId }).map((row) => row.event_type), ["payroll.preview", "payroll.approve", "payroll.close"]);
  value.store.close();
});

test("PY-UI-005 keeps preparer self-approval blocked at the runtime API", async () => {
  const value = setup();
  const systemPreparer = { tenant_id: TENANT, actor_id: "system-payroll-preparer", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const runId = value.runtime.payrollRepository.listRuns(systemPreparer)[0].run_id;
  await call(value.route, systemPreparer, "snapshot", { run_id: runId });
  await call(value.route, systemPreparer, "preview", { run_id: runId });
  const denied = await call(value.route, systemPreparer, "approve", { run_id: runId });
  assert.equal(denied.status, 403, JSON.stringify(denied.body));
  assert.equal(denied.body.safe_error_code, "HRX_PAYROLL_SELF_APPROVAL");
  value.store.close();
});

test("PY-DOC/BANK/TAX runtime API generates, delivers, exports, pays, and files only through receipt-gated synthetic adapters", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const payrollApprover = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const paymentApprover = { tenant_id: TENANT, actor_id: "payment-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: runId });
  await call(value.route, preparer, "preview", { run_id: runId });
  await call(value.route, payrollApprover, "approve", { run_id: runId });
  await call(value.route, payrollApprover, "close", { run_id: runId });

  const generated = await call(value.route, preparer, "statements-generate", { run_id: runId });
  assert.deepEqual([generated.status, generated.body.generated.statement_count], [200, 2]);
  const delivered = await call(value.route, preparer, "statements-deliver", { run_id: runId }, { channel: "self_service" });
  assert.equal(delivered.body.delivery.delivered_count, 2);
  const self = await call(value.route, { tenant_id: TENANT, actor_id: "user-1" }, "statements-self", {}, {}, "GET");
  assert.equal(self.body.statements.length, 1);
  const read = await call(value.route, { tenant_id: TENANT, actor_id: "user-1" }, "statement-read", { statement_id: self.body.statements[0].statement_id }, {}, "GET");
  assert.equal(Buffer.from(read.body.artifact.content_base64, "base64").subarray(0, 8).toString("utf8"), "%PDF-1.4");
  const csv = await value.route.handle({ method: "GET", context: preparer, params: { action: "statement-export", run_id: runId }, query: { format: "csv" }, body: {} });
  const xlsx = await value.route.handle({ method: "GET", context: preparer, params: { action: "statement-export", run_id: runId }, query: { format: "xlsx" }, body: {} });
  assert.deepEqual(csv.body.artifact.totals, xlsx.body.artifact.totals);
  assert.equal(Buffer.from(xlsx.body.artifact.content_base64, "base64").subarray(0, 2).toString("utf8"), "PK");

  const prepared = await call(value.route, preparer, "payment-prepare", { run_id: runId });
  const batchId = prepared.body.payment.batch.payment_batch_id;
  const separated = await call(value.route, payrollApprover, "payment-approve", { payment_batch_id: batchId });
  assert.equal(separated.body.safe_error_code, "HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION");
  assert.equal((await call(value.route, paymentApprover, "payment-approve", { payment_batch_id: batchId })).body.payment.batch.state, "approved");
  assert.equal((await call(value.route, preparer, "payment-export", { payment_batch_id: batchId })).body.artifact.batch.state, "exported");
  assert.equal((await call(value.route, preparer, "payment-reconcile", { payment_batch_id: batchId })).body.payment.batch.state, "reconciled");

  const created = await call(value.route, preparer, "filing-create", { run_id: runId }, { filing_kind: "withholding" });
  const filingId = created.body.filing.filing_job_id;
  assert.equal((await call(value.route, preparer, "filing-validate", { filing_job_id: filingId })).body.filing.state, "validated");
  const submitted = await call(value.route, payrollApprover, "filing-submit", { filing_job_id: filingId });
  assert.equal(submitted.body.submission.job.state, "accepted");
  assert.equal(submitted.body.submission.production_ready_claim, false);

  assert.equal((await call(value.route, preparer, "year-end-collect", { run_id: runId })).body.year_end.state, "draft");
  assert.equal((await call(value.route, preparer, "year-end-calculate", { run_id: runId })).body.year_end.state, "calculated");
  const yearEndChallenge = await call(value.route, { ...payrollApprover, step_up_verified: false }, "year-end-review", { run_id: runId });
  assert.equal(yearEndChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal((await call(value.route, payrollApprover, "year-end-review", { run_id: runId })).body.year_end.state, "reviewed");
  const yearEndFiling = await call(value.route, preparer, "filing-create", { run_id: runId }, { filing_kind: "year_end" });
  assert.equal(yearEndFiling.body.filing.state, "draft");
  assert.equal((await call(value.route, preparer, "filing-validate", { filing_job_id: yearEndFiling.body.filing.filing_job_id })).body.filing.state, "validated");
  assert.equal((await call(value.route, payrollApprover, "filing-submit", { filing_job_id: yearEndFiling.body.filing.filing_job_id })).body.submission.job.state, "accepted");
  assert.equal((await call(value.route, preparer, "bundle", { run_id: runId }, {}, "GET")).body.bundle.year_end.state, "reviewed");
  value.store.close();
});
