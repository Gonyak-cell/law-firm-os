export const RUNTIME_CANONICAL_MODEL_SCHEMA_VERSION = "law-firm-os.runtime-canonical-model.v0.1";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const CANONICAL_OBJECT_DEFINITIONS = deepFreeze({
  Tenant: {
    tuw: "RS-4-T02",
    owner_module: "control-plane",
    tenant_scoped: false,
    required_fields: ["tenant_id", "name", "status"],
    category: "identity"
  },
  User: {
    tuw: "RS-4-T02",
    owner_module: "runtime-auth",
    required_fields: ["tenant_id", "user_id", "display_name", "status"],
    category: "identity"
  },
  Employee: {
    tuw: "RS-4-T02",
    owner_module: "hrx",
    required_fields: ["tenant_id", "employee_id", "display_name", "status"],
    blocked_fields: ["iam_user_id", "account_id"],
    category: "people"
  },
  TenantMembership: {
    tuw: "RS-4-T03",
    owner_module: "runtime-auth",
    required_fields: ["tenant_id", "membership_id", "user_id", "role_id", "status"],
    category: "identity"
  },
  RuntimeRole: {
    tuw: "RS-4-T03",
    owner_module: "runtime-auth",
    required_fields: ["tenant_id", "role_id", "name", "scopes"],
    array_fields: ["scopes"],
    category: "identity"
  },
  Person: {
    tuw: "RS-4-T04",
    owner_module: "master-data",
    required_fields: ["tenant_id", "person_id", "display_name", "status"],
    category: "party"
  },
  Organization: {
    tuw: "RS-4-T04",
    owner_module: "master-data",
    required_fields: ["tenant_id", "organization_id", "display_name", "status"],
    category: "party"
  },
  Client: {
    tuw: "RS-4-T05",
    owner_module: "master-data",
    required_fields: ["tenant_id", "client_id", "party_id", "display_name", "status"],
    optional_fields: ["client_group_id"],
    category: "client"
  },
  ClientGroup: {
    tuw: "RS-4-T05",
    owner_module: "master-data",
    required_fields: ["tenant_id", "client_group_id", "display_name", "client_ids"],
    array_fields: ["client_ids"],
    category: "client"
  },
  ExternalUser: {
    tuw: "RS-4-T06",
    owner_module: "client-portal",
    required_fields: ["tenant_id", "external_user_id", "party_id", "display_name", "status"],
    blocked_fields: ["employee_id", "internal_user_id"],
    category: "identity"
  },
  Matter: {
    tuw: "RS-4-T07",
    owner_module: "matter",
    required_fields: ["tenant_id", "matter_id", "client_id", "title", "status"],
    category: "matter"
  },
  MatterMember: {
    tuw: "RS-4-T08",
    owner_module: "matter",
    required_fields: ["tenant_id", "matter_member_id", "matter_id", "role", "status"],
    one_of: [["employee_id", "user_id"]],
    category: "matter"
  },
  Party: {
    tuw: "RS-4-T09",
    owner_module: "master-data",
    required_fields: ["tenant_id", "party_id", "party_type", "display_name", "status"],
    category: "party"
  },
  ContactRole: {
    tuw: "RS-4-T09",
    owner_module: "master-data",
    required_fields: ["tenant_id", "contact_role_id", "party_id", "matter_id", "role", "status"],
    category: "party"
  },
  Document: {
    tuw: "RS-4-T10",
    owner_module: "dms",
    required_fields: ["tenant_id", "document_id", "matter_id", "title", "status", "classification_envelope_id"],
    category: "document"
  },
  DocumentVersion: {
    tuw: "RS-4-T10",
    owner_module: "dms",
    required_fields: ["tenant_id", "document_version_id", "document_id", "version_number", "content_hash", "status"],
    category: "document"
  },
  EmailThread: {
    tuw: "RS-4-T11",
    owner_module: "email-dms",
    required_fields: ["tenant_id", "thread_id", "matter_id", "subject", "status"],
    category: "email"
  },
  EmailMessage: {
    tuw: "RS-4-T11",
    owner_module: "email-dms",
    required_fields: ["tenant_id", "message_id", "thread_id", "sent_at", "subject", "status"],
    category: "email"
  },
  Task: {
    tuw: "RS-4-T12",
    owner_module: "matter",
    required_fields: ["tenant_id", "task_id", "matter_id", "title", "status"],
    category: "work"
  },
  Deadline: {
    tuw: "RS-4-T12",
    owner_module: "matter",
    required_fields: ["tenant_id", "deadline_id", "matter_id", "title", "due_at", "status"],
    category: "work"
  },
  Event: {
    tuw: "RS-4-T12",
    owner_module: "matter",
    required_fields: ["tenant_id", "event_id", "matter_id", "title", "starts_at", "status"],
    category: "work"
  },
  Issue: {
    tuw: "RS-4-T13",
    owner_module: "matter",
    required_fields: ["tenant_id", "issue_id", "matter_id", "title", "status"],
    category: "matter"
  },
  MatterWiki: {
    tuw: "RS-4-T14",
    owner_module: "matter",
    required_fields: ["tenant_id", "wiki_id", "matter_id", "snapshot_version", "status"],
    category: "knowledge"
  },
  VaultSnapshot: {
    tuw: "RS-4-T15",
    owner_module: "dms",
    required_fields: ["tenant_id", "vault_snapshot_id", "matter_id", "workspace_id", "snapshot_hash", "status"],
    category: "document"
  },
  ClassificationEnvelope: {
    tuw: "RS-4-T16",
    owner_module: "authz",
    required_fields: ["tenant_id", "classification_envelope_id", "classification", "privilege", "legal_hold", "retention_policy_id", "permission_envelope_id"],
    category: "security"
  }
});

export const CANONICAL_MODEL_TUW_OBJECT_MAP = deepFreeze(
  Object.entries(CANONICAL_OBJECT_DEFINITIONS).reduce((map, [objectType, definition]) => {
    const next = map[definition.tuw] ?? [];
    return { ...map, [definition.tuw]: [...next, objectType] };
  }, {
    "RS-4-T01": ["Tenant", "User", "Employee", "Matter", "Document", "ClassificationEnvelope"],
    "RS-4-T17": ["Client", "Matter", "Document", "EmailThread", "Task", "MatterWiki"],
    "RS-4-T18": ["canonical seed fixture"],
    "RS-4-T19": ["migration compatibility projection"],
    "RS-4-T20": ["G4 evidence packet"]
  })
);

export function listCanonicalObjectDefinitions() {
  return Object.freeze(Object.entries(CANONICAL_OBJECT_DEFINITIONS).map(([object_type, definition]) => Object.freeze({ object_type, ...definition })));
}

export function getCanonicalObjectDefinition(objectType) {
  return CANONICAL_OBJECT_DEFINITIONS[objectType] ?? null;
}

export function requiredCanonicalObjectTypes() {
  return Object.freeze(Object.keys(CANONICAL_OBJECT_DEFINITIONS));
}
