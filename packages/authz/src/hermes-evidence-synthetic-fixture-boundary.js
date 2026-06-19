import {
  PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT,
  createPermissionKernelCp129HermesEvidenceWorkflowBinding,
  runPermissionKernelCp129HermesEvidenceWorkflowBindingCase,
} from "./hermes-evidence-workflow-binding.js";

export const PERMISSION_KERNEL_CP130_PACK_BINDING = Object.freeze({
  pack_id: "CP00-130",
  planned_pack_id: "CP00-130",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P08.M05.S20-RP02.P08.M06.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-129",
  next_pack_id: "CP00-131",
  next_subphase_id: "RP02.P08.M06.S08",
});

const CP130_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP130_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "operator_internal_summary_source",
  "documentation_internal_draft",
  "hermes_runtime_receipt_id",
  "changed_file_internal_diff",
  "command_result_raw_output",
  "fixture_summary_secret",
  "blocked_claim_internal_reason",
  "permission_summary_internal_rule",
  "synthetic_fixture_seed",
  "permission_audit_boundary_trace",
]);

const CP130_UNITS = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP02.P08.M05",
    index: 20,
    title: "Next gate readiness",
    micro_title: "Permission And Audit Binding",
    phase_role: "hermes_evidence_permission_audit_binding_terminal",
    area: "hermes_evidence_permission_audit_terminal",
    domain: "permission_audit_terminal_boundary",
    case_prefix: "permission_audit_terminal",
    deliverable_type: "implementation",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M05",
    index: 21,
    title: "Documentation update",
    micro_title: "Permission And Audit Binding",
    phase_role: "hermes_evidence_permission_audit_binding_terminal",
    area: "hermes_evidence_permission_audit_terminal",
    domain: "permission_audit_terminal_boundary",
    case_prefix: "permission_audit_terminal",
    deliverable_type: "implementation",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M05",
    index: 22,
    title: "Operator summary",
    micro_title: "Permission And Audit Binding",
    phase_role: "hermes_evidence_permission_audit_binding_terminal",
    area: "hermes_evidence_permission_audit_terminal",
    domain: "permission_audit_terminal_boundary",
    case_prefix: "permission_audit_terminal",
    deliverable_type: "implementation",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 1,
    title: "Hermes command matrix",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 2,
    title: "Evidence field list",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 3,
    title: "Changed-file receipt",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 4,
    title: "Command result receipt",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 5,
    title: "Fixture summary receipt",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 6,
    title: "Blocked-claim receipt",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
  Object.freeze({
    micro_phase_id: "RP02.P08.M06",
    index: 7,
    title: "Permission summary receipt",
    micro_title: "Synthetic Fixture Set",
    phase_role: "hermes_evidence_synthetic_fixture_opening",
    area: "hermes_evidence_synthetic_fixture_opening",
    domain: "synthetic_fixture_evidence_boundary",
    case_prefix: "synthetic_fixture_opening",
    deliverable_type: "hermes_evidence",
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  next_gate_readiness: "next_gate_readiness_bound",
  documentation_update: "documentation_update_bound",
  operator_summary: "operator_summary_bound",
  hermes_command_matrix: "hermes_command_matrix_bound",
  evidence_field_list: "evidence_field_list_bound",
  changed_file_receipt: "changed_file_receipt_bound",
  command_result_receipt: "command_result_receipt_bound",
  fixture_summary_receipt: "fixture_summary_receipt_bound",
  blocked_claim_receipt: "blocked_claim_receipt_preview",
  permission_summary_receipt: "permission_summary_receipt_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(unit) {
  return `${unit.micro_phase_id}.S${String(unit.index).padStart(2, "0")}`;
}

function buildRows() {
  return CP130_UNITS.map((unit) => {
    const behaviorKind = slugFor(unit.title);
    const sourceUnitId = sourceUnitIdFor(unit);
    return Object.freeze({
      catalog_id: `${sourceUnitId}.${behaviorKind}`,
      pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
      program_id: "RP02",
      phase_id: "RP02.P08",
      micro_phase_id: unit.micro_phase_id,
      micro_title: unit.micro_title,
      phase_role: unit.phase_role,
      area: unit.area,
      domain: unit.domain,
      title: unit.title,
      coverage_kind: behaviorKind,
      deliverable_type: unit.deliverable_type,
      case_id: `${unit.case_prefix}.${behaviorKind}`,
      behavior_kind: behaviorKind,
      source_unit_ids: Object.freeze([sourceUnitId]),
      required_assertions: Object.freeze([
        "synthetic_only",
        "risk_a_hermes_evidence_synthetic_fixture_boundary",
        "cp129_hermes_evidence_workflow_binding_inherited",
        "permission_audit_terminal_rows_reference_only",
        "synthetic_fixture_evidence_rows_reference_only",
        "operator_summary_does_not_render_hidden_fields",
        "command_and_changed_file_receipts_do_not_disclose_raw_values",
        "blocked_claim_receipt_preview_only",
        "permission_summary_reference_only",
        "no_permission_policy_mutation",
        "no_audit_ledger_write",
        "no_product_or_database_write",
        "export_share_ai_boundaries_not_executed",
        "ldip_not_implemented",
        "hrx_embedded_inside_law_firm_os",
      ]),
      boundary_flags: CP130_NO_WRITE_ATTESTATION,
      synthetic_only: true,
      no_real_data: true,
      product_state_effect: "none",
    });
  });
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp130.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-130",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_hermes_evidence_synthetic_fixture_boundary: true,
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
    no_write_attestation: CP130_NO_WRITE_ATTESTATION,
  });
}

function createBoundaryResult(row) {
  const status = STATUS_BY_KIND[row.behavior_kind] ?? "blocked_unknown_hermes_evidence_boundary_kind";
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
    permission_audit_terminal: Object.freeze({
      enabled_for_phase: row.domain === "permission_audit_terminal_boundary",
      next_gate_readiness_bound: row.behavior_kind === "next_gate_readiness",
      documentation_update_bound: row.behavior_kind === "documentation_update",
      operator_summary_bound: row.behavior_kind === "operator_summary",
      next_pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_pack_id,
      next_subphase_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_subphase_id,
      documentation_published: false,
      commits_pack: false,
      marks_production_ready: false,
    }),
    operator_summary: Object.freeze({
      bound: row.behavior_kind === "operator_summary",
      hidden_fields_rendered: false,
      contains_real_data: false,
      persisted: false,
    }),
    synthetic_fixture_evidence: Object.freeze({
      enabled_for_phase: row.domain === "synthetic_fixture_evidence_boundary",
      command_matrix_bound: row.behavior_kind === "hermes_command_matrix",
      evidence_field_list_bound: row.behavior_kind === "evidence_field_list",
      changed_file_receipt_bound: row.behavior_kind === "changed_file_receipt",
      command_result_receipt_bound: row.behavior_kind === "command_result_receipt",
      fixture_summary_receipt_bound: row.behavior_kind === "fixture_summary_receipt",
      blocked_claim_preview_only: row.behavior_kind === "blocked_claim_receipt",
      permission_summary_reference_only: row.behavior_kind === "permission_summary_receipt",
      reference_only: true,
      fixture_contains_real_data: false,
      fixture_persisted: false,
      writes_hermes_runtime: false,
      emitted_to_audit_ledger: false,
      changed_files_disclose_raw_diff: false,
      command_result_discloses_raw_output: false,
      blocked_claim_persisted: false,
      permission_policy_mutated: false,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp130_hermes_evidence_synthetic_fixture_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP130_PACK_BINDING.range,
  upstream_hermes_evidence_workflow_binding_pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.upstream_pack_id,
  inherited_hermes_evidence_workflow_binding_contract_id:
    PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP130_PACK_BINDING.unit_count,
  risk_a_hermes_evidence_synthetic_fixture_boundary: true,
  synthetic_only: true,
  permission_audit_terminal_reference_only: true,
  synthetic_fixture_evidence_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP130_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP130_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP130_PACK_BINDING",
    "PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT",
    "createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog",
    "createPermissionKernelCp130CoveredUnitIds",
    "createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary",
    "runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase",
    "createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest",
    "createPermissionKernelCp130HermesEvidencePacket",
    "createPermissionKernelCp130ClaudeReviewPacket",
    "createPermissionKernelCp130CloseoutHandoff",
    "validatePermissionKernelCp130Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel Hermes evidence synthetic fixture set at RP02.P08.M06.S08 as planned CP00-131 Risk A; preserve CP130 permission/audit terminal and synthetic fixture evidence opening rows as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog() {
  return Object.freeze(buildRows());
}

export function createPermissionKernelCp130CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(caseId) {
  const row = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_hermes_evidence_synthetic_fixture_boundary_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary() {
  const catalog = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog();
  const inheritedWorkflow = createPermissionKernelCp129HermesEvidenceWorkflowBinding();
  const inheritedCloseout = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
    "permission_audit_evidence_binding.closeout_handoff",
  );
  const inheritedPermissionSummary = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
    "permission_audit_evidence_binding.permission_summary_receipt",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.upstream_pack_id,
    inherited_hermes_evidence_workflow_result_count: inheritedWorkflow.result_count,
    inherited_closeout_handoff_no_commit: inheritedCloseout.closeout_handoff?.commits_pack === false,
    inherited_permission_summary_reference_only:
      inheritedPermissionSummary.permission_audit_binding?.permission_summary_reference_only === true,
    result_count: caseResults.length,
    permission_audit_terminal_result_count: domainCounts.permission_audit_terminal_boundary ?? 0,
    synthetic_fixture_evidence_result_count: domainCounts.synthetic_fixture_evidence_boundary ?? 0,
    case_results: caseResults,
    evidence_boundary_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP130_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP130_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest() {
  const rows = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog();
  const unitIds = createPermissionKernelCp130CoveredUnitIds();
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
  const matrix = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp130_hermes_evidence_synthetic_fixture_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP130_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_hermes_evidence_workflow_result_count: matrix.inherited_hermes_evidence_workflow_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_hermes_evidence_synthetic_fixture_boundary: true,
    permission_audit_terminal_reference_only: true,
    synthetic_fixture_evidence_reference_only: true,
    no_write_attestation: CP130_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp130HermesEvidencePacket() {
  const manifest = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp130_hermes_evidence_synthetic_fixture_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-130",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp130ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp130_hermes_evidence_synthetic_fixture_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-130 closes the planned Risk A Hermes evidence permission/audit terminal and synthetic fixture opening units RP02.P08.M05.S20-RP02.P08.M06.S07, inherits CP129 evidence workflow behavior, preserves synthetic-only metadata-only behavior, keeps next gate readiness, documentation update, and operator summary reference-only, keeps synthetic fixture evidence rows preview/reference-only, prevents raw command output or raw diff disclosure, keeps blocked-claim and permission summary receipts non-persistent and reference-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp130CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP130_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP130_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp130Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog();
  const unitIds = createPermissionKernelCp130CoveredUnitIds();
  const manifest = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest();
  const matrix = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary();
  const handoff = createPermissionKernelCp130CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 10) errors.push("CP00-130 row count must be 10");
  if (unitIds.length !== 10) errors.push("CP00-130 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-130 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P08.M05.S20") errors.push("CP00-130 first unit must be RP02.P08.M05.S20");
  if (unitIds.at(-1) !== "RP02.P08.M06.S07") errors.push("CP00-130 last unit must be RP02.P08.M06.S07");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-130 must cover two micro phases");
  if (manifest.phase_counts["RP02.P08.M05"] !== 3) errors.push("CP00-130 RP02.P08.M05 count must be 3");
  if (manifest.phase_counts["RP02.P08.M06"] !== 7) errors.push("CP00-130 RP02.P08.M06 count must be 7");
  if (manifest.domain_counts.permission_audit_terminal_boundary !== 3) {
    errors.push("CP00-130 permission audit terminal domain count must be 3");
  }
  if (manifest.domain_counts.synthetic_fixture_evidence_boundary !== 7) {
    errors.push("CP00-130 synthetic fixture evidence domain count must be 7");
  }
  if (manifest.deliverable_counts.implementation !== 3) errors.push("CP00-130 implementation deliverable count must be 3");
  if (manifest.deliverable_counts.hermes_evidence !== 7) errors.push("CP00-130 hermes_evidence deliverable count must be 7");
  if (matrix.inherited_hermes_evidence_workflow_result_count !== 40) errors.push("CP00-130 must inherit CP129 result count");
  if (matrix.inherited_closeout_handoff_no_commit !== true) errors.push("CP00-130 must inherit CP129 closeout no-commit");
  if (matrix.inherited_permission_summary_reference_only !== true) errors.push("CP00-130 must inherit CP129 permission summary reference-only");
  if (matrix.result_count !== 10) errors.push("CP00-130 result count must be 10");
  if (matrix.permission_audit_terminal_result_count !== 3) errors.push("CP00-130 terminal result count must be 3");
  if (matrix.synthetic_fixture_evidence_result_count !== 7) errors.push("CP00-130 synthetic fixture result count must be 7");

  if (resultById["permission_audit_terminal.next_gate_readiness"]?.permission_audit_terminal?.next_gate_readiness_bound !== true) {
    errors.push("CP00-130 next gate readiness must be bound");
  }
  if (resultById["permission_audit_terminal.documentation_update"]?.permission_audit_terminal?.documentation_published !== false) {
    errors.push("CP00-130 documentation update must not publish documentation");
  }
  if (resultById["permission_audit_terminal.operator_summary"]?.operator_summary?.hidden_fields_rendered !== false) {
    errors.push("CP00-130 operator summary must not render hidden fields");
  }
  if (resultById["synthetic_fixture_opening.hermes_command_matrix"]?.synthetic_fixture_evidence?.command_matrix_bound !== true) {
    errors.push("CP00-130 Hermes command matrix must be bound");
  }
  if (resultById["synthetic_fixture_opening.evidence_field_list"]?.synthetic_fixture_evidence?.evidence_field_list_bound !== true) {
    errors.push("CP00-130 evidence field list must be bound");
  }
  if (resultById["synthetic_fixture_opening.changed_file_receipt"]?.synthetic_fixture_evidence?.changed_files_disclose_raw_diff !== false) {
    errors.push("CP00-130 changed-file receipt must not disclose raw diff");
  }
  if (resultById["synthetic_fixture_opening.command_result_receipt"]?.synthetic_fixture_evidence?.command_result_discloses_raw_output !== false) {
    errors.push("CP00-130 command result receipt must not disclose raw output");
  }
  if (resultById["synthetic_fixture_opening.fixture_summary_receipt"]?.synthetic_fixture_evidence?.fixture_contains_real_data !== false) {
    errors.push("CP00-130 fixture summary must not contain real data");
  }
  if (resultById["synthetic_fixture_opening.blocked_claim_receipt"]?.synthetic_fixture_evidence?.blocked_claim_persisted !== false) {
    errors.push("CP00-130 blocked-claim receipt must not persist");
  }
  if (resultById["synthetic_fixture_opening.permission_summary_receipt"]?.synthetic_fixture_evidence?.permission_summary_reference_only !== true) {
    errors.push("CP00-130 permission summary must be reference-only");
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
      errors.push(`CP00-130 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-131" || handoff.next_subphase_id !== "RP02.P08.M06.S08") {
    errors.push("CP00-130 must hand off to CP00-131 / RP02.P08.M06.S08");
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
