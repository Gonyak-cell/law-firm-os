import React from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Filter,
  GitBranch,
  LineChart,
  ListFilter,
  MoreVertical,
  PanelRightOpen,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Table2,
  X,
  Zap
} from "lucide-react";
import { DataTable, Panel, QueryBlock } from "./primitives.jsx";
import { fetchAnalyticsDashboards } from "../data/apiClient.js";

const ANALYTICS_PERMISSION_REF = "ui_cmp_g8_analytics_live";
const ANALYTICS_AUDIT_HINT_REF = "ui_cmp_g8_analytics_probe";

function dashboardRows(items) {
  return items.map((item, index) => [
    `업무 보드 ${index + 1}`,
    item.title,
    dashboardTypeLabel(item.dashboard_type),
    item.title ? "확인됨" : "확인 필요",
    item.matter_detail_omitted ? "비공개" : "담당자 확인"
  ]);
}

function dashboardTypeLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("matter")) return "Matter";
  if (normalized.includes("finance")) return "청구";
  if (normalized.includes("people")) return "People";
  if (normalized.includes("client")) return "Client";
  if (normalized.includes("vault")) return "Vault";
  return "업무";
}

function AnalyticsRuntimePanel({ liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchAnalyticsDashboards({
      ctx: liveCtx,
      permissionRef: ANALYTICS_PERMISSION_REF,
      auditHintRef: ANALYTICS_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const items = result?.kind === "data" ? result.items : [];

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading"><strong>보고서 불러오는 중</strong> 표시할 업무 보드를 확인하고 있습니다.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error"><strong>보고서를 불러올 수 없습니다</strong> 잠시 후 다시 시도하세요.</div>;
  } else if (result.uiState === "denied") {
    body = <div className="live-data-state live-data-denied"><strong>접근할 수 없습니다</strong> 현재 권한으로는 이 보고서를 볼 수 없습니다.</div>;
  } else if (result.uiState === "review_required" || result.outcome === "review_required") {
    body = <div className="live-data-state live-data-review"><strong>검토가 필요합니다</strong> 담당자 확인 후 보고서를 볼 수 있습니다.</div>;
  } else {
    body = (
      <div className="analytics-runtime-stack">
        <div className="intake-safe-strip">
          <ShieldCheck size={15} />
          <span>민감한 Matter 상세 내용은 목록에 표시하지 않습니다.</span>
        </div>
        <DataTable columns={["업무 보드", "제목", "구분", "상태", "Matter 상세"]} rows={dashboardRows(items)} />
      </div>
    );
  }

  return (
    <Panel title="보고서 검토" meta="업무 보드" className="analytics-runtime-panel" data-cmp-g8-analytics-runtime="true">
      <div className="analytics-runtime-actions">
        <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
          <RefreshCw size={15} />
          새로고침
        </button>
      </div>
      {body}
    </Panel>
  );
}

export function AnalyticsSurface({ labels, variant, onSave, liveCtx = "allow" }) {
  if (variant === "dataTable" || variant === "dataTablePicker") {
    return <DataTableBuilderSurface showPicker={variant === "dataTablePicker"} />;
  }

  return (
    <section className="builder-surface">
      <div className="builder-sidebar">
        <button className="builder-tab active">
          <LineChart size={15} />
          구분 보기
        </button>
        <button className="builder-tab">
          <GitBranch size={15} />
          단계 보기
        </button>
        <button className="builder-tab">
          <Table2 size={15} />
          표 보기
        </button>
        <button className="builder-tab">
          <Activity size={15} />
          유지 현황
        </button>
        <button className="builder-tab">
          <Zap size={15} />
          업무 흐름
        </button>
      </div>
      <div className="builder-main">
        <div className="builder-top">
          <div>
            <h1>{labels.builderTitle}</h1>
          </div>
          <div className="toolbar">
            <button className="secondary-button">
              <CalendarDays size={15} />
              최근 30일
            </button>
            <button className="secondary-button">
              <ListFilter size={15} />
              구분
            </button>
            <button className="secondary-button">
              <PanelRightOpen size={15} />
              보조 패널
            </button>
            <button className="primary-button" onClick={onSave}>
              <Save size={15} />
              {labels.saveChart}
            </button>
          </div>
        </div>
        <AnalyticsRuntimePanel liveCtx={liveCtx} />
        <div className="builder-body">
          <aside className="query-rail">
            <QueryBlock title="업무 항목" value="항목 선택" meta="선택 전" />
            <QueryBlock title="집계 기준" value="기준 선택" meta="선택 전" />
            <QueryBlock title="구분" value="구분 선택" meta="선택 전" />
            <button className="secondary-button full">
              <Plus size={15} />
              항목 추가
            </button>
          </aside>
          <section className="chart-area">
            <Panel title="보고서" meta="자료 선택 전">
              <div className="live-data-state live-data-empty">
                <strong>표시할 보고서가 없습니다</strong>
                자료를 선택하면 보고서가 표시됩니다.
              </div>
            </Panel>
            <Panel title={labels.resultTable} meta="자료 선택 전">
              <DataTable
                columns={["항목", "값", "건수", "고유값", "변경"]}
                rows={[]}
              />
            </Panel>
          </section>
          <aside className="side-panel">
            <h3>확인할 항목</h3>
            <p>보고서 기준, 표시 항목, 내보내기 상태를 확인합니다.</p>
            <div className="heatmap">
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index} style={{ opacity: 0.25 + ((index % 6) * 0.13) }} />
              ))}
            </div>
          </aside>
        </div>
      </div>
      {variant === "shareToast" && (
        <div className="share-success-toast" role="status">
          <CheckCircle2 size={16} />
          <span><strong>공유 완료.</strong> 선택한 사용자에게 보고서를 공유했습니다.</span>
          <button className="icon-button" type="button" aria-label="공유 알림 닫기">
            <X size={14} />
          </button>
        </div>
      )}
    </section>
  );
}

export function DataTableBuilderSurface({ showPicker }) {
  const eventOptions = ["업무 항목", "Matter 항목", "문서 항목", "검토 항목"];

  return (
    <section className="data-builder-surface">
      <aside className="data-builder-rail">
        <div className="builder-mode-tabs">
          {[
            [LineChart, "구분 보기"],
            [Filter, "단계 보기"],
            [Table2, "표 보기"],
            [Activity, "유지 현황"],
            [Zap, "업무 흐름"]
          ].map(([Icon, label]) => (
            <button key={label} className={label === "표 보기" ? "active" : ""}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="data-builder-section">
          <h3>구분</h3>
          <button className="segment-box">
            <strong>—</strong>
            <span>선택된 구분 없음</span>
            <MoreVertical size={15} />
          </button>
          <div className="segment-actions">
            <button>+ 필터</button>
            <button>+ 그룹</button>
            <button>+ 완료 항목</button>
          </div>
          <button className="text-button">+ 구분 추가</button>
        </div>
      </aside>
      <main className="data-builder-main">
        <div className="data-empty-illustration" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <h1>표 보고서 만들기</h1>
        <p>여러 업무 항목을 한 화면에서 비교합니다.</p>
        <button className="primary-button">
          <Plus size={15} />
          항목 추가
          <ChevronDown size={14} />
        </button>
        {showPicker && (
          <div className="metric-picker">
            <section>
              <label className="picker-search">
                <Search size={15} />
                <input placeholder="검색" />
              </label>
              <div className="picker-tabs">
                <button className="active">항목</button>
                <button>기준</button>
              </div>
              <h3>업무 항목</h3>
              {eventOptions.map((event) => (
                <button key={event} className="event-option">
                  <Activity size={14} />
                  {event}
                </button>
              ))}
            </section>
            <section className="metric-picker-preview">
              <div className="live-data-state live-data-empty">선택된 기준 없음</div>
              <strong>기준을 선택하거나 만드세요</strong>
            </section>
          </div>
        )}
        <button className="text-button learn-link">
          <PlayCircle size={15} />
          표 보고서 도움말
        </button>
      </main>
    </section>
  );
}
