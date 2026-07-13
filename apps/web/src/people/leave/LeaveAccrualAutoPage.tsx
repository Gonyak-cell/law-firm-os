import React, { useEffect, useState } from "react";
import { CalendarClock, Play, Plus, RefreshCw } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  createHrxLeaveAccrualRule,
  executeHrxLeaveAccrual,
  fetchHrxLeaveAccrualRules,
  fetchHrxLeaveAccrualRuns,
  fetchHrxLeaveConfiguration,
  previewHrxLeaveAccrual
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

function statusLabel(status: string) {
  return ({ ready: "발생 예정", created: "발생 완료", duplicate: "기발생", skipped: "제외", error: "확인 필요" } as Record<string, string>)[status] ?? status;
}

function reasonLabel(reason: string) {
  return ({ eligible: "대상", accrued: "원장 반영", already_accrued: "동일 기간 반영됨", employee_inactive: "재직 대상 아님", leave_of_absence: "휴직", outside_accrual_schedule: "발생일 아님", no_entitlement_for_period: "발생량 없음", employment_profile_missing: "재직 정보 없음", work_schedule_missing: "근무일정 없음", attendance_source_missing: "근태 원천 없음", work_schedule_ratio_invalid: "근로시간 비율 확인" } as Record<string, string>)[reason] ?? reason;
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

export function LeaveAccrualAutoPage() {
  const [rules, setRules] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<Row[]>([]);
  const [runs, setRuns] = useState<Row[]>([]);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [selectedRule, setSelectedRule] = useState("");
  const [occurredOn, setOccurredOn] = useState(localDate());
  const [periodKey, setPeriodKey] = useState(String(new Date().getFullYear()));
  const [previewRun, setPreviewRun] = useState<Row | null>(null);
  const [executionRun, setExecutionRun] = useState<Row | null>(null);
  const [stepUpRequired, setStepUpRequired] = useState(false);
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
    setSelectedRule((current) => current || text(ruleResult.rules[0] as Row, "accrual_rule_id"));
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
    setStepUpRequired(false);
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
      setStepUpRequired(true);
      return;
    }
    if (result.kind !== "data") {
      setError(typeof result.reason === "string" ? result.reason : "자동 발생을 실행하지 못했습니다.");
      return;
    }
    setStepUpRequired(false);
    setExecutionRun(result.run as Row);
    await load();
  }

  const visibleRun = executionRun ?? previewRun;
  const result = visibleRun?.result as Row | undefined;
  const rows = Array.isArray(result?.rows) ? result.rows as Row[] : [];
  const counts = result?.counts as Row | undefined;

  return (
    <Panel id="people-leave-accrual-auto" className="people-panel span-2 leave-accrual-panel" title="휴가 자동 발생" meta="HR 전용">
      <div className="people-panel-kicker"><CalendarClock size={15} />입사·근태·근무일정 원천을 기준으로 미리보기 후 발생합니다</div>
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}

      <section className="leave-accrual-section" aria-labelledby="leave-accrual-rule-heading">
        <div className="leave-accrual-section-head"><div><h3 id="leave-accrual-rule-heading">발생 규칙</h3><p>시행 중인 휴가 정책에 발생 기준과 주기를 연결합니다.</p></div><span>{rules.length}개</span></div>
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
        <div className="leave-accrual-section-head"><div><h3 id="leave-accrual-run-heading">미리보기와 실행</h3><p>미리보기 이후 원천 버전이 바뀌면 실행을 차단합니다.</p></div></div>
        <div className="leave-accrual-runbar">
          <label><span>발생 규칙</span><select aria-label="발생 규칙" value={selectedRule} onChange={(event) => { setSelectedRule(event.target.value); setPreviewRun(null); setExecutionRun(null); }}><option value="">규칙 선택</option>{rules.map((rule) => <option key={text(rule, "accrual_rule_id")} value={text(rule, "accrual_rule_id")}>{text(rule, "display_name")}</option>)}</select></label>
          <label><span>기간 키</span><input aria-label="기간 키" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} /></label>
          <label><span>발생일</span><input aria-label="발생일" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
          <button className="secondary-button" type="button" disabled={!selectedRule || busy === "preview"} onClick={() => void preview()}><RefreshCw size={14} />미리보기</button>
          <button className="primary-button" type="button" disabled={!previewRun || busy === "execute"} onClick={() => void execute()}><Play size={14} />원장에 반영</button>
        </div>
        {stepUpRequired && <HrxStepUpChallenge purpose="leave_accrual_execute" onVerified={() => void execute()} />}
        {visibleRun && (
          <>
            <div className="leave-accrual-summary" data-leave-accrual-run={text(visibleRun, "mode")}>
              <span>스냅샷 <strong>{text(visibleRun, "snapshot_hash").slice(0, 12)}</strong></span>
              <span>신규 <strong>{number(counts, "new_entries") || number(counts, "ready")}</strong></span>
              <span>중복 <strong>{number(counts, "duplicates")}</strong></span>
              <span>확인 필요 <strong>{number(counts, "errors")}</strong></span>
            </div>
            <div className="data-table-wrap"><table className="data-table"><thead><tr><th>구성원</th><th>결과</th><th>발생량</th><th>근거</th><th>유효기간</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${text(row, "employee_id")}:${index}`}><td><strong>{text(row, "display_name")}</strong><small className="leave-settings-code">{text(row, "employee_id")}</small></td><td><span className={`record-state-badge ${text(row, "status")}`}>{statusLabel(text(row, "status"))}</span></td><td>{number(row, "amount_minutes").toLocaleString("ko-KR")}분</td><td>{reasonLabel(text(row, "reason_code"))}</td><td>{text(row, "valid_from") || "-"} ~ {text(row, "expires_on") || "-"}</td></tr>)}</tbody></table></div>
          </>
        )}
        {!visibleRun && <div className="live-data-state live-data-empty">규칙과 기간을 선택한 뒤 미리보기를 실행하세요.</div>}
      </section>

      <section className="leave-accrual-section" aria-labelledby="leave-accrual-history-heading">
        <div className="leave-accrual-section-head"><div><h3 id="leave-accrual-history-heading">최근 실행</h3><p>미리보기와 실행 이력을 구분해 확인합니다.</p></div><span>{runs.length}건</span></div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>생성 시각</th><th>구분</th><th>기간</th><th>상태</th><th>신규</th></tr></thead><tbody>{runs.slice(0, 10).map((run) => { const runResult = run.result as Row | undefined; const runCounts = runResult?.counts as Row | undefined; return <tr key={text(run, "accrual_run_id")}><td>{text(run, "created_at").replace("T", " ").slice(0, 16)}</td><td>{text(run, "mode") === "execute" ? "실행" : "미리보기"}</td><td>{text(run, "period_key")}</td><td>{text(run, "status") === "completed" ? "완료" : "확인 필요"}</td><td>{number(runCounts, "new_entries") || 0}</td></tr>; })}</tbody></table></div>
      </section>
    </Panel>
  );
}
