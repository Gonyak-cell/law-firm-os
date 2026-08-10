import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Link2, Plus, ShieldCheck, X } from "lucide-react";
import heroClientArchitecture from "../assets/heroes/hero-client-architecture.jpg";
import {
  createCrmAccount,
  createClientGroup,
  createCrmContact,
  createCrmMergeProposal,
  createCrmOpportunity,
  createCrmProposal,
  createIntakeConflictCheck,
  approveIntakeConflictWaiver,
  approveIntakeEngagement,
  executeCrmMergeProposal,
  createCrmConsultation,
  updateCrmConsultation,
  completeCrmConsultation,
  linkCrmConsultationOutlookEvent,
  decideCrmEngagement,
  repairCrmEngagement,
  createCrmContactActivityMemo,
  fetchAnalyticsClientDirectory,
  fetchAnalyticsClientOperationsDetail,
  fetchAnalyticsClientOperationsDashboard,
  fetchCrmAccountContacts,
  fetchCrmAccounts,
  fetchCrmClientActivities,
  fetchCrmClientSettings,
  fetchCrmContacts,
  fetchCrmInquiries,
  fetchCrmInquiryDetail,
  fetchCrmInquiryEvidenceContent,
  fetchClientFixedReport,
  fetchCrmMergeProposals,
  fetchCrmOpportunities,
  fetchCrmProposals,
  fetchIntakeAudit,
  fetchIntakeRequests,
  fetchRecordActionAudit,
  fetchRecordActionFields,
  handoffCrmOpportunityToIntake,
  issueIntakeClearanceToken,
  openMatterFromIntakeClearance,
  bulkUpdateRecordActions,
  patchCrmAccount,
  patchCrmClientSetting,
  patchCrmContact,
  patchCrmProposal,
  recordIntakeConflictDecision,
  reviewClientGroup,
  updateRecordActionField,
  exportClientFixedReportCsv
} from "../data/apiClient.js";
import { ForestHero } from "./ForestHero.jsx";
import { DataTable, Panel, Property } from "./primitives.jsx";
import { ImportDataMappingPanel } from "./ImportDataMappingPanel.jsx";
import { DataCloudEnrichmentPanel } from "./DataCloudEnrichmentPanel.jsx";
import { ClientFixedReportsContainer } from "./ClientFixedReportsContainer.jsx";
import { fetchLegalPeopleSearch } from "../people/hrxApiClient.ts";
import { DashboardListCard, DashboardRecordList, DashboardRecordRow } from "./DashboardList.jsx";
import { buildClientOperationsDashboardModel } from "./ClientOperationsDashboardModel.js";
import {
  ClientDepositRevenueChart,
  ClientInquiryStatusBreakdown
} from "./ClientOperationsDashboardCharts.jsx";
import {
  CLIENT_DETAIL_TAB_IDS,
  buildClientDirectoryModel,
  clientDirectoryRecordId
} from "./ClientDirectoryModel.js";
import {
  buildClientInquiryModel,
  clientInquirySourceLabel,
  clientInquiryStatusLabel,
  inquiryEvidenceUiState
} from "./ClientInquiryModel.js";
import {
  buildClientOpportunityModel,
  clientOpportunityStatusCode,
  clientOpportunityStatusLabel
} from "./ClientOpportunityModel.js";
import {
  buildClientConsultationModel,
  clientConsultationStatusLabel
} from "./ClientConsultationModel.js";
import {
  CLIENT_REGISTRATION_INITIAL_FORM,
  clientRegistrationFingerprint,
  hasReviewCandidates,
  normalizeClientRegistrationForm,
  registrationResultUiState,
  reviewAllowsCreate,
  reviewMatchesForm,
  safeReasonLabel,
  validateClientRegistrationForm
} from "./ClientRegistrationModel.js";
import { ClientDepositOperationsPanel } from "./ClientDepositOperationsPanel.jsx";
import { ClientReceivablesContainer } from "./ClientReceivablesContainer.jsx";

const CLIENT_SECTIONS = new Set([
  "clients-home",
  "clients-list",
  "client-new",
  "client-leads",
  "client-sales-history",
  "client-opportunities",
  "client-consultation-proposals",
  "client-activities",
  "client-billing",
  "client-reports"
]);

function clientDisplayName(item, index) {
  return businessLabel(
    item.display_name ?? item.client_display_name ?? item.canonical_display_name ?? item.client_name ?? item.name,
    `고객 ${index + 1}`
  );
}

function clientRecordId(item) {
  return clientDirectoryRecordId(item);
}

function clientMembers(item) {
  if (Number.isInteger(item?.member_count) && item.member_count >= 0) {
    return item.member_count;
  }
  const members = uniqueLookupKeys([
    ...(Array.isArray(item?.member_entity_ids) ? item.member_entity_ids : []),
    ...(Array.isArray(item?.member_party_ids) ? item.member_party_ids : [])
  ]);
  return members.length || "없음";
}

function clientStatus(value) {
  if (value === "review_required") return "검토 필요";
  if (value === "inactive") return "비활성";
  return "사용 중";
}

function clientLegalForm(value) {
  if (["organization", "corporation", "company"].includes(value)) return "법인";
  if (["individual", "person"].includes(value)) return "개인";
  return businessLabel(value, "해당 없음");
}

function pipelineStatus(value) {
  if (value === "qualified") return "상담 진행";
  if (value === "active") return "제안 준비";
  if (value === "open") return "신규 문의";
  if (value === "intake_requested") return "수임 검토";
  if (value === "review_required") return "계약 검토";
  if (value === "closed") return "종료";
  return value ?? "진행 중";
}

function activityTypeLabel(value) {
  if (value === "call") return "통화";
  if (value === "email") return "이메일";
  if (value === "meeting") return "미팅";
  if (value === "task") return "할 일";
  return "메모";
}

function proposalStatusLabel(value) {
  if (value === "sent") return "발송됨";
  if (value === "accepted") return "수락됨";
  if (value === "declined") return "거절됨";
  if (value === "expired") return "만료";
  return "초안";
}

function approvalStateLabel(value) {
  if (value === "approved") return "승인됨";
  if (value === "blocked") return "차단";
  if (value === "draft") return "초안";
  return "검토 필요";
}

function conflictSeverityLabel(value) {
  if (value === "critical") return "긴급";
  if (value === "high") return "높음";
  if (value === "medium") return "중간";
  if (value === "low") return "낮음";
  return "확인 필요";
}

function conflictSourceLabel(value) {
  if (value === "former_matter") return "과거 Matter";
  if (value === "party_master") return "당사자 정본";
  if (value === "relationship_graph") return "관계 이력";
  if (value === "manual_entry") return "수기 입력";
  return "외부 출처";
}

function conflictReviewLabel({ decision, waiver, conflict, decisionReady }) {
  if (waiver?.status === "approved") return "동의서 승인";
  if (decisionReady) return "검토 통과";
  if (decision?.decision === "clear") return "검토 통과";
  if (decision?.decision === "block") return "수임 차단";
  if (decision?.decision === "waiver_required") return "동의서 필요";
  if (conflict) return "결정 필요";
  return "검색 전";
}

function conflictHitStatusLabel(value) {
  if (value === "cleared") return "해소";
  if (value === "waived") return "동의서";
  if (value === "blocked") return "차단";
  if (value === "review_required") return "미결";
  return value ? pipelineStatus(value) : "확인 필요";
}

function conflictHitStatusTone(value) {
  if (value === "cleared" || value === "waived") return "live";
  if (value === "blocked") return "error";
  if (value === "review_required") return "review";
  return "guarded";
}

function RecordStateBadge({ tone = "guarded", children }) {
  return <span className="record-state-badge" data-state={tone}>{children}</span>;
}

function policyDisplayName(value) {
  if (value === "Client classification policy") return "Client 분류 정책";
  return businessLabel(value, "Client 정책");
}

function policyFieldLabel(value) {
  if (value === "client_classification") return "Client 분류";
  return businessLabel(value, "정책 필드");
}

function policyValueLabel(value) {
  if (value === "individual") return "개인";
  if (value === "organization") return "법인";
  if (value === "key_client") return "주요 Client";
  return businessLabel(value, "값");
}

function amountLabel(value, currency = "KRW") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "확인 필요";
  return `${currency} ${amount.toLocaleString("ko-KR")}`;
}

function businessLabel(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  if (/synthetic|cmp_g|rp0|_[a-z0-9]/i.test(text)) return fallback;
  return text;
}

function contactValueLabel(item) {
  const text = String(item?.contact_point_value ?? item?.contactPointValue ?? item?.email ?? item?.phone ?? "").trim();
  return text || "보호됨";
}

function linkedLabel(value) {
  return value ? "연결됨" : "미연결";
}

function lookupKey(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleLowerCase("ko-KR") : "";
}

function uniqueLookupKeys(values) {
  return [...new Set(values.map(lookupKey).filter(Boolean))];
}

function canonicalSyncLabel(value) {
  if (value === "synced" || value === "canonical_source") return "동기화됨";
  if (value === "facade_only") return "동기화 전";
  return "확인 필요";
}

function proposalStateLabel(value) {
  if (value === "executed") return "실행됨";
  if (value === "approved") return "승인됨";
  if (value === "owner_decision_required") return "승인 필요";
  return "검토 필요";
}

function recordFieldLabel(value) {
  const text = String(value ?? "").trim();
  if (text === "Client name") return "고객 이름";
  if (text === "Client display name") return "고객 표시 이름";
  if (text === "Account status") return "고객 상태";
  if (text === "Contact status") return "담당자 상태";
  if (text === "Owner") return "담당자";
  if (text === "Status") return "상태";
  return text || "필드";
}

function actionMessage(result, successText) {
  if (!result) return null;
  if (result.kind === "error") return "처리하지 못했습니다.";
  if (result.uiState === "blocked" || result.uiState === "denied" || result.statusOutcome === "blocked" || result.outcome === "blocked") {
    return "처리가 막혔습니다.";
  }
  return successText;
}

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function guardedResultForContext(ctx) {
  if (ctx === "denied") {
    return {
      kind: "data",
      uiState: "denied",
      outcome: "denied",
      items: [],
      safeErrorCodes: ["UI_CONTEXT_DENIED"],
      productionReadyClaim: false
    };
  }
  if (ctx === "review") {
    return {
      kind: "data",
      uiState: "review_required",
      outcome: "review_required",
      items: [],
      safeErrorCodes: ["UI_CONTEXT_REVIEW_REQUIRED"],
      productionReadyClaim: false
    };
  }
  return null;
}

function legalPeopleItems(result) {
  return result?.kind === "data" && Array.isArray(result.people) ? result.people : [];
}

function upsertResultItem(current, nextItem, key) {
  if (!nextItem?.[key]) return current;
  const currentItems = resultItems(current).filter((item) => item?.[key] !== nextItem[key]);
  return {
    ...(current?.kind === "data" ? current : {}),
    kind: "data",
    outcome: current?.outcome ?? "passed",
    items: [nextItem, ...currentItems],
    safeErrorCodes: current?.safeErrorCodes ?? [],
    productionReadyClaim: false
  };
}

function renderLiveState(result, noun) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading" role="status">
        <strong>{noun} 목록을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (
    result.kind === "error"
    || result.uiState === "error"
    || result.outcome === "error"
  ) {
    return (
      <div className="live-data-state live-data-unavailable live-data-error" role="alert">
        <strong>{noun} 목록을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied" role="status">
        <strong>접근 권한이 없습니다</strong>
        담당자에게 접근을 요청하세요.
      </div>
    );
  }
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review" role="status">
        <strong>검토가 필요합니다</strong>
        담당자 확인 후 {noun} 정보를 볼 수 있습니다.
      </div>
    );
  }
  if (result.uiState === "partial" || result.outcome === "partial") {
    if (resultItems(result).length > 0) return null;
    return (
      <div className="live-data-state live-data-partial" role="status">
        <strong>{noun} 목록 일부만 확인할 수 있습니다</strong>
        확인 가능한 {noun} 정보가 없습니다.
      </div>
    );
  }
  if (result.uiState === "empty" || resultItems(result).length === 0) {
    return (
      <div className="live-data-state live-data-empty" role="status">
        <strong>표시할 {noun} 정보가 없습니다</strong>
      </div>
    );
  }
  return null;
}

const clientDashboardMoneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function clientDashboardDateValue(item) {
  const value = item?.updated_at ?? item?.created_at ?? item?.scheduled_at ?? item?.occurred_at;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
}

function clientDashboardDateLabel(value) {
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "일정 미정";
}

function clientDashboardDayLabel(value) {
  const text = String(value ?? "");
  const dateOnly = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );
  if (dateOnly) {
    return `${Number(dateOnly[2])}월 ${Number(dateOnly[3])}일`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? "날짜 미정"
    : parsed.toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric"
    });
}

function clientDashboardMoneyLabel(value, currency = "KRW") {
  return `${clientDashboardMoneyFormatter.format(Number(value) || 0)} ${currency}`;
}

function clientDashboardCategoryLabel(value, fallback) {
  const labels = {
    client: "고객",
    prospect: "잠재 고객",
    active: "진행 중",
    new: "신규",
    contacted: "접촉 완료",
    qualified: "검토 완료",
    review_required: "검토 필요",
    pending: "대기"
  };
  return labels[String(value ?? "").trim().toLowerCase()] ?? fallback;
}

function clientDashboardDisplayLabel(value, fallback) {
  const text = String(value ?? "").trim();
  const isEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
  const isInternalId = /^(?:party|account|client|lead|opportunity|opp|contact|activity|meeting|user|tenant)(?:[_:-][a-z0-9_-]+|-[a-z0-9-]+)$/i.test(text);
  const isRawEnum = /^(?:client|prospect|active|new|contacted|qualified|review_required|pending|opening|closed)$/i.test(text);
  return text && !text.includes("_") && !isEmail && !isUuid && !isInternalId && !isRawEnum ? text : fallback;
}

function clientDashboardRecordLabel(value, recordId, fallback) {
  const text = String(value ?? "").trim();
  const id = String(recordId ?? "").trim();
  return id && text === id ? fallback : clientDashboardDisplayLabel(text, fallback);
}

function clientDashboardMetricLabel(metric) {
  if (!Number.isSafeInteger(metric.value)) return "—";
  const value = clientDashboardMoneyFormatter.format(metric.value);
  return metric.valueKind === "money" ? `${value}원` : `${value}건`;
}

function clientDashboardObjectLabel(noun) {
  const lastCharacter = String(noun).at(-1) ?? "";
  const code = lastCharacter.charCodeAt(0) - 0xac00;
  const particle = code >= 0 && code <= 11171 && code % 28 !== 0
    ? "을"
    : "를";
  return `${noun}${particle}`;
}

function clientDashboardStateCopy(state, noun) {
  const objectLabel = clientDashboardObjectLabel(noun);
  if (state === "loading") return `${objectLabel} 불러오는 중입니다.`;
  if (state === "denied") return `${objectLabel} 볼 권한이 없습니다.`;
  if (state === "review_required") return `${objectLabel} 보려면 추가 확인이 필요합니다.`;
  if (state === "partial") return `${noun} 일부를 불러오지 못했습니다.`;
  if (state === "error") return `${objectLabel} 불러오지 못했습니다.`;
  return noun === "오늘 확인할 일"
    ? "오늘 확인할 일이 없습니다."
    : `${noun} 데이터가 없습니다.`;
}

function ClientDashboardReadState({ state, noun, children }) {
  if (state === "data") return children;
  if (state === "partial") {
    return (
      <>
        <div
          className="client-dashboard-inline-state partial"
          role="status"
          data-client-dashboard-read-state="partial"
        >
          {clientDashboardStateCopy(state, noun)}
        </div>
        {children}
      </>
    );
  }
  return (
    <div
      className={`client-dashboard-read-state ${state}`}
      role="status"
      data-client-dashboard-read-state={state}
    >
      {clientDashboardStateCopy(state, noun)}
    </div>
  );
}

function ClientDashboardKpiCard({ metric, onNavigate }) {
  return (
    <div
      className="client-dashboard-kpi-slot"
      data-client-kpi={metric.id}
      data-value-kind={metric.valueKind}
    >
      <DashboardListCard
        className="client-dashboard-kpi-card"
        title={metric.label}
        section={`kpi-${metric.id}`}
        onViewAll={() => onNavigate(
          metric.route.view,
          metric.route.section,
          metric.route.routeContext
        )}
        viewAllLabel="상세 보기"
      >
        <ClientDashboardReadState
          state={metric.state}
          noun={metric.label}
        >
          <div className="client-dashboard-kpi-value">
            <strong>{clientDashboardMetricLabel(metric)}</strong>
            <small>{metric.basis}</small>
          </div>
        </ClientDashboardReadState>
      </DashboardListCard>
    </div>
  );
}

function openClientDashboardRoute(onNavigate, route) {
  if (!route) return;
  onNavigate(
    route.view,
    route.section,
    route.routeContext
  );
}

function ClientDashboardRankingCard({
  ranking,
  kind,
  onNavigate
}) {
  const revenue = kind === "revenue";
  const title = revenue ? "고객 매출 순위" : "미수금 순위";
  const noun = revenue ? "고객 매출 순위" : "미수금 순위";
  const state = ranking.state === "data"
    && ranking.items.length === 0
    ? "empty"
    : ranking.state;
  return (
    <div
      className="client-dashboard-ranking"
      data-client-ranking={kind}
    >
      <DashboardListCard
        title={title}
        section={`${kind}-ranking`}
        headerMeta={revenue
          ? ranking.period?.label ?? ""
          : ranking.unknownAmountCount > 0
            ? `금액 미입력 ${ranking.unknownAmountCount}건`
            : ""}
        onViewAll={() => onNavigate(
          "clients",
          revenue ? "client-sales-history" : "client-billing",
          { filter: "ranking" }
        )}
        viewAllLabel="전체 보기"
      >
        <ClientDashboardReadState state={state} noun={noun}>
          <div
            className="client-dashboard-ranking-total"
            data-client-ranking-total={ranking.total}
          >
            <span>{revenue ? "기간 합계" : "전체 미수금"}</span>
            <strong>
              {clientDashboardMoneyFormatter.format(ranking.total)}원
            </strong>
          </div>
          <DashboardRecordList>
            {ranking.items.map((item) => (
              <DashboardRecordRow
                key={item.clientId}
                title={`${item.rank}위 ${clientDashboardRecordLabel(
                  item.displayName,
                  item.clientId,
                  `고객 ${item.rank}`
                )}`}
                meta={revenue
                  ? item.latestDepositAt
                    ? `최근 입금 ${clientDashboardDayLabel(
                      item.latestDepositAt
                    )}`
                    : "입금일 미확인"
                  : item.earliestDueDate
                    ? `납부기한 ${clientDashboardDayLabel(
                      item.earliestDueDate
                    )}`
                    : "납부기한 없음"}
                detail={`${clientDashboardMoneyFormatter.format(
                  item.amount
                )}원`}
                onOpen={() => openClientDashboardRoute(
                  onNavigate,
                  item.route
                )}
              />
            ))}
          </DashboardRecordList>
        </ClientDashboardReadState>
      </DashboardListCard>
    </div>
  );
}

function ClientDashboardPanel({ result, onNavigate }) {
  const model = buildClientOperationsDashboardModel(result);
  if (!["data", "partial"].includes(model.state)) {
    return (
      <div
        className="client-dashboard-read-boundary"
        data-client-dashboard="true"
        data-client-dashboard-state={model.state}
      >
        <ClientDashboardReadState
          state={model.state}
          noun="고객 대시보드"
        />
      </div>
    );
  }

  return (
    <div
      className="client-dashboard-layout"
      data-client-dashboard="true"
      data-client-dashboard-state={model.state}
    >
      <div
        className="client-dashboard-kpi-grid"
        data-client-dashboard-kpis="true"
      >
        {model.kpis.map((metric) => (
          <ClientDashboardKpiCard
            key={metric.id}
            metric={metric}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div
        className="client-dashboard-attention"
        data-client-attention="true"
      >
        <DashboardListCard
          title="오늘 확인할 일"
          section="attention-items"
        >
          <ClientDashboardReadState
            state={model.attention.state}
            noun="오늘 확인할 일"
          >
            <DashboardRecordList>
              {model.attention.items.map((item) => (
                <DashboardRecordRow
                  key={item.id}
                  title={item.title}
                  meta={item.label}
                  detail={clientDashboardDateLabel(item.dueAt)}
                  status={item.amount !== null
                    ? `${clientDashboardMoneyFormatter.format(item.amount)}원`
                    : item.assigned
                      ? "담당 지정"
                      : null}
                  onOpen={item.route
                    ? () => onNavigate(
                      item.route.view,
                      item.route.section,
                      item.route.routeContext
                    )
                    : null}
                />
              ))}
            </DashboardRecordList>
          </ClientDashboardReadState>
        </DashboardListCard>
      </div>
      <div
        className="client-dashboard-insights"
        data-client-dashboard-insights="true"
      >
        <div
          className="client-dashboard-revenue"
          data-client-dashboard-revenue="true"
        >
          <DashboardListCard
            title="최근 12개월 입금 매출"
            section="monthly-deposit-revenue"
            headerMeta={Number.isSafeInteger(
              model.monthlyRevenue.total
            )
              ? `합계 ${clientDashboardMoneyFormatter.format(
                model.monthlyRevenue.total
              )}원`
              : ""}
            onViewAll={() => onNavigate(
              "clients",
              "client-sales-history",
              { filter: "last_12_months" }
            )}
            viewAllLabel="전체 보기"
          >
            <ClientDashboardReadState
              state={model.monthlyRevenue.state}
              noun="월별 입금 매출"
            >
              <ClientDepositRevenueChart
                points={model.monthlyRevenue.points}
                onNavigate={(route) => openClientDashboardRoute(
                  onNavigate,
                  route
                )}
              />
            </ClientDashboardReadState>
          </DashboardListCard>
        </div>
        <div
          className="client-dashboard-inquiries"
          data-client-inquiries="true"
        >
          <DashboardListCard
            title="문의 진행 현황"
            section="inquiry-status"
            headerMeta={Number.isSafeInteger(
              model.inquiryStatus.total
            )
              ? `전체 ${model.inquiryStatus.total}건`
              : ""}
          >
            <ClientDashboardReadState
              state={model.inquiryStatus.state}
              noun="문의 진행 현황"
            >
              <ClientInquiryStatusBreakdown
                items={model.inquiryStatus.items}
                total={model.inquiryStatus.total}
                onNavigate={(route) => openClientDashboardRoute(
                  onNavigate,
                  route
                )}
              />
            </ClientDashboardReadState>
          </DashboardListCard>
        </div>
      </div>
      <div
        className="client-dashboard-rankings"
        data-client-dashboard-rankings="true"
      >
        <ClientDashboardRankingCard
          ranking={model.revenueRanking}
          kind="revenue"
          onNavigate={onNavigate}
        />
        <ClientDashboardRankingCard
          ranking={model.receivablesRanking}
          kind="receivables"
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function ClientRegistrationOutcome({ result, phase }) {
  if (!result || result.kind === "data" && result.outcome === "passed") return null;
  const uiState = registrationResultUiState(result);
  if (uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied" role="status" data-client-registration-state="denied">
        <strong>{phase === "create" ? "고객 등록 권한이 없습니다." : "중복 확인 권한이 없습니다."}</strong>
        담당자에게 고객 등록 권한을 요청해 주세요.
      </div>
    );
  }
  if (uiState === "review_required") {
    return (
      <div className="live-data-state live-data-review" role="status" data-client-registration-state="review_required">
        <strong>담당자 검토가 필요합니다.</strong>
        중복 확인 결과를 바로 등록할 수 없습니다.
      </div>
    );
  }
  if (uiState === "error") {
    return (
      <div className="live-data-state live-data-error" role="status" data-client-registration-state="error">
        <strong>{phase === "create" ? "고객을 등록하지 못했습니다." : "중복 여부를 확인하지 못했습니다."}</strong>
        잠시 후 다시 시도해 주세요.
      </div>
    );
  }
  return null;
}

function ClientNewCustomersPanel({ ctx = "allow", onCreated = () => {} }) {
  const [form, setForm] = useState(() => ({ ...CLIENT_REGISTRATION_INITIAL_FORM }));
  const [review, setReview] = useState(null);
  const [createIdempotencyKey, setCreateIdempotencyKey] = useState("");
  const [createResult, setCreateResult] = useState(null);
  const [reviewPending, setReviewPending] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [distinctConfirmed, setDistinctConfirmed] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const normalizedForm = normalizeClientRegistrationForm(form);
  const reviewCurrent = reviewMatchesForm(review, normalizedForm);
  const candidates = reviewCurrent ? (review?.item?.candidates ?? []) : [];
  const createAllowed = reviewAllowsCreate(review, normalizedForm, distinctConfirmed) === true;
  const reviewUiState = registrationResultUiState(review);

  function nextCreateIdempotencyKey() {
    return `ui:client-group:create:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  }

  function updateField(field, value) {
    const nextForm = normalizeClientRegistrationForm({ ...form, [field]: value });
    setForm(nextForm);
    setReview(null);
    setCreateIdempotencyKey("");
    setCreateResult(null);
    setDistinctConfirmed(false);
    setValidationErrors({});
  }

  function handleTypeChange(clientType) {
    updateField("client_type", clientType);
  }

  async function handleReview(event) {
    event.preventDefault();
    const validation = validateClientRegistrationForm(normalizedForm);
    setValidationErrors(validation.errors);
    if (!validation.valid) return;
    const fingerprint = clientRegistrationFingerprint(validation.form);
    const idempotencyKey = `ui:client-group:review:${Date.now()}`;
    setReviewPending(true);
    setReview(null);
    setCreateIdempotencyKey("");
    setCreateResult(null);
    setDistinctConfirmed(false);
    const next = await reviewClientGroup({
      client: validation.form,
      idempotencyKey,
      ctx
    });
    setReview({ ...next, fingerprint });
    setCreateIdempotencyKey(next.kind === "data" && next.item?.review_digest ? nextCreateIdempotencyKey() : "");
    setReviewPending(false);
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!createAllowed || createPending) return;
    setCreatePending(true);
    setCreateResult(null);
    const idempotencyKey = createIdempotencyKey || nextCreateIdempotencyKey();
    if (!createIdempotencyKey) setCreateIdempotencyKey(idempotencyKey);
    const next = await createClientGroup({
      client: normalizedForm,
      reviewDigest: review.item.review_digest,
      confirmDistinctClient: distinctConfirmed,
      idempotencyKey,
      ctx
    });
    setCreateResult(next);
    setCreatePending(false);
    if (next.kind === "data" && next.item?.client_group_id) {
      window.setTimeout(() => onCreated(next.item), 260);
    }
  }

  return (
    <div className="client-registration-surface" data-client-registration="true">
      <div className="client-registration-intro">
        <div>
          <span className="client-registration-eyebrow">고객 기본정보</span>
          <h2>신규 고객 등록</h2>
          <p>고객 정보를 입력한 뒤 중복 여부를 확인하고 등록합니다.</p>
        </div>
        <span className="client-registration-step" aria-label="등록 단계">1 / 2</span>
      </div>

      <form className="client-registration-form" onSubmit={handleReview} noValidate>
        <fieldset className="client-registration-type-group">
          <legend>고객 유형</legend>
          <div className="client-registration-type-toggle" role="group" aria-label="고객 유형 선택">
            <button
              type="button"
              className={normalizedForm.client_type === "person" ? "secondary-button active" : "secondary-button"}
              aria-pressed={normalizedForm.client_type === "person"}
              onClick={() => handleTypeChange("person")}
            >
              개인
            </button>
            <button
              type="button"
              className={normalizedForm.client_type === "organization" ? "secondary-button active" : "secondary-button"}
              aria-pressed={normalizedForm.client_type === "organization"}
              onClick={() => handleTypeChange("organization")}
            >
              법인·단체
            </button>
          </div>
        </fieldset>

        <label className="client-registration-field" htmlFor="client-registration-display-name">
          <span>고객명 <em>필수</em></span>
          <input
            id="client-registration-display-name"
            name="display_name"
            value={normalizedForm.display_name}
            onChange={(event) => updateField("display_name", event.target.value)}
            aria-invalid={Boolean(validationErrors.display_name)}
            aria-describedby={validationErrors.display_name ? "client-registration-display-name-error" : undefined}
            autoComplete="organization"
            required
          />
          {validationErrors.display_name && (
            <small id="client-registration-display-name-error" className="client-registration-field-error">
              {validationErrors.display_name}
            </small>
          )}
        </label>

        {normalizedForm.client_type === "organization" ? (
          <div className="client-registration-field-grid">
            <label className="client-registration-field" htmlFor="client-registration-legal-form">
              <span>법인·단체 형태 <em>필수</em></span>
              <select
                id="client-registration-legal-form"
                name="legal_form"
                value={normalizedForm.legal_form}
                onChange={(event) => updateField("legal_form", event.target.value)}
                aria-invalid={Boolean(validationErrors.legal_form)}
                required
              >
                <option value="">선택해 주세요</option>
                <option value="주식회사">주식회사</option>
                <option value="유한회사">유한회사</option>
                <option value="사단법인">사단법인</option>
                <option value="재단법인">재단법인</option>
                <option value="비영리단체">비영리단체</option>
                <option value="기타">기타</option>
              </select>
              {validationErrors.legal_form && (
                <small className="client-registration-field-error">{validationErrors.legal_form}</small>
              )}
            </label>
            <label className="client-registration-field" htmlFor="client-registration-number">
              <span>등록번호 <small>선택</small></span>
              <input
                id="client-registration-number"
                name="registration_number"
                value={normalizedForm.registration_number}
                onChange={(event) => updateField("registration_number", event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
        ) : (
          <div className="client-registration-field-grid">
            <label className="client-registration-field" htmlFor="client-registration-email">
              <span>이메일 <small>선택</small></span>
              <input
                id="client-registration-email"
                name="email"
                type="email"
                value={normalizedForm.email}
                onChange={(event) => updateField("email", event.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="client-registration-field" htmlFor="client-registration-phone">
              <span>전화번호 <small>선택</small></span>
              <input
                id="client-registration-phone"
                name="phone"
                value={normalizedForm.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                autoComplete="tel"
              />
            </label>
          </div>
        )}

        <label className="client-registration-field" htmlFor="client-registration-depositor-alias">
          <span>은행 입금자명 <small>선택</small></span>
          <input
            id="client-registration-depositor-alias"
            name="depositor_alias"
            value={normalizedForm.depositor_alias}
            onChange={(event) => updateField("depositor_alias", event.target.value)}
            aria-describedby="client-registration-depositor-hint"
          />
          <small id="client-registration-depositor-hint" className="client-registration-help">
            통장·거래명세서에 표시되는 이름과 정확히 일치해야 합니다.
          </small>
        </label>

        <div className="client-registration-actions">
          <div>
            {reviewPending && (
              <span className="client-registration-progress" role="status" data-client-registration-state="review_pending">
                중복 여부를 확인하는 중입니다.
              </span>
            )}
            {!reviewPending && reviewUiState === "passed" && (
              <span className="client-registration-progress" role="status" data-client-registration-state="reviewed">
                중복 확인이 완료되었습니다.
              </span>
            )}
          </div>
          <button className="primary-button" type="submit" disabled={reviewPending || createPending}>
            중복 확인
          </button>
        </div>
      </form>

      <ClientRegistrationOutcome result={review} phase="review" />

      {reviewCurrent && review?.item && (
        <div className="client-registration-review" data-client-registration-review="true">
          <div className="client-registration-review-heading">
            <div>
              <strong>중복 확인 결과</strong>
              <span>현재 입력 기준으로 확인한 결과입니다. 입력을 바꾸면 다시 확인해야 합니다.</span>
            </div>
            <span className="client-registration-step">2 / 2</span>
          </div>

          {hasReviewCandidates(review) && (
            <div className="client-registration-candidates" data-client-registration-candidates="true">
              <strong>비슷한 고객이 있습니다.</strong>
              <ul>
                {candidates.map((candidate) => (
                  <li key={candidate.client_group_id}>
                    <div>
                      <strong>{candidate.display_name}</strong>
                      <span>{candidate.client_type === "organization" ? "법인·단체" : "개인"}</span>
                    </div>
                    {candidate.reasons.length > 0 && (
                      <ul>
                        {candidate.reasons.map((reason) => <li key={reason}>{safeReasonLabel(reason)}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.item.has_restricted_candidates && (
            <div className="client-registration-restricted" role="status" data-client-registration-restricted="true">
              <ShieldCheck size={15} />
              <span>접근이 제한된 후보가 포함되어 있어 새 고객으로 등록할 수 없습니다. 담당자 검토가 필요합니다.</span>
            </div>
          )}

          {!review.item.can_create && !review.item.has_restricted_candidates && (
            <div className="client-registration-restricted" role="status" data-client-registration-blocked="true">
              <ShieldCheck size={15} />
              <span>현재 확인 결과로는 등록할 수 없습니다. 중복 후보를 먼저 검토해 주세요.</span>
            </div>
          )}

          {hasReviewCandidates(review) && review.item.can_create && (
            <label className="client-registration-confirmation">
              <input
                type="checkbox"
                checked={distinctConfirmed}
                onChange={(event) => setDistinctConfirmed(event.target.checked)}
              />
              <span>별도 고객이 맞습니다</span>
            </label>
          )}

          <div className="client-registration-create-actions">
            <div>
              {createPending && <span className="client-registration-progress" role="status" data-client-registration-state="create_pending">고객을 등록하는 중입니다.</span>}
              {!createPending && createResult?.kind === "data" && createResult.outcome === "passed" && (
                <span className="client-registration-progress" role="status" data-client-registration-state="success">고객이 등록되었습니다.</span>
              )}
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={!createAllowed || createPending}
              onClick={handleCreate}
              data-client-registration-create="true"
            >
              고객 등록
            </button>
          </div>
          <ClientRegistrationOutcome result={createResult} phase="create" />
        </div>
      )}
    </div>
  );
}

function ClientRelatedFinanceGuard({
  client,
  kind,
  loading,
  onReturn
}) {
  if (loading) {
    return (
      <div
        className="live-data-state client-related-finance-guard"
        role="status"
        data-client-related-finance-guard={kind}
      >
        <strong>고객 정보를 불러오는 중입니다</strong>
      </div>
    );
  }
  if (!client) {
    return (
      <div
        className="live-data-state client-related-finance-guard"
        role="status"
        data-client-related-finance-guard={kind}
      >
        <strong>선택한 고객 정보를 열 수 없습니다.</strong>
        <span>고객 목록에서 다시 선택해 주세요.</span>
        <button
          className="secondary-button"
          type="button"
          onClick={onReturn}
        >
          고객 목록으로 이동
        </button>
      </div>
    );
  }
  const basis = kind === "deposit_revenue"
    ? "입금 매출 기준과 기존 청구 기준"
    : "수임료·미수금 기준과 기존 송장 잔액 기준";
  return (
    <div
      className="live-data-state client-related-finance-guard"
      role="status"
      data-client-related-finance-guard={kind}
    >
      <strong>{clientDisplayName(client, 0)} 금액 상세</strong>
      <span>
        선택한 고객의 {basis}이 달라 정확하지 않은 금액은 보여 주지 않습니다.
      </span>
      <button
        className="secondary-button"
        type="button"
        onClick={onReturn}
      >
        고객 정보로 돌아가기
      </button>
    </div>
  );
}

function clientCommandResultState(result) {
  if (!result) return null;
  if (result.kind === "denied" || result.uiState === "denied" || result.outcome === "denied") return "denied";
  if (result.kind === "review_required" || result.uiState === "review_required" || result.outcome === "review_required") return "review_required";
  if (result.kind === "conflict" || result.uiState === "conflict" || result.status === 409) return "conflict";
  if (result.uiState === "partial" || result.outcome === "partial") return "partial";
  if (result.kind === "error" || result.uiState === "error" || result.outcome === "error") return "error";
  if (result.kind === "data") return "data";
  return "error";
}

function clientCommandResultCopy(result, noun = "처리") {
  const state = clientCommandResultState(result);
  if (state === "denied") return `${noun} 권한이 없습니다.`;
  if (state === "review_required") return `${noun} 전에 담당자 확인이 필요합니다.`;
  if (state === "conflict") return `최신 정보와 달라 ${noun}하지 못했습니다. 화면을 새로 확인해 주세요.`;
  if (state === "partial") return `${noun} 결과 일부만 확인되었습니다.`;
  if (state === "error") return `${noun} 결과를 확인하지 못했습니다. 같은 작업을 다시 시도해 주세요.`;
  if (state === "data") {
    if (result.idempotentReplay) return `${noun} 요청을 다시 확인했습니다.`;
    return `${noun}이 기록되었습니다.`;
  }
  return null;
}

function clientCommandStateNotice(result, noun) {
  const state = clientCommandResultState(result);
  if (!state || state === "data") return null;
  return <div className={`client-command-state ${state}`} role="status" data-client-command-state={state}>{clientCommandResultCopy(result, noun)}</div>;
}

function clientWorkflowStepLabel(value) {
  const labels = {
    decision_recorded: "수임 결정 기록",
    client_group_resolved: "고객 그룹 확인",
    fee_commitment_created: "수임료 반영",
    fee_commitment_cancelled: "수임료 반영 취소"
  };
  return labels[value] ?? "추가 확인 필요";
}

function inquiryVersionDescriptor(result) {
  const item = result?.kind === "data" && result.item && typeof result.item === "object" ? result.item : null;
  if (!item) return null;
  const inquiryId = String(item.lead_id ?? item.inquiryId ?? "").trim() || null;
  const inquiryVersion = Number.isSafeInteger(item.version) && item.version >= 1 ? item.version : null;
  return inquiryId && inquiryVersion ? { inquiryId, inquiryVersion } : null;
}

function inquiryCommandDescriptor(result) {
  const item = result?.kind === "data" && result.item && typeof result.item === "object" ? result.item : null;
  const base = inquiryVersionDescriptor(result);
  if (!item || !base) return null;
  const opportunity = item.opportunity && typeof item.opportunity === "object" ? item.opportunity : null;
  const inquiryVersion = base.inquiryVersion;
  const opportunityId = String(item.opportunity_id ?? opportunity?.opportunity_id ?? "").trim() || null;
  const engagementVersion = Number.isSafeInteger(
    item.engagement_decision_version ?? opportunity?.engagement_decision_version
  )
    ? Number(item.engagement_decision_version ?? opportunity.engagement_decision_version)
    : null;
  const workflowId = String(opportunity?.engagement_workflow_id ?? item.engagement_workflow_id ?? "").trim() || null;
  const workflowStatus = opportunity?.engagement_workflow_status ?? item.engagement_workflow_status ?? null;
  if (!opportunityId || !engagementVersion) {
    return { ...base, opportunityId: null, engagementVersion: null, workflowId: null, workflowStatus: null, engagementDecision: "pending" };
  }
  return {
    inquiryId: base.inquiryId,
    inquiryVersion,
    opportunityId,
    engagementVersion,
    workflowId,
    workflowStatus,
    engagementDecision: opportunity?.engagement_decision ?? item.engagement_decision ?? "pending"
  };
}

function consultationLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function consultationDateTimeToIso(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(normalized)) return null;
  const date = new Date(`${normalized}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function clientCommandIdempotencyKey(ref, scope, fingerprint) {
  const normalized = `${scope}:${fingerprint}`;
  const existing = ref.current.get(normalized);
  if (existing) return existing;
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Secure random UUID is unavailable");
  }
  const random = globalThis.crypto.randomUUID().replace(/-/gu, "");
  const next = `ui_${scope}_${random}`.slice(0, 190);
  ref.current.set(normalized, next);
  return next;
}

function clientCommandTimestamp(ref, idempotencyKey) {
  const existing = ref.current.get(idempotencyKey);
  if (existing) return existing;
  const timestamp = new Date().toISOString();
  ref.current.set(idempotencyKey, timestamp);
  return timestamp;
}

function consultationResultStateCopy(state) {
  if (state === "loading") return "상담 목록을 불러오는 중입니다.";
  if (state === "denied") return "상담 목록을 볼 권한이 없습니다.";
  if (state === "review_required") return "상담 목록을 보려면 담당자 확인이 필요합니다.";
  if (state === "partial") return "상담 일부만 확인할 수 있습니다. 확인 가능한 기록만 표시합니다.";
  if (state === "error") return "상담 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
  return "등록된 상담이 없습니다.";
}

function ClientConsultationTabs({ model, onTabChange }) {
  return (
    <div className="client-consultation-tabs" role="tablist" aria-label="상담 상태">
      {model.statusTabs.map((tab) => (
        <button
          key={tab.code}
          type="button"
          role="tab"
          aria-selected={model.activeStatusTab === tab.code}
          className={model.activeStatusTab === tab.code ? "active" : ""}
          onClick={() => onTabChange(tab.code)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function InquiryContextSelect({ inquiries, selectedInquiryId, onChange, disabled = false, label = "문의 선택" }) {
  return (
    <label className="client-command-field">
      <span>{label}</span>
      <select value={selectedInquiryId ?? ""} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">문의에서 선택하세요</option>
        {inquiries.map((inquiry) => (
          <option key={inquiry.inquiryId} value={inquiry.inquiryId}>{inquiry.displayName}</option>
        ))}
      </select>
    </label>
  );
}

function ConsultationScheduleForm({ inquiries, selectedInquiryId, pending, result, onInquiryChange, onSubmit }) {
  const [form, setForm] = useState({ inquiryId: selectedInquiryId ?? "", subject: "", start: "", end: "", confidential: false });
  useEffect(() => {
    setForm((current) => ({ ...current, inquiryId: selectedInquiryId ?? "" }));
  }, [selectedInquiryId]);
  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function submit(event) {
    event.preventDefault();
    const start = consultationDateTimeToIso(form.start);
    const end = consultationDateTimeToIso(form.end);
    if (!form.inquiryId || !start || !end || new Date(end).getTime() <= new Date(start).getTime()) return;
    const subject = form.confidential ? "보호된 상담" : form.subject.trim();
    if (!subject) return;
    onSubmit({ ...form, subject, scheduledStart: start, scheduledEnd: end });
  }
  const start = consultationDateTimeToIso(form.start);
  const end = consultationDateTimeToIso(form.end);
  const valid = Boolean(form.inquiryId && start && end && new Date(end).getTime() > new Date(start).getTime() && (form.confidential || form.subject.trim()));
  return (
    <form className="client-command-form" data-client-consultation-schedule-form="true" onSubmit={submit}>
      <div className="client-command-form-heading">
        <div>
          <strong>상담 일정 등록</strong>
          <span>권한이 확인된 문의를 선택한 뒤 서울 시간으로 일정을 입력합니다.</span>
        </div>
      </div>
      <div className="client-command-form-grid">
        <InquiryContextSelect
          inquiries={inquiries}
          selectedInquiryId={form.inquiryId}
          disabled={pending}
          onChange={(value) => { update("inquiryId", value); onInquiryChange(value); }}
        />
        <label className="client-command-field">
          <span>상담 제목</span>
          <input value={form.subject} disabled={pending || form.confidential} onChange={(event) => update("subject", event.target.value)} placeholder="예: 계약 검토 초기 상담" />
        </label>
        <label className="client-command-field">
          <span>시작</span>
          <input type="datetime-local" value={form.start} disabled={pending} onChange={(event) => update("start", event.target.value)} />
        </label>
        <label className="client-command-field">
          <span>종료</span>
          <input type="datetime-local" value={form.end} disabled={pending} onChange={(event) => update("end", event.target.value)} />
        </label>
        <label className="client-command-checkbox">
          <input type="checkbox" checked={form.confidential} disabled={pending} onChange={(event) => update("confidential", event.target.checked)} />
          <span>상담 상세 보호</span>
        </label>
      </div>
      <div className="client-command-form-footer">
        <span>시간대: Asia/Seoul</span>
        <button className="primary-button" type="submit" disabled={!valid || pending}>{pending ? "등록 중" : "상담 일정 등록"}</button>
      </div>
      {clientCommandStateNotice(result, "상담 일정 등록")}
      {result && clientCommandResultState(result) === "data" ? <div className="client-command-state success" role="status">상담 일정이 기록되었습니다.</div> : null}
    </form>
  );
}

function ConsultationCompletionForm({ consultation, pending, result, onSubmit }) {
  const [form, setForm] = useState({ outcome: "", nextAction: "" });
  useEffect(() => {
    setForm({ outcome: "", nextAction: "" });
  }, [consultation?.consultationId, consultation?.version]);
  const valid = Boolean(form.outcome.trim() && form.nextAction.trim());
  return (
    <form className="client-command-form compact" data-client-consultation-complete-form="true" onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit(form); }}>
      <strong>상담 완료 기록</strong>
      <label className="client-command-field"><span>상담 결과</span><textarea value={form.outcome} disabled={pending} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value }))} rows={3} /></label>
      <label className="client-command-field"><span>다음 행동</span><input value={form.nextAction} disabled={pending} onChange={(event) => setForm((current) => ({ ...current, nextAction: event.target.value }))} /></label>
      <button className="secondary-button" type="submit" disabled={!valid || pending}>{pending ? "완료 기록 중" : "상담 완료"}</button>
      {clientCommandStateNotice(result, "상담 완료 기록")}
      {result && clientCommandResultState(result) === "data" ? <div className="client-command-state success" role="status">상담 결과와 다음 행동을 기록했습니다.</div> : null}
    </form>
  );
}

function ConsultationRescheduleForm({ consultation, pending, result, onSubmit }) {
  const [form, setForm] = useState({ start: "", end: "" });
  useEffect(() => {
    setForm({ start: consultationLocalDateTime(consultation?.scheduledStart), end: consultationLocalDateTime(consultation?.scheduledEnd) });
  }, [consultation?.consultationId, consultation?.version, consultation?.scheduledStart, consultation?.scheduledEnd]);
  const start = consultationDateTimeToIso(form.start);
  const end = consultationDateTimeToIso(form.end);
  const valid = Boolean(start && end && new Date(end).getTime() > new Date(start).getTime());
  return (
    <form className="client-command-form compact" data-client-consultation-reschedule-form="true" onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit({ ...form, scheduledStart: start, scheduledEnd: end }); }}>
      <strong>상담 일정 변경</strong>
      <div className="client-command-form-grid">
        <label className="client-command-field"><span>새 시작</span><input type="datetime-local" value={form.start} disabled={pending} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} /></label>
        <label className="client-command-field"><span>새 종료</span><input type="datetime-local" value={form.end} disabled={pending} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} /></label>
      </div>
      <button className="secondary-button" type="submit" disabled={!valid || pending}>{pending ? "변경 중" : "일정 변경"}</button>
      {clientCommandStateNotice(result, "상담 일정 변경")}
      {result && clientCommandResultState(result) === "data" ? <div className="client-command-state success" role="status">상담 일정을 변경했습니다.</div> : null}
    </form>
  );
}

function ConsultationCompletedSummary({ consultation }) {
  const protectedDetails = consultation?.confidential === true;
  const outcome = protectedDetails ? "상세 내용 보호됨" : consultation?.outcome ?? "결과 미기록";
  const nextAction = protectedDetails ? "상세 내용 보호됨" : consultation?.nextAction ?? "다음 행동 미기록";
  return (
    <div className="client-consultation-completed-summary" data-client-consultation-completed-summary="true">
      <div>
        <strong>상담 결과</strong>
        <span>{outcome}</span>
      </div>
      <div>
        <strong>다음 행동</strong>
        <span>{nextAction}</span>
      </div>
      <p>완료된 상담은 일정과 Outlook 연결을 변경할 수 없습니다.</p>
    </div>
  );
}

function EngagementDecisionForm({ inquiry, descriptor, pending, result, repairPending, repairResult, onSubmit, onRepair }) {
  const [form, setForm] = useState({ decision: "accepted", amount: "", amountUnknownConfirmed: false, closeReason: "" });
  useEffect(() => {
    setForm({ decision: "accepted", amount: "", amountUnknownConfirmed: false, closeReason: "" });
  }, [inquiry?.inquiryId, descriptor?.inquiryVersion, descriptor?.engagementVersion]);
  const amount = form.amount.trim() ? Number(form.amount.replace(/,/gu, "")) : null;
  const acceptedValid = form.decision !== "accepted" || (form.amountUnknownConfirmed || Number.isSafeInteger(amount) && amount >= 0);
  const valid = Boolean(form.decision === "declined" ? form.closeReason.trim() : acceptedValid);
  const processing = result?.processing;
  const repairRequired = processing?.workflowStatus === "repair_required" || result?.repairCommand;
  return (
    <div className="client-command-form" data-client-engagement-form="true">
      <div className="client-command-form-heading">
        <div>
          <strong>수임 결정</strong>
          <span>수임 확정과 Matter 개설은 별도 단계입니다.</span>
        </div>
      </div>
      <div className="client-command-form-grid">
        <label className="client-command-field"><span>결정</span><select value={form.decision} disabled={pending} onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value }))}><option value="accepted">수임 확정</option><option value="declined">수임하지 않음</option></select></label>
        {form.decision === "accepted" ? (
          <>
            <label className="client-command-field"><span>수임료 금액</span><input inputMode="numeric" value={form.amount} disabled={pending || form.amountUnknownConfirmed} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="금액을 입력하세요" /></label>
            <label className="client-command-checkbox"><input type="checkbox" checked={form.amountUnknownConfirmed} disabled={pending || Boolean(form.amount.trim())} onChange={(event) => setForm((current) => ({ ...current, amountUnknownConfirmed: event.target.checked }))} /><span>금액 미정으로 확정</span></label>
          </>
        ) : (
          <label className="client-command-field"><span>거절 사유</span><textarea value={form.closeReason} disabled={pending} onChange={(event) => setForm((current) => ({ ...current, closeReason: event.target.value }))} rows={3} /></label>
        )}
      </div>
      <button className="secondary-button" type="button" disabled={!descriptor?.opportunityId || !descriptor?.engagementVersion || !valid || pending} onClick={() => onSubmit({ ...form, agreedAmount: form.decision === "accepted" && !form.amountUnknownConfirmed ? amount : undefined })}>{pending ? "결정 기록 중" : "결정 기록"}</button>
      {clientCommandStateNotice(result, "수임 결정")}
      {result && clientCommandResultState(result) === "data" && !repairRequired ? <div className="client-command-state success" role="status">수임 결정이 기록되었습니다. Matter 개설은 별도 단계입니다.</div> : null}
      {repairRequired ? (
        <div className="client-command-repair" data-client-engagement-repair="true">
          <strong>추가 반영이 필요합니다</strong>
          <span>확인이 필요한 단계: {clientWorkflowStepLabel(processing?.failedStep)}</span>
          <span>담당자 확인용 처리 기록이 남아 있습니다.</span>
          <button className="secondary-button" type="button" disabled={repairPending} onClick={() => onRepair({ expectedWorkflowVersion: result?.repairCommand?.expectedWorkflowVersion ?? processing?.workflowVersion })}>{repairPending ? "재시도 중" : "안전하게 재시도"}</button>
          {clientCommandStateNotice(repairResult, "수임 반영 재시도")}
        </div>
      ) : null}
    </div>
  );
}

function ClientConsultationPanel({
  result,
  model,
  inquiries,
  inquiriesState = "loading",
  selectedInquiryId,
  inquiryDetailResult,
  schedulePending,
  scheduleResult,
  reschedulePending,
  rescheduleResult,
  outlookPending,
  outlookResult,
  completePending,
  completeResult,
  decisionPending,
  decisionResult,
  repairPending,
  repairResult,
  onInquiryChange,
  onTabChange,
  onSearchChange,
  onSelectConsultation,
  onCloseConsultation,
  onSchedule,
  onReschedule,
  onOutlook,
  onComplete,
  onDecision,
  onRepair
}) {
  if (["loading", "denied", "review_required", "error"].includes(model.state)) {
    return <div className={`client-consultation-state live-data-state live-data-${model.state === "denied" ? "denied" : model.state === "review_required" ? "review" : model.state === "error" ? "error" : "loading"}`} role="status" data-client-consultation-state={model.state}><strong>{consultationResultStateCopy(model.state)}</strong></div>;
  }
  const selected = model.selectedConsultation;
  const descriptor = inquiryCommandDescriptor(inquiryDetailResult);
  const selectedInquiry = inquiries.find((inquiry) => inquiry.inquiryId === selectedInquiryId) ?? null;
  const selectedOutlookState = selected?.outlookState ?? "not_created";
  const hasSearchOrTabNoMatch = model.consultations.length === 0 && Array.isArray(result?.consultations) && result.consultations.length > 0;
  return (
    <div className="client-consultation-surface" data-client-consultation-surface="true">
      <div className="client-consultation-toolbar">
        <div>
          <strong>상담 일정을 정하고 결과까지 이어서 기록합니다.</strong>
          <span>목록에서 상담을 먼저 선택하고, 문의는 별도로 권한을 확인합니다.</span>
        </div>
        <label className="client-consultation-search"><span>고객·상담 검색</span><input type="search" value={model.searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="고객명 또는 상담 제목" aria-label="고객·상담 검색" /></label>
      </div>
      <ClientConsultationTabs model={model} onTabChange={onTabChange} />
      {model.state === "partial" ? <div className="client-consultation-boundary-note" role="status">{consultationResultStateCopy("partial")}</div> : null}
      {model.consultations.length === 0 ? (
        <div className="client-consultation-state live-data-state live-data-empty" role="status" data-client-consultation-state="empty"><strong>{hasSearchOrTabNoMatch ? "조건에 맞는 상담이 없습니다." : consultationResultStateCopy("empty")}</strong></div>
      ) : (
        <div className="client-consultation-list" role="list" aria-label="상담 목록">
          {model.consultations.map((consultation) => {
            const isSelected = consultation.consultationId === model.selectedConsultationId;
            return <div className={isSelected ? "client-consultation-row selected" : "client-consultation-row"} role="listitem" key={consultation.consultationId}>
              <button type="button" className="client-consultation-row-button" data-client-consultation-row="true" aria-pressed={isSelected} aria-label={`${consultation.displayName} 상담 선택`} onClick={() => onSelectConsultation(consultation.consultationId)}>
                <span className="client-consultation-row-heading"><strong>{consultation.displayName}</strong><span>{consultation.subject}</span></span>
                <span className="client-consultation-row-meta"><b>{consultation.statusLabel}</b><span>{consultation.localDate} · {consultation.timezone}</span></span>
              </button>
            </div>;
          })}
        </div>
      )}
      {inquiriesState === "partial" ? <div className="client-consultation-boundary-note" role="status">문의 일부만 확인할 수 있어 선택 가능한 문의만 표시합니다.</div> : null}
      {inquiriesState === "empty" ? <div className="client-consultation-boundary-note" role="status">일정을 등록하려면 권한이 확인된 문의가 필요합니다.</div> : null}
      {inquiriesState === "denied" ? <div className="client-consultation-boundary-note" role="status">문의 조회 권한이 없어 상담 일정을 등록할 수 없습니다.</div> : null}
      {inquiriesState === "review_required" ? <div className="client-consultation-boundary-note" role="status">문의 조회에 담당자 확인이 필요해 상담 일정을 등록할 수 없습니다.</div> : null}
      {inquiriesState === "error" ? <div className="client-consultation-boundary-note" role="status">문의 정보를 확인하지 못해 상담 일정을 등록할 수 없습니다.</div> : null}
      <ConsultationScheduleForm inquiries={inquiries} selectedInquiryId={selectedInquiryId} pending={schedulePending || inquiriesState !== "data" && inquiriesState !== "partial"} result={scheduleResult} onInquiryChange={onInquiryChange} onSubmit={onSchedule} />
      {selected ? (
        <section className="client-consultation-detail" data-client-consultation-detail="true" aria-labelledby="client-consultation-detail-heading">
          <div className="client-consultation-detail-header"><div><span className="client-consultation-detail-kicker">선택한 상담</span><h2 id="client-consultation-detail-heading">{selected.displayName}</h2></div><button type="button" className="record-overlay-close" aria-label="상담 상세 닫기" autoFocus onClick={onCloseConsultation}><X size={17} /></button></div>
          <div className="client-consultation-detail-facts"><span><b>제목</b>{selected.subject}</span><span><b>일정</b>{selected.scheduledStart ? `${selected.localDate} · ${selected.timezone}` : "일정 미정"}</span><span><b>상태</b>{clientConsultationStatusLabel(selected.status)}</span><span><b>보호</b>{selected.confidential ? "상세 보호" : "표시 가능"}</span></div>
          {!selected.completedAt ? (
            <>
              <div className="client-consultation-detail-actions"><div><strong>Outlook 일정</strong><span>{selectedOutlookState === "linked" ? "연결됨" : selectedOutlookState === "update_required" ? "업데이트 필요" : "아직 연결하지 않음"}</span></div><button type="button" className="secondary-button" disabled={outlookPending || selectedOutlookState === "linked"} onClick={onOutlook}>{outlookPending ? "연결 중" : selectedOutlookState === "update_required" ? "Outlook 업데이트" : "Outlook 연결"}</button></div>
              {clientCommandStateNotice(outlookResult, "Outlook 일정 연결")}
              {outlookResult && clientCommandResultState(outlookResult) === "data" ? <div className="client-command-state success" role="status">{outlookResult.outlookCalendarState === "linked" ? "Outlook 일정이 연결되었습니다." : "Outlook 일정 업데이트가 필요합니다."} 자동 동기화는 사용하지 않습니다.</div> : null}
              <ConsultationRescheduleForm consultation={selected} pending={reschedulePending} result={rescheduleResult} onSubmit={onReschedule} />
              <ConsultationCompletionForm consultation={selected} pending={completePending} result={completeResult} onSubmit={onComplete} />
            </>
          ) : <ConsultationCompletedSummary consultation={selected} />}
          <EngagementDecisionForm inquiry={selectedInquiry} descriptor={descriptor} pending={decisionPending} result={decisionResult} repairPending={repairPending} repairResult={repairResult} onSubmit={onDecision} onRepair={onRepair} />
          {!descriptor && selectedInquiryId ? <div className="client-consultation-boundary-note" role="status">문의 상세의 최신 버전과 수임 정보를 확인한 뒤 결정할 수 있습니다.</div> : null}
        </section>
      ) : null}
    </div>
  );
}

function ClientActivitiesPanel({ result, inquiries, inquiriesState = "loading", selectedInquiryId, createResult, createPending, onInquiryChange, onCreate }) {
  const contactActivities = result?.kind === "data" && Array.isArray(result.contactActivities) ? result.contactActivities : [];
  const state = result === null ? "loading" : result?.uiState === "denied" || result?.kind === "denied" ? "denied" : result?.uiState === "review_required" || result?.kind === "review_required" ? "review_required" : result?.uiState === "partial" ? "partial" : result?.kind === "error" ? "error" : result?.kind === "data" && contactActivities.length === 0 ? "empty" : "data";
  const [form, setForm] = useState({ subject: "", reason: "", confidential: false });
  const valid = Boolean(selectedInquiryId && form.subject.trim() && form.reason.trim());
  if (["loading", "denied", "review_required", "error"].includes(state)) {
    const copy = state === "loading" ? "접촉 이력을 불러오는 중입니다." : state === "denied" ? "접촉 이력을 볼 권한이 없습니다." : state === "review_required" ? "접촉 이력을 보려면 담당자 확인이 필요합니다." : "접촉 이력을 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
    return <div className="client-activities-state live-data-state" role="status" data-client-activities-state={state}><strong>{copy}</strong></div>;
  }
  return (
    <div className="client-activities-surface" data-client-activities-connected="true">
      {state === "partial" ? <div className="client-activities-boundary-note" role="status">접촉 이력 일부만 확인할 수 있습니다.</div> : null}
      {inquiriesState === "partial" ? <div className="client-activities-boundary-note" role="status">문의 일부만 확인할 수 있어 선택 가능한 문의만 표시합니다.</div> : null}
      {inquiriesState === "empty" ? <div className="client-activities-boundary-note" role="status">메모를 남기려면 권한이 확인된 문의가 필요합니다.</div> : null}
      {inquiriesState === "denied" ? <div className="client-activities-boundary-note" role="status">문의 조회 권한이 없어 메모를 기록할 수 없습니다.</div> : null}
      {inquiriesState === "review_required" ? <div className="client-activities-boundary-note" role="status">문의 조회에 담당자 확인이 필요해 메모를 기록할 수 없습니다.</div> : null}
      {inquiriesState === "error" ? <div className="client-activities-boundary-note" role="status">문의 정보를 확인하지 못해 메모를 기록할 수 없습니다.</div> : null}
      <form className="client-command-form" data-client-activity-memo-form="true" onSubmit={(event) => { event.preventDefault(); if (!valid) return; onCreate({ ...form, subject: form.subject.trim(), reason: form.reason.trim() }); }}>
        <div className="client-command-form-heading"><div><strong>접촉 메모 추가</strong><span>권한이 확인된 문의를 선택해 일반 메모만 남깁니다. 상담 기록은 이 목록에 섞지 않습니다.</span></div></div>
        <InquiryContextSelect inquiries={inquiries} selectedInquiryId={selectedInquiryId} disabled={inquiriesState !== "data" && inquiriesState !== "partial" || createPending} onChange={onInquiryChange} label="문의·고객 맥락" />
        <label className="client-command-field"><span>메모</span><textarea value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} rows={3} placeholder="후속 연락 내용을 입력하세요" /></label>
        <label className="client-command-field"><span>기록 사유</span><input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="예: 상담 후속 연락을 기록함" /></label>
        <label className="client-command-checkbox"><input type="checkbox" checked={form.confidential} onChange={(event) => setForm((current) => ({ ...current, confidential: event.target.checked }))} /><span>메모 상세 보호</span></label>
        <div className="client-command-form-footer"><span>{selectedInquiryId ? "선택한 문의에만 연결합니다." : "문의를 먼저 선택하세요."}</span><button className="primary-button" type="submit" disabled={!valid || createPending || inquiriesState !== "data" && inquiriesState !== "partial"}>{createPending ? "기록 중" : "메모 기록"}</button></div>
        {clientCommandStateNotice(createResult, "접촉 메모 기록")}
        {createResult && clientCommandResultState(createResult) === "data" ? <div className="client-command-state success" role="status">접촉 메모가 기록되었습니다.</div> : null}
      </form>
      {state === "empty" ? <div className="client-activities-state live-data-state live-data-empty" role="status"><strong>접촉 이력이 없습니다.</strong></div> : null}
      {contactActivities.length > 0 ? <div className="client-activities-list" role="list" aria-label="접촉 이력 목록">{contactActivities.map((item, index) => <article className="client-activity-row" role="listitem" key={item.activityId ?? `contact-${index}`}><strong>{item.confidential ? "보호된 이력" : businessLabel(item.subject, "접촉 메모")}</strong><span>{item.partyDisplayName ?? "고객명 확인 필요"}</span><small>{item.confidential ? "상세 보호" : "메모"}</small></article>)}</div> : null}
    </div>
  );
}

function ClientContractsPanel({ result, createResult, patchResult, createPending, patchPending, onCreate, onProviderCheck }) {
  const state =
    result === null ||
    result?.kind === "error" ||
    result?.uiState === "denied" ||
    result?.uiState === "review_required" ||
    result?.outcome === "review_required"
      ? renderLiveState(result, "제안")
      : null;
  if (state) return state;
  const proposals = resultItems(result);
  const selectedProposal = proposals[0] ?? null;
  return (
    <div className="clients-live-stack" data-client-contracts-connected="true">
      <div className="record-action-strip" data-client-contract-create-action="true">
        <div>
          <strong>계약 초안 생성</strong>
          <span>Pipeline과 Vault 문서 참조를 묶어 제안 초안을 만듭니다.</span>
          <ActionNotice pending={createPending} result={createResult} pendingText="초안을 생성 중입니다." successText="계약 초안이 생성되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreate}>
          <Plus size={15} />
          초안 생성
        </button>
      </div>
      <div className="record-action-strip" data-client-contract-esign-provider-blocked="true">
        <div>
          <strong>전자서명 발송</strong>
          <span>{patchResult?.uiState === "provider_blocked" ? "발송 준비 필요" : "발송 준비 확인"}</span>
          <ActionNotice pending={patchPending} result={patchResult} pendingText="발송 준비 상태를 확인 중입니다." successText="전자서명 발송 준비가 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!selectedProposal || patchPending} onClick={() => onProviderCheck(selectedProposal)}>
          <ShieldCheck size={15} />
          발송 확인
        </button>
      </div>
      <DataTable
        columns={["제안", "상태", "승인", "Vault", "전자서명"]}
        rows={proposals.map((item, index) => [
          businessLabel(item.display_name, `제안 ${index + 1}`),
          proposalStatusLabel(item.proposal_status),
          approvalStateLabel(item.approval_state),
          item.vault_document_ref_present ? "문서 참조 있음" : "문서 참조 필요",
          item.e_sign_send_enabled ? "발송 가능" : "발송 준비 필요"
        ])}
      />
    </div>
  );
}

function ClientRelationshipsPanel({
  relationshipResult,
  mergeResult,
  mergeCreateResult,
  mergeExecuteResult,
  mergeCreatePending,
  mergeExecutePending,
  onCreateMergeProposal,
  onExecuteMergeProposal
}) {
  const relationshipState = renderLiveState(relationshipResult, "관계");
  return (
    <div className="clients-live-stack" data-client-relationships-connected="true">
      <div className="record-action-strip" data-client-relationship-list="true">
        <div>
          <strong>관계 목록</strong>
        </div>
      </div>
      {relationshipState ?? (
        <DataTable
          columns={["관계", "담당자", "상태", "연락값"]}
          rows={resultItems(relationshipResult).map((item, index) => [
            item.relationship_type ?? `관계 ${index + 1}`,
            businessLabel(item.contact_display_name, `담당자 ${index + 1}`),
            clientStatus(item.status),
            item.contact_point_value_included === true ? contactValueLabel(item) : "보호됨"
          ])}
        />
      )}
      <MergeReviewPanel
        result={mergeResult}
        createResult={mergeCreateResult}
        executeResult={mergeExecuteResult}
        createPending={mergeCreatePending}
        executePending={mergeExecutePending}
        onCreateMergeProposal={onCreateMergeProposal}
        onExecuteMergeProposal={onExecuteMergeProposal}
      />
    </div>
  );
}

function ClientConflictPanel({
  result,
  auditResult,
  activeIntake,
  conflictResult,
  decisionResult,
  waiverResult,
  engagementResult,
  clearanceResult,
  matterOpeningResult,
  conflictPending,
  decisionPending,
  waiverPending,
  engagementPending,
  clearancePending,
  matterOpeningPending,
  onConflictCheck,
  onConflictDecision,
  onWaiverApprove,
  onEngagementApprove,
  onClearance,
  onMatterOpening
}) {
  const state = renderLiveState(result, "이해상충 확인");
  if (state) return state;
  const intakes = resultItems(result);
  const selectedIntake = activeIntake ?? intakes[0] ?? null;
  const auditCount = resultItems(auditResult).length;
  return (
    <div className="clients-live-stack" data-client-conflict-connected="true">
      <IntakeActionPanel
        intakeRequest={selectedIntake}
        auditCount={auditCount}
        conflictResult={conflictResult}
        decisionResult={decisionResult}
        waiverResult={waiverResult}
        engagementResult={engagementResult}
        clearanceResult={clearanceResult}
        matterOpeningResult={matterOpeningResult}
        conflictPending={conflictPending}
        decisionPending={decisionPending}
        waiverPending={waiverPending}
        engagementPending={engagementPending}
        clearancePending={clearancePending}
        matterOpeningPending={matterOpeningPending}
        onConflictCheck={onConflictCheck}
        onConflictDecision={onConflictDecision}
        onWaiverApprove={onWaiverApprove}
        onEngagementApprove={onEngagementApprove}
        onClearance={onClearance}
        onMatterOpening={onMatterOpening}
      />
      <DataTable
        columns={["확인 대상", "상태", "스냅샷", "감사"]}
        rows={intakes.map((item, index) => [
          `상담 ${index + 1}`,
          pipelineStatus(item.status),
          conflictResult?.kind === "data" ? "기록됨" : "대기",
          `${auditCount}건`
        ])}
      />
    </div>
  );
}

function ClientSettingsPanel({ result, patchResult, patchPending, onPatch }) {
  const state = renderLiveState(result, "설정");
  if (state) return state;
  const policies = resultItems(result);
  const selectedPolicy = policies[0] ?? null;
  return (
    <div className="clients-live-stack" data-client-settings-connected="true">
      <div className="record-action-strip" data-client-settings-policy-patch-action="true">
        <div>
          <strong>정책 레지스트리</strong>
          <span>{selectedPolicy ? policyDisplayName(selectedPolicy.display_name) : "정책 없음"}</span>
          <ActionNotice pending={patchPending} result={patchResult} pendingText="정책을 업데이트 중입니다." successText="정책 변경이 감사 기록에 남았습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!selectedPolicy || patchPending} onClick={() => onPatch(selectedPolicy)}>
          <ShieldCheck size={15} />
          정책 확인
        </button>
      </div>
      <DataTable
        columns={["정책", "필드", "값", "쓰기 조건"]}
        rows={policies.map((item, index) => [
          policyDisplayName(item.display_name) || `정책 ${index + 1}`,
          policyFieldLabel(item.field_name),
          Array.isArray(item.allowed_values) ? item.allowed_values.map(policyValueLabel).join(" / ") : "확인 필요",
          item.policy_write_permissioned ? "권한 필요" : "읽기 전용"
        ])}
      />
    </div>
  );
}

const CLIENT_DETAIL_TAB_LABELS = Object.freeze({
  overview: "개요",
  contacts: "연락처",
  matters: "Matter",
  inquiries: "문의"
});

function clientDetailDateLabel(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function clientDetailContactType(value) {
  if (value === "email") return "이메일";
  if (value === "phone" || value === "mobile") return "전화";
  return "연락처";
}

function clientDetailContactPoints(contact) {
  if (Array.isArray(contact?.contactPoints) && contact.contactPoints.length > 0) {
    return contact.contactPoints;
  }
  return [{
    contactType: contact?.contactType ?? null,
    contactValue: contact?.contactValue ?? null,
    contactValueIncluded: contact?.contactValueIncluded === true,
    contactValueMasked: contact?.contactValueMasked === true,
    status: contact?.status ?? null
  }];
}

function clientDetailInquirySource(value) {
  if (value === "outlook_addin" || value === "outlook") return "Outlook";
  if (value === "manual") return "직접 등록";
  return "등록 경로 확인 필요";
}

function clientDetailMatterStatus(value) {
  if (value === "closed" || value === "archived") return "종료";
  if (value === "opening") return "개설 중";
  if (value === "review_required") return "확인 필요";
  return "진행 중";
}

function ClientDetailSourceState({ state, noun, hasItems = false }) {
  if (state === "available") return null;
  if (state === "partial" && hasItems) {
    return (
      <div className="client-detail-source-note" role="status">
        일부 정보만 불러왔습니다.
      </div>
    );
  }
  const content = {
    loading: [`${noun} 정보를 불러오는 중입니다`, ""],
    denied: ["접근 권한이 없습니다", `${noun} 정보는 표시하지 않습니다.`],
    review_required: ["확인이 필요합니다", `${noun} 정보를 확인한 뒤 다시 시도해 주세요.`],
    partial: ["일부 정보만 불러왔습니다", `${noun} 정보를 모두 확인하지 못했습니다.`],
    error: [`${noun} 정보를 불러오지 못했습니다`, "새로고침하거나 연결 상태를 확인하세요."],
    empty: [`등록된 ${noun} 정보가 없습니다`, ""]
  }[state] ?? [`${noun} 정보를 확인할 수 없습니다`, ""];
  return (
    <div className={`live-data-state client-detail-state client-detail-state-${state}`} role="status">
      <strong>{content[0]}</strong>
      {content[1]}
    </div>
  );
}

function ClientRecordPanel({
  model,
  onSelectTab,
  onOpenRelatedSection,
  onClose
}) {
  const client = model.selectedClient;
  const activeTab = model.route.activeTab;
  const contacts = model.contacts.items;
  const matters = model.matters.items;
  const inquiries = model.inquiries.items;
  return (
    <aside
      className="record-side-panel client-detail-panel"
      data-client-record-workspace="right-panel"
      data-client-detail-tab={activeTab}
    >
      <div className="record-side-header">
        <div>
          <span className="eyebrow">고객 정보</span>
          <strong>{clientDisplayName(client, 0)}</strong>
        </div>
        <button type="button" className="record-overlay-close" aria-label="고객 정보 닫기" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      {model.route.relatedRoute && (
        <div className="client-related-route-note" role="status" data-client-related-route={model.route.requestedTab}>
          <span>선택한 고객을 기준으로 {model.route.relatedRoute.label}을 확인할 수 있습니다.</span>
          <button className="secondary-button" type="button" onClick={onOpenRelatedSection}>
            {model.route.relatedRoute.label} 열기
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      <div className="client-detail-tabs" role="tablist" aria-label="고객 상세 항목">
        {CLIENT_DETAIL_TAB_IDS.map((tabId) => (
          <button
            key={tabId}
            id={`client-detail-tab-${tabId}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tabId}
            aria-controls={`client-detail-panel-${tabId}`}
            tabIndex={activeTab === tabId ? 0 : -1}
            data-client-detail-tab-button={tabId}
            onClick={() => onSelectTab(tabId)}
          >
            {CLIENT_DETAIL_TAB_LABELS[tabId]}
          </button>
        ))}
      </div>
      {activeTab === "overview" && (
        <div
          id="client-detail-panel-overview"
          className="client-detail-tab-panel"
          role="tabpanel"
          aria-labelledby="client-detail-tab-overview"
          data-client-detail-panel="overview"
        >
          <div className="property-grid tight">
            <Property label="상태" value={clientStatus(client.status)} />
            <Property label="고객 유형" value={clientLegalForm(client.legal_form)} />
            <Property
              label="대표 정보"
              value={client?.primary_record_present === true ? "등록됨" : "미지정"}
            />
            <Property label="구성원" value={String(clientMembers(client))} />
            <Property label="연결 Matter" value="Matter 탭에서 확인" />
          </div>
        </div>
      )}
      {activeTab === "contacts" && (
        <div
          id="client-detail-panel-contacts"
          className="client-detail-tab-panel"
          role="tabpanel"
          aria-labelledby="client-detail-tab-contacts"
          data-client-detail-panel="contacts"
        >
          <ClientDetailSourceState state={model.contacts.state} noun="연락처" hasItems={contacts.length > 0} />
          {contacts.length > 0 && (
            <div className="client-detail-record-list" data-client-detail-contact-list="true">
              {contacts.flatMap((contact, contactIndex) => (
                clientDetailContactPoints(contact).map((point, pointIndex) => (
                  <div
                    className="client-detail-record"
                    key={`${contact.contactId ?? contact.displayName ?? contactIndex}:${point.contactType ?? "contact"}:${pointIndex}`}
                  >
                    <div>
                      <strong>{contact.displayName}</strong>
                      <span>{clientDetailContactType(point.contactType)}</span>
                    </div>
                    <span>{point.contactValueIncluded ? point.contactValue : "보호됨"}</span>
                  </div>
                ))
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === "matters" && (
        <div
          id="client-detail-panel-matters"
          className="client-detail-tab-panel"
          role="tabpanel"
          aria-labelledby="client-detail-tab-matters"
          data-client-detail-panel="matters"
        >
          <ClientDetailSourceState state={model.matters.state} noun="Matter" hasItems={matters.length > 0} />
          {matters.length > 0 && (
            <div className="client-detail-record-list" data-client-detail-matter-list="true">
              {matters.map((matter, index) => (
                <div className="client-detail-record" key={matter.matterId ?? `${matter.displayName}-${index}`}>
                  <div>
                    <strong>{matter.displayName}</strong>
                    <span>{businessLabel(matter.matterCode, "Matter 번호 미등록")}</span>
                  </div>
                  <span>{clientDetailMatterStatus(matter.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === "inquiries" && (
        <div
          id="client-detail-panel-inquiries"
          className="client-detail-tab-panel"
          role="tabpanel"
          aria-labelledby="client-detail-tab-inquiries"
          data-client-detail-panel="inquiries"
        >
          <ClientDetailSourceState state={model.inquiries.state} noun="문의" hasItems={inquiries.length > 0} />
          {inquiries.length > 0 && (
            <div className="client-detail-record-list" data-client-detail-inquiry-list="true">
              {inquiries.map((inquiry, index) => (
                <div className="client-detail-record client-detail-inquiry" key={inquiry.inquiryId ?? `${inquiry.displayName}-${index}`}>
                  <div>
                    <strong>{inquiry.displayName}</strong>
                    <span>
                      {clientDetailInquirySource(inquiry.source)}
                      {" · "}
                      {clientDetailDateLabel(inquiry.receivedAt)}
                    </span>
                  </div>
                  <span>{inquiry.visibleStatusLabel}</span>
                  <small>{businessLabel(inquiry.nextAction, "다음 행동 미정")}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function RecordActionSummary({
  fieldsResult,
  auditResult,
  updateResult,
  ownerResult,
  pending,
  ownerPending,
  editValue,
  onEditValueChange,
  onFieldUpdate,
  onOwnerBlocked
}) {
  const fields = fieldsResult?.kind === "data" && Array.isArray(fieldsResult.item?.fields) ? fieldsResult.item.fields : [];
  const audits = resultItems(auditResult);
  return (
    <div className="clients-live-stack" data-sf-b-w02-record-actions-panel="true">
      <div className="record-action-strip record-action-edit-strip" data-sf-b-w02-field-registry="true">
        <div>
          <strong>레코드 작업</strong>
          <span>{fields.length > 0 ? fields.map((field) => recordFieldLabel(field.label)).join(" / ") : "편집 항목 확인 중"}</span>
          <ActionNotice
            pending={pending}
            result={updateResult}
            pendingText="필드를 업데이트 중입니다."
            successText="변경 항목이 업데이트되었습니다."
          />
        </div>
        <form className="record-action-edit-form" onSubmit={onFieldUpdate}>
          <label>
            <span>고객 이름</span>
            <input value={editValue} onChange={(event) => onEditValueChange(event.target.value)} />
          </label>
          <button className="secondary-button" type="submit" disabled={pending || !editValue.trim()}>
            <ShieldCheck size={15} />
            저장
          </button>
        </form>
      </div>
      {updateResult?.kind === "data" && updateResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-field-update-result="true">
          <ShieldCheck size={15} />
          <span>변경 필드 {updateResult.fieldPatch.changed_fields?.join(", ")}</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-owner-blocked-action="true">
        <div>
          <strong>담당자 일괄 변경</strong>
          <span>{ownerResult?.uiState === "owner_blocked" ? "승인 필요" : "변경 준비"}</span>
          <ActionNotice
            pending={ownerPending}
            result={ownerResult}
            pendingText="승인 조건을 확인 중입니다."
            successText="변경 요청이 준비되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={ownerPending} onClick={onOwnerBlocked}>
          <ShieldCheck size={15} />
          승인 확인
        </button>
      </div>
      {ownerResult?.uiState === "owner_blocked" && (
        <div className="record-boundary-note" data-sf-b-w02-owner-blocked-result="true">
          <ShieldCheck size={15} />
          <span>담당자 확인 후 처리됩니다.</span>
        </div>
      )}
      <div className="record-boundary-note" data-sf-b-w02-action-audit-feed="true">
        <ShieldCheck size={15} />
        <span>최근 작업 {audits.length}건</span>
      </div>
    </div>
  );
}

function ClientSelectableList({ clients, selectedClientId, onSelectClient }) {
  return (
    <div className="client-selectable-list" data-client-selected-record-list="true" role="listbox" aria-label="고객 목록">
      <div className="client-selectable-header">
        <span>고객</span>
        <span>진행 상태</span>
        <span>대표 정보</span>
        <span>구성원</span>
        <span>관련 Matter</span>
      </div>
      {clients.map((item, index) => {
        const clientId = clientRecordId(item);
        const selected = clientId === selectedClientId;
        return (
          <div
            key={clientId ?? `${clientDisplayName(item, index)}-${index}`}
            className={selected ? "client-selectable-row active" : "client-selectable-row"}
            role="option"
            aria-selected={selected}
            data-client-select-row="true"
            data-selected={selected ? "true" : "false"}
          >
            <button
              type="button"
              className="client-selectable-record-button"
              aria-pressed={selected}
              onClick={() => onSelectClient(clientId)}
            >
              <strong>{clientDisplayName(item, index)}</strong>
              <span>{clientStatus(item.status)}</span>
              <span>{item.primary_record_present === true ? "대표 정보 있음" : "미지정"}</span>
              <span>{String(clientMembers(item))}</span>
              <span>상세에서 확인</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ClientsTable({ result, selectedClientId, onSelectClient }) {
  const state = renderLiveState(result, "고객");
  if (state) return state;
  const items = resultItems(result);
  const reviewCount = items.filter((item) => item.status === "review_required").length;
  const partial = result?.uiState === "partial" || result?.outcome === "partial";
  return (
    <div className="clients-live-stack">
      {partial && (
        <div className="client-list-boundary-note" role="status">
          고객 목록 일부만 확인할 수 있습니다. 확인 가능한 고객만 표시합니다.
        </div>
      )}
      {reviewCount > 0 && (
        <div className="client-review-strip">
          <ShieldCheck size={15} />
          <span>검토가 필요한 고객이 있습니다.</span>
        </div>
      )}
      <ClientSelectableList clients={items} selectedClientId={selectedClientId} onSelectClient={onSelectClient} />
    </div>
  );
}

function AccountsTable({
  result,
  relationshipResult,
  createResult,
  createPending,
  patchResult,
  patchPending,
  recordActionResult,
  recordActionPending,
  onCreateAccount,
  onPatchAccount,
  onRecordActionFieldUpdate
}) {
  const state = renderLiveState(result, "계정 정보");
  if (state) return state;
  const accounts = resultItems(result);
  const editableAccount = accounts.find((item) => item.account_source === "crm-runtime.Account");
  const relationshipState = renderLiveState(relationshipResult, "관련 담당자");
  return (
    <div className="clients-live-stack" data-crm-accounts-read="true">
      <div className="record-action-strip" data-crm-account-create-action="true">
        <div>
          <strong>정보 생성</strong>
          <span>새 계정을 추가합니다.</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="정보를 생성 중입니다."
            successText="정보가 생성되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateAccount}>
          <Plus size={15} />
          생성
        </button>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-crm-account-create-result="true" data-sf-b-w01r-account-canonical-sync="true">
          <ShieldCheck size={15} />
          <span>Client 정보 생성과 기준 데이터 동기화가 기록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-crm-account-patch-action="true">
        <div>
          <strong>Client 검토 표시</strong>
          <span>{editableAccount ? businessLabel(editableAccount.display_name, "생성된 Client") : "편집 가능한 Client 정보 없음"}</span>
          <ActionNotice
            pending={patchPending}
            result={patchResult}
            pendingText="Client 정보를 업데이트 중입니다."
            successText="Client 정보가 업데이트되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableAccount || patchPending} onClick={onPatchAccount}>
          <ShieldCheck size={15} />
          검토 표시
        </button>
      </div>
      {patchResult?.kind === "data" && patchResult.item && (
        <div className="record-boundary-note" data-crm-account-patch-result="true">
          <ShieldCheck size={15} />
          <span>Client 상태가 반영되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-account-record-action="true">
        <div>
          <strong>Client 필드 작업</strong>
          <span>{editableAccount ? businessLabel(editableAccount.display_name, "생성된 Client") : "편집 가능한 Client 정보 없음"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionResult}
            pendingText="Client 필드를 업데이트 중입니다."
            successText="Client 필드 작업이 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableAccount || recordActionPending} onClick={onRecordActionFieldUpdate}>
          <ShieldCheck size={15} />
          레코드 작업
        </button>
      </div>
      {recordActionResult?.kind === "data" && recordActionResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-account-record-action-result="true">
          <ShieldCheck size={15} />
          <span>Client 필드 작업이 완료되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["Client", "상태", "기준 데이터", "Client 그룹", "식별자"]}
        rows={accounts.map((item, index) => [
          businessLabel(item.display_name, `Client ${index + 1}`),
          clientStatus(item.status),
          canonicalSyncLabel(item.canonical_sync_state),
          linkedLabel(item.client_group_id),
          item.registration_number_included === false ? "보호됨" : "검토 필요"
        ])}
      />
      <div className="record-action-strip" data-crm-account-contacts-read="true">
        <div>
          <strong>관련 담당자</strong>
          <span>권한이 허용한 관계만 표시됩니다.</span>
        </div>
      </div>
      {relationshipState ?? (
        <DataTable
          columns={["담당자", "관계", "상태", "연락값"]}
          rows={resultItems(relationshipResult).map((item, index) => [
            businessLabel(item.contact_display_name, `담당자 ${index + 1}`),
            item.relationship_type ?? "관계",
            clientStatus(item.status),
            item.contact_point_value_included === true ? contactValueLabel(item) : "보호됨"
          ])}
        />
      )}
    </div>
  );
}

function ContactsTable({
  result,
  legalPeopleResult,
  mergeResult,
  createResult,
  createPending,
  patchResult,
  patchPending,
  recordActionResult,
  recordActionPending,
  mergeCreateResult,
  mergeExecuteResult,
  mergeCreatePending,
  mergeExecutePending,
  onCreateContact,
  onPatchContact,
  onRecordActionFieldUpdate,
  onCreateMergeProposal,
  onExecuteMergeProposal
}) {
  const state = renderLiveState(result, "담당자");
  if (state) return state;
  const contacts = resultItems(result);
  const legalPeople = legalPeopleItems(legalPeopleResult);
  const editableContact = contacts.find((item) => item.contact_source === "crm-runtime.Contact");
  return (
    <div className="clients-live-stack" data-crm-contacts-read="true">
      <div className="record-action-strip" data-crm-contact-create-action="true" data-upl-c07-contact-raw-value-flow="true">
        <div>
          <strong>담당자 생성</strong>
          <span>새 담당자를 Client 정보에 추가합니다.</span>
          <ActionNotice
            result={createResult}
            pending={createPending}
            pendingText="담당자를 생성 중입니다."
            successText="담당자가 생성되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateContact}>
          <Plus size={15} />
          생성
        </button>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-crm-contact-create-result="true" data-sf-b-w01r-contact-canonical-sync="true">
          <ShieldCheck size={15} />
          <span>담당자와 기준 데이터 담당자 정보가 등록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-crm-contact-patch-action="true">
        <div>
          <strong>담당자 검토 표시</strong>
          <span>{editableContact ? businessLabel(editableContact.display_name, "생성된 담당자") : "편집 가능한 담당자 없음"}</span>
          <ActionNotice
            result={patchResult}
            pending={patchPending}
            pendingText="담당자를 업데이트 중입니다."
            successText="담당자가 업데이트되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableContact || patchPending} onClick={onPatchContact}>
          <ShieldCheck size={15} />
          검토 표시
        </button>
      </div>
      {patchResult?.kind === "data" && patchResult.item && (
        <div className="record-boundary-note" data-crm-contact-patch-result="true">
          <ShieldCheck size={15} />
          <span>담당자 상태가 반영되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-contact-record-action="true">
        <div>
          <strong>담당자 필드 작업</strong>
          <span>{editableContact ? businessLabel(editableContact.display_name, "생성된 담당자") : "편집 가능한 담당자 없음"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionResult}
            pendingText="담당자 필드를 업데이트 중입니다."
            successText="담당자 필드 작업이 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableContact || recordActionPending} onClick={onRecordActionFieldUpdate}>
          <ShieldCheck size={15} />
          레코드 작업
        </button>
      </div>
      {recordActionResult?.kind === "data" && recordActionResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-contact-record-action-result="true">
          <ShieldCheck size={15} />
          <span>담당자 필드 작업이 완료되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["담당자", "상태", "기준 데이터", "기본 연락 수단", "연락값"]}
        rows={contacts.map((item, index) => [
          businessLabel(item.display_name, `담당자 ${index + 1}`),
          clientStatus(item.status),
          canonicalSyncLabel(item.canonical_sync_state),
          item.primary_contact_type ?? "미지정",
          item.contact_point_value_included === true ? contactValueLabel(item) : "보호됨"
        ])}
      />
      <div className="record-action-strip legal-people-backlink-strip" data-lcx-ppl-client-backlink="true">
        <div>
          <strong>관련 인물 연결</strong>
          <span>Client 담당자와 연결된 인물 기록을 함께 확인합니다.</span>
          {legalPeopleResult === null && <em>인물 기록 조회 중</em>}
          {legalPeopleResult?.kind === "error" && <em>인물 기록 조회 실패</em>}
        </div>
        <div className="legal-people-backlink-list" aria-label="Client 연결 인물">
          {legalPeople.slice(0, 4).map((person) => (
            <span key={person.person_id} className="legal-people-backlink-row" data-compact-record="true">
              <Link2 size={13} />
              <strong>{businessLabel(person.display_name, "인물")}</strong>
              <small>{person.korean_label ?? person.type_id}</small>
            </span>
          ))}
          {legalPeople.length === 0 && legalPeopleResult?.kind === "data" && (
            <span className="legal-people-backlink-row muted" data-compact-record="true">
              <Link2 size={13} />
              <strong>연결 없음</strong>
              <small>로컬 fixture 기준</small>
            </span>
          )}
        </div>
      </div>
      <MergeReviewPanel
        result={mergeResult}
        createResult={mergeCreateResult}
        executeResult={mergeExecuteResult}
        createPending={mergeCreatePending}
        executePending={mergeExecutePending}
        onCreateMergeProposal={onCreateMergeProposal}
        onExecuteMergeProposal={onExecuteMergeProposal}
      />
    </div>
  );
}

function MergeReviewPanel({
  result,
  createResult,
  executeResult,
  createPending,
  executePending,
  onCreateMergeProposal,
  onExecuteMergeProposal
}) {
  const proposals = resultItems(result);
  const executableProposal = proposals.find((proposal) => proposal.executable);
  const selectedProposal = executableProposal ?? proposals[0] ?? null;
  return (
    <div className="clients-live-stack" data-sf-b-w01r-merge-review="true">
      <div className="record-action-strip">
        <div>
          <strong>병합 검토</strong>
          <span>{selectedProposal ? proposalStateLabel(selectedProposal.proposal_state) : "검토 제안 없음"}</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="병합 검토를 생성 중입니다."
            successText="병합 검토가 생성되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateMergeProposal}>
          <Plus size={15} />
          검토 생성
        </button>
      </div>
      <div className="record-action-strip" data-sf-b-w01r-merge-execute-guarded="true">
        <div>
          <strong>병합 실행</strong>
          <span>{executableProposal ? "승인된 제안" : "담당자 승인 필요"}</span>
          <ActionNotice
            pending={executePending}
            result={executeResult}
            pendingText="병합 실행을 확인 중입니다."
            successText="병합 실행 상태가 기록되었습니다."
          />
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={!executableProposal || executePending}
          onClick={() => onExecuteMergeProposal(executableProposal)}
        >
          <ShieldCheck size={15} />
          병합 실행
        </button>
      </div>
      {result === null ? (
        <div className="live-data-state live-data-loading">병합 검토를 불러오는 중입니다.</div>
      ) : result?.kind === "error" ? (
        <div className="live-data-state live-data-error">병합 검토를 불러오지 못했습니다.</div>
      ) : proposals.length === 0 ? (
        <div className="live-data-state live-data-empty">검토 제안이 없습니다.</div>
      ) : (
        <DataTable
          columns={["제안", "상태", "후보", "승인", "실행"]}
          rows={proposals.map((proposal, index) => [
            `제안 ${index + 1}`,
            proposalStateLabel(proposal.proposal_state),
            `${proposal.candidate_count ?? 0}건`,
            proposal.approval_ref_present ? "있음" : "필요",
            proposal.executable ? "가능" : "보류"
          ])}
        />
      )}
    </div>
  );
}

function clientInquiryDateLabel(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "받은 시간 미정";
  return parsed.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function clientInquiryReadState(result) {
  if (result === null || result === undefined) {
    return <div className="live-data-state live-data-loading" role="status">새 문의 목록을 불러오는 중입니다.</div>;
  }
  if (result.kind === "error") {
    return <div className="live-data-state live-data-error" role="status"><strong>새 문의 목록을 불러오지 못했습니다.</strong>잠시 후 다시 시도해 주세요.</div>;
  }
  if (result.uiState === "denied" || result.outcome === "denied") {
    return <div className="live-data-state live-data-denied" role="status"><strong>문의 접근 권한이 없습니다.</strong>권한이 없는 문의의 이름·건수는 표시하지 않습니다.</div>;
  }
  if (result.uiState === "review" || result.uiState === "review_required" || result.outcome === "review_required") {
    return <div className="live-data-state live-data-review" role="status"><strong>문의 조회 확인이 필요합니다.</strong>담당자 확인 후 문의를 볼 수 있습니다.</div>;
  }
  if (result.uiState === "blocked" || result.outcome === "blocked") {
    return <div className="live-data-state live-data-error" role="status"><strong>문의 조회가 차단되었습니다.</strong>내부 식별자와 건수는 표시하지 않습니다.</div>;
  }
  if (result.uiState === "empty" || resultItems(result).length === 0) {
    return <div className="live-data-state live-data-empty" role="status"><strong>등록된 새 문의가 없습니다.</strong></div>;
  }
  return null;
}

function ClientInquiryList({ result, items: normalizedItems = null, selectedInquiryId, onSelectInquiry }) {
  const state = clientInquiryReadState(result);
  if (state) return state;
  const items = normalizedItems ?? resultItems(result);
  return (
    <div className="client-inquiries-live-stack" data-client-inquiry-list="true">
      {result.uiState === "partial" || result.outcome === "partial" ? (
        <div className="client-inquiry-boundary-note" role="status">일부 문의 원천을 확인하지 못했습니다. 확인 가능한 문의만 표시합니다.</div>
      ) : null}
      <div className="client-inquiry-list" role="list" aria-label="새 문의 목록">
        {items.map((inquiry) => {
          const selected = inquiry.inquiryId === selectedInquiryId;
          return (
            <div
              key={inquiry.inquiryId}
              className={selected ? "client-inquiry-row selected" : "client-inquiry-row"}
              data-client-inquiry-row="true"
              data-selected={selected ? "true" : "false"}
              role="listitem"
            >
              <button
                type="button"
                className="client-inquiry-row-button"
                data-client-inquiry-row-button="true"
                aria-pressed={selected}
                onClick={() => onSelectInquiry(inquiry.inquiryId)}
              >
                <span className="client-inquiry-row-heading">
                  <strong>{inquiry.displayName}</strong>
                  <span className="client-inquiry-status-label">{clientInquiryStatusLabel(inquiry.visibleStatus)}</span>
                </span>
                <span className="client-inquiry-row-meta">
                  <span>{clientInquirySourceLabel(inquiry.source)}</span>
                  <time dateTime={inquiry.receivedAt ?? undefined}>{clientInquiryDateLabel(inquiry.receivedAt)}</time>
                </span>
                <span className="client-inquiry-row-meta">
                  <span>{inquiry.assigned ? "담당 지정" : "미지정"}</span>
                  <span>{inquiry.nextAction || "다음 행동 미정"}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientInquiryEvidenceState({ state, children }) {
  if (state === "data") return children;
  const copy = {
    loading: "메일 내용을 불러오는 중입니다.",
    denied: "메일 내용을 볼 권한이 없습니다.",
    review_required: "메일 내용 열기에 추가 확인이 필요합니다.",
    blocked: "메일 내용 열기가 차단되었습니다.",
    quarantined: "검사에서 격리된 메일은 열 수 없습니다.",
    unavailable: "메일 내용을 사용할 수 없습니다.",
    error: "메일 내용을 불러오지 못했습니다.",
    partial: "메일 증거 일부만 확인할 수 있습니다.",
    empty: "표시할 메일 내용이 없습니다."
  }[state] ?? "메일 내용을 확인할 수 없습니다.";
  return <div className={`client-inquiry-evidence-state ${state}`} role="status">{copy}</div>;
}

function base64Bytes(value) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function safeInquiryDownloadName(inquiry, evidence) {
  const slug = String(inquiry?.displayName ?? "문의")
    .replace(/[^0-9A-Za-z가-힣 -]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .slice(0, 48) || "문의";
  const stamp = evidence?.receivedAt ? new Date(evidence.receivedAt).toISOString().slice(0, 10) : "원본";
  return `${slug}-${stamp}.eml`;
}

function ClientInquiryDetailPanel({ inquiry, detailState, ctx }) {
  const [contentKind, setContentKind] = useState("");
  const [contentEvidenceId, setContentEvidenceId] = useState("");
  const [contentResult, setContentResult] = useState(null);
  const contentRequestRef = useRef(0);
  const evidenceItems = Array.isArray(inquiry?.evidence?.items) ? inquiry.evidence.items : [];

  useEffect(() => {
    contentRequestRef.current += 1;
    setContentKind("");
    setContentEvidenceId("");
    setContentResult(null);
    return () => {
      contentRequestRef.current += 1;
    };
  }, [inquiry?.inquiryId]);

  async function readEvidence(targetEvidence, kind) {
    if (!targetEvidence?.evidenceId || !["display", "original"].includes(kind)) return;
    const requestId = contentRequestRef.current + 1;
    contentRequestRef.current = requestId;
    setContentKind(kind);
    setContentEvidenceId(targetEvidence.evidenceId);
    setContentResult(null);
    const next = await fetchCrmInquiryEvidenceContent({ evidenceId: targetEvidence.evidenceId, kind, ctx });
    if (contentRequestRef.current !== requestId) return;
    setContentResult(next);
    if (kind === "original" && next?.kind === "data" && next.item?.contentBase64) {
      const bytes = base64Bytes(next.item.contentBase64);
      if (!bytes) return;
      const blob = new Blob([bytes], { type: "message/rfc822" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeInquiryDownloadName(inquiry, targetEvidence);
      link.rel = "noopener";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }

  const detailBoundary = detailState !== "data" && detailState !== "partial";
  if (detailBoundary) {
    return (
      <div className="client-inquiry-detail-panel" data-client-inquiry-detail="true">
        <div className="client-inquiry-detail-state" role="status">
          {detailState === "loading" ? "문의 상세를 불러오는 중입니다." : detailState === "denied" ? "문의 상세를 볼 권한이 없습니다." : detailState === "review_required" ? "문의 상세 조회에 추가 확인이 필요합니다." : detailState === "empty" ? "선택한 문의를 찾을 수 없습니다." : "문의 상세를 확인할 수 없습니다."}
        </div>
      </div>
    );
  }
  const consultations = Array.isArray(inquiry.consultations) ? inquiry.consultations : [];
  return (
    <div className="client-inquiry-detail-panel" data-client-inquiry-detail="true" data-client-inquiry-detail-state={detailState}>
      {detailState === "partial" ? <div className="client-inquiry-boundary-note" role="status">상담 또는 메일 증거 일부를 확인하지 못했습니다.</div> : null}
      <div className="client-inquiry-detail-summary">
        <div className="client-inquiry-detail-title">
          <span className="eyebrow">문의 상세</span>
          <strong>{inquiry.displayName}</strong>
        </div>
        <div className="client-inquiry-detail-facts">
          <span><b>등록 경로</b>{clientInquirySourceLabel(inquiry.source)}</span>
          <span><b>받은 시간</b>{clientInquiryDateLabel(inquiry.receivedAt)}</span>
          <span><b>상태</b>{clientInquiryStatusLabel(inquiry.visibleStatus)}</span>
          <span><b>담당</b>{inquiry.assigned ? "담당 지정" : "미지정"}</span>
          <span><b>다음 행동</b>{inquiry.nextAction || "다음 행동 미정"}</span>
        </div>
      </div>
      <section className="client-inquiry-detail-section" aria-labelledby="client-inquiry-consultations-heading">
        <div className="client-inquiry-detail-section-heading">
          <h3 id="client-inquiry-consultations-heading">상담 기록</h3>
          <span>{inquiry.consultationsAccess === "denied" ? "접근 권한 없음" : consultations.length ? `${consultations.length}건` : "기록 없음"}</span>
        </div>
        {inquiry.consultationsAccess === "denied" ? (
          <div className="client-inquiry-evidence-state denied" role="status">상담 기록을 볼 권한이 없습니다.</div>
        ) : consultations.length === 0 ? (
          <div className="client-inquiry-evidence-state empty" role="status">등록된 상담 기록이 없습니다.</div>
        ) : (
          <div className="client-inquiry-consultation-list">
            {consultations.map((consultation, index) => (
              <div className="client-inquiry-consultation" key={`${consultation.scheduledStart ?? "consultation"}-${index}`}>
                <strong>{consultation.subject || "상담"}</strong>
                <span>{clientInquiryDateLabel(consultation.scheduledStart)}{consultation.timezone ? ` · ${consultation.timezone}` : ""}</span>
                <small>{consultation.confidential ? "상세 내용 보호됨" : consultation.outcome || consultation.nextAction || "결과 미기록"}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="client-inquiry-detail-section" aria-labelledby="client-inquiry-evidence-heading">
        <div className="client-inquiry-detail-section-heading">
          <h3 id="client-inquiry-evidence-heading">원본 메일</h3>
          <span>{inquiry.evidence?.partial ? "일부 확인" : evidenceItems.length ? "안전한 메타데이터" : "기록 없음"}</span>
        </div>
        {inquiry.evidence?.access === "denied" ? (
          <div className="client-inquiry-evidence-state denied" role="status">메일 증거를 볼 권한이 없습니다.</div>
        ) : inquiry.evidence?.access === "unavailable" || inquiry.evidence?.access === "error" ? (
          <div className="client-inquiry-evidence-state unavailable" role="status">메일 증거를 사용할 수 없습니다.</div>
        ) : evidenceItems.length ? (
          <div className="client-inquiry-consultation-list">
            {evidenceItems.map((evidence) => {
              const selected = evidence.evidenceId === contentEvidenceId;
              return (
                <article className="client-inquiry-consultation" key={evidence.evidenceId}>
                  <dl className="client-inquiry-evidence-meta">
                    <div><dt>제목</dt><dd>{evidence.subject || "제목 없음"}</dd></div>
                    <div><dt>보낸 사람</dt><dd>{evidence.senderDisplayName || "표시하지 않음"}</dd></div>
                    <div><dt>받은 시간</dt><dd>{clientInquiryDateLabel(evidence.receivedAt)}</dd></div>
                    <div><dt>보관 상태</dt><dd>{evidence.captureStatus}</dd></div>
                  </dl>
                  <div className="client-inquiry-evidence-actions">
                    <button type="button" className="secondary-button" disabled={!evidence.hasDisplayContent || selected && contentKind === "display"} onClick={() => readEvidence(evidence, "display")}>메일 내용 보기</button>
                    <button type="button" className="secondary-button" disabled={!evidence.hasOriginalContent || selected && contentKind === "original"} onClick={() => readEvidence(evidence, "original")}>원본 .eml 다운로드</button>
                  </div>
                  {selected && contentKind ? <ClientInquiryEvidenceState state={contentResult ? inquiryEvidenceUiState(contentResult) : "loading"}>
                    {contentResult?.item?.contentText ? <pre className="client-inquiry-display-content" aria-label="안전한 메일 내용">{contentResult.item.contentText}</pre> : null}
                  </ClientInquiryEvidenceState> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="client-inquiry-evidence-state empty" role="status">등록된 메일 증거가 없습니다.</div>
        )}
      </section>
    </div>
  );
}

function ActionNotice({ pending, result, pendingText, successText }) {
  if (pending) return <small>{pendingText}</small>;
  const message = actionMessage(result, successText);
  return message ? <small>{message}</small> : null;
}

function IntakeActionPanel({
  intakeRequest,
  auditCount,
  conflictResult,
  decisionResult,
  waiverResult,
  engagementResult,
  clearanceResult,
  matterOpeningResult,
  conflictPending,
  decisionPending,
  waiverPending,
  engagementPending,
  clearancePending,
  matterOpeningPending,
  onConflictCheck,
  onConflictDecision,
  onWaiverApprove,
  onEngagementApprove,
  onClearance,
  onMatterOpening
}) {
  const conflict = conflictResult?.kind === "data" ? conflictResult.item : null;
  const conflictHits = conflictResult?.kind === "data" ? conflictResult.conflictHits : [];
  const decision = decisionResult?.kind === "data" ? decisionResult.conflictDecision ?? decisionResult.item : null;
  const waiver = waiverResult?.kind === "data" ? waiverResult.waiver ?? waiverResult.item : null;
  const engagement = engagementResult?.kind === "data" ? engagementResult.engagement ?? engagementResult.item : null;
  const templateReady = Boolean(
    engagementResult?.templateDocumentId ||
    engagementResult?.templateDocument?.template_document_id ||
    engagement?.template_document_id ||
    engagement?.template_document_generated === true
  );
  const signedReady = Boolean(
    engagementResult?.signedDocumentUploadId ||
    engagementResult?.signedDocumentUpload?.signed_document_upload_id ||
    engagement?.signed_document_upload_id ||
    engagementResult?.signedUploadVerified === true ||
    engagement?.signed_upload_verified === true
  );
  const decisionReady =
    decisionResult?.clearanceLinkReady === true ||
    (decisionResult?.kind === "data" && decisionResult.uiState !== "blocked" && decision?.decision !== "block");
  const reviewReady = decisionReady || waiverResult?.clearanceLinkReady === true || decision?.decision === "clear" || waiver?.status === "approved";
  const engagementReady = engagementResult?.engagementReady === true || (engagement?.status === "approved" && templateReady && signedReady);
  const clearance = clearanceResult?.kind === "data" ? clearanceResult.validation : null;
  const openedMatter = matterOpeningResult?.kind === "data" ? matterOpeningResult.item : null;
  const hitRows = conflictHits.map((hit, index) => [
    businessLabel(hit.matched_display_name, `Hit ${index + 1}`),
    hit.hit_source ? conflictSourceLabel(hit.hit_source) : "출처 확인",
    hit.severity ? conflictSeverityLabel(hit.severity) : "해당 없음",
    <RecordStateBadge tone={conflictHitStatusTone(hit.status)}>{conflictHitStatusLabel(hit.status)}</RecordStateBadge>
  ]);
  const gateTone = clearance?.valid || (reviewReady && engagementReady) ? "live" : reviewReady ? "review" : "guarded";
  const gateLabel = clearance?.valid ? "클리어런스 완료" : reviewReady && engagementReady ? "클리어런스 가능" : reviewReady ? "수임 승인 필요" : "충돌 결정 필요";
  return (
    <div
      className="record-action-grid"
      data-intake-clearance-action="true"
      data-intake-conflict-review-flow="true"
      data-intake-engagement-approval-flow="true"
      data-intake-matter-opening-flow="true"
    >
      <div className="record-action-strip">
        <div>
          <strong>{intakeRequest ? "상담 1" : "상담"}</strong>
          <span>{conflictResult?.hitCount !== null && conflictResult?.hitCount !== undefined ? `Hit ${conflictResult.hitCount}건` : auditCount > 0 ? "감사 기록 있음" : "검토 대기"}</span>
          <ActionNotice
            pending={conflictPending}
            result={conflictResult}
            pendingText="이해상충 검토 중입니다."
            successText="이해상충 검색 결과가 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!intakeRequest || conflictPending} onClick={onConflictCheck}>
          이해상충 검토
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{conflictReviewLabel({ decision, waiver, conflict, decisionReady })}</strong>
          <span>{conflictHits.length > 0 ? `${conflictHits.length}건 결정 상태 확인` : conflict ? "히트 없음" : "검색 결과 필요"}</span>
          <ActionNotice
            pending={decisionPending}
            result={decisionResult}
            pendingText="검토 결정을 기록 중입니다."
            successText="검토 결정이 기록되었습니다."
          />
          <ActionNotice
            pending={waiverPending}
            result={waiverResult}
            pendingText="동의서를 승인 중입니다."
            successText="동의서 승인 기록이 남았습니다."
          />
        </div>
        <div className="record-action-button-group">
          <button className="secondary-button" type="button" disabled={!conflict || decisionPending} onClick={onConflictDecision}>
            검토 결정
          </button>
          <button className="secondary-button" type="button" disabled={!conflict || waiverPending} onClick={onWaiverApprove}>
            동의서 승인
          </button>
        </div>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{gateLabel}</strong>
          <span>{reviewReady && engagementReady ? "수임 원장 확인됨" : reviewReady ? "수임 승인 전 잠금" : "충돌 결정 필요"}</span>
          <div className="record-approval-state" data-intake-engagement-approval-state="true">
            <RecordStateBadge tone={templateReady ? "live" : "guarded"}>{templateReady ? "템플릿 생성" : "템플릿 대기"}</RecordStateBadge>
            <RecordStateBadge tone={signedReady ? "live" : "guarded"}>{signedReady ? "서명 문서 연결" : "서명 문서 대기"}</RecordStateBadge>
            <RecordStateBadge tone={gateTone}>{gateLabel}</RecordStateBadge>
          </div>
          <ActionNotice
            pending={engagementPending}
            result={engagementResult}
            pendingText="수임 승인 기록 중입니다."
            successText="수임 승인 완료."
          />
          <ActionNotice
            pending={clearancePending}
            result={clearanceResult}
            pendingText="통과 처리 중입니다."
            successText="통과 처리되었습니다."
          />
        </div>
        <div className="record-action-button-group">
          <button className="secondary-button" type="button" disabled={!intakeRequest || !reviewReady || engagementPending} onClick={onEngagementApprove}>
            수임 승인
          </button>
          <button className="secondary-button" type="button" disabled={!intakeRequest || !conflict || !reviewReady || !engagementReady || clearancePending} onClick={onClearance}>
            통과 처리
          </button>
        </div>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{openedMatter ? "Matter 개설됨" : "Matter 개설"}</strong>
          <span>{openedMatter ? "Matter 목록에 반영됨" : clearance?.valid ? "통과 기록으로 개설 가능" : "통과 처리 필요"}</span>
          <ActionNotice
            pending={matterOpeningPending}
            result={matterOpeningResult}
            pendingText="Matter 개설 중입니다."
            successText="Matter가 개설되었습니다."
          />
        </div>
        <button className="primary-button" type="button" disabled={!clearance?.valid || matterOpeningPending || Boolean(openedMatter)} onClick={onMatterOpening}>
          <Plus size={15} />
          Matter 개설
        </button>
      </div>
      <div className="record-action-table" data-intake-conflict-hit-list="true">
        <DataTable
          columns={["Hit", "출처", "심각도", "상태"]}
          rows={hitRows}
        />
        {hitRows.length === 0 && (
          <div className="live-data-state live-data-empty">
            {conflict ? "기록된 충돌 히트가 없습니다." : "이해상충 검토 후 결과가 표시됩니다."}
          </div>
        )}
      </div>
    </div>
  );
}

function opportunityResultStateCopy(state) {
  if (state === "loading") return "수임 현황을 불러오는 중입니다.";
  if (state === "denied") return "수임 현황을 볼 권한이 없습니다.";
  if (state === "review_required") return "수임 현황을 보려면 추가 확인이 필요합니다.";
  if (state === "partial") return "일부 수임 현황을 불러오지 못했습니다. 확인 가능한 항목만 표시합니다.";
  if (state === "error") return "수임 현황을 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
  return "표시할 수임 현황이 없습니다.";
}

function ClientOpportunityTabs({ model, onTabChange }) {
  return (
    <div className="client-opportunity-tabs" role="tablist" aria-label="수임 현황 상태">
      {model.statusTabs.map((tab) => (
        <button
          key={tab.code}
          type="button"
          role="tab"
          aria-selected={model.activeStatusTab === tab.code}
          className={model.activeStatusTab === tab.code ? "active" : ""}
          onClick={() => onTabChange(tab.code)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ClientOpportunityDetail({ opportunity, rawOpportunity, pending, result, onClose, onHandoff }) {
  const detailRef = useRef(null);
  const linked = opportunity?.intakeRequestLinked === true;
  const resultForOpportunity = result?.kind === "data"
    && result.opportunity?.opportunity_id === opportunity?.opportunityId
    ? result
    : null;
  const actionResultState = resultForOpportunity?.statusOutcome
    ?? resultForOpportunity?.outcome
    ?? resultForOpportunity?.uiState
    ?? result?.statusOutcome
    ?? result?.outcome
    ?? result?.uiState
    ?? (result?.kind === "error" ? "error" : null);
  const actionSucceeded = ["passed", "created", "idempotent_replay"].includes(actionResultState);
  const guardedResultApplies = result?.kind === "data"
    && ["denied", "review_required", "blocked", "error"].includes(actionResultState);
  const actionResultMessage = resultForOpportunity || guardedResultApplies || result?.kind === "error"
    ? actionResultState === "denied" || resultForOpportunity?.uiState === "denied"
      ? "상담 연결 권한이 없습니다. 담당자에게 권한을 요청하세요."
      : actionResultState === "review_required" || resultForOpportunity?.uiState === "review_required"
        ? "상담 연결 전에 담당자 확인이 필요합니다."
        : actionResultState === "blocked"
          ? "상담 연결이 차단되었습니다. 이해상충 또는 수임 검토 결과를 확인하세요."
        : actionResultState === "error" || resultForOpportunity?.uiState === "error"
          ? "상담 연결 결과를 확인하지 못했습니다. 잠시 후 다시 시도하세요."
          : actionSucceeded
            ? "상담 연결이 완료되었습니다. 목록을 최신 상태로 갱신했습니다."
            : null
    : result?.kind === "error"
      ? "상담 연결 결과를 확인하지 못했습니다. 잠시 후 다시 시도하세요."
      : null;
  const actionResultTone = actionSucceeded ? "success" : actionResultMessage ? "error" : "";
  useEffect(() => {
    if (!actionSucceeded || typeof window === "undefined") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const closeButton = detailRef.current?.querySelector('button[aria-label="수임 현황 상세 닫기"]');
      if (closeButton && document.activeElement !== closeButton) closeButton.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [actionSucceeded, opportunity?.opportunityId]);
  if (!opportunity) return null;
  return (
    <section
      ref={detailRef}
      className="client-opportunity-detail"
      data-client-opportunity-detail="true"
      aria-labelledby="client-opportunity-detail-heading"
    >
      <div className="client-opportunity-detail-header">
        <div>
          <span className="client-opportunity-detail-kicker">선택한 수임 건</span>
          <h2 id="client-opportunity-detail-heading">{opportunity.displayName}</h2>
        </div>
        <button type="button" className="record-overlay-close" aria-label="수임 현황 상세 닫기" autoFocus onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <div className="client-opportunity-detail-facts">
        <span><b>현재 상태</b>{clientOpportunityStatusLabel(opportunity)}</span>
        <span><b>요청 범위</b>{opportunity.requestedScopeSummary || "범위 미지정"}</span>
        <span><b>상담 연결</b>{linked ? "연결됨" : "연결 전"}</span>
        <span><b>수임 결정</b>{opportunity.engagementDecision === "accepted" ? "수임 확정" : opportunity.engagementDecision === "declined" ? "수임하지 않음" : "검토 중"}</span>
      </div>
      <div className="client-opportunity-detail-actions">
        <div>
          <strong>{linked ? "상담 기록과 연결됨" : "상담 연결이 필요합니다"}</strong>
          <span>{linked ? "상담 일정과 후속 검토는 상담 메뉴에서 이어서 진행합니다." : "선택한 건만 상담으로 연결할 수 있습니다."}</span>
        </div>
        <button
          type="button"
          className="secondary-button"
          data-client-opportunity-handoff="true"
          disabled={!rawOpportunity?.opportunity_id || linked || pending}
          onClick={onHandoff}
        >
          <ArrowRight size={15} />
          {linked ? "상담 연결됨" : pending ? "상담 연결 중" : "상담으로 연결"}
        </button>
      </div>
      {pending ? <div className="client-opportunity-action-state" role="status">상담으로 연결 중입니다.</div> : null}
      {actionResultMessage ? (
        <div className={`client-opportunity-action-state ${actionResultTone}`} role="status">{actionResultMessage}</div>
      ) : null}
    </section>
  );
}

function OpportunitiesTable({
  result,
  model,
  selectedRawOpportunity,
  pending,
  handoffResult,
  onTabChange,
  onSearchChange,
  onSelectOpportunity,
  onCloseOpportunity,
  onHandoff
}) {
  const state = model.state;
  if (["loading", "denied", "review_required", "error"].includes(state)) {
    const tone = state === "denied" ? "live-data-denied" : state === "review_required" ? "live-data-review" : state === "error" ? "live-data-error" : "live-data-loading";
    return (
      <div className={`client-opportunity-state live-data-state ${tone}`} role="status" data-client-opportunity-state={state}>
        <strong>{opportunityResultStateCopy(state)}</strong>
      </div>
    );
  }
  const isEmpty = state === "empty" || model.opportunities.length === 0;
  const hasSearchOrTabNoMatch = model.opportunities.length === 0 && resultItems(result).length > 0;
  return (
    <div className="client-opportunity-surface" data-client-opportunity-surface="true">
      <div className="client-opportunity-toolbar">
        <div>
          <strong>문의부터 수임 결정까지 한눈에 확인합니다.</strong>
          <span>고객명이나 요청 범위로 찾고, 선택한 건만 상담으로 연결하세요.</span>
        </div>
        <label className="client-opportunity-search">
          <span>고객·요청 범위 검색</span>
          <input
            type="search"
            value={model.searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="고객명 또는 요청 범위"
            aria-label="고객·요청 범위 검색"
          />
        </label>
      </div>
      <ClientOpportunityTabs model={model} onTabChange={onTabChange} />
      {state === "partial" ? (
        <div className="client-opportunity-boundary-note" role="status">{opportunityResultStateCopy(state)}</div>
      ) : null}
      {isEmpty ? (
        <div className="client-opportunity-state live-data-state live-data-empty" role="status" data-client-opportunity-state="empty">
          <strong>{hasSearchOrTabNoMatch ? "조건에 맞는 수임 건이 없습니다." : opportunityResultStateCopy("empty")}</strong>
        </div>
      ) : (
        <div className="client-opportunity-list" role="list" aria-label="수임 현황 목록">
          {model.opportunities.map((opportunity) => {
            const selected = opportunity.opportunityId === model.selectedOpportunityId;
            return (
              <div className={selected ? "client-opportunity-row selected" : "client-opportunity-row"} role="listitem" key={opportunity.opportunityId}>
                <button
                  type="button"
                  className="client-opportunity-row-button"
                  data-client-opportunity-row="true"
                  aria-pressed={selected}
                  aria-label={`${opportunity.displayName} 선택`}
                  onClick={() => onSelectOpportunity(opportunity.opportunityId)}
                >
                  <span className="client-opportunity-row-heading">
                    <strong>{opportunity.displayName}</strong>
                    <span>{opportunity.requestedScopeSummary || "요청 범위 미지정"}</span>
                  </span>
                  <span className="client-opportunity-row-meta">
                    <b>{clientOpportunityStatusLabel(opportunity)}</b>
                    <span>{opportunity.intakeRequestLinked ? "상담 연결됨" : "상담 연결 전"}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <ClientOpportunityDetail
        opportunity={model.selectedOpportunity}
        rawOpportunity={selectedRawOpportunity}
        pending={pending}
        result={handoffResult}
        onClose={onCloseOpportunity}
        onHandoff={onHandoff}
      />
    </div>
  );
}

export function ClientIntakePipelineSurface({
  result,
  auditResult,
  activeIntake,
  createResult,
  conflictResult,
  decisionResult,
  waiverResult,
  engagementResult,
  clearanceResult,
  matterOpeningResult,
  conflictPending,
  createPending,
  decisionPending,
  waiverPending,
  engagementPending,
  clearancePending,
  matterOpeningPending,
  onCreateIntake,
  onConflictCheck,
  onConflictDecision,
  onWaiverApprove,
  onEngagementApprove,
  onClearance,
  onMatterOpening
}) {
  const state =
    result === null ||
    result?.kind === "error" ||
    result?.uiState === "denied" ||
    result?.uiState === "review_required" ||
    result?.outcome === "review_required"
      ? renderLiveState(result, "인테이크")
      : null;
  if (state) return state;
  const intakes = resultItems(result);
  const selectedIntake = activeIntake ?? intakes[0] ?? null;
  const intakeRows = selectedIntake
    ? [selectedIntake, ...intakes.filter((item) => item.intake_request_id !== selectedIntake.intake_request_id)]
    : intakes;
  const auditCount = resultItems(auditResult).length;
  return (
    <div className="clients-live-stack intake-completion-surface" data-upl-c08-intake-completion-surface="true">
      <div
        className="record-action-strip"
        data-upl-c08-new-inquiry-intake="true"
        data-upl-c08-intake-pipeline="consultation-conflict-opening"
      >
        <div>
          <strong>신규 의뢰 접수</strong>
          <span>상담에서 인테이크로 넘긴 뒤 이해상충 검토와 Matter 개설까지 같은 흐름에서 처리합니다.</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="신규 의뢰를 인테이크로 접수 중입니다."
            successText="신규 의뢰가 인테이크로 접수되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateIntake}>
          <Plus size={15} />
          의뢰 접수
        </button>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-upl-c08-intake-handoff-result="true">
          <ShieldCheck size={15} />
          <span>신규 의뢰가 인테이크 요청으로 연결되었습니다.</span>
        </div>
      )}
      <IntakeActionPanel
        intakeRequest={selectedIntake}
        auditCount={auditCount}
        conflictResult={conflictResult}
        decisionResult={decisionResult}
        waiverResult={waiverResult}
        engagementResult={engagementResult}
        clearanceResult={clearanceResult}
        matterOpeningResult={matterOpeningResult}
        conflictPending={conflictPending}
        decisionPending={decisionPending}
        waiverPending={waiverPending}
        engagementPending={engagementPending}
        clearancePending={clearancePending}
        matterOpeningPending={matterOpeningPending}
        onConflictCheck={onConflictCheck}
        onConflictDecision={onConflictDecision}
        onWaiverApprove={onWaiverApprove}
        onEngagementApprove={onEngagementApprove}
        onClearance={onClearance}
        onMatterOpening={onMatterOpening}
      />
      <DataTable
        columns={["인테이크", "상태", "Pipeline", "범위"]}
        rows={intakeRows.map((item, index) => [
          `인테이크 ${index + 1}`,
          pipelineStatus(item.status),
          linkedLabel(item.opportunity_id),
          businessLabel(item.requested_scope_summary, "범위 미지정")
        ])}
      />
    </div>
  );
}

export function ClientsSurface({
  labels,
  liveCtx = "allow",
  activeSection = "",
  refreshSignal = 0,
  onNavigate = () => {},
  redirectedFrom = null,
  requestedClientId = "",
  requestedClientTab = "",
  requestedInquiryId = "",
  requestedOpportunityId = "",
  requestedOpportunityQuery = "",
  requestedConsultationId = "",
  requestedConsultationQuery = "",
  requestedClientRevision = 0
}) {
  const [clientsResult, setClientsResult] = useState(null);
  const [
    clientOperationsDetailResult,
    setClientOperationsDetailResult
  ] = useState(null);
  const [accountsResult, setAccountsResult] = useState(null);
  const [contactsResult, setContactsResult] = useState(null);
  const [accountContactsResult, setAccountContactsResult] = useState(null);
  const [mergeProposalsResult, setMergeProposalsResult] = useState(null);
  const [activitiesResult, setActivitiesResult] = useState(null);
  const [proposalsResult, setProposalsResult] = useState(null);
  const [clientSettingsResult, setClientSettingsResult] = useState(null);
  const [
    clientOperationsDashboardResult,
    setClientOperationsDashboardResult
  ] = useState(null);
  const [inquiriesResult, setInquiriesResult] = useState(null);
  const [inquiryDetailResult, setInquiryDetailResult] = useState(null);
  const [commandInquiryDetailResult, setCommandInquiryDetailResult] = useState(null);
  const [opportunitiesResult, setOpportunitiesResult] = useState(null);
  const [intakeResult, setIntakeResult] = useState(null);
  const [intakeAuditResult, setIntakeAuditResult] = useState(null);
  const [intakeCreateResult, setIntakeCreateResult] = useState(null);
  const [handoffResult, setHandoffResult] = useState(null);
  const [conflictResult, setConflictResult] = useState(null);
  const [decisionResult, setDecisionResult] = useState(null);
  const [waiverResult, setWaiverResult] = useState(null);
  const [engagementResult, setEngagementResult] = useState(null);
  const [clearanceResult, setClearanceResult] = useState(null);
  const [matterOpeningResult, setMatterOpeningResult] = useState(null);
  const [accountCreateResult, setAccountCreateResult] = useState(null);
  const [contactCreateResult, setContactCreateResult] = useState(null);
  const [mergeCreateResult, setMergeCreateResult] = useState(null);
  const [mergeExecuteResult, setMergeExecuteResult] = useState(null);
  const [activityCreateResult, setActivityCreateResult] = useState(null);
  const [consultationScheduleResult, setConsultationScheduleResult] = useState(null);
  const [consultationRescheduleResult, setConsultationRescheduleResult] = useState(null);
  const [consultationOutlookResult, setConsultationOutlookResult] = useState(null);
  const [consultationCompleteResult, setConsultationCompleteResult] = useState(null);
  const [clientEngagementDecisionResult, setClientEngagementDecisionResult] = useState(null);
  const [clientEngagementRepairResult, setClientEngagementRepairResult] = useState(null);
  const [proposalCreateResult, setProposalCreateResult] = useState(null);
  const [proposalPatchResult, setProposalPatchResult] = useState(null);
  const [clientSettingPatchResult, setClientSettingPatchResult] = useState(null);
  const [accountPatchResult, setAccountPatchResult] = useState(null);
  const [contactPatchResult, setContactPatchResult] = useState(null);
  const [clientRecordActionFieldsResult, setClientRecordActionFieldsResult] = useState(null);
  const [clientRecordActionAuditResult, setClientRecordActionAuditResult] = useState(null);
  const [clientRecordActionUpdateResult, setClientRecordActionUpdateResult] = useState(null);
  const [clientRecordActionOwnerResult, setClientRecordActionOwnerResult] = useState(null);
  const [accountRecordActionResult, setAccountRecordActionResult] = useState(null);
  const [contactRecordActionResult, setContactRecordActionResult] = useState(null);
  const [legalPeopleClientResult, setLegalPeopleClientResult] = useState(null);
  const [clientRecordEditValue, setClientRecordEditValue] = useState("");
  const [intakeCreatePending, setIntakeCreatePending] = useState(false);
  const [handoffPending, setHandoffPending] = useState(false);
  const [conflictPending, setConflictPending] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);
  const [waiverPending, setWaiverPending] = useState(false);
  const [engagementPending, setEngagementPending] = useState(false);
  const [clearancePending, setClearancePending] = useState(false);
  const [matterOpeningPending, setMatterOpeningPending] = useState(false);
  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [contactCreatePending, setContactCreatePending] = useState(false);
  const [mergeCreatePending, setMergeCreatePending] = useState(false);
  const [mergeExecutePending, setMergeExecutePending] = useState(false);
  const [activityCreatePending, setActivityCreatePending] = useState(false);
  const [consultationSchedulePending, setConsultationSchedulePending] = useState(false);
  const [consultationReschedulePending, setConsultationReschedulePending] = useState(false);
  const [consultationOutlookPending, setConsultationOutlookPending] = useState(false);
  const [consultationCompletePending, setConsultationCompletePending] = useState(false);
  const [clientEngagementDecisionPending, setClientEngagementDecisionPending] = useState(false);
  const [clientEngagementRepairPending, setClientEngagementRepairPending] = useState(false);
  const [proposalCreatePending, setProposalCreatePending] = useState(false);
  const [proposalPatchPending, setProposalPatchPending] = useState(false);
  const [clientSettingPatchPending, setClientSettingPatchPending] = useState(false);
  const [accountPatchPending, setAccountPatchPending] = useState(false);
  const [contactPatchPending, setContactPatchPending] = useState(false);
  const [clientRecordActionPending, setClientRecordActionPending] = useState(false);
  const [clientRecordActionOwnerPending, setClientRecordActionOwnerPending] = useState(false);
  const [accountRecordActionPending, setAccountRecordActionPending] = useState(false);
  const [contactRecordActionPending, setContactRecordActionPending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshSignalRef = useRef(refreshSignal);
  const inquiryTriggerRef = useRef(null);
  const opportunityTriggerRef = useRef(null);
  const opportunitySelectionRef = useRef("");
  const handoffRequestRef = useRef(0);
  const consultationSelectionRef = useRef("");
  const consultationRequestRef = useRef(0);
  const consultationTriggerRef = useRef(null);
  const commandKeyRef = useRef(new Map());
  const commandTimestampRef = useRef(new Map());
  const currentSection = CLIENT_SECTIONS.has(activeSection) ? activeSection : "clients-home";
  const normalizedRequestedClientId = String(
    requestedClientId ?? ""
  ).trim();
  const relatedFinanceKind = normalizedRequestedClientId
    ? currentSection === "client-sales-history"
      ? "deposit_revenue"
      : currentSection === "client-billing"
        ? "receivables"
        : null
    : null;
  const disabledRouteDisposition = redirectedFrom?.view === "clients"
    && ["disabled", "not_found"].includes(redirectedFrom?.disposition)
    ? redirectedFrom.disposition
    : null;

  useEffect(() => {
    if (refreshSignalRef.current === refreshSignal) return;
    refreshSignalRef.current = refreshSignal;
    setRefreshToken((value) => value + 1);
  }, [refreshSignal]);

  useEffect(() => {
    if (currentSection !== "clients-home") {
      setClientOperationsDashboardResult(null);
      return undefined;
    }
    let cancelled = false;
    const guardedResult = guardedResultForContext(liveCtx);
    if (guardedResult) {
      setClientOperationsDashboardResult(guardedResult);
      return () => {
        cancelled = true;
      };
    }
    setClientOperationsDashboardResult(null);
    fetchAnalyticsClientOperationsDashboard({
      ctx: liveCtx
    }).then((result) => {
      if (!cancelled) {
        setClientOperationsDashboardResult(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentSection, liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setClientsResult(null);
    if (currentSection === "client-billing") {
      return () => {
        cancelled = true;
      };
    }
    const guardedResult = guardedResultForContext(liveCtx);
    if (guardedResult) {
      setClientsResult(guardedResult);
      return () => {
        cancelled = true;
      };
    }
    fetchAnalyticsClientDirectory({
      ctx: liveCtx
    }).then((result) => {
      if (!cancelled) setClientsResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSection, liveCtx, refreshToken]);

  useEffect(() => {
    const activitySection = currentSection === "client-consultation-proposals" || currentSection === "client-activities";
    if (!activitySection) {
      setActivitiesResult(null);
      return undefined;
    }
    let cancelled = false;
    const guardedResult = guardedResultForContext(liveCtx);
    setActivitiesResult(null);
    if (guardedResult) {
      setActivitiesResult(guardedResult);
      return () => { cancelled = true; };
    }
    fetchCrmClientActivities({ ctx: liveCtx }).then((result) => {
      if (!cancelled) setActivitiesResult(result);
    });
    return () => { cancelled = true; };
  }, [currentSection, liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setLegalPeopleClientResult(null);
    fetchLegalPeopleSearch({ client_id: "client_lcx_001", ctx: liveCtx }).then((next) => {
      if (!cancelled) setLegalPeopleClientResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setInquiriesResult(null);
    setInquiryDetailResult(null);
    setCommandInquiryDetailResult(null);
    setOpportunitiesResult(null);
    setIntakeResult(null);
    setIntakeAuditResult(null);
    setAccountsResult(null);
    setContactsResult(null);
    setAccountContactsResult(null);
    setMergeProposalsResult(null);
    setActivitiesResult(null);
    setProposalsResult(null);
    setClientSettingsResult(null);
    setAccountCreateResult(null);
    setContactCreateResult(null);
    setMergeCreateResult(null);
    setMergeExecuteResult(null);
    setActivityCreateResult(null);
    setConsultationScheduleResult(null);
    setConsultationRescheduleResult(null);
    setConsultationOutlookResult(null);
    setConsultationCompleteResult(null);
    setClientEngagementDecisionResult(null);
    setClientEngagementRepairResult(null);
    setProposalCreateResult(null);
    setProposalPatchResult(null);
    setClientSettingPatchResult(null);
    setAccountPatchResult(null);
    setContactPatchResult(null);
    setIntakeCreateResult(null);
    setAccountRecordActionResult(null);
    setContactRecordActionResult(null);
    if (currentSection === "client-billing") {
      return () => {
        cancelled = true;
      };
    }
    const guardedResult = guardedResultForContext(liveCtx);
    if (guardedResult) {
      setInquiriesResult(guardedResult);
      setOpportunitiesResult(guardedResult);
      setIntakeResult(guardedResult);
      setIntakeAuditResult(guardedResult);
      setAccountsResult(guardedResult);
      setContactsResult(guardedResult);
      setAccountContactsResult(guardedResult);
      setMergeProposalsResult(guardedResult);
      setActivitiesResult(guardedResult);
      setProposalsResult(guardedResult);
      setClientSettingsResult(guardedResult);
      return () => {
        cancelled = true;
      };
    }
    Promise.all([
      fetchCrmInquiries({ ctx: liveCtx }),
      fetchCrmOpportunities({ ctx: liveCtx }),
      fetchIntakeRequests({ ctx: liveCtx }),
      fetchIntakeAudit({ ctx: liveCtx }),
      fetchCrmAccounts({ ctx: liveCtx }),
      fetchCrmContacts({ ctx: liveCtx }),
      fetchCrmMergeProposals({ ctx: liveCtx }),
      fetchCrmProposals({ ctx: liveCtx }),
      fetchCrmClientSettings({ ctx: liveCtx })
    ]).then(async ([
      inquiries,
      opportunities,
      intake,
      audit,
      accounts,
      contacts,
      mergeProposals,
      proposals,
      clientSettings
    ]) => {
      if (cancelled) return;
      setInquiriesResult(inquiries);
      setOpportunitiesResult(opportunities);
      setIntakeResult(intake);
      setIntakeAuditResult(audit);
      setAccountsResult(accounts);
      setContactsResult(contacts);
      setMergeProposalsResult(mergeProposals);
      setProposalsResult(proposals);
      setClientSettingsResult(clientSettings);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSection, liveCtx, refreshToken]);

  const clients = useMemo(() => resultItems(clientsResult), [clientsResult]);
  const activeRequestedClientId = currentSection === "clients-list"
    ? normalizedRequestedClientId
    : "";
  const authorizedRequestedClientId = clients.some((client) => (
    clientRecordId(client) === activeRequestedClientId
  ))
    ? activeRequestedClientId
    : "";
  const normalizedRequestedInquiryId = String(requestedInquiryId ?? "").trim();
  const activeRequestedInquiryId = currentSection === "client-leads"
    ? normalizedRequestedInquiryId
    : "";
  const authorizedRequestedInquiryId = resultItems(inquiriesResult).some((inquiry) => (
    inquiry?.lead_id === activeRequestedInquiryId
    || inquiry?.inquiryId === activeRequestedInquiryId
  ))
    ? activeRequestedInquiryId
    : "";
  const normalizedRequestedCommandInquiryId = String(requestedInquiryId ?? "").trim();
  const commandInquirySection = currentSection === "client-consultation-proposals" || currentSection === "client-activities";
  const activeCommandInquiryId = commandInquirySection ? normalizedRequestedCommandInquiryId : "";
  const authorizedCommandInquiryId = resultItems(inquiriesResult).some((inquiry) => (
    inquiry?.lead_id === activeCommandInquiryId
    || inquiry?.inquiryId === activeCommandInquiryId
  ))
    ? activeCommandInquiryId
    : "";

  useEffect(() => {
    let cancelled = false;
    setClientOperationsDetailResult(null);
    if (!authorizedRequestedClientId) {
      return () => {
        cancelled = true;
      };
    }
    fetchAnalyticsClientOperationsDetail({
      clientId: authorizedRequestedClientId,
      ctx: liveCtx
    }).then((result) => {
      if (!cancelled) setClientOperationsDetailResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [
    authorizedRequestedClientId,
    liveCtx,
    refreshToken,
    requestedClientRevision
  ]);

  useEffect(() => {
    let cancelled = false;
    setInquiryDetailResult(null);
    if (!authorizedRequestedInquiryId) {
      return () => {
        cancelled = true;
      };
    }
    fetchCrmInquiryDetail({
      inquiryId: authorizedRequestedInquiryId,
      ctx: liveCtx
    }).then((result) => {
      if (!cancelled) setInquiryDetailResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [
    authorizedRequestedInquiryId,
    liveCtx,
    refreshToken,
    requestedClientRevision
  ]);

  useEffect(() => {
    let cancelled = false;
    setCommandInquiryDetailResult(null);
    if (!authorizedCommandInquiryId) {
      return () => { cancelled = true; };
    }
    fetchCrmInquiryDetail({ inquiryId: authorizedCommandInquiryId, ctx: liveCtx }).then((result) => {
      if (!cancelled) setCommandInquiryDetailResult(result);
    });
    return () => { cancelled = true; };
  }, [authorizedCommandInquiryId, commandInquirySection, liveCtx, refreshToken, requestedClientRevision]);

  const clientDirectoryModel = useMemo(() => buildClientDirectoryModel({
    clientsResult,
    operationsResult: clientOperationsDetailResult,
    requestedRecordId: activeRequestedClientId,
    requestedTab: requestedClientTab,
  }), [
    activeRequestedClientId,
    clientOperationsDetailResult,
    clientsResult,
    requestedClientRevision,
    requestedClientTab
  ]);
  const clientInquiryModel = useMemo(() => buildClientInquiryModel({
    inquiriesResult,
    detailResult: inquiryDetailResult,
    requestedInquiryId: activeRequestedInquiryId
  }), [
    activeRequestedInquiryId,
    inquiriesResult,
    inquiryDetailResult,
    requestedClientRevision
  ]);
  const normalizedRequestedOpportunityId = String(requestedOpportunityId ?? "").trim();
  const activeRequestedOpportunityId = currentSection === "client-opportunities"
    ? normalizedRequestedOpportunityId
    : "";
  const clientOpportunityModel = useMemo(() => buildClientOpportunityModel({
    opportunitiesResult,
    requestedOpportunityId: activeRequestedOpportunityId,
    statusTab: requestedClientTab,
    searchQuery: requestedOpportunityQuery
  }), [
    activeRequestedOpportunityId,
    opportunitiesResult,
    requestedClientRevision,
    requestedClientTab,
    requestedOpportunityQuery
  ]);
  const normalizedRequestedConsultationId = String(requestedConsultationId ?? "").trim();
  const activeRequestedConsultationId = currentSection === "client-consultation-proposals"
    ? normalizedRequestedConsultationId
    : "";
  const normalizedRequestedConsultationQuery = String(requestedConsultationQuery ?? "");
  const activeRequestedConsultationQuery = currentSection === "client-consultation-proposals"
    ? normalizedRequestedConsultationQuery
    : "";
  const clientConsultationModel = useMemo(() => buildClientConsultationModel({
    consultationsResult: activitiesResult,
    requestedConsultationId: activeRequestedConsultationId,
    statusTab: requestedClientTab,
    searchQuery: activeRequestedConsultationQuery
  }), [
    activeRequestedConsultationId,
    activeRequestedConsultationQuery,
    activitiesResult,
    requestedClientRevision,
    requestedClientTab
  ]);
  const relatedFinanceClient = relatedFinanceKind
    ? clients.find((client) => (
      clientRecordId(client) === normalizedRequestedClientId
    )) ?? null
    : null;
  const selectedClient = clientDirectoryModel.selectedClient;
  const selectedClientId = clientRecordId(selectedClient);
  const opportunities = resultItems(opportunitiesResult);
  const intakes = resultItems(intakeResult);
  const selectedOpportunity = clientOpportunityModel.selectedOpportunityId
    ? opportunities.find((item) => item?.opportunity_id === clientOpportunityModel.selectedOpportunityId) ?? null
    : null;
  const selectedIntake = intakes[0] ?? null;
  const selectedAccount = resultItems(accountsResult)[0] ?? null;
  const activeOpportunity =
    (handoffResult?.kind === "data" && handoffResult.opportunity?.opportunity_id ? handoffResult.opportunity : null) ??
    (intakeCreateResult?.kind === "data" && intakeCreateResult.opportunity?.opportunity_id ? intakeCreateResult.opportunity : null) ??
    selectedOpportunity;
  const activeIntake =
    (handoffResult?.kind === "data" && handoffResult.item?.intake_request_id ? handoffResult.item : null) ??
    selectedIntake;
  const selectedClientPartyId = selectedClient?.primary_party_id ?? selectedClient?.primary_entity_id ?? selectedAccount?.party_id ?? activeOpportunity?.party_id ?? "party_cmp_g6_client_001";
  const clientGuardedState =
    liveCtx === "denied" ||
    liveCtx === "review" ||
    clientsResult?.uiState === "denied" ||
    clientsResult?.uiState === "review_required" ||
    clientsResult?.outcome === "review_required";

  useEffect(() => {
    setClientRecordEditValue(selectedClient?.display_name ?? "");
  }, [selectedClientId, selectedClient?.display_name]);

  useEffect(() => {
    if (!selectedClient) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onNavigate("clients", "clients-list", {
          recordId: "",
          tab: ""
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNavigate, selectedClient]);

  useEffect(() => {
    let cancelled = false;
    setAccountContactsResult(null);
    if (accountsResult === null) {
      return () => {
        cancelled = true;
      };
    }
    if (accountsResult.kind !== "data") {
      setAccountContactsResult(accountsResult);
      return () => {
        cancelled = true;
      };
    }
    const accountId = String(
      selectedAccount?.account_id
        ?? selectedAccount?.resource_id
        ?? ""
    ).trim();
    if (!accountId) {
      setAccountContactsResult({
        kind: "data",
        outcome: "passed",
        uiState: "empty",
        items: [],
        safeErrorCodes: [],
        countLeakPrevented: true,
        productionReadyClaim: false
      });
      return () => {
        cancelled = true;
      };
    }
    fetchCrmAccountContacts({
      accountId,
      ctx: liveCtx
    }).then((result) => {
      if (!cancelled) setAccountContactsResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [
    accountsResult,
    liveCtx,
    refreshToken,
    selectedAccount?.account_id,
    selectedAccount?.resource_id
  ]);

  useEffect(() => {
    let cancelled = false;
    setClientRecordActionFieldsResult(null);
    setClientRecordActionAuditResult(null);
    setClientRecordActionUpdateResult(null);
    setClientRecordActionOwnerResult(null);
    if (clientGuardedState || !selectedClientId) {
      return () => {
        cancelled = true;
      };
    }
    Promise.all([
      fetchRecordActionFields({ objectName: "client", ctx: liveCtx }),
      fetchRecordActionAudit({ objectName: "client", recordId: selectedClientId, ctx: liveCtx })
    ]).then(([fields, audit]) => {
      if (cancelled) return;
      setClientRecordActionFieldsResult(fields);
      setClientRecordActionAuditResult(audit);
    });
    return () => {
      cancelled = true;
    };
  }, [clientGuardedState, liveCtx, refreshToken, selectedClientId]);

  function resetIntakePipelineResults() {
    setConflictResult(null);
    setDecisionResult(null);
    setWaiverResult(null);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
  }

  async function handleCreateIntakePipeline() {
    const requestedScopeSummary = "신규 의뢰 수임 검토";
    setIntakeCreatePending(true);
    setIntakeCreateResult(null);
    setHandoffResult(null);
    resetIntakePipelineResults();
    const createdOpportunity = await createCrmOpportunity({
      partyId: selectedClientPartyId,
      displayName: "신규 의뢰",
      requestedScopeSummary,
      ctx: liveCtx
    });
    if (createdOpportunity.kind !== "data" || !createdOpportunity.item?.opportunity_id) {
      setIntakeCreateResult(createdOpportunity);
      setIntakeCreatePending(false);
      return;
    }
    setOpportunitiesResult((current) => upsertResultItem(current, createdOpportunity.item, "opportunity_id"));
    const next = await handoffCrmOpportunityToIntake({
      opportunityId: createdOpportunity.item.opportunity_id,
      requestedScopeSummary,
      ctx: liveCtx
    });
    setHandoffResult(next);
    setIntakeCreateResult(
      next.kind === "data"
        ? { ...next, opportunity: next.opportunity ?? createdOpportunity.item }
        : next
    );
    setIntakeCreatePending(false);
    if (next.kind === "data") {
      setOpportunitiesResult((current) => upsertResultItem(current, next.opportunity ?? createdOpportunity.item, "opportunity_id"));
      setIntakeResult((current) => upsertResultItem(current, next.item, "intake_request_id"));
    }
  }

  async function handleConflictCheck() {
    if (!activeIntake?.intake_request_id) return;
    setDecisionResult(null);
    setWaiverResult(null);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setConflictPending(true);
    const next = await createIntakeConflictCheck({ intakeRequest: activeIntake, ctx: liveCtx });
    setConflictResult(next);
    setConflictPending(false);
    if (next.kind === "data") setRefreshToken((value) => value + 1);
  }

  async function handleConflictDecision() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    const conflictHits = conflictResult?.kind === "data" ? conflictResult.conflictHits : [];
    if (!conflictCheck?.conflict_check_id) return;
    setDecisionPending(true);
    const next = await recordIntakeConflictDecision({ conflictCheck, conflictHits, decision: "clear", ctx: liveCtx });
    setDecisionResult(next);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setDecisionPending(false);
    if (next.kind === "data") setConflictResult((current) => current?.kind === "data" ? { ...current, item: next.conflictCheck ?? current.item, conflictHits: next.conflictHits ?? current.conflictHits } : current);
  }

  async function handleWaiverApprove() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    const conflictHits = conflictResult?.kind === "data" ? conflictResult.conflictHits : [];
    if (!activeIntake?.intake_request_id || !conflictCheck?.conflict_check_id) return;
    setWaiverPending(true);
    const next = await approveIntakeConflictWaiver({ intakeRequest: activeIntake, conflictCheck, conflictHits, ctx: liveCtx });
    setWaiverResult(next);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setWaiverPending(false);
    if (next.kind === "data") setConflictResult((current) => current?.kind === "data" ? { ...current, item: next.conflictCheck ?? current.item } : current);
  }

  async function handleEngagementApprove() {
    if (!activeIntake?.intake_request_id) return;
    setEngagementPending(true);
    const next = await approveIntakeEngagement({ intakeRequest: activeIntake, ctx: liveCtx });
    setEngagementResult(next);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setEngagementPending(false);
  }

  async function handleClearance() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    const engagement = engagementResult?.kind === "data" ? engagementResult.engagement ?? engagementResult.item : null;
    if (!activeIntake?.intake_request_id || !conflictCheck?.snapshot_hash) return;
    setClearancePending(true);
    const next = await issueIntakeClearanceToken({ intakeRequest: activeIntake, conflictCheck, engagement, ctx: liveCtx });
    setClearanceResult(next);
    setMatterOpeningResult(null);
    setClearancePending(false);
    if (next.kind === "data") setRefreshToken((value) => value + 1);
  }

  async function handleMatterOpening() {
    const clearanceToken = clearanceResult?.kind === "data" && clearanceResult.validation?.valid ? clearanceResult.item : null;
    if (!activeIntake?.intake_request_id || !clearanceToken?.clearance_token_id) return;
    setMatterOpeningPending(true);
    const next = await openMatterFromIntakeClearance({
      intakeRequest: activeIntake,
      clearanceToken,
      clientPartyId: selectedClientPartyId,
      title: businessLabel(activeIntake.requested_scope_summary, "인테이크 Matter"),
      ctx: liveCtx
    });
    setMatterOpeningResult(next);
    setMatterOpeningPending(false);
  }

  async function handleCreateAccount() {
    setAccountCreatePending(true);
    const next = await createCrmAccount({ displayName: "신규 Client", ctx: liveCtx });
    setAccountCreateResult(next);
    setAccountCreatePending(false);
    if (next.kind === "data" && next.item) {
      setAccountsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.account_id !== next.item.account_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
    }
  }

  async function handleCreateContact() {
    const accountId = resultItems(accountsResult)[0]?.account_id ?? null;
    setContactCreatePending(true);
    const next = await createCrmContact({ displayName: "신규 담당자", accountId, ctx: liveCtx });
    setContactCreateResult(next);
    setContactCreatePending(false);
    if (next.kind === "data" && next.item) {
      setContactsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.contact_id !== next.item.contact_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
      if (next.item.account_id) {
        setAccountContactsResult((current) => {
          const currentItems = resultItems(current).filter((item) => item.contact_id !== next.item.contact_id);
          return {
            ...(current?.kind === "data" ? current : {}),
            kind: "data",
            outcome: current?.outcome ?? "passed",
            items: [
              {
                relationship_id: `crm_runtime_relationship:${next.item.account_id}:${next.item.contact_id}`,
                account_id: next.item.account_id,
                contact_id: next.item.contact_id,
                relationship_type: "crm_runtime_contact",
                status: next.item.status,
                contact_display_name: next.item.display_name,
                primary_contact_type: next.item.primary_contact_type ?? null,
                contact_point_value: next.item.contact_point_value ?? null,
                contact_point_value_included: next.item.contact_point_value_included === true,
                production_ready_claim: false
              },
              ...currentItems
            ],
            safeErrorCodes: current?.safeErrorCodes ?? [],
            productionReadyClaim: false
          };
        });
      }
    }
  }

  async function handleCreateMergeProposal() {
    setMergeCreatePending(true);
    const next = await createCrmMergeProposal({ ctx: liveCtx });
    setMergeCreateResult(next);
    setMergeCreatePending(false);
    if (next.kind === "data" && next.item) {
      setMergeProposalsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.proposal_id !== next.item.proposal_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
    }
  }

  async function handleExecuteMergeProposal(proposal) {
    if (!proposal?.proposal_id || !proposal.executable) return;
    setMergeExecutePending(true);
    const next = await executeCrmMergeProposal({ proposalId: proposal.proposal_id, ctx: liveCtx });
    setMergeExecuteResult(next);
    setMergeExecutePending(false);
    if (next.kind === "data" && next.item) {
      setMergeProposalsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.proposal_id !== next.item.proposal_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
    }
  }

  async function handleCreateProposal() {
    setProposalCreatePending(true);
    const next = await createCrmProposal({
      opportunityId: selectedOpportunity?.opportunity_id ?? "opp_cmp_g6_synthetic_001",
      partyId: selectedClientPartyId,
      displayName: "Client 제안 초안",
      ctx: liveCtx
    });
    setProposalCreateResult(next);
    setProposalCreatePending(false);
    if (next.kind === "data" && next.item) {
      setProposalsResult((current) => upsertResultItem(current, next.item, "proposal_id"));
    }
  }

  async function handleProposalProviderCheck(proposal) {
    if (!proposal?.proposal_id) return;
    setProposalPatchPending(true);
    const next = await patchCrmProposal({
      proposalId: proposal.proposal_id,
      fieldUpdates: { e_sign_send_requested: true },
      ctx: liveCtx
    });
    setProposalPatchResult(next);
    setProposalPatchPending(false);
    if (next.kind === "data" && next.item) {
      setProposalsResult((current) => upsertResultItem(current, next.item, "proposal_id"));
    }
  }

  async function handlePatchClientSetting(policy) {
    if (!policy?.policy_id) return;
    setClientSettingPatchPending(true);
    const next = await patchCrmClientSetting({
      policyId: policy.policy_id,
      fieldUpdates: { duplicate_review_required: true },
      ctx: liveCtx
    });
    setClientSettingPatchResult(next);
    setClientSettingPatchPending(false);
    if (next.kind === "data" && next.item) {
      setClientSettingsResult((current) => upsertResultItem(current, next.item, "policy_id"));
    }
  }

  async function handlePatchAccount() {
    const account = resultItems(accountsResult).find((item) => item.account_source === "crm-runtime.Account");
    if (!account?.account_id) return;
    setAccountPatchPending(true);
    const next = await patchCrmAccount({
      accountId: account.account_id,
      fieldUpdates: { status: "review_required" },
      ctx: liveCtx
    });
    setAccountPatchResult(next);
    setAccountPatchPending(false);
    if (next.kind === "data" && next.item) {
      setAccountsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.account_id !== next.item.account_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
    }
  }

  async function handlePatchContact() {
    const contact = resultItems(contactsResult).find((item) => item.contact_source === "crm-runtime.Contact");
    if (!contact?.contact_id) return;
    setContactPatchPending(true);
    const next = await patchCrmContact({
      contactId: contact.contact_id,
      fieldUpdates: { status: "review_required" },
      ctx: liveCtx
    });
    setContactPatchResult(next);
    setContactPatchPending(false);
    if (next.kind === "data" && next.item) {
      setContactsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.contact_id !== next.item.contact_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
      if (next.item.account_id) {
        setAccountContactsResult((current) => ({
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: resultItems(current).map((item) =>
            item.contact_id === next.item.contact_id
              ? {
                  ...item,
                  status: next.item.status,
                  contact_display_name: next.item.display_name,
                  primary_contact_type: next.item.primary_contact_type ?? item.primary_contact_type,
                  contact_point_value: next.item.contact_point_value ?? item.contact_point_value,
                  contact_point_value_included: next.item.contact_point_value_included === true
                }
              : item,
          ),
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        }));
      }
    }
  }

  async function handleClientRecordActionFieldUpdate(event) {
    event?.preventDefault?.();
    if (!selectedClientId) return;
    const displayName = clientRecordEditValue.trim();
    if (!displayName) return;
    setClientRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "client",
      recordId: selectedClientId,
      fieldUpdates: { display_name: displayName },
      ctx: liveCtx
    });
    setClientRecordActionUpdateResult(next);
    setClientRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      setClientsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: resultItems(current).map((item) =>
          item.client_group_id === selectedClientId
            ? { ...item, display_name: next.item.display_label ?? item.display_name, status: next.item.status ?? item.status }
            : item,
        ),
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
      const audit = await fetchRecordActionAudit({ objectName: "client", recordId: selectedClientId, ctx: liveCtx });
      setClientRecordActionAuditResult(audit);
    }
  }

  async function handleClientOwnerBlockedAction() {
    if (!selectedClientId) return;
    setClientRecordActionOwnerPending(true);
    const next = await bulkUpdateRecordActions({
      objectName: "client",
      recordIds: [selectedClientId],
      actionType: "owner_change",
      ctx: liveCtx
    });
    setClientRecordActionOwnerResult(next);
    setClientRecordActionOwnerPending(false);
  }

  async function handleAccountRecordActionFieldUpdate() {
    const account = resultItems(accountsResult).find((item) => item.account_source === "crm-runtime.Account");
    if (!account?.account_id) return;
    setAccountRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "account",
      recordId: account.account_id,
      fieldUpdates: { display_name: "Client 작업 검토" },
      ctx: liveCtx
    });
    setAccountRecordActionResult(next);
    setAccountRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      setAccountsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: resultItems(current).map((item) =>
          item.account_id === account.account_id
            ? { ...item, display_name: next.item.display_label ?? item.display_name, status: next.item.status ?? item.status }
            : item,
        ),
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  async function handleContactRecordActionFieldUpdate() {
    const contact = resultItems(contactsResult).find((item) => item.contact_source === "crm-runtime.Contact");
    if (!contact?.contact_id) return;
    setContactRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "contact",
      recordId: contact.contact_id,
      fieldUpdates: { display_name: "담당자 작업 검토" },
      ctx: liveCtx
    });
    setContactRecordActionResult(next);
    setContactRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      setContactsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: resultItems(current).map((item) =>
          item.contact_id === contact.contact_id
            ? { ...item, display_name: next.item.display_label ?? item.display_name, status: next.item.status ?? item.status }
            : item,
        ),
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  function handleClientSelect(clientId) {
    if (!clientId) return;
    onNavigate("clients", "clients-list", {
      recordId: clientId,
      tab: "overview"
    });
  }

  function handleInquirySelect(inquiryId) {
    if (!inquiryId) return;
    const activeElement = document.activeElement;
    inquiryTriggerRef.current = activeElement && typeof activeElement.focus === "function"
      ? activeElement
      : null;
    onNavigate("clients", "client-leads", { inquiryId });
  }

  function handleInquiryDetailClose() {
    onNavigate("clients", "client-leads", { inquiryId: "" });
    const trigger = inquiryTriggerRef.current;
    inquiryTriggerRef.current = null;
    window.requestAnimationFrame(() => {
      if (trigger && document.contains(trigger)) trigger.focus();
    });
  }

  function handleInquiryDialogKeyDown(event) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    if (!activeRequestedInquiryId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleInquiryDetailClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeRequestedInquiryId]);

  useEffect(() => {
    opportunitySelectionRef.current = clientOpportunityModel.selectedOpportunityId ?? "";
  }, [clientOpportunityModel.selectedOpportunityId]);

  function invalidateOpportunityAction() {
    handoffRequestRef.current += 1;
    setHandoffPending(false);
    setHandoffResult(null);
  }

  useEffect(() => {
    invalidateOpportunityAction();
  }, [currentSection, liveCtx, refreshToken]);

  function handleOpportunitySelect(opportunityId) {
    const normalizedId = String(opportunityId ?? "").trim();
    if (!normalizedId) return;
    invalidateOpportunityAction();
    const activeElement = document.activeElement;
    opportunityTriggerRef.current = activeElement && typeof activeElement.focus === "function"
      ? activeElement
      : null;
    onNavigate("clients", "client-opportunities", {
      opportunityId: normalizedId,
      tab: clientOpportunityModel.activeStatusTab,
      opportunityQuery: clientOpportunityModel.searchQuery
    });
  }

  function handleOpportunityClose() {
    invalidateOpportunityAction();
    onNavigate("clients", "client-opportunities", {
      opportunityId: "",
      tab: clientOpportunityModel.activeStatusTab,
      opportunityQuery: clientOpportunityModel.searchQuery
    });
    const trigger = opportunityTriggerRef.current;
    opportunityTriggerRef.current = null;
    window.requestAnimationFrame(() => {
      if (trigger && document.contains(trigger)) trigger.focus();
    });
  }

  function handleOpportunityTabChange(tab) {
    invalidateOpportunityAction();
    onNavigate("clients", "client-opportunities", {
      opportunityId: "",
      tab,
      opportunityQuery: clientOpportunityModel.searchQuery
    });
  }

  function handleOpportunitySearchChange(query) {
    invalidateOpportunityAction();
    onNavigate("clients", "client-opportunities", {
      opportunityId: "",
      tab: clientOpportunityModel.activeStatusTab,
      opportunityQuery: query
    });
  }

  async function handleOpportunityHandoff() {
    const selectedId = clientOpportunityModel.selectedOpportunityId;
    const opportunity = selectedId
      ? opportunities.find((item) => item?.opportunity_id === selectedId) ?? null
      : null;
    const selectedModel = clientOpportunityModel.selectedOpportunity;
    if (!opportunity?.opportunity_id) return;
    const requestId = handoffRequestRef.current + 1;
    handoffRequestRef.current = requestId;
    setHandoffPending(true);
    setHandoffResult(null);
    const next = await handoffCrmOpportunityToIntake({
      opportunityId: opportunity.opportunity_id,
      requestedScopeSummary: selectedModel?.requestedScopeSummary ?? selectedModel?.displayName ?? "Client 상담 요청",
      ctx: liveCtx
    });
    if (requestId !== handoffRequestRef.current || opportunitySelectionRef.current !== selectedId) return;
    setHandoffResult(next);
    setHandoffPending(false);
    const handoffOutcome = next?.statusOutcome ?? next?.outcome ?? next?.uiState;
    const canonicalHandoffSucceeded = next?.kind === "data"
      && ["passed", "created", "idempotent_replay"].includes(handoffOutcome)
      && Boolean(next.opportunity?.opportunity_id)
      && Boolean(next.item?.intake_request_id);
    if (canonicalHandoffSucceeded) {
      setOpportunitiesResult((current) => upsertResultItem(current, next.opportunity, "opportunity_id"));
      if (next.item) setIntakeResult((current) => upsertResultItem(current, next.item, "intake_request_id"));
      const nextStatusTab = clientOpportunityStatusCode(next.opportunity);
      if (nextStatusTab && nextStatusTab !== clientOpportunityModel.activeStatusTab) {
        onNavigate("clients", "client-opportunities", {
          opportunityId: selectedId,
          tab: nextStatusTab,
          opportunityQuery: clientOpportunityModel.searchQuery
        });
      }
    }
  }

  useEffect(() => {
    if (!activeRequestedOpportunityId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleOpportunityClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeRequestedOpportunityId, clientOpportunityModel.activeStatusTab, clientOpportunityModel.searchQuery]);

  function invalidateConsultationActions() {
    consultationRequestRef.current += 1;
    setConsultationSchedulePending(false);
    setConsultationReschedulePending(false);
    setConsultationOutlookPending(false);
    setConsultationCompletePending(false);
    setClientEngagementDecisionPending(false);
    setClientEngagementRepairPending(false);
    setConsultationScheduleResult(null);
    setConsultationRescheduleResult(null);
    setConsultationOutlookResult(null);
    setConsultationCompleteResult(null);
    setClientEngagementDecisionResult(null);
    setClientEngagementRepairResult(null);
  }

  function consultationActionStillCurrent(requestId, consultationId = activeRequestedConsultationId, inquiryId = authorizedCommandInquiryId) {
    return requestId === consultationRequestRef.current
      && currentSection === "client-consultation-proposals"
      && activeRequestedConsultationId === consultationId
      && authorizedCommandInquiryId === inquiryId;
  }

  async function refreshClientActivityRead(requestId, consultationId = activeRequestedConsultationId, inquiryId = authorizedCommandInquiryId) {
    const next = await fetchCrmClientActivities({ ctx: liveCtx });
    if (consultationActionStillCurrent(requestId, consultationId, inquiryId)) setActivitiesResult(next);
  }

  async function refreshCommandInquiryDetail(requestId, inquiryId = authorizedCommandInquiryId) {
    if (!inquiryId) return;
    const detail = await fetchCrmInquiryDetail({ inquiryId, ctx: liveCtx });
    if (consultationActionStillCurrent(requestId, activeRequestedConsultationId, inquiryId)) {
      setCommandInquiryDetailResult(detail);
    }
  }

  useEffect(() => {
    consultationSelectionRef.current = clientConsultationModel.selectedConsultationId ?? "";
  }, [clientConsultationModel.selectedConsultationId]);

  useEffect(() => {
    invalidateConsultationActions();
  }, [activeCommandInquiryId, activeRequestedConsultationId, activeRequestedConsultationQuery, currentSection, liveCtx, refreshToken, requestedClientTab]);

  function handleConsultationInquiryChange(inquiryId) {
    const normalizedId = String(inquiryId ?? "").trim();
    invalidateConsultationActions();
    onNavigate("clients", currentSection, {
      consultationId: activeRequestedConsultationId,
      consultationQuery: activeRequestedConsultationQuery,
      inquiryId: normalizedId,
      tab: clientConsultationModel.activeStatusTab
    });
  }

  function handleConsultationSelect(consultationId) {
    const normalizedId = String(consultationId ?? "").trim();
    if (!normalizedId) return;
    const consultation = clientConsultationModel.consultations.find((item) => item.consultationId === normalizedId);
    if (!consultation) return;
    invalidateConsultationActions();
    const activeElement = document.activeElement;
    consultationTriggerRef.current = activeElement && typeof activeElement.focus === "function" ? activeElement : null;
    const inquiryId = consultation.inquiryId && clientInquiryModel.inquiries.some((item) => item.inquiryId === consultation.inquiryId)
      ? consultation.inquiryId
      : "";
    onNavigate("clients", "client-consultation-proposals", {
      consultationId: normalizedId,
      consultationQuery: clientConsultationModel.searchQuery,
      inquiryId,
      tab: clientConsultationModel.activeStatusTab
    });
  }

  function handleConsultationClose() {
    invalidateConsultationActions();
    onNavigate("clients", "client-consultation-proposals", {
      consultationId: "",
      consultationQuery: clientConsultationModel.searchQuery,
      inquiryId: activeCommandInquiryId,
      tab: clientConsultationModel.activeStatusTab
    });
    const trigger = consultationTriggerRef.current;
    consultationTriggerRef.current = null;
    window.requestAnimationFrame(() => {
      if (trigger && document.contains(trigger)) trigger.focus();
    });
  }

  function handleConsultationTabChange(tab) {
    invalidateConsultationActions();
    onNavigate("clients", "client-consultation-proposals", {
      consultationId: "",
      consultationQuery: clientConsultationModel.searchQuery,
      inquiryId: activeCommandInquiryId,
      tab
    });
  }

  function handleConsultationSearchChange(query) {
    invalidateConsultationActions();
    onNavigate("clients", "client-consultation-proposals", {
      consultationId: "",
      consultationQuery: query,
      inquiryId: activeCommandInquiryId,
      tab: clientConsultationModel.activeStatusTab
    });
  }

  useEffect(() => {
    if (!activeRequestedConsultationId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleConsultationClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeRequestedConsultationId, activeCommandInquiryId, clientConsultationModel.activeStatusTab, clientConsultationModel.searchQuery]);

  async function handleScheduleConsultation(form) {
    const inquiryId = String(form?.inquiryId ?? "").trim();
    const descriptor = inquiryVersionDescriptor(commandInquiryDetailResult);
    if (!inquiryId || !descriptor || descriptor.inquiryId !== inquiryId || !descriptor.inquiryVersion) {
      setConsultationScheduleResult({ kind: "error", status: 400, outcome: "blocked", uiState: "error", safeErrorCodes: ["CRM_INQUIRY_VERSION_UNAVAILABLE"] });
      return;
    }
    const fingerprint = JSON.stringify({ inquiryId, version: descriptor.inquiryVersion, subject: form.subject, start: form.scheduledStart, end: form.scheduledEnd, confidential: form.confidential });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "consultation_schedule", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setConsultationSchedulePending(true);
    setConsultationScheduleResult(null);
    const next = await createCrmConsultation({
      inquiryId,
      expectedInquiryVersion: descriptor.inquiryVersion,
      consultation: {
        subject: form.subject,
        scheduled_start: form.scheduledStart,
        scheduled_end: form.scheduledEnd,
        timezone: "Asia/Seoul",
        confidential: form.confidential
      },
      idempotencyKey,
      reason: "상담 일정 등록",
      ctx: liveCtx
    });
    if (!consultationActionStillCurrent(requestId, activeRequestedConsultationId, inquiryId)) return;
    const returnedInquiryId = next?.inquiry?.leadId ?? next?.item?.leadId ?? null;
    const canonical = next?.kind === "data"
      && next.item?.activityKind === "consultation"
      && returnedInquiryId === inquiryId;
    setConsultationScheduleResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_CONSULTATION_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setConsultationSchedulePending(false);
    if (canonical) {
      await Promise.all([
        refreshClientActivityRead(requestId, activeRequestedConsultationId, inquiryId),
        refreshCommandInquiryDetail(requestId, inquiryId)
      ]);
    }
  }

  async function handleRescheduleConsultation(form) {
    const selected = clientConsultationModel.selectedConsultation;
    if (!selected?.consultationId || !selected.version) return;
    const fingerprint = JSON.stringify({ consultationId: selected.consultationId, version: selected.version, start: form.scheduledStart, end: form.scheduledEnd });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "consultation_reschedule", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setConsultationReschedulePending(true);
    setConsultationRescheduleResult(null);
    const next = await updateCrmConsultation({
      consultationId: selected.consultationId,
      expectedVersion: selected.version,
      fieldUpdates: { scheduled_start: form.scheduledStart, scheduled_end: form.scheduledEnd, timezone: "Asia/Seoul" },
      idempotencyKey,
      reason: "상담 시간 변경",
      ctx: liveCtx
    });
    if (!consultationActionStillCurrent(requestId)) return;
    const canonical = next?.kind === "data" && next.item?.consultationId === selected.consultationId;
    setConsultationRescheduleResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_CONSULTATION_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setConsultationReschedulePending(false);
    if (canonical) await refreshClientActivityRead(requestId);
  }

  async function handleConsultationOutlook() {
    const selected = clientConsultationModel.selectedConsultation;
    if (!selected?.consultationId || !selected.version) return;
    const fingerprint = JSON.stringify({ consultationId: selected.consultationId, version: selected.version });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "consultation_outlook", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setConsultationOutlookPending(true);
    setConsultationOutlookResult(null);
    const next = await linkCrmConsultationOutlookEvent({ consultationId: selected.consultationId, expectedVersion: selected.version, idempotencyKey, reason: "Outlook 일정 연결", ctx: liveCtx });
    if (!consultationActionStillCurrent(requestId)) return;
    const canonical = next?.kind === "data" && next.item?.consultationId === selected.consultationId;
    setConsultationOutlookResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_CONSULTATION_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setConsultationOutlookPending(false);
    if (canonical) await refreshClientActivityRead(requestId);
  }

  async function handleCompleteConsultation(form) {
    const selected = clientConsultationModel.selectedConsultation;
    if (!selected?.consultationId || !selected.version || !form?.outcome?.trim() || !form?.nextAction?.trim()) return;
    const fingerprint = JSON.stringify({ consultationId: selected.consultationId, version: selected.version, outcome: form.outcome.trim(), nextAction: form.nextAction.trim() });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "consultation_complete", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setConsultationCompletePending(true);
    setConsultationCompleteResult(null);
    const completedAt = clientCommandTimestamp(commandTimestampRef, idempotencyKey);
    const next = await completeCrmConsultation({ consultationId: selected.consultationId, expectedVersion: selected.version, completedAt, outcome: form.outcome.trim(), nextAction: form.nextAction.trim(), idempotencyKey, reason: "상담 결과 기록", ctx: liveCtx });
    if (!consultationActionStillCurrent(requestId)) return;
    const canonical = next?.kind === "data" && next.item?.consultationId === selected.consultationId;
    setConsultationCompleteResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_CONSULTATION_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setConsultationCompletePending(false);
    if (canonical) {
      await Promise.all([
        refreshClientActivityRead(requestId),
        refreshCommandInquiryDetail(requestId)
      ]);
    }
  }

  async function handleClientEngagementDecision(form) {
    const inquiryId = authorizedCommandInquiryId;
    const descriptor = inquiryCommandDescriptor(commandInquiryDetailResult);
    if (!inquiryId || !descriptor || descriptor.inquiryId !== inquiryId || !descriptor.opportunityId || !descriptor.engagementVersion) {
      setClientEngagementDecisionResult({ kind: "error", status: 400, outcome: "blocked", uiState: "error", safeErrorCodes: ["CRM_INQUIRY_VERSION_UNAVAILABLE"] });
      return;
    }
    const fingerprint = JSON.stringify({ inquiryId, inquiryVersion: descriptor.inquiryVersion, engagementVersion: descriptor.engagementVersion, decision: form.decision, amount: form.agreedAmount ?? null, amountUnknownConfirmed: form.amountUnknownConfirmed === true, closeReason: form.closeReason ?? "" });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "engagement_decision", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setClientEngagementDecisionPending(true);
    setClientEngagementDecisionResult(null);
    const next = await decideCrmEngagement({ inquiryId, engagementDecision: form.decision, expectedInquiryVersion: descriptor.inquiryVersion, expectedEngagementVersion: descriptor.engagementVersion, agreedAmount: form.decision === "accepted" ? form.agreedAmount : undefined, amountUnknownConfirmed: form.decision === "accepted" ? form.amountUnknownConfirmed === true : undefined, closeReason: form.decision === "declined" ? form.closeReason : undefined, idempotencyKey, reason: "수임 여부 확정", ctx: liveCtx });
    if (!consultationActionStillCurrent(requestId, activeRequestedConsultationId, inquiryId)) return;
    const returnedInquiryId = next?.inquiry?.leadId ?? next?.item?.leadId ?? null;
    const canonical = next?.kind === "data" && returnedInquiryId === inquiryId;
    setClientEngagementDecisionResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_ENGAGEMENT_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setClientEngagementDecisionPending(false);
    if (canonical) await fetchCrmInquiryDetail({ inquiryId, ctx: liveCtx }).then((detail) => {
      if (consultationActionStillCurrent(requestId, activeRequestedConsultationId, inquiryId)) setCommandInquiryDetailResult(detail);
    });
  }

  async function handleClientEngagementRepair({ expectedWorkflowVersion } = {}) {
    const inquiryId = authorizedCommandInquiryId;
    const workflowVersion = Number(expectedWorkflowVersion);
    if (!inquiryId || !Number.isSafeInteger(workflowVersion) || workflowVersion < 1) return;
    const fingerprint = JSON.stringify({ inquiryId, workflowVersion });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "engagement_repair", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setClientEngagementRepairPending(true);
    setClientEngagementRepairResult(null);
    const next = await repairCrmEngagement({ inquiryId, expectedWorkflowVersion: workflowVersion, idempotencyKey, reason: "수임 반영 재시도", ctx: liveCtx });
    if (!consultationActionStillCurrent(requestId, activeRequestedConsultationId, inquiryId)) return;
    const canonical = next?.kind === "data" && (next.inquiry?.leadId ?? inquiryId) === inquiryId;
    setClientEngagementRepairResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_ENGAGEMENT_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setClientEngagementRepairPending(false);
    if (canonical) {
      setClientEngagementDecisionResult(next);
      await refreshCommandInquiryDetail(requestId, inquiryId);
    }
  }

  async function handleCreateClientActivityMemo(form) {
    const inquiryId = authorizedCommandInquiryId;
    const detailItem = commandInquiryDetailResult?.kind === "data" ? commandInquiryDetailResult.item : null;
    const inquiryVersion = Number.isSafeInteger(detailItem?.version) && detailItem.version >= 1 ? detailItem.version : null;
    if (!inquiryId || !inquiryVersion || !form?.subject?.trim() || !form?.reason?.trim()) {
      setActivityCreateResult({ kind: "error", status: 400, outcome: "blocked", uiState: "error", safeErrorCodes: ["CRM_INQUIRY_VERSION_UNAVAILABLE"] });
      return;
    }
    const fingerprint = JSON.stringify({ inquiryId, inquiryVersion, subject: form.subject.trim(), reason: form.reason.trim(), confidential: form.confidential === true });
    const idempotencyKey = clientCommandIdempotencyKey(commandKeyRef, "contact_memo", fingerprint);
    const requestId = consultationRequestRef.current + 1;
    consultationRequestRef.current = requestId;
    setActivityCreatePending(true);
    setActivityCreateResult(null);
    const next = await createCrmContactActivityMemo({ inquiryId, subject: form.subject.trim(), confidential: form.confidential === true, idempotencyKey, reason: form.reason.trim(), ctx: liveCtx });
    if (requestId !== consultationRequestRef.current || currentSection !== "client-activities" || authorizedCommandInquiryId !== inquiryId) return;
    const returnedInquiryId = next?.inquiry?.leadId ?? next?.item?.leadId ?? null;
    const canonical = next?.kind === "data" && returnedInquiryId === inquiryId;
    setActivityCreateResult(canonical ? next : next?.kind === "data" ? { ...next, kind: "error", uiState: "error", outcome: "error", safeErrorCodes: ["CRM_ACTIVITY_RESPONSE_CONTEXT_MISMATCH"] } : next);
    setActivityCreatePending(false);
    if (canonical) {
      const refreshed = await fetchCrmClientActivities({ ctx: liveCtx });
      if (requestId === consultationRequestRef.current && currentSection === "client-activities" && authorizedCommandInquiryId === inquiryId) setActivitiesResult(refreshed);
    }
  }

  function handleClientGroupCreated(item) {
    const clientGroupId = String(item?.client_group_id ?? "").trim();
    const displayName = String(item?.display_name ?? "").trim();
    if (!clientGroupId || !displayName) return;
    const clientItem = {
      client_group_id: clientGroupId,
      display_name: displayName,
      client_type: item.client_type,
      status: "active",
      primary_record_present: true,
      member_count: 1
    };
    setClientsResult((current) => upsertResultItem(current, clientItem, "client_group_id"));
    onNavigate("clients", "clients-list", {
      recordId: clientGroupId,
      tab: "overview"
    });
  }

  function handleClientDetailTabSelect(tab) {
    if (!selectedClientId) return;
    onNavigate("clients", "clients-list", {
      recordId: selectedClientId,
      tab
    });
  }

  function handleClientDetailClose() {
    onNavigate("clients", "clients-list", {
      recordId: "",
      tab: ""
    });
  }

  function handleClientRelatedRouteOpen() {
    const relatedRoute = clientDirectoryModel.route.relatedRoute;
    if (!relatedRoute || !selectedClientId) return;
    onNavigate("clients", relatedRoute.section, {
      filter: "client",
      recordId: selectedClientId
    });
  }

  function handleClientRelatedFinanceReturn() {
    onNavigate("clients", "clients-list", {
      recordId: relatedFinanceClient
        ? normalizedRequestedClientId
        : "",
      tab: relatedFinanceClient ? "overview" : ""
    });
  }

  const selectedClientOverlay = selectedClient ? (
    <div className="record-overlay-layer" data-record-overlay="client">
      <button type="button" className="record-overlay-scrim" aria-label="고객 정보 닫기" onClick={handleClientDetailClose} />
      <div className="record-overlay-panel" role="dialog" aria-modal="true" aria-label={`${clientDisplayName(selectedClient, 0)} 고객 정보`}>
        <ClientRecordPanel
          model={clientDirectoryModel}
          onSelectTab={handleClientDetailTabSelect}
          onOpenRelatedSection={handleClientRelatedRouteOpen}
          onClose={handleClientDetailClose}
        />
        {!clientGuardedState
          && selectedClientId
          && clientDirectoryModel.route.activeTab === "overview"
          && (
          <RecordActionSummary
            fieldsResult={clientRecordActionFieldsResult}
            auditResult={clientRecordActionAuditResult}
            updateResult={clientRecordActionUpdateResult}
            ownerResult={clientRecordActionOwnerResult}
            pending={clientRecordActionPending}
            ownerPending={clientRecordActionOwnerPending}
            editValue={clientRecordEditValue}
            onEditValueChange={setClientRecordEditValue}
            onFieldUpdate={handleClientRecordActionFieldUpdate}
            onOwnerBlocked={handleClientOwnerBlockedAction}
          />
          )}
      </div>
    </div>
  ) : null;
  const selectedInquiryOverlay = clientInquiryModel.selectedInquiry ? (
    <div className="record-overlay-layer" data-record-overlay="inquiry">
      <button type="button" className="record-overlay-scrim" aria-label="문의 상세 닫기" onClick={handleInquiryDetailClose} />
      <div className="record-overlay-panel" role="dialog" aria-modal="true" aria-label={`${clientInquiryModel.selectedInquiry.displayName} 문의 상세`} onKeyDown={handleInquiryDialogKeyDown}>
        <div className="client-inquiry-detail-overlay-header">
          <strong>새 문의</strong>
          <button type="button" className="record-overlay-close" aria-label="문의 상세 닫기" autoFocus onClick={handleInquiryDetailClose}>
            <X size={17} />
          </button>
        </div>
        <ClientInquiryDetailPanel
          inquiry={clientInquiryModel.selectedInquiry}
          detailState={clientInquiryModel.detailState}
          ctx={liveCtx}
        />
      </div>
    </div>
  ) : null;
  const overlayRoot = typeof document === "undefined" ? null : document.body;

  return (
    <section
      id="clients-home"
      className="surface stack clients-surface"
      data-cmp-g2-live-clients="true"
    >
      <ForestHero title={labels.clientsTitle} image={heroClientArchitecture} imageOpacity={0.24} />
      {disabledRouteDisposition && (
        <div
          className="home-company-access-notice client-route-notice"
          role="status"
          data-client-route-disabled={disabledRouteDisposition}
        >
          <strong>
            {disabledRouteDisposition === "not_found"
              ? "요청한 메뉴를 찾을 수 없습니다."
              : "이 메뉴는 사용하지 않습니다."}
          </strong>
          <span>왼쪽 Client 메뉴에서 필요한 업무를 선택해 주세요.</span>
        </div>
      )}
      <div
        className="clients-runtime-grid record-workspace record-workspace-list-only"
        data-salesforce-client-workspace="list-detail-overlay"
      >
        {currentSection === "clients-home" && (
          <Panel id="clients-home-panel" className="record-list-panel" title="대시보드" hideHeader>
            <ClientDashboardPanel
              result={clientOperationsDashboardResult}
              onNavigate={onNavigate}
            />
          </Panel>
        )}
        {currentSection === "clients-list" && (
          <Panel id="clients-list" className="record-list-panel" title="목록" meta="" hideHeader>
            {requestedClientId
              && clientsResult !== null
              && !clientDirectoryModel.selectedClient
              && (
                <div className="client-record-unavailable" role="status">
                  선택한 고객 정보를 열 수 없습니다. 고객 목록에서 다시 선택해 주세요.
                </div>
              )}
            <ClientsTable result={clientsResult} selectedClientId={selectedClientId} onSelectClient={handleClientSelect} />
          </Panel>
        )}
        {currentSection === "client-new" && (
          <Panel id="client-new" className="record-list-panel" title="신규 고객" meta="" hideHeader>
            <ClientNewCustomersPanel ctx={liveCtx} onCreated={handleClientGroupCreated} />
          </Panel>
        )}
        {currentSection === "client-leads" && (
          <Panel id="client-leads" className="record-list-panel" title="새 문의">
            {activeRequestedInquiryId && !clientInquiryModel.requestedInquiryAvailable && inquiriesResult !== null && (
              <div className="client-inquiry-target-unavailable" role="status">
                선택한 문의를 열 수 없습니다. 권한이 없거나 이미 닫힌 문의일 수 있습니다.
              </div>
            )}
            <ClientInquiryList
              result={inquiriesResult}
              items={clientInquiryModel.inquiries}
              selectedInquiryId={activeRequestedInquiryId}
              onSelectInquiry={handleInquirySelect}
            />
          </Panel>
        )}
        {currentSection === "client-opportunities" && (
          <Panel id="client-opportunities" className="record-list-panel" title="수임 현황" hideHeader>
            <OpportunitiesTable
              result={opportunitiesResult}
              model={clientOpportunityModel}
              selectedRawOpportunity={selectedOpportunity}
              pending={handoffPending}
              handoffResult={handoffResult}
              onTabChange={handleOpportunityTabChange}
              onSearchChange={handleOpportunitySearchChange}
              onSelectOpportunity={handleOpportunitySelect}
              onCloseOpportunity={handleOpportunityClose}
              onHandoff={handleOpportunityHandoff}
            />
          </Panel>
        )}
        {currentSection === "client-intake" && (
          <Panel id="client-intake" className="record-list-panel" title="인테이크">
            <ClientIntakePipelineSurface
              result={intakeResult}
              auditResult={intakeAuditResult}
              activeIntake={activeIntake}
              createResult={intakeCreateResult}
              conflictResult={conflictResult}
              decisionResult={decisionResult}
              waiverResult={waiverResult}
              engagementResult={engagementResult}
              clearanceResult={clearanceResult}
              matterOpeningResult={matterOpeningResult}
              createPending={intakeCreatePending}
              conflictPending={conflictPending}
              decisionPending={decisionPending}
              waiverPending={waiverPending}
              engagementPending={engagementPending}
              clearancePending={clearancePending}
              matterOpeningPending={matterOpeningPending}
              onCreateIntake={handleCreateIntakePipeline}
              onConflictCheck={handleConflictCheck}
              onConflictDecision={handleConflictDecision}
              onWaiverApprove={handleWaiverApprove}
              onEngagementApprove={handleEngagementApprove}
              onClearance={handleClearance}
              onMatterOpening={handleMatterOpening}
            />
          </Panel>
        )}
        {currentSection === "client-consultation-proposals" && (
          <Panel id="client-consultation-proposals" className="record-list-panel" title="상담·수임 관리" hideHeader>
            <ClientConsultationPanel
              result={activitiesResult}
              model={clientConsultationModel}
              inquiries={clientInquiryModel.inquiries}
              inquiriesState={clientInquiryModel.listState}
              selectedInquiryId={authorizedCommandInquiryId}
              inquiryDetailResult={commandInquiryDetailResult}
              schedulePending={consultationSchedulePending}
              scheduleResult={consultationScheduleResult}
              reschedulePending={consultationReschedulePending}
              rescheduleResult={consultationRescheduleResult}
              outlookPending={consultationOutlookPending}
              outlookResult={consultationOutlookResult}
              completePending={consultationCompletePending}
              completeResult={consultationCompleteResult}
              decisionPending={clientEngagementDecisionPending}
              decisionResult={clientEngagementDecisionResult}
              repairPending={clientEngagementRepairPending}
              repairResult={clientEngagementRepairResult}
              onInquiryChange={handleConsultationInquiryChange}
              onTabChange={handleConsultationTabChange}
              onSearchChange={handleConsultationSearchChange}
              onSelectConsultation={handleConsultationSelect}
              onCloseConsultation={handleConsultationClose}
              onSchedule={handleScheduleConsultation}
              onReschedule={handleRescheduleConsultation}
              onOutlook={handleConsultationOutlook}
              onComplete={handleCompleteConsultation}
              onDecision={handleClientEngagementDecision}
              onRepair={handleClientEngagementRepair}
            />
          </Panel>
        )}
        {currentSection === "client-accounts" && (
          <Panel id="client-accounts" className="record-list-panel" title="계정 정보" hideHeader>
            <AccountsTable
              result={accountsResult}
              relationshipResult={accountContactsResult}
              createResult={accountCreateResult}
              createPending={accountCreatePending}
              patchResult={accountPatchResult}
              patchPending={accountPatchPending}
              recordActionResult={accountRecordActionResult}
              recordActionPending={accountRecordActionPending}
              onCreateAccount={handleCreateAccount}
              onPatchAccount={handlePatchAccount}
              onRecordActionFieldUpdate={handleAccountRecordActionFieldUpdate}
            />
          </Panel>
        )}
        {currentSection === "client-contacts" && (
          <Panel id="client-contacts" className="record-list-panel" title="담당자" hideHeader>
            <ContactsTable
              result={contactsResult}
              legalPeopleResult={legalPeopleClientResult}
              mergeResult={mergeProposalsResult}
              createResult={contactCreateResult}
              createPending={contactCreatePending}
              patchResult={contactPatchResult}
              patchPending={contactPatchPending}
              recordActionResult={contactRecordActionResult}
              recordActionPending={contactRecordActionPending}
              mergeCreateResult={mergeCreateResult}
              mergeExecuteResult={mergeExecuteResult}
              mergeCreatePending={mergeCreatePending}
              mergeExecutePending={mergeExecutePending}
              onCreateContact={handleCreateContact}
              onPatchContact={handlePatchContact}
              onRecordActionFieldUpdate={handleContactRecordActionFieldUpdate}
              onCreateMergeProposal={handleCreateMergeProposal}
              onExecuteMergeProposal={handleExecuteMergeProposal}
            />
          </Panel>
        )}
        {currentSection === "client-activities" && (
          <Panel id="client-activities" className="record-list-panel" title="접촉 이력" hideHeader>
            <ClientActivitiesPanel
              result={activitiesResult}
              inquiries={clientInquiryModel.inquiries}
              inquiriesState={clientInquiryModel.listState}
              selectedInquiryId={authorizedCommandInquiryId}
              createResult={activityCreateResult}
              createPending={activityCreatePending}
              onInquiryChange={handleConsultationInquiryChange}
              onCreate={handleCreateClientActivityMemo}
            />
          </Panel>
        )}
        {currentSection === "client-contracts" && (
          <Panel id="client-contracts" className="record-list-panel" title="제안" hideHeader>
            <ClientContractsPanel
              result={proposalsResult}
              createResult={proposalCreateResult}
              patchResult={proposalPatchResult}
              createPending={proposalCreatePending}
              patchPending={proposalPatchPending}
              onCreate={handleCreateProposal}
              onProviderCheck={handleProposalProviderCheck}
            />
          </Panel>
        )}
        {currentSection === "client-relationships" && (
          <Panel id="client-relationships" className="record-list-panel" title="관계" hideHeader>
            <ClientRelationshipsPanel
              relationshipResult={accountContactsResult}
              mergeResult={mergeProposalsResult}
              mergeCreateResult={mergeCreateResult}
              mergeExecuteResult={mergeExecuteResult}
              mergeCreatePending={mergeCreatePending}
              mergeExecutePending={mergeExecutePending}
              onCreateMergeProposal={handleCreateMergeProposal}
              onExecuteMergeProposal={handleExecuteMergeProposal}
            />
          </Panel>
        )}
        {currentSection === "client-conflict" && (
          <Panel id="client-conflict" className="record-list-panel" title="이해상충 확인" hideHeader>
            <ClientConflictPanel
              result={intakeResult}
              auditResult={intakeAuditResult}
              activeIntake={activeIntake}
              conflictResult={conflictResult}
              decisionResult={decisionResult}
              waiverResult={waiverResult}
              engagementResult={engagementResult}
              clearanceResult={clearanceResult}
              matterOpeningResult={matterOpeningResult}
              conflictPending={conflictPending}
              decisionPending={decisionPending}
              waiverPending={waiverPending}
              engagementPending={engagementPending}
              clearancePending={clearancePending}
              matterOpeningPending={matterOpeningPending}
              onConflictCheck={handleConflictCheck}
              onConflictDecision={handleConflictDecision}
              onWaiverApprove={handleWaiverApprove}
              onEngagementApprove={handleEngagementApprove}
              onClearance={handleClearance}
              onMatterOpening={handleMatterOpening}
            />
          </Panel>
        )}
        {currentSection === "client-billing" && (
          <Panel id="client-billing" className="record-list-panel" title="수임료·미수금" hideHeader>
            <ClientReceivablesContainer
              ctx={liveCtx}
              initialClientId={normalizedRequestedClientId}
            />
          </Panel>
        )}
        {currentSection === "client-sales-history" && (
          <Panel id="client-sales-history" className="record-list-panel" title="입금 매출 내역" meta="" hideHeader>
            {relatedFinanceKind === "deposit_revenue" && (clientsResult === null || !relatedFinanceClient) ? (
              <ClientRelatedFinanceGuard
                client={relatedFinanceClient}
                kind="deposit_revenue"
                loading={clientsResult === null}
                onReturn={handleClientRelatedFinanceReturn}
              />
            ) : (
              <ClientDepositOperationsPanel
                ctx={liveCtx}
                clients={clients}
                initialClientId={relatedFinanceClient ? clientRecordId(relatedFinanceClient) : ""}
                onReturn={relatedFinanceClient ? handleClientRelatedFinanceReturn : null}
              />
            )}
          </Panel>
        )}
        {currentSection === "client-data" && (
          <DataCloudEnrichmentPanel ctx={liveCtx} />
        )}
        {currentSection === "client-reports" && (
          <ClientFixedReportsContainer
            ctx={liveCtx}
            readReport={fetchClientFixedReport}
            exportReport={exportClientFixedReportCsv}
          />
        )}
        {currentSection === "client-import" && (
          <ImportDataMappingPanel ctx={liveCtx} surface="client" />
        )}
        {currentSection === "client-settings" && (
          <Panel id="client-settings" className="record-list-panel" title="설정" hideHeader>
            <ClientSettingsPanel
              result={clientSettingsResult}
              patchResult={clientSettingPatchResult}
              patchPending={clientSettingPatchPending}
              onPatch={handlePatchClientSetting}
            />
          </Panel>
        )}
      </div>
      {selectedClientOverlay && overlayRoot ? createPortal(selectedClientOverlay, overlayRoot) : selectedClientOverlay}
      {selectedInquiryOverlay && overlayRoot ? createPortal(selectedInquiryOverlay, overlayRoot) : selectedInquiryOverlay}
    </section>
  );
}
