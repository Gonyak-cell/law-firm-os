import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../src/server.js";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("GET /api/hrx/employees returns synthetic API-backed employee rows", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-a");
  assert.equal(status, 200);
  assert.equal(body.outcome, "ok");
  assert.ok(body.employees.length >= 2);
  assert.equal(body.employees[0].tenant_id, "tenant-a");
});

test("GET /api/hrx/employees/:id returns profile with compensation masked", async () => {
  const { status, body } = await json("/api/hrx/employees/emp-001?tenant_id=tenant-a");
  assert.equal(status, 200);
  assert.equal(body.employee.employee_id, "emp-001");
  assert.equal(body.employment_profile.employee_id, "emp-001");
  assert.equal(body.masked_compensation_ref, null);
});

test("GET /api/hrx/documents returns metadata source refs only", async () => {
  const { status, body } = await json("/api/hrx/documents?tenant_id=tenant-a&employee_id=emp-001");
  assert.equal(status, 200);
  assert.equal(body.documents[0].source_ref, "DMS:hr-policy-ack-001");
  assert.equal(Object.hasOwn(body.documents[0], "body"), false);
});

test("GET and POST /api/hrx/leave use leave request workflow state", async () => {
  const before = await json("/api/hrx/leave?tenant_id=tenant-a&employee_id=emp-001&policy_id=pto-us");
  assert.equal(before.status, 200);
  assert.equal(before.body.balance.available_balance, 80);

  const submitted = await json("/api/hrx/leave?tenant_id=tenant-a&actor_id=user-a", {
    method: "POST",
    body: JSON.stringify({
      request_id: "leave-api-001",
      employee_id: "emp-001",
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 8,
      start_date: "2026-07-01",
      end_date: "2026-07-01",
    }),
  });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.leave_request.state, "submitted");

  const after = await json("/api/hrx/leave?tenant_id=tenant-a&employee_id=emp-001&policy_id=pto-us");
  assert.ok(after.body.requests.some((request) => request.request_id === "leave-api-001"));
});

test("GET and POST /api/hrx/approvals resolves manager queue and records audit", async () => {
  const before = await json("/api/hrx/approvals?tenant_id=tenant-a");
  assert.equal(before.status, 200);
  assert.ok(before.body.approvals.some((approval) => approval.approval_id === "approval-leave-002"));

  const approved = await json("/api/hrx/approvals/approval-leave-002/approve?tenant_id=tenant-a&actor_id=manager-001", {
    method: "POST",
    body: JSON.stringify({ decision_reason: "approved by manager" }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.approval.state, "approved");

  const audit = await json("/api/hrx/audit?tenant_id=tenant-a");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.approval.approve"));
});

test("GET /api/hrx/candidate/portal returns candidate-scoped application and metadata only", async () => {
  const { status, body } = await json("/api/hrx/candidate/portal?tenant_id=tenant-a&candidate_id=cand-001");
  assert.equal(status, 200);
  assert.equal(body.candidate.candidate_id, "cand-001");
  assert.equal(body.applications[0].candidate_id, "cand-001");
  assert.equal(body.documents[0].body_included, false);
  assert.equal(Object.hasOwn(body.candidate, "crm_party_id"), false);
});

test("GET and POST recruiting pipeline updates application stage through API", async () => {
  const before = await json("/api/hrx/recruiting/pipeline?tenant_id=tenant-a");
  assert.equal(before.status, 200);
  const app = before.body.applications.find((item) => item.application_id === "app-001");
  assert.equal(app.stage, "interview");

  const updated = await json("/api/hrx/recruiting/applications/app-001/stage?tenant_id=tenant-a&actor_id=recruiter-001", {
    method: "POST",
    body: JSON.stringify({ stage: "offer" }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.application.stage, "offer");
});

test("GET and POST /api/hrx/policies manages policy versions through API", async () => {
  const before = await json("/api/hrx/policies?tenant_id=tenant-a");
  assert.equal(before.status, 200);
  assert.ok(before.body.policies.some((policy) => policy.policy_id === "pto-us"));

  const created = await json("/api/hrx/policies?tenant_id=tenant-a&actor_id=admin-001", {
    method: "POST",
    body: JSON.stringify({
      policy_id: "policy-api-created",
      policy_type: "retention",
      policy_version: "2026.2",
      effective_from: "2026-08-01",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.policy.policy_version, "2026.2");
});

test("GET /api/hrx/audit remains tenant scoped", async () => {
  const { status, body } = await json("/api/hrx/audit?tenant_id=tenant-a");
  assert.equal(status, 200);
  assert.ok(body.events.length >= 1);
  assert.ok(body.events.every((event) => event.tenant_id === "tenant-a"));
});

test("GET /api/hrx/analytics returns aggregate People metrics without row-level detail", async () => {
  const { status, body } = await json("/api/hrx/analytics?tenant_id=tenant-a");
  assert.equal(status, 200);
  assert.equal(body.analytics.row_level_details_included, false);
  assert.ok(body.analytics.headcount.total >= 2);
  assert.equal(JSON.stringify(body.analytics).includes("Ari Kim"), false);
});
