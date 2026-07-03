import React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, RefreshCw } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import {
  createHrxAttendanceRecord,
  fetchHrxAttendance,
  fetchHrxOvertimeRisk
} from "../hrxApiClient.ts";

type HrxRecord = Record<string, any>;
type AttendanceResult = {
  kind: string;
  attendance?: HrxRecord[];
  monthly_summary?: HrxRecord | null;
  uiState?: unknown;
};
type RiskResult = {
  kind: string;
  risk_report?: HrxRecord | null;
};
type AttendanceForm = {
  employee_id: string;
  work_date: string;
  status: string;
  recorded_hours: string;
  clock_in: string;
  clock_out: string;
};

const STATUS_OPTIONS = ["present", "remote", "leave", "absent", "holiday"];
const STATUS_LABELS: Record<string, string> = {
  present: "출근",
  remote: "원격",
  leave: "휴가",
  absent: "결근",
  holiday: "휴일"
};
const EMPTY_FORM = {
  work_date: "",
  status: "present",
  recorded_hours: "8",
  clock_in: "09:00",
  clock_out: "18:00"
};

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatHours(value: unknown) {
  const amount = numberValue(value, NaN);
  if (!Number.isFinite(amount)) return "0시간";
  return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}시간`;
}

function statusLabel(value: unknown) {
  const status = stringValue(value, "unknown");
  return STATUS_LABELS[status] ?? status;
}

function timeToRecord(workDate: string, time: string) {
  if (!workDate || !time) return null;
  return `${workDate}T${time}:00+09:00`;
}

function daysForMonth(month: string, records: HrxRecord[]) {
  const [yearValue, monthValue] = month.split("-").map((part) => Number(part));
  if (!Number.isInteger(yearValue) || !Number.isInteger(monthValue)) return [];
  const days = new Date(yearValue, monthValue, 0).getDate();
  const recordsByDate = new Map<string, HrxRecord[]>();
  for (const record of records) {
    const workDate = stringValue(record.work_date);
    if (!workDate) continue;
    recordsByDate.set(workDate, [...(recordsByDate.get(workDate) ?? []), record]);
  }
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const dayRecords = recordsByDate.get(date) ?? [];
    return { date, day, records: dayRecords };
  });
}

function attendanceRows(records: HrxRecord[]) {
  return records.map((record) => [
    stringValue(record.attendance_id, "ID 확인 필요"),
    stringValue(record.employee_id, "구성원 확인 필요"),
    stringValue(record.work_date, "일자 확인 필요"),
    statusLabel(record.status),
    formatHours(record.recorded_hours),
    [stringValue(record.clock_in_at, "-"), stringValue(record.clock_out_at, "-")].join(" / "),
    stringValue(record.source_kind, "manual"),
    stringValue(record.correction_of_attendance_id, "-")
  ]);
}

function riskRows(result: RiskResult | null) {
  const events = Array.isArray(result?.risk_report?.events) ? result.risk_report.events as HrxRecord[] : [];
  return events.map((event) => [
    stringValue(event.risk_type, "risk"),
    stringValue(event.work_date, stringValue(event.week_start, "-")),
    stringValue(event.severity, "warning"),
    formatHours(event.excess_hours),
    stringValue(event.attendance_id, "-")
  ]);
}

export function AttendanceWorkspace({
  employeeId,
  refreshKey,
  onChanged,
  mode = "attendance"
}: {
  employeeId?: string | null;
  refreshKey?: number;
  onChanged?: () => void;
  mode?: "attendance" | "schedule" | "status";
}) {
  const [month, setMonth] = useState(currentMonthKey());
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [form, setForm] = useState<AttendanceForm>({ ...EMPTY_FORM, employee_id: employeeId ?? "" });
  const [submitting, setSubmitting] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);
  const records = result?.kind === "data" || result?.kind === "guarded" ? result.attendance ?? [] : [];
  const summary = result?.monthly_summary ?? null;
  const calendarDays = useMemo(() => daysForMonth(month, records), [month, records]);
  const selectedEmployee = employeeId ?? stringValue(form.employee_id);
  const riskEvents = riskRows(riskResult);
  const canSubmit = Boolean(
    stringValue(form.employee_id) &&
    stringValue(form.work_date) &&
    stringValue(form.status) &&
    Number.isFinite(Number(form.recorded_hours))
  );

  useEffect(() => {
    setForm((current: AttendanceForm) => ({ ...current, employee_id: employeeId ?? current.employee_id }));
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxAttendance({
      month,
      employee_id: employeeId || undefined
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, month, refreshKey, localRefresh]);

  useEffect(() => {
    let cancelled = false;
    setRiskResult(null);
    if (!selectedEmployee) return () => {
      cancelled = true;
    };
    fetchHrxOvertimeRisk({
      employee_id: selectedEmployee,
      month
    }).then((next) => {
      if (!cancelled) setRiskResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedEmployee, month, refreshKey, localRefresh]);

  async function handleSubmit(event: any) {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const suffix = `${Date.now()}`;
    const created = await createHrxAttendanceRecord({
      attendance_id: `att_ui_${suffix}`,
      employee_id: stringValue(form.employee_id),
      work_date: stringValue(form.work_date),
      status: stringValue(form.status, "present"),
      source_kind: "manual",
      source_ref: `UI:attendance:${suffix}`,
      recorded_hours: Number(form.recorded_hours),
      clock_in_at: timeToRecord(form.work_date, form.clock_in),
      clock_out_at: timeToRecord(form.work_date, form.clock_out)
    });
    setSubmitting(false);
    if (created.kind === "data") {
      setForm((current: AttendanceForm) => ({ ...current, work_date: currentDateKey() }));
      setLocalRefresh((value: number) => value + 1);
      onChanged?.();
    } else {
      setResult({ kind: "error" });
    }
  }

  const title = mode === "schedule" ? "근무표" : mode === "status" ? "현재 근무 상황" : "출근/퇴근 기록";
  const meta = mode === "schedule" ? "월별 근무일정" : "API 근태 기록";

  return (
    <Panel id="people-attendance-records" className="people-panel attendance-workspace" title={title} meta={meta}>
      <div className="people-panel-kicker">
        <Clock3 size={15} />
        실제 HRX 근태 기록과 월별 집계를 확인합니다
      </div>

      <div className="attendance-toolbar">
        <label>
          <span>월</span>
          <input type="month" value={month} onChange={(event: any) => setMonth(event.target.value)} data-upl-d04-month-input="true" />
        </label>
        <button type="button" className="secondary-button" onClick={() => setLocalRefresh((value: number) => value + 1)}>
          <RefreshCw size={15} />
          새로고침
        </button>
      </div>

      <div className="leave-balance-strip attendance-summary-strip" data-upl-d04-summary="true">
        <div className="leave-balance-item">
          <strong>{numberValue(summary?.effective_record_count).toLocaleString("ko-KR")}</strong>
          <span>유효 기록</span>
        </div>
        <div className="leave-balance-item">
          <strong>{formatHours(summary?.total_recorded_hours)}</strong>
          <span>기록 시간</span>
        </div>
        <div className="leave-balance-item">
          <strong>{numberValue((summary?.by_status as HrxRecord | undefined)?.present).toLocaleString("ko-KR")}</strong>
          <span>출근</span>
        </div>
        <div className="leave-balance-item">
          <strong>{numberValue((summary?.by_status as HrxRecord | undefined)?.remote).toLocaleString("ko-KR")}</strong>
          <span>원격</span>
        </div>
        <div className="leave-balance-item">
          <strong>{numberValue((summary?.by_status as HrxRecord | undefined)?.leave).toLocaleString("ko-KR")}</strong>
          <span>휴가</span>
        </div>
        <div className="leave-balance-item">
          <strong>{numberValue(summary?.correction_count).toLocaleString("ko-KR")}</strong>
          <span>보정</span>
        </div>
      </div>

      <form className="attendance-record-form" onSubmit={handleSubmit} data-upl-d04-attendance-form="true">
        <label>
          <span>구성원 ID</span>
          <input value={form.employee_id} onChange={(event: any) => setForm({ ...form, employee_id: event.target.value })} data-upl-d04-employee-input="true" />
        </label>
        <label>
          <span>근무일</span>
          <input type="date" value={form.work_date} onChange={(event: any) => setForm({ ...form, work_date: event.target.value })} data-upl-d04-work-date-input="true" />
        </label>
        <label>
          <span>상태</span>
          <select value={form.status} onChange={(event: any) => setForm({ ...form, status: event.target.value })} data-upl-d04-status-select="true">
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </label>
        <label>
          <span>시간</span>
          <input type="number" min="0" step="0.5" value={form.recorded_hours} onChange={(event: any) => setForm({ ...form, recorded_hours: event.target.value })} data-upl-d04-hours-input="true" />
        </label>
        <label>
          <span>출근</span>
          <input type="time" value={form.clock_in} onChange={(event: any) => setForm({ ...form, clock_in: event.target.value })} />
        </label>
        <label>
          <span>퇴근</span>
          <input type="time" value={form.clock_out} onChange={(event: any) => setForm({ ...form, clock_out: event.target.value })} />
        </label>
        <button className="primary-button" disabled={!canSubmit || submitting} data-upl-d04-submit="true">
          {submitting ? "저장 중" : "기록 저장"}
        </button>
      </form>

      {result === null && <div className="live-data-state live-data-loading">근태 기록을 불러오는 중입니다</div>}
      {result?.kind === "error" && <div className="live-data-state live-data-error">근태 기록을 불러오지 못했습니다.</div>}
      {result?.kind === "guarded" && <div className="live-data-state live-data-review">근태 기록 접근 상태를 확인해야 합니다.</div>}

      {(result?.kind === "data" || result?.kind === "guarded") && (
        <div className="attendance-work-grid">
          <div className="attendance-calendar" data-upl-d06-schedule-calendar="true">
            <div className="attendance-calendar-head">
              <CalendarDays size={15} />
              <strong>{month} 근무표</strong>
            </div>
            <div className="attendance-calendar-grid">
              {calendarDays.map((day) => {
                const primary = day.records[0];
                return (
                  <div key={day.date} className="attendance-day" data-attendance-status={stringValue(primary?.status, "empty")}>
                    <strong>{day.day}</strong>
                    <span>{primary ? statusLabel(primary.status) : "기록 없음"}</span>
                    <small>{primary ? formatHours(primary.recorded_hours) : "-"}</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="attendance-risk-panel" data-upl-d06-risk-panel="true">
            <div className="attendance-calendar-head">
              <AlertTriangle size={15} />
              <strong>초과근로 점검</strong>
            </div>
            {!selectedEmployee && <div className="live-data-state live-data-empty">구성원을 선택하거나 ID를 입력하세요.</div>}
            {selectedEmployee && riskResult === null && <div className="live-data-state live-data-loading">점검 중입니다</div>}
            {selectedEmployee && riskResult?.kind === "error" && <div className="live-data-state live-data-empty">표시할 초과근로 경고가 없습니다.</div>}
            {selectedEmployee && riskEvents.length === 0 && riskResult?.kind === "data" && <div className="live-data-state live-data-empty">초과근로 경고가 없습니다.</div>}
            {riskEvents.length > 0 && (
              <DataTable columns={["유형", "기준일", "강도", "초과", "기록"]} rows={riskEvents} />
            )}
          </div>
        </div>
      )}

      {(result?.kind === "data" || result?.kind === "guarded") && (
        <DataTable
          columns={["기록 ID", "구성원", "근무일", "상태", "시간", "출근/퇴근", "출처", "보정 대상"]}
          rows={attendanceRows(records)}
        />
      )}
    </Panel>
  );
}
