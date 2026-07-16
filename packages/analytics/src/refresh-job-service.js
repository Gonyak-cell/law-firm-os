import { appendAnalyticsAuditEvent } from "./audit.js";
import {
  createArAgingDashboard,
  createClientHealthDashboard,
  createEmployeeUtilizationDashboard,
  createPracticePnlDashboard,
  createRealizationDashboard,
} from "./dashboard-service.js";

const ZERO_METRICS = Object.freeze({
  ar_open_balance: 0,
  client_health_percent: 0,
  practice_pnl_amount: 0,
  finance_record_count: 0,
  metric_source: "empty_finance_repository",
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function listRecords(repository, tenantId, modelType) {
  if (!repository || typeof repository.list !== "function") return [];
  return repository.list({ tenant_id: tenantId, model_type: modelType });
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function moneyValue(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function roleRateMap(rateCards = []) {
  const rates = new Map();
  for (const card of rateCards) {
    for (const rate of Array.isArray(card.role_rates) ? card.role_rates : []) {
      if (typeof rate.role_id === "string") rates.set(rate.role_id, numberValue(rate.hourly_rate));
    }
  }
  return rates;
}

function standardValueForTimeEntry(entry = {}, rates = new Map()) {
  if (entry.standard_value !== undefined) return numberValue(entry.standard_value);
  const hourlyRate = rates.get(entry.role_id) ?? 0;
  return (numberValue(entry.duration_minutes) / 60) * hourlyRate;
}

function withStandardTimeValues(timeEntries = [], rateCards = []) {
  const rates = roleRateMap(rateCards);
  return timeEntries.map((entry) => Object.freeze({
    ...entry,
    standard_value: moneyValue(standardValueForTimeEntry(entry, rates)),
  }));
}

function timeEntryStandardValue(timeEntries = [], rateCards = []) {
  return moneyValue(withStandardTimeValues(timeEntries, rateCards).reduce((total, entry) => {
    if (entry.billable === false) return total;
    return total + numberValue(entry.standard_value);
  }, 0));
}

function billableHours(timeEntries = []) {
  return moneyValue(timeEntries.reduce((total, entry) => {
    if (entry.billable === false) return total;
    return total + (numberValue(entry.duration_minutes) / 60);
  }, 0));
}

function clientGroupIdOf(row = {}) {
  for (const field of ["client_group_id", "billing_client_group_id"]) {
    const value = row[field];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function resolveClientGroupId(rows = []) {
  const ids = new Set(rows.map(clientGroupIdOf).filter(Boolean));
  return ids.size === 1 ? ids.values().next().value : null;
}

function metricPercent(numerator, denominator) {
  if (Number(denominator) <= 0) return null;
  return Number(((numberValue(numerator) / numberValue(denominator)) * 100).toFixed(2));
}

function matchesEmployee(entry = {}, employeeId) {
  return entry.employee_id === employeeId || entry.actor_id === employeeId;
}

function matchesPeriod(entry = {}, periodId) {
  if (typeof entry.period_id === "string") return entry.period_id === periodId;
  for (const field of ["work_date", "entry_date", "date", "performed_at"]) {
    if (typeof entry[field] === "string" && entry[field].startsWith(periodId)) return true;
  }
  return entry.period_id === undefined && entry.work_date === undefined && entry.entry_date === undefined && entry.date === undefined && entry.performed_at === undefined;
}

export function selectFinanceRowsForMatter({ financeRepository, tenant_id, matter_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  const rateCards = listRecords(financeRepository, tenant_id, "RateCard");
  const invoiceRows = listRecords(financeRepository, tenant_id, "Invoice")
    .filter((invoice) => invoice.matter_id === matter_id);
  const invoiceIds = new Set(invoiceRows.map((invoice) => invoice.invoice_id).filter(Boolean));
  const paymentRows = listRecords(financeRepository, tenant_id, "Payment")
    .filter((payment) => payment.matter_id === matter_id || invoiceIds.has(payment.invoice_id));
  const invoicePaidRows = invoiceRows
    .filter((invoice) => numberValue(invoice.amount_paid) > 0)
    .map((invoice) => Object.freeze({
      payment_id: `invoice-paid:${invoice.invoice_id}`,
      tenant_id,
      matter_id,
      invoice_id: invoice.invoice_id,
      amount: numberValue(invoice.amount_paid),
      synthetic_from_invoice_amount_paid: true,
    }));
  const timeEntries = withStandardTimeValues(
    listRecords(financeRepository, tenant_id, "TimeEntry").filter((entry) => entry.matter_id === matter_id),
    rateCards,
  );
  return Object.freeze({
    client_group_id: resolveClientGroupId([...timeEntries, ...invoiceRows, ...paymentRows]),
    time_entries: Object.freeze(timeEntries),
    invoices: Object.freeze(invoiceRows),
    payments: Object.freeze(paymentRows.length > 0 ? paymentRows : invoicePaidRows),
  });
}

export function selectFinanceRowsForEmployeeUtilization({ financeRepository, tenant_id, employee_id, period_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ employee_id }, "employee_id");
  requiredString({ period_id }, "period_id");
  const timeEntries = listRecords(financeRepository, tenant_id, "TimeEntry")
    .filter((entry) => matchesEmployee(entry, employee_id))
    .filter((entry) => matchesPeriod(entry, period_id));
  const capacityValues = timeEntries
    .map((entry) => numberValue(entry.capacity_hours))
    .filter((value) => value > 0);
  return Object.freeze({
    time_entries: Object.freeze(timeEntries),
    billable_hours: billableHours(timeEntries),
    capacity_hours: capacityValues.length > 0 ? Math.max(...capacityValues) : 0,
  });
}

export function computeFinanceDashboardMetrics({ financeRepository, analyticsRepository, tenant_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  const invoices = listRecords(financeRepository, tenant_id, "Invoice");
  const arBalances = listRecords(financeRepository, tenant_id, "ARBalance");
  const payments = listRecords(financeRepository, tenant_id, "Payment");
  const timeEntries = listRecords(financeRepository, tenant_id, "TimeEntry");
  const rateCards = listRecords(financeRepository, tenant_id, "RateCard");
  const financeRecordCount = invoices.length + arBalances.length + payments.length + timeEntries.length + rateCards.length;

  if (financeRecordCount === 0) {
    const profitability = listRecords(analyticsRepository, tenant_id, "MatterProfitability");
    if (profitability.length === 0) return ZERO_METRICS;
    return Object.freeze({
      ...ZERO_METRICS,
      practice_pnl_amount: moneyValue(profitability.reduce((total, row) => total + numberValue(row.profitability_amount), 0)),
      finance_record_count: 0,
      metric_source: "analytics_repository_fallback",
    });
  }

  const invoiceTotal = invoices.reduce((total, invoice) => total + numberValue(invoice.amount_due), 0);
  const invoicePaid = invoices.reduce((total, invoice) => total + numberValue(invoice.amount_paid), 0);
  const paymentTotal = payments.reduce((total, payment) => total + numberValue(payment.amount), 0);
  const collectedTotal = Math.max(invoicePaid, paymentTotal);
  const standardValue = timeEntryStandardValue(timeEntries, rateCards);
  const openArBalance = arBalances
    .filter((balance) => !["closed", "paid", "written_off"].includes(balance.status))
    .reduce((total, balance) => total + numberValue(balance.balance), 0);

  return Object.freeze({
    ar_open_balance: moneyValue(openArBalance),
    client_health_percent: invoiceTotal > 0 ? Math.round((collectedTotal / invoiceTotal) * 100) : 0,
    practice_pnl_amount: moneyValue(invoiceTotal - standardValue),
    finance_record_count: financeRecordCount,
    metric_source: "finance_repository",
  });
}

export function computeKpiDashboardMetrics({ analyticsRepository, tenant_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  const realizationRows = listRecords(analyticsRepository, tenant_id, "RealizationMetric");
  const utilizationRows = listRecords(analyticsRepository, tenant_id, "EmployeeUtilization");
  const billedValue = realizationRows.reduce((total, row) => total + numberValue(row.billed_value), 0);
  const standardValue = realizationRows.reduce((total, row) => total + numberValue(row.standard_value), 0);
  const billable = utilizationRows.reduce((total, row) => total + numberValue(row.billable_hours), 0);
  const capacity = utilizationRows.reduce((total, row) => total + numberValue(row.capacity_hours), 0);
  return Object.freeze({
    realization_percent: metricPercent(billedValue, standardValue),
    realization_record_count: realizationRows.length,
    utilization_percent: metricPercent(billable, capacity),
    utilization_record_count: utilizationRows.length,
  });
}

export function refreshAnalyticsReadModels({ repository, financeRepository, tenant_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const metrics = computeFinanceDashboardMetrics({ financeRepository, analyticsRepository: tx, tenant_id });
    const kpiMetrics = computeKpiDashboardMetrics({ analyticsRepository: tx, tenant_id });
    const ar = createArAgingDashboard({
      repository: tx,
      dashboard: {
        dashboard_id: "dashboard-ar-aging",
        tenant_id,
        title: "AR Aging",
        metric_value: metrics.ar_open_balance,
        metric_source: metrics.metric_source,
        finance_record_count: metrics.finance_record_count,
      },
      actor_id,
      idempotency_key: `${idempotency_key}:ar`,
    }).dashboard;
    const health = createClientHealthDashboard({
      repository: tx,
      dashboard: {
        dashboard_id: "dashboard-client-health",
        tenant_id,
        title: "Client Health",
        metric_value: metrics.client_health_percent,
        metric_source: metrics.metric_source,
        finance_record_count: metrics.finance_record_count,
      },
      actor_id,
      idempotency_key: `${idempotency_key}:health`,
    }).dashboard;
    const pnl = createPracticePnlDashboard({
      repository: tx,
      dashboard: {
        dashboard_id: "dashboard-practice-pnl",
        tenant_id,
        title: "Practice P&L",
        metric_value: metrics.practice_pnl_amount,
        metric_source: metrics.metric_source,
        finance_record_count: metrics.finance_record_count,
      },
      actor_id,
      idempotency_key: `${idempotency_key}:pnl`,
    }).dashboard;
    const dashboards = [ar, health, pnl];
    if (kpiMetrics.realization_percent !== null) {
      dashboards.push(createRealizationDashboard({
        repository: tx,
        dashboard: {
          dashboard_id: "dashboard-realization",
          tenant_id,
          title: "Realization",
          metric_value: kpiMetrics.realization_percent,
          metric_unit: "percent",
          metric_source: "analytics_repository",
          metric_record_count: kpiMetrics.realization_record_count,
        },
        actor_id,
        idempotency_key: `${idempotency_key}:realization`,
      }).dashboard);
    }
    if (kpiMetrics.utilization_percent !== null) {
      dashboards.push(createEmployeeUtilizationDashboard({
        repository: tx,
        dashboard: {
          dashboard_id: "dashboard-employee-utilization",
          tenant_id,
          title: "Employee Utilization",
          metric_value: kpiMetrics.utilization_percent,
          metric_unit: "percent",
          metric_source: "analytics_repository",
          metric_record_count: kpiMetrics.utilization_record_count,
        },
        actor_id,
        idempotency_key: `${idempotency_key}:utilization`,
      }).dashboard);
    }
    const run = tx.create({
      model_type: "ReadModelRefreshRun",
      refresh_run_id: `refresh:${tenant_id}:${Date.now()}`,
      tenant_id,
      status: "succeeded",
      refreshed_dashboard_ids: Object.freeze(dashboards.map((dashboard) => dashboard.dashboard_id)),
    });
    const auditEvent = appendAnalyticsAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "analytics.read_model.refresh",
        object_type: "ReadModelRefreshRun",
        object_id: run.refresh_run_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", refresh_run: run, dashboards: Object.freeze(dashboards), audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "analytics_read_model_refresh", response });
    return response;
  });
}
