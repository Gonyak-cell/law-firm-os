import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePrivateStagingEntraContract } from "../lib/private-staging-entra-contract.mjs";

function fixture() {
  return JSON.parse(readFileSync(new URL("../../infra/lawos-private-staging/entra-pilot-contract.json", import.meta.url), "utf8"));
}

test("Entra contract is single-tenant PKCE, pilot-only, and report-only for seven days", () => {
  const result = validatePrivateStagingEntraContract(fixture());
  assert.equal(result.verdict, "PASS_WITH_EXTERNAL_PREREQUISITES");
  assert.equal(result.report_only_minimum_days, 7);
  assert.equal(result.tenant_wide_policy_count, 0);
  assert.equal(result.runtime_graph_permission_count, 0);
  assert.equal(result.physical_fido2_operator_step_required, true);
  assert.equal(result.conditional_access_license_external_verification_required, true);
});

test("Entra contract cannot claim Conditional Access licensing from source", () => {
  const value = fixture();
  value.licensing.verified_in_source = true;
  assert.throws(() => validatePrivateStagingEntraContract(value), /verified against the interactive target tenant/u);
});

test("Entra contract rejects tenant-wide enforcement and embedded identities", () => {
  const broad = fixture();
  broad.conditional_access.all_users = true;
  assert.throws(() => validatePrivateStagingEntraContract(broad), /tenant-wide/u);
  const tenant = fixture();
  tenant.tenant_id = "11111111-1111-4111-8111-111111111111";
  assert.throws(() => validatePrivateStagingEntraContract(tenant), /must not contain/u);
  const user = fixture();
  user.pilot_user = "pilot@example.test";
  assert.throws(() => validatePrivateStagingEntraContract(user), /must not contain/u);
});

test("Entra contract rejects runtime Graph permissions and client secrets", () => {
  const graph = fixture();
  graph.application.required_resource_access.push("User.Read");
  assert.throws(() => validatePrivateStagingEntraContract(graph), /does not justify/u);
  const secret = fixture();
  secret.application.client_secret_required = true;
  assert.throws(() => validatePrivateStagingEntraContract(secret), /without a client secret/u);
});

test("Entra automation cannot create emergency users or assign directory roles", () => {
  const value = fixture();
  value.graph_authority.required_delegated_permissions.push("RoleManagement.ReadWrite.Directory");
  assert.throws(() => validatePrivateStagingEntraContract(value), /delegated permission set drifted/u);

  const accountAutomation = fixture();
  accountAutomation.emergency_access.automation_user_creation = true;
  assert.throws(() => validatePrivateStagingEntraContract(accountAutomation), /automation must not create/u);
});
