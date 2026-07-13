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
