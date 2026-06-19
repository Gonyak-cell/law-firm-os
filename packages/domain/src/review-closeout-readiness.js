import {
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING,
} from "./review-outcome-routing.js";

export const CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING = Object.freeze({
  pack_id: "CP00-107",
  planned_pack_id: "CP00-107",
  risk_class: "B",
  unit_count: 16,
  range: "RP01.P09.M07.S09-RP01.P09.M10.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_review_outcome_routing_pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
});

const CP107_REVIEW_PHASE_COUNTS = Object.freeze({
  "RP01.P09.M07": Object.freeze({ start_index: 9, count: 3, phase_role: "test_golden_case_terminal_outcome" }),
  "RP01.P09.M08": Object.freeze({ start_index: 1, count: 8, phase_role: "hermes_evidence_packet_reference" }),
  "RP01.P09.M09": Object.freeze({ start_index: 1, count: 4, phase_role: "claude_review_packet_reference" }),
  "RP01.P09.M10": Object.freeze({ start_index: 1, count: 1, phase_role: "closeout_handoff_reference" }),
});

const CP107_REVIEW_CLOSEOUT_TEMPLATES = Object.freeze([
  Object.freeze({ item_id: "architecture_review_questions", title: "Architecture review questions", area: "architecture", kind: "review_question" }),
  Object.freeze({ item_id: "security_review_questions", title: "Security review questions", area: "security", kind: "review_question" }),
  Object.freeze({ item_id: "permission_bypass_questions", title: "Permission bypass questions", area: "permission_boundary", kind: "review_question" }),
  Object.freeze({ item_id: "audit_completeness_questions", title: "Audit completeness questions", area: "audit_boundary", kind: "review_question" }),
  Object.freeze({ item_id: "missing_test_questions", title: "Missing test questions", area: "test_gap", kind: "review_question" }),
  Object.freeze({ item_id: "ui_leak_questions", title: "UI leak questions", area: "ui_data_leak", kind: "review_question" }),
  Object.freeze({ item_id: "downstream_readiness_questions", title: "Downstream readiness questions", area: "downstream_readiness", kind: "review_question" }),
  Object.freeze({ item_id: "risk_register", title: "Risk register", area: "risk_register", kind: "risk_register" }),
  Object.freeze({ item_id: "severity_taxonomy", title: "Severity taxonomy", area: "finding_severity", kind: "severity_taxonomy" }),
  Object.freeze({ item_id: "go_no_go_verdict_format", title: "Go/no-go verdict format", area: "go_no_go", kind: "verdict_format" }),
  Object.freeze({ item_id: "finding_routing_map", title: "Finding routing map", area: "finding_routing", kind: "finding_routing_map" }),
]);

const CP107_ALLOWED_VERDICTS = Object.freeze(["PASS", "PASS_WITH_FINDINGS", "BLOCK"]);
const CP107_SEVERITY_LEVELS = Object.freeze(["P0", "P1", "P2", "P3"]);
const CP107_ROUTING_TARGETS = Object.freeze([
  "block_pack_for_p0_p1",
  "fix_or_defer_p2",
  "document_p3",
  "preserve_no_write_boundary",
  "handoff_to_rp02",
]);

export const CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT = Object.freeze({
  pack_id: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
  contract_id: "core_domain_cp107_review_closeout_readiness_contract",
  source_unit_range: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.range,
  upstream_review_outcome_routing_contract_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.contract_id,
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
  executes_claude_review: false,
  grants_human_approval: false,
  mutates_issue_routing: false,
  ldip_implemented: false,
  covered_unit_count: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.unit_count,
  covered_micro_phase_ids: Object.freeze(["RP01.P09.M07", "RP01.P09.M08", "RP01.P09.M09", "RP01.P09.M10"]),
  readiness_item_ids: Object.freeze(CP107_REVIEW_CLOSEOUT_TEMPLATES.map((item) => item.item_id)),
  allowed_verdicts: CP107_ALLOWED_VERDICTS,
  severity_levels: CP107_SEVERITY_LEVELS,
  routing_targets: CP107_ROUTING_TARGETS,
  hermes_evidence_policy: "evidence_question_reference_only_no_harness_execution",
  claude_review_policy: "review_packet_reference_only_no_claude_execution",
  closeout_policy: "handoff_question_reference_only_no_production_approval",
  terminal_routing_policy: "rp01_terminal_references_handoff_to_rp02_without_runtime_mutation",
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
    "issue_routing_mutated",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

function unitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function blockedClaimsForTemplate(template) {
  if (template.kind === "verdict_format") return ["verdict_format_cannot_approve_pack"];
  if (template.kind === "finding_routing_map") return ["routing_map_cannot_mutate_issues"];
  if (template.kind === "risk_register") return ["risk_register_cannot_mutate_priority"];
  if (template.kind === "severity_taxonomy") return ["severity_taxonomy_cannot_mutate_priority"];
  return ["review_question_cannot_execute_review"];
}

function cp107FreezeItem(item) {
  return Object.freeze({
    ...item,
    pack_id: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
    source_unit_ids: Object.freeze(item.source_unit_ids ?? []),
    expected_fields: Object.freeze(item.expected_fields ?? []),
    blocked_claims: Object.freeze(item.blocked_claims ?? []),
    allowed_verdicts: Object.freeze(item.allowed_verdicts ?? []),
    severity_levels: Object.freeze(item.severity_levels ?? []),
    routing_targets: Object.freeze(item.routing_targets ?? []),
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
    mutates_issue_routing: false,
    ldip_implemented: false,
  });
}

export function createCoreDomainCp107ReviewCloseoutReadinessCatalog() {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(CP107_REVIEW_PHASE_COUNTS)) {
    for (let ordinal = 0; ordinal < phase.count; ordinal += 1) {
      const unitIndex = phase.start_index + ordinal;
      const template = CP107_REVIEW_CLOSEOUT_TEMPLATES[unitIndex - 1];
      rows.push(
        cp107FreezeItem({
          readiness_id: `${microPhaseId}.${template.item_id}`,
          item_id: template.item_id,
          kind: template.kind,
          title: template.title,
          review_area: template.area,
          micro_phase_id: microPhaseId,
          phase_role: phase.phase_role,
          source_unit_ids: [unitIdFor(microPhaseId, unitIndex)],
          expected_fields: ["pack_id", "phase_role", "review_area", "severity", "verdict", "routing_target", "evidence_ref", "blocked_claim"],
          blocked_claims: blockedClaimsForTemplate(template),
          allowed_verdicts: template.kind === "verdict_format" ? CP107_ALLOWED_VERDICTS : [],
          severity_levels: ["finding_routing_map", "severity_taxonomy", "risk_register"].includes(template.kind) ? CP107_SEVERITY_LEVELS : [],
          routing_targets: template.kind === "finding_routing_map" ? CP107_ROUTING_TARGETS : [],
        }),
      );
    }
  }
  return Object.freeze(rows);
}

export function createCoreDomainCp107CoveredUnitIds() {
  return Object.freeze(createCoreDomainCp107ReviewCloseoutReadinessCatalog().flatMap((item) => item.source_unit_ids));
}

export function createCoreDomainCp107ReviewCloseoutManifest() {
  const rows = createCoreDomainCp107ReviewCloseoutReadinessCatalog();
  const coveredUnitIds = createCoreDomainCp107CoveredUnitIds();
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp107_review_closeout_manifest",
    source_unit_range: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.range,
    covered_unit_count: coveredUnitIds.length,
    covered_micro_phase_ids: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.covered_micro_phase_ids,
    review_question_count: rows.filter((item) => item.kind === "review_question").length,
    risk_register_count: rows.filter((item) => item.kind === "risk_register").length,
    severity_taxonomy_count: rows.filter((item) => item.kind === "severity_taxonomy").length,
    verdict_format_count: rows.filter((item) => item.kind === "verdict_format").length,
    finding_routing_map_count: rows.filter((item) => item.kind === "finding_routing_map").length,
    hermes_evidence_reference_count: rows.filter((item) => item.phase_role === "hermes_evidence_packet_reference").length,
    claude_review_reference_count: rows.filter((item) => item.phase_role === "claude_review_packet_reference").length,
    closeout_handoff_reference_count: rows.filter((item) => item.phase_role === "closeout_handoff_reference").length,
    terminal_outcome_reference_count: rows.filter((item) => item.phase_role === "test_golden_case_terminal_outcome").length,
    permission_boundary_question_count: rows.filter((item) => item.review_area === "permission_boundary").length,
    audit_boundary_question_count: rows.filter((item) => item.review_area === "audit_boundary").length,
    synthetic_only: true,
    no_real_data: true,
    rp01_terminal: true,
    next_program_id: "RP02",
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
      mutates_issue_routing: false,
    }),
  });
}

export function createCoreDomainCp107HermesEvidencePacket() {
  const manifest = createCoreDomainCp107ReviewCloseoutManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp107_review_closeout_hermes_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    hermes_evidence_reference_count: manifest.hermes_evidence_reference_count,
    claude_review_reference_count: manifest.claude_review_reference_count,
    closeout_handoff_reference_count: manifest.closeout_handoff_reference_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-107",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp107ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp107_review_closeout_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-107 terminal RP01 review closeout readiness references stay synthetic-only, reference-only, no-write, no runtime permission/audit/product/AI/export/share/recovery execution, no Claude execution by catalog, no human approval grant, no issue mutation, no LDIP implementation, and hand off cleanly to RP02/CP00-108.",
  });
}

export function createCoreDomainCp107CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.range,
    next_pack_id: "CP00-108",
    next_subphase_id: "RP02.P00.M00.S01",
    handoff_scope: "RP01 core domain foundation terminal closeout references complete; continue to RP02 permission kernel from the generated Risk C pack",
    rp01_terminal: true,
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp107Coverage() {
  const rows = createCoreDomainCp107ReviewCloseoutReadinessCatalog();
  const manifest = createCoreDomainCp107ReviewCloseoutManifest();
  const evidence = createCoreDomainCp107HermesEvidencePacket();
  const review = createCoreDomainCp107ClaudeReviewPacket();
  const handoff = createCoreDomainCp107CloseoutHandoff();
  const coveredUnitIds = createCoreDomainCp107CoveredUnitIds();
  const errors = [];
  for (const required of [
    "RP01.P09.M07.S09",
    "RP01.P09.M07.S10",
    "RP01.P09.M07.S11",
    "RP01.P09.M08.S08",
    "RP01.P09.M09.S04",
    "RP01.P09.M10.S01",
  ]) {
    if (!coveredUnitIds.includes(required)) errors.push(`CP00-107 missing covered unit ${required}`);
  }
  if (coveredUnitIds.length !== 16) errors.push("CP00-107 must cover exactly 16 units");
  if (new Set(coveredUnitIds).size !== coveredUnitIds.length) errors.push("CP00-107 covered units must be unique");
  if (rows.length !== 16) errors.push("CP00-107 must expose 16 review closeout readiness rows");
  if (manifest.review_question_count !== 12) errors.push("CP00-107 must expose 12 review question references");
  if (manifest.risk_register_count !== 1) errors.push("CP00-107 must expose 1 risk register reference");
  if (manifest.severity_taxonomy_count !== 1) errors.push("CP00-107 must expose 1 severity taxonomy reference");
  if (manifest.verdict_format_count !== 1) errors.push("CP00-107 must expose 1 go/no-go verdict format reference");
  if (manifest.finding_routing_map_count !== 1) errors.push("CP00-107 must expose 1 finding routing map reference");
  if (manifest.hermes_evidence_reference_count !== 8) errors.push("CP00-107 must expose 8 Hermes evidence packet references");
  if (manifest.claude_review_reference_count !== 4) errors.push("CP00-107 must expose 4 Claude review packet references");
  if (manifest.closeout_handoff_reference_count !== 1) errors.push("CP00-107 must expose 1 closeout handoff reference");
  if (manifest.terminal_outcome_reference_count !== 3) errors.push("CP00-107 must expose 3 terminal outcome references");
  if (manifest.permission_boundary_question_count !== 2 || manifest.audit_boundary_question_count !== 2) {
    errors.push("CP00-107 must include permission and audit review questions across M08/M09");
  }
  if (!rows.some((item) => item.kind === "finding_routing_map" && item.routing_targets.includes("handoff_to_rp02"))) {
    errors.push("CP00-107 finding routing must hand off to RP02");
  }
  if (!rows.some((item) => item.kind === "verdict_format" && item.allowed_verdicts.includes("PASS_WITH_FINDINGS"))) {
    errors.push("CP00-107 verdict format must preserve PASS_WITH_FINDINGS semantics");
  }
  if (handoff.next_pack_id !== "CP00-108" || handoff.next_subphase_id !== "RP02.P00.M00.S01") {
    errors.push("CP00-107 must hand off to CP00-108 / RP02.P00.M00.S01");
  }
  for (const item of rows) {
    if (item.synthetic_only !== true || item.uses_real_client_data !== false) errors.push("CP00-107 items must be synthetic-only");
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("CP00-107 items must remain no-write and non-runtime");
    }
    if (
      item.creates_database_rows !== false ||
      item.executes_ai_retrieval !== false ||
      item.executes_export_download !== false ||
      item.executes_external_share !== false
    ) {
      errors.push("CP00-107 items must not create rows, AI retrievals, exports, or shares");
    }
    if (item.mutates_locks !== false || item.retries_operations !== false || item.performs_rollback !== false || item.performs_compensation !== false) {
      errors.push("CP00-107 items must not execute runtime recovery");
    }
    if (item.executes_claude_review !== false || item.grants_human_approval !== false || item.mutates_issue_routing !== false) {
      errors.push("CP00-107 items must not execute review, grant approval, or mutate routing");
    }
    if (item.ldip_implemented !== false) errors.push("CP00-107 items must not implement LDIP");
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    review_closeout_count: rows.length,
    review_question_count: manifest.review_question_count,
    verdict_format_count: manifest.verdict_format_count,
    finding_routing_map_count: manifest.finding_routing_map_count,
    risk_register_count: manifest.risk_register_count,
    severity_taxonomy_count: manifest.severity_taxonomy_count,
    hermes_evidence_reference_count: manifest.hermes_evidence_reference_count,
    claude_review_reference_count: manifest.claude_review_reference_count,
    closeout_handoff_reference_count: manifest.closeout_handoff_reference_count,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_pack_id: handoff.next_pack_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
