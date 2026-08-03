import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellSource = await readFile(new URL("../src/components/Shell.jsx", import.meta.url), "utf8");
const mattersSource = await readFile(new URL("../src/components/MattersSurface.jsx", import.meta.url), "utf8");
const apiClientSource = await readFile(new URL("../src/data/apiClient.js", import.meta.url), "utf8");
const worktreeSource = await readFile(new URL("../src/components/MatterWorktreeSurface.jsx", import.meta.url), "utf8").catch(() => "");
const stylesSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("WT-03-01 registers one Worktree route in the required work-management order", () => {
  assert.match(shellSource, /MATTER_CANONICAL_ROUTES[\s\S]*id: "matter-work"[\s\S]*section: "matter-work"/);
  assert.match(shellSource, /id: "matter-calendar"[\s\S]*section: "matter-calendar"/);
  assert.equal((shellSource.match(/section: "matter-worktree"/g) ?? []).length, 0);
  assert.match(mattersSource, /"matter-worktree"/);
});

test("WT-03-03 keeps the Worktree top-menu style as the Matter board style source", () => {
  for (const label of ["송무", "기업 자문", "분쟁", "트랜잭션"]) assert.match(worktreeSource, new RegExp(label));
  assert.match(worktreeSource, /className="matter-worktree-practice-areas"/);
  assert.doesNotMatch(worktreeSource, /className="matter-board-tabs matter-worktree-practice-areas"/);
  assert.match(stylesSource, /\.matter-worktree-practice-areas\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(stylesSource, /\.matter-board-tabs button,\s*\.matter-worktree-practice-areas button\s*\{[^}]*min-height:\s*var\(--am-tab-height\);[^}]*border:\s*1px solid var\(--am-border\);[^}]*background:\s*var\(--am-surface\);/);
  assert.match(stylesSource, /\.matter-board-tabs button\.active,\s*\.matter-worktree-practice-areas button\.active\s*\{[^}]*border-color:\s*var\(--am-success\);[^}]*background:\s*color-mix\(in srgb, var\(--am-success\) 10%, var\(--am-surface\)\);[^}]*font-weight:\s*700;/);
  assert.match(worktreeSource, /className=\{practiceArea === area\.id \? "active" : ""\}[\s\S]*aria-pressed=\{practiceArea === area\.id\}[\s\S]*onClick=\{\(\) => selectPracticeArea\(area\.id\)\}/);
  assert.match(stylesSource, /@media \(max-width: 768px\)[\s\S]*?\.matter-board-tabs,\s*\.matter-worktree-practice-areas,[\s\S]*?grid-template-columns:\s*1fr/);
});

test("WT-03-04 preserves practice area and Matter Code selection in URL state", () => {
  assert.match(worktreeSource, /worktree_area/);
  assert.match(worktreeSource, /worktree_matter/);
  assert.match(worktreeSource, /Matter Code 검색/);
  assert.match(worktreeSource, /popstate/);
});

test("WT-03-05 renders a collapsible root, branch, and Task tree with connectors", () => {
  assert.match(worktreeSource, /role="tree"/);
  assert.match(worktreeSource, /role="treeitem"/);
  assert.match(worktreeSource, /toggleExpanded/);
  assert.match(stylesSource, /\.matter-worktree-children::before/);
  assert.match(stylesSource, /--worktree-node-width/);
  assert.match(worktreeSource, /node\.node_type === "virtual_branch" \? "virtual"/);
  assert.match(stylesSource, /\.matter-worktree-node\.virtual/);
});

test("WT-03-06 completes Tasks and requires confirmation plus reason to reopen", () => {
  assert.match(worktreeSource, /completeMatterWorktreeTask/);
  assert.match(worktreeSource, /reopenMatterWorktreeTask/);
  assert.match(worktreeSource, /role="dialog"/);
  assert.match(worktreeSource, /재개 사유/);
});

test("WT-03-07 exposes progress, blocked, and overdue with text and semantics", () => {
  assert.match(worktreeSource, /role="progressbar"/);
  assert.match(worktreeSource, /aria-valuenow/);
  assert.match(worktreeSource, /차단/);
  assert.match(worktreeSource, /기한 초과/);
});

test("WT-03-08 renders the selected Task detail panel", () => {
  for (const label of ["담당자", "기한", "상태", "연결 문서", "감사 요약"]) assert.match(worktreeSource, new RegExp(label));
  assert.match(worktreeSource, /matter-worktree-detail/);
});

test("WT-03-09 provides expand, collapse, search, and fit tools", () => {
  for (const label of ["전체 펼치기", "전체 접기", "상위 구조 맞춤", "트리 검색"]) assert.match(worktreeSource, new RegExp(label));
  assert.match(worktreeSource, /scrollIntoView/);
  assert.match(worktreeSource, /function scrollNodeIntoCanvas/);
  assert.match(worktreeSource, /canvas\.scrollTo/);
  assert.match(stylesSource, /\.matter-worktree-canvas\s*\{[\s\S]*height:\s*min\(60vh, 640px\)[\s\S]*overflow:\s*auto/);
  assert.match(worktreeSource, /setExpandedIds\(new Set\(tree \? \[tree\.node_id\] : \[\]\)\)/);
  assert.match(stylesSource, /\.matter-worktree-tools label:focus-within/);
});

test("WT-03-10 switches to an outline without page overflow at 1024px", () => {
  assert.match(stylesSource, /@media \(max-width: 1024px\)[\s\S]*\.matter-worktree-workspace/);
  assert.match(stylesSource, /\.matter-worktree-canvas\s*\{[\s\S]*overflow:\s*auto/);
  assert.match(stylesSource, /@media \(max-width: 768px\)[\s\S]*\.matter-worktree-node\s*\{[\s\S]*grid-template-columns:\s*24px 22px minmax\(0, 1fr\)/);
  assert.match(stylesSource, /@media \(max-width: 768px\)[\s\S]*\.matter-worktree-node small\s*\{[\s\S]*grid-column:\s*3/);
});

test("WT-03-11 supports tree keyboard navigation and visible focus", () => {
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]) assert.match(worktreeSource, new RegExp(JSON.stringify(key).slice(1, -1)));
  assert.match(stylesSource, /\.matter-worktree-node:focus-visible/);
});

test("WT-03-12 distinguishes denied, network error, and conflict recovery", () => {
  assert.match(worktreeSource, /case "denied"/);
  assert.match(worktreeSource, /case "error"/);
  assert.match(worktreeSource, /case "conflict"/);
  assert.match(worktreeSource, /변경 내용을 유지/);
});

test("WT-03-02 exposes Worktree read and mutation clients plus six explicit UI states", () => {
  for (const name of [
    "fetchMatterWorktree",
    "createMatterWorktree",
    "applyMatterWorktreeTemplate",
    "createMatterWorktreeNode",
    "patchMatterWorktreeNode",
    "deleteMatterWorktreeNode",
    "completeMatterWorktreeTask",
    "reopenMatterWorktreeTask",
  ]) {
    assert.match(apiClientSource, new RegExp(`export (?:async )?function ${name}`));
  }
  for (const kind of ["loading", "data", "empty", "denied", "error", "conflict"]) {
    assert.match(apiClientSource, new RegExp(`\\b${kind}\\b`));
  }
});

test("Worktree exposes approved template application and structure editing controls", () => {
  for (const label of ["승인된 템플릿", "템플릿 적용", "하위 노드 추가", "선택 노드 이름 변경", "선택 노드 보관", "연결할 업무"]) {
    assert.match(worktreeSource, new RegExp(label));
  }
  for (const client of ["fetchMatterWorktreeTemplates", "applyMatterWorktreeTemplate", "createMatterWorktreeNode", "patchMatterWorktreeNode", "deleteMatterWorktreeNode"]) {
    assert.match(worktreeSource, new RegExp(client));
  }
});

test("Worktree node creation sends every required model field", () => {
  assert.match(worktreeSource, /status:\s*"active"/);
  assert.match(worktreeSource, /task_id:\s*nodeType === "task" \? taskId\.trim\(\) : null/);
});

test("tablet and mobile keep the global rail visible and move contextual navigation into a vertical drawer", () => {
  assert.match(stylesSource, /\.global-rail\s*\{[\s\S]*width:\s*var\(--am-rail-width\)/);
  assert.match(stylesSource, /@media \(max-width: 1199px\)[\s\S]*\.global-rail-context-toggle\s*\{[\s\S]*display:\s*grid/);
  assert.match(stylesSource, /@media \(max-width: 1199px\)[\s\S]*\.app-frame > \.sidebar,[\s\S]*position:\s*fixed;[\s\S]*left:\s*var\(--am-rail-width\)/);
  assert.match(stylesSource, /@media \(max-width: 1199px\)[\s\S]*\.app-frame > \.sidebar \.sidebar-subnav\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.doesNotMatch(shellSource, /top-axis-nav|top-axis-item/);
});
