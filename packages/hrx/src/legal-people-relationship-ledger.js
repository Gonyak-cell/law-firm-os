const RELATIONSHIP_TYPES = Object.freeze([
  "person_to_organization_affiliation",
  "person_to_client_contact",
  "person_to_matter_participation",
  "person_to_person_relationship",
  "person_to_document_reference",
  "person_to_conflict_subject",
  "person_to_ethical_wall_membership",
]);

const TARGET_TYPES = Object.freeze(["person", "organization", "client", "matter", "document", "conflict", "ethical_wall"]);
const RELATIONSHIP_STATUSES = Object.freeze(["proposed", "active", "inactive", "review_required", "blocked", "historical"]);
const AUDIT_ACTIONS = Object.freeze([
  "people.relationship.created",
  "people.relationship.updated",
  "people.relationship.blocked",
  "people.conflict_reference.created",
  "people.ethical_wall_reference.created",
]);

const REVIEW_REQUIRED_RELATIONSHIP_TYPES = new Set([
  "person_to_conflict_subject",
  "person_to_ethical_wall_membership",
  "person_to_client_contact",
  "person_to_matter_participation",
]);

const FORBIDDEN_RAW_FIELDS = Object.freeze([
  "client_name",
  "raw_contact_value",
  "raw_email",
  "raw_phone",
  "raw_address",
  "raw_document_text",
  "storage_path",
  "provider_payload",
  "credential",
  "token",
]);

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined;
}

function key(tenantId, id) {
  return `${tenantId}:${id}`;
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function requiredEnum(input, field, allowed) {
  const value = requiredString(input, field);
  if (!allowed.includes(value)) throw new TypeError(`${field} must be one of ${allowed.join(", ")}`);
  return value;
}

function arrayOfStrings(input, field) {
  const value = input?.[field] ?? [];
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return Object.freeze(
    value.map((item) => {
      if (typeof item !== "string" || item.trim() === "") throw new TypeError(`${field} must contain non-empty strings`);
      return item.trim();
    }),
  );
}

function rejectRawFields(input) {
  for (const field of FORBIDDEN_RAW_FIELDS) {
    if (Object.hasOwn(input ?? {}, field)) throw new TypeError(`Legal People relationship ledger must not include ${field}`);
  }
}

function safeMetadata(input = {}) {
  const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
  rejectRawFields(metadata);
  return Object.freeze({
    ...clone(metadata),
    raw_contact_values_included: false,
    raw_document_text_included: false,
    provider_payload_included: false,
    credentials_included: false,
    production_ready_claim: false,
    go_live_claim: false,
    enterprise_trust_claim: false,
  });
}

export function createLegalPeopleRelationship(input = {}) {
  rejectRawFields(input);
  const relationshipType = requiredEnum(input, "relationship_type", RELATIONSHIP_TYPES);
  const reviewRequired = input.review_required ?? REVIEW_REQUIRED_RELATIONSHIP_TYPES.has(relationshipType);
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.relationship.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    relationship_id: requiredString(input, "relationship_id"),
    subject_person_id: requiredString(input, "subject_person_id"),
    target_type: requiredEnum(input, "target_type", TARGET_TYPES),
    target_id: requiredString(input, "target_id"),
    relationship_type: relationshipType,
    relationship_direction: requiredString(input, "relationship_direction"),
    status: requiredEnum(input, "status", RELATIONSHIP_STATUSES),
    effective_from: requiredString(input, "effective_from"),
    effective_to: optionalString(input, "effective_to"),
    source_refs: arrayOfStrings(input, "source_refs"),
    permission_scope: optionalString(input, "permission_scope") ?? "restricted_reference",
    review_required: Boolean(reviewRequired),
    audit_ref: requiredString(input, "audit_ref"),
    metadata: safeMetadata(input),
  });
}

export function createConflictReference(input = {}) {
  rejectRawFields(input);
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.conflict_reference.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    conflict_ref_id: requiredString(input, "conflict_ref_id"),
    subject_person_id: requiredString(input, "subject_person_id"),
    related_ref: requiredString(input, "related_ref"),
    conflict_basis: requiredString(input, "conflict_basis"),
    status: requiredEnum(input, "status", ["review_required", "cleared", "blocked", "escalated"]),
    reviewer_required: true,
    final_decision: false,
    ai_final_decision_allowed: false,
    audit_ref: requiredString(input, "audit_ref"),
    metadata: safeMetadata(input),
  });
}

export function createEthicalWallReference(input = {}) {
  rejectRawFields(input);
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.ethical_wall_reference.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    wall_ref_id: requiredString(input, "wall_ref_id"),
    subject_person_id: requiredString(input, "subject_person_id"),
    matter_id: requiredString(input, "matter_id"),
    wall_status: requiredEnum(input, "wall_status", ["proposed", "active", "blocked", "review_required", "released"]),
    access_effect: requiredEnum(input, "access_effect", ["restrict", "allow_limited", "review_required"]),
    reviewer_required: true,
    final_decision: false,
    ai_final_decision_allowed: false,
    audit_ref: requiredString(input, "audit_ref"),
    metadata: safeMetadata(input),
  });
}

export function createLegalPeopleAuditEvent(input = {}) {
  rejectRawFields(input);
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.audit_event.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    event_id: requiredString(input, "event_id"),
    object_id: requiredString(input, "object_id"),
    action: requiredEnum(input, "action", AUDIT_ACTIONS),
    actor_ref: requiredString(input, "actor_ref"),
    audit_ref: requiredString(input, "audit_ref"),
    created_at: requiredString(input, "created_at"),
    writes_audit_event: true,
    production_ready_claim: false,
    metadata: safeMetadata(input),
  });
}

function safeRelationship(row) {
  return Object.freeze(clone(row));
}

export function createLegalPeopleRelationshipSeed(tenantId = "tenant_lcx_ppl") {
  return Object.freeze({
    relationships: [
      {
        tenant_id: tenantId,
        relationship_id: "rel_lcx_internal_lawyer_org",
        subject_person_id: "person_internal_lawyer_001",
        target_type: "organization",
        target_id: "org_internal_firm_unit_001",
        relationship_type: "person_to_organization_affiliation",
        relationship_direction: "person_to_organization",
        status: "active",
        effective_from: "2026-06-24",
        source_refs: ["LCX-PPL-02.02"],
        permission_scope: "firm_internal_reference",
        audit_ref: "audit_lcx_internal_lawyer_org",
      },
      {
        tenant_id: tenantId,
        relationship_id: "rel_lcx_client_contact",
        subject_person_id: "person_client_contact_001",
        target_type: "client",
        target_id: "client_lcx_001",
        relationship_type: "person_to_client_contact",
        relationship_direction: "person_to_client",
        status: "review_required",
        effective_from: "2026-06-24",
        source_refs: ["LCX-PPL-02.04"],
        permission_scope: "client_contact_restricted",
        audit_ref: "audit_lcx_client_contact",
      },
      {
        tenant_id: tenantId,
        relationship_id: "rel_lcx_opposing_counsel_matter",
        subject_person_id: "person_opposing_counsel_001",
        target_type: "matter",
        target_id: "matter_lcx_001",
        relationship_type: "person_to_matter_participation",
        relationship_direction: "person_to_matter",
        status: "review_required",
        effective_from: "2026-06-24",
        source_refs: ["LCX-PPL-02.03"],
        permission_scope: "external_reference_only",
        audit_ref: "audit_lcx_opposing_counsel_matter",
      },
      {
        tenant_id: tenantId,
        relationship_id: "rel_lcx_expert_document",
        subject_person_id: "person_expert_witness_001",
        target_type: "document",
        target_id: "document_lcx_expert_report_001",
        relationship_type: "person_to_document_reference",
        relationship_direction: "person_to_document",
        status: "active",
        effective_from: "2026-06-24",
        source_refs: ["LCX-PPL-03.04"],
        permission_scope: "expert_limited",
        audit_ref: "audit_lcx_expert_document",
      },
      {
        tenant_id: tenantId,
        relationship_id: "rel_lcx_court_matter",
        subject_person_id: "person_court_actor_001",
        target_type: "matter",
        target_id: "matter_lcx_001",
        relationship_type: "person_to_matter_participation",
        relationship_direction: "person_to_matter",
        status: "active",
        effective_from: "2026-06-24",
        source_refs: ["LCX-PPL-02.03"],
        permission_scope: "tribunal_reference_only",
        audit_ref: "audit_lcx_court_matter",
      },
      {
        tenant_id: tenantId,
        relationship_id: "rel_lcx_regulator_matter",
        subject_person_id: "person_regulator_contact_001",
        target_type: "matter",
        target_id: "matter_lcx_regulatory_001",
        relationship_type: "person_to_matter_participation",
        relationship_direction: "person_to_matter",
        status: "active",
        effective_from: "2026-06-24",
        source_refs: ["LCX-PPL-02.03"],
        permission_scope: "regulator_reference_only",
        audit_ref: "audit_lcx_regulator_matter",
      },
    ],
    conflict_references: [
      {
        tenant_id: tenantId,
        conflict_ref_id: "conflict_lcx_counterparty_001",
        subject_person_id: "person_counterparty_001",
        related_ref: "client:client_lcx_001",
        conflict_basis: "counterparty_related_party",
        status: "review_required",
        audit_ref: "audit_lcx_conflict_counterparty",
      },
    ],
    ethical_wall_references: [
      {
        tenant_id: tenantId,
        wall_ref_id: "wall_lcx_matter_001",
        subject_person_id: "person_internal_lawyer_001",
        matter_id: "matter_lcx_001",
        wall_status: "review_required",
        access_effect: "review_required",
        audit_ref: "audit_lcx_wall_matter",
      },
    ],
  });
}

export function createLegalPeopleRelationshipRepository(seed = {}) {
  const relationships = new Map();
  const conflicts = new Map();
  const ethicalWalls = new Map();
  const auditEvents = [];

  function appendAudit({ tenant_id, object_id, action, actor_ref, audit_ref, metadata }) {
    const event = createLegalPeopleAuditEvent({
      tenant_id,
      event_id: `audit_event_${auditEvents.length + 1}_${object_id}`,
      object_id,
      action,
      actor_ref,
      audit_ref,
      created_at: new Date(0).toISOString(),
      metadata,
    });
    auditEvents.push(event);
    return event;
  }

  const repository = Object.freeze({
    upsertRelationship(input, options = {}) {
      const relationship = createLegalPeopleRelationship(input);
      relationships.set(key(relationship.tenant_id, relationship.relationship_id), relationship);
      appendAudit({
        tenant_id: relationship.tenant_id,
        object_id: relationship.relationship_id,
        action: options.existing === true ? "people.relationship.updated" : "people.relationship.created",
        actor_ref: options.actor_ref ?? "actor:system",
        audit_ref: relationship.audit_ref,
        metadata: { relationship_type: relationship.relationship_type, review_required: relationship.review_required },
      });
      return safeRelationship(relationship);
    },

    listRelationships(query = {}) {
      const tenantId = requiredString(query, "tenant_id");
      return Object.freeze(
        [...relationships.values()]
          .filter((row) => row.tenant_id === tenantId)
          .filter((row) => !query.subject_person_id || row.subject_person_id === query.subject_person_id)
          .filter((row) => !query.target_type || row.target_type === query.target_type)
          .filter((row) => !query.target_id || row.target_id === query.target_id)
          .filter((row) => !query.relationship_type || row.relationship_type === query.relationship_type)
          .sort((left, right) => left.relationship_id.localeCompare(right.relationship_id))
          .map(safeRelationship),
      );
    },

    addConflictReference(input, options = {}) {
      const reference = createConflictReference(input);
      conflicts.set(key(reference.tenant_id, reference.conflict_ref_id), reference);
      appendAudit({
        tenant_id: reference.tenant_id,
        object_id: reference.conflict_ref_id,
        action: "people.conflict_reference.created",
        actor_ref: options.actor_ref ?? "actor:system",
        audit_ref: reference.audit_ref,
        metadata: { status: reference.status, reviewer_required: true },
      });
      return safeRelationship(reference);
    },

    listConflictReferences(query = {}) {
      const tenantId = requiredString(query, "tenant_id");
      return Object.freeze(
        [...conflicts.values()]
          .filter((row) => row.tenant_id === tenantId)
          .filter((row) => !query.subject_person_id || row.subject_person_id === query.subject_person_id)
          .sort((left, right) => left.conflict_ref_id.localeCompare(right.conflict_ref_id))
          .map(safeRelationship),
      );
    },

    addEthicalWallReference(input, options = {}) {
      const reference = createEthicalWallReference(input);
      ethicalWalls.set(key(reference.tenant_id, reference.wall_ref_id), reference);
      appendAudit({
        tenant_id: reference.tenant_id,
        object_id: reference.wall_ref_id,
        action: "people.ethical_wall_reference.created",
        actor_ref: options.actor_ref ?? "actor:system",
        audit_ref: reference.audit_ref,
        metadata: { wall_status: reference.wall_status, access_effect: reference.access_effect, reviewer_required: true },
      });
      return safeRelationship(reference);
    },

    listEthicalWallReferences(query = {}) {
      const tenantId = requiredString(query, "tenant_id");
      return Object.freeze(
        [...ethicalWalls.values()]
          .filter((row) => row.tenant_id === tenantId)
          .filter((row) => !query.subject_person_id || row.subject_person_id === query.subject_person_id)
          .filter((row) => !query.matter_id || row.matter_id === query.matter_id)
          .sort((left, right) => left.wall_ref_id.localeCompare(right.wall_ref_id))
          .map(safeRelationship),
      );
    },

    listAuditEvents(query = {}) {
      const tenantId = requiredString(query, "tenant_id");
      return Object.freeze(
        auditEvents
          .filter((row) => row.tenant_id === tenantId)
          .filter((row) => !query.object_id || row.object_id === query.object_id)
          .map(safeRelationship),
      );
    },
  });

  for (const relationship of seed.relationships ?? []) repository.upsertRelationship(relationship);
  for (const reference of seed.conflict_references ?? []) repository.addConflictReference(reference);
  for (const reference of seed.ethical_wall_references ?? []) repository.addEthicalWallReference(reference);
  return repository;
}

export const LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY = Object.freeze({
  runtime_ready_candidate_complete: false,
  production_ready: false,
  go_live_approved: false,
  enterprise_trust_approved: false,
  raw_contact_values_included: false,
  provider_payload_included: false,
  ai_final_decision_allowed: false,
});

