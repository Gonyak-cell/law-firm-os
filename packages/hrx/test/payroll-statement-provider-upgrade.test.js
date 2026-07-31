import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { loadHrxCoreMigrations } from "../src/migrations/index.js";

const TENANT = "tenant-statement-provider-upgrade";
const HASH = "a".repeat(64);

function apply(database, migrations) {
  for (const migration of migrations) {
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.sql);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

test("PEO-TUW-070 upgrades legacy statement delivery states without reporting them as newly queued", () => {
  const migrations = loadHrxCoreMigrations();
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  try {
    apply(database, migrations.slice(0, 39));
    for (const suffix of ["delivered", "viewed", "failed", "revoked", "self"]) {
      database.prepare(`
        INSERT INTO hrx_employees (tenant_id, employee_id, display_name, status)
        VALUES (?, ?, ?, 'active')
      `).run(TENANT, `employee-${suffix}`, `Legacy ${suffix}`);
    }
    database.prepare(`
      INSERT INTO hrx_payroll_periods (
        tenant_id, period_id, period_code, period_start, period_end,
        cutoff_at, pay_date, status, created_by_actor_id
      ) VALUES (?, 'period-legacy', '2026-06', '2026-06-01', '2026-06-30',
        '2026-06-30T18:00:00.000Z', '2026-07-05', 'closed', 'legacy-actor')
    `).run(TENANT);
    database.prepare(`
      INSERT INTO hrx_payroll_runs (
        tenant_id, run_id, period_id, run_type, status, prepared_by_actor_id
      ) VALUES (?, 'run-legacy', 'period-legacy', 'regular', 'closed', 'legacy-actor')
    `).run(TENANT);
    database.prepare(`
      INSERT INTO hrx_payroll_statement_templates (
        tenant_id, template_id, version_code, template_hash, schema_json,
        status, created_by_actor_id
      ) VALUES (?, 'template-legacy', 'legacy-v1', ?, '{}', 'published', 'legacy-actor')
    `).run(TENANT, HASH);

    const fixtures = [
      {
        suffix: "delivered",
        channel: "email",
        state: "delivered",
        delivered_at: "2026-07-05T01:02:00.000Z",
      },
      {
        suffix: "viewed",
        channel: "message",
        state: "viewed",
        delivered_at: "2026-07-05T01:02:00.000Z",
        viewed_at: "2026-07-05T01:05:00.000Z",
      },
      {
        suffix: "failed",
        channel: "email",
        state: "failed",
        failed_at: "2026-07-05T01:03:00.000Z",
      },
      {
        suffix: "revoked",
        channel: "email",
        state: "revoked",
        delivered_at: "2026-07-05T01:02:00.000Z",
      },
      {
        suffix: "self",
        channel: "self_service",
        state: "delivered",
        delivered_at: "2026-07-05T01:02:00.000Z",
      },
    ];
    for (const fixture of fixtures) {
      database.prepare(`
        INSERT INTO hrx_payroll_statements (
          tenant_id, statement_id, run_id, employee_id, template_id,
          document_ref, document_hash, state, generated_at, delivered_at,
          viewed_at, revoked_at
        ) VALUES (?, ?, 'run-legacy', ?, 'template-legacy', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        TENANT,
        `statement-${fixture.suffix}`,
        `employee-${fixture.suffix}`,
        `artifact:payroll/legacy/${fixture.suffix}`,
        HASH,
        fixture.state === "failed" ? "generated" : fixture.state,
        "2026-07-05T01:00:00.000Z",
        fixture.delivered_at ?? null,
        fixture.viewed_at ?? null,
        fixture.state === "revoked" ? "2026-07-05T01:10:00.000Z" : null,
      );
      database.prepare(`
        INSERT INTO hrx_payroll_delivery_receipts (
          tenant_id, delivery_receipt_id, statement_id, channel,
          provider_receipt_ref, receipt_hash, state, attempt_count,
          created_at, updated_at, delivered_at, viewed_at, failed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(
        TENANT,
        `receipt-${fixture.suffix}`,
        `statement-${fixture.suffix}`,
        fixture.channel,
        fixture.state === "failed" ? null : `provider:legacy/${fixture.suffix}`,
        fixture.state === "failed" ? null : HASH,
        fixture.state,
        "2026-07-05T01:00:00.000Z",
        "2026-07-05T01:10:00.000Z",
        fixture.delivered_at ?? null,
        fixture.viewed_at ?? null,
        fixture.failed_at ?? null,
      );
    }

    apply(database, migrations.slice(39));
    const rows = database.prepare(`
      SELECT delivery_receipt_id, provider_id, provider_result_state,
        safe_error_code, attempt_count, attempt_started_at, last_attempt_at
      FROM hrx_payroll_delivery_receipts
      WHERE tenant_id = ?
      ORDER BY delivery_receipt_id
    `).all(TENANT).map((row) => ({ ...row }));
    assert.deepEqual(rows, [
      {
        delivery_receipt_id: "receipt-delivered",
        provider_id: "legacy-unverified",
        provider_result_state: "delivered",
        safe_error_code: null,
        attempt_count: 1,
        attempt_started_at: "2026-07-05T01:02:00.000Z",
        last_attempt_at: "2026-07-05T01:02:00.000Z",
      },
      {
        delivery_receipt_id: "receipt-failed",
        provider_id: null,
        provider_result_state: "failed",
        safe_error_code: "LEGACY_DELIVERY_FAILED",
        attempt_count: 1,
        attempt_started_at: "2026-07-05T01:03:00.000Z",
        last_attempt_at: "2026-07-05T01:03:00.000Z",
      },
      {
        delivery_receipt_id: "receipt-revoked",
        provider_id: "legacy-unverified",
        provider_result_state: "delivered",
        safe_error_code: null,
        attempt_count: 1,
        attempt_started_at: "2026-07-05T01:02:00.000Z",
        last_attempt_at: "2026-07-05T01:02:00.000Z",
      },
      {
        delivery_receipt_id: "receipt-self",
        provider_id: "lawos-internal",
        provider_result_state: "delivered",
        safe_error_code: null,
        attempt_count: 1,
        attempt_started_at: "2026-07-05T01:02:00.000Z",
        last_attempt_at: "2026-07-05T01:02:00.000Z",
      },
      {
        delivery_receipt_id: "receipt-viewed",
        provider_id: "legacy-unverified",
        provider_result_state: "read",
        safe_error_code: null,
        attempt_count: 1,
        attempt_started_at: "2026-07-05T01:05:00.000Z",
        last_attempt_at: "2026-07-05T01:05:00.000Z",
      },
    ]);
    assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  } finally {
    database.close();
  }
});
