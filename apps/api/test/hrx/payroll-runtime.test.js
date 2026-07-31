import assert from "node:assert/strict";
import test from "node:test";
import { createHrxPayrollRuntime, seedSyntheticPayrollRuntimeStore } from "../../src/hrx-payroll-runtime.js";
import { createHrxPayrollRuntimeRoute } from "../../src/routes/hrx/payroll-runtime.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = "tenant-payroll-api";
const NOW = "2026-07-15T01:00:00.000Z";

function setup(runtimeOptions = {}) {
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
  const runtime = createHrxPayrollRuntime({ store, clock: () => NOW, ...runtimeOptions });
  const route = createHrxPayrollRuntimeRoute({ runtime, store, clock: () => NOW });
  return { store, runtime, route };
}

async function call(route, context, action, params = {}, body = {}, method = "POST") {
  return route.handle({ method, context, params: { action, ...params }, body });
}

function createClosedNegativeRun(value, suffix = "recovery") {
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  const period = value.runtime.payrollRepository.createPeriod(preparer, {
    period_id: `period-${suffix}`,
    period_code: "2026-08",
    period_start: "2026-08-01",
    period_end: "2026-08-31",
    cutoff_at: NOW,
    pay_date: "2026-09-05",
  });
  const openPeriod = value.runtime.payrollRepository.transitionPeriod(preparer, {
    period_id: period.period_id,
    status: "open",
    expected_version: period.state_version,
  });
  const run = value.runtime.payrollRepository.createRun(preparer, {
    run_id: `run-${suffix}`,
    period_id: openPeriod.period_id,
    run_type: "regular",
  });
  const snapshot = value.runtime.payrollRepository.createInputSnapshot(preparer, {
    snapshot_id: `snapshot-${suffix}`,
    run_id: run.run_id,
    employee_id: "emp-1",
    source_refs: [{ kind: "attendance", ref: `artifact:attendance/${suffix}`, hash: "a".repeat(64) }],
    source_hash: "a".repeat(64),
  });
  value.runtime.payrollRepository.createEmployeeResult(preparer, {
    result_id: `result-${suffix}`,
    run_id: run.run_id,
    employee_id: "emp-1",
    input_snapshot_id: snapshot.snapshot_id,
    gross_krw: 0,
    deduction_krw: 100,
    net_krw: -100,
  });
  const snapshotReady = value.runtime.payrollRepository.transitionRun(preparer, {
    run_id: run.run_id,
    status: "snapshot_ready",
    snapshot_hash: "b".repeat(64),
    expected_version: run.state_version,
  });
  const previewed = value.runtime.payrollRepository.transitionRun(preparer, {
    run_id: run.run_id,
    status: "previewed",
    result_hash: "c".repeat(64),
    expected_version: snapshotReady.state_version,
  });
  return { period: openPeriod, run: previewed };
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
  assert.equal(challenged.body.required_purpose, "payroll_export_review");

  const approved = await call(value.route, approver, "approve", { run_id: runId });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.bundle.run.status, "approved");
  const closed = await call(value.route, approver, "close", { run_id: runId });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.bundle.run.status, "closed");
  assert.deepEqual(value.runtime.payrollRepository.listOutboxEvents(preparer, { run_id: runId }).map((row) => row.event_type), ["payroll.preview", "payroll.approve", "payroll.close"]);
  value.store.close();
});

test("PY-LABEL-001 keeps employee presentation names human when rows are missing or identifiers leak into display_name", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: runId });

  value.store.query("updateOne", {
    table: "hrx_employees",
    where: { tenant_id: TENANT, employee_id: "emp-1" },
    patch: { display_name: "담당 0123456789abcdef0123456789abcdef" },
  });
  value.store.query("updateOne", {
    table: "hrx_employees",
    where: { tenant_id: TENANT, employee_id: "emp-2" },
    patch: { display_name: "payrollMemberRef20260731A1" },
  });
  const adversarial = await call(value.route, preparer, "bundle", { run_id: runId }, {}, "GET");
  assert.equal(adversarial.status, 200, JSON.stringify(adversarial.body));
  assert.deepEqual(adversarial.body.bundle.employees.map((row) => row.display_name), ["구성원 이름 확인 필요", "구성원 이름 확인 필요"]);
  assert.doesNotMatch(adversarial.body.bundle.employees.map((row) => row.display_name).join("|"), /emp-1|emp-2|550e8400-e29b-41d4-a716-446655440000/);

  value.store.query("deleteOne", { table: "hrx_employees", where: { tenant_id: TENANT, employee_id: "emp-1" } });
  const missing = await call(value.route, preparer, "bundle", { run_id: runId }, {}, "GET");
  assert.equal(missing.body.bundle.employees.find((row) => row.employee_id === "emp-1").display_name, "구성원 이름 확인 필요");
  assert.notEqual(missing.body.bundle.employees.find((row) => row.employee_id === "emp-1").display_name, "emp-1");
  value.store.close();
});

test("PY-LABEL-002 resolves linked actors and fails closed to a human fallback for unlinked actors", async () => {
  const linked = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  const linkedApprover = { tenant_id: TENANT, actor_id: "user-1", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const linkedRunId = linked.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(linked.route, preparer, "snapshot", { run_id: linkedRunId });
  const normalNames = await call(linked.route, preparer, "bundle", { run_id: linkedRunId }, {}, "GET");
  assert.deepEqual(normalNames.body.bundle.employees.map((row) => row.display_name), ["서지원", "김양태"]);
  await call(linked.route, preparer, "preview", { run_id: linkedRunId });
  const linkedApproval = await call(linked.route, linkedApprover, "approve", { run_id: linkedRunId });
  assert.equal(linkedApproval.status, 200, JSON.stringify(linkedApproval.body));
  assert.equal(linkedApproval.body.bundle.run.approved_by_actor_display_name, "서지원");
  assert.equal(linkedApproval.body.bundle.run.approved_by_actor_id, "user-1");
  const linkedEvent = linkedApproval.body.bundle.audit_history.find((event) => event.action === "hrx.payroll.run.approved");
  assert.equal(linkedEvent.actor_display_name, "서지원");
  assert.equal(linkedEvent.actor_id, "user-1");
  linked.store.close();

  const unlinked = setup();
  const unlinkedApprover = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const unlinkedRunId = unlinked.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  const pendingBundle = await call(unlinked.route, preparer, "bundle", { run_id: unlinkedRunId }, {}, "GET");
  assert.equal(pendingBundle.body.bundle.run.approved_by_actor_display_name, null);
  assert.equal(pendingBundle.body.bundle.run.approved_at, null);
  unlinked.store.query("updateOne", {
    table: "hrx_payroll_runs",
    where: { tenant_id: TENANT, run_id: unlinkedRunId },
    expected_version: 1,
    patch: { approved_by_actor_id: "orphan-actor", state_version: 2 },
  });
  const orphanActorBundle = await call(unlinked.route, preparer, "bundle", { run_id: unlinkedRunId }, {}, "GET");
  assert.equal(orphanActorBundle.body.bundle.run.approved_by_actor_display_name, null);
  assert.equal(orphanActorBundle.body.bundle.run.approved_by_actor_id, "orphan-actor");
  assert.equal(orphanActorBundle.body.bundle.run.approved_at, null);
  await call(unlinked.route, preparer, "snapshot", { run_id: unlinkedRunId });
  await call(unlinked.route, preparer, "preview", { run_id: unlinkedRunId });
  const unlinkedApproval = await call(unlinked.route, unlinkedApprover, "approve", { run_id: unlinkedRunId });
  assert.equal(unlinkedApproval.status, 200, JSON.stringify(unlinkedApproval.body));
  assert.equal(unlinkedApproval.body.bundle.run.approved_by_actor_display_name, null);
  const unlinkedEvent = unlinkedApproval.body.bundle.audit_history.find((event) => event.action === "hrx.payroll.run.approved");
  assert.equal(unlinkedEvent.actor_display_name, null);
  unlinked.store.close();
});

test("PY-LABEL-004 fails closed for cross-tenant and ambiguous same-tenant actor links", async () => {
  const crossTenant = setup();
  const otherTenantRepository = createSqlHrxRepository({ store: crossTenant.store, clock: () => NOW });
  otherTenantRepository.createEmployee({
    tenant_id: "tenant-other-label",
    employee_id: "other-employee",
    display_name: "타 테넌트 담당",
    status: "active",
  });
  otherTenantRepository.createEmployeeUserLink({
    tenant_id: "tenant-other-label",
    link_id: "other-link",
    employee_id: "other-employee",
    user_id: "cross-tenant-user",
    purpose: "login_mapping",
  });
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  const crossTenantApprover = {
    tenant_id: TENANT,
    actor_id: "cross-tenant-user",
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
  };
  const crossTenantRunId = crossTenant.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(crossTenant.route, preparer, "snapshot", { run_id: crossTenantRunId });
  await call(crossTenant.route, preparer, "preview", { run_id: crossTenantRunId });
  const crossTenantApproval = await call(crossTenant.route, crossTenantApprover, "approve", { run_id: crossTenantRunId });
  assert.equal(crossTenantApproval.status, 200, JSON.stringify(crossTenantApproval.body));
  assert.equal(crossTenantApproval.body.bundle.run.approved_by_actor_id, "cross-tenant-user");
  assert.equal(crossTenantApproval.body.bundle.run.approved_by_actor_display_name, null);
  const crossTenantEvent = crossTenantApproval.body.bundle.audit_history.find((event) => event.action === "hrx.payroll.run.approved");
  assert.equal(crossTenantEvent.actor_id, "cross-tenant-user");
  assert.equal(crossTenantEvent.actor_display_name, null);
  crossTenant.store.close();

  const ambiguous = setup();
  const originalStore = ambiguous.store;
  const ambiguousStore = Object.create(originalStore);
  ambiguousStore.query = (operation, params) => {
    const result = originalStore.query(operation, params);
    if (operation === "select" && params?.table === "hrx_employee_user_links" && params?.where?.tenant_id === TENANT) {
      return [
        ...result,
        { tenant_id: TENANT, link_id: "ambiguous-link-1", employee_id: "emp-1", user_id: "ambiguous-user", purpose: "login_mapping" },
        { tenant_id: TENANT, link_id: "ambiguous-link-2", employee_id: "emp-2", user_id: "ambiguous-user", purpose: "login_mapping" },
      ];
    }
    return result;
  };
  const ambiguousRoute = createHrxPayrollRuntimeRoute({ runtime: ambiguous.runtime, store: ambiguousStore, clock: () => NOW });
  const ambiguousApprover = {
    tenant_id: TENANT,
    actor_id: "ambiguous-user",
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
  };
  const ambiguousRunId = ambiguous.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(ambiguousRoute, preparer, "snapshot", { run_id: ambiguousRunId });
  await call(ambiguousRoute, preparer, "preview", { run_id: ambiguousRunId });
  const ambiguousApproval = await call(ambiguousRoute, ambiguousApprover, "approve", { run_id: ambiguousRunId });
  assert.equal(ambiguousApproval.status, 200, JSON.stringify(ambiguousApproval.body));
  assert.equal(ambiguousApproval.body.bundle.run.approved_by_actor_id, "ambiguous-user");
  assert.equal(ambiguousApproval.body.bundle.run.approved_by_actor_display_name, null);
  const ambiguousEvent = ambiguousApproval.body.bundle.audit_history.find((event) => event.action === "hrx.payroll.run.approved");
  assert.equal(ambiguousEvent.actor_id, "ambiguous-user");
  assert.equal(ambiguousEvent.actor_display_name, null);
  ambiguous.store.close();
});

test("Home payroll dashboard returns only approved aggregate categories without employee PII", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;

  const beforeApproval = await value.route.handle({
    method: "GET",
    context: preparer,
    params: { action: "dashboard-summary" },
    query: { month: "2026-07" },
    body: {},
  });
  assert.deepEqual([beforeApproval.status, beforeApproval.body.outcome, beforeApproval.body.summary], [200, "empty", null]);

  await call(value.route, preparer, "snapshot", { run_id: runId });
  await call(value.route, preparer, "preview", { run_id: runId });
  await call(value.route, approver, "approve", { run_id: runId });
  const approved = await value.route.handle({
    method: "GET",
    context: preparer,
    params: { action: "dashboard-summary" },
    query: { month: "2026-07" },
    body: {},
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.summary.gross_krw, 6_250_000);
  assert.equal(approved.body.summary.employee_count, 2);
  assert.deepEqual(
    approved.body.summary.categories.map(({ category, gross_krw, employee_count }) => ({ category, gross_krw, employee_count })),
    [
      { category: "partner", gross_krw: 3_000_000, employee_count: 1 },
      { category: "advisor", gross_krw: 0, employee_count: 0 },
      { category: "staff", gross_krw: 3_250_000, employee_count: 1 },
      { category: "unclassified", gross_krw: 0, employee_count: 0 },
    ],
  );
  const serialized = JSON.stringify(approved.body);
  assert.doesNotMatch(serialized, /employee_id|display_name|@|서지원|김양태/);
  assert.equal(approved.body.summary.individual_values_included, false);
  assert.equal(approved.body.summary.individual_identifiers_included, false);

  await call(value.route, approver, "close", { run_id: runId });
  const closed = await value.route.handle({
    method: "GET",
    context: preparer,
    params: { action: "dashboard-summary" },
    query: { month: "2026-07" },
    body: {},
  });
  assert.equal(closed.body.summary.run_status, "closed");

  const otherTenant = await value.route.handle({
    method: "GET",
    context: { tenant_id: "tenant-other", actor_id: "payroll-preparer" },
    params: { action: "dashboard-summary" },
    query: { month: "2026-07" },
    body: {},
  });
  assert.deepEqual([otherTenant.body.outcome, otherTenant.body.summary], ["empty", null]);
  value.store.close();
});

test("Home payroll dashboard rejects malformed month input", async () => {
  const value = setup();
  const result = await value.route.handle({
    method: "GET",
    context: { tenant_id: TENANT, actor_id: "payroll-preparer" },
    params: { action: "dashboard-summary" },
    query: { month: "2026-13" },
    body: {},
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.safe_error_code, "HRX_PAYROLL_DASHBOARD_MONTH_INVALID");
  value.store.close();
});

test("operational payroll providers fail closed without bank, filing, or delivery authority", async () => {
  const value = setup({ allowSyntheticProviders: false });
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: runId });
  await call(value.route, preparer, "preview", { run_id: runId });
  await call(value.route, approver, "approve", { run_id: runId });
  await call(value.route, approver, "close", { run_id: runId });

  assert.equal(value.runtime.provider_mode, "external-required");
  await call(value.route, preparer, "statements-generate", { run_id: runId });
  const delivery = await call(value.route, preparer, "statements-deliver", { run_id: runId }, { channel: "email" });
  assert.equal(delivery.status, 409);
  assert.equal(delivery.body.safe_error_code, "HRX_PAYROLL_STATEMENT_DELIVERY_DISABLED");

  const payment = await call(value.route, preparer, "payment-prepare", { run_id: runId });
  assert.equal(payment.status, 409);
  assert.equal(payment.body.safe_error_code, "HRX_PAYROLL_PAYMENT_ACCOUNT_MISSING");

  const filing = await call(value.route, preparer, "filing-create", { run_id: runId }, { filing_kind: "withholding" });
  assert.equal(filing.status, 409);
  assert.equal(filing.body.safe_error_code, "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED");
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

test("PEO-TUW-061 exposes a redacted close precheck and blocks approval while evidence is unresolved", async () => {
  const value = setup({ payrollClosePrecheckEnabled: true });
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: runId });
  await call(value.route, preparer, "preview", { run_id: runId });

  const checked = await value.route.handle({
    method: "GET",
    context: preparer,
    params: { action: "precheck", run_id: runId },
    query: { as_of: NOW },
    body: {},
  });
  assert.equal(checked.status, 200);
  assert.equal(checked.body.outcome, "review_required");
  assert.equal(checked.body.precheck.ready, false);
  assert.equal(checked.body.precheck.blockers.every((row) => row.employee_id === null), true);
  assert.doesNotMatch(JSON.stringify(checked.body), /서지원|김양태|emp-1|emp-2/);

  const blocked = await call(value.route, approver, "approve", { run_id: runId }, { as_of: NOW });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.safe_error_code, "HRX_PAYROLL_CLOSE_PRECHECK_BLOCKED");
  assert.equal(value.runtime.payrollRepository.getRun(preparer, { run_id: runId }).status, "previewed");
  value.store.close();
});

test("PEO-TUW-063 creates and replays one atomic adjustment run through the existing payroll route", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: runId });
  await call(value.route, preparer, "preview", { run_id: runId });
  await call(value.route, approver, "approve", { run_id: runId });
  await call(value.route, approver, "close", { run_id: runId });
  const input = {
    period_id: value.runtime.payrollRepository.getRun(preparer, { run_id: runId }).period_id,
    run_type: "adjustment",
    previous_run_id: runId,
    correction_key: "CORR-API-2026-07-001",
    adjustments: [{ employee_id: "emp-1", reason_code: "CORRECTION", amount_krw: 100_000, taxable: true }],
  };
  const created = await call(value.route, preparer, "run-create", {}, input);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.run.run_type, "adjustment");
  assert.equal(created.body.adjustments.length, 1);
  const replayed = await call(value.route, preparer, "run-create", {}, input);
  assert.equal(replayed.status, 200);
  assert.equal(replayed.body.outcome, "replayed");
  assert.equal(replayed.body.run.run_id, created.body.run.run_id);
  const bundle = await call(value.route, preparer, "bundle", { run_id: created.body.run.run_id }, {}, "GET");
  assert.equal(bundle.body.bundle.adjustments[0].amount_krw, 100_000);
  assert.equal(value.runtime.payrollRepository.getRun(preparer, { run_id: runId }).status, "closed");
  value.store.close();
});

test("PEO-FIX adjustment route rejects missing or empty corrections without creating a fallback run", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const regularRunId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  const periodId = value.runtime.payrollRepository.getRun(preparer, { run_id: regularRunId }).period_id;
  const before = value.runtime.payrollRepository.listRuns(preparer, { period_id: periodId });

  for (const adjustments of [undefined, []]) {
    const body = {
      period_id: periodId,
      run_type: "adjustment",
      previous_run_id: regularRunId,
      correction_key: `CORR-API-EMPTY-${adjustments ? "ARRAY" : "MISSING"}`,
      ...(adjustments === undefined ? {} : { adjustments }),
    };
    const blocked = await call(value.route, preparer, "run-create", {}, body);
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.equal(blocked.body.safe_error_code, "HRX_PAYROLL_ADJUSTMENT_EMPTY");
  }

  const after = value.runtime.payrollRepository.listRuns(preparer, { period_id: periodId });
  assert.deepEqual(after.map(({ run_id, run_type }) => ({ run_id, run_type })), before.map(({ run_id, run_type }) => ({ run_id, run_type })));
  value.store.close();
});

test("PEO-FIX-063-C rejects non-positive corrections and negative payment preparation without persistence", async () => {
  const value = setup();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const sourceRunId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: sourceRunId });
  await call(value.route, preparer, "preview", { run_id: sourceRunId });
  await call(value.route, approver, "approve", { run_id: sourceRunId });
  await call(value.route, approver, "close", { run_id: sourceRunId });
  const periodId = value.runtime.payrollRepository.getRun(preparer, { run_id: sourceRunId }).period_id;
  const beforeRuns = value.runtime.payrollRepository.listRuns(preparer, { period_id: periodId });

  for (const [amountKrw, expectedCode] of [[-100, "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED"], [0, "HRX_PAYROLL_ADJUSTMENT_AMOUNT_INVALID"]]) {
    const blocked = await call(value.route, preparer, "run-create", {}, {
      period_id: periodId,
      run_type: "adjustment",
      previous_run_id: sourceRunId,
      correction_key: `CORR-API-RECOVERY-${amountKrw}`,
      adjustments: [{ employee_id: "emp-1", reason_code: "CORRECTION", amount_krw: amountKrw, taxable: true }],
    });
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.equal(blocked.body.safe_error_code, expectedCode);
  }
  const unsupportedReason = await call(value.route, preparer, "run-create", {}, {
    period_id: periodId,
    run_type: "adjustment",
    previous_run_id: sourceRunId,
    correction_key: "CORR-API-RECOVERY-EXCESS",
    adjustments: [{ employee_id: "emp-1", reason_code: "EXCESS_PAYMENT", amount_krw: 100, taxable: true }],
  });
  assert.equal(unsupportedReason.status, 409);
  assert.equal(unsupportedReason.body.safe_error_code, "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED");
  assert.deepEqual(value.runtime.payrollRepository.listRuns(preparer, { period_id: periodId }), beforeRuns);

  const negative = createClosedNegativeRun(value);
  await call(value.route, approver, "approve", { run_id: negative.run.run_id });
  await call(value.route, approver, "close", { run_id: negative.run.run_id });
  const payment = await call(value.route, preparer, "payment-prepare", { run_id: negative.run.run_id });
  assert.equal(payment.status, 409, JSON.stringify(payment.body));
  assert.equal(payment.body.safe_error_code, "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED");
  assert.deepEqual(value.runtime.payrollRepository.listPaymentBatches(preparer, { run_id: negative.run.run_id }), []);
  value.store.close();
});

test("PEO-TUW-065 exposes bounded rule lifecycle and keeps publication behind step-up and a kill switch", async () => {
  const value = setup({ payrollRulePublishEnabled: true });
  const author = { tenant_id: TENANT, actor_id: "rule-author", step_up_verified: false };
  const reviewer = { tenant_id: TENANT, actor_id: "rule-reviewer", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const body = {
    rule_version_id: "payroll-earnings-2027",
    version_code: "RULE-2027",
    effective_from: "2027-01-01",
    effective_to: "2027-12-31",
    source_document_hash: "e".repeat(64),
    rules: {
      schema_version: "law-firm-os.hrx.payroll-earning-rules.v0.1",
      fixture_only: true,
      currency: "KRW",
      rounding_mode: "nearest",
      monthly: { proration_basis: "calendar_days", rate_divisor_minutes: 9_600, unpaid_leave: null },
      segment_rates: {
        overtime: { rate_bps: 15_000, taxable: true },
        night: { rate_bps: 5_000, taxable: true },
        holiday: { rate_bps: 20_000, taxable: true },
        weekly_holiday: { rate_bps: 10_000, taxable: true },
      },
      allowances: [],
      unused_leave: null,
    },
  };
  const created = await call(value.route, author, "rules-create", {}, body);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.rule.approval_state, "draft");
  const reviewed = await call(value.route, reviewer, "rules-review", { rule_version_id: created.body.rule.rule_version_id }, { expected_version: 1 });
  assert.equal(reviewed.body.rule.approval_state, "reviewed");
  const challenged = await call(value.route, { ...reviewer, step_up_verified: false }, "rules-publish", { rule_version_id: created.body.rule.rule_version_id }, { expected_version: 2 });
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.required_purpose, "payroll_export_review");
  const published = await call(value.route, reviewer, "rules-publish", { rule_version_id: created.body.rule.rule_version_id }, { expected_version: 2 });
  assert.equal(published.body.rule.approval_state, "published");
  const listed = await call(value.route, reviewer, "rules-list", {}, {}, "GET");
  assert.equal(listed.body.rules.some((row) => row.rule_version_id === created.body.rule.rule_version_id), true);
  assert.doesNotMatch(JSON.stringify(listed.body), /javascript|process\\.env/);
  value.store.close();

  const disabled = setup({ payrollRulePublishEnabled: false });
  const disabledCreated = await call(disabled.route, author, "rules-create", {}, { ...body, rule_version_id: "payroll-earnings-disabled", version_code: "RULE-2027-DISABLED" });
  const disabledReviewed = await call(disabled.route, reviewer, "rules-review", { rule_version_id: disabledCreated.body.rule.rule_version_id }, { expected_version: 1 });
  const denied = await call(disabled.route, reviewer, "rules-publish", { rule_version_id: disabledReviewed.body.rule.rule_version_id }, { expected_version: 2 });
  assert.equal(denied.body.safe_error_code, "HRX_PAYROLL_RULE_PUBLISH_DISABLED");
  disabled.store.close();
});

test("PEO-TUW-066/067 exposes legal-gated minimum-wage versions and redacted impact preview", async () => {
  const value = setup({ payrollRulePublishEnabled: true });
  const author = { tenant_id: TENANT, actor_id: "minimum-wage-author", hrx_scopes: [] };
  const legalReviewer = {
    tenant_id: TENANT,
    actor_id: "minimum-wage-legal-reviewer",
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
    hrx_scopes: ["hrx.payroll.minimum_wage.legal_review"],
  };
  const payrollReviewer = {
    tenant_id: TENANT,
    actor_id: "minimum-wage-payroll-reviewer",
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
    hrx_scopes: ["hrx.payroll.amount.read"],
  };
  const standard = {
    schema_version: "law-firm-os.hrx.minimum-wage.v1",
    standard_id: "kr-minimum-wage-2027",
    version_code: "KR-2027",
    jurisdiction: "KR",
    effective_from: "2027-01-01",
    effective_to: "2027-12-31",
    hourly_minimum_krw: 10_500,
    monthly_conversion_minutes: 12_540,
    monthly_minimum_krw: 2_194_500,
    rounding_mode: "nearest",
    included_item_codes: ["BASE"],
    excluded_item_codes: ["HOLIDAY", "NIGHT", "OVERTIME"],
    source_document_ref: "document:sandbox/minimum-wage-2027",
    source_document_hash: "f".repeat(64),
    legal_review_state: "pending",
    legal_review_ref: null,
    fixture_only: true,
  };
  const preapproved = await call(value.route, author, "minimum-wage-create", {}, {
    rule_version_id: "minimum-wage-preapproved",
    standard: {
      ...standard,
      legal_review_state: "approved",
      legal_review_ref: "provider:sandbox/legal/minimum-wage-preapproved",
    },
  });
  assert.equal(preapproved.body.safe_error_code, "HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID");

  const created = await call(value.route, author, "minimum-wage-create", {}, {
    rule_version_id: "minimum-wage-2027",
    standard,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.standard.workflow_state, "pending");

  const wrongActor = await call(value.route, author, "minimum-wage-legal-approve", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 1, legal_review_ref: "provider:sandbox/legal/minimum-wage-2027" });
  assert.equal(wrongActor.body.safe_error_code, "HRX_MINIMUM_WAGE_LEGAL_REVIEW_SCOPE_REQUIRED");
  const selfApproval = await call(value.route, { ...legalReviewer, actor_id: author.actor_id }, "minimum-wage-legal-approve", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 1, legal_review_ref: "provider:sandbox/legal/minimum-wage-2027" });
  assert.equal(selfApproval.body.safe_error_code, "HRX_PAYROLL_SELF_APPROVAL");
  const legalStepUpRequired = await call(value.route, { ...legalReviewer, step_up_verified: false }, "minimum-wage-legal-approve", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 1, legal_review_ref: "provider:sandbox/legal/minimum-wage-2027" });
  assert.equal(legalStepUpRequired.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(legalStepUpRequired.body.required_purpose, "payroll_export_review");
  const legalPurposeRequired = await call(value.route, { ...legalReviewer, step_up_purpose: "security_audit" }, "minimum-wage-legal-approve", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 1, legal_review_ref: "provider:sandbox/legal/minimum-wage-2027" });
  assert.equal(legalPurposeRequired.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(legalPurposeRequired.body.required_purpose, "payroll_export_review");
  const legallyApproved = await call(value.route, legalReviewer, "minimum-wage-legal-approve", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 1, legal_review_ref: "provider:sandbox/legal/minimum-wage-2027" });
  assert.equal(legallyApproved.status, 200);
  assert.equal(legallyApproved.body.outcome, "legal_approved");
  assert.equal(legallyApproved.body.standard.workflow_state, "legal_approved");
  assert.equal(legallyApproved.body.standard.standard.legal_review_state, "approved");

  const reviewed = await call(value.route, payrollReviewer, "minimum-wage-review", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 2 });
  assert.equal(reviewed.body.standard.approval_state, "reviewed");
  const challenged = await call(value.route, { ...payrollReviewer, step_up_verified: false }, "minimum-wage-publish", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 3 });
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.required_purpose, "payroll_export_review");
  const published = await call(value.route, payrollReviewer, "minimum-wage-publish", {
    rule_version_id: created.body.standard.rule_version_id,
  }, { expected_version: 3 });
  assert.equal(published.body.standard.approval_state, "published");
  assert.equal(
    value.runtime.payrollRepository.listAuditEvents(legalReviewer, { object_id: created.body.standard.rule_version_id })
      .some((event) => event.action === "hrx.payroll.minimum_wage.legal_approve" && event.actor_id === legalReviewer.actor_id),
    true,
  );

  const input = {
    as_of: "2027-01-31",
    employees: [{
      employee_id: "emp-1",
      contractual_minutes: 12_540,
      base_pay_krw: 2_100_000,
      allowances: [],
    }],
  };
  const visible = await call(value.route, payrollReviewer, "minimum-wage-preview", {}, input);
  assert.equal(visible.body.impact.impacts[0].display_name, "서지원");
  assert.equal(Object.hasOwn(visible.body.impact.impacts[0], "employee_id"), false);
  assert.equal(visible.body.impact.impacts[0].result_state, "below_candidate");
  assert.equal(visible.body.impact.impacts[0].required_wage_krw, 2_194_500);

  const authoritativeLabels = [
    ["lawyer@example.com", "구성원 이름 확인 필요"],
    ["550e8400-e29b-41d4-a716-446655440000", "구성원 이름 확인 필요"],
    ["0123456789abcdef0123456789abcdef", "구성원 이름 확인 필요"],
    ["opaque-9f2a4c7b8d1e", "구성원 이름 확인 필요"],
    ["EMP-CASE-42", "구성원 이름 확인 필요"],
    ["EMP-1", "구성원 이름 확인 필요"],
    ["USER-1", "구성원 이름 확인 필요"],
    ["Kim Min", "Kim Min"],
    ["Park Jiyoon", "Park Jiyoon"],
    ["Leena Kim", "Leena Kim"],
  ];
  for (const [displayName, expected] of authoritativeLabels) {
    value.store.query("updateOne", {
      table: "hrx_employees",
      where: { tenant_id: TENANT, employee_id: "emp-1" },
      patch: { display_name: displayName },
    });
    const adversarial = await call(value.route, payrollReviewer, "minimum-wage-preview", {}, input);
    assert.equal(adversarial.status, 200, JSON.stringify(adversarial.body));
    assert.equal(adversarial.body.impact.impacts[0].display_name, expected, displayName);
  }

  const hidden = await call(value.route, { ...payrollReviewer, hrx_scopes: [] }, "minimum-wage-preview", {}, input);
  assert.equal(hidden.body.impact.impacts[0].display_name, "구성원 1");
  assert.equal(Object.hasOwn(hidden.body.impact.impacts[0], "employee_id"), false);
  assert.doesNotMatch(JSON.stringify(hidden.body.impact), /2100000|2194500|effective_hourly|gap_krw/);
  const listed = await call(value.route, legalReviewer, "minimum-wage-list", {}, {}, "GET");
  assert.equal(listed.body.standards[0].standard.source_document_ref, "document:sandbox/minimum-wage-2027");
  assert.equal(listed.body.permissions.can_legal_approve, true);
  value.store.close();

  const disabled = setup({ payrollRulePublishEnabled: false });
  const disabledCreated = await call(disabled.route, author, "minimum-wage-create", {}, {
    rule_version_id: "minimum-wage-disabled",
    standard: { ...standard, version_code: "KR-2028", standard_id: "kr-minimum-wage-2028", effective_from: "2028-01-01", effective_to: "2028-12-31" },
  });
  const disabledApproval = await call(disabled.route, legalReviewer, "minimum-wage-legal-approve", {
    rule_version_id: disabledCreated.body.standard.rule_version_id,
  }, { expected_version: 1, legal_review_ref: "provider:sandbox/legal/minimum-wage-2028" });
  assert.equal(disabledApproval.body.safe_error_code, "HRX_PAYROLL_RULE_PUBLISH_DISABLED");
  disabled.store.close();
});

test("PY-DOC/BANK/TAX runtime API generates, delivers, exports, pays, and files only through receipt-gated synthetic adapters", async () => {
  const value = setup({
    accountResolver: {
      resolve({ employee_id }) {
        const index = employee_id === "emp-1" ? "1" : "2";
        return {
          tokenized_account_ref: `token:bank/${employee_id}`,
          bank_code: `00${index}`,
          account_number: `11000000000${index}`,
          account_holder: index === "1" ? "서지원" : "김양태",
        };
      },
    },
  });
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer", step_up_verified: false };
  const payrollApprover = { tenant_id: TENANT, actor_id: "payroll-approver", step_up_verified: true, step_up_purpose: "payroll_export_review" };
  const paymentApprover = { tenant_id: TENANT, actor_id: "payment-approver", step_up_verified: true, step_up_purpose: "payroll_payment_processing" };
  const yearEndReviewer = { tenant_id: TENANT, actor_id: "year-end-reviewer", step_up_verified: true, step_up_purpose: "payroll_year_end_review" };
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
  const wrongPaymentPurpose = await call(value.route, payrollApprover, "payment-approve", { payment_batch_id: batchId });
  assert.equal(wrongPaymentPurpose.status, 403);
  assert.equal(wrongPaymentPurpose.body.required_purpose, "payroll_payment_processing");
  const separated = await call(value.route, { ...payrollApprover, step_up_purpose: "payroll_payment_processing" }, "payment-approve", { payment_batch_id: batchId });
  assert.equal(separated.body.safe_error_code, "HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION");
  assert.equal((await call(value.route, paymentApprover, "payment-approve", { payment_batch_id: batchId })).body.payment.batch.state, "approved");
  const paymentExport = await call(value.route, preparer, "payment-export", { payment_batch_id: batchId });
  assert.equal(paymentExport.body.artifact.batch.state, "exported");
  assert.deepEqual(
    [
      typeof paymentExport.body.artifact.artifact_ref,
      /^[a-f0-9]{64}$/.test(paymentExport.body.artifact.artifact_hash),
      paymentExport.body.artifact.byte_size > 0,
      paymentExport.body.artifact.mime_type,
    ],
    ["string", true, true, "text/csv;charset=utf-8"],
  );
  const paymentExportJson = JSON.stringify(paymentExport.body);
  assert.doesNotMatch(paymentExportJson, /content_base64|account_number|bank_code|account_holder|110000000001|110000000002|서지원|김양태/);
  assert.equal((await call(value.route, preparer, "payment-reconcile", { payment_batch_id: batchId })).body.payment.batch.state, "reconciled");

  const created = await call(value.route, preparer, "filing-create", { run_id: runId }, { filing_kind: "withholding" });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const filingId = created.body.filing.filing_job_id;
  assert.equal((await call(value.route, preparer, "filing-validate", { filing_job_id: filingId })).body.filing.state, "validated");
  const submitted = await call(value.route, payrollApprover, "filing-submit", { filing_job_id: filingId });
  assert.equal(submitted.body.submission.job.state, "accepted");
  assert.equal(submitted.body.submission.production_ready_claim, false);

  assert.equal((await call(value.route, preparer, "year-end-collect", { run_id: runId })).body.year_end.state, "draft");
  assert.equal((await call(value.route, preparer, "year-end-calculate", { run_id: runId })).body.year_end.state, "calculated");
  const wrongYearEndPurpose = await call(value.route, payrollApprover, "year-end-review", { run_id: runId });
  assert.equal(wrongYearEndPurpose.status, 403);
  assert.equal(wrongYearEndPurpose.body.required_purpose, "payroll_year_end_review");
  const yearEndChallenge = await call(value.route, { ...yearEndReviewer, step_up_verified: false }, "year-end-review", { run_id: runId });
  assert.equal(yearEndChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(yearEndChallenge.body.required_purpose, "payroll_year_end_review");
  assert.equal((await call(value.route, yearEndReviewer, "year-end-review", { run_id: runId })).body.year_end.state, "reviewed");
  const yearEndFiling = await call(value.route, preparer, "filing-create", { run_id: runId }, { filing_kind: "year_end" });
  assert.equal(yearEndFiling.body.filing.state, "draft");
  assert.equal((await call(value.route, preparer, "filing-validate", { filing_job_id: yearEndFiling.body.filing.filing_job_id })).body.filing.state, "validated");
  assert.equal((await call(value.route, payrollApprover, "filing-submit", { filing_job_id: yearEndFiling.body.filing.filing_job_id })).body.submission.job.state, "accepted");
  assert.equal((await call(value.route, preparer, "bundle", { run_id: runId }, {}, "GET")).body.bundle.year_end.state, "reviewed");
  value.store.close();
});

test("PEO-FIX-068-C pending PostgreSQL checkpoint returns 202 without a process-local HRX claim", async () => {
  let bankCallCount = 0;
  let checkpointClaimCount = 0;
  let checkpointExpireCount = 0;
  let durableOperation = null;
  const checkpoint = {
    async claim(_context, prepared) {
      checkpointClaimCount += 1;
      durableOperation = Object.freeze({
        provider_operation_id: "payroll-provider-operation-durable-winner",
        request_hash: prepared.provider_request.request_hash,
        state: "in_progress",
        state_version: 1,
      });
      return Object.freeze({
        operation: durableOperation,
        should_execute: false,
        idempotent_replay: true,
      });
    },
    async expire() {
      checkpointExpireCount += 1;
      return Object.freeze({
        operation: durableOperation,
        expired: false,
        idempotent_replay: true,
      });
    },
  };
  const value = setup({
    bankReconciliationCheckpoint: checkpoint,
    bankReconciliationPort: {
      async reconcile() {
        bankCallCount += 1;
        throw new Error("pending checkpoint must not recall the bank");
      },
    },
  });
  const preparer = {
    tenant_id: TENANT,
    actor_id: "payroll-preparer",
    step_up_verified: false,
  };
  const payrollApprover = {
    tenant_id: TENANT,
    actor_id: "payroll-approver",
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
  };
  const paymentApprover = {
    tenant_id: TENANT,
    actor_id: "payment-approver",
    step_up_verified: true,
    step_up_purpose: "payroll_payment_processing",
  };
  const runId = value.runtime.payrollRepository.listRuns(preparer)[0].run_id;
  await call(value.route, preparer, "snapshot", { run_id: runId });
  await call(value.route, preparer, "preview", { run_id: runId });
  await call(value.route, payrollApprover, "approve", { run_id: runId });
  await call(value.route, payrollApprover, "close", { run_id: runId });
  const prepared = await call(value.route, preparer, "payment-prepare", { run_id: runId });
  const batchId = prepared.body.payment.batch.payment_batch_id;
  await call(value.route, paymentApprover, "payment-approve", { payment_batch_id: batchId });
  await call(value.route, preparer, "payment-export", { payment_batch_id: batchId });

  const before = value.store.snapshot();
  const pending = await call(
    value.route,
    paymentApprover,
    "payment-reconcile",
    { payment_batch_id: batchId },
  );
  const after = value.store.snapshot();

  assert.deepEqual(
    [pending.status, pending.body.outcome, pending.body.provider_operation_state],
    [202, "pending", "in_progress"],
  );
  assert.deepEqual(
    [checkpointClaimCount, checkpointExpireCount, bankCallCount],
    [1, 1, 0],
  );
  assert.deepEqual(after, before);
  value.store.close();
});
