import React, { useEffect, useState } from "react";
import { Download, Play, Plus, RefreshCw } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  createHrxLeaveAccrualRule,
  executeHrxLeaveAccrual,
  executeHrxLeaveAccrualBatch,
  exportHrxLeaveAccrualBatch,
  fetchHrxLeaveAccrualRules,
  fetchHrxLeaveAccrualRuns,
  fetchHrxLeaveConfiguration,
  previewHrxLeaveAccrual,
  previewHrxLeaveAccrualBatch,
  retryHrxLeaveAccrualBatch
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

function offsetDate(value: string, years: number, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function ruleConfig(row: Row | undefined) {
  const value = row?.rule_json;
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  try {
    return JSON.parse(typeof value === "string" ? value : "{}") as Row;
  } catch {
    return {};
  }
}

function batchRange(rule: Row | undefined, today = localDate()) {
  const config = ruleConfig(rule);
  const schedule = text(config, "schedule");
  if (schedule === "monthly_perfect_attendance") {
    const start = `${today.slice(0, 7)}-01`;
    const end = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    return { start, end: end.toISOString().slice(0, 10) };
  }
  const monthDay = schedule === "fiscal_year" ? text(config, "fiscal_year_start") : text(config, "annual_date");
  const start = /^\d{2}-\d{2}$/.test(monthDay) ? `${today.slice(0, 4)}-${monthDay}` : today;
  return { start, end: offsetDate(start, 1, -1) };
}

function batchRangeError(start: string, end: string) {
  if (!start || !end) return "시작일과 종료일을 입력하세요.";
  if (end < start) return "종료일은 시작일보다 빠를 수 없습니다.";
  if (end > offsetDate(start, 10, -1)) return "한 번에 실행할 수 있는 기간은 최대 10년입니다.";
  return "";
}

function statusLabel(status: string) {
  return ({ ready: "발생 예정", created: "발생 완료", duplicate: "기발생", skipped: "제외", error: "확인 필요" } as Record<string, string>)[status] ?? status;
}

function reasonLabel(reason: string) {
  return ({ eligible: "대상", accrued: "원장 반영", already_accrued: "동일 기간 반영됨", employee_inactive: "재직 대상 아님", leave_of_absence: "휴직", outside_accrual_schedule: "발생일 아님", no_entitlement_for_period: "발생량 없음", employment_profile_missing: "재직 정보 없음", work_schedule_missing: "근무일정 없음", attendance_source_missing: "근태 원천 없음", work_schedule_ratio_invalid: "근로시간 비율 확인" } as Record<string, string>)[reason] ?? reason;
}

function batchStatusLabel(status: string) {
  return ({ pending: "대기", running: "실행 중", completed: "완료", completed_with_errors: "확인 필요", failed: "실패" } as Record<string, string>)[status] ?? status;
}

function batchErrorLabel(reason: unknown) {
  return ({
    HRX_LEAVE_ACCRUAL_BATCH_PERIOD_LIMIT_EXCEEDED: "한 번에 실행할 수 있는 기간은 최대 10년입니다.",
    HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID: "규칙의 실행 주기에 맞는 완결 기간을 선택하세요.",
    HRX_LEAVE_ACCRUAL_BATCH_PERIOD_RANGE_INVALID: "기간 범위를 다시 확인하세요.",
    HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_STALE: "원천 정보가 변경되었습니다. 다시 미리보기 하세요."
  } as Record<string, string>)[String(reason ?? "")] ?? "기간 배치를 처리하지 못했습니다.";
}

const emptyRule = {
  rule_code: "",
  display_name: "",
  policy_version_id: "",
  basis: "korean_statutory_annual",
  schedule: "fixed_annual_date",
  annual_date: "01-01",
  amount_minutes: "480",
  minutes_per_day: "480",
  expiration_months: "12"
};

export function LeaveAccrualAutoPage({ canExport = false }: { canExport?: boolean }) {
  const [rules, setRules] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<Row[]>([]);
  const [runs, setRuns] = useState<Row[]>([]);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [selectedRule, setSelectedRule] = useState("");
  const [occurredOn, setOccurredOn] = useState(localDate());
  const [periodKey, setPeriodKey] = useState(String(new Date().getFullYear()));
  const [runMode, setRunMode] = useState<"single" | "batch">("batch");
  const initialBatchRange = batchRange(undefined);
  const [batchStart, setBatchStart] = useState(initialBatchRange.start);
  const [batchEnd, setBatchEnd] = useState(initialBatchRange.end);
  const [batch, setBatch] = useState<Row | null>(null);
  const [previewRun, setPreviewRun] = useState<Row | null>(null);
  const [executionRun, setExecutionRun] = useState<Row | null>(null);
  const [stepUpAction, setStepUpAction] = useState<"" | "single" | "batch-execute" | "batch-retry">("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [ruleResult, configuration, runResult] = await Promise.all([
      fetchHrxLeaveAccrualRules(),
      fetchHrxLeaveConfiguration(),
      fetchHrxLeaveAccrualRuns()
    ]);
    if (ruleResult.kind !== "data" || configuration.kind !== "data" || runResult.kind !== "data") {
      setError("자동 발생 설정을 불러오지 못했습니다.");
      return;
    }
    const activePolicies = configuration.policies.filter((policy: Row) => text(policy, "status") === "active");
    setRules(ruleResult.rules as Row[]);
    setPolicies(activePolicies as Row[]);
    setRuns(runResult.runs as Row[]);
    setSelectedRule((current) => {
      if (current) return current;
      const firstRule = ruleResult.rules[0] as Row | undefined;
      const range = batchRange(firstRule);
      setBatchStart(range.start);
      setBatchEnd(range.end);
      return text(firstRule, "accrual_rule_id");
    });
    setRuleForm((current) => ({ ...current, policy_version_id: current.policy_version_id || text(activePolicies[0] as Row, "policy_version_id") }));
    setError("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function createRule(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy("create-rule");
    setError("");
    const result = await createHrxLeaveAccrualRule({
      rule_code: ruleForm.rule_code,
      display_name: ruleForm.display_name,
      policy_version_id: ruleForm.policy_version_id,
      effective_from: occurredOn,
      rule: {
        basis: ruleForm.basis,
        schedule: ruleForm.schedule,
        annual_date: ruleForm.annual_date,
        minutes_per_day: Number(ruleForm.minutes_per_day),
        amount_minutes: Number(ruleForm.amount_minutes),
        expiration_months: Number(ruleForm.expiration_months),
        attendance_source_required: true,
        prorate_reduced_schedule: true
      }
    });
    setBusy("");
    if (result.kind !== "data") {
      setError(typeof result.reason === "string" ? result.reason : "발생 규칙을 저장하지 못했습니다.");
      return;
    }
    setRuleForm((current) => ({ ...emptyRule, policy_version_id: current.policy_version_id }));
    setSelectedRule(text(result.rule as Row, "accrual_rule_id"));
    await load();
  }

  async function preview() {
    setBusy("preview");
    setError("");
    setExecutionRun(null);
    setStepUpAction("");
    const result = await previewHrxLeaveAccrual({ accrual_rule_id: selectedRule, period_key: periodKey, occurred_on: occurredOn });
    setBusy("");
    if (result.kind !== "data") {
      setError(typeof result.reason === "string" ? result.reason : "발생 대상을 계산하지 못했습니다.");
      return;
    }
    setPreviewRun(result.run as Row);
    await load();
  }

  async function execute() {
    if (!previewRun) return;
    setBusy("execute");
    setError("");
    const result = await executeHrxLeaveAccrual(text(previewRun, "accrual_run_id"));
    setBusy("");
    if (result.kind === "step_up_required") {
      setStepUpAction("single");
      return;
    }
    if (result.kind !== "data") {
      setError(typeof result.reason === "string" ? result.reason : "자동 발생을 실행하지 못했습니다.");
      return;
    }
    setStepUpAction("");
    setExecutionRun(result.run as Row);
    await load();
  }

  function selectRule(ruleId: string) {
    setSelectedRule(ruleId);
    setPreviewRun(null);
    setExecutionRun(null);
    setBatch(null);
    setStepUpAction("");
    const range = batchRange(rules.find((rule) => text(rule, "accrual_rule_id") === ruleId));
    setBatchStart(range.start);
    setBatchEnd(range.end);
  }

  async function previewBatch() {
    const rangeError = batchRangeError(batchStart, batchEnd);
    if (rangeError) {
      setError(rangeError);
      return;
    }
    setBusy("batch-preview");
    setError("");
    setBatch(null);
    setStepUpAction("");
    const response = await previewHrxLeaveAccrualBatch({
      accrual_rule_id: selectedRule,
      start_date: batchStart,
      end_date: batchEnd,
      idempotency_key: `leave-accrual-batch-preview:${selectedRule}:${batchStart}:${batchEnd}`
    });
    setBusy("");
    if (response.kind !== "data") {
      setError(batchErrorLabel(response.reason));
      return;
    }
    setBatch(response.batch as Row);
  }

  async function executeBatch() {
    if (!batch || text(batch, "mode") !== "preview") return;
    setBusy("batch-execute");
    setError("");
    const previewBatchId = text(batch, "accrual_batch_id");
    const response = await executeHrxLeaveAccrualBatch(previewBatchId, {
      idempotency_key: `leave-accrual-batch-execute:${previewBatchId}`
    });
    setBusy("");
    if (response.kind === "step_up_required") {
      setStepUpAction("batch-execute");
      return;
    }
    if (response.kind !== "data") {
      setError(batchErrorLabel(response.reason));
      return;
    }
    setStepUpAction("");
    setBatch(response.batch as Row);
    await load();
  }

  async function retryBatch() {
    if (!batch) return;
    setBusy("batch-retry");
    setError("");
    const response = await retryHrxLeaveAccrualBatch(text(batch, "accrual_batch_id"));
    setBusy("");
    if (response.kind === "step_up_required") {
      setStepUpAction("batch-retry");
      return;
    }
    if (response.kind !== "data") {
      setError(batchErrorLabel(response.reason));
      return;
    }
    setStepUpAction("");
    setBatch(response.batch as Row);
    await load();
  }

  async function downloadBatch(format: "csv" | "xlsx") {
    if (!batch) return;
    setBusy(`batch-${format}`);
    setError("");
    const response = await exportHrxLeaveAccrualBatch(text(batch, "accrual_batch_id"), format);
    setBusy("");
    if (response.kind !== "data") {
      setError("실행 영수증을 만들지 못했습니다.");
      return;
    }
    const artifact = response.export as Row;
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

  const visibleRun = executionRun ?? previewRun;
  const result = visibleRun?.result as Row | undefined;
  const rows = Array.isArray(result?.rows) ? result.rows as Row[] : [];
  const counts = result?.counts as Row | undefined;
  const batchPeriods = Array.isArray(batch?.periods) ? batch.periods as Row[] : [];
  const batchTotals = batch?.totals as Row | undefined;
  const rangeError = batchRangeError(batchStart, batchEnd);
  const retryableBatch = batchPeriods.some((period) => ["pending", "running", "failed"].includes(text(period, "status")));

  return (
    <Panel id="people-leave-accrual-auto" className="people-panel span-2 leave-accrual-panel" title="휴가 자동 발생" meta="HR 전용">
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      <section className="leave-accrual-section" aria-labelledby="leave-accrual-rule-heading">
        <div className="leave-accrual-section-head"><h3 id="leave-accrual-rule-heading">발생 규칙</h3><span>{rules.length}개</span></div>
        <form className="leave-accrual-form leave-accrual-rule-form" onSubmit={createRule}>
          <label><span>규칙 이름</span><input required value={ruleForm.display_name} onChange={(event) => setRuleForm({ ...ruleForm, display_name: event.target.value })} /></label>
          <label><span>규칙 코드</span><input required value={ruleForm.rule_code} onChange={(event) => setRuleForm({ ...ruleForm, rule_code: event.target.value })} /></label>
          <label><span>정책 버전</span><select required value={ruleForm.policy_version_id} onChange={(event) => setRuleForm({ ...ruleForm, policy_version_id: event.target.value })}><option value="">정책 선택</option>{policies.map((policy) => <option key={text(policy, "policy_version_id")} value={text(policy, "policy_version_id")}>{text(policy, "policy_code")} v{number(policy, "version")}</option>)}</select></label>
          <label><span>발생 기준</span><select value={ruleForm.basis} onChange={(event) => setRuleForm({ ...ruleForm, basis: event.target.value })}><option value="korean_statutory_annual">법정 연차</option><option value="fixed_amount">고정 분</option><option value="monthly_perfect_attendance">월 개근</option></select></label>
          <label><span>실행 주기</span><select value={ruleForm.schedule} onChange={(event) => setRuleForm({ ...ruleForm, schedule: event.target.value })}><option value="hire_anniversary">입사 기념일</option><option value="fiscal_year">회계연도</option><option value="fixed_annual_date">연 1회 지정일</option><option value="monthly_perfect_attendance">월 개근</option></select></label>
          <label><span>연간 실행일</span><input required pattern="[0-9]{2}-[0-9]{2}" value={ruleForm.annual_date} onChange={(event) => setRuleForm({ ...ruleForm, annual_date: event.target.value })} /></label>
          <label><span>1일 기준(분)</span><input required type="number" min="1" step="1" value={ruleForm.minutes_per_day} onChange={(event) => setRuleForm({ ...ruleForm, minutes_per_day: event.target.value })} /></label>
          <label><span>고정 발생량(분)</span><input required type="number" min="1" step="1" value={ruleForm.amount_minutes} onChange={(event) => setRuleForm({ ...ruleForm, amount_minutes: event.target.value })} /></label>
          <label><span>유효기간(개월)</span><input required type="number" min="1" step="1" value={ruleForm.expiration_months} onChange={(event) => setRuleForm({ ...ruleForm, expiration_months: event.target.value })} /></label>
          <button className="secondary-button" disabled={!policies.length || busy === "create-rule"}><Plus size={14} />규칙 추가</button>
        </form>
      </section>

      <section className="leave-accrual-section" aria-labelledby="leave-accrual-run-heading">
        <div className="leave-accrual-section-head"><h3 id="leave-accrual-run-heading">미리보기와 실행</h3><select aria-label="실행 방식" value={runMode} onChange={(event) => { setRunMode(event.target.value as "single" | "batch"); setError(""); setStepUpAction(""); }}><option value="single">단일 기간</option><option value="batch">기간 배치</option></select></div>
        {runMode === "single" ? <div className="leave-accrual-runbar">
          <label><span>발생 규칙</span><select aria-label="발생 규칙" value={selectedRule} onChange={(event) => selectRule(event.target.value)}><option value="">규칙 선택</option>{rules.map((rule) => <option key={text(rule, "accrual_rule_id")} value={text(rule, "accrual_rule_id")}>{text(rule, "display_name")}</option>)}</select></label>
          <label><span>기간 키</span><input aria-label="기간 키" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} /></label>
          <label><span>발생일</span><input aria-label="발생일" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
          <button className="secondary-button" type="button" disabled={!selectedRule || busy === "preview"} onClick={() => void preview()}><RefreshCw size={14} />미리보기</button>
          <button className="primary-button" type="button" disabled={!previewRun || busy === "execute"} onClick={() => void execute()}><Play size={14} />원장에 반영</button>
        </div> : <div className="leave-accrual-runbar leave-accrual-batch-runbar">
          <label><span>발생 규칙</span><select aria-label="배치 발생 규칙" value={selectedRule} onChange={(event) => selectRule(event.target.value)}><option value="">규칙 선택</option>{rules.map((rule) => <option key={text(rule, "accrual_rule_id")} value={text(rule, "accrual_rule_id")}>{text(rule, "display_name")}</option>)}</select></label>
          <label><span>시작일</span><input aria-label="배치 시작일" type="date" value={batchStart} onChange={(event) => { setBatchStart(event.target.value); setBatch(null); }} /></label>
          <label><span>종료일</span><input aria-label="배치 종료일" type="date" min={batchStart || undefined} max={batchStart ? offsetDate(batchStart, 10, -1) : undefined} value={batchEnd} onChange={(event) => { setBatchEnd(event.target.value); setBatch(null); }} /></label>
          <button className="secondary-button" type="button" disabled={!selectedRule || Boolean(rangeError) || busy === "batch-preview"} onClick={() => void previewBatch()}><RefreshCw size={14} />배치 미리보기</button>
          <button className="primary-button" type="button" disabled={!batch || text(batch, "mode") !== "preview" || busy === "batch-execute"} onClick={() => void executeBatch()}><Play size={14} />원장에 반영</button>
        </div>}
        {runMode === "batch" && rangeError && <div className="leave-accrual-inline-error" role="status">{rangeError}</div>}
        {stepUpAction && <HrxStepUpChallenge purpose="leave_accrual_execute" onVerified={() => void (stepUpAction === "single" ? execute() : stepUpAction === "batch-retry" ? retryBatch() : executeBatch())} />}
        {runMode === "single" && visibleRun && (
          <>
            <div className="leave-accrual-summary" data-leave-accrual-run={text(visibleRun, "mode")} data-source-version={text(visibleRun, "snapshot_hash")}>
              <span>신규 <strong>{number(counts, "new_entries") || number(counts, "ready")}</strong></span>
              <span>중복 <strong>{number(counts, "duplicates")}</strong></span>
              <span>확인 필요 <strong>{number(counts, "errors")}</strong></span>
            </div>
            <div className="data-table-wrap"><table className="data-table"><thead><tr><th>구성원</th><th>결과</th><th>발생량</th><th>근거</th><th>유효기간</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${text(row, "employee_id")}:${index}`}><td><strong>{text(row, "display_name")}</strong><small className="leave-settings-code">{text(row, "employee_id")}</small></td><td><span className={`record-state-badge ${text(row, "status")}`}>{statusLabel(text(row, "status"))}</span></td><td>{number(row, "amount_minutes").toLocaleString("ko-KR")}분</td><td>{reasonLabel(text(row, "reason_code"))}</td><td>{text(row, "valid_from") || "-"} ~ {text(row, "expires_on") || "-"}</td></tr>)}</tbody></table></div>
          </>
        )}
        {runMode === "batch" && batch && <>
          <div className="leave-accrual-summary leave-accrual-batch-summary" aria-label="기간 배치 합계">
            <span>기간 <strong>{number(batch, "period_count")}</strong></span>
            <span>{text(batch, "mode") === "execute" ? "신규" : "대상"} <strong>{number(batchTotals, text(batch, "mode") === "execute" ? "new_entries" : "ready")}</strong></span>
            <span>오류 <strong>{number(batchTotals, "errors")}</strong></span>
            <span>실패 기간 <strong>{number(batchTotals, "failed_periods")}</strong></span>
          </div>
          <div className="leave-accrual-batch-actions">
            {retryableBatch && <button className="secondary-button" type="button" disabled={busy === "batch-retry"} onClick={() => void retryBatch()}><RefreshCw size={14} />실패 기간 재시도</button>}
            {canExport && <><button className="secondary-button" type="button" disabled={busy === "batch-csv"} onClick={() => void downloadBatch("csv")}><Download size={14} />CSV</button><button className="secondary-button" type="button" disabled={busy === "batch-xlsx"} onClick={() => void downloadBatch("xlsx")}><Download size={14} />XLSX</button></>}
          </div>
          <div className="data-table-wrap leave-accrual-batch-table"><table className="data-table"><thead><tr><th>기간</th><th>발생일</th><th>상태</th><th>{text(batch, "mode") === "execute" ? "신규" : "대상"}</th><th>오류</th><th>시도</th></tr></thead><tbody>{batchPeriods.map((period) => { const periodResult = period.result as Row | undefined; const periodCounts = periodResult?.counts as Row | undefined; return <tr key={text(period, "batch_period_id")} data-compact-record="true"><td>{text(period, "period_start")} ~ {text(period, "period_end")}</td><td>{text(period, "occurred_on")}</td><td><span className="record-state-badge" data-state={text(period, "status") === "completed" ? "live" : text(period, "status") === "failed" ? "error" : "review"}>{batchStatusLabel(text(period, "status"))}</span></td><td>{number(periodCounts, text(batch, "mode") === "execute" ? "new_entries" : "ready")}</td><td>{number(periodCounts, "errors") + (text(period, "status") === "failed" ? 1 : 0)}</td><td>{number(period, "attempt_count")}</td></tr>; })}</tbody></table></div>
        </>}
      </section>

      <section className="leave-accrual-section" aria-labelledby="leave-accrual-history-heading">
        <div className="leave-accrual-section-head"><h3 id="leave-accrual-history-heading">최근 실행</h3><span>{runs.length}건</span></div>
        {runs.length > 0 && <div className="data-table-wrap"><table className="data-table"><thead><tr><th>생성 시각</th><th>구분</th><th>기간</th><th>상태</th><th>신규</th></tr></thead><tbody>{runs.slice(0, 10).map((run) => { const runResult = run.result as Row | undefined; const runCounts = runResult?.counts as Row | undefined; return <tr key={text(run, "accrual_run_id")}><td>{text(run, "created_at").replace("T", " ").slice(0, 16)}</td><td>{text(run, "mode") === "execute" ? "실행" : "미리보기"}</td><td>{text(run, "period_key")}</td><td>{text(run, "status") === "completed" ? "완료" : "확인 필요"}</td><td>{number(runCounts, "new_entries") || 0}</td></tr>; })}</tbody></table></div>}
      </section>
    </Panel>
  );
}
