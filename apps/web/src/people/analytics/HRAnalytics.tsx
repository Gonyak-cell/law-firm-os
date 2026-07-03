import React from "react";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxAnalytics } from "../hrxApiClient.ts";

function summaryState(value: unknown) {
  return value ? "확인됨" : "확인 필요";
}

export function HRAnalytics() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxAnalytics().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">리포트를 불러오는 중입니다.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">리포트를 불러올 수 없습니다.</div>;
  } else {
    const analytics = result.analytics;
    const workloadRows = Array.isArray(result.workload_projection) ? result.workload_projection : [];
    const conflictRows = Array.isArray(result.workload_conflicts) ? result.workload_conflicts : [];
    body = (
      <DataTable
        columns={["항목", "상태", "표시 범위"]}
        rows={[
          ["구성원 현황", summaryState(analytics.headcount.active), "구성원"],
          ["퇴사 현황", summaryState(analytics.turnover), "구성원"],
          ["구성원 등록 현황", summaryState(analytics.recruiting_funnel), "구성원"],
          ["업무 여력", `${analytics.workload.total_hours ?? 0}시간 · ${analytics.workload.average_capacity_pct ?? 0}%`, workloadRows.every((row: Record<string, unknown>) => row.workload_source === "time_entry_aggregation") ? "시간기록" : "요약"],
          ["휴가-기한 충돌", conflictRows.length ? `${conflictRows.length}건` : "없음", "경고"],
          ["개별 상세", analytics.row_level_details_included ? "표시" : "비공개", "보호"]
        ]}
      />
    );
  }

  return (
    <Panel id="people-analytics" className="people-panel span-2" title="리포트" meta="실시간 리포트">
      <div className="people-panel-kicker">
        <BarChart3 size={15} />
        구성원, 입퇴사 관리, 구성원 등록 현황을 요약합니다.
      </div>
      {body}
    </Panel>
  );
}
