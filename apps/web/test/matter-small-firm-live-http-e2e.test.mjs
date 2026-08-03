import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ACCOUNT,
  BACKUP_ACCOUNT,
  BACKUP_ID,
  closeServer,
  createHttpServer,
  createRepositories,
  EXPECTED_GROSS,
  EXPECTED_INVOICE,
  FINAL_PAYMENT,
  FIRST_PAYMENT,
  launchBrowser,
  listen,
  MATTER_CODE,
  MATTER_ID,
  observeDisabled,
  openBrowserSession,
  parsedJson,
  personRecords,
  publishRf12Evidence,
  redact,
  RF12_CLOCK,
  startWebServer,
  TASK_ID,
  TENANT,
  waitForEnabled,
  waitForHttp,
  WORK_DATE,
  WRITE_DOWN,
} from "./support/rf12-live-http-support.mjs";

const evidenceDir = process.env.MATTER_RF12_EVIDENCE_DIR
  ? resolve(process.env.MATTER_RF12_EVIDENCE_DIR)
  : null;
const acceptanceRun = process.env.MATTER_RF12_ACCEPTANCE === "1";
const sourceFiles = [
  ["apps/web/test/matter-small-firm-live-http-e2e.test.mjs", import.meta.url],
  ["apps/web/test/support/rf12-live-http-support.mjs", new URL("./support/rf12-live-http-support.mjs", import.meta.url)],
  ["apps/web/test/support/rf12-fixture-support.mjs", new URL("./support/rf12-fixture-support.mjs", import.meta.url)],
  ["apps/web/test/support/rf12-browser-support.mjs", new URL("./support/rf12-browser-support.mjs", import.meta.url)],
  ["apps/web/test/support/rf12-evidence-sanitize.mjs", new URL("./support/rf12-evidence-sanitize.mjs", import.meta.url)],
  ["apps/web/test/support/rf12-evidence-support.mjs", new URL("./support/rf12-evidence-support.mjs", import.meta.url)],
  ["apps/web/test/support/validate-rf12-evidence.mjs", new URL("./support/validate-rf12-evidence.mjs", import.meta.url)],
].map(([name, url]) => ({ name, path: fileURLToPath(url) }));

async function navigateMatterSection(page, label, screen) {
  const sidebar = page.locator(".sidebar-nav");
  await sidebar.getByRole("button", { name: label, exact: true }).click();
  await page.locator(`[data-matter-small-firm-screen="${screen}"]`).waitFor();
}

async function openMatterOverlay(page) {
  const screen = page.locator('[data-matter-small-firm-screen="matter-list"]');
  const row = screen.locator("tbody tr").filter({ hasText: MATTER_CODE });
  await row.getByRole("button", { name: "사건 열기", exact: true }).click();
  const overlay = page.locator('[data-matter-record-workspace="right-panel"]');
  await overlay.waitFor();
  return overlay;
}

async function closeMatterOverlay(page) {
  const overlay = page.locator('[data-matter-record-workspace="right-panel"]');
  await overlay.locator(".record-overlay-close").click();
  await overlay.waitFor({ state: "detached" });
}

async function selectMatterBillingTab(overlay) {
  const tab = overlay.locator('[data-matter-detail-tabs="five"]').getByRole("tab", { name: "시간·청구" });
  if (await tab.getAttribute("aria-selected") !== "true") await tab.click();
  assert.equal(await tab.getAttribute("aria-selected"), "true");
}

function duplicateTaskCount(records) {
  const tasks = records.filter((record) => record.model_type === "MatterTask");
  return tasks.length - new Set(tasks.map((task) => task.task_id)).size;
}

function recordsOf(records, modelType) {
  return records.filter((record) => record.model_type === modelType);
}

function groupedCounts(values, keyFor) {
  const counts = new Map();
  for (const value of values) {
    const key = keyFor(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function consoleErrorPath(error) {
  try {
    return new URL(error.url).pathname;
  } catch {
    return null;
  }
}

function paymentRereads(page) {
  const paths = [
    "/api/matter/ops/payments",
    `/api/matter/ops/matters/${MATTER_ID}`,
    `/api/matter/ops/matters/${MATTER_ID}/closeout`,
    "/api/matter/ops/time-billing",
  ];
  const remaining = new Set(paths);
  const responses = [];
  let resolveReads;
  let rejectReads;
  let timer;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolveReads = resolvePromise;
    rejectReads = rejectPromise;
  });
  const cleanup = () => {
    clearTimeout(timer);
    page.off("response", onResponse);
  };
  const onResponse = (response) => {
    const path = new URL(response.url()).pathname;
    if (response.request().method() !== "GET" || response.status() !== 200 || !remaining.has(path)) return;
    remaining.delete(path);
    responses.push(response);
    if (remaining.size === 0) {
      cleanup();
      resolveReads(responses);
    }
  };
  page.on("response", onResponse);
  timer = setTimeout(() => {
    cleanup();
    rejectReads(new Error(`missing canonical payment rereads: ${[...remaining].join(", ")}`));
  }, 30_000);
  return {
    promise,
    cancel() {
      cleanup();
      resolveReads([]);
    },
  };
}

async function waitForPaymentMutation(page, { path, action }) {
  const rereads = paymentRereads(page);
  try {
    const mutation = await waitForHttp(page, { method: "POST", path, status: 201, action });
    await rereads.promise;
    return mutation;
  } catch (error) {
    rereads.cancel();
    throw error;
  }
}

test("[RF-12][TUW-41] normal product UI drives the durable small-firm lifecycle over real loopback HTTP", {
  timeout: 300_000,
}, async (t) => {
  assert.ok(
    !acceptanceRun || evidenceDir,
    "MATTER_RF12_EVIDENCE_DIR is required when MATTER_RF12_ACCEPTANCE=1",
  );
  const stateDir = await mkdtemp(join(tmpdir(), "lawos-rf12-live-http-"));
  const matterPath = join(stateDir, "matter.json");
  const financePath = join(stateDir, "finance.json");
  const consoleErrors = [];
  const pageErrors = [];
  const externalBrowserRequests = [];
  const taskCreateAttempts = [];
  const handlerBackedDroppedResponses = [];
  let repositories = createRepositories({ matterPath, financePath, seed: true });
  let api = createHttpServer({ repositories, stateDir });
  let apiPort = 0;
  let vite;
  let browser;
  let context;
  let page;
  let receipt;
  let rehydration;
  let secondaryHttpRows = [];
  let secondTimeEntryId;
  let secondInvoiceId;
  let restartSequenceBoundary = 0;
  let evidenceObservations = null;
  let cleanupObservables = null;

  try {
    apiPort = await listen(api.server);
    const web = await startWebServer(apiPort);
    vite = web.vite;
    const vitePort = web.vitePort;
    browser = await launchBrowser();
    const primarySession = await openBrowserSession(browser, {
      fixedTime: RF12_CLOCK.nowIso,
      viewport: { width: 1440, height: 1000 },
      browserSession: "primary",
      consoleErrors,
      pageErrors,
      externalBrowserRequests,
    });
    context = primarySession.context;
    page = primarySession.page;
    receipt = primarySession.receipt;

    await page.goto(`http://127.0.0.1:${vitePort}/?view=auth&authStep=login`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator("[data-login-email]").fill(ACCOUNT.email);
    await page.locator("[data-login-password]").fill(ACCOUNT.local_dev.synthetic_token);
    await waitForHttp(page, {
      method: "POST",
      path: "/api/auth/login",
      status: 200,
      action: () => page.locator("[data-login-form='email-password'] .matter-login-submit").click(),
    });
    await page.locator('[data-global-rail="true"]').waitFor();
    assert.equal(
      await page.evaluate(() => {
        const raw = sessionStorage.getItem("lawos.api.session")
          ?? localStorage.getItem("lawos.api.session");
        return Boolean(JSON.parse(raw ?? "null")?.session_token);
      }),
      true,
      "login must persist a signed API session",
    );

    await page.locator('[data-product-axis="matters"]').click();
    await page.locator('[data-matter-small-firm-screen="matter-today"]').waitFor();
    await navigateMatterSection(page, "사건", "matter-list");
    assert.equal(
      await page.locator('[data-matter-small-firm-screen="matter-list"] tbody tr').filter({ hasText: MATTER_CODE }).count(),
      1,
      "the one seeded Matter must be visible in the normal product list",
    );

    let overlay = await openMatterOverlay(page);
    const handoffForm = overlay.locator('[data-matter-handoff-form="true"]');
    await handoffForm.waitFor();
    const expectedPeopleIds = personRecords().map((person) => person.person_id).sort();
    const ownerOptionIds = await handoffForm.locator('[name="owner"] option').evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean).sort());
    const backupOptionIds = await handoffForm.locator('[name="backup"] option').evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean).sort());
    assert.deepEqual(ownerOptionIds, expectedPeopleIds);
    assert.deepEqual(backupOptionIds, expectedPeopleIds);
    assert.equal(new Set(ownerOptionIds).size, 10);
    await handoffForm.locator('[name="owner"]').selectOption(ACCOUNT.user_id);
    await handoffForm.locator('[name="backup"]').selectOption(BACKUP_ID);
    await handoffForm.locator('[name="note"]').fill("RF-12 실제 화면 인수인계");
    await waitForHttp(page, {
      method: "POST",
      path: `/api/matter/ops/matters/${MATTER_ID}/handoffs`,
      status: 200,
      action: () => handoffForm.locator('[data-matter-handoff-submit="true"]').click(),
    });
    await page.locator('[data-matter-handoff-mutation-status="data"]').waitFor();
    await overlay.locator(`[data-matter-detail-owner="${ACCOUNT.user_id}"]`).waitFor();
    await overlay.locator(`[data-matter-detail-backup="${BACKUP_ID}"]`).waitFor();
    await closeMatterOverlay(page);

    await navigateMatterSection(page, "업무", "matter-work");
    await page.locator('[data-matter-small-firm-screen="matter-work"]').getByRole("button", { name: "새 업무", exact: true }).click();
    const taskCreateForm = page.locator('[data-matter-quick-task-form="true"]');
    await taskCreateForm.waitFor();
    await taskCreateForm.getByLabel("사건").selectOption(MATTER_ID);
    await taskCreateForm.getByLabel("제목").fill("[RF12] 중복 제출 업무");
    await taskCreateForm.getByLabel("담당").fill(ACCOUNT.user_id);
    await taskCreateForm.getByLabel("기한").fill("2026-07-31T19:00");
    await taskCreateForm.getByLabel("우선순위").selectOption("high");
    const taskCreateRoutePattern = "**/api/matter/ops/tasks**";
    const taskCreateRoute = async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      taskCreateAttempts.push(redact(route.request().postDataJSON()));
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
      await route.continue();
    };
    await page.route(taskCreateRoutePattern, taskCreateRoute);
    const taskSubmit = taskCreateForm.locator('[data-matter-task-create-submit="true"]');
    const taskSubmitDisabled = observeDisabled(taskSubmit);
    const doubleSubmittedTask = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/tasks",
      status: 201,
      action: () => taskSubmit.dblclick(),
    });
    await taskCreateForm.locator('[data-matter-task-create-status="data"]').waitFor();
    await page.unroute(taskCreateRoutePattern, taskCreateRoute);
    const doubleSubmittedTaskId = doubleSubmittedTask.body.item?.id;
    assert.ok(doubleSubmittedTaskId);
    assert.equal(doubleSubmittedTask.body.item?.ledger_ref?.model_type, "MatterTask");
    assert.equal(doubleSubmittedTask.body.item?.ledger_ref?.id, doubleSubmittedTaskId);
    assert.equal(await taskSubmitDisabled, true, "visible double-submit must disable while the one request is pending");
    assert.equal(taskCreateAttempts.length, 1, "visible double-click must issue exactly one task mutation");
    assert.match(
      taskCreateAttempts[0].idempotency_key,
      /^matter_task_create_[0-9a-f-]+$/,
      "the one visible submit attempt must cross the HTTP boundary with its stable UI key",
    );
    assert.equal(
      taskCreateAttempts[0].task?.due_at,
      new Date(2026, 6, 31, 19, 0).toISOString(),
      "the visible datetime-local value must cross the HTTP boundary as a canonical instant",
    );

    await navigateMatterSection(page, "연락·후속", "matter-followups");
    const createFollowup = page.locator('[data-matter-followup-form="create"]');
    await createFollowup.waitFor();
    await createFollowup.locator('[name="matter"]').selectOption(MATTER_ID);
    await createFollowup.locator('[name="title"]').fill("[RF12] 의뢰인 자료 확인");
    await createFollowup.locator('[name="next_action"]').fill("자료 도착 여부를 확인");
    await createFollowup.locator('[name="owner"]').selectOption(ACCOUNT.user_id);
    await createFollowup.locator('[name="backup"]').selectOption(BACKUP_ID);
    await createFollowup.locator('[name="status"]').selectOption("waiting_client");
    await createFollowup.locator('[name="due_at"]').fill("2026-07-31T17:00");
    await createFollowup.locator('[name="channel"]').selectOption("call");
    const followupCreate = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/followups",
      status: 201,
      action: () => createFollowup.locator('button[type="submit"]').click(),
    });
    const followupId = followupCreate.body.item?.followup_id;
    assert.ok(followupId, "visible follow-up creation must return a canonical ID");
    await page.locator('[data-matter-followup-mutation-status="data"]').waitFor();

    const followupRow = page.locator(`[data-followup-id="${followupId}"]`);
    await followupRow.waitFor();
    await followupRow.locator("[data-followup-edit]").click();
    const updateFollowup = page.locator('[data-matter-followup-form="update"]');
    await updateFollowup.waitFor();
    await updateFollowup.locator('[name="next_action"]').fill("담당 변호사가 자료를 검토");
    await updateFollowup.locator('[name="owner"]').selectOption(ACCOUNT.user_id);
    await updateFollowup.locator('[name="status"]').selectOption("waiting_firm");
    await updateFollowup.locator('[name="due_at"]').fill("2026-07-31T18:00");
    await waitForHttp(page, {
      method: "PATCH",
      path: `/api/matter/ops/followups/${followupId}`,
      status: 200,
      action: () => updateFollowup.locator('button[type="submit"]').click(),
    });
    const canonicalFollowup = page.locator(
      `[data-followup-detail-state="data"][data-followup-detail-id="${followupId}"]`,
    );
    await canonicalFollowup.getByText(/담당 변호사가 자료를 검토 · waiting_firm/).waitFor();
    assert.match(await canonicalFollowup.textContent(), /담당 변호사가 자료를 검토 · waiting_firm/);

    await navigateMatterSection(page, "업무", "matter-work");
    const taskRow = page.locator(`[data-task-id="${TASK_ID}"]`).first();
    await taskRow.waitFor();
    const taskUpdated = await waitForHttp(page, {
      method: "PATCH",
      path: `/api/matter/ops/tasks/${TASK_ID}`,
      status: 200,
      action: () => taskRow.locator("select").selectOption("done"),
    });
    assert.equal(taskUpdated.body.item?.status, "done");
    await taskRow.waitFor({ state: "detached" });
    const doubleSubmittedTaskRow = page.locator(`[data-task-id="${doubleSubmittedTaskId}"]`).first();
    await doubleSubmittedTaskRow.waitFor();
    const doubleSubmittedTaskUpdated = await waitForHttp(page, {
      method: "PATCH",
      path: `/api/matter/ops/tasks/${doubleSubmittedTaskId}`,
      status: 200,
      action: () => doubleSubmittedTaskRow.locator("select").selectOption("done"),
    });
    assert.equal(doubleSubmittedTaskUpdated.body.item?.status, "done");
    await doubleSubmittedTaskRow.waitFor({ state: "detached" });

    await navigateMatterSection(page, "시간·청구", "matter-time-billing");
    const timeForm = page.locator('[data-matter-quick-time-entry="true"]');
    await timeForm.getByLabel("사건").selectOption(MATTER_ID);
    await timeForm.locator('input[type="date"]').fill(WORK_DATE);
    await timeForm.locator('input[type="number"]').fill("90");
    await timeForm.getByLabel("역할").selectOption("attorney");
    await timeForm.getByLabel("청구 여부").selectOption("billable");
    await timeForm.getByLabel("업무 내용").fill("RF-12 제출자료 검토와 의뢰인 통화");
    const timeCreated = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/time-entries",
      status: 201,
      action: () => timeForm.getByRole("button", { name: "저장", exact: true }).click(),
    });
    const timeEntryId = timeCreated.body.item?.time_entry_id;
    assert.ok(timeEntryId);
    assert.equal(timeCreated.body.item.role_id, "attorney");
    assert.equal(timeCreated.body.item.billable, true);
    await page.locator('[data-matter-time-mutation-status="data"]').waitFor();

    const weeklyRow = page.locator(`[data-time-week-actor="${ACCOUNT.user_id}"]`);
    await weeklyRow.waitFor();
    await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/time-weeks/submit",
      status: 200,
      action: () => weeklyRow.getByRole("button", { name: "주간 제출", exact: true }).click(),
    });
    await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/time-weeks/lock",
      status: 200,
      action: () => weeklyRow.getByRole("button", { name: "주간 잠금", exact: true }).click(),
    });
    await page.locator('[data-time-week-mutation-status="data"]').waitFor();

    await navigateMatterSection(page, "사건", "matter-list");
    overlay = await openMatterOverlay(page);
    await selectMatterBillingTab(overlay);
    const wipButton = overlay.getByRole("button", { name: "청구 준비", exact: true });
    assert.equal(await wipButton.isEnabled(), true);
    let dropFirstWipBrowserResponse = true;
    const wipRoutePattern = "**/api/matter/ops/wip**";
    const dropWipResponseAfterHandler = async (route) => {
      const request = route.request();
      const requestBody = parsedJson(request.postData());
      if (
        request.method() !== "POST"
        || requestBody?.action !== "generate"
        || !dropFirstWipBrowserResponse
      ) {
        await route.continue();
        return;
      }
      dropFirstWipBrowserResponse = false;
      const handlerResponse = await route.fetch();
      const responseBody = parsedJson(await handlerResponse.text());
      const url = new URL(request.url());
      handlerBackedDroppedResponses.push({
        method: request.method(),
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        status: handlerResponse.status(),
        request_body: redact(requestBody),
        response_body: redact(responseBody),
        browser_delivery: "dropped_after_actual_handler_response",
      });
      await route.abort("connectionfailed");
    };
    await page.route(wipRoutePattern, dropWipResponseAfterHandler);
    const firstWipDisabled = observeDisabled(wipButton);
    await wipButton.click();
    await wipButton.locator("xpath=..").getByText("처리하지 못했습니다.", { exact: true }).waitFor();
    assert.equal(await firstWipDisabled, true, "WIP action must disable while the handler response is pending");
    assert.equal(handlerBackedDroppedResponses.length, 1);
    assert.equal(handlerBackedDroppedResponses[0].status, 201);
    await waitForEnabled(wipButton);
    const replayWip = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/wip",
      status: 201,
      action: () => wipButton.click(),
    });
    await page.unroute(wipRoutePattern, dropWipResponseAfterHandler);
    await waitForEnabled(wipButton);
    const wipBodies = [handlerBackedDroppedResponses[0].response_body, replayWip.body];
    const wipCreated = wipBodies.find((body) => body.idempotent_replay !== true) ?? wipBodies[0];
    assert.equal(replayWip.body.idempotent_replay, true);
    assert.deepEqual(
      handlerBackedDroppedResponses[0].request_body,
      redact(replayWip.response.request().postDataJSON()),
      "network-unknown retry must re-POST the exact same source-set and idempotency key",
    );
    assert.equal(wipCreated.wip_items?.length, 1);
    assert.equal(wipCreated.wip_items?.[0]?.amount, EXPECTED_GROSS);
    assert.equal(
      new Set(wipBodies.map((body) => body.wip_items?.[0]?.wip_item_id)).size,
      1,
      "same source-set double submit must replay one WIP lineage",
    );

    const prebill = overlay.locator('[data-matter-prebill-review-action="true"]:visible');
    const prebillCreated = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/wip",
      status: 201,
      action: () => prebill.locator('[data-matter-prebill-create-action="true"]').click(),
    });
    const firstPrebillId = prebillCreated.body.prebill?.prebill_id;
    assert.ok(firstPrebillId);
    await selectMatterBillingTab(overlay);
    const visiblePrebillReject = overlay.locator('[data-matter-prebill-reject-action="true"]:visible');
    await visiblePrebillReject.waitFor();
    assert.equal(
      await prebill.locator("[data-matter-prebill-status]").getAttribute("data-matter-prebill-status"),
      "partner_review_required",
    );
    assert.equal(await overlay.locator('[data-matter-prebill-approve-adjust-action="true"]:visible').isEnabled(), true);
    await prebill.locator('[data-matter-prebill-reject-action="true"]').click();
    const rejectValidation = prebill.getByRole("alert");
    await rejectValidation.waitFor();
    assert.match(await rejectValidation.textContent(), /반려 사유/);
    assert.equal(
      await prebill.locator("[data-matter-prebill-status]").getAttribute("data-matter-prebill-status"),
      "partner_review_required",
    );
    assert.equal(await visiblePrebillReject.isEnabled(), true);
    await prebill.getByLabel("Write-down").fill(String(WRITE_DOWN));
    await prebill.getByLabel("조정·반려 사유").fill("실제 화면 품질 조정");
    const prebillApproved = await waitForHttp(page, {
      method: "POST",
      path: "/api/finance/prebills/approve",
      status: 200,
      action: () => prebill.locator('[data-matter-prebill-approve-adjust-action="true"]').click(),
    });
    assert.equal(prebillApproved.body.item?.status, "partner_approved");
    await selectMatterBillingTab(overlay);
    assert.equal(
      await prebill.locator("[data-matter-prebill-status]").getAttribute("data-matter-prebill-status"),
      "partner_approved",
    );
    assert.equal(
      await overlay.locator('[data-matter-invoice-issue-action="true"]:visible')
        .getByRole("button", { name: "발행", exact: true }).isEnabled(),
      true,
    );

    const invoiceWrite = await waitForHttp(page, {
      method: "POST",
      path: "/api/finance/invoices",
      status: 201,
      action: () => overlay.locator('[data-matter-invoice-issue-action="true"]').getByRole("button", { name: "발행", exact: true }).click(),
    });
    const invoiceId = invoiceWrite.body.item?.invoice_id;
    assert.ok(invoiceId);
    assert.equal(invoiceWrite.body.item.amount_due, EXPECTED_INVOICE);

    const paymentForm = overlay.locator('[data-matter-payment-form="true"]:visible');
    await paymentForm.locator('input[type="date"]').fill(WORK_DATE);
    await paymentForm.locator('input[type="number"]').fill(String(FIRST_PAYMENT));
    await paymentForm.locator('[data-matter-payment-allocation-type="true"]').selectOption("invoice_payment");
    const firstPayment = await waitForPaymentMutation(page, {
      path: "/api/matter/ops/payments",
      action: () => paymentForm.locator('[data-matter-payment-import-action="true"]').click(),
    });
    const firstPaymentId = firstPayment.body.item?.payment_id;
    assert.ok(firstPaymentId);
    await waitForPaymentMutation(page, {
      path: `/api/matter/ops/payments/${firstPaymentId}/allocations`,
      action: () => paymentForm.locator('[data-matter-payment-allocation-action="true"]').click(),
    });
    const partialAr = overlay.locator(`[data-matter-ar-balance="${EXPECTED_INVOICE - FIRST_PAYMENT}"]:visible`);
    await partialAr.waitFor();
    assert.equal(await partialAr.getAttribute("data-matter-ar-bucket"), "bucket_current");

    await paymentForm.locator('input[type="number"]').fill(String(FINAL_PAYMENT));
    const finalPayment = await waitForPaymentMutation(page, {
      path: "/api/matter/ops/payments",
      action: () => paymentForm.locator('[data-matter-payment-import-action="true"]').click(),
    });
    const finalPaymentId = finalPayment.body.item?.payment_id;
    assert.ok(finalPaymentId);
    await waitForPaymentMutation(page, {
      path: `/api/matter/ops/payments/${finalPaymentId}/allocations`,
      action: () => paymentForm.locator('[data-matter-payment-allocation-action="true"]').click(),
    });
    const zeroAr = overlay.locator('[data-matter-ar-balance="0"]:visible');
    await zeroAr.waitFor();

    await closeMatterOverlay(page);
    const secondarySession = await openBrowserSession(browser, {
      fixedTime: RF12_CLOCK.nowIso,
      viewport: { width: 1280, height: 900 },
      browserSession: "second-cycle-timekeeper",
      consoleErrors,
      pageErrors,
      externalBrowserRequests,
      pageErrorPrefix: "secondary:",
    });
    const {
      context: secondaryContext,
      page: secondaryPage,
      receipt: secondaryReceipt,
    } = secondarySession;
    try {
      await secondaryPage.goto(`http://127.0.0.1:${vitePort}/?view=auth&authStep=login`, {
        waitUntil: "domcontentloaded",
      });
      await secondaryPage.locator("[data-login-email]").fill(BACKUP_ACCOUNT.email);
      await secondaryPage.locator("[data-login-password]").fill(BACKUP_ACCOUNT.local_dev.synthetic_token);
      await waitForHttp(secondaryPage, {
        method: "POST",
        path: "/api/auth/login",
        status: 200,
        action: () => secondaryPage.locator("[data-login-form='email-password'] .matter-login-submit").click(),
      });
      await secondaryPage.locator('[data-global-rail="true"]').waitFor();
      await secondaryPage.locator('[data-product-axis="matters"]').click();
      await secondaryPage.locator('[data-matter-small-firm-screen="matter-today"]').waitFor();
      await navigateMatterSection(secondaryPage, "시간·청구", "matter-time-billing");
      const secondTimeForm = secondaryPage.locator('[data-matter-quick-time-entry="true"]');
      await secondTimeForm.getByLabel("사건").selectOption(MATTER_ID);
      await secondTimeForm.locator('input[type="date"]').fill(WORK_DATE);
      await secondTimeForm.locator('input[type="number"]').fill("60");
      await secondTimeForm.getByLabel("역할").selectOption("attorney");
      await secondTimeForm.getByLabel("청구 여부").selectOption("billable");
      await secondTimeForm.getByLabel("업무 내용").fill("RF-12 두 번째 청구 주기 검토");
      const secondTime = await waitForHttp(secondaryPage, {
        method: "POST",
        path: "/api/matter/ops/time-entries",
        status: 201,
        action: () => secondTimeForm.getByRole("button", { name: "저장", exact: true }).click(),
      });
      secondTimeEntryId = secondTime.body.item?.time_entry_id;
      assert.ok(secondTimeEntryId);
      const secondWeek = secondaryPage.locator(`[data-time-week-actor="${BACKUP_ID}"]`);
      await secondWeek.waitFor();
      await waitForHttp(secondaryPage, {
        method: "POST",
        path: "/api/matter/ops/time-weeks/submit",
        status: 200,
        action: () => secondWeek.getByRole("button", { name: "주간 제출", exact: true }).click(),
      });
      await waitForHttp(secondaryPage, {
        method: "POST",
        path: "/api/matter/ops/time-weeks/lock",
        status: 200,
        action: () => secondWeek.getByRole("button", { name: "주간 잠금", exact: true }).click(),
      });
      await secondaryPage.locator('[data-time-week-mutation-status="data"]').waitFor();
      secondaryHttpRows = await secondaryReceipt.flush();
    } finally {
      await secondaryContext.close();
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-global-rail="true"]').waitFor();
    await page.locator('[data-product-axis="matters"]').click();
    await page.locator('[data-matter-small-firm-screen="matter-today"]').waitFor();
    await navigateMatterSection(page, "사건", "matter-list");
    overlay = await openMatterOverlay(page);
    await selectMatterBillingTab(overlay);
    const secondWip = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/wip",
      status: 201,
      action: () => overlay.getByRole("button", { name: "청구 준비", exact: true }).click(),
    });
    assert.equal(secondWip.body.wip_items?.length, 1);
    assert.equal(secondWip.body.wip_items?.[0]?.source_id, secondTimeEntryId);
    assert.equal(secondWip.body.wip_items?.[0]?.amount, 100_000);
    const secondPrebill = overlay.locator('[data-matter-prebill-review-action="true"]:visible');
    const secondPrebillCreated = await waitForHttp(page, {
      method: "POST",
      path: "/api/matter/ops/wip",
      status: 201,
      action: () => secondPrebill.locator('[data-matter-prebill-create-action="true"]').click(),
    });
    assert.ok(secondPrebillCreated.body.prebill?.prebill_id);
    await selectMatterBillingTab(overlay);
    assert.equal(
      await secondPrebill.locator("[data-matter-prebill-status]").getAttribute("data-matter-prebill-status"),
      "partner_review_required",
    );
    assert.equal(
      await overlay.locator('[data-matter-prebill-approve-no-adjust-action="true"]:visible').isEnabled(),
      true,
    );
    const secondPrebillApproved = await waitForHttp(page, {
      method: "POST",
      path: "/api/finance/prebills/approve",
      status: 200,
      action: () => secondPrebill.locator('[data-matter-prebill-approve-no-adjust-action="true"]').click(),
    });
    assert.equal(secondPrebillApproved.body.item?.status, "partner_approved");
    const secondInvoice = await waitForHttp(page, {
      method: "POST",
      path: "/api/finance/invoices",
      status: 201,
      action: () => overlay.locator('[data-matter-invoice-issue-action="true"]').getByRole("button", { name: "발행", exact: true }).click(),
    });
    secondInvoiceId = secondInvoice.body.item?.invoice_id;
    assert.ok(secondInvoiceId);
    assert.equal(secondInvoice.body.item?.amount_due, 100_000);
    const secondPaymentForm = overlay.locator('[data-matter-payment-form="true"]:visible');
    await secondPaymentForm.locator('input[type="date"]').fill(WORK_DATE);
    await secondPaymentForm.locator('input[type="number"]').fill("100000");
    await secondPaymentForm.locator('[data-matter-payment-allocation-type="true"]').selectOption("invoice_payment");
    const secondPayment = await waitForPaymentMutation(page, {
      path: "/api/matter/ops/payments",
      action: () => secondPaymentForm.locator('[data-matter-payment-import-action="true"]').click(),
    });
    const secondPaymentId = secondPayment.body.item?.payment_id;
    assert.ok(secondPaymentId);
    await waitForPaymentMutation(page, {
      path: `/api/matter/ops/payments/${secondPaymentId}/allocations`,
      action: () => secondPaymentForm.locator('[data-matter-payment-allocation-action="true"]').click(),
    });
    await overlay.locator('[data-matter-ar-balance="0"]:visible').waitFor();
    await closeMatterOverlay(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-global-rail="true"]').waitFor();
    await page.locator('[data-product-axis="matters"]').click();
    await page.locator('[data-matter-small-firm-screen="matter-today"]').waitFor();
    await navigateMatterSection(page, "사건", "matter-list");
    overlay = await openMatterOverlay(page);
    const closeout = overlay.locator(".matter-detail-closeout");
    await closeout.getByRole("heading", { name: "종결 전 확인 0", exact: true }).waitFor();
    assert.match(
      await closeout.textContent(),
      /열린 업무, 기한, 미청구 시간과 미수금이 없습니다\./,
    );
    assert.equal(await closeout.getByRole("button", { name: "사건 종결", exact: true }).isEnabled(), true);
    const closeWrite = await waitForHttp(page, {
      method: "POST",
      path: `/api/matters/${MATTER_ID}/status-transitions`,
      status: 200,
      action: () => overlay.getByRole("button", { name: "사건 종결", exact: true }).click(),
    });
    assert.equal(closeWrite.body.item?.status, "closed");
    await overlay.locator('[data-matter-close-mutation-status="data"]').waitFor();
    await closeMatterOverlay(page);

    const listTabs = page.getByRole("tablist", { name: "사건 저장 보기" });
    await listTabs.getByRole("tab", { name: "종결", exact: true }).click();
    const closedRow = page.locator('[data-matter-small-firm-screen="matter-list"] tbody tr').filter({ hasText: MATTER_CODE });
    await closedRow.waitFor();
    await waitForHttp(page, {
      method: "POST",
      path: `/api/matter/ops/matters/${MATTER_ID}/archive`,
      status: 200,
      action: () => closedRow.getByRole("button", { name: "보관", exact: true }).click(),
    });
    await page.locator('[data-matter-archive-mutation-status="data"]').waitFor();
    await listTabs.getByRole("tab", { name: "보관", exact: true }).click();
    const archivedRow = page.locator('[data-matter-small-firm-screen="matter-list"] tbody tr').filter({ hasText: MATTER_CODE });
    await archivedRow.waitFor();
    await waitForHttp(page, {
      method: "POST",
      path: `/api/matter/ops/matters/${MATTER_ID}/restore`,
      status: 200,
      action: () => archivedRow.getByRole("button", { name: "복원", exact: true }).click(),
    });
    await page.locator('[data-matter-restore-mutation-status="data"]').waitFor();
    await listTabs.getByRole("tab", { name: "종결", exact: true }).click();
    await page.locator('[data-matter-small-firm-screen="matter-list"] tbody tr').filter({ hasText: MATTER_CODE }).waitFor();

    restartSequenceBoundary = Math.max(
      0,
      ...(await receipt.flush()).map((row) => row.sequence),
    );
    await closeServer(api.server);
    repositories.matterRepository.close();
    repositories.financeRepository.close();

    repositories = createRepositories({ matterPath, financePath, seed: false });
    api = createHttpServer({ repositories, stateDir });
    await listen(api.server, apiPort);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-global-rail="true"]').waitFor();
    assert.equal(
      (await receipt.flush()).filter((row) => row.method === "POST" && row.path === "/api/auth/login").length,
      1,
      "the signed session must survive repository and HTTP-server rehydration",
    );

    await page.locator('[data-product-axis="matters"]').click();
    await page.locator('[data-matter-small-firm-screen="matter-today"]').waitFor();
    await navigateMatterSection(page, "사건", "matter-list");
    const rehydratedTabs = page.getByRole("tablist", { name: "사건 저장 보기" });
    await rehydratedTabs.getByRole("tab", { name: "종결", exact: true }).click();
    await page.locator('[data-matter-small-firm-screen="matter-list"] tbody tr').filter({ hasText: MATTER_CODE }).waitFor();
    await navigateMatterSection(page, "연락·후속", "matter-followups");
    await page.locator(`[data-followup-id="${followupId}"]`).waitFor();
    await navigateMatterSection(page, "사건", "matter-list");
    await rehydratedTabs.getByRole("tab", { name: "종결", exact: true }).click();
    overlay = await openMatterOverlay(page);
    const rehydratedHandoffForm = overlay.locator('[data-matter-handoff-form="true"]');
    await rehydratedHandoffForm.waitFor();
    const ownerOptionIdsAfterRestart = await rehydratedHandoffForm
      .locator('[name="owner"] option')
      .evaluateAll((options) => options.map((option) => option.value).filter(Boolean).sort());
    assert.deepEqual(ownerOptionIdsAfterRestart, expectedPeopleIds);
    assert.deepEqual(
      await rehydratedHandoffForm.locator('[name="backup"] option').evaluateAll((options) =>
        options.map((option) => option.value).filter(Boolean).sort()),
      expectedPeopleIds,
    );
    await overlay.locator(`[data-matter-detail-owner="${ACCOUNT.user_id}"]`).waitFor();
    await overlay.locator(`[data-matter-detail-backup="${BACKUP_ID}"]`).waitFor();
    await selectMatterBillingTab(overlay);
    const rehydratedZeroAr = overlay.locator('[data-matter-ar-balance="0"]:visible');
    await rehydratedZeroAr.waitFor();
    const finalArBalance = Number(await rehydratedZeroAr.getAttribute("data-matter-ar-balance"));
    assert.equal(finalArBalance, 0);

    const matterSnapshot = repositories.matterRepository.snapshot();
    const financeSnapshot = repositories.financeRepository.snapshot();
    const matterRecords = matterSnapshot.records.filter((record) => record.tenant_id === TENANT);
    const financeRecords = financeSnapshot.records.filter((record) => record.tenant_id === TENANT);
    const matter = matterRecords.find((record) => record.model_type === "Matter" && record.matter_id === MATTER_ID);
    const task = matterRecords.find((record) => record.model_type === "MatterTask" && record.task_id === TASK_ID);
    const doubleSubmittedPersistedTask = matterRecords.find((record) =>
      record.model_type === "MatterTask" && record.task_id === doubleSubmittedTaskId);
    const followup = matterRecords.find((record) => record.model_type === "MatterFollowUp" && record.followup_id === followupId);
    const timeEntry = financeRecords.find((record) => record.model_type === "TimeEntry" && record.time_entry_id === timeEntryId);
    const secondTimeEntry = financeRecords.find((record) =>
      record.model_type === "TimeEntry" && record.time_entry_id === secondTimeEntryId);
    const invoice = financeRecords.find((record) => record.model_type === "Invoice" && record.invoice_id === invoiceId);
    const secondPersistedInvoice = financeRecords.find((record) =>
      record.model_type === "Invoice" && record.invoice_id === secondInvoiceId);
    const matterScopedFinance = financeRecords.filter((record) => record.matter_id === MATTER_ID);
    const billingAdjustments = recordsOf(financeRecords, "BillingAdjustment");
    const taskCount = matterRecords.filter((record) => record.model_type === "MatterTask").length;

    assert.equal(matter?.status, "closed");
    assert.equal(matter?.owner_user_id ?? matter?.responsible_lawyer, ACCOUNT.user_id);
    assert.equal(task?.status, "done");
    assert.equal(task?.assigned_to, ACCOUNT.user_id);
    assert.equal(doubleSubmittedPersistedTask?.status, "done");
    assert.equal(doubleSubmittedPersistedTask?.assigned_to, ACCOUNT.user_id);
    assert.equal(taskCount, 2);
    assert.equal(duplicateTaskCount(matterRecords), 0);
    assert.equal(followup?.status, "waiting_firm");
    assert.equal(followup?.next_action, "담당 변호사가 자료를 검토");
    assert.equal(timeEntry?.role_id, "attorney");
    assert.equal(timeEntry?.billable, true);
    assert.equal(timeEntry?.status, "locked");
    assert.equal(timeEntry?.approved_for_wip, true);
    assert.equal(secondTimeEntry?.status, "locked");
    assert.equal(secondTimeEntry?.approved_for_wip, true);
    assert.equal(recordsOf(matterScopedFinance, "WipItem").length, 2);
    assert.equal(recordsOf(matterScopedFinance, "WipSnapshot").length, 2);
    assert.equal(recordsOf(matterScopedFinance, "PreBill").length, 2);
    assert.equal(billingAdjustments.length, 1);
    assert.equal(billingAdjustments[0].prebill_id, firstPrebillId);
    assert.equal(billingAdjustments[0].amount, WRITE_DOWN);
    assert.equal(recordsOf(matterScopedFinance, "Invoice").length, 2);
    assert.equal(recordsOf(matterScopedFinance, "Payment").length, 3);
    assert.equal(recordsOf(matterScopedFinance, "PaymentAllocation").length, 3);
    assert.equal(invoice?.amount_due, EXPECTED_INVOICE);
    assert.equal(invoice?.amount_paid, EXPECTED_INVOICE);
    assert.equal(invoice?.lifecycle_status, "paid");
    assert.equal(secondPersistedInvoice?.amount_due, 100_000);
    assert.equal(secondPersistedInvoice?.amount_paid, 100_000);
    assert.equal(secondPersistedInvoice?.lifecycle_status, "paid");
    assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
    assert.equal(externalBrowserRequests.length, 0, JSON.stringify(externalBrowserRequests));

    rehydration = {
      people_count: matterRecords.filter((record) => record.model_type === "Person").length,
      matter_count: matterRecords.filter((record) => record.model_type === "Matter").length,
      matter_status: matter.status,
      task_count: taskCount,
      duplicate_matter_task_count: duplicateTaskCount(matterRecords),
      task_status: task.status,
      task_assigned_to: task.assigned_to,
      task_ids: [task.task_id, doubleSubmittedPersistedTask.task_id].sort(),
      task_create_double_submit: {
        visible_click_count: 2,
        http_attempt_count: taskCreateAttempts.length,
        stable_idempotency_key: taskCreateAttempts[0].idempotency_key,
      },
      followup_id: followup.followup_id,
      followup_status: followup.status,
      time_entry: {
        time_entry_id: timeEntry.time_entry_id,
        role_id: timeEntry.role_id,
        billable: timeEntry.billable,
        status: timeEntry.status,
        approved_for_wip: timeEntry.approved_for_wip,
      },
      finance_counts: Object.fromEntries([
        "WipItem",
        "WipSnapshot",
        "PreBill",
        "BillingAdjustment",
        "Invoice",
        "Payment",
        "PaymentAllocation",
      ].map((modelType) => [
        modelType,
        recordsOf(modelType === "BillingAdjustment" ? financeRecords : matterScopedFinance, modelType).length,
      ])),
      invoice: {
        invoice_id: invoice.invoice_id,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        lifecycle_status: invoice.lifecycle_status,
      },
      second_invoice: {
        invoice_id: secondPersistedInvoice.invoice_id,
        amount_due: secondPersistedInvoice.amount_due,
        amount_paid: secondPersistedInvoice.amount_paid,
        lifecycle_status: secondPersistedInvoice.lifecycle_status,
      },
      matter_audit_actions: matterSnapshot.audit_events.map((event) => event.action),
      finance_audit_actions: financeSnapshot.audit_events.map((event) => event.action),
    };
    assert.equal(rehydration.people_count, 10);
    assert.equal(rehydration.matter_count, 1);

    const primaryHttpRows = await receipt.flush();
    const httpRows = [
      ...primaryHttpRows.map((row) => ({ ...row, browser_session: "primary" })),
      ...secondaryHttpRows.map((row) => ({ ...row, browser_session: "second-cycle-timekeeper" })),
    ];
    const browserTransportFailures = httpRows.filter((row) => row.browser_delivery === "failed");
    const allHandlerRows = [
      ...httpRows.filter((row) => row.browser_delivery === "received"),
      ...handlerBackedDroppedResponses.map((row) => ({
        ...row,
        browser_session: "primary",
        transport_observation: "actual handler response withheld from browser",
      })),
    ];
    const handlerNon2xx = allHandlerRows.filter((row) =>
      Number.isInteger(row.status) && (row.status < 200 || row.status >= 300));
    const handlerNon2xxCounts = groupedCounts(handlerNon2xx, (row) =>
      `${row.browser_session} ${row.method} ${row.path} ${row.status}`);
    const browserTransportFailureCounts = groupedCounts(browserTransportFailures, (row) =>
      `${row.browser_session} ${row.method} ${row.path} ${row.failure}`);
    const consoleErrorCounts = groupedCounts(consoleErrors, (error) =>
      `${error.browser_session} ${consoleErrorPath(error) ?? "[no-url]"} ${error.text}`);
    t.diagnostic(`RF12_HTTP_NON_2XX ${JSON.stringify(handlerNon2xxCounts)}`);
    t.diagnostic(`RF12_BROWSER_TRANSPORT_FAILURES ${JSON.stringify(browserTransportFailureCounts)}`);
    t.diagnostic(`RF12_CONSOLE_ERRORS ${JSON.stringify(consoleErrorCounts)}`);

    assert.equal(
      handlerBackedDroppedResponses.length,
      1,
      "the scenario must contain exactly one actual-handler response dropped before browser delivery",
    );
    const droppedWipHandlerResponse = handlerBackedDroppedResponses[0];
    assert.equal(droppedWipHandlerResponse.method, "POST");
    assert.equal(droppedWipHandlerResponse.path, "/api/matter/ops/wip");
    assert.equal(droppedWipHandlerResponse.status, 201);
    const expectedTransportErrors = browserTransportFailures.filter((row) =>
      row.browser_session === "primary"
      && row.method === droppedWipHandlerResponse.method
      && row.path === droppedWipHandlerResponse.path
      && row.failure === "net::ERR_CONNECTION_FAILED"
      && JSON.stringify(row.request_body) === JSON.stringify(droppedWipHandlerResponse.request_body));
    assert.equal(
      expectedTransportErrors.length,
      1,
      `expected one browser transport loss correlated to the successful WIP handler response: ${JSON.stringify(browserTransportFailureCounts)}`,
    );
    const unexpectedTransportErrors = browserTransportFailures.filter((row) => !expectedTransportErrors.includes(row));
    assert.deepEqual(
      unexpectedTransportErrors,
      [],
      `unexpected browser transport failures: ${JSON.stringify(browserTransportFailureCounts)}`,
    );
    const expectedConsoleErrors = consoleErrors.filter((error) =>
      error.browser_session === "primary"
      && consoleErrorPath(error) === "/api/matter/ops/wip"
      && error.text === "Failed to load resource: net::ERR_CONNECTION_FAILED");
    assert.equal(
      expectedConsoleErrors.length,
      1,
      `the one expected console error must be the correlated WIP delivery loss: ${JSON.stringify(consoleErrorCounts)}`,
    );
    const unexpectedConsoleErrors = consoleErrors.filter((error) => !expectedConsoleErrors.includes(error));
    assert.deepEqual(
      unexpectedConsoleErrors,
      [],
      `unexpected console errors: ${JSON.stringify(consoleErrorCounts)}`,
    );
    assert.deepEqual(
      handlerNon2xx,
      [],
      `unexpected handler non-2xx responses: ${JSON.stringify(handlerNon2xxCounts)}`,
    );
    const requiredMutations = [
      ["POST", `/api/matter/ops/matters/${MATTER_ID}/handoffs`, 200],
      ["POST", "/api/matter/ops/tasks", 201],
      ["POST", "/api/matter/ops/followups", 201],
      ["PATCH", `/api/matter/ops/followups/${followupId}`, 200],
      ["PATCH", `/api/matter/ops/tasks/${TASK_ID}`, 200],
      ["PATCH", `/api/matter/ops/tasks/${doubleSubmittedTaskId}`, 200],
      ["POST", "/api/matter/ops/time-entries", 201],
      ["POST", "/api/matter/ops/time-weeks/submit", 200],
      ["POST", "/api/matter/ops/time-weeks/lock", 200],
      ["POST", "/api/matter/ops/wip", 201],
      ["POST", "/api/finance/prebills/approve", 200],
      ["POST", "/api/finance/invoices", 201],
      ["POST", "/api/matter/ops/payments", 201],
      ["POST", `/api/matters/${MATTER_ID}/status-transitions`, 200],
      ["POST", `/api/matter/ops/matters/${MATTER_ID}/archive`, 200],
      ["POST", `/api/matter/ops/matters/${MATTER_ID}/restore`, 200],
    ];
    for (const [method, path, statusCode] of requiredMutations) {
      assert.equal(
        allHandlerRows.some((row) => row.method === method && row.path === path && row.status === statusCode),
        true,
        `missing HTTP receipt ${method} ${path} ${statusCode}`,
      );
    }
    assert.equal(
      allHandlerRows.some((row) =>
        row.method === "POST"
        && row.path === "/api/matter/ops/time-entries"
        && row.request_body?.time_entry?.role_id === "attorney"
        && row.request_body?.time_entry?.billable === true),
      true,
      "quick-time receipt must retain selected role and billable state",
    );
    assert.equal(
      JSON.stringify(allHandlerRows).includes(ACCOUNT.local_dev.synthetic_token),
      false,
      "HTTP evidence must redact credentials",
    );
    assert.equal(
      primaryHttpRows.filter((row) => row.method === "POST" && row.path === "/api/auth/login").length,
      1,
    );
    assert.equal(
      allHandlerRows.filter((row) => row.method === "POST" && row.path === "/api/auth/login").length,
      2,
      "both billing cycles must be driven by visible authenticated product sessions",
    );
    assert.equal(
      allHandlerRows.filter((row) => row.method === "POST" && row.path === "/api/finance/prebills/reject").length,
      0,
      "empty reject reason must surface a visible client validation error without fabricating a handler receipt",
    );
    for (const [phase, predicate] of [
      ["before-restart", (row) => row.sequence <= restartSequenceBoundary],
      ["after-restart", (row) => row.sequence > restartSequenceBoundary],
    ]) {
      const employeesRead = primaryHttpRows.find((row) =>
        predicate(row) && row.method === "GET" && row.path === "/api/hrx/employees" && row.status === 200);
      const linksRead = primaryHttpRows.find((row) =>
        predicate(row) && row.method === "GET" && row.path === "/api/hrx/employee-user-links" && row.status === 200);
      assert.equal(employeesRead?.response_body?.employees?.length, 10, `${phase} employee options must come from ten HRX rows`);
      assert.equal(linksRead?.response_body?.links?.length, 10, `${phase} option links must come from ten HRX mappings`);
    }
    const requiredReads = [
      ["GET", `/api/matter/ops/followups/${followupId}`],
      ["GET", `/api/matter/ops/matters/${MATTER_ID}`],
      ["GET", `/api/matter/ops/matters/${MATTER_ID}/closeout`],
      ["GET", "/api/matter/ops/time-billing"],
      ["GET", "/api/matter/ops/payments"],
    ];
    for (const [method, path] of requiredReads) {
      assert.equal(
        allHandlerRows.some((row) =>
          row.method === method
          && row.path === path
          && row.status === 200
          && row.response_body !== "[UNAVAILABLE]"),
        true,
        `missing canonical reread ${method} ${path}`,
      );
    }
    const paymentMutationRows = primaryHttpRows.filter((row) =>
      row.method === "POST"
      && row.status === 201
      && (
        row.path === "/api/matter/ops/payments"
        || /\/api\/matter\/ops\/payments\/[^/]+\/allocations$/.test(row.path)
      ));
    assert.equal(paymentMutationRows.length, 6);
    const expectedArBalances = [
      EXPECTED_INVOICE,
      EXPECTED_INVOICE - FIRST_PAYMENT,
      EXPECTED_INVOICE - FIRST_PAYMENT,
      0,
      100_000,
      0,
    ];
    paymentMutationRows.forEach((mutation, index) => {
      const nextMutationSequence = paymentMutationRows[index + 1]?.sequence ?? Number.POSITIVE_INFINITY;
      const laterRows = primaryHttpRows.filter((row) =>
        row.sequence > mutation.sequence && row.sequence < nextMutationSequence);
      const timeBillingRead = laterRows.find((row) =>
        row.method === "GET" && row.path === "/api/matter/ops/time-billing");
      const paymentRead = laterRows.find((row) =>
        row.method === "GET" && row.path === "/api/matter/ops/payments");
      const detailRead = laterRows.find((row) =>
        row.method === "GET" && row.path === `/api/matter/ops/matters/${MATTER_ID}`);
      const closeoutRead = laterRows.find((row) =>
        row.method === "GET" && row.path === `/api/matter/ops/matters/${MATTER_ID}/closeout`);
      assert.equal(timeBillingRead?.response_body?.item?.ar?.totals?.balance, expectedArBalances[index]);
      const paymentId = mutation.response_body?.item?.payment_id ?? mutation.response_body?.payment?.payment_id;
      assert.equal(paymentRead?.response_body?.items?.some((item) =>
        item.payment_id === paymentId), true);
      assert.equal(detailRead?.response_body?.item?.matter?.matter_id ?? detailRead?.response_body?.item?.matter_id, MATTER_ID);
      assert.equal(typeof closeoutRead?.response_body?.can_close, "boolean");
    });
    const wipGenerateRows = [...handlerBackedDroppedResponses, ...primaryHttpRows].filter((row) =>
      row.method === "POST"
      && row.path === "/api/matter/ops/wip"
      && row.status === 201
      && row.request_body?.action === "generate");
    assert.equal(wipGenerateRows.length, 3);
    assert.equal(wipGenerateRows[0].request_body.source_set_id, wipGenerateRows[1].request_body.source_set_id);
    assert.notEqual(wipGenerateRows[1].request_body.source_set_id, wipGenerateRows[2].request_body.source_set_id);
    assert.equal(
      wipGenerateRows[0].response_body.wip_items?.[0]?.wip_item_id,
      wipGenerateRows[1].response_body.wip_items?.[0]?.wip_item_id,
    );
    assert.notEqual(
      wipGenerateRows[1].response_body.wip_items?.[0]?.wip_item_id,
      wipGenerateRows[2].response_body.wip_items?.[0]?.wip_item_id,
    );
    const prebillApproveRows = primaryHttpRows.filter((row) =>
      row.method === "POST" && row.path === "/api/finance/prebills/approve");
    assert.equal(prebillApproveRows.length, 2);
    assert.equal(prebillApproveRows.filter((row) => Boolean(row.request_body?.adjustment)).length, 1);
    assert.equal(prebillApproveRows.filter((row) => !row.request_body?.adjustment).length, 1);

    evidenceObservations = {
      primaryHttpRows,
      secondaryHttpRows,
      handlerBackedDroppedResponses,
      expectedTransportErrors,
      unexpectedTransportErrors,
      expectedConsoleErrors,
      unexpectedConsoleErrors,
      pageErrors,
      externalBrowserRequests,
      matterRecords,
      targetMatterId: MATTER_ID,
      ownerOptionIdsBefore: ownerOptionIds,
      ownerOptionIdsAfter: ownerOptionIdsAfterRestart,
      taskCreateAttempts,
      paymentMutationRows,
      wipGenerateRows,
      finalArBalance,
    };
  } finally {
    if (api?.server?.listening) await closeServer(api.server);
    assert.equal(api?.server?.listening ?? false, false, "loopback API server must stop");
    repositories?.matterRepository?.close();
    repositories?.financeRepository?.close();
    if (context) await context.close();
    if (browser) await browser.close();
    if (vite) await vite.close();
    await rm(stateDir, { recursive: true, force: true });
    let stateDirRemoved = false;
    try {
      await stat(stateDir);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      stateDirRemoved = true;
    }
    cleanupObservables = {
      api_server_stopped: !(api?.server?.listening ?? false),
      vite_server_stopped: !(vite?.httpServer?.listening ?? false),
      browser_disconnected: !(browser?.isConnected() ?? false),
      state_dir_removed: stateDirRemoved,
    };
    assert.deepEqual(cleanupObservables, {
      api_server_stopped: true,
      vite_server_stopped: true,
      browser_disconnected: true,
      state_dir_removed: true,
    });
  }

  if (evidenceDir && evidenceObservations) {
    const manifestPath = await publishRf12Evidence({
      evidenceDir,
      sourceFiles,
      observations: { ...evidenceObservations, cleanup: cleanupObservables },
      privateValues: [
        ACCOUNT.email,
        ACCOUNT.local_dev.synthetic_token,
        ACCOUNT.user_id,
        ACCOUNT.display_name,
        BACKUP_ACCOUNT.email,
        BACKUP_ACCOUNT.local_dev.synthetic_token,
        BACKUP_ACCOUNT.user_id,
        BACKUP_ACCOUNT.display_name,
        TENANT,
        MATTER_ID,
        MATTER_CODE,
        TASK_ID,
      ],
    });
    t.diagnostic(`EVIDENCE_RECORDED: ${relative(process.cwd(), manifestPath)}`);
  }
});
