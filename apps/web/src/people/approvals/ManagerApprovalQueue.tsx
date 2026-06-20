import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxApprovals, fetchHrxAuditEvents, resolveHrxApproval } from "../hrxApiClient.ts";

export function ManagerApprovalQueue() {
  const [result, setResult] = useState(null);
  const [audit, setAudit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxApprovals().then((next) => {
      if (!cancelled) setResult(next);
    });
    fetchHrxAuditEvents().then((next) => {
      if (!cancelled) setAudit(next);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function resolve(approvalId, action) {
    const resolved = await resolveHrxApproval(approvalId, action);
    if (resolved.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">Loading approvals from /api/hrx/approvals</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Approval API failed. No local queue fallback is rendered.</div>;
  } else {
    body = (
      <div className="approval-queue">
        {result.approvals.map((approval) => (
          <div className="approval-row" key={approval.approval_id}>
            <div>
              <strong>{approval.object_type}</strong>
              <span>{approval.object_id}</span>
            </div>
            <em>{approval.state}</em>
            <div className="approval-actions">
              <button className="secondary-button" disabled={approval.state !== "pending"} onClick={() => resolve(approval.approval_id, "reject")}>
                <XCircle size={14} />
                Reject
              </button>
              <button className="primary-button" disabled={approval.state !== "pending"} onClick={() => resolve(approval.approval_id, "approve")}>
                <CheckCircle2 size={14} />
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Panel className="people-panel span-2" title="Manager Approval Queue" meta="/api/hrx/approvals">
      {body}
      {audit?.kind === "data" && (
        <DataTable
          columns={["Audit", "Action", "Object", "Decision"]}
          rows={audit.events.slice(-4).map((event) => [event.event_id, event.action, event.object_id, event.decision])}
        />
      )}
    </Panel>
  );
}
