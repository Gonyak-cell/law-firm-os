import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, ShieldCheck } from "lucide-react";
import {
  autoClassifyFinanceBankTransactions,
  fetchAnalyticsFinanceCashflow,
  fetchAnalyticsFinanceClients,
  fetchAnalyticsFinanceMonthly,
  fetchAnalyticsFinanceOverview,
  fetchFinanceBankClassificationOptions,
  fetchFinanceBankClassifications,
  reviewFinanceBankClassifications
} from "../data/apiClient.js";
import { HomeFinanceOperations } from "./HomeFinanceOperations.jsx";

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
const cashflowDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
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

function writeCashflowFilters(filters, source = globalThis) {
  if (!source?.history || !source?.location) return;
  const params = new URLSearchParams(source.location.search);
  for (const [key, value] of Object.entries({
    from: filters.from,
    to: filters.to,
    direction: filters.direction,
    category: filters.category
  })) {
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

function FinanceFilters({ filters, clients, onChange }) {
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
            <div><dt>인식 매출</dt><dd>{moneyLabel(row.revenue_amount, row.currency)}</dd></div>
            <div><dt>청구액</dt><dd>{moneyLabel(row.billed_amount, row.currency)}</dd></div>
            <div><dt>청구 수납</dt><dd>{moneyLabel(row.invoice_collected_amount, row.currency)}</dd></div>
            <div><dt>직접 보수</dt><dd>{moneyLabel(row.direct_fee_amount, row.currency)}</dd></div>
            <div><dt>선수·예치</dt><dd>{moneyLabel(row.advance_trust_amount, row.currency)}</dd></div>
            <div><dt>미분류 입금</dt><dd>{moneyLabel(row.unallocated_receipt_amount, row.currency)}</dd></div>
            <div><dt>기타 비매출</dt><dd>{moneyLabel(row.other_non_revenue_amount, row.currency)}</dd></div>
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
        <thead><tr><th>월</th><th>통화</th><th>인식 매출</th><th>청구액</th><th>청구 수납</th><th>직접 보수</th><th>선수·예치</th><th>미분류 입금</th><th>사건비용</th><th>미수금</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.month}:${row.currency}`}>
              <th scope="row">{row.month}</th><td>{row.currency}</td><td>{moneyLabel(row.revenue_amount, row.currency)}</td><td>{moneyLabel(row.billed_amount, row.currency)}</td><td>{moneyLabel(row.invoice_collected_amount, row.currency)}</td><td>{moneyLabel(row.direct_fee_amount, row.currency)}</td><td>{moneyLabel(row.advance_trust_amount, row.currency)}</td><td>{moneyLabel(row.unallocated_receipt_amount, row.currency)}</td><td>{moneyLabel(row.matter_cost, row.currency)}</td><td>{moneyLabel(row.ar_balance, row.currency)}</td>
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
        <thead><tr><th>고객</th><th>통화</th><th>Matter</th><th>인식 매출</th><th>청구액</th><th>청구 수납</th><th>직접 보수</th><th>선수·예치</th><th>미분류 입금</th><th>사건비용</th><th>미수금</th><th>기여액</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.client_group_id ?? "unlinked"}:${row.currency}:${index}`} data-home-finance-unlinked-client={!row.client_group_id ? "true" : undefined}>
              <th scope="row">{safeClientLabel(row)}</th><td>{row.currency}</td><td>{row.matter_count}</td><td>{moneyLabel(row.revenue_amount, row.currency)}</td><td>{moneyLabel(row.billed_amount, row.currency)}</td><td>{moneyLabel(row.invoice_collected_amount, row.currency)}</td><td>{moneyLabel(row.direct_fee_amount, row.currency)}</td><td>{moneyLabel(row.advance_trust_amount, row.currency)}</td><td>{moneyLabel(row.unallocated_receipt_amount, row.currency)}</td><td>{moneyLabel(row.matter_cost, row.currency)}</td><td>{moneyLabel(row.ar_balance, row.currency)}</td><td>{moneyLabel(row.contribution_amount, row.currency)}</td>
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

function CashflowFilters({ filters, categories, onChange }) {
  return (
    <div className="home-finance-filterbar home-cashflow-filterbar" data-home-cashflow-filters="true">
      <label>
        <span>시작일</span>
        <input type="date" value={filters.from} onChange={(event) => onChange("from", event.target.value)} />
      </label>
      <label>
        <span>종료일</span>
        <input type="date" value={filters.to} onChange={(event) => onChange("to", event.target.value)} />
      </label>
      <label>
        <span>거래 유형</span>
        <select value={filters.direction} onChange={(event) => onChange("direction", event.target.value)}>
          <option value="">전체</option>
          <option value="inflow">입금</option>
          <option value="outflow">출금</option>
        </select>
      </label>
      <label>
        <span>분류</span>
        <select value={filters.category} onChange={(event) => onChange("category", event.target.value)}>
          <option value="">전체 분류</option>
          {categories.map((row) => <option key={row.category} value={row.category}>{row.label}</option>)}
        </select>
      </label>
    </div>
  );
}

function CashflowSummary({ summary, reconciliation }) {
  const metrics = [
    ["현재 잔액", summary.current_balance],
    ["기간 입금", summary.total_inflow],
    ["기간 출금", summary.total_outflow],
    ["순이동", summary.net_movement]
  ];
  const basis = summary.basis_at ? cashflowDateTimeFormatter.format(new Date(summary.basis_at)) : "기준 시각 없음";
  return (
    <section className="home-cashflow-summary" aria-label="자금현황 요약" data-home-cashflow-summary="true">
      <header>
        <div>
          <strong>은행 입출금 기준</strong>
          <span>{basis} 기준, {reconciliation?.status === "passed" ? "대사 완료" : "대사 확인 필요"}</span>
        </div>
        <span>{summary.transaction_count}건, {summary.account_count}개 계좌</span>
      </header>
      <dl>
        {metrics.map(([label, value]) => (
          <div key={label} className={label === "순이동" && Number(value) < 0 ? "negative" : ""}>
            <dt>{label}</dt>
            <dd>{moneyLabel(value, summary.currency)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CashflowBusinessSummary({ summary }) {
  if (!summary) return null;
  const metrics = [
    ["고객 입금 후보", summary.sales_amount],
    ["운영비", summary.operating_expense_amount],
    ["급여 지급액", summary.payroll_payment_amount],
    ["비영업 자금", summary.non_operating_amount]
  ];
  return (
    <section className="home-cashflow-business-summary" aria-label="은행 거래 분류 요약" data-home-cashflow-business-summary="true">
      <header>
        <div>
          <strong>거래 분류 현황</strong>
          <span>고객과 연결된 입금은 후보이며, 배정 후 매출이 확정됩니다.</span>
        </div>
        <span>{summary.classified_count}건 중 미연결 {summary.unclassified_count}건</span>
      </header>
      <dl>
        {metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{moneyLabel(value, summary.currency)}</dd></div>)}
      </dl>
    </section>
  );
}

function CashflowMonthlyTable({ rows }) {
  return (
    <div className="home-finance-table-wrap home-cashflow-monthly-table" data-home-cashflow-monthly-table="true">
      <table>
        <thead><tr><th>월</th><th>입금</th><th>출금</th><th>고객 입금 후보</th><th>운영비</th><th>급여</th><th>순이동</th><th>거래</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.month}</th>
              <td>{moneyLabel(row.total_inflow, row.currency)}</td>
              <td>{moneyLabel(row.total_outflow, row.currency)}</td>
              <td>{moneyLabel(row.sales_amount, row.currency)}</td>
              <td>{moneyLabel(row.operating_expense_amount, row.currency)}</td>
              <td>{moneyLabel(row.payroll_payment_amount, row.currency)}</td>
              <td className={Number(row.net_movement) < 0 ? "negative" : ""}>{moneyLabel(row.net_movement, row.currency)}</td>
              <td>{row.transaction_count}건</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function linkedValue(row) {
  if (row.category === "client_receipt") return row.client_group_id ?? "";
  if (row.category === "salary_payment") return row.employee_id ?? "";
  return "";
}

function bankClassificationState(row) {
  if (row.status === "review_required") return { className: "review-required", label: "연결 확인 필요" };
  if (row.rationale_code === "manual_client_unlinked") return { className: "reviewed", label: "연결 해제" };
  if (["manual_client_linked", "manual_client_relinked"].includes(row.rationale_code)) {
    return { className: "reviewed", label: "직접 연결" };
  }
  if (row.classification_source === "manual_review") return { className: "reviewed", label: "검토 완료" };
  if (row.employee_label || row.client_group_label) return { className: "", label: "자동 연결" };
  if (row.confidence === "medium") return { className: "", label: "자동 분류" };
  return { className: "", label: "확정" };
}

function categoriesForDirection(categories, direction) {
  return categories.filter((row) => (
    direction === "inflow"
      ? ["sales", "non_operating"].includes(row.primary_type)
      : ["operating_expense", "payroll", "non_operating"].includes(row.primary_type)
  ));
}

function CashflowTransactionTable({
  rows,
  options,
  selectedIds,
  drafts,
  onToggle,
  onToggleAll,
  onDraft
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.bank_transaction_id));
  return (
    <div className="home-finance-table-wrap home-cashflow-transaction-table" data-home-cashflow-transaction-table="true">
      <table>
        <thead><tr>
          <th className="home-bank-classification-check">
            <input type="checkbox" checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} aria-label="표시 거래 전체 선택" />
          </th>
          <th>거래 일시</th><th>구분</th><th>금액</th><th>거래처 및 메모</th><th>분류</th><th>연결 대상</th><th>상태</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => {
            const draft = drafts[row.bank_transaction_id] ?? {};
            const category = draft.category ?? row.category;
            const targetValue = draft.linked_id ?? linkedValue(row);
            const categoryOptions = categoriesForDirection(options.categories, row.direction);
            const state = bankClassificationState(row);
            return (
            <tr key={row.bank_transaction_id} data-bank-classification-row={row.bank_transaction_id}>
              <td className="home-bank-classification-check">
                <input type="checkbox" checked={selectedIds.has(row.bank_transaction_id)} onChange={(event) => onToggle(row.bank_transaction_id, event.target.checked)} aria-label={`${row.counterparty || "거래"} 선택`} />
              </td>
              <th scope="row">{cashflowDateTimeFormatter.format(new Date(row.occurred_at))}</th>
              <td><span className={`home-cashflow-direction ${row.direction}`}>{row.direction === "inflow" ? "입금" : "출금"}</span></td>
              <td>{moneyLabel(row.amount, row.currency)}</td>
              <td>{[row.counterparty, row.memo].filter(Boolean).join(" / ") || "표시 없음"}</td>
              <td>
                <select
                  className="home-bank-classification-select"
                  value={category}
                  onChange={(event) => onDraft(row.bank_transaction_id, { category: event.target.value, linked_id: "" })}
                  aria-label={`${row.counterparty || "거래"} 분류`}
                >
                  {categoryOptions.map((item) => <option key={item.category} value={item.category}>{item.label}</option>)}
                </select>
              </td>
              <td>
                {category === "client_receipt" && (
                  <div className="home-bank-client-link">
                    <select className="home-bank-classification-select" value={targetValue} onChange={(event) => onDraft(row.bank_transaction_id, { linked_id: event.target.value })} aria-label="고객 연결">
                      <option value="">고객 선택</option>
                      {options.clients.map((item) => <option key={item.client_group_id} value={item.client_group_id}>{item.selection_label ?? item.label}</option>)}
                    </select>
                    {targetValue && (
                      <button
                        type="button"
                        className="home-bank-unlink-button"
                        onClick={() => onDraft(row.bank_transaction_id, { category: "other_inflow", linked_id: "" })}
                        aria-label={`${row.client_group_label ?? row.counterparty ?? "고객"} 연결 해제`}
                      >
                        연결 해제
                      </button>
                    )}
                  </div>
                )}
                {category === "salary_payment" && (
                  <select className="home-bank-classification-select" value={targetValue} onChange={(event) => onDraft(row.bank_transaction_id, { linked_id: event.target.value })} aria-label="구성원 연결">
                    <option value="">구성원 미확정</option>
                    {options.employees.map((item) => <option key={item.employee_id} value={item.employee_id}>{item.label} · {item.title}</option>)}
                  </select>
                )}
                {!["client_receipt", "salary_payment"].includes(category) && <span className="home-bank-classification-none">대상 없음</span>}
              </td>
              <td>
                <span className={`home-bank-classification-state ${state.className}`}>
                  {state.label}
                </span>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
}

function CashflowSurface({ liveCtx = "allow", refreshSignal = 0 }) {
  const [filters, setFilters] = useState(() => {
    const base = defaultFinanceFilters();
    return {
      from: base.from,
      to: base.to,
      direction: new URLSearchParams(globalThis.location?.search ?? "").get("direction") ?? "",
      category: new URLSearchParams(globalThis.location?.search ?? "").get("category") ?? ""
    };
  });
  const [cashflow, setCashflow] = useState(null);
  const [classifications, setClassifications] = useState(null);
  const [classificationOptions, setClassificationOptions] = useState(null);
  const [classificationRefresh, setClassificationRefresh] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [drafts, setDrafts] = useState({});
  const [rememberMatch, setRememberMatch] = useState(false);
  const [mutationState, setMutationState] = useState({ busy: false, message: "" });

  useEffect(() => {
    let cancelled = false;
    setCashflow(null);
    setClassifications(null);
    setClassificationOptions(null);
    const common = {
      ctx: liveCtx,
      permissionRef: FINANCE_PERMISSION_REF,
      auditHintRef: FINANCE_AUDIT_HINT_REF,
      from: filters.from,
      to: filters.to
    };
    Promise.all([
      fetchAnalyticsFinanceCashflow({ ...common, currency: "KRW" }),
      fetchFinanceBankClassifications({
        ...common,
        direction: filters.direction,
        category: filters.category,
        limit: 620
      }),
      fetchFinanceBankClassificationOptions(common)
    ]).then(([nextCashflow, nextClassifications, nextOptions]) => {
      if (cancelled) return;
      setCashflow(nextCashflow);
      setClassifications(nextClassifications);
      setClassificationOptions(nextOptions);
      setSelectedIds(new Set());
      setDrafts({});
    });
    return () => { cancelled = true; };
  }, [liveCtx, filters.from, filters.to, filters.direction, filters.category, refreshSignal, classificationRefresh]);

  function updateFilter(key, value) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      writeCashflowFilters(next);
      return next;
    });
  }

  function toggleRow(id, checked) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function updateDraft(id, values) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? {}), ...values } }));
    toggleRow(id, true);
  }

  async function runAutomaticClassification() {
    setMutationState({ busy: true, message: "" });
    const result = await autoClassifyFinanceBankTransactions({ ctx: liveCtx });
    if (result?.kind !== "data" || !["classified", "idempotent_replay"].includes(result.outcome)) {
      setMutationState({ busy: false, message: "자동 분류를 적용하지 못했습니다." });
      return;
    }
    setMutationState({ busy: false, message: "등록 고객과 구성원 기준으로 다시 연결했습니다." });
    setClassificationRefresh((value) => value + 1);
  }

  async function applySelectedClassifications() {
    const rowsById = new Map((classifications?.items ?? []).map((row) => [row.bank_transaction_id, row]));
    const decisions = [...selectedIds].map((id) => {
      const row = rowsById.get(id);
      const draft = drafts[id] ?? {};
      const category = draft.category ?? row?.category;
      const linkedId = draft.linked_id ?? linkedValue(row);
      return {
        bank_transaction_id: id,
        category,
        ...(category === "client_receipt" ? { client_group_id: linkedId } : {}),
        ...(category === "salary_payment" && linkedId ? { employee_id: linkedId } : {}),
        expected_state_version: row?.state_version,
        remember_match: rememberMatch,
        match_field: "counterparty"
      };
    });
    const missingStateVersion = decisions.some((decision) => (
      !Number.isSafeInteger(decision.expected_state_version)
      || decision.expected_state_version < 0
    ));
    if (
      decisions.length === 0
      || missingStateVersion
      || decisions.some((decision) => decision.category === "client_receipt" && !decision.client_group_id)
    ) {
      const message = decisions.length === 0
        ? "적용할 거래를 선택하세요."
        : missingStateVersion
          ? "선택한 거래의 분류 버전을 확인하지 못해 적용하지 않았습니다."
          : "고객 입금으로 분류할 거래의 고객을 선택하세요.";
      setMutationState({ busy: false, message });
      return;
    }
    setMutationState({ busy: true, message: "" });
    const result = await reviewFinanceBankClassifications({ decisions, ctx: liveCtx });
    if (result?.kind !== "data" || !["classified", "idempotent_replay"].includes(result.outcome)) {
      setMutationState({ busy: false, message: "선택한 분류를 저장하지 못했습니다." });
      return;
    }
    setMutationState({ busy: false, message: `${decisions.length}건의 분류와 연결을 저장했습니다.` });
    setClassificationRefresh((value) => value + 1);
  }

  const summary = cashflow?.item?.summary;
  const businessSummary = cashflow?.item?.business_summary;
  const monthly = cashflow?.item?.monthly ?? [];
  const options = classificationOptions?.item ?? { categories: [], clients: [], employees: [] };
  const visibleRows = classifications?.items ?? [];
  return (
    <section className="home-finance-surface home-cashflow-surface" data-home-finance-surface="true" data-home-finance-section="home-finance-cashflow">
      <CashflowFilters filters={filters} categories={options.categories} onChange={updateFilter} />
      <p className="home-finance-scope-note">은행 입출금 기준입니다. 고객과 연결된 입금은 입금 후보로 표시하며, 입금 배정 전에는 매출로 확정하지 않습니다.</p>
      <FinanceReadState result={cashflow}>
        <CashflowSummary summary={summary} reconciliation={cashflow?.item?.reconciliation} />
        <CashflowBusinessSummary summary={businessSummary} />
        <section className="home-finance-section-block">
          <header><h2>월별 자금 흐름</h2><span>KRW, 서울 시간 기준</span></header>
          <CashflowMonthlyTable rows={monthly} />
        </section>
        <section className="home-finance-section-block">
          <header>
            <h2>거래 연결</h2>
            <span>
              {classifications?.summary?.confirmed_count ?? 0}건 확정
              {(classifications?.summary?.review_count ?? 0) > 0
                ? ` · ${classifications.summary.review_count}건 확인 필요`
                : ""}
            </span>
          </header>
          <div className="home-bank-classification-toolbar" data-bank-classification-toolbar="true">
            <div>
              <button type="button" className="secondary-button" onClick={runAutomaticClassification} disabled={mutationState.busy}>
                <RefreshCw size={16} aria-hidden="true" /> 자동 연결
              </button>
              <label>
                <input type="checkbox" checked={rememberMatch} onChange={(event) => setRememberMatch(event.target.checked)} />
                이 입금자명 기억
              </label>
            </div>
            <div>
              {mutationState.message && <span role="status">{mutationState.message}</span>}
              <button type="button" className="primary-button" onClick={applySelectedClassifications} disabled={mutationState.busy || selectedIds.size === 0}>
                <Check size={16} aria-hidden="true" /> 선택 적용 ({selectedIds.size})
              </button>
            </div>
          </div>
          <FinanceReadState result={classifications}>
            <CashflowTransactionTable
              rows={visibleRows}
              options={options}
              selectedIds={selectedIds}
              drafts={drafts}
              onToggle={toggleRow}
              onToggleAll={(checked) => setSelectedIds(checked ? new Set(visibleRows.map((row) => row.bank_transaction_id)) : new Set())}
              onDraft={updateDraft}
            />
          </FinanceReadState>
        </section>
      </FinanceReadState>
    </section>
  );
}

function FinanceAggregateSurface({ liveCtx = "allow", activeSection = "home-finance-overview", refreshSignal = 0 }) {
  const section = aggregateSections.has(activeSection) ? activeSection : "home-finance-overview";
  const [filters, setFilters] = useState(() => defaultFinanceFilters());
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [clients, setClients] = useState(null);

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
  }, [liveCtx, filters.from, filters.to, filters.currency, filters.clientGroupId, filters.matterId, filters.recognitionBasis, refreshSignal]);

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
      <FinanceFilters filters={filters} clients={clientRows} onChange={updateFilter} />
      <p className="home-finance-scope-note">Matter 기반 청구, 수납, 사건비용 집계입니다. 입금은 배정 유형이 확정되기 전까지 매출로 계산하지 않으며, 급여와 일반 관리비는 포함하지 않습니다.</p>
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

export function FinanceSurface({ liveCtx = "allow", activeSection = "home-finance-overview", refreshSignal = 0 }) {
  if (activeSection === "home-finance-cashflow") return <CashflowSurface liveCtx={liveCtx} refreshSignal={refreshSignal} />;
  if (!aggregateSections.has(activeSection)) return <HomeFinanceOperations liveCtx={liveCtx} activeSection={activeSection} refreshSignal={refreshSignal} />;
  return <FinanceAggregateSurface liveCtx={liveCtx} activeSection={activeSection} refreshSignal={refreshSignal} />;
}
