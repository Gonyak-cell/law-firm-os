import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { addPeopleVisibleMatterTeamMember } from "../../../packages/matter/src/staffing-service.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
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
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { createOffboardingCase } from "../../../packages/hrx/src/offboarding.js";
import { createDurablePeopleOutlookStateAuthority } from "../../../packages/integrations-core/src/people-outlook-connection.js";

const TENANT_A = "tenant_postgres_api_authority_a";
const TENANT_B = "tenant_postgres_api_authority_b";
const PAYROLL_ARTIFACT_SECRET = "postgres-api-authority-test-payroll-artifact-secret";
const TERMINATION_DELIVERY_AT = "2026-07-31T09:00:00.000Z";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

async function importHrxAuthorityBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot);
  } finally {
    store.close();
  }
}

async function importMatterAssignmentIdentityBaseline(ledger, tenantId, { employeeId, userId }) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const repository = createSqlHrxRepository({
      store,
      clock: () => "2026-07-31T00:00:00.000Z",
    });
    repository.transaction((tx) => {
      tx.createEmployee({
        tenant_id: tenantId,
        employee_id: employeeId,
        display_name: "PostgreSQL Matter assignment attorney",
        work_email: `${userId}@example.test`,
        status: "active",
        source_ref: "postgres-matter-assignment-test",
      });
      tx.createEmployeeUserLink({
        tenant_id: tenantId,
        link_id: `link-${employeeId}`,
        employee_id: employeeId,
        user_id: userId,
        purpose: "login_mapping",
        source_ref: "postgres-matter-assignment-test",
      });
    });
    await ledger.importSnapshot(createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot);
  } finally {
    store.close();
  }
}

async function assertMatterAssignmentRejectsInactiveIdentity({
  fixture,
  tenantId,
  employeeId,
  userId,
  accountStatus,
  membershipStatus,
  idempotencySuffix,
}) {
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const identityLedger = createPostgresIdentityLedger({
    pool: fixture.appPool,
    clock: () => "2026-07-31T00:00:00.000Z",
  });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: `postgres-api-matter-assignment-${idempotencySuffix}`,
  });
  const identityInput = `postgres-matter-assignment-${idempotencySuffix}`;
  await identityLedger.provisionDirectoryUser({
    tenant_id: tenantId,
    actor_id: "user_postgres_matter_assignment_test",
    idempotency_key: `${identityInput}-v1`,
    request_hash: createHash("sha256").update(`${identityInput}-v1`).digest("hex"),
    user: {
      user_id: userId,
      email: `${userId}@example.test`,
      status: accountStatus,
      display_name: "PostgreSQL Matter assignment attorney",
      source_ref: "postgres-matter-assignment-test",
    },
    membership: {
      status: membershipStatus,
      role_profile_id: "lawos_staff",
      role_ids: ["lawos_staff"],
      scopes: ["matter:read"],
      hrx_scopes: ["hrx:self"],
      source_ref: "postgres-matter-assignment-test",
    },
  });
  await importMatterAssignmentIdentityBaseline(ledger, tenantId, { employeeId, userId });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    identityRepository: identityLedger,
  });

  return authority.run({
    tenant_id: tenantId,
    request_context: {
      method: "POST",
      pathname: "/api/matters/matter-postgres-assignment/team",
      actor_id: "user_postgres_matter_assignment_test",
    },
    command(runtimes) {
      const directoryUser = runtimes.matterRuntime.userDirectory.listUsers({
        tenant_id: tenantId,
        user_id: userId,
      });
      assert.equal(directoryUser.length, 1);
      assert.equal(directoryUser[0].status, "inactive");

      const identity = runtimes.matterRuntime.peopleAssignmentAuthority.resolveEmployeeUserPair({
        tenant_id: tenantId,
        employee_id: employeeId,
        requested_user_id: userId,
      });
      assert.deepEqual(identity, {
        state: "unresolved",
        reason: "user_identity_inactive",
      });
      assert.throws(() => addPeopleVisibleMatterTeamMember({
        repository: runtimes.matterRuntime.repository,
        employeeDirectory: runtimes.matterRuntime.employeeDirectory,
        employeeUserLinkDirectory: runtimes.matterRuntime.employeeUserLinkDirectory,
        userDirectory: runtimes.matterRuntime.userDirectory,
        peopleAssignmentAuthority: runtimes.matterRuntime.peopleAssignmentAuthority,
        as_of: "2026-07-31T00:00:00.000Z",
        matter: {
          tenant_id: tenantId,
          matter_id: "matter-postgres-assignment-negative",
        },
        member: {
          member_id: `member-${idempotencySuffix}`,
          tenant_id: tenantId,
          matter_id: "matter-postgres-assignment-negative",
          employee_id: employeeId,
          user_id: userId,
          role: "responsible_attorney",
          status: "active",
          valid_from: "2026-07-01T00:00:00.000Z",
        },
        actor_id: "user_postgres_matter_assignment_test",
      }), /user_identity_inactive/u);
      return identity;
    },
  });
}

async function importPendingTerminationDeliveryBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  const offboardingId = "off-postgres-payroll-evidence";
  const employeeId = "employee-postgres-payroll-evidence";
  const previewReconciliationId = "leave-preview-postgres-payroll-evidence";
  const reconciliationId = "leave-execute-postgres-payroll-evidence";
  const outboxEventId = "leave-outbox-postgres-payroll-evidence";
  const outboxIdempotencyKey =
    "termination:off-postgres-payroll-evidence:payroll-outbox";
  const payload = {
    offboarding_id: offboardingId,
    totals: { unused_minutes: 480 },
    raw_compensation_amount_included: false,
  };
  try {
    runHrxMigrations(store);
    store.query("insert", {
      table: "hrx_employees",
      row: {
        tenant_id: tenantId,
        employee_id: employeeId,
        display_name: "PostgreSQL termination evidence",
        status: "active",
      },
    });
    store.query("insert", {
      table: "hrx_offboarding_cases",
      row: createOffboardingCase({
        tenant_id: tenantId,
        offboarding_id: offboardingId,
        employee_id: employeeId,
        separation_date: "2026-07-31",
        state: "open",
        leave_reconciliation_status: "approved_pending_sync",
      }),
    });
    store.query("insert", {
      table: "hrx_leave_termination_reconciliations",
      row: {
        tenant_id: tenantId,
        reconciliation_id: reconciliationId,
        employee_id: employeeId,
        termination_date: "2026-07-31",
        snapshot_hash: "termination-snapshot-hash",
        state: "approved_pending_sync",
        result_json: JSON.stringify({
          offboarding_id: offboardingId,
          payroll_outbox_event_id: outboxEventId,
          sync_state: "pending",
        }),
        idempotency_key: "termination-execute:postgres-payroll-evidence",
        created_at: TERMINATION_DELIVERY_AT,
        approved_at: TERMINATION_DELIVERY_AT,
        mode: "execute",
        source_version: "termination-source-version",
        preview_reconciliation_id: previewReconciliationId,
        approved_by_actor_id: "user-people-ops-reviewer",
        executed_by_actor_id: "user-people-ops-operator",
        completed_at: null,
      },
    });
    store.query("insert", {
      table: "hrx_leave_sync_outbox",
      row: {
        tenant_id: tenantId,
        outbox_event_id: outboxEventId,
        aggregate_type: "LeaveTerminationReconciliation",
        aggregate_id: previewReconciliationId,
        event_type: "leave.termination.payroll_reconciliation_requested",
        payload_json: JSON.stringify(payload),
        idempotency_key: outboxIdempotencyKey,
        state: "pending",
        attempt_count: 0,
        available_at: TERMINATION_DELIVERY_AT,
        delivered_at: null,
        provider_receipt_ref: null,
        last_error_code: null,
        updated_at: TERMINATION_DELIVERY_AT,
        created_at: TERMINATION_DELIVERY_AT,
      },
    });
    await ledger.importSnapshot(
      createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot,
    );
  } finally {
    store.close();
  }
  return {
    employeeId,
    offboardingId,
    reconciliationId,
    outboxEventId,
    providerReceiptRef: "PayrollProviderReceipt:postgres-payroll-evidence",
    providerReceipt: {
      schema_version: "law-firm-os.hrx.provider-receipt.v0.1",
      receipt_id: "payroll-receipt-postgres-payroll-evidence",
      tenant_id: tenantId,
      provider_kind: "payroll",
      provider_id: "payroll-authority",
      operation: "payroll.termination.reconciliation",
      idempotency_key: `${outboxIdempotencyKey}:payroll`,
      payload_hash: `sha256:${createHash("sha256").update(stableStringify(payload)).digest("hex")}`,
      state: "succeeded",
      requested_at: TERMINATION_DELIVERY_AT,
      completed_at: TERMINATION_DELIVERY_AT,
      provider_receipt_ref:
        "PayrollProviderReceipt:postgres-payroll-evidence",
      error_code: null,
    },
  };
}

test("PostgreSQL API authority retries bounded reads and only explicitly idempotent mutations", async () => {
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

  let idempotentMutationAttempts = 0;
  const idempotentMutation = await runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 2,
    allowIdempotentWriteRetry: true,
    wait: async () => {},
    execute: async () => {
      idempotentMutationAttempts += 1;
      if (idempotentMutationAttempts === 1) {
        throw Object.assign(new Error("idempotent mutation conflict"), {
          safe_error_code: "REPOSITORY_VERSION_CONFLICT",
        });
      }
      return "idempotent-mutation-replayed";
    },
  });
  assert.equal(idempotentMutation, "idempotent-mutation-replayed");
  assert.equal(idempotentMutationAttempts, 2);

  let uniqueConflictAttempts = 0;
  const uniqueConflictReplay = await runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 2,
    allowIdempotentWriteRetry: true,
    wait: async () => {},
    execute: async () => {
      uniqueConflictAttempts += 1;
      if (uniqueConflictAttempts === 1) {
        throw Object.assign(new Error("concurrent idempotency claim"), {
          safe_error_code: "POSTGRES_UNIQUE_CONFLICT",
        });
      }
      return "unique-conflict-rematerialized";
    },
  });
  assert.equal(uniqueConflictReplay, "unique-conflict-rematerialized");
  assert.equal(uniqueConflictAttempts, 2);
});

test("PostgreSQL Matter assignment excludes a disabled identity account", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  const identity = await assertMatterAssignmentRejectsInactiveIdentity({
    fixture,
    tenantId: "tenant_postgres_matter_assignment_disabled_account",
    employeeId: "employee-postgres-matter-disabled-account",
    userId: "user-postgres-matter-disabled-account",
    accountStatus: "disabled",
    membershipStatus: "active",
    idempotencySuffix: "disabled-account",
  });
  assert.deepEqual(identity, {
    state: "unresolved",
    reason: "user_identity_inactive",
  });
});

test("PostgreSQL Matter assignment excludes an inactive same-tenant identity membership", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  const identity = await assertMatterAssignmentRejectsInactiveIdentity({
    fixture,
    tenantId: "tenant_postgres_matter_assignment_disabled_membership",
    employeeId: "employee-postgres-matter-disabled-membership",
    userId: "user-postgres-matter-disabled-membership",
    accountStatus: "active",
    membershipStatus: "disabled",
    idempotencySuffix: "disabled-membership",
  });
  assert.deepEqual(identity, {
    state: "unresolved",
    reason: "user_identity_inactive",
  });
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

test("PostgreSQL API authority binds People flags and optional metrics without enabling synthetic payroll", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const outlookStateDirectory = mkdtempSync(
    join(tmpdir(), "lawos-postgres-people-outlook-state-"),
  );
  t.after(() => rmSync(outlookStateDirectory, { recursive: true, force: true }));
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-people-bootstrap-test" });
  const peopleMetricsSink = Object.freeze({
    emit(metric) {
      return metric;
    },
  });
  const outlookTokenVault = Object.freeze({
    durable: true,
    opaque_at_rest: true,
    test_only: false,
  });
  let providerIdentityState = {
    schema_version: "people-provider-identity.v1",
    records: [],
    audit_events: [],
    rebind_receipts: [],
  };
  const peopleProviderIdentityRepository = Object.freeze({
    durable: true,
    test_only: false,
    loadState() {
      return structuredClone(providerIdentityState);
    },
    replaceState(nextState) {
      providerIdentityState = structuredClone(nextState);
      return structuredClone(providerIdentityState);
    },
  });
  const outlookConsentService = Object.freeze({
    grant() {},
    revoke() {},
    snapshot() {
      return [{
        tenant_id: TENANT_A,
        consent_ref: "outlook-consent-postgres",
        connection_state: "active",
        expires_at: "2099-07-31T00:00:00.000Z",
      }];
    },
    resolveCredential() {
      return {
        credential_ref: "external-vault:postgres",
        expires_at: "2099-07-31T00:00:00.000Z",
      };
    },
  });
  const adapterCalls = [];
  const outlookCalendarViewAdapter = Object.freeze({
    async read(input) {
      adapterCalls.push(input);
      return { events: [] };
    },
  });
  const outlookOauthPort = Object.freeze({
    begin() {
      return {
        state_ref: "outlook-state-postgres",
        authorize_url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      };
    },
    resolveSubjectAddress() {
      return "lawyer@example.test";
    },
  });
  const outlookStateAuthority = createDurablePeopleOutlookStateAuthority({
    filePath: join(outlookStateDirectory, "oauth-state.json"),
  });
  const offboardingAccessSource = Object.freeze({
    read({ tenant_id, offboarding_id, employee_id, system_ref }) {
      return {
        tenant_id,
        offboarding_id,
        employee_id,
        system_ref,
        revoked: true,
        evidence_ref: `IamAuthority:${offboarding_id}:${system_ref}`,
        access_source_version: "iam-authority:v1",
      };
    },
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: true,
    },
    peopleMetricsSink,
    peopleProviderIdentityRepository,
    outlookTokenVault,
    outlookConsentService,
    outlookCalendarViewAdapter,
    outlookStateAuthority,
    outlookOauthPort,
    offboardingAccessSource,
    payrollProviders: {
      allowSyntheticArtifactSecret: true,
      allowSyntheticProviders: true,
    },
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  const bootstrap = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    },
    async command(runtimes) {
      const hrxRuntime = runtimes.hrxRuntime;
      const authorization = hrxRuntime.peopleOutlookConnections.begin({
        tenant_id: TENANT_A,
        employee_id: "employee-outlook-postgres",
        can_manage: true,
      });
      hrxRuntime.peopleProviderIdentities.connect({
        tenant_id: TENANT_A,
        employee_id: "employee-outlook-postgres",
        provider_identity_id: "provider-identity-postgres",
        provider_subject_id: "provider-subject-postgres",
        consent_ref: "outlook-consent-postgres",
      });
      const first = hrxRuntime.peopleOutlookCalendarSource.read({
        tenant_id: TENANT_A,
        employee_ids: ["employee-outlook-postgres"],
        as_of: "2026-07-31",
      });
      await hrxRuntime.peopleOutlookCalendarSource.whenIdle();
      const connected = hrxRuntime.peopleOutlookCalendarSource.read({
        tenant_id: TENANT_A,
        employee_ids: ["employee-outlook-postgres"],
        as_of: "2026-07-31",
      });
      return {
        people_overview: hrxRuntime.peopleFeatureFlags.people_overview,
        people_member_brief: hrxRuntime.peopleFeatureFlags.people_member_brief,
        metrics_sink_bound: hrxRuntime.peopleMetricsSink === peopleMetricsSink,
        payroll_provider_mode: hrxRuntime.payrollRuntime.provider_mode,
        bank_reconciliation_port: hrxRuntime.payrollRuntime.bankReconciliationPort,
        outlook_token_vault_bound: hrxRuntime.outlookTokenVault === outlookTokenVault,
        outlook_state_authority_bound:
          hrxRuntime.outlookStateAuthority === outlookStateAuthority,
        offboarding_access_source_bound:
          hrxRuntime.offboardingAccessSource === offboardingAccessSource,
        offboarding_source_probe: hrxRuntime.offboardingAccessSource.read({
          tenant_id: TENANT_A,
          offboarding_id: "off-postgres-bootstrap",
          employee_id: "employee-outlook-postgres",
          system_ref: "IdP:core",
        }),
        outlook_authorization_state: authorization.connection_state,
        outlook_first_state: first.state,
        outlook_connected_state: connected.state,
      };
    },
  });

  assert.deepEqual(bootstrap, {
    people_overview: true,
    people_member_brief: true,
    metrics_sink_bound: true,
    payroll_provider_mode: "external-required",
    bank_reconciliation_port: null,
    outlook_token_vault_bound: true,
    outlook_state_authority_bound: true,
    offboarding_access_source_bound: true,
    offboarding_source_probe: {
      tenant_id: TENANT_A,
      offboarding_id: "off-postgres-bootstrap",
      employee_id: "employee-outlook-postgres",
      system_ref: "IdP:core",
      revoked: true,
      evidence_ref: "IamAuthority:off-postgres-bootstrap:IdP:core",
      access_source_version: "iam-authority:v1",
    },
    outlook_authorization_state: "consent_pending",
    outlook_first_state: "blocked",
    outlook_connected_state: "ok",
  });
  assert.equal(adapterCalls.length, 1);
  assert.equal(adapterCalls[0].credential_ref, "external-vault:postgres");
  assert.equal(adapterCalls[0].subject_address, "lawyer@example.test");
});

test("PostgreSQL API authority persists termination completion and its authoritative payroll evidence together", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-termination-evidence-test",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    leaveIntegrationProviders: {
      payroll: {
        operational_authority: true,
        provider_id: "payroll-authority",
      },
    },
    leaveIntegrationProviderEnabled: { payroll: true },
  });
  const seeded = await importPendingTerminationDeliveryBaseline(
    ledger,
    TENANT_A,
  );

  const completion = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/leave/termination/provider-delivery",
      idempotency_key: "postgres-termination-evidence-completion",
    },
    command({ hrxRuntime }) {
      return hrxRuntime.leaveTerminationService.recordPayrollDelivery(
        {
          tenant_id: TENANT_A,
          actor_id: "user-people-ops-operator",
        },
        {
          outbox_event_id: seeded.outboxEventId,
          provider_receipt: seeded.providerReceipt,
        },
      );
    },
  });
  assert.equal(completion.state, "approved_and_synced");

  const persisted = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: `/api/hrx/lifecycle/offboarding/${seeded.offboardingId}`,
    },
    command({ hrxRuntime }) {
      const store = hrxRuntime.leaveManagementStore;
      return {
        offboarding: store.query("selectOne", {
          table: "hrx_offboarding_cases",
          where: {
            tenant_id: TENANT_A,
            offboarding_id: seeded.offboardingId,
          },
        }),
        reconciliation: store.query("selectOne", {
          table: "hrx_leave_termination_reconciliations",
          where: {
            tenant_id: TENANT_A,
            reconciliation_id: seeded.reconciliationId,
          },
        }),
        outbox: store.query("selectOne", {
          table: "hrx_leave_sync_outbox",
          where: {
            tenant_id: TENANT_A,
            outbox_event_id: seeded.outboxEventId,
          },
        }),
      };
    },
  });
  assert.equal(
    persisted.offboarding.leave_reconciliation_status,
    "approved_and_synced",
  );
  assert.equal(
    persisted.offboarding.leave_reconciliation_evidence_ref,
    seeded.providerReceiptRef,
  );
  assert.equal(persisted.reconciliation.state, "approved_and_synced");
  assert.equal(persisted.outbox.state, "delivered");
  assert.equal(
    persisted.outbox.provider_receipt_ref,
    seeded.providerReceiptRef,
  );
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
