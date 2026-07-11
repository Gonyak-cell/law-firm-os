import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellSource = await readFile(new URL("../src/components/Shell.jsx", import.meta.url), "utf8");
const mattersSource = await readFile(new URL("../src/components/MattersSurface.jsx", import.meta.url), "utf8");
const apiClientSource = await readFile(new URL("../src/data/apiClient.js", import.meta.url), "utf8");
const worktreeSource = await readFile(new URL("../src/components/MatterWorktreeSurface.jsx", import.meta.url), "utf8").catch(() => "");
const stylesSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("WT-03-01 registers one Worktree route in the required work-management order", () => {
  const workManagement = shellSource.slice(
    shellSource.indexOf('label: "업무 관리"'),
    shellSource.indexOf('label: "사건 운영"')
  );

  assert.match(
    workManagement,
    /label: "업무 보드"[\s\S]*label: "워크트리"[\s\S]*label: "할 일"[\s\S]*label: "일정"/
  );
  assert.equal((workManagement.match(/section: "matter-worktree"/g) ?? []).length, 1);
  assert.match(mattersSource, /"matter-worktree"/);
});

test("WT-03-03 uses four equal-width practice-area controls", () => {
  for (const label of ["송무", "기업 자문", "분쟁", "트랜잭션"]) assert.match(worktreeSource, new RegExp(label));
  assert.match(stylesSource, /\.matter-worktree-practice-areas\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
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
  for (const label of ["전체 펼치기", "전체 접기", "화면 맞춤", "트리 검색"]) assert.match(worktreeSource, new RegExp(label));
  assert.match(worktreeSource, /scrollIntoView/);
  assert.match(worktreeSource, /function scrollNodeIntoCanvas/);
  assert.match(worktreeSource, /canvas\.scrollTo/);
  assert.match(stylesSource, /\.matter-worktree-canvas\s*\{[\s\S]*height:\s*min\(60vh, 640px\)[\s\S]*overflow:\s*auto/);
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
