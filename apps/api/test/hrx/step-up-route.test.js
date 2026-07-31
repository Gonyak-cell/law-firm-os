import assert from "node:assert/strict";
import test from "node:test";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  highestPrivilegeRegisteredAccount,
} from "../../src/matter-vault-account-registry.js";
import { startApiServer } from "../../src/server.js";
import { createHrxStepUpAuthority } from "../../src/hrx-step-up-token.js";
import { signedHeaders } from "../helpers/session.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";

let server;
let baseUrl;
let baseHeaders;
const SESSION_ACCOUNT = highestPrivilegeRegisteredAccount();

const stepUpAuthority = createHrxStepUpAuthority({
  secret: "hrx-step-up-route-secret",
  totpSecret: "hrx-step-up-route-totp",
  now: () => Date.parse("2026-07-02T00:00:00.000Z"),
});

const STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "security_audit",
  authority: stepUpAuthority,
});

const staleStepUpAuthority = createHrxStepUpAuthority({
  secret: "hrx-step-up-route-secret",
  totpSecret: "hrx-step-up-route-totp",
  now: () => Date.parse("2026-07-01T00:00:00.000Z"),
});

const STALE_STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "security_audit",
  authority: staleStepUpAuthority,
});

const LEAVE_ACCRUAL_STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "leave_accrual_execute",
  authority: stepUpAuthority,
});

const LEAVE_POLICY_STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "leave_policy_administration",
  authority: stepUpAuthority,
});

const LEAVE_LEDGER_STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "leave_ledger_adjustment",
  authority: stepUpAuthority,
});

const LEAVE_TERMINATION_STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "leave_termination_settlement",
  authority: stepUpAuthority,
});

const PAYROLL_STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
  actor_id: SESSION_ACCOUNT.user_id,
  purpose: "payroll_export_review",
  authority: stepUpAuthority,
});

const PAYROLL_PURPOSE_HEADERS = Object.freeze({
  payroll_export_review: PAYROLL_STEP_UP_HEADER,
  payroll_payment_processing: signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
    purpose: "payroll_payment_processing",
    authority: stepUpAuthority,
  }),
  payroll_filing_processing: signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
    purpose: "payroll_filing_processing",
    authority: stepUpAuthority,
  }),
  payroll_statement_self_service: signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
    purpose: "payroll_statement_self_service",
    authority: stepUpAuthority,
  }),
  payroll_year_end_processing: signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
    purpose: "payroll_year_end_processing",
    authority: stepUpAuthority,
  }),
  payroll_year_end_review: signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
    purpose: "payroll_year_end_review",
    authority: stepUpAuthority,
  }),
});

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0, stepUpAuthority });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
  baseHeaders = await signedHeaders(baseUrl, SESSION_ACCOUNT);
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX audit route requires fresh step-up context after authz allows scope", async () => {
  const challenged = await json("/api/hrx/audit", { headers: baseHeaders });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.step_up_required, true);

  const allowed = await json("/api/hrx/audit", {
    headers: { ...baseHeaders, "x-lawos-hrx-step-up": STEP_UP_HEADER },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");
  assert.ok(allowed.body.events.every((event) => event.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID));
});

test("HRX audit route rejects unsigned or mismatched step-up tokens", async () => {
  const unsigned = await json("/api/hrx/audit", {
    headers: {
      ...baseHeaders,
      "x-lawos-hrx-step-up": JSON.stringify({
        tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
        actor_id: SESSION_ACCOUNT.user_id,
        purpose: "security_audit",
        mfa: true,
        assurance_level: 2,
        expires_at: "2999-01-01T00:00:00.000Z",
      }),
    },
  });
  assert.equal(unsigned.status, 403);
  assert.equal(unsigned.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(unsigned.body.reason, "hrx_step_up_token_invalid");

  const mismatched = await json("/api/hrx/audit", {
    headers: {
      ...baseHeaders,
      "x-lawos-hrx-step-up": signedStepUpHeader({
        tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
        actor_id: "other-user",
        purpose: "security_audit",
        authority: stepUpAuthority,
      }),
    },
  });
  assert.equal(mismatched.status, 403);
  assert.equal(mismatched.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(mismatched.body.reason, "hrx_sensitive_action_requires_fresh_mfa");
});

test("HRX audit route rejects a stale signed step-up token", async () => {
  const stale = await json("/api/hrx/audit", {
    headers: { ...baseHeaders, "x-lawos-hrx-step-up": STALE_STEP_UP_HEADER },
  });
  assert.equal(stale.status, 403);
  assert.equal(stale.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(stale.body.reason, "hrx_step_up_token_expired");
});

test("leave accrual and ledger mutations require matching signed step-up purposes", async () => {
  const options = { method: "POST", headers: { ...baseHeaders, "content-type": "application/json" }, body: "{}" };
  const accrualChallenge = await json("/api/hrx/leave/accrual/execute", options);
  assert.equal(accrualChallenge.status, 403);
  assert.equal(accrualChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const accrualPurposeMismatch = await json("/api/hrx/leave/accrual/execute", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_LEDGER_STEP_UP_HEADER },
  });
  assert.equal(accrualPurposeMismatch.status, 403);
  assert.equal(accrualPurposeMismatch.body.reason, "hrx_step_up_purpose_mismatch");

  const accrualReachedRuntime = await json("/api/hrx/leave/accrual/execute", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_ACCRUAL_STEP_UP_HEADER },
  });
  assert.equal(accrualReachedRuntime.status, 400);
  assert.equal(accrualReachedRuntime.body.safe_error_code, "HRX_API_VALIDATION_ERROR");

  const ruleChallenge = await json("/api/hrx/leave/accrual/rules", options);
  assert.equal(ruleChallenge.status, 403);
  assert.equal(ruleChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  const rulePurposeMismatch = await json("/api/hrx/leave/accrual/rules", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_LEDGER_STEP_UP_HEADER },
  });
  assert.equal(rulePurposeMismatch.status, 403);
  assert.equal(rulePurposeMismatch.body.reason, "hrx_step_up_purpose_mismatch");
  const ruleReachedRuntime = await json("/api/hrx/leave/accrual/rules", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_ACCRUAL_STEP_UP_HEADER },
  });
  assert.equal(ruleReachedRuntime.status, 400);
  assert.equal(ruleReachedRuntime.body.safe_error_code, "HRX_API_VALIDATION_ERROR");

  const ledgerChallenge = await json("/api/hrx/leave/accrual/manual/execute", options);
  assert.equal(ledgerChallenge.status, 403);
  const ledgerReachedRuntime = await json("/api/hrx/leave/accrual/manual/execute", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_LEDGER_STEP_UP_HEADER },
  });
  assert.equal(ledgerReachedRuntime.status, 400);
  assert.equal(ledgerReachedRuntime.body.safe_error_code, "HRX_API_VALIDATION_ERROR");

  const terminationChallenge = await json("/api/hrx/leave/termination-reconciliations/execute", options);
  assert.equal(terminationChallenge.status, 403);
  assert.equal(terminationChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  const terminationPurposeMismatch = await json("/api/hrx/leave/termination-reconciliations/execute", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_LEDGER_STEP_UP_HEADER },
  });
  assert.equal(terminationPurposeMismatch.status, 403);
  assert.equal(terminationPurposeMismatch.body.reason, "hrx_step_up_purpose_mismatch");
  const terminationReachedRuntime = await json("/api/hrx/leave/termination-reconciliations/execute", {
    ...options,
    headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_TERMINATION_STEP_UP_HEADER },
  });
  assert.equal(terminationReachedRuntime.status, 400);
  assert.equal(terminationReachedRuntime.body.safe_error_code, "HRX_API_VALIDATION_ERROR");
});

test("leave policy create, update, publish, and version routes require matching signed step-up purpose", async () => {
  const groupId = "step-up-policy-group";
  const typeId = "step-up-policy-type";
  const policyId = "step-up-policy-v1";
  const mutations = [
    {
      path: "/api/hrx/leave/groups",
      method: "POST",
      body: { group_id: groupId, code: "STEP_UP_POLICY", display_name: "정책 보안 검증" },
      expectedStatus: 201,
    },
    {
      path: "/api/hrx/leave/types",
      method: "POST",
      body: {
        leave_type_id: typeId,
        group_id: groupId,
        code: "STEP_UP_POLICY_TYPE",
        display_name: "정책 보안 휴가",
        request_unit: "minutes",
      },
      expectedStatus: 201,
    },
    {
      path: "/api/hrx/leave/policies",
      method: "POST",
      body: {
        policy_version_id: policyId,
        group_id: groupId,
        policy_code: "step-up-policy",
        version: 1,
        effective_from: "2026-01-01",
        rules: { reserve_on_submit: true },
      },
      expectedStatus: 201,
    },
    {
      path: `/api/hrx/leave/groups/${groupId}`,
      method: "PATCH",
      body: { display_name: "정책 보안 검증 수정", expected_version: 1 },
      expectedStatus: 200,
    },
    {
      path: `/api/hrx/leave/types/${typeId}`,
      method: "PATCH",
      body: { display_name: "정책 보안 휴가 수정" },
      expectedStatus: 200,
    },
    {
      path: `/api/hrx/leave/policies/${policyId}`,
      method: "PATCH",
      body: { rules: { reserve_on_submit: false } },
      expectedStatus: 200,
    },
    {
      path: `/api/hrx/leave/policies/${policyId}/publish`,
      method: "POST",
      body: {},
      expectedStatus: 200,
    },
    {
      path: `/api/hrx/leave/policies/${policyId}/versions`,
      method: "POST",
      body: { policy_version_id: "step-up-policy-v2", effective_from: "2027-01-01" },
      expectedStatus: 201,
    },
  ];

  for (const mutation of mutations) {
    const options = {
      method: mutation.method,
      headers: { ...baseHeaders, "content-type": "application/json" },
      body: JSON.stringify(mutation.body),
    };
    const challenged = await json(mutation.path, options);
    assert.equal(challenged.status, 403, `${mutation.method} ${mutation.path} must require step-up`);
    assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

    const mismatched = await json(mutation.path, {
      ...options,
      headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_ACCRUAL_STEP_UP_HEADER },
    });
    assert.equal(mismatched.status, 403, `${mutation.method} ${mutation.path} must reject a mismatched purpose`);
    assert.equal(mismatched.body.reason, "hrx_step_up_purpose_mismatch");

    const allowed = await json(mutation.path, {
      ...options,
      headers: { ...options.headers, "x-lawos-hrx-step-up": LEAVE_POLICY_STEP_UP_HEADER },
    });
    assert.equal(allowed.status, mutation.expectedStatus, `${mutation.method} ${mutation.path} must accept matching step-up`);
  }
});

test("payroll catalog requires a matching signed payroll step-up token", async () => {
  const challenged = await json("/api/hrx/payroll/items", { headers: baseHeaders });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const mismatched = await json("/api/hrx/payroll/items", {
    headers: { ...baseHeaders, "x-lawos-hrx-step-up": LEAVE_ACCRUAL_STEP_UP_HEADER },
  });
  assert.equal(mismatched.status, 403);
  assert.equal(mismatched.body.reason, "hrx_step_up_purpose_mismatch");

  const allowed = await json("/api/hrx/payroll/items", {
    headers: { ...baseHeaders, "x-lawos-hrx-step-up": PAYROLL_STEP_UP_HEADER },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");
  assert.ok(Array.isArray(allowed.body.items));
});

test("payroll routes isolate every declared step-up purpose through the real route boundary", async () => {
  const routes = [
    {
      label: "export review",
      path: "/api/hrx/payroll/items",
      purpose: "payroll_export_review",
      expectedStatus: 200,
      expectedOutcome: "ok",
    },
    {
      label: "payment approval",
      method: "POST",
      path: "/api/hrx/payroll/payment-batches/step-up-missing-batch/approve",
      purpose: "payroll_payment_processing",
      expectedStatus: 404,
      expectedSafeErrorCode: "HRX_PAYROLL_PAYMENT_NOT_FOUND",
    },
    {
      label: "filing preparation",
      method: "POST",
      path: "/api/hrx/payroll/runs/step-up-missing-run/filings",
      purpose: "payroll_filing_processing",
      body: { filing_kind: "social_insurance" },
      expectedStatus: 404,
      expectedSafeErrorCode: "HRX_PAYROLL_NOT_FOUND",
    },
    {
      label: "filing submission",
      method: "POST",
      path: "/api/hrx/payroll/filings/step-up-missing-filing/submit",
      purpose: "payroll_filing_processing",
      expectedStatus: 404,
      expectedSafeErrorCode: "HRX_PAYROLL_FILING_NOT_FOUND",
    },
    {
      label: "statement self service",
      path: "/api/hrx/payroll/statements/step-up-missing-statement/download",
      purpose: "payroll_statement_self_service",
      expectedStatus: 404,
      expectedSafeErrorCode: "HRX_PAYROLL_STATEMENT_NOT_FOUND",
    },
    {
      label: "year-end processing",
      method: "POST",
      path: "/api/hrx/payroll/runs/step-up-missing-run/year-end/collect",
      purpose: "payroll_year_end_processing",
      expectedStatus: 404,
      expectedSafeErrorCode: "HRX_PAYROLL_NOT_FOUND",
    },
    {
      label: "year-end review",
      method: "POST",
      path: "/api/hrx/payroll/runs/step-up-missing-run/year-end/review",
      purpose: "payroll_year_end_review",
      expectedStatus: 409,
      expectedSafeErrorCode: "HRX_PAYROLL_YEAR_END_STATE_INVALID",
    },
  ];

  for (const route of routes) {
    const request = {
      method: route.method ?? "GET",
      headers: { ...baseHeaders },
      ...(route.body ? { body: JSON.stringify(route.body) } : {}),
    };
    if (route.body) request.headers["content-type"] = "application/json";

    const challenged = await json(route.path, request);
    assert.equal(challenged.status, 403, `${route.label} must require step-up`);
    assert.equal(challenged.body.required_purpose, route.purpose, `${route.label} must declare its exact purpose`);

    for (const [tokenPurpose, header] of Object.entries(PAYROLL_PURPOSE_HEADERS)) {
      if (tokenPurpose === route.purpose) continue;
      const denied = await json(route.path, {
        ...request,
        headers: { ...request.headers, "x-lawos-hrx-step-up": header },
      });
      assert.equal(denied.status, 403, `${route.label} must reject ${tokenPurpose}`);
      assert.equal(denied.body.reason, "hrx_step_up_purpose_mismatch", `${route.label} must isolate ${route.purpose}`);
    }

    const allowedThroughBoundary = await json(route.path, {
      ...request,
      headers: { ...request.headers, "x-lawos-hrx-step-up": PAYROLL_PURPOSE_HEADERS[route.purpose] },
    });
    assert.equal(allowedThroughBoundary.status, route.expectedStatus, `${route.label} must accept its declared purpose`);
    if (route.expectedSafeErrorCode) {
      assert.equal(allowedThroughBoundary.body.safe_error_code, route.expectedSafeErrorCode);
    } else {
      assert.equal(allowedThroughBoundary.body.outcome, route.expectedOutcome);
    }
  }
});

test("minimum wage legal approval requires the legal scope and matching payroll step-up purpose", async () => {
  const path = "/api/hrx/payroll/minimum-wage/missing-rule/legal-approve";
  const challenged = await json(path, {
    method: "POST",
    headers: { ...baseHeaders, "content-type": "application/json" },
    body: JSON.stringify({ expected_version: 1, legal_review_ref: "document:legal/missing-rule" }),
  });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const mismatched = await json(path, {
    method: "POST",
    headers: { ...baseHeaders, "content-type": "application/json", "x-lawos-hrx-step-up": LEAVE_ACCRUAL_STEP_UP_HEADER },
    body: JSON.stringify({ expected_version: 1, legal_review_ref: "document:legal/missing-rule" }),
  });
  assert.equal(mismatched.status, 403);
  assert.equal(mismatched.body.reason, "hrx_step_up_purpose_mismatch");

  const allowedThroughBoundary = await json(path, {
    method: "POST",
    headers: { ...baseHeaders, "content-type": "application/json", "x-lawos-hrx-step-up": PAYROLL_STEP_UP_HEADER },
    body: JSON.stringify({ expected_version: 1, legal_review_ref: "document:legal/missing-rule" }),
  });
  assert.equal(allowedThroughBoundary.body.safe_error_code, "HRX_PAYROLL_RULE_PUBLISH_DISABLED");
});
