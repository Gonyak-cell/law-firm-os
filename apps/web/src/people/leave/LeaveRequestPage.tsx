import React, { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Send, Users } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  amendHrxLeaveSelfRequest,
  cancelHrxLeaveSelfRequest,
  fetchHrxActiveLeaveOptions,
  fetchHrxLeaveEvidenceDocuments,
  fetchHrxLeaveSelfState,
  fetchHrxLeaveTeamState,
  previewHrxLeaveRequest,
  provideHrxLeaveAdditionalInformation,
  respondHrxLeaveReschedule,
  submitHrxLeaveSelfRequest
} from "../hrxApiClient.ts";
import { safeEmployeeLabel, safePeopleLabel } from "../peoplePresentation.ts";

type Row = Record<string, unknown>;
type LeaveForm = {
  group_id: string;
  leave_type_id: string;
  policy_version_id: string;
  start_date: string;
  end_date: string;
  duration_mode: "full_day" | "half_day" | "quarter_day" | "hours";
  hours: string;
  handover_note: string;
  reason_text: string;
  document_id: string;
};

const emptyForm: LeaveForm = {
  group_id: "",
  leave_type_id: "",
  policy_version_id: "",
  start_date: "",
  end_date: "",
  duration_mode: "full_day",
  hours: "1",
  handover_note: "",
  reason_text: "",
  document_id: ""
};

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function employeeLabel(row: Row | null | undefined, field = "display_name") {
  return safeEmployeeLabel({
    employee_id: row?.employee_id,
    user_id: row?.user_id,
    display_name: row?.[field],
  });
}

function approverLabel(row: Row | null | undefined) {
  return safePeopleLabel(text(row, "display_name"), {
    identifiers: [row?.actor_id, row?.employee_id, row?.user_id],
    fallback: "지정 승인자",
  });
}

function rows(row: Row | null | undefined, field: string) {
  return Array.isArray(row?.[field]) ? row[field] as Row[] : [];
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function evidenceRule(row: Row | null | undefined) {
  const direct = row?.evidence_rule;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Row;
  try {
    return JSON.parse(text(row, "evidence_rule_json") || "{}") as Row;
  } catch {
    return {};
  }
}

function policyRules(row: Row | null | undefined) {
  const direct = row?.rules;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Row;
  try {
    return JSON.parse(text(row, "rules_json") || "{}") as Row;
  } catch {
    return {};
  }
}

const durationModes = [
  ["full_day", "종일"],
  ["half_day", "반일"],
  ["quarter_day", "1/4일"],
  ["hours", "시간"]
] as const;

function commandKey(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

function formatMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "확인 필요";
  if (minutes < 60) return `${minutes}분`;
  if (minutes % 60 === 0) return `${minutes / 60}시간`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function stateLabel(value: unknown) {
  if (value === "submitted") return "승인 대기";
  if (value === "reschedule_pending") return "시기변경 협의 중";
  if (value === "approved") return "승인";
  if (value === "rejected") return "반려";
  if (value === "cancelled") return "취소";
  if (value === "cancelled_after_approval") return "승인 후 취소";
  return "확인 필요";
}

function stateTone(value: unknown) {
  if (value === "approved") return "live";
  if (value === "rejected" || value === "cancelled" || value === "cancelled_after_approval") return "error";
  return "review";
}

function period(row: Row) {
  const start = text(row, "start_date");
  const end = text(row, "end_date");
  return start === end ? start : `${start} ~ ${end}`;
}

function safeError(value: unknown) {
  const code = typeof value === "string" ? value : "";
  if (code === "HRX_LEAVE_BALANCE_INSUFFICIENT") return "사용 가능한 휴가가 부족합니다.";
  if (code === "HRX_LEAVE_REQUEST_OVERLAP") return "같은 기간에 처리 중인 휴가가 있습니다.";
  if (code === "HRX_LEAVE_WORK_SCHEDULE_REQUIRED") return "근무일정이 배정되지 않아 신청할 수 없습니다.";
  if (code === "HRX_LEAVE_PARTIAL_DAY_SINGLE_DATE_REQUIRED") return "부분 휴가는 하루만 선택하세요.";
  if (code === "HRX_LEAVE_REASON_REQUIRED") return "선택한 휴가 유형은 사유 입력이 필요합니다.";
  if (code === "HRX_LEAVE_ATTACHMENT_REQUIRED") return "선택한 휴가 유형은 증빙 문서가 필요합니다.";
  if (code === "HRX_LEAVE_EVIDENCE_DOCUMENT_DENIED") return "본인에게 연결된 HR 문서만 증빙으로 사용할 수 있습니다.";
  return "휴가 요청을 처리하지 못했습니다. 입력값과 연결 상태를 확인하세요.";
}

export function LeaveRequestPage({ canViewTeam = false }: { canViewTeam?: boolean }) {
  const [state, setState] = useState<{ kind: string; balances: Row[]; requests: Row[] } | null>(null);
  const [options, setOptions] = useState<{ groups: Row[]; types: Row[]; policies: Row[] } | null>(null);
  const [evidenceDocuments, setEvidenceDocuments] = useState<Row[]>([]);
  const [team, setTeam] = useState<{ employees: Row[]; absences: Row[]; today_absence_count: number; pending_approval_count: number } | null>(null);
  const [form, setForm] = useState<LeaveForm>(emptyForm);
  const [preview, setPreview] = useState<Row | null>(null);
  const [editing, setEditing] = useState<{ request_id: string; start_date: string; end_date: string } | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<{ request_id: string; reason_text: string; handover_note: string; document_id: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [nextState, nextOptions, nextTeam, nextEvidenceDocuments] = await Promise.all([
      fetchHrxLeaveSelfState(),
      fetchHrxActiveLeaveOptions(),
      canViewTeam ? fetchHrxLeaveTeamState() : Promise.resolve(null),
      fetchHrxLeaveEvidenceDocuments()
    ]);
    if (nextState.kind !== "data" || nextOptions.kind !== "data") {
      setState({ kind: "error", balances: [], requests: [] });
      setOptions({ groups: [], types: [], policies: [] });
      setError("휴가 정보를 불러오지 못했습니다.");
      return;
    }
    setState({ kind: "data", balances: nextState.balances as Row[], requests: nextState.requests as Row[] });
    setOptions({ groups: nextOptions.groups as Row[], types: nextOptions.types as Row[], policies: nextOptions.policies as Row[] });
    setTeam(nextTeam?.kind === "data" ? {
      employees: nextTeam.employees as Row[],
      absences: nextTeam.absences as Row[],
      today_absence_count: Number(nextTeam.today_absence_count) || 0,
      pending_approval_count: Number(nextTeam.pending_approval_count) || 0
    } : null);
    setEvidenceDocuments(nextEvidenceDocuments.kind === "data" ? nextEvidenceDocuments.documents as Row[] : []);
    setForm((current) => {
      const groupId = current.group_id || text(nextOptions.groups[0] as Row, "group_id");
      const type = (nextOptions.types as Row[]).find((row) => text(row, "group_id") === groupId);
      const policy = (nextOptions.policies as Row[]).find((row) => text(row, "group_id") === groupId);
      return {
        ...current,
        group_id: groupId,
        leave_type_id: current.leave_type_id || text(type, "leave_type_id"),
        policy_version_id: current.policy_version_id || text(policy, "policy_version_id")
      };
    });
    setError("");
  }

  useEffect(() => {
    void load();
  }, [canViewTeam]);

  const availableTypes = useMemo(
    () => options?.types.filter((row) => text(row, "group_id") === form.group_id) ?? [],
    [options, form.group_id]
  );
  const availablePolicies = useMemo(
    () => options?.policies.filter((row) => text(row, "group_id") === form.group_id) ?? [],
    [options, form.group_id]
  );
  const selectedType = useMemo(
    () => availableTypes.find((row) => text(row, "leave_type_id") === form.leave_type_id) ?? null,
    [availableTypes, form.leave_type_id]
  );
  const selectedPolicy = useMemo(
    () => availablePolicies.find((row) => text(row, "policy_version_id") === form.policy_version_id) ?? null,
    [availablePolicies, form.policy_version_id]
  );
  const allowedDurationModes = useMemo(() => {
    const typeRules = policyRules(selectedPolicy).type_rules as Row | undefined;
    const configured = typeRules?.[form.leave_type_id] as Row | undefined;
    const modes = Array.isArray(configured?.usage_modes) ? configured.usage_modes : durationModes.map(([value]) => value);
    return durationModes.map(([value]) => value).filter((value) => modes.includes(value));
  }, [selectedPolicy, form.leave_type_id]);
  const selectedEvidenceRule = evidenceRule(selectedType);
  const reasonRequired = selectedEvidenceRule.reason_required === true && text(selectedType, "code") !== "ANNUAL";
  const attachmentRequired = selectedEvidenceRule.attachment_required === true;
  const selectedBalance = state?.balances.find((row) => text(row.group as Row, "group_id") === form.group_id) ?? state?.balances[0];
  const pendingCount = state?.requests.filter((request) => request.state === "submitted").length ?? 0;

  useEffect(() => {
    if (allowedDurationModes.length && !allowedDurationModes.includes(form.duration_mode)) {
      setPreview(null);
      setForm((current) => ({ ...current, duration_mode: allowedDurationModes[0] }));
    }
  }, [allowedDurationModes.join("|"), form.duration_mode]);

  function updateForm(patch: Partial<LeaveForm>) {
    setPreview(null);
    setForm((current) => {
      const next = { ...current, ...patch };
      if (patch.group_id !== undefined) {
        next.leave_type_id = text(options?.types.find((row) => text(row, "group_id") === patch.group_id), "leave_type_id");
        next.policy_version_id = text(options?.policies.find((row) => text(row, "group_id") === patch.group_id), "policy_version_id");
      }
      return next;
    });
  }

  function requestPayload() {
    return {
      leave_type_id: form.leave_type_id,
      policy_version_id: form.policy_version_id,
      start_date: form.start_date,
      end_date: form.end_date,
      duration_mode: form.duration_mode,
      handover_note: form.handover_note,
      reason_text: form.reason_text,
      document_ids: form.document_id ? [form.document_id] : [],
      ...(form.duration_mode === "hours" ? { requested_minutes: Math.round(Number(form.hours) * 60) } : {})
    };
  }

  async function handlePreview(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy("preview");
    setError("");
    const result = await previewHrxLeaveRequest(requestPayload());
    setBusy("");
    if (result.kind === "data") setPreview(result.preview as Row);
    else setError(safeError(result.reason));
  }

  async function handleSubmit() {
    if (!preview) return;
    setBusy("submit");
    setError("");
    const schedule = preview.schedule as Row;
    const result = await submitHrxLeaveSelfRequest({
      ...requestPayload(),
      request_id: commandKey("leave-request"),
      idempotency_key: commandKey("leave-submit"),
      requested_minutes: number(schedule, "requested_minutes")
    });
    setBusy("");
    if (result.kind === "data") {
      setForm((current) => ({ ...current, start_date: "", end_date: "", handover_note: "", reason_text: "", document_id: "" }));
      setPreview(null);
      await load();
    } else setError(safeError(result.reason));
  }

  async function runRequestAction(key: string, action: () => Promise<{ kind: string; reason?: unknown }>) {
    setBusy(key);
    setError("");
    const result = await action();
    setBusy("");
    if (result.kind === "data") {
      setEditing(null);
      setAdditionalInfo(null);
      await load();
    } else setError(safeError(result.reason));
  }

  const canPreview = Boolean(
    form.leave_type_id &&
    form.policy_version_id &&
    form.start_date &&
    form.end_date &&
    allowedDurationModes.includes(form.duration_mode) &&
    (form.duration_mode !== "hours" || Number(form.hours) > 0) &&
    (!reasonRequired || form.reason_text.trim()) &&
    (!attachmentRequired || form.document_id)
  );

  return (
    <Panel id="people-leave" className="people-panel span-2 leave-self-panel" title="휴가관리">
      {state === null && <div className="live-data-state live-data-loading">휴가 정보를 불러오는 중입니다</div>}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      {state?.kind === "data" && (
        <>
          <div className="leave-balance-strip" aria-label="휴가 요약">
            <div className="leave-balance-item"><strong>{formatMinutes(number(selectedBalance?.balance as Row, "available_minutes"))}</strong><span>사용 가능</span></div>
            <div className="leave-balance-item"><strong>{formatMinutes(number(selectedBalance?.balance as Row, "used_minutes"))}</strong><span>사용 완료</span></div>
            <div className="leave-balance-item"><strong>{pendingCount}건</strong><span>승인 대기</span></div>
            <div className="leave-balance-item"><strong>{text(selectedBalance, "earliest_expiry") || "없음"}</strong><span>가장 빠른 만료</span></div>
          </div>

          {canViewTeam && team && (
            <section className="leave-team-section" aria-labelledby="leave-team-title">
              <div className="leave-form-section-title"><Users size={15} /><strong id="leave-team-title">팀 휴가</strong></div>
              <div className="leave-team-metrics">
                <div><strong>{team.today_absence_count}명</strong><span>오늘 부재</span></div>
                <div><strong>{team.absences.length}건</strong><span>향후 7일</span></div>
                <div><strong>{team.pending_approval_count}건</strong><span>내 승인 대기</span></div>
              </div>
              <div className="leave-team-list">
                {team.absences.map((absence, index) => <div key={`${text(absence, "employee_id")}:${text(absence, "start_date")}:${index}`}><strong>{employeeLabel(absence, "employee_display_name")}</strong><span>{period(absence)}</span></div>)}
                {team.employees.map((employee) => {
                  const balance = rows(employee, "balances")[0];
                  return <div key={`balance:${text(employee, "employee_id")}`}><strong>{employeeLabel(employee)}</strong><span>사용 가능 {formatMinutes(number(balance, "available_minutes"))}</span></div>;
                })}
              </div>
            </section>
          )}

          <form className="leave-self-request-form" onSubmit={handlePreview}>
            <div className="leave-form-section-title"><Send size={15} /><strong>휴가 신청</strong></div>
            <div className="leave-request-form">
              <label><span>휴가 그룹</span><select required value={form.group_id} onChange={(event) => updateForm({ group_id: event.target.value })}>{options?.groups.map((group) => <option key={text(group, "group_id")} value={text(group, "group_id")}>{text(group, "display_name")}</option>)}</select></label>
              <label><span>휴가 유형</span><select required value={form.leave_type_id} onChange={(event) => updateForm({ leave_type_id: event.target.value })}>{availableTypes.map((type) => <option key={text(type, "leave_type_id")} value={text(type, "leave_type_id")}>{text(type, "display_name")}</option>)}</select></label>
              <label><span>시작일</span><input required type="date" value={form.start_date} onChange={(event) => updateForm({ start_date: event.target.value })} /></label>
              <label><span>종료일</span><input required type="date" value={form.end_date} onChange={(event) => updateForm({ end_date: event.target.value })} /></label>
              <label><span>사용 단위</span><select value={form.duration_mode} onChange={(event) => updateForm({ duration_mode: event.target.value as LeaveForm["duration_mode"] })}>{durationModes.filter(([value]) => allowedDurationModes.includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {form.duration_mode === "hours" && <label><span>시간</span><input required type="number" min="0.5" step="0.5" value={form.hours} onChange={(event) => updateForm({ hours: event.target.value })} /></label>}
              <label className="leave-request-wide"><span>대체 업무·인계 메모 <small>선택</small></span><textarea rows={2} maxLength={2000} value={form.handover_note} onChange={(event) => updateForm({ handover_note: event.target.value })} /></label>
              {reasonRequired && <label className="leave-request-wide"><span>신청 사유</span><textarea required rows={2} maxLength={2000} value={form.reason_text} onChange={(event) => updateForm({ reason_text: event.target.value })} /></label>}
              {attachmentRequired && <label className="leave-request-wide"><span>증빙 문서</span><select required value={form.document_id} onChange={(event) => updateForm({ document_id: event.target.value })}><option value="">본인 HR 문서 선택</option>{evidenceDocuments.map((document) => <option key={text(document, "document_id")} value={text(document, "document_id")}>{text(document, "title")} · {text(document, "document_type")}</option>)}</select></label>}
            </div>
            <div className="leave-form-actions">
              <button className="secondary-button" disabled={!canPreview || busy === "preview"}>{busy === "preview" ? "계산 중" : "차감 미리보기"}</button>
              <button className="primary-button" type="button" disabled={!preview || busy === "submit"} onClick={() => void handleSubmit()}>{busy === "submit" ? "신청 중" : "신청"}</button>
            </div>
          </form>

          {preview && (
            <div className="leave-preview-line" data-leave-preview="ready">
              <div><strong>{formatMinutes(number(preview.economics as Row, "deduction_minutes"))} 차감</strong><span>유급 {formatMinutes(number(preview.economics as Row, "paid_minutes"))} · 무급 {formatMinutes(number(preview.economics as Row, "unpaid_minutes"))} · 신청 후 {formatMinutes(number(preview, "available_after_minutes"))}</span></div>
              <div><strong>{approverLabel((preview.approval_plan as Row)?.approver as Row)}</strong><span>{number(preview.approval_plan as Row, "step_count")}단계 승인 · 제출 즉시 예약</span></div>
              <div><strong>{rows(preview.schedule as Row, "included_dates").length || rows(preview.schedule as Row, "segments").length}일 반영</strong><span>{rows(preview.schedule as Row, "non_working_dates").length ? `비근무일 ${rows(preview.schedule as Row, "non_working_dates").map((day) => text(day, "date")).join(", ")} 제외` : "선택 기간에 제외된 비근무일 없음"}</span></div>
              <div><strong>{rows(preview, "allocations").length}개 발생분 사용</strong><span>{rows(preview, "allocations").map((allocation) => `${text(allocation, "expires_on") || "만료 없음"} ${formatMinutes(number(allocation, "amount_minutes"))}`).join(" · ")}</span></div>
              <div className="leave-preview-periods"><strong>반영 시간</strong><span>{rows(preview.schedule as Row, "segments").map((segment) => `${text(segment, "date")} ${rows(segment, "leave_periods").map((period) => `${text(period, "start")}~${text(period, "end")}`).join(", ")}`).join(" · ")}</span></div>
            </div>
          )}

          <div className="leave-form-section-title"><RotateCcw size={15} /><strong>신청 내역</strong></div>
          {state.requests.length === 0 ? <div className="live-data-state live-data-empty">신청 내역 없음</div> : (
            <div className="leave-request-list">
              {state.requests.map((request, index) => {
                const requestId = text(request, "request_id");
                const pendingProposal = rows(request, "reschedule_proposals").find((proposal) => proposal.state === "proposed");
                const isEditing = editing?.request_id === requestId;
                const informationPending = Boolean(
                  text(request, "information_requested_at") &&
                  (!text(request, "information_provided_at") || text(request, "information_provided_at") < text(request, "information_requested_at"))
                );
                const informationDraft = additionalInfo?.request_id === requestId ? additionalInfo : null;
                return (
                  <article className="leave-request-row" key={requestId}>
                    <div><strong>{text(request, "leave_type_display_name") || "휴가"}</strong><span>{period(request)} · {formatMinutes(number(request, "requested_minutes"))}</span></div>
                    <span className="record-state-badge" data-state={stateTone(request.state)}>{stateLabel(request.state)}</span>
                    <div className="leave-request-actions">
                      {request.state === "submitted" && <button className="secondary-button" type="button" onClick={() => setEditing({ request_id: requestId, start_date: text(request, "start_date"), end_date: text(request, "end_date") })}><Pencil size={14} />날짜 변경</button>}
                      {["submitted", "reschedule_pending", "approved"].includes(text(request, "state")) && <button className="secondary-button" type="button" disabled={busy === `cancel:${requestId}`} onClick={() => void runRequestAction(`cancel:${requestId}`, () => cancelHrxLeaveSelfRequest(requestId, commandKey("leave-cancel")))}>{request.state === "approved" ? "승인 휴가 취소" : "신청 취소"}</button>}
                    </div>
                    {isEditing && <form className="leave-request-edit" onSubmit={(event) => { event.preventDefault(); void runRequestAction(`amend:${requestId}`, () => amendHrxLeaveSelfRequest(requestId, { idempotency_key: commandKey("leave-amend"), start_date: editing.start_date, end_date: editing.end_date })); }}><label><span>시작일</span><input type="date" required value={editing.start_date} onChange={(event) => setEditing({ ...editing, start_date: event.target.value })} /></label><label><span>종료일</span><input type="date" required value={editing.end_date} onChange={(event) => setEditing({ ...editing, end_date: event.target.value })} /></label><button className="primary-button">변경 저장</button><button className="secondary-button" type="button" onClick={() => setEditing(null)}>닫기</button></form>}
                    {informationPending && !informationDraft && <div className="leave-information-request"><div><strong>추가 자료 요청</strong><span>{text(request, "information_request_message")}</span></div><button className="secondary-button" type="button" onClick={() => setAdditionalInfo({ request_id: requestId, reason_text: text(request, "reason_text"), handover_note: text(request, "handover_note"), document_id: "" })}>자료 입력</button></div>}
                    {informationPending && informationDraft && <form className="leave-additional-information-form" onSubmit={(event) => { event.preventDefault(); void runRequestAction(`information:${requestId}`, () => provideHrxLeaveAdditionalInformation(requestId, { idempotency_key: commandKey("leave-information"), reason_text: informationDraft.reason_text, handover_note: informationDraft.handover_note, document_ids: informationDraft.document_id ? [informationDraft.document_id] : [] })); }}><strong>추가 자료 입력</strong><label><span>신청 사유</span><textarea rows={2} maxLength={2000} value={informationDraft.reason_text} onChange={(event) => setAdditionalInfo({ ...informationDraft, reason_text: event.target.value })} /></label><label><span>인계 메모</span><textarea rows={2} maxLength={2000} value={informationDraft.handover_note} onChange={(event) => setAdditionalInfo({ ...informationDraft, handover_note: event.target.value })} /></label><label><span>증빙 문서</span><select value={informationDraft.document_id} onChange={(event) => setAdditionalInfo({ ...informationDraft, document_id: event.target.value })}><option value="">추가 문서 없음</option>{evidenceDocuments.map((document) => <option key={text(document, "document_id")} value={text(document, "document_id")}>{text(document, "title")} · {text(document, "document_type")}</option>)}</select></label><div className="approval-actions"><button className="secondary-button" type="button" onClick={() => setAdditionalInfo(null)}>닫기</button><button className="primary-button" disabled={Boolean(busy)}>자료 보내기</button></div></form>}
                    {pendingProposal && <div className="leave-reschedule-proposal"><div><strong>시기변경 제안</strong><span>{text(pendingProposal, "proposed_start_date")} ~ {text(pendingProposal, "proposed_end_date")}</span><small>{text(pendingProposal, "legal_reason")}</small></div><div className="approval-actions"><button className="secondary-button" type="button" onClick={() => void runRequestAction(`decline:${requestId}`, () => respondHrxLeaveReschedule(requestId, { idempotency_key: commandKey("reschedule-response"), proposal_id: text(pendingProposal, "proposal_id"), decision: "decline" }))}>원래 일정 유지</button><button className="primary-button" type="button" onClick={() => void runRequestAction(`accept:${requestId}`, () => respondHrxLeaveReschedule(requestId, { idempotency_key: commandKey("reschedule-response"), proposal_id: text(pendingProposal, "proposal_id"), decision: "accept" }))}>제안 수락</button></div></div>}
                    <span className="leave-request-index">신청 {state.requests.length - index}</span>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
