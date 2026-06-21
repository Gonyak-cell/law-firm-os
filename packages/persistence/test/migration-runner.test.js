import assert from "node:assert/strict";
import test from "node:test";
import {
  createPersistenceConnection,
  listRuntimeSpinePersistenceMigrations,
  rollbackRuntimeSpineMigrations,
  runRuntimeSpineMigrations
} from "../src/index.js";

test("Runtime Spine migration runner applies tenant base migration idempotently", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const first = runRuntimeSpineMigrations(connection);
  const second = runRuntimeSpineMigrations(connection);
  assert.deepEqual(first.map((result) => result.applied), [true, true]);
  assert.deepEqual(second.map((result) => result.applied), [false, false]);
  assert.equal(connection.select("runtime_migration_history").length, 2);
  connection.close();
});

test("Runtime Spine migration runner dry-run does not write history", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const result = runRuntimeSpineMigrations(connection, { dryRun: true });
  assert.equal(result[0].dry_run, true);
  assert.equal(result[0].applied, false);
  assert.equal(connection.select("runtime_migration_history").length, 0);
  connection.close();
});

test("Runtime Spine migration rollback only affects synthetic migration history", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  runRuntimeSpineMigrations(connection);
  const dryRun = rollbackRuntimeSpineMigrations(connection, { dryRun: true });
  assert.equal(dryRun.removed, 2);
  assert.equal(connection.select("runtime_migration_history").length, 2);
  const rollback = rollbackRuntimeSpineMigrations(connection);
  assert.equal(rollback.removed, 2);
  assert.match(rollback.rollback_note, /synthetic/);
  assert.equal(connection.select("runtime_migration_history").length, 0);
  connection.close();
});

test("Runtime Spine migration manifest has tenant base schema and rollback note", () => {
  const [tenantBase, tenantDataSpine] = listRuntimeSpinePersistenceMigrations();
  assert.equal(tenantBase.id, "001_runtime_spine_tenant_base");
  assert.deepEqual(tenantBase.up.create_tables, ["runtime_tenants", "runtime_migration_history"]);
  assert.match(tenantBase.down.rollback_note, /Synthetic-only/);
  assert.equal(tenantDataSpine.id, "002_runtime_spine_tenant_data_spine");
  assert.deepEqual(tenantDataSpine.up.create_tables, ["runtime_records", "runtime_idempotency_keys", "runtime_outbox_events"]);
});
