import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  readMatterCalendar,
  readMatterTaskQueue,
  readMatterTodayOperations,
} from "../src/matter-small-firm-read-models.js";
import {
  assertFinanceAccessState,
  assertPopulatedFinanceToday,
  createRfd026TodayFinanceFixture,
  RFD026_NOW,
  RFD026_TENANT,
} from "./support/matter-small-firm-read-model-fixture.js";

let financeFixture;

before(() => {
  financeFixture = createRfd026TodayFinanceFixture();
});

after(() => {
  financeFixture.close();
});

test("RFD-TUW-026 Today preserves denied Finance without reading Finance rows", () => {
  const unreadable = Object.freeze({
    list() {
      throw new Error("finance repository must not be read when finance is denied");
    },
  });
  const result = readMatterTodayOperations({
    tenantId: RFD026_TENANT,
    asOf: RFD026_NOW,
    asOfDate: "2026-07-30",
    tasks: [{
      tenant_id: RFD026_TENANT,
      matter_id: "matter_visible",
      task_id: "task_due_today",
      title: "File response",
      status: "todo",
      assigned_to: "user_owner",
      due_at: "2026-07-30T03:00:00.000Z",
    }],
    followUps: [],
    financeAllowed: false,
    financeRepository: unreadable,
    wipRepository: unreadable,
    arRepository: unreadable,
  });

  assert.equal(result.finance_state, "denied");
  assert.deepEqual(result.operations.by_id.due_today.items.map(({ item_id }) => item_id), [
    "task_due_today",
  ]);
  assert.equal(result.operations.by_id.missing_time.count, 0);
  assert.equal(result.operations.by_id.wip.count, 0);
  assert.equal(result.operations.by_id.ar.count, 0);
});

test("RFD-TUW-026 task queue preserves order while trimming unreadable Matters", () => {
  let input;
  const result = readMatterTaskQueue({
    listTaskQueue(options) {
      input = options;
      return {
        items: [
          { id: "task_visible", matter_id: "matter_visible", due_bucket: "overdue" },
          { id: "task_hidden", matter_id: "matter_hidden", due_bucket: "due_today" },
        ],
        include_terminal: false,
        as_of: options.as_of,
        time_zone: options.time_zone,
      };
    },
    canReadMatter: (matterId) => matterId === "matter_visible",
    tenantId: RFD026_TENANT,
    actorId: "user_owner",
    clock: () => RFD026_NOW,
  });

  assert.equal(input.saved_view, "my_work");
  assert.equal(input.as_of, RFD026_NOW);
  assert.deepEqual(result.items.map(({ id }) => id), ["task_visible"]);
  assert.deepEqual(result.summary, {
    overdue: 1,
    due_today: 0,
    upcoming: 0,
    undated: 0,
  });
  assert.equal(result.count, 1);
});

test("RFD-TUW-026 calendar preserves order while trimming unreadable Matters", () => {
  const result = readMatterCalendar({
    getWeekSchedule() {
      return {
        items: [
          { id: "task_visible", matter_id: "matter_visible" },
          { id: "event_hidden", matter_id: "matter_hidden" },
          { id: "event_visible", matter_id: "matter_visible" },
        ],
        week_start: "2026-07-27",
        week_end: "2026-08-02",
        time_zone: "Asia/Seoul",
      };
    },
    canReadMatter: (matterId) => matterId === "matter_visible",
    tenantId: RFD026_TENANT,
    weekStart: "2026-07-27",
  });

  assert.deepEqual(result.items.map(({ id }) => id), ["task_visible", "event_visible"]);
  assert.equal(result.count, 2);
  assert.equal(result.week_start, "2026-07-27");
  assert.equal(result.week_end, "2026-08-02");
});

test("RFD-TUW-026 Today maps allowed populated Finance through the public API", async () => {
  const response = await financeFixture.callToday({
    requestId: "req_rfd026_finance_allowed",
  });

  assertPopulatedFinanceToday(response);
});

test("RFD-TUW-026 Today distinguishes denied populated Finance from allowed empty Finance", async () => {
  const deniedPopulated = await financeFixture.callToday({
    requestId: "req_rfd026_finance_denied",
    access: "denyFinance",
  });
  const allowedEmpty = await financeFixture.callToday({
    requestId: "req_rfd026_finance_allowed_empty",
    data: "empty",
  });

  assertFinanceAccessState(deniedPopulated, "denied");
  assertFinanceAccessState(allowedEmpty, "populated");
});
