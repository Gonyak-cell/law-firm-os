import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCE_RUNTIME_SEED,
  handleFinancePostgresApiRequest,
} from "../src/finance-runtime-context.js";
import { createFinanceDomainSnapshot } from "../../../packages/billing/src/central-ledger.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { renderSimpleTextPdf } from "../../../packages/billing/src/invoice-pdf-service.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";

const TENANT = "tenant_cmp_g7_synthetic";

function request() {
  return {
    pathname: "/api/finance/time-entries",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-rs-dom-finance-api",
      audit_hint_ref: "audit-rs-dom-finance-api",
      actor_id: "user-rs-dom-finance-api",
      idempotency_key: "finance-api-postgres-rehearsal",
      time_entry: {
        time_entry_id: "time-finance-api-postgres-rehearsal",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        role_id: "partner",
        work_date: "2026-07-16",
        narrative: "Synthetic PostgreSQL Finance API rehearsal",
        duration_minutes: 30,
        billable: true,
      },
    },
    context: {
      principal: {
        user_id: "user-rs-dom-finance-api",
        tenant_id: TENANT,
        role_ids: ["partner"],
        scopes: ["finance.time.write"],
      },
      rules: [{ id: "finance-api-postgres-allow", effect: "allow", action: "*" }],
      object_acl: [],
    },
    requestId: "request-rs-dom-finance-api",
  };
}

function bankSourceFile() {
  const statement = renderSimpleTextPdf([
    "2026/07/28",
    "outflow 280,000 29,153,222  bank transfer  Synthetic counterparty",
    "14:50:03",
  ]);
  return {
    filename: "bank-statement.pdf",
    mime_type: "application/pdf",
    byte_size: statement.byteLength,
    content_base64: statement.toString("base64"),
  };
}

function bankPreviewRequest() {
  return {
    pathname: "/api/finance/bank-imports/preview",
    method: "POST",
    query: {},
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-bank-preview-postgres",
      audit_hint_ref: "audit-bank-preview-postgres",
      account_ref: "account-postgres-rehearsal",
      file: bankSourceFile(),
    },
    context: {
      principal: {
        user_id: "user-rs-dom-finance-admin",
        tenant_id: TENANT,
        role_ids: ["system_super_admin"],
        scopes: ["finance.bank.import", "finance.bank.read"],
      },
      rules: [{ id: "finance-bank-postgres-allow", effect: "allow", action: "*" }],
      object_acl: [],
    },
    requestId: "request-bank-preview-postgres",
  };
}

function bankImportRequest(previewConfirmationToken) {
  return {
    pathname: "/api/finance/bank-imports",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-bank-import-postgres",
      audit_hint_ref: "audit-bank-import-postgres",
      idempotency_key: "bank-import-postgres-rehearsal",
      tenant_id: TENANT,
      account_ref: "account-postgres-rehearsal",
      production_import_approved: true,
      preview_confirmation_token: previewConfirmationToken,
      file: bankSourceFile(),
    },
    context: {
      principal: {
        user_id: "user-rs-dom-finance-admin",
        tenant_id: TENANT,
        role_ids: ["system_super_admin"],
        scopes: ["finance.bank.import", "finance.bank.read"],
      },
      rules: [{ id: "finance-bank-postgres-allow", effect: "allow", action: "*" }],
      object_acl: [],
    },
    requestId: "request-bank-postgres",
  };
}

test("Finance async API adapter commits to PostgreSQL and replays idempotently without a production claim", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T21:10:00.000Z"),
  });
  const sourceRepository = createFinanceRepository({ seedRecords: FINANCE_RUNTIME_SEED });
  const source = createFinanceDomainSnapshot({
    repositories: [{ source_id: "finance-runtime-seed", repository: sourceRepository }],
    tenant_id: TENANT,
  });
  sourceRepository.close();
  await ledger.importSnapshot(source.snapshot);

  const first = await handleFinancePostgresApiRequest({ ledger, ...request() });
  const replay = await handleFinancePostgresApiRequest({ ledger, ...request() });
  assert.equal(first.response.status, 201);
  assert.equal(first.response.body.outcome, "created");
  assert.equal(first.persistence.shadow_equal, true);
  assert.equal(first.persistence.production_migrated, false);
  assert.equal(replay.response.status, 200);
  assert.equal(replay.response.body.outcome, "idempotent_replay");
  assert.equal(replay.persistence.shadow_equal, true);
});

test("BankTransaction import commits append-only rows to PostgreSQL and replays idempotently", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-28T06:00:00.000Z"),
  });
  const sourceRepository = createFinanceRepository({ seedRecords: FINANCE_RUNTIME_SEED });
  const source = createFinanceDomainSnapshot({
    repositories: [{ source_id: "finance-runtime-seed", repository: sourceRepository }],
    tenant_id: TENANT,
  });
  sourceRepository.close();
  await ledger.importSnapshot(source.snapshot);

  const preview = await handleFinancePostgresApiRequest({ ledger, ...bankPreviewRequest() });
  assert.equal(preview.response.status, 200);
  const previewConfirmationToken = preview.response.body.preview.preview_confirmation_token;
  const first = await handleFinancePostgresApiRequest({
    ledger,
    ...bankImportRequest(previewConfirmationToken),
  });
  const replay = await handleFinancePostgresApiRequest({
    ledger,
    ...bankImportRequest(previewConfirmationToken),
  });
  assert.equal(first.response.status, 201);
  assert.equal(first.response.body.transaction_count, 1);
  assert.equal(first.response.body.item.source_manifest_hash, undefined);
  assert.equal(first.persistence.shadow_equal, true);
  assert.equal(replay.response.status, 200);
  assert.equal(replay.response.body.outcome, "idempotent_replay");
  assert.equal(replay.persistence.shadow_equal, true);
});
