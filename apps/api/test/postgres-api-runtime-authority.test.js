import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../../../packages/master-data/src/central-ledger.js";
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
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createFinanceDomainSnapshot } from "../../../packages/billing/src/central-ledger.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  createEmailDmsRepository,
} from "../../../packages/email-dms/src/repository.js";

const TENANT_A = "tenant_postgres_api_authority_a";
const TENANT_B = "tenant_postgres_api_authority_b";
const PAYROLL_ARTIFACT_SECRET = "postgres-api-authority-test-payroll-artifact-secret";
const BANK_IMPORT_PREVIEW_TOKENS = createBankImportPreviewTokenAuthority({
  secret: "postgres-api-authority-bank-preview-secret-material",
});
const POSTGRES_FEE_DEPOSIT_CLASSIFICATION_ID =
  `bank_classification_${createHash("sha256")
    .update(
      `${TENANT_A}|bank-transaction-postgres-fee-commitment`,
    )
    .digest("hex")
    .slice(0, 24)}`;

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

test("PostgreSQL API authority persists consultation schedule and completion fields with CRM versions", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-consultation-test",
  });
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
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const leadId = "lead-postgres-consultation-t03";
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [{
      model_type: "Lead",
      lead_id: leadId,
      tenant_id: TENANT_A,
      party_id: "party-postgres-consultation-t03",
      display_name: "PostgreSQL 상담 문의",
      status: "active",
      owner_user_id: "user-postgres-consultation-t03",
      inquiry_status: "reviewing",
      source: "manual",
      received_at: "2026-07-30T08:55:00.000Z",
      next_action: "상담 일정 확인",
      version: 2,
    }],
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-consultation-crm",
        repository: crmRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
  } finally {
    crmRepository.close();
  }
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT_A,
      user_id: "user-postgres-consultation-t03",
      entra_subject_id: "entra-postgres-consultation-t03",
      role_ids: Object.freeze(["system_super_admin"]),
      scopes: Object.freeze(["crm.inquiry.write"]),
    }),
    rules: Object.freeze([{
      id: "allow-postgres-consultation",
      effect: "allow",
      action: "*",
    }]),
    object_acl: Object.freeze([]),
  });
  const scheduled = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: `/api/crm/inquiries/${leadId}/consultations`,
      idempotency_key: "postgres-consultation-schedule",
      actor_id: "user-postgres-consultation-t03",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname: `/api/crm/inquiries/${leadId}/consultations`,
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-consultation",
          audit_hint_ref: "audit-postgres-consultation",
          expected_inquiry_version: 2,
          consultation: {
            subject: "PostgreSQL 상담",
            scheduled_start: "2026-08-01T10:00:00+09:00",
            scheduled_end: "2026-08-01T11:00:00+09:00",
            timezone: "Asia/Seoul",
            next_action: "상담 준비",
          },
          reason: "상담 일정 확정",
          idempotency_key: "postgres-consultation-schedule",
        },
        context,
        requestId: "request-postgres-consultation-schedule",
        runtime: runtimes.crmIntakeRuntime,
      });
    },
  });
  assert.equal(scheduled.status, 201);
  const activityId = scheduled.body.item.crm_activity_id;
  const storedSchedule = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "CRMActivity",
    record_id: activityId,
  });
  assert.equal(
    storedSchedule.payload.scheduled_start,
    "2026-08-01T01:00:00.000Z",
  );
  assert.equal(storedSchedule.payload.timezone, "Asia/Seoul");
  assert.equal(storedSchedule.payload.version, 1);

  const emailDmsRepository = createEmailDmsRepository({
    seedRecords: [{
      model_type: "M365Connection",
      m365_connection_id: m365ConnectionId({
        tenant_id: TENANT_A,
        user_id: "user-postgres-consultation-t03",
      }),
      tenant_id: TENANT_A,
      user_id: "user-postgres-consultation-t03",
      entra_subject_id: "entra-postgres-consultation-t03",
      mailbox_address_hash: hashMailboxAddress(
        "postgres-consultation@example.invalid",
      ),
      credential_ref:
        "aws-secrets-manager:synthetic/postgres-consultation",
      granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      consented_at: "2026-07-30T08:00:00.000Z",
      expires_at: "2026-08-30T08:00:00.000Z",
      revoked_at: null,
      state_version: 1,
    }],
  });
  let calendarProviderCalls = 0;
  const linked = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname:
        `/api/crm/consultations/${activityId}/outlook-event`,
      idempotency_key: "postgres-consultation-outlook-event",
      actor_id: "user-postgres-consultation-t03",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname:
          `/api/crm/consultations/${activityId}/outlook-event`,
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-consultation",
          audit_hint_ref: "audit-postgres-consultation",
          expected_version: 1,
          reason: "Outlook 일정 만들기",
          idempotency_key: "postgres-consultation-outlook-event",
        },
        context,
        requestId: "request-postgres-consultation-outlook-event",
        runtime: {
          ...runtimes.crmIntakeRuntime,
          emailDmsRuntime: { repository: emailDmsRepository },
          m365GraphConfig: {
            feature_enabled: true,
            provider_runtime_enabled: true,
            clock: () => new Date("2026-07-30T09:00:00.000Z"),
            credential_vault: {
              async resolveDelegatedCredential() {
                return {
                  access_token:
                    "postgres-calendar-access-token-never-return",
                };
              },
            },
            provider: {
              async createMeCalendarEvent() {
                calendarProviderCalls += 1;
                return {
                  event_id: "postgres-calendar-event-t04",
                  web_link:
                    "https://outlook.office.com/calendar/item/postgres-t04",
                  provider_request_id:
                    "postgres-calendar-provider-request-t04",
                };
              },
            },
          },
        },
      });
    },
  });
  assert.equal(linked.status, 201);
  assert.equal(calendarProviderCalls, 1);
  const storedOutlookEvent = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "CRMActivity",
    record_id: activityId,
  });
  assert.equal(
    storedOutlookEvent.payload.outlook_event_id,
    "postgres-calendar-event-t04",
  );
  assert.equal(
    storedOutlookEvent.payload.outlook_event_web_link,
    "https://outlook.office.com/calendar/item/postgres-t04",
  );
  assert.match(
    storedOutlookEvent.payload.outlook_event_transaction_id,
    /^[0-9a-f-]{36}$/,
  );
  assert.equal(storedOutlookEvent.payload.version, 2);

  const completed = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "PATCH",
      pathname: `/api/crm/activities/${activityId}`,
      idempotency_key: "postgres-consultation-complete",
      actor_id: "user-postgres-consultation-t03",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname: `/api/crm/activities/${activityId}`,
        method: "PATCH",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-consultation",
          audit_hint_ref: "audit-postgres-consultation",
          expected_version: 2,
          field_updates: {
            completed_at: "2026-08-01T11:05:00+09:00",
            outcome: "상담 완료",
            next_action: "수임 여부 검토",
          },
          reason: "상담 완료",
          idempotency_key: "postgres-consultation-complete",
        },
        context,
        requestId: "request-postgres-consultation-complete",
        runtime: runtimes.crmIntakeRuntime,
      });
    },
  });
  assert.equal(completed.status, 200);
  const storedCompletion = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "CRMActivity",
    record_id: activityId,
  });
  assert.equal(
    storedCompletion.payload.completed_at,
    "2026-08-01T02:05:00.000Z",
  );
  assert.equal(storedCompletion.payload.outcome, "상담 완료");
  assert.equal(storedCompletion.payload.version, 3);
  const storedLead = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Lead",
    record_id: leadId,
  });
  assert.equal(storedLead.payload.next_action, "수임 여부 검토");
  assert.equal(storedLead.payload.version, 4);
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
  assert.equal(authority.domain_ids.includes("email-dms"), true);
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const emailDmsBoundary = await authority.run({
    tenant_id: TENANT_A,
    request_context: { method: "GET" },
    command: (runtimes) => ({
      authority: runtimes.emailDmsRuntime.authority,
      repository_authority:
        runtimes.emailDmsRuntime.repository.authority,
      storage_shared_with_dms:
        runtimes.emailDmsRuntime.storage === runtimes.dmsRuntime.storage,
      crm_read_model_uses_email_dms_repository:
        runtimes.crmIntakeRuntime.emailDmsRepository
          === runtimes.emailDmsRuntime.repository,
      production_ready_claim:
        runtimes.emailDmsRuntime.production_ready_claim,
    }),
  });
  assert.deepEqual(emailDmsBoundary, {
    authority: "postgres-v2",
    repository_authority: "email-dms",
    storage_shared_with_dms: true,
    crm_read_model_uses_email_dms_repository: true,
    production_ready_claim: false,
  });
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
    { pathname: "/api/crm/inquiries", query: {}, handler: "crm" },
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

test("PostgreSQL API authority resolves ClientGroup and Opportunity before committing a FeeCommitment", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-fee-commitment-test",
  });
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
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [
      {
        model_type: "Party",
        tenant_id: TENANT_A,
        party_id: "party-postgres-fee-commitment",
        party_type: "organization",
        display_name: "PostgreSQL 수임 고객",
        status: "active",
        owner_user_id: "user_postgres_fee_commitment",
      },
      {
        model_type: "ClientGroup",
        tenant_id: TENANT_A,
        client_group_id: "client-postgres-fee-commitment",
        display_name: "PostgreSQL 수임 고객",
        member_party_ids: ["party-postgres-fee-commitment"],
        primary_party_id: "party-postgres-fee-commitment",
        status: "active",
        owner_user_id: "user_postgres_fee_commitment",
      },
    ],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [{
      model_type: "Opportunity",
      tenant_id: TENANT_A,
      opportunity_id: "opportunity-postgres-fee-commitment",
      party_id: "party-postgres-fee-commitment",
      display_name: "PostgreSQL 수임 확정",
      stage: "closed_won",
      status: "active",
      owner_user_id: "user_postgres_fee_commitment",
    }],
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-fee-commitment-master-data",
        repository: masterDataRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-fee-commitment-crm",
        repository: crmRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
    const financeRepository = createFinanceRepository({
      seedRecords: [
        {
          model_type: "BankImportBatch",
          bank_import_batch_id: "bank-batch-postgres-fee-commitment",
          tenant_id: TENANT_A,
          source_manifest_hash: "9".repeat(64),
          status: "reconciled",
        },
        {
          model_type: "BankTransaction",
          bank_transaction_id: "bank-transaction-postgres-fee-commitment",
          bank_import_batch_id: "bank-batch-postgres-fee-commitment",
          tenant_id: TENANT_A,
          transaction_fingerprint: "8".repeat(64),
          occurred_at: "2026-07-30T09:00:00+09:00",
          direction: "inflow",
          amount: 9_000_000,
          currency: "KRW",
          status: "posted",
        },
        {
          model_type: "BankTransactionClassification",
          bank_transaction_classification_id:
            POSTGRES_FEE_DEPOSIT_CLASSIFICATION_ID,
          bank_transaction_id: "bank-transaction-postgres-fee-commitment",
          tenant_id: TENANT_A,
          client_group_id: "client-postgres-fee-commitment",
          transaction_direction: "inflow",
          amount: 9_000_000,
          currency: "KRW",
          category: "client_receipt",
          status: "confirmed",
        },
        {
          model_type: "BankTransaction",
          bank_transaction_id: "bank-refund-postgres-fee-commitment",
          bank_import_batch_id: "bank-batch-postgres-fee-commitment",
          tenant_id: TENANT_A,
          account_ref: "account-postgres-fee-commitment",
          transaction_fingerprint: "7".repeat(64),
          date: "2026-07-31",
          occurred_at: "2026-07-31T09:00:00+09:00",
          direction: "outflow",
          amount: 1_000_000,
          balance_after: 8_000_000,
          currency: "KRW",
          counterparty: "PostgreSQL 수임 고객 환불",
          source_category: "고객 환불",
          classification_scope: "unreviewed",
          status: "posted",
        },
      ],
    });
    try {
      await ledger.importSnapshot(createFinanceDomainSnapshot({
        repositories: [{
          source_id: "postgres-fee-commitment-bank-deposit",
          repository: financeRepository,
        }],
        tenant_id: TENANT_A,
      }).snapshot);
    } finally {
      financeRepository.close();
    }
  } finally {
    masterDataRepository.close();
    crmRepository.close();
  }
  assert.equal((await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "master-data",
    record_type: "ClientGroup",
    record_id: "client-postgres-fee-commitment",
  }))?.payload?.primary_party_id, "party-postgres-fee-commitment");
  assert.equal((await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Opportunity",
    record_id: "opportunity-postgres-fee-commitment",
  }))?.payload?.party_id, "party-postgres-fee-commitment");
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT_A,
      user_id: "user_postgres_fee_commitment",
      role_ids: Object.freeze(["system_super_admin"]),
      scopes: Object.freeze([
        "finance.fee.write",
        "finance.bank.classify",
      ]),
    }),
    rules: Object.freeze([{
      id: "allow-postgres-fee-commitment",
      effect: "allow",
      action: "*",
    }]),
    object_acl: Object.freeze([]),
  });
  const references = await authority.run({
    tenant_id: TENANT_A,
    request_context: { method: "GET" },
    command: (runtimes) => ({
      client_groups: runtimes.masterDataRuntime.repository.list({
        tenant_id: TENANT_A,
        model_type: "ClientGroup",
      }),
      client_group: runtimes.masterDataRuntime.repository.get({
        tenant_id: TENANT_A,
        model_type: "ClientGroup",
        client_group_id: "client-postgres-fee-commitment",
      }),
      opportunity: runtimes.crmIntakeRuntime.crmRepository.get({
        tenant_id: TENANT_A,
        model_type: "Opportunity",
        opportunity_id: "opportunity-postgres-fee-commitment",
      }),
      opportunities: runtimes.crmIntakeRuntime.crmRepository.list({
        tenant_id: TENANT_A,
        model_type: "Opportunity",
      }),
    }),
  });
  assert.ok(references.client_group, JSON.stringify(references));
  assert.ok(references.opportunity, JSON.stringify(references));
  assert.deepEqual(references.client_group.member_party_ids, [
    "party-postgres-fee-commitment",
  ]);
  assert.equal(references.opportunity.party_id, "party-postgres-fee-commitment");

  const created = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/finance/fee-commitments",
      request_target_hash: "f".repeat(64),
      request_body_hash: "e".repeat(64),
      idempotency_key: "postgres-fee-commitment-create",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/fee-commitments",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-fee-commitment",
          audit_hint_ref: "audit-postgres-fee-commitment",
          idempotency_key: "postgres-fee-commitment-create",
          fee_commitment: {
            fee_commitment_id: "fee-commitment-postgres-authority",
            tenant_id: TENANT_A,
            client_group_id: "client-postgres-fee-commitment",
            opportunity_id: "opportunity-postgres-fee-commitment",
            matter_id: null,
            currency: "KRW",
            agreed_amount: 7_000_000,
            due_date: "2026-08-31",
            accepted_at: "2026-07-30T18:00:00+09:00",
            source_fee_arrangement_id: null,
            reason: "PostgreSQL 다중 도메인 수임 확정",
          },
        },
        context,
        requestId: "request-postgres-fee-commitment",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.item.agreed_amount, 7_000_000);
  assert.deepEqual(created.body.deposit_allocation, {
    outcome: "allocated",
    created_count: 1,
    updated_count: 0,
    allocated_amount: 7_000_000,
    advance_or_overpayment_amount: 2_000_000,
  });

  const updated = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "PATCH",
      pathname: "/api/finance/fee-commitments/fee-commitment-postgres-authority",
      request_target_hash: "d".repeat(64),
      request_body_hash: "c".repeat(64),
      idempotency_key: "postgres-fee-commitment-update",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/fee-commitments/fee-commitment-postgres-authority",
        method: "PATCH",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-fee-commitment",
          audit_hint_ref: "audit-postgres-fee-commitment-update",
          idempotency_key: "postgres-fee-commitment-update",
          expected_state_version: 1,
          changes: {
            agreed_amount: 8_000_000,
          },
          reason: "담당 변호사가 확정 금액을 정정함",
        },
        context,
        requestId: "request-postgres-fee-commitment-update",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.item.agreed_amount, 8_000_000);
  assert.equal(updated.body.item.state_version, 2);
  assert.deepEqual(updated.body.deposit_allocation, {
    outcome: "allocated",
    created_count: 0,
    updated_count: 1,
    allocated_amount: 1_000_000,
    advance_or_overpayment_amount: 1_000_000,
  });

  const [allocationBeforeManual] = await authority.run({
    tenant_id: TENANT_A,
    request_context: { method: "GET" },
    command: (runtimes) => runtimes.financeRuntime.repository.list({
      tenant_id: TENANT_A,
      model_type: "ClientDepositAllocation",
    }),
  });
  const manuallyReallocated = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/finance/client-deposit-allocations/reallocate",
      request_target_hash: "b".repeat(64),
      request_body_hash: "a".repeat(64),
      idempotency_key: "postgres-deposit-reallocate",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/client-deposit-allocations/reallocate",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-deposit-reallocate",
          audit_hint_ref: "audit-postgres-deposit-reallocate",
          idempotency_key: "postgres-deposit-reallocate",
          bank_transaction_id:
            "bank-transaction-postgres-fee-commitment",
          expected_allocations: [{
            client_deposit_allocation_id:
              allocationBeforeManual.client_deposit_allocation_id,
            state_version: allocationBeforeManual.state_version,
          }],
          targets: [{
            fee_commitment_id:
              "fee-commitment-postgres-authority",
            active_amount: 7_000_000,
          }],
          reason: "PostgreSQL 수동 입금 연결 확인",
        },
        context,
        requestId: "request-postgres-deposit-reallocate",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(
    manuallyReallocated.status,
    200,
    JSON.stringify(manuallyReallocated.body),
  );
  assert.equal(
    manuallyReallocated.body.item.active_allocated_amount,
    7_000_000,
  );
  assert.equal(manuallyReallocated.body.items[0].manual_lock, true);

  const linkedRefund = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/finance/bank-classifications/review",
      request_target_hash: "9".repeat(64),
      request_body_hash: "8".repeat(64),
      idempotency_key: "postgres-deposit-refund-link",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/bank-classifications/review",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-deposit-refund",
          audit_hint_ref: "audit-postgres-deposit-refund",
          idempotency_key: "postgres-deposit-refund-link",
          decisions: [{
            bank_transaction_id:
              "bank-refund-postgres-fee-commitment",
            category: "refund_reversal",
            refund_of_bank_transaction_id:
              "bank-transaction-postgres-fee-commitment",
          }],
        },
        context,
        requestId: "request-postgres-deposit-refund",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(linkedRefund.status, 200, JSON.stringify(linkedRefund.body));
  assert.deepEqual(linkedRefund.body.deposit_allocation_reversal, {
    outcome: "synchronized",
    updated_count: 1,
    linked_refund_amount: 1_000_000,
    refund_reversed_amount: 1_000_000,
    unapplied_refund_amount: 0,
    inactive_commitment_released_amount: 0,
  });

  const persisted = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "finance",
    record_type: "FeeCommitment",
    record_id: "fee-commitment-postgres-authority",
  });
  assert.equal(persisted.payload.client_group_id, "client-postgres-fee-commitment");
  assert.equal(persisted.payload.opportunity_id, "opportunity-postgres-fee-commitment");
  assert.equal(persisted.payload.agreed_amount, 8_000_000);
  assert.equal(persisted.payload.state_version, 2);
  const allocation = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "finance",
    record_type: "ClientDepositAllocation",
  });
  assert.equal(allocation.length, 1);
  assert.equal(allocation[0].payload.allocated_amount, 8_000_000);
  assert.equal(allocation[0].payload.reversed_amount, 2_000_000);
  assert.equal(allocation[0].payload.refund_reversed_amount, 1_000_000);
  assert.equal(
    allocation[0].payload.adjustment_reversed_amount,
    1_000_000,
  );
  assert.equal(allocation[0].payload.allocation_source, "manual");
  assert.equal(allocation[0].payload.manual_lock, true);
  assert.equal(allocation[0].payload.state_version, 4);
  assert.equal((await ledger.listIdempotency({
    tenant_id: TENANT_A,
    domain_id: "finance",
  })).length, 7);
  const financeAudit = await ledger.listAudit({
    tenant_id: TENANT_A,
    domain_id: "finance",
  });
  assert.equal(
    financeAudit.some((event) => event.event_type === "fee_commitment.create"),
    true,
  );
  assert.equal(
    financeAudit.filter(
      (event) => event.event_type === "client.deposit.allocation.auto",
    ).length,
    2,
  );
  assert.equal(
    financeAudit.some(
      (event) => event.event_type === "client.deposit.allocation.reallocate",
    ),
    true,
  );
  assert.equal(
    financeAudit.some(
      (event) => (
        event.event_type === "client.deposit.allocation.reversal.sync"
      ),
    ),
    true,
  );
  const updateAudit = financeAudit.find(
    (event) => event.event_type === "fee_commitment.update",
  );
  assert.ok(updateAudit);
  assert.equal(updateAudit.payload.source_payload_included, false);
  assert.match(updateAudit.payload.imported_event_hash, /^[a-f0-9]{64}$/u);
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
