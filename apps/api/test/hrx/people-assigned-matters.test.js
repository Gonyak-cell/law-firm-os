import assert from "node:assert/strict";
import test from "node:test";
import { createPeopleDailyBriefProjection } from "../../../../packages/hrx/src/people-daily-brief.js";

const TENANT = "tenant-assigned-matters";
const AS_OF = "2026-07-30T00:00:00.000Z";

function assignment({
  matter_id,
  member_id,
  valid_from = "2026-07-01T00:00:00.000Z",
  valid_to,
  identity_resolution_state = "resolved",
}) {
  return {
    tenant_id: TENANT,
    matter_id,
    member_id,
    employee_id: "emp-1",
    user_id: "user-1",
    role: "responsible_attorney",
    status: "active",
    valid_from,
    ...(valid_to ? { valid_to } : {}),
    identity_resolution_state,
  };
}

test("assigned Matters keep only current responsible-attorney rows and sort by next event then code", () => {
  const visibleMatters = [
    { tenant_id: TENANT, matter_id: "matter-a", matter_code: "L-002", matter_name: "두 번째 일정" },
    { tenant_id: TENANT, matter_id: "matter-b", matter_code: "L-001", matter_name: "첫 번째 일정" },
    { tenant_id: TENANT, matter_id: "matter-c", matter_code: "L-003", matter_name: "일정 없음" },
    { tenant_id: TENANT, matter_id: "matter-ended", matter_code: "L-004", matter_name: "종료 배정" },
    { tenant_id: TENANT, matter_id: "matter-future", matter_code: "L-005", matter_name: "미래 배정" },
    { tenant_id: TENANT, matter_id: "matter-unresolved", matter_code: "L-006", matter_name: "미해결 배정" },
  ];
  const projection = createPeopleDailyBriefProjection({
    tenant_id: TENANT,
    employee: {
      tenant_id: TENANT,
      employee_id: "emp-1",
      display_name: "김변호사",
      status: "active",
    },
    user_id: "user-1",
    as_of: AS_OF,
    visible_matters: visibleMatters,
    assignments: [
      assignment({ matter_id: "matter-a", member_id: "member-a" }),
      assignment({ matter_id: "matter-b", member_id: "member-b" }),
      assignment({ matter_id: "matter-c", member_id: "member-c", valid_to: "2026-08-10T00:00:00.000Z" }),
      assignment({ matter_id: "matter-ended", member_id: "member-ended", valid_to: "2026-07-01T00:00:00.000Z" }),
      assignment({ matter_id: "matter-future", member_id: "member-future", valid_from: "2026-08-01T00:00:00.000Z" }),
      assignment({ matter_id: "matter-unresolved", member_id: "member-unresolved", identity_resolution_state: "unresolved" }),
      assignment({ matter_id: "matter-hidden", member_id: "member-hidden" }),
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-a",
        event_id: "event-a",
        event_kind: "deadline",
        status: "scheduled",
        title: "상고기한",
        starts_at: "2026-08-02T01:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-b",
        event_id: "event-b",
        event_kind: "court_hearing",
        status: "scheduled",
        title: "변론기일",
        starts_at: "2026-07-31T01:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-hidden",
        event_id: "event-hidden",
        event_kind: "court_hearing",
        status: "scheduled",
        title: "숨은 재판",
        starts_at: "2026-07-30T02:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(
    projection.assigned_matters.map(({ matter_id }) => matter_id),
    ["matter-b", "matter-a", "matter-c"],
  );
  assert.deepEqual(
    projection.assigned_matters.map(({ next_important_event }) => next_important_event?.event_id ?? null),
    ["event-b", "event-a", null],
  );
  assert.equal(projection.assigned_matters[0].role, "responsible_attorney");
  assert.equal(projection.assigned_matters[2].handoff_state, "handoff_scheduled");
  assert.equal(JSON.stringify(projection).includes("matter-hidden"), false);
  assert.equal(Object.hasOwn(projection, "omitted_count"), false);
});
