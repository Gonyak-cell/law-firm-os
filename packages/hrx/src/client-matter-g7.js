export const HRX_G7C_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W13-T001",
  "LFOS-G7-W13-T002",
  "LFOS-G7-W13-T003",
  "LFOS-G7-W13-T004",
  "LFOS-G7-W13-T005",
  "LFOS-G7-W13-T006",
  "LFOS-G7-W13-T007",
  "LFOS-G7-W13-T008",
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
    real_employee_data_included: false,
    real_candidate_data_included: false,
    real_client_data_included: false,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_permission_decision: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    dispatches_hrx_runtime: false,
    payroll_calculation_runtime_executed: false,
    hr_ai_final_judgment_executed: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    enterprise_trust_claimed: false,
    go_live_approval_claimed: false,
  };
}

export function createHrxG7UserEmployeeSeparationDescriptor(request = {}) {
  const review = request.separation_review ?? {};
  const noConflationReviewed =
    review.no_conflation_reviewed === true &&
    review.user_identity_source === "iam_user" &&
    review.employee_identity_source === "hrx_employee";
  const conflationAttempted = request.user_employee_conflated === true || review.user_employee_conflated === true;
  const employeeAuthorizesSession = review.employee_authorizes_user_session === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "separation_review"], request).length > 0) {
    blockedClaims.push("user_employee_separation_required_context_missing");
  }
  if (!noConflationReviewed) blockedClaims.push("user_employee_no_conflation_review_required");
  if (conflationAttempted) blockedClaims.push("user_employee_conflation_blocked");
  if (employeeAuthorizesSession) blockedClaims.push("employee_session_authority_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T001"),
    descriptor_type: "hrx_g7_user_employee_separation_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    separation_receipt: freezeRecord({
      no_conflation_reviewed: noConflationReviewed,
      user_identity_source: review.user_identity_source ?? null,
      employee_identity_source: review.employee_identity_source ?? null,
      user_employee_conflated: conflationAttempted,
      employee_authorizes_user_session: employeeAuthorizesSession,
    }),
  });
}

export function createHrxG7EmployeeSchemaDescriptor(request = {}) {
  const employee = request.employee ?? {};
  const hasUserRef = employee.user_ref !== undefined && employee.user_ref !== null && employee.user_ref !== "";
  const controlledUserRef = !hasUserRef || (employee.user_ref_controlled === true && employee.user_ref_purpose === "login_mapping");
  const userAccountRequired = employee.user_account_required === true;
  const mayAuthorizeSession = employee.may_authorize_user_session === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "employee"], request).length > 0) {
    blockedClaims.push("employee_schema_required_context_missing");
  }
  if (!employee.employee_id) blockedClaims.push("employee_schema_employee_id_required");
  if (!controlledUserRef) blockedClaims.push("employee_user_ref_optional_controlled_required");
  if (userAccountRequired) blockedClaims.push("employee_user_account_requirement_blocked");
  if (mayAuthorizeSession) blockedClaims.push("employee_user_session_authority_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T002"),
    descriptor_type: "hrx_g7_employee_schema_descriptor",
    tenant_id: request.tenant_id ?? employee.tenant_id ?? null,
    employee_id: employee.employee_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    employee_schema_receipt: freezeRecord({
      user_ref_optional_or_controlled: controlledUserRef,
      user_ref_present: hasUserRef,
      user_account_required: userAccountRequired,
      employee_authorizes_user_session: mayAuthorizeSession,
    }),
  });
}

export function createHrxG7CapacityProfileDescriptor(request = {}) {
  const profile = request.capacity_profile ?? {};
  const denominatorHours = Number(profile.denominator_hours);
  const denominatorValid = Number.isFinite(denominatorHours) && denominatorHours > 0 && Boolean(profile.utilization_denominator_ref);
  const payrollRuntime = request.payroll_calculation_runtime_executed === true || profile.payroll_calculation_runtime_executed === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "capacity_profile"], request).length > 0) {
    blockedClaims.push("capacity_profile_required_context_missing");
  }
  if (!profile.employee_id) blockedClaims.push("capacity_profile_employee_id_required");
  if (!denominatorValid) blockedClaims.push("capacity_profile_utilization_denominator_required");
  if (payrollRuntime) blockedClaims.push("capacity_profile_payroll_runtime_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T003"),
    descriptor_type: "hrx_g7_capacity_profile_descriptor",
    tenant_id: request.tenant_id ?? profile.tenant_id ?? null,
    employee_id: profile.employee_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    capacity_profile_receipt: freezeRecord({
      utilization_denominator_tested: denominatorValid,
      denominator_hours: denominatorValid ? denominatorHours : null,
      payroll_runtime_executed: payrollRuntime,
    }),
  });
}

export function createHrxG7WorkloadReadModelDescriptor(request = {}) {
  const workload = request.workload_read_model ?? {};
  const aggregationPresent = Boolean(workload.matter_time_aggregation_ref) && workload.time_entry_aggregation_tested === true;
  const rawTimeEntriesIncluded = workload.raw_time_entries_included === true;
  const clientDetailLeak = request.client_detail_leak === true || workload.client_detail_leak === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "workload_read_model"], request).length > 0) {
    blockedClaims.push("workload_read_model_required_context_missing");
  }
  if (!workload.model_id) blockedClaims.push("workload_read_model_id_required");
  if (!aggregationPresent) blockedClaims.push("workload_matter_time_aggregation_required");
  if (rawTimeEntriesIncluded || clientDetailLeak) blockedClaims.push("workload_client_detail_leak_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T004"),
    descriptor_type: "hrx_g7_workload_read_model_descriptor",
    tenant_id: request.tenant_id ?? workload.tenant_id ?? null,
    model_id: workload.model_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    workload_read_model_receipt: freezeRecord({
      matter_time_aggregation_tested: aggregationPresent,
      raw_time_entries_included: rawTimeEntriesIncluded,
      client_detail_leak_blocked: clientDetailLeak,
    }),
  });
}

export function createHrxG7HrDocumentGuardrailDescriptor(request = {}) {
  const document = request.hr_document ?? {};
  const aclChecked = document.hr_acl_checked === true;
  const nonHrDenied = document.non_hr_denied === true;
  const documentBodyIncluded = document.document_body_included === true || request.document_body_included === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "hr_document"], request).length > 0) {
    blockedClaims.push("hr_document_guardrail_required_context_missing");
  }
  if (!document.document_id) blockedClaims.push("hr_document_id_required");
  if (!aclChecked) blockedClaims.push("hr_document_acl_required");
  if (!nonHrDenied) blockedClaims.push("hr_document_non_hr_denied_required");
  if (documentBodyIncluded) blockedClaims.push("hr_document_body_exposure_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T005"),
    descriptor_type: "hrx_g7_hr_document_guardrail_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    document_id: document.document_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    hr_document_guardrail_receipt: freezeRecord({
      hr_acl_tested: aclChecked,
      non_hr_denied_tested: nonHrDenied,
      document_body_included: documentBodyIncluded,
    }),
  });
}

export function createHrxG7EvaluationAccessDescriptor(request = {}) {
  const evaluation = request.evaluation_record ?? {};
  const auditOnRead = evaluation.audit_on_read === true && Boolean(evaluation.audit_hint_ref);
  const authorizedReviewer = evaluation.authorized_reviewer === true;
  const scoreFinalized = evaluation.score_finalized === true || request.score_finalized === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "evaluation_record"], request).length > 0) {
    blockedClaims.push("evaluation_access_required_context_missing");
  }
  if (!evaluation.evaluation_id) blockedClaims.push("evaluation_access_id_required");
  if (!authorizedReviewer) blockedClaims.push("evaluation_access_authorized_reviewer_required");
  if (!auditOnRead) blockedClaims.push("evaluation_access_audit_on_read_required");
  if (scoreFinalized) blockedClaims.push("evaluation_score_finalization_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T006"),
    descriptor_type: "hrx_g7_evaluation_access_descriptor",
    tenant_id: request.tenant_id ?? evaluation.tenant_id ?? null,
    evaluation_id: evaluation.evaluation_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    evaluation_access_receipt: freezeRecord({
      authorized_reviewer_tested: authorizedReviewer,
      audit_on_read_tested: auditOnRead,
      score_finalized: scoreFinalized,
    }),
  });
}

export function createHrxG7CandidateSeparationDescriptor(request = {}) {
  const candidate = request.candidate ?? {};
  const separated = candidate.separated_from_crm_party === true && candidate.no_crm_party_contamination === true;
  const crmPartyRefPresent = Boolean(candidate.crm_party_ref) || Boolean(request.crm_party_ref);
  const partyWriteAttempted = candidate.party_write_attempted === true || request.party_write_attempted === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "candidate"], request).length > 0) {
    blockedClaims.push("candidate_separation_required_context_missing");
  }
  if (!candidate.candidate_id) blockedClaims.push("candidate_separation_candidate_id_required");
  if (!separated) blockedClaims.push("candidate_data_separation_required");
  if (crmPartyRefPresent || partyWriteAttempted) blockedClaims.push("candidate_crm_party_contamination_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T007"),
    descriptor_type: "hrx_g7_candidate_separation_descriptor",
    tenant_id: request.tenant_id ?? candidate.tenant_id ?? null,
    candidate_id: candidate.candidate_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    candidate_separation_receipt: freezeRecord({
      crm_party_contamination_tested: separated && !crmPartyRefPresent && !partyWriteAttempted,
      crm_party_ref_present: crmPartyRefPresent,
      party_write_attempted: partyWriteAttempted,
    }),
  });
}

export function createHrxG7CPeopleGuardrailsCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = HRX_G7C_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const blockedClaims = [];

  if (request.g7b_handoff_validated !== true) blockedClaims.push("hrx_guardrails_requires_g7b_handoff");
  if (request.rp30_contract_validated !== true) blockedClaims.push("hrx_guardrails_requires_rp30_contract_validation");
  if (missingTuws.length > 0) blockedClaims.push("hrx_guardrails_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("hrx_guardrails_blocked_descriptor_present");
  if (request.claims_enterprise_trust === true) blockedClaims.push("hrx_guardrails_enterprise_trust_claim_blocked");
  if (request.claims_go_live_approval === true) blockedClaims.push("hrx_guardrails_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W13-T008"),
    descriptor_type: "hrx_g7c_people_guardrails_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: HRX_G7C_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7b_handoff_validated: request.g7b_handoff_validated === true,
      rp30_contract_validated: request.rp30_contract_validated === true,
      user_employee_separation_required: true,
      hr_document_guardrail_required: true,
      evaluation_audit_on_read_required: true,
      candidate_crm_party_contamination_blocked: true,
      runtime_readiness_claim: "open",
      enterprise_trust_claimed: false,
      go_live_approval_claimed: false,
    }),
  });
}
