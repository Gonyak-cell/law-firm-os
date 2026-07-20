import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAuthCredentialStore } from "../src/auth-credential-store.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { findRegisteredAccountByEmail } from "../src/matter-vault-account-registry.js";

test("password reset admission is account-independent and delivery runs only in the durable worker", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-reset-admission-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  const credentialPath = join(root, "credentials.json");
  const resetPath = join(root, "resets.json");
  createAuthCredentialStore({ filePath: credentialPath }).setPassword({ user: account, password: "reset-security-password" });
  const deliveries = [];
  const auth = createApiSessionAuth({
    profile: "operational",
    secret: "reset-security-session-secret-with-32-bytes",
    credentialStorePath: credentialPath,
    passwordResetTokenStorePath: resetPath,
    passwordResetEmailDelivery: async (input) => {
      deliveries.push(input.to);
      return { mode: "email", provider: "test", status: "sent", message_id: "reset-security-message" };
    },
  });

  const active = await auth.requestPasswordReset({ email: account.email }, { requestId: "reset-active" });
  const absent = await auth.requestPasswordReset({ email: "absent@example.invalid" }, { requestId: "reset-absent" });
  assert.equal(deliveries.length, 0);
  assert.deepEqual(
    { status: absent.status, body: { ...absent.body, request_id: "normalized" } },
    { status: active.status, body: { ...active.body, request_id: "normalized" } },
  );

  const processed = await auth.processPasswordResetQueue({ workerId: "reset-security-worker" });
  assert.deepEqual(processed, { claimed: 2, completed: 1, dropped: 1, retry: 0 });
  assert.deepEqual(deliveries, [account.email]);
});

test("all post-syntax login failures share one public response envelope", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-login-envelope-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  const credentialPath = join(root, "credentials.json");
  const resetPath = join(root, "resets.json");
  createAuthCredentialStore({ filePath: credentialPath }).setPassword({ user: account, password: "login-envelope-password" });
  const auth = createApiSessionAuth({
    profile: "operational",
    secret: "login-envelope-session-secret-with-32-bytes",
    credentialStorePath: credentialPath,
    passwordResetTokenStorePath: resetPath,
  });
  const known = await auth.login({ email: account.email, password: "wrong-password" }, { requestId: "known" });
  const absent = await auth.login({ email: "absent@example.invalid", password: "wrong-password" }, { requestId: "absent" });
  assert.deepEqual(
    { status: absent.status, body: { ...absent.body, request_id: "normalized" } },
    { status: known.status, body: { ...known.body, request_id: "normalized" } },
  );
  assert.equal(known.status, 401);
  assert.deepEqual(known.body.safe_error_codes, ["AUTH_CREDENTIAL_INVALID"]);
  for (const forbidden of ["locked_until", "account_status", "credential_status", "user_id", "email"]) {
    assert.equal(JSON.stringify(known.body).includes(forbidden), false);
  }

  const normalize = (result) => ({ status: result.status, body: { ...result.body, request_id: "normalized" } });
  const expected = normalize(known);
  for (const status of ["disabled", "locked", "reset_required"]) {
    const stateRoot = mkdtempSync(join(tmpdir(), `lawos-login-${status}-`));
    t.after(() => rmSync(stateRoot, { recursive: true, force: true }));
    const store = createAuthCredentialStore({ filePath: join(stateRoot, "credentials.json") });
    store.setPassword({ user: account, password: "login-envelope-password", status });
    const stateAuth = createApiSessionAuth({
      profile: "operational",
      secret: `login-${status}-session-secret-with-32-bytes`,
      credentialStore: store,
      passwordResetTokenStorePath: join(stateRoot, "resets.json"),
    });
    assert.deepEqual(
      normalize(await stateAuth.login({ email: account.email, password: "login-envelope-password" }, { requestId: `state-${status}` })),
      expected,
    );
  }

  const lockedAuth = createApiSessionAuth({
    profile: "operational",
    secret: "login-runtime-lock-session-secret-with-32-bytes",
    credentialStorePath: credentialPath,
    passwordResetTokenStorePath: resetPath,
    maxFailedLogins: 1,
    loginLockMs: 60_000,
  });
  await lockedAuth.login({ email: account.email, password: "wrong-password" }, { requestId: "lock-trigger" });
  assert.deepEqual(
    normalize(await lockedAuth.login({ email: account.email, password: "login-envelope-password" }, { requestId: "locked-correct-password" })),
    expected,
  );
});
