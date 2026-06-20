import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Calculator, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchFinanceArAging, fetchFinanceInvoices, fetchFinanceTimeEntries } from "../data/apiClient.js";
import { DataTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const FINANCE_PERMISSION_REF = "ui_cmp_g7_finance_live";
const FINANCE_AUDIT_HINT_REF = "ui_cmp_g7_finance_probe";

function timeRows(items) {
  return items.map((item) => [item.time_entry_id, item.matter_id, item.role_id, item.duration_minutes, item.status]);
}

function invoiceRows(items) {
  return items.map((item) => [item.invoice_id, item.matter_id, item.status, item.amount_due, item.amount_paid ?? 0]);
}

function agingRows(items) {
  return items.map((item) => [item.ar_aging_snapshot_id, item.bucket_1_30 ?? 0, item.bucket_31_60 ?? 0, item.bucket_90_plus ?? 0, item.balance_count ?? 0]);
}

function LiveState({ result, noun }) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>Loading {noun}</strong>
        Reading Finance runtime data from the API.
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>{noun} API unavailable</strong>
        Start the Law Firm OS API and reload this live surface.
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        The permission gate blocked this Finance request.
      </div>
    );
  }
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        This Finance request requires review before rows can be displayed.
      </div>
    );
  }
  if (result.items.length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>No {noun}</strong>
        The live query returned no rows.
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
  const metrics = useMemo(
    () => ({
      time: timeItems.length,
      invoices: invoiceItems.length,
      ar: agingItems.reduce((sum, item) => sum + Number(item.bucket_1_30 ?? 0), 0)
    }),
    [timeItems, invoiceItems, agingItems]
  );

  return (
    <section className="surface stack finance-surface" data-cmp-g7-finance-surface="true">
      <PageHeader
        eyebrow="CMP-G7"
        title={labels.financeTitle}
        subtitle="Time, WIP, billing, payment, AR, accounting export, tax export, and settlement runtime."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Time" value={metrics.time} delta="approved rows" tone="blue" />
        <MetricCard label="Invoices" value={metrics.invoices} delta="issued rows" tone="green" />
        <MetricCard label="Open AR" value={metrics.ar} delta="safe aging" tone="purple" />
      </div>
      <div className="finance-runtime-grid">
        <Panel className="span-2 finance-panel" title="Time Entries" meta="/api/finance/time-entries">
          {renderFinancePanel(
            timeEntries,
            "time entries",
            <DataTable columns={["Entry", "Matter", "Role", "Minutes", "Status"]} rows={timeRows(timeItems)} />
          )}
        </Panel>
        <Panel className="span-2 finance-panel" title="Invoices" meta="/api/finance/invoices">
          {renderFinancePanel(
            invoices,
            "invoices",
            <DataTable columns={["Invoice", "Matter", "Status", "Due", "Paid"]} rows={invoiceRows(invoiceItems)} />
          )}
        </Panel>
        <Panel className="span-2 finance-panel" title="AR Aging" meta="/api/finance/ar-aging">
          {renderFinancePanel(
            aging,
            "AR aging",
            <DataTable columns={["Snapshot", "1-30", "31-60", "90+", "Balances"]} rows={agingRows(agingItems)} />
          )}
        </Panel>
        <Panel className="finance-panel" title="Export Boundary" meta="review gated">
          <div className="matter-boundary-card">
            <Calculator size={20} />
            <strong>Accounting exports are review-ready</strong>
            <span>Credential material and raw bank refs stay outside API projections.</span>
          </div>
        </Panel>
        <Panel className="finance-panel" title="Release Boundary" meta="owner gated">
          <div className="matter-boundary-card">
            <ShieldCheck size={20} />
            <strong>R4 runtime write-ready only</strong>
            <span>Production-ready stays false until owner approval and release gates pass.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
