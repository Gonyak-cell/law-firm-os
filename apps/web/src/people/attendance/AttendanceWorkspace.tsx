import React from "react";
import { useEffect, useState } from "react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import {
  approveHrxPayrollAttendance,
  createHrxAttendanceRecord,
  createHrxOvertimeRequest,
  decideHrxAttendanceCorrection,
  decideHrxOvertimeRequest,
  fetchHrxAttendance,
  fetchHrxAttendanceCorrectionRequests,
  fetchHrxOvertime,
  fetchHrxOvertimeRisk,
  requestHrxAttendanceCorrection
} from "../hrxApiClient.ts";
import { readPeopleWebFeatureFlags } from "../peopleFeatureFlags.ts";

type HrxRecord = Record<string, unknown>;
type AttendanceResult = {
  kind: string;
  attendance?: HrxRecord[];
  uiState?: unknown;
  self_employee_id?: unknown;
};
type AttendanceCorrectionRequest = {
  correction_request_id: string;
  attendance_id: string;
  employee_id: string;
  reason?: string;
  evidence_ref?: string | null;
  state?: string;
  state_version?: number;
  requested_at?: string;
  reviewed_by_actor_id?: string | null;
  review_reason?: string | null;
  approved_attendance_id?: string | null;
};
type CorrectionResult = {
  kind: "data" | "error";
  correctionRequests: AttendanceCorrectionRequest[];
};
type AttendanceForm = {
  clock_in: string;
  clock_out: string;
};
type AttendanceView = "self" | "team" | "corrections" | "overtime";
type OvertimeResult = {
  kind: string;
  overtime?: HrxRecord[];
  risk_report?: HrxRecord | null;
  uiState?: unknown;
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

function effectiveAttendanceRecords(records: HrxRecord[]) {
  const correctedIds = new Set(
    records
      .map((record) => stringValue(record.correction_of_attendance_id))
      .filter(Boolean)
  );
  return records.filter((record) => !correctedIds.has(stringValue(record.attendance_id)));
}

function inputTime(value: unknown) {
  const date = new Date(stringValue(value));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

function correctionStateLabel(value?: string) {
  if (value === "approved") return "승인";
  if (value === "rejected") return "반려";
  return "승인 대기";
}

function correctionErrorLabel(reason: unknown) {
  if (reason === "HRX_ATTENDANCE_CORRECTION_SELF_APPROVAL_BLOCKED") return "본인이 요청한 정정은 직접 승인할 수 없습니다.";
  if (reason === "HRX_ATTENDANCE_CORRECTION_VERSION_CONFLICT") return "다른 사용자가 먼저 처리했습니다. 최신 상태를 다시 불러오세요.";
  if (reason === "HRX_ATTENDANCE_CORRECTION_SOURCE_STALE") return "원본 기록이 달라져 새로 요청해야 합니다.";
  return "출퇴근 정정 업무를 처리하지 못했습니다.";
}

function minuteLabel(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return "0분";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}분`;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function overtimeStateLabel(value: unknown) {
  return ({
    submitted: "승인 대기",
    approved: "승인",
    rejected: "반려",
    cancelled: "취소",
    exported: "급여 반영",
  } as Record<string, string>)[String(value ?? "")] ?? "확인 필요";
}

function overtimeErrorLabel(reason: unknown) {
  if (reason === "HRX_OVERTIME_SELF_APPROVAL") return "본인이 신청한 초과근로는 직접 승인할 수 없습니다.";
  if (["HRX_AUTHZ_DENIED", "HRX_PERMISSION_DENIED", "HRX_OVERTIME_SCOPE_DENIED", "HRX_OVERTIME_REVIEW_DENIED"].includes(String(reason ?? ""))) {
    return "초과근로를 처리할 권한이 없습니다.";
  }
  return "초과근로를 처리하지 못했습니다.";
}

export function AttendanceWorkspace({
  employeeId,
  refreshKey,
  canApproveOvertime = false
}: {
  employeeId?: string | null;
  refreshKey?: number;
  canApproveOvertime?: boolean;
}) {
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [form, setForm] = useState<AttendanceForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);
  const [correctionAttendanceId, setCorrectionAttendanceId] = useState("");
  const [correctionClockIn, setCorrectionClockIn] = useState("");
  const [correctionClockOut, setCorrectionClockOut] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionEvidenceRef, setCorrectionEvidenceRef] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<AttendanceView>("team");
  const [selfEmployeeId, setSelfEmployeeId] = useState("");
  const [payrollApprovedAttendanceIds, setPayrollApprovedAttendanceIds] = useState<string[]>([]);
  const [overtimeResult, setOvertimeResult] = useState<OvertimeResult | null>(null);
  const [overtimeWorkDate, setOvertimeWorkDate] = useState(currentDateKey());
  const [overtimeHours, setOvertimeHours] = useState("1");
  const [overtimeReason, setOvertimeReason] = useState("");
  const [overtimeSegment, setOvertimeSegment] = useState("overtime");
  const [overtimeReviewReason, setOvertimeReviewReason] = useState("");
  const [overtimeApprovedHours, setOvertimeApprovedHours] = useState("1");
  const [overtimeBusy, setOvertimeBusy] = useState("");
  const [overtimeFeedback, setOvertimeFeedback] = useState<string | null>(null);
  const featureFlags = readPeopleWebFeatureFlags();
  const correctionWorkflowEnabled = featureFlags.attendance_correction_workflow;
  const payrollHandoffEnabled = featureFlags.payroll_handoff;
  const workDate = currentDateKey();
  const month = workDate.slice(0, 7);
  const records = result?.kind === "data" || result?.kind === "guarded" ? result.attendance ?? [] : [];
  const effectiveRecords = effectiveAttendanceRecords(records);
  const correctionRequests = correctionResult?.kind === "data" ? correctionResult.correctionRequests : [];
  const teamEmployee = stringValue(employeeId);
  const selectedEmployee = payrollHandoffEnabled && activeView === "self"
    ? selfEmployeeId
    : teamEmployee;
  const attendanceSubmitEmployee = payrollHandoffEnabled ? selfEmployeeId : teamEmployee;
  const overtimeReadEmployee = canApproveOvertime ? teamEmployee : selfEmployeeId;
  const overtimeSubmitEmployee = selfEmployeeId;
  const showAttendance = !payrollHandoffEnabled || activeView === "self" || activeView === "team";
  const showCorrections = correctionWorkflowEnabled
    && (!payrollHandoffEnabled || activeView === "corrections");
  const showOvertime = payrollHandoffEnabled && activeView === "overtime";
  const overtimeRecords = overtimeResult?.kind === "data" || overtimeResult?.kind === "guarded"
    ? overtimeResult.overtime ?? []
    : [];
  const bothTimesEntered = Boolean(form.clock_in && form.clock_out);
  const chronological = !bothTimesEntered || form.clock_out > form.clock_in;
  const canSubmit = Boolean(attendanceSubmitEmployee && bothTimesEntered && chronological);

  useEffect(() => {
    setFeedback(null);
    setCorrectionFeedback(null);
    setCorrectionAttendanceId("");
    setOvertimeFeedback(null);
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedEmployee) {
      setResult({ kind: "data", attendance: [] });
      return () => {
        cancelled = true;
      };
    }
    setResult(null);
    fetchHrxAttendance({
      month,
      employee_id: selectedEmployee
    }).then((next) => {
      if (cancelled) return;
      setResult(next);
      const linkedEmployeeId = stringValue(next.self_employee_id);
      if (linkedEmployeeId) setSelfEmployeeId(linkedEmployeeId);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedEmployee, month, refreshKey, localRefresh]);

  useEffect(() => {
    let cancelled = false;
    if (!correctionWorkflowEnabled || !teamEmployee) {
      setCorrectionResult({ kind: "data", correctionRequests: [] });
      return () => {
        cancelled = true;
      };
    }
    setCorrectionResult(null);
    fetchHrxAttendanceCorrectionRequests(teamEmployee).then((next) => {
      if (cancelled) return;
      if (next.kind === "data") {
        setCorrectionResult({
          kind: "data",
          correctionRequests: next.correctionRequests as AttendanceCorrectionRequest[]
        });
      } else {
        setCorrectionResult({ kind: "error", correctionRequests: [] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [correctionWorkflowEnabled, teamEmployee, localRefresh, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    if (!showOvertime || !overtimeReadEmployee) {
      setOvertimeResult({ kind: "data", overtime: [], risk_report: null });
      return () => {
        cancelled = true;
      };
    }
    setOvertimeResult(null);
    Promise.all([
      fetchHrxOvertime({ employee_id: overtimeReadEmployee, month }),
      fetchHrxOvertimeRisk({ employee_id: overtimeReadEmployee, month }),
    ]).then(([requests, risks]) => {
      if (cancelled) return;
      if (requests.kind === "guarded") {
        setOvertimeResult({ kind: "guarded", overtime: [], uiState: requests.uiState });
        return;
      }
      if (requests.kind !== "data") {
        setOvertimeResult({ kind: "error", overtime: [] });
        return;
      }
      setOvertimeResult({
        kind: "data",
        overtime: requests.overtime as HrxRecord[],
        risk_report: risks.kind === "data" ? risks.risk_report as HrxRecord : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [showOvertime, overtimeReadEmployee, month, refreshKey, localRefresh]);

  useEffect(() => {
    if (!correctionWorkflowEnabled || effectiveRecords.length === 0) return;
    const selected = effectiveRecords.find(
      (record) => stringValue(record.attendance_id) === correctionAttendanceId
    ) ?? effectiveRecords[effectiveRecords.length - 1];
    if (!selected) return;
    const selectedId = stringValue(selected.attendance_id);
    if (selectedId !== correctionAttendanceId) setCorrectionAttendanceId(selectedId);
    setCorrectionClockIn(inputTime(selected.clock_in_at));
    setCorrectionClockOut(inputTime(selected.clock_out_at));
  }, [correctionWorkflowEnabled, result, correctionAttendanceId]);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    const suffix = `${Date.now()}`;
    const created = await createHrxAttendanceRecord({
      attendance_id: `att_ui_${suffix}`,
      employee_id: attendanceSubmitEmployee,
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

  function selectCorrectionAttendance(attendanceId: string) {
    setCorrectionAttendanceId(attendanceId);
    const selected = effectiveRecords.find(
      (record) => stringValue(record.attendance_id) === attendanceId
    );
    setCorrectionClockIn(inputTime(selected?.clock_in_at));
    setCorrectionClockOut(inputTime(selected?.clock_out_at));
    setCorrectionFeedback(null);
  }

  async function submitCorrectionRequest(event: { preventDefault(): void }) {
    event.preventDefault();
    const selected = effectiveRecords.find(
      (record) => stringValue(record.attendance_id) === correctionAttendanceId
    );
    const workDate = stringValue(selected?.work_date);
    const sourceVersion = stringValue(selected?.source_version);
    if (
      !selected ||
      !workDate ||
      !sourceVersion ||
      !correctionReason.trim() ||
      !correctionClockIn ||
      !correctionClockOut ||
      correctionClockOut <= correctionClockIn ||
      correctionSubmitting
    ) return;
    setCorrectionSubmitting(true);
    setCorrectionFeedback(null);
    const suffix = Date.now();
    const requested = await requestHrxAttendanceCorrection(correctionAttendanceId, {
      correction_request_id: `attendance-correction:${suffix}`,
      expected_source_version: sourceVersion,
      reason: correctionReason.trim(),
      ...(correctionEvidenceRef.trim() ? { evidence_ref: correctionEvidenceRef.trim() } : {}),
      requested_changes: {
        clock_in_at: timeToRecord(workDate, correctionClockIn),
        clock_out_at: timeToRecord(workDate, correctionClockOut)
      }
    });
    setCorrectionSubmitting(false);
    if (requested.kind === "data") {
      setCorrectionReason("");
      setCorrectionEvidenceRef("");
      setCorrectionFeedback("정정 요청을 보냈습니다. 승인 전까지 원래 기록이 유지됩니다.");
      setLocalRefresh((value) => value + 1);
    } else {
      setCorrectionFeedback(correctionErrorLabel(requested.reason));
    }
  }

  async function reviewCorrection(request: AttendanceCorrectionRequest, decision: "approve" | "reject") {
    if (!reviewReason.trim() || correctionSubmitting) return;
    setCorrectionSubmitting(true);
    setCorrectionFeedback(null);
    const reviewed = await decideHrxAttendanceCorrection(
      request.correction_request_id,
      decision,
      {
        expected_state_version: request.state_version,
        review_reason: reviewReason.trim()
      }
    );
    setCorrectionSubmitting(false);
    if (reviewed.kind === "data") {
      setReviewReason("");
      setCorrectionFeedback(
        decision === "approve"
          ? "정정을 승인해 새 기록에 반영했습니다."
          : "정정 요청을 반려했습니다."
      );
      setLocalRefresh((value) => value + 1);
    } else {
      setCorrectionFeedback(correctionErrorLabel(reviewed.reason));
    }
  }

  async function approveAttendanceForPayroll(record: HrxRecord) {
    const attendanceId = stringValue(record.attendance_id);
    if (!attendanceId || overtimeBusy) return;
    setOvertimeBusy(`attendance:${attendanceId}`);
    setOvertimeFeedback(null);
    const approved = await approveHrxPayrollAttendance({
      attendance_id: attendanceId,
      idempotency_key: `attendance-payroll:${attendanceId}:${stringValue(record.source_version, stringValue(record.source_ref))}`,
    });
    setOvertimeBusy("");
    if (approved.kind === "data") {
      setPayrollApprovedAttendanceIds((current) => [...new Set([...current, attendanceId])]);
      setOvertimeFeedback("선택한 출퇴근기록을 급여 입력 대상으로 확인했습니다.");
    } else {
      setOvertimeFeedback(overtimeErrorLabel(approved.reason));
    }
  }

  async function submitOvertime(event: { preventDefault(): void }) {
    event.preventDefault();
    const requestedMinutes = Math.round(Number(overtimeHours) * 60);
    if (!overtimeSubmitEmployee || !Number.isSafeInteger(requestedMinutes) || requestedMinutes <= 0 || !overtimeReason.trim() || overtimeBusy) return;
    setOvertimeBusy("submit");
    setOvertimeFeedback(null);
    const submitted = await createHrxOvertimeRequest({
      overtime_id: `overtime-ui:${Date.now()}`,
      employee_id: overtimeSubmitEmployee,
      work_date: overtimeWorkDate,
      requested_minutes: requestedMinutes,
      reason: overtimeReason.trim(),
      payroll_segment_kind: overtimeSegment,
      source_ref: `UI:overtime:${overtimeSubmitEmployee}:${overtimeWorkDate}:${Date.now()}`,
    });
    setOvertimeBusy("");
    if (submitted.kind === "data") {
      setOvertimeReason("");
      setOvertimeFeedback("내 초과근로 승인 요청을 보냈습니다.");
      setLocalRefresh((value) => value + 1);
    } else {
      setOvertimeFeedback(overtimeErrorLabel(submitted.reason));
    }
  }

  async function reviewOvertime(request: HrxRecord, decision: "approve" | "reject") {
    const overtimeId = stringValue(request.overtime_id);
    const approvedMinutes = Math.round(Number(overtimeApprovedHours) * 60);
    if (
      !overtimeId
      || !overtimeReviewReason.trim()
      || (decision === "approve" && (!Number.isSafeInteger(approvedMinutes) || approvedMinutes <= 0))
      || overtimeBusy
    ) return;
    setOvertimeBusy(`${decision}:${overtimeId}`);
    setOvertimeFeedback(null);
    const reviewed = await decideHrxOvertimeRequest(overtimeId, decision, {
      ...(decision === "approve" ? { approved_minutes: approvedMinutes } : {}),
      decision_reason: overtimeReviewReason.trim(),
    });
    setOvertimeBusy("");
    if (reviewed.kind === "data") {
      setOvertimeReviewReason("");
      setOvertimeFeedback(decision === "approve" ? "초과근로를 승인했습니다." : "초과근로를 반려했습니다.");
      setLocalRefresh((value) => value + 1);
    } else {
      setOvertimeFeedback(overtimeErrorLabel(reviewed.reason));
    }
  }

  function moveAttendanceTab(
    event: { key: string; preventDefault(): void; currentTarget: HTMLButtonElement },
    index: number,
    views: AttendanceView[],
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? views.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + views.length) % views.length;
    setActiveView(views[nextIndex]);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  }

  const attendanceViews = ([
    ["self", "내 기록"],
    ["team", "팀 기록"],
    ...(correctionWorkflowEnabled ? [["corrections", "정정 요청"]] : []),
    ["overtime", "초과근로"],
  ] as [AttendanceView, string][]);

  return (
    <Panel id="people-attendance-records" className="people-panel attendance-workspace" title="출근/퇴근 기록">
      {payrollHandoffEnabled && (
        <div className="attendance-workspace-tabs" role="tablist" aria-label="출퇴근기록 보기">
          {attendanceViews.map(([view, label], index) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={activeView === view}
              tabIndex={activeView === view ? 0 : -1}
              onClick={() => setActiveView(view)}
              onKeyDown={(event) => moveAttendanceTab(event, index, attendanceViews.map(([value]) => value))}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showAttendance && (
        <div role={payrollHandoffEnabled ? "tabpanel" : undefined} className="attendance-records-view">
          {(!payrollHandoffEnabled || activeView === "self") && (
            <>
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
              {!attendanceSubmitEmployee && (
                <div className="live-data-state live-data-empty">내 구성원 계정 연결을 확인할 수 없어 기록할 수 없습니다.</div>
              )}
            </>
          )}

          {!selectedEmployee && (
            <div className="live-data-state live-data-empty">
              {activeView === "self" ? "내 구성원 계정 연결을 확인할 수 없습니다." : "왼쪽에서 구성원을 선택하세요."}
            </div>
          )}
          {bothTimesEntered && !chronological && <div className="live-data-state live-data-error" role="alert">퇴근시간은 출근시간보다 늦어야 합니다.</div>}
          {feedback === "saved" && <div className="live-data-state live-data-success" role="status">출근시간과 퇴근시간을 저장했습니다.</div>}
          {feedback === "error" && <div className="live-data-state live-data-error" role="alert">출퇴근 기록을 저장하지 못했습니다.</div>}
          {selectedEmployee && result === null && <div className="live-data-state live-data-loading">출퇴근 기록을 불러오는 중입니다</div>}
          {result?.kind === "error" && <div className="live-data-state live-data-error">출퇴근 기록을 불러오지 못했습니다.</div>}
          {result?.kind === "guarded" && (
            <div className="live-data-state live-data-review">
              {result.uiState === "denied" ? "출퇴근 기록을 볼 권한이 없습니다." : "출퇴근 기록 접근 상태를 확인해야 합니다."}
            </div>
          )}
          {(result?.kind === "data" || result?.kind === "guarded") && records.length === 0 && selectedEmployee && (
            <div className="live-data-state live-data-empty">저장된 출퇴근 기록이 없습니다.</div>
          )}
          {(result?.kind === "data" || result?.kind === "guarded") && records.length > 0 && (
            <div className="attendance-history" data-attendance-history="true">
              <strong>기록 내역</strong>
              <DataTable columns={["근무일", "출근시간", "퇴근시간"]} rows={attendanceRows(records)} />
              {payrollHandoffEnabled && activeView === "team" && (
                <div className="attendance-payroll-handoff" aria-label="급여 입력 확인">
                  {effectiveRecords.map((record) => {
                    const attendanceId = stringValue(record.attendance_id);
                    const approved = payrollApprovedAttendanceIds.includes(attendanceId);
                    return (
                      <div key={attendanceId}>
                        <span>{formatWorkDate(record.work_date)} 기록</span>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={approved || overtimeBusy === `attendance:${attendanceId}`}
                          onClick={() => void approveAttendanceForPayroll(record)}
                        >
                          {approved ? "급여 입력 확인됨" : "급여 반영 확인"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {payrollHandoffEnabled && activeView === "team" && overtimeFeedback && (
                <div className="live-data-state live-data-success" role="status">{overtimeFeedback}</div>
              )}
            </div>
          )}
        </div>
      )}
      {showCorrections && teamEmployee && (
        <section className="attendance-correction-workflow" aria-label="출퇴근 정정">
          <div className="attendance-correction-head">
            <div>
              <strong>출퇴근 정정</strong>
              <span>원래 기록은 보관하며, 다른 담당자가 승인한 뒤 새 기록이 반영됩니다.</span>
            </div>
            <em>승인 대기 {correctionRequests.filter((request) => request.state === "pending").length}건</em>
          </div>
          {effectiveRecords.length > 0 && (
            <form className="attendance-correction-form" onSubmit={submitCorrectionRequest}>
              <label>
                <span>정정할 기록</span>
                <select
                  value={correctionAttendanceId}
                  onChange={(event) => selectCorrectionAttendance(event.target.value)}
                >
                  {effectiveRecords.map((record) => (
                    <option key={stringValue(record.attendance_id)} value={stringValue(record.attendance_id)}>
                      {formatWorkDate(record.work_date)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>출근시간</span>
                <input type="time" value={correctionClockIn} onChange={(event) => setCorrectionClockIn(event.target.value)} />
              </label>
              <label>
                <span>퇴근시간</span>
                <input type="time" value={correctionClockOut} onChange={(event) => setCorrectionClockOut(event.target.value)} />
              </label>
              <label className="attendance-correction-reason">
                <span>정정 사유</span>
                <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="잘못 기록된 내용을 적어주세요" />
              </label>
              <label>
                <span>확인 자료</span>
                <input value={correctionEvidenceRef} onChange={(event) => setCorrectionEvidenceRef(event.target.value)} placeholder="문서 참조(선택)" />
              </label>
              <button
                className="secondary-button"
                disabled={
                  correctionSubmitting ||
                  !correctionReason.trim() ||
                  !correctionClockIn ||
                  !correctionClockOut ||
                  correctionClockOut <= correctionClockIn
                }
              >
                정정 요청
              </button>
            </form>
          )}
          {correctionResult === null && <div className="live-data-state live-data-loading">정정 요청을 불러오는 중입니다</div>}
          {correctionResult?.kind === "error" && <div className="live-data-state live-data-error">정정 요청을 불러오지 못했습니다.</div>}
          {correctionFeedback && (
            <div className="live-data-state live-data-success" role="status">{correctionFeedback}</div>
          )}
          {correctionRequests.length > 0 && (
            <div className="attendance-correction-review">
              <label>
                <span>검토 의견</span>
                <input value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="승인 또는 반려 사유" />
              </label>
              <div className="attendance-correction-list">
                {correctionRequests.map((request) => (
                  <div className="approval-row attendance-correction-row" key={request.correction_request_id}>
                    <div>
                      <strong>{formatWorkDate(records.find((record) => stringValue(record.attendance_id) === request.attendance_id)?.work_date)}</strong>
                      <span>{request.reason || "정정 사유 확인"} / {request.evidence_ref ? "확인 자료 있음" : "확인 자료 없음"}</span>
                      {request.review_reason && <small>검토 의견: {request.review_reason}</small>}
                    </div>
                    <em>{correctionStateLabel(request.state)}</em>
                    {request.state === "pending" && (
                      <div className="attendance-correction-actions">
                        <button className="secondary-button" disabled={!reviewReason.trim() || correctionSubmitting} onClick={() => reviewCorrection(request, "reject")}>반려</button>
                        <button className="primary-button" disabled={!reviewReason.trim() || correctionSubmitting} onClick={() => reviewCorrection(request, "approve")}>승인</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {showOvertime && (
        <section className="attendance-overtime-workspace" aria-label="초과근로" role="tabpanel">
          {!overtimeReadEmployee && <div className="live-data-state live-data-empty">왼쪽에서 구성원을 선택하세요.</div>}
          {overtimeReadEmployee && (
            <>
              <div className="attendance-overtime-form-head">
                <strong>내 초과근로 신청</strong>
                <span>아래 신청서는 로그인한 본인의 기록으로 저장됩니다.</span>
              </div>
              <form className="attendance-overtime-form" onSubmit={submitOvertime}>
                <label>
                  <span>근무일</span>
                  <input type="date" value={overtimeWorkDate} onChange={(event) => setOvertimeWorkDate(event.target.value)} required />
                </label>
                <label>
                  <span>신청 시간</span>
                  <input type="number" min="0.5" step="0.5" value={overtimeHours} onChange={(event) => setOvertimeHours(event.target.value)} required />
                </label>
                <label>
                  <span>구분</span>
                  <select value={overtimeSegment} onChange={(event) => setOvertimeSegment(event.target.value)}>
                    <option value="overtime">연장근로</option>
                    <option value="night">야간근로</option>
                    <option value="holiday">휴일근로</option>
                  </select>
                </label>
                <label className="attendance-overtime-reason">
                  <span>신청 사유</span>
                  <input value={overtimeReason} onChange={(event) => setOvertimeReason(event.target.value)} placeholder="승인자가 확인할 사유" />
                </label>
                <button className="primary-button" disabled={!overtimeSubmitEmployee || !overtimeReason.trim() || overtimeBusy === "submit"}>
                  {overtimeBusy === "submit" ? "요청 중" : "승인 요청"}
                </button>
              </form>
              {!overtimeSubmitEmployee && (
                <div className="live-data-state live-data-empty">내 구성원 계정 연결을 확인할 수 없어 신청할 수 없습니다.</div>
              )}

              {canApproveOvertime && (
                <div className="attendance-overtime-review-controls" data-overtime-review-access="manager">
                  <label>
                    <span>승인 시간</span>
                    <input type="number" min="0.5" step="0.5" value={overtimeApprovedHours} onChange={(event) => setOvertimeApprovedHours(event.target.value)} />
                  </label>
                  <label>
                    <span>검토 의견</span>
                    <input value={overtimeReviewReason} onChange={(event) => setOvertimeReviewReason(event.target.value)} placeholder="승인 또는 반려 사유" />
                  </label>
                </div>
              )}

              {overtimeFeedback && <div className="live-data-state live-data-success" role="status">{overtimeFeedback}</div>}
              {overtimeResult === null && <div className="live-data-state live-data-loading">초과근로를 불러오는 중입니다</div>}
              {overtimeResult?.kind === "error" && <div className="live-data-state live-data-error">초과근로를 불러오지 못했습니다.</div>}
              {overtimeResult?.kind === "guarded" && (
                <div className="live-data-state live-data-review">
                  {overtimeResult.uiState === "denied" ? "초과근로를 볼 권한이 없습니다." : "초과근로 접근 상태를 확인해야 합니다."}
                </div>
              )}
              {overtimeResult?.kind === "data" && overtimeRecords.length === 0 && (
                <div className="live-data-state live-data-empty">신청된 초과근로가 없습니다.</div>
              )}
              {overtimeRecords.length > 0 && (
                <div className="data-table-wrap attendance-overtime-table-wrap">
                  <table className="data-table attendance-overtime-table">
                    <thead>
                      <tr>
                        <th>근무일</th>
                        <th>시스템 계산</th>
                        <th>신청</th>
                        <th>승인</th>
                        <th>상태</th>
                        {canApproveOvertime && <th aria-label="처리" />}
                      </tr>
                    </thead>
                    <tbody>
                      {overtimeRecords.map((request) => {
                        const overtimeId = stringValue(request.overtime_id);
                        const warnings = (() => {
                          try {
                            return JSON.parse(stringValue(request.warning_codes_json, "[]")) as string[];
                          } catch {
                            return [];
                          }
                        })();
                        return (
                          <tr key={overtimeId}>
                            <td>
                              <strong>{formatWorkDate(request.work_date)}</strong>
                              {warnings.length > 0 && <small>계산 시간보다 길어 확인이 필요합니다.</small>}
                            </td>
                            <td>{minuteLabel(request.calculated_minutes)}</td>
                            <td>{minuteLabel(request.requested_minutes)}</td>
                            <td>{minuteLabel(request.approved_minutes)}</td>
                            <td>{overtimeStateLabel(request.state)}</td>
                            {canApproveOvertime && (
                              <td>
                                {request.state === "submitted" && (
                                  <div className="attendance-overtime-actions">
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={!overtimeReviewReason.trim() || Boolean(overtimeBusy)}
                                      onClick={() => void reviewOvertime(request, "reject")}
                                    >
                                      반려
                                    </button>
                                    <button
                                      type="button"
                                      className="primary-button"
                                      disabled={!overtimeReviewReason.trim() || Boolean(overtimeBusy)}
                                      onClick={() => void reviewOvertime(request, "approve")}
                                    >
                                      승인
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {Array.isArray(overtimeResult?.risk_report?.events) && overtimeResult.risk_report.events.length > 0 && (
                <div className="attendance-overtime-warning" role="status">
                  주간 근로시간 또는 미승인 초과근로를 확인할 항목이 {overtimeResult.risk_report.events.length}건 있습니다.
                </div>
              )}
            </>
          )}
        </section>
      )}
    </Panel>
  );
}
