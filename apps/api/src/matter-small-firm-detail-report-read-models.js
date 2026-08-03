import { buildMatterDetail } from "../../../packages/matter/src/small-firm-detail-service.js";
import {
  buildWeeklyOperationsReport,
  listCloseoutBlockers,
  renderWeeklyOperationsCsv,
} from "../../../packages/matter/src/small-firm-ops-service.js";
import { queryMatterArQueue } from "../../../packages/payments/src/ar-service.js";
import { MATTER_SMALL_FIRM_OPS_VIEWS } from "./matter-small-firm-api-catalog.js";

const DEFAULT_TIME_ZONE = "Asia/Seoul";

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function requireMatterReader(canReadMatter) {
  if (typeof canReadMatter !== "function") throw new TypeError("canReadMatter is required");
  return canReadMatter;
}

function mappedFollowUpView(view) {
  const requested = view ?? "today";
  if (!MATTER_SMALL_FIRM_OPS_VIEWS.followups.includes(requested)) {
    throw new TypeError("view must be today, waiting_client, or stale_7d");
  }
  return requested === "today" ? "due_today" : requested;
}

export function readMatterDetail({
  matterRepository,
  financeRepository,
  canReadMatter,
  tenantId,
  matterId,
  grantedScopes = [],
  now,
  timeZone = DEFAULT_TIME_ZONE,
} = {}) {
  const readable = requireMatterReader(canReadMatter);
  const matter = matterRepository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!matter) throw Object.assign(new Error("Matter not found"), { status: 404 });
  const matterRows = (modelType) => matterRepository
    .list({ tenant_id: tenantId, model_type: modelType, matter_id: matterId })
    .filter((record) => readable(record.matter_id ?? matterId));
  const financeRows = (modelType) =>
    financeRepository.list({ tenant_id: tenantId, model_type: modelType, matter_id: matterId });
  return buildMatterDetail({
    matter,
    tasks: matterRows("MatterTask"),
    calendar_events: matterRows("MatterCalendarEvent"),
    activities: matterRows("MatterActivity"),
    notes: matterRows("MatterNote"),
    messages: matterRows("MatterMessage"),
    timeline_events: matterRows("MatterTimelineEvent"),
    documents: matterRows("MatterDocument"),
    members: matterRows("MatterMember"),
    absences: matterRows("MatterAbsence"),
    time_entries: financeRows("TimeEntry"),
    wip: financeRows("WipItem"),
    invoices: financeRows("Invoice"),
    payments: financeRows("Payment"),
    granted_scopes: grantedScopes,
    now,
    timezone: timeZone,
  });
}

export function readMatterFollowUpSavedView({
  listSavedView,
  canReadMatter,
  tenantId,
  view,
  ownerId,
  matterId,
  asOf,
} = {}) {
  const readable = requireMatterReader(canReadMatter);
  const requestedView = view ?? "today";
  const items = listSavedView({
    tenant_id: tenantId,
    view: mappedFollowUpView(requestedView),
    owner_id: ownerId,
    matter_id: matterId,
    now: asOf,
  }).filter((item) => readable(item.matter_id));
  return { items, count: items.length, view: requestedView };
}

export function readMatterCloseoutBlockers({
  matterRepository,
  financeRepository,
  arRepository = financeRepository,
  canReadMatter,
  tenantId,
  matterId,
  asOfDate,
} = {}) {
  const readable = requireMatterReader(canReadMatter);
  const matterRows = (modelType) => matterRepository
    .list({ tenant_id: tenantId, matter_id: matterId, model_type: modelType })
    .filter((record) => readable(record.matter_id ?? matterId));
  const financeRows = (modelType) => financeRepository.list({
    tenant_id: tenantId,
    matter_id: matterId,
    model_type: modelType,
  });
  const ar = queryMatterArQueue({
    repository: arRepository,
    tenant_id: tenantId,
    matter_id: matterId,
    as_of_date: asOfDate,
  }).rows.map((row) => ({
    ...row,
    tenant_id: tenantId,
    resource_id: row.invoice_id,
    outstanding_amount: row.balance,
    status: row.lifecycle_status,
  }));
  return listCloseoutBlockers({
    tenant_id: tenantId,
    matter_id: matterId,
    tasks: matterRows("MatterTask"),
    calendar_events: matterRows("MatterCalendarEvent"),
    time_entries: financeRows("TimeEntry"),
    wip: financeRows("WipItem"),
    wip_snapshots: financeRows("WipSnapshot"),
    prebills: financeRows("PreBill"),
    invoices: financeRows("Invoice"),
    payment_allocations: financeRows("PaymentAllocation"),
    ar,
  });
}

export function resolveMatterCloseoutBlockers({
  matterRepository,
  financeRepository,
  tenantId,
  matterId,
  asOfDate,
} = {}) {
  const tenant = requiredString(tenantId, "tenantId");
  const matter = requiredString(matterId, "matterId");
  if (!matterRepository?.list || !financeRepository?.list) {
    throw new TypeError("Matter and Finance repositories are required for closeout");
  }
  return readMatterCloseoutBlockers({
    matterRepository,
    financeRepository,
    arRepository: financeRepository,
    canReadMatter: () => true,
    tenantId: tenant,
    matterId: matter,
    asOfDate,
  });
}

export function readMatterWeeklyOperationsReport({ operations } = {}) {
  return buildWeeklyOperationsReport({ today_operations: operations });
}

export function readMatterWeeklyOperationsCsv({ operations, includeBom = false } = {}) {
  const report = readMatterWeeklyOperationsReport({ operations });
  return {
    report,
    rawBody: renderWeeklyOperationsCsv(report, { include_bom: includeBom }),
    rowCount: report.questions.length + 1,
  };
}
