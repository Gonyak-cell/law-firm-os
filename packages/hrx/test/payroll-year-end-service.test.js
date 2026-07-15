import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollDataHash, createPayrollRepository } from "../src/payroll/repository.js";
import { createPayrollYearEndService } from "../src/payroll/year-end-service.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-year-end";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const REVIEWER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-reviewer" });
const NOW = "2026-07-15T08:00:00.000Z";
const HASH = "a".repeat(64);

function runtime(filePath) {
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const repository = createPayrollRepository({ store, clock: () => NOW });
  const hr = createSqlHrxRepository({ store, clock: () => NOW });
  if (!store.query("selectOne", { table: "hrx_employees", where: { tenant_id: TENANT, employee_id: "emp-001" } })) {
    for (const employee_id of ["emp-001", "emp-002"]) hr.createEmployee({ tenant_id: TENANT, employee_id, display_name: employee_id, status: "active" });
    let period = repository.createPeriod(PREPARER, { period_id: "period-year-end", period_code: "2026-12", period_start: "2026-12-01", period_end: "2026-12-31", cutoff_at: NOW, pay_date: "2027-01-05" });
    period = repository.transitionPeriod(PREPARER, { period_id: period.period_id, status: "open", expected_version: period.state_version });
    let run = repository.createRun(PREPARER, { run_id: "run-year-end", period_id: period.period_id });
    for (const [index, employeeId] of ["emp-001", "emp-002"].entries()) {
      const snapshot = repository.createInputSnapshot(PREPARER, { snapshot_id: `snapshot-year-end-${index}`, run_id: run.run_id, employee_id: employeeId, source_refs: [{ kind: "attendance", ref: `artifact:attendance/${employeeId}`, hash: HASH }] });
      const gross = 48_000_000 + index * 12_000_000;
      const withheld = 2_200_000 + index * 600_000;
      const result = repository.createEmployeeResult(PREPARER, { result_id: `result-year-end-${index}`, run_id: run.run_id, employee_id: employeeId, input_snapshot_id: snapshot.snapshot_id, gross_krw: gross, deduction_krw: withheld, net_krw: gross - withheld });
      repository.addLineItem(PREPARER, { result_id: result.result_id, item_kind: "deduction", item_code: "INCOME_TAX", formula_code: "SYNTHETIC_V1", amount_krw: withheld });
    }
    run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "snapshot_ready", snapshot_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).snapshots), expected_version: run.state_version });
    run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "previewed", result_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).results), expected_version: run.state_version });
    run = repository.transitionRun(REVIEWER, { run_id: run.run_id, status: "approved", expected_version: run.state_version, step_up_receipt_ref: "artifact:step-up/year-end-run", step_up_receipt_hash: HASH });
    repository.transitionRun(REVIEWER, { run_id: run.run_id, status: "closed", expected_version: run.state_version });
  }
  return { store, repository, service: createPayrollYearEndService({ repository }) };
}

test("PY-TAX-006 persists collection, calculation, four-eye review, and immutable result snapshots", () => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-year-end-"));
  const filePath = join(directory, "hrx.json");
  try {
    let { store, repository, service } = runtime(filePath);
    assert.equal(service.collectRun(PREPARER, { run_id: "run-year-end", records: [{ employee_id: "emp-001", determined_tax_krw: 2_000_000 }, { employee_id: "emp-002", collection_complete: false }] }).state, "collecting");
    assert.throws(() => service.calculateRun(PREPARER, { run_id: "run-year-end" }), (error) => error.safe_error_code === "HRX_PAYROLL_YEAR_END_COLLECTION_INCOMPLETE");
    assert.equal(service.collectRun(PREPARER, { run_id: "run-year-end", records: [{ employee_id: "emp-001", determined_tax_krw: 2_000_000 }, { employee_id: "emp-002", determined_tax_krw: 2_500_000 }] }).state, "draft");
    assert.equal(service.calculateRun(PREPARER, { run_id: "run-year-end" }).state, "calculated");
    assert.throws(() => service.reviewRun(PREPARER, { run_id: "run-year-end", review_receipt_ref: "document:tax-review/2026" }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
    const reviewed = service.reviewRun(REVIEWER, { run_id: "run-year-end", review_receipt_ref: "document:tax-review/2026" });
    assert.deepEqual([reviewed.state, reviewed.case_count, reviewed.settlement_krw], ["reviewed", 2, 500_000]);
    const cases = repository.listYearEndCases(REVIEWER, { run_id: "run-year-end" });
    assert.ok(cases.every((item) => item.state === "reviewed" && JSON.parse(item.result_json).manual_review_required === false));
    assert.throws(() => repository.updateYearEndCaseInputs(PREPARER, { year_end_case_id: cases[0].year_end_case_id, expected_version: cases[0].state_version, input_hash: HASH }), /immutable/);
    store.close();

    ({ store, service } = runtime(filePath));
    assert.deepEqual(service.summary(REVIEWER, { run_id: "run-year-end" }), reviewed);
    assert.equal(service.filingRecords(REVIEWER, { run_id: "run-year-end" }).length, 2);
    store.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("PY-TAX-006 fails closed for unreviewed year-end filing records and tenant access", () => {
  const { store, service } = runtime();
  assert.throws(() => service.filingRecords(PREPARER, { run_id: "run-year-end" }), (error) => error.safe_error_code === "HRX_PAYROLL_YEAR_END_REVIEW_REQUIRED");
  assert.throws(() => service.collectRun({ tenant_id: "other-tenant", actor_id: "other" }, { run_id: "run-year-end" }), (error) => error.safe_error_code === "HRX_PAYROLL_NOT_FOUND");
  store.close();
});
