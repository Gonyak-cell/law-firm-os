import { createWeeklyOvertimeRiskReport } from "./overtime.js";
import { calculateLeavePromotionBalances } from "./leave/promotion-balance.js";

export const HRX_RISK_EVENT_CATEGORIES = Object.freeze([
  "harassment",
  "discrimination",
  "security",
  "privacy",
  "payroll",
  "performance",
  "compliance",
  "labor",
  "training",
  "lifecycle",
  "other",
]);
export const HRX_RISK_EVENT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const HRX_RISK_EVENT_STATUSES = Object.freeze(["open", "acknowledged", "in_progress", "resolved", "dismissed"]);
export const HRX_LEGAL_RISK_TYPES = Object.freeze([
  "employment_contract_missing",
  "annual_leave_promotion_target",
  "statutory_training_missing",
  "overtime_risk",
  "offboarded_access_not_revoked",
]);

const LEGAL_RISK_LABELS = Object.freeze({
  employment_contract_missing: "근로계약 미체결",
  annual_leave_promotion_target: "연차촉진 대상",
  statutory_training_missing: "법정교육 미이수",
  overtime_risk: "초과근로 위험",
  offboarded_access_not_revoked: "퇴사자 권한 미회수",
});

const STATUS_TRANSITIONS = Object.freeze({
  open: Object.freeze(["acknowledged", "in_progress", "resolved", "dismissed"]),
  acknowledged: Object.freeze(["in_progress", "resolved", "dismissed"]),
  in_progress: Object.freeze(["resolved", "dismissed"]),
  resolved: Object.freeze([]),
  dismissed: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueStrings(values = []) {
  return Object.freeze([...new Set(values.map((value) => optionalString({ value }, "value")).filter(Boolean))]);
}

function currentDateKey(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function dateKey(value, field) {
  const raw = optionalString({ value }, "value");
  if (!raw) return null;
  const normalized = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(new Date(`${normalized}T00:00:00.000Z`).getTime())) {
    throw new TypeError(`${field} must be a valid date`);
  }
  return normalized;
}

function normalizeStatus(input = {}) {
  const status = input.status ?? "open";
  if (!HRX_RISK_EVENT_STATUSES.includes(status)) {
    throw new TypeError(`status must be one of ${HRX_RISK_EVENT_STATUSES.join(", ")}`);
  }
  return status;
}

export function createHrxRiskEvent(input = {}) {
  const category = requiredString(input, "category");
  if (!HRX_RISK_EVENT_CATEGORIES.includes(category)) {
    throw new TypeError(`category must be one of ${HRX_RISK_EVENT_CATEGORIES.join(", ")}`);
  }
  const severity = requiredString(input, "severity");
  if (!HRX_RISK_EVENT_SEVERITIES.includes(severity)) {
    throw new TypeError(`severity must be one of ${HRX_RISK_EVENT_SEVERITIES.join(", ")}`);
  }
  const status = normalizeStatus(input);
  const intakeSourceRef = requiredString(input, "intake_source_ref");
  const riskType = optionalString(input, "risk_type") ?? category;
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    risk_event_id: requiredString(input, "risk_event_id"),
    employee_id: input.employee_id ?? null,
    candidate_id: input.candidate_id ?? null,
    category,
    risk_type: riskType,
    severity,
    title: optionalString(input, "title") ?? LEGAL_RISK_LABELS[riskType] ?? riskType,
    description: optionalString(input, "description"),
    intake_source_ref: intakeSourceRef,
    source_refs: uniqueStrings([intakeSourceRef, ...(input.source_refs ?? [])]),
    matter_id: input.matter_id ?? null,
    owner_role: optionalString(input, "owner_role") ?? "people_ops",
    detected_on: dateKey(input.detected_on ?? currentDateKey(), "detected_on"),
    due_on: dateKey(input.due_on, "due_on"),
    status,
    resolution_ref: optionalString(input, "resolution_ref"),
    state_history: Object.freeze((input.state_history ?? []).map((entry) => Object.freeze({ ...entry }))),
  });
}

export function transitionHrxRiskEvent(event = {}, change = {}) {
  const current = createHrxRiskEvent(event);
  const nextStatus = change.status ?? current.status;
  if (!HRX_RISK_EVENT_STATUSES.includes(nextStatus)) {
    throw new TypeError(`status must be one of ${HRX_RISK_EVENT_STATUSES.join(", ")}`);
  }
  if (nextStatus !== current.status && !(STATUS_TRANSITIONS[current.status] ?? []).includes(nextStatus)) {
    throw new TypeError(`HR risk event cannot transition from ${current.status} to ${nextStatus}`);
  }
  const resolutionRef = change.resolution_ref ?? current.resolution_ref;
  if (["resolved", "dismissed"].includes(nextStatus) && !resolutionRef) {
    throw new TypeError("resolution_ref is required for resolved or dismissed risk events");
  }
  const changedAt = change.changed_at ?? new Date().toISOString();
  const stateHistory = nextStatus === current.status
    ? current.state_history
    : [
        ...current.state_history,
        Object.freeze({
          from_status: current.status,
          to_status: nextStatus,
          changed_at: changedAt,
          changed_by: optionalString(change, "changed_by"),
          reason: optionalString(change, "reason"),
        }),
      ];
  return createHrxRiskEvent({
    ...current,
    ...change,
    status: nextStatus,
    resolution_ref: resolutionRef,
    state_history: stateHistory,
  });
}

function isActiveEmployee(employee = {}, profile = null) {
  if (employee.tenant_id && profile?.tenant_id && employee.tenant_id !== profile.tenant_id) return false;
  if (["inactive", "terminated", "archived"].includes(employee.status)) return false;
  if (profile && ["inactive", "terminated", "archived"].includes(profile.status)) return false;
  return true;
}

function employmentProfileByEmployee(profiles = []) {
  const map = new Map();
  for (const profile of profiles) {
    if (!map.has(profile.employee_id)) map.set(profile.employee_id, profile);
  }
  return map;
}

function hasSignedEmploymentContract(documents = [], employeeId) {
  return documents.some((document) => {
    return document.employee_id === employeeId &&
      document.document_type === "employment_contract" &&
      ["signed", "renewed"].includes(document.contract_state) &&
      Boolean(document.signature_ref);
  });
}

function hasAnnualLeaveNotice(documents = [], employeeId, asOf) {
  const year = asOf.slice(0, 4);
  return documents.some((document) => {
    if (document.employee_id !== employeeId) return false;
    if (!["leave_notice", "annual_leave_notice", "annual_leave_promotion_notice"].includes(document.document_type)) return false;
    if (document.source_status !== "verified" || document.source_metadata?.delivery_state !== "delivered") return false;
    if (document.source_metadata?.view_state !== "viewed" && document.source_metadata?.response_state !== "received") return false;
    const evidenceDate = String(document.source_verified_at ?? document.signed_at ?? document.source_ref ?? "");
    return evidenceDate.includes(year) || !/\d{4}/.test(evidenceDate);
  });
}

function leaveBalanceDaysByEmployee({ tenantId, asOf, leaveBalanceEntries = [], leaveBalances = [], policyId = "pto-us", standardDayMinutes = 480 } = {}) {
  const balances = new Map();
  for (const balance of leaveBalances) {
    if (balance.tenant_id !== tenantId || (balance.policy_id && balance.policy_id !== policyId)) continue;
    const days = Number(balance.available_days ?? balance.remaining_days ?? balance.available_balance_days);
    if (Number.isFinite(days)) balances.set(balance.employee_id, Math.max(balances.get(balance.employee_id) ?? 0, days));
  }
  const calculated = calculateLeavePromotionBalances({
    tenant_id: tenantId,
    as_of: asOf,
    policy_id: policyId,
    standard_day_minutes: standardDayMinutes,
    entries: leaveBalanceEntries,
  });
  for (const row of calculated.rows) {
    if (!balances.has(row.employee_id)) balances.set(row.employee_id, row.unused_days);
  }
  return balances;
}

function statutoryTrainingComplete(trainings = [], employeeId, asOf) {
  return trainings.some((training) => {
    if (training.employee_id !== employeeId) return false;
    if (!["statutory", "statutory_labor", "legal_compliance"].includes(training.training_type)) return false;
    if (!["completed", "valid"].includes(training.status ?? "completed")) return false;
    const completedOn = dateKey(training.completed_on ?? training.valid_from ?? asOf, "completed_on");
    const expiresOn = dateKey(training.expires_on, "expires_on");
    return completedOn <= asOf && (!expiresOn || expiresOn >= asOf);
  });
}

function event(input) {
  return createHrxRiskEvent(input);
}

function legalRiskEventId(type, employeeId, suffix = "current") {
  return `hrx-risk:${type}:${employeeId}:${suffix}`;
}

function severityForOvertime(events = []) {
  return events.some((item) => item.severity === "high" || item.risk_type === "weekly_limit_exceeded") ? "high" : "medium";
}

function sortRiskEvents(left, right) {
  return left.risk_type.localeCompare(right.risk_type) ||
    String(left.employee_id ?? "").localeCompare(String(right.employee_id ?? "")) ||
    left.risk_event_id.localeCompare(right.risk_event_id);
}

export function scanHrxLegalRiskEvents(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const asOf = dateKey(input.as_of ?? currentDateKey(), "as_of");
  const profilesByEmployee = employmentProfileByEmployee(input.employment_profiles ?? []);
  const employees = (input.employees ?? [])
    .filter((employee) => employee.tenant_id === tenantId)
    .filter((employee) => isActiveEmployee(employee, profilesByEmployee.get(employee.employee_id)));
  const documents = (input.documents ?? []).filter((document) => document.tenant_id === tenantId);
  const leaveDays = leaveBalanceDaysByEmployee({
    tenantId,
    asOf,
    leaveBalanceEntries: input.leave_balance_entries ?? [],
    leaveBalances: input.leave_balances ?? [],
    policyId: input.leave_policy_id ?? "pto-us",
    standardDayMinutes: input.leave_standard_day_minutes ?? 480,
  });
  const risks = [];

  for (const employee of employees) {
    const employeeId = employee.employee_id;
    if (!hasSignedEmploymentContract(documents, employeeId)) {
      risks.push(event({
        tenant_id: tenantId,
        risk_event_id: legalRiskEventId("employment_contract_missing", employeeId),
        employee_id: employeeId,
        category: "labor",
        risk_type: "employment_contract_missing",
        severity: "critical",
        title: LEGAL_RISK_LABELS.employment_contract_missing,
        description: "활성 구성원에게 서명 완료된 근로계약서 메타데이터가 없습니다.",
        intake_source_ref: `HRXDailyRiskScan:${asOf}:employment_contract_missing`,
        source_refs: [`Employee:${employeeId}`],
        detected_on: asOf,
        due_on: asOf,
      }));
    }

    const availableLeaveDays = leaveDays.get(employeeId) ?? 0;
    if (availableLeaveDays >= Number(input.leave_promotion_threshold_days ?? 10) && !hasAnnualLeaveNotice(documents, employeeId, asOf)) {
      risks.push(event({
        tenant_id: tenantId,
        risk_event_id: legalRiskEventId("annual_leave_promotion_target", employeeId, `${asOf.slice(0, 4)}`),
        employee_id: employeeId,
        category: "labor",
        risk_type: "annual_leave_promotion_target",
        severity: "medium",
        title: LEGAL_RISK_LABELS.annual_leave_promotion_target,
        description: `사용 가능 연차 ${availableLeaveDays}일에 대해 연차촉진 통지 증빙이 없습니다.`,
        intake_source_ref: `HRXDailyRiskScan:${asOf}:annual_leave_promotion_target`,
        source_refs: [`LeaveBalance:${employeeId}:${input.leave_policy_id ?? "pto-us"}`],
        detected_on: asOf,
      }));
    }

    if (!statutoryTrainingComplete(input.statutory_trainings ?? [], employeeId, asOf)) {
      risks.push(event({
        tenant_id: tenantId,
        risk_event_id: legalRiskEventId("statutory_training_missing", employeeId, `${asOf.slice(0, 4)}`),
        employee_id: employeeId,
        category: "training",
        risk_type: "statutory_training_missing",
        severity: "high",
        title: LEGAL_RISK_LABELS.statutory_training_missing,
        description: "현재 기준 유효한 법정교육 완료 기록이 없습니다.",
        intake_source_ref: `HRXDailyRiskScan:${asOf}:statutory_training_missing`,
        source_refs: [`TrainingRequirement:statutory_labor:${asOf.slice(0, 4)}`, `Employee:${employeeId}`],
        detected_on: asOf,
      }));
    }

    const overtimeReport = createWeeklyOvertimeRiskReport({
      tenant_id: tenantId,
      employee_id: employeeId,
      attendance_records: input.attendance_records ?? [],
      overtime_requests: input.overtime_requests ?? [],
      weekly_limit_hours: input.weekly_limit_hours ?? 52,
      standard_daily_hours: input.standard_daily_hours ?? 8,
    });
    if (overtimeReport.events.length > 0) {
      risks.push(event({
        tenant_id: tenantId,
        risk_event_id: legalRiskEventId("overtime_risk", employeeId, asOf),
        employee_id: employeeId,
        category: "labor",
        risk_type: "overtime_risk",
        severity: severityForOvertime(overtimeReport.events),
        title: LEGAL_RISK_LABELS.overtime_risk,
        description: `초과근로 점검 항목 ${overtimeReport.events.length}건이 감지되었습니다.`,
        intake_source_ref: `HRXDailyRiskScan:${asOf}:overtime_risk`,
        source_refs: overtimeReport.events.map((item) => item.risk_id),
        detected_on: asOf,
      }));
    }
  }

  for (const offboarding of input.offboarding_cases ?? []) {
    if (offboarding.tenant_id !== tenantId) continue;
    const accessOpen = (offboarding.access_revocations ?? []).some((item) => item.revoked !== true || !item.confirmation_ref);
    const separated = dateKey(offboarding.separation_date, "separation_date") <= asOf;
    if (accessOpen && separated) {
      risks.push(event({
        tenant_id: tenantId,
        risk_event_id: legalRiskEventId("offboarded_access_not_revoked", offboarding.employee_id, offboarding.offboarding_id),
        employee_id: offboarding.employee_id,
        category: "lifecycle",
        risk_type: "offboarded_access_not_revoked",
        severity: "critical",
        title: LEGAL_RISK_LABELS.offboarded_access_not_revoked,
        description: "퇴사일이 지났지만 계정 회수 확인 기록이 완료되지 않았습니다.",
        intake_source_ref: `HRXDailyRiskScan:${asOf}:offboarded_access_not_revoked`,
        source_refs: [`OffboardingCase:${offboarding.offboarding_id}`],
        detected_on: asOf,
        due_on: asOf,
      }));
    }
  }

  return Object.freeze(risks.sort(sortRiskEvents));
}

export function createHrxRiskDashboard(events = []) {
  const riskEvents = events.map(createHrxRiskEvent);
  const byStatus = Object.fromEntries(HRX_RISK_EVENT_STATUSES.map((status) => [status, 0]));
  const bySeverity = Object.fromEntries(HRX_RISK_EVENT_SEVERITIES.map((severity) => [severity, 0]));
  const byType = Object.fromEntries(HRX_LEGAL_RISK_TYPES.map((type) => [type, 0]));
  for (const item of riskEvents) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    bySeverity[item.severity] = (bySeverity[item.severity] ?? 0) + 1;
    byType[item.risk_type] = (byType[item.risk_type] ?? 0) + 1;
  }
  return Object.freeze({
    event_count: riskEvents.length,
    open_count: riskEvents.filter((item) => ["open", "acknowledged", "in_progress"].includes(item.status)).length,
    legal_type_count: HRX_LEGAL_RISK_TYPES.filter((type) => byType[type] > 0).length,
    by_status: Object.freeze(byStatus),
    by_severity: Object.freeze(bySeverity),
    by_type: Object.freeze(byType),
  });
}

export function createHrxRiskDailyScan(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const asOf = dateKey(input.as_of ?? currentDateKey(), "as_of");
  const events = scanHrxLegalRiskEvents({ ...input, tenant_id: tenantId, as_of: asOf });
  return Object.freeze({
    tenant_id: tenantId,
    scan_ref: `HRXDailyRiskScan:${tenantId}:${asOf}`,
    as_of: asOf,
    rule_types: HRX_LEGAL_RISK_TYPES,
    risk_events: events,
    dashboard: createHrxRiskDashboard(events),
  });
}

export function createInMemoryHrxRiskEventStore(seed = []) {
  const events = new Map();

  function set(eventInput) {
    const event = createHrxRiskEvent(eventInput);
    events.set(`${event.tenant_id}:${event.risk_event_id}`, clone(event));
    return Object.freeze(clone(event));
  }

  for (const eventInput of seed) set(eventInput);

  return Object.freeze({
    upsertMany(eventInputs = []) {
      const written = [];
      for (const input of eventInputs) {
        const next = createHrxRiskEvent(input);
        const key = `${next.tenant_id}:${next.risk_event_id}`;
        const current = events.get(key);
        written.push(set(current ? { ...next, status: current.status, resolution_ref: current.resolution_ref, state_history: current.state_history } : next));
      }
      return Object.freeze(written);
    },
    get(ref = {}) {
      const value = events.get(`${ref.tenant_id}:${ref.risk_event_id}`);
      return value ? Object.freeze(clone(value)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...events.values()]
          .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
          .filter((event) => !query.status || event.status === query.status)
          .filter((event) => !query.risk_type || event.risk_type === query.risk_type)
          .sort(sortRiskEvents)
          .map((event) => Object.freeze(clone(event))),
      );
    },
    transition(ref = {}, change = {}) {
      const current = this.get(ref);
      if (!current) return undefined;
      return set(transitionHrxRiskEvent(current, change));
    },
  });
}
