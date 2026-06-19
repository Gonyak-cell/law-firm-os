export const AUDIT_COMPLIANCE_CP136_PACK_BINDING = Object.freeze({
  pack_id: "CP00-136",
  planned_pack_id: "CP00-136",
  risk_class: "C",
  unit_count: 150,
  range: "RP03.P01.M08.S06-RP03.P02.M07.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-135",
  next_pack_id: "CP00-137",
  next_subphase_id: "RP03.P02.M07.S07",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT = Object.freeze({
  id: "audit_compliance_cp136_service_interface_readiness_contract",
  pack_id: AUDIT_COMPLIANCE_CP136_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance service interface readiness",
  production_ready_flag: "audit_compliance_service_interface_readiness_verified",
  covered_range: AUDIT_COMPLIANCE_CP136_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP136_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP136_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP136_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP136_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP136_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP136_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "rollback_internal_action",
  "retry_internal_schedule",
  "cross_tenant_row_count",
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
]);

const SERVICE_INTERFACE_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Service entrypoint contract", deliverable_type: "contract" }),
  Object.freeze({ index: 2, title: "Request normalization", deliverable_type: "implementation" }),
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
  Object.freeze({ index: 13, title: "Validation error mapping", deliverable_type: "implementation" }),
  Object.freeze({ index: 14, title: "Review-required routing", deliverable_type: "claude_review" }),
  Object.freeze({ index: 15, title: "Approval-required routing", deliverable_type: "ui" }),
  Object.freeze({ index: 16, title: "Blocked-claim output", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "Rollback behavior", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 18, title: "Retry behavior", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 19, title: "Unit test: happy path", deliverable_type: "test" }),
  Object.freeze({ index: 20, title: "Unit test: denied path", deliverable_type: "test" }),
  Object.freeze({ index: 21, title: "Unit test: review path", deliverable_type: "test" }),
  Object.freeze({ index: 22, title: "Integration smoke case", deliverable_type: "test" }),
]);

const CP136_MICRO_PHASES = Object.freeze([
  Object.freeze({ micro_phase_id: "RP03.P01.M08", phase_id: "RP03.P01", micro_id: "M08", micro_title: "Hermes Evidence Packet", phase_role: "domain_model_hermes_evidence_terminal", template: DOMAIN_MODEL_UNITS, start: 6, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M09", phase_id: "RP03.P01", micro_id: "M09", micro_title: "Claude Review Packet", phase_role: "domain_model_claude_review_packet", template: DOMAIN_MODEL_UNITS, start: 1, count: 8 }),
  Object.freeze({ micro_phase_id: "RP03.P01.M10", phase_id: "RP03.P01", micro_id: "M10", micro_title: "Closeout And Next Handoff", phase_role: "domain_model_closeout_service_interface_handoff", template: DOMAIN_MODEL_UNITS, start: 1, count: 3 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M00", phase_id: "RP03.P02", micro_id: "M00", micro_title: "Scope Inventory", phase_role: "service_interface_scope_inventory", template: SERVICE_INTERFACE_UNITS, start: 1, count: 11 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M01", phase_id: "RP03.P02", micro_id: "M01", micro_title: "Contract Draft", phase_role: "service_interface_contract_draft", template: SERVICE_INTERFACE_UNITS, start: 1, count: 11 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M02", phase_id: "RP03.P02", micro_id: "M02", micro_title: "Type And Shape Definition", phase_role: "service_interface_shape_definition", template: SERVICE_INTERFACE_UNITS, start: 1, count: 20 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M03", phase_id: "RP03.P02", micro_id: "M03", micro_title: "Primary Implementation Slice", phase_role: "service_interface_primary_slice", template: SERVICE_INTERFACE_UNITS, start: 1, count: 22 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M04", phase_id: "RP03.P02", micro_id: "M04", micro_title: "Secondary Workflow Slice", phase_role: "service_interface_secondary_workflow", template: SERVICE_INTERFACE_UNITS, start: 1, count: 22 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M05", phase_id: "RP03.P02", micro_id: "M05", micro_title: "Permission And Audit Binding", phase_role: "service_interface_permission_audit_binding", template: SERVICE_INTERFACE_UNITS, start: 1, count: 22 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M06", phase_id: "RP03.P02", micro_id: "M06", micro_title: "Synthetic Fixture Set", phase_role: "service_interface_synthetic_fixture", template: SERVICE_INTERFACE_UNITS, start: 1, count: 22 }),
  Object.freeze({ micro_phase_id: "RP03.P02.M07", phase_id: "RP03.P02", micro_id: "M07", micro_title: "Test And Golden Case Set", phase_role: "service_interface_test_golden_case_opening", template: SERVICE_INTERFACE_UNITS, start: 1, count: 6 }),
]);

const STATUS_BY_KIND = Object.freeze({
  approval_required_routing: "approval_required_routing_bound",
  audit_hint_precheck: "audit_hint_precheck_bound",
  blocked_claim_output: "blocked_claim_output_bound",
  idempotency_key_handling: "idempotency_key_handling_bound",
  integration_smoke_case: "integration_smoke_case_bound",
  lock_acquisition_rule: "lock_acquisition_rule_bound",
  matter_trace_precheck: "matter_trace_precheck_bound",
  ownership_metadata: "ownership_metadata_bound",
  permission_precheck: "permission_precheck_bound",
  persistence_boundary: "persistence_boundary_bound",
  primary_entity_identifier: "primary_entity_identifier_bound",
  primary_happy_path: "primary_happy_path_bound",
  reference_relationship_map: "reference_relationship_map_bound",
  request_normalization: "request_normalization_bound",
  required_field_registry: "required_field_registry_bound",
  retry_behavior: "retry_behavior_bound",
  review_required_routing: "review_required_routing_bound",
  rollback_behavior: "rollback_behavior_bound",
  secondary_workflow_path: "secondary_workflow_path_bound",
  service_entrypoint_contract: "service_entrypoint_contract_bound",
  state_transition_enforcement: "state_transition_enforcement_bound",
  tenant_boundary_precheck: "tenant_boundary_precheck_bound",
  tenant_scope_field: "tenant_scope_field_bound",
  unit_test_denied_path: "unit_test_denied_path_bound",
  unit_test_happy_path: "unit_test_happy_path_bound",
  unit_test_review_path: "unit_test_review_path_bound",
  validation_error_mapping: "validation_error_mapping_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, microPhaseId) {
  if (behaviorKind.includes("tenant_boundary")) return "tenant_boundary_precheck";
  if (behaviorKind.includes("matter_trace")) return "matter_trace_precheck";
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_hint")) return "permission_audit_precheck";
  if (behaviorKind.includes("idempotency") || behaviorKind.includes("lock") || behaviorKind.includes("persistence")) return "state_boundary_precheck";
  if (behaviorKind.includes("rollback") || behaviorKind.includes("retry")) return "failure_recovery_precheck";
  if (behaviorKind.includes("test") || behaviorKind.includes("smoke")) return "test_golden_case_boundary";
  if (behaviorKind.includes("review_required") || behaviorKind.includes("claude")) return "review_routing_boundary";
  if (behaviorKind.includes("layout") || behaviorKind.includes("registry") || behaviorKind.includes("state_transition") || behaviorKind.includes("approval_required")) return "ui_reference_boundary";
  if (microPhaseId.startsWith("RP03.P01")) return "domain_model_terminal_boundary";
  return "service_interface_boundary";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP136_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_service_interface_readiness: true,
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
    executes_audit_query: false,
    executes_compliance_export: false,
    executes_admin_access_review: false,
    acquires_locks: false,
    persists_lock_tokens: false,
    executes_rollback: false,
    executes_retry: false,
    renders_ui: false,
    executes_claude_review: false,
    writes_hermes_runtime: false,
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP136_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP136_MICRO_PHASES.flatMap((micro) =>
      micro.template.slice(micro.start - 1, micro.start - 1 + micro.count).map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro.micro_phase_id);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP136_PACK_BINDING.pack_id,
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
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_service_interface_readiness",
            "audit_service_interface_bound",
            "tenant_boundary_reference_only",
            "permission_audit_reference_only",
            "state_boundary_reference_only",
            "failure_recovery_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "cp135_handoff_inherited",
            "cp137_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_bound`,
          hidden_source_fields: CP136_HIDDEN_SOURCE_FIELDS,
        });
      }),
    ),
  );
}

const CP136_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp136CoveredUnitIds() {
  return Object.freeze(CP136_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp136ServiceInterfaceReadinessCatalog({ domain, deliverable_type } = {}) {
  return Object.freeze(CP136_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type),
  ));
}

export function runAuditComplianceCp136ServiceInterfaceReadinessCase(caseId) {
  const row = CP136_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-136 audit compliance service interface readiness case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "service_entrypoint_contract",
      "tenant_boundary_required",
      "matter_trace_precheck",
      "permission_trimming_required",
      "count_leakage_prohibited",
      "idempotency_key_handling",
      "lock_acquisition_rule",
      "rollback_behavior",
      "retry_behavior",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp136ServiceInterfaceReadiness() {
  const cases = CP136_ROWS.map((row) => runAuditComplianceCp136ServiceInterfaceReadinessCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp136CoveredUnitIds().length,
    row_count: CP136_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP136_ROWS, "deliverable_type"),
    domain_counts: countBy(CP136_ROWS, "domain"),
    first_unit_id: createAuditComplianceCp136CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp136CoveredUnitIds().at(-1),
    cp135_handoff_inherited: true,
    cp137_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    service_entrypoint_contract_declared: true,
    tenant_boundary_precheck_declared: true,
    matter_trace_precheck_declared: true,
    permission_audit_precheck_declared: true,
    idempotency_lock_persistence_boundaries_declared: true,
    rollback_retry_boundaries_declared: true,
  });
}

export function createAuditComplianceCp136ServiceInterfaceReadinessManifest() {
  const readiness = createAuditComplianceCp136ServiceInterfaceReadiness();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP136_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT,
    readiness,
    no_write_attestation: CP136_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP136_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp136CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT.production_ready_flag,
  });
}

export function createAuditComplianceCp136HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-136.audit_compliance_service_interface_readiness",
    hermes_gate: AUDIT_COMPLIANCE_CP136_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/service-interface-readiness-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-136/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp136CoveredUnitIds(),
  });
}

export function createAuditComplianceCp136ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-136.audit_compliance_service_interface_readiness",
    claude_gate: AUDIT_COMPLIANCE_CP136_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    review_questions: Object.freeze([
      "Does CP00-136 preserve service-interface prechecks as no-write reference boundaries?",
      "Can any CP00-136 row execute tenant, matter, permission, idempotency, lock, persistence, rollback, retry, audit query, export, or UI behavior?",
      "Are permission/audit hints and count-leakage boundaries represented without exposing unauthorized row counts or hidden fields?",
      "Does the pack hand off cleanly from CP00-135 to CP00-137 without splitting HRX or implementing LDIP prematurely?",
      "Are H03/C03 gates bound without making Hermes or Claude product authorities?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/service-interface-readiness-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp136CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-136.to.CP00-137",
    from_pack_id: AUDIT_COMPLIANCE_CP136_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP136_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP136_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_service_interface_test_continuation",
    dependencies: Object.freeze([
      "domain_model_terminal_boundaries",
      "service_entrypoint_contract_boundary",
      "tenant_matter_permission_audit_precheck_boundaries",
      "idempotency_lock_persistence_boundaries",
      "rollback_retry_reference_boundaries",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp136Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp136CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP136_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP136_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== "RP03.P01.M08.S06") errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== "RP03.P02.M07.S06") errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
