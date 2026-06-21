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
  assert.deepEqual(first.map((result) => result.applied), [true]);
  assert.deepEqual(second.map((result) => result.applied), [false]);
  assert.equal(connection.select("runtime_migration_history").length, 1);
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
  assert.equal(dryRun.removed, 1);
  assert.equal(connection.select("runtime_migration_history").length, 1);
  const rollback = rollbackRuntimeSpineMigrations(connection);
  assert.equal(rollback.removed, 1);
  assert.match(rollback.rollback_note, /synthetic/);
  assert.equal(connection.select("runtime_migration_history").length, 0);
  connection.close();
});

test("Runtime Spine migration manifest has tenant base schema and rollback note", () => {
  const [migration] = listRuntimeSpinePersistenceMigrations();
  assert.equal(migration.id, "001_runtime_spine_tenant_base");
  assert.deepEqual(migration.up.create_tables, ["runtime_tenants", "runtime_migration_history"]);
  assert.match(migration.down.rollback_note, /Synthetic-only/);
});
