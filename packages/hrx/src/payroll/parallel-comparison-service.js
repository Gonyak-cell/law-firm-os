import { createHash } from "node:crypto";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, code) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = 409;
  return error;
}

export function createPayrollParallelComparisonService({ repository, clock = () => new Date().toISOString() } = {}) {
  if (!repository?.getRunBundle) throw new TypeError("payroll parallel comparison requires repository");

  function compare(context = {}, input = {}) {
    requiredString(context, "tenant_id");
    requiredString(context, "actor_id");
    const baselineRunId = requiredString(input, "baseline_run_id");
    const candidateRunId = requiredString(input, "candidate_run_id");
    if (baselineRunId === candidateRunId) throw new TypeError("parallel comparison requires two different payroll runs");
    const baseline = repository.getRunBundle(context, { run_id: baselineRunId });
    const candidate = repository.getRunBundle(context, { run_id: candidateRunId });
    if (!baseline || !candidate) throw guardedError("payroll run not found", "HRX_PAYROLL_NOT_FOUND");
    if (baseline.run.status !== "closed" || candidate.run.status !== "closed") throw guardedError("parallel comparison requires closed payroll runs", "HRX_PAYROLL_RUN_NOT_CLOSED");
    const adjudications = new Map((input.adjudications ?? []).map((row) => [requiredString(row, "employee_id"), row]));
    const baselineResults = new Map(baseline.results.map((row) => [row.employee_id, row]));
    const candidateResults = new Map(candidate.results.map((row) => [row.employee_id, row]));
    const employeeIds = [...new Set([...baselineResults.keys(), ...candidateResults.keys()])].sort();
    const rows = employeeIds.map((employeeId) => {
      const left = baselineResults.get(employeeId) ?? {};
      const right = candidateResults.get(employeeId) ?? {};
      const variance = Object.freeze({
        gross_krw: (right.gross_krw ?? 0) - (left.gross_krw ?? 0),
        deduction_krw: (right.deduction_krw ?? 0) - (left.deduction_krw ?? 0),
        net_krw: (right.net_krw ?? 0) - (left.net_krw ?? 0),
      });
      const matches = Object.values(variance).every((value) => value === 0);
      const adjudication = adjudications.get(employeeId);
      if (adjudication && !/^(?:artifact|document|provider|token|vault):[^\s@]+$/.test(requiredString(adjudication, "review_ref"))) throw new TypeError("parallel comparison review_ref must be tokenized");
      return Object.freeze({
        employee_id: employeeId,
        baseline_result_hash: hash(left),
        candidate_result_hash: hash(right),
        variance,
        state: matches ? "matched" : adjudication ? "adjudicated" : "unexplained_variance",
        reason_code: adjudication ? requiredString(adjudication, "reason_code") : null,
        review_ref: adjudication?.review_ref ?? null,
      });
    });
    const unexplained = rows.filter((row) => row.state === "unexplained_variance");
    const receipt = Object.freeze({
      schema_version: "law-firm-os.hrx.payroll-parallel-comparison.v0.1",
      tenant_id: context.tenant_id,
      baseline_run_id: baselineRunId,
      candidate_run_id: candidateRunId,
      employee_count: rows.length,
      matched_count: rows.filter((row) => row.state === "matched").length,
      adjudicated_count: rows.filter((row) => row.state === "adjudicated").length,
      unexplained_employee_count: unexplained.length,
      unexplained_absolute_net_krw: unexplained.reduce((sum, row) => sum + Math.abs(row.variance.net_krw), 0),
      rows: Object.freeze(rows),
      compared_at: clock(),
      production_ready_claim: false,
    });
    return Object.freeze({ ...receipt, comparison_hash: hash(receipt) });
  }

  return Object.freeze({ compare });
}
