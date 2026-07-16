import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw, X } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  approveHrxPayrollRun,
  approveHrxPayrollPayment,
  calculateHrxPayrollYearEnd,
  captureHrxPayrollRun,
  closeHrxPayrollRun,
  collectHrxPayrollYearEnd,
  correctHrxPayrollFiling,
  createHrxPayrollFiling,
  exportHrxPayrollPayment,
  fetchHrxPayrollRun,
  fetchHrxPayrollWorkspace,
  prepareHrxPayrollPayment,
  previewHrxPayrollRun,
  reconcileHrxPayrollPayment,
  resolveHrxPayrollIssue,
  reviewHrxPayrollYearEnd,
  submitHrxPayrollFiling,
  validateHrxPayrollFiling,
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;
type PayrollAction = "capture" | "preview" | "approve" | "close";
type PaymentAction = "prepare" | "approve" | "export" | "reconcile";
type YearEndAction = "collect" | "calculate" | "review";
type RetryAction = { kind: "load" | PayrollAction | "issue" | "payment-approve" | "year-end-review"; issueId?: string; issueVersion?: number };

const money = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function records(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function record(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function statusLabel(value: string) {
  return ({ draft: "입력 대기", snapshot_ready: "계산 준비", previewed: "검토 중", approved: "승인", closed: "마감", cancelled: "취소" } as Record<string, string>)[value] ?? value;
}

function actionLabel(action: PayrollAction) {
  return ({ capture: "입력 확정", preview: "급여 계산", approve: "급여 승인", close: "급여 마감" } as Record<PayrollAction, string>)[action];
}

function actionForStatus(status: string): PayrollAction | null {
  return ({ draft: "capture", snapshot_ready: "preview", previewed: "approve", approved: "close" } as Record<string, PayrollAction>)[status] ?? null;
}

function itemLabel(value: string) {
  return ({ BASE: "기본급", OVERTIME: "연장근로", NIGHT: "야간근로", HOLIDAY: "휴일근로", UNUSED_LEAVE: "미사용 휴가", NATIONAL_PENSION: "국민연금", HEALTH_INSURANCE: "건강보험", LONG_TERM_CARE: "장기요양보험", EMPLOYMENT_INSURANCE: "고용보험", INCOME_TAX: "소득세", LOCAL_INCOME_TAX: "지방소득세" } as Record<string, string>)[value] ?? value;
}

function issueLabel(value: string) {
  return ({ PAYROLL_PRIOR_PERIOD_VARIANCE: "전월 대비 변동", PAYROLL_NOTICE_VARIANCE_UNEXPLAINED: "공제 통지 확인", PAYROLL_PROFILE_MISSING: "급여 정보 없음", PAYROLL_COMPENSATION_INVALID: "보상 정보 확인", EMPLOYMENT_PROFILE_MISSING: "재직 정보 없음" } as Record<string, string>)[value] ?? value;
}

function errorLabel(value: unknown) {
  return ({ HRX_PAYROLL_SELF_APPROVAL: "작성자는 승인할 수 없습니다.", HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION: "급여 승인자와 다른 지급 승인자가 필요합니다.", HRX_PAYROLL_BLOCKERS_OPEN: "확인할 이슈가 남아 있습니다.", HRX_AUTHZ_DENIED: "급여정산 권한이 없습니다.", HRX_PAYROLL_STATE_INVALID: "현재 단계에서는 실행할 수 없습니다.", HRX_STATE_VERSION_CONFLICT: "자료가 변경되었습니다. 새로고침하세요." } as Record<string, string>)[String(value ?? "")] ?? "급여정산을 처리하지 못했습니다.";
}

const FILING_KINDS = Object.freeze([
  ["withholding", "원천세"],
  ["payment_statement", "지급명세"],
  ["social_insurance", "4대보험"],
  ["year_end", "연말정산"],
] as const);

function operationStatus(value: string) {
  return ({ draft: "작성", approved: "승인", exported: "파일 생성", reconciled: "대사 완료", validated: "검증", submitted: "제출", accepted: "접수", rejected: "반려", corrected: "보정" } as Record<string, string>)[value] ?? value;
}

function filingActionLabel(value: string) {
  return ({ missing: "신고서 생성", draft: "검증", corrected: "검증", validated: "제출", submitted: "접수 확인", rejected: "보정" } as Record<string, string>)[value] ?? "";
}

function yearEndAction(value: string): YearEndAction | null {
  return ({ missing: "collect", collecting: "collect", draft: "calculate", calculated: "review" } as Record<string, YearEndAction>)[value] ?? null;
}

function yearEndActionLabel(value: YearEndAction) {
  return ({ collect: "자료 수집", calculate: "정산 계산", review: "검토 승인" } as Record<YearEndAction, string>)[value];
}

function yearEndStatus(value: string) {
  return ({ missing: "준비 전", collecting: "수집 중", draft: "수집 완료", calculated: "계산 완료", reviewed: "검토 완료" } as Record<string, string>)[value] ?? value;
}

function saveArtifact(artifact: Row) {
  const bytes = Uint8Array.from(atob(text(artifact, "content_base64")), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: text(artifact, "mime_type") || "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = text(artifact, "filename") || "payroll-artifact";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PayrollBoundaryPanel() {
  const [workspace, setWorkspace] = useState<Row | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [bundle, setBundle] = useState<Row | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState(false);
  const [retryAction, setRetryAction] = useState<RetryAction>({ kind: "load" });
  const [confirmAction, setConfirmAction] = useState<"approve" | "close" | "">("");
  const [operationView, setOperationView] = useState<"settlement" | "payment" | "filing">("settlement");
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement | null>(null);

  const periods = useMemo(() => records(workspace?.periods).sort((left, right) => text(right, "period_start").localeCompare(text(left, "period_start"))), [workspace]);
  const selectedPeriod = periods.find((row) => text(row, "period_id") === selectedPeriodId) ?? periods[0] ?? null;
  const runs = records(selectedPeriod?.runs);
  const selectedRun = record(bundle?.run);
  const employees = records(bundle?.employees);
  const totals = record(bundle?.totals);
  const selectedEmployee = employees.find((row) => text(row, "employee_id") === selectedEmployeeId) ?? null;

  async function loadRun(runId: string) {
    if (!runId) {
      setBundle(null);
      return;
    }
    const result = await fetchHrxPayrollRun(runId);
    if (result.kind === "step_up_required") {
      setRetryAction({ kind: "load" });
      setStepUp(true);
      return;
    }
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      setLoadState("error");
      return;
    }
    setBundle(result.bundle as Row);
  }

  async function load(preferredRunId = selectedRunId) {
    setLoadState("loading");
    setError("");
    const result = await fetchHrxPayrollWorkspace();
    if (result.kind === "step_up_required") {
      setRetryAction({ kind: "load" });
      setStepUp(true);
      setLoadState("ready");
      return;
    }
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      setLoadState("error");
      return;
    }
    const nextWorkspace = result.workspace as Row;
    const nextPeriods = records(nextWorkspace.periods).sort((left, right) => text(right, "period_start").localeCompare(text(left, "period_start")));
    const nextPeriod = nextPeriods.find((row) => text(row, "period_id") === selectedPeriodId) ?? nextPeriods[0] ?? null;
    const nextRuns = records(nextPeriod?.runs);
    const nextRunId = nextRuns.some((row) => text(row, "run_id") === preferredRunId) ? preferredRunId : text(nextRuns[0], "run_id");
    setWorkspace(nextWorkspace);
    setSelectedPeriodId(text(nextPeriod, "period_id"));
    setSelectedRunId(nextRunId);
    await loadRun(nextRunId);
    setLoadState("ready");
  }

  useEffect(() => {
    void load("");
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => detailCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEmployeeId("");
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(detailPanelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [selectedEmployeeId]);

  async function selectPeriod(periodId: string) {
    const period = periods.find((row) => text(row, "period_id") === periodId);
    const runId = text(records(period?.runs)[0], "run_id");
    setSelectedPeriodId(periodId);
    setSelectedRunId(runId);
    setSelectedEmployeeId("");
    setLoadState("loading");
    await loadRun(runId);
    setLoadState("ready");
  }

  async function runAction(action: PayrollAction, confirmed = false) {
    if (!selectedRunId || busy) return;
    if (["approve", "close"].includes(action) && !confirmed) {
      setConfirmAction(action as "approve" | "close");
      return;
    }
    setConfirmAction("");
    setBusy(action);
    setError("");
    const result = action === "capture"
      ? await captureHrxPayrollRun(selectedRunId)
      : action === "preview"
        ? await previewHrxPayrollRun(selectedRunId)
        : action === "approve"
          ? await approveHrxPayrollRun(selectedRunId)
          : await closeHrxPayrollRun(selectedRunId);
    setBusy("");
    if (result.kind === "step_up_required") {
      setRetryAction({ kind: action });
      setStepUp(true);
      return;
    }
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    setBundle(result.bundle as Row);
    await load(selectedRunId);
  }

  async function resolveIssue(issue: Row) {
    const issueId = text(issue, "issue_id");
    const issueVersion = number(issue, "state_version");
    setBusy(`issue:${issueId}`);
    setError("");
    const result = await resolveHrxPayrollIssue(issueId, issueVersion);
    setBusy("");
    if (result.kind === "step_up_required") {
      setRetryAction({ kind: "issue", issueId, issueVersion });
      setStepUp(true);
      return;
    }
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    await loadRun(selectedRunId);
  }

  async function runPaymentAction(action: PaymentAction) {
    if (!selectedRunId || busy) return;
    const currentBatch = records(bundle?.payment_batches)[0];
    const batchId = text(currentBatch, "payment_batch_id");
    setBusy(`payment:${action}`);
    setError("");
    const result = action === "prepare"
      ? await prepareHrxPayrollPayment(selectedRunId)
      : action === "approve"
        ? await approveHrxPayrollPayment(batchId)
        : action === "export"
          ? await exportHrxPayrollPayment(batchId)
          : await reconcileHrxPayrollPayment(batchId);
    setBusy("");
    if (result.kind === "step_up_required") {
      setRetryAction({ kind: "payment-approve" });
      setStepUp(true);
      return;
    }
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    if (action === "export") saveArtifact(result.artifact as Row);
    await loadRun(selectedRunId);
  }

  async function runFilingAction(filingKind: typeof FILING_KINDS[number][0], current: Row | null) {
    if (!selectedRunId || busy) return;
    const state = text(current, "state");
    setBusy(`filing:${filingKind}`);
    setError("");
    const result = !current
      ? await createHrxPayrollFiling(selectedRunId, filingKind)
      : state === "rejected"
        ? await correctHrxPayrollFiling(text(current, "filing_job_id"))
      : state === "draft" || state === "corrected"
        ? await validateHrxPayrollFiling(text(current, "filing_job_id"))
        : await submitHrxPayrollFiling(text(current, "filing_job_id"));
    setBusy("");
    if (result.kind !== "data") setError(errorLabel(result.reason));
    else await loadRun(selectedRunId);
  }

  async function runYearEndAction(action: YearEndAction) {
    if (!selectedRunId || busy) return;
    setBusy(`year-end:${action}`);
    setError("");
    const result = action === "collect"
      ? await collectHrxPayrollYearEnd(selectedRunId)
      : action === "calculate"
        ? await calculateHrxPayrollYearEnd(selectedRunId)
        : await reviewHrxPayrollYearEnd(selectedRunId);
    setBusy("");
    if (result.kind === "step_up_required") {
      setRetryAction({ kind: "year-end-review" });
      setStepUp(true);
      return;
    }
    if (result.kind !== "data") setError(errorLabel(result.reason));
    else await loadRun(selectedRunId);
  }

  async function retryAfterStepUp() {
    setStepUp(false);
    if (retryAction.kind === "load") {
      await load(selectedRunId);
      return;
    }
    if (retryAction.kind === "issue" && retryAction.issueId && retryAction.issueVersion) {
      await resolveIssue({ issue_id: retryAction.issueId, state_version: retryAction.issueVersion });
      return;
    }
    if (retryAction.kind === "payment-approve") {
      await runPaymentAction("approve");
      return;
    }
    if (retryAction.kind === "year-end-review") {
      await runYearEndAction("review");
      return;
    }
    await runAction(retryAction.kind as PayrollAction, true);
  }

  const nextAction = actionForStatus(text(selectedRun, "status"));
  const periodMeta = selectedPeriod ? `${text(selectedPeriod, "period_code")} · ${statusLabel(text(selectedRun, "status"))}` : "";
  const selectedResultId = text(selectedEmployee, "result_id");
  const detailLines = records(bundle?.line_items).filter((row) => text(row, "result_id") === selectedResultId);
  const detailIssues = records(bundle?.issues).filter((row) => text(row, "employee_id") === selectedEmployeeId);
  const detailSnapshot = records(bundle?.snapshots).find((row) => text(row, "employee_id") === selectedEmployeeId);
  const detailAdjustments = records(bundle?.adjustments).filter((row) => text(row, "employee_id") === selectedEmployeeId);
  const paymentBatch = records(bundle?.payment_batches)[0] ?? null;
  const filings = records(bundle?.filings);
  const yearEnd = record(bundle?.year_end);
  const paymentAction: PaymentAction | null = !paymentBatch ? "prepare" : ({ draft: "approve", approved: "export", exported: "reconcile" } as Record<string, PaymentAction>)[text(paymentBatch, "state")] ?? null;
  const paymentActionLabel = ({ prepare: "지급 준비", approve: "지급 승인", export: "은행 파일", reconcile: "지급 대사" } as Record<string, string>)[paymentAction ?? ""];

  return (
    <Panel id="people-payroll" className="people-panel span-2 payroll-workspace" title="급여정산" meta={periodMeta} data-payroll-runtime="true">
      <div className="payroll-toolbar">
        <label>
          <span>급여기간</span>
          <select value={selectedPeriodId} onChange={(event) => void selectPeriod(event.target.value)} disabled={loadState === "loading"}>
            {periods.map((period) => <option key={text(period, "period_id")} value={text(period, "period_id")}>{text(period, "period_code")}</option>)}
          </select>
        </label>
        {runs.length > 1 && (
          <label>
            <span>정산차수</span>
            <select value={selectedRunId} onChange={(event) => { setSelectedRunId(event.target.value); void loadRun(event.target.value); }}>
              {runs.map((run) => <option key={text(run, "run_id")} value={text(run, "run_id")}>{text(run, "run_type") === "adjustment" ? "조정" : "정기"}</option>)}
            </select>
          </label>
        )}
        <div className="payroll-toolbar-actions">
          <button className="secondary-button" type="button" onClick={() => void load(selectedRunId)} disabled={loadState === "loading" || Boolean(busy)} aria-label="급여정산 새로고침">
            <RefreshCw size={14} />
            새로고침
          </button>
          {nextAction && <button className="primary-button" type="button" onClick={() => void runAction(nextAction)} disabled={Boolean(busy)}>{busy === nextAction ? "처리 중" : actionLabel(nextAction)}</button>}
        </div>
      </div>

      {selectedPeriod && (
        <div className="payroll-period-facts" aria-label="급여 기간 정보">
          <span>정산기간 <strong>{text(selectedPeriod, "period_start")}–{text(selectedPeriod, "period_end")}</strong></span>
          <span>마감 <strong>{text(selectedPeriod, "cutoff_at").slice(0, 10)}</strong></span>
          <span>지급일 <strong>{text(selectedPeriod, "pay_date")}</strong></span>
        </div>
      )}

      {bundle && loadState !== "loading" && (
        <div className="payroll-operation-tabs" role="tablist" aria-label="급여 업무">
          {([['settlement', '정산'], ['payment', '지급'], ['filing', '신고']] as const).map(([view, label]) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={operationView === view}
              className={operationView === view ? "active" : ""}
              onClick={() => { setOperationView(view); setSelectedEmployeeId(""); }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {stepUp && <HrxStepUpChallenge purpose="payroll_export_review" onVerified={() => void retryAfterStepUp()} />}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {loadState === "loading" && <div className="live-data-state live-data-loading">급여정산을 불러오는 중입니다</div>}
      {loadState === "error" && !error && <div className="live-data-state live-data-error">급여정산을 불러오지 못했습니다.</div>}

      {bundle && loadState !== "loading" && (
        <>
          <div className="payroll-summary-strip" aria-label="급여 합계">
            <span>대상 <strong>{employees.length}명</strong></span>
            <span>지급총액 <strong>{money.format(number(totals, "gross_krw"))}</strong></span>
            <span>공제 <strong>{money.format(number(totals, "deduction_krw"))}</strong></span>
            <span>실지급 <strong>{money.format(number(totals, "net_krw"))}</strong></span>
          </div>

          {operationView === "settlement" && confirmAction && (
            <div className="payroll-confirm-bar" role="alertdialog" aria-label={`${actionLabel(confirmAction)} 확인`}>
              <strong>{actionLabel(confirmAction)}</strong>
              <span>{confirmAction === "approve" ? "작성자와 다른 승인자만 승인할 수 있습니다." : "마감 후 원본은 변경할 수 없습니다."}</span>
              <div>
                <button className="secondary-button" type="button" onClick={() => setConfirmAction("")}>취소</button>
                <button className="primary-button" type="button" onClick={() => void runAction(confirmAction, true)}>확인</button>
              </div>
            </div>
          )}

          {operationView === "settlement" && (employees.length > 0 ? (
            <div className="data-table-wrap payroll-table-wrap">
              <table className="data-table payroll-table">
                <thead><tr><th>구성원</th><th>지급총액</th><th>공제</th><th>실지급</th><th>증감</th><th>이슈</th><th>상태</th></tr></thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={text(employee, "employee_id")} data-payroll-employee={text(employee, "employee_id")}>
                      <td><button type="button" className="payroll-employee-button" onClick={() => setSelectedEmployeeId(text(employee, "employee_id"))}>{text(employee, "display_name")}</button></td>
                      <td>{money.format(number(employee, "gross_krw"))}</td>
                      <td>{money.format(number(employee, "deduction_krw"))}</td>
                      <td>{money.format(number(employee, "net_krw"))}</td>
                      <td>{money.format(number(employee, "variance_krw"))}</td>
                      <td>{number(employee, "issue_count") ? `${number(employee, "issue_count")}건` : "-"}</td>
                      <td>{text(employee, "status") === "calculated" ? "계산 완료" : "입력 완료"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="live-data-state live-data-empty">{text(selectedRun, "status") === "draft" ? "입력 확정 전입니다." : "정산 대상이 없습니다."}</div>
          ))}

          {operationView === "payment" && (
            <div className="data-table-wrap payroll-operation-table-wrap" data-payroll-operation="payment">
              <table className="data-table payroll-operation-table">
                <thead><tr><th>지급상태</th><th>대상</th><th>실지급액</th><th>승인자</th><th aria-label="지급 작업" /></tr></thead>
                <tbody><tr>
                  <td>{paymentBatch ? operationStatus(text(paymentBatch, "state")) : "준비 전"}</td>
                  <td>{employees.length}명</td>
                  <td>{money.format(number(totals, "net_krw"))}</td>
                  <td>{text(paymentBatch, "approved_by") || "-"}</td>
                  <td>
                    {paymentAction && (
                      <button className="secondary-button" type="button" onClick={() => void runPaymentAction(paymentAction)} disabled={Boolean(busy) || text(selectedRun, "status") !== "closed"}>
                        {paymentAction === "export" && <Download size={14} />}
                        {busy === `payment:${paymentAction}` ? "처리 중" : paymentActionLabel}
                      </button>
                    )}
                  </td>
                </tr></tbody>
              </table>
            </div>
          )}

          {operationView === "filing" && (
            <div className="data-table-wrap payroll-operation-table-wrap" data-payroll-operation="filing">
              <table className="data-table payroll-operation-table">
                <thead><tr><th>신고</th><th>상태</th><th>접수번호</th><th aria-label="신고 작업" /></tr></thead>
                <tbody>
                  {FILING_KINDS.map(([kind, label]) => {
                    const current = filings.find((row) => text(row, "filing_kind") === kind) ?? null;
                    const state = text(current, "state") || "missing";
                    const receiptRef = text(current, "provider_receipt_ref");
                    const action = filingActionLabel(state);
                    const yearEndState = text(yearEnd, "state") || "missing";
                    const yearEndNext = kind === "year_end" && !current ? yearEndAction(yearEndState) : null;
                    return (
                      <tr key={kind}>
                        <td>{label}</td>
                        <td>{kind === "year_end" && !current ? yearEndStatus(yearEndState) : current ? operationStatus(state) : "준비 전"}</td>
                        <td title={receiptRef}>{receiptRef ? receiptRef.split("/").at(-1)?.slice(0, 12) : "-"}</td>
                        <td>
                          {yearEndNext
                            ? <button className="secondary-button" type="button" onClick={() => void runYearEndAction(yearEndNext)} disabled={Boolean(busy) || text(selectedRun, "status") !== "closed"}>{busy === `year-end:${yearEndNext}` ? "처리 중" : yearEndActionLabel(yearEndNext)}</button>
                            : action && <button className="secondary-button" type="button" onClick={() => void runFilingAction(kind, current)} disabled={Boolean(busy) || text(selectedRun, "status") !== "closed"}>{busy === `filing:${kind}` ? "처리 중" : action}</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {operationView === "settlement" && selectedEmployee && typeof document !== "undefined" && createPortal(
        <div className="people-detail-overlay payroll-detail-overlay" data-payroll-detail-overlay="open">
          <button className="people-detail-backdrop" type="button" aria-label="급여 상세 닫기" onClick={() => setSelectedEmployeeId("")} />
          <aside ref={detailPanelRef} className="people-detail-panel payroll-detail-panel" role="dialog" aria-modal="true" aria-label={`${text(selectedEmployee, "display_name")} 급여 상세`}>
            <button ref={detailCloseRef} className="icon-button people-detail-close" type="button" aria-label="급여 상세 닫기" onClick={() => setSelectedEmployeeId("")}><X size={18} /></button>
            <header className="payroll-detail-header"><h2>{text(selectedEmployee, "display_name")}</h2><span>{statusLabel(text(selectedRun, "status"))}</span></header>
            <dl className="payroll-detail-totals">
              <div><dt>지급총액</dt><dd>{money.format(number(selectedEmployee, "gross_krw"))}</dd></div>
              <div><dt>공제</dt><dd>{money.format(number(selectedEmployee, "deduction_krw"))}</dd></div>
              <div><dt>실지급</dt><dd>{money.format(number(selectedEmployee, "net_krw"))}</dd></div>
            </dl>

            <section className="payroll-detail-section"><h3>계산 항목</h3>
              {detailLines.length ? <div className="payroll-detail-list">{detailLines.map((line) => <div key={text(line, "line_item_id")}><span>{itemLabel(text(line, "item_code"))}</span><strong>{money.format(number(line, "amount_krw"))}</strong><small>{text(line, "formula_code")}</small></div>)}</div> : <div className="live-data-state live-data-empty">계산 전입니다.</div>}
            </section>

            {detailIssues.length > 0 && <section className="payroll-detail-section"><h3>이슈</h3><div className="payroll-detail-list">{detailIssues.map((issue) => <div key={text(issue, "issue_id")}><span>{issueLabel(text(issue, "issue_code"))}</span><strong>{text(issue, "severity") === "blocker" ? "차단" : "확인"}</strong>{text(issue, "state") === "open" && <button className="secondary-button" type="button" onClick={() => void resolveIssue(issue)} disabled={busy === `issue:${text(issue, "issue_id")}`}>확인 완료</button>}</div>)}</div></section>}

            {detailSnapshot && <section className="payroll-detail-section"><h3>원천</h3><div className="payroll-source-list">{records(detailSnapshot.source_refs).map((source, index) => <span key={`${text(source, "ref")}-${index}`}><strong>{text(source, "kind")}</strong>{text(source, "ref")}</span>)}</div></section>}
            {detailAdjustments.length > 0 && <section className="payroll-detail-section"><h3>조정</h3><div className="payroll-detail-list">{detailAdjustments.map((adjustment) => <div key={text(adjustment, "adjustment_id")}><span>{text(adjustment, "reason_code")}</span><strong>{money.format(number(adjustment, "amount_krw"))}</strong></div>)}</div></section>}
          </aside>
        </div>, document.body)}
    </Panel>
  );
}
