import React, { useEffect, useMemo, useState } from "react";
import { CalendarSync, Download, FileUp, Pencil, Plus, RefreshCw } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  approveHrxLeaveManualAdjustment,
  approveHrxLeaveOccurrenceUpload,
  cancelHrxScheduledLeaveEntitlement,
  executeHrxLeaveManualAdjustment,
  executeHrxLeaveOccurrenceUpload,
  exportHrxLeaveOccurrences,
  fetchHrxLeaveConfiguration,
  fetchHrxLeaveIntegrations,
  fetchHrxLeaveManualAdjustmentSupport,
  fetchHrxLeaveOccurrenceProjections,
  fetchHrxLeaveOccurrenceTemplate,
  previewHrxLeaveManualAdjustment,
  previewHrxLeaveOccurrenceUpload,
  processHrxLeaveIntegrations,
  retryHrxLeaveIntegrationDeadLetter,
  retryHrxLeaveOccurrenceUpload,
  updateHrxScheduledLeaveEntitlement
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;
type OccurrenceView = "list" | "month" | "type";
type Stage = "" | "manual" | "upload" | "edit";
type StepUpAction = "" | "manual-approve" | "manual-execute" | "upload-approve" | "upload-execute" | "upload-retry" | "edit" | "cancel";

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function offsetDate(value: string, years: number, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function minutes(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const days = Math.floor(absolute / 480);
  const remainder = absolute % 480;
  if (days && remainder) return `${sign}${days}일 ${remainder}분`;
  if (days) return `${sign}${days}일`;
  return `${sign}${remainder}분`;
}

function downloadArtifact(artifact: Row) {
  const binary = window.atob(text(artifact, "content_base64"));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: text(artifact, "mime_type") }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = text(artifact, "file_name");
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STATE_LABELS: Record<string, string> = {
  scheduled: "예정",
  active: "활성",
  expired: "만료",
  cancelled: "취소"
};

const PROVIDER_LABELS: Record<string, string> = {
  schedule: "일정",
  attendance: "출퇴근",
  payroll: "급여",
  notification: "알림"
};

function eventLabel(value: string) {
  if (value === "leave.request.approved") return "승인 휴가 반영";
  if (value === "leave.request.cancelled_after_approval") return "승인 휴가 취소 반영";
  if (value === "leave.termination.payroll_reconciliation_requested") return "퇴사 정산 급여 인계";
  if (value.includes("promotion")) return "연차 사용 촉진";
  if (value.includes("reschedule")) return "시기변경 안내";
  if (value.includes("submitted")) return "휴가 신청 안내";
  return "휴가 상태 안내";
}

const initialManualForm = () => {
  const tomorrow = offsetDate(localDate(), 0, 1);
  return {
    employee_id: "",
    group_id: "",
    policy_version_id: "",
    direction: "credit",
    amount_minutes: "480",
    occurred_on: tomorrow,
    expires_on: offsetDate(tomorrow, 1, -1),
    reason: "",
    source_document_id: ""
  };
};

export function LeaveUsagePage({ canExport = false, canProcessIntegrations = false, canAdjust = false }: { canExport?: boolean; canProcessIntegrations?: boolean; canAdjust?: boolean }) {
  const today = localDate();
  const [filters, setFilters] = useState({ from: `${today.slice(0, 4)}-01-01`, to: offsetDate(today, 1, 0), as_of: today, employee_id: "", group_id: "", state: "" });
  const [view, setView] = useState<OccurrenceView>("list");
  const [projections, setProjections] = useState<Row | null>(null);
  const [integration, setIntegration] = useState<Row | null>(null);
  const [groups, setGroups] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<Row[]>([]);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [stage, setStage] = useState<Stage>("");
  const [manualForm, setManualForm] = useState(initialManualForm);
  const [manualPreview, setManualPreview] = useState<Row | null>(null);
  const [manualPayload, setManualPayload] = useState<Row | null>(null);
  const [manualResult, setManualResult] = useState<Row | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [uploadFile, setUploadFile] = useState({ file_name: "", csv_text: "", xlsx_content_base64: "" });
  const [uploadBatch, setUploadBatch] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ entitlement_id: "", expected_version: 0, valid_from: "", expires_on: "", reason_code: "관리자 취소" });
  const [stepUpAction, setStepUpAction] = useState<StepUpAction>("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load(nextFilters = filters) {
    setBusy("load");
    setError("");
    const [occurrences, sync] = await Promise.all([
      fetchHrxLeaveOccurrenceProjections(nextFilters),
      canExport ? fetchHrxLeaveIntegrations() : Promise.resolve(null)
    ]);
    setBusy("");
    if (occurrences.kind !== "data") {
      setError("휴가 발생 내역을 불러오지 못했습니다.");
      return;
    }
    setProjections(occurrences.projections as Row);
    if (sync?.kind === "data") setIntegration(sync.integration as Row);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!canAdjust) return;
    void Promise.all([fetchHrxLeaveConfiguration(), fetchHrxLeaveManualAdjustmentSupport()]).then(([configuration, support]) => {
      if (configuration.kind !== "data" || support.kind !== "data") {
        setError("발생 관리 기준을 불러오지 못했습니다.");
        return;
      }
      const activeGroups = configuration.groups.filter((row: Row) => text(row, "status") === "active") as Row[];
      const activePolicies = configuration.policies.filter((row: Row) => text(row, "status") === "active") as Row[];
      const supportDocuments = support.documents as Row[];
      setGroups(activeGroups);
      setPolicies(activePolicies);
      setDocuments(supportDocuments);
      setManualForm((current) => ({
        ...current,
        employee_id: text(supportDocuments[0], "employee_id"),
        source_document_id: text(supportDocuments[0], "document_id"),
        group_id: text(activeGroups[0], "group_id"),
        policy_version_id: text(activePolicies[0], "policy_version_id")
      }));
    });
  }, [canAdjust]);

  const listProjection = projections?.list as Row | undefined;
  const occurrenceRows = Array.isArray(listProjection?.rows) ? listProjection.rows as Row[] : [];
  const monthRows = Array.isArray(projections?.by_month) ? projections.by_month as Row[] : [];
  const typeRows = Array.isArray(projections?.by_type) ? projections.by_type as Row[] : [];
  const totals = projections?.totals as Row | undefined;
  const employees = useMemo(() => [...new Map(occurrenceRows.map((row) => [text(row, "employee_id"), { id: text(row, "employee_id"), name: text(row, "employee_display_name") }] as const)).values()], [occurrenceRows]);
  const occurrenceGroups = useMemo(() => groups.length ? groups.map((row) => ({ id: text(row, "group_id"), name: text(row, "display_name") })) : [...new Map(occurrenceRows.map((row) => [text(row, "group_id"), { id: text(row, "group_id"), name: text(row, "group_display_name") }] as const)).values()], [groups, occurrenceRows]);
  const integrationRows = Array.isArray(integration?.rows) ? integration.rows as Row[] : [];
  const integrationSummary = integration?.summary as Row | undefined;
  const visibleIntegrationRows = integrationRows.slice(0, 8);
  const hasIntegrationActivity = integrationRows.length > 0 || ["pending_sync", "delivered", "failed_deliveries", "not_configured", "dead_lettered"].some((field) => number(integrationSummary, field) > 0);
  const groupPolicies = policies.filter((policy) => text(policy, "group_id") === manualForm.group_id);
  const manualVisible = manualResult ?? manualPreview;
  const manualRows = Array.isArray(manualVisible?.rows) ? manualVisible.rows as Row[] : [];
  const manualCounts = manualVisible?.counts as Row | undefined;
  const uploadRows = Array.isArray(uploadBatch?.rows) ? uploadBatch.rows as Row[] : [];
  const uploadCounts = uploadBatch?.counts as Row | undefined;
  const hasUploadFile = Boolean(uploadFile.csv_text || uploadFile.xlsx_content_base64);

  async function processIntegrations() {
    setBusy("integrations");
    setError("");
    const result = await processHrxLeaveIntegrations();
    setBusy("");
    if (result.kind !== "data") {
      setError("대기 중인 연동을 처리하지 못했습니다.");
      return;
    }
    setIntegration(result.integration as Row);
  }

  async function retryDeadLetter(deadLetterId: string) {
    setBusy(`retry:${deadLetterId}`);
    setError("");
    const result = await retryHrxLeaveIntegrationDeadLetter(deadLetterId);
    setBusy("");
    if (result.kind !== "data") {
      setError("격리된 연동을 재처리 대기로 바꾸지 못했습니다.");
      return;
    }
    setIntegration(result.integration as Row);
  }

  async function download(format: "csv" | "xlsx") {
    setBusy(format);
    setError("");
    const result = await exportHrxLeaveOccurrences(format, view, filters);
    setBusy("");
    if (result.kind !== "data") {
      setError("현재 보기의 파일을 만들지 못했습니다.");
      return;
    }
    downloadArtifact(result.export as Row);
  }

  async function downloadTemplate(format: "csv" | "xlsx") {
    setBusy(`template-${format}`);
    setError("");
    const result = await fetchHrxLeaveOccurrenceTemplate(format);
    setBusy("");
    if (result.kind !== "data") {
      setError("업로드 양식을 만들지 못했습니다.");
      return;
    }
    downloadArtifact(result.template as Row);
  }

  async function importUploadFile(file: File) {
    setUploadBatch(null);
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      setUploadFile({ file_name: file.name, csv_text: "", xlsx_content_base64: window.btoa(binary) });
      return;
    }
    setUploadFile({ file_name: file.name, csv_text: await file.text(), xlsx_content_base64: "" });
  }

  async function previewManual() {
    const payload = { rows: [{ ...manualForm, amount_minutes: Number(manualForm.amount_minutes) }], schedule_only: true, as_of: today };
    setBusy("manual-preview");
    setError("");
    setManualResult(null);
    setStepUpAction("");
    const result = await previewHrxLeaveManualAdjustment(payload);
    setBusy("");
    if (result.kind !== "data") {
      setError("조정안을 만들지 못했습니다.");
      return;
    }
    setManualPayload(payload);
    setManualPreview(result.preview as Row);
    setManualKey(`leave-occurrence-manual:${Date.now()}`);
  }

  async function executeManual() {
    if (!manualPayload) return;
    setBusy("manual-execute");
    setError("");
    const result = await executeHrxLeaveManualAdjustment({ ...manualPayload, approval_receipt_id: text(manualPreview, "approval_receipt_id"), idempotency_key: manualKey });
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("manual-execute");
      return;
    }
    if (result.kind !== "data") {
      setError("수동 발생을 반영하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setManualResult(result.result as Row);
    await load();
  }

  async function approveManual() {
    if (!manualPayload || !manualPreview) return;
    setBusy("manual-approve");
    setError("");
    const result = await approveHrxLeaveManualAdjustment(manualPayload);
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("manual-approve");
      return;
    }
    if (result.kind !== "data") {
      setError("수동 발생 승인 영수증을 기록하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setManualPreview({ ...manualPreview, approval_receipt_id: text(result.approval_receipt as Row, "approval_receipt_id"), approved_by_actor_id: text(result.approval_receipt as Row, "approved_by_actor_id") });
  }

  async function previewUpload() {
    setBusy("upload-preview");
    setError("");
    setStepUpAction("");
    const filePayload = uploadFile.xlsx_content_base64
      ? { xlsx_content_base64: uploadFile.xlsx_content_base64 }
      : { csv_text: uploadFile.csv_text };
    const result = await previewHrxLeaveOccurrenceUpload({ ...filePayload, schedule_only: true, as_of: today, idempotency_key: `leave-occurrence-upload:${Date.now()}` });
    setBusy("");
    if (result.kind !== "data") {
      setError("업로드 조정안을 만들지 못했습니다.");
      return;
    }
    setUploadBatch(result.batch as Row);
  }

  async function executeUpload() {
    const batchId = text(uploadBatch, "upload_batch_id");
    if (!batchId) return;
    setBusy("upload-execute");
    setError("");
    const result = await executeHrxLeaveOccurrenceUpload(batchId, { preview_hash: text(uploadBatch, "preview_hash"), approval_receipt_id: text(uploadBatch, "approval_receipt_id"), idempotency_key: `leave-occurrence-upload-execute:${batchId}` });
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("upload-execute");
      return;
    }
    if (result.kind !== "data") {
      setError("업로드 조정안을 반영하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setUploadBatch(result.batch as Row);
    await load();
  }

  async function approveUpload() {
    const batchId = text(uploadBatch, "upload_batch_id");
    if (!batchId || !uploadBatch) return;
    setBusy("upload-approve");
    setError("");
    const result = await approveHrxLeaveOccurrenceUpload(batchId, { preview_hash: text(uploadBatch, "preview_hash") });
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("upload-approve");
      return;
    }
    if (result.kind !== "data") {
      setError("업로드 승인 영수증을 기록하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setUploadBatch({ ...uploadBatch, approval_receipt_id: text(result.approval_receipt as Row, "approval_receipt_id"), approved_by_actor_id: text(result.approval_receipt as Row, "approved_by_actor_id") });
  }

  async function retryUpload() {
    const batchId = text(uploadBatch, "upload_batch_id");
    if (!batchId) return;
    setBusy("upload-retry");
    setError("");
    const result = await retryHrxLeaveOccurrenceUpload(batchId, { preview_hash: text(uploadBatch, "preview_hash") });
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("upload-retry");
      return;
    }
    if (result.kind !== "data") {
      setError("실패 행을 재시도하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setUploadBatch(result.batch as Row);
    await load();
  }

  function editOccurrence(row: Row) {
    setStage("edit");
    setStepUpAction("");
    setEditForm({
      entitlement_id: text(row, "entitlement_id"),
      expected_version: number(row, "state_version"),
      valid_from: text(row, "valid_from"),
      expires_on: text(row, "expires_on"),
      reason_code: "관리자 취소"
    });
  }

  async function saveScheduled() {
    setBusy("edit-save");
    setError("");
    const result = await updateHrxScheduledLeaveEntitlement(editForm.entitlement_id, {
      expected_version: editForm.expected_version,
      valid_from: editForm.valid_from,
      expires_on: editForm.expires_on || null,
      idempotency_key: `leave-occurrence-edit:${editForm.entitlement_id}:${editForm.expected_version}`,
      as_of: today,
      timezone: "Asia/Seoul"
    });
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("edit");
      return;
    }
    if (result.kind !== "data") {
      setError("예정 발생을 변경하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setStage("");
    await load();
  }

  async function cancelScheduled() {
    setBusy("edit-cancel");
    setError("");
    const result = await cancelHrxScheduledLeaveEntitlement(editForm.entitlement_id, {
      expected_version: editForm.expected_version,
      reason_code: editForm.reason_code,
      idempotency_key: `leave-occurrence-cancel:${editForm.entitlement_id}:${editForm.expected_version}`,
      as_of: today,
      timezone: "Asia/Seoul"
    });
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("cancel");
      return;
    }
    if (result.kind !== "data") {
      setError("예정 발생을 취소하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setStage("");
    await load();
  }

  function retryAfterStepUp() {
    const action = stepUpAction;
    setStepUpAction("");
    if (action === "manual-approve") void approveManual();
    if (action === "manual-execute") void executeManual();
    if (action === "upload-approve") void approveUpload();
    if (action === "upload-execute") void executeUpload();
    if (action === "upload-retry") void retryUpload();
    if (action === "edit") void saveScheduled();
    if (action === "cancel") void cancelScheduled();
  }

  return (
    <Panel id="people-leave-usage" className="people-panel span-2 leave-report-panel leave-occurrence-panel" title="휴가 사용 내역" meta={`${number(totals, "row_count")}건`}>
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      <form className="leave-report-filters leave-occurrence-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <label><span>시작일</span><input aria-label="시작일" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label><span>종료일</span><input aria-label="종료일" type="date" min={filters.from} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        {employees.length > 1 && <label><span>구성원</span><select aria-label="구성원" value={filters.employee_id} onChange={(event) => setFilters({ ...filters, employee_id: event.target.value })}><option value="">전체</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
        <label><span>휴가 유형</span><select aria-label="휴가 유형" value={filters.group_id} onChange={(event) => setFilters({ ...filters, group_id: event.target.value })}><option value="">전체</option>{occurrenceGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label><span>상태</span><select aria-label="상태" value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}><option value="">전체</option>{Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="secondary-button" disabled={busy === "load"}><RefreshCw size={14} />조회</button>
      </form>

      <div className="leave-report-summary leave-occurrence-summary" aria-label="휴가 발생 합계">
        <span><small>발생 건</small><strong>{number(totals, "row_count")}건</strong></span>
        <span><small>발생</small><strong>{minutes(number(totals, "total_minutes"))}</strong></span>
        <span><small>사용</small><strong>{minutes(number(totals, "used_minutes"))}</strong></span>
        <span><small>예약</small><strong>{minutes(number(totals, "reserved_minutes"))}</strong></span>
        <span><small>소멸</small><strong>{minutes(number(totals, "expired_minutes"))}</strong></span>
        <span><small>잔여</small><strong>{minutes(number(totals, "remaining_minutes"))}</strong></span>
      </div>

      <div className="leave-report-toolbar leave-occurrence-toolbar">
        <div className="leave-occurrence-view-tabs" role="group" aria-label="발생 보기">
          {([['list', '목록'], ['month', '월별'], ['type', '유형별']] as [OccurrenceView, string][]).map(([value, label]) => <button key={value} className={view === value ? "secondary-button active" : "secondary-button"} type="button" onClick={() => setView(value)}>{label}</button>)}
        </div>
        <div className="leave-occurrence-actions">
          {canAdjust && <button className="secondary-button" type="button" onClick={() => { setStage(stage === "manual" ? "" : "manual"); setStepUpAction(""); }}><Plus size={14} />수동 발생</button>}
          {canAdjust && <button className="secondary-button" type="button" onClick={() => { setStage(stage === "upload" ? "" : "upload"); setStepUpAction(""); }}><FileUp size={14} />파일 업로드</button>}
          {canExport && <button className="secondary-button" type="button" disabled={busy === "csv"} onClick={() => void download("csv")}><Download size={14} />CSV</button>}
          {canExport && <button className="secondary-button" type="button" disabled={busy === "xlsx"} onClick={() => void download("xlsx")}><Download size={14} />XLSX</button>}
        </div>
      </div>

      {stage === "manual" && <section className="leave-occurrence-stage" aria-label="수동 발생 조정안">
        <div className="leave-occurrence-stage-head"><strong>수동 발생 조정안</strong>{manualVisible && <span>정상 {number(manualCounts, manualResult ? "created" : "ready")} · 오류 {number(manualCounts, "errors")}</span>}</div>
        <form className="leave-occurrence-stage-form" onSubmit={(event) => { event.preventDefault(); void previewManual(); }}>
          <label><span>근거 문서</span><select required aria-label="근거 문서" value={manualForm.source_document_id} onChange={(event) => { const document = documents.find((row) => text(row, "document_id") === event.target.value); setManualForm({ ...manualForm, source_document_id: event.target.value, employee_id: text(document, "employee_id") }); }}><option value="">문서 선택</option>{documents.map((document) => <option key={text(document, "document_id")} value={text(document, "document_id")}>{text(document, "employee_display_name")} · {text(document, "title")}</option>)}</select></label>
          <label><span>휴가 유형</span><select required aria-label="수동 발생 휴가 유형" value={manualForm.group_id} onChange={(event) => { const groupId = event.target.value; const policy = policies.find((row) => text(row, "group_id") === groupId); setManualForm({ ...manualForm, group_id: groupId, policy_version_id: text(policy, "policy_version_id") }); }}><option value="">유형 선택</option>{groups.map((group) => <option key={text(group, "group_id")} value={text(group, "group_id")}>{text(group, "display_name")}</option>)}</select></label>
          <label><span>정책</span><select required aria-label="수동 발생 정책" value={manualForm.policy_version_id} onChange={(event) => setManualForm({ ...manualForm, policy_version_id: event.target.value })}><option value="">정책 선택</option>{groupPolicies.map((policy) => <option key={text(policy, "policy_version_id")} value={text(policy, "policy_version_id")}>{text(policy, "policy_code")} v{number(policy, "version")}</option>)}</select></label>
          <label><span>시작일</span><input required aria-label="수동 발생 시작일" type="date" min={offsetDate(today, 0, 1)} value={manualForm.occurred_on} onChange={(event) => setManualForm({ ...manualForm, occurred_on: event.target.value })} /></label>
          <label><span>만료일</span><input aria-label="수동 발생 만료일" type="date" min={manualForm.occurred_on} value={manualForm.expires_on} onChange={(event) => setManualForm({ ...manualForm, expires_on: event.target.value })} /></label>
          <label><span>발생량(분)</span><input required aria-label="수동 발생량" type="number" min="1" step="1" value={manualForm.amount_minutes} onChange={(event) => setManualForm({ ...manualForm, amount_minutes: event.target.value })} /></label>
          <label><span>사유</span><input required aria-label="수동 발생 사유" value={manualForm.reason} onChange={(event) => setManualForm({ ...manualForm, reason: event.target.value })} /></label>
          <button className="secondary-button" disabled={busy === "manual-preview"}>미리보기</button>
        </form>
        {manualRows.length > 0 && <div className="leave-occurrence-stage-result" data-compact-record="true"><span>{text(manualRows[0], "employee_id") || "확인 필요"}</span><span>{number(manualRows[0], "amount_minutes").toLocaleString("ko-KR")}분</span><span className="record-state-badge" data-state={text(manualRows[0], "status") === "error" ? "error" : "review"}>{text(manualRows[0], "error_message") || (manualResult ? "반영 완료" : "승인 대기")}</span></div>}
        <div className="leave-occurrence-stage-actions"><button className="secondary-button" type="button" disabled={!manualPayload || !manualPreview || Boolean(text(manualPreview, "approval_receipt_id")) || number(manualPreview?.counts as Row, "ready") === 0 || busy === "manual-approve"} onClick={() => void approveManual()}>승인 기록</button><button className="primary-button" type="button" disabled={!manualPayload || !text(manualPreview, "approval_receipt_id") || number(manualPreview?.counts as Row, "ready") === 0 || busy === "manual-execute"} onClick={() => void executeManual()}>반영</button></div>
      </section>}

      {stage === "upload" && <section className="leave-occurrence-stage" aria-label="파일 업로드 조정안">
        <div className="leave-occurrence-stage-head"><strong>파일 업로드 조정안</strong>{uploadBatch && <span>정상 {number(uploadCounts, "ready")} · 오류 {number(uploadCounts, "preview_errors")} · 중복 {number(uploadCounts, "duplicates")}</span>}</div>
        <div className="leave-occurrence-upload-controls"><button className="secondary-button" type="button" disabled={busy === "template-csv"} onClick={() => void downloadTemplate("csv")}><Download size={14} />CSV 양식</button><button className="secondary-button" type="button" disabled={busy === "template-xlsx"} onClick={() => void downloadTemplate("xlsx")}><Download size={14} />XLSX 양식</button><label className="secondary-button leave-occurrence-file"><FileUp size={14} />파일 선택<input aria-label="휴가 발생 파일" type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importUploadFile(file); }} /></label>{uploadFile.file_name && <span>{uploadFile.file_name}</span>}<button className="secondary-button" type="button" disabled={!hasUploadFile || busy === "upload-preview"} onClick={() => void previewUpload()}>미리보기</button></div>
        {uploadRows.length > 0 && <div className="data-table-wrap leave-occurrence-upload-table"><table className="data-table"><thead><tr><th>행</th><th>구성원</th><th>상태</th><th>오류</th><th>시도</th></tr></thead><tbody>{uploadRows.map((row) => <tr key={`${number(row, "row_number")}:${text(row, "row_key")}`} data-compact-record="true"><td>{number(row, "row_number")}</td><td>{text(row, "employee_id") || "-"}</td><td>{text(row, "execution_status") === "completed" ? "완료" : text(row, "preview_status") === "ready" ? "반영 가능" : "확인 필요"}</td><td>{text(row, "error_message") || "-"}</td><td>{number(row, "attempt_count")}</td></tr>)}</tbody></table></div>}
        <div className="leave-occurrence-stage-actions">{text(uploadBatch, "status") === "completed_with_errors" && <button className="secondary-button" type="button" disabled={busy === "upload-retry"} onClick={() => void retryUpload()}>실패 행 재시도</button>}<button className="secondary-button" type="button" disabled={!text(uploadBatch, "upload_batch_id") || Boolean(text(uploadBatch, "approval_receipt_id")) || number(uploadCounts, "ready") === 0 || number(uploadCounts, "preview_errors") > 0 || busy === "upload-approve"} onClick={() => void approveUpload()}>승인 기록</button><button className="primary-button" type="button" disabled={!text(uploadBatch, "upload_batch_id") || !text(uploadBatch, "approval_receipt_id") || number(uploadCounts, "ready") === 0 || number(uploadCounts, "preview_errors") > 0 || busy === "upload-execute"} onClick={() => void executeUpload()}>반영</button></div>
      </section>}

      {stage === "edit" && <section className="leave-occurrence-stage" aria-label="예정 발생 조정안">
        <div className="leave-occurrence-stage-head"><strong>예정 발생 조정안</strong><span>{editForm.entitlement_id}</span></div>
        <div className="leave-occurrence-edit-form"><label><span>시작일</span><input aria-label="예정 발생 시작일" type="date" min={offsetDate(today, 0, 1)} value={editForm.valid_from} onChange={(event) => setEditForm({ ...editForm, valid_from: event.target.value })} /></label><label><span>만료일</span><input aria-label="예정 발생 만료일" type="date" min={editForm.valid_from} value={editForm.expires_on} onChange={(event) => setEditForm({ ...editForm, expires_on: event.target.value })} /></label><label><span>취소 코드</span><input aria-label="예정 발생 취소 코드" value={editForm.reason_code} onChange={(event) => setEditForm({ ...editForm, reason_code: event.target.value })} /></label><button className="secondary-button" type="button" disabled={busy === "edit-save"} onClick={() => void saveScheduled()}>변경 반영</button><button className="secondary-button danger" type="button" disabled={!editForm.reason_code || busy === "edit-cancel"} onClick={() => void cancelScheduled()}>발생 취소</button></div>
      </section>}

      {stepUpAction && <HrxStepUpChallenge purpose="leave_ledger_adjustment" onVerified={retryAfterStepUp} />}

      {view === "list" ? occurrenceRows.length > 0 ? <div className="data-table-wrap leave-occurrence-table"><table className="data-table"><thead><tr><th>구성원</th><th>휴가 유형</th><th>시작일</th><th>만료일</th><th>상태</th><th>발생</th><th>사용</th><th>예약</th><th>잔여</th>{canAdjust && <th>관리</th>}</tr></thead><tbody>{occurrenceRows.map((row) => <tr key={text(row, "entitlement_id")} data-compact-record="true"><td><strong>{text(row, "employee_display_name")}</strong></td><td>{text(row, "group_display_name")}</td><td>{text(row, "valid_from")}</td><td>{text(row, "expires_on") || "-"}</td><td><span className="record-state-badge" data-state={text(row, "lifecycle_state") === "active" ? "live" : text(row, "lifecycle_state") === "cancelled" ? "error" : "review"}>{STATE_LABELS[text(row, "lifecycle_state")] ?? text(row, "lifecycle_state")}</span></td><td>{minutes(number(row, "total_minutes"))}</td><td>{minutes(number(row, "used_minutes"))}</td><td>{minutes(number(row, "reserved_minutes"))}</td><td>{minutes(number(row, "remaining_minutes"))}</td>{canAdjust && <td>{text(row, "lifecycle_state") === "scheduled" ? <button className="table-inline-action" type="button" onClick={() => editOccurrence(row)}><Pencil size={13} />관리</button> : "-"}</td>}</tr>)}</tbody></table></div> : <div className="live-data-state live-data-empty">내역 없음</div> : <div className="data-table-wrap leave-occurrence-table"><table className="data-table"><thead><tr><th>{view === "month" ? "월" : "휴가 유형"}</th><th>발생 건</th><th>발생</th><th>사용</th><th>예약</th><th>소멸</th><th>잔여</th></tr></thead><tbody>{(view === "month" ? monthRows : typeRows).map((row) => { const rowTotals = row.totals as Row; return <tr key={text(row, "key")} data-compact-record="true"><td><strong>{text(row, "label")}</strong></td><td>{number(rowTotals, "row_count")}건</td><td>{minutes(number(rowTotals, "total_minutes"))}</td><td>{minutes(number(rowTotals, "used_minutes"))}</td><td>{minutes(number(rowTotals, "reserved_minutes"))}</td><td>{minutes(number(rowTotals, "expired_minutes"))}</td><td>{minutes(number(rowTotals, "remaining_minutes"))}</td></tr>; })}</tbody></table></div>}

      {canExport && hasIntegrationActivity && <div data-leave-integration-status="true"><details className="leave-integration-status">
        <summary><CalendarSync size={16} /><strong>업무 시스템 연동</strong><span>대기 {number(integrationSummary, "pending_sync")} · 실패 {number(integrationSummary, "failed_deliveries")} · 격리 {number(integrationSummary, "dead_lettered")}{number(integrationSummary, "not_configured") > 0 && <> · 공급자 미설정 {number(integrationSummary, "not_configured")}</>}</span></summary>
        <div className="leave-integration-head">{canProcessIntegrations && <button className="secondary-button" type="button" disabled={busy === "integrations"} onClick={() => void processIntegrations()}><RefreshCw size={14} />대기 항목 처리</button>}</div>
        <div className="leave-integration-list">{visibleIntegrationRows.map((row) => { const deliveries = Array.isArray(row.deliveries) ? row.deliveries as Row[] : []; return <div className="leave-integration-row" data-compact-record="true" key={text(row, "outbox_event_id")}><span><strong>{eventLabel(text(row, "event_type"))}</strong></span><div>{deliveries.length ? deliveries.map((delivery) => { const deadLetter = delivery.dead_letter as Row | null; const deadLetterId = text(deadLetter, "dead_letter_id"); return <span className="leave-integration-delivery" key={text(delivery, "delivery_id")}><span className="record-state-badge" data-state={text(delivery, "state") === "delivered" ? "live" : "review"}>{PROVIDER_LABELS[text(delivery, "provider_kind")] ?? text(delivery, "provider_kind")} · {deadLetterId && text(delivery.dead_letter as Row | null, "state") === "open" ? `${number(deadLetter, "fail_count")}회 실패` : text(delivery, "state") === "delivered" ? "연결됨" : "대기"}</span>{deadLetterId && text(delivery.dead_letter as Row | null, "state") === "open" && canProcessIntegrations && <button className="leave-integration-retry" type="button" disabled={busy === `retry:${deadLetterId}`} onClick={() => void retryDeadLetter(deadLetterId)}>재시도</button>}</span>; }) : <span className="record-state-badge" data-state="review">처리 대기</span>}</div></div>; })}</div>
      </details></div>}
    </Panel>
  );
}
