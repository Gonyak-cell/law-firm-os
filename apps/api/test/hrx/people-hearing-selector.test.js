import assert from "node:assert/strict";
import test from "node:test";
import { agendaKindForMatterEvent } from "../../src/home-dashboard-runtime-context.js";
import { selectMemberCourtHearings } from "../../../../packages/hrx/src/people-hearing-selector.js";

const TENANT = "tenant-people";

test("member hearings require explicit current responsible-attorney assignment", () => {
  const result = selectMemberCourtHearings({
    tenant_id: TENANT,
    employee_id: "emp-1",
    as_of: "2026-07-30T09:00:00.000Z",
    assignments: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: "member-1",
      employee_id: "emp-1",
      user_id: "user-1",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    }],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "hearing-1",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-07-30T10:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-unassigned",
        event_id: "hearing-unassigned",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-07-30T11:00:00.000Z",
      },
    ],
  });
  assert.deepEqual(result.map(({ event_id }) => event_id), ["hearing-1"]);
});

test("member hearings follow a same-day handoff at the hearing timestamp", () => {
  const assignments = [
    {
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: "member-old",
      employee_id: "emp-old",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      valid_to: "2026-07-30T04:59:59.999Z",
      identity_resolution_state: "resolved",
    },
    {
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: "member-successor",
      employee_id: "emp-successor",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-30T05:00:00.000Z",
      identity_resolution_state: "resolved",
    },
  ];
  const events = [{
    tenant_id: TENANT,
    matter_id: "matter-1",
    event_id: "hearing-after-handoff",
    event_kind: "court_hearing",
    status: "scheduled",
    starts_at: "2026-07-30T05:00:00.000Z",
  }];
  assert.deepEqual(selectMemberCourtHearings({
    tenant_id: TENANT,
    employee_id: "emp-old",
    as_of: "2026-07-30T00:30:00.000Z",
    assignments,
    events,
  }), []);
  assert.deepEqual(selectMemberCourtHearings({
    tenant_id: TENANT,
    employee_id: "emp-successor",
    as_of: "2026-07-30T00:30:00.000Z",
    assignments,
    events,
  }).map(({ event_id }) => event_id), ["hearing-after-handoff"]);
});

test("Home agenda uses event_kind and never infers a hearing from title", () => {
  assert.equal(agendaKindForMatterEvent({
    event_kind: "unknown",
    title: "Court hearing preparation",
  }), "meeting");
  assert.equal(agendaKindForMatterEvent({
    event_kind: "court_hearing",
    title: "일정",
  }), "hearing");
});
