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
  if (status === "loading") return "상태 확인 중";
  if (status === "unavailable") return "연결 확인 필요";
  if (status === "denied") return "접근 권한 필요";
  if (status === "review") return "검토 필요";
  if (status === "guarded") return "확인 필요";
  return null;
}

function capabilityCount(capability) {
  return itemsFromResult(capability.result).length;
}

function capabilityStatusMessage(capability) {
  const count = capabilityCount(capability);
  if (capability.status === "loading") return `${capability.label} 상태를 확인하는 중입니다.`;
  if (capability.status === "unavailable") return `${capability.label} 목록을 불러오지 못했습니다. 로컬 런타임 또는 권한 컨텍스트를 확인하세요.`;
  if (capability.status === "denied") return `${capability.label} 접근 권한이 없습니다. 권한 요청 또는 사용자 컨텍스트를 확인하세요.`;
  if (capability.status === "review") return `${capability.label} 검토가 필요합니다. 담당자 승인 대기열을 확인하세요.`;
  if (capability.status === "guarded") return `${capability.label} 추가 확인이 필요합니다.`;
  if (count === 0) return `${capability.label}에 표시할 항목이 없습니다.`;
  return `${count}개 항목을 확인했습니다.`;
}

function statusBadgeLabel(status) {
  if (status === "live") return "정상";
  if (status === "loading") return "확인 중";
  if (status === "unavailable") return "실패";
  if (status === "denied") return "권한 없음";
  if (status === "review") return "검토";
  return "확인 필요";
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
  const guardedResult =
    results.find((result) => result?.uiState === "denied") ??
    results.find((result) => result?.uiState === "review_required" || result?.outcome === "review_required") ??
    results.find((result) => result?.kind === "step_up_required");
  if (guardedResult) return guardedResult;

  const liveResults = results.filter((result) => result?.kind === "data");
  if (liveResults.length > 0) {
    return {
      kind: "data",
      uiState: "allowed",
      outcome: "allowed",
      items: liveResults.flatMap(itemsFromResult)
    };
  }
  return results.find((result) => result?.kind === "error") ?? { kind: "error" };
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

function QueueRow({ title, capability, onOpen }) {
  return (
    <button type="button" className={`home-queue-row ${capability.status}`} onClick={() => onOpen(capability.route)}>
      <span>
        <strong>{title}</strong>
        <small>{capabilityStatusMessage(capability)}</small>
      </span>
      <em>{statusBadgeLabel(capability.status)}</em>
      <ArrowRight size={15} />
    </button>
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
      fetchHrxPeopleOverview(args).then((result) => ({ id: "people", result })),
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
  const capabilityById = useMemo(() => new Map(capabilities.map((capability) => [capability.id, capability])), [capabilities]);
  const matterCapability = capabilityById.get("matter") ?? capabilities[0];
  const peopleCapability = capabilityById.get("people") ?? capabilities[0];
  const vaultCapability = capabilityById.get("vault") ?? capabilities[0];
  const failedCount = capabilities.filter((capability) => capability.status === "unavailable").length;
  const reviewCount = capabilities.filter((capability) => capability.status === "review" || capability.status === "guarded").length;

  return (
    <section className="surface stack lcx-web-command-center" data-lcx-web-command-center="true">
      <PageHeader
        title="오늘의 운영 대기열"
        subtitle="처리할 Matter, 승인 대기, 최근 문서, 동기화 상태를 먼저 확인합니다."
        actions={
          <button className="secondary-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="home-ops-layout" data-home-ops-queue="true">
        <div className="home-ops-main">
          <div className="home-priority-grid">
            <article>
              <span>오늘 처리할 Matter</span>
              <strong>{capabilityCount(matterCapability)}</strong>
              <small>{capabilityStatusMessage(matterCapability)}</small>
            </article>
            <article>
              <span>승인 대기</span>
              <strong>{reviewCount}</strong>
              <small>{reviewCount > 0 ? "검토가 필요한 항목이 있습니다." : "현재 검토 대기 신호가 없습니다."}</small>
            </article>
            <article>
              <span>최근 문서</span>
              <strong>{capabilityCount(vaultCapability)}</strong>
              <small>{capabilityStatusMessage(vaultCapability)}</small>
            </article>
            <article>
              <span>실패한 동기화</span>
              <strong>{failedCount}</strong>
              <small>{failedCount > 0 ? "로컬 런타임 또는 권한 컨텍스트를 확인하세요." : "연결 실패 신호가 없습니다."}</small>
            </article>
          </div>
          <section className="home-queue-panel">
            <header>
              <strong>Matter 작업 큐</strong>
              <span>실패, 권한 없음, 빈 상태를 구분해 표시합니다.</span>
            </header>
            <QueueRow title="Matter 목록" capability={matterCapability} onOpen={setView} />
            <QueueRow title="승인·구성원 확인" capability={peopleCapability} onOpen={setView} />
            <QueueRow title="최근 문서 확인" capability={vaultCapability} onOpen={setView} />
          </section>
        </div>
        <aside className="home-audit-panel">
          <strong>권한·감사 요약</strong>
          {capabilities.map((capability) => (
            <div key={capability.id}>
              <span>{capability.label}</span>
              <em className={capability.status}>{statusBadgeLabel(capability.status)}</em>
            </div>
          ))}
        </aside>
      </div>
      <div className="work-area-list home-quick-links" data-lcx-web-capability-count={capabilities.length}>
        {capabilities.map((capability) => (
          <WorkAreaRow key={capability.id} capability={capability} onOpen={setView} />
        ))}
      </div>
    </section>
  );
}
