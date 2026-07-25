import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalizeJson } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  assertHrxRelationalMappingMatchesDatabase,
  createHrxRelationalMappingManifest,
  createHrxRelationalProductionInventory,
  inspectHrxRelationalSchema,
  validateHrxRelationalMappingManifest,
} from "../src/relational-projection-contract.js";
import { runHrxPostgresMigrations } from "../src/postgres-migrations.js";
import { HRX_STORE_TABLES } from "../src/store/file-store.js";

function digest(value) {
  return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}

test("W15 mapping contract covers all 77 relations in deterministic dependency order", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runHrxPostgresMigrations(fixture.adminPool, {
    appliedBy: "hrx-mapping-contract-test",
  });
  const emptyHash = digest([]);
  const inventory = createHrxRelationalProductionInventory({
    tenantCount: 1,
    inventoryProvenanceSha256: "9".repeat(64),
    outboxEventCount: 0,
    outboxLagMs: 0,
    referenceCount: 0,
    tables: HRX_STORE_TABLES.map((table) => ({
      table_name: table,
      source_count: 0,
      source_hash: emptyHash,
      state_version_min: 0,
      state_version_max: 0,
      payload_bytes_p50: 0,
      payload_bytes_p95: 0,
      payload_bytes_max: 0,
      soft_deleted_count: 0,
      append_only_count: 0,
      reference_count: 0,
      json_path_presence_sha256: emptyHash,
      json_path_null_ratio_sha256: emptyHash,
      unmapped_nonnull_field_count: 0,
      primary_key_conflict_count: 0,
      foreign_key_conflict_count: 0,
      inventory_classification: "schema_only",
    })),
  });
  assert.equal(inventory.inventory_provenance_sha256, "9".repeat(64));
  assert.throws(
    () => createHrxRelationalProductionInventory({
      tenantCount: 1,
      inventoryProvenanceSha256: "not-a-digest",
      outboxEventCount: 0,
      outboxLagMs: 0,
      referenceCount: 0,
      tables: inventory.tables,
    }),
    /inventory provenance SHA-256 is invalid/u,
  );
  const observedSchema = await inspectHrxRelationalSchema(fixture.adminPool);
  const manifest = createHrxRelationalMappingManifest({
    schema: observedSchema,
    inventory,
    performanceAcceptanceSha256: "a".repeat(64),
  });
  const validated = validateHrxRelationalMappingManifest(manifest);
  assert.equal(validated.table_count, 77);
  assert.equal(manifest.schema_only_table_count, 77);
  assert.equal(new Set(manifest.dependency_order).size, 77);
  assert.ok(
    manifest.dependency_order.indexOf("hrx_employees")
      < manifest.dependency_order.indexOf("hrx_employment_profiles"),
  );
  assert.ok(
    manifest.dependency_order.indexOf("hrx_leave_groups")
      < manifest.dependency_order.indexOf("hrx_leave_types"),
  );
  const mappingByTable = new Map(
    manifest.tables.map((table) => [table.table_name, table]),
  );
  for (const mapping of manifest.tables) {
    for (const foreignKey of mapping.foreign_keys) {
      assert.ok(
        mappingByTable.get(foreignKey.referenced_table).rollout_wave
          <= mapping.rollout_wave,
      );
    }
  }
  const database = await assertHrxRelationalMappingMatchesDatabase(
    fixture.adminPool,
    manifest,
  );
  assert.equal(database.valid, true);

  const drifted = structuredClone(manifest);
  drifted.tables[0].payload_columns.push("unapproved_live_field");
  assert.throws(
    () => validateHrxRelationalMappingManifest(drifted),
    /digest is invalid/u,
  );

  const orderDrift = structuredClone(manifest);
  const employeeIndex = orderDrift.dependency_order.indexOf("hrx_employees");
  const profileIndex =
    orderDrift.dependency_order.indexOf("hrx_employment_profiles");
  [
    orderDrift.dependency_order[employeeIndex],
    orderDrift.dependency_order[profileIndex],
  ] = [
    orderDrift.dependency_order[profileIndex],
    orderDrift.dependency_order[employeeIndex],
  ];
  const { manifest_sha256: ignored, ...orderMaterial } = orderDrift;
  orderDrift.manifest_sha256 = digest(orderMaterial);
  assert.throws(
    () => validateHrxRelationalMappingManifest(orderDrift),
    /foreign-key order is invalid/u,
  );

  const missingPrimaryKey = structuredClone(observedSchema);
  missingPrimaryKey.columns = missingPrimaryKey.columns.filter((column) =>
    !(column.table_name === "hrx_employees"
      && column.column_name === "employee_id"));
  assert.throws(
    () => createHrxRelationalMappingManifest({
      schema: missingPrimaryKey,
      inventory,
      performanceAcceptanceSha256: "a".repeat(64),
    }),
    /primary-key column is missing/u,
  );

  const cycle = structuredClone(observedSchema);
  cycle.foreign_keys.push({
    table_name: "hrx_employees",
    constraint_name: "hrx_employees_cycle_fk",
    column_name: "employee_id",
    referenced_table_name: "hrx_employment_profiles",
    referenced_column_name: "profile_id",
    ordinal_position: 1,
  });
  assert.throws(
    () => createHrxRelationalMappingManifest({
      schema: cycle,
      inventory,
      performanceAcceptanceSha256: "a".repeat(64),
    }),
    /dependency cycle requires an explicit contract/u,
  );
});
