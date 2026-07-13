import React from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, RotateCw, ShieldAlert } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { fetchHrxRiskEvents, scanHrxRiskEvents, transitionHrxRiskEvent } from "../hrxApiClient.ts";

type RiskEvent = {
  risk_event_id?: string;
  employee_id?: string | null;
  risk_type?: string;
  severity?: string;
  status?: string;
  title?: string;
  detected_on?: string | null;
  source_refs?: string[];
};

type RiskDashboard = {
  event_count?: number;
  open_count?: number;
  legal_type_count?: number;
  by_type?: Record<string, number>;
  by_status?: Record<string, number>;
};

type RiskResult =
  | { kind: "data"; risk_events: RiskEvent[]; dashboard: RiskDashboard | null }
  | { kind: "guarded"; risk_events: RiskEvent[]; dashboard: RiskDashboard | null; safeErrorCodes?: unknown[] }
  | { kind: "error"; reason?: unknown };

const RISK_TYPE_LABELS: Record<string, string> = {
  employment_contract_missing: "근로계약 미체결",
  annual_leave_promotion_target: "연차촉진 대상",
  statutory_training_missing: "법정교육 미이수",
  overtime_risk: "초과근로 위험",
  offboarded_access_not_revoked: "퇴사자 권한 미회수"
};

const RISK_TYPES = Object.keys(RISK_TYPE_LABELS);

const STATUS_LABELS: Record<string, string> = {
  open: "열림",
  acknowledged: "확인",
  in_progress: "처리 중",
  resolved: "해결",
  dismissed: "제외"
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "낮음",
  medium: "주의",
  high: "높음",
  critical: "긴급"
};

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function riskLabel(type: unknown): string {
  const key = typeof type === "string" ? type : "";
  return RISK_TYPE_LABELS[key] ?? key;
}

function statusLabel(status: unknown): string {
  const key = typeof status === "string" ? status : "";
  return STATUS_LABELS[key] ?? key;
}

function severityLabel(severity: unknown): string {
  const key = typeof severity === "string" ? severity : "";
  return SEVERITY_LABELS[key] ?? key;
}

function RiskMetric({ label, value, meta }: { label: string; value: number; meta: string }) {
  return (
    <div className="hrx-risk-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

function RiskTypeStrip({ dashboard }: { dashboard: RiskDashboard | null }) {
  const byType = dashboard?.by_type ?? {};
  return (
    <div className="hrx-risk-type-strip" data-hrx-risk-type-strip="legal-five">
      {RISK_TYPES.map((type) => (
        <div className="hrx-risk-type" key={type} data-risk-type={type}>
          <span>{RISK_TYPE_LABELS[type]}</span>
          <strong>{numberValue(byType[type])}</strong>
        </div>
      ))}
    </div>
  );
}

function RiskRow({ event, onAcknowledge, busy }: { key?: unknown; event: RiskEvent; onAcknowledge: (event: RiskEvent) => void | Promise<void>; busy: boolean }) {
  const eventId = event.risk_event_id ?? "";
  const canAcknowledge = event.status === "open" && Boolean(eventId);
  const promotionTarget = event.risk_type === "annual_leave_promotion_target";
  return (
    <div className="hrx-risk-row" data-risk-event-id={eventId} data-risk-type={event.risk_type ?? ""}>
      <div className="hrx-risk-row-main">
        <strong>{event.title || riskLabel(event.risk_type)}</strong>
        <span>{event.employee_id || "구성원 미지정"}</span>
      </div>
      <span className={`hrx-risk-severity severity-${event.severity ?? "medium"}`}>{severityLabel(event.severity)}</span>
      <span className="hrx-risk-status">{statusLabel(event.status)}</span>
      <span className="hrx-risk-date">{event.detected_on || "날짜 없음"}</span>
      <button type="button" className="secondary-button hrx-risk-row-action" disabled={promotionTarget ? busy : !canAcknowledge || busy} onClick={() => promotionTarget ? window.location.assign("?view=people&ctx=allow#people-annual-leave-notices") : onAcknowledge(event)}>
        {promotionTarget ? <CalendarClock size={15} /> : <CheckCircle2 size={15} />}
        {promotionTarget ? "캠페인" : "확인"}
      </button>
    </div>
  );
}

export function HrxRiskDashboard() {
  const [result, setResult] = useState<RiskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxRiskEvents().then((next) => {
      if (!cancelled) setResult(next as RiskResult);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dashboard = result?.kind === "data" || result?.kind === "guarded" ? result.dashboard : null;
  const riskEvents = useMemo(() => {
    return result?.kind === "data" ? [...result.risk_events].sort((left, right) => {
      const statusRank = (status: string | undefined) => (status === "open" ? 0 : status === "acknowledged" ? 1 : status === "in_progress" ? 2 : 3);
      return statusRank(left.status) - statusRank(right.status) || String(left.risk_type ?? "").localeCompare(String(right.risk_type ?? ""));
    }) : [];
  }, [result]);

  async function runScan() {
    setBusy(true);
    setActionMessage("");
    const next = await scanHrxRiskEvents();
    setBusy(false);
    if (next.kind !== "data") {
      setActionMessage("리스크 스캔 실패");
      return;
    }
    setResult({ kind: "data", risk_events: next.risk_events as RiskEvent[], dashboard: next.dashboard as RiskDashboard | null });
    setActionMessage(`${next.risk_events.length}건 스캔 완료`);
  }

  async function acknowledge(event: RiskEvent) {
    if (!event.risk_event_id) return;
    setBusy(true);
    setActionMessage("");
    const next = await transitionHrxRiskEvent(event.risk_event_id, "acknowledged");
    setBusy(false);
    if (next.kind !== "data") {
      setActionMessage("상태 변경 실패");
      return;
    }
    const refreshed = await fetchHrxRiskEvents();
    setResult(refreshed as RiskResult);
    setActionMessage("상태 변경 완료");
  }

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">HR 리스크를 불러오는 중입니다.</div>;
  } else if (result.kind === "guarded") {
    body = <div className="live-data-state live-data-denied">HR 리스크 접근 권한이 없습니다.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">HR 리스크를 불러올 수 없습니다.</div>;
  } else {
    body = (
      <>
        <div className="hrx-risk-metrics">
          <RiskMetric label="전체 이벤트" value={numberValue(dashboard?.event_count)} meta="스캔 결과" />
          <RiskMetric label="열린 이벤트" value={numberValue(dashboard?.open_count)} meta="확인 필요" />
          <RiskMetric label="감지 규칙" value={numberValue(dashboard?.legal_type_count)} meta="법적 5종" />
        </div>
        <RiskTypeStrip dashboard={dashboard} />
        <div className="hrx-risk-list" data-hrx-risk-event-list="true">
          {riskEvents.slice(0, 12).map((event) => (
            <RiskRow key={event.risk_event_id ?? `${event.risk_type}-${event.employee_id}`} event={event} onAcknowledge={acknowledge} busy={busy} />
          ))}
          {riskEvents.length === 0 && <div className="live-data-state live-data-empty">열린 HR 리스크 이벤트가 없습니다.</div>}
        </div>
      </>
    );
  }

  return (
    <Panel id="people-risk" className="people-panel span-2" title="HR 리스크" meta="법적 5종">
      <div className="people-panel-kicker">
        <ShieldAlert size={15} />
        근로계약, 연차촉진, 법정교육, 초과근로, 퇴사자 권한 회수를 점검합니다.
      </div>
      <div className="hrx-risk-toolbar" data-hrx-risk-dashboard="true">
        <button type="button" className="primary-button" onClick={runScan} disabled={busy} data-hrx-risk-scan="true">
          <RotateCw size={15} />
          스캔 실행
        </button>
        {actionMessage && <span>{actionMessage}</span>}
      </div>
      {body}
    </Panel>
  );
}
