// Deterministic in-process tests for the CMP-G4 Matter opening runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g4-matter-ops";
const MATTER_ID = "matter-cmp-g4-runtime";
const CLEARANCE_TOKEN_ID = "clearance-cmp-g4-runtime";
const IDEMPOTENCY_KEY = "idem-cmp-g4-opening";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

async function createRuntimeMatter() {
  await json(`/api/matter/clearance-tokens?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      clearance_token_id: CLEARANCE_TOKEN_ID,
      intake_request_id: "intake-cmp-g4-runtime",
      conflict_check_id: "conflict-cmp-g4-runtime",
      engagement_id: "engagement-cmp-g4-runtime",
      snapshot_hash: "snapshot-cmp-g4-runtime",
      current_snapshot_hash: "snapshot-cmp-g4-runtime",
    }),
  });
  await json(`/api/matter/matter-numbers/reservations?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_number: "M-CMP-G4-001",
      matter_number_seed: "cmp g4 runtime",
      idempotency_key: "idem-cmp-g4-number",
    }),
  });
  return json(`/api/matter/matters?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      title: "CMP G4 Runtime Matter",
      legal_client_party_id: "party-cmp-g4-legal-client",
      billing_client_party_id: "party-cmp-g4-billing-client",
      billing_profile_id: "billing-profile-cmp-g4",
      clearance_token_id: CLEARANCE_TOKEN_ID,
      matter_number: "M-CMP-G4-001",
      matter_number_seed: "cmp g4 runtime",
      acl_ref: "acl-cmp-g4",
      dms_workspace_ref: "dms-workspace-cmp-g4",
      billing_ref: "billing-cmp-g4",
      idempotency_key: IDEMPOTENCY_KEY,
      responsible_attorney_user_id: "user-cmp-g4-owner",
    }),
  });
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G4 health descriptor exposes Matter Core after G1, G2, and G3", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const matter = body.bounded_contexts.find((context) => context.bounded_context === "matter-core");
  assert.ok(matter);
  assert.equal(matter.cmp_gate, "CMP-G4");
  assert.deepEqual(matter.depends_on, ["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03"]);
  assert.equal(matter.tuw_ids.length, 23);
  assert.equal(matter.tuw_ids[0], "CMP-G4-W04-T001");
  assert.equal(matter.tuw_ids.at(-1), "CMP-G4-W04-T023");
  assert.equal(matter.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G4 blocks Matter opening without CRM/Intake clearance and direct Opportunity shortcut", async () => {
  const missingClearance = await json(`/api/matter/matters?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: "matter-cmp-g4-no-clearance",
      title: "No clearance",
      legal_client_party_id: "party-cmp-g4",
      acl_ref: "acl",
      dms_workspace_ref: "dms",
      billing_ref: "billing",
      idempotency_key: "idem-no-clearance",
    }),
  });
  assert.equal(missingClearance.status, 400);
  assert.equal(missingClearance.body.safe_error_code, "CMP_G4_CLEARANCE_REQUIRED");
  assert.ok(missingClearance.body.blocked_claims.includes("g3_clearance_required_before_matter_opening"));

  const shortcutToken = await json(`/api/matter/clearance-tokens?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      clearance_token_id: "clearance-cmp-g4-shortcut",
      create_matter: true,
    }),
  });
  assert.equal(shortcutToken.status, 400);
  assert.equal(shortcutToken.body.safe_error_code, "CMP_G4_CLEARANCE_BLOCKED");
  assert.ok(shortcutToken.body.token.blocked_claims.includes("intake_to_matter_runtime_still_closed"));
});

test("CMP-G4 creates a clearance-gated Matter with atomic refs, wiki shell, graph skeleton, and idempotent replay", async () => {
  const opened = await createRuntimeMatter();
  assert.equal(opened.status, 201);
  assert.equal(opened.body.matter.matter_id, MATTER_ID);
  assert.equal(opened.body.matter.clearance_token_id, CLEARANCE_TOKEN_ID);
  assert.equal(opened.body.opening_transaction.outcome, "review_required");
  assert.equal(opened.body.opening_transaction.atomic_refs.acl_ref, "acl-cmp-g4");
  assert.equal(opened.body.opening_transaction.atomic_refs.dms_workspace_ref, "dms-workspace-cmp-g4");
  assert.equal(opened.body.opening_transaction.atomic_refs.billing_ref, "billing-cmp-g4");
  assert.equal(opened.body.opening_transaction.transaction_receipt.partial_state_allowed, false);
  assert.equal(opened.body.wiki_shell.writes_product_state, false);
  assert.equal(opened.body.graph_skeleton.cross_matter_similarity_enabled, false);
  assert.ok(opened.body.tuw_ids.includes("CMP-G4-W04-T021"));
  assert.ok(opened.body.tuw_ids.includes("CMP-G4-W04-T022"));

  const replay = await createRuntimeMatter();
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.idempotent_replay_detected, true);
});

test("CMP-G4 validates Matter staffing role permission and trims team visibility", async () => {
  const blocked = await json(`/api/matter/matters/${MATTER_ID}/members?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      member_id: "member-cmp-g4-blocked",
      user_id: "user-cmp-g4-unknown",
      role: "unknown_role",
      role_permissions: { responsible_attorney: true },
    }),
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.safe_error_code, "CMP_G4_MEMBER_PERMISSION_BLOCKED");
  assert.ok(blocked.body.descriptor.blocked_claims.includes("matter_member_role_unknown"));

  const created = await json(`/api/matter/matters/${MATTER_ID}/members?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      member_id: "member-cmp-g4-associate",
      user_id: "user-cmp-g4-associate",
      role: "associate",
      role_permissions: { associate: true },
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.descriptor.outcome, "review_required");

  const team = await json(`/api/matter/matters/${MATTER_ID}/members?${query()}`);
  assert.equal(team.status, 200);
  assert.equal(team.body.team.unauthorized_count_leaked, false);
  assert.ok(team.body.team.visible_members.some((member) => member.member_id === "member-cmp-g4-associate"));
});

test("CMP-G4 audits task transition, deadline change, dual control, and immutable status history", async () => {
  const task = await json(`/api/matter/matters/${MATTER_ID}/tasks/task-${MATTER_ID}-opening/transitions?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      to_status: "in_progress",
      transition_reason: "Opening work started",
      audit_ref: "audit-cmp-g4-task",
    }),
  });
  assert.equal(task.status, 200);
  assert.equal(task.body.descriptor.transition_receipt.status_transition_tested, true);

  const deadline = await json(`/api/matter/matters/${MATTER_ID}/calendar/deadline-${MATTER_ID}-filing/deadline-change?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      new_starts_at: "2026-07-02T00:00:00.000Z",
      new_ends_at: "2026-07-02T01:00:00.000Z",
      change_reason: "Court changed the filing date",
      audit_ref: "audit-cmp-g4-deadline",
    }),
  });
  assert.equal(deadline.status, 200);
  assert.equal(deadline.body.descriptor.deadline_receipt.deadline_change_audit_required, true);

  const dual = await json(`/api/matter/matters/${MATTER_ID}/calendar/deadline-${MATTER_ID}-filing/dual-control?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      requester_user_id: "user-cmp-g4-owner",
      confirmer_user_id: "user-cmp-g4-partner",
      confirmation_audit_ref: "audit-cmp-g4-dual",
    }),
  });
  assert.equal(dual.status, 200);
  assert.equal(dual.body.descriptor.dual_control_receipt.two_person_confirmation_required, true);

  const status = await json(`/api/matter/matters/${MATTER_ID}/status-history?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      to_status: "open",
      reason: "Opening foundation reviewed",
      audit_ref: "audit-cmp-g4-status",
    }),
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.descriptor.history_record.immutable_history, true);
  assert.equal(status.body.matter.status, "open");
});

test("CMP-G4 projects client reports and dashboard without privileged or silent Matter leakage", async () => {
  const projection = await json(`/api/matter/matters/${MATTER_ID}/client-report/projection?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      client_report_id: "client-report-cmp-g4",
      source_report: {
        conflict_memo: "do not expose",
        sections: [
          { section_id: "summary", body: "Safe summary", client_visible: true, conflict_memo: "hidden" },
          { section_id: "strategy", body: "Privileged", privileged: true, client_visible: false },
        ],
      },
    }),
  });
  assert.equal(projection.status, 200);
  assert.equal(projection.body.projection.visible_sections.length, 1);
  assert.ok(projection.body.projection.removed_fields.includes("conflict_memo"));
  assert.equal(projection.body.projection.unauthorized_count_leaked, false);

  const dashboard = await json(`/api/matter/dashboard?${query({ selected_matter_id: MATTER_ID })}`);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.dashboard.unauthorized_count_exposed, null);
  assert.equal(dashboard.body.dashboard.dashboard_receipt.hidden_fields_removed, true);
});

test("CMP-G4 closing checklist blocks WIP before clean closeout review", async () => {
  const blocked = await json(`/api/matter/matters/${MATTER_ID}/closing-checklist?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      closing_metrics: {
        open_wip_amount: 25,
        open_ar_amount: 0,
        open_hold_count: 0,
        unresolved_task_count: 0,
        retention_acknowledged: true,
        final_invoice_reviewed: true,
      },
    }),
  });
  assert.equal(blocked.status, 400);
  assert.ok(blocked.body.descriptor.blocked_claims.includes("matter_closing_wip_open"));

  await json(`/api/matter/matters/${MATTER_ID}/status-history?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      to_status: "closing",
      reason: "Move to closing review",
      audit_ref: "audit-cmp-g4-closing-status",
    }),
  });

  const clean = await json(`/api/matter/matters/${MATTER_ID}/closing-checklist?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      closing_metrics: {
        open_wip_amount: 0,
        open_ar_amount: 0,
        open_hold_count: 0,
        unresolved_task_count: 0,
        retention_acknowledged: true,
        final_invoice_reviewed: true,
      },
    }),
  });
  assert.equal(clean.status, 200);
  assert.equal(clean.body.closing.outcome, "review_required");
  assert.equal(clean.body.closing.closing_receipt.closing_persisted, false);
});

test("CMP-G4 runtime evidence and audit preserve tenant scope and avoid durable R4 claims", async () => {
  const evidence = await json(`/api/matter/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G4");
  assert.equal(evidence.body.evidence.tuw_ids.length, 23);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");
  assert.equal(evidence.body.evidence.crm_intake_clearance_required_before_matter_opening, true);
  assert.equal(evidence.body.evidence.opportunity_to_matter_shortcut_blocked, true);
  assert.equal(evidence.body.evidence.durable_persistence_open, true);

  const audit = await json(`/api/matter/audit?${query()}`);
  assert.equal(audit.status, 200);
  assert.equal(audit.body.verification.ok, true);
  assert.ok(audit.body.events.length >= 5);
  assert.ok(audit.body.events.every((event) => event.tenant_id === TENANT));
});
