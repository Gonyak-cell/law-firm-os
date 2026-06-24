import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Play, Share2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  createReportDefinition,
  fetchAnalyticsClientProfitability,
  fetchReportAudit,
  fetchReportDefinitions,
  patchReportDefinition,
  refreshClientProfitability,
  runReportQuery,
  shareReportDefinition
} from "../data/apiClient.js";
import { DataTable, Panel, Property } from "./primitives.jsx";

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function stateLabel(value) {
  if (value === "owner_blocked" || value === "approval_required") return "승인 대기";
  if (value === "review_required") return "검토 대기";
  if (value === "route_mounted" || value === "passed" || value === "created") return "준비됨";
  if (value === "idempotent_replay") return "재확인됨";
  if (value === "denied") return "제한됨";
  if (value === "review") return "검토";
  return value ?? "대기";
}

function reportNameLabel(value) {
  const text = String(value ?? "").trim();
  if (text === "Client profitability overview") return "Client 손익 개요";
  if (text === "Client profitability report") return "Client 손익 보고서";
  if (text === "Client profitability route report") return "Client 손익 경로 보고서";
  if (text === "Client profitability reviewed report") return "Client 손익 검토 보고서";
  return text || "보고서";
}

function scopeLabel(value) {
  if (value === "Client") return "Client";
  if (value === "Matter") return "Matter";
  return value ?? "범위";
}

function reportColumnLabel(value) {
  if (value === "client_group") return "Client 그룹";
  if (value === "matter_count") return "Matter 수";
  if (value === "profitability_amount") return "손익";
  if (value === "realization_band") return "실현 구간";
  if (value === "matter") return "Matter";
  if (value === "standard_value") return "표준 금액";
  if (value === "billed_value") return "청구 금액";
  if (value === "collected_value") return "수금 금액";
  return value ?? "필드";
}

function chartTypeLabel(value) {
  if (value === "bar") return "막대";
  if (value === "line") return "추이";
  if (value === "table") return "표";
  return value ?? "차트";
}

function actionState(result) {
  if (!result) return "아직 실행 전";
  if (result.kind === "error") return "처리 실패";
  return stateLabel(result.uiState ?? result.outcome);
}

function resultClass(result) {
  const status = result?.uiState ?? result?.outcome;
  if (status === "owner_blocked" || status === "review_required" || status === "approval_required") return "live-data-state live-data-review";
  if (status === "denied" || result?.kind === "error") return "live-data-state live-data-denied";
  return "live-data-state";
}

function loadingState(result, noun) {
  if (result === null) return <div className="live-data-state live-data-loading">{noun} 정보를 불러오는 중입니다.</div>;
  if (result?.kind === "error") return <div className="live-data-state live-data-error">{noun} 정보를 확인하지 못했습니다.</div>;
  if (result?.uiState === "denied") return <div className="live-data-state live-data-denied">{noun} 접근이 제한되었습니다.</div>;
  return null;
}

export function ReportBuilderPanel({ ctx = "allow", selectedClient }) {
  const [reports, setReports] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [audit, setAudit] = useState(null);
  const [queryRun, setQueryRun] = useState(null);
  const [actions, setActions] = useState({});
  const [busy, setBusy] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReports(null);
    setProfitability(null);
    setAudit(null);
    Promise.all([
      fetchReportDefinitions({ ctx }),
      fetchAnalyticsClientProfitability({ ctx }),
      fetchReportAudit({ ctx })
    ]).then(([nextReports, nextProfitability, nextAudit]) => {
      if (cancelled) return;
      setReports(nextReports);
      setProfitability(nextProfitability);
      setAudit(nextAudit);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx, refreshToken]);

  const reportRows = useMemo(() => resultItems(reports), [reports]);
  const profitabilityRows = useMemo(() => resultItems(profitability), [profitability]);
  const auditRows = useMemo(() => resultItems(audit), [audit]);
  const activeReport = actions.createReport?.item ?? reportRows.find((item) => item.object_scope === "Client") ?? reportRows[0] ?? null;
  const activeReportId = activeReport?.report_id ?? null;
  const queryRows = Array.isArray(queryRun?.item?.table_rows) ? queryRun.item.table_rows : [];
  const chartRows = Array.isArray(queryRun?.item?.chart_rows) ? queryRun.item.chart_rows : [];
  const clientGroupId = selectedClient?.client_group_id ?? "client_group_ui";
  const clientLabel = selectedClient?.display_name ?? "Client 그룹";

  async function runAction(key, callback) {
    setBusy(key);
    const next = await callback();
    setActions((current) => ({ ...current, [key]: next }));
    setBusy("");
    return next;
  }

  async function handleCreateReport() {
    const next = await runAction("createReport", () => createReportDefinition({ ctx }));
    if (next.kind === "data" && next.item) {
      setReports((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: [next.item, ...resultItems(current).filter((item) => item.report_id !== next.item.report_id)],
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  async function handlePatchReport() {
    if (!activeReportId) return;
    const next = await runAction("patchReport", () => patchReportDefinition({ reportId: activeReportId, ctx }));
    if (next.kind === "data" && next.item) {
      setReports((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: [next.item, ...resultItems(current).filter((item) => item.report_id !== next.item.report_id)],
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  async function handleRefreshProfitability() {
    const next = await runAction("clientProfitability", () => refreshClientProfitability({ clientGroupId, clientGroupLabel: clientLabel, ctx }));
    if (next.kind === "data" && next.item) {
      setProfitability((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: [next.item, ...resultItems(current).filter((item) => item.client_profitability_id !== next.item.client_profitability_id)],
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  async function handleRunReport() {
    if (!activeReportId) return;
    const next = await runAction("runReport", () => runReportQuery({ reportId: activeReportId, ctx }));
    if (next.kind === "data") setQueryRun(next);
  }

  async function handleShareReport() {
    if (!activeReportId) return;
    await runAction("shareReport", () => shareReportDefinition({ reportId: activeReportId, ctx }));
    setRefreshToken((value) => value + 1);
  }

  return (
    <div className="clients-live-stack span-2" data-report-builder="route-backed">
      <Panel id="client-report-builder" className="record-list-panel span-2" title="보고서" meta="Client">
        <div className="record-action-grid">
          <div className="record-action-strip" data-sf-b-w08-report-list="true">
            <div>
              <strong>저장된 보고서</strong>
              <span>{reportRows.length > 0 ? `${reportRows.length}개` : "확인 중"}</span>
            </div>
            <button className="secondary-button" type="button" disabled={busy === "createReport"} onClick={handleCreateReport} data-sf-b-w08-report-create-action="true">
              <BarChart3 size={15} />
              생성
            </button>
          </div>
          <div className="record-action-strip" data-report-query-builder="route-backed" data-ad-hoc-sql-blocked="true" data-validation-marker="임의 SQL 차단">
            <div>
              <strong>필터와 열</strong>
              <span>{activeReport ? activeReport.column_refs?.map(reportColumnLabel).join(" / ") : "허용 필드 확인"}</span>
            </div>
            <button className="secondary-button" type="button" disabled={!activeReportId || busy === "patchReport"} onClick={handlePatchReport} data-sf-b-w08-report-patch-action="true">
              <SlidersHorizontal size={15} />
              조정
            </button>
          </div>
          <div className={resultClass(actions.createReport)} data-sf-b-w08-report-create-result="true">
            <strong>생성 상태</strong>
            {actionState(actions.createReport)}
          </div>
          <div className={resultClass(actions.patchReport)} data-sf-b-w08-report-patch-result="true">
            <strong>정의 상태</strong>
            {actionState(actions.patchReport)}
          </div>
        </div>
        {loadingState(reports, "보고서") ?? (
          <DataTable
            data-ad-hoc-sql-blocked="true"
            data-validation-marker="임의 SQL 차단"
            columns={["보고서", "범위", "차트", "공유", "원문"]}
            rows={reportRows.map((report) => [
              reportNameLabel(report.name),
              scopeLabel(report.object_scope),
              chartTypeLabel(report.chart_manifest?.type),
              stateLabel(report.share_state),
              report.raw_sql_included || report.source_payload_included ? "확인 필요" : "보호됨"
            ])}
          />
        )}
      </Panel>

      <Panel id="client-profitability" className="record-list-panel" title="Client 손익" meta="집계">
        <div className="record-action-strip" data-client-profitability="route-backed">
          <div>
            <strong>수익성 새로고침</strong>
            <span>기존 Matter 집계에서만 Client 집계를 만듭니다.</span>
          </div>
          <button className="secondary-button" type="button" disabled={busy === "clientProfitability"} onClick={handleRefreshProfitability} data-sf-b-w08-client-profitability-refresh-action="true">
            <ShieldCheck size={15} />
            새로고침
          </button>
        </div>
        <div className={resultClass(actions.clientProfitability)} data-sf-b-w08-client-profitability-refresh-result="true">
          <strong>집계 상태</strong>
          {actionState(actions.clientProfitability)}
        </div>
        {loadingState(profitability, "Client 손익") ?? (
          <DataTable
            columns={["Client", "Matter", "손익", "원본"]}
            rows={profitabilityRows.map((item, index) => [
              item.client_group_label ?? `Client ${index + 1}`,
              String(item.matter_count ?? 0),
              String(item.profitability_amount ?? 0),
              item.matter_level_rows_included || item.row_level_billing_payload_included ? "확인 필요" : "보호됨"
            ])}
          />
        )}
      </Panel>

      <Panel id="client-report-run" className="record-list-panel" title="실행 결과" meta="제한 출력">
        <div className="record-action-strip" data-sf-b-w08-report-run-action="true">
          <div>
            <strong>{reportNameLabel(activeReport?.name)}</strong>
            <span>허용된 집계 쿼리만 실행합니다.</span>
          </div>
          <button className="secondary-button" type="button" disabled={!activeReportId || busy === "runReport"} onClick={handleRunReport}>
            <Play size={15} />
            실행
          </button>
        </div>
        <div className={resultClass(actions.runReport)} data-sf-b-w08-report-run-result="true">
          <strong>실행 상태</strong>
          {actionState(actions.runReport)}
        </div>
        <div className="property-grid tight" data-sf-b-w08-report-chart="true">
          <Property label="결과" value={String(queryRun?.item?.row_count ?? 0)} />
          <Property label="생략" value={String(queryRun?.item?.omitted_row_count ?? 0)} />
          <Property label="임의 쿼리" value={queryRun?.item?.arbitrary_sql_executed ? "확인 필요" : "비활성"} />
          <Property label="원본" value={queryRun?.item?.source_payload_included ? "확인 필요" : "보호됨"} />
        </div>
        <DataTable
          columns={["항목", "Matter", "수익성", "상태"]}
          rows={(queryRows.length > 0 ? queryRows : chartRows).map((row, index) => [
            row.label ?? `결과 ${index + 1}`,
            String(row.matter_count ?? "-"),
            String(row.profitability_amount ?? row.value ?? 0),
            stateLabel(row.profitability_band ?? row.band)
          ])}
        />
        <div className="record-boundary-note" data-sf-b-w08-report-result-table="true">
          <ShieldCheck size={15} />
          <span>임의 쿼리, 원본 청구 행, 요청 원문은 표시하지 않습니다.</span>
        </div>
      </Panel>

      <Panel id="client-report-share" className="record-list-panel span-2" title="공유와 감사" meta={`${auditRows.length}건`}>
        <div className="record-action-strip" data-report-share-action="owner-blocked" data-sf-b-w08-report-share-action="true">
          <div>
            <strong>공유 요청</strong>
            <span>담당자 승인 전에는 권한 부여를 적용하지 않습니다.</span>
          </div>
          <button className="secondary-button" type="button" disabled={!activeReportId || busy === "shareReport"} onClick={handleShareReport}>
            <Share2 size={15} />
            공유 요청
          </button>
        </div>
        <div className={resultClass(actions.shareReport)} data-report-share-result="owner-blocked" data-sf-b-w08-report-share-result="true">
          <strong>공유 상태</strong>
          {actionState(actions.shareReport)}
        </div>
        <DataTable
          columns={["작업", "대상", "원문", "연락 정보"]}
          rows={auditRows.slice(0, 8).map((item) => [
            item.action ?? "기록",
            "보고서",
            item.raw_query_payload_included ? "확인 필요" : "보호됨",
            item.direct_recipient_contact_values_included ? "확인 필요" : "보호됨"
          ])}
        />
        <div className="record-boundary-note" data-sf-b-w08-report-audit="true">
          <ShieldCheck size={15} />
          <span>감사에는 작업자 참조값과 요청 원문을 노출하지 않습니다.</span>
        </div>
      </Panel>
    </div>
  );
}
