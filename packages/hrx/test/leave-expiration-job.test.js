import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveExpirationService } from "../src/leave/expiration-service.js";
import { runLeaveExpirationJob } from "../src/leave/expiration-job.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-01T01:00:00.000Z";

function seedTenant(store, tenantId) {
  store.query("insert", { table: "hrx_employees", row: { tenant_id: tenantId, employee_id: "emp-001", display_name: "합성 구성원", status: "active" } });
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: tenantId, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: tenantId, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: tenantId, entitlement_id: "ent-001", employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 480, valid_from: "2026-01-01", expires_on: "2026-06-30", source_ref: "Synthetic:job", idempotency_key: "ent-001", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: tenantId, entry_id: "earned-001", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "ent-001", idempotency_key: "earned-001", entry_type: "earned", amount_minutes: 480, occurred_on: "2026-01-01", source_ref: "Synthetic:job" });
}

test("LV-LIFE-004 resumes from the failed tenant without repeating completed tenants", async () => {
  const store = createFileHrxStore();
  for (const tenantId of ["tenant-c", "tenant-a", "tenant-b"]) seedTenant(store, tenantId);
  let sequence = 0;
  let failTenantB = true;
  const idFactory = (prefix) => `${prefix}-${++sequence}`;
  const expirationServiceFactory = (options) => {
    const service = createLeaveExpirationService(options);
    return Object.freeze({
      preview(context, input) {
        if (context.tenant_id === "tenant-b" && failTenantB) {
          const error = new Error("synthetic tenant failure");
          error.safe_error_code = "SYNTHETIC_TENANT_FAILURE";
          throw error;
        }
        return service.preview(context, input);
      },
      execute: service.execute,
    });
  };
  const input = { store, tenant_ids: ["tenant-c", "tenant-a", "tenant-b"], as_of: "2026-07-01", clock: () => NOW, retryDelayMs: 0, idFactory, expirationServiceFactory };

  const first = await runLeaveExpirationJob(input);
  assert.equal(first.failed_tenant_id, "tenant-b");
  assert.equal(first.next_cursor, "tenant-a");
  assert.equal(first.has_more, true);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: "tenant-a", entry_type: "expired" } }).length, 1);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: "tenant-b", entry_type: "expired" } }).length, 0);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: "tenant-c", entry_type: "expired" } }).length, 0);

  failTenantB = false;
  const resumed = await runLeaveExpirationJob({ ...input, cursor: first.next_cursor });
  assert.equal(resumed.failed_tenant_id, null);
  assert.equal(resumed.next_cursor, null);
  assert.equal(resumed.has_more, false);
  assert.deepEqual(resumed.rows.map((row) => [row.tenant_id, row.state]), [["tenant-b", "completed"], ["tenant-c", "completed"]]);
  for (const tenantId of ["tenant-a", "tenant-b", "tenant-c"]) {
    assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId, entry_type: "expired" } }).length, 1);
  }
  const tenantBJob = store.query("selectOne", { table: "hrx_leave_job_outbox", where: { tenant_id: "tenant-b" } });
  assert.equal(tenantBJob.attempt_count, 2);
  assert.equal(tenantBJob.cursor_before, "tenant-a");
  assert.equal(tenantBJob.cursor_after, "tenant-b");

  const replay = await runLeaveExpirationJob(input);
  assert.equal(replay.completed_count, 3);
  assert.ok(replay.rows.every((row) => row.replayed === true));
  for (const tenantId of ["tenant-a", "tenant-b", "tenant-c"]) {
    assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId, entry_type: "expired" } }).length, 1);
  }
});

test("LV-LIFE-004 paginates tenants with a durable cursor", async () => {
  const store = createFileHrxStore();
  for (const tenantId of ["tenant-a", "tenant-b"]) seedTenant(store, tenantId);
  let sequence = 0;
  const input = { store, tenant_ids: ["tenant-b", "tenant-a"], as_of: "2026-07-01", limit: 1, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` };
  const first = await runLeaveExpirationJob(input);
  assert.equal(first.next_cursor, "tenant-a");
  assert.equal(first.has_more, true);
  const second = await runLeaveExpirationJob({ ...input, cursor: first.next_cursor });
  assert.equal(second.next_cursor, null);
  assert.equal(second.has_more, false);
  assert.equal(second.rows[0].tenant_id, "tenant-b");
});
