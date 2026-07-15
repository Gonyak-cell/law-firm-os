import React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import heroPeopleArchitecture from "../assets/heroes/hero-people-architecture.jpg";
import { ForestHero } from "../components/ForestHero.jsx";
import { fetchHrxPeopleOverview } from "./hrxApiClient.ts";
import { EmployeeList } from "./employees/EmployeeList.tsx";
import { EmployeeProfile } from "./employees/EmployeeProfile.tsx";
import { PeopleWorkforceDirectory } from "./employees/PeopleWorkforceDirectory.tsx";
import { HRDocumentWorkspace } from "./documents/HRDocumentWorkspace.tsx";
import { LeaveRequestPage } from "./leave/LeaveRequestPage.tsx";
import { LeaveApprovalQueue } from "./leave/LeaveApprovalQueue.tsx";
import { LeaveTypeSettingsPage } from "./leave/LeaveTypeSettingsPage.tsx";
import { LeaveAccrualAutoPage } from "./leave/LeaveAccrualAutoPage.tsx";
import { LeaveAccrualManualPage } from "./leave/LeaveAccrualManualPage.tsx";
import { LeaveUsagePage } from "./leave/LeaveUsagePage.tsx";
import { LeaveTerminationPage } from "./leave/LeaveTerminationPage.tsx";
import { LeavePromotionPage } from "./leave/LeavePromotionPage.tsx";
import { ManagerApprovalQueue } from "./approvals/ManagerApprovalQueue.tsx";
import { RecruitingPipeline } from "./recruiting/RecruitingPipeline.tsx";
import { CandidatePortal } from "../candidate/CandidatePortal.tsx";
import { HRXPolicyConsole } from "../admin/hrx/HRXPolicyConsole.tsx";
import { HRXAuditViewer } from "../admin/hrx/HRXAuditViewer.tsx";
import { LifecycleBoard } from "./lifecycle/LifecycleBoard.tsx";
import { HRAnalytics } from "./analytics/HRAnalytics.tsx";
import { HRAIAssistant } from "./ai/HRAIAssistant.tsx";
import { PayrollBoundaryPanel } from "./payroll/PayrollBoundaryPanel.tsx";
import { PayrollStatementWorkspace } from "./payroll/PayrollStatementWorkspace.tsx";
import { PermissionAdminPanel } from "./admin/PermissionAdminPanel.jsx";
import { LegalPeopleWorkspace } from "./legal/LegalPeopleWorkspace.tsx";
import { HrxRiskDashboard } from "./security/HrxRiskDashboard.tsx";
import { AttendanceWorkspace } from "./attendance/AttendanceWorkspace.tsx";
import { PEOPLE_SECTION_IDS, getPeopleFeatureBySection } from "./peopleFeatureCatalog.js";

const LEGACY_LEGAL_PEOPLE_SECTIONS = [
  "people-directory",
  "people-relationships",
  "people-conflicts"
];

const PEOPLE_SECTIONS = new Set([
  ...LEGACY_LEGAL_PEOPLE_SECTIONS,
  ...PEOPLE_SECTION_IDS
]);

const HANDLED_PEOPLE_SECTIONS = new Set([
  "people-members",
  "people-org-chart",
  "people-documents",
  "people-certificates",
  "people-leave",
  "people-leave-requests",
  "people-leave-types",
  "people-leave-accrual-auto",
  "people-leave-accrual-manual",
  "people-leave-usage",
  "people-leave-termination",
  "people-annual-leave-notices",
  "people-approvals",
  "people-recruiting",
  "people-lifecycle",
  "people-policy",
  "people-audit",
  "people-analytics",
  "people-risk",
  "people-attendance-records",
  "people-ai",
  "people-payroll",
  "people-pay-statement",
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

export function PeopleHome({ activeSection = "", liveCtx = "allow", refreshSignal = 0, canManageLeavePolicy = false, canApproveLeave = false, canExecuteLeaveAccrual = false, canAdjustLeaveLedger = false, canExportLeaveReport = false, canSettleLeaveTermination = false, canManageLeavePromotion = false }: { activeSection?: string; liveCtx?: string; refreshSignal?: number; canManageLeavePolicy?: boolean; canApproveLeave?: boolean; canExecuteLeaveAccrual?: boolean; canAdjustLeaveLedger?: boolean; canExportLeaveReport?: boolean; canSettleLeaveTermination?: boolean; canManageLeavePromotion?: boolean }) {
  const [overview, setOverview] = useState<PeopleOverviewState | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshSignalRef = useRef(refreshSignal);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement | null>(null);
  const currentSection = PEOPLE_SECTIONS.has(activeSection) ? activeSection : "people-members";
  const currentFeature = getPeopleFeatureBySection(currentSection);
  const guardedState = peopleGuardState(liveCtx);

  useEffect(() => {
    if (refreshSignalRef.current === refreshSignal) return;
    refreshSignalRef.current = refreshSignal;
    setRefreshKey((key) => key + 1);
  }, [refreshSignal]);

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
    if (!WORKFORCE_SECTIONS.has(currentSection)) {
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
  }, [currentSection, liveCtx, refreshKey]);

  useEffect(() => {
    if (!selectedEmployeeId) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => detailCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEmployeeId(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        detailPanelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [selectedEmployeeId]);

  return (
    <section id="people-home" className="surface stack people-surface" data-hrx-api-backed="true">
      <ForestHero title="People" image={heroPeopleArchitecture} imageOpacity={0.24} />
      <div key={refreshKey} className="people-work-layer" data-people-work-layer="white">
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

        {!guardedState && currentSection === "people-directory" && <LegalPeopleWorkspace mode="directory" refreshKey={refreshKey} liveCtx={liveCtx} />}

        {!guardedState && currentSection === "people-relationships" && <LegalPeopleWorkspace mode="relationships" refreshKey={refreshKey} liveCtx={liveCtx} />}

        {!guardedState && currentSection === "people-conflicts" && <LegalPeopleWorkspace mode="conflicts" refreshKey={refreshKey} liveCtx={liveCtx} />}

        {!guardedState && currentSection === "people-members" && (
          <>
            <div className="people-directory-grid" data-people-detail-open={selectedEmployeeId ? "true" : "false"}>
              <PeopleWorkforceDirectory initialTab="active" refreshKey={refreshKey} selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} />
            </div>
            {selectedEmployeeId && (
              createPortal(
                <div className="people-detail-overlay" data-people-detail-overlay="open">
                  <button type="button" className="people-detail-backdrop" aria-label="구성원 상세 닫기" onClick={() => setSelectedEmployeeId(null)} />
                  <aside ref={detailPanelRef} className="people-detail-panel" data-people-detail-panel="open" role="dialog" aria-modal="true" aria-label="구성원 상세">
                    <button ref={detailCloseRef} type="button" className="icon-button people-detail-close" aria-label="상세 패널 닫기" onClick={() => setSelectedEmployeeId(null)}>
                      <X size={18} />
                    </button>
                    <EmployeeProfile employeeId={selectedEmployeeId} refreshKey={refreshKey} />
                  </aside>
                </div>,
                document.body
              )
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
            <LeaveRequestPage canViewTeam={canApproveLeave} />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-requests" && canApproveLeave && (
          <div className="people-runtime-grid">
            <LeaveApprovalQueue />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-requests" && !canApproveLeave && (
          <div className="live-data-state live-data-denied" data-leave-approval-access="denied">
            <strong>휴가 승인 권한이 없습니다</strong>
            지정 승인자 또는 인사 담당자에게 접근을 요청하세요.
          </div>
        )}

        {!guardedState && currentSection === "people-leave-types" && canManageLeavePolicy && (
          <div className="people-runtime-grid">
            <LeaveTypeSettingsPage />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-types" && !canManageLeavePolicy && (
          <div className="live-data-state live-data-denied" data-leave-policy-access="denied">
            <strong>휴가 설정 권한이 없습니다</strong>
            인사 담당자에게 접근을 요청하세요.
          </div>
        )}

        {!guardedState && currentSection === "people-leave-accrual-auto" && canExecuteLeaveAccrual && (
          <div className="people-runtime-grid">
            <LeaveAccrualAutoPage canExport={canExportLeaveReport} />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-accrual-auto" && !canExecuteLeaveAccrual && (
          <div className="live-data-state live-data-denied" data-leave-accrual-access="denied">
            <strong>자동 발생 권한이 없습니다</strong>
            인사 담당자에게 접근을 요청하세요.
          </div>
        )}

        {!guardedState && currentSection === "people-leave-accrual-manual" && canAdjustLeaveLedger && (
          <div className="people-runtime-grid">
            <LeaveAccrualManualPage />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-accrual-manual" && !canAdjustLeaveLedger && (
          <div className="live-data-state live-data-denied" data-leave-ledger-access="denied">
            <strong>수동 발생 권한이 없습니다</strong>
            인사 담당자에게 접근을 요청하세요.
          </div>
        )}

        {!guardedState && currentSection === "people-leave-usage" && (
          <div className="people-runtime-grid">
            <LeaveUsagePage canExport={canExportLeaveReport} canProcessIntegrations={canManageLeavePolicy} canAdjust={canAdjustLeaveLedger} />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-termination" && canSettleLeaveTermination && (
          <div className="people-runtime-grid">
            <LeaveTerminationPage />
          </div>
        )}

        {!guardedState && currentSection === "people-leave-termination" && !canSettleLeaveTermination && (
          <div className="live-data-state live-data-denied" data-leave-termination-access="denied">
            <strong>퇴사 휴가 정산 권한이 없습니다</strong>
            승인된 인사 운영 범위와 정산 권한을 확인하세요.
          </div>
        )}

        {!guardedState && currentSection === "people-annual-leave-notices" && canManageLeavePromotion && (
          <div className="people-runtime-grid">
            <LeavePromotionPage />
          </div>
        )}

        {!guardedState && currentSection === "people-annual-leave-notices" && !canManageLeavePromotion && (
          <div className="live-data-state live-data-denied" data-leave-promotion-access="denied">
            <strong>연차 사용 촉진 관리 권한이 없습니다</strong>
            승인된 인사 운영 범위와 촉진 관리 권한을 확인하세요.
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

        {!guardedState && currentSection === "people-attendance-records" && (
          <div className="people-runtime-grid people-attendance-runtime-grid">
            <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
            <AttendanceWorkspace
              employeeId={selectedEmployeeId}
              refreshKey={refreshKey}
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

        {!guardedState && currentSection === "people-pay-statement" && (
          <div className="people-runtime-grid">
            <PayrollStatementWorkspace key={refreshKey} />
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
