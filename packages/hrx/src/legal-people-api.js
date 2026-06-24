import {
  createLegalPeopleRelationshipRepository,
  createLegalPeopleRelationshipSeed,
  LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY,
} from "./legal-people-relationship-ledger.js";

const PRIVILEGED_ROLE_IDS = Object.freeze([
  "security_admin",
  "legal_ops",
  "conflicts_reviewer",
  "matter_admin",
  "responsible_attorney",
]);

const RESTRICTED_RELATIONSHIP_MARKERS = Object.freeze([
  "restricted",
  "external",
  "expert",
  "tribunal",
  "regulator",
  "client_contact",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).trim();
}

function roleIdsFrom(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasPrivilegedRole(roleIds) {
  return roleIds.some((roleId) => PRIVILEGED_ROLE_IDS.includes(roleId));
}

function includesText(value, query) {
  return String(value ?? "").toLowerCase().includes(query);
}

function byDisplayName(left, right) {
  return left.display_name.localeCompare(right.display_name) || left.person_id.localeCompare(right.person_id);
}

function keyById(rows, field) {
  return new Map(rows.map((row) => [row[field], row]));
}

function isRestrictedRelationship(relationship) {
  if (relationship.review_required) return true;
  const scope = String(relationship.permission_scope ?? "").toLowerCase();
  return RESTRICTED_RELATIONSHIP_MARKERS.some((marker) => scope.includes(marker));
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function groupRelationships(relationships) {
  return Object.freeze(
    relationships.reduce((acc, relationship) => {
      const key = relationship.relationship_type;
      acc[key] = Object.freeze([...(acc[key] ?? []), relationship]);
      return acc;
    }, {}),
  );
}

function findPrimaryOrganization(person, organizationsById) {
  return person.organization_id ? organizationsById.get(person.organization_id) ?? null : null;
}

function tenantRows(rows, tenantId) {
  return rows.filter((row) => row.tenant_id === tenantId);
}

function createPerson(input = {}) {
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.person_read_model.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    person_id: requiredString(input, "person_id"),
    display_name: requiredString(input, "display_name"),
    type_id: requiredString(input, "type_id"),
    korean_label: requiredString(input, "korean_label"),
    actor_category: requiredString(input, "actor_category"),
    status: input.status ?? "active",
    organization_id: optionalString(input, "organization_id"),
    primary_role: optionalString(input, "primary_role"),
    related_client_ids: Object.freeze([...(input.related_client_ids ?? [])]),
    related_matter_ids: Object.freeze([...(input.related_matter_ids ?? [])]),
    sensitive_fields: Object.freeze([...(input.sensitive_fields ?? [])]),
    sensitive_refs: Object.freeze({ ...(input.sensitive_refs ?? {}) }),
    created_at: input.created_at ?? "2026-06-24T00:00:00.000Z",
    updated_at: input.updated_at ?? "2026-06-24T00:00:00.000Z",
    audit_ref: input.audit_ref ?? `audit_${input.person_id}`,
  });
}

function createOrganization(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    organization_id: requiredString(input, "organization_id"),
    display_label: requiredString(input, "display_label"),
    organization_type: requiredString(input, "organization_type"),
    status: input.status ?? "active",
  });
}

function createClientRef(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    client_id: requiredString(input, "client_id"),
    display_label: requiredString(input, "display_label"),
    status: input.status ?? "active",
  });
}

function createMatterRef(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    matter_id: requiredString(input, "matter_id"),
    display_label: requiredString(input, "display_label"),
    status: input.status ?? "active",
  });
}

function visiblePerson(person, organizationsById, permissionContext) {
  const organization = findPrimaryOrganization(person, organizationsById);
  const base = {
    schema_version: person.schema_version,
    tenant_id: person.tenant_id,
    person_id: person.person_id,
    display_name: person.display_name,
    type_id: person.type_id,
    korean_label: person.korean_label,
    actor_category: person.actor_category,
    status: person.status,
    organization_id: person.organization_id,
    organization_label: organization?.display_label ?? null,
    primary_role: person.primary_role,
    related_client_ids: person.related_client_ids,
    related_matter_ids: person.related_matter_ids,
    created_at: person.created_at,
    updated_at: person.updated_at,
    audit_ref: person.audit_ref,
    permission_summary: {
      sensitive_fields_visible: permissionContext.can_view_sensitive_relationship_details,
      redacted_sensitive_fields: permissionContext.can_view_sensitive_relationship_details ? [] : person.sensitive_fields,
      raw_contact_values_included: false,
      provider_payload_included: false,
      ai_final_decision_allowed: false,
    },
  };
  if (permissionContext.can_view_sensitive_relationship_details) {
    base.sensitive_refs = clone(person.sensitive_refs);
  }
  return Object.freeze(base);
}

function visibleRelationship(relationship, permissionContext) {
  const restricted = isRestrictedRelationship(relationship);
  const canView = !restricted || permissionContext.can_view_sensitive_relationship_details;
  return Object.freeze({
    schema_version: relationship.schema_version,
    tenant_id: relationship.tenant_id,
    relationship_id: relationship.relationship_id,
    subject_person_id: relationship.subject_person_id,
    target_type: relationship.target_type,
    target_id: canView ? relationship.target_id : null,
    relationship_type: relationship.relationship_type,
    relationship_direction: relationship.relationship_direction,
    status: relationship.status,
    effective_from: canView ? relationship.effective_from : null,
    effective_to: canView ? relationship.effective_to : null,
    source_refs: canView ? relationship.source_refs : [],
    permission_scope: canView ? relationship.permission_scope : "restricted_reference",
    review_required: relationship.review_required,
    audit_ref: canView ? relationship.audit_ref : null,
    access_state: canView ? "visible" : "restricted",
    redacted_fields: canView ? [] : ["target_id", "source_refs", "audit_ref", "effective_dates"],
    raw_contact_values_included: false,
    provider_payload_included: false,
    ai_final_decision_allowed: false,
  });
}

function visibleConflictReference(reference, permissionContext) {
  const canView = permissionContext.can_view_sensitive_relationship_details;
  return Object.freeze({
    schema_version: reference.schema_version,
    tenant_id: reference.tenant_id,
    conflict_ref_id: reference.conflict_ref_id,
    subject_person_id: reference.subject_person_id,
    related_ref: canView ? reference.related_ref : null,
    conflict_basis: canView ? reference.conflict_basis : "restricted",
    status: reference.status,
    reviewer_required: true,
    final_decision: false,
    ai_final_decision_allowed: false,
    audit_ref: canView ? reference.audit_ref : null,
    access_state: canView ? "visible" : "restricted",
  });
}

function visibleEthicalWallReference(reference, permissionContext) {
  const canView = permissionContext.can_view_sensitive_relationship_details;
  return Object.freeze({
    schema_version: reference.schema_version,
    tenant_id: reference.tenant_id,
    wall_ref_id: reference.wall_ref_id,
    subject_person_id: reference.subject_person_id,
    matter_id: canView ? reference.matter_id : null,
    wall_status: reference.wall_status,
    access_effect: reference.access_effect,
    reviewer_required: true,
    final_decision: false,
    ai_final_decision_allowed: false,
    audit_ref: canView ? reference.audit_ref : null,
    access_state: canView ? "visible" : "restricted",
  });
}

function relatedRefs(ids, refsById, field) {
  return Object.freeze(ids.map((id) => refsById.get(id)).filter(Boolean).map((row) => Object.freeze(clone(row))));
}

export function createLegalPeopleApiSeed(tenantId = "tenant_lcx_ppl") {
  return Object.freeze({
    people: Object.freeze([
      createPerson({
        tenant_id: tenantId,
        person_id: "person_internal_lawyer_001",
        display_name: "Ari Kim",
        type_id: "internal_lawyer",
        korean_label: "내부 변호사",
        actor_category: "internal",
        organization_id: "org_internal_firm_unit_001",
        primary_role: "Responsible attorney",
        related_client_ids: ["client_lcx_001"],
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["rate_profile_ref", "utilization", "current_matter_load"],
        sensitive_refs: { rate_profile_ref: "RateProfile:internal_lawyer_001", utilization_ref: "Utilization:2026-06" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_staff_paralegal_001",
        display_name: "Mina Park",
        type_id: "staff_paralegal",
        korean_label: "스태프/패러리걸",
        actor_category: "internal",
        organization_id: "org_internal_firm_unit_001",
        primary_role: "Paralegal",
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["availability", "current_matter_load", "performance_context"],
        sensitive_refs: { capacity_ref: "Capacity:staff_paralegal_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_client_contact_001",
        display_name: "Jin Lee",
        type_id: "client_contact",
        korean_label: "고객 담당자",
        actor_category: "external_client",
        organization_id: "org_client_lcx_001",
        primary_role: "Client decision maker",
        related_client_ids: ["client_lcx_001"],
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["portal_access_state", "billing_contact_state", "communication_preferences"],
        sensitive_refs: { portal_access_ref: "PortalAccess:client_lcx_001:person_client_contact_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_counterparty_001",
        display_name: "Counterparty A",
        type_id: "counterparty",
        korean_label: "상대방",
        actor_category: "external_adverse_or_transactional",
        organization_id: "org_counterparty_001",
        primary_role: "Counterparty related party",
        related_client_ids: ["client_lcx_001"],
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["conflict_flags", "restricted_notes", "sanctions_screening_ref"],
        sensitive_refs: { conflict_ref: "Conflict:conflict_lcx_counterparty_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_opposing_counsel_001",
        display_name: "Noah Choi",
        type_id: "opposing_counsel",
        korean_label: "상대방 대리인",
        actor_category: "external_counsel",
        organization_id: "org_opposing_firm_001",
        primary_role: "Opposing counsel",
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["communication_history", "strategy_notes", "conflict_flags"],
        sensitive_refs: { communication_ref: "Communication:opposing_counsel_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_expert_witness_001",
        display_name: "Dr. Seo",
        type_id: "expert_witness",
        korean_label: "전문가/증인",
        actor_category: "external_expert",
        organization_id: "org_expert_group_001",
        primary_role: "Expert witness",
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["confidentiality_state", "testimony_status", "work_product_refs"],
        sensitive_refs: { work_product_ref: "WorkProduct:expert_report_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_court_actor_001",
        display_name: "Seoul Central Court Clerk",
        type_id: "court_actor",
        korean_label: "재판부/법원 관계자",
        actor_category: "external_tribunal",
        organization_id: "org_court_seoul_001",
        primary_role: "Court actor",
        related_matter_ids: ["matter_lcx_001"],
        sensitive_fields: ["appearance_history", "recusal_or_conflict_notes"],
        sensitive_refs: { appearance_ref: "Hearing:appearance_history_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_arbitrator_001",
        display_name: "Arbitrator Han",
        type_id: "arbitrator",
        korean_label: "중재인",
        actor_category: "external_tribunal",
        organization_id: "org_arbitration_001",
        primary_role: "Arbitrator",
        related_matter_ids: ["matter_lcx_arbitration_001"],
        sensitive_fields: ["appointment_history", "conflict_disclosure_refs"],
        sensitive_refs: { disclosure_ref: "ConflictDisclosure:arbitrator_001" },
      }),
      createPerson({
        tenant_id: tenantId,
        person_id: "person_regulator_contact_001",
        display_name: "FSC Reviewer",
        type_id: "regulator_contact",
        korean_label: "규제기관 담당자",
        actor_category: "external_regulator",
        organization_id: "org_regulator_fsc_001",
        primary_role: "Regulatory reviewer",
        related_matter_ids: ["matter_lcx_regulatory_001"],
        sensitive_fields: ["communication_history", "filing_status_refs", "regulatory_strategy_notes"],
        sensitive_refs: { filing_ref: "RegulatoryFiling:matter_lcx_regulatory_001" },
      }),
    ]),
    organizations: Object.freeze([
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_internal_firm_unit_001",
        display_label: "LCX Litigation Group",
        organization_type: "internal_unit",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_client_lcx_001",
        display_label: "LCX Client Organization",
        organization_type: "client",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_counterparty_001",
        display_label: "Counterparty Organization",
        organization_type: "counterparty",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_opposing_firm_001",
        display_label: "Opposing Counsel Firm",
        organization_type: "external_counsel",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_expert_group_001",
        display_label: "Expert Witness Group",
        organization_type: "external_expert",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_court_seoul_001",
        display_label: "Seoul Central Court",
        organization_type: "tribunal",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_arbitration_001",
        display_label: "Arbitration Institution",
        organization_type: "tribunal",
      }),
      createOrganization({
        tenant_id: tenantId,
        organization_id: "org_regulator_fsc_001",
        display_label: "Financial Services Commission",
        organization_type: "regulator",
      }),
    ]),
    clients: Object.freeze([
      createClientRef({ tenant_id: tenantId, client_id: "client_lcx_001", display_label: "LCX Client" }),
    ]),
    matters: Object.freeze([
      createMatterRef({ tenant_id: tenantId, matter_id: "matter_lcx_001", display_label: "LCX Litigation Matter" }),
      createMatterRef({ tenant_id: tenantId, matter_id: "matter_lcx_regulatory_001", display_label: "LCX Regulatory Matter" }),
      createMatterRef({ tenant_id: tenantId, matter_id: "matter_lcx_arbitration_001", display_label: "LCX Arbitration Matter" }),
    ]),
    relationshipSeed: createLegalPeopleRelationshipSeed(tenantId),
  });
}

export function createLegalPeoplePermissionContext(requestContext = {}) {
  const role_ids = Object.freeze(roleIdsFrom(requestContext.actor_role));
  const privileged = hasPrivilegedRole(role_ids);
  return Object.freeze({
    actor_id: requestContext.actor_id ?? "unknown",
    role_ids,
    can_view_sensitive_relationship_details: privileged,
    default_access_state: privileged ? "privileged_reference" : "restricted_reference",
    raw_contact_values_included: false,
    provider_payload_included: false,
    ai_final_decision_allowed: false,
  });
}

export function createLegalPeopleReadModel({ seed, relationshipRepository } = {}) {
  const sourceSeed = seed ?? createLegalPeopleApiSeed();
  const people = Object.freeze([...(sourceSeed.people ?? [])].map(clone));
  const organizations = Object.freeze([...(sourceSeed.organizations ?? [])].map(clone));
  const clients = Object.freeze([...(sourceSeed.clients ?? [])].map(clone));
  const matters = Object.freeze([...(sourceSeed.matters ?? [])].map(clone));
  const repository = relationshipRepository ?? createLegalPeopleRelationshipRepository(sourceSeed.relationshipSeed ?? {});
  const organizationsById = keyById(organizations, "organization_id");
  const clientsById = keyById(clients, "client_id");
  const mattersById = keyById(matters, "matter_id");

  function relationshipsForPerson(tenant_id, person_id) {
    return repository.listRelationships({ tenant_id, subject_person_id: person_id });
  }

  function matchesRelationshipFilter(person, tenant_id, query) {
    const clientId = optionalString(query, "client_id");
    const matterId = optionalString(query, "matter_id");
    if (!clientId && !matterId) return true;
    if (clientId && person.related_client_ids.includes(clientId)) return true;
    if (matterId && person.related_matter_ids.includes(matterId)) return true;
    const relationships = relationshipsForPerson(tenant_id, person.person_id);
    return relationships.some((relationship) => {
      if (clientId && relationship.target_type === "client" && relationship.target_id === clientId) return true;
      if (matterId && relationship.target_type === "matter" && relationship.target_id === matterId) return true;
      return false;
    });
  }

  function searchPeople(query = {}, permissionContext = createLegalPeoplePermissionContext()) {
    const tenant_id = requiredString(query, "tenant_id");
    const textQuery = String(query.query ?? "").trim().toLowerCase();
    const typeId = optionalString(query, "type_id");
    const organizationId = optionalString(query, "organization_id");
    const status = optionalString(query, "status");
    const rows = tenantRows(people, tenant_id)
      .filter((person) => !typeId || person.type_id === typeId)
      .filter((person) => !organizationId || person.organization_id === organizationId)
      .filter((person) => !status || person.status === status)
      .filter((person) => matchesRelationshipFilter(person, tenant_id, query))
      .filter((person) => {
        if (!textQuery) return true;
        const organization = findPrimaryOrganization(person, organizationsById);
        return (
          includesText(person.display_name, textQuery) ||
          includesText(person.type_id, textQuery) ||
          includesText(person.korean_label, textQuery) ||
          includesText(person.primary_role, textQuery) ||
          includesText(organization?.display_label, textQuery)
        );
      })
      .sort(byDisplayName)
      .map((person) => visiblePerson(person, organizationsById, permissionContext));

    return Object.freeze({
      schema_version: "lawos.lcx_ppl.people_search_response.v0.1",
      outcome: "ok",
      people: Object.freeze(rows),
      filters: Object.freeze({
        query: query.query ?? null,
        type_id: typeId,
        organization_id: organizationId,
        client_id: optionalString(query, "client_id"),
        matter_id: optionalString(query, "matter_id"),
        status,
      }),
      facets: Object.freeze({
        type_id: Object.freeze(countBy(rows, "type_id")),
        actor_category: Object.freeze(countBy(rows, "actor_category")),
      }),
      permission_summary: permissionContext,
      claim_boundary: LCX_PPL_API_BOUNDARY,
    });
  }

  function getPersonDetail(query = {}, permissionContext = createLegalPeoplePermissionContext()) {
    const tenant_id = requiredString(query, "tenant_id");
    const person_id = requiredString(query, "person_id");
    const person = people.find((row) => row.tenant_id === tenant_id && row.person_id === person_id);
    if (!person) return null;
    const relationships = relationshipsForPerson(tenant_id, person_id).map((relationship) =>
      visibleRelationship(relationship, permissionContext),
    );
    const conflictReferences = repository
      .listConflictReferences({ tenant_id, subject_person_id: person_id })
      .map((reference) => visibleConflictReference(reference, permissionContext));
    const ethicalWallReferences = repository
      .listEthicalWallReferences({ tenant_id, subject_person_id: person_id })
      .map((reference) => visibleEthicalWallReference(reference, permissionContext));
    const auditEvents = repository.listAuditEvents({ tenant_id }).filter((event) => {
      if (event.object_id === person_id) return true;
      return relationships.some((relationship) => relationship.relationship_id === event.object_id);
    });

    return Object.freeze({
      schema_version: "lawos.lcx_ppl.person_detail_response.v0.1",
      outcome: "ok",
      person: visiblePerson(person, organizationsById, permissionContext),
      affiliations: Object.freeze(
        relationships.filter((relationship) => relationship.relationship_type === "person_to_organization_affiliation"),
      ),
      clients: relatedRefs(person.related_client_ids, clientsById, "client_id"),
      matters: relatedRefs(person.related_matter_ids, mattersById, "matter_id"),
      relationships: Object.freeze(relationships),
      relationships_grouped: groupRelationships(relationships),
      conflict_references: Object.freeze(conflictReferences),
      ethical_wall_references: Object.freeze(ethicalWallReferences),
      audit_summary: Object.freeze({
        event_count: auditEvents.length,
        object_ids: Object.freeze([...new Set(auditEvents.map((event) => event.object_id))].sort()),
        raw_event_payload_included: false,
      }),
      permission_summary: permissionContext,
      claim_boundary: LCX_PPL_API_BOUNDARY,
    });
  }

  function listRelationships(query = {}, permissionContext = createLegalPeoplePermissionContext()) {
    const tenant_id = requiredString(query, "tenant_id");
    const personId = optionalString(query, "person_id");
    const relationships = repository
      .listRelationships({
        tenant_id,
        subject_person_id: personId ?? undefined,
        target_type: optionalString(query, "target_type") ?? undefined,
        target_id: optionalString(query, "target_id") ?? undefined,
        relationship_type: optionalString(query, "relationship_type") ?? undefined,
      })
      .map((relationship) => visibleRelationship(relationship, permissionContext));

    return Object.freeze({
      schema_version: "lawos.lcx_ppl.relationship_api_response.v0.1",
      outcome: "ok",
      pivot: Object.freeze({
        person_id: personId,
        target_type: optionalString(query, "target_type"),
        target_id: optionalString(query, "target_id"),
        relationship_type: optionalString(query, "relationship_type"),
      }),
      relationships: Object.freeze(relationships),
      relationships_grouped: groupRelationships(relationships),
      permission_summary: permissionContext,
      claim_boundary: LCX_PPL_API_BOUNDARY,
    });
  }

  return Object.freeze({
    searchPeople,
    getPersonDetail,
    listRelationships,
    listPeopleFixtures({ tenant_id }) {
      return Object.freeze(tenantRows(people, requiredString({ tenant_id }, "tenant_id")).map(clone));
    },
  });
}

export const LCX_PPL_API_BOUNDARY = Object.freeze({
  people_search_api_complete: true,
  people_detail_api_complete: true,
  relationship_api_complete: true,
  permission_aware_api_response_complete: true,
  ui_reflection_complete: false,
  browser_qa_complete: false,
  runtime_ready_candidate_complete: false,
  production_ready: false,
  go_live_approved: false,
  enterprise_trust_approved: false,
  raw_contact_values_included: false,
  provider_payload_included: false,
  ai_final_decision_allowed: false,
  relationship_repository_boundary: LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY,
});

