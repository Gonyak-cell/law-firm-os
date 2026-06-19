import {
  PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT,
  createPermissionKernelCp133CloseoutHandoff,
  createPermissionKernelCp133TerminalReviewQuestionBoundary,
  runPermissionKernelCp133TerminalReviewQuestionBoundaryCase,
} from "./terminal-review-question-boundary.js";

export const PERMISSION_KERNEL_CP134_PACK_BINDING = Object.freeze({
  pack_id: "CP00-134",
  planned_pack_id: "CP00-134",
  risk_class: "C",
  unit_count: 65,
  range: "RP02.P09.M06.S08-RP02.P09.M10.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-133",
  next_pack_id: "CP00-135",
  next_subphase_id: "RP03.P00.M00.S01",
});

const CP134_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP134_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "risk_register_internal_notes",
  "severity_taxonomy_internal_mapping",
  "go_no_go_internal_verdict",
  "finding_routing_internal_map",
  "human_approval_internal_summary",
  "claude_packet_internal_prompt",
  "closeout_criteria_internal_checklist",
  "pass_note_internal_text",
  "pass_with_findings_internal_text",
  "block_note_internal_text",
  "next_dependency_internal_map",
  "documentation_internal_draft",
  "command_rerun_raw_output",
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

const CP134_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP02.P09.M06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "synthetic_fixture_terminal_closeout_readiness",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(7, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M07",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "test_golden_case_review_closeout_readiness",
    units: REVIEW_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M08",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "hermes_evidence_review_closeout_readiness",
    units: REVIEW_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M09",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "claude_review_packet_opening_readiness",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP02.P09.M10",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "rp02_terminal_closeout_next_handoff_opening",
    units: Object.freeze(REVIEW_FULL_UNITS.slice(0, 4)),
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  architecture_review_questions: "architecture_review_questions_bound",
  audit_completeness_questions: "audit_completeness_questions_bound",
  block_closeout_note: "block_closeout_note_bound",
  claude_review_packet: "claude_review_packet_bound",
  closeout_criteria: "closeout_criteria_bound",
  command_rerun: "command_rerun_bound",
  documentation_update: "documentation_update_bound",
  downstream_readiness_questions: "downstream_readiness_questions_bound",
  finding_routing_map: "finding_routing_map_bound",
  go_no_go_verdict_format: "go_no_go_verdict_format_bound",
  human_approval_summary: "human_approval_summary_bound",
  missing_test_questions: "missing_test_questions_bound",
  next_rp_dependency: "next_rp_dependency_bound",
  pass_closeout_note: "pass_closeout_note_bound",
  pass_with_findings_closeout_note: "pass_with_findings_closeout_note_bound",
  permission_bypass_questions: "permission_bypass_questions_bound",
  risk_register: "risk_register_bound",
  security_review_questions: "security_review_questions_bound",
  severity_taxonomy: "severity_taxonomy_bound",
  ui_leak_questions: "ui_leak_questions_bound",
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

function domainFor(behaviorKind) {
  if (["architecture_review_questions", "security_review_questions", "downstream_readiness_questions", "risk_register"].includes(behaviorKind)) {
    return "review_question_boundary";
  }
  if (["permission_bypass_questions", "audit_completeness_questions"].includes(behaviorKind)) {
    return "security_audit_question_boundary";
  }
  if (behaviorKind === "missing_test_questions") return "test_question_boundary";
  if (behaviorKind === "ui_leak_questions") return "ui_leak_question_boundary";
  if (behaviorKind === "claude_review_packet") return "claude_review_packet_boundary";
  if (["next_rp_dependency", "documentation_update", "command_rerun"].includes(behaviorKind)) return "terminal_handoff_boundary";
  return "closeout_decision_boundary";
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp134.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-134",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_terminal_review_closeout_readiness: true,
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
    no_write_attestation: CP134_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP134_MICRO_PHASES.flatMap((micro) =>
      micro.units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
          program_id: "RP02",
          phase_id: "RP02.P09",
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: `${domain}.${slugFor(micro.micro_title)}`,
          domain,
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${microSlug(micro.micro_phase_id)}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_terminal_review_closeout_readiness",
            "cp133_terminal_review_question_boundary_inherited",
            "review_questions_reference_only",
            "security_audit_questions_do_not_execute_bypass",
            "test_questions_do_not_execute_tests",
            "ui_leak_questions_do_not_render_ui",
            "claude_review_packet_does_not_execute_review",
            "closeout_decisions_do_not_mark_production_ready",
            "terminal_handoff_reference_only",
            "no_permission_policy_mutation",
            "no_audit_ledger_write",
            "no_product_or_database_write",
            "export_share_ai_boundaries_not_executed",
            "ldip_not_implemented",
            "hrx_embedded_inside_law_firm_os",
          ]),
          boundary_flags: CP134_NO_WRITE_ATTESTATION,
          synthetic_only: true,
          no_real_data: true,
          product_state_effect: "none",
        });
      }),
    ),
  );
}

function createBoundaryResult(row) {
  const status = STATUS_BY_KIND[row.behavior_kind] ?? "blocked_unknown_terminal_review_closeout_kind";
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
    review_questions: Object.freeze({
      enabled_for_phase: row.domain === "review_question_boundary",
      architecture_review_questions_bound: row.behavior_kind === "architecture_review_questions",
      security_review_questions_bound: row.behavior_kind === "security_review_questions",
      downstream_readiness_questions_bound: row.behavior_kind === "downstream_readiness_questions",
      risk_register_bound: row.behavior_kind === "risk_register",
      executes_claude_review: false,
      writes_risk_register: false,
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
    claude_review_packet: Object.freeze({
      enabled_for_phase: row.domain === "claude_review_packet_boundary",
      packet_bound: row.behavior_kind === "claude_review_packet",
      model: "claude-opus-4-8",
      effort: "max",
      read_only: true,
      exactly_one_valid_pack_review_required: true,
      executes_claude_review: false,
      reference_only: true,
    }),
    closeout_decisions: Object.freeze({
      enabled_for_phase: row.domain === "closeout_decision_boundary",
      severity_taxonomy_bound: row.behavior_kind === "severity_taxonomy",
      go_no_go_verdict_format_bound: row.behavior_kind === "go_no_go_verdict_format",
      finding_routing_map_bound: row.behavior_kind === "finding_routing_map",
      human_approval_summary_bound: row.behavior_kind === "human_approval_summary",
      closeout_criteria_bound: row.behavior_kind === "closeout_criteria",
      pass_closeout_note_bound: row.behavior_kind === "pass_closeout_note",
      pass_with_findings_closeout_note_bound: row.behavior_kind === "pass_with_findings_closeout_note",
      block_closeout_note_bound: row.behavior_kind === "block_closeout_note",
      pass_with_findings_requires_adjudication: row.behavior_kind === "pass_with_findings_closeout_note",
      block_prevents_production_ready: row.behavior_kind === "block_closeout_note",
      routes_findings: row.behavior_kind === "finding_routing_map",
      routing_executes: false,
      grants_human_approval: false,
      marks_production_ready: false,
      reference_only: true,
    }),
    terminal_handoff: Object.freeze({
      enabled_for_phase: row.domain === "terminal_handoff_boundary",
      next_rp_dependency_bound: row.behavior_kind === "next_rp_dependency",
      documentation_update_bound: row.behavior_kind === "documentation_update",
      command_rerun_bound: row.behavior_kind === "command_rerun",
      documentation_published: false,
      command_rerun_executed: false,
      commits_pack: false,
      marks_production_ready: false,
      next_pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_pack_id,
      next_subphase_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_subphase_id,
      reference_only: true,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp134_terminal_review_closeout_readiness_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP134_PACK_BINDING.range,
  upstream_terminal_review_question_boundary_pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.upstream_pack_id,
  inherited_terminal_review_question_boundary_contract_id:
    PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP134_PACK_BINDING.unit_count,
  risk_c_terminal_review_closeout_readiness: true,
  synthetic_only: true,
  review_questions_reference_only: true,
  security_audit_questions_reference_only: true,
  test_questions_reference_only: true,
  ui_leak_questions_reference_only: true,
  claude_review_packet_reference_only: true,
  closeout_decisions_reference_only: true,
  terminal_handoff_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP134_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP134_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP134_PACK_BINDING",
    "PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT",
    "createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog",
    "createPermissionKernelCp134CoveredUnitIds",
    "createPermissionKernelCp134TerminalReviewCloseoutReadiness",
    "runPermissionKernelCp134TerminalReviewCloseoutReadinessCase",
    "createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest",
    "createPermissionKernelCp134HermesEvidencePacket",
    "createPermissionKernelCp134ClaudeReviewPacket",
    "createPermissionKernelCp134CloseoutHandoff",
    "validatePermissionKernelCp134Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue from RP02 Permission Kernel terminal closeout into RP03 Audit And Compliance Kernel at RP03.P00.M00.S01 as planned CP00-135 Risk C; preserve CP134 review, security audit, test, UI leak, Claude review packet, closeout decision, and terminal handoff rows as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog() {
  return Object.freeze(buildRows());
}

export function createPermissionKernelCp134CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(caseId) {
  const row = createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_terminal_review_closeout_readiness_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp134TerminalReviewCloseoutReadiness() {
  const catalog = createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog();
  const inheritedMatrix = createPermissionKernelCp133TerminalReviewQuestionBoundary();
  const inheritedHandoff = createPermissionKernelCp133CloseoutHandoff();
  const inheritedPermissionBypass = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
    "rp02_p09_m06.permission_bypass_questions",
  );
  const inheritedUiLeak = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase("rp02_p09_m06.ui_leak_questions");
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.upstream_pack_id,
    inherited_terminal_review_question_result_count: inheritedMatrix.result_count,
    inherited_handoff_to_cp134:
      inheritedHandoff.next_pack_id === PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id &&
      inheritedHandoff.next_subphase_id === "RP02.P09.M06.S08",
    inherited_permission_bypass_no_execution:
      inheritedPermissionBypass.security_audit_questions?.executes_permission_bypass === false,
    inherited_ui_leak_not_rendered: inheritedUiLeak.ui_leak_questions?.renders_ui === false,
    result_count: caseResults.length,
    review_question_result_count: domainCounts.review_question_boundary ?? 0,
    security_audit_question_result_count: domainCounts.security_audit_question_boundary ?? 0,
    test_question_result_count: domainCounts.test_question_boundary ?? 0,
    ui_leak_question_result_count: domainCounts.ui_leak_question_boundary ?? 0,
    claude_review_packet_result_count: domainCounts.claude_review_packet_boundary ?? 0,
    closeout_decision_result_count: domainCounts.closeout_decision_boundary ?? 0,
    terminal_handoff_result_count: domainCounts.terminal_handoff_boundary ?? 0,
    case_results: caseResults,
    readiness_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP134_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP134_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest() {
  const rows = createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog();
  const unitIds = createPermissionKernelCp134CoveredUnitIds();
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
  const matrix = createPermissionKernelCp134TerminalReviewCloseoutReadiness();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp134_terminal_review_closeout_readiness_manifest",
    source_unit_range: PERMISSION_KERNEL_CP134_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_terminal_review_question_result_count: matrix.inherited_terminal_review_question_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_c_terminal_review_closeout_readiness: true,
    closeout_decisions_reference_only: true,
    terminal_handoff_reference_only: true,
    no_write_attestation: CP134_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp134HermesEvidencePacket() {
  const manifest = createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp134_terminal_review_closeout_readiness_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-134",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp134ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp134_terminal_review_closeout_readiness_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-134 closes the planned Risk C RP02 terminal review and closeout readiness units RP02.P09.M06.S08-RP02.P09.M10.S04, inherits CP133 terminal review question behavior, keeps risk registers, severity taxonomy, go/no-go verdicts, finding routing maps, human approval summaries, Claude review packets, closeout criteria, closeout notes, next dependencies, documentation updates, command reruns, review questions, security audit questions, missing-test questions, and UI leak questions reference-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp134CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP134_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP134_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT.handoff.next_scope,
    rp02_terminal_pack: true,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp134Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog();
  const unitIds = createPermissionKernelCp134CoveredUnitIds();
  const manifest = createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest();
  const matrix = createPermissionKernelCp134TerminalReviewCloseoutReadiness();
  const handoff = createPermissionKernelCp134CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 65) errors.push("CP00-134 row count must be 65");
  if (unitIds.length !== 65) errors.push("CP00-134 covered unit count must be 65");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-134 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P09.M06.S08") errors.push("CP00-134 first unit must be RP02.P09.M06.S08");
  if (unitIds.at(-1) !== "RP02.P09.M10.S04") errors.push("CP00-134 last unit must be RP02.P09.M10.S04");
  if (manifest.covered_micro_phase_count !== 5) errors.push("CP00-134 must cover five micro phases");

  for (const [microPhaseId, count] of Object.entries({
    "RP02.P09.M06": 13,
    "RP02.P09.M07": 20,
    "RP02.P09.M08": 20,
    "RP02.P09.M09": 8,
    "RP02.P09.M10": 4,
  })) {
    if (manifest.phase_counts[microPhaseId] !== count) errors.push(`CP00-134 ${microPhaseId} count must be ${count}`);
  }

  for (const [deliverableType, count] of Object.entries({
    implementation: 40,
    claude_review: 11,
    security_audit: 8,
    test: 3,
    ui: 3,
  })) {
    if (manifest.deliverable_counts[deliverableType] !== count) {
      errors.push(`CP00-134 ${deliverableType} deliverable count must be ${count}`);
    }
  }

  if (matrix.inherited_terminal_review_question_result_count !== 10) errors.push("CP00-134 must inherit CP133 result count");
  if (matrix.inherited_handoff_to_cp134 !== true) errors.push("CP00-134 must inherit CP133 handoff");
  if (matrix.inherited_permission_bypass_no_execution !== true) {
    errors.push("CP00-134 must inherit CP133 permission bypass no-execution");
  }
  if (matrix.inherited_ui_leak_not_rendered !== true) errors.push("CP00-134 must inherit CP133 UI leak no-rendering");
  if (matrix.result_count !== 65) errors.push("CP00-134 result count must be 65");
  if (matrix.review_question_result_count !== 15) errors.push("CP00-134 review question result count must be 15");
  if (matrix.security_audit_question_result_count !== 8) errors.push("CP00-134 security audit question result count must be 8");
  if (matrix.test_question_result_count !== 3) errors.push("CP00-134 test question result count must be 3");
  if (matrix.ui_leak_question_result_count !== 3) errors.push("CP00-134 UI leak question result count must be 3");
  if (matrix.claude_review_packet_result_count !== 3) errors.push("CP00-134 Claude review packet result count must be 3");
  if (matrix.closeout_decision_result_count !== 24) errors.push("CP00-134 closeout decision result count must be 24");
  if (matrix.terminal_handoff_result_count !== 9) errors.push("CP00-134 terminal handoff result count must be 9");

  if (resultById["rp02_p09_m06.risk_register"]?.review_questions?.writes_risk_register !== false) {
    errors.push("CP00-134 risk register must not write risk state");
  }
  if (resultById["rp02_p09_m07.finding_routing_map"]?.closeout_decisions?.routing_executes !== false) {
    errors.push("CP00-134 finding routing must not execute routing");
  }
  if (resultById["rp02_p09_m07.pass_with_findings_closeout_note"]?.closeout_decisions?.pass_with_findings_requires_adjudication !== true) {
    errors.push("CP00-134 PASS_WITH_FINDINGS note must require adjudication");
  }
  if (resultById["rp02_p09_m08.block_closeout_note"]?.closeout_decisions?.block_prevents_production_ready !== true) {
    errors.push("CP00-134 BLOCK note must prevent production_ready");
  }
  if (resultById["rp02_p09_m08.claude_review_packet"]?.claude_review_packet?.executes_claude_review !== false) {
    errors.push("CP00-134 Claude review packet must not execute Claude");
  }
  if (resultById["rp02_p09_m08.command_rerun"]?.terminal_handoff?.command_rerun_executed !== false) {
    errors.push("CP00-134 command rerun must not execute commands");
  }
  if (resultById["rp02_p09_m09.permission_bypass_questions"]?.security_audit_questions?.executes_permission_bypass !== false) {
    errors.push("CP00-134 permission bypass questions must not execute bypass probes");
  }
  if (resultById["rp02_p09_m09.ui_leak_questions"]?.ui_leak_questions?.renders_ui !== false) {
    errors.push("CP00-134 UI leak questions must not render UI");
  }
  if (resultById["rp02_p09_m10.audit_completeness_questions"]?.security_audit_questions?.emits_audit_event !== false) {
    errors.push("CP00-134 audit completeness questions must not emit audit events");
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
      errors.push(`CP00-134 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-135" || handoff.next_subphase_id !== "RP03.P00.M00.S01") {
    errors.push("CP00-134 must hand off to CP00-135 / RP03.P00.M00.S01");
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
