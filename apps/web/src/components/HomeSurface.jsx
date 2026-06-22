import React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { backendCapabilities, capabilitySummary } from "../data/capabilityMap.js";
import {
  fetchAiReviewQueue,
  fetchAnalyticsDashboards,
  fetchCrmOpportunities,
  fetchDataRoomProjections,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchIntakeRequests,
  fetchMasterDataRecords,
  fetchMatterRecords,
  fetchPortalDashboard,
  fetchPortalRfi,
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

function itemsFromResult(result) {
  if (!result || result.kind !== "data") return [];
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result.employees)) return result.employees;
  if (Array.isArray(result.approvals)) return result.approvals;
  return [result];
}

function combinePillarResults(results) {
  const liveResults = results.filter((result) => result?.kind === "data");
  if (liveResults.length > 0) {
    return {
      kind: "data",
      uiState: "allowed",
      outcome: "allowed",
      items: liveResults.flatMap(itemsFromResult)
    };
  }
  return (
    results.find((result) => result?.uiState === "denied") ??
    results.find((result) => result?.uiState === "review_required" || result?.outcome === "review_required") ??
    results.find((result) => result?.kind === "step_up_required") ??
    results.find((result) => result?.kind === "error") ??
    { kind: "error" }
  );
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
        {[...capability.readEndpoints, ...capability.actionEndpoints, ...capability.auditEndpoints].slice(0, 8).map((endpoint, index) => (
          <code key={`${endpoint}-${index}`}>{endpoint}</code>
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
      Promise.all([
        fetchMasterDataRecords({ ...args, modelType: "ClientGroup", limit: 10 }),
        fetchCrmOpportunities(args),
        fetchIntakeRequests(args),
        fetchPortalDashboard(args),
        fetchPortalRfi(args)
      ]).then((results) => ({ id: "client", result: combinePillarResults(results) })),
      Promise.all([
        fetchMatterRecords(args),
        fetchFinanceTimeEntries(args),
        fetchFinanceInvoices(args),
        fetchFinanceArAging(args),
        fetchAnalyticsDashboards(args),
        fetchAiReviewQueue(args)
      ]).then((results) => ({ id: "matter", result: combinePillarResults(results) })),
      fetchHrxPeopleOverview().then((result) => ({ id: "people", result })),
      Promise.all([fetchVaultDocuments(args), fetchDataRoomProjections(args)]).then((results) => ({
        id: "vault",
        result: combinePillarResults(results)
      }))
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
        title="Client Matter People Vault"
        subtitle="Canonical apps/web product UI. Missing APIs and permissions stay visible as live, unavailable, denied, review, or guarded states."
        actions={
          <button className="secondary-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="metric-grid">
        <MetricCard label="Product axes" value={capabilitySummary.domains} delta={`${liveCount} live now`} tone="blue" />
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
