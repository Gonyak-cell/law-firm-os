const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "void", "rejected", "deleted"]);
const PROCESSED_COST_STATUSES = new Set(["approved", "posted", "paid", "reimbursed", "settled"]);
const CLOSED_AR_STATUSES = new Set(["closed", "paid", "written_off", "written-off", "cancelled", "canceled"]);
const UNLINKED_CLIENT_ID = "unlinked-client";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
}

function firstNumber(row, fields) {
  for (const field of fields) {
    if (row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "") return numberValue(row[field]);
  }
  return 0;
}

function currencyOf(row = {}, fallback = "UNKNOWN") {
  return optionalString(row.currency)?.toUpperCase() ?? fallback;
}

function dateParts(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const plainDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (plainDate && !value.includes("T")) return { date: plainDate[0], month: `${plainDate[1]}-${plainDate[2]}` };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = Object.fromEntries(SEOUL_DATE_FORMATTER.formatToParts(parsed).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, month: `${parts.year}-${parts.month}` };
}

function datedRow(row, fields) {
  for (const field of fields) {
    const parsed = dateParts(row?.[field]);
    if (parsed) return { ...parsed, date_inferred: false, date_source: field };
  }
  const inferred = dateParts(row?.created_at);
  return inferred ? { ...inferred, date_inferred: true, date_source: "created_at" } : null;
}

function inPeriod(date, from, to) {
  return (!from || date >= from) && (!to || date <= to);
}

function listSource(repository, tenantId, modelType, sourceStatuses) {
  if (!repository || typeof repository.list !== "function") {
    sourceStatuses.push({ source: modelType, status: "unavailable" });
    return [];
  }
  try {
    const rows = repository.list({ tenant_id: tenantId, model_type: modelType });
    sourceStatuses.push({ source: modelType, status: "passed" });
    return Array.isArray(rows) ? rows : [];
  } catch {
    sourceStatuses.push({ source: modelType, status: "failed" });
    return [];
  }
}

function indexBy(rows, field) {
  return new Map(rows.map((row) => [optionalString(row[field]), row]).filter(([key]) => key));
}

function clientResolver({ masterDataRepository, matterRepository, tenantId, invoices, payments, sourceStatuses }) {
  const clientGroups = listSource(masterDataRepository, tenantId, "ClientGroup", sourceStatuses);
  const billingProfiles = listSource(masterDataRepository, tenantId, "BillingProfile", sourceStatuses);
  const matters = listSource(matterRepository, tenantId, "Matter", sourceStatuses);
  const groupsById = indexBy(clientGroups, "client_group_id");
  const mattersById = indexBy(matters, "matter_id");
  const invoicesById = indexBy(invoices, "invoice_id");
  const paymentsById = indexBy(payments, "payment_id");
  const groupByParty = new Map();
  for (const profile of billingProfiles) {
    const groupId = optionalString(profile.client_group_id);
    if (!groupId) continue;
    for (const field of ["billing_client_party_id", "legal_client_party_id", "primary_party_id"]) {
      const partyId = optionalString(profile[field]);
      if (partyId) groupByParty.set(partyId, groupId);
    }
  }

  function canonicalGroup(groupId) {
    if (!groupId) return null;
    if (groupsById.size === 0 || groupsById.has(groupId)) return groupId;
    return null;
  }

  function groupFromRow(row = {}) {
    for (const field of ["client_group_id", "billing_client_group_id", "canonical_client_group_id"]) {
      const direct = canonicalGroup(optionalString(row[field]));
      if (direct) return direct;
    }
    for (const field of ["billing_client_party_id", "legal_client_party_id", "client_party_id"]) {
      const mapped = groupByParty.get(optionalString(row[field]));
      if (mapped) return mapped;
    }
    return null;
  }

  return (row = {}) => {
    const invoice = invoicesById.get(optionalString(row.invoice_id));
    const payment = paymentsById.get(optionalString(row.payment_id));
    const matterId = optionalString(row.matter_id) ?? optionalString(invoice?.matter_id) ?? optionalString(payment?.matter_id);
    const matter = mattersById.get(matterId);
    const clientGroupId = groupFromRow(row) ?? groupFromRow(invoice) ?? groupFromRow(payment) ?? groupFromRow(matter);
    const group = groupsById.get(clientGroupId);
    return {
      matter_id: matterId,
      client_group_id: clientGroupId,
      client_group_label: optionalString(group?.display_name) ?? clientGroupId ?? "미연결 고객",
      client_mapping_source: clientGroupId ? (group ? "master-data.ClientGroup" : "source.client_group_id") : "unlinked",
    };
  };
}

function correctionAmount(row = {}) {
  if (row.amount_delta !== undefined) return firstNumber(row, ["amount_delta"]);
  if (row.corrected_amount !== undefined && row.original_amount !== undefined) {
    return numberValue(row.corrected_amount) - numberValue(row.original_amount);
  }
  const amount = firstNumber(row, ["adjustment_amount", "correction_amount", "amount"]);
  const kind = `${row.adjustment_type ?? ""} ${row.correction_type ?? ""} ${row.reason ?? ""}`.toLowerCase();
  return /credit|cancel|reversal|reduction|write.?off/.test(kind) ? -Math.abs(amount) : amount;
}

function emptyMetrics(currency) {
  return {
    currency,
    billed_amount: 0,
    collected_amount: 0,
    matter_cost: 0,
    processed_cost: 0,
    recoverable_cost: 0,
    ar_balance: 0,
    contribution_amount: 0,
    unlinked_amount: 0,
    transaction_count: 0,
    date_inferred_count: 0,
  };
}

function addEntry(target, entry) {
  target.billed_amount = money(target.billed_amount + entry.billed_amount);
  target.collected_amount = money(target.collected_amount + entry.collected_amount);
  target.matter_cost = money(target.matter_cost + entry.matter_cost);
  target.processed_cost = money(target.processed_cost + entry.processed_cost);
  target.recoverable_cost = money(target.recoverable_cost + entry.recoverable_cost);
  target.ar_balance = money(target.ar_balance + entry.ar_balance);
  target.transaction_count += 1;
  if (entry.date_inferred) target.date_inferred_count += 1;
  if (!entry.client_group_id) {
    target.unlinked_amount = money(target.unlinked_amount + Math.abs(entry.billed_amount) + Math.abs(entry.collected_amount) + Math.abs(entry.matter_cost) + Math.abs(entry.ar_balance));
  }
  target.contribution_amount = money(target.billed_amount - target.matter_cost);
}

function finalizedRows(map) {
  return Object.freeze([...map.values()].map((row) => Object.freeze({ ...row })).sort((a, b) => {
    return `${a.currency}:${a.month ?? a.client_group_label ?? ""}`.localeCompare(`${b.currency}:${b.month ?? b.client_group_label ?? ""}`);
  }));
}

function validateDateFilter(value, field) {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} must be YYYY-MM-DD`);
}

export function buildFinanceReadModels({
  financeRepository,
  masterDataRepository = null,
  matterRepository = null,
  tenant_id,
  from = null,
  to = null,
  currency = null,
  client_group_id = null,
  matter_id = null,
  recognition_basis = "billed",
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  validateDateFilter(from, "from");
  validateDateFilter(to, "to");
  if (!new Set(["billed", "collected"]).has(recognition_basis)) throw new TypeError("recognition_basis must be billed or collected");
  const sourceStatuses = [];
  const invoices = listSource(financeRepository, tenantId, "Invoice", sourceStatuses);
  const payments = listSource(financeRepository, tenantId, "Payment", sourceStatuses);
  const paymentMatches = listSource(financeRepository, tenantId, "PaymentMatch", sourceStatuses);
  const expenses = listSource(financeRepository, tenantId, "Expense", sourceStatuses);
  const disbursements = listSource(financeRepository, tenantId, "Disbursement", sourceStatuses);
  const adjustments = [
    ...listSource(financeRepository, tenantId, "BillingAdjustment", sourceStatuses),
    ...listSource(financeRepository, tenantId, "InvoiceCorrection", sourceStatuses),
  ];
  const arBalances = listSource(financeRepository, tenantId, "ARBalance", sourceStatuses);
  const resolveClient = clientResolver({ masterDataRepository, matterRepository, tenantId, invoices, payments, sourceStatuses });
  const entries = [];

  function push(row, dateFields, values, fallbackCurrency = "UNKNOWN") {
    if (EXCLUDED_STATUSES.has(String(row.status ?? "").toLowerCase())) return;
    const dated = datedRow(row, dateFields);
    if (!dated || !inPeriod(dated.date, from, to)) return;
    const resolved = resolveClient(row);
    const rowCurrency = currencyOf(row, fallbackCurrency);
    if (currency && rowCurrency !== currency.toUpperCase()) return;
    if (client_group_id && resolved.client_group_id !== client_group_id) return;
    if (matter_id && resolved.matter_id !== matter_id) return;
    entries.push({
      ...dated,
      ...resolved,
      currency: rowCurrency,
      billed_amount: money(values.billed_amount),
      collected_amount: money(values.collected_amount),
      matter_cost: money(values.matter_cost),
      processed_cost: money(values.processed_cost),
      recoverable_cost: money(values.recoverable_cost),
      ar_balance: money(values.ar_balance),
    });
  }

  const invoicesById = indexBy(invoices, "invoice_id");
  for (const invoice of invoices) {
    push(invoice, ["issued_at", "issued_date", "invoice_date"], {
      billed_amount: firstNumber(invoice, ["amount_due", "invoice_total", "total_amount", "gross_amount"]),
    }, currencyOf(invoice));
  }
  for (const adjustment of adjustments) {
    const invoice = invoicesById.get(optionalString(adjustment.invoice_id));
    push({ ...invoice, ...adjustment, matter_id: adjustment.matter_id ?? invoice?.matter_id }, ["adjusted_at", "corrected_at", "effective_at", "issued_at"], {
      billed_amount: correctionAmount(adjustment),
    }, currencyOf(invoice));
  }

  if (paymentMatches.length > 0) {
    for (const match of paymentMatches) {
      const payment = indexBy(payments, "payment_id").get(optionalString(match.payment_id));
      const invoice = invoicesById.get(optionalString(match.invoice_id));
      push({ ...payment, ...invoice, ...match, matter_id: match.matter_id ?? invoice?.matter_id ?? payment?.matter_id }, ["matched_at", "allocated_at"], {
        collected_amount: firstNumber(match, ["matched_amount", "allocated_amount", "amount"]),
      }, currencyOf(payment, currencyOf(invoice)));
    }
  } else {
    for (const payment of payments) {
      push(payment, ["received_at", "payment_date", "paid_at"], {
        collected_amount: firstNumber(payment, ["amount", "received_amount", "payment_amount"]),
      }, currencyOf(payment));
    }
  }

  for (const expense of expenses) {
    const amount = firstNumber(expense, ["amount", "expense_amount", "total_amount"]);
    const processed = expense.approved_for_wip === true || PROCESSED_COST_STATUSES.has(String(expense.status ?? "").toLowerCase());
    push(expense, ["expense_date", "incurred_at"], {
      matter_cost: amount,
      processed_cost: processed ? amount : 0,
      recoverable_cost: expense.approved_for_wip === true || expense.recoverable === true ? amount : 0,
    }, currencyOf(expense));
  }
  for (const disbursement of disbursements) {
    const amount = firstNumber(disbursement, ["amount", "disbursement_amount", "total_amount"]);
    const processed = disbursement.approved_for_wip === true || PROCESSED_COST_STATUSES.has(String(disbursement.status ?? "").toLowerCase());
    push(disbursement, ["disbursed_at", "paid_at", "expense_date"], {
      matter_cost: amount,
      processed_cost: processed ? amount : 0,
      recoverable_cost: disbursement.recoverable === true ? amount : 0,
    }, currencyOf(disbursement));
  }

  const latestArByInvoice = new Map();
  for (const balance of arBalances) {
    if (CLOSED_AR_STATUSES.has(String(balance.status ?? "").toLowerCase())) continue;
    const dated = datedRow(balance, ["as_of_date", "snapshot_at", "updated_at", "due_date"]);
    if (!dated || !inPeriod(dated.date, null, to)) continue;
    const key = `${balance.invoice_id ?? balance.ar_balance_id}:${currencyOf(balance)}`;
    if (!latestArByInvoice.has(key) || latestArByInvoice.get(key).dated.date <= dated.date) latestArByInvoice.set(key, { balance, dated });
  }
  for (const { balance, dated } of latestArByInvoice.values()) {
    push({ ...balance, as_of_date: dated.date }, ["as_of_date"], {
      ar_balance: firstNumber(balance, ["balance", "open_balance", "amount_due"]),
    }, currencyOf(balance, currencyOf(invoicesById.get(optionalString(balance.invoice_id)))));
  }

  const totals = new Map();
  const monthly = new Map();
  const clients = new Map();
  const clientMatterIds = new Map();
  for (const entry of entries) {
    const total = totals.get(entry.currency) ?? emptyMetrics(entry.currency);
    addEntry(total, entry);
    totals.set(entry.currency, total);

    const monthKey = `${entry.month}:${entry.currency}`;
    const month = monthly.get(monthKey) ?? { month: entry.month, ...emptyMetrics(entry.currency) };
    addEntry(month, entry);
    monthly.set(monthKey, month);

    const clientId = entry.client_group_id ?? UNLINKED_CLIENT_ID;
    const clientKey = `${clientId}:${entry.currency}`;
    const client = clients.get(clientKey) ?? {
      client_group_id: entry.client_group_id,
      client_group_label: entry.client_group_label,
      client_mapping_source: entry.client_mapping_source,
      matter_count: 0,
      ...emptyMetrics(entry.currency),
    };
    addEntry(client, entry);
    const matters = clientMatterIds.get(clientKey) ?? new Set();
    if (entry.matter_id) matters.add(entry.matter_id);
    client.matter_count = matters.size;
    clientMatterIds.set(clientKey, matters);
    clients.set(clientKey, client);
  }

  const totalRows = finalizedRows(totals);
  const monthlyRows = finalizedRows(monthly);
  const clientRows = finalizedRows(clients);
  const partial = sourceStatuses.some((source) => source.status !== "passed" && !["ClientGroup", "BillingProfile", "Matter"].includes(source.source));
  return Object.freeze({
    overview: Object.freeze({
      scope_label: "Matter 기반 집계",
      recognition_basis,
      totals: totalRows,
      currency_conversion_applied: false,
      ar_balance_is_point_in_time: true,
    }),
    monthly: monthlyRows,
    clients: clientRows,
    source_statuses: Object.freeze(sourceStatuses.map((source) => Object.freeze({ ...source }))),
    partial,
    filters: Object.freeze({ tenant_id: tenantId, from, to, currency: currency?.toUpperCase() ?? null, client_group_id, matter_id, recognition_basis, time_zone: "Asia/Seoul" }),
    raw_source_payload_included: false,
    credential_material_included: false,
    journal_lines_included: false,
    production_ready_claim: false,
  });
}
