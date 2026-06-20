import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  addMatterTeamMember,
  appendMatterAuditEvent,
  buildMatterTimelineReadModel,
  changeMatterDeadline,
  closeMatter,
  confirmCriticalDeadlineChange,
  createMatterAuditEvent,
  createMatterClientReportProjection,
  createMatterRepository,
  createMatterStatusHistoryStore,
  filterVisibleMatters,
  matterOpeningDependencyDecision,
  openMatterTransaction,
  reserveMatterNumber,
  transitionMatterTask,
} from "../src/index.js";

const tenant_id = "tenant-g4-runtime";
const actor_id = "user-g4-owner";

function filePath(name) {
  return join(mkdtempSync(join(tmpdir(), name)), "matter-store.json");
}

function clearanceToken(overrides = {}) {
  return {
    clearance_token_id: "clearance-g4",
    tenant_id,
    intake_request_id: "intake-g4",
    conflict_check_id: "conflict-g4",
    engagement_id: "engagement-g4",
    snapshot_hash: "sha256:clearance-g4",
    token_state: "active",
    outcome: "passed",
    blocked_claims: [],
    ...overrides,
  };
}

function matterInput(overrides = {}) {
  return {
    model_type: "Matter",
    matter_id: "matter-g4",
    tenant_id,
    client_id: "client-g4",
    legal_client_party_id: "party-g4-legal",
    title: "G4 runtime matter",
    status: "opening",
    created_by: actor_id,
    created_at: "2026-06-20T00:00:00.000Z",
    permission_envelope_id: "perm-g4",
    audit_trace_id: "audit-g4",
    ...overrides,
  };
}

test("Matter repository persists tenant-scoped records across reopen", () => {
  const storePath = filePath("matter-repo-");
  const repository = createMatterRepository({ filePath: storePath });
  repository.create(matterInput());
  repository.close();

  const reopened = createMatterRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id, model_type: "Matter" }).length, 1);
  assert.equal(reopened.list({ tenant_id: "tenant-other", model_type: "Matter" }).length, 0);
});

test("Matter numbering blocks duplicate matter numbers and supports idempotent replay", () => {
  const repository = createMatterRepository();
  const first = reserveMatterNumber({
    repository,
    tenant_id,
    matter_number_seed: "Commercial Dispute",
    idempotency_key: "idem-number-1",
  });
  const replay = reserveMatterNumber({
    repository,
    tenant_id,
    matter_number_seed: "Commercial Dispute",
    idempotency_key: "idem-number-1",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.matter_number, first.matter_number);

  repository.create({ ...matterInput(), matter_number: first.matter_number });
  assert.throws(
    () =>
      reserveMatterNumber({
        repository,
        tenant_id,
        matter_number_seed: "Commercial Dispute",
        idempotency_key: "idem-number-2",
        matter_number: first.matter_number,
      }),
    /already exists/,
  );
});

test("Matter opening transaction rolls back when DMS or Billing side effects fail", () => {
  const repository = createMatterRepository();
  assert.throws(
    () =>
      openMatterTransaction({
        repository,
        matter: matterInput(),
        clearance_token: clearanceToken(),
        matter_number_seed: "Opening",
        idempotency_key: "idem-opening-fail",
        actor_id,
        dms: { createWorkspace: () => null },
        billing: { createMatterLedger: () => ({ ledger_id: "ledger-g4" }) },
      }),
    /DMS workspace creation failed/,
  );
  assert.equal(repository.list({ tenant_id, model_type: "Matter" }).length, 0);

  const result = openMatterTransaction({
    repository,
    matter: matterInput({ matter_id: "matter-g4-opened" }),
    clearance_token: clearanceToken(),
    matter_number_seed: "Opening Success",
    idempotency_key: "idem-opening-ok",
    actor_id,
    dms: { createWorkspace: ({ matter_id }) => ({ workspace_id: `workspace-${matter_id}` }) },
    billing: { createMatterLedger: ({ matter_id }) => ({ ledger_id: `ledger-${matter_id}` }) },
  });
  assert.equal(result.outcome, "created");
  assert.equal(repository.listAudit({ tenant_id, object_id: "matter-g4-opened" }).length, 1);
});

test("MatterTeam runtime blocks user_id-only and unavailable employees", () => {
  const repository = createMatterRepository({ seedRecords: [matterInput()] });
  const employees = [
    { tenant_id, employee_id: "emp-active", status: "active", availability: "available" },
    { tenant_id, employee_id: "emp-offboarded", status: "offboarded", availability: "available" },
  ];
  assert.throws(
    () =>
      addMatterTeamMember({
        repository,
        employeeDirectory: employees,
        matter: matterInput(),
        actor_id,
        member: {
          model_type: "MatterMember",
          tenant_id,
          matter_id: "matter-g4",
          member_id: "member-user-only",
          user_id: "user-only",
          role: "responsible_attorney",
          status: "active",
        },
      }),
    /employee_id/,
  );
  assert.throws(
    () =>
      addMatterTeamMember({
        repository,
        employeeDirectory: employees,
        matter: matterInput(),
        actor_id,
        member: {
          model_type: "MatterMember",
          tenant_id,
          matter_id: "matter-g4",
          member_id: "member-offboarded",
          employee_id: "emp-offboarded",
          user_id: "user-offboarded",
          role: "responsible_attorney",
          status: "active",
        },
      }),
    /Offboarded/,
  );
  const member = addMatterTeamMember({
    repository,
    employeeDirectory: employees,
    matter: matterInput(),
    actor_id,
    member: {
      model_type: "MatterMember",
      tenant_id,
      matter_id: "matter-g4",
      member_id: "member-active",
      employee_id: "emp-active",
      user_id: "user-active",
      role: "responsible_attorney",
      status: "active",
    },
  });
  assert.equal(member.employee_id, "emp-active");
});

test("Matter task, deadline, status history, report, close, and visibility runtime guards hold", () => {
  const repository = createMatterRepository({
    seedRecords: [
      matterInput(),
      {
        model_type: "MatterTask",
        tenant_id,
        matter_id: "matter-g4",
        task_id: "task-g4",
        title: "Draft motion",
        status: "todo",
        created_by: actor_id,
      },
      {
        model_type: "MatterCalendarEvent",
        tenant_id,
        matter_id: "matter-g4",
        event_id: "deadline-g4",
        title: "Filing deadline",
        status: "scheduled",
        starts_at: "2026-07-01T00:00:00.000Z",
      },
    ],
  });
  const audit = { append: (event) => repository.appendAudit({ ...event, event_id: `${event.action}:${event.object_id}` }) };
  const task = repository.get({ tenant_id, model_type: "MatterTask", task_id: "task-g4" });
  assert.equal(transitionMatterTask({ repository, task, to_status: "in_progress", actor_id, reason: "started", audit }).status, "in_progress");
  assert.throws(
    () => transitionMatterTask({ repository, task: { ...task, status: "done" }, to_status: "todo", actor_id, reason: "bad", audit }),
    /cannot transition/,
  );

  const event = repository.get({ tenant_id, model_type: "MatterCalendarEvent", event_id: "deadline-g4" });
  assert.equal(
    changeMatterDeadline({
      repository,
      event,
      new_starts_at: "2026-07-02T00:00:00.000Z",
      actor_id,
      reason: "court moved",
      audit,
    }).status,
    "rescheduled",
  );
  assert.throws(
    () =>
      confirmCriticalDeadlineChange({
        tenant_id,
        matter_id: "matter-g4",
        event_id: "deadline-g4",
        requester_user_id: "u1",
        confirmer_user_id: "u1",
        audit_ref: "audit-dual",
      }),
    /different confirmer/,
  );

  const history = createMatterStatusHistoryStore();
  history.append({
    tenant_id,
    matter_id: "matter-g4",
    from_status: "opening",
    to_status: "open",
    actor_id,
    reason: "approved",
    audit_ref: "audit-status",
  });
  assert.throws(() => history.update(), /append-only/);

  const report = createMatterClientReportProjection({
    tenant_id,
    matter_id: "matter-g4",
    report_id: "report-g4",
    sections: [{ title: "Summary", client_visible: true, conflict_memo: "hidden", body: "visible" }],
  });
  assert.deepEqual(report.removed_fields, ["conflict_memo"]);

  assert.equal(closeMatter({ repository, matter: matterInput(), blockers: [{ status: "open" }], actor_id, audit }).outcome, "blocked");
  assert.equal(filterVisibleMatters({ matters: [matterInput(), { ...matterInput({ matter_id: "silent" }), silent: true }] }).matters.length, 1);
});

test("Matter audit events are complete and timeline read model is permission filtered", () => {
  const event = createMatterAuditEvent({
    event_id: "audit-g4-event",
    tenant_id,
    actor_id,
    action: "matter.read",
    object_type: "Matter",
    object_id: "matter-g4",
    decision: "allow",
    reason: "viewed",
  });
  assert.equal(typeof event.event_hash, "string");

  const timeline = buildMatterTimelineReadModel({
    tenant_id,
    matter_id: "matter-g4",
    actor: { scopes: ["matter:read"] },
    entries: [
      { tenant_id, matter_id: "matter-g4", event_id: "visible", occurred_at: "2026-06-20", type: "task", title: "Visible", required_scope: "matter:read" },
      { tenant_id, matter_id: "matter-g4", event_id: "hidden", occurred_at: "2026-06-20", type: "memo", title: "Hidden", required_scope: "matter:secret" },
    ],
  });
  assert.equal(timeline.visible_entries.length, 1);
  assert.equal(timeline.omitted_entry_count, null);
  assert.equal(timeline.count_leak_prevented, true);
});

test("Matter intake dependency guard blocks direct Opportunity to Matter creation", () => {
  const decision = matterOpeningDependencyDecision({ tenant_id, opportunity_id: "opp-g4" });
  assert.equal(decision.outcome, "blocked");
  assert.equal(decision.safe_error_code, "MATTER_INTAKE_DEPENDENCY_REQUIRED");
});
