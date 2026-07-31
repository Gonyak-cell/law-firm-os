import { createHash } from "node:crypto";
import { createSqlWorkScheduleResolver } from "../leave/work-schedule.js";
import { selectApprovedAttendance } from "../payroll-time-input-snapshot.js";

const PRECHECK_CODES = new Set([
  "PAYROLL_ATTENDANCE_MISSING",
  "PAYROLL_ATTENDANCE_CORRECTION_PENDING",
  "PAYROLL_OVERTIME_PENDING",
  "PAYROLL_LEAVE_APPROVAL_PENDING",
  "PAYROLL_LEAVE_LEDGER_UNCONFIRMED",
  "PAYROLL_TERMINATION_DATE_MISSING",
  "PAYROLL_WORK_PROFILE_MISSING",
  "PAYROLL_WORK_PROFILE_AMBIGUOUS",
  "PAYROLL_RULE_UNPUBLISHED",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function overlaps(row, period) {
  const start = row.start_date ?? row.effective_from ?? row.work_date;
  const end = row.end_date ?? row.effective_to ?? row.work_date;
  return Boolean(start && start <= period.period_end && (!end || end >= period.period_start));
}

/**
 * Return the published rule versions that cover every day in a payroll period.
 *
 * Payroll rules are inclusive date ranges. A rule that starts on the period
 * end (or ends during the period) only overlaps the period; it does not cover
 * it and must not be selected for a preview or close. Keeping this predicate
 * here gives the close precheck and run preview one coverage contract.
 */
export function listPublishedPayrollRulesCoveringPeriod(payrollRepository, context, period, ruleKind) {
  return payrollRepository.listRuleVersions(context, { rule_kind: ruleKind })
    .filter((row) => row.approval_state === "published")
    .filter((row) => row.effective_from <= period.period_start
      && (!row.effective_to || row.effective_to >= period.period_end));
}

function isIsoDate(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function correctionDateAuthority(correction, attendanceById) {
  const explicitStart = correction.period_start ?? correction.start_date;
  const explicitEnd = correction.period_end ?? correction.end_date;
  if (explicitStart !== undefined || explicitEnd !== undefined) {
    if (!isIsoDate(explicitStart) || !isIsoDate(explicitEnd) || explicitStart > explicitEnd) return null;
    return Object.freeze({
      start_date: explicitStart,
      end_date: explicitEnd,
      dates: explicitStart === explicitEnd ? Object.freeze([explicitStart]) : Object.freeze([]),
    });
  }
  const workDate = correction.work_date ?? attendanceById.get(correction.attendance_id)?.work_date;
  if (!isIsoDate(workDate)) return null;
  return Object.freeze({
    start_date: workDate,
    end_date: workDate,
    dates: Object.freeze([workDate]),
  });
}

function atOrBefore(row, asOf) {
  const timestamp = row.updated_at ?? row.created_at ?? row.requested_at ?? row.submitted_at;
  return !timestamp || Date.parse(timestamp) <= Date.parse(asOf);
}

function sourceRef(runId, employeeId, code, material) {
  return `artifact:hrx/payroll-precheck/${digest({ runId, employeeId, code, material }).slice(0, 24)}`;
}

function sectionFor(code) {
  return {
    PAYROLL_ATTENDANCE_MISSING: "people-attendance-records",
    PAYROLL_ATTENDANCE_CORRECTION_PENDING: "people-attendance-records",
    PAYROLL_OVERTIME_PENDING: "people-attendance-records",
    PAYROLL_LEAVE_APPROVAL_PENDING: "people-leave-requests",
    PAYROLL_LEAVE_LEDGER_UNCONFIRMED: "people-leave-usage",
    PAYROLL_TERMINATION_DATE_MISSING: "people-employees",
    PAYROLL_WORK_PROFILE_MISSING: "people-employees",
    PAYROLL_WORK_PROFILE_AMBIGUOUS: "people-employees",
    PAYROLL_RULE_UNPUBLISHED: "people-pay-rules",
  }[code];
}

function routeFor(code, employeeId, periodCode) {
  const params = new URLSearchParams({ employee_id: employeeId ?? "", period: periodCode });
  return `/people?${params.toString()}#${sectionFor(code)}`;
}

function issueSpec(run, period, employeeId, code, details = {}) {
  const material = stable(details);
  return Object.freeze({
    employee_id: employeeId ?? null,
    issue_code: code,
    severity: "blocker",
    source_ref: sourceRef(run.run_id, employeeId, code, material),
    details: Object.freeze({
      category: details.category ?? "payroll_close_precheck",
      count: details.count ?? 1,
      dates: Object.freeze([...(details.dates ?? [])].sort()),
      rule_kind: details.rule_kind ?? null,
      resolution_section: sectionFor(code),
      resolution_route: routeFor(code, employeeId, period.period_code),
    }),
  });
}

function effectiveEmployees(store, tenantId, run, period, payrollRepository) {
  const snapshotIds = payrollRepository.getRunBundle({ tenant_id: tenantId, actor_id: "payroll-precheck" }, { run_id: run.run_id })
    .snapshots.map((row) => row.employee_id);
  if (snapshotIds.length) return [...new Set(snapshotIds)].sort();
  const profiles = store.query("select", { table: "hrx_employment_profiles", where: { tenant_id: tenantId } })
    .filter((row) => overlaps(row, period));
  const employees = store.query("select", { table: "hrx_employees", where: { tenant_id: tenantId } })
    .filter((row) => ["active", "on_leave", "terminated"].includes(row.status));
  return [...new Set([...profiles.map((row) => row.employee_id), ...employees.map((row) => row.employee_id)])].sort();
}

function leaveMinutesByDate(store, tenantId, employeeId, period, asOf) {
  const requests = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId, state: "approved" } })
    .filter((row) => overlaps(row, period) && atOrBefore(row, asOf));
  const requestIds = new Set(requests.map((row) => row.request_id));
  const result = new Map();
  for (const segment of store.query("select", { table: "hrx_leave_request_segments", where: { tenant_id: tenantId } })) {
    if (!requestIds.has(segment.request_id) || segment.segment_date < period.period_start || segment.segment_date > period.period_end || !atOrBefore(segment, asOf)) continue;
    result.set(segment.segment_date, (result.get(segment.segment_date) ?? 0) + Number(segment.requested_minutes ?? 0));
  }
  return result;
}

function attendanceIssues(store, tenantId, employeeId, run, period, asOf, scheduleResolver) {
  let days;
  try {
    days = scheduleResolver.readDays({
      tenant_id: tenantId,
      employee_id: employeeId,
      start_date: period.period_start,
      end_date: period.period_end,
    });
  } catch {
    return [issueSpec(run, period, employeeId, "PAYROLL_WORK_PROFILE_MISSING")];
  }
  const attendance = store.query("select", { table: "hrx_attendance_records", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => row.work_date >= period.period_start && row.work_date <= period.period_end && atOrBefore(row, asOf));
  const approvals = store.query("select", { table: "hrx_attendance_approval_receipts", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => atOrBefore(row, asOf));
  const approved = selectApprovedAttendance({
    attendance_records: attendance,
    approval_receipts: approvals,
    tenant_id: tenantId,
    period_start: period.period_start,
    period_end: period.period_end,
    as_of: asOf,
  });
  const attendanceDates = new Set(approved.map((row) => row.work_date));
  const leaveMinutes = leaveMinutesByDate(store, tenantId, employeeId, period, asOf);
  const missingDates = days
    .filter((day) => day.scheduled_minutes > 0)
    .filter((day) => !attendanceDates.has(day.date) && (leaveMinutes.get(day.date) ?? 0) < day.scheduled_minutes)
    .map((day) => day.date);
  return missingDates.length
    ? [issueSpec(run, period, employeeId, "PAYROLL_ATTENDANCE_MISSING", { count: missingDates.length, dates: missingDates })]
    : [];
}

function employeeIssues(store, tenantId, employeeId, run, period, asOf, scheduleResolver) {
  const issues = attendanceIssues(store, tenantId, employeeId, run, period, asOf, scheduleResolver);
  const profiles = store.query("select", { table: "hrx_employment_profiles", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => overlaps(row, period) && atOrBefore(row, asOf));
  if (profiles.length === 0 && !issues.some((row) => row.issue_code === "PAYROLL_WORK_PROFILE_MISSING")) {
    issues.push(issueSpec(run, period, employeeId, "PAYROLL_WORK_PROFILE_MISSING"));
  } else if (profiles.length > 1) {
    issues.push(issueSpec(run, period, employeeId, "PAYROLL_WORK_PROFILE_AMBIGUOUS", { count: profiles.length }));
  }
  if (profiles.some((row) => row.status === "terminated" && !row.effective_to)) {
    issues.push(issueSpec(run, period, employeeId, "PAYROLL_TERMINATION_DATE_MISSING"));
  }

  const corrections = store.query("select", { table: "hrx_attendance_correction_requests", where: { tenant_id: tenantId, employee_id: employeeId, state: "pending" } })
    .filter((row) => atOrBefore(row, asOf));
  const attendanceById = new Map(
    store.query("select", { table: "hrx_attendance_records", where: { tenant_id: tenantId, employee_id: employeeId } })
      .map((row) => [row.attendance_id, row]),
  );
  const relevantCorrections = corrections
    .map((row) => ({ row, authority: correctionDateAuthority(row, attendanceById) }))
    .filter(({ authority }) => authority === null || overlaps(authority, period));
  if (relevantCorrections.length) {
    issues.push(issueSpec(run, period, employeeId, "PAYROLL_ATTENDANCE_CORRECTION_PENDING", {
      count: relevantCorrections.length,
      dates: [...new Set(relevantCorrections.flatMap(({ authority }) => authority?.dates ?? []))],
    }));
  }

  const overtime = store.query("select", { table: "hrx_overtime_requests", where: { tenant_id: tenantId, employee_id: employeeId, state: "submitted" } })
    .filter((row) => overlaps(row, period) && atOrBefore(row, asOf));
  if (overtime.length) issues.push(issueSpec(run, period, employeeId, "PAYROLL_OVERTIME_PENDING", { count: overtime.length, dates: overtime.map((row) => row.work_date) }));

  const leaveRequests = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => overlaps(row, period) && atOrBefore(row, asOf));
  const pendingLeave = leaveRequests.filter((row) => row.state === "submitted");
  if (pendingLeave.length) issues.push(issueSpec(run, period, employeeId, "PAYROLL_LEAVE_APPROVAL_PENDING", { count: pendingLeave.length }));
  const ledger = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId, employee_id: employeeId, entry_type: "used" } })
    .filter((row) => row.occurred_on >= period.period_start && row.occurred_on <= period.period_end && atOrBefore(row, asOf));
  const unconfirmed = leaveRequests.filter((request) => request.state === "approved")
    .filter((request) => !ledger.some((entry) => entry.source_ref === request.source_ref));
  if (unconfirmed.length) issues.push(issueSpec(run, period, employeeId, "PAYROLL_LEAVE_LEDGER_UNCONFIRMED", { count: unconfirmed.length }));
  return issues;
}

function ruleIssues(payrollRepository, context, run, period) {
  return ["payroll_earnings", "payroll_statutory"].flatMap((ruleKind) => {
    const matches = listPublishedPayrollRulesCoveringPeriod(payrollRepository, context, period, ruleKind);
    return matches.length === 1 ? [] : [issueSpec(run, period, null, "PAYROLL_RULE_UNPUBLISHED", { count: matches.length, rule_kind: ruleKind })];
  });
}

export function serializePayrollClosePrecheck(report, { can_view_details = false } = {}) {
  return Object.freeze({
    ...report,
    blockers: Object.freeze(report.blockers.map((row) => Object.freeze(can_view_details ? { ...row } : {
      issue_code: row.issue_code,
      severity: row.severity,
      source_ref: row.source_ref,
      employee_id: null,
      details: Object.freeze({
        category: row.details.category,
        count: row.details.count,
        resolution_section: row.details.resolution_section,
        resolution_route: row.details.resolution_route.replace(/employee_id=[^&]*/, "employee_id="),
      }),
    }))),
  });
}

export function createPayrollClosePrecheck({
  store,
  payrollRepository,
  scheduleResolver = createSqlWorkScheduleResolver({ store }),
  clock = () => new Date().toISOString(),
} = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("payroll close precheck requires store.query");
  if (!payrollRepository || typeof payrollRepository.createIssue !== "function") throw new TypeError("payrollRepository is required");

  function evaluate(contextInput, input = {}) {
    const context = Object.freeze({
      tenant_id: requiredString(contextInput, "tenant_id"),
      actor_id: requiredString(contextInput, "actor_id"),
    });
    const runId = requiredString(input, "run_id");
    const asOf = input.as_of ?? clock();
    if (!Number.isFinite(Date.parse(asOf))) throw new TypeError("as_of must be an ISO timestamp");
    const run = payrollRepository.getRun(context, { run_id: runId });
    if (!run) throw new Error("Payroll run not found");
    const period = payrollRepository.getPeriod(context, { period_id: run.period_id });
    const specs = [
      ...effectiveEmployees(store, context.tenant_id, run, period, payrollRepository)
        .flatMap((employeeId) => employeeIssues(store, context.tenant_id, employeeId, run, period, asOf, scheduleResolver)),
      ...ruleIssues(payrollRepository, context, run, period),
    ].sort((left, right) => `${left.employee_id ?? ""}:${left.issue_code}`.localeCompare(`${right.employee_id ?? ""}:${right.issue_code}`));
    const activeKeys = new Set(specs.map((row) => `${row.employee_id ?? ""}:${row.issue_code}`));
    const existing = payrollRepository.listIssues(context, { run_id: runId });
    for (const spec of specs) {
      const current = existing.find((row) => row.employee_id === spec.employee_id && row.issue_code === spec.issue_code);
      if (!current) payrollRepository.createIssue(context, { run_id: runId, ...spec });
      else if (current.state !== "open") payrollRepository.reopenIssue(context, { issue_id: current.issue_id, expected_version: current.state_version });
    }
    for (const current of existing) {
      if (!PRECHECK_CODES.has(current.issue_code) || current.state !== "open") continue;
      if (activeKeys.has(`${current.employee_id ?? ""}:${current.issue_code}`)) continue;
      payrollRepository.resolveIssue(context, {
        issue_id: current.issue_id,
        expected_version: current.state_version,
        state: "resolved",
        resolution_code: "PRECHECK_REMEDIATED",
      });
    }
    const blockers = payrollRepository.listIssues(context, { run_id: runId, state: "open" })
      .filter((row) => row.severity === "blocker")
      .map((row) => {
        const details = JSON.parse(row.details_json ?? "{}");
        return Object.freeze({
          issue_id: row.issue_id,
          issue_code: row.issue_code,
          severity: row.severity,
          employee_id: row.employee_id ?? null,
          source_ref: row.source_ref,
          details: Object.freeze(details),
        });
      });
    const result = {
      schema_version: "law-firm-os.hrx.payroll-close-precheck.v1",
      run_id: runId,
      period_id: period.period_id,
      as_of: asOf,
      ready: blockers.length === 0,
      blocker_count: blockers.length,
      blockers: Object.freeze(blockers),
      report_hash: digest(blockers.map((row) => ({
        employee_id: row.employee_id,
        issue_code: row.issue_code,
        source_ref: row.source_ref,
        details: row.details,
      }))),
    };
    return Object.freeze(result);
  }

  function assertReady(context, input = {}) {
    const report = evaluate(context, input);
    if (!report.ready) {
      const error = new Error("Payroll close precheck blockers must be resolved");
      error.safe_error_code = "HRX_PAYROLL_CLOSE_PRECHECK_BLOCKED";
      error.status = 409;
      error.precheck = report;
      throw error;
    }
    return report;
  }

  return Object.freeze({ evaluate, assertReady });
}
