import {
  CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING,
} from "./failure-taxonomy.js";

export const CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING = Object.freeze({
  pack_id: "CP00-105",
  planned_pack_id: "CP00-105",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P07.M08.S18-RP01.P09.M03.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_failure_taxonomy_pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
});

const CP105_FAILURE_CLOSEOUT_PHASES = Object.freeze({
  "RP01.P07.M08": Object.freeze({ start_index: 18, count: 3 }),
  "RP01.P07.M09": Object.freeze({ start_index: 1, count: 11 }),
  "RP01.P07.M10": Object.freeze({ start_index: 1, count: 3 }),
});

const CP105_FAILURE_CATEGORY_TEMPLATES = Object.freeze([
  Object.freeze({ category_id: "failure_taxonomy", title: "Failure taxonomy", expected_status: "taxonomy_reference" }),
  Object.freeze({ category_id: "missing_tenant", title: "Missing tenant failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "missing_actor", title: "Missing actor failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "missing_matter", title: "Missing Matter failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "missing_resource", title: "Missing resource failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "unknown_action", title: "Unknown action failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "cross_tenant", title: "Cross-tenant failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "permission_denied", title: "Permission denied failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "ambiguous_rule", title: "Ambiguous rule failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "stale_reference", title: "Stale reference failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "lock_conflict", title: "Lock conflict failure", expected_status: "retry_required_reference" }),
  Object.freeze({ category_id: "retry_exhaustion", title: "Retry exhaustion failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "rollback_expectation", title: "Rollback expectation", expected_status: "rollback_expected_reference" }),
  Object.freeze({ category_id: "compensation_expectation", title: "Compensation expectation", expected_status: "compensation_expected_reference" }),
  Object.freeze({ category_id: "blocked_claim_receipt", title: "Blocked-claim receipt", expected_status: "receipt_expected_reference" }),
  Object.freeze({ category_id: "failure_fixture", title: "Failure fixture", expected_status: "fixture_expected_reference" }),
  Object.freeze({ category_id: "failure_unit_test", title: "Failure unit test", expected_status: "test_expected_reference" }),
  Object.freeze({ category_id: "failure_integration_smoke", title: "Failure integration smoke", expected_status: "smoke_expected_reference" }),
  Object.freeze({ category_id: "audit_failure_hint", title: "Audit failure hint", expected_status: "audit_hint_expected_reference" }),
  Object.freeze({ category_id: "hermes_failure_evidence", title: "Hermes failure evidence", expected_status: "hermes_evidence_expected_reference" }),
]);

const CP105_FAILURE_CLOSEOUT_CATEGORY_IDS = Object.freeze([
  "failure_taxonomy",
  "missing_tenant",
  "missing_actor",
  "missing_matter",
  "missing_resource",
  "unknown_action",
  "cross_tenant",
  "permission_denied",
  "ambiguous_rule",
  "stale_reference",
  "lock_conflict",
  "failure_integration_smoke",
  "audit_failure_hint",
  "hermes_failure_evidence",
]);

const CP105_HERMES_PHASE_COUNTS = Object.freeze({
  "RP01.P08.M00": 4,
  "RP01.P08.M01": 4,
  "RP01.P08.M02": 8,
  "RP01.P08.M03": 20,
  "RP01.P08.M04": 11,
  "RP01.P08.M05": 20,
  "RP01.P08.M06": 8,
  "RP01.P08.M07": 20,
  "RP01.P08.M08": 8,
  "RP01.P08.M09": 8,
  "RP01.P08.M10": 4,
});

const CP105_HERMES_RECEIPT_TEMPLATES = Object.freeze([
  Object.freeze({ receipt_id: "hermes_command_matrix", title: "Hermes command matrix", receipt_kind: "command_matrix" }),
  Object.freeze({ receipt_id: "evidence_field_list", title: "Evidence field list", receipt_kind: "field_inventory" }),
  Object.freeze({ receipt_id: "changed_file_receipt", title: "Changed-file receipt", receipt_kind: "changed_file_inventory" }),
  Object.freeze({ receipt_id: "command_result_receipt", title: "Command result receipt", receipt_kind: "command_result" }),
  Object.freeze({ receipt_id: "fixture_summary_receipt", title: "Fixture summary receipt", receipt_kind: "fixture_summary" }),
  Object.freeze({ receipt_id: "blocked_claim_receipt", title: "Blocked-claim receipt", receipt_kind: "blocked_claim_summary" }),
  Object.freeze({ receipt_id: "permission_summary_receipt", title: "Permission summary receipt", receipt_kind: "permission_reference_summary" }),
  Object.freeze({ receipt_id: "audit_summary_receipt", title: "Audit summary receipt", receipt_kind: "audit_reference_summary" }),
  Object.freeze({ receipt_id: "no_real_data_receipt", title: "No-real-data receipt", receipt_kind: "no_real_data_attestation" }),
  Object.freeze({ receipt_id: "claude_dependency_marker", title: "Claude dependency marker", receipt_kind: "claude_review_dependency" }),
  Object.freeze({ receipt_id: "human_approval_marker", title: "Human approval marker", receipt_kind: "human_approval_dependency" }),
  Object.freeze({ receipt_id: "pass_semantics", title: "PASS semantics", receipt_kind: "gate_semantics" }),
  Object.freeze({ receipt_id: "pass_with_findings_semantics", title: "PASS_WITH_FINDINGS semantics", receipt_kind: "gate_semantics" }),
  Object.freeze({ receipt_id: "block_semantics", title: "BLOCK semantics", receipt_kind: "gate_semantics" }),
  Object.freeze({ receipt_id: "evidence_template", title: "Evidence template", receipt_kind: "template_reference" }),
  Object.freeze({ receipt_id: "validation_command_check", title: "Validation command check", receipt_kind: "validation_command_reference" }),
  Object.freeze({ receipt_id: "harness_boundary_note", title: "Harness boundary note", receipt_kind: "harness_boundary_reference" }),
  Object.freeze({ receipt_id: "closeout_handoff", title: "Closeout handoff", receipt_kind: "handoff_reference" }),
  Object.freeze({ receipt_id: "regression_receipt", title: "Regression receipt", receipt_kind: "regression_reference" }),
  Object.freeze({ receipt_id: "next_gate_readiness", title: "Next gate readiness", receipt_kind: "next_gate_reference" }),
]);

const CP105_REVIEW_PHASE_COUNTS = Object.freeze({
  "RP01.P09.M00": 1,
  "RP01.P09.M01": 4,
  "RP01.P09.M02": 4,
  "RP01.P09.M03": 9,
});

const CP105_REVIEW_QUESTION_TEMPLATES = Object.freeze([
  Object.freeze({ question_id: "architecture_review_questions", title: "Architecture review questions", review_area: "architecture" }),
  Object.freeze({ question_id: "security_review_questions", title: "Security review questions", review_area: "security" }),
  Object.freeze({ question_id: "permission_bypass_questions", title: "Permission bypass questions", review_area: "permission_boundary" }),
  Object.freeze({ question_id: "audit_completeness_questions", title: "Audit completeness questions", review_area: "audit_boundary" }),
  Object.freeze({ question_id: "missing_test_questions", title: "Missing test questions", review_area: "test_gap" }),
  Object.freeze({ question_id: "ui_leak_questions", title: "UI leak questions", review_area: "ui_data_leak" }),
  Object.freeze({ question_id: "downstream_readiness_questions", title: "Downstream readiness questions", review_area: "downstream_readiness" }),
  Object.freeze({ question_id: "risk_register", title: "Risk register", review_area: "risk_register" }),
  Object.freeze({ question_id: "severity_taxonomy", title: "Severity taxonomy", review_area: "finding_severity" }),
]);

export const CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT = Object.freeze({
  pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
  contract_id: "core_domain_cp105_evidence_review_catalog_contract",
  source_unit_range: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.range,
  upstream_failure_taxonomy_contract_id: CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  executes_ai_retrieval: false,
  executes_export_download: false,
  executes_external_share: false,
  mutates_locks: false,
  retries_operations: false,
  performs_rollback: false,
  performs_compensation: false,
  ldip_implemented: false,
  covered_unit_count: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.unit_count,
  covered_micro_phase_ids: Object.freeze([
    "RP01.P07.M08",
    "RP01.P07.M09",
    "RP01.P07.M10",
    "RP01.P08.M00",
    "RP01.P08.M01",
    "RP01.P08.M02",
    "RP01.P08.M03",
    "RP01.P08.M04",
    "RP01.P08.M05",
    "RP01.P08.M06",
    "RP01.P08.M07",
    "RP01.P08.M08",
    "RP01.P08.M09",
    "RP01.P08.M10",
    "RP01.P09.M00",
    "RP01.P09.M01",
    "RP01.P09.M02",
    "RP01.P09.M03",
  ]),
  failure_closeout_category_ids: CP105_FAILURE_CLOSEOUT_CATEGORY_IDS,
  hermes_receipt_ids: Object.freeze(CP105_HERMES_RECEIPT_TEMPLATES.map((item) => item.receipt_id)),
  review_question_ids: Object.freeze(CP105_REVIEW_QUESTION_TEMPLATES.map((item) => item.question_id)),
  evidence_policy: "receipt_reference_only_no_harness_authority_claim",
  review_policy: "questions_and_risk_register_only_no_claude_execution",
  gate_semantics_policy: "pass_pass_with_findings_block_are_documented_only",
  failure_closeout_policy: "continues_cp104_expected_failure_reference_catalog",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "database_row_created",
    "ai_retrieval_executed",
    "export_download_executed",
    "external_share_executed",
    "lock_mutated",
    "retry_executed",
    "rollback_performed",
    "compensation_performed",
    "claude_review_executed_by_catalog",
    "human_approval_granted_by_catalog",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

function cp105FreezeItem(item) {
  return Object.freeze({
    ...item,
    pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
    source_unit_ids: Object.freeze(item.source_unit_ids ?? []),
    expected_fields: Object.freeze(item.expected_fields ?? []),
    blocked_claims: Object.freeze(item.blocked_claims ?? []),
    command_anchors: Object.freeze(item.command_anchors ?? []),
    review_questions: Object.freeze(item.review_questions ?? []),
    synthetic_only: true,
    uses_real_client_data: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
    creates_database_rows: false,
    executes_ai_retrieval: false,
    executes_export_download: false,
    executes_external_share: false,
    mutates_locks: false,
    retries_operations: false,
    performs_rollback: false,
    performs_compensation: false,
    executes_claude_review: false,
    grants_human_approval: false,
    ldip_implemented: false,
  });
}

function unitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

export function createCoreDomainCp105FailureCloseoutEntries() {
  const entries = [];
  for (const [microPhaseId, phase] of Object.entries(CP105_FAILURE_CLOSEOUT_PHASES)) {
    for (let ordinal = 0; ordinal < phase.count; ordinal += 1) {
      const unitIndex = phase.start_index + ordinal;
      const template = CP105_FAILURE_CATEGORY_TEMPLATES[unitIndex - 1];
      entries.push(
        cp105FreezeItem({
          entry_id: `${microPhaseId}.${template.category_id}`,
          kind: "failure_closeout_reference",
          micro_phase_id: microPhaseId,
          category_id: template.category_id,
          title: template.title,
          source_unit_ids: [unitIdFor(microPhaseId, unitIndex)],
          expected_status: template.expected_status,
          expected_fields: ["tenant_id", "actor_user_id", "matter_id", "failure_code", "blocked_claim", "evidence_ref"],
          blocked_claims: template.category_id === "failure_taxonomy" ? [] : [`${template.category_id}_reference_only`],
        }),
      );
    }
  }
  return Object.freeze(entries);
}

export function createCoreDomainCp105HermesEvidenceMatrix() {
  const rows = [];
  for (const [microPhaseId, count] of Object.entries(CP105_HERMES_PHASE_COUNTS)) {
    for (let index = 1; index <= count; index += 1) {
      const template = CP105_HERMES_RECEIPT_TEMPLATES[index - 1];
      rows.push(
        cp105FreezeItem({
          receipt_id: `${microPhaseId}.${template.receipt_id}`,
          kind: "hermes_evidence_receipt_reference",
          micro_phase_id: microPhaseId,
          receipt_type: template.receipt_id,
          receipt_kind: template.receipt_kind,
          title: template.title,
          source_unit_ids: [unitIdFor(microPhaseId, index)],
          expected_fields: ["pack_id", "subphase_id", "command", "exit_code", "changed_files", "no_real_data", "gate_outcome"],
          blocked_claims: template.receipt_id === "block_semantics" ? ["block_must_not_be_reported_as_pass"] : [],
          command_anchors:
            template.receipt_id === "validation_command_check"
              ? ["npm run closeout-pack:validate", "npm run rp01:core-domain:validate", "npm test", "npm run build"]
              : [],
        }),
      );
    }
  }
  return Object.freeze(rows);
}

export function createCoreDomainCp105ReviewQuestionCatalog() {
  const rows = [];
  for (const [microPhaseId, count] of Object.entries(CP105_REVIEW_PHASE_COUNTS)) {
    for (let index = 1; index <= count; index += 1) {
      const template = CP105_REVIEW_QUESTION_TEMPLATES[index - 1];
      rows.push(
        cp105FreezeItem({
          question_id: `${microPhaseId}.${template.question_id}`,
          kind: "review_question_reference",
          micro_phase_id: microPhaseId,
          review_area: template.review_area,
          title: template.title,
          source_unit_ids: [unitIdFor(microPhaseId, index)],
          expected_fields: ["question", "risk_area", "expected_evidence", "finding_severity", "routing"],
          review_questions: [
            `Does ${template.review_area} remain synthetic-only and evidence-bound?`,
            `Does ${template.review_area} avoid permission, audit, product-state, and LDIP runtime claims?`,
          ],
          blocked_claims: ["review_question_cannot_approve_pack"],
        }),
      );
    }
  }
  return Object.freeze(rows);
}

export function createCoreDomainCp105CoveredUnitIds() {
  return Object.freeze([
    ...createCoreDomainCp105FailureCloseoutEntries().flatMap((item) => item.source_unit_ids),
    ...createCoreDomainCp105HermesEvidenceMatrix().flatMap((item) => item.source_unit_ids),
    ...createCoreDomainCp105ReviewQuestionCatalog().flatMap((item) => item.source_unit_ids),
  ]);
}

export function createCoreDomainCp105EvidenceReviewManifest() {
  const failureCloseout = createCoreDomainCp105FailureCloseoutEntries();
  const hermesEvidence = createCoreDomainCp105HermesEvidenceMatrix();
  const reviewQuestions = createCoreDomainCp105ReviewQuestionCatalog();
  const coveredUnitIds = createCoreDomainCp105CoveredUnitIds();
  return Object.freeze({
    pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp105_evidence_review_manifest",
    source_unit_range: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.range,
    covered_unit_count: coveredUnitIds.length,
    covered_micro_phase_ids: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.covered_micro_phase_ids,
    failure_closeout_count: failureCloseout.length,
    hermes_evidence_receipt_count: hermesEvidence.length,
    review_question_count: reviewQuestions.length,
    command_matrix_count: hermesEvidence.filter((item) => item.receipt_type === "hermes_command_matrix").length,
    no_real_data_receipt_count: hermesEvidence.filter((item) => item.receipt_type === "no_real_data_receipt").length,
    pass_semantics_count: hermesEvidence.filter((item) => item.receipt_type === "pass_semantics").length,
    permission_bypass_question_count: reviewQuestions.filter((item) => item.review_area === "permission_boundary").length,
    audit_completeness_question_count: reviewQuestions.filter((item) => item.review_area === "audit_boundary").length,
    synthetic_only: true,
    no_real_data: true,
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
      executes_ai_retrieval: false,
      executes_export_download: false,
      executes_external_share: false,
      mutates_locks: false,
      retries_operations: false,
      performs_rollback: false,
      performs_compensation: false,
      executes_claude_review: false,
      grants_human_approval: false,
    }),
  });
}

export function createCoreDomainCp105HermesEvidencePacket() {
  const manifest = createCoreDomainCp105EvidenceReviewManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp105_evidence_review_hermes_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    receipt_count: manifest.hermes_evidence_receipt_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-105",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp105ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp105_evidence_review_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-105 failure closeout tail, Hermes evidence receipt matrix, and review-question catalog stay synthetic-only, reference-only, no-write, no runtime permission/audit/product/AI/export/share/recovery execution, no human approval grant, no Claude execution by catalog, no LDIP implementation, and no real data.",
  });
}

export function createCoreDomainCp105CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.range,
    next_pack_id: "CP00-106",
    next_subphase_id: "RP01.P09.M03.S10",
    handoff_scope: "continue RP01.P09 review outcome and finding-routing map into the next generated Risk B pack",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp105Coverage() {
  const failureCloseout = createCoreDomainCp105FailureCloseoutEntries();
  const hermesEvidence = createCoreDomainCp105HermesEvidenceMatrix();
  const reviewQuestions = createCoreDomainCp105ReviewQuestionCatalog();
  const manifest = createCoreDomainCp105EvidenceReviewManifest();
  const evidence = createCoreDomainCp105HermesEvidencePacket();
  const review = createCoreDomainCp105ClaudeReviewPacket();
  const handoff = createCoreDomainCp105CloseoutHandoff();
  const coveredUnitIds = createCoreDomainCp105CoveredUnitIds();
  const allItems = [...failureCloseout, ...hermesEvidence, ...reviewQuestions];
  const errors = [];
  for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.failure_closeout_category_ids) {
    if (!failureCloseout.some((item) => item.category_id === required)) errors.push(`CP00-105 missing failure closeout category ${required}`);
  }
  for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.hermes_receipt_ids) {
    if (!hermesEvidence.some((item) => item.receipt_type === required)) errors.push(`CP00-105 missing Hermes receipt ${required}`);
  }
  for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.review_question_ids) {
    if (!reviewQuestions.some((item) => item.question_id.endsWith(required))) errors.push(`CP00-105 missing review question ${required}`);
  }
  for (const required of [
    "RP01.P07.M08.S18",
    "RP01.P07.M08.S20",
    "RP01.P07.M09.S11",
    "RP01.P07.M10.S03",
    "RP01.P08.M03.S20",
    "RP01.P08.M10.S04",
    "RP01.P09.M03.S09",
  ]) {
    if (!coveredUnitIds.includes(required)) errors.push(`CP00-105 missing covered unit ${required}`);
  }
  if (coveredUnitIds.length !== 150) errors.push("CP00-105 must cover exactly 150 units");
  if (new Set(coveredUnitIds).size !== coveredUnitIds.length) errors.push("CP00-105 covered units must be unique");
  if (failureCloseout.length !== 17) errors.push("CP00-105 must expose 17 failure closeout references");
  if (hermesEvidence.length !== 115) errors.push("CP00-105 must expose 115 Hermes evidence receipt references");
  if (reviewQuestions.length !== 18) errors.push("CP00-105 must expose 18 review question references");
  if (manifest.covered_unit_count !== 150) errors.push("CP00-105 manifest must cover 150 units");
  if (manifest.command_matrix_count !== 11) errors.push("CP00-105 must include command matrices for all P08 micro phases");
  if (manifest.no_real_data_receipt_count !== 4) errors.push("CP00-105 no-real-data receipt count must match high-detail P08 phases");
  if (manifest.pass_semantics_count !== 3) errors.push("CP00-105 PASS semantics count must match full P08 phases");
  if (manifest.permission_bypass_question_count !== 3 || manifest.audit_completeness_question_count !== 3) {
    errors.push("CP00-105 permission/audit review question counts must match P09 boundary phases");
  }
  if (!hermesEvidence.some((item) => item.receipt_type === "block_semantics" && item.blocked_claims.includes("block_must_not_be_reported_as_pass"))) {
    errors.push("CP00-105 BLOCK semantics must prevent false PASS claims");
  }
  if (!reviewQuestions.some((item) => item.review_area === "ui_data_leak")) errors.push("CP00-105 must include UI leak review questions");
  for (const item of allItems) {
    if (item.synthetic_only !== true || item.uses_real_client_data !== false) errors.push("CP00-105 items must be synthetic-only");
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("CP00-105 items must remain no-write and non-runtime");
    }
    if (
      item.creates_database_rows !== false ||
      item.executes_ai_retrieval !== false ||
      item.executes_export_download !== false ||
      item.executes_external_share !== false
    ) {
      errors.push("CP00-105 items must not create rows, AI retrievals, exports, or shares");
    }
    if (item.mutates_locks !== false || item.retries_operations !== false || item.performs_rollback !== false || item.performs_compensation !== false) {
      errors.push("CP00-105 items must not execute runtime recovery");
    }
    if (item.executes_claude_review !== false || item.grants_human_approval !== false) {
      errors.push("CP00-105 items must not execute Claude review or grant human approval");
    }
    if (item.ldip_implemented !== false) errors.push("CP00-105 items must not implement LDIP");
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    failure_closeout_count: failureCloseout.length,
    hermes_evidence_receipt_count: hermesEvidence.length,
    review_question_count: reviewQuestions.length,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    command_matrix_count: manifest.command_matrix_count,
    next_subphase_id: handoff.next_subphase_id,
  });
}
