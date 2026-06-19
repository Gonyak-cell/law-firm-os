import { evaluateCommercialReadinessPolicy, createCommercialPolicyContext } from "./policies.js";

function auditHint(action, policy) {
  return Object.freeze({
    action,
    decision: policy.decision,
    blocked_claims: policy.blocked_claims,
    write_required_later: true,
    writes_audit_event_now: false,
  });
}

function validationErrorMapping(policy) {
  return Object.freeze(
    policy.blocked_claims.map((claim) =>
      Object.freeze({
        claim,
        route: policy.decision,
        descriptor_only: true,
        runtime_execution: false,
        writes_permission_decision_now: false,
        writes_audit_event_now: false,
      }),
    ),
  );
}

function serviceDescriptor(action, overrides = {}) {
  const context = createCommercialPolicyContext({ action, ...overrides });
  const policy = evaluateCommercialReadinessPolicy(context);
  const tenantBoundaryPasses = Boolean(context.tenant_id && context.actor_tenant_id && context.tenant_id === context.actor_tenant_id);
  const matterTracePasses = Boolean(context.matter_trace_ref);
  const workflowName = overrides.workflow_name ?? "primary_release_readiness";
  return Object.freeze({
    action,
    workflow_name: workflowName,
    request_normalized: true,
    tenant_boundary_checked: true,
    tenant_boundary_precheck: tenantBoundaryPasses,
    matter_trace_checked: true,
    matter_trace_precheck: matterTracePasses,
    permission_precheck: policy.decision,
    permission_binding_descriptor: "descriptor_only_no_write",
    audit_hint: auditHint(action, policy),
    audit_hint_precheck: true,
    primary_happy_path: policy.decision === "allowed_descriptor",
    secondary_workflow_path: workflowName === "secondary_compliance_review",
    review_required_routing: policy.decision === "review_required",
    approval_required_routing: policy.decision === "approval_required",
    blocked_claim_output: policy.blocked_claims,
    validation_error_mapping: validationErrorMapping(policy),
    state_transition_enforced: true,
    state_transition_descriptor: "enforced_descriptor_only",
    idempotency_key_required: true,
    idempotency_scope: "tenant_matter_action",
    runtime_lock_acquired: false,
    lock_acquisition_rule: "declared_not_acquired",
    rollback_executes_now: false,
    retry_executes_now: false,
    persistence_boundary: "no_persistence",
    persists_product_state: false,
    writes_product_state: false,
    permission_decision_written: false,
    audit_event_written: false,
    runtime_execution: false,
    validation_errors: policy.blocked_claims,
  });
}

function syntheticFixtureRow(title, evidence = {}) {
  return Object.freeze({
    title,
    descriptor_only: true,
    runtime_execution: false,
    real_client_data_included: false,
    credential_or_secret_included: false,
    permission_decision_written: false,
    audit_event_written: false,
    runtime_receipt_emitted: false,
    ...evidence,
  });
}

export function createReleaseCandidateDescriptor(overrides = {}) {
  return serviceDescriptor("create_release_candidate", overrides);
}

export function validateCiCdDescriptor(overrides = {}) {
  return serviceDescriptor("validate_ci_cd", overrides);
}

export function reviewObservabilityDescriptor(overrides = {}) {
  return serviceDescriptor("review_observability", overrides);
}

export function createApprovalRequiredDescriptor(overrides = {}) {
  return serviceDescriptor("approve_production_release", overrides);
}

export function createRollbackDescriptor(overrides = {}) {
  const descriptor = serviceDescriptor("rollback_release", overrides);
  return Object.freeze({
    ...descriptor,
    rollback_behavior_descriptor: true,
    rollback_executes_now: false,
  });
}

export function createRetryDescriptor(overrides = {}) {
  const descriptor = serviceDescriptor("retry_release_readiness", overrides);
  return Object.freeze({
    ...descriptor,
    retry_behavior_descriptor: true,
    retry_executes_now: false,
  });
}

export function createSecondaryWorkflowDescriptor(overrides = {}) {
  return serviceDescriptor("generate_compliance_report", {
    workflow_name: "secondary_compliance_review",
    ...overrides,
  });
}

export function createCommercialServiceMatrix() {
  return Object.freeze({
    release_candidate_creation: createReleaseCandidateDescriptor(),
    ci_cd_validation: validateCiCdDescriptor(),
    observability_review: reviewObservabilityDescriptor(),
    approval_required: createApprovalRequiredDescriptor(),
    rollback_behavior: createRollbackDescriptor(),
    retry_behavior: createRetryDescriptor(),
    secondary_workflow: createSecondaryWorkflowDescriptor(),
    unverified_release: createReleaseCandidateDescriptor({ release_verified: false }),
    missing_observability: reviewObservabilityDescriptor({ observability_present: false }),
    compliance_evidence_gap: createReleaseCandidateDescriptor({ compliance_evidence_present: false }),
    unsafe_deploy: createReleaseCandidateDescriptor({ deploy_safe: false }),
    customer_plan_mismatch: createReleaseCandidateDescriptor({ customer_plan_matches: false }),
    cross_tenant_denied: createReleaseCandidateDescriptor({ actor_tenant_id: "tenant-synthetic-beta" }),
  });
}

export function createCommercialSyntheticFixtureMatrix() {
  const happy = createReleaseCandidateDescriptor();
  const reviewRequired = createReleaseCandidateDescriptor({ release_verified: false });
  const approvalRequired = createApprovalRequiredDescriptor();
  const crossTenantDenied = createReleaseCandidateDescriptor({ actor_tenant_id: "tenant-synthetic-beta" });
  const missingMatterTrace = createSecondaryWorkflowDescriptor({ matter_trace_ref: "" });
  const secondary = createSecondaryWorkflowDescriptor();
  return Object.freeze({
    service_entrypoint_contract: syntheticFixtureRow("Service entrypoint contract", {
      action: happy.action,
      workflow_name: happy.workflow_name,
      permission_binding_descriptor: happy.permission_binding_descriptor,
    }),
    request_normalization: syntheticFixtureRow("Request normalization", {
      request_normalized: happy.request_normalized,
    }),
    tenant_boundary_precheck: syntheticFixtureRow("Tenant boundary precheck", {
      pass_fixture: happy.tenant_boundary_precheck,
      denied_fixture: crossTenantDenied.tenant_boundary_precheck,
      denied_claims: crossTenantDenied.validation_errors,
    }),
    matter_trace_precheck: syntheticFixtureRow("Matter trace precheck", {
      pass_fixture: secondary.matter_trace_precheck,
      denied_fixture: missingMatterTrace.matter_trace_precheck,
      denied_claims: missingMatterTrace.validation_errors,
    }),
    permission_precheck: syntheticFixtureRow("Permission precheck", {
      allowed_descriptor: happy.permission_precheck,
      review_required: reviewRequired.permission_precheck,
      approval_required: approvalRequired.permission_precheck,
      denied_descriptor: crossTenantDenied.permission_precheck,
    }),
    audit_hint_precheck: syntheticFixtureRow("Audit hint precheck", {
      writes_audit_event_now: happy.audit_hint.writes_audit_event_now,
    }),
    primary_happy_path: syntheticFixtureRow("Primary happy path", {
      primary_happy_path: happy.primary_happy_path,
    }),
    secondary_workflow_path: syntheticFixtureRow("Secondary workflow path", {
      workflow_name: secondary.workflow_name,
      secondary_workflow_path: secondary.secondary_workflow_path,
    }),
  });
}
