export const RUNTIME_AUTH_PROVIDER_SCHEMA_VERSION = "law-firm-os.runtime-auth-provider.v0.1";

export function readRequestHeader(request = {}, name) {
  const headers = request.headers ?? {};
  if (typeof headers.get === "function") return headers.get(name) ?? headers.get(name.toLowerCase());
  const lower = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === lower);
  return match?.[1];
}

export function createAuthProviderInterface({ kind, authenticateRequest, oidc = {}, saml = {}, synthetic_only = true } = {}) {
  if (typeof kind !== "string" || kind.trim() === "") throw new TypeError("auth provider kind is required");
  if (typeof authenticateRequest !== "function") throw new TypeError("authenticateRequest is required");
  return Object.freeze({
    schema_version: RUNTIME_AUTH_PROVIDER_SCHEMA_VERSION,
    kind,
    oidc_supported: Boolean(oidc.supported),
    saml_supported: Boolean(saml.supported),
    synthetic_only,
    production_auth_claim: false,
    authenticateRequest
  });
}
