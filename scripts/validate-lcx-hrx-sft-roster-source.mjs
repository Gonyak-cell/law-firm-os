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

assert.equal(HRX_MEMBER_ROSTER_SOURCE_REF, "hrx-member-roster-source-of-truth");
assert.equal(rosterJson.schema_version, "law-firm-os.hrx-member-roster-source-of-truth.v0.1");
assert.equal(rosterJson.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
assert.equal(HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
assert.ok(HRX_MEMBER_ROSTER_SOURCE_PATH.endsWith(rosterPath), `registry must resolve repo roster path, got ${HRX_MEMBER_ROSTER_SOURCE_PATH}`);
assert.equal(rosterRows.length, 9);
assert.ok(rosterRows.every((member) => member.source_ref === HRX_MEMBER_ROSTER_SOURCE_REF));

assert.deepEqual(
  ["박서영", "조우상", "김양태"].map((name) => membersByName.get(name)?.organization_group),
  ["PETRA BRIDGE", "PETRA BRIDGE", "PETRA BRIDGE"]
);
assert.deepEqual(
  ["박병준", "조성민", "임영훈", "서지원"].map((name) => membersByName.get(name)?.organization_group),
  ["AMIC", "AMIC", "AMIC", "AMIC"]
);
assert.deepEqual(
  ["윤태리", "이예진"].map((name) => membersByName.get(name)?.organization_group),
  ["Staff", "Staff"]
);

const kimYangTae = membersByName.get("김양태");
assert.equal(kimYangTae?.title, "대표이사");
assert.equal(kimYangTae?.affiliation, "PETRA BRIDGE PARTNERS");
assert.equal(kimYangTae?.department, "Finance");
assert.equal(kimYangTae?.organization_group, "PETRA BRIDGE");

for (const marker of [
  "repoRosterPath",
  "memberRosterPublicRef",
  "affiliation",
  "department",
  "organization_group"
]) {
  assert.ok(registry.includes(marker), `registry missing ${marker}`);
}

for (const marker of [
  "memberRosterForEmployee",
  "employeeRosterReadFields",
  "member?.affiliation",
  "member?.organization_group",
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

assert.ok(peopleHome.includes("PeopleWorkforceDirectory"), "PeopleHome must mount roster-backed workforce directory");
assert.equal(taskLedger.claim_boundary.roster_source_of_truth_preserved, true);

console.log(JSON.stringify({
  verdict: "PASS",
  source_ref: HRX_MEMBER_ROSTER_SOURCE_REF,
  roster_path: HRX_MEMBER_ROSTER_SOURCE_PATH,
  roster_count: rosterRows.length,
  organization_groups: {
    AMIC: rosterRows.filter((member) => member.organization_group === "AMIC").length,
    "PETRA BRIDGE": rosterRows.filter((member) => member.organization_group === "PETRA BRIDGE").length,
    Staff: rosterRows.filter((member) => member.organization_group === "Staff").length
  },
  kim_yang_tae: {
    title: kimYangTae?.title,
    affiliation: kimYangTae?.affiliation,
    department: kimYangTae?.department,
    organization_group: kimYangTae?.organization_group
  }
}, null, 2));
