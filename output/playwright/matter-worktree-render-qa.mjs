import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const outputDir = new URL("./matter-worktree/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const matter = {
  matter_id: "matter_worktree_qa",
  matter_code: "QA/LIT/2026-001",
  title: "[QA] 워크트리 시각 검증",
  client_name: "QA Client",
  matter_type_english: "LIT",
  status: "open",
};
const nodes = [
  { node_id: "branch-prepare", node_type: "branch", parent_node_id: null, title: "준비", sort_order: 0, status: "active" },
  { node_id: "branch-records", node_type: "branch", parent_node_id: "branch-prepare", title: "기록 검토", sort_order: 0, status: "active" },
  { node_id: "task-done", node_type: "task", parent_node_id: "branch-records", title: "의뢰인 자료 확인", sort_order: 0, status: "active", task_id: "task-done", task: { task_id: "task-done", title: "의뢰인 자료 확인", status: "done", assigned_to: "qa-lawyer", due_at: "2026-07-10T09:00:00.000Z", document_refs: ["doc-1"] } },
  { node_id: "task-blocked", node_type: "task", parent_node_id: "branch-records", title: "상대방 자료 확인", sort_order: 1, status: "active", task_id: "task-blocked", task: { task_id: "task-blocked", title: "상대방 자료 확인", status: "blocked", assigned_to: "qa-staff", due_at: "2026-07-09T09:00:00.000Z" } },
];
const worktreeBody = {
  request_id: "qa-render-read",
  outcome: "passed",
  etag: '"4"',
  count_leak_prevented: true,
  item: {
    root: { node_id: "worktree-root:qa", node_type: "root", title: matter.title, depth: 0, persisted: false },
    nodes,
    unclassified: { node_id: "worktree-unclassified:qa", node_type: "virtual_branch", title: "미분류 업무", depth: 1, persisted: false, tasks: [] },
    progress: { done: 1, total: 2, percent: 50, blocked: 1, overdue: 1 },
  },
  safe_error_codes: [],
};

function largeWorktreeNodes(nodeCount = 300) {
  const projected = [];
  const branchCount = 10;
  for (let branch = 0; branch < branchCount; branch += 1) {
    const branchId = `large-branch-${branch}`;
    projected.push({ node_id: branchId, node_type: "branch", parent_node_id: null, title: `단계 ${branch + 1}`, sort_order: branch, status: "active" });
    for (let index = 0; index < nodeCount / branchCount - 1; index += 1) {
      const taskId = `large-task-${branch}-${index}`;
      projected.push({
        node_id: `large-node-${branch}-${index}`,
        node_type: "task",
        parent_node_id: branchId,
        title: `업무 ${branch + 1}-${index + 1}`,
        sort_order: index,
        status: "active",
        task_id: taskId,
        task: { task_id: taskId, title: `업무 ${branch + 1}-${index + 1}`, status: index % 4 === 0 ? "done" : "todo" },
      });
    }
  }
  return projected;
}

let reopenCalls = 0;
let renderLargeWorktree = false;
let worktreeResponseMode = "data";
const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.route("**/api/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname === "/api/matters" && request.method() === "GET") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ request_id: "qa-matters", outcome: "passed", items: [matter], safe_error_codes: [], audit_hint_ref: "qa", ui_state: "data", production_ready_claim: false }) });
  }
  if (url.pathname === `/api/matters/${matter.matter_id}/worktree` && request.method() === "GET") {
    if (worktreeResponseMode === "denied") {
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ request_id: "qa-denied", outcome: "denied", safe_error_codes: ["NOT_FOUND"], count_leak_prevented: true }) });
    }
    if (worktreeResponseMode === "conflict") {
      return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ request_id: "qa-conflict", outcome: "conflict", current_version: 5, safe_error_codes: ["VERSION_CONFLICT"] }) });
    }
    if (worktreeResponseMode === "error") return route.abort("failed");
    const largeNodes = renderLargeWorktree ? largeWorktreeNodes() : null;
    const body = largeNodes
      ? { ...worktreeBody, item: { ...worktreeBody.item, nodes: largeNodes, progress: { done: 80, total: 290, percent: 28, blocked: 0, overdue: 0 } } }
      : worktreeBody;
    return route.fulfill({ status: 200, contentType: "application/json", headers: { etag: '"4"' }, body: JSON.stringify(body) });
  }
  if (url.pathname.endsWith("/tasks/task-done/reopen") && request.method() === "POST") {
    reopenCalls += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "passed", item: { ...nodes[2].task, status: "in_progress" } }) });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ request_id: "qa-generic", outcome: "passed", items: [], safe_error_codes: [], audit_hint_ref: "qa", production_ready_claim: false }) });
});

const fileUrl = new URL("../../apps/web/dist/index.html", import.meta.url);
fileUrl.search = new URLSearchParams({
  view: "matters",
  ctx: "allow",
  desktop: "1",
  desktop_api_base_url: "http://127.0.0.1:4180",
  worktree_area: "litigation",
  worktree_matter: matter.matter_id,
}).toString();
fileUrl.hash = "matter-worktree";
await page.goto(fileUrl.href, { waitUntil: "domcontentloaded" });
await page.getByRole("tree", { name: /QA\/LIT\/2026-001/ }).waitFor();

const results = [];
for (const width of [1280, 1024, 768, 375]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(100);
  const measurement = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".matter-worktree-practice-areas button")];
    const widths = buttons.map((button) => Math.round(button.getBoundingClientRect().width * 10) / 10);
    return {
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      practiceWidths: widths,
      equalPracticeWidths: Math.max(...widths) - Math.min(...widths) < 1,
      treeItems: document.querySelectorAll('[role="treeitem"]').length,
    };
  });
  assert.equal(measurement.overflow, false, `${width}px page overflow`);
  if (width > 768) assert.equal(measurement.equalPracticeWidths, true, `${width}px practice widths`);
  results.push(measurement);
  await page.screenshot({ path: fileURLToPath(new URL(`worktree-${width}.png`, outputDir)), fullPage: true });
}

await page.setViewportSize({ width: 1280, height: 900 });
const keyboard = {};
const waitForFocusedNode = (nodeId) => page.waitForFunction((id) => document.activeElement?.dataset?.worktreeNodeId === id, nodeId);
const practiceButtons = page.locator(".matter-worktree-practice-areas button");
await practiceButtons.nth(1).focus();
await page.keyboard.press("Enter");
keyboard.practiceAreaChanged = new URL(page.url()).searchParams.get("worktree_area") === "corporate-advisory";
await practiceButtons.nth(0).focus();
await page.keyboard.press("Enter");
const matterSelect = page.getByLabel("Matter Code 선택");
await matterSelect.locator("option").nth(1).waitFor({ state: "attached" });
await matterSelect.focus();
await page.keyboard.type("QA");
await page.keyboard.press("Tab");
assert.equal(await matterSelect.inputValue(), matter.matter_id, "keyboard Matter selection");
await page.getByRole("tree", { name: /QA\/LIT\/2026-001/ }).waitFor();
keyboard.matterSelected = new URL(page.url()).searchParams.get("worktree_matter") === matter.matter_id;

const rootNode = page.locator('[data-worktree-node-id="worktree-root:qa"]');
await rootNode.focus();
await page.keyboard.press("ArrowRight");
await waitForFocusedNode("branch-prepare");
keyboard.arrowRightFocusedChild = await page.locator('[data-worktree-node-id="branch-prepare"]').evaluate((node) => document.activeElement === node);
await page.keyboard.press("ArrowDown");
await waitForFocusedNode("branch-records");
keyboard.arrowDownFocusedNext = await page.locator('[data-worktree-node-id="branch-records"]').evaluate((node) => document.activeElement === node);
await page.keyboard.press("ArrowUp");
await waitForFocusedNode("branch-prepare");
keyboard.arrowUpFocusedPrevious = await page.locator('[data-worktree-node-id="branch-prepare"]').evaluate((node) => document.activeElement === node);
await page.keyboard.press("ArrowLeft");
await page.waitForFunction(() => document.querySelector('[data-worktree-node-id="branch-prepare"]')?.getAttribute("aria-expanded") === "false");
keyboard.arrowLeftCollapsed = await page.locator('[data-worktree-node-id="branch-prepare"]').getAttribute("aria-expanded") === "false";
await page.keyboard.press("ArrowRight");
await page.waitForFunction(() => document.querySelector('[data-worktree-node-id="branch-prepare"]')?.getAttribute("aria-expanded") === "true");
keyboard.arrowRightExpanded = await page.locator('[data-worktree-node-id="branch-prepare"]').getAttribute("aria-expanded") === "true";

const doneCheckbox = page.getByRole("checkbox", { name: "의뢰인 자료 확인 완료" });
await doneCheckbox.click();
await page.getByRole("dialog", { name: "완료 업무 재개" }).waitFor();
await page.screenshot({ path: fileURLToPath(new URL("worktree-reopen-dialog.png", outputDir)), fullPage: true });
await page.getByRole("button", { name: "취소", exact: true }).click();
assert.equal(reopenCalls, 0, "cancel must not call reopen");
await doneCheckbox.click();
await page.getByLabel("재개 사유").fill("후속 검토 필요");
await page.getByRole("button", { name: "재개", exact: true }).click();
await page.waitForTimeout(50);
assert.equal(reopenCalls, 1, "confirm must call reopen once");

await page.getByPlaceholder("트리 검색").fill("상대방");
await page.getByPlaceholder("트리 검색").press("Enter");
await page.waitForFunction(() => document.activeElement?.dataset?.worktreeNodeId === "task-blocked");
assert.equal(await page.locator('[data-worktree-node-id="task-blocked"]').evaluate((node) => document.activeElement === node), true);
await page.screenshot({ path: fileURLToPath(new URL("worktree-search-focus.png", outputDir)), fullPage: true });

await page.locator('[data-worktree-node-id="task-done"]').focus();
await page.keyboard.press("Space");
await page.getByRole("dialog", { name: "완료 업무 재개" }).waitFor();
await page.getByLabel("재개 사유").pressSequentially("키보드 재개 검증");
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelector('[role="dialog"]') === null);
keyboard.spaceOpenedReopen = reopenCalls === 2;

for (const [scenario, passed] of Object.entries(keyboard)) assert.equal(passed, true, `${scenario} keyboard scenario`);

await page.addInitScript(() => {
  globalThis.__qaLongTasks = [];
  if (typeof PerformanceObserver === "function" && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
    new PerformanceObserver((list) => {
      globalThis.__qaLongTasks.push(...list.getEntries().map((entry) => entry.duration));
    }).observe({ type: "longtask", buffered: true });
  }
});
renderLargeWorktree = true;
const largeRenderStartedAt = performance.now();
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll('[role="treeitem"]').length === 301);
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const largeRenderMs = performance.now() - largeRenderStartedAt;
const largeRender = await page.evaluate(() => ({
  treeItems: document.querySelectorAll('[role="treeitem"]').length,
  pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  longTasks: globalThis.__qaLongTasks ?? [],
}));
assert.equal(largeRender.treeItems, 301, "300 persisted nodes plus projected root");
assert.equal(largeRender.pageOverflow, false, "300-node page overflow");
assert.ok(largeRenderMs <= 1500, `300-node stable render ${largeRenderMs.toFixed(2)}ms`);
assert.equal(largeRender.longTasks.filter((duration) => duration >= 50).length, 0, "300-node long main-thread tasks");
const largeLayout = await page.evaluate(() => {
  const canvas = document.querySelector(".matter-worktree-canvas");
  const root = document.querySelector('[data-worktree-node-id="worktree-root:qa"]');
  const tree = document.querySelector(".matter-worktree-tree");
  const canvasRect = canvas.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const treeRect = tree.getBoundingClientRect();
  return {
    canvasScrollLeft: canvas.scrollLeft,
    canvasScrollTop: canvas.scrollTop,
    canvas: { left: canvasRect.left, right: canvasRect.right, top: canvasRect.top, bottom: canvasRect.bottom },
    root: { left: rootRect.left, right: rootRect.right, top: rootRect.top, bottom: rootRect.bottom },
    tree: { left: treeRect.left, right: treeRect.right },
  };
});
assert.ok(largeLayout.root.left >= largeLayout.canvas.left && largeLayout.root.right <= largeLayout.canvas.right, "300-node root visible at canvas origin");
assert.ok(largeLayout.root.top >= largeLayout.canvas.top && largeLayout.root.bottom <= largeLayout.canvas.bottom, "300-node root visible vertically");
await page.screenshot({ path: fileURLToPath(new URL("worktree-300.png", outputDir)), fullPage: true });

renderLargeWorktree = false;
const recoveryStates = {};
for (const mode of ["denied", "conflict", "error"]) {
  worktreeResponseMode = mode;
  await page.reload({ waitUntil: "domcontentloaded" });
  const copy = mode === "denied"
    ? "이 Matter의 워크트리를 볼 권한이 없습니다."
    : mode === "conflict"
      ? "다른 사용자의 변경이 먼저 저장됐습니다. 변경 내용을 유지한 채 최신 버전을 다시 불러옵니다."
      : "네트워크 오류로 워크트리를 불러오지 못했습니다.";
  await page.getByText(copy, { exact: true }).waitFor();
  recoveryStates[mode] = true;
  await page.screenshot({ path: fileURLToPath(new URL(`worktree-${mode}.png`, outputDir)), fullPage: true });
}

await writeFile(new URL("receipt.json", outputDir), `${JSON.stringify({ results, reopenCalls, keyboardSearchFocused: true, keyboard, largeRenderMs, largeRender, largeLayout, recoveryStates }, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: true, results, reopenCalls, keyboard, largeRenderMs, largeRender, largeLayout, recoveryStates }));
