import assert from "node:assert/strict";
import test from "node:test";
import { createPeopleAttentionWindow } from "../src/people-attention-window.js";

const TENANT = "tenant-attention";
const matters = [
  { tenant_id: TENANT, matter_id: "matter-1", matter_code: "L-001", matter_name: "사건 1" },
  { tenant_id: TENANT, matter_id: "matter-2", matter_code: "L-002", matter_name: "사건 2" },
];

test("14-day attention window deduplicates reasons and flags assignment and schedule conflicts", () => {
  const result = createPeopleAttentionWindow({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    visible_matters: matters,
    assignments: [
      { tenant_id: TENANT, matter_id: "matter-1", member_id: "member-1", employee_id: "emp-1", role: "responsible_attorney", status: "active", valid_from: "2026-07-01T00:00:00.000Z", identity_resolution_state: "resolved" },
    ],
    events: [
      { tenant_id: TENANT, matter_id: "matter-1", event_id: "event-1", title: "변론기일", event_kind: "court_hearing", status: "scheduled", starts_at: "2026-08-01T01:00:00.000Z", ends_at: "2026-08-01T02:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-1", event_id: "event-2", title: "제출기한", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-01T01:30:00.000Z", ends_at: "2026-08-01T02:30:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-2", event_id: "event-3", title: "담당 없는 기한", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-02T01:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-secret", event_id: "event-secret", title: "숨은 기한", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-02T02:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-1", event_id: "event-late", title: "범위 밖", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-20T01:00:00.000Z" },
    ],
  });
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items[0].reasons, ["court_hearing", "schedule_conflict:emp-1"]);
  assert.deepEqual(result.items[1].reasons, ["deadline", "schedule_conflict:emp-1"]);
  assert.deepEqual(result.items[2].reasons, ["assignee_required", "deadline"]);
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.equal(JSON.stringify(result).includes("day_percent"), false);
  assert.equal(new Set(result.items.map(({ attention_id }) => attention_id)).size, result.items.length);
});

test("attention window resolves assignees at each event time across a scheduled handoff", () => {
  const result = createPeopleAttentionWindow({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    timezone: "Asia/Seoul",
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
        valid_to: "2026-08-02T00:04:59.999Z",
        identity_resolution_state: "resolved",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        member_id: "member-next",
        employee_id: "emp-next",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-08-02T00:15:00.000Z",
        identity_resolution_state: "resolved",
      },
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        event_id: "old-event",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-08-02T09:00:00+09:00",
        ends_at: "2026-08-02T10:00:00+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        event_id: "gap-event",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T09:10:00+09:00",
        ends_at: "2026-08-02T09:20:00+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-handoff",
        event_id: "next-event",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T09:30:00+09:00",
        ends_at: "2026-08-02T10:30:00+09:00",
      },
    ],
    approved_leave_intervals: [
      {
        tenant_id: TENANT,
        employee_id: "emp-next",
        state: "approved",
        starts_at: "2026-08-02T09:30:00+09:00",
        ends_at: "2026-08-02T10:00:00+09:00",
      },
    ],
  });

  assert.deepEqual(result.items.map(({ event_id, reasons }) => ({ event_id, reasons })), [
    { event_id: "old-event", reasons: ["court_hearing"] },
    { event_id: "gap-event", reasons: ["assignee_required", "deadline"] },
    { event_id: "next-event", reasons: ["approved_leave_conflict:emp-next", "deadline"] },
  ]);
});

test("attention window preserves inclusive validity at the same offset timestamp", () => {
  const result = createPeopleAttentionWindow({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    timezone: "Asia/Seoul",
    visible_matters: [
      { tenant_id: TENANT, matter_id: "matter-boundary", matter_code: "L-102", matter_name: "경계 사건" },
    ],
    assignments: [
      {
        tenant_id: TENANT,
        matter_id: "matter-boundary",
        member_id: "member-boundary",
        employee_id: "emp-1",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-08-02T01:00:00.000Z",
        valid_to: "2026-08-02T01:00:00.000Z",
        identity_resolution_state: "resolved",
      },
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-boundary",
        event_id: "same-instant",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T10:00:00+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-boundary",
        event_id: "one-ms-later",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T10:00:00.001+09:00",
      },
    ],
  });

  assert.deepEqual(result.items.map(({ event_id, reasons }) => ({ event_id, reasons })), [
    { event_id: "same-instant", reasons: ["deadline"] },
    { event_id: "one-ms-later", reasons: ["assignee_required", "deadline"] },
  ]);
});
