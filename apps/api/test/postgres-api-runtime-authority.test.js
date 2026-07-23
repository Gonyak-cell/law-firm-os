import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresApiRuntimeAuthority,
  runPostgresReadWithBaselineRetry,
} from "../src/postgres-api-runtime-authority.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";

const TENANT_A = "tenant_postgres_api_authority_a";
const TENANT_B = "tenant_postgres_api_authority_b";
const PAYROLL_ARTIFACT_SECRET = "postgres-api-authority-test-payroll-artifact-secret";

async function importHrxAuthorityBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot);
  } finally {
    store.close();
  }
}

test("PostgreSQL API authority retries bounded read baseline conflicts but never retries mutations", async () => {
  const waits = [];
  let readAttempts = 0;
  const result = await runPostgresReadWithBaselineRetry({
    method: "GET",
    retryLimit: 3,
    wait: async (milliseconds) => waits.push(milliseconds),
    execute: async () => {
      readAttempts += 1;
      if (readAttempts < 3) {
        throw Object.assign(new Error("concurrent audited read"), {
          safe_error_code: readAttempts === 1 ? "DOMAIN_BASELINE_CONFLICT" : "HRX_POSTGRES_BASELINE_CONFLICT",
        });
      }
      return "read-committed";
    },
  });
  assert.equal(result, "read-committed");
  assert.equal(readAttempts, 3);
  assert.deepEqual(waits, [5, 10]);

  let mutationAttempts = 0;
  await assert.rejects(runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 3,
    wait: async () => {},
    execute: async () => {
      mutationAttempts += 1;
      throw Object.assign(new Error("mutation conflict"), { safe_error_code: "DOMAIN_BASELINE_CONFLICT" });
    },
  }), /mutation conflict/u);
  assert.equal(mutationAttempts, 1);
});

test("PostgreSQL API authority commits product state, idempotency, audit and outbox without JSON fallback", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  assert.equal(fixture.appPool.options.max, 1);
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-18T00:00:00.000Z"),
  });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-authority-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  assert.equal(authority.capabilities.json_fallback, false);
  assert.equal(authority.capabilities.dual_write, false);
  assert.equal(authority.capabilities.offline_mutation, false);
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  await importHrxAuthorityBaseline(ledger, TENANT_B);

  const created = await authority.run({
    tenant_id: TENANT_A,
    command(runtimes) {
      return runtimes.matterRuntime.repository.transaction((tx) => {
        const matter = tx.create({
          model_type: "Matter",
          matter_id: "matter_postgres_authority_001",
          tenant_id: TENANT_A,
          client_id: "client_postgres_authority_001",
          title: "PostgreSQL authority matter",
          status: "open",
          matter_code: "PG-AUTH-001",
          created_by: "user_postgres_authority_test",
          created_at: "2026-07-18T00:00:00.000Z",
          permission_envelope_id: "perm_postgres_authority_001",
          audit_trace_id: "audit_postgres_authority_001",
        });
        tx.recordIdempotency({
          tenant_id: TENANT_A,
          idempotency_key: "matter-postgres-authority-create-001",
          operation: "matter_create",
          response: { matter_id: matter.matter_id, outcome: "created" },
        });
        tx.appendAudit({
          tenant_id: TENANT_A,
          event_id: "matter:postgres-authority:create:001",
          action: "matter.created",
          actor_id: "user_postgres_authority_test",
          object_type: "Matter",
          object_id: matter.matter_id,
          metadata: { changed_field_count: 1 },
        });
        return matter;
      });
    },
  });
  assert.equal(created.matter_id, "matter_postgres_authority_001");

  const tenantAItems = await authority.run({
    tenant_id: TENANT_A,
    command: (runtimes) => runtimes.matterRuntime.repository.list({ tenant_id: TENANT_A, model_type: "Matter" }),
  });
  const tenantBItems = await authority.run({
    tenant_id: TENANT_B,
    command: (runtimes) => runtimes.matterRuntime.repository.list({ tenant_id: TENANT_B, model_type: "Matter" }),
  });
  assert.equal(tenantAItems.length, 1);
  assert.equal(tenantBItems.length, 0);
  assert.equal((await ledger.listIdempotency({ tenant_id: TENANT_A, domain_id: "matter" })).length, 1);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "matter" })).length, 1);
  assert.equal((await ledger.listOutbox({ tenant_id: TENANT_A, domain_id: "matter" })).length, 1);
});

test("PostgreSQL API authority commits HRX with central idempotency, audit and outbox in the shared transaction", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-hrx-authority-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  const created = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/employees",
      request_target_hash: "a".repeat(64),
      request_body_hash: "b".repeat(64),
      idempotency_key: "hrx-employee-create-001",
      actor_id: "user_hrx_postgres_test",
    },
    command(runtimes) {
      return runtimes.hrxRuntime.repository.createEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-postgres-authority-001",
        display_name: "Synthetic PostgreSQL HRX employee",
        status: "active",
      });
    },
  });
  assert.equal(created.employee_id, "employee-postgres-authority-001");
  assert.equal((await ledger.list({ tenant_id: TENANT_A, domain_id: "hrx", record_type: "hrx_employees" })).length, 1);
  assert.equal((await ledger.listIdempotency({ tenant_id: TENANT_A, domain_id: "hrx" })).length, 1);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "hrx" })).length, 1);
  assert.equal((await ledger.listOutbox({ tenant_id: TENANT_A, domain_id: "hrx" })).length, 1);
});

test("PostgreSQL API authority rolls product changes back when the HRX baseline changes before shared commit", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-atomic-rollback-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  await assert.rejects(authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/runtime-safety/atomic-rollback",
      idempotency_key: "atomic-rollback-001",
    },
    async command(runtimes) {
      runtimes.matterRuntime.repository.transaction((tx) => {
        tx.create({
          model_type: "Matter",
          matter_id: "matter_atomic_rollback_001",
          tenant_id: TENANT_A,
          client_id: "client_atomic_rollback_001",
          title: "Must roll back",
          status: "open",
          matter_code: "ATOMIC-ROLLBACK-001",
          created_by: "user_hrx_postgres_test",
          created_at: "2026-07-18T00:00:00.000Z",
          permission_envelope_id: "perm_atomic_rollback_001",
          audit_trace_id: "audit_atomic_rollback_001",
        });
        tx.recordIdempotency({
          tenant_id: TENANT_A,
          idempotency_key: "matter-atomic-rollback-001",
          operation: "matter_create",
          response: { matter_id: "matter_atomic_rollback_001" },
        });
        tx.appendAudit({
          tenant_id: TENANT_A,
          event_id: "matter:atomic-rollback:001",
          action: "matter.created",
          object_type: "Matter",
          object_id: "matter_atomic_rollback_001",
        });
      });
      runtimes.hrxRuntime.repository.createEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-atomic-rollback-001",
        display_name: "Must roll back",
        status: "active",
      });
      await ledger.write({
        tenant_id: TENANT_A,
        domain_id: "hrx",
        record_type: "runtime-safety-concurrent-probe",
        record_id: "concurrent-001",
        payload: { probe: true },
        expected_version: 0,
      });
    },
  }), (error) => error?.safe_error_code === "DOMAIN_BASELINE_CONFLICT");

  assert.equal((await ledger.list({ tenant_id: TENANT_A, domain_id: "matter" })).length, 0);
  assert.equal(
    (await ledger.list({ tenant_id: TENANT_A, domain_id: "hrx" }))
      .some((record) => record.record_type === "hrx_employees"),
    false,
  );
});
