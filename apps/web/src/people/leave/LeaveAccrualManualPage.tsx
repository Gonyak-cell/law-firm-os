import React, { useEffect, useState } from "react";
import { Download, Play, Upload } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  executeHrxLeaveManualAdjustment,
  fetchHrxLeaveConfiguration,
  fetchHrxLeaveOccurrenceTemplate,
  fetchHrxLeaveManualAdjustmentSupport,
  previewHrxLeaveManualAdjustment
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;

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

const emptyForm = {
  employee_id: "",
  group_id: "",
  policy_version_id: "",
  direction: "credit",
  amount_minutes: "480",
  occurred_on: localDate(),
  expires_on: "",
  reason: "",
  source_document_id: ""
};

export function LeaveAccrualManualPage() {
  const [groups, setGroups] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<Row[]>([]);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [approvers, setApprovers] = useState<Row[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [csvText, setCsvText] = useState("");
  const [xlsxContent, setXlsxContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);
  const [previewPayload, setPreviewPayload] = useState<Row | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [result, setResult] = useState<Row | null>(null);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([fetchHrxLeaveConfiguration(), fetchHrxLeaveManualAdjustmentSupport()]).then(([configuration, support]) => {
      if (configuration.kind !== "data" || support.kind !== "data") {
        setError("수동 발생 기준을 불러오지 못했습니다.");
        return;
      }
      const activeGroups = configuration.groups.filter((group: Row) => text(group, "status") === "active") as Row[];
      const activePolicies = configuration.policies.filter((policy: Row) => text(policy, "status") === "active") as Row[];
      setGroups(activeGroups);
      setPolicies(activePolicies);
      setDocuments(support.documents as Row[]);
      setApprovers(support.approvers as Row[]);
      setApprovedBy(text(support.approvers[0] as Row, "actor_id"));
      setForm((current) => ({ ...current, group_id: text(activeGroups[0], "group_id"), policy_version_id: text(activePolicies[0], "policy_version_id"), source_document_id: text(support.documents[0] as Row, "document_id"), employee_id: text(support.documents[0] as Row, "employee_id") }));
    });
  }, []);

  function payload() {
    if (xlsxContent) return { xlsx_content_base64: xlsxContent };
    return csvText.trim() ? { csv_text: csvText } : { rows: [{ ...form, amount_minutes: Number(form.amount_minutes) }] };
  }

  async function downloadTemplate(format: "csv" | "xlsx") {
    setBusy(`template-${format}`);
    setError("");
    const response = await fetchHrxLeaveOccurrenceTemplate(format);
    setBusy("");
    if (response.kind !== "data") {
      setError("양식을 내려받지 못했습니다.");
      return;
    }
    const template = response.template as Row;
    const binary = window.atob(text(template, "content_base64"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: text(template, "mime_type") }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = text(template, "file_name");
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file: File) {
    setCsvText("");
    setXlsxContent("");
    setFileName(file.name);
    setPreview(null);
    setResult(null);
    setPreviewPayload(null);
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      setXlsxContent(window.btoa(binary));
      return;
    }
    setCsvText(await file.text());
  }

  async function runPreview() {
    const nextPayload = payload();
    setBusy("preview");
    setError("");
    setResult(null);
    setStepUpRequired(false);
    const response = await previewHrxLeaveManualAdjustment(nextPayload);
    setBusy("");
    if (response.kind !== "data") {
      setError(typeof response.reason === "string" ? response.reason : "조정 행을 검증하지 못했습니다.");
      return;
    }
    setPreview(response.preview as Row);
    setPreviewPayload(nextPayload);
    setIdempotencyKey(`leave-manual-${Date.now()}`);
  }

  async function execute() {
    if (!previewPayload) return;
    setBusy("execute");
    setError("");
    const response = await executeHrxLeaveManualAdjustment({
      ...previewPayload,
      approved_by_actor_id: approvedBy,
      idempotency_key: idempotencyKey
    });
    setBusy("");
    if (response.kind === "step_up_required") {
      setStepUpRequired(true);
      return;
    }
    if (response.kind !== "data") {
      setError(typeof response.reason === "string" ? response.reason : "수동 발생을 실행하지 못했습니다.");
      return;
    }
    setStepUpRequired(false);
    setResult(response.result as Row);
  }

  const visible = result ?? preview;
  const rows = Array.isArray(visible?.rows) ? visible.rows as Row[] : [];
  const counts = visible?.counts as Row | undefined;
  const groupPolicies = policies.filter((policy) => text(policy, "group_id") === form.group_id);

  return (
    <Panel id="people-leave-accrual-manual" className="people-panel span-2 leave-accrual-panel" title="휴가 수동 발생">
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      <section className="leave-accrual-section" aria-labelledby="leave-manual-input-heading">
        <div className="leave-accrual-section-head"><h3 id="leave-manual-input-heading">조정 입력</h3></div>
        <form className="leave-accrual-form leave-manual-form" onSubmit={(event) => { event.preventDefault(); void runPreview(); }}>
          <label><span>근거 문서</span><select required value={form.source_document_id} onChange={(event) => { const document = documents.find((item) => text(item, "document_id") === event.target.value); setForm({ ...form, source_document_id: event.target.value, employee_id: text(document, "employee_id") }); }}><option value="">문서 선택</option>{documents.map((document) => <option key={text(document, "document_id")} value={text(document, "document_id")}>{text(document, "employee_display_name")} · {text(document, "title")}</option>)}</select></label>
          <label><span>대상 구성원</span><input aria-label="대상 구성원" value={form.employee_id} readOnly /></label>
          <label><span>휴가 그룹</span><select required value={form.group_id} onChange={(event) => { const groupId = event.target.value; const policy = policies.find((item) => text(item, "group_id") === groupId); setForm({ ...form, group_id: groupId, policy_version_id: text(policy, "policy_version_id") }); }}><option value="">그룹 선택</option>{groups.map((group) => <option key={text(group, "group_id")} value={text(group, "group_id")}>{text(group, "display_name")}</option>)}</select></label>
          <label><span>정책 버전</span><select required value={form.policy_version_id} onChange={(event) => setForm({ ...form, policy_version_id: event.target.value })}><option value="">정책 선택</option>{groupPolicies.map((policy) => <option key={text(policy, "policy_version_id")} value={text(policy, "policy_version_id")}>{text(policy, "policy_code")} v{number(policy, "version")}</option>)}</select></label>
          <label><span>조정 방향</span><select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })}><option value="credit">추가</option><option value="debit">차감</option></select></label>
          <label><span>조정량(분)</span><input required type="number" min="1" step="1" value={form.amount_minutes} onChange={(event) => setForm({ ...form, amount_minutes: event.target.value })} /></label>
          <label><span>발생일</span><input required type="date" value={form.occurred_on} onChange={(event) => setForm({ ...form, occurred_on: event.target.value })} /></label>
          <label><span>만료일</span><input type="date" value={form.expires_on} onChange={(event) => setForm({ ...form, expires_on: event.target.value })} /></label>
          <label className="leave-manual-reason"><span>조정 사유</span><input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
          <button className="secondary-button" disabled={busy === "preview"}>행 검증</button>
        </form>

        <div className="leave-manual-csv">
          <button className="secondary-button" type="button" disabled={busy === "template-csv"} onClick={() => void downloadTemplate("csv")}><Download size={14} />CSV 양식</button>
          <button className="secondary-button" type="button" disabled={busy === "template-xlsx"} onClick={() => void downloadTemplate("xlsx")}><Download size={14} />XLSX 양식</button>
          <label className="secondary-button leave-manual-file"><Upload size={14} />파일 불러오기<input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} /></label>
          {fileName && <span>{fileName}</span>}
          {!xlsxContent && <textarea aria-label="수동 발생 CSV" rows={4} value={csvText} onChange={(event) => { setCsvText(event.target.value); setFileName(""); }} placeholder="CSV 내용을 붙여넣을 수 있습니다" />}
          {(csvText || xlsxContent) && <button className="secondary-button" type="button" onClick={() => { setCsvText(""); setXlsxContent(""); setFileName(""); }}>파일 지우기</button>}
        </div>
      </section>

      <section className="leave-accrual-section" aria-labelledby="leave-manual-result-heading">
        <div className="leave-accrual-section-head"><h3 id="leave-manual-result-heading">검증 결과</h3>{visible && <span>정상 {number(counts, result ? "created" : "ready")} · 오류 {number(counts, "errors")}</span>}</div>
        {visible && <div className="data-table-wrap"><table className="data-table"><thead><tr><th>행</th><th>구성원</th><th>결과</th><th>방향</th><th>조정량</th><th>확인 사항</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${number(row, "row_number")}:${index}`} data-compact-record="true"><td>{number(row, "row_number")}</td><td>{text(row, "employee_id") || "확인 필요"}</td><td><span className={`record-state-badge ${text(row, "status")}`}>{text(row, "status") === "ready" ? "반영 가능" : text(row, "status") === "created" ? "반영 완료" : "오류"}</span></td><td>{text(row, "direction") === "debit" ? "차감" : text(row, "direction") === "credit" ? "추가" : "-"}</td><td>{number(row, "amount_minutes").toLocaleString("ko-KR")}분</td><td>{text(row, "error_message") || "-"}</td></tr>)}</tbody></table></div>}

        <div className="leave-manual-approval">
          <label><span>승인 HR</span><select aria-label="승인 HR" required value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)}><option value="">승인자 선택</option>{approvers.map((approver) => <option key={text(approver, "actor_id")} value={text(approver, "actor_id")}>{text(approver, "display_name")}</option>)}</select></label>
          <button className="primary-button" type="button" disabled={!previewPayload || !approvedBy || busy === "execute" || number(preview?.counts as Row, "ready") === 0} onClick={() => void execute()}><Play size={14} />원장 조정 반영</button>
        </div>
        {stepUpRequired && <HrxStepUpChallenge purpose="leave_ledger_adjustment" onVerified={() => void execute()} />}
      </section>
    </Panel>
  );
}
