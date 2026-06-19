import { createCoreDomainSyntheticFixtureSet } from "./fixtures.js";
import {
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT,
} from "./fixture-catalog.js";

export const CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING = Object.freeze({
  pack_id: "CP00-102",
  planned_pack_id: "CP00-102",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P05.M09.S04-RP01.P06.M08.S16",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_fixture_catalog_pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
});

const CP102_MICRO_PHASES = Object.freeze([
  "RP01.P05.M09",
  "RP01.P05.M10",
  "RP01.P06.M00",
  "RP01.P06.M01",
  "RP01.P06.M02",
  "RP01.P06.M03",
  "RP01.P06.M04",
  "RP01.P06.M05",
  "RP01.P06.M06",
  "RP01.P06.M07",
  "RP01.P06.M08",
]);

const CP102_ACTION_BINDINGS = Object.freeze([
  "view",
  "search",
  "mutation",
  "export_download",
  "share",
  "ai_retrieval",
]);

const CP102_INTERACTION_BINDINGS = Object.freeze([
  "legal_hold",
  "ethical_wall",
  "object_acl",
  "review_required_route",
  "approval_required_route",
  "security_trimming",
  "audit_event_expectation",
  "permission_fixture",
  "allowed_test",
  "denied_test",
]);

export const CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT = Object.freeze({
  pack_id: "CP00-102",
  contract_id: "core_domain_cp102_permission_matrix_contract",
  source_unit_range: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.range,
  upstream_fixture_catalog_contract_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  ldip_implemented: false,
  action_bindings: CP102_ACTION_BINDINGS,
  interaction_bindings: CP102_INTERACTION_BINDINGS,
  covered_micro_phase_ids: CP102_MICRO_PHASES,
  permission_policy: "reference_matrix_only_until_rp02_permission_kernel",
  audit_policy: "audit_hint_expectation_only_until_rp03_audit_kernel",
  security_trimming_policy: "expected_omission_proof_only_no_runtime_filtering",
  deny_over_allow_policy: "deny_reference_wins_in_static_matrix",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "database_row_created",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

function freezeMatrixRow(row) {
  return Object.freeze({
    ...row,
    source_micro_phase_ids: Object.freeze(row.source_micro_phase_ids ?? []),
    matched_rule_capture_fields: Object.freeze(row.matched_rule_capture_fields ?? []),
    audit_hint_fields: Object.freeze(row.audit_hint_fields ?? []),
    blocked_claims: Object.freeze(row.blocked_claims ?? []),
  });
}

export function createCoreDomainCp102PermissionMatrixRows() {
  const sourceMicroPhaseIds = CP102_MICRO_PHASES.filter((micro) => micro.startsWith("RP01.P06"));
  return Object.freeze([
    freezeMatrixRow({
      row_id: "permission_matrix_view",
      action: "view",
      decision_binding: "allow_reference",
      route: "ready",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["policy_id", "principal_id", "object_id", "action", "effect"],
      audit_hint_fields: ["audit_event_id", "action", "occurred_at"],
      security_trimmed: false,
    }),
    freezeMatrixRow({
      row_id: "permission_matrix_search",
      action: "search",
      decision_binding: "allow_with_security_trimming_reference",
      route: "ready",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["policy_id", "query_scope", "allowed_record_ids", "omitted_record_count"],
      audit_hint_fields: ["audit_event_id", "search_action", "occurred_at"],
      security_trimmed: true,
    }),
    freezeMatrixRow({
      row_id: "permission_matrix_mutation",
      action: "mutation",
      decision_binding: "review_required_reference",
      route: "review_required",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["policy_id", "mutation_type", "review_policy_id", "effect"],
      audit_hint_fields: ["audit_event_id", "mutation_reference", "occurred_at"],
      security_trimmed: false,
    }),
    freezeMatrixRow({
      row_id: "permission_matrix_export_download",
      action: "export_download",
      decision_binding: "approval_required_reference",
      route: "approval_required",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["policy_id", "export_scope", "approval_policy_id", "effect"],
      audit_hint_fields: ["audit_event_id", "export_reference", "occurred_at"],
      security_trimmed: true,
    }),
    freezeMatrixRow({
      row_id: "permission_matrix_share",
      action: "share",
      decision_binding: "approval_required_external_share_reference",
      route: "approval_required",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["policy_id", "share_scope", "external_party_ref", "effect"],
      audit_hint_fields: ["audit_event_id", "share_reference", "occurred_at"],
      security_trimmed: true,
    }),
    freezeMatrixRow({
      row_id: "permission_matrix_ai_retrieval",
      action: "ai_retrieval",
      decision_binding: "review_required_ai_reference",
      route: "review_required",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["policy_id", "retrieval_scope", "model_context_ref", "effect"],
      audit_hint_fields: ["audit_event_id", "ai_retrieval_reference", "occurred_at"],
      security_trimmed: true,
    }),
    freezeMatrixRow({
      row_id: "permission_matrix_deny_over_allow",
      action: "view",
      decision_binding: "deny_reference_overrides_allow",
      route: "blocked",
      source_micro_phase_ids: sourceMicroPhaseIds,
      matched_rule_capture_fields: ["allow_policy_id", "deny_policy_id", "principal_id", "object_id", "effect"],
      audit_hint_fields: ["audit_event_id", "deny_reference", "occurred_at"],
      blocked_claims: ["deny_reference_overrides_allow"],
      security_trimmed: true,
    }),
  ].map((row) =>
    Object.freeze({
      ...row,
      pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
      synthetic_only: true,
      uses_real_client_data: false,
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
      ldip_implemented: false,
      permission_reference_only: true,
      audit_hint_only: true,
    }),
  ));
}

export function createCoreDomainCp102SecurityInteractionSet() {
  const fixture = createCoreDomainSyntheticFixtureSet({
    request_id: "req_rp01_cp102_security",
    permission_id: "perm_rp01_cp102_reference",
    audit_event_id: "audit_ref_rp01_cp102_hint",
  });
  const base = {
    pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
    tenant_id: fixture.tenant.tenant_id,
    matter_id: fixture.matter.matter_id,
    document_id: fixture.document.document_id,
    permission_id: fixture.permission.permission_id,
    audit_event_id: fixture.audit.audit_event_id,
    synthetic_only: true,
    uses_real_client_data: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
    creates_database_rows: false,
    ldip_implemented: false,
  };
  return Object.freeze([
    Object.freeze({ ...base, interaction_id: "legal_hold", route: "blocked", blocked_claim: "legal_hold_requires_audit_kernel_reference" }),
    Object.freeze({ ...base, interaction_id: "ethical_wall", route: "blocked", blocked_claim: "ethical_wall_reference_blocks_access" }),
    Object.freeze({ ...base, interaction_id: "object_acl", route: "blocked", blocked_claim: "object_acl_deny_reference" }),
    Object.freeze({ ...base, interaction_id: "review_required_route", route: "review_required", blocked_claim: null }),
    Object.freeze({ ...base, interaction_id: "approval_required_route", route: "approval_required", blocked_claim: null }),
    Object.freeze({ ...base, interaction_id: "security_trimming", route: "ready", omitted_record_count: 1 }),
    Object.freeze({ ...base, interaction_id: "audit_event_expectation", route: "ready", audit_expectation_only: true }),
    Object.freeze({ ...base, interaction_id: "permission_fixture", route: "ready", permission_fixture_only: true }),
    Object.freeze({ ...base, interaction_id: "allowed_test", route: "ready", expected_status: "allowed_reference" }),
    Object.freeze({ ...base, interaction_id: "denied_test", route: "blocked", expected_status: "denied_reference" }),
  ]);
}

export function createCoreDomainCp102PermissionFixtureManifest() {
  const rows = createCoreDomainCp102PermissionMatrixRows();
  const interactions = createCoreDomainCp102SecurityInteractionSet();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp102_permission_matrix_fixture_manifest",
    source_unit_range: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.range,
    covered_unit_count: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.unit_count,
    covered_micro_phase_ids: CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.covered_micro_phase_ids,
    action_binding_count: CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.action_bindings.length,
    matrix_row_count: rows.length,
    interaction_count: interactions.length,
    security_trimmed_row_count: rows.filter((row) => row.security_trimmed === true).length,
    blocked_interaction_count: interactions.filter((item) => item.route === "blocked").length,
    synthetic_only: true,
    no_real_data: true,
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
    }),
  });
}

export function createCoreDomainCp102HermesEvidencePacket() {
  const manifest = createCoreDomainCp102PermissionFixtureManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp102_permission_matrix_hermes_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    matrix_row_count: manifest.matrix_row_count,
    interaction_count: manifest.interaction_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-102",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp102ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp102_permission_matrix_claude_review_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-102 permission matrix and security interaction catalog are reference-only, synthetic-only, no-write, no-real-data, and do not implement RP02 runtime permission evaluation, RP03 audit writes, or LDIP.",
  });
}

export function createCoreDomainCp102CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.range,
    next_pack_id: "CP00-103",
    next_subphase_id: "RP01.P06.M08.S17",
    handoff_scope: "continue RP01.P06 Hermes evidence packet from audit event expectation through the next generated pack boundary",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp102Coverage() {
  const rows = createCoreDomainCp102PermissionMatrixRows();
  const interactions = createCoreDomainCp102SecurityInteractionSet();
  const manifest = createCoreDomainCp102PermissionFixtureManifest();
  const evidence = createCoreDomainCp102HermesEvidencePacket();
  const review = createCoreDomainCp102ClaudeReviewPacket();
  const handoff = createCoreDomainCp102CloseoutHandoff();
  const errors = [];
  for (const action of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.action_bindings) {
    if (!rows.some((row) => row.action === action)) errors.push(`CP00-102 permission matrix missing action ${action}`);
  }
  for (const interaction of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.interaction_bindings) {
    if (!interactions.some((item) => item.interaction_id === interaction) && !rows.some((row) => row.row_id.includes(interaction))) {
      errors.push(`CP00-102 permission matrix missing interaction ${interaction}`);
    }
  }
  if (manifest.covered_unit_count !== 150) errors.push("CP00-102 manifest must cover 150 units");
  if (manifest.covered_micro_phase_ids.length !== 11) errors.push("CP00-102 manifest must cover 11 micro phases");
  if (rows.length !== 7) errors.push("CP00-102 must expose 7 permission matrix rows");
  if (interactions.length !== 10) errors.push("CP00-102 must expose 10 security interactions");
  if (!rows.some((row) => row.decision_binding === "deny_reference_overrides_allow")) {
    errors.push("CP00-102 must include deny-over-allow reference row");
  }
  if (!interactions.some((item) => item.interaction_id === "security_trimming" && item.omitted_record_count > 0)) {
    errors.push("CP00-102 must include security trimming proof");
  }
  for (const item of [...rows, ...interactions]) {
    if (item.synthetic_only !== true || item.uses_real_client_data !== false) errors.push("CP00-102 items must be synthetic-only");
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("CP00-102 items must remain no-write and non-runtime");
    }
    if (item.creates_database_rows !== false || item.ldip_implemented !== false) {
      errors.push("CP00-102 items must not create database rows or implement LDIP");
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    matrix_row_count: rows.length,
    interaction_count: interactions.length,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}

export const CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING = Object.freeze({
  pack_id: "CP00-103",
  planned_pack_id: "CP00-103",
  risk_class: "A",
  unit_count: 10,
  range: "RP01.P06.M08.S17-RP01.P06.M09.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_permission_matrix_pack_id: CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
});

const CP103_UNIT_IDS = Object.freeze([
  "RP01.P06.M08.S17",
  "RP01.P06.M08.S18",
  "RP01.P06.M08.S19",
  "RP01.P06.M08.S20",
  "RP01.P06.M09.S01",
  "RP01.P06.M09.S02",
  "RP01.P06.M09.S03",
  "RP01.P06.M09.S04",
  "RP01.P06.M09.S05",
  "RP01.P06.M09.S06",
]);

const CP103_EVIDENCE_BINDINGS = Object.freeze([
  "audit_event_expectation",
  "permission_fixture",
  "allowed_test",
  "denied_test",
]);

const CP103_DECISION_BINDINGS = Object.freeze([
  "export_download",
  "share",
]);

export const CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT = Object.freeze({
  pack_id: "CP00-103",
  contract_id: "core_domain_cp103_permission_review_packet_contract",
  source_unit_range: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.range,
  upstream_permission_matrix_contract_id: CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  executes_export_download: false,
  executes_external_share: false,
  ldip_implemented: false,
  covered_unit_ids: CP103_UNIT_IDS,
  evidence_bindings: CP103_EVIDENCE_BINDINGS,
  decision_bindings: CP103_DECISION_BINDINGS,
  audit_event_expectation_policy: "expected_only_until_rp03_audit_kernel",
  permission_fixture_policy: "reference_only_until_rp02_permission_kernel",
  allowed_denied_test_policy: "expected_outcome_only_no_runtime_evaluation",
  export_policy: "approval_required_reference_no_download_execution",
  share_policy: "approval_required_reference_no_external_share_execution",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "database_row_created",
    "real_client_data_loaded",
    "export_download_executed",
    "external_share_executed",
    "ldip_implemented",
  ]),
});

function freezeCp103Item(item) {
  return Object.freeze({
    ...item,
    pack_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
    source_unit_ids: Object.freeze(item.source_unit_ids ?? []),
    expected_fields: Object.freeze(item.expected_fields ?? []),
    blocked_claims: Object.freeze(item.blocked_claims ?? []),
    synthetic_only: true,
    uses_real_client_data: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
    creates_database_rows: false,
    executes_export_download: false,
    executes_external_share: false,
    ldip_implemented: false,
  });
}

export function createCoreDomainCp103AuditPermissionReviewItems() {
  const fixture = createCoreDomainSyntheticFixtureSet({
    request_id: "req_rp01_cp103_review_packet",
    permission_id: "perm_rp01_cp103_reference",
    audit_event_id: "audit_ref_rp01_cp103_expectation",
  });
  const base = {
    tenant_id: fixture.tenant.tenant_id,
    user_id: fixture.actor.user_id,
    matter_id: fixture.matter.matter_id,
    document_id: fixture.document.document_id,
    permission_id: fixture.permission.permission_id,
    audit_event_id: fixture.audit.audit_event_id,
  };
  return Object.freeze([
    freezeCp103Item({
      ...base,
      item_id: "audit_event_expectation",
      kind: "audit_expectation",
      source_unit_ids: ["RP01.P06.M08.S17"],
      expected_status: "audit_expected_reference",
      expected_fields: ["audit_event_id", "tenant_id", "actor_user_id", "matter_id", "document_id", "action", "occurred_at"],
      audit_expectation_only: true,
    }),
    freezeCp103Item({
      ...base,
      item_id: "permission_fixture",
      kind: "permission_fixture",
      source_unit_ids: ["RP01.P06.M08.S18"],
      expected_status: "permission_fixture_reference",
      expected_fields: ["permission_id", "principal_type", "object_type", "action", "effect"],
      permission_fixture_only: true,
    }),
    freezeCp103Item({
      ...base,
      item_id: "allowed_test",
      kind: "expected_test",
      source_unit_ids: ["RP01.P06.M08.S19"],
      expected_status: "allowed_reference",
      expected_fields: ["permission_id", "expected_effect", "expected_route"],
      expected_effect: "allow",
      expected_route: "ready",
    }),
    freezeCp103Item({
      ...base,
      item_id: "denied_test",
      kind: "expected_test",
      source_unit_ids: ["RP01.P06.M08.S20"],
      expected_status: "denied_reference",
      expected_fields: ["permission_id", "expected_effect", "expected_route", "blocked_claims"],
      expected_effect: "deny",
      expected_route: "blocked",
      blocked_claims: ["deny_reference_blocks_access"],
    }),
  ]);
}

export function createCoreDomainCp103ExportShareDecisionBindings() {
  const fixtureUnits = ["RP01.P06.M09.S01", "RP01.P06.M09.S02", "RP01.P06.M09.S03", "RP01.P06.M09.S04"];
  return Object.freeze([
    freezeCp103Item({
      item_id: "export_decision_binding",
      kind: "decision_binding",
      action: "export_download",
      decision_binding: "approval_required_reference",
      route: "approval_required",
      source_unit_ids: [...fixtureUnits, "RP01.P06.M09.S05"],
      expected_fields: ["tenant_id", "user_id", "matter_id", "document_id", "permission_id", "audit_event_id", "approval_policy_id"],
      approval_required: true,
      audit_event_expected: true,
      download_generated: false,
      blocked_claims: ["export_download_requires_future_approval_and_audit_kernel"],
    }),
    freezeCp103Item({
      item_id: "share_decision_binding",
      kind: "decision_binding",
      action: "share",
      decision_binding: "approval_required_external_share_reference",
      route: "approval_required",
      source_unit_ids: [...fixtureUnits, "RP01.P06.M09.S06"],
      expected_fields: ["tenant_id", "user_id", "matter_id", "document_id", "permission_id", "audit_event_id", "external_party_ref", "approval_policy_id"],
      approval_required: true,
      audit_event_expected: true,
      external_party_ref: "external_party_reference_only",
      blocked_claims: ["external_share_requires_future_approval_and_audit_kernel"],
    }),
  ]);
}

export function createCoreDomainCp103PermissionReviewManifest() {
  const reviewItems = createCoreDomainCp103AuditPermissionReviewItems();
  const decisions = createCoreDomainCp103ExportShareDecisionBindings();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp103_permission_review_packet_manifest",
    source_unit_range: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.range,
    covered_unit_count: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.unit_count,
    covered_unit_ids: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.covered_unit_ids,
    evidence_binding_count: reviewItems.length,
    decision_binding_count: decisions.length,
    approval_required_decision_count: decisions.filter((item) => item.approval_required === true).length,
    synthetic_only: true,
    no_real_data: true,
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
      executes_export_download: false,
      executes_external_share: false,
    }),
  });
}

export function createCoreDomainCp103HermesEvidencePacket() {
  const manifest = createCoreDomainCp103PermissionReviewManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp103_permission_review_hermes_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    evidence_binding_count: manifest.evidence_binding_count,
    decision_binding_count: manifest.decision_binding_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-103",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp103ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp103_permission_review_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-103 audit expectations, permission fixtures, allowed/denied tests, and export/share decision bindings are reference-only, synthetic-only, no-write, no external share/download execution, and do not implement RP02 runtime permission evaluation, RP03 audit writes, or LDIP.",
  });
}

export function createCoreDomainCp103CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.range,
    next_pack_id: "CP00-104",
    next_subphase_id: "RP01.P06.M09.S07",
    handoff_scope: "continue RP01.P06.M09 Claude review packet with AI retrieval decision binding and the next generated Risk C pack boundary",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp103Coverage() {
  const reviewItems = createCoreDomainCp103AuditPermissionReviewItems();
  const decisions = createCoreDomainCp103ExportShareDecisionBindings();
  const manifest = createCoreDomainCp103PermissionReviewManifest();
  const evidence = createCoreDomainCp103HermesEvidencePacket();
  const review = createCoreDomainCp103ClaudeReviewPacket();
  const handoff = createCoreDomainCp103CloseoutHandoff();
  const errors = [];
  for (const binding of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.evidence_bindings) {
    if (!reviewItems.some((item) => item.item_id === binding)) errors.push(`CP00-103 missing evidence binding ${binding}`);
  }
  for (const action of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.decision_bindings) {
    if (!decisions.some((item) => item.action === action)) errors.push(`CP00-103 missing decision binding ${action}`);
  }
  const covered = new Set([...reviewItems, ...decisions].flatMap((item) => item.source_unit_ids));
  for (const unitId of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.covered_unit_ids) {
    if (!covered.has(unitId)) errors.push(`CP00-103 missing covered unit ${unitId}`);
  }
  if (manifest.covered_unit_count !== 10) errors.push("CP00-103 manifest must cover 10 units");
  if (reviewItems.length !== 4) errors.push("CP00-103 must expose 4 audit/permission review items");
  if (decisions.length !== 2) errors.push("CP00-103 must expose 2 export/share decision bindings");
  if (!reviewItems.some((item) => item.item_id === "allowed_test" && item.expected_status === "allowed_reference")) {
    errors.push("CP00-103 must include allowed expected outcome");
  }
  if (!reviewItems.some((item) => item.item_id === "denied_test" && item.expected_status === "denied_reference")) {
    errors.push("CP00-103 must include denied expected outcome");
  }
  if (!decisions.every((item) => item.approval_required === true && item.audit_event_expected === true)) {
    errors.push("CP00-103 export/share decisions must require approval and audit expectation references");
  }
  for (const item of [...reviewItems, ...decisions]) {
    if (item.synthetic_only !== true || item.uses_real_client_data !== false) errors.push("CP00-103 items must be synthetic-only");
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("CP00-103 items must remain no-write and non-runtime");
    }
    if (item.creates_database_rows !== false || item.executes_export_download !== false || item.executes_external_share !== false) {
      errors.push("CP00-103 items must not create database rows, downloads, or external shares");
    }
    if (item.ldip_implemented !== false) errors.push("CP00-103 items must not implement LDIP");
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    review_item_count: reviewItems.length,
    decision_binding_count: decisions.length,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
