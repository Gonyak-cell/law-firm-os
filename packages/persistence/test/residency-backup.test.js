import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDataResidencyMetadata,
  createPersistenceBackup,
  createPersistenceConnection,
  createStableRuntimeId,
  createTenantScopedRepository,
  restorePersistenceBackup
} from "../src/index.js";

test("Data residency metadata is normalized and rejects tenant policy mismatches", () => {
  const record = applyDataResidencyMetadata(
    { record_id: "mat_001" },
    { region: "KR", policy: "kr-only", classification: "client-confidential" },
    { tenant_id: "tenant-kr", region: "KR", data_residency_policy: "kr-only" },
  );

  assert.equal(record.residency_region, "KR");
  assert.equal(record.data_residency_policy, "kr-only");
  assert.equal(record.data_classification, "client-confidential");
  assert.throws(
    () =>
      applyDataResidencyMetadata(
        { record_id: "mat_001" },
        { region: "US", policy: "us-only", classification: "client-confidential" },
        { tenant_id: "tenant-kr", region: "KR", data_residency_policy: "kr-only" },
      ),
    /tenant residency mismatch/,
  );
});

test("Backup and restore are synthetic-only and preserve tenant scoped rows", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  connection.insert("runtime_tenants", {
    tenant_id: "tenant-a",
    name: "Tenant A",
    region: "US",
    data_residency_policy: "synthetic-only"
  });
  connection.insert("runtime_tenants", {
    tenant_id: "tenant-b",
    name: "Tenant B",
    region: "EU",
    data_residency_policy: "synthetic-only"
  });

  const repository = createTenantScopedRepository({ connection, objectType: "Matter" });
  const tenantARecord = createStableRuntimeId({ type: "matter", tenantId: "tenant-a", seed: "matter-a" });
  const tenantBRecord = createStableRuntimeId({ type: "matter", tenantId: "tenant-b", seed: "matter-b" });
  repository.create({ tenant_id: "tenant-a", record_id: tenantARecord, payload: { name: "Tenant A Matter" } });
  repository.create({ tenant_id: "tenant-b", record_id: tenantBRecord, payload: { name: "Tenant B Matter" } });

  const backup = createPersistenceBackup(connection, { tenant_id: "tenant-a" });
  assert.equal(backup.synthetic_only, true);
  assert.equal(backup.production_ready_claim, false);
  assert.equal(backup.table_counts.runtime_tenants, 1);
  assert.equal(backup.table_counts.runtime_records, 1);
  assert.equal(backup.tables.runtime_records[0].tenant_id, "tenant-a");

  repository.softDelete({ tenant_id: "tenant-a", record_id: tenantARecord, deleted_at: "2026-06-21T00:00:00.000Z" });
  const restore = restorePersistenceBackup(connection, backup, { tenant_id: "tenant-a" });
  assert.equal(restore.synthetic_only, true);
  assert.equal(repository.get({ tenant_id: "tenant-a", record_id: tenantARecord }).payload.name, "Tenant A Matter");
  assert.equal(repository.get({ tenant_id: "tenant-b", record_id: tenantBRecord }).payload.name, "Tenant B Matter");
  connection.close();
});
