import { CRM_CORE_OPPORTUNITY_STAGES, validateCrmCoreRecord } from "./model.js";

export const CRM_G3B_ALLOWED_STAGE_TRANSITIONS = Object.freeze({
  new: Object.freeze(["qualified", "closed_lost"]),
  qualified: Object.freeze(["intake_requested", "closed_lost"]),
  intake_requested: Object.freeze(["intake_opened", "closed_lost"]),
  intake_opened: Object.freeze(["closed_won", "closed_lost"]),
  closed_lost: Object.freeze([]),
  closed_won: Object.freeze([]),
});

export const CRM_G3B_SUMMARY_PROHIBITED_FIELDS = Object.freeze([
  "conflict_memo",
  "conflict_hits",
  "conflict_check_payload",
  "waiver_detail",
  "billing_detail",
  "invoice_detail",
  "ar_detail",
  "raw_permission_decision",
]);

export const CRM_G3B_KEY_CLIENT_PLAN_MASKED_FIELDS = Object.freeze([
  "ar_balance",
  "ar_aging_detail",
  "invoice_detail",
  "billing_detail",
  "collection_note",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value ?? {}) });
}

function noWriteBoundary(tuwId) {
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
    executes_api_handler: false,
    renders_ui: false,
    dispatches_crm_runtime: false,
    dispatches_intake_runtime: false,
    creates_matter: false,
    g3_runtime_readiness_claim: "open",
  };
}

function safeOpportunitySummary(opportunity = {}) {
  const safe = {
    opportunity_id: opportunity.opportunity_id,
    party_id: opportunity.party_id,
    display_name: opportunity.display_name,
    stage: opportunity.stage,
    status: opportunity.status,
    intake_request_id: opportunity.intake_request_id ?? null,
  };
  return freezeRecord(Object.fromEntries(Object.entries(safe).filter(([, value]) => value !== undefined)));
}

function safePartySummary(party = {}) {
  const safe = {
    party_id: party.party_id,
    display_name: party.display_name,
    party_type: party.party_type,
    status: party.status,
  };
  return freezeRecord(Object.fromEntries(Object.entries(safe).filter(([, value]) => value !== undefined)));
}

function missingFields(fields, request) {
  return fields.filter((field) => request?.[field] === undefined || request?.[field] === null || request?.[field] === "");
}

function hasMatterCreationRequest(request = {}) {
  return Boolean(
    request.matter_id ||
      request.matter_ref ||
      request.matter_number ||
      request.create_matter === true ||
      request.matter_creation_requested === true ||
      request.command_payload?.matter_id ||
      request.command_payload?.create_matter === true
  );
}

function includesProhibitedField(value) {
  const payload = JSON.stringify(value ?? {});
  return CRM_G3B_SUMMARY_PROHIBITED_FIELDS.some((field) => payload.includes(field));
}

export function createCrmOpportunityPipelineDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "opportunity", "requested_stage"], request);
  const opportunity = request.opportunity ?? {};
  const currentStage = opportunity.stage;
  const requestedStage = request.requested_stage;
  const allowedTargets = CRM_G3B_ALLOWED_STAGE_TRANSITIONS[currentStage] ?? [];
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("opportunity_pipeline_required_context_missing");
  if (!CRM_CORE_OPPORTUNITY_STAGES.includes(requestedStage)) blockedClaims.push("opportunity_stage_unknown");
  if (!allowedTargets.includes(requestedStage)) blockedClaims.push("opportunity_stage_transition_invalid");
  if (!validateCrmCoreRecord("Opportunity", opportunity).valid) blockedClaims.push("opportunity_schema_validation_required");
  if (hasMatterCreationRequest(request)) blockedClaims.push("opportunity_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W03-T007"),
    descriptor_type: "crm_opportunity_pipeline_descriptor",
    route: "/crm/opportunities",
    method: "PATCH",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    opportunity_id: opportunity.opportunity_id ?? null,
    party_id: opportunity.party_id ?? null,
    current_stage: currentStage ?? null,
    requested_stage: requestedStage ?? null,
    allowed_targets: freezeArray(allowedTargets),
    stage_transition: freezeRecord({
      from: currentStage ?? null,
      to: requestedStage ?? null,
      accepted_as_descriptor: outcome === "review_required",
      executed: false,
    }),
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["opportunity_stage_transition_review_required"] : []),
    customer_safe_response: freezeRecord({
      opportunity: safeOpportunitySummary(opportunity),
      safe_error_code: outcome === "blocked" ? "CRM_OPPORTUNITY_STAGE_TRANSITION_BLOCKED" : null,
    }),
  });
}

export function createCrmActivityPermissionTrimDescriptor(request = {}) {
  const activity = request.activity ?? {};
  const permissionOutcome = request.permission_outcome ?? "denied";
  const confidential = activity.confidential === true;
  const denied = permissionOutcome === "denied" || (confidential && request.actor_can_view_confidential !== true);
  const validation = validateCrmCoreRecord("CRMActivity", activity);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W03-T008"),
    descriptor_type: "crm_activity_permission_trim_descriptor",
    tenant_id: request.tenant_id ?? activity.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    crm_activity_id: activity.crm_activity_id ?? null,
    party_id: activity.party_id ?? null,
    confidential,
    permission_outcome: permissionOutcome,
    outcome: denied ? "denied" : "review_required",
    customer_visible_activity: denied
      ? null
      : freezeRecord({
          crm_activity_id: activity.crm_activity_id,
          activity_type: activity.activity_type,
          subject: activity.subject,
          confidential: false,
        }),
    blocked_claims: freezeArray(denied ? ["confidential_crm_activity_denied"] : []),
    review_required_claims: freezeArray(confidential ? ["confidential_crm_activity_permission_trim_required"] : []),
    safe_error_code: denied ? "CRM_ACTIVITY_CONFIDENTIAL_DENIED" : null,
    hidden_fields: freezeArray(["permission_ref", "audit_hint_ref", "raw_permission_decision"]),
    schema_valid: validation.valid,
  });
}

export function createCrmSummaryUiStateDescriptor(request = {}) {
  const opportunitySummaries = freezeArray((request.opportunities ?? []).map((opportunity) => safeOpportunitySummary(opportunity)));
  const partySummary = safePartySummary(request.party ?? {});
  const sourcePayload = request.source_payload ?? {};

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W03-T009"),
    descriptor_type: "crm_summary_ui_state_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    ui_surface: "client_opportunity_summary",
    ui_state: request.permission_outcome === "denied" ? "denied" : opportunitySummaries.length > 0 ? "ready" : "empty",
    party: partySummary,
    opportunities: opportunitySummaries,
    customer_visible_summary: freezeRecord({
      party: partySummary,
      opportunities: opportunitySummaries,
      conflict_details_visible: false,
      finance_details_visible: false,
      unauthorized_detail_count_visible: false,
    }),
    hidden_fields: CRM_G3B_SUMMARY_PROHIBITED_FIELDS,
    leak_guard: freezeRecord({
      conflict_memo_visible: false,
      billing_detail_visible: false,
      source_payload_contains_prohibited_fields: includesProhibitedField(sourcePayload),
      customer_visible_summary_contains_prohibited_fields: includesProhibitedField({
        party: partySummary,
        opportunities: opportunitySummaries,
      }),
    }),
  });
}

export function createCrmOpportunityToIntakeCommandDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "opportunity_id", "party_id", "intake_request_id"], request);
  const blockedClaims = [];
  if (missing.length > 0) blockedClaims.push("opportunity_to_intake_required_context_missing");
  if (hasMatterCreationRequest(request)) blockedClaims.push("opportunity_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W03-T010"),
    descriptor_type: "crm_opportunity_to_intake_command_descriptor",
    route: `/crm/opportunities/${request.opportunity_id ?? ":opportunity_id"}/intake-request`,
    method: "POST",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    opportunity_id: request.opportunity_id ?? null,
    party_id: request.party_id ?? null,
    intake_request_id: request.intake_request_id ?? null,
    allowed_conversion_target: "IntakeRequest",
    matter_id: null,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["opportunity_to_intake_review_required"] : []),
    command_receipt: freezeRecord({
      creates_intake_request_descriptor: outcome === "review_required",
      creates_matter: false,
      executed: false,
    }),
  });
}

export function createCrmKeyClientPlanUiStateDescriptor(request = {}) {
  const sourcePayload = request.source_payload ?? {};
  const visibleOpportunities = freezeArray((request.opportunities ?? []).map((opportunity) => safeOpportunitySummary(opportunity)));

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W03-T011"),
    descriptor_type: "crm_key_client_plan_ui_state_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    ui_surface: "key_client_plan",
    party: safePartySummary(request.party ?? {}),
    visible_opportunities: visibleOpportunities,
    relationship_plan: freezeRecord({
      relationship_owner_user_id: request.relationship_owner_user_id ?? null,
      next_best_action: request.next_best_action ?? null,
      plan_status: request.plan_status ?? "review_required",
    }),
    masked_finance_summary: freezeRecord({
      ar_balance: "masked",
      ar_aging_detail_visible: false,
      invoice_detail_visible: false,
      billing_detail_visible: false,
    }),
    hidden_fields: CRM_G3B_KEY_CLIENT_PLAN_MASKED_FIELDS,
    leak_guard: freezeRecord({
      source_payload_contains_finance_detail: CRM_G3B_KEY_CLIENT_PLAN_MASKED_FIELDS.some((field) =>
        JSON.stringify(sourcePayload).includes(field)
      ),
      customer_visible_plan_contains_finance_detail: false,
    }),
    review_required_claims: freezeArray(["key_client_plan_finance_detail_mask_required"]),
  });
}

export function createCrmG3PartialCloseoutDescriptor(request = {}) {
  const evidence = {
    pipeline_evidence: freezeArray(request.pipeline_evidence),
    permission_trim_evidence: freezeArray(request.permission_trim_evidence),
    summary_ui_evidence: freezeArray(request.summary_ui_evidence),
    opportunity_to_intake_evidence: freezeArray(request.opportunity_to_intake_evidence),
    key_client_plan_evidence: freezeArray(request.key_client_plan_evidence),
    command_evidence: freezeArray(request.command_evidence),
  };
  const missingEvidence = Object.entries(evidence)
    .filter(([, values]) => values.length === 0)
    .map(([key]) => key);
  if (request.pr_state?.draft !== true) missingEvidence.push("draft_pr_state");
  if (request.pr_state?.merge_authority !== "human_only") missingEvidence.push("human_only_merge_authority");
  if (request.g1_g2_evidence_disposition === undefined) missingEvidence.push("g1_g2_evidence_disposition");
  if (request.human_review_disposition === undefined) missingEvidence.push("human_review_disposition");

  const blocked = missingEvidence.length > 0;

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W03-T012"),
    descriptor_type: "crm_g3_partial_closeout_descriptor",
    g3_crm_descriptor: "crm_g3_partial_closeout_descriptor",
    closeout_state: blocked ? "evidence_recorded_pending_review" : "crm_partial_evidence_recorded",
    outcome: blocked ? "blocked" : "review_required",
    evidence,
    missing_evidence: freezeArray(missingEvidence),
    pr_state: freezeRecord({
      branch: request.pr_state?.branch ?? "codex/lawos-g3-crm-service-ui-closeout",
      base_branch: request.pr_state?.base_branch ?? "codex/lawos-g3-crm-schema",
      draft: request.pr_state?.draft ?? true,
      clean: request.pr_state?.clean ?? false,
      merge_authority: request.pr_state?.merge_authority ?? "human_only",
    }),
    g1_g2_evidence_disposition: request.g1_g2_evidence_disposition ?? null,
    human_review_disposition: request.human_review_disposition ?? null,
    opportunity_to_intake_only_evidence: true,
    opportunity_to_matter_shortcut_prohibited: true,
    blocked_claims: freezeArray(blocked ? ["g3_crm_partial_closeout_evidence_missing"] : []),
    review_required_claims: freezeArray(blocked ? [] : ["g3_crm_partial_closeout_human_review_pending"]),
  });
}
