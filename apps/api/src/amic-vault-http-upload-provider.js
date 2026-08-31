import { createHash } from "node:crypto";

import { AmicVaultUploadProviderError } from "./amic-vault-upload-provider.js";
import {
  AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER,
  AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER,
} from "./amic-vault-http-export-provider.js";
import { LAWOS_RUNTIME_PROFILES, runtimePreflightError } from "./runtime-profile.js";

export const LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED_ENV =
  "LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED";
export const LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV =
  "LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN";
export const LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV =
  "LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN";

const PROVIDER_PATHS = Object.freeze({
  capabilities: "/v1/integrations/amic-os/vault/capabilities/resolve",
  documents: "/v1/integrations/amic-os/vault/read/documents",
  search: "/v1/integrations/amic-os/vault/read/search",
  preflight: "/v1/integrations/amic-os/vault/uploads/preflight",
  prepare: "/v1/integrations/amic-os/vault/uploads/prepare",
  commit: "/v1/integrations/amic-os/vault/uploads/commit",
  complete: "/v1/integrations/amic-os/vault/uploads/complete",
  readback: "/v1/integrations/amic-os/vault/uploads/readback",
});
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_JSON_BYTES = 128 * 1024;
const MAX_BUFFERED_UPLOAD_BYTES = 16 * 1024 * 1024;
const MAX_DIRECT_UPLOAD_BYTES = 1024 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const ACCOUNT_LEDGER_ID = /^[a-z0-9][a-z0-9._-]{1,78}[a-z0-9]$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
const BINARY_JSON_KEYS = new Set(["bytes", "content_base64"]);
const CAPABILITY_KEYS = Object.freeze([
  "read",
  "upload",
  "download",
  "attach",
  "work",
  "governance",
  "audit",
]);
const READ_RESPONSE_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "items",
  "page_info",
  "count_leak_prevented",
  "raw_bytes_included",
  "storage_locator_returned",
]);
const READ_PAGE_KEYS = Object.freeze([
  "page",
  "page_size",
  "returned_count",
  "current_version_only",
  "omitted_result_count",
]);
const READ_ITEM_KEYS = Object.freeze([
  "document_id",
  "matter_id",
  "title",
  "current_version_id",
  "version_id",
  "current_file_object_id",
  "file_object_id",
  "latest_sha256",
  "content_sha256",
  "current_byte_size",
  "byte_size",
  "current_mime_type",
  "mime_type",
  "filename",
  "indexed_at",
  "match_fields",
]);
const READ_MATCH_FIELDS = new Set(["title", "body_text"]);
const MAX_READ_ITEMS = 50;

function providerError(code, message, status = 503) {
  return new AmicVaultUploadProviderError(code, message, status);
}

function preflight(message) {
  throw runtimePreflightError(message);
}

function normalizedOrigin(value, runtimeProfile) {
  let url;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    preflight(`${LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV} must be an absolute provider origin`);
  }
  if (url.username || url.password || url.search || url.hash
      || (url.pathname !== "/" && url.pathname !== "")) {
    preflight(`${LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV} must contain only an origin`);
  }
  const secure = url.protocol === "https:";
  const localLoopback = runtimeProfile === LAWOS_RUNTIME_PROFILES.localDev
    && url.protocol === "http:"
    && LOOPBACK_HOSTS.has(url.hostname);
  if (!secure && !localLoopback) {
    preflight(`${LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV} must use HTTPS`);
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
    preflight(`${LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV} must be a bounded server-only credential`);
  }
  return value;
}

function normalizedTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
    preflight("AMIC Vault upload provider timeout is invalid");
  }
  return value;
}

function responseStatusError(status) {
  if (status === 401) {
    return providerError(
      "VAULT_UPLOAD_PROVIDER_AUTH_REQUIRED",
      "AMIC Vault upload provider rejected its workload credential",
      503,
    );
  }
  if (status === 403 || status === 404) {
    return providerError(
      "VAULT_UPLOAD_TARGET_DENIED",
      "AMIC Vault denied the upload target",
      403,
    );
  }
  if (status === 409) {
    return providerError(
      "VAULT_UPLOAD_PROVIDER_CONFLICT",
      "AMIC Vault rejected the bound upload state",
      409,
    );
  }
  if (status === 410) {
    return providerError(
      "VAULT_PROVIDER_PREFLIGHT_EXPIRED",
      "AMIC Vault upload preflight expired",
      410,
    );
  }
  if (status === 413) {
    return providerError(
      "VAULT_SOURCE_TOO_LARGE",
      "AMIC Vault rejected the upload size",
      413,
    );
  }
  if (status >= 500) {
    return providerError(
      "VAULT_UPLOAD_PROVIDER_UNAVAILABLE",
      "AMIC Vault upload provider is unavailable",
      503,
    );
  }
  return providerError(
    "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
    "AMIC Vault upload provider rejected the server contract",
    502,
  );
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // A denied response is already final; cancellation is best-effort only.
  }
}

async function boundedBytes(response, maxBytes) {
  const declared = response.headers.get("content-length");
  if (declared != null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes) {
      await cancelBody(response);
      throw providerError(
        "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
        "AMIC Vault upload provider response length is invalid",
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
        "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
        "AMIC Vault upload provider response exceeded its bound",
        502,
      );
    }
    chunks.push(chunk);
  }
  if (declared != null && Number(declared) !== byteSize) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault upload provider response length changed during transport",
      502,
    );
  }
  return Buffer.concat(chunks, byteSize);
}

async function responseJson(response) {
  const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/u.test(contentType)) {
    await cancelBody(response);
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault upload provider did not return strict JSON",
      502,
    );
  }
  const bytes = await boundedBytes(response, MAX_JSON_BYTES);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault upload provider returned invalid JSON",
      502,
    );
  }
}

function strictJsonBody(value) {
  const seen = new WeakSet();
  const visit = (current, path = "request") => {
    if (current == null || typeof current === "string" || typeof current === "boolean") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw providerError(
          "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
          `AMIC Vault upload ${path} contains a non-finite number`,
          400,
        );
      }
      return;
    }
    if (typeof current !== "object"
        || Buffer.isBuffer(current)
        || current instanceof Uint8Array
        || seen.has(current)) {
      throw providerError(
        "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
        `AMIC Vault upload ${path} is not strict JSON`,
        400,
      );
    }
    const prototype = Object.getPrototypeOf(current);
    if (!Array.isArray(current) && prototype !== Object.prototype && prototype !== null) {
      throw providerError(
        "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
        `AMIC Vault upload ${path} is not a plain JSON value`,
        400,
      );
    }
    seen.add(current);
    for (const [key, nested] of Object.entries(current)) {
      if (BINARY_JSON_KEYS.has(key)) {
        throw providerError(
          "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
          "AMIC Vault upload JSON cannot contain file bytes",
          400,
        );
      }
      visit(nested, `${path}.${key}`);
    }
    seen.delete(current);
  };
  visit(value);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > MAX_JSON_BYTES) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
      "AMIC Vault upload JSON exceeded its bound",
      413,
    );
  }
  return serialized;
}

function boundedFilename(value) {
  const filename = typeof value === "string" ? value.normalize("NFC") : "";
  if (!filename
      || filename !== filename.trim()
      || filename.length > 240
      || /[\\/\u0000-\u001f\u007f]/u.test(filename)) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
      "AMIC Vault upload filename is invalid",
      400,
    );
  }
  return filename;
}

function accountLedgerId(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!ACCOUNT_LEDGER_ID.test(normalized)) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
      "AMIC Vault upload principal is invalid",
      400,
    );
  }
  return normalized;
}

function safeId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
      `AMIC Vault upload ${field} is invalid`,
      400,
    );
  }
  return value;
}

function capabilityResult(value) {
  const expected = [
    "authoritative",
    "provider_state",
    "tenant_binding_state",
    "user_binding_state",
    "authority_ref",
    "capabilities",
  ].sort();
  const actual = value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
  const capabilityKeys = value?.capabilities
    && typeof value.capabilities === "object"
    && !Array.isArray(value.capabilities)
    ? Object.keys(value.capabilities).sort()
    : [];
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])
      || capabilityKeys.length !== CAPABILITY_KEYS.length
      || capabilityKeys.some((key, index) => key !== [...CAPABILITY_KEYS].sort()[index])
      || value.authoritative !== true
      || value.provider_state !== "ready"
      || value.tenant_binding_state !== "bound"
      || value.user_binding_state !== "bound"
      || !SAFE_ID.test(value.authority_ref)
      || CAPABILITY_KEYS.some((key) => typeof value.capabilities[key] !== "boolean")) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
      "AMIC Vault capability binding is invalid",
      502,
    );
  }
  return Object.freeze({
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref: value.authority_ref,
    capabilities: Object.freeze(Object.fromEntries(
      CAPABILITY_KEYS.map((key) => [key, value.capabilities[key]]),
    )),
  });
}

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value : null;
}

function hasExactKeys(value, expected) {
  const input = plainObject(value);
  if (!input) return false;
  const actual = Object.keys(input).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function readRequestInvalid(message) {
  throw providerError("VAULT_READ_PROVIDER_REQUEST_INVALID", message, 400);
}

function readResponseInvalid(message) {
  throw providerError("VAULT_READ_PROVIDER_RESPONSE_INVALID", message, 502);
}

function boundedReadPage(value, maximum, field) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    readRequestInvalid(`AMIC Vault read ${field} is invalid`);
  }
  return value;
}

function strictCalendarDate(value, field) {
  if (value === null) return null;
  const parsed = typeof value === "string"
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(Number.NaN);
  if (typeof value !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/u.test(value)
      || Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== value) {
    readRequestInvalid(`AMIC Vault read ${field} is invalid`);
  }
  return value;
}

function readPrincipal(value) {
  if (!hasExactKeys(value, ["tenant_id", "user_id"])) {
    readRequestInvalid("AMIC Vault read principal is invalid");
  }
  const tenantId = typeof value.tenant_id === "string" && SAFE_ID.test(value.tenant_id)
    ? value.tenant_id
    : null;
  const userId = typeof value.user_id === "string"
    ? value.user_id.trim().toLowerCase()
    : "";
  if (!tenantId || !ACCOUNT_LEDGER_ID.test(userId)) {
    readRequestInvalid("AMIC Vault read principal is invalid");
  }
  return Object.freeze({ tenant_id: tenantId, user_id: userId });
}

function normalizeReadRequest(value, { search }) {
  const expected = search
    ? [
        "principal",
        "query",
        "lawos_matter_id",
        "current_version_only",
        "date_from",
        "date_to",
        "page",
        "page_size",
      ]
    : ["principal", "lawos_matter_id", "page", "page_size"];
  if (!hasExactKeys(value, expected)) {
    readRequestInvalid("AMIC Vault read fields are invalid");
  }
  const matterId = value.lawos_matter_id === null
    ? null
    : typeof value.lawos_matter_id === "string" && SAFE_ID.test(value.lawos_matter_id)
      ? value.lawos_matter_id
      : readRequestInvalid("AMIC Vault read matter ID is invalid");
  const common = {
    principal: readPrincipal(value.principal),
    lawos_matter_id: matterId,
    page: boundedReadPage(value.page, 1_000, "page"),
    page_size: boundedReadPage(value.page_size, MAX_READ_ITEMS, "page size"),
  };
  if (!search) return Object.freeze(common);
  const query = typeof value.query === "string" ? value.query.trim() : "";
  const dateFrom = strictCalendarDate(value.date_from, "start date");
  const dateTo = strictCalendarDate(value.date_to, "end date");
  if (query.length > 2_000
      || value.current_version_only !== true
      || (dateFrom && dateTo && dateFrom > dateTo)) {
    readRequestInvalid("AMIC Vault search fields are invalid");
  }
  return Object.freeze({
    ...common,
    query,
    current_version_only: true,
    date_from: dateFrom,
    date_to: dateTo,
  });
}

function readItem(value) {
  if (!hasExactKeys(value, READ_ITEM_KEYS)) {
    readResponseInvalid("AMIC Vault read item fields are invalid");
  }
  const ids = [
    value.document_id,
    value.matter_id,
    value.current_version_id,
    value.version_id,
    value.current_file_object_id,
    value.file_object_id,
  ];
  const title = typeof value.title === "string" ? value.title.normalize("NFC") : "";
  const mimeType = typeof value.mime_type === "string" ? value.mime_type.toLowerCase() : "";
  const currentMimeType = typeof value.current_mime_type === "string"
    ? value.current_mime_type.toLowerCase()
    : "";
  const filename = typeof value.filename === "string" ? value.filename.normalize("NFC") : "";
  const matchFields = Array.isArray(value.match_fields) ? value.match_fields : [];
  if (ids.some((entry) => typeof entry !== "string" || !SAFE_ID.test(entry))
      || value.current_version_id !== value.version_id
      || value.current_file_object_id !== value.file_object_id
      || typeof value.latest_sha256 !== "string"
      || !SHA256.test(value.latest_sha256)
      || value.latest_sha256 !== value.content_sha256
      || !Number.isSafeInteger(value.current_byte_size)
      || value.current_byte_size < 1
      || value.current_byte_size !== value.byte_size
      || !MIME_TYPE.test(mimeType)
      || currentMimeType !== mimeType
      || !title
      || title !== title.trim()
      || title.length > 512
      || !filename
      || filename !== filename.trim()
      || filename.length > 240
      || /[\\/\u0000-\u001f\u007f]/u.test(filename)
      || value.indexed_at !== null
      || matchFields.length < 1
      || matchFields.length > READ_MATCH_FIELDS.size
      || new Set(matchFields).size !== matchFields.length
      || matchFields.some((entry) => !READ_MATCH_FIELDS.has(entry))) {
    readResponseInvalid("AMIC Vault read item integrity is invalid");
  }
  return Object.freeze({
    document_id: value.document_id,
    matter_id: value.matter_id,
    title,
    current_version_id: value.current_version_id,
    version_id: value.version_id,
    current_file_object_id: value.current_file_object_id,
    file_object_id: value.file_object_id,
    latest_sha256: value.latest_sha256,
    content_sha256: value.content_sha256,
    current_byte_size: value.current_byte_size,
    byte_size: value.byte_size,
    current_mime_type: mimeType,
    mime_type: mimeType,
    filename,
    indexed_at: null,
    match_fields: Object.freeze([...matchFields]),
  });
}

function readResult(value) {
  if (!hasExactKeys(value, READ_RESPONSE_KEYS)
      || value.authority_kind !== "amic-vault-api"
      || typeof value.authority_ref !== "string"
      || !SAFE_ID.test(value.authority_ref)
      || typeof value.provider_revision !== "string"
      || !SAFE_ID.test(value.provider_revision)
      || !Array.isArray(value.items)
      || value.items.length > MAX_READ_ITEMS
      || !hasExactKeys(value.page_info, READ_PAGE_KEYS)
      || value.count_leak_prevented !== true
      || value.raw_bytes_included !== false
      || value.storage_locator_returned !== false) {
    readResponseInvalid("AMIC Vault read response authority is invalid");
  }
  const items = value.items.map(readItem);
  const pageInfo = value.page_info;
  if (!Number.isSafeInteger(pageInfo.page)
      || pageInfo.page < 1
      || !Number.isSafeInteger(pageInfo.page_size)
      || pageInfo.page_size < 1
      || pageInfo.page_size > MAX_READ_ITEMS
      || !Number.isSafeInteger(pageInfo.returned_count)
      || pageInfo.returned_count !== items.length
      || pageInfo.current_version_only !== true
      || pageInfo.omitted_result_count !== null) {
    readResponseInvalid("AMIC Vault read page binding is invalid");
  }
  return Object.freeze({
    authority_kind: "amic-vault-api",
    authority_ref: value.authority_ref,
    provider_revision: value.provider_revision,
    items: Object.freeze(items),
    page_info: Object.freeze({ ...pageInfo }),
    count_leak_prevented: true,
    raw_bytes_included: false,
    storage_locator_returned: false,
  });
}

function commitMultipart(input) {
  const file = input?.file;
  const bytes = Buffer.isBuffer(file?.bytes)
    ? file.bytes
    : file?.bytes instanceof Uint8Array
      ? Buffer.from(file.bytes)
      : null;
  const filename = boundedFilename(file?.filename);
  const mimeType = typeof file?.mime_type === "string" ? file.mime_type.toLowerCase() : "";
  const expectedSha256 = typeof file?.sha256 === "string" ? file.sha256 : "";
  if (!bytes
      || bytes.byteLength < 1
      || bytes.byteLength > MAX_BUFFERED_UPLOAD_BYTES
      || file?.byte_size !== bytes.byteLength
      || !MIME_TYPE.test(mimeType)
      || !SHA256.test(expectedSha256)
      || createHash("sha256").update(bytes).digest("hex") !== expectedSha256) {
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
      "AMIC Vault upload bytes do not match their exact metadata",
      400,
    );
  }

  const envelope = Object.freeze({
    ...input,
    file: Object.freeze({
      filename,
      mime_type: mimeType,
      byte_size: bytes.byteLength,
      sha256: expectedSha256,
    }),
  });
  const form = new FormData();
  form.set("envelope", strictJsonBody(envelope));
  form.set("file", new Blob([bytes], { type: mimeType }), filename);
  return form;
}

async function providerRequest({
  fetchFn,
  origin,
  token,
  timeoutMs,
  path,
  body,
  principalAccountLedgerId,
  multipart = false,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`${origin}${path}`, {
      method: "POST",
      headers: Object.freeze({
        accept: "application/json",
        "accept-encoding": "identity",
        ...(!multipart ? { "content-type": "application/json" } : {}),
        [AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER]: token,
        [AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER]: accountLedgerId(principalAccountLedgerId),
      }),
      body: multipart ? body : strictJsonBody(body),
      redirect: "manual",
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      await cancelBody(response);
      throw providerError(
        "VAULT_UPLOAD_PROVIDER_TIMEOUT",
        "AMIC Vault upload provider timed out",
        504,
      );
    }
    if (!response || typeof response.status !== "number" || !response.headers) {
      throw providerError(
        "VAULT_UPLOAD_PROVIDER_RESPONSE_INVALID",
        "AMIC Vault upload provider returned an invalid transport response",
        502,
      );
    }
    if (response.status < 200 || response.status >= 300) {
      await cancelBody(response);
      throw responseStatusError(response.status);
    }
    return await responseJson(response);
  } catch (error) {
    if (error instanceof AmicVaultUploadProviderError) throw error;
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw providerError(
        "VAULT_UPLOAD_PROVIDER_TIMEOUT",
        "AMIC Vault upload provider timed out",
        504,
      );
    }
    throw providerError(
      "VAULT_UPLOAD_PROVIDER_UNAVAILABLE",
      "AMIC Vault upload provider transport failed",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createAmicVaultHttpUploadProvider({
  origin,
  token,
  runtimeProfile = LAWOS_RUNTIME_PROFILES.operational,
  fetchFn = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchFn !== "function") preflight("AMIC Vault upload provider fetch authority is unavailable");
  const resolvedOrigin = normalizedOrigin(origin, runtimeProfile);
  const resolvedToken = normalizedToken(token);
  const resolvedTimeoutMs = normalizedTimeout(timeoutMs);

  const request = (
    path,
    body,
    multipart = false,
    principalAccountLedgerId = body?.principal?.user_id,
  ) => providerRequest({
    fetchFn,
    origin: resolvedOrigin,
    token: resolvedToken,
    timeoutMs: resolvedTimeoutMs,
    path,
    body,
    principalAccountLedgerId,
    multipart,
  });

  return Object.freeze({
    authority_kind: "amic-vault-api",
    async resolveCapabilities(input) {
      const userId = accountLedgerId(input?.user_id);
      return capabilityResult(await request(
        PROVIDER_PATHS.capabilities,
        {
          principal: {
            tenant_id: safeId(input?.tenant_id, "tenant ID"),
            user_id: userId,
          },
          request_id: safeId(input?.request_id, "capability request ID"),
        },
        false,
        userId,
      ));
    },
    async listDocuments(input) {
      const body = normalizeReadRequest(input, { search: false });
      return readResult(await request(PROVIDER_PATHS.documents, body));
    },
    async searchDocuments(input) {
      const body = normalizeReadRequest(input, { search: true });
      return readResult(await request(PROVIDER_PATHS.search, body));
    },
    async preflightUpload(input) {
      return request(PROVIDER_PATHS.preflight, input);
    },
    async commitUpload(input) {
      return request(
        PROVIDER_PATHS.commit,
        commitMultipart(input),
        true,
        input?.principal?.user_id,
      );
    },
    async prepareStagedUpload(input) {
      return request(PROVIDER_PATHS.prepare, input);
    },
    async completeStagedUpload(input) {
      return request(PROVIDER_PATHS.complete, input);
    },
    async readbackUpload(input) {
      return request(PROVIDER_PATHS.readback, input);
    },
  });
}

export function resolveAmicVaultHttpUploadProvider({
  env = process.env,
  runtimeProfile = LAWOS_RUNTIME_PROFILES.operational,
  fetchFn = globalThis.fetch,
} = {}) {
  const enabled = String(env?.[LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED_ENV] ?? "").trim();
  if (enabled !== "true") return null;
  return createAmicVaultHttpUploadProvider({
    origin: env?.[LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV],
    token: env?.[LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV],
    runtimeProfile,
    fetchFn,
  });
}

export const AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS = PROVIDER_PATHS;
export const AMIC_VAULT_HTTP_UPLOAD_MAX_BYTES = MAX_BUFFERED_UPLOAD_BYTES;
export const AMIC_VAULT_HTTP_DIRECT_UPLOAD_MAX_BYTES = MAX_DIRECT_UPLOAD_BYTES;
