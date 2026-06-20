import React from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Share2 } from "lucide-react";
import { fetchDataRoomProjections, fetchPortalDashboard, fetchPortalRfi } from "../data/apiClient.js";
import { CompactTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const PORTAL_PERMISSION_REF = "ui_cmp_g10_portal_live";
const PORTAL_AUDIT_HINT_REF = "ui_cmp_g10_portal_probe";

function LiveState({ result, label }) {
  if (result === null) return <div className="live-data-state live-data-loading"><strong>Loading {label}</strong> Reading live portal data from the API.</div>;
  if (result.kind === "error") return <div className="live-data-state live-data-error"><strong>{label} API unavailable</strong> Start the Law Firm OS API and reload.</div>;
  if (result.uiState === "denied") return <div className="live-data-state live-data-denied"><strong>Access denied</strong> The permission gate blocked this external surface.</div>;
  if (result.uiState === "review_required" || result.outcome === "review_required") return <div className="live-data-state live-data-review"><strong>Review required</strong> External access needs review before rows can be shown.</div>;
  return null;
}

export function PortalSurface({ labels, liveCtx = "allow" }) {
  const [dashboard, setDashboard] = useState(null);
  const [rfi, setRfi] = useState(null);
  const [dataRoom, setDataRoom] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDashboard(null);
    setRfi(null);
    setDataRoom(null);
    Promise.all([
      fetchPortalDashboard({ ctx: liveCtx, permissionRef: PORTAL_PERMISSION_REF, auditHintRef: PORTAL_AUDIT_HINT_REF }),
      fetchPortalRfi({ ctx: liveCtx, permissionRef: PORTAL_PERMISSION_REF, auditHintRef: PORTAL_AUDIT_HINT_REF }),
      fetchDataRoomProjections({ ctx: liveCtx, permissionRef: PORTAL_PERMISSION_REF, auditHintRef: PORTAL_AUDIT_HINT_REF })
    ]).then(([nextDashboard, nextRfi, nextDataRoom]) => {
      if (!cancelled) {
        setDashboard(nextDashboard);
        setRfi(nextRfi);
        setDataRoom(nextDataRoom);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const dashboardItems = dashboard?.kind === "data" ? dashboard.items : [];
  const rfiItems = rfi?.kind === "data" ? rfi.items : [];
  const projectionItems = dataRoom?.kind === "data" ? dataRoom.items : [];
  const metrics = useMemo(
    () => ({
      externalViews: dashboardItems.reduce((sum, item) => sum + Number(item.matter_count ?? 0), 0),
      openRfi: rfiItems.filter((item) => item.status === "open").length,
      projections: projectionItems.length
    }),
    [dashboardItems, rfiItems, projectionItems]
  );
  const blocking = <LiveState result={dashboard ?? rfi ?? dataRoom} label="Portal" />;

  return (
    <section className="surface stack portal-surface" data-cmp-g10-portal-runtime="true">
      <PageHeader
        eyebrow="CMP-G10"
        title={labels.portalTitle}
        subtitle="External portal and data-room projections backed by permission-gated API reads."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Client matters" value={metrics.externalViews} delta="aggregate only" tone="blue" />
        <MetricCard label="Open RFI" value={metrics.openRfi} delta="client requests" tone="purple" />
        <MetricCard label="Data room sync" value={metrics.projections} delta="ACL applied" tone="green" />
      </div>
      <div className="portal-runtime-grid">
        <Panel className="span-2 portal-panel" title="External Access Boundary" meta="/api/portal/dashboard">
          {blocking ?? (
            <div className="portal-safe-strip">
              <ShieldCheck size={15} />
              <span>External ACL, DMS ACL inheritance, watermark, and metadata-only projections are enforced before client exposure.</span>
            </div>
          )}
        </Panel>
        <Panel title="Client Dashboard" meta="aggregate projection">
          <CompactTable
            columns={["Projection", "Client", "Matters", "Open RFI"]}
            rows={dashboardItems.map((item) => [item.dashboard_projection_id, item.client_group_id, item.matter_count, item.open_rfi_count])}
          />
        </Panel>
        <Panel title="RFI Queue" meta="/api/portal/rfi">
          <CompactTable
            columns={["RFI", "Matter", "Status", "External user"]}
            rows={rfiItems.map((item) => [item.rfi_request_id, item.matter_id, item.status, item.external_user_id])}
          />
        </Panel>
        <Panel title="Data Room Projection" meta="/api/data-room/projections">
          <CompactTable
            columns={["Projection", "Room", "Status", "Bytes"]}
            rows={projectionItems.map((item) => [item.data_room_projection_id, item.data_room_id, item.status, item.document_bytes_included ? "included" : "omitted"])}
          />
        </Panel>
        <Panel title="Secure Link Boundary" meta="R4 write-ready">
          <div className="matter-boundary-card">
            <Share2 size={20} />
            <strong>Token and document bytes omitted</strong>
            <span>Owner approval and release gates remain outside this UI claim.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
