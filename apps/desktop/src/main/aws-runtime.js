import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_ENV_FILE = ".env.matter-vault-r4.local";
const FORBIDDEN_RESPONSE_FIELDS = new Set([
  "access_token",
  "refresh_token",
  "id_token",
  "operator_token",
  "operatorToken",
  "password",
  "secret"
]);

export class MatterVaultRuntimeConfigError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MatterVaultRuntimeConfigError";
    this.code = "matter_vault_runtime_config_error";
    this.details = details;
  }
}

export function parseDotEnv(source = "") {
  const values = {};
  for (const line of String(source).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function valueFrom(env, fileValues, keys) {
  for (const key of keys) {
    const value = env[key] ?? fileValues[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function loadMatterVaultRuntimeConfig({
  env = process.env,
  envPath = env.MATER_DESKTOP_ENV_FILE ?? resolve(process.cwd(), DEFAULT_ENV_FILE),
  existsSyncImpl = existsSync,
  readFileSyncImpl = readFileSync
} = {}) {
  const absoluteEnvPath = resolve(envPath);
  const fileValues = existsSyncImpl(absoluteEnvPath) ? parseDotEnv(readFileSyncImpl(absoluteEnvPath, "utf8")) : {};
  const baseUrl = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_BASE_URL"
  ]).replace(/\/+$/, "");
  const operatorToken = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_OPERATOR_TOKEN",
    "MATTER_R4_OPERATOR_TOKEN",
    "MATTER_OPERATOR_TOKEN"
  ]);
  const tenantId = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_PRODUCTION_TENANT_ID",
    "MATTER_DESKTOP_TENANT_ID"
  ]);
  const operatorActor = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_OPERATOR_ACTOR",
    "MATTER_OPERATOR_ACTOR"
  ]);
  const migrationWindow = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_MIGRATION_WINDOW",
    "MATTER_DESKTOP_MIGRATION_WINDOW"
  ]);

  const missing = [];
  if (!baseUrl) missing.push("MATTER_VAULT_R4_PRODUCTION_BASE_URL");
  if (!operatorToken) missing.push("MATTER_VAULT_R4_OPERATOR_TOKEN");
  if (missing.length) {
    throw new MatterVaultRuntimeConfigError("Matter-Vault temporary runtime config is incomplete", {
      missing,
      envPath: absoluteEnvPath,
      envFilePresent: existsSyncImpl(absoluteEnvPath)
    });
  }

  return Object.freeze({
    baseUrl,
    operatorToken,
    tenantId,
    operatorActor,
    migrationWindow,
    envPath: absoluteEnvPath,
    envFilePresent: existsSyncImpl(absoluteEnvPath)
  });
}

export function publicRuntimeConfig(config = {}) {
  return {
    configured: Boolean(config.baseUrl),
    mode: "aws-temporary-execute-api",
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    operatorActor: config.operatorActor,
    migrationWindow: config.migrationWindow,
    operatorTokenMaterialExposed: false
  };
}

export function assertNoRuntimeSecretMaterial(value, operatorToken) {
  const secret = String(operatorToken ?? "");
  const visit = (candidate) => {
    if (candidate == null) return;
    if (typeof candidate === "string") {
      if (secret && candidate.includes(secret)) throw new Error("Runtime response included operator token material");
      return;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (typeof candidate === "object") {
      for (const [key, nested] of Object.entries(candidate)) {
        if (FORBIDDEN_RESPONSE_FIELDS.has(key)) throw new Error(`Runtime response included forbidden field: ${key}`);
        visit(nested);
      }
    }
  };
  visit(value);
  return value;
}

function jsonHeaders(operatorToken) {
  return {
    authorization: `Bearer ${operatorToken}`,
    "content-type": "application/json; charset=utf-8"
  };
}

export function createMatterVaultAwsRuntimeClient({ baseUrl, operatorToken, fetchImpl = globalThis.fetch, ...config }) {
  if (!baseUrl) throw new MatterVaultRuntimeConfigError("Matter-Vault runtime base URL is required");
  if (!operatorToken) throw new MatterVaultRuntimeConfigError("Matter-Vault operator token is required");
  if (typeof fetchImpl !== "function") throw new MatterVaultRuntimeConfigError("fetch implementation is required");

  const requestJson = async (path, { method = "GET", body, actorEmail, authRequired = true } = {}) => {
    const url = new URL(String(path).replace(/^\/+/, ""), `${baseUrl}/`);
    const headers = authRequired ? jsonHeaders(operatorToken) : { "content-type": "application/json; charset=utf-8" };
    if (actorEmail) headers["x-mater-actor-email"] = actorEmail;
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    assertNoRuntimeSecretMaterial(parsed, operatorToken);
    return {
      ...parsed,
      http_status: response.status
    };
  };

  return Object.freeze({
    runtimeStatus() {
      return publicRuntimeConfig({ baseUrl, ...config });
    },
    health() {
      return requestJson("/health", { authRequired: false });
    },
    accounts() {
      return requestJson("/api/desktop/accounts");
    },
    login({ email } = {}) {
      return requestJson("/api/desktop/login", { method: "POST", body: { email } });
    },
    features({ email } = {}) {
      return requestJson("/api/matter-vault/features", { actorEmail: email });
    },
    smoke({ email, featureId = "matter_vault_dashboard" } = {}) {
      return requestJson("/api/matter-vault/smoke", {
        method: "POST",
        body: { email, feature_id: featureId },
        actorEmail: email
      });
    }
  });
}

export function createDisabledMatterVaultRuntimeClient(error) {
  const reason = error?.code ?? "runtime_not_configured";
  const details = error?.details ?? {};
  const unavailable = async () => ({
    ok: false,
    reason,
    missing: details.missing ?? [],
    http_status: 0,
    token_material_returned: false
  });

  return Object.freeze({
    runtimeStatus() {
      return {
        configured: false,
        mode: "aws-temporary-execute-api",
        reason,
        missing: details.missing ?? [],
        operatorTokenMaterialExposed: false
      };
    },
    health: unavailable,
    accounts: unavailable,
    login: unavailable,
    features: unavailable,
    smoke: unavailable
  });
}
