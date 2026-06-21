import { createRuntimeRecord } from "./schema.js";
import { markLifecycleArchived, markLifecycleDeleted, isVisibleLifecycleRecord } from "./lifecycle.js";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requireTenantId(tenantId) {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new TypeError("tenant_id is required for tenant-scoped repository access");
  }
  return tenantId;
}

function sameIdentity(left, right) {
  return left.tenant_id === right.tenant_id && left.record_id === right.record_id;
}

export function createTenantScopedRepository({ connection, objectType } = {}) {
  if (!connection || typeof connection.select !== "function" || typeof connection.insert !== "function") {
    throw new TypeError("Runtime Spine persistence connection is required");
  }
  if (typeof objectType !== "string" || objectType.trim() === "") {
    throw new TypeError("objectType is required");
  }

  function allRecords() {
    return connection.select("runtime_records").filter((record) => record.object_type === objectType);
  }

  function replaceAll(nextRecords) {
    const otherRecords = connection.select("runtime_records").filter((record) => record.object_type !== objectType);
    connection.replaceTable("runtime_records", [...otherRecords, ...nextRecords]);
  }

  return Object.freeze({
    object_type: objectType,
    tenant_scoped: true,

    create({ tenant_id, record_id, payload = {}, retention_class, created_at } = {}) {
      requireTenantId(tenant_id);
      const record = createRuntimeRecord({ tenant_id, record_id, object_type: objectType, payload, retention_class, created_at });
      if (allRecords().some((current) => sameIdentity(current, record))) {
        throw new Error(`${objectType} already exists for tenant: ${record_id}`);
      }
      return connection.insert("runtime_records", record);
    },

    get({ tenant_id, record_id, includeDeleted = false } = {}) {
      requireTenantId(tenant_id);
      const record = allRecords().find((current) => current.tenant_id === tenant_id && current.record_id === record_id);
      return record && isVisibleLifecycleRecord(record, { includeDeleted }) ? Object.freeze(clone(record)) : undefined;
    },

    list({ tenant_id, includeDeleted = false, includeArchived = true } = {}) {
      requireTenantId(tenant_id);
      return Object.freeze(
        allRecords()
          .filter((record) => record.tenant_id === tenant_id)
          .filter((record) => isVisibleLifecycleRecord(record, { includeDeleted, includeArchived }))
          .map((record) => Object.freeze(clone(record))),
      );
    },

    update({ tenant_id, record_id, patch = {}, updated_at } = {}) {
      requireTenantId(tenant_id);
      const records = allRecords();
      const index = records.findIndex((current) => current.tenant_id === tenant_id && current.record_id === record_id);
      if (index === -1) throw new Error(`${objectType} not found for tenant: ${record_id}`);
      const current = records[index];
      const next = createRuntimeRecord({
        ...current,
        payload: { ...current.payload, ...patch },
        updated_at: updated_at ?? new Date(0).toISOString()
      });
      records[index] = next;
      replaceAll(records);
      return Object.freeze(clone(next));
    },

    archive({ tenant_id, record_id, archived_at } = {}) {
      requireTenantId(tenant_id);
      const records = allRecords();
      const index = records.findIndex((current) => current.tenant_id === tenant_id && current.record_id === record_id);
      if (index === -1) throw new Error(`${objectType} not found for tenant: ${record_id}`);
      const next = createRuntimeRecord(markLifecycleArchived(records[index], { now: archived_at }));
      records[index] = next;
      replaceAll(records);
      return Object.freeze(clone(next));
    },

    softDelete({ tenant_id, record_id, deleted_at } = {}) {
      requireTenantId(tenant_id);
      const records = allRecords();
      const index = records.findIndex((current) => current.tenant_id === tenant_id && current.record_id === record_id);
      if (index === -1) throw new Error(`${objectType} not found for tenant: ${record_id}`);
      const next = createRuntimeRecord(markLifecycleDeleted(records[index], { now: deleted_at }));
      records[index] = next;
      replaceAll(records);
      return Object.freeze(clone(next));
    }
  });
}
