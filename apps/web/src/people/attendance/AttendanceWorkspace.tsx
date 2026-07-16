import React from "react";
import { useEffect, useState } from "react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { createHrxAttendanceRecord, fetchHrxAttendance } from "../hrxApiClient.ts";

type HrxRecord = Record<string, unknown>;
type AttendanceResult = {
  kind: string;
  attendance?: HrxRecord[];
  uiState?: unknown;
};
type AttendanceForm = {
  clock_in: string;
  clock_out: string;
};

const EMPTY_FORM = {
  clock_in: "",
  clock_out: ""
};
const attendanceDateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });
const attendanceTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul"
});

function currentDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function timeToRecord(workDate: string, time: string) {
  if (!workDate || !time) return null;
  return `${workDate}T${time}:00+09:00`;
}

function formatWorkDate(value: unknown) {
  const workDate = stringValue(value);
  const date = new Date(`${workDate}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? workDate || "-" : attendanceDateFormatter.format(date);
}

function formatAttendanceTime(value: unknown) {
  const date = new Date(stringValue(value));
  return Number.isNaN(date.getTime()) ? "-" : attendanceTimeFormatter.format(date);
}

function attendanceRows(records: HrxRecord[]) {
  return [...records]
    .sort((left, right) => {
      const dateOrder = stringValue(right.work_date).localeCompare(stringValue(left.work_date));
      return dateOrder || stringValue(right.clock_in_at).localeCompare(stringValue(left.clock_in_at));
    })
    .map((record) => [
      formatWorkDate(record.work_date),
      formatAttendanceTime(record.clock_in_at),
      formatAttendanceTime(record.clock_out_at)
    ]);
}

export function AttendanceWorkspace({
  employeeId,
  refreshKey
}: {
  employeeId?: string | null;
  refreshKey?: number;
}) {
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [form, setForm] = useState<AttendanceForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const workDate = currentDateKey();
  const month = workDate.slice(0, 7);
  const records = result?.kind === "data" || result?.kind === "guarded" ? result.attendance ?? [] : [];
  const selectedEmployee = stringValue(employeeId);
  const bothTimesEntered = Boolean(form.clock_in && form.clock_out);
  const chronological = !bothTimesEntered || form.clock_out > form.clock_in;
  const canSubmit = Boolean(selectedEmployee && bothTimesEntered && chronological);

  useEffect(() => {
    setFeedback(null);
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;
    if (!employeeId) {
      setResult({ kind: "data", attendance: [] });
      return () => {
        cancelled = true;
      };
    }
    setResult(null);
    fetchHrxAttendance({
      month,
      employee_id: employeeId
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, month, refreshKey, localRefresh]);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    const suffix = `${Date.now()}`;
    const created = await createHrxAttendanceRecord({
      attendance_id: `att_ui_${suffix}`,
      employee_id: selectedEmployee,
      work_date: workDate,
      status: "present",
      source_kind: "manual",
      source_ref: `UI:attendance:${suffix}`,
      clock_in_at: timeToRecord(workDate, form.clock_in),
      clock_out_at: timeToRecord(workDate, form.clock_out)
    });
    setSubmitting(false);
    if (created.kind === "data") {
      setFeedback("saved");
      setLocalRefresh((value: number) => value + 1);
    } else {
      setFeedback("error");
    }
  }

  return (
    <Panel id="people-attendance-records" className="people-panel attendance-workspace" title="출근/퇴근 기록">
      <form className="attendance-record-form" onSubmit={handleSubmit} data-simple-attendance="true">
        <label>
          <span>출근시간</span>
          <input
            type="time"
            value={form.clock_in}
            onChange={(event) => {
              setForm({ ...form, clock_in: event.target.value });
              setFeedback(null);
            }}
            required
            data-attendance-clock-in="true"
          />
        </label>
        <label>
          <span>퇴근시간</span>
          <input
            type="time"
            value={form.clock_out}
            onChange={(event) => {
              setForm({ ...form, clock_out: event.target.value });
              setFeedback(null);
            }}
            required
            data-attendance-clock-out="true"
          />
        </label>
        <button className="primary-button" disabled={!canSubmit || submitting} data-attendance-submit="true">
          {submitting ? "저장 중" : "기록 저장"}
        </button>
      </form>

      {!selectedEmployee && <div className="live-data-state live-data-empty">왼쪽에서 구성원을 선택하세요.</div>}
      {bothTimesEntered && !chronological && <div className="live-data-state live-data-error" role="alert">퇴근시간은 출근시간보다 늦어야 합니다.</div>}
      {feedback === "saved" && <div className="live-data-state live-data-success" role="status">출근시간과 퇴근시간을 저장했습니다.</div>}
      {feedback === "error" && <div className="live-data-state live-data-error" role="alert">출퇴근 기록을 저장하지 못했습니다.</div>}
      {selectedEmployee && result === null && <div className="live-data-state live-data-loading">출퇴근 기록을 불러오는 중입니다</div>}
      {result?.kind === "error" && <div className="live-data-state live-data-error">출퇴근 기록을 불러오지 못했습니다.</div>}
      {result?.kind === "guarded" && <div className="live-data-state live-data-review">출퇴근 기록 접근 상태를 확인해야 합니다.</div>}
      {(result?.kind === "data" || result?.kind === "guarded") && records.length === 0 && selectedEmployee && (
        <div className="live-data-state live-data-empty">저장된 출퇴근 기록이 없습니다.</div>
      )}
      {(result?.kind === "data" || result?.kind === "guarded") && records.length > 0 && (
        <div className="attendance-history" data-attendance-history="true">
          <strong>기록 내역</strong>
          <DataTable columns={["근무일", "출근시간", "퇴근시간"]} rows={attendanceRows(records)} />
        </div>
      )}
    </Panel>
  );
}
