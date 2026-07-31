import assert from "node:assert/strict";
import test from "node:test";
import { projectAuthorizedPeopleOperations } from "../../src/routes/hrx/people-operations-authz.js";

const TENANT = "tenant-people";
const VIEWER = "emp-viewer";
const TARGET = "emp-target";

function requestContext(overrides = {}) {
  return {
    tenant_id: TENANT,
    actor_id: "user-viewer",
    actor_employee_id: VIEWER,
    hrx_scopes: ["hrx.employee.read"],
    ...overrides,
  };
}

function permissionContext({ denyMatterId = null } = {}) {
  return {
    principal: {
      user_id: "user-viewer",
      tenant_id: TENANT,
      role_ids: ["attorney"],
    },
    rules: [{ id: "allow-matter-read", effect: "allow", action: "matter:read" }],
    object_acl: denyMatterId ? [{
      id: "deny-ethical-wall",
      effect: "deny",
      principal_id: "user-viewer",
      action: "matter:read",
      resource_id: denyMatterId,
    }] : [],
  };
}

function assignedMatterInput() {
  return {
    request_context: requestContext(),
    permission_context: permissionContext({ denyMatterId: "matter-secret" }),
    target: { tenant_id: TENANT, employee_id: TARGET },
    assignments: [
      { tenant_id: TENANT, employee_id: TARGET, matter_id: "matter-visible", role: "responsible_attorney" },
      { tenant_id: TENANT, employee_id: TARGET, matter_id: "matter-secret", role: "responsible_attorney" },
    ],
    matters: [
      { tenant_id: TENANT, matter_id: "matter-visible", matter_code: "M-001", title: "Visible Matter" },
      { tenant_id: TENANT, matter_id: "matter-secret", matter_code: "M-002", title: "Secret Matter" },
    ],
  };
}

test("Matter permission is applied before People rows and totals are computed", () => {
  const projection = projectAuthorizedPeopleOperations(assignedMatterInput());
  const serialized = JSON.stringify(projection);

  assert.equal(projection.assigned_matter_count, 1);
  assert.deepEqual(projection.assigned_matters.map(({ matter_id }) => matter_id), ["matter-visible"]);
  assert.equal(serialized.includes("matter-secret"), false);
  assert.equal(serialized.includes("Secret Matter"), false);
  assert.equal(Object.hasOwn(projection, "omitted_count"), false);
  assert.equal(projection.existence_hidden, true);
});

test("an all-denied result is indistinguishable from no assignments", () => {
  const denied = projectAuthorizedPeopleOperations({
    ...assignedMatterInput(),
    assignments: [assignedMatterInput().assignments[1]],
    matters: [assignedMatterInput().matters[1]],
  });
  const empty = projectAuthorizedPeopleOperations({
    ...assignedMatterInput(),
    assignments: [],
    matters: [],
  });

  assert.deepEqual(
    {
      assigned_matter_count: denied.assigned_matter_count,
      assigned_matters: denied.assigned_matters,
      empty_state: denied.empty_state,
    },
    {
      assigned_matter_count: empty.assigned_matter_count,
      assigned_matters: empty.assigned_matters,
      empty_state: empty.empty_state,
    },
  );
});

test("cross-tenant target fails closed with a safe 403 code", () => {
  assert.throws(
    () => projectAuthorizedPeopleOperations({
      ...assignedMatterInput(),
      target: { tenant_id: "tenant-other", employee_id: TARGET },
    }),
    (error) => error.status === 403
      && error.safe_error_code === "PEOPLE_CROSS_TENANT_DENIED"
      && !JSON.stringify(error).includes("tenant-other"),
  );
});

test("another member's meeting title, leave reason, and payroll amounts are redacted", () => {
  const projection = projectAuthorizedPeopleOperations({
    ...assignedMatterInput(),
    meetings: [{
      tenant_id: TENANT,
      employee_id: TARGET,
      meeting_id: "meeting-1",
      title: "Acquisition strategy",
      body_preview: "Confidential details",
      starts_at: "2026-07-30T10:00:00.000Z",
    }],
    leave_requests: [{
      tenant_id: TENANT,
      employee_id: TARGET,
      leave_request_id: "leave-1",
      reason: "private medical reason",
      starts_on: "2026-08-01",
    }],
    payroll_records: [{
      tenant_id: TENANT,
      employee_id: TARGET,
      payroll_record_id: "payroll-1",
      gross_pay: 9000000,
      net_pay: 7500000,
      bank_account_ref: "bank-secret",
    }],
  });
  const serialized = JSON.stringify(projection);

  assert.equal(projection.meetings[0].title, "일정 있음");
  assert.equal(projection.leave_requests[0].reason, null);
  assert.equal(projection.payroll_records[0].gross_pay, null);
  assert.equal(projection.payroll_records[0].net_pay, null);
  assert.equal(serialized.includes("Acquisition strategy"), false);
  assert.equal(serialized.includes("private medical reason"), false);
  assert.equal(serialized.includes("9000000"), false);
  assert.equal(serialized.includes("bank-secret"), false);
});
