import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import https from "node:https";
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

const EMAIL_ENV_KEYS = [
  "MATTER_PASSWORD_RESET_EMAIL_DELIVERY",
  "MATTER_PASSWORD_RESET_EMAIL_FROM",
  "MATTER_PASSWORD_RESET_EMAIL_FROM_NAME",
  "MATTER_PASSWORD_RESET_EMAIL_REPLY_TO",
  "MATTER_PASSWORD_RESET_EMAIL_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_REGION",
  "AWS_DEFAULT_REGION"
];

async function withEmailEnv(values, callback) {
  const previous = new Map(EMAIL_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of EMAIL_ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try {
    return await callback();
  } finally {
    for (const key of EMAIL_ENV_KEYS) {
      if (previous.get(key) === undefined) delete process.env[key];
      else process.env[key] = previous.get(key);
    }
  }
}

function installHttpsJsonResponder(responseBody = { MessageId: "ses-message-1" }) {
  const originalRequest = https.request;
  const calls = [];
  https.request = (options, callback) => {
    const chunks = [];
    const request = new EventEmitter();
    request.write = (chunk) => chunks.push(Buffer.from(chunk));
    request.end = () => {
      const body = Buffer.concat(chunks).toString("utf8");
      calls.push({ options, body });
      const response = new EventEmitter();
      response.statusCode = 200;
      response.setEncoding = () => {};
      callback(response);
      queueMicrotask(() => {
        response.emit("data", JSON.stringify(responseBody));
        response.emit("end");
      });
    };
    return request;
  };
  return {
    calls,
    restore() {
      https.request = originalRequest;
    }
  };
}

function decodeBase64MimePart(rawEmail, contentType) {
  const escapedContentType = contentType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rawEmail.match(
    new RegExp(`${escapedContentType}[^\\r\\n]*\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n([A-Za-z0-9+/=\\r\\n]+)\\r\\n--`)
  );
  assert.ok(match, `expected ${contentType} base64 MIME part`);
  return Buffer.from(match[1].replace(/\s/g, ""), "base64").toString("utf8");
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
  assert.equal(body.password_reset_email_provider, "synthetic_outbox");
  assert.equal(body.password_reset_email_configured, false);
  assert.equal(body.production_ready_completed, false);
  assert.equal(body.public_release_completed, false);
  assert.equal(body.registered_account_count, 9);
  assert.equal(body.highest_privilege_account, "jwsuh@amic.kr");
});

test("configured SESv2 reset delivery sends registered reset mail without returning token material", async () => {
  const stub = installHttpsJsonResponder();
  try {
    await withEmailEnv(
      {
        MATTER_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
        MATTER_PASSWORD_RESET_EMAIL_FROM: "matter@amic.kr",
        MATTER_PASSWORD_RESET_EMAIL_FROM_NAME: "Matter Desktop App Services",
        MATTER_PASSWORD_RESET_EMAIL_REGION: "ap-northeast-2",
        AWS_ACCESS_KEY_ID: "test-access-key",
        AWS_SECRET_ACCESS_KEY: "test-secret-key"
      },
      async () => {
        const health = json(await handler(event({ path: "/health" })));
        assert.equal(health.password_reset_delivery_mode, "sesv2_email");
        assert.equal(health.password_reset_email_provider, "sesv2");
        assert.equal(health.password_reset_email_configured, true);

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
        assert.equal(requestBody.email_delivery.mode, "sesv2_email");
        assert.equal(requestBody.email_delivery.status, "accepted");
        assert.equal(requestBody.email_delivery.message_id_returned, false);
        assert.equal(JSON.stringify(requestBody).includes("reset_token"), false);
        assert.equal(stub.calls.length, 1);

        const sesCall = stub.calls[0];
        assert.equal(sesCall.options.hostname, "email.ap-northeast-2.amazonaws.com");
        assert.equal(sesCall.options.path, "/v2/email/outbound-emails");
        assert.match(sesCall.options.headers.authorization, /^AWS4-HMAC-SHA256 /);
        const sesPayload = JSON.parse(sesCall.body);
        assert.equal(sesPayload.FromEmailAddress, "Matter Desktop App Services <matter@amic.kr>");
        assert.deepEqual(sesPayload.Destination.ToAddresses, ["jwsuh@amic.kr"]);
        assert.equal(sesPayload.Content.Simple, undefined);
        assert.ok(sesPayload.Content.Raw.Data);
        const rawEmail = Buffer.from(sesPayload.Content.Raw.Data, "base64").toString("utf8");
        assert.match(rawEmail, /^From: Matter Desktop App Services <matter@amic\.kr>/m);
        assert.match(rawEmail, /^Subject: =\?UTF-8\?B\?/m);
        assert.match(rawEmail, /Content-Type: multipart\/related/);
        assert.match(rawEmail, /Content-Type: image\/png; name="matter-logo\.png"/);
        assert.match(rawEmail, /Content-ID: <matter-app-logo>/);
        assert.match(rawEmail, /Content-Disposition: inline; filename="matter-logo\.png"/);
        const textPart = decodeBase64MimePart(rawEmail, "Content-Type: text/plain");
        const htmlPart = decodeBase64MimePart(rawEmail, "Content-Type: text/html");
        assert.match(textPart, /matter:\/\/password-reset\/confirm\?token=/);
        assert.match(textPart, /matter OS 비밀번호 설정/);
        assert.match(htmlPart, /<h1[^>]*>비밀번호를 설정하세요<\/h1>/);
        assert.match(htmlPart, /<img src="cid:matter-app-logo"[^>]+alt="matter"/);
        assert.match(htmlPart, /Matter Desktop App Services/);
        assert.match(htmlPart, /비밀번호 설정 열기/);
        assert.match(htmlPart, /AMIC 내부 계정 보안 알림/);

        const latestEmail = await handler(
          event({
            method: "POST",
            path: "/api/desktop/password-reset/latest-email",
            headers: authHeaders(),
            body: { email: "jwsuh@amic.kr" }
          })
        );
        assert.equal(json(latestEmail).email_message.delivery.status, "sent");
        assert.equal(json(latestEmail).email_message.delivery.message_id, "ses-message-1");

        const unknown = await handler(
          event({
            method: "POST",
            path: "/api/desktop/password-reset/request",
            headers: authHeaders(),
            body: { email: "missing@amic.kr" }
          })
        );
        assert.equal(unknown.statusCode, 200);
        assert.equal(json(unknown).email_delivery.mode, "sesv2_email");
        assert.equal(stub.calls.length, 1);
      }
    );
  } finally {
    stub.restore();
  }
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
  const malformedLogin = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr", password: "new-jwsuh-password", actor_email: "jwsuh@amic.kr" }
    })
  );
  const missingPassword = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr" }
    })
  );
  const loginBeforeReset = await handler(
    event({
      method: "POST",
      path: "/api/desktop/login",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr", password: "new-jwsuh-password" }
    })
  );

  assert.equal(malformedLogin.statusCode, 400);
  assert.equal(json(malformedLogin).reason, "email_password_only");
  assert.deepEqual(json(malformedLogin).unexpected_fields, ["actor_email"]);
  assert.equal(missingPassword.statusCode, 400);
  assert.equal(json(missingPassword).reason, "email_password_required");
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

test("temporary desktop runtime bounds synthetic reset state for Secrets Manager", async () => {
  for (let index = 0; index < 40; index += 1) {
    const request = await handler(
      event({
        method: "POST",
        path: "/api/desktop/password-reset/request",
        headers: authHeaders(),
        body: { email: "jwsuh@amic.kr" }
      })
    );
    assert.equal(request.statusCode, 200);
  }

  const state = globalThis.__matterDesktopAuthState;
  const persistedShape = JSON.stringify({
    reset_tokens: Object.fromEntries(state.resetTokens),
    outbox: state.outbox
  });
  assert(state.resetTokens.size <= 20, "reset token state must be bounded");
  assert(state.outbox.length <= 20, "synthetic reset outbox must be bounded");
  assert(Buffer.byteLength(persistedShape) < 65_536, "synthetic auth state must fit Secrets Manager SecretString");

  const latestEmail = await handler(
    event({
      method: "POST",
      path: "/api/desktop/password-reset/latest-email",
      headers: authHeaders(),
      body: { email: "jwsuh@amic.kr" }
    })
  );
  assert.equal(latestEmail.statusCode, 200);
  assert.match(json(latestEmail).email_message.reset_url, /^matter:\/\/password-reset\/confirm\?token=/);
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
