import assert from "node:assert/strict";
import test from "node:test";
import { authorizeHrxApiRequest } from "../../src/middleware/hrx-authz.js";
import { findRegisteredAccountByEmail } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { startApiServer } from "../../src/server.js";
import { apiSessionHeaders } from "../helpers/session.js";

let server;
let baseUrl;
let adminHeaders;
let staffHeaders;
let noHrxHeaders;

const ALLOW_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-authz-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.employee.read,hrx.employee.write,hrx.document.read,hrx.document.write,hrx.compensation.read,hrx.attendance.read,hrx.attendance.write,hrx.overtime.read,hrx.overtime.write,hrx.risk.read,hrx.risk.write,hrx.leave.read,hrx.legal_people.read,hrx.payroll.preview,hrx.payroll.approve,hrx.payroll.export",
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

function account(email) {
  const found = findRegisteredAccountByEmail(email);
  assert.ok(found, `registered account ${email} should exist`);
  return found;
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
  adminHeaders = await apiSessionHeaders(baseUrl, account("jwsuh@amic.kr"));
  staffHeaders = await apiSessionHeaders(baseUrl, account("yjlee@amic.kr"));
  noHrxHeaders = await apiSessionHeaders(baseUrl, account("matter.desktop.qa@amic.kr"));
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX route policy map resolves implemented server routes and denies unknown routes", () => {
  assert.equal(
    resolveHrxRoutePolicy({
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    }).required_scope,
    "hrx.employee.read",
  );
  assert.equal(
    resolveHrxRoutePolicy({
      method: "GET",
      pathname: "/api/hrx/people/members/emp-001/daily-brief",
    }).required_scope,
    "hrx.employee.read",
  );
  assert.equal(resolveHrxRoutePolicy({
    method: "GET",
    pathname: "/api/hrx/people/members/emp-001/outlook-connection",
  }).required_scope, "hrx.employee.read");
  assert.equal(resolveHrxRoutePolicy({
    method: "POST",
    pathname: "/api/hrx/people/members/emp-001/outlook-connection",
  }).required_scope, "hrx.employee.read");
  const selfOutlookCompletion = resolveHrxRoutePolicy({
    method: "POST",
    pathname: "/api/hrx/people/me/outlook-connection/complete",
  });
  assert.equal(selfOutlookCompletion.required_scope, "hrx.employee.read");
  assert.equal(
    selfOutlookCompletion.resource_id,
    "/api/hrx/people/me/outlook-connection/complete",
  );
  assert.deepEqual(selfOutlookCompletion.params, {});
  assert.equal(Object.hasOwn(selfOutlookCompletion, "resource_param"), false);
  assert.equal(resolveHrxRoutePolicy({
    method: "DELETE",
    pathname: "/api/hrx/people/members/emp-001/outlook-connection",
  }).required_scope, "hrx.employee.read");
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
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/documents/doc-001/renew" }).required_scope, "hrx.document.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/documents/doc-001/terminate" }).required_scope, "hrx.document.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/compensation" }).required_scope, "hrx.compensation.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/compensation" }).action, "hrx.compensation.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/compensation/comp-001/decrypt" }).required_scope, "hrx.compensation.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/compensation/comp-001/decrypt" }).action, "hrx.compensation.decrypt");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/attendance" }).required_scope, "hrx.attendance.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/attendance" }).required_scope, "hrx.attendance.self.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/attendance/correction-requests" }).required_scope, "hrx.attendance.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/attendance/att-001/correction-requests" }).required_scope, "hrx.attendance.self.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/attendance/correction-requests/corr-001/approve" }).required_scope, "hrx.attendance.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/attendance/att-001/correct" }).required_scope, "hrx.attendance.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/overtime" }).required_scope, "hrx.overtime.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/overtime" }).required_scope, "hrx.overtime.self.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/overtime/risks" }).required_scope, "hrx.overtime.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/risks" }).required_scope, "hrx.risk.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/risks/scan" }).required_scope, "hrx.risk.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/risks/hrx-risk:employment_contract_missing:emp-001:current/transition" }).required_scope, "hrx.risk.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/overtime/ot-001/approve" }).required_scope, "hrx.overtime.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/leave-001/approve" }).required_scope, "hrx.leave.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/search" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/person_client_contact_001" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/relationships" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/matter-graph/traverse" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/ethics" }).required_scope, "hrx.legal_people.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/lifecycle/onboarding" }).required_scope, "hrx.lifecycle.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/onboarding/onb-001/tasks/task-001" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/lifecycle/offboarding" }).required_scope, "hrx.lifecycle.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/offboarding/off-001/evidence" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/offboarding/off-001/close" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/job-openings" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/pipeline" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/candidates" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/applications" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/interviews" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/offers" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/offers/offer-001/stage" }).required_scope, "hrx.candidate.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/recruiting/applications/app-001/convert-to-employee" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/preview" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/approve" }).required_scope, "hrx.payroll.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/export" }).required_scope, "hrx.payroll.export");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/periods" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/dashboard-summary" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/dashboard-summary" }).action, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/runs/run-001" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/periods" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/snapshot" }).required_scope, "hrx.payroll.preview");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/minimum-wage/rule-001/legal-approve" }).required_scope, "hrx.payroll.minimum_wage.legal_review");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/minimum-wage/rule-001/legal-approve" }).action, "hrx.payroll.minimum_wage.legal_review");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/issues/issue-001/resolve" }).required_scope, "hrx.payroll.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/close" }).required_scope, "hrx.payroll.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/statements/self" }).required_scope, "hrx.payroll.statement.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/statements/statement-001/download" }).required_scope, "hrx.payroll.statement.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/statements/generate" }).required_scope, "hrx.payroll.statement.manage");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/runs/run-001/export" }).required_scope, "hrx.payroll.export");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/payments/prepare" }).required_scope, "hrx.payroll.payment.prepare");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/payment-batches/batch-001/approve" }).required_scope, "hrx.payroll.payment.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/runs/run-001/filings" }).required_scope, "hrx.payroll.filing.prepare");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/filings/filing-001/submit" }).required_scope, "hrx.payroll.filing.submit");
  const filingPreparationPolicy = resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/filings" });
  const yearEndProcessingPolicy = resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/year-end/collect" });
  assert.equal(filingPreparationPolicy.action, yearEndProcessingPolicy.action);
  assert.equal(filingPreparationPolicy.purpose, "payroll_filing_processing");
  assert.equal(yearEndProcessingPolicy.purpose, "payroll_year_end_processing");
  const filingSubmissionPolicy = resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/filings/filing-001/submit" });
  const yearEndReviewPolicy = resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/runs/run-001/year-end/review" });
  assert.equal(filingSubmissionPolicy.action, yearEndReviewPolicy.action);
  assert.equal(filingSubmissionPolicy.purpose, "payroll_filing_processing");
  assert.equal(yearEndReviewPolicy.purpose, "payroll_year_end_review");
  assert.equal(
    resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/payment-batches/batch-001/approve" }).purpose,
    "payroll_payment_processing",
  );
  assert.equal(
    resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/statements/statement-001/download" }).purpose,
    "payroll_statement_self_service",
  );
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
    headers: noHrxHeaders,
  });
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.document.read");
});

test("HRX compensation route requires compensation read scope before step-up runtime", async () => {
  const { status, body } = await json("/api/hrx/compensation?employee_id=emp-001", {
    headers: staffHeaders,
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.compensation.read");
});

test("HRX attendance self-service write requires its dedicated scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/attendance", {
    method: "POST",
    headers: noHrxHeaders,
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
  assert.equal(body.required_scope, "hrx.attendance.self.write");
});

test("HRX attendance self-service write rejects another employee after route authorization", async () => {
  const { status, body } = await json("/api/hrx/attendance", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({
      attendance_id: "att-authz-other-employee",
      employee_id: "emp-001",
      work_date: "2026-07-02",
      status: "present",
      source_ref: "TimeClock:authz-other-employee",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(body.attendance, null);
});

test("HRX elevated administrator cannot proxy attendance or overtime through self-service HTTP routes", async () => {
  const attendance = await json("/api/hrx/attendance", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      attendance_id: "att-admin-proxy-denied",
      employee_id: "emp-001",
      work_date: "2026-07-02",
      status: "present",
      source_ref: "TimeClock:admin-proxy-denied",
    }),
  });
  assert.equal(attendance.status, 403);
  assert.equal(attendance.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(attendance.body.attendance, null);

  const overtime = await json("/api/hrx/overtime", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      overtime_id: "ot-admin-proxy-denied",
      employee_id: "emp-001",
      work_date: "2026-07-02",
      requested_minutes: 60,
      reason: "관리자 대리 신청 시도",
    }),
  });
  assert.equal(overtime.status, 403);
  assert.equal(overtime.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(overtime.body.overtime, null);
});

test("HRX document lifecycle write routes require document write scope before runtime", async () => {
  const create = await json("/api/hrx/documents", {
    method: "POST",
    headers: staffHeaders,
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
    headers: staffHeaders,
    body: JSON.stringify({ signature_ref: "signature:denied" }),
  });
  assert.equal(sign.status, 403);
  assert.equal(sign.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(sign.body.required_scope, "hrx.document.write");

  const renew = await json("/api/hrx/documents/doc-authz-denied/renew", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ expires_on: "2026-08-20" }),
  });
  assert.equal(renew.status, 403);
  assert.equal(renew.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(renew.body.required_scope, "hrx.document.write");

  const terminate = await json("/api/hrx/documents/doc-authz-denied/terminate", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(terminate.status, 403);
  assert.equal(terminate.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(terminate.body.required_scope, "hrx.document.write");
});

test("HRX overtime self-service submit requires its dedicated scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/overtime", {
    method: "POST",
    headers: noHrxHeaders,
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
  assert.equal(body.required_scope, "hrx.overtime.self.write");
});

test("HRX overtime self-service submit rejects another employee after route authorization", async () => {
  const { status, body } = await json("/api/hrx/overtime", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({
      overtime_id: "ot-authz-other-employee",
      employee_id: "emp-001",
      work_date: "2026-07-02",
      hours: 2,
      reason: "other employee",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(body.overtime, null);
});

test("HRX overtime decision requires approval scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/overtime/ot-authz-denied/approve", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ decision_reason: "approval denied" }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.overtime.approve");
});

test("HRX risk scan and transition routes require risk write scope before runtime", async () => {
  const scan = await json("/api/hrx/risks/scan", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ as_of: "2026-07-03" }),
  });
  assert.equal(scan.status, 403);
  assert.equal(scan.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(scan.body.required_scope, "hrx.risk.write");

  const transition = await json("/api/hrx/risks/hrx-risk:employment_contract_missing:emp-001:current/transition", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ status: "acknowledged" }),
  });
  assert.equal(transition.status, 403);
  assert.equal(transition.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(transition.body.required_scope, "hrx.risk.write");
});

test("HRX API allows scoped trusted context and rejects unmapped HRX routes", async () => {
  const allowed = await json("/api/hrx/employees", { headers: adminHeaders });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");

  const unmapped = await json("/api/hrx/not-mapped", { headers: adminHeaders });
  assert.equal(unmapped.status, 403);
  assert.equal(unmapped.body.safe_error_code, "HRX_ROUTE_POLICY_REQUIRED");
});

test("HRX employees read route ignores forged permission-context deny and review decisions", async () => {
  const denied = await json("/api/hrx/employees", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(denied.status, 200);
  assert.equal(denied.body.outcome, "ok");
  assert.ok(denied.body.employees.length > 0);

  const review = await json("/api/hrx/employees", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(review.status, 200);
  assert.equal(review.body.outcome, "ok");
  assert.ok(review.body.employees.length > 0);
});

test("HRX document attendance and leave read routes ignore forged permission-context deny and review decisions", async () => {
  const deniedDocuments = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(deniedDocuments.status, 200);
  assert.equal(deniedDocuments.body.outcome, "ok");
  assert.deepEqual(deniedDocuments.body.documents, []);

  const reviewDocuments = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(reviewDocuments.status, 200);
  assert.equal(reviewDocuments.body.outcome, "ok");
  assert.deepEqual(reviewDocuments.body.documents, []);

  const deniedAttendance = await json("/api/hrx/attendance?employee_id=emp-001", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(deniedAttendance.status, 200);
  assert.equal(deniedAttendance.body.outcome, "ok");
  assert.deepEqual(deniedAttendance.body.attendance, []);

  const reviewAttendance = await json("/api/hrx/attendance?employee_id=emp-001", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(reviewAttendance.status, 200);
  assert.equal(reviewAttendance.body.outcome, "ok");
  assert.deepEqual(reviewAttendance.body.attendance, []);

  const deniedLeave = await json("/api/hrx/leave?employee_id=emp-001&policy_id=pto-us", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("deny") },
  });
  assert.equal(deniedLeave.status, 200);
  assert.equal(deniedLeave.body.outcome, "ok");
  assert.equal(deniedLeave.body.balance.employee_id, "emp-001");
  assert.deepEqual(deniedLeave.body.requests, []);

  const reviewLeave = await json("/api/hrx/leave?employee_id=emp-001&policy_id=pto-us", {
    headers: { ...adminHeaders, "x-lawos-permission-context": permissionContext("review_required") },
  });
  assert.equal(reviewLeave.status, 200);
  assert.equal(reviewLeave.body.outcome, "ok");
  assert.equal(reviewLeave.body.balance.employee_id, "emp-001");
  assert.deepEqual(reviewLeave.body.requests, []);
});

test("HRX API rejects query tenant actor context before runtime", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-a&actor_id=query-user", { headers: adminHeaders });
  assert.equal(status, 400);
  assert.equal(body.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
  assert.deepEqual(body.forbidden_query_keys, ["tenant_id", "actor_id"]);
});

test("HRX employee user-link write route requires write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/employee-user-links", {
    method: "POST",
    headers: staffHeaders,
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
    headers: staffHeaders,
    body: JSON.stringify({ employee_id: "emp-authz-denied", display_name: "Denied Employee" }),
  });
  assert.equal(create.status, 403);
  assert.equal(create.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(create.body.required_scope, "hrx.employee.write");

  const update = await json("/api/hrx/employees/emp-001", {
    method: "PATCH",
    headers: staffHeaders,
    body: JSON.stringify({ status: "notice" }),
  });
  assert.equal(update.status, 403);
  assert.equal(update.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(update.body.required_scope, "hrx.employee.write");

  const orgUpdate = await json("/api/hrx/org-chart/employees/emp-001", {
    method: "PATCH",
    headers: staffHeaders,
    body: JSON.stringify({ manager_employee_id: null }),
  });
  assert.equal(orgUpdate.status, 403);
  assert.equal(orgUpdate.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(orgUpdate.body.required_scope, "hrx.employee.write");
});

test("HRX legal People route requires legal People read scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/legal-people/ethics", {
    headers: staffHeaders,
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.legal_people.read");
});

test("HRX lifecycle write route requires lifecycle write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/lifecycle/offboarding/off-001/close", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.lifecycle.write");
});

test("HRX payroll export route requires payroll export scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/payroll/export", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({
      preview_id: "payroll-authz-denied",
      export_artifact_ref: "DMS:payroll-authz-denied",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.payroll.export");
});

test("HRX payroll runtime routes enforce preview and approval scopes before runtime", async () => {
  const dashboardSummary = await json("/api/hrx/payroll/dashboard-summary?month=2026-07", {
    headers: staffHeaders,
  });
  assert.equal(dashboardSummary.status, 403);
  assert.equal(dashboardSummary.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(dashboardSummary.body.required_scope, "hrx.payroll.preview");

  const read = await json("/api/hrx/payroll/periods?limit=5", {
    headers: staffHeaders,
  });
  assert.equal(read.status, 403);
  assert.equal(read.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(read.body.required_scope, "hrx.payroll.preview");

  const snapshot = await json("/api/hrx/payroll/runs/payroll-authz-denied/snapshot", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ expected_state_version: 1 }),
  });
  assert.equal(snapshot.status, 403);
  assert.equal(snapshot.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(snapshot.body.required_scope, "hrx.payroll.preview");

  const legalReview = await json("/api/hrx/payroll/minimum-wage/minimum-wage-authz-denied/legal-approve", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ expected_version: 1, legal_review_ref: "document:legal/authz-denied" }),
  });
  assert.equal(legalReview.status, 403);
  assert.equal(legalReview.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(legalReview.body.required_scope, "hrx.payroll.minimum_wage.legal_review");

  const resolve = await json("/api/hrx/payroll/issues/payroll-issue-authz-denied/resolve", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ expected_state_version: 1, resolution_code: "reviewed" }),
  });
  assert.equal(resolve.status, 403);
  assert.equal(resolve.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(resolve.body.required_scope, "hrx.payroll.approve");

  const close = await json("/api/hrx/payroll/runs/payroll-authz-denied/close", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ expected_state_version: 1 }),
  });
  assert.equal(close.status, 403);
  assert.equal(close.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(close.body.required_scope, "hrx.payroll.approve");
});

test("HRX payroll statement, payment, and filing routes enforce separated scopes", async () => {
  const cases = [
    ["GET", "/api/hrx/payroll/runs/run-authz-denied/statements", "hrx.payroll.statement.manage"],
    ["POST", "/api/hrx/payroll/runs/run-authz-denied/statements/generate", "hrx.payroll.statement.manage"],
    ["GET", "/api/hrx/payroll/runs/run-authz-denied/export?format=csv", "hrx.payroll.export"],
    ["POST", "/api/hrx/payroll/runs/run-authz-denied/payments/prepare", "hrx.payroll.payment.prepare"],
    ["POST", "/api/hrx/payroll/payment-batches/batch-authz-denied/approve", "hrx.payroll.payment.approve"],
    ["GET", "/api/hrx/payroll/runs/run-authz-denied/filings", "hrx.payroll.filing.prepare"],
    ["POST", "/api/hrx/payroll/filings/filing-authz-denied/submit", "hrx.payroll.filing.submit"],
  ];
  for (const [method, path, scope] of cases) {
    const result = await json(path, { method, headers: staffHeaders, body: method === "POST" ? "{}" : undefined });
    assert.equal(result.status, 403, `${method} ${path}`);
    assert.equal(result.body.safe_error_code, "HRX_AUTHZ_DENIED", `${method} ${path}`);
    assert.equal(result.body.required_scope, scope, `${method} ${path}`);
  }
});
