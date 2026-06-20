import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHrxPeopleAnalyticsReadModel } from "../src/analytics.js";
import { createHrxAnalyticsSnapshot, createSqlHrxAnalyticsSnapshotStore } from "../src/analytics-snapshot.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

function aggregateAnalytics() {
  return createHrxPeopleAnalyticsReadModel({
    tenant_id: "tenant-a",
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", status: "active" }],
    leave_requests: [],
    applications: [],
    workload_projection: [],
  });
}

test("HRX analytics snapshot stores aggregate hash without row-level details", () => {
  const snapshot = createHrxAnalyticsSnapshot({
    tenant_id: "tenant-a",
    snapshot_id: "snap-001",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    analytics: aggregateAnalytics(),
  });
  assert.equal(snapshot.snapshot_policy, "aggregate_only");
  assert.equal(snapshot.analytics_hash.length, 64);
  assert.equal(JSON.stringify(snapshot).includes("emp-001"), false);
  assert.throws(
    () =>
      createHrxAnalyticsSnapshot({
        tenant_id: "tenant-a",
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        analytics: { row_level_details_included: true, employee_id: "emp-001" },
      }),
    /row_level_details_included=false/,
  );
});

test("SQL HRX analytics snapshot store persists aggregate snapshots", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "hrx-analytics-snapshot-")), "store.json");
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const snapshots = createSqlHrxAnalyticsSnapshotStore({ store });
  snapshots.create({
    tenant_id: "tenant-a",
    snapshot_id: "snap-001",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    analytics: aggregateAnalytics(),
  });
  store.close();

  const reopenedStore = createFileHrxStore({ filePath });
  const reopenedSnapshots = createSqlHrxAnalyticsSnapshotStore({ store: reopenedStore });
  assert.equal(reopenedSnapshots.get({ tenant_id: "tenant-a", snapshot_id: "snap-001" }).snapshot_policy, "aggregate_only");
  reopenedStore.close();
});
