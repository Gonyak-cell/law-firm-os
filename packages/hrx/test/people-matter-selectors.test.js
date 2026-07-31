import assert from "node:assert/strict";
import test from "node:test";
import {
  activeAttorneyAssignments,
  createPeopleMatterSelectorProjection,
  memberEvents,
  memberTasks,
} from "../src/people-matter-selectors.js";

const TENANT = "tenant-people";
const AS_OF = "2026-07-30T09:00:00.000Z";

const assignments = [
  {
    tenant_id: TENANT,
    matter_id: "matter-visible",
    member_id: "member-visible",
    employee_id: "emp-1",
    user_id: "user-1",
    role: "responsible_attorney",
    status: "active",
    valid_from: "2026-07-01T00:00:00.000Z",
    identity_resolution_state: "resolved",
  },
  {
    tenant_id: TENANT,
    matter_id: "matter-denied",
    member_id: "member-denied",
    employee_id: "emp-1",
    user_id: "user-1",
    role: "responsible_attorney",
    status: "active",
    valid_from: "2026-07-01T00:00:00.000Z",
    identity_resolution_state: "resolved",
  },
];

const tasks = [
  { tenant_id: TENANT, matter_id: "matter-visible", task_id: "task-visible", status: "todo", assigned_to_user_id: "user-1" },
  { tenant_id: TENANT, matter_id: "matter-visible", task_id: "task-other", status: "todo", assigned_to_user_id: "user-2" },
  { tenant_id: TENANT, matter_id: "matter-denied", task_id: "task-denied", status: "todo", assigned_to_user_id: "user-1" },
];

const events = [
  { tenant_id: TENANT, matter_id: "matter-visible", event_id: "hearing-visible", event_kind: "court_hearing", status: "scheduled", starts_at: "2026-07-30T10:00:00.000Z" },
  { tenant_id: TENANT, matter_id: "matter-visible", event_id: "unknown", event_kind: "unknown", status: "scheduled", starts_at: "2026-07-30T11:00:00.000Z" },
  { tenant_id: TENANT, matter_id: "matter-denied", event_id: "hearing-denied", event_kind: "court_hearing", status: "scheduled", starts_at: "2026-07-30T12:00:00.000Z" },
];

test("People Matter selectors apply visible Matter scope before rows and counts", () => {
  const input = {
    tenant_id: TENANT,
    employee_id: "emp-1",
    user_id: "user-1",
    as_of: AS_OF,
    visible_matter_ids: ["matter-visible"],
    assignments,
    tasks,
    events,
  };
  assert.deepEqual(activeAttorneyAssignments(input).map(({ matter_id }) => matter_id), ["matter-visible"]);
  assert.deepEqual(memberTasks(input).unscheduled.map(({ task_id }) => task_id), ["task-visible"]);
  assert.deepEqual(memberEvents(input).map(({ event_id }) => event_id), ["hearing-visible"]);

  const projection = createPeopleMatterSelectorProjection(input);
  const serialized = JSON.stringify(projection);
  assert.equal(serialized.includes("matter-denied"), false);
  assert.equal(serialized.includes("task-denied"), false);
  assert.equal(Object.hasOwn(projection, "omitted_count"), false);
  assert.match(projection.result_hash, /^sha256:/);
});

test("People Matter selector projection is deterministic for identical input", () => {
  const input = {
    tenant_id: TENANT,
    employee_id: "emp-1",
    user_id: "user-1",
    as_of: AS_OF,
    visible_matter_ids: ["matter-visible"],
    assignments: [...assignments].reverse(),
    tasks: [...tasks].reverse(),
    events: [...events].reverse(),
  };
  assert.deepEqual(
    createPeopleMatterSelectorProjection(input),
    createPeopleMatterSelectorProjection({ ...input }),
  );
});

test("People Matter tasks stay unavailable until one Employee/User link is resolved", () => {
  for (const identity_state of ["missing", "ambiguous", "inactive"]) {
    const projection = createPeopleMatterSelectorProjection({
      tenant_id: TENANT,
      employee_id: "emp-1",
      user_id: identity_state === "inactive" ? "user-1" : null,
      identity_state,
      as_of: AS_OF,
      visible_matter_ids: ["matter-visible"],
      assignments,
      tasks,
      events,
    });
    assert.equal(projection.member_tasks, null);
    assert.equal(projection.task_source_state, "identity_link_required");
    assert.equal(JSON.stringify(projection).includes("task-visible"), false);
  }
});

test("member hearings resolve the responsible attorney at each hearing start", () => {
  const handoffAssignments = [
    {
      tenant_id: TENANT,
      matter_id: "matter-visible",
      member_id: "member-old",
      employee_id: "emp-old",
      user_id: "user-old",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      valid_to: "2026-07-30T04:59:59.999Z",
      identity_resolution_state: "resolved",
    },
    {
      tenant_id: TENANT,
      matter_id: "matter-visible",
      member_id: "member-successor",
      employee_id: "emp-successor",
      user_id: "user-successor",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-30T05:00:00.000Z",
      identity_resolution_state: "resolved",
    },
  ];
  const handoffEvents = [
    {
      tenant_id: TENANT,
      matter_id: "matter-visible",
      event_id: "hearing-before-handoff",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-30T04:59:59.999Z",
    },
    {
      tenant_id: TENANT,
      matter_id: "matter-visible",
      event_id: "hearing-at-handoff",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-30T05:00:00.000Z",
    },
    {
      tenant_id: TENANT,
      matter_id: "matter-gap",
      event_id: "hearing-in-gap",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-30T05:30:00.000Z",
    },
  ];
  assert.deepEqual(memberEvents({
    tenant_id: TENANT,
    employee_id: "emp-old",
    as_of: "2026-07-30T00:30:00.000Z",
    assignments: handoffAssignments,
    events: handoffEvents,
    visible_matter_ids: ["matter-visible", "matter-gap"],
  }).map(({ event_id }) => event_id), ["hearing-before-handoff"]);
  assert.deepEqual(memberEvents({
    tenant_id: TENANT,
    employee_id: "emp-successor",
    as_of: "2026-07-30T00:30:00.000Z",
    assignments: handoffAssignments,
    events: handoffEvents,
    visible_matter_ids: ["matter-visible", "matter-gap"],
  }).map(({ event_id }) => event_id), ["hearing-at-handoff"]);
});
