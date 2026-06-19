import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxRepository } from "../src/repository.js";
import { createHrxService } from "../src/service.js";

function allowAuthz() {
  return { evaluate: async () => ({ effect: "allow", reason: "test_allow" }) };
}

function denyAuthz() {
  return { evaluate: async () => ({ effect: "deny", reason: "test_deny" }) };
}

function auditRecorder() {
  const events = [];
  return {
    events,
    append: async (event) => {
      events.push(Object.freeze({ ...event }));
      return { ok: true };
    },
  };
}

test("HRX service requires repository, authz, and audit ports", () => {
  assert.throws(() => createHrxService({}), /repository port/);
  assert.throws(
    () => createHrxService({ repository: createInMemoryHrxRepository(), authz: allowAuthz(), audit: {} }),
    /audit port missing append/,
  );
});

test("HRX service creates employee through authz and audit ports", async () => {
  const audit = auditRecorder();
  const service = createHrxService({
    repository: createInMemoryHrxRepository(),
    authz: allowAuthz(),
    audit,
  });
  const employee = await service.createEmployee(
    { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" },
    { employee_id: "emp-001", display_name: "Synthetic Employee", status: "active" },
  );
  assert.equal(employee.tenant_id, "tenant-a");
  assert.equal(audit.events.length, 1);
  assert.equal(audit.events[0].event_type, "hrx.employee.created");
  assert.equal(audit.events[0].actor_id, "user-a");
});

test("HRX service denies when authz port denies", async () => {
  const service = createHrxService({
    repository: createInMemoryHrxRepository(),
    authz: denyAuthz(),
    audit: auditRecorder(),
  });
  await assert.rejects(
    () =>
      service.createEmployee(
        { tenant_id: "tenant-a", actor_id: "user-a" },
        { employee_id: "emp-001", display_name: "Synthetic Employee", status: "active" },
      ),
    /test_deny/,
  );
});
