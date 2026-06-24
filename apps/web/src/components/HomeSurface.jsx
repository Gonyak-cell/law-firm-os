import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { backendCapabilities } from "../data/capabilityMap.js";
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
import { PageHeader } from "./primitives.jsx";

function normalizeStatus(result) {
  if (!result) return "loading";
  if (result.kind === "error") return "unavailable";
  if (result.kind === "step_up_required") return "guarded";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review";
  if (result.kind === "data") return "live";
  return "guarded";
}

function surfaceStateText(status) {
  if (status === "loading") return "확인 중";
  if (status === "unavailable") return "일시적으로 불러오지 못했습니다";
  if (status === "denied") return "접근 권한 필요";
  if (status === "review") return "검토 필요";
  if (status === "guarded") return "추가 확인 필요";
  return null;
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

function WorkAreaRow({ capability, onOpen }) {
  const stateText = surfaceStateText(capability.status);

  return (
    <article className="work-area-row" data-capability-id={capability.id}>
      <div className="work-area-main">
        <h2>{capability.label}</h2>
        <p>{capability.boundary}</p>
      </div>
      {stateText && <small className={`work-area-note ${capability.status}`}>{stateText}</small>}
      <button className="secondary-button work-area-open" type="button" onClick={() => onOpen(capability.route)}>
        열기
        <ArrowRight size={14} />
      </button>
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

  return (
    <section className="surface stack lcx-web-command-center" data-lcx-web-command-center="true">
      <PageHeader
        title="Client Matter People Vault"
        subtitle="Client, Matter, People, Vault 업무를 한 곳에서 확인합니다. 권한이 필요한 정보는 표시하지 않습니다."
        actions={
          <button className="secondary-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="work-area-list" data-lcx-web-capability-count={capabilities.length}>
        {capabilities.map((capability) => (
          <WorkAreaRow key={capability.id} capability={capability} onOpen={setView} />
        ))}
      </div>
    </section>
  );
}
