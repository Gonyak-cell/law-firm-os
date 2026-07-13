import React, { useEffect, useMemo, useState } from "react";
import { CalendarSync, Database, Download, RefreshCw, ShieldCheck } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  captureHrxLeaveBalanceSnapshot,
  exportHrxLeaveUsage,
  fetchHrxLeaveIntegrations,
  fetchHrxLeaveUsage,
  processHrxLeaveIntegrations,
  validateHrxLeaveBalances
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function minutes(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const days = Math.floor(absolute / 480);
  const remainder = absolute % 480;
  if (days && remainder) return `${sign}${days}일 ${remainder}분`;
  if (days) return `${sign}${days}일`;
  return `${sign}${remainder}분`;
}

const ENTRY_LABELS: Record<string, string> = {
  earned: "발생",
  carryover: "이월",
  reserved: "예약",
  released: "예약 해제",
  used: "사용",
  adjustment: "조정",
  expired: "소멸"
};

const PROVIDER_LABELS: Record<string, string> = {
  schedule: "일정",
  attendance: "출퇴근",
  payroll: "급여",
  notification: "알림"
};

function eventLabel(value: string) {
  if (value === "leave.request.approved") return "승인 휴가 반영";
  if (value === "leave.request.cancelled_after_approval") return "승인 휴가 취소 반영";
  if (value === "leave.termination.payroll_reconciliation_requested") return "퇴사 정산 급여 인계";
  if (value.includes("promotion")) return "연차 사용 촉진";
  if (value.includes("reschedule")) return "시기변경 안내";
  if (value.includes("submitted")) return "휴가 신청 안내";
  return "휴가 상태 안내";
}

export function LeaveUsagePage({ canExport = false, canProcessIntegrations = false }: { canExport?: boolean; canProcessIntegrations?: boolean }) {
  const today = localDate();
  const [filters, setFilters] = useState({ from: `${today.slice(0, 4)}-01-01`, to: today, employee_id: "", group_id: "", entry_type: "", state: "", expiry_from: "", expiry_to: "" });
  const [report, setReport] = useState<Row | null>(null);
  const [validation, setValidation] = useState<Row | null>(null);
  const [integration, setIntegration] = useState<Row | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load(nextFilters = filters) {
    setBusy("load");
    setError("");
    const [usage, balances] = await Promise.all([fetchHrxLeaveUsage(nextFilters), validateHrxLeaveBalances(nextFilters.to)]);
    setBusy("");
    if (usage.kind !== "data") {
      setError("휴가 원장 내역을 불러오지 못했습니다.");
      return;
    }
    setReport(usage.report as Row);
    if (balances.kind === "data") setValidation(balances.validation as Row);
    if (canExport) {
      const sync = await fetchHrxLeaveIntegrations();
      if (sync.kind === "data") setIntegration(sync.integration as Row);
    }
  }

  useEffect(() => { void load(); }, []);

  const rows = Array.isArray(report?.rows) ? report.rows as Row[] : [];
  const balances = Array.isArray(report?.current_balances) ? report.current_balances as Row[] : [];
  const totals = report?.totals as Row | undefined;
  const validationRows = Array.isArray(validation?.rows) ? validation.rows as Row[] : [];
  const validationCounts = validation?.counts as Row | undefined;
  const employees = useMemo(() => [...new Map(balances.map((row) => [text(row, "employee_id"), { id: text(row, "employee_id"), name: text(row, "employee_display_name") }] as const)).values()], [balances]);
  const groups = useMemo(() => [...new Map(balances.map((row) => [text(row, "group_id"), { id: text(row, "group_id"), name: text(row, "group_display_name") }] as const).filter(([id]) => id)).values()], [balances]);
  const currentAvailable = balances.reduce((sum, row) => sum + number(row, "available_minutes"), 0);
  const integrationRows = Array.isArray(integration?.rows) ? integration.rows as Row[] : [];
  const integrationSummary = integration?.summary as Row | undefined;

  async function processIntegrations() {
    setBusy("integrations");
    setError("");
    const result = await processHrxLeaveIntegrations();
    setBusy("");
    if (result.kind !== "data") {
      setError("대기 중인 휴가 연동을 처리하지 못했습니다. 원장 상태는 변경되지 않았습니다.");
      return;
    }
    setIntegration(result.integration as Row);
  }

  async function download(format: "csv" | "xlsx") {
    setBusy(format);
    setError("");
    const result = await exportHrxLeaveUsage(format, filters);
    setBusy("");
    if (result.kind !== "data") {
      setError("현재 필터의 내보내기 파일을 만들지 못했습니다.");
      return;
    }
    const artifact = result.export as Row;
    const binary = window.atob(text(artifact, "content_base64"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: text(artifact, "mime_type") }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = text(artifact, "file_name");
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function captureSnapshot() {
    setBusy("snapshot");
    const result = await captureHrxLeaveBalanceSnapshot(filters.to);
    setBusy("");
    if (result.kind !== "data") {
      setError("잔액 스냅샷을 저장하지 못했습니다.");
      return;
    }
    const next = await validateHrxLeaveBalances(filters.to);
    if (next.kind === "data") setValidation(next.validation as Row);
  }

  return (
    <Panel id="people-leave-usage" className="people-panel span-2 leave-report-panel" title="휴가 사용 내역" meta={`${number(totals, "row_count")}건`}>
      <div className="people-panel-kicker"><Database size={15} />원장 기록을 현재 권한과 필터 범위에서 다시 계산합니다</div>
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      <form className="leave-report-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <label><span>시작일</span><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label><span>종료일</span><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        {employees.length > 1 && <label><span>구성원</span><select value={filters.employee_id} onChange={(event) => setFilters({ ...filters, employee_id: event.target.value })}><option value="">전체</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
        <label><span>휴가 그룹</span><select value={filters.group_id} onChange={(event) => setFilters({ ...filters, group_id: event.target.value })}><option value="">전체</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label><span>원장 종류</span><select value={filters.entry_type} onChange={(event) => setFilters({ ...filters, entry_type: event.target.value })}><option value="">전체</option>{Object.entries(ENTRY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>요청 상태</span><select value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}><option value="">전체</option><option value="submitted">승인 대기</option><option value="approved">승인</option><option value="rejected">반려</option><option value="cancelled">취소</option></select></label>
        <button className="secondary-button" disabled={busy === "load"}><RefreshCw size={14} />조회</button>
      </form>

      <div className="leave-report-summary" aria-label="휴가 원장 합계">
        <span><small>현재 잔액</small><strong>{minutes(currentAvailable)}</strong></span>
        <span><small>필터 내 발생</small><strong>{minutes(number(totals, "earned") + number(totals, "carryover"))}</strong></span>
        <span><small>예약</small><strong>{minutes(number(totals, "reserved") - number(totals, "released"))}</strong></span>
        <span><small>사용</small><strong>{minutes(number(totals, "used"))}</strong></span>
        <span><small>조정</small><strong>{minutes(number(totals, "adjustment"))}</strong></span>
        <span><small>소멸</small><strong>{minutes(number(totals, "expired"))}</strong></span>
      </div>

      <div className={`leave-balance-validation ${number(validationCounts, "mismatch") > 0 ? "is-mismatch" : ""}`}>
        <div><ShieldCheck size={16} /><span>잔액 대조</span><strong>일치 {number(validationCounts, "match")} · 불일치 {number(validationCounts, "mismatch")} · 기준 없음 {number(validationCounts, "missing")}</strong></div>
        {canExport && <button className="secondary-button" type="button" disabled={busy === "snapshot"} onClick={() => void captureSnapshot()}>현재 잔액 스냅샷</button>}
      </div>
      {validationRows.some((row) => text(row, "state") === "mismatch") && <div className="leave-balance-mismatch-list">{validationRows.filter((row) => text(row, "state") === "mismatch").map((row) => <span key={`${text(row, "employee_id")}:${text(row, "group_id")}`}>{text(row, "employee_display_name")} · {text(row, "group_display_name")} {minutes(number(row, "delta_minutes"))}</span>)}</div>}

      {canExport && <section className="leave-integration-status" data-leave-integration-status="true">
        <div className="leave-integration-head">
          <div><CalendarSync size={16} /><span><strong>업무 시스템 연동</strong><small>일정·출퇴근·급여·알림의 전달 확인 상태를 분리해 표시합니다.</small></span></div>
          {canProcessIntegrations && <button className="secondary-button" type="button" disabled={busy === "integrations"} onClick={() => void processIntegrations()}><RefreshCw size={14} />대기 항목 처리</button>}
        </div>
        <div className="leave-integration-summary">
          <span><small>동기화 대기</small><strong>{number(integrationSummary, "pending_sync")}</strong></span>
          <span><small>전달 완료</small><strong>{number(integrationSummary, "delivered")}</strong></span>
          <span><small>전달 실패</small><strong>{number(integrationSummary, "failed_deliveries")}</strong></span>
          <span><small>공급자 미설정</small><strong>{number(integrationSummary, "not_configured")}</strong></span>
        </div>
        {integrationRows.length > 0 ? <div className="leave-integration-list">{integrationRows.slice(0, 8).map((row) => {
          const deliveries = Array.isArray(row.deliveries) ? row.deliveries as Row[] : [];
          return <div className="leave-integration-row" key={text(row, "outbox_event_id")}>
            <span><strong>{eventLabel(text(row, "event_type"))}</strong><small>{text(row, "state") === "delivered" ? "전달 완료" : "동기화 대기"}</small></span>
            <div>{deliveries.length > 0 ? deliveries.map((delivery) => <span className="record-state-badge" data-state={text(delivery, "state") === "delivered" ? "live" : "review"} key={text(delivery, "delivery_id")}>{PROVIDER_LABELS[text(delivery, "provider_kind")] ?? text(delivery, "provider_kind")} · {text(delivery, "state") === "delivered" ? text(delivery, "provider_mode") === "internal_projection" ? "연결됨" : "전달" : text(delivery, "state") === "not_configured" ? "미설정" : "대기"}</span>) : <span className="record-state-badge" data-state="review">처리 대기</span>}</div>
          </div>;
        })}</div> : <div className="live-data-state live-data-empty">아직 처리할 휴가 연동 이벤트가 없습니다.</div>}
        <p>외부 공급자는 전달 확인값이 기록되기 전까지 완료로 표시하지 않으며, 실패해도 휴가 원장 승인은 유지됩니다.</p>
      </section>}

      <div className="leave-report-toolbar">
        <span>사유와 첨부는 기본 내보내기에서 제외됩니다.</span>
        {canExport && <div><button className="secondary-button" type="button" disabled={busy === "csv"} onClick={() => void download("csv")}><Download size={14} />CSV</button><button className="secondary-button" type="button" disabled={busy === "xlsx"} onClick={() => void download("xlsx")}><Download size={14} />XLSX</button></div>}
      </div>

      {rows.length > 0 ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>발생일</th><th>구성원</th><th>그룹</th><th>구분</th><th>분</th><th>잔액 영향</th><th>만료일</th><th>요청 상태</th></tr></thead><tbody>{rows.map((row) => <tr key={text(row, "entry_id")}><td>{text(row, "occurred_on")}</td><td><strong>{text(row, "employee_display_name")}</strong></td><td>{text(row, "group_display_name")}</td><td><span className={`record-state-badge ${text(row, "entry_type")}`}>{ENTRY_LABELS[text(row, "entry_type")] ?? text(row, "entry_type")}</span></td><td>{number(row, "amount_minutes").toLocaleString("ko-KR")}분</td><td>{minutes(number(row, "balance_effect_minutes"))}</td><td>{text(row, "expires_on") || "-"}</td><td>{text(row, "request_state") || "-"}</td></tr>)}</tbody></table></div> : <div className="live-data-state live-data-empty">현재 권한과 필터에 해당하는 원장 내역이 없습니다.</div>}
    </Panel>
  );
}
