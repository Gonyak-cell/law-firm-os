export const VAULT_CAPABILITY_IDS = Object.freeze([
  "read",
  "upload",
  "download",
  "attach",
  "work",
  "governance",
  "audit"
]);

export const VAULT_CAPABILITY_PROJECTION_SCHEMA_VERSION =
  "law-firm-os.vault-capability-projection.v1";

const EMPTY_CAPABILITY_MAP = Object.freeze(Object.fromEntries(
  VAULT_CAPABILITY_IDS.map((id) => [id, false])
));

export const EMPTY_VAULT_CAPABILITY_PROJECTION = Object.freeze({
  state: "unavailable",
  authoritative: false,
  providerState: "unavailable",
  tenantBindingState: "unknown",
  userBindingState: "unknown",
  safeReasonCode: "VAULT_AUTHORITY_UNAVAILABLE",
  capabilityMap: EMPTY_CAPABILITY_MAP
});

function serverProjection(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.vault_capabilities && typeof value.vault_capabilities === "object") {
    return value.vault_capabilities;
  }
  return value;
}

export function normalizeVaultCapabilityProjection(value) {
  const projection = serverProjection(value);
  const shapeValid = projection?.schema_version === VAULT_CAPABILITY_PROJECTION_SCHEMA_VERSION
    && projection?.source === "server-derived"
    && projection?.denied_by_default === true
    && projection?.client_must_not_infer_from_roles === true
    && projection?.token_material_returned === false
    && projection?.raw_policy_returned === false
    && projection?.role_names_returned === false
    && Array.isArray(projection?.capabilities);
  if (!shapeValid) return EMPTY_VAULT_CAPABILITY_PROJECTION;

  const authorityReady = projection.authoritative === true
    && projection.provider_state === "ready"
    && projection.tenant_binding_state === "bound"
    && projection.user_binding_state === "bound"
    && projection.authority_ref_present === true;
  const capabilityMap = { ...EMPTY_CAPABILITY_MAP };
  let safeReasonCode = authorityReady ? "VAULT_CAPABILITY_NOT_GRANTED" : "VAULT_AUTHORITY_UNAVAILABLE";
  for (const capability of projection.capabilities) {
    if (!VAULT_CAPABILITY_IDS.includes(capability?.id)) continue;
    const allowed = authorityReady
      && capability.allowed === true
      && capability.decision === "allow"
      && capability.safe_reason_code === null;
    capabilityMap[capability.id] = allowed;
    if (!allowed && typeof capability.safe_reason_code === "string") {
      safeReasonCode = capability.safe_reason_code;
    }
  }

  return Object.freeze({
    state: authorityReady ? "ready" : "unavailable",
    authoritative: authorityReady,
    providerState: projection.provider_state,
    tenantBindingState: projection.tenant_binding_state,
    userBindingState: projection.user_binding_state,
    safeReasonCode,
    capabilityMap: Object.freeze(capabilityMap)
  });
}

export function vaultCapabilityAllowed(projection, capabilityId) {
  if (!VAULT_CAPABILITY_IDS.includes(capabilityId)) return false;
  const normalized = projection?.capabilityMap
    ? projection
    : normalizeVaultCapabilityProjection(projection);
  return normalized.authoritative === true
    && normalized.capabilityMap?.[capabilityId] === true;
}
