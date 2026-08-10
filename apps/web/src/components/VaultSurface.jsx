import React, { useEffect, useRef, useState } from "react";
import { Bookmark, FileText, Search, Share2, Trash2 } from "lucide-react";
import {
  fetchVaultDocuments,
  fetchVaultSearch,
  fetchVaultSearchPreferences,
  writeVaultSearchPreferences
} from "../data/apiClient.js";
import heroVaultArchitecture from "../assets/heroes/hero-vault-architecture.jpg";
import { DesktopDeniedState } from "./DesktopDeniedState.jsx";
import { ForestHero } from "./ForestHero.jsx";
import { VaultDocumentDetail } from "./VaultDocumentDetail.jsx";

const VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";
const SEARCH_QUERY_LIMIT = 200;
const SEARCH_RECENT_LIMIT = 20;
const SAFE_DOCUMENT_TARGET_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SAFE_DOCUMENT_TARGET_SHA256 = /^[a-f0-9]{64}$/u;
const EMPTY_SEARCH_PREFERENCES = Object.freeze({ recent: [], saved: [] });
const SEARCH_SECTIONS = new Set([
  "vault-search-home",
  "vault-search-all",
  "vault-search-documents",
  "vault-search-recent",
  "vault-search-saved"
]);

function searchLabel(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

export function matchesVaultDocumentTarget(document, {
  documentId = "",
  matterId = "",
  versionId = "",
  sha256 = "",
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
    date_to: dateTo,
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
  const next = {
    ...current,
    recent: [
      { id: `recent:${Date.now()}`, ...preference },
      ...current.recent.filter((item) => searchPreferenceKey(item) !== searchPreferenceKey(preference))
    ].slice(0, SEARCH_RECENT_LIMIT)
  };
  return next;
}

export function saveSearch(current, query, filters = {}) {
  const normalized = String(query ?? "").trim().slice(0, SEARCH_QUERY_LIMIT);
  if (!normalized) return current;
  const preference = { query: normalized, scope: "documents-ocr", searched_at: new Date().toISOString(), ...normalizeSearchFilters(filters) };
  if (current.saved.some((item) => searchPreferenceKey(item) === searchPreferenceKey(preference))) return current;
  const next = {
    ...current,
    saved: [{ id: `saved:${Date.now()}`, ...preference }, ...current.saved]
  };
  return next;
}

export function removeSavedSearch(current, id) {
  const next = { ...current, saved: current.saved.filter((item) => item.id !== id) };
  return next;
}

export function clearRecentSearches(current) {
  const next = { ...current, recent: [] };
  return next;
}

function SearchCard({ title, section, count, labels, className = "", children }) {
  return (
    <section
      className={`home-dashboard-card amic-search-card ${className}`.trim()}
      data-amic-search-section={section}
    >
      <header className="home-dashboard-card-header">
        <div>
          <span>{title}</span>
        </div>
        {Number.isFinite(count) && <strong>{count}{labels?.language === "English" ? "" : "건"}</strong>}
      </header>
      <div className="home-dashboard-card-body">{children}</div>
    </section>
  );
}

function matchLabel(fields = [], localizedLabels) {
  const matches = fields.flatMap((field) => {
    if (field === "body_text") return [searchLabel(localizedLabels, "searchMatchBody", "본문")];
    if (field === "ocr_text") return ["본문"];
    if (field === "title") return [searchLabel(localizedLabels, "searchMatchTitle", "제목")];
    if (field === "matter_id") return ["Matter"];
    if (field === "version_id") return [searchLabel(localizedLabels, "searchMatchVersion", "버전")];
    return [];
  });
  return [...new Set(matches)].join(" / ") || searchLabel(localizedLabels, "searchDocumentFallback", "문서");
}

function documentTitle(item, index, labels) {
  return item?.title ?? item?.document_name ?? `${searchLabel(labels, "searchDocumentFallback", "문서")} ${index + 1}`;
}

function SearchRows({ items, emptyText, labels, onOpen }) {
  if (items.length === 0) {
    return <div className="amic-search-empty">{emptyText}</div>;
  }

  return (
    <div className="amic-search-list">
      {items.map((item, index) => (
        <button type="button" className="amic-search-row" key={item.document_id ?? item.version_id ?? `${documentTitle(item, index, labels)}-${index}`} onClick={() => onOpen?.(item)}>
          <FileText size={17} aria-hidden="true" />
          <strong>{documentTitle(item, index, labels)}</strong>
          <span>{matchLabel(item.match_fields, labels)}</span>
        </button>
      ))}
    </div>
  );
}

function RecentDocuments({ result, labels, onOpen }) {
  if (result === null) return <div className="amic-search-empty">{searchLabel(labels, "searchDocumentsLoading", "문서를 불러오는 중입니다")}</div>;
  if (result.kind === "error") return <div className="amic-search-empty">{searchLabel(labels, "searchDocumentsError", "문서를 불러오지 못했습니다")}</div>;
  if (result.uiState === "denied") return <DesktopDeniedState />;
  if (result.uiState === "review_required") return <div className="live-data-state"><strong>{searchLabel(labels, "searchReviewTitle", "검토가 필요합니다")}</strong>{searchLabel(labels, "searchReviewDocuments", "문서 접근 권한을 확인하세요.")}</div>;

  return <SearchRows items={result.items.slice(0, 6)} emptyText={searchLabel(labels, "searchDocumentsEmpty", "최근 문서가 없습니다")} labels={labels} onOpen={onOpen} />;
}

function SearchResults({ result, pending, submittedQuery, labels, onOpen }) {
  if (pending) return <div className="amic-search-empty">{searchLabel(labels, "searchLoading", "검색 중입니다")}</div>;
  if (!submittedQuery) return <div className="amic-search-empty">{searchLabel(labels, "searchInputEmpty", "검색어를 입력하면 결과가 표시됩니다")}</div>;
  if (result?.kind === "error") return <div className="amic-search-empty">{searchLabel(labels, "searchResultsError", "검색 결과를 불러오지 못했습니다")}</div>;
  if (result?.uiState === "denied") return <DesktopDeniedState />;
  if (result?.uiState === "review_required") return <div className="live-data-state"><strong>{searchLabel(labels, "searchReviewTitle", "검토가 필요합니다")}</strong>{searchLabel(labels, "searchReviewResults", "권한 검토 후 다시 검색하세요.")}</div>;

  return <SearchRows items={result?.kind === "data" ? result.items : []} emptyText={searchLabel(labels, "searchResultsEmpty", "검색 결과가 없습니다")} labels={labels} onOpen={onOpen} />;
}

function SearchPreferenceState({ state, labels, children }) {
  if (state === "ready") return children;
  if (state === "loading") return <div className="amic-search-empty">{searchLabel(labels, "searchHistoryPreferenceLoading", "검색 기록을 불러오는 중입니다")}</div>;
  if (state === "denied") return <DesktopDeniedState />;
  if (state === "review_required") return <div className="live-data-state"><strong>{searchLabel(labels, "searchReviewTitle", "검토가 필요합니다")}</strong>{searchLabel(labels, "searchReviewHistory", "검색 기록 권한을 확인하세요.")}</div>;
  return <div className="amic-search-empty">{searchLabel(labels, "searchHistoryPreferenceError", "검색 기록을 불러오지 못했습니다")}</div>;
}

function SearchHistoryRows({ items, labels, onRun, onDelete, deleteDisabled = false }) {
  if (items.length === 0) return null;
  return (
    <div className="search-query-list">
      {items.map((item) => (
        <div className="search-query-row" key={item.id}>
          <button type="button" className="search-query-open" data-compact-record="true" onClick={() => onRun(item)}>
            <Search size={16} aria-hidden="true" />
            <span>
              <strong>{item.query}</strong>
              <time dateTime={item.searched_at}>{new Date(item.searched_at).toLocaleDateString(labels?.language === "English" ? "en-US" : "ko-KR")}</time>
            </span>
          </button>
          {onDelete && (
            <button type="button" className="icon-button" disabled={deleteDisabled} aria-label={`${item.query} ${searchLabel(labels, "searchDeleteSuffix", "삭제")}`} onClick={() => onDelete(item.id)}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function VaultSurface({ labels = {}, liveCtx = "allow", activeSection = "vault-search-home", initialQuery = "", initialDocumentMatterId = "", initialDocumentId = "", initialDocumentVersionId = "", initialDocumentSha256 = "", initialDateFrom = "", initialDateTo = "", refreshSignal = 0, onNavigateSection = () => {} }) {
  const [documentsResult, setDocumentsResult] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(() => initialQuery.trim());
  const currentVersionOnly = true;
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
  const refreshSignalRef = useRef(refreshSignal);
  const preferenceRevisionRef = useRef(0);
  const preferenceWriteRef = useRef(Promise.resolve());
  const section = SEARCH_SECTIONS.has(activeSection) ? activeSection : "vault-search-home";

  useEffect(() => {
    const normalized = initialQuery.trim().slice(0, SEARCH_QUERY_LIMIT);
    setQuery(normalized);
    if (["vault-search-all", "vault-search-documents"].includes(section)) setSubmittedQuery(normalized);
    else setSubmittedQuery("");
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
  }, [liveCtx, initialDocumentMatterId, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    const requestedRevision = preferenceRevisionRef.current;
    fetchVaultSearchPreferences({
      ctx: liveCtx,
      permissionRef: VAULT_PERMISSION_REF,
      auditHintRef: VAULT_AUDIT_HINT_REF
    }).then((next) => {
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
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    const normalizedQuery = submittedQuery.trim();
    if (!normalizedQuery) {
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
      currentVersionOnly,
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
  }, [liveCtx, submittedQuery, submittedDateFrom, submittedDateTo, refreshToken]);

  const searchReadable = searchResult?.kind === "data" && searchResult.outcome === "passed" && !["denied", "review_required"].includes(searchResult.uiState);
  const documentsReadable = documentsResult?.kind === "data" && documentsResult.outcome === "passed" && !["denied", "review_required"].includes(documentsResult.uiState);
  const searchItems = searchReadable ? searchResult.items : [];
  const documentCount = documentsReadable ? documentsResult.items.length : null;
  const draftFilters = normalizeSearchFilters({ current_version_only: true, date_from: dateFrom, date_to: dateTo });
  const submittedFilters = normalizeSearchFilters({ current_version_only: true, date_from: submittedDateFrom, date_to: submittedDateTo });
  const submittedPreference = { query: submittedQuery, ...submittedFilters };
  const searchStateDirty = query.trim() !== submittedQuery || searchPreferenceKey({ query: submittedQuery, ...draftFilters }) !== searchPreferenceKey(submittedPreference);
  const isSaved = preferences.saved.some((item) => searchPreferenceKey(item) === searchPreferenceKey(submittedPreference));

  useEffect(() => {
    if (!initialDocumentId) {
      setSelectedDocument(null);
      return;
    }
    const document = [...(documentsReadable ? documentsResult.items : []), ...searchItems]
      .find((item) => matchesVaultDocumentTarget(item, {
        documentId: initialDocumentId,
        matterId: initialDocumentMatterId,
        versionId: initialDocumentVersionId,
        sha256: initialDocumentSha256,
      }));
    setSelectedDocument(document ?? null);
  }, [initialDocumentMatterId, initialDocumentId, initialDocumentVersionId, initialDocumentSha256, searchResult, documentsResult]);

  function commitSearchPreferences(next, operation, payload = {}, previous = preferences) {
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
    const resultSection = section === "vault-search-documents" ? section : "vault-search-all";
    onNavigateSection(resultSection, { query: normalized, currentVersionOnly: nextFilters.current_version_only, dateFrom: nextFilters.date_from, dateTo: nextFilters.date_to });
  }

  async function copySearchLink() {
    if (!submittedQuery || typeof window === "undefined" || typeof navigator?.clipboard?.writeText !== "function") return;
    if (!window.confirm(searchLabel(labels, "searchCopyConfirm", "검색어가 링크에 포함됩니다. 링크를 복사할까요?"))) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", "vault");
    url.searchParams.set("query", submittedQuery);
    url.searchParams.set("current_version", "current");
    if (submittedFilters.date_from) url.searchParams.set("date_from", submittedFilters.date_from);
    else url.searchParams.delete("date_from");
    if (submittedFilters.date_to) url.searchParams.set("date_to", submittedFilters.date_to);
    else url.searchParams.delete("date_to");
    url.hash = section === "vault-search-documents" ? section : "vault-search-all";
    try {
      const auditResult = await writeVaultSearchPreferences({
        operation: "share_authorize",
        query: submittedQuery,
        ...submittedFilters,
        ctx: liveCtx,
        permissionRef: VAULT_PERMISSION_REF,
        auditHintRef: VAULT_AUDIT_HINT_REF
      });
      if (auditResult.kind !== "data") {
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
    if (!document?.document_id) return;
    const completeDocument = documentsReadable
      ? documentsResult.items.find((item) => item.document_id === document.document_id)
      : null;
    setSelectedDocument(completeDocument ?? document);
    const resultSection = section === "vault-search-documents" ? section : "vault-search-all";
    onNavigateSection(resultSection, { query: submittedQuery, currentVersionOnly: true, dateFrom: submittedDateFrom, dateTo: submittedDateTo, documentId: document.document_id });
  }

  const showDashboard = section === "vault-search-home";
  const showRecent = section === "vault-search-recent";
  const showSaved = section === "vault-search-saved";
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  return (
    <section
      id="vault-home"
      className="surface stack vault-surface amic-search-surface"
      data-amic-search-surface="true"
      data-search-section={section}
      data-search-scope="documents-ocr"
    >
      <ForestHero title="Search" image={heroVaultArchitecture} imageOpacity={0.24} />

      <div className="amic-search-grid">
        <SearchCard title={searchLabel(labels, "searchFormTitle", "전체 검색")} section="search" labels={labels} className="amic-search-query-card">
          <form
            className="amic-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch();
            }}
          >
            <Search size={19} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search"
              placeholder={searchLabel(labels, "searchPlaceholder", "문서 제목, 본문, Matter 검색")}
            />
            <button type="submit" disabled={!query.trim() || searchPending || invalidDateRange}>{searchLabel(labels, "searchSubmit", "검색")}</button>
          </form>
          <div className="amic-search-filters" aria-label={searchLabel(labels, "searchDocumentsLabel", "문서")}>
            <span className="amic-search-version-filter">{searchLabel(labels, "searchCurrentVersionOnly", "현재 버전만")}</span>
            <label>
              <span>{searchLabel(labels, "searchDateFrom", "시작일")}</span>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              <span>{searchLabel(labels, "searchDateTo", "종료일")}</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
          {invalidDateRange && <p className="search-preference-error" role="alert">{searchLabel(labels, "searchDateRangeError", "시작일은 종료일보다 늦을 수 없습니다")}</p>}
          {preferenceError && <p className="search-preference-error" role="alert">{searchLabel(labels, "searchPreferenceError", "검색 기록을 저장하지 못했습니다")}</p>}
        </SearchCard>

        {showDashboard && (
          <>
            <SearchCard title={searchLabel(labels, "searchRecentLabel", "최근 검색")} section="vault-search-recent" count={preferenceAccess === "ready" ? preferences.recent.length : null} labels={labels}>
              <SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.recent.slice(0, 5)} labels={labels} onRun={runSearch} /></SearchPreferenceState>
            </SearchCard>
            <SearchCard title={searchLabel(labels, "searchSavedLabel", "저장한 검색")} section="vault-search-saved" count={preferenceAccess === "ready" ? preferences.saved.length : null} labels={labels}>
              <SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.saved.slice(0, 5)} labels={labels} onRun={runSearch} /></SearchPreferenceState>
            </SearchCard>
          </>
        )}

        {showRecent && (
          <SearchCard title={searchLabel(labels, "searchRecentLabel", "최근 검색")} section="vault-search-recent" count={preferenceAccess === "ready" ? preferences.recent.length : null} labels={labels} className="amic-search-results-card">
            <SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.recent} labels={labels} onRun={runSearch} /></SearchPreferenceState>
            {preferences.recent.length > 0 && (
              <button type="button" className="text-button search-list-action" disabled={preferenceWriteCount > 0} onClick={() => {
                if (window.confirm(searchLabel(labels, "searchClearConfirm", "최근 검색 기록을 모두 비울까요?"))) {
                  commitSearchPreferences(clearRecentSearches(preferences), "clear_recent");
                }
              }}>{searchLabel(labels, "searchClearRecent", "최근 검색 비우기")}</button>
            )}
          </SearchCard>
        )}

        {showSaved && (
          <SearchCard title={searchLabel(labels, "searchSavedLabel", "저장한 검색")} section="vault-search-saved" count={preferenceAccess === "ready" ? preferences.saved.length : null} labels={labels} className="amic-search-results-card">
            <SearchPreferenceState state={preferenceAccess} labels={labels}><SearchHistoryRows items={preferences.saved} labels={labels} onRun={runSearch} onDelete={(id) => commitSearchPreferences(removeSavedSearch(preferences, id), "delete_saved", { id })} deleteDisabled={preferenceWriteCount > 0} /></SearchPreferenceState>
          </SearchCard>
        )}

        {!showDashboard && !showRecent && !showSaved && (
          <SearchCard title={searchLabel(labels, "searchResultsTitle", "검색 결과")} section="results" count={submittedQuery && searchReadable ? searchItems.length : null} labels={labels} className="amic-search-results-card">
            <div className="search-results-toolbar">
              <span>{searchLabel(labels, "searchDocumentsLabel", "문서")}</span>
              <button type="button" className="text-button" disabled={!submittedQuery || searchStateDirty || preferenceWriteCount > 0} onClick={copySearchLink}>
                <Share2 size={15} />
                {linkCopyState === "copied" ? searchLabel(labels, "searchCopySuccess", "링크 복사됨") : linkCopyState === "failed" ? searchLabel(labels, "searchCopyFailed", "복사 실패") : searchLabel(labels, "searchCopyLink", "검색 링크 복사")}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={!submittedQuery || searchStateDirty || isSaved || preferenceWriteCount > 0}
                onClick={() => commitSearchPreferences(saveSearch(preferences, submittedQuery, submittedFilters), "save", { query: submittedQuery, ...submittedFilters })}
              >
                <Bookmark size={15} />
                {isSaved ? searchLabel(labels, "searchSavedState", "저장됨") : searchLabel(labels, "searchSave", "검색 저장")}
              </button>
            </div>
            <SearchResults result={searchResult} pending={searchPending} submittedQuery={submittedQuery} labels={labels} onOpen={openDocument} />
          </SearchCard>
        )}

        {selectedDocument && <VaultDocumentDetail document={selectedDocument} labels={labels} />}

        {showDashboard && (
          <SearchCard title={searchLabel(labels, "searchRecentDocuments", "최근 문서")} section="recent" count={documentCount} labels={labels}>
            <RecentDocuments result={documentsResult} labels={labels} onOpen={openDocument} />
          </SearchCard>
        )}
      </div>
    </section>
  );
}
