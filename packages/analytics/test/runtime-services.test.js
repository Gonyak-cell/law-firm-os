import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import {
  computeFinanceDashboardMetrics,
  createAnalyticsExport,
  createAnalyticsRepository,
  createClientProfitability,
  createEmployeeUtilization,
  createMatterProfitability,
  createRealizationMetric,
  recordAnalyticsEvent,
  refreshAnalyticsReadModels,
  selectFinanceRowsForMatter,
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
    client_group_id: "client-group-g8",
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
    matter_rows: [matter.item],
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
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "AnalyticsDashboard" }).length, 5);
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
  assert.equal(refresh.dashboards.length, 5);
  const dashboards = Object.fromEntries(refresh.dashboards.map((dashboard) => [dashboard.dashboard_id, dashboard]));
  assert.equal(dashboards["dashboard-realization"].metric_value, 87.5);
  assert.equal(dashboards["dashboard-employee-utilization"].metric_value, 75);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "AnalyticsExport" })[0].credential_material_included, false);
});

test("G8 dashboard refresh computes metrics from finance repository instead of constants", () => {
  const analyticsRepository = createAnalyticsRepository();
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate-g8-b08",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-07-01",
        role_rates: [{ role_id: "partner", hourly_rate: 150000 }],
        status: "active",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time-g8-b08",
        tenant_id: TENANT,
        matter_id: MATTER,
        actor_id: ACTOR,
        role_id: "partner",
        duration_minutes: 120,
        billable: true,
        status: "approved",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-g8-b08",
        tenant_id: TENANT,
        matter_id: MATTER,
        amount_due: 900000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-g8-b08",
        tenant_id: TENANT,
        matter_id: MATTER,
        bank_reference: "bank-g8-b08",
        amount: 450000,
        currency: "KRW",
      },
      {
        model_type: "ARBalance",
        ar_balance_id: "ar-g8-b08",
        tenant_id: TENANT,
        matter_id: MATTER,
        invoice_id: "invoice-g8-b08",
        balance: 450000,
        status: "open",
      },
    ],
  });

  const metrics = computeFinanceDashboardMetrics({ financeRepository, analyticsRepository, tenant_id: TENANT });
  const rows = selectFinanceRowsForMatter({ financeRepository, tenant_id: TENANT, matter_id: MATTER });
  assert.equal(metrics.metric_source, "finance_repository");
  assert.equal(metrics.ar_open_balance, 450000);
  assert.equal(metrics.client_health_percent, 50);
  assert.equal(metrics.practice_pnl_amount, 600000);
  assert.equal(rows.time_entries[0].standard_value, 300000);
  assert.equal(rows.invoices[0].amount_due, 900000);
  assert.equal(rows.payments[0].amount, 450000);

  const refresh = refreshAnalyticsReadModels({
    repository: analyticsRepository,
    financeRepository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "refresh-finance-derived-1",
  });
  const dashboards = Object.fromEntries(refresh.dashboards.map((dashboard) => [dashboard.dashboard_id, dashboard]));
  assert.equal(dashboards["dashboard-ar-aging"].metric_value, 450000);
  assert.equal(dashboards["dashboard-client-health"].metric_value, 50);
  assert.equal(dashboards["dashboard-practice-pnl"].metric_value, 600000);
  assert.equal(dashboards["dashboard-ar-aging"].metric_source, "finance_repository");

  const refreshSource = readFileSync(new URL("../src/refresh-job-service.js", import.meta.url), "utf8");
  assert.equal(/metric_value:\s*(400000|87|32)\b/.test(refreshSource), false);
});

test("G8 client profitability aggregates only matching client group matter rows", () => {
  const repository = createAnalyticsRepository();
  const clientOneMatter = createMatterProfitability({
    repository,
    tenant_id: TENANT,
    matter_id: "matter-client-one",
    client_group_id: "client-group-one",
    time_entries: [{ standard_value: 100000 }],
    invoices: [{ amount_due: 300000 }],
    payments: [{ amount: 250000 }],
    actor_id: ACTOR,
    idempotency_key: "matter-profit-client-one",
  });
  const clientTwoMatter = createMatterProfitability({
    repository,
    tenant_id: TENANT,
    matter_id: "matter-client-two",
    client_group_id: "client-group-two",
    time_entries: [{ standard_value: 400000 }],
    invoices: [{ amount_due: 500000 }],
    payments: [{ amount: 300000 }],
    actor_id: ACTOR,
    idempotency_key: "matter-profit-client-two",
  });

  assert.equal(clientOneMatter.item.client_group_id, "client-group-one");
  assert.equal(clientTwoMatter.item.client_group_id, "client-group-two");

  const clientOne = createClientProfitability({
    repository,
    tenant_id: TENANT,
    client_group_id: "client-group-one",
    matter_rows: [clientOneMatter.item, clientTwoMatter.item],
    actor_id: ACTOR,
    idempotency_key: "client-profit-one",
  });
  const clientTwo = createClientProfitability({
    repository,
    tenant_id: TENANT,
    client_group_id: "client-group-two",
    matter_rows: [clientOneMatter.item, clientTwoMatter.item],
    actor_id: ACTOR,
    idempotency_key: "client-profit-two",
  });

  assert.equal(clientOne.item.matter_count, 1);
  assert.equal(clientOne.item.profitability_amount, 150000);
  assert.equal(clientTwo.item.matter_count, 1);
  assert.equal(clientTwo.item.profitability_amount, -100000);
  assert.notEqual(clientOne.item.profitability_amount, clientTwo.item.profitability_amount);
});
