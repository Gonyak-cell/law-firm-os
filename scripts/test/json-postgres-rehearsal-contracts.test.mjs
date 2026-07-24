import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresPostWriteRunbookContract,
  createJsonPostgresRehearsalBackupRetentionContract,
  createJsonPostgresRehearsalDmsProviderContract,
  createJsonPostgresRehearsalMigrationCatalog,
  createJsonPostgresRehearsalPerformanceBudget,
  validateJsonPostgresPostWriteRunbookContract,
  validateJsonPostgresRehearsalBackupRetentionContract,
  validateJsonPostgresRehearsalDmsProviderContract,
  validateJsonPostgresRehearsalMigrationCatalog,
  validateJsonPostgresRehearsalPerformanceBudget,
} from "../lib/json-postgres-rehearsal-contracts.mjs";

const SHA = "a".repeat(64);

test("W12 preparation contracts close migration, provider, retention, performance and post-write recovery scope", () => {
  const migration = createJsonPostgresRehearsalMigrationCatalog([
    { id: "001_one", file_name: "001_one.sql", checksum: SHA },
    { id: "002_two", file_name: "002_two.sql", checksum: "b".repeat(64) },
  ]);
  const provider = createJsonPostgresRehearsalDmsProviderContract();
  const backup = createJsonPostgresRehearsalBackupRetentionContract();
  const performance = createJsonPostgresRehearsalPerformanceBudget({
    recordCount: 1676,
    accountCount: 12,
    tenantCount: 1,
    dmsObjectCount: 0,
  });
  const runbook = createJsonPostgresPostWriteRunbookContract();

  assert.equal(
    validateJsonPostgresRehearsalMigrationCatalog(migration).valid,
    true,
  );
  assert.equal(
    validateJsonPostgresRehearsalDmsProviderContract(provider).valid,
    true,
  );
  assert.equal(
    validateJsonPostgresRehearsalBackupRetentionContract(backup).valid,
    true,
  );
  assert.equal(
    validateJsonPostgresRehearsalPerformanceBudget(performance).valid,
    true,
  );
  assert.equal(
    validateJsonPostgresPostWriteRunbookContract(runbook).valid,
    true,
  );
  assert.equal(provider.public_access, false);
  assert.equal(provider.permanent_delete_requires_approval, true);
  assert.equal(backup.permanent_delete_allowed, false);
  assert.equal(performance.dms_object_count, 0);
  assert.equal(runbook.post_write_json_rollback_allowed, false);
});

test("W12 preparation contracts reject digest, permission and safety drift", () => {
  const cases = [
    [
      createJsonPostgresRehearsalMigrationCatalog([
        { id: "001_one", file_name: "001_one.sql", checksum: SHA },
      ]),
      validateJsonPostgresRehearsalMigrationCatalog,
      (value) => { value.migrations[0].checksum = "b".repeat(64); },
    ],
    [
      createJsonPostgresRehearsalDmsProviderContract(),
      validateJsonPostgresRehearsalDmsProviderContract,
      (value) => { value.public_access = true; },
    ],
    [
      createJsonPostgresRehearsalBackupRetentionContract(),
      validateJsonPostgresRehearsalBackupRetentionContract,
      (value) => { value.permanent_delete_allowed = true; },
    ],
    [
      createJsonPostgresRehearsalPerformanceBudget({
        recordCount: 1676,
        accountCount: 12,
        tenantCount: 1,
        dmsObjectCount: 0,
      }),
      validateJsonPostgresRehearsalPerformanceBudget,
      (value) => { value.pool_max = 101; },
    ],
    [
      createJsonPostgresPostWriteRunbookContract(),
      validateJsonPostgresPostWriteRunbookContract,
      (value) => { value.post_write_dual_write_allowed = true; },
    ],
  ];
  for (const [source, validate, mutate] of cases) {
    const value = structuredClone(source);
    mutate(value);
    assert.throws(() => validate(value));
  }
});
