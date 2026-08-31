import React, { useEffect, useRef, useState } from "react";
import { Bookmark, CheckCircle2, FileText, Mail, RefreshCw, Search, Share2, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import {
  fetchMatterRecords,
  fetchMatterVaultSummary,
  fetchVaultAudit,
  fetchVaultDocuments,
  fetchVaultSearch,
  fetchVaultSearchPreferences,
  writeVaultSearchPreferences
} from "../data/apiClient.js";
import {
  EMPTY_VAULT_CAPABILITY_PROJECTION,
  vaultCapabilityAllowed
} from "../data/vaultCapabilities.js";
import heroVaultArchitecture from "../assets/heroes/hero-vault-architecture.jpg";
import { DesktopDeniedState } from "./DesktopDeniedState.jsx";
import { ForestHero } from "./ForestHero.jsx";
import { VaultDocumentDetail } from "./VaultDocumentDetail.jsx";

const VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";
const SEARCH_QUERY_LIMIT = 200;
const SEARCH_RECENT_LIMIT = 20;
const SAFE_DOCUMENT_TARGET_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SAFE_DOCUMENT_TARGET_SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_FILE_BRIDGE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const SAFE_VAULT_MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const VAULT_DESKTOP_EXPORT_MAX_BYTES = 25 * 1024 * 1024;
const VAULT_PREVIEW_EXTENSION_BY_MIME_TYPE = new Map([
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
  ["text/csv", "csv"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
]);
const EMPTY_SEARCH_PREFERENCES = Object.freeze({ recent: [], saved: [] });
const VAULT_SECTIONS = new Set([
  "vault-home",
  "vault-files",
  "vault-recent",
  "vault-favorites",
  "vault-upload",
  "vault-search-all",
  "vault-search-recent",
  "vault-search-saved",
  "vault-work",
  "vault-checkout",
  "vault-review",
  "vault-outlook",
  "vault-email",
  "vault-audit",
  "vault-ethical-wall",
  "vault-records",
  "vault-dlp"
]);
const SEARCH_SECTIONS = new Set([
  "vault-home",
  "vault-search-all",
  "vault-search-recent",
  "vault-search-saved"
]);
const DOCUMENT_SECTIONS = new Set([
  "vault-home",
  "vault-files",
  "vault-recent",
  "vault-outlook",
  "vault-records"
]);
const SECTION_CAPABILITIES = Object.freeze({
  "vault-home": ["read"],
  "vault-files": ["read"],
  "vault-recent": ["read"],
  "vault-favorites": ["read"],
  "vault-upload": ["upload"],
  "vault-search-all": ["read"],
  "vault-search-recent": ["read"],
  "vault-search-saved": ["read"],
  "vault-work": ["work"],
  "vault-checkout": ["work"],
  "vault-review": ["work"],
  "vault-outlook": ["attach"],
  "vault-email": ["upload"],
  "vault-audit": ["audit"],
  "vault-ethical-wall": ["governance"],
  "vault-records": ["governance", "read"],
  "vault-dlp": ["governance"]
});

function vaultLabel(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

export function matchesVaultDocumentTarget(document, {
  documentId = "",
  matterId = "",
  versionId = "",
  sha256 = ""
} = {}) {
  if (!document || !SAFE_DOCUMENT_TARGET_ID.test(documentId)
      || document.document_id !== documentId) return false;
  const immutableTarget = Boolean(matterId || versionId || sha256);
  if (!immutableTarget) return true;
  if (!SAFE_DOCUMENT_TARGET_ID.test(matterId)
      || !SAFE_DOCUMENT_TARGET_ID.test(versionId)
      || !SAFE_DOCUMENT_TARGET_SHA256.test(sha256)) return false;
  return document.matter_id === matterId
    && (document.current_version_id ?? document.version_id) === versionId
    && (document.latest_sha256 ?? document.content_sha256) === sha256;
}

function normalizeSearchFilters(value = {}) {
  const dateFrom = typeof value.date_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date_from) ? value.date_from : null;
  const dateTo = typeof value.date_to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date_to) ? value.date_to : null;
  return {
    current_version_only: true,
    date_from: dateFrom,
    date_to: dateTo
  };
}

function searchPreferenceKey(value) {
  const filters = normalizeSearchFilters(value);
  return JSON.stringify([String(value?.query ?? "").trim(), filters.current_version_only, filters.date_from, filters.date_to]);
}

function searchRecord(value) {
  if (!value || typeof value.query !== "string" || typeof value.searched_at !== "string") return null;
  const query = value.query.trim().slice(0, SEARCH_QUERY_LIMIT);
  const searchedAt = Date.parse(value.searched_at);
  if (!query || !Number.isFinite(searchedAt)) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `${query}:${value.searched_at}`,
    query,
    scope: "documents-ocr",
    searched_at: new Date(searchedAt).toISOString(),
    ...normalizeSearchFilters(value)
  };
}

export function normalizeSearchPreferences(value) {
  return {
    recent: (Array.isArray(value?.recent) ? value.recent : []).map(searchRecord).filter(Boolean).slice(0, SEARCH_RECENT_LIMIT),
    saved: (Array.isArray(value?.saved) ? value.saved : []).map(searchRecord).filter(Boolean)
  };
}

export function rememberSearch(current, query, filters = {}) {
  const normalized = String(query ?? "").trim().slice(0, SEARCH_QUERY_LIMIT);
  if (!normalized) return current;
  const preference = { query: normalized, scope: "documents-ocr", searched_at: new Date().toISOString(), ...normalizeSearchFilters(filters) };
  return {
    ...current,
    recent: [
      { id: `recent:${Date.now()}`, ...preference },
      ...current.recent.filter((item) => searchPreferenceKey(item) !== searchPreferenceKey(preference))
    ].slice(0, SEARCH_RECENT_LIMIT)
  };
}

export function saveSearch(current, query, filters = {}) {
  const normalized = String(query ?? "").trim().slice(0, SEARCH_QUERY_LIMIT);
  if (!normalized) return current;
  const preference = { query: normalized, scope: "documents-ocr", searched_at: new Date().toISOString(), ...normalizeSearchFilters(filters) };
  if (current.saved.some((item) => searchPreferenceKey(item) === searchPreferenceKey(preference))) return current;
  return { ...current, saved: [{ id: `saved:${Date.now()}`, ...preference }, ...current.saved] };
}

export function removeSavedSearch(current, id) {
  return { ...current, saved: current.saved.filter((item) => item.id !== id) };
}

export function clearRecentSearches(current) {
  return { ...current, recent: [] };
}

export function vaultSectionAllowed(section, capabilities) {
  const required = SECTION_CAPABILITIES[section] ?? ["read"];
  return required.every((capability) => vaultCapabilityAllowed(capabilities, capability));
}

function VaultCard({ title, section, count, labels, className = "", children }) {
  return (
    <section className={`home-dashboard-card amic-search-card ${className}`.trim()} data-amic-vault-section={section}>
      <header className="home-dashboard-card-header">
        <div><span>{title}</span></div>
        {Number.isFinite(count) && <strong>{count}{labels?.language === "English" ? "" : "건"}</strong>}
      </header>
      <div className="home-dashboard-card-body">{children}</div>
    </section>
  );
}

function CapabilityBoundary({ labels, capabilities }) {
  const unavailable = capabilities?.authoritative !== true;
  return (
    <section className="vault-capability-boundary" data-vault-capability-boundary={unavailable ? "unavailable" : "denied"} role="status">
      <ShieldCheck size={19} aria-hidden="true" />
      <div>
        <strong>{unavailable
          ? vaultLabel(labels, "vaultCapabilityUnavailableTitle", "Vault 권한을 확인할 수 없습니다")
          : vaultLabel(labels, "vaultCapabilityDeniedTitle", "이 Vault 기능을 사용할 권한이 없습니다")}</strong>
        <p>{unavailable
          ? vaultLabel(labels, "vaultCapabilityUnavailableDescription", "서버의 Vault 연결과 계정 매핑이 확인될 때까지 문서 정보와 건수를 표시하지 않습니다.")
          : vaultLabel(labels, "vaultCapabilityDeniedDescription", "권한 변경은 Vault 관리자가 처리합니다.")}</p>
      </div>
    </section>
  );
}

function PendingBoundary({ icon: Icon = ShieldCheck, title, children, marker }) {
  return (
    <section className="vault-pending-boundary" data-vault-pending-boundary={marker} role="status">
      <Icon size={18} aria-hidden="true" />
      <div><strong>{title}</strong><p>{children}</p></div>
    </section>
  );
}

function matchLabel(fields = [], labels) {
  const matches = fields.flatMap((field) => {
    if (field === "body_text" || field === "ocr_text") return [vaultLabel(labels, "searchMatchBody", "본문")];
    if (field === "title") return [vaultLabel(labels, "searchMatchTitle", "제목")];
    if (field === "matter_id") return ["Matter"];
    if (field === "version_id") return [vaultLabel(labels, "searchMatchVersion", "버전")];
    return [];
  });
  return [...new Set(matches)].join(" / ") || vaultLabel(labels, "searchDocumentFallback", "문서");
}

function documentTitle(item, index, labels) {
  return item?.title ?? item?.document_name ?? `${vaultLabel(labels, "searchDocumentFallback", "문서")} ${index + 1}`;
}

function DocumentRows({ items, emptyText, labels, onOpen, searchMatches = false }) {
  if (items.length === 0) return <div className="amic-search-empty">{emptyText}</div>;
  return (
    <div className="amic-search-list" data-vault-document-list="true">
      {items.map((item, index) => (
        <button type="button" className="amic-search-row" key={item.document_id ?? item.version_id ?? `${documentTitle(item, index, labels)}-${index}`} onClick={() => onOpen?.(item)}>
          <FileText size={17} aria-hidden="true" />
          <strong>{documentTitle(item, index, labels)}</strong>
          <span>{searchMatches
            ? matchLabel(item.match_fields, labels)
            : item.current_version_id || item.version_id
              ? vaultLabel(labels, "documentCurrentVersion", "현재 버전")
              : vaultLabel(labels, "documentReviewRequired", "확인 필요")}</span>
        </button>
      ))}
    </div>
  );
}

function DocumentCollectionState({ result, labels, onOpen, onRetry, limit = null }) {
  if (result === null) return <div className="amic-search-empty">{vaultLabel(labels, "searchDocumentsLoading", "문서를 불러오는 중입니다")}</div>;
  if (result.kind === "error") {
    return (
      <div className="vault-retry-state">
        <span>{vaultLabel(labels, "searchDocumentsError", "문서를 불러오지 못했습니다")}</span>
        <button type="button" className="text-button" onClick={onRetry}><RefreshCw size={14} />{vaultLabel(labels, "vaultRetryLabel", "다시 불러오기")}</button>
      </div>
    );
  }
  if (result.uiState === "denied") return <DesktopDeniedState />;
  if (result.uiState === "review_required") return <div className="live-data-state"><strong>{vaultLabel(labels, "searchReviewTitle", "검토가 필요합니다")}</strong>{vaultLabel(labels, "searchReviewDocuments", "문서 접근 권한을 확인하세요.")}</div>;
  const items = limit === null ? result.items : result.items.slice(0, limit);
  return <DocumentRows items={items} emptyText={vaultLabel(labels, "searchDocumentsEmpty", "최근 문서가 없습니다")} labels={labels} onOpen={onOpen} />;
}

function SearchResults({ result, pending, submittedQuery, labels, onOpen }) {
  if (pending) return <div className="amic-search-empty">{vaultLabel(labels, "searchLoading", "검색 중입니다")}</div>;
  if (!submittedQuery) return <div className="amic-search-empty">{vaultLabel(labels, "searchInputEmpty", "검색어를 입력하면 결과가 표시됩니다")}</div>;
  if (result?.kind === "error") return <div className="amic-search-empty">{vaultLabel(labels, "searchResultsError", "검색 결과를 불러오지 못했습니다")}</div>;
  if (result?.uiState === "denied") return <DesktopDeniedState />;
  if (result?.uiState === "review_required") return <div className="live-data-state"><strong>{vaultLabel(labels, "searchReviewTitle", "검토가 필요합니다")}</strong>{vaultLabel(labels, "searchReviewResults", "권한 검토 후 다시 검색하세요.")}</div>;
  return <DocumentRows items={result?.kind === "data" ? result.items : []} emptyText={vaultLabel(labels, "searchResultsEmpty", "검색 결과가 없습니다")} labels={labels} onOpen={onOpen} searchMatches />;
}

function SearchPreferenceState({ state, labels, children }) {
  if (state === "ready") return children;
  if (state === "loading") return <div className="amic-search-empty">{vaultLabel(labels, "searchHistoryPreferenceLoading", "검색 기록을 불러오는 중입니다")}</div>;
  if (state === "denied") return <DesktopDeniedState />;
  if (state === "review_required") return <div className="live-data-state"><strong>{vaultLabel(labels, "searchReviewTitle", "검토가 필요합니다")}</strong>{vaultLabel(labels, "searchReviewHistory", "검색 기록 권한을 확인하세요.")}</div>;
  return <div className="amic-search-empty">{vaultLabel(labels, "searchHistoryPreferenceError", "검색 기록을 불러오지 못했습니다")}</div>;
}

function SearchHistoryRows({ items, labels, onRun, onDelete, deleteDisabled = false }) {
  if (items.length === 0) return <div className="amic-search-empty">{vaultLabel(labels, "searchHistoryEmpty", "표시할 기록이 없습니다.")}</div>;
  return (
    <div className="search-query-list">
      {items.map((item) => (
        <div className="search-query-row" key={item.id}>
          <button type="button" className="search-query-open" data-compact-record="true" onClick={() => onRun(item)}>
            <Search size={16} aria-hidden="true" />
            <span><strong>{item.query}</strong><time dateTime={item.searched_at}>{new Date(item.searched_at).toLocaleDateString(labels?.language === "English" ? "en-US" : "ko-KR")}</time></span>
          </button>
          {onDelete && <button type="button" className="icon-button" disabled={deleteDisabled} aria-label={`${item.query} ${vaultLabel(labels, "searchDeleteSuffix", "삭제")}`} onClick={() => onDelete(item.id)}><Trash2 size={15} /></button>}
        </div>
      ))}
    </div>
  );
}

function SearchForm({ labels, query, setQuery, dateFrom, setDateFrom, dateTo, setDateTo, pending, preferenceError, onSubmit }) {
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  return (
    <VaultCard title={vaultLabel(labels, "searchFormTitle", "전체 검색")} section="search" labels={labels} className="amic-search-query-card">
      <form className="amic-search-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <Search size={19} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={vaultLabel(labels, "searchSubmit", "검색")} placeholder={vaultLabel(labels, "searchPlaceholder", "문서 제목, 본문, Matter 검색")} />
        <button type="submit" disabled={!query.trim() || pending || invalidDateRange}>{vaultLabel(labels, "searchSubmit", "검색")}</button>
      </form>
      <div className="amic-search-filters" aria-label={vaultLabel(labels, "searchDocumentsLabel", "문서")}>
        <span className="amic-search-version-filter">{vaultLabel(labels, "searchCurrentVersionOnly", "현재 버전만")}</span>
        <label><span>{vaultLabel(labels, "searchDateFrom", "시작일")}</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label><span>{vaultLabel(labels, "searchDateTo", "종료일")}</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
      </div>
      {invalidDateRange && <p className="search-preference-error" role="alert">{vaultLabel(labels, "searchDateRangeError", "시작일은 종료일보다 늦을 수 없습니다")}</p>}
      {preferenceError && <p className="search-preference-error" role="alert">{vaultLabel(labels, "searchPreferenceError", "검색 기록을 저장하지 못했습니다")}</p>}
    </VaultCard>
  );
}

function VaultOverview({ labels, documentCount }) {
  return (
    <VaultCard title={vaultLabel(labels, "vaultOverviewTitle", "문서 현황")} section="overview" labels={labels}>
      <dl className="vault-overview-facts">
        <div><dt>{vaultLabel(labels, "vaultDocumentCountLabel", "조회 가능한 문서")}</dt><dd>{Number.isFinite(documentCount) ? documentCount : "—"}</dd></div>
        <div><dt>{vaultLabel(labels, "vaultExactVersionLabel", "버전 기준")}</dt><dd>{vaultLabel(labels, "vaultExactVersionValue", "Vault 현재 버전")}</dd></div>
        <div><dt>{vaultLabel(labels, "vaultAuthorityLabel", "문서 권위")}</dt><dd>{vaultLabel(labels, "vaultAuthorityValue", "Vault 서버")}</dd></div>
      </dl>
    </VaultCard>
  );
}

function VaultAuditState({ result, labels, onRetry }) {
  if (result === null) return <div className="amic-search-empty">{vaultLabel(labels, "vaultAuditLoading", "감사 이벤트를 불러오는 중입니다.")}</div>;
  if (result.kind === "error") return <div className="vault-retry-state"><span>{vaultLabel(labels, "vaultAuditError", "감사 이벤트를 불러오지 못했습니다.")}</span><button type="button" className="text-button" onClick={onRetry}><RefreshCw size={14} />{vaultLabel(labels, "vaultRetryLabel", "다시 불러오기")}</button></div>;
  if (result.kind === "guarded") return <DesktopDeniedState />;
  if (result.items.length === 0) return <div className="amic-search-empty">{vaultLabel(labels, "vaultAuditEmpty", "표시할 Vault 감사 이벤트가 없습니다.")}</div>;
  return (
    <div className="vault-audit-list" role="list">
      {result.items.map((item, index) => {
        const timestamp = item.occurred_at ?? item.created_at ?? item.timestamp ?? "";
        return (
          <div className="vault-audit-row" role="listitem" key={item.event_id ?? item.audit_event_id ?? `audit-${index}`}>
            <ShieldCheck size={16} aria-hidden="true" />
            <strong>{item.action ?? vaultLabel(labels, "vaultAuditActionLabel", "작업")}</strong>
            <span>{item.decision ?? item.outcome ?? "—"}</span>
            <time dateTime={timestamp || undefined}>{timestamp ? new Date(timestamp).toLocaleString(labels?.language === "English" ? "en-US" : "ko-KR") : "—"}</time>
          </div>
        );
      })}
    </div>
  );
}

function desktopFileBridge() {
  if (typeof window === "undefined") return null;
  const bridge = window.amicFileBridge;
  if (!bridge || typeof bridge !== "object") return null;
  const methods = [
    "status",
    "precheckUpload",
    "chooseFileForUpload",
    "cancelUpload",
    "uploadSelectedFile",
    "resumePendingUploads",
  ];
  return methods.every((method) => typeof bridge[method] === "function") ? bridge : null;
}

function desktopSaveBridge() {
  if (typeof window === "undefined") return null;
  const bridge = window.amicFileBridge;
  return typeof bridge?.saveDocumentAs === "function" ? bridge : null;
}

function desktopPreviewBridge() {
  if (typeof window === "undefined") return null;
  const bridge = window.amicFileBridge;
  return typeof bridge?.openDocumentPreview === "function" ? bridge : null;
}

function desktopClassicOutlookBridge() {
  if (typeof window === "undefined") return null;
  const bridge = window.amicFileBridge;
  return typeof bridge?.attachDocumentToClassicOutlook === "function" ? bridge : null;
}

function suggestedVaultSaveName(document) {
  const explicit = typeof document?.filename === "string" ? document.filename.normalize("NFC").trim() : "";
  if (explicit && explicit.length <= 240 && !/[\\/\u0000-\u001f\u007f]/u.test(explicit)) return explicit;
  const title = String(document?.title ?? "vault-document")
    .normalize("NFC")
    .replace(/[\\/\u0000-\u001f\u007f]/gu, "-")
    .trim()
    .slice(0, 180) || "vault-document";
  const extension = VAULT_PREVIEW_EXTENSION_BY_MIME_TYPE.get(
    String(document?.current_mime_type ?? document?.mime_type ?? "").toLowerCase(),
  );
  return extension ? `${title}.${extension}` : title;
}

export function vaultSaveAsRequest(document) {
  const exact = {
    matterId: document?.matter_id,
    documentId: document?.document_id,
    versionId: document?.current_version_id ?? document?.version_id,
    fileObjectId: document?.current_file_object_id ?? document?.file_object_id,
    sha256: document?.latest_sha256 ?? document?.content_sha256,
    byteSize: Number(document?.current_byte_size ?? document?.byte_size),
    mimeType: String(document?.current_mime_type ?? document?.mime_type ?? "").toLowerCase(),
  };
  if (!SAFE_DOCUMENT_TARGET_ID.test(exact.matterId ?? "")
      || !SAFE_DOCUMENT_TARGET_ID.test(exact.documentId ?? "")
      || !SAFE_DOCUMENT_TARGET_ID.test(exact.versionId ?? "")
      || !SAFE_DOCUMENT_TARGET_ID.test(exact.fileObjectId ?? "")
      || !SAFE_DOCUMENT_TARGET_SHA256.test(exact.sha256 ?? "")
      || !Number.isSafeInteger(exact.byteSize)
      || exact.byteSize < 1
      || exact.byteSize > VAULT_DESKTOP_EXPORT_MAX_BYTES
      || !SAFE_VAULT_MIME_TYPE.test(exact.mimeType)) return null;
  return Object.freeze({
    ...exact,
    suggestedName: suggestedVaultSaveName(document),
  });
}

export function vaultClassicOutlookAttachRequest(document, requestHandle) {
  if (!/^classic-outlook-[a-f0-9]{32}$/u.test(String(requestHandle ?? ""))) return null;
  const exact = vaultSaveAsRequest(document);
  return exact ? { ...exact, requestHandle } : null;
}

export function vaultPreviewRequest(document) {
  const request = vaultSaveAsRequest(document);
  if (!request || !VAULT_PREVIEW_EXTENSION_BY_MIME_TYPE.has(request.mimeType)) return null;
  return request;
}

function formatUploadByteSize(value, labels) {
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = labels?.language === "English" ? ["KB", "MB"] : ["KB", "MB"];
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} ${units[0]}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${units[1]}`;
}

function matterUploadLabel(matter) {
  const code = String(matter?.matter_code ?? matter?.matter_number ?? "").trim();
  const title = String(matter?.matter_name ?? matter?.title ?? "Matter").trim();
  return code ? `${code} · ${title}` : title;
}

function safeUploadSelection(result) {
  const file = result?.file;
  if (result?.state !== "selected"
      || !SAFE_FILE_BRIDGE_ID.test(file?.handleId ?? "")
      || typeof file?.name !== "string"
      || !file.name.trim()
      || file.name.length > 240
      || !Number.isSafeInteger(file?.size)
      || file.size < 1
      || file.pathVisibleToRenderer !== false) return null;
  return Object.freeze({
    handleId: file.handleId,
    name: file.name,
    size: file.size,
    mimeType: typeof file.mimeType === "string" ? file.mimeType : "",
    pathVisibleToRenderer: false
  });
}

function safeUploadReceipt(result) {
  if (result?.state !== "uploaded"
      || !SAFE_DOCUMENT_TARGET_ID.test(result.documentId ?? "")
      || !SAFE_DOCUMENT_TARGET_ID.test(result.versionId ?? "")
      || !SAFE_DOCUMENT_TARGET_ID.test(result.fileObjectId ?? "")
      || !SAFE_DOCUMENT_TARGET_SHA256.test(result.sha256 ?? "")
      || !Number.isSafeInteger(result.byteSize)
      || result.byteSize < 1
      || result.pathVisibleToRenderer !== false) return null;
  return Object.freeze({
    operationId: SAFE_FILE_BRIDGE_ID.test(result.operationId ?? "") ? result.operationId : null,
    matterId: SAFE_DOCUMENT_TARGET_ID.test(result.matterId ?? "") ? result.matterId : null,
    documentId: result.documentId,
    versionId: result.versionId,
    fileObjectId: result.fileObjectId,
    sha256: result.sha256,
    byteSize: result.byteSize,
    mimeType: typeof result.mimeType === "string" ? result.mimeType : "",
    auditEventId: SAFE_FILE_BRIDGE_ID.test(result.auditEventId ?? "") ? result.auditEventId : null
  });
}

function safeUploadRecovery(result) {
  if (result?.state === "uploaded") return safeUploadReceipt(result);
  if (!new Set(["processing", "retryable"]).has(result?.state)
      || !SAFE_FILE_BRIDGE_ID.test(result?.operationId ?? "")
      || result?.pathVisibleToRenderer !== false
      || result?.rawBytesIncluded !== false
      || result?.filenameIncluded !== false) return null;
  if (result.state === "retryable") {
    return Object.freeze({
      state: "retryable",
      operationId: result.operationId,
      safeErrorCode: SAFE_FILE_BRIDGE_ID.test(result.safeErrorCode ?? "")
        ? result.safeErrorCode
        : "VAULT_UPLOAD_RESUME_FAILED",
    });
  }
  if (!SAFE_DOCUMENT_TARGET_SHA256.test(result.sha256 ?? "")
      || !Number.isSafeInteger(result.byteSize)
      || result.byteSize < 1
      || !Number.isSafeInteger(result.retryAfterMs)
      || result.retryAfterMs < 250
      || result.retryAfterMs > 60_000
      || result.exactReadbackVerified !== false) return null;
  return Object.freeze({
    state: "processing",
    operationId: result.operationId,
    stage: result.stage,
    retryAfterMs: result.retryAfterMs,
  });
}

function uploadErrorText(labels, errorKind) {
  if (errorKind === "expired") {
    return vaultLabel(labels, "vaultUploadExpired", "저장 준비 시간이 지나 다시 확인해야 합니다.");
  }
  if (errorKind === "matter") {
    return vaultLabel(labels, "vaultUploadMatterUnavailable", "선택한 Matter의 활성 Vault 위치를 확인할 수 없습니다.");
  }
  if (errorKind === "selection") {
    return vaultLabel(labels, "vaultUploadSelectionError", "파일을 선택하지 못했습니다. 다시 준비 확인부터 진행하세요.");
  }
  if (errorKind === "upload") {
    return vaultLabel(labels, "vaultUploadSaveError", "Vault 저장과 정확한 버전 확인을 완료하지 못했습니다. 같은 파일을 다시 저장하지 말고 상태를 확인하세요.");
  }
  return vaultLabel(labels, "vaultUploadPrepareError", "Vault 저장 권한과 위치를 확인하지 못했습니다.");
}

function VaultUploadPanel({ labels, liveCtx, initialMatterId, onOpenReceipt }) {
  const [bridgeStatus, setBridgeStatus] = useState(null);
  const [matterResult, setMatterResult] = useState(null);
  const [selectedMatterId, setSelectedMatterId] = useState("");
  const [summaryResult, setSummaryResult] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [preflight, setPreflight] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [recoveredUpload, setRecoveredUpload] = useState(null);
  const [recoverySignal, setRecoverySignal] = useState(0);
  const [errorKind, setErrorKind] = useState(null);
  const bridgeRef = useRef(null);
  const selectedHandleRef = useRef(null);
  const userFlowStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const bridge = desktopFileBridge();
    bridgeRef.current = bridge;
    if (!bridge) {
      setBridgeStatus({ uploadReady: false, state: "unavailable" });
      return undefined;
    }
    bridge.status().then((status) => {
      if (cancelled) return;
      const ready = status?.uploadReady === true
        && status?.uploadResumeAvailable === true
        && status?.nativePickerAvailable === true
        && status?.pathVisibleToRenderer === false
        && status?.fileBytesVisibleToRenderer === false;
      setBridgeStatus({ ...status, uploadReady: ready });
    }).catch(() => {
      if (!cancelled) setBridgeStatus({ uploadReady: false, state: "unavailable" });
    });
    return () => {
      cancelled = true;
      const handleId = selectedHandleRef.current;
      selectedHandleRef.current = null;
      if (handleId) bridge.cancelUpload(handleId).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (bridgeStatus?.uploadReady !== true || !bridge) return undefined;
    let cancelled = false;
    let resumeTimer = null;
    async function resumePendingUploads() {
      if (cancelled || userFlowStartedRef.current) return;
      let results;
      try {
        results = await bridge.resumePendingUploads();
      } catch {
        return;
      }
      if (cancelled || userFlowStartedRef.current || !Array.isArray(results)) return;
      const recoveries = results.map(safeUploadRecovery).filter(Boolean);
      const recovered = recoveries.find((item) => item.state === "processing")
        ?? recoveries.find((item) => item.state === "retryable")
        ?? recoveries.find((item) => item.documentId)
        ?? null;
      setRecoveredUpload(recovered);
      if (new Set(["processing", "retryable"]).has(recovered?.state)) {
        const retryAfterMs = recovered.state === "processing"
          ? Math.min(recovered.retryAfterMs, 5_000)
          : 15_000;
        resumeTimer = window.setTimeout(resumePendingUploads, retryAfterMs);
      }
    }
    void resumePendingUploads();
    return () => {
      cancelled = true;
      if (resumeTimer !== null) window.clearTimeout(resumeTimer);
    };
  }, [bridgeStatus?.uploadReady, recoverySignal]);

  useEffect(() => {
    if (bridgeStatus?.uploadReady !== true) return undefined;
    let cancelled = false;
    setMatterResult(null);
    fetchMatterRecords({ ctx: liveCtx }).then((result) => {
      if (!cancelled) setMatterResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [bridgeStatus?.uploadReady, liveCtx]);

  const matters = matterResult?.kind === "data" && !["denied", "review_required"].includes(matterResult.uiState)
    ? matterResult.items.filter((matter) => SAFE_DOCUMENT_TARGET_ID.test(matter?.matter_id ?? ""))
    : [];
  const selectedMatter = matters.find((matter) => matter.matter_id === selectedMatterId) ?? null;

  useEffect(() => {
    if (matterResult?.kind !== "data") return;
    const requested = SAFE_DOCUMENT_TARGET_ID.test(initialMatterId) ? initialMatterId : "";
    setSelectedMatterId((current) => {
      if (matters.some((matter) => matter.matter_id === current)) return current;
      return matters.some((matter) => matter.matter_id === requested) ? requested : "";
    });
  }, [matterResult, initialMatterId]);

  useEffect(() => {
    setSummaryResult(null);
    setPreflight(null);
    setSelectedFile(null);
    selectedHandleRef.current = null;
    setReceipt(null);
    setErrorKind(null);
    setPhase("idle");
    if (!selectedMatterId) return undefined;
    let cancelled = false;
    fetchMatterVaultSummary({ matterId: selectedMatterId, ctx: liveCtx }).then((result) => {
      if (!cancelled) setSummaryResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMatterId, liveCtx]);

  useEffect(() => {
    if (phase !== "ready" || !Number.isFinite(preflight?.expiresAt)) return undefined;
    const remaining = Math.max(0, preflight.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setPreflight(null);
      setPhase("error");
      setErrorKind("expired");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [phase, preflight]);

  const vaultSummary = summaryResult?.kind === "data"
    && summaryResult.uiState !== "denied"
    && summaryResult.uiState !== "review_required"
    ? summaryResult.item
    : null;
  const destinationReady = Boolean(
    selectedMatter
      && vaultSummary
      && SAFE_DOCUMENT_TARGET_ID.test(vaultSummary.vault_workspace_id ?? "")
      && ["active", "opening", "open"].includes(vaultSummary.workspace_status)
  );
  const recoveredReceipt = recoveredUpload?.documentId ? recoveredUpload : null;
  const recoveredProcessing = new Set(["processing", "retryable"])
    .has(recoveredUpload?.state);
  const displayReceipt = receipt ?? recoveredReceipt;
  const flowLocked = Boolean(recoveredUpload)
    || !["idle", "error", "complete"].includes(phase);

  function resetFlow() {
    userFlowStartedRef.current = true;
    selectedHandleRef.current = null;
    setPreflight(null);
    setSelectedFile(null);
    setReceipt(null);
    setRecoveredUpload(null);
    setErrorKind(null);
    setPhase("idle");
  }

  async function prepareUpload() {
    const bridge = bridgeRef.current;
    if (!bridge || !destinationReady || !selectedMatter) return;
    userFlowStartedRef.current = true;
    setPhase("preparing");
    setErrorKind(null);
    setReceipt(null);
    try {
      const result = await bridge.precheckUpload({
        matterId: selectedMatter.matter_id,
        workspaceId: vaultSummary.vault_workspace_id,
        folderId: SAFE_DOCUMENT_TARGET_ID.test(vaultSummary.default_folder_id ?? "")
          ? vaultSummary.default_folder_id
          : null
      });
      if (result?.state !== "allowed"
          || !SAFE_FILE_BRIDGE_ID.test(result.preflightId ?? "")
          || !Number.isFinite(result.expiresAt)
          || result.pathVisibleToRenderer !== false) throw new Error("invalid_preflight");
      setPreflight(Object.freeze({
        preflightId: result.preflightId,
        expiresAt: result.expiresAt,
        maxUploadBytes: Number(result.maxUploadBytes)
      }));
      setPhase("ready");
    } catch {
      setPreflight(null);
      setPhase("error");
      setErrorKind("preflight");
    }
  }

  async function chooseFile() {
    const bridge = bridgeRef.current;
    if (!bridge || phase !== "ready" || !preflight) return;
    setPhase("selecting");
    setErrorKind(null);
    try {
      const result = await bridge.chooseFileForUpload(preflight.preflightId);
      if (result?.state === "cancelled") {
        resetFlow();
        return;
      }
      const file = safeUploadSelection(result);
      if (!file) {
        const rejectedHandleId = result?.file?.handleId;
        if (SAFE_FILE_BRIDGE_ID.test(rejectedHandleId ?? "")) {
          try {
            await bridge.cancelUpload(rejectedHandleId);
          } catch {
            // A rejected handle also expires in the main process.
          }
        }
        throw new Error("invalid_selection");
      }
      selectedHandleRef.current = file.handleId;
      setPreflight(null);
      setSelectedFile(file);
      setPhase("selected");
    } catch {
      setPreflight(null);
      setSelectedFile(null);
      setPhase("error");
      setErrorKind("selection");
    }
  }

  async function cancelSelection() {
    const bridge = bridgeRef.current;
    const handleId = selectedHandleRef.current;
    if (!bridge || !handleId || phase !== "selected") return;
    setPhase("cancelling");
    try {
      await bridge.cancelUpload(handleId);
    } finally {
      resetFlow();
    }
  }

  async function storeFile() {
    const bridge = bridgeRef.current;
    const handleId = selectedHandleRef.current;
    if (!bridge || !handleId || phase !== "selected") return;
    setPhase("uploading");
    setErrorKind(null);
    try {
      const result = await bridge.uploadSelectedFile(handleId);
      const recovery = safeUploadRecovery(result);
      if (recovery?.state === "processing") {
        selectedHandleRef.current = null;
        setSelectedFile(null);
        setRecoveredUpload(recovery);
        setPhase("idle");
        userFlowStartedRef.current = false;
        setRecoverySignal((value) => value + 1);
        return;
      }
      const verified = safeUploadReceipt(result);
      if (!verified) throw new Error("invalid_receipt");
      selectedHandleRef.current = null;
      setReceipt(verified);
      setPhase("complete");
    } catch {
      try {
        await bridge.cancelUpload(handleId);
      } catch {
        // The main process may already have consumed the handle; the user's source file remains unchanged.
      }
      selectedHandleRef.current = null;
      setSelectedFile(null);
      setPhase("error");
      setErrorKind("upload");
    }
  }

  if (bridgeStatus === null) {
    return <PendingBoundary icon={Upload} title={vaultLabel(labels, "vaultUploadBridgeChecking", "AMIC OS 파일 기능을 확인하는 중입니다")} marker="desktop-file-bridge-check">{vaultLabel(labels, "vaultUploadBridgeCheckingDescription", "로컬 파일을 읽거나 선택하지 않은 상태로 데스크톱 연결만 확인합니다.")}</PendingBoundary>;
  }

  if (bridgeStatus.uploadReady !== true) {
    return <PendingBoundary icon={Upload} title={vaultLabel(labels, "vaultUploadDesktopRequiredTitle", "AMIC OS 데스크톱 앱에서 사용할 수 있습니다")} marker="desktop-file-bridge-required">{vaultLabel(labels, "vaultUploadDesktopRequiredDescription", "AMIC OS 데스크톱 앱을 설치하고 로그인하면 별도 Vault 설치 없이 문서를 저장할 수 있습니다.")}</PendingBoundary>;
  }

  const matterState = matterResult === null
    ? vaultLabel(labels, "vaultUploadMatterLoading", "저장할 수 있는 Matter를 불러오는 중입니다.")
    : matterResult.kind === "error"
      ? vaultLabel(labels, "vaultUploadMatterError", "Matter 목록을 불러오지 못했습니다.")
      : matterResult.uiState === "denied" || matterResult.uiState === "review_required"
        ? vaultLabel(labels, "vaultUploadMatterDenied", "문서를 저장할 Matter 권한을 확인할 수 없습니다.")
        : matters.length === 0
          ? vaultLabel(labels, "vaultUploadMatterEmpty", "문서를 저장할 수 있는 Matter가 없습니다.")
          : null;

  return (
    <div className="vault-upload-workflow" data-vault-upload-workflow={phase} aria-live="polite">
      <p className="vault-upload-description">{vaultLabel(labels, "vaultUploadDescription", "저장 위치를 먼저 확인한 뒤 파일을 선택합니다. 파일 경로와 바이트는 이 화면에 전달되지 않습니다.")}</p>

      <label className="vault-upload-matter-field">
        <span>{vaultLabel(labels, "vaultUploadMatterLabel", "저장할 Matter")}</span>
        <select
          value={selectedMatterId}
          disabled={flowLocked || matters.length === 0}
          onChange={(event) => setSelectedMatterId(event.target.value)}
        >
          <option value="">{vaultLabel(labels, "vaultUploadMatterPlaceholder", "Matter 선택")}</option>
          {matters.map((matter) => <option value={matter.matter_id} key={matter.matter_id}>{matterUploadLabel(matter)}</option>)}
        </select>
      </label>
      {matterState && <p className="vault-upload-state" role="status">{matterState}</p>}

      {selectedMatter && (
        <div className="vault-upload-destination" data-vault-upload-destination={destinationReady ? "ready" : "checking"}>
          <span>{vaultLabel(labels, "vaultUploadLocationLabel", "Vault 저장 위치")}</span>
          <strong>{summaryResult === null
            ? vaultLabel(labels, "vaultUploadLocationChecking", "확인 중")
            : destinationReady
              ? vaultLabel(labels, "vaultUploadLocationDefault", "이 Matter의 기본 문서 위치")
              : vaultLabel(labels, "vaultUploadLocationUnavailable", "활성 위치를 확인할 수 없음")}</strong>
        </div>
      )}

      {!recoveredUpload && (phase === "idle" || phase === "preparing" || phase === "error") && (
        <button type="button" className="primary-button vault-upload-primary" disabled={!destinationReady || phase === "preparing"} onClick={prepareUpload}>
          <ShieldCheck size={16} aria-hidden="true" />
          {phase === "preparing"
            ? vaultLabel(labels, "vaultUploadPreparing", "저장 준비 확인 중")
            : vaultLabel(labels, "vaultUploadPrepare", "저장 준비 확인")}
        </button>
      )}

      {(phase === "ready" || phase === "selecting") && (
        <div className="vault-upload-ready-state">
          <div><CheckCircle2 size={17} aria-hidden="true" /><span>{vaultLabel(labels, "vaultUploadPreflightReady", "권한과 저장 위치를 확인했습니다. 1분 안에 파일을 선택하세요.")}</span></div>
          <button type="button" className="primary-button vault-upload-primary" disabled={phase === "selecting"} onClick={chooseFile}>
            <Upload size={16} aria-hidden="true" />
            {phase === "selecting"
              ? vaultLabel(labels, "vaultUploadChoosing", "파일 선택 중")
              : vaultLabel(labels, "vaultUploadChooseFile", "파일 선택")}
          </button>
        </div>
      )}

      {selectedFile && phase !== "complete" && (
        <div className="vault-upload-selected-file" data-vault-upload-selected-file="true">
          <FileText size={19} aria-hidden="true" />
          <div><strong>{selectedFile.name}</strong><span>{formatUploadByteSize(selectedFile.size, labels)}{selectedFile.mimeType ? ` · ${selectedFile.mimeType}` : ""}</span></div>
        </div>
      )}

      {recoveredProcessing && (
        <div className="vault-upload-selected-file" data-vault-upload-processing="true" role="status">
          <RefreshCw size={19} aria-hidden="true" />
          <div>
            <strong>{recoveredUpload.state === "retryable"
              ? vaultLabel(labels, "vaultUploadStatusRetrying", "Vault 저장 상태를 다시 확인하는 중")
              : vaultLabel(labels, "vaultUploadSecurityProcessing", "Vault에서 보안 검사 중")}</strong>
            <span>{recoveredUpload.state === "retryable"
              ? vaultLabel(labels, "vaultUploadStatusRetryingDescription", "연결이 돌아오면 보존된 작업 ID로 상태 확인을 이어갑니다. 파일을 다시 보내지 않습니다.")
              : vaultLabel(labels, "vaultUploadSecurityProcessingDescription", "문서는 이미 전달되었습니다. 앱을 다시 열어도 이 작업의 상태 확인을 이어갑니다.")}</span>
          </div>
        </div>
      )}

      {["selected", "uploading", "cancelling"].includes(phase) && (
        <div className="vault-upload-actions">
          <button type="button" className="secondary-button" disabled={phase !== "selected"} onClick={cancelSelection}><X size={15} aria-hidden="true" />{vaultLabel(labels, "vaultUploadCancel", "선택 취소")}</button>
          <button type="button" className="primary-button" disabled={phase !== "selected"} onClick={storeFile}><Upload size={16} aria-hidden="true" />{phase === "uploading" ? vaultLabel(labels, "vaultUploadSaving", "Vault에 저장 중") : vaultLabel(labels, "vaultUploadSave", "Vault에 저장")}</button>
        </div>
      )}

      {errorKind && <div className="vault-upload-error" role="alert"><strong>{vaultLabel(labels, "vaultUploadErrorTitle", "저장을 완료하지 못했습니다")}</strong><span>{uploadErrorText(labels, errorKind)}</span></div>}

      {displayReceipt && (
        <div className="vault-upload-complete" data-vault-upload-readback="verified">
          <div className="vault-upload-complete-heading"><CheckCircle2 size={19} aria-hidden="true" /><div><strong>{vaultLabel(labels, "vaultUploadCompleteTitle", "Vault 저장을 확인했습니다")}</strong><span>{vaultLabel(labels, "vaultUploadCompleteDescription", "저장된 문서와 정확한 버전, 해시를 Vault에서 다시 확인했습니다.")}</span></div></div>
          <dl className="vault-upload-receipt">
            <div><dt>{vaultLabel(labels, "vaultUploadReceiptDocument", "문서 ID")}</dt><dd><code>{displayReceipt.documentId}</code></dd></div>
            <div><dt>{vaultLabel(labels, "vaultUploadReceiptVersion", "버전 ID")}</dt><dd><code>{displayReceipt.versionId}</code></dd></div>
            <div><dt>{vaultLabel(labels, "vaultUploadReceiptFileObject", "파일 객체 ID")}</dt><dd><code>{displayReceipt.fileObjectId}</code></dd></div>
            <div><dt>{vaultLabel(labels, "vaultUploadReceiptHash", "SHA-256")}</dt><dd><code>{displayReceipt.sha256}</code></dd></div>
            <div><dt>{vaultLabel(labels, "vaultUploadReceiptSize", "크기")}</dt><dd>{formatUploadByteSize(displayReceipt.byteSize, labels)}</dd></div>
            {displayReceipt.auditEventId && <div><dt>{vaultLabel(labels, "vaultUploadReceiptAudit", "감사 이벤트")}</dt><dd><code>{displayReceipt.auditEventId}</code></dd></div>}
          </dl>
          <div className="vault-upload-actions">
            <button type="button" className="secondary-button" onClick={resetFlow}>{vaultLabel(labels, "vaultUploadAgain", "다른 문서 저장")}</button>
            <button type="button" className="primary-button" onClick={() => onOpenReceipt({ ...displayReceipt, matterId: displayReceipt.matterId ?? selectedMatterId })}>{vaultLabel(labels, "vaultUploadOpenDocument", "저장한 문서 열기")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VaultSurface({
  labels = {},
  liveCtx = "allow",
  activeSection = "vault-home",
  initialQuery = "",
  initialDocumentMatterId = "",
  initialDocumentId = "",
  initialDocumentVersionId = "",
  initialDocumentSha256 = "",
  initialDateFrom = "",
  initialDateTo = "",
  capabilities = EMPTY_VAULT_CAPABILITY_PROJECTION,
  classicOutlookAttachRequest = null,
  refreshSignal = 0,
  onNavigateSection = () => {}
}) {
  const [documentsResult, setDocumentsResult] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(() => initialQuery.trim());
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [submittedDateFrom, setSubmittedDateFrom] = useState(initialDateFrom);
  const [submittedDateTo, setSubmittedDateTo] = useState(initialDateTo);
  const [searchResult, setSearchResult] = useState(null);
  const [searchPending, setSearchPending] = useState(false);
  const [linkCopyState, setLinkCopyState] = useState("idle");
  const [preferenceError, setPreferenceError] = useState(false);
  const [preferenceWriteCount, setPreferenceWriteCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [preferences, setPreferences] = useState(EMPTY_SEARCH_PREFERENCES);
  const [preferenceAccess, setPreferenceAccess] = useState("loading");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [saveAsState, setSaveAsState] = useState("idle");
  const [previewState, setPreviewState] = useState("idle");
  const [outlookAttachState, setOutlookAttachState] = useState("idle");
  const refreshSignalRef = useRef(refreshSignal);
  const preferenceRevisionRef = useRef(0);
  const preferenceWriteRef = useRef(Promise.resolve());
  const section = VAULT_SECTIONS.has(activeSection) ? activeSection : "vault-home";
  const sectionAllowed = vaultSectionAllowed(section, capabilities);
  const readAllowed = vaultCapabilityAllowed(capabilities, "read");
  const downloadAllowed = vaultCapabilityAllowed(capabilities, "download");
  const searchSection = SEARCH_SECTIONS.has(section);

  useEffect(() => {
    const normalized = initialQuery.trim().slice(0, SEARCH_QUERY_LIMIT);
    setQuery(normalized);
    setSubmittedQuery(section === "vault-search-all" ? normalized : "");
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
    setSubmittedDateFrom(initialDateFrom);
    setSubmittedDateTo(initialDateTo);
  }, [initialQuery, initialDateFrom, initialDateTo, section]);

  useEffect(() => {
    if (refreshSignalRef.current === refreshSignal) return;
    refreshSignalRef.current = refreshSignal;
    setRefreshToken((value) => value + 1);
  }, [refreshSignal]);

  useEffect(() => {
    if (!sectionAllowed || !readAllowed || !DOCUMENT_SECTIONS.has(section)) {
      setDocumentsResult(null);
      return undefined;
    }
    let cancelled = false;
    setDocumentsResult(null);
    fetchVaultDocuments({
      ctx: liveCtx,
      matterId: SAFE_DOCUMENT_TARGET_ID.test(initialDocumentMatterId) ? initialDocumentMatterId : "",
      permissionRef: VAULT_PERMISSION_REF,
      auditHintRef: VAULT_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setDocumentsResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, initialDocumentMatterId, refreshToken, section, sectionAllowed, readAllowed]);

  useEffect(() => {
    if (!sectionAllowed || !readAllowed || !searchSection) {
      setPreferences(EMPTY_SEARCH_PREFERENCES);
      setPreferenceAccess("loading");
      return undefined;
    }
    let cancelled = false;
    const requestedRevision = preferenceRevisionRef.current;
    fetchVaultSearchPreferences({ ctx: liveCtx, permissionRef: VAULT_PERMISSION_REF, auditHintRef: VAULT_AUDIT_HINT_REF }).then((next) => {
      if (cancelled || preferenceRevisionRef.current !== requestedRevision) return;
      if (next.kind !== "data") {
        setPreferences(EMPTY_SEARCH_PREFERENCES);
        setPreferenceAccess(next.kind === "guarded" ? next.uiState : "error");
        setPreferenceError(next.kind === "error");
        return;
      }
      setPreferences(normalizeSearchPreferences(next.item));
      setPreferenceAccess("ready");
      setPreferenceError(false);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, section, sectionAllowed, readAllowed, searchSection]);

  useEffect(() => {
    let cancelled = false;
    const normalizedQuery = submittedQuery.trim();
    if (!sectionAllowed || section !== "vault-search-all" || !normalizedQuery) {
      setSearchResult(null);
      setSearchPending(false);
      return () => {
        cancelled = true;
      };
    }
    setSearchPending(true);
    fetchVaultSearch({
      ctx: liveCtx,
      query: normalizedQuery,
      currentVersionOnly: true,
      dateFrom: submittedDateFrom,
      dateTo: submittedDateTo,
      permissionRef: VAULT_PERMISSION_REF,
      auditHintRef: VAULT_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) {
        setSearchResult(next);
        setSearchPending(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, submittedQuery, submittedDateFrom, submittedDateTo, refreshToken, section, sectionAllowed]);

  useEffect(() => {
    if (!sectionAllowed || section !== "vault-audit") {
      setAuditResult(null);
      return undefined;
    }
    let cancelled = false;
    setAuditResult(null);
    fetchVaultAudit({ ctx: liveCtx, permissionRef: VAULT_PERMISSION_REF, auditHintRef: VAULT_AUDIT_HINT_REF }).then((next) => {
      if (!cancelled) setAuditResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, section, sectionAllowed]);

  const searchReadable = searchResult?.kind === "data" && searchResult.outcome === "passed" && !["denied", "review_required"].includes(searchResult.uiState);
  const documentsReadable = documentsResult?.kind === "data" && documentsResult.outcome === "passed" && !["denied", "review_required"].includes(documentsResult.uiState);
  const searchItems = searchReadable ? searchResult.items : [];
  const documentCount = documentsReadable ? documentsResult.items.length : null;
  const draftFilters = normalizeSearchFilters({ current_version_only: true, date_from: dateFrom, date_to: dateTo });
  const submittedFilters = normalizeSearchFilters({ current_version_only: true, date_from: submittedDateFrom, date_to: submittedDateTo });
  const submittedPreference = { query: submittedQuery, ...submittedFilters };
  const searchStateDirty = query.trim() !== submittedQuery || searchPreferenceKey({ query: submittedQuery, ...draftFilters }) !== searchPreferenceKey(submittedPreference);
  const isSaved = preferences.saved.some((item) => searchPreferenceKey(item) === searchPreferenceKey(submittedPreference));
  const immutableTargetRequested = Boolean(initialDocumentMatterId || initialDocumentVersionId || initialDocumentSha256);

  useEffect(() => {
    if (!initialDocumentId || !sectionAllowed) {
      setSelectedDocument(null);
      return;
    }
    const document = [...(documentsReadable ? documentsResult.items : []), ...searchItems]
      .find((item) => matchesVaultDocumentTarget(item, {
        documentId: initialDocumentId,
        matterId: initialDocumentMatterId,
        versionId: initialDocumentVersionId,
        sha256: initialDocumentSha256
      }));
    setSelectedDocument(document ?? null);
  }, [initialDocumentMatterId, initialDocumentId, initialDocumentVersionId, initialDocumentSha256, searchResult, documentsResult, sectionAllowed]);

  useEffect(() => {
    setSaveAsState("idle");
    setPreviewState("idle");
    setOutlookAttachState("idle");
  }, [
    selectedDocument?.document_id,
    selectedDocument?.current_version_id,
    classicOutlookAttachRequest?.request_handle,
  ]);

  function retryRead() {
    setRefreshToken((value) => value + 1);
  }

  function commitSearchPreferences(next, operation, payload = {}, previous = preferences) {
    if (!sectionAllowed || !readAllowed) return;
    const revision = preferenceRevisionRef.current + 1;
    preferenceRevisionRef.current = revision;
    setPreferences(next);
    setPreferenceWriteCount((count) => count + 1);
    preferenceWriteRef.current = preferenceWriteRef.current.then(() => writeVaultSearchPreferences({
      operation,
      ...payload,
      ctx: liveCtx,
      permissionRef: VAULT_PERMISSION_REF,
      auditHintRef: VAULT_AUDIT_HINT_REF
    }));
    preferenceWriteRef.current.then((result) => {
      if (preferenceRevisionRef.current !== revision) return;
      const canonical = result.kind === "data" ? normalizeSearchPreferences(result.item) : previous;
      setPreferences(canonical);
      setPreferenceAccess(result.kind === "guarded" ? result.uiState : result.kind === "data" ? "ready" : "error");
      setPreferenceError(result.kind === "error");
    }).finally(() => setPreferenceWriteCount((count) => Math.max(0, count - 1)));
  }

  function runSearch(nextQuery) {
    if (!sectionAllowed || !readAllowed) return;
    const preference = nextQuery && typeof nextQuery === "object" ? nextQuery : null;
    const normalized = String(preference?.query ?? nextQuery ?? query).trim().slice(0, SEARCH_QUERY_LIMIT);
    if (!normalized) return;
    const nextFilters = normalizeSearchFilters(preference ?? draftFilters);
    setQuery(normalized);
    setSubmittedQuery(normalized);
    setDateFrom(nextFilters.date_from ?? "");
    setDateTo(nextFilters.date_to ?? "");
    setSubmittedDateFrom(nextFilters.date_from ?? "");
    setSubmittedDateTo(nextFilters.date_to ?? "");
    setLinkCopyState("idle");
    commitSearchPreferences(rememberSearch(preferences, normalized, nextFilters), "remember", { query: normalized, ...nextFilters });
    onNavigateSection("vault-search-all", { query: normalized, currentVersionOnly: true, dateFrom: nextFilters.date_from, dateTo: nextFilters.date_to });
  }

  async function copySearchLink() {
    if (!submittedQuery || typeof window === "undefined" || typeof navigator?.clipboard?.writeText !== "function") return;
    if (!window.confirm(vaultLabel(labels, "searchCopyConfirm", "검색어가 링크에 포함됩니다. 링크를 복사할까요?"))) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", "vault");
    url.searchParams.set("query", submittedQuery);
    url.searchParams.set("current_version", "current");
    if (submittedFilters.date_from) url.searchParams.set("date_from", submittedFilters.date_from);
    else url.searchParams.delete("date_from");
    if (submittedFilters.date_to) url.searchParams.set("date_to", submittedFilters.date_to);
    else url.searchParams.delete("date_to");
    url.hash = "vault-search-all";
    try {
      const audit = await writeVaultSearchPreferences({
        operation: "share_authorize",
        query: submittedQuery,
        ...submittedFilters,
        ctx: liveCtx,
        permissionRef: VAULT_PERMISSION_REF,
        auditHintRef: VAULT_AUDIT_HINT_REF
      });
      if (audit.kind !== "data") {
        setLinkCopyState("failed");
        return;
      }
      await navigator.clipboard.writeText(url.toString());
      setLinkCopyState("copied");
    } catch {
      setLinkCopyState("failed");
    }
  }

  function openDocument(document) {
    if (!document?.document_id || !sectionAllowed || !readAllowed) return;
    const completeDocument = documentsReadable ? documentsResult.items.find((item) => item.document_id === document.document_id) : null;
    const selected = completeDocument ?? document;
    setSelectedDocument(selected);
    const routeContext = { documentId: selected.document_id };
    const versionId = selected.current_version_id ?? selected.version_id;
    const sha256 = selected.latest_sha256 ?? selected.content_sha256;
    if (selected.matter_id && versionId && SAFE_DOCUMENT_TARGET_SHA256.test(sha256 ?? "")) {
      Object.assign(routeContext, { matterId: selected.matter_id, documentVersionId: versionId, documentSha256: sha256 });
    }
    onNavigateSection(section, routeContext);
  }

  function openUploadReceipt(receipt) {
    if (!receipt
        || !SAFE_DOCUMENT_TARGET_ID.test(receipt.matterId ?? "")
        || !SAFE_DOCUMENT_TARGET_ID.test(receipt.documentId ?? "")
        || !SAFE_DOCUMENT_TARGET_ID.test(receipt.versionId ?? "")
        || !SAFE_DOCUMENT_TARGET_SHA256.test(receipt.sha256 ?? "")) return;
    setRefreshToken((value) => value + 1);
    onNavigateSection("vault-files", {
      matterId: receipt.matterId,
      documentId: receipt.documentId,
      documentVersionId: receipt.versionId,
      documentSha256: receipt.sha256
    });
  }

  function saveSelectedDocumentAs() {
    const request = vaultSaveAsRequest(selectedDocument);
    const bridge = desktopSaveBridge();
    if (!request || !bridge || !downloadAllowed || saveAsState === "saving") {
      setSaveAsState("unavailable");
      return;
    }
    setPreviewState("idle");
    setSaveAsState("saving");
    Promise.resolve(bridge.saveDocumentAs({
      ...request,
      title: vaultLabel(labels, "vaultSaveAsAction", "내 컴퓨터에 저장"),
    })).then((result) => {
      setSaveAsState(result?.state === "saved" ? "saved" : "idle");
    }).catch(() => {
      setSaveAsState("failed");
    });
  }

  function previewSelectedDocument() {
    const request = vaultPreviewRequest(selectedDocument);
    const bridge = desktopPreviewBridge();
    if (!request || !bridge || !downloadAllowed || previewState === "opening") {
      setPreviewState("unavailable");
      return;
    }
    setSaveAsState("idle");
    setPreviewState("opening");
    Promise.resolve(bridge.openDocumentPreview(request)).then((result) => {
      setPreviewState(result?.state === "opened" ? "opened" : "idle");
    }).catch(() => {
      setPreviewState("failed");
    });
  }

  function attachSelectedDocumentToClassicOutlook() {
    const request = vaultClassicOutlookAttachRequest(
      selectedDocument,
      classicOutlookAttachRequest?.request_handle,
    );
    const bridge = desktopClassicOutlookBridge();
    const expiresAt = Date.parse(classicOutlookAttachRequest?.expires_at ?? "");
    if (!request || !bridge || !downloadAllowed || outlookAttachState === "attaching") {
      setOutlookAttachState("unavailable");
      return;
    }
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      setOutlookAttachState("expired");
      return;
    }
    setSaveAsState("idle");
    setPreviewState("idle");
    setOutlookAttachState("attaching");
    Promise.resolve(bridge.attachDocumentToClassicOutlook(request)).then((result) => {
      setOutlookAttachState(result?.state === "attached" ? "attached" : "failed");
    }).catch(() => {
      setOutlookAttachState("failed");
    });
  }

  const showSearchForm = section === "vault-home" || section === "vault-search-all";
  const selectedTargetMismatch = Boolean(initialDocumentId && immutableTargetRequested && documentsReadable && !selectedDocument);

  return (
    <section id="vault-home" className="surface stack vault-surface amic-search-surface" data-amic-vault-surface="true" data-vault-section={section} data-search-scope="documents-ocr">
      <ForestHero title="Vault" image={heroVaultArchitecture} imageOpacity={0.24} />

      {!sectionAllowed ? <CapabilityBoundary labels={labels} capabilities={capabilities} /> : (
        <div className="amic-search-grid">
          {showSearchForm && <SearchForm labels={labels} query={query} setQuery={setQuery} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} pending={searchPending} preferenceError={preferenceError} onSubmit={runSearch} />}

          {section === "vault-home" && (
            <>
              <VaultOverview labels={labels} documentCount={documentCount} />
              <VaultCard title={vaultLabel(labels, "vaultRecentDocumentsLabel", "최근 문서")} section="recent-documents" count={documentCount} labels={labels}><DocumentCollectionState result={documentsResult} labels={labels} onOpen={openDocument} onRetry={retryRead} limit={6} /></VaultCard>
              <VaultCard title={vaultLabel(labels, "searchRecentLabel", "최근 검색")} section="recent-searches" count={preferenceAccess === "ready" ? preferences.recent.length : null} labels={labels}><SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.recent.slice(0, 5)} labels={labels} onRun={runSearch} /></SearchPreferenceState></VaultCard>
              <VaultCard title={vaultLabel(labels, "searchSavedLabel", "저장한 검색")} section="saved-searches" count={preferenceAccess === "ready" ? preferences.saved.length : null} labels={labels}><SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.saved.slice(0, 5)} labels={labels} onRun={runSearch} /></SearchPreferenceState></VaultCard>
            </>
          )}

          {section === "vault-files" && <VaultCard title={vaultLabel(labels, "vaultFilesTitle", "문서 목록")} section="documents" count={documentCount} labels={labels} className="amic-search-results-card"><DocumentCollectionState result={documentsResult} labels={labels} onOpen={openDocument} onRetry={retryRead} /></VaultCard>}
          {section === "vault-recent" && <VaultCard title={vaultLabel(labels, "vaultRecentDocumentsLabel", "최근 문서")} section="recent-documents" count={documentCount} labels={labels} className="amic-search-results-card"><DocumentCollectionState result={documentsResult} labels={labels} onOpen={openDocument} onRetry={retryRead} /></VaultCard>}
          {section === "vault-favorites" && <VaultCard title={vaultLabel(labels, "vaultFavoritesTitle", "즐겨찾기")} section="favorites" labels={labels} className="amic-search-results-card"><PendingBoundary title={vaultLabel(labels, "vaultFavoritesTitle", "즐겨찾기")} marker="favorites-authority">{vaultLabel(labels, "vaultFavoritesUnavailable", "즐겨찾기 권위가 아직 Vault 서버에 연결되지 않아 항목을 만들거나 표시하지 않습니다.")}</PendingBoundary></VaultCard>}

          {section === "vault-search-all" && (
            <VaultCard title={vaultLabel(labels, "searchResultsTitle", "검색 결과")} section="search-results" count={submittedQuery && searchReadable ? searchItems.length : null} labels={labels} className="amic-search-results-card">
              <div className="search-results-toolbar">
                <span>{vaultLabel(labels, "searchDocumentsLabel", "문서")}</span>
                <button type="button" className="text-button" disabled={!submittedQuery || searchStateDirty || preferenceWriteCount > 0} onClick={copySearchLink}><Share2 size={15} />{linkCopyState === "copied" ? vaultLabel(labels, "searchCopySuccess", "링크 복사됨") : linkCopyState === "failed" ? vaultLabel(labels, "searchCopyFailed", "복사 실패") : vaultLabel(labels, "searchCopyLink", "검색 링크 복사")}</button>
                <button type="button" className="text-button" disabled={!submittedQuery || searchStateDirty || isSaved || preferenceWriteCount > 0} onClick={() => commitSearchPreferences(saveSearch(preferences, submittedQuery, submittedFilters), "save", { query: submittedQuery, ...submittedFilters })}><Bookmark size={15} />{isSaved ? vaultLabel(labels, "searchSavedState", "저장됨") : vaultLabel(labels, "searchSave", "검색 저장")}</button>
              </div>
              <SearchResults result={searchResult} pending={searchPending} submittedQuery={submittedQuery} labels={labels} onOpen={openDocument} />
            </VaultCard>
          )}

          {section === "vault-search-recent" && <VaultCard title={vaultLabel(labels, "searchRecentLabel", "최근 검색")} section="recent-searches" count={preferenceAccess === "ready" ? preferences.recent.length : null} labels={labels} className="amic-search-results-card"><SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.recent} labels={labels} onRun={runSearch} /></SearchPreferenceState>{preferences.recent.length > 0 && <button type="button" className="text-button search-list-action" disabled={preferenceWriteCount > 0} onClick={() => { if (window.confirm(vaultLabel(labels, "searchClearConfirm", "최근 검색 기록을 모두 비울까요?"))) commitSearchPreferences(clearRecentSearches(preferences), "clear_recent"); }}>{vaultLabel(labels, "searchClearRecent", "최근 검색 비우기")}</button>}</VaultCard>}
          {section === "vault-search-saved" && <VaultCard title={vaultLabel(labels, "searchSavedLabel", "저장한 검색")} section="saved-searches" count={preferenceAccess === "ready" ? preferences.saved.length : null} labels={labels} className="amic-search-results-card"><SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.saved} labels={labels} onRun={runSearch} onDelete={(id) => commitSearchPreferences(removeSavedSearch(preferences, id), "delete_saved", { id })} deleteDisabled={preferenceWriteCount > 0} /></SearchPreferenceState></VaultCard>}

          {section === "vault-upload" && <VaultCard title={vaultLabel(labels, "vaultUploadTitle", "Vault에 문서 저장")} section="upload" labels={labels} className="amic-search-results-card vault-upload-card"><VaultUploadPanel labels={labels} liveCtx={liveCtx} initialMatterId={initialDocumentMatterId} onOpenReceipt={openUploadReceipt} /></VaultCard>}
          {section === "vault-work" && <VaultCard title={vaultLabel(labels, "vaultWorkTitle", "문서 처리 현황")} section="work" labels={labels} className="amic-search-results-card"><PendingBoundary title={vaultLabel(labels, "vaultWorkTitle", "문서 처리 현황")} marker="work-authority">{vaultLabel(labels, "vaultWorkPending", "Vault가 반환한 체크아웃과 검토 상태만 표시하도록 서버 연결을 준비 중입니다.")}</PendingBoundary></VaultCard>}
          {section === "vault-checkout" && <VaultCard title={vaultLabel(labels, "vaultCheckoutTitle", "체크아웃/편집")} section="checkout" labels={labels} className="amic-search-results-card"><PendingBoundary title={vaultLabel(labels, "vaultCheckoutTitle", "체크아웃/편집")} marker="checkout-authority">{vaultLabel(labels, "vaultCheckoutPending", "체크아웃 잠금과 새 버전 readback이 연결되기 전에는 편집 명령을 실행하지 않습니다.")}</PendingBoundary></VaultCard>}
          {section === "vault-review" && <VaultCard title={vaultLabel(labels, "vaultReviewTitle", "검토/승인")} section="review" labels={labels} className="amic-search-results-card"><PendingBoundary title={vaultLabel(labels, "vaultReviewTitle", "검토/승인")} marker="review-authority">{vaultLabel(labels, "vaultReviewPending", "Vault 승인 상태와 감사 이벤트를 함께 확인할 수 있을 때 활성화됩니다.")}</PendingBoundary></VaultCard>}
          {section === "vault-outlook" && (
            <VaultCard title={vaultLabel(labels, "vaultOutlookTitle", "Outlook에서 Vault 사용")} section="outlook" count={documentCount} labels={labels} className="amic-search-results-card">
              {classicOutlookAttachRequest?.type === "classic_outlook_attach_request" ? (
                <div className="stack vault-outlook-attach-request" data-vault-outlook-attach-request="active">
                  <div className="vault-outlook-attach-heading" role="status">
                    <Mail size={18} aria-hidden="true" />
                    <div>
                      <strong>{vaultLabel(labels, "vaultOutlookChooseTitle", "현재 Outlook 초안에 첨부할 문서를 선택하세요")}</strong>
                      <span>{vaultLabel(labels, "vaultOutlookChooseDescription", "아래 문서 목록에서 항목을 연 뒤 정확한 현재 버전을 첨부합니다.")}</span>
                    </div>
                  </div>
                  <DocumentCollectionState result={documentsResult} labels={labels} onOpen={openDocument} onRetry={retryRead} />
                </div>
              ) : (
                <PendingBoundary icon={Mail} title={vaultLabel(labels, "vaultOutlookTitle", "Outlook에서 Vault 사용")} marker="outlook-explicit-action">
                  {vaultLabel(labels, "vaultOutlookIdle", "Classic Outlook 새 메일 창에서 ‘Vault에서 첨부’를 누르면 문서 선택이 시작됩니다.")}
                </PendingBoundary>
              )}
            </VaultCard>
          )}
          {section === "vault-email" && <VaultCard title={vaultLabel(labels, "vaultEmailTitle", "이메일 보관")} section="email" labels={labels} className="amic-search-results-card"><PendingBoundary icon={Mail} title={vaultLabel(labels, "vaultEmailTitle", "이메일 보관")} marker="email-filing">{vaultLabel(labels, "vaultEmailPending", "선택한 이메일 또는 첨부를 명시적으로 저장하고 Vault readback을 확인하는 연결을 준비 중입니다.")}</PendingBoundary></VaultCard>}

          {section === "vault-audit" && <VaultCard title={vaultLabel(labels, "vaultAuditTitle", "Vault 감사")} section="audit" count={auditResult?.kind === "data" ? auditResult.items.length : null} labels={labels} className="amic-search-results-card"><VaultAuditState result={auditResult} labels={labels} onRetry={retryRead} /></VaultCard>}
          {section === "vault-ethical-wall" && <VaultCard title={vaultLabel(labels, "vaultEthicalWallLabel", "Ethical Wall")} section="ethical-wall" labels={labels} className="amic-search-results-card"><PendingBoundary title={vaultLabel(labels, "vaultGovernanceTitle", "Vault 거버넌스")} marker="ethical-wall-authority">{vaultLabel(labels, "vaultEthicalWallPending", "Ethical Wall 결정은 Vault 서버 readback이 제공될 때만 표시합니다.")}</PendingBoundary></VaultCard>}
          {section === "vault-records" && <VaultCard title={vaultLabel(labels, "vaultRecordsLabel", "Legal Hold/Records")} section="records" count={documentCount} labels={labels} className="amic-search-results-card"><DocumentCollectionState result={documentsResult} labels={labels} onOpen={openDocument} onRetry={retryRead} /></VaultCard>}
          {section === "vault-dlp" && <VaultCard title={vaultLabel(labels, "vaultDlpLabel", "DLP")} section="dlp" labels={labels} className="amic-search-results-card"><PendingBoundary title={vaultLabel(labels, "vaultGovernanceTitle", "Vault 거버넌스")} marker="dlp-authority">{vaultLabel(labels, "vaultDlpPending", "DLP 판정 결과를 Vault 서버에서 안전하게 투영하는 연결을 준비 중입니다.")}</PendingBoundary></VaultCard>}

          {selectedTargetMismatch && <section className="vault-exact-target-mismatch" role="alert" data-vault-exact-target-mismatch="true"><ShieldCheck size={17} /><span>{vaultLabel(labels, "documentReviewRequired", "요청한 문서 버전과 Vault readback이 일치하지 않습니다.")}</span></section>}
          {selectedDocument && <VaultDocumentDetail
            document={selectedDocument}
            labels={labels}
            saveAsAvailable={Boolean(downloadAllowed && desktopSaveBridge() && vaultSaveAsRequest(selectedDocument))}
            saveAsState={saveAsState}
            onSaveAs={saveSelectedDocumentAs}
            previewAvailable={Boolean(downloadAllowed && desktopPreviewBridge() && vaultPreviewRequest(selectedDocument))}
            previewState={previewState}
            onPreview={previewSelectedDocument}
            classicOutlookAttachAvailable={Boolean(
              section === "vault-outlook"
              && classicOutlookAttachRequest?.type === "classic_outlook_attach_request"
              && downloadAllowed
              && desktopClassicOutlookBridge()
              && vaultClassicOutlookAttachRequest(
                selectedDocument,
                classicOutlookAttachRequest?.request_handle,
              )
            )}
            classicOutlookAttachState={outlookAttachState}
            onClassicOutlookAttach={attachSelectedDocumentToClassicOutlook}
          />}
        </div>
      )}
    </section>
  );
}
