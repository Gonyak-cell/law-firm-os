import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxApprovals, fetchHrxAuditEvents, resolveHrxApproval } from "../hrxApiClient.ts";
import { safePeopleLabel } from "../peoplePresentation.ts";

type ApprovalAction = "approve" | "reject";
type HrxRecord = Record<string, unknown>;

function approvalStateLabel(value: unknown) {
  if (value === "approved") return "승인";
  if (value === "rejected") return "반려";
  if (value === "pending") return "대기";
  return "확인 필요";
}

function actionLabel(value: unknown) {
  if (value === "approve") return "승인";
  if (value === "reject") return "반려";
  if (value === "create") return "생성";
  if (value === "update") return "수정";
  return "확인";
}

const OBJECT_TYPE_LABELS: Record<string, string> = {
  leaverequest: "휴가 요청",
  leave_request: "휴가 요청",
  document: "문서",
  employee: "구성원",
  candidate: "지원자",
  legalrisk: "법무 리스크",
  legal_risk: "법무 리스크",
  approvalrequest: "승인 요청",
  attendance: "근무 기록",
  overtime: "초과근무",
  expense: "비용 정산",
  payroll: "급여",
};

function objectTypeLabel(value: unknown) {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  return OBJECT_TYPE_LABELS[key] ?? "요청";
}

function humanMetadataLabel(record: HrxRecord) {
  const objectId = typeof record.object_id === "string" ? record.object_id.trim() : null;
  const nested = record.object && typeof record.object === "object" && !Array.isArray(record.object)
    ? record.object as HrxRecord
    : null;
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
    ? record.metadata as HrxRecord
    : null;
  const candidates = [
    record.object_name,
    record.object_label,
    record.label,
    record.display_name,
    record.name,
    record.employee_name,
    record.requester_name,
    record.candidate_name,
    record.document_name,
    record.title,
    nested?.display_name,
    nested?.name,
    nested?.label,
    nested?.title,
    metadata?.object_name,
    metadata?.display_name,
    metadata?.employee_name,
    metadata?.requester_name,
  ];
  for (const candidate of candidates) {
    const label = safePeopleLabel(candidate, { identifiers: [objectId] });
    if (label) return label;
  }
  return null;
}

export function objectDisplayLabel(record: HrxRecord) {
  return humanMetadataLabel(record) ?? objectTypeLabel(record.object_type);
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

  async function resolve(approvalId: string, action: ApprovalAction) {
    const resolved = await resolveHrxApproval(approvalId, action);
    if (resolved.kind === "data") setRefreshKey((key: number) => key + 1);
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
        {result.approvals.map((approval: HrxRecord, index: number) => {
          const approvalId = String(approval.approval_id ?? "");
          return (
            <div className="approval-row" key={approvalId || `approval-${index}`}>
              <div>
                <strong>{objectTypeLabel(approval.object_type)}</strong>
                <span>{objectDisplayLabel(approval)}</span>
              </div>
              <em>{approvalStateLabel(approval.state)}</em>
              <div className="approval-actions">
                <button className="secondary-button" disabled={approval.state !== "pending" || !approvalId} onClick={() => resolve(approvalId, "reject")}>
                  <XCircle size={14} />
                  반려
                </button>
                <button className="primary-button" disabled={approval.state !== "pending" || !approvalId} onClick={() => resolve(approvalId, "approve")}>
                  <CheckCircle2 size={14} />
                  승인
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Panel id="people-approvals" className="people-panel span-2" title="요청 관리">
      {body}
      {audit?.kind === "data" && (
        <DataTable
          columns={["기록", "작업", "대상", "결과"]}
          rows={audit.events.slice(-4).map((event: HrxRecord, index: number) => [`기록 ${index + 1}`, actionLabel(event.action), objectDisplayLabel(event), approvalStateLabel(event.decision)])}
        />
      )}
    </Panel>
  );
}
