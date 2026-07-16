const REQUIRED_DECISION_IDS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => `DEC-LV-${String(index + 1).padStart(2, "0")}`),
);

const PRIVILEGED_LEAVE_SCOPES = Object.freeze([
  "hrx.leave.policy.read",
  "hrx.leave.policy.write",
  "hrx.leave.accrual.execute",
  "hrx.leave.ledger.adjust",
  "hrx.leave.promotion.manage",
  "hrx.leave.report.export",
  "hrx.leave.termination.settle",
]);

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

export function validateLeaveManagementBaseline(input = {}) {
  assert(input.schema_version === "law-firm-os.hrx.leave-management-baseline.v0.1", "leave baseline schema_version is invalid");
  assert(input.status === "synthetic_defaults_only", "leave baseline must remain synthetic-only");
  assert(input.real_employee_data_allowed === false, "leave baseline must not allow real employee data");

  const decisionIds = (input.decisions ?? []).map((decision) => decision.id);
  assert(JSON.stringify(decisionIds) === JSON.stringify(REQUIRED_DECISION_IDS), "DEC-LV-01 through DEC-LV-10 are required in order");
  assert(input.decisions.every((decision) => decision.deployment_blocking === true), "all company decisions must block deployment");

  const schedule = input.schedule_source ?? {};
  assert(schedule.attendance_is_schedule_source === false, "attendance facts cannot be the work-schedule source");
  assert(schedule.silent_480_minute_fallback === false, "silent 480-minute fallback is forbidden");
  assert(schedule.company_default_profile?.assignment_required === true, "company default schedule must be explicitly assigned");
  assert(schedule.company_default_profile?.timezone === "Asia/Seoul", "synthetic company schedule must use Asia/Seoul");
  assert(schedule.company_default_profile?.daily_minutes === 480, "synthetic company schedule must total 480 minutes");

  const currentLegal = input.legal_basis_versions?.find((version) => version.code === "KR_LSA_ARTICLE_60_61_CURRENT");
  const futureLegal = input.legal_basis_versions?.find((version) => version.code === "KR_LSA_2026_08_20");
  assert(currentLegal?.effective_to === "2026-08-19", "current legal basis must end before the future version");
  assert(futureLegal?.effective_from === "2026-08-20", "future legal basis must start on 2026-08-20");

  assert(input.route_ownership?.canonical_settings_section === "people-leave-types", "leave settings must have one canonical section");
  assert(input.route_ownership?.legacy_redirects?.["people-company-leave"] === "people-leave-types", "legacy company leave must redirect");

  const staffScopes = input.role_scope_profiles?.staff ?? [];
  assert(staffScopes.includes("hrx.leave.self.read") && staffScopes.includes("hrx.leave.self.write"), "staff self-service scopes are required");
  assert(PRIVILEGED_LEAVE_SCOPES.every((scope) => !staffScopes.includes(scope)), "staff must not inherit privileged leave scopes");
  for (const profile of ["hr", "admin"]) {
    const scopes = input.role_scope_profiles?.[profile] ?? [];
    assert(PRIVILEGED_LEAVE_SCOPES.every((scope) => scopes.includes(scope)), `${profile} leave scope profile is incomplete`);
  }

  return Object.freeze(input);
}

export { PRIVILEGED_LEAVE_SCOPES, REQUIRED_DECISION_IDS };
