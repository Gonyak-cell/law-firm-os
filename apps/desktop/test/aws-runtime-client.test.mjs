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

test("runtime config finds local env from app bundle ancestors when cwd is not the repo", () => {
  const envText = [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://example.execute-api.ap-northeast-2.amazonaws.com/staging/",
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

test("runtime client supports password reset and password login without exposing operator credential", async () => {
  const calls = [];
  const client = createMatterVaultAwsRuntimeClient({
    baseUrl: "https://example.execute-api.ap-northeast-2.amazonaws.com/staging",
    operatorToken: "runtime-secret",
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init });
      if (url.toString().endsWith("/api/desktop/password-reset/latest-email")) {
        return jsonResponse(200, {
          ok: true,
          email_message: { to: "jwsuh@amic.kr", reset_token: "reset-token", reset_url: "matter://password-reset/confirm?token=reset-token" }
        });
      }
      return jsonResponse(200, { ok: true, token_material_returned: false });
    }
  });

  await client.requestPasswordReset({ email: "jwsuh@amic.kr" });
  const latest = await client.latestResetEmail({ email: "jwsuh@amic.kr" });
  await client.confirmPasswordReset({ token: latest.email_message.reset_token, password: "new-password" });
  await client.login({ email: "jwsuh@amic.kr", password: "new-password", actorEmail: "ignored@amic.kr" });

  assert.equal(calls[0].url.endsWith("/api/desktop/password-reset/request"), true);
  assert.equal(calls[1].url.endsWith("/api/desktop/password-reset/latest-email"), true);
  assert.equal(calls[2].url.endsWith("/api/desktop/password-reset/confirm"), true);
  assert.equal(calls[3].url.endsWith("/api/desktop/login"), true);
  assert.deepEqual(JSON.parse(calls[3].init.body), { email: "jwsuh@amic.kr", password: "new-password" });
  assert.equal(calls.every((call) => call.init.headers.authorization === "Bearer runtime-secret"), true);
  assert.equal(JSON.stringify(latest).includes("runtime-secret"), false);
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
