import assert from "node:assert/strict";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollClosePrecheck, serializePayrollClosePrecheck } from "../src/payroll/close-precheck.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createPayrollRunService, createPayrollStepUpReceipt } from "../src/payroll/run-service.js";
import { createSqlPayrollTimeInputService } from "../src/payroll-time-input-snapshot.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-02T01:00:00.000Z";
const TENANT = "tenant-close-precheck";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-approver" });

function setup({
  withRules = false,
  periodStart = "2026-07-01",
  periodEnd = periodStart,
  periodId = "period-one-day",
  periodCode = "2026-07",
} = {}) {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let sequence = 0;
  const repository = createPayrollRepository({
    store,
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
  });
  let period = repository.createPeriod(PREPARER, {
    period_id: periodId,
    period_code: periodCode,
    period_start: periodStart,
    period_end: periodEnd,
    cutoff_at: `${periodEnd}T23:59:59+09:00`,
    pay_date: "2026-07-05",
  });
  period = repository.transitionPeriod(PREPARER, {
    period_id: period.period_id,
    status: "open",
    expected_version: period.state_version,
  });
  const run = repository.createRun(PREPARER, { run_id: "run-one-day", period_id: period.period_id });
  if (withRules) {
    for (const kind of ["payroll_earnings", "payroll_statutory"]) {
      let rule = repository.createRuleVersion(PREPARER, {
        rule_version_id: `rule-${kind}`,
        rule_kind: kind,
        version_code: `${kind}-2026`,
        effective_from: "2026-01-01",
        effective_to: "2026-12-31",
        source_document_hash: kind === "payroll_earnings" ? "a".repeat(64) : "b".repeat(64),
        rules: { fixture_only: true },
      });
      rule = repository.reviewRuleVersion(APPROVER, {
        rule_version_id: rule.rule_version_id,
        expected_version: rule.state_version,
      });
      repository.publishRuleVersion(APPROVER, {
        rule_version_id: rule.rule_version_id,
        expected_version: rule.state_version,
      });
    }
  }
  return {
    store,
    repository,
    period,
    run,
    precheck: createPayrollClosePrecheck({ store, payrollRepository: repository, clock: () => NOW }),
  };
}

function repositoryWithRules(value, rows) {
  const repository = Object.create(value.repository);
  Object.defineProperty(repository, "listRuleVersions", {
    value: (_context, input = {}) => rows.filter((row) => !input.rule_kind || row.rule_kind === input.rule_kind),
  });
  return repository;
}

function publishedRuleRows({ periodStart, periodEnd, start = periodStart, end = periodEnd, duplicate = false }) {
  return ["payroll_earnings", "payroll_statutory"].flatMap((ruleKind) => [
    {
      rule_version_id: `${ruleKind}-coverage-a`,
      rule_kind: ruleKind,
      approval_state: "published",
      effective_from: start,
      effective_to: end,
    },
    ...(duplicate ? [{
      rule_version_id: `${ruleKind}-coverage-b`,
      rule_kind: ruleKind,
      approval_state: "published",
      effective_from: periodStart,
      effective_to: periodEnd,
    }] : []),
  ]);
}

function seedEmployee(value, employeeId, { profiles = 1, status = "active", effectiveTo = null, schedule = true } = {}) {
  const sql = createSqlHrxRepository({ store: value.store, clock: () => NOW });
  sql.createEmployee({ tenant_id: TENANT, employee_id: employeeId, display_name: employeeId, status: status === "terminated" ? "terminated" : "active" });
  for (let index = 0; index < profiles; index += 1) {
    sql.createEmploymentProfile({
      tenant_id: TENANT,
      profile_id: `profile-${employeeId}-${index}`,
      employee_id: employeeId,
      employment_type: "full_time",
      status,
      effective_from: "2026-01-01",
      effective_to: effectiveTo,
    });
  }
  if (schedule) {
    const profileId = `schedule-${employeeId}`;
    value.store.query("insert", {
      table: "hrx_work_schedule_profiles",
      row: {
        tenant_id: TENANT,
        schedule_profile_id: profileId,
        display_name: "주 40시간",
        timezone: "Asia/Seoul",
        weekly_schedule_json: JSON.stringify({ 3: [{ start: "09:00", end: "18:00" }] }),
        holiday_calendar_ref: null,
        effective_from: "2026-01-01",
        effective_to: null,
        state_version: 1,
        created_at: NOW,
        updated_at: NOW,
      },
    });
    value.store.query("insert", {
      table: "hrx_work_schedule_assignments",
      row: {
        tenant_id: TENANT,
        schedule_assignment_id: `assignment-${employeeId}`,
        schedule_profile_id: profileId,
        employee_id: employeeId,
        organization_id: null,
        priority: 10,
        effective_from: "2026-01-01",
        effective_to: null,
        created_at: NOW,
      },
    });
  }
}

function insertAttendance(value, employeeId, {
  approved = false,
  attendanceId = `attendance-${employeeId}`,
  workDate = "2026-07-01",
} = {}) {
  value.store.query("insert", {
    table: "hrx_attendance_records",
    row: {
      tenant_id: TENANT,
      attendance_id: attendanceId,
      employee_id: employeeId,
      work_date: workDate,
      status: "present",
      source_ref: `Attendance:${attendanceId}`,
      source_kind: "manual",
      import_batch_id: null,
      recorded_hours: null,
      clock_in_at: `${workDate}T00:00:00.000Z`,
      clock_out_at: `${workDate}T09:00:00.000Z`,
      correction_of_attendance_id: null,
      correction_reason: null,
      created_at: "2026-07-01T09:00:00.000Z",
      updated_at: "2026-07-01T09:00:00.000Z",
    },
  });
  if (approved) {
    createSqlPayrollTimeInputService({ store: value.store, clock: () => NOW }).recordAttendanceApproval(
      PREPARER,
      {
        attendance_id: attendanceId,
        approval_receipt_id: `approval-${attendanceId}`,
        approved_at: "2026-07-01T10:00:00.000Z",
        idempotency_key: `approval:${attendanceId}`,
      },
    );
  }
}

function insertPendingCorrection(value, employeeId, attendanceId, correctionId, extra = {}) {
  value.store.query("insert", {
    table: "hrx_attendance_correction_requests",
    row: {
      tenant_id: TENANT,
      correction_request_id: correctionId,
      attendance_id: attendanceId,
      employee_id: employeeId,
      source_version: `sha256:${"f".repeat(64)}`,
      proposed_attendance_id: `attendance-proposed-${correctionId}`,
      requested_changes_json: JSON.stringify({ clock_out_at: "2026-07-01T08:00:00.000Z" }),
      reason: "fixture",
      evidence_ref: `artifact:attendance/${correctionId}`,
      state: "pending",
      state_version: 1,
      requested_by_actor_id: "employee-user",
      requested_at: "2026-07-01T10:30:00.000Z",
      reviewed_by_actor_id: null,
      reviewed_at: null,
      review_reason: null,
      approved_attendance_id: null,
      created_at: "2026-07-01T10:30:00.000Z",
      updated_at: "2026-07-01T10:30:00.000Z",
      ...extra,
    },
  });
}

test("PEO-TUW-061 projects cross-domain blockers with deterministic evidence and redacted handling routes", () => {
  const value = setup();
  seedEmployee(value, "emp-review");
  insertAttendance(value, "emp-review");
  value.store.query("insert", {
    table: "hrx_attendance_correction_requests",
    row: {
      tenant_id: TENANT,
      correction_request_id: "correction-pending",
      attendance_id: "attendance-emp-review",
      employee_id: "emp-review",
      source_version: `sha256:${"f".repeat(64)}`,
      proposed_attendance_id: "attendance-proposed",
      requested_changes_json: JSON.stringify({ clock_out_at: "2026-07-01T08:00:00.000Z" }),
      reason: "fixture",
      evidence_ref: "artifact:attendance/correction",
      state: "pending",
      state_version: 1,
      requested_by_actor_id: "employee-user",
      requested_at: "2026-07-01T10:30:00.000Z",
      reviewed_by_actor_id: null,
      reviewed_at: null,
      review_reason: null,
      approved_attendance_id: null,
      created_at: "2026-07-01T10:30:00.000Z",
      updated_at: "2026-07-01T10:30:00.000Z",
    },
  });
  value.store.query("insert", {
    table: "hrx_overtime_requests",
    row: {
      tenant_id: TENANT,
      overtime_id: "overtime-pending",
      employee_id: "emp-review",
      work_date: "2026-07-01",
      hours: 1,
      calculated_minutes: 60,
      requested_minutes: 60,
      approved_minutes: 0,
      reason: "fixture",
      state: "submitted",
      submitted_at: "2026-07-01T11:00:00.000Z",
      approver_id: null,
      decided_at: null,
      decision_reason: null,
      export_ref: null,
      source_ref: "Overtime:overtime-pending",
      calculation_basis_ref: "artifact:attendance/overtime-pending",
      warning_codes_json: "[]",
      payroll_segment_kind: "overtime",
      created_at: "2026-07-01T11:00:00.000Z",
      updated_at: "2026-07-01T11:00:00.000Z",
    },
  });
  for (const request of [
    { request_id: "leave-pending", state: "submitted", source_ref: "LeaveRequest:leave-pending" },
    { request_id: "leave-approved", state: "approved", source_ref: "LeaveRequest:leave-approved" },
  ]) {
    value.store.query("insert", {
      table: "hrx_leave_requests",
      row: {
        tenant_id: TENANT,
        employee_id: "emp-review",
        policy_id: "annual-2026",
        leave_type: "annual",
        amount: 1,
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        submitted_at: "2026-07-01T08:00:00.000Z",
        approver_id: request.state === "approved" ? "manager" : null,
        decided_at: request.state === "approved" ? "2026-07-01T08:30:00.000Z" : null,
        decision_reason: null,
        created_at: "2026-07-01T08:00:00.000Z",
        updated_at: "2026-07-01T08:30:00.000Z",
        ...request,
      },
    });
  }
  seedEmployee(value, "emp-terminated", { status: "terminated", schedule: false });
  seedEmployee(value, "emp-ambiguous", { profiles: 2, schedule: false });

  const first = value.precheck.evaluate(PREPARER, { run_id: value.run.run_id, as_of: NOW });
  const second = value.precheck.evaluate(PREPARER, { run_id: value.run.run_id, as_of: NOW });
  assert.equal(first.ready, false);
  assert.equal(first.report_hash, second.report_hash);
  assert.deepEqual(
    [...new Set(first.blockers.map((row) => row.issue_code))].sort(),
    [
      "PAYROLL_ATTENDANCE_CORRECTION_PENDING",
      "PAYROLL_ATTENDANCE_MISSING",
      "PAYROLL_LEAVE_APPROVAL_PENDING",
      "PAYROLL_LEAVE_LEDGER_UNCONFIRMED",
      "PAYROLL_OVERTIME_PENDING",
      "PAYROLL_RULE_UNPUBLISHED",
      "PAYROLL_TERMINATION_DATE_MISSING",
      "PAYROLL_WORK_PROFILE_AMBIGUOUS",
      "PAYROLL_WORK_PROFILE_MISSING",
    ],
  );
  assert.equal(first.blockers.every((row) => row.source_ref.startsWith("artifact:hrx/payroll-precheck/")), true);
  assert.equal(first.blockers.every((row) => row.details.resolution_route.startsWith("/people?") && row.details.resolution_route.includes("#people-")), true);

  const redacted = serializePayrollClosePrecheck(first, { can_view_details: false });
  assert.equal(redacted.blockers.every((row) => row.employee_id === null), true);
  assert.doesNotMatch(JSON.stringify(redacted), /emp-review|emp-terminated|emp-ambiguous|2026-07-01/);
  value.store.close();
});

test("PEO-FIX payroll rule coverage requires one published rule for the whole month", () => {
  const period = {
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    periodId: "period-july-coverage",
    periodCode: "2026-07",
  };
  const cases = [
    {
      name: "month-start-and-end boundaries",
      rules: publishedRuleRows(period),
      expectedCount: 0,
      expectedRuleMatchCount: 1,
    },
    {
      name: "mid-period start",
      rules: publishedRuleRows({ ...period, start: "2026-07-15", end: "2026-12-31" }),
      expectedCount: 2,
      expectedRuleMatchCount: 0,
    },
    {
      name: "mid-period end",
      rules: publishedRuleRows({ ...period, start: "2026-01-01", end: "2026-07-15" }),
      expectedCount: 2,
      expectedRuleMatchCount: 0,
    },
    {
      name: "overlapping full-period versions",
      rules: publishedRuleRows({ ...period, duplicate: true }),
      expectedCount: 2,
      expectedRuleMatchCount: 2,
    },
  ];

  for (const scenario of cases) {
    const value = setup(period);
    const repository = repositoryWithRules(value, scenario.rules);
    const precheck = createPayrollClosePrecheck({
      store: value.store,
      payrollRepository: repository,
      clock: () => NOW,
    });
    const report = precheck.evaluate(PREPARER, { run_id: value.run.run_id, as_of: NOW });
    const ruleBlockers = report.blockers.filter((row) => row.issue_code === "PAYROLL_RULE_UNPUBLISHED");
    assert.equal(report.ready, scenario.expectedCount === 0, scenario.name);
    assert.equal(ruleBlockers.length, scenario.expectedCount, scenario.name);
    assert.deepEqual(ruleBlockers.map((row) => row.details.count).sort((a, b) => a - b), scenario.expectedCount
      ? [scenario.expectedRuleMatchCount, scenario.expectedRuleMatchCount]
      : []);
    value.store.close();
  }
});

test("PEO-TUW-061 limits pending attendance corrections to the payroll period boundaries", () => {
  const value = setup({ withRules: true });
  seedEmployee(value, "emp-correction-boundary");
  insertAttendance(value, "emp-correction-boundary", {
    approved: true,
    attendanceId: "attendance-current",
    workDate: "2026-07-01",
  });
  insertAttendance(value, "emp-correction-boundary", {
    attendanceId: "attendance-before",
    workDate: "2026-06-30",
  });
  insertAttendance(value, "emp-correction-boundary", {
    attendanceId: "attendance-after",
    workDate: "2026-07-02",
  });
  insertPendingCorrection(value, "emp-correction-boundary", "attendance-before", "correction-before");
  insertPendingCorrection(value, "emp-correction-boundary", "attendance-current", "correction-current");
  insertPendingCorrection(value, "emp-correction-boundary", "attendance-after", "correction-after");

  const report = value.precheck.evaluate(PREPARER, { run_id: value.run.run_id, as_of: NOW });
  assert.deepEqual(
    report.blockers.map(({ issue_code, details }) => ({
      issue_code,
      count: details.count,
      dates: details.dates,
    })),
    [{
      issue_code: "PAYROLL_ATTENDANCE_CORRECTION_PENDING",
      count: 1,
      dates: ["2026-07-01"],
    }],
  );
  value.store.close();
});

test("PEO-TUW-061 blocks safely when a pending correction has no work-date authority", () => {
  const value = setup({ withRules: true });
  seedEmployee(value, "emp-correction-unknown");
  insertAttendance(value, "emp-correction-unknown", { approved: true });
  const store = {
    query(operation, input) {
      if (
        operation === "select"
        && input?.table === "hrx_attendance_correction_requests"
        && input?.where?.employee_id === "emp-correction-unknown"
      ) {
        return [{
          tenant_id: TENANT,
          correction_request_id: "correction-without-source",
          attendance_id: "attendance-missing",
          employee_id: "emp-correction-unknown",
          state: "pending",
          requested_at: "2026-07-01T10:30:00.000Z",
          updated_at: "2026-07-01T10:30:00.000Z",
        }];
      }
      return value.store.query(operation, input);
    },
  };
  const precheck = createPayrollClosePrecheck({
    store,
    payrollRepository: value.repository,
    clock: () => NOW,
  });

  const report = precheck.evaluate(PREPARER, { run_id: value.run.run_id, as_of: NOW });
  const blocker = report.blockers.find((row) => row.issue_code === "PAYROLL_ATTENDANCE_CORRECTION_PENDING");
  assert.equal(blocker?.details.count, 1);
  assert.deepEqual(blocker?.details.dates, []);
  value.store.close();
});

test("PEO-TUW-061 blocks approve and close when one precheck blocker exists", () => {
  const value = setup({ withRules: true });
  seedEmployee(value, "emp-ready");
  insertAttendance(value, "emp-ready", { approved: true });
  const snapshot = value.repository.createInputSnapshot(PREPARER, {
    snapshot_id: "snapshot-ready",
    run_id: value.run.run_id,
    employee_id: "emp-ready",
    source_refs: [{ kind: "attendance", ref: "artifact:attendance/ready", hash: "a".repeat(64) }],
    input_data: { fixture_only: true },
    source_hash: "c".repeat(64),
  });
  let run = value.repository.transitionRun(PREPARER, {
    run_id: value.run.run_id,
    status: "snapshot_ready",
    snapshot_hash: snapshot.source_hash,
    expected_version: value.run.state_version,
  });
  value.repository.persistRunPreview(PREPARER, {
    run_id: run.run_id,
    expected_version: run.state_version,
    result_hash: "d".repeat(64),
    results: [{
      result_id: "result-ready",
      input_snapshot_id: snapshot.snapshot_id,
      employee_id: "emp-ready",
      gross_krw: 1_000_000,
      deduction_krw: 100_000,
      net_krw: 900_000,
      result_hash: "e".repeat(64),
      line_items: [],
      issues: [],
    }],
  });
  const runService = createPayrollRunService({
    payrollRepository: value.repository,
    inputSnapshotService: { loadResolved: () => [] },
    closePrecheckService: value.precheck,
    clock: () => NOW,
  });
  const receipt = createPayrollStepUpReceipt({
    receipt_ref: "artifact:step-up/precheck-ready",
    actor_id: APPROVER.actor_id,
    action: "payroll.approve",
    object_id: run.run_id,
    issued_at: "2026-07-02T00:55:00.000Z",
    expires_at: "2026-07-02T01:05:00.000Z",
  });
  const readyReport = value.precheck.evaluate(PREPARER, { run_id: run.run_id, as_of: NOW });
  assert.equal(readyReport.ready, true, JSON.stringify(readyReport));
  run = runService.approve(APPROVER, { run_id: run.run_id, step_up_receipt: receipt, as_of: NOW });
  assert.equal(run.status, "approved");

  value.store.query("insert", {
    table: "hrx_overtime_requests",
    row: {
      tenant_id: TENANT,
      overtime_id: "overtime-after-approval",
      employee_id: "emp-ready",
      work_date: "2026-07-01",
      hours: 1,
      calculated_minutes: 60,
      requested_minutes: 60,
      approved_minutes: 0,
      reason: "fixture",
      state: "submitted",
      submitted_at: NOW,
      approver_id: null,
      decided_at: null,
      decision_reason: null,
      export_ref: null,
      source_ref: "Overtime:overtime-after-approval",
      calculation_basis_ref: "artifact:attendance/overtime-after-approval",
      warning_codes_json: "[]",
      payroll_segment_kind: "overtime",
      created_at: NOW,
      updated_at: NOW,
    },
  });
  assert.throws(
    () => runService.close(APPROVER, { run_id: run.run_id, as_of: NOW }),
    (error) => error.safe_error_code === "HRX_PAYROLL_CLOSE_PRECHECK_BLOCKED" && error.precheck.blocker_count === 1,
  );
  assert.equal(value.repository.getRun(PREPARER, { run_id: run.run_id }).status, "approved");
  value.store.close();
});
