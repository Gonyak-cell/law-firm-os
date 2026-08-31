import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const DEFAULT_ENV_FILE = ".env.matter-vault-r4.local";
const DEFAULT_PRODUCTION_RUNTIME_BASE_URL = "https://d2mthcc8vp3cr2.cloudfront.net";
const DEFAULT_RUNTIME_REQUEST_TIMEOUT_MS = 30_000;
const DESKTOP_VAULT_UPLOAD_PREFLIGHT_PATH = "/api/vault/desktop/upload-preflight";
const DESKTOP_VAULT_UPLOAD_TRANSFER_PATH = "/api/vault/desktop/upload-transfer";
const DESKTOP_VAULT_UPLOAD_PATH = "/api/vault/desktop/upload";
const DESKTOP_VAULT_UPLOAD_STATUS_PATH = "/api/vault/desktop/upload-status";
const DESKTOP_VAULT_UPLOAD_MAX_BYTES = 1024 * 1024 * 1024;
const DESKTOP_VAULT_UPLOAD_BUFFERED_FALLBACK_MAX_BYTES = 16 * 1024 * 1024;
const DESKTOP_VAULT_UPLOAD_TRANSPORT = "s3-presigned-put-v1";
const DESKTOP_VAULT_UPLOAD_TRANSPORT_HEADER = "x-amic-vault-upload-transport";
const DESKTOP_VAULT_UPLOAD_TRANSFER_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const DESKTOP_VAULT_EXPORT_PREFLIGHT_PATH = "/api/vault/desktop/export-preflight";
const DESKTOP_VAULT_EXPORT_AUTHORIZE_PATH = "/api/vault/desktop/export-authorize";
const DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH = "/api/vault/desktop/export-download";
const DESKTOP_VAULT_EXPORT_COMPLETE_PATH = "/api/vault/desktop/export-complete";
const DESKTOP_VAULT_EXPORT_MAX_BYTES = 25 * 1024 * 1024;
const VAULT_OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const VAULT_BINDING_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const VAULT_SHA256 = /^[a-f0-9]{64}$/u;
const VAULT_FILE_NAME = /^(?=.{1,240}$)[^"\\/\u0000-\u001f\u007f]+$/u;
const VAULT_FILE_NAME_SURROGATE = /[\uD800-\uDFFF]/u;
const VAULT_MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
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

function vaultUploadError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    name: "DesktopVaultUploadError",
    code,
    safe_error_code: code,
    status,
  });
}

function vaultExportError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    name: "DesktopVaultExportError",
    code,
    safe_error_code: code,
    status,
  });
}

function normalizeVaultExactVersion(value) {
  const expectedKeys = [
    "byte_size",
    "document_id",
    "file_object_id",
    "mime_type",
    "sha256",
    "version_id",
  ];
  if (!value
      || typeof value !== "object"
      || Array.isArray(value)
      || Object.keys(value).sort().join(",") !== expectedKeys.join(",")) {
    throw vaultExportError("VAULT_EXPORT_BINDING_INVALID", "Vault exact version fields are invalid", 400);
  }
  const mimeType = typeof value.mime_type === "string" ? value.mime_type.trim().toLowerCase() : "";
  const byteSize = Number(value.byte_size);
  if (!VAULT_BINDING_ID.test(String(value.document_id ?? ""))
      || !VAULT_BINDING_ID.test(String(value.version_id ?? ""))
      || !VAULT_BINDING_ID.test(String(value.file_object_id ?? ""))
      || !VAULT_SHA256.test(String(value.sha256 ?? ""))
      || !Number.isSafeInteger(byteSize)
      || byteSize < 1
      || byteSize > DESKTOP_VAULT_EXPORT_MAX_BYTES
      || !VAULT_MIME_TYPE.test(mimeType)) {
    throw vaultExportError("VAULT_EXPORT_BINDING_INVALID", "Vault exact version integrity is invalid", 400);
  }
  return Object.freeze({
    document_id: value.document_id,
    version_id: value.version_id,
    file_object_id: value.file_object_id,
    sha256: value.sha256,
    byte_size: byteSize,
    mime_type: mimeType,
  });
}

function validVaultFileName(value) {
  if (typeof value !== "string") return false;
  return value === value.normalize("NFC")
    && value === value.trim()
    && VAULT_FILE_NAME.test(value)
    && !VAULT_FILE_NAME_SURROGATE.test(value);
}

function sameVaultExactVersion(left, right) {
  return [
    "document_id",
    "version_id",
    "file_object_id",
    "sha256",
    "byte_size",
    "mime_type",
  ].every((field) => left?.[field] === right?.[field]);
}

function requireSignedDesktopSession(sessionToken) {
  const token = typeof sessionToken === "string" ? sessionToken.trim() : "";
  if (!token) {
    throw vaultExportError("DESKTOP_RUNTIME_SESSION_REQUIRED", "Signed desktop session is required", 401);
  }
  return token;
}

function assertNoVaultUploadBoundaryLeak(value) {
  const blocked = new Set([
    "contentbase64", "rawpath", "localpath", "filepath", "filebytes",
    "documentbytes", "rawbytes", "sessiontoken", "accesstoken", "refreshtoken",
  ]);
  const pending = [value];
  while (pending.length) {
    const current = pending.pop();
    if (current == null || typeof current !== "object") continue;
    if (Buffer.isBuffer(current) || ArrayBuffer.isView(current) || current instanceof ArrayBuffer) {
      throw vaultUploadError("VAULT_UPLOAD_RESPONSE_UNSAFE", "Vault upload response included binary material", 502);
    }
    for (const [key, child] of Object.entries(current)) {
      const normalized = key.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/gu, "");
      if (blocked.has(normalized) && child != null) {
        throw vaultUploadError("VAULT_UPLOAD_RESPONSE_UNSAFE", "Vault upload response included forbidden material", 502);
      }
      if (child && typeof child === "object") pending.push(child);
    }
  }
  return value;
}

function isDesktopMatterWriteRoute(method, path) {
  return (
    (method === "POST" && path === "/api/matters/vault-bridge/upload-preflight") ||
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
    const controller = new AbortController();
    const timeoutError = Object.assign(new Error("Runtime request deadline exceeded"), { name: "TimeoutError" });
    const timeout = setTimeout(() => controller.abort(timeoutError), requestTimeoutMs);
    let result;
    try {
      const response = await fetchImpl(url, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
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
      result = { response, parsed };
    } catch (error) {
      const timedOut = error?.name === "TimeoutError" || controller.signal.reason?.name === "TimeoutError";
      result = {
        ok: false,
        reason: timedOut ? "runtime_request_timeout" : "runtime_request_failed",
        error_code: timedOut ? "TimeoutError" : error?.code ?? error?.name ?? "fetch_failed",
        http_status: 0,
        token_material_returned: false
      };
    } finally {
      clearTimeout(timeout);
    }
    if (!result.response) return result;
    assertNoRuntimeSecretMaterial(result.parsed, operatorToken);
    return {
      ...result.parsed,
      http_status: result.response.status
    };
  };

  const precheckVaultUpload = async ({ matterId, workspaceId = null, folderId = null, sessionToken } = {}) => {
    const signedSessionToken = typeof sessionToken === "string" ? sessionToken.trim() : "";
    if (!signedSessionToken) {
      return {
        ok: false,
        reason: "desktop_runtime_session_required",
        http_status: 401,
        token_material_returned: false,
      };
    }
    return requestJson(DESKTOP_VAULT_UPLOAD_PREFLIGHT_PATH, {
      method: "POST",
      body: {
        matter_id: matterId,
        workspace_id: workspaceId,
        folder_id: folderId,
      },
      authToken: signedSessionToken,
      authRequired: true,
      headers: { [DESKTOP_VAULT_UPLOAD_TRANSPORT_HEADER]: DESKTOP_VAULT_UPLOAD_TRANSPORT },
    });
  };

  const uploadVaultFile = async ({ stream, openStream, assertUnchanged, file, operationId, sessionToken } = {}) => {
    const signedSessionToken = typeof sessionToken === "string" ? sessionToken.trim() : "";
    if (!signedSessionToken) {
      throw vaultUploadError("DESKTOP_RUNTIME_SESSION_REQUIRED", "Signed desktop session is required", 401);
    }
    if (!VAULT_OPERATION_ID.test(String(operationId ?? ""))) {
      throw vaultUploadError("VAULT_UPLOAD_OPERATION_INVALID", "Vault upload operation ID is invalid", 400);
    }
    const filename = typeof file?.name === "string" ? file.name.normalize("NFC") : "";
    const mimeType = typeof file?.mimeType === "string" ? file.mimeType.trim().toLowerCase() : "";
    const expectedByteSize = Number(file?.size);
    if (!validVaultFileName(filename)) {
      throw vaultUploadError("VAULT_UPLOAD_FILENAME_INVALID", "Vault upload filename is invalid", 400);
    }
    if (!VAULT_MIME_TYPE.test(mimeType)) {
      throw vaultUploadError("VAULT_UPLOAD_MIME_INVALID", "Vault upload MIME type is invalid", 400);
    }
    if (!Number.isSafeInteger(expectedByteSize) || expectedByteSize < 1 || expectedByteSize > DESKTOP_VAULT_UPLOAD_MAX_BYTES) {
      throw vaultUploadError("VAULT_UPLOAD_SIZE_INVALID", "Vault upload size is invalid", 413);
    }
    if (typeof openStream !== "function"
        && (!stream || typeof stream[Symbol.asyncIterator] !== "function")) {
      throw vaultUploadError("VAULT_UPLOAD_STREAM_INVALID", "Vault upload stream is invalid", 400);
    }
    if (typeof openStream !== "function"
        && expectedByteSize > DESKTOP_VAULT_UPLOAD_BUFFERED_FALLBACK_MAX_BYTES) {
      throw vaultUploadError(
        "VAULT_UPLOAD_REOPEN_REQUIRED",
        "Large Vault uploads require a reopenable main-process file handle",
        400,
      );
    }
    const fallbackChunks = [];
    const hashSource = typeof openStream === "function" ? await openStream() : stream;
    const digest = createHash("sha256");
    let observedByteSize = 0;
    try {
      for await (const chunk of hashSource) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        observedByteSize += bytes.byteLength;
        if (observedByteSize > expectedByteSize || observedByteSize > DESKTOP_VAULT_UPLOAD_MAX_BYTES) {
          throw vaultUploadError("VAULT_UPLOAD_SIZE_MISMATCH", "Vault upload stream exceeded its approved size", 409);
        }
        digest.update(bytes);
        if (typeof openStream !== "function") fallbackChunks.push(bytes);
      }
    } finally {
      hashSource?.destroy?.();
    }
    if (observedByteSize !== expectedByteSize) {
      throw vaultUploadError("VAULT_UPLOAD_SIZE_MISMATCH", "Vault upload stream size changed after selection", 409);
    }
    if (typeof assertUnchanged === "function") await assertUnchanged();
    const localSha256 = digest.digest("hex");
    const prepared = await requestJson(DESKTOP_VAULT_UPLOAD_TRANSFER_PATH, {
      method: "POST",
      body: {
        operation_id: operationId,
        file: { filename, mime_type: mimeType, byte_size: expectedByteSize },
      },
      headers: { "idempotency-key": operationId },
      authToken: signedSessionToken,
      authRequired: true,
    });
    const transfer = prepared?.transfer;
    let uploadUrl;
    try {
      uploadUrl = new URL(transfer?.upload_url);
    } catch {
      throw vaultUploadError("VAULT_UPLOAD_TRANSFER_INVALID", "Vault upload transfer URL is invalid", 502);
    }
    const secureTransfer = uploadUrl.protocol === "https:"
      || (runtimeBaseIsLoopback && uploadUrl.protocol === "http:" && isLoopbackBaseUrl(uploadUrl.origin));
    const signatureValid = runtimeBaseIsLoopback
      || /^[a-f0-9]{64}$/u.test(uploadUrl.searchParams.get("X-Amz-Signature") ?? "");
    const transferExpiresAt = Date.parse(transfer?.expires_at);
    const requiredHeaders = transfer?.required_headers;
    if (prepared?.http_status !== 200
        || prepared?.ok !== true
        || prepared?.outcome !== "transfer_ready"
        || prepared?.operation_id !== operationId
        || prepared?.transfer_grant_returned !== true
        || transfer?.method !== "PUT"
        || transfer?.file?.filename !== filename
        || transfer?.file?.byte_size !== expectedByteSize
        || String(transfer?.file?.mime_type ?? "").toLowerCase() !== mimeType
        || !secureTransfer
        || !signatureValid
        || !Number.isFinite(transferExpiresAt)
        || transferExpiresAt <= Date.now()
        || transferExpiresAt > Date.now() + 2 * 60 * 60 * 1000 + 60_000
        || uploadUrl.username
        || uploadUrl.password
        || uploadUrl.hash
        || !requiredHeaders
        || requiredHeaders["content-length"] !== String(expectedByteSize)
        || requiredHeaders["content-type"] !== mimeType
        || requiredHeaders["if-none-match"] !== "*") {
      throw vaultUploadError("VAULT_UPLOAD_TRANSFER_INVALID", "Vault upload transfer grant is invalid", 502);
    }
    const allowedTransferHeaders = new Set([
      "content-length",
      "content-type",
      "if-none-match",
      "x-amz-server-side-encryption",
    ]);
    if (Object.keys(requiredHeaders).some((name) => !allowedTransferHeaders.has(name))) {
      throw vaultUploadError("VAULT_UPLOAD_TRANSFER_INVALID", "Vault upload transfer headers are invalid", 502);
    }
    if (typeof assertUnchanged === "function") await assertUnchanged();
    const uploadSource = typeof openStream === "function"
      ? await openStream()
      : Readable.from(fallbackChunks);
    const uploadDigest = createHash("sha256");
    let uploadedByteSize = 0;
    let uploadStreamComplete = false;
    const uploadBody = Readable.from((async function* directUploadBody() {
      for await (const chunk of uploadSource) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        uploadedByteSize += bytes.byteLength;
        if (uploadedByteSize > expectedByteSize) {
          throw vaultUploadError("VAULT_UPLOAD_SIZE_MISMATCH", "Vault upload stream exceeded its approved size", 409);
        }
        uploadDigest.update(bytes);
        yield bytes;
      }
      if (uploadedByteSize !== expectedByteSize) {
        throw vaultUploadError("VAULT_UPLOAD_SIZE_MISMATCH", "Vault upload stream size changed during transfer", 409);
      }
      uploadStreamComplete = true;
    })());
    const transferController = new AbortController();
    const transferTimeoutError = Object.assign(new Error("Vault transfer deadline exceeded"), { name: "TimeoutError" });
    const transferTimeout = setTimeout(
      () => transferController.abort(transferTimeoutError),
      DESKTOP_VAULT_UPLOAD_TRANSFER_TIMEOUT_MS,
    );
    let transferResponse;
    try {
      transferResponse = await fetchImpl(uploadUrl, {
        method: "PUT",
        headers: requiredHeaders,
        body: uploadBody,
        duplex: "half",
        redirect: "manual",
        signal: transferController.signal,
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || transferController.signal.reason?.name === "TimeoutError") {
        throw vaultUploadError("VAULT_UPLOAD_TIMEOUT", "Vault upload transfer timed out", 504);
      }
      throw error;
    } finally {
      clearTimeout(transferTimeout);
      uploadBody.destroy();
      uploadSource?.destroy?.();
    }
    if (![200, 201, 204, 412].includes(Number(transferResponse?.status))) {
      await transferResponse?.body?.cancel?.().catch(() => undefined);
      throw vaultUploadError("VAULT_UPLOAD_TRANSFER_FAILED", "Vault upload transfer failed", 502);
    }
    if (Number(transferResponse.status) !== 412) {
      if (!uploadStreamComplete
          || uploadedByteSize !== expectedByteSize
          || uploadDigest.digest("hex") !== localSha256) {
        throw vaultUploadError("VAULT_UPLOAD_STREAM_INCOMPLETE", "Vault upload stream changed during transfer", 409);
      }
    }
    await transferResponse.body?.cancel?.().catch(() => undefined);
    if (typeof assertUnchanged === "function") await assertUnchanged();
    const parsed = await requestJson(DESKTOP_VAULT_UPLOAD_PATH, {
      method: "POST",
      body: {
        operation_id: operationId,
        file: {
          filename,
          mime_type: mimeType,
          byte_size: expectedByteSize,
          sha256: localSha256,
        },
      },
      headers: { "idempotency-key": operationId },
      authToken: signedSessionToken,
      authRequired: true,
    });
    assertNoVaultUploadBoundaryLeak(parsed);
    const httpStatus = Number(parsed?.http_status);
    if (httpStatus < 200 || httpStatus >= 300 || parsed?.ok !== true) return parsed;
    const item = parsed.item;
    if (httpStatus === 202 && parsed?.outcome === "processing") {
      const accepted = item?.accepted;
      if (item?.operation_id !== operationId
          || item?.exact_readback_verified !== false
          || !new Set(["quarantined", "scanning", "promoted"]).has(item?.stage)
          || accepted?.sha256 !== localSha256
          || Number(accepted?.byte_size) !== observedByteSize
          || String(accepted?.mime_type ?? "").toLowerCase() !== mimeType
          || !Number.isSafeInteger(item?.retry_after_ms)
          || item.retry_after_ms < 250
          || item.retry_after_ms > 60_000) {
        throw vaultUploadError("VAULT_UPLOAD_RECEIPT_MISMATCH", "Vault upload acceptance does not match the streamed file", 409);
      }
      return {
        ...parsed,
        http_status: httpStatus,
        local_stream_sha256: localSha256,
        local_stream_byte_size: observedByteSize,
        token_material_returned: false,
      };
    }
    if (item?.operation_id !== operationId
        || item?.sha256 !== localSha256
        || Number(item?.byte_size) !== observedByteSize
        || String(item?.mime_type ?? "").toLowerCase() !== mimeType
        || item?.exact_readback_verified !== true) {
      throw vaultUploadError("VAULT_UPLOAD_RECEIPT_MISMATCH", "Vault upload receipt does not match the streamed file", 409);
    }
    return {
      ...parsed,
      http_status: httpStatus,
      local_stream_sha256: localSha256,
      local_stream_byte_size: observedByteSize,
      token_material_returned: false,
    };
  };

  const continueVaultUpload = async ({ operationId, expected, sessionToken } = {}) => {
    const signedSessionToken = typeof sessionToken === "string" ? sessionToken.trim() : "";
    if (!signedSessionToken) {
      throw vaultUploadError("DESKTOP_RUNTIME_SESSION_REQUIRED", "Signed desktop session is required", 401);
    }
    if (!VAULT_OPERATION_ID.test(String(operationId ?? ""))) {
      throw vaultUploadError("VAULT_UPLOAD_OPERATION_INVALID", "Vault upload operation ID is invalid", 400);
    }
    const sha256 = typeof expected?.sha256 === "string" ? expected.sha256 : "";
    const byteSize = Number(expected?.byteSize ?? expected?.byte_size);
    const mimeType = typeof expected?.mimeType === "string"
      ? expected.mimeType.toLowerCase()
      : typeof expected?.mime_type === "string"
        ? expected.mime_type.toLowerCase()
        : "";
    if (!VAULT_SHA256.test(sha256)
        || !Number.isSafeInteger(byteSize)
        || byteSize < 1
        || !VAULT_MIME_TYPE.test(mimeType)) {
      throw vaultUploadError("VAULT_UPLOAD_FINGERPRINT_INVALID", "Vault upload fingerprint is invalid", 400);
    }
    const result = await requestJson(DESKTOP_VAULT_UPLOAD_STATUS_PATH, {
      method: "POST",
      body: { operation_id: operationId },
      authToken: signedSessionToken,
      authRequired: true,
      headers: { "idempotency-key": operationId },
    });
    assertNoVaultUploadBoundaryLeak(result);
    if (result?.http_status < 200 || result?.http_status >= 300 || result?.ok !== true) return result;
    const item = result.item;
    if (item?.operation_id !== operationId) {
      throw vaultUploadError("VAULT_UPLOAD_RECEIPT_MISMATCH", "Vault upload status operation is mismatched", 409);
    }
    if (result.http_status === 202 && result.outcome === "processing") {
      const receiptExact = item?.receipt?.exact_version;
      if (item?.exact_readback_verified !== false
          || !new Set(["quarantined", "scanning", "promoted"]).has(item?.stage)
          || !Number.isSafeInteger(item?.retry_after_ms)
          || item.retry_after_ms < 250
          || item.retry_after_ms > 60_000
          || (item.stage !== "promoted" && receiptExact !== null)
          || (item.stage === "promoted"
            && (receiptExact?.sha256 !== sha256
              || Number(receiptExact?.byte_size) !== byteSize
              || String(receiptExact?.mime_type ?? "").toLowerCase() !== mimeType))) {
        throw vaultUploadError("VAULT_UPLOAD_RECEIPT_MISMATCH", "Vault upload status is incomplete or mismatched", 409);
      }
      return result;
    }
    if (![200, 201].includes(result.http_status)
        || !["readback_verified", "idempotent_replay"].includes(result.outcome)
        || item?.exact_readback_verified !== true
        || item?.sha256 !== sha256
        || Number(item?.byte_size) !== byteSize
        || String(item?.mime_type ?? "").toLowerCase() !== mimeType) {
      throw vaultUploadError("VAULT_UPLOAD_RECEIPT_MISMATCH", "Vault upload final readback is mismatched", 409);
    }
    return result;
  };

  const precheckVaultExport = async ({ matterId, exactVersion, sessionToken } = {}) => {
    const signedSessionToken = requireSignedDesktopSession(sessionToken);
    const exact = normalizeVaultExactVersion(exactVersion);
    return requestJson(DESKTOP_VAULT_EXPORT_PREFLIGHT_PATH, {
      method: "POST",
      body: { matter_id: matterId, exact_version: exact },
      authToken: signedSessionToken,
      authRequired: true,
    });
  };

  const downloadVaultExactVersion = async ({
    matterId,
    exactVersion,
    operationKind = "export_exact_version",
    requestNonceSha256,
    installationRefSha256,
    composeTargetSha256,
    sessionToken,
  } = {}) => {
    const signedSessionToken = requireSignedDesktopSession(sessionToken);
    const exact = normalizeVaultExactVersion(exactVersion);
    const attachOutlook = operationKind === "attach_outlook";
    if (!attachOutlook && operationKind !== "export_exact_version") {
      throw vaultExportError("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation kind is invalid", 400);
    }
    const requestNonce = attachOutlook
      ? requestNonceSha256
      : createHash("sha256").update(randomBytes(32)).digest("hex");
    if (!VAULT_SHA256.test(requestNonce ?? "")
        || (attachOutlook
          && (!VAULT_SHA256.test(installationRefSha256 ?? "")
            || !VAULT_SHA256.test(composeTargetSha256 ?? "")))) {
      throw vaultExportError("VAULT_EXPORT_BINDING_INVALID", "Vault export host binding is invalid", 400);
    }
    const authorizationBody = {
      matter_id: matterId,
      exact_version: exact,
      request_nonce_sha256: requestNonce,
    };
    if (attachOutlook) Object.assign(authorizationBody, {
      operation_kind: "attach_outlook",
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
    });
    const authorization = await requestJson(DESKTOP_VAULT_EXPORT_AUTHORIZE_PATH, {
      method: "POST",
      body: authorizationBody,
      authToken: signedSessionToken,
      authRequired: true,
    });
    assertNoVaultUploadBoundaryLeak(authorization);
    if (authorization?.http_status !== 200
        || authorization?.ok !== true
        || authorization?.outcome !== "export_authorized"
        || authorization?.operation_kind !== operationKind
        || !VAULT_OPERATION_ID.test(String(authorization?.operation_id ?? ""))
        || !sameVaultExactVersion(authorization?.exact_version, exact)
        || !validVaultFileName(authorization?.attachment_name)) {
      const code = authorization?.safe_error_codes?.[0]
        ?? authorization?.reason
        ?? "VAULT_EXPORT_AUTHORIZATION_FAILED";
      throw vaultExportError(code, "Vault exact export authorization failed", authorization?.http_status ?? 409);
    }

    const operationId = authorization.operation_id;
    const controller = new AbortController();
    const timeoutError = Object.assign(new Error("Runtime request deadline exceeded"), { name: "TimeoutError" });
    const timeout = setTimeout(() => controller.abort(timeoutError), requestTimeoutMs);
    let response;
    try {
      response = await fetchImpl(new URL(DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH.slice(1), `${baseUrl}/`), {
        method: "POST",
        headers: {
          authorization: `Bearer ${signedSessionToken}`,
          "content-type": "application/json; charset=utf-8",
          "idempotency-key": operationId,
        },
        body: JSON.stringify({ operation_id: operationId }),
        signal: controller.signal,
      });
      if (!response || typeof response.status !== "number") {
        throw vaultExportError("VAULT_EXPORT_RESPONSE_INVALID", "Vault export response is invalid", 502);
      }
      if (response.status < 200 || response.status >= 300) {
        const text = typeof response.text === "function" ? await response.text() : "";
        let parsed = {};
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {
          // Error bodies are untrusted and optional; expose only a stable safe code.
        }
        const code = parsed?.safe_error_codes?.[0] ?? "VAULT_EXPORT_DOWNLOAD_FAILED";
        throw vaultExportError(code, "Vault exact export download failed", response.status);
      }
      const responseExact = Object.freeze({
        document_id: response.headers?.get?.("x-amic-vault-document-id"),
        version_id: response.headers?.get?.("x-amic-vault-version-id"),
        file_object_id: response.headers?.get?.("x-amic-vault-file-object-id"),
        sha256: response.headers?.get?.("x-amic-vault-sha256"),
        byte_size: Number(response.headers?.get?.("x-amic-vault-byte-size")),
        mime_type: String(response.headers?.get?.("content-type") ?? "").toLowerCase(),
      });
      if (response.headers?.get?.("x-amic-vault-operation-id") !== operationId
          || response.headers?.get?.("content-length") !== String(exact.byte_size)
          || response.headers?.get?.("cache-control") !== "private, no-store"
          || response.headers?.get?.("x-content-type-options") !== "nosniff"
          || !sameVaultExactVersion(responseExact, exact)
          || !response.body
          || typeof response.body[Symbol.asyncIterator] !== "function") {
        throw vaultExportError("VAULT_EXPORT_RESPONSE_MISMATCH", "Vault export response binding is invalid", 502);
      }
      const chunks = [];
      const digest = createHash("sha256");
      let byteSize = 0;
      for await (const value of response.body) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        byteSize += chunk.byteLength;
        if (byteSize > exact.byte_size || byteSize > DESKTOP_VAULT_EXPORT_MAX_BYTES) {
          controller.abort();
          throw vaultExportError("VAULT_EXPORT_SIZE_MISMATCH", "Vault export body exceeded exact size", 409);
        }
        digest.update(chunk);
        chunks.push(chunk);
      }
      const sha256 = digest.digest("hex");
      if (byteSize !== exact.byte_size || sha256 !== exact.sha256) {
        throw vaultExportError("VAULT_EXPORT_BODY_MISMATCH", "Vault export body failed exact hash verification", 409);
      }
      return Object.freeze({
        ok: true,
        http_status: response.status,
        operation_id: operationId,
        operation_kind: operationKind,
        attachment_name: authorization.attachment_name,
        exact_version: exact,
        bytes: Buffer.concat(chunks, byteSize),
        raw_path_included: false,
        token_material_returned: false,
        production_ready_claim: false,
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || controller.signal.reason?.name === "TimeoutError") {
        throw vaultExportError("VAULT_EXPORT_TIMEOUT", "Vault exact export request timed out", 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const completeVaultExport = async ({
    operationId,
    exactVersion,
    operationKind = "export_exact_version",
    completionStage,
    installationRefSha256,
    composeTargetSha256,
    sessionToken,
  } = {}) => {
    const signedSessionToken = requireSignedDesktopSession(sessionToken);
    if (!VAULT_OPERATION_ID.test(String(operationId ?? ""))) {
      throw vaultExportError("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation ID is invalid", 400);
    }
    const exact = normalizeVaultExactVersion(exactVersion);
    const attachOutlook = operationKind === "attach_outlook";
    const expectedStage = attachOutlook ? "attached" : "delivered";
    if ((!attachOutlook && operationKind !== "export_exact_version")
        || (completionStage != null && completionStage !== expectedStage)
        || (attachOutlook
          && (!VAULT_SHA256.test(installationRefSha256 ?? "")
            || !VAULT_SHA256.test(composeTargetSha256 ?? "")))) {
      throw vaultExportError("VAULT_EXPORT_COMPLETION_INVALID", "Vault export completion binding is invalid", 400);
    }
    const completionBody = { operation_id: operationId, exact_version: exact };
    if (attachOutlook) Object.assign(completionBody, {
      operation_kind: "attach_outlook",
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
    });
    const response = await requestJson(DESKTOP_VAULT_EXPORT_COMPLETE_PATH, {
      method: "POST",
      body: completionBody,
      headers: { "idempotency-key": operationId },
      authToken: signedSessionToken,
      authRequired: true,
    });
    assertNoVaultUploadBoundaryLeak(response);
    if (response?.http_status !== 200
        || response?.ok !== true
        || response?.outcome !== expectedStage
        || response?.operation_kind !== operationKind
        || response?.operation_id !== operationId
        || !sameVaultExactVersion(response?.exact_version, exact)
        || response?.receipt?.stage !== expectedStage) {
      const code = response?.safe_error_codes?.[0]
        ?? response?.reason
        ?? "VAULT_EXPORT_COMPLETION_FAILED";
      throw vaultExportError(code, "Vault export delivery acknowledgement failed", response?.http_status ?? 409);
    }
    return { ...response, token_material_returned: false };
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
    if (normalizedPathname === DESKTOP_VAULT_UPLOAD_PREFLIGHT_PATH
        || normalizedPathname === DESKTOP_VAULT_UPLOAD_TRANSFER_PATH
        || normalizedPathname === DESKTOP_VAULT_UPLOAD_PATH
        || normalizedPathname === DESKTOP_VAULT_UPLOAD_STATUS_PATH
        || normalizedPathname === DESKTOP_VAULT_EXPORT_PREFLIGHT_PATH
        || normalizedPathname === DESKTOP_VAULT_EXPORT_AUTHORIZE_PATH
        || normalizedPathname === DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH
        || normalizedPathname === DESKTOP_VAULT_EXPORT_COMPLETE_PATH) {
      return {
        ok: false,
        reason: "desktop_main_only_route",
        http_status: 403,
        token_material_returned: false,
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
    const allowedVaultUploadPreflight = safeMethod === "POST"
      && normalizedPathname === "/api/matters/vault-bridge/upload-preflight";
    if (allowedVaultUploadPreflight && safePath !== normalizedPathname) {
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
      return requestJson(operatorToken ? "/health" : "/api/health", { authRequired: false });
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
        features: response.vault_capabilities?.capabilities ?? [],
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
    precheckVaultUpload,
    uploadVaultFile,
    continueVaultUpload,
    precheckVaultExport,
    downloadVaultExactVersion,
    completeVaultExport,
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
    precheckVaultUpload: unavailable,
    uploadVaultFile: unavailable,
    continueVaultUpload: unavailable,
    precheckVaultExport: unavailable,
    downloadVaultExactVersion: unavailable,
    completeVaultExport: unavailable,
    api: unavailable
  });
}
