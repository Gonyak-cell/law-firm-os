import React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { backendCapabilities, capabilitySummary } from "../data/capabilityMap.js";
import {
  fetchAiReviewQueue,
  fetchAnalyticsDashboards,
  fetchCrmOpportunities,
  fetchDataRoomProjections,
  fetchEnterpriseReadinessItems,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchIntakeRequests,
  fetchMasterDataRecords,
  fetchMatterRecords,
  fetchPortalDashboard,
  fetchPortalRfi,
  fetchUiReadinessChecks,
  fetchVaultDocuments
} from "../data/apiClient.js";
import { fetchHrxPeopleOverview } from "../people/hrxApiClient.ts";
import { MetricCard, PageHeader, Panel } from "./primitives.jsx";

const statusMeta = {
  live: { label: "live", icon: CheckCircle2 },
  unavailable: { label: "unavailable", icon: AlertTriangle },
  denied: { label: "denied", icon: LockKeyhole },
  review: { label: "review", icon: ShieldCheck },
  guarded: { label: "guarded", icon: ShieldCheck },
  loading: { label: "loading", icon: RefreshCw }
};

function normalizeStatus(result) {
  if (!result) return "loading";
  if (result.kind === "error") return "unavailable";
  if (result.kind === "step_up_required") return "guarded";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review";
  if (result.kind === "data") return "live";
  return "guarded";
}

async function fetchHealth() {
  try {
    const response = await fetch("/api/health", { credentials: "same-origin" });
    const body = await response.json();
    if (!response.ok || !body || typeof body !== "object") return { kind: "error" };
    return { kind: "data", uiState: "allowed", outcome: body.status ?? "ok", items: [body] };
  } catch {
    return { kind: "error" };
  }
}

function countItems(result) {
  if (!result || result.kind !== "data") return 0;
  if (Array.isArray(result.items)) return result.items.length;
  if (Array.isArray(result.employees)) return result.employees.length;
  if (Array.isArray(result.approvals)) return result.approvals.length;
  return 1;
}

function safeResultSummary(result) {
  if (!result) return "waiting for runtime";
  if (result.kind === "error") return "API unavailable or unexpected response";
  if (result.kind === "step_up_required") return "server step-up required";
  if (result.uiState === "denied") return "permission denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review required";
  return `${countItems(result)} visible safe row${countItems(result) === 1 ? "" : "s"}`;
}

function buildProbeMap(results) {
  const byId = new Map(results.map((result) => [result.id, result]));
  return backendCapabilities.map((capability) => ({
    ...capability,
    result: byId.get(capability.id)?.result ?? null,
    status: normalizeStatus(byId.get(capability.id)?.result)
  }));
}

function CapabilityCard({ capability, onOpen }) {
  const meta = statusMeta[capability.status] ?? statusMeta.guarded;
  const StatusIcon = meta.icon;
  const endpointCount = capability.readEndpoints.length + capability.actionEndpoints.length + capability.auditEndpoints.length;

  return (
    <article className={`capability-card ${capability.status}`} data-capability-id={capability.id}>
      <header>
        <div>
          <span className="eyebrow">{capability.owner}</span>
          <h2>{capability.label}</h2>
        </div>
        <span className={`capability-status ${capability.status}`}>
          <StatusIcon size={14} />
          {meta.label}
        </span>
      </header>
      <p>{safeResultSummary(capability.result)}</p>
      <div className="capability-counts">
        <span>{capability.readEndpoints.length} read</span>
        <span>{capability.actionEndpoints.length} action</span>
        <span>{capability.auditEndpoints.length} audit</span>
        <span>{endpointCount} total</span>
      </div>
      <div className="endpoint-strip" aria-label={`${capability.label} endpoint coverage`}>
        {[...capability.readEndpoints, ...capability.actionEndpoints, ...capability.auditEndpoints].slice(0, 8).map((endpoint) => (
          <code key={endpoint}>{endpoint}</code>
        ))}
      </div>
      <footer>
        <span>{capability.boundary}</span>
        <button className="secondary-button" type="button" onClick={() => onOpen(capability.route)}>
          Open
          <ArrowRight size={14} />
        </button>
      </footer>
    </article>
  );
}

export function HomeSurface({ labels, setView, liveCtx = "allow" }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setResults([]);
    const args = { ctx: liveCtx };
    Promise.all([
      fetchHealth().then((result) => ({ id: "api-health", result })),
      fetchMasterDataRecords({ ...args, modelType: "ClientGroup", limit: 10 }).then((result) => ({ id: "clients-master-data", result })),
      fetchMatterRecords(args).then((result) => ({ id: "matter-core", result })),
      fetchVaultDocuments(args).then((result) => ({ id: "vault-dms", result })),
      Promise.all([fetchCrmOpportunities(args), fetchIntakeRequests(args)]).then(([opportunities, requests]) => ({
        id: "crm-intake",
        result: opportunities.kind === "error" ? opportunities : { ...opportunities, items: [...(opportunities.items ?? []), ...(requests.items ?? [])] }
      })),
      Promise.all([fetchFinanceTimeEntries(args), fetchFinanceInvoices(args), fetchFinanceArAging(args)]).then(([time, invoices, aging]) => ({
        id: "finance",
        result: time.kind === "error" ? time : { ...time, items: [...(time.items ?? []), ...(invoices.items ?? []), ...(aging.items ?? [])] }
      })),
      fetchAnalyticsDashboards(args).then((result) => ({ id: "analytics", result })),
      fetchAiReviewQueue(args).then((result) => ({ id: "ai-governance", result })),
      Promise.all([fetchPortalDashboard(args), fetchPortalRfi(args), fetchDataRoomProjections(args)]).then(([dashboard, rfi, dataRoom]) => ({
        id: "portal-data-room",
        result: dashboard.kind === "error" ? dashboard : { ...dashboard, items: [...(dashboard.items ?? []), ...(rfi.items ?? []), ...(dataRoom.items ?? [])] }
      })),
      fetchHrxPeopleOverview().then((result) => ({ id: "people-hrx", result })),
      fetchUiReadinessChecks(args).then((result) => ({ id: "ui-readiness", result })),
      fetchEnterpriseReadinessItems(args).then((result) => ({ id: "enterprise-ops", result }))
    ]).then((nextResults) => {
      if (!cancelled) setResults(nextResults);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const capabilities = useMemo(() => buildProbeMap(results), [results]);
  const liveCount = capabilities.filter((capability) => capability.status === "live").length;
  const guardedCount = capabilities.filter((capability) => ["denied", "review", "guarded"].includes(capability.status)).length;
  const unavailableCount = capabilities.filter((capability) => capability.status === "unavailable").length;

  return (
    <section className="surface stack lcx-web-command-center" data-lcx-web-command-center="true">
      <PageHeader
        eyebrow="LCX-WEB"
        title="matter command center"
        subtitle="Canonical apps/web product UI for every backend capability. Each feature is shown as live, unavailable, denied, review, or guarded without mock fallback."
        actions={
          <button className="secondary-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="metric-grid">
        <MetricCard label="Backend domains" value={capabilitySummary.domains} delta={`${liveCount} live now`} tone="blue" />
        <MetricCard label="Read endpoints" value={capabilitySummary.readEndpoints} delta="visible" tone="green" />
        <MetricCard label="Action endpoints" value={capabilitySummary.actionEndpoints} delta="guarded" tone="purple" />
        <MetricCard label="Release claims" value="false" delta="owner/public/go-live" tone="red" />
      </div>
      <div className="command-center-grid" data-lcx-web-capability-count={capabilities.length}>
        {capabilities.map((capability) => (
          <CapabilityCard key={capability.id} capability={capability} onOpen={setView} />
        ))}
      </div>
      <Panel title="Boundary Ledger" meta="release claims remain false" className="span-2">
        <div className="boundary-ledger">
          <span>production go-live: {String(capabilitySummary.productionGoLive)}</span>
          <span>public release: {String(capabilitySummary.publicRelease)}</span>
          <span>owner approval: {String(capabilitySummary.ownerApproval)}</span>
          <span>guarded states visible: {guardedCount}</span>
          <span>unavailable states visible: {unavailableCount}</span>
        </div>
      </Panel>
    </section>
  );
}
