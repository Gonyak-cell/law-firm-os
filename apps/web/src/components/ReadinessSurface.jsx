import React from "react";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchUiReadinessChecks } from "../data/apiClient.js";
import { CompactTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const READINESS_PERMISSION_REF = "ui_cmp_g11_readiness_live";
const READINESS_AUDIT_HINT_REF = "ui_cmp_g11_readiness_probe";

export function ReadinessSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchUiReadinessChecks({
      ctx: liveCtx,
      permissionRef: READINESS_PERMISSION_REF,
      auditHintRef: READINESS_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const checks = result?.kind === "data" ? result.items : [];
  const metrics = useMemo(
    () => ({
      checks: checks.length,
      routes: new Set(checks.map((item) => item.route_id)).size,
      apiBacked: checks.filter((item) => item.api_backed_surface === true).length
    }),
    [checks]
  );

  let body;
  if (result === null) body = <div className="live-data-state live-data-loading"><strong>Loading UI checks</strong> Reading UI readiness from the API.</div>;
  else if (result.kind === "error") body = <div className="live-data-state live-data-error"><strong>UI readiness API unavailable</strong> Start the Law Firm OS API and reload.</div>;
  else if (result.uiState === "denied") body = <div className="live-data-state live-data-denied"><strong>Access denied</strong> The permission gate blocked this readiness request.</div>;
  else if (result.uiState === "review_required" || result.outcome === "review_required") body = <div className="live-data-state live-data-review"><strong>Review required</strong> This readiness request needs review.</div>;
  else body = (
    <CompactTable
      columns={["TUW", "Route", "Surface", "Status"]}
      rows={checks.slice(0, 12).map((item) => [item.tuw_id, item.route_id, item.ui_surface_id, item.status])}
    />
  );

  return (
    <section className="surface stack readiness-surface" data-cmp-g11-ui-readiness="true">
      <PageHeader
        eyebrow="CMP-G11"
        title={labels.readinessTitle}
        subtitle="Runtime-backed UI readiness checks for navigation, API fetches, permission states, review states, responsive coverage, and evidence handoff."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="G11 checks" value={metrics.checks} delta="TUW mapped" tone="blue" />
        <MetricCard label="Routes" value={metrics.routes} delta="surface coverage" tone="green" />
        <MetricCard label="API-backed" value={metrics.apiBacked} delta="no mock fallback" tone="purple" />
      </div>
      <div className="readiness-grid">
        <Panel className="span-2" title="UI Runtime Boundary" meta="/api/ui/readiness">
          <div className="portal-safe-strip">
            <ShieldCheck size={15} />
            <span>PermissionDeniedState, ReviewRequiredState, security badges, i18n, responsive coverage, and critical paths are tracked as runtime records.</span>
          </div>
        </Panel>
        <Panel className="span-2" title="Readiness Checks" meta="first 12 of 48">
          {body}
        </Panel>
        <Panel title="Adjudication" meta="owner decision pending">
          <div className="matter-boundary-card">
            <CheckCircle2 size={20} />
            <strong>Ready for review, not launch-approved</strong>
            <span>Final product and go-live gates remain outside this UI claim.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
