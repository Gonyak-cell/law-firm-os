import {
  MIGRATION_PLATFORM_CP756_PACK_BINDING,
  MIGRATION_PLATFORM_CP756_REQUIREMENTS,
  MIGRATION_PLATFORM_CP757_PACK_BINDING,
  MIGRATION_PLATFORM_CP757_REQUIREMENTS,
  MIGRATION_PLATFORM_CP758_PACK_BINDING,
  MIGRATION_PLATFORM_CP758_REQUIREMENTS,
  MIGRATION_PLATFORM_CP759_PACK_BINDING,
  MIGRATION_PLATFORM_CP759_REQUIREMENTS,
  MIGRATION_PLATFORM_CP760_PACK_BINDING,
  MIGRATION_PLATFORM_CP760_REQUIREMENTS,
  MIGRATION_PLATFORM_CP761_PACK_BINDING,
  MIGRATION_PLATFORM_CP761_REQUIREMENTS,
  MIGRATION_PLATFORM_CP762_PACK_BINDING,
  MIGRATION_PLATFORM_CP762_REQUIREMENTS,
  MIGRATION_PLATFORM_CP763_PACK_BINDING,
  MIGRATION_PLATFORM_CP763_REQUIREMENTS,
  MIGRATION_PLATFORM_CP764_PACK_BINDING,
  MIGRATION_PLATFORM_CP764_REQUIREMENTS,
  MIGRATION_PLATFORM_CP765_PACK_BINDING,
  MIGRATION_PLATFORM_CP765_REQUIREMENTS,
  MIGRATION_PLATFORM_CP766_PACK_BINDING,
  MIGRATION_PLATFORM_CP766_REQUIREMENTS,
  MIGRATION_PLATFORM_CP767_PACK_BINDING,
  MIGRATION_PLATFORM_CP767_REQUIREMENTS,
  MIGRATION_PLATFORM_CP768_PACK_BINDING,
  MIGRATION_PLATFORM_CP768_REQUIREMENTS,
  MIGRATION_PLATFORM_CP769_PACK_BINDING,
  MIGRATION_PLATFORM_CP769_REQUIREMENTS,
  MIGRATION_PLATFORM_CP770_PACK_BINDING,
  MIGRATION_PLATFORM_CP770_REQUIREMENTS,
  MIGRATION_PLATFORM_CP771_PACK_BINDING,
  MIGRATION_PLATFORM_CP771_REQUIREMENTS,
  MIGRATION_PLATFORM_CP772_PACK_BINDING,
  MIGRATION_PLATFORM_CP772_REQUIREMENTS,
  MIGRATION_PLATFORM_CP773_PACK_BINDING,
  MIGRATION_PLATFORM_CP773_REQUIREMENTS,
  MIGRATION_PLATFORM_CP774_PACK_BINDING,
  MIGRATION_PLATFORM_CP774_REQUIREMENTS,
  MIGRATION_PLATFORM_CP775_PACK_BINDING,
  MIGRATION_PLATFORM_CP775_REQUIREMENTS,
  MIGRATION_PLATFORM_CP776_PACK_BINDING,
  MIGRATION_PLATFORM_CP776_REQUIREMENTS,
  MIGRATION_PLATFORM_CP777_PACK_BINDING,
  MIGRATION_PLATFORM_CP777_REQUIREMENTS,
  MIGRATION_PLATFORM_CP778_PACK_BINDING,
  MIGRATION_PLATFORM_CP778_REQUIREMENTS,
  MIGRATION_PLATFORM_CP779_PACK_BINDING,
  MIGRATION_PLATFORM_CP779_REQUIREMENTS,
  MIGRATION_PLATFORM_CP780_PACK_BINDING,
  MIGRATION_PLATFORM_CP780_REQUIREMENTS,
  MIGRATION_PLATFORM_CP781_PACK_BINDING,
  MIGRATION_PLATFORM_CP781_REQUIREMENTS,
  MIGRATION_PLATFORM_CP782_PACK_BINDING,
  MIGRATION_PLATFORM_CP782_REQUIREMENTS,
  MIGRATION_PLATFORM_CP783_PACK_BINDING,
  MIGRATION_PLATFORM_CP783_REQUIREMENTS,
  MIGRATION_PLATFORM_CP784_PACK_BINDING,
  MIGRATION_PLATFORM_CP784_REQUIREMENTS,
  MIGRATION_PLATFORM_CP785_PACK_BINDING,
  MIGRATION_PLATFORM_CP785_REQUIREMENTS,
  MIGRATION_PLATFORM_CP786_PACK_BINDING,
  MIGRATION_PLATFORM_CP786_REQUIREMENTS,
  MIGRATION_PLATFORM_CP787_PACK_BINDING,
  MIGRATION_PLATFORM_CP787_REQUIREMENTS,
  MIGRATION_PLATFORM_NO_WRITE_ATTESTATION,
  MIGRATION_PLATFORM_PROGRAM_CONTRACT,
} from "./registry.js";

export function migrationPlatformRowKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function freezeResult(binding, result) {
  return Object.freeze({
    ...result,
    pack_id: binding.pack_id,
    program_id: MIGRATION_PLATFORM_PROGRAM_CONTRACT.program_id,
    source_korean_legal_depth_pack_id: "CP00-755",
    ...MIGRATION_PLATFORM_NO_WRITE_ATTESTATION,
    no_write_attestation: MIGRATION_PLATFORM_NO_WRITE_ATTESTATION,
  });
}

const ROW_EXTRAS = Object.freeze({
  scope_inventory: Object.freeze({ scope_descriptor_only: true, program_scope: MIGRATION_PLATFORM_PROGRAM_CONTRACT.program_scope }),
  acceptance_gate_definition: Object.freeze({ hermes_gate: "H25", claude_gate: "C25" }),
  non_goal_boundary: Object.freeze({ import_runtime_opened: false, unverified_knowledge_creation_allowed: false }),
  target_file_map: Object.freeze({ target_package: "packages/migration", target_contract: "contracts/migration-platform-contract.json", target_validator: "scripts/validate-rp25-migration-platform-contract.mjs" }),
  contract_schema_outline: Object.freeze({ schema_descriptor_only: true, import_plan_runtime_opened: false }),
  ownership_note: Object.freeze({ owner_package: "@law-firm-os/migration" }),
  matter_first_trace_note: Object.freeze({ matter_trace_required: true, source_lineage_required: true }),
  permission_baseline_note: Object.freeze({ permission_decision_detail_included: false, deny_over_allow_enforced: true, cross_tenant_access_allowed: false }),
  audit_baseline_note: Object.freeze({ audit_event_body_included: false, source_lineage_audit_required: true }),
  synthetic_data_policy: Object.freeze({ real_client_data_included: false, source_payload_included: false, synthetic_only: true }),
  risk_register_row: Object.freeze({ migration_leak_risk_tracked: true }),
  blocked_claim_rule: Object.freeze({ customer_safe_errors_only: true, unverified_knowledge_creation_allowed: false }),
  hermes_preflight_fields: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_review_prompts: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_approval_note: Object.freeze({ human_final_approval_required_for_runtime_opening: true }),
  closeout_handoff: Object.freeze({ handoff_descriptor_only: true }),
  dependency_list: Object.freeze({ runtime_dependencies_opened: false }),
  downstream_rp_routing: Object.freeze({ downstream_program_id: "RP26" }),
  command_matrix: Object.freeze({ command_matrix_descriptor_only: true }),
  receipt_shape: Object.freeze({ receipt_shape: "descriptor_only_migration_no_write" }),
  package_directory_layout: Object.freeze({ package_path: "packages/migration" }),
  primary_entity_identifier: Object.freeze({ entity_descriptor_only: true }),
  tenant_scope_field: Object.freeze({ cross_tenant_access_allowed: false }),
  matter_trace_reference: Object.freeze({ matter_trace_required: true, source_lineage_required: true }),
  lifecycle_status_enum: Object.freeze({ allowed_statuses_descriptor_only: true }),
  ownership_metadata: Object.freeze({ ownership_descriptor_only: true }),
  reference_relationship_map: Object.freeze({ relationship_descriptor_only: true }),
  required_field_registry: Object.freeze({ schema_descriptor_only: true }),
  optional_field_registry: Object.freeze({ schema_descriptor_only: true }),
  state_transition_map: Object.freeze({ writes_product_state: false }),
  service_entrypoint_contract: Object.freeze({ service_contract_descriptor_only: true }),
  request_normalization: Object.freeze({ request_payload_persisted: false }),
  tenant_boundary_precheck: Object.freeze({ cross_tenant_access_allowed: false }),
  matter_trace_precheck: Object.freeze({ matter_trace_required: true }),
  permission_precheck: Object.freeze({ permission_decision_detail_included: false }),
  audit_hint_precheck: Object.freeze({ audit_event_body_included: false }),
  primary_happy_path: Object.freeze({ path_descriptor_only: true }),
  secondary_workflow_path: Object.freeze({ path_descriptor_only: true }),
  state_transition_enforcement: Object.freeze({ writes_product_state: false }),
  idempotency_key_handling: Object.freeze({ idempotency_descriptor_only: true }),
  lock_acquisition_rule: Object.freeze({ lock_runtime_opened: false }),
  persistence_boundary: Object.freeze({ writes_product_state: false }),
  validation_error_mapping: Object.freeze({ customer_safe_errors_only: true }),
  review_required_routing: Object.freeze({ claude_final_approval_claimed: false }),
  approval_required_routing: Object.freeze({ human_final_approval_required_for_runtime_opening: true }),
  blocked_claim_output: Object.freeze({ unverified_knowledge_creation_allowed: false }),
  rollback_behavior: Object.freeze({ runtime_rollback_opened: false }),
  retry_behavior: Object.freeze({ runtime_retry_opened: false }),
  unit_test_happy_path: Object.freeze({ synthetic_only: true }),
  unit_test_denied_path: Object.freeze({ synthetic_only: true }),
  unit_test_review_path: Object.freeze({ synthetic_only: true, read_only: true }),
  integration_smoke_case: Object.freeze({ synthetic_only: true, external_runtime_called: false }),
  golden_fixture_binding: Object.freeze({ synthetic_only: true, source_payload_included: false }),
  hermes_service_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_service_review_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_approval_summary: Object.freeze({ human_final_approval_required_for_runtime_opening: true }),
  performance_note: Object.freeze({ runtime_benchmark_claimed: false }),
  observability_note: Object.freeze({ audit_event_body_included: false }),
  future_extension_point: Object.freeze({ runtime_dependencies_opened: false }),
  public_export_map: Object.freeze({ package_path: "packages/migration", index_export_check: true }),
  request_contract: Object.freeze({ schema_descriptor_only: true, request_payload_persisted: false }),
  response_contract: Object.freeze({ schema_descriptor_only: true, response_payload_persisted: false }),
  error_code_taxonomy: Object.freeze({ customer_safe_errors_only: true }),
  permission_annotation: Object.freeze({ permission_decision_detail_included: false, cross_tenant_access_allowed: false }),
  audit_annotation: Object.freeze({ audit_event_body_included: false, source_lineage_audit_required: true }),
  pagination_or_filtering_contract: Object.freeze({ schema_descriptor_only: true, unauthorized_records_omitted: true }),
  serialization_guard: Object.freeze({ raw_payload_included: false, source_system_payload_included: false }),
  unauthorized_data_omission: Object.freeze({ cross_tenant_access_allowed: false, deny_over_allow_enforced: true }),
  api_fixture: Object.freeze({ synthetic_only: true, source_payload_included: false }),
  contract_test: Object.freeze({ synthetic_only: true }),
  invalid_request_test: Object.freeze({ synthetic_only: true, customer_safe_errors_only: true }),
  denied_response_test: Object.freeze({ synthetic_only: true, cross_tenant_access_allowed: false }),
  hermes_api_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_interface_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  documentation_example: Object.freeze({ real_client_data_included: false, synthetic_only: true }),
  versioning_note: Object.freeze({ backward_compatibility_descriptor_only: true }),
  downstream_consumer_note: Object.freeze({ runtime_dependencies_opened: false }),
  command_rerun: Object.freeze({ command_matrix_descriptor_only: true }),
  schema_drift_check: Object.freeze({ schema_descriptor_only: true }),
  backward_compatibility_check: Object.freeze({ backward_compatibility_descriptor_only: true }),
  ui_surface_inventory: Object.freeze({ ui_descriptor_only: true, runtime_render_claimed: false }),
  data_dependency_map: Object.freeze({ data_dependency_descriptor_only: true, source_payload_included: false }),
  loading_state: Object.freeze({ ui_descriptor_only: true }),
  empty_state: Object.freeze({ ui_descriptor_only: true, real_client_data_included: false }),
  denied_state: Object.freeze({ ui_descriptor_only: true, deny_over_allow_enforced: true, cross_tenant_access_allowed: false }),
  review_required_state: Object.freeze({ ui_descriptor_only: true, claude_final_approval_claimed: false }),
  primary_interaction: Object.freeze({ ui_descriptor_only: true, writes_product_state: false }),
  secondary_interaction: Object.freeze({ ui_descriptor_only: true, writes_product_state: false }),
  permission_badge: Object.freeze({ ui_descriptor_only: true, permission_decision_detail_included: false, cross_tenant_access_allowed: false }),
  audit_hint_display: Object.freeze({ ui_descriptor_only: true, audit_event_body_included: false }),
  error_message_copy: Object.freeze({ customer_safe_errors_only: true, source_system_payload_included: false }),
  responsive_desktop_layout: Object.freeze({ ui_descriptor_only: true, runtime_render_claimed: false }),
  responsive_mobile_layout: Object.freeze({ ui_descriptor_only: true, runtime_render_claimed: false }),
  keyboard_focus_behavior: Object.freeze({ accessibility_descriptor_only: true }),
  visual_density_check: Object.freeze({ ui_descriptor_only: true }),
  synthetic_fixture_binding: Object.freeze({ synthetic_only: true, real_client_data_included: false }),
  build_smoke: Object.freeze({ build_smoke_descriptor_only: true, runtime_execution: false }),
  hermes_ui_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_ui_leak_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  state_snapshot: Object.freeze({ ui_descriptor_only: true, state_snapshot_descriptor_only: true, writes_product_state: false }),
  no_unauthorized_count_leak: Object.freeze({ ui_descriptor_only: true, unauthorized_records_omitted: true, cross_tenant_access_allowed: false }),
  base_tenant_fixture: Object.freeze({ synthetic_only: true, real_client_data_included: false }),
  base_user_fixture: Object.freeze({ synthetic_only: true, real_client_data_included: false }),
  base_matter_fixture: Object.freeze({ synthetic_only: true, real_client_data_included: false, matter_trace_required: true }),
  base_document_fixture: Object.freeze({ synthetic_only: true, source_payload_included: false, real_client_data_included: false }),
  primary_golden_case: Object.freeze({ synthetic_only: true, source_payload_included: false }),
  secondary_golden_case: Object.freeze({ synthetic_only: true, source_payload_included: false }),
  review_required_case: Object.freeze({ synthetic_only: true, read_only: true, claude_final_approval_claimed: false }),
  denied_case: Object.freeze({ synthetic_only: true, deny_over_allow_enforced: true, cross_tenant_access_allowed: false }),
  cross_tenant_case: Object.freeze({ synthetic_only: true, cross_tenant_access_allowed: false }),
  missing_context_case: Object.freeze({ synthetic_only: true, customer_safe_errors_only: true }),
  audit_hint_case: Object.freeze({ synthetic_only: true, audit_event_body_included: false }),
  security_trimming_case: Object.freeze({ synthetic_only: true, unauthorized_records_omitted: true, cross_tenant_access_allowed: false }),
  ai_retrieval_or_analytics_case: Object.freeze({ synthetic_only: true, unverified_knowledge_creation_allowed: false, source_payload_included: false }),
  fixture_manifest: Object.freeze({ synthetic_only: true, real_client_data_included: false, external_credential_included: false }),
  golden_test: Object.freeze({ synthetic_only: true }),
  failure_test: Object.freeze({ synthetic_only: true, customer_safe_errors_only: true }),
  hermes_fixture_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_missing_test_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  no_real_data_check: Object.freeze({ real_client_data_included: false, source_payload_included: false, external_credential_included: false }),
  stable_id_check: Object.freeze({ synthetic_only: true, stable_identifier_descriptor_only: true }),
  replay_command: Object.freeze({ command_matrix_descriptor_only: true, runtime_execution: false }),
  no_silent_success_check: Object.freeze({ blocked_success_claim_required: true, customer_safe_errors_only: true }),
  no_data_leak_check: Object.freeze({ real_client_data_included: false, source_system_payload_included: false, raw_payload_included: false }),
  recovery_documentation: Object.freeze({ handoff_descriptor_only: true, runtime_recovery_opened: false }),
  downstream_correction_route: Object.freeze({ downstream_program_id: "RP26", product_state_correction_written: false }),
  future_incident_note: Object.freeze({ migration_leak_risk_tracked: true, incident_runtime_opened: false }),
  hermes_command_matrix: Object.freeze({ command_matrix_descriptor_only: true, emits_runtime_receipt: false }),
  evidence_field_list: Object.freeze({ receipt_shape: "descriptor_only_migration_no_write", raw_payload_included: false }),
  changed_file_receipt: Object.freeze({ changed_file_scope_descriptor_only: true, writes_product_state: false }),
  command_result_receipt: Object.freeze({ command_result_descriptor_only: true, runtime_execution: false }),
  fixture_summary_receipt: Object.freeze({ synthetic_only: true, fixture_replay_execution_opened: false }),
  permission_summary_receipt: Object.freeze({ permission_decision_detail_included: false, cross_tenant_access_allowed: false }),
  audit_summary_receipt: Object.freeze({ audit_event_body_included: false, source_lineage_audit_required: true }),
  no_real_data_receipt: Object.freeze({ real_client_data_included: false, external_credential_included: false }),
  claude_dependency_marker: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  human_approval_marker: Object.freeze({ human_final_approval_required_for_runtime_opening: true }),
  pass_semantics: Object.freeze({ valid_receipt_semantics_descriptor_only: true }),
  pass_with_findings_semantics: Object.freeze({ non_blocking_finding_adjudication_required: true }),
  block_semantics: Object.freeze({ blocking_finding_prevents_closeout: true }),
  evidence_template: Object.freeze({ template_descriptor_only: true, source_payload_included: false }),
  validation_command_check: Object.freeze({ command_matrix_descriptor_only: true }),
  harness_boundary_note: Object.freeze({ local_validation_claims_enterprise_trust: false }),
  regression_receipt: Object.freeze({ synthetic_only: true, runtime_execution: false }),
  next_gate_readiness: Object.freeze({ downstream_program_id: "RP26", human_final_approval_required_for_runtime_opening: true }),
  documentation_update: Object.freeze({ documentation_descriptor_only: true, real_client_data_included: false }),
  operator_summary: Object.freeze({ operator_summary_descriptor_only: true, customer_safe_errors_only: true }),
  architecture_review_questions: Object.freeze({ read_only: true, architecture_review_descriptor_only: true }),
  security_review_questions: Object.freeze({ read_only: true, security_review_descriptor_only: true }),
  permission_bypass_questions: Object.freeze({ permission_decision_detail_included: false, cross_tenant_access_allowed: false }),
  audit_completeness_questions: Object.freeze({ audit_event_body_included: false, source_lineage_audit_required: true }),
  missing_test_questions: Object.freeze({ synthetic_only: true, missing_test_prompt_descriptor_only: true }),
  ui_leak_questions: Object.freeze({ ui_descriptor_only: true, unauthorized_records_omitted: true, runtime_render_claimed: false }),
  downstream_readiness_questions: Object.freeze({ downstream_program_id: "RP26" }),
  risk_register: Object.freeze({ migration_leak_risk_tracked: true }),
  severity_taxonomy: Object.freeze({ severity_taxonomy_descriptor_only: true }),
  go_no_go_verdict_format: Object.freeze({ human_final_approval_required_for_runtime_opening: true }),
  finding_routing_map: Object.freeze({ finding_routing_descriptor_only: true }),
  claude_review_packet: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  closeout_criteria: Object.freeze({ closeout_criteria_descriptor_only: true }),
  pass_closeout_note: Object.freeze({ valid_receipt_semantics_descriptor_only: true }),
  pass_with_findings_closeout_note: Object.freeze({ non_blocking_finding_adjudication_required: true }),
  block_closeout_note: Object.freeze({ blocking_finding_prevents_closeout: true }),
  next_rp_dependency: Object.freeze({ downstream_program_id: "RP26" }),
  review_receipt_placeholder: Object.freeze({ emits_runtime_receipt: false, receipt_shape: "descriptor_only_migration_no_write" }),
  future_correction_slot: Object.freeze({ product_state_correction_written: false }),
});

function createCaseSet(binding, requirements, caseSetId, sourceCaseSetId) {
  const sections = {};
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      rows[rowKey] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        external_credential_included: false,
        source_system_payload_included: false,
        real_client_data_included: false,
        section_micro_phase_id: microId,
        file_server_runtime_opened: false,
        sharepoint_runtime_opened: false,
        google_drive_runtime_opened: false,
        imanage_runtime_opened: false,
        import_runtime_opened: false,
        ...(ROW_EXTRAS[rowKey] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: requirements.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => migrationPlatformRowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeResult(binding, {
    case_set_id: caseSetId,
    source_case_set_id: sourceCaseSetId,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

function createDescriptor(binding, requirements, descriptorName, caseSetField, caseSet, documentationEntry, handoffOpenScope) {
  return freezeResult(binding, {
    descriptor: descriptorName,
    pack_binding: binding,
    program_contract: MIGRATION_PLATFORM_PROGRAM_CONTRACT,
    [caseSetField]: caseSet,
    public_exports: requirements.required_public_exports,
    documentation_entry: documentationEntry,
    index_export_check: true,
    no_leak_guards: requirements.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: binding.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H25." + binding.pack_id + ".migration_platform_" + descriptorName,
      gate: binding.hermes_gate,
      receipt_shape: "descriptor_only_migration_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C25." + binding.pack_id + ".migration_platform_" + descriptorName,
      gate: binding.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      invalid_review_blockers: requirements.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: binding.pack_id,
      to_pack_id: binding.next_pack_id,
      next_subphase_id: binding.next_subphase_id,
      open_scope: handoffOpenScope,
    }),
  });
}

export function createMigrationPlatformCp756ScopeContractFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP756_PACK_BINDING, MIGRATION_PLATFORM_CP756_REQUIREMENTS, "migration-platform-cp756-scope-contract-foundation-case-set", undefined);
}

export function createMigrationPlatformCp756ScopeContractFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp756ScopeContractFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP756_PACK_BINDING,
    MIGRATION_PLATFORM_CP756_REQUIREMENTS,
    "MigrationPlatformCp756ScopeContractFoundationDescriptor",
    "scope_contract_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-756",
    "Continue RP25.P01.M02.S09 onward with the remaining domain model, implementation, permission, fixture, evidence, review, and closeout rows while preserving descriptor-only migration boundaries.",
  );
}

export function createMigrationPlatformCp756ScopeContractFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP756_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP756_PACK_BINDING.pack_id + ".H25.migration_platform_scope_contract_foundation",
    descriptor: createMigrationPlatformCp756ScopeContractFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp756ScopeContractFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP756_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP756_PACK_BINDING.pack_id + ".C25.migration_platform_scope_contract_foundation",
    descriptor: createMigrationPlatformCp756ScopeContractFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP756_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP756_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp756ScopeContractFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP756_PACK_BINDING, {
    handoff_id: "CP00-756-to-CP00-757",
    from_pack_id: "CP00-756",
    to_pack_id: "CP00-757",
    next_subphase_id: "RP25.P01.M02.S09",
    source_descriptor: createMigrationPlatformCp756ScopeContractFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P01.M02.S09.",
      "Keep source-system examples synthetic, credential-free, and payload-free.",
      "Keep runtime import execution closed until a later pack explicitly opens it with human approval.",
    ]),
  });
}

export function createMigrationPlatformCp757DomainImplementationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP757_PACK_BINDING, MIGRATION_PLATFORM_CP757_REQUIREMENTS, "migration-platform-cp757-domain-implementation-case-set", "migration-platform-cp756-scope-contract-foundation-case-set");
}

export function createMigrationPlatformCp757DomainImplementationDescriptor() {
  const caseSet = createMigrationPlatformCp757DomainImplementationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP757_PACK_BINDING,
    MIGRATION_PLATFORM_CP757_REQUIREMENTS,
    "MigrationPlatformCp757DomainImplementationDescriptor",
    "domain_implementation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-757",
    "Continue RP25.P01.M04.S07 onward with secondary workflow completion, permission and audit binding, fixture, test, Hermes evidence, Claude review, and closeout rows while keeping migration runtime closed.",
  );
}

export function createMigrationPlatformCp757DomainImplementationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP757_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP757_PACK_BINDING.pack_id + ".H25.migration_platform_domain_implementation",
    descriptor: createMigrationPlatformCp757DomainImplementationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp757DomainImplementationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP757_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP757_PACK_BINDING.pack_id + ".C25.migration_platform_domain_implementation",
    descriptor: createMigrationPlatformCp757DomainImplementationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP757_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP757_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp757DomainImplementationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP757_PACK_BINDING, {
    handoff_id: "CP00-757-to-CP00-758",
    from_pack_id: "CP00-757",
    to_pack_id: "CP00-758",
    next_subphase_id: "RP25.P01.M04.S07",
    source_descriptor: createMigrationPlatformCp757DomainImplementationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P01.M04.S07.",
      "Keep secondary workflow rows descriptor-only until permission and audit binding are validated.",
      "Keep source-system import runtime, external credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp758PermissionFixtureCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP758_PACK_BINDING, MIGRATION_PLATFORM_CP758_REQUIREMENTS, "migration-platform-cp758-permission-fixture-case-set", "migration-platform-cp757-domain-implementation-case-set");
}

export function createMigrationPlatformCp758PermissionFixtureDescriptor() {
  const caseSet = createMigrationPlatformCp758PermissionFixtureCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP758_PACK_BINDING,
    MIGRATION_PLATFORM_CP758_REQUIREMENTS,
    "MigrationPlatformCp758PermissionFixtureDescriptor",
    "permission_fixture_case_set",
    caseSet,
    "packages/migration/README.md#cp00-758",
    "Continue RP25.P01.M06.S05 onward with synthetic fixture completion, test and golden cases, Hermes evidence, Claude review, and closeout rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp758PermissionFixtureHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP758_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP758_PACK_BINDING.pack_id + ".H25.migration_platform_permission_fixture",
    descriptor: createMigrationPlatformCp758PermissionFixtureDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp758PermissionFixtureClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP758_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP758_PACK_BINDING.pack_id + ".C25.migration_platform_permission_fixture",
    descriptor: createMigrationPlatformCp758PermissionFixtureDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP758_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP758_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp758PermissionFixtureCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP758_PACK_BINDING, {
    handoff_id: "CP00-758-to-CP00-759",
    from_pack_id: "CP00-758",
    to_pack_id: "CP00-759",
    next_subphase_id: "RP25.P01.M06.S05",
    source_descriptor: createMigrationPlatformCp758PermissionFixtureDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P01.M06.S05.",
      "Keep synthetic fixtures payload-free and source-system examples synthetic.",
      "Keep import execution and external credentials closed until a later explicit runtime pack.",
    ]),
  });
}

export function createMigrationPlatformCp759ServiceFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP759_PACK_BINDING, MIGRATION_PLATFORM_CP759_REQUIREMENTS, "migration-platform-cp759-service-foundation-case-set", "migration-platform-cp758-permission-fixture-case-set");
}

export function createMigrationPlatformCp759ServiceFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp759ServiceFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP759_PACK_BINDING,
    MIGRATION_PLATFORM_CP759_REQUIREMENTS,
    "MigrationPlatformCp759ServiceFoundationDescriptor",
    "service_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-759",
    "Continue RP25.P02.M03.S01 onward with primary implementation service rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp759ServiceFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP759_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP759_PACK_BINDING.pack_id + ".H25.migration_platform_service_foundation",
    descriptor: createMigrationPlatformCp759ServiceFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp759ServiceFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP759_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP759_PACK_BINDING.pack_id + ".C25.migration_platform_service_foundation",
    descriptor: createMigrationPlatformCp759ServiceFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP759_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP759_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp759ServiceFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP759_PACK_BINDING, {
    handoff_id: "CP00-759-to-CP00-760",
    from_pack_id: "CP00-759",
    to_pack_id: "CP00-760",
    next_subphase_id: "RP25.P02.M03.S01",
    source_descriptor: createMigrationPlatformCp759ServiceFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P02.M03.S01.",
      "Keep service entrypoint rows descriptor-only until a later explicit runtime pack.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp760PrimaryServiceCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP760_PACK_BINDING, MIGRATION_PLATFORM_CP760_REQUIREMENTS, "migration-platform-cp760-primary-service-case-set", "migration-platform-cp759-service-foundation-case-set");
}

export function createMigrationPlatformCp760PrimaryServiceDescriptor() {
  const caseSet = createMigrationPlatformCp760PrimaryServiceCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP760_PACK_BINDING,
    MIGRATION_PLATFORM_CP760_REQUIREMENTS,
    "MigrationPlatformCp760PrimaryServiceDescriptor",
    "primary_service_case_set",
    caseSet,
    "packages/migration/README.md#cp00-760",
    "Continue RP25.P02.M04.S11 onward with secondary workflow service rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp760PrimaryServiceHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP760_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP760_PACK_BINDING.pack_id + ".H25.migration_platform_primary_service",
    descriptor: createMigrationPlatformCp760PrimaryServiceDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp760PrimaryServiceClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP760_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP760_PACK_BINDING.pack_id + ".C25.migration_platform_primary_service",
    descriptor: createMigrationPlatformCp760PrimaryServiceDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP760_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP760_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp760PrimaryServiceCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP760_PACK_BINDING, {
    handoff_id: "CP00-760-to-CP00-761",
    from_pack_id: "CP00-760",
    to_pack_id: "CP00-761",
    next_subphase_id: "RP25.P02.M04.S11",
    source_descriptor: createMigrationPlatformCp760PrimaryServiceDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P02.M04.S11.",
      "Keep secondary workflow service rows descriptor-only.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp761SecondaryServiceCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP761_PACK_BINDING, MIGRATION_PLATFORM_CP761_REQUIREMENTS, "migration-platform-cp761-secondary-service-case-set", "migration-platform-cp760-primary-service-case-set");
}

export function createMigrationPlatformCp761SecondaryServiceDescriptor() {
  const caseSet = createMigrationPlatformCp761SecondaryServiceCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP761_PACK_BINDING,
    MIGRATION_PLATFORM_CP761_REQUIREMENTS,
    "MigrationPlatformCp761SecondaryServiceDescriptor",
    "secondary_service_case_set",
    caseSet,
    "packages/migration/README.md#cp00-761",
    "Continue RP25.P02.M04.S21 onward with secondary workflow review, fixture, evidence, approval, and handoff rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp761SecondaryServiceHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP761_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP761_PACK_BINDING.pack_id + ".H25.migration_platform_secondary_service",
    descriptor: createMigrationPlatformCp761SecondaryServiceDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp761SecondaryServiceClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP761_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP761_PACK_BINDING.pack_id + ".C25.migration_platform_secondary_service",
    descriptor: createMigrationPlatformCp761SecondaryServiceDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP761_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP761_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp761SecondaryServiceCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP761_PACK_BINDING, {
    handoff_id: "CP00-761-to-CP00-762",
    from_pack_id: "CP00-761",
    to_pack_id: "CP00-762",
    next_subphase_id: "RP25.P02.M04.S21",
    source_descriptor: createMigrationPlatformCp761SecondaryServiceDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P02.M04.S21.",
      "Keep review-path, fixture, evidence, approval, and handoff service rows descriptor-only.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp762PermissionAuditServiceCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP762_PACK_BINDING, MIGRATION_PLATFORM_CP762_REQUIREMENTS, "migration-platform-cp762-permission-audit-service-case-set", "migration-platform-cp761-secondary-service-case-set");
}

export function createMigrationPlatformCp762PermissionAuditServiceDescriptor() {
  const caseSet = createMigrationPlatformCp762PermissionAuditServiceCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP762_PACK_BINDING,
    MIGRATION_PLATFORM_CP762_REQUIREMENTS,
    "MigrationPlatformCp762PermissionAuditServiceDescriptor",
    "permission_audit_service_case_set",
    caseSet,
    "packages/migration/README.md#cp00-762",
    "Continue RP25.P02.M06.S01 onward with synthetic fixture service rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp762PermissionAuditServiceHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP762_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP762_PACK_BINDING.pack_id + ".H25.migration_platform_permission_audit_service",
    descriptor: createMigrationPlatformCp762PermissionAuditServiceDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp762PermissionAuditServiceClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP762_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP762_PACK_BINDING.pack_id + ".C25.migration_platform_permission_audit_service",
    descriptor: createMigrationPlatformCp762PermissionAuditServiceDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP762_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP762_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp762PermissionAuditServiceCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP762_PACK_BINDING, {
    handoff_id: "CP00-762-to-CP00-763",
    from_pack_id: "CP00-762",
    to_pack_id: "CP00-763",
    next_subphase_id: "RP25.P02.M06.S01",
    source_descriptor: createMigrationPlatformCp762PermissionAuditServiceDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P02.M06.S01.",
      "Keep synthetic fixture service rows descriptor-only.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp763FixtureInterfaceFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP763_PACK_BINDING, MIGRATION_PLATFORM_CP763_REQUIREMENTS, "migration-platform-cp763-fixture-interface-foundation-case-set", "migration-platform-cp762-permission-audit-service-case-set");
}

export function createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp763FixtureInterfaceFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP763_PACK_BINDING,
    MIGRATION_PLATFORM_CP763_REQUIREMENTS,
    "MigrationPlatformCp763FixtureInterfaceFoundationDescriptor",
    "fixture_interface_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-763",
    "Continue RP25.P03.M02.S15 onward with remaining interface prompt, documentation, versioning, closeout, and downstream rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp763FixtureInterfaceFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP763_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP763_PACK_BINDING.pack_id + ".H25.migration_platform_fixture_interface_foundation",
    descriptor: createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp763FixtureInterfaceFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP763_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP763_PACK_BINDING.pack_id + ".C25.migration_platform_fixture_interface_foundation",
    descriptor: createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP763_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP763_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp763FixtureInterfaceFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP763_PACK_BINDING, {
    handoff_id: "CP00-763-to-CP00-764",
    from_pack_id: "CP00-763",
    to_pack_id: "CP00-764",
    next_subphase_id: "RP25.P03.M02.S15",
    source_descriptor: createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P03.M02.S15.",
      "Keep remaining interface prompt, documentation, versioning, closeout, and downstream rows descriptor-only.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp764InterfaceImplementationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP764_PACK_BINDING, MIGRATION_PLATFORM_CP764_REQUIREMENTS, "migration-platform-cp764-interface-implementation-case-set", "migration-platform-cp763-fixture-interface-foundation-case-set");
}

export function createMigrationPlatformCp764InterfaceImplementationDescriptor() {
  const caseSet = createMigrationPlatformCp764InterfaceImplementationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP764_PACK_BINDING,
    MIGRATION_PLATFORM_CP764_REQUIREMENTS,
    "MigrationPlatformCp764InterfaceImplementationDescriptor",
    "interface_implementation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-764",
    "Continue RP25.P03.M04.S13 onward with denied-response, Hermes evidence, Claude prompt, documentation, versioning, and downstream interface rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp764InterfaceImplementationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP764_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP764_PACK_BINDING.pack_id + ".H25.migration_platform_interface_implementation",
    descriptor: createMigrationPlatformCp764InterfaceImplementationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp764InterfaceImplementationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP764_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP764_PACK_BINDING.pack_id + ".C25.migration_platform_interface_implementation",
    descriptor: createMigrationPlatformCp764InterfaceImplementationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP764_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP764_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp764InterfaceImplementationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP764_PACK_BINDING, {
    handoff_id: "CP00-764-to-CP00-765",
    from_pack_id: "CP00-764",
    to_pack_id: "CP00-765",
    next_subphase_id: "RP25.P03.M04.S13",
    source_descriptor: createMigrationPlatformCp764InterfaceImplementationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P03.M04.S13.",
      "Keep remaining secondary workflow and permission/audit interface rows descriptor-only.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp765InterfacePermissionFixtureCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP765_PACK_BINDING, MIGRATION_PLATFORM_CP765_REQUIREMENTS, "migration-platform-cp765-interface-permission-fixture-case-set", "migration-platform-cp764-interface-implementation-case-set");
}

export function createMigrationPlatformCp765InterfacePermissionFixtureDescriptor() {
  const caseSet = createMigrationPlatformCp765InterfacePermissionFixtureCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP765_PACK_BINDING,
    MIGRATION_PLATFORM_CP765_REQUIREMENTS,
    "MigrationPlatformCp765InterfacePermissionFixtureDescriptor",
    "interface_permission_fixture_case_set",
    caseSet,
    "packages/migration/README.md#cp00-765",
    "Continue RP25.P03.M06.S11 onward with remaining fixture, test, evidence, review, closeout, and downstream interface rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp765InterfacePermissionFixtureHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP765_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP765_PACK_BINDING.pack_id + ".H25.migration_platform_interface_permission_fixture",
    descriptor: createMigrationPlatformCp765InterfacePermissionFixtureDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp765InterfacePermissionFixtureClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP765_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP765_PACK_BINDING.pack_id + ".C25.migration_platform_interface_permission_fixture",
    descriptor: createMigrationPlatformCp765InterfacePermissionFixtureDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP765_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP765_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp765InterfacePermissionFixtureCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP765_PACK_BINDING, {
    handoff_id: "CP00-765-to-CP00-766",
    from_pack_id: "CP00-765",
    to_pack_id: "CP00-766",
    next_subphase_id: "RP25.P03.M06.S11",
    source_descriptor: createMigrationPlatformCp765InterfacePermissionFixtureDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P03.M06.S11.",
      "Keep remaining fixture, test, evidence, review, closeout, and downstream interface rows descriptor-only.",
      "Keep source-system imports, credentials, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp766InterfaceUiFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP766_PACK_BINDING, MIGRATION_PLATFORM_CP766_REQUIREMENTS, "migration-platform-cp766-interface-ui-foundation-case-set", "migration-platform-cp765-interface-permission-fixture-case-set");
}

export function createMigrationPlatformCp766InterfaceUiFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp766InterfaceUiFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP766_PACK_BINDING,
    MIGRATION_PLATFORM_CP766_REQUIREMENTS,
    "MigrationPlatformCp766InterfaceUiFoundationDescriptor",
    "interface_ui_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-766",
    "Continue RP25.P04.M03.S19 onward with remaining primary UI leak prompt and closeout rows, then secondary workflow UI surface rows while keeping source-system import runtime closed.",
  );
}

export function createMigrationPlatformCp766InterfaceUiFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP766_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP766_PACK_BINDING.pack_id + ".H25.migration_platform_interface_ui_foundation",
    descriptor: createMigrationPlatformCp766InterfaceUiFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp766InterfaceUiFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP766_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP766_PACK_BINDING.pack_id + ".C25.migration_platform_interface_ui_foundation",
    descriptor: createMigrationPlatformCp766InterfaceUiFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP766_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP766_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp766InterfaceUiFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP766_PACK_BINDING, {
    handoff_id: "CP00-766-to-CP00-767",
    from_pack_id: "CP00-766",
    to_pack_id: "CP00-767",
    next_subphase_id: "RP25.P04.M03.S19",
    source_descriptor: createMigrationPlatformCp766InterfaceUiFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P04.M03.S19.",
      "Keep remaining UI primary-slice and secondary workflow rows descriptor-only until a later runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp767UiWorkflowCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP767_PACK_BINDING, MIGRATION_PLATFORM_CP767_REQUIREMENTS, "migration-platform-cp767-ui-workflow-case-set", "migration-platform-cp766-interface-ui-foundation-case-set");
}

export function createMigrationPlatformCp767UiWorkflowDescriptor() {
  const caseSet = createMigrationPlatformCp767UiWorkflowCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP767_PACK_BINDING,
    MIGRATION_PLATFORM_CP767_REQUIREMENTS,
    "MigrationPlatformCp767UiWorkflowDescriptor",
    "ui_workflow_case_set",
    caseSet,
    "packages/migration/README.md#cp00-767",
    "Continue RP25.P04.M05.S15 onward with remaining permission-and-audit UI rows and synthetic fixture UI foundation while keeping source-system import runtime and UI runtime rendering closed.",
  );
}

export function createMigrationPlatformCp767UiWorkflowHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP767_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP767_PACK_BINDING.pack_id + ".H25.migration_platform_ui_workflow",
    descriptor: createMigrationPlatformCp767UiWorkflowDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp767UiWorkflowClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP767_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP767_PACK_BINDING.pack_id + ".C25.migration_platform_ui_workflow",
    descriptor: createMigrationPlatformCp767UiWorkflowDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP767_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP767_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp767UiWorkflowCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP767_PACK_BINDING, {
    handoff_id: "CP00-767-to-CP00-768",
    from_pack_id: "CP00-767",
    to_pack_id: "CP00-768",
    next_subphase_id: "RP25.P04.M05.S15",
    source_descriptor: createMigrationPlatformCp767UiWorkflowDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P04.M05.S15.",
      "Keep UI permission/audit and fixture rows descriptor-only until a later runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp768UiPermissionFixtureCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP768_PACK_BINDING, MIGRATION_PLATFORM_CP768_REQUIREMENTS, "migration-platform-cp768-ui-permission-fixture-case-set", "migration-platform-cp767-ui-workflow-case-set");
}

export function createMigrationPlatformCp768UiPermissionFixtureDescriptor() {
  const caseSet = createMigrationPlatformCp768UiPermissionFixtureCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP768_PACK_BINDING,
    MIGRATION_PLATFORM_CP768_REQUIREMENTS,
    "MigrationPlatformCp768UiPermissionFixtureDescriptor",
    "ui_permission_fixture_case_set",
    caseSet,
    "packages/migration/README.md#cp00-768",
    "Continue RP25.P04.M06.S03 onward with remaining synthetic fixture UI rows, test/golden UI rows, Hermes UI evidence, and Claude UI review while keeping source-system import runtime and UI runtime rendering closed.",
  );
}

export function createMigrationPlatformCp768UiPermissionFixtureHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP768_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP768_PACK_BINDING.pack_id + ".H25.migration_platform_ui_permission_fixture",
    descriptor: createMigrationPlatformCp768UiPermissionFixtureDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp768UiPermissionFixtureClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP768_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP768_PACK_BINDING.pack_id + ".C25.migration_platform_ui_permission_fixture",
    descriptor: createMigrationPlatformCp768UiPermissionFixtureDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP768_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP768_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp768UiPermissionFixtureCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP768_PACK_BINDING, {
    handoff_id: "CP00-768-to-CP00-769",
    from_pack_id: "CP00-768",
    to_pack_id: "CP00-769",
    next_subphase_id: "RP25.P04.M06.S03",
    source_descriptor: createMigrationPlatformCp768UiPermissionFixtureDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P04.M06.S03.",
      "Keep remaining UI fixture, test, evidence, and review rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, real client data, unauthorized count leakage, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp769UiFixtureFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP769_PACK_BINDING, MIGRATION_PLATFORM_CP769_REQUIREMENTS, "migration-platform-cp769-ui-fixture-foundation-case-set", "migration-platform-cp768-ui-permission-fixture-case-set");
}

export function createMigrationPlatformCp769UiFixtureFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp769UiFixtureFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP769_PACK_BINDING,
    MIGRATION_PLATFORM_CP769_REQUIREMENTS,
    "MigrationPlatformCp769UiFixtureFoundationDescriptor",
    "ui_fixture_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-769",
    "Continue RP25.P05.M02.S15 onward with remaining type-and-shape fixture rows and primary implementation fixture rows while keeping source-system import runtime and UI runtime rendering closed.",
  );
}

export function createMigrationPlatformCp769UiFixtureFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP769_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP769_PACK_BINDING.pack_id + ".H25.migration_platform_ui_fixture_foundation",
    descriptor: createMigrationPlatformCp769UiFixtureFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp769UiFixtureFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP769_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP769_PACK_BINDING.pack_id + ".C25.migration_platform_ui_fixture_foundation",
    descriptor: createMigrationPlatformCp769UiFixtureFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP769_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP769_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp769UiFixtureFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP769_PACK_BINDING, {
    handoff_id: "CP00-769-to-CP00-770",
    from_pack_id: "CP00-769",
    to_pack_id: "CP00-770",
    next_subphase_id: "RP25.P05.M02.S15",
    source_descriptor: createMigrationPlatformCp769UiFixtureFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P05.M02.S15.",
      "Keep remaining fixture type/implementation rows synthetic-only and descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, real client data, unauthorized count leakage, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp770FixtureImplementationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP770_PACK_BINDING, MIGRATION_PLATFORM_CP770_REQUIREMENTS, "migration-platform-cp770-fixture-implementation-case-set", "migration-platform-cp769-ui-fixture-foundation-case-set");
}

export function createMigrationPlatformCp770FixtureImplementationDescriptor() {
  const caseSet = createMigrationPlatformCp770FixtureImplementationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP770_PACK_BINDING,
    MIGRATION_PLATFORM_CP770_REQUIREMENTS,
    "MigrationPlatformCp770FixtureImplementationDescriptor",
    "fixture_implementation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-770",
    "Continue RP25.P05.M04.S13 onward with remaining secondary workflow fixture rows and permission/audit fixture rows while keeping source-system import runtime and fixture execution closed.",
  );
}

export function createMigrationPlatformCp770FixtureImplementationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP770_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP770_PACK_BINDING.pack_id + ".H25.migration_platform_fixture_implementation",
    descriptor: createMigrationPlatformCp770FixtureImplementationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp770FixtureImplementationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP770_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP770_PACK_BINDING.pack_id + ".C25.migration_platform_fixture_implementation",
    descriptor: createMigrationPlatformCp770FixtureImplementationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP770_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP770_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp770FixtureImplementationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP770_PACK_BINDING, {
    handoff_id: "CP00-770-to-CP00-771",
    from_pack_id: "CP00-770",
    to_pack_id: "CP00-771",
    next_subphase_id: "RP25.P05.M04.S13",
    source_descriptor: createMigrationPlatformCp770FixtureImplementationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P05.M04.S13.",
      "Keep remaining fixture workflow and permission/audit rows synthetic-only and descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, real client data, fixture replay execution, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp771FixturePermissionAuditCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP771_PACK_BINDING, MIGRATION_PLATFORM_CP771_REQUIREMENTS, "migration-platform-cp771-fixture-permission-audit-case-set", "migration-platform-cp770-fixture-implementation-case-set");
}

export function createMigrationPlatformCp771FixturePermissionAuditDescriptor() {
  const caseSet = createMigrationPlatformCp771FixturePermissionAuditCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP771_PACK_BINDING,
    MIGRATION_PLATFORM_CP771_REQUIREMENTS,
    "MigrationPlatformCp771FixturePermissionAuditDescriptor",
    "fixture_permission_audit_case_set",
    caseSet,
    "packages/migration/README.md#cp00-771",
    "Continue RP25.P05.M06.S09 onward with remaining synthetic fixture rows while keeping source-system import runtime and fixture replay execution closed.",
  );
}

export function createMigrationPlatformCp771FixturePermissionAuditHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP771_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP771_PACK_BINDING.pack_id + ".H25.migration_platform_fixture_permission_audit",
    descriptor: createMigrationPlatformCp771FixturePermissionAuditDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp771FixturePermissionAuditClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP771_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP771_PACK_BINDING.pack_id + ".C25.migration_platform_fixture_permission_audit",
    descriptor: createMigrationPlatformCp771FixturePermissionAuditDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP771_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP771_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp771FixturePermissionAuditCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP771_PACK_BINDING, {
    handoff_id: "CP00-771-to-CP00-772",
    from_pack_id: "CP00-771",
    to_pack_id: "CP00-772",
    next_subphase_id: "RP25.P05.M06.S09",
    source_descriptor: createMigrationPlatformCp771FixturePermissionAuditDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P05.M06.S09.",
      "Keep remaining synthetic fixture rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, real client data, fixture replay execution, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp772SyntheticFixtureTailCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP772_PACK_BINDING, MIGRATION_PLATFORM_CP772_REQUIREMENTS, "migration-platform-cp772-synthetic-fixture-tail-case-set", "migration-platform-cp771-fixture-permission-audit-case-set");
}

export function createMigrationPlatformCp772SyntheticFixtureTailDescriptor() {
  const caseSet = createMigrationPlatformCp772SyntheticFixtureTailCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP772_PACK_BINDING,
    MIGRATION_PLATFORM_CP772_REQUIREMENTS,
    "MigrationPlatformCp772SyntheticFixtureTailDescriptor",
    "synthetic_fixture_tail_case_set",
    caseSet,
    "packages/migration/README.md#cp00-772",
    "Continue RP25.P05.M06.S19 onward with remaining fixture handoff rows and the next generated Migration Platform slice while keeping source-system import runtime and fixture replay execution closed.",
  );
}

export function createMigrationPlatformCp772SyntheticFixtureTailHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP772_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP772_PACK_BINDING.pack_id + ".H25.migration_platform_synthetic_fixture_tail",
    descriptor: createMigrationPlatformCp772SyntheticFixtureTailDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp772SyntheticFixtureTailClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP772_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP772_PACK_BINDING.pack_id + ".C25.migration_platform_synthetic_fixture_tail",
    descriptor: createMigrationPlatformCp772SyntheticFixtureTailDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP772_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP772_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp772SyntheticFixtureTailCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP772_PACK_BINDING, {
    handoff_id: "CP00-772-to-CP00-773",
    from_pack_id: "CP00-772",
    to_pack_id: "CP00-773",
    next_subphase_id: "RP25.P05.M06.S19",
    source_descriptor: createMigrationPlatformCp772SyntheticFixtureTailDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P05.M06.S19.",
      "Keep remaining fixture handoff and next-slice rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, real client data, fixture replay execution, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp773FixtureEvidenceUiFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP773_PACK_BINDING, MIGRATION_PLATFORM_CP773_REQUIREMENTS, "migration-platform-cp773-fixture-evidence-ui-foundation-case-set", "migration-platform-cp772-synthetic-fixture-tail-case-set");
}

export function createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp773FixtureEvidenceUiFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP773_PACK_BINDING,
    MIGRATION_PLATFORM_CP773_REQUIREMENTS,
    "MigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor",
    "fixture_evidence_ui_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-773",
    "Continue RP25.P06.M02.S21 onward with remaining type-and-shape rows and the next Migration Platform UI implementation slice while keeping source-system import runtime, UI runtime rendering, and fixture replay execution closed.",
  );
}

export function createMigrationPlatformCp773FixtureEvidenceUiFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP773_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP773_PACK_BINDING.pack_id + ".H25.migration_platform_fixture_evidence_ui_foundation",
    descriptor: createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp773FixtureEvidenceUiFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP773_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP773_PACK_BINDING.pack_id + ".C25.migration_platform_fixture_evidence_ui_foundation",
    descriptor: createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP773_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP773_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp773FixtureEvidenceUiFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP773_PACK_BINDING, {
    handoff_id: "CP00-773-to-CP00-774",
    from_pack_id: "CP00-773",
    to_pack_id: "CP00-774",
    next_subphase_id: "RP25.P06.M02.S21",
    source_descriptor: createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P06.M02.S21.",
      "Keep remaining permission-matrix and UI implementation rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp774PermissionMatrixPrimaryCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP774_PACK_BINDING, MIGRATION_PLATFORM_CP774_REQUIREMENTS, "migration-platform-cp774-permission-matrix-primary-case-set", "migration-platform-cp773-fixture-evidence-ui-foundation-case-set");
}

export function createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor() {
  const caseSet = createMigrationPlatformCp774PermissionMatrixPrimaryCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP774_PACK_BINDING,
    MIGRATION_PLATFORM_CP774_REQUIREMENTS,
    "MigrationPlatformCp774PermissionMatrixPrimaryDescriptor",
    "permission_matrix_primary_case_set",
    caseSet,
    "packages/migration/README.md#cp00-774",
    "Continue RP25.P06.M03.S09 onward with remaining primary permission-matrix implementation rows while keeping source-system import runtime, UI runtime rendering, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp774PermissionMatrixPrimaryHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP774_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP774_PACK_BINDING.pack_id + ".H25.migration_platform_permission_matrix_primary",
    descriptor: createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp774PermissionMatrixPrimaryClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP774_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP774_PACK_BINDING.pack_id + ".C25.migration_platform_permission_matrix_primary",
    descriptor: createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP774_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP774_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp774PermissionMatrixPrimaryCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP774_PACK_BINDING, {
    handoff_id: "CP00-774-to-CP00-775",
    from_pack_id: "CP00-774",
    to_pack_id: "CP00-775",
    next_subphase_id: "RP25.P06.M03.S09",
    source_descriptor: createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P06.M03.S09.",
      "Keep remaining permission-matrix primary implementation rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp775PermissionMatrixWorkflowCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP775_PACK_BINDING, MIGRATION_PLATFORM_CP775_REQUIREMENTS, "migration-platform-cp775-permission-matrix-workflow-case-set", "migration-platform-cp774-permission-matrix-primary-case-set");
}

export function createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor() {
  const caseSet = createMigrationPlatformCp775PermissionMatrixWorkflowCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP775_PACK_BINDING,
    MIGRATION_PLATFORM_CP775_REQUIREMENTS,
    "MigrationPlatformCp775PermissionMatrixWorkflowDescriptor",
    "permission_matrix_workflow_case_set",
    caseSet,
    "packages/migration/README.md#cp00-775",
    "Continue RP25.P06.M04.S19 onward with remaining secondary permission-matrix workflow rows and the next Migration Platform permission/audit slice while keeping source-system import runtime, UI runtime rendering, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp775PermissionMatrixWorkflowHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP775_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP775_PACK_BINDING.pack_id + ".H25.migration_platform_permission_matrix_workflow",
    descriptor: createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp775PermissionMatrixWorkflowClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP775_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP775_PACK_BINDING.pack_id + ".C25.migration_platform_permission_matrix_workflow",
    descriptor: createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP775_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP775_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp775PermissionMatrixWorkflowCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP775_PACK_BINDING, {
    handoff_id: "CP00-775-to-CP00-776",
    from_pack_id: "CP00-775",
    to_pack_id: "CP00-776",
    next_subphase_id: "RP25.P06.M04.S19",
    source_descriptor: createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P06.M04.S19.",
      "Keep remaining secondary permission-matrix workflow rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp776PermissionMatrixAuditBindingCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP776_PACK_BINDING, MIGRATION_PLATFORM_CP776_REQUIREMENTS, "migration-platform-cp776-permission-matrix-audit-binding-case-set", "migration-platform-cp775-permission-matrix-workflow-case-set");
}

export function createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor() {
  const caseSet = createMigrationPlatformCp776PermissionMatrixAuditBindingCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP776_PACK_BINDING,
    MIGRATION_PLATFORM_CP776_REQUIREMENTS,
    "MigrationPlatformCp776PermissionMatrixAuditBindingDescriptor",
    "permission_matrix_audit_binding_case_set",
    caseSet,
    "packages/migration/README.md#cp00-776",
    "Continue RP25.P06.M05.S29 onward with remaining permission/audit binding closeout rows and the next Migration Platform synthetic permission fixture slice while keeping source-system import runtime, UI runtime rendering, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp776PermissionMatrixAuditBindingHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP776_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP776_PACK_BINDING.pack_id + ".H25.migration_platform_permission_matrix_audit_binding",
    descriptor: createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp776PermissionMatrixAuditBindingClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP776_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP776_PACK_BINDING.pack_id + ".C25.migration_platform_permission_matrix_audit_binding",
    descriptor: createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP776_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP776_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp776PermissionMatrixAuditBindingCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP776_PACK_BINDING, {
    handoff_id: "CP00-776-to-CP00-777",
    from_pack_id: "CP00-776",
    to_pack_id: "CP00-777",
    next_subphase_id: "RP25.P06.M05.S29",
    source_descriptor: createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P06.M05.S29.",
      "Keep remaining permission/audit binding closeout rows and synthetic permission fixture rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp777PermissionMatrixFixtureFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP777_PACK_BINDING, MIGRATION_PLATFORM_CP777_REQUIREMENTS, "migration-platform-cp777-permission-matrix-fixture-foundation-case-set", "migration-platform-cp776-permission-matrix-audit-binding-case-set");
}

export function createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp777PermissionMatrixFixtureFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP777_PACK_BINDING,
    MIGRATION_PLATFORM_CP777_REQUIREMENTS,
    "MigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor",
    "permission_matrix_fixture_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-777",
    "Continue RP25.P06.M06.S09 onward with remaining synthetic fixture-set permission matrix rows while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp777PermissionMatrixFixtureFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP777_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP777_PACK_BINDING.pack_id + ".H25.migration_platform_permission_matrix_fixture_foundation",
    descriptor: createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp777PermissionMatrixFixtureFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP777_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP777_PACK_BINDING.pack_id + ".C25.migration_platform_permission_matrix_fixture_foundation",
    descriptor: createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP777_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP777_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp777PermissionMatrixFixtureFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP777_PACK_BINDING, {
    handoff_id: "CP00-777-to-CP00-778",
    from_pack_id: "CP00-777",
    to_pack_id: "CP00-778",
    next_subphase_id: "RP25.P06.M06.S09",
    source_descriptor: createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P06.M06.S09.",
      "Keep remaining synthetic fixture-set permission matrix rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp778PermissionFixtureFailureFoundationCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP778_PACK_BINDING, MIGRATION_PLATFORM_CP778_REQUIREMENTS, "migration-platform-cp778-permission-fixture-failure-foundation-case-set", "migration-platform-cp777-permission-matrix-fixture-foundation-case-set");
}

export function createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor() {
  const caseSet = createMigrationPlatformCp778PermissionFixtureFailureFoundationCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP778_PACK_BINDING,
    MIGRATION_PLATFORM_CP778_REQUIREMENTS,
    "MigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor",
    "permission_fixture_failure_foundation_case_set",
    caseSet,
    "packages/migration/README.md#cp00-778",
    "Continue RP25.P07.M02.S03 onward with remaining failure-foundation type-and-shape rows and the next Migration Platform failure-handling slice while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp778PermissionFixtureFailureFoundationHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP778_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP778_PACK_BINDING.pack_id + ".H25.migration_platform_permission_fixture_failure_foundation",
    descriptor: createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp778PermissionFixtureFailureFoundationClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP778_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP778_PACK_BINDING.pack_id + ".C25.migration_platform_permission_fixture_failure_foundation",
    descriptor: createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP778_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP778_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp778PermissionFixtureFailureFoundationCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP778_PACK_BINDING, {
    handoff_id: "CP00-778-to-CP00-779",
    from_pack_id: "CP00-778",
    to_pack_id: "CP00-779",
    next_subphase_id: "RP25.P07.M02.S03",
    source_descriptor: createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P07.M02.S03.",
      "Keep remaining failure-foundation rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp779FailureRecoveryPrimaryCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP779_PACK_BINDING, MIGRATION_PLATFORM_CP779_REQUIREMENTS, "migration-platform-cp779-failure-recovery-primary-case-set", "migration-platform-cp778-permission-fixture-failure-foundation-case-set");
}

export function createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor() {
  const caseSet = createMigrationPlatformCp779FailureRecoveryPrimaryCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP779_PACK_BINDING,
    MIGRATION_PLATFORM_CP779_REQUIREMENTS,
    "MigrationPlatformCp779FailureRecoveryPrimaryDescriptor",
    "failure_recovery_primary_case_set",
    caseSet,
    "packages/migration/README.md#cp00-779",
    "Continue RP25.P07.M03.S21 onward with remaining primary failure-recovery rows and the next Migration Platform secondary failure workflow slice while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp779FailureRecoveryPrimaryHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP779_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP779_PACK_BINDING.pack_id + ".H25.migration_platform_failure_recovery_primary",
    descriptor: createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp779FailureRecoveryPrimaryClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP779_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP779_PACK_BINDING.pack_id + ".C25.migration_platform_failure_recovery_primary",
    descriptor: createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP779_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP779_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp779FailureRecoveryPrimaryCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP779_PACK_BINDING, {
    handoff_id: "CP00-779-to-CP00-780",
    from_pack_id: "CP00-779",
    to_pack_id: "CP00-780",
    next_subphase_id: "RP25.P07.M03.S21",
    source_descriptor: createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P07.M03.S21.",
      "Keep remaining failure-recovery primary and secondary workflow rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp780FailureRecoveryWorkflowCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP780_PACK_BINDING, MIGRATION_PLATFORM_CP780_REQUIREMENTS, "migration-platform-cp780-failure-recovery-workflow-case-set", "migration-platform-cp779-failure-recovery-primary-case-set");
}

export function createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor() {
  const caseSet = createMigrationPlatformCp780FailureRecoveryWorkflowCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP780_PACK_BINDING,
    MIGRATION_PLATFORM_CP780_REQUIREMENTS,
    "MigrationPlatformCp780FailureRecoveryWorkflowDescriptor",
    "failure_recovery_workflow_case_set",
    caseSet,
    "packages/migration/README.md#cp00-780",
    "Continue RP25.P07.M05.S01 onward with remaining secondary failure workflow rows while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp780FailureRecoveryWorkflowHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP780_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP780_PACK_BINDING.pack_id + ".H25.migration_platform_failure_recovery_workflow",
    descriptor: createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp780FailureRecoveryWorkflowClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP780_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP780_PACK_BINDING.pack_id + ".C25.migration_platform_failure_recovery_workflow",
    descriptor: createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP780_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP780_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp780FailureRecoveryWorkflowCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP780_PACK_BINDING, {
    handoff_id: "CP00-780-to-CP00-781",
    from_pack_id: "CP00-780",
    to_pack_id: "CP00-781",
    next_subphase_id: "RP25.P07.M05.S01",
    source_descriptor: createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P07.M05.S01.",
      "Keep remaining secondary failure workflow rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp781FailureRecoveryAuditBindingCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP781_PACK_BINDING, MIGRATION_PLATFORM_CP781_REQUIREMENTS, "migration-platform-cp781-failure-recovery-audit-binding-case-set", "migration-platform-cp780-failure-recovery-workflow-case-set");
}

export function createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor() {
  const caseSet = createMigrationPlatformCp781FailureRecoveryAuditBindingCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP781_PACK_BINDING,
    MIGRATION_PLATFORM_CP781_REQUIREMENTS,
    "MigrationPlatformCp781FailureRecoveryAuditBindingDescriptor",
    "failure_recovery_audit_binding_case_set",
    caseSet,
    "packages/migration/README.md#cp00-781",
    "Continue RP25.P07.M05.S11 onward with remaining permission-and-audit failure recovery rows while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp781FailureRecoveryAuditBindingHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP781_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP781_PACK_BINDING.pack_id + ".H25.migration_platform_failure_recovery_audit_binding",
    descriptor: createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp781FailureRecoveryAuditBindingClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP781_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP781_PACK_BINDING.pack_id + ".C25.migration_platform_failure_recovery_audit_binding",
    descriptor: createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP781_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP781_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp781FailureRecoveryAuditBindingCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP781_PACK_BINDING, {
    handoff_id: "CP00-781-to-CP00-782",
    from_pack_id: "CP00-781",
    to_pack_id: "CP00-782",
    next_subphase_id: "RP25.P07.M05.S11",
    source_descriptor: createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P07.M05.S11.",
      "Keep remaining permission-and-audit failure recovery rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp782FailureRecoveryAuditTailCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP782_PACK_BINDING, MIGRATION_PLATFORM_CP782_REQUIREMENTS, "migration-platform-cp782-failure-recovery-audit-tail-case-set", "migration-platform-cp781-failure-recovery-audit-binding-case-set");
}

export function createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor() {
  const caseSet = createMigrationPlatformCp782FailureRecoveryAuditTailCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP782_PACK_BINDING,
    MIGRATION_PLATFORM_CP782_REQUIREMENTS,
    "MigrationPlatformCp782FailureRecoveryAuditTailDescriptor",
    "failure_recovery_audit_tail_case_set",
    caseSet,
    "packages/migration/README.md#cp00-782",
    "Continue RP25.P07.M05.S21 onward with remaining permission-and-audit closeout rows while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp782FailureRecoveryAuditTailHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP782_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP782_PACK_BINDING.pack_id + ".H25.migration_platform_failure_recovery_audit_tail",
    descriptor: createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp782FailureRecoveryAuditTailClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP782_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP782_PACK_BINDING.pack_id + ".C25.migration_platform_failure_recovery_audit_tail",
    descriptor: createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP782_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP782_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp782FailureRecoveryAuditTailCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP782_PACK_BINDING, {
    handoff_id: "CP00-782-to-CP00-783",
    from_pack_id: "CP00-782",
    to_pack_id: "CP00-783",
    next_subphase_id: "RP25.P07.M05.S21",
    source_descriptor: createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P07.M05.S21.",
      "Keep remaining permission-and-audit closeout rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp783FailureRecoveryAuditCloseoutCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP783_PACK_BINDING, MIGRATION_PLATFORM_CP783_REQUIREMENTS, "migration-platform-cp783-failure-recovery-audit-closeout-case-set", "migration-platform-cp782-failure-recovery-audit-tail-case-set");
}

export function createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor() {
  const caseSet = createMigrationPlatformCp783FailureRecoveryAuditCloseoutCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP783_PACK_BINDING,
    MIGRATION_PLATFORM_CP783_REQUIREMENTS,
    "MigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor",
    "failure_recovery_audit_closeout_case_set",
    caseSet,
    "packages/migration/README.md#cp00-783",
    "Continue RP25.P07.M06.S01 onward with the synthetic failure fixture set while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp783FailureRecoveryAuditCloseoutHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP783_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP783_PACK_BINDING.pack_id + ".H25.migration_platform_failure_recovery_audit_closeout",
    descriptor: createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp783FailureRecoveryAuditCloseoutClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP783_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP783_PACK_BINDING.pack_id + ".C25.migration_platform_failure_recovery_audit_closeout",
    descriptor: createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP783_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP783_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp783FailureRecoveryAuditCloseoutCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP783_PACK_BINDING, {
    handoff_id: "CP00-783-to-CP00-784",
    from_pack_id: "CP00-783",
    to_pack_id: "CP00-784",
    next_subphase_id: "RP25.P07.M06.S01",
    source_descriptor: createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P07.M06.S01.",
      "Keep synthetic failure fixture rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp784FailureFixtureReviewBridgeCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP784_PACK_BINDING, MIGRATION_PLATFORM_CP784_REQUIREMENTS, "migration-platform-cp784-failure-fixture-review-bridge-case-set", "migration-platform-cp783-failure-recovery-audit-closeout-case-set");
}

export function createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor() {
  const caseSet = createMigrationPlatformCp784FailureFixtureReviewBridgeCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP784_PACK_BINDING,
    MIGRATION_PLATFORM_CP784_REQUIREMENTS,
    "MigrationPlatformCp784FailureFixtureReviewBridgeDescriptor",
    "failure_fixture_review_bridge_case_set",
    caseSet,
    "packages/migration/README.md#cp00-784",
    "Continue RP25.P08.M02.S05 onward with review receipt type-and-shape rows while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp784FailureFixtureReviewBridgeHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP784_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP784_PACK_BINDING.pack_id + ".H25.migration_platform_failure_fixture_review_bridge",
    descriptor: createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp784FailureFixtureReviewBridgeClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP784_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP784_PACK_BINDING.pack_id + ".C25.migration_platform_failure_fixture_review_bridge",
    descriptor: createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP784_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP784_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp784FailureFixtureReviewBridgeCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP784_PACK_BINDING, {
    handoff_id: "CP00-784-to-CP00-785",
    from_pack_id: "CP00-784",
    to_pack_id: "CP00-785",
    next_subphase_id: "RP25.P08.M02.S05",
    source_descriptor: createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P08.M02.S05.",
      "Keep review receipt type-and-shape rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp785ReviewReceiptImplementationBridgeCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP785_PACK_BINDING, MIGRATION_PLATFORM_CP785_REQUIREMENTS, "migration-platform-cp785-review-receipt-implementation-bridge-case-set", "migration-platform-cp784-failure-fixture-review-bridge-case-set");
}

export function createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor() {
  const caseSet = createMigrationPlatformCp785ReviewReceiptImplementationBridgeCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP785_PACK_BINDING,
    MIGRATION_PLATFORM_CP785_REQUIREMENTS,
    "MigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor",
    "review_receipt_implementation_bridge_case_set",
    caseSet,
    "packages/migration/README.md#cp00-785",
    "Continue RP25.P08.M09.S03 onward with the Claude review packet tail while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp785ReviewReceiptImplementationBridgeHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP785_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP785_PACK_BINDING.pack_id + ".H25.migration_platform_review_receipt_implementation_bridge",
    descriptor: createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp785ReviewReceiptImplementationBridgeClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP785_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP785_PACK_BINDING.pack_id + ".C25.migration_platform_review_receipt_implementation_bridge",
    descriptor: createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP785_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP785_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp785ReviewReceiptImplementationBridgeCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP785_PACK_BINDING, {
    handoff_id: "CP00-785-to-CP00-786",
    from_pack_id: "CP00-785",
    to_pack_id: "CP00-786",
    next_subphase_id: "RP25.P08.M09.S03",
    source_descriptor: createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P08.M09.S03.",
      "Keep review receipt implementation bridge rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp786ReviewPacketRiskBridgeCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP786_PACK_BINDING, MIGRATION_PLATFORM_CP786_REQUIREMENTS, "migration-platform-cp786-review-packet-risk-bridge-case-set", "migration-platform-cp785-review-receipt-implementation-bridge-case-set");
}

export function createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor() {
  const caseSet = createMigrationPlatformCp786ReviewPacketRiskBridgeCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP786_PACK_BINDING,
    MIGRATION_PLATFORM_CP786_REQUIREMENTS,
    "MigrationPlatformCp786ReviewPacketRiskBridgeDescriptor",
    "review_packet_risk_bridge_case_set",
    caseSet,
    "packages/migration/README.md#cp00-786",
    "Continue RP25.P09.M06.S07 onward with the remaining review-risk synthetic fixture rows while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp786ReviewPacketRiskBridgeHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP786_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP786_PACK_BINDING.pack_id + ".H25.migration_platform_review_packet_risk_bridge",
    descriptor: createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp786ReviewPacketRiskBridgeClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP786_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP786_PACK_BINDING.pack_id + ".C25.migration_platform_review_packet_risk_bridge",
    descriptor: createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP786_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP786_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp786ReviewPacketRiskBridgeCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP786_PACK_BINDING, {
    handoff_id: "CP00-786-to-CP00-787",
    from_pack_id: "CP00-786",
    to_pack_id: "CP00-787",
    next_subphase_id: "RP25.P09.M06.S07",
    source_descriptor: createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue RP25 Migration Platform from RP25.P09.M06.S07.",
      "Keep review-packet risk bridge rows descriptor-only until runtime opening is explicitly approved.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}

export function createMigrationPlatformCp787ReviewRiskCloseoutCaseSet() {
  return createCaseSet(MIGRATION_PLATFORM_CP787_PACK_BINDING, MIGRATION_PLATFORM_CP787_REQUIREMENTS, "migration-platform-cp787-review-risk-closeout-case-set", "migration-platform-cp786-review-packet-risk-bridge-case-set");
}

export function createMigrationPlatformCp787ReviewRiskCloseoutDescriptor() {
  const caseSet = createMigrationPlatformCp787ReviewRiskCloseoutCaseSet();
  return createDescriptor(
    MIGRATION_PLATFORM_CP787_PACK_BINDING,
    MIGRATION_PLATFORM_CP787_REQUIREMENTS,
    "MigrationPlatformCp787ReviewRiskCloseoutDescriptor",
    "review_risk_closeout_case_set",
    caseSet,
    "packages/migration/README.md#cp00-787",
    "Continue RP26.P00.M00.S01 onward with the post-migration platform program handoff while keeping source-system import runtime, UI runtime rendering, fixture replay execution, and product-state writes closed.",
  );
}

export function createMigrationPlatformCp787ReviewRiskCloseoutHermesEvidencePacket() {
  return freezeResult(MIGRATION_PLATFORM_CP787_PACK_BINDING, {
    evidence_packet_id: MIGRATION_PLATFORM_CP787_PACK_BINDING.pack_id + ".H25.migration_platform_review_risk_closeout",
    descriptor: createMigrationPlatformCp787ReviewRiskCloseoutDescriptor().descriptor,
    gate: "H25",
    emits_runtime_receipt: false,
    writes_product_state: false,
    receipt_shape: "descriptor_only_migration_no_write",
  });
}

export function createMigrationPlatformCp787ReviewRiskCloseoutClaudeReviewPacket() {
  return freezeResult(MIGRATION_PLATFORM_CP787_PACK_BINDING, {
    review_packet_id: MIGRATION_PLATFORM_CP787_PACK_BINDING.pack_id + ".C25.migration_platform_review_risk_closeout",
    descriptor: createMigrationPlatformCp787ReviewRiskCloseoutDescriptor().descriptor,
    gate: "C25",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: MIGRATION_PLATFORM_CP787_REQUIREMENTS.allowed_claude_tools,
    invalid_review_blockers: MIGRATION_PLATFORM_CP787_REQUIREMENTS.forbidden_review_evidence,
    promotes_claude_to_final_approval: false,
  });
}

export function createMigrationPlatformCp787ReviewRiskCloseoutCloseoutHandoff() {
  return freezeResult(MIGRATION_PLATFORM_CP787_PACK_BINDING, {
    handoff_id: "CP00-787-to-CP00-788",
    from_pack_id: "CP00-787",
    to_pack_id: "CP00-788",
    next_subphase_id: "RP26.P00.M00.S01",
    source_descriptor: createMigrationPlatformCp787ReviewRiskCloseoutDescriptor().descriptor,
    handoff_descriptor_only: true,
    open_questions: Object.freeze([
      "Continue Law Firm OS closeout from RP26.P00.M00.S01.",
      "Treat CP00-787 as the RP25 Migration Platform closeout boundary and carry only descriptor evidence forward.",
      "Keep source-system imports, credentials, UI runtime rendering, fixture replay execution, real client data, and product-state writes closed.",
    ]),
  });
}
