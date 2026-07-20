import assert from "node:assert/strict";
import test from "node:test";
import { seedHrxDurableRuntimeStore } from "../../../apps/api/src/hrx-runtime-context.js";
import { seedSyntheticPayrollRuntimeStore } from "../../../apps/api/src/hrx-payroll-runtime.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  createHrxDomainSnapshot,
  createPostgresHrxStorePortV2,
  flushHrxStoreToPostgres,
  materializeHrxStoreFromPostgres,
  runHrxPostgresCommand,
} from "../src/postgres-store-v2.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore, validateHrxStoreSnapshot } from "../src/store/file-store.js";

const TENANT = "tenant-a";
const CLOCK = () => "2026-07-16T19:00:00.000Z";

function currentSourceStore() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store, { tenant_id: TENANT });
  seedSyntheticPayrollRuntimeStore(store, [TENANT], { clock: CLOCK });
  return store;
}

test("HRX domain inventory covers migrations, tables, append-only, CAS, payroll and PII names", () => {
  const store = currentSourceStore();
  try {
    const result = createHrxDomainSnapshot({ store, tenant_id: TENANT });
    assert.equal(result.inventory.migration_count, 32);
    assert.equal(result.inventory.expected_migration_count, 32);
    assert.equal(result.inventory.table_count, 77);
    assert.equal(result.inventory.append_only_table_count, 11);
    assert.equal(result.inventory.cas_table_count, 26);
    assert.equal(result.inventory.tenant_mismatch_count, 0);
    assert.equal(result.inventory.product_row_count > 0, true);
    assert.equal(result.inventory.table_counts.hrx_employees > 0, true);
    assert.equal(result.inventory.table_counts.hrx_payroll_runs > 0, true);
    assert.equal(Object.keys(result.inventory.table_hashes).length, 77);
    assert.equal(result.inventory.integrity.row_count, result.inventory.product_row_count);
    assert.equal(result.inventory.integrity.primary_key_integrity_passed, true);
    assert.equal(result.inventory.integrity.unique_integrity_passed, true);
    assert.equal(result.inventory.integrity.foreign_key_integrity_passed, true);
    assert.equal(result.inventory.integrity.domain_invariants_passed, true);
    assert.equal(result.inventory.leave_ledger_recomputation.entry_count > 0, true);
    assert.equal(result.inventory.leave_ledger_recomputation.recomputation_passed, true);
    assert.match(result.inventory.leave_ledger_recomputation.balance_hash, /^[a-f0-9]{64}$/u);
    assert.equal(result.inventory.pii_field_names.includes("encrypted_amount_ref"), true);
    assert.match(result.inventory.row_count_hash, /^[a-f0-9]{64}$/u);
  } finally {
    store.close();
  }
});

test("HRX import integrity rejects a snapshot with a broken employee reference", () => {
  const store = currentSourceStore();
  try {
    const state = store.snapshot();
    state.tables.hrx_employees = [];
    assert.throws(
      () => validateHrxStoreSnapshot(state),
      /employee not found|hrx_employees reference not found/iu,
    );
  } finally {
    store.close();
  }
});

test("HRX PostgreSQL import, async store port, legacy service command, CAS and append-only contracts pass", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T19:00:00.000Z"),
  });
  const sourceStore = currentSourceStore();
  const source = createHrxDomainSnapshot({ store: sourceStore, tenant_id: TENANT });
  sourceStore.close();

  const imported = await ledger.importSnapshot(source.snapshot);
  assert.equal(imported.replayed, false);
  const secondImport = await ledger.importSnapshot(source.snapshot);
  assert.equal(secondImport.replayed, true);
  const shadow = await ledger.compareSnapshot(source.snapshot);
  assert.equal(shadow.comparison.equal, true);
  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: "hrx",
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      status: "passed",
      synthetic_only: true,
      environment: "test",
      adapter: "hrx-postgres-store-v2",
      executed_at: "2026-07-16T19:00:00.000Z",
      source_snapshot_hash: shadow.comparison.source_hash,
      checks: {
        source_imported: imported.receipt.status === "source_imported",
        idempotency_replayed: secondImport.replayed,
        shadow_equal: shadow.comparison.equal,
        readback_equal: shadow.comparison.source_hash === shadow.comparison.target_hash,
        json_dual_write_absent: true,
      },
      production_migrated: false,
    },
  });

  const legacyCommand = await runHrxPostgresCommand({
    ledger,
    tenant_id: TENANT,
    request_context: {
      method: "TEST:COMMAND",
      pathname: "hrx-postgres-store-v2/legacy-command",
      idempotency_key: "hrx-postgres-legacy-command-001",
      actor_id: "synthetic-test",
    },
    command(store) {
      const repository = createSqlHrxRepository({ store, clock: CLOCK });
      const employee = repository.createEmployee({
        tenant_id: TENANT,
        employee_id: "employee-rs-dom-001",
        display_name: "Synthetic PostgreSQL employee",
        status: "active",
      });
      repository.createEmploymentProfile({
        tenant_id: TENANT,
        profile_id: "profile-rs-dom-001",
        employee_id: employee.employee_id,
        employment_type: "full_time",
        status: "active",
        title: "Synthetic Counsel",
        effective_from: "2026-07-16",
      });
      return repository.getEmployee({ tenant_id: TENANT, employee_id: employee.employee_id });
    },
  });
  assert.equal(legacyCommand.result.display_name, "Synthetic PostgreSQL employee");
  assert.equal(legacyCommand.flush.comparison.equal, true);

  const port = createPostgresHrxStorePortV2({ ledger });
  const employees = await port.query("select", {
    table: "hrx_employees",
    where: { tenant_id: TENANT },
  });
  assert.equal(employees.some((employee) => employee.employee_id === "employee-rs-dom-001"), true);
  await port.transaction({
    tenant_id: TENANT,
    idempotency_key: "hrx-postgres-port-transaction-001",
    actor_id: "synthetic-test",
  }, async (tx) => {
    await tx.query("insert", {
      table: "hrx_employees",
      row: {
        tenant_id: TENANT,
        employee_id: "employee-rs-dom-002",
        display_name: "Atomic async employee",
        status: "active",
      },
    });
    await tx.query("insert", {
      table: "hrx_employment_profiles",
      row: {
        tenant_id: TENANT,
        profile_id: "profile-rs-dom-002",
        employee_id: "employee-rs-dom-002",
        employment_type: "full_time",
        status: "active",
        effective_from: "2026-07-16",
      },
    });
  });
  const snapshot = await port.snapshot({ tenant_id: TENANT });
  assert.equal(snapshot.tables.hrx_employees.some((row) => row.employee_id === "employee-rs-dom-002"), true);
  assert.equal(snapshot.tables.hrx_payroll_runs.length > 0, true);

  const first = await materializeHrxStoreFromPostgres({ ledger, tenant_id: TENANT });
  const second = await materializeHrxStoreFromPostgres({ ledger, tenant_id: TENANT });
  first.query("updateOne", {
    table: "hrx_employees",
    where: { tenant_id: TENANT, employee_id: "employee-rs-dom-001" },
    patch: { display_name: "First concurrent winner" },
  });
  await flushHrxStoreToPostgres({
    ledger,
    store: first,
    tenant_id: TENANT,
    request_context: {
      method: "TEST:CONCURRENT",
      pathname: "hrx-postgres-store-v2/concurrent-first",
      idempotency_key: "hrx-postgres-concurrent-first",
    },
  });
  second.query("updateOne", {
    table: "hrx_employees",
    where: { tenant_id: TENANT, employee_id: "employee-rs-dom-001" },
    patch: { display_name: "Stale concurrent writer" },
  });
  await assert.rejects(
    flushHrxStoreToPostgres({
      ledger,
      store: second,
      tenant_id: TENANT,
      request_context: {
        method: "TEST:CONCURRENT",
        pathname: "hrx-postgres-store-v2/concurrent-second",
        idempotency_key: "hrx-postgres-concurrent-second",
      },
    }),
    (error) => error?.safe_error_code === "HRX_POSTGRES_BASELINE_CONFLICT" && error?.status === 409,
  );
  first.close();
  second.close();

  const appendOnly = await materializeHrxStoreFromPostgres({ ledger, tenant_id: TENANT });
  const compensation = appendOnly.query("selectOne", {
    table: "hrx_compensation_records",
    where: { tenant_id: TENANT },
  });
  assert.throws(
    () => appendOnly.query("updateOne", {
      table: "hrx_compensation_records",
      where: { tenant_id: TENANT, compensation_id: compensation.compensation_id },
      patch: { source_ref: "artifact:synthetic/must-not-change" },
    }),
    /append-only/u,
  );
  appendOnly.close();

  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source: source.snapshot, imported, secondImport, shadow, rehearsal });
  port.close();
});
