import { createHash, randomUUID } from "node:crypto";
import { calculatePayrollEarnings } from "./calculation-engine.js";
import { calculatePayrollDeductions } from "./deduction-engine.js";
import { createPayrollDataHash } from "./repository.js";

const TOKENIZED_REF = /^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/;
const SHA256 = /^[a-f0-9]{64}$/;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, code, status = 400) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function selectPublishedRule(repository, context, period, ruleKind) {
  const rules = repository.listRuleVersions(context, { rule_kind: ruleKind })
    .filter((row) => row.approval_state === "published")
    .filter((row) => row.effective_from <= period.period_end && (!row.effective_to || row.effective_to >= period.period_end));
  if (rules.length !== 1) throw guardedError(`Exactly one published ${ruleKind} rule must cover the payroll period`, "HRX_PAYROLL_RULE_COVERAGE_INVALID", 409);
  return rules[0];
}

function issue(runId, employeeId, source) {
  return {
    issue_code: source.issue_code,
    severity: source.severity ?? "blocker",
    source_ref: `artifact:hrx/payroll-issue/${digest({ runId, employeeId, issue_code: source.issue_code }).slice(0, 24)}`,
    details: clone(source.details ?? {}),
  };
}

function priorResult(repository, context, currentPeriod, employeeId) {
  const periods = new Map(repository.listPeriods(context).map((row) => [row.period_id, row]));
  const candidates = repository.listRuns(context)
    .filter((row) => row.run_type === "regular" && row.status === "closed")
    .filter((row) => periods.get(row.period_id)?.period_end < currentPeriod.period_start)
    .sort((left, right) => periods.get(right.period_id).period_end.localeCompare(periods.get(left.period_id).period_end));
  for (const run of candidates) {
    const result = repository.getRunBundle(context, { run_id: run.run_id }).results.find((row) => row.employee_id === employeeId);
    if (result) return { run, result };
  }
  return null;
}

function varianceIssue(previous, current, policy) {
  if (!previous) return null;
  const grossDelta = current.gross_krw - previous.result.gross_krw;
  const netDelta = current.net_krw - previous.result.net_krw;
  const amount = Math.max(Math.abs(grossDelta), Math.abs(netDelta));
  const base = Math.max(1, Math.abs(previous.result.net_krw));
  const basisPoints = Math.trunc(Math.abs(netDelta) * 10_000 / base);
  if (amount < policy.amount_krw && basisPoints < policy.basis_points) return null;
  return {
    issue_code: "PAYROLL_PRIOR_PERIOD_VARIANCE",
    severity: policy.severity,
    details: { previous_run_id: previous.run.run_id, gross_delta_krw: grossDelta, net_delta_krw: netDelta, variance_basis_points: basisPoints },
  };
}

function resultWithLines(earnings, deductions, issues) {
  const result = {
    input_snapshot_id: earnings.input_snapshot_id,
    employee_id: earnings.employee_id,
    gross_krw: earnings.gross_krw,
    deduction_krw: deductions.deduction_krw,
    net_krw: deductions.net_krw,
    issue_count: issues.length,
    issues,
    line_items: [...earnings.line_items, ...deductions.line_items],
  };
  result.result_hash = digest(result);
  return result;
}

function adjustmentDelta(repository, context, run, snapshot, candidate) {
  const previous = repository.getRunBundle(context, { run_id: run.previous_run_id });
  const previousSnapshot = previous.snapshots.find((row) => row.employee_id === candidate.employee_id);
  const previousResult = previous.results.find((row) => row.employee_id === candidate.employee_id);
  if (!previousSnapshot || !previousResult) throw guardedError("Adjustment source employee result is missing", "HRX_PAYROLL_ADJUSTMENT_SOURCE_INVALID", 409);
  if (previousSnapshot.source_hash !== snapshot.source_hash) throw guardedError("Closed payroll source changed; create a reviewed correction input", "HRX_PAYROLL_ADJUSTMENT_SOURCE_CHANGED", 409);
  const previousLines = previous.line_items.filter((row) => row.result_id === previousResult.result_id);
  const amounts = new Map(previousLines.map((row) => [row.item_code, row.amount_krw]));
  const lines = candidate.line_items
    .map((row) => ({ ...row, amount_krw: row.amount_krw - (amounts.get(row.item_code) ?? 0), formula_code: "ADJUSTMENT_DELTA_V1", metadata: { ...row.metadata, previous_run_id: run.previous_run_id, source_formula_code: row.formula_code } }))
    .filter((row) => row.amount_krw !== 0);
  for (const row of previousLines) {
    if (candidate.line_items.some((item) => item.item_code === row.item_code)) continue;
    lines.push({ item_kind: row.item_kind, item_code: row.item_code, formula_code: "ADJUSTMENT_DELTA_V1", rule_version_id: row.rule_version_id, amount_krw: -row.amount_krw, quantity_minutes: null, metadata: { previous_run_id: run.previous_run_id, source_formula_code: row.formula_code } });
  }
  lines.sort((left, right) => left.item_code.localeCompare(right.item_code));
  const result = {
    input_snapshot_id: candidate.input_snapshot_id,
    employee_id: candidate.employee_id,
    gross_krw: candidate.gross_krw - previousResult.gross_krw,
    deduction_krw: candidate.deduction_krw - previousResult.deduction_krw,
    net_krw: candidate.net_krw - previousResult.net_krw,
    issue_count: candidate.issue_count,
    issues: candidate.issues,
    line_items: lines,
  };
  result.result_hash = digest(result);
  return result;
}

export function createPayrollStepUpReceipt(input = {}) {
  const receipt = {
    receipt_ref: requiredString(input, "receipt_ref"),
    actor_id: requiredString(input, "actor_id"),
    action: requiredString(input, "action"),
    object_id: requiredString(input, "object_id"),
    issued_at: requiredString(input, "issued_at"),
    expires_at: requiredString(input, "expires_at"),
  };
  if (!TOKENIZED_REF.test(receipt.receipt_ref)) throw new TypeError("receipt_ref must be tokenized");
  return Object.freeze({ ...receipt, receipt_hash: digest(receipt) });
}

function verifyStepUp(context, runId, receipt, now) {
  if (!receipt || !SHA256.test(receipt.receipt_hash ?? "") || digest({ receipt_ref: receipt.receipt_ref, actor_id: receipt.actor_id, action: receipt.action, object_id: receipt.object_id, issued_at: receipt.issued_at, expires_at: receipt.expires_at }) !== receipt.receipt_hash) {
    throw guardedError("Step-up receipt is invalid", "HRX_STEP_UP_INVALID", 403);
  }
  if (receipt.actor_id !== context.actor_id || receipt.action !== "payroll.approve" || receipt.object_id !== runId) throw guardedError("Step-up receipt scope is invalid", "HRX_STEP_UP_SCOPE_INVALID", 403);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs) || Date.parse(receipt.issued_at) > nowMs || Date.parse(receipt.expires_at) <= nowMs) throw guardedError("Step-up receipt expired", "HRX_STEP_UP_EXPIRED", 403);
  return receipt;
}

export function createPayrollRunService({
  payrollRepository,
  inputSnapshotService,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
  earningsCalculator = calculatePayrollEarnings,
  deductionCalculator = calculatePayrollDeductions,
  variancePolicy = { amount_krw: 500_000, basis_points: 2_000, severity: "warning" },
} = {}) {
  if (!payrollRepository || typeof payrollRepository.persistRunPreview !== "function") throw new TypeError("payrollRepository is required");
  if (!inputSnapshotService || typeof inputSnapshotService.loadResolved !== "function") throw new TypeError("inputSnapshotService is required");

  function preview(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const run = payrollRepository.getRun(context, { run_id: runId });
    if (!run) throw guardedError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (run.status === "previewed") return payrollRepository.getRunBundle(context, { run_id: runId });
    if (run.status !== "snapshot_ready") throw guardedError("Payroll run is not ready for preview", "HRX_PAYROLL_STATE_INVALID", 409);
    const period = payrollRepository.getPeriod(context, { period_id: run.period_id });
    const earningsRule = selectPublishedRule(payrollRepository, context, period, "payroll_earnings");
    const statutoryRule = selectPublishedRule(payrollRepository, context, period, "payroll_statutory");
    const adjustments = payrollRepository.listAdjustments(context, { run_id: runId });
    if (run.run_type === "adjustment" && adjustments.length === 0) throw guardedError("Adjustment run requires at least one adjustment", "HRX_PAYROLL_ADJUSTMENT_EMPTY", 409);
    const resolvedInputs = inputSnapshotService.loadResolved(context, { run_id: runId });
    const results = resolvedInputs.map((resolved) => {
      const employeeAdjustments = adjustments.filter((row) => row.employee_id === resolved.snapshot.employee_id);
      const earnings = earningsCalculator({ resolved_input: resolved, rule_version: earningsRule, adjustments: employeeAdjustments });
      const deductions = deductionCalculator({
        earnings_result: earnings,
        deduction_input: resolved.input.deductions.input,
        statutory_rule_version: statutoryRule,
        custom_deductions: resolved.input.deductions.custom,
        notice_assessments: resolved.input.deductions.notices,
      });
      const engineIssues = [...earnings.issues, ...deductions.issues];
      const regular = resultWithLines(earnings, deductions, engineIssues.map((row) => issue(runId, earnings.employee_id, row)));
      const variance = run.run_type === "regular" ? varianceIssue(priorResult(payrollRepository, context, period, earnings.employee_id), regular, variancePolicy) : null;
      if (variance) {
        regular.issues.push(issue(runId, earnings.employee_id, variance));
        regular.issue_count = regular.issues.length;
        regular.result_hash = digest({ ...regular, result_hash: undefined });
      }
      return run.run_type === "adjustment" ? adjustmentDelta(payrollRepository, context, run, resolved.snapshot, regular) : regular;
    });
    const resultHash = createPayrollDataHash(results.map((row) => ({ employee_id: row.employee_id, result_hash: row.result_hash })));
    payrollRepository.persistRunPreview(context, { run_id: runId, expected_version: input.expected_version ?? run.state_version, result_hash: resultHash, results: results.map((row) => ({ ...row, result_id: idFactory("payroll_result") })) });
    return payrollRepository.getRunBundle(context, { run_id: runId });
  }

  function approve(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const run = payrollRepository.getRun(context, { run_id: runId });
    if (!run || run.status !== "previewed") throw guardedError("Only previewed payroll can be approved", "HRX_PAYROLL_STATE_INVALID", 409);
    const blockers = payrollRepository.listIssues(context, { run_id: runId, state: "open" }).filter((row) => row.severity === "blocker");
    if (blockers.length) throw guardedError("Open payroll blockers must be resolved", "HRX_PAYROLL_BLOCKERS_OPEN", 409);
    const receipt = verifyStepUp(context, runId, input.step_up_receipt, clock());
    return payrollRepository.transitionRun(context, { run_id: runId, status: "approved", expected_version: input.expected_version ?? run.state_version, step_up_receipt_ref: receipt.receipt_ref, step_up_receipt_hash: receipt.receipt_hash });
  }

  function close(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const run = payrollRepository.getRun(context, { run_id: runId });
    if (!run || run.status !== "approved") throw guardedError("Only approved payroll can be closed", "HRX_PAYROLL_STATE_INVALID", 409);
    const closed = payrollRepository.transitionRun(context, { run_id: runId, status: "closed", expected_version: input.expected_version ?? run.state_version });
    const period = payrollRepository.getPeriod(context, { period_id: run.period_id });
    if (period.status === "open") payrollRepository.transitionPeriod(context, { period_id: period.period_id, status: "closed", expected_version: period.state_version });
    return closed;
  }

  return Object.freeze({ preview, approve, close });
}
