import assert from "node:assert/strict";
import test from "node:test";
import { createAuthProviderInterface, createLocalDevAuthProvider, createRuntimeAuthSession } from "../src/index.js";

test("Runtime auth session schema rejects credential material and records synthetic boundary", () => {
  const session = createRuntimeAuthSession({
    session_id: "sess_001",
    user_id: "user_001",
    auth_subject: "local:user_001",
    assurance_level: "mfa",
    tenant_memberships: [
      { tenant_id: "tenant-a", role_ids: ["attorney"], group_ids: ["litigation"], scopes: ["matter.read"] }
    ]
  });

  assert.equal(session.synthetic_only, true);
  assert.equal(session.production_auth_claim, false);
  assert.equal(session.tenant_memberships[0].role_ids[0], "attorney");
  assert.throws(
    () => createRuntimeAuthSession({ session_id: "bad", user_id: "u", auth_subject: "s", password: "secret" }),
    /credential material/,
  );
});

test("Provider interface keeps OIDC and SAML production adapters descriptor-only", () => {
  const provider = createAuthProviderInterface({
    kind: "provider-neutral",
    oidc: { supported: false },
    saml: { supported: false },
    authenticateRequest() {
      return { ok: false, reason: "not_configured" };
    }
  });

  assert.equal(provider.production_auth_claim, false);
  assert.equal(provider.oidc_supported, false);
  assert.equal(provider.saml_supported, false);
});

test("Local dev auth provider authenticates synthetic bearer tokens only", () => {
  const provider = createLocalDevAuthProvider({
    subjects: [
      {
        synthetic_token: "token-a",
        user_id: "user-a",
        assurance_level: "password",
        tenant_memberships: [{ tenant_id: "tenant-a", role_ids: ["attorney"] }]
      }
    ]
  });

  const ok = provider.authenticateRequest({ headers: { authorization: "Bearer token-a" } });
  assert.equal(ok.ok, true);
  assert.equal(ok.session.user_id, "user-a");
  assert.equal(provider.authenticateRequest({ headers: { authorization: "Bearer bad" } }).reason, "unknown_synthetic_subject");
  assert.equal(provider.authenticateRequest({ headers: {} }).reason, "missing_bearer_token");
});
