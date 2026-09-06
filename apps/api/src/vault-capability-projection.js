import { POSTGRES_DMS_CONSUMER_READ_AUTHORITY } from "../../../packages/dms/src/postgres-consumer-storage.js";

export const VAULT_CAPABILITY_PROJECTION_SCHEMA_VERSION =
  "law-firm-os.vault-capability-projection.v1";

export const VAULT_CAPABILITY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "read", label: "Vault 조회", required_scope: "vault.read" }),
  Object.freeze({ id: "upload", label: "Vault 저장", required_scope: "vault.write" }),
  Object.freeze({ id: "download", label: "Vault 다운로드", required_scope: "vault.read" }),
  Object.freeze({ id: "attach", label: "Vault에서 첨부", required_scope: "vault.read" }),
  Object.freeze({ id: "work", label: "Vault 문서 업무", required_scope: "vault.write" }),
  Object.freeze({ id: "governance", label: "Vault 거버넌스", required_scope: "vault.governance" }),
  Object.freeze({ id: "audit", label: "Vault 감사", required_scope: "audit.read" }),
]);

const BINDING_STATES = new Set(["bound", "unbound", "unknown"]);
const PROVIDER_STATES = new Set(["ready", "unavailable", "invalid"]);

function text(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0
    ? value
    : null;
}

function deniedCapabilities(reason) {
  return VAULT_CAPABILITY_DEFINITIONS.map(({ id, label }) => Object.freeze({
    id,
    label,
    allowed: false,
    decision: "deny",
    safe_reason_code: reason,
  }));
}

function projection({
  authoritative,
  providerState,
  tenantBindingState,
  userBindingState,
  capabilities,
  authorityRefPresent = false,
}) {
  return Object.freeze({
    schema_version: VAULT_CAPABILITY_PROJECTION_SCHEMA_VERSION,
    source: "server-derived",
    authoritative,
    provider_state: providerState,
    tenant_binding_state: tenantBindingState,
    user_binding_state: userBindingState,
    authority_ref_present: authorityRefPresent,
    denied_by_default: true,
    client_must_not_infer_from_roles: true,
    capabilities: Object.freeze(capabilities),
    token_material_returned: false,
    raw_policy_returned: false,
    role_names_returned: false,
    production_ready_claim: false,
  });
}

function deniedProjection(reason, {
  providerState = "unavailable",
  tenantBindingState = "unknown",
  userBindingState = "unknown",
  authorityRefPresent = false,
} = {}) {
  return projection({
    authoritative: false,
    providerState,
    tenantBindingState,
    userBindingState,
    authorityRefPresent,
    capabilities: deniedCapabilities(reason),
  });
}

function normalizeProviderResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const tenantBindingState = BINDING_STATES.has(value.tenant_binding_state)
    ? value.tenant_binding_state
    : "unknown";
  const userBindingState = BINDING_STATES.has(value.user_binding_state)
    ? value.user_binding_state
    : "unknown";
  const providerState = PROVIDER_STATES.has(value.provider_state)
    ? value.provider_state
    : "invalid";
  const authorityRefPresent = Boolean(text(value.authority_ref));
  const capabilities = value.capabilities && typeof value.capabilities === "object" && !Array.isArray(value.capabilities)
    ? value.capabilities
    : {};
  return Object.freeze({
    authoritative: value.authoritative === true,
    providerState,
    tenantBindingState,
    userBindingState,
    authorityRefPresent,
    capabilities,
  });
}

export function projectVaultCapabilities({ principal, providerResult } = {}) {
  if (!text(principal?.tenant_id) || !text(principal?.user_id) || !Array.isArray(principal?.scopes)) {
    return deniedProjection("VAULT_SESSION_PRINCIPAL_INVALID", { providerState: "invalid" });
  }
  const provider = normalizeProviderResult(providerResult);
  if (!provider) return deniedProjection("VAULT_AUTHORITY_UNAVAILABLE");
  if (
    !provider.authoritative
    || provider.providerState !== "ready"
    || !provider.authorityRefPresent
  ) {
    return deniedProjection("VAULT_AUTHORITY_UNAVAILABLE", {
      providerState: provider.providerState,
      tenantBindingState: provider.tenantBindingState,
      userBindingState: provider.userBindingState,
      authorityRefPresent: provider.authorityRefPresent,
    });
  }
  if (provider.tenantBindingState !== "bound" || provider.userBindingState !== "bound") {
    return deniedProjection("VAULT_IDENTITY_UNBOUND", {
      providerState: provider.providerState,
      tenantBindingState: provider.tenantBindingState,
      userBindingState: provider.userBindingState,
      authorityRefPresent: provider.authorityRefPresent,
    });
  }

  const scopes = new Set(principal.scopes);
  const capabilities = VAULT_CAPABILITY_DEFINITIONS.map(({ id, label, required_scope: requiredScope }) => {
    const scopeAllowed = scopes.has(requiredScope);
    const providerAllowed = provider.capabilities[id] === true;
    const allowed = scopeAllowed && providerAllowed;
    return Object.freeze({
      id,
      label,
      allowed,
      decision: allowed ? "allow" : "deny",
      safe_reason_code: allowed
        ? null
        : scopeAllowed
          ? "VAULT_CAPABILITY_NOT_GRANTED"
          : "VAULT_SCOPE_NOT_GRANTED",
    });
  });
  return projection({
    authoritative: true,
    providerState: provider.providerState,
    tenantBindingState: provider.tenantBindingState,
    userBindingState: provider.userBindingState,
    authorityRefPresent: provider.authorityRefPresent,
    capabilities,
  });
}

export async function resolveVaultCapabilityProjection({ principal, resolver, request_id } = {}) {
  if (!text(principal?.tenant_id) || !text(principal?.user_id) || !Array.isArray(principal?.scopes)) {
    return projectVaultCapabilities({ principal, providerResult: null });
  }
  if (typeof resolver !== "function") return projectVaultCapabilities({ principal, providerResult: null });
  try {
    const providerResult = await resolver(Object.freeze({
      tenant_id: principal?.tenant_id,
      user_id: principal?.user_id,
      request_id,
    }));
    return projectVaultCapabilities({ principal, providerResult });
  } catch {
    return projectVaultCapabilities({ principal, providerResult: null });
  }
}

export function createPostgresVaultCapabilityResolver({ tenantId, consumerReadAuthority } = {}) {
  if (!text(tenantId)) throw new TypeError("PostgreSQL Vault tenant is required");
  return ({ tenant_id, user_id } = {}) => {
    const authority = consumerReadAuthority?.validate?.();
    if (tenant_id !== tenantId || !text(user_id)
        || authority?.authority !== POSTGRES_DMS_CONSUMER_READ_AUTHORITY
        || authority.durable !== true || authority.deny_before_provider_io !== true
        || authority.probe_completed !== true) return null;
    // Session authentication has already verified the current account and membership.
    // These collection capabilities never replace document owner/ACL authorization.
    return Object.freeze({
      authoritative: true,
      provider_state: "ready",
      tenant_binding_state: "bound",
      user_binding_state: "bound",
      authority_ref: `${POSTGRES_DMS_CONSUMER_READ_AUTHORITY}:${tenantId}`,
      capabilities: Object.freeze({
        read: true, audit: true, download: true,
        upload: false, attach: false, work: false, governance: false,
      }),
    });
  };
}
