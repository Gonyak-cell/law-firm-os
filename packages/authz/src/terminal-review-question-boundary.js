import {
  PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT,
  createPermissionKernelCp132CloseoutHandoff,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix,
  runPermissionKernelCp132FixtureEvidenceReviewReadinessCase,
} from "./fixture-evidence-review-readiness-catalog.js";

export const PERMISSION_KERNEL_CP133_PACK_BINDING = Object.freeze({
  pack_id: "CP00-133",
  planned_pack_id: "CP00-133",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P09.M05.S18-RP02.P09.M06.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-132",
  next_pack_id: "CP00-134",
  next_subphase_id: "RP02.P09.M06.S08",
});

const CP133_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP133_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "next_dependency_internal_map",
  "documentation_internal_draft",
  "command_rerun_raw_output",
  "architecture_review_internal_notes",
  "security_review_internal_trace",
  "permission_bypass_internal_probe",
  "audit_completeness_internal_sample",
  "missing_test_internal_gap",
  "ui_leak_internal_selector",
  "downstream_readiness_internal_checklist",
]);

const CP133_UNITS = Object.freeze([
  Object.freeze({
    id: "RP02.P09.M05.S18",
    title: "Next RP dependency",
    micro_phase_id: "RP02.P09.M05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "implementation",
    domain: "terminal_handoff_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M05.S19",
    title: "Documentation update",
    micro_phase_id: "RP02.P09.M05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "implementation",
    domain: "terminal_handoff_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M05.S20",
    title: "Command rerun",
    micro_phase_id: "RP02.P09.M05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "implementation",
    domain: "terminal_handoff_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S01",
    title: "Architecture review questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "claude_review",
    domain: "review_question_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S02",
    title: "Security review questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "claude_review",
    domain: "review_question_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S03",
    title: "Permission bypass questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "security_audit",
    domain: "security_audit_question_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S04",
    title: "Audit completeness questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "security_audit",
    domain: "security_audit_question_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S05",
    title: "Missing test questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "test",
    domain: "test_question_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S06",
    title: "UI leak questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "ui",
    domain: "ui_leak_question_boundary",
  }),
  Object.freeze({
    id: "RP02.P09.M06.S07",
    title: "Downstream readiness questions",
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "implementation",
    domain: "review_question_boundary",
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  audit_completeness_questions: "audit_completeness_questions_bound",
  architecture_review_questions: "architecture_review_questions_bound",
  command_rerun: "command_rerun_bound",
  documentation_update: "documentation_update_bound",
  downstream_readiness_questions: "downstream_readiness_questions_bound",
  missing_test_questions: "missing_test_questions_bound",
  next_rp_dependency: "next_rp_dependency_bound",
  permission_bypass_questions: "permission_bypass_questions_bound",
  security_review_questions: "security_review_questions_bound",
  ui_leak_questions: "ui_leak_questions_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function microSlug(microPhaseId) {
  return microPhaseId.toLowerCase().replaceAll(".", "_");
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp133.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-133",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_terminal_review_question_boundary: true,
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
    no_write_attestation: CP133_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP133_UNITS.map((unit) => {
      const behaviorKind = slugFor(unit.title);
      return Object.freeze({
        catalog_id: `${unit.id}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: "RP02.P09",
        micro_phase_id: unit.micro_phase_id,
        micro_id: unit.micro_id,
        micro_title: unit.micro_title,
        phase_role:
          unit.micro_phase_id === "RP02.P09.M05"
            ? "permission_audit_binding_terminal_handoff"
            : "synthetic_fixture_review_question_boundary",
        area: `${unit.domain}.${slugFor(unit.micro_title)}`,
        domain: unit.domain,
        title: unit.title,
        coverage_kind: behaviorKind,
        deliverable_type: unit.deliverable_type,
        case_id: `${microSlug(unit.micro_phase_id)}.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([unit.id]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_a_terminal_review_question_boundary",
          "cp132_fixture_evidence_review_readiness_inherited",
          "terminal_handoff_reference_only",
          "review_questions_reference_only",
          "security_audit_questions_do_not_execute_bypass",
          "test_questions_do_not_execute_tests",
          "ui_leak_questions_do_not_render_ui",
          "command_rerun_not_executed_by_runtime",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP133_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

function createBoundaryResult(row) {
  const status = STATUS_BY_KIND[row.behavior_kind] ?? "blocked_unknown_terminal_review_question_kind";
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
    terminal_handoff: Object.freeze({
      enabled_for_phase: row.domain === "terminal_handoff_boundary",
      next_rp_dependency_bound: row.behavior_kind === "next_rp_dependency",
      documentation_update_bound: row.behavior_kind === "documentation_update",
      command_rerun_bound: row.behavior_kind === "command_rerun",
      documentation_published: false,
      command_rerun_executed: false,
      commits_pack: false,
      marks_production_ready: false,
      next_pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_pack_id,
      next_subphase_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_subphase_id,
      reference_only: true,
    }),
    review_questions: Object.freeze({
      enabled_for_phase: row.domain === "review_question_boundary",
      architecture_review_questions_bound: row.behavior_kind === "architecture_review_questions",
      security_review_questions_bound: row.behavior_kind === "security_review_questions",
      downstream_readiness_questions_bound: row.behavior_kind === "downstream_readiness_questions",
      executes_claude_review: false,
      grants_approval: false,
      reference_only: true,
    }),
    security_audit_questions: Object.freeze({
      enabled_for_phase: row.domain === "security_audit_question_boundary",
      permission_bypass_questions_bound: row.behavior_kind === "permission_bypass_questions",
      audit_completeness_questions_bound: row.behavior_kind === "audit_completeness_questions",
      executes_permission_bypass: false,
      emits_audit_event: false,
      mutates_permission_policy: false,
      reference_only: true,
    }),
    test_questions: Object.freeze({
      enabled_for_phase: row.domain === "test_question_boundary",
      missing_test_questions_bound: row.behavior_kind === "missing_test_questions",
      executes_tests: false,
      writes_fixture_files: false,
      reference_only: true,
    }),
    ui_leak_questions: Object.freeze({
      enabled_for_phase: row.domain === "ui_leak_question_boundary",
      ui_leak_questions_bound: row.behavior_kind === "ui_leak_questions",
      renders_ui: false,
      exposes_selectors: false,
      reference_only: true,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp133_terminal_review_question_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP133_PACK_BINDING.range,
  upstream_fixture_evidence_review_readiness_catalog_pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.upstream_pack_id,
  inherited_fixture_evidence_review_readiness_catalog_contract_id:
    PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP133_PACK_BINDING.unit_count,
  risk_a_terminal_review_question_boundary: true,
  synthetic_only: true,
  terminal_handoff_reference_only: true,
  review_questions_reference_only: true,
  security_audit_questions_reference_only: true,
  test_questions_reference_only: true,
  ui_leak_questions_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP133_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP133_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP133_PACK_BINDING",
    "PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT",
    "createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog",
    "createPermissionKernelCp133CoveredUnitIds",
    "createPermissionKernelCp133TerminalReviewQuestionBoundary",
    "runPermissionKernelCp133TerminalReviewQuestionBoundaryCase",
    "createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest",
    "createPermissionKernelCp133HermesEvidencePacket",
    "createPermissionKernelCp133ClaudeReviewPacket",
    "createPermissionKernelCp133CloseoutHandoff",
    "validatePermissionKernelCp133Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel synthetic fixture set review and closeout readiness at RP02.P09.M06.S08 as planned CP00-134 Risk C; preserve CP133 terminal handoff, documentation, command rerun, review questions, security audit questions, missing test questions, UI leak questions, and downstream readiness questions as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog() {
  return Object.freeze(buildRows());
}

export function createPermissionKernelCp133CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(caseId) {
  const row = createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_terminal_review_question_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp133TerminalReviewQuestionBoundary() {
  const catalog = createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog();
  const inheritedMatrix = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix();
  const inheritedHandoff = createPermissionKernelCp132CloseoutHandoff();
  const inheritedPermissionBypass = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase(
    "rp02_p09_m00.permission_bypass_questions",
  );
  const inheritedCommandRerun = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p09_m04.command_rerun");
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.upstream_pack_id,
    inherited_fixture_evidence_review_readiness_result_count: inheritedMatrix.result_count,
    inherited_handoff_to_cp133:
      inheritedHandoff.next_pack_id === PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id &&
      inheritedHandoff.next_subphase_id === "RP02.P09.M05.S18",
    inherited_permission_bypass_no_execution:
      inheritedPermissionBypass.review_questions?.executes_permission_bypass === false,
    inherited_command_rerun_reference_only:
      inheritedCommandRerun.closeout_readiness?.command_rerun_executed === false,
    result_count: caseResults.length,
    terminal_handoff_result_count: domainCounts.terminal_handoff_boundary ?? 0,
    review_question_result_count: domainCounts.review_question_boundary ?? 0,
    security_audit_question_result_count: domainCounts.security_audit_question_boundary ?? 0,
    test_question_result_count: domainCounts.test_question_boundary ?? 0,
    ui_leak_question_result_count: domainCounts.ui_leak_question_boundary ?? 0,
    case_results: caseResults,
    readiness_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP133_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP133_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest() {
  const rows = createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog();
  const unitIds = createPermissionKernelCp133CoveredUnitIds();
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
  const matrix = createPermissionKernelCp133TerminalReviewQuestionBoundary();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp133_terminal_review_question_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP133_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_fixture_evidence_review_readiness_result_count:
      matrix.inherited_fixture_evidence_review_readiness_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_terminal_review_question_boundary: true,
    terminal_handoff_reference_only: true,
    review_questions_reference_only: true,
    no_write_attestation: CP133_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp133HermesEvidencePacket() {
  const manifest = createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp133_terminal_review_question_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-133",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp133ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp133_terminal_review_question_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-133 closes the planned Risk A terminal handoff and synthetic fixture review-question boundary units RP02.P09.M05.S18-RP02.P09.M06.S07, inherits CP132 fixture/evidence/review readiness behavior, keeps next RP dependency, documentation update, command rerun, architecture/security review questions, permission bypass questions, audit completeness questions, missing test questions, UI leak questions, and downstream readiness questions reference-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp133CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP133_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP133_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp133Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog();
  const unitIds = createPermissionKernelCp133CoveredUnitIds();
  const manifest = createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest();
  const matrix = createPermissionKernelCp133TerminalReviewQuestionBoundary();
  const handoff = createPermissionKernelCp133CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 10) errors.push("CP00-133 row count must be 10");
  if (unitIds.length !== 10) errors.push("CP00-133 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-133 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P09.M05.S18") errors.push("CP00-133 first unit must be RP02.P09.M05.S18");
  if (unitIds.at(-1) !== "RP02.P09.M06.S07") errors.push("CP00-133 last unit must be RP02.P09.M06.S07");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-133 must cover two micro phases");

  for (const [microPhaseId, count] of Object.entries({
    "RP02.P09.M05": 3,
    "RP02.P09.M06": 7,
  })) {
    if (manifest.phase_counts[microPhaseId] !== count) errors.push(`CP00-133 ${microPhaseId} count must be ${count}`);
  }

  for (const [deliverableType, count] of Object.entries({
    implementation: 4,
    claude_review: 2,
    security_audit: 2,
    test: 1,
    ui: 1,
  })) {
    if (manifest.deliverable_counts[deliverableType] !== count) {
      errors.push(`CP00-133 ${deliverableType} deliverable count must be ${count}`);
    }
  }

  if (matrix.inherited_fixture_evidence_review_readiness_result_count !== 150) {
    errors.push("CP00-133 must inherit CP132 result count");
  }
  if (matrix.inherited_handoff_to_cp133 !== true) errors.push("CP00-133 must inherit CP132 handoff");
  if (matrix.inherited_permission_bypass_no_execution !== true) {
    errors.push("CP00-133 must inherit CP132 permission bypass no-execution");
  }
  if (matrix.inherited_command_rerun_reference_only !== true) {
    errors.push("CP00-133 must inherit CP132 command rerun reference-only behavior");
  }
  if (matrix.result_count !== 10) errors.push("CP00-133 result count must be 10");
  if (matrix.terminal_handoff_result_count !== 3) errors.push("CP00-133 terminal handoff result count must be 3");
  if (matrix.review_question_result_count !== 3) errors.push("CP00-133 review question result count must be 3");
  if (matrix.security_audit_question_result_count !== 2) {
    errors.push("CP00-133 security audit question result count must be 2");
  }
  if (matrix.test_question_result_count !== 1) errors.push("CP00-133 test question result count must be 1");
  if (matrix.ui_leak_question_result_count !== 1) errors.push("CP00-133 UI leak question result count must be 1");

  if (resultById["rp02_p09_m05.next_rp_dependency"]?.terminal_handoff?.next_rp_dependency_bound !== true) {
    errors.push("CP00-133 next RP dependency must be bound");
  }
  if (resultById["rp02_p09_m05.documentation_update"]?.terminal_handoff?.documentation_published !== false) {
    errors.push("CP00-133 documentation update must not publish docs");
  }
  if (resultById["rp02_p09_m05.command_rerun"]?.terminal_handoff?.command_rerun_executed !== false) {
    errors.push("CP00-133 command rerun must not execute commands");
  }
  if (resultById["rp02_p09_m06.architecture_review_questions"]?.review_questions?.executes_claude_review !== false) {
    errors.push("CP00-133 architecture questions must not execute Claude");
  }
  if (resultById["rp02_p09_m06.permission_bypass_questions"]?.security_audit_questions?.executes_permission_bypass !== false) {
    errors.push("CP00-133 permission bypass questions must not execute bypass probes");
  }
  if (resultById["rp02_p09_m06.audit_completeness_questions"]?.security_audit_questions?.emits_audit_event !== false) {
    errors.push("CP00-133 audit completeness questions must not emit audit events");
  }
  if (resultById["rp02_p09_m06.missing_test_questions"]?.test_questions?.executes_tests !== false) {
    errors.push("CP00-133 missing test questions must not execute tests");
  }
  if (resultById["rp02_p09_m06.ui_leak_questions"]?.ui_leak_questions?.renders_ui !== false) {
    errors.push("CP00-133 UI leak questions must not render UI");
  }
  if (resultById["rp02_p09_m06.downstream_readiness_questions"]?.review_questions?.grants_approval !== false) {
    errors.push("CP00-133 downstream readiness questions must not grant approval");
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
      errors.push(`CP00-133 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-134" || handoff.next_subphase_id !== "RP02.P09.M06.S08") {
    errors.push("CP00-133 must hand off to CP00-134 / RP02.P09.M06.S08");
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
