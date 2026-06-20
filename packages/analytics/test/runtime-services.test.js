import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createAnalyticsExport,
  createAnalyticsRepository,
  createClientProfitability,
  createEmployeeUtilization,
  createMatterProfitability,
  createRealizationMetric,
  recordAnalyticsEvent,
  refreshAnalyticsReadModels,
} from "../src/index.js";

const TENANT = "tenant-cmp-g8";
const MATTER = "matter-cmp-g8";
const ACTOR = "user-cmp-g8";

function createMetricSet(repository) {
  recordAnalyticsEvent({
    repository,
    analytics_event: {
      analytics_event_id: "event-g8-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      event_type: "invoice_payment_time_joined",
      source_refs: [{ source_type: "invoice", source_id: "invoice-g8-001" }],
    },
    actor_id: ACTOR,
    idempotency_key: "event-1",
  });
  const matter = createMatterProfitability({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    time_entries: [{ standard_value: 400000 }],
    invoices: [{ amount_due: 350000 }],
    payments: [{ amount: 300000 }],
    actor_id: ACTOR,
    idempotency_key: "matter-profit-1",
  });
  createClientProfitability({
    repository,
    tenant_id: TENANT,
    client_group_id: "client-group-g8",
    matter_rows: [{ profitability_amount: matter.item.profitability_amount }],
    actor_id: ACTOR,
    idempotency_key: "client-profit-1",
  });
  createEmployeeUtilization({
    repository,
    tenant_id: TENANT,
    employee_id: "employee-g8",
    period_id: "2026-06",
    capacity_hours: 160,
    billable_hours: 120,
    actor_id: ACTOR,
    idempotency_key: "util-1",
  });
  createRealizationMetric({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    billed_value: 350000,
    standard_value: 400000,
    actor_id: ACTOR,
    idempotency_key: "realization-1",
  });
  const refresh = refreshAnalyticsReadModels({ repository, tenant_id: TENANT, actor_id: ACTOR, idempotency_key: "refresh-1" });
  createAnalyticsExport({
    repository,
    analytics_export: {
      analytics_export_id: "export-g8-001",
      tenant_id: TENANT,
      dashboard_id: refresh.dashboards[0].dashboard_id,
    },
    actor_id: ACTOR,
    idempotency_key: "export-1",
    permission_ref: "perm-analytics-export",
  });
  return { matter, refresh };
}

test("G8 analytics repository persists read models, audit, and idempotency", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "analytics-g8-")), "analytics.json");
  const repository = createAnalyticsRepository({ filePath: storePath });
  createMetricSet(repository);
  repository.close();

  const reopened = createAnalyticsRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "AnalyticsDashboard" }).length, 3);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "refresh-1" }).operation, "analytics_read_model_refresh");
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).some((event) => event.action === "analytics.export.create"), true);
});

test("G8 analytics runtime blocks source mutation and computes safe read models", () => {
  const repository = createAnalyticsRepository();
  assert.throws(
    () =>
      recordAnalyticsEvent({
        repository,
        analytics_event: {
          analytics_event_id: "event-bad",
          tenant_id: TENANT,
          matter_id: MATTER,
          event_type: "bad",
          source_refs: [{ source_type: "matter", source_id: MATTER }],
          mutates_source_object: true,
        },
        actor_id: ACTOR,
        idempotency_key: "event-bad",
      }),
    /cannot mutate source/,
  );
  const { matter, refresh } = createMetricSet(repository);
  assert.equal(matter.item.source_object_mutated, false);
  assert.equal(matter.item.profitability_amount, -100000);
  assert.equal(refresh.dashboards.length, 3);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "AnalyticsExport" })[0].credential_material_included, false);
});
