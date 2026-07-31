type PeopleWebFeatureFlags = Readonly<{
  people_overview: boolean;
  people_member_brief: boolean;
  outlook_calendar: boolean;
  people_capacity: boolean;
  leave_projection: boolean;
  attendance_correction_workflow: boolean;
  payroll_handoff: boolean;
  payroll_close_precheck: boolean;
  payroll_adjustment_workspace: boolean;
  payroll_rule_publish: boolean;
  payroll_statement_delivery: boolean;
  pay_rules_workspace: boolean;
}>;

export const PEOPLE_WEB_FEATURE_DEFAULTS: PeopleWebFeatureFlags = Object.freeze({
  people_overview: false,
  people_member_brief: false,
  outlook_calendar: false,
  people_capacity: false,
  leave_projection: false,
  attendance_correction_workflow: false,
  payroll_handoff: false,
  payroll_close_precheck: false,
  payroll_adjustment_workspace: false,
  payroll_rule_publish: false,
  payroll_statement_delivery: false,
  pay_rules_workspace: false,
});

declare global {
  interface Window {
    __LAWOS_PEOPLE_FEATURE_FLAGS__?: Record<string, unknown>;
  }
}

function flagValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

export function resolvePeopleWebFeatureFlags(input: Record<string, unknown> = {}): PeopleWebFeatureFlags {
  return Object.freeze({
    people_overview: flagValue(input.people_overview),
    people_member_brief: flagValue(input.people_member_brief),
    outlook_calendar: flagValue(input.outlook_calendar),
    people_capacity: flagValue(input.people_capacity),
    leave_projection: flagValue(input.leave_projection),
    attendance_correction_workflow: flagValue(input.attendance_correction_workflow),
    payroll_handoff: flagValue(input.payroll_handoff),
    payroll_close_precheck: flagValue(input.payroll_close_precheck),
    payroll_adjustment_workspace: flagValue(input.payroll_adjustment_workspace),
    payroll_rule_publish: flagValue(input.payroll_rule_publish),
    payroll_statement_delivery: flagValue(input.payroll_statement_delivery),
    pay_rules_workspace: flagValue(input.pay_rules_workspace),
  });
}

export function readPeopleWebFeatureFlags(source: typeof globalThis = globalThis): PeopleWebFeatureFlags {
  const windowLike = (source as typeof globalThis & { window?: Window }).window;
  const runtimeFlags = windowLike?.__LAWOS_PEOPLE_FEATURE_FLAGS__
    ?? (source as typeof globalThis & { __LAWOS_PEOPLE_FEATURE_FLAGS__?: Record<string, unknown> }).__LAWOS_PEOPLE_FEATURE_FLAGS__
    ?? {};
  const buildEnvironment = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {};
  const buildFlags = {
    people_overview: buildEnvironment.VITE_LAWOS_PEOPLE_OVERVIEW,
    people_member_brief: buildEnvironment.VITE_LAWOS_PEOPLE_MEMBER_BRIEF,
    outlook_calendar: buildEnvironment.VITE_LAWOS_OUTLOOK_CALENDAR,
    people_capacity: buildEnvironment.VITE_LAWOS_PEOPLE_CAPACITY,
    leave_projection: buildEnvironment.VITE_LAWOS_LEAVE_PROJECTION,
    attendance_correction_workflow: buildEnvironment.VITE_LAWOS_ATTENDANCE_CORRECTION_WORKFLOW,
    payroll_handoff: buildEnvironment.VITE_LAWOS_PAYROLL_HANDOFF,
    payroll_close_precheck: buildEnvironment.VITE_LAWOS_PAYROLL_CLOSE_PRECHECK,
    payroll_adjustment_workspace: buildEnvironment.VITE_LAWOS_PAYROLL_ADJUSTMENT_WORKSPACE,
    payroll_rule_publish: buildEnvironment.VITE_LAWOS_PAYROLL_RULE_PUBLISH,
    payroll_statement_delivery: buildEnvironment.VITE_LAWOS_PAYROLL_STATEMENT_DELIVERY,
    pay_rules_workspace: buildEnvironment.VITE_LAWOS_PAY_RULES_WORKSPACE,
  };
  return resolvePeopleWebFeatureFlags({ ...buildFlags, ...runtimeFlags });
}

export function peopleDefaultSection(flags: PeopleWebFeatureFlags): "people-overview" | "people-members" {
  return flags.people_overview ? "people-overview" : "people-members";
}

export function peopleOverviewMode(flags: PeopleWebFeatureFlags): "operations_dashboard" | "member_roster" {
  return flags.people_overview ? "operations_dashboard" : "member_roster";
}

export function peopleMemberBriefSources(flags: PeopleWebFeatureFlags) {
  return Object.freeze({
    matter: flags.people_member_brief,
    outlook: flags.people_member_brief && flags.outlook_calendar,
    capacity: flags.people_member_brief && flags.people_capacity,
  });
}
