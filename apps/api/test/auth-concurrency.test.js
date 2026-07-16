import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
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

test("login lock begins only after the configured failed-attempt threshold", () => {
  const account = highestPrivilegeRegisteredAccount();
  const auth = createApiSessionAuth({
    secret: "auth-concurrency-lock-secret",
    maxFailedLogins: 5,
    loginLockMs: 60_000,
    now: () => Date.parse("2026-07-16T00:00:00.000Z"),
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const failed = auth.login({ email: account.email, password: `incorrect-${attempt}` }, { requestId: `failed-${attempt}` });
    assert.equal(failed.status, 401);
  }
  const locked = auth.login({ email: account.email, password: account.local_dev.synthetic_token }, { requestId: "locked" });
  assert.equal(locked.status, 423);
  assert.deepEqual(locked.body.safe_error_codes, ["AUTH_LOGIN_LOCKED"]);
});
