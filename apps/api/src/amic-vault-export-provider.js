import { isDeepStrictEqual } from "node:util";

import {
  assertExactVersionMatches,
  normalizeAmicVaultExactVersion,
  normalizeAmicVaultProviderAudit,
  normalizeAmicVaultProviderDecisions,
  normalizeAmicVaultProviderIdentity,
} from "./amic-vault-upload-provider.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const RFC3339_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const DEFAULT_MAX_GRANT_TTL_MS = 60_000;

const AUTHORIZATION_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "state",
  "provider_export_ref",
  "expires_at",
  "exact_version",
  "attachment_name",
  "decisions",
  "audit",
]);
const DOWNLOAD_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "state",
  "provider_export_ref",
  "exact_version",
  "attachment_name",
  "body",
  "audit",
]);
const READBACK_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "state",
  "provider_export_ref",
  "exact_version",
  "decisions",
  "audit",
]);

export class AmicVaultExportProviderError extends Error {
  constructor(safeErrorCode, message, status = 503) {
    super(message);
    this.name = "AmicVaultExportProviderError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 503) {
  throw new AmicVaultExportProviderError(code, message, status);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail("VAULT_EXPORT_PROVIDER_RESPONSE_INVALID", `${label} must be an object`, 502);
  if (!isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort())) {
    fail("VAULT_EXPORT_PROVIDER_RESPONSE_INVALID", `${label} fields are invalid`, 502);
  }
}

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    fail("VAULT_EXPORT_PROVIDER_RESPONSE_INVALID", `${field} is invalid`, 502);
  }
  return value;
}

function canonicalGrantExpiry(value, { now, maxGrantTtlMs }) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  const current = now();
  if (typeof value !== "string"
      || !RFC3339_MILLISECONDS.test(value)
      || !Number.isFinite(parsed)
      || new Date(parsed).toISOString() !== value
      || parsed <= current
      || parsed - current > maxGrantTtlMs) {
    fail("VAULT_EXPORT_GRANT_EXPIRY_INVALID", "Vault export grant expiry is invalid", 409);
  }
  return value;
}

function attachmentName(value) {
  const name = typeof value === "string" ? value.normalize("NFC") : "";
  if (!name
      || name !== name.trim()
      || name.length > 240
      || /[\\/\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(name)) {
    fail("VAULT_EXPORT_PROVIDER_RESPONSE_INVALID", "Vault export attachment name is invalid", 502);
  }
  return name;
}

function assertProviderRevision(identity, expectedProviderRevision) {
  if (expectedProviderRevision != null
      && identity.provider_revision !== expectedProviderRevision) {
    fail("VAULT_PROVIDER_AUTHORITY_CHANGED", "Vault provider revision changed during export", 409);
  }
}

function exportBody(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return value;
  if (value && typeof value[Symbol.asyncIterator] === "function") return value;
  fail("VAULT_EXPORT_BODY_INVALID", "Vault export body must be bounded binary or an async stream", 502);
}

export function requireAmicVaultExportProvider(provider) {
  if (!provider
      || provider.authority_kind !== "amic-vault-api"
      || typeof provider.authorizeExactExport !== "function"
      || typeof provider.downloadExactExport !== "function"
      || typeof provider.readbackExactExport !== "function") {
    fail("VAULT_EXPORT_PROVIDER_UNAVAILABLE", "AMIC Vault exact export provider is unavailable");
  }
  return provider;
}

export function normalizeAmicVaultExportAuthorization(value, {
  correlationId,
  expectedExactVersion,
  now = Date.now,
  maxGrantTtlMs = DEFAULT_MAX_GRANT_TTL_MS,
} = {}) {
  exactKeys(value, AUTHORIZATION_KEYS, "Vault export authorization");
  if (!Number.isSafeInteger(maxGrantTtlMs)
      || maxGrantTtlMs < 1
      || maxGrantTtlMs > DEFAULT_MAX_GRANT_TTL_MS) {
    fail("VAULT_EXPORT_GRANT_TTL_INVALID", "Vault export grant TTL is invalid");
  }
  const identity = normalizeAmicVaultProviderIdentity(value);
  if (value.state !== "authorized") {
    fail("VAULT_EXPORT_AUTHORIZATION_INCOMPLETE", "Vault provider did not authorize exact export", 409);
  }
  const exactVersion = normalizeAmicVaultExactVersion(value.exact_version);
  assertExactVersionMatches(
    exactVersion,
    expectedExactVersion,
    "VAULT_EXPORT_EXACT_VERSION_MISMATCH",
  );
  return Object.freeze({
    ...identity,
    state: "authorized",
    provider_export_ref: requiredId(value.provider_export_ref, "provider_export_ref"),
    expires_at: canonicalGrantExpiry(value.expires_at, { now, maxGrantTtlMs }),
    exact_version: exactVersion,
    attachment_name: attachmentName(value.attachment_name),
    decisions: normalizeAmicVaultProviderDecisions(value.decisions),
    audit: normalizeAmicVaultProviderAudit(value.audit, correlationId),
  });
}

export function normalizeAmicVaultExportDownload(value, {
  correlationId,
  authorization,
} = {}) {
  exactKeys(value, DOWNLOAD_KEYS, "Vault export download");
  const identity = normalizeAmicVaultProviderIdentity(
    value,
    authorization?.authority_ref,
  );
  assertProviderRevision(identity, authorization?.provider_revision);
  if (value.state !== "downloaded") {
    fail("VAULT_EXPORT_DOWNLOAD_INCOMPLETE", "Vault provider did not return an exact export body", 409);
  }
  const providerExportRef = requiredId(value.provider_export_ref, "provider_export_ref");
  if (providerExportRef !== authorization?.provider_export_ref) {
    fail("VAULT_EXPORT_GRANT_MISMATCH", "Vault export grant changed during download", 409);
  }
  const exactVersion = normalizeAmicVaultExactVersion(value.exact_version);
  assertExactVersionMatches(
    exactVersion,
    authorization?.exact_version,
    "VAULT_EXPORT_EXACT_VERSION_MISMATCH",
  );
  const name = attachmentName(value.attachment_name);
  if (name !== authorization?.attachment_name) {
    fail("VAULT_EXPORT_ATTACHMENT_NAME_MISMATCH", "Vault export attachment name changed", 409);
  }
  return Object.freeze({
    ...identity,
    state: "downloaded",
    provider_export_ref: providerExportRef,
    exact_version: exactVersion,
    attachment_name: name,
    body: exportBody(value.body),
    audit: normalizeAmicVaultProviderAudit(value.audit, correlationId),
  });
}

export function normalizeAmicVaultExportReadback(value, {
  correlationId,
  authorization,
} = {}) {
  exactKeys(value, READBACK_KEYS, "Vault export readback");
  const identity = normalizeAmicVaultProviderIdentity(
    value,
    authorization?.authority_ref,
  );
  assertProviderRevision(identity, authorization?.provider_revision);
  if (value.state !== "consumed") {
    fail("VAULT_EXPORT_READBACK_INCOMPLETE", "Vault export grant consumption is not verified", 409);
  }
  const providerExportRef = requiredId(value.provider_export_ref, "provider_export_ref");
  if (providerExportRef !== authorization?.provider_export_ref) {
    fail("VAULT_EXPORT_GRANT_MISMATCH", "Vault export readback grant is mismatched", 409);
  }
  const exactVersion = normalizeAmicVaultExactVersion(value.exact_version);
  assertExactVersionMatches(
    exactVersion,
    authorization?.exact_version,
    "VAULT_EXPORT_EXACT_VERSION_MISMATCH",
  );
  return Object.freeze({
    ...identity,
    state: "consumed",
    provider_export_ref: providerExportRef,
    exact_version: exactVersion,
    decisions: normalizeAmicVaultProviderDecisions(value.decisions),
    audit: normalizeAmicVaultProviderAudit(value.audit, correlationId),
  });
}

export const AMIC_VAULT_EXPORT_MAX_GRANT_TTL_MS = DEFAULT_MAX_GRANT_TTL_MS;
