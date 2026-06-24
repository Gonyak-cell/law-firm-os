import React from "react";
import { useEffect, useState } from "react";
import { Calculator, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchFinanceArAging, fetchFinanceInvoices, fetchFinanceTimeEntries } from "../data/apiClient.js";
import { DataTable, PageHeader, Panel } from "./primitives.jsx";

const FINANCE_PERMISSION_REF = "ui_cmp_g7_finance_live";
const FINANCE_AUDIT_HINT_REF = "ui_cmp_g7_finance_probe";

function timeRows(items) {
  return items.map((item, index) => [
    `기록 ${index + 1}`,
    "Matter",
    financeRole(item.role_id),
    item.duration_minutes,
    financeStatus(item.status)
  ]);
}

function invoiceRows(items) {
  return items.map((item, index) => [
    `청구서 ${index + 1}`,
    "Matter",
    financeStatus(item.status),
    item.amount_due,
    item.amount_paid ?? 0
  ]);
}

function agingRows(items) {
  return items.map((item, index) => [
    `기준 ${index + 1}`,
    item.bucket_1_30 ?? 0,
    item.bucket_31_60 ?? 0,
    item.bucket_90_plus ?? 0,
    item.balance_count ?? 0
  ]);
}

function financeStatus(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("paid")) return "수납 완료";
  if (normalized.includes("approved")) return "승인됨";
  if (normalized.includes("draft")) return "작성 중";
  if (normalized.includes("submitted")) return "검토 중";
  if (normalized.includes("rejected")) return "반려";
  if (normalized.includes("pending")) return "대기";
  return "확인 필요";
}

function financeRole(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("partner")) return "파트너";
  if (normalized.includes("associate")) return "어소시에이트";
  if (normalized.includes("paralegal")) return "실무 지원";
  if (normalized.includes("admin")) return "관리";
  return "담당자";
}

function LiveState({ result, noun }) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>{noun} 불러오는 중</strong>
        청구 정보를 확인하고 있습니다.
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
        현재 권한으로는 이 청구 정보를 볼 수 없습니다.
      </div>
    );
  }
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        담당자 확인 후 청구 정보를 볼 수 있습니다.
      </div>
    );
  }
  if (result.items.length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>{noun} 없음</strong>
        표시할 청구 정보가 없습니다.
      </div>
    );
  }
  return null;
}

function renderFinancePanel(result, noun, content) {
  const state = LiveState({ result, noun });
  return state ?? content;
}

export function FinanceSurface({ labels, liveCtx = "allow" }) {
  const [timeEntries, setTimeEntries] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [aging, setAging] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setTimeEntries(null);
    setInvoices(null);
    setAging(null);
    const args = { ctx: liveCtx, permissionRef: FINANCE_PERMISSION_REF, auditHintRef: FINANCE_AUDIT_HINT_REF };
    Promise.all([fetchFinanceTimeEntries(args), fetchFinanceInvoices(args), fetchFinanceArAging(args)]).then(
      ([nextTime, nextInvoices, nextAging]) => {
        if (!cancelled) {
          setTimeEntries(nextTime);
          setInvoices(nextInvoices);
          setAging(nextAging);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const timeItems = timeEntries?.kind === "data" ? timeEntries.items : [];
  const invoiceItems = invoices?.kind === "data" ? invoices.items : [];
  const agingItems = aging?.kind === "data" ? aging.items : [];

  return (
    <section className="surface stack finance-surface" data-cmp-g7-finance-surface="true">
      <PageHeader
        eyebrow="청구"
        title={labels.financeTitle}
        subtitle="시간 기록, 청구서, 미수금, 정산 관련 정보를 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="finance-runtime-grid">
        <Panel className="span-2 finance-panel" title="시간 기록" meta="업무 시간">
          {renderFinancePanel(
            timeEntries,
            "시간 기록",
            <DataTable columns={["기록", "Matter", "역할", "분", "상태"]} rows={timeRows(timeItems)} />
          )}
        </Panel>
        <Panel className="span-2 finance-panel" title="청구서" meta="청구 기록">
          {renderFinancePanel(
            invoices,
            "청구서",
            <DataTable columns={["청구서", "Matter", "상태", "청구액", "수납액"]} rows={invoiceRows(invoiceItems)} />
          )}
        </Panel>
        <Panel className="span-2 finance-panel" title="미수금" meta="수납 현황">
          {renderFinancePanel(
            aging,
            "미수금",
            <DataTable columns={["기준", "1-30일", "31-60일", "90일 이상", "건수"]} rows={agingRows(agingItems)} />
          )}
        </Panel>
        <Panel className="finance-panel" title="내보내기" meta="담당자 확인">
          <div className="matter-boundary-card">
            <Calculator size={20} />
            <strong>민감 정보는 목록에 표시하지 않습니다</strong>
            <span>계좌와 인증 정보는 담당자 권한이 있는 화면에서만 다룹니다.</span>
          </div>
        </Panel>
        <Panel className="finance-panel" title="청구 검토" meta="담당자 확인">
          <div className="matter-boundary-card">
            <ShieldCheck size={20} />
            <strong>청구 검토 대기 중</strong>
            <span>담당자가 확인하면 청구 처리 단계로 이동합니다.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
