import {
  createMigrationRunner,
} from "../../../packages/platform/src/persistence/migration-runner.js";
import {
  createDomainSnapshot,
  hashDomainValue,
} from "../../../packages/persistence/src/domain-ledger.js";
import {
  CLIENT_OPERATIONS_MODEL_REGISTRY,
} from "./client-operations-model-registry.js";
import {
  CLIENT_OPERATIONS_DOMAIN_ORDER,
} from "./client-operations-readiness.js";

const REGISTERED_MODEL_KEYS = new Set(
  CLIENT_OPERATIONS_MODEL_REGISTRY.entries.map(
    ({ domain_id, model_type }) => `${domain_id}:${model_type}`,
  ),
);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function registeredSnapshot(snapshot) {
  const records = snapshot.records.filter((record) =>
    REGISTERED_MODEL_KEYS.has(
      `${snapshot.domain_id}:${record.record_type}`,
    ));
  return createDomainSnapshot({
    tenant_id: snapshot.tenant_id,
    domain_id: snapshot.domain_id,
    records,
    idempotency_entries: snapshot.idempotency_entries,
    audit_events: snapshot.audit_events,
    source_hash: hashDomainValue({
      source_snapshot_hash: snapshot.snapshot_hash,
      registered_records: records.map(
        ({ record_type, record_id, payload_hash }) => ({
          record_type,
          record_id,
          payload_hash,
        }),
      ),
    }),
  });
}

export function indexClientOperationsSnapshots(
  snapshots,
  { tenantId = null } = {},
) {
  if (!Array.isArray(snapshots)) {
    throw new TypeError(
      "Client operations migration snapshots are invalid",
    );
  }
  const byDomain = new Map();
  let scopedTenantId = tenantId
    ? requiredText(tenantId, "tenant_id")
    : null;
  for (const input of snapshots) {
    const source = createDomainSnapshot(input);
    if (
      input?.snapshot_hash !== source.snapshot_hash
      || input?.invariant_hash !== source.invariant_hash
    ) {
      throw new TypeError(
        "Client operations migration snapshot digest is invalid",
      );
    }
    const domainId = source.domain_id;
    if (
      !CLIENT_OPERATIONS_DOMAIN_ORDER.includes(domainId)
      || byDomain.has(domainId)
    ) {
      throw new TypeError(
        "Client operations migration snapshots are invalid",
      );
    }
    scopedTenantId ??= source.tenant_id;
    if (source.tenant_id !== scopedTenantId) {
      throw new TypeError(
        "Client operations migration snapshot tenant is invalid",
      );
    }
    byDomain.set(domainId, registeredSnapshot(source));
  }
  if (byDomain.size !== CLIENT_OPERATIONS_DOMAIN_ORDER.length) {
    throw new TypeError(
      "Client operations migration requires CRM, Finance, and Email DMS snapshots",
    );
  }
  return byDomain;
}

export function createClientOperationsMigrationPlan({
  snapshots,
} = {}) {
  const byDomain = indexClientOperationsSnapshots(snapshots);
  return createMigrationRunner({
    migrations: CLIENT_OPERATIONS_DOMAIN_ORDER.map((domainId) => ({
      id: `client_operations_${domainId.replace("-", "_")}`,
      checksum: byDomain.get(domainId).source_hash,
      up() {},
    })),
  });
}
