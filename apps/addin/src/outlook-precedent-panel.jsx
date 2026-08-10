import React, { useEffect, useRef } from "react";
import { BookOpen, ExternalLink, FileText, RotateCw, Search } from "lucide-react";
import {
  OutlookCriticalValueRow,
  OutlookOneLineField,
} from "./outlook-compact-shell.jsx";

const SOURCE_KIND_LABELS = Object.freeze({
  internal_matter_document: "내부 문서",
  case_law_document: "판례",
});

function projectedValue(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  if (!item.copyable || typeof item.copyable !== "object" || Array.isArray(item.copyable)) return null;
  return { display: item, value: item.copyable };
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function sourceKindLabel(kind) {
  return SOURCE_KIND_LABELS[kind] ?? "자료";
}

function SourceKindIcon({ kind }) {
  const Icon = kind === "case_law_document" ? BookOpen : FileText;
  return (
    <span className="outlook-precedent-source-kind" role="img" aria-label={sourceKindLabel(kind)}>
      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

function formatCitation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return [value.court, value.case_number, value.decision_date].filter(Boolean).join(" · ");
}

function formatCopyValue(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) return formatCitation(value);
  return value == null ? "" : String(value);
}

function resultOneLine(display, value) {
  return text(display?.one_line)
    || [text(value?.title), text(value?.source_matter_id)].filter(Boolean).join(" · ")
    || "자료";
}

function sourceId(item) {
  return text(projectedValue(item)?.value?.source_id);
}

function ResultRow({ item, index, selected, onSelect }) {
  const projected = projectedValue(item);
  if (!projected) return null;
  const { display, value } = projected;
  const citation = formatCitation(value.citation);
  const structured = value.source_kind === "case_law_document" && citation ? ` · ${citation}` : "";
  const id = text(value.source_id);
  return (
    <button
      type="button"
      className="outlook-flat-action-row outlook-precedent-result-row"
      data-testid="outlook-precedent-result"
      data-source-id={id || undefined}
      aria-pressed={selected}
      onClick={() => onSelect?.(item)}
      disabled={typeof onSelect !== "function"}
    >
      <SourceKindIcon kind={value.source_kind} />
      <span className="outlook-one-line" data-result-index={index}>
        {resultOneLine(display, value)}{structured}
      </span>
    </button>
  );
}

function CriticalDetailRow({ field, label, value, onCopy }) {
  const formatted = formatCopyValue(value);
  if (!formatted) return null;
  return (
    <div data-testid={`outlook-precedent-critical-${field}`}>
      <span className="outlook-visually-hidden">{label}</span>
      <OutlookCriticalValueRow label={label} value={formatted} onCopy={onCopy} />
    </div>
  );
}

function SelectedDetail({ item, onCopy, onOpenDeepLink }) {
  const projected = projectedValue(item);
  if (!projected) return null;
  const { value } = projected;
  const fields = [
    ["source_id", "source_id", value.source_id],
    ["source_matter_id", "source_matter_id", value.source_matter_id],
    ["document_id", "document_id", value.document_id],
    ["version_id", "version_id", value.version_id],
    ["citation", "citation", value.citation],
    ["source_reference", "source_reference", value.source_reference],
    ["source_url", "source_url", value.source_url],
    ["content_sha256", "SHA-256", value.content_sha256 ?? value.hash],
    ["index_version", "index_version", value.index_version],
  ];
  const deepLink = text(value.deep_link);
  return (
    <section data-testid="outlook-precedent-detail" aria-label="선례 세부 정보">
      {fields.map(([field, label, fieldValue]) => (
        <CriticalDetailRow key={field} field={field} label={label} value={fieldValue} onCopy={onCopy} />
      ))}
      {deepLink && typeof onOpenDeepLink === "function" ? (
        <div className="outlook-flat-action-row">
          <span className="outlook-flat-action-label">원문</span>
          <button
            type="button"
            className="outlook-flat-action-button"
            data-testid="outlook-precedent-open"
            onClick={() => onOpenDeepLink(deepLink)}
          >
            <ExternalLink size={14} aria-hidden="true" />
            <span>Law Firm OS에서 열기</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function OutlookPrecedentPanel({
  authoritative,
  runtimeReady,
  authoritativeReady,
  query = "",
  onQueryChange,
  onSubmit,
  items = [],
  selectedItem = null,
  onSelect,
  onCopy,
  onOpenDeepLink,
  busy = false,
  error = "",
  empty = false,
  indexStale = false,
  onRetry,
}) {
  const blocked = authoritative !== true
    || runtimeReady !== true
    || authoritativeReady === false
    || authoritativeReady !== undefined && authoritativeReady !== true
    || indexStale !== false;
  const ready = !blocked;
  const blockedStatusRef = useRef(null);
  const panelRef = useRef(null);
  const previousReadyRef = useRef(ready);
  const isBusy = Boolean(busy);
  const errorText = typeof error === "string" ? error.trim() : text(error?.visibleMessage);
  const stale = indexStale === true || !ready;
  const rows = (Array.isArray(items) ? items : []).filter((item) => projectedValue(item));
  const selectedSourceId = sourceId(selectedItem);
  useEffect(() => {
    const previousReady = previousReadyRef.current;
    previousReadyRef.current = ready;
    if (!ready) {
      blockedStatusRef.current?.focus?.();
    } else if (previousReady === false) {
      panelRef.current?.querySelector("#precedent-search-input")?.focus?.();
    }
  }, [ready]);
  if (!ready) {
    return (
      <section ref={panelRef} className="outlook-precedent-panel" data-testid="outlook-precedent-panel" data-ready="false">
        <p
          ref={blockedStatusRef}
          className="outlook-one-line"
          data-testid="outlook-precedent-index-stale"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
        >{isBusy ? "검색 준비 상태 확인 중" : "색인 갱신 필요"}</p>
        {typeof onRetry === "function" && !isBusy ? (
          <div className="outlook-flat-action-row">
            <span className="outlook-flat-action-label">색인</span>
            <button type="button" className="outlook-flat-action-button" data-testid="outlook-precedent-retry" onClick={onRetry} disabled={isBusy}>
              <RotateCw size={14} aria-hidden="true" />
              <span>다시 시도</span>
            </button>
          </div>
        ) : null}
      </section>
    );
  }
  return (
    <section ref={panelRef} className="outlook-precedent-panel" data-testid="outlook-precedent-panel" data-ready="true">
      <form
        data-testid="outlook-precedent-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isBusy) onSubmit?.(query);
        }}
      >
        <OutlookOneLineField
          id="precedent-search-input"
          name="precedent_query"
          label="검색어"
          type="search"
          placeholder="검색어"
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          autoComplete="off"
          disabled={isBusy || stale}
          data-testid="outlook-precedent-search-input"
        />
        <div className="outlook-flat-action-row">
          <span className="outlook-flat-action-label">검색</span>
          <button type="submit" className="outlook-flat-action-button" data-testid="outlook-precedent-search-submit" disabled={isBusy || stale}>
            <Search size={14} aria-hidden="true" />
            <span>검색</span>
          </button>
        </div>
      </form>
      {isBusy ? <p className="outlook-one-line" data-testid="outlook-precedent-busy" role="status">검색 중</p> : null}
      {errorText ? (
        <div data-testid="outlook-precedent-error">
          <p className="outlook-one-line" role="alert">{errorText}</p>
          {typeof onRetry === "function" ? (
            <div className="outlook-flat-action-row">
              <span className="outlook-flat-action-label">검색</span>
              <button type="button" className="outlook-flat-action-button" data-testid="outlook-precedent-retry" onClick={onRetry} disabled={isBusy}>다시 시도</button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div data-testid="outlook-precedent-results" aria-live="polite">
        {empty || (!rows.length && !errorText) ? (
          <p className="outlook-one-line" data-testid="outlook-precedent-empty">결과 없음</p>
        ) : null}
        {rows.map((item, index) => (
          <ResultRow
            key={item?.copyable?.source_id ?? item?.source_id ?? index}
            item={item}
            index={index}
            selected={item === selectedItem || Boolean(sourceId(item) && selectedSourceId && sourceId(item) === selectedSourceId)}
            onSelect={onSelect}
          />
        ))}
      </div>
      <SelectedDetail item={selectedItem} onCopy={onCopy} onOpenDeepLink={onOpenDeepLink} />
    </section>
  );
}

export default OutlookPrecedentPanel;
