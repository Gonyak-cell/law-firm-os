import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/primitives.jsx";
import { fetchHrxPeopleOverview } from "./hrxApiClient.ts";
import { EmployeeList } from "./employees/EmployeeList.tsx";
import { EmployeeProfile } from "./employees/EmployeeProfile.tsx";
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

const PEOPLE_SECTIONS = new Set([
  "people-members",
  "people-documents",
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
        subtitle="구성원, 인사 문서, 휴가, 승인, 채용, 입퇴사, 인사 정책, 활동 기록, 인사 현황, AI 검토, 급여정산, 권한 관리를 운영합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />

      {overview?.kind === "error" && (
        <div className="live-data-state live-data-error">
          <strong>구성원 정보를 불러오지 못했습니다</strong>
          잠시 후 다시 시도해주세요.
        </div>
      )}

      {currentSection === "people-members" && (
        <div className="people-runtime-grid">
          <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
          <EmployeeProfile employeeId={selectedEmployeeId} refreshKey={refreshKey} />
        </div>
      )}

      {currentSection === "people-documents" && (
        <div className="people-runtime-grid">
          <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
          <HRDocumentWorkspace employeeId={selectedEmployeeId} refreshKey={refreshKey} />
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
        <div className="people-runtime-grid">
          <LifecycleBoard />
        </div>
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
