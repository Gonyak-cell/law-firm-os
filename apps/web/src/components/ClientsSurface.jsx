import React from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { matters } from "../data/mockData.js";
import { fetchMasterDataRecords } from "../data/apiClient.js";
import { DataTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const CLIENTS_PERMISSION_REF = "ui_cmp_g2_party_clients_live";
const CLIENTS_AUDIT_HINT_REF = "ui_cmp_g2_clients_live_probe";

function countDistinct(values) {
  return new Set(values.filter(Boolean)).size;
}

function clientDisplayName(item) {
  return item.display_name ?? item.client_name ?? item.name ?? item.client_group_id ?? "Unnamed client";
}

function clientMembers(item) {
  return Array.isArray(item.member_entity_ids) ? item.member_entity_ids.length : "0";
}

function ClientsMockSurface({ labels }) {
  const clients = useMemo(() => {
    const byClient = new Map();
    for (const matter of matters) {
      const current = byClient.get(matter.client) ?? {
        client: matter.client,
        matters: 0,
        owners: new Set(),
        risk: matter.risk,
        value: matter.value
      };
      current.matters += 1;
      current.owners.add(matter.owner);
      if (matter.risk === "High") current.risk = "High";
      byClient.set(matter.client, current);
    }
    return [...byClient.values()];
  }, []);

  return (
    <section className="surface stack clients-surface">
      <PageHeader
        title={labels.clientsTitle}
        subtitle="Client groups, party owners, and matter activity in one workspace view."
        actions={
          <button className="secondary-button">
            <Search size={15} />
            Search
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Client groups" value={clients.length} delta="workspace rollup" tone="blue" />
        <MetricCard label="Active matters" value={matters.length} delta="across listed clients" tone="green" />
        <MetricCard label="Owners" value={countDistinct(matters.map((matter) => matter.owner))} delta="responsible users" tone="purple" />
      </div>
      <Panel title="Client Directory" meta="Workspace rollup">
        <DataTable
          columns={["Client", "Matters", "Owners", "Risk", "Trust/WIP"]}
          rows={clients.map((client) => [
            client.client,
            String(client.matters),
            String(client.owners.size),
            client.risk,
            client.value
          ])}
        />
      </Panel>
    </section>
  );
}

// Live mode has no mock fallback. The surface renders only permission-gated
// /master-data/records?model_type=ClientGroup responses from apps/api.
function ClientsLiveSurface({ labels, liveCtx }) {
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
      <div className="live-data-state live-data-error">
        <strong>Client data unavailable</strong>
        The API request failed or returned an unexpected response. Live mode has no mock fallback — start the API
        and reload.
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
        subtitle="Live ClientGroup records from the Law Firm OS Master Data API."
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

export function ClientsSurface({ labels, dataMode = "mock", liveCtx = "allow" }) {
  if (dataMode === "live") {
    return <ClientsLiveSurface labels={labels} liveCtx={liveCtx} />;
  }
  return <ClientsMockSurface labels={labels} />;
}
