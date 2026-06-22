#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "../apps/desktop/src/main/aws-runtime.js";

const SUPER_ADMIN_EMAIL = "jwsuh@amic.kr";

const config = loadMatterVaultRuntimeConfig();
const client = createMatterVaultAwsRuntimeClient(config);

function temporaryPassword(label) {
  return `${label}-${randomBytes(12).toString("base64url")}`;
}

async function resetPasswordFor(email, password) {
  const request = await client.requestPasswordReset({ email });
  assert.equal(request.ok, true, `${email} reset request must be accepted`);
  assert.equal(request.email_delivery?.token_material_returned, false, "reset request must not return token material");
  assert.equal(JSON.stringify(request).includes("reset_token"), false, "reset request must not expose reset token");

  const latest = await client.latestResetEmail({ email });
  assert.equal(latest.ok, true, `${email} synthetic reset email must be retrievable for internal smoke`);
  assert.equal(latest.email_message.to, email);
  assert.match(latest.email_message.reset_url, /^matter:\/\/password-reset\/confirm\?token=/);

  const confirm = await client.confirmPasswordReset({
    token: latest.email_message.reset_token,
    password
  });
  assert.equal(confirm.ok, true, `${email} password reset confirm must pass`);
  assert.equal(confirm.token_material_returned, false, "confirm response must not return token material");
}

const health = await client.health();
assert.equal(health.ok, true, "AWS temporary runtime health must pass");
assert.equal(health.operator_token_required_for_runtime_routes, true, "runtime routes must require the operator credential");

const accounts = await client.accounts();
assert.equal(accounts.ok, true, "desktop account ledger must load");
assert(Array.isArray(accounts.users), "desktop account ledger must return users");
assert(accounts.users.length > 0, "desktop account ledger must contain registered users");

const superAdmin = accounts.users.find((user) => user.email === SUPER_ADMIN_EMAIL);
assert(superAdmin, `${SUPER_ADMIN_EMAIL} must exist in registered account ledger`);
assert(superAdmin.role_ids.includes("system_super_admin"), `${SUPER_ADMIN_EMAIL} must have system_super_admin`);

const generalAccount = accounts.users.find(
  (user) => user.email !== SUPER_ADMIN_EMAIL && !user.role_ids.includes("system_super_admin")
);
assert(generalAccount, "a non-system-super-admin account is required for restriction smoke");

const superAdminPassword = temporaryPassword("matter-super-admin");
const generalPassword = temporaryPassword("matter-general");

await resetPasswordFor(SUPER_ADMIN_EMAIL, superAdminPassword);
await resetPasswordFor(generalAccount.email, generalPassword);

const login = await client.login({ email: SUPER_ADMIN_EMAIL, password: superAdminPassword });
assert.equal(login.ok, true, `${SUPER_ADMIN_EMAIL} login must pass`);
assert.equal(login.session.email, SUPER_ADMIN_EMAIL);
assert(login.session.role_ids.includes("system_super_admin"), `${SUPER_ADMIN_EMAIL} session must include system_super_admin`);
assert.equal(login.session.token_material_returned, false, "login response must not return token material");

const generalLogin = await client.login({ email: generalAccount.email, password: generalPassword });
assert.equal(generalLogin.ok, true, `${generalAccount.email} password login must pass`);
assert.equal(generalLogin.session.email, generalAccount.email);

const superAdminSmoke = await client.smoke({
  email: SUPER_ADMIN_EMAIL,
  featureId: "matter_vault_admin"
});
assert.equal(superAdminSmoke.ok, true, `${SUPER_ADMIN_EMAIL} admin smoke must pass`);
assert.equal(superAdminSmoke.decision, "allow");

const generalAdminSmoke = await client.smoke({
  email: generalAccount.email,
  featureId: "matter_vault_admin"
});
assert.equal(generalAdminSmoke.ok, false, "general account admin smoke must be denied");
assert.equal(generalAdminSmoke.decision, "deny");
assert.equal(generalAdminSmoke.http_status, 403);

const summary = {
  verdict: "PASS",
  runtime_mode: "aws-temporary-execute-api",
  base_url: config.baseUrl,
  account_count: accounts.users.length,
  super_admin_login: {
    email: SUPER_ADMIN_EMAIL,
    role: "system_super_admin",
    password_reset_confirmed: true,
    result: "allow"
  },
  general_account_login: {
    email: generalAccount.email,
    password_reset_confirmed: true,
    result: "allow"
  },
  general_account_admin_restriction: {
    email: generalAccount.email,
    feature_id: "matter_vault_admin",
    result: "deny",
    http_status: generalAdminSmoke.http_status
  },
  operator_token_material_printed: false,
  password_material_printed: false,
  reset_token_material_printed: false,
  real_client_data_used: false,
  custom_domain_required: false,
  public_release_claim: false,
  production_go_live_claim: false,
  owner_approval_claim: false
};

console.log(JSON.stringify(summary, null, 2));
