import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createSqlHrxDocumentStore } from "../src/documents.js";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeavePromotionService } from "../src/leave/promotion-service.js";
import { loadHrxCoreMigrations, runHrxMigrations } from "../src/migrations/index.js";
import { translateHrxMigrationToPostgres } from "../src/postgres-migrations.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT_A = "tenant-promotion-fingerprint-a";
const TENANT_B = "tenant-promotion-fingerprint-b";
const POLICY_VERSION_ID = "annual-policy-v1";
const SCHEDULE_PROFILE = "kr_lsa61_standard_v2025_10_23";
const OTHER_SCHEDULE_PROFILE = "kr_lsa61_first_year_v2025_10_23";

function employeeId(tenantId) {
  return `${tenantId}-employee`;
}

function seedTenant(store, tenantId) {
  const employee = employeeId(tenantId);
  store.query("insert", {
    table: "hrx_employees",
    row: {
      tenant_id: tenantId,
      employee_id: employee,
      display_name: "구성원",
      legal_name: "구성원",
      work_email: `${employee}@example.test`,
      status: "active",
      source_ref: `Synthetic:${employee}`,
    },
  });
  store.query("insert", {
    table: "hrx_leave_groups",
    row: {
      tenant_id: tenantId,
      group_id: "annual-group",
      code: "ANNUAL",
      display_name: "연차",
      status: "active",
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: {
      tenant_id: tenantId,
      policy_version_id: POLICY_VERSION_ID,
      group_id: "annual-group",
      policy_code: "annual",
      version: 1,
      effective_from: "2026-01-01",
      effective_to: null,
      status: "active",
      rules_json: JSON.stringify({
        promotion: {
          standard_day_minutes: 480,
          minimum_unused_minutes: 480,
        },
      }),
    },
  });
  store.query("insert", {
    table: "hrx_leave_entitlements",
    row: {
      tenant_id: tenantId,
      entitlement_id: "annual-entitlement",
      employee_id: employee,
      group_id: "annual-group",
      policy_version_id: POLICY_VERSION_ID,
      granted_minutes: 960,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: `SyntheticEntitlement:${employee}`,
      idempotency_key: "annual-entitlement",
      state_version: 1,
    },
  });
  createSqlLeaveBalanceLedger({ store }).append({
    tenant_id: tenantId,
    entry_id: "annual-earned",
    employee_id: employee,
    policy_id: "annual",
    group_id: "annual-group",
    policy_version_id: POLICY_VERSION_ID,
    entitlement_id: "annual-entitlement",
    idempotency_key: "annual-earned",
    entry_type: "earned",
    amount_minutes: 960,
    occurred_on: "2026-01-01",
    source_ref: `SyntheticLedger:${employee}`,
  });
}

function context(tenantId) {
  return Object.freeze({
    tenant_id: tenantId,
    actor_id: `${tenantId}-operator`,
    authorized_employee_ids: [employeeId(tenantId)],
  });
}

function serviceFor(store, label) {
  let sequence = 0;
  return createLeavePromotionService({
    store,
    documents: createSqlHrxDocumentStore({ store }),
    clock: () => "2026-07-05T01:00:00.000Z",
    idFactory: (prefix) => `${prefix}-${label}-${++sequence}`,
    employeeDirectory: ({ tenant_id: tenantId }) => [{
      employee_id: employeeId(tenantId),
      display_name: "구성원",
      status: "active",
    }],
  });
}

function campaignInput(idempotencyKey, scheduleProfileId = SCHEDULE_PROFILE) {
  return Object.freeze({
    policy_version_id: POLICY_VERSION_ID,
    entitlement_period_end: "2026-12-31",
    schedule_profile_id: scheduleProfileId,
    idempotency_key: idempotencyKey,
  });
}

test("promotion campaign business fingerprint is durable, tenant-scoped, and race-safe", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "hrx-promotion-fingerprint-"));
  const filePath = join(directory, "hrx-store.json");
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const seeded = createFileHrxStore({ filePath });
  runHrxMigrations(seeded);
  seedTenant(seeded, TENANT_A);
  seedTenant(seeded, TENANT_B);
  seeded.close();

  const writerA = createFileHrxStore({ filePath });
  const writerB = createFileHrxStore({ filePath });
  const serviceA = serviceFor(writerA, "writer-a");
  const serviceB = serviceFor(writerB, "writer-b");

  const created = serviceA.create(context(TENANT_A), campaignInput("client-key-a"));
  const concurrentReplay = serviceB.create(context(TENANT_A), campaignInput("client-key-b"));
  assert.equal(concurrentReplay.campaign_id, created.campaign_id);
  assert.match(created.business_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(
    writerB.query("select", {
      table: "hrx_leave_promotion_campaigns",
      where: { tenant_id: TENANT_A },
    }).length,
    1,
  );

  assert.throws(
    () => serviceB.create(
      context(TENANT_A),
      campaignInput("client-key-a", OTHER_SCHEDULE_PROFILE),
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_PROMOTION_IDEMPOTENCY_REUSED",
  );
  assert.throws(
    () => serviceB.create(
      context(TENANT_A),
      campaignInput("client-key-b", OTHER_SCHEDULE_PROFILE),
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_PROMOTION_IDEMPOTENCY_REUSED",
  );

  const differentCampaign = serviceB.create(
    context(TENANT_A),
    campaignInput("client-key-c", OTHER_SCHEDULE_PROFILE),
  );
  assert.notEqual(differentCampaign.campaign_id, created.campaign_id);
  assert.notEqual(differentCampaign.business_fingerprint, created.business_fingerprint);

  const crossTenantCampaign = serviceB.create(
    context(TENANT_B),
    campaignInput("client-key-a"),
  );
  assert.notEqual(crossTenantCampaign.campaign_id, created.campaign_id);
  assert.equal(crossTenantCampaign.business_fingerprint, created.business_fingerprint);

  const stored = writerB.query("selectOne", {
    table: "hrx_leave_promotion_campaigns",
    where: { tenant_id: TENANT_A, campaign_id: created.campaign_id },
  });
  assert.throws(
    () => writerB.query("insert", {
      table: "hrx_leave_promotion_campaigns",
      row: {
        ...stored,
        campaign_id: "campaign-direct-duplicate",
        idempotency_key: "direct-duplicate-key",
      },
    }),
    /unique constraint failed: tenant_id, business_fingerprint/,
  );
  assert.throws(
    () => writerB.query("insert", {
      table: "hrx_leave_promotion_campaigns",
      row: {
        ...stored,
        campaign_id: "campaign-direct-basis-duplicate",
        idempotency_key: "direct-basis-duplicate-key",
        business_fingerprint: "f".repeat(64),
      },
    }),
    /fingerprinted business basis must be unique/,
  );
  assert.throws(
    () => writerB.query("updateOne", {
      table: "hrx_leave_promotion_campaigns",
      where: { tenant_id: TENANT_A, campaign_id: created.campaign_id },
      patch: { business_fingerprint: null },
    }),
    /business_fingerprint is invalid or immutable/,
  );
  for (const patch of [
    { policy_version_id: "other-policy-v1" },
    { entitlement_period_end: "2027-12-31" },
    { schedule_profile_id: OTHER_SCHEDULE_PROFILE },
  ]) {
    assert.throws(
      () => writerB.query("updateOne", {
        table: "hrx_leave_promotion_campaigns",
        where: { tenant_id: TENANT_A, campaign_id: created.campaign_id },
        patch,
      }),
      /business_fingerprint is invalid or immutable/,
    );
  }

  writerA.close();
  writerB.close();

  const reopened = createFileHrxStore({ filePath });
  runHrxMigrations(reopened);
  const restartReplay = serviceFor(reopened, "restart").create(context(TENANT_A), {
    ...campaignInput("client-key-after-restart"),
    reference_date: "2026-07-02",
  });
  assert.equal(restartReplay.campaign_id, created.campaign_id);
  assert.equal(
    reopened.query("select", {
      table: "hrx_leave_promotion_campaigns",
      where: { tenant_id: TENANT_A },
    }).length,
    2,
  );
  assert.equal(
    reopened.query("select", {
      table: "hrx_leave_promotion_campaigns",
      where: { tenant_id: TENANT_B },
    }).length,
    1,
  );
  assert.equal(
    reopened.query("select", {
      table: "hrx_audit_events",
      where: { tenant_id: TENANT_A, action: "hrx.leave.promotion.create" },
    }).length,
    2,
  );
  assert.equal(
    reopened.query("select", {
      table: "hrx_leave_command_receipts",
      where: {
        tenant_id: TENANT_A,
        command_type: "leave_promotion_campaign_create",
      },
    }).length,
    4,
  );
  assert.throws(
    () => serviceFor(reopened, "restart-conflict").create(
      context(TENANT_A),
      campaignInput("client-key-after-restart", OTHER_SCHEDULE_PROFILE),
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_PROMOTION_IDEMPOTENCY_REUSED",
  );
  reopened.close();
});

test("045 migration declares durable fingerprint uniqueness", () => {
  const migration = loadHrxCoreMigrations().find(
    (candidate) => candidate.id === "045_hrx_leave_promotion_fingerprint",
  );
  assert.ok(migration);
  assert.match(
    migration.sql,
    /ADD COLUMN business_fingerprint TEXT/,
  );
  assert.match(
    migration.sql,
    /UNIQUE INDEX IF NOT EXISTS uq_hrx_leave_promotion_business_fingerprint[\s\S]*tenant_id, business_fingerprint/,
  );
  assert.match(
    migration.sql,
    /UNIQUE INDEX IF NOT EXISTS uq_hrx_leave_promotion_fingerprinted_basis[\s\S]*policy_version_id[\s\S]*entitlement_period_end[\s\S]*schedule_profile_id[\s\S]*WHERE business_fingerprint IS NOT NULL/,
  );
  const postgresSql = translateHrxMigrationToPostgres(migration.sql);
  assert.doesNotMatch(postgresSql, /RAISE\s*\(\s*ABORT/);
  assert.match(
    postgresSql,
    /require_hrx_leave_promotion_fingerprint[\s\S]*business_fingerprint !~ '\^\[a-f0-9\]\{64\}\$'[\s\S]*TG_OP = 'UPDATE'[\s\S]*policy_version_id IS DISTINCT FROM OLD.policy_version_id[\s\S]*entitlement_period_end IS DISTINCT FROM OLD.entitlement_period_end[\s\S]*schedule_profile_id IS DISTINCT FROM OLD.schedule_profile_id/,
  );
  assert.match(
    postgresSql,
    /CREATE TRIGGER trg_hrx_leave_promotion_fingerprint_update[\s\S]*BEFORE UPDATE OF business_fingerprint, policy_version_id,[\s\S]*entitlement_period_end, schedule_profile_id/,
  );
});

test("045 migration preserves legal pre-fix duplicate campaigns and guards new fingerprints", () => {
  const database = new DatabaseSync(":memory:");
  const migration = loadHrxCoreMigrations().find(
    (candidate) => candidate.id === "045_hrx_leave_promotion_fingerprint",
  );
  try {
    database.exec(`
      CREATE TABLE hrx_leave_promotion_campaigns (
        tenant_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        policy_version_id TEXT NOT NULL,
        reference_date TEXT NOT NULL,
        state TEXT NOT NULL,
        legal_schedule_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        entitlement_period_end TEXT NOT NULL,
        schedule_profile_id TEXT NOT NULL,
        legal_basis_code TEXT NOT NULL,
        legal_basis_version TEXT NOT NULL,
        legal_review_state TEXT NOT NULL,
        timezone TEXT NOT NULL,
        threshold_minutes INTEGER NOT NULL,
        standard_day_minutes INTEGER NOT NULL,
        source_version TEXT NOT NULL,
        calculation_snapshot_hash TEXT NOT NULL,
        target_count INTEGER NOT NULL,
        idempotency_key TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        excluded_count INTEGER NOT NULL,
        exclusions_json TEXT NOT NULL,
        PRIMARY KEY (tenant_id, campaign_id),
        UNIQUE (tenant_id, idempotency_key)
      );
    `);
    const insertLegacy = database.prepare(`
      INSERT INTO hrx_leave_promotion_campaigns (
        tenant_id, campaign_id, policy_version_id, reference_date, state,
        legal_schedule_json, created_at, entitlement_period_end,
        schedule_profile_id, legal_basis_code, legal_basis_version,
        legal_review_state, timezone, threshold_minutes, standard_day_minutes,
        source_version, calculation_snapshot_hash, target_count,
        idempotency_key, updated_at, excluded_count, exclusions_json
      ) VALUES (
        'tenant-upgrade', ?, 'policy-v1', '2026-07-01', 'active',
        '{}', '2026-07-01T00:00:00.000Z', '2026-12-31',
        'kr_lsa61_standard_v2025_10_23', 'KR_LSA_ARTICLE_61',
        'effective_2025-10-23', 'required', 'Asia/Seoul', 480, 480,
        'source-v1', 'snapshot-v1', 0, ?,
        '2026-07-01T00:00:00.000Z', 0, '[]'
      )
    `);
    insertLegacy.run("legacy-campaign-a", "legacy-key-a");
    insertLegacy.run("legacy-campaign-b", "legacy-key-b");

    assert.doesNotThrow(() => database.exec(migration.sql));
    assert.equal(
      database.prepare(`
        SELECT COUNT(*) AS count
        FROM hrx_leave_promotion_campaigns
        WHERE tenant_id = 'tenant-upgrade'
      `).get().count,
      2,
    );
    assert.throws(
      () => insertLegacy.run("post-migration-null", "post-migration-null-key"),
      /leave promotion campaign business fingerprint is required/,
    );
    assert.throws(
      () => database.exec(`
        INSERT INTO hrx_leave_promotion_campaigns (
          tenant_id, campaign_id, policy_version_id, reference_date, state,
          legal_schedule_json, created_at, entitlement_period_end,
          schedule_profile_id, legal_basis_code, legal_basis_version,
          legal_review_state, timezone, threshold_minutes, standard_day_minutes,
          source_version, calculation_snapshot_hash, target_count,
          idempotency_key, updated_at, excluded_count, exclusions_json,
          business_fingerprint
        ) VALUES (
          'tenant-upgrade', 'post-migration-invalid', 'policy-v1',
          '2026-07-01', 'active', '{}', '2026-07-01T00:00:00.000Z',
          '2027-12-31', 'kr_lsa61_first_year_v2025_10_23',
          'KR_LSA_ARTICLE_61', 'effective_2025-10-23', 'required',
          'Asia/Seoul', 480, 480, 'source-v2', 'snapshot-v2', 0,
          'post-migration-invalid-key', '2026-07-01T00:00:00.000Z',
          0, '[]', 'not-a-sha256'
        )
      `),
      /leave promotion campaign business fingerprint is required/,
    );

    database.prepare(`
      UPDATE hrx_leave_promotion_campaigns
      SET business_fingerprint = ?
      WHERE tenant_id = 'tenant-upgrade' AND campaign_id = 'legacy-campaign-a'
    `).run("a".repeat(64));
    for (const invalidFingerprint of [null, "not-a-sha256", "b".repeat(64)]) {
      assert.throws(
        () => database.prepare(`
          UPDATE hrx_leave_promotion_campaigns
          SET business_fingerprint = ?
          WHERE tenant_id = 'tenant-upgrade' AND campaign_id = 'legacy-campaign-a'
        `).run(invalidFingerprint),
        /leave promotion campaign business fingerprint is invalid or immutable/,
      );
    }
    for (const [field, value] of [
      ["policy_version_id", "policy-v2"],
      ["entitlement_period_end", "2027-12-31"],
      ["schedule_profile_id", "kr_lsa61_first_year_v2025_10_23"],
    ]) {
      assert.throws(
        () => database.prepare(`
          UPDATE hrx_leave_promotion_campaigns
          SET ${field} = ?
          WHERE tenant_id = 'tenant-upgrade' AND campaign_id = 'legacy-campaign-a'
        `).run(value),
        /leave promotion campaign business fingerprint is invalid or immutable/,
      );
    }
    assert.throws(
      () => database.prepare(`
        INSERT INTO hrx_leave_promotion_campaigns (
          tenant_id, campaign_id, policy_version_id, reference_date, state,
          legal_schedule_json, created_at, entitlement_period_end,
          schedule_profile_id, legal_basis_code, legal_basis_version,
          legal_review_state, timezone, threshold_minutes, standard_day_minutes,
          source_version, calculation_snapshot_hash, target_count,
          idempotency_key, updated_at, excluded_count, exclusions_json,
          business_fingerprint
        ) VALUES (
          'tenant-upgrade', 'post-migration-same-basis', 'policy-v1',
          '2026-07-01', 'active', '{}', '2026-07-01T00:00:00.000Z',
          '2026-12-31', 'kr_lsa61_standard_v2025_10_23',
          'KR_LSA_ARTICLE_61', 'effective_2025-10-23', 'required',
          'Asia/Seoul', 480, 480, 'source-v2', 'snapshot-v2', 0,
          'post-migration-same-basis-key', '2026-07-01T00:00:00.000Z',
          0, '[]', ?
        )
      `).run("c".repeat(64)),
      /UNIQUE constraint failed/,
    );
    assert.throws(
      () => database.prepare(`
        UPDATE hrx_leave_promotion_campaigns
        SET business_fingerprint = ?
        WHERE tenant_id = 'tenant-upgrade' AND campaign_id = 'legacy-campaign-b'
      `).run("a".repeat(64)),
      /UNIQUE constraint failed/,
    );
  } finally {
    database.close();
  }
});

test("legacy duplicate business fails closed even through an original idempotency key", () => {
  const source = createFileHrxStore();
  runHrxMigrations(source);
  seedTenant(source, TENANT_A);
  serviceFor(source, "legacy-source").create(
    context(TENANT_A),
    campaignInput("legacy-original-key"),
  );
  serviceFor(source, "legacy-alias").create(
    context(TENANT_A),
    campaignInput("legacy-alias-key"),
  );
  const snapshot = source.snapshot();
  source.close();

  const [original] = snapshot.tables.hrx_leave_promotion_campaigns;
  delete original.business_fingerprint;
  snapshot.tables.hrx_leave_promotion_campaigns.push({
    ...original,
    campaign_id: "legacy-duplicate-campaign",
    idempotency_key: "legacy-duplicate-key",
  });

  const legacy = createFileHrxStore({ initialState: snapshot });
  for (const idempotencyKey of [
    "legacy-original-key",
    "legacy-alias-key",
    "legacy-duplicate-key",
    "legacy-new-key",
  ]) {
    assert.throws(
      () => serviceFor(legacy, `legacy-read-${idempotencyKey}`).create(
        context(TENANT_A),
        campaignInput(idempotencyKey),
      ),
      (error) => error.safe_error_code === "HRX_LEAVE_PROMOTION_DUPLICATE_BUSINESS",
    );
  }
  const restartSnapshot = legacy.snapshot();
  legacy.close();

  const reopened = createFileHrxStore({ initialState: restartSnapshot });
  assert.throws(
    () => serviceFor(reopened, "legacy-restart").create(
      context(TENANT_A),
      campaignInput("legacy-alias-key"),
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_PROMOTION_DUPLICATE_BUSINESS",
  );
  reopened.close();
});
