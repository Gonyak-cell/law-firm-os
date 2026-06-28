import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/primitives.jsx";
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

const PEOPLE_SECTIONS = new Set([
  "people-directory",
  "people-relationships",
  "people-conflicts",
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
  "people-ai",
  "people-payroll",
  "people-admin"
]);

const WORKFORCE_SECTIONS = new Set(["people-members", "people-org-chart", "people-lifecycle"]);

function peopleGuardState(liveCtx) {
  if (liveCtx === "denied") {
    return {
      className: "live-data-denied",
      title: "접근 권한이 없습니다",
      body: "권한이 있는 People 정보만 표시합니다."
    };
  }
  if (liveCtx === "review") {
    return {
      className: "live-data-review",
      title: "검토가 필요합니다",
      body: "검토가 끝나면 People 정보를 확인할 수 있습니다."
    };
  }
  return null;
}

export function PeopleHome({ labels, activeSection = "", liveCtx = "allow" }) {
  const [overview, setOverview] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentSection = PEOPLE_SECTIONS.has(activeSection) ? activeSection : "people-members";
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

  return (
    <section id="people-home" className="surface stack people-surface" data-hrx-api-backed="true">
      <PageHeader
        title={labels.peopleTitle}
        subtitle="구성원, 조직, 휴가관리, 요청 관리, 입퇴사 관리, 회사방침, 급여정산과 리포트를 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />

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
        <div className="people-runtime-grid">
          <PeopleWorkforceDirectory initialTab="active" refreshKey={refreshKey} onSelectEmployee={setSelectedEmployeeId} />
          <EmployeeProfile employeeId={selectedEmployeeId} refreshKey={refreshKey} />
        </div>
      )}

      {!guardedState && currentSection === "people-org-chart" && (
        <PeopleWorkforceDirectory initialTab="active" initialView="org" refreshKey={refreshKey} onSelectEmployee={setSelectedEmployeeId} />
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
          <CandidatePortal key={`candidate-${refreshKey}`} />
        </div>
      )}

      {!guardedState && currentSection === "people-lifecycle" && (
        <div className="people-runtime-grid">
          <PeopleWorkforceDirectory initialTab="onboarding" refreshKey={refreshKey} onSelectEmployee={setSelectedEmployeeId} />
          <LifecycleBoard />
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
    </section>
  );
}
