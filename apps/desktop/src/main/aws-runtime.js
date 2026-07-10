import { existsSync, readFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ENV_FILE = ".env.matter-vault-r4.local";
const DEFAULT_PRODUCTION_RUNTIME_BASE_URL = "https://43whkpla74oln46xkmjar4jgae0ebzba.lambda-url.ap-northeast-2.on.aws";
const moduleDir = dirname(fileURLToPath(import.meta.url));
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

function isLoopbackBaseUrl(value) {
  try {
    const url = new URL(value);
    return ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch {
    return false;
  }
}

function localDevCredentialForEmail(email) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  return normalizedEmail ? `local-dev-only:${normalizedEmail}` : "";
}

function envPathCandidates({ env = process.env, cwd = process.cwd(), moduleDirectory = moduleDir } = {}) {
  if (env.MATTER_DESKTOP_ENV_FILE) return [resolve(env.MATTER_DESKTOP_ENV_FILE)];
  const starts = [cwd, moduleDirectory].filter(Boolean).map((candidate) => resolve(candidate));
  const seen = new Set();
  const candidates = [];
  for (const start of starts) {
    let current = start;
    while (!seen.has(current)) {
      seen.add(current);
      candidates.push(resolve(current, DEFAULT_ENV_FILE));
      const parent = dirname(current);
      if (parent === current || current === parse(current).root) break;
      current = parent;
    }
  }
  return candidates;
}

function selectEnvPath({ env, cwd, moduleDirectory, existsSyncImpl }) {
  const candidates = envPathCandidates({ env, cwd, moduleDirectory });
  return candidates.find((candidate) => existsSyncImpl(candidate)) ?? candidates[0];
}

export function loadMatterVaultRuntimeConfig({
  env = process.env,
  envPath,
  cwd = process.cwd(),
  moduleDirectory = moduleDir,
  existsSyncImpl = existsSync,
  readFileSyncImpl = readFileSync
} = {}) {
  const absoluteEnvPath = resolve(
    envPath ?? selectEnvPath({ env, cwd, moduleDirectory, existsSyncImpl })
  );
  const fileValues = existsSyncImpl(absoluteEnvPath) ? parseDotEnv(readFileSyncImpl(absoluteEnvPath, "utf8")) : {};
  const desktopRuntimeBaseUrl = valueFrom(env, fileValues, ["MATTER_DESKTOP_RUNTIME_BASE_URL"]);
  const desktopOperatorToken = valueFrom(env, fileValues, ["MATTER_DESKTOP_OPERATOR_TOKEN"]);
  const productionRuntimeBaseUrl = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_PRODUCTION_BASE_URL"
  ]);
  const productionOperatorToken = valueFrom(env, fileValues, [
    "MATTER_VAULT_R4_OPERATOR_TOKEN",
    "MATTER_R4_OPERATOR_TOKEN",
    "MATTER_OPERATOR_TOKEN"
  ]);
  const hasProductionRuntimePair = Boolean(productionRuntimeBaseUrl && productionOperatorToken);
  const desktopRuntimeIsLoopback = isLoopbackBaseUrl(desktopRuntimeBaseUrl);
  const useDesktopRuntimeOverride = Boolean(desktopRuntimeBaseUrl && (
    desktopOperatorToken ||
    !hasProductionRuntimePair ||
    desktopRuntimeIsLoopback
  ));
  const baseUrl = (
    useDesktopRuntimeOverride
      ? desktopRuntimeBaseUrl
      : productionRuntimeBaseUrl || desktopRuntimeBaseUrl || DEFAULT_PRODUCTION_RUNTIME_BASE_URL
  ).replace(/\/+$/, "");
  const operatorToken = useDesktopRuntimeOverride
    ? desktopOperatorToken || (desktopRuntimeIsLoopback ? "" : productionOperatorToken)
    : productionOperatorToken;
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
    operatorRuntimeConfigured: Boolean(operatorToken),
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
    mode: config.operatorToken ? "aws-temporary-execute-api" : "production-auth-http",
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    operatorActor: config.operatorActor,
    migrationWindow: config.migrationWindow,
    operatorRuntimeConfigured: Boolean(config.operatorToken),
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
  const headers = { "content-type": "application/json; charset=utf-8" };
  if (operatorToken) headers.authorization = `Bearer ${operatorToken}`;
  return headers;
}

function isDesktopMatterWriteRoute(method, path) {
  return (
    (method === "PATCH" && /^\/api\/matters\/[A-Za-z0-9_-]+\/profile$/.test(path)) ||
    (method === "POST" && /^\/api\/matters\/[A-Za-z0-9_-]+\/stakeholders$/.test(path))
  );
}

function parseDesktopMatterWriteBody(body) {
  if (typeof body !== "string" || !body.trim()) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createMatterVaultAwsRuntimeClient({ baseUrl, operatorToken, fetchImpl = globalThis.fetch, ...config }) {
  if (!baseUrl) throw new MatterVaultRuntimeConfigError("Matter-Vault runtime base URL is required");
  if (typeof fetchImpl !== "function") throw new MatterVaultRuntimeConfigError("fetch implementation is required");
  const runtimeBaseIsLoopback = isLoopbackBaseUrl(baseUrl);

  const requestJson = async (path, { method = "GET", body, actorEmail, authRequired = true, authToken, headers: extraHeaders = {} } = {}) => {
    const credential = authToken ?? (authRequired ? operatorToken : "");
    if (authRequired && !credential) {
      return {
        ok: false,
        reason: "runtime_auth_not_configured",
        http_status: 0,
        token_material_returned: false
      };
    }
    const url = new URL(String(path).replace(/^\/+/, ""), `${baseUrl}/`);
    const headers = { ...jsonHeaders(credential), ...extraHeaders };
    if (actorEmail) headers["x-matter-actor-email"] = actorEmail;
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    }).catch((error) => ({
      ok: false,
      reason: "runtime_request_failed",
      error_code: error?.code ?? error?.name ?? "fetch_failed",
      http_status: 0,
      token_material_returned: false
    }));
    if (!response || typeof response.text !== "function") return response;
    const text = await response.text();
    let parsed = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {
        ok: false,
        reason: "runtime_response_not_json",
        response_body_present: Boolean(text),
        token_material_returned: false
      };
    }
    assertNoRuntimeSecretMaterial(parsed, operatorToken);
    return {
      ...parsed,
      http_status: response.status
    };
  };

  const requestRuntimeApi = async ({ path, method = "GET", headers = {}, body = null, sessionToken } = {}) => {
    const safeMethod = String(method ?? "GET").toUpperCase();
    const safePath = typeof path === "string" ? path.trim() : "";
    const signedSessionToken = typeof sessionToken === "string" ? sessionToken.trim() : "";
    if (!signedSessionToken) {
      return {
        ok: false,
        reason: "desktop_runtime_session_required",
        http_status: 401,
        token_material_returned: false
      };
    }
    const allowedMatterWrite = isDesktopMatterWriteRoute(safeMethod, safePath);
    if (safeMethod !== "GET" && !allowedMatterWrite) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_get_only",
        http_status: 405,
        token_material_returned: false
      };
    }
    if (!safePath.startsWith("/api/") && !safePath.startsWith("/master-data/")) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_path_blocked",
        http_status: 403,
        token_material_returned: false
      };
    }
    const parsedBody = allowedMatterWrite ? parseDesktopMatterWriteBody(body) : body;
    if (allowedMatterWrite && !parsedBody) {
      return {
        ok: false,
        reason: "desktop_runtime_write_body_invalid",
        http_status: 400,
        token_material_returned: false
      };
    }
    if (safePath.startsWith("/api/auth/")) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_auth_path_blocked",
        http_status: 403,
        token_material_returned: false
      };
    }
    const forwardedHeaders = {};
    const headerEntries = headers && typeof headers === "object" && !Array.isArray(headers)
      ? Object.entries(headers)
      : [];
    for (const [name, value] of headerEntries) {
      const lowerName = String(name).toLowerCase();
      if (lowerName === "content-type" || lowerName === "x-lawos-permission-context") {
        forwardedHeaders[name] = String(value);
      }
    }
    const response = await requestJson(safePath, {
      method: safeMethod,
      body: parsedBody,
      headers: forwardedHeaders,
      authToken: signedSessionToken,
      authRequired: true
    });
    return {
      http_status: response.http_status,
      body: response,
      token_material_returned: false
    };
  };

  return Object.freeze({
    runtimeStatus() {
      return publicRuntimeConfig({ baseUrl, operatorToken, ...config });
    },
    health() {
      return requestJson("/health", { authRequired: false });
    },
    accounts() {
      if (!operatorToken) {
        return {
          ok: true,
          users: [],
          count: 0,
          reason: "account_listing_deferred_until_sign_in",
          http_status: 200,
          token_material_returned: false
        };
      }
      return requestJson("/api/desktop/accounts");
    },
    requestPasswordReset({ email } = {}) {
      if (operatorToken) {
        return requestJson("/api/desktop/password-reset/request", { method: "POST", body: { email } });
      }
      return requestJson("/api/auth/password-reset/request", { method: "POST", body: { email }, authRequired: false });
    },
    latestResetEmail({ email } = {}) {
      if (operatorToken) {
        return requestJson("/api/desktop/password-reset/latest-email", { method: "POST", body: { email } });
      }
      return {
        ok: false,
        reason: "password_reset_email_token_not_available_in_production",
        synthetic_only: false,
        token_material_returned: false,
        http_status: 410,
      };
    },
    confirmPasswordReset({ token, password } = {}) {
      if (operatorToken) {
        return requestJson("/api/desktop/password-reset/confirm", { method: "POST", body: { token, password } });
      }
      return requestJson("/api/auth/password-reset/confirm", { method: "POST", body: { token, password }, authRequired: false });
    },
    login({ email, password } = {}) {
      if (operatorToken) {
        return requestJson("/api/desktop/login", { method: "POST", body: { email, password } });
      }
      const localDevCredential = runtimeBaseIsLoopback ? localDevCredentialForEmail(email) : "";
      return requestJson("/api/auth/login", {
        method: "POST",
        body: { email, password: localDevCredential || password },
        authRequired: false
      });
    },
    async features({ email, sessionToken } = {}) {
      if (!sessionToken && operatorToken) return requestJson("/api/matter-vault/features", { actorEmail: email });
      if (!sessionToken) {
        return { ok: false, reason: "auth_session_required", features: [], http_status: 401, token_material_returned: false };
      }
      const response = await requestJson("/api/auth/session", { authToken: sessionToken });
      return {
        ...response,
        features: [],
        token_material_returned: false
      };
    },
    async smoke({ email, sessionToken, featureId = "matter_vault_dashboard" } = {}) {
      if (!sessionToken && operatorToken) {
        return requestJson("/api/matter-vault/smoke", {
          method: "POST",
          body: { email, feature_id: featureId },
          actorEmail: email
        });
      }
      if (!sessionToken) {
        return { ok: false, allowed: false, decision: "deny", reason: "auth_session_required", http_status: 401 };
      }
      const path = featureId === "matter_vault_admin"
        ? "/api/admin/security/users"
        : "/api/profile/me?permission_ref=desktop_feature_check&audit_hint_ref=desktop_feature_check";
      const response = await requestJson(path, { authToken: sessionToken });
      return {
        ...response,
        allowed: response.http_status >= 200 && response.http_status < 400,
        decision: response.http_status >= 200 && response.http_status < 400 ? "allow" : "deny",
        feature_id: featureId,
        token_material_returned: false
      };
    },
    api(input = {}) {
      return requestRuntimeApi(input);
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
    requestPasswordReset: unavailable,
    latestResetEmail: unavailable,
    confirmPasswordReset: unavailable,
    login: unavailable,
    features: unavailable,
    smoke: unavailable,
    api: unavailable
  });
}
