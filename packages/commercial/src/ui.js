function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

export const COMMERCIAL_UI_SURFACE_NAMES = Object.freeze([
  "release_readiness_console",
  "observability_gate_panel",
  "compliance_evidence_panel",
  "customer_plan_boundary_panel",
]);

export const COMMERCIAL_UI_FIXTURE_CASE_NAMES = Object.freeze([
  "base_tenant_fixture",
  "base_user_fixture",
  "base_matter_fixture",
  "base_document_fixture",
  "primary_golden_case",
  "secondary_golden_case",
  "review_required_case",
  "denied_case",
  "cross_tenant_case",
  "missing_context_case",
  "audit_hint_case",
  "security_trimming_case",
  "ai_retrieval_or_analytics_case",
]);

export function createCommercialUiSurfaceMatrix() {
  return freeze({
    schema_version: "law-firm-os.commercial-ui-surface.v0.1",
    descriptor_only: true,
    runtime_execution: false,
    ui_surface_inventory: {
      surfaces: COMMERCIAL_UI_SURFACE_NAMES,
      opens_runtime_surface: false,
      runtime_endpoint_bound: false,
    },
    data_dependency_map: {
      descriptor_sources: ["ReleaseCandidate", "ObservabilitySignal", "ComplianceReport", "CustomerPlan"],
      real_client_data_included: false,
      credential_or_secret_included: false,
      unauthorized_count_leak: false,
    },
    loading_state: {
      skeleton_only: true,
      fetches_runtime_data: false,
      exposes_record_count: false,
    },
    empty_state: {
      synthetic_copy_only: true,
      exposes_customer_or_matter_names: false,
      exposes_record_count: false,
    },
    denied_state: {
      fail_closed: true,
      unauthorized_data_omitted: true,
      unauthorized_count_leak: false,
      permission_decision_written: false,
    },
    review_required_state: {
      routes_to_human_review: true,
      claude_is_final_approval: false,
      unauthorized_data_omitted: true,
      runtime_execution: false,
    },
    primary_interaction: {
      action_descriptor: "open_release_readiness_panel",
      dispatches_runtime_action: false,
      writes_product_state: false,
    },
    secondary_interaction: {
      action_descriptor: "open_compliance_evidence_panel",
      dispatches_runtime_action: false,
      writes_product_state: false,
    },
    permission_badge: {
      permission_precheck_required: true,
      permission_decision_written: false,
      exposes_permission_decision_body: false,
    },
    audit_hint_display: {
      audit_hint_only: true,
      audit_event_written: false,
      exposes_audit_event_body: false,
    },
    error_message_copy: {
      blocked_claims_summarized: true,
      sensitive_detail_included: false,
      credential_or_secret_included: false,
    },
    responsive_desktop_layout: {
      breakpoint_descriptor: "desktop",
      runtime_measurement_required: false,
      unauthorized_count_leak: false,
    },
    responsive_mobile_layout: {
      breakpoint_descriptor: "mobile",
      runtime_measurement_required: false,
      unauthorized_count_leak: false,
    },
    keyboard_focus_behavior: {
      deterministic_focus_order: true,
      focus_trap_runtime_bound: false,
      keyboard_shortcut_dispatches_runtime: false,
    },
    visual_density_check: {
      density_descriptor: "compact_operational",
      marketing_hero_layout: false,
      visual_density_runtime_bound: false,
    },
    synthetic_fixture_binding: {
      synthetic_only: true,
      real_client_data_included: false,
      credential_or_secret_included: false,
    },
    build_smoke: {
      build_smoke_descriptor: true,
      executes_runtime_smoke: false,
      opens_runtime_endpoint: false,
    },
    hermes_ui_evidence: {
      gate: "H29",
      evidence_only: true,
      emits_runtime_receipt: false,
    },
    claude_ui_leak_prompt: {
      gate: "C29",
      read_only: true,
      promotes_claude_to_final_approval: false,
    },
    closeout_handoff: {
      runtime_opening_allowed: false,
      next_ui_rows: "continue descriptor-only UI fixture and evidence rows without runtime opening",
    },
    state_snapshot: {
      snapshot_descriptor_only: true,
      unauthorized_data_omitted: true,
      unauthorized_count_leak: false,
    },
    no_unauthorized_count_leak: {
      enforced: true,
      count_values_included: false,
      aggregate_count_included: false,
    },
    no_write_attestation: {
      writes_product_state: false,
      permission_decision_written: false,
      audit_event_written: false,
      runtime_receipt_emitted: false,
      real_client_data_included: false,
      credential_or_secret_included: false,
    },
  });
}

export function createCommercialUiFixtureGoldenCaseMatrix() {
  const baseCaseAttestation = {
    synthetic_only: true,
    descriptor_only: true,
    runtime_execution: false,
    writes_product_state: false,
    permission_decision_written: false,
    audit_event_written: false,
    runtime_receipt_emitted: false,
    real_client_data_included: false,
    credential_or_secret_included: false,
  };
  const cases = {};
  for (const caseName of COMMERCIAL_UI_FIXTURE_CASE_NAMES) {
    cases[caseName] = {
      ...baseCaseAttestation,
      case_name: caseName,
      unauthorized_data_omitted: true,
      unauthorized_count_leak: false,
    };
  }
  return freeze({
    schema_version: "law-firm-os.commercial-ui-fixture-golden-case.v0.1",
    descriptor_only: true,
    runtime_execution: false,
    fixture_scope: {
      opens_runtime_ui: false,
      binds_runtime_endpoint: false,
      synthetic_tenants: ["tenant-synthetic-alpha", "tenant-synthetic-beta"],
      synthetic_matter_refs: ["matter-synthetic-release-readiness", "matter-synthetic-commercial-denied"],
      real_client_data_included: false,
      credential_or_secret_included: false,
    },
    cases,
    fixture_manifest: {
      case_count: COMMERCIAL_UI_FIXTURE_CASE_NAMES.length,
      manifest_descriptor_only: true,
      exposes_customer_or_matter_names: false,
      aggregate_count_included: false,
    },
    golden_test: {
      descriptor_only: true,
      executes_runtime_test: false,
      validates_loading_empty_denied_review_states: true,
      unauthorized_count_leak: false,
    },
    failure_test: {
      descriptor_only: true,
      executes_runtime_test: false,
      fail_closed_cases: ["denied_case", "cross_tenant_case", "missing_context_case"],
      permission_decision_written: false,
      audit_event_written: false,
    },
    hermes_fixture_evidence: {
      gate: "H29",
      evidence_only: true,
      emits_runtime_receipt: false,
      runtime_execution: false,
    },
    claude_missing_test_prompt: {
      gate: "C29",
      read_only: true,
      promotes_claude_to_final_approval: false,
      missing_test_prompt_descriptor: true,
      runtime_execution: false,
    },
    closeout_handoff: {
      runtime_opening_allowed: false,
      next_fixture_rows: "continue RP29.P05 fixture/golden-case rows without executing fixture runtime",
      writes_product_state: false,
    },
    no_real_data_check: {
      enforced: true,
      real_client_data_included: false,
      credential_or_secret_included: false,
      customer_or_matter_names_included: false,
    },
    stable_id_check: {
      deterministic_case_ids: true,
      uses_runtime_generated_ids: false,
      exposes_customer_or_matter_ids: false,
    },
    replay_command: {
      descriptor_only: true,
      executes_replay: false,
      emits_runtime_receipt: false,
      writes_product_state: false,
    },
    no_write_attestation: {
      writes_product_state: false,
      permission_decision_written: false,
      audit_event_written: false,
      runtime_receipt_emitted: false,
      real_client_data_included: false,
      credential_or_secret_included: false,
    },
  });
}
