import React from "react";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ForestHero } from "../components/ForestHero.jsx";
import { fetchHrxPeopleOverview } from "./hrxApiClient.ts";
import { EmployeeList } from "./employees/EmployeeList.tsx";
import { EmployeeProfile } from "./employees/EmployeeProfile.tsx";
import { PeopleWorkforceDirectory } from "./employees/PeopleWorkforceDirectory.tsx";
import { HRDocumentWorkspace } from "./documents/HRDocumentWorkspace.tsx";
import { LeaveRequestPage } from "./leave/LeaveRequestPage.tsx";
import { ManagerApprovalQueue } from "./approvals/ManagerApprovalQueue.tsx";
import { RecruitingPipeline } from "./recruiting/RecruitingPipeline.tsx";
import { CandidatePortal } from "../candidate/CandidatePortal.tsx";
import { HRXPolicyConsole } from "../admin/hrx/HRXPolicyConsole.tsx";
import { HRXAuditViewer } from "../admin/hrx/HRXAuditViewer.tsx";
import { LifecycleBoard } from "./lifecycle/LifecycleBoard.tsx";
import { HRAnalytics } from "./analytics/HRAnalytics.tsx";
import { HRAIAssistant } from "./ai/HRAIAssistant.tsx";
import { PayrollBoundaryPanel } from "./payroll/PayrollBoundaryPanel.tsx";
import { PermissionAdminPanel } from "./admin/PermissionAdminPanel.jsx";
import { LegalPeopleWorkspace } from "./legal/LegalPeopleWorkspace.tsx";
import { HrxRiskDashboard } from "./security/HrxRiskDashboard.tsx";
import { AttendanceWorkspace } from "./attendance/AttendanceWorkspace.tsx";
import { PEOPLE_SECTION_IDS, getPeopleFeatureBySection } from "./peopleFeatureCatalog.js";
import {
  fetchAnalyticsFinanceClients,
  fetchCrmAccounts,
  fetchCrmActivities,
  fetchCrmContacts,
  fetchCrmLeads,
  fetchCrmOpportunities
} from "../data/apiClient.js";
import { DashboardListCard, DashboardReadState, DashboardRecordList, DashboardRecordRow } from "../components/DashboardList.jsx";

const LEGACY_LEGAL_PEOPLE_SECTIONS = [
  "people-directory",
  "people-relationships",
  "people-conflicts"
];

const PEOPLE_SECTIONS = new Set([
  "people-dashboard",
  ...LEGACY_LEGAL_PEOPLE_SECTIONS,
  ...PEOPLE_SECTION_IDS
]);

const HANDLED_PEOPLE_SECTIONS = new Set([
  "people-dashboard",
  "people-members",
  "people-org-chart",
  "people-documents",
  "people-certificates",
  "people-leave",
  "people-approvals",
  "people-recruiting",
  "people-lifecycle",
  "people-policy",
  "people-audit",
  "people-analytics",
  "people-risk",
  "people-work-schedule",
  "people-current-work-status",
  "people-attendance-records",
  "people-ai",
  "people-payroll",
  "people-admin"
]);

const WORKFORCE_SECTIONS = new Set(["people-members", "people-org-chart", "people-lifecycle"]);

const EXTERNAL_SCHEDULE_TYPES = [
  { place: "법원", work: "판결선고 청취, 변론기일, 문서 제출", fields: "법원명, 사건번호, 기일, 담당 구성원" },
  { place: "검찰", work: "기록복사, 조사 동행, 문서 제출", fields: "청명, 사건번호, 방문 목적, 담당 구성원" },
  { place: "우체국", work: "내용증명 발송, 등기 발송", fields: "발송 대상, 발송 방식, 접수번호" },
  { place: "세무서", work: "신고, 자료 제출, 민원 처리", fields: "세무서명, 업무 유형, 제출 자료" },
  { place: "관청", work: "인허가, 민원, 자료 제출", fields: "기관명, 업무 유형, 접수번호" }
];

type PeopleFeature = {
  section: string;
  groupLabel: string;
  label: string;
  summary: string;
  state: string;
  stateMeta: {
    label: string;
    description: string;
  };
  capabilities: string[];
};

type PeopleOverviewState = {
  kind?: string;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
};

type DashboardResult = { kind?: string; uiState?: string; outcome?: string; items?: any[] } | null;
type PeopleDashboardResults = {
  accounts: DashboardResult;
  leads: DashboardResult;
  opportunities: DashboardResult;
  contacts: DashboardResult;
  activities: DashboardResult;
  financeClients: DashboardResult;
};

const peopleMoneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function dashboardItems(result: DashboardResult) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function dashboardDateValue(item: any) {
  const value = item?.updated_at ?? item?.created_at ?? item?.scheduled_at ?? item?.occurred_at;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
}

function dashboardDateLabel(value: unknown) {
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "일정 미정";
}

function moneyLabel(value: unknown, currency = "KRW") {
  return `${peopleMoneyFormatter.format(Number(value) || 0)} ${currency}`;
}

function peopleCategoryLabel(value: unknown, fallback: string) {
  const labels: Record<string, string> = {
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

function peopleDisplayLabel(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text && !text.includes("_") && !text.includes("@") ? text : fallback;
}

function combinedReadState(results: DashboardResult[]) {
  if (results.some((result) => result === null)) return null;
  return results.find((result) => result?.uiState === "denied")
    ?? results.find((result) => result?.uiState === "review_required" || result?.outcome === "review_required")
    ?? results.find((result) => result?.kind === "error")
    ?? { kind: "data", items: results.flatMap(dashboardItems) };
}

function PeopleDashboardPanel({ results, onNavigate }: { results: PeopleDashboardResults; onNavigate: (view: string, section: string) => void }) {
  const newClients = dashboardItems(results.accounts).slice().sort((left, right) => dashboardDateValue(right) - dashboardDateValue(left)).slice(0, 5);
  const prospectResult = combinedReadState([results.leads, results.opportunities, results.contacts]);
  const prospects = dashboardItems(prospectResult).slice().sort((left, right) => dashboardDateValue(right) - dashboardDateValue(left)).slice(0, 5);
  const financeClients = dashboardItems(results.financeClients);
  const revenueRows = financeClients.slice().sort((left, right) => Number(right.billed_amount ?? 0) - Number(left.billed_amount ?? 0)).slice(0, 5);
  const meetings = dashboardItems(results.activities).filter((item) => item.activity_type === "meeting").sort((left, right) => dashboardDateValue(right) - dashboardDateValue(left)).slice(0, 5);
  const arRows = financeClients.filter((item) => Number(item.ar_balance ?? 0) > 0).sort((left, right) => Number(right.ar_balance ?? 0) - Number(left.ar_balance ?? 0)).slice(0, 5);

  return (
    <div className="operational-dashboard-grid people-dashboard-layout" data-people-dashboard="true">
      <DashboardListCard className="people-dashboard-new-clients" title="신규 고객" section="new-clients" onViewAll={() => onNavigate("clients", "clients-list")}>
        <DashboardReadState result={results.accounts} noun="신규 고객">
          <DashboardRecordList emptyText="신규 고객이 없습니다">
            {newClients.map((item, index) => <DashboardRecordRow key={`client:${item.account_id ?? index}`} title={item.display_name ?? `고객 ${index + 1}`} meta={peopleCategoryLabel(item.account_type ?? item.status, "고객")} detail={dashboardDateLabel(item.created_at ?? item.updated_at)} status={peopleDisplayLabel(item.owner_display_name, "담당 미지정")} onOpen={() => onNavigate("clients", "clients-list")} />)}
          </DashboardRecordList>
        </DashboardReadState>
      </DashboardListCard>
      <DashboardListCard className="people-dashboard-prospects" title="잠재 고객/접촉" section="prospects-contacts" onViewAll={() => onNavigate("clients", "client-opportunities")}>
        <DashboardReadState result={prospectResult} noun="잠재 고객과 접촉">
          <DashboardRecordList emptyText="잠재 고객 또는 접촉 기록이 없습니다">
            {prospects.map((item, index) => <DashboardRecordRow key={`prospect:${item.lead_id ?? item.opportunity_id ?? item.contact_id ?? index}`} title={item.display_name ?? item.subject ?? `접촉 ${index + 1}`} meta={peopleCategoryLabel(item.stage ?? item.status, "접촉")} detail={dashboardDateLabel(item.updated_at ?? item.created_at)} status={peopleDisplayLabel(item.owner_display_name, "담당 미지정")} onOpen={() => onNavigate("clients", item.contact_id ? "client-contacts" : "client-opportunities")} />)}
          </DashboardRecordList>
        </DashboardReadState>
      </DashboardListCard>
      <DashboardListCard className="people-dashboard-revenue" title="매출 순위" section="revenue-ranking" onViewAll={() => onNavigate("home", "home-finance-clients")}>
        <DashboardReadState result={results.financeClients} noun="고객별 매출">
          <DashboardRecordList emptyText="표시할 고객별 매출이 없습니다">
            {revenueRows.map((item, index) => <DashboardRecordRow key={`revenue:${item.client_group_id ?? index}:${item.currency ?? "KRW"}`} title={`${index + 1}. ${item.client_group_label ?? "미연결 고객"}`} meta={`청구 ${moneyLabel(item.billed_amount, item.currency)}`} detail={`수납 ${moneyLabel(item.collected_amount, item.currency)}`} onOpen={() => onNavigate("home", "home-finance-clients")} />)}
          </DashboardRecordList>
        </DashboardReadState>
      </DashboardListCard>
      <DashboardListCard className="people-dashboard-meetings" title="고객 미팅" section="client-meetings" onViewAll={() => onNavigate("clients", "client-activities")}>
        <DashboardReadState result={results.activities} noun="고객 미팅">
          <DashboardRecordList emptyText="고객 미팅이 없습니다">
            {meetings.map((item, index) => <DashboardRecordRow key={`meeting:${item.crm_activity_id ?? index}`} title={item.subject ?? `고객 미팅 ${index + 1}`} meta={peopleDisplayLabel(item.party_display_name ?? item.display_name, "고객 미지정")} detail={dashboardDateLabel(item.scheduled_at ?? item.occurred_at ?? item.created_at ?? item.updated_at)} status={peopleDisplayLabel(item.owner_display_name, "담당 미지정")} onOpen={() => onNavigate("clients", "client-activities")} />)}
          </DashboardRecordList>
        </DashboardReadState>
      </DashboardListCard>
      <DashboardListCard className="people-dashboard-ar" title="미수금" section="accounts-receivable" onViewAll={() => onNavigate("home", "home-finance-ar")}>
        <DashboardReadState result={results.financeClients} noun="고객별 미수금">
          <DashboardRecordList emptyText="표시할 미수금이 없습니다">
            {arRows.map((item, index) => <DashboardRecordRow key={`ar:${item.client_group_id ?? index}:${item.currency ?? "KRW"}`} title={item.client_group_label ?? "미연결 고객"} meta={`미수 ${moneyLabel(item.ar_balance, item.currency)}`} detail={item.month ?? "현재 잔액"} status={Number(item.ar_balance ?? 0) > 0 ? "회수 확인" : "정상"} onOpen={() => onNavigate("home", "home-finance-ar")} />)}
          </DashboardRecordList>
        </DashboardReadState>
      </DashboardListCard>
    </div>
  );
}

function PeopleFeatureStatePanel({ feature }: { feature: PeopleFeature }) {
  const stateMeta = feature.stateMeta;
  const isExternalSchedule = feature.section === "people-work-schedule-external";

  return (
    <section className="people-feature-state" data-people-feature-state={feature.section} data-people-feature-status={feature.state}>
      <header className="people-feature-state-head">
        <div>
          <span className="eyebrow">{feature.groupLabel}</span>
          <h2>{feature.label}</h2>
          <p>{feature.summary}</p>
        </div>
        <span className="people-feature-status">{stateMeta.label}</span>
      </header>

      <div className="people-feature-state-grid">
        <div className="people-feature-section">
          <h3>반영할 기능</h3>
          <ul>
            {feature.capabilities.map((capability: string) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </div>
        <div className="people-feature-section">
          <h3>구현 상태</h3>
          <p>{stateMeta.description}</p>
          <p>담당자 확인 후 실제 화면으로 전환합니다.</p>
        </div>
      </div>

      {isExternalSchedule && (
        <div className="people-feature-section people-external-schedule-section">
          <h3>외부일정 유형</h3>
          <div className="people-external-schedule-grid">
            {EXTERNAL_SCHEDULE_TYPES.map((item) => (
              <div key={item.place} className="people-external-schedule-row">
                <strong>{item.place}</strong>
                <span>{item.work}</span>
                <small>{item.fields}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function peopleGuardState(liveCtx: string) {
  if (liveCtx === "denied") {
    return {
      className: "live-data-denied",
      title: "접근 권한이 없습니다",
      body: "담당자에게 접근을 요청하세요."
    };
  }
  if (liveCtx === "review") {
    return {
      className: "live-data-review",
      title: "검토가 필요합니다",
      body: "담당자 확인 후 구성원 정보를 볼 수 있습니다."
    };
  }
  return null;
}

export function PeopleHome({ activeSection = "", liveCtx = "allow", onNavigate = () => {} }: { activeSection?: string; liveCtx?: string; onNavigate?: (view: string, section: string) => void }) {
  const [overview, setOverview] = useState<PeopleOverviewState | null>(null);
  const [dashboardResults, setDashboardResults] = useState<PeopleDashboardResults>({ accounts: null, leads: null, opportunities: null, contacts: null, activities: null, financeClients: null });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentSection = PEOPLE_SECTIONS.has(activeSection) ? activeSection : "people-dashboard";
  const currentFeature = getPeopleFeatureBySection(currentSection);
  const guardedState = peopleGuardState(liveCtx);

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    if (guardedState) {
      setSelectedEmployeeId(null);
      setOverview({ kind: liveCtx });
      return () => {
        cancelled = true;
      };
    }
    fetchHrxPeopleOverview().then((result) => {
      if (!cancelled) setOverview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshKey]);

  useEffect(() => {
    if (currentSection !== "people-dashboard" || guardedState) return undefined;
    let cancelled = false;
    setDashboardResults({ accounts: null, leads: null, opportunities: null, contacts: null, activities: null, financeClients: null });
    const args = { ctx: liveCtx };
    Promise.all([
      fetchCrmAccounts(args),
      fetchCrmLeads(args),
      fetchCrmOpportunities(args),
      fetchCrmContacts(args),
      fetchCrmActivities(args),
      fetchAnalyticsFinanceClients(args)
    ]).then(([accounts, leads, opportunities, contacts, activities, financeClients]) => {
      if (!cancelled) setDashboardResults({ accounts, leads, opportunities, contacts, activities, financeClients });
    });
    return () => { cancelled = true; };
  }, [currentSection, liveCtx, refreshKey]);

  useEffect(() => {
    if (!selectedEmployeeId) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEmployeeId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEmployeeId]);

  return (
    <section id="people-home" className="surface stack people-surface" data-hrx-api-backed="true">
      <ForestHero title="People" imageOpacity={0.18} />
      <div className="people-work-layer" data-people-work-layer="white">
        {overview?.kind === "error" && !WORKFORCE_SECTIONS.has(currentSection) && (
          <div className="live-data-state live-data-error">
            <strong>구성원 현황을 불러오지 못했습니다</strong>
            새로고침하거나 연결 상태를 확인하세요.
          </div>
        )}

        {guardedState && (
          <div className={`live-data-state ${guardedState.className}`} data-lcx8-people-guard-state="true">
            <strong>{guardedState.title}</strong>
            {guardedState.body}
          </div>
        )}

        {!guardedState && currentSection === "people-dashboard" && <PeopleDashboardPanel results={dashboardResults} onNavigate={onNavigate} />}

        {!guardedState && currentSection === "people-directory" && <LegalPeopleWorkspace mode="directory" refreshKey={refreshKey} liveCtx={liveCtx} />}

        {!guardedState && currentSection === "people-relationships" && <LegalPeopleWorkspace mode="relationships" refreshKey={refreshKey} liveCtx={liveCtx} />}

        {!guardedState && currentSection === "people-conflicts" && <LegalPeopleWorkspace mode="conflicts" refreshKey={refreshKey} liveCtx={liveCtx} />}

        {!guardedState && currentSection === "people-members" && (
          <>
            <div className="people-directory-grid" data-people-detail-open={selectedEmployeeId ? "true" : "false"}>
              <PeopleWorkforceDirectory initialTab="active" refreshKey={refreshKey} selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} />
            </div>
            {selectedEmployeeId && (
              <div className="people-detail-overlay" data-people-detail-overlay="open">
                <button type="button" className="people-detail-backdrop" aria-label="구성원 상세 닫기" onClick={() => setSelectedEmployeeId(null)} />
                <aside className="people-detail-panel" data-people-detail-panel="open" role="dialog" aria-modal="true" aria-label="구성원 상세">
                  <button type="button" className="icon-button people-detail-close" aria-label="상세 패널 닫기" onClick={() => setSelectedEmployeeId(null)}>
                    <X size={18} />
                  </button>
                  <EmployeeProfile employeeId={selectedEmployeeId} refreshKey={refreshKey} />
                </aside>
              </div>
            )}
          </>
        )}

        {!guardedState && currentSection === "people-org-chart" && (
          <PeopleWorkforceDirectory initialTab="active" initialView="org" refreshKey={refreshKey} selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} />
        )}

        {!guardedState && currentSection === "people-documents" && (
          <div className="people-runtime-grid">
            <HRDocumentWorkspace refreshKey={refreshKey} mode="regulations" />
          </div>
        )}

        {!guardedState && currentSection === "people-certificates" && (
          <div className="people-runtime-grid">
            <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
            <HRDocumentWorkspace employeeId={selectedEmployeeId} refreshKey={refreshKey} mode="certificates" />
          </div>
        )}

        {!guardedState && currentSection === "people-leave" && (
          <div className="people-runtime-grid">
            <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
            <LeaveRequestPage employeeId={selectedEmployeeId} refreshKey={refreshKey} onSubmitted={() => setRefreshKey((key) => key + 1)} />
          </div>
        )}

        {!guardedState && currentSection === "people-approvals" && (
          <div className="people-runtime-grid">
            <ManagerApprovalQueue key={refreshKey} />
          </div>
        )}

        {!guardedState && currentSection === "people-recruiting" && (
          <div className="people-runtime-grid">
            <RecruitingPipeline key={`recruiting-${refreshKey}`} />
            <CandidatePortal candidateId={null} />
          </div>
        )}

        {!guardedState && currentSection === "people-lifecycle" && (
          <div className="people-runtime-grid people-lifecycle-runtime-grid">
            <LifecycleBoard />
            <PeopleWorkforceDirectory compact initialTab="onboarding" refreshKey={refreshKey} selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} />
          </div>
        )}

        {!guardedState && currentSection === "people-policy" && (
          <div className="people-runtime-grid">
            <HRXPolicyConsole key={refreshKey} />
          </div>
        )}

        {!guardedState && currentSection === "people-audit" && (
          <div className="people-runtime-grid">
            <HRXAuditViewer key={refreshKey} />
          </div>
        )}

        {!guardedState && currentSection === "people-analytics" && (
          <div className="people-runtime-grid">
            <HRAnalytics key={refreshKey} />
          </div>
        )}

        {!guardedState && currentSection === "people-risk" && (
          <div className="people-runtime-grid">
            <HrxRiskDashboard />
          </div>
        )}

        {!guardedState && ["people-work-schedule", "people-current-work-status", "people-attendance-records"].includes(currentSection) && (
          <div className="people-runtime-grid people-attendance-runtime-grid">
            <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
            <AttendanceWorkspace
              employeeId={selectedEmployeeId}
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((key) => key + 1)}
              mode={currentSection === "people-work-schedule" ? "schedule" : currentSection === "people-current-work-status" ? "status" : "attendance"}
            />
          </div>
        )}

        {!guardedState && currentSection === "people-ai" && (
          <div className="people-runtime-grid">
            <HRAIAssistant key={refreshKey} />
          </div>
        )}

        {!guardedState && currentSection === "people-payroll" && (
          <div className="people-runtime-grid">
            <PayrollBoundaryPanel key={refreshKey} />
          </div>
        )}

        {!guardedState && currentSection === "people-admin" && (
          <div className="people-runtime-grid">
            <PermissionAdminPanel key={refreshKey} />
          </div>
        )}

        {!guardedState && currentFeature && !HANDLED_PEOPLE_SECTIONS.has(currentSection) && (
          <PeopleFeatureStatePanel feature={currentFeature} />
        )}
      </div>
    </section>
  );
}
