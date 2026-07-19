import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHrxMigrationSafetyService } from "../src/migrations/safety.js";
import { loadHrxCoreMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-14T01:00:00.000Z";

function durableStore(name) {
  const filePath = join(mkdtempSync(join(tmpdir(), `${name}-`)), "hrx-store.json");
  return { filePath, store: createFileHrxStore({ filePath }) };
}

test("GOV-004 migrates an empty durable store and records a verifiable preflight backup", () => {
  const { filePath, store } = durableStore("hrx-migration-empty");
  const service = createHrxMigrationSafetyService({ store, clock: () => NOW });
  const preflight = service.preflight();
  assert.equal(preflight.outcome, "ready");
  assert.deepEqual(preflight.pending_migration_ids, loadHrxCoreMigrations().map((migration) => migration.id));
  const result = service.migrate();
  assert.equal(result.outcome, "migrated");
  assert.equal(result.results.every((migration) => migration.applied), true);
  assert.equal(result.backup.schema_version, "law-firm-os.hrx-migration-backup.v0.1");
  store.close();
  const reopened = createFileHrxStore({ filePath });
  assert.deepEqual(reopened.snapshot().applied_migrations.map((migration) => migration.id), loadHrxCoreMigrations().map((migration) => migration.id));
  reopened.close();
});

test("GOV-004 preserves existing rows and rejects changed SQL under an applied migration id", () => {
  const { store } = durableStore("hrx-migration-existing");
  store.query("insert", { table: "hrx_employees", row: { tenant_id: "tenant-existing", employee_id: "emp-001", display_name: "합성 구성원", status: "active" } });
  const service = createHrxMigrationSafetyService({ store, clock: () => NOW });
  service.migrate();
  assert.equal(store.query("selectOne", { table: "hrx_employees", where: { tenant_id: "tenant-existing", employee_id: "emp-001" } }).display_name, "합성 구성원");
  const applied = loadHrxCoreMigrations()[0];
  assert.throws(
    () => service.preflight({ migrations: [{ ...applied, sql: `${applied.sql}\nCREATE TABLE IF NOT EXISTS tampered (id TEXT);` }] }),
    (error) => error.safe_error_code === "HRX_MIGRATION_HASH_MISMATCH",
  );
  assert.throws(
    () => store.migrate({ ...applied, sql: `${applied.sql}\n-- direct-store-drift` }),
    (error) => error.safe_error_code === "HRX_MIGRATION_HASH_MISMATCH",
  );
  store.close();
});

test("GOV-004 restores the exact durable snapshot after a mid-sequence migration failure", () => {
  const { filePath, store } = durableStore("hrx-migration-failure");
  store.query("insert", { table: "hrx_employees", row: { tenant_id: "tenant-existing", employee_id: "emp-001", display_name: "합성 구성원", status: "active" } });
  const before = store.snapshot();
  const migrations = [
    { id: "safe-before-failure", sql: "CREATE TABLE IF NOT EXISTS safe_before_failure (id TEXT);" },
    { id: "synthetic-mid-failure", sql: "CREATE TABLE IF NOT EXISTS synthetic_mid_failure (id TEXT);" },
  ];
  const failingStore = {
    ...store,
    migrate(migration) {
      if (migration.id === "synthetic-mid-failure") throw new Error("synthetic migration failure");
      return store.migrate(migration);
    },
  };
  const service = createHrxMigrationSafetyService({ store: failingStore, clock: () => NOW });
  assert.throws(
    () => service.migrate({ migrations }),
    (error) => error.message === "synthetic migration failure" && error.hrx_migration_rollback?.outcome === "restored",
  );
  assert.deepEqual(store.snapshot(), before);
  store.close();
  const reopened = createFileHrxStore({ filePath });
  assert.deepEqual(reopened.snapshot(), before);
  reopened.close();
});

test("GOV-004 refuses a tampered backup before restore", () => {
  const { store } = durableStore("hrx-migration-tamper");
  const service = createHrxMigrationSafetyService({ store, clock: () => NOW });
  const backup = service.backup();
  const tampered = {
    ...backup,
    state: { ...backup.state, schema_version: "tampered" },
  };
  assert.throws(
    () => service.restore(tampered),
    (error) => error.safe_error_code === "HRX_MIGRATION_BACKUP_CHECKSUM_MISMATCH",
  );
  store.close();
});
