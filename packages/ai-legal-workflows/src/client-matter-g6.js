export const AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE = Object.freeze([
  "LFOS-G6-W10-T009",
  "LFOS-G6-W10-T010",
  "LFOS-G6-W10-T011",
  "LFOS-G6-W10-T012",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function noRuntimeBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    dispatches_ai_legal_workflows_runtime: false,
    dispatches_precedent_runtime: false,
    dispatches_dd_extraction_runtime: false,
    dispatches_clause_markup_runtime: false,
    dispatches_ai_model_runtime: false,
    dispatches_ai_governance_runtime: false,
    auto_final_legal_decision: false,
    g6_runtime_readiness_claim: "open",
    ai_legal_workflows_runtime_readiness_claim: "open",
  };
}

function hasHumanApprovalStep(steps) {
  return steps.some((step) => step?.type === "human_approval" || step?.requires_human_approval === true);
}

function requestsAutoFinalDecision(workflow = {}, steps = []) {
  return (
    workflow.auto_final_legal_decision === true ||
    workflow.final_legal_decision === true ||
    steps.some((step) => step?.auto_final_legal_decision === true || step?.action === "final_legal_decision")
  );
}

export function createAiLegalWorkflowsG6LegalWorkflowModelDescriptor(request = {}) {
  const workflow = request.legal_workflow ?? {};
  const steps = freezeArray(workflow.steps ?? request.steps);
  const runtimeDispatch = request.dispatched_runtime === true || workflow.dispatched_runtime === true;
  const humanApprovalStep = hasHumanApprovalStep(steps);
  const autoFinalDecision = requestsAutoFinalDecision(workflow, steps);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "legal_workflow"], request).length > 0) {
    blockedClaims.push("legal_workflow_required_context_missing");
  }
  if (!workflow.workflow_id) blockedClaims.push("legal_workflow_id_required");
  if (!humanApprovalStep) blockedClaims.push("legal_workflow_human_approval_step_required");
  if (workflow.tenant_id && workflow.tenant_id !== request.tenant_id) blockedClaims.push("legal_workflow_cross_tenant_blocked");
  if (workflow.matter_id && workflow.matter_id !== request.matter_id) blockedClaims.push("legal_workflow_matter_trace_mismatch");
  if (autoFinalDecision) blockedClaims.push("legal_workflow_auto_final_legal_decision_blocked");
  if (runtimeDispatch) blockedClaims.push("legal_workflow_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T009"),
    descriptor_type: "ai_legal_workflows_g6_legal_workflow_model_descriptor",
    tenant_id: request.tenant_id ?? workflow.tenant_id ?? null,
    matter_id: request.matter_id ?? workflow.matter_id ?? null,
    workflow_id: workflow.workflow_id ?? null,
    step_count: steps.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    legal_workflow_receipt: freezeRecord({
      human_approval_step_tested: humanApprovalStep,
      auto_final_legal_decision_blocked: autoFinalDecision,
      workflow_model_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor(request = {}) {
  const builderConfig = request.builder_config ?? {};
  const steps = freezeArray(builderConfig.steps ?? request.steps);
  const runtimeUi = request.executes_ui_runtime === true || builderConfig.executes_ui_runtime === true;
  const humanApprovalLocked = builderConfig.human_approval_step_locked === true || hasHumanApprovalStep(steps);
  const autoFinalDecision =
    builderConfig.allows_auto_final_legal_decision === true ||
    builderConfig.final_legal_decision_action_enabled === true ||
    steps.some((step) => step?.action === "final_legal_decision" || step?.auto_final_legal_decision === true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "workflow_id", "builder_config"], request).length > 0) {
    blockedClaims.push("workflow_builder_required_context_missing");
  }
  if (!humanApprovalLocked) blockedClaims.push("workflow_builder_human_approval_lock_required");
  if (autoFinalDecision) blockedClaims.push("workflow_builder_no_auto_final_legal_decision_required");
  if (runtimeUi) blockedClaims.push("workflow_builder_runtime_ui_execution_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T010"),
    descriptor_type: "ai_legal_workflows_g6_workflow_builder_ui_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    workflow_id: request.workflow_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    workflow_builder_receipt: freezeRecord({
      human_approval_step_locked: humanApprovalLocked,
      no_auto_final_legal_decision_tested: !autoFinalDecision,
      builder_ui_persisted: false,
      ui_runtime_executed: runtimeUi,
    }),
  });
}

export function createAiLegalWorkflowsG6AIOutputExportDescriptor(request = {}) {
  const exportRequest = request.export_request ?? {};
  const aiOutput = request.ai_output ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || exportRequest.dispatched_runtime === true;
  const privilegeInherited = exportRequest.privilege_label_inherited === true && aiOutput.privilege_label !== undefined;
  const aclInherited = exportRequest.dms_acl_inherited === true && exportRequest.permission_inherited === true;
  const externalShareBoundaryChecked = exportRequest.external_share_boundary_checked === true;
  const aclBypassAttempted = exportRequest.bypasses_acl === true || request.bypasses_acl === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "ai_output_id", "export_request"], request).length > 0) {
    blockedClaims.push("ai_output_export_required_context_missing");
  }
  if (!exportRequest.export_request_id) blockedClaims.push("ai_output_export_request_id_required");
  if (aiOutput.ai_output_id && aiOutput.ai_output_id !== request.ai_output_id) blockedClaims.push("ai_output_export_trace_mismatch");
  if (aiOutput.tenant_id && aiOutput.tenant_id !== request.tenant_id) blockedClaims.push("ai_output_export_cross_tenant_blocked");
  if (aiOutput.matter_id && aiOutput.matter_id !== request.matter_id) blockedClaims.push("ai_output_export_matter_trace_mismatch");
  if (!privilegeInherited) blockedClaims.push("ai_output_export_privilege_label_inheritance_required");
  if (!aclInherited) blockedClaims.push("ai_output_export_acl_inheritance_required");
  if (!externalShareBoundaryChecked) blockedClaims.push("ai_output_export_external_share_boundary_required");
  if (aclBypassAttempted) blockedClaims.push("ai_output_export_acl_bypass_blocked");
  if (runtimeDispatch) blockedClaims.push("ai_output_export_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T011"),
    descriptor_type: "ai_legal_workflows_g6_ai_output_export_descriptor",
    tenant_id: request.tenant_id ?? aiOutput.tenant_id ?? null,
    matter_id: request.matter_id ?? aiOutput.matter_id ?? null,
    ai_output_id: request.ai_output_id ?? aiOutput.ai_output_id ?? null,
    export_request_id: exportRequest.export_request_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    ai_output_export_receipt: freezeRecord({
      privilege_label_inheritance_tested: privilegeInherited,
      acl_inheritance_tested: aclInherited,
      external_share_boundary_tested: externalShareBoundaryChecked,
      ai_acl_bypass_attempt_blocked: aclBypassAttempted,
      export_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g6_ai_legal_workflows_closeout_evidence_required");
  }
  if (request.ai_output_review_closed !== true) blockedClaims.push("g6_ai_legal_requires_ai_output_review_handoff");
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g6_ai_legal_workflows_blocked_descriptor_present");
  }

  const exportDescriptor = descriptors.find((descriptor) => descriptor?.tuw_id === "LFOS-G6-W10-T011");
  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T009..LFOS-G6-W10-T012"),
    descriptor_type: "ai_legal_workflows_g6e_legal_workflows_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G6-E",
    tuw_coverage: AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    human_approval_step_tested: descriptorTuws.has("LFOS-G6-W10-T009"),
    no_auto_final_legal_decision_tested: descriptorTuws.has("LFOS-G6-W10-T010"),
    privilege_label_inheritance_tested: descriptorTuws.has("LFOS-G6-W10-T011"),
    ai_acl_bypass_blocked:
      exportDescriptor?.ai_output_export_receipt?.acl_inheritance_tested === true &&
      exportDescriptor?.ai_output_export_receipt?.runtime_dispatched === false,
    g6_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      ai_legal_workflows_runtime_opened: false,
      ai_output_export_persisted: false,
      final_legal_decision_automated: false,
      draft_pr_self_merged: false,
    }),
  });
}
