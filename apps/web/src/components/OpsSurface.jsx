import React from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, TrafficCone } from "lucide-react";
import { fetchEnterpriseReadinessItems } from "../data/apiClient.js";
import { CompactTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const ENTERPRISE_PERMISSION_REF = "ui_cmp_g12_enterprise_live";
const ENTERPRISE_AUDIT_HINT_REF = "ui_cmp_g12_enterprise_probe";

export function OpsSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchEnterpriseReadinessItems({
      ctx: liveCtx,
      permissionRef: ENTERPRISE_PERMISSION_REF,
      auditHintRef: ENTERPRISE_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const items = result?.kind === "data" ? result.items : [];
  const metrics = useMemo(
    () => ({
      checks: items.length,
      ownerPending: items.filter((item) => item.owner_decision_required === true).length,
      goLive: items.filter((item) => item.go_live_approved === true).length
    }),
    [items]
  );

  let body;
  if (result === null) body = <div className="live-data-state live-data-loading"><strong>Loading enterprise readiness</strong> Reading owner-decision evidence from the API.</div>;
  else if (result.kind === "error") body = <div className="live-data-state live-data-error"><strong>Enterprise API unavailable</strong> Start the Law Firm OS API and reload.</div>;
  else if (result.uiState === "denied") body = <div className="live-data-state live-data-denied"><strong>Access denied</strong> The permission gate blocked this enterprise request.</div>;
  else if (result.uiState === "review_required" || result.outcome === "review_required") body = <div className="live-data-state live-data-review"><strong>Review required</strong> Enterprise readiness needs review before rows can be shown.</div>;
  else body = (
    <CompactTable
      columns={["TUW", "Control", "Status", "Production"]}
      rows={items.slice(0, 12).map((item) => [item.tuw_id, item.item_type, item.status, item.production_ready_claim ? "claimed" : "blocked"])}
    />
  );

  return (
    <section className="surface stack ops-surface" data-cmp-g12-enterprise-readiness="true">
      <PageHeader
        eyebrow="CMP-G12"
        title={labels.opsTitle}
        subtitle="Enterprise readiness evidence for SSO, SCIM, MFA, observability, DR, security, UAT, release candidate, cutover, and hypercare gates."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="G12 controls" value={metrics.checks} delta="TUW mapped" tone="blue" />
        <MetricCard label="Owner pending" value={metrics.ownerPending} delta="decision required" tone="purple" />
        <MetricCard label="Go-live approved" value={metrics.goLive} delta="must remain 0" tone="red" />
      </div>
      <div className="readiness-grid">
        <Panel className="span-2" title="Enterprise Boundary" meta="/api/enterprise/readiness">
          <div className="portal-safe-strip">
            <ShieldCheck size={15} />
            <span>Production-ready and go-live claims remain blocked until owner approval and release gates pass.</span>
          </div>
        </Panel>
        <Panel className="span-2" title="Owner-Decision Evidence" meta="first 12 of 28">
          {body}
        </Panel>
        <Panel title="Go/No-Go" meta="blocked by design">
          <div className="matter-boundary-card">
            <TrafficCone size={20} />
            <strong>No go-live approval recorded</strong>
            <span>Release candidate evidence is owner-decision-ready, not production-ready.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
