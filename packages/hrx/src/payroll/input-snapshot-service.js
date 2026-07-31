import { createHash, randomUUID } from "node:crypto";
import { createCompanyTimePayrollPolicyManifest } from "../company-policy-manifest.js";
import { compensationCoversPeriod, decryptCompensationAmountRef } from "../compensation.js";
import { assertHrxStorePort } from "../store/port.js";
import { createPayrollDataHash } from "./repository.js";
import { selectApprovedAttendance } from "../payroll-time-input-snapshot.js";

const PAYROLL_TYPES = new Set(["monthly", "hourly", "daily", "freelancer"]);
const OVERTIME_SEGMENTS = new Set(["overtime", "night", "holiday", "weekly_holiday"]);
const REMEDIABLE_ISSUES = new Set([
  "PAYROLL_PROFILE_MISSING",
  "PAYROLL_PROFILE_AMBIGUOUS",
  "EMPLOYMENT_PROFILE_MISSING",
  "EMPLOYMENT_PROFILE_AMBIGUOUS",
  "PAYROLL_COMPENSATION_INVALID",
  "PAYROLL_LEAVE_SEGMENTS_MISSING",
  "PAYROLL_DEDUCTION_INPUT_MISSING",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

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

function inputIssue(issueCode, reasonCode) {
  const error = new Error(reasonCode);
  error.payroll_issue_code = issueCode;
  error.reason_code = reasonCode;
  return error;
}

function overlap(row, start, end) {
  return row.effective_from <= end && (!row.effective_to || row.effective_to >= start);
}

function dateMax(...values) {
  return values.filter(Boolean).sort().at(-1);
}

function dateMin(...values) {
  return values.filter(Boolean).sort()[0];
}

function compensationPeriod(period, payrollProfile) {
  return Object.freeze({
    period_start: dateMax(period.period_start, payrollProfile.effective_from),
    period_end: dateMin(period.period_end, payrollProfile.effective_to),
  });
}

function daysInclusive(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

function atOrBefore(value, cutoff) {
  if (!value) return true;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= Date.parse(cutoff);
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) throw inputIssue("PAYROLL_INPUT_INVALID", `${field.toUpperCase()}_INVALID`);
  return value;
}

function roundMinutes(value, standardWork) {
  if (!Number.isFinite(value) || value < 0) throw inputIssue("PAYROLL_INPUT_INVALID", "MINUTES_INVALID");
  const increment = standardWork.rounding_minutes;
  const scaled = value / increment;
  const rounded = standardWork.rounding_mode === "ceil"
    ? Math.ceil(scaled)
    : standardWork.rounding_mode === "floor"
      ? Math.floor(scaled)
      : standardWork.rounding_mode === "nearest"
        ? Math.round(scaled)
        : scaled;
  const minutes = Math.round(rounded * increment);
  if (!Number.isSafeInteger(minutes)) throw inputIssue("PAYROLL_INPUT_INVALID", "MINUTES_OVERFLOW");
  return minutes;
}

function tokenRef(kind, identifier, material) {
  return Object.freeze({
    kind,
    ref: `artifact:hrx/${kind}/${digest(identifier).slice(0, 24)}`,
    hash: digest(material),
  });
}

function sourceRows(rows, kind, idField, fields) {
  return rows.map((row) => tokenRef(kind, row[idField], Object.fromEntries(fields.map((field) => [field, row[field] ?? null]))));
}

function dedupeRefs(refs) {
  const unique = new Map(refs.map((ref) => [`${ref.kind}:${ref.ref}`, ref]));
  return [...unique.values()].sort((left, right) => `${left.kind}:${left.ref}`.localeCompare(`${right.kind}:${right.ref}`));
}

function effectiveAttendance(rows) {
  const corrected = new Set(rows.map((row) => row.correction_of_attendance_id).filter(Boolean));
  const leaves = rows.filter((row) => !corrected.has(row.attendance_id));
  const byDate = new Map();
  for (const row of leaves) {
    const candidates = byDate.get(row.work_date) ?? [];
    candidates.push(row);
    byDate.set(row.work_date, candidates);
  }
  const selected = [];
  const duplicateDates = [];
  for (const [workDate, candidates] of byDate) {
    candidates.sort((left, right) => `${left.updated_at ?? left.created_at ?? ""}:${left.attendance_id}`.localeCompare(`${right.updated_at ?? right.created_at ?? ""}:${right.attendance_id}`));
    selected.push(candidates.at(-1));
    if (candidates.length > 1) duplicateDates.push(workDate);
  }
  return { rows: selected.sort((left, right) => left.work_date.localeCompare(right.work_date)), duplicate_dates: duplicateDates.sort() };
}

function attendanceMinutes(row, standardWork) {
  if (row.recorded_hours !== null && row.recorded_hours !== undefined) return roundMinutes(Number(row.recorded_hours) * 60, standardWork);
  if (row.clock_in_at && row.clock_out_at) {
    const elapsed = (Date.parse(row.clock_out_at) - Date.parse(row.clock_in_at)) / 60_000;
    return roundMinutes(elapsed, standardWork);
  }
  return ["present", "remote"].includes(row.status) ? standardWork.daily_minutes : 0;
}

function captureAttendance(store, tenantId, employeeId, period, manifest) {
  const all = store.query("select", { table: "hrx_attendance_records", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => row.work_date >= period.period_start && row.work_date <= period.period_end)
    .filter((row) => atOrBefore(row.created_at, period.cutoff_at));
  const effective = effectiveAttendance(all);
  const receipts = store.query("select", {
    table: "hrx_attendance_approval_receipts",
    where: { tenant_id: tenantId, employee_id: employeeId },
  });
  const approved = selectApprovedAttendance({
    attendance_records: all,
    approval_receipts: receipts,
    tenant_id: tenantId,
    period_start: period.period_start,
    period_end: period.period_end,
    as_of: period.cutoff_at,
  });
  const totals = { present_days: 0, remote_days: 0, absent_days: 0, leave_days: 0, holiday_days: 0, payable_minutes: 0 };
  for (const row of approved) {
    totals[`${row.status}_days`] = (totals[`${row.status}_days`] ?? 0) + 1;
    totals.payable_minutes += attendanceMinutes(row, manifest.standard_work);
  }
  const approvedIds = new Set(approved.map((row) => row.attendance_id));
  const approvalRows = receipts.filter((row) => approvedIds.has(row.attendance_id));
  return {
    data: Object.freeze({ ...totals, source_count: approved.length }),
    refs: [
      ...sourceRows(approved, "attendance", "attendance_id", ["attendance_id", "work_date", "status", "recorded_hours", "clock_in_at", "clock_out_at", "correction_of_attendance_id"]),
      ...sourceRows(approvalRows, "attendance-approval", "approval_receipt_id", ["approval_receipt_id", "attendance_id", "approved_by_actor_id", "approved_at", "attendance_source_ref"]),
    ],
    warnings: effective.duplicate_dates.length ? [{ code: "PAYROLL_ATTENDANCE_DUPLICATE_DATE", details: { duplicate_date_count: effective.duplicate_dates.length } }] : [],
  };
}

function captureOvertime(store, tenantId, employeeId, period, manifest, { payrollHandoffEnabled = false } = {}) {
  const rows = store.query("select", { table: "hrx_overtime_requests", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => row.work_date >= period.period_start && row.work_date <= period.period_end)
    .filter((row) => ["approved", "exported"].includes(row.state))
    .filter((row) => atOrBefore(row.decided_at ?? row.updated_at ?? row.created_at, period.cutoff_at));
  const seen = new Set();
  const totals = { overtime_minutes: 0, night_minutes: 0, holiday_minutes: 0 };
  for (const row of rows) {
    if (seen.has(row.overtime_id)) continue;
    seen.add(row.overtime_id);
    const segment = row.payroll_segment_kind ?? "overtime";
    if (!OVERTIME_SEGMENTS.has(segment)) throw inputIssue("PAYROLL_OVERTIME_SEGMENT_INVALID", "OVERTIME_SEGMENT_INVALID");
    const approvedMinutes = payrollHandoffEnabled && Number.isSafeInteger(Number(row.approved_minutes)) && Number(row.approved_minutes) > 0
      ? Number(row.approved_minutes)
      : Number(row.hours) * 60;
    totals[`${segment}_minutes`] += roundMinutes(approvedMinutes, manifest.standard_work);
  }
  const selected = rows.filter((row, index) => rows.findIndex((candidate) => candidate.overtime_id === row.overtime_id) === index);
  const warnings = payrollHandoffEnabled
    ? selected.flatMap((row) => {
        try {
          return JSON.parse(row.warning_codes_json ?? "[]").map((code) => ({
            code: code === "OVERTIME_APPROVAL_EXCEEDS_CALCULATED"
              ? "PAYROLL_OVERTIME_APPROVAL_EXCEEDS_CALCULATED"
              : "PAYROLL_OVERTIME_REQUEST_EXCEEDS_CALCULATED",
            details: {
              overtime_id: row.overtime_id,
              calculated_minutes: Number(row.calculated_minutes ?? 0),
              requested_minutes: Number(row.requested_minutes ?? Number(row.hours) * 60),
              approved_minutes: Number(row.approved_minutes ?? Number(row.hours) * 60),
            },
          }));
        } catch {
          throw inputIssue("PAYROLL_OVERTIME_WARNING_INVALID", "OVERTIME_WARNING_CODES_INVALID");
        }
      })
    : [];
  return {
    data: Object.freeze({ ...totals, source_count: selected.length }),
    refs: sourceRows(selected, "overtime", "overtime_id", ["overtime_id", "work_date", "hours", "calculated_minutes", "requested_minutes", "approved_minutes", "state", "decided_at", "payroll_segment_kind"]),
    warnings,
  };
}

function ledgerEffect(row) {
  if (!Number.isInteger(row.amount_minutes) || row.amount_minutes <= 0) return 0;
  if (["earned", "carryover", "released"].includes(row.entry_type)) return row.amount_minutes;
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -row.amount_minutes;
  if (row.entry_type === "adjustment") return row.adjustment_direction === "debit" ? -row.amount_minutes : row.amount_minutes;
  return 0;
}

function captureLeave(store, tenantId, employeeId, period) {
  const requests = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId, state: "approved" } })
    .filter((row) => row.start_date <= period.period_end && row.end_date >= period.period_start)
    .filter((row) => atOrBefore(row.decided_at ?? row.updated_at ?? row.created_at, period.cutoff_at));
  const segments = store.query("select", { table: "hrx_leave_request_segments", where: { tenant_id: tenantId } })
    .filter((row) => requests.some((request) => request.request_id === row.request_id))
    .filter((row) => row.segment_date >= period.period_start && row.segment_date <= period.period_end);
  let paidMinutes = 0;
  let unpaidMinutes = 0;
  for (const request of requests) {
    const requestSegments = segments.filter((row) => row.request_id === request.request_id);
    if (requestSegments.length) {
      for (const segment of requestSegments) {
        const requested = nonNegativeInteger(segment.requested_minutes, "leave_segment_requested_minutes");
        const paid = nonNegativeInteger(segment.paid_minutes ?? 0, "leave_segment_paid_minutes");
        paidMinutes += paid;
        unpaidMinutes += Math.max(0, requested - paid);
      }
      continue;
    }
    if (request.start_date < period.period_start || request.end_date > period.period_end) {
      throw inputIssue("PAYROLL_LEAVE_SEGMENTS_MISSING", "PARTIAL_PERIOD_LEAVE_SEGMENTS_MISSING");
    }
    paidMinutes += nonNegativeInteger(request.paid_minutes ?? 0, "leave_paid_minutes");
    unpaidMinutes += nonNegativeInteger(request.unpaid_minutes ?? 0, "leave_unpaid_minutes");
  }
  const ledger = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((row) => row.occurred_on <= period.period_end)
    .filter((row) => atOrBefore(row.created_at, period.cutoff_at));
  const unusedBalance = ledger.reduce((sum, row) => sum + ledgerEffect(row), 0);
  const policyVersionRefs = [...new Set([
    ...requests.map((row) => row.policy_version_id ?? row.policy_id).filter(Boolean),
    ...ledger.map((row) => row.policy_version_id ?? row.policy_id).filter(Boolean),
  ])].sort();
  return {
    data: Object.freeze({
      paid_minutes: paidMinutes,
      unpaid_minutes: unpaidMinutes,
      unused_balance_minutes: Math.max(0, unusedBalance),
      policy_version_refs: policyVersionRefs,
      source_count: requests.length,
    }),
    refs: [
      ...sourceRows(requests, "leave-request", "request_id", ["request_id", "policy_id", "policy_version_id", "start_date", "end_date", "state", "paid_minutes", "unpaid_minutes", "policy_rules_snapshot_hash"]),
      ...sourceRows(segments, "leave-segment", "segment_id", ["segment_id", "request_id", "segment_date", "requested_minutes", "paid_minutes", "deduction_minutes", "policy_rules_snapshot_hash"]),
      ...sourceRows(ledger, "leave-ledger", "entry_id", ["entry_id", "entry_type", "amount_minutes", "adjustment_direction", "occurred_on", "policy_version_id", "entitlement_id"]),
    ],
    warnings: unusedBalance < 0 ? [{ code: "PAYROLL_LEAVE_BALANCE_NEGATIVE", details: { deficit_minutes: Math.abs(unusedBalance) } }] : [],
  };
}

function lifecycleData(employmentProfile, payrollProfile, period) {
  const activeFrom = dateMax(period.period_start, employmentProfile.effective_from, payrollProfile.effective_from);
  const activeTo = dateMin(period.period_end, employmentProfile.effective_to, payrollProfile.effective_to);
  const periodDays = daysInclusive(period.period_start, period.period_end);
  const activeDays = daysInclusive(activeFrom, activeTo);
  return Object.freeze({
    employment_type: employmentProfile.employment_type,
    lifecycle_status: employmentProfile.status,
    effective_from: employmentProfile.effective_from,
    effective_to: employmentProfile.effective_to ?? null,
    active_from: activeFrom,
    active_to: activeTo,
    period_calendar_days: periodDays,
    active_calendar_days: activeDays,
    starts_in_period: activeFrom > period.period_start,
    ends_in_period: activeTo < period.period_end,
    on_leave: employmentProfile.status === "on_leave",
  });
}

function activeProfiles(rows, start, end, { payroll = false } = {}) {
  return rows.filter((row) => overlap(row, start, end) && (!payroll || row.status === "active"));
}

function chooseProfile(rows, missingCode, ambiguousCode) {
  if (!rows.length) throw inputIssue(missingCode, missingCode);
  if (rows.length !== 1) throw inputIssue(ambiguousCode, ambiguousCode);
  return rows[0];
}

export function createServerCompensationResolver({ store, keyMaterial, allowSyntheticKey = false } = {}) {
  assertHrxStorePort(store);
  return Object.freeze({
    resolve(contextInput, input = {}) {
      const tenantId = requiredString(contextInput, "tenant_id");
      const employeeId = requiredString(input, "employee_id");
      const compensationRef = requiredString(input, "compensation_ref");
      if (!compensationRef.startsWith("compensation:") || compensationRef.length === "compensation:".length) {
        throw inputIssue("PAYROLL_COMPENSATION_INVALID", "COMPENSATION_REF_INVALID");
      }
      const compensationId = decodeURIComponent(compensationRef.slice("compensation:".length));
      const record = store.query("selectOne", { table: "hrx_compensation_records", where: { tenant_id: tenantId, compensation_id: compensationId } });
      if (!record || record.employee_id !== employeeId) throw inputIssue("PAYROLL_COMPENSATION_INVALID", "COMPENSATION_RECORD_MISSING");
      if ((input.period_start !== undefined || input.period_end !== undefined)
        && !compensationCoversPeriod(record, input.period_start, input.period_end)) {
        throw inputIssue("PAYROLL_COMPENSATION_INVALID", "COMPENSATION_PERIOD_MISMATCH");
      }
      let decrypted;
      try {
        decrypted = decryptCompensationAmountRef(
          record.encrypted_amount_ref,
          { tenant_id: tenantId, employee_id: employeeId, compensation_id: compensationId },
          { keyMaterial, allowSyntheticKey },
        );
      } catch {
        throw inputIssue("PAYROLL_COMPENSATION_INVALID", "COMPENSATION_DECRYPT_FAILED");
      }
      const currency = decrypted.currency_ref ?? record.currency_ref ?? "KRW";
      if (currency !== "KRW") throw inputIssue("PAYROLL_COMPENSATION_INVALID", "COMPENSATION_CURRENCY_INVALID");
      return Object.freeze({
        amount_krw: decrypted.amount_minor,
        currency,
        compensation_ref: compensationRef,
        source_ref: `compensation:${encodeURIComponent(compensationId)}`,
        source_hash: digest({
          compensation_id: compensationId,
          employee_id: employeeId,
          encrypted_amount_ref: record.encrypted_amount_ref,
          currency_ref: record.currency_ref,
          effective_from: record.effective_from,
          effective_to: record.effective_to,
        }),
      });
    },
  });
}

export function createPayrollInputSnapshotService({
  store,
  payrollRepository,
  compensationResolver,
  policyManifest,
  payrollHandoffEnabled = false,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  assertHrxStorePort(store);
  if (!payrollRepository || typeof payrollRepository.createInputSnapshot !== "function") throw new TypeError("payrollRepository is required");
  if (!compensationResolver || typeof compensationResolver.resolve !== "function") throw new TypeError("compensationResolver is required");

  function manifest(tenantId) {
    const source = typeof policyManifest === "function" ? policyManifest(tenantId) : policyManifest;
    const value = createCompanyTimePayrollPolicyManifest(source);
    if (value.tenant_id !== tenantId) throw new TypeError("company policy manifest tenant mismatch");
    return value;
  }

  function issueRef(runId, employeeId, code) {
    return `artifact:hrx/payroll-issue/${digest({ runId, employeeId, code }).slice(0, 24)}`;
  }

  function ensureIssue(context, input) {
    const existing = payrollRepository.listIssues(context, { run_id: input.run_id })
      .find((row) => row.employee_id === (input.employee_id ?? null) && row.issue_code === input.issue_code);
    if (!existing) return payrollRepository.createIssue(context, input);
    if (existing.state === "open") return existing;
    return payrollRepository.reopenIssue(context, { issue_id: existing.issue_id, expected_version: existing.state_version });
  }

  function resolveRemediated(context, runId, employeeId) {
    for (const issue of payrollRepository.listIssues(context, { run_id: runId, employee_id: employeeId, state: "open" })) {
      if (!REMEDIABLE_ISSUES.has(issue.issue_code)) continue;
      payrollRepository.resolveIssue(context, { issue_id: issue.issue_id, state: "resolved", resolution_code: "INPUT_REMEDIATED", expected_version: issue.state_version });
    }
  }

  function eligibleEmployees(tenantId, period, payrollProfiles, employmentProfiles) {
    const payrollIds = new Set(payrollProfiles.filter((row) => overlap(row, period.period_start, period.period_end)).map((row) => row.employee_id));
    const employmentIds = new Set(employmentProfiles.filter((row) => overlap(row, period.period_start, period.period_end)).map((row) => row.employee_id));
    return store.query("select", { table: "hrx_employees", where: { tenant_id: tenantId } })
      .filter((row) => ["active", "on_leave"].includes(row.status) || payrollIds.has(row.employee_id) || employmentIds.has(row.employee_id))
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id));
  }

  function hydrateSnapshot(context, snapshot, period) {
    const inputData = JSON.parse(snapshot.input_json);
    const requestedPeriod = compensationPeriod(period, inputData.payroll_profile);
    const resolved = compensationResolver.resolve(context, {
      employee_id: snapshot.employee_id,
      compensation_ref: inputData.payroll_profile.compensation_ref,
      period_start: requestedPeriod.period_start,
      period_end: requestedPeriod.period_end,
    });
    if (resolved.source_hash !== inputData.payroll_profile.compensation_source_hash) {
      throw inputIssue("PAYROLL_COMPENSATION_INVALID", "COMPENSATION_SOURCE_CHANGED");
    }
    return Object.freeze({ snapshot: clone(snapshot), input: clone(inputData), compensation: resolved });
  }

  function loadResolved(contextInput, input = {}) {
    const context = Object.freeze({ tenant_id: requiredString(contextInput, "tenant_id"), actor_id: requiredString(contextInput, "actor_id") });
    const runId = requiredString(input, "run_id");
    const run = payrollRepository.getRun(context, { run_id: runId });
    if (!run) throw new Error("Payroll run not found");
    const period = payrollRepository.getPeriod(context, { period_id: run.period_id });
    return Object.freeze([...payrollRepository.getRunBundle(context, { run_id: runId }).snapshots]
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
      .map((snapshot) => hydrateSnapshot(context, snapshot, period)));
  }

  function capture(contextInput, input = {}) {
    const context = Object.freeze({ tenant_id: requiredString(contextInput, "tenant_id"), actor_id: requiredString(contextInput, "actor_id") });
    const runId = requiredString(input, "run_id");
    let run = payrollRepository.getRun(context, { run_id: runId });
    if (!run) throw new Error("Payroll run not found");
    if (!["draft", "snapshot_ready"].includes(run.status)) throw new Error("Payroll input snapshot can only be captured for a draft run");
    if (input.expected_version !== undefined && input.expected_version !== run.state_version) {
      const error = new Error("Payroll run state version conflict");
      error.safe_error_code = "HRX_STATE_VERSION_CONFLICT";
      throw error;
    }
    const period = payrollRepository.getPeriod(context, { period_id: run.period_id });
    const companyPolicy = manifest(context.tenant_id);
    const payrollProfiles = payrollRepository.listProfiles(context);
    const employmentProfiles = store.query("select", { table: "hrx_employment_profiles", where: { tenant_id: context.tenant_id } });
    const eligible = eligibleEmployees(context.tenant_id, period, payrollProfiles, employmentProfiles);
    const adjustmentEmployeeIds = run.run_type === "adjustment"
      ? new Set(payrollRepository.listAdjustments(context, { run_id: runId }).map((row) => row.employee_id))
      : null;
    const employees = adjustmentEmployeeIds
      ? eligible.filter((employee) => adjustmentEmployeeIds.has(employee.employee_id))
      : eligible;
    const existingSnapshots = new Map(payrollRepository.getRunBundle(context, { run_id: runId }).snapshots.map((row) => [row.employee_id, row]));

    for (const employee of employees) {
      if (existingSnapshots.has(employee.employee_id)) continue;
      try {
        const payrollProfile = chooseProfile(
          activeProfiles(payrollProfiles.filter((row) => row.employee_id === employee.employee_id), period.period_start, period.period_end, { payroll: true }),
          "PAYROLL_PROFILE_MISSING",
          "PAYROLL_PROFILE_AMBIGUOUS",
        );
        if (!PAYROLL_TYPES.has(payrollProfile.employment_type) || payrollProfile.currency !== "KRW") {
          throw inputIssue("PAYROLL_PROFILE_INVALID", "PAYROLL_PROFILE_INVALID");
        }
        if (!payrollProfile.deduction_input_json) throw inputIssue("PAYROLL_DEDUCTION_INPUT_MISSING", "PAYROLL_DEDUCTION_INPUT_MISSING");
        const deductionInput = JSON.parse(payrollProfile.deduction_input_json);
        const customDeductions = JSON.parse(payrollProfile.custom_deductions_json ?? "[]");
        const noticeAssessments = JSON.parse(payrollProfile.notice_assessments_json ?? "[]");
        const employmentProfile = chooseProfile(
          activeProfiles(employmentProfiles.filter((row) => row.employee_id === employee.employee_id), period.period_start, period.period_end),
          "EMPLOYMENT_PROFILE_MISSING",
          "EMPLOYMENT_PROFILE_AMBIGUOUS",
        );
        const requestedPeriod = compensationPeriod(period, payrollProfile);
        const compensation = compensationResolver.resolve(context, {
          employee_id: employee.employee_id,
          compensation_ref: payrollProfile.compensation_ref,
          period_start: requestedPeriod.period_start,
          period_end: requestedPeriod.period_end,
        });
        const attendance = captureAttendance(store, context.tenant_id, employee.employee_id, period, companyPolicy);
        const overtime = captureOvertime(
          store,
          context.tenant_id,
          employee.employee_id,
          period,
          companyPolicy,
          { payrollHandoffEnabled },
        );
        const leave = captureLeave(store, context.tenant_id, employee.employee_id, period);
        for (const warning of [...attendance.warnings, ...(overtime.warnings ?? []), ...(leave.warnings ?? [])]) {
          ensureIssue(context, {
            run_id: runId,
            employee_id: employee.employee_id,
            issue_code: warning.code,
            severity: "warning",
            source_ref: issueRef(runId, employee.employee_id, warning.code),
            details: warning.details,
          });
        }
        const lifecycle = lifecycleData(employmentProfile, payrollProfile, period);
        const inputData = Object.freeze({
          schema_version: 1,
          payroll_profile: Object.freeze({
            employment_type: payrollProfile.employment_type,
            pay_group_code: payrollProfile.pay_group_code,
            currency: payrollProfile.currency,
            effective_from: payrollProfile.effective_from,
            effective_to: payrollProfile.effective_to ?? null,
            compensation_ref: payrollProfile.compensation_ref,
            compensation_source_hash: compensation.source_hash,
            compensation_unit: payrollProfile.compensation_unit,
            compensation_quantity: payrollProfile.compensation_quantity,
            withholding_category: payrollProfile.withholding_category ?? null,
          }),
          lifecycle,
          attendance: attendance.data,
          overtime: overtime.data,
          leave: leave.data,
          deductions: Object.freeze({
            input: Object.freeze(clone(deductionInput)),
            custom: Object.freeze(clone(customDeductions)),
            notices: Object.freeze(clone(noticeAssessments)),
          }),
          policy: Object.freeze({
            manifest_id: companyPolicy.manifest_id,
            environment: companyPolicy.environment,
            timezone: companyPolicy.standard_work.timezone,
            standard_day_minutes: companyPolicy.standard_work.daily_minutes,
            rounding_minutes: companyPolicy.standard_work.rounding_minutes,
            rounding_mode: companyPolicy.standard_work.rounding_mode,
          }),
        });
        const refs = dedupeRefs([
          tokenRef("payroll-profile", payrollProfile.payroll_profile_id, payrollProfile),
          tokenRef("employment-profile", employmentProfile.profile_id, employmentProfile),
          { kind: "compensation", ref: compensation.source_ref, hash: compensation.source_hash },
          ...attendance.refs,
          ...overtime.refs,
          ...leave.refs,
        ]);
        const sourceHash = digest({ input_data: inputData, source_refs: refs });
        const snapshot = payrollRepository.createInputSnapshot(context, {
          snapshot_id: idFactory("payroll_snapshot"),
          run_id: runId,
          employee_id: employee.employee_id,
          source_refs: refs,
          input_data: inputData,
          source_hash: sourceHash,
          payable_minutes: attendance.data.payable_minutes,
          paid_leave_minutes: leave.data.paid_minutes,
          unpaid_leave_minutes: leave.data.unpaid_minutes,
          captured_at: clock(),
        });
        existingSnapshots.set(employee.employee_id, snapshot);
        resolveRemediated(context, runId, employee.employee_id);
      } catch (error) {
        if (!error?.payroll_issue_code) throw error;
        ensureIssue(context, {
          run_id: runId,
          employee_id: employee.employee_id,
          issue_code: error.payroll_issue_code,
          severity: "blocker",
          source_ref: issueRef(runId, employee.employee_id, error.payroll_issue_code),
          details: { reason_code: error.reason_code },
        });
      }
    }

    const snapshots = [...payrollRepository.getRunBundle(context, { run_id: runId }).snapshots].sort((left, right) => left.employee_id.localeCompare(right.employee_id));
    const issues = payrollRepository.listIssues(context, { run_id: runId });
    const snapshotHash = createPayrollDataHash(snapshots.map((row) => ({ employee_id: row.employee_id, source_hash: row.source_hash })));
    const blockers = issues.filter((row) => row.state === "open" && row.severity === "blocker");
    if (!blockers.length && run.status === "draft") {
      run = payrollRepository.transitionRun(context, { run_id: runId, status: "snapshot_ready", snapshot_hash: snapshotHash, expected_version: run.state_version });
    }
    return Object.freeze({
      run: clone(run),
      ready: blockers.length === 0,
      snapshot_hash: snapshotHash,
      snapshots: Object.freeze(snapshots.map(clone)),
      issues: Object.freeze(issues.map(clone)),
      resolved_inputs: blockers.length ? Object.freeze([]) : loadResolved(context, { run_id: runId }),
    });
  }

  return Object.freeze({ capture, loadResolved });
}
