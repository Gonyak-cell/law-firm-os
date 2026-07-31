import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePeopleMemberDualRead,
  selectCurrentPeopleAttorneyAssignments,
} from "../src/people-member-cutover.js";

const TENANT = "tenant-people";
const AS_OF = "2026-07-30T09:00:00.000Z";

function member(id, overrides = {}) {
  return {
    tenant_id: TENANT,
    matter_id: `matter-${id}`,
    member_id: `member-${id}`,
    employee_id: "emp-1",
    user_id: `user-${id}`,
    role: "responsible_attorney",
    status: "active",
    valid_from: "2026-07-01T00:00:00.000Z",
    valid_to: null,
    identity_resolution_state: "resolved",
    ...overrides,
  };
}

test("People member reader separates current, future, ended, and unresolved assignments", () => {
  const current = member("current");
  const secondCurrent = member("second-current", { matter_id: "matter-current" });
  const selected = selectCurrentPeopleAttorneyAssignments({
    tenant_id: TENANT,
    as_of: AS_OF,
    members: [
      current,
      secondCurrent,
      member("future", { valid_from: "2026-08-01T00:00:00.000Z" }),
      member("ended", { valid_to: "2026-07-29T23:59:59.000Z" }),
      member("removed", { status: "removed" }),
      member("unresolved", { employee_id: null, identity_resolution_state: "unresolved" }),
    ],
  });

  assert.deepEqual(selected.map(({ member_id }) => member_id), ["member-current", "member-second-current"]);
});

test("verified legacy rows dual-read while unresolved legacy rows stay excluded", () => {
  const legacy = member("legacy", {
    valid_from: null,
    identity_resolution_state: null,
  });
  assert.equal(selectCurrentPeopleAttorneyAssignments({
    tenant_id: TENANT,
    as_of: AS_OF,
    members: [legacy],
  }).length, 0);
  assert.equal(selectCurrentPeopleAttorneyAssignments({
    tenant_id: TENANT,
    as_of: AS_OF,
    members: [legacy],
    verified_legacy_member_ids: ["member-legacy"],
  }).length, 1);
});

test("dual-read parity reports mismatches and reaches zero for verified backfill", () => {
  const rows = [member("current")];
  const parity = comparePeopleMemberDualRead({
    tenant_id: TENANT,
    as_of: AS_OF,
    legacy_members: rows,
    new_members: rows,
  });

  assert.deepEqual(parity, {
    legacy_count: 1,
    new_count: 1,
    mismatch_count: 0,
    mismatch_member_ids: [],
  });
});
