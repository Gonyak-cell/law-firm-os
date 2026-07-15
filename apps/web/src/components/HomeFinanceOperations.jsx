import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  approveFinancePreBill,
  createFinanceDisbursement,
  createFinanceExpense,
  createFinancePreBill,
  createFinanceTimeEntry,
  fetchFinanceAccountingExport,
  fetchFinanceArAging,
  fetchFinanceAudit,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchMatterRecords,
  generateFinanceWip,
  importFinancePayment,
  issueFinanceInvoice,
  lockFinanceWipSnapshot,
  matchFinancePayment,
  readLawosApiSession,
  readLawosSessionEnvelope
} from "../data/apiClient.js";
import { ChargePanel } from "./MattersSurface.jsx";
import { canAccessFinanceScope } from "../data/financeAccess.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialMatterId(source = globalThis) {
  return new URLSearchParams(source?.location?.search ?? "").get("matter_id") ?? "";
}

function writeMatterId(matterId, source = globalThis) {
  if (!source?.history || !source?.location) return;
  const params = new URLSearchParams(source.location.search);
  if (matterId) params.set("matter_id", matterId);
  else params.delete("matter_id");
  source.history.replaceState(source.history.state, "", `${source.location.pathname}?${params.toString()}${source.location.hash ?? ""}`);
}

function items(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 1;
}

function minutes(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : 1;
}

function matterLabel(matter, index) {
  const code = String(matter?.matter_code ?? matter?.matter_number ?? "").trim();
  const title = String(matter?.title ?? "").trim();
  const safeCode = !code || /synthetic|tenant|_[a-z0-9]/i.test(code) ? `Matter ${index + 1}` : code;
  const safeTitle = !title || /synthetic|tenant|_[a-z0-9]/i.test(title) ? "" : title;
  return safeTitle ? `${safeCode} — ${safeTitle}` : safeCode;
}

function operationMode(section) {
  if (section === "home-finance-time") return "time";
  if (section === "home-finance-expenses") return "expenses";
  if (section === "home-finance-ar") return "ar";
  return "billing";
}

export function HomeFinanceOperations({ liveCtx = "allow", activeSection, refreshSignal = 0 }) {
  const canExportAccounting = canAccessFinanceScope(
    [readLawosApiSession(), readLawosSessionEnvelope()],
    ["finance.export"],
  );
  const [matterResult, setMatterResult] = useState(null);
  const [matterId, setMatterId] = useState(() => initialMatterId());
  const [timeResult, setTimeResult] = useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [agingResult, setAgingResult] = useState(null);
  const [financeAuditResult, setFinanceAuditResult] = useState(null);
  const [timeEntryResult, setTimeEntryResult] = useState(null);
  const [expenseResult, setExpenseResult] = useState(null);
  const [disbursementResult, setDisbursementResult] = useState(null);
  const [wipResult, setWipResult] = useState(null);
  const [prebillResult, setPrebillResult] = useState(null);
  const [invoiceIssueResult, setInvoiceIssueResult] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentMatchResult, setPaymentMatchResult] = useState(null);
  const [accountingExportResult, setAccountingExportResult] = useState(null);
  const [timeEntryForm, setTimeEntryForm] = useState({ workDate: today(), durationMinutes: "30", narrative: "Matter 작업", roleId: "partner", billable: true });
  const [expenseForm, setExpenseForm] = useState({ expenseDate: today(), amount: "25000", receiptDocumentId: "", currency: "KRW" });
  const [disbursementForm, setDisbursementForm] = useState({ disbursedAt: today(), amount: "15000", vendorRef: "", currency: "KRW" });
  const [accountingExportForm, setAccountingExportForm] = useState({ fromDate: `${today().slice(0, 7)}-01`, toDate: today() });
  const [timeTimerStartedAt, setTimeTimerStartedAt] = useState(null);
  const [timeTimerSeconds, setTimeTimerSeconds] = useState(0);
  const [pending, setPending] = useState({});

  useEffect(() => {
    let cancelled = false;
    setMatterResult(null);
    fetchMatterRecords({ ctx: liveCtx }).then((result) => { if (!cancelled) setMatterResult(result); });
    return () => { cancelled = true; };
  }, [liveCtx, refreshSignal]);

  const matters = items(matterResult);
  const selectedMatter = useMemo(() => matters.find((matter) => matter.matter_id === matterId) ?? null, [matters, matterId]);

  useEffect(() => {
    if (!matterId) {
      setTimeResult({ kind: "data", items: [] });
      setInvoiceResult({ kind: "data", items: [] });
      setAgingResult({ kind: "data", items: [] });
      setFinanceAuditResult({ kind: "data", items: [] });
      return undefined;
    }
    let cancelled = false;
    setTimeResult(null);
    setInvoiceResult(null);
    setAgingResult(null);
    setFinanceAuditResult(null);
    Promise.all([
      fetchFinanceTimeEntries({ ctx: liveCtx }),
      fetchFinanceInvoices({ ctx: liveCtx }),
      fetchFinanceArAging({ ctx: liveCtx }),
      fetchFinanceAudit({ ctx: liveCtx })
    ]).then(([time, invoices, aging, audit]) => {
      if (cancelled) return;
      setTimeResult(time);
      setInvoiceResult(invoices);
      setAgingResult(aging);
      setFinanceAuditResult(audit);
    });
    return () => { cancelled = true; };
  }, [matterId, liveCtx, refreshSignal]);

  useEffect(() => {
    setTimeEntryResult(null);
    setExpenseResult(null);
    setDisbursementResult(null);
    setWipResult(null);
    setPrebillResult(null);
    setInvoiceIssueResult(null);
    setPaymentResult(null);
    setPaymentMatchResult(null);
    setAccountingExportResult(null);
  }, [matterId]);

  useEffect(() => {
    if (!timeTimerStartedAt) return undefined;
    const interval = window.setInterval(() => setTimeTimerSeconds(Math.floor((Date.now() - timeTimerStartedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [timeTimerStartedAt]);

  function setBusy(key, value) {
    setPending((current) => ({ ...current, [key]: value }));
  }

  function updateMatter(nextMatterId) {
    setMatterId(nextMatterId);
    writeMatterId(nextMatterId);
  }

  function upsertInvoice(invoice) {
    if (!invoice) return;
    setInvoiceResult((current) => ({
      ...(current?.kind === "data" ? current : {}),
      kind: "data",
      items: [invoice, ...items(current).filter((row) => row.invoice_id !== invoice.invoice_id)]
    }));
  }

  function toggleTimer() {
    if (timeTimerStartedAt) {
      const elapsed = Math.max(1, Math.ceil((Date.now() - timeTimerStartedAt) / 60000));
      setTimeEntryForm((current) => ({ ...current, durationMinutes: String(minutes(current.durationMinutes) + elapsed) }));
      setTimeTimerStartedAt(null);
      setTimeTimerSeconds(0);
    } else {
      setTimeTimerStartedAt(Date.now());
    }
  }

  async function createTime(event) {
    event?.preventDefault?.();
    if (!selectedMatter) return;
    setBusy("time", true);
    const result = await createFinanceTimeEntry({ matterId, durationMinutes: minutes(timeEntryForm.durationMinutes), roleId: timeEntryForm.roleId, workDate: timeEntryForm.workDate, narrative: timeEntryForm.narrative.trim(), billable: timeEntryForm.billable, ctx: liveCtx });
    setTimeEntryResult(result);
    setBusy("time", false);
    if (result.kind === "data" && result.item) setTimeResult((current) => ({ ...(current?.kind === "data" ? current : {}), kind: "data", items: [result.item, ...items(current).filter((row) => row.time_entry_id !== result.item.time_entry_id)] }));
  }

  async function createExpense(event) {
    event?.preventDefault?.();
    if (!selectedMatter) return;
    setBusy("expense", true);
    const result = await createFinanceExpense({ matterId, expenseDate: expenseForm.expenseDate, amount: money(expenseForm.amount), receiptDocumentId: expenseForm.receiptDocumentId.trim(), currency: expenseForm.currency, ctx: liveCtx });
    setExpenseResult(result);
    setBusy("expense", false);
  }

  async function createDisbursement(event) {
    event?.preventDefault?.();
    if (!selectedMatter) return;
    setBusy("disbursement", true);
    const result = await createFinanceDisbursement({ matterId, disbursedAt: disbursementForm.disbursedAt, amount: money(disbursementForm.amount), vendorRef: disbursementForm.vendorRef.trim(), currency: disbursementForm.currency, ctx: liveCtx });
    setDisbursementResult(result);
    setBusy("disbursement", false);
  }

  async function generateWip() {
    if (!selectedMatter) return;
    setBusy("wip", true);
    setWipResult(await generateFinanceWip({ matterId, ctx: liveCtx }));
    setBusy("wip", false);
  }

  async function createPrebill() {
    const wipItems = items(wipResult);
    if (!selectedMatter || wipItems.length === 0) return;
    setBusy("prebill", true);
    const snapshot = await lockFinanceWipSnapshot({ matterId, wipItems, ctx: liveCtx });
    const created = snapshot.kind === "data" && snapshot.item?.wip_snapshot_id
      ? await createFinancePreBill({ matterId, wipSnapshotId: snapshot.item.wip_snapshot_id, ctx: liveCtx })
      : snapshot;
    const approved = created.kind === "data" && created.item?.prebill_id
      ? await approveFinancePreBill({ prebillId: created.item.prebill_id, ctx: liveCtx })
      : created;
    setPrebillResult(approved);
    setBusy("prebill", false);
  }

  async function issueInvoice() {
    const prebill = prebillResult?.kind === "data" ? prebillResult.item : null;
    if (!selectedMatter || !prebill?.prebill_id) return;
    setBusy("invoice", true);
    const result = await issueFinanceInvoice({ matterId, prebillId: prebill.prebill_id, billingClientPartyId: selectedMatter.billing_client_party_id, ctx: liveCtx });
    setInvoiceIssueResult(result);
    setBusy("invoice", false);
    if (result.kind === "data") upsertInvoice(result.item);
  }

  async function importPayment() {
    const invoice = invoiceIssueResult?.item ?? items(invoiceResult).find((row) => row.matter_id === matterId);
    const amount = invoice ? Math.max(0, Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0)) : 0;
    if (!invoice || amount <= 0) return;
    setBusy("payment", true);
    setPaymentResult(await importFinancePayment({ matterId, amount, currency: invoice.currency ?? "KRW", ctx: liveCtx }));
    setBusy("payment", false);
  }

  async function matchPayment() {
    const invoice = invoiceIssueResult?.item ?? items(invoiceResult).find((row) => row.matter_id === matterId);
    const payment = paymentResult?.item;
    const amount = Math.min(Math.max(0, Number(invoice?.amount_due ?? 0) - Number(invoice?.amount_paid ?? 0)), Number(payment?.unapplied_amount ?? payment?.amount ?? 0));
    if (!invoice?.invoice_id || !payment?.payment_id || amount <= 0) return;
    setBusy("match", true);
    const result = await matchFinancePayment({ paymentId: payment.payment_id, invoiceId: invoice.invoice_id, amount, ctx: liveCtx });
    setPaymentMatchResult(result);
    setBusy("match", false);
    if (result.kind === "data" && result.invoice) upsertInvoice(result.invoice);
    if (result.kind === "data" && result.payment) setPaymentResult((current) => ({ ...(current ?? {}), item: result.payment }));
  }

  async function createAccountingExport(event) {
    event?.preventDefault?.();
    setBusy("export", true);
    setAccountingExportResult(await fetchFinanceAccountingExport({ fromDate: accountingExportForm.fromDate, toDate: accountingExportForm.toDate, ctx: liveCtx }));
    setBusy("export", false);
  }

  if (matterResult === null) return <div className="live-data-state live-data-loading"><strong>Matter 목록을 불러오는 중입니다</strong></div>;
  if (matterResult.kind === "error") return <div className="live-data-state live-data-error"><strong>Matter 목록을 불러오지 못했습니다</strong></div>;
  if (matterResult.uiState === "denied") return <div className="live-data-state live-data-denied"><strong>Matter를 선택할 권한이 없습니다</strong></div>;

  return (
    <section className="home-finance-operation-workspace" data-home-finance-operation={operationMode(activeSection)}>
      <header className="home-finance-operation-header">
        <label>
          <span>Matter</span>
          <select value={matterId} onChange={(event) => updateMatter(event.target.value)}>
            <option value="">Matter 선택</option>
            {matters.map((matter, index) => <option key={matter.matter_id} value={matter.matter_id}>{matterLabel(matter, index)}</option>)}
          </select>
        </label>
      </header>
      {!selectedMatter ? (
        <div className="live-data-state live-data-empty" data-home-finance-matter-required="true"><strong>먼저 Matter를 선택하세요</strong><span>선택한 Matter는 URL에 유지됩니다.</span></div>
      ) : (
        <ChargePanel
          operationMode={operationMode(activeSection)}
          showAccountingExport={canExportAccounting}
          timeResult={timeResult} invoiceResult={invoiceResult} agingResult={agingResult} financeAuditResult={financeAuditResult}
          matter={selectedMatter} matterId={matterId}
          timeEntryResult={timeEntryResult} expenseResult={expenseResult} disbursementResult={disbursementResult} wipResult={wipResult} prebillResult={prebillResult} invoiceIssueResult={invoiceIssueResult} paymentResult={paymentResult} paymentMatchResult={paymentMatchResult} accountingExportResult={accountingExportResult}
          timeEntryForm={timeEntryForm} expenseForm={expenseForm} disbursementForm={disbursementForm} accountingExportForm={accountingExportForm}
          timeTimerRunning={Boolean(timeTimerStartedAt)} timeTimerSeconds={timeTimerSeconds}
          timeEntryPending={pending.time === true} expensePending={pending.expense === true} disbursementPending={pending.disbursement === true} wipPending={pending.wip === true} prebillPending={pending.prebill === true} invoiceIssuePending={pending.invoice === true} paymentPending={pending.payment === true} paymentMatchPending={pending.match === true} accountingExportPending={pending.export === true}
          onTimeEntryFormChange={(field, value) => setTimeEntryForm((current) => ({ ...current, [field]: value }))}
          onExpenseFormChange={(field, value) => setExpenseForm((current) => ({ ...current, [field]: value }))}
          onDisbursementFormChange={(field, value) => setDisbursementForm((current) => ({ ...current, [field]: value }))}
          onAccountingExportFormChange={(field, value) => setAccountingExportForm((current) => ({ ...current, [field]: value }))}
          onToggleTimeTimer={toggleTimer} onCreateTimeEntry={createTime} onCreateExpense={createExpense} onCreateDisbursement={createDisbursement}
          onGenerateWip={generateWip} onCreatePreBill={createPrebill} onIssueInvoice={issueInvoice} onImportPayment={importPayment} onMatchPayment={matchPayment} onCreateAccountingExport={createAccountingExport}
        />
      )}
    </section>
  );
}
