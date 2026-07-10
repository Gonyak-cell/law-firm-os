import rosterSource from "../../../../docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";

type HrxRecord = Record<string, unknown>;

export const HRX_LOCAL_ROSTER_SOURCE_REF = "hrx-member-roster-source-of-truth";

function recordField(value: unknown): HrxRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as HrxRecord : null;
}

function stringField(record: unknown, key: string): string {
  const value = recordField(record)?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function textFrom(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function localRosterMembers(): HrxRecord[] {
  return Array.isArray((rosterSource as HrxRecord).members)
    ? ((rosterSource as HrxRecord).members as unknown[]).filter((item): item is HrxRecord => Boolean(recordField(item)))
    : [];
}

function orgUnitIdFor(member: HrxRecord): string {
  return stringField(member, "org_unit_id") || `org_${(stringField(member, "department") || "team").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function publicRosterEmployee(member: HrxRecord): HrxRecord {
  return {
    tenant_id: stringField(rosterSource, "tenant_id"),
    employee_id: stringField(member, "employee_id"),
    user_id: stringField(member, "user_id"),
    display_name: stringField(member, "display_name"),
    legal_name: stringField(member, "legal_name") || stringField(member, "display_name"),
    work_email: stringField(member, "work_email"),
    status: stringField(member, "status") || "active",
    title: stringField(member, "title") || "구성원",
    employment_type: stringField(member, "employment_type") || "full_time",
    affiliation: stringField(member, "affiliation") || stringField(member, "organization_group") || "AMIC Law",
    department: stringField(member, "department") || "Staff",
    organization_group: stringField(member, "organization_group") || stringField(member, "affiliation") || stringField(member, "department") || "AMIC Law",
    org_unit_id: orgUnitIdFor(member),
    country: stringField(member, "country") || "대한민국",
    professional_profile: recordField(member.professional_profile),
    source_ref: HRX_LOCAL_ROSTER_SOURCE_REF
  };
}

export function localHrxRosterEmployees(): HrxRecord[] {
  return localRosterMembers().map(publicRosterEmployee);
}

export function localHrxRosterOrgChart(): {
  org_units: HrxRecord[];
  employees: HrxRecord[];
  reporting_lines: HrxRecord[];
  change_events: HrxRecord[];
  claim_boundary: HrxRecord;
} {
  const employees = localHrxRosterEmployees();
  const orgUnitMap = new Map<string, HrxRecord>();
  for (const employee of employees) {
    const orgUnitId = stringField(employee, "org_unit_id");
    const label = stringField(employee, "organization_group") || stringField(employee, "affiliation") || stringField(employee, "department");
    const existing = orgUnitMap.get(orgUnitId);
    orgUnitMap.set(orgUnitId, {
      org_unit_id: orgUnitId,
      label,
      department: stringField(employee, "department") || label,
      organization_group: label,
      parent_org_unit_id: null,
      member_count: Number(existing?.member_count ?? 0) + 1,
      source_ref: HRX_LOCAL_ROSTER_SOURCE_REF
    });
  }
  return {
    org_units: [...orgUnitMap.values()],
    employees: employees.map((employee) => ({
      ...employee,
      org_unit_label: stringField(employee, "organization_group") || stringField(employee, "department"),
      manager_employee_id: null,
      manager_display_name: "",
      direct_report_count: 0
    })),
    reporting_lines: [],
    change_events: [],
    claim_boundary: { source_ref: HRX_LOCAL_ROSTER_SOURCE_REF, roster_available: true }
  };
}

function sessionRecordValues(records: unknown[], keys: string[]): string[] {
  const values: string[] = [];
  for (const record of records) {
    const source = recordField(record);
    if (!source) continue;
    for (const key of keys) {
      const value = textFrom(source[key]);
      if (value) values.push(value);
    }
  }
  return values;
}

export function localHrxRosterMemberForSession(records: unknown[]): HrxRecord | null {
  const identifiers = new Set(
    sessionRecordValues(records, ["user_id", "actor_ref", "email", "auth_subject", "work_email", "display_name", "name", "user_name"])
      .map((value) => value.toLowerCase())
  );
  if (identifiers.size === 0) return null;
  return localRosterMembers().find((member) => {
    return [stringField(member, "user_id"), stringField(member, "work_email"), stringField(member, "display_name")]
      .map((value) => value.toLowerCase())
      .some((value) => value && identifiers.has(value));
  }) ?? null;
}

export function localHrxRosterDisplayNameForSession(records: unknown[]): string {
  return stringField(localHrxRosterMemberForSession(records), "display_name");
}

export function localHrxRosterTitleForSession(records: unknown[]): string {
  return stringField(localHrxRosterMemberForSession(records), "title");
}

export function localHrxRosterProfessionalLabelForSession(records: unknown[]): string {
  const member = localHrxRosterMemberForSession(records);
  const profile = recordField(member?.professional_profile);
  const roleText = [
    stringField(member, "title"),
    stringField(profile, "profile_kind"),
    ...(Array.isArray(profile?.public_role_labels) ? profile.public_role_labels.map(textFrom) : []),
    ...(Array.isArray(profile?.qualifications) ? profile.qualifications.map(textFrom) : [])
  ].join(" ");
  if (/변호사|attorney|lawyer/i.test(roleText)) return "변호사";
  if (/회계사|공인회계사|\bcpa\b|accountant/i.test(roleText)) return "회계사";
  return stringField(member, "title");
}
