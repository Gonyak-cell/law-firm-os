import { createHrxAuditEvent } from "./hrx-events.js";
import { attachHrxAuditHash } from "./hrx-hash-chain.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rowToEvent(row) {
  return Object.freeze({
    schema_version: row.schema_version,
    event_id: row.event_id,
    tenant_id: row.tenant_id,
    actor_id: row.actor_id,
    action: row.action,
    object_type: row.object_type,
    object_id: row.object_id,
    decision: row.decision,
    reason: row.reason,
    source: row.source,
    occurred_at: row.occurred_at,
    metadata: Object.freeze(JSON.parse(row.metadata_json ?? "{}")),
    previous_hash: row.previous_hash ?? null,
    event_hash: row.event_hash,
  });
}

export function createSqlHrxAuditEventStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL HRX audit store requires store.query");

  return Object.freeze({
    append(input) {
      const event = createHrxAuditEvent(input);
      const previous = store.query("select", { table: "hrx_audit_events", where: { tenant_id: event.tenant_id } }).at(-1);
      const chained = attachHrxAuditHash({ event, previousHash: previous?.event_hash ?? null });
      const row = {
        ...chained,
        metadata_json: JSON.stringify(chained.metadata ?? {}),
      };
      return rowToEvent(store.query("insert", { table: "hrx_audit_events", row }));
    },

    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      if (query.object_id) where.object_id = query.object_id;
      return Object.freeze(
        store.query("select", { table: "hrx_audit_events", where }).map((row) => rowToEvent(clone(row))),
      );
    },
  });
}
