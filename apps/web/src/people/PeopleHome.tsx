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

export function PeopleHome({ labels, activeSection = "" }) {
  const [overview, setOverview] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentSection = PEOPLE_SECTIONS.has(activeSection) ? activeSection : "people-members";

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    fetchHrxPeopleOverview().then((result) => {
      if (!cancelled) setOverview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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

      {currentSection === "people-directory" && <LegalPeopleWorkspace mode="directory" refreshKey={refreshKey} />}

      {currentSection === "people-relationships" && <LegalPeopleWorkspace mode="relationships" refreshKey={refreshKey} />}

      {currentSection === "people-conflicts" && <LegalPeopleWorkspace mode="conflicts" refreshKey={refreshKey} />}

      {currentSection === "people-members" && (
        <PeopleWorkforceDirectory initialTab="active" refreshKey={refreshKey} onSelectEmployee={setSelectedEmployeeId} />
      )}

      {currentSection === "people-org-chart" && (
        <PeopleWorkforceDirectory initialTab="active" initialView="org" refreshKey={refreshKey} onSelectEmployee={setSelectedEmployeeId} />
      )}

      {currentSection === "people-documents" && (
        <div className="people-runtime-grid">
          <HRDocumentWorkspace refreshKey={refreshKey} mode="regulations" />
        </div>
      )}

      {currentSection === "people-certificates" && (
        <div className="people-runtime-grid">
          <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
          <HRDocumentWorkspace employeeId={selectedEmployeeId} refreshKey={refreshKey} mode="certificates" />
        </div>
      )}

      {currentSection === "people-leave" && (
        <div className="people-runtime-grid">
          <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
          <LeaveRequestPage employeeId={selectedEmployeeId} refreshKey={refreshKey} onSubmitted={() => setRefreshKey((key) => key + 1)} />
        </div>
      )}

      {currentSection === "people-approvals" && (
        <div className="people-runtime-grid">
          <ManagerApprovalQueue />
        </div>
      )}

      {currentSection === "people-recruiting" && (
        <div className="people-runtime-grid">
          <RecruitingPipeline />
          <CandidatePortal />
        </div>
      )}

      {currentSection === "people-lifecycle" && (
        <PeopleWorkforceDirectory initialTab="onboarding" refreshKey={refreshKey} onSelectEmployee={setSelectedEmployeeId} />
      )}

      {currentSection === "people-policy" && (
        <div className="people-runtime-grid">
          <HRXPolicyConsole />
        </div>
      )}

      {currentSection === "people-audit" && (
        <div className="people-runtime-grid">
          <HRXAuditViewer />
        </div>
      )}

      {currentSection === "people-analytics" && (
        <div className="people-runtime-grid">
          <HRAnalytics />
        </div>
      )}

      {currentSection === "people-ai" && (
        <div className="people-runtime-grid">
          <HRAIAssistant />
        </div>
      )}

      {currentSection === "people-payroll" && (
        <div className="people-runtime-grid">
          <PayrollBoundaryPanel />
        </div>
      )}

      {currentSection === "people-admin" && (
        <div className="people-runtime-grid">
          <PermissionAdminPanel />
        </div>
      )}
    </section>
  );
}
