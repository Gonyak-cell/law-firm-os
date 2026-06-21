import { getCanonicalObjectDefinition } from "./schema-registry.js";

function freeze(value) {
  return Object.freeze(value);
}

export const CANONICAL_RELATIONSHIP_REGISTRY = freeze([
  { id: "tenant.membership", source: "Tenant", target: "TenantMembership", target_field: "tenant_id" },
  { id: "user.membership", source: "User", target: "TenantMembership", target_field: "user_id" },
  { id: "role.membership", source: "RuntimeRole", target: "TenantMembership", target_field: "role_id" },
  { id: "employee.matter_member", source: "Employee", target: "MatterMember", target_field: "employee_id" },
  { id: "client.matter", source: "Client", target: "Matter", target_field: "client_id" },
  { id: "matter.member", source: "Matter", target: "MatterMember", target_field: "matter_id" },
  { id: "party.client", source: "Party", target: "Client", target_field: "party_id" },
  { id: "client_group.client", source: "ClientGroup", target: "Client", target_field: "client_group_id" },
  { id: "party.external_user", source: "Party", target: "ExternalUser", target_field: "party_id" },
  { id: "party.contact_role", source: "Party", target: "ContactRole", target_field: "party_id" },
  { id: "matter.contact_role", source: "Matter", target: "ContactRole", target_field: "matter_id" },
  { id: "matter.document", source: "Matter", target: "Document", target_field: "matter_id" },
  { id: "classification.document", source: "ClassificationEnvelope", target: "Document", target_field: "classification_envelope_id" },
  { id: "document.version", source: "Document", target: "DocumentVersion", target_field: "document_id" },
  { id: "matter.email_thread", source: "Matter", target: "EmailThread", target_field: "matter_id" },
  { id: "email_thread.message", source: "EmailThread", target: "EmailMessage", target_field: "thread_id" },
  { id: "matter.task", source: "Matter", target: "Task", target_field: "matter_id" },
  { id: "matter.deadline", source: "Matter", target: "Deadline", target_field: "matter_id" },
  { id: "matter.event", source: "Matter", target: "Event", target_field: "matter_id" },
  { id: "matter.issue", source: "Matter", target: "Issue", target_field: "matter_id" },
  { id: "matter.wiki", source: "Matter", target: "MatterWiki", target_field: "matter_id" },
  { id: "matter.vault_snapshot", source: "Matter", target: "VaultSnapshot", target_field: "matter_id" }
].map(freeze));

export function validateCanonicalRelationshipRegistry() {
  const errors = [];
  for (const relationship of CANONICAL_RELATIONSHIP_REGISTRY) {
    const source = getCanonicalObjectDefinition(relationship.source);
    const target = getCanonicalObjectDefinition(relationship.target);
    if (!source) errors.push(`${relationship.id}: unknown source ${relationship.source}`);
    if (!target) errors.push(`${relationship.id}: unknown target ${relationship.target}`);
    const targetFields = new Set([...(target?.required_fields ?? []), ...(target?.optional_fields ?? []), ...(target?.one_of ?? []).flat()]);
    if (target && !targetFields.has(relationship.target_field)) {
      errors.push(`${relationship.id}: target field ${relationship.target_field} not declared on ${relationship.target}`);
    }
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), count: CANONICAL_RELATIONSHIP_REGISTRY.length });
}

export function relationshipTargetsFor(objectType) {
  return Object.freeze(CANONICAL_RELATIONSHIP_REGISTRY.filter((relationship) => relationship.source === objectType));
}
