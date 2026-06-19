export const CORE_DOMAIN_PACK_BINDING = Object.freeze({
  pack_id: "CP00-095",
  planned_pack_id: "CP00-095",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P00.M00.S01-RP01.P02.M04.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
});

export const CORE_DOMAIN_MODULES = Object.freeze([
  "Core",
  "MasterData",
  "MatterCore",
  "DMS",
  "PermissionKernel",
  "AuditKernel",
]);

export const CORE_DOMAIN_ENTITY_DEFINITIONS = Object.freeze({
  Tenant: Object.freeze({
    owner_module: "Core",
    primary_id: "tenant_id",
    required_fields: ["tenant_id", "name", "plan", "region", "security_policy", "data_residency", "status"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  User: Object.freeze({
    owner_module: "Core",
    primary_id: "user_id",
    required_fields: ["user_id", "tenant_id", "email", "group_ids", "role_ids", "status"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Group: Object.freeze({
    owner_module: "Core",
    primary_id: "group_id",
    required_fields: ["group_id", "tenant_id", "name", "member_user_ids", "status"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Role: Object.freeze({
    owner_module: "Core",
    primary_id: "role_id",
    required_fields: ["role_id", "tenant_id", "name", "permission_set_id", "permissions"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  PermissionReference: Object.freeze({
    owner_module: "PermissionKernel",
    primary_id: "permission_id",
    required_fields: ["permission_id", "tenant_id", "principal_type", "object_type", "action", "effect"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  PolicyReference: Object.freeze({
    owner_module: "PermissionKernel",
    primary_id: "policy_id",
    required_fields: ["policy_id", "tenant_id", "policy_type", "owner_module", "status"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Entity: Object.freeze({
    owner_module: "MasterData",
    primary_id: "entity_id",
    required_fields: ["entity_id", "tenant_id", "entity_kind", "display_name", "status"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Person: Object.freeze({
    owner_module: "MasterData",
    primary_id: "person_id",
    required_fields: ["person_id", "tenant_id", "display_name"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Organization: Object.freeze({
    owner_module: "MasterData",
    primary_id: "organization_id",
    required_fields: ["organization_id", "tenant_id", "display_name"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Client: Object.freeze({
    owner_module: "MasterData",
    primary_id: "client_id",
    required_fields: ["client_id", "tenant_id", "display_name", "confidentiality"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  ClientProfile: Object.freeze({
    owner_module: "MasterData",
    primary_id: "client_profile_id",
    required_fields: ["client_profile_id", "tenant_id", "client_id"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  BillingEntity: Object.freeze({
    owner_module: "MasterData",
    primary_id: "billing_entity_id",
    required_fields: ["billing_entity_id", "tenant_id", "display_name"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  ContactPoint: Object.freeze({
    owner_module: "MasterData",
    primary_id: "contact_point_id",
    required_fields: ["contact_point_id", "tenant_id", "owner_entity_id", "contact_type", "value"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Relationship: Object.freeze({
    owner_module: "MasterData",
    primary_id: "relationship_id",
    required_fields: ["relationship_id", "tenant_id", "from_entity_id", "to_entity_id", "relationship_type"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  Matter: Object.freeze({
    owner_module: "MatterCore",
    primary_id: "matter_id",
    required_fields: ["matter_id", "tenant_id", "client_id", "owner_user_id", "status", "confidentiality"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  MatterMember: Object.freeze({
    owner_module: "MatterCore",
    primary_id: "matter_member_id",
    required_fields: ["matter_member_id", "tenant_id", "matter_id", "user_id", "role"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  MatterTask: Object.freeze({
    owner_module: "MatterCore",
    primary_id: "matter_task_id",
    required_fields: ["matter_task_id", "tenant_id", "matter_id", "title", "status"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  MatterCalendarEvent: Object.freeze({
    owner_module: "MatterCore",
    primary_id: "matter_calendar_event_id",
    required_fields: ["matter_calendar_event_id", "tenant_id", "matter_id", "title", "starts_at"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  Checklist: Object.freeze({
    owner_module: "MatterCore",
    primary_id: "checklist_id",
    required_fields: ["checklist_id", "tenant_id", "matter_id", "title"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  MatterStatusHistory: Object.freeze({
    owner_module: "MatterCore",
    primary_id: "matter_status_history_id",
    required_fields: ["matter_status_history_id", "tenant_id", "matter_id", "from_status", "to_status", "changed_at"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  DocumentReference: Object.freeze({
    owner_module: "DMS",
    primary_id: "document_id",
    required_fields: ["document_id", "tenant_id", "matter_id", "dms_owned"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  DocumentVersionReference: Object.freeze({
    owner_module: "DMS",
    primary_id: "document_version_id",
    required_fields: ["document_version_id", "document_id", "tenant_id", "matter_id", "version", "dms_owned"],
    matter_trace_required: true,
    pre_matter_allowed: false,
  }),
  AuditEventReference: Object.freeze({
    owner_module: "AuditKernel",
    primary_id: "audit_event_id",
    required_fields: ["audit_event_id", "tenant_id", "action", "occurred_at"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
  AuditEvent: Object.freeze({
    owner_module: "AuditKernel",
    primary_id: "audit_event_id",
    required_fields: ["audit_event_id", "tenant_id", "actor_id", "action", "object_type", "object_id", "occurred_at"],
    matter_trace_required: false,
    pre_matter_allowed: true,
  }),
});

export const PRE_MATTER_ENTITY_TYPES = Object.freeze(
  Object.entries(CORE_DOMAIN_ENTITY_DEFINITIONS)
    .filter(([, definition]) => definition.pre_matter_allowed)
    .map(([entityType]) => entityType),
);

export const MATTER_TRACEABLE_ENTITY_TYPES = Object.freeze(
  Object.entries(CORE_DOMAIN_ENTITY_DEFINITIONS)
    .filter(([, definition]) => definition.matter_trace_required)
    .map(([entityType]) => entityType),
);

export function listCoreDomainEntityTypes() {
  return Object.freeze(Object.keys(CORE_DOMAIN_ENTITY_DEFINITIONS));
}

export function getCoreDomainEntityDefinition(entityType) {
  const definition = CORE_DOMAIN_ENTITY_DEFINITIONS[entityType];
  if (!definition) throw new Error(`Unknown core domain entity type ${entityType}`);
  return definition;
}

export function getOwnerModule(entityType) {
  return getCoreDomainEntityDefinition(entityType).owner_module;
}

export function assertOwnerModule(entityType, ownerModule) {
  const expected = getOwnerModule(entityType);
  if (ownerModule !== expected) {
    throw new Error(`${entityType} must remain owned by ${expected}`);
  }
  return true;
}
