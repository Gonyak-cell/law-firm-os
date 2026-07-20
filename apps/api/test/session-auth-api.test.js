import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createLocalInternalStepUpProvider,
  createPostgresIdentityLedger,
} from "../../../packages/runtime-auth/src/index.js";
import { startApiServer } from "../src/server.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import {
  LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
  LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
  createAuthCredentialRecord,
  createScryptPasswordHash,
} from "../src/auth-credential-store.js";
import {
  MATTER_VAULT_USER_REGISTRATION_SEED,
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
import { evaluateRouteDecision } from "../src/permission-gate.js";

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

async function text(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method: options.method ?? "GET" });
  return { status: response.status, body: await response.text(), headers: response.headers };
}

function user() {
  return highestPrivilegeRegisteredAccount();
}

function userByEmail(email) {
  const account = findRegisteredAccountByEmail(email);
  assert.ok(account, `registered account ${email} should exist`);
  return account;
}

async function provisionDirectoryAccount(ledger, account, tenantId = MATTER_VAULT_REGISTERED_TENANT_ID) {
  const assignment = resolveLawosUserRoleAssignment(account, { tenantId });
  return ledger.provisionDirectoryUser({
    tenant_id: tenantId,
    user: account,
    membership: {
      ...assignment.tenant_membership,
      role_profile_id: assignment.role_profile_id,
      hrx_scopes: assignment.hrx_scopes,
      source_ref: assignment.source_ref,
    },
    actor_id: "synthetic-test-provisioner",
  });
}

function disabledProductionUser() {
  const account = MATTER_VAULT_USER_REGISTRATION_SEED.users.find((candidate) => (
    candidate.status === "disabled" ||
    candidate.production_status === "disabled" ||
    candidate.qa_tenant_scope === "synthetic_only"
  ));
  assert.ok(account, "disabled production QA account should exist");
  return account;
}

function credentialStorePathFor(records) {
  const root = mkdtempSync(join(tmpdir(), "lawos-s2-auth-"));
  const filePath = join(root, "credential-store.json");
  writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
        provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
        records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return filePath;
}

function passwordResetStorePath() {
  const root = mkdtempSync(join(tmpdir(), "lawos-s2-reset-"));
  return join(root, "password-reset-store.json");
}

function credentialRecord(account, password, options = {}) {
  return createAuthCredentialRecord({
    user_id: account.user_id,
    email: account.email,
    password,
    status: options.status ?? "active",
    credential_rev: options.credential_rev ?? 1,
  });
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

function forgedAllowPermissionContext() {
  return JSON.stringify({
    principal: {
      user_id: "legacy_allowed",
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      role_ids: ["lawos_admin"],
    },
    rules: [{ id: "legacy-allow", effect: "allow", action: "*" }],
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
    assert.deepEqual(authContext.endpoints, [
      "POST /api/auth/login",
      "POST /api/auth/oidc/start",
      "POST /api/auth/oidc/complete",
      "GET /api/auth/session",
      "POST /api/auth/logout",
      "POST /api/auth/step-up",
      "GET /api/auth/password-reset/open",
      "POST /api/auth/password-reset/request",
      "POST /api/auth/password-reset/confirm",
    ]);
    assert.equal(authContext.fail_closed, true);
    assert.equal(authContext.production_ready_claim, false);
    assert.equal(authContext.role_registry_source, LAWOS_ROLE_REGISTRY_SOURCE);
    assert.match(authContext.step_up_contract_ref, /#UPL-A-04$/);
    assert.match(authContext.login_protection_contract_ref, /#UPL-A-14$/);
    assert.equal(authContext.max_failed_logins_before_lock, 5);
    assert.equal(authContext.lock_response_status, 423);
    assert.equal(authContext.operational_auth_provider, LAWOS_INTERNAL_PASSWORD_PROVIDER_ID);
  });
});

test("GET /api/auth/password-reset/open returns a browser bridge page without server-side token query", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await text(baseUrl, "/api/auth/password-reset/open");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(response.body, /Matter 열기/);
    assert.match(response.body, /id="reset-form"/);
    assert.match(response.body, /id="new-password"/);
    assert.match(response.body, /id="confirm-password"/);
    assert.match(response.body, /fetch\("\/api\/auth\/password-reset\/confirm"/);
    assert.match(response.body, /window\.location\.hash/);
    assert.match(response.body, /matter:\/\/password-reset\/confirm\?token=/);
    assert.doesNotMatch(response.body, /reset-token-value/);

    const methodBlocked = await json(baseUrl, "/api/auth/password-reset/open", { method: "POST", body: {} });
    assert.equal(methodBlocked.status, 405);
    assert.equal(methodBlocked.body.outcome, "blocked");
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

test("Signed-session permission rules enforce verified scopes without a universal allow", async () => {
  const staff = userByEmail("yjlee@amic.kr");
  const auth = createApiSessionAuth({ secret: "scope-bound-session-test-secret" });
  const signed = await auth.login({
    email: staff.email,
    password: staff.local_dev.synthetic_token,
  }, { requestId: "req_scope_bound_login" });
  assert.equal(signed.status, 200);
  const verified = await auth.verifyToken(signed.body.session_token, { requestId: "req_scope_bound_verify" });
  assert.equal(verified.ok, true);
  assert.equal(verified.context.rules.some((rule) => rule.action === "*"), false);

  const decide = (action) => evaluateRouteDecision({
    context: verified.context,
    resource: { tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID, resource_type: "ScopeProbe" },
    action,
  });
  assert.equal(decide("matter:read").effect, "allow");
  assert.equal(decide("dms:document:read").effect, "allow");
  assert.equal(decide("matter:status:transition").effect, "deny");
  assert.equal(decide("dms:document:write").effect, "deny");
  assert.equal(decide("analytics:finance:read").effect, "deny");

  const password = "scope-bound-operational-password";
  const operational = createApiSessionAuth({
    profile: "operational",
    secret: "scope-bound-operational-session-secret",
    credentialStorePath: credentialStorePathFor([credentialRecord(staff, password)]),
    passwordResetTokenStorePath: passwordResetStorePath(),
  });
  const operationalSigned = await operational.login({ email: staff.email, password }, { requestId: "req_scope_operational_login" });
  const operationalVerified = await operational.verifyToken(operationalSigned.body.session_token, { requestId: "req_scope_operational_verify" });
  assert.equal(operationalVerified.ok, true);
  assert.equal(evaluateRouteDecision({
    context: operationalVerified.context,
    resource: { tenant_id: "tenant_rp04_synthetic", resource_type: "ScopeProbe" },
    action: "matter:read",
  }).reason, "cross_tenant_deny");
});

test("Local-dev sessions use per-instance secrets and operational synthetic login is disabled", async () => {
  const account = user();
  const credentialStorePath = credentialStorePathFor([credentialRecord(account, "operational-password-1")]);
  const firstAuth = createApiSessionAuth({ now: () => Date.parse("2026-07-02T00:00:00.000Z") });
  const secondAuth = createApiSessionAuth({ now: () => Date.parse("2026-07-02T00:00:00.000Z") });
  const signed = await firstAuth.login({
    email: account.email,
    password: account.local_dev.synthetic_token,
  }, { requestId: "req_local_dev_random_secret" });
  assert.equal(signed.status, 200);
  const crossVerify = await secondAuth.verifyToken(signed.body.session_token, { requestId: "req_cross_verify" });
  assert.equal(crossVerify.status, 401);
  assert.deepEqual(crossVerify.body.safe_error_codes, ["AUTH_SESSION_INVALID"]);

  assert.throws(
    () => createApiSessionAuth({ profile: "operational" }),
    /LAWOS_API_SESSION_SECRET is required/,
  );
  assert.throws(
    () => createApiSessionAuth({
      profile: "operational",
      secret: "operational-session-secret-32-bytes",
    }),
    /LAWOS_AUTH_CREDENTIAL_STORE_PATH is required/,
  );
  assert.throws(
    () => createApiSessionAuth({
      profile: "operational",
      secret: "operational-session-secret-32-bytes",
      credentialStorePath,
    }),
    /LAWOS_AUTH_PASSWORD_RESET_STORE_PATH is required/,
  );
  const operationalAuth = createApiSessionAuth({
    profile: "operational",
    secret: "operational-session-secret-32-bytes",
    credentialStorePath,
    passwordResetTokenStorePath: passwordResetStorePath(),
  });
  const operationalLogin = await operationalAuth.login({
    email: account.email,
    password: account.local_dev.synthetic_token,
  }, { requestId: "req_operational_synthetic_disabled" });
  assert.equal(operationalLogin.status, 403);
  assert.deepEqual(operationalLogin.body.safe_error_codes, ["AUTH_SYNTHETIC_LOGIN_DISABLED"]);
});

test("Operational credential-store sessions verify across cold starts with credential revision checks", async () => {
  const account = user();
  const fixedSecret = "operational-session-secret-32-bytes";
  const password = "operational-password-1";
  const credentialStorePath = credentialStorePathFor([credentialRecord(account, password, { credential_rev: 7 })]);
  const issuedAt = Date.parse("2026-07-06T00:00:00.000Z");
  const signingAuth = createApiSessionAuth({
    profile: "operational",
    secret: fixedSecret,
    credentialStorePath,
    passwordResetTokenStorePath: passwordResetStorePath(),
    now: () => issuedAt,
  });
  const signed = await signingAuth.login({
    email: account.email,
    password,
  }, { requestId: "req_s1_fixed_secret_sign" });
  assert.equal(signed.status, 200);
  assert.equal(signed.body.credential_provider, LAWOS_INTERNAL_PASSWORD_PROVIDER_ID);
  assert.equal(signed.body.local_dev_synthetic_only, false);
  assert.equal(signed.body.session.credential_rev, 7);

  const restartedOperationalAuth = createApiSessionAuth({
    profile: "operational",
    secret: fixedSecret,
    credentialStorePath,
    passwordResetTokenStorePath: passwordResetStorePath(),
    now: () => issuedAt + 1000,
  });
  const verified = await restartedOperationalAuth.verifyToken(signed.body.session_token, {
    requestId: "req_s1_fixed_secret_verify",
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.session.user_id, account.user_id);
  assert.equal(verified.principal.source, "api-signed-session");
  assert.equal(verified.context.principal.session_principal_source, "api_signed_session");
  assert.ok(verified.context.principal.role_ids.includes("lawos_admin"));
  assert.equal(verified.principal.credential_rev, 7);

  const rotatedCredentialStorePath = credentialStorePathFor([credentialRecord(account, password, { credential_rev: 8 })]);
  const rotatedAuth = createApiSessionAuth({
    profile: "operational",
    secret: fixedSecret,
    credentialStorePath: rotatedCredentialStorePath,
    passwordResetTokenStorePath: passwordResetStorePath(),
    now: () => issuedAt + 1000,
  });
  const revoked = await rotatedAuth.verifyToken(signed.body.session_token, {
    requestId: "req_s2_credential_revoked",
  });
  assert.equal(revoked.status, 401);
  assert.deepEqual(revoked.body.safe_error_codes, ["AUTH_CREDENTIAL_REVOKED"]);

  const wrongSecretAuth = createApiSessionAuth({
    profile: "operational",
    secret: "different-operational-session-secret-32",
    credentialStorePath,
    passwordResetTokenStorePath: passwordResetStorePath(),
    now: () => issuedAt + 1000,
  });
  const rejected = await wrongSecretAuth.verifyToken(signed.body.session_token, {
    requestId: "req_s1_wrong_secret_verify",
  });
  assert.equal(rejected.status, 401);
  assert.deepEqual(rejected.body.safe_error_codes, ["AUTH_SESSION_INVALID"]);
});

test("Operational /api/auth/login uses credential store and rejects synthetic tokens on protected routes", async () => {
  const account = user();
  const password = "operational-password-2";
  const credentialStorePath = credentialStorePathFor([credentialRecord(account, password, { credential_rev: 3 })]);
  const sessionAuth = createApiSessionAuth({
    profile: "operational",
    secret: "operational-http-session-secret-32",
    credentialStorePath,
    passwordResetTokenStorePath: passwordResetStorePath(),
    now: () => Date.parse("2026-07-06T00:00:00.000Z"),
  });

  await withServer({ sessionAuth }, async (baseUrl) => {
    const synthetic = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: account.local_dev.synthetic_token },
    });
    assert.equal(synthetic.status, 403);
    assert.deepEqual(synthetic.body.safe_error_codes, ["AUTH_SYNTHETIC_LOGIN_DISABLED"]);

    const signed = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password },
    });
    assert.equal(signed.status, 200);
    assert.equal(signed.body.credential_provider, LAWOS_INTERNAL_PASSWORD_PROVIDER_ID);
    assert.equal(signed.body.local_dev_synthetic_only, false);
    assert.equal(signed.body.session.credential_rev, 3);
    assert.equal(signed.body.session.token_material_returned, false);
    assert.equal(JSON.stringify(signed.body).includes(password), false);

    const profile = await json(baseUrl, "/api/profile/me?permission_ref=ui_profile_me&audit_hint_ref=s2_operational_auth", {
      headers: { authorization: `Bearer ${signed.body.session_token}` },
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.item.actor_ref, account.user_id);
    assert.equal(profile.body.item.display_name, account.display_name);
    assert.equal(profile.body.item.account_summary.session_principal_source, "api_signed_session");
  });
});

test("Operational password reset uses email delivery, hash-only tokens, and one-time confirm", async () => {
  let now = Date.parse("2026-07-06T03:00:00.000Z");
  const account = user();
  const oldPassword = "operational-reset-old-password";
  const newPassword = "operational-reset-new-password";
  const credentialStorePath = credentialStorePathFor([credentialRecord(account, oldPassword, { credential_rev: 3 })]);
  const resetStorePath = passwordResetStorePath();
  let delivered = null;
  const sessionAuth = createApiSessionAuth({
    profile: "operational",
    secret: "operational-reset-session-secret-32",
    credentialStorePath,
    passwordResetTokenStorePath: resetStorePath,
    passwordResetTtlMs: 60_000,
    passwordResetEmailDelivery: async ({ to, token, expires_at }) => {
      delivered = { to, token, expires_at };
      return { mode: "email", provider: "test-delivery", status: "sent", message_id: "msg_reset_1" };
    },
    now: () => now,
  });

  await withServer({ sessionAuth }, async (baseUrl) => {
    const requested = await json(baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      body: { email: account.email },
    });
    assert.equal(requested.status, 200);
    assert.equal(requested.body.outcome, "accepted");
    assert.equal(requested.body.email_delivery.status, "accepted");
    assert.equal(requested.body.email_delivery.token_material_returned, false);
    assert.equal(requested.body.email_delivery.reset_url_returned, false);
    const unknown = await json(baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      body: { email: "unknown-staff@example.invalid" },
    });
    assert.equal(unknown.status, requested.status);
    assert.deepEqual(
      { outcome: unknown.body.outcome, ok: unknown.body.ok, accepted: unknown.body.accepted, email_delivery: unknown.body.email_delivery },
      { outcome: requested.body.outcome, ok: requested.body.ok, accepted: requested.body.accepted, email_delivery: requested.body.email_delivery },
    );
    assert.equal(delivered?.to, account.email);
    assert.ok(delivered?.token);
    assert.equal(JSON.stringify(requested.body).includes(delivered.token), false);

    const blockedOldPassword = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: oldPassword },
    });
    assert.equal(blockedOldPassword.status, 403);
    assert.deepEqual(blockedOldPassword.body.safe_error_codes, ["AUTH_PASSWORD_RESET_REQUIRED"]);

    const invalid = await json(baseUrl, "/api/auth/password-reset/confirm", {
      method: "POST",
      body: { token: "invalid-reset-token", password: newPassword },
    });
    assert.equal(invalid.status, 401);
    assert.deepEqual(invalid.body.safe_error_codes, ["AUTH_PASSWORD_RESET_TOKEN_INVALID"]);

    const confirmed = await json(baseUrl, "/api/auth/password-reset/confirm", {
      method: "POST",
      body: { token: delivered.token, password: newPassword },
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.activated, true);
    assert.equal(confirmed.body.token_material_returned, false);
    assert.equal(JSON.stringify(confirmed.body).includes(delivered.token), false);

    const reused = await json(baseUrl, "/api/auth/password-reset/confirm", {
      method: "POST",
      body: { token: delivered.token, password: "another-reset-password" },
    });
    assert.equal(reused.status, 401);
    assert.deepEqual(reused.body.safe_error_codes, ["AUTH_PASSWORD_RESET_TOKEN_USED"]);

    const signed = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: newPassword },
    });
    assert.equal(signed.status, 200);
    assert.equal(signed.body.must_change_password, false);
    assert.equal(signed.body.credential_provider, LAWOS_INTERNAL_PASSWORD_PROVIDER_ID);
  });

});

test("Operational password reset hides production-disabled QA account state", async () => {
  const account = disabledProductionUser();
  const password = "qa-disabled-password";
  let deliveryCalled = false;
  const sessionAuth = createApiSessionAuth({
    profile: "operational",
    secret: "operational-disabled-reset-secret-32",
    credentialStorePath: credentialStorePathFor([credentialRecord(account, password, { status: "disabled" })]),
    passwordResetTokenStorePath: passwordResetStorePath(),
    passwordResetEmailDelivery: async () => {
      deliveryCalled = true;
      return { mode: "email", provider: "test-delivery", status: "sent", message_id: "unexpected" };
    },
  });

  await withServer({ sessionAuth }, async (baseUrl) => {
    const reset = await json(baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      body: { email: account.email },
    });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.outcome, "accepted");
    assert.equal(reset.body.email_delivery.status, "accepted");
    assert.equal(deliveryCalled, false);

    const loginRejected = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password },
    });
    assert.equal(loginRejected.status, 403);
    assert.deepEqual(loginRejected.body.safe_error_codes, ["AUTH_ACCOUNT_DISABLED"]);
  });
});

test("Operational password reset delivery failure does not force reset-required login lockout", async () => {
  const account = user();
  const password = "delivery-failure-keeps-old-password";
  async function assertFailedDeliveryDoesNotLockOut({ passwordResetEmailDelivery }) {
    const sessionAuth = createApiSessionAuth({
      profile: "operational",
      secret: "operational-reset-failure-secret-32",
      credentialStorePath: credentialStorePathFor([credentialRecord(account, password, { credential_rev: 4 })]),
      passwordResetTokenStorePath: passwordResetStorePath(),
      passwordResetEmailDelivery,
    });
    await withServer({ sessionAuth }, async (baseUrl) => {
      const reset = await json(baseUrl, "/api/auth/password-reset/request", {
        method: "POST",
        body: { email: account.email },
      });
      assert.equal(reset.status, 200);
      assert.equal(reset.body.email_delivery.status, "accepted");

      const stillValid = await json(baseUrl, "/api/auth/login", {
        method: "POST",
        body: { email: account.email, password },
      });
      assert.equal(stillValid.status, 200);
      assert.equal(stillValid.body.session.credential_rev, 4);
    });
  }

  await assertFailedDeliveryDoesNotLockOut({
    passwordResetEmailDelivery: async () => ({
      mode: "email",
      provider: "test-delivery",
      status: "failed",
      message_id: null,
    }),
  });
  await assertFailedDeliveryDoesNotLockOut({
    passwordResetEmailDelivery: async () => {
      throw new Error("simulated network failure");
    },
  });
});

test("Operational password reset delivery exception does not expose exception text", async () => {
  const account = user();
  const password = "delivery-exception-keeps-old-password";
  const sessionAuth = createApiSessionAuth({
    profile: "operational",
    secret: "operational-reset-exception-secret-32",
    credentialStorePath: credentialStorePathFor([credentialRecord(account, password, { credential_rev: 5 })]),
    passwordResetTokenStorePath: passwordResetStorePath(),
    passwordResetEmailDelivery: async () => {
      throw new Error("network failure with hidden internals");
    },
  });

  await withServer({ sessionAuth }, async (baseUrl) => {
    const reset = await json(baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      body: { email: account.email },
    });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.email_delivery.status, "accepted");
    assert.equal(JSON.stringify(reset.body).includes("network failure"), false);

    const stillValid = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password },
    });
    assert.equal(stillValid.status, 200);
    assert.equal(stillValid.body.session.credential_rev, 5);
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

test("PostgreSQL identity auth persists reset, step-up, logout, and break-glass state without secret audit material", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  let now = Date.parse("2026-07-16T02:00:00.000Z");
  const account = user();
  const tenantId = MATTER_VAULT_REGISTERED_TENANT_ID;
  const oldPassword = "postgres-identity-old-password";
  const newPassword = "postgres-identity-new-password";
  const acceptedProof = "provider-proof-accepted";
  const rejectedProof = "provider-proof-rejected";
  let delivered = null;
  const ledger = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => now });
  await provisionDirectoryAccount(ledger, account, tenantId);
  await ledger.setCredential({
    tenant_id: tenantId,
    user: account,
    provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
    password_hash: createScryptPasswordHash(oldPassword),
    status: "active",
    actor_id: account.user_id,
  });
  const stepUpProvider = createLocalInternalStepUpProvider({
    providerId: "test-local-step-up",
    factors: ["totp", "passkey"],
    verifyProof: async (input) => input.proof === acceptedProof
      ? { ok: true, assertion_id: "assertion-postgres-001" }
      : { ok: false, reason: "proof_invalid" },
  });
  const stepUpAuthority = createHrxStepUpAuthority({
    secret: "postgres-identity-step-up-secret",
    totpSecret: "postgres-identity-step-up-totp",
    now: () => now,
  });
  const sessionAuth = createApiSessionAuth({
    profile: "operational",
    secret: "postgres-identity-session-secret-32-bytes",
    identityRepository: ledger,
    passwordResetTtlMs: 60_000,
    passwordResetEmailDelivery: async ({ to, token, expires_at }) => {
      delivered = { to, token, expires_at };
      return { mode: "email", provider: "test-delivery", status: "sent", message_id: "postgres-reset-001" };
    },
    stepUpAuthority,
    stepUpProvider,
    now: () => now,
  });

  await withServer({ sessionAuth, stepUpAuthority }, async (baseUrl) => {
    const signed = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: oldPassword },
    });
    assert.equal(signed.status, 200);
    const headers = { authorization: `Bearer ${signed.body.session_token}` };

    const rejectedStepUp = await json(baseUrl, "/api/auth/step-up", {
      method: "POST",
      headers,
      body: { purpose: "security_audit", factor: "totp", proof: rejectedProof },
    });
    assert.equal(rejectedStepUp.status, 403);
    assert.deepEqual(rejectedStepUp.body.safe_error_codes, ["HRX_STEP_UP_PROVIDER_INVALID"]);

    const acceptedStepUp = await json(baseUrl, "/api/auth/step-up", {
      method: "POST",
      headers,
      body: { purpose: "security_audit", factor: "totp", proof: acceptedProof },
    });
    assert.equal(acceptedStepUp.status, 200);
    assert.match(acceptedStepUp.body.step_up_token, /^lawos_hrx_step_up_v1\./);

    const parallelSession = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: oldPassword },
    });
    assert.equal(parallelSession.status, 200);
    const crossSessionStepUp = await json(baseUrl, "/api/hrx/audit", {
      headers: {
        authorization: `Bearer ${parallelSession.body.session_token}`,
        "x-lawos-hrx-step-up": acceptedStepUp.body.step_up_token,
      },
    });
    assert.equal(crossSessionStepUp.status, 403);
    assert.equal(crossSessionStepUp.body.reason, "hrx_sensitive_action_requires_fresh_mfa");

    const storedStepUp = await withPostgresTransaction(fixture.appPool, { tenant_id: tenantId }, async (client) => {
      const result = await client.query(
        `SELECT challenge_hash, provider_id, purpose, revoked_at
           FROM lawos_identity.challenges
          WHERE tenant_id = $1 AND user_id = $2 AND challenge_type = 'step_up'`,
        [tenantId, account.user_id],
      );
      return result.rows;
    });
    assert.equal(storedStepUp.length, 1);
    assert.equal(storedStepUp[0].provider_id, "test-local-step-up");
    assert.equal(storedStepUp[0].purpose, "security_audit");
    assert.notEqual(storedStepUp[0].challenge_hash, acceptedStepUp.body.step_up_token);
    const activeStepUp = await json(baseUrl, "/api/hrx/audit", {
      headers: { ...headers, "x-lawos-hrx-step-up": acceptedStepUp.body.step_up_token },
    });
    assert.equal(activeStepUp.status, 200);
    const replayedStepUp = await json(baseUrl, "/api/hrx/audit", {
      headers: { ...headers, "x-lawos-hrx-step-up": acceptedStepUp.body.step_up_token },
    });
    assert.equal(replayedStepUp.status, 403);
    assert.equal(replayedStepUp.body.safe_error_code, "HRX_STEP_UP_CHALLENGE_INVALID");

    const revocableStepUp = await json(baseUrl, "/api/auth/step-up", {
      method: "POST",
      headers,
      body: { purpose: "security_audit", factor: "totp", proof: acceptedProof },
    });
    assert.equal(revocableStepUp.status, 200);
    await ledger.revokeChallengesForUser({
      tenant_id: tenantId,
      user_id: account.user_id,
      challenge_type: "step_up",
      reason: "bounded_test_revocation",
      actor_id: account.user_id,
    });
    const rejectedRevokedStepUp = await json(baseUrl, "/api/hrx/audit", {
      headers: { ...headers, "x-lawos-hrx-step-up": revocableStepUp.body.step_up_token },
    });
    assert.equal(rejectedRevokedStepUp.status, 403);
    assert.equal(rejectedRevokedStepUp.body.safe_error_code, "HRX_STEP_UP_CHALLENGE_INVALID");
    now += 1;
    const replacementStepUp = await json(baseUrl, "/api/auth/step-up", {
      method: "POST",
      headers,
      body: { purpose: "security_audit", factor: "totp", proof: acceptedProof },
    });
    assert.equal(replacementStepUp.status, 200);

    const requestedReset = await json(baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      body: { email: account.email },
    });
    assert.equal(requestedReset.status, 200);
    assert.equal(delivered?.to, account.email);
    assert.ok(delivered?.token);
    assert.equal(JSON.stringify(requestedReset.body).includes(delivered.token), false);

    const priorSession = await json(baseUrl, "/api/auth/session", { headers });
    assert.equal(priorSession.status, 401);
    assert.deepEqual(priorSession.body.safe_error_codes, ["AUTH_CREDENTIAL_REVOKED"]);
    const blockedOldPassword = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: oldPassword },
    });
    assert.equal(blockedOldPassword.status, 403);
    assert.deepEqual(blockedOldPassword.body.safe_error_codes, ["AUTH_PASSWORD_RESET_REQUIRED"]);

    const confirmed = await json(baseUrl, "/api/auth/password-reset/confirm", {
      method: "POST",
      body: { token: delivered.token, password: newPassword },
    });
    assert.equal(confirmed.status, 200);
    const reused = await json(baseUrl, "/api/auth/password-reset/confirm", {
      method: "POST",
      body: { token: delivered.token, password: "postgres-identity-third-password" },
    });
    assert.equal(reused.status, 401);
    assert.deepEqual(reused.body.safe_error_codes, ["AUTH_PASSWORD_RESET_TOKEN_USED"]);

    now += 1_000;
    const resetLogin = await json(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: account.email, password: newPassword },
    });
    assert.equal(resetLogin.status, 200);
    const resetHeaders = { authorization: `Bearer ${resetLogin.body.session_token}` };
    const logout = await json(baseUrl, "/api/auth/logout", { method: "POST", headers: resetHeaders });
    const logoutReplay = await json(baseUrl, "/api/auth/logout", { method: "POST", headers: resetHeaders });
    assert.equal(logout.status, 200);
    assert.equal(logout.body.replayed, false);
    assert.equal(logoutReplay.status, 200);
    assert.equal(logoutReplay.body.replayed, true);
    const revokedSession = await json(baseUrl, "/api/auth/session", { headers: resetHeaders });
    assert.equal(revokedSession.status, 401);
    assert.deepEqual(revokedSession.body.safe_error_codes, ["AUTH_SESSION_REVOKED"]);

    const revokedStepUp = await withPostgresTransaction(fixture.appPool, { tenant_id: tenantId }, async (client) => {
      const result = await client.query(
        `SELECT revoked_at, revoke_reason
           FROM lawos_identity.challenges
          WHERE tenant_id = $1 AND user_id = $2 AND challenge_type = 'step_up' AND revoke_reason = 'logout'
          ORDER BY requested_at DESC LIMIT 1`,
        [tenantId, account.user_id],
      );
      return result.rows[0];
    });
    assert.ok(revokedStepUp.revoked_at);
    assert.equal(revokedStepUp.revoke_reason, "logout");

    await ledger.createBreakGlassRequest({
      tenant_id: tenantId,
      break_glass_request_id: "break-glass-postgres-001",
      requester: account,
      requester_label: account.email,
      reason: "bounded local verification",
      break_glass_account_ref: "secretsmanager://lawos/break-glass/account",
      actor_id: account.user_id,
    });
    const firstApproval = await ledger.transitionBreakGlassRequest({
      tenant_id: tenantId,
      break_glass_request_id: "break-glass-postgres-001",
      state: "approved",
      actor_id: "security-admin-1",
    });
    assert.equal(firstApproval.ok, true);
    assert.equal(firstApproval.record.state, "pending");
    assert.equal(firstApproval.approvals_remaining, 1);
    const approved = await ledger.transitionBreakGlassRequest({
      tenant_id: tenantId,
      break_glass_request_id: "break-glass-postgres-001",
      state: "approved",
      actor_id: "security-admin-2",
    });
    assert.equal(approved.ok, true);
    assert.equal(approved.record.state, "approved");
    const restartedLedger = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => now });
    const persistedBreakGlass = await restartedLedger.listBreakGlassRequests({ tenant_id: tenantId });
    assert.equal(persistedBreakGlass[0].state, "approved");

    const audit = await restartedLedger.listSecurityAudit({ tenant_id: tenantId });
    const actions = new Set(audit.map((event) => event.action));
    for (const action of [
      "auth.login.succeeded",
      "auth.step_up.failed",
      "auth.step_up.succeeded",
      "auth.password_reset.requested",
      "auth.password_reset.consumed",
      "auth.logout",
      "admin.security.break_glass.requested",
      "admin.security.break_glass.approval_recorded",
      "admin.security.break_glass.approved",
    ]) assert.equal(actions.has(action), true, `missing identity audit action ${action}`);
    const auditText = JSON.stringify(audit);
    for (const secret of [
      oldPassword,
      newPassword,
      acceptedProof,
      rejectedProof,
      delivered.token,
      signed.body.session_token,
      resetLogin.body.session_token,
      acceptedStepUp.body.step_up_token,
      revocableStepUp.body.step_up_token,
      replacementStepUp.body.step_up_token,
    ]) assert.equal(auditText.includes(secret), false);
    assert.deepEqual(await restartedLedger.listSecurityAudit({ tenant_id: "tenant_identity_other" }), []);
    assert.equal(restartedLedger.capabilities.production_ready_claim, false);
  });
});

test("Server role registry maps the 10-person roster outside the login seed", async () => {
  const staff = userByEmail("yjlee@amic.kr");
  const staffAssignment = resolveLawosUserRoleAssignment(staff);
  const attorney = userByEmail("jh731@amic.kr");
  const attorneyAssignment = resolveLawosUserRoleAssignment(attorney);
  const financeAdminAssignment = resolveLawosUserRoleAssignment(userByEmail("jwsuh@amic.kr"));
  const financeOperationsAssignment = resolveLawosUserRoleAssignment(userByEmail("wsjo@amic.kr"));
  const financePartnerAssignment = resolveLawosUserRoleAssignment(userByEmail("bj.park@amic.kr"));
  assert.equal(listLawosInternalRoleAssignments().length, 10);
  assert.equal(staffAssignment.role_profile_id, "lawos_staff");
  assert.deepEqual(staffAssignment.role_ids, ["lawos_staff"]);
  assert.ok(staffAssignment.scopes.includes("hrx.employee.read"));
  assert.ok(staffAssignment.scopes.includes("hrx.leave.write"));
  assert.equal(staffAssignment.scopes.includes("hrx.payroll.export"), false);
  assert.equal(staffAssignment.scopes.includes("hrx.audit.read"), false);
  assert.equal(attorneyAssignment.role_profile_id, "lawos_attorney");
  assert.deepEqual(attorneyAssignment.role_ids, ["lawos_attorney"]);
  assert.ok(financeAdminAssignment.scopes.includes("finance.export"));
  assert.ok(financeAdminAssignment.scopes.includes("finance.approve"));
  assert.ok(financeOperationsAssignment.scopes.includes("finance.export"));
  assert.equal(financeOperationsAssignment.scopes.includes("finance.approve"), false);
  assert.ok(financePartnerAssignment.scopes.includes("finance.approve"));
  assert.equal(financePartnerAssignment.scopes.includes("finance.export"), false);
  assert.equal(staffAssignment.scopes.some((scope) => scope.startsWith("finance.") || scope === "analytics.finance.read"), false);
  assert.equal(attorneyAssignment.scopes.some((scope) => scope.startsWith("finance.") || scope === "analytics.finance.read"), false);
  assert.ok(attorneyAssignment.scopes.includes("hrx.legal_people.read"));
  assert.ok(attorneyAssignment.scopes.includes("hrx.analytics.read"));

  await withServer({}, async (baseUrl) => {
    const response = await login(baseUrl, staff);
    assert.equal(response.status, 200);
    assert.equal(response.body.session.role_profile_id, "lawos_staff");
    assert.deepEqual(response.body.session.role_ids, ["lawos_staff"]);
    assert.ok(response.body.session.hrx_scopes.includes("hrx.employee.read"));
    assert.equal(response.body.session.hrx_scopes.includes("hrx.payroll.export"), false);
    const attorneyResponse = await login(baseUrl, attorney);
    assert.equal(attorneyResponse.status, 200);
    assert.equal(attorneyResponse.body.session.display_name, "한제희");
    assert.equal(attorneyResponse.body.session.role_profile_id, "lawos_attorney");
    assert.ok(attorneyResponse.body.session.hrx_scopes.includes("hrx.legal_people.read"));
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
    assert.equal(forgedHeaderIgnored.body.item.display_name, account.display_name);
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

test("Unauthenticated business routes reject forged permission and HRX actor headers", async () => {
  await withServer({}, async (baseUrl) => {
    const forgedProfile = await json(baseUrl, "/api/profile/me?permission_ref=ui_profile_me&audit_hint_ref=ui_profile_me_probe", {
      headers: {
        "x-lawos-permission-context": forgedAllowPermissionContext(),
      },
    });
    assert.equal(forgedProfile.status, 401);
    assert.deepEqual(forgedProfile.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);
    assert.equal(forgedProfile.body.token_material_returned, false);

    const forgedHrx = await json(baseUrl, "/api/hrx/employees", {
      headers: {
        "x-lawos-tenant-id": MATTER_VAULT_REGISTERED_TENANT_ID,
        "x-lawos-actor-id": "user_amic_jwsuh",
        "x-lawos-actor-role": "system_super_admin,people_admin",
        "x-lawos-hrx-scopes": "hrx.employee.read,hrx.audit.read,hrx.payroll.export",
      },
    });
    assert.equal(forgedHrx.status, 401);
    assert.deepEqual(forgedHrx.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);
    assert.equal(forgedHrx.body.token_material_returned, false);
  });
});
