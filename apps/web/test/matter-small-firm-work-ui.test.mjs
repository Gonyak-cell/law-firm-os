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
    name: "matter-small-firm-work-parity-page",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== "/__matter-small-firm-work-parity__") return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end("<!doctype html><html data-skin=\"forest\" lang=\"ko\"><body><main id=\"root\" class=\"page-canvas\"></main></body></html>");
      });
    }
  };
}

async function mountWorkParityHarness(page) {
  await page.evaluate(async () => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MatterWorktreeSurface } = await import("/src/components/MatterWorktreeSurface.jsx");
    const { MatterOperationsSurface } = await import("/src/components/matter-small-firm/MatterOperationsSurface.jsx");
    const { matterRouteFilter, writeMatterRouteFilter } = await import("/src/components/matter-small-firm/routes.js");
    const h = React.createElement;
    const taskId = "task-ledger-1";
    const matter = {
      matter_id: "matter-ledger-1",
      matter_code: "K-2026-LEDGER",
      title: "원장 동일성 검증 사건",
      matter_type_english: "Litigation",
      status: "open"
    };
    const task = {
      id: taskId,
      matter_id: matter.matter_id,
      matter: { id: matter.matter_id, code: matter.matter_code, title: matter.title },
      title: "동일 원장 업무",
      owner_user_id: "person-03",
      status: "todo",
      due_at: "2026-08-03T09:00:00.000+09:00",
      source: "task",
      ledger_ref: { model_type: "MatterTask", id: taskId }
    };
    const event = {
      id: "calendar-ledger-1",
      matter_id: matter.matter_id,
      matter: { id: matter.matter_id, code: matter.matter_code, title: matter.title },
      title: "사건 일정 원장",
      owner_user_id: "person-03",
      due_at: "2026-08-04T09:00:00.000+09:00",
      source: "calendar",
      ledger_ref: { model_type: "MatterCalendarEvent", id: "calendar-ledger-1" }
    };
    const workResult = {
      kind: "data",
      item: {
        my: [task],
        overdue: [task],
        waiting: [task],
        unassigned: [task],
        tasks: [task]
      }
    };
    const todayTask = {
      item_id: taskId,
      source_type: "task",
      matter_id: matter.matter_id,
      title: task.title,
      owner_user_id: task.owner_user_id,
      status: "blocked",
      due_at: task.due_at
    };
    const todayResult = {
      kind: "data",
      item: {
        lanes: [
          {
            id: "due_today",
            label: "오늘 마감",
            items: [todayTask],
            route: { section: "matter-calendar", filter: "today" }
          },
          {
            id: "blocked",
            label: "막힘",
            items: [todayTask],
            route: { section: "matter-work", filter: "blocked" }
          }
        ],
        total_item_count: 2,
        week_schedule: []
      }
    };
    window.__matterWorkParityEvents = [];

    function WorkHarness() {
      const filter = matterRouteFilter(window.location.search);
      const [view, setView] = React.useState(
        ["my", "overdue", "waiting", "unassigned"].includes(filter) ? filter : "my"
      );
      const [layout, setLayout] = React.useState(
        ["board", "worktree"].includes(filter) ? filter : "list"
      );
      return h(MatterOperationsSurface, {
        section: "matter-work",
        result: workResult,
        matters: [matter],
        workView: view,
        workLayout: layout,
        onWorkViewChange(next) {
          setView(next);
          writeMatterRouteFilter(next);
          window.__matterWorkParityEvents.push({ type: "saved-view", value: next });
        },
        onWorkLayoutChange(next) {
          setLayout(next);
          writeMatterRouteFilter(next === "list" ? view : next);
          window.__matterWorkParityEvents.push({ type: "layout", value: next });
        },
        onRetry() {
          window.__matterWorkParityEvents.push({ type: "work-retry" });
        },
        onSelectMatter(matterId) {
          window.__matterWorkParityEvents.push({ type: "work-open", matterId });
        },
        onTaskStatusChange(changedTask, status) {
          window.__matterWorkParityEvents.push({
            type: "task-status",
            taskId: changedTask.id,
            status
          });
        },
        worktree: h(MatterWorktreeSurface, { matters: [matter], liveCtx: "allow" })
      });
    }

    const common = {
      matters: [matter],
      workView: "my",
      workLayout: "list",
      onWorkViewChange() {},
      onWorkLayoutChange() {},
      onTaskStatusChange() {},
      onSelectMatter() {}
    };
    createRoot(document.getElementById("root")).render(h(
      "div",
      { "data-work-parity-harness": "true" },
      h("section", { "data-work-harness-main": "true" }, h(WorkHarness)),
      h("section", { "data-work-state-case": "error" }, h(MatterOperationsSurface, {
        ...common,
        section: "matter-work",
        result: { kind: "error", message: "work unavailable" },
        onRetry() {
          window.__matterWorkParityEvents.push({ type: "work-error-retry" });
        }
      })),
      h("section", { "data-work-state-case": "empty" }, h(MatterOperationsSurface, {
        ...common,
        section: "matter-work",
        result: { kind: "data", item: { my: [] } },
        onRetry() {}
      })),
      h("section", { "data-work-today": "true" }, h(MatterOperationsSurface, {
        section: "matter-today",
        result: todayResult,
        matters: [matter],
        onRetry() {},
        onSelectMatter() {},
        onNavigateSection(section, filter) {
          window.__matterWorkParityEvents.push({ type: "today-route", section, filter });
        },
        onDownloadReport() {}
      })),
      h("section", { "data-work-calendar": "true" }, h(MatterOperationsSurface, {
        section: "matter-calendar",
        result: { kind: "data", item: { events: [task, event] } },
        matters: [matter],
        onRetry() {},
        onSelectMatter(matterId) {
          window.__matterWorkParityEvents.push({ type: "calendar-open", matterId });
        }
      }))
    ));
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });
}

test("[TUW-11/12/15] rendered saved views, canonical task projections, and calendar ledger links behave end to end", { timeout: 60_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const taskId = "task-ledger-1";
  const matterId = "matter-ledger-1";
  const worktreeItem = {
    version: 1,
    root: {
      node_id: "worktree-root-1",
      node_type: "root",
      title: "사건 워크트리",
      sort_order: 0
    },
    nodes: [{
      node_id: "worktree-node-task-1",
      node_type: "task",
      parent_node_id: "worktree-root-1",
      title: "동일 원장 업무",
      task_id: taskId,
      sort_order: 0,
      task: {
        task_id: taskId,
        title: "동일 원장 업무",
        assigned_to: "person-03",
        status: "todo",
        due_at: "2026-08-03T09:00:00.000+09:00"
      }
    }],
    unclassified: {
      node_id: "worktree-unclassified",
      node_type: "virtual_branch",
      title: "미분류 업무",
      tasks: []
    },
    progress: { total: 1, done: 0, blocked: 0, overdue: 0, percent: 0 }
  };
  const worktreeRequests = [];
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await installMatterUiSignedSession(page);
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      if (url.pathname === `/api/matters/${matterId}/worktree/templates`) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ item: {}, items: [], current_version: 1 })
        });
      }
      if (url.pathname === `/api/matters/${matterId}/worktree` && method === "GET") {
        worktreeRequests.push({ method, path: url.pathname, projected_task_id: worktreeItem.nodes[0].task.task_id });
        return route.fulfill({
          status: 200,
          headers: { "content-type": "application/json", etag: "\"1\"" },
          body: JSON.stringify({ item: worktreeItem, current_version: 1 })
        });
      }
      if (url.pathname === `/api/matters/${matterId}/worktree/tasks/${taskId}/complete` && method === "POST") {
        worktreeRequests.push({ method, path: url.pathname, projected_task_id: taskId });
        return route.fulfill({
          status: 200,
          headers: { "content-type": "application/json", etag: "\"2\"" },
          body: JSON.stringify({ item: worktreeItem, current_version: 2 })
        });
      }
      return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    });

    const initialUrl = `http://127.0.0.1:${port}/__matter-small-firm-work-parity__?view=matters&section=matter-work&filter=overdue&worktree_area=litigation&worktree_matter=${matterId}#matter-work`;
    await page.goto(initialUrl, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: `${productStyles}\n${matterStyles}\n[data-work-parity-harness] { display: grid; gap: 24px; }` });
    await mountWorkParityHarness(page);
    const main = page.locator("[data-work-harness-main]");
    await main.locator('[data-matter-work-layout="list"]').waitFor();

    const savedViews = main.getByRole("tablist", { name: "업무 저장 보기" });
    const overdue = savedViews.getByRole("tab", { name: "기한 초과", exact: true });
    assert.equal(await overdue.getAttribute("aria-selected"), "true");
    await overdue.focus();
    await page.keyboard.press("ArrowRight");
    const waiting = savedViews.getByRole("tab", { name: "대기", exact: true });
    assert.equal(await waiting.getAttribute("aria-selected"), "true");
    assert.equal(await waiting.evaluate((element) => element === document.activeElement), true);
    assert.equal(new URL(page.url()).searchParams.get("filter"), "waiting");
    const savedViewFilter = new URL(page.url()).searchParams.get("filter");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: `${productStyles}\n${matterStyles}\n[data-work-parity-harness] { display: grid; gap: 24px; }` });
    await mountWorkParityHarness(page);
    const reloadedMain = page.locator("[data-work-harness-main]");
    await reloadedMain.locator('[data-matter-work-layout="list"]').waitFor();
    assert.equal(
      await reloadedMain.getByRole("tablist", { name: "업무 저장 보기" })
        .getByRole("tab", { name: "대기", exact: true })
        .getAttribute("aria-selected"),
      "true"
    );
    const listRow = reloadedMain.locator(`[data-matter-work-layout="list"] [data-task-id="${taskId}"]`);
    assert.equal(await listRow.count(), 1);
    assert.equal(await listRow.getAttribute("data-ledger-id"), taskId);
    assert.match(await listRow.textContent(), /동일 원장 업무/);
    assert.match(await listRow.textContent(), /K-2026-LEDGER/);
    assert.match(await listRow.textContent(), /person-03/);
    const listTaskId = await listRow.getAttribute("data-task-id");
    const listLedgerId = await listRow.getAttribute("data-ledger-id");

    const layoutTabs = reloadedMain.getByRole("tablist", { name: "업무 보기 방식" });
    await layoutTabs.getByRole("tab", { name: "보드", exact: true }).click();
    const boardCard = reloadedMain.locator(`[data-matter-work-layout="board"] [data-task-id="${taskId}"]`);
    await boardCard.waitFor();
    assert.equal(await boardCard.count(), 1);
    assert.equal(await boardCard.getAttribute("data-ledger-id"), taskId);
    const boardTaskId = await boardCard.getAttribute("data-task-id");
    const boardLedgerId = await boardCard.getAttribute("data-ledger-id");

    await layoutTabs.getByRole("tab", { name: "워크트리", exact: true }).click();
    const worktree = reloadedMain.locator(`[data-matter-work-layout="worktree"] .matter-worktree`);
    await worktree.getByRole("tree").waitFor();
    assert.equal(await worktree.locator(`[data-worktree-matter-id="${matterId}"]`).count(), 1);
    const worktreeTaskRow = worktree.locator(`[data-task-id="${taskId}"]`);
    assert.equal(await worktreeTaskRow.count(), 1);
    assert.equal(await worktreeTaskRow.getAttribute("data-task-id"), taskId);
    const worktreeTask = worktree.getByRole("checkbox", { name: "동일 원장 업무 완료" });
    await worktreeTask.waitFor();
    await Promise.all([
      page.waitForRequest((request) =>
        request.method() === "POST"
        && new URL(request.url()).pathname === `/api/matters/${matterId}/worktree/tasks/${taskId}/complete`),
      worktreeTask.click()
    ]);
    assert.equal(worktreeRequests.some(({ method, projected_task_id }) =>
      method === "POST" && projected_task_id === taskId), true);

    const errorCase = page.locator('[data-work-state-case="error"]');
    assert.equal(await errorCase.locator('[data-matter-ops-state="error"][role="alert"]').count(), 1);
    await errorCase.getByRole("button", { name: "다시 시도" }).click();
    const emptyCase = page.locator('[data-work-state-case="empty"]');
    assert.equal(await emptyCase.locator('[data-matter-ops-state="empty"][role="status"]').count(), 1);

    const today = page.locator("[data-work-today]");
    const todayTaskRow = today.locator(`[data-task-id="${taskId}"]`);
    assert.equal(await todayTaskRow.count(), 1);
    assert.match(await todayTaskRow.textContent(), /오늘 마감 · 막힘/);
    const dueTodayRoute = todayTaskRow.getByRole("button", { name: "오늘 마감 보기", exact: true });
    const blockedRoute = todayTaskRow.getByRole("button", { name: "막힘 보기", exact: true });
    assert.equal(await dueTodayRoute.count(), 1);
    assert.equal(await blockedRoute.count(), 1);
    await dueTodayRoute.click();
    await blockedRoute.click();

    const calendar = page.locator("[data-work-calendar]");
    assert.deepEqual(
      await calendar.locator("[data-ledger-id]").evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-ledger-id"))),
      [taskId, "calendar-ledger-1"]
    );
    const taskCalendarRow = calendar.locator(`[data-ledger-id="${taskId}"]`);
    await taskCalendarRow.focus();
    await page.keyboard.press("Enter");
    const events = await page.evaluate(() => window.__matterWorkParityEvents);
    assert.equal(events.some((event) =>
      event.type === "calendar-open" && event.matterId === matterId), true);
    assert.equal(events.some((event) => event.type === "work-error-retry"), true);
    assert.equal(events.some((event) =>
      event.type === "today-route"
      && event.section === "matter-calendar"
      && event.filter === "today"), true);
    assert.equal(events.some((event) =>
      event.type === "today-route"
      && event.section === "matter-work"
      && event.filter === "blocked"), true);
    const duplicateKeyErrors = consoleErrors.filter((message) =>
      /same key|Keys should be unique/i.test(message));
    assert.deepEqual(duplicateKeyErrors, []);

    const observables = {
      route_after_keyboard: savedViewFilter,
      route_after_layout: new URL(page.url()).searchParams.get("filter"),
      list_task_id: listTaskId,
      list_ledger_id: listLedgerId,
      board_task_id: boardTaskId,
      board_ledger_id: boardLedgerId,
      worktree_task_id: await worktreeTaskRow.getAttribute("data-task-id"),
      today_task_count: await todayTaskRow.count(),
      today_task_text: await todayTaskRow.textContent(),
      today_route_labels: await todayTaskRow.getByRole("button").allTextContents(),
      worktree_requests: worktreeRequests,
      calendar_ledger_ids: await calendar.locator("[data-ledger-id]").evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-ledger-id"))),
      events,
      console_errors: consoleErrors,
      duplicate_key_errors: duplicateKeyErrors
    };
    if (evidenceDir) {
      await page.screenshot({ path: join(evidenceDir, "work-parity-render.png"), fullPage: true });
      await writeFile(join(evidenceDir, "work-parity-observables.json"), `${JSON.stringify(observables, null, 2)}\n`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
