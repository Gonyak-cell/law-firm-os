import assert from "node:assert/strict";
import test from "node:test";
import { createLeaveApprovalDelegationService } from "../src/leave/approval-delegation.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

function setup(now = "2026-07-13T00:00:00.000Z") {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let sequence = 0;
  const service = createLeaveApprovalDelegationService({
    store,
    clock: () => now,
    idFactory: () => `delegation-${++sequence}`,
  });
  return { store, service };
}

const manager = { tenant_id: "tenant-a", actor_id: "manager-a" };

test("leave approval delegation is tenant-scoped, revocable, and reports durable state", () => {
  const { store, service } = setup();
  const created = service.create(manager, {
    delegate_actor_id: "manager-b",
    organization_scope_id: "team-a",
    valid_from: "2026-07-13T01:00:00.000Z",
    valid_to: "2026-07-15T01:00:00.000Z",
  });
  assert.equal(created.state, "scheduled");
  assert.equal(service.list(manager).length, 1);
  assert.equal(service.list({ tenant_id: "tenant-b", actor_id: "manager-a" }).length, 0);
  assert.equal(service.revoke(manager, created.delegation_id).state, "revoked");
  assert.throws(() => service.revoke(manager, created.delegation_id), (error) => error.safe_error_code === "HRX_LEAVE_DELEGATION_STATE_CONFLICT");
  store.close();
});

test("leave approval delegation blocks self, overlapping, circular, and re-delegated authority", () => {
  const { store, service } = setup();
  assert.throws(
    () => service.create(manager, { delegate_actor_id: "manager-a", valid_from: "2026-07-13T01:00:00.000Z", valid_to: "2026-07-14T01:00:00.000Z" }),
    (error) => error.safe_error_code === "HRX_LEAVE_DELEGATION_SELF_FORBIDDEN",
  );
  service.create(manager, { delegate_actor_id: "manager-b", valid_from: "2026-07-13T01:00:00.000Z", valid_to: "2026-07-15T01:00:00.000Z" });
  assert.throws(
    () => service.create(manager, { delegate_actor_id: "manager-c", valid_from: "2026-07-14T01:00:00.000Z", valid_to: "2026-07-16T01:00:00.000Z" }),
    (error) => error.safe_error_code === "HRX_LEAVE_DELEGATION_PERIOD_OVERLAP",
  );
  assert.throws(
    () => service.create({ tenant_id: "tenant-a", actor_id: "manager-b" }, { delegate_actor_id: "manager-a", valid_from: "2026-07-13T02:00:00.000Z", valid_to: "2026-07-14T01:00:00.000Z" }),
    (error) => error.safe_error_code === "HRX_LEAVE_DELEGATION_CYCLE_FORBIDDEN",
  );
  assert.throws(
    () => service.create({ tenant_id: "tenant-a", actor_id: "manager-b" }, { delegate_actor_id: "manager-c", valid_from: "2026-07-13T02:00:00.000Z", valid_to: "2026-07-14T01:00:00.000Z" }),
    (error) => error.safe_error_code === "HRX_LEAVE_DELEGATION_SCOPE_EXPANSION_FORBIDDEN",
  );
  store.close();
});

test("expired delegation requires elapsed validity and persists an explicit expiration marker", () => {
  const { store, service } = setup("2026-07-16T00:00:00.000Z");
  const row = service.create(manager, {
    delegate_actor_id: "manager-b",
    valid_from: "2026-07-13T00:00:00.000Z",
    valid_to: "2026-07-15T00:00:00.000Z",
  });
  assert.equal(row.state, "expired");
  const expired = service.expire(manager, row.delegation_id);
  assert.equal(expired.state, "expired");
  assert.equal(typeof expired.expired_at, "string");
  store.close();
});
