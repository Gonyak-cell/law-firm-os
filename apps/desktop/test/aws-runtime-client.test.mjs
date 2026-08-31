import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import {
  assertNoRuntimeSecretMaterial,
  createDisabledMatterVaultRuntimeClient,
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig,
  parseDotEnv
} from "../src/main/aws-runtime.js";

function jsonResponse(status, body) {
  return {
    status,
    async text() {
      return JSON.stringify(body);
    }
  };
}

function binaryResponse(status, headers, chunks) {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return {
    status,
    headers: { get(name) { return normalized.get(String(name).toLowerCase()) ?? null; } },
    body: Readable.from(chunks),
  };
}

function directTransferGrant(operationId, { filename, mimeType, byteSize }) {
  return {
    ok: true,
    outcome: "transfer_ready",
    operation_id: operationId,
    transfer_grant_returned: true,
    transfer: {
      method: "PUT",
      upload_url: `http://127.0.0.1:4812/test-vault-transfer/${operationId}`,
      required_headers: {
        "content-length": String(byteSize),
        "content-type": mimeType,
        "if-none-match": "*",
      },
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      transfer_ref: `vault-transfer:${operationId}`,
      file: { filename, mime_type: mimeType, byte_size: byteSize },
    },
  };
}

test("runtime config loads AWS execute-api URL and operator credential from local env shape", () => {
  const envText = [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://example.execute-api.ap-northeast-2.amazonaws.com/staging////",
    "MATTER_VAULT_R4_PRODUCTION_TENANT_ID=tenant_amic_matter_vault",
    "MATTER_VAULT_R4_OPERATOR_ACTOR=jwsuh@amic.kr",
    "MATTER_VAULT_R4_OPERATOR_TOKEN=runtime-secret",
    "MATTER_VAULT_R4_MIGRATION_WINDOW=internal-temporary"
  ].join("\n");

  const config = loadMatterVaultRuntimeConfig({
    env: {},
    envPath: "/tmp/matter.env",
    existsSyncImpl: () => true,
    readFileSyncImpl: () => envText
  });

  assert.equal(config.baseUrl, "https://example.execute-api.ap-northeast-2.amazonaws.com/staging");
  assert.equal(config.operatorToken, "runtime-secret");
  assert.equal(config.tenantId, "tenant_amic_matter_vault");
});

test("runtime config ignores partial stale desktop auth override when a production runtime pair is present", () => {
  const envText = [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://example.execute-api.ap-northeast-2.amazonaws.com/staging/",
    "MATTER_DESKTOP_RUNTIME_BASE_URL=https://desktop-auth.example.test/",
    "MATTER_VAULT_R4_OPERATOR_TOKEN=runtime-secret"
  ].join("\n");
  const repoEnvPath = "/workspace/law-firm-os/.env.matter-vault-r4.local";

  const config = loadMatterVaultRuntimeConfig({
    env: {},
    cwd: "/",
    moduleDirectory: "/workspace/law-firm-os/apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/main",
    existsSyncImpl: (candidate) => candidate === repoEnvPath,
    readFileSyncImpl: (candidate) => {
      assert.equal(candidate, repoEnvPath);
      return envText;
    }
  });

  assert.equal(config.envPath, repoEnvPath);
  assert.equal(config.envFilePresent, true);
  assert.equal(config.baseUrl, "https://example.execute-api.ap-northeast-2.amazonaws.com/staging");
  assert.equal(config.operatorToken, "runtime-secret");
  assert.equal(config.operatorRuntimeConfigured, true);
});

test("runtime config keeps loopback desktop runtime override for local API even when a production pair is present", () => {
  const envText = [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://example.execute-api.ap-northeast-2.amazonaws.com/staging/",
    "MATTER_VAULT_R4_OPERATOR_TOKEN=runtime-secret"
  ].join("\n");
  const repoEnvPath = "/workspace/law-firm-os/.env.matter-vault-r4.local";

  const config = loadMatterVaultRuntimeConfig({
    env: {
      MATTER_DESKTOP_RUNTIME_BASE_URL: "http://127.0.0.1:4812",
      MATTER_DESKTOP_LOCAL_LOGIN_EMAIL: "local-qa@example.test"
    },
    cwd: "/",
    moduleDirectory: "/workspace/law-firm-os/apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/main",
    existsSyncImpl: (candidate) => candidate === repoEnvPath,
    readFileSyncImpl: (candidate) => {
      assert.equal(candidate, repoEnvPath);
      return envText;
    }
  });

  assert.equal(config.envPath, repoEnvPath);
  assert.equal(config.envFilePresent, true);
  assert.equal(config.baseUrl, "http://127.0.0.1:4812");
  assert.equal(config.operatorToken, "");
  assert.equal(config.operatorRuntimeConfigured, false);
  assert.equal(config.localLoginEmail, "local-qa@example.test");
  assert.equal(createMatterVaultAwsRuntimeClient(config).runtimeStatus().localLoginEmail, "local-qa@example.test");
});

test("runtime config keeps a complete desktop auth override from app bundle ancestors", () => {
  const envText = [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://example.execute-api.ap-northeast-2.amazonaws.com/staging/",
    "MATTER_DESKTOP_RUNTIME_BASE_URL=https://desktop-auth.example.test/",
    "MATTER_VAULT_R4_OPERATOR_TOKEN=runtime-secret",
    "MATTER_DESKTOP_OPERATOR_TOKEN=desktop-runtime-secret"
  ].join("\n");
  const repoEnvPath = "/workspace/law-firm-os/.env.matter-vault-r4.local";

  const config = loadMatterVaultRuntimeConfig({
    env: {},
    cwd: "/",
    moduleDirectory: "/workspace/law-firm-os/apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/main",
    existsSyncImpl: (candidate) => candidate === repoEnvPath,
    readFileSyncImpl: (candidate) => {
      assert.equal(candidate, repoEnvPath);
      return envText;
    }
  });

  assert.equal(config.envPath, repoEnvPath);
  assert.equal(config.envFilePresent, true);
  assert.equal(config.baseUrl, "https://desktop-auth.example.test");
  assert.equal(config.operatorToken, "desktop-runtime-secret");
  assert.equal(config.operatorRuntimeConfigured, true);
});

test("runtime config falls back to production auth URL without operator credential", () => {
  const config = loadMatterVaultRuntimeConfig({
    env: {},
    envPath: "/tmp/missing-matter-desktop.env",
    existsSyncImpl: () => false,
    readFileSyncImpl: () => ""
  });
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: config.baseUrl,
    fetchImpl: async () => jsonResponse(200, { ok: true, token_material_returned: false })
  });

  assert.equal(config.baseUrl, "https://d2mthcc8vp3cr2.cloudfront.net");
  assert.equal(config.operatorToken, "");
  assert.equal(config.operatorRuntimeConfigured, false);
  assert.equal(config.localLoginEmail, "");
  assert.equal(client.runtimeStatus().configured, true);
  assert.equal(client.runtimeStatus().mode, "production-auth-http");
  assert.equal(client.runtimeStatus().operatorRuntimeConfigured, false);
});

test("runtime client keeps bearer credential in main-process fetch and returns sanitized account data", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    tenantId: "tenant_amic_matter_vault",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, {
        ok: true,
        users: [{ email: "jwsuh@amic.kr", role_ids: ["system_super_admin"] }],
        token_material_returned: false
      });
    }
  });

  const response = await client.accounts();

  assert.equal(
    calls[0].url,
    "https://example.execute-api.ap-northeast-2.amazonaws.com/staging/api/desktop/accounts"
  );
  assert.equal(calls[0].init.headers.authorization, "Bearer runtime-secret");
  assert.equal(response.ok, true);
  assert.equal(response.http_status, 200);
  assert.equal(JSON.stringify(response).includes("runtime-secret"), false);
});

test("runtime client supports password reset and password login without operator credential", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { ok: true, session_token: "lawos_session_v1.secret", token_material_returned: false });
    }
  });

  await client.requestPasswordReset({ email: "jwsuh@amic.kr" });
  const latest = await client.latestResetEmail({ email: "jwsuh@amic.kr" });
  await client.confirmPasswordReset({ token: "reset-token-from-email-link", password: "new-password" });
  await client.login({ email: "jwsuh@amic.kr", password: "new-password", actorEmail: "ignored@amic.kr" });

  assert.equal(calls[0].url.endsWith("/api/auth/password-reset/request"), true);
  assert.equal(calls[1].url.endsWith("/api/auth/password-reset/confirm"), true);
  assert.equal(calls[2].url.endsWith("/api/auth/login"), true);
  assert.deepEqual(JSON.parse(calls[2].init.body), { email: "jwsuh@amic.kr", password: "new-password" });
  assert.equal("authorization" in calls[0].init.headers, false);
  assert.equal("authorization" in calls[1].init.headers, false);
  assert.equal("authorization" in calls[2].init.headers, false);
  assert.equal(latest.http_status, 410);
  assert.equal(latest.token_material_returned, false);
});

test("runtime client revokes a signed session without exposing bearer material", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { ok: true, replayed: false, token_material_returned: false });
    }
  });

  const response = await client.logout({ sessionToken: "lawos_session_v1.secret" });

  assert.equal(calls[0].url.endsWith("/api/auth/logout"), true);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization, "Bearer lawos_session_v1.secret");
  assert.deepEqual(response, {
    ok: true,
    replayed: false,
    reason: null,
    http_status: 200,
    token_material_returned: false
  });
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
});

test("runtime client projects server-owned Vault capabilities from the signed session response", async () => {
  const calls = [];
  const capabilities = [
    { id: "read", label: "Vault 조회", allowed: true, decision: "allow", safe_reason_code: null },
    { id: "upload", label: "Vault 저장", allowed: false, decision: "deny", safe_reason_code: "VAULT_CAPABILITY_NOT_GRANTED" },
  ];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, {
        ok: true,
        session: { state: "signed_in", user_id: "user_amic", tenant_id: "tenant_amic" },
        vault_capabilities: {
          schema_version: "law-firm-os.vault-capability-projection.v1",
          authoritative: true,
          capabilities,
          token_material_returned: false,
          raw_policy_returned: false,
          role_names_returned: false,
          production_ready_claim: false,
        },
        token_material_returned: false,
      });
    },
  });

  const response = await client.features({ sessionToken: "lawos_session_v1.secret" });

  assert.equal(calls[0].url.endsWith("/api/auth/session"), true);
  assert.equal(calls[0].init.headers.authorization, "Bearer lawos_session_v1.secret");
  assert.deepEqual(response.features, capabilities);
  assert.equal(response.vault_capabilities.role_names_returned, false);
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
});

test("runtime client refuses logout without a signed session", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async () => {
      throw new Error("missing session must not call the runtime");
    }
  });

  assert.deepEqual(await client.logout(), {
    ok: false,
    reason: "auth_session_required",
    http_status: 401,
    token_material_returned: false
  });
});

test("runtime client replaces an unsafe logout failure reason", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async () => jsonResponse(502, {
      ok: false,
      reason: "upstream echoed lawos_session_v1.secret",
      token_material_returned: false
    })
  });

  const response = await client.logout({ sessionToken: "lawos_session_v1.secret" });

  assert.equal(response.reason, "server_session_revoke_failed");
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
});

test("runtime client maps loopback local API logins to local-dev credentials in main process", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, {
        ok: true,
        session_token: "lawos_session_v1.secret",
        session: { email: "jwsuh@amic.kr", tenant_id: "tenant_amic_matter_vault" },
        token_material_returned: false
      });
    }
  });

  const response = await client.login({ email: "JWSUH@AMIC.KR", password: "typed-password" });

  assert.equal(response.ok, true);
  assert.equal(calls[0].url, "http://127.0.0.1:4812/api/auth/login");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    email: "JWSUH@AMIC.KR",
    password: "local-dev-only:jwsuh@amic.kr"
  });
  assert.equal(JSON.stringify(response).includes("typed-password"), false);
});

test("runtime client uses desktop auth endpoints when operator credential is configured", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { ok: true, email_message: { to: "jwsuh@amic.kr" }, token_material_returned: false });
    }
  });

  await client.requestPasswordReset({ email: "jwsuh@amic.kr" });
  await client.latestResetEmail({ email: "jwsuh@amic.kr" });
  await client.confirmPasswordReset({ token: "reset-token-from-email-link", password: "new-password" });
  await client.login({ email: "jwsuh@amic.kr", password: "new-password" });

  assert.equal(calls[0].url.endsWith("/api/desktop/password-reset/request"), true);
  assert.equal(calls[1].url.endsWith("/api/desktop/password-reset/latest-email"), true);
  assert.equal(calls[2].url.endsWith("/api/desktop/password-reset/confirm"), true);
  assert.equal(calls[3].url.endsWith("/api/desktop/login"), true);
  assert.equal(calls.every((call) => call.init.headers.authorization === "Bearer runtime-secret"), true);
  assert.equal(JSON.stringify(calls).includes("runtime-secret"), true);
});

test("runtime client wraps reset confirm transport and non-json failures without secret material", async () => {
  const transportClient = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async () => {
      throw Object.assign(new Error("network down"), { code: "ECONNRESET" });
    }
  });
  const transport = await transportClient.confirmPasswordReset({ token: "reset-token-from-email-link", password: "new-password" });
  assert.equal(transport.ok, false);
  assert.equal(transport.reason, "runtime_request_failed");
  assert.equal(transport.error_code, "ECONNRESET");
  assert.equal(transport.http_status, 0);
  assert.equal(JSON.stringify(transport).includes("reset-token-from-email-link"), false);

  const htmlClient = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async () => ({
      status: 502,
      async text() {
        return "<html>bad gateway</html>";
      }
    })
  });
  const html = await htmlClient.confirmPasswordReset({ token: "reset-token-from-email-link", password: "new-password" });
  assert.equal(html.ok, false);
  assert.equal(html.reason, "runtime_response_not_json");
  assert.equal(html.response_body_present, true);
  assert.equal(html.http_status, 502);
  assert.equal(JSON.stringify(html).includes("reset-token-from-email-link"), false);
});

test("runtime client selects the health route for each runtime mode", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url.toString());
    return jsonResponse(200, { ok: true });
  };
  const productionClient = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://lawos.example.test",
    fetchImpl
  });
  const temporaryClient = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    fetchImpl
  });

  await productionClient.health();
  await temporaryClient.health();

  assert.deepEqual(requestedUrls, [
    "https://lawos.example.test/api/health",
    "https://example.execute-api.ap-northeast-2.amazonaws.com/staging/health"
  ]);
});

test("runtime client ends stalled requests at the configured deadline", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    requestTimeoutMs: 5,
    fetchImpl: async (_url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });

  const response = await client.health();

  assert.equal(response.ok, false);
  assert.equal(response.reason, "runtime_request_timeout");
  assert.equal(response.error_code, "TimeoutError");
  assert.equal(response.http_status, 0);
  assert.equal(response.token_material_returned, false);
});

test("runtime client deadline remains active while reading a stalled response body", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    requestTimeoutMs: 5,
    fetchImpl: async (_url, { signal }) => ({
      status: 200,
      text: async () => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      })
    })
  });

  const response = await client.health();

  assert.equal(response.reason, "runtime_request_timeout");
  assert.equal(response.error_code, "TimeoutError");
  assert.equal(response.http_status, 0);
});

test("runtime client still rejects secret-bearing response material", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    fetchImpl: async () => jsonResponse(200, { operator_token: "runtime-secret" }),
  });

  await assert.rejects(() => client.accounts(), /forbidden field/);
});

test("runtime client preserves 403 deny responses for general-account smoke checks", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    fetchImpl: async () =>
      jsonResponse(403, {
        ok: false,
        decision: "deny",
        feature_id: "matter_vault_admin",
        actor_email: "general@amic.kr"
      })
  });

  const response = await client.smoke({ email: "general@amic.kr", featureId: "matter_vault_admin" });

  assert.equal(response.ok, false);
  assert.equal(response.decision, "deny");
  assert.equal(response.http_status, 403);
});

test("runtime client proxies signed desktop read API calls without exposing session material", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, {
        request_id: "req-read",
        outcome: "passed",
        items: [{ matter_id: "matter-001" }],
        token_material_returned: false
      });
    }
  });

  const response = await client.api({
    path: "/api/matters?tenant_id=tenant_amic_matter_vault",
    method: "GET",
    headers: {
      authorization: "Bearer must-not-forward-from-renderer",
      "x-lawos-permission-context": "{\"principal\":{\"tenant_id\":\"tenant_amic_matter_vault\"}}"
    },
    sessionToken: "lawos_session_v1.secret"
  });

  assert.equal(
    calls[0].url,
    "https://example.execute-api.ap-northeast-2.amazonaws.com/staging/api/matters?tenant_id=tenant_amic_matter_vault"
  );
  assert.equal(calls[0].init.headers.authorization, "Bearer lawos_session_v1.secret");
  assert.equal(calls[0].init.headers["x-lawos-permission-context"].includes("tenant_amic_matter_vault"), true);
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
  assert.equal(JSON.stringify(response).includes("must-not-forward-from-renderer"), false);
  assert.equal(response.http_status, 200);
  assert.equal(response.body.items.length, 1);
});

test("runtime client read API bridge blocks writes and auth routes", async () => {
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    fetchImpl: async () => {
      throw new Error("blocked request should not reach fetch");
    }
  });

  const write = await client.api({ path: "/api/matters", method: "POST", sessionToken: "lawos_session_v1.secret" });
  const auth = await client.api({ path: "/api/auth/login", method: "GET", sessionToken: "lawos_session_v1.secret" });
  const outside = await client.api({ path: "/internal/debug", method: "GET", sessionToken: "lawos_session_v1.secret" });

  assert.equal(write.http_status, 405);
  assert.equal(auth.http_status, 403);
  assert.equal(outside.http_status, 403);
});

test("desktop runtime permits only the exact People Outlook connection mutations", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "passed" });
    }
  });
  const path = "/api/hrx/people/members/emp_amic_jwsuh/outlook-connection";

  const begin = await client.api({
    path,
    method: "POST",
    body: JSON.stringify({ action: "begin" }),
    sessionToken: "lawos_session_v1.secret"
  });
  const disconnect = await client.api({
    path,
    method: "DELETE",
    sessionToken: "lawos_session_v1.secret"
  });
  const completion = await client.api({
    path: "/api/hrx/people/me/outlook-connection/complete",
    method: "POST",
    body: JSON.stringify({
      authorization_code: "0.MAIN_ONLY_code-123",
      state_ref: "outlook-state:main-only-01"
    }),
    sessionToken: "lawos_session_v1.secret"
  });
  const blocked = await Promise.all([
    client.api({ path, method: "PATCH", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: `${path}/retry`, method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/people/members/emp_amic_jwsuh/profile", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/people/me/outlook-connection/complete/extra", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/people/me/outlook-connection/complete?next=1", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/people/me/outlook-connection/complete", method: "PUT", body: "{}", sessionToken: "lawos_session_v1.secret" })
  ]);
  const invalidCompletionBodies = await Promise.all([
    client.api({
      path: "/api/hrx/people/me/outlook-connection/complete",
      method: "POST",
      body: JSON.stringify({ authorization_code: "0.CODE", state_ref: "state", access_token: "forbidden" }),
      sessionToken: "lawos_session_v1.secret"
    }),
    client.api({
      path: "/api/hrx/people/me/outlook-connection/complete",
      method: "POST",
      body: JSON.stringify({ authorization_code: "0.CODE" }),
      sessionToken: "lawos_session_v1.secret"
    })
  ]);
  const bodylessOtherDelete = await client.api({
    path: "/api/matters/matter-001/worktree/nodes/node-001",
    method: "DELETE",
    sessionToken: "lawos_session_v1.secret"
  });

  assert.equal(begin.http_status, 200);
  assert.equal(disconnect.http_status, 200);
  assert.equal(completion.http_status, 200);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { action: "begin" });
  assert.equal(calls[1].init.method, "DELETE");
  assert.equal(calls[1].init.body, undefined);
  assert.equal(calls[2].url, "http://127.0.0.1:4812/api/hrx/people/me/outlook-connection/complete");
  assert.equal(calls[2].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[2].init.body), {
    authorization_code: "0.MAIN_ONLY_code-123",
    state_ref: "outlook-state:main-only-01"
  });
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 405, 405, 403, 405]);
  assert.deepEqual(invalidCompletionBodies.map(({ http_status }) => http_status), [400, 400]);
  assert.equal(calls.length, 3);
  assert.equal(bodylessOtherDelete.http_status, 400);
  assert.equal(bodylessOtherDelete.reason, "desktop_runtime_write_body_invalid");
});

test("desktop runtime permits exact main-process installation writes, reconciliation read, and readiness read", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "passed" });
    },
  });
  const installationId = "odi_runtime_00000000000000000001";
  const signedBody = JSON.stringify({
    idempotency_key: "outlook-desktop-runtime-0001",
    nonce: "synthetic-nonce",
    issued_at: "2026-08-11T04:00:00.000Z",
    expires_at: "2026-08-11T04:02:00.000Z",
    signature: "synthetic-signature",
  });

  const responses = await Promise.all([
    client.api({
      path: "/api/desktop/installations",
      method: "POST",
      body: signedBody,
      sessionToken: "lawos_session_v1.secret",
    }),
    client.api({
      path: `/api/desktop/installations/${installationId}/heartbeat`,
      method: "POST",
      body: signedBody,
      sessionToken: "lawos_session_v1.secret",
    }),
    client.api({
      path: `/api/desktop/installations/${installationId}/retire`,
      method: "POST",
      body: signedBody,
      sessionToken: "lawos_session_v1.secret",
    }),
    client.api({
      path: `/api/desktop/installations/${installationId}`,
      method: "GET",
      sessionToken: "lawos_session_v1.secret",
    }),
    client.api({
      path: `/api/outlook/readiness?installation_id=${installationId}`,
      method: "GET",
      sessionToken: "lawos_session_v1.secret",
    }),
  ]);
  const blocked = await Promise.all([
    client.api({
      path: `/api/desktop/installations/${installationId}/other`,
      method: "POST",
      body: signedBody,
      sessionToken: "lawos_session_v1.secret",
    }),
    client.api({
      path: `/api/desktop/installations/${installationId}/heartbeat`,
      method: "PATCH",
      body: signedBody,
      sessionToken: "lawos_session_v1.secret",
    }),
  ]);

  assert.deepEqual(responses.map(({ http_status }) => http_status), [
    200,
    200,
    200,
    200,
    200,
  ]);
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405]);
  assert.equal(calls.length, 5);
  assert.deepEqual(JSON.parse(calls[0].init.body), JSON.parse(signedBody));
  assert.equal(calls[3].init.body, undefined);
  assert.equal(calls[4].init.body, undefined);
  assert.equal(JSON.stringify(responses).includes("lawos_session_v1.secret"), false);
});

test("desktop runtime permits only the exact Search preference mutation route", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "passed", item: { recent: [], saved: [] } });
    }
  });
  const allowed = await client.api({
    path: "/api/vault/search/preferences",
    method: "POST",
    body: JSON.stringify({ operation: "remember", query: "계약서" }),
    sessionToken: "lawos_session_v1.secret"
  });
  const blocked = await Promise.all([
    client.api({ path: "/api/vault/search", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/vault/search/preferences/other", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/vault/search/preferences", method: "PUT", body: "{}", sessionToken: "lawos_session_v1.secret" })
  ]);

  assert.equal(allowed.http_status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { operation: "remember", query: "계약서" });
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 405]);
});

test("desktop runtime permits only the exact Vault upload preflight mutation route", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, {
        outcome: "preflight_passed",
        item: { vault_document_write_enabled: false },
        vault_document_write_enabled: false
      });
    }
  });
  const body = JSON.stringify({
    action: "upload_preflight",
    matter_id: "matter_001",
    source_mode: "amic_os_desktop",
    permission_check_only: true
  });
  const allowed = await client.api({
    path: "/api/matters/vault-bridge/upload-preflight",
    method: "POST",
    body,
    sessionToken: "lawos_session_v1.secret"
  });
  const blocked = await Promise.all([
    client.api({
      path: "/api/matters/vault-bridge/upload-preflight/extra",
      method: "POST",
      body,
      sessionToken: "lawos_session_v1.secret"
    }),
    client.api({
      path: "/api/matters/vault-bridge/upload-preflight",
      method: "PUT",
      body,
      sessionToken: "lawos_session_v1.secret"
    }),
    client.api({
      path: "/api/matters/vault-bridge/upload-preflight?tenant=renderer",
      method: "POST",
      body,
      sessionToken: "lawos_session_v1.secret"
    })
  ]);

  assert.equal(allowed.http_status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:4812/api/matters/vault-bridge/upload-preflight");
  assert.deepEqual(JSON.parse(calls[0].init.body), JSON.parse(body));
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 403]);
});

test("desktop runtime permits the explicit HRX leave mutations and signed step-up exchange", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "passed" });
    }
  });
  const allowed = [
    ["POST", "/api/auth/step-up"],
    ["POST", "/api/hrx/leave"],
    ["POST", "/api/hrx/leave/me/preview"],
    ["POST", "/api/hrx/leave/me/requests"],
    ["PATCH", "/api/hrx/leave/me/requests/request-001"],
    ["POST", "/api/hrx/leave/me/requests/request-001/cancel"],
    ["POST", "/api/hrx/leave/me/requests/request-001/reschedule-response"],
    ["POST", "/api/hrx/leave/me/requests/request-001/additional-information"],
    ["POST", "/api/hrx/leave/requests/request-001/approve"],
    ["POST", "/api/hrx/leave/requests/request-001/escalate"],
    ["POST", "/api/hrx/leave/delegations"],
    ["POST", "/api/hrx/leave/delegations/delegation-001/revoke"],
    ["POST", "/api/hrx/leave/accrual/rules"],
    ["POST", "/api/hrx/leave/accrual/preview"],
    ["POST", "/api/hrx/leave/accrual/execute"],
    ["POST", "/api/hrx/leave/accrual/manual/preview"],
    ["POST", "/api/hrx/leave/accrual/manual/execute"],
    ["POST", "/api/hrx/leave/ledger/snapshots"],
    ["POST", "/api/hrx/leave/promotion-campaigns"],
    ["POST", "/api/hrx/leave/promotion-campaigns/preview"],
    ["POST", "/api/hrx/leave/promotion-recipients/recipient-001/first-notice"],
    ["POST", "/api/hrx/leave/integrations/process"],
    ["POST", "/api/hrx/leave/termination-reconciliations/preview"],
    ["POST", "/api/hrx/leave/termination-reconciliations/execute"],
    ["POST", "/api/hrx/leave/groups"],
    ["PATCH", "/api/hrx/leave/groups/group-001"],
    ["POST", "/api/hrx/leave/types"],
    ["PATCH", "/api/hrx/leave/types/type-001"],
    ["POST", "/api/hrx/leave/policies"],
    ["PATCH", "/api/hrx/leave/policies/policy-001"],
    ["POST", "/api/hrx/leave/policies/policy-001/publish"],
    ["POST", "/api/hrx/leave/policies/policy-001/versions"],
    ["POST", "/api/hrx/leave/request-001/reject"]
  ];
  for (const [method, path] of allowed) {
    const result = await client.api({
      path,
      method,
      headers: {
        authorization: "Bearer must-not-forward-from-renderer",
        "x-lawos-hrx-step-up": "lawos_hrx_step_up_v1.signed"
      },
      body: JSON.stringify({ fixture: true }),
      sessionToken: "lawos_session_v1.secret"
    });
    assert.equal(result.http_status, 200, `${method} ${path}`);
  }
  const blocked = await Promise.all([
    client.api({ path: "/api/hrx/employees", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/leave/me/requests/request-001/delete", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/leave/groups/group-001", method: "PUT", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/auth/login", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" })
  ]);

  assert.equal(calls.length, allowed.length);
  assert.equal(calls.every((call) => call.init.headers.authorization === "Bearer lawos_session_v1.secret"), true);
  assert.equal(calls.every((call) => call.init.headers["x-lawos-hrx-step-up"] === "lawos_hrx_step_up_v1.signed"), true);
  assert.equal(calls.every((call) => !call.init.headers.authorization.includes("must-not-forward")), true);
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 405, 405]);
});

test("desktop runtime permits only the explicit HRX payroll mutations", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "passed" });
    }
  });
  const allowed = [
    "/api/hrx/payroll",
    "/api/hrx/payroll/preview",
    "/api/hrx/payroll/approve",
    "/api/hrx/payroll/export",
    "/api/hrx/payroll/periods",
    "/api/hrx/payroll/runs",
    "/api/hrx/payroll/runs/run-001/snapshot",
    "/api/hrx/payroll/runs/run-001/preview",
    "/api/hrx/payroll/runs/run-001/approve",
    "/api/hrx/payroll/runs/run-001/close",
    "/api/hrx/payroll/runs/run-001/statements/generate",
    "/api/hrx/payroll/runs/run-001/statements/deliver",
    "/api/hrx/payroll/statements/statement-001/revoke",
    "/api/hrx/payroll/runs/run-001/payments/prepare",
    "/api/hrx/payroll/payment-batches/batch-001/approve",
    "/api/hrx/payroll/payment-batches/batch-001/export",
    "/api/hrx/payroll/payment-batches/batch-001/reconcile",
    "/api/hrx/payroll/runs/run-001/filings",
    "/api/hrx/payroll/filings/filing-001/validate",
    "/api/hrx/payroll/filings/filing-001/submit",
    "/api/hrx/payroll/filings/filing-001/correct",
    "/api/hrx/payroll/runs/run-001/year-end/collect",
    "/api/hrx/payroll/runs/run-001/year-end/calculate",
    "/api/hrx/payroll/runs/run-001/year-end/review",
    "/api/hrx/payroll/issues/issue-001/resolve"
  ];
  for (const path of allowed) {
    const result = await client.api({
      path,
      method: "POST",
      headers: { "x-lawos-hrx-step-up": "lawos_hrx_step_up_v1.signed" },
      body: JSON.stringify({ fixture: true }),
      sessionToken: "lawos_session_v1.secret"
    });
    assert.equal(result.http_status, 200, path);
  }
  const blocked = await Promise.all([
    client.api({ path: "/api/hrx/payroll/runs/run-001/delete", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/payroll/payment-batches/batch-001/cancel", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/payroll/filings/filing-001/delete", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/hrx/payroll/runs/run-001", method: "PATCH", body: "{}", sessionToken: "lawos_session_v1.secret" })
  ]);

  assert.equal(calls.length, allowed.length);
  assert.equal(calls.every((call) => call.init.headers.authorization === "Bearer lawos_session_v1.secret"), true);
  assert.equal(calls.every((call) => call.init.headers["x-lawos-hrx-step-up"] === "lawos_hrx_step_up_v1.signed"), true);
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 405, 405]);
});

test("desktop runtime permits only the explicit bank import and classification mutations", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "passed" });
    }
  });
  const allowed = [
    "/api/finance/bank-imports",
    "/api/finance/bank-classifications/auto",
    "/api/finance/bank-classifications/review"
  ];
  for (const path of allowed) {
    const result = await client.api({
      path,
      method: "POST",
      headers: { "x-lawos-permission-context": "{\"principal\":{\"user_id\":\"user_amic_jwsuh\"}}" },
      body: JSON.stringify({ fixture: true }),
      sessionToken: "lawos_session_v1.secret"
    });
    assert.equal(result.http_status, 200, path);
  }
  const blocked = await Promise.all([
    client.api({ path: "/api/finance/bank-imports/delete", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/finance/bank-transactions", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/finance/bank-classifications", method: "PATCH", body: "{}", sessionToken: "lawos_session_v1.secret" })
  ]);

  assert.equal(calls.length, allowed.length);
  assert.equal(calls.every((call) => call.init.headers.authorization === "Bearer lawos_session_v1.secret"), true);
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 405]);
});

test("runtime client permits only authenticated Matter profile and stakeholder writes", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "updated", token_material_returned: false });
    }
  });

  const profile = await client.api({
    path: "/api/matters/matter-001/profile",
    method: "PATCH",
    headers: { "x-lawos-permission-context": "{\"principal\":{\"user_id\":\"user-001\"}}" },
    body: JSON.stringify({ profile: { data: { case_name: "테스트" } } }),
    sessionToken: "lawos_session_v1.secret"
  });
  const stakeholder = await client.api({
    path: "/api/matters/matter-001/stakeholders",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stakeholder: { display_name: "담당자", relationship_role: "court_clerk" } }),
    sessionToken: "lawos_session_v1.secret"
  });
  const blocked = await client.api({
    path: "/api/matters/matter-001",
    method: "PATCH",
    body: JSON.stringify({ status: "closed" }),
    sessionToken: "lawos_session_v1.secret"
  });

  assert.equal(profile.http_status, 200);
  assert.equal(stakeholder.http_status, 200);
  assert.equal(blocked.http_status, 405);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(calls[1].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { profile: { data: { case_name: "테스트" } } });
  assert.deepEqual(JSON.parse(calls[1].init.body), { stakeholder: { display_name: "담당자", relationship_role: "court_clerk" } });
  assert.equal(calls.every((call) => call.init.headers.authorization === "Bearer lawos_session_v1.secret"), true);
});

test("WT-02-09 desktop runtime permits only the explicit Worktree write routes", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, { outcome: "updated", token_material_returned: false });
    }
  });
  const allowed = [
    ["POST", "/api/matters/matter-001/worktree"],
    ["POST", "/api/matters/matter-001/worktree/template-applications"],
    ["POST", "/api/matters/matter-001/worktree/nodes"],
    ["PATCH", "/api/matters/matter-001/worktree/nodes/node-001"],
    ["DELETE", "/api/matters/matter-001/worktree/nodes/node-001"],
    ["POST", "/api/matters/matter-001/worktree/tasks/task-001/complete"],
    ["POST", "/api/matters/matter-001/worktree/tasks/task-001/reopen"],
    ["POST", "/api/matters/matter-001/worktree/tasks/task-001/unblock"]
  ];
  for (const [method, path] of allowed) {
    const result = await client.api({ path, method, body: JSON.stringify({ tenant_id: "tenant-001" }), sessionToken: "lawos_session_v1.secret" });
    assert.equal(result.http_status, 200, `${method} ${path}`);
  }
  const blocked = await Promise.all([
    client.api({ path: "/api/matters/matter-001/worktree/export", method: "POST", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/matters/matter-001/worktree", method: "PATCH", body: "{}", sessionToken: "lawos_session_v1.secret" }),
    client.api({ path: "/api/matters/matter-001/worktree/nodes/node-001", method: "PUT", body: "{}", sessionToken: "lawos_session_v1.secret" })
  ]);
  assert.equal(calls.length, allowed.length);
  assert.deepEqual(blocked.map(({ http_status }) => http_status), [405, 405, 405]);
});

test("desktop runtime blocks dot-segment paths before URL normalization", async () => {
  let fetchCount = 0;
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse(200, { ok: true });
    },
  });

  const response = await client.api({
    path: "/api/matters/../auth/session",
    method: "GET",
    sessionToken: "lawos_session_v1.secret",
  });

  assert.equal(response.http_status, 403);
  assert.equal(response.reason, "desktop_runtime_read_bridge_path_blocked");
  assert.equal(fetchCount, 0);
});

test("runtime client never substitutes the desktop operator credential for a missing signed session", async () => {
  let fetchCount = 0;
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    fetchImpl: async () => {
      fetchCount += 1;
      throw new Error("missing session must not call the runtime");
    }
  });

  const response = await client.api({
    path: "/api/matters/matter-001/profile",
    method: "PATCH",
    body: JSON.stringify({ profile: { data: { case_name: "차단" } } })
  });

  assert.equal(response.http_status, 401);
  assert.equal(response.reason, "desktop_runtime_session_required");
  assert.equal(fetchCount, 0);
});

test("desktop runtime uses a dedicated signed-session route for Vault upload preflight", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      return jsonResponse(200, {
        ok: true,
        outcome: "preflight_passed",
        item: {
          operation_id: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          permission_checked: true,
          vault_document_write_enabled: true,
          max_upload_bytes: 1024 * 1024 * 1024,
        },
        vault_document_write_enabled: true,
        token_material_returned: false,
      });
    },
  });
  const response = await client.precheckVaultUpload({
    matterId: "matter-001",
    workspaceId: "workspace-001",
    folderId: null,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(response.http_status, 200);
  assert.equal(calls[0].url, "http://127.0.0.1:4812/api/vault/desktop/upload-preflight");
  assert.equal(calls[0].init.headers.authorization, "Bearer lawos_session_v1.secret");
  assert.equal(calls[0].init.headers["x-amic-vault-upload-transport"], "s3-presigned-put-v1");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    matter_id: "matter-001",
    workspace_id: "workspace-001",
    folder_id: null,
  });
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
});

test("desktop runtime hashes twice, streams directly, and verifies the exact server readback receipt", async () => {
  const content = Buffer.from("AMIC OS Vault stream\n");
  const sha256 = createHash("sha256").update(content).digest("hex");
  const operationId = "vaultop_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      if (path === "/api/vault/desktop/upload-transfer") {
        calls.push({ path, init, raw: Buffer.from(init.body) });
        return jsonResponse(200, directTransferGrant(operationId, {
          filename: "vault-note.txt",
          mimeType: "text/plain",
          byteSize: content.byteLength,
        }));
      }
      if (path.startsWith("/test-vault-transfer/")) {
        const chunks = [];
        for await (const chunk of init.body) chunks.push(Buffer.from(chunk));
        calls.push({ path, init, raw: Buffer.concat(chunks) });
        return { status: 200, body: Readable.from([]) };
      }
      calls.push({ path, init, raw: Buffer.from(init.body) });
      return jsonResponse(201, {
        ok: true,
        outcome: "readback_verified",
        request_id: "request-001",
        item: {
          operation_id: operationId,
          document_id: "document-001",
          version_id: "version-001",
          file_object_id: "file-object-001",
          sha256,
          byte_size: content.byteLength,
          mime_type: "text/plain",
          audit_event_id: "audit-001",
          exact_readback_verified: true,
          raw_path_included: false,
          raw_bytes_included: false,
        },
        token_material_returned: false,
      });
    },
  });
  let streamOpenCount = 0;
  const response = await client.uploadVaultFile({
    openStream() {
      streamOpenCount += 1;
      return Readable.from([content.subarray(0, 5), content.subarray(5)]);
    },
    file: { name: "vault-note.txt", mimeType: "text/plain", size: content.byteLength },
    operationId,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(response.http_status, 201);
  assert.equal(response.local_stream_sha256, sha256);
  assert.equal(response.local_stream_byte_size, content.byteLength);
  assert.equal(streamOpenCount, 2);
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/vault/desktop/upload-transfer",
    `/test-vault-transfer/${operationId}`,
    "/api/vault/desktop/upload",
  ]);
  assert.equal(calls[0].init.headers.authorization, "Bearer lawos_session_v1.secret");
  assert.equal(calls[0].init.headers["idempotency-key"], operationId);
  assert.equal(calls[1].init.headers["content-length"], String(content.byteLength));
  assert.deepEqual(calls[1].raw, content);
  assert.deepEqual(JSON.parse(calls[2].raw.toString("utf8")), {
    operation_id: operationId,
    file: {
      filename: "vault-note.txt",
      mime_type: "text/plain",
      byte_size: content.byteLength,
      sha256,
    },
  });
  assert.equal(calls[2].raw.includes(content), false);
  assert.equal(JSON.stringify(response).includes("lawos_session_v1.secret"), false);
});

test("desktop runtime accepts exactly 1 GiB without buffering and rejects one byte more before transport", async () => {
  const oneGiB = 1024 * 1024 * 1024;
  const operationId = "vaultop_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const chunk = Buffer.alloc(1024 * 1024, 0x5a);
  const openStream = () => Readable.from((function* oneGiBChunks() {
    for (let index = 0; index < 1024; index += 1) yield chunk;
  })());
  let uploadedBytes = 0;
  let fetchCount = 0;
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      fetchCount += 1;
      const path = new URL(url).pathname;
      if (path === "/api/vault/desktop/upload-transfer") {
        return jsonResponse(200, directTransferGrant(operationId, {
          filename: "one-gib.txt",
          mimeType: "text/plain",
          byteSize: oneGiB,
        }));
      }
      if (path.startsWith("/test-vault-transfer/")) {
        for await (const value of init.body) uploadedBytes += Buffer.byteLength(value);
        return { status: 200, body: Readable.from([]) };
      }
      const completion = JSON.parse(init.body);
      return jsonResponse(201, {
        ok: true,
        outcome: "readback_verified",
        item: {
          operation_id: operationId,
          sha256: completion.file.sha256,
          byte_size: completion.file.byte_size,
          mime_type: completion.file.mime_type,
          exact_readback_verified: true,
        },
      });
    },
  });

  const result = await client.uploadVaultFile({
    openStream,
    file: { name: "one-gib.txt", mimeType: "text/plain", size: oneGiB },
    operationId,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(result.local_stream_byte_size, oneGiB);
  assert.equal(uploadedBytes, oneGiB);
  assert.equal(fetchCount, 3);

  const fetchesBeforeReject = fetchCount;
  await assert.rejects(
    () => client.uploadVaultFile({
      openStream,
      file: { name: "too-large.txt", mimeType: "text/plain", size: oneGiB + 1 },
      operationId: "vaultop_ffffffffffffffffffffffffffffffff",
      sessionToken: "lawos_session_v1.secret",
    }),
    (error) => error?.code === "VAULT_UPLOAD_SIZE_INVALID" && error?.status === 413,
  );
  assert.equal(fetchCount, fetchesBeforeReject);

  await assert.rejects(
    () => client.uploadVaultFile({
      stream: openStream(),
      file: { name: "one-gib.txt", mimeType: "text/plain", size: oneGiB },
      operationId: "vaultop_99999999999999999999999999999999",
      sessionToken: "lawos_session_v1.secret",
    }),
    (error) => error?.code === "VAULT_UPLOAD_REOPEN_REQUIRED",
  );
  assert.equal(fetchCount, fetchesBeforeReject);
});

test("desktop runtime continues a quarantined upload with JSON status only", async () => {
  const content = Buffer.from("AMIC OS pending Vault stream\n");
  const sha256 = createHash("sha256").update(content).digest("hex");
  const operationId = "vaultop_cccccccccccccccccccccccccccccccc";
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      if (path === "/api/vault/desktop/upload-transfer") {
        calls.push({ path, init, raw: Buffer.from(init.body) });
        return jsonResponse(200, directTransferGrant(operationId, {
          filename: "pending-note.txt",
          mimeType: "text/plain",
          byteSize: content.byteLength,
        }));
      }
      if (path.startsWith("/test-vault-transfer/")) {
        const chunks = [];
        for await (const chunk of init.body) chunks.push(Buffer.from(chunk));
        calls.push({ path, init, raw: Buffer.concat(chunks) });
        return { status: 200, body: Readable.from([]) };
      }
      if (path === "/api/vault/desktop/upload") {
        calls.push({ path, init, raw: Buffer.from(init.body) });
        return jsonResponse(202, {
          ok: true,
          outcome: "processing",
          request_id: "request-pending-upload",
          operation_id: operationId,
          item: {
            operation_id: operationId,
            operation_kind: "save_local_file",
            stage: "scanning",
            retry_after_ms: 250,
            accepted: { sha256, byte_size: content.byteLength, mime_type: "text/plain" },
            receipt: { stage: "scanning", exact_version: null },
            exact_readback_verified: false,
            raw_path_included: false,
            raw_bytes_included: false,
          },
        });
      }
      calls.push({ path, init, raw: Buffer.from(String(init.body ?? "")) });
      return jsonResponse(201, {
        ok: true,
        outcome: "readback_verified",
        request_id: "request-pending-status",
        item: {
          operation_id: operationId,
          document_id: "document-pending-001",
          version_id: "version-pending-001",
          file_object_id: "file-pending-001",
          sha256,
          byte_size: content.byteLength,
          mime_type: "text/plain",
          exact_readback_verified: true,
        },
      });
    },
  });
  const pending = await client.uploadVaultFile({
    openStream: () => Readable.from([content]),
    file: { name: "pending-note.txt", mimeType: "text/plain", size: content.byteLength },
    operationId,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(pending.http_status, 202);
  assert.equal(pending.outcome, "processing");
  const completed = await client.continueVaultUpload({
    operationId,
    expected: { sha256, byteSize: content.byteLength, mimeType: "text/plain" },
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(completed.http_status, 201);
  assert.equal(completed.item.version_id, "version-pending-001");
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/vault/desktop/upload-transfer",
    `/test-vault-transfer/${operationId}`,
    "/api/vault/desktop/upload",
    "/api/vault/desktop/upload-status",
  ]);
  assert.deepEqual(JSON.parse(calls[3].raw.toString("utf8")), { operation_id: operationId });
  assert.equal(calls[3].init.headers["idempotency-key"], operationId);
  assert.equal(calls[2].raw.includes(content), false);
});

test("desktop runtime preflights, downloads, verifies, and acknowledges one exact Vault version without exposing it to the renderer API", async () => {
  const bytes = Buffer.from("desktop exact export\n");
  const operationId = "vaultop_dddddddddddddddddddddddddddddddd";
  const exactVersion = {
    document_id: "document-export-001",
    version_id: "version-export-007",
    file_object_id: "file-object-export-007",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byte_size: bytes.byteLength,
    mime_type: "application/pdf",
  };
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      calls.push({ path, init });
      if (path === "/api/vault/desktop/export-preflight") {
        return jsonResponse(200, {
          ok: true,
          outcome: "preflight_passed",
          request_id: "request-export-preflight",
          exact_version: exactVersion,
          lawos_permission_checked: true,
          provider_authority_checked: false,
          provider_grant_created: false,
        });
      }
      if (path === "/api/vault/desktop/export-authorize") {
        const request = JSON.parse(init.body);
        assert.equal(request.matter_id, "matter-001");
        assert.deepEqual(request.exact_version, exactVersion);
        assert.match(request.request_nonce_sha256, /^[a-f0-9]{64}$/u);
        return jsonResponse(200, {
          ok: true,
          outcome: "export_authorized",
          operation_kind: "export_exact_version",
          operation_id: operationId,
          attachment_name: "contract.pdf",
          exact_version: exactVersion,
        });
      }
      if (path === "/api/vault/desktop/export-download") {
        assert.equal(init.headers.authorization, "Bearer lawos_session_v1.secret");
        assert.equal(init.headers["idempotency-key"], operationId);
        return binaryResponse(200, {
          "content-type": exactVersion.mime_type,
          "content-length": exactVersion.byte_size,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "x-amic-vault-operation-id": operationId,
          "x-amic-vault-document-id": exactVersion.document_id,
          "x-amic-vault-version-id": exactVersion.version_id,
          "x-amic-vault-file-object-id": exactVersion.file_object_id,
          "x-amic-vault-sha256": exactVersion.sha256,
          "x-amic-vault-byte-size": exactVersion.byte_size,
        }, [bytes.subarray(0, 5), bytes.subarray(5)]);
      }
      if (path === "/api/vault/desktop/export-complete") {
        assert.equal(init.headers["idempotency-key"], operationId);
        assert.deepEqual(JSON.parse(init.body), {
          operation_id: operationId,
          exact_version: exactVersion,
        });
        return jsonResponse(200, {
          ok: true,
          outcome: "delivered",
          operation_kind: "export_exact_version",
          operation_id: operationId,
          exact_version: exactVersion,
          receipt: { stage: "delivered", receipt_id: "receipt-export-001" },
        });
      }
      throw new Error(`unexpected path ${path}`);
    },
  });

  const preflight = await client.precheckVaultExport({
    matterId: "matter-001",
    exactVersion,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(preflight.http_status, 200);
  const downloaded = await client.downloadVaultExactVersion({
    matterId: "matter-001",
    exactVersion,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.deepEqual(downloaded.bytes, bytes);
  assert.equal(downloaded.operation_id, operationId);
  assert.deepEqual(downloaded.exact_version, exactVersion);
  const completed = await client.completeVaultExport({
    operationId,
    exactVersion,
    sessionToken: "lawos_session_v1.secret",
  });
  assert.equal(completed.receipt.stage, "delivered");
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/vault/desktop/export-preflight",
    "/api/vault/desktop/export-authorize",
    "/api/vault/desktop/export-download",
    "/api/vault/desktop/export-complete",
  ]);
  for (const path of calls.map(({ path }) => path)) {
    const blocked = await client.api({
      path,
      method: "GET",
      sessionToken: "lawos_session_v1.secret",
    });
    assert.equal(blocked.http_status, 403);
    assert.equal(blocked.reason, "desktop_main_only_route");
  }
  assert.equal(JSON.stringify({ preflight, completed }).includes("lawos_session_v1.secret"), false);
});

test("desktop runtime discards exact export bytes when the server header binding changes", async () => {
  const bytes = Buffer.from("tamper check\n");
  const operationId = "vaultop_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const exactVersion = {
    document_id: "document-export-002",
    version_id: "version-export-002",
    file_object_id: "file-object-export-002",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byte_size: bytes.byteLength,
    mime_type: "application/pdf",
  };
  let call = 0;
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async () => {
      call += 1;
      if (call === 1) return jsonResponse(200, {
        ok: true,
        outcome: "export_authorized",
        operation_kind: "export_exact_version",
        operation_id: operationId,
        attachment_name: "contract.pdf",
        exact_version: exactVersion,
      });
      return binaryResponse(200, {
        "content-type": exactVersion.mime_type,
        "content-length": exactVersion.byte_size,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-amic-vault-operation-id": operationId,
        "x-amic-vault-document-id": exactVersion.document_id,
        "x-amic-vault-version-id": "version-changed",
        "x-amic-vault-file-object-id": exactVersion.file_object_id,
        "x-amic-vault-sha256": exactVersion.sha256,
        "x-amic-vault-byte-size": exactVersion.byte_size,
      }, [bytes]);
    },
  });
  await assert.rejects(
    () => client.downloadVaultExactVersion({
      matterId: "matter-001",
      exactVersion,
      sessionToken: "lawos_session_v1.secret",
    }),
    (error) => error?.code === "VAULT_EXPORT_RESPONSE_MISMATCH",
  );
});

test("desktop runtime rejects a non-canonical Vault export filename before requesting bytes", async () => {
  const bytes = Buffer.from("filename check\n");
  const exactVersion = {
    document_id: "document-export-003",
    version_id: "version-export-003",
    file_object_id: "file-object-export-003",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byte_size: bytes.byteLength,
    mime_type: "application/pdf",
  };
  let fetchCount = 0;
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse(200, {
        ok: true,
        outcome: "export_authorized",
        operation_kind: "export_exact_version",
        operation_id: "vaultop_ffffffffffffffffffffffffffffffff",
        attachment_name: "\uD800.pdf",
        exact_version: exactVersion,
      });
    },
  });

  await assert.rejects(
    () => client.downloadVaultExactVersion({
      matterId: "matter-001",
      exactVersion,
      sessionToken: "lawos_session_v1.secret",
    }),
    (error) => error?.code === "VAULT_EXPORT_AUTHORIZATION_FAILED",
  );
  assert.equal(fetchCount, 1);
});

test("desktop runtime rejects Vault upload receipt mismatch and keeps dedicated routes main-only", async () => {
  const content = Buffer.from("stable\n");
  let fetchCount = 0;
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "http://127.0.0.1:4812",
    fetchImpl: async (url, init) => {
      fetchCount += 1;
      const path = new URL(url).pathname;
      if (path === "/api/vault/desktop/upload-transfer") {
        return jsonResponse(200, directTransferGrant(
          "vaultop_cccccccccccccccccccccccccccccccc",
          { filename: "note.txt", mimeType: "text/plain", byteSize: content.byteLength },
        ));
      }
      if (path.startsWith("/test-vault-transfer/")) {
        for await (const _chunk of init.body ?? []) void _chunk;
        return { status: 200, body: Readable.from([]) };
      }
      return jsonResponse(201, {
        ok: true,
        item: {
          operation_id: "vaultop_cccccccccccccccccccccccccccccccc",
          sha256: "0".repeat(64),
          byte_size: content.byteLength,
          mime_type: "text/plain",
          exact_readback_verified: true,
        },
      });
    },
  });
  await assert.rejects(
    () => client.uploadVaultFile({
      openStream: () => Readable.from([content]),
      file: { name: "note.txt", mimeType: "text/plain", size: content.byteLength },
      operationId: "vaultop_cccccccccccccccccccccccccccccccc",
      sessionToken: "lawos_session_v1.secret",
    }),
    (error) => error?.code === "VAULT_UPLOAD_RECEIPT_MISMATCH",
  );
  for (const path of [
    "/api/vault/desktop/upload-preflight",
    "/api/vault/desktop/upload-transfer",
    "/api/vault/desktop/upload",
    "/api/vault/desktop/upload-status",
    "/api/vault/desktop/export-preflight",
    "/api/vault/desktop/export-authorize",
    "/api/vault/desktop/export-download",
    "/api/vault/desktop/export-complete",
  ]) {
    const blocked = await client.api({
      path,
      method: "GET",
      sessionToken: "lawos_session_v1.secret",
    });
    assert.equal(blocked.http_status, 403);
    assert.equal(blocked.reason, "desktop_main_only_route");
  }
  assert.equal(fetchCount, 3);
});

test("runtime response guard rejects secret-bearing payloads", () => {
  assert.throws(
    () => assertNoRuntimeSecretMaterial({ operator_token: "runtime-secret" }, "runtime-secret"),
    /forbidden field/
  );
  assert.throws(
    () => assertNoRuntimeSecretMaterial({ nested: { value: "runtime-secret" } }, "runtime-secret"),
    /operator token material/
  );
});

test("disabled runtime client reports missing config without secret material", async () => {
  const client = createDisabledMatterVaultRuntimeClient({
    code: "matter_vault_runtime_config_error",
    details: { missing: ["MATTER_VAULT_R4_OPERATOR_TOKEN"] }
  });

  assert.equal(client.runtimeStatus().configured, false);
  assert.deepEqual((await client.accounts()).missing, ["MATTER_VAULT_R4_OPERATOR_TOKEN"]);
});

test("dot env parser keeps comments out of runtime values", () => {
  assert.deepEqual(parseDotEnv("# comment\nA=1\nB=\"two\"\n"), { A: "1", B: "two" });
});
