export const AI_GOVERNANCE_G6C_TUW_COVERAGE = Object.freeze([
  "LFOS-G6-W10-T001",
  "LFOS-G6-W10-T002",
  "LFOS-G6-W10-T003",
  "LFOS-G6-W10-T004",
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

function noRuntimeBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    dispatches_ai_governance_runtime: false,
    dispatches_model_policy_runtime: false,
    dispatches_retrieval_scope_runtime: false,
    dispatches_dms_runtime: false,
    dispatches_ai_model_runtime: false,
    exposes_raw_payload: false,
    promotes_ai_output_to_final: false,
    g6_runtime_readiness_claim: "open",
    ai_runtime_readiness_claim: "open",
  };
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function hasAll(values, expected) {
  const set = new Set(freezeArray(values));
  return expected.every((value) => set.has(value));
}

export function createAiGovernanceG6ModelPolicyDescriptor(request = {}) {
  const policy = request.model_policy ?? {};
  const matterSensitivityRoutes = freezeArray(policy.matter_sensitivity_routes ?? request.matter_sensitivity_routes);
  const privilegeLabelRoutes = freezeArray(policy.privilege_label_routes ?? request.privilege_label_routes);
  const disabledStates = freezeArray(policy.disable_states ?? request.disable_states);
  const runtimeDispatch = request.dispatched_runtime === true || policy.dispatched_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "model_policy"], request).length > 0) {
    blockedClaims.push("model_policy_required_context_missing");
  }
  if (!policy.model_policy_id) blockedClaims.push("model_policy_id_required");
  if (!hasAll(matterSensitivityRoutes, ["public", "confidential", "privileged"])) {
    blockedClaims.push("model_policy_matter_sensitivity_routing_required");
  }
  if (!hasAll(privilegeLabelRoutes, ["attorney_client", "work_product", "legal_hold"])) {
    blockedClaims.push("model_policy_privilege_label_routing_required");
  }
  if (!hasAll(disabledStates, ["dark_launch_off", "disable_switch_on"])) {
    blockedClaims.push("model_policy_dark_launch_or_disable_switch_required");
  }
  if (policy.tenant_id && policy.tenant_id !== request.tenant_id) blockedClaims.push("model_policy_cross_tenant_blocked");
  if (policy.matter_id && policy.matter_id !== request.matter_id) blockedClaims.push("model_policy_matter_trace_mismatch");
  if (runtimeDispatch) blockedClaims.push("model_policy_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T001"),
    descriptor_type: "ai_governance_g6_model_policy_descriptor",
    tenant_id: request.tenant_id ?? policy.tenant_id ?? null,
    matter_id: request.matter_id ?? policy.matter_id ?? null,
    model_policy_id: policy.model_policy_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    model_policy_receipt: freezeRecord({
      matter_sensitivity_routing_tested: hasAll(matterSensitivityRoutes, ["public", "confidential", "privileged"]),
      privilege_label_routing_tested: hasAll(privilegeLabelRoutes, ["attorney_client", "work_product", "legal_hold"]),
      dark_launch_disable_switch_tested: hasAll(disabledStates, ["dark_launch_off", "disable_switch_on"]),
      model_policy_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAiGovernanceG6RetrievalRequestDescriptor(request = {}) {
  const retrievalRequest = request.retrieval_request ?? {};
  const sourceRefs = freezeArray(request.source_refs ?? retrievalRequest.source_refs);
  const runtimeDispatch = request.dispatched_runtime === true || retrievalRequest.dispatched_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "retrieval_request"], request).length > 0) {
    blockedClaims.push("retrieval_request_required_context_missing");
  }
  if (!retrievalRequest.retrieval_request_id) blockedClaims.push("retrieval_request_id_required");
  if (!request.matter_id && !retrievalRequest.matter_id) blockedClaims.push("retrieval_request_matter_required");
  if (sourceRefs.length === 0) blockedClaims.push("retrieval_request_source_refs_required");
  if (retrievalRequest.tenant_id && retrievalRequest.tenant_id !== request.tenant_id) {
    blockedClaims.push("retrieval_request_cross_tenant_blocked");
  }
  if (retrievalRequest.matter_id && request.matter_id && retrievalRequest.matter_id !== request.matter_id) {
    blockedClaims.push("retrieval_request_matter_trace_mismatch");
  }
  if (runtimeDispatch) blockedClaims.push("retrieval_request_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T002"),
    descriptor_type: "ai_governance_g6_retrieval_request_descriptor",
    tenant_id: request.tenant_id ?? retrievalRequest.tenant_id ?? null,
    matter_id: request.matter_id ?? retrievalRequest.matter_id ?? null,
    retrieval_request_id: retrievalRequest.retrieval_request_id ?? null,
    source_ref_count: sourceRefs.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    retrieval_request_receipt: freezeRecord({
      matter_required_tested: Boolean(request.matter_id ?? retrievalRequest.matter_id),
      source_refs_tested: sourceRefs.length > 0,
      retrieval_request_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAiGovernanceG6PermissionAwareRetrievalDescriptor(request = {}) {
  const candidateDocs = freezeArray(request.candidate_docs);
  const retrievedDocIds = new Set(freezeArray(request.retrieved_doc_ids));
  const authorizedDocIds = new Set(freezeArray(request.authorized_doc_ids));
  const aclEvidence = freezeArray(request.acl_evidence);
  const runtimeDispatch = request.dispatched_runtime === true || request.retrieval_result?.dispatched_runtime === true;
  const unauthorizedRetrieved = candidateDocs.some((doc) => retrievedDocIds.has(doc?.document_id) && !authorizedDocIds.has(doc?.document_id));
  const missingPrivilegeInheritance = candidateDocs.some(
    (doc) => retrievedDocIds.has(doc?.document_id) && doc?.privilege_label && doc?.privilege_label_inherited !== true,
  );
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "candidate_docs", "authorized_doc_ids", "retrieved_doc_ids", "acl_evidence"], request).length > 0) {
    blockedClaims.push("permission_retrieval_required_context_missing");
  }
  if (aclEvidence.length === 0) blockedClaims.push("permission_retrieval_acl_evidence_required");
  if (candidateDocs.length === 0) blockedClaims.push("permission_retrieval_candidate_docs_required");
  if (unauthorizedRetrieved) blockedClaims.push("permission_retrieval_unauthorized_doc_not_retrieved");
  if (missingPrivilegeInheritance) blockedClaims.push("permission_retrieval_privilege_label_inheritance_required");
  if (candidateDocs.some((doc) => doc?.tenant_id && doc.tenant_id !== request.tenant_id)) {
    blockedClaims.push("permission_retrieval_cross_tenant_blocked");
  }
  if (candidateDocs.some((doc) => doc?.matter_id && doc.matter_id !== request.matter_id)) {
    blockedClaims.push("permission_retrieval_matter_trace_mismatch");
  }
  if (runtimeDispatch) blockedClaims.push("permission_retrieval_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T003"),
    descriptor_type: "ai_governance_g6_permission_aware_retrieval_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    candidate_doc_count: candidateDocs.length,
    retrieved_doc_count: retrievedDocIds.size,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    permission_retrieval_receipt: freezeRecord({
      acl_evidence_tested: aclEvidence.length > 0,
      unauthorized_doc_excluded: !unauthorizedRetrieved && retrievedDocIds.size > 0,
      privilege_label_inheritance_tested: !missingPrivilegeInheritance && retrievedDocIds.size > 0,
      retrieval_runtime_dispatched: runtimeDispatch,
      retrieved_documents_persisted: false,
    }),
  });
}

export function createAiGovernanceG6PromptLogDescriptor(request = {}) {
  const promptLog = request.prompt_log ?? {};
  const retrievalRequestId = request.retrieval_request_id ?? promptLog.retrieval_request_id;
  const rawPromptExposed = request.raw_prompt_exposed === true || promptLog.raw_prompt_exposed === true || Boolean(promptLog.raw_prompt);
  const runtimePersist = request.persisted_prompt_log === true || promptLog.persisted_prompt_log === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "actor_id", "prompt_log"], request).length > 0) {
    blockedClaims.push("prompt_log_required_context_missing");
  }
  if (!promptLog.prompt_log_id) blockedClaims.push("prompt_log_id_required");
  if (!promptLog.prompt_hash || !retrievalRequestId || !promptLog.created_at) {
    blockedClaims.push("prompt_log_prompt_audit_required");
  }
  if (promptLog.tenant_id && promptLog.tenant_id !== request.tenant_id) blockedClaims.push("prompt_log_cross_tenant_blocked");
  if (promptLog.matter_id && promptLog.matter_id !== request.matter_id) blockedClaims.push("prompt_log_matter_trace_mismatch");
  if (rawPromptExposed) blockedClaims.push("prompt_log_raw_prompt_exposure_blocked");
  if (runtimePersist) blockedClaims.push("prompt_log_runtime_persist_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T004"),
    descriptor_type: "ai_governance_g6_prompt_log_descriptor",
    tenant_id: request.tenant_id ?? promptLog.tenant_id ?? null,
    matter_id: request.matter_id ?? promptLog.matter_id ?? null,
    actor_id: request.actor_id ?? promptLog.actor_id ?? null,
    prompt_log_id: promptLog.prompt_log_id ?? null,
    retrieval_request_id: retrievalRequestId ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    prompt_log_receipt: freezeRecord({
      prompt_audit_tested: Boolean(promptLog.prompt_hash && retrievalRequestId && promptLog.created_at),
      raw_prompt_exposed: rawPromptExposed,
      prompt_log_persisted: runtimePersist,
      audit_event_written: false,
    }),
  });
}

export function createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of AI_GOVERNANCE_G6C_TUW_COVERAGE) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g6_ai_policy_retrieval_audit_closeout_evidence_required");
  }
  if (request.analytics_g6b_closed !== true) blockedClaims.push("g6_ai_requires_analytics_closeout_handoff");
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g6_ai_policy_retrieval_audit_blocked_descriptor_present");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W10-T001..LFOS-G6-W10-T004"),
    descriptor_type: "ai_governance_g6c_policy_retrieval_audit_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G6-C",
    tuw_coverage: AI_GOVERNANCE_G6C_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    matter_sensitivity_routing_tested: descriptorTuws.has("LFOS-G6-W10-T001"),
    matter_required_retrieval_tested: descriptorTuws.has("LFOS-G6-W10-T002"),
    unauthorized_doc_exclusion_tested: descriptorTuws.has("LFOS-G6-W10-T003"),
    prompt_audit_tested: descriptorTuws.has("LFOS-G6-W10-T004"),
    g6_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      ai_runtime_opened: false,
      retrieval_runtime_opened: false,
      prompt_log_persisted: false,
      draft_pr_self_merged: false,
    }),
  });
}
