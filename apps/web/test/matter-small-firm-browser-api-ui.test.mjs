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
    name: "matter-small-firm-browser-api-page",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== "/__matter-small-firm-browser-api__") return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end("<!doctype html><html data-skin=\"forest\" lang=\"ko\"><body><main id=\"root\" class=\"page-canvas\"></main></body></html>");
      });
    }
  };
}

async function mountBrowserApiHarness(page) {
  await page.evaluate(async () => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MatterOperationsSurface } = await import("/src/components/matter-small-firm/MatterOperationsSurface.jsx");
    const { MatterDetailTabs } = await import("/src/components/matter-small-firm/MatterDetailTabs.jsx");
    const {
      completeMatterStatus,
      createMatterOpsMeeting,
      createMatterOpsTimeEntry,
      fetchMatterOpsFollowups,
      fetchMatterOpsTasks,
      fetchMatterOpsTimeBilling,
      patchMatterOpsTask,
      restoreMatterOpsMatter
    } = await import("/src/data/apiClient.js");
    const h = React.createElement;
    const activeMatter = {
      matter_id: "matter-browser-1",
      matter_code: "K-2026-021",
      title: "브라우저 API 검증 사건",
      client_display_name: "검증 의뢰인",
      owner_user_id: "person-03",
      backup_user_id: "person-07",
      status: "open"
    };
    const archivedMatter = {
      matter_id: "matter-browser-archived",
      matter_code: "K-2025-099",
      title: "복원 검증 사건",
      client_display_name: "보관 의뢰인",
      owner_user_id: "person-03",
      backup_user_id: "person-07",
      status: "archived"
    };
    const matters = [activeMatter, archivedMatter];

    function BrowserApiHarness() {
      const [workResult, setWorkResult] = React.useState(null);
      const [followupResult, setFollowupResult] = React.useState(null);
      const [timeBillingResult, setTimeBillingResult] = React.useState(null);
      const [taskMutationResult, setTaskMutationResult] = React.useState(null);
      const [taskPendingId, setTaskPendingId] = React.useState(null);
      const [meetingResult, setMeetingResult] = React.useState(null);
      const [meetingPending, setMeetingPending] = React.useState(false);
      const [timeResult, setTimeResult] = React.useState(null);
      const [timePending, setTimePending] = React.useState(false);
      const [restoreResult, setRestoreResult] = React.useState(null);
      const [restorePendingId, setRestorePendingId] = React.useState(null);
      const [closeResult, setCloseResult] = React.useState(null);
      const [closePending, setClosePending] = React.useState(false);

      const loadWork = React.useCallback(() => {
        setWorkResult(null);
        fetchMatterOpsTasks({ view: "my" }).then(setWorkResult);
      }, []);

      React.useEffect(() => {
        loadWork();
        fetchMatterOpsFollowups({ view: "today" }).then(setFollowupResult);
        fetchMatterOpsTimeBilling().then(setTimeBillingResult);
      }, [loadWork]);

      async function changeTask(task, status, reason) {
        setTaskPendingId(task.task_id);
        const next = await patchMatterOpsTask({
          taskId: task.task_id,
          matterId: task.matter_id,
          status,
          reason
        });
        setTaskMutationResult(next);
        setTaskPendingId(null);
        if (next.kind === "data") {
          setWorkResult((current) => ({
            ...current,
            items: current.items.map((row) => row.task_id === task.task_id ? { ...row, status } : row)
          }));
        }
      }

      async function createMeeting(value) {
        setMeetingPending(true);
        setMeetingResult(await createMatterOpsMeeting(value));
        setMeetingPending(false);
      }

      async function createTime(value) {
        setTimePending(true);
        setTimeResult(await createMatterOpsTimeEntry({ ...value, roleId: "partner" }));
        setTimePending(false);
      }

      async function restoreMatter(matter) {
        setRestorePendingId(matter.matter_id);
        setRestoreResult(await restoreMatterOpsMatter({ matterId: matter.matter_id }));
        setRestorePendingId(null);
      }

      async function closeMatter() {
        setClosePending(true);
        setCloseResult(await completeMatterStatus({ matterId: activeMatter.matter_id }));
        setClosePending(false);
      }

      const common = {
        matters,
        mattersResult: { kind: "data", items: matters },
        onRetry: loadWork,
        onSelectMatter() {},
        onNavigateSection() {}
      };
      return h("div", { className: "browser-api-fixture" },
        h("section", { "data-browser-api-surface": "work" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-work",
            result: workResult,
            workView: "my",
            workLayout: "list",
            onWorkViewChange() {},
            onWorkLayoutChange() {},
            onTaskStatusChange: changeTask,
            taskUpdatePendingId: taskPendingId,
            taskUpdateResult: taskMutationResult
          })
        ),
        h("section", { "data-browser-api-surface": "followups" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-followups",
            result: followupResult,
            followupView: "today",
            onFollowupViewChange() {},
            meetingPending,
            meetingResult,
            onCreateMeeting: createMeeting
          })
        ),
        h("section", { "data-browser-api-surface": "time" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-time-billing",
            result: timeBillingResult,
            timeBillingView: "time",
            onTimeBillingViewChange() {},
            timeEntryPending: timePending,
            timeEntryResult: timeResult,
            onCreateTimeEntry: createTime
          })
        ),
        h("section", { "data-browser-api-surface": "restore" },
          h(MatterOperationsSurface, {
            ...common,
            section: "matter-list",
            mode: "archived",
            listView: "archived",
            onListViewChange() {},
            restorePendingId,
            restoreResult,
            onRestoreMatter: restoreMatter
          })
        ),
        h("section", { "data-browser-api-surface": "close" },
          h(MatterDetailTabs, {
            matter: activeMatter,
            detailResult: {
              kind: "data",
              item: {
                closeout_state: "data",
                can_close: true,
                close_blockers: [],
                summary: {}
              }
            },
            overview: null,
            billingPanel: h("div", null, "청구 원장"),
            closePending,
            closeResult,
            onCloseMatter: closeMatter
          })
        )
      );
    }

    createRoot(document.getElementById("root")).render(h(BrowserApiHarness));
  });
}

test("browser exits loading and exposes Matter ops mutation success/error from real HTTP requests", { timeout: 60_000 }, async (t) => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const requests = [];
  let taskPatchCount = 0;
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    plugins: [fixturePagePlugin()],
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  try {
    await server.listen();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await installMatterUiSignedSession(page);
    await page.route("**/api/matter*/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const body = request.postData() ? request.postDataJSON() : null;
      const record = { method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, response_status: 200 };
      requests.push(record);
      const base = {
        request_id: `browser-api-${requests.length}`,
        safe_error_codes: [],
        audit_hint_ref: "browser_api_evidence",
        ui_state: "ready"
      };

      if (method === "GET" && url.pathname === "/api/matter/ops/tasks") {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "passed",
            items: [{
              task_id: "task-browser-1",
              matter_id: "matter-browser-1",
              matter: { code: "K-2026-021" },
              title: "브라우저 요청 확인",
              owner_user_id: "person-03",
              status: "todo",
              due_at: "2026-07-31T08:00:00.000+09:00"
            }]
          })
        });
      }
      if (method === "GET" && url.pathname === "/api/matter/ops/followups") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...base, outcome: "passed", items: [] })
        });
      }
      if (method === "GET" && url.pathname === "/api/matter/ops/time-billing") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "passed",
            item: {
              weekly_time: { items: [], summary: { total_minutes: 0, incomplete_actor_count: 0 } },
              wip: { rows: [], totals: { total_amount: 0 } },
              ar: { rows: [], totals: { balance: 0 } }
            }
          })
        });
      }
      if (method === "PATCH" && url.pathname === "/api/matter/ops/tasks/task-browser-1") {
        taskPatchCount += 1;
        if (taskPatchCount === 4) {
          record.response_status = 409;
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              ...base,
              outcome: "conflict",
              ui_state: "error",
              message: "동시에 변경되어 다시 확인해야 합니다."
            })
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "updated",
            item: { task_id: "task-browser-1", matter_id: "matter-browser-1", status: body.status }
          })
        });
      }
      if (method === "POST" && url.pathname === "/api/matter/ops/matters/matter-browser-1/meetings") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...base, outcome: "created", item: { meeting_id: body.meeting.meeting_id } })
        });
      }
      if (method === "POST" && url.pathname === "/api/matter/ops/time-entries") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...base, outcome: "created", item: { time_entry_id: body.time_entry.time_entry_id } })
        });
      }
      if (method === "POST" && url.pathname === "/api/matter/ops/matters/matter-browser-archived/restore") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "updated",
            item: { matter_id: "matter-browser-archived", status: body.target_status }
          })
        });
      }
      if (method === "POST" && url.pathname === "/api/matters/matter-browser-1/status-transitions") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            outcome: "updated",
            item: { matter_id: "matter-browser-1", status: "closed" }
          })
        });
      }
      record.response_status = 404;
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ ...base, outcome: "not_found", ui_state: "error" })
      });
    });

    await page.goto(`http://127.0.0.1:${port}/__matter-small-firm-browser-api__`, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({
      content: `${productStyles}\n${matterStyles}\n
        html, body { width: 100%; min-width: 0; margin: 0; }
        body { overflow-x: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
        .browser-api-fixture { display: grid; gap: 24px; padding: 24px; }
        [data-browser-api-surface] { min-width: 0; padding: 16px; border: 1px solid var(--am-border); background: var(--am-canvas); }
      `
    });
    await mountBrowserApiHarness(page);

    const workSurface = page.locator('[data-browser-api-surface="work"]');
    await workSurface.locator('[data-matter-ops-state="loading"]').waitFor();
    await workSurface.locator('[data-task-id="task-browser-1"]').waitFor();
    assert.equal(await workSurface.locator('[data-matter-ops-state="loading"]').count(), 0);

    await workSurface.locator("select").selectOption("done");
    await workSurface.locator('[data-matter-task-mutation-status="data"]').waitFor();
    assert.match(await workSurface.textContent(), /업무 상태를 저장했습니다/);
    const statusSelect = workSurface.locator("select").first();
    assert.equal(await statusSelect.inputValue(), "done");

    const taskPatchRequests = () => requests.filter(({ method, path }) =>
      method === "PATCH" && path === "/api/matter/ops/tasks/task-browser-1");
    await statusSelect.selectOption("in_progress");
    const reasonForm = workSurface.locator('[data-matter-task-reason-form="true"]');
    await reasonForm.waitFor();
    assert.equal(taskPatchRequests().length, 1);
    await reasonForm.getByRole("button", { name: "상태 변경" }).click();
    await reasonForm.getByRole("alert").waitFor();
    assert.match(await reasonForm.textContent(), /사유를 입력해 주세요/);
    assert.equal(taskPatchRequests().length, 1);
    const reasonRequiredScreenshot = evidenceDir ? join(evidenceDir, "matter-ops-task-reason-required-1440.png") : null;
    if (reasonRequiredScreenshot) await page.screenshot({ path: reasonRequiredScreenshot, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const reasonFormBox = await reasonForm.boundingBox();
    assert.ok(reasonFormBox && reasonFormBox.x >= 0 && reasonFormBox.x + reasonFormBox.width <= 390);
    const reasonRequiredMobileScreenshot = evidenceDir ? join(evidenceDir, "matter-ops-task-reason-required-390.png") : null;
    if (reasonRequiredMobileScreenshot) await page.screenshot({ path: reasonRequiredMobileScreenshot, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await reasonForm.getByRole("button", { name: "취소" }).click();
    await reasonForm.waitFor({ state: "detached" });
    assert.equal(taskPatchRequests().length, 1);
    assert.equal(await statusSelect.inputValue(), "done");

    const reopenReason = "완료 검토 결과 추가 작업이 확인됨";
    await statusSelect.selectOption("in_progress");
    await reasonForm.getByLabel("사유").fill(reopenReason);
    await reasonForm.getByRole("button", { name: "상태 변경" }).click();
    await page.waitForFunction(() =>
      document.querySelector('[data-browser-api-surface="work"] select')?.value === "in_progress");

    const blockedReason = "의뢰인 서명본 수령 대기";
    await statusSelect.selectOption("blocked");
    await reasonForm.getByLabel("사유").fill(blockedReason);
    await reasonForm.getByRole("button", { name: "상태 변경" }).click();
    await page.waitForFunction(() =>
      document.querySelector('[data-browser-api-surface="work"] select')?.value === "blocked");

    const meetingForm = page.locator('[data-matter-meeting-form="true"]');
    await meetingForm.locator("select").selectOption("matter-browser-1");
    await meetingForm.getByLabel("회의 제목").fill("브라우저 API 회의");
    await meetingForm.getByLabel("결정사항").fill("자료 검토를 완료하기로 함");
    await meetingForm.getByRole("button", { name: "기록" }).click();
    await meetingForm.locator('[data-matter-meeting-mutation-status="data"]').waitFor();
    assert.match(await meetingForm.textContent(), /저장했습니다/);

    const timeForm = page.locator('[data-matter-quick-time-entry="true"]');
    await timeForm.getByLabel("사건").selectOption("matter-browser-1");
    await timeForm.locator('input[type="date"]').fill("2026-07-30");
    await timeForm.locator('input[type="number"]').fill("45");
    await timeForm.getByLabel("업무 내용").fill("브라우저 요청 검증");
    await timeForm.getByRole("button", { name: "저장" }).click();
    await timeForm.locator('[data-matter-time-mutation-status="data"]').waitFor();
    assert.match(await timeForm.textContent(), /저장했습니다/);

    const restoreSurface = page.locator('[data-browser-api-surface="restore"]');
    await restoreSurface.getByRole("button", { name: "복원", exact: true }).click();
    await restoreSurface.locator('[data-matter-restore-mutation-status="data"]').waitFor();
    assert.match(await restoreSurface.textContent(), /종결 목록으로 복원했습니다/);

    const closeSurface = page.locator('[data-browser-api-surface="close"]');
    await closeSurface.getByRole("button", { name: "사건 종결" }).click();
    await closeSurface.locator('[data-matter-close-mutation-status="data"]').waitFor();
    assert.match(await closeSurface.textContent(), /사건을 종결했습니다/);

    const successScreenshot = evidenceDir ? join(evidenceDir, "matter-ops-browser-mutations-success-1440.png") : null;
    if (successScreenshot) await page.screenshot({ path: successScreenshot, fullPage: true });

    const unblockReason = "서명본을 수령하여 검토를 재개함";
    await statusSelect.selectOption("in_progress");
    await reasonForm.getByLabel("사유").fill(unblockReason);
    await reasonForm.getByRole("button", { name: "상태 변경" }).click();
    await workSurface.locator('[data-matter-task-mutation-status="error"]').waitFor();
    assert.match(await workSurface.textContent(), /저장하지 못했습니다/);
    const errorScreenshot = evidenceDir ? join(evidenceDir, "matter-ops-browser-mutation-error-1440.png") : null;
    if (errorScreenshot) await page.screenshot({ path: errorScreenshot, fullPage: true });

    const mutationPaths = requests
      .filter(({ method }) => method !== "GET")
      .map(({ method, path }) => `${method} ${path}`);
    for (const expected of [
      "PATCH /api/matter/ops/tasks/task-browser-1",
      "POST /api/matter/ops/matters/matter-browser-1/meetings",
      "POST /api/matter/ops/time-entries",
      "POST /api/matter/ops/matters/matter-browser-archived/restore",
      "POST /api/matters/matter-browser-1/status-transitions"
    ]) {
      assert.equal(mutationPaths.includes(expected), true, expected);
    }
    assert.equal(requests.some(({ method, path }) => method === "GET" && path === "/api/matter/ops/tasks"), true);
    assert.equal(requests.find(({ response_status }) => response_status === 409)?.path, "/api/matter/ops/tasks/task-browser-1");
    const taskRequests = taskPatchRequests();
    assert.equal(taskRequests.length, 4);
    assert.equal(taskRequests[0].body.status, "done");
    assert.equal("reason" in taskRequests[0].body, false);
    assert.equal(taskRequests[1].body.status, "in_progress");
    assert.equal(taskRequests[1].body.reason, reopenReason);
    assert.equal(taskRequests[2].body.status, "blocked");
    assert.equal(taskRequests[2].body.reason, blockedReason);
    assert.equal(taskRequests[3].body.status, "in_progress");
    assert.equal(taskRequests[3].body.reason, unblockReason);
    for (const request of taskRequests) {
      assert.equal("blocked_reason" in request.body, false);
    }

    const observable = {
      read_loading_exited: true,
      reason_contract: {
        missing_reason_requests: 0,
        cancelled_reason_requests: 0,
        exact_reopen_reason: taskRequests[1].body.reason,
        exact_blocked_reason: taskRequests[2].body.reason,
        exact_unblock_reason: taskRequests[3].body.reason,
        fabricated_reason_fields: taskRequests.filter(({ body }) => body.reason && ![reopenReason, blockedReason, unblockReason].includes(body.reason)).length
      },
      mutation_paths: [...new Set(mutationPaths)],
      visible_success: {
        task: "업무 상태를 저장했습니다.",
        meeting: "저장했습니다",
        time: "저장했습니다",
        restore: "사건을 종결 목록으로 복원했습니다.",
        close: "사건을 종결했습니다."
      },
      visible_error: "업무 상태를 저장하지 못했습니다",
      requests,
      screenshots: [
        reasonRequiredScreenshot,
        reasonRequiredMobileScreenshot,
        successScreenshot,
        errorScreenshot
      ].filter(Boolean)
    };
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "matter-ops-browser-api-receipt.json"),
        `${JSON.stringify(observable, null, 2)}\n`,
        "utf8"
      );
    }
    t.diagnostic(JSON.stringify(observable));
  } finally {
    await browser.close();
    await server.close();
  }
});
