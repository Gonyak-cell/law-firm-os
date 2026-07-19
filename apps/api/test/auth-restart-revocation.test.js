import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/index.js";
import {
  LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
  createAuthCredentialStore,
  createScryptPasswordHash,
} from "../src/auth-credential-store.js";
import { findRegisteredAccountByEmail } from "../src/matter-vault-account-registry.js";
import { createApiSessionAuth } from "../src/session-auth.js";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-auth-restart-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("an operational session observes a cross-instance credential revision and stays revoked after restart", async (t) => {
  const root = fixtureRoot(t);
  const credentialStorePath = join(root, "credentials.json");
  const passwordResetTokenStorePath = join(root, "password-resets.json");
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  assert.ok(account);
  const password = "operational-password-before-rotation";
  const now = Date.parse("2026-07-16T00:00:00.000Z");
  const secret = "operational-session-secret-at-least-32-bytes";

  createAuthCredentialStore({ filePath: credentialStorePath }).setPassword({ user: account, password });
  const active = createApiSessionAuth({
    profile: "operational",
    secret,
    credentialStorePath,
    passwordResetTokenStorePath,
    now: () => now,
  });
  const login = await active.login({ email: account.email, password }, { requestId: "auth-restart-login" });
  assert.equal(login.status, 200);

  createAuthCredentialStore({ filePath: credentialStorePath }).setPassword({
    user: account,
    password: "operational-password-after-rotation",
  });
  const liveRevocation = await active.verifyToken(login.body.session_token, { requestId: "auth-live-revocation" });
  assert.equal(liveRevocation.status, 401);
  assert.deepEqual(liveRevocation.body.safe_error_codes, ["AUTH_CREDENTIAL_REVOKED"]);

  const restarted = createApiSessionAuth({
    profile: "operational",
    secret,
    credentialStorePath,
    passwordResetTokenStorePath,
    now: () => now + 1_000,
  });
  const restartRevocation = await restarted.verifyToken(login.body.session_token, { requestId: "auth-restart-revocation" });
  assert.equal(restartRevocation.status, 401);
  assert.deepEqual(restartRevocation.body.safe_error_codes, ["AUTH_CREDENTIAL_REVOKED"]);
});

test("PostgreSQL session revocation and account disable survive independent process pools", async (t) => {
  let secondPool;
  t.after(() => secondPool?.end());
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const appUrl = new URL(fixture.instance.connection_string);
  appUrl.username = "lawos_app";
  secondPool = createPostgresPool({
    connectionString: appUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-identity-second-process-test",
    tenantContextSecret: fixture.tenantContextSecret,
  });
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  assert.ok(account);
  const tenantId = "tenant_amic_matter_vault";
  const password = "postgres-operational-password";
  const now = Date.parse("2026-07-16T01:00:00.000Z");
  const secret = "postgres-operational-session-secret-32-bytes";
  const firstLedger = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => now });
  const secondLedger = createPostgresIdentityLedger({ pool: secondPool, clock: () => now });
  await firstLedger.setCredential({
    tenant_id: tenantId,
    user: account,
    provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
    password_hash: createScryptPasswordHash(password),
    status: "active",
    actor_id: account.user_id,
  });
  const firstAuth = createApiSessionAuth({
    profile: "operational",
    secret,
    identityRepository: firstLedger,
    now: () => now,
  });
  const secondAuth = createApiSessionAuth({
    profile: "operational",
    secret,
    identityRepository: secondLedger,
    now: () => now,
  });

  const login = await firstAuth.login({ email: account.email, password }, { requestId: "postgres-login" });
  assert.equal(login.status, 200);
  assert.equal((await secondAuth.verifyToken(login.body.session_token, { requestId: "second-process-verify" })).ok, true);

  const firstLogout = await secondAuth.handleAuthApiRequest({
    pathname: "/api/auth/logout",
    method: "POST",
    headers: { authorization: `Bearer ${login.body.session_token}` },
    requestId: "second-process-logout",
  });
  const replayLogout = await firstAuth.handleAuthApiRequest({
    pathname: "/api/auth/logout",
    method: "POST",
    headers: { authorization: `Bearer ${login.body.session_token}` },
    requestId: "first-process-logout-replay",
  });
  assert.equal(firstLogout.status, 200);
  assert.equal(firstLogout.body.replayed, false);
  assert.equal(replayLogout.status, 200);
  assert.equal(replayLogout.body.replayed, true);

  const revokedLive = await firstAuth.verifyToken(login.body.session_token, { requestId: "first-process-revoked" });
  const restartedAuth = createApiSessionAuth({
    profile: "operational",
    secret,
    identityRepository: createPostgresIdentityLedger({ pool: secondPool, clock: () => now }),
    now: () => now,
  });
  const revokedAfterRestart = await restartedAuth.verifyToken(login.body.session_token, { requestId: "restart-revoked" });
  assert.equal(revokedLive.status, 401);
  assert.deepEqual(revokedLive.body.safe_error_codes, ["AUTH_SESSION_REVOKED"]);
  assert.equal(revokedAfterRestart.status, 401);
  assert.deepEqual(revokedAfterRestart.body.safe_error_codes, ["AUTH_SESSION_REVOKED"]);

  const secondLogin = await firstAuth.login({ email: account.email, password }, { requestId: "postgres-login-before-disable" });
  assert.equal(secondLogin.status, 200);
  const disabled = await secondLedger.setAccountStatus({
    tenant_id: tenantId,
    user: account,
    status: "disabled",
    actor_id: "security-admin",
    reason: "test disable",
  });
  assert.equal(disabled.credential_status, "disabled");
  const disabledSession = await firstAuth.verifyToken(secondLogin.body.session_token, { requestId: "disabled-session" });
  assert.equal(disabledSession.status, 403);
  assert.deepEqual(disabledSession.body.safe_error_codes, ["AUTH_ACCOUNT_DISABLED"]);

  const reactivated = await secondLedger.setAccountStatus({
    tenant_id: tenantId,
    user: account,
    status: "active",
    actor_id: "security-admin",
    reason: "test reactivate",
  });
  assert.equal(reactivated.account_status, "active");
  assert.equal(reactivated.credential_status, "reset_required");
  assert.equal(reactivated.credential_rev, disabled.credential_rev + 1);
  const resetRequiredRace = await secondLedger.completeLogin({
    tenant_id: tenantId,
    user: account,
    session_jti: "reset-required-race-jti",
    session_id: "reset-required-race-session",
    credential_rev: reactivated.credential_rev,
    issued_at: now,
    expires_at: now + 60_000,
  });
  assert.equal(resetRequiredRace.ok, false);
  assert.equal(resetRequiredRace.safe_error_code, "AUTH_CREDENTIAL_REVOKED");
  await assert.rejects(
    secondLedger.setAccountStatus({
      tenant_id: tenantId,
      user: account,
      status: "unexpected-reactivation-value",
      actor_id: "security-admin",
    }),
    /unsupported account status/,
  );
  const securityUsers = await restartedAuth.handleSecurityAdminApiRequest({
    pathname: "/api/admin/security/users",
    method: "GET",
    context: {
      principal: {
        tenant_id: tenantId,
        user_id: "security-admin",
        role_ids: ["security_admin"],
        scopes: ["security.admin"],
      },
    },
    requestId: "reactivated-security-list",
  });
  const reactivatedPublic = securityUsers.body.items.find((item) => item.user_id === account.user_id);
  assert.equal(reactivatedPublic.status, "active");
  assert.equal(reactivatedPublic.credential_status, "reset_required");
  assert.equal(reactivatedPublic.login_allowed, false);
  const reactivatedLogin = await restartedAuth.login({ email: account.email, password }, { requestId: "reactivated-login" });
  assert.equal(reactivatedLogin.status, 403);
  assert.deepEqual(reactivatedLogin.body.safe_error_codes, ["AUTH_PASSWORD_RESET_REQUIRED"]);
  const auditText = JSON.stringify(await restartedAuth.handleSecurityAdminApiRequest({
    pathname: "/api/admin/security/audit",
    method: "GET",
    context: {
      principal: {
        tenant_id: tenantId,
        user_id: "security-admin",
        role_ids: ["security_admin"],
        scopes: ["security.admin"],
      },
    },
    requestId: "reactivated-security-audit",
  }));
  assert.equal(auditText.includes("test disable"), false);
  assert.equal(auditText.includes("test reactivate"), false);
});
