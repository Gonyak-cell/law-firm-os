import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/index.js";
import { createAuthCredentialStore } from "../src/auth-credential-store.js";
import { createAuthPasswordResetStore } from "../src/auth-password-reset-store.js";
import { highestPrivilegeRegisteredAccount } from "../src/matter-vault-account-registry.js";
import { createApiSessionAuth } from "../src/session-auth.js";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-auth-concurrency-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("stale credential writers fail with CAS and reload the winning authority", (t) => {
  const filePath = join(fixtureRoot(t), "credentials.json");
  const first = createAuthCredentialStore({ filePath });
  const stale = createAuthCredentialStore({ filePath });
  const firstUser = { user_id: "auth-user-one", email: "one@example.test" };
  const secondUser = { user_id: "auth-user-two", email: "two@example.test" };

  first.setPassword({ user: firstUser, password: "first-operational-password" });
  assert.throws(
    () => stale.setPassword({ user: secondUser, password: "second-operational-password" }),
    { code: "LAWOS_STORE_CONFLICT" },
  );
  assert.equal(stale.getByUserId(firstUser.user_id)?.email, firstUser.email);
  assert.equal(stale.getByUserId(secondUser.user_id), null);
});

test("a reset token reader observes a cross-instance revocation before consume", (t) => {
  const filePath = join(fixtureRoot(t), "password-resets.json");
  const creator = createAuthPasswordResetStore({ filePath });
  const user = { user_id: "reset-user", email: "reset@example.test" };
  creator.create({ user, token: "reset-token" });
  const observer = createAuthPasswordResetStore({ filePath });
  const revoker = createAuthPasswordResetStore({ filePath });

  assert.equal(revoker.revokeForUser({ userId: user.user_id }).revoked_count, 1);
  const consumed = observer.consume({ token: "reset-token" });
  assert.equal(consumed.ok, false);
  assert.equal(consumed.safe_error_code, "AUTH_PASSWORD_RESET_TOKEN_INVALID");
});

test("login lock begins only after the configured failed-attempt threshold", async () => {
  const account = highestPrivilegeRegisteredAccount();
  const auth = createApiSessionAuth({
    secret: "auth-concurrency-lock-secret",
    maxFailedLogins: 5,
    loginLockMs: 60_000,
    now: () => Date.parse("2026-07-16T00:00:00.000Z"),
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const failed = await auth.login({ email: account.email, password: `incorrect-${attempt}` }, { requestId: `failed-${attempt}` });
    assert.equal(failed.status, 401);
  }
  const locked = await auth.login({ email: account.email, password: account.local_dev.synthetic_token }, { requestId: "locked" });
  assert.equal(locked.status, 423);
  assert.deepEqual(locked.body.safe_error_codes, ["AUTH_LOGIN_LOCKED"]);
});

test("PostgreSQL identity ledger serializes concurrent login failures and enforces tenant RLS", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const tenantId = "tenant_identity_concurrency";
  const otherTenantId = "tenant_identity_concurrency_other";
  const user = { user_id: "identity-concurrency-user", email: "identity-concurrency@example.test", credential_status: "active" };
  const passwordMaterial = "must-never-enter-identity-audit";
  const now = Date.parse("2026-07-16T00:00:00.000Z");
  const ledger = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => now });
  await ledger.ensureAccount({ tenant_id: tenantId, user });

  const failures = await Promise.all(Array.from({ length: 5 }, () => ledger.recordLoginFailure({
    tenant_id: tenantId,
    user,
    max_failed_logins: 5,
    lock_ms: 60_000,
  })));

  assert.deepEqual(failures.map((failure) => failure.count).sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  assert.equal(failures.filter((failure) => failure.locked).length, 1);
  const lockedReplay = await ledger.recordLoginFailure({
    tenant_id: tenantId,
    user,
    max_failed_logins: 5,
    lock_ms: 60_000,
  });
  assert.equal(lockedReplay.count, 5);
  assert.equal(lockedReplay.locked, true);

  const audit = await ledger.listSecurityAudit({ tenant_id: tenantId });
  assert.equal(audit.filter((event) => event.action === "auth.login.failed").length, 4);
  assert.equal(audit.filter((event) => event.action === "auth.login.locked").length, 1);
  assert.equal(JSON.stringify(audit).includes(passwordMaterial), false);
  assert.deepEqual(await ledger.listSecurityAudit({ tenant_id: otherTenantId }), []);
  await assert.rejects(
    ledger.createChallenge({
      tenant_id: tenantId,
      user,
      challenge_type: "step_up",
      challenge_hash: "hash-only-step-up-state",
      expires_at: now + 60_000,
      metadata: { proof: passwordMaterial },
    }),
    /security audit secret field is forbidden: challenge metadata\.proof/,
  );

  await assert.rejects(
    () => withPostgresTransaction(fixture.appPool, { tenant_id: tenantId }, (client) => client.query(
      "INSERT INTO lawos_identity.accounts (tenant_id, user_id, email) VALUES ($1, $2, $3)",
      [otherTenantId, "cross-tenant-user", "cross-tenant@example.test"],
    )),
    { code: "LAWOS_POSTGRES_ACCESS_DENIED" },
  );

  await assert.rejects(
    () => withPostgresTransaction(fixture.appPool, { tenant_id: tenantId }, (client) => client.query(
      "UPDATE lawos_identity.security_audit_events SET action = 'tampered' WHERE tenant_id = $1",
      [tenantId],
    )),
    { code: "LAWOS_POSTGRES_ACCESS_DENIED" },
  );
  assert.equal((await ledger.listSecurityAudit({ tenant_id: tenantId })).some((event) => event.action === "tampered"), false);
});
