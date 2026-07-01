#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "../apps/desktop/src/main/aws-runtime.js";
import { assertResetAllowed, resetProtectionSummary, selectQaResetAccount } from "./lib/protected-reset-accounts.mjs";

const SUPER_ADMIN_EMAIL = "jwsuh@amic.kr";

const config = loadMatterVaultRuntimeConfig();
const client = createMatterVaultAwsRuntimeClient(config);

function temporaryPassword(label) {
  return `${label}-${randomBytes(12).toString("base64url")}`;
}

async function resetPasswordFor(email, password) {
  assertResetAllowed(email, { context: "matter desktop AWS runtime smoke" });
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

const qaAccount = selectQaResetAccount(accounts.users);

const qaPassword = temporaryPassword("matter-qa");

await resetPasswordFor(qaAccount.email, qaPassword);

const qaLogin = await client.login({ email: qaAccount.email, password: qaPassword });
assert.equal(qaLogin.ok, true, `${qaAccount.email} password login must pass`);
assert.equal(qaLogin.session.email, qaAccount.email);
assert.equal(qaLogin.session.token_material_returned, false, "login response must not return token material");

const superAdminSmoke = await client.smoke({
  email: SUPER_ADMIN_EMAIL,
  featureId: "matter_vault_admin"
});
assert.equal(superAdminSmoke.ok, true, `${SUPER_ADMIN_EMAIL} admin smoke must pass`);
assert.equal(superAdminSmoke.decision, "allow");

const generalAdminSmoke = await client.smoke({
  email: qaAccount.email,
  featureId: "matter_vault_admin"
});
assert.equal(generalAdminSmoke.ok, false, "QA/general account admin smoke must be denied");
assert.equal(generalAdminSmoke.decision, "deny");
assert.equal(generalAdminSmoke.http_status, 403);

const summary = {
  verdict: "PASS",
  runtime_mode: "aws-temporary-execute-api",
  base_url: config.baseUrl,
  account_count: accounts.users.length,
  reset_protection: resetProtectionSummary(),
  super_admin_read_only: {
    email: SUPER_ADMIN_EMAIL,
    role: "system_super_admin",
    password_reset_confirmed: false,
    password_login_attempted: false,
    result: "allow"
  },
  qa_account_login: {
    email: qaAccount.email,
    password_reset_confirmed: true,
    result: "allow"
  },
  qa_account_admin_restriction: {
    email: qaAccount.email,
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
