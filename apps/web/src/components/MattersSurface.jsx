import React from "react";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchMatterRecords } from "../data/apiClient.js";
import { DataTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";
import { MatterOpeningWizard } from "./MatterOpeningWizard.jsx";
import { MatterTeamRoster } from "./MatterTeamRoster.jsx";

const MATTER_PERMISSION_REF = "ui_cmp_g4_matter_live";
const MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_probe";

function matterRows(items) {
  return items.map((item) => [
    item.matter_number ?? item.matter_id,
    item.title,
    item.status,
    String(item.document_count ?? 0),
    String(item.team_member_count ?? 0),
    item.wip_status ?? "not_started",
    item.risk_level ?? "standard",
    item.production_ready_claim ? "blocked" : "gated"
  ]);
}

export function MattersSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [createdItems, setCreatedItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchMatterRecords({
      ctx: liveCtx,
      permissionRef: MATTER_PERMISSION_REF,
      auditHintRef: MATTER_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const matters = useMemo(() => {
    const fetched = result?.kind === "data" ? result.items : [];
    const byId = new Map();
    for (const item of fetched) byId.set(item.matter_id, item);
    for (const item of createdItems) byId.set(item.matter_id, item);
    return [...byId.values()];
  }, [createdItems, result]);

  const metrics = useMemo(
    () => ({
      total: matters.length,
      opening: matters.filter((item) => item.status === "opening").length,
      gated: matters.filter((item) => item.production_ready_claim !== true).length
    }),
    [matters]
  );

  let body;
  if (result === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Loading matters</strong>
        Reading Matter records from the Matter Core API.
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Matter API unavailable</strong>
        Start the Law Firm OS API and reload this live surface.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        The permission gate blocked this Matter request. No matter rows are shown.
      </div>
    );
  } else if (result.uiState === "review_required" || result.outcome === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        This Matter request requires review before rows can be displayed.
      </div>
    );
  } else if (result.uiState === "empty" || matters.length === 0) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>No matters</strong>
        The live query returned no Matter records for this tenant.
      </div>
    );
  } else {
    body = (
      <div className="matter-live-stack">
        <div className="matter-review-strip">
          <ShieldCheck size={15} />
          <span>Runtime writes are enabled; production-ready claim remains gated.</span>
        </div>
        <DataTable
          columns={["Matter", "Title", "Status", "Docs", "Team", "WIP", "Risk", "Release"]}
          rows={matterRows(matters)}
        />
      </div>
    );
  }

  return (
    <section className="surface stack matters-surface" data-cmp-g4-live-matters="true">
      <PageHeader
        eyebrow="CMP-G4"
        title={labels.mattersTitle}
        subtitle="Matter Core runtime with permission-gated read and write paths."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Matters" value={metrics.total} delta="runtime rows" tone="blue" />
        <MetricCard label="Opening" value={metrics.opening} delta="clearance-backed" tone="green" />
        <MetricCard label="Gated" value={metrics.gated} delta="no go-live claim" tone="purple" />
      </div>
      <div className="matter-runtime-grid">
        <Panel className="span-2 matter-runtime-panel" title="Matter Home" meta="/api/matters">
          {body}
        </Panel>
        <Panel className="matter-runtime-panel" title="Evidence Binding" meta={MATTER_AUDIT_HINT_REF}>
          <div className="client-evidence-list">
            <span>permission_ref</span>
            <strong>{MATTER_PERMISSION_REF}</strong>
            <span>count_leak</span>
            <strong>{result?.kind === "data" && result.countLeakPrevented ? "prevented" : "pending"}</strong>
            <span>release</span>
            <strong>{result?.kind === "data" && result.productionReadyClaim ? "blocked" : "gated"}</strong>
          </div>
        </Panel>
        <MatterOpeningWizard liveCtx={liveCtx} onCreated={(item) => setCreatedItems((current) => [...current, item])} />
        <MatterTeamRoster matters={matters} liveCtx={liveCtx} />
        <Panel className="matter-runtime-panel" title="Runtime Boundary" meta="R4 write-ready">
          <div className="matter-boundary-card">
            <BriefcaseBusiness size={20} />
            <strong>R5/R6 owner-decision-ready</strong>
            <span>Owner approval and release gates remain outside this UI claim.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
