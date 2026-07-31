import assert from "node:assert/strict";
import test from "node:test";
import { createLeaveApprovalDelegationService } from "../src/leave/approval-delegation.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

test("approval delegation is visible only within its durable validity window", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let now = "2026-07-30T09:00:00.000Z";
  const service = createLeaveApprovalDelegationService({
    store,
    clock: () => now,
    idFactory: () => "leave-delegation-001",
  });
  const manager = { tenant_id: "tenant-approval", actor_id: "manager-1" };
  const delegate = { tenant_id: "tenant-approval", actor_id: "manager-2" };

  const created = service.create(manager, {
    delegate_actor_id: delegate.actor_id,
    organization_scope_id: "litigation",
    valid_from: "2026-07-30T08:00:00.000Z",
    valid_to: "2026-07-31T08:00:00.000Z",
  });
  assert.equal(created.state, "active");
  assert.equal(service.list(delegate)[0].organization_scope_id, "litigation");
  assert.equal(
    service.list({ tenant_id: "tenant-other", actor_id: delegate.actor_id }).length,
    0,
  );
  assert.throws(
    () => service.revoke(delegate, created.delegation_id),
    (error) => error.safe_error_code === "HRX_LEAVE_DELEGATION_SCOPE_DENIED",
  );

  now = "2026-07-31T09:00:00.000Z";
  assert.equal(service.list(delegate)[0].state, "expired");
  const expired = service.expire(manager, created.delegation_id);
  assert.equal(expired.state, "expired");
  assert.equal(expired.expired_at, now);
  assert.equal(
    store.query("selectOne", {
      table: "hrx_approval_delegations",
      where: {
        tenant_id: manager.tenant_id,
        delegation_id: created.delegation_id,
      },
    }).expired_at,
    now,
  );
  store.close();
});
