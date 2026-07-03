import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createLocalDevAuthProvider, deriveServerPrincipal } from "../../../packages/runtime-auth/src/index.js";
import {
  MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
  MATTER_VAULT_REGISTERED_TENANT_ID,
  MATTER_VAULT_USER_REGISTRATION_SEED,
  findRegisteredAccountByEmail,
  findRegisteredAccountByUserId,
  registeredAccountPublicRef,
} from "./matter-vault-account-registry.js";
import {
  LAWOS_ROLE_REGISTRY_SOURCE,
  resolveLawosUserRoleAssignment,
} from "./lawos-role-registry.js";
import {
  HRX_STEP_UP_TOKEN_CONTRACT_REF,
  createHrxStepUpAuthority,
} from "./hrx-step-up-token.js";

export const AUTHORIZATION_HEADER = "authorization";
export const API_AUTH_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "api-auth",
  contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-01",
  contract_schema_version: "law-firm-os.api-auth-session.v0.1",
  endpoints: Object.freeze(["POST /api/auth/login", "GET /api/auth/session", "POST /api/auth/step-up"]),
  roster_source: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
  role_registry_source: LAWOS_ROLE_REGISTRY_SOURCE,
  step_up_contract_ref: HRX_STEP_UP_TOKEN_CONTRACT_REF,
  login_protection_contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-14",
  runtime_persistence: "signed_session_token",
  max_failed_logins_before_lock: 5,
  lock_response_status: 423,
  runtime_write_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

const TOKEN_PREFIX = "lawos_session_v1";
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_MAX_FAILED_LOGINS = 5;
const DEFAULT_LOGIN_LOCK_MS = 15 * 60 * 1000;
const DEFAULT_SESSION_SECRET = "lawos-local-wave1-session-secret";

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function decodeBase64UrlJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(secret, payloadPart) {
  return createHmac("sha256", secret).update(payloadPart, "utf8").digest("base64url");
}

function bearerToken(headers = {}) {
  const value = headers[AUTHORIZATION_HEADER] ?? headers[AUTHORIZATION_HEADER.toUpperCase()] ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(String(value));
  return match?.[1] ?? null;
}

function publicSession({ user, principal, expiresAt, roleAssignment }) {
  const account = registeredAccountPublicRef(user);
  const hrxScopes = roleAssignment?.hrx_scopes ?? [];
  return Object.freeze({
    state: "signed_in",
    mode: "api-signed-session",
    synthetic_only: true,
    tenant_id: principal.tenant_id,
    user_id: principal.user_id,
    email: account.email,
    display_name: account.display_name,
    highest_privilege: account.highest_privilege,
    privilege_rank: account.privilege_rank,
    role_profile_id: roleAssignment?.role_profile_id ?? null,
    role_registry_source: LAWOS_ROLE_REGISTRY_SOURCE,
    role_ids: principal.role_ids,
    group_ids: principal.group_ids,
    scopes: principal.scopes,
    hrx_scopes: Object.freeze([...hrxScopes]),
    assurance_level: principal.assurance_level,
    session_id: principal.session_id,
    session_principal_source: "api_signed_session",
    session_source_ref: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    expires_at: expiresAt,
    token_material_returned: false,
  });
}

function permissionContextFromPrincipal(principal) {
  return Object.freeze({
    principal: Object.freeze({
      ...principal,
      session_principal_source: "api_signed_session",
      session_source_ref: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    }),
    rules: Object.freeze([{ id: "api-session-internal-allow", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
}

function errorBody(requestId, safeErrorCode, reason) {
  return Object.freeze({
    request_id: requestId,
    outcome: "blocked",
    ok: false,
    reason,
    safe_error_codes: Object.freeze([safeErrorCode]),
    token_material_returned: false,
    production_ready_claim: false,
  });
}

function subjectsFromSeed(seed) {
  return seed.users.map((user) => {
    const roleAssignment = resolveLawosUserRoleAssignment(user, { tenantId: seed.tenant_id });
    return {
      synthetic_token: user.local_dev?.synthetic_token,
      session_id: `sess_${user.user_id}`,
      user_id: user.user_id,
      auth_subject: user.email,
      assurance_level: user.assurance_level ?? "password",
      tenant_memberships: [roleAssignment.tenant_membership],
    };
  });
}

function normalizeLoginKey(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function createApiSessionAuth({
  seed = MATTER_VAULT_USER_REGISTRATION_SEED,
  trustedTenantId = MATTER_VAULT_REGISTERED_TENANT_ID,
  ttlMs = Number(process.env.LAWOS_API_SESSION_TTL_MS || DEFAULT_TTL_MS),
  maxFailedLogins = Number(process.env.LAWOS_API_MAX_FAILED_LOGINS || DEFAULT_MAX_FAILED_LOGINS),
  loginLockMs = Number(process.env.LAWOS_API_LOGIN_LOCK_MS || DEFAULT_LOGIN_LOCK_MS),
  secret = process.env.LAWOS_API_SESSION_SECRET || DEFAULT_SESSION_SECRET,
  now = () => Date.now(),
  stepUpAuthority = createHrxStepUpAuthority(),
} = {}) {
  const provider = createLocalDevAuthProvider({ subjects: subjectsFromSeed(seed) });
  const failedLogins = new Map();

  function failedLoginState(email) {
    const key = normalizeLoginKey(email);
    const current = failedLogins.get(key);
    if (current?.locked_until > now()) return Object.freeze({ key, locked: true, locked_until: current.locked_until });
    if (current?.locked_until > 0 && current.locked_until <= now()) failedLogins.delete(key);
    return Object.freeze({ key, locked: false });
  }

  function recordFailedLogin(email) {
    const key = normalizeLoginKey(email);
    const current = failedLogins.get(key);
    const count = (current?.count ?? 0) + 1;
    const lockedUntil = count >= maxFailedLogins ? now() + loginLockMs : 0;
    failedLogins.set(key, { count, locked_until: lockedUntil });
    return Object.freeze({ count, locked: lockedUntil > 0, locked_until: lockedUntil });
  }

  function clearFailedLogin(email) {
    failedLogins.delete(normalizeLoginKey(email));
  }

  function createToken({ principal, user }) {
    const issuedAt = now();
    const expiresAtMs = issuedAt + ttlMs;
    const payload = {
      typ: TOKEN_PREFIX,
      sid: principal.session_id,
      jti: `sess_${randomUUID()}`,
      user_id: principal.user_id,
      tenant_id: principal.tenant_id,
      iat: issuedAt,
      exp: expiresAtMs,
    };
    const payloadPart = base64UrlJson(payload);
    const signature = sign(secret, payloadPart);
    return Object.freeze({
      token: `${TOKEN_PREFIX}.${payloadPart}.${signature}`,
      expires_at: new Date(expiresAtMs).toISOString(),
      session: publicSession({
        user,
        principal,
        expiresAt: new Date(expiresAtMs).toISOString(),
        roleAssignment: resolveLawosUserRoleAssignment(user, { tenantId: principal.tenant_id }),
      }),
    });
  }

  function verifyToken(token, { requestId = "req_unset" } = {}) {
    const parts = String(token ?? "").split(".");
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
    }
    const [, payloadPart, signature] = parts;
    const expectedSignature = sign(secret, payloadPart);
    if (!safeEqual(signature, expectedSignature)) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
    }

    let payload;
    try {
      payload = decodeBase64UrlJson(payloadPart);
    } catch {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
    }
    if (payload.typ !== TOKEN_PREFIX || payload.exp <= now()) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_EXPIRED", "auth_session_expired") });
    }
    if (payload.tenant_id !== trustedTenantId) {
      return Object.freeze({ ok: false, status: 403, body: errorBody(requestId, "AUTH_SESSION_TENANT_DENIED", "auth_session_tenant_denied") });
    }

    const user = findRegisteredAccountByUserId(payload.user_id, seed);
    if (!user) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_UNKNOWN_USER", "auth_session_unknown_user") });
    }
    const principal = deriveServerPrincipal({
      request: { headers: { authorization: `Bearer ${user.local_dev.synthetic_token}` } },
      provider,
      trustedTenantId,
      request_id: requestId,
    });
    if (!principal.ok) {
      return Object.freeze({ ok: false, status: principal.status_code ?? 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", principal.reason) });
    }
    return Object.freeze({
      ok: true,
      principal,
      context: permissionContextFromPrincipal(principal),
      session: publicSession({
        user,
        principal,
        expiresAt: new Date(payload.exp).toISOString(),
        roleAssignment: resolveLawosUserRoleAssignment(user, { tenantId: principal.tenant_id }),
      }),
    });
  }

  function login(body = {}, { requestId = "req_unset" } = {}) {
    const email = String(body.email ?? "").trim();
    const credential = String(body.password ?? body.credential ?? body.local_dev_token ?? "").trim();
    if (!email || !credential) {
      return Object.freeze({
        status: 400,
        body: errorBody(requestId, "AUTH_EMAIL_CREDENTIAL_REQUIRED", "email_credential_required"),
      });
    }
    const lock = failedLoginState(email);
    if (lock.locked) {
      return Object.freeze({
        status: 423,
        body: Object.freeze({
          ...errorBody(requestId, "AUTH_LOGIN_LOCKED", "auth_login_locked"),
          locked_until: new Date(lock.locked_until).toISOString(),
        }),
      });
    }

    const user = findRegisteredAccountByEmail(email, seed);
    if (!user) {
      recordFailedLogin(email);
      return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_CREDENTIAL_INVALID", "auth_credential_invalid") });
    }
    const principal = deriveServerPrincipal({
      request: { headers: { authorization: `Bearer ${credential}` } },
      provider,
      trustedTenantId,
      request_id: requestId,
    });
    if (!principal.ok || principal.user_id !== user.user_id) {
      recordFailedLogin(email);
      return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_CREDENTIAL_INVALID", "auth_credential_invalid") });
    }

    clearFailedLogin(email);
    const session = createToken({ principal, user });
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "passed",
        ok: true,
        token_type: "Bearer",
        session_token: session.token,
        expires_at: session.expires_at,
        session: session.session,
        roster_source: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
        local_dev_synthetic_only: true,
        production_ready_claim: false,
      }),
    });
  }

  function resolvePermissionContextFromHeaders(headers = {}, { requestId = "req_unset", requireSessionToken = false } = {}) {
    const token = bearerToken(headers);
    if (!token) return Object.freeze({ ok: false, authorization_present: false, reason: "missing_authorization" });
    if (!token.startsWith(`${TOKEN_PREFIX}.`)) {
      if (!requireSessionToken) return Object.freeze({ ok: false, authorization_present: false, reason: "non_session_bearer" });
      return Object.freeze({
        ok: false,
        authorization_present: true,
        status: 401,
        body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid"),
      });
    }
    const verified = verifyToken(token, { requestId });
    if (!verified.ok) return Object.freeze({ ...verified, authorization_present: true });
    return Object.freeze({ ...verified, authorization_present: true });
  }

  function handleAuthApiRequest({ pathname, method, body = {}, headers = {}, requestId = "req_unset" } = {}) {
    if (pathname === "/api/auth/login") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      return login(body, { requestId });
    }
    if (pathname === "/api/auth/session") {
      if (method !== "GET") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      const resolved = resolvePermissionContextFromHeaders(headers, { requestId, requireSessionToken: true });
      if (!resolved.ok) {
        return Object.freeze({
          status: resolved.status ?? 401,
          body: resolved.body ?? errorBody(requestId, "AUTH_SESSION_REQUIRED", "auth_session_required"),
        });
      }
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "passed",
          ok: true,
          session: resolved.session,
          production_ready_claim: false,
        }),
      });
    }
    if (pathname === "/api/auth/step-up") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      const resolved = resolvePermissionContextFromHeaders(headers, { requestId, requireSessionToken: true });
      if (!resolved.ok) {
        return Object.freeze({
          status: resolved.status ?? 401,
          body: resolved.body ?? errorBody(requestId, "AUTH_SESSION_REQUIRED", "auth_session_required"),
        });
      }
      return stepUpAuthority.issue({
        principal: resolved.principal,
        purpose: body.purpose,
        totp_code: body.totp_code ?? body.mfa_totp ?? body.code,
        requestId,
      });
    }
    return Object.freeze({ status: 404, body: errorBody(requestId, "AUTH_ROUTE_NOT_FOUND", "auth_route_not_found") });
  }

  return Object.freeze({
    login,
    verifyToken,
    resolvePermissionContextFromHeaders,
    handleAuthApiRequest,
  });
}
