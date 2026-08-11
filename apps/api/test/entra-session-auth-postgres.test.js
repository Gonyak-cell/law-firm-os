import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { resolveLawosUserRoleAssignment } from "../src/lawos-role-registry.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/index.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";

function sha256Base64Url(value) {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

test("operational Entra session authority persists only verified federated identity and disables local auth", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const now = Date.parse("2026-07-18T04:00:00.000Z");
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  assert.ok(account);
  const codeVerifier = "entra-test-pkce-verifier-with-more-than-forty-three-characters";
  const codeChallenge = sha256Base64Url(codeVerifier);
  const redirectUri = "https://lawos.example.test/api/auth/oidc/complete";
  const states = [
    "entra-test-state-mismatched-account-never-persist-raw",
    "entra-test-state-never-persist-raw",
  ];
  const nonceHash = sha256Hex("entra-test-nonce");
  const authorizationCode = "entra-test-code-never-persist";
  let authorizationAttempt = 0;
  let verifiedEmail = "other-staff@amic.kr";
  const provider = Object.freeze({
    provider_id: "microsoft-entra-oidc-test",
    createAuthorizationRequest(input = {}) {
      assert.equal(input.redirect_uri, redirectUri);
      assert.equal(input.code_challenge, codeChallenge);
      assert.equal(input.login_hint, account.email);
      return Object.freeze({
        authorization_url: "https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?synthetic=1",
        state: states[authorizationAttempt++],
        nonce_hash: nonceHash,
        redirect_uri_hash: sha256Hex(redirectUri),
        code_challenge: codeChallenge,
      });
    },
    async completeAuthorization(input = {}) {
      assert.equal(input.code, authorizationCode);
      assert.equal(input.redirect_uri, redirectUri);
      assert.equal(input.code_verifier, codeVerifier);
      assert.equal(input.expected_nonce_hash, nonceHash);
      return Object.freeze({
        provider_id: "microsoft-entra-oidc-test",
        tenant_id: "entra-tenant-test",
        assertion_id: "entra-subject-test",
        email: verifiedEmail,
        assurance_level: "phishing-resistant-mfa",
        factor: "fido2",
        mfa_verified: true,
        phishing_resistant_verified: true,
        conditional_access_verified: true,
        token_material_returned: false,
      });
    },
  });
  const ledger = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => now });
  const assignment = resolveLawosUserRoleAssignment(account, { tenantId: MATTER_VAULT_REGISTERED_TENANT_ID });
  await ledger.provisionDirectoryUser({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user: account,
    membership: {
      ...assignment.tenant_membership,
      role_profile_id: assignment.role_profile_id,
      hrx_scopes: assignment.hrx_scopes,
      source_ref: assignment.source_ref,
    },
    actor_id: "synthetic-test-provisioner",
  });
  const auth = createApiSessionAuth({
    profile: "operational",
    secret: "entra-session-test-secret-with-adequate-length",
    identityRepository: ledger,
    staffOidcProvider: provider,
    now: () => now,
  });

  assert.deepEqual(auth.capabilities, {
    provider: provider.provider_id,
    staff_auth_authority: "entra-oidc",
    federated_staff_auth: true,
    local_password_login: false,
    local_synthetic_login: false,
    account_directory: "postgres-v2",
    object_acl_authority: "unavailable",
    object_acl_authority_source_ref: null,
    object_acl_authority_required_for_fixed_client_reports: true,
    caller_permission_context_object_acl_trusted: false,
    default_totp: false,
    phishing_resistant_mfa_required: true,
  });
  for (const [pathname, body] of [
    ["/api/auth/login", { email: account.email, password: "never-accepted" }],
    ["/api/auth/password-reset/request", { email: account.email }],
    ["/api/auth/password-reset/confirm", { token: "never-accepted", password: "never-accepted" }],
    ["/api/auth/step-up", { purpose: "security_audit", totp_code: "000000" }],
  ]) {
    const denied = await auth.handleAuthApiRequest({ pathname, method: "POST", body, requestId: `req-${pathname}` });
    assert.equal(denied.status, 403);
  }

  const started = await auth.handleAuthApiRequest({
    pathname: "/api/auth/oidc/start",
    method: "POST",
    body: { email: account.email, redirect_uri: redirectUri, code_challenge: codeChallenge },
    requestId: "req-entra-start",
  });
  assert.equal(started.status, 200);
  assert.equal(started.body.state, states[0]);
  assert.equal(started.body.mfa_required, true);
  assert.equal(started.body.phishing_resistant_required, true);
  assert.equal(started.body.conditional_access_required, true);

  const mismatched = await auth.handleAuthApiRequest({
    pathname: "/api/auth/oidc/complete",
    method: "POST",
    body: { state: started.body.state, code: authorizationCode, redirect_uri: redirectUri, code_verifier: codeVerifier },
    requestId: "req-entra-account-mismatch",
  });
  assert.equal(mismatched.status, 403);
  assert.equal(mismatched.body.safe_error_codes.includes("AUTH_ENTRA_ACCOUNT_UNMAPPED"), true);
  const unbound = await ledger.getAccount({ tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID, user_id: account.user_id });
  assert.equal(unbound.federated_subject_id, null);

  verifiedEmail = account.email;
  const restarted = await auth.handleAuthApiRequest({
    pathname: "/api/auth/oidc/start",
    method: "POST",
    body: { email: account.email, redirect_uri: redirectUri, code_challenge: codeChallenge },
    requestId: "req-entra-restart",
  });
  assert.equal(restarted.status, 200);
  assert.equal(restarted.body.state, states[1]);
  const completed = await auth.handleAuthApiRequest({
    pathname: "/api/auth/oidc/complete",
    method: "POST",
    body: { state: restarted.body.state, code: authorizationCode, redirect_uri: redirectUri, code_verifier: codeVerifier },
    requestId: "req-entra-complete",
  });
  assert.equal(completed.status, 200);
  assert.match(completed.body.session_token, /^lawos_session_v1\./u);
  assert.equal(completed.body.credential_provider, provider.provider_id);
  assert.equal(completed.body.assurance_level, "phishing-resistant-mfa");

  const session = await auth.handleAuthApiRequest({
    pathname: "/api/auth/session",
    method: "GET",
    headers: { authorization: `Bearer ${completed.body.session_token}` },
    requestId: "req-entra-session",
  });
  assert.equal(session.status, 200);
  assert.equal(session.body.session.email, account.email);
  assert.equal(session.body.session.assurance_level, "phishing-resistant-mfa");
  assert.match(
    session.body.session.outlook_desktop_principal_ref,
    /^odpr_[A-Za-z0-9_-]{43}$/u,
  );
  assert.equal(
    JSON.stringify(session.body.session).includes("entra-subject-test"),
    false,
  );
  const verified = await auth.verifyToken(completed.body.session_token, { requestId: "req-entra-verify" });
  assert.equal(verified.ok, true);
  assert.equal(verified.principal.entra_subject_id, "entra-subject-test");

  assert.deepEqual(await auth.verifyOutlookCallbackPrincipal({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user_id: account.user_id,
    entra_subject_id: "entra-subject-test",
    federated_tenant_id: "entra-tenant-test",
  }), { ok: true });
  const mismatchedCallbackPrincipal = await auth.verifyOutlookCallbackPrincipal({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user_id: account.user_id,
    entra_subject_id: "another-entra-subject",
    federated_tenant_id: "entra-tenant-test",
  });
  assert.equal(mismatchedCallbackPrincipal.ok, false);
  assert.equal(mismatchedCallbackPrincipal.status, 403);

  const stored = await ledger.getAccount({ tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID, user_id: account.user_id });
  assert.equal(stored.credential_provider, provider.provider_id);
  assert.equal(stored.password_hash && Object.keys(stored.password_hash).length, 0);
  assert.equal(stored.federated_tenant_id, "entra-tenant-test");
  assert.equal(stored.federated_subject_id, "entra-subject-test");
  const audit = await ledger.listSecurityAudit({ tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID });
  const actions = new Set(audit.map((event) => event.action));
  for (const action of [
    "auth.oidc.authorization.started",
    "auth.federated_identity.bound",
    "auth.oidc.authorization.consumed",
    "auth.login.succeeded",
  ]) assert.equal(actions.has(action), true, `missing identity audit action ${action}`);
  const evidenceText = JSON.stringify({ stored, audit });
  for (const secret of [...states, authorizationCode, codeVerifier, completed.body.session_token]) {
    assert.equal(evidenceText.includes(secret), false);
  }
});
