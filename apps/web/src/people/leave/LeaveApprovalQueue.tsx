import React, { useEffect, useMemo, useState } from "react";
import { Check, UserRoundCog } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  closeHrxLeaveDelegation,
  createHrxLeaveDelegation,
  fetchHrxLeaveApprovalQueue,
  fetchHrxLeaveDelegationCandidates,
  fetchHrxLeaveDelegations,
  resolveHrxLeaveApproval
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;
type RescheduleDraft = {
  request_id: string;
  proposed_start_date: string;
  proposed_end_date: string;
  legal_reason: string;
  expires_at: string;
};

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function record(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function rows(row: Row | null | undefined, field: string) {
  return Array.isArray(row?.[field]) ? row[field] as Row[] : [];
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function commandKey(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

function dateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function dateTimeLocal(offsetDays = 0, hour = 9) {
  return `${dateKey(offsetDays)}T${String(hour).padStart(2, "0")}:00`;
}

function isoDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function formatMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "확인 필요";
  if (minutes % 60 === 0) return `${minutes / 60}시간`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function formatPeriod(row: Row) {
  const start = text(row, "start_date");
  const end = text(row, "end_date");
  return start === end ? start : `${start} ~ ${end}`;
}

function formatDelegationState(state: unknown) {
  if (state === "active") return "위임 중";
  if (state === "scheduled") return "시작 전";
  if (state === "revoked") return "철회";
  return "만료";
}

function safeError(value: unknown) {
  const code = typeof value === "string" ? value : "";
  if (code === "HRX_LEAVE_DELEGATION_PERIOD_OVERLAP") return "같은 기간에 이미 승인 위임이 있습니다.";
  if (code === "HRX_LEAVE_DELEGATION_CYCLE_FORBIDDEN") return "서로에게 승인 권한을 위임할 수 없습니다.";
  if (code === "HRX_LEAVE_DELEGATION_SCOPE_EXPANSION_FORBIDDEN") return "위임받은 권한은 다시 위임할 수 없습니다.";
  if (code === "HRX_LEAVE_DELEGATE_NOT_ELIGIBLE") return "휴가 승인 권한이 있는 구성원만 선택할 수 있습니다.";
  if (code === "HRX_LEAVE_STATE_CONFLICT") return "이미 처리된 요청입니다. 목록을 새로 불러왔습니다.";
  return "요청을 처리하지 못했습니다. 입력값과 연결 상태를 확인하세요.";
}

export function LeaveApprovalQueue() {
  const [approvals, setApprovals] = useState<Row[]>([]);
  const [delegations, setDelegations] = useState<Row[]>([]);
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [reschedule, setReschedule] = useState<RescheduleDraft | null>(null);
  const [delegationForm, setDelegationForm] = useState({ delegate_actor_id: "", valid_from: dateTimeLocal(), valid_to: dateTimeLocal(7, 18) });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [queueResult, delegationResult, candidateResult] = await Promise.all([
      fetchHrxLeaveApprovalQueue(),
      fetchHrxLeaveDelegations(),
      fetchHrxLeaveDelegationCandidates()
    ]);
    setLoading(false);
    if (queueResult.kind !== "data" || delegationResult.kind !== "data" || candidateResult.kind !== "data") {
      setError("승인 요청을 불러오지 못했습니다.");
      return;
    }
    setApprovals(queueResult.approvals as Row[]);
    setDelegations(delegationResult.delegations as Row[]);
    setCandidates(candidateResult.candidates as Row[]);
    setDelegationForm((current) => ({ ...current, delegate_actor_id: current.delegate_actor_id || text(candidateResult.candidates[0] as Row, "actor_id") }));
    setError("");
  }

  useEffect(() => {
    void load();
  }, []);

  const activeDelegations = useMemo(
    () => delegations.filter((delegation) => ["active", "scheduled"].includes(text(delegation, "state"))).length,
    [delegations]
  );

  async function run(key: string, action: () => Promise<{ kind: string; reason?: unknown }>) {
    setBusy(key);
    setError("");
    const result = await action();
    setBusy("");
    if (result.kind === "data") {
      setReschedule(null);
      await load();
      return;
    }
    setError(safeError(result.reason));
    if (result.reason === "HRX_LEAVE_STATE_CONFLICT") await load();
  }

  async function createDelegation(event: { preventDefault(): void }) {
    event.preventDefault();
    await run("delegation:create", () => createHrxLeaveDelegation({
      delegate_actor_id: delegationForm.delegate_actor_id,
      valid_from: isoDateTime(delegationForm.valid_from),
      valid_to: isoDateTime(delegationForm.valid_to)
    }));
  }

  return (
    <Panel id="people-leave-requests" className="people-panel span-2 leave-approval-panel" title="휴가 요청" meta={`${approvals.length}건`}>
      {loading && <div className="live-data-state live-data-loading">승인 요청을 불러오는 중입니다</div>}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      {!loading && approvals.length === 0 && <div className="live-data-state live-data-empty">처리할 휴가 요청이 없습니다.</div>}
      {!loading && approvals.length > 0 && (
        <div className="leave-approval-list">
          {approvals.map((approval) => {
            const request = record(approval, "leave_request") ?? {};
            const balance = record(request, "current_balance");
            const requestId = text(request, "request_id");
            const reason = decisionReasons[requestId] ?? "";
            const isAnnual = request.statutory_annual === true;
            const isRescheduling = reschedule?.request_id === requestId;
            const hasProposal = Array.isArray(request.reschedule_proposals) && request.reschedule_proposals.some((proposal) => text(proposal as Row, "state") === "proposed");
            const informationPending = Boolean(
              text(request, "information_requested_at") &&
              (!text(request, "information_provided_at") || text(request, "information_provided_at") < text(request, "information_requested_at"))
            );
            return (
              <article className="leave-approval-row" key={requestId}>
                <div className="leave-approval-summary">
                  <div><strong>{text(request, "employee_display_name") || "구성원"}</strong><span>{text(request, "leave_type_display_name") || "휴가"} · {formatPeriod(request)}</span></div>
                  <span className="record-state-badge" data-state="review">{approval.escalated === true ? "대체 승인" : approval.delegated === true ? "위임 승인" : "승인 대기"}</span>
                </div>
                <dl className="leave-approval-facts">
                  <div><dt>차감</dt><dd>{formatMinutes(request.requested_minutes)}</dd></div>
                  <div><dt>사용 가능</dt><dd>{formatMinutes(number(balance, "available_minutes"))}</dd></div>
                  <div><dt>동시 부재</dt><dd>{number(request, "team_simultaneous_absence_count")}명</dd></div>
                  <div><dt>승인 단계</dt><dd>{number(record(approval, "step"), "step_order")}단계</dd></div>
                </dl>
                {(text(request, "handover_note") || text(request, "reason_text") || rows(request, "attachments").length > 0 || informationPending) && (
                  <div className="leave-approval-context">
                    {text(request, "handover_note") && <div><strong>인계 메모</strong><span>{text(request, "handover_note")}</span></div>}
                    {text(request, "reason_text") && <div><strong>신청 사유</strong><span>{text(request, "reason_text")}</span></div>}
                    {rows(request, "attachments").length > 0 && <div><strong>증빙</strong><span>{rows(request, "attachments").map((attachment) => `${text(attachment, "title")} (${text(attachment, "verification_state")})`).join(" · ")}</span></div>}
                    {informationPending && <div><strong>추가 자료 대기</strong><span>{text(request, "information_request_message")}</span></div>}
                  </div>
                )}
                <label className="leave-decision-reason"><span>처리 메모</span><input value={reason} onChange={(event) => setDecisionReasons((current) => ({ ...current, [requestId]: event.target.value }))} placeholder="인계 또는 판단 근거" /></label>
                <div className="approval-actions">
                  {!isAnnual && <button className="secondary-button" type="button" disabled={hasProposal || informationPending || !reason.trim() || Boolean(busy)} onClick={() => void run(`request-info:${requestId}`, () => resolveHrxLeaveApproval(requestId, "request-info", { idempotency_key: commandKey("leave-request-info"), request_message: reason }))}>추가 자료 요청</button>}
                  {!isAnnual && <button className="secondary-button" type="button" disabled={hasProposal || informationPending || !reason.trim() || Boolean(busy)} onClick={() => void run(`reject:${requestId}`, () => resolveHrxLeaveApproval(requestId, "reject", { idempotency_key: commandKey("leave-reject"), decision_reason: reason }))}>반려</button>}
                  <button className="secondary-button" type="button" disabled={hasProposal || informationPending || Boolean(busy)} onClick={() => setReschedule({ request_id: requestId, proposed_start_date: text(request, "start_date"), proposed_end_date: text(request, "end_date"), legal_reason: "", expires_at: dateTimeLocal(3, 18) })}>시기변경 협의</button>
                  <button className="primary-button" type="button" disabled={hasProposal || informationPending || Boolean(busy)} onClick={() => void run(`approve:${requestId}`, () => resolveHrxLeaveApproval(requestId, "approve", { idempotency_key: commandKey("leave-approve"), decision_reason: reason || "업무 일정 확인" }))}><Check size={14} />승인</button>
                </div>
                {isRescheduling && reschedule && (
                  <form className="leave-reschedule-form" onSubmit={(event) => {
                    event.preventDefault();
                    void run(`reschedule:${requestId}`, () => resolveHrxLeaveApproval(requestId, "reschedule", {
                      idempotency_key: commandKey("leave-reschedule"),
                      proposed_start_date: reschedule.proposed_start_date,
                      proposed_end_date: reschedule.proposed_end_date,
                      legal_reason: reschedule.legal_reason,
                      expires_at: isoDateTime(reschedule.expires_at)
                    }));
                  }}>
                    <strong>시기변경 제안</strong>
                    <label><span>시작일</span><input required type="date" value={reschedule.proposed_start_date} onChange={(event) => setReschedule({ ...reschedule, proposed_start_date: event.target.value })} /></label>
                    <label><span>종료일</span><input required type="date" value={reschedule.proposed_end_date} onChange={(event) => setReschedule({ ...reschedule, proposed_end_date: event.target.value })} /></label>
                    <label className="leave-reschedule-reason"><span>법적·업무상 사유</span><input required value={reschedule.legal_reason} onChange={(event) => setReschedule({ ...reschedule, legal_reason: event.target.value })} placeholder="사업 운영에 미치는 구체적 영향" /></label>
                    <label><span>응답 기한</span><input required type="datetime-local" value={reschedule.expires_at} onChange={(event) => setReschedule({ ...reschedule, expires_at: event.target.value })} /></label>
                    <div className="approval-actions"><button className="secondary-button" type="button" onClick={() => setReschedule(null)}>닫기</button><button className="primary-button" disabled={Boolean(busy)}>제안 보내기</button></div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section className="leave-delegation-section" aria-labelledby="leave-delegation-title">
        <div className="leave-form-section-title"><UserRoundCog size={15} /><strong id="leave-delegation-title">위임 관리</strong><span>{activeDelegations}건 활성</span></div>
        <form className="leave-delegation-form" onSubmit={createDelegation}>
          <label><span>위임받을 승인자</span><select required value={delegationForm.delegate_actor_id} onChange={(event) => setDelegationForm({ ...delegationForm, delegate_actor_id: event.target.value })}>{candidates.map((candidate) => <option key={text(candidate, "actor_id")} value={text(candidate, "actor_id")}>{text(candidate, "display_name")} {text(candidate, "source_title")}</option>)}</select></label>
          <label><span>시작</span><input required type="datetime-local" value={delegationForm.valid_from} onChange={(event) => setDelegationForm({ ...delegationForm, valid_from: event.target.value })} /></label>
          <label><span>종료</span><input required type="datetime-local" value={delegationForm.valid_to} onChange={(event) => setDelegationForm({ ...delegationForm, valid_to: event.target.value })} /></label>
          <button className="secondary-button" disabled={!delegationForm.delegate_actor_id || Boolean(busy)}>위임 추가</button>
        </form>
        {delegations.length === 0 ? <div className="live-data-state live-data-empty">승인 위임 내역이 없습니다.</div> : (
          <div className="leave-delegation-list">
            {delegations.map((delegation) => {
              const delegate = record(delegation, "delegate");
              const delegationId = text(delegation, "delegation_id");
              const state = text(delegation, "state");
              return (
                <div className="leave-delegation-row" key={delegationId}>
                  <div><strong>{text(delegate, "display_name") || "승인자"}</strong><span>{text(delegation, "valid_from").slice(0, 10)} ~ {text(delegation, "valid_to").slice(0, 10)}</span></div>
                  <span className="record-state-badge" data-state={state === "active" ? "live" : state === "revoked" ? "error" : "review"}>{formatDelegationState(state)}</span>
                  <div className="approval-actions">
                    {["active", "scheduled"].includes(state) && <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void run(`revoke:${delegationId}`, () => closeHrxLeaveDelegation(delegationId, "revoke"))}>철회</button>}
                    {state === "expired" && !delegation.expired_at && <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void run(`expire:${delegationId}`, () => closeHrxLeaveDelegation(delegationId, "expire"))}>만료 처리</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Panel>
  );
}
