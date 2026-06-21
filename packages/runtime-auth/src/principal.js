import { resolveRolesAndGroups, resolveTenantMembership } from "./membership.js";
import { readRequestHeader } from "./provider.js";

const FORGED_TRUST_HEADERS = Object.freeze([
  "x-tenant-id",
  "x-lawos-tenant-id",
  "x-role-id",
  "x-lawos-role-id",
  "x-user-id",
  "x-lawos-user-id"
]);

const FORGED_TRUST_QUERY_KEYS = Object.freeze(["tenant_id", "role_id", "user_id", "actor_id"]);

function assertNoCallerSuppliedTrust(request = {}) {
  for (const header of FORGED_TRUST_HEADERS) {
    if (readRequestHeader(request, header)) {
      throw new Error(`caller-supplied trust context is not allowed: ${header}`);
    }
  }
  const query = request.query ?? {};
  for (const key of FORGED_TRUST_QUERY_KEYS) {
    if (query[key] !== undefined) {
      throw new Error(`caller-supplied trust context is not allowed: ${key}`);
    }
  }
}

export function deriveServerPrincipal({ request = {}, provider, trustedTenantId, request_id = "request_unset" } = {}) {
  assertNoCallerSuppliedTrust(request);
  if (!provider || typeof provider.authenticateRequest !== "function") throw new TypeError("runtime auth provider is required");
  const auth = provider.authenticateRequest(request);
  if (!auth.ok) {
    return Object.freeze({ ok: false, effect: "deny", reason: auth.reason ?? "authentication_failed", status_code: 401 });
  }
  const membershipResult = resolveTenantMembership(auth.session, trustedTenantId);
  if (!membershipResult.ok) {
    return Object.freeze({ ok: false, effect: "deny", reason: membershipResult.reason, status_code: 403, tenant_id: trustedTenantId });
  }
  const roles = resolveRolesAndGroups(membershipResult.membership);
  return Object.freeze({
    ok: true,
    source: "server-derived",
    header_only_trust_allowed: false,
    user_id: auth.session.user_id,
    actor_id: auth.session.user_id,
    actor_type: "user",
    tenant_id: trustedTenantId,
    role_ids: roles.role_ids,
    group_ids: roles.group_ids,
    scopes: roles.scopes,
    assurance_level: auth.session.assurance_level,
    session_id: auth.session.session_id,
    request_id
  });
}
