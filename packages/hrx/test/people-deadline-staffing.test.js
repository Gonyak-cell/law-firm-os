import assert from "node:assert/strict";
import test from "node:test";
import { createPeopleDeadlineStaffing } from "../src/people-deadline-staffing.js";

const TENANT = "tenant-staffing";

test("deadline staffing reports natural Korean states for zero, one, and joint attorneys", () => {
  const matters = [1, 2, 3].map((index) => ({
    tenant_id: TENANT,
    matter_id: `matter-${index}`,
    matter_code: `L-00${index}`,
    matter_name: `사건 ${index}`,
  }));
  const result = createPeopleDeadlineStaffing({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    employees: [
      { tenant_id: TENANT, employee_id: "emp-1", display_name: "김변호사" },
      { tenant_id: TENANT, employee_id: "emp-2", display_name: "이변호사" },
    ],
    visible_matters: matters,
    assignments: [
      { tenant_id: TENANT, matter_id: "matter-2", member_id: "member-2", employee_id: "emp-1", role: "responsible_attorney", status: "active", valid_from: "2026-07-01T00:00:00.000Z", identity_resolution_state: "resolved" },
      { tenant_id: TENANT, matter_id: "matter-3", member_id: "member-31", employee_id: "emp-1", role: "responsible_attorney", status: "active", valid_from: "2026-07-01T00:00:00.000Z", identity_resolution_state: "resolved" },
      { tenant_id: TENANT, matter_id: "matter-3", member_id: "member-32", employee_id: "emp-2", role: "responsible_attorney", status: "active", valid_from: "2026-07-01T00:00:00.000Z", identity_resolution_state: "resolved" },
      { tenant_id: TENANT, matter_id: "matter-1", member_id: "member-future", employee_id: "emp-1", role: "responsible_attorney", status: "active", valid_from: "2026-09-01T00:00:00.000Z", identity_resolution_state: "resolved" },
      { tenant_id: TENANT, matter_id: "matter-1", member_id: "member-ended", employee_id: "emp-2", role: "responsible_attorney", status: "active", valid_from: "2026-01-01T00:00:00.000Z", valid_to: "2026-07-01T00:00:00.000Z", identity_resolution_state: "resolved" },
    ],
    events: [
      { tenant_id: TENANT, matter_id: "matter-1", event_id: "event-1", title: "담당 없음", event_kind: "deadline", status: "scheduled", starts_at: "2026-07-31T01:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-2", event_id: "event-2", title: "한 명", event_kind: "court_hearing", status: "scheduled", starts_at: "2026-08-01T01:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-3", event_id: "event-3", title: "공동", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-02T01:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-1", event_id: "unknown", title: "미분류", event_kind: "unknown", status: "scheduled", starts_at: "2026-08-03T01:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-secret", event_id: "secret", title: "숨은 일정", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-04T01:00:00.000Z" },
    ],
  });
  assert.deepEqual(result.items.map(({ staffing_label }) => staffing_label), [
    "담당자 지정 필요",
    "담당 확인",
    "공동 담당",
  ]);
  assert.deepEqual(result.items.map(({ attorney_count }) => attorney_count), [0, 1, 2]);
  assert.deepEqual(result.items[2].attorneys.map(({ display_name }) => display_name), ["김변호사", "이변호사"]);
  assert.equal(JSON.stringify(result).includes("unknown"), false);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("deadline staffing resolves each future event against its assignment validity", () => {
  const result = createPeopleDeadlineStaffing({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    timezone: "Asia/Seoul",
    employees: [
      { tenant_id: TENANT, employee_id: "emp-old", display_name: "기존 담당" },
      { tenant_id: TENANT, employee_id: "emp-next", display_name: "인계 담당" },
    ],
    visible_matters: [
      { tenant_id: TENANT, matter_id: "matter-handoff", matter_code: "L-101", matter_name: "인계 사건" },
    ],
    assignments: [
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        member_id: "member-old",
        employee_id: "emp-old",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        valid_to: "2026-08-02T01:00:00.000Z",
        identity_resolution_state: "resolved",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        member_id: "member-next",
        employee_id: "emp-next",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-08-02T01:00:00.000Z",
        identity_resolution_state: "resolved",
      },
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        event_id: "before-handoff",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T09:59:59+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        event_id: "at-handoff",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-08-02T10:00:00+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        event_id: "after-handoff",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T10:00:00.001+09:00",
      },
    ],
  });

  assert.deepEqual(
    result.items.map(({ event_id, attorneys }) => ({
      event_id,
      employee_ids: attorneys.map(({ employee_id }) => employee_id),
    })),
    [
      { event_id: "before-handoff", employee_ids: ["emp-old"] },
      { event_id: "at-handoff", employee_ids: ["emp-old", "emp-next"] },
      { event_id: "after-handoff", employee_ids: ["emp-next"] },
    ],
  );
});

test("deadline staffing uses the tenant timezone for the 14-day boundary", () => {
  const result = createPeopleDeadlineStaffing({
    tenant_id: TENANT,
    as_of: "2026-07-31T14:30:00.000Z",
    timezone: "Asia/Seoul",
    employees: [{ tenant_id: TENANT, employee_id: "emp-1", display_name: "김변호사" }],
    visible_matters: [
      { tenant_id: TENANT, matter_id: "matter-1", matter_code: "L-201", matter_name: "경계 사건" },
    ],
    assignments: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        member_id: "member-1",
        employee_id: "emp-1",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      },
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "inside",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-13T23:59:59.999+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "exclusive-end",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-14T00:00:00+09:00",
      },
    ],
  });

  assert.equal(result.start_date, "2026-07-31");
  assert.equal(result.end_date_exclusive, "2026-08-14");
  assert.deepEqual(result.items.map(({ event_id }) => event_id), ["inside"]);
});
