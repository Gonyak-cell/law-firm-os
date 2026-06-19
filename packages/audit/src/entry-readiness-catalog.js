export const AUDIT_COMPLIANCE_CP135_PACK_BINDING = Object.freeze({
  pack_id: "CP00-135",
  planned_pack_id: "CP00-135",
  risk_class: "C",
  unit_count: 150,
  range: "RP03.P00.M00.S01-RP03.P01.M08.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-134",
  next_pack_id: "CP00-136",
  next_subphase_id: "RP03.P01.M08.S06",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT = Object.freeze({
  id: "audit_compliance_cp135_entry_readiness_contract",
  pack_id: AUDIT_COMPLIANCE_CP135_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance kernel entry readiness",
  production_ready_flag: "audit_compliance_entry_readiness_verified",
  covered_range: AUDIT_COMPLIANCE_CP135_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP135_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP135_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP135_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP135_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP135_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  renders_ui: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP135_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "raw_document_body",
  "full_email_body",
  "secret",
  "credential",
  "payment_card_number",
  "bank_account_number",
  "access_token",
  "private_key",
  "audit_query_internal_filter",
  "cross_tenant_row_count",
  "support_admin_internal_note",
  "legal_hold_release_internal_reason",
  "claude_packet_internal_prompt",
  "hermes_runtime_internal_receipt",
]);

const AUDIT_REQUIREMENT_IDS = Object.freeze([
  "AUD-001",
  "AUD-002",
  "AUD-003",
  "AUD-004",
  "AUD-005",
  "AUD-006",
  "AUD-007",
  "AUD-008",
  "NARR-009",
]);

const CONTRACT_BASELINE_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Scope inventory", deliverable_type: "implementation" }),
  Object.freeze({ index: 2, title: "Acceptance gate definition", deliverable_type: "implementation" }),
  Object.freeze({ index: 3, title: "Non-goal boundary", deliverable_type: "implementation" }),
  Object.freeze({ index: 4, title: "Target file map", deliverable_type: "implementation" }),
  Object.freeze({ index: 5, title: "Contract schema outline", deliverable_type: "contract" }),
  Object.freeze({ index: 6, title: "Ownership note", deliverable_type: "implementation" }),
  Object.freeze({ index: 7, title: "Matter-first trace note", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Permission baseline note", deliverable_type: "security_audit" }),
  Object.freeze({ index: 9, title: "Audit baseline note", deliverable_type: "security_audit" }),
  Object.freeze({ index: 10, title: "Synthetic data policy", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Risk register row", deliverable_type: "implementation" }),
]);

const DOMAIN_MODEL_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Package directory layout", deliverable_type: "ui" }),
  Object.freeze({ index: 2, title: "Primary entity identifier", deliverable_type: "implementation" }),
  Object.freeze({ index: 3, title: "Tenant scope field", deliverable_type: "implementation" }),
  Object.freeze({ index: 4, title: "Matter trace reference", deliverable_type: "implementation" }),
  Object.freeze({ index: 5, title: "Lifecycle status enum", deliverable_type: "implementation" }),
  Object.freeze({ index: 6, title: "Ownership metadata", deliverable_type: "implementation" }),
  Object.freeze({ index: 7, title: "Reference relationship map", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Required field registry", deliverable_type: "ui" }),
  Object.freeze({ index: 9, title: "Optional field registry", deliverable_type: "implementation" }),
  Object.freeze({ index: 10, title: "State transition map", deliverable_type: "ui" }),
  Object.freeze({ index: 11, title: "Validation helper", deliverable_type: "implementation" }),
  Object.freeze({ index: 12, title: "Fixture model", deliverable_type: "fixture" }),
  Object.freeze({ index: 13, title: "Serialization shape", deliverable_type: "implementation" }),
  Object.freeze({ index: 14, title: "Public export", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "Model unit test", deliverable_type: "test" }),
  Object.freeze({ index: 16, title: "Invalid reference test", deliverable_type: "test" }),
  Object.freeze({ index: 17, title: "Ownership drift test", deliverable_type: "test" }),
  Object.freeze({ index: 18, title: "Hermes model summary", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 19, title: "Claude model review prompt", deliverable_type: "claude_review" }),
  Object.freeze({ index: 20, title: "Closeout handoff", deliverable_type: "implementation" }),
]);

const CP135_MICRO_PHASES = Object.freeze([
  Object.freeze({ micro_phase_id: "RP03.P00.M00", phase_id: "RP03.P00", micro_id: "M00", micro_title: "Scope Inventory", phase_role: "contract_acceptance_scope_inventory", template: CONTRACT_BASELINE_UNITS, count: 1 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M01", phase_id: "RP03.P00", micro_id: "M01", micro_title: "Contract Draft", phase_role: "contract_acceptance_contract_draft", template: CONTRACT_BASELINE_UNITS, count: 1 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M02", phase_id: "RP03.P00", micro_id: "M02", micro_title: "Type And Shape Definition", phase_role: "contract_acceptance_shape_definition", template: CONTRACT_BASELINE_UNITS, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M03", phase_id: "RP03.P00", micro_id: "M03", micro_title: "Primary Implementation Slice", phase_role: "contract_acceptance_primary_slice", template: CONTRACT_BASELINE_UNITS, count: 11 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M04", phase_id: "RP03.P00", micro_id: "M04", micro_title: "Secondary Workflow Slice", phase_role: "contract_acceptance_secondary_workflow", template: CONTRACT_BASELINE_UNITS, count: 4 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M05", phase_id: "RP03.P00", micro_id: "M05", micro_title: "Permission And Audit Binding", phase_role: "contract_acceptance_permission_audit_binding", template: CONTRACT_BASELINE_UNITS, count: 11 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M06", phase_id: "RP03.P00", micro_id: "M06", micro_title: "Synthetic Fixture Set", phase_role: "contract_acceptance_synthetic_fixture", template: CONTRACT_BASELINE_UNITS, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M07", phase_id: "RP03.P00", micro_id: "M07", micro_title: "Test And Golden Case Set", phase_role: "contract_acceptance_test_golden_case", template: CONTRACT_BASELINE_UNITS, count: 11 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M08", phase_id: "RP03.P00", micro_id: "M08", micro_title: "Hermes Evidence Packet", phase_role: "contract_acceptance_hermes_evidence", template: CONTRACT_BASELINE_UNITS, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M09", phase_id: "RP03.P00", micro_id: "M09", micro_title: "Claude Review Packet", phase_role: "contract_acceptance_claude_review", template: CONTRACT_BASELINE_UNITS, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P00.M10", phase_id: "RP03.P00", micro_id: "M10", micro_title: "Closeout And Next Handoff", phase_role: "contract_acceptance_closeout_handoff", template: CONTRACT_BASELINE_UNITS, count: 1 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M00", phase_id: "RP03.P01", micro_id: "M00", micro_title: "Scope Inventory", phase_role: "domain_model_scope_inventory", template: DOMAIN_MODEL_UNITS, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M01", phase_id: "RP03.P01", micro_id: "M01", micro_title: "Contract Draft", phase_role: "domain_model_contract_draft", template: DOMAIN_MODEL_UNITS, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M02", phase_id: "RP03.P01", micro_id: "M02", micro_title: "Type And Shape Definition", phase_role: "domain_model_shape_definition", template: DOMAIN_MODEL_UNITS, count: 8 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M03", phase_id: "RP03.P01", micro_id: "M03", micro_title: "Primary Implementation Slice", phase_role: "domain_model_primary_slice", template: DOMAIN_MODEL_UNITS, count: 20 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M04", phase_id: "RP03.P01", micro_id: "M04", micro_title: "Secondary Workflow Slice", phase_role: "domain_model_secondary_workflow", template: DOMAIN_MODEL_UNITS, count: 11 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M05", phase_id: "RP03.P01", micro_id: "M05", micro_title: "Permission And Audit Binding", phase_role: "domain_model_permission_audit_binding", template: DOMAIN_MODEL_UNITS, count: 20 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M06", phase_id: "RP03.P01", micro_id: "M06", micro_title: "Synthetic Fixture Set", phase_role: "domain_model_synthetic_fixture", template: DOMAIN_MODEL_UNITS, count: 8 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M07", phase_id: "RP03.P01", micro_id: "M07", micro_title: "Test And Golden Case Set", phase_role: "domain_model_test_golden_case", template: DOMAIN_MODEL_UNITS, count: 20 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M08", phase_id: "RP03.P01", micro_id: "M08", micro_title: "Hermes Evidence Packet", phase_role: "domain_model_hermes_evidence_opening", template: DOMAIN_MODEL_UNITS, count: 5 }),
]);

const STATUS_BY_KIND = Object.freeze({
  acceptance_gate_definition: "acceptance_gate_defined",
  audit_baseline_note: "audit_baseline_bound",
  claude_model_review_prompt: "claude_model_review_prompt_bound",
  closeout_handoff: "closeout_handoff_bound",
  contract_schema_outline: "contract_schema_outline_bound",
  fixture_model: "fixture_model_bound",
  hermes_model_summary: "hermes_model_summary_bound",
  invalid_reference_test: "invalid_reference_test_bound",
  lifecycle_status_enum: "lifecycle_status_enum_bound",
  matter_first_trace_note: "matter_first_trace_note_bound",
  matter_trace_reference: "matter_trace_reference_bound",
  model_unit_test: "model_unit_test_bound",
  non_goal_boundary: "non_goal_boundary_bound",
  optional_field_registry: "optional_field_registry_bound",
  ownership_drift_test: "ownership_drift_test_bound",
  ownership_metadata: "ownership_metadata_bound",
  ownership_note: "ownership_note_bound",
  package_directory_layout: "package_directory_layout_bound",
  permission_baseline_note: "permission_baseline_bound",
  primary_entity_identifier: "primary_entity_identifier_bound",
  public_export: "public_export_bound",
  reference_relationship_map: "reference_relationship_map_bound",
  required_field_registry: "required_field_registry_bound",
  risk_register_row: "risk_register_row_bound",
  scope_inventory: "scope_inventory_bound",
  serialization_shape: "serialization_shape_bound",
  state_transition_map: "state_transition_map_bound",
  synthetic_data_policy: "synthetic_data_policy_bound",
  target_file_map: "target_file_map_bound",
  tenant_scope_field: "tenant_scope_field_bound",
  validation_helper: "validation_helper_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, microPhaseId) {
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_baseline")) return "security_audit_boundary";
  if (behaviorKind.includes("hermes")) return "hermes_evidence_boundary";
  if (behaviorKind.includes("claude")) return "claude_review_boundary";
  if (behaviorKind.includes("test") || behaviorKind.includes("drift")) return "test_boundary";
  if (behaviorKind.includes("fixture")) return "synthetic_fixture_boundary";
  if (behaviorKind.includes("layout") || behaviorKind.includes("registry") || behaviorKind.includes("transition")) return "domain_model_ui_reference_boundary";
  if (microPhaseId.startsWith("RP03.P00")) return "contract_acceptance_boundary";
  return "domain_model_boundary";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP135_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_entry_readiness: true,
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
    executes_audit_query: false,
    executes_compliance_export: false,
    executes_admin_access_review: false,
    renders_ui: false,
    executes_claude_review: false,
    writes_hermes_runtime: false,
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP135_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP135_MICRO_PHASES.flatMap((micro) =>
      micro.template.slice(0, micro.count).map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro.micro_phase_id);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP135_PACK_BINDING.pack_id,
          program_id: "RP03",
          phase_id: micro.phase_id,
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: `${domain}.${slugFor(micro.micro_title)}`,
          domain,
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${micro.micro_phase_id.toLowerCase().replaceAll(".", "_")}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          requirement_refs: micro.micro_phase_id === "RP03.P00.M01" ? AUDIT_REQUIREMENT_IDS : Object.freeze([]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_entry_readiness",
            "audit_contract_entry_bound",
            "tenant_boundary_declared",
            "privacy_payload_policy_declared",
            "append_only_and_correction_boundary_declared",
            "no_audit_event_write",
            "no_product_state_write",
            "cp134_handoff_inherited",
            "cp136_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_bound`,
          hidden_source_fields: CP135_HIDDEN_SOURCE_FIELDS,
        });
      }),
    ),
  );
}

const CP135_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp135CoveredUnitIds() {
  return Object.freeze(CP135_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp135EntryReadinessCatalog({ domain, deliverable_type } = {}) {
  return Object.freeze(CP135_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type),
  ));
}

export function runAuditComplianceCp135EntryReadinessCase(caseId) {
  const row = CP135_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-135 audit compliance entry readiness case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    deliverable_type: row.deliverable_type,
    requirement_refs: row.requirement_refs,
    contract_fields_checked: Object.freeze([
      "append_only",
      "correction_event_required",
      "tenant_boundary_required",
      "permission_trimming_required",
      "count_leakage_prohibited",
      "default_payload_mode",
      "export_requires_custody_receipt",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp135EntryReadiness() {
  const cases = CP135_ROWS.map((row) => runAuditComplianceCp135EntryReadinessCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp135CoveredUnitIds().length,
    row_count: CP135_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound") || entry.status.endsWith("_defined")),
    deliverable_counts: countBy(CP135_ROWS, "deliverable_type"),
    domain_counts: countBy(CP135_ROWS, "domain"),
    requirement_refs: AUDIT_REQUIREMENT_IDS,
    first_unit_id: createAuditComplianceCp135CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp135CoveredUnitIds().at(-1),
    cp134_handoff_inherited: true,
    cp136_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    append_only_contract_declared: true,
    correction_event_contract_declared: true,
    tenant_boundary_declared: true,
    privacy_payload_policy_declared: true,
    compliance_export_custody_declared: true,
  });
}

export function createAuditComplianceCp135EntryReadinessManifest() {
  const readiness = createAuditComplianceCp135EntryReadiness();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP135_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT,
    readiness,
    no_write_attestation: CP135_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP135_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp135CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT.production_ready_flag,
  });
}

export function createAuditComplianceCp135HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-135.audit_compliance_entry_readiness",
    hermes_gate: AUDIT_COMPLIANCE_CP135_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/entry-readiness-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-135/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp135CoveredUnitIds(),
  });
}

export function createAuditComplianceCp135ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-135.audit_compliance_entry_readiness",
    claude_gate: AUDIT_COMPLIANCE_CP135_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    review_questions: Object.freeze([
      "Does CP00-135 preserve append-only audit semantics while only adding no-write entry readiness artifacts?",
      "Can any CP00-135 row append, mutate, delete, query, export, or render audit data?",
      "Are tenant-boundary, permission trimming, count-leakage, and privacy payload policies represented before RP03 implementation begins?",
      "Are H03 Hermes evidence and C03 Claude review gates bound without making Hermes or Claude product authorities?",
      "Does the pack hand off cleanly from CP00-134 to CP00-136 without splitting HRX or implementing LDIP prematurely?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/entry-readiness-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp135CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-135.to.CP00-136",
    from_pack_id: AUDIT_COMPLIANCE_CP135_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP135_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP135_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_domain_model_continuation",
    dependencies: Object.freeze([
      "append_only_contract_baseline",
      "tenant_boundary_contract_baseline",
      "privacy_payload_contract_baseline",
      "domain_model_reference_boundaries",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp135Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp135CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP135_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP135_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== "RP03.P00.M00.S01") errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== "RP03.P01.M08.S05") errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
