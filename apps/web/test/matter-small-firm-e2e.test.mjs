import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import {
  handleMatterSmallFirmApiRequest,
} from "../../api/src/matter-small-firm-api.js";
import {
  createMatterSmallFirmRuntimeContext,
} from "../../api/src/matter-small-firm-runtime-context.js";
import {
  closeMatter,
  createMatterFollowUpService,
  createMatterRepository,
  createMatterTask,
  createSmallFirmMatterWorkService,
} from "../../../packages/matter/src/index.js";
import { handoffMatter } from "../../../packages/matter/src/small-firm-detail-service.js";
import {
  approvePreBillWithoutAdjustment,
  createDraftInvoiceFromPreBill,
  createFinanceRepository,
  createMatterPreBillFromWip,
  generateWipFromApprovedItems,
  transitionInvoiceLifecycle,
} from "../../../packages/billing/src/index.js";
import {
  createFeeArrangement,
  createQuickTimeEntry,
  createRateCard,
  lockTimeWeek,
  submitTimeWeek,
} from "../../../packages/time-expense/src/index.js";
import {
  applyMatterPayment,
  importPayment,
  queryMatterArQueue,
} from "../../../packages/payments/src/index.js";
import { listCloseoutBlockers } from "../../../packages/matter/src/small-firm-ops-service.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR
  ? resolve(process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR)
  : null;
const [foundationFixture, productStyles, matterStyles] = await Promise.all([
  readFile(new URL("../../../packages/matter/test/fixtures/matter-small-firm-foundation.fixture.json", import.meta.url), "utf8")
    .then(JSON.parse),
  readFile(resolve(webRoot, "src/styles.css"), "utf8"),
  readFile(resolve(webRoot, "src/components/matter-small-firm/matter-small-firm.css"), "utf8"),
]);

const TENANT = foundationFixture.tenant_id;
const MATTER = "matter-e2e-k-2026-014";
const CLIENT = "client-e2e";
const ADMIN = "person-10";
const PARTNER = "person-01";
const ATTORNEY = "person-03";
const BACKUP = "person-07";
const BILLING = "person-09";
const AS_OF = "2026-07-30T03:00:00.000Z";
const TIME_ZONE = "Asia/Seoul";
const API_QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "e2e_matter_small_firm_ops",
  audit_hint_ref: "e2e_matter_small_firm_ops",
  as_of: AS_OF,
  time_zone: TIME_ZONE,
});

function apiContext(userId) {
  return {
    principal: { tenant_id: TENANT, user_id: userId, role_ids: ["administrator"] },
    rules: [{ id: "allow_e2e_read", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function roleCounts(people) {
  return Object.fromEntries(
    [...new Set(people.map(({ role }) => role))]
      .sort()
      .map((role) => [role, people.filter((person) => person.role === role).length]),
  );
}

function duplicateMatterTaskCount(repository) {
  const tasks = repository.list({ tenant_id: TENANT, model_type: "MatterTask" });
  return tasks.length - new Set(tasks.map(({ task_id }) => task_id)).size;
}

function closeoutReceivables(rows) {
  return rows.map((row) => ({
    ...row,
    tenant_id: TENANT,
    resource_id: row.invoice_id,
    status: row.lifecycle_status,
  }));
}

function closeoutBillingLineage(repository) {
  const rows = (model_type) => repository.list({
    tenant_id: TENANT,
    matter_id: MATTER,
    model_type,
  });
  return {
    time_entries: rows("TimeEntry"),
    wip: rows("WipItem"),
    wip_snapshots: rows("WipSnapshot"),
    prebills: rows("PreBill"),
    invoices: rows("Invoice"),
    payment_allocations: rows("PaymentAllocation"),
  };
}

test("[TUW-41] 10-person workflow crosses Matter, time, billing, payment, and closeout ledgers without duplicate work", async (t) => {
  assert.equal(foundationFixture.people.length, 10);
  assert.deepEqual(roleCounts(foundationFixture.people), {
    attorney: 4,
    billing_ops: 1,
    litigation_staff: 2,
    office_admin: 1,
    partner: 2,
  });

  const durableDir = await mkdtemp(join(tmpdir(), "lawos-matter-small-firm-e2e-"));
  t.after(() => rm(durableDir, { recursive: true, force: true }));
  const matterRepository = createMatterRepository({ filePath: join(durableDir, "matter.json") });
  const financeRepository = createFinanceRepository({ filePath: join(durableDir, "finance.json") });
  const apiRuntime = createMatterSmallFirmRuntimeContext({
    matterRepository,
    financeRepository,
    now: () => new Date(AS_OF),
  });
  for (const person of foundationFixture.people) {
    matterRepository.create({
      model_type: "Person",
      resource_id: person.person_id,
      tenant_id: TENANT,
      person_id: person.person_id,
      display_name: person.display_name,
      role: person.role,
      status: "active",
      active: person.active === true,
    });
  }
  let apiRequestSequence = 0;
  const apiRead = (pathname, userId, query = {}) => handleMatterSmallFirmApiRequest({
    pathname,
    method: "GET",
    query: { ...API_QUERY, ...query },
    body: {},
    context: apiContext(userId),
    requestId: `e2e-read-${apiRequestSequence += 1}`,
    runtime: apiRuntime,
  });
  matterRepository.create({
    model_type: "Matter",
    tenant_id: TENANT,
    matter_id: MATTER,
    matter_code: "K-2026-014",
    client_id: CLIENT,
    title: "[QA] 10인 E2E 사건",
    status: "open",
    created_by: ADMIN,
    created_at: AS_OF,
    permission_envelope_id: "permission-e2e-k-2026-014",
    audit_trace_id: "audit-e2e-k-2026-014",
  });
  const work = createSmallFirmMatterWorkService({
    repository: matterRepository,
    clock: () => AS_OF,
  });

  const quickTaskCommand = {
    tenant_id: TENANT,
    actor_id: ADMIN,
    idempotency_key: "e2e-quick-task",
    task: {
      matter_id: MATTER,
      title: "오늘 제출자료 확인",
      due_at: "2026-07-30T08:00:00.000+09:00",
    },
  };
  const quickTask = work.quickCreateTask(quickTaskCommand);
  const quickTaskReplay = work.quickCreateTask(quickTaskCommand);
  assert.equal(quickTaskReplay.idempotent_replay, true);
  assert.equal(quickTaskReplay.task.task_id, quickTask.task.task_id);
  const unassignedRead = await apiRead("/api/matter/ops/tasks", ADMIN, { view: "unassigned" });
  assert.equal(unassignedRead.status, 200);
  assert.equal(unassignedRead.body.count, 1);
  assert.deepEqual(unassignedRead.body.items.map(({ id }) => id), [quickTask.task.task_id]);

  const handoffCommand = {
    repository: matterRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: PARTNER,
    new_owner_user_id: ATTORNEY,
    new_backup_user_id: BACKUP,
    note: "담당 변호사와 사건 백업 지정",
    idempotency_key: "e2e-matter-handoff",
    occurred_at: "2026-07-30T03:10:00.000Z",
  };
  const handoff = handoffMatter(handoffCommand);
  const handoffReplay = handoffMatter(handoffCommand);
  assert.equal(handoffReplay.idempotent_replay, true);
  assert.equal(handoff.matter.owner_user_id, ATTORNEY);
  assert.equal(handoff.matter.backup_user_id, BACKUP);
  assert.equal(
    matterRepository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: quickTask.task.task_id,
    }).assigned_to,
    ATTORNEY,
  );

  const followups = createMatterFollowUpService({
    repository: matterRepository,
    clock: () => "2026-07-30T03:20:00.000Z",
    timeZone: TIME_ZONE,
    createTask: ({ repository, task }) => repository.create(createMatterTask(task)),
  });
  const followup = followups.createFollowUp({
    tenant_id: TENANT,
    matter_id: MATTER,
    followup: {
      followup_id: "followup-e2e-materials",
      client_id: CLIENT,
      title: "의뢰인 자료 확인",
      channel: "call",
      status: "waiting_firm",
      owner_id: ATTORNEY,
      backup_owner_id: BACKUP,
      next_action: "금요일 자료 수신 여부 확인",
      next_action_at: "2026-07-31T08:00:00.000Z",
    },
    actor_id: ATTORNEY,
    idempotency_key: "e2e-followup-create",
    occurred_at: "2026-07-30T03:20:00.000Z",
  });
  followups.recordContact({
    tenant_id: TENANT,
    matter_id: MATTER,
    client_id: CLIENT,
    contact: {
      contact_id: "contact-e2e-call",
      followup_id: followup.item.followup_id,
      entry_kind: "external_contact",
      channel: "call",
      direction: "outbound",
      delivery_state: "manual_recorded",
      summary: "자료 제출 일정을 통화로 확인",
      occurred_at: "2026-07-30T03:21:00.000Z",
    },
    actor_id: ATTORNEY,
    idempotency_key: "e2e-contact-call",
    occurred_at: "2026-07-30T03:21:00.000Z",
  });
  const convertCommand = {
    tenant_id: TENANT,
    matter_id: MATTER,
    followup_id: followup.item.followup_id,
    task: {
      title: "금요일 자료 확인",
      assigned_to: ATTORNEY,
      due_at: "2026-07-31T08:00:00.000Z",
    },
    actor_id: ATTORNEY,
    idempotency_key: "e2e-followup-convert",
    occurred_at: "2026-07-30T03:22:00.000Z",
  };
  const converted = followups.convertRequestToTask(convertCommand);
  const convertedReplay = followups.convertRequestToTask(convertCommand);
  assert.equal(convertedReplay.idempotent_replay, true);
  assert.equal(converted.task.source_ref, `followup:${followup.item.followup_id}`);
  assert.equal(convertedReplay.task.task_id, converted.task.task_id);
  const [myTaskRead, todayRead] = await Promise.all([
    apiRead("/api/matter/ops/tasks", ATTORNEY, { view: "my" }),
    apiRead("/api/matter/ops/today", ATTORNEY),
  ]);
  assert.equal(myTaskRead.status, 200);
  assert.equal(myTaskRead.body.count, 2);
  assert.deepEqual(
    myTaskRead.body.items.map(({ id }) => id).sort(),
    [quickTask.task.task_id, converted.task.task_id].sort(),
  );
  assert.equal(todayRead.status, 200);
  assert.equal(todayRead.body.item.tenant_id, TENANT);
  assert.equal(todayRead.body.item.lanes.length, 8);

  const openBlockers = listCloseoutBlockers({
    tenant_id: TENANT,
    matter_id: MATTER,
    tasks: matterRepository.list({
      tenant_id: TENANT,
      matter_id: MATTER,
      model_type: "MatterTask",
    }),
  });
  assert.equal(openBlockers.filter(({ blocker_type }) => blocker_type === "open_task").length, 2);
  for (const [index, taskId] of [quickTask.task.task_id, converted.task.task_id].entries()) {
    work.transitionTask({
      tenant_id: TENANT,
      task_id: taskId,
      to_status: "done",
      actor_id: ATTORNEY,
      reason: "E2E 업무 완료",
      idempotency_key: `e2e-task-complete-${index + 1}`,
      occurred_at: `2026-07-30T0${4 + index}:00:00.000Z`,
    });
  }

  const rateCard = createRateCard({
    repository: financeRepository,
    rate_card: {
      rate_card_id: "rate-e2e",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "attorney", hourly_rate: 100_000 }],
    },
    actor_id: BILLING,
    idempotency_key: "e2e-rate-card",
  }).rate_card;
  createFeeArrangement({
    repository: financeRepository,
    fee_arrangement: {
      fee_arrangement_id: "fee-e2e",
      tenant_id: TENANT,
      matter_id: MATTER,
      billing_profile_id: "billing-profile-e2e",
      rate_card_id: rateCard.rate_card_id,
      type: "hourly",
    },
    rate_card: rateCard,
    actor_id: BILLING,
    idempotency_key: "e2e-fee-arrangement",
  });

  const quickTimeCommand = {
    repository: financeRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ATTORNEY,
    role_id: "attorney",
    work_date: "2026-07-30",
    duration_minutes: 90,
    narrative: "제출자료 검토 및 의뢰인 통화",
    billable: true,
    idempotency_key: "e2e-quick-time",
  };
  const quickTime = createQuickTimeEntry(quickTimeCommand);
  const quickTimeReplay = createQuickTimeEntry(quickTimeCommand);
  assert.equal(quickTimeReplay.idempotent_replay, true);
  assert.equal(quickTimeReplay.item.time_entry_id, quickTime.item.time_entry_id);
  submitTimeWeek({
    repository: financeRepository,
    tenant_id: TENANT,
    actor_id: ATTORNEY,
    time_entry_ids: [quickTime.item.time_entry_id],
    week_start: "2026-07-27",
    now: "2026-07-31T00:00:00.000Z",
    idempotency_key: "e2e-time-submit",
  });
  const locked = lockTimeWeek({
    repository: financeRepository,
    tenant_id: TENANT,
    actor_id: ATTORNEY,
    time_entry_ids: [quickTime.item.time_entry_id],
    week_start: "2026-07-27",
    now: "2026-07-31T00:15:00.000Z",
    idempotency_key: "e2e-time-lock",
  });
  assert.equal(locked.items[0].status, "locked");
  assert.equal(locked.items[0].approved_for_wip, true);

  const wip = generateWipFromApprovedItems({
    repository: financeRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    source_items: locked.items,
    rate_card: rateCard,
    actor_id: BILLING,
    idempotency_key: "e2e-wip",
  });
  assert.equal(wip.wip_items[0].amount, 150_000);
  const prebill = createMatterPreBillFromWip({
    repository: financeRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    wip_item_ids: wip.wip_items.map(({ wip_item_id }) => wip_item_id),
    wip_snapshot_id: "snapshot-e2e",
    prebill: {
      prebill_id: "prebill-e2e",
      partner_reviewer_id: PARTNER,
      currency: "KRW",
    },
    actor_id: BILLING,
    idempotency_key: "e2e-prebill",
  });
  const approved = approvePreBillWithoutAdjustment({
    repository: financeRepository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: PARTNER,
    idempotency_key: "e2e-prebill-approve",
  });
  const draft = createDraftInvoiceFromPreBill({
    repository: financeRepository,
    invoice: {
      invoice_id: "invoice-e2e",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: approved.prebill.prebill_id,
      billing_client_party_id: CLIENT,
      currency: "KRW",
      drafted_at: "2026-07-31T01:00:00.000Z",
      payment_terms_days: 30,
    },
    actor_id: BILLING,
    idempotency_key: "e2e-invoice-draft",
  });
  const sent = transitionInvoiceLifecycle({
    repository: financeRepository,
    tenant_id: TENANT,
    invoice_id: draft.invoice.invoice_id,
    to_status: "sent",
    transition_at: "2026-07-31T02:00:00.000Z",
    actor_id: BILLING,
    idempotency_key: "e2e-invoice-sent",
  });
  assert.equal(sent.invoice.amount_due, 150_000);

  const partialPayment = importPayment({
    repository: financeRepository,
    payment: {
      payment_id: "payment-e2e-partial",
      tenant_id: TENANT,
      matter_id: MATTER,
      bank_reference: "bank:e2e:partial",
      amount: 40_000,
      currency: "KRW",
      received_at: "2026-10-01T01:00:00.000Z",
    },
    actor_id: BILLING,
    idempotency_key: "e2e-payment-partial-import",
  }).payment;
  const partialCommand = {
    repository: financeRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: partialPayment.payment_id,
    invoice_id: sent.invoice.invoice_id,
    payment_allocation_id: "allocation-e2e-partial",
    amount: 40_000,
    as_of_date: "2026-10-01",
    actor_id: BILLING,
    idempotency_key: "e2e-payment-partial-apply",
  };
  const partial = applyMatterPayment(partialCommand);
  const partialReplay = applyMatterPayment(partialCommand);
  assert.equal(partialReplay.idempotent_replay, true);
  assert.equal(partial.invoice.lifecycle_status, "partial");
  assert.equal(partial.ar_queue.totals.bucket_31_60, 110_000);

  const receivableBlockers = listCloseoutBlockers({
    tenant_id: TENANT,
    matter_id: MATTER,
    ...closeoutBillingLineage(financeRepository),
    tasks: matterRepository.list({
      tenant_id: TENANT,
      matter_id: MATTER,
      model_type: "MatterTask",
    }),
    receivables: closeoutReceivables(partial.ar_queue.rows),
  });
  assert.deepEqual(receivableBlockers.map(({ blocker_type }) => blocker_type), ["outstanding_receivable"]);

  const finalPayment = importPayment({
    repository: financeRepository,
    payment: {
      payment_id: "payment-e2e-final",
      tenant_id: TENANT,
      matter_id: MATTER,
      bank_reference: "bank:e2e:final",
      amount: 110_000,
      currency: "KRW",
      received_at: "2026-10-01T02:00:00.000Z",
    },
    actor_id: BILLING,
    idempotency_key: "e2e-payment-final-import",
  }).payment;
  const paid = applyMatterPayment({
    repository: financeRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: finalPayment.payment_id,
    invoice_id: sent.invoice.invoice_id,
    payment_allocation_id: "allocation-e2e-final",
    amount: 110_000,
    as_of_date: "2026-10-01",
    actor_id: BILLING,
    idempotency_key: "e2e-payment-final-apply",
  });
  assert.equal(paid.invoice.lifecycle_status, "paid");
  assert.equal(queryMatterArQueue({
    repository: financeRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    as_of_date: "2026-10-01",
  }).totals.balance, 0);

  const finalBlockers = listCloseoutBlockers({
    tenant_id: TENANT,
    matter_id: MATTER,
    ...closeoutBillingLineage(financeRepository),
    tasks: matterRepository.list({
      tenant_id: TENANT,
      matter_id: MATTER,
      model_type: "MatterTask",
    }),
    receivables: closeoutReceivables(paid.ar_queue.rows),
  });
  assert.deepEqual(finalBlockers, []);
  const close = closeMatter({
    repository: matterRepository,
    matter: matterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: MATTER,
    }),
    blockers: finalBlockers,
    actor_id: PARTNER,
    audit: {
      append: (event) => matterRepository.appendAudit({
        ...event,
        event_id: "matter.close:e2e",
        occurred_at: "2026-10-01T03:00:00.000Z",
      }),
    },
  });
  assert.equal(close.outcome, "closed");
  assert.equal(close.matter.status, "closed");
  assert.equal(duplicateMatterTaskCount(matterRepository), 0);
  assert.equal(
    financeRepository.list({
      tenant_id: TENANT,
      model_type: "PaymentAllocation",
      invoice_id: sent.invoice.invoice_id,
    }).length,
    2,
  );

  const matterActions = new Set(matterRepository.listAudit({ tenant_id: TENANT }).map(({ action }) => action));
  const financeActions = new Set(financeRepository.listAudit({ tenant_id: TENANT }).map(({ action }) => action));
  for (const action of [
    "matter.task.quick_create",
    "matter.handoff",
    "matter.followup.create",
    "matter.followup.contact.record",
    "matter.followup.convert_to_task",
    "matter.task.transition",
    "matter.close",
  ]) {
    assert.equal(matterActions.has(action), true, action);
  }
  for (const action of [
    "time.entry.create",
    "time.entry.week.submit",
    "time.entry.week.lock",
    "wip.generate",
    "prebill.approve_without_adjustment",
    "invoice.draft.create",
    "invoice.lifecycle.sent",
    "matter.payment.apply",
  ]) {
    assert.equal(financeActions.has(action), true, action);
  }

  t.diagnostic(JSON.stringify({
    api_routes: [
      "GET /api/matter/ops/tasks?view=unassigned",
      "GET /api/matter/ops/tasks?view=my",
      "GET /api/matter/ops/today",
    ],
    api_statuses: [unassignedRead.status, myTaskRead.status, todayRead.status],
    people: foundationFixture.people.length,
    matter_tasks: matterRepository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length,
    duplicate_matter_tasks: duplicateMatterTaskCount(matterRepository),
    matter_audit_events: matterRepository.listAudit({ tenant_id: TENANT }).length,
    finance_audit_events: financeRepository.listAudit({ tenant_id: TENANT }).length,
    final_invoice_status: paid.invoice.lifecycle_status,
    final_ar_balance: paid.ar_queue.totals.balance,
    closeout: close.outcome,
  }));
});

function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? rejectPort(error) : resolvePort(port));
    });
  });
}

function fixturePagePlugin() {
  return {
    name: "matter-small-firm-e2e-page",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== "/__matter-small-firm-e2e__") return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end("<!doctype html><html data-skin=\"forest\" lang=\"ko\"><body><main id=\"root\" class=\"page-canvas\"></main></body></html>");
      });
    },
  };
}

async function mountActualMatterScreens(page) {
  await page.evaluate(async () => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MatterOperationsSurface } = await import("/src/components/matter-small-firm/MatterOperationsSurface.jsx");
    const { MatterOperationsState } = await import("/src/components/matter-small-firm/MatterOperationsState.jsx");
    const { MatterDetailTabs } = await import("/src/components/matter-small-firm/MatterDetailTabs.jsx");
    const h = React.createElement;
    const matter = {
      matter_id: "matter-e2e-k-2026-014",
      matter_code: "K-2026-014",
      title: "[QA] 10인 E2E 사건",
      client_display_name: "[QA] 의뢰인",
      owner_user_id: "person-03",
      backup_user_id: "person-07",
      status: "open",
      next_action: "금요일 자료 확인",
      next_deadline_at: "2026-07-31T08:00:00.000Z",
    };
    const task = {
      task_id: "task-e2e-canonical",
      matter_id: matter.matter_id,
      matter: { code: matter.matter_code, title: matter.title },
      title: "금요일 자료 확인",
      owner_user_id: "person-03",
      backup_user_id: "person-07",
      status: "todo",
      due_at: "2026-07-31T08:00:00.000Z",
      priority: "high",
    };
    const event = {
      event_id: "deadline-e2e",
      matter_id: matter.matter_id,
      matter: { code: matter.matter_code, title: matter.title },
      title: "제출 기한",
      owner_user_id: "person-03",
      status: "scheduled",
      starts_at: "2026-07-31T08:00:00.000Z",
    };
    const followup = {
      followup_id: "followup-e2e",
      matter_id: matter.matter_id,
      matter: { code: matter.matter_code, title: matter.title },
      title: "의뢰인 자료 확인",
      owner_user_id: "person-03",
      backup_user_id: "person-07",
      status: "waiting_firm",
      channel: "call",
      next_action_at: "2026-07-31T08:00:00.000Z",
      last_contact_at: "2026-07-30T03:21:00.000Z",
    };
    const timeEntry = {
      time_entry_id: "time-e2e",
      matter_id: matter.matter_id,
      matter: { code: matter.matter_code, title: matter.title },
      title: "제출자료 검토",
      owner_user_id: "person-03",
      status: "locked",
      work_date: "2026-07-30",
      duration_minutes: 90,
    };
    const weeklyTime = {
      actor_id: "person-03",
      display_name: "[QA] 담당 변호사",
      entered_dates: ["2026-07-30"],
      missing_dates: [],
      week_start: "2026-07-27",
      week_end: "2026-08-02",
      total_minutes: 90,
      complete: true,
    };
    const data = (item) => ({ kind: "data", item });
    const workResult = data({
      my: [task],
      overdue: [task],
      waiting: [task],
      unassigned: [task],
      tasks: [task],
    });
    const callbacks = [];
    window.__matterSmallFirmE2eEvents = callbacks;
    const common = {
      matters: [matter],
      mattersResult: { kind: "data", items: [matter] },
      onRetry() {},
      onSelectMatter(matterId) {
        callbacks.push({ type: "select-matter", matterId });
      },
      onNavigateSection(section) {
        callbacks.push({ type: "navigate", section });
      },
      listView: "active",
      onListViewChange(value) {
        callbacks.push({ type: "list-view", value });
      },
      workView: "my",
      onWorkViewChange(value) {
        callbacks.push({ type: "work-view", value });
      },
      onTaskStatusChange(changedTask, status) {
        callbacks.push({ type: "task-status", taskId: changedTask.task_id, status });
      },
      taskUpdatePendingId: null,
      followupView: "today",
      onFollowupViewChange(value) {
        callbacks.push({ type: "followup-view", value });
      },
      timeBillingView: "time",
      onTimeBillingViewChange(value) {
        callbacks.push({ type: "time-view", value });
      },
      meetingPending: false,
      meetingResult: null,
      onCreateMeeting(value) {
        callbacks.push({ type: "meeting", value });
      },
      timeEntryPending: false,
      timeEntryResult: null,
      onCreateTimeEntry(value) {
        callbacks.push({ type: "time-entry", value });
      },
    };
    const operation = (key, props) => h(
      "div",
      { className: "e2e-surface", key, "data-e2e-surface": key },
      h(MatterOperationsSurface, { ...common, ...props }),
    );
    const state = (key, result, empty = false) => h(
      "div",
      { className: "e2e-state", key },
      h(MatterOperationsState, { result, noun: "검증 데이터", empty }, h("span", null, "happy")),
    );
    function MatterListHarness() {
      const [listView, setListView] = React.useState("active");
      return h(MatterOperationsSurface, {
        ...common,
        section: "matter-list",
        mode: "list",
        result: data({ items: [matter] }),
        listView,
        onListViewChange(value) {
          callbacks.push({ type: "list-view", value });
          setListView(value);
        },
      });
    }

    createRoot(document.getElementById("root")).render(h(
      "div",
      { className: "e2e-fixture" },
      operation("today", {
        section: "matter-today",
        result: data({
          priority_rows: [task],
          week_schedule: [event],
          next_actions: [task],
          weekly_review: [{ id: "review-1", question: "미배정 업무", count: 0, unit: "건" }],
          summary: { missing_time_count: 0, wip_count: 1, overdue_ar_count: 1 },
        }),
      }),
      h("div", { className: "e2e-surface", key: "list", "data-e2e-surface": "list" }, h(MatterListHarness)),
      operation("work-list", {
        section: "matter-work",
        result: workResult,
        workLayout: "list",
        onWorkLayoutChange(value) {
          callbacks.push({ type: "work-layout", value });
        },
      }),
      operation("work-board", {
        section: "matter-work",
        result: workResult,
        workLayout: "board",
        onWorkLayoutChange(value) {
          callbacks.push({ type: "work-layout", value });
        },
      }),
      operation("work-worktree", {
        section: "matter-work",
        result: workResult,
        workLayout: "worktree",
        onWorkLayoutChange(value) {
          callbacks.push({ type: "work-layout", value });
        },
        worktree: h("div", { className: "e2e-worktree", "data-task-id": task.task_id }, task.title),
      }),
      operation("calendar", {
        section: "matter-calendar",
        result: data({ events: [event] }),
      }),
      operation("followups", {
        section: "matter-followups",
        result: data({ today: [followup], followups: [followup] }),
      }),
      operation("time-billing", {
        section: "matter-time-billing",
        result: data({
          weekly_time: {
            items: [weeklyTime],
            summary: { total_minutes: 90, incomplete_actor_count: 0 },
          },
          wip: { rows: [], totals: { total_amount: 150000 } },
          ar: { rows: [], totals: { balance: 110000 } },
        }),
      }),
      h("section", { className: "e2e-state-matrix", "aria-label": "운영 상태" },
        state("loading", { kind: "loading" }),
        state("empty", { kind: "data", items: [] }, true),
        state("error", { kind: "error", message: "repository unavailable" }),
        state("blocked", { kind: "blocked", message: "선행 작업 필요" }),
        state("denied", { kind: "error", uiState: "denied" }),
      ),
      h("div", { className: "e2e-surface", "data-e2e-surface": "detail" },
        h(MatterDetailTabs, {
          matter,
          detailResult: data({
            summary: {
              owner_user_id: "person-03",
              backup_user_id: "person-07",
              next_action: { title: "금요일 자료 확인" },
              next_deadline: { due_at: event.starts_at },
            },
            tab_data: {
              work_deadlines: [{ ...task, source_type: "task" }, { ...event, source_type: "deadline" }],
              contact_history: [followup],
              documents: [{ document_id: "document-e2e", matter_id: matter.matter_id }],
              time_billing: [timeEntry],
            },
          }),
          timelineResult: data({ items: [followup] }),
          billingPanel: h("div", null, "시간·청구 원장"),
          onOpenVault() {
            callbacks.push({ type: "open-vault" });
          },
        }),
      ),
    ));
    history.replaceState(null, "", "/?view=matters#matter-today");
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });
}

async function assertRovingTabKeyboard(page, tablistSelector) {
  const tablist = page.locator(tablistSelector).first();
  const tabs = tablist.getByRole("tab");
  const before = await tabs.evaluateAll((items) => items.map((item) => item.getAttribute("aria-selected")));
  assert.equal(before.filter((value) => value === "true").length, 1);
  const selectedIndex = before.indexOf("true");
  await tabs.nth(selectedIndex).focus();
  await page.keyboard.press("ArrowRight");
  const nextIndex = (selectedIndex + 1) % before.length;
  assert.equal(await tabs.nth(nextIndex).getAttribute("aria-selected"), "true");
  assert.equal(await tabs.nth(nextIndex).evaluate((element) => element === document.activeElement), true);
}

test("[TUW-42] actual Matter screens hold responsive, state, keyboard, contrast, and canonical-task contracts at 1440px and 390px", { timeout: 60_000 }, async (t) => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    plugins: [fixturePagePlugin()],
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  try {
    await server.listen();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/__matter-small-firm-e2e__`, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({
      content: `${productStyles}\n${matterStyles}\n
        html, body { width: 100%; min-width: 0; margin: 0; }
        body { overflow-x: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
        .e2e-fixture { width: 100%; min-width: 0; display: grid; gap: 32px; padding: 24px; }
        .e2e-surface, .e2e-state-matrix { min-width: 0; padding: 16px; border: 1px solid var(--am-border); background: var(--am-canvas); }
        .e2e-state-matrix { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .e2e-worktree { min-height: 80px; padding: 16px; border: 1px solid var(--am-border); background: var(--am-surface); }
        @media (max-width: 720px) {
          .e2e-fixture { padding: 12px; gap: 20px; }
          .e2e-surface, .e2e-state-matrix { padding: 10px; }
        }
      `,
    });
    await mountActualMatterScreens(page);
    await page.locator('[data-matter-small-firm-screen="matter-today"]').waitFor();

    assert.equal(new URL(page.url()).searchParams.get("view"), "matters");
    assert.equal(new URL(page.url()).hash, "#matter-today");
    assert.deepEqual(
      await page.locator("[data-matter-small-firm-screen]").evaluateAll((screens) =>
        [...new Set(screens.map((screen) => screen.getAttribute("data-matter-small-firm-screen")))].sort()),
      ["matter-calendar", "matter-followups", "matter-list", "matter-time-billing", "matter-today", "matter-work"],
    );
    assert.deepEqual(
      await page.locator("[data-matter-ops-state]").evaluateAll((states) =>
        [...new Set(states.map((state) => state.getAttribute("data-matter-ops-state")))].sort()),
      ["blocked", "denied", "empty", "error", "loading"],
    );
    const stateMatrix = page.locator(".e2e-state-matrix");
    assert.equal(await stateMatrix.locator('[data-matter-ops-state="error"][role="alert"]').count(), 1);
    assert.equal(await stateMatrix.locator('[data-matter-ops-state="loading"][role="status"]').count(), 1);
    assert.equal(await stateMatrix.locator('[data-matter-ops-state="empty"][role="status"]').count(), 1);
    assert.equal(await stateMatrix.locator('[data-matter-ops-state="blocked"][role="status"]').count(), 1);
    assert.equal(await stateMatrix.locator('[data-matter-ops-state="denied"][role="status"]').count(), 1);
    assert.equal(await stateMatrix.locator('[data-matter-ops-state="loading"]').textContent(), "검증 데이터를 불러오는 중입니다");
    assert.match(await stateMatrix.locator('[data-matter-ops-state="empty"]').textContent(), /^검증 데이터가 없습니다/);
    assert.equal(await page.locator('[data-matter-detail-tabs="five"] [role="tab"]').count(), 5);
    assert.equal(await page.locator('[data-matter-detail-tabs="five"] [role="tabpanel"]').count(), 1);
    assert.equal(await page.locator('[data-matter-quick-time-entry="true"]').count(), 1);
    assert.equal(await page.locator('[data-matter-meeting-form="true"]').count(), 1);
    assert.equal(await page.locator('[data-matter-weekly-review="true"]').count(), 1);
    const weeklyTimeRow = page.locator('[data-e2e-surface="time-billing"] tbody tr');
    assert.equal(await weeklyTimeRow.count(), 1);
    assert.match(await weeklyTimeRow.textContent(), /\[QA\] 담당 변호사/);
    assert.match(await weeklyTimeRow.textContent(), /1시간 30분/);

    for (const layout of ["list", "board", "worktree"]) {
      const ids = await page.locator(`[data-matter-work-layout="${layout}"] [data-task-id]`).evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-task-id")));
      assert.deepEqual(ids, ["task-e2e-canonical"], layout);
    }
    assert.equal(
      await page.locator('[data-matter-work-layout="list"] [data-task-id="task-e2e-canonical"]').count(),
      1,
    );
    assert.equal(
      await page.locator('[data-matter-work-layout="board"] [data-task-id="task-e2e-canonical"]').count(),
      1,
    );
    assert.equal(
      await page.locator('[data-matter-work-layout="worktree"] [data-task-id="task-e2e-canonical"]').count(),
      1,
    );

    const timeForm = page.locator('[data-matter-quick-time-entry="true"]');
    await timeForm.getByLabel("사건").selectOption("matter-e2e-k-2026-014");
    await timeForm.locator('input[type="date"]').fill("2026-07-30");
    await timeForm.locator('input[type="number"]').fill("90");
    await timeForm.locator('input:not([type])').fill("제출자료 검토 및 의뢰인 통화");
    await timeForm.getByRole("button", { name: "저장" }).click();
    const meetingForm = page.locator('[data-matter-meeting-form="true"]');
    await meetingForm.locator("select").selectOption("matter-e2e-k-2026-014");
    await meetingForm.locator("input").nth(0).fill("자료 제출 통화");
    await meetingForm.locator("textarea").fill("금요일까지 자료를 받기로 함");
    await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)));
    await meetingForm.getByRole("button", { name: "기록" }).click();
    const meetingObservable = await meetingForm.evaluate((form) => ({
      values: [...form.querySelectorAll("select, input, textarea")].map((input) => input.value),
      valid: form.checkValidity(),
      button_disabled: form.querySelector('button[type="submit"]').disabled,
      events: window.__matterSmallFirmE2eEvents,
    }));
    assert.equal(
      meetingObservable.events.some(({ type }) => type === "meeting"),
      true,
      JSON.stringify(meetingObservable),
    );
    await page.locator('[data-matter-work-layout="list"] select').selectOption("done");
    const events = await page.evaluate(() => window.__matterSmallFirmE2eEvents);
    assert.deepEqual(events.find(({ type }) => type === "time-entry")?.value, {
      matterId: "matter-e2e-k-2026-014",
      roleId: "partner",
      workDate: "2026-07-30",
      durationMinutes: 90,
      narrative: "제출자료 검토 및 의뢰인 통화",
      billable: true,
    });
    assert.deepEqual(events.find(({ type }) => type === "meeting")?.value, {
      matterId: "matter-e2e-k-2026-014",
      title: "자료 제출 통화",
      attendeeIds: ["person-03", "person-07"],
      decisions: ["금요일까지 자료를 받기로 함"],
      followUpTaskIds: [],
    });
    assert.deepEqual(events.find(({ type }) => type === "task-status"), {
      type: "task-status",
      taskId: "task-e2e-canonical",
      status: "done",
    });

    const viewports = [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ];
    const viewportEvidence = [];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
      await assertRovingTabKeyboard(page, '[data-e2e-surface="list"] [role="tablist"]');
      await assertRovingTabKeyboard(page, '[data-matter-detail-tabs="five"] [role="tablist"]');
      const observable = await page.evaluate(() => {
        function colorChannels(value) {
          const match = value.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
          return match ? match.slice(1, 4).map(Number) : null;
        }
        function luminance(value) {
          const channels = colorChannels(value);
          if (!channels) return null;
          return channels
            .map((channel) => channel / 255)
            .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
            .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        }
        function backgroundFor(element) {
          let current = element;
          while (current) {
            const value = getComputedStyle(current).backgroundColor;
            if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") return value;
            current = current.parentElement;
          }
          return "rgb(255, 255, 255)";
        }
        function contrast(selector) {
          const element = document.querySelector(selector);
          const foreground = luminance(getComputedStyle(element).color);
          const background = luminance(backgroundFor(element));
          const high = Math.max(foreground, background);
          const low = Math.min(foreground, background);
          return (high + 0.05) / (low + 0.05);
        }
        const clientWidth = document.documentElement.clientWidth;
        const pageCanvas = document.getElementById("root");
        const tableScrollContainers = [...document.querySelectorAll(".matter-ops-table-wrap")];
        const screenBounds = [...document.querySelectorAll("[data-matter-small-firm-screen]")].map((screen) => {
          const rect = screen.getBoundingClientRect();
          return {
            hook: screen.getAttribute("data-matter-small-firm-screen"),
            left: rect.left,
            right: rect.right,
          };
        });
        const active = document.activeElement;
        const activeStyle = getComputedStyle(active);
        return {
          client_width: clientWidth,
          body_scroll_width: document.body.scrollWidth,
          page_canvas_client_width: pageCanvas.clientWidth,
          page_canvas_scroll_width: pageCanvas.scrollWidth,
          table_scroll_contained: tableScrollContainers.every((container) =>
            container.getBoundingClientRect().right <= pageCanvas.getBoundingClientRect().right + 0.5
              && ["auto", "scroll"].includes(getComputedStyle(container).overflowX)),
          html_overflow_x: getComputedStyle(document.documentElement).overflowX,
          screens_within_viewport: screenBounds.every(({ left, right }) => left >= -0.5 && right <= clientWidth + 0.5),
          heading_contrast: contrast('[data-matter-small-firm-screen="matter-today"] h2'),
          body_contrast: contrast('[data-matter-small-firm-screen="matter-today"] .matter-ops-header p'),
          keyboard_focus_role: active.getAttribute("role"),
          keyboard_focus_visible: activeStyle.outlineStyle !== "none" && parseFloat(activeStyle.outlineWidth) >= 3,
        };
      });
      assert.equal(
        observable.page_canvas_scroll_width <= observable.page_canvas_client_width,
        true,
        JSON.stringify({ viewport, observable }),
      );
      assert.equal(observable.body_scroll_width <= observable.client_width, true, JSON.stringify({ viewport, observable }));
      assert.equal(observable.table_scroll_contained, true, JSON.stringify({ viewport, observable }));
      assert.equal(observable.html_overflow_x, "hidden");
      assert.equal(observable.screens_within_viewport, true, JSON.stringify({ viewport, observable }));
      assert.ok(observable.heading_contrast >= 4.5, JSON.stringify({ viewport, observable }));
      assert.ok(observable.body_contrast >= 4.5, JSON.stringify({ viewport, observable }));
      assert.equal(observable.keyboard_focus_role, "tab");
      assert.equal(observable.keyboard_focus_visible, true);
      viewportEvidence.push({ viewport, ...observable });
      if (evidenceDir) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: join(evidenceDir, `matter-small-firm-${viewport.width}.png`),
        });
      }
    }

    t.diagnostic(JSON.stringify({
      route: "/?view=matters#matter-today",
      viewport_evidence: viewportEvidence,
      screen_hooks: 6,
      state_hooks: 5,
      work_layouts: 3,
      duplicate_rendered_task_ids_per_layout: 0,
      screenshots: evidenceDir
        ? viewports.map(({ width }) => join(evidenceDir, `matter-small-firm-${width}.png`))
        : [],
    }));
  } finally {
    await browser.close();
    await server.close();
  }
});
