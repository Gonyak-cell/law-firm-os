import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxApprovals, fetchHrxAuditEvents, resolveHrxApproval } from "../hrxApiClient.ts";

function approvalStateLabel(value) {
  if (value === "approved") return "승인";
  if (value === "rejected") return "반려";
  if (value === "pending") return "대기";
  return "확인 필요";
}

function actionLabel(value) {
  if (value === "approve") return "승인";
  if (value === "reject") return "반려";
  if (value === "create") return "생성";
  if (value === "update") return "수정";
  return "확인";
}

function objectTypeLabel(value) {
  if (value === "leave_request") return "휴가 요청";
  if (value === "document") return "문서";
  if (value === "employee") return "구성원";
  if (value === "candidate") return "지원자";
  return "요청";
}

function objectDisplayLabel(value, index) {
  if (value === "leave_request") return `휴가 요청 ${index + 1}`;
  if (value === "document") return `문서 ${index + 1}`;
  if (value === "employee") return `구성원 ${index + 1}`;
  if (value === "candidate") return `지원자 ${index + 1}`;
  return `요청 ${index + 1}`;
}

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
    body = <div className="live-data-state live-data-loading">요청을 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">요청을 불러오지 못했습니다.</div>;
  } else {
    body = (
      <div className="approval-queue">
        {result.approvals.map((approval, index) => (
          <div className="approval-row" key={approval.approval_id}>
            <div>
              <strong>{objectTypeLabel(approval.object_type)}</strong>
              <span>{objectDisplayLabel(approval.object_type, index)}</span>
            </div>
            <em>{approvalStateLabel(approval.state)}</em>
            <div className="approval-actions">
              <button className="secondary-button" disabled={approval.state !== "pending"} onClick={() => resolve(approval.approval_id, "reject")}>
                <XCircle size={14} />
                반려
              </button>
              <button className="primary-button" disabled={approval.state !== "pending"} onClick={() => resolve(approval.approval_id, "approve")}>
                <CheckCircle2 size={14} />
                승인
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Panel id="people-approvals" className="people-panel span-2" title="요청 관리" meta="전자결재">
      {body}
      {audit?.kind === "data" && (
        <DataTable
          columns={["기록", "작업", "대상", "결과"]}
          rows={audit.events.slice(-4).map((event, index) => [`기록 ${index + 1}`, actionLabel(event.action), objectDisplayLabel(event.object_type, index), approvalStateLabel(event.decision)])}
        />
      )}
    </Panel>
  );
}
