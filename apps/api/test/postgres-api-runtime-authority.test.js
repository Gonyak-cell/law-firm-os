import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresApiRuntimeAuthority,
  runPostgresReadWithBaselineRetry,
} from "../src/postgres-api-runtime-authority.js";
import { handleAiApiRequest } from "../src/ai-runtime-context.js";
import { handleAnalyticsApiRequest } from "../src/analytics-runtime-context.js";
import { handleCrmIntakeApiRequest } from "../src/crm-intake-runtime-context.js";
import { handleFinanceApiRequest } from "../src/finance-runtime-context.js";
import { handleHomeDashboardApiRequest } from "../src/home-dashboard-runtime-context.js";
import { handleHrxApiRequest } from "../src/hrx-runtime-context.js";
import { handleRecordsSearch } from "../src/master-data-context.js";
import { handlePortalApiRequest } from "../src/portal-runtime-context.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";

const TENANT_A = "tenant_postgres_api_authority_a";
const TENANT_B = "tenant_postgres_api_authority_b";
const PAYROLL_ARTIFACT_SECRET = "postgres-api-authority-test-payroll-artifact-secret";
const BANK_IMPORT_PREVIEW_TOKENS = createBankImportPreviewTokenAuthority({
  secret: "postgres-api-authority-bank-preview-secret-material",
});

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
    retryLimit: 4,
    wait: async (milliseconds) => waits.push(milliseconds),
    execute: async () => {
      readAttempts += 1;
      if (readAttempts < 5) {
        throw Object.assign(new Error("concurrent audited read"), {
          safe_error_code: [
            "DOMAIN_BASELINE_CONFLICT",
            "HRX_POSTGRES_BASELINE_CONFLICT",
            "DOMAIN_SHADOW_DIFFERENCE",
            "REPOSITORY_VERSION_CONFLICT",
          ][readAttempts - 1],
        });
      }
      return "read-committed";
    },
  });
  assert.equal(result, "read-committed");
  assert.equal(readAttempts, 5);
  assert.deepEqual(waits, [5, 10, 20, 40]);

  let mutationAttempts = 0;
  await assert.rejects(runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 3,
    wait: async () => {},
    execute: async () => {
      mutationAttempts += 1;
      throw Object.assign(new Error("mutation conflict"), { safe_error_code: "DOMAIN_SHADOW_DIFFERENCE" });
    },
  }), /mutation conflict/u);
  assert.equal(mutationAttempts, 1);
});

test("PostgreSQL API authority completes the concurrent audited browser read set without leaking conflicts", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 24 });
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-home-concurrency-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const context = Object.freeze({
    principal: Object.freeze({ tenant_id: TENANT_A, user_id: "user_home_concurrency_test" }),
    rules: Object.freeze([{ id: "allow-home-read", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
  const routes = [
    { pathname: "/api/home/action-inbox", query: { type: "approval" }, handler: "home" },
    { pathname: "/api/home/action-inbox", query: { type: "task" }, handler: "home" },
    { pathname: "/api/home/agenda", query: { from: "2026-07-01T00:00:00.000Z", to: "2026-07-31T23:59:59.999Z" }, handler: "home" },
    { pathname: "/api/home/feed", query: { tab: "notice" }, handler: "home" },
    { pathname: "/api/ai/review-queue", query: {}, handler: "ai" },
    { pathname: "/api/analytics/dashboards", query: {}, handler: "analytics" },
    { pathname: "/api/analytics/finance/monthly", query: {}, handler: "analytics" },
    { pathname: "/api/crm/opportunities", query: {}, handler: "crm" },
    { pathname: "/api/data-room/projections", query: {}, handler: "portal" },
    { pathname: "/api/finance/ar-aging", query: {}, handler: "finance" },
    { pathname: "/api/finance/invoices", query: {}, handler: "finance" },
    { pathname: "/api/finance/time-entries", query: {}, handler: "finance" },
    { pathname: "/api/hrx/employees", query: {}, handler: "hrx" },
    { pathname: "/api/hrx/legal-people/search", query: {}, handler: "hrx" },
    { pathname: "/api/hrx/legal-people/ethics", query: {}, handler: "hrx" },
    { pathname: "/api/hrx/legal-people/relationships", query: {}, handler: "hrx" },
    { pathname: "/api/portal/dashboard", query: {}, handler: "portal" },
    { pathname: "/api/portal/rfi", query: {}, handler: "portal" },
    { pathname: "/master-data/records", query: {}, handler: "master-data" },
  ];
  const browserRead = ({
    route,
    occurrence,
    auditHint = `audit_home_concurrency_test_${occurrence}`,
  }) => authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: route.pathname,
      request_target_hash: occurrence.padEnd(64, "a"),
      request_body_hash: "b".repeat(64),
      idempotency_key: `home-read-${occurrence}`,
      actor_id: "user_home_concurrency_test",
    },
    command: (runtimes) => {
      const query = {
        tenant_id: TENANT_A,
        permission_ref: "perm_home_concurrency_test",
        audit_hint_ref: auditHint,
        ...route.query,
      };
      const requestId = `req_home_concurrency_test_${occurrence}`;
      if (route.handler === "ai") {
        return handleAiApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.aiRuntime,
        });
      }
      if (route.handler === "analytics") {
        return handleAnalyticsApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.analyticsRuntime,
        });
      }
      if (route.handler === "crm") {
        return handleCrmIntakeApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.crmIntakeRuntime,
        });
      }
      if (route.handler === "finance") {
        return handleFinanceApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.financeRuntime,
        });
      }
      if (route.handler === "hrx") {
        return handleHrxApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context: runtimes.hrxRuntime,
          requestContext: {
            tenant_id: TENANT_A,
            actor_id: "user_home_concurrency_test",
            actor_role: "firm_admin",
            hrx_scopes: ["hrx.employee.read", "hrx.legal_people.read"],
            session_bound: true,
          },
          permissionContext: context,
        });
      }
      if (route.handler === "master-data") {
        return handleRecordsSearch({
          query,
          context,
          requestId,
          runtime: runtimes.masterDataRuntime,
        });
      }
      if (route.handler === "portal") {
        return handlePortalApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.portalRuntime,
        });
      }
      return handleHomeDashboardApiRequest({
        pathname: route.pathname,
        method: "GET",
        query,
        context,
        requestId,
        runtime: runtimes.homeDashboardRuntime,
      });
    },
  });

  const requests = Array.from({ length: 3 }, (_, round) => routes.map((route, index) => ({
    route,
    occurrence: `${round}-${index}`,
  }))).flat();
  const settled = await Promise.allSettled(requests.map(browserRead));
  const failures = settled
    .map((result, index) => ({ result, request: requests[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, request }) => ({
      pathname: request.route.pathname,
      occurrence: request.occurrence,
      code: result.reason?.code ?? null,
      safe_error_code: result.reason?.safe_error_code ?? null,
      status: result.reason?.status ?? null,
    }));
  assert.deepEqual(failures, []);
  const results = settled.map((result) => result.value);

  assert.equal(results.length, routes.length * 3);
  assert.equal(
    results.every((result) => result.status === 200),
    true,
    JSON.stringify(results.map((result) => ({
      status: result.status,
      safe_error_codes: result.body?.safe_error_codes ?? [],
    }))),
  );
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "analytics" })).length, 12);

  const replay = {
    route: routes[0],
    occurrence: "0-0",
  };
  assert.equal((await browserRead(replay)).status, 200);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "analytics" })).length, 12);

  await assert.rejects(
    browserRead({ ...replay, auditHint: "audit_home_concurrency_test_reused_with_different_semantics" }),
    (error) => error?.safe_error_code === "HOME_AUDIT_IDEMPOTENCY_CONFLICT",
  );
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
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
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
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
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

test("PostgreSQL API authority overlays relational HRX reads only while preserving generic-ledger writes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-hrx-relational-overlay-test",
  });
  let projectionMaterializationCount = 0;
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    hrxRelationalProjectionReader: {
      authority: "read-model-only",
      fallback_authority: "postgres-v2-generic-ledger",
      async materializeSnapshot({
        source_snapshot: sourceSnapshot,
      }) {
        projectionMaterializationCount += 1;
        const projected = structuredClone(sourceSnapshot);
        projected.tables.hrx_employees =
          projected.tables.hrx_employees.map((employee) => ({
            ...employee,
            display_name: "Relational projection read",
          }));
        return {
          snapshot: projected,
          projected_table_names: ["hrx_employees"],
          fallback_families: [],
        };
      },
    },
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/employees",
      idempotency_key: "hrx-relational-overlay-create-001",
    },
    command: (runtimes) =>
      runtimes.hrxRuntime.repository.createEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-relational-overlay-001",
        display_name: "Generic ledger write",
        status: "active",
      }),
  });
  assert.equal(projectionMaterializationCount, 0);
  const projected = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/employees/employee-relational-overlay-001",
    },
    command: (runtimes) =>
      runtimes.hrxRuntime.repository.getEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-relational-overlay-001",
      }),
  });
  assert.equal(projected.display_name, "Relational projection read");
  assert.equal(projectionMaterializationCount, 1);
  const generic = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "hrx",
    record_type: "hrx_employees",
  });
  assert.equal(generic[0].payload.display_name, "Generic ledger write");
  assert.equal(authority.capabilities.hrx_relational_read_projection, true);
  assert.equal(authority.capabilities.json_fallback, false);
  assert.equal(authority.capabilities.dual_write, false);
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
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
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
