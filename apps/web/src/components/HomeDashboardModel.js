const SEOUL_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const CLOSED_PROSPECT_STATUSES = new Set([
  "archived",
  "cancelled",
  "canceled",
  "closed",
  "converted",
  "disqualified",
  "inactive",
  "lost",
  "rejected",
  "won",
]);
const NEW_MATTER_STATUSES = new Set(["active", "opening"]);
const MONTHLY_REVENUE_AXIS_STEP_KRW = 30_000_000;
const KOREAN_INTEGER = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const waitForDashboardRetry = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export async function readDashboardResultWithRetry(
  operation,
  { source = "dashboard", attempts = 3, delayMs = 750, wait = waitForDashboardRetry } = {},
) {
  if (typeof operation !== "function") throw new TypeError("dashboard operation is required");
  const attemptCount = Math.max(1, Number.parseInt(attempts, 10) || 1);
  let result = null;
  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    try {
      result = await operation();
    } catch {
      result = null;
    }
    if (result && result.kind !== "error") return result;
    if (attempt < attemptCount) await wait(delayMs * attempt);
  }
  return result ?? { kind: "error", source };
}

function dateParts(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Object.fromEntries(SEOUL_PARTS.formatToParts(parsed).map((part) => [part.type, part.value]));
}

export function seoulMonthKey(value = new Date()) {
  const parts = dateParts(value);
  return parts ? `${parts.year}-${parts.month}` : null;
}

function monthKeysEndingAt(value = new Date(), count = 12) {
  const key = seoulMonthKey(value);
  if (!key) return [];
  const [year, month] = key.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const cursor = new Date(Date.UTC(year, month - count + index, 1));
    return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function resultItems(result) {
  if (!result || !Array.isArray(result.items)) return [];
  return result.items;
}

export function dashboardResultState(result) {
  if (result === null || result === undefined || result.kind === "loading") return "loading";
  if (result.kind === "step_up_required") return "review_required";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review_required";
  if (result.kind === "guarded") return "error";
  if (result.kind === "error") return "error";
  if (result.kind === "empty") return "empty";
  if (result.kind !== "data") return "error";
  if (result.partial === true || result.sourceStatuses?.some((source) => source.status && source.status !== "passed")) return "partial";
  return resultItems(result).length === 0 && !result.item && !result.summary ? "empty" : "data";
}

function combineStates(states) {
  if (states.every((state) => state === "loading")) return "loading";
  const readable = states.filter((state) => state === "data" || state === "empty" || state === "partial");
  if (readable.length > 0) {
    return states.every((state) => state === "data" || state === "empty") ? (states.some((state) => state === "data") ? "data" : "empty") : "partial";
  }
  if (states.includes("denied")) return "denied";
  if (states.includes("review_required")) return "review_required";
  return states.includes("error") ? "error" : "empty";
}

function recordDateValue(item) {
  for (const field of ["closed_at", "opened_at", "created_at", "updated_at", "requested_at", "due_at"]) {
    const parsed = Date.parse(item?.[field] ?? "");
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function currentMonthRecord(item, fields, month) {
  return fields.some((field) => Boolean(item?.[field]) && seoulMonthKey(item[field]) === month);
}

function percentageChange(current, previous) {
  const prior = Number(previous);
  if (!Number.isFinite(prior) || prior === 0) return null;
  return ((Number(current) - prior) / Math.abs(prior)) * 100;
}

export function buildMonthlyRevenueAxis(series = []) {
  const peak = Math.max(0, ...(Array.isArray(series) ? series : []).map((item) => {
    const amount = Number(item?.amount);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }));
  const maximum = Math.max(
    MONTHLY_REVENUE_AXIS_STEP_KRW,
    Math.ceil(peak / MONTHLY_REVENUE_AXIS_STEP_KRW) * MONTHLY_REVENUE_AXIS_STEP_KRW,
  );
  return Object.freeze({
    maximum,
    ticks: Object.freeze(Array.from(
      { length: maximum / MONTHLY_REVENUE_AXIS_STEP_KRW + 1 },
      (_, index) => maximum - index * MONTHLY_REVENUE_AXIS_STEP_KRW,
    )),
  });
}

export function formatMonthlyRevenueAxisTick(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  return `${KOREAN_INTEGER.format(amount / 10_000)}만`;
}

function nonPayrollOutflowAmount(row = {}) {
  const totalOutflow = row.total_outflow == null ? Number.NaN : Number(row.total_outflow);
  const payrollPayment = row.payroll_payment_amount == null ? Number.NaN : Number(row.payroll_payment_amount);
  if (Number.isFinite(totalOutflow) && Number.isFinite(payrollPayment)) {
    return Math.max(0, totalOutflow - payrollPayment);
  }
  return Math.max(0, Number(row.operating_expense_amount) || 0);
}

function nonPayrollOutflowCategories(rows, total) {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      category: String(row?.category ?? "unclassified"),
      label: String(row?.label ?? (row?.category === "unclassified" ? "미분류" : row?.category ?? "미분류")),
      amount: Math.max(0, Number(row?.amount) || 0),
      transaction_count: Math.max(0, Number(row?.transaction_count) || 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((left, right) => right.amount - left.amount || left.label.localeCompare(right.label, "ko"));
  const categorizedTotal = normalized.reduce((sum, row) => sum + row.amount, 0);
  const missingAmount = Math.max(0, Number(total) - categorizedTotal);
  if (missingAmount > 0) {
    const unclassified = normalized.find((row) => row.category === "unclassified");
    if (unclassified) unclassified.amount += missingAmount;
    else normalized.push({ category: "unclassified", label: "미분류", amount: missingAmount, transaction_count: 0 });
  }
  const unclassified = normalized.find((row) => row.category === "unclassified") ?? null;
  const classified = normalized.filter((row) => row.category !== "unclassified");
  const needsOther = classified.length + (unclassified ? 1 : 0) > 6;
  const visibleCount = 6 - (unclassified ? 1 : 0) - (needsOther ? 1 : 0);
  const visible = classified.slice(0, visibleCount);
  const remainder = classified.slice(visibleCount);
  if (remainder.length > 0) {
    visible.push({
      category: "other",
      label: "기타",
      amount: remainder.reduce((sum, row) => sum + row.amount, 0),
      transaction_count: remainder.reduce((sum, row) => sum + row.transaction_count, 0),
    });
  }
  if (unclassified) visible.push(unclassified);
  return Object.freeze(visible.map((row) => Object.freeze({ ...row })));
}

export function buildFinanceDashboardModel(result, { now = new Date(), currency = "KRW" } = {}) {
  const state = dashboardResultState(result);
  const month = seoulMonthKey(now);
  const months = monthKeysEndingAt(now, 12);
  const rows = resultItems(result).filter((row) => row.currency === currency && months.includes(row.month));
  const byMonth = new Map();
  for (const row of rows) {
    const aggregate = byMonth.get(row.month) ?? { month: row.month, currency, billed_amount: 0, processed_cost: 0 };
    aggregate.billed_amount += Number(row.billed_amount ?? 0);
    aggregate.processed_cost += Number(row.processed_cost ?? 0);
    byMonth.set(row.month, aggregate);
  }
  const current = byMonth.get(month) ?? null;
  const previousMonth = months.at(-2) ?? null;
  const previous = previousMonth ? byMonth.get(previousMonth) ?? null : null;
  return Object.freeze({
    state,
    month,
    currency,
    current,
    previous,
    revenue_change_percent: current && previous ? percentageChange(current.billed_amount, previous.billed_amount) : null,
    processed_cost_change_percent: current && previous ? percentageChange(current.processed_cost, previous.processed_cost) : null,
    series: Object.freeze(months.map((monthKey) => Object.freeze({
      month: monthKey,
      amount: byMonth.get(monthKey)?.billed_amount ?? 0,
      observed: byMonth.has(monthKey),
    }))),
    has_series_data: rows.length > 0,
  });
}

export function buildBankCashflowDashboardModel(currentResult, historyResult, { now = new Date(), currency = "KRW" } = {}) {
  const readState = dashboardResultState(currentResult);
  const month = seoulMonthKey(now);
  const months = monthKeysEndingAt(now, 6);
  const currentSummary = currentResult?.item?.business_summary ?? null;
  const state = readState === "data" && currentSummary?.status !== "passed" ? "partial" : readState;
  const historyRows = Array.isArray(historyResult?.item?.monthly)
    ? historyResult.item.monthly.filter((row) => row.currency === currency && months.includes(row.month))
    : [];
  const byMonth = new Map(historyRows.map((row) => [row.month, row]));
  const currentNonPayrollOutflow = nonPayrollOutflowAmount({
    ...currentSummary,
    total_outflow: currentResult?.item?.summary?.total_outflow,
  });
  const nonPayrollCategorySource = currentResult?.item?.non_payroll_outflow_categories;
  const nonPayrollCategories = nonPayrollOutflowCategories(nonPayrollCategorySource, currentNonPayrollOutflow);
  const current = currentSummary ? Object.freeze({
    month,
    currency,
    billed_amount: Number(currentSummary.sales_amount ?? 0),
    non_payroll_outflow: currentNonPayrollOutflow,
    processed_cost: currentNonPayrollOutflow,
    payroll_payment_amount: Number(currentSummary.payroll_payment_amount ?? 0),
    non_operating_amount: Number(currentSummary.non_operating_amount ?? 0),
  }) : null;
  const previousMonth = months.at(-2) ?? null;
  const previous = previousMonth ? byMonth.get(previousMonth) ?? null : null;
  const payrollSummary = currentSummary ? Object.freeze({
    gross_krw: Number(currentSummary.payroll_payment_amount ?? 0),
    run_status: "bank_paid",
    categories: Object.freeze([...(currentResult?.item?.payroll_categories ?? [])]),
    individual_payroll_values_included: false,
  }) : null;
  const nonPayrollOutflowSummary = currentSummary ? Object.freeze({
    total_krw: currentNonPayrollOutflow,
    categories: nonPayrollCategories,
    source_category_count: Array.isArray(nonPayrollCategorySource) ? nonPayrollCategorySource.length : 0,
    source_complete: Array.isArray(nonPayrollCategorySource),
    individual_values_included: false,
  }) : null;
  const nonPayrollOutflowChangePercent = current && previous
    ? percentageChange(current.non_payroll_outflow, nonPayrollOutflowAmount(previous))
    : null;
  return Object.freeze({
    state,
    month,
    currency,
    current,
    payroll_summary: payrollSummary,
    non_payroll_outflow_summary: nonPayrollOutflowSummary,
    revenue_change_percent: current && previous
      ? percentageChange(current.billed_amount, previous.sales_amount)
      : null,
    non_payroll_outflow_change_percent: nonPayrollOutflowChangePercent,
    processed_cost_change_percent: nonPayrollOutflowChangePercent,
    series: Object.freeze(months.map((monthKey) => Object.freeze({
      month: monthKey,
      amount: Number(byMonth.get(monthKey)?.sales_amount ?? 0),
      observed: byMonth.has(monthKey),
    }))),
    has_series_data: historyRows.length > 0,
    classification_status: currentSummary?.status ?? null,
  });
}

function explicitIdentityKeys(item) {
  return ["party_id", "account_id", "client_group_id", "canonical_client_id"]
    .map((field) => item?.[field])
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase());
}

function dedupeProspects(records) {
  const claimedKeys = new Set();
  return records.filter((record, index) => {
    const keys = explicitIdentityKeys(record);
    const fallback = record.lead_id ?? record.opportunity_id ?? `prospect-${index}`;
    const comparable = keys.length > 0 ? keys : [`record:${fallback}`];
    if (comparable.some((key) => claimedKeys.has(key))) return false;
    comparable.forEach((key) => claimedKeys.add(key));
    return true;
  });
}

function activeProspect(record) {
  const status = String(record?.status ?? record?.stage ?? "").trim().toLowerCase();
  return !CLOSED_PROSPECT_STATUSES.has(status);
}

export function buildClientDashboardModel({ accounts, leads, opportunities } = {}, { now = new Date() } = {}) {
  const month = seoulMonthKey(now);
  const accountState = dashboardResultState(accounts);
  const prospectState = combineStates([dashboardResultState(leads), dashboardResultState(opportunities)]);
  const newClients = resultItems(accounts)
    .filter((record) => !["prospect", "lead"].includes(String(record.account_type ?? "").toLowerCase()))
    .filter((record) => currentMonthRecord(record, ["created_at"], month))
    .sort((left, right) => recordDateValue(right) - recordDateValue(left));
  const prospects = dedupeProspects([...resultItems(leads), ...resultItems(opportunities)])
    .filter(activeProspect)
    .sort((left, right) => recordDateValue(right) - recordDateValue(left));
  return Object.freeze({
    state: combineStates([accountState, prospectState]),
    new_client_state: accountState,
    prospect_state: prospectState,
    new_clients: Object.freeze(newClients),
    prospects: Object.freeze(prospects),
    recent: Object.freeze([...newClients, ...prospects].sort((left, right) => recordDateValue(right) - recordDateValue(left)).slice(0, 3)),
  });
}

export function buildMatterDashboardModel(result, { now = new Date() } = {}) {
  const month = seoulMonthKey(now);
  const matters = resultItems(result).filter((item) => item?.matter_id);
  const newMatters = matters
    .filter((item) => NEW_MATTER_STATUSES.has(String(item.status ?? "").toLowerCase()))
    .filter((item) => currentMonthRecord(item, ["opened_at", "created_at"], month))
    .sort((left, right) => recordDateValue(right) - recordDateValue(left));
  const closedMatters = matters
    .filter((item) => String(item.status ?? "").toLowerCase() === "closed")
    .filter((item) => currentMonthRecord(item, ["closed_at"], month))
    .sort((left, right) => recordDateValue(right) - recordDateValue(left));
  return Object.freeze({
    state: dashboardResultState(result),
    new_matters: Object.freeze(newMatters),
    closed_matters: Object.freeze(closedMatters),
    recent: Object.freeze([...newMatters, ...closedMatters].sort((left, right) => recordDateValue(right) - recordDateValue(left)).slice(0, 3)),
  });
}

export function buildLeaveDashboardModel(result) {
  const items = resultItems(result)
    .filter((item) => String(item?.subtype ?? "").toLowerCase() === "leave")
    .sort((left, right) => recordDateValue(left) - recordDateValue(right));
  return Object.freeze({
    state: dashboardResultState(result),
    items: Object.freeze(items),
    recent: Object.freeze(items.slice(0, 3)),
  });
}
