import { isOpaqueCredentialReference } from "../../persistence/src/credential-reference.js";

export const EXTERNAL_READ_PROVIDER_SCHEMA_VERSION =
  "law-firm-os.external-read-provider.v0.1";

export const EXTERNAL_READ_CONNECTION_STATES = Object.freeze([
  "not_configured",
  "disabled",
  "ready",
]);

export const EXTERNAL_READ_CONSENT_STATES = Object.freeze([
  "not_required",
  "pending",
  "active",
  "expired",
  "revoked",
]);

const PROVIDER_ID = /^[a-z][a-z0-9._-]{1,63}$/u;
const CAPABILITY_ID = /^[a-z][a-z0-9._-]{1,127}\.read$/u;
const OPAQUE_PROVIDER_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s@]{1,511}$/u;
const CREDENTIAL_MATERIAL =
  /(?:bearer|password|client[_-]?secret|access[_-]?token|refresh[_-]?token)/iu;

function guardedError(message, safeErrorCode, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: safeErrorCode,
    status,
  });
}

function requiredText(value, field, pattern) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || (pattern && !pattern.test(text))) {
    throw new TypeError(`${field} is invalid`);
  }
  return text;
}

function opaqueProviderRef(value, field) {
  const ref = requiredText(value, field, OPAQUE_PROVIDER_REF);
  if (CREDENTIAL_MATERIAL.test(ref)) {
    throw new TypeError(`${field} must not contain credential material`);
  }
  return ref;
}

function optionalProviderRef(value, field) {
  return value == null ? null : opaqueProviderRef(value, field);
}

function isoTimestamp(value, field) {
  const text = requiredText(value, field);
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) throw new TypeError(`${field} is invalid`);
  return new Date(timestamp).toISOString();
}

function normalizeProvider(input = {}) {
  const providerId = requiredText(input.provider_id, "provider_id", PROVIDER_ID);
  const capabilities = [...new Set((input.capabilities ?? []).map((capability) =>
    requiredText(capability, "capability", CAPABILITY_ID)))];
  if (capabilities.length === 0) {
    throw new TypeError("provider capabilities are required");
  }
  if (typeof input.read !== "function") {
    throw new TypeError("provider read adapter is required");
  }
  return Object.freeze({
    provider_id: providerId,
    adapter_version: requiredText(input.adapter_version, "adapter_version"),
    capabilities: Object.freeze(capabilities),
    consent_required: input.consent_required !== false,
    read: input.read,
  });
}

export function normalizeExternalReadConnection(input = {}) {
  if (input.schema_version !== EXTERNAL_READ_PROVIDER_SCHEMA_VERSION) {
    throw new TypeError("external provider connection schema_version is unsupported");
  }
  const state = requiredText(input.state, "state");
  if (!EXTERNAL_READ_CONNECTION_STATES.includes(state)) {
    throw new TypeError("external provider connection state is unsupported");
  }
  const consentState = requiredText(input.consent_state, "consent_state");
  if (!EXTERNAL_READ_CONSENT_STATES.includes(consentState)) {
    throw new TypeError("external provider consent_state is unsupported");
  }
  const credentialRef = input.credential_ref == null
    ? null
    : requiredText(input.credential_ref, "credential_ref");
  if (credentialRef && !isOpaqueCredentialReference(credentialRef)) {
    throw new TypeError(
      "credential_ref must use an opaque AWS Secrets Manager reference",
    );
  }
  if (state === "ready" && !credentialRef) {
    throw new TypeError("ready external provider connection requires credential_ref");
  }
  return Object.freeze({
    schema_version: EXTERNAL_READ_PROVIDER_SCHEMA_VERSION,
    tenant_id: requiredText(input.tenant_id, "tenant_id"),
    legal_entity_id: requiredText(input.legal_entity_id, "legal_entity_id"),
    connection_id: requiredText(input.connection_id, "connection_id"),
    provider_id: requiredText(input.provider_id, "provider_id", PROVIDER_ID),
    state,
    consent_state: consentState,
    credential_ref: credentialRef,
  });
}

function normalizeAuthorityScope(input = {}) {
  return Object.freeze({
    tenant_id: requiredText(input.tenant_id, "scope.tenant_id"),
    legal_entity_id: requiredText(input.legal_entity_id, "scope.legal_entity_id"),
  });
}

function normalizeProviderResult(result, context) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw guardedError(
      "External provider response is invalid",
      "EXTERNAL_READ_PROVIDER_RESPONSE_INVALID",
      502,
    );
  }
  if (!Array.isArray(result.items)) {
    throw guardedError(
      "External provider response items are invalid",
      "EXTERNAL_READ_PROVIDER_RESPONSE_INVALID",
      502,
    );
  }
  const itemCount = Number(result.item_count);
  if (!Number.isSafeInteger(itemCount) || itemCount !== result.items.length) {
    throw guardedError(
      "External provider response item count is invalid",
      "EXTERNAL_READ_PROVIDER_RESPONSE_INVALID",
      502,
    );
  }
  return Object.freeze({
    schema_version: EXTERNAL_READ_PROVIDER_SCHEMA_VERSION,
    ...context,
    item_count: itemCount,
    items: Object.freeze([...result.items]),
    next_checkpoint_ref: optionalProviderRef(
      result.next_checkpoint_ref,
      "next_checkpoint_ref",
    ),
    provider_receipt_ref: opaqueProviderRef(
      result.provider_receipt_ref,
      "provider_receipt_ref",
    ),
    observed_at: isoTimestamp(result.observed_at, "observed_at"),
  });
}

function unavailableReadiness(providerId) {
  return Object.freeze({
    provider_id: providerId,
    state: "provider_unavailable",
    safe_error_code: "EXTERNAL_READ_PROVIDER_UNAVAILABLE",
    ready: false,
  });
}

export function createExternalReadProviderRegistry({ providers = [] } = {}) {
  const entries = providers.map(normalizeProvider);
  const byProviderId = new Map(entries.map((provider) => [provider.provider_id, provider]));
  if (byProviderId.size !== entries.length) {
    throw new TypeError("external provider_id must be unique");
  }

  function inspect({ provider_id, capability, connection, scope } = {}) {
    const providerId = requiredText(provider_id, "provider_id", PROVIDER_ID);
    const provider = byProviderId.get(providerId);
    if (!provider) return unavailableReadiness(providerId);
    if (!provider.capabilities.includes(capability)) {
      return Object.freeze({
        provider_id: providerId,
        state: "capability_unavailable",
        safe_error_code: "EXTERNAL_READ_CAPABILITY_UNAVAILABLE",
        ready: false,
      });
    }
    if (!connection) {
      return Object.freeze({
        provider_id: providerId,
        state: "not_configured",
        safe_error_code: "EXTERNAL_READ_PROVIDER_NOT_CONFIGURED",
        ready: false,
      });
    }
    let normalized;
    try {
      normalized = normalizeExternalReadConnection(connection);
    } catch {
      return Object.freeze({
        provider_id: providerId,
        state: "invalid_configuration",
        safe_error_code: "EXTERNAL_READ_PROVIDER_CONFIGURATION_INVALID",
        ready: false,
      });
    }
    if (normalized.provider_id !== providerId) {
      return Object.freeze({
        provider_id: providerId,
        state: "scope_mismatch",
        safe_error_code: "EXTERNAL_READ_PROVIDER_SCOPE_MISMATCH",
        ready: false,
      });
    }
    let authorityScope;
    try {
      authorityScope = normalizeAuthorityScope(scope);
    } catch {
      return Object.freeze({
        provider_id: providerId,
        state: "scope_required",
        safe_error_code: "EXTERNAL_READ_PROVIDER_SCOPE_REQUIRED",
        ready: false,
      });
    }
    if (normalized.tenant_id !== authorityScope.tenant_id
      || normalized.legal_entity_id !== authorityScope.legal_entity_id) {
      return Object.freeze({
        provider_id: providerId,
        state: "scope_mismatch",
        safe_error_code: "EXTERNAL_READ_PROVIDER_SCOPE_MISMATCH",
        ready: false,
      });
    }
    if (normalized.state !== "ready") {
      return Object.freeze({
        provider_id: providerId,
        state: normalized.state,
        safe_error_code: normalized.state === "disabled"
          ? "EXTERNAL_READ_PROVIDER_DISABLED"
          : "EXTERNAL_READ_PROVIDER_NOT_CONFIGURED",
        ready: false,
      });
    }
    const consentReady = provider.consent_required
      ? normalized.consent_state === "active"
      : normalized.consent_state === "not_required";
    if (!consentReady) {
      return Object.freeze({
        provider_id: providerId,
        state: "consent_required",
        safe_error_code: "EXTERNAL_READ_PROVIDER_CONSENT_REQUIRED",
        ready: false,
      });
    }
    return Object.freeze({
      provider_id: providerId,
      state: "ready",
      safe_error_code: null,
      ready: true,
    });
  }

  async function read({ connection, scope, capability, checkpoint_ref = null } = {}) {
    const providerId = connection?.provider_id;
    let readiness;
    try {
      readiness = inspect({ provider_id: providerId, capability, connection, scope });
    } catch {
      throw guardedError(
        "External provider request is invalid",
        "EXTERNAL_READ_PROVIDER_CONFIGURATION_INVALID",
        400,
      );
    }
    if (!readiness.ready) {
      throw guardedError(
        "External provider is not ready",
        readiness.safe_error_code,
        readiness.state === "provider_unavailable" ? 503 : 409,
      );
    }
    const provider = byProviderId.get(providerId);
    const normalized = normalizeExternalReadConnection(connection);
    const authorityScope = normalizeAuthorityScope(scope);
    const checkpointRef = optionalProviderRef(checkpoint_ref, "checkpoint_ref");
    let result;
    try {
      result = await provider.read(Object.freeze({
        tenant_id: authorityScope.tenant_id,
        legal_entity_id: authorityScope.legal_entity_id,
        connection_id: normalized.connection_id,
        credential_ref: normalized.credential_ref,
        capability,
        checkpoint_ref: checkpointRef,
      }));
    } catch (cause) {
      throw Object.assign(guardedError(
        "External provider read failed",
        "EXTERNAL_READ_PROVIDER_FAILED",
        502,
      ), { cause });
    }
    return normalizeProviderResult(result, {
      tenant_id: authorityScope.tenant_id,
      legal_entity_id: authorityScope.legal_entity_id,
      connection_id: normalized.connection_id,
      provider_id: normalized.provider_id,
      capability,
    });
  }

  return Object.freeze({
    provider_count: entries.length,
    inspect,
    read,
  });
}
