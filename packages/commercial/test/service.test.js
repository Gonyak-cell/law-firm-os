import assert from "node:assert/strict";
import test from "node:test";
import {
  createCommercialPolicyContext,
  createCommercialInterfaceContract,
  createCommercialServiceMatrix,
  createCommercialSyntheticFixtureMatrix,
  createCommercialUiFixtureGoldenCaseMatrix,
  createCommercialUiSurfaceMatrix,
  createApprovalRequiredDescriptor,
  createReleaseCandidateDescriptor,
  createRollbackDescriptor,
  createRetryDescriptor,
  createSecondaryWorkflowDescriptor,
  evaluateCommercialReadinessPolicy,
  reviewObservabilityDescriptor,
  validateCiCdDescriptor,
  validateCommercialInterfaceContract,
  validateCommercialUiFixtureGoldenCaseMatrix,
  validateCommercialUiSurfaceMatrix,
} from "../src/index.js";

test("Commercial service descriptors stay runtime-closed on happy paths", () => {
  for (const descriptor of [
    createReleaseCandidateDescriptor(),
    validateCiCdDescriptor(),
    reviewObservabilityDescriptor(),
    createRollbackDescriptor(),
    createRetryDescriptor(),
    createSecondaryWorkflowDescriptor(),
  ]) {
    assert.equal(descriptor.request_normalized, true);
    assert.equal(descriptor.tenant_boundary_checked, true);
    assert.equal(descriptor.tenant_boundary_precheck, true);
    assert.equal(descriptor.matter_trace_checked, true);
    assert.equal(descriptor.matter_trace_precheck, true);
    assert.equal(descriptor.permission_precheck, "allowed_descriptor");
    assert.equal(descriptor.permission_binding_descriptor, "descriptor_only_no_write");
    assert.equal(descriptor.review_required_routing, false);
    assert.deepEqual(descriptor.validation_error_mapping, []);
    assert.equal(descriptor.audit_hint_precheck, true);
    assert.equal(descriptor.audit_hint.writes_audit_event_now, false);
    assert.equal(descriptor.state_transition_descriptor, "enforced_descriptor_only");
    assert.equal(descriptor.idempotency_scope, "tenant_matter_action");
    assert.equal(descriptor.lock_acquisition_rule, "declared_not_acquired");
    assert.equal(descriptor.persistence_boundary, "no_persistence");
    assert.equal(descriptor.runtime_execution, false);
    assert.equal(descriptor.runtime_lock_acquired, false);
    assert.equal(descriptor.persists_product_state, false);
    assert.equal(descriptor.writes_product_state, false);
    assert.equal(descriptor.audit_event_written, false);
    assert.equal(descriptor.rollback_executes_now, false);
    assert.equal(descriptor.retry_executes_now, false);
  }
});

test("Commercial service descriptors route approval without runtime writes", () => {
  const descriptor = createApprovalRequiredDescriptor();
  assert.equal(descriptor.permission_precheck, "approval_required");
  assert.equal(descriptor.approval_required_routing, true);
  assert.equal(descriptor.runtime_execution, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
});

test("Commercial policy fails closed for missing and cross-tenant context", () => {
  const missing = evaluateCommercialReadinessPolicy(createCommercialPolicyContext({ tenant_id: "" }));
  assert.equal(missing.decision, "denied_descriptor");
  assert.ok(missing.blocked_claims.includes("missing_context"));
  const crossTenant = evaluateCommercialReadinessPolicy(createCommercialPolicyContext({ actor_tenant_id: "tenant-synthetic-beta" }));
  assert.equal(crossTenant.decision, "denied_descriptor");
  assert.ok(crossTenant.blocked_claims.includes("cross_tenant_release_access"));
  const secondaryDenied = createSecondaryWorkflowDescriptor({ matter_trace_ref: "" });
  assert.equal(secondaryDenied.permission_precheck, "denied_descriptor");
  assert.equal(secondaryDenied.matter_trace_precheck, false);
  assert.equal(secondaryDenied.runtime_execution, false);
  assert.equal(secondaryDenied.writes_product_state, false);
});

test("Commercial policy routes risky release readiness claims to review", () => {
  const matrix = createCommercialServiceMatrix();
  assert.equal(matrix.unverified_release.permission_precheck, "review_required");
  assert.equal(matrix.unverified_release.review_required_routing, true);
  assert.ok(matrix.unverified_release.validation_errors.includes("unverified_release"));
  assert.ok(matrix.unverified_release.validation_error_mapping.some((mapping) => mapping.claim === "unverified_release" && mapping.route === "review_required"));
  assert.equal(matrix.missing_observability.permission_precheck, "review_required");
  assert.ok(matrix.missing_observability.validation_errors.includes("missing_observability"));
  assert.equal(matrix.compliance_evidence_gap.permission_precheck, "review_required");
  assert.ok(matrix.compliance_evidence_gap.validation_errors.includes("compliance_evidence_gap"));
  assert.equal(matrix.unsafe_deploy.permission_precheck, "review_required");
  assert.ok(matrix.unsafe_deploy.validation_errors.includes("unsafe_deploy"));
  assert.equal(matrix.customer_plan_mismatch.permission_precheck, "review_required");
  assert.ok(matrix.customer_plan_mismatch.validation_errors.includes("customer_plan_mismatch"));
});

test("Commercial synthetic fixtures cover permission and audit binding without real data", () => {
  const fixtures = createCommercialSyntheticFixtureMatrix();
  assert.equal(fixtures.service_entrypoint_contract.permission_binding_descriptor, "descriptor_only_no_write");
  assert.equal(fixtures.request_normalization.request_normalized, true);
  assert.equal(fixtures.tenant_boundary_precheck.pass_fixture, true);
  assert.equal(fixtures.tenant_boundary_precheck.denied_fixture, false);
  assert.ok(fixtures.tenant_boundary_precheck.denied_claims.includes("cross_tenant_release_access"));
  assert.equal(fixtures.matter_trace_precheck.pass_fixture, true);
  assert.equal(fixtures.matter_trace_precheck.denied_fixture, false);
  assert.ok(fixtures.matter_trace_precheck.denied_claims.includes("missing_context"));
  assert.equal(fixtures.permission_precheck.allowed_descriptor, "allowed_descriptor");
  assert.equal(fixtures.permission_precheck.review_required, "review_required");
  assert.equal(fixtures.permission_precheck.approval_required, "approval_required");
  assert.equal(fixtures.permission_precheck.denied_descriptor, "denied_descriptor");
  assert.equal(fixtures.audit_hint_precheck.writes_audit_event_now, false);
  assert.equal(fixtures.secondary_workflow_path.secondary_workflow_path, true);
  for (const row of Object.values(fixtures)) {
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
    assert.equal(row.real_client_data_included, false);
    assert.equal(row.credential_or_secret_included, false);
    assert.equal(row.permission_decision_written, false);
    assert.equal(row.audit_event_written, false);
    assert.equal(row.runtime_receipt_emitted, false);
  }
});

test("Commercial interface contract exposes descriptor-only API shape", () => {
  const contract = createCommercialInterfaceContract();
  const validation = validateCommercialInterfaceContract(contract);
  assert.deepEqual(validation.errors, []);
  assert.equal(contract.descriptor_only, true);
  assert.equal(contract.runtime_execution, false);
  assert.ok(contract.public_export_map.exports.includes("createCommercialInterfaceContract"));
  assert.ok(contract.request_contract.required_fields.includes("matter_trace_ref"));
  assert.ok(contract.response_contract.fields.includes("audit_hint"));
  assert.ok(contract.error_code_taxonomy.includes("cross_tenant_release_access"));
  assert.equal(contract.permission_annotation.permission_decision_written, false);
  assert.equal(contract.audit_annotation.audit_event_written, false);
  assert.equal(contract.serialization_guard.unauthorized_data_omitted, true);
  assert.equal(contract.api_fixture.synthetic_only, true);
  assert.equal(contract.api_fixture.integration_smoke_executes_runtime, false);
  assert.equal(contract.interface_test_matrix.contract_test.runtime_execution, false);
  assert.equal(contract.interface_test_matrix.invalid_request_test.decision, "denied_descriptor");
  assert.ok(contract.interface_test_matrix.invalid_request_test.validation_errors.includes("cross_tenant_release_access"));
  assert.equal(contract.interface_test_matrix.invalid_request_test.permission_decision_written, false);
  assert.equal(contract.interface_test_matrix.invalid_request_test.audit_event_written, false);
  assert.equal(contract.interface_test_matrix.denied_response_test.denied_response_omits_unauthorized_data, true);
  assert.equal(contract.interface_test_matrix.denied_response_test.runtime_receipt_emitted, false);
  assert.equal(contract.interface_test_matrix.review_required_response_test.decision, "review_required");
  assert.equal(contract.hermes_api_evidence.emits_runtime_receipt, false);
  assert.equal(contract.claude_interface_prompt.read_only, true);
});

test("Commercial UI surface matrix preserves no-leak descriptor boundaries", () => {
  const matrix = createCommercialUiSurfaceMatrix();
  const validation = validateCommercialUiSurfaceMatrix(matrix);
  assert.deepEqual(validation.errors, []);
  assert.equal(matrix.descriptor_only, true);
  assert.equal(matrix.runtime_execution, false);
  assert.equal(matrix.ui_surface_inventory.opens_runtime_surface, false);
  assert.equal(matrix.data_dependency_map.real_client_data_included, false);
  assert.equal(matrix.data_dependency_map.unauthorized_count_leak, false);
  assert.equal(matrix.denied_state.fail_closed, true);
  assert.equal(matrix.denied_state.unauthorized_data_omitted, true);
  assert.equal(matrix.denied_state.unauthorized_count_leak, false);
  assert.equal(matrix.permission_badge.permission_decision_written, false);
  assert.equal(matrix.permission_badge.exposes_permission_decision_body, false);
  assert.equal(matrix.audit_hint_display.audit_event_written, false);
  assert.equal(matrix.audit_hint_display.exposes_audit_event_body, false);
  assert.equal(matrix.build_smoke.executes_runtime_smoke, false);
  assert.equal(matrix.hermes_ui_evidence.emits_runtime_receipt, false);
  assert.equal(matrix.claude_ui_leak_prompt.read_only, true);
  assert.equal(matrix.closeout_handoff.next_ui_rows.includes("RP29.P04.M04"), false);
  assert.equal(matrix.no_unauthorized_count_leak.count_values_included, false);
});

test("Commercial UI fixture golden-case matrix stays synthetic and runtime-closed", () => {
  const matrix = createCommercialUiFixtureGoldenCaseMatrix();
  const validation = validateCommercialUiFixtureGoldenCaseMatrix(matrix);
  assert.deepEqual(validation.errors, []);
  assert.equal(matrix.descriptor_only, true);
  assert.equal(matrix.runtime_execution, false);
  assert.equal(matrix.fixture_scope.opens_runtime_ui, false);
  assert.equal(matrix.fixture_scope.real_client_data_included, false);
  assert.equal(matrix.fixture_scope.credential_or_secret_included, false);
  assert.equal(matrix.fixture_manifest.aggregate_count_included, false);
  assert.equal(matrix.cases.cross_tenant_case.unauthorized_data_omitted, true);
  assert.equal(matrix.cases.cross_tenant_case.unauthorized_count_leak, false);
  assert.equal(matrix.cases.denied_case.permission_decision_written, false);
  assert.equal(matrix.cases.audit_hint_case.audit_event_written, false);
  assert.equal(matrix.golden_test.executes_runtime_test, false);
  assert.equal(matrix.failure_test.executes_runtime_test, false);
  assert.ok(matrix.failure_test.fail_closed_cases.includes("cross_tenant_case"));
  assert.equal(matrix.hermes_fixture_evidence.emits_runtime_receipt, false);
  assert.equal(matrix.claude_missing_test_prompt.read_only, true);
  assert.equal(matrix.claude_missing_test_prompt.promotes_claude_to_final_approval, false);
  assert.equal(matrix.no_real_data_check.enforced, true);
  assert.equal(matrix.no_real_data_check.customer_or_matter_names_included, false);
  assert.equal(matrix.stable_id_check.deterministic_case_ids, true);
  assert.equal(matrix.stable_id_check.exposes_customer_or_matter_ids, false);
  assert.equal(matrix.replay_command.executes_replay, false);
  assert.equal(matrix.replay_command.emits_runtime_receipt, false);
});
