import React from "react";
import { useState } from "react";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { approveHrxPayrollPreview, createHrxPayrollPreview, exportHrxPayrollArtifact } from "../hrxApiClient.ts";

function stateLabel(value) {
  if (value === "exported") return "내보내기 파일 생성";
  if (value === "approved") return "검토 승인";
  if (value === "preview") return "미리보기";
  return "대기";
}

function executionStateLabel(value) {
  return value === false ? "구현 안됨" : "확인 필요";
}

export function PayrollBoundaryPanel() {
  const [form, setForm] = useState({
    payroll_period: "2026-06",
    employee_ids: "대표 구성원, 운영 담당자",
    external_provider: "외부 미리보기 전용",
    export_artifact_ref: "문서:급여-내보내기-미리보기-001"
  });
  const [preview, setPreview] = useState(null);
  const [artifact, setArtifact] = useState(null);
  const [state, setState] = useState("idle");

  async function handlePreview(event) {
    event.preventDefault();
    setState("loading");
    setArtifact(null);
    const result = await createHrxPayrollPreview(form);
    if (result.kind !== "data") {
      setState("error");
      return;
    }
    setPreview(result.preview);
    setState("preview");
  }

  async function handleApprove() {
    if (!preview?.preview_id) return;
    setState("loading");
    const result = await approveHrxPayrollPreview(preview.preview_id);
    if (result.kind !== "data") {
      setState("error");
      return;
    }
    setPreview(result.preview);
    setState("approved");
  }

  async function handleExport() {
    if (!preview?.preview_id) return;
    setState("loading");
    const result = await exportHrxPayrollArtifact(preview.preview_id, form.export_artifact_ref);
    if (result.kind !== "data") {
      setState("error");
      return;
    }
    setArtifact(result.artifact);
    setState("exported");
  }

  const rows = preview
    ? [
        ["상태", stateLabel(preview.state), preview.preview_id],
        ["대상 기간", preview.payroll_period, `${preview.employee_ids.length}명`],
        ["정산 실행", executionStateLabel(preview.calculation_runtime), "계산·세금 처리는 아직 구현되지 않았습니다"],
        ["지급 실행", executionStateLabel(preview.disbursement_instruction_included), "송금·지급 처리는 아직 구현되지 않았습니다"],
        ["검토", preview.human_review_required ? "필수" : "확인 필요", preview.external_provider ?? "외부 제공자 없음"]
      ]
    : [];

  if (artifact) {
    rows.push(
      ["내보내기 파일", artifact.artifact_id, artifact.export_artifact_ref],
      ["정산 처리", executionStateLabel(artifact.calculation_runtime), "계산·세금 처리는 아직 구현되지 않았습니다"],
      ["지급 처리", executionStateLabel(artifact.disbursement_instruction_included), "송금·지급 지시는 아직 구현되지 않았습니다"]
    );
  }

  return (
    <Panel id="people-payroll" className="people-panel span-2" title="급여정산" meta="미리보기와 내보내기만 구현됨">
      <div className="people-panel-kicker">
        <ShieldCheck size={15} />
        현재는 정산 미리보기, 검토 승인, 내보내기만 구현되어 있습니다. 계산·세금·지급 실행은 아직 구현되지 않았습니다.
      </div>
      <form className="leave-request-form" onSubmit={handlePreview}>
        <label>
          <span>기간</span>
          <input value={form.payroll_period} onChange={(event) => setForm({ ...form, payroll_period: event.target.value })} />
        </label>
        <label>
          <span>구성원</span>
          <input value={form.employee_ids} onChange={(event) => setForm({ ...form, employee_ids: event.target.value })} />
        </label>
        <label>
          <span>제공자</span>
          <input value={form.external_provider} onChange={(event) => setForm({ ...form, external_provider: event.target.value })} />
        </label>
        <label>
          <span>문서 참조</span>
          <input value={form.export_artifact_ref} onChange={(event) => setForm({ ...form, export_artifact_ref: event.target.value })} />
        </label>
        <button className="primary-button" disabled={state === "loading"}>
          <FileCheck2 size={14} />
          미리보기 생성
        </button>
      </form>
      <div className="approval-actions">
        <button className="secondary-button" onClick={handleApprove} disabled={!preview || preview.state !== "preview" || state === "loading"}>
          검토 승인 기록
        </button>
        <button className="secondary-button" onClick={handleExport} disabled={!preview || preview.state !== "approved" || state === "loading"}>
          내보내기 파일 생성
        </button>
      </div>
      {state === "idle" && <div className="live-data-state live-data-empty">급여정산 미리보기를 준비할 수 있습니다.</div>}
      {state === "loading" && <div className="live-data-state live-data-loading">급여정산 자료를 확인하는 중입니다.</div>}
      {state === "error" && <div className="live-data-state live-data-error">급여정산 자료를 확인하지 못했습니다.</div>}
      {rows.length > 0 && <DataTable columns={["항목", "상태", "근거"]} rows={rows} />}
    </Panel>
  );
}
