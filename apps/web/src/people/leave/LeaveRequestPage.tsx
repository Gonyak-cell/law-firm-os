import React from "react";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxLeaveState, submitHrxLeaveRequest } from "../hrxApiClient.ts";

function leaveStateLabel(value) {
  if (value === "approved") return "승인";
  if (value === "rejected") return "반려";
  if (value === "pending") return "대기";
  if (value === "submitted") return "제출";
  if (value === "cancelled") return "취소";
  return "확인 필요";
}

const emptyLeaveForm = { amount: "", start_date: "", end_date: "", leave_type: "", policy_id: "" };

function present(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatLeaveHours(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "확인 필요";
  return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}시간`;
}

function formatLeaveType(value) {
  const code = present(value);
  if (!code) return "확인 필요";
  if (code === "pto") return "연차 (pto)";
  if (code === "sick") return "병가 (sick)";
  if (code === "family") return "가족돌봄 (family)";
  if (code === "unpaid") return "무급 (unpaid)";
  return code;
}

function formatLeavePeriod(request) {
  const start = present(request.start_date);
  const end = present(request.end_date);
  if (!start && !end) return "확인 필요";
  if (!end || start === end) return start ?? end;
  if (!start) return end;
  return `${start} ~ ${end}`;
}

function balanceMetric(balance, key) {
  return balance && Object.prototype.hasOwnProperty.call(balance, key) ? balance[key] : null;
}

function suggestedLeaveType(requests) {
  const request = requests.find((item) => present(item.leave_type));
  return present(request?.leave_type) ?? "";
}

export function LeaveRequestPage({ employeeId, refreshKey, onSubmitted }) {
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(emptyLeaveForm);
  const [submitting, setSubmitting] = useState(false);
  const amountValue = Number(form.amount);
  const canSubmit = Boolean(
    employeeId
    && form.amount.trim()
    && Number.isFinite(amountValue)
    && amountValue > 0
    && form.start_date.trim()
    && form.end_date.trim()
    && form.leave_type.trim()
    && form.policy_id.trim()
  );

  useEffect(() => {
    setForm(emptyLeaveForm);
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxLeaveState(employeeId).then((next) => {
      if (cancelled) return;
      setResult(next);
      if (next.kind === "data") {
        setForm((current) => ({
          ...current,
          policy_id: current.policy_id || present(next.balance?.policy_id) || "",
          leave_type: current.leave_type || suggestedLeaveType(next.requests)
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const submitted = await submitHrxLeaveRequest(employeeId, form);
    setSubmitting(false);
    if (submitted.kind === "data") {
      setForm((current) => ({ ...current, amount: "", start_date: "", end_date: "" }));
      onSubmitted?.();
    }
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
    const balance = result.balance;
    stateBody = (
      <>
        <div className="leave-balance-strip">
          {balance ? (
            <>
              <div className="leave-balance-item">
                <strong>{present(balance.policy_id) ?? "정책 확인 필요"}</strong>
                <span>정책</span>
              </div>
              <div className="leave-balance-item">
                <strong>{formatLeaveHours(balanceMetric(balance, "available_balance"))}</strong>
                <span>사용 가능</span>
              </div>
              <div className="leave-balance-item">
                <strong>{formatLeaveHours(balanceMetric(balance, "used_balance"))}</strong>
                <span>사용</span>
              </div>
              <div className="leave-balance-item">
                <strong>{formatLeaveHours(balanceMetric(balance, "earned_balance"))}</strong>
                <span>발생</span>
              </div>
              <div className="leave-balance-item">
                <strong>{formatLeaveHours(balanceMetric(balance, "reserved_balance"))}</strong>
                <span>예약</span>
              </div>
            </>
          ) : (
            <div className="leave-balance-item">
              <strong>권한 필요</strong>
              <span>잔여휴가</span>
            </div>
          )}
        </div>
        <DataTable
          columns={["요청 ID", "정책", "유형", "기간", "시간", "상태"]}
          rows={result.requests.map((request) => [
            present(request.request_id) ?? "ID 확인 필요",
            present(request.policy_id) ?? "정책 확인 필요",
            formatLeaveType(request.leave_type),
            formatLeavePeriod(request),
            formatLeaveHours(request.amount),
            leaveStateLabel(request.state)
          ])}
        />
      </>
    );
  }

  return (
    <Panel id="people-leave" className="people-panel span-2" title="휴가관리" meta="휴가 현황">
      <div className="people-panel-kicker">
        <CalendarCheck size={15} />
        휴가를 신청하고 잔여 휴가를 확인합니다
      </div>
      <form className="leave-request-form" onSubmit={handleSubmit}>
        <label>
          <span>시간</span>
          <input type="number" min="0.5" step="0.5" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </label>
        <label>
          <span>휴가 유형</span>
          <input value={form.leave_type} onChange={(event) => setForm({ ...form, leave_type: event.target.value })} />
        </label>
        <label>
          <span>정책 ID</span>
          <input value={form.policy_id} onChange={(event) => setForm({ ...form, policy_id: event.target.value })} />
        </label>
        <label>
          <span>시작일</span>
          <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
        </label>
        <label>
          <span>종료일</span>
          <input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
        </label>
        <button className="primary-button" disabled={!canSubmit || submitting}>
          {submitting ? "신청 중" : "신청"}
        </button>
      </form>
      {stateBody}
    </Panel>
  );
}
