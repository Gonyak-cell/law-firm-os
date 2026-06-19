import {
  BILLING_CORE_CP364_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP364_PACK_BINDING,
  BILLING_CORE_CP364_REQUIREMENTS,
  BILLING_CORE_CP365_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP365_PACK_BINDING,
  BILLING_CORE_CP365_REQUIREMENTS,
  BILLING_CORE_CP366_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP366_PACK_BINDING,
  BILLING_CORE_CP366_REQUIREMENTS,
  BILLING_CORE_CP367_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP367_PACK_BINDING,
  BILLING_CORE_CP367_REQUIREMENTS,
  BILLING_CORE_CP368_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP368_PACK_BINDING,
  BILLING_CORE_CP368_REQUIREMENTS,
  BILLING_CORE_CP369_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP369_PACK_BINDING,
  BILLING_CORE_CP369_REQUIREMENTS,
  BILLING_CORE_CP370_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP370_PACK_BINDING,
  BILLING_CORE_CP370_REQUIREMENTS,
  BILLING_CORE_CP371_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP371_PACK_BINDING,
  BILLING_CORE_CP371_REQUIREMENTS,
  BILLING_CORE_CP372_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP372_PACK_BINDING,
  BILLING_CORE_CP372_REQUIREMENTS,
  BILLING_CORE_CP373_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP373_PACK_BINDING,
  BILLING_CORE_CP373_REQUIREMENTS,
  BILLING_CORE_CP374_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP374_PACK_BINDING,
  BILLING_CORE_CP374_REQUIREMENTS,
  BILLING_CORE_CP375_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP375_PACK_BINDING,
  BILLING_CORE_CP375_REQUIREMENTS,
  BILLING_CORE_CP376_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP376_PACK_BINDING,
  BILLING_CORE_CP376_REQUIREMENTS,
  BILLING_CORE_CP377_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP377_PACK_BINDING,
  BILLING_CORE_CP377_REQUIREMENTS,
  BILLING_CORE_CP378_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP378_PACK_BINDING,
  BILLING_CORE_CP378_REQUIREMENTS,
  BILLING_CORE_CP379_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP379_PACK_BINDING,
  BILLING_CORE_CP379_REQUIREMENTS,
  BILLING_CORE_CP380_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP380_PACK_BINDING,
  BILLING_CORE_CP380_REQUIREMENTS,
  BILLING_CORE_CP381_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP381_PACK_BINDING,
  BILLING_CORE_CP381_REQUIREMENTS,
  BILLING_CORE_CP382_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP382_PACK_BINDING,
  BILLING_CORE_CP382_REQUIREMENTS,
  BILLING_CORE_CP383_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP383_PACK_BINDING,
  BILLING_CORE_CP383_REQUIREMENTS,
  BILLING_CORE_CP384_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP384_PACK_BINDING,
  BILLING_CORE_CP384_REQUIREMENTS,
  BILLING_CORE_CP385_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP385_PACK_BINDING,
  BILLING_CORE_CP385_REQUIREMENTS,
  BILLING_CORE_CP386_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP386_PACK_BINDING,
  BILLING_CORE_CP386_REQUIREMENTS,
  BILLING_CORE_CP387_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP387_PACK_BINDING,
  BILLING_CORE_CP387_REQUIREMENTS,
  BILLING_CORE_CP388_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP388_PACK_BINDING,
  BILLING_CORE_CP388_REQUIREMENTS,
  BILLING_CORE_CP389_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP389_PACK_BINDING,
  BILLING_CORE_CP389_REQUIREMENTS,
  BILLING_CORE_CP390_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP390_PACK_BINDING,
  BILLING_CORE_CP390_REQUIREMENTS,
  BILLING_CORE_CP391_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP391_PACK_BINDING,
  BILLING_CORE_CP391_REQUIREMENTS,
  BILLING_CORE_PROGRAM_CONTRACT,
} from "./registry.js";

const BILLING_CORE_SECRET_MATERIAL_FIELD_PATTERN =
  /(^|_)(secret|credential|access_token|api_key|password|private_key|client_secret|refresh_token|id_token|signed_url|lock_token)($|_)/i;

export const BILLING_CORE_SECURE_SECRET_HANDLING_POLICY = Object.freeze({
  accepts_secret_material: false,
  credential_or_secret_included: false,
  secret_material_included: false,
  exposes_secret_material: false,
});

export function assertBillingCoreNoSecretMaterialIncluded(payload = {}) {
  const forbiddenFields = Object.keys(payload).filter((field) => BILLING_CORE_SECRET_MATERIAL_FIELD_PATTERN.test(field));
  if (forbiddenFields.length > 0) {
    throw new Error(`Billing Core payload must not include secret material fields: ${forbiddenFields.join(", ")}`);
  }
  return Object.freeze({
    ...BILLING_CORE_SECURE_SECRET_HANDLING_POLICY,
    checked_field_count: Object.keys(payload).length,
    forbidden_field_count: 0,
  });
}

export function billingCoreRowKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function freezeCp364Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP364_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_time_expense_core_pack_id: BILLING_CORE_CP364_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP364_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP364_ROW_EXTRAS = Object.freeze({
  scope_inventory: Object.freeze({
    scope_descriptor_only: true,
    program_scope: BILLING_CORE_PROGRAM_CONTRACT.program_scope,
  }),
  acceptance_gate_definition: Object.freeze({
    hermes_gate: BILLING_CORE_CP364_PACK_BINDING.hermes_gate,
    claude_gate: BILLING_CORE_CP364_PACK_BINDING.claude_gate,
  }),
  non_goal_boundary: Object.freeze({
    billing_runtime_opened: false,
    proforma_runtime_opened: false,
    write_down_runtime_opened: false,
    invoice_runtime_opened: false,
  }),
  target_file_map: Object.freeze({
    target_package: "packages/billing",
    target_contract: "contracts/billing-core-contract.json",
    target_validator: "scripts/validate-rp12-billing-core-contract.mjs",
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
  package_directory_layout: Object.freeze({ package_path: "packages/billing" }),
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

export function createBillingCoreCp364ScopeContractFoundationCaseSet(input = {}) {
  void input;
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP364_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP364_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp364Result({
    case_set_id: "billing-core-cp364-scope-contract-foundation-case-set",
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp364ScopeContractFoundationDescriptor(input = {}) {
  const caseSet = createBillingCoreCp364ScopeContractFoundationCaseSet(input);
  return freezeCp364Result({
    descriptor: "BillingCoreCp364ScopeContractFoundationDescriptor",
    pack_binding: BILLING_CORE_CP364_PACK_BINDING,
    program_contract: BILLING_CORE_PROGRAM_CONTRACT,
    scope_contract_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP364_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-364",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP364_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP364_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-364.billing_core_scope_contract_foundation_descriptor",
      gate: BILLING_CORE_CP364_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_scope_contract_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-364.billing_core_scope_contract_foundation_descriptor",
      gate: BILLING_CORE_CP364_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP364_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP364_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP364_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP364_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP364_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P01.M02.S09 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp365Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP365_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_scope_contract_foundation_pack_id: BILLING_CORE_CP365_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP365_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP365_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP364_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-365" }),
  index_export_check: Object.freeze({ index_export_check: true }),
});

export function createBillingCoreCp365ModelFoundationSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp364ScopeContractFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP365_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP365_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp365Result({
    case_set_id: "billing-core-cp365-model-foundation-slice-case-set",
    source_scope_contract_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp365ModelFoundationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp364ScopeContractFoundationDescriptor(input);
  const caseSet = createBillingCoreCp365ModelFoundationSliceCaseSet(input);
  return freezeCp365Result({
    descriptor: "BillingCoreCp365ModelFoundationSliceDescriptor",
    pack_binding: BILLING_CORE_CP365_PACK_BINDING,
    source_scope_contract_foundation_descriptor: upstreamDescriptor.descriptor,
    model_foundation_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP365_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-365",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP365_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP365_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-365.billing_core_model_foundation_slice_descriptor",
      gate: BILLING_CORE_CP365_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_model_foundation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-365.billing_core_model_foundation_slice_descriptor",
      gate: BILLING_CORE_CP365_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP365_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP365_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP365_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP365_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP365_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P01.M04.S07 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp366Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP366_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_model_foundation_slice_pack_id: BILLING_CORE_CP366_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP366_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP366_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP365_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-366" }),
});

export function createBillingCoreCp366WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp365ModelFoundationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP366_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP366_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp366Result({
    case_set_id: "billing-core-cp366-workflow-permission-slice-case-set",
    source_model_foundation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp366WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp365ModelFoundationSliceDescriptor(input);
  const caseSet = createBillingCoreCp366WorkflowPermissionSliceCaseSet(input);
  return freezeCp366Result({
    descriptor: "BillingCoreCp366WorkflowPermissionSliceDescriptor",
    pack_binding: BILLING_CORE_CP366_PACK_BINDING,
    source_model_foundation_slice_descriptor: upstreamDescriptor.descriptor,
    workflow_permission_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP366_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-366",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP366_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP366_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-366.billing_core_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP366_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-366.billing_core_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP366_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP366_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP366_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP366_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP366_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP366_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P01.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp367Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP367_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_workflow_permission_slice_pack_id: BILLING_CORE_CP367_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP367_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP367_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP366_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-367" }),
});

export function createBillingCoreCp367P01CloseoutP02FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp366WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP367_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP367_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp367Result({
    case_set_id: "billing-core-cp367-p01-closeout-p02-foundation-case-set",
    source_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp367P01CloseoutP02FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp366WorkflowPermissionSliceDescriptor(input);
  const caseSet = createBillingCoreCp367P01CloseoutP02FoundationCaseSet(input);
  return freezeCp367Result({
    descriptor: "BillingCoreCp367P01CloseoutP02FoundationDescriptor",
    pack_binding: BILLING_CORE_CP367_PACK_BINDING,
    source_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p01_closeout_p02_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP367_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-367",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP367_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP367_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-367.billing_core_p01_closeout_p02_foundation_descriptor",
      gate: BILLING_CORE_CP367_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p01_closeout_p02_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-367.billing_core_p01_closeout_p02_foundation_descriptor",
      gate: BILLING_CORE_CP367_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP367_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP367_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP367_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP367_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP367_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P02.M03.S01 onward with the P02 primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp368Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP368_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p01_closeout_p02_foundation_pack_id: BILLING_CORE_CP368_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP368_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP368_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP367_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-368" }),
});

export function createBillingCoreCp368P02ImplementationSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp367P01CloseoutP02FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP368_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP368_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp368Result({
    case_set_id: "billing-core-cp368-p02-implementation-slice-case-set",
    source_p01_closeout_p02_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp368P02ImplementationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp367P01CloseoutP02FoundationDescriptor(input);
  const caseSet = createBillingCoreCp368P02ImplementationSliceCaseSet(input);
  return freezeCp368Result({
    descriptor: "BillingCoreCp368P02ImplementationSliceDescriptor",
    pack_binding: BILLING_CORE_CP368_PACK_BINDING,
    source_p01_closeout_p02_foundation_descriptor: upstreamDescriptor.descriptor,
    p02_implementation_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP368_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-368",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP368_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP368_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-368.billing_core_p02_implementation_slice_descriptor",
      gate: BILLING_CORE_CP368_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p02_implementation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-368.billing_core_p02_implementation_slice_descriptor",
      gate: BILLING_CORE_CP368_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP368_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP368_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP368_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP368_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP368_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P02.M04.S19 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp369Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP369_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_implementation_slice_pack_id: BILLING_CORE_CP369_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP369_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP369_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP368_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-369" }),
});

export function createBillingCoreCp369P02PermissionFixtureSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp368P02ImplementationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP369_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP369_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp369Result({
    case_set_id: "billing-core-cp369-p02-permission-fixture-slice-case-set",
    source_p02_implementation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp369P02PermissionFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp368P02ImplementationSliceDescriptor(input);
  const caseSet = createBillingCoreCp369P02PermissionFixtureSliceCaseSet(input);
  return freezeCp369Result({
    descriptor: "BillingCoreCp369P02PermissionFixtureSliceDescriptor",
    pack_binding: BILLING_CORE_CP369_PACK_BINDING,
    source_p02_implementation_slice_descriptor: upstreamDescriptor.descriptor,
    p02_permission_fixture_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP369_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-369",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP369_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP369_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-369.billing_core_p02_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP369_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p02_permission_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-369.billing_core_p02_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP369_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP369_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP369_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP369_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP369_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP369_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P02.M06.S15 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp370Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP370_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_permission_fixture_slice_pack_id: BILLING_CORE_CP370_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP370_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP370_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP369_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-370" }),
});

export function createBillingCoreCp370P02FixtureTestSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp369P02PermissionFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP370_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP370_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp370Result({
    case_set_id: "billing-core-cp370-p02-fixture-test-slice-case-set",
    source_p02_permission_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp370P02FixtureTestSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp369P02PermissionFixtureSliceDescriptor(input);
  const caseSet = createBillingCoreCp370P02FixtureTestSliceCaseSet(input);
  return freezeCp370Result({
    descriptor: "BillingCoreCp370P02FixtureTestSliceDescriptor",
    pack_binding: BILLING_CORE_CP370_PACK_BINDING,
    source_p02_permission_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p02_fixture_test_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP370_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-370",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP370_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP370_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-370.billing_core_p02_fixture_test_slice_descriptor",
      gate: BILLING_CORE_CP370_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p02_fixture_test_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-370.billing_core_p02_fixture_test_slice_descriptor",
      gate: BILLING_CORE_CP370_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP370_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP370_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP370_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP370_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP370_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P02.M07.S03 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp371Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP371_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_fixture_test_slice_pack_id: BILLING_CORE_CP371_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP371_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP371_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP370_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-371" }),
});

export function createBillingCoreCp371P02TestSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp370P02FixtureTestSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP371_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP371_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp371Result({
    case_set_id: "billing-core-cp371-p02-test-slice-case-set",
    source_p02_fixture_test_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp371P02TestSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp370P02FixtureTestSliceDescriptor(input);
  const caseSet = createBillingCoreCp371P02TestSliceCaseSet(input);
  return freezeCp371Result({
    descriptor: "BillingCoreCp371P02TestSliceDescriptor",
    pack_binding: BILLING_CORE_CP371_PACK_BINDING,
    source_p02_fixture_test_slice_descriptor: upstreamDescriptor.descriptor,
    p02_test_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP371_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-371",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP371_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP371_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-371.billing_core_p02_test_slice_descriptor",
      gate: BILLING_CORE_CP371_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p02_test_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-371.billing_core_p02_test_slice_descriptor",
      gate: BILLING_CORE_CP371_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP371_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP371_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP371_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP371_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP371_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P02.M07.S13 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp372Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP372_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_test_slice_pack_id: BILLING_CORE_CP372_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP372_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP372_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP371_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-372" }),
});

export function createBillingCoreCp372P02TestHermesSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp371P02TestSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP372_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP372_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp372Result({
    case_set_id: "billing-core-cp372-p02-test-hermes-slice-case-set",
    source_p02_test_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp372P02TestHermesSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp371P02TestSliceDescriptor(input);
  const caseSet = createBillingCoreCp372P02TestHermesSliceCaseSet(input);
  return freezeCp372Result({
    descriptor: "BillingCoreCp372P02TestHermesSliceDescriptor",
    pack_binding: BILLING_CORE_CP372_PACK_BINDING,
    source_p02_test_slice_descriptor: upstreamDescriptor.descriptor,
    p02_test_hermes_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP372_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-372",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP372_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP372_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-372.billing_core_p02_test_hermes_slice_descriptor",
      gate: BILLING_CORE_CP372_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p02_test_hermes_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-372.billing_core_p02_test_hermes_slice_descriptor",
      gate: BILLING_CORE_CP372_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP372_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP372_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP372_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP372_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP372_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P02.M09.S09 onward with the remaining Claude review rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp373Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP373_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_test_hermes_slice_pack_id: BILLING_CORE_CP373_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP373_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP373_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP372_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-373" }),
});

export function createBillingCoreCp373P02CloseoutP03FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp372P02TestHermesSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP373_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP373_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp373Result({
    case_set_id: "billing-core-cp373-p02-closeout-p03-foundation-case-set",
    source_p02_test_hermes_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp373P02CloseoutP03FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp372P02TestHermesSliceDescriptor(input);
  const caseSet = createBillingCoreCp373P02CloseoutP03FoundationCaseSet(input);
  return freezeCp373Result({
    descriptor: "BillingCoreCp373P02CloseoutP03FoundationDescriptor",
    pack_binding: BILLING_CORE_CP373_PACK_BINDING,
    source_p02_test_hermes_slice_descriptor: upstreamDescriptor.descriptor,
    p02_closeout_p03_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP373_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-373",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP373_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP373_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-373.billing_core_p02_closeout_p03_foundation_descriptor",
      gate: BILLING_CORE_CP373_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p02_closeout_p03_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-373.billing_core_p02_closeout_p03_foundation_descriptor",
      gate: BILLING_CORE_CP373_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP373_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP373_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP373_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP373_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP373_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P03.M06.S13 onward with the P03 test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp374Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP374_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p02_closeout_p03_foundation_pack_id: BILLING_CORE_CP374_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP374_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP374_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP373_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-374" }),
});

export function createBillingCoreCp374P03CloseoutP04FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp373P02CloseoutP03FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP374_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP374_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp374Result({
    case_set_id: "billing-core-cp374-p03-closeout-p04-foundation-case-set",
    source_p02_closeout_p03_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp374P03CloseoutP04FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp373P02CloseoutP03FoundationDescriptor(input);
  const caseSet = createBillingCoreCp374P03CloseoutP04FoundationCaseSet(input);
  return freezeCp374Result({
    descriptor: "BillingCoreCp374P03CloseoutP04FoundationDescriptor",
    pack_binding: BILLING_CORE_CP374_PACK_BINDING,
    source_p02_closeout_p03_foundation_descriptor: upstreamDescriptor.descriptor,
    p03_closeout_p04_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP374_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-374",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP374_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP374_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-374.billing_core_p03_closeout_p04_foundation_descriptor",
      gate: BILLING_CORE_CP374_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p03_closeout_p04_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-374.billing_core_p03_closeout_p04_foundation_descriptor",
      gate: BILLING_CORE_CP374_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP374_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP374_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP374_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP374_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP374_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P04.M03.S21 onward with the P04 secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp375Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP375_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p03_closeout_p04_foundation_pack_id: BILLING_CORE_CP375_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP375_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP375_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP374_ROW_EXTRAS,
  documentation_entry: Object.freeze({ documentation_entry: "packages/billing/README.md#cp00-375" }),
});

export function createBillingCoreCp375P04WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp374P03CloseoutP04FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP375_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP375_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp375Result({
    case_set_id: "billing-core-cp375-p04-workflow-permission-slice-case-set",
    source_p03_closeout_p04_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp375P04WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp374P03CloseoutP04FoundationDescriptor(input);
  const caseSet = createBillingCoreCp375P04WorkflowPermissionSliceCaseSet(input);
  return freezeCp375Result({
    descriptor: "BillingCoreCp375P04WorkflowPermissionSliceDescriptor",
    pack_binding: BILLING_CORE_CP375_PACK_BINDING,
    source_p03_closeout_p04_foundation_descriptor: upstreamDescriptor.descriptor,
    p04_workflow_permission_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP375_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-375",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP375_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP375_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-375.billing_core_p04_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP375_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p04_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-375.billing_core_p04_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP375_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP375_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP375_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP375_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP375_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP375_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P04.M05.S17 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp376Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP376_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_workflow_permission_slice_pack_id: BILLING_CORE_CP376_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP376_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP376_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP375_ROW_EXTRAS,
});

export function createBillingCoreCp376P04PermissionFixtureSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp375P04WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP376_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP376_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp376Result({
    case_set_id: "billing-core-cp376-p04-permission-fixture-slice-case-set",
    source_p04_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp376P04PermissionFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp375P04WorkflowPermissionSliceDescriptor(input);
  const caseSet = createBillingCoreCp376P04PermissionFixtureSliceCaseSet(input);
  return freezeCp376Result({
    descriptor: "BillingCoreCp376P04PermissionFixtureSliceDescriptor",
    pack_binding: BILLING_CORE_CP376_PACK_BINDING,
    source_p04_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p04_permission_fixture_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP376_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-376",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP376_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP376_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-376.billing_core_p04_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP376_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p04_permission_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-376.billing_core_p04_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP376_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP376_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP376_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP376_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP376_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP376_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P04.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp377Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP377_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_permission_fixture_slice_pack_id: BILLING_CORE_CP377_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP377_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP377_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP376_ROW_EXTRAS,
});

export function createBillingCoreCp377P04CloseoutP05FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp376P04PermissionFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP377_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP377_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp377Result({
    case_set_id: "billing-core-cp377-p04-closeout-p05-foundation-case-set",
    source_p04_permission_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp377P04CloseoutP05FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp376P04PermissionFixtureSliceDescriptor(input);
  const caseSet = createBillingCoreCp377P04CloseoutP05FoundationCaseSet(input);
  return freezeCp377Result({
    descriptor: "BillingCoreCp377P04CloseoutP05FoundationDescriptor",
    pack_binding: BILLING_CORE_CP377_PACK_BINDING,
    source_p04_permission_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p04_closeout_p05_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP377_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-377",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP377_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP377_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-377.billing_core_p04_closeout_p05_foundation_descriptor",
      gate: BILLING_CORE_CP377_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p04_closeout_p05_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-377.billing_core_p04_closeout_p05_foundation_descriptor",
      gate: BILLING_CORE_CP377_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP377_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP377_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP377_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP377_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP377_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P05.M03.S09 onward with the P05 primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp378Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP378_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p04_closeout_p05_foundation_pack_id: BILLING_CORE_CP378_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP378_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP378_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP377_ROW_EXTRAS,
});

export function createBillingCoreCp378P05ImplementationSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp377P04CloseoutP05FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP378_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP378_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp378Result({
    case_set_id: "billing-core-cp378-p05-implementation-slice-case-set",
    source_p04_closeout_p05_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp378P05ImplementationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp377P04CloseoutP05FoundationDescriptor(input);
  const caseSet = createBillingCoreCp378P05ImplementationSliceCaseSet(input);
  return freezeCp378Result({
    descriptor: "BillingCoreCp378P05ImplementationSliceDescriptor",
    pack_binding: BILLING_CORE_CP378_PACK_BINDING,
    source_p04_closeout_p05_foundation_descriptor: upstreamDescriptor.descriptor,
    p05_implementation_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP378_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-378",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP378_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP378_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-378.billing_core_p05_implementation_slice_descriptor",
      gate: BILLING_CORE_CP378_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p05_implementation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-378.billing_core_p05_implementation_slice_descriptor",
      gate: BILLING_CORE_CP378_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP378_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP378_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP378_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP378_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP378_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P05.M03.S19 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp379Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP379_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_implementation_slice_pack_id: BILLING_CORE_CP379_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP379_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP379_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP378_ROW_EXTRAS,
});

export function createBillingCoreCp379P05CloseoutP06FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp378P05ImplementationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP379_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP379_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp379Result({
    case_set_id: "billing-core-cp379-p05-closeout-p06-foundation-case-set",
    source_p05_implementation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp379P05CloseoutP06FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp378P05ImplementationSliceDescriptor(input);
  const caseSet = createBillingCoreCp379P05CloseoutP06FoundationCaseSet(input);
  return freezeCp379Result({
    descriptor: "BillingCoreCp379P05CloseoutP06FoundationDescriptor",
    pack_binding: BILLING_CORE_CP379_PACK_BINDING,
    source_p05_implementation_slice_descriptor: upstreamDescriptor.descriptor,
    p05_closeout_p06_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP379_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-379",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP379_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP379_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-379.billing_core_p05_closeout_p06_foundation_descriptor",
      gate: BILLING_CORE_CP379_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p05_closeout_p06_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-379.billing_core_p05_closeout_p06_foundation_descriptor",
      gate: BILLING_CORE_CP379_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP379_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP379_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP379_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP379_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP379_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P06.M00.S07 onward with the P06 scope inventory rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp380Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP380_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p05_closeout_p06_foundation_pack_id: BILLING_CORE_CP380_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP380_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP380_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP379_ROW_EXTRAS,
});

export function createBillingCoreCp380P06FoundationSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp379P05CloseoutP06FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP380_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP380_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp380Result({
    case_set_id: "billing-core-cp380-p06-foundation-slice-case-set",
    source_p05_closeout_p06_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp380P06FoundationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp379P05CloseoutP06FoundationDescriptor(input);
  const caseSet = createBillingCoreCp380P06FoundationSliceCaseSet(input);
  return freezeCp380Result({
    descriptor: "BillingCoreCp380P06FoundationSliceDescriptor",
    pack_binding: BILLING_CORE_CP380_PACK_BINDING,
    source_p05_closeout_p06_foundation_descriptor: upstreamDescriptor.descriptor,
    p06_foundation_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP380_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-380",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP380_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP380_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-380.billing_core_p06_foundation_slice_descriptor",
      gate: BILLING_CORE_CP380_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p06_foundation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-380.billing_core_p06_foundation_slice_descriptor",
      gate: BILLING_CORE_CP380_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP380_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP380_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP380_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP380_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP380_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P06.M07.S07 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp381Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP381_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_foundation_slice_pack_id: BILLING_CORE_CP381_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP381_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP381_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP380_ROW_EXTRAS,
});

export function createBillingCoreCp381P06TestHermesSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp380P06FoundationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP381_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP381_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp381Result({
    case_set_id: "billing-core-cp381-p06-test-hermes-slice-case-set",
    source_p06_foundation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp381P06TestHermesSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp380P06FoundationSliceDescriptor(input);
  const caseSet = createBillingCoreCp381P06TestHermesSliceCaseSet(input);
  return freezeCp381Result({
    descriptor: "BillingCoreCp381P06TestHermesSliceDescriptor",
    pack_binding: BILLING_CORE_CP381_PACK_BINDING,
    source_p06_foundation_slice_descriptor: upstreamDescriptor.descriptor,
    p06_test_hermes_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP381_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-381",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP381_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP381_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-381.billing_core_p06_test_hermes_slice_descriptor",
      gate: BILLING_CORE_CP381_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p06_test_hermes_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-381.billing_core_p06_test_hermes_slice_descriptor",
      gate: BILLING_CORE_CP381_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP381_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP381_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP381_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP381_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP381_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P06.M09.S03 onward with the remaining Claude review rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp382Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP382_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_test_hermes_slice_pack_id: BILLING_CORE_CP382_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP382_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP382_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP381_ROW_EXTRAS,
});

export function createBillingCoreCp382P06CloseoutP07FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp381P06TestHermesSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP382_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP382_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp382Result({
    case_set_id: "billing-core-cp382-p06-closeout-p07-foundation-case-set",
    source_p06_test_hermes_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp382P06CloseoutP07FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp381P06TestHermesSliceDescriptor(input);
  const caseSet = createBillingCoreCp382P06CloseoutP07FoundationCaseSet(input);
  return freezeCp382Result({
    descriptor: "BillingCoreCp382P06CloseoutP07FoundationDescriptor",
    pack_binding: BILLING_CORE_CP382_PACK_BINDING,
    source_p06_test_hermes_slice_descriptor: upstreamDescriptor.descriptor,
    p06_closeout_p07_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP382_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-382",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP382_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP382_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-382.billing_core_p06_closeout_p07_foundation_descriptor",
      gate: BILLING_CORE_CP382_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p06_closeout_p07_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-382.billing_core_p06_closeout_p07_foundation_descriptor",
      gate: BILLING_CORE_CP382_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP382_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP382_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP382_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP382_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP382_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P07.M05.S05 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp383Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP383_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p06_closeout_p07_foundation_pack_id: BILLING_CORE_CP383_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP383_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP383_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP382_ROW_EXTRAS,
});

export function createBillingCoreCp383P07PermissionSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp382P06CloseoutP07FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP383_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP383_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp383Result({
    case_set_id: "billing-core-cp383-p07-permission-slice-case-set",
    source_p06_closeout_p07_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp383P07PermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp382P06CloseoutP07FoundationDescriptor(input);
  const caseSet = createBillingCoreCp383P07PermissionSliceCaseSet(input);
  return freezeCp383Result({
    descriptor: "BillingCoreCp383P07PermissionSliceDescriptor",
    pack_binding: BILLING_CORE_CP383_PACK_BINDING,
    source_p06_closeout_p07_foundation_descriptor: upstreamDescriptor.descriptor,
    p07_permission_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP383_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-383",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP383_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP383_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-383.billing_core_p07_permission_slice_descriptor",
      gate: BILLING_CORE_CP383_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p07_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-383.billing_core_p07_permission_slice_descriptor",
      gate: BILLING_CORE_CP383_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP383_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP383_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP383_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP383_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP383_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P07.M05.S15 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp384Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP384_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_permission_slice_pack_id: BILLING_CORE_CP384_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP384_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP384_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP383_ROW_EXTRAS,
});

export function createBillingCoreCp384P07PermissionFixtureSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp383P07PermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP384_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP384_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp384Result({
    case_set_id: "billing-core-cp384-p07-permission-fixture-slice-case-set",
    source_p07_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp384P07PermissionFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp383P07PermissionSliceDescriptor(input);
  const caseSet = createBillingCoreCp384P07PermissionFixtureSliceCaseSet(input);
  return freezeCp384Result({
    descriptor: "BillingCoreCp384P07PermissionFixtureSliceDescriptor",
    pack_binding: BILLING_CORE_CP384_PACK_BINDING,
    source_p07_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p07_permission_fixture_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP384_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-384",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP384_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP384_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-384.billing_core_p07_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP384_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p07_permission_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-384.billing_core_p07_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP384_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP384_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP384_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP384_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP384_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP384_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P07.M06.S03 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp385Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP385_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_permission_fixture_slice_pack_id: BILLING_CORE_CP385_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP385_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP385_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP384_ROW_EXTRAS,
});

export function createBillingCoreCp385P07CloseoutP08FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp384P07PermissionFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP385_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP385_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp385Result({
    case_set_id: "billing-core-cp385-p07-closeout-p08-foundation-case-set",
    source_p07_permission_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp385P07CloseoutP08FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp384P07PermissionFixtureSliceDescriptor(input);
  const caseSet = createBillingCoreCp385P07CloseoutP08FoundationCaseSet(input);
  return freezeCp385Result({
    descriptor: "BillingCoreCp385P07CloseoutP08FoundationDescriptor",
    pack_binding: BILLING_CORE_CP385_PACK_BINDING,
    source_p07_permission_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p07_closeout_p08_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP385_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-385",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP385_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP385_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-385.billing_core_p07_closeout_p08_foundation_descriptor",
      gate: BILLING_CORE_CP385_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p07_closeout_p08_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-385.billing_core_p07_closeout_p08_foundation_descriptor",
      gate: BILLING_CORE_CP385_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP385_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP385_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP385_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP385_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP385_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P08.M02.S15 onward with the remaining type and shape rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp386Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP386_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p07_closeout_p08_foundation_pack_id: BILLING_CORE_CP386_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP386_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP386_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP385_ROW_EXTRAS,
});

export function createBillingCoreCp386P08ImplementationSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp385P07CloseoutP08FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP386_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP386_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp386Result({
    case_set_id: "billing-core-cp386-p08-implementation-slice-case-set",
    source_p07_closeout_p08_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp386P08ImplementationSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp385P07CloseoutP08FoundationDescriptor(input);
  const caseSet = createBillingCoreCp386P08ImplementationSliceCaseSet(input);
  return freezeCp386Result({
    descriptor: "BillingCoreCp386P08ImplementationSliceDescriptor",
    pack_binding: BILLING_CORE_CP386_PACK_BINDING,
    source_p07_closeout_p08_foundation_descriptor: upstreamDescriptor.descriptor,
    p08_implementation_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP386_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-386",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP386_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP386_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-386.billing_core_p08_implementation_slice_descriptor",
      gate: BILLING_CORE_CP386_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p08_implementation_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-386.billing_core_p08_implementation_slice_descriptor",
      gate: BILLING_CORE_CP386_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP386_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP386_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP386_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP386_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP386_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P08.M04.S13 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp387Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP387_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_implementation_slice_pack_id: BILLING_CORE_CP387_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP387_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP387_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP386_ROW_EXTRAS,
});

export function createBillingCoreCp387P08WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp386P08ImplementationSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP387_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP387_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp387Result({
    case_set_id: "billing-core-cp387-p08-workflow-permission-slice-case-set",
    source_p08_implementation_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp387P08WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp386P08ImplementationSliceDescriptor(input);
  const caseSet = createBillingCoreCp387P08WorkflowPermissionSliceCaseSet(input);
  return freezeCp387Result({
    descriptor: "BillingCoreCp387P08WorkflowPermissionSliceDescriptor",
    pack_binding: BILLING_CORE_CP387_PACK_BINDING,
    source_p08_implementation_slice_descriptor: upstreamDescriptor.descriptor,
    p08_workflow_permission_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP387_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-387",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP387_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP387_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-387.billing_core_p08_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP387_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p08_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-387.billing_core_p08_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP387_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP387_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP387_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP387_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP387_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP387_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P08.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp388Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP388_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_workflow_permission_slice_pack_id: BILLING_CORE_CP388_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP388_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP388_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP387_ROW_EXTRAS,
});

export function createBillingCoreCp388P08CloseoutP09FoundationCaseSet(input = {}) {
  const upstream = createBillingCoreCp387P08WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP388_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP388_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp388Result({
    case_set_id: "billing-core-cp388-p08-closeout-p09-foundation-case-set",
    source_p08_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp388P08CloseoutP09FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp387P08WorkflowPermissionSliceDescriptor(input);
  const caseSet = createBillingCoreCp388P08CloseoutP09FoundationCaseSet(input);
  return freezeCp388Result({
    descriptor: "BillingCoreCp388P08CloseoutP09FoundationDescriptor",
    pack_binding: BILLING_CORE_CP388_PACK_BINDING,
    source_p08_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p08_closeout_p09_foundation_case_set: caseSet,
    public_exports: BILLING_CORE_CP388_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-388",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP388_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP388_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-388.billing_core_p08_closeout_p09_foundation_descriptor",
      gate: BILLING_CORE_CP388_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p08_closeout_p09_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-388.billing_core_p08_closeout_p09_foundation_descriptor",
      gate: BILLING_CORE_CP388_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP388_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP388_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP388_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP388_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP388_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P09.M04.S01 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp389Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP389_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p08_closeout_p09_foundation_pack_id: BILLING_CORE_CP389_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP389_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP389_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP388_ROW_EXTRAS,
});

export function createBillingCoreCp389P09WorkflowPermissionSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp388P08CloseoutP09FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP389_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP389_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp389Result({
    case_set_id: "billing-core-cp389-p09-workflow-permission-slice-case-set",
    source_p08_closeout_p09_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp389P09WorkflowPermissionSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp388P08CloseoutP09FoundationDescriptor(input);
  const caseSet = createBillingCoreCp389P09WorkflowPermissionSliceCaseSet(input);
  return freezeCp389Result({
    descriptor: "BillingCoreCp389P09WorkflowPermissionSliceDescriptor",
    pack_binding: BILLING_CORE_CP389_PACK_BINDING,
    source_p08_closeout_p09_foundation_descriptor: upstreamDescriptor.descriptor,
    p09_workflow_permission_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP389_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-389",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP389_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP389_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-389.billing_core_p09_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP389_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p09_workflow_permission_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-389.billing_core_p09_workflow_permission_slice_descriptor",
      gate: BILLING_CORE_CP389_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP389_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP389_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP389_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP389_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP389_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P09.M05.S21 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp390Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP390_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p09_workflow_permission_slice_pack_id: BILLING_CORE_CP390_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP390_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP390_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP389_ROW_EXTRAS,
});

export function createBillingCoreCp390P09PermissionFixtureSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp389P09WorkflowPermissionSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP390_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP390_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp390Result({
    case_set_id: "billing-core-cp390-p09-permission-fixture-slice-case-set",
    source_p09_workflow_permission_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp390P09PermissionFixtureSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp389P09WorkflowPermissionSliceDescriptor(input);
  const caseSet = createBillingCoreCp390P09PermissionFixtureSliceCaseSet(input);
  return freezeCp390Result({
    descriptor: "BillingCoreCp390P09PermissionFixtureSliceDescriptor",
    pack_binding: BILLING_CORE_CP390_PACK_BINDING,
    source_p09_workflow_permission_slice_descriptor: upstreamDescriptor.descriptor,
    p09_permission_fixture_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP390_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-390",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP390_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP390_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-390.billing_core_p09_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP390_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p09_permission_fixture_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-390.billing_core_p09_permission_fixture_slice_descriptor",
      gate: BILLING_CORE_CP390_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP390_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP390_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP390_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP390_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP390_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP12.P09.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp391Result(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP391_PACK_BINDING.pack_id,
    program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
    source_p09_permission_fixture_slice_pack_id: BILLING_CORE_CP391_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
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
    no_write_attestation: BILLING_CORE_CP391_NO_WRITE_ATTESTATION,
  });
}

const BILLING_CORE_CP391_ROW_EXTRAS = Object.freeze({
  ...BILLING_CORE_CP390_ROW_EXTRAS,
});

export function createBillingCoreCp391P09CloseoutSliceCaseSet(input = {}) {
  const upstream = createBillingCoreCp390P09PermissionFixtureSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(BILLING_CORE_CP391_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: BILLING_CORE_CP391_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => billingCoreRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp391Result({
    case_set_id: "billing-core-cp391-p09-closeout-slice-case-set",
    source_p09_permission_fixture_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createBillingCoreCp391P09CloseoutSliceDescriptor(input = {}) {
  const upstreamDescriptor = createBillingCoreCp390P09PermissionFixtureSliceDescriptor(input);
  const caseSet = createBillingCoreCp391P09CloseoutSliceCaseSet(input);
  return freezeCp391Result({
    descriptor: "BillingCoreCp391P09CloseoutSliceDescriptor",
    pack_binding: BILLING_CORE_CP391_PACK_BINDING,
    source_p09_permission_fixture_slice_descriptor: upstreamDescriptor.descriptor,
    p09_closeout_slice_case_set: caseSet,
    public_exports: BILLING_CORE_CP391_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/billing/README.md#cp00-391",
    index_export_check: true,
    no_leak_guards: BILLING_CORE_CP391_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: BILLING_CORE_CP391_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H12.CP00-391.billing_core_p09_closeout_slice_descriptor",
      gate: BILLING_CORE_CP391_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_billing_p09_closeout_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C12.CP00-391.billing_core_p09_closeout_slice_descriptor",
      gate: BILLING_CORE_CP391_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: BILLING_CORE_CP391_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: BILLING_CORE_CP391_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: BILLING_CORE_CP391_PACK_BINDING.pack_id,
      to_pack_id: BILLING_CORE_CP391_PACK_BINDING.next_pack_id,
      next_subphase_id: BILLING_CORE_CP391_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP13.P00.M00.S01 onward with the next program while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}
