import React, { useEffect, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { MatterOperationsState } from "./MatterOperationsState.jsx";

const DETAIL_TABS = Object.freeze([
  ["overview", "개요"],
  ["work", "업무·기한"],
  ["records", "연락·기록"],
  ["documents", "문서"],
  ["billing", "시간·청구"]
]);

function items(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function detailPayload(result) {
  return result?.kind === "data" && result.item && typeof result.item === "object" ? result.item : {};
}

function safe(value, fallback = "미지정") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function dateLabel(value) {
  const parsed = new Date(value ?? "");
  if (Number.isNaN(parsed.getTime())) return "일정 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }).format(parsed);
}

function eventTitle(row, index) {
  return safe(row?.title ?? row?.summary ?? row?.message ?? row?.body_text, `기록 ${index + 1}`);
}

function eventTime(row) {
  return row?.occurred_at ?? row?.created_at ?? row?.starts_at ?? row?.due_at;
}

function scoped(rows, matterId) {
  return rows.filter((row) => !row?.matter_id || row.matter_id === matterId);
}

function mutationMessage(result, successMessage) {
  if (!result) return "";
  if (result.kind === "data") return successMessage;
  if (result.kind === "guarded") return "권한이 없어 저장하지 못했습니다.";
  return result.message ?? "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function MatterHandoffForm({
  matter,
  detail,
  peopleResult,
  pending,
  result,
  onHandoffMatter
}) {
  const people = items(peopleResult);
  const [ownerValue, setOwnerValue] = useState("");
  const [backupValue, setBackupValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [validation, setValidation] = useState("");
  const currentOwnerId = detail.summary?.owner_user_id ?? detail.summary?.owner?.user_id ?? matter?.owner_user_id ?? "";
  const currentBackupId = detail.summary?.backup_user_id ?? detail.summary?.backup?.user_id ?? matter?.backup_user_id ?? "";

  useEffect(() => {
    const activeIds = new Set(people.map((person) => person.user_id));
    setOwnerValue(activeIds.has(currentOwnerId) ? currentOwnerId : "");
    setBackupValue(activeIds.has(currentBackupId) ? currentBackupId : "");
    setNoteValue("");
    setValidation("");
  }, [currentBackupId, currentOwnerId, matter?.matter_id, peopleResult]);

  function submit(event) {
    event.preventDefault();
    if (!ownerValue || !noteValue.trim()) {
      setValidation("새 담당자와 인수인계 사유를 입력해 주세요.");
      return;
    }
    setValidation("");
    onHandoffMatter?.({
      ownerUserId: ownerValue,
      backupUserId: backupValue || null,
      note: noteValue.trim()
    });
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
      data-matter-handoff-form="true"
      noValidate
      onSubmit={submit}
    >
      <h3>담당·백업 인수인계</h3>
      <label>
        <span>새 담당자</span>
        <select name="owner" required value={ownerValue} onChange={(event) => setOwnerValue(event.target.value)}>
          <option value="">선택</option>
          {people.map((person) => (
            <option key={person.user_id} value={person.user_id}>{safe(person.display_name, person.user_id)}</option>
          ))}
        </select>
      </label>
      <label>
        <span>백업</span>
        <select name="backup" value={backupValue} onChange={(event) => setBackupValue(event.target.value)}>
          <option value="">백업 없음</option>
          {people.map((person) => (
            <option key={person.user_id} value={person.user_id}>{safe(person.display_name, person.user_id)}</option>
          ))}
        </select>
      </label>
      <label className="wide">
        <span>인수인계 사유</span>
        <textarea name="note" rows="2" required value={noteValue} onChange={(event) => setNoteValue(event.target.value)} />
      </label>
      <button
        type="submit"
        className="secondary-button"
        data-matter-handoff-submit="true"
        disabled={pending || people.length === 0 || !onHandoffMatter}
      >
        {pending ? "반영 중" : "인수인계"}
      </button>
      <span
        className={`matter-ops-form-status ${state === "data" ? "success" : state === "idle" || state === "pending" ? "" : "error"}`}
        role={state === "error" || state === "guarded" ? "alert" : "status"}
        aria-live="polite"
        data-matter-handoff-mutation-status={state}
      >
        {pending
          ? "저장 후 사건 상세와 업무 목록을 다시 불러오는 중입니다."
          : validation || mutationMessage(result, "인수인계를 반영하고 최신 업무를 불러왔습니다.") || peopleState}
      </span>
    </form>
  );
}

export function MatterDetailTabs({
  matter,
  detailResult,
  activityResult,
  timelineResult,
  deadlineResult,
  channelResult,
  timeResult,
  invoiceResult,
  agingResult,
  overview,
  billingPanel,
  selectedLedgerRef,
  onOpenVault,
  onNavigateRoute,
  peopleResult,
  handoffPending,
  handoffResult,
  onHandoffMatter,
  closePending,
  closeResult,
  onCloseMatter
}) {
  const [activeTab, setActiveTab] = useState(selectedLedgerRef ? "work" : "overview");
  const detail = detailPayload(detailResult);
  const hasDetail = detailResult?.kind === "data";
  const detailEmpty = hasDetail && Object.keys(detail).length === 0;
  const detailWorkRows = detail.tab_data?.work_deadlines ?? [];
  const taskRows = detail.tasks ?? (hasDetail
    ? detailWorkRows.filter((row) => row.source_type === "task")
    : items(activityResult).filter((row) => ["task", "todo"].includes(row.activity_type ?? row.type)));
  const deadlineRows = detail.deadlines ?? (hasDetail
    ? detailWorkRows.filter((row) => row.source_type === "deadline")
    : items(deadlineResult));
  const timelineRows = detail.tab_data?.contact_history ?? detail.timeline ?? (hasDetail ? [] : timelineResult?.item?.visible_entries ?? []);
  const messageRows = timelineRows.length ? [] : channelResult?.item?.messages ?? [];
  const detailBillingRows = detail.tab_data?.time_billing ?? [];
  const financeRows = scoped(
    detailBillingRows.length ? detailBillingRows : [
      ...(detail.time_entries ?? items(timeResult)),
      ...(detail.invoices ?? items(invoiceResult)),
      ...(detail.ar ?? items(agingResult))
    ],
    matter?.matter_id
  );
  const documentCount = Number(detail.tab_data?.documents?.length ?? detail.document_count ?? detail.vault_summary?.document_count ?? 0);
  const blockers = Array.isArray(detail.close_blockers)
    ? detail.close_blockers
    : Array.isArray(detail.summary?.close_blockers)
      ? detail.summary.close_blockers
      : [];
  const closeoutState = detail.closeout_state;
  const canClose = detail.can_close === true;
  const isClosed = ["closed", "archived"].includes(matter?.status);
  const closeSucceeded = closeResult?.kind === "data"
    && (
      ["updated", "idempotent_replay", "passed"].includes(closeResult.statusOutcome)
      || closeResult.item?.status === "closed"
    );
  const financeResults = [timeResult, invoiceResult, agingResult];
  const billingStateResult = detailResult?.kind !== "data"
    ? detailResult
    : financeResults.some((result) => result === null || result === undefined)
      ? null
      : financeResults.find((result) =>
          result?.uiState === "denied"
          || result?.uiState === "blocked"
          || ["error", "blocked", "guarded"].includes(result?.kind))
        ?? { kind: "data" };

  useEffect(() => {
    setActiveTab(selectedLedgerRef ? "work" : "overview");
  }, [matter?.matter_id, selectedLedgerRef?.id, selectedLedgerRef?.model_type]);

  function selectedLedger(row, kind) {
    if (!selectedLedgerRef?.id) return false;
    const rowId = kind === "task"
      ? row.task_id ?? row.activity_id ?? row.id
      : row.event_id ?? row.deadline_id ?? row.id;
    if (rowId !== selectedLedgerRef.id) return false;
    const modelType = String(selectedLedgerRef.model_type ?? "").toLowerCase();
    return kind === "task" ? modelType.includes("task") : modelType.includes("calendar") || modelType.includes("deadline");
  }

  function handleTabKeyDown(event, index) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % DETAIL_TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + DETAIL_TABS.length) % DETAIL_TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = DETAIL_TABS.length - 1;
    setActiveTab(DETAIL_TABS[nextIndex][0]);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')?.[nextIndex]?.focus();
  }

  const counts = {
    overview: null,
    work: taskRows.length + deadlineRows.length,
    records: timelineRows.length + messageRows.length,
    documents: documentCount,
    billing: financeRows.length
  };

  return (
    <section className="matter-detail-tabs" data-matter-detail-tabs="five">
      <div className="matter-detail-tablist" role="tablist" aria-label="사건 상세">
        {DETAIL_TABS.map(([id, label], index) => (
          <button
            key={id}
            id={`matter-detail-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`matter-detail-panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            className={activeTab === id ? "active" : ""}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span>{label}</span>
            {counts[id] !== null && <small>{counts[id]}</small>}
          </button>
        ))}
      </div>

      <div
        id={`matter-detail-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`matter-detail-tab-${activeTab}`}
        className="matter-detail-tabpanel"
        tabIndex="0"
      >
        {activeTab === "overview" && (
          <MatterOperationsState result={detailResult} noun="사건 개요" empty={detailEmpty}>
            <div className="matter-detail-overview">
              <dl className="matter-detail-operating-summary">
                <div><dt>담당</dt><dd data-matter-detail-owner={detail.summary?.owner_user_id ?? detail.summary?.owner?.user_id ?? matter?.owner_user_id}>{safe(detail.summary?.owner?.display_name ?? detail.summary?.owner_user_id ?? detail.owner_display_name ?? detail.owner?.display_name)}</dd></div>
                <div><dt>백업</dt><dd data-matter-detail-backup={detail.summary?.backup_user_id ?? detail.summary?.backup?.user_id ?? matter?.backup_user_id ?? "none"}>{safe(detail.summary?.backup?.display_name ?? detail.summary?.backup_user_id ?? detail.backup_display_name ?? detail.backup?.display_name, "백업 미지정")}</dd></div>
                <div><dt>다음 행동</dt><dd>{safe(detail.summary?.next_action?.title ?? detail.next_action?.title ?? detail.next_action_title, "다음 행동 없음")}</dd></div>
                <div><dt>다음 기한</dt><dd>{dateLabel(detail.summary?.next_deadline?.due_at ?? detail.next_deadline?.due_at ?? detail.next_deadline_at)}</dd></div>
              </dl>
              {onHandoffMatter && (
                <MatterHandoffForm
                  matter={matter}
                  detail={detail}
                  peopleResult={peopleResult}
                  pending={handoffPending}
                  result={handoffResult}
                  onHandoffMatter={onHandoffMatter}
                />
              )}
              {closeoutState && (
                <section className="matter-detail-closeout" aria-labelledby="matter-detail-closeout-title">
                  <h3 id="matter-detail-closeout-title">종결 전 확인 <span>{blockers.length}</span></h3>
                  {!["data", "empty"].includes(closeoutState) ? (
                    <p role="alert">종결 점검을 불러오지 못했습니다.</p>
                  ) : blockers.length > 0 ? (
                    <ul>
                      {blockers.map((blocker, index) => (
                        <li key={blocker.blocker_id ?? `${safe(blocker.type, "blocker")}-${index}`}>
                          <span>
                            <strong>{safe(blocker.title ?? blocker.label ?? blocker.message ?? blocker.type)}</strong>
                            <small>{safe(blocker.status, "확인 필요")}</small>
                          </span>
                          {blocker.action?.section && onNavigateRoute && (
                            <button type="button" className="matter-ops-queue-link" onClick={() => onNavigateRoute(blocker.action.section, blocker.action.filter)}>
                              처리 화면
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="matter-detail-closeout-ready">
                      <p>{canClose ? "열린 업무, 기한, 미청구 시간과 미수금이 없습니다." : "종결 가능 여부를 확인해 주세요."}</p>
                      {canClose && !isClosed && onCloseMatter && (
                        <button type="button" className="secondary-button" disabled={closePending} onClick={onCloseMatter}>
                          {closePending ? "종결 중" : "사건 종결"}
                        </button>
                      )}
                    </div>
                  )}
                  {closeResult && (
                    <p
                      className={`matter-ops-mutation-status ${closeSucceeded ? "success" : "error"}`}
                      role={closeSucceeded ? "status" : "alert"}
                      data-matter-close-mutation-status={closeSucceeded ? "data" : "error"}
                    >
                      {closeSucceeded ? "사건을 종결했습니다." : "사건을 종결하지 못했습니다."}
                    </p>
                  )}
                </section>
              )}
              {overview}
            </div>
          </MatterOperationsState>
        )}
        {activeTab === "work" && (
          <MatterOperationsState result={detailResult ?? activityResult} noun="사건 업무" empty={taskRows.length + deadlineRows.length === 0}>
            <div className="matter-detail-record-list">
              {taskRows.map((row, index) => (
                <div
                  key={row.task_id ?? row.activity_id ?? index}
                  data-task-id={row.task_id}
                  data-selected-ledger={selectedLedger(row, "task") ? "true" : undefined}
                >
                  <span>{safe(row.status_label ?? row.status, "예정")}</span>
                  <strong>{eventTitle(row, index)}</strong>
                  <small>{dateLabel(row.due_at)} · {safe(row.owner_display_name ?? row.assignee_display_name, "미배정")}</small>
                </div>
              ))}
              {deadlineRows.map((row, index) => (
                <div
                  key={row.deadline_id ?? row.event_id ?? index}
                  data-deadline-id={row.deadline_id ?? row.event_id}
                  data-selected-ledger={selectedLedger(row, "deadline") ? "true" : undefined}
                >
                  <span>기한</span>
                  <strong>{eventTitle(row, index)}</strong>
                  <small>{dateLabel(row.due_at ?? row.starts_at)} · {safe(row.owner_display_name, "담당 미지정")}</small>
                </div>
              ))}
            </div>
          </MatterOperationsState>
        )}
        {activeTab === "records" && (
          <MatterOperationsState result={hasDetail ? detailResult : timelineResult ?? channelResult} noun="연락 기록" empty={timelineRows.length + messageRows.length === 0}>
            <div className="matter-detail-record-list">
              {[...timelineRows, ...messageRows].map((row, index) => (
                <div key={row.timeline_entry_id ?? row.message_id ?? row.activity_id ?? index}>
                  <span>{safe(row.type_label ?? row.activity_type ?? row.direction, "기록")}</span>
                  <strong>{eventTitle(row, index)}</strong>
                  <small>{dateLabel(eventTime(row))} · {safe(row.actor_display_name ?? row.author_display_name, "작성자 미지정")}</small>
                </div>
              ))}
            </div>
          </MatterOperationsState>
        )}
        {activeTab === "documents" && (
          <MatterOperationsState result={detailResult} noun="사건 문서" empty={hasDetail && documentCount === 0}>
            <div className="matter-detail-documents">
              <FileText size={20} aria-hidden="true" />
              <strong>사건 문서 {documentCount}건</strong>
              <p>문서는 기존 Vault 원장에서 사건 범위로 엽니다.</p>
              <button type="button" className="secondary-button" onClick={onOpenVault}>
                Vault에서 열기
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </MatterOperationsState>
        )}
        {activeTab === "billing" && (
          <MatterOperationsState result={billingStateResult} noun="시간·청구 정보" empty={billingStateResult?.kind === "data" && financeRows.length === 0}>
            {billingPanel}
          </MatterOperationsState>
        )}
      </div>
    </section>
  );
}
