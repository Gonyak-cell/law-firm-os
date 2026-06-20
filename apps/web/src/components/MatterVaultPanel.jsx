import React from "react";
import { useEffect, useMemo, useState } from "react";
import { FileClock, FolderOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchMatterTimeline, fetchMatterVaultSummary } from "../data/apiClient.js";
import { DataTable, MetricCard, Panel } from "./primitives.jsx";

function timelineRows(entries = []) {
  return entries.map((entry) => [
    entry.event_id,
    entry.type,
    entry.title,
    entry.source_ref ?? "safe-summary"
  ]);
}

export function MatterVaultPanel({ matterId, liveCtx = "allow" }) {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setTimeline(null);
    if (!matterId) return undefined;
    Promise.all([
      fetchMatterVaultSummary({ matterId, ctx: liveCtx }),
      fetchMatterTimeline({ matterId, ctx: liveCtx })
    ]).then(([nextSummary, nextTimeline]) => {
      if (!cancelled) {
        setSummary(nextSummary);
        setTimeline(nextTimeline);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [matterId, liveCtx, refreshToken]);

  const item = summary?.kind === "data" ? summary.item : null;
  const entries = timeline?.kind === "data" ? timeline.item?.visible_entries ?? [] : [];
  const metrics = useMemo(
    () => ({
      documents: item?.document_count ?? 0,
      holds: item?.legal_hold_count ?? 0,
      privilege: item?.privilege_label_count ?? 0
    }),
    [item]
  );

  let body;
  if (!matterId || summary === null || timeline === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Loading Matter Vault</strong>
        Reading linked workspace metadata.
      </div>
    );
  } else if (summary.kind === "error" || timeline.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Matter Vault unavailable</strong>
        The live summary or timeline API did not return the expected safe shape.
      </div>
    );
  } else if (summary.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        No Vault counts or denied counts are exposed.
      </div>
    );
  } else if (summary.uiState === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        Matter Vault metadata is waiting for permission review.
      </div>
    );
  } else if (!item) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>No linked workspace</strong>
        This Matter has no active MatterVaultLink yet.
      </div>
    );
  } else {
    body = (
      <div className="vault-live-stack">
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>Safe projection only: document bytes, raw storage paths, and denied counts stay hidden.</span>
        </div>
        <DataTable columns={["Event", "Type", "Title", "Source"]} rows={timelineRows(entries)} />
      </div>
    );
  }

  return (
    <Panel className="span-2 matter-runtime-panel" title="Matter Vault" meta="/api/matters/:id/vault-summary">
      <div className="matter-vault-panel" data-mv-matter-vault-panel="true">
        <div className="clients-metric-grid">
          <MetricCard label="Documents" value={metrics.documents} delta="Vault-owned" tone="blue" />
          <MetricCard label="Legal hold" value={metrics.holds} delta="policy guarded" tone="purple" />
          <MetricCard label="Privilege" value={metrics.privilege} delta="search/AI excluded" tone="green" />
        </div>
        <div className="matter-vault-actions">
          <span>
            <FolderOpen size={15} />
            {item?.vault_workspace_id ?? "no workspace"}
          </span>
          <span>
            <FileClock size={15} />
            {entries.length} timeline events
          </span>
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
        {body}
      </div>
    </Panel>
  );
}
