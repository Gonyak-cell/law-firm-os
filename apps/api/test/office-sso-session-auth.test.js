import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_LEDGER_CONTRACT_VERSION,
  IDENTITY_LEDGER_METHODS,
} from "../../../packages/runtime-auth/src/index.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";
import { createApiServer } from "../src/server.js";
import { createApiSessionAuth } from "../src/session-auth.js";

const ENTRA_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const ENTRA_SUBJECT_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_SUBJECT_ID = "44444444-4444-4444-8444-444444444444";
const CALLBACK_URI =
  "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback";
const API_SCOPE = `api://${CLIENT_ID}/access_as_user`;
const ACCESS_TOKEN = "office-naa-access-token-never-return";
const NOW = Date.parse("2026-08-05T06:00:00.000Z");

function directoryUser(overrides = {}) {
  return Object.freeze({
    user_id: "user_office_sso_pilot",
    email: "pilot.user@amic.kr",
    display_name: "Pilot User",
    status: "active",
    account_status: "active",
    highest_privilege: false,
    privilege_rank: 10,
    directory_source: "postgres-v2",
    tenant_memberships: Object.freeze([Object.freeze({
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      status: "active",
      role_profile_id: "lawos_staff",
      role_ids: Object.freeze(["lawos_staff"]),
      group_ids: Object.freeze(["group_staff"]),
      scopes: Object.freeze(["matter.read", "vault.read"]),
      hrx_scopes: Object.freeze([]),
      source_ref: "office-sso-session-test",
    })]),
    ...overrides,
  });
}

function account(user, overrides = {}) {
  return Object.freeze({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user_id: user.user_id,
    email: user.email,
    account_status: "active",
    credential_provider: "microsoft-entra-id-oidc",
    credential_status: "active",
    credential_rev: 7,
    failed_login_count: 0,
    locked_until: null,
    federated_tenant_id: ENTRA_TENANT_ID,
    federated_subject_id: ENTRA_SUBJECT_ID,
    ...overrides,
  });
}

function ledgerFixture({ users = [directoryUser()], accountOverrides = {} } = {}) {
  const accounts = new Map(users.map((user, index) => [
    user.user_id,
    account(user, typeof accountOverrides === "function"
      ? accountOverrides(user, index)
      : index === 0
        ? accountOverrides
        : {}),
  ]));
  const sessions = new Map();
  const completeLoginCalls = [];
  const federatedBindingCalls = [];
  const unexpected = async () => {
    throw new Error("unexpected identity ledger method");
  };
  const ledger = {
    contract_version: IDENTITY_LEDGER_CONTRACT_VERSION,
    ...Object.fromEntries(IDENTITY_LEDGER_METHODS.map((method) => (
      [method, unexpected]
    ))),
    async findDirectoryUserByEmail({ email }) {
      const normalized = String(email).trim().toLowerCase();
      return users.find((user) => user.email.toLowerCase() === normalized) ?? null;
    },
    async findDirectoryUserByUserId({ user_id }) {
      return users.find((user) => user.user_id === user_id) ?? null;
    },
    async listDirectoryUsers() {
      return Object.freeze([...users]);
    },
    async getAccount({ user_id }) {
      return accounts.get(user_id) ?? null;
    },
    async ensureFederatedAccount(input) {
      federatedBindingCalls.push(input);
      const current = accounts.get(input.user.user_id);
      if (!current) throw new Error("account missing");
      if (current.federated_subject_id && (
        current.federated_tenant_id !== input.federated_tenant_id
        || current.federated_subject_id !== input.federated_subject_id
      )) {
        throw Object.assign(new Error("federated identity conflict"), {
          safe_error_code: "FEDERATED_IDENTITY_CONFLICT",
          status: 403,
        });
      }
      const next = Object.freeze({
        ...current,
        federated_tenant_id: input.federated_tenant_id,
        federated_subject_id: input.federated_subject_id,
        ...(input.preserve_primary_credential === true
          ? {}
          : {
              credential_provider: input.provider_id,
              credential_status: "active",
              password_hash: {},
            }),
      });
      accounts.set(input.user.user_id, next);
      return next;
    },
    async completeLogin(input) {
      completeLoginCalls.push(input);
      const current = accounts.get(input.user.user_id);
      if (current?.account_status !== "active") {
        return Object.freeze({
          ok: false,
          status: 403,
          safe_error_code: "AUTH_ACCOUNT_DISABLED",
          reason: "account_disabled",
        });
      }
      sessions.set(input.session_jti, input);
      return Object.freeze({ ok: true });
    },
    async validateSession({ session_jti, user_id }) {
      const session = sessions.get(session_jti);
      return session?.user.user_id === user_id
        ? Object.freeze({ ok: true })
        : Object.freeze({
            ok: false,
            status: 401,
            safe_error_code: "AUTH_SESSION_REVOKED",
            reason: "session_not_active",
          });
    },
  };
  return {
    accounts,
    completeLoginCalls,
    federatedBindingCalls,
    ledger,
    sessions,
    users,
  };
}

function officeProvider({ verification = {}, calls = [] } = {}) {
  return Object.freeze({
    provider_id: "microsoft-office-naa-sso-test",
    public_config: Object.freeze({
      client_id: CLIENT_ID,
      tenant_id: ENTRA_TENANT_ID,
      api_scope: API_SCOPE,
      callback_uri: CALLBACK_URI,
      client_secret: "must-never-leave-server",
    }),
    async verifyAccessToken(token) {
      calls.push(token);
      assert.equal(token, ACCESS_TOKEN);
      return Object.freeze({
        provider_id: "microsoft-office-naa-sso-test",
        tenant_id: ENTRA_TENANT_ID,
        assertion_id: ENTRA_SUBJECT_ID,
        email: null,
        assurance_level: "microsoft-office-naa",
        token_material_returned: false,
        ...verification,
      });
    },
  });
}

function authFixture({
  users,
  accountOverrides,
  verification,
  provider = true,
} = {}) {
  const ledgerState = ledgerFixture({ users, accountOverrides });
  const providerCalls = [];
  const auth = createApiSessionAuth({
    profile: "operational",
    secret: "office-sso-session-test-secret-at-least-32-characters",
    identityRepository: ledgerState.ledger,
    officeSsoProvider: provider
      ? officeProvider({ verification, calls: providerCalls })
      : null,
    now: () => NOW,
  });
  return { auth, providerCalls, ...ledgerState };
}

async function exchange(auth, requestId = "req-office-sso-exchange") {
  return auth.handleAuthApiRequest({
    pathname: "/api/auth/office-sso/exchange",
    method: "POST",
    body: { access_token: ACCESS_TOKEN },
    requestId,
  });
}

test("Office SSO config is public-only and exchange commits a restricted signed session", async () => {
  const fixture = authFixture();
  const config = await fixture.auth.handleAuthApiRequest({
    pathname: "/api/auth/office-sso/config",
    method: "GET",
    requestId: "req-office-sso-config",
  });
  assert.equal(config.status, 200);
  assert.deepEqual(config.body, {
    client_id: CLIENT_ID,
    tenant_id: ENTRA_TENANT_ID,
    api_scope: API_SCOPE,
    callback_uri: CALLBACK_URI,
    configured: true,
  });
  assert.deepEqual(Object.keys(config.body).sort(), [
    "api_scope",
    "callback_uri",
    "client_id",
    "configured",
    "tenant_id",
  ]);
  assert.equal(JSON.stringify(config.body).includes("secret"), false);

  const invalidShape = await fixture.auth.handleAuthApiRequest({
    pathname: "/api/auth/office-sso/exchange",
    method: "POST",
    body: { access_token: ACCESS_TOKEN, email: "pilot.user@amic.kr" },
    requestId: "req-office-sso-extra-field",
  });
  assert.equal(invalidShape.status, 400);
  assert.equal(fixture.providerCalls.length, 0);

  const completed = await exchange(fixture.auth);
  assert.equal(completed.status, 200);
  assert.match(completed.body.session_token, /^lawos_session_v1\./u);
  assert.equal(completed.body.surface, "outlook_addin");
  assert.equal(completed.body.session.surface, "outlook_addin");
  assert.equal(completed.body.provider_token_material_returned, false);
  assert.equal(fixture.providerCalls.length, 1);
  assert.equal(fixture.completeLoginCalls.length, 1);
  assert.equal(fixture.sessions.size, 1);
  assert.equal(JSON.stringify(completed.body).includes(ACCESS_TOKEN), false);
  assert.equal(JSON.stringify(completed.body).includes("must-never"), false);

  const payload = JSON.parse(Buffer.from(
    completed.body.session_token.split(".")[1],
    "base64url",
  ).toString("utf8"));
  assert.equal(payload.surface, "outlook_addin");
  const verified = await fixture.auth.verifyToken(
    completed.body.session_token,
    { requestId: "req-office-sso-session-verify" },
  );
  assert.equal(verified.ok, true);
  assert.equal(verified.token_payload.surface, "outlook_addin");
  assert.equal(verified.principal.surface, "outlook_addin");
  assert.equal(verified.context.principal.surface, "outlook_addin");
  assert.equal(verified.session.surface, "outlook_addin");
  assert.equal(verified.principal.entra_subject_id, ENTRA_SUBJECT_ID);

  const deniedStepUp = await fixture.auth.handleAuthApiRequest({
    pathname: "/api/auth/step-up",
    method: "POST",
    headers: { authorization: `Bearer ${completed.body.session_token}` },
    body: { purpose: "hrx.payroll.read", proof: "000000" },
    requestId: "req-office-sso-step-up-denied",
  });
  assert.equal(deniedStepUp.status, 403);
  assert.equal(
    deniedStepUp.body.safe_error_codes[0],
    "AUTH_SESSION_SURFACE_DENIED",
  );
});

test("Office SSO first exchange binds one active roster account without replacing its password credential", async () => {
  const passwordHash = Object.freeze({
    algorithm: "scrypt-v1",
    digest: "existing-password-hash-never-return",
  });
  const fixture = authFixture({
    accountOverrides: {
      credential_provider: "lawos-internal-password-provider-v1",
      credential_rev: 11,
      password_hash: passwordHash,
      failed_login_count: 4,
      locked_until: "2026-08-05T07:00:00.000Z",
      federated_tenant_id: null,
      federated_subject_id: null,
    },
    verification: { email: "pilot.user@amic.kr" },
  });

  const completed = await exchange(fixture.auth, "req-office-sso-first-binding");

  assert.equal(completed.status, 200);
  assert.equal(fixture.federatedBindingCalls.length, 1);
  assert.deepEqual(fixture.federatedBindingCalls[0], {
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user: {
      user_id: fixture.users[0].user_id,
      email: fixture.users[0].email,
      status: "active",
      account_status: "active",
    },
    provider_id: "microsoft-office-naa-sso-test",
    federated_tenant_id: ENTRA_TENANT_ID,
    federated_subject_id: ENTRA_SUBJECT_ID,
    actor_id: fixture.users[0].user_id,
    preserve_primary_credential: true,
    audit_action: "auth.office_sso_identity.bound",
  });
  const bound = fixture.accounts.get(fixture.users[0].user_id);
  assert.equal(bound.credential_provider, "lawos-internal-password-provider-v1");
  assert.equal(bound.credential_rev, 11);
  assert.deepEqual(bound.password_hash, passwordHash);
  assert.equal(bound.failed_login_count, 4);
  assert.equal(bound.locked_until, "2026-08-05T07:00:00.000Z");
  assert.equal(bound.federated_tenant_id, ENTRA_TENANT_ID);
  assert.equal(bound.federated_subject_id, ENTRA_SUBJECT_ID);
  assert.equal(fixture.completeLoginCalls[0].preserve_login_failure_state, true);
  const verified = await fixture.auth.verifyToken(completed.body.session_token, {
    requestId: "req-office-sso-first-binding-verify",
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.principal.entra_subject_id, ENTRA_SUBJECT_ID);
});

test("Office SSO repeat exchange preserves the primary login failure state", async () => {
  const fixture = authFixture({
    accountOverrides: {
      failed_login_count: 4,
      locked_until: "2026-08-05T07:00:00.000Z",
    },
  });

  const first = await exchange(fixture.auth, "req-office-sso-repeat-1");
  const second = await exchange(fixture.auth, "req-office-sso-repeat-2");

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(fixture.completeLoginCalls.length, 2);
  assert.equal(
    fixture.completeLoginCalls.every(
      (call) => call.preserve_login_failure_state === true,
    ),
    true,
  );
  assert.equal(fixture.accounts.get(fixture.users[0].user_id).failed_login_count, 4);
  assert.equal(
    fixture.accounts.get(fixture.users[0].user_id).locked_until,
    "2026-08-05T07:00:00.000Z",
  );
});

test("Office SSO binding resolution rejects unmapped, unbound, mismatched, ambiguous, and disabled accounts", async (t) => {
  const secondUser = directoryUser({
    user_id: "user_office_sso_duplicate",
    email: "duplicate.user@amic.kr",
  });
  const cases = [
    [
      "unmapped",
      { verification: { assertion_id: OTHER_SUBJECT_ID, email: "unknown@amic.kr" } },
      "AUTH_OFFICE_SSO_ACCOUNT_UNMAPPED",
    ],
    [
      "unbound without a verified email",
      {
        accountOverrides: {
          federated_tenant_id: null,
          federated_subject_id: null,
        },
        verification: { email: null },
      },
      "AUTH_OFFICE_SSO_ACCOUNT_UNBOUND",
    ],
    [
      "binding mismatch",
      {
        accountOverrides: { federated_subject_id: OTHER_SUBJECT_ID },
        verification: { email: "pilot.user@amic.kr" },
      },
      "AUTH_OFFICE_SSO_SUBJECT_MISMATCH",
    ],
    [
      "optional email mismatch",
      { verification: { email: "other.user@amic.kr" } },
      "AUTH_OFFICE_SSO_SUBJECT_MISMATCH",
    ],
    [
      "ambiguous binding",
      { users: [directoryUser(), secondUser] },
      "AUTH_OFFICE_SSO_BINDING_AMBIGUOUS",
    ],
    [
      "ambiguous unbound email",
      {
        users: [directoryUser(), directoryUser({
          user_id: "user_office_sso_same_email",
        })],
        accountOverrides: () => ({
          federated_tenant_id: null,
          federated_subject_id: null,
        }),
        verification: { email: "pilot.user@amic.kr" },
      },
      "AUTH_OFFICE_SSO_BINDING_AMBIGUOUS",
    ],
    [
      "disabled account",
      { accountOverrides: { account_status: "disabled" } },
      "AUTH_ACCOUNT_DISABLED",
    ],
  ];

  for (const [name, options, safeErrorCode] of cases) {
    await t.test(name, async () => {
      const fixture = authFixture(options);
      const result = await exchange(fixture.auth, `req-office-sso-${name}`);
      assert.equal(result.status, 403);
      assert.equal(result.body.safe_error_codes.includes(safeErrorCode), true);
      assert.equal(fixture.completeLoginCalls.length, 0);
      assert.equal(JSON.stringify(result.body).includes(ACCESS_TOKEN), false);
    });
  }
});

test("Office SSO stays disabled without a provider and standard sessions retain their full surface", async () => {
  const disabled = authFixture({ provider: false });
  for (const [pathname, method, body] of [
    ["/api/auth/office-sso/config", "GET", {}],
    ["/api/auth/office-sso/exchange", "POST", { access_token: ACCESS_TOKEN }],
  ]) {
    const result = await disabled.auth.handleAuthApiRequest({
      pathname,
      method,
      body,
      requestId: "req-office-sso-disabled",
    });
    assert.equal(result.status, 403);
    assert.equal(
      result.body.safe_error_codes.includes("AUTH_OFFICE_SSO_NOT_CONFIGURED"),
      true,
    );
  }

  const user = findRegisteredAccountByEmail("jwsuh@amic.kr");
  assert.ok(user);
  const standard = createApiSessionAuth({
    secret: "standard-session-surface-test",
  });
  const signed = await standard.login({
    email: user.email,
    password: user.local_dev.synthetic_token,
  }, { requestId: "req-standard-session-surface-login" });
  assert.equal(signed.status, 200);
  assert.equal(signed.body.session.surface, null);
  const verified = await standard.verifyToken(signed.body.session_token, {
    requestId: "req-standard-session-surface-verify",
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.token_payload.surface, null);
  assert.equal(verified.principal.surface, null);
  assert.deepEqual(verified.principal.scopes, signed.body.session.scopes);
});

test("Outlook add-in sessions are accepted only on the Outlook API surface", async () => {
  const principal = Object.freeze({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user_id: "user_office_sso_pilot",
    role_ids: Object.freeze(["lawos_staff"]),
    scopes: Object.freeze(["matter.read"]),
    entra_subject_id: ENTRA_SUBJECT_ID,
  });
  const context = Object.freeze({
    principal,
    rules: Object.freeze([Object.freeze({
      id: "office-sso-outlook-only",
      effect: "allow",
      action_prefix: "outlook:",
    })]),
    object_acl: Object.freeze([]),
  });
  const server = createApiServer({
    sessionAuth: {
      async resolvePermissionContextFromHeaders() {
        return Object.freeze({
          ok: true,
          principal,
          context,
          token_payload: Object.freeze({ surface: "outlook_addin" }),
        });
      },
    },
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const { port } = server.address();
    const headers = { authorization: "Bearer restricted-outlook-session" };
    const denied = await fetch(`http://127.0.0.1:${port}/api/matters`, { headers });
    const deniedBody = await denied.json();
    assert.equal(denied.status, 403);
    assert.deepEqual(
      deniedBody.safe_error_codes,
      ["AUTH_SESSION_SURFACE_DENIED"],
    );

    const allowed = await fetch(`http://127.0.0.1:${port}/api/outlook/bootstrap`, { headers });
    const allowedBody = await allowed.json();
    assert.equal(allowed.status, 200, JSON.stringify(allowedBody));
    assert.equal(allowedBody.item.taskpane_loaded, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
