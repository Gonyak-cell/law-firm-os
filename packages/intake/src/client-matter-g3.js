import { validateIntakeCoreRecord } from "./model.js";

export const INTAKE_G3D_CONFLICT_SEARCH_SOURCES = Object.freeze(["alias_index", "relationship_graph", "former_matter"]);

export const INTAKE_G3D_CONFLICT_DECISIONS = Object.freeze(["cleared", "blocked", "waiver_required"]);

export const INTAKE_G3D_FEE_TERM_TYPES = Object.freeze(["hourly", "fixed", "cap", "retainer"]);

const CONFLICT_SEARCH_MISSING_SOURCE_CLAIMS = Object.freeze({
  alias_index: "conflict_search_alias_index_source_missing",
  relationship_graph: "conflict_search_relationship_graph_source_missing",
  former_matter: "conflict_search_former_matter_source_missing",
});

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value ?? {}) });
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
    dispatches_intake_runtime: false,
    dispatches_conflict_runtime: false,
    persists_clearance_token: false,
    creates_matter: false,
    g3_runtime_readiness_claim: "open",
  };
}

function safePartySnapshot(partySnapshot = {}) {
  return freezeRecord({
    party_ids: freezeArray(partySnapshot.party_ids),
    snapshot_hash: partySnapshot.snapshot_hash ?? null,
    alias_count: Array.isArray(partySnapshot.aliases) ? partySnapshot.aliases.length : 0,
    relationship_count: Array.isArray(partySnapshot.relationships) ? partySnapshot.relationships.length : 0,
    former_matter_count: Array.isArray(partySnapshot.former_matters) ? partySnapshot.former_matters.length : 0,
  });
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

export function createIntakeConflictSearchDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "conflict_check", "party_snapshot"], request);
  const conflictCheck = request.conflict_check ?? {};
  const partySnapshot = request.party_snapshot ?? conflictCheck.party_snapshot ?? {};
  const searchSources = request.search_sources ?? {};
  const aliases = freezeArray(searchSources.alias_index ?? request.alias_index);
  const relationships = freezeArray(searchSources.relationship_graph ?? request.relationship_graph);
  const formerMatters = freezeArray(searchSources.former_matter ?? request.former_matter_refs);
  const sourceCoverage = freezeRecord({
    alias_index: aliases.length > 0,
    relationship_graph: relationships.length > 0,
    former_matter: formerMatters.length > 0,
  });
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("conflict_search_required_context_missing");
  if (!validateIntakeCoreRecord("ConflictCheck", conflictCheck).valid) blockedClaims.push("conflict_check_schema_validation_required");
  for (const source of INTAKE_G3D_CONFLICT_SEARCH_SOURCES) {
    if (sourceCoverage[source] !== true) blockedClaims.push(CONFLICT_SEARCH_MISSING_SOURCE_CLAIMS[source]);
  }
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";
  const derivedHits = [
    ...aliases.map((entry) => ({ source: "alias_index", source_record_ref: entry.alias_ref ?? entry.source_record_ref ?? null })),
    ...relationships.map((entry) => ({
      source: "relationship_graph",
      source_record_ref: entry.relationship_ref ?? entry.source_record_ref ?? null,
    })),
    ...formerMatters.map((entry) => ({ source: "former_matter", source_record_ref: entry.matter_ref ?? entry.source_record_ref ?? null })),
  ];

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T004"),
    descriptor_type: "intake_conflict_search_descriptor",
    route: `/intake/conflict-checks/${conflictCheck.conflict_check_id ?? ":conflict_check_id"}/search`,
    method: "POST",
    tenant_id: request.tenant_id ?? conflictCheck.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    conflict_check_id: conflictCheck.conflict_check_id ?? null,
    intake_request_id: conflictCheck.intake_request_id ?? null,
    party_snapshot: safePartySnapshot(partySnapshot),
    source_coverage: sourceCoverage,
    potential_hit_sources: freezeArray(derivedHits.map((hit) => hit.source)),
    potential_hits: freezeArray(request.potential_hits ?? derivedHits),
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["conflict_search_reviewer_required"] : []),
    search_receipt: freezeRecord({
      alias_index_checked: sourceCoverage.alias_index,
      relationship_graph_checked: sourceCoverage.relationship_graph,
      former_matter_checked: sourceCoverage.former_matter,
      executed: false,
    }),
  });
}

export function createIntakeConflictDecisionWorkflowDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "conflict_check", "requested_decision"], request);
  const conflictCheck = request.conflict_check ?? {};
  const conflictHits = freezeArray(request.conflict_hits);
  const requestedDecision = request.requested_decision;
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("conflict_decision_required_context_missing");
  if (!INTAKE_G3D_CONFLICT_DECISIONS.includes(requestedDecision)) blockedClaims.push("conflict_decision_unknown");
  if (!validateIntakeCoreRecord("ConflictCheck", conflictCheck).valid) blockedClaims.push("conflict_check_schema_validation_required");
  if (!request.reviewer_user_id) blockedClaims.push("conflict_decision_reviewer_required");
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_shortcut_blocked");

  const invalidHitCount = conflictHits.filter((hit) => !validateIntakeCoreRecord("ConflictHit", hit).valid).length;
  if (invalidHitCount > 0) blockedClaims.push("conflict_hit_schema_validation_required");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T005"),
    descriptor_type: "intake_conflict_decision_workflow_descriptor",
    tenant_id: request.tenant_id ?? conflictCheck.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    conflict_check_id: conflictCheck.conflict_check_id ?? null,
    requested_decision: requestedDecision ?? null,
    reviewer_user_id: request.reviewer_user_id ?? null,
    conflict_hit_count: conflictHits.length,
    invalid_conflict_hit_count: invalidHitCount,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["conflict_decision_human_review_required"] : []),
    decision_receipt: freezeRecord({
      reviewer_required: true,
      decision_persisted: false,
      executed: false,
    }),
  });
}

export function createIntakeWaiverDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "waiver_id", "intake_request_id", "conflict_hit_ids"], request);
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("waiver_required_context_missing");
  if (!hasNonEmptyArray(request.conflict_hit_ids)) blockedClaims.push("waiver_conflict_hit_required");
  if (!request.consent_document_ref) blockedClaims.push("waiver_consent_document_required");
  if (!request.approver_user_id) blockedClaims.push("waiver_approver_required");
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T006"),
    descriptor_type: "intake_waiver_descriptor",
    model_type: "Waiver",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    waiver_id: request.waiver_id ?? null,
    intake_request_id: request.intake_request_id ?? null,
    conflict_hit_ids: freezeArray(request.conflict_hit_ids),
    consent_document_ref: request.consent_document_ref ?? null,
    approver_user_id: request.approver_user_id ?? null,
    consent_document_evidence_required: true,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["waiver_consent_review_required"] : []),
  });
}

export function createIntakeEngagementDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "engagement_id", "intake_request_id", "legal_client_party_id", "scope_summary"], request);
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("engagement_required_context_missing");
  if (!request.legal_client_party_id) blockedClaims.push("engagement_legal_client_required");
  if (!request.scope_summary) blockedClaims.push("engagement_scope_required");
  if (!request.fee_terms_id) blockedClaims.push("engagement_fee_terms_required");
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T007"),
    descriptor_type: "intake_engagement_descriptor",
    model_type: "Engagement",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    engagement_id: request.engagement_id ?? null,
    intake_request_id: request.intake_request_id ?? null,
    legal_client_party_id: request.legal_client_party_id ?? null,
    scope_summary: request.scope_summary ?? null,
    fee_terms_id: request.fee_terms_id ?? null,
    approval_state: request.approval_state ?? "draft",
    matter_id: null,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["engagement_scope_and_client_review_required"] : []),
  });
}

export function createIntakeFeeTermsDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "fee_terms_id", "intake_request_id", "fee_type", "currency"], request);
  const feeType = request.fee_type;
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("fee_terms_required_context_missing");
  if (!INTAKE_G3D_FEE_TERM_TYPES.includes(feeType)) blockedClaims.push("fee_terms_type_unknown");
  if (feeType === "hourly" && !request.rate_card_ref && request.hourly_rate === undefined) blockedClaims.push("fee_terms_hourly_rate_required");
  if (feeType === "fixed" && request.fixed_fee_amount === undefined) blockedClaims.push("fee_terms_fixed_amount_required");
  if (feeType === "cap" && request.cap_amount === undefined) blockedClaims.push("fee_terms_cap_amount_required");
  if (feeType === "retainer" && request.retainer_amount === undefined) blockedClaims.push("fee_terms_retainer_amount_required");
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T008"),
    descriptor_type: "intake_fee_terms_descriptor",
    model_type: "FeeTerms",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    fee_terms_id: request.fee_terms_id ?? null,
    intake_request_id: request.intake_request_id ?? null,
    fee_type: feeType ?? null,
    currency: request.currency ?? null,
    rate_card_ref: request.rate_card_ref ?? null,
    hourly_rate: request.hourly_rate ?? null,
    fixed_fee_amount: request.fixed_fee_amount ?? null,
    cap_amount: request.cap_amount ?? null,
    retainer_amount: request.retainer_amount ?? null,
    allowed_fee_term_types: INTAKE_G3D_FEE_TERM_TYPES,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["fee_terms_human_approval_required"] : []),
  });
}

export function createIntakeRiskApprovalQueueDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "risk_approval_id", "intake_request_id", "conflict_check_id"], request);
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("risk_approval_required_context_missing");
  if (!request.reviewer_user_id) blockedClaims.push("risk_approval_reviewer_required");
  if (!request.approval_audit_ref) blockedClaims.push("risk_approval_audit_required");
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T009"),
    descriptor_type: "intake_risk_approval_queue_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    risk_approval_id: request.risk_approval_id ?? null,
    intake_request_id: request.intake_request_id ?? null,
    conflict_check_id: request.conflict_check_id ?? null,
    reviewer_user_id: request.reviewer_user_id ?? null,
    approval_audit_ref: request.approval_audit_ref ?? null,
    queue_state: outcome === "blocked" ? "blocked" : "review_required",
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["risk_approval_human_review_required"] : []),
    queue_receipt: freezeRecord({
      enqueued: false,
      approval_audit_required: true,
      executed: false,
    }),
  });
}

export function createIntakeClearanceTokenDescriptor(request = {}) {
  const missing = missingFields(
    [
      "tenant_id",
      "actor_id",
      "clearance_token_id",
      "intake_request_id",
      "conflict_check_id",
      "engagement_id",
      "issued_at",
      "expires_at",
      "snapshot_hash",
      "current_snapshot_hash",
    ],
    request
  );
  const blockedClaims = [];
  const now = new Date(request.current_time ?? Date.now()).getTime();
  const expiresAt = new Date(request.expires_at ?? 0).getTime();

  if (missing.length > 0) blockedClaims.push("clearance_token_required_context_missing");
  if (Number.isFinite(expiresAt) && expiresAt <= now) blockedClaims.push("clearance_token_expired");
  if (request.snapshot_hash && request.current_snapshot_hash && request.snapshot_hash !== request.current_snapshot_hash) {
    blockedClaims.push("clearance_token_stale_snapshot");
  }
  if (hasMatterCreationRequest(request)) blockedClaims.push("intake_to_matter_runtime_still_closed");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";
  const tokenState = blockedClaims.includes("clearance_token_expired")
    ? "expired"
    : blockedClaims.includes("clearance_token_stale_snapshot")
      ? "stale"
      : outcome === "blocked"
        ? "blocked"
        : "candidate";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T010"),
    descriptor_type: "intake_clearance_token_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    clearance_token_id: request.clearance_token_id ?? null,
    intake_request_id: request.intake_request_id ?? null,
    conflict_check_id: request.conflict_check_id ?? null,
    engagement_id: request.engagement_id ?? null,
    issued_at: request.issued_at ?? null,
    expires_at: request.expires_at ?? null,
    snapshot_hash: request.snapshot_hash ?? null,
    current_snapshot_hash: request.current_snapshot_hash ?? null,
    token_state: tokenState,
    outcome,
    matter_id: null,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["clearance_token_human_review_required"] : []),
    clearance_receipt: freezeRecord({
      valid_for_runtime_matter_opening: false,
      token_persisted: false,
      executed: false,
    }),
  });
}

export function createIntakeG3DWorkflowCloseoutDescriptor(request = {}) {
  const evidence = {
    conflict_search_evidence: freezeArray(request.conflict_search_evidence),
    decision_workflow_evidence: freezeArray(request.decision_workflow_evidence),
    waiver_evidence: freezeArray(request.waiver_evidence),
    engagement_evidence: freezeArray(request.engagement_evidence),
    fee_terms_evidence: freezeArray(request.fee_terms_evidence),
    risk_approval_evidence: freezeArray(request.risk_approval_evidence),
    clearance_token_evidence: freezeArray(request.clearance_token_evidence),
    command_evidence: freezeArray(request.command_evidence),
  };
  const missingEvidence = Object.entries(evidence)
    .filter(([, values]) => values.length === 0)
    .map(([key]) => key);

  if (request.pr_state?.draft !== true) missingEvidence.push("draft_pr_state");
  if (request.pr_state?.merge_authority !== "human_only") missingEvidence.push("human_only_merge_authority");
  if (request.human_review_disposition === undefined) missingEvidence.push("human_review_disposition");

  const blocked = missingEvidence.length > 0;

  return freezeRecord({
    ...noWriteBoundary("LFOS-G3-W04-T010"),
    descriptor_type: "intake_g3d_workflow_closeout_descriptor",
    closeout_state: blocked ? "evidence_recorded_pending_review" : "intake_workflow_evidence_recorded",
    outcome: blocked ? "blocked" : "review_required",
    evidence: freezeObject(evidence),
    missing_evidence: freezeArray(missingEvidence),
    pr_state: freezeRecord({
      branch: request.pr_state?.branch ?? "codex/lawos-g3-conflict-engagement-workflow",
      base_branch: request.pr_state?.base_branch ?? "codex/lawos-g3-intake-conflict-schema",
      draft: request.pr_state?.draft ?? true,
      clean: request.pr_state?.clean ?? false,
      merge_authority: request.pr_state?.merge_authority ?? "human_only",
    }),
    human_review_disposition: request.human_review_disposition ?? null,
    intake_to_matter_runtime_readiness_claim: "open",
    blocked_claims: freezeArray(blocked ? ["g3d_workflow_closeout_evidence_missing"] : []),
    review_required_claims: freezeArray(blocked ? [] : ["g3d_workflow_closeout_human_review_pending"]),
  });
}
