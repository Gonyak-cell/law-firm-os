import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleMatterSmallFirmApiRequest } from "../../../apps/api/src/matter-small-firm-api.js";
import { createMatterSmallFirmRuntimeContext } from "../../../apps/api/src/matter-small-firm-runtime-context.js";
import { createFinanceRepository } from "../../billing/src/index.js";
import {
  createMatterRepository,
  createSmallFirmMatterWorkService,
} from "../src/index.js";

const fixture = JSON.parse(readFileSync(
  new URL("./fixtures/matter-small-firm-foundation.fixture.json", import.meta.url),
  "utf8",
));

const TENANT = fixture.tenant_id;
const AS_OF = fixture.as_of;
const TIME_ZONE = fixture.timezone;
const WEEK_START = "2026-07-27";
const ACTOR = "person-01";
const COMMON_QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "tuw_01_foundation_behavioral",
  audit_hint_ref: "tuw_01_foundation_behavioral",
  as_of: AS_OF,
  time_zone: TIME_ZONE,
});
const READ_CONTEXT = Object.freeze({
  principal: Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: Object.freeze(["administrator"]) }),
  rules: Object.freeze([{ id: "allow_foundation_reads", effect: "allow", action: "*" }]),
  object_acl: Object.freeze([]),
});

function padded(value, width) {
  return String(value).padStart(width, "0");
}

function ids(prefix, count, width = 3) {
  return Array.from({ length: count }, (_, index) => `${prefix}${padded(index + 1, width)}`);
}

const EXPECTED_IDS = Object.freeze({
  people: ids("person-", 10, 2),
  matters: ids("matter-", 12),
  tasks: ids("task-", 28),
  calendar_events: ids("event-", 8),
  followups: ids("followup-", 6),
  time_entries: ids("time-", 25),
  wip: ids("wip-", 4),
  invoices: ids("invoice-", 3),
  receivables: ids("ar-", 3),
});

const REPOSITORY_SPECS = Object.freeze([
  Object.freeze({ name: "people", repository: "matter", model_type: "MatterPerson", id_field: "person_id" }),
  Object.freeze({ name: "matters", repository: "matter", model_type: "Matter", id_field: "matter_id" }),
  Object.freeze({ name: "tasks", repository: "matter", model_type: "MatterTask", id_field: "task_id" }),
  Object.freeze({ name: "calendar_events", repository: "matter", model_type: "MatterCalendarEvent", id_field: "event_id" }),
  Object.freeze({ name: "followups", repository: "matter", model_type: "MatterFollowUp", id_field: "followup_id" }),
  Object.freeze({ name: "time_entries", repository: "finance", model_type: "TimeEntry", id_field: "time_entry_id" }),
  Object.freeze({ name: "wip", repository: "finance", model_type: "WipItem", id_field: "wip_item_id" }),
  Object.freeze({ name: "invoices", repository: "finance", model_type: "Invoice", id_field: "invoice_id" }),
  Object.freeze({ name: "receivables", repository: "finance", model_type: "Receivable", id_field: "receivable_id" }),
]);

function matterStatus(status) {
  return {
    active: "open",
    on_hold: "paused",
  }[status] ?? status;
}

function taskStatus(status) {
  return {
    open: "todo",
    waiting: "todo",
    archived: "done",
  }[status] ?? status;
}

function matterSeeds() {
  return [
    ...fixture.people.map((person) => ({
      model_type: "MatterPerson",
      tenant_id: TENANT,
      resource_id: person.person_id,
      ...person,
    })),
    ...fixture.matters.map((matter) => ({
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: matter.matter_id,
      client_id: `client:${matter.matter_id}`,
      title: matter.title,
      matter_code: matter.matter_code,
      status: matterStatus(matter.status),
      owner_user_id: matter.owner_id,
      backup_user_id: matter.backup_user_id,
      responsible_lawyer: matter.owner_id,
      created_by: "fixture",
      created_at: "2026-07-01T00:00:00.000Z",
      permission_envelope_id: `permission:${matter.matter_id}`,
      audit_trace_id: `audit:${matter.matter_id}`,
    })),
    ...fixture.tasks.map((task) => ({
      model_type: "MatterTask",
      tenant_id: TENANT,
      task_id: task.task_id,
      matter_id: task.matter_id,
      title: task.title,
      status: taskStatus(task.status),
      created_by: "fixture",
      assigned_to: task.owner_id,
      backup_user_id: task.backup_user_id,
      wait_state: task.wait_state ?? null,
      blocked_reason: task.blocked_reason ?? null,
      due_at: task.due_at,
      completed_at: task.completed_at ?? null,
      archived_at: task.archived_at ?? null,
      source_ref: task.source_ref,
    })),
    ...fixture.calendar_events.map((event) => ({
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      event_id: event.event_id,
      matter_id: event.matter_id,
      title: event.title,
      status: "scheduled",
      starts_at: event.starts_at,
      deadline_type: event.kind,
      source_ref: `fixture:${event.event_id}`,
    })),
    ...fixture.followups.map((followup) => ({
      model_type: "MatterFollowUp",
      tenant_id: TENANT,
      resource_id: followup.followup_id,
      followup_id: followup.followup_id,
      matter_id: followup.matter_id,
      title: followup.title,
      queue: followup.queue,
      waiting_on: followup.queue,
      status: followup.queue === "done" ? "done" : followup.queue === "snoozed" ? "snoozed" : "open",
      owner_id: followup.owner_id,
      next_action_at: followup.next_action_at ?? null,
      snoozed_until: followup.snoozed_until ?? null,
    })),
  ];
}

function financeSeeds() {
  return [
    ...fixture.time_entries.map((entry) => ({
      model_type: "TimeEntry",
      tenant_id: TENANT,
      resource_id: entry.time_entry_id,
      time_entry_id: entry.time_entry_id,
      matter_id: entry.matter_id,
      actor_id: entry.person_id,
      work_date: entry.entry_date,
      minutes: entry.minutes,
      billable: entry.billable,
      locked: entry.locked,
      status: entry.locked ? "locked" : "approved",
      approved_for_wip: true,
    })),
    ...fixture.wip.map((item) => ({
      model_type: "WipItem",
      tenant_id: TENANT,
      resource_id: item.wip_id,
      wip_item_id: item.wip_id,
      matter_id: item.matter_id,
      source_model_type: "TimeEntry",
      source_id: item.source_time_entry_ids[0],
      amount: item.amount,
      currency: item.currency,
      status: item.status,
    })),
    ...fixture.invoices.map((invoice) => ({
      model_type: "Invoice",
      tenant_id: TENANT,
      resource_id: invoice.invoice_id,
      invoice_id: invoice.invoice_id,
      invoice_number: invoice.invoice_id.toUpperCase(),
      matter_id: invoice.matter_id,
      billing_client_party_id: `client:${invoice.matter_id}`,
      amount_due: invoice.total_amount,
      amount_paid: invoice.paid_amount ?? 0,
      currency: invoice.currency,
      status: invoice.status,
      lifecycle_status: invoice.status,
      due_date: invoice.due_at.slice(0, 10),
    })),
    ...fixture.receivables.map((receivable) => ({
      model_type: "Receivable",
      tenant_id: TENANT,
      resource_id: receivable.receivable_id,
      receivable_id: receivable.receivable_id,
      invoice_id: receivable.invoice_id,
      matter_id: receivable.matter_id,
      balance: receivable.balance,
      currency: receivable.currency,
      age_days: receivable.age_days,
      bucket: receivable.bucket,
    })),
  ];
}

function createHarness(label) {
  const directory = mkdtempSync(join(tmpdir(), `lawos-${label}-`));
  const matterRepository = createMatterRepository({
    filePath: join(directory, "matter.json"),
    seedRecords: matterSeeds(),
  });
  const financeRepository = createFinanceRepository({
    filePath: join(directory, "finance.json"),
    seedRecords: financeSeeds(),
  });
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository,
    financeRepository,
    now: () => new Date(AS_OF),
  });
  return Object.freeze({ directory, matterRepository, financeRepository, runtime });
}

function closeHarness(harness) {
  harness.matterRepository.close();
  harness.financeRepository.close();
  rmSync(harness.directory, { recursive: true, force: true });
}

function canonicalSnapshot(harness) {
  return Object.fromEntries(REPOSITORY_SPECS.map((spec) => {
    const repository = harness[`${spec.repository}Repository`];
    const rows = repository.list({ tenant_id: TENANT, model_type: spec.model_type });
    return [spec.name, {
      count: rows.length,
      ids: rows.map((row) => row[spec.id_field] ?? row.resource_id),
    }];
  }));
}

function expectedSnapshot() {
  return Object.fromEntries(Object.entries(EXPECTED_IDS).map(([name, expected]) => [name, {
    count: expected.length,
    ids: expected,
  }]));
}

function workProjection(harness) {
  const work = createSmallFirmMatterWorkService({
    repository: harness.matterRepository,
    clock: () => AS_OF,
  });
  const queue = work.listTaskQueue({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  });
  const overdue = work.listTaskQueue({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
    saved_view: "overdue",
  });
  const week = work.getWeekSchedule({
    tenant_id: TENANT,
    week_start: WEEK_START,
    time_zone: TIME_ZONE,
  });
  return {
    queue: {
      summary: queue.summary,
      overdue_ids: overdue.items.map((item) => item.id),
      today_ids: queue.items.filter((item) => item.due_bucket === "due_today").map((item) => item.id),
    },
    week: {
      week_start: week.week_start,
      week_end: week.week_end,
      count: week.count,
      ids: week.items.map((item) => item.id),
    },
  };
}

async function todayRead(harness, requestId) {
  return handleMatterSmallFirmApiRequest({
    pathname: "/api/matter/ops/today",
    method: "GET",
    query: COMMON_QUERY,
    body: {},
    context: READ_CONTEXT,
    requestId,
    runtime: harness.runtime,
  });
}

test("[TUW-01] seeds two repository-backed runtimes with stable canonical IDs and projections", async (t) => {
  const first = createHarness("matter-foundation-first");
  const second = createHarness("matter-foundation-second");
  t.after(() => {
    closeHarness(first);
    closeHarness(second);
  });

  const firstSnapshot = canonicalSnapshot(first);
  const secondSnapshot = canonicalSnapshot(second);
  assert.deepEqual(firstSnapshot, expectedSnapshot());
  assert.deepEqual(secondSnapshot, expectedSnapshot());
  assert.deepEqual(firstSnapshot, secondSnapshot);
  for (const value of Object.values(firstSnapshot)) {
    assert.equal(new Set(value.ids).size, value.count);
  }

  const firstProjection = workProjection(first);
  const secondProjection = workProjection(second);
  assert.deepEqual(firstProjection, secondProjection);
  assert.deepEqual(firstProjection.queue, {
    summary: { overdue: 3, due_today: 4, upcoming: 9, undated: 0 },
    overdue_ids: ["task-001", "task-002", "task-003"],
    today_ids: ["task-007", "task-004", "task-005", "task-006"],
  });
  assert.deepEqual(firstProjection.week, {
    week_start: WEEK_START,
    week_end: "2026-08-02",
    count: 18,
    ids: [
      "task-001",
      "task-002",
      "task-003",
      "event-001",
      "task-007",
      "task-004",
      "task-005",
      "task-006",
      "event-002",
      "event-003",
      "event-004",
      "task-008",
      "task-013",
      "task-015",
      "event-005",
      "task-016",
      "task-009",
      "task-014",
    ],
  });

  const today = await todayRead(first, "tuw-01-today");
  assert.equal(today.status, 200);
  assert.equal(today.body.item.tenant_id, TENANT);
  assert.deepEqual(today.body.item.by_id.overdue.items.map((item) => item.item_id), [
    "task-001",
    "task-002",
    "task-003",
  ]);
  assert.deepEqual(today.body.item.by_id.due_today.items.map((item) => item.item_id), [
    "task-007",
    "task-004",
    "task-005",
    "task-006",
  ]);
});

test("[TUW-01] injected repository failure returns the common explicit 503 error state", async (t) => {
  const healthy = createHarness("matter-foundation-error");
  t.after(() => closeHarness(healthy));
  const brokenRepository = Object.freeze({
    ...healthy.matterRepository,
    list() {
      throw new Error("simulated Matter repository outage");
    },
  });
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository: brokenRepository,
    financeRepository: healthy.financeRepository,
    now: () => new Date(AS_OF),
  });
  const result = await handleMatterSmallFirmApiRequest({
    pathname: "/api/matter/ops/today",
    method: "GET",
    query: COMMON_QUERY,
    body: {},
    context: READ_CONTEXT,
    requestId: "tuw-01-repository-error",
    runtime,
  });

  assert.equal(result.status, 503);
  assert.equal(result.body.ui_state, "error");
  assert.deepEqual(result.body.items, []);
});
