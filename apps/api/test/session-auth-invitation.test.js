import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApiSessionAuth } from "../src/session-auth.js";
import { createAuthCredentialStore } from "../src/auth-credential-store.js";
import { createAuthPasswordResetStore } from "../src/auth-password-reset-store.js";

test("local invitation token is hashed, expires, is single-use, and sets a usable credential", async () => {
  let timestamp = Date.parse("2026-09-13T00:00:00.000Z");
  const tenantId = "tenant_person_invitation_synthetic";
  const auth = createApiSessionAuth({ profile: "local-dev", trustedTenantId: tenantId, seed: { tenant_id: tenantId, users: [] }, now: () => timestamp });
  const issued = await auth.provisionLocalInvitation({ tenant_id: tenantId, user_id: "user_invited_synthetic",
    email: "invited@example.test", display_name: "Invited Synthetic", person_role: "external", role_ids: ["external_user"], scopes: ["profile:read"] });
  assert.match(issued.setup_url, /token=/);
  assert.equal(JSON.stringify(await auth.getProfileSubject({ tenant_id: tenantId, user_id: "user_invited_synthetic" })).includes("token"), false);
  const token = new URL(issued.setup_url, "http://local.test").searchParams.get("invitation_token");
  assert.equal((await auth.acceptLocalInvitation({ token, password: "Synthetic-password-2026!" }, { requestId: "accept-1" })).status, 200);
  assert.equal((await auth.acceptLocalInvitation({ token, password: "Synthetic-password-2026!" }, { requestId: "accept-2" })).body.safe_error_codes[0], "AUTH_PASSWORD_RESET_TOKEN_USED");
  const login = await auth.login({ email: "invited@example.test", password: "Synthetic-password-2026!" }, { requestId: "login-1" });
  assert.equal(login.status, 200);
  assert.equal(login.body.session.user_id, "user_invited_synthetic");
  const permissionContext = await auth.resolvePermissionContextFromHeaders({
    authorization: `Bearer ${login.body.session_token}`,
  }, { requestId: "profile-write-context", requireSessionToken: true });
  assert.equal(permissionContext.ok, true);
  assert.ok(permissionContext.context.rules.some((rule) => rule.effect === "allow" && rule.action === "profile:write"));

  const expiring = await auth.provisionLocalInvitation({ tenant_id: tenantId, user_id: "user_expired_synthetic",
    email: "expired@example.test", display_name: "Expired", person_role: "internal", role_ids: ["lawos_staff"], scopes: ["profile:read"] });
  timestamp += 2 * 60 * 60 * 1000;
  const expiredToken = new URL(expiring.setup_url, "http://local.test").searchParams.get("invitation_token");
  assert.equal((await auth.acceptLocalInvitation({ token: expiredToken, password: "Synthetic-password-2026!" }, { requestId: "accept-expired" })).body.safe_error_codes[0], "AUTH_PASSWORD_RESET_TOKEN_EXPIRED");
});

test("invitation acceptance restores the invitation and leaves no credential when mandatory audit fails", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-invitation-audit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const auditPath = join(root, "security-audit.ndjson");
  const credentials = createAuthCredentialStore();
  const resetTokens = createAuthPasswordResetStore();
  const tenantId = "tenant_invitation_audit_synthetic";
  const email = "audit-failure@example.test";
  const password = "Synthetic-audit-failure-2026!";
  const auth = createApiSessionAuth({
    profile: "local-dev",
    trustedTenantId: tenantId,
    seed: { tenant_id: tenantId, users: [] },
    securityAuditStorePath: auditPath,
    credentialStore: credentials,
    passwordResetTokenStore: resetTokens,
  });
  const issued = await auth.provisionLocalInvitation({
    tenant_id: tenantId,
    user_id: "user_invitation_audit_synthetic",
    email,
    display_name: "Invitation Audit Synthetic",
    person_role: "external",
    role_ids: ["external_user"],
    scopes: ["profile:read"],
  });
  const token = new URL(issued.setup_url, "http://local.test").searchParams.get("invitation_token");
  rmSync(auditPath);
  mkdirSync(auditPath);

  await assert.rejects(auth.acceptLocalInvitation({ token, password }, { requestId: "audit-failure" }));
  rmSync(auditPath, { recursive: true });
  assert.equal(credentials.getByUserId("user_invitation_audit_synthetic"), null);
  assert.notEqual((await auth.login({ email, password }, { requestId: "login-after-audit-failure" })).status, 200);

  assert.equal((await auth.acceptLocalInvitation({ token, password }, { requestId: "audit-retry" })).status, 200);
  assert.equal((await auth.login({ email, password }, { requestId: "login-after-audit-retry" })).status, 200);
});
