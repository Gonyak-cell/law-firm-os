import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagedRosterPath = join(__dirname, "hrx-member-roster-source-of-truth.json");
const repoRosterPath = resolve(
  __dirname,
  "../../../docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
);

export const HRX_MEMBER_ROSTER_SOURCE_REF = "hrx-member-roster-source-of-truth";
export const HRX_MEMBER_ROSTER_SOURCE_PATH = existsSync(packagedRosterPath) ? packagedRosterPath : repoRosterPath;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH = deepFreeze(
  JSON.parse(readFileSync(HRX_MEMBER_ROSTER_SOURCE_PATH, "utf8")),
);
export const HRX_MEMBER_ROSTER_TENANT_ID = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH.tenant_id;

function stringField(record, key) {
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function memberRosterPublicRef(member) {
  return Object.freeze({
    user_id: stringField(member, "user_id"),
    employee_id: stringField(member, "employee_id"),
    display_name: stringField(member, "display_name"),
    legal_name: stringField(member, "legal_name"),
    work_email: stringField(member, "work_email"),
    title: stringField(member, "title"),
    employment_type: stringField(member, "employment_type") || "full_time",
    status: stringField(member, "status") || "active",
    profile_status: stringField(member, "profile_status") || "active",
    affiliation: stringField(member, "affiliation"),
    department: stringField(member, "department"),
    organization_group: stringField(member, "organization_group"),
    org_unit_id: stringField(member, "org_unit_id"),
    country: stringField(member, "country") || "대한민국",
    source_ref: HRX_MEMBER_ROSTER_SOURCE_REF,
  });
}

export function listHrxMemberRosterRows(seed = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH) {
  return Object.freeze((seed.members ?? []).map(memberRosterPublicRef));
}

export function findHrxMemberRosterByUserId(userId, seed = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH) {
  const normalized = String(userId ?? "").trim();
  return listHrxMemberRosterRows(seed).find((member) => member.user_id === normalized) ?? null;
}

export function findHrxMemberRosterByEmployeeId(employeeId, seed = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH) {
  const normalized = String(employeeId ?? "").trim();
  return listHrxMemberRosterRows(seed).find((member) => member.employee_id === normalized) ?? null;
}
