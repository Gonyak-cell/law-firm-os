import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
  highestPrivilegeRegisteredAccount,
} from "../src/matter-vault-account-registry.js";
import {
  LAWOS_ROLE_REGISTRY_SOURCE,
  listLawosInternalRoleAssignments,
  resolveLawosUserRoleAssignment,
} from "../src/lawos-role-registry.js";
import { createHrxStepUpAuthority } from "../src/hrx-step-up-token.js";

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...(options ?? {}) });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

function user() {
  return highestPrivilegeRegisteredAccount();
}

function userByEmail(email) {
  const account = findRegisteredAccountByEmail(email);
  assert.ok(account, `registered account ${email} should exist`);
  return account;
}

async function login(baseUrl, account = user()) {
  return json(baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: account.email,
      password: account.local_dev.synthetic_token,
    },
  });
}

function forgedPermissionContext() {
  return JSON.stringify({
    principal: { user_id: "forged_user", tenant_id: "tenant_forged", role_ids: ["forged_admin"] },
    rules: [{ id: "forged-deny", effect: "deny", action: "*" }],
    object_acl: [],
  });
}

test("Auth descriptor exposes the Wave-1 API session surface", async () => {
  await withServer({}, async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    assert.equal(health.status, 200);
    assert.match(health.headers.get("access-control-allow-headers") ?? "", /authorization/);
    const authContext = health.body.bounded_contexts.find((context) => context.bounded_context === "api-auth");
    assert.ok(authContext);
    assert.deepEqual(authContext.endpoints, ["POST /api/auth/login", "GET /api/auth/session", "POST /api/auth/step-up"]);
    assert.equal(authContext.fail_closed, true);
    assert.equal(authContext.production_ready_claim, false);
    assert.equal(authContext.role_registry_source, LAWOS_ROLE_REGISTRY_SOURCE);
    assert.match(authContext.step_up_contract_ref, /#UPL-A-04$/);
    assert.match(authContext.login_protection_contract_ref, /#UPL-A-14$/);
    assert.equal(authContext.max_failed_logins_before_lock, 5);
    assert.equal(authContext.lock_response_status, 423);
  });
});

test("POST /api/auth/login issues a signed session token for the registered roster", async () => {
  await withServer({}, async (baseUrl) => {
    const account = user();
    const response = await login(baseUrl);
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "passed");
    assert.match(response.body.session_token, /^lawos_session_v1\./);
    assert.equal(response.body.token_type, "Bearer");
    assert.equal(response.body.session.user_id, account.user_id);
    assert.equal(response.body.session.tenant_id, MATTER_VAULT_REGISTERED_TENANT_ID);
    assert.equal(response.body.session.session_principal_source, "api_signed_session");
    assert.ok(response.body.session.role_ids.includes("lawos_admin"));
    assert.ok(response.body.session.hrx_scopes.includes("hrx.payroll.export"));

    const session = await json(baseUrl, "/api/auth/session", {
      headers: { authorization: `Bearer ${response.body.session_token}` },
    });
    assert.equal(session.status, 200);
    assert.equal(session.body.session.user_id, account.user_id);
    assert.equal(session.body.session.token_material_returned, false);
  });
});

test("POST /api/auth/step-up issues signed HRX step-up tokens for signed sessions", async () => {
  let now = Date.parse("2026-07-02T00:00:00.000Z");
  const stepUpAuthority = createHrxStepUpAuthority({
    secret: "session-auth-step-up-secret",
    totpSecret: "session-auth-step-up-totp",
    now: () => now,
  });
  const sessionAuth = createApiSessionAuth({
    secret: "session-auth-step-up-session",
    now: () => now,
    stepUpAuthority,
  });

  await withServer({ sessionAuth, stepUpAuthority }, async (baseUrl) => {
    const account = user();
    const signed = await login(baseUrl, account);
    assert.equal(signed.status, 200);
    const headers = { authorization: `Bearer ${signed.body.session_token}` };

    const wrongTotp = await json(baseUrl, "/api/auth/step-up", {
      method: "POST",
      headers,
      body: { purpose: "security_audit", totp_code: "000000" },
    });
    assert.equal(wrongTotp.status, 403);
    assert.deepEqual(wrongTotp.body.safe_error_codes, ["HRX_STEP_UP_TOTP_INVALID"]);

    const totp = stepUpAuthority.generateTotp({
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      actor_id: account.user_id,
      purpose: "security_audit",
    });
    const stepUp = await json(baseUrl, "/api/auth/step-up", {
      method: "POST",
      headers,
      body: { purpose: "security_audit", totp_code: totp },
    });
    assert.equal(stepUp.status, 200);
    assert.match(stepUp.body.step_up_token, /^lawos_hrx_step_up_v1\./);
    assert.equal(stepUp.body.step_up_session.purpose, "security_audit");

    const audit = await json(baseUrl, "/api/hrx/audit", {
      headers: { ...headers, "x-lawos-hrx-step-up": stepUp.body.step_up_token },
    });
    assert.equal(audit.status, 200);
    assert.equal(audit.body.outcome, "ok");

    now += 5 * 60 * 1000 + 1;
    const expired = await json(baseUrl, "/api/hrx/audit", {
      headers: { ...headers, "x-lawos-hrx-step-up": stepUp.body.step_up_token },
    });
    assert.equal(expired.status, 403);
    assert.equal(expired.body.reason, "hrx_step_up_token_expired");
  });
});

test("Server role registry maps the 9-person roster outside the login seed", async () => {
  const staff = userByEmail("yjlee@amic.kr");
  const staffAssignment = resolveLawosUserRoleAssignment(staff);
  assert.equal(listLawosInternalRoleAssignments().length, 9);
  assert.equal(staffAssignment.role_profile_id, "lawos_staff");
  assert.deepEqual(staffAssignment.role_ids, ["lawos_staff"]);
  assert.ok(staffAssignment.scopes.includes("hrx.employee.read"));
  assert.ok(staffAssignment.scopes.includes("hrx.leave.write"));
  assert.equal(staffAssignment.scopes.includes("hrx.payroll.export"), false);
  assert.equal(staffAssignment.scopes.includes("hrx.audit.read"), false);

  await withServer({}, async (baseUrl) => {
    const response = await login(baseUrl, staff);
    assert.equal(response.status, 200);
    assert.equal(response.body.session.role_profile_id, "lawos_staff");
    assert.deepEqual(response.body.session.role_ids, ["lawos_staff"]);
    assert.ok(response.body.session.hrx_scopes.includes("hrx.employee.read"));
    assert.equal(response.body.session.hrx_scopes.includes("hrx.payroll.export"), false);
  });
});

test("Signed staff sessions can read only their own HRX records and cannot access payroll or audit", async () => {
  await withServer({}, async (baseUrl) => {
    const signed = await login(baseUrl, userByEmail("yjlee@amic.kr"));
    assert.equal(signed.status, 200);
    const headers = { authorization: `Bearer ${signed.body.session_token}` };

    const employees = await json(baseUrl, "/api/hrx/employees", { headers });
    assert.equal(employees.status, 200);
    assert.deepEqual(employees.body.employees.map((employee) => employee.employee_id), ["emp_amic_yjlee"]);
    assert.equal(employees.body.permission_summary.self_service_filtered, true);

    const ownEmployee = await json(baseUrl, "/api/hrx/employees/emp_amic_yjlee", { headers });
    assert.equal(ownEmployee.status, 200);
    assert.equal(ownEmployee.body.employee.employee_id, "emp_amic_yjlee");

    const otherEmployee = await json(baseUrl, "/api/hrx/employees/emp_amic_ytkim", { headers });
    assert.equal(otherEmployee.status, 403);
    assert.equal(otherEmployee.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");

    const ownDocuments = await json(baseUrl, "/api/hrx/documents?employee_id=emp_amic_yjlee", { headers });
    assert.equal(ownDocuments.status, 200);
    assert.ok(Array.isArray(ownDocuments.body.documents));

    const otherDocuments = await json(baseUrl, "/api/hrx/documents?employee_id=emp_amic_ytkim", { headers });
    assert.equal(otherDocuments.status, 403);
    assert.equal(otherDocuments.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");

    const ownLeave = await json(baseUrl, "/api/hrx/leave?employee_id=emp_amic_yjlee&policy_id=pto-us", { headers });
    assert.equal(ownLeave.status, 200);
    assert.ok("balance" in ownLeave.body);

    const otherLeave = await json(baseUrl, "/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us", { headers });
    assert.equal(otherLeave.status, 403);
    assert.equal(otherLeave.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");

    const compensation = await json(baseUrl, "/api/hrx/compensation?employee_id=emp_amic_yjlee", { headers });
    assert.equal(compensation.status, 403);
    assert.equal(compensation.body.reason, "hrx_scope_required");
    assert.equal(compensation.body.required_scope, "hrx.compensation.read");

    const payroll = await json(baseUrl, "/api/hrx/payroll/preview", {
      method: "POST",
      headers,
      body: {},
    });
    assert.equal(payroll.status, 403);
    assert.equal(payroll.body.reason, "hrx_scope_required");
    assert.equal(payroll.body.required_scope, "hrx.payroll.preview");

    const audit = await json(baseUrl, "/api/hrx/audit", { headers });
    assert.equal(audit.status, 403);
    assert.equal(audit.body.reason, "hrx_scope_required");
    assert.equal(audit.body.required_scope, "hrx.audit.read");
  });
});

test("Auth rejects bad credentials, missing sessions, and expired signed tokens", async () => {
  let now = Date.parse("2026-07-02T00:00:00.000Z");
  const sessionAuth = createApiSessionAuth({ secret: "session-auth-api-test", ttlMs: 1000, now: () => now });

  await withServer({ sessionAuth }, async (baseUrl) => {
    const badLogin = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: user().email, password: "wrong" },
    });
    assert.equal(badLogin.status, 401);
    assert.deepEqual(badLogin.body.safe_error_codes, ["AUTH_CREDENTIAL_INVALID"]);

    const missingSession = await json(baseUrl, "/api/auth/session");
    assert.equal(missingSession.status, 401);
    assert.deepEqual(missingSession.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);

    const goodLogin = await login(baseUrl);
    now += 1001;
    const expired = await json(baseUrl, "/api/auth/session", {
      headers: { authorization: `Bearer ${goodLogin.body.session_token}` },
    });
    assert.equal(expired.status, 401);
    assert.deepEqual(expired.body.safe_error_codes, ["AUTH_SESSION_EXPIRED"]);
  });
});

test("Auth locks an account after repeated bad login attempts", async () => {
  let now = Date.parse("2026-07-02T00:00:00.000Z");
  const sessionAuth = createApiSessionAuth({
    secret: "session-auth-lock-test",
    maxFailedLogins: 5,
    loginLockMs: 60_000,
    now: () => now,
  });

  await withServer({ sessionAuth }, async (baseUrl) => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const badLogin = await json(baseUrl, "/api/auth/login", {
        method: "POST",
        body: { email: user().email, password: `wrong-${attempt}` },
      });
      assert.equal(badLogin.status, 401);
    }

    const fifth = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: user().email, password: "wrong-5" },
    });
    assert.equal(fifth.status, 401);

    const locked = await login(baseUrl);
    assert.equal(locked.status, 423);
    assert.deepEqual(locked.body.safe_error_codes, ["AUTH_LOGIN_LOCKED"]);
    assert.match(locked.body.locked_until, /^2026-07-02T00:01:00\.000Z$/);

    now += 60_001;
    const loginAfterLockExpiry = await login(baseUrl);
    assert.equal(loginAfterLockExpiry.status, 200);
    assert.equal(loginAfterLockExpiry.body.outcome, "passed");
    assert.match(loginAfterLockExpiry.body.session_token, /^lawos_session_v1\./);

    const resetCounter = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: user().email, password: "wrong-after-lock-expiry" },
    });
    assert.equal(resetCounter.status, 401);
    assert.deepEqual(resetCounter.body.safe_error_codes, ["AUTH_CREDENTIAL_INVALID"]);
  });
});

test("Signed sessions override forged permission contexts and invalid bearer tokens fail closed", async () => {
  await withServer({}, async (baseUrl) => {
    const account = user();
    const signed = await login(baseUrl);
    const profilePath = "/api/profile/me?permission_ref=ui_profile_me&audit_hint_ref=ui_profile_me_probe";

    const forgedHeaderIgnored = await json(baseUrl, profilePath, {
      headers: {
        authorization: `Bearer ${signed.body.session_token}`,
        "x-lawos-permission-context": forgedPermissionContext(),
      },
    });
    assert.equal(forgedHeaderIgnored.status, 200);
    assert.equal(forgedHeaderIgnored.body.item.actor_ref, account.user_id);
    assert.equal(forgedHeaderIgnored.body.item.tenant_ref, MATTER_VAULT_REGISTERED_TENANT_ID);
    assert.equal(forgedHeaderIgnored.body.item.account_summary.session_principal_source, "api_signed_session");

    const invalidBearerWins = await json(baseUrl, profilePath, {
      headers: {
        authorization: "Bearer lawos_session_v1.forged.invalid",
        "x-lawos-permission-context": JSON.stringify({
          principal: { user_id: "legacy_allowed", tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID, role_ids: ["master_data_reader"] },
          rules: [{ id: "legacy-allow", effect: "allow", action: "*" }],
          object_acl: [],
        }),
      },
    });
    assert.equal(invalidBearerWins.status, 401);
    assert.deepEqual(invalidBearerWins.body.safe_error_codes, ["AUTH_SESSION_INVALID"]);
  });
});
