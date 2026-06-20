import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createHrxEmployeeUserLinksRoute, createHrxEmployeesRoute } from "../../src/routes/hrx/employees.js";

function allowAuthz() {
  return { evaluate: async () => ({ effect: "allow", reason: "test_allow" }) };
}

test("HRX employees route POST GET PATCH persists and audits", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxEmployeesRoute({
    repository: createInMemoryHrxRepository(),
    authz: allowAuthz(),
    audit,
  });
  const context = { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" };

  const created = await route.handle({
    method: "POST",
    context,
    body: { employee_id: "emp-001", display_name: "Ari Kim", status: "active" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.employee.employee_id, "emp-001");

  const read = await route.handle({ method: "GET", context, params: { employee_id: "emp-001" } });
  assert.equal(read.status, 200);
  assert.equal(read.body.employee.display_name, "Ari Kim");

  const patched = await route.handle({
    method: "PATCH",
    context,
    params: { employee_id: "emp-001" },
    body: { display_name: "Ari K.", status: "on_leave" },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.employee.status, "on_leave");
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 3);
});

test("HRX employees route maps authz deny to safe 403", async () => {
  const route = createHrxEmployeesRoute({
    repository: createInMemoryHrxRepository(),
    authz: { evaluate: async () => ({ effect: "deny", reason: "test_deny" }) },
    audit: createHrxAuditEventStore(),
  });
  const response = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    body: { employee_id: "emp-001", display_name: "Ari Kim", status: "active" },
  });
  assert.equal(response.status, 403);
  assert.equal(response.body.safe_error_code, "HRX_PERMISSION_DENIED");
});

test("HRX employee user-link route creates lists and revokes audited login mappings", async () => {
  const audit = createHrxAuditEventStore();
  const repository = createInMemoryHrxRepository({
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" }],
  });
  const route = createHrxEmployeeUserLinksRoute({
    repository,
    authz: allowAuthz(),
    audit,
  });
  const context = { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" };

  const created = await route.handle({
    method: "POST",
    context,
    body: {
      link_id: "link-001",
      employee_id: "emp-001",
      user_id: "iam-user-001",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.link.purpose, "login_mapping");

  const listed = await route.handle({
    method: "GET",
    context,
    query: { employee_id: "emp-001" },
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.links.length, 1);

  const revoked = await route.handle({
    method: "POST",
    context,
    params: { link_id: "link-001" },
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.revoked, true);

  const actions = audit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
  assert.deepEqual(actions, [
    "hrx.employee_user_link.create",
    "hrx.employee_user_link.read",
    "hrx.employee_user_link.revoke",
  ]);
});
