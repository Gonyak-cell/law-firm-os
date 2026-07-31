import assert from "node:assert/strict";
import test from "node:test";
import { createMatterActivityCalendarChannelService } from "../src/activity-calendar-channel-service.js";
import { createMatterPeopleAssignmentAuthority } from "../src/people-assignment-authority.js";
import {
  comparePeopleTaskSelectors,
  selectExplicitPeopleTasks,
} from "../src/people-task-cutover.js";
import { createMatterRepository } from "../src/repository.js";

const TENANT = "tenant-people";

test("new Matter task writer uses assigned_to_user_id and rejects legacy assignment writes", () => {
  const repository = createMatterRepository({
    seedRecords: ["user-assignee", "user-new-assignee"].map((userId, index) => ({
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: `member-${index + 1}`,
      employee_id: `emp-${index + 1}`,
      user_id: userId,
      role: index === 0 ? "responsible_attorney" : "associate",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    })),
  });
  const employeeDirectory = ["user-assignee", "user-new-assignee"].map((userId, index) => ({
    tenant_id: TENANT,
    employee_id: `emp-${index + 1}`,
    user_id: userId,
    status: "active",
  }));
  const employeeUserLinkDirectory = employeeDirectory.map((employee, index) => ({
    tenant_id: TENANT,
    link_id: `link-${index + 1}`,
    employee_id: employee.employee_id,
    user_id: employee.user_id,
    purpose: "login_mapping",
  }));
  const service = createMatterActivityCalendarChannelService({
    repository,
    peopleAssignmentAuthority: createMatterPeopleAssignmentAuthority({
      repository,
      employeeDirectory,
      employeeUserLinkDirectory,
      userDirectory: employeeDirectory.map((employee) => ({
        tenant_id: employee.tenant_id,
        user_id: employee.user_id,
        status: "active",
      })),
    }),
  });
  const input = {
    tenant_id: TENANT,
    matter_id: "matter-1",
    actor_id: "user-creator",
    activity: {
      activity_id: "task-1",
      activity_type: "task",
      title: "서면 검토",
      status: "todo",
      assigned_to_user_id: "user-assignee",
      due_at: "2026-08-01T09:00:00.000Z",
    },
  };
  const created = service.createActivity(input);
  assert.equal(created.item.assigned_to_user_id, "user-assignee");
  assert.equal(created.item.assigned_to_label, "지정됨");
  const listed = service.listActivities({
    tenant_id: TENANT,
    matter_id: "matter-1",
  })[0];
  assert.equal(listed.assigned_to_user_id, "user-assignee");
  assert.equal(listed.assigned_to_label, "지정됨");
  const patched = service.patchActivity({
    tenant_id: TENANT,
    matter_id: "matter-1",
    activity_id: "task-1",
    actor_id: "user-creator",
    occurred_at: "2026-07-30T01:00:00.000Z",
    patch: {
      status: "in_progress",
      assigned_to_user_id: "user-new-assignee",
    },
  });
  assert.equal(patched.item.status, "in_progress");
  assert.equal(patched.item.assigned_to_user_id, "user-new-assignee");
  assert.throws(() => service.createActivity({
    ...input,
    activity: {
      ...input.activity,
      activity_id: "task-legacy",
      assigned_to_user_id: null,
      assigned_to: "legacy-user",
    },
  }), /assigned_to_user_id/);
});

test("Matter task writer rejects missing, Employee-shaped, inactive-link, and non-team assignments", () => {
  const repository = createMatterRepository({
    seedRecords: ["valid", "expired", "future"].map((identity) => ({
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: `member-${identity}`,
      employee_id: `emp-${identity}`,
      user_id: `user-${identity}`,
      role: identity === "valid" ? "responsible_attorney" : "associate",
      status: "active",
      valid_from: identity === "future"
        ? "2026-08-01T00:00:00.000Z"
        : "2026-07-01T00:00:00.000Z",
      valid_to: identity === "expired" ? "2026-07-29T23:59:59.999Z" : null,
      identity_resolution_state: "resolved",
    })),
  });
  const employeeDirectory = [
    { tenant_id: TENANT, employee_id: "emp-valid", status: "active" },
    { tenant_id: TENANT, employee_id: "emp-no-team", status: "active" },
    { tenant_id: TENANT, employee_id: "emp-revoked", status: "active" },
    { tenant_id: TENANT, employee_id: "emp-dangling", status: "active" },
    { tenant_id: TENANT, employee_id: "emp-inactive", status: "inactive" },
    { tenant_id: TENANT, employee_id: "emp-wrong-purpose", status: "active" },
    { tenant_id: TENANT, employee_id: "emp-expired", status: "active" },
    { tenant_id: TENANT, employee_id: "emp-future", status: "active" },
  ];
  const links = [
    { tenant_id: TENANT, link_id: "link-valid", employee_id: "emp-valid", user_id: "user-valid", purpose: "login_mapping" },
    { tenant_id: TENANT, link_id: "link-no-team", employee_id: "emp-no-team", user_id: "user-no-team", purpose: "login_mapping" },
    { tenant_id: TENANT, link_id: "link-revoked", employee_id: "emp-revoked", user_id: "user-revoked", purpose: "login_mapping", revoked_at: "2026-07-01T00:00:00.000Z" },
    { tenant_id: TENANT, link_id: "link-dangling", employee_id: "emp-dangling", user_id: "user-dangling", purpose: "login_mapping" },
    { tenant_id: TENANT, link_id: "link-inactive", employee_id: "emp-inactive", user_id: "user-inactive", purpose: "login_mapping" },
    { tenant_id: TENANT, link_id: "link-wrong-purpose", employee_id: "emp-wrong-purpose", user_id: "user-wrong-purpose", purpose: "directory_reference" },
    { tenant_id: TENANT, link_id: "link-expired", employee_id: "emp-expired", user_id: "user-expired", purpose: "login_mapping" },
    { tenant_id: TENANT, link_id: "link-future", employee_id: "emp-future", user_id: "user-future", purpose: "login_mapping" },
  ];
  const userDirectory = ["user-valid", "user-no-team", "user-revoked", "user-inactive", "user-wrong-purpose", "user-expired", "user-future"].map((user_id) => ({
    tenant_id: TENANT,
    user_id,
    status: "active",
  }));
  const service = createMatterActivityCalendarChannelService({
    repository,
    peopleAssignmentAuthority: createMatterPeopleAssignmentAuthority({
      repository,
      employeeDirectory,
      employeeUserLinkDirectory: links,
      userDirectory,
      clock: () => "2026-07-30T01:00:00.000Z",
    }),
    clock: () => "2026-07-30T01:00:00.000Z",
  });
  const create = (assignedToUserId) => service.createActivity({
    tenant_id: TENANT,
    matter_id: "matter-1",
    actor_id: "user-creator",
    occurred_at: "2026-07-30T00:00:00.000Z",
    activity: {
      activity_id: `task-${assignedToUserId}`,
      activity_type: "task",
      title: "서면 검토",
      assigned_to_user_id: assignedToUserId,
    },
  });
  assert.throws(() => create("user-missing"), /user_identity_missing/);
  assert.throws(() => create("emp-valid"), /employee_identifier_in_user_field/);
  assert.throws(() => create("user-revoked"), /unresolved_missing/);
  assert.throws(() => create("user-dangling"), /user_identity_missing/);
  assert.throws(() => create("user-inactive"), /employee_inactive/);
  assert.throws(() => create("user-wrong-purpose"), /unresolved_missing/);
  assert.throws(() => create("user-no-team"), /matter_member_missing_or_inactive/);
  assert.throws(() => service.createActivity({
    tenant_id: TENANT,
    matter_id: "matter-1",
    actor_id: "user-creator",
    occurred_at: "2026-07-15T00:00:00.000Z",
    activity: {
      activity_id: "task-expired-historical-time",
      activity_type: "task",
      title: "과거 시각 우회",
      assigned_to_user_id: "user-expired",
    },
  }), /matter_member_missing_or_inactive/);
  assert.throws(() => service.createActivity({
    tenant_id: TENANT,
    matter_id: "matter-1",
    actor_id: "user-creator",
    occurred_at: "2026-08-02T00:00:00.000Z",
    activity: {
      activity_id: "task-future-caller-time",
      activity_type: "task",
      title: "미래 시각 우회",
      assigned_to_user_id: "user-future",
    },
  }), /matter_member_missing_or_inactive/);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length, 0);

  const valid = create("user-valid");
  assert.equal(valid.item.status, "todo");
  assert.throws(() => service.patchActivity({
    tenant_id: TENANT,
    matter_id: "matter-1",
    activity_id: "task-user-valid",
    actor_id: "user-creator",
    occurred_at: "2026-07-15T01:00:00.000Z",
    patch: {
      status: "in_progress",
      title: "변경되면 안 되는 제목",
      due_at: "2026-08-02T09:00:00.000Z",
      starts_at: "2026-08-02T01:00:00.000Z",
      ends_at: "2026-08-02T02:00:00.000Z",
      estimated_minutes: 60,
      assigned_to_user_id: "user-expired",
    },
  }), /matter_member_missing_or_inactive/);
  const unchanged = repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: "task-user-valid",
  });
  assert.equal(unchanged.status, "todo");
  assert.equal(unchanged.title, "서면 검토");
  assert.equal(unchanged.due_at, null);
  assert.equal(unchanged.starts_at, null);
  assert.equal(unchanged.ends_at, null);
  assert.equal(unchanged.estimated_minutes, null);
  assert.equal(unchanged.assigned_to_user_id, "user-valid");
  assert.equal(repository.listAudit({ tenant_id: TENANT }).some(({ action }) => action === "matter.task.transition"), false);
});

test("People task selector includes only explicit open assignment and separates time-bound work", () => {
  const base = {
    tenant_id: TENANT,
    matter_id: "matter-1",
    status: "todo",
    assigned_to_user_id: "user-1",
  };
  const result = selectExplicitPeopleTasks({
    tenant_id: TENANT,
    user_id: "user-1",
    tasks: [
      { ...base, task_id: "time", starts_at: "2026-07-30T10:00:00.000Z", ends_at: "2026-07-30T11:00:00.000Z" },
      { ...base, task_id: "needs-end", starts_at: "2026-07-30T12:00:00.000Z", estimated_minutes: 30 },
      { ...base, task_id: "due", due_at: "2026-07-30T18:00:00.000Z" },
      { ...base, task_id: "other", assigned_to_user_id: "user-2" },
      { ...base, task_id: "unassigned", assigned_to_user_id: null },
      { ...base, task_id: "done", status: "done" },
      { ...base, task_id: "cancelled", status: "cancelled" },
    ],
  });

  assert.deepEqual(result.time_bound.map(({ task_id }) => task_id), ["time"]);
  assert.deepEqual(result.due_only.map(({ task_id }) => task_id), ["due"]);
  assert.deepEqual(result.unscheduled.map(({ task_id }) => task_id), ["needs-end"]);
  assert.equal(
    [...result.time_bound, ...result.due_only, ...result.unscheduled]
      .filter(({ task_id }) => task_id === "needs-end")
      .length,
    1,
  );
});

test("dual-read mismatch is review-only and never auto-assigns legacy rows", () => {
  const parity = comparePeopleTaskSelectors({
    tenant_id: TENANT,
    user_id: "user-1",
    tasks: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      task_id: "legacy",
      status: "todo",
      assigned_to: "user-1",
      assigned_to_user_id: null,
    }],
  });
  assert.equal(parity.legacy_count, 1);
  assert.equal(parity.explicit_count, 0);
  assert.deepEqual(parity.review_task_ids, ["legacy"]);
  assert.equal(parity.auto_attributed_count, 0);
});
