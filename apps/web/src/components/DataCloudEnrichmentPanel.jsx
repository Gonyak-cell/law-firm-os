import React, { useEffect, useMemo, useState } from "react";
import { DatabaseZap, Play, RefreshCw, ShieldCheck } from "lucide-react";
import {
  activateDataCloudSegment,
  createDataCloudConsentRecord,
  createDataCloudProvider,
  createEnrichmentJob,
  executeEnrichmentJob,
  fetchDataCloudAudit,
  fetchDataCloudProviders,
  fetchEnrichmentPreview,
  fetchEnrichmentResults,
  fetchUnifiedCustomerProfile,
  runIdentityResolution
} from "../data/apiClient.js";
import { DataTable, Panel, Property } from "./primitives.jsx";

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function statusLabel(value) {
  if (value === true) return "예";
  if (value === false) return "아니오";
  if (value === "provider_blocked") return "외부 확인 대기";
  if (value === "owner_blocked" || value === "owner_review_required") return "승인 대기";
  if (value === "route_mounted" || value === "passed" || value === "preview_ready") return "준비됨";
  if (value === "disabled") return "비활성";
  if (value === "review_required") return "검토 대기";
  if (value === "denied") return "제한됨";
  return value ?? "대기";
}

function providerDisplayLabel(value) {
  return String(value ?? "외부 연동").replaceAll("제공자", "외부 연동").replace("enrichment", "데이터 보강");
}

function categoryLabel(value) {
  if (value === "firmographic") return "기업 정보";
  if (value === "relationship") return "관계";
  if (value === "matter_context") return "Matter 맥락";
  if (value === "contact_quality") return "연락처 품질";
  return value ?? "검토";
}

function auditActionLabel(value) {
  if (value === "data_cloud.provider.register_provider_blocked") return "외부 연동 등록 대기";
  if (value === "data_cloud.consent.owner_blocked") return "동의 승인 대기";
  if (value === "data_cloud.enrichment_job.created") return "보강 작업 생성";
  if (value === "data_cloud.enrichment.execute_provider_blocked") return "보강 실행 대기";
  if (value === "data_cloud.identity_resolution.owner_blocked") return "식별자 매칭 승인 대기";
  if (value === "data_cloud.segment_activation.provider_blocked") return "대상 그룹 활성화 대기";
  return value ? "기록됨" : "기록";
}

function actionLabel(result) {
  if (!result) return "아직 실행 전";
  if (result.kind === "error") return "요청 실패";
  return statusLabel(result.uiState ?? result.statusOutcome ?? result.outcome);
}

function resultClass(result) {
  const status = result?.uiState ?? result?.statusOutcome ?? result?.outcome;
  if (status === "provider_blocked" || status === "owner_blocked" || status === "review_required") return "live-data-state live-data-review";
  if (status === "denied" || result?.kind === "error") return "live-data-state live-data-denied";
  return "live-data-state";
}

function loadingState(result, noun) {
  if (result === null) return <div className="live-data-state live-data-loading">{noun} 정보를 불러오는 중입니다.</div>;
  if (result?.kind === "error") return <div className="live-data-state live-data-error">{noun} 정보를 확인하지 못했습니다.</div>;
  if (result?.uiState === "denied") return <div className="live-data-state live-data-denied">{noun} 접근이 제한되었습니다.</div>;
  return null;
}

export function DataCloudEnrichmentPanel({ ctx = "allow" }) {
  const [providers, setProviders] = useState(null);
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState(null);
  const [audit, setAudit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState("");
  const [actions, setActions] = useState({});
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProviders(null);
    setProfile(null);
    setResults(null);
    setAudit(null);
    Promise.all([
      fetchDataCloudProviders({ ctx }),
      fetchUnifiedCustomerProfile({ ctx }),
      fetchEnrichmentResults({ ctx }),
      fetchDataCloudAudit({ ctx })
    ]).then(([nextProviders, nextProfile, nextResults, nextAudit]) => {
      if (cancelled) return;
      setProviders(nextProviders);
      setProfile(nextProfile);
      setResults(nextResults);
      setAudit(nextAudit);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx, refreshToken]);

  const providerRows = useMemo(() => resultItems(providers), [providers]);
  const resultRows = useMemo(() => resultItems(results), [results]);
  const auditRows = useMemo(() => resultItems(audit), [audit]);
  const profileItem = profile?.kind === "data" ? profile.item : null;
  const previewItem = preview?.kind === "data" ? preview.item : null;
  const activeJobId = job?.job_id ?? actions.createJob?.item?.job_id ?? null;

  async function runAction(key, callback) {
    setBusy(key);
    const next = await callback();
    setActions((current) => ({ ...current, [key]: next }));
    setBusy("");
    return next;
  }

  async function handleProvider() {
    const next = await runAction("provider", () => createDataCloudProvider({ ctx }));
    if (next.kind === "data") {
      setProviders((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: [next.item, ...resultItems(current).filter((item) => item.provider_id !== next.item?.provider_id)],
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  async function handleConsent() {
    await runAction("consent", () => createDataCloudConsentRecord({ ctx }));
    setRefreshToken((value) => value + 1);
  }

  async function handleCreateJob() {
    const next = await runAction("createJob", () => createEnrichmentJob({ ctx }));
    if (next.kind === "data" && next.item?.job_id) {
      setJob(next.item);
      const nextPreview = await fetchEnrichmentPreview({ jobId: next.item.job_id, ctx });
      setPreview(nextPreview);
    }
  }

  async function handleExecuteJob() {
    if (!activeJobId) return;
    const next = await runAction("executeJob", () => executeEnrichmentJob({ jobId: activeJobId, ctx }));
    if (next.kind === "data") {
      const nextResults = await fetchEnrichmentResults({ ctx });
      setResults(nextResults);
      if (next.item) setJob(next.item);
    }
  }

  async function handleIdentity() {
    await runAction("identity", () => runIdentityResolution({ ctx }));
  }

  async function handleSegment() {
    await runAction("segment", () => activateDataCloudSegment({ ctx }));
  }

  return (
    <div className="clients-live-stack span-2" data-data-cloud-enrichment="route-backed">
      <Panel id="client-data-cloud" className="record-list-panel span-2" title="데이터 보강" meta="고객">
        <div className="record-action-grid">
          <div className="record-action-strip" data-enrichment-provider-admin="provider-blocked" data-sf-b-w07-provider-list="true">
            <div>
              <strong>외부 연동</strong>
              <span>{providerRows.length > 0 ? `${providerRows.length}개 확인` : "확인 중"}</span>
            </div>
            <button
              className="secondary-button"
              type="button"
              data-sf-b-w07-provider-register-action="true"
              disabled={busy === "provider"}
              onClick={handleProvider}
            >
              <DatabaseZap size={15} />
              연동 요청
            </button>
          </div>
          <div className="record-action-strip" data-sf-b-w07-consent-record-action="true">
            <div>
              <strong>동의와 보존</strong>
              <span>보강 범위는 담당자 승인 후 적용됩니다.</span>
            </div>
            <button className="secondary-button" type="button" disabled={busy === "consent"} onClick={handleConsent}>
              <ShieldCheck size={15} />
              승인 확인
            </button>
          </div>
          <div className={resultClass(actions.provider)} data-sf-b-w07-provider-register-result="true">
            <strong>외부 연동 등록</strong>
            {actionLabel(actions.provider)}
          </div>
          <div className={resultClass(actions.consent)} data-sf-b-w07-consent-record-result="true">
            <strong>동의 상태</strong>
            {actionLabel(actions.consent)}
          </div>
        </div>
        {loadingState(providers, "외부 연동") ?? (
          <DataTable
            columns={["외부 연동", "상태", "범위", "외부 연결"]}
            rows={providerRows.map((provider) => [
              providerDisplayLabel(provider.label),
              statusLabel(provider.ui_state ?? provider.status),
              provider.data_categories?.map(categoryLabel).join(" / ") ?? "검토",
              statusLabel(provider.provider_call_performed)
            ])}
          />
        )}
      </Panel>

      <Panel id="client-enrichment-job" className="record-list-panel" title="보강 미리보기" meta="안전 출력">
        <div className="record-action-strip" data-sf-b-w07-enrichment-job-action="true">
          <div>
            <strong>작업 생성</strong>
            <span>{activeJobId ? "미리보기 준비됨" : "보강 작업 대기"}</span>
          </div>
          <button className="secondary-button" type="button" disabled={busy === "createJob"} onClick={handleCreateJob}>
            <RefreshCw size={15} />
            미리보기
          </button>
        </div>
        <div className={resultClass(actions.createJob)} data-sf-b-w07-enrichment-job-result="true">
          <strong>작업 상태</strong>
          {actionLabel(actions.createJob)}
        </div>
        <div className="property-grid tight" data-sf-b-w07-enrichment-preview="true">
          <Property label="대상" value={previewItem ? statusLabel(previewItem.target_count_bucket) : "대기"} />
          <Property label="동의" value={statusLabel(previewItem?.consent_coverage_state)} />
          <Property label="신뢰도" value={previewItem?.confidence_band ?? "대기"} />
          <Property label="외부 연결" value={statusLabel(previewItem?.provider_call_performed)} />
        </div>
        <div className="record-action-strip" data-sf-b-w07-enrichment-execute-provider-blocked-action="true">
          <div>
            <strong>실행 요청</strong>
            <span>외부 영수증 없이는 실행되지 않습니다.</span>
          </div>
          <button className="secondary-button" type="button" disabled={!activeJobId || busy === "executeJob"} onClick={handleExecuteJob}>
            <Play size={15} />
            실행 확인
          </button>
        </div>
        <div className={resultClass(actions.executeJob)} data-sf-b-w07-enrichment-execute-provider-blocked-result="true">
          <strong>실행 상태</strong>
          {actionLabel(actions.executeJob)}
        </div>
      </Panel>

      <Panel id="client-enrichment-results" className="record-list-panel" title="결과와 통합 프로필" meta="읽기">
        {loadingState(results, "보강 결과") ?? (
          <DataTable
            columns={["결과", "상태", "신뢰도", "원문"]}
            rows={resultRows.map((item, index) => [
              `결과 ${index + 1}`,
              statusLabel(item.ui_state ?? item.status),
              item.confidence_band,
              item.raw_provider_fields_included ? "확인 필요" : "보호됨"
            ])}
          />
        )}
        <div className="property-grid tight" data-unified-profile="route-backed" data-sf-b-w07-unified-profile="true">
          <Property label="프로필" value={profileItem?.label ?? "확인 중"} />
          <Property label="연결" value={String(profileItem?.source_count ?? 0)} />
          <Property label="동의" value={statusLabel(profileItem?.consent_state)} />
          <Property label="직접 식별자" value={statusLabel(profileItem?.direct_identifiers_included)} />
        </div>
      </Panel>

      <Panel id="client-identity-segment" className="record-list-panel" title="매칭과 대상 그룹" meta="승인 관리">
        <div className="record-action-strip" data-identity-resolution="route-backed" data-sf-b-w07-identity-resolution-action="true">
          <div>
            <strong>식별자 매칭</strong>
            <span>자동 병합 없이 검토 후보만 만듭니다.</span>
          </div>
          <button className="secondary-button" type="button" disabled={busy === "identity"} onClick={handleIdentity}>
            <ShieldCheck size={15} />
            후보 생성
          </button>
        </div>
        <div className={resultClass(actions.identity)} data-sf-b-w07-identity-resolution-result="true">
          <strong>매칭 상태</strong>
          {actionLabel(actions.identity)}
        </div>
        <div className="record-action-strip" data-segment-activation="provider-blocked" data-sf-b-w07-segment-activation-provider-blocked-action="true">
          <div>
              <strong>대상 그룹 활성화</strong>
              <span>외부 연동 확인과 되돌리기 계획이 필요합니다.</span>
          </div>
          <button className="secondary-button" type="button" disabled={busy === "segment"} onClick={handleSegment}>
            <Play size={15} />
            활성화 확인
          </button>
        </div>
        <div className={resultClass(actions.segment)} data-sf-b-w07-segment-activation-provider-blocked-result="true">
          <strong>대상 그룹 상태</strong>
          {actionLabel(actions.segment)}
        </div>
      </Panel>

      <Panel id="client-data-cloud-audit" className="record-list-panel span-2" title="감사 경계" meta={`${auditRows.length}건`}>
        <DataTable
          columns={["작업", "대상", "보안"]}
          rows={auditRows.slice(0, 6).map((item) => [
            auditActionLabel(item.action),
            "관리 대상",
            item.provider_payload_included ? "확인 필요" : "보호됨"
          ])}
        />
        <div className="record-boundary-note" data-sf-b-w07-results-list="true" data-sf-b-w07-audit="true">
          <ShieldCheck size={15} />
          <span>외부 응답 원문, 원문 식별자, 토큰, 연락값은 숨깁니다.</span>
        </div>
      </Panel>
    </div>
  );
}
