import { createHash, randomUUID } from "node:crypto";

export const ADMIN_PERMISSION_MODEL = Object.freeze({
  permissionSet: "AdminPermissionSet",
  assignment: "AdminPermissionAssignment",
  objectDefinition: "AdminObjectDefinition",
  fieldPolicy: "AdminFieldPolicy",
  connectedApp: "AdminConnectedApp",
});

const DEFAULT_OBJECTS = Object.freeze([
  Object.freeze({
    object_name: "Client",
    label: "Client",
    field_names: ["display_name", "status", "owner_ref"],
  }),
  Object.freeze({
    object_name: "Matter",
    label: "Matter",
    field_names: ["title", "risk_level", "wip_status"],
  }),
]);

const DEFAULT_CONNECTED_APPS = Object.freeze([
  Object.freeze({ app_id: "connected_app_microsoft_graph", label: "Microsoft Graph", status: "disabled" }),
  Object.freeze({ app_id: "connected_app_teams", label: "Microsoft Teams", status: "disabled" }),
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function hashRef(value) {
  return createHash("sha256").update(String(value ?? "unknown")).digest("hex").slice(0, 12);
}

function assertTenant(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("tenant_id is required");
  return value.trim();
}

function assertActor(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("actor_id is required");
  return value.trim();
}

function assertId(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} is required`);
  return value.trim();
}

function listRecords(repository, tenantId, modelType) {
  return repository.list({ tenant_id: tenantId, model_type: modelType });
}

function getRecord(repository, tenantId, modelType, id) {
  return repository.get({ tenant_id: tenantId, model_type: modelType, resource_id: id });
}

function upsertRecord(repository, record) {
  return repository.upsert({ ...record, resource_id: record.resource_id ?? record.id });
}

function audit(repository, input = {}) {
  return repository.appendAudit({
    tenant_id: input.tenant_id,
    event_id: `admin_perm_audit_${randomUUID()}`,
    object_id: input.object_id ?? input.permission_set_id ?? input.assignment_id ?? input.app_id ?? input.object_name ?? "admin-permission",
    actor_ref: `actor:${hashRef(input.actor_id)}`,
    action: input.action,
    permission_ref: input.permission_ref,
    audit_hint_ref: input.audit_hint_ref,
    metadata: {
      owner_approval_required: Boolean(input.owner_approval_required),
      provider_receipt_required: Boolean(input.provider_receipt_required),
      raw_policy_json_included: false,
      direct_principal_identifiers_included: false,
      oauth_client_secret_included: false,
      provider_tokens_included: false,
      production_ready_claim: false,
    },
    created_at: nowIso(),
  });
}

function seedTenant(repository, tenantId) {
  if (listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.permissionSet).length === 0) {
    upsertRecord(repository, {
      tenant_id: tenantId,
      model_type: ADMIN_PERMISSION_MODEL.permissionSet,
      resource_id: "permission_set_client_matter_reviewer",
      permission_set_id: "permission_set_client_matter_reviewer",
      label: "Client/Matter Reviewer",
      description: "Review Client and Matter records without broad admin grants.",
      status: "active",
      rule_refs: ["client:read", "matter:read", "audit:read"],
      object_acl_refs: ["Client", "Matter"],
      owner_approval_required: false,
      wildcard_actions_allowed: false,
      created_by_actor_ref: "system:seed",
      raw_policy_json_included: false,
      production_ready_claim: false,
    });
  }
  if (listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.assignment).length === 0) {
    upsertRecord(repository, {
      tenant_id: tenantId,
      model_type: ADMIN_PERMISSION_MODEL.assignment,
      resource_id: "permission_assignment_reviewer_seed",
      assignment_id: "permission_assignment_reviewer_seed",
      permission_set_id: "permission_set_client_matter_reviewer",
      target_actor_ref: "actor:reviewer",
      target_label: "Client review group",
      status: "active",
      grant_applied: true,
      revoke_applied: false,
      direct_actor_identifier_included: false,
      production_ready_claim: false,
    });
  }
  for (const object of DEFAULT_OBJECTS) {
    upsertRecord(repository, {
      tenant_id: tenantId,
      model_type: ADMIN_PERMISSION_MODEL.objectDefinition,
      resource_id: object.object_name,
      object_name: object.object_name,
      label: object.label,
      field_names: object.field_names,
      schema_mutation_allowed: false,
      restricted_fields_exposed: false,
      production_ready_claim: false,
    });
    for (const fieldName of object.field_names) {
      const resourceId = `${object.object_name}:${fieldName}`;
      if (!getRecord(repository, tenantId, ADMIN_PERMISSION_MODEL.fieldPolicy, resourceId)) {
        upsertRecord(repository, {
          tenant_id: tenantId,
          model_type: ADMIN_PERMISSION_MODEL.fieldPolicy,
          resource_id: resourceId,
          object_name: object.object_name,
          field_name: fieldName,
          label: fieldName.replace(/_/g, " "),
          visibility: "visible",
          permission_ref: `${object.object_name.toLowerCase()}:${fieldName}:read`,
          owner_approval_required: false,
          physical_schema_mutated: false,
          restricted_fields_exposed: false,
          production_ready_claim: false,
        });
      }
    }
  }
  if (listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.connectedApp).length === 0) {
    for (const app of DEFAULT_CONNECTED_APPS) {
      upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: ADMIN_PERMISSION_MODEL.connectedApp,
        resource_id: app.app_id,
        app_id: app.app_id,
        label: app.label,
        status: app.status,
        provider_configured: false,
        provider_revocation_receipt_required: true,
        oauth_client_secret_included: false,
        provider_tokens_included: false,
        production_ready_claim: false,
      });
    }
  }
}

function safeAuditEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id,
    object_id: event.object_id,
    action: event.action,
    actor_ref_included: false,
    raw_policy_json_included: false,
    direct_principal_identifiers_included: false,
    oauth_client_secret_included: false,
    provider_tokens_included: false,
    production_ready_claim: false,
  });
}

function safePermissionSet(record = {}) {
  return Object.freeze({
    permission_set_id: record.permission_set_id,
    label: record.label,
    description: record.description,
    status: record.status,
    rule_count: Array.isArray(record.rule_refs) ? record.rule_refs.length : 0,
    object_acl_count: Array.isArray(record.object_acl_refs) ? record.object_acl_refs.length : 0,
    owner_approval_required: Boolean(record.owner_approval_required),
    wildcard_actions_allowed: Boolean(record.wildcard_actions_allowed),
    raw_policy_json_included: false,
    direct_principal_identifiers_included: false,
    production_ready_claim: false,
  });
}

function safeAssignment(record = {}) {
  return Object.freeze({
    assignment_id: record.assignment_id,
    permission_set_id: record.permission_set_id,
    target_label: record.target_label,
    status: record.status,
    ui_state: record.ui_state ?? (record.status === "owner_blocked" ? "owner_blocked" : "active"),
    grant_applied: record.grant_applied === true,
    revoke_applied: record.revoke_applied === true,
    direct_actor_identifier_included: false,
    production_ready_claim: false,
  });
}

function safeObject(record = {}) {
  return Object.freeze({
    object_name: record.object_name,
    label: record.label,
    field_count: Array.isArray(record.field_names) ? record.field_names.length : 0,
    schema_mutation_allowed: false,
    restricted_fields_exposed: false,
    production_ready_claim: false,
  });
}

function safeFieldPolicy(record = {}) {
  return Object.freeze({
    object_name: record.object_name,
    field_name: record.field_name,
    label: record.label,
    visibility: record.visibility,
    permission_ref: record.permission_ref,
    ui_state: record.ui_state ?? "active",
    owner_approval_required: Boolean(record.owner_approval_required),
    physical_schema_mutated: false,
    restricted_fields_exposed: false,
    production_ready_claim: false,
  });
}

function safeConnectedApp(record = {}) {
  return Object.freeze({
    app_id: record.app_id,
    label: record.label,
    status: record.status,
    ui_state: record.ui_state ?? "provider_blocked",
    provider_configured: false,
    provider_revocation_applied: false,
    provider_revocation_receipt_required: true,
    oauth_client_secret_included: false,
    provider_tokens_included: false,
    production_ready_claim: false,
  });
}

export function createPermissionAdminSetupService({ repository } = {}) {
  if (!repository) throw new TypeError("repository is required");

  return Object.freeze({
    listPermissionSets({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.permissionSet).map(safePermissionSet));
    },

    createPermissionSet(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const permissionSetId = assertId(input.permission_set_id ?? `permission_set_${randomUUID()}`, "permission_set_id");
      const ruleRefs = Array.isArray(input.rule_refs) ? input.rule_refs.map(String) : ["client:read", "matter:read"];
      const wildcardRequested = ruleRefs.some((rule) => rule.includes("*"));
      if (wildcardRequested && input.owner_policy_allows_wildcard !== true) {
        throw new TypeError("wildcard actions require owner policy");
      }
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: ADMIN_PERMISSION_MODEL.permissionSet,
        resource_id: permissionSetId,
        permission_set_id: permissionSetId,
        label: String(input.label ?? "Client/Matter Access Review").slice(0, 120),
        description: String(input.description ?? "Owner-reviewed Client/Matter permission set").slice(0, 240),
        status: "owner_review_required",
        rule_refs: ruleRefs,
        object_acl_refs: Array.isArray(input.object_acl_refs) ? input.object_acl_refs.map(String) : ["Client", "Matter"],
        owner_approval_required: true,
        wildcard_actions_allowed: wildcardRequested,
        created_by_actor_ref: `actor:${hashRef(actorId)}`,
        raw_policy_json_included: false,
        direct_principal_identifiers_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.permission_set.created",
        permission_set_id: permissionSetId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_approval_required: true,
      });
      return Object.freeze({ permission_set: safePermissionSet(record), audit_event: safeAuditEvent(auditEvent) });
    },

    patchPermissionSet(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const permissionSetId = assertId(input.permission_set_id, "permission_set_id");
      seedTenant(repository, tenantId);
      const current = getRecord(repository, tenantId, ADMIN_PERMISSION_MODEL.permissionSet, permissionSetId);
      if (!current) throw new TypeError("permission set not found");
      const patch = input.patch ?? {};
      const ruleRefs = Array.isArray(patch.rule_refs) ? patch.rule_refs.map(String) : current.rule_refs;
      const wildcardRequested = ruleRefs.some((rule) => rule.includes("*"));
      if (wildcardRequested && input.owner_policy_allows_wildcard !== true) {
        throw new TypeError("wildcard actions require owner policy");
      }
      const record = upsertRecord(repository, {
        ...current,
        label: patch.label ? String(patch.label).slice(0, 120) : current.label,
        description: patch.description ? String(patch.description).slice(0, 240) : current.description,
        status: patch.status ? String(patch.status).slice(0, 80) : "owner_review_required",
        rule_refs: ruleRefs,
        owner_approval_required: true,
        wildcard_actions_allowed: wildcardRequested,
        raw_policy_json_included: false,
        direct_principal_identifiers_included: false,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.permission_set.patched",
        permission_set_id: permissionSetId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_approval_required: true,
      });
      return Object.freeze({ permission_set: safePermissionSet(record), audit_event: safeAuditEvent(auditEvent) });
    },

    listAssignments({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.assignment).map(safeAssignment));
    },

    assignPermissionSet(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const assignmentId = assertId(input.assignment_id ?? `permission_assignment_${randomUUID()}`, "assignment_id");
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: ADMIN_PERMISSION_MODEL.assignment,
        resource_id: assignmentId,
        assignment_id: assignmentId,
        permission_set_id: assertId(input.permission_set_id, "permission_set_id"),
        target_actor_ref: `actor:${hashRef(input.target_actor_id ?? input.target_label ?? "target")}`,
        target_label: String(input.target_label ?? "Owner-reviewed group").slice(0, 120),
        status: "owner_blocked",
        ui_state: "owner_blocked",
        grant_applied: false,
        revoke_applied: false,
        owner_approval_required: true,
        direct_actor_identifier_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.permission_assignment.owner_blocked",
        assignment_id: assignmentId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_approval_required: true,
      });
      return Object.freeze({ assignment: safeAssignment(record), audit_event: safeAuditEvent(auditEvent) });
    },

    revokePermissionSetAssignment(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const assignmentId = assertId(input.assignment_id, "assignment_id");
      seedTenant(repository, tenantId);
      const current = getRecord(repository, tenantId, ADMIN_PERMISSION_MODEL.assignment, assignmentId);
      if (!current) throw new TypeError("permission assignment not found");
      const record = upsertRecord(repository, {
        ...current,
        status: "revoke_owner_blocked",
        ui_state: "owner_blocked",
        grant_applied: current.grant_applied === true,
        revoke_applied: false,
        owner_approval_required: true,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.permission_assignment.revoke_owner_blocked",
        assignment_id: assignmentId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_approval_required: true,
      });
      return Object.freeze({ assignment: safeAssignment(record), audit_event: safeAuditEvent(auditEvent) });
    },

    listObjects({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.objectDefinition).map(safeObject));
    },

    listObjectFields({ tenant_id, object_name }) {
      const tenantId = assertTenant(tenant_id);
      const objectName = assertId(object_name, "object_name");
      seedTenant(repository, tenantId);
      return Object.freeze(
        listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.fieldPolicy)
          .filter((record) => record.object_name === objectName)
          .map(safeFieldPolicy)
      );
    },

    patchObjectFieldPolicy(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const objectName = assertId(input.object_name, "object_name");
      const fieldName = assertId(input.field_name, "field_name");
      seedTenant(repository, tenantId);
      const current = getRecord(repository, tenantId, ADMIN_PERMISSION_MODEL.fieldPolicy, `${objectName}:${fieldName}`);
      if (!current) throw new TypeError("field policy not found");
      const record = upsertRecord(repository, {
        ...current,
        visibility: input.visibility ? String(input.visibility).slice(0, 80) : current.visibility,
        permission_ref: input.field_permission_ref ? String(input.field_permission_ref).slice(0, 120) : current.permission_ref,
        ui_state: "owner_blocked",
        owner_approval_required: true,
        physical_schema_mutated: false,
        restricted_fields_exposed: false,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.object_manager.field_policy.owner_blocked",
        object_id: `${objectName}:${fieldName}`,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_approval_required: true,
      });
      return Object.freeze({ field_policy: safeFieldPolicy(record), audit_event: safeAuditEvent(auditEvent) });
    },

    listConnectedApps({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, ADMIN_PERMISSION_MODEL.connectedApp).map(safeConnectedApp));
    },

    createConnectedApp(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const appId = assertId(input.app_id ?? `connected_app_${randomUUID()}`, "app_id");
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: ADMIN_PERMISSION_MODEL.connectedApp,
        resource_id: appId,
        app_id: appId,
        label: String(input.label ?? "Owner-reviewed connected app").slice(0, 120),
        status: "disabled",
        ui_state: "provider_blocked",
        provider_configured: false,
        provider_revocation_receipt_required: true,
        oauth_client_secret_included: false,
        provider_tokens_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.connected_app.created_provider_blocked",
        app_id: appId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        provider_receipt_required: true,
      });
      return Object.freeze({ connected_app: safeConnectedApp(record), audit_event: safeAuditEvent(auditEvent) });
    },

    disableConnectedApp(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const appId = assertId(input.app_id, "app_id");
      seedTenant(repository, tenantId);
      const current = getRecord(repository, tenantId, ADMIN_PERMISSION_MODEL.connectedApp, appId);
      if (!current) throw new TypeError("connected app not found");
      const record = upsertRecord(repository, {
        ...current,
        status: "disable_provider_blocked",
        ui_state: "provider_blocked",
        provider_configured: false,
        provider_revocation_applied: false,
        provider_revocation_receipt_required: true,
        oauth_client_secret_included: false,
        provider_tokens_included: false,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "admin.connected_app.disable_provider_blocked",
        app_id: appId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        provider_receipt_required: true,
      });
      return Object.freeze({ connected_app: safeConnectedApp(record), audit_event: safeAuditEvent(auditEvent) });
    },

    listAudit({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(repository.listAudit({ tenant_id: tenantId }).map(safeAuditEvent));
    },
  });
}
