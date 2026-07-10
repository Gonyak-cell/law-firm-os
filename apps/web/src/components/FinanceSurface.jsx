import React from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import {
  fetchAnalyticsFinanceClients,
  fetchAnalyticsFinanceMonthly,
  fetchAnalyticsFinanceOverview
} from "../data/apiClient.js";

const FINANCE_PERMISSION_REF = "ui_home_finance_read";
const FINANCE_AUDIT_HINT_REF = "ui_home_finance_probe";
const aggregateSections = new Set(["home-finance-overview", "home-finance-monthly", "home-finance-clients"]);
const currencyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function seoulDateParts(date = new Date()) {
  return Object.fromEntries(seoulDateFormatter.formatToParts(date).map((part) => [part.type, part.value]));
}

function defaultFinanceFilters(source = globalThis) {
  const params = new URLSearchParams(source?.location?.search ?? "");
  const today = seoulDateParts();
  return {
    from: params.get("from") ?? `${today.year}-${today.month}-01`,
    to: params.get("to") ?? `${today.year}-${today.month}-${today.day}`,
    currency: params.get("currency") ?? "",
    clientGroupId: params.get("client_group_id") ?? "",
    matterId: params.get("matter_id") ?? "",
    recognitionBasis: params.get("recognition_basis") === "collected" ? "collected" : "billed"
  };
}

function writeFinanceFilters(filters, source = globalThis) {
  if (!source?.history || !source?.location) return;
  const params = new URLSearchParams(source.location.search);
  const values = {
    from: filters.from,
    to: filters.to,
    currency: filters.currency,
    client_group_id: filters.clientGroupId,
    matter_id: filters.matterId,
    recognition_basis: filters.recognitionBasis === "collected" ? "collected" : ""
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const hash = source.location.hash ?? "";
  source.history.replaceState(source.history.state, "", `${source.location.pathname}?${params.toString()}${hash}`);
}

function moneyLabel(value, currency) {
  const amount = currencyFormatter.format(Number(value ?? 0));
  return currency === "KRW" ? `${amount}원` : `${currency || "통화 미상"} ${amount}`;
}

function safeClientLabel(row) {
  const label = String(row?.client_group_label ?? "").trim();
  if (!row?.client_group_id) return "미연결 고객";
  if (!label || /^(client|group|party|tenant)[-_:.]/i.test(label)) return "고객명 확인 필요";
  return label;
}

function readState(result) {
  if (result === null) return "loading";
  if (result?.kind === "error") return "error";
  if (result?.uiState === "denied") return "denied";
  if (result?.uiState === "review_required" || ["review_required", "approval_required"].includes(result?.outcome)) return "review";
  if (result?.uiState === "empty") return "empty";
  return "ready";
}

function FinanceReadState({ result, children }) {
  const state = readState(result);
  if (state === "ready") return children;
  const copy = {
    loading: ["집계를 불러오는 중입니다", "권한 범위와 원장 대사를 확인하고 있습니다."],
    error: ["집계를 불러오지 못했습니다", "연결 상태를 확인한 뒤 새로고침하세요."],
    denied: ["재무 집계 접근 권한이 없습니다", "금액과 건수는 표시하지 않습니다."],
    review: ["재무 집계 검토가 필요합니다", "담당자 확인 후 결과를 표시합니다."],
    empty: ["표시할 재무 내역이 없습니다", "선택한 기간과 필터를 확인하세요."]
  }[state];
  return (
    <div className={`live-data-state live-data-${state}`} data-home-finance-state={state}>
      <strong>{copy[0]}</strong>
      <span>{copy[1]}</span>
    </div>
  );
}

function FinanceFilters({ filters, clients, onChange, onRefresh }) {
  const clientOptions = useMemo(() => {
    const unique = new Map();
    for (const row of clients) {
      if (row.client_group_id) unique.set(row.client_group_id, safeClientLabel(row));
    }
    return [...unique.entries()];
  }, [clients]);
  return (
    <div className="home-finance-filterbar" data-home-finance-filters="true">
      <label>
        <span>시작일</span>
        <input type="date" value={filters.from} onChange={(event) => onChange("from", event.target.value)} />
      </label>
      <label>
        <span>종료일</span>
        <input type="date" value={filters.to} onChange={(event) => onChange("to", event.target.value)} />
      </label>
      <label>
        <span>통화</span>
        <select value={filters.currency} onChange={(event) => onChange("currency", event.target.value)}>
          <option value="">전체 통화</option>
          <option value="KRW">KRW</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <label>
        <span>고객</span>
        <select value={filters.clientGroupId} onChange={(event) => onChange("clientGroupId", event.target.value)}>
          <option value="">전체 고객</option>
          {clientOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label>
        <span>인식 기준</span>
        <select value={filters.recognitionBasis} onChange={(event) => onChange("recognitionBasis", event.target.value)}>
          <option value="billed">청구 기준</option>
          <option value="collected">수납 기준</option>
        </select>
      </label>
      <button className="secondary-button home-finance-refresh" type="button" onClick={onRefresh}>
        <RefreshCw size={15} />
        새로고침
      </button>
      {filters.matterId && <span className="home-finance-context-note">선택 Matter 적용 중</span>}
    </div>
  );
}

function SummaryLedger({ totals }) {
  return (
    <section className="home-finance-summary" aria-label="재무 요약" data-home-finance-summary="true">
      {totals.map((row) => (
        <article key={row.currency} className="home-finance-currency-block">
          <header>
            <strong>{row.currency}</strong>
            <span>{row.transaction_count}건 · 추론 날짜 {row.date_inferred_count}건</span>
          </header>
          <dl>
            <div><dt>청구액</dt><dd>{moneyLabel(row.billed_amount, row.currency)}</dd></div>
            <div><dt>수납액</dt><dd>{moneyLabel(row.collected_amount, row.currency)}</dd></div>
            <div><dt>사건비용</dt><dd>{moneyLabel(row.matter_cost, row.currency)}</dd></div>
            <div><dt>미수금</dt><dd>{moneyLabel(row.ar_balance, row.currency)}</dd></div>
            <div><dt>기여액</dt><dd>{moneyLabel(row.contribution_amount, row.currency)}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}

function MonthlyTable({ rows }) {
  return (
    <div className="home-finance-table-wrap" data-home-finance-monthly-table="true">
      <table>
        <thead><tr><th>월</th><th>통화</th><th>청구액</th><th>수납액</th><th>사건비용</th><th>회수 가능 비용</th><th>미수금</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.month}:${row.currency}`}>
              <th scope="row">{row.month}</th><td>{row.currency}</td><td>{moneyLabel(row.billed_amount, row.currency)}</td><td>{moneyLabel(row.collected_amount, row.currency)}</td><td>{moneyLabel(row.matter_cost, row.currency)}</td><td>{moneyLabel(row.recoverable_cost, row.currency)}</td><td>{moneyLabel(row.ar_balance, row.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientTable({ rows }) {
  return (
    <div className="home-finance-table-wrap" data-home-finance-client-table="true">
      <table>
        <thead><tr><th>고객</th><th>통화</th><th>Matter</th><th>청구액</th><th>수납액</th><th>사건비용</th><th>미수금</th><th>기여액</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.client_group_id ?? "unlinked"}:${row.currency}:${index}`} data-home-finance-unlinked-client={!row.client_group_id ? "true" : undefined}>
              <th scope="row">{safeClientLabel(row)}</th><td>{row.currency}</td><td>{row.matter_count}</td><td>{moneyLabel(row.billed_amount, row.currency)}</td><td>{moneyLabel(row.collected_amount, row.currency)}</td><td>{moneyLabel(row.matter_cost, row.currency)}</td><td>{moneyLabel(row.ar_balance, row.currency)}</td><td>{moneyLabel(row.contribution_amount, row.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReconciliationNotice({ totals, partial }) {
  const inferred = totals.reduce((sum, row) => sum + Number(row.date_inferred_count ?? 0), 0);
  const unlinked = totals.reduce((sum, row) => sum + Number(row.unlinked_amount ?? 0), 0);
  if (!partial && inferred === 0 && unlinked === 0) return null;
  return (
    <aside className="home-finance-reconciliation" data-home-finance-reconciliation="true">
      <ShieldCheck size={17} />
      <div>
        <strong>대사 확인 필요</strong>
        {partial && <span>일부 원천이 응답하지 않아 부분 집계로 표시합니다.</span>}
        {inferred > 0 && <span>기준일을 생성일로 추론한 내역 {inferred}건</span>}
        {unlinked > 0 && <span>고객 연결이 없는 금액이 있습니다.</span>}
      </div>
    </aside>
  );
}

export function FinanceSurface({ liveCtx = "allow", activeSection = "home-finance-overview" }) {
  const section = aggregateSections.has(activeSection) ? activeSection : "home-finance-overview";
  const [filters, setFilters] = useState(() => defaultFinanceFilters());
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [clients, setClients] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    setMonthly(null);
    setClients(null);
    const args = {
      ctx: liveCtx,
      permissionRef: FINANCE_PERMISSION_REF,
      auditHintRef: FINANCE_AUDIT_HINT_REF,
      ...filters
    };
    Promise.all([
      fetchAnalyticsFinanceOverview(args),
      fetchAnalyticsFinanceMonthly(args),
      fetchAnalyticsFinanceClients(args)
    ]).then(([nextOverview, nextMonthly, nextClients]) => {
      if (cancelled) return;
      setOverview(nextOverview);
      setMonthly(nextMonthly);
      setClients(nextClients);
    });
    return () => { cancelled = true; };
  }, [liveCtx, filters.from, filters.to, filters.currency, filters.clientGroupId, filters.matterId, filters.recognitionBasis, refreshToken]);

  const totals = overview?.item?.totals ?? [];
  const monthlyRows = monthly?.items ?? [];
  const clientRows = clients?.items ?? [];
  const activeResult = section === "home-finance-monthly" ? monthly : section === "home-finance-clients" ? clients : overview;

  function updateFilter(key, value) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      writeFinanceFilters(next);
      return next;
    });
  }

  return (
    <section className="home-finance-surface" data-home-finance-surface="true" data-home-finance-section={section}>
      <FinanceFilters filters={filters} clients={clientRows} onChange={updateFilter} onRefresh={() => setRefreshToken((value) => value + 1)} />
      <p className="home-finance-scope-note">Matter 기반 청구, 수납, 사건비용 집계입니다. 급여와 일반 관리비는 포함하지 않습니다.</p>
      <FinanceReadState result={activeResult}>
        <ReconciliationNotice totals={totals} partial={[overview, monthly, clients].some((result) => result?.outcome === "partial")} />
        {section === "home-finance-overview" && (
          <div className="home-finance-overview">
            <SummaryLedger totals={totals} />
            <section className="home-finance-section-block"><header><h2>월별 흐름</h2><span>서울 시간 기준</span></header><MonthlyTable rows={monthlyRows.slice(-6)} /></section>
            <section className="home-finance-section-block"><header><h2>고객별 현황</h2><span>고객 그룹 기준</span></header><ClientTable rows={clientRows.slice(0, 8)} /></section>
          </div>
        )}
        {section === "home-finance-monthly" && <section className="home-finance-section-block"><header><h2>월별 매출/비용</h2><span>통화별 합계</span></header><MonthlyTable rows={monthlyRows} /></section>}
        {section === "home-finance-clients" && <section className="home-finance-section-block"><header><h2>고객별 매출/비용</h2><span>미연결 고객 포함</span></header><ClientTable rows={clientRows} /></section>}
      </FinanceReadState>
    </section>
  );
}
