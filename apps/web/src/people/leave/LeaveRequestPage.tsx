import React from "react";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxLeaveState, submitHrxLeaveRequest } from "../hrxApiClient.ts";

function leaveStateLabel(value) {
  if (value === "approved") return "승인";
  if (value === "rejected") return "반려";
  if (value === "pending") return "대기";
  return "확인 필요";
}

export function LeaveRequestPage({ employeeId, refreshKey, onSubmitted }) {
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ amount: "", start_date: "", end_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = Boolean(employeeId && form.amount.trim() && form.start_date.trim() && form.end_date.trim());

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxLeaveState(employeeId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    const submitted = await submitHrxLeaveRequest(employeeId, form);
    setSubmitting(false);
    if (submitted.kind === "data") onSubmitted?.();
    else setResult({ kind: "error" });
  }

  let stateBody;
  if (!employeeId) {
    stateBody = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result === null) {
    stateBody = <div className="live-data-state live-data-loading">휴가 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "empty") {
    stateBody = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result.kind === "error") {
    stateBody = <div className="live-data-state live-data-error">휴가 정보를 불러오지 못했습니다.</div>;
  } else {
    stateBody = (
      <>
        <div className="leave-balance-strip">
          <strong>{result.balance ? "확인 가능" : "권한 필요"}</strong>
          <span>사용 가능한 휴가</span>
        </div>
        <DataTable
          columns={["요청", "유형", "기간", "상태"]}
          rows={result.requests.map((request, index) => [`요청 ${index + 1}`, request.leave_type === "pto" ? "연차" : "휴가", request.amount ? "신청됨" : "확인 필요", leaveStateLabel(request.state)])}
        />
      </>
    );
  }

  return (
    <Panel id="people-leave" className="people-panel span-2" title="휴가 신청" meta="휴가 현황">
      <div className="people-panel-kicker">
        <CalendarCheck size={15} />
        휴가를 신청하고 잔여 휴가를 확인합니다
      </div>
      <form className="leave-request-form" onSubmit={handleSubmit}>
        <label>
          <span>시간</span>
          <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </label>
        <label>
          <span>시작일</span>
          <input value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
        </label>
        <label>
          <span>종료일</span>
          <input value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
        </label>
        <button className="primary-button" disabled={!canSubmit || submitting}>
          {submitting ? "신청 중" : "신청"}
        </button>
      </form>
      {stateBody}
    </Panel>
  );
}
