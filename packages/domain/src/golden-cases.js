import { executeCoreDomainApiContract } from "./api.js";
import { createCoreDomainSyntheticFixtureSet, executeCoreDomainSyntheticFixtureWorkflow } from "./fixtures.js";
import { executeCoreDomainWorkflow } from "./workflow.js";

export const CORE_DOMAIN_GOLDEN_CASE_PACK_BINDING = Object.freeze({
  pack_id: "CP00-097",
  planned_pack_id: "CP00-097",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P02.M06.S07-RP01.P04.M02.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
});

export const CORE_DOMAIN_GOLDEN_CASE_CONTRACT = Object.freeze({
  pack_id: "CP00-097",
  contract_id: "core_domain_cp097_golden_case_set",
  synthetic_only: true,
  uses_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
});

export function buildCoreDomainGoldenCaseSet() {
  const fixture = createCoreDomainSyntheticFixtureSet({ request_id: "req_rp01_cp097" });
  const happy = executeCoreDomainWorkflow(fixture.request, fixture.context);
  const review = executeCoreDomainWorkflow(fixture.request, { ...fixture.context, review_required: true });
  const approval = executeCoreDomainWorkflow({ ...fixture.request, operation: "archive" }, { ...fixture.context, approval_required: true });
  const deniedFixture = createCoreDomainSyntheticFixtureSet({ permission_effect: "deny", request_id: "req_rp01_cp097_denied" });
  const denied = executeCoreDomainWorkflow(deniedFixture.request, deniedFixture.context);
  const lockKey = `${fixture.request.tenant_id}:${fixture.request.entity_type}:${fixture.request.matter_id}:${fixture.request.operation}`;
  const locked = executeCoreDomainWorkflow(fixture.request, { ...fixture.context, active_locks: [lockKey] });
  const replayed = executeCoreDomainWorkflow(fixture.request, { ...fixture.context, existing_idempotency_keys: [fixture.request.idempotency_key] });
  const persistenceBlocked = executeCoreDomainWorkflow(fixture.request, { ...fixture.context, persistence_target: "database" });
  const apiOmission = executeCoreDomainApiContract(
    {
      endpoint_id: "core_domain.documents.list",
      tenant_id: fixture.tenant.tenant_id,
      actor_user_id: fixture.actor.user_id,
      matter_id: fixture.matter.matter_id,
      requested_at: "2026-06-08T07:10:00.000Z",
      visibility: {
        entity_type: "DocumentReference",
        visible_fields: ["document_id", "matter_id"],
        allowed_record_ids: [fixture.document.document_id],
      },
    },
    { records: [fixture.document], entity_type: "DocumentReference" },
  );

  return Object.freeze([
    Object.freeze({ id: "workflow_happy_path", expected_status: "completed", result: happy }),
    Object.freeze({ id: "workflow_review_required", expected_route: "review_required", result: review }),
    Object.freeze({ id: "workflow_approval_required", expected_route: "approval_required", result: approval }),
    Object.freeze({ id: "permission_reference_denied", expected_status: "blocked", result: denied }),
    Object.freeze({ id: "lock_retry", expected_status: "blocked", result: locked }),
    Object.freeze({ id: "idempotency_replay", expected_status: "replayed", result: replayed }),
    Object.freeze({ id: "persistence_boundary_violation", expected_status: "blocked", result: persistenceBlocked }),
    Object.freeze({ id: "api_unauthorized_data_omission", expected_status: "completed", result: apiOmission }),
  ]);
}

export function createCoreDomainHermesEvidencePacket() {
  const cases = buildCoreDomainGoldenCaseSet();
  return Object.freeze({
    pack_id: "CP00-097",
    evidence_packet_id: "core_domain_cp097_hermes_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    case_count: cases.length,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-097",
    ]),
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
    }),
  });
}

export function createCoreDomainClaudeReviewPacket() {
  return Object.freeze({
    pack_id: "CP00-097",
    review_packet_id: "core_domain_cp097_claude_review_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    scope: "CP00-097 synthetic API, golden-case, Hermes evidence, Claude review, closeout handoff, and UI surface contracts",
  });
}

export function createCoreDomainCloseoutHandoff() {
  return Object.freeze({
    pack_id: "CP00-097",
    current_range: "RP01.P02.M06.S07-RP01.P04.M02.S03",
    next_pack_id: "CP00-098",
    next_subphase_id: "RP01.P04.M02.S04",
    handoff_scope: "continue RP01.P04 UI surface typing from loading state into empty state and following UI contracts",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function createCoreDomainUiSurfaceInventory() {
  return Object.freeze([
    Object.freeze({
      surface_id: "core_domain_entity_directory",
      data_dependencies: Object.freeze(["Entity", "Person", "Organization", "Client"]),
      loading_state: "skeleton_rows_without_real_client_data",
      empty_state: "no_synthetic_entities_available",
      writes_product_state: false,
    }),
    Object.freeze({
      surface_id: "matter_trace_panel",
      data_dependencies: Object.freeze(["Matter", "MatterMember", "MatterStatusHistory"]),
      loading_state: "trace_summary_placeholder",
      empty_state: "no_matter_trace_selected",
      writes_product_state: false,
    }),
    Object.freeze({
      surface_id: "document_reference_panel",
      data_dependencies: Object.freeze(["DocumentReference", "DocumentVersionReference"]),
      loading_state: "document_reference_placeholder",
      empty_state: "no_synthetic_document_references",
      writes_product_state: false,
    }),
  ]);
}

export function validateCoreDomainCp097Coverage() {
  const cases = buildCoreDomainGoldenCaseSet();
  const evidence = createCoreDomainHermesEvidencePacket();
  const review = createCoreDomainClaudeReviewPacket();
  const handoff = createCoreDomainCloseoutHandoff();
  const ui = createCoreDomainUiSurfaceInventory();
  const fixtureWorkflow = executeCoreDomainSyntheticFixtureWorkflow({ request_id: "req_rp01_cp097_fixture" });
  const errors = [];
  if (cases.length < 8) errors.push("golden case set must include at least 8 cases");
  if (cases.some((item) => item.result.writes_product_state !== false)) errors.push("golden cases must not write product state");
  if (cases.some((item) => item.result.audit_written === true || item.result.writes_audit_event === true)) errors.push("golden cases must not write audit events");
  if (cases.some((item) => item.result.permission_evaluated === true || item.result.evaluates_runtime_permission === true)) {
    errors.push("golden cases must not evaluate runtime permission");
  }
  if (ui.some((surface) => surface.writes_product_state !== false)) errors.push("UI surfaces must remain no-write");
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    golden_case_count: cases.length,
    ui_surface_count: ui.length,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
    fixture_status: fixtureWorkflow.result.status,
  });
}
