import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createLead } from "../../../packages/crm/src/lead-service.js";
import { createOpportunity } from "../../../packages/crm/src/opportunity-service.js";
import { handoffOpportunityToIntake } from "../../../packages/crm/src/intake-handoff-service.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { createIntakeRequest } from "../../../packages/intake/src/intake-request-service.js";
import { createConflictCheck } from "../../../packages/intake/src/conflict-check-service.js";
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
    "GET /api/crm/opportunities",
    "POST /api/crm/opportunities",
    "GET /api/crm/accounts",
    "POST /api/crm/accounts",
    "PATCH /api/crm/accounts/:id",
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
} = {}) {
  seedMasterDataRepository(masterDataRepository, CRM_MASTER_DATA_SEED);
  return Object.freeze({
    crmRepository,
    intakeRepository,
    masterDataRepository,
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

function routeGate({ context, query, requestId, policy }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: policy.resource_type,
      resource_id: query.resource_id ?? null,
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
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function serializeRuntimeContact(contact) {
  return Object.freeze({
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
    primary_contact_type: contact.primary_contact_type ?? null,
    primary_contact_verified: false,
    email_value_included: false,
    contact_point_value_included: false,
    duplicate_review_required: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
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
  return Object.freeze({
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
    contact_point_value_included: false,
    relationship_endpoint_hidden: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function serializeRuntimeAccountContact(contact, accountId) {
  return Object.freeze({
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
    contact_point_value_included: false,
    relationship_endpoint_hidden: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
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
  const actorId = body?.actor_id ?? context?.principal?.user_id;
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
  const actorId = body?.actor_id ?? context?.principal?.user_id;
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
  const runtimeContacts = runtime.crmRepository
    .list({ tenant_id: query.tenant_id, model_type: "Contact" })
    .map((contact) => serializeRuntimeContact(contact));
  const runtimeCanonicalContactIds = new Set(runtimeContacts.map((contact) => contact.person_id).filter(Boolean));
  const masterDataContacts = runtime.masterDataRepository
    .list({ tenant_id: query.tenant_id, model_type: "Person" })
    .filter((person) => !runtimeCanonicalContactIds.has(person.person_id))
    .map((person) => serializeContact(person, runtime));
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
  const rawContactValueSubmitted =
    contact.email ||
    contact.email_value ||
    contact.contact_point_value ||
    contact.phone ||
    contact.mobile_phone;
  if (
    displayName.length < 2 ||
    displayName.length > 120 ||
    rawContactValueSubmitted ||
    contact.matter_id ||
    contact.matter_ref ||
    contact.matter_create_command
  ) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = body?.actor_id ?? context?.principal?.user_id;
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
          created_by: actorId,
          created_at: createdAt,
          email_value_included: false,
          contact_point_value_included: false,
          direct_matter_reference_included: false,
          production_ready_claim: false,
        });
        const safeItem = serializeRuntimeContact(persisted);
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
  if (
    updates.email ||
    updates.email_value ||
    updates.contact_point_value ||
    updates.phone ||
    updates.mobile_phone ||
    updates.matter_id ||
    updates.matter_ref ||
    updates.matter_create_command
  ) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const patch = normalizeCrmPatch(updates);
  if (!patch) {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const actorId = body?.actor_id ?? context?.principal?.user_id;
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
    const safeItem = serializeRuntimeContact(persisted);
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
  const runtimeRelationships = runtime.crmRepository
    .list({ tenant_id: query.tenant_id, model_type: "Contact" })
    .filter((contact) => contact.account_id === accountId)
    .map((contact) => serializeRuntimeAccountContact(contact, accountId));
  const runtimeRelationshipContactIds = new Set(runtimeRelationships.map((relationship) => relationship.contact_id).filter(Boolean));
  const account = organizationForAccountId(runtime.masterDataRepository, query.tenant_id, accountId);
  if (!account) {
    return listResponse({ requestId, query, context, policy, items: runtimeRelationships });
  }
  const masterDataRelationships = runtime.masterDataServices.relationshipService
    .listForEntity({ tenant_id: query.tenant_id, entity_id: account.entity_id })
    .map((relationship) => serializeAccountContact(relationship, account, runtime))
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
        actor_id: body.actor_id ?? context?.principal?.user_id ?? null,
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
  const actorId = proposalInput.actor_id ?? body?.actor_id ?? context?.principal?.user_id;
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
  const actorId = body?.actor_id ?? context?.principal?.user_id;
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

export function handleCrmLeadCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.lead?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createLead({
      repository: runtime.crmRepository,
      lead: body.lead,
      actor_id: body.actor_id ?? context.principal.user_id,
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

export function handleCrmOpportunityCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.opportunity?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createOpportunity({
      repository: runtime.crmRepository,
      opportunity: body.opportunity,
      actor_id: body.actor_id ?? context.principal.user_id,
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
      actor_id: body.actor_id ?? context.principal.user_id,
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
      actor_id: body.actor_id ?? context.principal.user_id,
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
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.conflict_check,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
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
      token: body.token,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const validation = validateClearanceToken(result.clearance_token, { now: body.now });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.clearance_token,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { validation, idempotent_replay: result.idempotent_replay },
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
  if (pathname === "/api/intake/clearance-tokens" && method === "POST") return handleClearanceTokenIssue({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/audit" && method === "GET") return handleIntakeAudit({ query, context, requestId, runtime, policy });
  return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
