import assert from "node:assert/strict";
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

test("runtime config loads AWS execute-api URL and operator credential from local env shape", () => {
  const envText = [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://example.execute-api.ap-northeast-2.amazonaws.com/staging/",
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

test("runtime config finds desktop production auth override from app bundle ancestors", () => {
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
  assert.equal(config.baseUrl, "https://desktop-auth.example.test");
  assert.equal(config.operatorToken, "");
  assert.equal(config.operatorRuntimeConfigured, false);
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

  assert.equal(config.baseUrl, "https://43whkpla74oln46xkmjar4jgae0ebzba.lambda-url.ap-northeast-2.on.aws");
  assert.equal(config.operatorToken, "");
  assert.equal(config.operatorRuntimeConfigured, false);
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
