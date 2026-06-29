import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, FileClock, FilePlus2, FileText, FolderOpen, Lock, MailPlus, RefreshCw, Send, ShieldCheck } from "lucide-react";
import {
  createMatterBuilderDraft,
  createMatterDocumentFacade,
  createMatterEmailDraft,
  fetchMatterBuilderApprovalRequests,
  fetchMatterBuilderDraftPreview,
  fetchMatterDocumentTemplates,
  fetchMatterTimeline,
  fetchMatterVaultAudit,
  fetchMatterVaultDocuments,
  fetchMatterVaultSearch,
  fetchMatterVaultSummary,
  fetchVaultBridgeStatus,
  fetchVaultUploadPreflight,
  patchMatterBuilderDraft,
  patchMatterEmailDraft,
  publishMatterBuilderDraftToVault,
  requestMatterBuilderApproval,
  requestMatterEmailDraftSendBoundary
} from "../data/apiClient.js";
import { DataTable, Panel } from "./primitives.jsx";

function timelineRows(entries = []) {
  return entries.map((entry, index) => [
    `활동 ${index + 1}`,
    timelineTypeLabel(entry.type),
    timelineTitleLabel(entry.title, index),
    entry.source_ref ? "권한 기준 적용" : "일반"
  ]);
}

function timelineTitleLabel(value, index = 0) {
  const text = String(value ?? "").trim();
  if (text === "Channel message") return "대화 메시지";
  return text || `활동 ${index + 1}`;
}

function timelineTypeLabel(value) {
  if (value === "document") return "문서";
  if (value === "note") return "메모";
  if (value === "event") return "활동";
  return "활동";
}

function documentActionMessage(result) {
  if (!result) return null;
  if (result.kind === "error") return "문서를 연결하지 못했습니다.";
  if (result.statusOutcome === "created" || result.statusOutcome === "idempotent_replay") {
    return "문서 참조가 Vault 메타데이터에 기록되었습니다.";
  }
  if (result.statusOutcome === "blocked" || result.statusOutcome === "review_required" || !result.item) {
    return "검토가 필요합니다.";
  }
  return "문서 연결 상태가 갱신되었습니다.";
}

function collectionItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function renderVaultCollectionState(result, noun) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>{noun} 목록을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>{noun} 목록을 불러오지 못했습니다</strong>
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>접근 권한이 없습니다</strong>
      </div>
    );
  }
  if (result.uiState === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
      </div>
    );
  }
  if (collectionItems(result).length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>표시할 {noun} 정보가 없습니다</strong>
      </div>
    );
  }
  return null;
}

function documentRows(result) {
  return collectionItems(result).map((item, index) => [
    item.title ?? `문서 ${index + 1}`,
    item.status === "active" ? "사용 중" : item.status ?? "확인 필요",
    item.registered_account_email ?? "등록 계정",
    item.storage_pointer_ref_included === false && item.document_bytes_included === false ? "보호됨" : "검토 필요"
  ]);
}

function searchRows(result) {
  return collectionItems(result).map((item, index) => [
    item.document_id ?? `결과 ${index + 1}`,
    item.version_id ?? "버전",
    Array.isArray(item.indexed_fields) ? item.indexed_fields.join(", ") : "색인",
    item.storage_pointer_ref_included === false && item.raw_text_included === false ? "보호됨" : "검토 필요"
  ]);
}

function auditRows(result) {
  return collectionItems(result).slice(0, 5).map((item, index) => [
    item.action ?? `감사 ${index + 1}`,
    item.object_type ?? "레코드",
    item.decision ?? "기록됨"
  ]);
}

function templateRows(result) {
  return collectionItems(result).map((item) => [
    item.label ?? item.template_id,
    item.category === "email" ? "이메일" : "문서",
    `${item.merge_field_count ?? 0}개`,
    item.requires_approval ? "승인 필요" : "내부 사용"
  ]);
}

function approvalRows(result) {
  return collectionItems(result).map((item, index) => [
    `승인 요청 ${index + 1}`,
    "문서 초안",
    item.status === "pending_owner_approval" ? "승인 대기" : item.status ?? "대기",
    item.reviewer_user_ref_included === false ? "보호됨" : "검토 필요"
  ]);
}

function workspaceMatterSelection(matterId, item) {
  if (!matterId) return null;
  const safeMatterId = String(matterId);
  return {
    selected_ref: `matter:${safeMatterId}`,
    matter_id: safeMatterId,
    matter_code: item?.matter_code ?? safeMatterId,
    matter_name: item?.matter_name ?? item?.title ?? "Matter",
    client_display_name: item?.client_display_name ?? "고객"
  };
}

function workspaceBridgeState(result) {
  if (result === null) return "loading";
  if (result.kind === "data" && result.runtimeWriteReady && result.repositoryDurable && !result.productionReadyClaim) return "source-ready";
  if (result.kind === "data") return "source-guarded";
  return "source-blocked";
}

function workspaceBridgeLabel(result) {
  if (result === null) return "Matter/Vault 원천 확인 중";
  if (result.kind === "data" && result.runtimeWriteReady && result.repositoryDurable && !result.productionReadyClaim) {
    return "Matter/Vault 원천 확인";
  }
  if (result.kind === "data") return "Matter/Vault 원천 보류";
  return "Matter/Vault 원천 차단";
}

function workspacePreflightState(result) {
  if (result === null) return "not-run";
  if (result.kind === "data" && result.outcome === "preflight_passed" && !result.productionReadyClaim) return "passed";
  if (result.kind === "guarded") return "guarded";
  return "blocked";
}

function workspacePreflightLabel(result) {
  if (result === null) return "사전검사 전";
  if (result.kind === "data" && result.outcome === "preflight_passed" && !result.productionReadyClaim) return "권한 확인만 완료";
  if (result.kind === "guarded") return "권한 확인 보류";
  return "사전검사 차단";
}

function builderMessage(result) {
  if (!result) return null;
  if (result.kind === "error") return "문서 초안 작업을 완료하지 못했습니다.";
  if (result.statusOutcome === "approval_required") return "승인 대기 상태로 등록되었습니다.";
  if (result.statusOutcome === "owner_blocked" || result.uiState === "owner_blocked") return "담당자 승인 후 진행할 수 있습니다.";
  if (result.statusOutcome === "created") return "문서 초안이 생성되었습니다.";
  if (result.statusOutcome === "updated") return "문서 초안이 검토 상태로 정리되었습니다.";
  return "문서 초안 상태가 갱신되었습니다.";
}

function emailMessage(result) {
  if (!result) return null;
  if (result.kind === "error") return "이메일 초안 작업을 완료하지 못했습니다.";
  if (result.statusOutcome === "provider_blocked" || result.uiState === "provider_blocked") return "외부 발송 연결이 필요해 대기 상태입니다.";
  if (result.statusOutcome === "created") return "이메일 초안이 생성되었습니다.";
  if (result.statusOutcome === "updated") return "이메일 초안이 갱신되었습니다.";
  return "이메일 초안 상태가 갱신되었습니다.";
}

function VaultCollectionTable({ result, noun, columns, rows, marker }) {
  const state = renderVaultCollectionState(result, noun);
  return (
    <div className="vault-preview-block" data-vault-preview={marker}>
      {state ?? <DataTable columns={columns} rows={rows} />}
    </div>
  );
}

export function MatterVaultPanel({ matterId, liveCtx = "allow" }) {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [vaultDocuments, setVaultDocuments] = useState(null);
  const [vaultSearch, setVaultSearch] = useState(null);
  const [vaultAudit, setVaultAudit] = useState(null);
  const [documentTemplates, setDocumentTemplates] = useState(null);
  const [approvalRequests, setApprovalRequests] = useState(null);
  const [documentResult, setDocumentResult] = useState(null);
  const [builderDraftResult, setBuilderDraftResult] = useState(null);
  const [builderPatchResult, setBuilderPatchResult] = useState(null);
  const [builderPreview, setBuilderPreview] = useState(null);
  const [builderApprovalResult, setBuilderApprovalResult] = useState(null);
  const [builderPublishResult, setBuilderPublishResult] = useState(null);
  const [emailDraftResult, setEmailDraftResult] = useState(null);
  const [emailPatchResult, setEmailPatchResult] = useState(null);
  const [emailSendResult, setEmailSendResult] = useState(null);
  const [workspaceBridgeResult, setWorkspaceBridgeResult] = useState(null);
  const [workspacePreflightResult, setWorkspacePreflightResult] = useState(null);
  const [documentPending, setDocumentPending] = useState(false);
  const [builderPending, setBuilderPending] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [workspacePreflightPending, setWorkspacePreflightPending] = useState(false);
  const [builderDraftId, setBuilderDraftId] = useState(null);
  const [emailDraftId, setEmailDraftId] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setTimeline(null);
    setVaultDocuments(null);
    setVaultSearch(null);
    setVaultAudit(null);
    setDocumentTemplates(null);
    setApprovalRequests(null);
    setWorkspaceBridgeResult(null);
    if (!matterId) return undefined;
    Promise.all([
      fetchMatterVaultSummary({ matterId, ctx: liveCtx }),
      fetchMatterTimeline({ matterId, ctx: liveCtx }),
      fetchMatterVaultDocuments({ matterId, ctx: liveCtx }),
      fetchMatterVaultSearch({ matterId, ctx: liveCtx }),
      fetchMatterVaultAudit({ matterId, ctx: liveCtx }),
      fetchMatterDocumentTemplates({ matterId, ctx: liveCtx }),
      fetchMatterBuilderApprovalRequests({ matterId, ctx: liveCtx }),
      fetchVaultBridgeStatus({ ctx: liveCtx })
    ]).then(([nextSummary, nextTimeline, nextDocuments, nextSearch, nextAudit, nextTemplates, nextApprovals, nextBridge]) => {
      if (!cancelled) {
        setSummary(nextSummary);
        setTimeline(nextTimeline);
        setVaultDocuments(nextDocuments);
        setVaultSearch(nextSearch);
        setVaultAudit(nextAudit);
        setDocumentTemplates(nextTemplates);
        setApprovalRequests(nextApprovals);
        setWorkspaceBridgeResult(nextBridge);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [matterId, liveCtx, refreshToken]);

  useEffect(() => {
    setDocumentResult(null);
    setBuilderDraftResult(null);
    setBuilderPatchResult(null);
    setBuilderPreview(null);
    setBuilderApprovalResult(null);
    setBuilderPublishResult(null);
    setEmailDraftResult(null);
    setEmailPatchResult(null);
    setEmailSendResult(null);
    setWorkspacePreflightResult(null);
    setWorkspacePreflightPending(false);
    setBuilderDraftId(null);
    setEmailDraftId(null);
  }, [matterId, liveCtx]);

  const item = summary?.kind === "data" ? summary.item : null;
  const entries = timeline?.kind === "data" ? timeline.item?.visible_entries ?? [] : [];
  const documentMessage = documentActionMessage(documentResult);
  const workspaceMatter = workspaceMatterSelection(matterId, item);
  const workspacePreflightPassed =
    workspacePreflightResult?.kind === "data" &&
    workspacePreflightResult.outcome === "preflight_passed" &&
    workspacePreflightResult.productionReadyClaim !== true;
  const canRunDocumentWorkspacePreflight =
    Boolean(workspaceMatter && workspaceBridgeResult?.kind === "data") && !workspacePreflightPending;
  const workspacePublishState = !builderDraftId ? "draft-required" : workspacePreflightPassed ? "owner-blocked" : "preflight-required";
  const workspaceImportDryRunState = workspacePreflightPassed ? "dry-run-ready" : "preflight-required";
  const workspaceImportExecuteState = workspacePreflightPassed ? "owner-provider-blocked" : "preflight-required";
  const workspaceEmailSendState = emailDraftId ? "provider-blocked" : "draft-required";
  const hasVaultCollectionPreview =
    collectionItems(vaultDocuments).length > 0 ||
    collectionItems(vaultSearch).length > 0 ||
    collectionItems(vaultAudit).length > 0;

  async function handleCreateDocument() {
    if (!matterId || !item || documentPending) return;
    setDocumentPending(true);
    const next = await createMatterDocumentFacade({
      matterId,
      title: "Matter 문서 연결 기록",
      contentText: "Matter 문서 연결 기록",
      ctx: liveCtx
    });
    setDocumentResult(next);
    setDocumentPending(false);
    if (next.kind === "data" && next.item) setRefreshToken((value) => value + 1);
  }

  async function handleWorkspacePreflight() {
    if (!canRunDocumentWorkspacePreflight) return;
    setWorkspacePreflightPending(true);
    const next = await fetchVaultUploadPreflight({
      ctx: liveCtx,
      selectedMatter: workspaceMatter,
      bridgeStatus: workspaceBridgeResult
    });
    setWorkspacePreflightResult(next);
    setWorkspacePreflightPending(false);
  }

  async function handleCreateBuilderDraft() {
    if (!matterId || builderPending) return;
    setBuilderPending(true);
    const next = await createMatterBuilderDraft({ matterId, ctx: liveCtx });
    setBuilderDraftResult(next);
    if (next.kind === "data" && next.item?.draft_id) {
      setBuilderDraftId(next.item.draft_id);
      const preview = await fetchMatterBuilderDraftPreview({ matterId, draftId: next.item.draft_id, ctx: liveCtx });
      setBuilderPreview(preview);
    }
    setBuilderPending(false);
  }

  async function handlePatchBuilderDraft() {
    if (!matterId || !builderDraftId || builderPending) return;
    setBuilderPending(true);
    const next = await patchMatterBuilderDraft({ matterId, draftId: builderDraftId, ctx: liveCtx });
    setBuilderPatchResult(next);
    const preview = await fetchMatterBuilderDraftPreview({ matterId, draftId: builderDraftId, ctx: liveCtx });
    setBuilderPreview(preview);
    setBuilderPending(false);
  }

  async function handleRequestBuilderApproval() {
    if (!matterId || !builderDraftId || builderPending) return;
    setBuilderPending(true);
    const next = await requestMatterBuilderApproval({ matterId, draftId: builderDraftId, ctx: liveCtx });
    setBuilderApprovalResult(next);
    const approvals = await fetchMatterBuilderApprovalRequests({ matterId, ctx: liveCtx });
    setApprovalRequests(approvals);
    setBuilderPending(false);
  }

  async function handlePublishBuilderDraft() {
    if (!matterId || !builderDraftId || builderPending || !workspacePreflightPassed) return;
    setBuilderPending(true);
    const next = await publishMatterBuilderDraftToVault({ matterId, draftId: builderDraftId, ctx: liveCtx });
    setBuilderPublishResult(next);
    setBuilderPending(false);
  }

  async function handleCreateEmailDraft() {
    if (!matterId || emailPending) return;
    setEmailPending(true);
    const next = await createMatterEmailDraft({ matterId, ctx: liveCtx });
    setEmailDraftResult(next);
    if (next.kind === "data" && next.item?.draft_id) setEmailDraftId(next.item.draft_id);
    setEmailPending(false);
  }

  async function handlePatchEmailDraft() {
    if (!matterId || !emailDraftId || emailPending) return;
    setEmailPending(true);
    const next = await patchMatterEmailDraft({ matterId, draftId: emailDraftId, ctx: liveCtx });
    setEmailPatchResult(next);
    setEmailPending(false);
  }

  async function handleEmailSendBoundary() {
    if (!matterId || !emailDraftId || emailPending) return;
    setEmailPending(true);
    const next = await requestMatterEmailDraftSendBoundary({ matterId, draftId: emailDraftId, ctx: liveCtx });
    setEmailSendResult(next);
    setEmailPending(false);
  }

  let body;
  if (!matterId && liveCtx === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>접근 권한이 없습니다</strong>
        권한이 있는 Matter Vault 정보만 표시됩니다.
      </div>
    );
  } else if (!matterId && liveCtx === "review") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 Matter Vault 정보를 확인할 수 있습니다.
      </div>
    );
  } else if (!matterId || summary === null || timeline === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Matter Vault를 불러오는 중입니다</strong>
      </div>
    );
  } else if (summary.kind === "error" || timeline.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Matter Vault를 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  } else if (summary.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>접근 권한이 없습니다</strong>
        권한이 있는 Vault 정보만 표시됩니다.
      </div>
    );
  } else if (summary.uiState === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 Vault 정보를 확인할 수 있습니다.
      </div>
    );
  } else if (!item && !hasVaultCollectionPreview) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>연결된 Vault가 없습니다</strong>
      </div>
    );
  } else {
    body = (
      <div className="vault-live-stack">
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>문서 내용은 권한이 있을 때만 표시됩니다.</span>
        </div>
        <div
          className={`vault-action-boundary ${workspacePreflightPassed ? "ready" : workspaceBridgeResult?.kind === "data" ? "blocked" : "error"}`}
          data-lcx-vltui-03-document-workspace-boundary="true"
          data-lcx-vltui-03-vault-source-state={workspaceBridgeState(workspaceBridgeResult)}
          data-lcx-vltui-03-preflight-state={workspacePreflightState(workspacePreflightResult)}
          data-lcx-vltui-03-publish-state={workspacePublishState}
          data-lcx-vltui-03-publish-write-enabled="false"
          data-lcx-vltui-03-import-dry-run-state={workspaceImportDryRunState}
          data-lcx-vltui-03-import-execute-state={workspaceImportExecuteState}
          data-lcx-vltui-03-email-send-state={workspaceEmailSendState}
          data-lcx-vltui-03-preflight-ref={workspacePreflightResult?.preflightRef ?? ""}
        >
          <div className="vault-action-boundary-strip">
            <ShieldCheck size={15} />
            <span>문서 작업 사전검사</span>
            <button
              className="secondary-button vault-action-boundary-action"
              data-lcx-vltui-03-preflight-action="true"
              disabled={!canRunDocumentWorkspacePreflight}
              onClick={handleWorkspacePreflight}
            >
              <Eye size={15} />
              {workspacePreflightPending ? "사전검사 중" : "문서 사전검사"}
            </button>
          </div>
          <div className="vault-action-boundary-list">
            <div className="vault-action-boundary-row" data-lcx-vltui-03-source-row="true">
              <div className="vault-action-boundary-main">
                <strong>Matter app 원천</strong>
                <span>{workspaceBridgeLabel(workspaceBridgeResult)}</span>
              </div>
              <div className="vault-action-boundary-meta">
                <span>{workspaceBridgeResult?.kind === "data" ? "bridge status read" : "fail-closed"}</span>
              </div>
            </div>
            <div className="vault-action-boundary-row" data-lcx-vltui-03-preflight-row="true">
              <div className="vault-action-boundary-main">
                <strong>권한 확인</strong>
                <span>{workspacePreflightLabel(workspacePreflightResult)}</span>
              </div>
              <div className="vault-action-boundary-meta">
                <span>{workspacePreflightResult?.preflightRef ?? "reference-only"}</span>
              </div>
            </div>
            <div className="vault-action-boundary-row" data-lcx-vltui-03-publish-boundary="true">
              <div className="vault-action-boundary-main">
                <strong>Vault 게시</strong>
                <span>{workspacePublishState === "owner-blocked" ? "게시 요청만 가능, 쓰기 차단" : "초안과 사전검사 필요"}</span>
              </div>
              <div className="vault-action-boundary-meta">
                <span>write=false</span>
              </div>
            </div>
            <div className="vault-action-boundary-row" data-lcx-vltui-03-import-boundary="true">
              <div className="vault-action-boundary-main">
                <strong>문서 가져오기</strong>
                <span>{workspaceImportDryRunState === "dry-run-ready" ? "Dry-run만 열림, 실행은 차단" : "사전검사 전 실행 차단"}</span>
              </div>
              <div className="vault-action-boundary-meta">
                <span>{workspaceImportExecuteState}</span>
              </div>
            </div>
            <div className="vault-action-boundary-row" data-lcx-vltui-03-email-send-boundary="true">
              <div className="vault-action-boundary-main">
                <strong>외부 발송</strong>
                <span>{workspaceEmailSendState === "provider-blocked" ? "초안 후 provider-blocked" : "초안 필요"}</span>
              </div>
              <div className="vault-action-boundary-meta">
                <span>outlook_graph=false</span>
              </div>
            </div>
          </div>
          {workspacePreflightResult && (
            <div className="live-data-state live-data-review" data-lcx-vltui-03-preflight-result="true">
              <strong>{workspacePreflightLabel(workspacePreflightResult)}</strong>
              <span>문서 바이트, 원본 저장 경로, 운영 준비 주장은 표시하지 않습니다.</span>
            </div>
          )}
        </div>
        <DataTable columns={["활동", "유형", "제목", "표시 범위"]} rows={timelineRows(entries)} />
        <VaultCollectionTable
          result={vaultDocuments}
          noun="문서함"
          marker="matter-vault-documents"
          columns={["문서", "상태", "계정", "보호"]}
          rows={documentRows(vaultDocuments)}
        />
        <VaultCollectionTable
          result={vaultSearch}
          noun="검색"
          marker="matter-vault-search"
          columns={["문서", "버전", "색인", "보안"]}
          rows={searchRows(vaultSearch)}
        />
        <VaultCollectionTable
          result={vaultAudit}
          noun="감사"
          marker="matter-vault-audit"
          columns={["이벤트", "대상", "상태"]}
          rows={auditRows(vaultAudit)}
        />
        <div className="vault-preview-block" data-sf-b-w04-document-builder="true" data-matter-document-builder="route-backed">
          <div className="vault-safe-strip">
            <FileText size={15} />
            <span>문서 초안</span>
          </div>
          <VaultCollectionTable
            result={documentTemplates}
            noun="템플릿"
            marker="matter-builder-templates"
            columns={["템플릿", "유형", "필드", "승인"]}
            rows={templateRows(documentTemplates)}
          />
          <div className="record-action-strip" data-sf-b-w04-template-picker="true">
            <span>{builderDraftId ? "문서 초안 준비됨" : "템플릿 선택 후 초안을 만들 수 있습니다"}</span>
            <button className="secondary-button" data-sf-b-w04-builder-draft-action="true" disabled={builderPending} onClick={handleCreateBuilderDraft}>
              <FilePlus2 size={15} />
              {builderPending ? "처리 중" : "초안 생성"}
            </button>
            <button className="secondary-button" disabled={!builderDraftId || builderPending} onClick={handlePatchBuilderDraft}>
              <CheckCircle2 size={15} />
              검토 준비
            </button>
            <button className="secondary-button" disabled={!builderDraftId || builderPending} onClick={handleRequestBuilderApproval} data-sf-b-w04-builder-approval-action="true">
              <Lock size={15} />
              승인 요청
            </button>
            <button
              className="secondary-button"
              disabled={!builderDraftId || builderPending || !workspacePreflightPassed}
              onClick={handlePublishBuilderDraft}
              data-sf-b-w04-builder-publish-action="true"
              data-lcx-vltui-03-publish-action-state={workspacePublishState}
            >
              <FolderOpen size={15} />
              Vault 등록 요청
            </button>
          </div>
          {builderDraftResult && (
            <div className="live-data-state live-data-review" data-sf-b-w04-builder-draft-result="true">
              <strong>{builderMessage(builderDraftResult)}</strong>
              <span>본문과 병합 값은 숨깁니다.</span>
            </div>
          )}
          {builderPatchResult && (
            <div className="live-data-state live-data-review" data-sf-b-w04-builder-patch-result="true">
              <strong>{builderMessage(builderPatchResult)}</strong>
              <span>검토 상태와 감사 기록만 표시됩니다.</span>
            </div>
          )}
          {builderPreview?.kind === "data" && (
            <div className="live-data-state live-data-review" data-sf-b-w04-builder-preview="true">
              <strong>{builderPreview.item?.title ?? "문서 미리보기"}</strong>
              <span>{Array.isArray(builderPreview.item?.preview_sections) ? builderPreview.item.preview_sections.join(" / ") : "미리보기 대기"}</span>
            </div>
          )}
          {builderApprovalResult && (
            <div className="live-data-state live-data-review" data-sf-b-w04-builder-approval-result="true">
              <strong>{builderMessage(builderApprovalResult)}</strong>
              <span>승인자 식별값은 숨깁니다.</span>
            </div>
          )}
          {builderPublishResult && (
            <div className="live-data-state live-data-denied" data-sf-b-w04-builder-publish-blocked-result="true">
              <strong>{builderMessage(builderPublishResult)}</strong>
              <span>Vault 문서 쓰기는 승인과 실행 증거 전까지 차단됩니다.</span>
            </div>
          )}
          <VaultCollectionTable
            result={approvalRequests}
            noun="승인 요청"
            marker="matter-builder-approvals"
            columns={["요청", "초안", "상태", "보호"]}
            rows={approvalRows(approvalRequests)}
          />
        </div>
        <div className="vault-preview-block" data-sf-b-w04-email-composer="true" data-matter-email-composer="provider-blocked">
          <div className="vault-safe-strip">
            <MailPlus size={15} />
            <span>이메일 초안</span>
          </div>
          <div className="record-action-strip">
            <span>{emailDraftId ? "이메일 초안 준비됨" : "초안 작성 후 발송 경계를 확인할 수 있습니다"}</span>
            <button className="secondary-button" disabled={emailPending} onClick={handleCreateEmailDraft} data-sf-b-w04-email-draft-action="true">
              <FilePlus2 size={15} />
              {emailPending ? "처리 중" : "초안 생성"}
            </button>
            <button className="secondary-button" disabled={!emailDraftId || emailPending} onClick={handlePatchEmailDraft}>
              <Eye size={15} />
              내용 정리
            </button>
            <button className="secondary-button" disabled={!emailDraftId || emailPending} onClick={handleEmailSendBoundary} data-sf-b-w04-email-send-boundary-action="true">
              <Send size={15} />
              발송 요청
            </button>
          </div>
          {emailDraftResult && (
            <div className="live-data-state live-data-review" data-sf-b-w04-email-draft-result="true">
              <strong>{emailMessage(emailDraftResult)}</strong>
              <span>수신자와 본문 원문은 숨깁니다.</span>
            </div>
          )}
          {emailPatchResult && (
            <div className="live-data-state live-data-review" data-sf-b-w04-email-patch-result="true">
              <strong>{emailMessage(emailPatchResult)}</strong>
              <span>초안 메타데이터만 갱신됩니다.</span>
            </div>
          )}
          {emailSendResult && (
            <div className="live-data-state live-data-denied" data-sf-b-w04-email-send-provider-blocked="true">
              <strong>{emailMessage(emailSendResult)}</strong>
              <span>발송 성공 상태로 처리하지 않습니다.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Panel id="matter-vault" className="record-list-panel matter-runtime-panel" title="Matter Vault" meta="문서 연결">
      <div
        className="matter-vault-panel"
        data-mv-matter-vault-panel="true"
        data-matter-vault-record-workspace="true"
      >
        <div className="matter-vault-actions">
          <span>
            <FolderOpen size={15} />
            {item ? "Vault 연결됨" : hasVaultCollectionPreview ? "Vault 미리보기" : "Vault 미연결"}
          </span>
          <span>
            <FileClock size={15} />
            {item
              ? `${item.document_count ?? 0}개 문서`
              : hasVaultCollectionPreview
                ? "등록 Vault 저장소"
                : "Matter 선택 후 문서 기록을 확인할 수 있습니다"}
          </span>
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
          <button
            className="primary-button"
            data-matter-document-facade-action="true"
            disabled={!item || documentPending}
            onClick={handleCreateDocument}
          >
            <FilePlus2 size={15} />
            {documentPending ? "연결 중" : "문서 연결"}
          </button>
        </div>
        {documentMessage && (
          <div className="live-data-state live-data-review" data-matter-document-facade-result="true">
            <strong>{documentMessage}</strong>
            <span>문서 내용과 원본 저장 경로는 숨깁니다.</span>
          </div>
        )}
        {body}
      </div>
    </Panel>
  );
}
