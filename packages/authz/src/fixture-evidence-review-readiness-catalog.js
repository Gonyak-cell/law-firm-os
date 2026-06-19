import {
  PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary,
  runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase,
} from "./hermes-evidence-synthetic-fixture-verdict-boundary.js";

export const PERMISSION_KERNEL_CP132_PACK_BINDING = Object.freeze({
  pack_id: "CP00-132",
  planned_pack_id: "CP00-132",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P08.M06.S18-RP02.P09.M05.S17",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-131",
  next_pack_id: "CP00-133",
  next_subphase_id: "RP02.P09.M05.S18",
});

const CP132_NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  mutates_permission_policy: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  executes_compensation: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  executes_export_download: false,
  executes_external_share: false,
  grants_human_approval: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
});

const CP132_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "fixture_internal_seed",
  "golden_case_internal_payload",
  "hermes_command_raw_output",
  "changed_file_internal_diff",
  "review_question_internal_notes",
  "security_audit_internal_trace",
  "ui_leak_internal_selector",
  "finding_routing_internal_map",
  "human_approval_internal_summary",
  "command_rerun_raw_output",
]);

const FIXTURE_FULL_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Hermes command matrix", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 2, title: "Evidence field list", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 3, title: "Changed-file receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 4, title: "Command result receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 5, title: "Fixture summary receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 6, title: "Blocked-claim receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 7, title: "Permission summary receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 8, title: "Audit summary receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 9, title: "No-real-data receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 10, title: "Claude dependency marker", deliverable_type: "claude_review" }),
  Object.freeze({ index: 11, title: "Human approval marker", deliverable_type: "implementation" }),
  Object.freeze({ index: 12, title: "PASS semantics", deliverable_type: "implementation" }),
  Object.freeze({ index: 13, title: "PASS_WITH_FINDINGS semantics", deliverable_type: "implementation" }),
  Object.freeze({ index: 14, title: "BLOCK semantics", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "Evidence template", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 16, title: "Validation command check", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "Harness boundary note", deliverable_type: "implementation" }),
  Object.freeze({ index: 18, title: "Closeout handoff", deliverable_type: "implementation" }),
  Object.freeze({ index: 19, title: "Regression receipt", deliverable_type: "test" }),
  Object.freeze({ index: 20, title: "Next gate readiness", deliverable_type: "implementation" }),
  Object.freeze({ index: 21, title: "Documentation update", deliverable_type: "implementation" }),
  Object.freeze({ index: 22, title: "Operator summary", deliverable_type: "implementation" }),
]);

const REVIEW_FULL_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Architecture review questions", deliverable_type: "claude_review" }),
  Object.freeze({ index: 2, title: "Security review questions", deliverable_type: "claude_review" }),
  Object.freeze({ index: 3, title: "Permission bypass questions", deliverable_type: "security_audit" }),
  Object.freeze({ index: 4, title: "Audit completeness questions", deliverable_type: "security_audit" }),
  Object.freeze({ index: 5, title: "Missing test questions", deliverable_type: "test" }),
  Object.freeze({ index: 6, title: "UI leak questions", deliverable_type: "ui" }),
  Object.freeze({ index: 7, title: "Downstream readiness questions", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Risk register", deliverable_type: "implementation" }),
  Object.freeze({ index: 9, title: "Severity taxonomy", deliverable_type: "implementation" }),
  Object.freeze({ index: 10, title: "Go/no-go verdict format", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Finding routing map", deliverable_type: "implementation" }),
  Object.freeze({ index: 12, title: "Human approval summary", deliverable_type: "implementation" }),
  Object.freeze({ index: 13, title: "Claude review packet", deliverable_type: "claude_review" }),
  Object.freeze({ index: 14, title: "Closeout criteria", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "PASS closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 16, title: "PASS_WITH_FINDINGS closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "BLOCK closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 18, title: "Next RP dependency", deliverable_type: "implementation" }),
  Object.freeze({ index: 19, title: "Documentation update", deliverable_type: "implementation" }),
  Object.freeze({ index: 20, title: "Command rerun", deliverable_type: "implementation" }),
]);

const CP132_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    phase_id: "RP02.P08",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "synthetic_fixture_terminal_readiness",
    units: Object.freeze(FIXTURE_FULL_UNITS.slice(17, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M07",
    phase_id: "RP02.P08",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "test_and_golden_case_fixture_readiness",
    units: FIXTURE_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M08",
    phase_id: "RP02.P08",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "hermes_evidence_packet_readiness",
    units: Object.freeze(FIXTURE_FULL_UNITS.slice(0, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M09",
    phase_id: "RP02.P08",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "claude_review_packet_readiness",
    units: Object.freeze(FIXTURE_FULL_UNITS.slice(0, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M10",
    phase_id: "RP02.P08",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "closeout_next_handoff_evidence_receipts",
    units: Object.freeze(FIXTURE_FULL_UNITS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M00",
    phase_id: "RP02.P09",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "review_scope_inventory",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(0, 4)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M01",
    phase_id: "RP02.P09",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "review_contract_draft",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M02",
    phase_id: "RP02.P09",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "review_type_shape_definition",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M03",
    phase_id: "RP02.P09",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "review_primary_implementation_slice",
    units: REVIEW_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M04",
    phase_id: "RP02.P09",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "review_secondary_workflow_slice",
    units: REVIEW_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M05",
    phase_id: "RP02.P09",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "review_permission_audit_binding",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(0, 17)),
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  architecture_review_questions: "architecture_review_questions_bound",
  audit_completeness_questions: "audit_completeness_questions_bound",
  audit_summary_receipt: "audit_summary_receipt_bound",
  block_closeout_note: "block_closeout_note_bound",
  block_semantics: "block_semantics_bound",
  blocked_claim_receipt: "blocked_claim_receipt_preview",
  changed_file_receipt: "changed_file_receipt_bound",
  claude_dependency_marker: "claude_dependency_marker_bound",
  claude_review_packet: "claude_review_packet_bound",
  closeout_criteria: "closeout_criteria_bound",
  closeout_handoff: "closeout_handoff_bound",
  command_result_receipt: "command_result_receipt_bound",
  command_rerun: "command_rerun_bound",
  documentation_update: "documentation_update_bound",
  downstream_readiness_questions: "downstream_readiness_questions_bound",
  evidence_field_list: "evidence_field_list_bound",
  evidence_template: "evidence_template_bound",
  finding_routing_map: "finding_routing_map_bound",
  fixture_summary_receipt: "fixture_summary_receipt_bound",
  go_no_go_verdict_format: "go_no_go_verdict_format_bound",
  harness_boundary_note: "harness_boundary_note_bound",
  hermes_command_matrix: "hermes_command_matrix_bound",
  human_approval_marker: "human_approval_marker_bound",
  human_approval_summary: "human_approval_summary_bound",
  missing_test_questions: "missing_test_questions_bound",
  next_gate_readiness: "next_gate_readiness_bound",
  next_rp_dependency: "next_rp_dependency_bound",
  no_real_data_receipt: "no_real_data_receipt_bound",
  operator_summary: "operator_summary_bound",
  pass_closeout_note: "pass_closeout_note_bound",
  pass_semantics: "pass_semantics_bound",
  pass_with_findings_closeout_note: "pass_with_findings_closeout_note_bound",
  pass_with_findings_semantics: "pass_with_findings_semantics_bound",
  permission_bypass_questions: "permission_bypass_questions_bound",
  permission_summary_receipt: "permission_summary_receipt_bound",
  regression_receipt: "regression_receipt_bound",
  risk_register: "risk_register_bound",
  security_review_questions: "security_review_questions_bound",
  severity_taxonomy: "severity_taxonomy_bound",
  ui_leak_questions: "ui_leak_questions_bound",
  validation_command_check: "validation_command_check_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function microSlug(microPhaseId) {
  return microPhaseId.toLowerCase().replaceAll(".", "_");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, phaseId) {
  if (
    [
      "hermes_command_matrix",
      "evidence_field_list",
      "changed_file_receipt",
      "command_result_receipt",
      "fixture_summary_receipt",
      "blocked_claim_receipt",
      "permission_summary_receipt",
      "audit_summary_receipt",
      "no_real_data_receipt",
      "evidence_template",
    ].includes(behaviorKind)
  ) {
    return "fixture_evidence_receipt_boundary";
  }
  if (["claude_dependency_marker", "claude_review_packet"].includes(behaviorKind)) {
    return "claude_review_packet_boundary";
  }
  if (
    [
      "human_approval_marker",
      "pass_semantics",
      "pass_with_findings_semantics",
      "block_semantics",
      "validation_command_check",
      "harness_boundary_note",
    ].includes(behaviorKind)
  ) {
    return "fixture_verdict_validation_boundary";
  }
  if (
    [
      "architecture_review_questions",
      "security_review_questions",
      "permission_bypass_questions",
      "audit_completeness_questions",
      "missing_test_questions",
      "ui_leak_questions",
      "downstream_readiness_questions",
      "risk_register",
    ].includes(behaviorKind)
  ) {
    return phaseId === "RP02.P09" ? "review_question_boundary" : "fixture_closeout_readiness_boundary";
  }
  if (
    phaseId === "RP02.P08" &&
    ["closeout_handoff", "regression_receipt", "next_gate_readiness", "documentation_update", "operator_summary"].includes(behaviorKind)
  ) {
    return "fixture_closeout_readiness_boundary";
  }
  return "review_closeout_readiness_boundary";
}

function areaFor(domain, microTitle) {
  return `${domain}.${slugFor(microTitle)}`;
}

function buildRows() {
  return Object.freeze(
    CP132_MICRO_PHASES.flatMap((micro) =>
      micro.units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro.phase_id);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
          program_id: "RP02",
          phase_id: micro.phase_id,
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: areaFor(domain, micro.micro_title),
          domain,
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${microSlug(micro.micro_phase_id)}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_fixture_evidence_review_readiness_catalog",
            "cp131_verdict_boundary_inherited",
            "fixture_evidence_receipts_reference_only",
            "review_questions_reference_only",
            "security_audit_questions_do_not_execute_bypass",
            "ui_leak_questions_do_not_render_ui",
            "closeout_readiness_does_not_commit_or_mark_production_ready",
            "no_permission_policy_mutation",
            "no_audit_ledger_write",
            "no_product_or_database_write",
            "export_share_ai_boundaries_not_executed",
            "ldip_not_implemented",
            "hrx_embedded_inside_law_firm_os",
          ]),
          boundary_flags: CP132_NO_WRITE_ATTESTATION,
          synthetic_only: true,
          no_real_data: true,
          product_state_effect: "none",
        });
      }),
    ),
  );
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp132.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-132",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_fixture_evidence_review_readiness_catalog: true,
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    persists_lock_tokens: false,
    executes_rollback: false,
    executes_retry: false,
    executes_compensation: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    grants_human_approval: false,
    executes_claude_review: false,
    writes_hermes_runtime: false,
    implements_ldip: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP132_NO_WRITE_ATTESTATION,
  });
}

function createBoundaryResult(row) {
  const status = STATUS_BY_KIND[row.behavior_kind] ?? "blocked_unknown_fixture_evidence_review_readiness_kind";
  return freezeNoWriteResult({
    case_id: row.case_id,
    domain: row.domain,
    behavior_kind: row.behavior_kind,
    status,
    reason: row.behavior_kind,
    evaluator_invoked: false,
    decision: null,
    failure_code: `permission_kernel.${row.behavior_kind}`,
    fail_closed: true,
    fixture_evidence: Object.freeze({
      enabled_for_phase: row.domain === "fixture_evidence_receipt_boundary",
      command_matrix_bound: row.behavior_kind === "hermes_command_matrix",
      evidence_field_list_bound: row.behavior_kind === "evidence_field_list",
      changed_file_receipt_bound: row.behavior_kind === "changed_file_receipt",
      changed_files_disclose_raw_diff: false,
      command_result_receipt_bound: row.behavior_kind === "command_result_receipt",
      command_result_discloses_raw_output: false,
      fixture_summary_receipt_bound: row.behavior_kind === "fixture_summary_receipt",
      fixture_contains_real_data: false,
      fixture_persisted: false,
      blocked_claim_preview_only: row.behavior_kind === "blocked_claim_receipt",
      blocked_claim_persisted: false,
      permission_summary_reference_only: row.behavior_kind === "permission_summary_receipt",
      audit_summary_reference_only: row.behavior_kind === "audit_summary_receipt",
      audit_summary_emitted_to_audit_ledger: false,
      no_real_data_receipt_bound: row.behavior_kind === "no_real_data_receipt",
      evidence_template_reference_only: row.behavior_kind === "evidence_template",
      hidden_template_fields_rendered: false,
      permission_policy_mutated: false,
      writes_hermes_runtime: false,
      reference_only: true,
    }),
    claude_review_packet: Object.freeze({
      enabled_for_phase: row.domain === "claude_review_packet_boundary",
      dependency_marker_bound: row.behavior_kind === "claude_dependency_marker",
      review_packet_bound: row.behavior_kind === "claude_review_packet",
      model: "claude-opus-4-8",
      effort: "max",
      read_only: true,
      exactly_one_valid_pack_review_required: true,
      executes_claude_review: false,
      packet_reference_only: true,
    }),
    verdict_validation: Object.freeze({
      enabled_for_phase: row.domain === "fixture_verdict_validation_boundary",
      human_approval_marker_bound: row.behavior_kind === "human_approval_marker",
      grants_human_approval: false,
      pass_semantics_bound: row.behavior_kind === "pass_semantics",
      pass_with_findings_semantics_bound: row.behavior_kind === "pass_with_findings_semantics",
      pass_with_findings_requires_adjudication: row.behavior_kind === "pass_with_findings_semantics",
      block_semantics_bound: row.behavior_kind === "block_semantics",
      block_prevents_production_ready: row.behavior_kind === "block_semantics",
      validation_command_bound: row.behavior_kind === "validation_command_check",
      validation_command_executed_by_runtime: false,
      validation_command_discloses_raw_output: false,
      harness_note_bound: row.behavior_kind === "harness_boundary_note",
      harness_runtime_invoked: false,
      reference_only: true,
    }),
    review_questions: Object.freeze({
      enabled_for_phase: row.domain === "review_question_boundary",
      architecture_review_questions_bound: row.behavior_kind === "architecture_review_questions",
      security_review_questions_bound: row.behavior_kind === "security_review_questions",
      permission_bypass_questions_bound: row.behavior_kind === "permission_bypass_questions",
      audit_completeness_questions_bound: row.behavior_kind === "audit_completeness_questions",
      missing_test_questions_bound: row.behavior_kind === "missing_test_questions",
      ui_leak_questions_bound: row.behavior_kind === "ui_leak_questions",
      downstream_readiness_questions_bound: row.behavior_kind === "downstream_readiness_questions",
      risk_register_bound: row.behavior_kind === "risk_register",
      executes_permission_bypass: false,
      writes_audit_event: false,
      renders_ui: false,
      reference_only: true,
    }),
    closeout_readiness: Object.freeze({
      enabled_for_phase:
        row.domain === "fixture_closeout_readiness_boundary" || row.domain === "review_closeout_readiness_boundary",
      closeout_handoff_bound: row.behavior_kind === "closeout_handoff",
      regression_receipt_bound: row.behavior_kind === "regression_receipt",
      next_gate_readiness_bound: row.behavior_kind === "next_gate_readiness",
      documentation_update_bound: row.behavior_kind === "documentation_update",
      operator_summary_bound: row.behavior_kind === "operator_summary",
      severity_taxonomy_bound: row.behavior_kind === "severity_taxonomy",
      go_no_go_verdict_format_bound: row.behavior_kind === "go_no_go_verdict_format",
      finding_routing_map_bound: row.behavior_kind === "finding_routing_map",
      human_approval_summary_bound: row.behavior_kind === "human_approval_summary",
      closeout_criteria_bound: row.behavior_kind === "closeout_criteria",
      pass_closeout_note_bound: row.behavior_kind === "pass_closeout_note",
      pass_with_findings_closeout_note_bound: row.behavior_kind === "pass_with_findings_closeout_note",
      block_closeout_note_bound: row.behavior_kind === "block_closeout_note",
      next_rp_dependency_bound: row.behavior_kind === "next_rp_dependency",
      command_rerun_bound: row.behavior_kind === "command_rerun",
      command_rerun_executed: false,
      commits_pack: false,
      marks_production_ready: false,
      documentation_published: false,
      hidden_fields_rendered: false,
      reference_only: true,
      next_pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_pack_id,
      next_subphase_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_subphase_id,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp132_fixture_evidence_review_readiness_catalog_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP132_PACK_BINDING.range,
  upstream_hermes_evidence_synthetic_fixture_verdict_boundary_pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.upstream_pack_id,
  inherited_hermes_evidence_synthetic_fixture_verdict_boundary_contract_id:
    PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP132_PACK_BINDING.unit_count,
  risk_c_fixture_evidence_review_readiness_catalog: true,
  synthetic_only: true,
  fixture_evidence_reference_only: true,
  review_questions_reference_only: true,
  closeout_readiness_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP132_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP132_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP132_PACK_BINDING",
    "PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT",
    "createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog",
    "createPermissionKernelCp132CoveredUnitIds",
    "createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix",
    "runPermissionKernelCp132FixtureEvidenceReviewReadinessCase",
    "createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest",
    "createPermissionKernelCp132HermesEvidencePacket",
    "createPermissionKernelCp132ClaudeReviewPacket",
    "createPermissionKernelCp132CloseoutHandoff",
    "validatePermissionKernelCp132Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel permission/audit binding review closeout at RP02.P09.M05.S18 as planned CP00-133 Risk A; preserve CP132 fixture, evidence, review question, security audit, UI leak, and closeout readiness rows as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog() {
  return Object.freeze(buildRows());
}

export function createPermissionKernelCp132CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp132FixtureEvidenceReviewReadinessCase(caseId) {
  const row = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_fixture_evidence_review_readiness_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix() {
  const catalog = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog();
  const inheritedBoundary = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary();
  const inheritedClaudeDependency = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
    "synthetic_fixture_review_dependency.claude_dependency_marker",
  );
  const inheritedPassWithFindings = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
    "synthetic_fixture_verdict.pass_with_findings_semantics",
  );
  const inheritedBlock = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
    "synthetic_fixture_verdict.block_semantics",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp132FixtureEvidenceReviewReadinessCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.upstream_pack_id,
    inherited_hermes_evidence_synthetic_fixture_verdict_boundary_result_count: inheritedBoundary.result_count,
    inherited_claude_dependency_not_executed:
      inheritedClaudeDependency.claude_dependency_marker?.executes_claude_review === false,
    inherited_pass_with_findings_requires_adjudication:
      inheritedPassWithFindings.verdict_semantics?.pass_with_findings_requires_adjudication === true,
    inherited_block_prevents_production_ready:
      inheritedBlock.verdict_semantics?.block_prevents_production_ready === true,
    result_count: caseResults.length,
    fixture_evidence_result_count: domainCounts.fixture_evidence_receipt_boundary ?? 0,
    fixture_verdict_validation_result_count: domainCounts.fixture_verdict_validation_boundary ?? 0,
    claude_review_packet_result_count: domainCounts.claude_review_packet_boundary ?? 0,
    review_question_result_count: domainCounts.review_question_boundary ?? 0,
    fixture_closeout_readiness_result_count: domainCounts.fixture_closeout_readiness_boundary ?? 0,
    review_closeout_readiness_result_count: domainCounts.review_closeout_readiness_boundary ?? 0,
    case_results: caseResults,
    readiness_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP132_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP132_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest() {
  const rows = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog();
  const unitIds = createPermissionKernelCp132CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  const domainCounts = rows.reduce((counts, row) => {
    counts[row.domain] = (counts[row.domain] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp132_fixture_evidence_review_readiness_manifest",
    source_unit_range: PERMISSION_KERNEL_CP132_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_hermes_evidence_synthetic_fixture_verdict_boundary_result_count:
      matrix.inherited_hermes_evidence_synthetic_fixture_verdict_boundary_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_c_fixture_evidence_review_readiness_catalog: true,
    fixture_evidence_reference_only: true,
    review_questions_reference_only: true,
    closeout_readiness_reference_only: true,
    no_write_attestation: CP132_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp132HermesEvidencePacket() {
  const manifest = createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp132_fixture_evidence_review_readiness_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-132",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp132ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp132_fixture_evidence_review_readiness_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-132 closes the planned Risk C fixture, evidence, review question, security audit, UI leak, and closeout readiness catalog units RP02.P08.M06.S18-RP02.P09.M05.S17, inherits CP131 verdict boundary behavior, preserves synthetic-only metadata-only behavior, keeps fixture/evidence receipts reference-only, keeps review questions and security audit prompts inert, keeps UI leak questions non-rendering, keeps closeout notes and command rerun references from committing or marking production_ready, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp132CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP132_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP132_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp132Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog();
  const unitIds = createPermissionKernelCp132CoveredUnitIds();
  const manifest = createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest();
  const matrix = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix();
  const handoff = createPermissionKernelCp132CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 150) errors.push("CP00-132 row count must be 150");
  if (unitIds.length !== 150) errors.push("CP00-132 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-132 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P08.M06.S18") errors.push("CP00-132 first unit must be RP02.P08.M06.S18");
  if (unitIds.at(-1) !== "RP02.P09.M05.S17") errors.push("CP00-132 last unit must be RP02.P09.M05.S17");
  if (manifest.covered_micro_phase_count !== 11) errors.push("CP00-132 must cover eleven micro phases");

  for (const [microPhaseId, count] of Object.entries({
    "RP02.P08.M06": 3,
    "RP02.P08.M07": 22,
    "RP02.P08.M08": 20,
    "RP02.P08.M09": 20,
    "RP02.P08.M10": 8,
    "RP02.P09.M00": 4,
    "RP02.P09.M01": 8,
    "RP02.P09.M02": 8,
    "RP02.P09.M03": 20,
    "RP02.P09.M04": 20,
    "RP02.P09.M05": 17,
  })) {
    if (manifest.phase_counts[microPhaseId] !== count) errors.push(`CP00-132 ${microPhaseId} count must be ${count}`);
  }

  for (const [deliverableType, count] of Object.entries({
    implementation: 68,
    test: 9,
    hermes_evidence: 38,
    claude_review: 18,
    security_audit: 12,
    ui: 5,
  })) {
    if (manifest.deliverable_counts[deliverableType] !== count) {
      errors.push(`CP00-132 ${deliverableType} deliverable count must be ${count}`);
    }
  }

  if (matrix.inherited_hermes_evidence_synthetic_fixture_verdict_boundary_result_count !== 10) {
    errors.push("CP00-132 must inherit CP131 result count");
  }
  if (matrix.inherited_claude_dependency_not_executed !== true) {
    errors.push("CP00-132 must inherit CP131 Claude dependency no-execution");
  }
  if (matrix.inherited_pass_with_findings_requires_adjudication !== true) {
    errors.push("CP00-132 must inherit CP131 PASS_WITH_FINDINGS adjudication semantics");
  }
  if (matrix.inherited_block_prevents_production_ready !== true) {
    errors.push("CP00-132 must inherit CP131 BLOCK production_ready prevention");
  }
  if (matrix.result_count !== 150) errors.push("CP00-132 result count must be 150");
  if (matrix.fixture_evidence_result_count !== 38) errors.push("CP00-132 fixture evidence result count must be 38");
  if (matrix.fixture_verdict_validation_result_count !== 18) {
    errors.push("CP00-132 fixture verdict validation result count must be 18");
  }
  if (matrix.claude_review_packet_result_count !== 6) errors.push("CP00-132 Claude review packet result count must be 6");
  if (matrix.review_question_result_count !== 44) errors.push("CP00-132 review question result count must be 44");
  if (matrix.fixture_closeout_readiness_result_count !== 14) {
    errors.push("CP00-132 fixture closeout readiness result count must be 14");
  }
  if (matrix.review_closeout_readiness_result_count !== 30) {
    errors.push("CP00-132 review closeout readiness result count must be 30");
  }

  if (resultById["rp02_p08_m07.hermes_command_matrix"]?.fixture_evidence?.command_matrix_bound !== true) {
    errors.push("CP00-132 M07 Hermes command matrix must be bound");
  }
  if (resultById["rp02_p08_m07.changed_file_receipt"]?.fixture_evidence?.changed_files_disclose_raw_diff !== false) {
    errors.push("CP00-132 changed-file receipt must not disclose raw diff");
  }
  if (resultById["rp02_p08_m07.block_semantics"]?.verdict_validation?.block_prevents_production_ready !== true) {
    errors.push("CP00-132 fixture BLOCK semantics must prevent production_ready");
  }
  if (resultById["rp02_p08_m08.evidence_template"]?.fixture_evidence?.evidence_template_reference_only !== true) {
    errors.push("CP00-132 evidence template must be reference-only");
  }
  if (resultById["rp02_p08_m09.claude_dependency_marker"]?.claude_review_packet?.executes_claude_review !== false) {
    errors.push("CP00-132 Claude dependency marker must not execute Claude");
  }
  if (resultById["rp02_p08_m10.audit_summary_receipt"]?.fixture_evidence?.audit_summary_emitted_to_audit_ledger !== false) {
    errors.push("CP00-132 audit summary receipt must not emit audit events");
  }
  if (resultById["rp02_p09_m00.permission_bypass_questions"]?.review_questions?.executes_permission_bypass !== false) {
    errors.push("CP00-132 permission bypass questions must not execute bypass checks");
  }
  if (resultById["rp02_p09_m01.ui_leak_questions"]?.review_questions?.renders_ui !== false) {
    errors.push("CP00-132 UI leak questions must not render UI");
  }
  if (resultById["rp02_p09_m03.finding_routing_map"]?.closeout_readiness?.finding_routing_map_bound !== true) {
    errors.push("CP00-132 finding routing map must be bound");
  }
  if (resultById["rp02_p09_m05.block_closeout_note"]?.closeout_readiness?.marks_production_ready !== false) {
    errors.push("CP00-132 BLOCK closeout note must not mark production_ready");
  }

  for (const profile of matrix.case_results) {
    if (
      profile.unauthorized_count_exposed ||
      profile.hidden_field_names_exposed ||
      profile.mutates_permission_policy ||
      profile.writes_product_state ||
      profile.writes_audit_event ||
      profile.creates_database_rows ||
      profile.persists_idempotency_keys ||
      profile.acquires_locks ||
      profile.persists_lock_tokens ||
      profile.executes_rollback ||
      profile.executes_retry ||
      profile.executes_compensation ||
      profile.executes_export_download ||
      profile.executes_external_share ||
      profile.executes_ai_retrieval ||
      profile.executes_analytics_query ||
      profile.grants_human_approval ||
      profile.executes_claude_review ||
      profile.writes_hermes_runtime ||
      profile.implements_ldip
    ) {
      errors.push(`CP00-132 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-133" || handoff.next_subphase_id !== "RP02.P09.M05.S18") {
    errors.push("CP00-132 must hand off to CP00-133 / RP02.P09.M05.S18");
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    covered_unit_count: unitIds.length,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    next_pack_id: handoff.next_pack_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
