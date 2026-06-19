import { randomUUID } from "node:crypto";
import { buildAuditEventInput, createAuditLedger } from "../../../packages/audit/src/index.js";
import {
  createCrmActivityPermissionTrimDescriptor,
  createCrmCoreCRMActivity,
  createCrmCoreCampaign,
  createCrmCoreLead,
  createCrmCoreOpportunity,
  createCrmCoreProposal,
  createCrmCoreReferral,
  createCrmG3PartialCloseoutDescriptor,
  createCrmKeyClientPlanUiStateDescriptor,
  createCrmOpportunityPipelineDescriptor,
  createCrmOpportunityToIntakeCommandDescriptor,
  createCrmSummaryUiStateDescriptor,
} from "../../../packages/crm/src/index.js";
import {
  createIntakeClearanceTokenDescriptor,
  createIntakeConflictDecisionWorkflowDescriptor,
  createIntakeConflictMemoBoundaryDescriptor,
  createIntakeConflictSearchDescriptor,
  createIntakeCoreConflictCheck,
  createIntakeCoreConflictHit,
  createIntakeCoreIntakeRequest,
  createIntakeEngagementApprovalUiStateDescriptor,
  createIntakeEngagementDescriptor,
  createIntakeFeeTermsDescriptor,
  createIntakeG3CloseoutDescriptor,
  createIntakeG3DWorkflowCloseoutDescriptor,
  createIntakeRiskApprovalQueueDescriptor,
  createIntakeWaiverApprovalUiStateDescriptor,
  createIntakeWaiverDescriptor,
} from "../../../packages/intake/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const CRM_INTAKE_PREFIXES = Object.freeze([
  "/api/crm-intake/runtime/evidence",
  "/api/crm-intake/leads",
  "/api/crm-intake/opportunities",
  "/api/crm-intake/activities",
  "/api/crm-intake/proposals",
  "/api/crm-intake/referrals",
  "/api/crm-intake/campaigns",
  "/api/crm-intake/intake-requests",
  "/api/crm-intake/conflict-checks",
  "/api/crm-intake/conflict-hits",
  "/api/crm-intake/waivers",
  "/api/crm-intake/fee-terms",
  "/api/crm-intake/engagements",
  "/api/crm-intake/risk-approvals",
  "/api/crm-intake/clearance-tokens",
  "/api/crm-intake/ui",
  "/api/crm-intake/audit",
]);

export const CMP_G6_TUW_IDS = Object.freeze([
  "CMP-G6-W06-T001",
  "CMP-G6-W06-T002",
  "CMP-G6-W06-T003",
  "CMP-G6-W06-T004",
  "CMP-G6-W06-T005",
  "CMP-G6-W06-T006",
  "CMP-G6-W06-T007",
  "CMP-G6-W06-T008",
  "CMP-G6-W06-T009",
  "CMP-G6-W06-T010",
  "CMP-G6-W06-T011",
  "CMP-G6-W06-T012",
  "CMP-G6-W06-T013",
  "CMP-G6-W06-T014",
  "CMP-G6-W06-T015",
  "CMP-G6-W06-T016",
  "CMP-G6-W06-T017",
  "CMP-G6-W06-T018",
  "CMP-G6-W06-T019",
  "CMP-G6-W06-T020",
  "CMP-G6-W06-T021",
  "CMP-G6-W06-T022",
]);

export const CRM_INTAKE_CLEARANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "crm-intake-clearance",
  cmp_gate: "CMP-G6",
  cmp_work_package: "CMP-G6-W06",
  depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02"]),
  feeds_runtime_gate: Object.freeze(["CMP-G4-W04"]),
  package_ref: "packages/crm; packages/intake",
  ui_refs: Object.freeze(["apps/web/src/data/matterApiClient.js"]),
  runtime_routes: CRM_INTAKE_PREFIXES,
  tuw_ids: CMP_G6_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G3-W03-T001",
    "LFOS-G3-W03-T002",
    "LFOS-G3-W03-T003",
    "LFOS-G3-W03-T004",
    "LFOS-G3-W03-T005",
    "LFOS-G3-W03-T006",
    "LFOS-G3-W03-T007",
    "LFOS-G3-W03-T008",
    "LFOS-G3-W03-T009",
    "LFOS-G3-W03-T010",
    "LFOS-G3-W03-T011",
    "LFOS-G3-W03-T012",
    "LFOS-G3-W04-T001",
    "LFOS-G3-W04-T002",
    "LFOS-G3-W04-T003",
    "LFOS-G3-W04-T004",
    "LFOS-G3-W04-T005",
    "LFOS-G3-W04-T006",
    "LFOS-G3-W04-T007",
    "LFOS-G3-W04-T008",
    "LFOS-G3-W04-T009",
    "LFOS-G3-W04-T010",
    "LFOS-G3-W04-T011",
    "LFOS-G3-W04-T012",
    "LFOS-G3-W04-T013",
    "LFOS-G3-W04-T014",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isCrmIntakePath(pathname) {
  return CRM_INTAKE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function response(status, body) {
  return { status, body };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function key(tenantId, id) {
  return `${tenantId}:${id}`;
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("CRM/Intake synthetic tenant is required");
    error.safe_error_code = "CMP_G6_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "crm-intake-runtime-actor",
    actor_type: "user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G6_VALIDATION_ERROR",
    reason: error.message,
  });
}

function notFound(code, reason = "not_found") {
  return response(404, { outcome: "not_found", safe_error_code: code, reason });
}

function appendCrmIntakeAudit(context, { tenant_id, actor_id, action, object_type, object_id, reason, evidence_refs = [] }) {
  const event = context.auditLedger.append(
    buildAuditEventInput({
      tenant_id,
      actor: { actor_id, actor_type: "user" },
      action,
      object: { object_type, object_id },
      outcome: "success",
      decision: "allow",
      reason_code: reason,
      source_service: "@law-firm-os/api:crm-intake-runtime",
      request: {
        request_id: `cmp_g6_req_${randomUUID()}`,
        trace_id: `cmp_g6_trace_${object_id}`,
        span_id: "cmp_g6_runtime",
        idempotency_key: `${tenant_id}:${action}:${object_id}`,
      },
      evidence_refs,
      permission_decision_id: `cmp_g6_permission_${object_type}_${object_id}`,
    }),
  );
  return clone(event);
}

function hasMatterCreationRequest(body = {}) {
  return Boolean(
    body.matter_id ||
      body.matter_ref ||
      body.matter_number ||
      body.create_matter === true ||
      body.matter_creation_requested === true ||
      body.command_payload?.matter_id ||
      body.command_payload?.create_matter === true,
  );
}

function partySnapshotFromIntake(intakeRequest) {
  return {
    party_ids: intakeRequest.party_ids,
    aliases: intakeRequest.party_ids.map((party_id) => ({ party_id, alias_ref: `alias:${party_id}` })),
    relationships: [{ from_party_id: intakeRequest.party_ids[0], to_party_id: intakeRequest.party_ids.at(-1), relationship_type: "intake_related" }],
    former_matters: [{ matter_ref: "former_matter:cmp-g6", party_id: intakeRequest.party_ids.at(-1) }],
  };
}

function publicOpportunity(opportunity) {
  return {
    opportunity_id: opportunity.opportunity_id,
    party_id: opportunity.party_id,
    display_name: opportunity.display_name,
    stage: opportunity.stage,
    status: opportunity.status,
    intake_request_id: opportunity.intake_request_id,
    allowed_conversion_target: opportunity.allowed_conversion_target,
    matter_id: null,
  };
}

function publicIntakeRequest(intakeRequest) {
  return {
    intake_request_id: intakeRequest.intake_request_id,
    opportunity_id: intakeRequest.opportunity_id,
    requesting_party_id: intakeRequest.requesting_party_id,
    party_ids: intakeRequest.party_ids,
    status: intakeRequest.status,
    conflict_check_required: intakeRequest.conflict_check_required,
    matter_id: null,
    creates_matter: false,
  };
}

function createDefaultOpportunity({ tenantId, body }) {
  return createCrmCoreOpportunity({
    opportunity_id: body.opportunity_id ?? `opp-cmp-g6-${randomUUID()}`,
    tenant_id: tenantId,
    party_id: body.party_id,
    display_name: body.display_name ?? "CMP G6 Opportunity",
    stage: body.stage ?? "qualified",
    status: body.status ?? "active",
    owner_user_id: body.owner_user_id ?? "user-cmp-g6-owner",
    intake_request_id: body.intake_request_id,
    matter_id: body.matter_id,
    matter_ref: body.matter_ref,
    matter_number: body.matter_number,
    create_matter: body.create_matter,
  });
}

function createDefaultIntakeRequest({ tenantId, opportunity, body }) {
  return createIntakeCoreIntakeRequest({
    intake_request_id: body.intake_request_id ?? `intake-${opportunity.opportunity_id}`,
    tenant_id: tenantId,
    opportunity_id: opportunity.opportunity_id,
    requesting_party_id: body.requesting_party_id ?? opportunity.party_id,
    party_ids: body.party_ids ?? [opportunity.party_id, body.counterparty_id ?? "party-cmp-g6-counterparty"],
    status: body.status ?? "open",
    owner_user_id: body.owner_user_id ?? opportunity.owner_user_id,
    requested_scope_summary: body.requested_scope_summary ?? "CMP G6 intake scope",
    create_matter: body.create_matter,
    matter_id: body.matter_id,
    matter_number: body.matter_number,
  });
}

export function createCrmIntakeRuntimeContext() {
  return {
    leads: new Map(),
    opportunities: new Map(),
    activities: new Map(),
    proposals: new Map(),
    referrals: new Map(),
    campaigns: new Map(),
    intakeRequests: new Map(),
    conflictChecks: new Map(),
    conflictHits: new Map(),
    conflictDecisions: new Map(),
    waivers: new Map(),
    feeTerms: new Map(),
    engagements: new Map(),
    riskApprovals: new Map(),
    clearanceTokens: new Map(),
    descriptors: [],
    auditLedger: createAuditLedger(),
  };
}

function firstEvidenceRecords(context, tenantId) {
  const opportunity =
    [...context.opportunities.values()].find((entry) => entry.tenant_id === tenantId) ??
    createCrmCoreOpportunity({
      opportunity_id: "opp-cmp-g6-evidence",
      tenant_id: tenantId,
      party_id: "party-cmp-g6-client",
      display_name: "CMP G6 Evidence Opportunity",
      stage: "qualified",
      status: "active",
      owner_user_id: "user-cmp-g6-owner",
    });
  const intakeRequest =
    [...context.intakeRequests.values()].find((entry) => entry.tenant_id === tenantId) ??
    createIntakeCoreIntakeRequest({
      intake_request_id: "intake-cmp-g6-evidence",
      tenant_id: tenantId,
      opportunity_id: opportunity.opportunity_id,
      requesting_party_id: opportunity.party_id,
      party_ids: [opportunity.party_id, "party-cmp-g6-counterparty"],
      status: "open",
      owner_user_id: "user-cmp-g6-owner",
      requested_scope_summary: "CMP G6 evidence intake",
    });
  const conflictCheck =
    [...context.conflictChecks.values()].find((entry) => entry.tenant_id === tenantId) ??
    createIntakeCoreConflictCheck({
      conflict_check_id: "conflict-cmp-g6-evidence",
      tenant_id: tenantId,
      intake_request_id: intakeRequest.intake_request_id,
      party_snapshot: partySnapshotFromIntake(intakeRequest),
      snapshot_recorded_at: "2026-06-20T00:00:00.000Z",
      status: "snapshot_recorded",
      owner_user_id: "user-cmp-g6-owner",
    });
  const conflictHit =
    [...context.conflictHits.values()].find((entry) => entry.tenant_id === tenantId) ??
    createIntakeCoreConflictHit({
      conflict_hit_id: "hit-cmp-g6-evidence",
      tenant_id: tenantId,
      conflict_check_id: conflictCheck.conflict_check_id,
      matched_party_id: intakeRequest.party_ids.at(-1),
      hit_source: "former_matter",
      source_record_ref: "former_matter:cmp-g6",
      severity: "high",
      audit_hint_ref: "audit:cmp-g6:hit",
      status: "review_required",
      owner_user_id: "user-cmp-g6-owner",
    });
  const engagement =
    [...context.engagements.values()].find((entry) => entry.tenant_id === tenantId) ?? {
      engagement_id: "engagement-cmp-g6-evidence",
      tenant_id: tenantId,
      intake_request_id: intakeRequest.intake_request_id,
      legal_client_party_id: intakeRequest.requesting_party_id,
      scope_summary: "CMP G6 engagement scope",
      fee_terms_id: "fee-terms-cmp-g6-evidence",
      approval_state: "approved",
    };
  return { opportunity, intakeRequest, conflictCheck, conflictHit, engagement };
}

function buildCrmIntakeEvidenceDescriptors(context, tenantId) {
  const { opportunity, intakeRequest, conflictCheck, conflictHit, engagement } = firstEvidenceRecords(context, tenantId);
  const pipeline = createCrmOpportunityPipelineDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    opportunity,
    requested_stage: opportunity.stage === "qualified" ? "intake_requested" : "closed_lost",
  });
  const opportunityToIntake = createCrmOpportunityToIntakeCommandDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    opportunity_id: opportunity.opportunity_id,
    party_id: opportunity.party_id,
    intake_request_id: intakeRequest.intake_request_id,
  });
  const summary = createCrmSummaryUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    party: { party_id: opportunity.party_id, display_name: "CMP G6 Client", party_type: "organization", status: "active" },
    opportunities: [opportunity],
    source_payload: { conflict_memo: "hidden", billing_detail: "hidden" },
  });
  const keyClient = createCrmKeyClientPlanUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    party: { party_id: opportunity.party_id, display_name: "CMP G6 Client", party_type: "organization", status: "active" },
    opportunities: [opportunity],
    relationship_owner_user_id: "user-cmp-g6-owner",
    next_best_action: "Review intake clearance",
    source_payload: { ar_balance: 1000 },
  });
  const search = createIntakeConflictSearchDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    conflict_check: conflictCheck,
    party_snapshot: conflictCheck.party_snapshot,
    search_sources: {
      alias_index: [{ alias_ref: "alias:cmp-g6", party_id: opportunity.party_id }],
      relationship_graph: [{ relationship_ref: "relationship:cmp-g6", party_ids: intakeRequest.party_ids }],
      former_matter: [{ matter_ref: "former_matter:cmp-g6", party_id: intakeRequest.party_ids.at(-1) }],
    },
  });
  const decision = createIntakeConflictDecisionWorkflowDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    conflict_check: conflictCheck,
    conflict_hits: [conflictHit],
    requested_decision: "waiver_required",
    reviewer_user_id: "user-cmp-g6-risk",
  });
  const waiver = createIntakeWaiverDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    waiver_id: "waiver-cmp-g6-evidence",
    intake_request_id: intakeRequest.intake_request_id,
    conflict_hit_ids: [conflictHit.conflict_hit_id],
    consent_document_ref: "dms:cmp-g6-waiver",
    approver_user_id: "user-cmp-g6-risk",
  });
  const feeTerms = createIntakeFeeTermsDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    fee_terms_id: engagement.fee_terms_id,
    intake_request_id: intakeRequest.intake_request_id,
    fee_type: "hourly",
    currency: "KRW",
    rate_card_ref: "rate-card:cmp-g6",
  });
  const engagementDescriptor = createIntakeEngagementDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    engagement_id: engagement.engagement_id,
    intake_request_id: intakeRequest.intake_request_id,
    legal_client_party_id: engagement.legal_client_party_id,
    scope_summary: engagement.scope_summary,
    fee_terms_id: engagement.fee_terms_id,
    approval_state: engagement.approval_state,
  });
  const risk = createIntakeRiskApprovalQueueDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    risk_approval_id: "risk-cmp-g6-evidence",
    intake_request_id: intakeRequest.intake_request_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    reviewer_user_id: "user-cmp-g6-risk",
    approval_audit_ref: "audit:cmp-g6:risk",
  });
  const clearance = createIntakeClearanceTokenDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    clearance_token_id: "clearance-cmp-g6-evidence",
    intake_request_id: intakeRequest.intake_request_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    engagement_id: engagement.engagement_id,
    issued_at: "2026-06-20T00:00:00.000Z",
    expires_at: "2030-01-01T00:00:00.000Z",
    current_time: "2026-06-20T00:00:00.000Z",
    snapshot_hash: conflictCheck.snapshot_hash,
    current_snapshot_hash: conflictCheck.snapshot_hash,
  });
  const memo = createIntakeConflictMemoBoundaryDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    actor_module: "crm",
    conflict_check_id: conflictCheck.conflict_check_id,
    source_payload: { conflict_memo_body: "hidden", unauthorized_count: 2 },
  });
  const waiverUi = createIntakeWaiverApprovalUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    waiver: { waiver_id: "waiver-cmp-g6-evidence", tenant_id: tenantId, approval_state: "review_required" },
    permission_outcome: "review_required",
  });
  const engagementUi = createIntakeEngagementApprovalUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g6-runtime-evidence",
    engagement,
  });
  return { pipeline, opportunityToIntake, summary, keyClient, search, decision, waiver, feeTerms, engagementDescriptor, risk, clearance, memo, waiverUi, engagementUi };
}

export function createCrmIntakeCmpG6RuntimeEvidence(context, tenantId = SYNTHETIC_TENANT) {
  const descriptors = buildCrmIntakeEvidenceDescriptors(context, tenantId);
  return Object.freeze({
    cmp_gate: "CMP-G6",
    cmp_work_package: "CMP-G6-W06",
    depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02"]),
    feeds_runtime_gate: Object.freeze(["CMP-G4-W04"]),
    tuw_ids: CMP_G6_TUW_IDS,
    legacy_reference_tuw_ids: CRM_INTAKE_CLEARANCE_BOUNDED_CONTEXT.legacy_reference_tuw_ids,
    runtime_routes: CRM_INTAKE_CLEARANCE_BOUNDED_CONTEXT.runtime_routes,
    runtime_readiness: RUNTIME_READINESS,
    durable_persistence_open: true,
    opportunity_to_matter_bypass_blocked: true,
    intake_conflict_engagement_clearance_required: true,
    conflict_memo_hidden_from_crm: true,
    clearance_token_count: [...context.clearanceTokens.values()].filter((token) => token.tenant_id === tenantId).length,
    intake_request_count: [...context.intakeRequests.values()].filter((entry) => entry.tenant_id === tenantId).length,
    descriptor_closeouts: Object.freeze({
      crm: createCrmG3PartialCloseoutDescriptor({
        pipeline_evidence: [descriptors.pipeline],
        permission_trim_evidence: ["cmp-g6-confidential-activity-trim"],
        summary_ui_evidence: [descriptors.summary],
        opportunity_to_intake_evidence: [descriptors.opportunityToIntake],
        key_client_plan_evidence: [descriptors.keyClient],
        command_evidence: ["apps/api/src/crm-intake-runtime-context.js"],
        pr_state: { draft: true, clean: true, merge_authority: "human_only" },
        g1_g2_evidence_disposition: "runtime_api_evidence_recorded",
        human_review_disposition: "pending",
      }),
      workflow: createIntakeG3DWorkflowCloseoutDescriptor({
        conflict_search_evidence: [descriptors.search],
        decision_workflow_evidence: [descriptors.decision],
        waiver_evidence: [descriptors.waiver],
        engagement_evidence: [descriptors.engagementDescriptor],
        fee_terms_evidence: [descriptors.feeTerms],
        risk_approval_evidence: [descriptors.risk],
        clearance_token_evidence: [descriptors.clearance],
        command_evidence: ["apps/api/src/crm-intake-runtime-context.js"],
        pr_state: { draft: true, clean: true, merge_authority: "human_only" },
        human_review_disposition: "pending",
      }),
      closeout: createIntakeG3CloseoutDescriptor({
        crm_evidence: [descriptors.pipeline, descriptors.summary, descriptors.keyClient],
        intake_schema_evidence: ["IntakeRequest/ConflictCheck/ConflictHit runtime records"],
        workflow_evidence: [descriptors.search, descriptors.decision, descriptors.clearance],
        ui_boundary_evidence: [descriptors.memo, descriptors.waiverUi, descriptors.engagementUi],
        command_evidence: ["npm run client-matter:cmp-g6:validate"],
        pr_state: { draft: true, clean: true, merge_authority: "human_only" },
        g1_g2_evidence_disposition: "runtime_api_evidence_recorded",
        human_review_disposition: "pending",
      }),
    }),
  });
}

export async function handleCrmIntakeApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });

    if (pathname === "/api/crm-intake/runtime/evidence" && method === "GET") {
      return response(200, { outcome: "ok", evidence: createCrmIntakeCmpG6RuntimeEvidence(context, tenantId), tuw_ids: CMP_G6_TUW_IDS });
    }

    if (pathname === "/api/crm-intake/leads" && method === "POST") {
      const lead = createCrmCoreLead({
        lead_id: body.lead_id ?? `lead-cmp-g6-${randomUUID()}`,
        tenant_id: tenantId,
        party_id: body.party_id,
        display_name: body.display_name ?? "CMP G6 Lead",
        status: body.status ?? "active",
        owner_user_id: body.owner_user_id ?? actor.actor_id,
        lead_source: body.lead_source,
        matter_id: body.matter_id,
      });
      context.leads.set(key(tenantId, lead.lead_id), lead);
      appendCrmIntakeAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "crm.lead.create",
        object_type: "CrmLead",
        object_id: lead.lead_id,
        reason: "party_scoped_lead_created",
      });
      return response(201, { outcome: "created", lead, tuw_ids: ["CMP-G6-W06-T001"] });
    }

    if (pathname === "/api/crm-intake/opportunities" && method === "POST") {
      const opportunity = createDefaultOpportunity({ tenantId, body: { ...body, owner_user_id: body.owner_user_id ?? actor.actor_id } });
      context.opportunities.set(key(tenantId, opportunity.opportunity_id), opportunity);
      appendCrmIntakeAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "crm.opportunity.create",
        object_type: "CrmOpportunity",
        object_id: opportunity.opportunity_id,
        reason: "opportunity_created_without_matter_shortcut",
      });
      return response(201, { outcome: "created", opportunity: publicOpportunity(opportunity), tuw_ids: ["CMP-G6-W06-T002"] });
    }

    const pipelineMatch = pathname.match(/^\/api\/crm-intake\/opportunities\/([^/]+)\/pipeline$/);
    if (pipelineMatch && method === "PATCH") {
      return handleOpportunityPipeline({ tenantId, actor, opportunityId: decodeURIComponent(pipelineMatch[1]), body, context });
    }

    const intakeCommandMatch = pathname.match(/^\/api\/crm-intake\/opportunities\/([^/]+)\/intake-request$/);
    if (intakeCommandMatch && method === "POST") {
      return handleOpportunityToIntake({ tenantId, actor, opportunityId: decodeURIComponent(intakeCommandMatch[1]), body, context });
    }

    if (pathname === "/api/crm-intake/activities" && method === "POST") {
      const activity = createCrmCoreCRMActivity({
        crm_activity_id: body.crm_activity_id ?? `activity-cmp-g6-${randomUUID()}`,
        tenant_id: tenantId,
        party_id: body.party_id,
        opportunity_id: body.opportunity_id,
        activity_type: body.activity_type ?? "note",
        subject: body.subject ?? "CMP G6 CRM activity",
        confidential: body.confidential === true,
        status: body.status ?? "active",
        owner_user_id: body.owner_user_id ?? actor.actor_id,
      });
      context.activities.set(key(tenantId, activity.crm_activity_id), activity);
      const trim = createCrmActivityPermissionTrimDescriptor({
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        activity,
        permission_outcome: body.permission_outcome ?? (activity.confidential ? "denied" : "allowed"),
        actor_can_view_confidential: body.actor_can_view_confidential,
      });
      return response(201, { outcome: "created", activity, permission_trim: trim, tuw_ids: ["CMP-G6-W06-T003", "CMP-G6-W06-T008"] });
    }

    if (pathname === "/api/crm-intake/proposals" && method === "POST") {
      const proposal = createCrmCoreProposal({
        proposal_id: body.proposal_id ?? `proposal-cmp-g6-${randomUUID()}`,
        tenant_id: tenantId,
        opportunity_id: body.opportunity_id,
        party_id: body.party_id,
        fee_estimate_ref: body.fee_estimate_ref,
        display_name: body.display_name ?? "CMP G6 Proposal",
        status: body.status ?? "active",
        proposal_status: body.proposal_status ?? "draft",
        owner_user_id: body.owner_user_id ?? actor.actor_id,
      });
      context.proposals.set(key(tenantId, proposal.proposal_id), proposal);
      return response(201, { outcome: "created", proposal, tuw_ids: ["CMP-G6-W06-T004"] });
    }

    if (pathname === "/api/crm-intake/referrals" && method === "POST") {
      const referral = createCrmCoreReferral({
        referral_id: body.referral_id ?? `referral-cmp-g6-${randomUUID()}`,
        tenant_id: tenantId,
        source_party_id: body.source_party_id,
        target_party_id: body.target_party_id,
        display_name: body.display_name ?? "CMP G6 Referral",
        status: body.status ?? "active",
        owner_user_id: body.owner_user_id ?? actor.actor_id,
      });
      context.referrals.set(key(tenantId, referral.referral_id), referral);
      return response(201, { outcome: "created", referral, tuw_ids: ["CMP-G6-W06-T005"] });
    }

    if (pathname === "/api/crm-intake/campaigns" && method === "POST") {
      const campaign = createCrmCoreCampaign({
        campaign_id: body.campaign_id ?? `campaign-cmp-g6-${randomUUID()}`,
        tenant_id: tenantId,
        display_name: body.display_name ?? "CMP G6 Campaign",
        contact_party_ids: body.contact_party_ids,
        contact_consent_by_party_id: body.contact_consent_by_party_id,
        status: body.status ?? "active",
        owner_user_id: body.owner_user_id ?? actor.actor_id,
      });
      context.campaigns.set(key(tenantId, campaign.campaign_id), campaign);
      return response(201, { outcome: "created", campaign, tuw_ids: ["CMP-G6-W06-T006"] });
    }

    if (pathname === "/api/crm-intake/intake-requests" && method === "POST") {
      const opportunity = context.opportunities.get(key(tenantId, body.opportunity_id));
      if (!opportunity) return notFound("CMP_G6_OPPORTUNITY_NOT_FOUND");
      return handleOpportunityToIntake({ tenantId, actor, opportunityId: opportunity.opportunity_id, body, context });
    }

    if (pathname === "/api/crm-intake/conflict-checks" && method === "POST") {
      return handleConflictCheckCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/crm-intake/conflict-hits" && method === "POST") {
      return handleConflictHitCreate({ tenantId, actor, body, context });
    }

    const searchMatch = pathname.match(/^\/api\/crm-intake\/conflict-checks\/([^/]+)\/search$/);
    if (searchMatch && method === "POST") {
      return handleConflictSearch({ tenantId, actor, conflictCheckId: decodeURIComponent(searchMatch[1]), body, context });
    }

    const decisionMatch = pathname.match(/^\/api\/crm-intake\/conflict-checks\/([^/]+)\/decision$/);
    if (decisionMatch && method === "POST") {
      return handleConflictDecision({ tenantId, actor, conflictCheckId: decodeURIComponent(decisionMatch[1]), body, context });
    }

    if (pathname === "/api/crm-intake/waivers" && method === "POST") {
      return handleWaiver({ tenantId, actor, body, context });
    }

    if (pathname === "/api/crm-intake/fee-terms" && method === "POST") {
      return handleFeeTerms({ tenantId, actor, body, context });
    }

    if (pathname === "/api/crm-intake/engagements" && method === "POST") {
      return handleEngagement({ tenantId, actor, body, context });
    }

    if (pathname === "/api/crm-intake/risk-approvals" && method === "POST") {
      return handleRiskApproval({ tenantId, actor, body, context });
    }

    if (pathname === "/api/crm-intake/clearance-tokens" && method === "POST") {
      return handleClearanceToken({ tenantId, actor, body, context });
    }

    if (pathname === "/api/crm-intake/ui/summary" && method === "GET") {
      return handleSummaryUi({ tenantId, actor, query, context });
    }

    if (pathname === "/api/crm-intake/ui/key-client-plan" && method === "GET") {
      return handleKeyClientPlanUi({ tenantId, actor, query, context });
    }

    if (pathname === "/api/crm-intake/ui/conflict-memo" && method === "GET") {
      return handleConflictMemoUi({ tenantId, actor, query });
    }

    if (pathname === "/api/crm-intake/ui/waiver-approval" && method === "GET") {
      return handleWaiverUi({ tenantId, actor, query, context });
    }

    if (pathname === "/api/crm-intake/ui/engagement-approval" && method === "GET") {
      return handleEngagementUi({ tenantId, actor, query, context });
    }

    if (pathname === "/api/crm-intake/audit" && method === "GET") {
      return response(200, {
        outcome: "ok",
        events: context.auditLedger.list({ tenant_id: tenantId }).map(clone),
        verification: context.auditLedger.verify({ tenant_id: tenantId }),
        tuw_ids: ["CMP-G6-W06-T021", "CMP-G6-W06-T022"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G6_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}

function handleOpportunityPipeline({ tenantId, actor, opportunityId, body, context }) {
  const opportunity = context.opportunities.get(key(tenantId, opportunityId));
  if (!opportunity) return notFound("CMP_G6_OPPORTUNITY_NOT_FOUND");
  const descriptor = createCrmOpportunityPipelineDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    opportunity,
    requested_stage: body.requested_stage,
    matter_id: body.matter_id,
    create_matter: body.create_matter,
    command_payload: body.command_payload,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_OPPORTUNITY_PIPELINE_BLOCKED", descriptor });
  }
  const nextOpportunity = { ...opportunity, stage: body.requested_stage };
  context.opportunities.set(key(tenantId, opportunityId), nextOpportunity);
  appendCrmIntakeAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "crm.opportunity.stage",
    object_type: "CrmOpportunity",
    object_id: opportunityId,
    reason: "opportunity_stage_review_required",
  });
  return response(200, { outcome: "updated", opportunity: publicOpportunity(nextOpportunity), descriptor, tuw_ids: ["CMP-G6-W06-T007"] });
}

function handleOpportunityToIntake({ tenantId, actor, opportunityId, body, context }) {
  const opportunity = context.opportunities.get(key(tenantId, opportunityId));
  if (!opportunity) return notFound("CMP_G6_OPPORTUNITY_NOT_FOUND");
  const intakeRequestId = body.intake_request_id ?? `intake-${opportunityId}`;
  const descriptor = createCrmOpportunityToIntakeCommandDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    opportunity_id: opportunityId,
    party_id: opportunity.party_id,
    intake_request_id: intakeRequestId,
    create_matter: body.create_matter,
    matter_id: body.matter_id,
    command_payload: body.command_payload,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_OPPORTUNITY_TO_INTAKE_BLOCKED", descriptor });
  }
  const intakeRequest = createDefaultIntakeRequest({ tenantId, opportunity, body: { ...body, intake_request_id: intakeRequestId } });
  context.intakeRequests.set(key(tenantId, intakeRequest.intake_request_id), intakeRequest);
  const nextOpportunity = { ...opportunity, stage: "intake_requested", intake_request_id: intakeRequest.intake_request_id };
  context.opportunities.set(key(tenantId, opportunityId), nextOpportunity);
  appendCrmIntakeAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "crm.opportunity.to_intake",
    object_type: "IntakeRequest",
    object_id: intakeRequest.intake_request_id,
    reason: "opportunity_converted_to_intake_only",
  });
  return response(201, {
    outcome: "created",
    opportunity: publicOpportunity(nextOpportunity),
    intake_request: publicIntakeRequest(intakeRequest),
    descriptor,
    tuw_ids: ["CMP-G6-W06-T010", "CMP-G6-W06-T013"],
  });
}

function handleConflictCheckCreate({ tenantId, actor, body, context }) {
  const intakeRequest = context.intakeRequests.get(key(tenantId, body.intake_request_id));
  if (!intakeRequest) return notFound("CMP_G6_INTAKE_REQUEST_NOT_FOUND");
  const conflictCheck = createIntakeCoreConflictCheck({
    conflict_check_id: body.conflict_check_id ?? `conflict-${intakeRequest.intake_request_id}`,
    tenant_id: tenantId,
    intake_request_id: intakeRequest.intake_request_id,
    party_snapshot: body.party_snapshot ?? partySnapshotFromIntake(intakeRequest),
    snapshot_recorded_at: body.snapshot_recorded_at ?? "2026-06-20T00:00:00.000Z",
    status: body.status ?? "snapshot_recorded",
    owner_user_id: body.owner_user_id ?? actor.actor_id,
  });
  context.conflictChecks.set(key(tenantId, conflictCheck.conflict_check_id), conflictCheck);
  appendCrmIntakeAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "intake.conflict.snapshot",
    object_type: "ConflictCheck",
    object_id: conflictCheck.conflict_check_id,
    reason: "immutable_party_snapshot_recorded",
  });
  return response(201, { outcome: "created", conflict_check: conflictCheck, tuw_ids: ["CMP-G6-W06-T014"] });
}

function handleConflictHitCreate({ tenantId, actor, body, context }) {
  const conflictCheck = context.conflictChecks.get(key(tenantId, body.conflict_check_id));
  if (!conflictCheck) return notFound("CMP_G6_CONFLICT_CHECK_NOT_FOUND");
  const conflictHit = createIntakeCoreConflictHit({
    conflict_hit_id: body.conflict_hit_id ?? `hit-${conflictCheck.conflict_check_id}-${randomUUID()}`,
    tenant_id: tenantId,
    conflict_check_id: conflictCheck.conflict_check_id,
    matched_party_id: body.matched_party_id ?? conflictCheck.party_snapshot.party_ids.at(-1),
    hit_source: body.hit_source ?? "former_matter",
    source_record_ref: body.source_record_ref ?? "former_matter:cmp-g6",
    severity: body.severity ?? "high",
    audit_hint_ref: body.audit_hint_ref,
    status: body.status ?? "review_required",
    owner_user_id: body.owner_user_id ?? actor.actor_id,
  });
  context.conflictHits.set(key(tenantId, conflictHit.conflict_hit_id), conflictHit);
  return response(201, { outcome: "created", conflict_hit: conflictHit, tuw_ids: ["CMP-G6-W06-T015"] });
}

function handleConflictSearch({ tenantId, actor, conflictCheckId, body, context }) {
  const conflictCheck = context.conflictChecks.get(key(tenantId, conflictCheckId));
  if (!conflictCheck) return notFound("CMP_G6_CONFLICT_CHECK_NOT_FOUND");
  const descriptor = createIntakeConflictSearchDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    conflict_check: conflictCheck,
    party_snapshot: conflictCheck.party_snapshot,
    search_sources: body.search_sources,
    create_matter: body.create_matter,
    command_payload: body.command_payload,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_CONFLICT_SEARCH_BLOCKED", descriptor });
  }
  context.descriptors.push(descriptor);
  return response(200, { outcome: "review_required", search: descriptor, tuw_ids: ["CMP-G6-W06-T016"] });
}

function handleConflictDecision({ tenantId, actor, conflictCheckId, body, context }) {
  const conflictCheck = context.conflictChecks.get(key(tenantId, conflictCheckId));
  if (!conflictCheck) return notFound("CMP_G6_CONFLICT_CHECK_NOT_FOUND");
  const conflictHits = [...context.conflictHits.values()].filter((hit) => hit.tenant_id === tenantId && hit.conflict_check_id === conflictCheckId);
  const descriptor = createIntakeConflictDecisionWorkflowDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    conflict_check: conflictCheck,
    conflict_hits: body.conflict_hits ?? conflictHits,
    requested_decision: body.requested_decision,
    reviewer_user_id: body.reviewer_user_id,
    create_matter: body.create_matter,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_CONFLICT_DECISION_BLOCKED", descriptor });
  }
  context.conflictDecisions.set(key(tenantId, conflictCheckId), descriptor);
  appendCrmIntakeAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "intake.conflict.decision",
    object_type: "ConflictDecision",
    object_id: conflictCheckId,
    reason: "human_reviewer_conflict_decision_recorded",
  });
  return response(200, { outcome: "review_required", decision: descriptor, tuw_ids: ["CMP-G6-W06-T017"] });
}

function handleWaiver({ tenantId, actor, body, context }) {
  const descriptor = createIntakeWaiverDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    waiver_id: body.waiver_id ?? `waiver-${body.intake_request_id ?? randomUUID()}`,
    intake_request_id: body.intake_request_id,
    conflict_hit_ids: body.conflict_hit_ids,
    consent_document_ref: body.consent_document_ref,
    approver_user_id: body.approver_user_id,
    create_matter: body.create_matter,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_WAIVER_BLOCKED", descriptor });
  }
  context.waivers.set(key(tenantId, descriptor.waiver_id), { ...descriptor, approval_state: body.approval_state ?? "review_required" });
  return response(201, { outcome: "created", waiver: descriptor, tuw_ids: ["CMP-G6-W06-T018"] });
}

function handleFeeTerms({ tenantId, actor, body, context }) {
  const descriptor = createIntakeFeeTermsDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    fee_terms_id: body.fee_terms_id ?? `fee-terms-${body.intake_request_id ?? randomUUID()}`,
    intake_request_id: body.intake_request_id,
    fee_type: body.fee_type,
    currency: body.currency ?? "KRW",
    rate_card_ref: body.rate_card_ref,
    hourly_rate: body.hourly_rate,
    fixed_fee_amount: body.fixed_fee_amount,
    cap_amount: body.cap_amount,
    retainer_amount: body.retainer_amount,
    create_matter: body.create_matter,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_FEE_TERMS_BLOCKED", descriptor });
  }
  context.feeTerms.set(key(tenantId, descriptor.fee_terms_id), descriptor);
  return response(201, { outcome: "created", fee_terms: descriptor, tuw_ids: ["CMP-G6-W06-T018"] });
}

function handleEngagement({ tenantId, actor, body, context }) {
  const descriptor = createIntakeEngagementDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    engagement_id: body.engagement_id ?? `engagement-${body.intake_request_id ?? randomUUID()}`,
    intake_request_id: body.intake_request_id,
    legal_client_party_id: body.legal_client_party_id,
    scope_summary: body.scope_summary,
    fee_terms_id: body.fee_terms_id,
    approval_state: body.approval_state,
    create_matter: body.create_matter,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_ENGAGEMENT_BLOCKED", descriptor });
  }
  context.engagements.set(key(tenantId, descriptor.engagement_id), descriptor);
  appendCrmIntakeAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "intake.engagement.review",
    object_type: "Engagement",
    object_id: descriptor.engagement_id,
    reason: "engagement_scope_and_client_reviewed",
  });
  return response(201, { outcome: "created", engagement: descriptor, tuw_ids: ["CMP-G6-W06-T018", "CMP-G6-W06-T019"] });
}

function handleRiskApproval({ tenantId, actor, body, context }) {
  const descriptor = createIntakeRiskApprovalQueueDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    risk_approval_id: body.risk_approval_id ?? `risk-${body.intake_request_id ?? randomUUID()}`,
    intake_request_id: body.intake_request_id,
    conflict_check_id: body.conflict_check_id,
    reviewer_user_id: body.reviewer_user_id,
    approval_audit_ref: body.approval_audit_ref,
    create_matter: body.create_matter,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_RISK_APPROVAL_BLOCKED", descriptor });
  }
  context.riskApprovals.set(key(tenantId, descriptor.risk_approval_id), descriptor);
  return response(201, { outcome: "created", risk_approval: descriptor, tuw_ids: ["CMP-G6-W06-T018"] });
}

function handleClearanceToken({ tenantId, actor, body, context }) {
  const intakeRequest = context.intakeRequests.get(key(tenantId, body.intake_request_id));
  const conflictCheck = context.conflictChecks.get(key(tenantId, body.conflict_check_id));
  const engagement = context.engagements.get(key(tenantId, body.engagement_id));
  const decision = context.conflictDecisions.get(key(tenantId, body.conflict_check_id));
  const blockedClaims = [];
  if (!intakeRequest) blockedClaims.push("intake_request_required_for_clearance");
  if (!conflictCheck) blockedClaims.push("conflict_check_required_for_clearance");
  if (!decision) blockedClaims.push("conflict_decision_required_for_clearance");
  if (!["cleared", "waiver_required"].includes(decision?.requested_decision)) blockedClaims.push("conflict_clearance_or_waiver_required");
  if (!engagement) blockedClaims.push("engagement_required_for_clearance");
  if (!["approved", "signed"].includes(engagement?.approval_state)) blockedClaims.push("engagement_approval_required_for_clearance");
  if (hasMatterCreationRequest(body)) blockedClaims.push("opportunity_to_matter_bypass_blocked");

  if (blockedClaims.length > 0) {
    return response(400, {
      outcome: "blocked",
      safe_error_code: "CMP_G6_CLEARANCE_GATE_BLOCKED",
      blocked_claims: blockedClaims,
      tuw_ids: ["CMP-G6-W06-T019", "CMP-G6-W06-T020"],
    });
  }

  const descriptor = createIntakeClearanceTokenDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    clearance_token_id: body.clearance_token_id ?? `clearance-${intakeRequest.intake_request_id}`,
    intake_request_id: intakeRequest.intake_request_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    engagement_id: engagement.engagement_id,
    issued_at: body.issued_at ?? "2026-06-20T00:00:00.000Z",
    expires_at: body.expires_at ?? "2030-01-01T00:00:00.000Z",
    current_time: body.current_time ?? "2026-06-20T00:00:00.000Z",
    snapshot_hash: conflictCheck.snapshot_hash,
    current_snapshot_hash: body.current_snapshot_hash ?? conflictCheck.snapshot_hash,
    create_matter: body.create_matter,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_CLEARANCE_TOKEN_BLOCKED", token: descriptor });
  }
  context.clearanceTokens.set(key(tenantId, descriptor.clearance_token_id), descriptor);
  appendCrmIntakeAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "intake.clearance_token.issue",
    object_type: "IntakeClearanceToken",
    object_id: descriptor.clearance_token_id,
    reason: "intake_conflict_engagement_gate_passed",
    evidence_refs: [intakeRequest.intake_request_id, conflictCheck.conflict_check_id, engagement.engagement_id],
  });
  return response(201, { outcome: "created", clearance_token: descriptor, tuw_ids: ["CMP-G6-W06-T019", "CMP-G6-W06-T020"] });
}

function handleSummaryUi({ tenantId, actor, query, context }) {
  const partyId = query.party_id;
  const opportunities = [...context.opportunities.values()].filter((opportunity) => opportunity.tenant_id === tenantId && (!partyId || opportunity.party_id === partyId));
  const descriptor = createCrmSummaryUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    party: { party_id: partyId ?? opportunities[0]?.party_id, display_name: "CMP G6 Client", party_type: "organization", status: "active" },
    opportunities,
    source_payload: { conflict_memo: "hidden", billing_detail: "hidden" },
  });
  return response(200, { outcome: "ok", summary: descriptor, tuw_ids: ["CMP-G6-W06-T009"] });
}

function handleKeyClientPlanUi({ tenantId, actor, query, context }) {
  const partyId = query.party_id;
  const opportunities = [...context.opportunities.values()].filter((opportunity) => opportunity.tenant_id === tenantId && (!partyId || opportunity.party_id === partyId));
  const descriptor = createCrmKeyClientPlanUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    party: { party_id: partyId ?? opportunities[0]?.party_id, display_name: "CMP G6 Key Client", party_type: "organization", status: "active" },
    opportunities,
    relationship_owner_user_id: actor.actor_id,
    next_best_action: "Review intake clearance",
    source_payload: { ar_balance: 1000, invoice_detail: "hidden" },
  });
  return response(200, { outcome: "ok", key_client_plan: descriptor, tuw_ids: ["CMP-G6-W06-T011"] });
}

function handleConflictMemoUi({ tenantId, actor, query }) {
  const descriptor = createIntakeConflictMemoBoundaryDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    actor_module: query.actor_module ?? "crm",
    conflict_check_id: query.conflict_check_id,
    permission_outcome: query.permission_outcome,
    source_payload: { conflict_memo_body: "hidden", conflict_hit_detail: "hidden", unauthorized_count: 2 },
  });
  return response(descriptor.outcome === "denied" ? 403 : 200, { outcome: descriptor.outcome, conflict_memo: descriptor, tuw_ids: ["CMP-G6-W06-T020"] });
}

function handleWaiverUi({ tenantId, actor, query, context }) {
  const waiver = context.waivers.get(key(tenantId, query.waiver_id)) ?? { waiver_id: query.waiver_id, tenant_id: tenantId, approval_state: "review_required" };
  const descriptor = createIntakeWaiverApprovalUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    waiver,
    permission_outcome: query.permission_outcome ?? "review_required",
  });
  return response(descriptor.outcome === "denied" ? 403 : 200, { outcome: descriptor.outcome, waiver_ui: descriptor, tuw_ids: ["CMP-G6-W06-T020"] });
}

function handleEngagementUi({ tenantId, actor, query, context }) {
  const engagement = context.engagements.get(key(tenantId, query.engagement_id));
  if (!engagement) return notFound("CMP_G6_ENGAGEMENT_NOT_FOUND");
  const descriptor = createIntakeEngagementApprovalUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    engagement,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G6_ENGAGEMENT_UI_BLOCKED", engagement_ui: descriptor });
  }
  return response(200, { outcome: "ok", engagement_ui: descriptor, tuw_ids: ["CMP-G6-W06-T020"] });
}
