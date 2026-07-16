import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import {
  createLeaveLedgerReconciliationService,
  createLeaveRuleSnapshotBackfillService,
  LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_SCHEMA_VERSION,
} from "../src/leave/migration-reconciliation-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-leave-migration-synthetic";
const NOW = "2026-07-15T02:00:00.000Z";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function durableStore(name) {
  const filePath = join(mkdtempSync(join(tmpdir(), `${name}-`)), "hrx-store.json");
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  return { filePath, store };
}

function seedReferenceRows(store, tenantId = TENANT) {
  for (const employeeId of ["emp-001", "emp-002", "emp-003"]) {
    store.query("insert", { table: "hrx_employees", row: { tenant_id: tenantId, employee_id: employeeId, display_name: `합성-${employeeId}`, status: "active" } });
  }
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: tenantId, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: {
      tenant_id: tenantId,
      policy_version_id: "annual-v1",
      group_id: "annual",
      policy_code: "ANNUAL-2026",
      version: 1,
      effective_from: "2026-01-01",
      effective_to: null,
      status: "active",
      rules_json: JSON.stringify({ reserve_on_submit: true, type_rules: { "annual-full": { paid_ratio_bps: 10_000 } } }),
    },
  });
  store.query("insert", {
    table: "hrx_work_schedule_profiles",
    row: {
      tenant_id: tenantId,
      schedule_profile_id: "fixed-40h",
      display_name: "고정 근무",
      timezone: "Asia/Seoul",
      weekly_schedule_json: "{}",
      effective_from: "2026-01-01",
      effective_to: null,
      state_version: 1,
    },
  });
}

function seedBackfillRows(store) {
  seedReferenceRows(store);
  const preservedHash = "a".repeat(64);
  store.query("insert", {
    table: "hrx_leave_entitlements",
    row: {
      tenant_id: TENANT,
      entitlement_id: "ent-backfill",
      employee_id: "emp-001",
      group_id: "annual",
      policy_version_id: "annual-v1",
      granted_minutes: 480,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "LeaveAccrualRun:owner-import-001",
      idempotency_key: "entitlement:owner-import-001",
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_leave_entitlements",
    row: {
      tenant_id: TENANT,
      entitlement_id: "ent-preserved",
      employee_id: "emp-002",
      group_id: "annual",
      policy_version_id: "annual-v1",
      policy_rules_snapshot_hash: preservedHash,
      granted_minutes: 480,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "LeaveAccrualRun:already-snapshotted",
      idempotency_key: "entitlement:already-snapshotted",
      state_version: 1,
    },
  });
  store.transaction((tx) => {
    tx.query("insert", {
      table: "hrx_leave_requests",
      row: {
        tenant_id: TENANT,
        request_id: "req-backfill",
        employee_id: "emp-001",
        policy_id: "ANNUAL-2026",
        policy_version_id: "annual-v1",
        leave_type: "ANNUAL_FULL",
        leave_type_id: "annual-full",
        amount: 8,
        requested_minutes: 480,
        duration_mode: "full_day",
        rounded_requested_minutes: 480,
        paid_minutes: 480,
        unpaid_minutes: 0,
        deduction_minutes: 480,
        start_date: "2026-07-20",
        end_date: "2026-07-20",
        timezone: "Asia/Seoul",
        schedule_snapshot_hash: "schedule-v1",
        state: "cancelled",
        state_version: 1,
        submitted_at: NOW,
        source_ref: "LeaveRequest:owner-import-001",
        created_at: NOW,
        updated_at: NOW,
      },
    });
    tx.query("insert", {
      table: "hrx_leave_request_segments",
      row: {
        tenant_id: TENANT,
        segment_id: "segment-backfill",
        request_id: "req-backfill",
        segment_date: "2026-07-20",
        scheduled_minutes: 480,
        requested_minutes: 480,
        paid_minutes: 480,
        deduction_minutes: 480,
        timezone: "Asia/Seoul",
        schedule_profile_id: "fixed-40h",
        schedule_snapshot_hash: "schedule-v1",
        work_periods_json: "[]",
        leave_periods_json: "[]",
        created_at: NOW,
      },
    });
  });
  return { preservedHash };
}

function approval(preview) {
  return {
    schema_version: LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_SCHEMA_VERSION,
    tenant_id: TENANT,
    preview_hash: preview.preview_hash,
    decision: "approved",
    approved_by_actor_id: "owner-001",
    approved_at: NOW,
  };
}

test("LV-MIG-001 previews count/hash without raw source refs and blocks unapproved writes", () => {
  const { store } = durableStore("leave-rule-preview");
  seedBackfillRows(store);
  const service = createLeaveRuleSnapshotBackfillService({ store, clock: () => NOW });
  const preview = service.preview({ tenant_id: TENANT });
  assert.deepEqual(
    {
      actions: preview.action_count,
      entitlements: preview.entitlement_action_count,
      requests: preview.request_action_count,
      segments: preview.segment_action_count,
      preserved: preview.preserved_count,
      errors: preview.error_count,
    },
    { actions: 2, entitlements: 1, requests: 1, segments: 1, preserved: 1, errors: 0 },
  );
  assert.match(preview.preview_hash, /^sha256:[a-f0-9]{64}$/);
  assert.match(preview.immutable_source_refs_hash, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(preview), /owner-import-001/);
  assert.throws(
    () => service.execute({ tenant_id: TENANT }, { approval_manifest: { ...approval(preview), preview_hash: "sha256:wrong" } }),
    (error) => error.safe_error_code === "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_REQUIRED",
  );
  assert.equal(store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-backfill" } }).policy_rules_snapshot_hash, undefined);
  assert.equal(store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "req-backfill" } }).policy_rules_snapshot_hash, undefined);
  store.close();
});

test("LV-MIG-001 executes an approved durable backfill, preserves source refs, and reruns with zero actions", () => {
  const { filePath, store } = durableStore("leave-rule-execute");
  const { preservedHash } = seedBackfillRows(store);
  const service = createLeaveRuleSnapshotBackfillService({ store, clock: () => NOW });
  const preview = service.preview({ tenant_id: TENANT });
  const beforeRefs = {
    entitlement: store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-backfill" } }).source_ref,
    request: store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "req-backfill" } }).source_ref,
  };
  const result = service.execute({ tenant_id: TENANT }, { approval_manifest: approval(preview) });
  assert.deepEqual(
    { updated: result.updated_count, entitlements: result.entitlement_count, requests: result.request_count, segments: result.segment_count },
    { updated: 2, entitlements: 1, requests: 1, segments: 1 },
  );
  assert.equal(result.immutable_source_refs_hash, preview.immutable_source_refs_hash);
  const expectedHash = sha256(JSON.parse(store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: TENANT, policy_version_id: "annual-v1" } }).rules_json));
  const entitlement = store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-backfill" } });
  const request = store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "req-backfill" } });
  const segment = store.query("selectOne", { table: "hrx_leave_request_segments", where: { tenant_id: TENANT, segment_id: "segment-backfill" } });
  assert.equal(entitlement.policy_rules_snapshot_hash, expectedHash);
  assert.equal(request.policy_rules_snapshot_hash, expectedHash);
  assert.equal(segment.policy_rules_snapshot_hash, expectedHash);
  assert.deepEqual({ entitlement: entitlement.source_ref, request: request.source_ref }, beforeRefs);
  assert.equal(store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-preserved" } }).policy_rules_snapshot_hash, preservedHash);
  assert.equal(service.preview({ tenant_id: TENANT }).action_count, 0);
  store.close();

  const reopened = createFileHrxStore({ filePath });
  assert.equal(reopened.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: "ent-backfill" } }).policy_rules_snapshot_hash, expectedHash);
  assert.equal(reopened.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "req-backfill" } }).policy_rules_snapshot_hash, expectedHash);
  assert.equal(createLeaveRuleSnapshotBackfillService({ store: reopened }).preview({ tenant_id: TENANT }).action_count, 0);
  reopened.close();
});

test("LV-MIG-001 invalidates approval after an owner source change and blocks unresolved policies", () => {
  const { store } = durableStore("leave-rule-stale");
  seedBackfillRows(store);
  const service = createLeaveRuleSnapshotBackfillService({ store, clock: () => NOW });
  const preview = service.preview({ tenant_id: TENANT });
  store.query("updateOne", {
    table: "hrx_leave_entitlements",
    where: { tenant_id: TENANT, entitlement_id: "ent-backfill" },
    expected_version: 1,
    patch: { source_ref: "LeaveAccrualRun:owner-corrected", state_version: 2 },
  });
  assert.throws(
    () => service.execute({ tenant_id: TENANT }, { approval_manifest: approval(preview) }),
    (error) => error.safe_error_code === "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_REQUIRED",
  );
  store.query("deleteOne", { table: "hrx_leave_policy_versions", where: { tenant_id: TENANT, policy_version_id: "annual-v1" } });
  const unresolved = service.preview({ tenant_id: TENANT });
  assert.equal(unresolved.error_count, 2);
  assert.throws(
    () => service.execute({ tenant_id: TENANT }, { approval_manifest: approval(unresolved) }),
    (error) => error.safe_error_code === "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_NOT_READY",
  );
  store.close();
});

function appendLedger(ledger, tenantId, employeeId, entryId, entryType, amountMinutes, occurredOn) {
  return ledger.append({
    tenant_id: tenantId,
    entry_id: entryId,
    employee_id: employeeId,
    policy_id: "ANNUAL-2026",
    group_id: "annual",
    policy_version_id: "annual-v1",
    entitlement_id: `ent-${employeeId}`,
    idempotency_key: entryId,
    entry_type: entryType,
    amount_minutes: amountMinutes,
    occurred_on: occurredOn,
    source_ref: `Synthetic:${entryId}`,
  });
}

function seedReconciliationTenant(store, tenantId = TENANT) {
  seedReferenceRows(store, tenantId);
  for (const employeeId of ["emp-001", "emp-002", "emp-003"]) {
    store.query("insert", {
      table: "hrx_leave_entitlements",
      row: {
        tenant_id: tenantId,
        entitlement_id: `ent-${employeeId}`,
        employee_id: employeeId,
        group_id: "annual",
        policy_version_id: "annual-v1",
        granted_minutes: 1_440,
        valid_from: "2026-01-01",
        expires_on: "2026-12-31",
        source_ref: `Synthetic:ent-${employeeId}`,
        idempotency_key: `ent-${employeeId}`,
        state_version: 1,
      },
    });
  }
}

test("LV-MIG-002 reconciles current vs recomputed balances and isolates missing and unexplained variance", () => {
  const { store } = durableStore("leave-ledger-reconciliation");
  seedReconciliationTenant(store);
  const ledger = createSqlLeaveBalanceLedger({ store });
  appendLedger(ledger, TENANT, "emp-001", "emp-001-earned", "earned", 480, "2026-01-01");
  appendLedger(ledger, TENANT, "emp-001", "emp-001-used", "used", 120, "2026-01-10");
  appendLedger(ledger, TENANT, "emp-002", "emp-002-earned", "earned", 240, "2026-01-01");
  appendLedger(ledger, TENANT, "emp-003", "emp-003-earned", "earned", 480, "2026-01-01");
  store.query("insert", { table: "hrx_leave_balance_snapshots", row: { tenant_id: TENANT, snapshot_id: "snapshot-emp-001", employee_id: "emp-001", group_id: "annual", as_of: "2026-01-05", available_minutes: 480, source_version: "synthetic-v1", created_at: NOW } });
  store.query("insert", { table: "hrx_leave_balance_snapshots", row: { tenant_id: TENANT, snapshot_id: "snapshot-emp-003", employee_id: "emp-003", group_id: "annual", as_of: "2026-01-05", available_minutes: 420, source_version: "synthetic-tampered", created_at: NOW } });

  const otherTenant = "tenant-other";
  seedReconciliationTenant(store, otherTenant);
  appendLedger(createSqlLeaveBalanceLedger({ store }), otherTenant, "emp-001", "other-earned", "earned", 960, "2026-01-01");

  const result = createLeaveLedgerReconciliationService({ store, clock: () => NOW }).reconcile({ tenant_id: TENANT }, { as_of: "2026-01-31" });
  assert.deepEqual(
    {
      rows: result.row_count,
      reconciled: result.reconciled_count,
      missing: result.baseline_missing_count,
      unexplained: result.unexplained_variance_count,
      minutes: result.unexplained_variance_minutes,
    },
    { rows: 3, reconciled: 1, missing: 1, unexplained: 1, minutes: 60 },
  );
  assert.deepEqual(
    result.rows.find((row) => row.employee_id === "emp-001"),
    { employee_id: "emp-001", group_id: "annual", snapshot_as_of: "2026-01-05", current_minutes: 360, recomputed_minutes: 360, variance_minutes: 0, state: "reconciled" },
  );
  assert.equal(result.rows.find((row) => row.employee_id === "emp-002").state, "baseline_missing");
  assert.equal(result.rows.find((row) => row.employee_id === "emp-003").variance_minutes, -60);
  assert.equal(result.rows.some((row) => row.employee_id === "other-earned"), false);
  assert.match(result.source_hash, /^sha256:[a-f0-9]{64}$/);
  store.close();
});
