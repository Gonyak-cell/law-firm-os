import {
  GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP480_PACK_BINDING,
  GOVERNANCE_CORE_CP480_REQUIREMENTS,
  GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP481_PACK_BINDING,
  GOVERNANCE_CORE_CP481_REQUIREMENTS,
  GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP482_PACK_BINDING,
  GOVERNANCE_CORE_CP482_REQUIREMENTS,
  GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP483_PACK_BINDING,
  GOVERNANCE_CORE_CP483_REQUIREMENTS,
  GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP484_PACK_BINDING,
  GOVERNANCE_CORE_CP484_REQUIREMENTS,
  GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP485_PACK_BINDING,
  GOVERNANCE_CORE_CP485_REQUIREMENTS,
  GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP486_PACK_BINDING,
  GOVERNANCE_CORE_CP486_REQUIREMENTS,
  GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP487_PACK_BINDING,
  GOVERNANCE_CORE_CP487_REQUIREMENTS,
  GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP488_PACK_BINDING,
  GOVERNANCE_CORE_CP488_REQUIREMENTS,
  GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP489_PACK_BINDING,
  GOVERNANCE_CORE_CP489_REQUIREMENTS,
  GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP490_PACK_BINDING,
  GOVERNANCE_CORE_CP490_REQUIREMENTS,
  GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP491_PACK_BINDING,
  GOVERNANCE_CORE_CP491_REQUIREMENTS,
  GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP492_PACK_BINDING,
  GOVERNANCE_CORE_CP492_REQUIREMENTS,
  GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP493_PACK_BINDING,
  GOVERNANCE_CORE_CP493_REQUIREMENTS,
  GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP494_PACK_BINDING,
  GOVERNANCE_CORE_CP494_REQUIREMENTS,
  GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP495_PACK_BINDING,
  GOVERNANCE_CORE_CP495_REQUIREMENTS,
  GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP496_PACK_BINDING,
  GOVERNANCE_CORE_CP496_REQUIREMENTS,
  GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP497_PACK_BINDING,
  GOVERNANCE_CORE_CP497_REQUIREMENTS,
  GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP498_PACK_BINDING,
  GOVERNANCE_CORE_CP498_REQUIREMENTS,
  GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP499_PACK_BINDING,
  GOVERNANCE_CORE_CP499_REQUIREMENTS,
  GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP500_PACK_BINDING,
  GOVERNANCE_CORE_CP500_REQUIREMENTS,
  GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP501_PACK_BINDING,
  GOVERNANCE_CORE_CP501_REQUIREMENTS,
  GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP502_PACK_BINDING,
  GOVERNANCE_CORE_CP502_REQUIREMENTS,
  GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP503_PACK_BINDING,
  GOVERNANCE_CORE_CP503_REQUIREMENTS,
  GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP504_PACK_BINDING,
  GOVERNANCE_CORE_CP504_REQUIREMENTS,
  GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP505_PACK_BINDING,
  GOVERNANCE_CORE_CP505_REQUIREMENTS,
  GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP506_PACK_BINDING,
  GOVERNANCE_CORE_CP506_REQUIREMENTS,
  GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP507_PACK_BINDING,
  GOVERNANCE_CORE_CP507_REQUIREMENTS,
  GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP508_PACK_BINDING,
  GOVERNANCE_CORE_CP508_REQUIREMENTS,
  GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP509_PACK_BINDING,
  GOVERNANCE_CORE_CP509_REQUIREMENTS,
  GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP510_PACK_BINDING,
  GOVERNANCE_CORE_CP510_REQUIREMENTS,
  GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP511_PACK_BINDING,
  GOVERNANCE_CORE_CP511_REQUIREMENTS,
  GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP512_PACK_BINDING,
  GOVERNANCE_CORE_CP512_REQUIREMENTS,
  GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP513_PACK_BINDING,
  GOVERNANCE_CORE_CP513_REQUIREMENTS,
  GOVERNANCE_CORE_PROGRAM_CONTRACT,
} from "./registry.js";

const GOVERNANCE_CORE_SECRET_MATERIAL_FIELD_PATTERN =
  /(^|_)(secret|credential|access_token|api_key|password|private_key|client_secret|refresh_token|id_token|signed_url|lock_token|break_glass_token)($|_)/i;

export const GOVERNANCE_CORE_SECURE_SECRET_HANDLING_POLICY = Object.freeze({
  accepts_secret_material: false,
  credential_or_secret_included: false,
  secret_material_included: false,
  exposes_secret_material: false,
});

export function assertGovernanceCoreNoSecretMaterialIncluded(payload = {}) {
  const forbiddenFields = Object.keys(payload).filter((field) => GOVERNANCE_CORE_SECRET_MATERIAL_FIELD_PATTERN.test(field));
  if (forbiddenFields.length > 0) {
    throw new Error(`Governance Core payload must not include secret material fields: ${forbiddenFields.join(", ")}`);
  }
  return Object.freeze({
    ...GOVERNANCE_CORE_SECURE_SECRET_HANDLING_POLICY,
    checked_field_count: Object.keys(payload).length,
    forbidden_field_count: 0,
  });
}

export function governanceCoreRowKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function freezeCp480Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP480_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_analytics_core_pack_id: GOVERNANCE_CORE_CP480_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP480_ROW_EXTRAS = Object.freeze({
  scope_inventory: Object.freeze({
    scope_descriptor_only: true,
    program_scope: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_scope,
  }),
  acceptance_gate_definition: Object.freeze({
    hermes_gate: GOVERNANCE_CORE_CP480_PACK_BINDING.hermes_gate,
    claude_gate: GOVERNANCE_CORE_CP480_PACK_BINDING.claude_gate,
  }),
  non_goal_boundary: Object.freeze({
    governance_runtime_opened: false,
    dlp_runtime_opened: false,
    retention_runtime_opened: false,
    legal_hold_runtime_opened: false,
  }),
  target_file_map: Object.freeze({
    target_package: "packages/governance",
    target_contract: "contracts/governance-core-contract.json",
    target_validator: "scripts/validate-rp16-governance-core-contract.mjs",
  }),
  contract_schema_outline: Object.freeze({ contract_descriptor_only: true }),
  ownership_note: Object.freeze({ ownership_descriptor_only: true }),
  matter_first_trace_note: Object.freeze({ matter_trace_required: true }),
  permission_baseline_note: Object.freeze({
    permission_decision_detail_included: false,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
  }),
  audit_baseline_note: Object.freeze({ audit_event_body_included: false }),
  synthetic_data_policy: Object.freeze({ real_client_data_loaded: false, synthetic_only: true }),
  risk_register_row: Object.freeze({ risk_register_descriptor_only: true }),
  package_directory_layout: Object.freeze({ package_path: "packages/governance" }),
  primary_entity_identifier: Object.freeze({ identifier_descriptor_only: true }),
  tenant_scope_field: Object.freeze({ cross_tenant_access_allowed: false }),
  matter_trace_reference: Object.freeze({ matter_trace_required: true }),
  lifecycle_status_enum: Object.freeze({ lifecycle_descriptor_only: true }),
  ownership_metadata: Object.freeze({ ownership_descriptor_only: true }),
  reference_relationship_map: Object.freeze({ relationship_descriptor_only: true }),
  required_field_registry: Object.freeze({ registry_descriptor_only: true }),
  optional_field_registry: Object.freeze({ registry_descriptor_only: true }),
  state_transition_map: Object.freeze({ writes_state_transition: false }),
  validation_helper: Object.freeze({ validation_descriptor_only: true, validation_error_detail_included: false }),
  fixture_model: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  serialization_shape: Object.freeze({ serialization_descriptor_only: true }),
  public_export: Object.freeze({ index_export_check: true }),
  model_unit_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  invalid_reference_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "rejected_customer_safe" }),
  ownership_drift_test: Object.freeze({ executes_unit_test_runtime_paths: false, ownership_drift_detected: false }),
  hermes_model_summary: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_model_review_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  closeout_handoff: Object.freeze({ handoff_descriptor_only: true }),
});

export function createGovernanceCoreCp480ScopeContractFoundationCaseSet(input = {}) {
  void input;
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP480_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP480_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP480_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp480Result({
    case_set_id: "governance-core-cp480-scope-contract-foundation-case-set",
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp480ScopeContractFoundationDescriptor(input = {}) {
  const caseSet = createGovernanceCoreCp480ScopeContractFoundationCaseSet(input);
  return freezeCp480Result({
    descriptor: "GovernanceCoreCp480ScopeContractFoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP480_PACK_BINDING,
    program_contract: GOVERNANCE_CORE_PROGRAM_CONTRACT,
    scope_contract_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP480_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-480",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP480_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP480_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-480.governance_core_scope_contract_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP480_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_scope_contract_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-480.governance_core_scope_contract_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP480_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP480_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP480_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP480_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP480_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP480_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P01.M02.S09 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp481Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP481_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_scope_contract_foundation_pack_id: GOVERNANCE_CORE_CP481_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP481_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP480_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/governance/README.md#cp00-481" }),
});

export function createGovernanceCoreCp481ModelFoundationSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp480ScopeContractFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP481_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP481_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP481_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp481Result({
    case_set_id: "governance-core-cp481-model-foundation-slice-case-set",
    source_scope_contract_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp481ModelFoundationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp480ScopeContractFoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp481ModelFoundationSliceCaseSet(input);
  return freezeCp481Result({
    descriptor: "GovernanceCoreCp481ModelFoundationSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP481_PACK_BINDING,
    source_scope_contract_foundation_descriptor: upstreamDescriptor.descriptor,
    model_foundation_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP481_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-481",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP481_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP481_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-481.governance_core_model_foundation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP481_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_model_foundation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-481.governance_core_model_foundation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP481_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP481_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP481_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP481_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP481_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP481_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P01.M04.S07 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp482Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP482_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_model_foundation_slice_pack_id: GOVERNANCE_CORE_CP482_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP482_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP481_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/governance/README.md#cp00-482" }),
});

export function createGovernanceCoreCp482WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp481ModelFoundationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP482_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP482_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP482_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp482Result({
    case_set_id: "governance-core-cp482-workflow-permission-slice-case-set",
    source_model_foundation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp482WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp481ModelFoundationSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp482WorkflowPermissionSliceCaseSet(input);
  return freezeCp482Result({
    descriptor: "GovernanceCoreCp482WorkflowPermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP482_PACK_BINDING,
    source_model_foundation_slice_descriptor: upstreamDescriptor.descriptor,
    workflow_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP482_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-482",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP482_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP482_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-482.governance_core_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP482_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-482.governance_core_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP482_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP482_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP482_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP482_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP482_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP482_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P01.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp483Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP483_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_workflow_permission_slice_pack_id: GOVERNANCE_CORE_CP483_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP483_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP482_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/governance/README.md#cp00-483" }),
});

export function createGovernanceCoreCp483P01CloseoutP02FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp482WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP483_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP483_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP483_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp483Result({
    case_set_id: "governance-core-cp483-p01-closeout-p02-foundation-case-set",
    source_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp483P01CloseoutP02FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp482WorkflowPermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp483P01CloseoutP02FoundationCaseSet(input);
  return freezeCp483Result({
    descriptor: "GovernanceCoreCp483P01CloseoutP02FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP483_PACK_BINDING,
    source_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p01_closeout_p02_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP483_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-483",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP483_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP483_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-483.governance_core_p01_closeout_p02_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP483_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p01_closeout_p02_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-483.governance_core_p01_closeout_p02_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP483_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP483_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP483_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP483_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP483_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP483_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P02.M03.S01 onward with the P02 primary implementation rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp484Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP484_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p01_closeout_p02_foundation_pack_id: GOVERNANCE_CORE_CP484_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP484_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP483_ROW_EXTRAS,
});

export function createGovernanceCoreCp484P02ImplementationSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp483P01CloseoutP02FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP484_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP484_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP484_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp484Result({
    case_set_id: "governance-core-cp484-p02-implementation-slice-case-set",
    source_p01_closeout_p02_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp484P02ImplementationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp483P01CloseoutP02FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp484P02ImplementationSliceCaseSet(input);
  return freezeCp484Result({
    descriptor: "GovernanceCoreCp484P02ImplementationSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP484_PACK_BINDING,
    source_p01_closeout_p02_foundation_descriptor: upstreamDescriptor.descriptor,
    p02_implementation_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP484_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-484",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP484_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP484_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-484.governance_core_p02_implementation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP484_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p02_implementation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-484.governance_core_p02_implementation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP484_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP484_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP484_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP484_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP484_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP484_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P02.M04.S19 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp485Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP485_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_implementation_slice_pack_id: GOVERNANCE_CORE_CP485_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP485_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP484_ROW_EXTRAS,
});

export function createGovernanceCoreCp485P02WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp484P02ImplementationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP485_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP485_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP485_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp485Result({
    case_set_id: "governance-core-cp485-p02-workflow-permission-slice-case-set",
    source_p02_implementation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp484P02ImplementationSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp485P02WorkflowPermissionSliceCaseSet(input);
  return freezeCp485Result({
    descriptor: "GovernanceCoreCp485P02WorkflowPermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP485_PACK_BINDING,
    source_p02_implementation_slice_descriptor: upstreamDescriptor.descriptor,
    p02_workflow_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP485_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-485",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP485_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP485_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-485.governance_core_p02_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP485_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p02_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-485.governance_core_p02_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP485_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP485_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP485_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP485_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP485_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP485_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P02.M06.S15 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp486Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP486_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_workflow_permission_slice_pack_id: GOVERNANCE_CORE_CP486_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP486_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP485_ROW_EXTRAS,
});

export function createGovernanceCoreCp486P02FixtureTestSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp485P02WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP486_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP486_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP486_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp486Result({
    case_set_id: "governance-core-cp486-p02-fixture-test-slice-case-set",
    source_p02_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp486P02FixtureTestSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp486P02FixtureTestSliceCaseSet(input);
  return freezeCp486Result({
    descriptor: "GovernanceCoreCp486P02FixtureTestSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP486_PACK_BINDING,
    source_p02_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p02_fixture_test_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP486_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-486",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP486_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP486_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-486.governance_core_p02_fixture_test_slice_descriptor",
      gate: GOVERNANCE_CORE_CP486_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p02_fixture_test_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-486.governance_core_p02_fixture_test_slice_descriptor",
      gate: GOVERNANCE_CORE_CP486_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP486_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP486_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP486_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP486_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP486_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P02.M07.S03 onward with the remaining test and golden case rows while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp487Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP487_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_fixture_test_slice_pack_id: GOVERNANCE_CORE_CP487_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP487_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP486_ROW_EXTRAS,
});

export function createGovernanceCoreCp487P02TestSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp486P02FixtureTestSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP487_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP487_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP487_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp487Result({
    case_set_id: "governance-core-cp487-p02-test-slice-case-set",
    source_p02_fixture_test_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp487P02TestSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp486P02FixtureTestSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp487P02TestSliceCaseSet(input);
  return freezeCp487Result({
    descriptor: "GovernanceCoreCp487P02TestSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP487_PACK_BINDING,
    source_p02_fixture_test_slice_descriptor: upstreamDescriptor.descriptor,
    p02_test_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP487_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-487",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP487_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP487_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-487.governance_core_p02_test_slice_descriptor",
      gate: GOVERNANCE_CORE_CP487_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p02_test_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-487.governance_core_p02_test_slice_descriptor",
      gate: GOVERNANCE_CORE_CP487_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP487_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP487_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP487_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP487_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP487_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P02.M07.S13 onward with the remaining test and golden case rows and the downstream evidence micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp488Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP488_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_test_slice_pack_id: GOVERNANCE_CORE_CP488_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP488_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP487_ROW_EXTRAS,
});

export function createGovernanceCoreCp488P02TestHermesSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp487P02TestSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP488_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP488_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP488_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp488Result({
    case_set_id: "governance-core-cp488-p02-test-hermes-slice-case-set",
    source_p02_test_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp488P02TestHermesSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp487P02TestSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp488P02TestHermesSliceCaseSet(input);
  return freezeCp488Result({
    descriptor: "GovernanceCoreCp488P02TestHermesSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP488_PACK_BINDING,
    source_p02_test_slice_descriptor: upstreamDescriptor.descriptor,
    p02_test_hermes_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP488_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-488",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP488_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP488_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-488.governance_core_p02_test_hermes_slice_descriptor",
      gate: GOVERNANCE_CORE_CP488_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p02_test_hermes_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-488.governance_core_p02_test_hermes_slice_descriptor",
      gate: GOVERNANCE_CORE_CP488_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP488_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP488_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP488_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP488_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP488_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P02.M09.S09 onward with the remaining review packet rows and the closeout micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp489Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP489_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_test_hermes_slice_pack_id: GOVERNANCE_CORE_CP489_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP489_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP488_ROW_EXTRAS,
});

export function createGovernanceCoreCp489P02CloseoutP03FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp488P02TestHermesSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP489_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP489_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP489_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp489Result({
    case_set_id: "governance-core-cp489-p02-closeout-p03-foundation-case-set",
    source_p02_test_hermes_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp489P02CloseoutP03FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp488P02TestHermesSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp489P02CloseoutP03FoundationCaseSet(input);
  return freezeCp489Result({
    descriptor: "GovernanceCoreCp489P02CloseoutP03FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP489_PACK_BINDING,
    source_p02_test_hermes_slice_descriptor: upstreamDescriptor.descriptor,
    p02_closeout_p03_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP489_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-489",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP489_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP489_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-489.governance_core_p02_closeout_p03_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP489_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p02_closeout_p03_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-489.governance_core_p02_closeout_p03_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP489_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP489_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP489_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP489_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP489_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP489_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P03.M06.S13 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp490Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP490_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_closeout_p03_foundation_pack_id: GOVERNANCE_CORE_CP490_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP490_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP489_ROW_EXTRAS,
});

export function createGovernanceCoreCp490P03CloseoutP04FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp489P02CloseoutP03FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP490_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP490_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP490_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp490Result({
    case_set_id: "governance-core-cp490-p03-closeout-p04-foundation-case-set",
    source_p02_closeout_p03_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp490P03CloseoutP04FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp489P02CloseoutP03FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp490P03CloseoutP04FoundationCaseSet(input);
  return freezeCp490Result({
    descriptor: "GovernanceCoreCp490P03CloseoutP04FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP490_PACK_BINDING,
    source_p02_closeout_p03_foundation_descriptor: upstreamDescriptor.descriptor,
    p03_closeout_p04_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP490_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-490",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP490_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP490_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-490.governance_core_p03_closeout_p04_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP490_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p03_closeout_p04_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-490.governance_core_p03_closeout_p04_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP490_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP490_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP490_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP490_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP490_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP490_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P04.M03.S21 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp491Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP491_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p03_closeout_p04_foundation_pack_id: GOVERNANCE_CORE_CP491_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP491_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP490_ROW_EXTRAS,
});

export function createGovernanceCoreCp491P04WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp490P03CloseoutP04FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP491_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP491_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP491_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp491Result({
    case_set_id: "governance-core-cp491-p04-workflow-permission-slice-case-set",
    source_p03_closeout_p04_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp490P03CloseoutP04FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp491P04WorkflowPermissionSliceCaseSet(input);
  return freezeCp491Result({
    descriptor: "GovernanceCoreCp491P04WorkflowPermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP491_PACK_BINDING,
    source_p03_closeout_p04_foundation_descriptor: upstreamDescriptor.descriptor,
    p04_workflow_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP491_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-491",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP491_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP491_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-491.governance_core_p04_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP491_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p04_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-491.governance_core_p04_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP491_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP491_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP491_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP491_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP491_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP491_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P04.M05.S17 onward with the remaining permission and audit binding rows and the synthetic fixture micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp492Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP492_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_workflow_permission_slice_pack_id: GOVERNANCE_CORE_CP492_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP492_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP491_ROW_EXTRAS,
});

export function createGovernanceCoreCp492P04PermissionFixtureSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp491P04WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP492_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP492_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP492_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp492Result({
    case_set_id: "governance-core-cp492-p04-permission-fixture-slice-case-set",
    source_p04_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp492P04PermissionFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp492P04PermissionFixtureSliceCaseSet(input);
  return freezeCp492Result({
    descriptor: "GovernanceCoreCp492P04PermissionFixtureSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP492_PACK_BINDING,
    source_p04_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p04_permission_fixture_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP492_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-492",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP492_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP492_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-492.governance_core_p04_permission_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP492_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p04_permission_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-492.governance_core_p04_permission_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP492_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP492_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP492_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP492_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP492_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP492_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P04.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp493Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP493_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_permission_fixture_slice_pack_id: GOVERNANCE_CORE_CP493_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP493_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP492_ROW_EXTRAS,
});

export function createGovernanceCoreCp493P04CloseoutP05FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp492P04PermissionFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP493_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP493_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP493_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp493Result({
    case_set_id: "governance-core-cp493-p04-closeout-p05-foundation-case-set",
    source_p04_permission_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp493P04CloseoutP05FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp492P04PermissionFixtureSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp493P04CloseoutP05FoundationCaseSet(input);
  return freezeCp493Result({
    descriptor: "GovernanceCoreCp493P04CloseoutP05FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP493_PACK_BINDING,
    source_p04_permission_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p04_closeout_p05_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP493_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-493",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP493_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP493_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-493.governance_core_p04_closeout_p05_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP493_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p04_closeout_p05_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-493.governance_core_p04_closeout_p05_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP493_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP493_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP493_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP493_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP493_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP493_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P05.M03.S07 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp494Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP494_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_closeout_p05_foundation_pack_id: GOVERNANCE_CORE_CP494_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP494_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP493_ROW_EXTRAS,
});

export function createGovernanceCoreCp494P05ImplementationWorkflowSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp493P04CloseoutP05FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP494_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP494_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP494_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp494Result({
    case_set_id: "governance-core-cp494-p05-implementation-workflow-slice-case-set",
    source_p04_closeout_p05_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp493P04CloseoutP05FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp494P05ImplementationWorkflowSliceCaseSet(input);
  return freezeCp494Result({
    descriptor: "GovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP494_PACK_BINDING,
    source_p04_closeout_p05_foundation_descriptor: upstreamDescriptor.descriptor,
    p05_implementation_workflow_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP494_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-494",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP494_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP494_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-494.governance_core_p05_implementation_workflow_slice_descriptor",
      gate: GOVERNANCE_CORE_CP494_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p05_implementation_workflow_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-494.governance_core_p05_implementation_workflow_slice_descriptor",
      gate: GOVERNANCE_CORE_CP494_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP494_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP494_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP494_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP494_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP494_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P05.M05.S03 onward with the remaining permission and audit binding rows while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp495Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP495_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_implementation_workflow_slice_pack_id: GOVERNANCE_CORE_CP495_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP495_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP494_ROW_EXTRAS,
});

export function createGovernanceCoreCp495P05PermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp494P05ImplementationWorkflowSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP495_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP495_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP495_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp495Result({
    case_set_id: "governance-core-cp495-p05-permission-slice-case-set",
    source_p05_implementation_workflow_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp495P05PermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp495P05PermissionSliceCaseSet(input);
  return freezeCp495Result({
    descriptor: "GovernanceCoreCp495P05PermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP495_PACK_BINDING,
    source_p05_implementation_workflow_slice_descriptor: upstreamDescriptor.descriptor,
    p05_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP495_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-495",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP495_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP495_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-495.governance_core_p05_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP495_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p05_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-495.governance_core_p05_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP495_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP495_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP495_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP495_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP495_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP495_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P05.M05.S13 onward with the remaining permission and audit binding rows while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp496Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP496_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_permission_slice_pack_id: GOVERNANCE_CORE_CP496_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP496_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP495_ROW_EXTRAS,
});

export function createGovernanceCoreCp496P05AuditBindingSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp495P05PermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP496_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP496_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP496_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp496Result({
    case_set_id: "governance-core-cp496-p05-audit-binding-slice-case-set",
    source_p05_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp496P05AuditBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp495P05PermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp496P05AuditBindingSliceCaseSet(input);
  return freezeCp496Result({
    descriptor: "GovernanceCoreCp496P05AuditBindingSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP496_PACK_BINDING,
    source_p05_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p05_audit_binding_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP496_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-496",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP496_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP496_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-496.governance_core_p05_audit_binding_slice_descriptor",
      gate: GOVERNANCE_CORE_CP496_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p05_audit_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-496.governance_core_p05_audit_binding_slice_descriptor",
      gate: GOVERNANCE_CORE_CP496_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP496_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP496_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP496_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP496_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP496_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P05.M06.S01 onward with the synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp497Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP497_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_audit_binding_slice_pack_id: GOVERNANCE_CORE_CP497_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP497_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP496_ROW_EXTRAS,
});

export function createGovernanceCoreCp497P05FixtureSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp496P05AuditBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP497_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP497_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP497_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp497Result({
    case_set_id: "governance-core-cp497-p05-fixture-slice-case-set",
    source_p05_audit_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp497P05FixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp496P05AuditBindingSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp497P05FixtureSliceCaseSet(input);
  return freezeCp497Result({
    descriptor: "GovernanceCoreCp497P05FixtureSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP497_PACK_BINDING,
    source_p05_audit_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p05_fixture_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP497_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-497",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP497_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP497_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-497.governance_core_p05_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP497_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p05_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-497.governance_core_p05_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP497_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP497_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP497_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP497_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP497_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP497_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P05.M06.S11 onward with the remaining synthetic fixture rows while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp498Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP498_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_fixture_slice_pack_id: GOVERNANCE_CORE_CP498_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP498_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP497_ROW_EXTRAS,
});

export function createGovernanceCoreCp498P05SyntheticFixtureSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp497P05FixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP498_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP498_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP498_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp498Result({
    case_set_id: "governance-core-cp498-p05-synthetic-fixture-slice-case-set",
    source_p05_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp497P05FixtureSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp498P05SyntheticFixtureSliceCaseSet(input);
  return freezeCp498Result({
    descriptor: "GovernanceCoreCp498P05SyntheticFixtureSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP498_PACK_BINDING,
    source_p05_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p05_synthetic_fixture_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP498_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-498",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP498_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP498_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-498.governance_core_p05_synthetic_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP498_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p05_synthetic_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-498.governance_core_p05_synthetic_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP498_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP498_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP498_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP498_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP498_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP498_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P05.M06.S21 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp499Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP499_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_synthetic_fixture_slice_pack_id: GOVERNANCE_CORE_CP499_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP499_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP498_ROW_EXTRAS,
});

export function createGovernanceCoreCp499P05CloseoutP06FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp498P05SyntheticFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP499_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP499_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP499_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp499Result({
    case_set_id: "governance-core-cp499-p05-closeout-p06-foundation-case-set",
    source_p05_synthetic_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp499P05CloseoutP06FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp499P05CloseoutP06FoundationCaseSet(input);
  return freezeCp499Result({
    descriptor: "GovernanceCoreCp499P05CloseoutP06FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP499_PACK_BINDING,
    source_p05_synthetic_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p05_closeout_p06_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP499_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-499",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP499_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP499_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-499.governance_core_p05_closeout_p06_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP499_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p05_closeout_p06_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-499.governance_core_p05_closeout_p06_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP499_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP499_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP499_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP499_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP499_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP499_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P06.M03.S11 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp500Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP500_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_closeout_p06_foundation_pack_id: GOVERNANCE_CORE_CP500_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP500_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP499_ROW_EXTRAS,
});

export function createGovernanceCoreCp500P06ImplementationWorkflowSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp499P05CloseoutP06FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP500_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP500_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP500_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp500Result({
    case_set_id: "governance-core-cp500-p06-implementation-workflow-slice-case-set",
    source_p05_closeout_p06_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp499P05CloseoutP06FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp500P06ImplementationWorkflowSliceCaseSet(input);
  return freezeCp500Result({
    descriptor: "GovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP500_PACK_BINDING,
    source_p05_closeout_p06_foundation_descriptor: upstreamDescriptor.descriptor,
    p06_implementation_workflow_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP500_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-500",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP500_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP500_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-500.governance_core_p06_implementation_workflow_slice_descriptor",
      gate: GOVERNANCE_CORE_CP500_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p06_implementation_workflow_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-500.governance_core_p06_implementation_workflow_slice_descriptor",
      gate: GOVERNANCE_CORE_CP500_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP500_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP500_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP500_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP500_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP500_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P06.M05.S07 onward with the remaining permission and audit binding rows while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp501Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP501_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_implementation_workflow_slice_pack_id: GOVERNANCE_CORE_CP501_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP501_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP500_ROW_EXTRAS,
});

export function createGovernanceCoreCp501P06PermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp500P06ImplementationWorkflowSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP501_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP501_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP501_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp501Result({
    case_set_id: "governance-core-cp501-p06-permission-slice-case-set",
    source_p06_implementation_workflow_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp501P06PermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp501P06PermissionSliceCaseSet(input);
  return freezeCp501Result({
    descriptor: "GovernanceCoreCp501P06PermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP501_PACK_BINDING,
    source_p06_implementation_workflow_slice_descriptor: upstreamDescriptor.descriptor,
    p06_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP501_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-501",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP501_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP501_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-501.governance_core_p06_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP501_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p06_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-501.governance_core_p06_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP501_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP501_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP501_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP501_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP501_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP501_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P06.M05.S17 onward with the remaining permission and audit binding rows and the synthetic fixture micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp502Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP502_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_permission_slice_pack_id: GOVERNANCE_CORE_CP502_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP502_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP501_ROW_EXTRAS,
});

export function createGovernanceCoreCp502P06PermissionFixtureSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp501P06PermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP502_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP502_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP502_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp502Result({
    case_set_id: "governance-core-cp502-p06-permission-fixture-slice-case-set",
    source_p06_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp502P06PermissionFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp501P06PermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp502P06PermissionFixtureSliceCaseSet(input);
  return freezeCp502Result({
    descriptor: "GovernanceCoreCp502P06PermissionFixtureSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP502_PACK_BINDING,
    source_p06_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p06_permission_fixture_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP502_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-502",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP502_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP502_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-502.governance_core_p06_permission_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP502_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p06_permission_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-502.governance_core_p06_permission_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP502_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP502_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP502_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP502_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP502_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP502_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P06.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp503Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP503_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_permission_fixture_slice_pack_id: GOVERNANCE_CORE_CP503_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP503_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP502_ROW_EXTRAS,
});

export function createGovernanceCoreCp503P06CloseoutP07FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp502P06PermissionFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP503_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP503_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP503_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp503Result({
    case_set_id: "governance-core-cp503-p06-closeout-p07-foundation-case-set",
    source_p06_permission_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp503P06CloseoutP07FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp502P06PermissionFixtureSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp503P06CloseoutP07FoundationCaseSet(input);
  return freezeCp503Result({
    descriptor: "GovernanceCoreCp503P06CloseoutP07FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP503_PACK_BINDING,
    source_p06_permission_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p06_closeout_p07_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP503_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-503",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP503_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP503_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-503.governance_core_p06_closeout_p07_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP503_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p06_closeout_p07_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-503.governance_core_p06_closeout_p07_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP503_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP503_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP503_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP503_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP503_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP503_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P07.M02.S07 onward with the remaining type and shape rows while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp504Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP504_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_closeout_p07_foundation_pack_id: GOVERNANCE_CORE_CP504_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP504_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP503_ROW_EXTRAS,
});

export function createGovernanceCoreCp504P07FoundationSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp503P06CloseoutP07FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP504_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP504_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP504_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp504Result({
    case_set_id: "governance-core-cp504-p07-foundation-slice-case-set",
    source_p06_closeout_p07_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp504P07FoundationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp503P06CloseoutP07FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp504P07FoundationSliceCaseSet(input);
  return freezeCp504Result({
    descriptor: "GovernanceCoreCp504P07FoundationSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP504_PACK_BINDING,
    source_p06_closeout_p07_foundation_descriptor: upstreamDescriptor.descriptor,
    p07_foundation_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP504_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-504",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP504_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP504_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-504.governance_core_p07_foundation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP504_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p07_foundation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-504.governance_core_p07_foundation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP504_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP504_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP504_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP504_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP504_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP504_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P07.M02.S17 onward with the remaining type and shape rows and the primary implementation micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp505Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP505_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_foundation_slice_pack_id: GOVERNANCE_CORE_CP505_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP505_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP504_ROW_EXTRAS,
});

export function createGovernanceCoreCp505P07ImplementationSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp504P07FoundationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP505_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP505_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP505_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp505Result({
    case_set_id: "governance-core-cp505-p07-implementation-slice-case-set",
    source_p07_foundation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp505P07ImplementationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp504P07FoundationSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp505P07ImplementationSliceCaseSet(input);
  return freezeCp505Result({
    descriptor: "GovernanceCoreCp505P07ImplementationSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP505_PACK_BINDING,
    source_p07_foundation_slice_descriptor: upstreamDescriptor.descriptor,
    p07_implementation_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP505_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-505",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP505_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP505_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-505.governance_core_p07_implementation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP505_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p07_implementation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-505.governance_core_p07_implementation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP505_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP505_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP505_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP505_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP505_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP505_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P07.M04.S13 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp506Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP506_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_implementation_slice_pack_id: GOVERNANCE_CORE_CP506_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP506_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP505_ROW_EXTRAS,
});

export function createGovernanceCoreCp506P07WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp505P07ImplementationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP506_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP506_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP506_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp506Result({
    case_set_id: "governance-core-cp506-p07-workflow-permission-slice-case-set",
    source_p07_implementation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp505P07ImplementationSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp506P07WorkflowPermissionSliceCaseSet(input);
  return freezeCp506Result({
    descriptor: "GovernanceCoreCp506P07WorkflowPermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP506_PACK_BINDING,
    source_p07_implementation_slice_descriptor: upstreamDescriptor.descriptor,
    p07_workflow_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP506_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-506",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP506_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP506_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-506.governance_core_p07_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP506_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p07_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-506.governance_core_p07_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP506_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP506_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP506_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP506_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP506_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP506_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P07.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp507Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP507_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_workflow_permission_slice_pack_id: GOVERNANCE_CORE_CP507_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP507_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP506_ROW_EXTRAS,
});

export function createGovernanceCoreCp507P07CloseoutP08FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp506P07WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP507_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP507_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP507_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp507Result({
    case_set_id: "governance-core-cp507-p07-closeout-p08-foundation-case-set",
    source_p07_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp507P07CloseoutP08FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp507P07CloseoutP08FoundationCaseSet(input);
  return freezeCp507Result({
    descriptor: "GovernanceCoreCp507P07CloseoutP08FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP507_PACK_BINDING,
    source_p07_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p07_closeout_p08_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP507_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-507",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP507_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP507_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-507.governance_core_p07_closeout_p08_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP507_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p07_closeout_p08_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-507.governance_core_p07_closeout_p08_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP507_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP507_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP507_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP507_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP507_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP507_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P08.M03.S01 onward with the primary implementation rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp508Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP508_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_closeout_p08_foundation_pack_id: GOVERNANCE_CORE_CP508_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP508_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP507_ROW_EXTRAS,
});

export function createGovernanceCoreCp508P08ImplementationSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp507P07CloseoutP08FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP508_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP508_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP508_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp508Result({
    case_set_id: "governance-core-cp508-p08-implementation-slice-case-set",
    source_p07_closeout_p08_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp508P08ImplementationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp507P07CloseoutP08FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp508P08ImplementationSliceCaseSet(input);
  return freezeCp508Result({
    descriptor: "GovernanceCoreCp508P08ImplementationSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP508_PACK_BINDING,
    source_p07_closeout_p08_foundation_descriptor: upstreamDescriptor.descriptor,
    p08_implementation_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP508_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-508",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP508_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP508_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-508.governance_core_p08_implementation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP508_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p08_implementation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-508.governance_core_p08_implementation_slice_descriptor",
      gate: GOVERNANCE_CORE_CP508_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP508_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP508_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP508_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP508_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP508_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P08.M04.S19 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp509Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP509_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_implementation_slice_pack_id: GOVERNANCE_CORE_CP509_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP509_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP508_ROW_EXTRAS,
});

export function createGovernanceCoreCp509P08WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp508P08ImplementationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP509_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP509_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP509_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp509Result({
    case_set_id: "governance-core-cp509-p08-workflow-permission-slice-case-set",
    source_p08_implementation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp508P08ImplementationSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp509P08WorkflowPermissionSliceCaseSet(input);
  return freezeCp509Result({
    descriptor: "GovernanceCoreCp509P08WorkflowPermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP509_PACK_BINDING,
    source_p08_implementation_slice_descriptor: upstreamDescriptor.descriptor,
    p08_workflow_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP509_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-509",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP509_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP509_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-509.governance_core_p08_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP509_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p08_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-509.governance_core_p08_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP509_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP509_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP509_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP509_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP509_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP509_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P08.M06.S15 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp510Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP510_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_workflow_permission_slice_pack_id: GOVERNANCE_CORE_CP510_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP510_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP509_ROW_EXTRAS,
});

export function createGovernanceCoreCp510P08CloseoutP09FoundationCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp509P08WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP510_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP510_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP510_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp510Result({
    case_set_id: "governance-core-cp510-p08-closeout-p09-foundation-case-set",
    source_p08_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp510P08CloseoutP09FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp510P08CloseoutP09FoundationCaseSet(input);
  return freezeCp510Result({
    descriptor: "GovernanceCoreCp510P08CloseoutP09FoundationDescriptor",
    pack_binding: GOVERNANCE_CORE_CP510_PACK_BINDING,
    source_p08_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p08_closeout_p09_foundation_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP510_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-510",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP510_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP510_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-510.governance_core_p08_closeout_p09_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP510_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p08_closeout_p09_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-510.governance_core_p08_closeout_p09_foundation_descriptor",
      gate: GOVERNANCE_CORE_CP510_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP510_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP510_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP510_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP510_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP510_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P09.M04.S05 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp511Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP511_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_closeout_p09_foundation_pack_id: GOVERNANCE_CORE_CP511_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP511_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP510_ROW_EXTRAS,
});

export function createGovernanceCoreCp511P09WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp510P08CloseoutP09FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP511_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP511_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP511_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp511Result({
    case_set_id: "governance-core-cp511-p09-workflow-permission-slice-case-set",
    source_p08_closeout_p09_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp510P08CloseoutP09FoundationDescriptor(input);
  const caseSet = createGovernanceCoreCp511P09WorkflowPermissionSliceCaseSet(input);
  return freezeCp511Result({
    descriptor: "GovernanceCoreCp511P09WorkflowPermissionSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP511_PACK_BINDING,
    source_p08_closeout_p09_foundation_descriptor: upstreamDescriptor.descriptor,
    p09_workflow_permission_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP511_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-511",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP511_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP511_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-511.governance_core_p09_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP511_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p09_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-511.governance_core_p09_workflow_permission_slice_descriptor",
      gate: GOVERNANCE_CORE_CP511_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP511_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP511_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP511_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP511_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP511_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P09.M06.S03 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp512Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP512_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p09_workflow_permission_slice_pack_id: GOVERNANCE_CORE_CP512_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP512_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP511_ROW_EXTRAS,
});

export function createGovernanceCoreCp512P09FixtureSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp511P09WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP512_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP512_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP512_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp512Result({
    case_set_id: "governance-core-cp512-p09-fixture-slice-case-set",
    source_p09_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp512P09FixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp512P09FixtureSliceCaseSet(input);
  return freezeCp512Result({
    descriptor: "GovernanceCoreCp512P09FixtureSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP512_PACK_BINDING,
    source_p09_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p09_fixture_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP512_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-512",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP512_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP512_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-512.governance_core_p09_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP512_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p09_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-512.governance_core_p09_fixture_slice_descriptor",
      gate: GOVERNANCE_CORE_CP512_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP512_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP512_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP512_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP512_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP512_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP16.P09.M06.S13 onward with the remaining synthetic fixture rows and the closeout micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp513Result(result) {
  return Object.freeze({
    ...result,
    pack_id: GOVERNANCE_CORE_CP513_PACK_BINDING.pack_id,
    program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
    source_p09_fixture_slice_pack_id: GOVERNANCE_CORE_CP513_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_governance_runtime: false,
    dispatches_dlp_runtime: false,
    dispatches_retention_runtime: false,
    dispatches_legal_hold_runtime: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION,
  });
}

const GOVERNANCE_CORE_CP513_ROW_EXTRAS = Object.freeze({
  ...GOVERNANCE_CORE_CP512_ROW_EXTRAS,
});

export function createGovernanceCoreCp513P09CloseoutHandoffSliceCaseSet(input = {}) {
  const upstream = createGovernanceCoreCp512P09FixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP513_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = governanceCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(GOVERNANCE_CORE_CP513_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: GOVERNANCE_CORE_CP513_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => governanceCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp513Result({
    case_set_id: "governance-core-cp513-p09-closeout-handoff-slice-case-set",
    source_p09_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor(input = {}) {
  const upstreamDescriptor = createGovernanceCoreCp512P09FixtureSliceDescriptor(input);
  const caseSet = createGovernanceCoreCp513P09CloseoutHandoffSliceCaseSet(input);
  return freezeCp513Result({
    descriptor: "GovernanceCoreCp513P09CloseoutHandoffSliceDescriptor",
    pack_binding: GOVERNANCE_CORE_CP513_PACK_BINDING,
    source_p09_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p09_closeout_handoff_slice_case_set: caseSet,
    public_exports: GOVERNANCE_CORE_CP513_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/governance/README.md#cp00-513",
    index_export_check: true,
    no_leak_guards: GOVERNANCE_CORE_CP513_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: GOVERNANCE_CORE_CP513_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H16.CP00-513.governance_core_p09_closeout_handoff_slice_descriptor",
      gate: GOVERNANCE_CORE_CP513_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_governance_p09_closeout_handoff_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C16.CP00-513.governance_core_p09_closeout_handoff_slice_descriptor",
      gate: GOVERNANCE_CORE_CP513_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: GOVERNANCE_CORE_CP513_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: GOVERNANCE_CORE_CP513_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: GOVERNANCE_CORE_CP513_PACK_BINDING.pack_id,
      to_pack_id: GOVERNANCE_CORE_CP513_PACK_BINDING.next_pack_id,
      next_subphase_id: GOVERNANCE_CORE_CP513_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP17.P00.M00.S01 onward with the RP17 AI Governance scope inventory micros while preserving descriptor-only governance boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}
