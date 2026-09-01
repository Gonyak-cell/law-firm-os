import { AmicVaultExportProviderError } from "./amic-vault-export-provider.js";
import { LAWOS_RUNTIME_PROFILES, runtimePreflightError } from "./runtime-profile.js";

export const LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ENABLED_ENV =
  "LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ENABLED";
export const LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV =
  "LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN";
export const LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV =
  "LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN";
export const AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER =
  "x-amic-os-vault-provider-token";
export const AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER =
  "x-amic-os-account-ledger-id";

const PROVIDER_PATHS = Object.freeze({
  authorize: "/v1/integrations/amic-os/vault/exports/authorize",
  download: "/v1/integrations/amic-os/vault/exports/download",
  readback: "/v1/integrations/amic-os/vault/exports/readback",
});
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_JSON_BYTES = 128 * 1024;
const MAX_EXPORT_BYTES = 25 * 1024 * 1024;
const SAFE_HEADER_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);

function providerError(code, message, status = 503) {
  return new AmicVaultExportProviderError(code, message, status);
}

function preflight(message) {
  throw runtimePreflightError(message);
}

function normalizedOrigin(value, runtimeProfile) {
  let url;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    preflight(`${LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV} must be an absolute provider origin`);
  }
  if (url.username || url.password || url.search || url.hash
      || (url.pathname !== "/" && url.pathname !== "")) {
    preflight(`${LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV} must contain only an origin`);
  }
  const secure = url.protocol === "https:";
  const localLoopback = runtimeProfile === LAWOS_RUNTIME_PROFILES.localDev
    && url.protocol === "http:"
    && LOOPBACK_HOSTS.has(url.hostname);
  if (!secure && !localLoopback) {
    preflight(`${LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV} must use HTTPS`);
  }
  return url.origin;
}

function normalizedToken(value) {
  if (typeof value !== "string"
      || value.length < 32
      || value.length > 4096
      || value !== value.trim()
      || [...value].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code <= 0x1f || code === 0x7f;
      })) {
    preflight(`${LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV} must be a bounded server-only credential`);
  }
  return value;
}

function normalizedTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
    preflight("AMIC Vault export provider timeout is invalid");
  }
  return value;
}

function responseStatusError(status) {
  if (status === 401) {
    return providerError(
      "VAULT_EXPORT_PROVIDER_AUTH_REQUIRED",
      "AMIC Vault export provider rejected its workload credential",
      503,
    );
  }
  if (status === 403 || status === 404) {
    return providerError(
      "VAULT_EXPORT_TARGET_DENIED",
      "AMIC Vault denied the exact export target",
      403,
    );
  }
  if (status === 409) {
    return providerError(
      "VAULT_EXPORT_PROVIDER_CONFLICT",
      "AMIC Vault rejected the exact export state",
      409,
    );
  }
  if (status === 410) {
    return providerError(
      "VAULT_EXPORT_GRANT_EXPIRED",
      "AMIC Vault exact export authorization expired",
      410,
    );
  }
  if (status === 413) {
    return providerError(
      "VAULT_EXPORT_SIZE_INVALID",
      "AMIC Vault exact export exceeds the allowed size",
      413,
    );
  }
  if (status >= 500) {
    return providerError(
      "VAULT_EXPORT_PROVIDER_UNAVAILABLE",
      "AMIC Vault export provider is unavailable",
      503,
    );
  }
  return providerError(
    "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
    "AMIC Vault export provider rejected the server contract",
    502,
  );
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // A failed response is already denied; cancellation is best-effort only.
  }
}

async function boundedBytes(response, maxBytes) {
  const declared = response.headers.get("content-length");
  if (declared != null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes) {
      await cancelBody(response);
      throw providerError(
        "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
        "AMIC Vault provider response length is invalid",
        502,
      );
    }
  }
  if (!response.body) return Buffer.alloc(0);
  const chunks = [];
  let byteSize = 0;
  for await (const value of response.body) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    byteSize += chunk.byteLength;
    if (byteSize > maxBytes) {
      throw providerError(
        "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
        "AMIC Vault provider response exceeded its bound",
        502,
      );
    }
    chunks.push(chunk);
  }
  if (declared != null && Number(declared) !== byteSize) {
    throw providerError(
      "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault provider response length changed during transport",
      502,
    );
  }
  return Buffer.concat(chunks, byteSize);
}

function safeHeader(response, name) {
  const value = response.headers.get(name);
  if (typeof value !== "string" || !SAFE_HEADER_VALUE.test(value)) {
    throw providerError(
      "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
      `AMIC Vault provider ${name} header is invalid`,
      502,
    );
  }
  return value;
}

function exactContentDisposition(filename) {
  const fallback = filename.replace(/[^\w.-]+/gu, "_").slice(0, 120) || "document";
  const encoded = encodeURIComponent(filename).replace(/['()*]/gu, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function safeNoStoreCacheControl(value) {
  if (typeof value !== "string") return false;
  const directives = value.split(",").map((entry) => entry.trim().toLowerCase());
  if (!directives.includes("no-store")) return false;
  return !directives.some((directive) => (
    directive === "public"
    || directive === "immutable"
    || directive.startsWith("s-maxage=")
    || (directive.startsWith("max-age=") && directive !== "max-age=0")
  ));
}

function exactDownloadMetadata(response, authorization) {
  const mimeType = String(response.headers.get("content-type") ?? "").toLowerCase();
  const sha256 = String(response.headers.get("x-amic-vault-sha256") ?? "");
  const byteSize = Number(response.headers.get("x-amic-vault-byte-size"));
  if (!safeNoStoreCacheControl(response.headers.get("cache-control"))
      || response.headers.get("x-content-type-options") !== "nosniff"
      || response.headers.get("content-encoding") != null
      || !MIME_TYPE.test(mimeType)
      || !SHA256.test(sha256)
      || !Number.isSafeInteger(byteSize)
      || byteSize < 1
      || byteSize > MAX_EXPORT_BYTES
      || response.headers.get("content-disposition")
        !== exactContentDisposition(authorization.attachment_name)) {
    throw providerError(
      "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault exact export transport metadata is invalid",
      502,
    );
  }
  return Object.freeze({
    authority_kind: safeHeader(response, "x-amic-vault-authority-kind"),
    authority_ref: safeHeader(response, "x-amic-vault-authority-ref"),
    provider_revision: safeHeader(response, "x-amic-vault-provider-revision"),
    state: "downloaded",
    provider_export_ref: safeHeader(response, "x-amic-vault-export-ref"),
    exact_version: Object.freeze({
      document_id: safeHeader(response, "x-amic-vault-document-id"),
      version_id: safeHeader(response, "x-amic-vault-version-id"),
      file_object_id: safeHeader(response, "x-amic-vault-file-object-id"),
      sha256,
      byte_size: byteSize,
      mime_type: mimeType,
    }),
    attachment_name: authorization.attachment_name,
    audit: Object.freeze({
      event_id: safeHeader(response, "x-amic-vault-audit-event-id"),
      correlation_id: safeHeader(response, "x-amic-vault-correlation-id"),
    }),
  });
}

async function responseJson(response) {
  const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/u.test(contentType)) {
    await cancelBody(response);
    throw providerError(
      "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault provider did not return strict JSON",
      502,
    );
  }
  const bytes = await boundedBytes(response, MAX_JSON_BYTES);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw providerError(
      "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault provider returned invalid JSON",
      502,
    );
  }
}

async function providerRequest({
  fetchFn,
  origin,
  token,
  timeoutMs,
  path,
  body,
  consumeResponse,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`${origin}${path}`, {
      method: "POST",
      headers: Object.freeze({
        accept: "application/json, application/octet-stream",
        "accept-encoding": "identity",
        "content-type": "application/json",
        [AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER]: token,
      }),
      body: JSON.stringify(body),
      redirect: "manual",
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      await cancelBody(response);
      throw providerError(
        "VAULT_EXPORT_PROVIDER_TIMEOUT",
        "AMIC Vault export provider timed out",
        504,
      );
    }
    if (!response || typeof response.status !== "number" || !response.headers) {
      throw providerError(
        "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
        "AMIC Vault provider returned an invalid transport response",
        502,
      );
    }
    if (response.status < 200 || response.status >= 300) {
      await cancelBody(response);
      throw responseStatusError(response.status);
    }
    return await consumeResponse(response);
  } catch (error) {
    if (error instanceof AmicVaultExportProviderError) throw error;
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw providerError(
        "VAULT_EXPORT_PROVIDER_TIMEOUT",
        "AMIC Vault export provider timed out",
        504,
      );
    }
    throw providerError(
      "VAULT_EXPORT_PROVIDER_UNAVAILABLE",
      "AMIC Vault export provider transport failed",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createAmicVaultHttpExportProvider({
  origin,
  token,
  runtimeProfile = LAWOS_RUNTIME_PROFILES.operational,
  fetchFn = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchFn !== "function") preflight("AMIC Vault export provider fetch authority is unavailable");
  const resolvedOrigin = normalizedOrigin(origin, runtimeProfile);
  const resolvedToken = normalizedToken(token);
  const resolvedTimeoutMs = normalizedTimeout(timeoutMs);

  const request = (path, body, consumeResponse) => providerRequest({
    fetchFn,
    origin: resolvedOrigin,
    token: resolvedToken,
    timeoutMs: resolvedTimeoutMs,
    path,
    body,
    consumeResponse,
  });

  return Object.freeze({
    authority_kind: "amic-vault-api",
    async authorizeExactExport(input) {
      return request(PROVIDER_PATHS.authorize, input, responseJson);
    },
    async downloadExactExport(input) {
      return request(PROVIDER_PATHS.download, input, async (response) => {
        try {
          const metadata = exactDownloadMetadata(response, input.authorization);
          const body = await boundedBytes(response, metadata.exact_version.byte_size);
          if (body.byteLength !== metadata.exact_version.byte_size) {
            throw providerError(
              "VAULT_EXPORT_PROVIDER_RESPONSE_INVALID",
              "AMIC Vault exact export body length is invalid",
              502,
            );
          }
          return Object.freeze({ ...metadata, body });
        } catch (error) {
          await cancelBody(response);
          throw error;
        }
      });
    },
    async readbackExactExport(input) {
      return request(PROVIDER_PATHS.readback, input, responseJson);
    },
  });
}

export function resolveAmicVaultHttpExportProvider({
  env = process.env,
  runtimeProfile = LAWOS_RUNTIME_PROFILES.operational,
  fetchFn = globalThis.fetch,
} = {}) {
  const enabled = String(env?.[LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ENABLED_ENV] ?? "").trim();
  if (enabled !== "true") return null;
  return createAmicVaultHttpExportProvider({
    origin: env?.[LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV],
    token: env?.[LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV],
    runtimeProfile,
    fetchFn,
  });
}

export const AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS = PROVIDER_PATHS;
