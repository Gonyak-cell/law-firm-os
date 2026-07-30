import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createLead } from "../../../packages/crm/src/lead-service.js";
import {
  CRM_LEAD_INQUIRY_ERROR_CODES,
  transitionLeadInquiryStatus,
} from "../../../packages/crm/src/lead-inquiry-service.js";
import {
  CRM_CONSULTATION_ERROR_CODES,
  scheduleCrmConsultation,
  updateCrmConsultation,
} from "../../../packages/crm/src/activity-service.js";
import {
  compareCrmInquirySummaries,
  normalizeCrmInquiryVisibleStatus,
  projectCrmInquiry,
  summarizeCrmInquiry,
} from "../../../packages/crm/src/inquiry-read-model.js";
import { createOpportunity } from "../../../packages/crm/src/opportunity-service.js";
import { handoffOpportunityToIntake } from "../../../packages/crm/src/intake-handoff-service.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { createIntakeRequest } from "../../../packages/intake/src/intake-request-service.js";
import { createConflictCheck } from "../../../packages/intake/src/conflict-check-service.js";
import { executeConflictSearch } from "../../../packages/intake/src/conflict-search-service.js";
import { decideConflict } from "../../../packages/intake/src/conflict-decision-service.js";
import { approveWaiver } from "../../../packages/intake/src/waiver-service.js";
import { approveEngagement } from "../../../packages/intake/src/engagement-service.js";
import { issueClearanceToken, validateClearanceToken } from "../../../packages/intake/src/clearance-token-service.js";
import {
  createClientGroupService,
  createContactPointService,
  createCrmCanonicalWriteService,
  createMasterDataDuplicateService,
  createMasterDataRepository,
  createOrganizationService,
  createPartyMergeSplitService,
  createPersonService,
  createRelationshipService,
  seedMasterDataRepository,
} from "../../../packages/master-data/src/index.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";
import { matchCrmIntakeRoute } from "./routes/crm.js";

export const CRM_INTAKE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "crm-intake",
  contract_ref: "contracts/crm-intake-runtime-contract.json",
  contract_schema_version: "law-firm-os.crm-intake-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/crm/leads",
    "POST /api/crm/leads",
    "GET /api/crm/inquiries",
    "GET /api/crm/inquiries/:id",
    "POST /api/crm/inquiries/:id/transitions",
    "POST /api/crm/inquiries/:id/consultations",
    "GET /api/crm/opportunities",
    "POST /api/crm/opportunities",
    "GET /api/crm/activities",
    "POST /api/crm/activities",
    "PATCH /api/crm/activities/:id",
    "GET /api/crm/proposals",
    "POST /api/crm/proposals",
    "PATCH /api/crm/proposals/:id",
    "GET /api/crm/accounts",
    "POST /api/crm/accounts",
    "PATCH /api/crm/accounts/:id",
    "GET /api/crm/client-settings",
    "PATCH /api/crm/client-settings/:id",
    "GET /api/crm/contacts",
    "POST /api/crm/contacts",
    "PATCH /api/crm/contacts/:id",
    "GET /api/crm/accounts/:id/contacts",
    "POST /api/crm/duplicate-reviews",
    "GET /api/crm/duplicate-merge-proposals",
    "POST /api/crm/duplicate-merge-proposals",
    "POST /api/crm/duplicate-merge-proposals/:id/execute",
    "POST /api/crm/opportunities/:id/handoff",
    "GET /api/intake/requests",
    "POST /api/intake/requests",
    "POST /api/intake/conflict-checks",
    "POST /api/intake/conflict-decisions",
    "POST /api/intake/waivers",
    "POST /api/intake/engagements",
    "GET /api/intake/clearance-tokens",
    "POST /api/intake/clearance-tokens",
    "GET /api/intake/audit",
  ]),
  data_source: "crm_intake_runtime_repositories",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const CRM_INTAKE_API_ERROR_CODES = Object.freeze({
  tenant_required: "CRM_INTAKE_TENANT_REQUIRED",
  permission_required: "CRM_INTAKE_PERMISSION_REQUIRED",
  audit_hint_required: "CRM_INTAKE_AUDIT_HINT_REQUIRED",
  validation_error: "CRM_INTAKE_API_VALIDATION_ERROR",
  unauthorized_omission: "CRM_INTAKE_UNAUTHORIZED_OMISSION",
  review_required: "CRM_INTAKE_REVIEW_REQUIRED",
  approval_required: "CRM_INTAKE_APPROVAL_REQUIRED",
  not_found: "CRM_INTAKE_NOT_FOUND",
  inquiry_idempotency_conflict: CRM_LEAD_INQUIRY_ERROR_CODES.idempotency_conflict,
  inquiry_transition_invalid: CRM_LEAD_INQUIRY_ERROR_CODES.invalid_transition,
  inquiry_not_found: CRM_LEAD_INQUIRY_ERROR_CODES.not_found,
  inquiry_version_conflict: CRM_LEAD_INQUIRY_ERROR_CODES.version_conflict,
  consultation_active_exists:
    CRM_CONSULTATION_ERROR_CODES.active_consultation_exists,
  consultation_not_found:
    CRM_CONSULTATION_ERROR_CODES.activity_not_found,
  consultation_idempotency_conflict:
    CRM_CONSULTATION_ERROR_CODES.idempotency_conflict,
  consultation_inquiry_state_invalid:
    CRM_CONSULTATION_ERROR_CODES.inquiry_state_invalid,
  consultation_update_invalid:
    CRM_CONSULTATION_ERROR_CODES.update_invalid,
  consultation_version_conflict:
    CRM_CONSULTATION_ERROR_CODES.version_conflict,
});

export const CRM_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "Lead",
    lead_id: "lead_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_id: "party_cmp_g6_client_001",
    display_name: "CMP G6 synthetic lead",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
    inquiry_status: "new",
    source: "manual",
    received_at: "2026-07-30T00:00:00.000Z",
    next_action: "문의 확인",
    version: 1,
  }),
  Object.freeze({
    model_type: "Opportunity",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_id: "party_cmp_g6_client_001",
    display_name: "CMP G6 synthetic opportunity",
    stage: "qualified",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "CRMActivity",
    crm_activity_id: "activity_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_id: "party_cmp_g6_client_001",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    activity_type: "meeting",
    subject: "CMP G6 synthetic intake kickoff",
    confidential: false,
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Proposal",
    proposal_id: "proposal_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    party_id: "party_cmp_g6_client_001",
    fee_estimate_ref: "fee_estimate_cmp_g6_guarded_001",
    display_name: "CMP G6 synthetic proposal",
    status: "draft",
    proposal_status: "draft",
    approval_state: "review_required",
    vault_document_ref: "vault_doc_cmp_g6_proposal_001",
    e_sign_provider_status: "blocked_until_provider_receipt",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "ClientPolicy",
    resource_id: "client_policy_cmp_g6_classification",
    policy_id: "client_policy_cmp_g6_classification",
    tenant_id: "tenant_cmp_g6_synthetic",
    display_name: "Client classification policy",
    field_name: "client_classification",
    allowed_values: Object.freeze(["individual", "organization", "key_client"]),
    duplicate_review_required: true,
    write_requires_role_ids: Object.freeze(["crm_intake_admin", "matter_vault_admin"]),
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
    production_ready_claim: false,
  }),
]);

export const CRM_MASTER_DATA_SEED = Object.freeze([
  Object.freeze({
    model_type: "Party",
    party_id: "party_cmp_g6_client_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_type: "organization",
    display_name: "CMP G6 synthetic account",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Entity",
    entity_id: "entity_cmp_g6_account_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    entity_kind: "organization",
    display_name: "CMP G6 synthetic account",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Organization",
    organization_id: "org_cmp_g6_account_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    entity_id: "entity_cmp_g6_account_001",
    party_id: "party_cmp_g6_client_001",
    display_name: "CMP G6 synthetic account",
    registration_number: "CMP-G6-001",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "PartyIdentifier",
    party_identifier_id: "identifier_cmp_g6_account_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_id: "party_cmp_g6_client_001",
    identifier_type: "business_number",
    identifier_value: "CMP-G6-001",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "ClientGroup",
    client_group_id: "client_group_cmp_g6_account_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    display_name: "CMP G6 synthetic account group",
    member_entity_ids: Object.freeze(["entity_cmp_g6_account_001"]),
    member_party_ids: Object.freeze(["party_cmp_g6_client_001"]),
    primary_party_id: "party_cmp_g6_client_001",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Party",
    party_id: "party_cmp_g6_contact_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_type: "person",
    display_name: "CMP G6 synthetic contact",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Entity",
    entity_id: "entity_cmp_g6_contact_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    entity_kind: "person",
    display_name: "CMP G6 synthetic contact",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Person",
    person_id: "person_cmp_g6_contact_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    entity_id: "entity_cmp_g6_contact_001",
    party_id: "party_cmp_g6_contact_001",
    display_name: "CMP G6 synthetic contact",
    email: "contact.cmp-g6@example.com",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "ContactPoint",
    contact_point_id: "contact_point_cmp_g6_contact_email_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    owner_entity_id: "entity_cmp_g6_contact_001",
    owner_party_id: "party_cmp_g6_contact_001",
    contact_type: "email",
    value: "contact.cmp-g6@example.com",
    is_primary: true,
    verified: true,
    verification_status: "verified",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Relationship",
    relationship_id: "relationship_cmp_g6_account_contact_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    from_entity_id: "entity_cmp_g6_contact_001",
    to_entity_id: "entity_cmp_g6_account_001",
    from_party_id: "party_cmp_g6_contact_001",
    to_party_id: "party_cmp_g6_client_001",
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
]);

export const INTAKE_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "IntakeRequest",
    intake_request_id: "intake_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    requesting_party_id: "party_cmp_g6_client_001",
    party_ids: Object.freeze(["party_cmp_g6_client_001"]),
    status: "open",
    owner_user_id: "user_cmp_g6_owner",
    requested_scope_summary: "Synthetic intake request",
  }),
  Object.freeze({
    model_type: "ConflictCheck",
    conflict_check_id: "conflict_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    intake_request_id: "intake_cmp_g6_synthetic_001",
    party_snapshot: Object.freeze({ party_ids: Object.freeze(["party_cmp_g6_client_001"]), source: "party_master" }),
    snapshot_recorded_at: "2026-06-20T00:00:00.000Z",
    snapshot_hash: "seed-snapshot-hash",
    status: "snapshot_recorded",
    owner_user_id: "user_cmp_g6_owner",
  }),
]);

export function createCrmIntakeRuntimeContext({
  crmRepository = createCrmRuntimeRepository({ seedRecords: CRM_RUNTIME_SEED }),
  intakeRepository = createIntakeRuntimeRepository({ seedRecords: INTAKE_RUNTIME_SEED }),
  masterDataRepository = createMasterDataRepository({ seedRecords: CRM_MASTER_DATA_SEED }),
  emailDmsRepository = null,
  matterRepository = null,
  dmsRuntime = null,
} = {}) {
  seedMasterDataRepository(masterDataRepository, CRM_MASTER_DATA_SEED);
  return Object.freeze({
    crmRepository,
    intakeRepository,
    masterDataRepository,
    emailDmsRepository,
    matterRepository,
    dmsRuntime,
    seed_ref: "cmp-g6-crm-intake-synthetic",
    masterDataServices: Object.freeze({
      organizationService: createOrganizationService({ repository: masterDataRepository }),
      personService: createPersonService({ repository: masterDataRepository }),
      clientGroupService: createClientGroupService({ repository: masterDataRepository }),
      contactPointService: createContactPointService({ repository: masterDataRepository }),
      relationshipService: createRelationshipService({ repository: masterDataRepository }),
      duplicateService: createMasterDataDuplicateService({ repository: masterDataRepository }),
      canonicalWriteService: createCrmCanonicalWriteService({ repository: masterDataRepository }),
      mergeSplitService: createPartyMergeSplitService({ repository: masterDataRepository }),
    }),
    intakeService: Object.freeze({
      createIntakeRequest: ({ request, actor_id, idempotency_key }) =>
        createIntakeRequest({ repository: intakeRepository, request, actor_id, idempotency_key }),
    }),
  });
}

const DEFAULT_RUNTIME = createCrmIntakeRuntimeContext();

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommon(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [
          decision.effect === "review_required"
            ? CRM_INTAKE_API_ERROR_CODES.review_required
            : CRM_INTAKE_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [CRM_INTAKE_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function permissionContextForResource(context, resourceId = null) {
  return {
    ...context,
    object_acl: (context?.object_acl ?? []).filter((entry) => (
      entry.resource_id === undefined
      || (resourceId !== null && entry.resource_id === resourceId)
    )),
  };
}

function routeGate({ context, query, requestId, policy }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const resourceId = query.resource_id ?? null;
  const decision = evaluateRouteDecision({
    context: permissionContextForResource(context, resourceId),
    resource: {
      tenant_id: query.tenant_id,
      resource_type: policy.resource_type,
      resource_id: resourceId,
    },
    action: policy.action,
  });
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function sanitizeItem(record) {
  const {
    matter_id,
    matter_ref,
    matter_number,
    matter_create_command,
    matter_open_command,
    body,
    raw_query,
    ...safe
  } = record;
  return Object.freeze({
    ...safe,
    direct_matter_reference_included: false,
    raw_conflict_memo_included: false,
    production_ready_claim: false,
  });
}

function listResponse({ requestId, query, context, policy, items }) {
  const serialized = items.map(sanitizeItem);
  const { allowed } = trimItemsByPermission({
    context,
    items: serialized,
    action: policy.action,
    resourceType: policy.resource_type,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function itemResponse({ requestId, auditHintRef, outcome, item, auditEvent, status = 201, extra = {} }) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome,
      item: sanitizeItem(item),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      production_ready_claim: false,
      ...extra,
    },
  };
}

function conflictCheckSearchPayload({ conflictCheck, body, auditHintRef } = {}) {
  const snapshot = conflictCheck?.party_snapshot ?? {};
  return {
    conflict_search_id:
      body?.conflict_search?.conflict_search_id ?? `search_${conflictCheck.conflict_check_id}`,
    tenant_id: conflictCheck.tenant_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    aliases: body?.conflict_search?.aliases ?? snapshot.aliases ?? [],
    party_ids: body?.conflict_search?.party_ids ?? snapshot.party_ids ?? [],
    party_names: body?.conflict_search?.party_names ?? [],
    relationship_refs: body?.conflict_search?.relationship_refs ?? snapshot.relationship_refs ?? [],
    audit_hint_ref: auditHintRef,
    owner_user_id: conflictCheck.owner_user_id,
    hit_count: body?.conflict_search?.hit_count ?? body?.hit_count,
  };
}

function conflictDecisionPayload({ body, context } = {}) {
  const input = body?.conflict_decision ?? (body?.decision && typeof body.decision === "object" ? body.decision : {});
  return {
    ...input,
    conflict_decision_id: input.conflict_decision_id ?? body?.conflict_decision_id,
    tenant_id: input.tenant_id ?? body?.tenant_id,
    conflict_check_id: input.conflict_check_id ?? body?.conflict_check_id,
    reviewer_id: input.reviewer_id ?? body?.reviewer_id ?? context?.principal?.user_id,
    decision: input.decision ?? (typeof body?.decision === "string" ? body.decision : body?.decision_value),
    conflict_hit_ids: input.conflict_hit_ids ?? body?.conflict_hit_ids ?? [],
    rationale: input.rationale ?? body?.rationale ?? "conflict_review_recorded",
  };
}

function waiverPayload({ body, context } = {}) {
  const input = body?.waiver ?? {};
  return {
    ...input,
    waiver_id: input.waiver_id ?? body?.waiver_id,
    tenant_id: input.tenant_id ?? body?.tenant_id,
    intake_request_id: input.intake_request_id ?? body?.intake_request_id,
    conflict_check_id: input.conflict_check_id ?? body?.conflict_check_id,
    conflict_hit_ids: input.conflict_hit_ids ?? body?.conflict_hit_ids ?? [],
    consent_document_id: input.consent_document_id ?? body?.consent_document_id,
    approver_id: input.approver_id ?? body?.approver_id ?? context?.principal?.user_id,
    approval_reason: input.approval_reason ?? body?.approval_reason ?? "conflict_waiver_approved",
  };
}

function engagementPayload({ body, context } = {}) {
  const input = body?.engagement ?? {};
  const signedDocumentId = input.signed_document_id ?? body?.signed_document_id;
  return {
    ...input,
    engagement_id: input.engagement_id ?? body?.engagement_id,
    tenant_id: input.tenant_id ?? body?.tenant_id,
    intake_request_id: input.intake_request_id ?? body?.intake_request_id,
    signed_document_id: signedDocumentId,
    signature_ref: input.signature_ref ?? body?.signature_ref ?? (signedDocumentId ? `signature:${signedDocumentId}` : undefined),
    template_id: input.template_id ?? body?.template_id ?? "matter_engagement_letter",
    template_document: input.template_document ?? body?.template_document,
    signed_document_upload: input.signed_document_upload ?? body?.signed_document_upload,
    approver_id: input.approver_id ?? body?.approver_id ?? context?.principal?.user_id,
  };
}

function clearanceTokenPayload({ body } = {}) {
  const input = body?.token ?? {};
  const clearanceTokenId = input.clearance_token_id ?? body?.clearance_token_id;
  return {
    ...input,
    clearance_token_id: clearanceTokenId,
    tenant_id: input.tenant_id ?? body?.tenant_id,
    intake_request_id: input.intake_request_id ?? body?.intake_request_id,
    conflict_check_id: input.conflict_check_id ?? body?.conflict_check_id,
    engagement_id: input.engagement_id ?? body?.engagement_id,
    snapshot_hash: input.snapshot_hash ?? body?.snapshot_hash,
  };
}

function primaryId(record) {
  if (!record) return null;
  return (
    record.organization_id ??
    record.client_group_id ??
    record.person_id ??
    record.contact_point_id ??
    record.relationship_id ??
    record.party_identifier_id ??
    record.party_id ??
    record.entity_id ??
    null
  );
}

function contactPointForEntity(repository, tenantId, entityId) {
  return repository
    .list({ tenant_id: tenantId, model_type: "ContactPoint" })
    .find((contactPoint) => contactPoint.owner_entity_id === entityId && contactPoint.is_primary === true) ?? null;
}

function clientGroupForOrganization(repository, organization) {
  return repository
    .list({ tenant_id: organization.tenant_id, model_type: "ClientGroup" })
    .find((group) =>
      (group.member_entity_ids ?? []).includes(organization.entity_id) ||
      (group.member_party_ids ?? []).includes(organization.party_id),
    ) ?? null;
}

function organizationForAccountId(repository, tenantId, accountId) {
  return repository
    .list({ tenant_id: tenantId, model_type: "Organization" })
    .find((organization) =>
      organization.organization_id === accountId ||
      organization.party_id === accountId ||
      organization.entity_id === accountId,
    ) ?? null;
}

function runtimeAccountForAccountId(repository, tenantId, accountId) {
  return repository
    .list({ tenant_id: tenantId, model_type: "Account" })
    .find((account) => account.account_id === accountId || account.resource_id === accountId) ?? null;
}

function resolveAccountOrganization(runtime, tenantId, accountId) {
  if (!accountId) return null;
  const masterAccount = organizationForAccountId(runtime.masterDataRepository, tenantId, accountId);
  if (masterAccount) return masterAccount;
  const runtimeAccount = runtimeAccountForAccountId(runtime.crmRepository, tenantId, accountId);
  if (!runtimeAccount?.organization_id) return null;
  return organizationForAccountId(runtime.masterDataRepository, tenantId, runtimeAccount.organization_id);
}

function serializeAccount(organization, runtime) {
  const clientGroup = clientGroupForOrganization(runtime.masterDataRepository, organization);
  const runtimeAccount = runtimeAccountForAccountId(runtime.crmRepository, organization.tenant_id, organization.organization_id);
  return Object.freeze({
    resource_id: organization.organization_id,
    tenant_id: organization.tenant_id,
    account_id: organization.organization_id,
    organization_id: organization.organization_id,
    client_group_id: clientGroup?.client_group_id ?? null,
    party_id: organization.party_id,
    entity_id: organization.entity_id,
    display_name: organization.display_name,
    status: organization.status,
    owner_user_id: organization.owner_user_id,
    created_at: runtimeAccount?.created_at ?? organization.created_at ?? null,
    updated_at: runtimeAccount?.updated_at ?? organization.updated_at ?? runtimeAccount?.created_at ?? organization.created_at ?? null,
    account_source: "master-data.Organization",
    client_group_source: clientGroup ? "master-data.ClientGroup" : null,
    canonical_sync_state: "canonical_source",
    canonical_write_mounted: true,
    registration_number_included: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function serializeRuntimeAccount(account) {
  return Object.freeze({
    resource_id: account.resource_id ?? account.account_id,
    tenant_id: account.tenant_id,
    account_id: account.account_id,
    organization_id: account.organization_id ?? null,
    client_group_id: account.client_group_id ?? null,
    party_id: account.party_id ?? null,
    entity_id: account.entity_id ?? null,
    display_name: account.display_name,
    status: account.status ?? "active",
    owner_user_id: account.owner_user_id ?? null,
    created_at: account.created_at ?? null,
    updated_at: account.updated_at ?? account.created_at ?? null,
    account_source: "crm-runtime.Account",
    client_group_source: account.client_group_id ? "crm-runtime.linked_client_group" : null,
    canonical_sync_state: account.organization_id && account.client_group_id ? "synced" : "facade_only",
    canonical_write_mounted: account.organization_id && account.client_group_id ? true : false,
    registration_number_included: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function serializeContact(person, runtime) {
  const primaryContactPoint = contactPointForEntity(runtime.masterDataRepository, person.tenant_id, person.entity_id);
  const contactValue = primaryContactPoint?.value ?? person.email ?? person.phone ?? null;
  return Object.freeze({
    resource_id: person.person_id,
    tenant_id: person.tenant_id,
    contact_id: person.person_id,
    person_id: person.person_id,
    party_id: person.party_id,
    entity_id: person.entity_id,
    display_name: person.display_name,
    status: person.status,
    owner_user_id: person.owner_user_id,
    contact_source: "master-data.Person",
    canonical_sync_state: "canonical_source",
    canonical_write_mounted: true,
    primary_contact_point_id: primaryContactPoint?.contact_point_id ?? null,
    primary_contact_type: primaryContactPoint?.contact_type ?? null,
    primary_contact_verified: primaryContactPoint?.verified === true,
    email_value_included: false,
    contact_point_value_included: false,
    email: undefined,
    contact_point_value: undefined,
    contact_value_masked: Boolean(contactValue),
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

const CONTACT_VALUE_READER_ROLES = Object.freeze([
  "crm_contact_value_reader",
  "crm_intake_admin",
  "matter_vault_admin",
  "security_admin",
  "tenant_owner",
]);

function canReadContactValue({ context, query } = {}) {
  const roles = Array.isArray(context?.principal?.role_ids) ? context.principal.role_ids : [];
  const hasReaderRole = roles.some((role) => CONTACT_VALUE_READER_ROLES.includes(role));
  return hasReaderRole && String(query?.permission_ref ?? "").includes("contact_value");
}

function withVisibleContactValue(serialized, { includeContactValue = false, contactType, value } = {}) {
  const rawValue = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  if (!includeContactValue || !rawValue) {
    return Object.freeze({
      ...serialized,
      email_value_included: false,
      contact_point_value_included: false,
      contact_value_masked: Boolean(rawValue),
    });
  }
  return Object.freeze({
    ...serialized,
    email: contactType === "email" ? rawValue : undefined,
    phone: contactType === "phone" ? rawValue : undefined,
    contact_point_value: rawValue,
    email_value_included: contactType === "email",
    phone_value_included: contactType === "phone",
    contact_point_value_included: true,
    contact_value_masked: false,
  });
}

function serializeContactForQuery(person, runtime, options = {}) {
  const serialized = serializeContact(person, runtime);
  const primaryContactPoint = contactPointForEntity(runtime.masterDataRepository, person.tenant_id, person.entity_id);
  return withVisibleContactValue(serialized, {
    ...options,
    contactType: primaryContactPoint?.contact_type ?? (person.email ? "email" : person.phone ? "phone" : null),
    value: primaryContactPoint?.value ?? person.email ?? person.phone ?? null,
  });
}

function serializeRuntimeContact(contact, options = {}) {
  const contactValue = contact.contact_point_value ?? contact.email ?? contact.phone ?? null;
  const contactType = contact.primary_contact_type ?? (contact.email ? "email" : contact.phone ? "phone" : null);
  return Object.freeze({
    ...withVisibleContactValue(
      {
        resource_id: contact.resource_id ?? contact.contact_id,
        tenant_id: contact.tenant_id,
        contact_id: contact.contact_id,
        person_id: contact.person_id ?? null,
        party_id: contact.party_id ?? null,
        entity_id: contact.entity_id ?? null,
        account_id: contact.account_id ?? null,
        display_name: contact.display_name,
        status: contact.status ?? "active",
        owner_user_id: contact.owner_user_id ?? null,
        contact_source: "crm-runtime.Contact",
        canonical_sync_state: contact.person_id ? "synced" : "facade_only",
        canonical_write_mounted: contact.person_id ? true : false,
        primary_contact_point_id: contact.primary_contact_point_id ?? null,
        primary_contact_type: contactType,
        primary_contact_verified: false,
        duplicate_review_required: false,
        direct_matter_reference_included: false,
        production_ready_claim: false,
      },
      { ...options, contactType, value: contactValue },
    ),
  });
}

function serializeAccountContact(relationship, account, runtime) {
  const contactEntityId =
    relationship.from_entity_id === account.entity_id ? relationship.to_entity_id : relationship.from_entity_id;
  const person = runtime.masterDataRepository
    .list({ tenant_id: account.tenant_id, model_type: "Person" })
    .find((candidate) => candidate.entity_id === contactEntityId) ?? null;
  const primaryContactPoint = person
    ? contactPointForEntity(runtime.masterDataRepository, account.tenant_id, person.entity_id)
    : null;
  return withVisibleContactValue(
    {
      resource_id: relationship.relationship_id,
      tenant_id: relationship.tenant_id,
      relationship_id: relationship.relationship_id,
      account_id: account.organization_id,
      contact_id: person?.person_id ?? null,
      relationship_type: relationship.relationship_type,
      direction: relationship.direction,
      status: relationship.status,
      contact_display_name: person?.display_name ?? null,
      primary_contact_type: primaryContactPoint?.contact_type ?? null,
      relationship_endpoint_hidden: false,
      direct_matter_reference_included: false,
      production_ready_claim: false,
    },
    { contactType: primaryContactPoint?.contact_type ?? null, value: primaryContactPoint?.value ?? null },
  );
}

function serializeAccountContactForQuery(relationship, account, runtime, options = {}) {
  const serialized = serializeAccountContact(relationship, account, runtime);
  const person = serialized.contact_id
    ? runtime.masterDataRepository.get({ tenant_id: account.tenant_id, model_type: "Person", id: serialized.contact_id })
    : null;
  const primaryContactPoint = person ? contactPointForEntity(runtime.masterDataRepository, account.tenant_id, person.entity_id) : null;
  return withVisibleContactValue(serialized, {
    ...options,
    contactType: primaryContactPoint?.contact_type ?? null,
    value: primaryContactPoint?.value ?? null,
  });
}

function serializeRuntimeAccountContact(contact, accountId, options = {}) {
  return withVisibleContactValue(
    {
      resource_id: `crm_runtime_relationship:${accountId}:${contact.contact_id}`,
      tenant_id: contact.tenant_id,
      relationship_id: `crm_runtime_relationship:${accountId}:${contact.contact_id}`,
      account_id: accountId,
      contact_id: contact.contact_id,
      relationship_type: contact.relationship_type ?? "crm_runtime_contact",
      direction: "contact_to_account",
      status: contact.status ?? "active",
      contact_display_name: contact.display_name,
      primary_contact_type: contact.primary_contact_type ?? null,
      relationship_endpoint_hidden: false,
      direct_matter_reference_included: false,
      production_ready_claim: false,
    },
    {
      ...options,
      contactType: contact.primary_contact_type ?? null,
      value: contact.contact_point_value ?? contact.email ?? contact.phone ?? null,
    },
  );
}

function serializeDuplicateCandidate(record, source) {
  return Object.freeze({
    resource_id: primaryId(record),
    tenant_id: record.tenant_id,
    model_type: record.model_type,
    display_name: record.display_name ?? null,
    status: record.status ?? null,
    owner_user_id: record.owner_user_id ?? null,
    candidate_source: source,
    identifier_value_included: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function mergeCandidateScore(record, source, displayName) {
  if (source === "identifier") return 0.98;
  const candidateName = String(record.display_name ?? "").trim().toLowerCase();
  const requestedName = String(displayName ?? "").trim().toLowerCase();
  if (candidateName && requestedName && candidateName === requestedName) return 0.9;
  return 0.74;
}

function mergeProposalState(input = {}) {
  const approved =
    input.owner_decision === "approved" &&
    typeof input.owner_approval_ref === "string" &&
    input.owner_approval_ref.trim() !== "" &&
    typeof input.dual_control_approver_id === "string" &&
    input.dual_control_approver_id.trim() !== "" &&
    input.dual_control_approver_id !== input.actor_id &&
    typeof input.source_party_id === "string" &&
    input.source_party_id.trim() !== "" &&
    typeof input.target_party_id === "string" &&
    input.target_party_id.trim() !== "";
  return approved ? "approved" : "owner_decision_required";
}

function serializeMergeCandidate(record, source, displayName) {
  const serialized = serializeDuplicateCandidate(record, source);
  return Object.freeze({
    ...serialized,
    candidate_score: mergeCandidateScore(record, source, displayName),
    merge_reference_bound: Boolean(record.party_id || record.model_type === "Party"),
  });
}

function uniqueMergeCandidates(candidates = {}, displayName) {
  const seen = new Set();
  return [...(candidates.name_candidates ?? []), ...(candidates.identifier_candidates ?? [])]
    .map((candidate) => {
      const source = (candidates.identifier_candidates ?? []).includes(candidate) ? "identifier" : "name";
      return serializeMergeCandidate(candidate, source, displayName);
    })
    .filter((candidate) => {
      const key = `${candidate.model_type}:${candidate.resource_id}:${candidate.candidate_source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function serializeDuplicateMergeProposal(proposal = {}) {
  return Object.freeze({
    resource_id: proposal.proposal_id,
    tenant_id: proposal.tenant_id,
    proposal_id: proposal.proposal_id,
    proposal_state: proposal.proposal_state,
    owner_decision_state: proposal.owner_decision_state,
    candidate_count: proposal.candidate_count ?? 0,
    source_party_bound: Boolean(proposal.source_party_id),
    target_party_bound: Boolean(proposal.target_party_id),
    approval_ref_present: Boolean(proposal.owner_approval_ref),
    dual_control_required: true,
    executable:
      proposal.proposal_state === "approved" &&
      Boolean(proposal.source_party_id) &&
      Boolean(proposal.target_party_id) &&
      Boolean(proposal.owner_approval_ref) &&
      Boolean(proposal.dual_control_approver_id),
    automatic_merge_executed: proposal.automatic_merge_executed === true,
    rollback_metadata_present: Boolean(proposal.rollback_metadata_ref),
    candidate_values_included: false,
    contact_point_value_included: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function mergeProposalListResponse({ requestId, query, context, policy, items }) {
  const serialized = items.map(serializeDuplicateMergeProposal);
  const { allowed } = trimItemsByPermission({
    context,
    items: serialized,
    action: policy.action,
    resourceType: policy.resource_type,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function mergeProposalItemResponse({ requestId, auditHintRef, outcome, item, auditEvent, status = 200, safeErrorCodes = [], extra = {} }) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome,
      item: serializeDuplicateMergeProposal(item),
      audit_event: auditEvent,
      safe_error_codes: safeErrorCodes,
      audit_hint_ref: auditHintRef,
      count_leak_prevented: true,
      production_ready_claim: false,
      ...extra,
    },
  };
}

const DIRECT_MATTER_REFERENCE_FIELDS = Object.freeze([
  "matter_id",
  "matter_ref",
  "matter_number",
  "matter_create_command",
  "matter_open_command",
]);

function includesDirectMatterReference(input = {}) {
  return DIRECT_MATTER_REFERENCE_FIELDS.some((field) => input?.[field] !== undefined && input?.[field] !== null && input?.[field] !== "");
}

function actorIdFrom(body, context) {
  const actorId = context?.principal?.user_id;
  return typeof actorId === "string" && actorId.trim() !== "" ? actorId : null;
}

function partyDisplayName(runtime, tenantId, partyId) {
  if (!runtime?.masterDataRepository || !partyId) return null;
  return runtime.masterDataRepository
    .list({ tenant_id: tenantId, model_type: "Party" })
    .find((party) => party.party_id === partyId)?.display_name ?? null;
}

function serializeActivity(activity = {}, runtime = DEFAULT_RUNTIME) {
  const confidential = activity.confidential === true;
  const consultation = activity.activity_kind === "consultation";
  return Object.freeze({
    resource_id: activity.crm_activity_id,
    tenant_id: activity.tenant_id,
    crm_activity_id: activity.crm_activity_id,
    party_id: activity.party_id,
    party_display_name: partyDisplayName(runtime, activity.tenant_id, activity.party_id),
    lead_id: activity.lead_id ?? null,
    opportunity_id: activity.opportunity_id ?? null,
    activity_type: activity.activity_type,
    activity_kind: activity.activity_kind ?? null,
    subject: confidential
      ? consultation ? "보호된 상담" : "보호된 이력"
      : activity.subject,
    confidential,
    confidential_subject_included: !confidential,
    confidential_details_included: !confidential,
    scheduled_start: activity.scheduled_start ?? null,
    scheduled_end: activity.scheduled_end ?? null,
    timezone: activity.timezone ?? null,
    completed_at: activity.completed_at ?? null,
    outcome: confidential ? null : activity.outcome ?? null,
    next_action: confidential ? null : activity.next_action ?? null,
    version: activity.version ?? 1,
    status: activity.status,
    owner_user_id: activity.owner_user_id,
    occurred_at: activity.occurred_at ?? activity.created_at ?? null,
    created_at: activity.created_at ?? null,
    updated_at: activity.updated_at ?? activity.created_at ?? null,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function serializeProposal(proposal = {}) {
  return Object.freeze({
    resource_id: proposal.proposal_id,
    tenant_id: proposal.tenant_id,
    proposal_id: proposal.proposal_id,
    opportunity_id: proposal.opportunity_id,
    party_id: proposal.party_id,
    display_name: proposal.display_name,
    status: proposal.status,
    proposal_status: proposal.proposal_status,
    approval_state: proposal.approval_state ?? "review_required",
    fee_estimate_ref_present: Boolean(proposal.fee_estimate_ref),
    vault_document_ref_present: Boolean(proposal.vault_document_ref),
    vault_document_ref: proposal.vault_document_ref ?? null,
    e_sign_provider_status: proposal.e_sign_provider_status ?? "blocked_until_provider_receipt",
    e_sign_send_enabled: false,
    owner_user_id: proposal.owner_user_id,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function serializeClientPolicy(policy = {}) {
  return Object.freeze({
    resource_id: policy.resource_id ?? policy.policy_id,
    tenant_id: policy.tenant_id,
    policy_id: policy.policy_id ?? policy.resource_id,
    display_name: policy.display_name,
    field_name: policy.field_name,
    allowed_values: Object.freeze([...(policy.allowed_values ?? [])]),
    duplicate_review_required: policy.duplicate_review_required === true,
    write_requires_role_ids: Object.freeze([...(policy.write_requires_role_ids ?? [])]),
    status: policy.status ?? "active",
    owner_user_id: policy.owner_user_id ?? null,
    policy_write_permissioned: true,
    production_ready_claim: false,
  });
}

function hasClientPolicyAdminRole(context) {
  const roles = Array.isArray(context?.principal?.role_ids) ? context.principal.role_ids : [];
  return roles.some((role) => ["crm_intake_admin", "matter_vault_admin", "security_admin", "tenant_owner"].includes(role));
}

function clientRecordListResponse({ requestId, query, context, policy, items, serializer }) {
  return listResponse({ requestId, query, context, policy, items: items.map(serializer) });
}

function normalizeActivityPatch(updates = {}) {
  const patch = {};
  if (includesDirectMatterReference(updates)) return null;
  if (Object.prototype.hasOwnProperty.call(updates, "subject")) {
    const subject = String(updates.subject ?? "").trim();
    if (subject.length < 2 || subject.length > 160) return null;
    patch.subject = subject;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    if (!["active", "review_required", "archived"].includes(updates.status)) return null;
    patch.status = updates.status;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "confidential")) {
    patch.confidential = updates.confidential === true;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function normalizeProposalPatch(updates = {}) {
  const patch = {};
  if (includesDirectMatterReference(updates)) return null;
  if (updates.e_sign_send_requested === true) {
    return { provider_blocked: true };
  }
  if (Object.prototype.hasOwnProperty.call(updates, "display_name")) {
    const displayName = String(updates.display_name ?? "").trim();
    if (displayName.length < 2 || displayName.length > 160) return null;
    patch.display_name = displayName;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    if (!["draft", "active", "review_required", "blocked", "archived"].includes(updates.status)) return null;
    patch.status = updates.status;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "proposal_status")) {
    if (!["draft", "sent", "accepted", "declined", "expired"].includes(updates.proposal_status)) return null;
    patch.proposal_status = updates.proposal_status;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "approval_state")) {
    if (!["draft", "review_required", "approved", "blocked"].includes(updates.approval_state)) return null;
    patch.approval_state = updates.approval_state;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "vault_document_ref")) {
    const vaultDocumentRef = String(updates.vault_document_ref ?? "").trim();
    if (!/^vault_doc_[A-Za-z0-9_:-]{3,120}$/.test(vaultDocumentRef)) return null;
    patch.vault_document_ref = vaultDocumentRef;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

const CRM_INQUIRY_LIST_DEFAULT_LIMIT = 50;
const CRM_INQUIRY_LIST_MAX_LIMIT = 100;

function supplementalReadDecision({
  context,
  tenantId,
  resourceType,
  action,
}) {
  return evaluateRouteDecision({
    context: permissionContextForResource(context),
    resource: {
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: null,
    },
    action,
  });
}

function normalizeInquiryListOptions(query, requestId) {
  const rawLimit = query.limit;
  const limit = rawLimit == null || rawLimit === ""
    ? CRM_INQUIRY_LIST_DEFAULT_LIMIT
    : Number(rawLimit);
  if (
    !Number.isSafeInteger(limit)
    || limit < 1
    || limit > CRM_INQUIRY_LIST_MAX_LIMIT
  ) {
    return {
      error: errorResponse(
        400,
        requestId,
        [CRM_INTAKE_API_ERROR_CODES.validation_error],
        {
          audit_hint_ref: query.audit_hint_ref,
          ui_state: "blocked",
        },
      ),
    };
  }
  const rawVisibleStatus = String(query.visible_status ?? "").trim();
  const visibleStatus = rawVisibleStatus
    ? normalizeCrmInquiryVisibleStatus(rawVisibleStatus)
    : null;
  if (rawVisibleStatus && !visibleStatus) {
    return {
      error: errorResponse(
        400,
        requestId,
        [CRM_INTAKE_API_ERROR_CODES.validation_error],
        {
          audit_hint_ref: query.audit_hint_ref,
          ui_state: "blocked",
        },
      ),
    };
  }
  const source = String(query.source ?? "").trim();
  if (source && !["manual", "outlook_addin"].includes(source)) {
    return {
      error: errorResponse(
        400,
        requestId,
        [CRM_INTAKE_API_ERROR_CODES.validation_error],
        {
          audit_hint_ref: query.audit_hint_ref,
          ui_state: "blocked",
        },
      ),
    };
  }
  const q = String(query.q ?? "").normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
  if (q.length > 120) {
    return {
      error: errorResponse(
        400,
        requestId,
        [CRM_INTAKE_API_ERROR_CODES.validation_error],
        {
          audit_hint_ref: query.audit_hint_ref,
          ui_state: "blocked",
        },
      ),
    };
  }
  return {
    limit,
    visibleStatus,
    source: source || null,
    assignedUserId: String(query.assigned_user_id ?? "").trim() || null,
    q,
  };
}

function inquiryOpportunityRecords(runtime, tenantId, leads) {
  const leadIds = new Set(leads.map(({ lead_id }) => lead_id));
  const explicitOpportunityIds = new Set(
    leads.map(({ opportunity_id }) => opportunity_id).filter(Boolean),
  );
  return runtime.crmRepository
    .list({ tenant_id: tenantId, model_type: "Opportunity" })
    .filter((opportunity) => (
      leadIds.has(opportunity.lead_id)
      || explicitOpportunityIds.has(opportunity.opportunity_id)
    ));
}

function inquiryConsultationRecords({
  runtime,
  tenantId,
  leads,
  opportunities,
  context,
}) {
  const permission = supplementalReadDecision({
    context,
    tenantId,
    resourceType: "crm_activity",
    action: "crm:consultation:read",
  });
  if (permission.effect !== "allow") {
    return Object.freeze({
      access: "denied",
      source_status: "permission_denied",
      items: Object.freeze([]),
    });
  }
  const leadIds = new Set(leads.map(({ lead_id }) => lead_id));
  const opportunityIds = new Set(
    opportunities.map(({ opportunity_id }) => opportunity_id),
  );
  const linked = runtime.crmRepository
    .list({ tenant_id: tenantId, model_type: "CRMActivity" })
    .filter((activity) => (
      leadIds.has(activity.lead_id)
      || opportunityIds.has(activity.opportunity_id)
    ));
  const { allowed, omittedCount } = trimItemsByPermission({
    context: {
      ...context,
      object_acl: context?.object_acl ?? [],
    },
    items: linked,
    action: "crm:consultation:read",
    resourceType: "crm_activity",
  });
  return Object.freeze({
    access: "allowed",
    source_status: omittedCount > 0 ? "partial" : "complete",
    items: Object.freeze(allowed),
  });
}

function inquiryProjectionSet({ runtime, tenantId, leads, context }) {
  const opportunities = inquiryOpportunityRecords(runtime, tenantId, leads);
  const consultations = inquiryConsultationRecords({
    runtime,
    tenantId,
    leads,
    opportunities,
    context,
  });
  return Object.freeze({
    consultations,
    projections: Object.freeze(leads.map((lead) => projectCrmInquiry({
      lead,
      opportunities,
      activities: consultations.items,
    }))),
  });
}

function inquirySourceStatus(consultations) {
  return Object.freeze({
    crm_leads: "complete",
    crm_opportunities: "complete",
    crm_consultations: consultations.source_status,
  });
}

function inquiryDataStatus(consultations) {
  return consultations.source_status === "complete" ? "complete" : "partial";
}

function safeInquiryEvidenceSummary(evidence) {
  const evidenceId = evidence.inquiry_email_evidence_id;
  const contentPath =
    `/api/outlook/inquiries/evidence/${encodeURIComponent(evidenceId)}/content`;
  return Object.freeze({
    inquiry_email_evidence_id: evidenceId,
    received_at: evidence.received_at,
    subject: evidence.subject ?? "",
    sender_display_name: evidence.sender?.display_name ?? null,
    capture_status: evidence.capture_status,
    display_content_path:
      evidence.display_file_object_id
        ? `${contentPath}?kind=display`
        : null,
    original_content_path:
      evidence.mime_file_object_id
        ? `${contentPath}?kind=original`
        : null,
    raw_content_included: false,
    mailbox_address_included: false,
    provider_message_identifiers_included: false,
    storage_object_identifiers_included: false,
    production_ready_claim: false,
  });
}

function inquiryEvidenceRead({ runtime, tenantId, leadId, context }) {
  if (typeof runtime.emailDmsRepository?.list !== "function") {
    return Object.freeze({
      access: "unavailable",
      source_status: "unavailable",
      items: Object.freeze([]),
      page_info: Object.freeze({
        returned_count: null,
        omitted_item_count: null,
      }),
      count_leak_prevented: true,
    });
  }
  const permission = supplementalReadDecision({
    context,
    tenantId,
    resourceType: "inquiry_email_evidence",
    action: "email_dms:inquiry_evidence:read",
  });
  if (permission.effect !== "allow") {
    return Object.freeze({
      access: "denied",
      source_status: "permission_denied",
      items: Object.freeze([]),
      page_info: Object.freeze({
        returned_count: null,
        omitted_item_count: null,
      }),
      count_leak_prevented: true,
    });
  }
  let evidence;
  try {
    evidence = runtime.emailDmsRepository.list({
      tenant_id: tenantId,
      model_type: "InquiryEmailEvidence",
      lead_id: leadId,
    });
  } catch {
    return Object.freeze({
      access: "unavailable",
      source_status: "error",
      items: Object.freeze([]),
      page_info: Object.freeze({
        returned_count: null,
        omitted_item_count: null,
      }),
      count_leak_prevented: true,
    });
  }
  const { allowed, omittedCount } = trimItemsByPermission({
    context: {
      ...context,
      object_acl: context?.object_acl ?? [],
    },
    items: evidence,
    action: "email_dms:inquiry_evidence:read",
    resourceType: "inquiry_email_evidence",
  });
  const items = Object.freeze(
    allowed
      .map(safeInquiryEvidenceSummary)
      .sort((left, right) => (
        String(right.received_at ?? "").localeCompare(
          String(left.received_at ?? ""),
        )
        || left.inquiry_email_evidence_id.localeCompare(
          right.inquiry_email_evidence_id,
        )
      )),
  );
  return Object.freeze({
    access: "allowed",
    source_status: omittedCount > 0 ? "partial" : "complete",
    items,
    page_info: Object.freeze({
      returned_count: items.length,
      omitted_item_count: null,
    }),
    count_leak_prevented: true,
  });
}

function inquiryMatchesListOptions(projection, options) {
  if (
    options.visibleStatus
    && projection.visible_status !== options.visibleStatus.code
  ) {
    return false;
  }
  if (options.source && projection.source !== options.source) return false;
  if (
    options.assignedUserId
    && projection.assigned_user_id !== options.assignedUserId
  ) {
    return false;
  }
  if (!options.q) return true;
  return [
    projection.display_name,
    projection.next_action,
  ].some((value) => (
    String(value ?? "")
      .normalize("NFKC")
      .toLocaleLowerCase("ko-KR")
      .includes(options.q)
  ));
}

export function handleCrmInquiryList({
  query,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
  policy,
} = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const options = normalizeInquiryListOptions(query, requestId);
  if (options.error) return options.error;
  const rawLeads = runtime.crmRepository.list({
    tenant_id: query.tenant_id,
    model_type: "Lead",
  });
  const { allowed: leads } = trimItemsByPermission({
    context: {
      ...context,
      object_acl: context?.object_acl ?? [],
    },
    items: rawLeads,
    action: policy.action,
    resourceType: policy.resource_type,
  });
  const projectionSet = inquiryProjectionSet({
    runtime,
    tenantId: query.tenant_id,
    leads,
    context,
  });
  const filtered = projectionSet.projections
    .filter((projection) => inquiryMatchesListOptions(projection, options))
    .map(summarizeCrmInquiry)
    .sort(compareCrmInquirySummaries);
  const items = filtered.slice(0, options.limit);
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      data_status: inquiryDataStatus(projectionSet.consultations),
      generated_at: new Date().toISOString(),
      timezone: "Asia/Seoul",
      items,
      page_info: {
        returned_count: items.length,
        omitted_item_count: null,
        limit: options.limit,
        has_more: filtered.length > options.limit,
      },
      source_status: inquirySourceStatus(projectionSet.consultations),
      permission_filter_applied: true,
      count_leak_prevented: true,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: items.length === 0 ? "empty" : null,
      production_ready_claim: false,
    },
  };
}

export function handleCrmInquiryDetail({
  inquiryId,
  query,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
  policy,
} = {}) {
  const scopedQuery = { ...query, resource_id: inquiryId };
  const gated = routeGate({
    context,
    query: scopedQuery,
    requestId,
    policy,
  });
  if (gated) return gated;
  const lead = runtime.crmRepository.get({
    tenant_id: query.tenant_id,
    model_type: "Lead",
    lead_id: inquiryId,
  });
  if (!lead) {
    return errorResponse(
      404,
      requestId,
      [CRM_INTAKE_API_ERROR_CODES.inquiry_not_found],
      {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "empty",
      },
    );
  }
  const { allowed: leads } = trimItemsByPermission({
    context: {
      ...context,
      object_acl: context?.object_acl ?? [],
    },
    items: [lead],
    action: policy.action,
    resourceType: policy.resource_type,
  });
  if (leads.length === 0) {
    return errorResponse(
      403,
      requestId,
      [CRM_INTAKE_API_ERROR_CODES.unauthorized_omission],
      {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "denied",
      },
    );
  }
  const projectionSet = inquiryProjectionSet({
    runtime,
    tenantId: query.tenant_id,
    leads,
    context,
  });
  const evidence = inquiryEvidenceRead({
    runtime,
    tenantId: query.tenant_id,
    leadId: inquiryId,
    context,
  });
  const sourceStatus = {
    ...inquirySourceStatus(projectionSet.consultations),
    email_evidence: evidence.source_status,
  };
  const item = Object.freeze({
    ...projectionSet.projections[0],
    consultations_access: projectionSet.consultations.access,
    evidence,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      data_status: Object.values(sourceStatus).every(
        (status) => status === "complete",
      ) ? "complete" : "partial",
      generated_at: new Date().toISOString(),
      timezone: "Asia/Seoul",
      item,
      source_status: Object.freeze(sourceStatus),
      permission_filter_applied: true,
      count_leak_prevented: true,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      production_ready_claim: false,
    },
  };
}

export function handleCrmLeadList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "Lead" }),
  });
}

export function handleCrmAccountList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const runtimeAccounts = runtime.crmRepository
    .list({ tenant_id: query.tenant_id, model_type: "Account" })
    .map((account) => serializeRuntimeAccount(account));
  const runtimeCanonicalAccountIds = new Set(runtimeAccounts.map((account) => account.organization_id).filter(Boolean));
  const masterDataAccounts = runtime.masterDataRepository
    .list({ tenant_id: query.tenant_id, model_type: "Organization" })
    .filter((organization) => !runtimeCanonicalAccountIds.has(organization.organization_id))
    .map((organization) => serializeAccount(organization, runtime));
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: [...runtimeAccounts, ...masterDataAccounts],
  });
}

export function handleCrmAccountCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.account?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const account = body?.account ?? {};
  const displayName = String(account.display_name ?? "").trim();
  if (displayName.length < 2 || displayName.length > 120 || account.matter_id || account.matter_ref || account.matter_create_command) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const idempotencyKey = body?.idempotency_key ?? `crm-account-create:${query.tenant_id}:${displayName}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  try {
    const createdAt = account.created_at && !Number.isNaN(Date.parse(account.created_at)) ? account.created_at : new Date().toISOString();
    const safeAccountId = String(account.account_id ?? `account_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    const result = runtime.masterDataRepository.transaction((masterTx) => {
      const canonicalWrite = createCrmCanonicalWriteService({ repository: masterTx }).writeAccount({
        tenant_id: query.tenant_id,
        account_id: safeAccountId,
        display_name: displayName,
        status: account.status,
        owner_user_id: actorId,
        permission_ref: query.permission_ref,
        audit_hint_ref: query.audit_hint_ref,
        registration_number: account.registration_number,
      });
      return runtime.crmRepository.transaction((crmTx) => {
        const persisted = crmTx.create({
          model_type: "Account",
          resource_id: safeAccountId,
          account_id: safeAccountId,
          tenant_id: query.tenant_id,
          organization_id: canonicalWrite.organization.organization_id,
          client_group_id: canonicalWrite.client_group.client_group_id,
          party_id: canonicalWrite.party.party_id,
          entity_id: canonicalWrite.entity.entity_id,
          display_name: displayName,
          status: account.status === "review_required" ? "review_required" : "active",
          owner_user_id: actorId,
          account_source: "crm-runtime.Account",
          canonical_sync_state: "synced",
          canonical_write_mounted: true,
          created_by: actorId,
          created_at: createdAt,
          registration_number_included: false,
          direct_matter_reference_included: false,
          production_ready_claim: false,
        });
        const safeItem = serializeRuntimeAccount(persisted);
        const auditEvent = crmTx.appendAudit({
          event_id: `crm.account.created:${query.tenant_id}:${safeAccountId}`,
          tenant_id: query.tenant_id,
          actor_id: actorId,
          action: "crm.account.created",
          object_type: "CRMAccount",
          object_id: safeAccountId,
          decision: "allow",
          reason: body?.reason ?? "account_created",
          occurred_at: createdAt,
          metadata: {
            permission_ref: query.permission_ref,
            canonical_write_status: canonicalWrite.canonical_write_status,
            canonical_record_types: ["Party", "Entity", "Organization", "ClientGroup"],
            registration_number_included: false,
            automatic_matter_creation: false,
          },
        });
        const response = {
          request_id: requestId,
          outcome: "created",
          item: sanitizeItem(safeItem),
          audit_event: auditEvent,
          safe_error_codes: [],
          audit_hint_ref: query.audit_hint_ref,
          idempotent_replay: false,
          state_idempotent: true,
          canonical_write_status: canonicalWrite.canonical_write_status,
          canonical_record_types: ["Party", "Entity", "Organization", "ClientGroup"],
          production_ready_claim: false,
        };
        crmTx.recordIdempotency({
          tenant_id: query.tenant_id,
          idempotency_key: idempotencyKey,
          operation: "crm_account_create",
          response,
          created_at: createdAt,
        });
        return { response };
      });
    });
    return { status: 201, body: result.response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

function normalizeCrmPatch(updates = {}) {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(updates, "display_name")) {
    const displayName = String(updates.display_name ?? "").trim();
    if (displayName.length < 2 || displayName.length > 120) return null;
    patch.display_name = displayName;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    if (!["active", "review_required", "inactive"].includes(updates.status)) return null;
    patch.status = updates.status;
  }
  if (Object.keys(patch).length === 0) return null;
  return patch;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeRawContactValue(input = {}) {
  const submitted = [
    ["email", input.email ?? input.email_value],
    ["phone", input.phone ?? input.mobile_phone],
    [input.contact_type === "phone" ? "phone" : "email", input.contact_point_value],
  ]
    .map(([type, value]) => [type, nonEmptyString(value)])
    .filter(([, value]) => value);
  if (submitted.length === 0) return Object.freeze({ hasValue: false });
  if (submitted.length > 1) return null;
  const [type, rawValue] = submitted[0];
  if (type === "email") {
    const value = rawValue.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
    return Object.freeze({ hasValue: true, contact_type: "email", contact_point_value: value, email: value, phone: null });
  }
  const value = rawValue.replace(/\s+/g, " ").trim();
  const digitCount = (value.match(/\d/g) ?? []).length;
  if (digitCount < 7 || !/^[0-9+(). -]+$/.test(value)) return null;
  return Object.freeze({ hasValue: true, contact_type: "phone", contact_point_value: value, email: null, phone: value });
}

function normalizeCrmContactPatch(updates = {}) {
  if (includesDirectMatterReference(updates)) return null;
  const patch = normalizeCrmPatch(updates) ?? {};
  const rawContactValue = normalizeRawContactValue(updates);
  if (rawContactValue === null) return null;
  if (rawContactValue.hasValue) {
    patch.primary_contact_type = rawContactValue.contact_type;
    patch.contact_point_value = rawContactValue.contact_point_value;
    patch.email = rawContactValue.email;
    patch.phone = rawContactValue.phone;
    patch.raw_contact_value_stored = true;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function updateCanonicalContactValue(runtime, existing, rawContactValue) {
  if (!rawContactValue?.hasValue) return null;
  const updated = {};
  if (existing?.person_id) {
    updated.person = runtime.masterDataRepository.update(
      { tenant_id: existing.tenant_id, model_type: "Person", id: existing.person_id },
      {
        email: rawContactValue.email,
        phone: rawContactValue.phone,
      },
    );
  }
  if (existing?.primary_contact_point_id) {
    updated.contact_point = runtime.masterDataRepository.update(
      { tenant_id: existing.tenant_id, model_type: "ContactPoint", id: existing.primary_contact_point_id },
      {
        contact_type: rawContactValue.contact_type,
        value: rawContactValue.contact_point_value,
        verification_status: "unverified",
      },
    );
  }
  return Object.freeze(updated);
}

export function handleCrmAccountPatch({ accountId, body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref, resource_id: accountId };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const updates = body?.field_updates ?? {};
  if (updates.matter_id || updates.matter_ref || updates.matter_create_command || updates.registration_number) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const patch = normalizeCrmPatch(updates);
  if (!patch) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const existing = runtime.crmRepository.get({ tenant_id: query.tenant_id, model_type: "Account", resource_id: accountId });
  if (!existing) {
    return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const idempotencyKey = body?.idempotency_key ?? `crm-account-patch:${query.tenant_id}:${accountId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  try {
    const updatedAt = new Date().toISOString();
    const persisted = runtime.crmRepository.update(
      { tenant_id: query.tenant_id, model_type: "Account", resource_id: accountId },
      {
        ...patch,
        updated_by: actorId,
        updated_at: updatedAt,
        registration_number_included: false,
        direct_matter_reference_included: false,
        production_ready_claim: false,
      },
    );
    const safeItem = serializeRuntimeAccount(persisted);
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.account.patched:${query.tenant_id}:${accountId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.account.patched",
      object_type: "CRMAccount",
      object_id: accountId,
      decision: "allow",
      reason: body?.reason ?? "account_patch",
      occurred_at: updatedAt,
      metadata: {
        permission_ref: query.permission_ref,
        patched_fields: Object.keys(patch),
        registration_number_included: false,
        automatic_matter_creation: false,
      },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      item: sanitizeItem(safeItem),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({
      tenant_id: query.tenant_id,
      idempotency_key: idempotencyKey,
      operation: "crm_account_patch",
      response,
      created_at: updatedAt,
    });
    return { status: 200, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmContactList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const includeContactValue = canReadContactValue({ context, query });
  const runtimeContacts = runtime.crmRepository
    .list({ tenant_id: query.tenant_id, model_type: "Contact" })
    .map((contact) => serializeRuntimeContact(contact, { includeContactValue }));
  const runtimeCanonicalContactIds = new Set(runtimeContacts.map((contact) => contact.person_id).filter(Boolean));
  const masterDataContacts = runtime.masterDataRepository
    .list({ tenant_id: query.tenant_id, model_type: "Person" })
    .filter((person) => !runtimeCanonicalContactIds.has(person.person_id))
    .map((person) => serializeContactForQuery(person, runtime, { includeContactValue }));
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: [...runtimeContacts, ...masterDataContacts],
  });
}

export function handleCrmContactCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.contact?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const contact = body?.contact ?? {};
  const displayName = String(contact.display_name ?? "").trim();
  const rawContactValue = normalizeRawContactValue(contact);
  if (
    displayName.length < 2 ||
    displayName.length > 120 ||
    rawContactValue === null ||
    contact.matter_id ||
    contact.matter_ref ||
    contact.matter_create_command
  ) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const safeContactId = String(contact.contact_id ?? `contact_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const accountId = typeof contact.account_id === "string" && contact.account_id.trim() !== "" ? contact.account_id.trim() : null;
  if (accountId) {
    const masterAccount = resolveAccountOrganization(runtime, query.tenant_id, accountId);
    const runtimeAccount = runtimeAccountForAccountId(runtime.crmRepository, query.tenant_id, accountId);
    if (!masterAccount && !runtimeAccount) {
      return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
    }
  }
  const contactFingerprint = String(
    contact.primary_contact_fingerprint ??
      contact.email_fingerprint ??
      contact.contact_point_fingerprint ??
      "",
  ).trim().toLowerCase();
  const idempotencyKey = body?.idempotency_key ?? `crm-contact-create:${query.tenant_id}:${safeContactId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  const duplicateContact = contactFingerprint
    ? runtime.crmRepository
      .list({ tenant_id: query.tenant_id, model_type: "Contact" })
      .find((candidate) => candidate.primary_contact_fingerprint === contactFingerprint) ?? null
    : null;
  if (duplicateContact) {
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.contact.duplicate_review_required:${query.tenant_id}:${safeContactId}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.contact.duplicate_review_required",
      object_type: "CRMContact",
      object_id: safeContactId,
      decision: "review_required",
      reason: "duplicate_contact_point_fingerprint",
      occurred_at: new Date().toISOString(),
      metadata: {
        permission_ref: query.permission_ref,
        automatic_merge_executed: false,
        contact_point_value_included: false,
      },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "review_required",
        item: sanitizeItem({
          review_required: true,
          automatic_merge_executed: false,
          duplicate_candidate_hidden: true,
          primary_contact_uniqueness_enforced: true,
          email_value_included: false,
          contact_point_value_included: false,
          direct_matter_reference_included: false,
          production_ready_claim: false,
        }),
        audit_event: auditEvent,
        safe_error_codes: [CRM_INTAKE_API_ERROR_CODES.review_required],
        audit_hint_ref: query.audit_hint_ref,
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  try {
    const createdAt = contact.created_at && !Number.isNaN(Date.parse(contact.created_at)) ? contact.created_at : new Date().toISOString();
    const accountOrganization = resolveAccountOrganization(runtime, query.tenant_id, accountId);
    const result = runtime.masterDataRepository.transaction((masterTx) => {
      const canonicalWrite = createCrmCanonicalWriteService({ repository: masterTx }).writeContact({
        tenant_id: query.tenant_id,
        contact_id: safeContactId,
        display_name: displayName,
        status: contact.status,
        owner_user_id: actorId,
        permission_ref: query.permission_ref,
        audit_hint_ref: query.audit_hint_ref,
        primary_contact_fingerprint: contactFingerprint || null,
        email: rawContactValue.hasValue ? rawContactValue.email : null,
        phone: rawContactValue.hasValue ? rawContactValue.phone : null,
        contact_type: rawContactValue.hasValue ? rawContactValue.contact_type : undefined,
        contact_point_value: rawContactValue.hasValue ? rawContactValue.contact_point_value : contactFingerprint || null,
        account_entity_id: accountOrganization?.entity_id ?? null,
        account_party_id: accountOrganization?.party_id ?? null,
      });
      return runtime.crmRepository.transaction((crmTx) => {
        const persisted = crmTx.create({
          model_type: "Contact",
          resource_id: safeContactId,
          contact_id: safeContactId,
          tenant_id: query.tenant_id,
          account_id: accountId,
          person_id: canonicalWrite.person.person_id,
          party_id: canonicalWrite.party.party_id,
          entity_id: canonicalWrite.entity.entity_id,
          primary_contact_point_id: canonicalWrite.contact_point?.contact_point_id ?? null,
          relationship_id: canonicalWrite.relationship?.relationship_id ?? null,
          display_name: displayName,
          status: contact.status === "review_required" ? "review_required" : "active",
          owner_user_id: actorId,
          contact_source: "crm-runtime.Contact",
          canonical_sync_state: "synced",
          canonical_write_mounted: true,
          primary_contact_type: canonicalWrite.contact_point?.contact_type ?? (contactFingerprint ? "email" : null),
          primary_contact_fingerprint: contactFingerprint || null,
          contact_point_value: rawContactValue.hasValue ? rawContactValue.contact_point_value : null,
          email: rawContactValue.hasValue ? rawContactValue.email : null,
          phone: rawContactValue.hasValue ? rawContactValue.phone : null,
          raw_contact_value_stored: rawContactValue.hasValue,
          created_by: actorId,
          created_at: createdAt,
          email_value_included: false,
          contact_point_value_included: false,
          direct_matter_reference_included: false,
          production_ready_claim: false,
        });
        const safeItem = serializeRuntimeContact(persisted, { includeContactValue: canReadContactValue({ context, query }) });
        const auditEvent = crmTx.appendAudit({
          event_id: `crm.contact.created:${query.tenant_id}:${safeContactId}`,
          tenant_id: query.tenant_id,
          actor_id: actorId,
          action: "crm.contact.created",
          object_type: "CRMContact",
          object_id: safeContactId,
          decision: "allow",
          reason: body?.reason ?? "contact_created",
          occurred_at: createdAt,
          metadata: {
            permission_ref: query.permission_ref,
            account_id: accountId,
            canonical_write_status: canonicalWrite.canonical_write_status,
            canonical_record_types: ["Party", "Entity", "Person", "ContactPoint", "Relationship"],
            raw_contact_value_stored: rawContactValue.hasValue,
            email_value_included: false,
            contact_point_value_included: false,
            automatic_merge_executed: false,
          },
        });
        const response = {
          request_id: requestId,
          outcome: "created",
          item: sanitizeItem(safeItem),
          audit_event: auditEvent,
          safe_error_codes: [],
          audit_hint_ref: query.audit_hint_ref,
          idempotent_replay: false,
          state_idempotent: true,
          canonical_write_status: canonicalWrite.canonical_write_status,
          canonical_record_types: ["Party", "Entity", "Person", "ContactPoint", "Relationship"],
          production_ready_claim: false,
        };
        crmTx.recordIdempotency({
          tenant_id: query.tenant_id,
          idempotency_key: idempotencyKey,
          operation: "crm_contact_create",
          response,
          created_at: createdAt,
        });
        return { response };
      });
    });
    return { status: 201, body: result.response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmContactPatch({ contactId, body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref, resource_id: contactId };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const updates = body?.field_updates ?? {};
  const patch = normalizeCrmContactPatch(updates);
  if (!patch) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const existing = runtime.crmRepository.get({ tenant_id: query.tenant_id, model_type: "Contact", resource_id: contactId });
  if (!existing) {
    return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const idempotencyKey = body?.idempotency_key ?? `crm-contact-patch:${query.tenant_id}:${contactId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  try {
    const updatedAt = new Date().toISOString();
    const rawContactValue = normalizeRawContactValue(updates);
    const canonicalUpdate = updateCanonicalContactValue(runtime, existing, rawContactValue);
    const persisted = runtime.crmRepository.update(
      { tenant_id: query.tenant_id, model_type: "Contact", resource_id: contactId },
      {
        ...patch,
        updated_by: actorId,
        updated_at: updatedAt,
        email_value_included: false,
        contact_point_value_included: false,
        direct_matter_reference_included: false,
        production_ready_claim: false,
      },
    );
    const safeItem = serializeRuntimeContact(persisted, { includeContactValue: canReadContactValue({ context, query }) });
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.contact.patched:${query.tenant_id}:${contactId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.contact.patched",
      object_type: "CRMContact",
      object_id: contactId,
      decision: "allow",
      reason: body?.reason ?? "contact_patch",
      occurred_at: updatedAt,
      metadata: {
        permission_ref: query.permission_ref,
        patched_fields: Object.keys(patch),
        canonical_contact_point_updated: Boolean(canonicalUpdate?.contact_point),
        raw_contact_value_stored: rawContactValue?.hasValue === true,
        email_value_included: false,
        contact_point_value_included: false,
        automatic_merge_executed: false,
      },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      item: sanitizeItem(safeItem),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({
      tenant_id: query.tenant_id,
      idempotency_key: idempotencyKey,
      operation: "crm_contact_patch",
      response,
      created_at: updatedAt,
    });
    return { status: 200, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmAccountContactList({
  accountId,
  query,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
  policy,
} = {}) {
  const gated = routeGate({ context, query: { ...query, resource_id: accountId }, requestId, policy });
  if (gated) return gated;
  const includeContactValue = canReadContactValue({ context, query });
  const runtimeRelationships = runtime.crmRepository
    .list({ tenant_id: query.tenant_id, model_type: "Contact" })
    .filter((contact) => contact.account_id === accountId)
    .map((contact) => serializeRuntimeAccountContact(contact, accountId, { includeContactValue }));
  const runtimeRelationshipContactIds = new Set(runtimeRelationships.map((relationship) => relationship.contact_id).filter(Boolean));
  const account = organizationForAccountId(runtime.masterDataRepository, query.tenant_id, accountId);
  if (!account) {
    return listResponse({ requestId, query, context, policy, items: runtimeRelationships });
  }
  const masterDataRelationships = runtime.masterDataServices.relationshipService
    .listForEntity({ tenant_id: query.tenant_id, entity_id: account.entity_id })
    .map((relationship) => serializeAccountContactForQuery(relationship, account, runtime, { includeContactValue }))
    .filter((relationship) => !runtimeRelationshipContactIds.has(relationship.contact_id));
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: [...runtimeRelationships, ...masterDataRelationships],
  });
}

export function handleCrmDuplicateReview({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const candidates = runtime.masterDataServices.duplicateService.findCandidates({
    tenant_id: body.tenant_id,
    display_name: body.display_name,
    identifier_type: body.identifier_type,
    identifier_value: body.identifier_value,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "review_required",
      item: {
        review_required: true,
        automatic_merge_executed: false,
        name_candidates: candidates.name_candidates.map((candidate) => serializeDuplicateCandidate(candidate, "name")),
        identifier_candidates: candidates.identifier_candidates.map((candidate) =>
          serializeDuplicateCandidate(candidate, "identifier"),
        ),
      },
      audit_event: {
        event_id: `crm.duplicate_review.requested:${body.tenant_id}:${requestId}`,
        tenant_id: body.tenant_id,
        actor_id: context?.principal?.user_id ?? null,
        action: "crm.duplicate_review.requested",
        object_type: "MasterDataDuplicateReview",
        decision: "review_required",
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleCrmDuplicateMergeProposalList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const proposals = runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "DuplicateMergeProposal" });
  return mergeProposalListResponse({ requestId, query, context, policy, items: proposals });
}

export function handleCrmDuplicateMergeProposalCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const proposalInput = body?.proposal ?? body ?? {};
  const query = {
    tenant_id: proposalInput.tenant_id ?? body?.tenant_id,
    permission_ref: proposalInput.permission_ref ?? body?.permission_ref,
    audit_hint_ref: proposalInput.audit_hint_ref ?? body?.audit_hint_ref,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const actorId = context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const displayName = String(proposalInput.display_name ?? "").trim();
  const proposalId = String(proposalInput.proposal_id ?? `dup_merge_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const idempotencyKey = proposalInput.idempotency_key ?? body?.idempotency_key ?? `crm-duplicate-merge-proposal:${query.tenant_id}:${proposalId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  try {
    const createdAt = new Date().toISOString();
    const candidates = runtime.masterDataServices.duplicateService.findCandidates({
      tenant_id: query.tenant_id,
      display_name: displayName,
      identifier_type: proposalInput.identifier_type,
      identifier_value: proposalInput.identifier_value,
    });
    const safeCandidates = uniqueMergeCandidates(candidates, displayName);
    const proposalState = mergeProposalState({ ...proposalInput, actor_id: actorId });
    const persisted = runtime.crmRepository.transaction((crmTx) => {
      const proposal = crmTx.create({
        model_type: "DuplicateMergeProposal",
        resource_id: proposalId,
        proposal_id: proposalId,
        tenant_id: query.tenant_id,
        display_name: displayName || "Duplicate merge proposal",
        proposal_state: proposalState,
        owner_decision_state: proposalState === "approved" ? "approved" : "owner_decision_required",
        source_party_id: proposalInput.source_party_id ?? null,
        target_party_id: proposalInput.target_party_id ?? null,
        owner_approval_ref: proposalInput.owner_approval_ref ?? null,
        dual_control_approver_id: proposalInput.dual_control_approver_id ?? null,
        candidate_count: safeCandidates.length,
        candidate_refs: safeCandidates.map((candidate) => ({
          model_type: candidate.model_type,
          resource_id: candidate.resource_id,
          candidate_source: candidate.candidate_source,
          candidate_score: candidate.candidate_score,
        })),
        automatic_merge_executed: false,
        candidate_values_included: false,
        contact_point_value_included: false,
        created_by: actorId,
        created_at: createdAt,
        production_ready_claim: false,
      });
      const auditEvent = crmTx.appendAudit({
        event_id: `crm.duplicate_merge.proposal.created:${query.tenant_id}:${proposalId}`,
        tenant_id: query.tenant_id,
        actor_id: actorId,
        action: "crm.duplicate_merge.proposal.created",
        object_type: "CRMDuplicateMergeProposal",
        object_id: proposalId,
        decision: proposalState === "approved" ? "allow" : "approval_required",
        reason: proposalInput.reason ?? "duplicate_merge_proposal_created",
        occurred_at: createdAt,
        metadata: {
          permission_ref: query.permission_ref,
          candidate_count: safeCandidates.length,
          automatic_merge_executed: false,
          candidate_values_included: false,
        },
      });
      const response = {
        request_id: requestId,
        outcome: "created",
        item: serializeDuplicateMergeProposal(proposal),
        audit_event: auditEvent,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        idempotent_replay: false,
        state_idempotent: true,
        merge_candidates: safeCandidates,
        production_ready_claim: false,
      };
      crmTx.recordIdempotency({
        tenant_id: query.tenant_id,
        idempotency_key: idempotencyKey,
        operation: "crm_duplicate_merge_proposal_create",
        response,
        created_at: createdAt,
      });
      return { proposal, auditEvent, response };
    });
    return { status: 201, body: persisted.response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmDuplicateMergeProposalExecute({
  proposalId,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
  policy,
} = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
    resource_id: proposalId,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const actorId = context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const idempotencyKey = body?.idempotency_key ?? `crm-duplicate-merge-proposal-execute:${query.tenant_id}:${proposalId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  const proposal = runtime.crmRepository.get({
    tenant_id: query.tenant_id,
    model_type: "DuplicateMergeProposal",
    resource_id: proposalId,
  });
  if (!proposal) {
    return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  if (
    proposal.proposal_state !== "approved" ||
    !proposal.source_party_id ||
    !proposal.target_party_id ||
    !proposal.owner_approval_ref ||
    !proposal.dual_control_approver_id
  ) {
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.duplicate_merge.proposal.execute_blocked:${query.tenant_id}:${proposalId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.duplicate_merge.proposal.execute_blocked",
      object_type: "CRMDuplicateMergeProposal",
      object_id: proposalId,
      decision: "approval_required",
      reason: "owner_approval_required",
      occurred_at: new Date().toISOString(),
      metadata: { permission_ref: query.permission_ref, automatic_merge_executed: false },
    });
    return mergeProposalItemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: "approval_required",
      item: proposal,
      auditEvent,
      safeErrorCodes: [CRM_INTAKE_API_ERROR_CODES.approval_required],
      extra: { ui_state: "approval_required" },
    });
  }
  try {
    const executedAt = new Date().toISOString();
    const result = runtime.masterDataRepository.transaction((masterTx) => {
      const source = masterTx.get({ tenant_id: query.tenant_id, model_type: "Party", id: proposal.source_party_id });
      const target = masterTx.get({ tenant_id: query.tenant_id, model_type: "Party", id: proposal.target_party_id });
      if (!source || !target) throw new ReferenceError("duplicate merge Party endpoint not found");
      masterTx.update(
        { tenant_id: query.tenant_id, model_type: "Party", id: proposal.source_party_id },
        {
          status: "archived",
          canonical_entity_id: target.canonical_entity_id ?? target.party_id,
          audit_hint_ref: `crm_duplicate_merge:${proposalId}`,
        },
      );
      return runtime.crmRepository.transaction((crmTx) => {
        const rollbackMetadataRef = `rollback:${proposalId}:${executedAt}`;
        const updated = crmTx.update(
          { tenant_id: query.tenant_id, model_type: "DuplicateMergeProposal", resource_id: proposalId },
          {
            proposal_state: "executed",
            owner_decision_state: "approved",
            automatic_merge_executed: true,
            executed_by: actorId,
            executed_at: executedAt,
            rollback_metadata_ref: rollbackMetadataRef,
            rollback_metadata: {
              operation: "party_merge_archive_source",
              source_party_id: proposal.source_party_id,
              target_party_id: proposal.target_party_id,
              previous_source_status: source.status,
            },
          },
        );
        const auditEvent = crmTx.appendAudit({
          event_id: `crm.duplicate_merge.proposal.executed:${query.tenant_id}:${proposalId}:${idempotencyKey}`,
          tenant_id: query.tenant_id,
          actor_id: actorId,
          action: "crm.duplicate_merge.proposal.executed",
          object_type: "CRMDuplicateMergeProposal",
          object_id: proposalId,
          decision: "allow",
          reason: body?.reason ?? "owner_approved_duplicate_merge_executed",
          occurred_at: executedAt,
          metadata: {
            permission_ref: query.permission_ref,
            owner_approval_ref_present: true,
            rollback_metadata_ref: rollbackMetadataRef,
            automatic_merge_executed: true,
          },
        });
        const response = {
          request_id: requestId,
          outcome: "executed",
          item: serializeDuplicateMergeProposal(updated),
          audit_event: auditEvent,
          safe_error_codes: [],
          audit_hint_ref: query.audit_hint_ref,
          idempotent_replay: false,
          state_idempotent: true,
          rollback_metadata_ref: rollbackMetadataRef,
          production_ready_claim: false,
        };
        crmTx.recordIdempotency({
          tenant_id: query.tenant_id,
          idempotency_key: idempotencyKey,
          operation: "crm_duplicate_merge_proposal_execute",
          response,
          created_at: executedAt,
        });
        return { response };
      });
    });
    return { status: 200, body: result.response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmOpportunityList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "Opportunity" }),
  });
}

export function handleCrmActivityList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return clientRecordListResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "CRMActivity" }),
    serializer: (activity) => serializeActivity(activity, runtime),
  });
}

export function handleCrmActivityCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const activity = body?.activity ?? {};
  const query = {
    tenant_id: activity.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  if (includesDirectMatterReference(activity)) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = actorIdFrom(body, context);
  if (!actorId) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const activityId = String(activity.crm_activity_id ?? `activity_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const idempotencyKey = body?.idempotency_key ?? `crm-activity-create:${query.tenant_id}:${activityId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return { status: 200, body: { ...replay.response, request_id: requestId, outcome: "idempotent_replay", idempotent_replay: true, audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  }
  try {
    const createdAt = activity.created_at && !Number.isNaN(Date.parse(activity.created_at)) ? activity.created_at : new Date().toISOString();
    const created = runtime.crmRepository.create({
      model_type: "CRMActivity",
      crm_activity_id: activityId,
      tenant_id: query.tenant_id,
      party_id: activity.party_id,
      opportunity_id: activity.opportunity_id ?? null,
      activity_type: activity.activity_type ?? "note",
      subject: String(activity.subject ?? "").trim(),
      confidential: activity.confidential === true,
      status: activity.status ?? "active",
      owner_user_id: actorId,
      permission_ref: query.permission_ref,
      audit_hint_ref: query.audit_hint_ref,
      created_by: actorId,
      created_at: createdAt,
      direct_matter_reference_included: false,
      production_ready_claim: false,
    });
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.activity.created:${query.tenant_id}:${activityId}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.activity.created",
      object_type: "CRMActivity",
      object_id: activityId,
      decision: "allow",
      reason: body?.reason ?? "activity_created",
      occurred_at: createdAt,
      metadata: { permission_ref: query.permission_ref, confidential: activity.confidential === true, direct_matter_reference_included: false },
    });
    const response = {
      request_id: requestId,
      outcome: "created",
      item: sanitizeItem(serializeActivity(created, runtime)),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey, operation: "crm_activity_create", response, created_at: createdAt });
    return { status: 201, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmActivityPatch({ activityId, body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref, resource_id: activityId };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const actorId = actorIdFrom(body, context);
  if (!actorId) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const existing = runtime.crmRepository.get({ tenant_id: query.tenant_id, model_type: "CRMActivity", resource_id: activityId });
  if (!existing) return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  if (existing.activity_kind === "consultation") {
    if (includesDirectMatterReference(body?.field_updates)) {
      return errorResponse(
        400,
        requestId,
        [CRM_INTAKE_API_ERROR_CODES.validation_error],
        { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" },
      );
    }
    try {
      const result = updateCrmConsultation({
        repository: runtime.crmRepository,
        tenant_id: query.tenant_id,
        activity_id: activityId,
        expected_version: body?.expected_version,
        field_updates: body?.field_updates,
        reason: body?.reason,
        actor_id: actorId,
        idempotency_key: body?.idempotency_key,
        permission_ref: query.permission_ref,
      });
      return itemResponse({
        requestId,
        auditHintRef: query.audit_hint_ref,
        outcome: result.idempotent_replay
          ? "idempotent_replay"
          : result.outcome,
        item: serializeActivity(result.activity, runtime),
        auditEvent: result.audit_event,
        status: 200,
        extra: {
          idempotent_replay: result.idempotent_replay,
          inquiry: result.lead
            ? {
                lead_id: result.lead.lead_id,
                next_action: result.lead.next_action,
                version: result.lead.version,
              }
            : null,
        },
      });
    } catch (error) {
      return errorResponse(
        Number.isInteger(error?.status) ? error.status : 400,
        requestId,
        [
          error?.safe_error_code
          ?? CRM_INTAKE_API_ERROR_CODES.validation_error,
        ],
        {
          audit_hint_ref: query.audit_hint_ref,
          ui_state: error?.status === 404 ? "empty" : "blocked",
        },
      );
    }
  }
  const patch = normalizeActivityPatch(body?.field_updates ?? {});
  if (!patch) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const idempotencyKey = body?.idempotency_key ?? `crm-activity-patch:${query.tenant_id}:${activityId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return { status: 200, body: { ...replay.response, request_id: requestId, outcome: "idempotent_replay", idempotent_replay: true, audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  }
  try {
    const updatedAt = new Date().toISOString();
    const updated = runtime.crmRepository.update(
      { tenant_id: query.tenant_id, model_type: "CRMActivity", resource_id: activityId },
      { ...patch, updated_by: actorId, updated_at: updatedAt, direct_matter_reference_included: false, production_ready_claim: false },
    );
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.activity.patched:${query.tenant_id}:${activityId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.activity.patched",
      object_type: "CRMActivity",
      object_id: activityId,
      decision: "allow",
      reason: body?.reason ?? "activity_patch",
      occurred_at: updatedAt,
      metadata: { permission_ref: query.permission_ref, patched_fields: Object.keys(patch), direct_matter_reference_included: false },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      item: sanitizeItem(serializeActivity(updated, runtime)),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey, operation: "crm_activity_patch", response, created_at: updatedAt });
    return { status: 200, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmProposalList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return clientRecordListResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "Proposal" }),
    serializer: serializeProposal,
  });
}

export function handleCrmProposalCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const proposal = body?.proposal ?? {};
  const query = {
    tenant_id: proposal.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  if (includesDirectMatterReference(proposal)) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = actorIdFrom(body, context);
  if (!actorId) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const proposalId = String(proposal.proposal_id ?? `proposal_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const idempotencyKey = body?.idempotency_key ?? `crm-proposal-create:${query.tenant_id}:${proposalId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return { status: 200, body: { ...replay.response, request_id: requestId, outcome: "idempotent_replay", idempotent_replay: true, audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  }
  try {
    const createdAt = proposal.created_at && !Number.isNaN(Date.parse(proposal.created_at)) ? proposal.created_at : new Date().toISOString();
    const created = runtime.crmRepository.create({
      model_type: "Proposal",
      proposal_id: proposalId,
      tenant_id: query.tenant_id,
      opportunity_id: proposal.opportunity_id,
      party_id: proposal.party_id,
      fee_estimate_ref: proposal.fee_estimate_ref ?? `fee_estimate:${proposalId}`,
      display_name: String(proposal.display_name ?? "").trim(),
      status: proposal.status ?? "draft",
      proposal_status: proposal.proposal_status ?? "draft",
      approval_state: proposal.approval_state ?? "review_required",
      vault_document_ref: proposal.vault_document_ref ?? null,
      e_sign_provider_status: "blocked_until_provider_receipt",
      owner_user_id: actorId,
      permission_ref: query.permission_ref,
      audit_hint_ref: query.audit_hint_ref,
      created_by: actorId,
      created_at: createdAt,
      direct_matter_reference_included: false,
      production_ready_claim: false,
    });
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.proposal.created:${query.tenant_id}:${proposalId}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.proposal.created",
      object_type: "CRMProposal",
      object_id: proposalId,
      decision: "allow",
      reason: body?.reason ?? "proposal_created",
      occurred_at: createdAt,
      metadata: { permission_ref: query.permission_ref, vault_document_ref_present: Boolean(proposal.vault_document_ref), e_sign_send_enabled: false },
    });
    const response = {
      request_id: requestId,
      outcome: "created",
      item: sanitizeItem(serializeProposal(created)),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey, operation: "crm_proposal_create", response, created_at: createdAt });
    return { status: 201, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmProposalPatch({ proposalId, body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref, resource_id: proposalId };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const patch = normalizeProposalPatch(body?.field_updates ?? {});
  if (!patch) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = actorIdFrom(body, context);
  if (!actorId) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const existing = runtime.crmRepository.get({ tenant_id: query.tenant_id, model_type: "Proposal", resource_id: proposalId });
  if (!existing) return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  const idempotencyKey = body?.idempotency_key ?? `crm-proposal-patch:${query.tenant_id}:${proposalId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return { status: 200, body: { ...replay.response, request_id: requestId, outcome: "idempotent_replay", idempotent_replay: true, audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  }
  if (patch.provider_blocked) {
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.proposal.esign_send_blocked:${query.tenant_id}:${proposalId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.proposal.esign_send_blocked",
      object_type: "CRMProposal",
      object_id: proposalId,
      decision: "approval_required",
      reason: "esign_provider_receipt_required",
      occurred_at: new Date().toISOString(),
      metadata: { permission_ref: query.permission_ref, provider_receipt_present: false, e_sign_send_enabled: false },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "provider_blocked",
        item: sanitizeItem(serializeProposal(existing)),
        audit_event: auditEvent,
        safe_error_codes: [CRM_INTAKE_API_ERROR_CODES.approval_required],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "provider_blocked",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  try {
    const updatedAt = new Date().toISOString();
    const updated = runtime.crmRepository.update(
      { tenant_id: query.tenant_id, model_type: "Proposal", resource_id: proposalId },
      { ...patch, updated_by: actorId, updated_at: updatedAt, e_sign_provider_status: "blocked_until_provider_receipt", direct_matter_reference_included: false, production_ready_claim: false },
    );
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.proposal.patched:${query.tenant_id}:${proposalId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.proposal.patched",
      object_type: "CRMProposal",
      object_id: proposalId,
      decision: "allow",
      reason: body?.reason ?? "proposal_patch",
      occurred_at: updatedAt,
      metadata: { permission_ref: query.permission_ref, patched_fields: Object.keys(patch), e_sign_send_enabled: false },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      item: sanitizeItem(serializeProposal(updated)),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey, operation: "crm_proposal_patch", response, created_at: updatedAt });
    return { status: 200, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmClientSettingsList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return clientRecordListResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "ClientPolicy" }),
    serializer: serializeClientPolicy,
  });
}

export function handleCrmClientSettingPatch({ policyId, body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref, resource_id: policyId };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  const actorId = actorIdFrom(body, context);
  if (!actorId) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const existing = runtime.crmRepository.get({ tenant_id: query.tenant_id, model_type: "ClientPolicy", resource_id: policyId });
  if (!existing) return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  if (!hasClientPolicyAdminRole(context)) {
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.client_policy.patch_blocked:${query.tenant_id}:${policyId}:${requestId}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.client_policy.patch_blocked",
      object_type: "CRMClientPolicy",
      object_id: policyId,
      decision: "approval_required",
      reason: "client_policy_admin_role_required",
      occurred_at: new Date().toISOString(),
      metadata: { permission_ref: query.permission_ref, required_roles: ["crm_intake_admin", "matter_vault_admin"] },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "approval_required",
        item: sanitizeItem(serializeClientPolicy(existing)),
        audit_event: auditEvent,
        safe_error_codes: [CRM_INTAKE_API_ERROR_CODES.approval_required],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "approval_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  const updates = body?.field_updates ?? {};
  if (includesDirectMatterReference(updates)) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(updates, "duplicate_review_required")) {
    patch.duplicate_review_required = updates.duplicate_review_required === true;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    if (!["active", "review_required", "archived"].includes(updates.status)) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
    patch.status = updates.status;
  }
  if (Object.keys(patch).length === 0) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const idempotencyKey = body?.idempotency_key ?? `crm-client-policy-patch:${query.tenant_id}:${policyId}`;
  const replay = runtime.crmRepository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return { status: 200, body: { ...replay.response, request_id: requestId, outcome: "idempotent_replay", idempotent_replay: true, audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  }
  try {
    const updatedAt = new Date().toISOString();
    const updated = runtime.crmRepository.update(
      { tenant_id: query.tenant_id, model_type: "ClientPolicy", resource_id: policyId },
      { ...patch, updated_by: actorId, updated_at: updatedAt, production_ready_claim: false },
    );
    const auditEvent = runtime.crmRepository.appendAudit({
      event_id: `crm.client_policy.patched:${query.tenant_id}:${policyId}:${idempotencyKey}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "crm.client_policy.patched",
      object_type: "CRMClientPolicy",
      object_id: policyId,
      decision: "allow",
      reason: body?.reason ?? "client_policy_patch",
      occurred_at: updatedAt,
      metadata: { permission_ref: query.permission_ref, patched_fields: Object.keys(patch), owner_admin_scope: true },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      item: sanitizeItem(serializeClientPolicy(updated)),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.crmRepository.recordIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey, operation: "crm_client_policy_patch", response, created_at: updatedAt });
    return { status: 200, body: response };
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleIntakeRequestList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.intakeRepository.list({ tenant_id: query.tenant_id, model_type: "IntakeRequest" }),
  });
}

export function handleClearanceTokenList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.intakeRepository.list({ tenant_id: query.tenant_id, model_type: "ClearanceToken" }),
  });
}

export function handleCrmLeadCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.lead?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createLead({
      repository: runtime.crmRepository,
      lead: body.lead,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.lead,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmInquiryTransition({
  inquiryId,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
  policy,
} = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
    resource_id: inquiryId,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = transitionLeadInquiryStatus({
      repository: runtime.crmRepository,
      tenant_id: query.tenant_id,
      lead_id: inquiryId,
      next_inquiry_status: body?.next_inquiry_status,
      expected_version: body?.expected_version,
      next_action: body?.next_action,
      reason: body?.reason,
      actor_id: context.principal.user_id,
      idempotency_key: body?.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
      item: result.lead,
      auditEvent: result.audit_event,
      status: 200,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch (error) {
    return errorResponse(
      Number.isInteger(error?.status) ? error.status : 400,
      requestId,
      [error?.safe_error_code ?? CRM_INTAKE_API_ERROR_CODES.validation_error],
      {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: error?.status === 404 ? "empty" : "blocked",
      },
    );
  }
}

export function handleCrmConsultationCreate({
  inquiryId,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
  policy,
} = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
    resource_id: inquiryId,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  if (includesDirectMatterReference(body?.consultation)) {
    return errorResponse(
      400,
      requestId,
      [CRM_INTAKE_API_ERROR_CODES.validation_error],
      { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" },
    );
  }
  try {
    const result = scheduleCrmConsultation({
      repository: runtime.crmRepository,
      tenant_id: query.tenant_id,
      lead_id: inquiryId,
      consultation: body?.consultation,
      expected_inquiry_version: body?.expected_inquiry_version,
      reason: body?.reason,
      actor_id: context.principal.user_id,
      idempotency_key: body?.idempotency_key,
      permission_ref: query.permission_ref,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay
        ? "idempotent_replay"
        : result.outcome,
      item: serializeActivity(result.activity, runtime),
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        idempotent_replay: result.idempotent_replay,
        inquiry: {
          lead_id: result.lead.lead_id,
          next_action: result.lead.next_action,
          version: result.lead.version,
        },
      },
    });
  } catch (error) {
    return errorResponse(
      Number.isInteger(error?.status) ? error.status : 400,
      requestId,
      [error?.safe_error_code ?? CRM_INTAKE_API_ERROR_CODES.validation_error],
      {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: error?.status === 404 ? "empty" : "blocked",
      },
    );
  }
}

export function handleCrmOpportunityCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.opportunity?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createOpportunity({
      repository: runtime.crmRepository,
      opportunity: body.opportunity,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.opportunity,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleOpportunityHandoff({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy, opportunityId } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = handoffOpportunityToIntake({
      crmRepository: runtime.crmRepository,
      intakeService: runtime.intakeService,
      tenant_id: body.tenant_id,
      opportunity_id: opportunityId,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
      intake_request_id: body.intake_request_id,
      requested_scope_summary: body.requested_scope_summary,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.intake_request,
      auditEvent: result.audit_events[1],
      status: result.idempotent_replay ? 200 : 201,
      extra: { opportunity: sanitizeItem(result.opportunity), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleIntakeRequestCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.request?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createIntakeRequest({
      repository: runtime.intakeRepository,
      request: body.request,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.intake_request,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleConflictCheckCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = {
    tenant_id: body?.conflict_check?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createConflictCheck({
      repository: runtime.intakeRepository,
      conflict_check: body.conflict_check,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const searchResult = executeConflictSearch({
      repository: runtime.intakeRepository,
      search: conflictCheckSearchPayload({
        conflictCheck: result.conflict_check,
        body,
        auditHintRef: query.audit_hint_ref,
      }),
      actor_id: context.principal.user_id,
      idempotency_key: body.conflict_search?.idempotency_key ?? `${body.idempotency_key}:search`,
      masterDataRepository: runtime.masterDataRepository,
      matterRepository: runtime.matterRepository,
    });
    const updatedConflictCheck =
      runtime.intakeRepository.get({
        tenant_id: result.conflict_check.tenant_id,
        model_type: "ConflictCheck",
        conflict_check_id: result.conflict_check.conflict_check_id,
      }) ?? result.conflict_check;
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: updatedConflictCheck,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        conflict_search: sanitizeItem(searchResult.conflict_search),
        conflict_hits: searchResult.conflict_hits.map(sanitizeItem),
        hit_count: searchResult.conflict_search.hit_count,
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleConflictDecisionRecord({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const decision = conflictDecisionPayload({ body, context });
  const query = { tenant_id: decision.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = decideConflict({
      repository: runtime.intakeRepository,
      decision,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const updatedConflictCheck = runtime.intakeRepository.get({
      tenant_id: decision.tenant_id,
      model_type: "ConflictCheck",
      conflict_check_id: decision.conflict_check_id,
    });
    const conflictHits = runtime.intakeRepository.list({
      tenant_id: decision.tenant_id,
      model_type: "ConflictHit",
      conflict_check_id: decision.conflict_check_id,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.conflict_decision,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        conflict_decision: sanitizeItem(result.conflict_decision),
        conflict_check: sanitizeItem(updatedConflictCheck),
        conflict_hits: conflictHits.map(sanitizeItem),
        clearance_link_ready: result.conflict_decision.decision === "clear",
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleWaiverApprove({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const waiver = waiverPayload({ body, context });
  const query = { tenant_id: waiver.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = approveWaiver({
      repository: runtime.intakeRepository,
      waiver,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const updatedConflictCheck = runtime.intakeRepository.get({
      tenant_id: waiver.tenant_id,
      model_type: "ConflictCheck",
      conflict_check_id: waiver.conflict_check_id,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "approved",
      item: result.waiver,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        waiver: sanitizeItem(result.waiver),
        conflict_check: sanitizeItem(updatedConflictCheck),
        clearance_link_ready: result.clearance_link_ready === true,
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleEngagementApprove({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const engagement = engagementPayload({ body, context });
  const query = { tenant_id: engagement.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = approveEngagement({
      repository: runtime.intakeRepository,
      engagement,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
      dms_repository: runtime.dmsRuntime?.repository,
      dms_storage: runtime.dmsRuntime?.storage,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "approved",
      item: result.engagement,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        engagement: sanitizeItem(result.engagement),
        template_document: sanitizeItem(result.template_document),
        signed_document_upload: sanitizeItem(result.signed_document_upload),
        engagement_ready:
          result.engagement.status === "approved" &&
          Boolean(result.engagement.signed_document_id) &&
          result.engagement.signed_upload_verified === true,
        template_document_id: result.template_document?.template_document_id ?? result.engagement.template_document_id,
        signed_document_id: result.engagement.signed_document_id,
        signed_document_upload_id: result.signed_document_upload?.signed_document_upload_id ?? result.engagement.signed_document_upload_id,
        signed_upload_verified: result.engagement.signed_upload_verified === true,
        template_audit_event: result.template_audit_event,
        signed_upload_audit_event: result.signed_upload_audit_event,
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleClearanceTokenIssue({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.token?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = issueClearanceToken({
      repository: runtime.intakeRepository,
      token: clearanceTokenPayload({ body }),
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const validation = validateClearanceToken(result.clearance_token);
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.clearance_token,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        validation,
        conflict_review: result.conflict_review,
        engagement_review: result.engagement_review,
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleIntakeAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.intakeRepository.listAudit({ tenant_id: query.tenant_id }),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleCrmIntakeApiRequest({
  pathname,
  method,
  query,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  const policy = matchCrmIntakeRoute({ pathname, method });
  if (!policy) return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
  if (pathname === "/api/crm/leads" && method === "GET") return handleCrmLeadList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/leads" && method === "POST") return handleCrmLeadCreate({ body, context, requestId, runtime, policy });
  if (pathname === "/api/crm/inquiries" && method === "GET") {
    return handleCrmInquiryList({
      query,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (policy.action === "crm:inquiry:read" && policy.params?.[0] && method === "GET") {
    return handleCrmInquiryDetail({
      inquiryId: decodeURIComponent(policy.params[0]),
      query,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (policy.action === "crm:inquiry:update" && policy.params?.[0] && method === "POST") {
    return handleCrmInquiryTransition({
      inquiryId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (policy.action === "crm:consultation:create" && policy.params?.[0] && method === "POST") {
    return handleCrmConsultationCreate({
      inquiryId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/activities" && method === "GET") return handleCrmActivityList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/activities" && method === "POST") return handleCrmActivityCreate({ body, context, requestId, runtime, policy });
  if (policy.action === "crm:activity:patch" && policy.params?.[0] && method === "PATCH") {
    return handleCrmActivityPatch({
      activityId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/proposals" && method === "GET") return handleCrmProposalList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/proposals" && method === "POST") return handleCrmProposalCreate({ body, context, requestId, runtime, policy });
  if (policy.action === "crm:proposal:patch" && policy.params?.[0] && method === "PATCH") {
    return handleCrmProposalPatch({
      proposalId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/accounts" && method === "GET") return handleCrmAccountList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/accounts" && method === "POST") return handleCrmAccountCreate({ body, context, requestId, runtime, policy });
  if (policy.action === "crm:account:patch" && policy.params?.[0] && method === "PATCH") {
    return handleCrmAccountPatch({
      accountId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/client-settings" && method === "GET") return handleCrmClientSettingsList({ query, context, requestId, runtime, policy });
  if (policy.action === "crm:client_settings:patch" && policy.params?.[0] && method === "PATCH") {
    return handleCrmClientSettingPatch({
      policyId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/contacts" && method === "GET") return handleCrmContactList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/contacts" && method === "POST") return handleCrmContactCreate({ body, context, requestId, runtime, policy });
  if (policy.action === "crm:contact:patch" && policy.params?.[0] && method === "PATCH") {
    return handleCrmContactPatch({
      contactId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (policy.action === "crm:account_contact:read" && method === "GET") {
    return handleCrmAccountContactList({
      accountId: decodeURIComponent(policy.params[0]),
      query,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/duplicate-reviews" && method === "POST") {
    return handleCrmDuplicateReview({ body, context, requestId, runtime, policy });
  }
  if (pathname === "/api/crm/duplicate-merge-proposals" && method === "GET") {
    return handleCrmDuplicateMergeProposalList({ query, context, requestId, runtime, policy });
  }
  if (pathname === "/api/crm/duplicate-merge-proposals" && method === "POST") {
    return handleCrmDuplicateMergeProposalCreate({ body, context, requestId, runtime, policy });
  }
  if (policy.action === "crm:duplicate_merge_proposal:execute" && policy.params?.[0] && method === "POST") {
    return handleCrmDuplicateMergeProposalExecute({
      proposalId: decodeURIComponent(policy.params[0]),
      body,
      context,
      requestId,
      runtime,
      policy,
    });
  }
  if (pathname === "/api/crm/opportunities" && method === "GET") return handleCrmOpportunityList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/opportunities" && method === "POST") return handleCrmOpportunityCreate({ body, context, requestId, runtime, policy });
  if (policy.action === "crm:opportunity:intake_handoff" && policy.params?.[0] && method === "POST") {
    return handleOpportunityHandoff({
      body,
      context,
      requestId,
      runtime,
      policy,
      opportunityId: decodeURIComponent(policy.params[0]),
    });
  }
  if (pathname === "/api/intake/requests" && method === "GET") return handleIntakeRequestList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/intake/requests" && method === "POST") return handleIntakeRequestCreate({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/conflict-checks" && method === "POST") return handleConflictCheckCreate({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/conflict-decisions" && method === "POST") return handleConflictDecisionRecord({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/waivers" && method === "POST") return handleWaiverApprove({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/engagements" && method === "POST") return handleEngagementApprove({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/clearance-tokens" && method === "GET") return handleClearanceTokenList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/intake/clearance-tokens" && method === "POST") return handleClearanceTokenIssue({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/audit" && method === "GET") return handleIntakeAudit({ query, context, requestId, runtime, policy });
  return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
