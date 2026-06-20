import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader, Panel } from "../components/primitives.jsx";
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

export function PeopleHome({ labels }) {
  const [overview, setOverview] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const metrics = overview?.kind === "data" ? overview.metrics : null;

  return (
    <section className="surface stack people-surface" data-hrx-api-backed="true">
      <PageHeader
        title={labels.peopleTitle}
        subtitle="API-backed People runtime for employee records, HR documents, and leave workflows."
        actions={
          <>
            <button className="secondary-button" onClick={() => setRefreshKey((key) => key + 1)}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button className="primary-button">
              <ShieldCheck size={15} />
              Runtime guarded
            </button>
          </>
        }
      />

      <div className="people-metric-grid">
        <Panel title="Employees" meta="/api/hrx/employees">
          <div className="people-metric">
            <UsersRound size={20} />
            <strong>{metrics ? metrics.employee_count : "..."}</strong>
            <span>Total API rows</span>
          </div>
        </Panel>
        <Panel title="Active" meta="Scoped by tenant">
          <div className="people-metric">
            <ShieldCheck size={20} />
            <strong>{metrics ? metrics.active_count : "..."}</strong>
            <span>Active records</span>
          </div>
        </Panel>
        <Panel title="On Leave" meta="Leave workflow">
          <div className="people-metric">
            <RefreshCw size={20} />
            <strong>{metrics ? metrics.on_leave_count : "..."}</strong>
            <span>Current status</span>
          </div>
        </Panel>
      </div>

      {overview?.kind === "error" && (
        <div className="live-data-state live-data-error">
          <strong>People API unavailable</strong>
          Start the Law Firm OS API or check the HRX route contract. This surface has no static fallback.
        </div>
      )}

      <div className="people-runtime-grid">
        <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={refreshKey} />
        <EmployeeProfile employeeId={selectedEmployeeId} refreshKey={refreshKey} />
        <HRDocumentWorkspace employeeId={selectedEmployeeId} refreshKey={refreshKey} />
        <LeaveRequestPage employeeId={selectedEmployeeId} refreshKey={refreshKey} onSubmitted={() => setRefreshKey((key) => key + 1)} />
        <ManagerApprovalQueue />
        <CandidatePortal candidateId="cand-001" />
        <RecruitingPipeline />
        <LifecycleBoard />
        <HRXPolicyConsole />
        <HRXAuditViewer />
        <HRAnalytics />
        <HRAIAssistant />
      </div>
    </section>
  );
}
