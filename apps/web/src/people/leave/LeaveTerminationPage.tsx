import React, { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import { executeHrxLeaveTermination, fetchHrxLeaveTerminationWorkspace, previewHrxLeaveTermination } from "../hrxApiClient.ts";

type Row = Record<string, unknown>;

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function minutes(value: number) {
  const days = Math.floor(Math.abs(value) / 480);
  const remainder = Math.abs(value) % 480;
  const valueText = days && remainder ? `${days}일 ${remainder}분` : days ? `${days}일` : `${remainder}분`;
  return value < 0 ? `-${valueText}` : valueText;
}

function reconciliationStateLabel(state: string) {
  return ({ approved_pending_sync: "급여 동기화 대기", approved_and_synced: "정산 완료", needs_review: "원장 검토 필요", previewed: "미리보기" } as Record<string, string>)[state] ?? state;
}

export function LeaveTerminationPage() {
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [approvers, setApprovers] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);
  const [result, setResult] = useState<Row | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setBusy("load");
    const response = await fetchHrxLeaveTerminationWorkspace();
    setBusy("");
    if (response.kind !== "data") {
      setError("퇴사 정산 대상을 불러오지 못했습니다.");
      return;
    }
    setCandidates(response.candidates as Row[]);
    setApprovers(response.approvers as Row[]);
    setHistory(response.reconciliations as Row[]);
    setSelectedEmployee((current) => current || text(response.candidates[0] as Row, "employee_id"));
    setApprovedBy((current) => current || text(response.approvers[0] as Row, "actor_id"));
  }

  useEffect(() => { void load(); }, []);

  const candidate = candidates.find((row) => text(row, "employee_id") === selectedEmployee) ?? null;
  const visible = result ?? preview;
  const calculation = visible?.result as Row | undefined;
  const totals = calculation?.totals as Row | undefined;
  const groups = Array.isArray(calculation?.groups) ? calculation.groups as Row[] : [];
  const validationErrors = Array.isArray(calculation?.validation_errors) ? calculation.validation_errors as Row[] : [];

  async function runPreview() {
    if (!candidate) return;
    setBusy("preview");
    setError("");
    setResult(null);
    setStepUpRequired(false);
    const response = await previewHrxLeaveTermination({ employee_id: text(candidate, "employee_id"), termination_date: text(candidate, "termination_date") });
    setBusy("");
    if (response.kind !== "data") {
      setError("퇴사일 기준 잔액을 계산하지 못했습니다.");
      return;
    }
    setPreview(response.reconciliation as Row);
    setIdempotencyKey(`leave-termination-${Date.now()}`);
  }

  async function execute() {
    if (!preview) return;
    setBusy("execute");
    setError("");
    const response = await executeHrxLeaveTermination({ preview_reconciliation_id: text(preview, "reconciliation_id"), approved_by_actor_id: approvedBy, idempotency_key: idempotencyKey });
    setBusy("");
    if (response.kind === "step_up_required") {
      setStepUpRequired(true);
      return;
    }
    if (response.kind !== "data") {
      setError("퇴사 정산을 원장과 급여 인계 큐에 반영하지 못했습니다.");
      return;
    }
    setStepUpRequired(false);
    setResult(response.reconciliation as Row);
    void load();
  }

  return (
    <Panel id="people-leave-termination" className="people-panel span-2 leave-termination-panel" title="퇴사 휴가 정산">
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><h3>정산 대상</h3></div>
        <div className="leave-termination-controls">
          <label><span>퇴사 예정자</span><select value={selectedEmployee} onChange={(event) => { setSelectedEmployee(event.target.value); setPreview(null); setResult(null); }}><option value="">대상 선택</option>{candidates.map((row) => <option key={text(row, "offboarding_id")} value={text(row, "employee_id")}>{text(row, "employee_display_name")} · {text(row, "termination_date")}</option>)}</select></label>
          <label><span>다른 승인 HR</span><select value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)}><option value="">승인자 선택</option>{approvers.map((row) => <option key={text(row, "actor_id")} value={text(row, "actor_id")}>{text(row, "display_name")}</option>)}</select></label>
          <button className="secondary-button" type="button" disabled={!candidate || busy === "preview"} onClick={() => void runPreview()}>정산 미리보기</button>
          <button className="primary-button" type="button" disabled={!preview || !approvedBy || validationErrors.length > 0 || busy === "execute" || Boolean(result)} onClick={() => void execute()}><Play size={14} />정산 실행</button>
        </div>
        {stepUpRequired && <HrxStepUpChallenge purpose="leave_termination_settlement" onVerified={() => void execute()} />}
      </section>

      {visible ? <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><h3>퇴사일 기준 대사</h3><span className={`record-state-badge ${text(visible, "state")}`}>{reconciliationStateLabel(text(visible, "state"))}</span></div>
        <div className="leave-report-summary leave-termination-summary">
          <span><small>최종 발생</small><strong>{minutes(number(totals, "final_accrued_minutes"))}</strong></span>
          <span><small>예약</small><strong>{minutes(number(totals, "reserved_minutes"))}</strong></span>
          <span><small>사용</small><strong>{minutes(number(totals, "used_minutes"))}</strong></span>
          <span><small>미사용</small><strong>{minutes(number(totals, "unused_minutes"))}</strong></span>
          <span><small>음수 잔액</small><strong>{minutes(number(totals, "negative_minutes"))}</strong></span>
          <span><small>향후 요청 해제</small><strong>{minutes(number(totals, "future_request_reversal_minutes"))}</strong></span>
        </div>
        {validationErrors.length > 0 && <div className="live-data-state live-data-error">원장 {validationErrors.length}건 검토 필요</div>}
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>휴가 그룹</th><th>발생</th><th>사용</th><th>예약</th><th>미사용</th><th>음수</th><th>급여 경계</th></tr></thead><tbody>{groups.map((group) => { const boundary = group.payroll_boundary as Row | undefined; return <tr key={text(group, "group_id")}><td><strong>{text(group, "group_display_name")}</strong></td><td>{minutes(number(group, "final_accrued_minutes"))}</td><td>{minutes(number(group, "used_minutes"))}</td><td>{minutes(number(group, "reserved_minutes"))}</td><td>{minutes(number(group, "unused_minutes"))}</td><td>{minutes(number(group, "negative_minutes"))}</td><td>{number(boundary, "requires_policy_review") ? "정책 검토" : "급여율 검토"}</td></tr>; })}</tbody></table></div>
        {text(visible, "state") === "approved_pending_sync" && <div className="leave-termination-gate"><strong>급여 전달 확인 대기</strong></div>}
      </section> : null}

      <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><h3>최근 정산</h3><span>{history.length}건</span></div>
        {history.length > 0 && <div className="data-table-wrap"><table className="data-table"><thead><tr><th>생성 시각</th><th>구성원</th><th>퇴사일</th><th>구분</th><th>상태</th></tr></thead><tbody>{history.slice(0, 10).map((row) => { const rowResult = row.result as Row | undefined; return <tr key={text(row, "reconciliation_id")}><td>{text(row, "created_at").replace("T", " ").slice(0, 16)}</td><td>{text(rowResult, "employee_display_name")}</td><td>{text(row, "termination_date")}</td><td>{text(row, "mode") === "execute" ? "실행" : "미리보기"}</td><td>{reconciliationStateLabel(text(row, "state"))}</td></tr>; })}</tbody></table></div>}
      </section>
    </Panel>
  );
}
