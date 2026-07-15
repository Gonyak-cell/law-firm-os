import assert from "node:assert/strict";
import test from "node:test";
import { createPayrollParallelComparisonService } from "../src/payroll/parallel-comparison-service.js";

const CONTEXT = Object.freeze({ tenant_id: "tenant-parallel", actor_id: "payroll-auditor" });

function service(status = "closed") {
  const bundles = {
    "run-2026-06": { run: { run_id: "run-2026-06", status, result_hash: "baseline" }, results: [{ employee_id: "emp-001", gross_krw: 5_000_000, deduction_krw: 500_000, net_krw: 4_500_000 }, { employee_id: "emp-002", gross_krw: 4_000_000, deduction_krw: 400_000, net_krw: 3_600_000 }] },
    "run-2026-07": { run: { run_id: "run-2026-07", status: "closed", result_hash: "candidate" }, results: [{ employee_id: "emp-001", gross_krw: 5_000_000, deduction_krw: 500_000, net_krw: 4_500_000 }, { employee_id: "emp-002", gross_krw: 4_100_000, deduction_krw: 410_000, net_krw: 3_690_000 }] },
  };
  return createPayrollParallelComparisonService({ repository: { getRunBundle(_context, input) { return bundles[input.run_id]; } }, clock: () => "2026-07-15T13:00:00.000Z" });
}

test("PY-QA-002 compares two closed payroll periods and isolates unexplained employee variance", () => {
  const comparison = service().compare(CONTEXT, { baseline_run_id: "run-2026-06", candidate_run_id: "run-2026-07" });
  assert.deepEqual([comparison.employee_count, comparison.matched_count, comparison.unexplained_employee_count], [2, 1, 1]);
  assert.equal(comparison.unexplained_absolute_net_krw, 90_000);
  assert.equal(comparison.rows.find((row) => row.employee_id === "emp-002").state, "unexplained_variance");
  assert.equal(comparison.production_ready_claim, false);
});

test("PY-QA-002 accepts only reviewed tokenized adjudications and reaches unexplained variance zero", () => {
  const input = { baseline_run_id: "run-2026-06", candidate_run_id: "run-2026-07", adjudications: [{ employee_id: "emp-002", reason_code: "APPROVED_COMPENSATION_CHANGE", review_ref: "document:payroll-variance/review-001" }] };
  const first = service().compare(CONTEXT, input);
  const second = service().compare(CONTEXT, input);
  assert.equal(first.unexplained_employee_count, 0);
  assert.equal(first.adjudicated_count, 1);
  assert.equal(first.comparison_hash, second.comparison_hash);
  assert.throws(() => service().compare(CONTEXT, { ...input, adjudications: [{ ...input.adjudications[0], review_ref: "raw-review" }] }), /tokenized/);
  assert.throws(() => service("previewed").compare(CONTEXT, input), (error) => error.safe_error_code === "HRX_PAYROLL_RUN_NOT_CLOSED");
});
