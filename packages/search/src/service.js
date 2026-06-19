import {
  SEARCH_CORE_CP235_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP235_PACK_BINDING,
  SEARCH_CORE_CP235_REQUIREMENTS,
  SEARCH_CORE_CP236_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP236_PACK_BINDING,
  SEARCH_CORE_CP236_REQUIREMENTS,
  SEARCH_CORE_CP237_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP237_PACK_BINDING,
  SEARCH_CORE_CP237_REQUIREMENTS,
  SEARCH_CORE_CP238_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP238_PACK_BINDING,
  SEARCH_CORE_CP238_REQUIREMENTS,
  SEARCH_CORE_CP239_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP239_PACK_BINDING,
  SEARCH_CORE_CP239_REQUIREMENTS,
  SEARCH_CORE_CP240_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP240_PACK_BINDING,
  SEARCH_CORE_CP240_REQUIREMENTS,
  SEARCH_CORE_CP241_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP241_PACK_BINDING,
  SEARCH_CORE_CP241_REQUIREMENTS,
  SEARCH_CORE_CP242_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP242_PACK_BINDING,
  SEARCH_CORE_CP242_REQUIREMENTS,
  SEARCH_CORE_CP243_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP243_PACK_BINDING,
  SEARCH_CORE_CP243_REQUIREMENTS,
  SEARCH_CORE_CP244_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP244_PACK_BINDING,
  SEARCH_CORE_CP244_REQUIREMENTS,
  SEARCH_CORE_CP245_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP245_PACK_BINDING,
  SEARCH_CORE_CP245_REQUIREMENTS,
  SEARCH_CORE_CP246_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP246_PACK_BINDING,
  SEARCH_CORE_CP246_REQUIREMENTS,
  SEARCH_CORE_CP247_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP247_PACK_BINDING,
  SEARCH_CORE_CP247_REQUIREMENTS,
  SEARCH_CORE_CP248_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP248_PACK_BINDING,
  SEARCH_CORE_CP248_REQUIREMENTS,
  SEARCH_CORE_CP249_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP249_PACK_BINDING,
  SEARCH_CORE_CP249_REQUIREMENTS,
  SEARCH_CORE_CP250_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP250_PACK_BINDING,
  SEARCH_CORE_CP250_REQUIREMENTS,
  SEARCH_CORE_CP251_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP251_PACK_BINDING,
  SEARCH_CORE_CP251_REQUIREMENTS,
  SEARCH_CORE_CP252_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP252_PACK_BINDING,
  SEARCH_CORE_CP252_REQUIREMENTS,
  SEARCH_CORE_CP253_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP253_PACK_BINDING,
  SEARCH_CORE_CP253_REQUIREMENTS,
  SEARCH_CORE_CP254_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP254_PACK_BINDING,
  SEARCH_CORE_CP254_REQUIREMENTS,
  SEARCH_CORE_CP255_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP255_PACK_BINDING,
  SEARCH_CORE_CP255_REQUIREMENTS,
  SEARCH_CORE_CP256_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP256_PACK_BINDING,
  SEARCH_CORE_CP256_REQUIREMENTS,
  SEARCH_CORE_CP257_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP257_PACK_BINDING,
  SEARCH_CORE_CP257_REQUIREMENTS,
  SEARCH_CORE_CP258_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP258_PACK_BINDING,
  SEARCH_CORE_CP258_REQUIREMENTS,
  SEARCH_CORE_CP259_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP259_PACK_BINDING,
  SEARCH_CORE_CP259_REQUIREMENTS,
  SEARCH_CORE_CP260_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP260_PACK_BINDING,
  SEARCH_CORE_CP260_REQUIREMENTS,
  SEARCH_CORE_CP261_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP261_PACK_BINDING,
  SEARCH_CORE_CP261_REQUIREMENTS,
  SEARCH_CORE_CP262_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP262_PACK_BINDING,
  SEARCH_CORE_CP262_REQUIREMENTS,
  SEARCH_CORE_CP263_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP263_PACK_BINDING,
  SEARCH_CORE_CP263_REQUIREMENTS,
  SEARCH_CORE_CP264_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP264_PACK_BINDING,
  SEARCH_CORE_CP264_REQUIREMENTS,
  SEARCH_CORE_CP265_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP265_PACK_BINDING,
  SEARCH_CORE_CP265_REQUIREMENTS,
  SEARCH_CORE_CP266_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP266_PACK_BINDING,
  SEARCH_CORE_CP266_REQUIREMENTS,
  SEARCH_CORE_CP267_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP267_PACK_BINDING,
  SEARCH_CORE_CP267_REQUIREMENTS,
  SEARCH_CORE_CP268_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP268_PACK_BINDING,
  SEARCH_CORE_CP268_REQUIREMENTS,
  SEARCH_CORE_CP269_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP269_PACK_BINDING,
  SEARCH_CORE_CP269_REQUIREMENTS,
  SEARCH_CORE_CP270_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP270_PACK_BINDING,
  SEARCH_CORE_CP270_REQUIREMENTS,
  SEARCH_CORE_CP271_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP271_PACK_BINDING,
  SEARCH_CORE_CP271_REQUIREMENTS,
  SEARCH_CORE_PROGRAM_CONTRACT,
} from "./registry.js";

export function searchCoreRowKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function freezeCp235Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP235_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_dms_core_pack_id: SEARCH_CORE_CP235_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
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
    no_write_attestation: SEARCH_CORE_CP235_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP235_ROW_EXTRAS = Object.freeze({
  scope_inventory: Object.freeze({
    scope_descriptor_only: true,
    program_scope: SEARCH_CORE_PROGRAM_CONTRACT.program_scope,
  }),
  acceptance_gate_definition: Object.freeze({
    hermes_gate: SEARCH_CORE_CP235_PACK_BINDING.hermes_gate,
    claude_gate: SEARCH_CORE_CP235_PACK_BINDING.claude_gate,
  }),
  non_goal_boundary: Object.freeze({
    search_runtime_opened: false,
    ocr_runtime_opened: false,
    index_runtime_opened: false,
    embedding_runtime_opened: false,
  }),
  target_file_map: Object.freeze({
    target_package: "packages/search",
    target_contract: "contracts/search-core-contract.json",
    target_validator: "scripts/validate-rp07-search-core-contract.mjs",
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
  blocked_claim_rule: Object.freeze({
    blocked_claim_detail_included: false,
    customer_safe_error_code: "SEARCH_BLOCKED_CLAIM",
  }),
  hermes_preflight_fields: Object.freeze({
    emits_hermes_runtime_receipt: false,
    hermes_packet_body_included: false,
  }),
  claude_review_prompts: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_approval_note: Object.freeze({ human_approval_route_required_before_runtime: true }),
  closeout_handoff: Object.freeze({ handoff_descriptor_only: true }),
  dependency_list: Object.freeze({
    dependency_descriptor_only: true,
    upstream_program_id: SEARCH_CORE_PROGRAM_CONTRACT.upstream_program_id,
  }),
  downstream_rp_routing: Object.freeze({ downstream_routing_descriptor_only: true }),
  command_matrix: Object.freeze({ executes_command_runtime: false }),
  receipt_shape: Object.freeze({ receipt_shape_descriptor_only: true }),
  package_directory_layout: Object.freeze({ package_path: "packages/search" }),
  primary_entity_identifier: Object.freeze({ identifier_descriptor_only: true }),
  tenant_scope_field: Object.freeze({ cross_tenant_access_allowed: false }),
  matter_trace_reference: Object.freeze({ matter_trace_required: true }),
  lifecycle_status_enum: Object.freeze({ lifecycle_descriptor_only: true }),
  ownership_metadata: Object.freeze({ ownership_descriptor_only: true }),
  reference_relationship_map: Object.freeze({ relationship_descriptor_only: true }),
  required_field_registry: Object.freeze({ registry_descriptor_only: true }),
  optional_field_registry: Object.freeze({ registry_descriptor_only: true }),
  state_transition_map: Object.freeze({ writes_state_transition: false }),
});

export function createSearchCoreCp235ScopeContractFoundationCaseSet(input = {}) {
  void input;
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP235_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP235_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp235Result({
    case_set_id: "search-core-cp235-scope-contract-foundation-case-set",
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp235ScopeContractFoundationDescriptor(input = {}) {
  const caseSet = createSearchCoreCp235ScopeContractFoundationCaseSet(input);
  return freezeCp235Result({
    descriptor: "SearchCoreCp235ScopeContractFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP235_PACK_BINDING,
    program_contract: SEARCH_CORE_PROGRAM_CONTRACT,
    scope_contract_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP235_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-235",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP235_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP235_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-235.search_core_scope_contract_foundation_descriptor",
      gate: SEARCH_CORE_CP235_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_scope_contract_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-235.search_core_scope_contract_foundation_descriptor",
      gate: SEARCH_CORE_CP235_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP235_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP235_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP235_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP235_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP235_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P01.M02.S09 onward with the remaining model/storage foundation rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp236Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP236_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_scope_contract_foundation_pack_id: SEARCH_CORE_CP236_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
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
    ownership_drift_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP236_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP236_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP235_ROW_EXTRAS,
  validation_helper: Object.freeze({ validation_descriptor_only: true, validation_error_detail_included: false }),
  fixture_model: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  serialization_shape: Object.freeze({ serialization_descriptor_only: true }),
  public_export: Object.freeze({ index_export_check: true }),
  model_unit_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  invalid_reference_test: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  ownership_drift_test: Object.freeze({ ownership_drift_detected: false }),
  hermes_model_summary: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_model_review_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  documentation_entry: Object.freeze({ documentation_entry: "packages/search/README.md#cp00-236" }),
  index_export_check: Object.freeze({ index_export_check: true }),
});

export function createSearchCoreCp236ModelStorageSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp235ScopeContractFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP236_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP236_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp236Result({
    case_set_id: "search-core-cp236-model-storage-slice-case-set",
    source_scope_contract_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp236ModelStorageSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp235ScopeContractFoundationDescriptor(input);
  const caseSet = createSearchCoreCp236ModelStorageSliceCaseSet(input);
  return freezeCp236Result({
    descriptor: "SearchCoreCp236ModelStorageSliceDescriptor",
    pack_binding: SEARCH_CORE_CP236_PACK_BINDING,
    source_scope_contract_foundation_descriptor: upstreamDescriptor.descriptor,
    model_storage_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP236_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-236",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP236_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP236_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-236.search_core_model_storage_slice_descriptor",
      gate: SEARCH_CORE_CP236_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_model_storage_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-236.search_core_model_storage_slice_descriptor",
      gate: SEARCH_CORE_CP236_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP236_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP236_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP236_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP236_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP236_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P01.M04.S07 onward with the remaining model/storage rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp237Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP237_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_model_storage_slice_pack_id: SEARCH_CORE_CP237_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
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
    ownership_drift_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP237_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP237_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP236_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/search/README.md#cp00-237" }),
});

export function createSearchCoreCp237ModelBindingSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp236ModelStorageSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP237_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP237_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp237Result({
    case_set_id: "search-core-cp237-model-binding-slice-case-set",
    source_model_storage_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp237ModelBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp236ModelStorageSliceDescriptor(input);
  const caseSet = createSearchCoreCp237ModelBindingSliceCaseSet(input);
  return freezeCp237Result({
    descriptor: "SearchCoreCp237ModelBindingSliceDescriptor",
    pack_binding: SEARCH_CORE_CP237_PACK_BINDING,
    source_model_storage_slice_descriptor: upstreamDescriptor.descriptor,
    model_binding_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP237_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-237",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP237_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP237_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-237.search_core_model_binding_slice_descriptor",
      gate: SEARCH_CORE_CP237_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_model_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-237.search_core_model_binding_slice_descriptor",
      gate: SEARCH_CORE_CP237_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP237_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP237_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP237_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP237_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP237_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P01.M06.S05 onward with the remaining model fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp238Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP238_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_model_binding_slice_pack_id: SEARCH_CORE_CP238_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    ownership_drift_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP238_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP238_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP237_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/search/README.md#cp00-238" }),
  service_entrypoint_contract: Object.freeze({ dispatches_search_runtime: false, permission_runtime_evaluated: false }),
  request_normalization: Object.freeze({ raw_payload_included: false }),
  tenant_boundary_precheck: Object.freeze({ cross_tenant_access_allowed: false }),
  matter_trace_precheck: Object.freeze({ matter_trace_required: true }),
  permission_precheck: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  audit_hint_precheck: Object.freeze({ audit_hint_detail_included: false, audit_event_body_included: false }),
  primary_happy_path: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  secondary_workflow_path: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  state_transition_enforcement: Object.freeze({ writes_state_transition: false }),
  idempotency_key_handling: Object.freeze({ persists_idempotency_key: false }),
  lock_acquisition_rule: Object.freeze({ acquires_runtime_lock: false, lock_token_included: false }),
  persistence_boundary: Object.freeze({ creates_database_rows: false, updates_database_rows: false }),
  validation_error_mapping: Object.freeze({ validation_error_detail_included: false, customer_safe_errors_only: true }),
  review_required_routing: Object.freeze({ dispatches_review_route_runtime: false }),
  approval_required_routing: Object.freeze({ dispatches_approval_route_runtime: false }),
  blocked_claim_output: Object.freeze({ blocked_claim_detail_included: false, customer_safe_error_code: "SEARCH_BLOCKED_CLAIM" }),
  rollback_behavior: Object.freeze({ performs_rollback_runtime: false }),
  retry_behavior: Object.freeze({ performs_retry_runtime: false }),
  unit_test_happy_path: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "allowed_descriptor_only" }),
  unit_test_denied_path: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "denied_customer_safe" }),
  unit_test_review_path: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "review_required" }),
  integration_smoke_case: Object.freeze({ dispatches_integration_smoke_runtime: false }),
});

export function createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp237ModelBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP238_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP238_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp238Result({
    case_set_id: "search-core-cp238-p01-closeout-p02-service-foundation-case-set",
    source_model_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp237ModelBindingSliceDescriptor(input);
  const caseSet = createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet(input);
  return freezeCp238Result({
    descriptor: "SearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP238_PACK_BINDING,
    source_model_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p01_closeout_p02_service_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP238_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-238",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP238_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP238_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-238.search_core_p01_closeout_p02_service_foundation_descriptor",
      gate: SEARCH_CORE_CP238_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p01_closeout_p02_service_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-238.search_core_p01_closeout_p02_service_foundation_descriptor",
      gate: SEARCH_CORE_CP238_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP238_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP238_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP238_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP238_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP238_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P01 descriptor scope is closed; continue RP07.P02.M03.S01 onward with the remaining service rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp239Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP239_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p01_closeout_p02_service_foundation_pack_id: SEARCH_CORE_CP239_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    ownership_drift_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP239_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP239_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP238_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/search/README.md#cp00-239" }),
  golden_fixture_binding: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  hermes_service_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_service_review_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
});

export function createSearchCoreCp239ServiceSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP239_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp239Result({
    case_set_id: "search-core-cp239-service-slice-case-set",
    source_p01_closeout_p02_service_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp239ServiceSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(input);
  const caseSet = createSearchCoreCp239ServiceSliceCaseSet(input);
  return freezeCp239Result({
    descriptor: "SearchCoreCp239ServiceSliceDescriptor",
    pack_binding: SEARCH_CORE_CP239_PACK_BINDING,
    source_p01_closeout_p02_service_foundation_descriptor: upstreamDescriptor.descriptor,
    service_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP239_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-239",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP239_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP239_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-239.search_core_service_slice_descriptor",
      gate: SEARCH_CORE_CP239_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-239.search_core_service_slice_descriptor",
      gate: SEARCH_CORE_CP239_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP239_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP239_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP239_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP239_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP239_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M04.S16 onward with the remaining service rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp240Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP240_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_slice_pack_id: SEARCH_CORE_CP240_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP240_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp240ServiceWorkflowTailCaseSet(input = {}) {
  const upstream = createSearchCoreCp239ServiceSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP240_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp240Result({
    case_set_id: "search-core-cp240-service-workflow-tail-case-set",
    source_service_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp240ServiceWorkflowTailDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp239ServiceSliceDescriptor(input);
  const caseSet = createSearchCoreCp240ServiceWorkflowTailCaseSet(input);
  return freezeCp240Result({
    descriptor: "SearchCoreCp240ServiceWorkflowTailDescriptor",
    pack_binding: SEARCH_CORE_CP240_PACK_BINDING,
    source_service_slice_descriptor: upstreamDescriptor.descriptor,
    service_workflow_tail_case_set: caseSet,
    public_exports: SEARCH_CORE_CP240_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-240",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP240_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP240_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-240.search_core_service_workflow_tail_descriptor",
      gate: SEARCH_CORE_CP240_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_workflow_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-240.search_core_service_workflow_tail_descriptor",
      gate: SEARCH_CORE_CP240_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP240_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP240_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP240_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP240_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M05.S01 onward with the remaining service binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp241Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP241_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_workflow_tail_pack_id: SEARCH_CORE_CP241_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP241_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP241_ROW_EXTRAS = SEARCH_CORE_CP239_ROW_EXTRAS;

export function createSearchCoreCp241ServiceAuditBindingCaseSet(input = {}) {
  const upstream = createSearchCoreCp240ServiceWorkflowTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP241_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP241_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp241Result({
    case_set_id: "search-core-cp241-service-audit-binding-case-set",
    source_service_workflow_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp241ServiceAuditBindingDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp240ServiceWorkflowTailDescriptor(input);
  const caseSet = createSearchCoreCp241ServiceAuditBindingCaseSet(input);
  return freezeCp241Result({
    descriptor: "SearchCoreCp241ServiceAuditBindingDescriptor",
    pack_binding: SEARCH_CORE_CP241_PACK_BINDING,
    source_service_workflow_tail_descriptor: upstreamDescriptor.descriptor,
    service_audit_binding_case_set: caseSet,
    public_exports: SEARCH_CORE_CP241_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-241",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP241_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP241_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-241.search_core_service_audit_binding_descriptor",
      gate: SEARCH_CORE_CP241_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_audit_binding_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-241.search_core_service_audit_binding_descriptor",
      gate: SEARCH_CORE_CP241_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP241_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP241_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP241_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP241_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M05.S11 onward with the remaining service binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp242Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP242_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_audit_binding_pack_id: SEARCH_CORE_CP242_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_blocked_claim_detail: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP242_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp242ServiceBindingMidCaseSet(input = {}) {
  const upstream = createSearchCoreCp241ServiceAuditBindingCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP242_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp242Result({
    case_set_id: "search-core-cp242-service-binding-mid-case-set",
    source_service_audit_binding_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp242ServiceBindingMidDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp241ServiceAuditBindingDescriptor(input);
  const caseSet = createSearchCoreCp242ServiceBindingMidCaseSet(input);
  return freezeCp242Result({
    descriptor: "SearchCoreCp242ServiceBindingMidDescriptor",
    pack_binding: SEARCH_CORE_CP242_PACK_BINDING,
    source_service_audit_binding_descriptor: upstreamDescriptor.descriptor,
    service_binding_mid_case_set: caseSet,
    public_exports: SEARCH_CORE_CP242_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-242",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP242_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP242_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-242.search_core_service_binding_mid_descriptor",
      gate: SEARCH_CORE_CP242_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_binding_mid_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-242.search_core_service_binding_mid_descriptor",
      gate: SEARCH_CORE_CP242_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP242_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP242_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP242_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP242_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M05.S21 onward with the remaining service binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp243Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP243_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_binding_mid_pack_id: SEARCH_CORE_CP243_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP243_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp243ServiceFixtureHeadCaseSet(input = {}) {
  const upstream = createSearchCoreCp242ServiceBindingMidCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP243_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp243Result({
    case_set_id: "search-core-cp243-service-fixture-head-case-set",
    source_service_binding_mid_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp243ServiceFixtureHeadDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp242ServiceBindingMidDescriptor(input);
  const caseSet = createSearchCoreCp243ServiceFixtureHeadCaseSet(input);
  return freezeCp243Result({
    descriptor: "SearchCoreCp243ServiceFixtureHeadDescriptor",
    pack_binding: SEARCH_CORE_CP243_PACK_BINDING,
    source_service_binding_mid_descriptor: upstreamDescriptor.descriptor,
    service_fixture_head_case_set: caseSet,
    public_exports: SEARCH_CORE_CP243_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-243",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP243_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP243_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-243.search_core_service_fixture_head_descriptor",
      gate: SEARCH_CORE_CP243_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_fixture_head_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-243.search_core_service_fixture_head_descriptor",
      gate: SEARCH_CORE_CP243_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP243_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP243_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP243_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP243_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M06.S06 onward with the remaining service fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp244Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP244_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_fixture_head_pack_id: SEARCH_CORE_CP244_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP244_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp244ServiceFixtureMidCaseSet(input = {}) {
  const upstream = createSearchCoreCp243ServiceFixtureHeadCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP244_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp244Result({
    case_set_id: "search-core-cp244-service-fixture-mid-case-set",
    source_service_fixture_head_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp244ServiceFixtureMidDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp243ServiceFixtureHeadDescriptor(input);
  const caseSet = createSearchCoreCp244ServiceFixtureMidCaseSet(input);
  return freezeCp244Result({
    descriptor: "SearchCoreCp244ServiceFixtureMidDescriptor",
    pack_binding: SEARCH_CORE_CP244_PACK_BINDING,
    source_service_fixture_head_descriptor: upstreamDescriptor.descriptor,
    service_fixture_mid_case_set: caseSet,
    public_exports: SEARCH_CORE_CP244_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-244",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP244_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP244_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-244.search_core_service_fixture_mid_descriptor",
      gate: SEARCH_CORE_CP244_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_fixture_mid_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-244.search_core_service_fixture_mid_descriptor",
      gate: SEARCH_CORE_CP244_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP244_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP244_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP244_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP244_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M06.S16 onward with the remaining service fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp245Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP245_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_fixture_mid_pack_id: SEARCH_CORE_CP245_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_blocked_claim_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP245_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp245ServiceGoldenHeadCaseSet(input = {}) {
  const upstream = createSearchCoreCp244ServiceFixtureMidCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP245_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp245Result({
    case_set_id: "search-core-cp245-service-golden-head-case-set",
    source_service_fixture_mid_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp245ServiceGoldenHeadDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp244ServiceFixtureMidDescriptor(input);
  const caseSet = createSearchCoreCp245ServiceGoldenHeadCaseSet(input);
  return freezeCp245Result({
    descriptor: "SearchCoreCp245ServiceGoldenHeadDescriptor",
    pack_binding: SEARCH_CORE_CP245_PACK_BINDING,
    source_service_fixture_mid_descriptor: upstreamDescriptor.descriptor,
    service_golden_head_case_set: caseSet,
    public_exports: SEARCH_CORE_CP245_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-245",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP245_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP245_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-245.search_core_service_golden_head_descriptor",
      gate: SEARCH_CORE_CP245_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_service_golden_head_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-245.search_core_service_golden_head_descriptor",
      gate: SEARCH_CORE_CP245_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP245_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP245_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP245_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP245_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M07.S04 onward with the remaining golden case rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp246Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP246_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_service_golden_head_pack_id: SEARCH_CORE_CP246_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP246_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp246GoldenHermesSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp245ServiceGoldenHeadCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP239_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP246_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp246Result({
    case_set_id: "search-core-cp246-golden-hermes-slice-case-set",
    source_service_golden_head_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp246GoldenHermesSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp245ServiceGoldenHeadDescriptor(input);
  const caseSet = createSearchCoreCp246GoldenHermesSliceCaseSet(input);
  return freezeCp246Result({
    descriptor: "SearchCoreCp246GoldenHermesSliceDescriptor",
    pack_binding: SEARCH_CORE_CP246_PACK_BINDING,
    source_service_golden_head_descriptor: upstreamDescriptor.descriptor,
    golden_hermes_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP246_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-246",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP246_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP246_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-246.search_core_golden_hermes_slice_descriptor",
      gate: SEARCH_CORE_CP246_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_golden_hermes_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-246.search_core_golden_hermes_slice_descriptor",
      gate: SEARCH_CORE_CP246_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP246_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP246_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP246_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP246_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P02.M08.S19 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp247Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP247_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_golden_hermes_slice_pack_id: SEARCH_CORE_CP247_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    schema_drift_detected: false,
    breaking_change_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP247_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP247_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP239_ROW_EXTRAS,
  public_export_map: Object.freeze({ index_export_check: true }),
  request_contract: Object.freeze({ contract_descriptor_only: true }),
  response_contract: Object.freeze({ contract_descriptor_only: true }),
  error_code_taxonomy: Object.freeze({ customer_safe_errors_only: true, validation_error_detail_included: false }),
  permission_annotation: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  audit_annotation: Object.freeze({ audit_hint_detail_included: false, audit_event_body_included: false }),
  pagination_or_filtering_contract: Object.freeze({ contract_descriptor_only: true }),
  serialization_guard: Object.freeze({ serialization_descriptor_only: true }),
  unauthorized_data_omission: Object.freeze({ unauthorized_data_omitted: true, leak_detected: false }),
  api_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  contract_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  invalid_request_test: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  denied_response_test: Object.freeze({ expected_outcome: "denied_customer_safe" }),
  hermes_api_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_interface_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  documentation_example: Object.freeze({ documentation_entry: "packages/search/README.md#cp00-247" }),
  versioning_note: Object.freeze({ versioning_descriptor_only: true }),
  downstream_consumer_note: Object.freeze({ downstream_routing_descriptor_only: true }),
  command_rerun: Object.freeze({ executes_command_runtime: false }),
  schema_drift_check: Object.freeze({ schema_drift_detected: false }),
  backward_compatibility_check: Object.freeze({ backward_compatibility_descriptor_only: true, breaking_change_detected: false }),
});

export function createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp246GoldenHermesSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP247_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP247_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp247Result({
    case_set_id: "search-core-cp247-p02-closeout-p03-interface-foundation-case-set",
    source_golden_hermes_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp246GoldenHermesSliceDescriptor(input);
  const caseSet = createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet(input);
  return freezeCp247Result({
    descriptor: "SearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP247_PACK_BINDING,
    source_golden_hermes_slice_descriptor: upstreamDescriptor.descriptor,
    p02_closeout_p03_interface_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP247_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-247",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP247_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP247_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-247.search_core_p02_closeout_p03_interface_foundation_descriptor",
      gate: SEARCH_CORE_CP247_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p02_closeout_p03_interface_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-247.search_core_p02_closeout_p03_interface_foundation_descriptor",
      gate: SEARCH_CORE_CP247_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP247_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP247_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP247_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP247_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P02 descriptor scope is closed; continue RP07.P03.M06.S01 onward with the remaining interface rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp248Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP248_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_closeout_p03_interface_foundation_pack_id: SEARCH_CORE_CP248_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    ui_leak_detected: false,
    permission_bypass_detected: false,
    schema_drift_detected: false,
    breaking_change_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP248_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP248_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP247_ROW_EXTRAS,
  documentation_example: Object.freeze({ documentation_entry: "packages/search/README.md#cp00-248" }),
  ui_surface_inventory: Object.freeze({ ui_descriptor_only: true, executes_ui_runtime: false }),
  data_dependency_map: Object.freeze({ data_dependency_descriptor_only: true }),
  loading_state: Object.freeze({ ui_state_descriptor_only: true }),
  empty_state: Object.freeze({ ui_state_descriptor_only: true }),
  denied_state: Object.freeze({ expected_outcome: "denied_customer_safe", permission_decision_detail_included: false }),
  review_required_state: Object.freeze({ expected_outcome: "review_required" }),
  primary_interaction: Object.freeze({ ui_interaction_descriptor_only: true }),
  secondary_interaction: Object.freeze({ ui_interaction_descriptor_only: true }),
  permission_badge: Object.freeze({ permission_decision_detail_included: false }),
  audit_hint_display: Object.freeze({ audit_hint_detail_included: false }),
  error_message_copy: Object.freeze({ customer_safe_errors_only: true, validation_error_detail_included: false }),
  responsive_desktop_layout: Object.freeze({ ui_layout_descriptor_only: true }),
  responsive_mobile_layout: Object.freeze({ ui_layout_descriptor_only: true }),
  keyboard_focus_behavior: Object.freeze({ ui_accessibility_descriptor_only: true }),
  visual_density_check: Object.freeze({ ui_layout_descriptor_only: true }),
  synthetic_fixture_binding: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  build_smoke: Object.freeze({ executes_command_runtime: false }),
  hermes_ui_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_ui_leak_prompt: Object.freeze({ read_only: true, leak_detected: false, claude_final_approval_claimed: false }),
});

export function createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP248_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP248_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp248Result({
    case_set_id: "search-core-cp248-p03-closeout-p04-ui-foundation-case-set",
    source_p02_closeout_p03_interface_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(input);
  const caseSet = createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet(input);
  return freezeCp248Result({
    descriptor: "SearchCoreCp248P03CloseoutP04UiFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP248_PACK_BINDING,
    source_p02_closeout_p03_interface_foundation_descriptor: upstreamDescriptor.descriptor,
    p03_closeout_p04_ui_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP248_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-248",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP248_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP248_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-248.search_core_p03_closeout_p04_ui_foundation_descriptor",
      gate: SEARCH_CORE_CP248_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p03_closeout_p04_ui_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-248.search_core_p03_closeout_p04_ui_foundation_descriptor",
      gate: SEARCH_CORE_CP248_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP248_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP248_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP248_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP248_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P03 descriptor scope is closed; continue RP07.P04.M03.S09 onward with the remaining UI rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp249Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP249_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p03_closeout_p04_ui_foundation_pack_id: SEARCH_CORE_CP249_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    ui_leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP249_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp249UiSliceMidCaseSet(input = {}) {
  const upstream = createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP248_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP249_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp249Result({
    case_set_id: "search-core-cp249-ui-slice-mid-case-set",
    source_p03_closeout_p04_ui_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp249UiSliceMidDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(input);
  const caseSet = createSearchCoreCp249UiSliceMidCaseSet(input);
  return freezeCp249Result({
    descriptor: "SearchCoreCp249UiSliceMidDescriptor",
    pack_binding: SEARCH_CORE_CP249_PACK_BINDING,
    source_p03_closeout_p04_ui_foundation_descriptor: upstreamDescriptor.descriptor,
    ui_slice_mid_case_set: caseSet,
    public_exports: SEARCH_CORE_CP249_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-249",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP249_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP249_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-249.search_core_ui_slice_mid_descriptor",
      gate: SEARCH_CORE_CP249_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_ui_slice_mid_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-249.search_core_ui_slice_mid_descriptor",
      gate: SEARCH_CORE_CP249_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP249_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP249_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP249_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP249_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P04.M03.S19 onward with the remaining UI rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp250Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP250_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_ui_slice_mid_pack_id: SEARCH_CORE_CP250_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    ui_leak_detected: false,
    unauthorized_count_leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP250_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP250_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP248_ROW_EXTRAS,
  state_snapshot: Object.freeze({ ui_state_descriptor_only: true, writes_state_transition: false }),
  no_unauthorized_count_leak: Object.freeze({ unauthorized_count_leak_detected: false, unauthorized_data_omitted: true }),
});

export function createSearchCoreCp250UiWorkflowSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp249UiSliceMidCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP250_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP250_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp250Result({
    case_set_id: "search-core-cp250-ui-workflow-slice-case-set",
    source_ui_slice_mid_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp250UiWorkflowSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp249UiSliceMidDescriptor(input);
  const caseSet = createSearchCoreCp250UiWorkflowSliceCaseSet(input);
  return freezeCp250Result({
    descriptor: "SearchCoreCp250UiWorkflowSliceDescriptor",
    pack_binding: SEARCH_CORE_CP250_PACK_BINDING,
    source_ui_slice_mid_descriptor: upstreamDescriptor.descriptor,
    ui_workflow_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP250_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-250",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP250_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP250_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-250.search_core_ui_workflow_slice_descriptor",
      gate: SEARCH_CORE_CP250_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_ui_workflow_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-250.search_core_ui_workflow_slice_descriptor",
      gate: SEARCH_CORE_CP250_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP250_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP250_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP250_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP250_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P04.M05.S15 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp251Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP251_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_ui_workflow_slice_pack_id: SEARCH_CORE_CP251_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    ui_leak_detected: false,
    unauthorized_count_leak_detected: false,
    permission_bypass_detected: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP251_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp251UiBindingTailCaseSet(input = {}) {
  const upstream = createSearchCoreCp250UiWorkflowSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP250_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP251_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp251Result({
    case_set_id: "search-core-cp251-ui-binding-tail-case-set",
    source_ui_workflow_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp251UiBindingTailDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp250UiWorkflowSliceDescriptor(input);
  const caseSet = createSearchCoreCp251UiBindingTailCaseSet(input);
  return freezeCp251Result({
    descriptor: "SearchCoreCp251UiBindingTailDescriptor",
    pack_binding: SEARCH_CORE_CP251_PACK_BINDING,
    source_ui_workflow_slice_descriptor: upstreamDescriptor.descriptor,
    ui_binding_tail_case_set: caseSet,
    public_exports: SEARCH_CORE_CP251_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-251",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP251_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP251_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-251.search_core_ui_binding_tail_descriptor",
      gate: SEARCH_CORE_CP251_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_ui_binding_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-251.search_core_ui_binding_tail_descriptor",
      gate: SEARCH_CORE_CP251_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP251_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP251_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP251_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP251_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P04.M06.S03 onward with the remaining UI fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp252Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP252_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_ui_binding_tail_pack_id: SEARCH_CORE_CP252_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    ui_leak_detected: false,
    unauthorized_count_leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP252_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP252_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP250_ROW_EXTRAS,
  base_tenant_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  base_user_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  base_matter_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  base_document_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  primary_golden_case: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  secondary_golden_case: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  review_required_case: Object.freeze({ expected_outcome: "review_required" }),
  denied_case: Object.freeze({ expected_outcome: "denied_customer_safe" }),
  cross_tenant_case: Object.freeze({ expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false }),
  missing_context_case: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  audit_hint_case: Object.freeze({ audit_hint_detail_included: false }),
  security_trimming_case: Object.freeze({ unauthorized_data_omitted: true, leak_detected: false }),
  ai_retrieval_or_analytics_case: Object.freeze({ dispatches_ai_runtime: false }),
  fixture_manifest: Object.freeze({ fixture_payload_included: false }),
  golden_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  failure_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "rejected_customer_safe" }),
  hermes_fixture_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_missing_test_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  no_real_data_check: Object.freeze({ real_client_data_loaded: false, no_real_data: true }),
});

export function createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp251UiBindingTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP252_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP252_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp252Result({
    case_set_id: "search-core-cp252-p04-closeout-p05-fixture-foundation-case-set",
    source_ui_binding_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp251UiBindingTailDescriptor(input);
  const caseSet = createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet(input);
  return freezeCp252Result({
    descriptor: "SearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP252_PACK_BINDING,
    source_ui_binding_tail_descriptor: upstreamDescriptor.descriptor,
    p04_closeout_p05_fixture_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP252_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-252",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP252_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP252_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-252.search_core_p04_closeout_p05_fixture_foundation_descriptor",
      gate: SEARCH_CORE_CP252_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p04_closeout_p05_fixture_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-252.search_core_p04_closeout_p05_fixture_foundation_descriptor",
      gate: SEARCH_CORE_CP252_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP252_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP252_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP252_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP252_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P04 descriptor scope is closed; continue RP07.P05.M02.S15 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp253Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP253_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_closeout_p05_fixture_foundation_pack_id: SEARCH_CORE_CP253_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    id_drift_detected: false,
    permission_bypass_detected: false,
    exposes_audit_hint_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP253_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP253_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP252_ROW_EXTRAS,
  stable_id_check: Object.freeze({ stable_id_descriptor_only: true, id_drift_detected: false }),
  replay_command: Object.freeze({ executes_command_runtime: false, replay_descriptor_only: true }),
});

export function createSearchCoreCp253FixtureSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP253_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP253_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp253Result({
    case_set_id: "search-core-cp253-fixture-slice-case-set",
    source_p04_closeout_p05_fixture_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp253FixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(input);
  const caseSet = createSearchCoreCp253FixtureSliceCaseSet(input);
  return freezeCp253Result({
    descriptor: "SearchCoreCp253FixtureSliceDescriptor",
    pack_binding: SEARCH_CORE_CP253_PACK_BINDING,
    source_p04_closeout_p05_fixture_foundation_descriptor: upstreamDescriptor.descriptor,
    fixture_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP253_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-253",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP253_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP253_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-253.search_core_fixture_slice_descriptor",
      gate: SEARCH_CORE_CP253_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-253.search_core_fixture_slice_descriptor",
      gate: SEARCH_CORE_CP253_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP253_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP253_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP253_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP253_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P05.M04.S13 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp254Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP254_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_fixture_slice_pack_id: SEARCH_CORE_CP254_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    id_drift_detected: false,
    permission_bypass_detected: false,
    exposes_audit_hint_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP254_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp254FixtureBindingSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp253FixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP253_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP254_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp254Result({
    case_set_id: "search-core-cp254-fixture-binding-slice-case-set",
    source_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp254FixtureBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp253FixtureSliceDescriptor(input);
  const caseSet = createSearchCoreCp254FixtureBindingSliceCaseSet(input);
  return freezeCp254Result({
    descriptor: "SearchCoreCp254FixtureBindingSliceDescriptor",
    pack_binding: SEARCH_CORE_CP254_PACK_BINDING,
    source_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    fixture_binding_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP254_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-254",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP254_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP254_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-254.search_core_fixture_binding_slice_descriptor",
      gate: SEARCH_CORE_CP254_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_fixture_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-254.search_core_fixture_binding_slice_descriptor",
      gate: SEARCH_CORE_CP254_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP254_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP254_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP254_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP254_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P05.M06.S09 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp255Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP255_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_fixture_binding_slice_pack_id: SEARCH_CORE_CP255_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    id_drift_detected: false,
    permission_bypass_detected: false,
    exposes_audit_hint_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP255_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp255FixtureSetMidCaseSet(input = {}) {
  const upstream = createSearchCoreCp254FixtureBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP253_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP255_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp255Result({
    case_set_id: "search-core-cp255-fixture-set-mid-case-set",
    source_fixture_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp255FixtureSetMidDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp254FixtureBindingSliceDescriptor(input);
  const caseSet = createSearchCoreCp255FixtureSetMidCaseSet(input);
  return freezeCp255Result({
    descriptor: "SearchCoreCp255FixtureSetMidDescriptor",
    pack_binding: SEARCH_CORE_CP255_PACK_BINDING,
    source_fixture_binding_slice_descriptor: upstreamDescriptor.descriptor,
    fixture_set_mid_case_set: caseSet,
    public_exports: SEARCH_CORE_CP255_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-255",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP255_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP255_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-255.search_core_fixture_set_mid_descriptor",
      gate: SEARCH_CORE_CP255_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_fixture_set_mid_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-255.search_core_fixture_set_mid_descriptor",
      gate: SEARCH_CORE_CP255_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP255_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP255_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP255_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP255_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P05.M06.S19 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp256Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP256_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_fixture_set_mid_pack_id: SEARCH_CORE_CP256_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    id_drift_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_matched_rule_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP256_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP256_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP253_ROW_EXTRAS,
  permission_matrix_row: Object.freeze({ permission_decision_detail_included: false, permission_matrix_descriptor_only: true }),
  view_decision_binding: Object.freeze({ decision_binding_descriptor_only: true }),
  search_decision_binding: Object.freeze({ decision_binding_descriptor_only: true }),
  mutation_decision_binding: Object.freeze({ decision_binding_descriptor_only: true }),
  export_download_decision_binding: Object.freeze({ decision_binding_descriptor_only: true }),
  share_decision_binding: Object.freeze({ decision_binding_descriptor_only: true }),
  ai_retrieval_decision_binding: Object.freeze({ decision_binding_descriptor_only: true, dispatches_ai_runtime: false }),
  audit_hint_fields: Object.freeze({ audit_hint_detail_included: false }),
  matched_rule_capture: Object.freeze({ matched_rule_detail_included: false }),
  deny_over_allow_check: Object.freeze({ deny_over_allow_enforced: true }),
  legal_hold_interaction: Object.freeze({ legal_hold_descriptor_only: true }),
  ethical_wall_interaction: Object.freeze({ ethical_wall_descriptor_only: true, cross_wall_access_allowed: false }),
  object_acl_interaction: Object.freeze({ object_acl_descriptor_only: true }),
  review_required_route: Object.freeze({ expected_outcome: "review_required" }),
  approval_required_route: Object.freeze({ expected_outcome: "approval_required" }),
  security_trimming_proof: Object.freeze({ unauthorized_data_omitted: true, leak_detected: false }),
  audit_event_expectation: Object.freeze({ audit_event_body_included: false, writes_audit_event: false }),
  permission_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  allowed_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "allowed_descriptor_only" }),
  denied_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "denied_customer_safe" }),
});

export function createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp255FixtureSetMidCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP256_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP256_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp256Result({
    case_set_id: "search-core-cp256-p05-closeout-p06-permission-foundation-case-set",
    source_fixture_set_mid_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp255FixtureSetMidDescriptor(input);
  const caseSet = createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet(input);
  return freezeCp256Result({
    descriptor: "SearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP256_PACK_BINDING,
    source_fixture_set_mid_descriptor: upstreamDescriptor.descriptor,
    p05_closeout_p06_permission_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP256_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-256",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP256_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP256_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-256.search_core_p05_closeout_p06_permission_foundation_descriptor",
      gate: SEARCH_CORE_CP256_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p05_closeout_p06_permission_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-256.search_core_p05_closeout_p06_permission_foundation_descriptor",
      gate: SEARCH_CORE_CP256_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP256_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP256_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP256_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP256_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P05 descriptor scope is closed; continue RP07.P06.M02.S21 onward with the remaining permission rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp257Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP257_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_closeout_p06_permission_foundation_pack_id: SEARCH_CORE_CP257_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP257_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP257_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP256_ROW_EXTRAS,
  cross_tenant_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false }),
  leak_prevention_test: Object.freeze({ executes_unit_test_runtime_paths: false, leak_detected: false }),
});

export function createSearchCoreCp257PermissionSliceHeadCaseSet(input = {}) {
  const upstream = createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP257_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP257_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp257Result({
    case_set_id: "search-core-cp257-permission-slice-head-case-set",
    source_p05_closeout_p06_permission_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp257PermissionSliceHeadDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(input);
  const caseSet = createSearchCoreCp257PermissionSliceHeadCaseSet(input);
  return freezeCp257Result({
    descriptor: "SearchCoreCp257PermissionSliceHeadDescriptor",
    pack_binding: SEARCH_CORE_CP257_PACK_BINDING,
    source_p05_closeout_p06_permission_foundation_descriptor: upstreamDescriptor.descriptor,
    permission_slice_head_case_set: caseSet,
    public_exports: SEARCH_CORE_CP257_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-257",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP257_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP257_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-257.search_core_permission_slice_head_descriptor",
      gate: SEARCH_CORE_CP257_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_permission_slice_head_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-257.search_core_permission_slice_head_descriptor",
      gate: SEARCH_CORE_CP257_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP257_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP257_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP257_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP257_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P06.M03.S09 onward with the remaining permission rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp258Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP258_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_permission_slice_head_pack_id: SEARCH_CORE_CP258_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_matched_rule_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP258_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP258_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP257_ROW_EXTRAS,
  hermes_security_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_bypass_prompt: Object.freeze({ read_only: true, permission_bypass_detected: false, claude_final_approval_claimed: false }),
  human_approval_note: Object.freeze({ human_final_approval_required: true, claude_final_approval_claimed: false }),
});

export function createSearchCoreCp258PermissionWorkflowSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp257PermissionSliceHeadCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP258_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP258_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp258Result({
    case_set_id: "search-core-cp258-permission-workflow-slice-case-set",
    source_permission_slice_head_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp258PermissionWorkflowSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp257PermissionSliceHeadDescriptor(input);
  const caseSet = createSearchCoreCp258PermissionWorkflowSliceCaseSet(input);
  return freezeCp258Result({
    descriptor: "SearchCoreCp258PermissionWorkflowSliceDescriptor",
    pack_binding: SEARCH_CORE_CP258_PACK_BINDING,
    source_permission_slice_head_descriptor: upstreamDescriptor.descriptor,
    permission_workflow_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP258_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-258",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP258_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP258_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-258.search_core_permission_workflow_slice_descriptor",
      gate: SEARCH_CORE_CP258_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_permission_workflow_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-258.search_core_permission_workflow_slice_descriptor",
      gate: SEARCH_CORE_CP258_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP258_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP258_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP258_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP258_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P06.M04.S24 onward with the remaining permission rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp259Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP259_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_permission_workflow_slice_pack_id: SEARCH_CORE_CP259_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_matched_rule_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP259_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp259PermissionBindingSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp258PermissionWorkflowSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP258_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP259_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp259Result({
    case_set_id: "search-core-cp259-permission-binding-slice-case-set",
    source_permission_workflow_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp259PermissionBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp258PermissionWorkflowSliceDescriptor(input);
  const caseSet = createSearchCoreCp259PermissionBindingSliceCaseSet(input);
  return freezeCp259Result({
    descriptor: "SearchCoreCp259PermissionBindingSliceDescriptor",
    pack_binding: SEARCH_CORE_CP259_PACK_BINDING,
    source_permission_workflow_slice_descriptor: upstreamDescriptor.descriptor,
    permission_binding_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP259_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-259",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP259_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP259_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-259.search_core_permission_binding_slice_descriptor",
      gate: SEARCH_CORE_CP259_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_permission_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-259.search_core_permission_binding_slice_descriptor",
      gate: SEARCH_CORE_CP259_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP259_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP259_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP259_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP259_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P06.M06.S14 onward with the remaining permission fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp260Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP260_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_permission_binding_slice_pack_id: SEARCH_CORE_CP260_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_matched_rule_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP260_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP260_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP258_ROW_EXTRAS,
  failure_taxonomy: Object.freeze({ failure_taxonomy_descriptor_only: true, validation_error_detail_included: false }),
  missing_tenant_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  missing_actor_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  missing_matter_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  missing_resource_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  unknown_action_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  cross_tenant_failure: Object.freeze({ expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false }),
  permission_denied_failure: Object.freeze({ expected_outcome: "denied_customer_safe", permission_decision_detail_included: false }),
  ambiguous_rule_failure: Object.freeze({ expected_outcome: "denied_customer_safe", deny_over_allow_enforced: true }),
  stale_reference_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  lock_conflict_failure: Object.freeze({ expected_outcome: "blocked_customer_safe", acquires_runtime_lock: false }),
  retry_exhaustion_failure: Object.freeze({ expected_outcome: "blocked_customer_safe", performs_retry_runtime: false }),
  rollback_expectation: Object.freeze({ performs_rollback_runtime: false, rollback_descriptor_only: true }),
  compensation_expectation: Object.freeze({ compensation_descriptor_only: true }),
  blocked_claim_receipt: Object.freeze({ blocked_claim_detail_included: false }),
  failure_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  failure_unit_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  failure_integration_smoke: Object.freeze({ executes_unit_test_runtime_paths: false, dispatches_integration_smoke_runtime: false }),
  audit_failure_hint: Object.freeze({ audit_hint_detail_included: false }),
  hermes_failure_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
});

export function createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp259PermissionBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP260_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP260_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp260Result({
    case_set_id: "search-core-cp260-p06-closeout-p07-failure-foundation-case-set",
    source_permission_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp259PermissionBindingSliceDescriptor(input);
  const caseSet = createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet(input);
  return freezeCp260Result({
    descriptor: "SearchCoreCp260P06CloseoutP07FailureFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP260_PACK_BINDING,
    source_permission_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p06_closeout_p07_failure_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP260_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-260",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP260_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP260_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-260.search_core_p06_closeout_p07_failure_foundation_descriptor",
      gate: SEARCH_CORE_CP260_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p06_closeout_p07_failure_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-260.search_core_p06_closeout_p07_failure_foundation_descriptor",
      gate: SEARCH_CORE_CP260_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP260_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP260_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP260_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP260_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P06 descriptor scope is closed; continue RP07.P07.M02.S13 onward with the remaining failure rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp261Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP261_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_closeout_p07_failure_foundation_pack_id: SEARCH_CORE_CP261_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP261_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP261_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP260_ROW_EXTRAS,
  claude_edge_case_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_escalation_note: Object.freeze({ human_final_approval_required: true, claude_final_approval_claimed: false }),
  no_silent_success_check: Object.freeze({ silent_success_detected: false }),
  no_data_leak_check: Object.freeze({ leak_detected: false, unauthorized_data_omitted: true }),
});

export function createSearchCoreCp261FailureSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP261_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP261_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp261Result({
    case_set_id: "search-core-cp261-failure-slice-case-set",
    source_p06_closeout_p07_failure_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp261FailureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(input);
  const caseSet = createSearchCoreCp261FailureSliceCaseSet(input);
  return freezeCp261Result({
    descriptor: "SearchCoreCp261FailureSliceDescriptor",
    pack_binding: SEARCH_CORE_CP261_PACK_BINDING,
    source_p06_closeout_p07_failure_foundation_descriptor: upstreamDescriptor.descriptor,
    failure_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP261_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-261",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP261_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP261_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-261.search_core_failure_slice_descriptor",
      gate: SEARCH_CORE_CP261_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_failure_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-261.search_core_failure_slice_descriptor",
      gate: SEARCH_CORE_CP261_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP261_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP261_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP261_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP261_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P07.M04.S06 onward with the remaining failure rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp262Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP262_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_slice_pack_id: SEARCH_CORE_CP262_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP262_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp262FailureBindingSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp261FailureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP261_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP262_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp262Result({
    case_set_id: "search-core-cp262-failure-binding-slice-case-set",
    source_failure_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp262FailureBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp261FailureSliceDescriptor(input);
  const caseSet = createSearchCoreCp262FailureBindingSliceCaseSet(input);
  return freezeCp262Result({
    descriptor: "SearchCoreCp262FailureBindingSliceDescriptor",
    pack_binding: SEARCH_CORE_CP262_PACK_BINDING,
    source_failure_slice_descriptor: upstreamDescriptor.descriptor,
    failure_binding_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP262_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-262",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP262_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP262_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-262.search_core_failure_binding_slice_descriptor",
      gate: SEARCH_CORE_CP262_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_failure_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-262.search_core_failure_binding_slice_descriptor",
      gate: SEARCH_CORE_CP262_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP262_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP262_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP262_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP262_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P07.M05.S21 onward with the remaining failure binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp263Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP263_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_binding_slice_pack_id: SEARCH_CORE_CP263_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP263_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp263FailureBindingTailCaseSet(input = {}) {
  const upstream = createSearchCoreCp262FailureBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP261_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP263_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp263Result({
    case_set_id: "search-core-cp263-failure-binding-tail-case-set",
    source_failure_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp263FailureBindingTailDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp262FailureBindingSliceDescriptor(input);
  const caseSet = createSearchCoreCp263FailureBindingTailCaseSet(input);
  return freezeCp263Result({
    descriptor: "SearchCoreCp263FailureBindingTailDescriptor",
    pack_binding: SEARCH_CORE_CP263_PACK_BINDING,
    source_failure_binding_slice_descriptor: upstreamDescriptor.descriptor,
    failure_binding_tail_case_set: caseSet,
    public_exports: SEARCH_CORE_CP263_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-263",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP263_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP263_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-263.search_core_failure_binding_tail_descriptor",
      gate: SEARCH_CORE_CP263_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_failure_binding_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-263.search_core_failure_binding_tail_descriptor",
      gate: SEARCH_CORE_CP263_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP263_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP263_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP263_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP263_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P07.M06.S06 onward with the remaining failure fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp264Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP264_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_binding_tail_pack_id: SEARCH_CORE_CP264_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP264_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP264_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP261_ROW_EXTRAS,
  hermes_command_matrix: Object.freeze({ hermes_command_matrix_descriptor_only: true, executes_command_runtime: false }),
  evidence_field_list: Object.freeze({ evidence_field_descriptor_only: true }),
  changed_file_receipt: Object.freeze({ changed_file_receipt_descriptor_only: true }),
  command_result_receipt: Object.freeze({ command_result_receipt_descriptor_only: true, executes_command_runtime: false }),
  fixture_summary_receipt: Object.freeze({ fixture_payload_included: false }),
  permission_summary_receipt: Object.freeze({ permission_decision_detail_included: false }),
  audit_summary_receipt: Object.freeze({ audit_event_body_included: false, audit_hint_detail_included: false }),
  no_real_data_receipt: Object.freeze({ real_client_data_loaded: false, no_real_data: true }),
  claude_dependency_marker: Object.freeze({ claude_final_approval_claimed: false, read_only: true }),
  human_approval_marker: Object.freeze({ human_final_approval_required: true }),
  pass_semantics: Object.freeze({ verdict_semantics_descriptor_only: true }),
  pass_with_findings_semantics: Object.freeze({ verdict_semantics_descriptor_only: true }),
  block_semantics: Object.freeze({ verdict_semantics_descriptor_only: true }),
  evidence_template: Object.freeze({ evidence_template_descriptor_only: true }),
  validation_command_check: Object.freeze({ executes_command_runtime: false }),
  harness_boundary_note: Object.freeze({ harness_boundary_descriptor_only: true }),
  regression_receipt: Object.freeze({ regression_receipt_descriptor_only: true }),
  next_gate_readiness: Object.freeze({ next_gate_readiness_descriptor_only: true }),
});

export function createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp263FailureBindingTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP264_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP264_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp264Result({
    case_set_id: "search-core-cp264-p07-closeout-p08-hermes-foundation-case-set",
    source_failure_binding_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp263FailureBindingTailDescriptor(input);
  const caseSet = createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet(input);
  return freezeCp264Result({
    descriptor: "SearchCoreCp264P07CloseoutP08HermesFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP264_PACK_BINDING,
    source_failure_binding_tail_descriptor: upstreamDescriptor.descriptor,
    p07_closeout_p08_hermes_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP264_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-264",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP264_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP264_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-264.search_core_p07_closeout_p08_hermes_foundation_descriptor",
      gate: SEARCH_CORE_CP264_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p07_closeout_p08_hermes_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-264.search_core_p07_closeout_p08_hermes_foundation_descriptor",
      gate: SEARCH_CORE_CP264_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP264_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP264_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP264_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP264_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P07 descriptor scope is closed; continue RP07.P08.M02.S15 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp265Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP265_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_closeout_p08_hermes_foundation_pack_id: SEARCH_CORE_CP265_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP265_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP265_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP264_ROW_EXTRAS,
  documentation_update: Object.freeze({ documentation_descriptor_only: true }),
  operator_summary: Object.freeze({ operator_summary_descriptor_only: true }),
});

export function createSearchCoreCp265HermesSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP265_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP265_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp265Result({
    case_set_id: "search-core-cp265-hermes-slice-case-set",
    source_p07_closeout_p08_hermes_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp265HermesSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(input);
  const caseSet = createSearchCoreCp265HermesSliceCaseSet(input);
  return freezeCp265Result({
    descriptor: "SearchCoreCp265HermesSliceDescriptor",
    pack_binding: SEARCH_CORE_CP265_PACK_BINDING,
    source_p07_closeout_p08_hermes_foundation_descriptor: upstreamDescriptor.descriptor,
    hermes_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP265_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-265",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP265_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP265_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-265.search_core_hermes_slice_descriptor",
      gate: SEARCH_CORE_CP265_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_hermes_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-265.search_core_hermes_slice_descriptor",
      gate: SEARCH_CORE_CP265_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP265_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP265_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP265_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP265_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P08.M04.S13 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp266Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP266_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_hermes_slice_pack_id: SEARCH_CORE_CP266_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP266_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp266HermesBindingSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp265HermesSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP265_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP266_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp266Result({
    case_set_id: "search-core-cp266-hermes-binding-slice-case-set",
    source_hermes_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp266HermesBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp265HermesSliceDescriptor(input);
  const caseSet = createSearchCoreCp266HermesBindingSliceCaseSet(input);
  return freezeCp266Result({
    descriptor: "SearchCoreCp266HermesBindingSliceDescriptor",
    pack_binding: SEARCH_CORE_CP266_PACK_BINDING,
    source_hermes_slice_descriptor: upstreamDescriptor.descriptor,
    hermes_binding_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP266_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-266",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP266_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP266_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-266.search_core_hermes_binding_slice_descriptor",
      gate: SEARCH_CORE_CP266_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_hermes_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-266.search_core_hermes_binding_slice_descriptor",
      gate: SEARCH_CORE_CP266_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP266_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP266_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP266_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP266_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P08.M06.S09 onward with the remaining Hermes fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp267Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP267_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_hermes_binding_slice_pack_id: SEARCH_CORE_CP267_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_audit_event_body: false,
    exposes_blocked_claim_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP267_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP267_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP265_ROW_EXTRAS,
  architecture_review_questions: Object.freeze({ review_questions_descriptor_only: true }),
  security_review_questions: Object.freeze({ review_questions_descriptor_only: true }),
  permission_bypass_questions: Object.freeze({ review_questions_descriptor_only: true, permission_bypass_detected: false }),
  audit_completeness_questions: Object.freeze({ review_questions_descriptor_only: true }),
  missing_test_questions: Object.freeze({ review_questions_descriptor_only: true }),
  ui_leak_questions: Object.freeze({ review_questions_descriptor_only: true, leak_detected: false }),
  downstream_readiness_questions: Object.freeze({ review_questions_descriptor_only: true }),
  risk_register: Object.freeze({ risk_register_descriptor_only: true }),
  severity_taxonomy: Object.freeze({ severity_taxonomy_descriptor_only: true }),
  go_no_go_verdict_format: Object.freeze({ verdict_semantics_descriptor_only: true, claude_final_approval_claimed: false }),
  finding_routing_map: Object.freeze({ finding_routing_descriptor_only: true }),
  human_approval_summary: Object.freeze({ human_final_approval_required: true }),
  claude_review_packet: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  closeout_criteria: Object.freeze({ closeout_criteria_descriptor_only: true }),
  pass_closeout_note: Object.freeze({ verdict_semantics_descriptor_only: true }),
  pass_with_findings_closeout_note: Object.freeze({ verdict_semantics_descriptor_only: true }),
  block_closeout_note: Object.freeze({ verdict_semantics_descriptor_only: true }),
  next_rp_dependency: Object.freeze({ next_rp_dependency_descriptor_only: true }),
});

export function createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet(input = {}) {
  const upstream = createSearchCoreCp266HermesBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP267_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP267_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp267Result({
    case_set_id: "search-core-cp267-p08-closeout-p09-review-foundation-case-set",
    source_hermes_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp266HermesBindingSliceDescriptor(input);
  const caseSet = createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet(input);
  return freezeCp267Result({
    descriptor: "SearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor",
    pack_binding: SEARCH_CORE_CP267_PACK_BINDING,
    source_hermes_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p08_closeout_p09_review_foundation_case_set: caseSet,
    public_exports: SEARCH_CORE_CP267_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-267",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP267_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP267_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-267.search_core_p08_closeout_p09_review_foundation_descriptor",
      gate: SEARCH_CORE_CP267_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p08_closeout_p09_review_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-267.search_core_p08_closeout_p09_review_foundation_descriptor",
      gate: SEARCH_CORE_CP267_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP267_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP267_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP267_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP267_PACK_BINDING.next_subphase_id,
      open_scope: "RP07.P08 descriptor scope is closed; continue RP07.P09.M03.S11 onward with the remaining review rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp268Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP268_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_closeout_p09_review_foundation_pack_id: SEARCH_CORE_CP268_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP268_NO_WRITE_ATTESTATION,
  });
}

const SEARCH_CORE_CP268_ROW_EXTRAS = Object.freeze({
  ...SEARCH_CORE_CP267_ROW_EXTRAS,
  review_receipt_placeholder: Object.freeze({ review_receipt_placeholder_descriptor_only: true }),
  future_correction_slot: Object.freeze({ future_correction_slot_descriptor_only: true }),
});

export function createSearchCoreCp268ReviewSliceCaseSet(input = {}) {
  const upstream = createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP268_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP268_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp268Result({
    case_set_id: "search-core-cp268-review-slice-case-set",
    source_p08_closeout_p09_review_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp268ReviewSliceDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(input);
  const caseSet = createSearchCoreCp268ReviewSliceCaseSet(input);
  return freezeCp268Result({
    descriptor: "SearchCoreCp268ReviewSliceDescriptor",
    pack_binding: SEARCH_CORE_CP268_PACK_BINDING,
    source_p08_closeout_p09_review_foundation_descriptor: upstreamDescriptor.descriptor,
    review_slice_case_set: caseSet,
    public_exports: SEARCH_CORE_CP268_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-268",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP268_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP268_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-268.search_core_review_slice_descriptor",
      gate: SEARCH_CORE_CP268_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_review_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-268.search_core_review_slice_descriptor",
      gate: SEARCH_CORE_CP268_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP268_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP268_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP268_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP268_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P09.M05.S09 onward with the remaining review binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp269Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP269_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_review_slice_pack_id: SEARCH_CORE_CP269_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP269_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp269ReviewBindingMidCaseSet(input = {}) {
  const upstream = createSearchCoreCp268ReviewSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP268_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP269_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp269Result({
    case_set_id: "search-core-cp269-review-binding-mid-case-set",
    source_review_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp269ReviewBindingMidDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp268ReviewSliceDescriptor(input);
  const caseSet = createSearchCoreCp269ReviewBindingMidCaseSet(input);
  return freezeCp269Result({
    descriptor: "SearchCoreCp269ReviewBindingMidDescriptor",
    pack_binding: SEARCH_CORE_CP269_PACK_BINDING,
    source_review_slice_descriptor: upstreamDescriptor.descriptor,
    review_binding_mid_case_set: caseSet,
    public_exports: SEARCH_CORE_CP269_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-269",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP269_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP269_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-269.search_core_review_binding_mid_descriptor",
      gate: SEARCH_CORE_CP269_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_review_binding_mid_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-269.search_core_review_binding_mid_descriptor",
      gate: SEARCH_CORE_CP269_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP269_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP269_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP269_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP269_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P09.M05.S19 onward with the remaining review binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp270Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP270_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_review_binding_mid_pack_id: SEARCH_CORE_CP270_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP270_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp270ReviewBindingTailCaseSet(input = {}) {
  const upstream = createSearchCoreCp269ReviewBindingMidCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP268_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP270_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp270Result({
    case_set_id: "search-core-cp270-review-binding-tail-case-set",
    source_review_binding_mid_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp270ReviewBindingTailDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp269ReviewBindingMidDescriptor(input);
  const caseSet = createSearchCoreCp270ReviewBindingTailCaseSet(input);
  return freezeCp270Result({
    descriptor: "SearchCoreCp270ReviewBindingTailDescriptor",
    pack_binding: SEARCH_CORE_CP270_PACK_BINDING,
    source_review_binding_mid_descriptor: upstreamDescriptor.descriptor,
    review_binding_tail_case_set: caseSet,
    public_exports: SEARCH_CORE_CP270_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-270",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP270_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP270_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-270.search_core_review_binding_tail_descriptor",
      gate: SEARCH_CORE_CP270_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_review_binding_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-270.search_core_review_binding_tail_descriptor",
      gate: SEARCH_CORE_CP270_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP270_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP270_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP270_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP270_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP07.P09.M06.S07 onward with the remaining review fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp271Result(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
    source_review_binding_tail_pack_id: SEARCH_CORE_CP271_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_search_runtime: false,
    dispatches_ocr_runtime: false,
    dispatches_index_runtime: false,
    dispatches_embedding_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    leak_detected: false,
    silent_success_detected: false,
    permission_bypass_detected: false,
    deny_over_allow_enforced: true,
    exposes_permission_decision_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: SEARCH_CORE_CP271_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp271P09CloseoutCaseSet(input = {}) {
  const upstream = createSearchCoreCp270ReviewBindingTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(SEARCH_CORE_CP268_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: SEARCH_CORE_CP271_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => searchCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp271Result({
    case_set_id: "search-core-cp271-p09-closeout-case-set",
    source_review_binding_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createSearchCoreCp271P09CloseoutDescriptor(input = {}) {
  const upstreamDescriptor = createSearchCoreCp270ReviewBindingTailDescriptor(input);
  const caseSet = createSearchCoreCp271P09CloseoutCaseSet(input);
  return freezeCp271Result({
    descriptor: "SearchCoreCp271P09CloseoutDescriptor",
    pack_binding: SEARCH_CORE_CP271_PACK_BINDING,
    source_review_binding_tail_descriptor: upstreamDescriptor.descriptor,
    p09_closeout_case_set: caseSet,
    public_exports: SEARCH_CORE_CP271_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/search/README.md#cp00-271",
    index_export_check: true,
    no_leak_guards: SEARCH_CORE_CP271_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: SEARCH_CORE_CP271_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H07.CP00-271.search_core_p09_closeout_descriptor",
      gate: SEARCH_CORE_CP271_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_search_p09_closeout_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C07.CP00-271.search_core_p09_closeout_descriptor",
      gate: SEARCH_CORE_CP271_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: SEARCH_CORE_CP271_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: SEARCH_CORE_CP271_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: SEARCH_CORE_CP271_PACK_BINDING.pack_id,
      to_pack_id: SEARCH_CORE_CP271_PACK_BINDING.next_pack_id,
      next_subphase_id: SEARCH_CORE_CP271_PACK_BINDING.next_subphase_id,
      open_scope: "RP07 descriptor scope is fully closed (P00-P09); CP00-272 opens the RP08 program with a fresh program bootstrap while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}
