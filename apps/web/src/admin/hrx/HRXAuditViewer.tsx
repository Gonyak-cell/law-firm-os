import React from "react";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxAuditEvents } from "../../people/hrxApiClient.ts";
import { HrxStepUpChallenge } from "../../people/security/HrxStepUpChallenge.tsx";

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
  if (value === "approval") return "승인";
  return "업무";
}

export function HRXAuditViewer() {
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxAuditEvents().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">인사기록을 불러오는 중입니다</div>;
  } else if (result.kind === "step_up_required") {
    body = (
      <HrxStepUpChallenge
        onRetry={() => setRefreshKey((key) => key + 1)}
      />
    );
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">인사기록을 불러오지 못했습니다.</div>;
  } else {
    body = (
      <DataTable
        columns={["기록", "사용자", "작업", "대상"]}
        rows={result.events.map((event, index) => [`기록 ${index + 1}`, event.actor_id ? "담당자" : "시스템", actionLabel(event.action), objectTypeLabel(event.object_type)])}
      />
    );
  }

  return (
    <Panel id="people-audit" className="people-panel span-2" title="인사기록" meta="조직 변경 이력">
      <div className="people-panel-kicker">
        <ClipboardList size={15} />
        구성원 정보, 조직 변경 이력, 승진 기록 등을 확인합니다.
      </div>
      {body}
    </Panel>
  );
}
