import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { handler } from "../src/mater-temp-desktop-runtime-lambda.mjs";

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

test("temporary desktop runtime logs in ledger accounts without returning token material", async () => {
  const result = await handler(
    event({ method: "POST", path: "/api/desktop/login", headers: authHeaders(), body: { email: "jwsuh@amic.kr" } })
  );
  const body = json(result);

  assert.equal(result.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.session.email, "jwsuh@amic.kr");
  assert.equal(body.session.highest_privilege, true);
  assert.ok(body.session.role_ids.includes("system_super_admin"));
  assert.equal(body.session.token_material_returned, false);
  assert.equal(JSON.stringify(body).includes("local-dev-only:"), false);
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
