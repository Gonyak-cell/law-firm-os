import { buildTodayOperations } from "../../../packages/matter/src/small-firm-ops-service.js";
import { queryMatterBillingWip } from "../../../packages/billing/src/wip-service.js";
import { queryMatterArQueue } from "../../../packages/payments/src/ar-service.js";
import { MATTER_SMALL_FIRM_OPS_VIEWS } from "./matter-small-firm-api-catalog.js";

const DEFAULT_TIME_ZONE = "Asia/Seoul";

function mappedTaskView(view) {
  const requested = view ?? "my";
  if (!MATTER_SMALL_FIRM_OPS_VIEWS.tasks.includes(requested)) {
    throw new TypeError("view must be my, overdue, waiting, or unassigned");
  }
  return requested === "my" ? "my_work" : requested;
}

function summarizeTaskRows(items) {
  return Object.freeze({
    overdue: items.filter((row) => row.due_bucket === "overdue").length,
    due_today: items.filter((row) => row.due_bucket === "due_today").length,
    upcoming: items.filter((row) => row.due_bucket === "upcoming").length,
    undated: items.filter((row) => row.due_bucket === "undated").length,
  });
}

export function readMatterTodayOperations({
  tenantId,
  timeZone = DEFAULT_TIME_ZONE,
  asOf,
  asOfDate,
  tasks,
  followUps,
  financeAllowed,
  financeRepository,
  wipRepository,
  arRepository,
  weeklyTimeCompleteness,
} = {}) {
  let timeRows = [];
  let wipRows = [];
  let receivableRows = [];
  if (financeAllowed) {
    const actors = [...new Set(
      financeRepository
        .list({ tenant_id: tenantId, model_type: "TimeEntry" })
        .map((entry) => entry.actor_id)
        .filter(Boolean),
    )];
    const completeness = weeklyTimeCompleteness(actors);
    timeRows = completeness.items.map((row) => ({
      ...row,
      tenant_id: tenantId,
      resource_id: `time-gap:${row.actor_id}:${row.week_start}`,
      title: row.display_name ?? row.actor_id,
      missing: row.complete !== true,
      status: row.complete ? "complete" : "incomplete",
    }));
    const wip = queryMatterBillingWip({
      repository: wipRepository,
      tenant_id: tenantId,
      as_of_date: asOfDate,
    });
    wipRows = wip.rows.map((row) => ({
      ...row,
      tenant_id: tenantId,
      resource_id: row.wip_item_id ?? `wip:${row.source_model_type}:${row.source_id}`,
      title: `${row.matter_id} WIP`,
    }));
    const receivables = queryMatterArQueue({
      repository: arRepository,
      tenant_id: tenantId,
      as_of_date: asOfDate,
    });
    receivableRows = receivables.rows.map((row) => ({
      ...row,
      tenant_id: tenantId,
      resource_id: row.invoice_id,
      title: row.invoice_number ?? row.invoice_id,
      outstanding_amount: row.balance,
      status: row.lifecycle_status,
    }));
  }
  return {
    operations: buildTodayOperations({
      tenant_id: tenantId,
      now: asOf,
      timezone: timeZone,
      tasks,
      follow_ups: followUps,
      time_completeness: timeRows,
      wip: wipRows,
      receivables: receivableRows,
    }),
    finance_state: financeAllowed ? "populated" : "denied",
  };
}

export function readMatterTaskQueue({
  listTaskQueue,
  canReadMatter,
  tenantId,
  actorId,
  view,
  asOf,
  clock,
  timeZone = DEFAULT_TIME_ZONE,
  matterId,
  includeTerminal = false,
} = {}) {
  const requestedView = view ?? "my";
  const boardView = requestedView === "board";
  const result = listTaskQueue({
    tenant_id: tenantId,
    actor_id: actorId,
    as_of: asOf ?? clock(),
    time_zone: timeZone,
    saved_view: boardView ? null : mappedTaskView(requestedView),
    matter_id: matterId,
    include_terminal: boardView || includeTerminal,
  });
  const items = result.items.filter((item) => canReadMatter(item.matter_id));
  return {
    items,
    count: items.length,
    summary: summarizeTaskRows(items),
    view: requestedView,
    include_terminal: result.include_terminal === true,
    as_of: result.as_of,
    time_zone: result.time_zone,
  };
}

export function readMatterCalendar({
  getWeekSchedule,
  canReadMatter,
  tenantId,
  weekStart,
  timeZone = DEFAULT_TIME_ZONE,
  matterId,
} = {}) {
  const result = getWeekSchedule({
    tenant_id: tenantId,
    week_start: weekStart,
    time_zone: timeZone,
    matter_id: matterId,
  });
  const items = result.items.filter((item) => canReadMatter(item.matter_id));
  return {
    items,
    count: items.length,
    week_start: result.week_start,
    week_end: result.week_end,
    time_zone: result.time_zone,
  };
}
