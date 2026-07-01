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
  deriveMatterCode,
  filterVisibleMatters,
  matterOpeningDependencyDecision,
  openMatterTransaction,
  upsertCanonicalMatterIdentity,
  upsertMatterAppClientFromVaultContract,
  upsertMatterAppMatterFromVaultContract,
  validateMatterCode,
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

test("Matter canonical identity upsert stores client and tenant-unique matter code idempotently", () => {
  const repository = createMatterRepository();
  assert.equal(validateMatterCode("AMIC/LIT/CIV/계약분쟁").valid, true);
  assert.equal(validateMatterCode("AMIC/Civil/계약분쟁").matter_code, "AMIC/LIT/CIV/계약분쟁");
  assert.equal(validateMatterCode("AMIC/LIT/계약분쟁").valid, false);
  assert.equal(validateMatterCode("AMIC/DISP/내용증명").matter_code, "AMIC/Dispute/내용증명");
  assert.equal(validateMatterCode("AMIC/Dispute/내용증명").valid, true);
  assert.equal(
    deriveMatterCode({
      client_short_name: "AMIC",
      matter_type_english: "Dispute",
      matter_detail_type_korean: "내용증명",
    }),
    "AMIC/Dispute/내용증명",
  );
  assert.throws(
    () =>
      deriveMatterCode({
        client_short_name: "A".repeat(112),
        matter_type_english: "LIT",
        matter_litigation_axis: "CIV",
        matter_detail_type_korean: "계약분쟁",
      }),
    /120 characters/,
  );

  const first = upsertCanonicalMatterIdentity({
    repository,
    idempotency_key: "idem-canonical-1",
    actor_id,
    client: {
      client_id: "client-amic",
      client_display_name: "(주)AMIC 주식회사",
    },
    matter: {
      matter_id: "matter-canonical-1",
      tenant_id,
      title: "Canonical migration matter",
      status: "opening",
      created_by: actor_id,
      created_at: "2026-06-20T00:00:00.000Z",
      matter_type_english: "LIT",
      matter_litigation_axis: "CIV",
      matter_detail_type_korean: "계약분쟁",
      permission_envelope_id: "perm-canonical",
      audit_trace_id: "audit-canonical",
      source_revision: "approval-rev-1",
    },
  });
  assert.equal(first.client.client_short_name, "AMIC");
  assert.equal(first.matter.matter_code, "AMIC/LIT/CIV/계약분쟁");
  assert.equal(first.matter.client_id, "client-amic");
  assert.equal(repository.list({ tenant_id, model_type: "MatterClient" }).length, 1);
  assert.equal(repository.list({ tenant_id, model_type: "Matter" }).length, 1);

  const replay = upsertCanonicalMatterIdentity({
    repository,
    idempotency_key: "idem-canonical-1",
    actor_id,
    client: {
      client_id: "client-amic",
      client_display_name: "(주)AMIC 주식회사",
    },
    matter: {
      matter_id: "matter-canonical-1",
      tenant_id,
      title: "Canonical migration matter",
      status: "opening",
      created_by: actor_id,
      created_at: "2026-06-20T00:00:00.000Z",
      matter_type_english: "LIT",
      matter_litigation_axis: "CIV",
      matter_detail_type_korean: "계약분쟁",
      permission_envelope_id: "perm-canonical",
      audit_trace_id: "audit-canonical",
      source_revision: "approval-rev-1",
    },
  });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id, model_type: "Matter" }).length, 1);

  assert.throws(
    () =>
      upsertCanonicalMatterIdentity({
        repository,
        idempotency_key: "idem-canonical-2",
        actor_id,
        client: {
          client_id: "client-amic",
          client_display_name: "(주)AMIC 주식회사",
        },
        matter: {
          matter_id: "matter-canonical-2",
          tenant_id,
          title: "Duplicate canonical migration matter",
          status: "opening",
          created_by: actor_id,
          created_at: "2026-06-20T00:00:00.000Z",
          matter_type_english: "LIT",
          matter_litigation_axis: "CIV",
          matter_detail_type_korean: "계약분쟁",
          permission_envelope_id: "perm-canonical",
          audit_trace_id: "audit-canonical",
          source_revision: "approval-rev-1",
        },
      }),
    /Matter code already exists/,
  );
});

test("Vault approved write contract maps client and matter code into Matter app identity", () => {
  const repository = createMatterRepository();
  const clientRequest = {
    tenantRef: tenant_id,
    idempotencyKeyHash: "hash:vault-client-1",
    clientDisplayName: "(주)Vault 반영 주식회사",
    clientShortName: "Vault 반영",
    approvalRef: "approval-ref-1",
    sourceRevision: "approval-rev-2",
    migrationApprovalRef: "migration-approval-1",
    supportingEvidenceRefs: ["evidence-ref-1"],
  };
  const client = upsertMatterAppClientFromVaultContract({
    repository,
    request: clientRequest,
    actor_id,
  });
  assert.equal(client.clientDisplayName, "(주)Vault 반영 주식회사");
  assert.equal(client.client.client_short_name, "Vault 반영");
  assert.equal(client.sourceRevision, "approval-rev-2");
  assert.equal(client.action, "created");

  const reusedClient = upsertMatterAppClientFromVaultContract({
    repository,
    request: {
      ...clientRequest,
      idempotencyKeyHash: "hash:vault-client-2",
      approvalRef: "approval-ref-2",
      sourceRevision: "approval-rev-3",
      migrationApprovalRef: "migration-approval-2",
    },
    actor_id,
  });
  assert.equal(reusedClient.clientId, client.clientId);
  assert.equal(reusedClient.action, "reused");
  assert.equal(repository.list({ tenant_id, model_type: "MatterClient" }).length, 1);

  const matterRequest = {
    tenantRef: tenant_id,
    idempotencyKeyHash: "hash:vault-matter-1",
    clientId: client.clientId,
    clientDisplayName: client.clientDisplayName,
    matterCode: "Vault 반영/LIT/CIV/계약분쟁",
    matterName: "Vault reflected approved matter",
    matterTypeEnglish: "LIT",
    matterLitigationAxis: "CIV",
    matterDetailTypeKorean: "계약분쟁",
    clientCaseRole: "피고",
    clientCaseRoleConfidence: "test_contract",
    practiceGroup: "litigation",
    responsibleLawyer: "lawyer-ref-1",
    openedAt: "2026-06-24T00:00:00.000Z",
    sourceRevision: "approval-rev-2",
    sourceUpdatedAt: "2026-06-24T00:00:00.000Z",
    migrationApprovalRef: "migration-approval-1",
  };
  const matter = upsertMatterAppMatterFromVaultContract({
    repository,
    request: matterRequest,
    actor_id,
  });
  assert.equal(matter.matterCode, "Vault 반영/LIT/CIV/계약분쟁");
  assert.equal(matter.clientId, client.clientId);
  assert.equal(matter.sourceRevision, "approval-rev-2");
  assert.equal(matter.action, "created");
  assert.equal(matter.matter.practice_group, "litigation");
  assert.equal(matter.matter.responsible_lawyer, "lawyer-ref-1");
  assert.equal(matter.matter.source_updated_at, "2026-06-24T00:00:00.000Z");
  assert.equal(matter.matter.client_case_role, "피고");
  assert.equal(matter.matter.client_case_role_confidence, "test_contract");

  const replay = upsertMatterAppMatterFromVaultContract({
    repository,
    request: matterRequest,
    actor_id,
  });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.action, "skipped_idempotent");
  assert.equal(repository.list({ tenant_id, model_type: "MatterClient" }).length, 1);
  assert.equal(repository.list({ tenant_id, model_type: "Matter" }).length, 1);

  const dealMatter = upsertMatterAppMatterFromVaultContract({
    repository,
    request: {
      ...matterRequest,
      idempotencyKeyHash: "hash:vault-matter-deal-target-prefix",
      matterAppMatterId: "matter-vault-deal-target-prefix",
      matterCode: "대상회사/DEAL/Project Jade",
      matterName: "대상회사/DEAL/Project Jade",
      matterTypeEnglish: "DEAL",
      matterLitigationAxis: null,
      matterDetailTypeKorean: "Project Jade",
      matterCodeClientShortName: "대상회사",
    },
    actor_id,
  });
  assert.equal(dealMatter.matterCode, "대상회사/DEAL/Project Jade");
  assert.equal(dealMatter.clientId, client.clientId);
  assert.equal(dealMatter.matter.client_display_name, client.clientDisplayName);
  assert.equal(dealMatter.matter.matter_code_client_short_name, "대상회사");

  assert.throws(
    () =>
      upsertMatterAppMatterFromVaultContract({
        repository,
        request: {
          ...matterRequest,
          idempotencyKeyHash: "hash:vault-matter-2",
          matterAppMatterId: "matter-vault-duplicate",
        },
        actor_id,
      }),
    /Matter code already exists/,
  );
  assert.throws(
    () =>
      upsertMatterAppMatterFromVaultContract({
        repository,
        request: {
          ...matterRequest,
          idempotencyKeyHash: "hash:vault-matter-bad-code",
          matterCode: "Wrong/LIT/CIV/계약분쟁",
        },
        actor_id,
      }),
    /matterCode must match/,
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
    client: {
      client_id: "client-g4",
      client_display_name: "G4 Client LLC",
    },
    require_canonical_matter_code: true,
    matter: matterInput({
      matter_id: "matter-g4-opened",
      matter_type_english: "LIT",
      matter_litigation_axis: "CIV",
      matter_detail_type_korean: "개시",
      source_revision: "approval-rev-opening",
    }),
    clearance_token: clearanceToken(),
    matter_number_seed: "Opening Success",
    idempotency_key: "idem-opening-ok",
    actor_id,
    dms: { createWorkspace: ({ matter_id }) => ({ workspace_id: `workspace-${matter_id}` }) },
    billing: { createMatterLedger: ({ matter_id }) => ({ ledger_id: `ledger-${matter_id}` }) },
  });
  assert.equal(result.outcome, "created");
  assert.equal(result.matter.matter_code, "G4 Client/LIT/CIV/개시");
  assert.equal(repository.list({ tenant_id, model_type: "MatterClient" }).length, 1);
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
