#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH,
  HRX_MEMBER_ROSTER_SOURCE_PATH,
  HRX_MEMBER_ROSTER_SOURCE_REF,
  listHrxMemberRosterRows
} from "../apps/api/src/hrx-member-roster-registry.js";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const rosterPath = "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";
const registryPath = "apps/api/src/hrx-member-roster-registry.js";
const runtimePath = "apps/api/src/hrx-runtime-context.js";
const workforcePath = "apps/web/src/people/employees/PeopleWorkforceDirectory.tsx";
const peopleHomePath = "apps/web/src/people/PeopleHome.tsx";
const taskLedgerPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-task-ledger.json";

const rosterJson = JSON.parse(read(rosterPath));
const registry = read(registryPath);
const runtime = read(runtimePath);
const workforce = read(workforcePath);
const peopleHome = read(peopleHomePath);
const taskLedger = JSON.parse(read(taskLedgerPath));
const rosterRows = listHrxMemberRosterRows();
const membersByName = new Map(rosterRows.map((member) => [member.display_name, member]));
const membersByEmployeeId = new Map(rosterRows.map((member) => [member.employee_id, member]));

assert.equal(HRX_MEMBER_ROSTER_SOURCE_REF, "hrx-member-roster-source-of-truth");
assert.equal(rosterJson.schema_version, "law-firm-os.hrx-member-roster-source-of-truth.v0.1");
assert.equal(rosterJson.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
assert.equal(HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
assert.ok(HRX_MEMBER_ROSTER_SOURCE_PATH.endsWith(rosterPath), `registry must resolve repo roster path, got ${HRX_MEMBER_ROSTER_SOURCE_PATH}`);
assert.equal(rosterRows.length, 10);
assert.ok(rosterRows.every((member) => member.source_ref === HRX_MEMBER_ROSTER_SOURCE_REF));
for (const member of rosterRows) {
  if (!member.manager_employee_id) continue;
  assert.notEqual(member.manager_employee_id, member.employee_id, `${member.display_name} must not manage themself`);
  assert.ok(membersByEmployeeId.has(member.manager_employee_id), `${member.display_name} manager must reference a roster member`);
  const visited = new Set([member.employee_id]);
  let managerEmployeeId = member.manager_employee_id;
  while (managerEmployeeId) {
    assert.equal(visited.has(managerEmployeeId), false, `${member.display_name} reporting line must be acyclic`);
    visited.add(managerEmployeeId);
    managerEmployeeId = membersByEmployeeId.get(managerEmployeeId)?.manager_employee_id ?? null;
  }
}
assert.equal(membersByName.get("조우상")?.manager_employee_id, membersByName.get("김양태")?.employee_id);
assert.equal(membersByName.get("박서영")?.manager_employee_id, membersByName.get("김양태")?.employee_id);
assert.equal(membersByName.get("이예진")?.manager_employee_id, membersByName.get("윤태리")?.employee_id);

assert.deepEqual(
  ["박서영", "조우상", "김양태"].map((name) => membersByName.get(name)?.organization_group),
  ["PETRA BRIDGE PARTNERS", "PETRA BRIDGE PARTNERS", "PETRA BRIDGE PARTNERS"]
);
assert.deepEqual(
  ["박병준", "조성민", "임영훈", "서지원", "한제희"].map((name) => membersByName.get(name)?.organization_group),
  ["AMIC Law", "AMIC Law", "AMIC Law", "AMIC Law", "AMIC Law"]
);
assert.deepEqual(
  ["윤태리", "이예진"].map((name) => membersByName.get(name)?.organization_group),
  ["Staff", "Staff"]
);

const kimYangTae = membersByName.get("김양태");
assert.equal(kimYangTae?.title, "대표이사");
assert.equal(kimYangTae?.affiliation, "PETRA BRIDGE PARTNERS");
assert.equal(kimYangTae?.department, "Finance");
assert.equal(kimYangTae?.organization_group, "PETRA BRIDGE PARTNERS");
assert.equal(kimYangTae?.professional_profile?.profile_kind, "cpa");
assert.equal(kimYangTae?.professional_profile?.qualifications?.includes("대한민국 공인회계사"), true);
assert.equal(kimYangTae?.professional_profile?.qualifications?.includes("대한민국 변호사"), false);
assert.equal(membersByName.get("조우상")?.professional_profile?.profile_kind, "deal_advisor");
assert.deepEqual(
  ["박병준", "임영훈", "서지원", "조성민", "한제희"].map((name) => membersByName.get(name)?.professional_profile?.profile_kind),
  ["attorney", "attorney", "attorney", "attorney", "attorney"]
);
assert.equal(membersByName.get("한제희")?.work_email, "jh731@amic.kr");
assert.equal(membersByName.get("한제희")?.title, "고문변호사");
assert.equal(membersByName.get("한제희")?.start_date, "2026-07-06");
assert.equal(membersByName.get("한제희")?.professional_profile?.qualifications?.includes("대한민국 변호사"), true);
assert.equal(membersByName.get("한제희")?.professional_profile?.qualifications?.includes("대한민국 공인회계사"), true);

for (const marker of [
  "repoRosterPath",
  "memberRosterPublicRef",
  "affiliation",
  "department",
  "organization_group",
  "manager_employee_id",
  "professional_profile"
]) {
  assert.ok(registry.includes(marker), `registry missing ${marker}`);
}

for (const marker of [
  "memberRosterForEmployee",
  "employeeRosterReadFields",
  "member?.affiliation",
  "member?.organization_group",
  "member?.professional_profile",
  "source_ref: member?.source_ref"
]) {
  assert.ok(runtime.includes(marker), `runtime roster mapping missing ${marker}`);
}

for (const marker of [
  "fetchHrxEmployees",
  "stringField(employee, \"department\")",
  "affiliationLabel(employee)",
  "stringField(employee, \"organization_group\")",
  "stringField(employee, \"work_email\")"
]) {
  assert.ok(workforce.includes(marker), `workforce UI must prefer roster/API field: ${marker}`);
}

for (const marker of [
  ">소속</HeaderCell>",
  "hr-roster-col-affiliation",
  "hr-roster-organization-row",
  "rowsByOrganization"
]) {
  assert.equal(workforce.includes(marker), false, `main workforce roster must not render organization UI: ${marker}`);
}

assert.ok(peopleHome.includes("PeopleWorkforceDirectory"), "PeopleHome must mount roster-backed workforce directory");
assert.equal(taskLedger.claim_boundary.roster_source_of_truth_preserved, true);

console.log(JSON.stringify({
  verdict: "PASS",
  source_ref: HRX_MEMBER_ROSTER_SOURCE_REF,
  roster_path: HRX_MEMBER_ROSTER_SOURCE_PATH,
  roster_count: rosterRows.length,
  organization_groups: {
    "AMIC Law": rosterRows.filter((member) => member.organization_group === "AMIC Law").length,
    "PETRA BRIDGE PARTNERS": rosterRows.filter((member) => member.organization_group === "PETRA BRIDGE PARTNERS").length,
    Staff: rosterRows.filter((member) => member.organization_group === "Staff").length
  },
  kim_yang_tae: {
    title: kimYangTae?.title,
    affiliation: kimYangTae?.affiliation,
    department: kimYangTae?.department,
    organization_group: kimYangTae?.organization_group
  }
}, null, 2));
