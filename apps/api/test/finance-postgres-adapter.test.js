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
