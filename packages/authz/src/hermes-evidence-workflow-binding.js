import {
  PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarness,
  runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase,
} from "./failure-taxonomy-evidence-harness.js";

export const PERMISSION_KERNEL_CP129_PACK_BINDING = Object.freeze({
  pack_id: "CP00-129",
  planned_pack_id: "CP00-129",
  risk_class: "B",
  unit_count: 40,
  range: "RP02.P08.M03.S22-RP02.P08.M05.S19",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-128",
  next_pack_id: "CP00-130",
  next_subphase_id: "RP02.P08.M05.S20",
});

const CP129_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP129_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "operator_internal_summary_source",
  "hermes_runtime_receipt_id",
  "command_result_raw_output",
  "changed_file_internal_diff",
  "fixture_summary_secret",
  "permission_summary_internal_rule",
  "audit_summary_internal_rule",
  "claude_dependency_prompt_context",
  "human_approval_reviewer_id",
  "permission_audit_binding_trace",
]);

const EVIDENCE_TITLES = Object.freeze([
  "Hermes command matrix",
  "Evidence field list",
  "Changed-file receipt",
  "Command result receipt",
  "Fixture summary receipt",
  "Blocked-claim receipt",
  "Permission summary receipt",
  "Audit summary receipt",
  "No-real-data receipt",
  "Claude dependency marker",
  "Human approval marker",
  "PASS semantics",
  "PASS_WITH_FINDINGS semantics",
  "BLOCK semantics",
  "Evidence template",
  "Validation command check",
  "Harness boundary note",
  "Closeout handoff",
  "Regression receipt",
  "Next gate readiness",
]);

const DELIVERABLE_TYPES = Object.freeze({
  "Operator summary": "implementation",
  "Hermes command matrix": "hermes_evidence",
  "Evidence field list": "hermes_evidence",
  "Changed-file receipt": "hermes_evidence",
  "Command result receipt": "hermes_evidence",
  "Fixture summary receipt": "hermes_evidence",
  "Blocked-claim receipt": "hermes_evidence",
  "Permission summary receipt": "hermes_evidence",
  "Audit summary receipt": "hermes_evidence",
  "No-real-data receipt": "hermes_evidence",
  "Claude dependency marker": "claude_review",
  "Human approval marker": "implementation",
  "PASS semantics": "implementation",
  "PASS_WITH_FINDINGS semantics": "implementation",
  "BLOCK semantics": "implementation",
  "Evidence template": "hermes_evidence",
  "Validation command check": "implementation",
  "Harness boundary note": "implementation",
  "Closeout handoff": "implementation",
  "Regression receipt": "test",
  "Next gate readiness": "implementation",
});

const CP129_PHASES = Object.freeze({
  "RP02.P08.M03": Object.freeze({
    start_index: 22,
    titles: Object.freeze(["Operator summary"]),
    micro_title: "Primary Implementation Slice",
    phase_role: "hermes_evidence_operator_summary_terminal",
    area: "hermes_evidence_operator_summary_terminal",
    domain: "operator_summary",
    case_prefix: "operator_summary",
  }),
  "RP02.P08.M04": Object.freeze({
    start_index: 1,
    titles: EVIDENCE_TITLES,
    micro_title: "Secondary Workflow Slice",
    phase_role: "hermes_evidence_secondary_workflow_binding",
    area: "hermes_evidence_secondary_workflow_binding",
    domain: "secondary_workflow_evidence",
    case_prefix: "secondary_workflow_evidence",
  }),
  "RP02.P08.M05": Object.freeze({
    start_index: 1,
    titles: EVIDENCE_TITLES.slice(0, 19),
    micro_title: "Permission And Audit Binding",
    phase_role: "hermes_evidence_permission_audit_binding_opening",
    area: "hermes_evidence_permission_audit_binding_opening",
    domain: "permission_audit_evidence_binding",
    case_prefix: "permission_audit_evidence_binding",
  }),
});

const STATUS_BY_KIND = Object.freeze({
  operator_summary: "operator_summary_bound",
  hermes_command_matrix: "hermes_command_matrix_bound",
  evidence_field_list: "evidence_field_list_bound",
  changed_file_receipt: "changed_file_receipt_bound",
  command_result_receipt: "command_result_receipt_bound",
  fixture_summary_receipt: "fixture_summary_receipt_bound",
  blocked_claim_receipt: "blocked_claim_receipt_preview",
  permission_summary_receipt: "permission_summary_receipt_bound",
  audit_summary_receipt: "audit_summary_receipt_bound",
  no_real_data_receipt: "no_real_data_receipt_bound",
  claude_dependency_marker: "claude_dependency_marker_bound",
  human_approval_marker: "human_approval_marker_reference_only",
  pass_semantics: "pass_semantics_bound",
  pass_with_findings_semantics: "pass_with_findings_semantics_bound",
  block_semantics: "block_semantics_bound",
  evidence_template: "evidence_template_bound",
  validation_command_check: "validation_command_check_bound",
  harness_boundary_note: "harness_boundary_note_bound",
  closeout_handoff: "closeout_handoff_bound",
  regression_receipt: "regression_receipt_bound",
  next_gate_readiness: "next_gate_readiness_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function buildRowsFromPhases() {
  return Object.entries(CP129_PHASES).flatMap(([microPhaseId, phase]) =>
    phase.titles.map((title, offset) => {
      const index = phase.start_index + offset;
      const behaviorKind = slugFor(title);
      const sourceUnitId = sourceUnitIdFor(microPhaseId, index);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: "RP02.P08",
        micro_phase_id: microPhaseId,
        micro_title: phase.micro_title,
        phase_role: phase.phase_role,
        area: phase.area,
        domain: phase.domain,
        title,
        coverage_kind: behaviorKind,
        deliverable_type: DELIVERABLE_TYPES[title],
        case_id: `${phase.case_prefix}.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([sourceUnitId]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_b_hermes_evidence_workflow_binding",
          "cp128_evidence_harness_inherited",
          "operator_summary_reference_only",
          "secondary_workflow_evidence_reference_only",
          "permission_audit_evidence_binding_reference_only",
          "claude_dependency_markers_do_not_execute_review",
          "human_approval_markers_do_not_grant_approval",
          "block_semantics_prevent_production_ready",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP129_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp129.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-129",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_hermes_evidence_workflow_binding: true,
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
    no_write_attestation: CP129_NO_WRITE_ATTESTATION,
  });
}

function createBindingResult(row) {
  const status = STATUS_BY_KIND[row.behavior_kind] ?? "blocked_unknown_hermes_evidence_workflow_kind";
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
    operator_summary: Object.freeze({
      enabled_for_phase: row.domain === "operator_summary",
      summary_bound: row.behavior_kind === "operator_summary",
      includes_command_rollup: row.behavior_kind === "operator_summary",
      includes_permission_audit_rollup: row.behavior_kind === "operator_summary",
      hidden_fields_rendered: false,
      contains_real_data: false,
      persisted: false,
    }),
    hermes_evidence_binding: Object.freeze({
      enabled_for_phase: row.deliverable_type === "hermes_evidence" || row.domain !== "operator_summary",
      command_matrix_bound: row.behavior_kind === "hermes_command_matrix",
      evidence_field_list_bound: row.behavior_kind === "evidence_field_list",
      changed_file_receipt_bound: row.behavior_kind === "changed_file_receipt",
      command_result_receipt_bound: row.behavior_kind === "command_result_receipt",
      fixture_summary_receipt_bound: row.behavior_kind === "fixture_summary_receipt",
      blocked_claim_preview_only: row.behavior_kind === "blocked_claim_receipt",
      permission_summary_receipt_bound: row.behavior_kind === "permission_summary_receipt",
      audit_summary_receipt_bound: row.behavior_kind === "audit_summary_receipt",
      no_real_data_receipt_bound: row.behavior_kind === "no_real_data_receipt",
      evidence_template_bound: row.behavior_kind === "evidence_template",
      reference_only: true,
      writes_hermes_runtime: false,
      emitted_to_audit_ledger: false,
      changed_files_disclose_raw_diff: false,
      command_result_discloses_raw_output: false,
    }),
    permission_audit_binding: Object.freeze({
      enabled_for_phase: row.domain === "permission_audit_evidence_binding",
      permission_summary_reference_only: row.behavior_kind === "permission_summary_receipt",
      audit_summary_reference_only: row.behavior_kind === "audit_summary_receipt",
      emitted_to_audit_ledger: false,
      mutates_permission_policy: false,
      exposes_unauthorized_count: false,
    }),
    claude_dependency_marker: Object.freeze({
      marker_bound: row.behavior_kind === "claude_dependency_marker",
      read_only: true,
      executes_claude_review: false,
      pack_level_review_recorded_separately: true,
    }),
    human_approval_marker: Object.freeze({
      marker_bound: row.behavior_kind === "human_approval_marker",
      grants_human_approval: false,
      approval_reference_only: true,
      persisted: false,
    }),
    closeout_handoff: Object.freeze({
      closeout_handoff_bound: row.behavior_kind === "closeout_handoff",
      next_gate_readiness_bound: row.behavior_kind === "next_gate_readiness",
      validation_command_check_bound: row.behavior_kind === "validation_command_check",
      harness_boundary_note_bound: row.behavior_kind === "harness_boundary_note",
      next_pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_pack_id,
      next_subphase_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_subphase_id,
      commits_pack: false,
      marks_production_ready: false,
    }),
    verdict_semantics: Object.freeze({
      pass_bound: row.behavior_kind === "pass_semantics",
      pass_with_findings_bound: row.behavior_kind === "pass_with_findings_semantics",
      block_bound: row.behavior_kind === "block_semantics",
      block_prevents_production_ready: row.behavior_kind === "block_semantics",
    }),
    regression_receipt: Object.freeze({
      bound: row.behavior_kind === "regression_receipt",
      deterministic: true,
      persisted: false,
      executes_runtime_harness: false,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp129_hermes_evidence_workflow_binding_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP129_PACK_BINDING.range,
  upstream_failure_taxonomy_evidence_harness_pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.upstream_pack_id,
  inherited_failure_taxonomy_evidence_harness_contract_id:
    PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP129_PACK_BINDING.unit_count,
  risk_b_hermes_evidence_workflow_binding: true,
  synthetic_only: true,
  metadata_only_evidence_workflow: true,
  operator_summary_reference_only: true,
  secondary_workflow_evidence_reference_only: true,
  permission_audit_binding_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP129_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP129_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP129_PACK_BINDING",
    "PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT",
    "createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog",
    "createPermissionKernelCp129CoveredUnitIds",
    "createPermissionKernelCp129HermesEvidenceWorkflowBinding",
    "runPermissionKernelCp129HermesEvidenceWorkflowBindingCase",
    "createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest",
    "createPermissionKernelCp129HermesEvidencePacket",
    "createPermissionKernelCp129ClaudeReviewPacket",
    "createPermissionKernelCp129CloseoutHandoff",
    "validatePermissionKernelCp129Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel permission/audit evidence binding at RP02.P08.M05.S20 as planned CP00-130 Risk A; preserve CP129 operator summary, secondary workflow evidence, and permission/audit evidence binding rows as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog() {
  return Object.freeze(buildRowsFromPhases());
}

export function createPermissionKernelCp129CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(caseId) {
  const row = createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_hermes_evidence_workflow_binding_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBindingResult(row);
}

export function createPermissionKernelCp129HermesEvidenceWorkflowBinding() {
  const catalog = createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog();
  const inheritedHarness = createPermissionKernelCp128FailureTaxonomyEvidenceHarness();
  const inheritedNextGate = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(
    "primary_implementation_slice.next_gate_readiness",
  );
  const inheritedClaudeDependency = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(
    "type_shape_definition.claude_dependency_marker",
  );
  const inheritedAuditSummary = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(
    "primary_implementation_slice.audit_summary_receipt",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.upstream_pack_id,
    inherited_evidence_harness_result_count: inheritedHarness.result_count,
    inherited_next_gate_ready: inheritedNextGate.closeout_handoff?.next_gate_readiness_bound === true,
    inherited_claude_dependency_not_executed: inheritedClaudeDependency.claude_review_packet?.executes_claude_review === false,
    inherited_audit_summary_reference_only: inheritedAuditSummary.hermes_evidence_packet?.emitted_to_audit_ledger === false,
    result_count: caseResults.length,
    domain_counts: Object.freeze(domainCounts),
    operator_summary_result_count: domainCounts.operator_summary ?? 0,
    secondary_workflow_evidence_result_count: domainCounts.secondary_workflow_evidence ?? 0,
    permission_audit_evidence_binding_result_count: domainCounts.permission_audit_evidence_binding ?? 0,
    case_results: caseResults,
    evidence_workflow_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP129_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP129_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest() {
  const rows = createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp129CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const areaCounts = rows.reduce((counts, row) => {
    counts[row.area] = (counts[row.area] ?? 0) + 1;
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
  const matrix = createPermissionKernelCp129HermesEvidenceWorkflowBinding();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp129_hermes_evidence_workflow_binding_manifest",
    source_unit_range: PERMISSION_KERNEL_CP129_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_evidence_harness_result_count: matrix.inherited_evidence_harness_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_b_hermes_evidence_workflow_binding: true,
    metadata_only_evidence_workflow: true,
    no_write_attestation: CP129_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp129HermesEvidencePacket() {
  const manifest = createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp129_hermes_evidence_workflow_binding_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-129",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp129ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp129_hermes_evidence_workflow_binding_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-129 closes the planned Risk B Hermes evidence workflow binding units RP02.P08.M03.S22-RP02.P08.M05.S19, inherits CP128 evidence harness behavior, preserves synthetic-only metadata-only behavior, keeps operator summary reference-only, keeps secondary workflow evidence rows and permission/audit evidence binding rows preview/reference-only, binds Claude dependency markers without executing Claude, binds human approval markers without granting approval, preserves BLOCK semantics, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp129CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP129_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP129_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp129Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp129CoveredUnitIds();
  const manifest = createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest();
  const matrix = createPermissionKernelCp129HermesEvidenceWorkflowBinding();
  const handoff = createPermissionKernelCp129CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 40) errors.push("CP00-129 row count must be 40");
  if (unitIds.length !== 40) errors.push("CP00-129 covered unit count must be 40");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-129 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P08.M03.S22") errors.push("CP00-129 first unit must be RP02.P08.M03.S22");
  if (unitIds.at(-1) !== "RP02.P08.M05.S19") errors.push("CP00-129 last unit must be RP02.P08.M05.S19");
  if (manifest.covered_micro_phase_count !== 3) errors.push("CP00-129 must cover three micro phases");
  for (const [microPhaseId, count] of Object.entries({
    "RP02.P08.M03": 1,
    "RP02.P08.M04": 20,
    "RP02.P08.M05": 19,
  })) {
    if (manifest.phase_counts[microPhaseId] !== count) errors.push(`CP00-129 ${microPhaseId} count must be ${count}`);
  }
  for (const [domain, count] of Object.entries({
    operator_summary: 1,
    secondary_workflow_evidence: 20,
    permission_audit_evidence_binding: 19,
  })) {
    if (manifest.domain_counts[domain] !== count) errors.push(`CP00-129 ${domain} domain count must be ${count}`);
  }
  for (const [deliverableType, count] of Object.entries({
    implementation: 16,
    hermes_evidence: 20,
    claude_review: 2,
    test: 2,
  })) {
    if (manifest.deliverable_counts[deliverableType] !== count) {
      errors.push(`CP00-129 ${deliverableType} deliverable count must be ${count}`);
    }
  }
  if (matrix.inherited_evidence_harness_result_count !== 150) errors.push("CP00-129 must inherit CP128 result count");
  if (matrix.inherited_next_gate_ready !== true) errors.push("CP00-129 must inherit CP128 next gate readiness");
  if (matrix.inherited_claude_dependency_not_executed !== true) errors.push("CP00-129 must inherit CP128 Claude no-execution");
  if (matrix.inherited_audit_summary_reference_only !== true) errors.push("CP00-129 must inherit CP128 audit summary reference-only");
  if (matrix.result_count !== 40) errors.push("CP00-129 result count must be 40");
  if (matrix.operator_summary_result_count !== 1) errors.push("CP00-129 operator summary result count must be 1");
  if (matrix.secondary_workflow_evidence_result_count !== 20) errors.push("CP00-129 secondary workflow evidence result count must be 20");
  if (matrix.permission_audit_evidence_binding_result_count !== 19) {
    errors.push("CP00-129 permission audit evidence binding result count must be 19");
  }

  if (resultById["operator_summary.operator_summary"]?.operator_summary?.summary_bound !== true) {
    errors.push("CP00-129 operator summary must be bound");
  }
  if (resultById["operator_summary.operator_summary"]?.operator_summary?.hidden_fields_rendered !== false) {
    errors.push("CP00-129 operator summary must not render hidden fields");
  }
  if (resultById["secondary_workflow_evidence.hermes_command_matrix"]?.hermes_evidence_binding?.command_matrix_bound !== true) {
    errors.push("CP00-129 secondary workflow command matrix must be bound");
  }
  if (resultById["secondary_workflow_evidence.command_result_receipt"]?.hermes_evidence_binding?.command_result_discloses_raw_output !== false) {
    errors.push("CP00-129 secondary workflow command result must not disclose raw output");
  }
  if (resultById["secondary_workflow_evidence.claude_dependency_marker"]?.claude_dependency_marker?.executes_claude_review !== false) {
    errors.push("CP00-129 secondary workflow Claude dependency must not execute review");
  }
  if (resultById["secondary_workflow_evidence.human_approval_marker"]?.human_approval_marker?.grants_human_approval !== false) {
    errors.push("CP00-129 secondary workflow human approval marker must not grant approval");
  }
  if (resultById["secondary_workflow_evidence.block_semantics"]?.verdict_semantics?.block_prevents_production_ready !== true) {
    errors.push("CP00-129 secondary workflow BLOCK semantics must prevent production ready");
  }
  if (resultById["permission_audit_evidence_binding.permission_summary_receipt"]?.permission_audit_binding?.permission_summary_reference_only !== true) {
    errors.push("CP00-129 permission summary must be reference-only");
  }
  if (resultById["permission_audit_evidence_binding.audit_summary_receipt"]?.permission_audit_binding?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-129 audit summary must not write audit ledger");
  }
  if (resultById["permission_audit_evidence_binding.changed_file_receipt"]?.hermes_evidence_binding?.changed_files_disclose_raw_diff !== false) {
    errors.push("CP00-129 changed-file receipt must not disclose raw diff");
  }
  if (resultById["permission_audit_evidence_binding.regression_receipt"]?.regression_receipt?.bound !== true) {
    errors.push("CP00-129 regression receipt must be bound");
  }
  if (resultById["permission_audit_evidence_binding.closeout_handoff"]?.closeout_handoff?.commits_pack !== false) {
    errors.push("CP00-129 closeout handoff must not commit pack");
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
      errors.push(`CP00-129 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-130" || handoff.next_subphase_id !== "RP02.P08.M05.S20") {
    errors.push("CP00-129 must hand off to CP00-130 / RP02.P08.M05.S20");
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
