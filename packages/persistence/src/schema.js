export const PERSISTENCE_SCHEMA_VERSION = "law-firm-os.persistence-schema.v0.1";

export const PERSISTENCE_TABLES = Object.freeze([
  "runtime_tenants",
  "runtime_migration_history",
  "runtime_records",
  "runtime_idempotency_keys",
  "runtime_outbox_events"
]);

export const TENANT_STATUS = Object.freeze(["active", "suspended", "archived"]);
export const RUNTIME_RECORD_STATUS = Object.freeze(["active", "archived", "deleted"]);
export const OUTBOX_EVENT_STATUS = Object.freeze(["pending", "published", "failed"]);

export function createTenantRecord(input = {}) {
  const tenant = {
    tenant_id: input.tenant_id,
    name: input.name,
    region: input.region ?? "synthetic",
    edition: input.edition ?? "synthetic-internal",
    status: input.status ?? "active",
    data_residency_policy: input.data_residency_policy ?? "synthetic-only",
    created_at: input.created_at ?? new Date(0).toISOString()
  };
  if (typeof tenant.tenant_id !== "string" || tenant.tenant_id.trim() === "") {
    throw new TypeError("tenant_id is required");
  }
  if (typeof tenant.name !== "string" || tenant.name.trim() === "") {
    throw new TypeError("tenant name is required");
  }
  if (!TENANT_STATUS.includes(tenant.status)) {
    throw new TypeError(`invalid tenant status: ${tenant.status}`);
  }
  return Object.freeze(tenant);
}

export const TENANT_BASE_SCHEMA = Object.freeze({
  schema_version: PERSISTENCE_SCHEMA_VERSION,
  table: "runtime_tenants",
  tenant_scoped: true,
  columns: Object.freeze([
    "tenant_id",
    "name",
    "region",
    "edition",
    "status",
    "data_residency_policy",
    "created_at"
  ])
});

export function createRuntimeRecord(input = {}) {
  const now = input.created_at ?? new Date(0).toISOString();
  const record = {
    tenant_id: input.tenant_id,
    record_id: input.record_id,
    object_type: input.object_type,
    payload: input.payload ?? {},
    status: input.status ?? "active",
    retention_class: input.retention_class ?? "standard",
    created_at: now,
    updated_at: input.updated_at ?? now,
    archived_at: input.archived_at,
    deleted_at: input.deleted_at
  };
  if (typeof record.tenant_id !== "string" || record.tenant_id.trim() === "") {
    throw new TypeError("runtime record tenant_id is required");
  }
  if (typeof record.record_id !== "string" || record.record_id.trim() === "") {
    throw new TypeError("runtime record_id is required");
  }
  if (typeof record.object_type !== "string" || record.object_type.trim() === "") {
    throw new TypeError("runtime record object_type is required");
  }
  if (!RUNTIME_RECORD_STATUS.includes(record.status)) {
    throw new TypeError(`invalid runtime record status: ${record.status}`);
  }
  if (record.status === "deleted" && typeof record.deleted_at !== "string") {
    throw new TypeError("deleted runtime records require deleted_at");
  }
  return Object.freeze(record);
}

export function createIdempotencyRecord(input = {}) {
  const record = {
    tenant_id: input.tenant_id,
    key: input.key,
    request_hash: input.request_hash,
    result_ref: input.result_ref,
    status: input.status ?? "completed",
    created_at: input.created_at ?? new Date(0).toISOString()
  };
  if (typeof record.tenant_id !== "string" || record.tenant_id.trim() === "") {
    throw new TypeError("idempotency tenant_id is required");
  }
  if (typeof record.key !== "string" || record.key.trim() === "") {
    throw new TypeError("idempotency key is required");
  }
  if (typeof record.request_hash !== "string" || record.request_hash.trim() === "") {
    throw new TypeError("idempotency request_hash is required");
  }
  return Object.freeze(record);
}

export function createOutboxEvent(input = {}) {
  const event = {
    tenant_id: input.tenant_id,
    event_id: input.event_id,
    topic: input.topic,
    payload: input.payload ?? {},
    status: input.status ?? "pending",
    created_at: input.created_at ?? new Date(0).toISOString(),
    published_at: input.published_at
  };
  if (typeof event.tenant_id !== "string" || event.tenant_id.trim() === "") {
    throw new TypeError("outbox tenant_id is required");
  }
  if (typeof event.event_id !== "string" || event.event_id.trim() === "") {
    throw new TypeError("outbox event_id is required");
  }
  if (typeof event.topic !== "string" || event.topic.trim() === "") {
    throw new TypeError("outbox topic is required");
  }
  if (!OUTBOX_EVENT_STATUS.includes(event.status)) {
    throw new TypeError(`invalid outbox status: ${event.status}`);
  }
  return Object.freeze(event);
}

export const TENANT_DATA_SPINE_SCHEMA = Object.freeze({
  schema_version: PERSISTENCE_SCHEMA_VERSION,
  tables: Object.freeze([
    {
      table: "runtime_records",
      tenant_scoped: true,
      lifecycle_fields: Object.freeze(["status", "archived_at", "deleted_at", "retention_class"])
    },
    {
      table: "runtime_idempotency_keys",
      tenant_scoped: true,
      unique: Object.freeze(["tenant_id", "key"])
    },
    {
      table: "runtime_outbox_events",
      tenant_scoped: true,
      atomic_with_transaction: true
    }
  ])
});
