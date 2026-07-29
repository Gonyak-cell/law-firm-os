import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import {
  classifyAnalyticsFreshness,
  computeFinanceDashboardMetrics,
  buildCashflowReadModel,
  buildFinanceReadModels,
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

function listRepository(records) {
  return {
    list(query = {}) {
      return records.filter((record) =>
        (!query.tenant_id || record.tenant_id === query.tenant_id) &&
        (!query.model_type || record.model_type === query.model_type)
      );
    },
  };
}

function financeReadModelFixture() {
  return createFinanceRepository({
    seedRecords: [
      { model_type: "Invoice", invoice_id: "inv-krw", tenant_id: TENANT, matter_id: "matter-a", billing_client_party_id: "party-a", amount_due: 1000, currency: "KRW", issued_at: "2026-06-30T16:00:00.000Z", status: "issued" },
      { model_type: "Invoice", invoice_id: "inv-cancelled", tenant_id: TENANT, matter_id: "matter-a", billing_client_party_id: "party-a", amount_due: 900, currency: "KRW", issued_at: "2026-07-02", status: "cancelled" },
      { model_type: "Invoice", invoice_id: "inv-usd", tenant_id: TENANT, matter_id: "matter-a", client_group_id: "client-group-a", amount_due: 20, currency: "USD", issued_at: "2026-07-15", status: "issued" },
      { model_type: "BillingAdjustment", adjustment_id: "adjust-credit", tenant_id: TENANT, invoice_id: "inv-krw", adjustment_amount: 100, adjustment_type: "credit", adjusted_at: "2026-07-03", status: "approved" },
      { model_type: "Payment", payment_id: "pay-partial", tenant_id: TENANT, matter_id: "matter-a", billing_client_party_id: "party-a", amount: 700, currency: "KRW", received_at: "2026-07-04", status: "received" },
      { model_type: "PaymentMatch", payment_match_id: "match-partial", tenant_id: TENANT, payment_id: "pay-partial", invoice_id: "inv-krw", matched_amount: 400, currency: "KRW", matched_at: "2026-07-05", status: "matched" },
      { model_type: "Expense", expense_id: "expense-inferred", tenant_id: TENANT, matter_id: "matter-a", amount: 200, currency: "KRW", approved_for_wip: true, status: "approved", created_at: "2026-07-06T01:00:00.000Z" },
      { model_type: "Disbursement", disbursement_id: "disbursement-unlinked", tenant_id: TENANT, matter_id: "matter-unlinked", amount: 50, currency: "KRW", recoverable: true, disbursed_at: "2026-07-07", status: "approved" },
      { model_type: "ARBalance", ar_balance_id: "ar-open", tenant_id: TENANT, matter_id: "matter-a", invoice_id: "inv-krw", billing_client_party_id: "party-a", balance: 500, currency: "KRW", as_of_date: "2026-07-31", status: "open" },
    ],
  });
}

function canonicalClientRepositories() {
  return {
    masterDataRepository: listRepository([
      { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-group-a", display_name: "고객 A" },
      { model_type: "BillingProfile", tenant_id: TENANT, billing_profile_id: "billing-a", client_group_id: "client-group-a", billing_client_party_id: "party-a" },
    ]),
    matterRepository: listRepository([
      { model_type: "Matter", tenant_id: TENANT, matter_id: "matter-a", billing_client_party_id: "party-a" },
      { model_type: "Matter", tenant_id: TENANT, matter_id: "matter-unlinked" },
    ]),
  };
}

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

test("cashflow read model derives balance and movements only from append-only bank transactions", () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "BankImportBatch",
        bank_import_batch_id: "batch-cashflow-1",
        tenant_id: TENANT,
        source_manifest_hash: "a".repeat(64),
        account_ref: "account-cashflow",
        transaction_count: 3,
        status: "reconciled",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-cashflow-1",
        bank_import_batch_id: "batch-cashflow-1",
        tenant_id: TENANT,
        account_ref: "account-cashflow",
        transaction_fingerprint: "b".repeat(64),
        date: "2026-07-01",
        occurred_at: "2026-07-01T09:00:00+09:00",
        direction: "inflow",
        amount: 1000,
        balance_after: 1000,
        currency: "KRW",
        classification_state: "unreviewed",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-cashflow-2",
        bank_import_batch_id: "batch-cashflow-1",
        tenant_id: TENANT,
        account_ref: "account-cashflow",
        transaction_fingerprint: "c".repeat(64),
        date: "2026-07-02",
        occurred_at: "2026-07-02T09:00:00+09:00",
        direction: "outflow",
        amount: 300,
        balance_after: 700,
        currency: "KRW",
        classification_state: "source_classified",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-cashflow-3",
        bank_import_batch_id: "batch-cashflow-1",
        tenant_id: TENANT,
        account_ref: "account-cashflow",
        transaction_fingerprint: "d".repeat(64),
        date: "2026-08-01",
        occurred_at: "2026-08-01T09:00:00+09:00",
        direction: "inflow",
        amount: 200,
        balance_after: 900,
        currency: "KRW",
        classification_state: "unreviewed",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-not-cashflow",
        tenant_id: TENANT,
        matter_id: MATTER,
        amount_due: 500000,
        currency: "KRW",
        status: "issued",
      },
    ],
  });
  const model = buildCashflowReadModel({
    financeRepository,
    tenant_id: TENANT,
    from: "2026-07-01",
    to: "2026-07-31",
  });
  assert.deepEqual(model.summary, {
    currency: "KRW",
    current_balance: 700,
    total_inflow: 1000,
    total_outflow: 300,
    net_movement: 700,
    transaction_count: 2,
    account_count: 1,
    classification_review_count: 1,
    zero_amount_source_count: 0,
    basis_at: "2026-07-02T09:00:00+09:00",
  });
  assert.equal(model.monthly[0].net_movement, 700);
  assert.equal(model.business_summary.classified_count, 0);
  assert.equal(model.business_summary.unclassified_count, 2);
  assert.deepEqual(model.non_payroll_outflow_categories, [{
    category: "unclassified",
    label: "미분류",
    primary_type: "unclassified",
    amount: 300,
    transaction_count: 1,
    individual_values_included: false,
  }]);
  assert.equal(model.reconciliation.status, "passed");
  assert.equal(model.raw_source_payload_included, false);
});

test("cashflow classification read model exposes bank-derived sales, cost, and aggregate payroll without employee values", () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-business-sales",
        tenant_id: TENANT,
        account_ref: "account-business",
        transaction_fingerprint: "e".repeat(64),
        date: "2026-07-03",
        occurred_at: "2026-07-03T09:00:00+09:00",
        direction: "inflow",
        amount: 1200,
        balance_after: 1200,
        currency: "KRW",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-business-payroll",
        tenant_id: TENANT,
        account_ref: "account-business",
        transaction_fingerprint: "f".repeat(64),
        date: "2026-07-04",
        occurred_at: "2026-07-04T09:00:00+09:00",
        direction: "outflow",
        amount: 700,
        balance_after: 500,
        currency: "KRW",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-business-tax",
        tenant_id: TENANT,
        account_ref: "account-business",
        transaction_fingerprint: "1".repeat(64),
        date: "2026-07-05",
        occurred_at: "2026-07-05T09:00:00+09:00",
        direction: "outflow",
        amount: 200,
        balance_after: 300,
        currency: "KRW",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id: "classification-business-sales",
        tenant_id: TENANT,
        bank_transaction_id: "bank-business-sales",
        account_ref: "account-business",
        transaction_date: "2026-07-03",
        transaction_month: "2026-07",
        transaction_direction: "inflow",
        amount: 1200,
        currency: "KRW",
        primary_type: "sales",
        category: "client_receipt",
        client_group_id: "client-business",
        status: "confirmed",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id: "classification-business-payroll",
        tenant_id: TENANT,
        bank_transaction_id: "bank-business-payroll",
        account_ref: "account-business",
        transaction_date: "2026-07-04",
        transaction_month: "2026-07",
        transaction_direction: "outflow",
        amount: 700,
        currency: "KRW",
        primary_type: "payroll",
        category: "salary_payment",
        employee_id: "employee-private",
        payroll_category: "partner",
        status: "confirmed",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id: "classification-business-tax",
        tenant_id: TENANT,
        bank_transaction_id: "bank-business-tax",
        account_ref: "account-business",
        transaction_date: "2026-07-05",
        transaction_month: "2026-07",
        transaction_direction: "outflow",
        amount: 200,
        currency: "KRW",
        primary_type: "operating_expense",
        category: "tax",
        category_label: "세금",
        status: "confirmed",
      },
    ],
  });
  const model = buildCashflowReadModel({
    financeRepository,
    tenant_id: TENANT,
    from: "2026-07-01",
    to: "2026-07-31",
  });
  assert.deepEqual(
    {
      sales_amount: model.business_summary.sales_amount,
      operating_expense_amount: model.business_summary.operating_expense_amount,
      payroll_payment_amount: model.business_summary.payroll_payment_amount,
      classified_count: model.business_summary.classified_count,
      unclassified_count: model.business_summary.unclassified_count,
      status: model.business_summary.status,
    },
    {
      sales_amount: 1200,
      operating_expense_amount: 200,
      payroll_payment_amount: 700,
      classified_count: 3,
      unclassified_count: 0,
      status: "passed",
    },
  );
  assert.deepEqual(model.payroll_categories, [{
    category: "partner",
    label: "파트너",
    gross_krw: 700,
    payment_count: 1,
    employee_count: 1,
    individual_payroll_values_included: false,
  }]);
  assert.deepEqual(model.non_payroll_outflow_categories, [{
    category: "tax",
    label: "세금",
    primary_type: "operating_expense",
    amount: 200,
    transaction_count: 1,
    individual_values_included: false,
  }]);
  assert.equal(JSON.stringify(model).includes("employee-private"), false);
});

test("analytics refresh binds a deterministic source watermark and rebuilds idempotently with freshness", () => {
  const repository = createAnalyticsRepository();
  const financeRepository = createFinanceRepository({
    seedRecords: [{
      model_type: "Invoice",
      invoice_id: "invoice-watermark-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      amount_due: 1000,
      amount_paid: 500,
      currency: "KRW",
      status: "issued",
    }],
  });
  const refreshedAt = new Date("2026-07-17T08:00:00.000Z");
  const first = refreshAnalyticsReadModels({
    repository,
    financeRepository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "watermark-refresh-001",
    clock: () => new Date(refreshedAt),
  });
  assert.match(first.source_watermark, /^[a-f0-9]{64}$/u);
  assert.equal(first.freshness.status, "fresh");
  assert.equal(first.dashboards.every((row) => row.source_watermark === first.source_watermark && row.projection_only === true), true);

  const rebuilt = refreshAnalyticsReadModels({
    repository,
    financeRepository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "watermark-refresh-002",
    clock: () => new Date("2026-07-17T08:05:00.000Z"),
  });
  assert.equal(rebuilt.rebuild_replay, true);
  assert.equal(rebuilt.refresh_run.refresh_run_id, first.refresh_run.refresh_run_id);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "ReadModelRefreshRun" }).length, 1);
  assert.deepEqual(classifyAnalyticsFreshness({
    refreshed_at: first.refresh_run.refreshed_at,
    now: new Date("2026-07-17T08:20:00.001Z"),
    max_age_ms: 20 * 60 * 1000,
  }).status, "stale");
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

test("WP-FIN-2 reconciles overview, monthly, and canonical client read models across finance fixtures", () => {
  const model = buildFinanceReadModels({
    financeRepository: financeReadModelFixture(),
    ...canonicalClientRepositories(),
    tenant_id: TENANT,
    from: "2026-07-01",
    to: "2026-07-31",
  });

  const krw = model.overview.totals.find((row) => row.currency === "KRW");
  const usd = model.overview.totals.find((row) => row.currency === "USD");
  assert.deepEqual(
    {
      billed_amount: krw.billed_amount,
      collected_amount: krw.collected_amount,
      matter_cost: krw.matter_cost,
      processed_cost: krw.processed_cost,
      recoverable_cost: krw.recoverable_cost,
      ar_balance: krw.ar_balance,
      unlinked_amount: krw.unlinked_amount,
      date_inferred_count: krw.date_inferred_count,
    },
    { billed_amount: 900, collected_amount: 400, matter_cost: 250, processed_cost: 250, recoverable_cost: 250, ar_balance: 500, unlinked_amount: 50, date_inferred_count: 1 },
  );
  assert.equal(usd.billed_amount, 20);
  assert.equal(model.overview.currency_conversion_applied, false);

  const julyKrw = model.monthly.find((row) => row.month === "2026-07" && row.currency === "KRW");
  assert.equal(julyKrw.billed_amount, krw.billed_amount);
  assert.equal(julyKrw.collected_amount, krw.collected_amount);
  assert.equal(julyKrw.matter_cost, krw.matter_cost);
  assert.equal(julyKrw.processed_cost, krw.processed_cost);

  const clientKrw = model.clients.find((row) => row.client_group_id === "client-group-a" && row.currency === "KRW");
  const unlinkedKrw = model.clients.find((row) => row.client_group_id === null && row.currency === "KRW");
  assert.equal(clientKrw.client_group_label, "고객 A");
  assert.equal(clientKrw.client_mapping_source, "master-data.ClientGroup");
  assert.equal(clientKrw.billed_amount + unlinkedKrw.billed_amount, krw.billed_amount);
  assert.equal(clientKrw.collected_amount + unlinkedKrw.collected_amount, krw.collected_amount);
  assert.equal(clientKrw.matter_cost + unlinkedKrw.matter_cost, krw.matter_cost);
  assert.equal(unlinkedKrw.matter_cost, 50);
  assert.equal(model.raw_source_payload_included, false);
  assert.equal(model.production_ready_claim, false);
});

test("Home Finance processed cost includes only approved lifecycle states without changing matter cost", () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      { model_type: "Expense", expense_id: "expense-approved", tenant_id: TENANT, amount: 200, currency: "KRW", status: "approved", expense_date: "2026-07-10" },
      { model_type: "Expense", expense_id: "expense-submitted", tenant_id: TENANT, amount: 100, currency: "KRW", status: "submitted", expense_date: "2026-07-11" },
      { model_type: "Disbursement", disbursement_id: "disbursement-paid", tenant_id: TENANT, amount: 50, currency: "KRW", status: "paid", disbursed_at: "2026-07-12" },
      { model_type: "Disbursement", disbursement_id: "disbursement-wip", tenant_id: TENANT, amount: 25, currency: "KRW", status: "draft", approved_for_wip: true, disbursed_at: "2026-07-13" },
    ],
  });
  const model = buildFinanceReadModels({
    financeRepository,
    tenant_id: TENANT,
    from: "2026-07-01",
    to: "2026-07-31",
  });
  const krw = model.overview.totals.find((row) => row.currency === "KRW");
  assert.equal(krw.matter_cost, 375);
  assert.equal(krw.processed_cost, 275);
  assert.equal(model.monthly[0].matter_cost, 375);
  assert.equal(model.monthly[0].processed_cost, 275);
});

test("WP-FIN-2 falls back to Payment only when no PaymentMatch source rows exist", () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      { model_type: "Payment", payment_id: "pay-fallback", tenant_id: TENANT, matter_id: "matter-a", client_group_id: "client-group-a", amount: 125, currency: "USD", received_at: "2026-07-08", status: "received" },
    ],
  });
  const model = buildFinanceReadModels({ financeRepository, tenant_id: TENANT });
  assert.equal(model.overview.totals.find((row) => row.currency === "USD").collected_amount, 125);
});
