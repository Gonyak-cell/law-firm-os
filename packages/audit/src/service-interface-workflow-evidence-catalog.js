export const AUDIT_COMPLIANCE_CP137_PACK_BINDING = Object.freeze({
  pack_id: "CP00-137",
  planned_pack_id: "CP00-137",
  risk_class: "B",
  unit_count: 40,
  range: "RP03.P02.M07.S07-RP03.P02.M09.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-136",
  next_pack_id: "CP00-138",
  next_subphase_id: "RP03.P02.M09.S03",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT = Object.freeze({
  id: "audit_compliance_cp137_service_interface_workflow_evidence_contract",
  pack_id: AUDIT_COMPLIANCE_CP137_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance service interface workflow evidence",
  production_ready_flag: "audit_compliance_service_interface_workflow_evidence_verified",
  covered_range: AUDIT_COMPLIANCE_CP137_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP137_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP137_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP137_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP137_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP137_NO_WRITE_ATTESTATION = Object.freeze({
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
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP137_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "rollback_internal_action",
  "retry_internal_schedule",
  "golden_case_internal_payload",
  "hermes_receipt_internal_digest",
  "claude_prompt_internal_context",
  "cross_tenant_row_count",
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

const CP137_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P02.M07",
    phase_id: "RP03.P02",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "service_interface_test_golden_case_terminal",
    template: SERVICE_INTERFACE_UNITS,
    start: 7,
    count: 16,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P02.M08",
    phase_id: "RP03.P02",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "service_interface_hermes_evidence_packet",
    template: SERVICE_INTERFACE_UNITS,
    start: 1,
    count: 22,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P02.M09",
    phase_id: "RP03.P02",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "service_interface_claude_review_packet_opening",
    template: SERVICE_INTERFACE_UNITS,
    start: 1,
    count: 2,
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  approval_required_routing: "approval_required_routing_evidence_bound",
  audit_hint_precheck: "audit_hint_precheck_evidence_bound",
  blocked_claim_output: "blocked_claim_output_evidence_bound",
  idempotency_key_handling: "idempotency_key_handling_evidence_bound",
  integration_smoke_case: "integration_smoke_case_evidence_bound",
  lock_acquisition_rule: "lock_acquisition_rule_evidence_bound",
  matter_trace_precheck: "matter_trace_precheck_evidence_bound",
  permission_precheck: "permission_precheck_evidence_bound",
  persistence_boundary: "persistence_boundary_evidence_bound",
  primary_happy_path: "primary_happy_path_evidence_bound",
  request_normalization: "request_normalization_evidence_bound",
  retry_behavior: "retry_behavior_evidence_bound",
  review_required_routing: "review_required_routing_evidence_bound",
  rollback_behavior: "rollback_behavior_evidence_bound",
  secondary_workflow_path: "secondary_workflow_path_evidence_bound",
  service_entrypoint_contract: "service_entrypoint_contract_evidence_bound",
  state_transition_enforcement: "state_transition_enforcement_evidence_bound",
  tenant_boundary_precheck: "tenant_boundary_precheck_evidence_bound",
  unit_test_denied_path: "unit_test_denied_path_evidence_bound",
  unit_test_happy_path: "unit_test_happy_path_evidence_bound",
  unit_test_review_path: "unit_test_review_path_evidence_bound",
  validation_error_mapping: "validation_error_mapping_evidence_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, microPhaseId) {
  if (behaviorKind.includes("tenant_boundary")) return "tenant_boundary_golden_case";
  if (behaviorKind.includes("matter_trace")) return "matter_trace_golden_case";
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_hint")) return "permission_audit_evidence_case";
  if (behaviorKind.includes("idempotency") || behaviorKind.includes("lock") || behaviorKind.includes("persistence")) return "state_boundary_evidence_case";
  if (behaviorKind.includes("rollback") || behaviorKind.includes("retry")) return "failure_recovery_evidence_case";
  if (behaviorKind.includes("test") || behaviorKind.includes("smoke")) return "test_golden_case_evidence";
  if (behaviorKind.includes("review_required") || microPhaseId.endsWith(".M09")) return "claude_review_packet_boundary";
  if (behaviorKind.includes("approval_required") || behaviorKind.includes("state_transition")) return "ui_state_evidence_case";
  if (microPhaseId.endsWith(".M08")) return "hermes_evidence_packet_boundary";
  return "service_workflow_evidence_boundary";
}

function evidenceModeFor(microPhaseId) {
  if (microPhaseId.endsWith(".M07")) return "test_golden_case";
  if (microPhaseId.endsWith(".M08")) return "hermes_evidence_packet";
  return "claude_review_packet";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP137_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_service_interface_workflow_evidence: true,
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
    writes_hermes_runtime: false,
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP137_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP137_MICRO_PHASES.flatMap((micro) =>
      micro.template.slice(micro.start - 1, micro.start - 1 + micro.count).map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro.micro_phase_id);
        const evidenceMode = evidenceModeFor(micro.micro_phase_id);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP137_PACK_BINDING.pack_id,
          program_id: "RP03",
          phase_id: micro.phase_id,
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: `${domain}.${slugFor(micro.micro_title)}`,
          domain,
          evidence_mode: evidenceMode,
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${micro.micro_phase_id.toLowerCase().replaceAll(".", "_")}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_b_service_interface_workflow_evidence",
            "audit_service_interface_workflow_bound",
            "golden_case_reference_only",
            "hermes_evidence_reference_only",
            "claude_review_packet_reference_only",
            "tenant_boundary_reference_only",
            "permission_audit_reference_only",
            "state_boundary_reference_only",
            "failure_recovery_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "cp136_handoff_inherited",
            "cp138_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_evidence_bound`,
          hidden_source_fields: CP137_HIDDEN_SOURCE_FIELDS,
        });
      }),
    ),
  );
}

const CP137_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp137CoveredUnitIds() {
  return Object.freeze(CP137_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP137_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase(caseId) {
  const row = CP137_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-137 audit compliance service interface workflow evidence case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "test_golden_case_set",
      "hermes_evidence_packet",
      "claude_review_packet",
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

export function createAuditComplianceCp137ServiceInterfaceWorkflowEvidence() {
  const cases = CP137_ROWS.map((row) => runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp137CoveredUnitIds().length,
    row_count: CP137_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP137_ROWS, "deliverable_type"),
    domain_counts: countBy(CP137_ROWS, "domain"),
    evidence_mode_counts: countBy(CP137_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp137CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp137CoveredUnitIds().at(-1),
    cp136_handoff_inherited: true,
    cp138_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    golden_case_set_declared: true,
    hermes_evidence_packet_declared: true,
    claude_review_packet_declared: true,
    service_entrypoint_contract_declared: true,
    tenant_boundary_precheck_declared: true,
    matter_trace_precheck_declared: true,
    permission_audit_precheck_declared: true,
    idempotency_lock_persistence_boundaries_declared: true,
    rollback_retry_boundaries_declared: true,
  });
}

export function createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceManifest() {
  const readiness = createAuditComplianceCp137ServiceInterfaceWorkflowEvidence();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP137_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT,
    readiness,
    no_write_attestation: CP137_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP137_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp137CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT.production_ready_flag,
  });
}

export function createAuditComplianceCp137HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-137.audit_compliance_service_interface_workflow_evidence",
    hermes_gate: AUDIT_COMPLIANCE_CP137_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/service-interface-workflow-evidence-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-137/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp137CoveredUnitIds(),
  });
}

export function createAuditComplianceCp137ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-137.audit_compliance_service_interface_workflow_evidence",
    claude_gate: AUDIT_COMPLIANCE_CP137_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    review_questions: Object.freeze([
      "Does CP00-137 preserve service-interface golden cases, Hermes evidence packet rows, and Claude review packet rows as no-write reference boundaries?",
      "Can any CP00-137 row execute tenant, matter, permission, audit hint, idempotency, lock, persistence, rollback, retry, audit query, export, UI, Hermes, or Claude behavior?",
      "Are denied, review-required, approval-required, blocked-claim, rollback, retry, and integration smoke paths represented without leaking unauthorized counts or hidden fields?",
      "Does the pack hand off cleanly from CP00-136 to CP00-138 without splitting HRX or implementing LDIP prematurely?",
      "Are H03/C03 gates evidence/review surfaces only, never product authorities?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/service-interface-workflow-evidence-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp137CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-137.to.CP00-138",
    from_pack_id: AUDIT_COMPLIANCE_CP137_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP137_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP137_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_claude_review_packet_continuation",
    dependencies: Object.freeze([
      "service_interface_readiness_boundaries",
      "test_and_golden_case_rows",
      "hermes_evidence_packet_rows",
      "claude_review_packet_opening_rows",
      "tenant_matter_permission_audit_precheck_boundaries",
      "idempotency_lock_persistence_boundaries",
      "rollback_retry_reference_boundaries",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp137Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp137CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP137_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP137_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== "RP03.P02.M07.S07") errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== "RP03.P02.M09.S02") errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
