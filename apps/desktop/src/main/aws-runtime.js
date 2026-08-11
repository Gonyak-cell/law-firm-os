import { existsSync, readFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ENV_FILE = ".env.matter-vault-r4.local";
const DEFAULT_PRODUCTION_RUNTIME_BASE_URL = "https://d2mthcc8vp3cr2.cloudfront.net";
const DEFAULT_RUNTIME_REQUEST_TIMEOUT_MS = 30_000;
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

function stripTrailingSlashes(value) {
  const text = String(value ?? "");
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 47) end -= 1;
  return text.slice(0, end);
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
  const baseUrl = stripTrailingSlashes(
    useDesktopRuntimeOverride
      ? desktopRuntimeBaseUrl
      : productionRuntimeBaseUrl || desktopRuntimeBaseUrl || DEFAULT_PRODUCTION_RUNTIME_BASE_URL
  );
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
  const localLoginEmail = isLoopbackBaseUrl(baseUrl)
    ? valueFrom(env, fileValues, ["MATTER_DESKTOP_LOCAL_LOGIN_EMAIL"])
    : "";

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
    localLoginEmail,
    envPath: absoluteEnvPath,
    envFilePresent: existsSyncImpl(absoluteEnvPath)
  });
}

export function publicRuntimeConfig(config = {}) {
  const localLoginEmail = isLoopbackBaseUrl(config.baseUrl) ? String(config.localLoginEmail ?? "").trim() : "";
  return {
    configured: Boolean(config.baseUrl),
    mode: config.operatorToken ? "aws-temporary-execute-api" : "production-auth-http",
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    operatorActor: config.operatorActor,
    migrationWindow: config.migrationWindow,
    localLoginEmail,
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
    (method === "POST" && path === "/api/vault/search/preferences") ||
    (method === "PATCH" && /^\/api\/matters\/[A-Za-z0-9_-]+\/profile$/.test(path)) ||
    (method === "POST" && /^\/api\/matters\/[A-Za-z0-9_-]+\/stakeholders$/.test(path)) ||
    (method === "POST" && /^\/api\/matters\/[A-Za-z0-9_-]+\/worktree$/.test(path)) ||
    (method === "POST" && /^\/api\/matters\/[A-Za-z0-9_-]+\/worktree\/template-applications$/.test(path)) ||
    (method === "POST" && /^\/api\/matters\/[A-Za-z0-9_-]+\/worktree\/nodes$/.test(path)) ||
    (method === "PATCH" && /^\/api\/matters\/[A-Za-z0-9_-]+\/worktree\/nodes\/[A-Za-z0-9_-]+$/.test(path)) ||
    (method === "DELETE" && /^\/api\/matters\/[A-Za-z0-9_-]+\/worktree\/nodes\/[A-Za-z0-9_-]+$/.test(path)) ||
    (method === "POST" && /^\/api\/matters\/[A-Za-z0-9_-]+\/worktree\/tasks\/[A-Za-z0-9_-]+\/(complete|reopen|unblock)$/.test(path))
  );
}

function isDesktopFinanceWriteRoute(method, path) {
  return method === "POST" && [
    "/api/finance/bank-imports",
    "/api/finance/bank-classifications/auto",
    "/api/finance/bank-classifications/review",
  ].includes(path);
}

function isDesktopHrxLeaveWriteRoute(method, path) {
  if (method === "PATCH") {
    return (
      /^\/api\/hrx\/leave\/me\/requests\/[^/]+$/.test(path) ||
      /^\/api\/hrx\/leave\/(groups|types|policies)\/[^/]+$/.test(path)
    );
  }
  if (method !== "POST") return false;
  return (
    [
      "/api/hrx/leave",
      "/api/hrx/leave/me/preview",
      "/api/hrx/leave/me/requests",
      "/api/hrx/leave/delegations",
      "/api/hrx/leave/accrual/rules",
      "/api/hrx/leave/accrual/preview",
      "/api/hrx/leave/accrual/execute",
      "/api/hrx/leave/accrual/manual/preview",
      "/api/hrx/leave/accrual/manual/approve",
      "/api/hrx/leave/accrual/manual/execute",
      "/api/hrx/leave/ledger/snapshots",
      "/api/hrx/leave/promotion-campaigns",
      "/api/hrx/leave/promotion-campaigns/preview",
      "/api/hrx/leave/integrations/process",
      "/api/hrx/leave/termination-reconciliations/preview",
      "/api/hrx/leave/termination-reconciliations/approve",
      "/api/hrx/leave/termination-reconciliations/execute",
      "/api/hrx/leave/groups",
      "/api/hrx/leave/types",
      "/api/hrx/leave/policies",
    ].includes(path) ||
    /^\/api\/hrx\/leave\/me\/requests\/[^/]+\/(cancel|reschedule-response|additional-information)$/.test(path) ||
    /^\/api\/hrx\/leave\/requests\/[^/]+\/(approve|reject|reschedule|request-info|escalate)$/.test(path) ||
    /^\/api\/hrx\/leave\/delegations\/[^/]+\/(revoke|expire)$/.test(path) ||
    /^\/api\/hrx\/leave\/promotion-recipients\/[^/]+\/(first-notice|second-notice|evidence|response)$/.test(path) ||
    /^\/api\/hrx\/leave\/accrual\/manual\/uploads\/[^/]+\/(approve|execute|retry)$/.test(path) ||
    /^\/api\/hrx\/leave\/policies\/[^/]+\/(publish|versions)$/.test(path) ||
    /^\/api\/hrx\/leave\/[^/]+\/(approve|reject)$/.test(path)
  );
}

function isDesktopHrxPayrollWriteRoute(method, path) {
  if (method !== "POST") return false;
  return (
    [
      "/api/hrx/payroll",
      "/api/hrx/payroll/preview",
      "/api/hrx/payroll/approve",
      "/api/hrx/payroll/export",
      "/api/hrx/payroll/periods",
      "/api/hrx/payroll/runs",
    ].includes(path) ||
    /^\/api\/hrx\/payroll\/runs\/[^/]+\/(snapshot|preview|approve|close)$/.test(path) ||
    /^\/api\/hrx\/payroll\/runs\/[^/]+\/statements\/(generate|deliver)$/.test(path) ||
    /^\/api\/hrx\/payroll\/statements\/[^/]+\/revoke$/.test(path) ||
    /^\/api\/hrx\/payroll\/runs\/[^/]+\/payments\/prepare$/.test(path) ||
    /^\/api\/hrx\/payroll\/payment-batches\/[^/]+\/(approve|export|reconcile)$/.test(path) ||
    /^\/api\/hrx\/payroll\/runs\/[^/]+\/filings$/.test(path) ||
    /^\/api\/hrx\/payroll\/filings\/[^/]+\/(validate|submit|correct)$/.test(path) ||
    /^\/api\/hrx\/payroll\/runs\/[^/]+\/year-end\/(collect|calculate|review)$/.test(path) ||
    /^\/api\/hrx\/payroll\/issues\/[^/]+\/resolve$/.test(path)
  );
}

function isDesktopPeopleOutlookWriteRoute(method, path) {
  return (
    ["POST", "DELETE"].includes(method)
    && /^\/api\/hrx\/people\/members\/[A-Za-z0-9._:-]+\/outlook-connection$/.test(path)
  );
}

function isDesktopPeopleOutlookCompletionRoute(method, path) {
  return method === "POST" && path === "/api/hrx/people/me/outlook-connection/complete";
}

function isDesktopOutlookInstallationWriteRoute(method, path) {
  return method === "POST" && (
    path === "/api/desktop/installations"
    || /^\/api\/desktop\/installations\/odi_[A-Za-z0-9_-]{20,128}\/(heartbeat|retire)$/u.test(path)
  );
}

function isDesktopPeopleOutlookCompletionBody(body) {
  if (!body || Object.keys(body).sort().join(",") !== "authorization_code,state_ref") return false;
  return typeof body.authorization_code === "string"
    && typeof body.state_ref === "string"
    && /^(?=.{1,4096}$)[\x21-\x7e]+$/.test(body.authorization_code)
    && /^[A-Za-z0-9._:-]{1,200}$/.test(body.state_ref);
}

function isDesktopHrxStepUpRoute(method, path) {
  return method === "POST" && path === "/api/auth/step-up";
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
  const requestTimeoutMs = Number.isSafeInteger(config.requestTimeoutMs) && config.requestTimeoutMs > 0
    ? config.requestTimeoutMs
    : DEFAULT_RUNTIME_REQUEST_TIMEOUT_MS;

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
      body: body == null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs)
    }).catch((error) => ({
      ok: false,
      reason: error?.name === "TimeoutError" ? "runtime_request_timeout" : "runtime_request_failed",
      error_code: error?.name === "TimeoutError" ? "TimeoutError" : error?.code ?? error?.name ?? "fetch_failed",
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
    const rawPathname = safePath.split(/[?#]/, 1)[0];
    const normalizedPathname = safePath.startsWith("/") && !safePath.includes("\\")
      ? new URL(safePath, "http://desktop.invalid").pathname
      : "";
    const signedSessionToken = typeof sessionToken === "string" ? sessionToken.trim() : "";
    if (!signedSessionToken) {
      return {
        ok: false,
        reason: "desktop_runtime_session_required",
        http_status: 401,
        token_material_returned: false
      };
    }
    if (!normalizedPathname || normalizedPathname !== rawPathname) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_path_blocked",
        http_status: 403,
        token_material_returned: false
      };
    }
    const allowedPeopleOutlookCompletion = isDesktopPeopleOutlookCompletionRoute(
      safeMethod,
      normalizedPathname,
    );
    if (allowedPeopleOutlookCompletion && safePath !== normalizedPathname) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_path_blocked",
        http_status: 403,
        token_material_returned: false
      };
    }
    const allowedPeopleOutlookWrite = isDesktopPeopleOutlookWriteRoute(
      safeMethod,
      normalizedPathname,
    ) || allowedPeopleOutlookCompletion;
    const allowedWrite = isDesktopMatterWriteRoute(safeMethod, normalizedPathname) ||
      isDesktopFinanceWriteRoute(safeMethod, normalizedPathname) ||
      isDesktopHrxLeaveWriteRoute(safeMethod, normalizedPathname) ||
      isDesktopHrxPayrollWriteRoute(safeMethod, normalizedPathname) ||
      allowedPeopleOutlookWrite ||
      isDesktopOutlookInstallationWriteRoute(safeMethod, normalizedPathname) ||
      isDesktopHrxStepUpRoute(safeMethod, normalizedPathname);
    if (safeMethod !== "GET" && !allowedWrite) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_get_only",
        http_status: 405,
        token_material_returned: false
      };
    }
    if (!normalizedPathname.startsWith("/api/") && !normalizedPathname.startsWith("/master-data/")) {
      return {
        ok: false,
        reason: "desktop_runtime_read_bridge_path_blocked",
        http_status: 403,
        token_material_returned: false
      };
    }
    const parsedBody = allowedWrite && body != null
      ? parseDesktopMatterWriteBody(body)
      : body;
    if (
      allowedWrite
      && !parsedBody
      && !(allowedPeopleOutlookWrite && safeMethod === "DELETE" && body == null)
    ) {
      return {
        ok: false,
        reason: "desktop_runtime_write_body_invalid",
        http_status: 400,
        token_material_returned: false
      };
    }
    if (allowedPeopleOutlookCompletion && !isDesktopPeopleOutlookCompletionBody(parsedBody)) {
      return {
        ok: false,
        reason: "desktop_runtime_outlook_completion_body_invalid",
        http_status: 400,
        token_material_returned: false
      };
    }
    if (normalizedPathname.startsWith("/api/auth/") && !isDesktopHrxStepUpRoute(safeMethod, normalizedPathname)) {
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
      if (["content-type", "x-lawos-permission-context", "x-lawos-hrx-step-up"].includes(lowerName)) {
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
    async logout({ sessionToken } = {}) {
      const signedSessionToken = typeof sessionToken === "string" ? sessionToken.trim() : "";
      if (!signedSessionToken) {
        return {
          ok: false,
          reason: "auth_session_required",
          http_status: 401,
          token_material_returned: false
        };
      }
      const response = await requestJson("/api/auth/logout", {
        method: "POST",
        authToken: signedSessionToken,
        authRequired: true
      });
      return {
        ok: response.ok === true,
        replayed: response.replayed === true,
        reason: response.ok === true ? null : "server_session_revoke_failed",
        http_status: Number(response.http_status ?? 0),
        token_material_returned: false
      };
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
    logout: unavailable,
    features: unavailable,
    smoke: unavailable,
    api: unavailable
  });
}
