import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, GitBranch, PlayCircle, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import {
  createClientMatterImportJob,
  dryRunClientMatterImport,
  executeClientMatterImport,
  fetchClientMatterImportErrorReport,
  fetchClientMatterImportJobs,
  fetchClientMatterImportPreview,
  fetchClientMatterImportTargets,
  rollbackClientMatterImport,
  saveImportFieldMapping,
  stageImportSourceFile
} from "../data/apiClient.js";
import { DataTable, Panel, Property } from "./primitives.jsx";

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function targetLabel(value) {
  if (value === "crm_account_facade") return "계정";
  if (value === "crm_contact_facade") return "연락처";
  if (value === "matter_runtime_patch") return "Matter";
  if (value === "finance_payment") return "결제";
  return "가져오기";
}

function statusLabel(value) {
  if (value === "created") return "생성됨";
  if (value === "source_staged") return "원본 준비";
  if (value === "mapping_saved") return "매핑 저장";
  if (value === "dry_run_passed") return "사전 검증 완료";
  if (value === "execution_owner_blocked") return "실행 승인 대기";
  if (value === "rollback_blocked") return "되돌리기 대기";
  return value ?? "대기";
}

function issueLabel(value) {
  if (value === "no_blocking_errors") return "차단 없음";
  if (value === "missing_required_mapping") return "필수 매핑 필요";
  return value ?? "대기";
}

function remediationLabel(value) {
  const text = String(value ?? "");
  if (text.includes("Dry-run can be reviewed")) return "담당자 검토 후 실행 요청 가능";
  if (text.includes("Map an allowlisted")) return "허용 필드 매핑 필요";
  return text || "사전 검증 후 확인";
}

function actionText(result, fallback) {
  if (!result) return null;
  if (result.kind === "error") return "처리하지 못했습니다.";
  if (result.uiState === "owner_blocked") return "담당자 승인 전이라 실행되지 않았습니다.";
  if (result.uiState === "blocked") return "실행 조건을 더 확인해야 합니다.";
  return fallback;
}

export function ImportDataMappingPanel({ ctx = "allow", surface = "client" }) {
  const jobId = `import_job_ui_sf_b_w05_${surface}`;
  const targetObject = surface === "client" ? "crm_account_facade" : "matter_runtime_patch";
  const [targetsResult, setTargetsResult] = useState(null);
  const [jobsResult, setJobsResult] = useState(null);
  const [jobResult, setJobResult] = useState(null);
  const [stageResult, setStageResult] = useState(null);
  const [mappingResult, setMappingResult] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [executeResult, setExecuteResult] = useState(null);
  const [rollbackResult, setRollbackResult] = useState(null);
  const [errorReportResult, setErrorReportResult] = useState(null);
  const [pending, setPending] = useState("");

  useEffect(() => {
    let cancelled = false;
    setTargetsResult(null);
    setJobsResult(null);
    Promise.all([
      fetchClientMatterImportTargets({ ctx }),
      fetchClientMatterImportJobs({ ctx })
    ]).then(([targets, jobs]) => {
      if (cancelled) return;
      setTargetsResult(targets);
      setJobsResult(jobs);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  const targets = resultItems(targetsResult);
  const jobs = resultItems(jobsResult);
  const selectedJob = useMemo(
    () => jobResult?.item ?? jobs.find((job) => job.job_id === jobId) ?? jobs[0] ?? null,
    [jobResult, jobs, jobId]
  );
  const mappingRows = mappingResult?.item?.field_mappings ?? [];
  const errorRows = resultItems(errorReportResult);

  async function refreshJobs() {
    const jobs = await fetchClientMatterImportJobs({ ctx });
    setJobsResult(jobs);
  }

  async function handleCreateJob() {
    setPending("job");
    const next = await createClientMatterImportJob({ jobId, targetObject, ctx });
    setJobResult(next);
    await refreshJobs();
    setPending("");
  }

  async function handleStageSource() {
    setPending("stage");
    const next = await stageImportSourceFile({ jobId, targetObject, ctx });
    setStageResult(next);
    if (next?.preview) setPreviewResult({ kind: "data", item: next.preview, items: [], outcome: "passed" });
    await refreshJobs();
    setPending("");
  }

  async function handleMapping() {
    setPending("mapping");
    const next = await saveImportFieldMapping({ jobId, targetObject, ctx });
    setMappingResult(next);
    if (next?.preview) setPreviewResult({ kind: "data", item: next.preview, items: [], outcome: "passed" });
    await refreshJobs();
    setPending("");
  }

  async function handleDryRun() {
    setPending("dry-run");
    const next = await dryRunClientMatterImport({ jobId, ctx });
    setDryRunResult(next);
    const preview = await fetchClientMatterImportPreview({ jobId, ctx });
    setPreviewResult(preview);
    await refreshJobs();
    setPending("");
  }

  async function handleExecute() {
    setPending("execute");
    const next = await executeClientMatterImport({ jobId, ctx });
    setExecuteResult(next);
    await refreshJobs();
    setPending("");
  }

  async function handleRollbackAndReport() {
    setPending("rollback");
    const rollback = await rollbackClientMatterImport({ jobId, ctx });
    const report = await fetchClientMatterImportErrorReport({ jobId, ctx });
    setRollbackResult(rollback);
    setErrorReportResult(report);
    await refreshJobs();
    setPending("");
  }

  return (
    <Panel id={`${surface}-import`} className="record-list-panel" title="가져오기" meta="필드 매핑">
      <div
        className="matter-live-stack"
        data-sf-b-w05-import-wizard="true"
        data-client-matter-import-wizard="route-backed"
        data-lcx-vltui-06-import-connected={surface === "matter" ? "true" : undefined}
      >
        <div className="record-action-grid">
          <div className="record-action-strip" data-sf-b-w05-target-selector="true">
            <div>
              <strong>대상 선택</strong>
              <span>{targets.length > 0 ? targets.map((target) => targetLabel(target.target_object)).join(" / ") : "대상 확인 중"}</span>
            </div>
            <button className="secondary-button" type="button" disabled={pending === "job"} onClick={handleCreateJob}>
              <ClipboardList size={15} />
              작업 생성
            </button>
          </div>
          <div className="record-action-strip" data-sf-b-w05-source-stage-action="true" data-raw-row-hidden="true" data-validation-marker="raw row 미노출">
            <div>
              <strong>원본 준비</strong>
              <span>CSV 구조와 열 정보만 저장합니다.</span>
            </div>
            <button className="secondary-button" type="button" disabled={pending === "stage"} onClick={handleStageSource}>
              <Upload size={15} />
              원본 준비
            </button>
          </div>
          <div className="record-action-strip" data-sf-b-w05-field-mapping-stepper="true">
            <div>
              <strong>필드 매핑</strong>
              <span>허용된 대상 필드만 저장합니다.</span>
            </div>
            <button className="secondary-button" type="button" disabled={pending === "mapping"} onClick={handleMapping}>
              <GitBranch size={15} />
              매핑 저장
            </button>
          </div>
          <div className="record-action-strip" data-sf-b-w05-dry-run-action="true" data-raw-row-hidden="true" data-validation-marker="raw row 미노출">
            <div>
              <strong>사전 검증</strong>
              <span>대상 레코드는 변경하지 않습니다.</span>
            </div>
            <button className="secondary-button" type="button" disabled={pending === "dry-run"} onClick={handleDryRun}>
              <PlayCircle size={15} />
              검증 실행
            </button>
          </div>
          <div className="record-action-strip" data-sf-b-w05-execute-owner-blocked-action="true">
            <div>
              <strong>실행 요청</strong>
              <span>승인 전에는 실제 가져오기를 실행하지 않습니다.</span>
            </div>
            <button className="secondary-button" type="button" disabled={pending === "execute"} onClick={handleExecute}>
              <ShieldCheck size={15} />
              실행 요청
            </button>
          </div>
          <div className="record-action-strip" data-sf-b-w05-rollback-error-action="true">
            <div>
              <strong>되돌리기와 오류</strong>
              <span>승인 기록과 안전한 오류 보고서만 표시합니다.</span>
            </div>
            <button className="secondary-button" type="button" disabled={pending === "rollback"} onClick={handleRollbackAndReport}>
              <RotateCcw size={15} />
              확인
            </button>
          </div>
        </div>

        <div className="property-grid tight" data-sf-b-w05-job-list="true">
          <Property label="현재 작업" value={selectedJob ? targetLabel(selectedJob.target_object) : "대기"} />
          <Property label="상태" value={selectedJob ? statusLabel(selectedJob.status) : "대기"} />
          <Property label="사전 검증" value={dryRunResult?.item?.outcome === "passed" ? "통과" : selectedJob?.dry_run_status ?? "대기"} />
          <Property label="실행" value={executeResult?.uiState === "owner_blocked" ? "승인 대기" : selectedJob?.execution_state ?? "대기"} />
        </div>

        {jobResult?.kind === "data" && (
          <div className="record-boundary-note" data-sf-b-w05-job-create-result="true">
            <ShieldCheck size={15} />
            <span>가져오기 작업이 연결된 기능으로 생성되었습니다.</span>
          </div>
        )}
        {stageResult?.kind === "data" && (
          <div className="record-boundary-note" data-sf-b-w05-source-stage-result="true">
            <ShieldCheck size={15} />
            <span>원본 구조가 저장되었고 원본 행은 응답하지 않았습니다.</span>
          </div>
        )}
        {mappingResult?.kind === "data" && (
          <div className="record-boundary-note" data-sf-b-w05-field-mapping-result="true">
            <ShieldCheck size={15} />
            <span>필드 매핑 {mappingRows.length}건이 허용 목록 기준으로 저장되었습니다.</span>
          </div>
        )}
        {previewResult?.item && (
          <div className="record-boundary-note" data-sf-b-w05-preview-safe-sample="true" data-raw-row-hidden="true" data-validation-marker="raw row 미노출">
            <ShieldCheck size={15} />
            <span>미리보기 {previewResult.item.sampled_row_count ?? 0}건, 원본 행 미노출.</span>
          </div>
        )}
        {dryRunResult?.kind === "data" && (
          <div className="record-boundary-note" data-sf-b-w05-dry-run-result="true">
            <ShieldCheck size={15} />
            <span>{actionText(dryRunResult, "사전 검증이 통과했고 대상 레코드는 변경되지 않았습니다.")}</span>
          </div>
        )}
        {executeResult?.kind === "data" && (
          <div className="record-boundary-note" data-sf-b-w05-execute-owner-blocked-result="true">
            <ShieldCheck size={15} />
            <span>{actionText(executeResult, "실행 요청이 기록되었습니다.")}</span>
          </div>
        )}
        {rollbackResult?.kind === "data" && (
          <div className="record-boundary-note" data-sf-b-w05-rollback-result="true">
            <ShieldCheck size={15} />
            <span>실제 가져오기 실행 전이라 되돌리기는 승인 기록 대기 상태입니다.</span>
          </div>
        )}

        <div data-sf-b-w05-error-report="true">
          <DataTable
            columns={["항목", "상태", "조치"]}
            rows={(errorRows.length > 0 ? errorRows : [{ row_label: "검증 요약", issue_category: "대기", remediation_hint: "사전 검증 후 확인" }]).map((item) => [
              item.row_label,
              issueLabel(item.issue_category),
              remediationLabel(item.remediation_hint)
            ])}
          />
        </div>
      </div>
    </Panel>
  );
}
