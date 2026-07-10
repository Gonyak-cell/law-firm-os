import React from "react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, ShieldCheck, Share2 } from "lucide-react";
import {
  accessPortalExternalSecureLink,
  consumePortalInvite,
  fetchDataRoomProjections,
  fetchPortalDashboard,
  fetchPortalRfi,
  submitPortalExternalRfiResponse
} from "../data/apiClient.js";
import { ForestHero } from "./ForestHero.jsx";
import { CompactTable, PageHeader, Panel } from "./primitives.jsx";
import { useSkin } from "../context/SkinContext.jsx";

const PORTAL_PERMISSION_REF = "ui_cmp_g10_portal_live";
const PORTAL_AUDIT_HINT_REF = "ui_cmp_g10_portal_probe";

function LiveState({ result, label }) {
  if (result === null) return <div className="live-data-state live-data-loading"><strong>{label} 불러오는 중</strong></div>;
  if (result.kind === "error") return <div className="live-data-state live-data-error"><strong>{label}를 불러올 수 없습니다</strong> 새로고침하거나 연결 상태를 확인하세요.</div>;
  if (result.uiState === "denied") return <div className="live-data-state live-data-denied"><strong>접근할 수 없습니다</strong> 담당자에게 접근을 요청하세요.</div>;
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

function portalQueryValue(key) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

function externalSessionState(result, session) {
  if (session) return "active";
  if (result === null) return "loading";
  return "blocked";
}

export function PortalSurface({ labels, liveCtx = "allow", refreshSignal = 0 }) {
  const skin = useSkin();
  const [inviteToken] = useState(() => portalQueryValue("portal_invite"));
  const [inviteNow] = useState(() => portalQueryValue("portal_invite_now") || undefined);
  const [accessNow] = useState(() => portalQueryValue("portal_access_now") || undefined);
  const [dashboard, setDashboard] = useState(null);
  const [rfi, setRfi] = useState(null);
  const [dataRoom, setDataRoom] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshSignalRef = useRef(refreshSignal);
  const [externalInviteResult, setExternalInviteResult] = useState(inviteToken ? null : { kind: "idle" });
  const [externalSession, setExternalSession] = useState(null);
  const [externalRfiResult, setExternalRfiResult] = useState(null);
  const [externalLinkResult, setExternalLinkResult] = useState(null);
  const [externalBusy, setExternalBusy] = useState("");

  useEffect(() => {
    if (refreshSignalRef.current === refreshSignal) return;
    refreshSignalRef.current = refreshSignal;
    setRefreshToken((value) => value + 1);
  }, [refreshSignal]);

  useEffect(() => {
    if (inviteToken) return undefined;
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
  }, [inviteToken, liveCtx, refreshToken]);

  useEffect(() => {
    if (!inviteToken) return undefined;
    let cancelled = false;
    setExternalInviteResult(null);
    setExternalSession(null);
    consumePortalInvite({ token: inviteToken, now: inviteNow }).then((result) => {
      if (cancelled) return;
      setExternalInviteResult(result);
      if (result.kind === "data") setExternalSession(result.body.item);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteNow, inviteToken]);

  const dashboardItems = dashboard?.kind === "data" ? dashboard.items : [];
  const rfiItems = rfi?.kind === "data" ? rfi.items : [];
  const projectionItems = dataRoom?.kind === "data" ? dataRoom.items : [];
  const blocking = inviteToken ? null : <LiveState result={dashboard ?? rfi ?? dataRoom} label="공유 포털" />;
  const externalState = externalSessionState(externalInviteResult, externalSession);
  const externalLinkDeniedExpired = externalLinkResult?.safeErrorCodes?.includes("PORTAL_SECURE_LINK_EXPIRED") === true;
  const externalLinkDeniedRevoked = externalLinkResult?.safeErrorCodes?.includes("PORTAL_SECURE_LINK_REVOKED") === true;
  const externalLinkAccessState = externalLinkDeniedExpired
    ? "expired-denied"
    : externalLinkDeniedRevoked
      ? "revoked-denied"
      : externalLinkResult?.kind === "data"
        ? "allowed-no-bytes"
        : "idle";
  const externalRfiState = externalRfiResult?.body?.item?.upload_metadata_only === true ? "metadata-only" : externalRfiResult?.kind ?? "idle";

  async function submitExternalRfi() {
    if (!externalSession) return;
    setExternalBusy("rfi");
    const suffix = externalSession.external_session_id.slice(-8);
    const result = await submitPortalExternalRfiResponse({
      externalSessionId: externalSession.external_session_id,
      tenantId: externalSession.tenant_id,
      rfiRequestId: externalSession.rfi_request_id,
      responseId: `rfi_response_ui_c13_${suffix}`,
      uploadName: "client-response-metadata.pdf",
      idempotencyKey: `ui-c13-rfi-${externalSession.external_session_id}`
    });
    setExternalRfiResult(result);
    setExternalBusy("");
  }

  async function accessExternalLink() {
    if (!externalSession) return;
    setExternalBusy("link");
    const result = await accessPortalExternalSecureLink({
      tenantId: externalSession.tenant_id,
      secureLinkId: externalSession.secure_link_id,
      externalSessionId: externalSession.external_session_id,
      now: accessNow
    });
    setExternalLinkResult(result);
    setExternalBusy("");
  }

  return (
    <section
      className="surface stack portal-surface"
      data-cmp-g10-portal-runtime="true"
      data-c13-portal-mounted="true"
      data-c13-external-session={externalState}
      data-c13-rfi-response={externalRfiState}
      data-c13-secure-link-access={externalLinkAccessState}
    >
      <ForestHero title={labels.portalTitle} imageOpacity={0.18} />
      <PageHeader
        title={labels.portalTitle}
        heroTakeover={skin === "forest"}
      />
      {inviteToken && (
        <div className="portal-runtime-grid">
          <Panel className="span-2 portal-panel" title="외부 세션" meta={externalSession ? "초대 확인됨" : "초대 확인 중"}>
            {externalSession ? (
              <div className="portal-safe-strip">
                <ShieldCheck size={15} />
                <span>이 세션은 요청 응답과 지정된 공유 링크에만 사용할 수 있습니다.</span>
              </div>
            ) : (
              <div className={externalInviteResult?.kind === "error" ? "live-data-state live-data-error" : "live-data-state live-data-loading"}>
                <strong>{externalInviteResult?.kind === "error" ? "초대를 열 수 없습니다" : "초대 확인 중"}</strong>
                {externalInviteResult?.kind === "error" ? externalInviteResult.safeErrorCodes.join(", ") : "외부 세션을 준비하고 있습니다."}
              </div>
            )}
          </Panel>
          <Panel title="요청 응답" meta="메타데이터 업로드">
            <div className="matter-boundary-card" data-c13-rfi-response-panel="true">
              <FileText size={20} />
              <strong>{externalRfiState === "metadata-only" ? "응답 접수됨" : "응답 대기"}</strong>
              <span>{externalRfiState === "metadata-only" ? "문서 본문 없이 파일명과 검사 상태만 기록되었습니다." : "답변 파일의 메타데이터만 접수합니다."}</span>
              <button type="button" className="secondary-button" disabled={!externalSession || externalBusy === "rfi"} onClick={submitExternalRfi} data-c13-submit-rfi="true">
                <FileText size={15} />
                요청 응답 제출
              </button>
            </div>
          </Panel>
          <Panel title="공유 링크" meta={externalLinkAccessState === "expired-denied" ? "만료 확인" : "공유 문서"}>
            <div className="matter-boundary-card" data-c13-secure-link-panel="true">
              {externalLinkAccessState === "expired-denied" ? <AlertTriangle size={20} /> : <Share2 size={20} />}
              <strong>{externalLinkAccessState === "expired-denied" ? "만료 링크" : externalLinkAccessState === "allowed-no-bytes" ? "링크 확인됨" : "링크 확인 대기"}</strong>
              <span>{externalLinkAccessState === "allowed-no-bytes" ? "접근은 기록되었고 문서 본문은 노출되지 않았습니다." : externalLinkAccessState === "revoked-denied" ? "회수된 링크는 열 수 없습니다." : "만료되었거나 회수된 링크는 열 수 없습니다."}</span>
              <button type="button" className="secondary-button" disabled={!externalSession || externalBusy === "link"} onClick={accessExternalLink} data-c13-access-link="true">
                <Share2 size={15} />
                공유 링크 확인
              </button>
            </div>
          </Panel>
        </div>
      )}
      {!inviteToken && (
      <div className="portal-runtime-grid">
        <Panel className="span-2 portal-panel" title="공유 범위">
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
      )}
    </section>
  );
}
