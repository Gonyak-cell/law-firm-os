import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { appendNdjsonDurably } from "../../../packages/persistence/src/durable-append.js";
import {
  assertIdentityLedger,
  createLocalDevAuthProvider,
  deriveServerPrincipal,
  hashIdentityToken,
} from "../../../packages/runtime-auth/src/index.js";
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
import {
  LAWOS_RUNTIME_PROFILES,
  resolveRuntimeProfile,
  resolveSessionSecret,
} from "./runtime-profile.js";
import {
  LAWOS_AUTH_CREDENTIAL_STORE_ENV,
  LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
  createAuthCredentialStore,
  createScryptPasswordHash,
  verifyScryptPasswordHash,
} from "./auth-credential-store.js";
import {
  DEFAULT_PASSWORD_RESET_TTL_MS,
  LAWOS_AUTH_PASSWORD_RESET_STORE_ENV,
  createAuthPasswordResetStore,
} from "./auth-password-reset-store.js";

export const AUTHORIZATION_HEADER = "authorization";
export const API_AUTH_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "api-auth",
  contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-01",
  contract_schema_version: "law-firm-os.api-auth-session.v0.1",
  endpoints: Object.freeze([
    "POST /api/auth/login",
    "GET /api/auth/session",
    "POST /api/auth/logout",
    "POST /api/auth/step-up",
    "GET /api/auth/password-reset/open",
    "POST /api/auth/password-reset/request",
    "POST /api/auth/password-reset/confirm",
  ]),
  roster_source: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
  role_registry_source: LAWOS_ROLE_REGISTRY_SOURCE,
  step_up_contract_ref: HRX_STEP_UP_TOKEN_CONTRACT_REF,
  login_protection_contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-14",
  runtime_persistence: "signed_session_token",
  operational_auth_provider: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
  credential_store_env: LAWOS_AUTH_CREDENTIAL_STORE_ENV,
  password_reset_store_env: LAWOS_AUTH_PASSWORD_RESET_STORE_ENV,
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
const DEFAULT_PASSWORD_RESET_MIN_LENGTH = 12;
const LAWOS_RUNTIME_TENANT_IDS = Object.freeze([
  MATTER_VAULT_REGISTERED_TENANT_ID,
  "tenant_rp04_synthetic",
  "tenant_rp05_synthetic",
  "tenant_cmp_g6_synthetic",
  "tenant_cmp_g7_synthetic",
  "tenant_cmp_g8_synthetic",
  "tenant_cmp_g9_synthetic",
  "tenant_cmp_g10_synthetic",
  "tenant_cmp_g11_synthetic",
  "tenant_cmp_g12_synthetic",
  "tenant_sf_b_w06_synthetic",
  "tenant_sf_b_w07_synthetic",
  "tenant_outlook_addin_test",
  "tenant_upl_c09_c12_outlook",
  "matter-runtime-tenant",
]);

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

function tenantRefsForSession(tenantId) {
  return Object.freeze({
    default: tenantId,
    matter: tenantId,
    vault: tenantId,
    finance: tenantId,
    analytics: tenantId,
  });
}

function bearerToken(headers = {}) {
  const value = headers[AUTHORIZATION_HEADER] ?? headers[AUTHORIZATION_HEADER.toUpperCase()] ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(String(value));
  return match?.[1] ?? null;
}

function publicSession({ user, principal, expiresAt, roleAssignment }) {
  const account = registeredAccountPublicRef(user);
  const hrxScopes = roleAssignment?.hrx_scopes ?? [];
  const tenantIds = account.tenant_ids.length > 0 ? account.tenant_ids : Object.freeze([principal.tenant_id]);
  return Object.freeze({
    state: "signed_in",
    mode: "api-signed-session",
    synthetic_only: !tenantIds.includes(MATTER_VAULT_REGISTERED_TENANT_ID),
    tenant_id: principal.tenant_id,
    tenant_ids: Object.freeze([...tenantIds]),
    tenant_refs: tenantRefsForSession(principal.tenant_id),
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
    credential_rev: principal.credential_rev ?? null,
    credential_status: principal.credential_status ?? null,
    must_change_password: principal.must_change_password === true,
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
      tenant_ids:
        principal.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID
          ? LAWOS_RUNTIME_TENANT_IDS
          : Object.freeze([principal.tenant_id]),
      session_principal_source: "api_signed_session",
      session_source_ref: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    }),
    rules: Object.freeze([{ id: "api-session-internal-allow", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
}

function homeTenantIdForUser(user = {}, fallbackTenantId = MATTER_VAULT_REGISTERED_TENANT_ID) {
  return user?.tenant_memberships?.[0]?.tenant_id ?? fallbackTenantId;
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

function securityAdminDenied(requestId) {
  return Object.freeze({
    status: 403,
    body: Object.freeze({
      ...errorBody(requestId, "ADMIN_SECURITY_PERMISSION_DENIED", "admin_security_permission_denied"),
      outcome: "denied",
    }),
  });
}

function subjectsFromSeed(seed, { trustedTenantId = seed.tenant_id } = {}) {
  return seed.users.map((user) => {
    const homeTenantId = homeTenantIdForUser(user, trustedTenantId);
    const roleAssignment = resolveLawosUserRoleAssignment(user, { tenantId: homeTenantId });
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

function createPasswordResetToken(tenantId = null) {
  const material = randomBytes(32).toString("base64url");
  return tenantId ? `${base64UrlEncode(tenantId)}.${material}` : material;
}

function passwordResetTokenTenantId(token, fallbackTenantId) {
  const [encodedTenant, material] = String(token ?? "").split(".");
  if (!encodedTenant || !material) return fallbackTenantId;
  try {
    const tenantId = Buffer.from(encodedTenant, "base64url").toString("utf8").trim();
    return tenantId || fallbackTenantId;
  } catch {
    return fallbackTenantId;
  }
}

function parseSecurityAuditEvent(line) {
  try {
    const value = JSON.parse(line);
    if (!value || typeof value !== "object") return null;
    const { __lawos_append: _metadata, ...event } = value;
    return Object.freeze(event);
  } catch {
    return null;
  }
}

function createSecurityAuditEventStore({ filePath } = {}) {
  const memoryEvents = [];

  function readEvents() {
    if (!filePath) return Object.freeze([...memoryEvents]);
    if (!existsSync(filePath)) return Object.freeze([]);
    return Object.freeze(
      readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map(parseSecurityAuditEvent)
        .filter(Boolean)
        .reverse(),
    );
  }

  function append(event) {
    if (!filePath) {
      memoryEvents.unshift(event);
      return event;
    }
    appendNdjsonDurably({ filePath, value: event });
    return event;
  }

  return Object.freeze({ append, readEvents });
}

function principalFromSignedSession({ user, payload = {}, trustedTenantId, requestId, credential = null }) {
  const roleAssignment = resolveLawosUserRoleAssignment(user, { tenantId: trustedTenantId });
  const membership = roleAssignment.tenant_membership ?? {};
  return Object.freeze({
    ok: true,
    source: "api-signed-session",
    header_only_trust_allowed: false,
    user_id: user.user_id,
    actor_id: user.user_id,
    actor_type: "user",
    tenant_id: trustedTenantId,
    role_ids: Object.freeze([...(membership.role_ids ?? roleAssignment.role_ids ?? [])]),
    group_ids: Object.freeze([...(membership.group_ids ?? roleAssignment.group_ids ?? [])]),
    scopes: Object.freeze([...(membership.scopes ?? roleAssignment.scopes ?? [])]),
    assurance_level: user.assurance_level ?? "password",
    session_id: payload.sid ?? `sess_${user.user_id}`,
    credential_rev: credential?.credential_rev ?? payload.credential_rev ?? null,
    credential_status: credential?.credential_status ?? null,
    must_change_password: credential?.must_change_password === true,
    request_id: requestId,
  });
}

export function createApiSessionAuth({
  seed = MATTER_VAULT_USER_REGISTRATION_SEED,
  trustedTenantId = MATTER_VAULT_REGISTERED_TENANT_ID,
  profile = resolveRuntimeProfile(),
  ttlMs = Number(process.env.LAWOS_API_SESSION_TTL_MS || DEFAULT_TTL_MS),
  maxFailedLogins = Number(process.env.LAWOS_API_MAX_FAILED_LOGINS || DEFAULT_MAX_FAILED_LOGINS),
  loginLockMs = Number(process.env.LAWOS_API_LOGIN_LOCK_MS || DEFAULT_LOGIN_LOCK_MS),
  secret,
  securityAuditStorePath = process.env.LAWOS_AUDIT_STORE_PATH,
  credentialStorePath = process.env[LAWOS_AUTH_CREDENTIAL_STORE_ENV],
  credentialStore,
  passwordResetTokenStorePath = process.env[LAWOS_AUTH_PASSWORD_RESET_STORE_ENV],
  passwordResetTokenStore,
  passwordResetEmailDelivery,
  passwordResetTtlMs = Number(process.env.LAWOS_AUTH_PASSWORD_RESET_TTL_MS || DEFAULT_PASSWORD_RESET_TTL_MS),
  passwordResetMinLength = Number(process.env.LAWOS_AUTH_PASSWORD_RESET_MIN_LENGTH || DEFAULT_PASSWORD_RESET_MIN_LENGTH),
  now = () => Date.now(),
  stepUpAuthority = null,
  stepUpProvider = null,
  identityRepository = null,
} = {}) {
  const runtimeProfile = resolveRuntimeProfile({ LAWOS_RUNTIME_PROFILE: profile });
  const sessionSecret = resolveSessionSecret({ profile: runtimeProfile, explicitSecret: secret });
  const syntheticLoginEnabled = runtimeProfile !== LAWOS_RUNTIME_PROFILES.operational;
  const provider = syntheticLoginEnabled
    ? createLocalDevAuthProvider({ subjects: subjectsFromSeed(seed, { trustedTenantId }) })
    : null;
  const centralIdentityRepository = identityRepository ? assertIdentityLedger(identityRepository) : null;
  if (!syntheticLoginEnabled && !centralIdentityRepository && !credentialStore && !credentialStorePath) {
    const error = new Error(`${LAWOS_AUTH_CREDENTIAL_STORE_ENV} is required for operational runtime profile`);
    error.code = "LAWOS_AUTH_CREDENTIAL_STORE_REQUIRED";
    error.exitCode = 78;
    throw error;
  }
  if (!syntheticLoginEnabled && !centralIdentityRepository && !passwordResetTokenStore && !passwordResetTokenStorePath) {
    const error = new Error(`${LAWOS_AUTH_PASSWORD_RESET_STORE_ENV} is required for operational runtime profile`);
    error.code = "LAWOS_AUTH_PASSWORD_RESET_STORE_REQUIRED";
    error.exitCode = 78;
    throw error;
  }
  if (centralIdentityRepository && syntheticLoginEnabled) {
    throw new TypeError("central identity repository requires the operational runtime profile");
  }
  let resolvedStepUpAuthority = stepUpAuthority;
  function stepUpTokenAuthority() {
    resolvedStepUpAuthority ??= createHrxStepUpAuthority({ profile: runtimeProfile });
    return resolvedStepUpAuthority;
  }
  const operationalCredentialStore = centralIdentityRepository ? null : credentialStore ?? createAuthCredentialStore({ filePath: credentialStorePath, now });
  const operationalPasswordResetStore = centralIdentityRepository ? null : passwordResetTokenStore ?? createAuthPasswordResetStore({ filePath: passwordResetTokenStorePath, now });
  const failedLogins = new Map();
  const accountStatusByUserId = new Map(seed.users.map((user) => [
    user.user_id,
    user.status === "disabled" || (!syntheticLoginEnabled && user.production_status === "disabled") ? "disabled" : "active",
  ]));
  const breakGlassRequests = new Map();
  const revokedSessionJtis = new Set();
  const securityAuditStore = createSecurityAuditEventStore({ filePath: securityAuditStorePath });

  function identitySeed(user = {}) {
    const disabled = user.status === "disabled" || (!syntheticLoginEnabled && user.production_status === "disabled");
    return Object.freeze({
      user_id: user.user_id,
      email: user.email,
      status: disabled ? "disabled" : "active",
      account_status: disabled ? "disabled" : "active",
    });
  }

  async function centralAccount(user) {
    if (!centralIdentityRepository) return null;
    return centralIdentityRepository.ensureAccount({ tenant_id: homeTenantIdForUser(user, trustedTenantId), user: identitySeed(user) });
  }

  async function accountStatus(userOrUserId) {
    const user = typeof userOrUserId === "string" ? findRegisteredAccountByUserId(userOrUserId, seed) : userOrUserId;
    const userId = typeof userOrUserId === "string" ? userOrUserId : user?.user_id;
    if (centralIdentityRepository && user) return (await centralAccount(user))?.account_status ?? "active";
    return accountStatusByUserId.get(userId) ?? "active";
  }

  async function disabledAccountBody(requestId, user) {
    return Object.freeze({
      ...errorBody(requestId, "AUTH_ACCOUNT_DISABLED", "auth_account_disabled"),
      account_status: await accountStatus(user),
      user_id: user?.user_id ?? null,
    });
  }

  function hasSecurityAdminScope(context) {
    const principal = context?.principal ?? {};
    const scopes = new Set(principal.scopes ?? []);
    const roleIds = new Set(principal.role_ids ?? []);
    return scopes.has("security.admin") || scopes.has("tenant.admin") || roleIds.has("security_admin") || roleIds.has("system_super_admin") || roleIds.has("lawos_admin");
  }

  function securityActorId(context) {
    return context?.principal?.user_id ?? "api_security_admin";
  }

  async function appendSecurityAudit({ action, object_id, context, details = {} }) {
    if (centralIdentityRepository) {
      return centralIdentityRepository.appendSecurityAudit({
        tenant_id: context?.principal?.tenant_id ?? trustedTenantId,
        action,
        object_id,
        actor_id: securityActorId(context),
        details,
      });
    }
    const event = Object.freeze({
      audit_event_id: `security_audit_${randomUUID()}`,
      action,
      object_id,
      actor_id: securityActorId(context),
      occurred_at: new Date(now()).toISOString(),
      details: Object.freeze({ ...details }),
      token_material_returned: false,
      production_ready_claim: false,
    });
    securityAuditStore.append(event);
    return event;
  }

  async function publicSecurityUser(user) {
    const roleAssignment = resolveLawosUserRoleAssignment(user, { tenantId: trustedTenantId });
    const centralAccountState = centralIdentityRepository ? await centralAccount(user) : null;
    const status = centralAccountState?.account_status ?? accountStatusByUserId.get(user.user_id) ?? "active";
    const credentialStatus = centralAccountState?.credential_status ?? null;
    return Object.freeze({
      user_id: user.user_id,
      email: user.email,
      display_name: user.display_name,
      source_title: user.source_title,
      status,
      credential_status: credentialStatus,
      highest_privilege: user.highest_privilege === true,
      role_profile_id: roleAssignment?.role_profile_id ?? null,
      role_ids: Object.freeze([...(roleAssignment?.role_ids ?? user.role_ids ?? [])]),
      group_ids: Object.freeze([...(roleAssignment?.group_ids ?? user.group_ids ?? [])]),
      scopes: Object.freeze([...(roleAssignment?.scopes ?? user.scopes ?? [])]),
      login_allowed: status === "active" && (!credentialStatus || ["active", "must_change"].includes(credentialStatus)),
      token_material_returned: false,
      production_ready_claim: false,
    });
  }

  function publicBreakGlassRequest(request) {
    return Object.freeze({ ...request, token_material_returned: false, production_ready_claim: false });
  }

  async function failedLoginState(email, user = findRegisteredAccountByEmail(email, seed)) {
    const key = normalizeLoginKey(email);
    if (centralIdentityRepository && user) {
      const account = await centralAccount(user);
      const lockedUntil = account?.locked_until ? Date.parse(account.locked_until) : 0;
      return Object.freeze({ key, locked: lockedUntil > now(), locked_until: lockedUntil || 0 });
    }
    const current = failedLogins.get(key);
    if (current?.locked_until > now()) return Object.freeze({ key, locked: true, locked_until: current.locked_until });
    if (current?.locked_until > 0 && current.locked_until <= now()) failedLogins.delete(key);
    return Object.freeze({ key, locked: false });
  }

  async function recordFailedLogin(email, user = findRegisteredAccountByEmail(email, seed)) {
    const key = normalizeLoginKey(email);
    if (centralIdentityRepository && user) {
      return centralIdentityRepository.recordLoginFailure({
        tenant_id: homeTenantIdForUser(user, trustedTenantId),
        user: identitySeed(user),
        max_failed_logins: maxFailedLogins,
        lock_ms: loginLockMs,
      });
    }
    const current = failedLogins.get(key);
    const count = (current?.count ?? 0) + 1;
    const lockedUntil = count >= maxFailedLogins ? now() + loginLockMs : 0;
    failedLogins.set(key, { count, locked_until: lockedUntil });
    await appendSecurityAudit({
      action: lockedUntil ? "auth.login.locked" : "auth.login.failed",
      object_id: user?.user_id ?? `unknown_${createHash("sha256").update(key).digest("hex")}`,
      context: { principal: { tenant_id: homeTenantIdForUser(user, trustedTenantId), user_id: user?.user_id ?? "unknown_login_subject" } },
      details: { failed_login_count: count, locked: lockedUntil > 0 },
    });
    return Object.freeze({ count, locked: lockedUntil > 0, locked_until: lockedUntil });
  }

  async function clearFailedLogin(email) {
    if (centralIdentityRepository) return;
    failedLogins.delete(normalizeLoginKey(email));
  }

  async function verifyOperationalPassword(user, password) {
    if (!centralIdentityRepository) return operationalCredentialStore.verifyPassword({ user, password });
    const record = await centralAccount(user);
    if (!record) return Object.freeze({ ok: false, reason: "credential_missing", safe_error_code: "AUTH_CREDENTIAL_MISSING" });
    if (record.account_status === "disabled" || record.credential_status === "disabled") {
      return Object.freeze({ ok: false, reason: "credential_disabled", safe_error_code: "AUTH_CREDENTIAL_DISABLED", status: 403 });
    }
    if (record.credential_status === "reset_required") {
      return Object.freeze({ ok: false, reason: "password_reset_required", safe_error_code: "AUTH_PASSWORD_RESET_REQUIRED", status: 403 });
    }
    if (record.credential_status === "locked" && (!record.locked_until || Date.parse(record.locked_until) > now())) {
      return Object.freeze({ ok: false, reason: "credential_locked", safe_error_code: "AUTH_CREDENTIAL_LOCKED", status: 423 });
    }
    if (!verifyScryptPasswordHash(record.password_hash, password)) {
      return Object.freeze({ ok: false, reason: "credential_invalid", safe_error_code: "AUTH_CREDENTIAL_INVALID", status: 401 });
    }
    return Object.freeze({
      ok: true,
      credential_rev: record.credential_rev,
      credential_status: record.credential_status,
      must_change_password: record.credential_status === "must_change",
    });
  }

  async function validateOperationalSession(user, credentialRev) {
    if (!centralIdentityRepository) return operationalCredentialStore.validateSessionCredential({ user, credentialRev });
    const record = await centralAccount(user);
    if (!record || Number(credentialRev) !== record.credential_rev) {
      return Object.freeze({ ok: false, reason: "credential_revision_mismatch", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
    }
    if (record.account_status !== "active" || ["disabled", "reset_required", "locked"].includes(record.credential_status)) {
      return Object.freeze({ ok: false, reason: "credential_inactive", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
    }
    return Object.freeze({ ok: true, credential_rev: record.credential_rev, credential_status: record.credential_status, must_change_password: record.credential_status === "must_change" });
  }

  async function requireOperationalPasswordReset(user) {
    if (!centralIdentityRepository) return operationalCredentialStore.requirePasswordReset({ user });
    return centralIdentityRepository.requirePasswordReset({
      tenant_id: homeTenantIdForUser(user, trustedTenantId),
      user: identitySeed(user),
      actor_id: user.user_id,
    });
  }

  async function setOperationalPassword(user, password, { status = "active", auditAction = "auth.password_reset.confirmed" } = {}) {
    if (!centralIdentityRepository) return operationalCredentialStore.setPassword({ user, password, status });
    return centralIdentityRepository.setCredential({
      tenant_id: homeTenantIdForUser(user, trustedTenantId),
      user: identitySeed(user),
      provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
      password_hash: createScryptPasswordHash(password),
      status,
      actor_id: user.user_id,
      audit_action: auditAction,
    });
  }

  function passwordResetDeliveryConfigured() {
    return typeof passwordResetEmailDelivery === "function";
  }

  function publicPasswordResetDelivery(delivery = {}) {
    return Object.freeze({
      mode: delivery.mode ?? "email",
      provider: delivery.provider ?? "unconfigured",
      status: delivery.status ?? "not_configured",
      message_id: delivery.message_id ?? null,
      token_material_returned: false,
      reset_url_returned: false,
    });
  }

  async function requestPasswordReset(body = {}, { requestId = "req_unset" } = {}) {
    if (syntheticLoginEnabled) {
      return Object.freeze({
        status: 403,
        body: errorBody(requestId, "AUTH_PASSWORD_RESET_OPERATIONAL_REQUIRED", "password_reset_operational_required"),
      });
    }
    const email = String(body.email ?? "").trim();
    if (!email) {
      return Object.freeze({ status: 400, body: errorBody(requestId, "AUTH_PASSWORD_RESET_EMAIL_REQUIRED", "password_reset_email_required") });
    }
    const user = findRegisteredAccountByEmail(email, seed);
    if (!user) {
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "accepted",
          ok: true,
          accepted: true,
          email_delivery: publicPasswordResetDelivery({ status: "not_sent_unknown_account" }),
          token_material_returned: false,
          production_ready_claim: false,
        }),
      });
    }
    if (await accountStatus(user) !== "active") {
      return Object.freeze({ status: 403, body: await disabledAccountBody(requestId, user) });
    }
    if (!passwordResetDeliveryConfigured()) {
      return Object.freeze({
        status: 503,
        body: errorBody(requestId, "AUTH_PASSWORD_RESET_EMAIL_NOT_CONFIGURED", "password_reset_email_not_configured"),
      });
    }
    const token = createPasswordResetToken(centralIdentityRepository ? homeTenantIdForUser(user, trustedTenantId) : null);
    const resetRecord = centralIdentityRepository
      ? await centralIdentityRepository.createChallenge({
          tenant_id: homeTenantIdForUser(user, trustedTenantId),
          user: identitySeed(user),
          challenge_type: "password_reset",
          challenge_hash: hashIdentityToken(token),
          requested_at: now(),
          expires_at: now() + passwordResetTtlMs,
          actor_id: user.user_id,
        })
      : operationalPasswordResetStore.create({ user, token, ttlMs: passwordResetTtlMs });
    if (!centralIdentityRepository) {
      await appendSecurityAudit({
        action: "auth.password_reset.requested",
        object_id: user.user_id,
        context: { principal: { tenant_id: homeTenantIdForUser(user, trustedTenantId), user_id: user.user_id } },
        details: { expires_at: resetRecord.expires_at },
      });
    }
    let delivery;
    try {
      delivery = await passwordResetEmailDelivery({
        to: user.email,
        user,
        token,
        expires_at: resetRecord.expires_at,
        request_id: requestId,
      });
    } catch {
      delivery = Object.freeze({
        mode: "email",
        provider: "configured",
        status: "failed",
        message_id: null,
        reason: "password_reset_email_delivery_exception",
        token_material_returned: false,
        reset_url_returned: false,
      });
    }
    if (delivery?.status === "failed") {
      if (centralIdentityRepository) {
        await centralIdentityRepository.revokeChallengesForUser({
          tenant_id: homeTenantIdForUser(user, trustedTenantId),
          user_id: user.user_id,
          challenge_type: "password_reset",
          reason: "reset_delivery_failed",
          actor_id: user.user_id,
        });
      } else {
        operationalPasswordResetStore.revokeForUser({ userId: user.user_id, reason: "reset_delivery_failed" });
      }
    } else {
      await requireOperationalPasswordReset(user);
    }
    return Object.freeze({
      status: delivery?.status === "failed" ? 502 : 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: delivery?.status === "failed" ? "blocked" : "accepted",
        ok: delivery?.status !== "failed",
        accepted: delivery?.status !== "failed",
        email_delivery: publicPasswordResetDelivery(delivery),
        token_material_returned: false,
        production_ready_claim: false,
      }),
    });
  }

  async function confirmPasswordReset(body = {}, { requestId = "req_unset" } = {}) {
    if (syntheticLoginEnabled) {
      return Object.freeze({
        status: 403,
        body: errorBody(requestId, "AUTH_PASSWORD_RESET_OPERATIONAL_REQUIRED", "password_reset_operational_required"),
      });
    }
    const token = String(body.token ?? body.reset_token ?? "").trim();
    const password = String(body.password ?? body.new_password ?? "");
    if (!token) return Object.freeze({ status: 400, body: errorBody(requestId, "AUTH_PASSWORD_RESET_TOKEN_REQUIRED", "password_reset_token_required") });
    if (password.length < passwordResetMinLength) {
      return Object.freeze({
        status: 400,
        body: Object.freeze({
          ...errorBody(requestId, "AUTH_PASSWORD_TOO_SHORT", "password_too_short"),
          minimum_length: passwordResetMinLength,
        }),
      });
    }
    const consumed = centralIdentityRepository
      ? await centralIdentityRepository.consumeChallenge({
          tenant_id: passwordResetTokenTenantId(token, trustedTenantId),
          challenge_type: "password_reset",
          challenge_hash: hashIdentityToken(token),
        })
      : operationalPasswordResetStore.consume({ token });
    if (!consumed.ok) {
      const safeErrorCode = centralIdentityRepository
        ? ({ AUTH_CHALLENGE_USED: "AUTH_PASSWORD_RESET_TOKEN_USED", AUTH_CHALLENGE_EXPIRED: "AUTH_PASSWORD_RESET_TOKEN_EXPIRED" }[consumed.safe_error_code] ?? "AUTH_PASSWORD_RESET_TOKEN_INVALID")
        : consumed.safe_error_code;
      return Object.freeze({ status: consumed.status ?? 401, body: errorBody(requestId, safeErrorCode, consumed.reason) });
    }
    const user = findRegisteredAccountByUserId(consumed.record.user_id, seed);
    if (!user || normalizeLoginKey(user.email) !== consumed.record.email) {
      return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_PASSWORD_RESET_TOKEN_INVALID", "invalid_reset_token") });
    }
    if (await accountStatus(user) !== "active") {
      return Object.freeze({ status: 403, body: await disabledAccountBody(requestId, user) });
    }
    const credential = await setOperationalPassword(user, password);
    await clearFailedLogin(user.email);
    if (!centralIdentityRepository) {
      await appendSecurityAudit({
        action: "auth.password_reset.confirmed",
        object_id: user.user_id,
        context: { principal: { tenant_id: homeTenantIdForUser(user, trustedTenantId), user_id: user.user_id } },
        details: { credential_rev: credential.credential_rev },
      });
    }
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "accepted",
        ok: true,
        accepted: true,
        activated: true,
        credential_rev: credential.credential_rev,
        token_material_returned: false,
        production_ready_claim: false,
      }),
    });
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
    if (Number.isInteger(principal.credential_rev)) payload.credential_rev = principal.credential_rev;
    const payloadPart = base64UrlJson(payload);
    const signature = sign(sessionSecret, payloadPart);
    return Object.freeze({
      token: `${TOKEN_PREFIX}.${payloadPart}.${signature}`,
      expires_at: new Date(expiresAtMs).toISOString(),
      payload: Object.freeze({ ...payload }),
      session: publicSession({
        user,
        principal,
        expiresAt: new Date(expiresAtMs).toISOString(),
        roleAssignment: resolveLawosUserRoleAssignment(user, { tenantId: principal.tenant_id }),
      }),
    });
  }

  async function verifyToken(token, { requestId = "req_unset" } = {}) {
    const parts = String(token ?? "").split(".");
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
    }
    const [, payloadPart, signature] = parts;
    const expectedSignature = sign(sessionSecret, payloadPart);
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
    if (!centralIdentityRepository && revokedSessionJtis.has(payload.jti)) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_REVOKED", "auth_session_revoked") });
    }
    const user = findRegisteredAccountByUserId(payload.user_id, seed);
    if (!user) {
      return Object.freeze({ ok: false, status: 401, body: errorBody(requestId, "AUTH_SESSION_UNKNOWN_USER", "auth_session_unknown_user") });
    }
    const homeTenantId = homeTenantIdForUser(user, trustedTenantId);
    if (payload.tenant_id !== homeTenantId) {
      return Object.freeze({ ok: false, status: 403, body: errorBody(requestId, "AUTH_SESSION_TENANT_DENIED", "auth_session_tenant_denied") });
    }
    if (await accountStatus(user) !== "active") {
      return Object.freeze({ ok: false, status: 403, body: await disabledAccountBody(requestId, user) });
    }
    const credential = syntheticLoginEnabled
      ? null
      : await validateOperationalSession(user, payload.credential_rev);
    if (credential && !credential.ok) {
      return Object.freeze({ ok: false, status: credential.status ?? 401, body: errorBody(requestId, credential.safe_error_code, credential.reason) });
    }
    const principal = provider
      ? deriveServerPrincipal({
          request: { headers: { authorization: `Bearer ${user.local_dev.synthetic_token}` } },
          provider,
          trustedTenantId: homeTenantId,
          request_id: requestId,
        })
      : principalFromSignedSession({ user, payload, trustedTenantId: homeTenantId, requestId, credential });
    if (!principal.ok) return Object.freeze({ ok: false, status: principal.status_code ?? 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", principal.reason) });
    if (centralIdentityRepository) {
      const active = await centralIdentityRepository.validateSession({
        tenant_id: homeTenantId,
        session_jti: payload.jti,
        user_id: user.user_id,
      });
      if (!active.ok) {
        return Object.freeze({ ok: false, status: active.status ?? 401, body: errorBody(requestId, active.safe_error_code ?? "AUTH_SESSION_REVOKED", active.reason ?? "auth_session_revoked") });
      }
    }
    return Object.freeze({
      ok: true,
      principal,
      token_payload: Object.freeze({ jti: payload.jti, user_id: payload.user_id, tenant_id: payload.tenant_id, exp: payload.exp }),
      context: permissionContextFromPrincipal(principal),
      session: publicSession({
        user,
        principal,
        expiresAt: new Date(payload.exp).toISOString(),
        roleAssignment: resolveLawosUserRoleAssignment(user, { tenantId: principal.tenant_id }),
      }),
    });
  }

  async function login(body = {}, { requestId = "req_unset" } = {}) {
    const email = String(body.email ?? "").trim();
    const credential = String(body.password ?? body.credential ?? body.local_dev_token ?? "").trim();
    if (!email || !credential) {
      return Object.freeze({
        status: 400,
        body: errorBody(requestId, "AUTH_EMAIL_CREDENTIAL_REQUIRED", "email_credential_required"),
      });
    }
    const user = findRegisteredAccountByEmail(email, seed);
    const lock = await failedLoginState(email, user);
    if (lock.locked) {
      return Object.freeze({
        status: 423,
        body: Object.freeze({
          ...errorBody(requestId, "AUTH_LOGIN_LOCKED", "auth_login_locked"),
          locked_until: new Date(lock.locked_until).toISOString(),
        }),
      });
    }

    if (!user) {
      await recordFailedLogin(email, null);
      return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_CREDENTIAL_INVALID", "auth_credential_invalid") });
    }
    if (await accountStatus(user) !== "active") {
      return Object.freeze({ status: 403, body: await disabledAccountBody(requestId, user) });
    }
    const homeTenantId = homeTenantIdForUser(user, trustedTenantId);
    let principal;
    let credentialResult = null;
    if (syntheticLoginEnabled) {
      principal = deriveServerPrincipal({
        request: { headers: { authorization: `Bearer ${credential}` } },
        provider,
        trustedTenantId: homeTenantId,
        request_id: requestId,
      });
    } else {
      if (safeEqual(credential, user.local_dev?.synthetic_token ?? "")) {
        await recordFailedLogin(email, user);
        return Object.freeze({
          status: 403,
          body: errorBody(requestId, "AUTH_SYNTHETIC_LOGIN_DISABLED", "auth_synthetic_login_disabled"),
        });
      }
      credentialResult = await verifyOperationalPassword(user, credential);
      if (!credentialResult.ok) {
        await recordFailedLogin(email, user);
        return Object.freeze({
          status: credentialResult.status ?? 401,
          body: errorBody(requestId, credentialResult.safe_error_code ?? "AUTH_CREDENTIAL_INVALID", credentialResult.reason ?? "auth_credential_invalid"),
        });
      }
      principal = principalFromSignedSession({
        user,
        payload: { sid: `sess_${user.user_id}`, credential_rev: credentialResult.credential_rev },
        trustedTenantId: homeTenantId,
        requestId,
        credential: credentialResult,
      });
    }
    if (!principal.ok || principal.user_id !== user.user_id) {
      await recordFailedLogin(email, user);
      return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_CREDENTIAL_INVALID", "auth_credential_invalid") });
    }

    const session = createToken({ principal, user });
    if (centralIdentityRepository) {
      const committed = await centralIdentityRepository.completeLogin({
        tenant_id: homeTenantId,
        user: identitySeed(user),
        session_jti: session.payload.jti,
        session_id: session.payload.sid,
        credential_rev: session.payload.credential_rev ?? null,
        issued_at: session.payload.iat,
        expires_at: session.payload.exp,
      });
      if (!committed.ok) {
        return Object.freeze({
          status: committed.status ?? 401,
          body: Object.freeze({
            ...errorBody(requestId, committed.safe_error_code ?? "AUTH_CREDENTIAL_INVALID", committed.reason ?? "auth_credential_invalid"),
            ...(committed.locked_until ? { locked_until: committed.locked_until } : {}),
          }),
        });
      }
    } else {
      await clearFailedLogin(email);
      await appendSecurityAudit({
        action: "auth.login.succeeded",
        object_id: user.user_id,
        context: { principal: { tenant_id: homeTenantId, user_id: user.user_id } },
        details: { session_registered: false, authority: "file-current" },
      });
    }
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
        credential_provider: syntheticLoginEnabled ? "local-dev-synthetic-provider" : LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
        local_dev_synthetic_only: syntheticLoginEnabled,
        must_change_password: credentialResult?.must_change_password === true,
        production_ready_claim: false,
      }),
    });
  }

  async function resolvePermissionContextFromHeaders(headers = {}, { requestId = "req_unset", requireSessionToken = false } = {}) {
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
    const verified = await verifyToken(token, { requestId });
    if (!verified.ok) return Object.freeze({ ...verified, authorization_present: true });
    return Object.freeze({ ...verified, authorization_present: true });
  }

  async function handleAuthApiRequest({ pathname, method, body = {}, headers = {}, requestId = "req_unset" } = {}) {
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
      const resolved = await resolvePermissionContextFromHeaders(headers, { requestId, requireSessionToken: true });
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
    if (pathname === "/api/auth/logout") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      const token = bearerToken(headers);
      if (!token) return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_SESSION_REQUIRED", "auth_session_required") });
      const parts = String(token).split(".");
      if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX || !safeEqual(parts[2], sign(sessionSecret, parts[1]))) {
        return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
      }
      let payload;
      try {
        payload = decodeBase64UrlJson(parts[1]);
      } catch {
        return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
      }
      const user = findRegisteredAccountByUserId(payload.user_id, seed);
      const tenantId = user ? homeTenantIdForUser(user, trustedTenantId) : null;
      if (payload.typ !== TOKEN_PREFIX || !user || payload.tenant_id !== tenantId || !payload.jti) {
        return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_SESSION_INVALID", "auth_session_invalid") });
      }
      let revocation;
      if (centralIdentityRepository) {
        revocation = await centralIdentityRepository.revokeSession({
          tenant_id: tenantId,
          session_jti: payload.jti,
          actor_id: user.user_id,
          reason: "logout",
        });
      } else {
        const replayed = revokedSessionJtis.has(payload.jti);
        revokedSessionJtis.add(payload.jti);
        if (!replayed) {
          await appendSecurityAudit({
            action: "auth.logout",
            object_id: user.user_id,
            context: { principal: { tenant_id: tenantId, user_id: user.user_id } },
            details: { session_revoked: true, authority: "file-current" },
          });
        }
        revocation = Object.freeze({ ok: true, replayed });
      }
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "signed_out",
          ok: true,
          revoked: true,
          replayed: revocation.replayed === true,
          token_material_returned: false,
          production_ready_claim: false,
        }),
      });
    }
    if (pathname === "/api/auth/step-up") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      const resolved = await resolvePermissionContextFromHeaders(headers, { requestId, requireSessionToken: true });
      if (!resolved.ok) {
        return Object.freeze({
          status: resolved.status ?? 401,
          body: resolved.body ?? errorBody(requestId, "AUTH_SESSION_REQUIRED", "auth_session_required"),
        });
      }
      const proof = body.totp_code ?? body.mfa_totp ?? body.code ?? body.proof;
      let verification = null;
      let issued;
      if (stepUpProvider) {
        verification = await stepUpProvider.verify({
          principal: resolved.principal,
          purpose: body.purpose,
          factor: body.factor ?? "totp",
          proof,
        });
        if (!verification.ok) {
          await appendSecurityAudit({
            action: "auth.step_up.failed",
            object_id: resolved.principal.user_id,
            context: resolved.context,
            details: { provider_id: verification.provider_id, factor: verification.factor, purpose: body.purpose ?? null, reason: verification.reason },
          });
          return Object.freeze({ status: 403, body: errorBody(requestId, "HRX_STEP_UP_PROVIDER_INVALID", verification.reason) });
        }
        issued = stepUpTokenAuthority().issueVerified({
          principal: resolved.principal,
          purpose: body.purpose,
          provider_verification: verification,
          requestId,
        });
      } else {
        issued = stepUpTokenAuthority().issue({
          principal: resolved.principal,
          purpose: body.purpose,
          totp_code: proof,
          requestId,
        });
      }
      if (issued.status !== 200) {
        await appendSecurityAudit({
          action: "auth.step_up.failed",
          object_id: resolved.principal.user_id,
          context: resolved.context,
          details: { provider_id: verification?.provider_id ?? "internal-totp", factor: verification?.factor ?? "totp", purpose: body.purpose ?? null, reason: issued.body?.reason ?? "step_up_failed" },
        });
        return issued;
      }
      const stepUpUser = findRegisteredAccountByUserId(resolved.principal.user_id, seed);
      if (centralIdentityRepository && stepUpUser) {
        await centralIdentityRepository.createChallenge({
          tenant_id: resolved.principal.tenant_id,
          user: identitySeed(stepUpUser),
          challenge_type: "step_up",
          challenge_hash: hashIdentityToken(issued.body.step_up_token),
          purpose: body.purpose,
          provider_id: verification?.provider_id ?? "internal-totp",
          requested_at: now(),
          expires_at: issued.body.expires_at,
          actor_id: resolved.principal.user_id,
          metadata: { factor: verification?.factor ?? "totp" },
        });
      } else {
        await appendSecurityAudit({
          action: "auth.step_up.succeeded",
          object_id: resolved.principal.user_id,
          context: resolved.context,
          details: { provider_id: verification?.provider_id ?? "internal-totp", factor: verification?.factor ?? "totp", purpose: body.purpose ?? null },
        });
      }
      return issued;
    }
    if (pathname === "/api/auth/password-reset/request") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      return requestPasswordReset(body, { requestId });
    }
    if (pathname === "/api/auth/password-reset/confirm") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      return confirmPasswordReset(body, { requestId });
    }
    return Object.freeze({ status: 404, body: errorBody(requestId, "AUTH_ROUTE_NOT_FOUND", "auth_route_not_found") });
  }

  async function validateStepUpChallenge({ token, principal = {}, purpose } = {}) {
    if (!centralIdentityRepository) return Object.freeze({ ok: true, authority: "signed-token-only" });
    const validation = await centralIdentityRepository.validateChallenge({
      tenant_id: principal.tenant_id,
      challenge_type: "step_up",
      challenge_hash: hashIdentityToken(token),
      user_id: principal.user_id,
      purpose,
    });
    if (validation.ok) return Object.freeze({ ok: true, authority: "postgres-v2" });
    await appendSecurityAudit({
      action: "auth.step_up.failed",
      object_id: principal.user_id,
      context: { principal },
      details: { reason: "challenge_inactive", purpose: purpose ?? null },
    });
    return Object.freeze({
      ok: false,
      status: 403,
      reason: "hrx_step_up_challenge_inactive",
      safe_error_code: "HRX_STEP_UP_CHALLENGE_INVALID",
    });
  }

  async function handleSecurityAdminApiRequest({ pathname, method, body = {}, context = {}, requestId = "req_unset" } = {}) {
    if (!hasSecurityAdminScope(context)) return securityAdminDenied(requestId);

    if (pathname === "/api/admin/security/users" && method === "GET") {
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "passed",
          items: Object.freeze(await Promise.all(seed.users.map(publicSecurityUser))),
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    const userTransitionMatch = pathname.match(/^\/api\/admin\/security\/users\/([^/]+)\/(disable|reactivate)$/);
    if (userTransitionMatch && method === "POST") {
      const userId = decodeURIComponent(userTransitionMatch[1]);
      const action = userTransitionMatch[2];
      const target = findRegisteredAccountByUserId(userId, seed);
      if (!target) return Object.freeze({ status: 404, body: errorBody(requestId, "ADMIN_SECURITY_USER_NOT_FOUND", "admin_security_user_not_found") });
      if (action === "disable" && target.user_id === securityActorId(context)) {
        return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_SELF_DISABLE_DENIED", "admin_security_self_disable_denied") });
      }
      if (action === "disable" && body.confirmed !== true) {
        return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_DISABLE_CONFIRMATION_REQUIRED", "admin_security_disable_confirmation_required") });
      }
      const nextStatus = action === "disable" ? "disabled" : "active";
      if (centralIdentityRepository) {
        await centralIdentityRepository.setAccountStatus({
          tenant_id: homeTenantIdForUser(target, trustedTenantId),
          user: identitySeed(target),
          status: nextStatus,
          actor_id: securityActorId(context),
          reason: body.reason ?? null,
        });
      } else {
        accountStatusByUserId.set(target.user_id, nextStatus);
        await appendSecurityAudit({
          action: action === "disable" ? "admin.security.user.disabled" : "admin.security.user.reactivated",
          object_id: target.user_id,
          context,
          details: { reason_present: Boolean(String(body.reason ?? "").trim()), status: nextStatus },
        });
      }
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: action === "disable" ? "disabled" : "reactivated",
          item: await publicSecurityUser(target),
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    if (pathname === "/api/admin/security/break-glass" && method === "GET") {
      const requests = centralIdentityRepository
        ? await centralIdentityRepository.listBreakGlassRequests({ tenant_id: context.principal.tenant_id })
        : [...breakGlassRequests.values()];
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "passed",
          items: Object.freeze(requests.map(publicBreakGlassRequest)),
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    if (pathname === "/api/admin/security/break-glass" && method === "POST") {
      const requesterUserId = String(body.requester_user_id ?? "").trim();
      const requester = findRegisteredAccountByUserId(requesterUserId, seed);
      if (!requester) return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_REQUESTER_REQUIRED", "admin_security_break_glass_requester_required") });
      const reason = String(body.reason ?? "").trim();
      if (!reason) return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_REASON_REQUIRED", "admin_security_break_glass_reason_required") });
      let request = Object.freeze({
        break_glass_request_id: `break_glass_${randomUUID()}`,
        requester_user_id: requester.user_id,
        requester_label: requester.display_name,
        reason,
        state: "pending",
        requested_at: new Date(now()).toISOString(),
        decided_by: null,
        decided_at: null,
      });
      if (centralIdentityRepository) {
        request = await centralIdentityRepository.createBreakGlassRequest({
          tenant_id: context.principal.tenant_id,
          requester: identitySeed(requester),
          requester_label: requester.display_name,
          break_glass_request_id: request.break_glass_request_id,
          reason: request.reason,
          requested_at: request.requested_at,
          actor_id: securityActorId(context),
        });
      } else {
        breakGlassRequests.set(request.break_glass_request_id, request);
        await appendSecurityAudit({
          action: "admin.security.break_glass.requested",
          object_id: request.break_glass_request_id,
          context,
          details: { requester_user_id: requester.user_id },
        });
      }
      return Object.freeze({
        status: 201,
        body: Object.freeze({
          request_id: requestId,
          outcome: "pending",
          item: publicBreakGlassRequest(request),
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    const breakGlassTransitionMatch = pathname.match(/^\/api\/admin\/security\/break-glass\/([^/]+)\/(approve|revoke)$/);
    if (breakGlassTransitionMatch && method === "POST") {
      const breakGlassRequestId = decodeURIComponent(breakGlassTransitionMatch[1]);
      const action = breakGlassTransitionMatch[2];
      const nextState = action === "approve" ? "approved" : "revoked";
      let next;
      if (centralIdentityRepository) {
        const transition = await centralIdentityRepository.transitionBreakGlassRequest({
          tenant_id: context.principal.tenant_id,
          break_glass_request_id: breakGlassRequestId,
          state: nextState,
          actor_id: securityActorId(context),
          decided_at: now(),
        });
        if (!transition.ok) return Object.freeze({ status: transition.status ?? 409, body: errorBody(requestId, transition.safe_error_code, transition.reason) });
        next = transition.record;
      } else {
        const current = breakGlassRequests.get(breakGlassRequestId);
        if (!current) return Object.freeze({ status: 404, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_NOT_FOUND", "admin_security_break_glass_not_found") });
        next = Object.freeze({
          ...current,
          state: nextState,
          decided_by: securityActorId(context),
          decided_at: new Date(now()).toISOString(),
        });
        breakGlassRequests.set(breakGlassRequestId, next);
        await appendSecurityAudit({
          action: action === "approve" ? "admin.security.break_glass.approved" : "admin.security.break_glass.revoked",
          object_id: breakGlassRequestId,
          context,
          details: { state: nextState },
        });
      }
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: nextState,
          item: publicBreakGlassRequest(next),
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    if (pathname === "/api/admin/security/audit" && method === "GET") {
      const auditItems = centralIdentityRepository
        ? await centralIdentityRepository.listSecurityAudit({ tenant_id: context.principal.tenant_id })
        : securityAuditStore.readEvents();
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "passed",
          items: auditItems,
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    return Object.freeze({ status: 404, body: errorBody(requestId, "ADMIN_SECURITY_ROUTE_NOT_FOUND", "admin_security_route_not_found") });
  }

  return Object.freeze({
    login,
    requestPasswordReset,
    confirmPasswordReset,
    verifyToken,
    resolvePermissionContextFromHeaders,
    handleAuthApiRequest,
    validateStepUpChallenge,
    handleSecurityAdminApiRequest,
  });
}
