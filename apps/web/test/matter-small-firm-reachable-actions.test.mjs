import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { installMatterUiSignedSession } from "./support/lawos-session-test-support.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR
  ? resolve(process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR)
  : null;
const [productStyles, matterStyles] = await Promise.all([
  readFile(resolve(webRoot, "src/styles.css"), "utf8"),
  readFile(resolve(webRoot, "src/components/matter-small-firm/matter-small-firm.css"), "utf8")
]);

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
    name: "matter-small-firm-reachable-actions-page",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== "/__matter-small-firm-reachable-actions__") return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end("<!doctype html><html data-skin=\"forest\" lang=\"ko\"><body><main id=\"root\" class=\"page-canvas\"></main></body></html>");
      });
    }
  };
}

async function openHarness() {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    plugins: [fixturePagePlugin()],
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  await server.listen();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${port}/__matter-small-firm-reachable-actions__`, { waitUntil: "domcontentloaded" });
  await addHarnessStyles(page);
  return { browser, page, port, server };
}

async function addHarnessStyles(page) {
  await page.addStyleTag({
    content: `${productStyles}\n${matterStyles}\n
      html, body { width: 100%; min-width: 0; margin: 0; }
      body { overflow-x: hidden; }
      *, *::before, *::after { box-sizing: border-box; }
      .reachable-actions-fixture { display: grid; gap: 24px; padding: 24px; }
      [data-reachable-case] { min-width: 0; padding: 16px; border: 1px solid var(--am-border); background: var(--am-canvas); }
    `
  });
}

async function mountUiHarness(page) {
  await page.evaluate(async () => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MatterOperationsSurface } = await import("/src/components/matter-small-firm/MatterOperationsSurface.jsx");
    const { MatterDetailTabs } = await import("/src/components/matter-small-firm/MatterDetailTabs.jsx");
    const { ChargePanel } = await import("/src/components/MattersSurface.jsx");
    const h = React.createElement;

    const matter = {
      matter_id: "matter-reachable-1",
      matter_code: "K-2026-031",
      title: "도달 경로 검증 사건",
      owner_user_id: "person-01",
      backup_user_id: "person-02",
      status: "open"
    };
    const closedMatter = {
      ...matter,
      matter_id: "matter-reachable-closed",
      matter_code: "K-2025-077",
      title: "보관 대기 사건",
      status: "closed"
    };
    const tasks = [
      { task_id: "task-todo", matter_id: matter.matter_id, title: "예정 업무", owner_user_id: "person-01", status: "todo" },
      { task_id: "task-progress", matter_id: matter.matter_id, title: "진행 업무", owner_user_id: "person-01", status: "in_progress" },
      { task_id: "task-blocked", matter_id: matter.matter_id, title: "막힘 업무", owner_user_id: "person-01", status: "blocked" },
      { task_id: "task-done", matter_id: matter.matter_id, title: "완료 업무", owner_user_id: "person-01", status: "done" },
      { task_id: "task-cancelled", matter_id: matter.matter_id, title: "취소 업무", owner_user_id: "person-01", status: "cancelled" }
    ];
    const deadline = {
      event_id: "deadline-reachable-1",
      matter_id: matter.matter_id,
      title: "준비서면 제출",
      starts_at: "2026-08-03T09:00:00.000+09:00",
      ends_at: "2026-08-03T10:00:00.000+09:00",
      source: "calendar",
      ledger_ref: { model_type: "MatterCalendarEvent", id: "deadline-reachable-1", matter_id: matter.matter_id }
    };
    window.__reachableEvents = [];

    function UiHarness() {
      const [workRows, setWorkRows] = React.useState(tasks);
      const [taskCreateResult, setTaskCreateResult] = React.useState(null);
      const [followupView, setFollowupView] = React.useState("today");
      const [timeResult, setTimeResult] = React.useState(null);
      const [timeWeekResult, setTimeWeekResult] = React.useState(null);
      const [deadlineResult, setDeadlineResult] = React.useState(null);
      const [deadlineHistory, setDeadlineHistory] = React.useState(null);
      const [listView, setListView] = React.useState("closed");
      const [listMatters, setListMatters] = React.useState([matter, closedMatter]);
      const [archiveResult, setArchiveResult] = React.useState(null);
      const [prebillResult, setPrebillResult] = React.useState(null);

      function createTask(payload) {
        window.__reachableEvents.push({ type: "task-create", payload });
        const item = {
          task_id: "task-created",
          matter_id: payload.matterId,
          title: payload.title,
          owner_user_id: payload.assignedTo,
          due_at: payload.dueAt,
          priority: payload.priority,
          status: "todo"
        };
        setWorkRows((current) => [item, ...current]);
        setTaskCreateResult({ kind: "data", item });
      }

      function createTime(payload) {
        window.__reachableEvents.push({ type: "time-create", payload });
        setTimeResult({ kind: "data", item: { time_entry_id: "time-created", ...payload } });
      }

      function weekly(action, payload) {
        window.__reachableEvents.push({ type: `time-week-${action}`, payload });
        setTimeWeekResult({ kind: "data", item: { status: action === "unlock" ? "submitted" : `${action}ed` } });
      }

      function reschedule(row, payload) {
        window.__reachableEvents.push({ type: "deadline-reschedule", row, payload });
        setDeadlineResult({ kind: "data", item: { ...row, starts_at: payload.startsAt, ends_at: payload.endsAt } });
        setDeadlineHistory({
          kind: "data",
          items: [{ history_id: "deadline-history-1", reason: payload.reason, occurred_at: "2026-07-31T01:00:00.000Z" }]
        });
      }

      function archive(selected) {
        window.__reachableEvents.push({ type: "archive", matter_id: selected.matter_id });
        setListMatters((current) => current.map((row) => row.matter_id === selected.matter_id ? { ...row, status: "archived" } : row));
        setArchiveResult({ kind: "data", item: { ...selected, status: "archived" } });
        setListView("archived");
      }

      const common = {
        matters: [matter, closedMatter],
        mattersResult: { kind: "data", items: listMatters },
        onRetry() {},
        onSelectMatter(matterId, ledgerRef) {
          window.__reachableEvents.push({ type: "select-ledger", matterId, ledgerRef });
        },
        onNavigateSection() {}
      };
      return h("div", { className: "reachable-actions-fixture" },
        h("section", { "data-reachable-case": "work" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-work",
            mode: "new",
            result: { kind: "data", items: workRows },
            workView: "my",
            workLayout: "board",
            onWorkViewChange() {},
            onWorkLayoutChange() {},
            onTaskStatusChange(task, status, reason) {
              window.__reachableEvents.push({ type: "task-transition", task_id: task.task_id, status, reason });
            },
            taskCreatePending: false,
            taskCreateResult,
            onCreateTask: createTask
          })
        ),
        ...[
          ["task-denied", { kind: "guarded", status: 403, message: "업무를 저장할 권한이 없습니다." }],
          ["task-network", { kind: "error", status: 0, message: "네트워크 연결을 확인해 주세요." }]
        ].map(([name, taskResult]) =>
          h("section", { key: name, "data-reachable-case": name },
            h(MatterOperationsSurface, {
              ...common,
              section: "matter-work",
              mode: "new",
              result: { kind: "data", items: [] },
              workView: "my",
              workLayout: "list",
              onWorkViewChange() {},
              onWorkLayoutChange() {},
              onTaskStatusChange() {},
              taskCreatePending: false,
              taskCreateResult: taskResult,
              onCreateTask() {}
            })
          )
        ),
        h("section", { "data-reachable-case": "followups" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-followups",
            result: {
              kind: "data",
              item: {
                views: {
                  today: [{ followup_id: "followup-today", matter_id: matter.matter_id, title: "오늘 연락" }],
                  waiting_client: [{ followup_id: "followup-waiting", matter_id: matter.matter_id, title: "의뢰인 답변" }],
                  stale_7d: [{ followup_id: "followup-stale", matter_id: matter.matter_id, title: "오래 연락 없음" }]
                }
              }
            },
            followupView,
            onFollowupViewChange: setFollowupView,
            onCreateMeeting() {}
          })
        ),
        h("section", { "data-reachable-case": "time" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-time-billing",
            result: {
              kind: "data",
              item: {
                weekly_time: {
                  items: [{
                    actor_id: "person-01",
                    display_name: "김파트너",
                    week_start: "2026-07-27",
                    week_end: "2026-08-02",
                    entered_dates: ["2026-07-27"],
                    missing_dates: [],
                    total_minutes: 60,
                    complete: true
                  }],
                  summary: { total_minutes: 60, incomplete_actor_count: 0 }
                },
                wip: { rows: [], totals: { total_amount: 0 } },
                ar: { rows: [], totals: { balance: 0 } }
              }
            },
            timeBillingView: "time",
            onTimeBillingViewChange() {},
            timeEntryPending: false,
            timeEntryResult: timeResult,
            onCreateTimeEntry: createTime,
            timeWeekPendingAction: null,
            timeWeekResult,
            onSubmitTimeWeek: (payload) => weekly("submit", payload),
            onLockTimeWeek: (payload) => weekly("lock", payload),
            onUnlockTimeWeek: (payload) => weekly("unlock", payload)
          })
        ),
        h("section", { "data-reachable-case": "calendar" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-calendar",
            result: { kind: "data", items: [deadline] },
            deadlineReschedulePendingId: null,
            deadlineRescheduleResult: deadlineResult,
            deadlineHistoryResult: deadlineHistory,
            onRescheduleDeadline: reschedule
          })
        ),
        h("section", { "data-reachable-case": "archive" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-list",
            mode: listView,
            listView,
            matters: listMatters,
            onListViewChange: setListView,
            archivePendingId: null,
            archiveResult,
            onArchiveMatter: archive,
            onRestoreMatter() {}
          })
        ),
        h("section", { "data-reachable-case": "prebill" },
          h(ChargePanel, {
            operationMode: "billing",
            showAccountingExport: false,
            timeResult: { kind: "data", items: [] },
            invoiceResult: { kind: "data", items: [] },
            agingResult: { kind: "data", items: [], summary: { balance: 0 } },
            financeAuditResult: { kind: "data", items: [] },
            matter,
            matterId: matter.matter_id,
            wipResult: { kind: "data", items: [{ wip_item_id: "wip-1", amount: 100000, currency: "KRW" }] },
            prebillResult,
            paymentForm: {},
            timeEntryForm: { workDate: "", durationMinutes: "", narrative: "", roleId: "partner", billable: true },
            expenseForm: { expenseDate: "", amount: "", receiptDocumentId: "", currency: "KRW" },
            disbursementForm: { disbursedAt: "", amount: "", vendorRef: "", currency: "KRW" },
            accountingExportForm: { fromDate: "", toDate: "" },
            onTimeEntryFormChange() {},
            onExpenseFormChange() {},
            onDisbursementFormChange() {},
            onPaymentFormChange() {},
            onAccountingExportFormChange() {},
            onToggleTimeTimer() {},
            onCreateTimeEntry() {},
            onCreateExpense() {},
            onCreateDisbursement() {},
            onGenerateWip() {},
            onCreatePreBill() {
              window.__reachableEvents.push({ type: "prebill-create" });
              setPrebillResult({ kind: "data", item: { prebill_id: "prebill-1", status: "partner_review_required" } });
            },
            onApprovePreBill(payload) {
              window.__reachableEvents.push({ type: "prebill-approve", payload });
              setPrebillResult({ kind: "data", item: { prebill_id: "prebill-1", status: "partner_approved" } });
            },
            onRejectPreBill(payload) {
              window.__reachableEvents.push({ type: "prebill-reject", payload });
              setPrebillResult({ kind: "data", item: { prebill_id: "prebill-1", status: "rejected" } });
            },
            onIssueInvoice() {},
            onImportPayment() {},
            onMatchPayment() {},
            onCreateAccountingExport() {}
          })
        ),
        ...["loading", "error", "denied", "blocked"].map((state) =>
          h("section", { key: `detail-${state}`, "data-reachable-case": `detail-${state}` },
            h(MatterDetailTabs, {
              matter,
              detailResult: state === "loading"
                ? null
                : state === "error"
                  ? { kind: "error", message: "detail failed" }
                  : state === "denied"
                    ? { kind: "guarded", uiState: "denied" }
                    : { kind: "blocked", uiState: "blocked", message: "detail blocked" },
              timeResult: state === "error" ? { kind: "error", message: "billing failed" } : null,
              invoiceResult: state === "error" ? { kind: "error", message: "billing failed" } : null,
              agingResult: state === "error" ? { kind: "error", message: "billing failed" } : null,
              billingPanel: h("div", { "data-unsafe-billing-content": true }, "정상 청구 콘텐츠"),
              onOpenVault() {}
            })
          )
        ),
        h("section", { "data-reachable-case": "detail-ledger" },
          h(MatterDetailTabs, {
            matter,
            detailResult: {
              kind: "data",
              item: {
                tasks,
                deadlines: [deadline],
                tab_data: { documents: [], time_billing: [], contact_history: [] },
                summary: {}
              }
            },
            selectedLedgerRef: { model_type: "MatterTask", id: "task-done", matter_id: matter.matter_id },
            billingPanel: null,
            onOpenVault() {}
          })
        )
      );
    }

    createRoot(document.getElementById("root")).render(h(UiHarness));
  });
}

test("reachable Matter UI renders real forms, canonical transitions, weekly commands, archive, deadline history, and truthful detail states", { timeout: 60_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const { browser, page, server } = await openHarness();
  try {
    await mountUiHarness(page);

    const work = page.locator('[data-reachable-case="work"]');
    const quickTask = work.locator('[data-matter-quick-task-form="true"]');
    await quickTask.waitFor();
    await quickTask.getByRole("button", { name: "업무 저장" }).click();
    await quickTask.getByRole("alert").waitFor();
    assert.match(await quickTask.textContent(), /사건과 제목, 담당자, 기한을 입력/);
    await quickTask.getByLabel("사건").selectOption("matter-reachable-1");
    await quickTask.getByLabel("제목").fill("새 준비 업무");
    await quickTask.getByLabel("담당").fill("person-02");
    await quickTask.getByLabel("기한").fill("2026-08-05T16:30");
    await quickTask.getByLabel("우선순위").selectOption("high");
    await quickTask.getByRole("button", { name: "업무 저장" }).click();
    await work.locator('[data-task-id="task-created"]').waitFor();
    assert.match(await quickTask.textContent(), /업무를 저장했습니다/);
    assert.match(await page.locator('[data-reachable-case="task-denied"] [role="alert"]').textContent(), /권한이 없습니다/);
    assert.match(await page.locator('[data-reachable-case="task-network"] [role="alert"]').textContent(), /네트워크 연결/);

    const boardColumns = await work.locator("[data-matter-board-column]").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-matter-board-column")));
    assert.deepEqual(boardColumns, ["todo", "in_progress", "blocked", "done", "cancelled"]);
    assert.equal(await work.locator('[data-task-id="task-done"]').count(), 1);
    assert.equal(await work.locator('[data-task-id="task-cancelled"]').count(), 1);
    for (const [taskId, expectedOptions] of Object.entries({
      "task-todo": ["예정", "진행", "막힘", "완료", "취소"],
      "task-progress": ["진행", "막힘", "완료", "취소"],
      "task-blocked": ["막힘", "진행", "취소"],
      "task-done": ["완료", "진행"],
      "task-cancelled": ["취소"]
    })) {
      assert.deepEqual(
        await work.locator(`[data-task-id="${taskId}"] select option`).allTextContents(),
        expectedOptions,
        taskId
      );
    }

    const followups = page.locator('[data-reachable-case="followups"]');
    const followupTabs = followups.getByRole("tablist", { name: "연락 후속 저장 보기" });
    assert.deepEqual(await followupTabs.getByRole("tab").allTextContents(), ["오늘 후속", "의뢰인 답변 대기", "7일 연락 없음"]);
    await followupTabs.getByRole("tab", { name: "의뢰인 답변 대기" }).click();
    await followups.locator('[data-followup-id="followup-waiting"]').waitFor();
    await followupTabs.getByRole("tab", { name: "7일 연락 없음" }).click();
    await followups.locator('[data-followup-id="followup-stale"]').waitFor();

    const time = page.locator('[data-reachable-case="time"]');
    const quickTime = time.locator('[data-matter-quick-time-entry="true"]');
    await quickTime.getByLabel("사건").selectOption("matter-reachable-1");
    await quickTime.getByLabel("일자").fill("2026-07-31");
    await quickTime.getByLabel("분").fill("75");
    await quickTime.getByLabel("업무 내용").fill("준비서면 검토");
    await quickTime.getByLabel("역할").selectOption("attorney");
    await quickTime.getByLabel("청구 여부").selectOption("non_billable");
    await quickTime.getByRole("button", { name: "저장" }).click();
    await quickTime.locator('[data-matter-time-mutation-status="data"]').waitFor();

    const weekly = time.locator('[data-time-week-actor="person-01"]');
    await weekly.getByRole("button", { name: "주간 제출" }).click();
    await weekly.getByRole("button", { name: "주간 잠금" }).click();
    await weekly.getByRole("button", { name: "잠금 해제" }).click();
    const unlockForm = time.locator('[data-time-week-unlock-form="true"]');
    await unlockForm.getByRole("button", { name: "해제" }).click();
    await unlockForm.getByRole("alert").waitFor();
    await unlockForm.getByLabel("해제 사유").fill("서술 보정");
    await unlockForm.getByRole("button", { name: "해제" }).click();
    await time.locator('[data-time-week-mutation-status="data"]').waitFor();

    const calendar = page.locator('[data-reachable-case="calendar"]');
    await calendar.locator('[data-ledger-id="deadline-reachable-1"]').click();
    await calendar.getByRole("button", { name: "기한 변경" }).click();
    const reschedule = calendar.locator('[data-deadline-reschedule-form="true"]');
    await reschedule.getByLabel("새 시작").fill("2026-08-04T09:30");
    await reschedule.getByLabel("새 종료").fill("2026-08-04T10:30");
    await reschedule.getByLabel("변경 사유").fill("법원 보정명령 반영");
    await reschedule.getByRole("button", { name: "변경 저장" }).click();
    await calendar.locator('[data-deadline-history="true"]').waitFor();
    assert.match(await calendar.textContent(), /법원 보정명령 반영/);

    const archive = page.locator('[data-reachable-case="archive"]');
    await archive.getByRole("button", { name: "보관", exact: true }).click();
    await archive.locator('[data-matter-archive-mutation-status="data"]').waitFor();
    assert.equal(await archive.getByRole("tab", { name: "보관", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await archive.locator("text=K-2025-077").count(), 1);

    const prebill = page.locator('[data-reachable-case="prebill"]');
    await prebill.getByRole("button", { name: "PreBill 생성" }).click();
    await prebill.locator('[data-matter-prebill-status="partner_review_required"]').waitFor();
    await prebill.getByLabel("Write-down").fill("120000");
    await prebill.getByLabel("조정·반려 사유").fill("scope_adjustment");
    await prebill.getByRole("button", { name: "조정 후 승인" }).click();
    await prebill.getByRole("alert").waitFor();
    assert.match(await prebill.textContent(), /WIP 금액을 초과/);
    if (evidenceDir) {
      await page.screenshot({ path: join(evidenceDir, "matter-prebill-over-adjust-1440.png"), fullPage: true });
    }
    await prebill.getByLabel("Write-down").fill("10000");
    await prebill.getByRole("button", { name: "조정 후 승인" }).click();
    await prebill.locator('[data-matter-prebill-status="partner_approved"]').waitFor();
    assert.match(await prebill.textContent(), /승인/);

    for (const state of ["loading", "error", "denied", "blocked"]) {
      const detail = page.locator(`[data-reachable-case="detail-${state}"]`);
      await detail.getByRole("tab", { name: /문서/ }).click();
      assert.equal(await detail.locator(`[data-matter-ops-state="${state}"]`).count(), 1, `documents ${state}`);
      await detail.getByRole("tab", { name: /시간·청구/ }).click();
      assert.equal(await detail.locator("[data-unsafe-billing-content]").count(), 0, `billing ${state} must not render content`);
    }

    const selectedDetail = page.locator('[data-reachable-case="detail-ledger"]');
    assert.equal(await selectedDetail.getByRole("tab", { name: /업무·기한/ }).getAttribute("aria-selected"), "true");
    assert.equal(await selectedDetail.locator('[data-selected-ledger="true"][data-task-id="task-done"]').count(), 1);

    const events = await page.evaluate(() => window.__reachableEvents);
    const createdTask = events.find(({ type }) => type === "task-create")?.payload;
    assert.deepEqual(
      {
        matterId: createdTask.matterId,
        title: createdTask.title,
        assignedTo: createdTask.assignedTo,
        dueAt: createdTask.dueAt,
        priority: createdTask.priority
      },
      {
        matterId: "matter-reachable-1",
        title: "새 준비 업무",
        assignedTo: "person-02",
        dueAt: "2026-08-05T16:30",
        priority: "high"
      }
    );
    assert.match(createdTask.idempotencyKey, /^matter_task_create_/);
    assert.deepEqual(events.find(({ type }) => type === "time-create")?.payload, {
      matterId: "matter-reachable-1",
      roleId: "attorney",
      workDate: "2026-07-31",
      durationMinutes: 75,
      narrative: "준비서면 검토",
      billable: false
    });
    assert.equal(events.find(({ type }) => type === "time-week-unlock")?.payload.reason, "서술 보정");
    assert.deepEqual(events.find(({ type }) => type === "select-ledger")?.ledgerRef, {
      model_type: "MatterCalendarEvent",
      id: "deadline-reachable-1",
      matter_id: "matter-reachable-1"
    });
    assert.deepEqual(events.find(({ type }) => type === "prebill-approve")?.payload, {
      adjustmentAmount: 10000,
      reasonCode: "scope_adjustment"
    });

    const screenshot = evidenceDir ? join(evidenceDir, "matter-reachable-actions-1440.png") : null;
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "matter-reachable-ui-events.json"),
        `${JSON.stringify({ events, screenshot }, null, 2)}\n`,
        "utf8"
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("rendered task create retains one retry key, blocks double-submit, and hides mutations for non-data read states", { timeout: 60_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const { browser, page, server } = await openHarness();
  const requests = [];
  try {
    await installMatterUiSignedSession(page);
    await page.route("**/api/matter/ops/tasks**", async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      requests.push(body);
      if (requests.length === 1) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            request_id: "task-retry-1",
            outcome: "blocked",
            ui_state: "error",
            items: [],
            safe_error_codes: ["MATTER_RUNTIME_UNAVAILABLE"],
            audit_hint_ref: "task_retry",
            production_ready_claim: false,
            message: "업무 저장 서버에 연결하지 못했습니다."
          })
        });
      }
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          request_id: "task-retry-2",
          outcome: "created",
          ui_state: "populated",
          item: { task_id: "task-retry-created", matter_id: "matter-task-retry", status: "todo" },
          safe_error_codes: [],
          audit_hint_ref: "task_retry",
          production_ready_claim: false
        })
      });
    });
    await page.evaluate(async () => {
      const ReactModule = await import("/@id/react");
      const React = ReactModule.default ?? ReactModule;
      const ReactDomClientModule = await import("/@id/react-dom/client");
      const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
      const { MatterOperationsSurface } = await import("/src/components/matter-small-firm/MatterOperationsSurface.jsx");
      const { MatterDetailTabs } = await import("/src/components/matter-small-firm/MatterDetailTabs.jsx");
      const { createMatterOpsTask } = await import("/src/data/apiClient.js");
      const h = React.createElement;
      const matter = {
        matter_id: "matter-task-retry",
        matter_code: "K-2026-099",
        title: "재시도 검증 사건",
        status: "open"
      };

      function RetryHarness() {
        const [pending, setPending] = React.useState(false);
        const [result, setResult] = React.useState(null);
        async function create(payload) {
          setPending(true);
          setResult(null);
          const next = await createMatterOpsTask(payload);
          setResult(next);
          setPending(false);
        }
        return h(MatterOperationsSurface, {
          section: "matter-work",
          mode: "new",
          result: { kind: "data", items: [] },
          matters: [matter],
          workView: "my",
          workLayout: "list",
          onWorkViewChange() {},
          onWorkLayoutChange() {},
          onTaskStatusChange() {},
          taskCreatePending: pending,
          taskCreateResult: result,
          onCreateTask: create
        });
      }

      const stateCases = [
        ["denied", { kind: "guarded", uiState: "denied" }],
        ["blocked", { kind: "blocked", uiState: "blocked" }],
        ["error", { kind: "error", uiState: "error", message: "읽기 실패" }]
      ];
      createRoot(document.getElementById("root")).render(
        h("div", { className: "reachable-actions-fixture" },
          h("section", { "data-task-retry-case": "true" }, h(RetryHarness)),
          ...stateCases.map(([state, result]) =>
            h("section", { key: state, "data-mutation-read-state": state },
              h(MatterOperationsSurface, {
                section: "matter-work",
                mode: "new",
                result,
                matters: [matter],
                workView: "my",
                workLayout: "list",
                onWorkViewChange() {},
                onWorkLayoutChange() {},
                onTaskStatusChange() {},
                onCreateTask() {}
              })
            )),
          h("section", { "data-detail-empty-case": "true" },
            h(MatterDetailTabs, {
              matter,
              detailResult: {
                kind: "data",
                item: {
                  summary: {},
                  tab_data: { documents: [], time_billing: [], contact_history: [], work_deadlines: [] }
                }
              },
              timeResult: { kind: "data", items: [] },
              invoiceResult: { kind: "data", items: [] },
              agingResult: { kind: "data", items: [] },
              billingPanel: h("div", { "data-unsafe-empty-billing": "true" }, "표시되면 안 됨"),
              onOpenVault() {}
            })
          )
        )
      );
    });

    const retry = page.locator('[data-task-retry-case="true"]');
    const form = retry.locator('[data-matter-quick-task-form="true"]');
    await form.getByLabel("사건").selectOption("matter-task-retry");
    await form.getByLabel("제목").fill("안정 재시도 업무");
    await form.getByLabel("담당").fill("person-retry");
    await form.getByLabel("기한").fill("2026-08-07T09:30");
    const submit = form.locator('[data-matter-task-create-submit="true"]');
    await submit.evaluate((button) => {
      button.click();
      button.click();
    });
    await page.waitForTimeout(50);
    assert.equal(requests.length, 1, "double click must produce one in-flight request");
    assert.equal(await submit.isDisabled(), true);
    await form.locator('[data-matter-task-create-status="error"]').waitFor();
    await submit.click();
    await form.locator('[data-matter-task-create-status="data"]').waitFor();
    assert.equal(requests.length, 2);
    assert.equal(requests[0].idempotency_key, requests[1].idempotency_key);
    assert.equal(
      requests[0].task.due_at,
      await page.evaluate(() => new Date(2026, 7, 7, 9, 30).toISOString())
    );

    for (const state of ["denied", "blocked", "error"]) {
      const section = page.locator(`[data-mutation-read-state="${state}"]`);
      assert.equal(await section.locator('[data-matter-quick-task-form="true"]').count(), 0);
      assert.equal(await section.getByRole("button", { name: "새 업무" }).count(), 0);
    }

    const detail = page.locator('[data-detail-empty-case="true"]');
    await detail.getByRole("tab", { name: /문서/ }).click();
    assert.equal(await detail.locator('[data-matter-ops-state="empty"]').count(), 1);
    assert.equal(await detail.getByRole("button", { name: /Vault에서 열기/ }).count(), 0);
    await detail.getByRole("tab", { name: /시간·청구/ }).click();
    assert.equal(await detail.locator('[data-matter-ops-state="empty"]').count(), 1);
    assert.equal(await detail.locator("[data-unsafe-empty-billing]").count(), 0);

    const screenshot = evidenceDir ? join(evidenceDir, "matter-task-retry-guarded-1440.png") : null;
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "matter-task-retry-guarded.json"),
        `${JSON.stringify({ requests, screenshot }, null, 2)}\n`,
        "utf8"
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("rendered PreBill controls keep create, unadjusted approval, adjusted approval, and rejection as separate HTTP actions", { timeout: 60_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const { browser, page, server } = await openHarness();
  const requests = [];
  try {
    await installMatterUiSignedSession(page);
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const body = request.postDataJSON();
      requests.push({ method: request.method(), path: url.pathname, body });
      const base = {
        request_id: `prebill-visible-${requests.length}`,
        ui_state: "populated",
        safe_error_codes: [],
        audit_hint_ref: "prebill_visible",
        production_ready_claim: false
      };
      if (url.pathname === "/api/matter/ops/wip" && body.action === "prebill") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "created",
            prebill: { ...body.prebill, matter_id: body.matter_id, status: "partner_review_required" },
            wip_snapshot: { wip_snapshot_id: body.wip_snapshot_id, immutable_snapshot: true }
          })
        });
      }
      if (url.pathname === "/api/finance/prebills/approve") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "approved",
            item: { prebill_id: body.prebill_id, status: "partner_approved" },
            ...(body.adjustment ? { adjustment: body.adjustment } : {})
          })
        });
      }
      if (url.pathname === "/api/finance/prebills/reject") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "rejected",
            item: { prebill_id: body.prebill_id, status: "rejected", reason_code: body.reason_code }
          })
        });
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ ...base, outcome: "blocked", ui_state: "error" })
      });
    });
    await page.evaluate(async () => {
      const ReactModule = await import("/@id/react");
      const React = ReactModule.default ?? ReactModule;
      const ReactDomClientModule = await import("/@id/react-dom/client");
      const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
      const { ChargePanel } = await import("/src/components/MattersSurface.jsx");
      const {
        approveFinancePreBill,
        createMatterOpsPreBill,
        rejectFinancePreBill
      } = await import("/src/data/apiClient.js");
      const h = React.createElement;
      const matter = {
        matter_id: "matter-prebill-visible",
        matter_code: "K-2026-101",
        title: "PreBill 단계 검증",
        status: "open"
      };

      function PreBillFlow({ mode }) {
        const [result, setResult] = React.useState(null);
        const [pending, setPending] = React.useState(false);
        const wipItem = {
          wip_item_id: `wip-visible-${mode}`,
          matter_id: matter.matter_id,
          amount: 100000,
          currency: "KRW"
        };
        async function create() {
          setPending(true);
          const next = await createMatterOpsPreBill({
            matterId: matter.matter_id,
            wipItems: [wipItem],
            sourceSetId: `source-set-${mode}`
          });
          const item = next.prebill ?? next.item;
          setResult(next.kind === "data" ? { ...next, item, prebill: item } : next);
          setPending(false);
        }
        async function approve({ adjustmentAmount, reasonCode }) {
          setPending(true);
          const next = await approveFinancePreBill({
            prebillId: result.item.prebill_id,
            adjustment: adjustmentAmount > 0 ? { amount: adjustmentAmount, reasonCode } : null
          });
          setResult(next.kind === "data" ? { ...next, item: next.item } : { ...next, item: result.item });
          setPending(false);
        }
        async function reject({ reasonCode }) {
          setPending(true);
          const next = await rejectFinancePreBill({ prebillId: result.item.prebill_id, reasonCode });
          setResult(next.kind === "data" ? { ...next, item: next.item } : { ...next, item: result.item });
          setPending(false);
        }
        return h(ChargePanel, {
          operationMode: "billing",
          showAccountingExport: false,
          timeResult: { kind: "data", items: [] },
          invoiceResult: { kind: "data", items: [] },
          agingResult: { kind: "data", items: [], summary: { balance: 0 } },
          financeAuditResult: { kind: "data", items: [] },
          matter,
          matterId: matter.matter_id,
          wipResult: { kind: "data", items: [wipItem] },
          prebillResult: result,
          prebillPending: pending,
          paymentForm: {},
          timeEntryForm: { workDate: "", durationMinutes: "", narrative: "", roleId: "partner", billable: true },
          expenseForm: { expenseDate: "", amount: "", receiptDocumentId: "", currency: "KRW" },
          disbursementForm: { disbursedAt: "", amount: "", vendorRef: "", currency: "KRW" },
          accountingExportForm: { fromDate: "", toDate: "" },
          onTimeEntryFormChange() {},
          onExpenseFormChange() {},
          onDisbursementFormChange() {},
          onPaymentFormChange() {},
          onAccountingExportFormChange() {},
          onToggleTimeTimer() {},
          onCreateTimeEntry() {},
          onCreateExpense() {},
          onCreateDisbursement() {},
          onGenerateWip() {},
          onCreatePreBill: create,
          onApprovePreBill: approve,
          onRejectPreBill: reject,
          onIssueInvoice() {},
          onImportPayment() {},
          onMatchPayment() {},
          onCreateAccountingExport() {}
        });
      }

      createRoot(document.getElementById("root")).render(
        h("div", { className: "reachable-actions-fixture" },
          ...["no-adjust", "adjusted", "reject"].map((mode) =>
            h("section", { key: mode, "data-prebill-visible-flow": mode }, h(PreBillFlow, { mode })))
        )
      );
    });

    for (const mode of ["no-adjust", "adjusted", "reject"]) {
      const flow = page.locator(`[data-prebill-visible-flow="${mode}"]`);
      await flow.locator('[data-matter-prebill-create-action="true"]').click();
      await flow.locator('[data-matter-prebill-status="partner_review_required"]').waitFor();
    }

    const noAdjust = page.locator('[data-prebill-visible-flow="no-adjust"]');
    await noAdjust.locator('[data-matter-prebill-approve-no-adjust-action="true"]').click();
    await noAdjust.locator('[data-matter-prebill-status="partner_approved"]').waitFor();

    const adjusted = page.locator('[data-prebill-visible-flow="adjusted"]');
    await adjusted.getByLabel("Write-down").fill("120000");
    await adjusted.getByLabel("조정·반려 사유").fill("scope_adjustment");
    await adjusted.locator('[data-matter-prebill-approve-adjust-action="true"]').click();
    await adjusted.getByRole("alert").waitFor();
    assert.match(await adjusted.textContent(), /WIP 금액을 초과/);
    await adjusted.getByLabel("Write-down").fill("10000");
    await adjusted.locator('[data-matter-prebill-approve-adjust-action="true"]').click();
    await adjusted.locator('[data-matter-prebill-status="partner_approved"]').waitFor();

    const rejected = page.locator('[data-prebill-visible-flow="reject"]');
    await rejected.locator('[data-matter-prebill-reject-action="true"]').click();
    await rejected.getByRole("alert").waitFor();
    assert.match(await rejected.textContent(), /반려 사유/);
    await rejected.getByLabel("조정·반려 사유").fill("narrative_incomplete");
    await rejected.locator('[data-matter-prebill-reject-action="true"]').click();
    await rejected.locator('[data-matter-prebill-status="rejected"]').waitFor();

    const approvals = requests.filter(({ path }) => path === "/api/finance/prebills/approve");
    assert.equal(approvals.length, 2);
    assert.equal(Object.hasOwn(approvals[0].body, "adjustment"), false);
    assert.deepEqual(approvals[1].body.adjustment, {
      adjustment_id: `adjustment_${approvals[1].body.prebill_id}`,
      prebill_id: approvals[1].body.prebill_id,
      adjustment_type: "write_down",
      amount: 10000,
      reason_code: "scope_adjustment"
    });
    const rejection = requests.find(({ path }) => path === "/api/finance/prebills/reject");
    assert.equal(rejection.body.reason_code, "narrative_incomplete");
    assert.equal(requests.filter(({ path, body }) => path === "/api/matter/ops/wip" && body.action === "prebill").length, 3);

    const screenshot = evidenceDir ? join(evidenceDir, "matter-prebill-separated-actions-1440.png") : null;
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "matter-prebill-separated-actions.json"),
        `${JSON.stringify({ requests, screenshot }, null, 2)}\n`,
        "utf8"
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("ledger_ref route survives reload and restores the exact detail record and tab", { timeout: 60_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const { browser, page, server } = await openHarness();
  const ledgerRef = {
    model_type: "MatterTask",
    id: "task-route-reload",
    matter_id: "matter-route-reload"
  };
  try {
    await page.evaluate(async (selectedLedgerRef) => {
      const { writeMatterLedgerRoute } = await import("/src/components/MattersSurface.jsx");
      writeMatterLedgerRoute(selectedLedgerRef.matter_id, selectedLedgerRef);
    }, ledgerRef);
    assert.equal(new URL(page.url()).searchParams.get("matter_id"), ledgerRef.matter_id);
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get("ledger_ref")), ledgerRef);

    await page.reload({ waitUntil: "domcontentloaded" });
    await addHarnessStyles(page);
    const restored = await page.evaluate(async () => {
      const ReactModule = await import("/@id/react");
      const React = ReactModule.default ?? ReactModule;
      const ReactDomClientModule = await import("/@id/react-dom/client");
      const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
      const { MatterDetailTabs } = await import("/src/components/matter-small-firm/MatterDetailTabs.jsx");
      const { readMatterLedgerRoute } = await import("/src/components/MattersSurface.jsx");
      const selectedLedgerRef = readMatterLedgerRoute();
      const matter = {
        matter_id: "matter-route-reload",
        matter_code: "K-2026-044",
        title: "원장 경로 복원 사건",
        status: "open"
      };
      const task = {
        task_id: "task-route-reload",
        matter_id: matter.matter_id,
        title: "새로고침 후 선택 업무",
        owner_user_id: "person-01",
        status: "in_progress"
      };
      createRoot(document.getElementById("root")).render(
        React.createElement(MatterDetailTabs, {
          matter,
          detailResult: {
            kind: "data",
            item: {
              tasks: [task],
              deadlines: [],
              tab_data: { documents: [], time_billing: [], contact_history: [] },
              summary: {}
            }
          },
          selectedLedgerRef,
          billingPanel: null,
          onOpenVault() {}
        })
      );
      return selectedLedgerRef;
    });

    assert.deepEqual(restored, ledgerRef);
    const workTab = page.getByRole("tab", { name: /업무·기한/ });
    await workTab.waitFor();
    assert.equal(await workTab.getAttribute("aria-selected"), "true");
    assert.equal(
      await page.locator('[data-selected-ledger="true"][data-task-id="task-route-reload"]').count(),
      1
    );

    const screenshot = evidenceDir ? join(evidenceDir, "matter-ledger-route-reload-1440.png") : null;
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "matter-ledger-route-reload.json"),
        `${JSON.stringify({ url: page.url(), restored, screenshot }, null, 2)}\n`,
        "utf8"
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Matter ops API clients bind payloads and cycle identities, then re-read scoped AR after partial and final payment", { timeout: 60_000 }, async (t) => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const { browser, page, server } = await openHarness();
  const requests = [];
  let allocationCount = 0;
  let taskCreateCount = 0;
  try {
    await installMatterUiSignedSession(page);
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const body = request.postData() ? request.postDataJSON() : null;
      requests.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams), body });
      const base = {
        request_id: `reachable-http-${requests.length}`,
        outcome: method === "GET" ? "passed" : "created",
        ui_state: "ready",
        safe_error_codes: [],
        audit_hint_ref: "reachable_actions",
        production_ready_claim: false
      };
      if (method === "POST" && url.pathname === "/api/matter/ops/tasks") {
        taskCreateCount += 1;
        if (taskCreateCount === 2) {
          return route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              ...base,
              outcome: "denied",
              ui_state: "denied",
              message: "업무를 저장할 권한이 없습니다."
            })
          });
        }
        if (taskCreateCount === 3) return route.abort("failed");
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ...base, item: { task_id: "task-http" } }) });
      }
      if (method === "POST" && url.pathname.startsWith("/api/matter/ops/time-weeks/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, outcome: "updated", items: [{ time_entry_id: "time-http" }] }) });
      }
      if (method === "POST" && url.pathname.endsWith("/archive")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, outcome: "updated", matter: { matter_id: "matter-http", status: "archived" } }) });
      }
      if (method === "GET" && url.pathname === "/api/matter/ops/matters") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [{ matter_id: "matter-http", status: "archived" }] }) });
      }
      if (method === "PATCH" && url.pathname === "/api/matter/ops/deadlines/deadline-http") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, outcome: "updated", item: { event_id: "deadline-http" } }) });
      }
      if (method === "GET" && url.pathname === "/api/matter/ops/deadlines/deadline-http/history") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [{ history_id: "history-http" }] }) });
      }
      if (method === "POST" && url.pathname === "/api/matter/ops/wip" && body.action === "generate") {
        const sourceId = body.source_refs[0].source_id;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...base, wip_items: [{ wip_item_id: `wip-${sourceId}`, source_id: sourceId, amount: 100000, currency: "KRW" }] })
        });
      }
      if (method === "POST" && url.pathname === "/api/matter/ops/wip" && body.action === "prebill") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            wip_snapshot: { wip_snapshot_id: body.wip_snapshot_id, immutable_snapshot: true },
            prebill: { ...body.prebill, wip_snapshot_id: body.wip_snapshot_id, status: "partner_review_required" }
          })
        });
      }
      if (method === "POST" && url.pathname === "/api/finance/prebills/approve") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...base, outcome: "approved", item: { prebill_id: body.prebill_id, status: "partner_approved", adjustment: body.adjustment } })
        });
      }
      if (method === "POST" && url.pathname === "/api/finance/invoices") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...base, item: { invoice_id: body.invoice.invoice_id, prebill_id: body.invoice.prebill_id, amount_due: 100000 } })
        });
      }
      if (method === "POST" && url.pathname === "/api/matter/ops/payments") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...base, payment: { payment_id: body.payment.payment_id, matter_id: "matter-http", amount: body.payment.amount, unapplied_amount: body.payment.amount, currency: "KRW" } })
        });
      }
      if (method === "POST" && url.pathname.startsWith("/api/matter/ops/payments/") && url.pathname.endsWith("/allocations")) {
        allocationCount += 1;
        const amountPaid = allocationCount === 1 ? 40000 : 100000;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            payment: { payment_id: decodeURIComponent(url.pathname.split("/")[5]), unapplied_amount: 0, currency: "KRW" },
            invoice: { invoice_id: "invoice-http", matter_id: "matter-http", amount_due: 100000, amount_paid: amountPaid, lifecycle_status: amountPaid === 100000 ? "paid" : "partial" }
          })
        });
      }
      if (method === "GET" && url.pathname === "/api/matter/ops/time-billing") {
        const paid = allocationCount > 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            item: {
              weekly_time: { items: [], summary: { total_minutes: 0, incomplete_actor_count: 0 } },
              wip: { rows: [], totals: { total_amount: 0 } },
              invoices: [{ invoice_id: "invoice-http", matter_id: "matter-http", amount_due: 100000, amount_paid: paid ? 100000 : 40000, lifecycle_status: paid ? "paid" : "partial" }],
              payments: [],
              ar: {
                rows: paid ? [] : [{ invoice_id: "invoice-http", matter_id: "matter-http", balance: 60000, bucket: "current" }],
                totals: { balance: paid ? 0 : 60000, invoice_count: paid ? 0 : 1 }
              }
            }
          })
        });
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ ...base, outcome: "not_found", ui_state: "error" })
      });
    });

    const result = await page.evaluate(async () => {
      const {
        allocateMatterOpsPayment,
        approveFinancePreBill,
        archiveMatterOpsMatter,
        createMatterOpsPreBill,
        createMatterOpsTask,
        fetchMatterOpsDeadlineHistory,
        fetchMatterOpsMatters,
        fetchMatterOpsTimeBilling,
        generateMatterOpsWip,
        importMatterOpsPayment,
        issueFinanceInvoice,
        lockMatterOpsTimeWeek,
        rescheduleMatterOpsDeadline,
        submitMatterOpsTimeWeek,
        unlockMatterOpsTimeWeek
      } = await import("/src/data/apiClient.js");

      await createMatterOpsTask({
        matterId: "matter-http",
        title: "HTTP 업무",
        assignedTo: "person-02",
        dueAt: "2026-08-06T09:00",
        priority: "high"
      });
      const deniedTask = await createMatterOpsTask({
        matterId: "matter-http",
        title: "권한 거부 업무",
        assignedTo: "person-02",
        dueAt: "2026-08-06T10:00",
        priority: "normal"
      });
      const networkTask = await createMatterOpsTask({
        matterId: "matter-http",
        title: "네트워크 오류 업무",
        assignedTo: "person-02",
        dueAt: "2026-08-06T11:00",
        priority: "normal"
      });
      const invalidTask = await createMatterOpsTask({
        matterId: "matter-http",
        title: "잘못된 날짜 업무",
        assignedTo: "person-02",
        dueAt: "2026-02-30T09:00",
        priority: "normal"
      });
      const ambiguousTask = await createMatterOpsTask({
        matterId: "matter-http",
        title: "시간 없는 업무",
        assignedTo: "person-02",
        dueAt: "2026-08-06",
        priority: "normal"
      });
      await submitMatterOpsTimeWeek({ actorId: "person-01", weekStart: "2026-07-27" });
      await lockMatterOpsTimeWeek({ actorId: "person-01", weekStart: "2026-07-27", graceMinutes: 15 });
      await unlockMatterOpsTimeWeek({ actorId: "person-01", weekStart: "2026-07-27", graceMinutes: 15, reason: "서술 보정" });
      await archiveMatterOpsMatter({ matterId: "matter-http", reason: "종결 사건 보관" });
      await archiveMatterOpsMatter({ matterId: "matter-http", reason: "종결 사건 보관" });
      await fetchMatterOpsMatters({ view: "archived" });
      await rescheduleMatterOpsDeadline({
        deadlineId: "deadline-http",
        matterId: "matter-http",
        startsAt: "2026-08-04T00:30:00.000Z",
        endsAt: "2026-08-04T01:30:00.000Z",
        reason: "법원 보정명령 반영"
      });
      await fetchMatterOpsDeadlineHistory({ deadlineId: "deadline-http", matterId: "matter-http" });

      const firstWip = await generateMatterOpsWip({
        matterId: "matter-http",
        sourceSet: {
          source_set_id: "eligible-set-cycle-1",
          source_refs: [{ model_type: "TimeEntry", source_id: "time-cycle-1" }]
        }
      });
      const firstPrebill = await createMatterOpsPreBill({
        matterId: "matter-http",
        wipItems: firstWip.wipItems,
        sourceSetId: firstWip.sourceSetId
      });
      await approveFinancePreBill({
        prebillId: firstPrebill.prebill.prebill_id,
        adjustment: { amount: 10000, reasonCode: "scope_adjustment" }
      });
      const firstInvoice = await issueFinanceInvoice({
        matterId: "matter-http",
        prebillId: firstPrebill.prebill.prebill_id,
        billingClientPartyId: "client-http"
      });

      const secondWip = await generateMatterOpsWip({
        matterId: "matter-http",
        sourceSet: {
          source_set_id: "eligible-set-cycle-2",
          source_refs: [{ model_type: "TimeEntry", source_id: "time-cycle-2" }]
        }
      });
      const secondPrebill = await createMatterOpsPreBill({
        matterId: "matter-http",
        wipItems: secondWip.wipItems,
        sourceSetId: secondWip.sourceSetId
      });
      const secondInvoice = await issueFinanceInvoice({
        matterId: "matter-http",
        prebillId: secondPrebill.prebill.prebill_id,
        billingClientPartyId: "client-http"
      });

      const partialPayment = await importMatterOpsPayment({
        matterId: "matter-http",
        amount: 40000,
        receivedAt: "2026-07-31",
        paymentKey: "partial"
      });
      await importMatterOpsPayment({
        matterId: "matter-http",
        amount: 40000,
        receivedAt: "2026-07-31",
        paymentKey: "partial"
      });
      await allocateMatterOpsPayment({
        matterId: "matter-http",
        paymentId: partialPayment.payment.payment_id,
        invoiceId: firstInvoice.item.invoice_id,
        amount: 40000
      });
      const partial = await fetchMatterOpsTimeBilling({ matterId: "matter-http" });

      const finalPayment = await importMatterOpsPayment({
        matterId: "matter-http",
        amount: 60000,
        receivedAt: "2026-07-31",
        paymentKey: "final"
      });
      await allocateMatterOpsPayment({
        matterId: "matter-http",
        paymentId: finalPayment.payment.payment_id,
        invoiceId: firstInvoice.item.invoice_id,
        amount: 60000
      });
      const paid = await fetchMatterOpsTimeBilling({ matterId: "matter-http" });

      return {
        first: {
          wip_ids: firstWip.wipItems.map((item) => item.wip_item_id),
          prebill_id: firstPrebill.prebill.prebill_id,
          invoice_id: firstInvoice.item.invoice_id
        },
        second: {
          wip_ids: secondWip.wipItems.map((item) => item.wip_item_id),
          prebill_id: secondPrebill.prebill.prebill_id,
          invoice_id: secondInvoice.item.invoice_id
        },
        partial: partial.item.ar,
        paid: paid.item.ar,
        task_errors: {
          denied: deniedTask,
          network: networkTask,
          invalid: invalidTask,
          ambiguous: ambiguousTask
        },
        canonical_task_due_at: new Date(2026, 7, 6, 9, 0).toISOString()
      };
    });

    assert.deepEqual(result.partial.totals, { balance: 60000, invoice_count: 1 });
    assert.deepEqual(result.paid.totals, { balance: 0, invoice_count: 0 });
    assert.deepEqual(
      {
        kind: result.task_errors.denied.kind,
        status: result.task_errors.denied.status,
        message: result.task_errors.denied.message
      },
      { kind: "guarded", status: 403, message: "업무를 저장할 권한이 없습니다." }
    );
    assert.deepEqual(
      {
        kind: result.task_errors.network.kind,
        status: result.task_errors.network.status,
        message: result.task_errors.network.message
      },
      { kind: "error", status: 0, message: "네트워크 연결을 확인해 주세요." }
    );
    assert.deepEqual(
      {
        invalid: result.task_errors.invalid,
        ambiguous: result.task_errors.ambiguous
      },
      {
        invalid: { kind: "error", message: "기한은 날짜와 시간을 명확하게 입력해 주세요." },
        ambiguous: { kind: "error", message: "기한은 날짜와 시간을 명확하게 입력해 주세요." }
      }
    );
    assert.notDeepEqual(result.first.wip_ids, result.second.wip_ids);
    assert.notEqual(result.first.prebill_id, result.second.prebill_id);
    assert.notEqual(result.first.invoice_id, result.second.invoice_id);

    const taskRequest = requests.find(({ path, method }) => path === "/api/matter/ops/tasks" && method === "POST");
    assert.deepEqual(taskRequest.body.task, {
      matter_id: "matter-http",
      title: "HTTP 업무",
      assigned_to: "person-02",
      due_at: result.canonical_task_due_at,
      priority: "high"
    });
    assert.equal(
      requests.some(({ body }) => ["잘못된 날짜 업무", "시간 없는 업무"].includes(body?.task?.title)),
      false
    );
    const weekRequests = requests.filter(({ path }) => path.startsWith("/api/matter/ops/time-weeks/"));
    assert.deepEqual(weekRequests.map(({ path }) => path), [
      "/api/matter/ops/time-weeks/submit",
      "/api/matter/ops/time-weeks/lock",
      "/api/matter/ops/time-weeks/unlock"
    ]);
    assert.equal(weekRequests[2].body.reason, "서술 보정");
    const archiveRequests = requests.filter(({ method, path }) =>
      method === "POST" && path === "/api/matter/ops/matters/matter-http/archive");
    assert.equal(archiveRequests.length, 2);
    assert.equal(archiveRequests[0].body.idempotency_key, archiveRequests[1].body.idempotency_key);
    assert.equal(requests.some(({ method, path, query }) =>
      method === "GET" && path === "/api/matter/ops/matters" && query.view === "archived"), true);
    assert.equal(requests.some(({ method, path }) =>
      method === "GET" && path === "/api/matter/ops/deadlines/deadline-http/history"), true);

    const wipRequests = requests.filter(({ method, path, body }) =>
      method === "POST" && path === "/api/matter/ops/wip" && body.action === "generate");
    assert.deepEqual(wipRequests.map(({ body }) => body.source_refs), [
      [{ model_type: "TimeEntry", source_id: "time-cycle-1" }],
      [{ model_type: "TimeEntry", source_id: "time-cycle-2" }]
    ]);
    assert.deepEqual(wipRequests.map(({ body }) => body.source_set_id), [
      "eligible-set-cycle-1",
      "eligible-set-cycle-2"
    ]);
    assert.notEqual(wipRequests[0].body.idempotency_key, wipRequests[1].body.idempotency_key);
    const prebillRequests = requests.filter(({ method, path, body }) =>
      method === "POST" && path === "/api/matter/ops/wip" && body.action === "prebill");
    assert.deepEqual(prebillRequests.map(({ body }) => body.source_set_id), [
      "eligible-set-cycle-1",
      "eligible-set-cycle-2"
    ]);
    assert.notEqual(prebillRequests[0].body.prebill.prebill_id, prebillRequests[1].body.prebill.prebill_id);
    assert.notEqual(prebillRequests[0].body.wip_snapshot_id, prebillRequests[1].body.wip_snapshot_id);
    const invoiceRequests = requests.filter(({ method, path }) => method === "POST" && path === "/api/finance/invoices");
    assert.notEqual(invoiceRequests[0].body.invoice.invoice_id, invoiceRequests[1].body.invoice.invoice_id);
    assert.notEqual(invoiceRequests[0].body.idempotency_key, invoiceRequests[1].body.idempotency_key);
    const approval = requests.find(({ path }) => path === "/api/finance/prebills/approve");
    assert.deepEqual(approval.body.adjustment, {
      adjustment_id: `adjustment_${result.first.prebill_id}`,
      prebill_id: result.first.prebill_id,
      adjustment_type: "write_down",
      amount: 10000,
      reason_code: "scope_adjustment"
    });
    const scopedRefreshes = requests.filter(({ method, path }) =>
      method === "GET" && path === "/api/matter/ops/time-billing");
    assert.equal(scopedRefreshes.length, 2);
    assert.deepEqual(scopedRefreshes.map(({ query }) => query.matter_id), ["matter-http", "matter-http"]);
    const paymentImports = requests.filter(({ method, path }) =>
      method === "POST" && path === "/api/matter/ops/payments");
    assert.deepEqual(
      paymentImports.map(({ body }) => ({
        idempotency_key: body.idempotency_key,
        payment_id: body.payment.payment_id,
        bank_reference: body.payment.bank_reference
      })),
      [
        {
          idempotency_key: "matter_ops_payment:payment_ui_partial",
          payment_id: "payment_ui_partial",
          bank_reference: "manual-import:payment_ui_partial"
        },
        {
          idempotency_key: "matter_ops_payment:payment_ui_partial",
          payment_id: "payment_ui_partial",
          bank_reference: "manual-import:payment_ui_partial"
        },
        {
          idempotency_key: "matter_ops_payment:payment_ui_final",
          payment_id: "payment_ui_final",
          bank_reference: "manual-import:payment_ui_final"
        }
      ]
    );

    const receipt = { result, requests };
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "matter-reachable-http-payloads.json"),
        `${JSON.stringify(receipt, null, 2)}\n`,
        "utf8"
      );
    }
    t.diagnostic(JSON.stringify(receipt));
  } finally {
    await browser.close();
    await server.close();
  }
});
