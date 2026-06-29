import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, TrafficCone } from "lucide-react";
import { fetchEnterpriseReadinessItems } from "../data/apiClient.js";
import { CompactTable, PageHeader, Panel } from "./primitives.jsx";

const ENTERPRISE_PERMISSION_REF = "ui_cmp_g12_enterprise_live";
const ENTERPRISE_AUDIT_HINT_REF = "ui_cmp_g12_enterprise_probe";

function formatOpsLabel(value, fallback = "항목") {
  const normalized = String(value ?? "").toLowerCase();
  if (!normalized) return fallback;
  if (normalized.includes("access")) return "접근";
  if (normalized.includes("security")) return "보안";
  if (normalized.includes("incident")) return "장애 대응";
  if (normalized.includes("support")) return "Client 지원";
  if (normalized.includes("ready") || normalized.includes("complete")) return "완료";
  if (normalized.includes("review")) return "검토 필요";
  if (normalized.includes("pending") || normalized.includes("open")) return "대기";
  if (normalized.includes("blocked")) return "보류";
  return fallback;
}

export function OpsSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchEnterpriseReadinessItems({
      ctx: liveCtx,
      permissionRef: ENTERPRISE_PERMISSION_REF,
      auditHintRef: ENTERPRISE_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const items = result?.kind === "data" ? result.items : [];

  let body;
  if (result === null) body = <div className="live-data-state live-data-loading"><strong>운영 항목 불러오는 중</strong> 확인할 항목을 준비하고 있습니다.</div>;
  else if (result.kind === "error") body = <div className="live-data-state live-data-error"><strong>운영 항목을 불러올 수 없습니다</strong> 새로고침하거나 연결 상태를 확인하세요.</div>;
  else if (result.uiState === "denied") body = <div className="live-data-state live-data-denied"><strong>접근할 수 없습니다</strong> 현재 권한으로는 운영 항목을 볼 수 없습니다.</div>;
  else if (result.uiState === "review_required" || result.outcome === "review_required") body = <div className="live-data-state live-data-review"><strong>검토가 필요합니다</strong> 담당자 확인 후 운영 항목을 볼 수 있습니다.</div>;
  else body = (
    <CompactTable
      columns={["항목", "구분", "상태", "확인"]}
      rows={items.slice(0, 12).map((item, index) => [
        `항목 ${index + 1}`,
        formatOpsLabel(item.item_type),
        formatOpsLabel(item.status, "대기"),
        item.production_ready_claim ? "확인됨" : "대기"
      ])}
    />
  );

  return (
    <section className="surface stack ops-surface" data-cmp-g12-enterprise-readiness="true">
      <PageHeader
        eyebrow="운영"
        title={labels.opsTitle}
        subtitle="접근, 보안, 장애 대응, Client 지원에 필요한 운영 항목을 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="readiness-grid">
        <Panel className="span-2" title="운영 확인" meta="담당자 확인">
          <div className="portal-safe-strip">
            <ShieldCheck size={15} />
            <span>담당자가 필요한 항목을 확인한 뒤 실제 업무에 반영합니다.</span>
          </div>
        </Panel>
        <Panel className="span-2" title="확인 항목" meta="업무 목록">
          {body}
        </Panel>
        <Panel title="담당자 결정" meta="확인 대기">
          <div className="matter-boundary-card">
            <TrafficCone size={20} />
            <strong>담당자 확인 대기 중</strong>
            <span>필요한 운영 항목을 검토한 뒤 다음 업무를 진행합니다.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
