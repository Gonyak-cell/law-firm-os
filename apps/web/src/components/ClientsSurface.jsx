import React from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { fetchMasterDataRecords } from "../data/apiClient.js";
import { DataTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const CLIENTS_PERMISSION_REF = "ui_cmp_g2_party_clients_live";
const CLIENTS_AUDIT_HINT_REF = "ui_cmp_g2_clients_live_probe";

function clientDisplayName(item) {
  return item.display_name ?? item.client_name ?? item.name ?? item.client_group_id ?? "Unnamed client";
}

function clientMembers(item) {
  return Array.isArray(item.member_entity_ids) ? item.member_entity_ids.length : "0";
}

export function ClientsSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchMasterDataRecords({
      ctx: liveCtx,
      modelType: "ClientGroup",
      permissionRef: CLIENTS_PERMISSION_REF,
      auditHintRef: CLIENTS_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const liveStats = useMemo(() => {
    if (!result || result.kind !== "data") {
      return { total: 0, review: 0, omitted: 0 };
    }
    return {
      total: result.items.length,
      review: result.items.filter((item) => item.status === "review_required").length,
      omitted: result.pageInfo?.omitted_item_count ?? 0
    };
  }, [result]);

  let body;
  if (result === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Loading client groups</strong>
        Fetching ClientGroup records from the Master Data API.
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-unavailable live-data-error">
        <strong>Client data unavailable</strong>
        The API request failed or returned an unexpected response. Start the API and reload.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        The permission gate blocked this ClientGroup request. No client rows are shown.
      </div>
    );
  } else if (result.uiState === "review_required" || result.outcome === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        This ClientGroup request requires review before the client rows can be displayed.
      </div>
    );
  } else if (result.uiState === "empty" || result.items.length === 0) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>No client groups</strong>
        The live query returned no ClientGroup records for this tenant.
      </div>
    );
  } else {
    body = (
      <div className="clients-live-stack">
        {liveStats.review > 0 && (
          <div className="client-review-strip">
            <ShieldCheck size={15} />
            <span>{liveStats.review} client group needs review before downstream write workflows proceed.</span>
          </div>
        )}
        <DataTable
          columns={["Client group", "Status", "Primary party", "Members", "Matter"]}
          rows={result.items.map((item) => [
            clientDisplayName(item),
            item.status ?? "active",
            item.primary_entity_id ?? item.primary_party_id ?? "—",
            String(clientMembers(item)),
            item.matter_core_enrichment?.matter_title ?? "—"
          ])}
        />
      </div>
    );
  }

  return (
    <section className="surface stack clients-surface" data-cmp-g2-live-clients="true">
      <PageHeader
        title={labels.clientsTitle}
        subtitle="Live ClientGroup records from the matter Master Data API."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Client groups" value={liveStats.total} delta="permission-gated rows" tone="blue" />
        <MetricCard label="Review" value={liveStats.review} delta="client groups flagged" tone="purple" />
        <MetricCard label="Omitted" value={liveStats.omitted} delta="permission trimming" tone="red" />
      </div>
      <div className="clients-runtime-grid">
        <Panel className="span-2" title="Client Groups" meta="API-backed runtime state">
          {body}
        </Panel>
        <Panel title="Evidence Binding" meta={CLIENTS_AUDIT_HINT_REF}>
          <div className="client-evidence-list">
            <span>model_type</span>
            <strong>ClientGroup</strong>
            <span>permission_ref</span>
            <strong>{CLIENTS_PERMISSION_REF}</strong>
            <span>ui_state</span>
            <strong>{result?.kind === "data" ? result.uiState ?? "primary_interaction" : "loading"}</strong>
          </div>
        </Panel>
      </div>
    </section>
  );
}
