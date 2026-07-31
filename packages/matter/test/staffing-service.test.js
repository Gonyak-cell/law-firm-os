import assert from "node:assert/strict";
import test from "node:test";
import {
  addPeopleVisibleMatterTeamMember,
} from "../src/staffing-service.js";
import { createMatterRepository } from "../src/repository.js";

const TENANT = "tenant-people";
const MATTER = {
  tenant_id: TENANT,
  matter_id: "matter-1",
};
const EMPLOYEES = [{
  tenant_id: TENANT,
  employee_id: "emp-1",
  user_id: "user-1",
  status: "active",
  availability: "available",
}];
const LOGIN_MAPPINGS = [{
  tenant_id: TENANT,
  link_id: "link-1",
  employee_id: "emp-1",
  user_id: "user-1",
  purpose: "login_mapping",
}];
const USERS = [{
  tenant_id: TENANT,
  user_id: "user-1",
  status: "active",
}];

function member(overrides = {}) {
  return {
    member_id: "member-1",
    tenant_id: TENANT,
    matter_id: "matter-1",
    employee_id: "emp-1",
    user_id: "user-1",
    role: "responsible_attorney",
    status: "active",
    valid_from: "2026-07-01T09:00:00.000Z",
    ...overrides,
  };
}

test("People-visible responsible attorney writer requires employee identity and valid_from", () => {
  const repository = createMatterRepository();
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    repository,
    employeeDirectory: EMPLOYEES,
    employeeUserLinkDirectory: LOGIN_MAPPINGS,
    userDirectory: USERS,
    as_of: "2026-07-30T00:00:00.000Z",
    matter: MATTER,
    member: member({ employee_id: null }),
    actor_id: "actor-1",
  }), /employee_id/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    repository,
    employeeDirectory: EMPLOYEES,
    employeeUserLinkDirectory: LOGIN_MAPPINGS,
    userDirectory: USERS,
    as_of: "2026-07-30T00:00:00.000Z",
    matter: MATTER,
    member: member({ valid_from: null }),
    actor_id: "actor-1",
  }), /valid_from/);

  const persisted = addPeopleVisibleMatterTeamMember({
    repository,
    employeeDirectory: EMPLOYEES,
    employeeUserLinkDirectory: LOGIN_MAPPINGS,
    userDirectory: USERS,
    matter: MATTER,
    member: member(),
    actor_id: "actor-1",
  });
  assert.equal(persisted.identity_resolution_state, "resolved");
  assert.equal(persisted.user_id, "user-1");
  assert.equal(persisted.valid_from, "2026-07-01T09:00:00.000Z");
});

test("People-visible responsible attorney writer derives one active login mapping and rejects mismatches", () => {
  const options = {
    repository: createMatterRepository(),
    employeeDirectory: EMPLOYEES,
    employeeUserLinkDirectory: LOGIN_MAPPINGS,
    userDirectory: USERS,
    as_of: "2026-07-30T00:00:00.000Z",
    matter: MATTER,
    actor_id: "actor-1",
  };
  const derived = addPeopleVisibleMatterTeamMember({
    ...options,
    member: member({ member_id: "member-derived", user_id: undefined }),
  });
  assert.equal(derived.user_id, "user-1");

  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    member: member({ member_id: "member-mismatch", user_id: "user-wrong" }),
  }), /employee_user_mismatch/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    member: member({ member_id: "member-employee-id", user_id: "emp-1" }),
  }), /employee_identifier_in_user_field/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    employeeUserLinkDirectory: [{
      ...LOGIN_MAPPINGS[0],
      status: "revoked",
    }],
    member: member({ member_id: "member-revoked" }),
  }), /unresolved_missing/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    employeeUserLinkDirectory: [{
      ...LOGIN_MAPPINGS[0],
      purpose: "directory_reference",
    }],
    member: member({ member_id: "member-wrong-link-purpose" }),
  }), /unresolved_missing/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    employeeUserLinkDirectory: [
      LOGIN_MAPPINGS[0],
      {
        ...LOGIN_MAPPINGS[0],
        link_id: "link-ambiguous",
        user_id: "user-2",
      },
    ],
    userDirectory: [...USERS, { tenant_id: TENANT, user_id: "user-2", status: "active" }],
    member: member({ member_id: "member-ambiguous" }),
  }), /unresolved_ambiguous/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    userDirectory: [],
    member: member({ member_id: "member-dangling-user" }),
  }), /user_identity_missing/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    userDirectory: [{ ...USERS[0], status: "inactive" }],
    member: member({ member_id: "member-inactive-user" }),
  }), /user_identity_inactive/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    employeeDirectory: [{ ...EMPLOYEES[0], status: "inactive" }],
    member: member({ member_id: "member-inactive-employee" }),
  }), /employee_inactive/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    member: member({
      member_id: "member-expired",
      valid_to: "2026-07-29T23:59:59.999Z",
    }),
  }), /already ended/);
  assert.throws(() => addPeopleVisibleMatterTeamMember({
    ...options,
    member: member({
      member_id: "member-overlapping",
      valid_from: "2026-07-15T00:00:00.000Z",
    }),
  }), /overlaps an existing authoritative member/);

  const scheduled = addPeopleVisibleMatterTeamMember({
    ...options,
    repository: createMatterRepository({
      seedRecords: [{
        model_type: "MatterMember",
        ...member({
          member_id: "member-current",
          valid_to: "2026-07-31T23:59:59.999Z",
          identity_resolution_state: "resolved",
        }),
      }],
    }),
    member: member({
      member_id: "member-scheduled",
      valid_from: "2026-08-01T00:00:00.000Z",
    }),
  });
  assert.equal(scheduled.valid_from, "2026-08-01T00:00:00.000Z");
});
