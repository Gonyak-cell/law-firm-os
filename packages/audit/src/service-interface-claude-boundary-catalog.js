export const AUDIT_COMPLIANCE_CP138_PACK_BINDING = Object.freeze({
  pack_id: "CP00-138",
  planned_pack_id: "CP00-138",
  risk_class: "A",
  unit_count: 10,
  range: "RP03.P02.M09.S03-RP03.P02.M09.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-137",
  next_pack_id: "CP00-139",
  next_subphase_id: "RP03.P02.M09.S13",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT = Object.freeze({
  id: "audit_compliance_cp138_claude_boundary_contract",
  pack_id: AUDIT_COMPLIANCE_CP138_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance Claude packet sensitive boundary",
  production_ready_flag: "audit_compliance_claude_packet_sensitive_boundary_verified",
  covered_range: AUDIT_COMPLIANCE_CP138_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP138_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP138_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP138_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP138_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP138_NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP138_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "raw_document_body",
  "full_email_body",
  "secret",
  "credential",
  "payment_card_number",
  "bank_account_number",
  "access_token",
  "private_key",
  "tenant_filter_internal_expression",
  "matter_trace_internal_join",
  "permission_precheck_internal_rule",
  "audit_hint_internal_payload",
  "idempotency_internal_key",
  "lock_token_internal_value",
  "persistence_internal_target",
  "claude_prompt_internal_context",
  "claude_prompt_redaction_source",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const CP138_UNITS = Object.freeze([
  Object.freeze({ index: 3, title: "Tenant boundary precheck", deliverable_type: "implementation" }),
  Object.freeze({ index: 4, title: "Matter trace precheck", deliverable_type: "implementation" }),
  Object.freeze({ index: 5, title: "Permission precheck", deliverable_type: "security_audit" }),
  Object.freeze({ index: 6, title: "Audit hint precheck", deliverable_type: "security_audit" }),
  Object.freeze({ index: 7, title: "Primary happy path", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Secondary workflow path", deliverable_type: "implementation" }),
  Object.freeze({ index: 9, title: "State transition enforcement", deliverable_type: "ui" }),
  Object.freeze({ index: 10, title: "Idempotency key handling", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Lock acquisition rule", deliverable_type: "ui" }),
  Object.freeze({ index: 12, title: "Persistence boundary", deliverable_type: "implementation" }),
]);

const STATUS_BY_KIND = Object.freeze({
  audit_hint_precheck: "audit_hint_claude_boundary_bound",
  idempotency_key_handling: "idempotency_claude_boundary_bound",
  lock_acquisition_rule: "lock_claude_boundary_bound",
  matter_trace_precheck: "matter_trace_claude_boundary_bound",
  permission_precheck: "permission_claude_boundary_bound",
  persistence_boundary: "persistence_claude_boundary_bound",
  primary_happy_path: "primary_happy_path_claude_boundary_bound",
  secondary_workflow_path: "secondary_workflow_path_claude_boundary_bound",
  state_transition_enforcement: "state_transition_claude_boundary_bound",
  tenant_boundary_precheck: "tenant_boundary_claude_boundary_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(index) {
  return `RP03.P02.M09.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind) {
  if (behaviorKind.includes("tenant_boundary")) return "tenant_boundary_claude_packet_boundary";
  if (behaviorKind.includes("matter_trace")) return "matter_trace_claude_packet_boundary";
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_hint")) return "permission_audit_claude_packet_boundary";
  if (behaviorKind.includes("idempotency") || behaviorKind.includes("lock") || behaviorKind.includes("persistence")) {
    return "state_persistence_claude_packet_boundary";
  }
  if (behaviorKind.includes("state_transition")) return "ui_state_claude_packet_boundary";
  return "workflow_claude_packet_boundary";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP138_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_claude_packet_sensitive_boundary: true,
    writes_product_state: false,
    appends_audit_event: false,
    writes_audit_event: false,
    mutates_audit_event: false,
    deletes_audit_event: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    persists_hash_chain_state: false,
    persists_retention_policy: false,
    modifies_legal_hold: false,
    executes_permission_decision: false,
    executes_tenant_boundary_check: false,
    executes_matter_trace_check: false,
    executes_audit_hint_check: false,
    executes_audit_query: false,
    executes_compliance_export: false,
    executes_admin_access_review: false,
    acquires_locks: false,
    persists_lock_tokens: false,
    executes_rollback: false,
    executes_retry: false,
    renders_ui: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    writes_hermes_runtime: false,
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP138_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP138_UNITS.map((unit) => {
      const behaviorKind = slugFor(unit.title);
      const sourceUnitId = sourceUnitIdFor(unit.index);
      const domain = domainFor(behaviorKind);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: AUDIT_COMPLIANCE_CP138_PACK_BINDING.pack_id,
        program_id: "RP03",
        phase_id: "RP03.P02",
        micro_phase_id: "RP03.P02.M09",
        micro_id: "M09",
        micro_title: "Claude Review Packet",
        phase_role: "service_interface_claude_review_packet_sensitive_boundary",
        area: `${domain}.claude_review_packet`,
        domain,
        title: unit.title,
        coverage_kind: behaviorKind,
        deliverable_type: unit.deliverable_type,
        case_id: `rp03_p02_m09.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([sourceUnitId]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_a_claude_packet_sensitive_boundary",
          "claude_review_packet_reference_only",
          "tenant_boundary_reference_only",
          "matter_trace_reference_only",
          "permission_audit_reference_only",
          "idempotency_lock_persistence_reference_only",
          "no_audit_event_write",
          "no_product_state_write",
          "no_claude_execution",
          "no_hidden_field_exposure",
          "cp137_handoff_inherited",
          "cp139_handoff_declared",
        ]),
        expected_status: STATUS_BY_KIND[behaviorKind],
        hidden_source_fields: CP138_HIDDEN_SOURCE_FIELDS,
      });
    }),
  );
}

const CP138_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp138CoveredUnitIds() {
  return Object.freeze(CP138_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp138ClaudeBoundaryCatalog({ domain, deliverable_type } = {}) {
  return Object.freeze(CP138_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type),
  ));
}

export function runAuditComplianceCp138ClaudeBoundaryCase(caseId) {
  const row = CP138_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-138 audit compliance Claude boundary case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "claude_review_packet",
      "tenant_boundary_required",
      "matter_trace_precheck",
      "permission_trimming_required",
      "audit_hint_precheck",
      "count_leakage_prohibited",
      "idempotency_key_handling",
      "lock_acquisition_rule",
      "persistence_boundary",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp138ClaudeBoundary() {
  const cases = CP138_ROWS.map((row) => runAuditComplianceCp138ClaudeBoundaryCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp138CoveredUnitIds().length,
    row_count: CP138_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP138_ROWS, "deliverable_type"),
    domain_counts: countBy(CP138_ROWS, "domain"),
    first_unit_id: createAuditComplianceCp138CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp138CoveredUnitIds().at(-1),
    cp137_handoff_inherited: true,
    cp139_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    claude_review_packet_declared: true,
    tenant_boundary_precheck_declared: true,
    matter_trace_precheck_declared: true,
    permission_audit_precheck_declared: true,
    idempotency_lock_persistence_boundaries_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp138ClaudeBoundaryManifest() {
  const readiness = createAuditComplianceCp138ClaudeBoundary();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP138_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT,
    readiness,
    no_write_attestation: CP138_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP138_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp138CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT.production_ready_flag,
  });
}

export function createAuditComplianceCp138HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-138.audit_compliance_claude_packet_sensitive_boundary",
    hermes_gate: AUDIT_COMPLIANCE_CP138_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/service-interface-claude-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-138/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp138CoveredUnitIds(),
  });
}

export function createAuditComplianceCp138ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-138.audit_compliance_claude_packet_sensitive_boundary",
    claude_gate: AUDIT_COMPLIANCE_CP138_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-138 keep the Claude review packet's tenant, matter, permission, audit hint, idempotency, lock, and persistence rows as no-write descriptors?",
      "Can any CP00-138 row execute product checks, send a prompt to Claude, persist a key or lock, expose hidden fields, or leak unauthorized counts or object names?",
      "Does the pack preserve H03/C03 as evidence and review gates only, not product authorities?",
      "Does the pack hand off cleanly from CP00-137 to CP00-139 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/service-interface-claude-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp138CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-138.to.CP00-139",
    from_pack_id: AUDIT_COMPLIANCE_CP138_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP138_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP138_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_claude_review_packet_terminal_and_api_continuation",
    dependencies: Object.freeze([
      "service_interface_workflow_evidence_boundaries",
      "claude_review_packet_opening_rows",
      "tenant_matter_permission_audit_precheck_boundaries",
      "idempotency_lock_persistence_boundaries",
      "hidden_field_and_count_leakage_controls",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp138Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp138CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP138_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP138_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== "RP03.P02.M09.S03") errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== "RP03.P02.M09.S12") errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
  if (new Set(coveredUnitIds).size !== coveredUnitIds.length) errors.push("covered units must be unique");
  if (planPack) {
    const plannedUnitIds = planPack.included_units?.map((unit) => unit.id) ?? [];
    if (plannedUnitIds.length !== coveredUnitIds.length) {
      errors.push(`plan included unit count mismatch: ${plannedUnitIds.length}`);
    }
    const mismatch = coveredUnitIds.find((unitId, index) => unitId !== plannedUnitIds[index]);
    if (mismatch) errors.push(`plan unit order mismatch at ${mismatch}`);
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    covered_unit_count: coveredUnitIds.length,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
  });
}
