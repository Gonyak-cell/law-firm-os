import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLeaveAccrualBatchRepository } from "../src/leave/accrual-batch-repository.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-accrual-batch";
const NOW = "2026-07-14T06:00:00.000Z";
const CONTEXT = Object.freeze({ tenant_id: TENANT, actor_id: "hr-operator" });

function seedRule(store, tenantId = TENANT) {
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: tenantId, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: tenantId, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_leave_accrual_rules", row: { tenant_id: tenantId, accrual_rule_id: "rule-annual", rule_code: "ANNUAL-RULE", display_name: "연차 자동발생", policy_version_id: "annual-v1", rule_json: "{}", status: "active", effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
}

function periods() {
  return [
    { period_key: "2026-01", period_start: "2026-01-01", period_end: "2026-01-31", occurred_on: "2026-01-31" },
    { period_key: "2026-02", period_start: "2026-02-01", period_end: "2026-02-28", occurred_on: "2026-02-28" },
  ];
}

function repository(store) {
  let sequence = 0;
  return createLeaveAccrualBatchRepository({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` });
}

test("LV-BATCH-001 persists a parent batch and ordered periods across a durable reopen", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "hrx-accrual-batch-")), "hrx-store.json");
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  seedRule(store);
  const batches = repository(store);
  const created = batches.create(CONTEXT, {
    accrual_batch_id: "batch-preview-001",
    accrual_rule_id: "rule-annual",
    mode: "preview",
    idempotency_key: "batch-preview:rule-annual:2026-01:2026-02",
    periods: periods(),
  });
  assert.equal(created.status, "pending");
  assert.equal(created.period_count, 2);
  assert.deepEqual(created.periods.map((period) => [period.period_index, period.period_key, period.status]), [[0, "2026-01", "pending"], [1, "2026-02", "pending"]]);
  assert.equal(batches.create(CONTEXT, {
    accrual_batch_id: "ignored-on-replay",
    accrual_rule_id: "rule-annual",
    mode: "preview",
    idempotency_key: "batch-preview:rule-annual:2026-01:2026-02",
    periods: periods(),
  }).accrual_batch_id, "batch-preview-001");
  assert.throws(
    () => batches.create(CONTEXT, {
      accrual_rule_id: "rule-annual",
      mode: "preview",
      idempotency_key: "batch-preview:rule-annual:2026-01:2026-02",
      periods: [periods()[0]],
    }),
    (error) => error.safe_error_code === "HRX_IDEMPOTENCY_CONFLICT",
  );
  store.close();

  const reopened = createFileHrxStore({ filePath });
  const durable = repository(reopened).get(CONTEXT, { accrual_batch_id: "batch-preview-001" });
  assert.equal(durable.input_hash, created.input_hash);
  assert.deepEqual(durable.periods.map((period) => period.period_key), ["2026-01", "2026-02"]);
  assert.equal(repository(reopened).get({ ...CONTEXT, tenant_id: "tenant-other" }, { accrual_batch_id: "batch-preview-001" }), undefined);
  reopened.close();
});

test("LV-BATCH-001 attaches an existing child run and derives terminal batch hashes under CAS", () => {
  const store = createFileHrxStore();
  seedRule(store);
  const batches = repository(store);
  let batch = batches.create(CONTEXT, {
    accrual_batch_id: "batch-preview-attach",
    accrual_rule_id: "rule-annual",
    mode: "preview",
    idempotency_key: "batch-preview:attach",
    periods: [periods()[0]],
  });
  batch = batches.markRunning(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, expected_version: 1 });
  assert.equal(batch.state_version, 2);
  const period = batch.periods[0];
  batch = batches.markPeriodRunning(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, batch_period_id: period.batch_period_id, expected_version: 1 });
  assert.equal(batch.periods[0].attempt_count, 1);
  store.query("insert", {
    table: "hrx_leave_accrual_runs",
    row: {
      tenant_id: TENANT,
      accrual_run_id: "child-preview-001",
      accrual_rule_id: "rule-annual",
      mode: "preview",
      period_key: "2026-01",
      occurred_on: "2026-01-31",
      source_version: "source-v1",
      input_hash: "input-hash",
      snapshot_hash: "snapshot-hash",
      preview_run_id: null,
      idempotency_key: "child-preview:2026-01",
      status: "completed",
      result_json: "{}",
      executed_by: "hr-operator",
      created_at: NOW,
      completed_at: NOW,
    },
  });
  batch = batches.completePeriod(CONTEXT, {
    accrual_batch_id: batch.accrual_batch_id,
    batch_period_id: period.batch_period_id,
    expected_version: 2,
    accrual_run_id: "child-preview-001",
    status: "completed",
  });
  assert.deepEqual([batch.periods[0].accrual_run_id, batch.periods[0].source_version, batch.periods[0].snapshot_hash], ["child-preview-001", "source-v1", "snapshot-hash"]);
  assert.throws(
    () => batches.fail(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, expected_version: 1, error_code: "SYNTHETIC" }),
    (error) => error.safe_error_code === "HRX_STATE_VERSION_CONFLICT",
  );
  batch = batches.complete(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, expected_version: 2, status: "completed" });
  assert.equal(batch.status, "completed");
  assert.match(batch.source_version, /^[a-f0-9]{64}$/);
  assert.match(batch.snapshot_hash, /^[a-f0-9]{64}$/);
  assert.equal(batch.completed_at, NOW);

  const execute = batches.create(CONTEXT, {
    accrual_batch_id: "batch-execute-attach",
    accrual_rule_id: "rule-annual",
    mode: "execute",
    preview_batch_id: batch.accrual_batch_id,
    idempotency_key: "batch-execute:attach",
  });
  assert.equal(execute.preview_batch_id, batch.accrual_batch_id);
  assert.deepEqual(execute.periods.map((row) => row.period_key), ["2026-01"]);
  store.close();
});

test("LV-BATCH-001 rejects overlapping periods and child runs from another mode", () => {
  const store = createFileHrxStore();
  seedRule(store);
  const batches = repository(store);
  assert.throws(
    () => batches.create(CONTEXT, {
      accrual_rule_id: "rule-annual",
      mode: "preview",
      idempotency_key: "batch-overlap",
      periods: [periods()[0], { period_key: "overlap", period_start: "2026-01-31", period_end: "2026-02-28", occurred_on: "2026-02-28" }],
    }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_OVERLAP",
  );
  let batch = batches.create(CONTEXT, {
    accrual_rule_id: "rule-annual",
    mode: "preview",
    idempotency_key: "batch-mode-mismatch",
    periods: [periods()[0]],
  });
  batch = batches.markRunning(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, expected_version: 1 });
  batch = batches.markPeriodRunning(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, batch_period_id: batch.periods[0].batch_period_id, expected_version: 1 });
  store.query("insert", { table: "hrx_leave_accrual_runs", row: { tenant_id: TENANT, accrual_run_id: "child-execute-wrong-mode", accrual_rule_id: "rule-annual", mode: "execute", period_key: "2026-01", occurred_on: "2026-01-31", source_version: "source-v1", input_hash: "input", snapshot_hash: "snapshot", preview_run_id: "preview-any", idempotency_key: "execute-wrong-mode", status: "completed", result_json: "{}", executed_by: "hr-operator", created_at: NOW, completed_at: NOW } });
  assert.throws(
    () => batches.completePeriod(CONTEXT, { accrual_batch_id: batch.accrual_batch_id, batch_period_id: batch.periods[0].batch_period_id, expected_version: 2, accrual_run_id: "child-execute-wrong-mode", status: "completed" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_CHILD_RUN_INVALID",
  );
  store.close();
});
