import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_CLIENT_SCOPES,
  resolveLawosUserRoleAssignment,
} from "../src/lawos-role-registry.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";
import { evaluateRouteDecision } from "../src/permission-gate.js";
import { createApiSessionAuth } from "../src/session-auth.js";

const CLIENT_SCOPE_SET = new Set(LAWOS_CLIENT_SCOPES);

function account(email) {
  const value = findRegisteredAccountByEmail(email);
  assert.ok(value, `registered account ${email} must exist`);
  return value;
}

function clientScopes(email) {
  return resolveLawosUserRoleAssignment(account(email)).scopes
    .filter((scope) => CLIENT_SCOPE_SET.has(scope))
    .sort();
}

async function signedContext(email) {
  const user = account(email);
  const auth = createApiSessionAuth({
    profile: "local-dev",
    secret: "client-operations-role-registry-test-secret",
  });
  const signed = await auth.login({
    email: user.email,
    password: user.local_dev.synthetic_token,
  }, { requestId: `req_client_operations_${user.user_id}` });
  assert.equal(signed.status, 200);
  const verified = await auth.verifyToken(
    signed.body.session_token,
    { requestId: `req_client_operations_verify_${user.user_id}` },
  );
  assert.equal(verified.ok, true);
  return verified.context;
}

function decision(context, action) {
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      resource_type: "ClientOperationsProbe",
    },
    action,
  }).effect;
}

test("CL-P0-W01-T04 maps the five Client capability profiles without expanding bank import roles", () => {
  const base = [
    "analytics.client.read",
    "crm.inquiry.evidence.read",
    "crm.inquiry.read",
    "crm.inquiry.write",
    "outlook.connection.manage",
    "outlook.inquiry.capture",
  ].sort();
  assert.deepEqual(clientScopes("yjlee@amic.kr"), base);
  assert.deepEqual(clientScopes("jh731@amic.kr"), [...base, "crm.engagement.decide"].sort());
  assert.deepEqual(clientScopes("wsjo@amic.kr"), [
    ...base,
    "analytics.client.export",
    "finance.fee.write",
  ].sort());
  assert.deepEqual(clientScopes("bj.park@amic.kr"), [
    ...base,
    "analytics.client.export",
    "crm.engagement.decide",
    "finance.fee.write",
  ].sort());
  assert.deepEqual(clientScopes("ytkim@amic.kr"), [...LAWOS_CLIENT_SCOPES].sort());

  const staffAssignment = resolveLawosUserRoleAssignment(account("yjlee@amic.kr"));
  const operationsAssignment = resolveLawosUserRoleAssignment(account("wsjo@amic.kr"));
  assert.equal(staffAssignment.scopes.includes("finance.bank.import"), false);
  assert.equal(staffAssignment.scopes.includes("finance.bank.classify"), false);
  assert.equal(operationsAssignment.scopes.includes("finance.bank.import"), false);
  assert.equal(operationsAssignment.scopes.includes("finance.bank.classify"), false);
});

test("CL-P0-W01-T04 staff signed session can capture and read inquiries but cannot decide engagement or export", async () => {
  const context = await signedContext("yjlee@amic.kr");
  assert.equal(decision(context, "crm:inquiry:list"), "allow");
  assert.equal(decision(context, "crm:inquiry:update"), "allow");
  assert.equal(decision(context, "crm:consultation:create"), "allow");
  assert.equal(
    decision(context, "crm:consultation:calendar_create"),
    "allow",
  );
  assert.equal(decision(context, "email_dms:inquiry_evidence:read"), "allow");
  assert.equal(decision(context, "outlook:connection:create"), "allow");
  assert.equal(decision(context, "outlook:inquiry:capture"), "allow");
  assert.equal(decision(context, "analytics:client:read"), "allow");
  assert.equal(decision(context, "crm:engagement:decide"), "deny");
  assert.equal(decision(context, "finance:fee_commitment:update"), "deny");
  assert.equal(decision(context, "analytics:client:export"), "deny");
});

test("CL-P0-W01-T04 attorney and operations signed sessions have distinct decision and finance authority", async () => {
  const attorney = await signedContext("jh731@amic.kr");
  assert.equal(decision(attorney, "crm:engagement:decide"), "allow");
  assert.equal(decision(attorney, "finance:fee_commitment:update"), "deny");
  assert.equal(decision(attorney, "analytics:client:export"), "deny");

  const operations = await signedContext("wsjo@amic.kr");
  assert.equal(decision(operations, "crm:engagement:decide"), "deny");
  assert.equal(decision(operations, "finance:fee_commitment:update"), "allow");
  assert.equal(decision(operations, "finance:deposit_allocation:reallocate"), "allow");
  assert.equal(decision(operations, "analytics:client:export"), "allow");
});
