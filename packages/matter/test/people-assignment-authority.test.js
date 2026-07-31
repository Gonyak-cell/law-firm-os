import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePeopleAssignmentAuthority,
  selectAuthoritativeAttorneyAssignments,
} from "../src/people-assignment-authority.js";

const TENANT = "tenant-people";

function member(overrides = {}) {
  return {
    tenant_id: TENANT,
    matter_id: "matter-1",
    member_id: "member-1",
    employee_id: "emp-1",
    user_id: "user-1",
    role: "responsible_attorney",
    status: "active",
    ...overrides,
  };
}

test("only active responsible_attorney with an explicit employee_id is People authority", () => {
  const authoritative = resolvePeopleAssignmentAuthority({ member: member() });
  assert.equal(authoritative.state, "authoritative");
  assert.equal(authoritative.employee_id, "emp-1");

  for (const nonAuthority of [
    member({ status: "removed" }),
    member({ role: "viewer" }),
    member({ employee_id: null }),
  ]) {
    assert.notEqual(resolvePeopleAssignmentAuthority({ member: nonAuthority }).state, "authoritative");
  }
});

test("free text, Matter read access, and task assignment never create attorney authority", () => {
  const selected = selectAuthoritativeAttorneyAssignments({
    tenant_id: TENANT,
    members: [],
    matters: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      responsible_lawyer: "홍길동 변호사",
      actor_can_view: true,
    }],
    tasks: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      assigned_to_user_id: "user-1",
    }],
  });
  assert.deepEqual(selected, []);
});

test("a user_id-only legacy row is only a backfill candidate when one active link exists", () => {
  const legacy = member({ employee_id: null });
  const oneLink = resolvePeopleAssignmentAuthority({
    member: legacy,
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-1",
      user_id: "user-1",
      employee_id: "emp-1",
    }],
  });
  const noLink = resolvePeopleAssignmentAuthority({
    member: legacy,
    employee_user_links: [],
  });
  const duplicate = resolvePeopleAssignmentAuthority({
    member: legacy,
    employee_user_links: [
      { tenant_id: TENANT, link_id: "link-1", user_id: "user-1", employee_id: "emp-1" },
      { tenant_id: TENANT, link_id: "link-2", user_id: "user-1", employee_id: "emp-2" },
    ],
  });

  assert.deepEqual(oneLink, {
    state: "backfill_candidate",
    employee_id: "emp-1",
    reason: "unique_active_employee_user_link",
  });
  assert.equal(noLink.state, "unresolved");
  assert.equal(duplicate.state, "unresolved");
  assert.deepEqual(selectAuthoritativeAttorneyAssignments({
    tenant_id: TENANT,
    members: [legacy],
    employee_user_links: oneLink,
  }), []);
});
