import assert from "node:assert/strict";
import test from "node:test";
import { backfillPeopleMatterTasks } from "../src/people-task-migration.js";

const TENANT = "tenant-people";

function legacy(id, overrides = {}) {
  return {
    tenant_id: TENANT,
    matter_id: "matter-1",
    task_id: `task-${id}`,
    title: "서면 제출",
    status: "todo",
    created_by: "user-creator",
    assigned_to: `user-${id}`,
    due_at: "2026-08-01T09:00:00.000Z",
    ...overrides,
  };
}

test("task migration copies only an exact tenant User and never invents time data", () => {
  const input = {
    tenant_id: TENANT,
    tasks: [legacy("known"), legacy("unknown")],
    users: [{ tenant_id: TENANT, user_id: "user-known" }],
    members: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: "member-known",
      employee_id: "emp-known",
      user_id: "user-known",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-known",
      employee_id: "emp-known",
      user_id: "user-known",
      purpose: "login_mapping",
    }],
  };
  const first = backfillPeopleMatterTasks(input);
  const second = backfillPeopleMatterTasks({ ...input, tasks: first.rows });

  assert.deepEqual(second, first);
  assert.equal(first.rows[0].assigned_to_user_id, "user-known");
  assert.equal(first.rows[0].starts_at, null);
  assert.equal(first.rows[0].ends_at, null);
  assert.equal(first.rows[0].estimated_minutes, null);
  assert.equal(first.rows[0].due_at, "2026-08-01T09:00:00.000Z");
  assert.match(first.rows[0].source_record_hash, /^sha256:/);
  assert.equal(first.rows[1].assigned_to_user_id, null);
  assert.deepEqual(first.unresolved.map(({ task_id }) => task_id), ["task-unknown"]);
  assert.equal(first.report.time_inference_count, 0);
});

test("cross-tenant and ambiguous User records are never copied", () => {
  const result = backfillPeopleMatterTasks({
    tenant_id: TENANT,
    tasks: [legacy("same")],
    users: [
      { tenant_id: "tenant-other", user_id: "user-same" },
      { tenant_id: TENANT, user_id: "user-same" },
      { tenant_id: TENANT, user_id: "user-same" },
    ],
  });
  assert.equal(result.rows[0].assigned_to_user_id, null);
  assert.equal(result.unresolved[0].reason, "user_identity_ambiguous");
});

test("task migration revalidates pre-populated User IDs and quarantines invalid assignment authority", () => {
  const users = ["user-valid", "user-no-team", "user-revoked", "emp-valid"].map((user_id) => ({
    tenant_id: TENANT,
    user_id,
  })).concat({
    tenant_id: TENANT,
    user_id: "user-inactive",
    status: "inactive",
  });
  const result = backfillPeopleMatterTasks({
    tenant_id: TENANT,
    tasks: [
      legacy("valid", { assigned_to: null, assigned_to_user_id: "user-valid" }),
      legacy("missing", { assigned_to: null, assigned_to_user_id: "user-missing" }),
      legacy("employee", { assigned_to: null, assigned_to_user_id: "emp-valid" }),
      legacy("no-team", { assigned_to: null, assigned_to_user_id: "user-no-team" }),
      legacy("revoked", { assigned_to: null, assigned_to_user_id: "user-revoked" }),
      legacy("dangling", { assigned_to: null, assigned_to_user_id: "user-dangling" }),
      legacy("inactive", { assigned_to: null, assigned_to_user_id: "user-inactive" }),
    ],
    users,
    members: ["valid", "dangling", "inactive"].map((identity) => ({
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: `member-${identity}`,
      employee_id: `emp-${identity}`,
      user_id: `user-${identity}`,
      role: identity === "valid" ? "responsible_attorney" : "associate",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    })),
    employee_user_links: [
      { tenant_id: TENANT, link_id: "link-valid", employee_id: "emp-valid", user_id: "user-valid", purpose: "login_mapping" },
      { tenant_id: TENANT, link_id: "link-no-team", employee_id: "emp-no-team", user_id: "user-no-team", purpose: "login_mapping" },
      { tenant_id: TENANT, link_id: "link-revoked", employee_id: "emp-revoked", user_id: "user-revoked", purpose: "login_mapping", status: "revoked" },
      { tenant_id: TENANT, link_id: "link-dangling", employee_id: "emp-dangling", user_id: "user-dangling", purpose: "login_mapping" },
      { tenant_id: TENANT, link_id: "link-inactive", employee_id: "emp-inactive", user_id: "user-inactive", purpose: "login_mapping" },
    ],
  });
  assert.equal(result.rows.find(({ task_id }) => task_id === "task-valid").assigned_to_user_id, "user-valid");
  assert.deepEqual(
    Object.fromEntries(result.unresolved.map(({ task_id, reason }) => [task_id, reason])),
    {
      "task-employee": "employee_identifier_in_user_field",
      "task-dangling": "user_identity_missing",
      "task-inactive": "user_identity_inactive",
      "task-missing": "user_identity_missing",
      "task-no-team": "matter_member_missing_or_inactive",
      "task-revoked": "unresolved_missing",
    },
  );
  assert.equal(result.report.resolved_count, 1);
  assert.equal(result.report.unresolved_count, 6);
});
