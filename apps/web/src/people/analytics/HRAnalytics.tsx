import React from "react";
import { useEffect, useState } from "react";
import { Activity, BarChart3, BriefcaseBusiness } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxAnalytics } from "../hrxApiClient.ts";

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
    body = <div className="live-data-state live-data-loading">Loading tenant-scoped HR analytics</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Analytics API failed. No static metric fallback is rendered.</div>;
  } else {
    const analytics = result.analytics;
    body = (
      <>
        <div className="hrx-analytics-strip">
          <div>
            <Activity size={16} />
            <strong>{analytics.headcount.total}</strong>
            <span>Headcount</span>
          </div>
          <div>
            <BarChart3 size={16} />
            <strong>{analytics.leave.approved_requests}</strong>
            <span>Approved leave</span>
          </div>
          <div>
            <BriefcaseBusiness size={16} />
            <strong>{analytics.workload.total_hours}</strong>
            <span>Workload hours</span>
          </div>
        </div>
        <DataTable
          columns={["Metric", "Value", "Scope"]}
          rows={[
            ["Active employees", analytics.headcount.active, "tenant"],
            ["Turnover rate", `${analytics.turnover.turnover_rate_pct}%`, "tenant"],
            ["Applications", analytics.recruiting_funnel.total_applications, "tenant"],
            ["Avg capacity", `${analytics.workload.average_capacity_pct}%`, "aggregated"]
          ]}
        />
      </>
    );
  }

  return (
    <Panel className="people-panel span-2" title="HR Analytics" meta="/api/hrx/analytics">
      <div className="people-panel-kicker">
        <BarChart3 size={15} />
        Tenant-scoped analytics read model
      </div>
      {body}
    </Panel>
  );
}
