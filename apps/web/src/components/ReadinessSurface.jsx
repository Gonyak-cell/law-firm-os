import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchUiReadinessChecks } from "../data/apiClient.js";
import { CompactTable, PageHeader, Panel } from "./primitives.jsx";

const READINESS_PERMISSION_REF = "ui_cmp_g11_readiness_live";
const READINESS_AUDIT_HINT_REF = "ui_cmp_g11_readiness_probe";

function formatReadinessLabel(value, fallback = "화면") {
  const normalized = String(value ?? "").toLowerCase();
  if (!normalized) return fallback;
  if (normalized.includes("client")) return "Client";
  if (normalized.includes("matter")) return "Matter";
  if (normalized.includes("people") || normalized.includes("hrx")) return "People";
  if (normalized.includes("vault") || normalized.includes("dms")) return "Vault";
  if (normalized.includes("portal")) return "공유";
  if (normalized.includes("finance")) return "청구";
  if (normalized.includes("analytics")) return "보고서";
  if (normalized.includes("ready") || normalized.includes("complete") || normalized.includes("pass")) return "완료";
  if (normalized.includes("review")) return "검토 필요";
  if (normalized.includes("pending") || normalized.includes("open")) return "대기";
  if (normalized.includes("blocked") || normalized.includes("fail")) return "확인 필요";
  return fallback;
}

export function ReadinessSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchUiReadinessChecks({
      ctx: liveCtx,
      permissionRef: READINESS_PERMISSION_REF,
      auditHintRef: READINESS_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const checks = result?.kind === "data" ? result.items : [];

  let body;
  if (result === null) body = <div className="live-data-state live-data-loading"><strong>화면 상태 불러오는 중</strong> 표시할 항목을 확인하고 있습니다.</div>;
  else if (result.kind === "error") body = <div className="live-data-state live-data-error"><strong>화면 상태를 불러올 수 없습니다</strong> 새로고침하거나 연결 상태를 확인하세요.</div>;
  else if (result.uiState === "denied") body = <div className="live-data-state live-data-denied"><strong>접근할 수 없습니다</strong> 현재 권한으로는 이 화면 상태를 볼 수 없습니다.</div>;
  else if (result.uiState === "review_required" || result.outcome === "review_required") body = <div className="live-data-state live-data-review"><strong>검토가 필요합니다</strong> 담당자 확인 후 화면 상태를 볼 수 있습니다.</div>;
  else body = (
    <CompactTable
      columns={["항목", "영역", "화면", "상태"]}
      rows={checks.slice(0, 12).map((item, index) => [
        `항목 ${index + 1}`,
        formatReadinessLabel(item.route_id, "화면"),
        formatReadinessLabel(item.ui_surface_id, "페이지"),
        formatReadinessLabel(item.status, "대기")
      ])}
    />
  );

  return (
    <section className="surface stack readiness-surface" data-cmp-g11-ui-readiness="true">
      <PageHeader
        eyebrow="화면 상태"
        title={labels.readinessTitle}
        subtitle="화면 이동, 접근 권한, 오류 상태, 모바일 표시 상태를 함께 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="readiness-grid">
        <Panel className="span-2" title="화면 접근" meta="권한 기준 적용">
          <div className="portal-safe-strip">
            <ShieldCheck size={15} />
            <span>접근 제한, 검토 상태, 언어 표시, 반응형 화면을 함께 확인합니다.</span>
          </div>
        </Panel>
        <Panel className="span-2" title="확인 항목" meta="화면 목록">
          {body}
        </Panel>
        <Panel title="담당자 확인" meta="확인 대기">
          <div className="matter-boundary-card">
            <CheckCircle2 size={20} />
            <strong>확인이 필요한 항목이 있습니다</strong>
            <span>담당자가 확인한 뒤 실제 업무 반영 여부를 결정합니다.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
