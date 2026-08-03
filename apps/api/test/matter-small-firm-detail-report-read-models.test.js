import assert from "node:assert/strict";
import test from "node:test";
import {
  readMatterCloseoutBlockers,
  readMatterDetail,
  readMatterFollowUpSavedView,
  readMatterWeeklyOperationsCsv,
  resolveMatterCloseoutBlockers,
} from "../src/matter-small-firm-detail-report-read-models.js";
import { resolveMatterCloseoutBlockers as apiCloseoutResolver } from "../src/matter-small-firm-api.js";

const TENANT = "tenant_rfd_tuw_027";
const MATTER = "matter_rfd_tuw_027";
const NOW = "2026-07-30T02:00:00.000Z";

function repository(records = []) {
  return Object.freeze({
    list(query = {}) {
      return records.filter((record) => Object.entries(query).every(([key, value]) => record[key] === value));
    },
    get(query = {}) {
      return records.find((record) => Object.entries(query).every(([key, value]) => record[key] === value));
    },
  });
}

test("RFD-TUW-027 detail assembly preserves exact-Matter scope and timeline order", () => {
  const matterRepository = repository([
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      client_id: "client_canonical",
      matter_code: "RFD-027",
      title: "Read model extraction",
      status: "open",
      responsible_lawyer: "owner_027",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: MATTER,
      task_id: "task_visible",
      title: "Visible task",
      status: "todo",
      assigned_to: "owner_027",
      due_at: "2026-07-31T01:00:00.000Z",
    },
    {
      model_type: "MatterActivity",
      tenant_id: TENANT,
      matter_id: MATTER,
      activity_id: "activity_older",
      title: "Older activity",
      occurred_at: "2026-07-29T01:00:00.000Z",
    },
    {
      model_type: "MatterTimelineEvent",
      tenant_id: TENANT,
      matter_id: MATTER,
      event_id: "timeline_newer",
      title: "Newer timeline event",
      type: "matter.updated",
      occurred_at: "2026-07-30T01:00:00.000Z",
    },
  ]);
  const financeRepository = repository([{
    model_type: "TimeEntry",
    resource_id: "time_visible",
    tenant_id: TENANT,
    matter_id: MATTER,
    time_entry_id: "time_visible",
    work_date: "2026-07-30",
    duration_minutes: 30,
    status: "approved",
  }]);
  const readable = (matterId) => matterId === MATTER;
  const detail = readMatterDetail({
    matterRepository,
    financeRepository,
    canReadMatter: readable,
    tenantId: TENANT,
    matterId: MATTER,
    grantedScopes: [],
    now: NOW,
  });

  assert.equal(detail.matter_id, MATTER);
  assert.deepEqual(detail.tab_data.work_deadlines.map(({ source_id }) => source_id), ["task_visible"]);
  assert.deepEqual(
    detail.tab_data.contact_history.map(({ timeline_id }) => timeline_id),
    ["timeline:timeline_newer", "activity:activity_older"],
  );
  assert.deepEqual(detail.tab_data.time_billing.map(({ source_id }) => source_id), ["time_visible"]);
  const trimmed = readMatterDetail({
    matterRepository,
    financeRepository,
    canReadMatter: () => false,
    tenantId: TENANT,
    matterId: MATTER,
    now: NOW,
  });
  assert.deepEqual(trimmed.tab_data.work_deadlines, []);
  assert.deepEqual(trimmed.tab_data.contact_history, []);
});

test("RFD-TUW-027 saved follow-up views map aliases and trim unreadable Matters", () => {
  let received;
  const result = readMatterFollowUpSavedView({
    listSavedView(options) {
      received = options;
      return [
        { followup_id: "followup_visible", matter_id: MATTER, client_id: "client_canonical" },
        { followup_id: "followup_hidden", matter_id: "matter_hidden", client_id: "client_hidden" },
      ];
    },
    canReadMatter: (matterId) => matterId === MATTER,
    tenantId: TENANT,
    view: "today",
    ownerId: "owner_027",
    matterId: MATTER,
    asOf: NOW,
  });

  assert.deepEqual(received, {
    tenant_id: TENANT,
    view: "due_today",
    owner_id: "owner_027",
    matter_id: MATTER,
    now: NOW,
  });
  assert.deepEqual(result.items, [{
    followup_id: "followup_visible",
    matter_id: MATTER,
    client_id: "client_canonical",
  }]);
  assert.equal(result.count, 1);
  assert.equal(result.view, "today");
});

test("RFD-TUW-027 closeout uses one assembly for API reads and the legacy close guard", () => {
  const matterRepository = repository([
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: MATTER,
      task_id: "task_open",
      title: "Open task",
      status: "todo",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: MATTER,
      event_id: "deadline_open",
      title: "Open deadline",
      status: "scheduled",
      starts_at: "2026-08-01T00:00:00.000Z",
    },
  ]);
  const financeRepository = repository([
    {
      model_type: "TimeEntry",
      tenant_id: TENANT,
      matter_id: MATTER,
      time_entry_id: "time_unbilled",
      description: "Unbilled time",
      billable: true,
      status: "approved",
      amount: 200000,
      currency: "KRW",
    },
    {
      model_type: "Invoice",
      tenant_id: TENANT,
      matter_id: MATTER,
      invoice_id: "invoice_open",
      invoice_number: "INV-027",
      billing_client_party_id: "client_canonical",
      status: "sent",
      amount_due: 300000,
      amount_paid: 0,
      due_date: "2026-07-01",
      currency: "KRW",
    },
  ]);
  const options = {
    matterRepository,
    financeRepository,
    arRepository: financeRepository,
    tenantId: TENANT,
    matterId: MATTER,
    asOfDate: "2026-07-30",
    canReadMatter: (matterId) => matterId === MATTER,
  };
  const blockers = readMatterCloseoutBlockers(options);
  const legacy = resolveMatterCloseoutBlockers({
    matterRepository,
    financeRepository,
    tenantId: TENANT,
    matterId: MATTER,
    asOfDate: "2026-07-30",
  });

  assert.deepEqual(blockers.map(({ blocker_id }) => blocker_id), [
    "open_task:task_open",
    "open_deadline:deadline_open",
    "unbilled_time:time_unbilled",
    "outstanding_receivable:invoice_open",
  ]);
  assert.deepEqual(legacy, blockers);
  assert.equal(apiCloseoutResolver, resolveMatterCloseoutBlockers);
});

test("RFD-TUW-027 weekly CSV preserves columns, question order, totals, CRLF, and BOM", () => {
  const lane = (id, items) => ({
    id,
    count: items.length,
    items,
    route: { section: `section-${id}`, filter: `filter-${id}` },
  });
  const operations = {
    tenant_id: TENANT,
    as_of: NOW,
    timezone: "Asia/Seoul",
    by_id: {
      overdue: lane("overdue", [{ item_id: "overdue_1", amount: null, currency: null }]),
      unassigned: lane("unassigned", []),
      our_response: lane("our_response", [{ item_id: "followup_1", amount: null, currency: null }]),
      missing_time: lane("missing_time", []),
      wip: lane("wip", [{ item_id: "wip_1", amount: 200000, currency: "KRW" }]),
      ar: lane("ar", [{ item_id: "ar_1", amount: 300000, currency: "KRW" }]),
    },
  };
  const result = readMatterWeeklyOperationsCsv({ operations, includeBom: true });
  const lines = result.rawBody.slice(1).trimEnd().split("\r\n");

  assert.equal(result.rawBody.startsWith("\uFEFF"), true);
  assert.equal(result.rawBody.endsWith("\r\n"), true);
  assert.equal(lines[0], "row_type,question_id,question,count,amount,currency,amounts_by_currency,section,filter");
  assert.deepEqual(result.report.questions.map(({ id }) => id), [
    "overdue_deadlines",
    "unassigned_work",
    "client_follow_up",
    "missing_time",
    "pending_wip",
    "receivables",
  ]);
  assert.deepEqual(result.report.totals, {
    item_count: 4,
    amount: 500000,
    currency: "KRW",
    amounts_by_currency: { KRW: 500000 },
  });
  assert.equal(result.rowCount, 7);
  assert.equal(lines.at(-1), "total,TOTAL,합계,4,500000,KRW,KRW:500000,,");
});
