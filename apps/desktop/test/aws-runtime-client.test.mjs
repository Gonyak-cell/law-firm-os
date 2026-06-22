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
    envPath: "/tmp/mater.env",
    existsSyncImpl: () => true,
    readFileSyncImpl: () => envText
  });

  assert.equal(config.baseUrl, "https://example.execute-api.ap-northeast-2.amazonaws.com/staging");
  assert.equal(config.operatorToken, "runtime-secret");
  assert.equal(config.tenantId, "tenant_amic_matter_vault");
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
