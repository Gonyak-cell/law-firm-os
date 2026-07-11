import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, ChevronRight, Circle, FileText, Maximize2, Search, UserRound } from "lucide-react";
import { classifyMatterPracticeArea } from "../../../../packages/matter/src/practice-area.js";
import {
  completeMatterWorktreeTask,
  createMatterWorktree,
  createMatterWorktreeUiState,
  fetchMatterWorktree,
  readLawosSessionEnvelope,
  reopenMatterWorktreeTask,
} from "../data/apiClient.js";
import { buildMatterWorktreeTree, flattenMatterWorktree, matterWorktreeExpandableIds } from "./matterWorktreeTree.js";

const PRACTICE_AREAS = Object.freeze([
  Object.freeze({ id: "litigation", label: "송무" }),
  Object.freeze({ id: "corporate-advisory", label: "기업 자문" }),
  Object.freeze({ id: "dispute", label: "분쟁" }),
  Object.freeze({ id: "transaction", label: "트랜잭션" }),
]);

function urlSelection(source = globalThis) {
  try {
    const params = new URL(source.location.href).searchParams;
    const area = params.get("worktree_area");
    return {
      area: PRACTICE_AREAS.some((item) => item.id === area) ? area : PRACTICE_AREAS[0].id,
      matterId: params.get("worktree_matter") ?? "",
    };
  } catch {
    return { area: PRACTICE_AREAS[0].id, matterId: "" };
  }
}

function writeUrlSelection({ area, matterId }) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("worktree_area", area);
  if (matterId) url.searchParams.set("worktree_matter", matterId);
  else url.searchParams.delete("worktree_matter");
  window.history.pushState(null, "", url);
}

function matterSearchText(matter) {
  return [matter.matter_code, matter.title, matter.client_name, matter.client?.name]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ko-KR");
}

function mutationPayload(reason, extra = {}) {
  const session = readLawosSessionEnvelope();
  const actorId = session?.actor_ref ?? "matter_client_operator";
  const tenantId = session?.tenant_refs?.matter ?? session?.tenant_refs?.default ?? "tenant_amic_matter_vault";
  const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    tenant_id: tenantId,
    permission_ref: "ui_matter_worktree_live",
    audit_hint_ref: "ui_matter_worktree_probe",
    actor_id: actorId,
    idempotency_key: `matter-worktree-ui:${nonce}`,
    reason,
    source_ref: "matter-worktree-ui",
    occurred_at: new Date().toISOString(),
    ...extra,
  };
}

function WorktreeNode({ node, level, expandedIds, selectedId, pendingTaskId, onSelect, onToggleExpanded, onToggleTask, onKeyDown }) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const expanded = expandedIds.has(node.node_id);
  const task = node.task ?? null;
  const done = task?.status === "done";
  return (
    <div className="matter-worktree-branch">
      <div
        className={`matter-worktree-node ${selectedId === node.node_id ? "selected" : ""} ${task ? "task" : "branch"}`}
        role="treeitem"
        aria-level={level}
        aria-selected={selectedId === node.node_id}
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={selectedId === node.node_id ? 0 : -1}
        data-worktree-node-id={node.node_id}
        data-worktree-node-title={node.title}
        onClick={() => onSelect(node.node_id)}
        onKeyDown={(event) => onKeyDown(event, node)}
      >
        {hasChildren ? (
          <button type="button" className="matter-worktree-expander" aria-label={expanded ? `${node.title} 접기` : `${node.title} 펼치기`} onClick={(event) => { event.stopPropagation(); onToggleExpanded(node.node_id); }}>
            <ChevronRight aria-hidden="true" className={expanded ? "expanded" : ""} />
          </button>
        ) : <span className="matter-worktree-expander-spacer" />}
        {task ? (
          <input
            type="checkbox"
            checked={done}
            disabled={pendingTaskId === task.task_id}
            aria-label={`${node.title} 완료`}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleTask(node)}
          />
        ) : <Circle aria-hidden="true" className="matter-worktree-node-icon" />}
        <span className="matter-worktree-node-title">{node.title}</span>
        {task?.status && <small>{task.status}</small>}
      </div>
      {hasChildren && expanded && (
        <div className="matter-worktree-children" role="group">
          {children.map((child) => (
            <WorktreeNode
              key={child.node_id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              pendingTaskId={pendingTaskId}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
              onToggleTask={onToggleTask}
              onKeyDown={onKeyDown}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressSummary({ progress = {} }) {
  const done = Number(progress.done ?? 0);
  const total = Number(progress.total ?? 0);
  const percent = Number(progress.percent ?? 0);
  return (
    <div className="matter-worktree-progress">
      <div className="matter-worktree-progress-copy">
        <strong>진행률</strong>
        <span>{done}/{total} 완료</span>
      </div>
      <div className="matter-worktree-progressbar" role="progressbar" aria-label="워크트리 완료율" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
        <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      <div className="matter-worktree-status-counts">
        <span><Ban aria-hidden="true" />차단 {progress.blocked ?? 0}</span>
        <span><CalendarClock aria-hidden="true" />기한 초과 {progress.overdue ?? 0}</span>
      </div>
    </div>
  );
}

function WorktreeDetail({ node }) {
  const task = node?.task;
  return (
    <aside className="matter-worktree-detail" aria-label="선택한 노드 상세">
      <h3>{node?.title ?? "노드를 선택하세요"}</h3>
      <dl>
        <div><dt><UserRound aria-hidden="true" />담당자</dt><dd>{task?.assigned_to ?? "미지정"}</dd></div>
        <div><dt><CalendarClock aria-hidden="true" />기한</dt><dd>{task?.due_at ?? "없음"}</dd></div>
        <div><dt><CheckCircle2 aria-hidden="true" />상태</dt><dd>{task?.status ?? node?.node_type ?? "-"}</dd></div>
        <div><dt><FileText aria-hidden="true" />연결 문서</dt><dd>{task?.document_refs?.length ? task.document_refs.join(", ") : "없음"}</dd></div>
        <div><dt><AlertTriangle aria-hidden="true" />감사 요약</dt><dd>{task?.updated_at ? `최근 변경 ${task.updated_at}` : "변경 기록 없음"}</dd></div>
      </dl>
    </aside>
  );
}

export function MatterWorktreeSurface({ matters = [], liveCtx = "allow" }) {
  const initial = useMemo(() => urlSelection(), []);
  const [practiceArea, setPracticeArea] = useState(initial.area);
  const [matterId, setMatterId] = useState(initial.matterId);
  const [query, setQuery] = useState("");
  const [treeQuery, setTreeQuery] = useState("");
  const [worktreeResult, setWorktreeResult] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState("");
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const canvasRef = useRef(null);
  const preservedSelectionRef = useRef("");

  useEffect(() => {
    const restore = () => {
      const next = urlSelection(window);
      setPracticeArea(next.area);
      setMatterId(next.matterId);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const eligibleMatters = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    return matters.filter((matter) => {
      if (classifyMatterPracticeArea(matter) !== practiceArea) return false;
      return !normalized || matterSearchText(matter).includes(normalized);
    });
  }, [matters, practiceArea, query]);
  const selectedMatter = matters.find((matter) => matter.matter_id === matterId) ?? null;

  const loadWorktree = useCallback(async () => {
    if (!matterId) {
      setWorktreeResult(null);
      return;
    }
    preservedSelectionRef.current = selectedNodeId;
    setWorktreeResult(createMatterWorktreeUiState());
    const next = await fetchMatterWorktree({ matterId, ctx: liveCtx });
    setWorktreeResult(next);
    if (next.kind === "data") {
      const tree = buildMatterWorktreeTree(next.item);
      setExpandedIds(new Set(matterWorktreeExpandableIds(tree)));
      const ids = new Set(flattenMatterWorktree(tree, new Set(matterWorktreeExpandableIds(tree))).map(({ node }) => node.node_id));
      setSelectedNodeId(ids.has(preservedSelectionRef.current) ? preservedSelectionRef.current : tree?.node_id ?? "");
    }
  }, [liveCtx, matterId, selectedNodeId]);

  useEffect(() => { loadWorktree(); }, [matterId, liveCtx]);

  const tree = useMemo(() => buildMatterWorktreeTree(worktreeResult?.item), [worktreeResult?.item]);
  const visibleNodes = useMemo(() => flattenMatterWorktree(tree, expandedIds), [tree, expandedIds]);
  const selectedNode = visibleNodes.find(({ node }) => node.node_id === selectedNodeId)?.node
    ?? (tree?.node_id === selectedNodeId ? tree : null);

  useEffect(() => {
    if (!selectedNodeId || !tree) return undefined;
    const frame = requestAnimationFrame(() => scrollNodeIntoCanvas(selectedNodeId));
    return () => cancelAnimationFrame(frame);
  }, [selectedNodeId, tree]);

  function selectPracticeArea(nextArea) {
    setPracticeArea(nextArea);
    setMatterId("");
    setSelectedNodeId("");
    writeUrlSelection({ area: nextArea, matterId: "" });
  }

  function selectMatter(nextMatterId) {
    setMatterId(nextMatterId);
    setSelectedNodeId("");
    writeUrlSelection({ area: practiceArea, matterId: nextMatterId });
  }

  function toggleExpanded(nodeId) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  async function createEmptyWorktree() {
    setWorktreeResult(createMatterWorktreeUiState());
    const result = await createMatterWorktree({
      matterId,
      ctx: liveCtx,
      payload: mutationPayload("빈 워크트리 생성", { worktree_id: `worktree_${globalThis.crypto?.randomUUID?.() ?? Date.now()}` }),
    });
    if (result.kind === "data" || result.kind === "empty") await loadWorktree();
    else setWorktreeResult(result);
  }

  async function completeTask(node) {
    const taskId = node.task.task_id;
    setPendingTaskId(taskId);
    const result = await completeMatterWorktreeTask({ matterId, taskId, ctx: liveCtx, payload: mutationPayload("워크트리 체크 완료") });
    setPendingTaskId("");
    if (result.kind === "data" || result.kind === "empty") await loadWorktree();
    else setWorktreeResult(result);
  }

  function toggleTask(node) {
    if (node.task?.status === "done") {
      setReopenTarget(node);
      setReopenReason("");
      return;
    }
    completeTask(node);
  }

  async function confirmReopen() {
    if (!reopenTarget || !reopenReason.trim()) return;
    const taskId = reopenTarget.task.task_id;
    setPendingTaskId(taskId);
    setReopenTarget(null);
    const result = await reopenMatterWorktreeTask({ matterId, taskId, ctx: liveCtx, payload: mutationPayload(reopenReason.trim()) });
    setPendingTaskId("");
    if (result.kind === "data" || result.kind === "empty") await loadWorktree();
    else setWorktreeResult(result);
  }

  function focusNode(nodeId) {
    setSelectedNodeId(nodeId);
    requestAnimationFrame(() => document.querySelector(`[data-worktree-node-id="${CSS.escape(nodeId)}"]`)?.focus());
  }

  function scrollNodeIntoCanvas(nodeId) {
    const canvas = canvasRef.current;
    const node = document.querySelector(`[data-worktree-node-id="${CSS.escape(nodeId)}"]`);
    if (!canvas || !node) return;
    const canvasRect = canvas.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const inset = 16;
    let left = canvas.scrollLeft;
    let top = canvas.scrollTop;
    if (nodeRect.left < canvasRect.left + inset || nodeRect.right > canvasRect.right - inset) {
      left += nodeRect.left - canvasRect.left - inset;
    }
    if (nodeRect.top < canvasRect.top + inset || nodeRect.bottom > canvasRect.bottom - inset) {
      top += nodeRect.top - canvasRect.top - (canvas.clientHeight - nodeRect.height) / 2;
    }
    canvas.scrollTo({ left: Math.max(0, left), top: Math.max(0, top) });
  }

  function handleNodeKeyDown(event, node) {
    const currentIndex = visibleNodes.findIndex((item) => item.node.node_id === node.node_id);
    const current = visibleNodes[currentIndex];
    if (event.key === "ArrowDown" && visibleNodes[currentIndex + 1]) focusNode(visibleNodes[currentIndex + 1].node.node_id);
    else if (event.key === "ArrowUp" && visibleNodes[currentIndex - 1]) focusNode(visibleNodes[currentIndex - 1].node.node_id);
    else if (event.key === "ArrowRight") {
      if ((node.children ?? []).length > 0 && !expandedIds.has(node.node_id)) toggleExpanded(node.node_id);
      else if (node.children?.[0]) focusNode(node.children[0].node_id);
    } else if (event.key === "ArrowLeft") {
      if (expandedIds.has(node.node_id)) toggleExpanded(node.node_id);
      else if (current?.parentId) focusNode(current.parentId);
    } else if (event.key === " " && node.task) toggleTask(node);
    else return;
    event.preventDefault();
  }

  function focusSearchResult() {
    const normalized = treeQuery.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return;
    const target = flattenMatterWorktree(tree, new Set(matterWorktreeExpandableIds(tree))).find(({ node }) => node.title?.toLocaleLowerCase("ko-KR").includes(normalized));
    if (!target) return;
    setExpandedIds(new Set(matterWorktreeExpandableIds(tree)));
    requestAnimationFrame(() => {
      const element = document.querySelector(`[data-worktree-node-id="${CSS.escape(target.node.node_id)}"]`);
      element?.scrollIntoView({ block: "center", inline: "center" });
      focusNode(target.node.node_id);
    });
  }

  function fitCanvas() {
    canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }

  function renderWorktreeState() {
    if (!selectedMatter) return <p>Matter Code를 선택하면 워크트리를 표시합니다.</p>;
    switch (worktreeResult?.kind) {
      case "loading": return <p role="status">워크트리를 불러오는 중입니다.</p>;
      case "empty": return <div className="matter-worktree-empty"><p>등록된 워크트리가 없습니다.</p><button type="button" onClick={createEmptyWorktree}>빈 워크트리 만들기</button></div>;
      case "denied": return <div className="matter-worktree-message denied"><Ban aria-hidden="true" /><p>이 Matter의 워크트리를 볼 권한이 없습니다.</p></div>;
      case "error": return <div className="matter-worktree-message error"><AlertTriangle aria-hidden="true" /><p>네트워크 오류로 워크트리를 불러오지 못했습니다.</p><button type="button" onClick={loadWorktree}>다시 시도</button></div>;
      case "conflict": return <div className="matter-worktree-message conflict"><AlertTriangle aria-hidden="true" /><p>다른 사용자의 변경이 먼저 저장됐습니다. 변경 내용을 유지한 채 최신 버전을 다시 불러옵니다.</p><button type="button" onClick={loadWorktree}>최신 버전 불러오기</button></div>;
      case "data": return (
        <>
          <ProgressSummary progress={worktreeResult.item?.progress} />
          <div className="matter-worktree-tools" aria-label="캔버스 도구">
            <button type="button" onClick={() => setExpandedIds(new Set(matterWorktreeExpandableIds(tree)))}>전체 펼치기</button>
            <button type="button" onClick={() => setExpandedIds(new Set(tree ? [tree.node_id] : []))}>전체 접기</button>
            <label><Search aria-hidden="true" /><span className="sr-only">트리 검색</span><input value={treeQuery} onChange={(event) => setTreeQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") focusSearchResult(); }} placeholder="트리 검색" /></label>
            <button type="button" onClick={fitCanvas}><Maximize2 aria-hidden="true" />화면 맞춤</button>
          </div>
          <div className="matter-worktree-workspace">
            <div className="matter-worktree-canvas" ref={canvasRef}>
              <div className="matter-worktree-tree" role="tree" aria-label={`${selectedMatter.matter_code ?? selectedMatter.matter_id} 워크트리`}>
                {tree && <WorktreeNode node={tree} level={1} expandedIds={expandedIds} selectedId={selectedNodeId} pendingTaskId={pendingTaskId} onSelect={setSelectedNodeId} onToggleExpanded={toggleExpanded} onToggleTask={toggleTask} onKeyDown={handleNodeKeyDown} />}
              </div>
            </div>
            <WorktreeDetail node={selectedNode} />
          </div>
        </>
      );
      default: return <p>Matter Code를 선택하면 워크트리를 표시합니다.</p>;
    }
  }

  return (
    <section className="matter-worktree" aria-label="워크트리">
      <div className="matter-worktree-practice-areas" aria-label="업무 분야">
        {PRACTICE_AREAS.map((area) => (
          <button key={area.id} type="button" className={practiceArea === area.id ? "active" : ""} aria-pressed={practiceArea === area.id} onClick={() => selectPracticeArea(area.id)}>{area.label}</button>
        ))}
      </div>
      <div className="matter-worktree-selector">
        <label><span>Matter Code 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="코드, 제목, 고객명" /></label>
        <label><span>Matter Code 선택</span><select value={selectedMatter?.matter_id ?? ""} onChange={(event) => selectMatter(event.target.value)}><option value="">선택하세요</option>{eligibleMatters.map((matter) => <option key={matter.matter_id} value={matter.matter_id}>{matter.matter_code ?? matter.matter_id} · {matter.title}</option>)}</select></label>
      </div>
      <div className="matter-worktree-stage" data-worktree-matter-id={selectedMatter?.matter_id ?? ""}>{renderWorktreeState()}</div>
      {reopenTarget && (
        <div className="matter-worktree-dialog-backdrop">
          <div className="matter-worktree-dialog" role="dialog" aria-modal="true" aria-labelledby="matter-worktree-reopen-title">
            <h3 id="matter-worktree-reopen-title">완료 업무 재개</h3>
            <p>{reopenTarget.title}</p>
            <label><span>재개 사유</span><textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} autoFocus /></label>
            <div><button type="button" onClick={() => setReopenTarget(null)}>취소</button><button type="button" disabled={!reopenReason.trim()} onClick={confirmReopen}>재개</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
