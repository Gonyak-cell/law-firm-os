import {
  TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP342_PACK_BINDING,
  TIME_EXPENSE_CORE_CP342_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP343_PACK_BINDING,
  TIME_EXPENSE_CORE_CP343_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP344_PACK_BINDING,
  TIME_EXPENSE_CORE_CP344_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP345_PACK_BINDING,
  TIME_EXPENSE_CORE_CP345_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP346_PACK_BINDING,
  TIME_EXPENSE_CORE_CP346_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP347_PACK_BINDING,
  TIME_EXPENSE_CORE_CP347_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP348_PACK_BINDING,
  TIME_EXPENSE_CORE_CP348_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP349_PACK_BINDING,
  TIME_EXPENSE_CORE_CP349_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP350_PACK_BINDING,
  TIME_EXPENSE_CORE_CP350_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP351_PACK_BINDING,
  TIME_EXPENSE_CORE_CP351_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP352_PACK_BINDING,
  TIME_EXPENSE_CORE_CP352_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP353_PACK_BINDING,
  TIME_EXPENSE_CORE_CP353_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP354_PACK_BINDING,
  TIME_EXPENSE_CORE_CP354_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP355_PACK_BINDING,
  TIME_EXPENSE_CORE_CP355_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP356_PACK_BINDING,
  TIME_EXPENSE_CORE_CP356_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP357_PACK_BINDING,
  TIME_EXPENSE_CORE_CP357_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP358_PACK_BINDING,
  TIME_EXPENSE_CORE_CP358_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP359_PACK_BINDING,
  TIME_EXPENSE_CORE_CP359_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP360_PACK_BINDING,
  TIME_EXPENSE_CORE_CP360_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP361_PACK_BINDING,
  TIME_EXPENSE_CORE_CP361_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP362_PACK_BINDING,
  TIME_EXPENSE_CORE_CP362_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP363_PACK_BINDING,
  TIME_EXPENSE_CORE_CP363_REQUIREMENTS,
  TIME_EXPENSE_CORE_PROGRAM_CONTRACT,
} from "./registry.js";

export function timeExpenseCoreRowKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function freezeCp342Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_intake_core_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    no_write_attestation: TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP342_ROW_EXTRAS = Object.freeze({
  scope_inventory: Object.freeze({
    scope_descriptor_only: true,
    program_scope: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_scope,
  }),
  acceptance_gate_definition: Object.freeze({
    hermes_gate: TIME_EXPENSE_CORE_CP342_PACK_BINDING.hermes_gate,
    claude_gate: TIME_EXPENSE_CORE_CP342_PACK_BINDING.claude_gate,
  }),
  non_goal_boundary: Object.freeze({
    time_entry_runtime_opened: false,
    rate_card_runtime_opened: false,
    expense_runtime_opened: false,
    disbursement_runtime_opened: false,
  }),
  target_file_map: Object.freeze({
    target_package: "packages/time-expense",
    target_contract: "contracts/time-expense-core-contract.json",
    target_validator: "scripts/validate-rp11-time-expense-core-contract.mjs",
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
  package_directory_layout: Object.freeze({ package_path: "packages/time-expense" }),
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

export function createTimeExpenseCoreCp342ScopeContractFoundationCaseSet(input = {}) {
  void input;
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP342_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp342Result({
    case_set_id: "time-expense-core-cp342-scope-contract-foundation-case-set",
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp342ScopeContractFoundationDescriptor(input = {}) {
  const caseSet = createTimeExpenseCoreCp342ScopeContractFoundationCaseSet(input);
  return freezeCp342Result({
    descriptor: "TimeExpenseCoreCp342ScopeContractFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP342_PACK_BINDING,
    program_contract: TIME_EXPENSE_CORE_PROGRAM_CONTRACT,
    scope_contract_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-342",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-342.time_expense_core_scope_contract_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP342_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_scope_contract_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-342.time_expense_core_scope_contract_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP342_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P01.M08.S06 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp343Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_scope_contract_foundation_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP343_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP342_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-343" }),
  service_entrypoint_contract: Object.freeze({ service_contract_descriptor_only: true }),
  request_normalization: Object.freeze({ normalization_descriptor_only: true }),
  tenant_boundary_precheck: Object.freeze({ cross_tenant_access_allowed: false }),
  matter_trace_precheck: Object.freeze({ matter_trace_required: true }),
  permission_precheck: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  audit_hint_precheck: Object.freeze({ audit_hint_detail_included: false }),
  primary_happy_path: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  secondary_workflow_path: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  state_transition_enforcement: Object.freeze({ writes_state_transition: false }),
  idempotency_key_handling: Object.freeze({ persists_idempotency_key: false }),
  lock_acquisition_rule: Object.freeze({ acquires_runtime_lock: false, lock_token_included: false }),
  persistence_boundary: Object.freeze({ creates_database_rows: false, updates_database_rows: false }),
  validation_error_mapping: Object.freeze({ validation_error_detail_included: false }),
  review_required_routing: Object.freeze({ expected_outcome: "review_required" }),
  approval_required_routing: Object.freeze({ expected_outcome: "approval_required" }),
  blocked_claim_output: Object.freeze({ blocked_claim_detail_included: false }),
  rollback_behavior: Object.freeze({ performs_rollback_runtime: false }),
  retry_behavior: Object.freeze({ performs_retry_runtime: false }),
  unit_test_happy_path: Object.freeze({ executes_unit_test_runtime_paths: false }),
  unit_test_denied_path: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "denied_customer_safe" }),
  unit_test_review_path: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "review_required" }),
  integration_smoke_case: Object.freeze({ executes_unit_test_runtime_paths: false, dispatches_integration_smoke_runtime: false }),
});

export function createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp342ScopeContractFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP343_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp343Result({
    case_set_id: "time-expense-core-cp343-p01-closeout-p02-service-foundation-case-set",
    source_scope_contract_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp342ScopeContractFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet(input);
  return freezeCp343Result({
    descriptor: "TimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP343_PACK_BINDING,
    source_scope_contract_foundation_descriptor: upstreamDescriptor.descriptor,
    p01_closeout_p02_service_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-343",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-343.time_expense_core_p01_closeout_p02_service_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP343_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p01_closeout_p02_service_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-343.time_expense_core_p01_closeout_p02_service_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP343_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P01 descriptor scope is closed; continue RP11.P02.M07.S11 onward with the remaining service rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp344Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p01_closeout_p02_service_foundation_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP344_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP343_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-344" }),
});

export function createTimeExpenseCoreCp344ServiceSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP344_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp344Result({
    case_set_id: "time-expense-core-cp344-service-slice-case-set",
    source_p01_closeout_p02_service_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp344ServiceSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp344ServiceSliceCaseSet(input);
  return freezeCp344Result({
    descriptor: "TimeExpenseCoreCp344ServiceSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP344_PACK_BINDING,
    source_p01_closeout_p02_service_foundation_descriptor: upstreamDescriptor.descriptor,
    service_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-344",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-344.time_expense_core_service_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP344_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_service_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-344.time_expense_core_service_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP344_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P02.M07.S21 onward with the remaining service test rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp345Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_service_slice_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP345_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP344_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-345" }),
});

export function createTimeExpenseCoreCp345ServiceBindingSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp344ServiceSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP345_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp345Result({
    case_set_id: "time-expense-core-cp345-service-binding-slice-case-set",
    source_service_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp345ServiceBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp344ServiceSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp345ServiceBindingSliceCaseSet(input);
  return freezeCp345Result({
    descriptor: "TimeExpenseCoreCp345ServiceBindingSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP345_PACK_BINDING,
    source_service_slice_descriptor: upstreamDescriptor.descriptor,
    service_binding_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-345",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-345.time_expense_core_service_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP345_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_service_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-345.time_expense_core_service_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP345_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P02.M09.S19 onward with the remaining service review rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp346Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_service_binding_slice_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP346_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP345_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-346" }),
  public_export_map: Object.freeze({ export_map_descriptor_only: true }),
  request_contract: Object.freeze({ request_contract_descriptor_only: true }),
  response_contract: Object.freeze({ response_contract_descriptor_only: true }),
  error_code_taxonomy: Object.freeze({ customer_safe_error_codes_only: true }),
  permission_annotation: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  audit_annotation: Object.freeze({ audit_hint_detail_included: false }),
  pagination_or_filtering_contract: Object.freeze({ pagination_descriptor_only: true, no_unauthorized_count_leak: true }),
  serialization_guard: Object.freeze({ serialization_descriptor_only: true }),
  unauthorized_data_omission: Object.freeze({ unauthorized_data_omitted: true }),
  api_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  contract_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  invalid_request_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "rejected_customer_safe" }),
  denied_response_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "denied_customer_safe" }),
  hermes_api_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_interface_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  documentation_example: Object.freeze({ documentation_descriptor_only: true }),
  versioning_note: Object.freeze({ versioning_descriptor_only: true }),
  downstream_consumer_note: Object.freeze({ downstream_descriptor_only: true }),
  command_rerun: Object.freeze({ executes_command_runtime: false }),
  ui_surface_inventory: Object.freeze({ ui_surface_descriptor_only: true }),
  data_dependency_map: Object.freeze({ data_dependency_descriptor_only: true }),
  loading_state: Object.freeze({ state_descriptor_only: true }),
  empty_state: Object.freeze({ state_descriptor_only: true, no_unauthorized_count_leak: true }),
  denied_state: Object.freeze({ permission_decision_detail_included: false, customer_safe_denied_state: true }),
  review_required_state: Object.freeze({ state_descriptor_only: true }),
  primary_interaction: Object.freeze({ interaction_descriptor_only: true }),
  secondary_interaction: Object.freeze({ interaction_descriptor_only: true }),
});

export function createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp345ServiceBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP346_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp346Result({
    case_set_id: "time-expense-core-cp346-p02-closeout-p03-interface-p04-ui-foundation-case-set",
    source_service_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp345ServiceBindingSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet(input);
  return freezeCp346Result({
    descriptor: "TimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP346_PACK_BINDING,
    source_service_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p02_closeout_p03_interface_p04_ui_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-346",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-346.time_expense_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP346_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p02_closeout_p03_interface_p04_ui_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-346.time_expense_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP346_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P02 and RP11.P03 descriptor scopes are closed; continue RP11.P04.M03.S06 onward with the remaining UI rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp347Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_closeout_p03_interface_p04_ui_foundation_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP347_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP346_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-347" }),
  permission_badge: Object.freeze({ permission_decision_detail_included: false }),
  audit_hint_display: Object.freeze({ audit_hint_detail_included: false }),
  error_message_copy: Object.freeze({ validation_error_detail_included: false }),
  responsive_desktop_layout: Object.freeze({ layout_descriptor_only: true }),
  responsive_mobile_layout: Object.freeze({ layout_descriptor_only: true }),
  keyboard_focus_behavior: Object.freeze({ accessibility_descriptor_only: true }),
  visual_density_check: Object.freeze({ layout_descriptor_only: true }),
  synthetic_fixture_binding: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  build_smoke: Object.freeze({ executes_ui_runtime: false, build_smoke_descriptor_only: true }),
  hermes_ui_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_ui_leak_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false, leak_detected: false }),
});

export function createTimeExpenseCoreCp347UiWorkflowSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP347_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp347Result({
    case_set_id: "time-expense-core-cp347-ui-workflow-slice-case-set",
    source_p02_closeout_p03_interface_p04_ui_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp347UiWorkflowSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp347UiWorkflowSliceCaseSet(input);
  return freezeCp347Result({
    descriptor: "TimeExpenseCoreCp347UiWorkflowSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP347_PACK_BINDING,
    source_p02_closeout_p03_interface_p04_ui_foundation_descriptor: upstreamDescriptor.descriptor,
    ui_workflow_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-347",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-347.time_expense_core_ui_workflow_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP347_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_ui_workflow_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-347.time_expense_core_ui_workflow_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP347_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P04.M05.S06 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp348Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_ui_workflow_slice_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP348_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP347_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-348" }),
});

export function createTimeExpenseCoreCp348UiBindingSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp347UiWorkflowSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP348_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp348Result({
    case_set_id: "time-expense-core-cp348-ui-binding-slice-case-set",
    source_ui_workflow_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp348UiBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp347UiWorkflowSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp348UiBindingSliceCaseSet(input);
  return freezeCp348Result({
    descriptor: "TimeExpenseCoreCp348UiBindingSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP348_PACK_BINDING,
    source_ui_workflow_slice_descriptor: upstreamDescriptor.descriptor,
    ui_binding_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-348",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-348.time_expense_core_ui_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP348_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_ui_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-348.time_expense_core_ui_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP348_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P04.M05.S16 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp349Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_ui_binding_slice_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP349_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP348_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-349" }),
});

export function createTimeExpenseCoreCp349UiBindingTailCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp348UiBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP349_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp349Result({
    case_set_id: "time-expense-core-cp349-ui-binding-tail-case-set",
    source_ui_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp349UiBindingTailDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp348UiBindingSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp349UiBindingTailCaseSet(input);
  return freezeCp349Result({
    descriptor: "TimeExpenseCoreCp349UiBindingTailDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP349_PACK_BINDING,
    source_ui_binding_slice_descriptor: upstreamDescriptor.descriptor,
    ui_binding_tail_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-349",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-349.time_expense_core_ui_binding_tail_descriptor",
      gate: TIME_EXPENSE_CORE_CP349_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_ui_binding_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-349.time_expense_core_ui_binding_tail_descriptor",
      gate: TIME_EXPENSE_CORE_CP349_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P04.M06.S06 onward with the remaining UI fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp350Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_ui_binding_tail_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP350_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP349_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-350" }),
  base_tenant_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  base_user_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  base_matter_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  base_document_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  primary_golden_case: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  secondary_golden_case: Object.freeze({ expected_outcome: "allowed_descriptor_only" }),
  review_required_case: Object.freeze({ expected_outcome: "review_required" }),
  denied_case: Object.freeze({ expected_outcome: "denied_customer_safe", permission_decision_detail_included: false }),
  cross_tenant_case: Object.freeze({ expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false }),
  missing_context_case: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  audit_hint_case: Object.freeze({ audit_hint_detail_included: false }),
  security_trimming_case: Object.freeze({ unauthorized_data_omitted: true }),
  ai_retrieval_or_analytics_case: Object.freeze({ dispatches_ai_runtime: false }),
  fixture_manifest: Object.freeze({ fixture_manifest_descriptor_only: true }),
  golden_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  failure_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "rejected_customer_safe" }),
  hermes_fixture_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_missing_test_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  no_real_data_check: Object.freeze({ real_client_data_loaded: false }),
});

export function createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp349UiBindingTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP350_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp350Result({
    case_set_id: "time-expense-core-cp350-p04-closeout-p05-fixture-foundation-case-set",
    source_ui_binding_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp349UiBindingTailDescriptor(input);
  const caseSet = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet(input);
  return freezeCp350Result({
    descriptor: "TimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP350_PACK_BINDING,
    source_ui_binding_tail_descriptor: upstreamDescriptor.descriptor,
    p04_closeout_p05_fixture_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-350",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-350.time_expense_core_p04_closeout_p05_fixture_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP350_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p04_closeout_p05_fixture_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-350.time_expense_core_p04_closeout_p05_fixture_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP350_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P04 descriptor scope is closed; continue RP11.P05.M05.S08 onward with the remaining fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp351Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_closeout_p05_fixture_foundation_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP351_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP350_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-351" }),
});

export function createTimeExpenseCoreCp351FixtureSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP351_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp351Result({
    case_set_id: "time-expense-core-cp351-fixture-slice-case-set",
    source_p04_closeout_p05_fixture_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp351FixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp351FixtureSliceCaseSet(input);
  return freezeCp351Result({
    descriptor: "TimeExpenseCoreCp351FixtureSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP351_PACK_BINDING,
    source_p04_closeout_p05_fixture_foundation_descriptor: upstreamDescriptor.descriptor,
    fixture_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-351",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-351.time_expense_core_fixture_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP351_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-351.time_expense_core_fixture_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP351_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P05.M05.S18 onward with the remaining fixture binding rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp352Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_fixture_slice_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP352_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP351_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-352" }),
});

export function createTimeExpenseCoreCp352FixtureBindingSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp351FixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP352_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp352Result({
    case_set_id: "time-expense-core-cp352-fixture-binding-slice-case-set",
    source_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp352FixtureBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp351FixtureSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp352FixtureBindingSliceCaseSet(input);
  return freezeCp352Result({
    descriptor: "TimeExpenseCoreCp352FixtureBindingSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP352_PACK_BINDING,
    source_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    fixture_binding_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-352",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-352.time_expense_core_fixture_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP352_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_fixture_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-352.time_expense_core_fixture_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP352_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P05.M06.S08 onward with the remaining fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp353Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_fixture_binding_slice_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP353_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP352_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-353" }),
  permission_matrix_row: Object.freeze({ permission_matrix_descriptor_only: true, deny_over_allow_enforced: true }),
  view_decision_binding: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  search_decision_binding: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  mutation_decision_binding: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  export_download_decision_binding: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  share_decision_binding: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true }),
  ai_retrieval_decision_binding: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true, dispatches_ai_runtime: false }),
  audit_hint_fields: Object.freeze({ audit_hint_detail_included: false }),
  matched_rule_capture: Object.freeze({ matched_rule_capture_descriptor_only: true }),
  deny_over_allow_check: Object.freeze({ deny_over_allow_enforced: true }),
  legal_hold_interaction: Object.freeze({ legal_hold_descriptor_only: true }),
  ethical_wall_interaction: Object.freeze({ ethical_wall_descriptor_only: true }),
  object_acl_interaction: Object.freeze({ object_acl_descriptor_only: true }),
  review_required_route: Object.freeze({ expected_outcome: "review_required" }),
  approval_required_route: Object.freeze({ expected_outcome: "approval_required" }),
  security_trimming_proof: Object.freeze({ unauthorized_data_omitted: true }),
  audit_event_expectation: Object.freeze({ writes_audit_event: false, audit_event_expectation_descriptor_only: true }),
  permission_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  allowed_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "allowed_descriptor_only" }),
  denied_test: Object.freeze({ executes_unit_test_runtime_paths: false, expected_outcome: "denied_customer_safe" }),
  cross_tenant_test: Object.freeze({ executes_unit_test_runtime_paths: false, cross_tenant_access_allowed: false }),
  leak_prevention_test: Object.freeze({ executes_unit_test_runtime_paths: false, leak_detected: false }),
});

export function createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp352FixtureBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP353_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp353Result({
    case_set_id: "time-expense-core-cp353-p05-closeout-p06-permission-foundation-case-set",
    source_fixture_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp352FixtureBindingSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet(input);
  return freezeCp353Result({
    descriptor: "TimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP353_PACK_BINDING,
    source_fixture_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p05_closeout_p06_permission_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-353",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-353.time_expense_core_p05_closeout_p06_permission_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP353_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p05_closeout_p06_permission_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-353.time_expense_core_p05_closeout_p06_permission_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP353_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P05 descriptor scope is closed; continue RP11.P06.M04.S06 onward with the remaining permission rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp354Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_closeout_p06_permission_foundation_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP354_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP353_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-354" }),
});

export function createTimeExpenseCoreCp354PermissionSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP354_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp354Result({
    case_set_id: "time-expense-core-cp354-permission-slice-case-set",
    source_p05_closeout_p06_permission_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp354PermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp354PermissionSliceCaseSet(input);
  return freezeCp354Result({
    descriptor: "TimeExpenseCoreCp354PermissionSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP354_PACK_BINDING,
    source_p05_closeout_p06_permission_foundation_descriptor: upstreamDescriptor.descriptor,
    permission_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-354",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-354.time_expense_core_permission_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP354_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-354.time_expense_core_permission_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP354_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P06.M06.S04 onward with the remaining permission fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp355Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_permission_slice_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP355_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP354_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-355" }),
  failure_taxonomy: Object.freeze({ failure_taxonomy_descriptor_only: true }),
  missing_tenant_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  missing_actor_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  missing_matter_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  missing_resource_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  unknown_action_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  cross_tenant_failure: Object.freeze({ expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false }),
  permission_denied_failure: Object.freeze({ expected_outcome: "denied_customer_safe", permission_decision_detail_included: false }),
  ambiguous_rule_failure: Object.freeze({ expected_outcome: "denied_customer_safe", deny_over_allow_enforced: true }),
  stale_reference_failure: Object.freeze({ expected_outcome: "rejected_customer_safe" }),
  lock_conflict_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", acquires_runtime_lock: false, lock_token_included: false }),
  retry_exhaustion_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", performs_retry_runtime: false }),
  rollback_expectation: Object.freeze({ performs_rollback_runtime: false, rollback_descriptor_only: true }),
  compensation_expectation: Object.freeze({ compensation_descriptor_only: true }),
  blocked_claim_receipt: Object.freeze({ blocked_claim_detail_included: false }),
  failure_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  failure_unit_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  failure_integration_smoke: Object.freeze({ executes_unit_test_runtime_paths: false, dispatches_integration_smoke_runtime: false }),
  audit_failure_hint: Object.freeze({ audit_hint_detail_included: false }),
  hermes_failure_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
});

export function createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp354PermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP355_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp355Result({
    case_set_id: "time-expense-core-cp355-p06-closeout-p07-failure-foundation-case-set",
    source_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp354PermissionSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet(input);
  return freezeCp355Result({
    descriptor: "TimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP355_PACK_BINDING,
    source_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p06_closeout_p07_failure_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-355",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-355.time_expense_core_p06_closeout_p07_failure_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP355_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p06_closeout_p07_failure_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-355.time_expense_core_p06_closeout_p07_failure_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP355_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P06 descriptor scope is closed; continue RP11.P07.M03.S19 onward with the remaining failure rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp356Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_closeout_p07_failure_foundation_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP356_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP355_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-356" }),
  claude_edge_case_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_escalation_note: Object.freeze({ human_approval_route_required_before_runtime: true }),
});

export function createTimeExpenseCoreCp356FailureSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP356_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp356Result({
    case_set_id: "time-expense-core-cp356-failure-slice-case-set",
    source_p06_closeout_p07_failure_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp356FailureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp356FailureSliceCaseSet(input);
  return freezeCp356Result({
    descriptor: "TimeExpenseCoreCp356FailureSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP356_PACK_BINDING,
    source_p06_closeout_p07_failure_foundation_descriptor: upstreamDescriptor.descriptor,
    failure_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-356",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-356.time_expense_core_failure_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP356_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_failure_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-356.time_expense_core_failure_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP356_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P07.M04.S07 onward with the remaining failure rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp357Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_slice_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP357_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP356_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-357" }),
});

export function createTimeExpenseCoreCp357FailureBindingSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp356FailureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP357_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp357Result({
    case_set_id: "time-expense-core-cp357-failure-binding-slice-case-set",
    source_failure_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp357FailureBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp356FailureSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp357FailureBindingSliceCaseSet(input);
  return freezeCp357Result({
    descriptor: "TimeExpenseCoreCp357FailureBindingSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP357_PACK_BINDING,
    source_failure_slice_descriptor: upstreamDescriptor.descriptor,
    failure_binding_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-357",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-357.time_expense_core_failure_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP357_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_failure_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-357.time_expense_core_failure_binding_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP357_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P07.M04.S17 onward with the remaining failure rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp358Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_binding_slice_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP358_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP357_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-358" }),
});

export function createTimeExpenseCoreCp358FailureTailSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp357FailureBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP358_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp358Result({
    case_set_id: "time-expense-core-cp358-failure-tail-slice-case-set",
    source_failure_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp358FailureTailSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp357FailureBindingSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp358FailureTailSliceCaseSet(input);
  return freezeCp358Result({
    descriptor: "TimeExpenseCoreCp358FailureTailSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP358_PACK_BINDING,
    source_failure_binding_slice_descriptor: upstreamDescriptor.descriptor,
    failure_tail_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-358",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-358.time_expense_core_failure_tail_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP358_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_failure_tail_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-358.time_expense_core_failure_tail_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP358_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P07.M06.S15 onward with the remaining failure fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp359Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_tail_slice_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP359_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP358_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-359" }),
});

export function createTimeExpenseCoreCp359FailureFixtureSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp358FailureTailSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP359_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp359Result({
    case_set_id: "time-expense-core-cp359-failure-fixture-slice-case-set",
    source_failure_tail_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp359FailureFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp358FailureTailSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp359FailureFixtureSliceCaseSet(input);
  return freezeCp359Result({
    descriptor: "TimeExpenseCoreCp359FailureFixtureSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP359_PACK_BINDING,
    source_failure_tail_slice_descriptor: upstreamDescriptor.descriptor,
    failure_fixture_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-359",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-359.time_expense_core_failure_fixture_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP359_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_failure_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-359.time_expense_core_failure_fixture_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP359_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P07.M07.S05 onward with the remaining failure test rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp360Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_fixture_slice_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP360_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP359_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-360" }),
});

export function createTimeExpenseCoreCp360FailureHermesSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp359FailureFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP360_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp360Result({
    case_set_id: "time-expense-core-cp360-failure-hermes-slice-case-set",
    source_failure_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp360FailureHermesSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp359FailureFixtureSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp360FailureHermesSliceCaseSet(input);
  return freezeCp360Result({
    descriptor: "TimeExpenseCoreCp360FailureHermesSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP360_PACK_BINDING,
    source_failure_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    failure_hermes_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-360",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-360.time_expense_core_failure_hermes_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP360_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_failure_hermes_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-360.time_expense_core_failure_hermes_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP360_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP11.P07.M09.S03 onward with the remaining failure review rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp361Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_failure_hermes_slice_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP361_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP360_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-361" }),
  hermes_command_matrix: Object.freeze({ hermes_command_matrix_descriptor_only: true, executes_command_runtime: false }),
  evidence_field_list: Object.freeze({ evidence_field_list_descriptor_only: true }),
  changed_file_receipt: Object.freeze({ changed_file_receipt_descriptor_only: true }),
  command_result_receipt: Object.freeze({ command_result_receipt_descriptor_only: true, executes_command_runtime: false }),
  fixture_summary_receipt: Object.freeze({ fixture_payload_included: false }),
  permission_summary_receipt: Object.freeze({ permission_decision_detail_included: false }),
  audit_summary_receipt: Object.freeze({ audit_hint_detail_included: false }),
  no_real_data_receipt: Object.freeze({ real_client_data_loaded: false }),
  claude_dependency_marker: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_approval_marker: Object.freeze({ human_approval_route_required_before_runtime: true }),
  pass_semantics: Object.freeze({ verdict_semantics_descriptor_only: true }),
  pass_with_findings_semantics: Object.freeze({ verdict_semantics_descriptor_only: true }),
  block_semantics: Object.freeze({ verdict_semantics_descriptor_only: true }),
  evidence_template: Object.freeze({ evidence_template_descriptor_only: true }),
  validation_command_check: Object.freeze({ executes_command_runtime: false }),
  harness_boundary_note: Object.freeze({ harness_boundary_descriptor_only: true }),
  regression_receipt: Object.freeze({ regression_receipt_descriptor_only: true }),
  next_gate_readiness: Object.freeze({ next_gate_readiness_descriptor_only: true }),
});

export function createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp360FailureHermesSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP361_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp361Result({
    case_set_id: "time-expense-core-cp361-p07-closeout-p08-hermes-foundation-case-set",
    source_failure_hermes_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp360FailureHermesSliceDescriptor(input);
  const caseSet = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet(input);
  return freezeCp361Result({
    descriptor: "TimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP361_PACK_BINDING,
    source_failure_hermes_slice_descriptor: upstreamDescriptor.descriptor,
    p07_closeout_p08_hermes_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-361",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-361.time_expense_core_p07_closeout_p08_hermes_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP361_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p07_closeout_p08_hermes_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-361.time_expense_core_p07_closeout_p08_hermes_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP361_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P07 descriptor scope is closed; continue RP11.P08.M08.S02 onward with the remaining Hermes receipt rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp362Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_closeout_p08_hermes_foundation_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP362_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP361_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-362" }),
  architecture_review_questions: Object.freeze({ review_questions_descriptor_only: true }),
  security_review_questions: Object.freeze({ review_questions_descriptor_only: true }),
  permission_bypass_questions: Object.freeze({ permission_bypass_detected: false }),
  audit_completeness_questions: Object.freeze({ review_questions_descriptor_only: true }),
  missing_test_questions: Object.freeze({ review_questions_descriptor_only: true }),
  ui_leak_questions: Object.freeze({ leak_detected: false }),
  downstream_readiness_questions: Object.freeze({ review_questions_descriptor_only: true }),
  risk_register: Object.freeze({ risk_register_descriptor_only: true }),
  severity_taxonomy: Object.freeze({ severity_taxonomy_descriptor_only: true }),
  go_no_go_verdict_format: Object.freeze({ claude_final_approval_claimed: false }),
  finding_routing_map: Object.freeze({ finding_routing_descriptor_only: true }),
  human_approval_summary: Object.freeze({ human_final_approval_required: true }),
  claude_review_packet: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  closeout_criteria: Object.freeze({ closeout_criteria_descriptor_only: true }),
  pass_closeout_note: Object.freeze({ closeout_note_descriptor_only: true }),
  pass_with_findings_closeout_note: Object.freeze({ closeout_note_descriptor_only: true }),
  block_closeout_note: Object.freeze({ closeout_note_descriptor_only: true }),
  next_rp_dependency: Object.freeze({ next_rp_dependency_descriptor_only: true }),
  documentation_update: Object.freeze({ documentation_descriptor_only: true }),
});

export function createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP362_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp362Result({
    case_set_id: "time-expense-core-cp362-p08-closeout-p09-review-foundation-case-set",
    source_p07_closeout_p08_hermes_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet(input);
  return freezeCp362Result({
    descriptor: "TimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP362_PACK_BINDING,
    source_p07_closeout_p08_hermes_foundation_descriptor: upstreamDescriptor.descriptor,
    p08_closeout_p09_review_foundation_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-362",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-362.time_expense_core_p08_closeout_p09_review_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP362_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_p08_closeout_p09_review_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-362.time_expense_core_p08_closeout_p09_review_foundation_descriptor",
      gate: TIME_EXPENSE_CORE_CP362_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_subphase_id,
      open_scope: "RP11.P08 descriptor scope is closed; continue RP11.P09.M09.S01 onward with the remaining review rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp363Result(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_closeout_p09_review_foundation_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_time_entry_runtime: false,
    dispatches_rate_card_runtime: false,
    dispatches_expense_runtime: false,
    dispatches_disbursement_runtime: false,
    dispatches_integration_smoke_runtime: false,
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
    silent_success_detected: false,
    permission_bypass_detected: false,
    no_unauthorized_count_leak: true,
    deny_over_allow_enforced: true,
    cross_tenant_access_allowed: false,
    exposes_permission_decision_detail: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_blocked_claim_detail: false,
    exposes_lock_token: false,
    exposes_hermes_packet_body: false,
    exposes_fixture_payload: false,
    customer_safe_errors_only: true,
    no_write_attestation: TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION,
  });
}

const TIME_EXPENSE_CORE_CP363_ROW_EXTRAS = Object.freeze({
  ...TIME_EXPENSE_CORE_CP362_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/time-expense/README.md#cp00-363" }),
});

export function createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet(input = {}) {
  const upstream = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(TIME_EXPENSE_CORE_CP363_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => timeExpenseCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp363Result({
    case_set_id: "time-expense-core-cp363-review-closeout-slice-case-set",
    source_p08_closeout_p09_review_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(input = {}) {
  const upstreamDescriptor = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(input);
  const caseSet = createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet(input);
  return freezeCp363Result({
    descriptor: "TimeExpenseCoreCp363ReviewCloseoutSliceDescriptor",
    pack_binding: TIME_EXPENSE_CORE_CP363_PACK_BINDING,
    source_p08_closeout_p09_review_foundation_descriptor: upstreamDescriptor.descriptor,
    review_closeout_slice_case_set: caseSet,
    public_exports: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/time-expense/README.md#cp00-363",
    index_export_check: true,
    no_leak_guards: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H11.CP00-363.time_expense_core_review_closeout_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP363_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_time_expense_review_closeout_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C11.CP00-363.time_expense_core_review_closeout_slice_descriptor",
      gate: TIME_EXPENSE_CORE_CP363_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
      to_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_pack_id,
      next_subphase_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_subphase_id,
      open_scope: "RP11 descriptor scope is closed; continue RP12.P00.M00.S01 onward with the next program while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}
