export const CONFIDENTIALITY_LEVELS = ["public", "internal", "confidential", "restricted"];
export const LIFECYCLE_STATUSES = ["draft", "active", "open", "paused", "closed", "archived"];
export const MATTER_STATUSES = ["intake", "open", "paused", "closed", "archived"];
export const ENTITY_KINDS = ["organization", "person", "internal_user", "external_party"];

export function requireFields(entityName, value, fields) {
  const missing = fields.filter((field) => value[field] === undefined || value[field] === null || value[field] === "");
  if (missing.length > 0) {
    throw new Error(`${entityName} missing required fields: ${missing.join(", ")}`);
  }
}

export function freezeRecord(record) {
  return Object.freeze(record);
}

export function createTenant(input) {
  requireFields("Tenant", input, ["tenant_id", "name"]);
  return freezeRecord({
    tenant_id: input.tenant_id,
    name: input.name,
    plan: input.plan ?? "internal",
    region: input.region ?? "KR",
    security_policy: input.security_policy ?? "standard",
    data_residency: input.data_residency ?? "KR",
    status: input.status ?? "active",
  });
}

export function createUser(input) {
  requireFields("User", input, ["user_id", "tenant_id", "email"]);
  return freezeRecord({
    user_id: input.user_id,
    tenant_id: input.tenant_id,
    email: input.email,
    group_ids: input.group_ids ?? [],
    role_ids: input.role_ids ?? [],
    status: input.status ?? "active",
  });
}

export function createGroup(input) {
  requireFields("Group", input, ["group_id", "tenant_id", "name"]);
  return freezeRecord({
    group_id: input.group_id,
    tenant_id: input.tenant_id,
    name: input.name,
    member_user_ids: input.member_user_ids ?? [],
    status: input.status ?? "active",
  });
}

export function createRole(input) {
  requireFields("Role", input, ["role_id", "tenant_id", "name"]);
  return freezeRecord({
    role_id: input.role_id,
    tenant_id: input.tenant_id,
    name: input.name,
    permission_set_id: input.permission_set_id ?? null,
    permissions: input.permissions ?? [],
  });
}

export function createPermissionReference(input) {
  requireFields("PermissionReference", input, ["permission_id", "tenant_id", "principal_type", "object_type", "action", "effect"]);
  return freezeRecord({
    permission_id: input.permission_id,
    tenant_id: input.tenant_id,
    principal_type: input.principal_type,
    principal_id: input.principal_id ?? null,
    object_type: input.object_type,
    object_id: input.object_id ?? null,
    action: input.action,
    effect: input.effect,
    policy_id: input.policy_id ?? null,
  });
}

export function createPolicyReference(input) {
  requireFields("PolicyReference", input, ["policy_id", "tenant_id", "policy_type", "owner_module"]);
  return freezeRecord({
    policy_id: input.policy_id,
    tenant_id: input.tenant_id,
    policy_type: input.policy_type,
    owner_module: input.owner_module,
    config_ref: input.config_ref ?? null,
    status: input.status ?? "active",
  });
}

export function createEntity(input) {
  requireFields("Entity", input, ["entity_id", "tenant_id", "entity_kind", "display_name"]);
  if (!ENTITY_KINDS.includes(input.entity_kind)) {
    throw new Error(`Entity kind must be one of ${ENTITY_KINDS.join(", ")}`);
  }
  return freezeRecord({
    entity_id: input.entity_id,
    tenant_id: input.tenant_id,
    entity_kind: input.entity_kind,
    display_name: input.display_name,
    status: input.status ?? "active",
  });
}

export function createPerson(input) {
  requireFields("Person", input, ["person_id", "tenant_id", "display_name"]);
  return freezeRecord({
    person_id: input.person_id,
    tenant_id: input.tenant_id,
    display_name: input.display_name,
    entity_id: input.entity_id ?? null,
    email: input.email ?? null,
  });
}

export function createOrganization(input) {
  requireFields("Organization", input, ["organization_id", "tenant_id", "display_name"]);
  return freezeRecord({
    organization_id: input.organization_id,
    tenant_id: input.tenant_id,
    display_name: input.display_name,
    entity_id: input.entity_id ?? null,
    registration_number: input.registration_number ?? null,
  });
}

export function createClient(input) {
  requireFields("Client", input, ["client_id", "tenant_id", "display_name"]);
  const confidentiality = input.confidentiality ?? "confidential";
  if (!CONFIDENTIALITY_LEVELS.includes(confidentiality)) {
    throw new Error(`Client confidentiality must be one of ${CONFIDENTIALITY_LEVELS.join(", ")}`);
  }
  return freezeRecord({
    client_id: input.client_id,
    tenant_id: input.tenant_id,
    display_name: input.display_name,
    entity_id: input.entity_id ?? null,
    confidentiality,
  });
}

export function createClientProfile(input) {
  requireFields("ClientProfile", input, ["client_profile_id", "tenant_id", "client_id"]);
  return freezeRecord({
    client_profile_id: input.client_profile_id,
    tenant_id: input.tenant_id,
    client_id: input.client_id,
    billing_entity_id: input.billing_entity_id ?? null,
    relationship_ids: input.relationship_ids ?? [],
  });
}

export function createBillingEntity(input) {
  requireFields("BillingEntity", input, ["billing_entity_id", "tenant_id", "display_name"]);
  return freezeRecord({
    billing_entity_id: input.billing_entity_id,
    tenant_id: input.tenant_id,
    display_name: input.display_name,
    entity_id: input.entity_id ?? null,
  });
}

export function createContactPoint(input) {
  requireFields("ContactPoint", input, ["contact_point_id", "tenant_id", "owner_entity_id", "contact_type", "value"]);
  return freezeRecord({
    contact_point_id: input.contact_point_id,
    tenant_id: input.tenant_id,
    owner_entity_id: input.owner_entity_id,
    contact_type: input.contact_type,
    value: input.value,
  });
}

export function createRelationship(input) {
  requireFields("Relationship", input, ["relationship_id", "tenant_id", "from_entity_id", "to_entity_id", "relationship_type"]);
  return freezeRecord({
    relationship_id: input.relationship_id,
    tenant_id: input.tenant_id,
    from_entity_id: input.from_entity_id,
    to_entity_id: input.to_entity_id,
    relationship_type: input.relationship_type,
  });
}

export function createMatter(input) {
  requireFields("Matter", input, ["matter_id", "tenant_id", "client_id", "owner_user_id", "status", "confidentiality"]);
  if (!CONFIDENTIALITY_LEVELS.includes(input.confidentiality)) {
    throw new Error(`Matter confidentiality must be one of ${CONFIDENTIALITY_LEVELS.join(", ")}`);
  }
  if (!MATTER_STATUSES.includes(input.status)) {
    throw new Error(`Matter status must be one of ${MATTER_STATUSES.join(", ")}`);
  }
  return freezeRecord({
    matter_id: input.matter_id,
    tenant_id: input.tenant_id,
    client_id: input.client_id,
    owner_user_id: input.owner_user_id,
    status: input.status,
    matter_type: input.matter_type ?? "general",
    confidentiality: input.confidentiality,
  });
}

export function createMatterMember(input) {
  requireFields("MatterMember", input, ["matter_member_id", "tenant_id", "matter_id", "user_id", "role"]);
  return freezeRecord({
    matter_member_id: input.matter_member_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    user_id: input.user_id,
    role: input.role,
  });
}

export function createMatterTask(input) {
  requireFields("MatterTask", input, ["matter_task_id", "tenant_id", "matter_id", "title", "status"]);
  return freezeRecord({
    matter_task_id: input.matter_task_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    title: input.title,
    status: input.status,
    owner_user_id: input.owner_user_id ?? null,
  });
}

export function createMatterCalendarEvent(input) {
  requireFields("MatterCalendarEvent", input, ["matter_calendar_event_id", "tenant_id", "matter_id", "title", "starts_at"]);
  return freezeRecord({
    matter_calendar_event_id: input.matter_calendar_event_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    title: input.title,
    starts_at: input.starts_at,
    ends_at: input.ends_at ?? null,
  });
}

export function createChecklist(input) {
  requireFields("Checklist", input, ["checklist_id", "tenant_id", "matter_id", "title"]);
  return freezeRecord({
    checklist_id: input.checklist_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    title: input.title,
    item_count: input.item_count ?? 0,
  });
}

export function createMatterStatusHistory(input) {
  requireFields("MatterStatusHistory", input, ["matter_status_history_id", "tenant_id", "matter_id", "from_status", "to_status", "changed_at"]);
  return freezeRecord({
    matter_status_history_id: input.matter_status_history_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    from_status: input.from_status,
    to_status: input.to_status,
    changed_at: input.changed_at,
  });
}

export function createDocumentReference(input) {
  requireFields("DocumentReference", input, ["document_id", "tenant_id", "matter_id"]);
  return freezeRecord({
    document_id: input.document_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    dms_owned: true,
  });
}

export function createDocumentVersionReference(input) {
  requireFields("DocumentVersionReference", input, ["document_version_id", "document_id", "tenant_id", "matter_id", "version"]);
  return freezeRecord({
    document_version_id: input.document_version_id,
    document_id: input.document_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    version: input.version,
    dms_owned: true,
  });
}

export function createAuditEventReference(input) {
  requireFields("AuditEventReference", input, ["audit_event_id", "tenant_id", "action", "occurred_at"]);
  return freezeRecord({
    audit_event_id: input.audit_event_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id ?? null,
    action: input.action,
    occurred_at: input.occurred_at,
  });
}

export function createAuditEvent(input) {
  requireFields("AuditEvent", input, ["audit_event_id", "tenant_id", "actor_id", "action", "object_type", "object_id", "occurred_at"]);
  return freezeRecord({
    audit_event_id: input.audit_event_id,
    tenant_id: input.tenant_id,
    actor_id: input.actor_id,
    action: input.action,
    object_type: input.object_type,
    object_id: input.object_id,
    matter_id: input.matter_id ?? null,
    ip_hash: input.ip_hash ?? null,
    occurred_at: input.occurred_at,
  });
}
