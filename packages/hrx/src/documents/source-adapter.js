export const HRX_DOCUMENT_SOURCE_STATUSES = Object.freeze(["verified", "missing", "unavailable", "blocked"]);

const BLOCKED_EXACT_FIELDS = Object.freeze(["body", "content", "text", "document_body", "raw_payload", "secret", "secret_value"]);
const BLOCKED_FIELD_FRAGMENTS = Object.freeze(["access_token", "refresh_token", "credential_value"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function optionalIso(input, field) {
  const value = optionalString(input, field);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
}

export function inferHrxDocumentSourceProvider(sourceRef) {
  const value = String(sourceRef ?? "").trim().toLowerCase();
  if (value.startsWith("m365://") || value.startsWith("sharepoint://") || value.startsWith("onedrive://")) return "m365";
  if (value.startsWith("dms://") || value.startsWith("dms:")) return "dms";
  return "unknown";
}

export function assertNoHrxDocumentSourceLeak(value, path = "source") {
  if (!value || typeof value !== "object") return true;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (BLOCKED_EXACT_FIELDS.includes(normalized) || BLOCKED_FIELD_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
      throw new TypeError(`HR document source metadata must not include ${path}.${key}`);
    }
    assertNoHrxDocumentSourceLeak(child, `${path}.${key}`);
  }
  return true;
}

function normalizeSourceMetadata(input = {}) {
  assertNoHrxDocumentSourceLeak(input, "source_metadata");
  return Object.freeze({
    provider_document_id: optionalString(input, "provider_document_id"),
    etag_present: Boolean(input.etag_present),
    web_url_present: Boolean(input.web_url_present),
    last_modified_at: optionalIso(input, "last_modified_at"),
  });
}

export function createHrxDocumentSourceVerification(input = {}) {
  const { source_metadata: sourceMetadata = {}, ...inputWithoutMetadata } = input;
  assertNoHrxDocumentSourceLeak(inputWithoutMetadata);
  const sourceRef = requiredString(input, "source_ref");
  const sourceStatus = optionalString(input, "source_status") ?? "missing";
  if (!HRX_DOCUMENT_SOURCE_STATUSES.includes(sourceStatus)) throw new TypeError(`Unsupported HR document source status: ${sourceStatus}`);
  const verifiedAt = optionalIso(input, "source_verified_at");
  if (sourceStatus === "verified" && !verifiedAt) throw new TypeError("source_verified_at is required when source_status is verified");

  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    source_ref: sourceRef,
    source_provider: optionalString(input, "source_provider") ?? inferHrxDocumentSourceProvider(sourceRef),
    source_status: sourceStatus,
    source_verified_at: verifiedAt,
    source_version_ref: optionalString(input, "source_version_ref"),
    source_metadata: normalizeSourceMetadata(sourceMetadata),
  });
}

export function assertHrxDocumentSourceVerified(verification = {}) {
  if (verification.source_status !== "verified") {
    const error = new Error("HR document source is not verified");
    error.safe_error_code = "HRX_DOCUMENT_SOURCE_UNVERIFIED";
    throw error;
  }
  return true;
}

export function mergeHrxDocumentSourceVerification(document = {}, verification = {}) {
  assertHrxDocumentSourceVerified(verification);
  if (document.tenant_id !== verification.tenant_id) throw new TypeError("document tenant_id must match source verification");
  if (document.source_ref !== verification.source_ref) throw new TypeError("document source_ref must match source verification");
  return Object.freeze({
    ...document,
    source_provider: verification.source_provider,
    source_status: verification.source_status,
    source_verified_at: verification.source_verified_at,
    source_version_ref: verification.source_version_ref,
    source_metadata: verification.source_metadata,
  });
}

export function createInMemoryHrxDocumentSourceAdapter(seed = []) {
  const sources = new Map();
  const key = (tenantId, sourceRef) => `${tenantId}:${sourceRef}`;
  for (const item of seed) {
    const verification = createHrxDocumentSourceVerification({
      source_status: "verified",
      source_verified_at: new Date().toISOString(),
      ...item,
    });
    sources.set(key(verification.tenant_id, verification.source_ref), verification);
  }

  return Object.freeze({
    async verify(input = {}) {
      const tenantId = requiredString(input, "tenant_id");
      const sourceRef = requiredString(input, "source_ref");
      const verification = sources.get(key(tenantId, sourceRef));
      if (verification) return verification;
      return createHrxDocumentSourceVerification({
        tenant_id: tenantId,
        source_ref: sourceRef,
        source_provider: inferHrxDocumentSourceProvider(sourceRef),
        source_status: "missing",
      });
    },
  });
}
