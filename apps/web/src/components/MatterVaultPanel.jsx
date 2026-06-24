import React from "react";
import { useEffect, useState } from "react";
import { FileClock, FilePlus2, FolderOpen, RefreshCw, ShieldCheck } from "lucide-react";
import {
  createMatterDocumentFacade,
  fetchMatterTimeline,
  fetchMatterVaultAudit,
  fetchMatterVaultDocuments,
  fetchMatterVaultSearch,
  fetchMatterVaultSummary
} from "../data/apiClient.js";
import { DataTable, Panel } from "./primitives.jsx";

function timelineRows(entries = []) {
  return entries.map((entry, index) => [
    `활동 ${index + 1}`,
    timelineTypeLabel(entry.type),
    entry.title,
    entry.source_ref ? "권한 적용" : "일반"
  ]);
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
    return "문서가 Vault에 연결되었습니다.";
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
        <strong>{noun} 정보를 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>{noun} 정보를 불러오지 못했습니다</strong>
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
    item.status ?? "active",
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
  const [documentResult, setDocumentResult] = useState(null);
  const [documentPending, setDocumentPending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setTimeline(null);
    setVaultDocuments(null);
    setVaultSearch(null);
    setVaultAudit(null);
    if (!matterId) return undefined;
    Promise.all([
      fetchMatterVaultSummary({ matterId, ctx: liveCtx }),
      fetchMatterTimeline({ matterId, ctx: liveCtx }),
      fetchMatterVaultDocuments({ matterId, ctx: liveCtx }),
      fetchMatterVaultSearch({ matterId, ctx: liveCtx }),
      fetchMatterVaultAudit({ matterId, ctx: liveCtx })
    ]).then(([nextSummary, nextTimeline, nextDocuments, nextSearch, nextAudit]) => {
      if (!cancelled) {
        setSummary(nextSummary);
        setTimeline(nextTimeline);
        setVaultDocuments(nextDocuments);
        setVaultSearch(nextSearch);
        setVaultAudit(nextAudit);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [matterId, liveCtx, refreshToken]);

  useEffect(() => {
    setDocumentResult(null);
  }, [matterId, liveCtx]);

  const item = summary?.kind === "data" ? summary.item : null;
  const entries = timeline?.kind === "data" ? timeline.item?.visible_entries ?? [] : [];
  const documentMessage = documentActionMessage(documentResult);
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

  let body;
  if (!matterId || summary === null || timeline === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Matter Vault를 불러오는 중입니다</strong>
      </div>
    );
  } else if (summary.kind === "error" || timeline.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Matter Vault를 불러오지 못했습니다</strong>
        잠시 후 다시 시도해주세요.
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
            <span>문서 내용과 원본 저장 경로는 표시하지 않습니다.</span>
          </div>
        )}
        {body}
      </div>
    </Panel>
  );
}
