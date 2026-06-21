export const RUNTIME_AUTH_SESSION_SCHEMA_VERSION = "law-firm-os.runtime-auth-session.v0.1";
export const AUTH_ASSURANCE_LEVELS = Object.freeze(["anonymous", "password", "mfa", "admin_step_up"]);

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function normalizeMemberships(memberships = []) {
  if (!Array.isArray(memberships)) throw new TypeError("tenant_memberships must be an array");
  return memberships.map((membership) => {
    const tenant_id = requireString(membership.tenant_id, "membership tenant_id");
    return Object.freeze({
      tenant_id,
      role_ids: Object.freeze([...(membership.role_ids ?? [])]),
      group_ids: Object.freeze([...(membership.group_ids ?? [])]),
      scopes: Object.freeze([...(membership.scopes ?? [])]),
      status: membership.status ?? "active"
    });
  });
}

export function createRuntimeAuthSession(input = {}) {
  const session = {
    schema_version: RUNTIME_AUTH_SESSION_SCHEMA_VERSION,
    session_id: requireString(input.session_id, "session_id"),
    user_id: requireString(input.user_id, "user_id"),
    auth_subject: requireString(input.auth_subject, "auth_subject"),
    provider: input.provider ?? "local-dev",
    assurance_level: input.assurance_level ?? "password",
    authenticated_at: input.authenticated_at ?? new Date(0).toISOString(),
    expires_at: input.expires_at ?? "9999-12-31T23:59:59.999Z",
    tenant_memberships: Object.freeze(normalizeMemberships(input.tenant_memberships ?? [])),
    synthetic_only: true,
    production_auth_claim: false
  };
  if (!AUTH_ASSURANCE_LEVELS.includes(session.assurance_level)) {
    throw new TypeError(`invalid assurance_level: ${session.assurance_level}`);
  }
  if ("password" in input || "token" in input || "secret" in input) {
    throw new TypeError("runtime auth sessions must not contain credential material");
  }
  return Object.freeze(session);
}
