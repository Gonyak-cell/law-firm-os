import React from "react";
import { ArrowRight } from "lucide-react";

export function DashboardListCard({
  className = "",
  title,
  section,
  children,
  onViewAll,
  viewAllLabel = "전체 보기"
}) {
  return (
    <section className={`home-dashboard-card operational-dashboard-card ${className}`} data-dashboard-section={section}>
      <header className="home-dashboard-card-header">
        <div><span>{title}</span></div>
        {onViewAll && (
          <div className="home-dashboard-card-actions">
            <button type="button" className="home-widget-view-all" aria-label={`${title} ${viewAllLabel}`} onClick={onViewAll}>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

export function DashboardRecordList({ children, emptyText = "표시할 항목이 없습니다" }) {
  const rows = React.Children.toArray(children);
  if (rows.length === 0) return <div className="home-widget-empty"><span>{emptyText}</span></div>;
  return <div className="dashboard-record-list">{rows}</div>;
}

function uniqueDashboardMeta(title, meta) {
  if (typeof title !== "string" || typeof meta !== "string") return meta;
  const normalize = (value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return meta;
  const parts = meta.split(/\s+(?:\/|·|\||—)\s+/).map((part) => part.trim()).filter(Boolean);
  const uniqueParts = parts.filter((part) => normalize(part) !== normalizedTitle);
  return uniqueParts.length === parts.length ? meta : uniqueParts.join(" / ") || null;
}

export function DashboardRecordRow(props) {
  const { title, meta, detail, status = null, onOpen = null } = props;
  const uniqueMeta = uniqueDashboardMeta(title, meta);
  const content = (
    <>
      <span className="dashboard-record-copy">
        <strong>{title}</strong>
        {uniqueMeta && <small>{uniqueMeta}</small>}
      </span>
      {detail && <span className="dashboard-record-detail">{detail}</span>}
      {status && <em>{status}</em>}
      {onOpen && <ArrowRight size={15} aria-hidden="true" />}
    </>
  );
  if (!onOpen) return <div className="dashboard-record-row">{content}</div>;
  return <button type="button" className="dashboard-record-row" onClick={onOpen}>{content}</button>;
}

export function DashboardReadState({ result, noun, children }) {
  if (result === null || result === undefined || result?.kind === "loading") {
    return <div className="live-data-state live-data-loading"><strong>{noun}을 불러오는 중입니다</strong></div>;
  }
  if (result?.uiState === "denied") {
    return <div className="live-data-state live-data-denied"><strong>{noun} 접근 권한이 없습니다</strong></div>;
  }
  if (result?.uiState === "review_required" || result?.outcome === "review_required") {
    return <div className="live-data-state live-data-review"><strong>{noun} 검토가 필요합니다</strong></div>;
  }
  if (result?.kind === "error") {
    return <div className="live-data-state live-data-error"><strong>{noun}을 불러오지 못했습니다</strong></div>;
  }
  return children;
}
