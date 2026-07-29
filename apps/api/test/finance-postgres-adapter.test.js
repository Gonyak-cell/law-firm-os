import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCE_RUNTIME_SEED,
  handleFinancePostgresApiRequest,
} from "../src/finance-runtime-context.js";
import { createFinanceDomainSnapshot } from "../../../packages/billing/src/central-ledger.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
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

function bankImportRequest() {
  return {
    pathname: "/api/finance/bank-imports",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-bank-import-postgres",
      audit_hint_ref: "audit-bank-import-postgres",
      idempotency_key: "bank-import-postgres-rehearsal",
      bank_import_batch: {
        bank_import_batch_id: "bank-import-postgres-001",
        tenant_id: TENANT,
        source_manifest_hash: "a".repeat(64),
        account_ref: "account-postgres-rehearsal",
        transaction_count: 1,
        overlap_count: 0,
        source_count: 2,
        production_import_approved: true,
      },
      transactions: [{
        bank_transaction_id: "bank-transaction-postgres-001",
        account_ref: "account-postgres-rehearsal",
        transaction_fingerprint: "b".repeat(64),
        date: "2026-07-28",
        occurred_at: "2026-07-28T14:50:03+09:00",
        time_precision: "second",
        direction: "outflow",
        amount: 280000,
        balance_after: 29153222,
        currency: "KRW",
        classification_scope: "unreviewed",
      }],
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

  const first = await handleFinancePostgresApiRequest({ ledger, ...bankImportRequest() });
  const replay = await handleFinancePostgresApiRequest({ ledger, ...bankImportRequest() });
  assert.equal(first.response.status, 201);
  assert.equal(first.response.body.transaction_count, 1);
  assert.equal(first.response.body.item.source_manifest_hash, undefined);
  assert.equal(first.persistence.shadow_equal, true);
  assert.equal(replay.response.status, 200);
  assert.equal(replay.response.body.outcome, "idempotent_replay");
  assert.equal(replay.persistence.shadow_equal, true);
});
