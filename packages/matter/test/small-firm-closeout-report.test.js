import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  approvePreBillWithoutAdjustment,
  createFinanceRepository,
  createInvoiceFromPreBill,
  createMatterPreBillFromWip,
  generateWipFromApprovedItems,
} from "../../billing/src/index.js";
import {
  approveTimeEntryForWip,
  createFeeArrangement,
  createRateCard,
  createTimeEntry,
  lockTimeWeek,
  submitTimeWeek,
} from "../../time-expense/src/index.js";
import {
  applyMatterPayment,
  importPayment,
} from "../../payments/src/index.js";
import { closeMatter } from "../src/closing-service.js";
import { createMatterRepository } from "../src/repository.js";
import {
  archiveMatter,
  buildTodayOperations,
  buildWeeklyOperationsReport,
  listArchivedMatters,
  listCloseoutBlockers,
  renderWeeklyOperationsCsv,
  restoreArchivedMatter,
} from "../src/small-firm-ops-service.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/matter-small-firm-foundation.fixture.json", import.meta.url), "utf8"),
);
const tenant_id = fixture.tenant_id;
const now = fixture.as_of;
const timezone = fixture.timezone;

function scoped(row) {
  return { tenant_id, ...row };
}

function durableRepository(prefix = "lawos-matter-ops-") {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  return createMatterRepository({ filePath: join(directory, "matter.json") });
}

function missingTimeRows() {
  return fixture.seed_contract.time_contract.missing_person_ids.map((personId) => {
    const person = fixture.people.find((row) => row.person_id === personId);
    return scoped({
      id: `missing-time-${personId}`,
      person_id: personId,
      user_display_name: person.display_name,
      title: `${person.display_name} 시간 누락`,
      status: "missing",
      missing: true,
    });
  });
}

function buildFixtureToday() {
  return buildTodayOperations({
    tenant_id,
    now,
    timezone,
    tasks: fixture.tasks.map(scoped),
    calendar_events: fixture.calendar_events.map(scoped),
    follow_ups: fixture.followups.map(scoped),
    wip: fixture.wip.map(scoped),
    receivables: fixture.receivables.map(scoped),
    projections: { missing_time: missingTimeRows() },
  });
}

function closeoutFinanceRows(repository, matter_id, overrides = {}) {
  const rows = (model_type) => repository.list({ tenant_id, matter_id, model_type });
  return {
    tenant_id,
    matter_id,
    time_entries: rows("TimeEntry"),
    wip: rows("WipItem"),
    wip_snapshots: rows("WipSnapshot"),
    prebills: rows("PreBill"),
    invoices: rows("Invoice"),
    payment_allocations: rows("PaymentAllocation"),
    ...overrides,
  };
}

test("[TUW-37] 오늘 운영 read model은 8개 운영 lane과 canonical 저장 보기 경로를 한 번에 만든다", () => {
  const operations = buildFixtureToday();

  assert.deepEqual(
    operations.lanes.map((lane) => lane.id),
    ["overdue", "due_today", "our_response", "blocked", "unassigned", "missing_time", "wip", "ar"],
  );
  assert.deepEqual(
    Object.fromEntries(operations.lanes.map((lane) => [lane.id, lane.count])),
    {
      overdue: 3,
      due_today: 4,
      our_response: 2,
      blocked: 2,
      unassigned: 2,
      missing_time: 3,
      wip: 4,
      ar: 3,
    },
  );
  assert.equal(operations.by_id.awaiting_our_response, operations.by_id.our_response);
  for (const lane of operations.lanes) {
    assert.equal(lane.count, lane.items.length);
    assert.match(lane.route.section, /^matter-/);
    assert.match(lane.route.href, new RegExp(`filter=${encodeURIComponent(lane.route.filter)}`));
  }
});

test("[TUW-38] 종결 blocker는 열린 업무·기한·미청구 시간·미수금을 actionable 행으로 반환한다", () => {
  const matter_id = "matter-closeout";
  const blockers = listCloseoutBlockers({
    tenant_id,
    matter_id,
    tasks: [
      scoped({ task_id: "task-open", matter_id, title: "열린 업무", status: "todo" }),
      scoped({ task_id: "task-done", matter_id, title: "완료 업무", status: "done" }),
    ],
    calendar_events: [
      scoped({ event_id: "deadline-open", matter_id, title: "열린 기한", status: "scheduled", starts_at: "2026-08-01T00:00:00.000Z" }),
      scoped({ event_id: "deadline-done", matter_id, title: "완료 기한", status: "completed", starts_at: "2026-07-01T00:00:00.000Z" }),
    ],
    time_entries: [
      scoped({ time_entry_id: "time-unbilled", matter_id, description: "미청구 시간", billable: true, status: "approved", amount: 200000, currency: "KRW" }),
    ],
    receivables: [
      scoped({ receivable_id: "ar-open", matter_id, title: "미수금", status: "outstanding", balance: 300000, currency: "KRW" }),
      scoped({ receivable_id: "ar-paid", matter_id, title: "수금 완료", status: "paid", balance: 0, currency: "KRW" }),
    ],
  });

  assert.deepEqual(
    blockers.map((blocker) => blocker.blocker_type),
    ["open_task", "open_deadline", "unbilled_time", "outstanding_receivable"],
  );
  assert.ok(blockers.every((blocker) => blocker.action.href.includes(blocker.source_id)));
  const blocked = closeMatter({
    repository: { update: () => assert.fail("blocked close must not update Matter") },
    matter: scoped({ matter_id, status: "closing" }),
    blockers,
    actor_id: "person-01",
  });
  assert.equal(blocked.outcome, "blocked");

  let persistedStatus = "closing";
  const closed = closeMatter({
    repository: {
      update(_ref, patch) {
        persistedStatus = patch.status;
        return scoped({ matter_id, ...patch });
      },
    },
    matter: scoped({ matter_id, status: "closing" }),
    blockers: [],
    actor_id: "person-01",
  });
  assert.equal(closed.outcome, "closed");
  assert.equal(persistedStatus, "closed");
});

test("[H6] 실제 TimeEntry → WIP → PreBill → Invoice → Payment 계보만 완납 종결을 허용한다", () => {
  const matter_id = "matter-closeout-lineage";
  const actor_id = "person-closeout-billing";
  const finance = createFinanceRepository();
  const rateCard = createRateCard({
    repository: finance,
    rate_card: {
      rate_card_id: "rate-closeout-lineage",
      tenant_id,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 100_000 }],
    },
    actor_id,
    idempotency_key: "closeout-rate-card",
  }).rate_card;
  createFeeArrangement({
    repository: finance,
    fee_arrangement: {
      fee_arrangement_id: "fee-closeout-lineage",
      tenant_id,
      matter_id,
      billing_profile_id: "billing-profile-closeout-lineage",
      rate_card_id: rateCard.rate_card_id,
      type: "hourly",
    },
    rate_card: rateCard,
    actor_id,
    idempotency_key: "closeout-fee-arrangement",
  });
  createTimeEntry({
    repository: finance,
    time_entry: {
      time_entry_id: "time-closeout-lineage",
      tenant_id,
      matter_id,
      role_id: "partner",
      work_date: "2026-07-21",
      narrative: "종결 전 최종 업무",
      duration_minutes: 60,
      billable: true,
    },
    actor_id,
    idempotency_key: "closeout-time-create",
  });
  approveTimeEntryForWip({
    repository: finance,
    tenant_id,
    time_entry_id: "time-closeout-lineage",
    actor_id,
    idempotency_key: "closeout-time-approve",
  });
  submitTimeWeek({
    repository: finance,
    tenant_id,
    actor_id,
    time_entry_ids: ["time-closeout-lineage"],
    week_start: "2026-07-20",
    idempotency_key: "closeout-time-submit",
    now: "2026-07-25T09:00:00.000Z",
  });
  lockTimeWeek({
    repository: finance,
    tenant_id,
    actor_id,
    time_entry_ids: ["time-closeout-lineage"],
    week_start: "2026-07-20",
    idempotency_key: "closeout-time-lock",
    now: "2026-07-25T10:00:00.000Z",
  });

  assert.deepEqual(
    listCloseoutBlockers(closeoutFinanceRows(finance, matter_id)).map(({ blocker_type }) => blocker_type),
    ["unbilled_time"],
  );

  const wip = generateWipFromApprovedItems({
    repository: finance,
    tenant_id,
    matter_id,
    source_items: [finance.get({
      tenant_id,
      model_type: "TimeEntry",
      time_entry_id: "time-closeout-lineage",
    })],
    fee_arrangement_id: "fee-closeout-lineage",
    actor_id,
    idempotency_key: "closeout-wip-generate",
  });
  const billing = createMatterPreBillFromWip({
    repository: finance,
    tenant_id,
    matter_id,
    wip_item_ids: wip.wip_items.map(({ wip_item_id }) => wip_item_id),
    wip_snapshot_id: "snapshot-closeout-lineage",
    prebill: {
      prebill_id: "prebill-closeout-lineage",
      partner_reviewer_id: actor_id,
      currency: "KRW",
    },
    actor_id,
    idempotency_key: "closeout-prebill-create",
  });
  const approved = approvePreBillWithoutAdjustment({
    repository: finance,
    tenant_id,
    prebill_id: billing.prebill.prebill_id,
    actor_id,
    idempotency_key: "closeout-prebill-approve",
  });
  assert.deepEqual(
    listCloseoutBlockers(closeoutFinanceRows(finance, matter_id)).map(({ blocker_type }) => blocker_type),
    ["unbilled_time", "unbilled_time"],
  );
  const issued = createInvoiceFromPreBill({
    repository: finance,
    invoice: {
      invoice_id: "invoice-closeout-lineage",
      tenant_id,
      matter_id,
      prebill_id: approved.prebill.prebill_id,
      billing_client_party_id: "client-closeout-lineage",
      currency: "KRW",
      issued_at: "2026-07-26T00:00:00.000Z",
    },
    actor_id,
    idempotency_key: "closeout-invoice-issue",
  });
  assert.equal(issued.invoice.amount_due, 100_000);

  const firstPayment = importPayment({
    repository: finance,
    payment: {
      payment_id: "payment-closeout-partial",
      tenant_id,
      matter_id,
      bank_reference: "bank:closeout:partial",
      amount: 40_000,
      currency: "KRW",
      received_at: "2026-07-27T00:00:00.000Z",
    },
    actor_id,
    idempotency_key: "closeout-payment-partial-import",
  }).payment;
  const partial = applyMatterPayment({
    repository: finance,
    tenant_id,
    matter_id,
    payment_id: firstPayment.payment_id,
    invoice_id: issued.invoice.invoice_id,
    payment_allocation_id: "allocation-closeout-partial",
    amount: 40_000,
    as_of_date: "2026-07-27",
    actor_id,
    idempotency_key: "closeout-payment-partial-apply",
  });
  assert.equal(partial.invoice.lifecycle_status, "partial");
  assert.deepEqual(
    listCloseoutBlockers(closeoutFinanceRows(finance, matter_id)).map(({ blocker_type }) => blocker_type),
    ["outstanding_receivable"],
  );

  const voidWithAllocation = listCloseoutBlockers(closeoutFinanceRows(finance, matter_id, {
    invoices: [{
      ...partial.invoice,
      status: "void",
      lifecycle_status: "void",
      void_reason_code: "historical_invalid_state",
    }],
  }));
  assert.deepEqual(
    voidWithAllocation.map(({ blocker_type }) => blocker_type),
    ["unbilled_time", "unbilled_time", "payment_allocation_problem"],
  );
  assert.equal(voidWithAllocation.at(-1).status, "void_invoice");

  const finalPayment = importPayment({
    repository: finance,
    payment: {
      payment_id: "payment-closeout-final",
      tenant_id,
      matter_id,
      bank_reference: "bank:closeout:final",
      amount: 60_000,
      currency: "KRW",
      received_at: "2026-07-28T00:00:00.000Z",
    },
    actor_id,
    idempotency_key: "closeout-payment-final-import",
  }).payment;
  const paid = applyMatterPayment({
    repository: finance,
    tenant_id,
    matter_id,
    payment_id: finalPayment.payment_id,
    invoice_id: issued.invoice.invoice_id,
    payment_allocation_id: "allocation-closeout-final",
    amount: 60_000,
    as_of_date: "2026-07-28",
    actor_id,
    idempotency_key: "closeout-payment-final-apply",
  });
  assert.equal(paid.invoice.lifecycle_status, "paid");
  const finalBlockers = listCloseoutBlockers(closeoutFinanceRows(finance, matter_id));
  assert.deepEqual(finalBlockers, []);

  const matters = createMatterRepository();
  const matter = matters.create({
    model_type: "Matter",
    tenant_id,
    matter_id,
    client_id: "client-closeout-lineage",
    title: "실제 청구 계보 종결 사건",
    status: "closing",
    created_by: actor_id,
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: "permission-closeout-lineage",
    audit_trace_id: "audit-closeout-lineage",
  });
  const closed = closeMatter({
    repository: matters,
    matter,
    blockers: finalBlockers,
    actor_id,
  });
  assert.equal(closed.outcome, "closed");
  assert.equal(closed.matter.status, "closed");
});

test("[TUW-39] 보관 저장 보기는 archived만 노출하고 restore를 audit과 timeline에 한 번 기록한다", () => {
  const archived = listArchivedMatters({
    tenant_id,
    matters: fixture.matters.map(scoped),
  });
  assert.deepEqual(archived.map((matter) => matter.matter_id), ["matter-012"]);
  assert.equal(archived[0].route.filter, "archived");
  assert.equal(archived[0].restore_action.target_status, "closed");

  const repository = durableRepository();
  repository.create({
    model_type: "Matter",
    tenant_id,
    matter_id: "matter-restore",
    client_id: "client-restore",
    title: "[QA] 복원할 보관 사건",
    status: "archived",
    pre_archive_status: "closed",
    archived_at: "2026-07-29T00:00:00.000Z",
    created_by: "person-01",
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: "permission-restore",
    audit_trace_id: "audit-restore",
  });
  assert.throws(
    () => restoreArchivedMatter({
      repository,
      tenant_id,
      matter_id: "matter-restore",
      actor_id: "person-01",
      target_status: "open",
      idempotency_key: "restore-invalid",
    }),
    /target_status must be closed/,
  );
  const command = {
    repository,
    tenant_id,
    matter_id: "matter-restore",
    actor_id: "person-01",
    idempotency_key: "restore-001",
    reason: "보관 사건 재검토",
    occurred_at: "2026-07-30T06:00:00.000Z",
  };
  const first = restoreArchivedMatter(command);
  const replay = restoreArchivedMatter(command);

  assert.equal(first.matter.status, "closed");
  assert.equal(first.matter.archived_at, null);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.listAudit({ tenant_id }).filter((event) => event.action === "matter.restore").length, 1);
  assert.equal(
    repository.list({ tenant_id, matter_id: "matter-restore", model_type: "MatterTimelineEvent" }).length,
    1,
  );
  assert.equal(listArchivedMatters({ tenant_id, repository }).length, 0);
});

test("[TUW-39][RF-11] closed Matter만 replay-safe하게 보관하고 같은 키의 다른 payload는 거부한다", () => {
  const repository = durableRepository();
  repository.create({
    model_type: "Matter",
    tenant_id,
    matter_id: "matter-archive",
    client_id: "client-archive",
    title: "[QA] 보관할 종결 사건",
    status: "closed",
    closed_at: "2026-07-29T00:00:00.000Z",
    created_by: "person-01",
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: "permission-archive",
    audit_trace_id: "audit-archive",
  });
  const command = {
    repository,
    tenant_id,
    matter_id: "matter-archive",
    actor_id: "person-01",
    idempotency_key: "archive-001",
    reason: "법정 보존기간 관리",
    occurred_at: "2026-07-30T05:00:00.000Z",
  };

  const first = archiveMatter(command);
  const replay = archiveMatter(command);
  const afterReplay = repository.snapshot();

  assert.equal(first.matter.status, "archived");
  assert.equal(first.matter.pre_archive_status, "closed");
  assert.equal(first.matter.archived_at, command.occurred_at);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.listAudit({ tenant_id }).filter((event) => event.action === "matter.archive").length, 1);
  assert.equal(
    repository.list({ tenant_id, matter_id: "matter-archive", model_type: "MatterTimelineEvent" }).length,
    1,
  );
  assert.equal(listArchivedMatters({ tenant_id, repository }).length, 1);
  assert.throws(
    () => archiveMatter({ ...command, reason: "같은 키의 다른 보관 사유" }),
    (error) => error.status === 409 && error.safe_error_code === "IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual(repository.snapshot(), afterReplay);
});

test("[TUW-39][RF-11] open/active 보관 요청과 repository 실패는 어떤 원장도 낙관적으로 바꾸지 않는다", () => {
  for (const { label, status } of [
    { label: "open", status: "open" },
    { label: "active", status: "opening" },
  ]) {
    const repository = durableRepository(`lawos-matter-archive-${label}-`);
    repository.create({
      model_type: "Matter",
      tenant_id,
      matter_id: `matter-archive-${label}`,
      client_id: `client-archive-${label}`,
      title: `[QA] ${label} 보관 거부`,
      status,
      created_by: "person-01",
      created_at: "2026-07-01T00:00:00.000Z",
      permission_envelope_id: `permission-archive-${label}`,
      audit_trace_id: `audit-archive-${label}`,
    });
    const before = repository.snapshot();

    assert.throws(
      () => archiveMatter({
        repository,
        tenant_id,
        matter_id: `matter-archive-${label}`,
        actor_id: "person-01",
        idempotency_key: `archive-reject-${label}`,
        reason: "종결 전 보관 시도",
        occurred_at: "2026-07-30T05:00:00.000Z",
      }),
      (error) =>
        error.status === 422
        && error.safe_error_code === "MATTER_ARCHIVE_REQUIRES_CLOSED",
    );
    assert.deepEqual(repository.snapshot(), before);
  }

  const repository = durableRepository("lawos-matter-archive-failure-");
  repository.create({
    model_type: "Matter",
    tenant_id,
    matter_id: "matter-archive-failure",
    client_id: "client-archive-failure",
    title: "[QA] 보관 저장 실패",
    status: "closed",
    created_by: "person-01",
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: "permission-archive-failure",
    audit_trace_id: "audit-archive-failure",
  });
  const beforeFailure = repository.snapshot();
  const failingRepository = {
    ...repository,
    transaction(execute) {
      return repository.transaction((transaction) => {
        execute(transaction);
        throw new Error("simulated archive repository failure");
      });
    },
  };

  assert.throws(
    () => archiveMatter({
      repository: failingRepository,
      tenant_id,
      matter_id: "matter-archive-failure",
      actor_id: "person-01",
      idempotency_key: "archive-repository-failure",
      reason: "저장 실패 검증",
      occurred_at: "2026-07-30T05:00:00.000Z",
    }),
    /simulated archive repository failure/,
  );
  assert.deepEqual(repository.snapshot(), beforeFailure);
  assert.equal(listArchivedMatters({ tenant_id, repository }).length, 0);
});

test("[TUW-40] 주간 운영 6개 질문과 CSV 행·합계는 오늘 read model을 그대로 재사용한다", () => {
  const today = buildFixtureToday();
  const report = buildWeeklyOperationsReport({ today_operations: today });
  const csv = renderWeeklyOperationsCsv(report);
  const lines = csv.trimEnd().split("\r\n");
  const rows = lines.slice(1).map((line) => line.split(","));

  assert.equal(report.question_count, 6);
  assert.deepEqual(
    report.questions.map((question) => [question.id, question.count]),
    [
      ["overdue_deadlines", 3],
      ["unassigned_work", 2],
      ["client_follow_up", 2],
      ["missing_time", 3],
      ["pending_wip", 4],
      ["receivables", 3],
    ],
  );
  assert.equal(report.totals.item_count, 17);
  assert.equal(report.totals.amount, 4_050_000);
  assert.equal(report.totals.currency, "KRW");
  assert.equal(report.source.separate_analytics_calculation_used, false);

  assert.equal(rows.length, report.question_count + 1);
  for (const [index, question] of report.questions.entries()) {
    assert.equal(rows[index][0], "question");
    assert.equal(rows[index][1], question.id);
    assert.equal(Number(rows[index][3]), question.count);
    assert.equal(rows[index][7], question.route.section);
    assert.equal(rows[index][8], question.route.filter);
  }
  const total = rows.at(-1);
  assert.equal(total[0], "total");
  assert.equal(total[1], "TOTAL");
  assert.equal(Number(total[3]), report.totals.item_count);
  assert.equal(Number(total[4]), report.totals.amount);
  assert.equal(total[5], report.totals.currency);
});

test("[BOUNDARY] operations and closeout projections reject every tenantless or cross-tenant row", () => {
  const matter_id = "matter-boundary";
  const excluded = (row) => [
    { ...row },
    { ...row, tenant_id: "tenant-other" },
  ];
  const operations = buildTodayOperations({
    tenant_id,
    now,
    timezone,
    tasks: excluded({
      task_id: "task-excluded",
      matter_id,
      title: "제외 업무",
      status: "blocked",
      due_at: "2026-07-29T09:00:00.000Z",
    }),
    follow_ups: excluded({
      follow_up_id: "followup-excluded",
      matter_id,
      title: "제외 후속",
      waiting_on: "firm",
      status: "open",
    }),
    wip: excluded({
      wip_id: "wip-excluded",
      matter_id,
      title: "제외 WIP",
      amount: 100_000,
      status: "pending",
    }),
    receivables: excluded({
      receivable_id: "ar-excluded",
      matter_id,
      title: "제외 미수금",
      balance: 100_000,
      status: "outstanding",
    }),
    projections: {
      missing_time: excluded({
        id: "time-gap-excluded",
        matter_id,
        title: "제외 시간 누락",
        missing: true,
      }),
    },
  });
  assert.ok(operations.lanes.every((lane) => lane.count === 0));

  const blockers = listCloseoutBlockers({
    tenant_id,
    matter_id,
    tasks: excluded({ task_id: "task-excluded", matter_id, title: "제외 업무", status: "todo" }),
    calendar_events: excluded({
      event_id: "event-excluded",
      matter_id,
      title: "제외 기한",
      status: "scheduled",
      starts_at: "2026-08-01T00:00:00.000Z",
    }),
    time_entries: excluded({
      time_entry_id: "time-excluded",
      matter_id,
      title: "제외 시간",
      billable: true,
      status: "approved",
    }),
    wip: excluded({
      wip_id: "wip-excluded",
      matter_id,
      title: "제외 WIP",
      status: "pending",
    }),
    wip_snapshots: excluded({
      wip_snapshot_id: "snapshot-excluded",
      matter_id,
      item_refs: ["wip-excluded"],
      immutable_snapshot: true,
    }),
    prebills: excluded({
      prebill_id: "prebill-excluded",
      matter_id,
      wip_snapshot_id: "snapshot-excluded",
      status: "partner_approved",
    }),
    receivables: excluded({
      receivable_id: "ar-excluded",
      matter_id,
      title: "제외 미수금",
      balance: 100_000,
      status: "outstanding",
    }),
    invoices: excluded({
      invoice_id: "invoice-excluded",
      matter_id,
      title: "제외 송장",
      balance_due: 100_000,
      status: "sent",
    }),
    payment_allocations: excluded({
      payment_allocation_id: "allocation-excluded",
      matter_id,
      payment_id: "payment-excluded",
      invoice_id: "invoice-excluded",
      allocation_type: "invoice_payment",
      amount: 100_000,
      status: "posted",
    }),
  });
  assert.deepEqual(blockers, []);
  assert.deepEqual(
    listArchivedMatters({
      tenant_id,
      matters: excluded({
        matter_id,
        title: "제외 보관 사건",
        status: "archived",
        archived_at: "2026-07-29T00:00:00.000Z",
      }),
    }),
    [],
  );
  assert.throws(
    () => buildTodayOperations({ tenant_id, now: "2026-07-30T10:00:00" }),
    /ISO timestamp with timezone/,
  );
});

test("[BOUNDARY] restore requires durable persistence and rejects timezone-less timestamps before writes", () => {
  assert.throws(() => restoreArchivedMatter({}), /durable repository/);
  assert.throws(
    () => restoreArchivedMatter({ repository: createMatterRepository() }),
    /durable repository/,
  );

  const repository = durableRepository();
  repository.create({
    model_type: "Matter",
    tenant_id,
    matter_id: "matter-restore-timezone",
    client_id: "client-restore-timezone",
    title: "Timezone restore",
    status: "archived",
    pre_archive_status: "closed",
    archived_at: "2026-07-29T00:00:00.000Z",
    created_by: "person-01",
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: "permission-restore-timezone",
    audit_trace_id: "audit-restore-timezone",
  });
  const before = repository.snapshot();
  assert.throws(
    () => restoreArchivedMatter({
      repository,
      tenant_id,
      matter_id: "matter-restore-timezone",
      actor_id: "person-01",
      idempotency_key: "restore-timezone-less",
      occurred_at: "2026-07-30T10:00:00",
    }),
    /ISO timestamp with timezone/,
  );
  assert.deepEqual(repository.snapshot(), before);
});
