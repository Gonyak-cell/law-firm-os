import React from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, FileText, ListChecks, MessageSquare, Pencil, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import {
  bulkCompleteMatterStatus,
  changeMatterOwner,
  completeMatterStatus,
  createAnalyticsExport,
  createFinanceTimeEntry,
  fetchAnalyticsDashboards,
  fetchAnalyticsMatterProfitability,
  fetchFinanceAudit,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchMatterAudit,
  fetchMatterCommandCenter,
  fetchMatterListViews,
  fetchMatterRecentlyViewed,
  fetchMatterRecords,
  fetchMatterTimeline,
  generateFinanceWip,
  importFinancePayment,
  markMatterRecentlyViewed,
  refreshAnalyticsDashboards,
  refreshMatterProfitability,
  saveMatterListView,
  updateMatterInlineFields
} from "../data/apiClient.js";
import { DataTable, PageHeader, Panel, Property } from "./primitives.jsx";
import { DesktopDeniedState } from "./DesktopDeniedState.jsx";
import { MatterOpeningWizard } from "./MatterOpeningWizard.jsx";
import { MatterTeamRoster } from "./MatterTeamRoster.jsx";
import { MatterVaultPanel } from "./MatterVaultPanel.jsx";

const MATTER_PERMISSION_REF = "ui_cmp_g4_matter_live";
const MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_probe";
const MATTER_SECTIONS = new Set([
  "matters-list",
  "matter-command",
  "matter-vault",
  "matter-timeline",
  "matter-opening",
  "matter-team",
  "matter-billing",
  "matter-analytics"
]);
const MATTER_PATH_STEPS = ["신규", "충돌검토", "계약", "수행", "청구"];
const TIMELINE_FILTERS = Object.freeze([
  Object.freeze({ id: "all", label: "전체", icon: ListChecks }),
  Object.freeze({ id: "matter", label: "Matter", icon: CheckCircle2 }),
  Object.freeze({ id: "document", label: "문서", icon: FileText }),
  Object.freeze({ id: "schedule", label: "일정", icon: CalendarClock }),
  Object.freeze({ id: "message", label: "메시지", icon: MessageSquare })
]);

function matterNumberLabel(value, index = 0) {
  const text = String(value ?? "").trim();
  if (!text || /synthetic|rp0|tenant|_[a-z0-9]/i.test(text)) return `Matter ${index + 1}`;
  return text;
}

function matterTitleLabel(value, index = 0) {
  const text = String(value ?? "").trim();
  if (!text || /synthetic|rp0|_[a-z0-9]/i.test(text)) return `Matter ${index + 1}`;
  return text;
}

function matterStatus(value) {
  if (value === "opening") return "개시 중";
  if (value === "review_required") return "검토 필요";
  if (value === "closed") return "종료";
  return "진행 중";
}

function billingStatus(value) {
  if (value === "not_started") return "시작 전";
  if (value === "review_required") return "검토 필요";
  if (value === "completed") return "완료";
  if (value === "ethical_wall") return "제한";
  if (value === "opening_wip_clear") return "WIP 가능";
  return "진행 중";
}

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function applyMatterListView(matters, listView) {
  const status = listView?.filter?.status ?? "all";
  if (status === "all") return matters;
  return matters.filter((item) => item.status === status);
}

function viewedAtLabel(value) {
  if (!value) return "최근";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "최근";
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function timelineTimeLabel(value) {
  if (!value) return "시각 미정";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "시각 미정";
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function timelineCategory(entry) {
  const text = `${entry?.type ?? ""} ${entry?.source_ref ?? ""} ${entry?.title ?? ""}`.toLowerCase();
  if (/document|vault|doc_/.test(text)) return "document";
  if (/calendar|schedule|deadline|task|event/.test(text)) return "schedule";
  if (/email|mail|message|channel|comment|note/.test(text)) return "message";
  return "matter";
}

function timelineTypeLabel(entry) {
  const category = timelineCategory(entry);
  if (category === "document") return "문서";
  if (category === "schedule") return "일정";
  if (category === "message") return "메시지";
  if (entry?.type === "matter.status.transitioned") return "상태";
  if (entry?.type === "matter.document.facade") return "문서";
  return "Matter";
}

function timelineSourceLabel(entry) {
  const category = timelineCategory(entry);
  if (category === "document") return "Vault";
  if (category === "schedule") return "일정";
  if (category === "message") return "Channel";
  if (entry?.type === "matter.status.transitioned") return "Path";
  return "Record";
}

function timelineTitleLabel(entry, index = 0) {
  const text = String(entry?.title ?? "").trim();
  if (text === "Matter status updated") return "Matter 상태 업데이트";
  if (text === "Matter document linked") return "문서 연결";
  if (!text || /synthetic|rp0|tenant|_[a-z0-9]/i.test(text)) return `활동 ${index + 1}`;
  return text;
}

function moneyLabel(value, currency = "KRW") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "미지정";
  return `${currency} ${amount.toLocaleString("ko-KR")}`;
}

function dashboardTypeLabel(value) {
  if (value === "ar_aging") return "AR Aging";
  if (value === "client_health") return "Client Health";
  if (value === "practice_pnl") return "Practice P&L";
  return "Dashboard";
}

function dashboardStatusLabel(value) {
  if (value === "published") return "게시됨";
  if (value === "draft") return "초안";
  return "사용 중";
}

function dashboardMetricLabel(item) {
  if (item.dashboard_type === "ar_aging") return moneyLabel(item.metric_value, "KRW");
  if (item.dashboard_type === "client_health") return `${item.metric_value ?? 0}%`;
  return String(item.metric_value ?? "미지정");
}

function actionMessage(result, successText) {
  if (!result) return null;
  if (result.kind === "error") return "처리하지 못했습니다.";
  if (result.uiState === "blocked" || result.uiState === "review_required") return "검토가 필요합니다.";
  return successText;
}

function auditActionLabel(value) {
  if (value === "time.entry.create") return "시간 생성";
  if (value === "wip.generate") return "WIP 생성";
  if (value === "payment.import") return "수납 기록";
  if (value === "matter.open") return "Matter 개시";
  if (value === "matter.team.add") return "팀 추가";
  if (value === "matter.document.facade") return "문서 연결";
  if (value === "matter.status.transitioned") return "상태 완료";
  if (value === "matter.owner.assignment") return "책임자 지정";
  if (value === "matter.owner.change") return "책임자 변경";
  return value ? "기록됨" : "기록";
}

function auditTargetLabel(value) {
  if (value === "TimeEntry") return "시간";
  if (value === "Payment") return "수납";
  if (value === "Matter") return "Matter";
  if (value === "Document") return "문서";
  if (value === "MatterTeamMember") return "팀";
  return value ?? "레코드";
}

function ownerLabel(matter) {
  const display = String(matter?.owner_display_name ?? "").trim();
  if (display && !/synthetic|rp0|_[a-z0-9]/i.test(display)) return display;
  if (matter?.owner_employee_id || matter?.owner_user_id) return "지정됨";
  return "미지정";
}

function matterStageIndex(matter) {
  if (!matter) return 0;
  if (matter.status === "opening") return 1;
  if (matter.status === "closed") return 4;
  if (matter.wip_status === "opening_wip_clear" || matter.wip_status === "completed") return 4;
  return 3;
}

function renderCollectionState(result, noun) {
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
        잠시 후 다시 시도해주세요.
      </div>
    );
  }
  if (result.uiState === "denied") return <DesktopDeniedState />;
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 {noun} 정보를 확인할 수 있습니다.
      </div>
    );
  }
  if (result.uiState === "empty" || resultItems(result).length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>표시할 {noun} 정보가 없습니다</strong>
      </div>
    );
  }
  return null;
}

function renderCommandState(result, matter) {
  if (!matter || result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>Command Center를 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>Command Center를 불러오지 못했습니다</strong>
        잠시 후 다시 시도해주세요.
      </div>
    );
  }
  if (result.uiState === "denied") return <DesktopDeniedState />;
  return null;
}

function MatterPath({ matter }) {
  const activeIndex = matterStageIndex(matter);
  return (
    <ol className="status-path" data-matter-status-path="true">
      {MATTER_PATH_STEPS.map((step, index) => (
        <li key={step} className={index <= activeIndex ? "complete" : ""}>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function MatterRecordPanel({
  matter,
  commandResult,
  timelineResult,
  billingCount,
  analyticsCount,
  inlineEditResult,
  inlineEditPending,
  onInlineEdit,
  ownerChangeResult,
  ownerChangePending,
  onOwnerChange
}) {
  const command = commandResult?.kind === "data" ? commandResult : null;
  const timelineEntries = timelineResult?.kind === "data" ? timelineResult.item?.visible_entries ?? [] : [];
  const teamCount = command?.team?.length ?? matter?.team_member_count ?? 0;
  const vaultCount = command?.vaultSummary?.document_count ?? matter?.document_count ?? 0;
  return (
    <aside className="record-side-panel" data-matter-record-workspace="right-panel">
      <div className="record-side-header">
        <span className="eyebrow">레코드</span>
        <strong>{matterNumberLabel(matter?.matter_number)}</strong>
      </div>
      <div className="property-grid tight">
        <Property label="상태" value={matter ? matterStatus(matter.status) : "대기"} />
        <Property label="청구" value={matter ? billingStatus(matter.wip_status) : "대기"} />
        <Property label="책임자" value={ownerLabel(matter)} />
        <Property label="팀" value={String(teamCount)} />
        <Property label="문서" value={String(vaultCount)} />
      </div>
      <div className="record-meter-grid">
        <div>
          <span>활동</span>
          <strong>{timelineEntries.length}</strong>
        </div>
        <div>
          <span>청구</span>
          <strong>{billingCount}</strong>
        </div>
        <div>
          <span>분석</span>
          <strong>{analyticsCount}</strong>
        </div>
      </div>
      <div className="record-action-strip" data-matter-record-inline-edit-action="true">
        <div>
          <strong>청구 상태</strong>
          <span>{matter ? billingStatus(matter.wip_status) : "대기"}</span>
          <ActionNotice
            pending={inlineEditPending}
            result={inlineEditResult}
            pendingText="필드를 저장 중입니다."
            successText="필드가 저장되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || inlineEditPending} onClick={onInlineEdit}>
          <Pencil size={15} />
          저장
        </button>
      </div>
      {inlineEditResult?.kind === "data" && inlineEditResult.fieldPatch && (
        <div className="record-boundary-note" data-matter-record-inline-edit-result="true">
          <ShieldCheck size={15} />
          <span>청구 상태 필드가 저장되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-matter-record-owner-change-action="true">
        <div>
          <strong>책임자</strong>
          <span>{ownerLabel(matter)}</span>
          <ActionNotice
            pending={ownerChangePending}
            result={ownerChangeResult}
            pendingText="책임자를 변경 중입니다."
            successText="책임자가 변경되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || ownerChangePending} onClick={onOwnerChange}>
          <UserCheck size={15} />
          변경
        </button>
      </div>
      {ownerChangeResult?.kind === "data" && ownerChangeResult.ownerAssignment && (
        <div className="record-boundary-note" data-matter-record-owner-change-result="true">
          <ShieldCheck size={15} />
          <span>책임자 변경이 기록되었습니다.</span>
        </div>
      )}
      <div className="record-boundary-note">
        <ShieldCheck size={15} />
        <span>권한 기준에 맞춰 표시됩니다.</span>
      </div>
    </aside>
  );
}

function RecentlyViewedPanel({ result }) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading" data-matter-recently-viewed="true">
        <strong>최근 본 Matter를 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error" data-matter-recently-viewed="true">
        <strong>최근 본 Matter를 불러오지 못했습니다</strong>
      </div>
    );
  }
  const rows = resultItems(result);
  if (rows.length === 0) {
    return (
      <div className="live-data-state live-data-empty" data-matter-recently-viewed="true">
        <strong>최근 본 Matter가 없습니다</strong>
      </div>
    );
  }
  return (
    <div className="matter-live-stack" data-matter-recently-viewed="true">
      <div className="matter-review-strip">
        <ShieldCheck size={15} />
        <span>개인 작업 기록</span>
      </div>
      <DataTable
        columns={["최근 본 항목", "제목", "상태", "일시"]}
        rows={rows.map((item, index) => [
          matterNumberLabel(item.matter_number, index),
          matterTitleLabel(item.title, index),
          matterStatus(item.status),
          viewedAtLabel(item.viewed_at)
        ])}
      />
    </div>
  );
}

function MatterListViewPanel({
  result,
  activeListViewId,
  onSelectListView,
  onSaveListView,
  pending,
  actionResult
}) {
  const views = resultItems(result);
  return (
    <div className="matter-list-view-panel" data-matter-saved-list-views="true">
      <div className="matter-list-view-options" role="tablist" aria-label="Matter saved list views">
        {views.length === 0 && <span className="subtle-text">저장된 View 없음</span>}
        {views.map((view) => {
          const active = view.list_view_id === activeListViewId;
          return (
            <button
              key={view.list_view_id}
              type="button"
              className={active ? "matter-list-view-option active" : "matter-list-view-option"}
              role="tab"
              aria-selected={active}
              data-matter-list-view-option="true"
              data-active={active ? "true" : "false"}
              onClick={() => onSelectListView(view.list_view_id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
      <div className="matter-list-view-actions">
        <ActionNotice
          pending={pending}
          result={actionResult}
          pendingText="View 저장 중입니다."
          successText="View가 저장되었습니다."
        />
        <button
          className="secondary-button"
          type="button"
          disabled={pending || result?.kind !== "data"}
          data-matter-save-list-view-action="true"
          onClick={onSaveListView}
        >
          <ListChecks size={15} />
          개시 저장
        </button>
      </div>
    </div>
  );
}

function MatterBulkActionBar({ selectedCount, pending, result, onComplete }) {
  return (
    <div className="matter-bulk-action-bar" data-matter-bulk-actions="true">
      <div>
        <strong>{selectedCount}개 선택</strong>
        <ActionNotice
          pending={pending}
          result={result}
          pendingText="일괄 완료 처리 중입니다."
          successText="선택 항목이 완료되었습니다."
        />
      </div>
      <button
        className="secondary-button"
        type="button"
        disabled={selectedCount === 0 || pending}
        data-matter-bulk-status-action="true"
        onClick={onComplete}
      >
        <CheckCircle2 size={15} />
        선택 완료
      </button>
    </div>
  );
}

function MatterSelectableList({
  matters,
  selectedMatterId,
  selectedMatterIds,
  onSelectMatter,
  onToggleMatter,
  onToggleAll
}) {
  const selectedSet = new Set(selectedMatterIds);
  const allVisibleSelected = matters.length > 0 && matters.every((item) => selectedSet.has(item.matter_id));
  return (
    <div className="matter-selectable-list" data-matter-selected-record-list="true" role="listbox" aria-label="Matter records">
      <div className="matter-selectable-header">
        <span>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            disabled={matters.length === 0}
            aria-label="표시된 Matter 전체 선택"
            data-matter-bulk-select-all="true"
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        </span>
        <span>Matter</span>
        <span>제목</span>
        <span>진행 상태</span>
        <span>청구 상태</span>
      </div>
      {matters.length === 0 && (
        <div className="live-data-state live-data-empty" data-matter-list-view-empty="true">
          <strong>조건에 맞는 Matter가 없습니다</strong>
        </div>
      )}
      {matters.map((item, index) => {
        const selected = item.matter_id === selectedMatterId;
        const checked = selectedSet.has(item.matter_id);
        return (
          <div
            key={item.matter_id ?? `${item.matter_number}-${index}`}
            className={selected ? "matter-selectable-row active" : "matter-selectable-row"}
            role="option"
            aria-selected={selected}
            data-matter-select-row="true"
            data-selected={selected ? "true" : "false"}
          >
            <label className="matter-bulk-check">
              <input
                type="checkbox"
                checked={checked}
                aria-label={`${matterNumberLabel(item.matter_number, index)} 선택`}
                data-matter-bulk-select-row="true"
                onChange={(event) => onToggleMatter(item.matter_id, event.target.checked)}
              />
            </label>
            <button
              type="button"
              className="matter-selectable-record-button"
              aria-pressed={selected}
              onClick={() => onSelectMatter(item.matter_id)}
            >
              <strong>{matterNumberLabel(item.matter_number, index)}</strong>
              <span>{matterTitleLabel(item.title, index)}</span>
              <span>{matterStatus(item.status)}</span>
              <span>{billingStatus(item.wip_status)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MattersTable({
  result,
  matters,
  selectedMatterId,
  onSelectMatter,
  recentResult,
  listViewResult,
  activeListViewId,
  onSelectListView,
  onSaveListView,
  listViewPending,
  listViewActionResult,
  selectedMatterIds,
  onToggleMatter,
  onToggleAll,
  bulkPending,
  bulkResult,
  onBulkComplete
}) {
  const state = renderCollectionState(result, "Matter");
  if (state) return state;
  return (
    <div className="matter-live-stack">
      <div className="matter-review-strip">
        <ShieldCheck size={15} />
        <span>새 Matter 개시는 승인 후 반영됩니다.</span>
      </div>
      <MatterListViewPanel
        result={listViewResult}
        activeListViewId={activeListViewId}
        onSelectListView={onSelectListView}
        onSaveListView={onSaveListView}
        pending={listViewPending}
        actionResult={listViewActionResult}
      />
      <MatterBulkActionBar
        selectedCount={selectedMatterIds.length}
        pending={bulkPending}
        result={bulkResult}
        onComplete={onBulkComplete}
      />
      <MatterSelectableList
        matters={matters}
        selectedMatterId={selectedMatterId}
        selectedMatterIds={selectedMatterIds}
        onSelectMatter={onSelectMatter}
        onToggleMatter={onToggleMatter}
        onToggleAll={onToggleAll}
      />
      <RecentlyViewedPanel result={recentResult} />
    </div>
  );
}

function CommandPanel({ result, matter, statusResult, statusPending, onCompleteStatus }) {
  const state = renderCommandState(result, matter);
  if (state) return state;
  const item = result.item ?? matter;
  const completed = item?.status === "closed";
  return (
    <div className="record-detail-stack">
      <MatterPath matter={item} />
      <div className="record-action-strip" data-matter-status-transition-action="true">
        <div>
          <strong>{completed ? "완료됨" : "상태"}</strong>
          <span>{completed ? "Matter가 완료 상태입니다" : "다음 단계로 완료 처리"}</span>
          <ActionNotice
            pending={statusPending}
            result={statusResult}
            pendingText="완료 처리 중입니다."
            successText="상태가 완료되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || completed || statusPending} onClick={onCompleteStatus}>
          <CheckCircle2 size={15} />
          완료
        </button>
      </div>
      <div className="record-summary-grid">
        <Property label="제목" value={matterTitleLabel(item.title)} />
        <Property label="Client" value={item.legal_client_party_id || item.client_id ? "연결됨" : "미지정"} />
        <Property label="Risk" value={item.risk_level ?? "standard"} />
        <Property label="Vault" value={result.vaultLink?.vault_workspace_id || item.vault_workspace_id ? "연결됨" : "미연결"} />
      </div>
      <DataTable
        columns={["Section", "값", "표시"]}
        rows={(result.clientReport?.sections ?? []).map((section) => [
          section.title ?? section.section_id,
          section.body ?? "권한 적용",
          section.client_visible ? "Client" : "Internal"
        ])}
      />
    </div>
  );
}

function TimelinePanel({ result }) {
  const [activeFilter, setActiveFilter] = useState("all");
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading" data-matter-activity-timeline="true">
        <strong>활동을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error" data-matter-activity-timeline="true">
        <strong>활동을 불러오지 못했습니다</strong>
        잠시 후 다시 시도해주세요.
      </div>
    );
  }
  const entries = result.item?.visible_entries ?? [];
  if (entries.length === 0) {
    return (
      <div className="live-data-state live-data-empty" data-matter-activity-timeline="true">
        <strong>표시할 활동이 없습니다</strong>
      </div>
    );
  }
  const counts = entries.reduce(
    (acc, entry) => {
      const category = timelineCategory(entry);
      acc.all += 1;
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    { all: 0, matter: 0, document: 0, schedule: 0, message: 0 }
  );
  const safeFilter = TIMELINE_FILTERS.some((filter) => filter.id === activeFilter) ? activeFilter : "all";
  const visibleEntries = safeFilter === "all" ? entries : entries.filter((entry) => timelineCategory(entry) === safeFilter);
  return (
    <div className="activity-timeline-panel" data-matter-activity-timeline="true">
      <div className="matter-review-strip" data-matter-activity-read-boundary="true">
        <ShieldCheck size={15} />
        <span>권한 적용 활동 기록</span>
      </div>
      <div className="activity-filter-tabs" data-matter-activity-filters="true">
        {TIMELINE_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const count = counts[filter.id] ?? 0;
          return (
            <button
              key={filter.id}
              type="button"
              className={safeFilter === filter.id ? "active" : ""}
              disabled={filter.id !== "all" && count === 0}
              onClick={() => setActiveFilter(filter.id)}
            >
              <Icon size={14} />
              <span>{filter.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      <div className="activity-timeline-list">
        {visibleEntries.map((entry, index) => (
          <article key={entry.event_id ?? `${entry.occurred_at}-${index}`} className="activity-timeline-item">
            <span className={`activity-dot ${timelineCategory(entry)}`} />
            <div>
              <div className="activity-item-header">
                <strong>{timelineTitleLabel(entry, index)}</strong>
                <span>{timelineTimeLabel(entry.occurred_at)}</span>
              </div>
              <div className="activity-item-meta">
                <span>{timelineTypeLabel(entry)}</span>
                <span>{timelineSourceLabel(entry)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <DataTable
        columns={["일시", "유형", "제목", "범위"]}
        rows={visibleEntries.map((entry, index) => [
          timelineTimeLabel(entry.occurred_at),
          timelineTypeLabel(entry),
          timelineTitleLabel(entry, index),
          timelineSourceLabel(entry)
        ])}
      />
    </div>
  );
}

function AuditTrailPanel({ result, events = [], marker = "matter-audit-trail" }) {
  if (result === null && events.length === 0) {
    return (
      <div className="live-data-state live-data-loading" data-audit-trail={marker}>
        <strong>감사 이력을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result?.kind === "error") {
    return (
      <div className="live-data-state live-data-error" data-audit-trail={marker}>
        <strong>감사 이력을 불러오지 못했습니다</strong>
        잠시 후 다시 시도해주세요.
      </div>
    );
  }
  const seen = new Set();
  const rows = [...events, ...resultItems(result)]
    .filter(Boolean)
    .filter((event) => {
      const key = event.event_id ?? `${event.action}:${event.object_type}:${event.object_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
  if (rows.length === 0) {
    return (
      <div className="live-data-state live-data-empty" data-audit-trail={marker}>
        <strong>표시할 감사 이력이 없습니다</strong>
      </div>
    );
  }
  return (
    <div data-audit-trail={marker}>
      <DataTable
        columns={["이벤트", "대상", "상태"]}
        rows={rows.map((event) => [
          auditActionLabel(event.action),
          auditTargetLabel(event.object_type),
          event.production_ready_claim === true ? "검토 필요" : "기록됨"
        ])}
      />
    </div>
  );
}

function ActionNotice({ pending, result, pendingText, successText }) {
  if (pending) return <small>{pendingText}</small>;
  const message = actionMessage(result, successText);
  return message ? <small>{message}</small> : null;
}

function BillingActionPanel({
  matter,
  timeEntryResult,
  wipResult,
  paymentResult,
  timeEntryPending,
  wipPending,
  paymentPending,
  onCreateTimeEntry,
  onGenerateWip,
  onImportPayment
}) {
  const timeEntry = timeEntryResult?.kind === "data" ? timeEntryResult.item : null;
  const wipItems = wipResult?.kind === "data" ? wipResult.items : [];
  const payment = paymentResult?.kind === "data" ? paymentResult.item : null;
  return (
    <div className="record-action-grid" data-matter-billing-actions="true">
      <div className="record-action-strip" data-matter-time-entry-action="true">
        <div>
          <strong>{timeEntry ? `${timeEntry.duration_minutes ?? 0}분` : "시간"}</strong>
          <span>{timeEntry ? "시간 기록됨" : "Matter 작업"}</span>
          <ActionNotice pending={timeEntryPending} result={timeEntryResult} pendingText="시간 기록 중입니다." successText="시간이 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || timeEntryPending} onClick={onCreateTimeEntry}>
          시간 기록
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{wipItems.length > 0 ? moneyLabel(wipItems[0]?.amount, wipItems[0]?.currency ?? "KRW") : "WIP"}</strong>
          <span>{wipItems.length > 0 ? "WIP 생성됨" : "승인 시간 기준"}</span>
          <ActionNotice pending={wipPending} result={wipResult} pendingText="WIP 생성 중입니다." successText="WIP가 생성되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || wipPending} onClick={onGenerateWip}>
          WIP 생성
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{payment ? moneyLabel(payment.amount, payment.currency ?? "KRW") : "수납"}</strong>
          <span>{payment ? "수납 기록됨" : "청구 잔액 기준"}</span>
          <ActionNotice pending={paymentPending} result={paymentResult} pendingText="수납 기록 중입니다." successText="수납이 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || paymentPending} onClick={onImportPayment}>
          수납 기록
        </button>
      </div>
    </div>
  );
}

function BillingPanel({
  timeResult,
  invoiceResult,
  agingResult,
  financeAuditResult,
  matter,
  matterId,
  timeEntryResult,
  wipResult,
  paymentResult,
  timeEntryPending,
  wipPending,
  paymentPending,
  onCreateTimeEntry,
  onGenerateWip,
  onImportPayment
}) {
  const loading = timeResult === null || invoiceResult === null || agingResult === null;
  if (loading) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>청구 정보를 불러오는 중입니다</strong>
      </div>
    );
  }
  if ([timeResult, invoiceResult, agingResult].some((result) => result.kind === "error")) {
    return (
      <div className="live-data-state live-data-error">
        <strong>청구 정보를 불러오지 못했습니다</strong>
        잠시 후 다시 시도해주세요.
      </div>
    );
  }
  const timeRows = resultItems(timeResult).filter((item) => !matterId || item.matter_id === matterId);
  const invoiceRows = resultItems(invoiceResult).filter((item) => !matterId || item.matter_id === matterId);
  const agingRows = resultItems(agingResult).filter((item) => !matterId || item.matter_id === matterId);
  const actionPanel = (
      <BillingActionPanel
        matter={matter}
        timeEntryResult={timeEntryResult}
        wipResult={wipResult}
        paymentResult={paymentResult}
        timeEntryPending={timeEntryPending}
        wipPending={wipPending}
        paymentPending={paymentPending}
        onCreateTimeEntry={onCreateTimeEntry}
        onGenerateWip={onGenerateWip}
        onImportPayment={onImportPayment}
    />
  );
  if (timeRows.length + invoiceRows.length + agingRows.length === 0) {
    return (
      <div className="workspace-mini-grid">
        {actionPanel}
        <div className="live-data-state live-data-empty">
          <strong>표시할 청구 정보가 없습니다</strong>
        </div>
      </div>
    );
  }
  return (
    <div className="workspace-mini-grid">
      {actionPanel}
      <DataTable
        columns={["시간", "일자", "상태", "분"]}
        rows={timeRows.map((item, index) => [
          `Time ${index + 1}`,
          item.work_date ?? "미지정",
          billingStatus(item.status),
          String(item.duration_minutes ?? 0)
        ])}
      />
      <DataTable
        columns={["청구서", "상태", "금액", "통화"]}
        rows={invoiceRows.map((item, index) => [
          `Invoice ${index + 1}`,
          billingStatus(item.status),
          moneyLabel(item.amount_due, item.currency ?? "KRW"),
          item.currency ?? "KRW"
        ])}
      />
      {agingRows.length > 0 && (
        <DataTable
          columns={["AR", "상태", "잔액"]}
          rows={agingRows.map((item, index) => [
            `AR ${index + 1}`,
            billingStatus(item.status),
            moneyLabel(item.balance ?? item.balance_total, "KRW")
          ])}
        />
      )}
      <AuditTrailPanel
        result={financeAuditResult}
        events={[timeEntryResult?.auditEvent, wipResult?.auditEvent, paymentResult?.auditEvent].filter(Boolean)}
        marker="matter-finance-audit-trail"
      />
    </div>
  );
}

function AnalyticsActionPanel({
  matter,
  dashboardCount,
  invoiceRows,
  wipResult,
  paymentResult,
  refreshResult,
  exportResult,
  profitabilityActionResult,
  refreshPending,
  exportPending,
  profitabilityPending,
  onRefresh,
  onExport,
  onProfitability
}) {
  const wipItems = wipResult?.kind === "data" ? wipResult.items : [];
  const payment = paymentResult?.kind === "data" ? paymentResult.item : null;
  const canRefreshProfitability = Boolean(matter && wipItems.length > 0 && invoiceRows.length > 0 && payment);
  const canExport = Boolean(matter && dashboardCount > 0);
  const exportReady = exportResult?.kind === "data" && exportResult.item;
  return (
    <div className="record-action-grid" data-matter-analytics-actions="true">
      <div className="record-action-strip">
        <div>
          <strong>대시보드</strong>
          <span>{refreshResult?.kind === "data" ? "새로고침됨" : "게시 지표"}</span>
          <ActionNotice pending={refreshPending} result={refreshResult} pendingText="새로고침 중입니다." successText="대시보드가 갱신되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || refreshPending} onClick={onRefresh}>
          새로고침
        </button>
      </div>
      <div className="record-action-strip" data-matter-analytics-export-action="true">
        <div>
          <strong>내보내기</strong>
          <span>{exportReady ? "검토 대기" : "안전 내보내기"}</span>
          <ActionNotice pending={exportPending} result={exportResult} pendingText="내보내기 요청 중입니다." successText="내보내기 검토가 생성되었습니다." />
          {exportReady && (
            <small data-matter-analytics-export-safe-state="true">
              세부 Matter와 credential은 포함하지 않습니다.
            </small>
          )}
        </div>
        <button className="secondary-button" type="button" disabled={!canExport || exportPending} onClick={onExport}>
          내보내기
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>손익</strong>
          <span>{canRefreshProfitability ? "증거 준비됨" : "WIP/수납 필요"}</span>
          <ActionNotice pending={profitabilityPending} result={profitabilityActionResult} pendingText="손익 갱신 중입니다." successText="손익이 갱신되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!canRefreshProfitability || profitabilityPending} onClick={onProfitability}>
          손익 갱신
        </button>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  result,
  profitabilityResult,
  matter,
  invoiceRows,
  wipResult,
  paymentResult,
  refreshResult,
  exportResult,
  profitabilityActionResult,
  refreshPending,
  exportPending,
  profitabilityPending,
  onRefresh,
  onExport,
  onProfitability
}) {
  const state = renderCollectionState(result, "Analytics");
  if (state) return state;
  const matterId = matter?.matter_id;
  const dashboards = resultItems(result);
  const profitabilityRows = resultItems(profitabilityResult).filter((item) => !matterId || item.matter_id === matterId);
  return (
    <div className="workspace-mini-grid">
      <AnalyticsActionPanel
        matter={matter}
        dashboardCount={dashboards.length}
        invoiceRows={invoiceRows}
        wipResult={wipResult}
        paymentResult={paymentResult}
        refreshResult={refreshResult}
        exportResult={exportResult}
        profitabilityActionResult={profitabilityActionResult}
        refreshPending={refreshPending}
        exportPending={exportPending}
        profitabilityPending={profitabilityPending}
        onRefresh={onRefresh}
        onExport={onExport}
        onProfitability={onProfitability}
      />
      <DataTable
        columns={["대시보드", "유형", "지표", "상태"]}
        rows={dashboards.map((item) => [
          item.title ?? item.dashboard_id,
          dashboardTypeLabel(item.dashboard_type),
          dashboardMetricLabel(item),
          dashboardStatusLabel(item.status)
        ])}
      />
      {profitabilityRows.length > 0 && (
        <DataTable
          columns={["Matter", "표준", "수금", "손익"]}
          rows={profitabilityRows.map((item, index) => [
            matter?.matter_number ?? `Matter ${index + 1}`,
            moneyLabel(item.standard_value, "KRW"),
            moneyLabel(item.collected_value, "KRW"),
            moneyLabel(item.profitability_amount, "KRW")
          ])}
        />
      )}
    </div>
  );
}

export function MattersSurface({ labels, liveCtx = "allow", activeSection = "" }) {
  const [result, setResult] = useState(null);
  const [commandResult, setCommandResult] = useState(null);
  const [timelineResult, setTimelineResult] = useState(null);
  const [timeResult, setTimeResult] = useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [agingResult, setAgingResult] = useState(null);
  const [matterAuditResult, setMatterAuditResult] = useState(null);
  const [financeAuditResult, setFinanceAuditResult] = useState(null);
  const [analyticsResult, setAnalyticsResult] = useState(null);
  const [profitabilityResult, setProfitabilityResult] = useState(null);
  const [timeEntryResult, setTimeEntryResult] = useState(null);
  const [wipResult, setWipResult] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [analyticsRefreshResult, setAnalyticsRefreshResult] = useState(null);
  const [analyticsExportResult, setAnalyticsExportResult] = useState(null);
  const [profitabilityActionResult, setProfitabilityActionResult] = useState(null);
  const [statusTransitionResult, setStatusTransitionResult] = useState(null);
  const [recentResult, setRecentResult] = useState(null);
  const [listViewResult, setListViewResult] = useState(null);
  const [listViewActionResult, setListViewActionResult] = useState(null);
  const [bulkTransitionResult, setBulkTransitionResult] = useState(null);
  const [inlineEditResult, setInlineEditResult] = useState(null);
  const [ownerChangeResult, setOwnerChangeResult] = useState(null);
  const [timeEntryPending, setTimeEntryPending] = useState(false);
  const [wipPending, setWipPending] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [analyticsRefreshPending, setAnalyticsRefreshPending] = useState(false);
  const [analyticsExportPending, setAnalyticsExportPending] = useState(false);
  const [profitabilityPending, setProfitabilityPending] = useState(false);
  const [statusTransitionPending, setStatusTransitionPending] = useState(false);
  const [listViewPending, setListViewPending] = useState(false);
  const [bulkTransitionPending, setBulkTransitionPending] = useState(false);
  const [inlineEditPending, setInlineEditPending] = useState(false);
  const [ownerChangePending, setOwnerChangePending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [createdItems, setCreatedItems] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState(null);
  const [selectedMatterIds, setSelectedMatterIds] = useState([]);
  const [activeListViewId, setActiveListViewId] = useState(null);
  const currentSection = MATTER_SECTIONS.has(activeSection) ? activeSection : "matters-list";

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchMatterRecords({
      ctx: liveCtx,
      permissionRef: MATTER_PERMISSION_REF,
      auditHintRef: MATTER_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setListViewResult(null);
    fetchMatterListViews({ ctx: liveCtx }).then((next) => {
      if (!cancelled) setListViewResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const matters = useMemo(() => {
    const fetched = result?.kind === "data" ? result.items : [];
    const byId = new Map();
    for (const item of createdItems) byId.set(item.matter_id, item);
    for (const item of fetched) {
      if (!byId.has(item.matter_id)) byId.set(item.matter_id, item);
    }
    return [...byId.values()];
  }, [createdItems, result]);
  const listViews = resultItems(listViewResult);
  const activeListView = listViews.find((item) => item.list_view_id === activeListViewId) ?? listViews[0] ?? null;
  const visibleMatters = useMemo(() => applyMatterListView(matters, activeListView), [matters, activeListView]);
  const selectedMatter = visibleMatters.find((item) => item.matter_id === selectedMatterId) ?? visibleMatters[0] ?? null;
  const activeMatterId = selectedMatter?.matter_id ?? null;

  useEffect(() => {
    const visibleIds = new Set(visibleMatters.map((item) => item.matter_id));
    setSelectedMatterIds((current) => current.filter((matterId) => visibleIds.has(matterId)));
  }, [visibleMatters]);

  useEffect(() => {
    if (listViews.length === 0) {
      if (activeListViewId !== null) setActiveListViewId(null);
      return;
    }
    if (!listViews.some((item) => item.list_view_id === activeListViewId)) {
      setActiveListViewId(listViews[0].list_view_id);
    }
  }, [activeListViewId, listViews]);

  useEffect(() => {
    if (visibleMatters.length === 0) {
      if (selectedMatterId !== null) setSelectedMatterId(null);
      return;
    }
    if (!visibleMatters.some((item) => item.matter_id === selectedMatterId)) {
      setSelectedMatterId(visibleMatters[0].matter_id);
    }
  }, [visibleMatters, selectedMatterId]);

  useEffect(() => {
    let cancelled = false;
    setCommandResult(null);
    setTimelineResult(null);
    setTimeResult(null);
    setInvoiceResult(null);
    setAgingResult(null);
    setMatterAuditResult(null);
    setFinanceAuditResult(null);
    setAnalyticsResult(null);
    setProfitabilityResult(null);
    setStatusTransitionResult(null);
    setInlineEditResult(null);
    setOwnerChangeResult(null);
    if (!activeMatterId) return undefined;
    Promise.all([
      fetchMatterCommandCenter({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterTimeline({ matterId: activeMatterId, ctx: liveCtx }),
      fetchFinanceTimeEntries({ ctx: liveCtx }),
      fetchFinanceInvoices({ ctx: liveCtx }),
      fetchFinanceArAging({ ctx: liveCtx }),
      fetchMatterAudit({ ctx: liveCtx }),
      fetchFinanceAudit({ ctx: liveCtx }),
      fetchAnalyticsDashboards({ ctx: liveCtx }),
      fetchAnalyticsMatterProfitability({ ctx: liveCtx })
    ]).then(([command, timeline, time, invoices, aging, matterAudit, financeAudit, analytics, profitability]) => {
      if (cancelled) return;
      setCommandResult(command);
      setTimelineResult(timeline);
      setTimeResult(time);
      setInvoiceResult(invoices);
      setAgingResult(aging);
      setMatterAuditResult(matterAudit);
      setFinanceAuditResult(financeAudit);
      setAnalyticsResult(analytics);
      setProfitabilityResult(profitability);
    });
    return () => {
      cancelled = true;
    };
  }, [activeMatterId, liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setRecentResult(null);
    if (!activeMatterId) return undefined;
    markMatterRecentlyViewed({ matterId: activeMatterId, ctx: liveCtx })
      .then(() => fetchMatterRecentlyViewed({ ctx: liveCtx }))
      .then((next) => {
        if (!cancelled) setRecentResult(next);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMatterId, liveCtx, refreshToken]);

  const billingCount =
    resultItems(timeResult).filter((item) => item.matter_id === activeMatterId).length +
    resultItems(invoiceResult).filter((item) => item.matter_id === activeMatterId).length +
    resultItems(agingResult).filter((item) => item.matter_id === activeMatterId).length;
  const analyticsCount = resultItems(analyticsResult).length;
  const selectedInvoices = resultItems(invoiceResult).filter((item) => item.matter_id === activeMatterId);

  async function handleCreateTimeEntry() {
    if (!activeMatterId) return;
    setTimeEntryPending(true);
    const next = await createFinanceTimeEntry({ matterId: activeMatterId, ctx: liveCtx });
    setTimeEntryResult(next);
    setTimeEntryPending(false);
    if (next.kind === "data" && next.item) {
      setTimeResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.time_entry_id !== next.item.time_entry_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
    }
  }

  async function handleCompleteStatus() {
    if (!activeMatterId) return;
    setStatusTransitionPending(true);
    const next = await completeMatterStatus({ matterId: activeMatterId, ctx: liveCtx });
    setStatusTransitionResult(next);
    setStatusTransitionPending(false);
    if (next.kind === "data" && next.item) {
      setSelectedMatterId(next.item.matter_id);
      setCreatedItems((current) => [
        next.item,
        ...current.filter((item) => item.matter_id !== next.item.matter_id)
      ]);
      setResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.matter_id !== next.item.matter_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
      setCommandResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        item: next.item
      }));
    }
  }

  function applyMatterUpdate(nextMatter) {
    if (!nextMatter) return;
    setSelectedMatterId(nextMatter.matter_id);
    setCreatedItems((current) => [
      nextMatter,
      ...current.filter((item) => item.matter_id !== nextMatter.matter_id)
    ]);
    setResult((current) => {
      const currentItems = resultItems(current).filter((item) => item.matter_id !== nextMatter.matter_id);
      return {
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        items: [nextMatter, ...currentItems]
      };
    });
    setCommandResult((current) => (
      current?.kind === "data"
        ? { ...current, item: nextMatter }
        : current
    ));
  }

  function applyMatterUpdates(nextMatters = []) {
    if (nextMatters.length === 0) return;
    const byId = new Map(nextMatters.map((item) => [item.matter_id, item]));
    setCreatedItems((current) => [
      ...nextMatters,
      ...current.filter((item) => !byId.has(item.matter_id))
    ]);
    setResult((current) => {
      const currentItems = resultItems(current).filter((item) => !byId.has(item.matter_id));
      return {
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        items: [...nextMatters, ...currentItems]
      };
    });
    setCommandResult((current) => (
      current?.kind === "data" && byId.has(current.item?.matter_id)
        ? { ...current, item: byId.get(current.item.matter_id) }
        : current
    ));
  }

  function handleToggleMatter(matterId, checked) {
    setSelectedMatterIds((current) => {
      const next = new Set(current);
      if (checked) next.add(matterId);
      else next.delete(matterId);
      return [...next];
    });
  }

  function handleToggleAllVisible(checked) {
    if (!checked) {
      setSelectedMatterIds([]);
      return;
    }
    setSelectedMatterIds(visibleMatters.map((item) => item.matter_id));
  }

  async function handleBulkCompleteStatus() {
    if (selectedMatterIds.length === 0) return;
    setBulkTransitionPending(true);
    const next = await bulkCompleteMatterStatus({ matterIds: selectedMatterIds, ctx: liveCtx });
    setBulkTransitionResult(next);
    setBulkTransitionPending(false);
    if (next.kind === "data" && next.items.length > 0) {
      applyMatterUpdates(next.items);
      setSelectedMatterId(next.items[0].matter_id);
      setSelectedMatterIds([]);
    }
  }

  async function handleInlineEdit() {
    if (!activeMatterId) return;
    setInlineEditPending(true);
    const next = await updateMatterInlineFields({
      matterId: activeMatterId,
      fieldUpdates: { wip_status: "review_required" },
      ctx: liveCtx
    });
    setInlineEditResult(next);
    setInlineEditPending(false);
    if (next.kind === "data" && next.item) {
      applyMatterUpdate(next.item);
    }
  }

  async function handleOwnerChange() {
    if (!activeMatterId) return;
    setOwnerChangePending(true);
    const next = await changeMatterOwner({ matterId: activeMatterId, ctx: liveCtx });
    setOwnerChangeResult(next);
    setOwnerChangePending(false);
    if (next.kind === "data" && next.item) {
      applyMatterUpdate(next.item);
    }
  }

  async function handleSaveOpeningListView() {
    setListViewPending(true);
    const next = await saveMatterListView({
      label: "개시 Matter",
      status: "opening",
      listViewId: "matter_view_user_opening",
      ctx: liveCtx
    });
    setListViewActionResult(next);
    setListViewPending(false);
    if (next.kind === "data" && next.item) {
      setActiveListViewId(next.item.list_view_id);
      setListViewResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.list_view_id !== next.item.list_view_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
    }
  }

  async function handleGenerateWip() {
    if (!activeMatterId) return;
    setWipPending(true);
    const next = await generateFinanceWip({ matterId: activeMatterId, ctx: liveCtx });
    setWipResult(next);
    setWipPending(false);
  }

  async function handleImportPayment() {
    if (!activeMatterId) return;
    setPaymentPending(true);
    const amount = Number(selectedInvoices[0]?.amount_due ?? selectedInvoices[0]?.invoice_total ?? 100000);
    const currency = selectedInvoices[0]?.currency ?? "KRW";
    const next = await importFinancePayment({ matterId: activeMatterId, amount, currency, ctx: liveCtx });
    setPaymentResult(next);
    setPaymentPending(false);
  }

  async function handleAnalyticsRefresh() {
    if (!activeMatterId) return;
    setAnalyticsRefreshPending(true);
    const next = await refreshAnalyticsDashboards({ ctx: liveCtx });
    setAnalyticsRefreshResult(next);
    setAnalyticsRefreshPending(false);
    if (next.kind === "data" && next.items.length > 0) {
      setAnalyticsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        items: next.items
      }));
    }
  }

  async function handleAnalyticsExport() {
    if (!activeMatterId) return;
    const dashboards = resultItems(analyticsResult);
    if (dashboards.length === 0) return;
    setAnalyticsExportPending(true);
    const next = await createAnalyticsExport({
      dashboardId: dashboards[0].dashboard_id,
      ctx: liveCtx
    });
    setAnalyticsExportResult(next);
    setAnalyticsExportPending(false);
  }

  async function handleProfitabilityRefresh() {
    const wipItems = wipResult?.kind === "data" ? wipResult.items : [];
    const payment = paymentResult?.kind === "data" ? paymentResult.item : null;
    if (!activeMatterId || wipItems.length === 0 || selectedInvoices.length === 0 || !payment) return;
    setProfitabilityPending(true);
    const next = await refreshMatterProfitability({
      matterId: activeMatterId,
      wipItems,
      invoices: selectedInvoices,
      payments: [payment],
      ctx: liveCtx
    });
    setProfitabilityActionResult(next);
    setProfitabilityPending(false);
    if (next.kind === "data" && next.item) {
      setProfitabilityResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.matter_id !== next.item.matter_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
    }
  }

  return (
    <section id="matters-home" className="surface stack matters-surface" data-cmp-g4-live-matters="true">
      <PageHeader
        title={labels.mattersTitle}
        subtitle="Matter 진행, 팀, 문서, 활동, 청구, 분석 업무를 관리합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="matter-runtime-grid record-workspace" data-salesforce-matter-workspace="list-detail-right-panel">
        {currentSection === "matters-list" && (
          <Panel id="matters-list" className="record-list-panel" title="Matter 목록" meta="권한 적용">
            <MattersTable
              result={result}
              matters={visibleMatters}
              selectedMatterId={activeMatterId}
              onSelectMatter={setSelectedMatterId}
              recentResult={recentResult}
              listViewResult={listViewResult}
              activeListViewId={activeListView?.list_view_id ?? null}
              onSelectListView={setActiveListViewId}
              onSaveListView={handleSaveOpeningListView}
              listViewPending={listViewPending}
              listViewActionResult={listViewActionResult}
              selectedMatterIds={selectedMatterIds}
              onToggleMatter={handleToggleMatter}
              onToggleAll={handleToggleAllVisible}
              bulkPending={bulkTransitionPending}
              bulkResult={bulkTransitionResult}
              onBulkComplete={handleBulkCompleteStatus}
            />
          </Panel>
        )}
        {currentSection === "matter-command" && (
          <Panel id="matter-command" className="record-list-panel" title="Command Center" meta="Matter">
            <CommandPanel
              result={commandResult}
              matter={selectedMatter}
              statusResult={statusTransitionResult}
              statusPending={statusTransitionPending}
              onCompleteStatus={handleCompleteStatus}
            />
            <AuditTrailPanel
              result={matterAuditResult}
              events={[statusTransitionResult?.auditEvent].filter(Boolean)}
              marker="matter-command-audit-trail"
            />
          </Panel>
        )}
        {currentSection === "matter-vault" && <MatterVaultPanel matterId={activeMatterId} liveCtx={liveCtx} />}
        {currentSection === "matter-timeline" && (
          <Panel id="matter-timeline" className="record-list-panel" title="활동" meta="Timeline">
            <TimelinePanel result={timelineResult} />
          </Panel>
        )}
        {currentSection === "matter-opening" && (
          <MatterOpeningWizard
            liveCtx={liveCtx}
            onCreated={(item) => {
              setCreatedItems((current) => [...current, item]);
              setSelectedMatterId(item.matter_id);
            }}
          />
        )}
        {currentSection === "matter-team" && (
          <MatterTeamRoster matters={matters} liveCtx={liveCtx} onMatterUpdated={applyMatterUpdate} />
        )}
        {currentSection === "matter-billing" && (
          <Panel id="matter-billing" className="record-list-panel" title="청구" meta="Finance">
            <BillingPanel
              timeResult={timeResult}
              invoiceResult={invoiceResult}
              agingResult={agingResult}
              financeAuditResult={financeAuditResult}
              matter={selectedMatter}
              matterId={activeMatterId}
              timeEntryResult={timeEntryResult}
              wipResult={wipResult}
              paymentResult={paymentResult}
              timeEntryPending={timeEntryPending}
              wipPending={wipPending}
              paymentPending={paymentPending}
              onCreateTimeEntry={handleCreateTimeEntry}
              onGenerateWip={handleGenerateWip}
              onImportPayment={handleImportPayment}
            />
          </Panel>
        )}
        {currentSection === "matter-analytics" && (
          <Panel id="matter-analytics" className="record-list-panel" title="분석" meta="Analytics">
            <AnalyticsPanel
              result={analyticsResult}
              profitabilityResult={profitabilityResult}
              matter={selectedMatter}
              invoiceRows={selectedInvoices}
              wipResult={wipResult}
              paymentResult={paymentResult}
              refreshResult={analyticsRefreshResult}
              exportResult={analyticsExportResult}
              profitabilityActionResult={profitabilityActionResult}
              refreshPending={analyticsRefreshPending}
              exportPending={analyticsExportPending}
              profitabilityPending={profitabilityPending}
              onRefresh={handleAnalyticsRefresh}
              onExport={handleAnalyticsExport}
              onProfitability={handleProfitabilityRefresh}
            />
          </Panel>
        )}
        {["matters-list", "matter-command", "matter-vault", "matter-timeline", "matter-team", "matter-billing", "matter-analytics"].includes(currentSection) && (
          <MatterRecordPanel
            matter={selectedMatter}
            commandResult={commandResult}
            timelineResult={timelineResult}
            billingCount={billingCount}
            analyticsCount={analyticsCount}
            inlineEditResult={inlineEditResult}
            inlineEditPending={inlineEditPending}
            onInlineEdit={handleInlineEdit}
            ownerChangeResult={ownerChangeResult}
            ownerChangePending={ownerChangePending}
            onOwnerChange={handleOwnerChange}
          />
        )}
      </div>
    </section>
  );
}
