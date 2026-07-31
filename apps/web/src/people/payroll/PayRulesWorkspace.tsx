import React, { useEffect, useMemo, useState } from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import { PayrollCatalogWorkspace } from "./PayrollCatalogWorkspace.tsx";
import {
  createHrxMinimumWageStandard,
  createHrxPayrollAllowanceRule,
  fetchHrxMinimumWageStandards,
  fetchHrxPayrollAllowanceRules,
  legallyApproveHrxMinimumWageStandard,
  previewHrxMinimumWageImpact,
  publishHrxMinimumWageStandard,
  publishHrxPayrollAllowanceRule,
  reviewHrxMinimumWageStandard,
  reviewHrxPayrollAllowanceRule,
} from "../hrxApiClient.ts";
import { safeEmployeeLabel, safePeopleLabel } from "../peoplePresentation.ts";

type Row = Record<string, unknown>;
type RuleKind = "allowance" | "minimum_wage";
type WorkspaceTab = "items" | "profiles" | RuleKind;
type PublishAction = { kind: RuleKind; action: "publish"; ruleVersionId: string; expectedVersion: number };
type LegalReviewAction = { kind: "minimum_wage"; action: "legal_approve"; ruleVersionId: string; expectedVersion: number; legalReviewRef: string };
type RuleAction = PublishAction | LegalReviewAction;

const money = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const OFFICIAL_2026_HASH = "b87d3570ff339e04747d7835228e20c2faeffa7c9fbcdfe79d719e6ed096a30d";

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function record(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function records(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function impactEmployeeLabel(row: Row, index: number) {
  const fallback = `구성원 ${index + 1}`;
  const label = safeEmployeeLabel({
    employee_id: row.employee_id,
    user_id: row.user_id,
    display_name: row.display_name,
  }, fallback);
  return safePeopleLabel(label, {
    identifiers: [row.employee_id, row.user_id],
    fallback,
  });
}

function statusLabel(value: string) {
  return ({
    pending: "법률 검토 대기",
    legal_approved: "급여 검토 대기",
    draft: "초안",
    reviewed: "검토 완료",
    published: "적용 중",
  } as Record<string, string>)[value] ?? value;
}

function statusTone(value: string) {
  return value === "published" ? "live" : value === "reviewed" ? "review" : "";
}

function legalReviewLabel(value: string) {
  return ({ pending: "법률 검토 전", approved: "법률 검토 완료", rejected: "법률 검토 반려" } as Record<string, string>)[value] ?? value;
}

function resultLabel(value: string) {
  return ({
    below_candidate: "미달 가능",
    meets_or_above: "기준 이상",
    review_required: "항목 확인 필요",
  } as Record<string, string>)[value] ?? value;
}

function resultTone(value: string) {
  return value === "below_candidate" ? "error" : value === "meets_or_above" ? "live" : "review";
}

function errorLabel(value: unknown) {
  return ({
    HRX_PAYROLL_SELF_APPROVAL: "작성자와 다른 검토자가 필요합니다.",
    HRX_PAYROLL_RULE_PUBLISH_DISABLED: "기준 적용 기능이 꺼져 있습니다.",
    HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED: "법률 검토가 끝난 기준만 적용할 수 있습니다.",
    HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID: "현재 상태에서는 법률 검토를 승인할 수 없습니다.",
    HRX_MINIMUM_WAGE_LEGAL_REVIEW_SCOPE_REQUIRED: "법률 검토 결과를 기록할 권한이 없습니다.",
    HRX_MINIMUM_WAGE_INPUT_SOURCE_REQUIRED: "구성원별 근로·급여 기준 자료를 연결해야 합니다.",
    HRX_PAYROLL_RULE_COVERAGE_INVALID: "시행일 사이에 공백이나 중복이 있습니다.",
    HRX_STATE_VERSION_CONFLICT: "자료가 변경되었습니다. 새로고침하세요.",
    HRX_AUTHZ_DENIED: "급여 기준을 볼 권한이 없습니다.",
  } as Record<string, string>)[String(value ?? "")] ?? "급여 기준을 처리하지 못했습니다.";
}

function dateYear(value: string) {
  return /^\d{4}/.test(value) ? value.slice(0, 4) : "2026";
}

const emptyAllowanceForm = Object.freeze({
  version_code: "",
  effective_from: "",
  effective_to: "",
  source_document_hash: "",
  rounding_mode: "nearest",
  overtime_rate: "150",
  night_rate: "50",
  holiday_rate: "200",
  weekly_holiday_rate: "100",
});

const emptyMinimumWageForm = Object.freeze({
  version_code: "KR-2026",
  effective_from: "2026-01-01",
  effective_to: "2026-12-31",
  hourly_minimum_krw: "10320",
  monthly_conversion_hours: "209",
  included_item_codes: "BASE",
  excluded_item_codes: "OVERTIME, NIGHT, HOLIDAY",
  source_document_ref: "document:moel/minimum-wage-notice-2025-47",
  source_document_hash: OFFICIAL_2026_HASH,
});

export function PayRulesWorkspace({ publishEnabled = false }: { publishEnabled?: boolean }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("allowance");
  const [allowanceRules, setAllowanceRules] = useState<Row[]>([]);
  const [minimumWageStandards, setMinimumWageStandards] = useState<Row[]>([]);
  const [allowanceForm, setAllowanceForm] = useState({ ...emptyAllowanceForm });
  const [minimumWageForm, setMinimumWageForm] = useState({ ...emptyMinimumWageForm });
  const [legalReviewRefs, setLegalReviewRefs] = useState<Record<string, string>>({});
  const [canLegalApprove, setCanLegalApprove] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [impactDate, setImpactDate] = useState("2026-07-30");
  const [impact, setImpact] = useState<Row | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<RuleAction | null>(null);

  const publishedStandard = useMemo(
    () => minimumWageStandards.find((row) => text(row, "approval_state") === "published") ?? null,
    [minimumWageStandards],
  );

  async function load() {
    setLoadState("loading");
    setError("");
    const [allowanceResult, minimumWageResult] = await Promise.all([
      fetchHrxPayrollAllowanceRules(),
      fetchHrxMinimumWageStandards(),
    ]);
    if (allowanceResult.kind !== "data" || minimumWageResult.kind !== "data") {
      const failure = allowanceResult.kind !== "data" ? allowanceResult : minimumWageResult;
      setError(errorLabel("reason" in failure ? failure.reason : null));
      setLoadState("error");
      return;
    }
    setAllowanceRules(records(allowanceResult.rules));
    setMinimumWageStandards(records(minimumWageResult.standards));
    setCanLegalApprove(record(minimumWageResult.permissions).can_legal_approve === true);
    setLoadState("ready");
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAllowance(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy("create-allowance");
    setError("");
    const result = await createHrxPayrollAllowanceRule({
      version_code: allowanceForm.version_code,
      effective_from: allowanceForm.effective_from,
      effective_to: allowanceForm.effective_to || null,
      source_document_hash: allowanceForm.source_document_hash,
      rules: {
        schema_version: "law-firm-os.hrx.payroll-earning-rules.v0.1",
        fixture_only: false,
        currency: "KRW",
        rounding_mode: allowanceForm.rounding_mode,
        monthly: {
          proration_basis: "calendar_days",
          rate_divisor_minutes: 9_600,
          unpaid_leave: null,
        },
        segment_rates: {
          overtime: { rate_bps: Math.round(Number(allowanceForm.overtime_rate) * 100), taxable: true },
          night: { rate_bps: Math.round(Number(allowanceForm.night_rate) * 100), taxable: true },
          holiday: { rate_bps: Math.round(Number(allowanceForm.holiday_rate) * 100), taxable: true },
          weekly_holiday: { rate_bps: Math.round(Number(allowanceForm.weekly_holiday_rate) * 100), taxable: true },
        },
        allowances: [],
        unused_leave: null,
      },
    });
    setBusy("");
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    setAllowanceForm({ ...emptyAllowanceForm });
    setShowForm(false);
    await load();
  }

  async function createMinimumWage(event: { preventDefault(): void }) {
    event.preventDefault();
    const hourly = Number(minimumWageForm.hourly_minimum_krw);
    const monthlyHours = Number(minimumWageForm.monthly_conversion_hours);
    setBusy("create-minimum-wage");
    setError("");
    const result = await createHrxMinimumWageStandard({
      standard: {
        schema_version: "law-firm-os.hrx.minimum-wage.v1",
        standard_id: `kr-minimum-wage-${dateYear(minimumWageForm.effective_from)}`,
        version_code: minimumWageForm.version_code,
        jurisdiction: "KR",
        effective_from: minimumWageForm.effective_from,
        effective_to: minimumWageForm.effective_to || null,
        hourly_minimum_krw: hourly,
        monthly_conversion_minutes: Math.round(monthlyHours * 60),
        monthly_minimum_krw: Math.round(hourly * monthlyHours),
        rounding_mode: "nearest",
        included_item_codes: minimumWageForm.included_item_codes.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean),
        excluded_item_codes: minimumWageForm.excluded_item_codes.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean),
        source_document_ref: minimumWageForm.source_document_ref,
        source_document_hash: minimumWageForm.source_document_hash,
        legal_review_state: "pending",
        legal_review_ref: null,
        fixture_only: false,
      },
    });
    setBusy("");
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    setShowForm(false);
    await load();
  }

  async function review(kind: RuleKind, row: Row) {
    const ruleVersionId = text(row, "rule_version_id");
    setBusy(`review:${ruleVersionId}`);
    setError("");
    const result = kind === "allowance"
      ? await reviewHrxPayrollAllowanceRule(ruleVersionId, number(row, "state_version"))
      : await reviewHrxMinimumWageStandard(ruleVersionId, number(row, "state_version"));
    setBusy("");
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    await load();
  }

  async function approveLegalReview(action: LegalReviewAction) {
    setBusy(`legal-approve:${action.ruleVersionId}`);
    setError("");
    const result = await legallyApproveHrxMinimumWageStandard(
      action.ruleVersionId,
      action.expectedVersion,
      action.legalReviewRef,
    );
    setBusy("");
    if (result.kind === "step_up_required") {
      setPendingAction(action);
      return;
    }
    setPendingAction(null);
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    await load();
  }

  async function publish(action: PublishAction) {
    setBusy(`publish:${action.ruleVersionId}`);
    setError("");
    const result = action.kind === "allowance"
      ? await publishHrxPayrollAllowanceRule(action.ruleVersionId, action.expectedVersion)
      : await publishHrxMinimumWageStandard(action.ruleVersionId, action.expectedVersion);
    setBusy("");
    if (result.kind === "step_up_required") {
      setPendingAction(action);
      return;
    }
    setPendingAction(null);
    if (result.kind !== "data") {
      setError(errorLabel(result.reason));
      return;
    }
    await load();
  }

  function resumePendingAction(action: RuleAction) {
    return action.action === "legal_approve"
      ? approveLegalReview(action)
      : publish(action);
  }

  async function previewImpact() {
    setBusy("impact");
    setError("");
    const result = await previewHrxMinimumWageImpact(impactDate);
    setBusy("");
    if (result.kind !== "data") {
      setImpact(null);
      setError(errorLabel(result.reason));
      return;
    }
    setImpact(result.impact as Row);
  }

  function actions(kind: RuleKind, row: Row) {
    const state = text(row, "approval_state");
    const ruleVersionId = text(row, "rule_version_id");
    const legalReviewState = text(record(row.standard), "legal_review_state");
    if (kind === "minimum_wage" && state === "draft" && legalReviewState === "pending") {
      if (!canLegalApprove) return <span className="pay-rules-current">법률 검토 권한 없음</span>;
      const legalReviewRef = legalReviewRefs[ruleVersionId] ?? "";
      return (
        <div className="pay-rules-legal-review-action">
          <label>
            <span className="sr-only">법률 검토 근거</span>
            <input
              aria-label="법률 검토 근거"
              placeholder="document:legal/..."
              value={legalReviewRef}
              onChange={(event) => setLegalReviewRefs((current) => ({
                ...current,
                [ruleVersionId]: event.target.value,
              }))}
            />
          </label>
          <button
            className="table-inline-action"
            type="button"
            disabled={!publishEnabled || !legalReviewRef.trim() || busy === `legal-approve:${ruleVersionId}`}
            title={publishEnabled ? undefined : "기준 적용 기능이 꺼져 있습니다"}
            onClick={() => void approveLegalReview({
              kind: "minimum_wage",
              action: "legal_approve",
              ruleVersionId,
              expectedVersion: number(row, "state_version"),
              legalReviewRef: legalReviewRef.trim(),
            })}
          >
            <Check size={13} />법률 검토 승인
          </button>
        </div>
      );
    }
    if (state === "draft") {
      return (
        <button
          className="table-inline-action"
          type="button"
          disabled={busy === `review:${ruleVersionId}`}
          onClick={() => void review(kind, row)}
        >
          <Check size={13} />{kind === "minimum_wage" ? "급여 검토 완료" : "검토 완료"}
        </button>
      );
    }
    if (state === "reviewed") {
      return (
        <button
          className="table-inline-action"
          type="button"
          disabled={!publishEnabled || busy === `publish:${ruleVersionId}`}
          title={publishEnabled ? undefined : "기준 적용 기능이 꺼져 있습니다"}
          onClick={() => void publish({
            kind,
            action: "publish",
            ruleVersionId,
            expectedVersion: number(row, "state_version"),
          })}
        >
          적용 시작
        </button>
      );
    }
    return <span className="pay-rules-current">현재 적용</span>;
  }

  const impactRows = records(impact?.impacts);
  const impactStandard = record(impact?.standard);
  const amountsVisible = impactRows.some((row) => Object.hasOwn(row, "required_wage_krw"));

  return (
    <Panel
      id="people-pay-rules"
      className="people-panel span-2 pay-rules-workspace"
      title="급여 기준"
      meta={activeTab === "allowance" || activeTab === "minimum_wage"
        ? `${allowanceRules.length + minimumWageStandards.length}개 버전`
        : "항목·구성원"}
      data-pay-rules-workspace="true"
    >
      <div className="pay-rules-intro">
        <p>급여 항목, 구성원별 적용 기준, 수당과 최저임금 기준을 시행일별로 관리합니다.</p>
        {(activeTab === "allowance" || activeTab === "minimum_wage") && (
          <button className="secondary-button" type="button" onClick={() => void load()} disabled={loadState === "loading"}>
            <RefreshCw size={14} />새로고침
          </button>
        )}
      </div>

      <div className="payroll-operation-tabs pay-rules-tabs" role="tablist" aria-label="급여 기준 종류">
        <button type="button" role="tab" aria-selected={activeTab === "items"} className={activeTab === "items" ? "active" : ""} onClick={() => { setActiveTab("items"); setShowForm(false); }}>
          급여 항목
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "profiles"} className={activeTab === "profiles" ? "active" : ""} onClick={() => { setActiveTab("profiles"); setShowForm(false); }}>
          구성원 급여
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "allowance"} className={activeTab === "allowance" ? "active" : ""} onClick={() => { setActiveTab("allowance"); setShowForm(false); }}>
          수당 기준
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "minimum_wage"} className={activeTab === "minimum_wage" ? "active" : ""} onClick={() => { setActiveTab("minimum_wage"); setShowForm(false); }}>
          최저임금 기준
        </button>
      </div>

      {(activeTab === "items" || activeTab === "profiles") && <PayrollCatalogWorkspace mode={activeTab} />}

      {(activeTab === "allowance" || activeTab === "minimum_wage") && (
        <>
          {pendingAction && (
            <HrxStepUpChallenge
              purpose="payroll_export_review"
              onVerified={() => void resumePendingAction(pendingAction)}
            />
          )}
          {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
          {loadState === "loading" && <div className="live-data-state live-data-loading">급여 기준을 불러오는 중입니다</div>}
          {loadState === "error" && !error && <div className="live-data-state live-data-error">급여 기준을 불러오지 못했습니다.</div>}
        </>
      )}

      {loadState === "ready" && activeTab === "allowance" && (
        <section className="pay-rules-section" aria-labelledby="allowance-rules-heading">
          <div className="pay-rules-section-head">
            <div><h3 id="allowance-rules-heading">수당 계산 기준</h3><span>허용된 근로시간 종류와 비율만 저장합니다.</span></div>
            <button className="secondary-button" type="button" onClick={() => setShowForm((value) => !value)}><Plus size={14} />새 버전</button>
          </div>
          {showForm && (
            <form className="pay-rules-form" data-pay-rules-form="allowance" onSubmit={createAllowance}>
              <label><span>버전 이름</span><input required value={allowanceForm.version_code} onChange={(event) => setAllowanceForm({ ...allowanceForm, version_code: event.target.value })} /></label>
              <label><span>시행일</span><input required type="date" value={allowanceForm.effective_from} onChange={(event) => setAllowanceForm({ ...allowanceForm, effective_from: event.target.value })} /></label>
              <label><span>종료일</span><input type="date" min={allowanceForm.effective_from || undefined} value={allowanceForm.effective_to} onChange={(event) => setAllowanceForm({ ...allowanceForm, effective_to: event.target.value })} /></label>
              <label><span>반올림</span><select value={allowanceForm.rounding_mode} onChange={(event) => setAllowanceForm({ ...allowanceForm, rounding_mode: event.target.value })}><option value="nearest">가장 가까운 원</option><option value="floor">원 미만 내림</option><option value="ceil">원 미만 올림</option><option value="truncate">소수점 버림</option></select></label>
              <label><span>연장근로 적용률(%)</span><input required type="number" min="0" max="1000" step="0.01" value={allowanceForm.overtime_rate} onChange={(event) => setAllowanceForm({ ...allowanceForm, overtime_rate: event.target.value })} /></label>
              <label><span>야간근로 가산률(%)</span><input required type="number" min="0" max="1000" step="0.01" value={allowanceForm.night_rate} onChange={(event) => setAllowanceForm({ ...allowanceForm, night_rate: event.target.value })} /></label>
              <label><span>휴일근로 적용률(%)</span><input required type="number" min="0" max="1000" step="0.01" value={allowanceForm.holiday_rate} onChange={(event) => setAllowanceForm({ ...allowanceForm, holiday_rate: event.target.value })} /></label>
              <label><span>주휴 적용률(%)</span><input required type="number" min="0" max="1000" step="0.01" value={allowanceForm.weekly_holiday_rate} onChange={(event) => setAllowanceForm({ ...allowanceForm, weekly_holiday_rate: event.target.value })} /></label>
              <label className="pay-rules-wide-field"><span>근거 문서 SHA-256</span><input required minLength={64} maxLength={71} spellCheck={false} value={allowanceForm.source_document_hash} onChange={(event) => setAllowanceForm({ ...allowanceForm, source_document_hash: event.target.value })} /></label>
              <div className="pay-rules-form-actions"><button className="primary-button" disabled={busy === "create-allowance"}>초안 저장</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>취소</button></div>
            </form>
          )}
          {allowanceRules.length ? (
            <div className="data-table-wrap">
              <table className="data-table pay-rules-table pay-rules-allowance-table">
                <thead><tr><th>버전</th><th>시행 기간</th><th>연장</th><th>야간</th><th>휴일</th><th>주휴</th><th>상태</th><th>관리</th></tr></thead>
                <tbody>{allowanceRules.map((row) => {
                  const rules = record(row.rules);
                  const rates = record(rules.segment_rates);
                  const rate = (kind: string) => `${(number(record(rates[kind]), "rate_bps") / 100).toLocaleString("ko-KR")}%`;
                  return <tr key={text(row, "rule_version_id")} data-rule-state={text(row, "approval_state")}><td><strong>{text(row, "version_code")}</strong></td><td>{text(row, "effective_from")} ~ {text(row, "effective_to") || "계속"}</td><td>{rate("overtime")}</td><td>{rate("night")}</td><td>{rate("holiday")}</td><td>{rate("weekly_holiday")}</td><td><span className="record-state-badge" data-state={statusTone(text(row, "approval_state"))}>{statusLabel(text(row, "approval_state"))}</span></td><td>{actions("allowance", row)}</td></tr>;
                })}</tbody>
              </table>
            </div>
          ) : <div className="live-data-state live-data-empty">저장된 수당 기준이 없습니다.</div>}
          {!publishEnabled && <p className="pay-rules-switch-note">기준 적용 기능이 꺼져 있어 초안과 검토까지만 할 수 있습니다.</p>}
        </section>
      )}

      {loadState === "ready" && activeTab === "minimum_wage" && (
        <>
          <section className="pay-rules-section" aria-labelledby="minimum-wage-rules-heading">
            <div className="pay-rules-section-head">
              <div><h3 id="minimum-wage-rules-heading">최저임금 기준 이력</h3><span>법률 검토 전 기준은 구성원 확인과 실제 정산에 쓰지 않습니다.</span></div>
              <button className="secondary-button" type="button" onClick={() => setShowForm((value) => !value)}><Plus size={14} />새 기준</button>
            </div>
            {showForm && (
              <form className="pay-rules-form" data-pay-rules-form="minimum-wage" onSubmit={createMinimumWage}>
                <label><span>버전 이름</span><input required value={minimumWageForm.version_code} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, version_code: event.target.value })} /></label>
                <label><span>시행일</span><input required type="date" value={minimumWageForm.effective_from} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, effective_from: event.target.value })} /></label>
                <label><span>종료일</span><input type="date" min={minimumWageForm.effective_from || undefined} value={minimumWageForm.effective_to} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, effective_to: event.target.value })} /></label>
                <label><span>시간급(원)</span><input required type="number" min="1" step="1" value={minimumWageForm.hourly_minimum_krw} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, hourly_minimum_krw: event.target.value })} /></label>
                <label><span>월 환산 시간</span><input required type="number" min="1" step="1" value={minimumWageForm.monthly_conversion_hours} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, monthly_conversion_hours: event.target.value })} /></label>
                <label><span>포함 항목 코드</span><input required value={minimumWageForm.included_item_codes} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, included_item_codes: event.target.value })} /></label>
                <label><span>제외 항목 코드</span><input required value={minimumWageForm.excluded_item_codes} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, excluded_item_codes: event.target.value })} /></label>
                <label className="pay-rules-wide-field"><span>근거 문서 참조</span><input required value={minimumWageForm.source_document_ref} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, source_document_ref: event.target.value })} /></label>
                <label className="pay-rules-wide-field"><span>근거 문서 SHA-256</span><input required minLength={64} maxLength={64} spellCheck={false} value={minimumWageForm.source_document_hash} onChange={(event) => setMinimumWageForm({ ...minimumWageForm, source_document_hash: event.target.value })} /></label>
                <div className="pay-rules-form-summary">월 환산액 <strong>{money.format(Math.round(Number(minimumWageForm.hourly_minimum_krw || 0) * Number(minimumWageForm.monthly_conversion_hours || 0)))}</strong> / 저장 후 법률 검토 필요</div>
                <div className="pay-rules-form-actions"><button className="primary-button" disabled={busy === "create-minimum-wage"}>검토 전 기준 저장</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>취소</button></div>
              </form>
            )}
            {minimumWageStandards.length ? (
              <div className="data-table-wrap">
                <table className="data-table pay-rules-table pay-rules-minimum-wage-table">
                  <thead><tr><th>버전</th><th>시행 기간</th><th>시간급</th><th>월 환산액</th><th>법률 검토</th><th>상태</th><th>관리</th></tr></thead>
                  <tbody>{minimumWageStandards.map((row) => {
                    const standard = record(row.standard);
                    const workflowState = text(row, "workflow_state") || text(row, "approval_state");
                    return <tr key={text(row, "rule_version_id")} data-rule-state={workflowState}><td><strong>{text(standard, "version_code")}</strong></td><td className="pay-rules-effective-period"><span>{text(standard, "effective_from")} ~ {text(standard, "effective_to") || "계속"}</span></td><td>{money.format(number(standard, "hourly_minimum_krw"))}</td><td>{money.format(number(standard, "monthly_minimum_krw"))}</td><td>{legalReviewLabel(text(standard, "legal_review_state"))}</td><td><span className="record-state-badge" data-state={statusTone(text(row, "approval_state"))}>{statusLabel(workflowState)}</span></td><td>{actions("minimum_wage", row)}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            ) : <div className="live-data-state live-data-empty">저장된 최저임금 기준이 없습니다.</div>}
          </section>

          <section className="pay-rules-section pay-rules-impact" aria-labelledby="minimum-wage-impact-heading">
            <div className="pay-rules-section-head">
              <div><h3 id="minimum-wage-impact-heading">구성원별 확인 결과</h3><span>미달 가능성을 찾는 보조 자료이며 법률 판단 결과가 아닙니다.</span></div>
              <div className="pay-rules-impact-controls"><label><span className="sr-only">확인 기준일</span><input aria-label="확인 기준일" type="date" value={impactDate} onChange={(event) => setImpactDate(event.target.value)} /></label><button className="secondary-button" type="button" disabled={!publishedStandard || busy === "impact"} onClick={() => void previewImpact()}>구성원별 확인</button></div>
            </div>
            {!publishedStandard && <div className="live-data-state live-data-empty">법률 검토와 적용이 끝난 기준이 있어야 확인할 수 있습니다.</div>}
            {impact && (
              <>
                <div className="payroll-summary-strip pay-rules-impact-summary">
                  <span>적용 기준 <strong>{text(impactStandard, "version_code")}</strong></span>
                  <span>미달 가능 <strong>{number(impact, "below_candidate_count")}명</strong></span>
                  <span>항목 확인 <strong>{number(impact, "review_required_count")}명</strong></span>
                  <span>금액 <strong>{amountsVisible ? "표시" : "숨김"}</strong></span>
                </div>
                <div className="pay-rules-impact-list">
                  {impactRows.map((row, index) => {
                    const employeeLabel = impactEmployeeLabel(row, index);
                    const stateLabel = resultLabel(text(row, "result_state"));
                    const amountLabel = amountsVisible ? `기준 ${money.format(number(row, "required_wage_krw"))}` : "금액 보기 권한 없음";
                    return (
                      <details key={`${employeeLabel}:${index}`} data-impact-state={text(row, "result_state")}>
                        <summary aria-label={`${employeeLabel} ${stateLabel} ${amountLabel}`}>
                          <strong>{employeeLabel}</strong>
                          <span className="record-state-badge" data-state={resultTone(text(row, "result_state"))}>{stateLabel}</span>
                          <span>{amountLabel}</span>
                        </summary>
                        <dl>
                          <div><dt>월 소정근로</dt><dd>{amountsVisible ? `${number(row, "contractual_minutes").toLocaleString("ko-KR")}분` : "가림"}</dd></div>
                          <div><dt>포함 임금</dt><dd>{amountsVisible ? money.format(number(row, "included_wage_krw")) : "가림"}</dd></div>
                          <div><dt>기준 임금</dt><dd>{amountsVisible ? money.format(number(row, "required_wage_krw")) : "가림"}</dd></div>
                          <div><dt>차이</dt><dd>{amountsVisible ? money.format(number(row, "gap_krw")) : "가림"}</dd></div>
                        </dl>
                        {Array.isArray(row.unknown_item_codes) && row.unknown_item_codes.length > 0 && <p>분류가 필요한 임금 항목이 있습니다.</p>}
                        <small>이 결과만으로 법률상 최저임금 미달 여부를 확정하지 않습니다.</small>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </Panel>
  );
}
