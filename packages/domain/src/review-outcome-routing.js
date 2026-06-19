import {
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING,
} from "./evidence-review-catalog.js";

export const CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING = Object.freeze({
  pack_id: "CP00-106",
  planned_pack_id: "CP00-106",
  risk_class: "B",
  unit_count: 40,
  range: "RP01.P09.M03.S10-RP01.P09.M07.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_evidence_review_catalog_pack_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
});

const CP106_REVIEW_PHASE_COUNTS = Object.freeze({
  "RP01.P09.M03": Object.freeze({ start_index: 10, count: 2 }),
  "RP01.P09.M04": Object.freeze({ start_index: 1, count: 11 }),
  "RP01.P09.M05": Object.freeze({ start_index: 1, count: 11 }),
  "RP01.P09.M06": Object.freeze({ start_index: 1, count: 8 }),
  "RP01.P09.M07": Object.freeze({ start_index: 1, count: 8 }),
});

const CP106_REVIEW_OUTCOME_TEMPLATES = Object.freeze([
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

const CP106_ALLOWED_VERDICTS = Object.freeze(["PASS", "PASS_WITH_FINDINGS", "BLOCK"]);
const CP106_SEVERITY_LEVELS = Object.freeze(["P0", "P1", "P2", "P3"]);
const CP106_ROUTING_TARGETS = Object.freeze([
  "block_pack_for_p0_p1",
  "fix_or_defer_p2",
  "document_p3",
  "preserve_no_write_boundary",
  "handoff_to_next_pack",
]);

export const CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT = Object.freeze({
  pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
  contract_id: "core_domain_cp106_review_outcome_routing_contract",
  source_unit_range: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.range,
  upstream_evidence_review_catalog_contract_id: CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.contract_id,
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
  ldip_implemented: false,
  covered_unit_count: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.unit_count,
  covered_micro_phase_ids: Object.freeze(["RP01.P09.M03", "RP01.P09.M04", "RP01.P09.M05", "RP01.P09.M06", "RP01.P09.M07"]),
  outcome_item_ids: Object.freeze(CP106_REVIEW_OUTCOME_TEMPLATES.map((item) => item.item_id)),
  allowed_verdicts: CP106_ALLOWED_VERDICTS,
  severity_levels: CP106_SEVERITY_LEVELS,
  routing_targets: CP106_ROUTING_TARGETS,
  review_question_policy: "question_reference_only_no_review_execution",
  verdict_policy: "format_reference_only_no_pack_approval",
  finding_routing_policy: "routing_reference_only_no_issue_mutation",
  severity_policy: "classification_reference_only_no_priority_mutation",
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

function cp106FreezeItem(item) {
  return Object.freeze({
    ...item,
    pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
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

function blockedClaimsForTemplate(template) {
  if (template.kind === "verdict_format") return ["verdict_format_cannot_approve_pack"];
  if (template.kind === "finding_routing_map") return ["routing_map_cannot_mutate_issues"];
  if (template.kind === "risk_register") return ["risk_register_cannot_mutate_priority"];
  if (template.kind === "severity_taxonomy") return ["severity_taxonomy_cannot_mutate_priority"];
  return ["review_question_cannot_execute_review"];
}

export function createCoreDomainCp106ReviewOutcomeRoutingCatalog() {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(CP106_REVIEW_PHASE_COUNTS)) {
    for (let ordinal = 0; ordinal < phase.count; ordinal += 1) {
      const unitIndex = phase.start_index + ordinal;
      const template = CP106_REVIEW_OUTCOME_TEMPLATES[unitIndex - 1];
      rows.push(
        cp106FreezeItem({
          outcome_id: `${microPhaseId}.${template.item_id}`,
          item_id: template.item_id,
          kind: template.kind,
          title: template.title,
          review_area: template.area,
          micro_phase_id: microPhaseId,
          source_unit_ids: [unitIdFor(microPhaseId, unitIndex)],
          expected_fields: ["pack_id", "review_area", "severity", "verdict", "routing_target", "evidence_ref", "blocked_claim"],
          blocked_claims: blockedClaimsForTemplate(template),
          allowed_verdicts: template.kind === "verdict_format" ? CP106_ALLOWED_VERDICTS : [],
          severity_levels: ["finding_routing_map", "severity_taxonomy", "risk_register"].includes(template.kind) ? CP106_SEVERITY_LEVELS : [],
          routing_targets: template.kind === "finding_routing_map" ? CP106_ROUTING_TARGETS : [],
        }),
      );
    }
  }
  return Object.freeze(rows);
}

export function createCoreDomainCp106CoveredUnitIds() {
  return Object.freeze(createCoreDomainCp106ReviewOutcomeRoutingCatalog().flatMap((item) => item.source_unit_ids));
}

export function createCoreDomainCp106ReviewOutcomeManifest() {
  const rows = createCoreDomainCp106ReviewOutcomeRoutingCatalog();
  const coveredUnitIds = createCoreDomainCp106CoveredUnitIds();
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp106_review_outcome_manifest",
    source_unit_range: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.range,
    covered_unit_count: coveredUnitIds.length,
    covered_micro_phase_ids: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.covered_micro_phase_ids,
    review_question_count: rows.filter((item) => item.kind === "review_question").length,
    risk_register_count: rows.filter((item) => item.kind === "risk_register").length,
    severity_taxonomy_count: rows.filter((item) => item.kind === "severity_taxonomy").length,
    verdict_format_count: rows.filter((item) => item.kind === "verdict_format").length,
    finding_routing_map_count: rows.filter((item) => item.kind === "finding_routing_map").length,
    permission_boundary_question_count: rows.filter((item) => item.review_area === "permission_boundary").length,
    audit_boundary_question_count: rows.filter((item) => item.review_area === "audit_boundary").length,
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
      mutates_issue_routing: false,
    }),
  });
}

export function createCoreDomainCp106HermesEvidencePacket() {
  const manifest = createCoreDomainCp106ReviewOutcomeManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp106_review_outcome_hermes_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    review_question_count: manifest.review_question_count,
    verdict_format_count: manifest.verdict_format_count,
    finding_routing_map_count: manifest.finding_routing_map_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-106",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp106ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp106_review_outcome_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-106 review outcome, go/no-go verdict, severity taxonomy, and finding routing references stay synthetic-only, reference-only, no-write, no runtime permission/audit/product/AI/export/share/recovery execution, no Claude execution by catalog, no human approval grant, no issue mutation, no LDIP implementation, and no real data.",
  });
}

export function createCoreDomainCp106CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.range,
    next_pack_id: "CP00-107",
    next_subphase_id: "RP01.P09.M07.S09",
    handoff_scope: "continue RP01.P09 severity taxonomy, go/no-go verdict format, finding routing, and closeout readiness in the next generated Risk B pack",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp106Coverage() {
  const rows = createCoreDomainCp106ReviewOutcomeRoutingCatalog();
  const manifest = createCoreDomainCp106ReviewOutcomeManifest();
  const evidence = createCoreDomainCp106HermesEvidencePacket();
  const review = createCoreDomainCp106ClaudeReviewPacket();
  const handoff = createCoreDomainCp106CloseoutHandoff();
  const coveredUnitIds = createCoreDomainCp106CoveredUnitIds();
  const errors = [];
  for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.outcome_item_ids) {
    if (!rows.some((item) => item.item_id === required)) errors.push(`CP00-106 missing outcome item ${required}`);
  }
  for (const required of [
    "RP01.P09.M03.S10",
    "RP01.P09.M03.S11",
    "RP01.P09.M04.S11",
    "RP01.P09.M05.S11",
    "RP01.P09.M06.S08",
    "RP01.P09.M07.S08",
  ]) {
    if (!coveredUnitIds.includes(required)) errors.push(`CP00-106 missing covered unit ${required}`);
  }
  if (coveredUnitIds.length !== 40) errors.push("CP00-106 must cover exactly 40 units");
  if (new Set(coveredUnitIds).size !== coveredUnitIds.length) errors.push("CP00-106 covered units must be unique");
  if (rows.length !== 40) errors.push("CP00-106 must expose 40 review outcome routing rows");
  if (manifest.review_question_count !== 28) errors.push("CP00-106 must expose 28 review question references");
  if (manifest.risk_register_count !== 4) errors.push("CP00-106 must expose 4 risk register references");
  if (manifest.severity_taxonomy_count !== 2) errors.push("CP00-106 must expose 2 severity taxonomy references");
  if (manifest.verdict_format_count !== 3) errors.push("CP00-106 must expose 3 go/no-go verdict format references");
  if (manifest.finding_routing_map_count !== 3) errors.push("CP00-106 must expose 3 finding routing map references");
  if (manifest.permission_boundary_question_count !== 4 || manifest.audit_boundary_question_count !== 4) {
    errors.push("CP00-106 must include permission and audit review questions across all active P09 phases");
  }
  if (!rows.some((item) => item.kind === "finding_routing_map" && item.routing_targets.includes("block_pack_for_p0_p1"))) {
    errors.push("CP00-106 finding routing must block P0/P1 pack closeout");
  }
  if (!rows.some((item) => item.kind === "verdict_format" && item.allowed_verdicts.includes("PASS_WITH_FINDINGS"))) {
    errors.push("CP00-106 verdict format must preserve PASS_WITH_FINDINGS semantics");
  }
  for (const item of rows) {
    if (item.synthetic_only !== true || item.uses_real_client_data !== false) errors.push("CP00-106 items must be synthetic-only");
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("CP00-106 items must remain no-write and non-runtime");
    }
    if (
      item.creates_database_rows !== false ||
      item.executes_ai_retrieval !== false ||
      item.executes_export_download !== false ||
      item.executes_external_share !== false
    ) {
      errors.push("CP00-106 items must not create rows, AI retrievals, exports, or shares");
    }
    if (item.mutates_locks !== false || item.retries_operations !== false || item.performs_rollback !== false || item.performs_compensation !== false) {
      errors.push("CP00-106 items must not execute runtime recovery");
    }
    if (item.executes_claude_review !== false || item.grants_human_approval !== false || item.mutates_issue_routing !== false) {
      errors.push("CP00-106 items must not execute review, grant approval, or mutate routing");
    }
    if (item.ldip_implemented !== false) errors.push("CP00-106 items must not implement LDIP");
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    review_outcome_count: rows.length,
    review_question_count: manifest.review_question_count,
    verdict_format_count: manifest.verdict_format_count,
    finding_routing_map_count: manifest.finding_routing_map_count,
    risk_register_count: manifest.risk_register_count,
    severity_taxonomy_count: manifest.severity_taxonomy_count,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
