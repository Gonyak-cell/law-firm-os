import React from "react";
import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchCrmOpportunities, fetchIntakeRequests } from "../data/apiClient.js";
import { DataTable, PageHeader, Panel } from "./primitives.jsx";

const CRM_INTAKE_PERMISSION_REF = "ui_cmp_g6_crm_intake_live";
const CRM_INTAKE_AUDIT_HINT_REF = "ui_cmp_g6_crm_intake_probe";

function opportunityRows(items) {
  return items.map((item, index) => [
    `상담 ${index + 1}`,
    item.display_name,
    intakeStatus(item.stage),
    item.party_id ? "당사자 등록" : "미등록",
    item.direct_matter_reference_included === false ? "Matter 생성 보류" : "검토 필요"
  ]);
}

function intakeRows(items) {
  return items.map((item, index) => [
    `요청 ${index + 1}`,
    `상담 ${index + 1}`,
    intakeStatus(item.status),
    item.requesting_party_id ? "요청자 등록" : "미등록",
    item.creates_matter === false ? "충돌 확인 전" : "검토 필요"
  ]);
}

function intakeStatus(value) {
  if (value === "new" || value === "open") return "접수";
  if (value === "review_required" || value === "review") return "검토 필요";
  if (value === "converted") return "Matter 전환";
  if (value === "closed") return "종료";
  return "확인 필요";
}

function LiveState({ result, noun }) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>{noun} 불러오는 중</strong>
        접수 정보를 확인하고 있습니다.
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>{noun}를 불러올 수 없습니다</strong>
        잠시 후 다시 시도하세요.
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>접근할 수 없습니다</strong>
        이 접수 정보는 현재 권한으로 볼 수 없습니다.
      </div>
    );
  }
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        담당자 확인 후 접수 정보를 볼 수 있습니다.
      </div>
    );
  }
  if (result.items.length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>{noun} 없음</strong>
        표시할 접수 정보가 없습니다.
      </div>
    );
  }
  return null;
}

export function IntakeSurface({ labels, liveCtx = "allow" }) {
  const [opportunities, setOpportunities] = useState(null);
  const [requests, setRequests] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOpportunities(null);
    setRequests(null);
    Promise.all([
      fetchCrmOpportunities({
        ctx: liveCtx,
        permissionRef: CRM_INTAKE_PERMISSION_REF,
        auditHintRef: CRM_INTAKE_AUDIT_HINT_REF
      }),
      fetchIntakeRequests({
        ctx: liveCtx,
        permissionRef: CRM_INTAKE_PERMISSION_REF,
        auditHintRef: CRM_INTAKE_AUDIT_HINT_REF
      })
    ]).then(([nextOpportunities, nextRequests]) => {
      if (!cancelled) {
        setOpportunities(nextOpportunities);
        setRequests(nextRequests);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const opportunityItems = opportunities?.kind === "data" ? opportunities.items : [];
  const requestItems = requests?.kind === "data" ? requests.items : [];

  const opportunityState = <LiveState result={opportunities} noun="상담 건" />;
  const requestState = <LiveState result={requests} noun="접수 요청" />;

  return (
    <section className="surface stack intake-surface" data-cmp-g6-intake-surface="true">
      <PageHeader
        eyebrow="접수"
        title={labels.intakeTitle}
        subtitle="상담 건은 이해충돌 확인과 담당자 검토를 거쳐 Matter로 전환됩니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="intake-runtime-grid">
        <Panel className="span-2 intake-panel" title="상담 건" meta="접수 대기">
          {opportunityState || (
            <div className="intake-live-stack">
              <div className="intake-safe-strip">
                <ShieldCheck size={15} />
                <span>이해충돌 확인 전에는 Matter 생성으로 바로 이어지지 않습니다.</span>
              </div>
              <DataTable
                columns={["접수번호", "이름", "단계", "당사자", "Matter 전환"]}
                rows={opportunityRows(opportunityItems)}
              />
            </div>
          )}
        </Panel>
        <Panel className="span-2 intake-panel" title="접수 검토" meta="담당자 확인">
          {requestState || (
            <div className="intake-live-stack">
              <DataTable
                columns={["요청", "상담 건", "상태", "요청자", "처리"]}
                rows={intakeRows(requestItems)}
              />
            </div>
          )}
        </Panel>
        <Panel className="intake-panel" title="이해충돌 확인" meta="민감 정보 보호">
          <div className="matter-boundary-card">
            <ClipboardCheck size={20} />
            <strong>메모 본문은 목록에 표시하지 않습니다</strong>
            <span>상세 내용은 권한이 있는 담당자 화면에서만 확인합니다.</span>
          </div>
        </Panel>
        <Panel className="intake-panel" title="담당자 검토" meta="접수 전 확인">
          <div className="matter-boundary-card">
            <ShieldCheck size={20} />
            <strong>접수 검토 대기 중</strong>
            <span>담당자가 확인하면 Matter 생성 단계로 이동할 수 있습니다.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
