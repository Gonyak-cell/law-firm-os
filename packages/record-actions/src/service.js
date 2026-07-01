import { validateMatterCode } from "../../matter/src/canonical-identity-service.js";

const OBJECT_ALIASES = Object.freeze({
  client: "client",
  clients: "client",
  clientgroup: "client",
  client_group: "client",
  account: "account",
  accounts: "account",
  contact: "contact",
  contacts: "contact",
  matter: "matter",
  matters: "matter",
});

const FIELD_OPTIONS = Object.freeze({
  crm_status: Object.freeze(["active", "review_required", "inactive"]),
  client_status: Object.freeze(["active", "inactive", "archived"]),
  matter_wip_status: Object.freeze(["not_started", "opening_wip_clear", "review_required", "completed"]),
  matter_risk_level: Object.freeze(["standard", "elevated", "high"]),
  matter_status: Object.freeze(["opening", "open", "closed"]),
});

const FIELD_DEFINITIONS = Object.freeze({
  client: Object.freeze([
    Object.freeze({ field: "display_name", label: "Client name", input_type: "text", max_length: 120 }),
    Object.freeze({ field: "status", label: "Client status", input_type: "select", options: FIELD_OPTIONS.client_status }),
  ]),
  account: Object.freeze([
    Object.freeze({ field: "display_name", label: "Account name", input_type: "text", max_length: 120 }),
    Object.freeze({ field: "status", label: "Account status", input_type: "select", options: FIELD_OPTIONS.crm_status }),
  ]),
  contact: Object.freeze([
    Object.freeze({ field: "display_name", label: "Contact name", input_type: "text", max_length: 120 }),
    Object.freeze({ field: "status", label: "Contact status", input_type: "select", options: FIELD_OPTIONS.crm_status }),
  ]),
  matter: Object.freeze([
    Object.freeze({ field: "title", label: "Matter title", input_type: "text", max_length: 120 }),
    Object.freeze({ field: "matter_code", label: "Matter code", input_type: "text", max_length: 120, validator: "matter_code" }),
    Object.freeze({ field: "wip_status", label: "WIP status", input_type: "select", options: FIELD_OPTIONS.matter_wip_status }),
    Object.freeze({ field: "risk_level", label: "Risk level", input_type: "select", options: FIELD_OPTIONS.matter_risk_level }),
  ]),
});

const OBJECT_CONFIG = Object.freeze({
  client: Object.freeze({
    object_name: "client",
    model_type: "ClientGroup",
    id_field: "client_group_id",
    repository: "masterData",
    audit_repository: "crm",
    resource_type: "client_group",
    label: "Client",
  }),
  account: Object.freeze({
    object_name: "account",
    model_type: "Account",
    id_field: "resource_id",
    repository: "crm",
    audit_repository: "crm",
    resource_type: "crm_account",
    label: "Account",
  }),
  contact: Object.freeze({
    object_name: "contact",
    model_type: "Contact",
    id_field: "resource_id",
    repository: "crm",
    audit_repository: "crm",
    resource_type: "crm_contact",
    label: "Contact",
  }),
  matter: Object.freeze({
    object_name: "matter",
    model_type: "Matter",
    id_field: "matter_id",
    repository: "matter",
    audit_repository: "matter",
    resource_type: "matter",
    label: "Matter",
  }),
});

export const RECORD_ACTION_OBJECTS = Object.freeze(Object.keys(OBJECT_CONFIG));

export function normalizeRecordActionObject(value) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[-\s]/g, "_");
  return OBJECT_ALIASES[key] ?? null;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function repositoryFor(config, repositories) {
  if (config.repository === "matter") return repositories.matterRepository;
  if (config.repository === "crm") return repositories.crmRepository;
  if (config.repository === "masterData") return repositories.masterDataRepository;
  return null;
}

function auditRepositoryFor(config, repositories) {
  if (config.audit_repository === "matter") return repositories.matterRepository;
  if (config.audit_repository === "crm") return repositories.crmRepository;
  return repositoryFor(config, repositories);
}

function refFor(config, tenantId, recordId) {
  if (config.repository === "crm") {
    return { tenant_id: tenantId, model_type: config.model_type, resource_id: recordId };
  }
  return { tenant_id: tenantId, model_type: config.model_type, [config.id_field]: recordId };
}

function assertTenant(tenantId) {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new TypeError("tenant_id is required");
}

function assertRecordId(recordId) {
  if (typeof recordId !== "string" || recordId.trim() === "") throw new TypeError("record_id is required");
}

function assertActor(actorId) {
  if (typeof actorId !== "string" || actorId.trim() === "") throw new TypeError("actor_id is required");
}

function validateText(value, maxLength = 120) {
  const text = String(value ?? "").trim();
  if (text.length < 2 || text.length > maxLength) throw new TypeError("invalid text field");
  return text;
}

function validateFieldText(definition, value) {
  if (definition.validator === "matter_code") {
    const validation = validateMatterCode(value);
    if (!validation.valid) throw new TypeError(`invalid matter_code: ${validation.errors.join(",")}`);
    return validation.matter_code;
  }
  return validateText(value, definition.max_length);
}

function normalizeAllowedPatch(objectName, fieldUpdates = {}) {
  const allowed = new Map(FIELD_DEFINITIONS[objectName].map((field) => [field.field, field]));
  const patch = {};
  const changedFields = [];
  for (const [field, value] of Object.entries(fieldUpdates ?? {})) {
    const definition = allowed.get(field);
    if (!definition) throw new TypeError(`Unsupported field ${field}`);
    if (definition.input_type === "text") patch[field] = validateFieldText(definition, value);
    else if (definition.input_type === "select") {
      if (!definition.options.includes(value)) throw new TypeError(`Unsupported option for ${field}`);
      patch[field] = value;
    } else {
      throw new TypeError(`Unsupported input type for ${field}`);
    }
    changedFields.push(field);
  }
  if (changedFields.length === 0) throw new TypeError("field_updates are required");
  return Object.freeze({ patch: Object.freeze(patch), changed_fields: Object.freeze(changedFields) });
}

function normalizeStatusPatch(objectName, status) {
  const options = objectName === "matter"
    ? FIELD_OPTIONS.matter_status
    : objectName === "client"
      ? FIELD_OPTIONS.client_status
      : FIELD_OPTIONS.crm_status;
  if (!options.includes(status)) throw new TypeError("Unsupported status");
  return Object.freeze({ patch: Object.freeze({ status }), changed_fields: Object.freeze(["status"]) });
}

function readRecord(config, repositories, tenantId, recordId) {
  const repository = repositoryFor(config, repositories);
  if (!repository) throw new TypeError("repository is required");
  return repository.get(refFor(config, tenantId, recordId));
}

function updateRecord(config, repositories, tenantId, recordId, patch) {
  const repository = repositoryFor(config, repositories);
  if (!repository) throw new TypeError("repository is required");
  return repository.update(refFor(config, tenantId, recordId), patch);
}

function displayOf(record = {}) {
  return record.display_name ?? record.client_name ?? record.name ?? record.title ?? "Record";
}

function safeRecord(config, record = {}) {
  const recordId = record[config.id_field] ?? record.resource_id ?? record.id;
  const common = {
    object_name: config.object_name,
    record_id: recordId,
    display_label: displayOf(record),
    status: record.status ?? null,
    raw_tenant_id_included: false,
    raw_user_id_included: false,
    raw_contact_value_included: false,
    production_ready_claim: false,
  };
  if (config.object_name === "matter") {
    return Object.freeze({
      ...common,
      title: record.title ?? null,
      matter_code: record.matter_code ?? null,
      wip_status: record.wip_status ?? null,
      risk_level: record.risk_level ?? null,
      owner_display_name: record.owner_display_name ?? null,
    });
  }
  if (config.object_name === "client") {
    return Object.freeze({
      ...common,
      member_count: Array.isArray(record.member_entity_ids) ? record.member_entity_ids.length : 0,
      primary_party_included: Boolean(record.primary_party_id),
    });
  }
  return Object.freeze({
    ...common,
    canonical_sync_state: record.canonical_sync_state ?? null,
    direct_matter_reference_included: false,
  });
}

function appendActionAudit(config, repositories, input = {}) {
  const repository = auditRepositoryFor(config, repositories);
  if (!repository?.appendAudit) throw new TypeError("audit repository is required");
  const occurredAt = input.occurred_at ?? new Date().toISOString();
  return repository.appendAudit({
    event_id: input.event_id,
    tenant_id: input.tenant_id,
    actor_id: input.actor_id,
    action: input.action,
    object_type: input.object_type ?? config.label,
    object_id: input.record_id,
    reason: input.reason ?? "record_action",
    occurred_at: occurredAt,
    metadata: {
      object_name: config.object_name,
      changed_fields: input.changed_fields ?? [],
      permission_ref: input.permission_ref,
      field_level_allowlist: true,
      bulk_action_ref: input.bulk_action_ref ?? null,
      raw_values_included: false,
    },
  });
}

function safeAuditEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id,
    action: event.action,
    object_type: event.object_type ?? null,
    object_id: event.object_id ?? null,
    reason: event.reason ?? null,
    occurred_at: event.occurred_at ?? null,
    changed_fields: event.metadata?.changed_fields ?? [],
    actor_ref_included: false,
    raw_values_included: false,
    production_ready_claim: false,
  });
}

export function createRecordActionService({ matterRepository, crmRepository, masterDataRepository } = {}) {
  const repositories = { matterRepository, crmRepository, masterDataRepository };

  function configFor(objectName) {
    const normalized = normalizeRecordActionObject(objectName);
    if (!normalized || !OBJECT_CONFIG[normalized]) throw new TypeError("Unsupported record action object");
    return OBJECT_CONFIG[normalized];
  }

  function registryFor(objectName) {
    const config = configFor(objectName);
    return Object.freeze({
      object_name: config.object_name,
      resource_type: config.resource_type,
      fields: Object.freeze(FIELD_DEFINITIONS[config.object_name].map((field) => Object.freeze(clone(field)))),
      unsafe_fields_omitted: Object.freeze(["tenant_id", "owner_user_id", "registration_number", "email", "contact_point_value", "matter_create_command"]),
      production_ready_claim: false,
    });
  }

  function bulkRegistryFor(objectName) {
    const config = configFor(objectName);
    const actions = [
      Object.freeze({ action_type: "field_update", label: "Bulk field update", route_mounted: true, owner_approval_required: false }),
      Object.freeze({ action_type: "status_update", label: "Bulk status update", route_mounted: true, owner_approval_required: false }),
      Object.freeze({ action_type: "owner_change", label: "Bulk owner change", route_mounted: true, owner_approval_required: true }),
      Object.freeze({ action_type: "export_request", label: "Export request", route_mounted: true, owner_approval_required: true }),
    ];
    return Object.freeze({
      object_name: config.object_name,
      actions: Object.freeze(actions),
      all_or_blocked: true,
      safe_counts_only: true,
      production_ready_claim: false,
    });
  }

  function patchRecord({ objectName, tenant_id, record_id, field_updates, actor_id, permission_ref, audit_hint_ref, reason, occurred_at } = {}) {
    const config = configFor(objectName);
    assertTenant(tenant_id);
    assertRecordId(record_id);
    assertActor(actor_id);
    const normalized = normalizeAllowedPatch(config.object_name, field_updates);
    const current = readRecord(config, repositories, tenant_id, record_id);
    if (!current) throw new Error("record not found");
    const updated = updateRecord(config, repositories, tenant_id, record_id, {
      ...normalized.patch,
      updated_by: actor_id,
      updated_at: occurred_at ?? new Date().toISOString(),
      permission_ref,
      audit_hint_ref,
      production_ready_claim: false,
    });
    const audit = appendActionAudit(config, repositories, {
      event_id: `record_action.field_updated:${tenant_id}:${config.object_name}:${record_id}:${normalized.changed_fields.join("_")}`,
      tenant_id,
      actor_id,
      action: "record_action.field_updated",
      record_id,
      reason: reason ?? "record_field_update",
      occurred_at,
      changed_fields: normalized.changed_fields,
      permission_ref,
    });
    return Object.freeze({
      item: safeRecord(config, updated),
      field_patch: Object.freeze({
        changed_fields: normalized.changed_fields,
        field_level_allowlist: true,
      }),
      audit_event: safeAuditEvent(audit),
    });
  }

  function bulkUpdate({ objectName, tenant_id, record_ids = [], action_type, field_updates, target_status, actor_id, permission_ref, audit_hint_ref, reason, occurred_at, bulk_action_ref } = {}) {
    const config = configFor(objectName);
    assertTenant(tenant_id);
    assertActor(actor_id);
    const ids = [...new Set(record_ids.map((id) => String(id ?? "").trim()).filter(Boolean))];
    if (ids.length === 0 || ids.length > 25) throw new TypeError("record_ids must include 1-25 records");
    const safeBulkRef = String(bulk_action_ref ?? `record-action-bulk-${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    if (action_type === "owner_change" || action_type === "export_request") {
      const audit = appendActionAudit(config, repositories, {
        event_id: `record_action.${action_type}.blocked:${tenant_id}:${config.object_name}:${safeBulkRef}`,
        tenant_id,
        actor_id,
        action: `record_action.${action_type}.blocked`,
        record_id: safeBulkRef,
        reason: reason ?? "owner_decision_required",
        occurred_at,
        changed_fields: [],
        permission_ref,
        bulk_action_ref: safeBulkRef,
      });
      return Object.freeze({
        outcome: "owner_approval_required",
        ui_state: "owner_blocked",
        bulk_action: Object.freeze({
          object_name: config.object_name,
          action_type,
          requested_count: ids.length,
          applied_count: 0,
          blocked_count: ids.length,
          all_or_blocked: true,
          owner_approval_required: true,
          provider_approval_required: action_type === "export_request",
        }),
        audit_event: safeAuditEvent(audit),
      });
    }
    const normalized = action_type === "status_update"
      ? normalizeStatusPatch(config.object_name, target_status)
      : normalizeAllowedPatch(config.object_name, field_updates);
    const records = ids.map((id) => {
      const record = readRecord(config, repositories, tenant_id, id);
      if (!record) throw new Error(`record not found: ${id}`);
      return { id, record };
    });
    const updated = records.map(({ id }) =>
      updateRecord(config, repositories, tenant_id, id, {
        ...normalized.patch,
        updated_by: actor_id,
        updated_at: occurred_at ?? new Date().toISOString(),
        permission_ref,
        audit_hint_ref,
        production_ready_claim: false,
      })
    );
    const audit = appendActionAudit(config, repositories, {
      event_id: `record_action.${action_type}.completed:${tenant_id}:${config.object_name}:${safeBulkRef}`,
      tenant_id,
      actor_id,
      action: `record_action.${action_type}.completed`,
      record_id: safeBulkRef,
      reason: reason ?? "bulk_record_action",
      occurred_at,
      changed_fields: normalized.changed_fields,
      permission_ref,
      bulk_action_ref: safeBulkRef,
    });
    return Object.freeze({
      outcome: "updated",
      ui_state: null,
      items: Object.freeze(updated.map((record) => safeRecord(config, record))),
      bulk_action: Object.freeze({
        object_name: config.object_name,
        action_type,
        requested_count: ids.length,
        applied_count: updated.length,
        blocked_count: 0,
        all_or_blocked: true,
        changed_fields: normalized.changed_fields,
      }),
      audit_event: safeAuditEvent(audit),
    });
  }

  function listAudit({ objectName, tenant_id, record_id } = {}) {
    const config = configFor(objectName);
    assertTenant(tenant_id);
    assertRecordId(record_id);
    const repository = auditRepositoryFor(config, repositories);
    if (!repository?.listAudit) throw new TypeError("audit repository is required");
    const events = repository
      .listAudit({ tenant_id, object_id: record_id })
      .filter((event) => String(event.action ?? "").startsWith("record_action."))
      .map((event) => safeAuditEvent(event));
    return Object.freeze({
      object_name: config.object_name,
      record_id,
      items: Object.freeze(events),
      safe_counts_only: true,
      production_ready_claim: false,
    });
  }

  return Object.freeze({
    registryFor,
    bulkRegistryFor,
    patchRecord,
    bulkUpdate,
    listAudit,
  });
}
