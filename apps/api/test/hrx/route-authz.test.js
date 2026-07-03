import assert from "node:assert/strict";
import test from "node:test";
import { authorizeHrxApiRequest } from "../../src/middleware/hrx-authz.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const ALLOW_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-authz-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.employee.read,hrx.employee.write,hrx.document.read,hrx.document.write,hrx.compensation.read,hrx.attendance.read,hrx.attendance.write,hrx.overtime.read,hrx.overtime.write,hrx.risk.read,hrx.risk.write,hrx.leave.read,hrx.legal_people.read,hrx.payroll.preview,hrx.payroll.export",
});

const PERMISSION_PRINCIPAL = Object.freeze({
  user_id: "hrx-authz-user",
  actor_id: "hrx-authz-user",
  tenant_id: "tenant-a",
  role_ids: ["people_ops"],
});

function permissionContext(effect) {
  return JSON.stringify({
    principal: PERMISSION_PRINCIPAL,
    rules: effect === "deny" ? [] : [{ id: `rule_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

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

test("HRX route policy map resolves implemented server routes and denies unknown routes", () => {
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/employees" }).required_scope, "hrx.employee.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/employees" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "PATCH", pathname: "/api/hrx/employees/emp-001" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/org-chart" }).required_scope, "hrx.employee.read");
  assert.equal(resolveHrxRoutePolicy({ method: "PATCH", pathname: "/api/hrx/org-chart/employees/emp-001" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/employee-user-links" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/employee-user-links/link-001/revoke" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/documents" }).required_scope, "hrx.document.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/documents/expiring" }).required_scope, "hrx.document.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/documents" }).required_scope, "hrx.document.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/documents/doc-001/sign" }).required_scope, "hrx.document.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/documents/doc-001/expire" }).required_scope, "hrx.document.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/compensation" }).required_scope, "hrx.compensation.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/compensation" }).action, "hrx.compensation.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/attendance" }).required_scope, "hrx.attendance.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/attendance" }).required_scope, "hrx.attendance.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/attendance/att-001/correct" }).required_scope, "hrx.attendance.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/overtime" }).required_scope, "hrx.overtime.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/overtime" }).required_scope, "hrx.overtime.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/overtime/risks" }).required_scope, "hrx.overtime.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/risks" }).required_scope, "hrx.risk.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/risks/scan" }).required_scope, "hrx.risk.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/risks/hrx-risk:employment_contract_missing:emp-001:current/transition" }).required_scope, "hrx.risk.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/overtime/ot-001/approve" }).required_scope, "hrx.overtime.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/search" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/person_client_contact_001" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/relationships" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/matter-graph/traverse" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/ethics" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/lifecycle/onboarding" }).required_scope, "hrx.lifecycle.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/onboarding/onb-001/tasks/task-001" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/lifecycle/offboarding" }).required_scope, "hrx.lifecycle.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/offboarding/off-001/close" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/job-openings" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/candidates" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/applications" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/interviews" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/offers" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/offers/offer-001/stage" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/applications/app-001/convert-to-employee" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/preview" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/approve" }).required_scope, "hrx.payroll.export");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/export" }).required_scope, "hrx.payroll.export");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/not-mapped" }), null);
});

test("HRX authz middleware fails closed without trusted tenant actor context", () => {
  const decision = authorizeHrxApiRequest({ method: "GET", pathname: "/api/hrx/employees", headers: {} });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, 400);
  assert.equal(decision.body.safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");
  assert.equal(decision.body.fail_closed, true);
});

test("HRX API denies route access before runtime when scope is missing", async () => {
  const { status, body } = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.document.read");
});

test("HRX compensation route requires compensation read scope before step-up runtime", async () => {
  const { status, body } = await json("/api/hrx/compensation?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.compensation.read");
});

test("HRX attendance write route requires attendance write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/attendance", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.attendance.read" },
    body: JSON.stringify({
      attendance_id: "att-authz-denied",
      employee_id: "emp-001",
      work_date: "2026-07-02",
      status: "present",
      source_ref: "TimeClock:authz-denied",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.attendance.write");
});

test("HRX document lifecycle write routes require document write scope before runtime", async () => {
  const create = await json("/api/hrx/documents", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.document.read" },
    body: JSON.stringify({
      document_id: "doc-authz-denied",
      employee_id: "emp-001",
      expires_on: "2026-07-20",
    }),
  });
  assert.equal(create.status, 403);
  assert.equal(create.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(create.body.required_scope, "hrx.document.write");

  const sign = await json("/api/hrx/documents/doc-authz-denied/sign", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.document.read" },
    body: JSON.stringify({ signature_ref: "signature:denied" }),
  });
  assert.equal(sign.status, 403);
  assert.equal(sign.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(sign.body.required_scope, "hrx.document.write");
});

test("HRX overtime write route requires overtime write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/overtime", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.overtime.read" },
    body: JSON.stringify({
      overtime_id: "ot-authz-denied",
      employee_id: "emp-001",
      work_date: "2026-07-02",
      hours: 2,
      reason: "authz denied",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.overtime.write");
});

test("HRX risk scan and transition routes require risk write scope before runtime", async () => {
  const scan = await json("/api/hrx/risks/scan", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.risk.read" },
    body: JSON.stringify({ as_of: "2026-07-03" }),
  });
  assert.equal(scan.status, 403);
  assert.equal(scan.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(scan.body.required_scope, "hrx.risk.write");

  const transition = await json("/api/hrx/risks/hrx-risk:employment_contract_missing:emp-001:current/transition", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.risk.read" },
    body: JSON.stringify({ status: "acknowledged" }),
  });
  assert.equal(transition.status, 403);
  assert.equal(transition.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(transition.body.required_scope, "hrx.risk.write");
});

test("HRX API allows scoped trusted context and rejects unmapped HRX routes", async () => {
  const allowed = await json("/api/hrx/employees", { headers: ALLOW_HEADERS });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");

  const unmapped = await json("/api/hrx/not-mapped", { headers: ALLOW_HEADERS });
  assert.equal(unmapped.status, 403);
  assert.equal(unmapped.body.safe_error_code, "HRX_ROUTE_POLICY_REQUIRED");
});

test("HRX employees read route honors permission-context deny and review decisions", async () => {
  const denied = await json("/api/hrx/employees", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.ui_state, "denied");
  assert.equal(denied.body.count_leak_prevented, true);
  assert.deepEqual(denied.body.employees, []);

  const review = await json("/api/hrx/employees", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(review.status, 200);
  assert.equal(review.body.ui_state, "review_required");
  assert.equal(review.body.review_required, true);
  assert.equal(review.body.count_leak_prevented, true);
  assert.deepEqual(review.body.employees, []);
});

test("HRX document attendance and leave read routes honor permission-context deny and review decisions", async () => {
  const deniedDocuments = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(deniedDocuments.status, 403);
  assert.equal(deniedDocuments.body.ui_state, "denied");
  assert.equal(deniedDocuments.body.count_leak_prevented, true);
  assert.deepEqual(deniedDocuments.body.documents, []);

  const reviewDocuments = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(reviewDocuments.status, 200);
  assert.equal(reviewDocuments.body.ui_state, "review_required");
  assert.equal(reviewDocuments.body.review_required, true);
  assert.equal(reviewDocuments.body.count_leak_prevented, true);
  assert.deepEqual(reviewDocuments.body.documents, []);

  const deniedAttendance = await json("/api/hrx/attendance?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(deniedAttendance.status, 403);
  assert.equal(deniedAttendance.body.ui_state, "denied");
  assert.equal(deniedAttendance.body.count_leak_prevented, true);
  assert.deepEqual(deniedAttendance.body.attendance, []);

  const reviewAttendance = await json("/api/hrx/attendance?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(reviewAttendance.status, 200);
  assert.equal(reviewAttendance.body.ui_state, "review_required");
  assert.equal(reviewAttendance.body.review_required, true);
  assert.equal(reviewAttendance.body.count_leak_prevented, true);
  assert.deepEqual(reviewAttendance.body.attendance, []);

  const deniedLeave = await json("/api/hrx/leave?employee_id=emp-001&policy_id=pto-us", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(deniedLeave.status, 403);
  assert.equal(deniedLeave.body.ui_state, "denied");
  assert.equal(deniedLeave.body.count_leak_prevented, true);
  assert.equal(deniedLeave.body.balance, null);
  assert.deepEqual(deniedLeave.body.requests, []);

  const reviewLeave = await json("/api/hrx/leave?employee_id=emp-001&policy_id=pto-us", {
    headers: { ...ALLOW_HEADERS, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(reviewLeave.status, 200);
  assert.equal(reviewLeave.body.ui_state, "review_required");
  assert.equal(reviewLeave.body.review_required, true);
  assert.equal(reviewLeave.body.count_leak_prevented, true);
  assert.equal(reviewLeave.body.balance, null);
  assert.deepEqual(reviewLeave.body.requests, []);
});

test("HRX API rejects query tenant actor context before runtime", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-a&actor_id=query-user", { headers: ALLOW_HEADERS });
  assert.equal(status, 400);
  assert.equal(body.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
  assert.deepEqual(body.forbidden_query_keys, ["tenant_id", "actor_id"]);
});

test("HRX employee user-link write route requires write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/employee-user-links", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
    body: JSON.stringify({
      link_id: "link-authz-denied",
      employee_id: "emp-001",
      user_id: "iam-authz-denied",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.employee.write");
});

test("HRX employee registration and status update routes require write scope before runtime", async () => {
  const create = await json("/api/hrx/employees", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
    body: JSON.stringify({ employee_id: "emp-authz-denied", display_name: "Denied Employee" }),
  });
  assert.equal(create.status, 403);
  assert.equal(create.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(create.body.required_scope, "hrx.employee.write");

  const update = await json("/api/hrx/employees/emp-001", {
    method: "PATCH",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
    body: JSON.stringify({ status: "notice" }),
  });
  assert.equal(update.status, 403);
  assert.equal(update.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(update.body.required_scope, "hrx.employee.write");

  const orgUpdate = await json("/api/hrx/org-chart/employees/emp-001", {
    method: "PATCH",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
    body: JSON.stringify({ manager_employee_id: null }),
  });
  assert.equal(orgUpdate.status, 403);
  assert.equal(orgUpdate.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(orgUpdate.body.required_scope, "hrx.employee.write");
});

test("HRX legal People route requires legal People read scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/legal-people/ethics", {
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.legal_people.read");
});

test("HRX lifecycle write route requires lifecycle write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/lifecycle/offboarding/off-001/close", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.lifecycle.read" },
    body: JSON.stringify({}),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.lifecycle.write");
});

test("HRX payroll export route requires payroll export scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/payroll/export", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.payroll.preview" },
    body: JSON.stringify({
      preview_id: "payroll-authz-denied",
      export_artifact_ref: "DMS:payroll-authz-denied",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.payroll.export");
});
