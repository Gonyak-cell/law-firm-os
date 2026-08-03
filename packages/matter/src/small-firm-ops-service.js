import { createHash } from "node:crypto";
import { assertMatterIsoTimestamp } from "./model.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";
const OPEN_TASK_STATUSES = new Set(["open", "todo", "in_progress", "blocked", "waiting", "pending"]);
const CLOSED_EVENT_STATUSES = new Set(["cancelled", "completed", "done", "archived"]);
const BILLED_STATUSES = new Set(["billed", "invoiced", "paid", "void", "written_off", "cancelled"]);
const CLOSEOUT_CLEARED_SOURCE_STATUSES = new Set(["billed", "invoiced", "paid", "written_off", "cancelled"]);
const INACTIVE_ALLOCATION_STATUSES = new Set(["cancelled", "canceled", "void", "rejected", "deleted", "reversed"]);

const LANE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "overdue", label: "기한 초과", section: "matter-work", filter: "overdue" }),
  Object.freeze({ id: "due_today", label: "오늘 마감", section: "matter-calendar", filter: "today" }),
  Object.freeze({ id: "our_response", label: "우리 답변", section: "matter-followups", filter: "our-response" }),
  Object.freeze({ id: "blocked", label: "막힘", section: "matter-work", filter: "blocked" }),
  Object.freeze({ id: "unassigned", label: "미배정", section: "matter-work", filter: "unassigned" }),
  Object.freeze({ id: "missing_time", label: "시간 누락", section: "matter-time-billing", filter: "missing-time" }),
  Object.freeze({ id: "wip", label: "청구 대기 WIP", section: "matter-time-billing", filter: "wip" }),
  Object.freeze({ id: "ar", label: "미수금", section: "matter-time-billing", filter: "ar" }),
]);

const WEEKLY_QUESTIONS = Object.freeze([
  Object.freeze({ id: "overdue_deadlines", label: "초과 기한", lane_id: "overdue" }),
  Object.freeze({ id: "unassigned_work", label: "미배정 업무", lane_id: "unassigned" }),
  Object.freeze({ id: "client_follow_up", label: "의뢰인 후속", lane_id: "our_response" }),
  Object.freeze({ id: "missing_time", label: "누락 시간", lane_id: "missing_time" }),
  Object.freeze({ id: "pending_wip", label: "청구 대기", lane_id: "wip" }),
  Object.freeze({ id: "receivables", label: "미수금", lane_id: "ar" }),
]);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function requestFingerprint(value) {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function safeId(value) {
  return requiredString(value, "id").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function optionalString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseDate(value, field) {
  const iso = value instanceof Date
    ? assertMatterIsoTimestamp(value.toISOString(), field)
    : assertMatterIsoTimestamp(value, field);
  return new Date(iso);
}

function parseDateOrDateKey(value, field) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new TypeError(`${field} must be YYYY-MM-DD or an ISO timestamp with timezone`);
    }
    return date;
  }
  return parseDate(value, field);
}

function resolveNow({ now, clock } = {}) {
  const value = typeof clock === "function" ? clock() : now;
  return value === undefined ? new Date() : parseDate(value, "now");
}

function localDateKey(value, timeZone = DEFAULT_TIMEZONE) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parseDateOrDateKey(value, "date");
    return value;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parseDate(value, "date"));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function inTenantScope(row, tenantId) {
  return Boolean(row && row.tenant_id === tenantId);
}

function inMatterScope(row, tenantId, matterId) {
  return Boolean(inTenantScope(row, tenantId) && row.matter_id === matterId);
}

function requireDurableMutationRepository(repository, operation) {
  const methods = [
    "get",
    "create",
    "update",
    "transaction",
    "getIdempotency",
    "recordIdempotency",
    "appendAudit",
  ];
  if (repository?.durable !== true) {
    throw new TypeError(`${operation} requires a durable repository`);
  }
  for (const method of methods) {
    if (typeof repository[method] !== "function") {
      throw new TypeError(`${operation} requires repository.${method}`);
    }
  }
  return repository;
}

function rowId(row, fallback = "") {
  return optionalString(
    row?.task_id
      ?? row?.item_id
      ?? row?.event_id
      ?? row?.follow_up_id
      ?? row?.followup_id
      ?? row?.person_id
      ?? row?.time_entry_id
      ?? row?.entry_id
      ?? row?.wip_id
      ?? row?.invoice_id
      ?? row?.receivable_id
      ?? row?.resource_id
      ?? row?.id
      ?? fallback,
  );
}

function dueAtOf(row) {
  return optionalString(row?.due_at ?? row?.starts_at ?? row?.due_date);
}

function activeTask(task) {
  return OPEN_TASK_STATUSES.has(String(task?.status ?? "todo"));
}

function activeEvent(event) {
  return !CLOSED_EVENT_STATUSES.has(String(event?.status ?? "scheduled"));
}

function compareItems(left, right) {
  const leftDue = left.due_at ? parseDateOrDateKey(left.due_at, "due_at").getTime() : Number.POSITIVE_INFINITY;
  const rightDue = right.due_at ? parseDateOrDateKey(right.due_at, "due_at").getTime() : Number.POSITIVE_INFINITY;
  return leftDue - rightDue
    || String(left.matter_id ?? "").localeCompare(String(right.matter_id ?? ""))
    || left.item_id.localeCompare(right.item_id);
}

function numericAmount(row) {
  let candidate = row?.outstanding_amount
    ?? row?.balance_due
    ?? row?.balance
    ?? row?.wip_amount
    ?? row?.amount;
  if (
    (candidate === null || candidate === undefined || candidate === "")
    && row?.total_amount !== null
    && row?.total_amount !== undefined
  ) {
    candidate = Number(row.total_amount) - Number(row.paid_amount ?? 0);
  }
  if (candidate === null || candidate === undefined || candidate === "") return null;
  const amount = Number(candidate);
  if (!Number.isFinite(amount)) throw new TypeError("amount must be a finite number");
  return amount;
}

function invoiceLifecycleStatus(invoice) {
  const status = String(invoice?.lifecycle_status ?? invoice?.status ?? "draft");
  if (status === "issued") return "sent";
  if (status === "partially_paid") return "partial";
  return status;
}

function invoiceOutstandingAmount(invoice) {
  if (invoice?.amount_due !== undefined && invoice?.amount_due !== null) {
    const due = Number(invoice.amount_due);
    const paid = Number(invoice.amount_paid ?? invoice.paid_amount ?? 0);
    if (!Number.isFinite(due) || !Number.isFinite(paid)) {
      throw new TypeError("invoice amounts must be finite numbers");
    }
    return Math.max(0, Math.round((due - paid) * 100) / 100);
  }
  return numericAmount(invoice);
}

function routeFor(definition, overrides = {}) {
  const route = overrides[definition.id] ?? {};
  const section = route.section ?? definition.section;
  const filter = route.filter ?? definition.filter;
  return Object.freeze({
    section,
    filter,
    href: route.href ?? `/matter?section=${encodeURIComponent(section)}&filter=${encodeURIComponent(filter)}`,
  });
}

function itemDto(row, sourceType, { money = false } = {}) {
  const itemId = requiredString(rowId(row), `${sourceType}_id`);
  const amount = money ? numericAmount(row) : null;
  return Object.freeze({
    item_id: itemId,
    source_type: sourceType,
    matter_id: optionalString(row.matter_id),
    title: requiredString(
      row.title
        ?? row.matter_title
        ?? row.description
        ?? row.user_display_name
        ?? row.user_id
        ?? itemId,
      `${sourceType}.title`,
    ),
    owner_user_id: optionalString(
      row.owner_user_id
        ?? row.owner_id
        ?? row.owner
        ?? row.assigned_to
        ?? row.user_id
        ?? row.person_id,
    ),
    status: optionalString(row.status),
    due_at: dueAtOf(row),
    amount,
    currency: money ? optionalString(row.currency) ?? "KRW" : null,
    source_ref: optionalString(row.source_ref),
    error_code: optionalString(row.error_code ?? row.safe_error_code),
  });
}

function projectedRows(options, laneId) {
  const aliases = {
    our_response: ["awaiting_our_response", "follow_ups"],
    missing_time: ["time_missing", "time_gaps"],
    wip: ["pending_wip"],
    ar: ["receivables", "overdue_ar"],
  };
  const candidates = [
    options.projections?.[laneId],
    options[`${laneId}_rows`],
    ...asArray(aliases[laneId]).flatMap((alias) => [
      options.projections?.[alias],
      options[`${alias}_rows`],
    ]),
  ];
  const selected = candidates.find((candidate) => candidate !== undefined);
  if (selected === undefined) return null;
  return typeof selected === "function"
    ? asArray(selected({ tenant_id: options.tenant_id, now: options.now, timezone: options.timezone }))
    : asArray(selected);
}

function amountMap(items) {
  const amounts = new Map();
  for (const item of items) {
    if (item.amount === null) continue;
    const currency = item.currency ?? "KRW";
    amounts.set(currency, (amounts.get(currency) ?? 0) + item.amount);
  }
  return Object.freeze(Object.fromEntries([...amounts.entries()].sort(([left], [right]) => left.localeCompare(right))));
}

function createLane(definition, items, routes) {
  const sorted = [...items].sort(compareItems);
  return Object.freeze({
    id: definition.id,
    label: definition.label,
    count: sorted.length,
    items: Object.freeze(sorted),
    amounts_by_currency: amountMap(sorted),
    route: routeFor(definition, routes),
  });
}

export function buildTodayOperations(options = {}) {
  const tenantId = requiredString(options.tenant_id, "tenant_id");
  const current = resolveNow(options);
  const timezone = options.timezone ?? DEFAULT_TIMEZONE;
  const today = localDateKey(current, timezone);
  const tasks = asArray(options.tasks).filter((row) => inTenantScope(row, tenantId));
  const followUps = asArray(options.follow_ups).filter((row) => inTenantScope(row, tenantId));
  const timeRows = asArray(options.time_completeness ?? options.time_gaps ?? options.missing_time)
    .filter((row) => inTenantScope(row, tenantId));
  const wipRows = asArray(options.wip).filter((row) => inTenantScope(row, tenantId));
  const receivables = asArray(options.receivables ?? options.ar).filter((row) => inTenantScope(row, tenantId));
  const derived = {
    overdue: tasks
      .filter((task) =>
        activeTask(task)
          && (
            dueAtOf(task)
              ? localDateKey(dueAtOf(task), timezone) < today
              : task.lane === "overdue"
          ),
      )
      .map((row) => itemDto(row, "task")),
    due_today: tasks
      .filter((task) =>
        activeTask(task)
          && (
            dueAtOf(task)
              ? localDateKey(dueAtOf(task), timezone) === today
              : task.lane === "today"
          ),
      )
      .map((row) => itemDto(row, "task")),
    our_response: followUps
      .filter((row) => {
        const waitingOn = String(row.waiting_on ?? row.queue ?? row.status ?? "");
        return ["firm", "firm_reply", "our_response", "awaiting_firm", "pending_firm", "needs_response"].includes(waitingOn)
          && !["done", "cancelled", "snoozed"].includes(String(row.status ?? ""));
      })
      .map((row) => itemDto(row, "follow_up")),
    blocked: tasks
      .filter((task) =>
        activeTask(task)
          && (task.status === "blocked" || String(task.wait_state ?? "") === "blocked"),
      )
      .map((row) => itemDto(row, "task")),
    unassigned: tasks
      .filter((task) =>
        activeTask(task)
          && !optionalString(task.assigned_to ?? task.owner_user_id ?? task.owner_id ?? task.owner),
      )
      .map((row) => itemDto(row, "task")),
    missing_time: timeRows
      .filter((row) =>
        row.missing === true
          || Number(row.missing_minutes ?? 0) > 0
          || ["missing", "incomplete"].includes(String(row.status ?? "")),
      )
      .map((row) => itemDto(row, "time_gap")),
    wip: wipRows
      .filter((row) =>
        !BILLED_STATUSES.has(String(row.status ?? row.billing_status ?? "pending"))
          && !optionalString(row.invoice_id),
      )
      .map((row) => itemDto(row, "wip", { money: true })),
    ar: receivables
      .filter((row) => {
        const amount = numericAmount(row);
        return amount !== null && amount > 0 && !["paid", "void", "written_off"].includes(String(row.status ?? ""));
      })
      .map((row) => itemDto(row, "receivable", { money: true })),
  };
  const lanes = LANE_DEFINITIONS.map((definition) => {
    const projection = projectedRows({ ...options, tenant_id: tenantId, now: current, timezone }, definition.id);
    const rows = projection
      ? projection
          .filter((row) => inTenantScope(row, tenantId))
          .map((row) => itemDto(row, row.source_type ?? definition.id, {
            money: definition.id === "wip" || definition.id === "ar",
          }))
      : derived[definition.id];
    return createLane(definition, rows, options.routes ?? {});
  });
  const canonicalById = Object.fromEntries(lanes.map((lane) => [lane.id, lane]));
  const byId = Object.freeze({
    ...canonicalById,
    awaiting_our_response: canonicalById.our_response,
    pending_wip: canonicalById.wip,
    receivables: canonicalById.ar,
  });
  return Object.freeze({
    tenant_id: tenantId,
    as_of: current.toISOString(),
    timezone,
    lanes: Object.freeze(lanes),
    by_id: byId,
    total_item_count: lanes.reduce((sum, lane) => sum + lane.count, 0),
  });
}

function blockerRoute(section, filter, sourceId) {
  return Object.freeze({
    section,
    filter,
    source_id: sourceId,
    href: `/matter?section=${encodeURIComponent(section)}&filter=${encodeURIComponent(filter)}&id=${encodeURIComponent(sourceId)}`,
  });
}

export function listCloseoutBlockers({
  tenant_id,
  matter_id,
  tasks = [],
  calendar_events = [],
  events,
  time_entries = [],
  wip = [],
  wip_snapshots = [],
  prebills = [],
  receivables = [],
  ar,
  invoices,
  payment_allocations = [],
} = {}) {
  const tenantId = requiredString(tenant_id, "tenant_id");
  const matterId = requiredString(matter_id, "matter_id");
  const blockers = [];
  const wipRows = asArray(wip).filter((row) => inMatterScope(row, tenantId, matterId));
  const snapshotRows = asArray(wip_snapshots).filter((row) => inMatterScope(row, tenantId, matterId));
  const prebillRows = asArray(prebills).filter((row) => inMatterScope(row, tenantId, matterId));
  const invoiceRows = asArray(invoices).filter((row) => inMatterScope(row, tenantId, matterId));
  const invoicesById = new Map(
    invoiceRows.map((invoice) => [optionalString(invoice.invoice_id ?? invoice.resource_id), invoice]).filter(([id]) => id),
  );
  const invoicesByPrebill = new Map(
    invoiceRows.map((invoice) => [optionalString(invoice.prebill_id), invoice]).filter(([id]) => id),
  );
  const prebillsBySnapshot = new Map(
    prebillRows.map((prebill) => [optionalString(prebill.wip_snapshot_id), prebill]).filter(([id]) => id),
  );
  const invoiceByWipItem = new Map();
  for (const snapshot of snapshotRows) {
    const prebill = prebillsBySnapshot.get(optionalString(snapshot.wip_snapshot_id));
    const invoice = invoicesByPrebill.get(optionalString(prebill?.prebill_id));
    const itemSnapshots = asArray(snapshot.item_snapshots);
    const wipItemIds = new Set([
      ...asArray(snapshot.item_refs).map(optionalString).filter(Boolean),
      ...itemSnapshots.map((item) => optionalString(item.wip_item_id)).filter(Boolean),
    ]);
    for (const wipItemId of wipItemIds) invoiceByWipItem.set(wipItemId, invoice);
  }
  const usableInvoice = (invoice) =>
    Boolean(invoice)
      && !["void", "cancelled", "canceled", "rejected"].includes(invoiceLifecycleStatus(invoice));
  const hasBilledLineage = (row, sourceModelType) => {
    const status = String(row.billing_status ?? row.status ?? "unbilled");
    const directInvoiceId = optionalString(row.invoice_id);
    if (directInvoiceId) {
      if (invoices === undefined) return true;
      return usableInvoice(invoicesById.get(directInvoiceId));
    }
    const sourceId = rowId(row);
    if (sourceModelType === "WipItem" && invoiceByWipItem.has(sourceId)) {
      return usableInvoice(invoiceByWipItem.get(sourceId));
    }
    const sourceWip = wipRows
      .filter((item) => item.source_model_type === sourceModelType && optionalString(item.source_id) === sourceId)
      .filter((item) => invoiceByWipItem.has(rowId(item)));
    if (sourceWip.length > 0) {
      return sourceWip.some((item) => usableInvoice(invoiceByWipItem.get(rowId(item))));
    }
    return CLOSEOUT_CLEARED_SOURCE_STATUSES.has(status);
  };
  for (const task of asArray(tasks).filter((row) => inMatterScope(row, tenantId, matterId)).filter(activeTask)) {
    const id = requiredString(rowId(task), "task_id");
    blockers.push({
      blocker_id: `open_task:${id}`,
      blocker_type: "open_task",
      source_id: id,
      title: requiredString(task.title, "task.title"),
      status: task.status,
      amount: null,
      currency: null,
      action: blockerRoute("matter-work", "open", id),
    });
  }
  for (const event of asArray(events ?? calendar_events).filter((row) => inMatterScope(row, tenantId, matterId)).filter(activeEvent)) {
    const id = requiredString(rowId(event), "event_id");
    blockers.push({
      blocker_id: `open_deadline:${id}`,
      blocker_type: "open_deadline",
      source_id: id,
      title: requiredString(event.title, "event.title"),
      status: event.status ?? "scheduled",
      amount: null,
      currency: null,
      action: blockerRoute("matter-calendar", "open", id),
    });
  }
  for (const entry of asArray(time_entries).filter((row) => inMatterScope(row, tenantId, matterId))) {
    const status = String(entry.billing_status ?? entry.status ?? "unbilled");
    if (entry.billable === false || hasBilledLineage(entry, "TimeEntry")) continue;
    const id = requiredString(rowId(entry), "time_entry_id");
    blockers.push({
      blocker_id: `unbilled_time:${id}`,
      blocker_type: "unbilled_time",
      source_id: id,
      title: requiredString(entry.title ?? entry.description ?? "미청구 시간", "time_entry.title"),
      status,
      amount: numericAmount(entry),
      currency: optionalString(entry.currency) ?? "KRW",
      action: blockerRoute("matter-time-billing", "unbilled-time", id),
    });
  }
  for (const item of wipRows) {
    const status = String(item.billing_status ?? item.status ?? "pending");
    if (hasBilledLineage(item, "WipItem")) continue;
    const id = requiredString(rowId(item), "wip_id");
    blockers.push({
      blocker_id: `unbilled_wip:${id}`,
      blocker_type: "unbilled_time",
      source_id: id,
      title: requiredString(item.title ?? "청구 대기 WIP", "wip.title"),
      status,
      amount: numericAmount(item),
      currency: optionalString(item.currency) ?? "KRW",
      action: blockerRoute("matter-time-billing", "wip", id),
    });
  }
  const receivableRows = asArray(ar ?? receivables)
    .filter((row) => inMatterScope(row, tenantId, matterId));
  const blockedReceivableInvoiceIds = new Set();
  for (const item of receivableRows) {
    const amount = numericAmount(item);
    if (amount === null || amount <= 0 || ["paid", "void", "written_off"].includes(String(item.status ?? ""))) continue;
    const id = requiredString(rowId(item), "receivable_id");
    const invoiceId = optionalString(item.invoice_id);
    if (invoiceId) blockedReceivableInvoiceIds.add(invoiceId);
    blockers.push({
      blocker_id: `outstanding_receivable:${id}`,
      blocker_type: "outstanding_receivable",
      source_id: id,
      title: requiredString(item.title ?? item.invoice_number ?? "미수금", "receivable.title"),
      status: item.status ?? "outstanding",
      amount,
      currency: optionalString(item.currency) ?? "KRW",
      action: blockerRoute("matter-time-billing", "ar", id),
    });
  }
  for (const item of invoiceRows.filter((row) => !blockedReceivableInvoiceIds.has(optionalString(row.invoice_id)))) {
    const status = invoiceLifecycleStatus(item);
    const amount = invoiceOutstandingAmount(item);
    if (amount === null || amount <= 0 || ["void", "written_off"].includes(status)) continue;
    const id = requiredString(rowId(item), "invoice_id");
    blockers.push({
      blocker_id: `outstanding_receivable:${id}`,
      blocker_type: "outstanding_receivable",
      source_id: id,
      title: requiredString(item.title ?? item.invoice_number ?? "미수금", "invoice.title"),
      status,
      amount,
      currency: optionalString(item.currency) ?? "KRW",
      action: blockerRoute("matter-time-billing", "ar", id),
    });
  }
  const allocationRows = asArray(payment_allocations)
    .filter((row) => inMatterScope(row, tenantId, matterId));
  const reversedAllocationIds = new Set(
    allocationRows.map((row) => optionalString(row.reverses_payment_allocation_id)).filter(Boolean),
  );
  for (const allocation of allocationRows.filter((row) =>
    !INACTIVE_ALLOCATION_STATUSES.has(String(row.status ?? "").toLowerCase())
      && !reversedAllocationIds.has(optionalString(row.payment_allocation_id)))) {
    if (allocation.allocation_type !== "invoice_payment") continue;
    const allocationId = requiredString(
      allocation.payment_allocation_id ?? allocation.resource_id,
      "payment_allocation_id",
    );
    const invoiceId = optionalString(allocation.invoice_id);
    const invoice = invoiceId ? invoicesById.get(invoiceId) : null;
    const amount = Number(allocation.amount);
    const problem = !invoiceId || !invoice
      ? "missing_invoice"
      : invoiceLifecycleStatus(invoice) === "void"
        ? "void_invoice"
        : !Number.isFinite(amount) || amount <= 0
          ? "invalid_amount"
          : null;
    if (!problem) continue;
    blockers.push({
      blocker_id: `payment_allocation_problem:${allocationId}`,
      blocker_type: "payment_allocation_problem",
      source_id: allocationId,
      title: "결제 배분 확인 필요",
      status: problem,
      amount: Number.isFinite(amount) ? amount : null,
      currency: optionalString(allocation.currency) ?? optionalString(invoice?.currency) ?? "KRW",
      action: blockerRoute("matter-time-billing", "payment-allocations", allocationId),
    });
  }
  const typeOrder = new Map([
    ["open_task", 0],
    ["open_deadline", 1],
    ["unbilled_time", 2],
    ["outstanding_receivable", 3],
    ["payment_allocation_problem", 4],
  ]);
  return Object.freeze(
    blockers
      .sort((left, right) =>
        typeOrder.get(left.blocker_type) - typeOrder.get(right.blocker_type)
          || left.source_id.localeCompare(right.source_id),
      )
      .map((blocker) => Object.freeze(blocker)),
  );
}

export function listArchivedMatters({
  tenant_id,
  matters,
  repository,
} = {}) {
  const tenantId = requiredString(tenant_id, "tenant_id");
  const source = Array.isArray(matters)
    ? matters
    : repository?.list?.({ tenant_id: tenantId, model_type: "Matter" }) ?? [];
  return Object.freeze(
    source
      .filter((matter) => inTenantScope(matter, tenantId) && matter.status === "archived")
      .map((matter) => {
        const matterId = requiredString(matter.matter_id ?? matter.id, "matter_id");
        return Object.freeze({
          ...clone(matter),
          matter_id: matterId,
          saved_view: "archived",
          route: Object.freeze({
            section: "matter-list",
            filter: "archived",
            href: `/matter?section=matter-list&filter=archived&matter_id=${encodeURIComponent(matterId)}`,
          }),
          restore_action: Object.freeze({
            action: "matter.restore",
            matter_id: matterId,
            target_status: "closed",
          }),
        });
      })
      .sort((left, right) => {
        const leftAt = left.archived_at ?? left.closed_at ?? left.updated_at;
        const rightAt = right.archived_at ?? right.closed_at ?? right.updated_at;
        const timeOrder = leftAt && rightAt
          ? parseDate(rightAt, "archived_at").getTime() - parseDate(leftAt, "archived_at").getTime()
          : leftAt ? -1 : rightAt ? 1 : 0;
        return timeOrder
          || String(left.matter_code ?? left.matter_number ?? left.matter_id)
            .localeCompare(String(right.matter_code ?? right.matter_number ?? right.matter_id));
      }),
  );
}

export function archiveMatter(options = {}) {
  const repository = requireDurableMutationRepository(options.repository, "archiveMatter");
  const tenantId = requiredString(options.tenant_id, "tenant_id");
  const matterId = requiredString(options.matter_id, "matter_id");
  const actorId = requiredString(options.actor_id, "actor_id");
  const idempotencyKey = requiredString(options.idempotency_key, "idempotency_key");
  const occurredAt = parseDate(options.occurred_at ?? new Date(), "occurred_at").toISOString();
  const reason = requiredString(options.reason ?? "matter_archived", "reason");
  const fingerprint = requestFingerprint({
    operation: "matter.archive",
    matter_id: matterId,
    reason,
  });
  const current = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!current) throw new Error("Matter not found");
  if (
    current.tenant_id !== tenantId
    || current.matter_id !== matterId
    || (
      options.matter
      && (
        options.matter.tenant_id !== tenantId
        || options.matter.matter_id !== matterId
      )
    )
  ) {
    throw Object.assign(new Error("matter is outside the requested scope"), {
      safe_error_code: "MATTER_SCOPE_MISMATCH",
      status: 403,
    });
  }
  const existing = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (existing) {
    if (existing.request_fingerprint !== fingerprint) {
      throw Object.assign(new Error("idempotency key was already used for another request"), {
        code: "LAWOS_IDEMPOTENCY_CONFLICT",
        safe_error_code: "IDEMPOTENCY_CONFLICT",
        status: 409,
      });
    }
    return Object.freeze({ ...clone(existing.response), idempotent_replay: true });
  }
  if (current.status !== "closed") {
    throw Object.assign(new Error("Matter must be closed before archive"), {
      safe_error_code: "MATTER_ARCHIVE_REQUIRES_CLOSED",
      status: 422,
    });
  }

  const suffix = safeId(`${matterId}_${fingerprint.slice(0, 16)}`);
  const auditEvent = Object.freeze({
    event_id: `matter_archive_${suffix}`,
    tenant_id: tenantId,
    actor_id: actorId,
    action: "matter.archive",
    object_type: "Matter",
    object_id: matterId,
    decision: "allow",
    reason,
    occurred_at: occurredAt,
    metadata: Object.freeze({
      from_status: "closed",
      to_status: "archived",
    }),
  });
  const timelineEvent = Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: `timeline_archive_${suffix}`,
    event_id: `timeline_archive_${suffix}`,
    tenant_id: tenantId,
    matter_id: matterId,
    occurred_at: occurredAt,
    type: "matter.archive",
    title: "사건 보관",
    source_module: "matter",
    source_object_id: auditEvent.event_id,
    source_ref: auditEvent.event_id,
    safe_summary: Object.freeze({
      from_status: "closed",
      to_status: "archived",
    }),
    raw_body_included: false,
  });
  const execute = (store) => {
    const matter = store.update(
      { tenant_id: tenantId, model_type: "Matter", matter_id: matterId },
      {
        status: "archived",
        pre_archive_status: "closed",
        archived_at: occurredAt,
        archived_by: actorId,
        archive_reason: reason,
        updated_at: occurredAt,
      },
    );
    const persistedTimeline = store.create(timelineEvent);
    const persistedAudit = store.appendAudit(auditEvent);
    const response = Object.freeze({
      matter,
      timeline_event: persistedTimeline,
      audit_event: persistedAudit,
      idempotent_replay: false,
    });
    store.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "matter.archive",
      object_type: "Matter",
      object_id: matterId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: occurredAt,
    });
    return response;
  };
  return repository.transaction((transaction) => execute(transaction));
}

export function restoreArchivedMatter(options = {}) {
  const repository = requireDurableMutationRepository(options.repository, "restoreArchivedMatter");
  const tenantId = requiredString(options.tenant_id, "tenant_id");
  const matterId = requiredString(options.matter_id, "matter_id");
  const actorId = requiredString(options.actor_id, "actor_id");
  const idempotencyKey = requiredString(options.idempotency_key, "idempotency_key");
  const current = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!current) throw new Error("archived Matter not found");
  if (
    current.tenant_id !== tenantId
    || current.matter_id !== matterId
    || (
      options.matter
      && (
        options.matter.tenant_id !== tenantId
        || options.matter.matter_id !== matterId
      )
    )
  ) {
    throw Object.assign(new Error("matter is outside the requested scope"), {
      safe_error_code: "MATTER_SCOPE_MISMATCH",
      status: 403,
    });
  }
  const previousStatus = "closed";
  const targetStatus = options.target_status ?? previousStatus;
  if (targetStatus !== "closed") {
    throw new TypeError("target_status must be closed");
  }
  const occurredAt = parseDate(options.occurred_at ?? new Date(), "occurred_at").toISOString();
  const reason = requiredString(options.reason ?? "archived_matter_restored", "reason");
  const fingerprint = requestFingerprint({
    operation: "matter.restore",
    matter_id: matterId,
    target_status: targetStatus,
    reason,
  });
  const existing = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (existing) {
    if (existing.request_fingerprint !== fingerprint) {
      throw Object.assign(new Error("idempotency key was already used for another request"), {
        code: "LAWOS_IDEMPOTENCY_CONFLICT",
        safe_error_code: "IDEMPOTENCY_CONFLICT",
        status: 409,
      });
    }
    return Object.freeze({ ...clone(existing.response), idempotent_replay: true });
  }
  if (current.status !== "archived") throw new Error("Matter must be archived before restore");

  const suffix = safeId(`${matterId}_${fingerprint.slice(0, 16)}`);
  const auditEvent = Object.freeze({
    event_id: `matter_restore_${suffix}`,
    tenant_id: tenantId,
    actor_id: actorId,
    action: "matter.restore",
    object_type: "Matter",
    object_id: matterId,
    decision: "allow",
    reason,
    occurred_at: occurredAt,
    metadata: Object.freeze({
      from_status: "archived",
      to_status: targetStatus,
      previous_status: previousStatus,
    }),
  });
  const timelineEvent = Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: `timeline_restore_${suffix}`,
    event_id: `timeline_restore_${suffix}`,
    tenant_id: tenantId,
    matter_id: matterId,
    occurred_at: occurredAt,
    type: "matter.restore",
    title: "보관 사건 복원",
    source_module: "matter",
    source_object_id: auditEvent.event_id,
    source_ref: auditEvent.event_id,
    safe_summary: Object.freeze({
      from_status: "archived",
      to_status: targetStatus,
    }),
    raw_body_included: false,
  });
  const execute = (store) => {
    const matter = store.update(
      { tenant_id: tenantId, model_type: "Matter", matter_id: matterId },
      {
        status: targetStatus,
        archived_at: null,
        restored_at: occurredAt,
        restored_from_status: "archived",
        updated_at: occurredAt,
      },
    );
    const persistedTimeline = store.create(timelineEvent);
    const persistedAudit = store.appendAudit(auditEvent);
    const response = Object.freeze({
      matter,
      timeline_event: persistedTimeline,
      audit_event: persistedAudit,
      idempotent_replay: false,
    });
    store.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "matter.restore",
      object_type: "Matter",
      object_id: matterId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: occurredAt,
    });
    return response;
  };
  return repository.transaction((transaction) => execute(transaction));
}

function sumAmountMaps(maps) {
  const totals = new Map();
  for (const map of maps) {
    for (const [currency, amount] of Object.entries(map ?? {})) {
      totals.set(currency, (totals.get(currency) ?? 0) + Number(amount));
    }
  }
  return Object.freeze(Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right))));
}

function singleCurrencyAmount(amounts) {
  const entries = Object.entries(amounts);
  if (entries.length !== 1) return { amount: null, currency: null };
  return { currency: entries[0][0], amount: entries[0][1] };
}

export function buildWeeklyOperationsReport(options = {}) {
  const operations = options.today_operations ?? buildTodayOperations(options);
  if (!operations?.by_id) throw new TypeError("today_operations.by_id is required");
  const questions = WEEKLY_QUESTIONS.map((definition) => {
    const lane = operations.by_id[definition.lane_id];
    if (!lane) throw new TypeError(`today_operations lane is required: ${definition.lane_id}`);
    const amounts = amountMap(lane.items);
    const single = singleCurrencyAmount(amounts);
    return Object.freeze({
      id: definition.id,
      question: definition.label,
      lane_id: definition.lane_id,
      count: lane.count,
      amount: single.amount,
      currency: single.currency,
      amounts_by_currency: amounts,
      item_ids: Object.freeze(lane.items.map((item) => item.item_id)),
      route: lane.route,
    });
  });
  const totalAmounts = sumAmountMaps(questions.map((question) => question.amounts_by_currency));
  const singleTotal = singleCurrencyAmount(totalAmounts);
  return Object.freeze({
    tenant_id: operations.tenant_id,
    as_of: operations.as_of,
    timezone: operations.timezone,
    question_count: questions.length,
    questions: Object.freeze(questions),
    totals: Object.freeze({
      item_count: questions.reduce((sum, question) => sum + question.count, 0),
      amount: singleTotal.amount,
      currency: singleTotal.currency,
      amounts_by_currency: totalAmounts,
    }),
    source: Object.freeze({
      read_model: "today_operations",
      separate_analytics_calculation_used: false,
    }),
  });
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function amountsCell(amounts) {
  return Object.entries(amounts ?? {})
    .map(([currency, amount]) => `${currency}:${amount}`)
    .join("|");
}

export function renderWeeklyOperationsCsv(report, { include_bom = false } = {}) {
  if (!report || !Array.isArray(report.questions) || !report.totals) {
    throw new TypeError("weekly operations report is required");
  }
  const header = [
    "row_type",
    "question_id",
    "question",
    "count",
    "amount",
    "currency",
    "amounts_by_currency",
    "section",
    "filter",
  ];
  const rows = report.questions.map((question) => [
    "question",
    question.id,
    question.question,
    question.count,
    question.amount,
    question.currency,
    amountsCell(question.amounts_by_currency),
    question.route?.section,
    question.route?.filter,
  ]);
  rows.push([
    "total",
    "TOTAL",
    "합계",
    report.totals.item_count,
    report.totals.amount,
    report.totals.currency,
    amountsCell(report.totals.amounts_by_currency),
    "",
    "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")
    .concat("\r\n");
  return include_bom ? `\uFEFF${csv}` : csv;
}
