import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Share2 } from "lucide-react";
import { fetchDataRoomProjections, fetchPortalDashboard, fetchPortalRfi } from "../data/apiClient.js";
import { CompactTable, PageHeader, Panel } from "./primitives.jsx";

const PORTAL_PERMISSION_REF = "ui_cmp_g10_portal_live";
const PORTAL_AUDIT_HINT_REF = "ui_cmp_g10_portal_probe";

function LiveState({ result, label }) {
  if (result === null) return <div className="live-data-state live-data-loading"><strong>{label} 불러오는 중</strong> 공유 정보를 확인하고 있습니다.</div>;
  if (result.kind === "error") return <div className="live-data-state live-data-error"><strong>{label}를 불러올 수 없습니다</strong> 잠시 후 다시 시도하세요.</div>;
  if (result.uiState === "denied") return <div className="live-data-state live-data-denied"><strong>접근할 수 없습니다</strong> 현재 권한으로는 이 공유 화면을 볼 수 없습니다.</div>;
  if (result.uiState === "review_required" || result.outcome === "review_required") return <div className="live-data-state live-data-review"><strong>검토가 필요합니다</strong> 담당자 확인 후 공유 정보를 볼 수 있습니다.</div>;
  return null;
}

function requestStatusLabel(value) {
  if (value === "open") return "요청";
  if (value === "answered") return "답변 완료";
  if (value === "closed") return "종료";
  if (value === "pending") return "대기";
  return "확인 필요";
}

export function PortalSurface({ labels, liveCtx = "allow" }) {
  const [dashboard, setDashboard] = useState(null);
  const [rfi, setRfi] = useState(null);
  const [dataRoom, setDataRoom] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDashboard(null);
    setRfi(null);
    setDataRoom(null);
    Promise.all([
      fetchPortalDashboard({ ctx: liveCtx, permissionRef: PORTAL_PERMISSION_REF, auditHintRef: PORTAL_AUDIT_HINT_REF }),
      fetchPortalRfi({ ctx: liveCtx, permissionRef: PORTAL_PERMISSION_REF, auditHintRef: PORTAL_AUDIT_HINT_REF }),
      fetchDataRoomProjections({ ctx: liveCtx, permissionRef: PORTAL_PERMISSION_REF, auditHintRef: PORTAL_AUDIT_HINT_REF })
    ]).then(([nextDashboard, nextRfi, nextDataRoom]) => {
      if (!cancelled) {
        setDashboard(nextDashboard);
        setRfi(nextRfi);
        setDataRoom(nextDataRoom);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const dashboardItems = dashboard?.kind === "data" ? dashboard.items : [];
  const rfiItems = rfi?.kind === "data" ? rfi.items : [];
  const projectionItems = dataRoom?.kind === "data" ? dataRoom.items : [];
  const blocking = <LiveState result={dashboard ?? rfi ?? dataRoom} label="공유 포털" />;

  return (
    <section className="surface stack portal-surface" data-cmp-g10-portal-runtime="true">
      <PageHeader
        eyebrow="공유 포털"
        title={labels.portalTitle}
        subtitle="의뢰인에게 공유할 Matter 정보와 문서 요청을 한곳에서 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="portal-runtime-grid">
        <Panel className="span-2 portal-panel" title="공유 범위" meta="권한 적용">
          {blocking ?? (
            <div className="portal-safe-strip">
              <ShieldCheck size={15} />
              <span>문서 본문과 민감 정보는 권한이 허용된 항목만 공유됩니다.</span>
            </div>
          )}
        </Panel>
        <Panel title="Client 화면" meta="공유 요약">
          <CompactTable
            columns={["공유 항목", "Client", "Matter", "요청"]}
            rows={dashboardItems.map((item, index) => [`공유 ${index + 1}`, "Client", item.matter_count ? "공유됨" : "확인 필요", item.open_rfi_count ? "요청 있음" : "요청 없음"])}
          />
        </Panel>
        <Panel title="요청 목록" meta="의뢰인 요청">
          <CompactTable
            columns={["요청", "Matter", "상태", "요청자"]}
            rows={rfiItems.map((item, index) => [`요청 ${index + 1}`, "Matter", requestStatusLabel(item.status), "의뢰인 담당자"])}
          />
        </Panel>
        <Panel title="문서 공유함" meta="보호된 문서">
          <CompactTable
            columns={["공유 항목", "공유함", "상태", "본문"]}
            rows={projectionItems.map((item, index) => [`문서 ${index + 1}`, `공유함 ${index + 1}`, requestStatusLabel(item.status), item.document_bytes_included ? "공유" : "비공개"])}
          />
        </Panel>
        <Panel title="공유 링크" meta="담당자 확인">
          <div className="matter-boundary-card">
            <Share2 size={20} />
            <strong>문서 본문은 기본적으로 비공개입니다</strong>
            <span>담당자가 공유 범위를 확인한 뒤 링크를 발송합니다.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
