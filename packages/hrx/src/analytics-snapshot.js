import { createHash, randomUUID } from "node:crypto";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function assertNoBlockedKeys(value, blockedKeys) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (blockedKeys.includes(key)) throw new TypeError(`HRX analytics snapshot must not include ${key}`);
    assertNoBlockedKeys(child, blockedKeys);
  }
}

function assertAggregateAnalytics(analytics = {}) {
  if (analytics.row_level_details_included !== false) {
    throw new TypeError("HRX analytics snapshots require row_level_details_included=false");
  }
  assertNoBlockedKeys(analytics, ["display_name", "salary", "client_name", "matter_id", "document_body", "employee_id"]);
}

export function createHrxAnalyticsSnapshot(input = {}) {
  const analytics = clone(input.analytics ?? {});
  assertAggregateAnalytics(analytics);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    snapshot_id: input.snapshot_id ?? `hrx_analytics_snapshot_${randomUUID()}`,
    period_start: requiredString(input, "period_start"),
    period_end: requiredString(input, "period_end"),
    analytics: Object.freeze(analytics),
    analytics_hash: input.analytics_hash ?? stableHash(analytics),
    snapshot_policy: "aggregate_only",
    generated_at: input.generated_at ?? new Date().toISOString(),
  });
}

export function createInMemoryHrxAnalyticsSnapshotStore(seed = []) {
  const snapshots = new Map();
  const key = (tenantId, snapshotId) => `${tenantId}:${snapshotId}`;

  const store = {
    create(input) {
      const snapshot = createHrxAnalyticsSnapshot(input);
      snapshots.set(key(snapshot.tenant_id, snapshot.snapshot_id), clone(snapshot));
      return Object.freeze(clone(snapshot));
    },
    get(ref = {}) {
      const snapshot = snapshots.get(key(ref.tenant_id, ref.snapshot_id));
      return snapshot ? Object.freeze(clone(snapshot)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...snapshots.values()]
          .filter((snapshot) => !query.tenant_id || snapshot.tenant_id === query.tenant_id)
          .map((snapshot) => Object.freeze(clone(snapshot))),
      );
    },
  };

  for (const snapshot of seed) store.create(snapshot);

  return Object.freeze(store);
}

function serializeSnapshot(snapshot) {
  const { analytics, ...rest } = snapshot;
  return {
    ...rest,
    analytics_json: JSON.stringify(analytics),
  };
}

function deserializeSnapshot(row) {
  if (!row) return undefined;
  return createHrxAnalyticsSnapshot({
    tenant_id: row.tenant_id,
    snapshot_id: row.snapshot_id,
    period_start: row.period_start,
    period_end: row.period_end,
    analytics: JSON.parse(row.analytics_json ?? "{}"),
    analytics_hash: row.analytics_hash,
    generated_at: row.generated_at,
  });
}

export function createSqlHrxAnalyticsSnapshotStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL HRX analytics snapshot store requires store.query");

  return Object.freeze({
    create(input) {
      const snapshot = createHrxAnalyticsSnapshot(input);
      return deserializeSnapshot(
        store.query("insert", {
          table: "hrx_analytics_snapshots",
          row: serializeSnapshot(snapshot),
        }),
      );
    },
    get(ref = {}) {
      return deserializeSnapshot(
        store.query("selectOne", {
          table: "hrx_analytics_snapshots",
          where: { tenant_id: ref.tenant_id, snapshot_id: ref.snapshot_id },
        }),
      );
    },
    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      return Object.freeze(
        store
          .query("select", { table: "hrx_analytics_snapshots", where })
          .map((row) => deserializeSnapshot(clone(row))),
      );
    },
  });
}
