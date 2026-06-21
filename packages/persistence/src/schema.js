export const PERSISTENCE_SCHEMA_VERSION = "law-firm-os.persistence-schema.v0.1";

export const PERSISTENCE_TABLES = Object.freeze([
  "runtime_tenants",
  "runtime_migration_history"
]);

export const TENANT_STATUS = Object.freeze(["active", "suspended", "archived"]);

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
