import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare2,
  Clock3,
  Columns3,
  Download,
  FileText,
  List,
  MessageSquareText,
  Plus,
  ReceiptText,
  Users
} from "lucide-react";
import { MatterOperationsState } from "./MatterOperationsState.jsx";

const WORK_VIEWS = Object.freeze([
  ["my", "내 업무"],
  ["overdue", "기한 초과"],
  ["waiting", "대기"],
  ["unassigned", "미배정"]
]);
const WORK_LAYOUTS = Object.freeze([
  ["list", "목록", List],
  ["board", "보드", Columns3],
  ["worktree", "워크트리", FileText]
]);
const FOLLOWUP_VIEWS = Object.freeze([
  ["today", "오늘 후속"],
  ["waiting_client", "의뢰인 답변 대기"],
  ["stale_7d", "7일 연락 없음"]
]);
const FOLLOWUP_STATUSES = Object.freeze([
  ["open", "진행"],
  ["waiting_client", "의뢰인 답변 대기"],
  ["waiting_firm", "우리 답변 대기"],
  ["done", "완료"]
]);
const FOLLOWUP_CHANNELS = Object.freeze([
  ["call", "전화"],
  ["email", "이메일"],
  ["meeting", "회의"],
  ["message", "메시지"],
  ["portal", "포털"],
  ["request", "요청"],
  ["note", "메모"]
]);
const TIME_VIEWS = Object.freeze([
  ["time", "내 시간"],
  ["missing", "누락"],
  ["wip", "청구 대기"],
  ["ar", "미수금"]
]);
const MATTER_VIEWS = Object.freeze([
  ["active", "진행"],
  ["closeout", "종결 점검"],
  ["closed", "종결"],
  ["archived", "보관"]
]);
const WEEKLY_REVIEW_LANES = Object.freeze(["overdue", "unassigned", "our_response", "missing_time", "wip", "ar"]);
const BOARD_COLUMNS = Object.freeze([
  ["todo", "예정"],
  ["in_progress", "진행"],
  ["blocked", "막힘"],
  ["done", "완료"],
  ["cancelled", "취소"]
]);
const TASK_TRANSITIONS = Object.freeze({
  todo: Object.freeze(["in_progress", "blocked", "done", "cancelled"]),
  in_progress: Object.freeze(["blocked", "done", "cancelled"]),
  blocked: Object.freeze(["in_progress", "cancelled"]),
  done: Object.freeze(["in_progress"]),
  cancelled: Object.freeze([])
});

function dataPayload(result) {
  if (result?.kind !== "data") return {};
  if (result.item && typeof result.item === "object") return result.item;
  return result;
}

function pickRows(result, keys = []) {
  const payload = dataPayload(result);
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.views?.[key])) return payload.views[key];
    if (Array.isArray(payload?.queues?.[key])) return payload.queues[key];
  }
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function text(value, fallback = "미지정") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function matterId(row) {
  return row?.matter_id ?? row?.matter?.matter_id ?? row?.matter?.id ?? null;
}

function matterCode(row, index = 0) {
  return text(row?.matter_code ?? row?.matter_number ?? row?.matter?.matter_code ?? row?.matter?.code, `Matter ${index + 1}`);
}

function rowTitle(row, index = 0) {
  return text(row?.title ?? row?.task_title ?? row?.subject ?? row?.matter?.title, `업무 ${index + 1}`);
}

function ownerLabel(row) {
  return text(
    row?.owner_display_name ??
      row?.assignee_display_name ??
      row?.responsible_display_name ??
      row?.owner_user_id ??
      row?.owner_id ??
      row?.assignee_user_id,
    "미배정"
  );
}

function dateLabel(value, fallback = "일정 없음") {
  const parsed = new Date(value ?? "");
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: parsed.getHours() || parsed.getMinutes() ? "2-digit" : undefined,
    minute: parsed.getHours() || parsed.getMinutes() ? "2-digit" : undefined
  }).format(parsed);
}

function dayLabel(value) {
  const parsed = new Date(value ?? "");
  if (Number.isNaN(parsed.getTime())) return "날짜 미정";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }).format(parsed);
}

function moneyLabel(value, currency = "KRW") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "금액 확인 필요";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: text(currency, "KRW"),
    maximumFractionDigits: 0
  }).format(amount);
}

function minutesLabel(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "시간 확인 필요";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}시간${remainder ? ` ${remainder}분` : ""}` : `${remainder}분`;
}

function taskStatus(value) {
  return BOARD_COLUMNS.find(([id]) => id === value)?.[1] ?? text(value, "예정");
}

function taskTransitionReasonPrompt(task, status) {
  const currentStatus = task?.status ?? "todo";
  if (status === "blocked") {
    return {
      title: "막힘 사유",
      description: "업무가 멈춘 이유를 기록합니다."
    };
  }
  if (status === "in_progress" && currentStatus === "done") {
    return {
      title: "업무 재개 사유",
      description: "완료한 업무를 다시 진행하는 이유를 기록합니다."
    };
  }
  if (status === "in_progress" && currentStatus === "blocked") {
    return {
      title: "막힘 해제 사유",
      description: "업무를 다시 진행할 수 있게 된 이유를 기록합니다."
    };
  }
  return null;
}

function formStatus(result, success = "저장했습니다") {
  if (!result) return "";
  if (result.kind === "data") return success;
  if (["error", "blocked", "guarded"].includes(result.kind)) return "저장하지 못했습니다";
  return "";
}

function mutationStatus(result, success = "저장했습니다.") {
  if (!result) return "";
  if (result.kind === "data") return success;
  if (result.kind === "guarded") return "권한이 없어 저장하지 못했습니다.";
  return result.message ?? "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function mutationControlsAllowed(result) {
  if (!result || result.kind === "loading") return false;
  if (["error", "blocked", "guarded"].includes(result.kind)) return false;
  return !["denied", "blocked", "review_required", "error"].includes(result.uiState);
}

function uiAttemptKey(prefix) {
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${id}`;
}

function splitRefs(value) {
  return [...new Set(String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function datetimeLocalValue(value) {
  const parsed = new Date(value ?? "");
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function rowKey(row, index) {
  return row?.task_id ?? row?.followup_id ?? row?.follow_up_id ?? row?.event_id ?? row?.deadline_id ?? row?.item_id ?? row?.id ?? row?.matter_id ?? row?.invoice_id ?? row?.wip_item_id ?? row?.time_entry_id ?? row?.actor_id ?? `row-${index}`;
}

function todayQueueIdentity(row, index) {
  const modelType = row?.ledger_ref?.model_type
    ?? row?.source_type
    ?? row?.source
    ?? (row?.task_id ? "task" : "item");
  const resourceId = row?.ledger_ref?.id ?? rowKey(row, index);
  return `${modelType}:${resourceId}`;
}

function todayQueueRouteIdentity(route) {
  return `${route.section}:${route.filter ?? route.href ?? ""}`;
}

function mergeTodayQueueRows(rows) {
  const merged = new Map();
  rows.forEach((row, index) => {
    const identity = todayQueueIdentity(row, index);
    const existing = merged.get(identity);
    const label = text(row.queue_label ?? row.due_label, "");
    const routes = row.route?.section ? [{ ...row.route, label }] : [];
    if (!existing) {
      merged.set(identity, {
        ...row,
        queue_labels: label ? [label] : [],
        queue_routes: routes
      });
      return;
    }
    const labels = [...new Set([...existing.queue_labels, label].filter(Boolean))];
    const queueRoutes = new Map(
      [...existing.queue_routes, ...routes]
        .map((route) => [todayQueueRouteIdentity(route), route])
    );
    merged.set(identity, {
      ...existing,
      queue_labels: labels,
      queue_label: labels.join(" · "),
      queue_routes: [...queueRoutes.values()]
    });
  });
  return [...merged.values()];
}

function ledgerId(row) {
  return row?.ledger_ref?.id ?? row?.task_id ?? row?.event_id ?? row?.deadline_id ?? row?.id;
}

function ledgerRef(row) {
  const id = ledgerId(row);
  const modelType = row?.ledger_ref?.model_type
    ?? (row?.task_id ? "MatterTask" : row?.event_id || row?.deadline_id ? "MatterCalendarEvent" : null);
  const rowMatterId = matterId(row);
  return id && modelType && rowMatterId
    ? { model_type: modelType, id, matter_id: rowMatterId }
    : null;
}

function taskStatusOptions(task) {
  const status = task?.status ?? "todo";
  return [status, ...(TASK_TRANSITIONS[status] ?? [])]
    .map((value) => BOARD_COLUMNS.find(([id]) => id === value))
    .filter(Boolean);
}

function SegmentedControl({ label, items, value, onChange }) {
  function handleKeyDown(event, index) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    onChange(items[nextIndex][0]);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')?.[nextIndex]?.focus();
  }

  return (
    <div className="matter-ops-segments" role="tablist" aria-label={label}>
      {items.map(([id, itemLabel, Icon], index) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          tabIndex={value === id ? 0 : -1}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {Icon && <Icon size={15} aria-hidden="true" />}
          {itemLabel}
        </button>
      ))}
    </div>
  );
}

function ScreenHeader({ title, description, actions }) {
  return (
    <header className="matter-ops-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions && <div className="matter-ops-actions">{actions}</div>}
    </header>
  );
}

function OpenMatterButton({ row, onSelectMatter, label = "사건 열기" }) {
  const id = matterId(row);
  if (!id || !onSelectMatter) return null;
  return (
    <button type="button" className="matter-ops-row-action" onClick={() => onSelectMatter(id, ledgerRef(row))}>
      <span>{label}</span>
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );
}

function MatterListScreen({
  result,
  matters,
  mode,
  view,
  onViewChange,
  onRetry,
  onSelectMatter,
  opening,
  archivePendingId,
  archiveResult,
  onArchiveMatter,
  restorePendingId,
  restoreResult,
  onRestoreMatter
}) {
  const normalizedMode = mode === "archived" ? "archived" : mode === "closeout" ? "closeout" : view;
  const visible = matters.filter((matter) => {
    if (normalizedMode === "archived") return matter.status === "archived";
    if (normalizedMode === "closed") return matter.status === "closed";
    if (normalizedMode === "closeout") return !["closed", "archived"].includes(matter.status);
    return !["closed", "archived"].includes(matter.status);
  });

  return (
    <section className="matter-ops-screen" data-matter-small-firm-screen="matter-list">
      <ScreenHeader title="사건" description="활성·종결·보관 사건을 같은 목록에서 확인합니다." />
      <SegmentedControl label="사건 저장 보기" items={MATTER_VIEWS} value={normalizedMode} onChange={onViewChange} />
      {mode === "opening" && mutationControlsAllowed(result) && opening}
      {restoreResult && (
        <p
          className={`matter-ops-mutation-status ${restoreResult.kind === "data" ? "success" : "error"}`}
          role={restoreResult.kind === "data" ? "status" : "alert"}
          data-matter-restore-mutation-status={restoreResult.kind}
        >
          {formStatus(restoreResult, "사건을 종결 목록으로 복원했습니다.")}
        </p>
      )}
      {archiveResult && (
        <p
          className={`matter-ops-mutation-status ${archiveResult.kind === "data" ? "success" : "error"}`}
          role={archiveResult.kind === "data" ? "status" : "alert"}
          data-matter-archive-mutation-status={archiveResult.kind}
        >
          {formStatus(archiveResult, "사건을 보관했습니다.")}
        </p>
      )}
      <MatterOperationsState result={result} noun="사건" empty={visible.length === 0} onRetry={onRetry}>
        <div className="matter-ops-table-wrap" tabIndex="0">
          <table className="matter-ops-table">
            <thead>
              <tr>
                <th>사건</th>
                <th>의뢰인</th>
                <th>담당·백업</th>
                <th>다음 행동</th>
                <th>다음 기한</th>
                {normalizedMode === "closeout" && <th>종결 점검</th>}
                <th><span className="sr-only">열기</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((matter, index) => {
                const blockersKnown = Array.isArray(matter.close_blockers);
                const blockers = blockersKnown ? matter.close_blockers : [];
                return (
                  <tr key={matter.matter_id ?? index}>
                    <td><strong>{matterCode(matter, index)}</strong><span>{rowTitle(matter, index)}</span></td>
                    <td>{text(matter.client_display_name ?? matter.client_name)}</td>
                    <td>{ownerLabel(matter)}<span>{text(matter.backup_display_name ?? matter.backup_user_id, "백업 미지정")}</span></td>
                    <td>{text(matter.next_action_title ?? matter.next_action, "다음 행동 없음")}</td>
                    <td>{dateLabel(matter.next_deadline_at ?? matter.due_at)}</td>
                    {normalizedMode === "closeout" && (
                      <td>
                        {blockersKnown
                          ? blockers.length ? `${blockers.length}개 확인 필요` : "종결 가능"
                          : <button type="button" className="matter-ops-queue-link" onClick={() => onSelectMatter(matter.matter_id)}>사건을 열어 점검</button>}
                      </td>
                    )}
                    <td>
                      <div className="matter-ops-row-actions">
                        {normalizedMode === "closed" && (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={archivePendingId === matter.matter_id}
                            onClick={() => onArchiveMatter?.(matter)}
                          >
                            {archivePendingId === matter.matter_id ? "보관 중" : "보관"}
                          </button>
                        )}
                        {normalizedMode === "archived" && (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={restorePendingId === matter.matter_id}
                            onClick={() => onRestoreMatter(matter)}
                          >
                            {restorePendingId === matter.matter_id ? "복원 중" : "복원"}
                          </button>
                        )}
                        <OpenMatterButton row={matter} onSelectMatter={onSelectMatter} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MatterOperationsState>
    </section>
  );
}

function TodayScreen({
  result,
  matters,
  onRetry,
  onSelectMatter,
  onNavigateSection,
  reportPending,
  reportResult,
  onDownloadReport
}) {
  const payload = dataPayload(result);
  const mattersById = new Map(matters.map((matter) => [matter.matter_id, matter]));
  const laneRows = Array.isArray(payload.lanes)
    ? payload.lanes.flatMap((lane) => (lane.items ?? []).map((row) => {
        const matter = mattersById.get(row.matter_id);
        return {
          ...row,
          matter: {
            ...row.matter,
            code: row.matter?.code ?? matter?.matter_code ?? matter?.matter_number,
            title: row.matter?.title ?? matter?.title
          },
          queue_label: lane.label,
          lane_id: lane.id,
          route: row.route ?? lane.route
        };
      }))
    : [];
  const directQueue = pickRows(result, ["priority_rows", "priority_queue", "today_rows", "tasks"]);
  const queue = mergeTodayQueueRows(directQueue.length ? directQueue : laneRows);
  const schedule = pickRows({ kind: "data", item: payload }, ["week_schedule", "calendar", "deadlines"]);
  const configuredNextActions = pickRows({ kind: "data", item: dataPayload(result) }, ["next_actions", "matter_next_actions"]);
  const nextActions = configuredNextActions.length
    ? configuredNextActions
    : matters.filter((matter) => matter.next_action || matter.next_action_title);
  const configuredReview = payload.report?.questions ?? payload.weekly_report?.questions ?? pickRows({ kind: "data", item: payload }, ["weekly_review", "review_rows"]);
  const review = configuredReview.length
    ? configuredReview
    : WEEKLY_REVIEW_LANES
        .map((laneId) => payload.lanes?.find((lane) => lane.id === laneId))
        .filter(Boolean)
        .map((lane) => ({ id: lane.id, question: lane.label, count: lane.count, route: lane.route }));
  const laneCounts = Object.fromEntries((payload.lanes ?? []).map((lane) => [lane.id, lane.count]));
  const metrics = payload.metrics ?? payload.summary ?? {
    missing_time_count: laneCounts.missing_time,
    wip_count: laneCounts.wip,
    overdue_ar_count: laneCounts.ar
  };
  const hasContent = queue.length + schedule.length + nextActions.length > 0
    || Number(payload.total_item_count ?? 0) > 0;

  return (
    <section className="matter-ops-screen" data-matter-small-firm-screen="matter-today">
      <ScreenHeader
        title="오늘"
        description="기한, 후속, 시간과 청구에서 지금 처리할 일을 모았습니다."
        actions={(
          <>
            <button type="button" className="secondary-button" onClick={() => onNavigateSection("matter-work", "new")}><Plus size={15} aria-hidden="true" />새 업무</button>
            <button type="button" className="primary-button" onClick={() => onNavigateSection("matter-time-billing", "time")}><Clock3 size={15} aria-hidden="true" />시간 입력</button>
          </>
        )}
      />
      <MatterOperationsState result={result} noun="오늘 업무" empty={!hasContent} onRetry={onRetry}>
        <section className="matter-ops-section matter-ops-priority" aria-labelledby="matter-today-priority">
          <h3 id="matter-today-priority">지금 처리할 것 <span>{queue.length}</span></h3>
          {queue.length === 0 ? (
            <p className="matter-ops-inline-empty">지금 바로 처리할 업무가 없습니다.</p>
          ) : (
            <div className="matter-ops-row-list">
              {queue.map((row, index) => (
                <div className="matter-ops-priority-row" key={todayQueueIdentity(row, index)} data-task-id={row.task_id ?? (row.source_type === "task" ? row.item_id : undefined)}>
                  <span className={`matter-ops-risk matter-ops-risk-${text(row.priority ?? row.risk, "normal")}`}>
                    {text(row.queue_label ?? row.due_label ?? taskStatus(row.status), "확인")}
                  </span>
                  <span><strong>{matterCode(row, index)} · {rowTitle(row, index)}</strong><small>{ownerLabel(row)}</small></span>
                  {row.queue_routes.map((route) => (
                    <button
                      type="button"
                      className="matter-ops-queue-link"
                      key={todayQueueRouteIdentity(route)}
                      onClick={() => onNavigateSection(route.section, route.filter)}
                    >
                      {route.label ? `${route.label} 보기` : "저장 보기"}
                    </button>
                  ))}
                  <OpenMatterButton row={row} onSelectMatter={onSelectMatter} label="열기" />
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="matter-ops-two-column">
          <section className="matter-ops-section" aria-labelledby="matter-today-week">
            <h3 id="matter-today-week"><CalendarDays size={17} aria-hidden="true" />이번 주 일정 <span>{schedule.length}</span></h3>
            <div className="matter-ops-compact-list">
              {schedule.length === 0 && <p className="matter-ops-inline-empty">이번 주 일정이 없습니다.</p>}
              {schedule.slice(0, 6).map((row, index) => (
                <button type="button" key={rowKey(row, index)} onClick={() => matterId(row) && onSelectMatter(matterId(row), ledgerRef(row))}>
                  <time>{dateLabel(row.starts_at ?? row.due_at ?? row.occurred_at)}</time>
                  <strong>{rowTitle(row, index)}</strong>
                  <span>{matterCode(row, index)}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="matter-ops-section" aria-labelledby="matter-today-money">
            <h3 id="matter-today-money"><ReceiptText size={17} aria-hidden="true" />시간·청구</h3>
            <dl className="matter-ops-metrics">
              <div><dt>시간 누락</dt><dd><button type="button" onClick={() => onNavigateSection("matter-time-billing", "missing")}>{Number(metrics.missing_time_count ?? metrics.missing_time ?? 0)}명</button></dd></div>
              <div><dt>청구 대기 WIP</dt><dd><button type="button" onClick={() => onNavigateSection("matter-time-billing", "wip")}>{Number(metrics.wip_count ?? metrics.pending_wip_count ?? 0)}건</button></dd></div>
              <div><dt>미수금</dt><dd><button type="button" onClick={() => onNavigateSection("matter-time-billing", "ar")}>{Number(metrics.overdue_ar_count ?? metrics.ar_over_30_count ?? 0)}건</button></dd></div>
            </dl>
          </section>
        </div>
        <section className="matter-ops-section" aria-labelledby="matter-today-next">
          <h3 id="matter-today-next">사건별 다음 행동 <span>{nextActions.length}</span></h3>
          <div className="matter-ops-row-list">
            {nextActions.length === 0 && <p className="matter-ops-inline-empty">정해진 다음 행동이 없습니다.</p>}
            {nextActions.map((row, index) => (
              <div className="matter-ops-summary-row" key={rowKey(row, index)}>
                <strong>{matterCode(row, index)}</strong>
                <span>{rowTitle(row, index)}</span>
                <span>{ownerLabel(row)}</span>
                <OpenMatterButton row={row} onSelectMatter={onSelectMatter} />
              </div>
            ))}
          </div>
        </section>
        <section className="matter-ops-section" aria-labelledby="matter-today-review" data-matter-weekly-review="true">
          <div className="matter-ops-section-heading">
            <h3 id="matter-today-review">주간 운영 점검</h3>
            <button className="secondary-button" type="button" disabled={reportPending} onClick={onDownloadReport}>
              <Download size={15} aria-hidden="true" />
              {reportPending ? "CSV 준비 중" : "CSV"}
            </button>
          </div>
          {reportResult?.kind === "error" && <p className="matter-ops-inline-error" role="alert">CSV를 내려받지 못했습니다.</p>}
          <div className="matter-ops-review-grid">
            {review.length === 0 && <p className="matter-ops-inline-empty">주간 점검 항목이 없습니다.</p>}
            {review.map((row, index) => (
              <div key={rowKey(row, index)}>
                <span>{text(row.question ?? row.label, `점검 ${index + 1}`)}</span>
                <strong>{text(row.value ?? row.count, "0")}</strong>
                <small>{text(row.detail ?? row.unit, "건")}</small>
                {row.route?.section && (
                  <button type="button" onClick={() => onNavigateSection(row.route.section, row.route.filter)}>보기</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </MatterOperationsState>
    </section>
  );
}

function QuickTaskForm({ matters, pending, result, onCreateTask, onCancel }) {
  const attemptKey = useRef(uiAttemptKey("matter_task_create"));
  const inFlight = useRef(false);
  const [matterIdValue, setMatterIdValue] = useState("");
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [validationMessage, setValidationMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (pending || !result) return;
    inFlight.current = false;
    setSubmitted(false);
    if (result.kind === "data") attemptKey.current = uiAttemptKey("matter_task_create");
  }, [pending, result]);

  function submit(event) {
    event.preventDefault();
    if (pending || submitted || inFlight.current) return;
    if (!matterIdValue || !title.trim() || !assignedTo.trim() || !dueAt) {
      setValidationMessage("사건과 제목, 담당자, 기한을 입력해 주세요.");
      return;
    }
    setValidationMessage("");
    inFlight.current = true;
    setSubmitted(true);
    onCreateTask?.({
      matterId: matterIdValue,
      title: title.trim(),
      assignedTo: assignedTo.trim(),
      dueAt,
      priority,
      idempotencyKey: attemptKey.current
    });
  }

  const mutationFailed = result && result.kind !== "data";
  const saving = pending || submitted;
  return (
    <form className="matter-ops-inline-form" noValidate onSubmit={submit} data-matter-quick-task-form="true">
      <h3><CheckSquare2 size={17} aria-hidden="true" />새 업무</h3>
      <label>
        <span>사건</span>
        <select aria-label="사건" value={matterIdValue} onChange={(event) => setMatterIdValue(event.target.value)}>
          <option value="">선택</option>
          {matters.map((matter, index) => (
            <option key={matter.matter_id} value={matter.matter_id}>
              {matterCode(matter, index)} · {rowTitle(matter, index)}
            </option>
          ))}
        </select>
      </label>
      <label><span>제목</span><input aria-label="제목" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>담당</span><input aria-label="담당" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></label>
      <label><span>기한</span><input aria-label="기한" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
      <label>
        <span>우선순위</span>
        <select aria-label="우선순위" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="low">낮음</option>
          <option value="normal">보통</option>
          <option value="high">높음</option>
          <option value="urgent">긴급</option>
        </select>
      </label>
      <div className="matter-ops-reason-actions">
        {onCancel && <button type="button" className="secondary-button" onClick={onCancel}>취소</button>}
        <button type="submit" className="primary-button" data-matter-task-create-submit="true" disabled={saving}>{saving ? "저장 중" : "업무 저장"}</button>
      </div>
      <div data-matter-task-create-status={validationMessage ? "error" : saving ? "pending" : result?.kind ?? "idle"} aria-live="polite">
        {(validationMessage || mutationFailed) && (
          <p role="alert">{validationMessage || result.message || (result.kind === "guarded" ? "업무를 저장할 권한이 없습니다." : "업무를 저장하지 못했습니다.")}</p>
        )}
        {result?.kind === "data" && <p role="status">업무를 저장했습니다.</p>}
      </div>
    </form>
  );
}

function WorkScreen({
  mode,
  result,
  matters,
  view,
  layout,
  onViewChange,
  onLayoutChange,
  onRetry,
  onSelectMatter,
  onTaskStatusChange,
  taskUpdatePendingId,
  taskUpdateResult,
  taskCreatePending,
  taskCreateResult,
  onCreateTask,
  worktree
}) {
  const [showQuickTask, setShowQuickTask] = useState(mode === "new");
  const [reasonRequest, setReasonRequest] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const tasks = pickRows(result, [view, "tasks"]);
  const empty = layout !== "worktree" && tasks.length === 0;
  const canMutate = mutationControlsAllowed(result);

  function requestTaskStatusChange(task, status) {
    const prompt = taskTransitionReasonPrompt(task, status);
    if (!prompt) {
      onTaskStatusChange(task, status);
      return;
    }
    setReasonRequest({ task, status, ...prompt });
    setReason("");
    setReasonError("");
  }

  function cancelReasonRequest() {
    setReasonRequest(null);
    setReason("");
    setReasonError("");
  }

  function submitReason(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setReasonError("사유를 입력해 주세요.");
      return;
    }
    const request = reasonRequest;
    cancelReasonRequest();
    onTaskStatusChange(request.task, request.status, reason);
  }

  return (
    <section className="matter-ops-screen" data-matter-small-firm-screen="matter-work" data-matter-work-layout={layout}>
      <ScreenHeader
        title="업무"
        description="같은 업무 원장을 목록, 보드 또는 사건 워크트리로 봅니다."
        actions={(
          <>
            {canMutate && <button type="button" className="secondary-button" onClick={() => setShowQuickTask(true)}><Plus size={15} aria-hidden="true" />새 업무</button>}
            <SegmentedControl label="업무 보기 방식" items={WORK_LAYOUTS} value={layout} onChange={onLayoutChange} />
          </>
        )}
      />
      {canMutate && showQuickTask && (
        <QuickTaskForm
          matters={matters}
          pending={taskCreatePending}
          result={taskCreateResult}
          onCreateTask={onCreateTask}
          onCancel={mode === "new" ? null : () => setShowQuickTask(false)}
        />
      )}
      {!reasonRequest && taskUpdateResult && taskUpdateResult.kind !== "data" && (
        <p className="matter-ops-mutation-status error" role="alert" data-matter-task-mutation-status={taskUpdateResult.kind}>
          업무 상태를 저장하지 못했습니다. {taskUpdateResult.message ?? "다시 확인한 뒤 시도해 주세요."}
        </p>
      )}
      {!reasonRequest && taskUpdateResult?.kind === "data" && (
        <p className="matter-ops-mutation-status success" role="status" data-matter-task-mutation-status="data">
          업무 상태를 저장했습니다.
        </p>
      )}
      {canMutate && reasonRequest && (
        <form className="matter-ops-reason-form" onSubmit={submitReason} data-matter-task-reason-form="true">
          <div>
            <strong>{reasonRequest.title}</strong>
            <span>{rowTitle(reasonRequest.task)} · {reasonRequest.description}</span>
          </div>
          <label>
            <span>사유</span>
            <textarea
              autoFocus
              rows="2"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError("");
              }}
              aria-invalid={Boolean(reasonError)}
              aria-describedby={reasonError ? "matter-task-reason-error" : undefined}
            />
          </label>
          <div className="matter-ops-reason-actions">
            <button type="button" className="secondary-button" onClick={cancelReasonRequest}>취소</button>
            <button type="submit" className="primary-button">상태 변경</button>
          </div>
          {reasonError && <p id="matter-task-reason-error" role="alert">{reasonError}</p>}
        </form>
      )}
      {layout !== "worktree" && <SegmentedControl label="업무 저장 보기" items={WORK_VIEWS} value={view} onChange={onViewChange} />}
      {layout === "worktree" ? worktree : (
        <MatterOperationsState result={result} noun="업무" empty={empty} onRetry={onRetry}>
          {layout === "list" ? (
            <div className="matter-ops-table-wrap" tabIndex="0">
              <table className="matter-ops-table">
                <thead><tr><th>업무</th><th>사건</th><th>담당자</th><th>다음 기한</th><th>상태</th><th><span className="sr-only">열기</span></th></tr></thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={rowKey(task, index)} data-task-id={task.task_id ?? task.id} data-ledger-id={ledgerId(task)}>
                      <td><strong>{rowTitle(task, index)}</strong><span>{text(task.blocked_reason ?? task.wait_state, "")}</span></td>
                      <td>{matterCode(task, index)}</td>
                      <td>{ownerLabel(task)}</td>
                      <td>{dateLabel(task.due_at ?? task.next_deadline_at)}</td>
                      <td>
                        <select
                          aria-label={`${rowTitle(task, index)} 상태`}
                          value={task.status ?? "todo"}
                          disabled={taskUpdatePendingId === (task.task_id ?? task.id)}
                          onChange={(event) => requestTaskStatusChange(task, event.target.value)}
                        >
                          {taskStatusOptions(task).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                      </td>
                      <td><OpenMatterButton row={task} onSelectMatter={onSelectMatter} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="matter-ops-board" aria-label="업무 상태 보드">
              {BOARD_COLUMNS.map(([status, label]) => {
                const columnRows = tasks.filter((task) => (task.status ?? "todo") === status);
                return (
                  <section key={status} aria-labelledby={`matter-board-${status}`} data-matter-board-column={status}>
                    <h3 id={`matter-board-${status}`}>{label}<span>{columnRows.length}</span></h3>
                    <div>
                      {columnRows.length === 0 && <p className="matter-ops-inline-empty">업무 없음</p>}
                      {columnRows.map((task, index) => (
                        <article key={rowKey(task, index)} className="matter-ops-task-card" data-task-id={task.task_id ?? task.id} data-ledger-id={ledgerId(task)}>
                          <span>{matterCode(task, index)}</span>
                          <strong>{rowTitle(task, index)}</strong>
                          <small>{ownerLabel(task)} · {dateLabel(task.due_at)}</small>
                          <label>
                            <span className="sr-only">상태 이동</span>
                            <select
                              aria-label={`${rowTitle(task, index)} 상태 이동`}
                              value={task.status ?? "todo"}
                              disabled={taskUpdatePendingId === (task.task_id ?? task.id)}
                              onChange={(event) => requestTaskStatusChange(task, event.target.value)}
                            >
                              {taskStatusOptions(task).map(([id, optionLabel]) => <option key={id} value={id}>{optionLabel}</option>)}
                            </select>
                          </label>
                          <OpenMatterButton row={task} onSelectMatter={onSelectMatter} />
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </MatterOperationsState>
      )}
    </section>
  );
}

function calendarInputValue(value) {
  const parsed = new Date(value ?? "");
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function CalendarScreen({
  result,
  onRetry,
  onSelectMatter,
  deadlineReschedulePendingId,
  deadlineRescheduleResult,
  deadlineHistoryResult,
  onRescheduleDeadline
}) {
  const [rescheduleRow, setRescheduleRow] = useState(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const rows = pickRows(result, ["events", "calendar", "deadlines", "items"]);
  const historyRows = pickRows(deadlineHistoryResult, ["history", "items"]);
  const canMutate = mutationControlsAllowed(result);
  const grouped = rows.reduce((groups, row) => {
    const key = String(row.starts_at ?? row.due_at ?? row.occurred_at ?? "unscheduled").slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), row]);
    return groups;
  }, new Map());

  function openReschedule(row) {
    setRescheduleRow(row);
    setStartsAt(calendarInputValue(row.starts_at ?? row.due_at));
    setEndsAt(calendarInputValue(row.ends_at ?? row.starts_at ?? row.due_at));
    setReason("");
    setValidationMessage("");
  }

  function submitReschedule(event) {
    event.preventDefault();
    if (!startsAt || !endsAt || !reason.trim()) {
      setValidationMessage("새 일정과 변경 사유를 입력해 주세요.");
      return;
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setValidationMessage("종료 시각은 시작 시각보다 뒤여야 합니다.");
      return;
    }
    setValidationMessage("");
    onRescheduleDeadline?.(rescheduleRow, {
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      reason: reason.trim()
    });
  }

  return (
    <section className="matter-ops-screen" data-matter-small-firm-screen="matter-calendar">
      <ScreenHeader title="일정" description="업무 기한과 사건 일정을 한 주 단위로 확인합니다." />
      {canMutate && rescheduleRow && (
        <form className="matter-ops-reason-form" noValidate onSubmit={submitReschedule} data-deadline-reschedule-form="true">
          <div>
            <strong>기한 변경</strong>
            <span>{rowTitle(rescheduleRow)} · 변경 이력에 사유가 남습니다.</span>
          </div>
          <label><span>새 시작</span><input aria-label="새 시작" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
          <label><span>새 종료</span><input aria-label="새 종료" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
          <label><span>변경 사유</span><textarea aria-label="변경 사유" rows="2" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="matter-ops-reason-actions">
            <button type="button" className="secondary-button" onClick={() => setRescheduleRow(null)}>취소</button>
            <button
              type="submit"
              className="primary-button"
              disabled={deadlineReschedulePendingId === ledgerId(rescheduleRow)}
            >
              {deadlineReschedulePendingId === ledgerId(rescheduleRow) ? "저장 중" : "변경 저장"}
            </button>
          </div>
          {validationMessage && <p role="alert">{validationMessage}</p>}
          {deadlineRescheduleResult && deadlineRescheduleResult.kind !== "data" && (
            <p role="alert">{deadlineRescheduleResult.message ?? "기한을 변경하지 못했습니다."}</p>
          )}
        </form>
      )}
      {historyRows.length > 0 && (
        <section className="matter-ops-section" data-deadline-history="true">
          <h3>기한 변경 이력</h3>
          <div className="matter-ops-compact-list">
            {historyRows.map((row, index) => (
              <div key={row.history_id ?? index}>
                <strong>{text(row.reason, "변경 사유 확인 필요")}</strong>
                <span>{dateLabel(row.occurred_at ?? row.changed_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <MatterOperationsState result={result} noun="주간 일정" empty={rows.length === 0} onRetry={onRetry}>
        <div className="matter-ops-week">
          {[...grouped.entries()].map(([date, events]) => (
            <section key={date} aria-labelledby={`matter-calendar-${date}`}>
              <h3 id={`matter-calendar-${date}`}>{dayLabel(date)}<span>{events.length}</span></h3>
              <div>
                {events.map((row, index) => (
                  <div
                    key={rowKey(row, index)}
                  >
                    <button
                      type="button"
                      data-ledger-id={ledgerId(row)}
                      data-ledger-type={row.ledger_ref?.model_type ?? row.source}
                      onClick={() => matterId(row) && onSelectMatter(matterId(row), ledgerRef(row))}
                    >
                      <time>{dateLabel(row.starts_at ?? row.due_at)}</time>
                      <span><strong>{rowTitle(row, index)}</strong><small>{matterCode(row, index)} · {ownerLabel(row)}</small></span>
                      <em>{text(row.source_label ?? row.event_type ?? row.source_type, "사건 일정")}</em>
                    </button>
                    {(row.event_id || row.deadline_id) && (
                      <button type="button" className="secondary-button" onClick={() => openReschedule(row)}>기한 변경</button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </MatterOperationsState>
    </section>
  );
}

function MeetingForm({ matters, pending, result, onCreateMeeting }) {
  const [matterIdValue, setMatterIdValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [attendeeValue, setAttendeeValue] = useState("");
  const [decisionValue, setDecisionValue] = useState("");
  const [followUpTaskValue, setFollowUpTaskValue] = useState("");

  function submit(event) {
    event.preventDefault();
    const attendeeIds = splitRefs(attendeeValue);
    const decisions = splitRefs(decisionValue);
    if (!matterIdValue || !titleValue.trim() || attendeeIds.length === 0 || decisions.length === 0) return;
    onCreateMeeting({
      matterId: matterIdValue,
      title: titleValue.trim(),
      attendeeIds,
      decisions,
      followUpTaskIds: splitRefs(followUpTaskValue)
    });
  }

  function selectMatter(value) {
    setMatterIdValue(value);
    const selected = matters.find((matter) => matter.matter_id === value);
    setAttendeeValue([
      selected?.owner_user_id ?? selected?.owner_id,
      selected?.backup_user_id
    ].filter(Boolean).join(", "));
  }

  return (
    <form className="matter-ops-inline-form" onSubmit={submit} data-matter-meeting-form="true">
      <h3><MessageSquareText size={17} aria-hidden="true" />회의 기록</h3>
      <label><span>사건</span><select required value={matterIdValue} onChange={(event) => selectMatter(event.target.value)}><option value="">선택</option>{matters.map((matter, index) => <option key={matter.matter_id} value={matter.matter_id}>{matterCode(matter, index)} · {rowTitle(matter, index)}</option>)}</select></label>
      <label><span>회의 제목</span><input required value={titleValue} onChange={(event) => setTitleValue(event.target.value)} /></label>
      <label><span>참석자</span><input required placeholder="사용자 ID, 쉼표로 구분" value={attendeeValue} onChange={(event) => setAttendeeValue(event.target.value)} /></label>
      <label className="wide"><span>결정사항</span><textarea required rows="2" value={decisionValue} onChange={(event) => setDecisionValue(event.target.value)} /></label>
      <label className="wide"><span>후속 업무 ID</span><input placeholder="선택 사항, 쉼표로 구분" value={followUpTaskValue} onChange={(event) => setFollowUpTaskValue(event.target.value)} /></label>
      <button className="secondary-button" type="submit" disabled={pending || matters.length === 0}>기록</button>
      <span className="matter-ops-form-status" aria-live="polite" data-matter-meeting-mutation-status={result?.kind ?? "idle"}>{pending ? "저장 중" : formStatus(result)}</span>
    </form>
  );
}

function FollowupForm({
  followup,
  matters,
  peopleResult,
  pending,
  result,
  onCreateFollowup,
  onUpdateFollowup,
  onCancelEdit
}) {
  const mode = followup?.followup_id ? "update" : "create";
  const people = pickRows(peopleResult);
  const [matterValue, setMatterValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [ownerValue, setOwnerValue] = useState("");
  const [backupValue, setBackupValue] = useState("");
  const [statusValue, setStatusValue] = useState("open");
  const [dueValue, setDueValue] = useState("");
  const [channelValue, setChannelValue] = useState("call");
  const [validation, setValidation] = useState("");

  useEffect(() => {
    setMatterValue(followup?.matter_id ?? "");
    setTitleValue(followup?.title ?? "");
    setActionValue(followup?.next_action ?? "");
    setOwnerValue(followup?.owner_id ?? followup?.owner_user_id ?? "");
    setBackupValue(followup?.backup_owner_id ?? followup?.backup_user_id ?? "");
    setStatusValue(followup?.status ?? "open");
    setDueValue(datetimeLocalValue(followup?.next_action_at));
    setChannelValue(followup?.channel ?? "call");
    setValidation("");
  }, [followup]);

  function submit(event) {
    event.preventDefault();
    if (
      !matterValue
      || !titleValue.trim()
      || !actionValue.trim()
      || !ownerValue
      || !dueValue
      || !channelValue
      || !statusValue
    ) {
      setValidation("사건, 제목, 다음 행동, 담당자, 상태와 기한을 입력해 주세요.");
      return;
    }
    setValidation("");
    const payload = {
      matterId: matterValue,
      title: titleValue.trim(),
      nextAction: actionValue.trim(),
      ownerId: ownerValue,
      backupOwnerId: backupValue || null,
      status: statusValue,
      nextActionAt: dueValue,
      channel: channelValue
    };
    if (mode === "update") {
      onUpdateFollowup?.({ ...payload, followupId: followup.followup_id });
    } else {
      onCreateFollowup?.(payload);
    }
  }

  const state = validation ? "error" : pending ? "pending" : result?.kind ?? "idle";
  const peopleState = peopleResult === null
    ? "담당자 목록을 불러오는 중입니다."
    : peopleResult?.kind === "guarded"
      ? "담당자 목록을 볼 권한이 없습니다."
      : peopleResult?.kind !== "data"
        ? "담당자 목록을 불러오지 못했습니다."
        : people.length === 0
          ? "선택할 수 있는 활성 담당자가 없습니다."
          : "";

  return (
    <form
      className="matter-ops-inline-form"
      data-matter-followup-form={mode}
      noValidate
      onSubmit={submit}
    >
      <h3><MessageSquareText size={17} aria-hidden="true" />{mode === "update" ? "후속 조치 수정" : "후속 조치 등록"}</h3>
      <label>
        <span>사건</span>
        <select name="matter" required disabled={mode === "update"} value={matterValue} onChange={(event) => setMatterValue(event.target.value)}>
          <option value="">선택</option>
          {matters.map((matter, index) => <option key={matter.matter_id} value={matter.matter_id}>{matterCode(matter, index)} · {rowTitle(matter, index)}</option>)}
        </select>
      </label>
      <label>
        <span>제목</span>
        <input name="title" required value={titleValue} onChange={(event) => setTitleValue(event.target.value)} />
      </label>
      <label className="wide">
        <span>다음 행동</span>
        <input name="next_action" required value={actionValue} onChange={(event) => setActionValue(event.target.value)} />
      </label>
      <label>
        <span>담당자</span>
        <select name="owner" required value={ownerValue} onChange={(event) => setOwnerValue(event.target.value)}>
          <option value="">선택</option>
          {people.map((person) => <option key={person.user_id} value={person.user_id}>{text(person.display_name, person.user_id)}</option>)}
        </select>
      </label>
      <label>
        <span>백업</span>
        <select name="backup" value={backupValue} onChange={(event) => setBackupValue(event.target.value)}>
          <option value="">백업 없음</option>
          {people.map((person) => <option key={person.user_id} value={person.user_id}>{text(person.display_name, person.user_id)}</option>)}
        </select>
      </label>
      <label>
        <span>상태</span>
        <select name="status" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
          {FOLLOWUP_STATUSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label>
        <span>기한</span>
        <input name="due_at" type="datetime-local" required value={dueValue} onChange={(event) => setDueValue(event.target.value)} />
      </label>
      <label>
        <span>연락 방식</span>
        <select name="channel" value={channelValue} onChange={(event) => setChannelValue(event.target.value)}>
          {FOLLOWUP_CHANNELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <div className="matter-ops-form-actions">
        <button className="primary-button" type="submit" disabled={pending || matters.length === 0 || people.length === 0}>
          {pending ? "저장 중" : mode === "update" ? "수정 저장" : "등록"}
        </button>
        {mode === "update" && <button className="secondary-button" type="button" onClick={onCancelEdit}>수정 취소</button>}
      </div>
      <span
        className={`matter-ops-form-status ${state === "data" ? "success" : state === "idle" || state === "pending" ? "" : "error"}`}
        role={state === "error" || state === "guarded" ? "alert" : "status"}
        aria-live="polite"
        data-matter-followup-mutation-status={state}
      >
        {pending
          ? "저장 후 최신 후속 조치를 다시 불러오는 중입니다."
          : validation || mutationStatus(result, "후속 조치를 저장하고 최신 상태를 불러왔습니다.") || peopleState}
      </span>
    </form>
  );
}

function FollowupsScreen({
  result,
  view,
  onViewChange,
  onRetry,
  onSelectMatter,
  matters,
  meetingPending,
  meetingResult,
  onCreateMeeting,
  peopleResult,
  followupMutationPending,
  followupMutationResult,
  followupDetailResult,
  onCreateFollowup,
  onUpdateFollowup
}) {
  const rows = pickRows(result, [view, "followups"]);
  const [editingRow, setEditingRow] = useState(null);
  const canonicalRow = followupDetailResult?.kind === "data" ? followupDetailResult.item : null;
  const formRow = editingRow?.followup_id === canonicalRow?.followup_id ? canonicalRow : editingRow;
  const canMutate = mutationControlsAllowed(result);
  return (
    <section className="matter-ops-screen" data-matter-small-firm-screen="matter-followups">
      <ScreenHeader title="연락·후속" description="우리 답변, 의뢰인 답변, 오래 연락하지 않은 사건을 구분합니다." />
      {canMutate && (
        <FollowupForm
          followup={formRow}
          matters={matters}
          peopleResult={peopleResult}
          pending={followupMutationPending}
          result={followupMutationResult}
          onCreateFollowup={onCreateFollowup}
          onUpdateFollowup={onUpdateFollowup}
          onCancelEdit={() => setEditingRow(null)}
        />
      )}
      <section
        className="matter-ops-canonical-detail"
        data-followup-detail-state={followupDetailResult?.kind ?? "idle"}
        data-followup-detail-id={canonicalRow?.followup_id}
        aria-live="polite"
      >
        {canonicalRow ? (
          <>
            <strong>{text(canonicalRow.title)}</strong>
            <span>{text(canonicalRow.next_action, "다음 행동 없음")} · {text(canonicalRow.status)}</span>
          </>
        ) : followupDetailResult && followupDetailResult.kind !== "data" ? (
          <span role="alert">{mutationStatus(followupDetailResult)}</span>
        ) : null}
      </section>
      {canMutate && <MeetingForm matters={matters} pending={meetingPending} result={meetingResult} onCreateMeeting={onCreateMeeting} />}
      <SegmentedControl label="연락 후속 저장 보기" items={FOLLOWUP_VIEWS} value={view} onChange={onViewChange} />
      <MatterOperationsState result={result} noun="연락 후속" empty={rows.length === 0} onRetry={onRetry}>
        <div className="matter-ops-table-wrap" tabIndex="0">
          <table className="matter-ops-table">
            <thead><tr><th>후속</th><th>사건</th><th>담당·백업</th><th>다음 행동</th><th>마지막 연락</th><th>상태</th><th><span className="sr-only">열기</span></th></tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={rowKey(row, index)} data-followup-id={row.followup_id}>
                  <td><strong>{rowTitle(row, index)}</strong><span>{text(row.channel, "기록")}</span></td>
                  <td>{matterCode(row, index)}</td>
                  <td>{ownerLabel(row)}<span>{text(row.backup_display_name ?? row.backup_user_id ?? row.backup_owner_id, "백업 미지정")}</span></td>
                  <td>{dateLabel(row.next_action_at)}</td>
                  <td>{dateLabel(row.last_contact_at, "연락 기록 없음")}</td>
                  <td>{text(row.status_label ?? row.status)}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button"
                      data-followup-edit={row.followup_id}
                      disabled={!row.followup_id}
                      onClick={() => setEditingRow(row)}
                    >
                      수정
                    </button>
                    <OpenMatterButton row={row} onSelectMatter={onSelectMatter} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MatterOperationsState>
    </section>
  );
}

function QuickTimeEntryForm({ matters, pending, result, onCreateTimeEntry }) {
  const [matterIdValue, setMatterIdValue] = useState("");
  const [roleId, setRoleId] = useState("partner");
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [narrative, setNarrative] = useState("");
  const [billable, setBillable] = useState(true);

  function submit(event) {
    event.preventDefault();
    const duration = Number(durationMinutes);
    if (!matterIdValue || !Number.isFinite(duration) || duration <= 0 || !narrative.trim()) return;
    onCreateTimeEntry({ matterId: matterIdValue, roleId, workDate, durationMinutes: duration, narrative: narrative.trim(), billable });
  }

  return (
    <form className="matter-ops-inline-form" onSubmit={submit} data-matter-quick-time-entry="true">
      <h3><Clock3 size={17} aria-hidden="true" />빠른 시간 입력</h3>
      <label><span>사건</span><select required value={matterIdValue} onChange={(event) => setMatterIdValue(event.target.value)}><option value="">선택</option>{matters.map((matter, index) => <option key={matter.matter_id} value={matter.matter_id}>{matterCode(matter, index)} · {rowTitle(matter, index)}</option>)}</select></label>
      <label><span>일자</span><input type="date" required value={workDate} onChange={(event) => setWorkDate(event.target.value)} /></label>
      <label><span>분</span><input type="number" min="1" step="1" required value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
      <label>
        <span>역할</span>
        <select aria-label="역할" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
          <option value="partner">Partner</option>
          <option value="attorney">변호사</option>
          <option value="staff">Staff</option>
        </select>
      </label>
      <label>
        <span>청구 여부</span>
        <select
          aria-label="청구 여부"
          value={billable ? "billable" : "non_billable"}
          onChange={(event) => setBillable(event.target.value === "billable")}
        >
          <option value="billable">청구</option>
          <option value="non_billable">비청구</option>
        </select>
      </label>
      <label className="wide"><span>업무 내용</span><input required value={narrative} onChange={(event) => setNarrative(event.target.value)} /></label>
      <button className="primary-button" type="submit" disabled={pending || matters.length === 0}>저장</button>
      <span className="matter-ops-form-status" aria-live="polite" data-matter-time-mutation-status={result?.kind ?? "idle"}>{pending ? "저장 중" : formStatus(result)}</span>
    </form>
  );
}

function TimeBillingScreen({
  result,
  view,
  onViewChange,
  onRetry,
  onSelectMatter,
  matters,
  timeEntryPending,
  timeEntryResult,
  onCreateTimeEntry,
  timeWeekPendingAction,
  timeWeekResult,
  onSubmitTimeWeek,
  onLockTimeWeek,
  onUnlockTimeWeek
}) {
  const [unlockRow, setUnlockRow] = useState(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlockGraceMinutes, setUnlockGraceMinutes] = useState("15");
  const [unlockValidation, setUnlockValidation] = useState("");
  const payload = dataPayload(result);
  const weeklyRows = payload.weekly_time?.items ?? payload.weekly_time?.rows ?? [];
  const rows = view === "time"
    ? weeklyRows
    : view === "missing"
      ? weeklyRows.filter((row) => row.complete !== true)
      : view === "wip"
        ? payload.wip?.rows ?? []
        : payload.ar?.rows ?? [];
  const isWeeklyTime = view === "time" || view === "missing";
  const timeSummary = payload.weekly_time?.summary ?? {};
  const summary = {
    week_minutes: timeSummary.total_minutes ?? 0,
    missing_count: timeSummary.incomplete_actor_count ?? 0,
    wip_amount: payload.wip?.totals?.total_amount ?? 0,
    ar_amount: payload.ar?.totals?.balance ?? 0
  };
  const canMutate = mutationControlsAllowed(result);

  function timeWeekPayload(row, extra = {}) {
    return {
      actorId: row.actor_id,
      weekStart: row.week_start,
      graceMinutes: Number(extra.graceMinutes ?? 15),
      ...extra
    };
  }

  function submitUnlock(event) {
    event.preventDefault();
    if (!unlockReason.trim()) {
      setUnlockValidation("잠금 해제 사유를 입력해 주세요.");
      return;
    }
    setUnlockValidation("");
    onUnlockTimeWeek?.(timeWeekPayload(unlockRow, {
      graceMinutes: Number(unlockGraceMinutes),
      reason: unlockReason.trim()
    }));
  }

  return (
    <section className="matter-ops-screen" data-matter-small-firm-screen="matter-time-billing">
      <ScreenHeader title="시간·청구" description="시간 누락부터 WIP, 청구서, 미수금까지 이어서 확인합니다." />
      {canMutate && <QuickTimeEntryForm matters={matters} pending={timeEntryPending} result={timeEntryResult} onCreateTimeEntry={onCreateTimeEntry} />}
      {canMutate && unlockRow && (
        <form className="matter-ops-reason-form" noValidate onSubmit={submitUnlock} data-time-week-unlock-form="true">
          <div>
            <strong>주간 잠금 해제</strong>
            <span>{text(unlockRow.display_name ?? unlockRow.actor_id, "담당자")} · 사유가 감사 기록에 남습니다.</span>
          </div>
          <label><span>유예 시간(분)</span><input type="number" min="0" step="1" value={unlockGraceMinutes} onChange={(event) => setUnlockGraceMinutes(event.target.value)} /></label>
          <label><span>해제 사유</span><textarea aria-label="해제 사유" rows="2" value={unlockReason} onChange={(event) => setUnlockReason(event.target.value)} /></label>
          <div className="matter-ops-reason-actions">
            <button type="button" className="secondary-button" onClick={() => setUnlockRow(null)}>취소</button>
            <button type="submit" className="primary-button" disabled={timeWeekPendingAction === "unlock"}>해제</button>
          </div>
          {unlockValidation && <p role="alert">{unlockValidation}</p>}
        </form>
      )}
      {timeWeekResult && (
        <p
          className={`matter-ops-mutation-status ${timeWeekResult.kind === "data" ? "success" : "error"}`}
          role={timeWeekResult.kind === "data" ? "status" : "alert"}
          data-time-week-mutation-status={timeWeekResult.kind}
        >
          {formStatus(timeWeekResult, "주간 시간 상태를 새로 반영했습니다.")}
        </p>
      )}
      <dl className="matter-ops-metrics matter-ops-metrics-wide">
        <div><dt>이번 주 입력</dt><dd>{minutesLabel(summary.week_minutes ?? summary.total_minutes ?? 0)}</dd></div>
        <div><dt>누락</dt><dd>{Number(summary.missing_count ?? 0)}명</dd></div>
        <div><dt>청구 대기</dt><dd>{moneyLabel(summary.wip_amount ?? 0)}</dd></div>
        <div><dt>미수금</dt><dd>{moneyLabel(summary.ar_amount ?? summary.outstanding_amount ?? 0)}</dd></div>
      </dl>
      <SegmentedControl label="시간 청구 저장 보기" items={TIME_VIEWS} value={view} onChange={onViewChange} />
      <MatterOperationsState result={result} noun="시간·청구 기록" empty={rows.length === 0} onRetry={onRetry}>
        <div className="matter-ops-table-wrap" tabIndex="0">
          <table className="matter-ops-table">
            <thead>
              <tr>
                <th>{isWeeklyTime ? "담당자" : "항목"}</th>
                <th>{isWeeklyTime ? "입력일" : "사건"}</th>
                <th>{isWeeklyTime ? "누락일" : "담당자"}</th>
                <th>{isWeeklyTime ? "주간" : "일자"}</th>
                <th>{isWeeklyTime ? "시간" : "금액"}</th>
                <th>상태</th>
                <th><span className="sr-only">열기</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={rowKey(row, index)} {...(isWeeklyTime ? { "data-time-week-actor": row.actor_id } : {})}>
                  <td><strong>{isWeeklyTime ? text(row.display_name ?? row.actor_id, "담당자") : rowTitle(row, index)}</strong><span>{text(row.error_message ?? row.rate_error, "")}</span></td>
                  <td>{isWeeklyTime ? `${row.entered_dates?.length ?? 0}일` : matterCode(row, index)}</td>
                  <td>{isWeeklyTime ? (row.missing_dates?.join(", ") || "없음") : ownerLabel(row)}</td>
                  <td>{isWeeklyTime ? `${row.week_start} – ${row.week_end}` : dateLabel(row.work_date ?? row.due_at ?? row.invoice_date)}</td>
                  <td>{isWeeklyTime ? minutesLabel(row.total_minutes ?? 0) : moneyLabel(row.amount ?? row.balance ?? row.amount_due ?? 0, row.currency)}</td>
                  <td>
                    {isWeeklyTime ? row.complete ? "완료" : "입력 필요" : text(row.status_label ?? row.status ?? row.bucket ?? row.aging_bucket)}
                    {isWeeklyTime && (
                      <div className="matter-ops-row-actions">
                        <button
                          type="button"
                          className="matter-ops-queue-link"
                          disabled={timeWeekPendingAction === "submit"}
                          onClick={() => onSubmitTimeWeek?.(timeWeekPayload(row))}
                        >
                          주간 제출
                        </button>
                        <button
                          type="button"
                          className="matter-ops-queue-link"
                          disabled={timeWeekPendingAction === "lock"}
                          onClick={() => onLockTimeWeek?.(timeWeekPayload(row))}
                        >
                          주간 잠금
                        </button>
                        <button
                          type="button"
                          className="matter-ops-queue-link"
                          onClick={() => {
                            setUnlockRow(row);
                            setUnlockReason("");
                            setUnlockValidation("");
                          }}
                        >
                          잠금 해제
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{!isWeeklyTime && <OpenMatterButton row={row} onSelectMatter={onSelectMatter} label={view === "wip" || view === "ar" ? "처리" : "사건 열기"} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MatterOperationsState>
    </section>
  );
}

export function MatterOperationsSurface(props) {
  const {
    section,
    mode,
    result,
    mattersResult,
    matters,
    onRetry,
    onSelectMatter,
    onNavigateSection,
    listView,
    onListViewChange,
    workView,
    workLayout,
    onWorkViewChange,
    onWorkLayoutChange,
    onTaskStatusChange,
    taskUpdatePendingId,
    taskUpdateResult,
    taskCreatePending,
    taskCreateResult,
    onCreateTask,
    archivePendingId,
    archiveResult,
    onArchiveMatter,
    restorePendingId,
    restoreResult,
    onRestoreMatter,
    followupView,
    onFollowupViewChange,
    timeBillingView,
    onTimeBillingViewChange,
    opening,
    worktree,
    meetingPending,
    meetingResult,
    onCreateMeeting,
    peopleResult,
    followupMutationPending,
    followupMutationResult,
    followupDetailResult,
    onCreateFollowup,
    onUpdateFollowup,
    timeEntryPending,
    timeEntryResult,
    onCreateTimeEntry,
    timeWeekPendingAction,
    timeWeekResult,
    onSubmitTimeWeek,
    onLockTimeWeek,
    onUnlockTimeWeek,
    deadlineReschedulePendingId,
    deadlineRescheduleResult,
    deadlineHistoryResult,
    onRescheduleDeadline,
    reportPending,
    reportResult,
    onDownloadReport
  } = props;

  if (section === "matter-list") {
    return <MatterListScreen result={mattersResult} matters={matters} mode={mode} view={listView} onViewChange={onListViewChange} onRetry={onRetry} onSelectMatter={onSelectMatter} opening={opening} archivePendingId={archivePendingId} archiveResult={archiveResult} onArchiveMatter={onArchiveMatter} restorePendingId={restorePendingId} restoreResult={restoreResult} onRestoreMatter={onRestoreMatter} />;
  }
  if (section === "matter-work") {
    return <WorkScreen mode={mode} result={result} matters={matters} view={workView} layout={workLayout} onViewChange={onWorkViewChange} onLayoutChange={onWorkLayoutChange} onRetry={onRetry} onSelectMatter={onSelectMatter} onTaskStatusChange={onTaskStatusChange} taskUpdatePendingId={taskUpdatePendingId} taskUpdateResult={taskUpdateResult} taskCreatePending={taskCreatePending} taskCreateResult={taskCreateResult} onCreateTask={onCreateTask} worktree={worktree} />;
  }
  if (section === "matter-calendar") {
    return <CalendarScreen result={result} onRetry={onRetry} onSelectMatter={onSelectMatter} deadlineReschedulePendingId={deadlineReschedulePendingId} deadlineRescheduleResult={deadlineRescheduleResult} deadlineHistoryResult={deadlineHistoryResult} onRescheduleDeadline={onRescheduleDeadline} />;
  }
  if (section === "matter-followups") {
    return <FollowupsScreen result={result} view={followupView} onViewChange={onFollowupViewChange} onRetry={onRetry} onSelectMatter={onSelectMatter} matters={matters} meetingPending={meetingPending} meetingResult={meetingResult} onCreateMeeting={onCreateMeeting} peopleResult={peopleResult} followupMutationPending={followupMutationPending} followupMutationResult={followupMutationResult} followupDetailResult={followupDetailResult} onCreateFollowup={onCreateFollowup} onUpdateFollowup={onUpdateFollowup} />;
  }
  if (section === "matter-time-billing") {
    return <TimeBillingScreen result={result} view={timeBillingView} onViewChange={onTimeBillingViewChange} onRetry={onRetry} onSelectMatter={onSelectMatter} matters={matters} timeEntryPending={timeEntryPending} timeEntryResult={timeEntryResult} onCreateTimeEntry={onCreateTimeEntry} timeWeekPendingAction={timeWeekPendingAction} timeWeekResult={timeWeekResult} onSubmitTimeWeek={onSubmitTimeWeek} onLockTimeWeek={onLockTimeWeek} onUnlockTimeWeek={onUnlockTimeWeek} />;
  }
  return <TodayScreen result={result} matters={matters} onRetry={onRetry} onSelectMatter={onSelectMatter} onNavigateSection={onNavigateSection} reportPending={reportPending} reportResult={reportResult} onDownloadReport={onDownloadReport} />;
}
