import assert from "node:assert/strict";
import test from "node:test";
import { generateLeaveAccrualBatchPeriods } from "../src/leave/accrual-period-generator.js";

test("LV-BATCH-002 generates one complete calendar month including leap month end", () => {
  const result = generateLeaveAccrualBatchPeriods({ schedule: "monthly_perfect_attendance", start_date: "2024-02-01", end_date: "2024-02-29" });
  assert.equal(result.period_count, 1);
  assert.deepEqual(result.periods[0], { period_key: "2024-02", period_start: "2024-02-01", period_end: "2024-02-29", occurred_on: "2024-02-29" });
});

test("LV-BATCH-002 generates one fiscal year from its configured anchor", () => {
  const result = generateLeaveAccrualBatchPeriods({ schedule: "fiscal_year", fiscal_year_start: "04-01", start_date: "2026-04-01", end_date: "2027-03-31" });
  assert.equal(result.period_count, 1);
  assert.deepEqual(result.periods[0], { period_key: "fiscal_year:2026-04-01", period_start: "2026-04-01", period_end: "2027-03-31", occurred_on: "2026-04-01" });
});

test("LV-BATCH-002 generates exactly ten hire-anniversary years and restores leap-day anchors", () => {
  const result = generateLeaveAccrualBatchPeriods({ schedule: "hire_anniversary", anchor_date: "2020-02-29", start_date: "2020-02-29", end_date: "2030-02-27" });
  assert.equal(result.period_count, 10);
  assert.deepEqual(result.periods.slice(0, 5).map((period) => [period.period_start, period.period_end]), [
    ["2020-02-29", "2021-02-27"],
    ["2021-02-28", "2022-02-27"],
    ["2022-02-28", "2023-02-27"],
    ["2023-02-28", "2024-02-28"],
    ["2024-02-29", "2025-02-27"],
  ]);
  assert.deepEqual(result.periods.at(-1), { period_key: "hire_anniversary:2029-02-28", period_start: "2029-02-28", period_end: "2030-02-27", occurred_on: "2029-02-28" });
});

test("LV-BATCH-002 rejects a range longer than ten years", () => {
  assert.throws(
    () => generateLeaveAccrualBatchPeriods({ schedule: "fiscal_year", fiscal_year_start: "01-01", start_date: "2020-01-01", end_date: "2030-01-01" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_LIMIT_EXCEEDED",
  );
});

test("LV-BATCH-002 rejects partial, invalid, and unanchored periods", () => {
  assert.throws(
    () => generateLeaveAccrualBatchPeriods({ schedule: "monthly_perfect_attendance", start_date: "2026-01-02", end_date: "2026-01-31" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID",
  );
  assert.throws(
    () => generateLeaveAccrualBatchPeriods({ schedule: "fiscal_year", fiscal_year_start: "04-01", start_date: "2026-01-01", end_date: "2026-12-31" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID",
  );
  assert.throws(() => generateLeaveAccrualBatchPeriods({ schedule: "fiscal_year", fiscal_year_start: "02-30", start_date: "2026-02-28", end_date: "2027-02-27" }), /must be an ISO date/);
  assert.throws(() => generateLeaveAccrualBatchPeriods({ schedule: "monthly_perfect_attendance", start_date: "2026-02-30", end_date: "2026-03-31" }), /must be an ISO date/);
});
