// Deterministic in-process tests for the CMP-G3 People/HRX runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g3-people-ops";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G3 health descriptor exposes People/HRX after G1 and G2", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const people = body.bounded_contexts.find((context) => context.bounded_context === "people-hrx");
  assert.ok(people);
  assert.equal(people.cmp_gate, "CMP-G3");
  assert.deepEqual(people.depends_on, ["CMP-G1-W01", "CMP-G2-W02"]);
  assert.equal(people.tuw_ids.length, 24);
  assert.equal(people.tuw_ids[0], "CMP-G3-W03-T001");
  assert.equal(people.tuw_ids.at(-1), "CMP-G3-W03-T024");
  assert.equal(people.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G3 creates and updates Employee while blocking User identity conflation", async () => {
  const created = await json(`/api/hrx/employees?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      employee_id: "emp-cmp-g3-runtime",
      display_name: "CMP G3 Runtime Employee",
      status: "active",
      source_ref: "HRX:synthetic:cmp-g3",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.employee.employee_id, "emp-cmp-g3-runtime");
  assert.equal(Object.hasOwn(created.body.employee, "user_id"), false);
  assert.ok(created.body.tuw_ids.includes("CMP-G3-W03-T001"));

  const blocked = await json(`/api/hrx/employees?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      employee_id: "emp-cmp-g3-conflated",
      display_name: "Conflated Employee",
      status: "active",
      user_id: "iam-user-should-not-be-employee-field",
    }),
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.outcome, "blocked");
  assert.match(blocked.body.reason, /must not include user_id/);

  const patched = await json(`/api/hrx/employees/emp-cmp-g3-runtime?${query()}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "on_leave" }),
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.employee.status, "on_leave");
});

test("CMP-G3 creates EmploymentProfile rows linked to Employee only", async () => {
  const created = await json(`/api/hrx/employment-profiles?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      profile_id: "profile-cmp-g3-runtime",
      employee_id: "emp-cmp-g3-runtime",
      employment_type: "full_time",
      status: "active",
      title: "Synthetic Counsel",
      org_unit_id: "practice-group-litigation",
      effective_from: "2026-06-20",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.employment_profile.employee_id, "emp-cmp-g3-runtime");
  assert.equal(Object.hasOwn(created.body.employment_profile, "user_id"), false);

  const list = await json(`/api/hrx/employment-profiles?${query({ employee_id: "emp-cmp-g3-runtime" })}`);
  assert.equal(list.status, 200);
  assert.ok(list.body.employment_profiles.some((profile) => profile.profile_id === "profile-cmp-g3-runtime"));
});

test("CMP-G3 HR document runtime stores metadata only and blocks document bodies", async () => {
  const created = await json(`/api/hrx/documents?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      document_id: "doc-cmp-g3-policy",
      employee_id: "emp-cmp-g3-runtime",
      document_type: "policy_ack",
      source_ref: "DMS:cmp-g3-policy",
      title: "CMP G3 Policy Acknowledgement",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.document.document_body_included, false);
  assert.equal(Object.hasOwn(created.body.document, "body"), false);

  const blocked = await json(`/api/hrx/documents?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      document_id: "doc-cmp-g3-body",
      employee_id: "emp-cmp-g3-runtime",
      document_type: "policy_ack",
      source_ref: "DMS:cmp-g3-policy-body",
      body: "not allowed in HRX metadata runtime",
    }),
  });
  assert.equal(blocked.status, 400);
  assert.match(blocked.body.reason, /must not include body/);
});

test("CMP-G3 workload and analytics expose aggregate People capacity without Matter detail", async () => {
  const workload = await json(`/api/hrx/workload?${query()}`);
  assert.equal(workload.status, 200);
  assert.equal(workload.body.row_level_matter_details_included, false);
  assert.ok(workload.body.workload_projection.length >= 1);
  assert.equal(JSON.stringify(workload.body.workload_projection).includes("matter-001"), false);

  const analytics = await json(`/api/hrx/analytics?${query()}`);
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.analytics.row_level_details_included, false);
  assert.equal(JSON.stringify(analytics.body.analytics).includes("Ari Kim"), false);
});

test("CMP-G3 masks compensation and routes evaluation access through audit-on-read guardrails", async () => {
  const compensation = await json(`/api/hrx/compensation/preview?${query({ employee_id: "emp-cmp-g3-runtime" })}`);
  assert.equal(compensation.status, 200);
  assert.equal(compensation.body.compensation.masked, true);
  assert.equal(compensation.body.compensation.amount, null);
  assert.equal(compensation.body.compensation.currency, null);

  const evaluation = await json(`/api/hrx/evaluations/access?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      evaluation_id: "evaluation-cmp-g3",
      authorized_reviewer: true,
      audit_hint_ref: "audit_hint_cmp_g3_eval",
    }),
  });
  assert.equal(evaluation.status, 200);
  assert.equal(evaluation.body.outcome, "review_required");
  assert.equal(evaluation.body.descriptor.evaluation_access_receipt.audit_on_read_tested, true);

  const blocked = await json(`/api/hrx/evaluations/access?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      evaluation_id: "evaluation-cmp-g3-blocked",
      authorized_reviewer: false,
      score_finalized: true,
    }),
  });
  assert.equal(blocked.status, 400);
  assert.ok(blocked.body.descriptor.blocked_claims.includes("evaluation_score_finalization_blocked"));
});

test("CMP-G3 payroll preview never performs payroll calculation or disbursement", async () => {
  const preview = await json(`/api/hrx/payroll/export-preview?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      preview_id: "payroll-cmp-g3-preview",
      payroll_period: "2026-06",
      employee_ids: ["emp-cmp-g3-runtime"],
      external_provider: "external-preview-only",
    }),
  });
  assert.equal(preview.status, 201);
  assert.equal(preview.body.preview.human_review_required, true);
  assert.equal(preview.body.preview.calculation_runtime, false);
  assert.equal(preview.body.preview.disbursement_instruction_included, false);

  const blocked = await json(`/api/hrx/payroll/export-preview?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      preview_id: "payroll-cmp-g3-blocked",
      payroll_period: "2026-06",
      employee_ids: ["emp-cmp-g3-runtime"],
      net_pay: 123,
    }),
  });
  assert.equal(blocked.status, 400);
  assert.match(blocked.body.reason, /must not include net_pay/);
});

test("CMP-G3 candidate portal and runtime evidence preserve Party and R4 boundaries", async () => {
  const candidate = await json(`/api/hrx/candidate/portal?${query({ candidate_id: "cand-001" })}`);
  assert.equal(candidate.status, 200);
  assert.equal(Object.hasOwn(candidate.body.candidate, "crm_party_id"), false);
  assert.equal(candidate.body.documents[0].body_included, false);

  const evidence = await json(`/api/hrx/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G3");
  assert.equal(evidence.body.evidence.tuw_ids.length, 24);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");
  assert.equal(evidence.body.evidence.employee_user_separation_enforced, true);
  assert.equal(evidence.body.evidence.guardrail_closeout.closeout_receipt.enterprise_trust_claimed, false);
  assert.equal(evidence.body.evidence.guardrail_closeout.closeout_receipt.go_live_approval_claimed, false);
});

test("CMP-G3 audit remains tenant scoped after runtime writes", async () => {
  const audit = await json(`/api/hrx/audit?${query()}`);
  assert.equal(audit.status, 200);
  assert.ok(audit.body.events.length >= 5);
  assert.ok(audit.body.events.every((event) => event.tenant_id === TENANT));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.employee.create"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.payroll.preview"));
});
