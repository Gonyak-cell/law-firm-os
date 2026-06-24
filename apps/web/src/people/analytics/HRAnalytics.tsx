import React from "react";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxAnalytics } from "../hrxApiClient.ts";

function summaryState(value) {
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
    body = <div className="live-data-state live-data-loading">구성원 정보를 불러오는 중입니다.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 정보를 불러올 수 없습니다.</div>;
  } else {
    const analytics = result.analytics;
    body = (
      <DataTable
        columns={["항목", "상태", "표시 범위"]}
        rows={[
          ["구성원 현황", summaryState(analytics.headcount.active), "구성원"],
          ["퇴사 관련 현황", summaryState(analytics.turnover), "구성원"],
          ["채용 현황", summaryState(analytics.recruiting_funnel), "구성원"],
          ["업무 여력", summaryState(analytics.workload), "요약"],
          ["개별 상세", analytics.row_level_details_included ? "표시" : "비공개", "보호"]
        ]}
      />
    );
  }

  return (
    <Panel className="people-panel span-2" title="구성원 현황" meta="업무 요약">
      <div className="people-panel-kicker">
        <BarChart3 size={15} />
        업무 요약
      </div>
      {body}
    </Panel>
  );
}
