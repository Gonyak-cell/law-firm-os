import { createHrxDocumentSourceVerification, inferHrxDocumentSourceProvider } from "../../../packages/hrx/src/documents/source-adapter.js";

const SUPPORTED_PROVIDERS = Object.freeze(["m365", "dms"]);
const BLOCKED_FIELDS = Object.freeze(["body", "content", "text", "document_body", "raw_payload", "secret", "secret_value", "access_token", "refresh_token"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertMetadataOnly(input = {}, path = "source") {
  if (!input || typeof input !== "object") return true;
  for (const [key, value] of Object.entries(input)) {
    const normalized = key.toLowerCase();
    if (BLOCKED_FIELDS.some((blocked) => normalized === blocked || normalized.includes(blocked))) {
      throw new TypeError(`HRX M365/DMS document source must not include ${path}.${key}`);
    }
    assertMetadataOnly(value, `${path}.${key}`);
  }
  return true;
}

function normalizeSeed(input = {}) {
  assertMetadataOnly(input);
  const sourceRef = requiredString(input, "source_ref");
  const provider = input.source_provider ?? inferHrxDocumentSourceProvider(sourceRef);
  if (!SUPPORTED_PROVIDERS.includes(provider)) throw new TypeError(`Unsupported HRX document source provider: ${provider}`);
  return createHrxDocumentSourceVerification({
    tenant_id: requiredString(input, "tenant_id"),
    source_ref: sourceRef,
    source_provider: provider,
    source_status: input.source_status ?? "verified",
    source_verified_at: input.source_verified_at ?? new Date().toISOString(),
    source_version_ref: input.source_version_ref ?? null,
    source_metadata: {
      provider_document_id: input.provider_document_id ?? null,
      etag_present: Boolean(input.etag_present),
      web_url_present: Boolean(input.web_url_present),
      last_modified_at: input.last_modified_at ?? null,
    },
  });
}

export function createHrxM365DocumentSourceAdapter({ sources = [] } = {}) {
  const byRef = new Map();
  for (const source of sources) {
    const normalized = normalizeSeed(source);
    byRef.set(`${normalized.tenant_id}:${normalized.source_ref}`, normalized);
  }

  return Object.freeze({
    async verify(input = {}) {
      assertMetadataOnly(input);
      const tenantId = requiredString(input, "tenant_id");
      const sourceRef = requiredString(input, "source_ref");
      const provider = inferHrxDocumentSourceProvider(sourceRef);
      if (!SUPPORTED_PROVIDERS.includes(provider)) {
        return createHrxDocumentSourceVerification({
          tenant_id: tenantId,
          source_ref: sourceRef,
          source_provider: provider,
          source_status: "blocked",
        });
      }
      return byRef.get(`${tenantId}:${sourceRef}`) ?? createHrxDocumentSourceVerification({
        tenant_id: tenantId,
        source_ref: sourceRef,
        source_provider: provider,
        source_status: "missing",
      });
    },
  });
}

export const createHrxM365DmsDocumentSourceAdapter = createHrxM365DocumentSourceAdapter;
