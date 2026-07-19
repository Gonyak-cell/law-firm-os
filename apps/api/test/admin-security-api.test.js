import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { findRegisteredAccountByEmail } from "../src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "./helpers/session.js";

let server;
let baseUrl;
let adminHeaders;
let staffHeaders;

function account(email) {
  const found = findRegisteredAccountByEmail(email);
  assert.ok(found, `registered account ${email} should exist`);
  return found;
}

async function json(path, options = {}, headers = adminHeaders) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  return { status: response.status, body: await response.json() };
}

async function loginAs(email) {
  const user = account(email);
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.local_dev.synthetic_token }),
  });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
  adminHeaders = await apiSessionHeaders(baseUrl, account("jwsuh@amic.kr"));
  staffHeaders = await apiSessionHeaders(baseUrl, account("yjlee@amic.kr"));
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("admin security operations disable login, reactivate accounts, and audit break-glass transitions", async () => {
  const target = account("yjlee@amic.kr");
  const listed = await json("/api/admin/security/users");
  assert.equal(listed.status, 200);
  assert.ok(listed.body.items.some((item) => item.user_id === target.user_id && item.status === "active"));
  assert.equal(listed.body.items.some((item) => "local_dev" in item || "synthetic_token" in item), false);

  const denied = await json(
    `/api/admin/security/users/${encodeURIComponent(account("wsjo@amic.kr").user_id)}/disable`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed: true, reason: "permission probe" }),
    },
    staffHeaders,
  );
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.safe_error_codes, ["ADMIN_SECURITY_PERMISSION_DENIED"]);

  const disabled = await json(`/api/admin/security/users/${encodeURIComponent(target.user_id)}/disable`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmed: true, reason: "stage 11 login block proof" }),
  });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.item.status, "disabled");
  assert.equal(disabled.body.item.login_allowed, false);

  const blockedLogin = await loginAs("yjlee@amic.kr");
  assert.equal(blockedLogin.status, 403);
  assert.deepEqual(blockedLogin.body.safe_error_codes, ["AUTH_ACCOUNT_DISABLED"]);

  const reactivated = await json(`/api/admin/security/users/${encodeURIComponent(target.user_id)}/reactivate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "stage 11 reactivation proof" }),
  });
  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.body.item.status, "active");

  const restoredLogin = await loginAs("yjlee@amic.kr");
  assert.equal(restoredLogin.status, 200);
  assert.match(restoredLogin.body.session_token, /^lawos_session_v1\./);

  const missingReason = await json("/api/admin/security/break-glass", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requester_user_id: target.user_id, reason: "   " }),
  });
  assert.equal(missingReason.status, 400);
  assert.deepEqual(missingReason.body.safe_error_codes, ["ADMIN_SECURITY_BREAK_GLASS_REASON_REQUIRED"]);

  const requested = await json("/api/admin/security/break-glass", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requester_user_id: target.user_id, break_glass_account_ref: "secretsmanager://lawos/break-glass/account", reason: "stage 11 emergency access proof" }),
  });
  assert.equal(requested.status, 201);
  assert.equal(requested.body.item.state, "pending");

  const approved = await json(`/api/admin/security/break-glass/${encodeURIComponent(requested.body.item.break_glass_request_id)}/approve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "stage 11 approve proof" }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.item.state, "pending");
  assert.equal(approved.body.item.approval_count, 1);
  assert.equal(approved.body.item.required_approvals, 2);

  const revokeCandidate = await json("/api/admin/security/break-glass", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requester_user_id: target.user_id, break_glass_account_ref: "secretsmanager://lawos/break-glass/account", reason: "stage 11 revoke proof" }),
  });
  const revoked = await json(`/api/admin/security/break-glass/${encodeURIComponent(revokeCandidate.body.item.break_glass_request_id)}/revoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "stage 11 revoke proof" }),
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.item.state, "revoked");

  const audit = await json("/api/admin/security/audit");
  const actions = new Set(audit.body.items.map((item) => item.action));
  assert.ok(actions.has("admin.security.user.disabled"));
  assert.ok(actions.has("admin.security.user.reactivated"));
  assert.ok(actions.has("admin.security.break_glass.requested"));
  assert.ok(actions.has("admin.security.break_glass.approval_recorded"));
  assert.ok(actions.has("admin.security.break_glass.revoked"));
});
