import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAuthCredentialStore } from "../src/auth-credential-store.js";
import { findRegisteredAccountByEmail } from "../src/matter-vault-account-registry.js";
import { createApiSessionAuth } from "../src/session-auth.js";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-auth-restart-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("an operational session observes a cross-instance credential revision and stays revoked after restart", (t) => {
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
  const login = active.login({ email: account.email, password }, { requestId: "auth-restart-login" });
  assert.equal(login.status, 200);

  createAuthCredentialStore({ filePath: credentialStorePath }).setPassword({
    user: account,
    password: "operational-password-after-rotation",
  });
  const liveRevocation = active.verifyToken(login.body.session_token, { requestId: "auth-live-revocation" });
  assert.equal(liveRevocation.status, 401);
  assert.deepEqual(liveRevocation.body.safe_error_codes, ["AUTH_CREDENTIAL_REVOKED"]);

  const restarted = createApiSessionAuth({
    profile: "operational",
    secret,
    credentialStorePath,
    passwordResetTokenStorePath,
    now: () => now + 1_000,
  });
  const restartRevocation = restarted.verifyToken(login.body.session_token, { requestId: "auth-restart-revocation" });
  assert.equal(restartRevocation.status, 401);
  assert.deepEqual(restartRevocation.body.safe_error_codes, ["AUTH_CREDENTIAL_REVOKED"]);
});
