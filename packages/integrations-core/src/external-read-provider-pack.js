import { createHash } from "node:crypto";

export const EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION =
  "law-firm-os.external-read-provider-pack.v2";

const PROVIDER_ID = /^[a-z][a-z0-9._-]{1,63}$/u;
const CAPABILITY_ID = /^[a-z][a-z0-9._-]{1,127}\.read$/u;
const ADAPTER_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const HEADER_NAME = /^[A-Za-z][A-Za-z0-9-]{0,63}$/u;
const FIELD_NAME = /^[a-z][a-z0-9_]{0,63}$/u;
const PATH_SEGMENT = /^[A-Za-z0-9_.:-]{1,128}$/u;
const QUERY_PARAMETER = /^[A-Za-z][A-Za-z0-9._~-]{0,63}$/u;
const SENSITIVE_TARGET = /(?:^|_)(?:api_?key|authorization|cookie|credential|password|secret|token)(?:_|$)/iu;
const SAFE_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_CURSOR_BYTES = 2_048;
const CHECKPOINT_PREFIX = "ProviderCheckpoint:";

function requiredText(value, field, pattern) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || (pattern && !pattern.test(text))) {
    throw new TypeError(`${field} is invalid`);
  }
  return text;
}

function closedObject(value, field, allowedFields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  const unexpected = Object.keys(value).filter((key) => !allowedFields.includes(key));
  if (unexpected.length > 0) {
    throw new TypeError(`${field} contains unsupported fields: ${unexpected.join(", ")}`);
  }
  return value;
}

function objectValue(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function normalizeJsonPath(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new TypeError(`${field} must contain 1 to 12 path segments`);
  }
  return Object.freeze(value.map((segment) => requiredText(segment, field, PATH_SEGMENT)));
}

function normalizeCursorConfiguration(value, field, allowedFields) {
  const input = closedObject(value, field, allowedFields);
  return {
    request_query_param: requiredText(
      input.request_query_param,
      `${field}.request_query_param`,
      QUERY_PARAMETER,
    ),
    response_cursor_path: normalizeJsonPath(
      input.response_cursor_path,
      `${field}.response_cursor_path`,
    ),
  };
}

function normalizePagination(value, field) {
  if (value == null) return null;
  const normalized = normalizeCursorConfiguration(value, field, [
    "type",
    "request_query_param",
    "response_cursor_path",
    "max_pages",
  ]);
  if (value.type !== "cursor") {
    throw new TypeError(`${field}.type must be cursor`);
  }
  const maxPages = Number(value.max_pages ?? 10);
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 20) {
    throw new TypeError(`${field}.max_pages must be between 1 and 20`);
  }
  return Object.freeze({ type: "cursor", ...normalized, max_pages: maxPages });
}

function normalizeCheckpoint(value, field) {
  if (value == null) return null;
  return Object.freeze(normalizeCursorConfiguration(value, field, [
    "request_query_param",
    "response_cursor_path",
  ]));
}

function normalizeRateLimit(value, field) {
  if (value == null) {
    return Object.freeze({
      max_retries: 0,
      retry_statuses: Object.freeze([429]),
      base_delay_ms: 250,
      max_delay_ms: 5_000,
      honor_retry_after: true,
    });
  }
  const input = closedObject(value, field, [
    "max_retries",
    "retry_statuses",
    "base_delay_ms",
    "max_delay_ms",
    "honor_retry_after",
  ]);
  const maxRetries = Number(input.max_retries ?? 0);
  if (!Number.isSafeInteger(maxRetries) || maxRetries < 0 || maxRetries > 3) {
    throw new TypeError(`${field}.max_retries must be between 0 and 3`);
  }
  if (!Array.isArray(input.retry_statuses) || input.retry_statuses.length < 1 || input.retry_statuses.length > 8) {
    throw new TypeError(`${field}.retry_statuses must contain 1 to 8 HTTP statuses`);
  }
  const retryStatuses = input.retry_statuses.map(Number);
  if (retryStatuses.some((status) => !Number.isSafeInteger(status)
    || (status !== 429 && (status < 500 || status > 599)))) {
    throw new TypeError(`${field}.retry_statuses may contain only 429 or 5xx statuses`);
  }
  if (new Set(retryStatuses).size !== retryStatuses.length) {
    throw new TypeError(`${field}.retry_statuses must be unique`);
  }
  const baseDelayMs = Number(input.base_delay_ms ?? 250);
  const maxDelayMs = Number(input.max_delay_ms ?? 5_000);
  if (!Number.isSafeInteger(baseDelayMs) || baseDelayMs < 0 || baseDelayMs > 5_000) {
    throw new TypeError(`${field}.base_delay_ms must be between 0 and 5000`);
  }
  if (!Number.isSafeInteger(maxDelayMs) || maxDelayMs < baseDelayMs || maxDelayMs > 30_000) {
    throw new TypeError(`${field}.max_delay_ms must be between base_delay_ms and 30000`);
  }
  if (input.honor_retry_after != null && typeof input.honor_retry_after !== "boolean") {
    throw new TypeError(`${field}.honor_retry_after must be boolean`);
  }
  return Object.freeze({
    max_retries: maxRetries,
    retry_statuses: Object.freeze(retryStatuses),
    base_delay_ms: baseDelayMs,
    max_delay_ms: maxDelayMs,
    honor_retry_after: input.honor_retry_after !== false,
  });
}

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(requiredText(value, "base_url"));
  } catch {
    throw new TypeError("base_url must be an absolute HTTPS URL");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.search
    || url.hash
    || (url.port && url.port !== "443")
    || url.pathname !== "/"
  ) {
    throw new TypeError("base_url must be an origin-only HTTPS URL on port 443");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.includes(":")
    || /^\d+(?:\.\d+){3}$/u.test(hostname)
  ) {
    throw new TypeError("base_url must use an approved public DNS hostname");
  }
  return url.origin;
}

function normalizeEndpointPath(value, field) {
  const endpointPath = requiredText(value, field);
  if (
    !endpointPath.startsWith("/")
    || endpointPath.startsWith("//")
    || endpointPath.includes("?")
    || endpointPath.includes("#")
  ) {
    throw new TypeError(`${field} must be a relative-origin path without query or fragment`);
  }
  let decoded;
  try {
    decoded = decodeURIComponent(endpointPath);
  } catch {
    throw new TypeError(`${field} contains invalid escaping`);
  }
  if (decoded.split("/").includes("..")) {
    throw new TypeError(`${field} cannot traverse paths`);
  }
  return endpointPath;
}

function normalizeCapability(input, index) {
  const field = `capabilities[${index}]`;
  closedObject(input, field, [
    "capability",
    "path",
    "items_path",
    "field_map",
    "required_fields",
    "max_items",
    "pagination",
    "checkpoint",
    "rate_limit",
  ]);
  const fieldMapInput = objectValue(input.field_map, `${field}.field_map`);
  const fieldMapEntries = Object.entries(fieldMapInput);
  if (fieldMapEntries.length === 0 || fieldMapEntries.length > 64) {
    throw new TypeError(`${field}.field_map must contain 1 to 64 fields`);
  }
  const fieldMap = Object.freeze(Object.fromEntries(fieldMapEntries.map(([target, sourcePath]) => {
    const targetName = requiredText(target, `${field}.field_map field`, FIELD_NAME);
    if (SENSITIVE_TARGET.test(targetName)) {
      throw new TypeError(`${field}.field_map cannot map credential material`);
    }
    return [targetName, normalizeJsonPath(sourcePath, `${field}.field_map.${target}`)];
  })));
  const requiredFields = Object.freeze([...(input.required_fields ?? [])].map((name) =>
    requiredText(name, `${field}.required_fields`, FIELD_NAME)));
  if (new Set(requiredFields).size !== requiredFields.length) {
    throw new TypeError(`${field}.required_fields must be unique`);
  }
  if (requiredFields.some((name) => !(name in fieldMap))) {
    throw new TypeError(`${field}.required_fields must reference field_map entries`);
  }
  if (!("external_id" in fieldMap) || !requiredFields.includes("external_id")) {
    throw new TypeError(`${field} must map and require external_id`);
  }
  const maxItems = Number(input.max_items ?? 100);
  if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > 500) {
    throw new TypeError(`${field}.max_items must be between 1 and 500`);
  }
  const pagination = normalizePagination(input.pagination, `${field}.pagination`);
  const checkpoint = normalizeCheckpoint(input.checkpoint, `${field}.checkpoint`);
  if (pagination && checkpoint
    && pagination.request_query_param === checkpoint.request_query_param) {
    throw new TypeError(`${field} pagination and checkpoint query parameters must differ`);
  }
  return Object.freeze({
    capability: requiredText(input.capability, `${field}.capability`, CAPABILITY_ID),
    path: normalizeEndpointPath(input.path, `${field}.path`),
    items_path: normalizeJsonPath(input.items_path, `${field}.items_path`),
    field_map: fieldMap,
    required_fields: requiredFields,
    max_items: maxItems,
    pagination,
    checkpoint,
    rate_limit: normalizeRateLimit(input.rate_limit, `${field}.rate_limit`),
  });
}

export function normalizeExternalReadProviderPack(input = {}) {
  closedObject(input, "provider_pack", [
    "schema_version",
    "provider_id",
    "display_name",
    "adapter_version",
    "base_url",
    "auth",
    "capabilities",
    "probe_capability",
  ]);
  if (input.schema_version !== EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION) {
    throw new TypeError("provider_pack schema_version is unsupported");
  }
  const auth = closedObject(input.auth, "provider_pack.auth", [
    "type",
    "placement",
    "header_name",
    "value_prefix",
  ]);
  if (auth.type !== "api_key" || auth.placement !== "header") {
    throw new TypeError("provider_pack supports only header API keys in this version");
  }
  const headerName = requiredText(auth.header_name, "provider_pack.auth.header_name", HEADER_NAME);
  if (["host", "content-length", "transfer-encoding", "cookie", "set-cookie"].includes(headerName.toLowerCase())) {
    throw new TypeError("provider_pack.auth.header_name is forbidden");
  }
  const valuePrefix = auth.value_prefix == null ? "" : String(auth.value_prefix);
  if (valuePrefix.length > 32 || /[\r\n\0]/u.test(valuePrefix)) {
    throw new TypeError("provider_pack.auth.value_prefix is invalid");
  }
  if (!Array.isArray(input.capabilities) || input.capabilities.length === 0 || input.capabilities.length > 32) {
    throw new TypeError("provider_pack.capabilities must contain 1 to 32 entries");
  }
  const capabilities = input.capabilities.map(normalizeCapability);
  if (new Set(capabilities.map(({ capability }) => capability)).size !== capabilities.length) {
    throw new TypeError("provider_pack capability identifiers must be unique");
  }
  const probeCapability = requiredText(
    input.probe_capability,
    "provider_pack.probe_capability",
    CAPABILITY_ID,
  );
  if (!capabilities.some(({ capability }) => capability === probeCapability)) {
    throw new TypeError("provider_pack.probe_capability must reference a declared capability");
  }
  const displayName = requiredText(input.display_name, "provider_pack.display_name");
  if (displayName.length > 120) {
    throw new TypeError("provider_pack.display_name must not exceed 120 characters");
  }
  return Object.freeze({
    schema_version: EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
    provider_id: requiredText(input.provider_id, "provider_pack.provider_id", PROVIDER_ID),
    display_name: displayName,
    adapter_version: requiredText(input.adapter_version, "provider_pack.adapter_version", ADAPTER_VERSION),
    base_url: normalizeBaseUrl(input.base_url),
    auth: Object.freeze({
      type: "api_key",
      placement: "header",
      header_name: headerName,
      value_prefix: valuePrefix,
    }),
    capabilities: Object.freeze(capabilities),
    probe_capability: probeCapability,
  });
}

export function createExternalReadProviderPackCatalog({ packs = [] } = {}) {
  const normalized = packs.map(normalizeExternalReadProviderPack);
  const byProviderId = new Map(normalized.map((pack) => [pack.provider_id, pack]));
  if (byProviderId.size !== normalized.length) {
    throw new TypeError("provider_pack provider_id must be unique");
  }
  const describe = (pack) => Object.freeze({
    provider_id: pack.provider_id,
    display_name: pack.display_name,
    adapter_version: pack.adapter_version,
    auth_type: pack.auth.type,
    credential_fields: Object.freeze(["api_key"]),
    capabilities: Object.freeze(pack.capabilities.map(({ capability }) => capability)),
    probe_capability: pack.probe_capability,
  });
  return Object.freeze({
    provider_count: normalized.length,
    list() {
      return Object.freeze(normalized.map(describe));
    },
    get(providerId) {
      const pack = byProviderId.get(requiredText(providerId, "provider_id", PROVIDER_ID));
      return pack ? describe(pack) : null;
    },
    providers(options = {}) {
      return Object.freeze(normalized.map((pack) => createExternalReadProviderFromPack(pack, options)));
    },
  });
}

function readPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (
      !current
      || typeof current !== "object"
      || !Object.prototype.hasOwnProperty.call(current, segment)
    ) return undefined;
    current = current[segment];
  }
  return current;
}

function cursorValue(value, field) {
  if (value == null || value === "") return null;
  if (typeof value !== "string"
    || Buffer.byteLength(value, "utf8") > MAX_CURSOR_BYTES
    || /[\r\n\0]/u.test(value)) {
    throw providerFailure(
      "EXTERNAL_READ_PROVIDER_CURSOR_INVALID",
      `${field} is invalid`,
      502,
    );
  }
  return value;
}

function encodeCheckpoint(pack, endpoint, cursor) {
  if (cursor == null) return null;
  const body = Buffer.from(JSON.stringify({
    schema_version: "law-firm-os.external-read-checkpoint.v1",
    provider_id: pack.provider_id,
    capability: endpoint.capability,
    cursor,
  }), "utf8").toString("base64url");
  return `${CHECKPOINT_PREFIX}${body}`;
}

function decodeCheckpoint(value, pack, endpoint) {
  if (value == null) return null;
  if (typeof value !== "string"
    || !value.startsWith(CHECKPOINT_PREFIX)
    || value.length > 4_096) {
    throw providerFailure(
      "EXTERNAL_READ_PROVIDER_CHECKPOINT_INVALID",
      "External provider checkpoint is invalid",
      409,
    );
  }
  const encoded = value.slice(CHECKPOINT_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded)) {
    throw providerFailure(
      "EXTERNAL_READ_PROVIDER_CHECKPOINT_INVALID",
      "External provider checkpoint is invalid",
      409,
    );
  }
  let decoded;
  try {
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.toString("base64url") !== encoded) throw new Error("non-canonical checkpoint");
    decoded = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw providerFailure(
      "EXTERNAL_READ_PROVIDER_CHECKPOINT_INVALID",
      "External provider checkpoint is invalid",
      409,
    );
  }
  if (!decoded
    || typeof decoded !== "object"
    || Array.isArray(decoded)
    || Object.keys(decoded).sort().join("\u001f") !== [
      "capability",
      "cursor",
      "provider_id",
      "schema_version",
    ].join("\u001f")
    || decoded.schema_version !== "law-firm-os.external-read-checkpoint.v1"
    || decoded.provider_id !== pack.provider_id
    || decoded.capability !== endpoint.capability) {
    throw providerFailure(
      "EXTERNAL_READ_PROVIDER_CHECKPOINT_INVALID",
      "External provider checkpoint scope is invalid",
      409,
    );
  }
  return cursorValue(decoded.cursor, "checkpoint cursor");
}

function retryDelay(response, attempt, policy) {
  const exponential = Math.min(
    policy.max_delay_ms,
    policy.base_delay_ms * (2 ** attempt),
  );
  if (!policy.honor_retry_after) return exponential;
  const raw = String(response?.headers?.get?.("retry-after") ?? "").trim();
  if (!raw) return exponential;
  let milliseconds;
  if (/^\d+(?:\.\d+)?$/u.test(raw)) {
    milliseconds = Math.ceil(Number(raw) * 1_000);
  } else {
    milliseconds = Date.parse(raw) - Date.now();
  }
  if (!Number.isFinite(milliseconds)) return exponential;
  return Math.max(0, Math.min(policy.max_delay_ms, milliseconds));
}

async function discardResponse(response) {
  try {
    await response?.body?.cancel?.();
  } catch {
    // Best-effort disposal only; the bounded retry policy remains authoritative.
  }
}

function mappedValue(value) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length <= 16_384 && !value.includes("\0")) return value;
  throw providerFailure(
    "EXTERNAL_READ_PROVIDER_RESPONSE_INVALID",
    "External provider mapped value is invalid",
    502,
  );
}

function normalizeApiKeyCredential(input) {
  closedObject(input, "resolved credential", ["api_key"]);
  const apiKey = requiredText(input.api_key, "resolved credential api_key");
  if (apiKey.length > 8192 || /[\r\n\0]/u.test(apiKey)) {
    throw new TypeError("resolved credential api_key is invalid");
  }
  return apiKey;
}

function providerFailure(code, message, status = 502) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

async function readBoundedResponse(response, maximumBytes) {
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maximumBytes) {
      throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_TOO_LARGE", "External provider response is too large", 502);
    }
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let byteCount = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      byteCount += chunk.length;
      if (byteCount > maximumBytes) {
        await reader.cancel();
        throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_TOO_LARGE", "External provider response is too large", 502);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, byteCount);
}

export function createExternalReadProviderFromPack(input, {
  fetch_impl = globalThis.fetch,
  resolve_credential,
  clock = () => new Date().toISOString(),
  max_response_bytes = SAFE_RESPONSE_BYTES,
  sleep_impl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  const pack = normalizeExternalReadProviderPack(input);
  if (typeof fetch_impl !== "function") throw new TypeError("fetch_impl is required");
  if (typeof resolve_credential !== "function") throw new TypeError("resolve_credential is required");
  if (typeof sleep_impl !== "function") throw new TypeError("sleep_impl is required");
  if (!Number.isSafeInteger(max_response_bytes) || max_response_bytes < 1 || max_response_bytes > SAFE_RESPONSE_BYTES) {
    throw new TypeError(`max_response_bytes must be between 1 and ${SAFE_RESPONSE_BYTES}`);
  }
  const byCapability = new Map(pack.capabilities.map((entry) => [entry.capability, entry]));

  return Object.freeze({
    provider_id: pack.provider_id,
    adapter_version: pack.adapter_version,
    capabilities: Object.freeze([...byCapability.keys()]),
    consent_required: false,
    async read(context = {}) {
      const endpoint = byCapability.get(context.capability);
      if (!endpoint) {
        throw providerFailure("EXTERNAL_READ_CAPABILITY_UNAVAILABLE", "External read capability is unavailable", 409);
      }
      let apiKey;
      try {
        apiKey = normalizeApiKeyCredential(await resolve_credential(Object.freeze({
          tenant_id: context.tenant_id,
          legal_entity_id: context.legal_entity_id,
          connection_id: context.connection_id,
          provider_id: pack.provider_id,
          credential_ref: context.credential_ref,
          purpose: "external_read",
        })));
      } catch (cause) {
        throw Object.assign(providerFailure(
          "EXTERNAL_READ_CREDENTIAL_UNAVAILABLE",
          "External provider credential is unavailable",
          503,
        ), { cause });
      }
      const checkpointCursor = endpoint.checkpoint
        ? decodeCheckpoint(context.checkpoint_ref, pack, endpoint)
        : context.checkpoint_ref == null
          ? null
          : (() => { throw providerFailure(
            "EXTERNAL_READ_PROVIDER_CHECKPOINT_INVALID",
            "External provider checkpoint is not supported by this capability",
            409,
          ); })();
      const items = [];
      const itemByExternalId = new Map();
      const responseHashes = [];
      const seenPageCursors = new Set();
      let pageCursor = null;
      let nextCheckpointCursor = checkpointCursor;
      let pageCount = 0;
      let requestCount = 0;
      let retryCount = 0;
      let responseByteCount = 0;
      let duplicateItemCount = 0;
      const pageLimit = endpoint.pagination?.max_pages ?? 1;

      for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {
        const url = new URL(endpoint.path, `${pack.base_url}/`);
        if (checkpointCursor != null) {
          url.searchParams.set(endpoint.checkpoint.request_query_param, checkpointCursor);
        }
        if (pageCursor != null) {
          url.searchParams.set(endpoint.pagination.request_query_param, pageCursor);
        }
        if (url.origin !== pack.base_url) {
          throw providerFailure("EXTERNAL_READ_PROVIDER_PACK_INVALID", "External provider endpoint is invalid", 500);
        }

        let response;
        let attempt = 0;
        while (true) {
          try {
            requestCount += 1;
            response = await fetch_impl(url, {
              method: "GET",
              redirect: "error",
              headers: {
                accept: "application/json",
                [pack.auth.header_name]: `${pack.auth.value_prefix}${apiKey}`,
              },
              signal: AbortSignal.timeout(15_000),
            });
          } catch (cause) {
            throw Object.assign(providerFailure(
              "EXTERNAL_READ_PROVIDER_UNREACHABLE",
              "External provider is unreachable",
              502,
            ), { cause });
          }
          if (response && response.status >= 200 && response.status < 300) break;
          const retryable = response
            && endpoint.rate_limit.retry_statuses.includes(response.status)
            && attempt < endpoint.rate_limit.max_retries;
          if (!retryable) {
            throw providerFailure(
              response?.status === 429
                ? "EXTERNAL_READ_PROVIDER_RATE_LIMITED"
                : "EXTERNAL_READ_PROVIDER_REJECTED",
              "External provider rejected the request",
              502,
            );
          }
          const delay = retryDelay(response, attempt, endpoint.rate_limit);
          await discardResponse(response);
          retryCount += 1;
          attempt += 1;
          await sleep_impl(delay);
        }

        const contentType = String(response.headers?.get?.("content-type") ?? "").toLowerCase();
        if (!/(?:application\/json|\+json)(?:\s*;|$)/u.test(contentType)) {
          throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_INVALID", "External provider response is not JSON", 502);
        }
        const remainingBytes = max_response_bytes - responseByteCount;
        const announcedBytes = Number(response.headers?.get?.("content-length"));
        if (Number.isFinite(announcedBytes) && announcedBytes > remainingBytes) {
          throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_TOO_LARGE", "External provider response is too large", 502);
        }
        const bytes = await readBoundedResponse(response, remainingBytes);
        responseByteCount += bytes.length;
        responseHashes.push(createHash("sha256").update(bytes).digest("hex"));
        pageCount += 1;

        let payload;
        try {
          payload = JSON.parse(bytes.toString("utf8"));
        } catch {
          throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_INVALID", "External provider response is invalid", 502);
        }
        const sourceItems = readPath(payload, endpoint.items_path);
        if (!Array.isArray(sourceItems) || sourceItems.length + items.length > endpoint.max_items) {
          throw providerFailure("EXTERNAL_READ_PROVIDER_ITEM_LIMIT_EXCEEDED", "External provider item limit was exceeded", 502);
        }
        for (const [index, source] of sourceItems.entries()) {
          if (!source || typeof source !== "object" || Array.isArray(source)) {
            throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_INVALID", "External provider item is invalid", 502);
          }
          const mapped = Object.fromEntries(Object.entries(endpoint.field_map).flatMap(([target, sourcePath]) => {
            const value = mappedValue(readPath(source, sourcePath));
            return value === undefined ? [] : [[target, value]];
          }));
          if (endpoint.required_fields.some((field) => mapped[field] === undefined || mapped[field] === null)) {
            throw providerFailure(
              "EXTERNAL_READ_PROVIDER_RESPONSE_INVALID",
              `External provider item ${index} is missing required fields`,
              502,
            );
          }
          if (typeof mapped.external_id !== "string"
            || mapped.external_id.length < 1
            || mapped.external_id.length > 512
            || /[\r\n\0]/u.test(mapped.external_id)) {
            throw providerFailure("EXTERNAL_READ_PROVIDER_RESPONSE_INVALID", "External provider external_id is invalid", 502);
          }
          const frozen = Object.freeze(mapped);
          const dedupeKey = `${pack.provider_id}\u001f${mapped.external_id}`;
          const previous = itemByExternalId.get(dedupeKey);
          if (previous) {
            if (JSON.stringify(previous) !== JSON.stringify(frozen)) {
              throw providerFailure(
                "EXTERNAL_READ_PROVIDER_DUPLICATE_CONFLICT",
                "External provider returned conflicting duplicate items",
                502,
              );
            }
            duplicateItemCount += 1;
            continue;
          }
          itemByExternalId.set(dedupeKey, frozen);
          items.push(frozen);
        }

        if (endpoint.checkpoint) {
          const extractedCheckpoint = cursorValue(
            readPath(payload, endpoint.checkpoint.response_cursor_path),
            "response checkpoint cursor",
          );
          if (extractedCheckpoint != null) nextCheckpointCursor = extractedCheckpoint;
        }
        if (!endpoint.pagination) break;
        const nextPageCursor = cursorValue(
          readPath(payload, endpoint.pagination.response_cursor_path),
          "response page cursor",
        );
        if (nextPageCursor == null) break;
        if (seenPageCursors.has(nextPageCursor)) {
          throw providerFailure("EXTERNAL_READ_PROVIDER_CURSOR_LOOP", "External provider pagination cursor repeated", 502);
        }
        seenPageCursors.add(nextPageCursor);
        if (pageIndex + 1 >= pageLimit) {
          throw providerFailure("EXTERNAL_READ_PROVIDER_PAGE_LIMIT_EXCEEDED", "External provider page limit was exceeded", 502);
        }
        pageCursor = nextPageCursor;
      }
      const observedAt = String(clock());
      if (!Number.isFinite(Date.parse(observedAt))) {
        throw new TypeError("clock must return an ISO timestamp");
      }
      const receiptDigest = createHash("sha256").update(JSON.stringify({
        provider_id: pack.provider_id,
        connection_id: context.connection_id,
        capability: context.capability,
        response_sha256: responseHashes,
        page_count: pageCount,
        item_count: items.length,
      })).digest("hex");
      return Object.freeze({
        items: Object.freeze(items),
        item_count: items.length,
        next_checkpoint_ref: endpoint.checkpoint
          ? encodeCheckpoint(pack, endpoint, nextCheckpointCursor)
          : null,
        provider_receipt_ref: `ProviderReceipt:${pack.provider_id}/${receiptDigest}`,
        observed_at: new Date(observedAt).toISOString(),
        metrics: Object.freeze({
          page_count: pageCount,
          request_count: requestCount,
          retry_count: retryCount,
          response_byte_count: responseByteCount,
          duplicate_item_count: duplicateItemCount,
        }),
      });
    },
  });
}
