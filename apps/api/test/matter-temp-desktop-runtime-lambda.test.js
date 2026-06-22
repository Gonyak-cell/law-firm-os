import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { handler } from "../src/matter-temp-desktop-runtime-lambda.mjs";

const TEST_OPERATOR_TOKEN = "test-operator-token";
process.env.OPERATOR_TOKEN_SHA256 = createHash("sha256").update(TEST_OPERATOR_TOKEN).digest("hex");

function event({ method = "GET", path = "/", body, headers, queryStringParameters } = {}) {
  return {
    httpMethod: method,
    path,
    headers: headers ?? {},
    queryStringParameters: queryStringParameters ?? {},
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function json(result) {
  return JSON.parse(result.body);
}

function authHeaders(token = TEST_OPERATOR_TOKEN) {
  return { authorization: `Bearer ${token}` };
}

test("temporary desktop runtime health exposes AWS no-domain synthetic boundary", async () => {
  const result = await handler(event({ path: "/health" }));
  const body = json(result);

  assert.equal(result.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.custom_domain_required, false);
  assert.equal(body.synthetic_only, true);
  assert.equal(body.operator_token_required_for_runtime_routes, true);
  assert.equal(body.operator_token_configured, true);
  assert.equal(body.password_login_required, true);
  assert.equal(body.password_reset_delivery_mode, "synthetic_email_outbox");
  assert.equal(body.production_ready_completed, false);
  assert.equal(body.public_release_completed, false);
  assert.equal(body.registered_account_count, 9);
  assert.equal(body.highest_privilege_account, "jwsuh@amic.kr");
});

test("temporary desktop runtime requires operator bearer token for runtime routes", async () => {
  const missing = await handler(event({ method: "POST", path: "/api/desktop/login", body: { email: "jwsuh@amic.kr" } }));
  const invalid = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders("wrong-token"),
      body: { email: "jwsuh@amic.kr" }
    })
  );

  assert.equal(missing.statusCode, 401);
  assert.equal(json(missing).reason, "operator_token_required");
  assert.equal(invalid.statusCode, 403);
  assert.equal(json(invalid).reason, "operator_token_invalid");
});

test("temporary desktop runtime requires password reset before ledger account login", async () => {
  const loginBeforeReset = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr", password: "new-jwsuh-password" }
    })
  );

  assert.equal(loginBeforeReset.statusCode, 403);
  assert.equal(json(loginBeforeReset).reason, "password_reset_required");
});

test("temporary desktop runtime completes reset email, password setup, and password login", async () => {
  const request = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/request",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr" }
    })
  );
  const requestBody = json(request);

  assert.equal(request.statusCode, 200);
  assert.equal(requestBody.accepted, true);
  assert.equal(requestBody.email_delivery.mode, "synthetic_email_outbox");
  assert.equal(requestBody.email_delivery.token_material_returned, false);
  assert.equal(JSON.stringify(requestBody).includes("reset_token"), false);

  const latestEmail = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/latest-email",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr" }
    })
  );
  const latestBody = json(latestEmail);
  const resetToken = latestBody.email_message.reset_token;

  assert.equal(latestEmail.statusCode, 200);
  assert.match(latestBody.email_message.reset_url, /^matter:\/\/password-reset\/confirm\?token=/);
  assert.equal(typeof resetToken, "string");

  const confirm = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/confirm",
      headers: authHeaders(),
      body: { token: resetToken, password: "new-jwsuh-password" }
    })
  );
  assert.equal(confirm.statusCode, 200);
  assert.equal(json(confirm).accepted, true);

  const wrongPassword = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr", password: "wrong-password" }
    })
  );
  assert.equal(wrongPassword.statusCode, 401);
  assert.equal(json(wrongPassword).reason, "auth_required");

  const login = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr", password: "new-jwsuh-password" }
    })
  );
  const loginBody = json(login);

  assert.equal(login.statusCode, 200);
  assert.equal(loginBody.ok, true);
  assert.equal(loginBody.session.email, "jwsuh@amic.kr");
  assert.ok(loginBody.session.role_ids.includes("system_super_admin"));
  assert.equal(loginBody.session.token_material_returned, false);
  assert.equal(JSON.stringify(loginBody).includes("new-jwsuh-password"), false);

  const reused = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/confirm",
      headers: authHeaders(),
      body: { token: resetToken, password: "another-password" }
    })
  );
  assert.equal(reused.statusCode, 401);
  assert.equal(json(reused).reason, "invalid_reset_token");
});

test("temporary desktop runtime accepts unknown reset requests without account disclosure", async () => {
  const request = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/request",
      headers: authHeaders(),
      body: { email: "missing@amic.kr" }
    })
  );
  const latestEmail = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/latest-email",
      headers: authHeaders(),
      body: { email: "missing@amic.kr" }
    })
  );

  assert.equal(request.statusCode, 200);
  assert.equal(json(request).accepted, true);
  assert.equal(latestEmail.statusCode, 404);
});

test("temporary desktop runtime denies highest privilege feature for non-jwsuh accounts", async () => {
  const denied = await handler(
    event({
      method: "POST",
      path: "/api/matter-vault/smoke",
      headers: authHeaders(),
      body: { email: "ytkim@amic.kr", feature_id: "matter_vault_admin" }
    })
  );
  const allowed = await handler(
    event({
      method: "POST",
      path: "/api/matter-vault/smoke",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr", feature_id: "matter_vault_admin" }
    })
  );

  assert.equal(denied.statusCode, 403);
  assert.equal(json(denied).decision, "deny");
  assert.equal(allowed.statusCode, 200);
  assert.equal(json(allowed).decision, "allow");
});
