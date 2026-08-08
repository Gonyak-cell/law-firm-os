import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createFinanceDomainSnapshot } from "../../../packages/billing/src/central-ledger.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../packages/matter/src/central-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";
import {
  ACTOR,
  EMPLOYEE,
  TENANT,
  createMatterFixture,
  financeSeed,
  permissionContext,
  requestBody,
} from "./helpers/outlook-time-entry-draft-fixture.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";

async function importBaselines(ledger) {
  const hrxStore = createFileHrxStore();
  const matters = createMatterFixture();
  const finance = createFinanceRepository({ seedRecords: financeSeed() });
  try {
    runHrxMigrations(hrxStore);
    const employees = createSqlHrxRepository({ store: hrxStore });
    employees.transaction((tx) => {
      tx.createEmployee({
        tenant_id: TENANT,
        employee_id: EMPLOYEE,
        display_name: "PostgreSQL Outlook time user",
        status: "active",
      });
      tx.createEmploymentProfile({
        tenant_id: TENANT,
        profile_id: "profile_postgres_outlook_time",
        employee_id: EMPLOYEE,
        employment_type: "full_time",
        status: "active",
        effective_from: "2025-01-01",
      });
      tx.createEmployeeUserLink({
        tenant_id: TENANT,
        link_id: "link_postgres_outlook_time",
        employee_id: EMPLOYEE,
        user_id: ACTOR,
        purpose: "login_mapping",
      });
    });
    await ledger.importSnapshot(createHrxDomainSnapshot({ store: hrxStore, tenant_id: TENANT }).snapshot);
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: MATTER_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "outlook-time-matter", repository: matters }],
      tenant_id: TENANT,
    }).snapshot);
    await ledger.importSnapshot(createFinanceDomainSnapshot({
      repositories: [{ source_id: "outlook-time-finance", repository: finance }],
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    hrxStore.close();
    matters.close();
    finance.close();
  }
}

test("PostgreSQL authority re-materializes and replays one Outlook draft after authority restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 2 });
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  await importBaselines(ledger);
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-outlook-time-entry" });
  const authority = (authorityLedger = ledger) => createPostgresApiRuntimeAuthority({
    ledger: authorityLedger,
    dmsStorage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    payrollArtifactSecret: "postgres-outlook-time-entry-test-secret-material",
    bankImportPreviewTokens: createBankImportPreviewTokenAuthority({
      secret: "postgres-outlook-time-entry-preview-secret-material",
    }),
  });
  const context = permissionContext();
  const execute = (runtimeAuthority, requestId) => runtimeAuthority.run({
    tenant_id: TENANT,
    request_context: {
      method: "POST",
      pathname: "/api/outlook/time-entry-drafts",
      idempotency_key: requestBody().idempotency_key,
      actor_id: ACTOR,
    },
    command(runtimes) {
      return handleOutlookAddinApiRequest({
        pathname: "/api/outlook/time-entry-drafts",
        method: "POST",
        body: requestBody(),
        context,
        requestId,
        runtime: runtimes,
      });
    },
  });

  let transactionAttempts = 0;
  let injectedConflicts = 0;
  const conflictOnceLedger = Object.freeze({
    ...ledger,
    async transactionMany(...args) {
      transactionAttempts += 1;
      if (transactionAttempts === 1) {
        injectedConflicts += 1;
        throw Object.assign(new Error("injected Outlook draft baseline conflict"), {
          safe_error_code: "DOMAIN_BASELINE_CONFLICT",
        });
      }
      return ledger.transactionMany(...args);
    },
  });
  const first = await execute(authority(conflictOnceLedger), "postgres-outlook-time-first");
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(injectedConflicts, 1);
  assert.ok(transactionAttempts >= 2);
  const retried = await execute(authority(), "postgres-outlook-time-retry");
  assert.equal(retried.status, 200, JSON.stringify(retried.body));
  assert.equal(retried.body.outcome, "idempotent_replay");
  assert.deepEqual(retried.body.item, first.body.item);

  const rows = await ledger.list({ tenant_id: TENANT, domain_id: "finance", record_type: "TimeEntry" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].payload.status, "draft");
  assert.equal(rows[0].payload.approved_for_wip, false);
  assert.equal(rows[0].payload.source_email_ref, undefined);
  assert.match(rows[0].payload.source_ref, /^OutlookMatter:[a-f0-9]{64}$/u);
  const audits = await ledger.listAudit({ tenant_id: TENANT, domain_id: "finance" });
  assert.deepEqual(audits.map(({ event_type }) => event_type), ["time.entry.create"]);
});
