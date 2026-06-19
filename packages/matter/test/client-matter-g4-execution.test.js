import assert from "node:assert/strict";
import test from "node:test";

import {
  createMatterCalendarDeadlineChangeDescriptor,
  createMatterClientReportProjectionDescriptor,
  createMatterCoreRecord,
  createMatterCriticalDeadlineDualControlDescriptor,
  createMatterG4BExecutionWorkflowCloseoutDescriptor,
  createMatterG4Member,
  createMatterStatusHistoryDescriptor,
  createMatterTaskTransitionDescriptor,
  createMatterTeamUiStateDescriptor,
  MATTER_G4B_CLIENT_REPORT_HIDDEN_FIELDS,
} from "../src/index.js";

const tenant_id = "tenant_g4b_validator";
const actor_id = "actor_g4b_validator";
const matter_id = "matter_g4b";

function member(overrides = {}) {
  return createMatterG4Member({
    member_id: "member_g4b_owner",
    tenant_id,
    matter_id,
    user_id: "user_g4b_owner",
    role: "responsible_attorney",
    status: "active",
    permission_envelope_id: "perm_g4b_member",
    audit_trace_id: "audit_g4b_member",
    ...overrides,
  });
}

function task(overrides = {}) {
  return createMatterCoreRecord("MatterTask", {
    task_id: "task_g4b",
    tenant_id,
    matter_id,
    title: "Prepare execution checklist",
    status: "todo",
    created_by: actor_id,
    permission_envelope_id: "perm_g4b_task",
    audit_trace_id: "audit_g4b_task",
    ...overrides,
  });
}

function event(overrides = {}) {
  return createMatterCoreRecord("MatterCalendarEvent", {
    event_id: "event_g4b_deadline",
    tenant_id,
    matter_id,
    title: "Filing deadline",
    status: "scheduled",
    starts_at: "2026-07-01T00:00:00.000Z",
    ends_at: "2026-07-01T01:00:00.000Z",
    permission_envelope_id: "perm_g4b_event",
    audit_trace_id: "audit_g4b_event",
    ...overrides,
  });
}

test("G4-B team UI trims hidden members and requires add/remove audit", () => {
  const visible = member();
  const hidden = { ...member({ member_id: "member_g4b_hidden", user_id: "user_g4b_hidden" }), hidden_from_actor: true };
  const blocked = createMatterTeamUiStateDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    action: "remove_member",
    members: [visible, hidden],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("matter_team_add_remove_audit_required"));
  assert.equal(blocked.hidden_member_count_exposed, null);
  assert.equal(blocked.unauthorized_count_leaked, false);

  const descriptor = createMatterTeamUiStateDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    action: "add_member",
    members: [visible, hidden],
    audit_ref: "audit:g4b:team-add",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.visible_members.length, 1);
  assert.equal(descriptor.visible_members[0].member_id, visible.member_id);
  assert.equal(descriptor.ui_receipt.member_write_persisted, false);
});

test("G4-B MatterTask transition descriptor enforces allowed status changes", () => {
  const descriptor = createMatterTaskTransitionDescriptor({
    tenant_id,
    actor_id,
    task: task(),
    to_status: "in_progress",
    transition_reason: "Work started.",
    audit_ref: "audit:g4b:task-transition",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.from_status, "todo");
  assert.deepEqual(descriptor.allowed_targets, ["in_progress", "blocked", "cancelled"]);
  assert.equal(descriptor.transition_receipt.transition_persisted, false);

  const invalid = createMatterTaskTransitionDescriptor({
    tenant_id,
    actor_id,
    task: task({ status: "done" }),
    to_status: "todo",
    transition_reason: "Reopen without approval.",
    audit_ref: "audit:g4b:task-invalid",
  });

  assert.equal(invalid.outcome, "blocked");
  assert.ok(invalid.blocked_claims.includes("matter_task_status_transition_invalid"));
});

test("G4-B calendar deadline change requires audit evidence", () => {
  const descriptor = createMatterCalendarDeadlineChangeDescriptor({
    tenant_id,
    actor_id,
    event: event(),
    new_starts_at: "2026-07-02T00:00:00.000Z",
    new_ends_at: "2026-07-02T01:00:00.000Z",
    change_reason: "Court deadline moved.",
    audit_ref: "audit:g4b:deadline-change",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.deadline_receipt.deadline_change_audit_required, true);
  assert.equal(descriptor.deadline_receipt.deadline_change_persisted, false);

  const noop = createMatterCalendarDeadlineChangeDescriptor({
    tenant_id,
    actor_id,
    event: event(),
    new_starts_at: "2026-07-01T00:00:00.000Z",
    new_ends_at: "2026-07-01T01:00:00.000Z",
    change_reason: "No change.",
    audit_ref: "audit:g4b:deadline-noop",
  });

  assert.equal(noop.outcome, "blocked");
  assert.ok(noop.blocked_claims.includes("matter_deadline_change_noop"));
});

test("G4-B critical deadline dual control requires two people", () => {
  const blocked = createMatterCriticalDeadlineDualControlDescriptor({
    tenant_id,
    matter_id,
    event_id: "event_g4b_deadline",
    requester_user_id: "user_g4b_owner",
    confirmer_user_id: "user_g4b_owner",
    confirmation_audit_ref: "audit:g4b:dual-control",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("critical_deadline_two_person_confirmation_required"));

  const descriptor = createMatterCriticalDeadlineDualControlDescriptor({
    tenant_id,
    matter_id,
    event_id: "event_g4b_deadline",
    requester_user_id: "user_g4b_owner",
    confirmer_user_id: "user_g4b_partner",
    confirmation_audit_ref: "audit:g4b:dual-control",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.dual_control_receipt.two_person_confirmation_required, true);
  assert.equal(descriptor.dual_control_receipt.confirmation_persisted, false);
});

test("G4-B MatterStatusHistory descriptor is immutable and audit-bound", () => {
  const descriptor = createMatterStatusHistoryDescriptor({
    tenant_id,
    matter_id,
    from_status: "opening",
    to_status: "open",
    actor_id,
    reason: "Opening foundation reviewed.",
    audit_ref: "audit:g4b:status-history",
    changed_at: "2026-06-19T00:00:00.000Z",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.history_record.immutable_history, true);
  assert.equal(Object.isFrozen(descriptor.history_record), true);
  assert.equal(descriptor.history_receipt.status_history_persisted, false);
});

test("G4-B client report projection strips privileged and internal material", () => {
  assert.ok(MATTER_G4B_CLIENT_REPORT_HIDDEN_FIELDS.includes("conflict_memo"));

  const descriptor = createMatterClientReportProjectionDescriptor({
    tenant_id,
    matter_id,
    client_report_id: "client_report_g4b",
    source_report: {
      conflict_memo: "Do not expose",
      sections: [
        {
          section_id: "summary",
          title: "Status summary",
          body: "Matter is open.",
          client_visible: true,
          conflict_memo: "Hidden memo",
          billing_detail: "Hidden billing",
        },
        {
          section_id: "strategy",
          title: "Strategy",
          body: "Privileged strategy.",
          privileged: true,
          client_visible: false,
        },
      ],
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.visible_sections.length, 1);
  assert.equal(descriptor.visible_sections[0].conflict_memo, undefined);
  assert.equal(descriptor.visible_sections[0].billing_detail, undefined);
  assert.ok(descriptor.removed_fields.includes("conflict_memo"));
  assert.ok(descriptor.removed_fields.includes("billing_detail"));
  assert.equal(descriptor.portal_projection_safe, true);
  assert.equal(descriptor.projection_receipt.portal_published, false);
});

test("G4-B closeout descriptor summarizes execution workflow evidence", () => {
  const team = createMatterTeamUiStateDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    action: "add_member",
    members: [member()],
    audit_ref: "audit:g4b:team-add",
  });
  const taskTransition = createMatterTaskTransitionDescriptor({
    tenant_id,
    actor_id,
    task: task(),
    to_status: "in_progress",
    transition_reason: "Work started.",
    audit_ref: "audit:g4b:task-transition",
  });
  const deadline = createMatterCalendarDeadlineChangeDescriptor({
    tenant_id,
    actor_id,
    event: event(),
    new_starts_at: "2026-07-02T00:00:00.000Z",
    change_reason: "Court deadline moved.",
    audit_ref: "audit:g4b:deadline-change",
  });
  const dualControl = createMatterCriticalDeadlineDualControlDescriptor({
    tenant_id,
    matter_id,
    event_id: "event_g4b_deadline",
    requester_user_id: "user_g4b_owner",
    confirmer_user_id: "user_g4b_partner",
    confirmation_audit_ref: "audit:g4b:dual-control",
  });
  const history = createMatterStatusHistoryDescriptor({
    tenant_id,
    matter_id,
    from_status: "opening",
    to_status: "open",
    actor_id,
    reason: "Opening foundation reviewed.",
    audit_ref: "audit:g4b:status-history",
  });
  const report = createMatterClientReportProjectionDescriptor({
    tenant_id,
    matter_id,
    client_report_id: "client_report_g4b",
    source_report: { sections: [{ section_id: "summary", body: "Safe", client_visible: true }] },
  });

  const closeout = createMatterG4BExecutionWorkflowCloseoutDescriptor({
    tenant_id,
    descriptors: [team, taskTransition, deadline, dualControl, history, report],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G4-W05-T005",
    "LFOS-G4-W05-T006",
    "LFOS-G4-W05-T007",
    "LFOS-G4-W05-T008",
    "LFOS-G4-W05-T009",
    "LFOS-G4-W05-T010",
  ]);
  assert.equal(closeout.matter_team_ui_audit_tested, true);
  assert.equal(closeout.matter_task_transition_tested, true);
  assert.equal(closeout.deadline_change_audit_tested, true);
  assert.equal(closeout.critical_deadline_dual_control_tested, true);
  assert.equal(closeout.matter_status_history_tested, true);
  assert.equal(closeout.client_report_projection_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
