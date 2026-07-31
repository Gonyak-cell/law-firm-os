import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw, X } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { getPeopleFeatureBySection } from "../peopleFeatureCatalog.js";
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
  createHrxPayrollAdjustmentRun,
  createHrxPayrollPeriod,
  createHrxPayrollRun,
  exportHrxPayrollPayment,
  fetchHrxPayrollClosePrecheck,
  fetchHrxPayrollRun,
  fetchHrxPayrollWorkspace,
  prepareHrxPayrollPayment,
  previewHrxPayrollRun,
  reconcileHrxPayrollPayment,
  retryFailedHrxPayrollPayment,
  resolveHrxPayrollIssue,
  reviewHrxPayrollYearEnd,
  submitHrxPayrollFiling,
  validateHrxPayrollFiling,
} from "../hrxApiClient.ts";
import { safeHrxStepUpPurpose } from "../hrxApiClient.ts";
import type { HrxStepUpPurpose } from "../hrxApiClient.ts";
import { safePeopleLabel } from "../peoplePresentation.ts";

type Row = Record<string, unknown>;
type PayrollAction = "capture" | "preview" | "approve" | "close";
type PaymentAction = "prepare" | "approve" | "export" | "reconcile" | "retry";
type YearEndAction = "collect" | "calculate" | "review";
type FilingKind = typeof FILING_KINDS[number][0];
type RetryAction =
  | { kind: "load" }
  | { kind: "precheck"; runId: string }
  | { kind: "payroll"; action: PayrollAction }
  | { kind: "issue"; issueId: string; issueVersion: number }
  | { kind: "payment"; action: PaymentAction }
  | { kind: "filing"; filingKind: FilingKind; current: Row | null; replacementRunId: string }
  | { kind: "year-end"; action: YearEndAction };
type ResolutionTarget = {
  section: string;
  routeContext: {
    employee_id?: string;
    period?: string;
    query?: string;
  };
};

const money = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const RESOLUTION_CONTEXT_KEYS = new Set(["employee_id", "period", "query"]);
const SAFE_EMPLOYEE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const SAFE_QUERY = /^[^\u0000-\u001f\u007f]{1,200}$/;
function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function isHumanLabel(value: string, opaqueIdentifiers: string[] = []) {
  return Boolean(safePeopleLabel(value, { identifiers: opaqueIdentifiers }));
}

function humanEmployeeLabel(row: Row | null | undefined) {
  const employeeId = text(row, "employee_id");
  const value = text(row, "display_name");
  return isHumanLabel(value, [employeeId]) ? value.trim() : "구성원 이름 확인 필요";
}

function approvedActorLabel(row: Row | null | undefined) {
  const actorId = text(row, "approved_by_actor_id");
  const value = text(row, "approved_by_actor_display_name");
  return isHumanLabel(value, [actorId]) ? value.trim() : actorId ? "승인자 이름 확인 필요" : "미승인";
}

function auditActorLabel(row: Row | null | undefined) {
  const actorId = text(row, "actor_id");
  const value = text(row, "actor_display_name");
  return isHumanLabel(value, [actorId]) ? value.trim() : "담당자 이름 확인 필요";
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
  return ({
    PAYROLL_PRIOR_PERIOD_VARIANCE: "전월 대비 변동",
    PAYROLL_NOTICE_VARIANCE_UNEXPLAINED: "공제 통지 확인",
    PAYROLL_PROFILE_MISSING: "급여 정보 없음",
    PAYROLL_COMPENSATION_INVALID: "보상 정보 확인",
    EMPLOYMENT_PROFILE_MISSING: "재직 정보 없음",
    PAYROLL_ATTENDANCE_MISSING: "근무기록 누락",
    PAYROLL_ATTENDANCE_CORRECTION_PENDING: "근무기록 정정 승인 대기",
    PAYROLL_OVERTIME_PENDING: "초과근로 승인 대기",
    PAYROLL_LEAVE_APPROVAL_PENDING: "휴가 승인 대기",
    PAYROLL_LEAVE_LEDGER_UNCONFIRMED: "휴가 사용 내역 미반영",
    PAYROLL_TERMINATION_DATE_MISSING: "퇴사일 확인 필요",
    PAYROLL_WORK_PROFILE_MISSING: "근로정보 없음",
    PAYROLL_WORK_PROFILE_AMBIGUOUS: "근로정보 중복",
    PAYROLL_RULE_UNPUBLISHED: "적용 규칙 미공표",
  } as Record<string, string>)[value] ?? value;
}

function errorLabel(value: unknown) {
  return ({
    HRX_PAYROLL_SELF_APPROVAL: "작성자는 승인할 수 없습니다.",
    HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION: "급여 승인자와 다른 지급 승인자가 필요합니다.",
    HRX_PAYROLL_BLOCKERS_OPEN: "확인할 이슈가 남아 있습니다.",
    HRX_PAYROLL_CLOSE_PRECHECK_BLOCKED: "마감 전 확인이 필요한 항목이 남아 있습니다.",
    HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED: "과지급 회수·상계 기능이 없어 음수 지급액은 처리할 수 없습니다.",
    HRX_PAYROLL_ADJUSTMENT_AMOUNT_INVALID: "정정 금액은 1원 이상이어야 합니다.",
    HRX_PAYROLL_NO_PAYABLE_ITEMS: "지급할 금액이 없어 지급 준비를 만들지 않았습니다.",
    HRX_AUTHZ_DENIED: "급여정산 권한이 없습니다.",
    HRX_PAYROLL_STATE_INVALID: "현재 단계에서는 실행할 수 없습니다.",
    HRX_STATE_VERSION_CONFLICT: "자료가 변경되었습니다. 새로고침하세요.",
  } as Record<string, string>)[String(value ?? "")] ?? "급여정산을 처리하지 못했습니다.";
}

const FILING_KINDS = Object.freeze([
  ["withholding", "원천세"],
  ["payment_statement", "지급명세"],
  ["social_insurance", "4대보험"],
  ["year_end", "연말정산"],
] as const);

function operationStatus(value: string) {
  return ({ draft: "작성", approved: "승인", exported: "파일 생성", reconciled: "결과 확인 완료", validated: "검증", submitted: "제출", accepted: "접수", rejected: "반려", corrected: "보정" } as Record<string, string>)[value] ?? value;
}

function paymentOutcomeLabel(item: Row) {
  const resultState = text(item, "provider_result_state");
  if (resultState === "succeeded" || text(item, "state") === "paid") return "지급 완료";
  if (resultState === "failed") return "지급 실패";
  if (resultState === "unknown") return "결과 확인 중";
  if (text(item, "state") === "exported") return "은행 전달 준비";
  return "지급 준비";
}

function filingOutcomeLabel(job: Row | null) {
  if (!job) return "준비 전";
  return ({
    not_submitted: operationStatus(text(job, "state")),
    queued: "접수 확인 중",
    accepted: "접수 완료",
    failed: "반려",
    unknown: "결과 확인 중",
    corrected: "보정 준비",
  } as Record<string, string>)[text(job, "provider_result_state")] ?? operationStatus(text(job, "state"));
}

function filingActionLabel(value: string) {
  return ({ missing: "신고서 생성", draft: "검증", corrected: "검증", validated: "제출", submitted: "접수 확인", rejected: "보정 신고서 만들기" } as Record<string, string>)[value] ?? "";
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

function payrollMonthRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;
  const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return Object.freeze({ start: `${month}-01`, end });
}

function payrollResolutionTarget(details: Row): ResolutionTarget | null {
  const route = text(details, "resolution_route");
  const declaredSection = text(details, "resolution_section");
  if (!route || route.length > 1_000 || !declaredSection) return null;

  try {
    const base = new URL("https://lawos.local");
    const parsed = new URL(route, base);
    if (parsed.origin !== base.origin || parsed.pathname !== "/people" || parsed.username || parsed.password) return null;
    const section = decodeURIComponent(parsed.hash.slice(1));
    const feature = getPeopleFeatureBySection(section);
    if (
      section !== declaredSection
      || feature?.route_enabled !== true
      || [...parsed.searchParams.keys()].some((key) => !RESOLUTION_CONTEXT_KEYS.has(key))
      || [...RESOLUTION_CONTEXT_KEYS].some((key) => parsed.searchParams.getAll(key).length > 1)
    ) return null;

    const employeeId = parsed.searchParams.get("employee_id") ?? "";
    const period = parsed.searchParams.get("period") ?? "";
    const query = parsed.searchParams.get("query") ?? "";
    if (
      (employeeId && !SAFE_EMPLOYEE_ID.test(employeeId))
      || (period && !SAFE_PERIOD.test(period))
      || (query && !SAFE_QUERY.test(query))
    ) return null;

    return {
      section,
      routeContext: {
        ...(employeeId ? { employee_id: employeeId } : {}),
        ...(period ? { period } : {}),
        ...(query ? { query } : {}),
      },
    };
  } catch {
    return null;
  }
}

export function PayrollBoundaryPanel({
  mode = "settlement",
  onNavigate,
  adjustmentEnabled = false,
}: {
  mode?: "settlement" | "close";
  onNavigate?: (view: string, section?: string, routeContext?: Record<string, unknown>) => void;
  adjustmentEnabled?: boolean;
}) {
  const [workspace, setWorkspace] = useState<Row | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [bundle, setBundle] = useState<Row | null>(null);
  const [precheck, setPrecheck] = useState<Row | null>(null);
  const [precheckState, setPrecheckState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [stepUpPurpose, setStepUpPurpose] = useState<HrxStepUpPurpose | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>({ kind: "load" });
  const [confirmAction, setConfirmAction] = useState<"approve" | "close" | "">("");
  const [operationView, setOperationView] = useState<"settlement" | "payment" | "filing">("settlement");
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriodMonth, setNewPeriodMonth] = useState("");
  const [newPayDate, setNewPayDate] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [correctionKey, setCorrectionKey] = useState("");
  const [adjustmentEmployeeId, setAdjustmentEmployeeId] = useState("");
  const [adjustmentReasonCode, setAdjustmentReasonCode] = useState("CORRECTION");
  const [adjustmentAmountKrw, setAdjustmentAmountKrw] = useState("");
  const [adjustmentTaxable, setAdjustmentTaxable] = useState(true);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement | null>(null);

  const periods = useMemo(() => records(workspace?.periods).sort((left, right) => text(right, "period_start").localeCompare(text(left, "period_start"))), [workspace]);
  const selectedPeriod = periods.find((row) => text(row, "period_id") === selectedPeriodId) ?? periods[0] ?? null;
  const runs = records(selectedPeriod?.runs);
  const selectedRun = record(bundle?.run);
  const employees = records(bundle?.employees);
  const totals = record(bundle?.totals);
  const selectedEmployee = employees.find((row) => text(row, "employee_id") === selectedEmployeeId) ?? null;

  function queueStepUp(result: { kind: string; requiredPurpose?: unknown }, action: RetryAction) {
    if (result.kind !== "step_up_required") return false;
    const purpose = safeHrxStepUpPurpose(result.requiredPurpose);
    if (!purpose) {
      setError("추가 확인 목적을 확인하지 못했습니다. 새로고침한 뒤 다시 시도하세요.");
      return true;
    }
    setRetryAction(action);
    setStepUpPurpose(purpose);
    return true;
  }

  async function loadRun(runId: string) {
    if (!runId) {
      setBundle(null);
      setPrecheck(null);
      return;
    }
    const result = await fetchHrxPayrollRun(runId);
    if (queueStepUp(result, { kind: "load" })) return;
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      setLoadState("error");
      return;
    }
    setBundle(result.bundle as Row);
    if (mode === "close") await runPrecheck(runId);
  }

  async function runPrecheck(runId = selectedRunId) {
    if (!runId) {
      setPrecheck(null);
      setPrecheckState("idle");
      return;
    }
    setPrecheckState("loading");
    const result = await fetchHrxPayrollClosePrecheck(runId);
    if (queueStepUp(result, { kind: "precheck", runId })) {
      setPrecheck(null);
      setPrecheckState("idle");
      return;
    }
    if (result.kind !== "data") {
      setPrecheck(null);
      setPrecheckState("error");
      return;
    }
    setPrecheck(result.precheck as Row);
    setPrecheckState("ready");
  }

  async function load(preferredRunId = selectedRunId, preferredPeriodId = selectedPeriodId) {
    setLoadState("loading");
    setError("");
    const result = await fetchHrxPayrollWorkspace();
    if (queueStepUp(result, { kind: "load" })) {
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
    const nextPeriod = nextPeriods.find((row) => text(row, "period_id") === preferredPeriodId) ?? nextPeriods[0] ?? null;
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
    if (queueStepUp(result, { kind: "payroll", action })) return;
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
    if (queueStepUp(result, { kind: "issue", issueId, issueVersion })) return;
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    await loadRun(selectedRunId);
  }

  async function createPeriodAndRun(event: { preventDefault(): void }) {
    event.preventDefault();
    const range = payrollMonthRange(newPeriodMonth);
    if (!range || !newPayDate) {
      setError("급여기간과 지급일을 확인하세요.");
      return;
    }
    setBusy("new-period");
    setError("");
    const periodResult = await createHrxPayrollPeriod({
      period_code: newPeriodMonth,
      period_start: range.start,
      period_end: range.end,
      cutoff_at: `${range.end}T18:00:00+09:00`,
      pay_date: newPayDate,
      open: true,
    });
    if (periodResult.kind !== "data") {
      setBusy("");
      setError(errorLabel(periodResult.reason));
      return;
    }
    const period = periodResult.period as Row;
    const runResult = await createHrxPayrollRun({
      period_id: text(period, "period_id"),
      run_type: "regular",
    });
    setBusy("");
    if (runResult.kind !== "data") {
      setError(errorLabel(runResult.reason));
      return;
    }
    setShowNewPeriod(false);
    setNewPeriodMonth("");
    setNewPayDate("");
    await load(text(runResult.run as Row, "run_id"), text(period, "period_id"));
  }

  async function createAdjustment(event: { preventDefault(): void }) {
    event.preventDefault();
    const amountKrw = Number(adjustmentAmountKrw);
    if (!selectedPeriod || text(selectedRun, "status") !== "closed" || !correctionKey.trim() || !adjustmentEmployeeId || !Number.isSafeInteger(amountKrw) || amountKrw <= 0) {
      setError("정정 금액은 1원 이상 입력하세요. 과지급 회수는 현재 지원하지 않습니다.");
      return;
    }
    setBusy("adjustment-create");
    setError("");
    const result = await createHrxPayrollAdjustmentRun({
      period_id: text(selectedPeriod, "period_id"),
      previous_run_id: selectedRunId,
      correction_key: correctionKey.trim(),
      adjustments: [{
        employee_id: adjustmentEmployeeId,
        reason_code: adjustmentReasonCode,
        amount_krw: amountKrw,
        taxable: adjustmentTaxable,
      }],
    });
    setBusy("");
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    const runId = text(result.run as Row, "run_id");
    setShowAdjustment(false);
    setCorrectionKey("");
    setAdjustmentEmployeeId("");
    setAdjustmentAmountKrw("");
    await load(runId, text(selectedPeriod, "period_id"));
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
          : action === "reconcile"
            ? await reconcileHrxPayrollPayment(batchId)
            : await retryFailedHrxPayrollPayment(batchId);
    setBusy("");
    if (queueStepUp(result, { kind: "payment", action })) return;
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    await loadRun(selectedRunId);
  }

  async function runFilingAction(filingKind: typeof FILING_KINDS[number][0], current: Row | null, replacementRunId = "") {
    if (!selectedRunId || busy) return;
    const state = text(current, "state");
    if (state === "rejected" && !replacementRunId) {
      setError("마감된 정정 정산을 먼저 준비하세요.");
      return;
    }
    setBusy(`filing:${filingKind}`);
    setError("");
    const result = !current
      ? await createHrxPayrollFiling(selectedRunId, filingKind)
      : state === "rejected"
        ? await correctHrxPayrollFiling(text(current, "filing_job_id"), replacementRunId)
      : state === "draft" || state === "corrected"
        ? await validateHrxPayrollFiling(text(current, "filing_job_id"))
        : await submitHrxPayrollFiling(text(current, "filing_job_id"));
    setBusy("");
    if (queueStepUp(result, { kind: "filing", filingKind, current, replacementRunId })) return;
    if (result.kind !== "data") setError(errorLabel(result.reason));
    else if (state === "rejected") {
      setSelectedRunId(replacementRunId);
      await loadRun(replacementRunId);
    } else await loadRun(selectedRunId);
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
    if (queueStepUp(result, { kind: "year-end", action })) return;
    if (result.kind !== "data") setError(errorLabel(result.reason));
    else await loadRun(selectedRunId);
  }

  async function retryAfterStepUp() {
    setStepUpPurpose(null);
    if (retryAction.kind === "load") {
      await load(selectedRunId);
      return;
    }
    if (retryAction.kind === "precheck") {
      await runPrecheck(retryAction.runId);
      return;
    }
    if (retryAction.kind === "issue") {
      await resolveIssue({ issue_id: retryAction.issueId, state_version: retryAction.issueVersion });
      return;
    }
    if (retryAction.kind === "payment") {
      await runPaymentAction(retryAction.action);
      return;
    }
    if (retryAction.kind === "filing") {
      await runFilingAction(retryAction.filingKind, retryAction.current, retryAction.replacementRunId);
      return;
    }
    if (retryAction.kind === "year-end") {
      await runYearEndAction(retryAction.action);
      return;
    }
    await runAction(retryAction.action, true);
  }

  const nextAction = actionForStatus(text(selectedRun, "status"));
  const periodMeta = selectedPeriod ? `${text(selectedPeriod, "period_code")} / ${statusLabel(text(selectedRun, "status"))}` : "";
  const selectedResultId = text(selectedEmployee, "result_id");
  const detailLines = records(bundle?.line_items).filter((row) => text(row, "result_id") === selectedResultId);
  const detailIssues = records(bundle?.issues).filter((row) => text(row, "employee_id") === selectedEmployeeId);
  const detailSnapshot = records(bundle?.snapshots).find((row) => text(row, "employee_id") === selectedEmployeeId);
  const detailAdjustments = records(bundle?.adjustments).filter((row) => text(row, "employee_id") === selectedEmployeeId);
  const paymentBatch = records(bundle?.payment_batches)[0] ?? null;
  const paymentItems = records(paymentBatch?.items);
  const paymentSucceededCount = paymentItems.filter((item) => text(item, "provider_result_state") === "succeeded" || text(item, "state") === "paid").length;
  const paymentFailedCount = paymentItems.filter((item) => text(item, "provider_result_state") === "failed").length;
  const paymentUnknownCount = paymentItems.filter((item) => text(item, "provider_result_state") === "unknown").length;
  const paymentPendingCount = Math.max(0, paymentItems.length - paymentSucceededCount - paymentFailedCount - paymentUnknownCount);
  const paymentNeedsRetry = paymentFailedCount + paymentUnknownCount > 0;
  const filings = records(bundle?.filings);
  const yearEnd = record(bundle?.year_end);
  const precheckBlockers = records(precheck?.blockers);
  const auditHistory = records(bundle?.audit_history).slice().reverse();
  const paymentAction: PaymentAction | null = !paymentBatch ? "prepare" : ({ draft: "approve", approved: "export", exported: "reconcile" } as Record<string, PaymentAction>)[text(paymentBatch, "state")] ?? null;
  const paymentActionLabel = ({ prepare: "지급 준비", approve: "지급 승인", export: "은행 파일 생성", reconcile: "지급 결과 확인", retry: "실패 또는 미확인 건 다시 처리" } as Record<string, string>)[paymentAction ?? ""];
  const paymentOverallLabel = !paymentBatch
    ? "준비 전"
    : text(paymentBatch, "state") === "reconciled"
      ? paymentNeedsRetry
        ? "일부 확인 필요"
        : "지급 완료"
      : operationStatus(text(paymentBatch, "state"));

  return (
    <Panel
      id={mode === "close" ? "people-close" : "people-payroll"}
      className={`people-panel span-2 payroll-workspace${mode === "close" ? " payroll-close-workspace" : ""}`}
      title={mode === "close" ? "마감 관리" : "급여정산"}
      meta={periodMeta}
      data-payroll-runtime="true"
      data-payroll-close-runtime={mode === "close" ? "true" : undefined}
    >
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
              {runs.map((run) => <option key={text(run, "run_id")} value={text(run, "run_id")}>{text(run, "run_type") === "adjustment" ? "정정" : "정기"} / {statusLabel(text(run, "status"))}</option>)}
            </select>
          </label>
        )}
        <div className="payroll-toolbar-actions">
          <button className="secondary-button" type="button" onClick={() => void load(selectedRunId)} disabled={loadState === "loading" || Boolean(busy)} aria-label={mode === "close" ? "마감 관리 새로고침" : "급여정산 새로고침"}>
            <RefreshCw size={14} />
            새로고침
          </button>
          {mode === "close" && selectedRunId && (
            <button className="secondary-button" type="button" onClick={() => void runPrecheck()} disabled={precheckState === "loading" || Boolean(busy)}>
              {precheckState === "loading" ? "점검 중" : "다시 점검"}
            </button>
          )}
          {mode === "close" && (
            <button className="secondary-button" type="button" onClick={() => setShowNewPeriod((value) => !value)} disabled={Boolean(busy)}>
              {showNewPeriod ? "추가 취소" : "새 급여기간"}
            </button>
          )}
          {nextAction && <button className="primary-button" type="button" onClick={() => void runAction(nextAction)} disabled={Boolean(busy) || (mode === "close" && ["approve", "close"].includes(nextAction) && precheck?.ready !== true)}>{busy === nextAction ? "처리 중" : actionLabel(nextAction)}</button>}
          {adjustmentEnabled && text(selectedRun, "status") === "closed" && (
            <button className="primary-button" type="button" onClick={() => {
              setShowAdjustment((value) => !value);
              setAdjustmentEmployeeId((value) => value || text(employees[0], "employee_id"));
            }} disabled={Boolean(busy)}>
              {showAdjustment ? "정정 취소" : "정정 정산 시작"}
            </button>
          )}
        </div>
      </div>

      {mode === "close" && showNewPeriod && (
        <form className="payroll-new-period-form" onSubmit={(event) => void createPeriodAndRun(event)}>
          <label><span>급여기간</span><input type="month" value={newPeriodMonth} onChange={(event) => setNewPeriodMonth(event.target.value)} required /></label>
          <label><span>지급일</span><input type="date" value={newPayDate} min={newPeriodMonth ? `${newPeriodMonth}-01` : undefined} onChange={(event) => setNewPayDate(event.target.value)} required /></label>
          <button className="primary-button" type="submit" disabled={busy === "new-period"}>{busy === "new-period" ? "추가 중" : "기간 추가"}</button>
        </form>
      )}

      {adjustmentEnabled && showAdjustment && text(selectedRun, "status") === "closed" && (
        <form className="payroll-adjustment-form" data-payroll-adjustment-form="true" onSubmit={(event) => void createAdjustment(event)}>
          <div className="payroll-adjustment-heading">
            <strong>정정 정산</strong>
            <span>마감된 원본은 그대로 두고 차액만 별도 승인·마감합니다.</span>
          </div>
          <label><span>정정 요청 번호</span><input value={correctionKey} pattern="[A-Za-z0-9][A-Za-z0-9._:-]{2,127}" maxLength={128} onChange={(event) => setCorrectionKey(event.target.value)} placeholder="CORR-2026-07-001" required /></label>
          <label><span>구성원</span><select value={adjustmentEmployeeId} onChange={(event) => setAdjustmentEmployeeId(event.target.value)} required><option value="">선택</option>{employees.map((employee) => <option key={text(employee, "employee_id")} value={text(employee, "employee_id")}>{humanEmployeeLabel(employee)}</option>)}</select></label>
          <label><span>정정 사유</span><select value={adjustmentReasonCode} onChange={(event) => setAdjustmentReasonCode(event.target.value)}><option value="CORRECTION">입력 정정</option><option value="RETRO_RATE">소급 단가 반영</option><option value="OMITTED_PAYMENT">누락 지급</option></select></label>
          <label><span>차액(원)</span><input type="number" min="1" step="1" value={adjustmentAmountKrw} onChange={(event) => setAdjustmentAmountKrw(event.target.value)} placeholder="100000" required /></label>
          <label className="payroll-adjustment-taxable"><input type="checkbox" checked={adjustmentTaxable} onChange={(event) => setAdjustmentTaxable(event.target.checked)} /><span>과세 대상</span></label>
          <button className="primary-button" type="submit" disabled={busy === "adjustment-create"}>{busy === "adjustment-create" ? "만드는 중" : "정정 정산 만들기"}</button>
        </form>
      )}

      {selectedPeriod && (
        <div className="payroll-period-facts" aria-label="급여 기간 정보">
          <span>정산기간 <strong>{text(selectedPeriod, "period_start")}–{text(selectedPeriod, "period_end")}</strong></span>
          <span>마감 <strong>{text(selectedPeriod, "cutoff_at").slice(0, 10)}</strong></span>
          <span>지급일 <strong>{text(selectedPeriod, "pay_date")}</strong></span>
        </div>
      )}

      {mode !== "close" && bundle && loadState !== "loading" && (
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

      {stepUpPurpose && <HrxStepUpChallenge purpose={stepUpPurpose} onVerified={() => void retryAfterStepUp()} />}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {loadState === "loading" && <div className="live-data-state live-data-loading">급여정산을 불러오는 중입니다</div>}
      {loadState === "error" && !error && <div className="live-data-state live-data-error">급여정산을 불러오지 못했습니다.</div>}

      {bundle && loadState !== "loading" && (
        <>
          {mode === "close" ? (
            <div className="payroll-summary-strip payroll-close-summary" aria-label="마감 현황">
              <span>대상 <strong>{employees.length}명</strong></span>
              <span>현재 단계 <strong>{statusLabel(text(selectedRun, "status"))}</strong></span>
              <span>확인 필요 <strong>{precheckState === "ready" ? `${number(precheck, "blocker_count")}건` : "-"}</strong></span>
              <span>승인자 <strong>{approvedActorLabel(selectedRun)}</strong></span>
            </div>
          ) : (
            <div className="payroll-summary-strip" aria-label="급여 합계">
              <span>대상 <strong>{employees.length}명</strong></span>
              <span>지급총액 <strong>{money.format(number(totals, "gross_krw"))}</strong></span>
              <span>공제 <strong>{money.format(number(totals, "deduction_krw"))}</strong></span>
              <span>실지급 <strong>{money.format(number(totals, "net_krw"))}</strong></span>
            </div>
          )}

          {mode === "close" && (
            <section className="payroll-close-precheck" aria-labelledby="payroll-close-precheck-title">
              <div className="payroll-close-section-head">
                <div>
                  <h3 id="payroll-close-precheck-title">마감 전 확인</h3>
                  <p>근무기록, 휴가, 퇴사일, 근로정보와 적용 규칙을 같은 기준시각으로 확인합니다.</p>
                </div>
                {precheckState === "ready" && (
                  <span className={precheck?.ready === true ? "status-chip success" : "status-chip warning"}>
                    {precheck?.ready === true ? "확인 완료" : `${number(precheck, "blocker_count")}건 확인 필요`}
                  </span>
                )}
              </div>
              {precheckState === "loading" && <div className="live-data-state live-data-loading">마감 전 확인 항목을 점검하는 중입니다</div>}
              {precheckState === "error" && <div className="live-data-state live-data-error" data-payroll-close-partial="true">마감 자료는 불러왔지만 확인 항목 일부를 불러오지 못했습니다.</div>}
              {precheckState === "ready" && precheckBlockers.length === 0 && <div className="live-data-state live-data-empty">마감을 막는 항목이 없습니다.</div>}
              {precheckState === "ready" && precheckBlockers.length > 0 && (
                <div className="payroll-close-blockers">
                  {precheckBlockers.map((blocker) => {
                    const details = record(blocker.details);
                    const target = payrollResolutionTarget(details);
                    return (
                      <div key={`${text(blocker, "issue_id")}-${text(blocker, "source_ref")}`} className="payroll-close-blocker">
                        <div>
                          <strong>{issueLabel(text(blocker, "issue_code"))}</strong>
                          <span>{number(details, "count")}건 / 근거 {text(blocker, "source_ref").split("/").at(-1)?.slice(0, 12)}</span>
                        </div>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => {
                            if (onNavigate && target) onNavigate("people", target.section, target.routeContext);
                          }}
                          disabled={!onNavigate || !target}
                          title={target ? undefined : "연결된 처리 화면을 확인할 수 없습니다."}
                        >
                          처리 화면 열기
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

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
                <thead>{mode === "close"
                  ? <tr><th>구성원</th><th>확인 필요</th><th>정산 상태</th></tr>
                  : <tr><th>구성원</th><th>지급총액</th><th>공제</th><th>실지급</th><th>증감</th><th>이슈</th><th>상태</th></tr>}</thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={text(employee, "employee_id")} data-payroll-employee={text(employee, "employee_id")}>
                      <td><button type="button" className="payroll-employee-button" onClick={() => setSelectedEmployeeId(text(employee, "employee_id"))}>{humanEmployeeLabel(employee)}</button></td>
                      {mode !== "close" && <><td>{money.format(number(employee, "gross_krw"))}</td><td>{money.format(number(employee, "deduction_krw"))}</td><td>{money.format(number(employee, "net_krw"))}</td><td>{money.format(number(employee, "variance_krw"))}</td></>}
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

          {mode === "close" && (
            <section className="payroll-close-history" aria-labelledby="payroll-close-history-title">
              <div className="payroll-close-section-head"><div><h3 id="payroll-close-history-title">마감 이력</h3><p>입력 확정부터 승인·마감까지 남은 감사 기록입니다.</p></div></div>
              {auditHistory.length ? (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead><tr><th>시각</th><th>처리</th><th>담당자</th><th>감사 ID</th></tr></thead>
                    <tbody>{auditHistory.map((event) => <tr key={text(event, "event_id")}><td>{text(event, "occurred_at").replace("T", " ").slice(0, 16)}</td><td>{text(event, "action")}</td><td>{auditActorLabel(event)}</td><td><code>{text(event, "event_id")}</code></td></tr>)}</tbody>
                  </table>
                </div>
              ) : <div className="live-data-state live-data-empty">아직 마감 이력이 없습니다.</div>}
            </section>
          )}

          {mode !== "close" && operationView === "payment" && (
            <section className="payroll-payment-results" data-payroll-operation="payment" aria-labelledby="payroll-payment-results-title">
              <div className="payroll-result-toolbar">
                <div>
                  <h3 id="payroll-payment-results-title">지급 처리</h3>
                  <p>은행 처리 결과를 구성원별로 확인하고 실패하거나 결과가 확인되지 않은 건만 다시 처리합니다.</p>
                </div>
                <div className="payroll-result-actions">
                  <span className={`status-chip ${paymentNeedsRetry ? "warning" : text(paymentBatch, "state") === "reconciled" ? "success" : ""}`}>{paymentOverallLabel}</span>
                  {paymentAction && (
                    <button className="secondary-button" type="button" onClick={() => void runPaymentAction(paymentAction)} disabled={Boolean(busy) || text(selectedRun, "status") !== "closed"}>
                      {paymentAction === "export" && <Download size={14} />}
                      {busy === `payment:${paymentAction}` ? "처리 중" : paymentActionLabel}
                    </button>
                  )}
                  {!paymentAction && paymentNeedsRetry && (
                    <button className="secondary-button" type="button" onClick={() => void runPaymentAction("retry")} disabled={Boolean(busy)}>
                      {busy === "payment:retry" ? "처리 중" : "실패 또는 미확인 건 다시 처리"}
                    </button>
                  )}
                </div>
              </div>

              <div className="payroll-summary-strip payroll-payment-summary" aria-label="지급 처리 현황">
                <span>전체 <strong>{paymentItems.length || employees.length}명</strong></span>
                <span>지급 완료 <strong>{paymentSucceededCount}명</strong></span>
                <span>지급 실패 <strong>{paymentFailedCount}명</strong></span>
                <span>결과 확인 중 <strong>{paymentUnknownCount + paymentPendingCount}명</strong></span>
              </div>

              {paymentItems.length ? (
                <div className="data-table-wrap payroll-operation-table-wrap">
                  <table className="data-table payroll-operation-table payroll-payment-item-table">
                    <thead><tr><th>구성원</th><th>실지급액</th><th>처리 결과</th><th>처리 횟수</th></tr></thead>
                    <tbody>
                      {paymentItems.map((item) => {
                        const employee = employees.find((row) => text(row, "employee_id") === text(item, "employee_id"));
                        return (
                          <tr key={text(item, "payment_item_id")} data-payroll-payment-item={text(item, "employee_id")}>
                            <td>{humanEmployeeLabel(employee)}</td>
                            <td>{money.format(number(item, "amount_krw"))}</td>
                            <td><span className={`payroll-provider-state ${text(item, "provider_result_state")}`}>{paymentOutcomeLabel(item)}</span></td>
                            <td>{number(item, "attempt_count")}회</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className="live-data-state live-data-empty">지급 준비를 시작하면 구성원별 처리 현황이 표시됩니다.</div>}
            </section>
          )}

          {mode !== "close" && operationView === "filing" && (
            <div className="data-table-wrap payroll-operation-table-wrap" data-payroll-operation="filing">
              <table className="data-table payroll-operation-table payroll-filing-result-table">
                <thead><tr><th>신고</th><th>처리 결과</th><th>접수번호</th><th>처리 횟수</th><th aria-label="신고 작업" /></tr></thead>
                <tbody>
                  {FILING_KINDS.map(([kind, label]) => {
                    const current = filings.find((row) => text(row, "filing_kind") === kind) ?? null;
                    const state = text(current, "state") || "missing";
                    const receiptRef = text(current, "provider_receipt_ref");
                    const action = filingActionLabel(state);
                    const replacementRunId = state === "rejected"
                      ? text(runs.find((run) => text(run, "run_type") === "adjustment"
                        && text(run, "status") === "closed"
                        && text(run, "previous_run_id") === text(current, "run_id")), "run_id")
                      : "";
                    const yearEndState = text(yearEnd, "state") || "missing";
                    const yearEndNext = kind === "year_end" && !current ? yearEndAction(yearEndState) : null;
                    return (
                      <tr key={kind}>
                        <td>{label}</td>
                        <td>
                          {kind === "year_end" && !current
                            ? yearEndStatus(yearEndState)
                            : <span className={`payroll-provider-state ${text(current, "provider_result_state")}`}>{filingOutcomeLabel(current)}</span>}
                        </td>
                        <td title={receiptRef}>{receiptRef ? receiptRef.split("/").at(-1)?.slice(0, 12) : "-"}</td>
                        <td>{current ? `${number(current, "attempt_count")}회` : "-"}</td>
                        <td>
                          {yearEndNext
                            ? <button className="secondary-button" type="button" onClick={() => void runYearEndAction(yearEndNext)} disabled={Boolean(busy) || text(selectedRun, "status") !== "closed"}>{busy === `year-end:${yearEndNext}` ? "처리 중" : yearEndActionLabel(yearEndNext)}</button>
                            : action && <button className="secondary-button" type="button" onClick={() => void runFilingAction(kind, current, replacementRunId)} disabled={Boolean(busy) || text(selectedRun, "status") !== "closed"}>{busy === `filing:${kind}` ? "처리 중" : action}</button>}
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

      {mode !== "close" && operationView === "settlement" && selectedEmployee && typeof document !== "undefined" && createPortal(
        <div className="people-detail-overlay payroll-detail-overlay" data-payroll-detail-overlay="open">
          <button className="people-detail-backdrop" type="button" aria-label="급여 상세 닫기" onClick={() => setSelectedEmployeeId("")} />
            <aside ref={detailPanelRef} className="people-detail-panel payroll-detail-panel" role="dialog" aria-modal="true" aria-label={`${humanEmployeeLabel(selectedEmployee)} 급여 상세`}>
            <button ref={detailCloseRef} className="icon-button people-detail-close" type="button" aria-label="급여 상세 닫기" onClick={() => setSelectedEmployeeId("")}><X size={18} /></button>
            <header className="payroll-detail-header"><h2>{humanEmployeeLabel(selectedEmployee)}</h2><span>{statusLabel(text(selectedRun, "status"))}</span></header>
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
