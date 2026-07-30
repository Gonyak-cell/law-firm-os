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
import { hrxScopesForRoleProfile } from "./hrx-role-scope-matrix.js";
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
import { createAuthPasswordResetQueue } from "./auth-password-reset-queue.js";

export const AUTHORIZATION_HEADER = "authorization";
export const API_AUTH_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "api-auth",
  contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-01",
  contract_schema_version: "law-firm-os.api-auth-session.v0.1",
  endpoints: Object.freeze([
    "POST /api/auth/login",
    "POST /api/auth/oidc/start",
    "POST /api/auth/oidc/complete",
    "GET /api/auth/session",
    "POST /api/auth/logout",
    "POST /api/auth/step-up",
    "GET /api/auth/password-reset/open",
    "POST /api/auth/password-reset/request",
    "POST /api/auth/password-reset/confirm",
  ]),
  roster_source: "runtime-selected-account-directory",
  role_registry_source: LAWOS_ROLE_REGISTRY_SOURCE,
  step_up_contract_ref: HRX_STEP_UP_TOKEN_CONTRACT_REF,
  login_protection_contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-14",
  runtime_persistence: "signed_session_token",
  operational_auth_provider: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
  credential_store_env: LAWOS_AUTH_CREDENTIAL_STORE_ENV,
  password_reset_store_env: LAWOS_AUTH_PASSWORD_RESET_STORE_ENV,
  max_failed_logins_before_lock: 5,
  lock_response_status: 401,
  runtime_write_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

const TOKEN_PREFIX = "lawos_session_v1";
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_MAX_FAILED_LOGINS = 5;
const DEFAULT_LOGIN_LOCK_MS = 15 * 60 * 1000;
const DEFAULT_PASSWORD_RESET_MIN_LENGTH = 12;
const DEFAULT_ENTRA_STEP_UP_MAX_AUTH_AGE_MS = 5 * 60 * 1000;
const PASSWORD_RESET_DELIVERY_FAILURE_CLASSES = new Set([
  "authorization_policy",
  "delivery_adapter_exception",
  "identity_policy",
  "message_preparation",
  "permissions_boundary",
  "provider_failure",
  "resource_policy",
  "service_control_policy",
  "ses_sendemail_authorization",
  "ses_service",
  "session_policy",
  "unclassified",
  "vpc_endpoint_policy",
]);
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

function safePasswordResetDeliveryFailureClass(value, fallback = "provider_failure") {
  const normalized = String(value ?? "").trim().toLowerCase();
  return PASSWORD_RESET_DELIVERY_FAILURE_CLASSES.has(normalized) ? normalized : fallback;
}

const TENANT_ADMIN_ACTION_PREFIXES = Object.freeze([
  "admin_permission:",
  "ai:",
  "analytics:",
  "crm:",
  "crm.",
  "data_cloud:",
  "data_room:",
  "enterprise:",
  "home:",
  "home.",
  "intake:",
  "import_data_mapping:",
  "master_data:",
  "outlook:",
  "portal:",
  "record_action:",
  "reports:",
  "ui_readiness:",
]);

const TENANT_ADMIN_EXACT_ACTIONS = Object.freeze([
  "assignment-create",
  "assistant",
  "attendance-approve",
  "issue-resolve",
  "items",
  "list",
  "period-create",
  "profile-create",
  "profile-self",
  "profiles",
  "read",
  "reviews",
  "run-create",
  "statements-self",
]);

function allowRule(id, input = {}) {
  return Object.freeze({ id: `api-session-${id}`, effect: "allow", ...input });
}

function permissionRulesFromScopes(scopes = []) {
  const granted = new Set(scopes);
  const rules = [allowRule("profile-read", { action: "profile:read" })];
  if (granted.has("matter.read")) {
    rules.push(allowRule("matter-read", {
      action_prefixes: ["matter:", "matter.", "home:", "home.", "outlook:matter:"],
      action_access: "read",
    }));
    rules.push(allowRule("outlook-bootstrap", { action: "outlook:addin:bootstrap" }));
  }
  if (granted.has("matter.write")) {
    rules.push(allowRule("matter-write", { action_prefixes: ["matter:", "matter."] }));
    rules.push(allowRule("matter-outlook-write", { actions: ["outlook:followup:create"] }));
  }
  if (granted.has("vault.read")) {
    rules.push(allowRule("vault-read", {
      action_prefixes: ["dms:", "vault:", "matter:vault:", "outlook:document:"],
      action_access: "read",
    }));
  }
  if (granted.has("vault.write")) {
    rules.push(allowRule("vault-write", { actions: ["dms:document:write", "vault:upload:preflight"] }));
    rules.push(allowRule("vault-adapters-write", {
      actions: ["matter:document:write", "outlook:attachment:save", "outlook:email:file"],
    }));
  }
  if (granted.has("vault.governance")) {
    rules.push(allowRule("vault-governance", { action_prefix: "dms:governance:" }));
  }
  if (granted.has("audit.read")) {
    rules.push(allowRule("audit-read", { action_suffixes: [":audit:read", ".audit.read"] }));
  }
  if (granted.has("audit.export")) {
    rules.push(allowRule("audit-export", { action_suffixes: [":audit:export", ".audit.export"] }));
  }
  const financePrefixes = new Map([
    ["analytics.finance.read", ["analytics:finance:", "finance:ar:"]],
    ["finance.bank.read", ["finance:bank_transaction:", "finance:bank_classification:read"]],
    ["finance.bank.import", ["finance:bank_import:"]],
    ["finance.bank.classify", ["finance:bank_classification:"]],
    ["finance.time.write", ["finance:time:"]],
    ["finance.expense.write", ["finance:expense:", "finance:disbursement:"]],
    ["finance.billing.write", ["finance:fee_arrangement:", "finance:wip:", "finance:wip_snapshot:", "finance:prebill:", "finance:invoice:"]],
    ["finance.payment.write", ["finance:payment:", "finance:payment_match:", "finance:trust_ledger:"]],
    ["finance.export", ["finance:accounting_export:"]],
    ["finance.audit.read", ["finance:audit:"]],
  ]);
  for (const [scope, prefixes] of financePrefixes) {
    if (granted.has(scope)) rules.push(allowRule(scope.replaceAll(".", "-"), { action_prefixes: prefixes }));
  }
  const clientReadPrefixes = new Map([
    ["crm.inquiry.read", ["crm:inquiry:", "crm:consultation:", "crm:activity:"]],
    ["crm.inquiry.evidence.read", ["email_dms:inquiry_evidence:"]],
    ["analytics.client.read", ["analytics:client:"]],
  ]);
  for (const [scope, prefixes] of clientReadPrefixes) {
    if (granted.has(scope)) {
      rules.push(allowRule(scope.replaceAll(".", "-"), {
        action_prefixes: prefixes,
        action_access: "read",
      }));
    }
  }
  const clientWritePrefixes = new Map([
    ["crm.inquiry.write", ["crm:inquiry:", "crm:consultation:", "crm:activity:"]],
    ["crm.engagement.decide", ["crm:engagement:"]],
    ["outlook.connection.manage", ["outlook:connection:"]],
    ["outlook.inquiry.capture", ["outlook:inquiry:capture"]],
    ["finance.fee.write", ["finance:fee_commitment:", "finance:deposit_allocation:"]],
    ["analytics.client.export", ["analytics:client:export"]],
  ]);
  for (const [scope, prefixes] of clientWritePrefixes) {
    if (granted.has(scope)) rules.push(allowRule(scope.replaceAll(".", "-"), { action_prefixes: prefixes }));
  }
  if (granted.has("finance.approve")) {
    rules.push(allowRule("finance-approve", {
      actions: ["finance:time:approve", "finance:prebill:approve", "finance:prebill:reject"],
    }));
  }
  for (const scope of granted) {
    if (!scope.startsWith("hrx.")) continue;
    const [, category, ...rest] = scope.split(".");
    const readOnly = rest.at(-1) === "read";
    rules.push(allowRule(scope.replaceAll(".", "-"), {
      action_prefix: `hrx.${category}.`,
      ...(readOnly ? { action_access: "read" } : {}),
    }));
  }
  if (granted.has("tenant.admin")) {
    rules.push(allowRule("tenant-admin-prefixes", { action_prefixes: TENANT_ADMIN_ACTION_PREFIXES }));
    rules.push(allowRule("tenant-admin-actions", { actions: TENANT_ADMIN_EXACT_ACTIONS }));
  }
  if (granted.has("user.admin")) rules.push(allowRule("user-admin", { action_prefix: "user:" }));
  if (granted.has("security.admin")) rules.push(allowRule("security-admin", { action_prefix: "security:" }));
  if (granted.has("cutover.execute")) rules.push(allowRule("cutover-execute", { action_prefix: "cutover:" }));
  return Object.freeze(rules);
}

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
    role_registry_source: roleAssignment?.source_ref ?? LAWOS_ROLE_REGISTRY_SOURCE,
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
    session_source_ref: user.directory_source ?? MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    expires_at: expiresAt,
    token_material_returned: false,
  });
}

function permissionContextFromPrincipal(principal, { allowSyntheticTenantAliases = false } = {}) {
  const tenantIds = allowSyntheticTenantAliases && principal.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID
    ? LAWOS_RUNTIME_TENANT_IDS
    : Object.freeze([principal.tenant_id]);
  return Object.freeze({
    principal: Object.freeze({
      ...principal,
      tenant_ids: tenantIds,
      session_principal_source: "api_signed_session",
      session_source_ref: principal.directory_source ?? MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    }),
    rules: permissionRulesFromScopes(principal.scopes),
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

function publicLoginFailure(requestId) {
  return Object.freeze({
    status: 401,
    body: errorBody(requestId, "AUTH_CREDENTIAL_INVALID", "auth_credential_invalid"),
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

function resolveSessionRoleAssignment(user, { tenantId = MATTER_VAULT_REGISTERED_TENANT_ID } = {}) {
  if (user?.directory_source !== "postgres-v2") {
    return resolveLawosUserRoleAssignment(user, { tenantId });
  }
  const membership = (user.tenant_memberships ?? []).find((entry) => entry?.tenant_id === tenantId && entry?.status === "active");
  if (!membership) return null;
  const registeredAssignment = resolveLawosUserRoleAssignment(user, { tenantId });
  const highestPrivilege = user.highest_privilege === true && registeredAssignment?.role_ids.includes("system_super_admin");
  // A stale PostgreSQL membership must not reduce the registered break-glass account.
  const registeredRoleIds = highestPrivilege ? registeredAssignment.role_ids : [];
  const registeredGroupIds = highestPrivilege ? registeredAssignment.group_ids : [];
  const registeredScopes = highestPrivilege ? registeredAssignment.scopes : [];
  const roleIds = Object.freeze([...new Set([...(membership.role_ids ?? []), ...registeredRoleIds])]);
  const groupIds = Object.freeze([...new Set([...(membership.group_ids ?? []), ...registeredGroupIds])]);
  const scopes = Object.freeze([...new Set([...(membership.scopes ?? []), ...registeredScopes])]);
  const highestPrivilegeHrxScopes = highestPrivilege
    ? hrxScopesForRoleProfile("admin")
    : [];
  const hrxScopes = Object.freeze([...new Set([...(membership.hrx_scopes ?? []), ...highestPrivilegeHrxScopes])]);
  return Object.freeze({
    user_id: user.user_id,
    role_profile_id: membership.role_profile_id ?? user.role_profile_id ?? null,
    role_ids: roleIds,
    group_ids: groupIds,
    scopes,
    hrx_scopes: hrxScopes,
    source_ref: membership.source_ref ?? "postgres-v2-account-membership",
    tenant_membership: Object.freeze({
      tenant_id: membership.tenant_id,
      status: "active",
      role_ids: roleIds,
      group_ids: groupIds,
      scopes,
      hrx_scopes: hrxScopes,
    }),
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
  const roleAssignment = resolveSessionRoleAssignment(user, { tenantId: trustedTenantId });
  if (!roleAssignment) {
    return Object.freeze({ ok: false, status_code: 403, reason: "tenant_membership_inactive" });
  }
  const membership = roleAssignment.tenant_membership ?? {};
  return Object.freeze({
    ok: true,
    source: "api-signed-session",
    header_only_trust_allowed: false,
    user_id: user.user_id,
    actor_id: user.user_id,
    actor_type: "user",
    email: user.email,
    display_name: user.display_name,
    tenant_id: trustedTenantId,
    role_ids: Object.freeze([...(membership.role_ids ?? roleAssignment.role_ids ?? [])]),
    group_ids: Object.freeze([...(membership.group_ids ?? roleAssignment.group_ids ?? [])]),
    scopes: Object.freeze([...(membership.scopes ?? roleAssignment.scopes ?? [])]),
    hrx_scopes: Object.freeze([...(membership.hrx_scopes ?? roleAssignment.hrx_scopes ?? [])]),
    highest_privilege: user.highest_privilege === true,
    privilege_rank: user.privilege_rank ?? null,
    assurance_level: credential?.assurance_level ?? user.assurance_level ?? "password",
    entra_subject_id: credential?.federated_subject_id ?? null,
    session_id: payload.sid ?? `sess_${user.user_id}`,
    session_jti: payload.jti ?? null,
    credential_rev: credential?.credential_rev ?? payload.credential_rev ?? null,
    credential_status: credential?.credential_status ?? null,
    must_change_password: credential?.must_change_password === true,
    directory_source: user.directory_source ?? MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    request_id: requestId,
  });
}

function principalWithDirectoryRoleContext(principal, user, tenantId) {
  const roleAssignment = resolveSessionRoleAssignment(user, { tenantId });
  if (!principal?.ok || !roleAssignment) return principal;
  const membership = roleAssignment.tenant_membership ?? {};
  return Object.freeze({
    ...principal,
    role_ids: Object.freeze([...(membership.role_ids ?? roleAssignment.role_ids ?? [])]),
    group_ids: Object.freeze([...(membership.group_ids ?? roleAssignment.group_ids ?? [])]),
    scopes: Object.freeze([...(membership.scopes ?? roleAssignment.scopes ?? [])]),
    hrx_scopes: Object.freeze([...(membership.hrx_scopes ?? roleAssignment.hrx_scopes ?? [])]),
    highest_privilege: user.highest_privilege === true,
    privilege_rank: user.privilege_rank ?? null,
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
  passwordResetQueue,
  passwordResetTtlMs = Number(process.env.LAWOS_AUTH_PASSWORD_RESET_TTL_MS || DEFAULT_PASSWORD_RESET_TTL_MS),
  passwordResetMinLength = Number(process.env.LAWOS_AUTH_PASSWORD_RESET_MIN_LENGTH || DEFAULT_PASSWORD_RESET_MIN_LENGTH),
  now = () => Date.now(),
  stepUpAuthority = null,
  stepUpProvider = null,
  staffOidcProvider = null,
  identityRepository = null,
} = {}) {
  const runtimeProfile = resolveRuntimeProfile({ LAWOS_RUNTIME_PROFILE: profile });
  const sessionSecret = resolveSessionSecret({ profile: runtimeProfile, explicitSecret: secret });
  const syntheticLoginEnabled = runtimeProfile !== LAWOS_RUNTIME_PROFILES.operational;
  const provider = syntheticLoginEnabled
    ? createLocalDevAuthProvider({ subjects: subjectsFromSeed(seed, { trustedTenantId }) })
    : null;
  const centralIdentityRepository = identityRepository ? assertIdentityLedger(identityRepository) : null;
  const federatedStaffAuthEnabled = !syntheticLoginEnabled && staffOidcProvider != null;
  if (federatedStaffAuthEnabled && !centralIdentityRepository) {
    throw new TypeError("Entra staff OIDC requires the central identity repository");
  }
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
  const operationalPasswordResetQueue = syntheticLoginEnabled
    ? null
    : centralIdentityRepository
      ? Object.freeze({
          enqueue: (input) => centralIdentityRepository.enqueuePasswordReset(input),
          claim: (input) => centralIdentityRepository.claimPasswordResetJobs(input),
          finish: (input) => centralIdentityRepository.finishPasswordResetJob(input),
        })
      : passwordResetQueue ?? createAuthPasswordResetQueue({
          filePath: passwordResetTokenStorePath ? `${passwordResetTokenStorePath}.jobs` : undefined,
          now,
        });
  const failedLogins = new Map();
  const accountStatusByUserId = new Map(seed.users.map((user) => [
    user.user_id,
    user.status === "disabled" || (!syntheticLoginEnabled && user.production_status === "disabled") ? "disabled" : "active",
  ]));
  const breakGlassRequests = new Map();
  const revokedSessionJtis = new Set();
  const securityAuditStore = createSecurityAuditEventStore({ filePath: securityAuditStorePath });
  const dummyPasswordHash = syntheticLoginEnabled
    ? null
    : createScryptPasswordHash(randomBytes(32).toString("base64url"));

  async function directoryUserByEmail(email, tenantId = trustedTenantId) {
    if (centralIdentityRepository) {
      return centralIdentityRepository.findDirectoryUserByEmail({ tenant_id: tenantId, email });
    }
    return findRegisteredAccountByEmail(email, seed);
  }

  async function directoryUserByUserId(userId, tenantId = trustedTenantId) {
    if (centralIdentityRepository) {
      return centralIdentityRepository.findDirectoryUserByUserId({ tenant_id: tenantId, user_id: userId });
    }
    return findRegisteredAccountByUserId(userId, seed);
  }

  async function directoryUsers(tenantId = trustedTenantId) {
    if (centralIdentityRepository) {
      return centralIdentityRepository.listDirectoryUsers({ tenant_id: tenantId });
    }
    return Object.freeze([...seed.users]);
  }

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
    return centralIdentityRepository.getAccount({ tenant_id: homeTenantIdForUser(user, trustedTenantId), user_id: user.user_id });
  }

  async function accountStatus(userOrUserId) {
    const user = typeof userOrUserId === "string" ? await directoryUserByUserId(userOrUserId) : userOrUserId;
    const userId = typeof userOrUserId === "string" ? userOrUserId : user?.user_id;
    if (centralIdentityRepository) return user ? (await centralAccount(user))?.account_status ?? "disabled" : "disabled";
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
    const roleAssignment = resolveSessionRoleAssignment(user, { tenantId: trustedTenantId });
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
      login_allowed: Boolean(roleAssignment) && status === "active" && (!credentialStatus || ["active", "must_change"].includes(credentialStatus)),
      token_material_returned: false,
      production_ready_claim: false,
    });
  }

  function publicBreakGlassRequest(request) {
    const { reason, approvals, ...safe } = request ?? {};
    return Object.freeze({
      ...safe,
      reason_present: Boolean(String(reason ?? "").trim()),
      approvals_recorded: Array.isArray(approvals) ? approvals.length : Number(request?.approval_count ?? 0),
      token_material_returned: false,
      production_ready_claim: false,
    });
  }

  async function failedLoginState(email, user = null) {
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

  async function recordFailedLogin(email, user = null) {
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

  function usableScryptPasswordHash(value) {
    return value?.algorithm === "node:crypto.scrypt"
      && typeof value.salt === "string" && value.salt.length > 0
      && typeof value.digest === "string" && value.digest.length > 0
      && Number(value.params?.N) === 16_384
      && Number(value.params?.r) === 8
      && Number(value.params?.p) === 1
      && Number(value.params?.keylen) === 64;
  }

  async function verifyOperationalPassword(user, password) {
    const record = centralIdentityRepository
      ? (user ? await centralAccount(user) : null)
      : operationalCredentialStore.getByUserId(user?.user_id);
    const passwordHash = usableScryptPasswordHash(record?.password_hash) ? record.password_hash : dummyPasswordHash;
    const passwordMatches = verifyScryptPasswordHash(passwordHash, password);
    const accountState = centralIdentityRepository ? record?.account_status : (user ? await accountStatus(user) : "disabled");
    const credentialStatus = centralIdentityRepository ? record?.credential_status : record?.status;
    if (!user || !record || accountState !== "active" || !["active", "must_change"].includes(credentialStatus) || !passwordMatches) {
      return Object.freeze({ ok: false, reason: "auth_credential_invalid", safe_error_code: "AUTH_CREDENTIAL_INVALID", status: 401 });
    }
    return Object.freeze({
      ok: true,
      credential_rev: record.credential_rev,
      credential_status: credentialStatus,
      must_change_password: credentialStatus === "must_change",
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
    const verifiedFederatedCredential = federatedStaffAuthEnabled
      && record.credential_provider === staffOidcProvider.provider_id
      && Boolean(record.federated_subject_id);
    return Object.freeze({
      ok: true,
      credential_rev: record.credential_rev,
      credential_status: record.credential_status,
      must_change_password: record.credential_status === "must_change",
      assurance_level: verifiedFederatedCredential ? "phishing-resistant-mfa" : "password",
      federated_subject_id: verifiedFederatedCredential ? record.federated_subject_id : null,
    });
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

  function acceptedPasswordResetResponse(requestId) {
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "accepted",
        ok: true,
        accepted: true,
        email_delivery: publicPasswordResetDelivery({ mode: "email", provider: "configured", status: "accepted" }),
        token_material_returned: false,
        production_ready_claim: false,
      }),
    });
  }

  async function requestPasswordReset(body = {}, { requestId = "req_unset" } = {}) {
    if (syntheticLoginEnabled) {
      return Object.freeze({
        status: 403,
        body: errorBody(requestId, "AUTH_PASSWORD_RESET_OPERATIONAL_REQUIRED", "password_reset_operational_required"),
      });
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      return Object.freeze({ status: 400, body: errorBody(requestId, "AUTH_PASSWORD_RESET_EMAIL_REQUIRED", "password_reset_email_required") });
    }
    if (!passwordResetDeliveryConfigured()) {
      return Object.freeze({
        status: 503,
        body: errorBody(requestId, "AUTH_PASSWORD_RESET_EMAIL_NOT_CONFIGURED", "password_reset_email_not_configured"),
      });
    }
    try {
      await operationalPasswordResetQueue.enqueue({
        tenant_id: trustedTenantId,
        email,
        request_id: requestId,
      });
    } catch {
      return Object.freeze({
        status: 503,
        body: errorBody(requestId, "AUTH_PASSWORD_RESET_QUEUE_UNAVAILABLE", "password_reset_queue_unavailable"),
      });
    }
    return acceptedPasswordResetResponse(requestId);
  }

  async function processPasswordResetJob(job, workerId) {
    const user = await directoryUserByEmail(job.email, job.tenant_id);
    const activeMembership = user ? resolveSessionRoleAssignment(user, { tenantId: job.tenant_id }) : null;
    if (!user || await accountStatus(user) !== "active" || !activeMembership) {
      await operationalPasswordResetQueue.finish({
        tenant_id: job.tenant_id,
        job_id: job.job_id,
        worker_id: workerId,
        outcome: "dropped",
        last_error_code: "AUTH_PASSWORD_RESET_TARGET_INELIGIBLE",
      });
      return Object.freeze({ outcome: "dropped" });
    }
    const token = createPasswordResetToken(centralIdentityRepository ? job.tenant_id : null);
    const resetRecord = centralIdentityRepository
      ? await centralIdentityRepository.createChallenge({
          tenant_id: job.tenant_id,
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
        request_id: job.request_id,
      });
    } catch {
      delivery = Object.freeze({
        mode: "email",
        provider: "configured",
        status: "failed",
        message_id: null,
        reason: "password_reset_email_delivery_exception",
        failure_class: "delivery_adapter_exception",
        token_material_returned: false,
        reset_url_returned: false,
      });
    }
    if (delivery?.status === "failed") {
      if (centralIdentityRepository) {
        await centralIdentityRepository.revokeChallengesForUser({
          tenant_id: job.tenant_id,
          user_id: user.user_id,
          challenge_type: "password_reset",
          reason: "reset_delivery_failed",
          actor_id: user.user_id,
        });
      } else {
        operationalPasswordResetStore.revokeForUser({ userId: user.user_id, reason: "reset_delivery_failed" });
      }
      await operationalPasswordResetQueue.finish({
        tenant_id: job.tenant_id,
        job_id: job.job_id,
        worker_id: workerId,
        outcome: "retry",
        last_error_code: "AUTH_PASSWORD_RESET_DELIVERY_FAILED",
      });
      return Object.freeze({
        outcome: "retry",
        failure_class: safePasswordResetDeliveryFailureClass(delivery.failure_class),
      });
    } else {
      await requireOperationalPasswordReset(user);
    }
    await operationalPasswordResetQueue.finish({
      tenant_id: job.tenant_id,
      job_id: job.job_id,
      worker_id: workerId,
      outcome: "completed",
    });
    return Object.freeze({ outcome: "completed" });
  }

  async function processPasswordResetQueue({
    tenantId = trustedTenantId,
    workerId = `password-reset-worker:${randomUUID()}`,
    limit = 10,
  } = {}) {
    if (syntheticLoginEnabled || !passwordResetDeliveryConfigured()) {
      return Object.freeze({ claimed: 0, completed: 0, dropped: 0, retry: 0 });
    }
    const jobs = await operationalPasswordResetQueue.claim({
      tenant_id: tenantId,
      worker_id: workerId,
      limit,
      lease_ms: 60_000,
    });
    const counts = { claimed: jobs.length, completed: 0, dropped: 0, retry: 0 };
    const failureClasses = {};
    for (const job of jobs) {
      const result = await processPasswordResetJob(job, workerId);
      counts[result.outcome] += 1;
      if (result.failure_class) {
        const failureClass = safePasswordResetDeliveryFailureClass(result.failure_class);
        failureClasses[failureClass] = (failureClasses[failureClass] ?? 0) + 1;
      }
    }
    if (Object.keys(failureClasses).length > 0) {
      counts.failure_classes = Object.freeze(Object.fromEntries(Object.entries(failureClasses).sort(([left], [right]) => left.localeCompare(right))));
    }
    return Object.freeze(counts);
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
    const user = await directoryUserByUserId(consumed.record.user_id, consumed.record.tenant_id ?? trustedTenantId);
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
        roleAssignment: resolveSessionRoleAssignment(user, { tenantId: principal.tenant_id }),
      }),
    });
  }

  async function startOidcAuthorization(body = {}, headers = {}, { requestId = "req_unset" } = {}) {
    if (!federatedStaffAuthEnabled) {
      return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_OIDC_NOT_CONFIGURED", "auth_oidc_not_configured") });
    }
    const flow = body.flow === "step_up" ? "step_up" : "login";
    let user;
    let purpose = "staff_login";
    let primarySessionJti = null;
    if (flow === "step_up") {
      const resolved = await resolvePermissionContextFromHeaders(headers, { requestId, requireSessionToken: true });
      if (!resolved.ok) {
        return Object.freeze({
          status: resolved.status ?? 401,
          body: resolved.body ?? errorBody(requestId, "AUTH_SESSION_REQUIRED", "auth_session_required"),
        });
      }
      user = await directoryUserByUserId(resolved.principal.user_id, resolved.principal.tenant_id);
      primarySessionJti = resolved.principal.session_jti;
      purpose = `step_up:${String(body.purpose ?? "").trim()}`;
      if (!user || !primarySessionJti || purpose === "step_up:") {
        return Object.freeze({ status: 400, body: errorBody(requestId, "HRX_STEP_UP_PURPOSE_REQUIRED", "hrx_step_up_purpose_required") });
      }
    } else {
      user = await directoryUserByEmail(String(body.email ?? "").trim());
      if (!user) {
        return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_ENTRA_ACCOUNT_UNMAPPED", "auth_entra_account_unmapped") });
      }
    }
    if (await accountStatus(user) !== "active") {
      return Object.freeze({ status: 403, body: await disabledAccountBody(requestId, user) });
    }
    const stepUpMaxAuthAgeMs = Number(
      staffOidcProvider.capabilities?.step_up_max_auth_age_ms
      ?? DEFAULT_ENTRA_STEP_UP_MAX_AUTH_AGE_MS,
    );
    let authorization;
    try {
      authorization = staffOidcProvider.createAuthorizationRequest({
        redirect_uri: body.redirect_uri,
        code_challenge: body.code_challenge,
        login_hint: user.email,
        max_age_seconds: flow === "step_up" ? Math.ceil(stepUpMaxAuthAgeMs / 1000) : undefined,
      });
    } catch (error) {
      return Object.freeze({
        status: error?.status ?? 400,
        body: errorBody(requestId, error?.safe_error_code ?? "AUTH_ENTRA_REQUEST_INVALID", "auth_entra_request_invalid"),
      });
    }
    const tenantId = homeTenantIdForUser(user, trustedTenantId);
    await centralIdentityRepository.createChallenge({
      tenant_id: tenantId,
      user: identitySeed(user),
      challenge_type: "oidc_login",
      challenge_hash: hashIdentityToken(authorization.state),
      purpose,
      provider_id: staffOidcProvider.provider_id,
      requested_at: now(),
      expires_at: now() + 10 * 60 * 1000,
      actor_id: user.user_id,
      audit_action: "auth.oidc.authorization.started",
      metadata: {
        flow,
        nonce_hash: authorization.nonce_hash,
        redirect_uri_hash: authorization.redirect_uri_hash,
        code_challenge: authorization.code_challenge,
        phishing_resistant_required: true,
        conditional_access_required: true,
        step_up_max_auth_age_ms: flow === "step_up" ? stepUpMaxAuthAgeMs : null,
        primary_session_jti: primarySessionJti,
      },
    });
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "authorization_required",
        ok: true,
        authorization_url: authorization.authorization_url,
        state: authorization.state,
        provider_id: staffOidcProvider.provider_id,
        flow,
        pkce_method: "S256",
        mfa_required: true,
        phishing_resistant_required: true,
        conditional_access_required: true,
        token_material_returned: true,
        production_ready_claim: false,
      }),
    });
  }

  async function completeOidcAuthorization(body = {}, headers = {}, { requestId = "req_unset" } = {}) {
    if (!federatedStaffAuthEnabled) {
      return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_OIDC_NOT_CONFIGURED", "auth_oidc_not_configured") });
    }
    const state = String(body.state ?? "").trim();
    const redirectUri = String(body.redirect_uri ?? "").trim();
    const codeVerifier = String(body.code_verifier ?? "").trim();
    if (!state || !redirectUri || !codeVerifier || !body.code) {
      return Object.freeze({ status: 400, body: errorBody(requestId, "AUTH_ENTRA_CALLBACK_INVALID", "auth_entra_callback_invalid") });
    }
    const challengeHash = hashIdentityToken(state);
    const validation = await centralIdentityRepository.validateChallenge({
      tenant_id: trustedTenantId,
      challenge_type: "oidc_login",
      challenge_hash: challengeHash,
    });
    if (!validation.ok) {
      return Object.freeze({ status: validation.status ?? 401, body: errorBody(requestId, validation.safe_error_code ?? "AUTH_CHALLENGE_INVALID", validation.reason) });
    }
    const challenge = validation.record;
    const expectedCodeChallenge = createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
    if (
      challenge.metadata?.code_challenge !== expectedCodeChallenge
      || challenge.metadata?.redirect_uri_hash !== createHash("sha256").update(redirectUri, "utf8").digest("hex")
    ) {
      return Object.freeze({ status: 401, body: errorBody(requestId, "AUTH_ENTRA_PKCE_INVALID", "auth_entra_pkce_invalid") });
    }
    const user = await directoryUserByUserId(challenge.user_id, challenge.tenant_id ?? trustedTenantId);
    if (!user || normalizeLoginKey(user.email) !== normalizeLoginKey(challenge.email)) {
      return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_ENTRA_ACCOUNT_UNMAPPED", "auth_entra_account_unmapped") });
    }
    const existingAccount = await centralIdentityRepository.getAccount({
      tenant_id: trustedTenantId,
      user_id: user.user_id,
    });
    let verification;
    try {
      verification = await staffOidcProvider.completeAuthorization({
        code: body.code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        expected_nonce_hash: challenge.metadata.nonce_hash,
        expected_user_id: existingAccount?.federated_subject_id ?? undefined,
        max_auth_age_ms: challenge.metadata?.flow === "step_up"
          ? challenge.metadata.step_up_max_auth_age_ms
          : undefined,
      });
    } catch (error) {
      await appendSecurityAudit({
        action: "auth.oidc.authorization.failed",
        object_id: user.user_id,
        context: { principal: { tenant_id: trustedTenantId, user_id: user.user_id } },
        details: { reason: error?.safe_error_code ?? "ENTRA_VERIFICATION_FAILED", provider_id: staffOidcProvider.provider_id },
      });
      return Object.freeze({
        status: error?.status ?? 401,
        body: errorBody(requestId, error?.safe_error_code ?? "AUTH_ENTRA_VERIFICATION_FAILED", "auth_entra_verification_failed"),
      });
    }
    if (normalizeLoginKey(verification.email) !== normalizeLoginKey(user.email)) {
      return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_ENTRA_ACCOUNT_UNMAPPED", "auth_entra_account_unmapped") });
    }
    let stepUpPrincipal = null;
    if (challenge.metadata?.flow === "step_up") {
      const resolved = await resolvePermissionContextFromHeaders(headers, { requestId, requireSessionToken: true });
      if (
        !resolved.ok
        || resolved.principal.user_id !== user.user_id
        || !resolved.principal.session_jti
        || resolved.principal.session_jti !== challenge.metadata.primary_session_jti
      ) {
        return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_ENTRA_SUBJECT_MISMATCH", "auth_entra_subject_mismatch") });
      }
      stepUpPrincipal = resolved.principal;
    }
    const account = await centralIdentityRepository.ensureFederatedAccount({
      tenant_id: trustedTenantId,
      user: identitySeed(user),
      provider_id: verification.provider_id,
      federated_tenant_id: verification.tenant_id,
      federated_subject_id: verification.assertion_id,
      actor_id: user.user_id,
      phishing_resistant_mfa: true,
      conditional_access_verified: true,
    });
    const consumed = await centralIdentityRepository.consumeChallenge({
      tenant_id: trustedTenantId,
      challenge_type: "oidc_login",
      challenge_hash: challengeHash,
      user_id: user.user_id,
      purpose: challenge.purpose,
      expected_metadata: challenge.metadata?.flow === "step_up"
        ? { primary_session_jti: challenge.metadata.primary_session_jti }
        : {},
      actor_id: user.user_id,
      audit_action: "auth.oidc.authorization.consumed",
    });
    if (!consumed.ok) {
      return Object.freeze({ status: consumed.status ?? 401, body: errorBody(requestId, consumed.safe_error_code ?? "AUTH_CHALLENGE_INVALID", consumed.reason) });
    }

    if (challenge.metadata?.flow === "step_up") {
      const purpose = String(challenge.purpose ?? "").replace(/^step_up:/u, "");
      const issued = stepUpTokenAuthority().issueVerified({
        principal: stepUpPrincipal,
        purpose,
        provider_verification: Object.freeze({ ok: true, ...verification }),
        requestId,
      });
      if (issued.status !== 200) return issued;
      await centralIdentityRepository.createChallenge({
        tenant_id: trustedTenantId,
        user: identitySeed(user),
        challenge_type: "step_up",
        challenge_hash: hashIdentityToken(issued.body.step_up_token),
        purpose,
        provider_id: verification.provider_id,
        requested_at: now(),
        expires_at: issued.body.expires_at,
        actor_id: user.user_id,
        metadata: {
          factor: verification.factor,
          phishing_resistant: true,
          primary_session_jti: stepUpPrincipal.session_jti,
        },
      });
      return issued;
    }

    const principal = principalFromSignedSession({
      user,
      payload: { sid: `sess_oidc_${randomUUID()}`, credential_rev: account.credential_rev },
      trustedTenantId,
      requestId,
      credential: {
        credential_rev: account.credential_rev,
        credential_status: account.credential_status,
        assurance_level: verification.assurance_level,
        federated_subject_id: verification.assertion_id,
      },
    });
    const session = createToken({ principal, user });
    const committed = await centralIdentityRepository.completeLogin({
      tenant_id: trustedTenantId,
      user: identitySeed(user),
      session_jti: session.payload.jti,
      session_id: session.payload.sid,
      credential_rev: account.credential_rev,
      issued_at: session.payload.iat,
      expires_at: session.payload.exp,
    });
    if (!committed.ok) {
      return Object.freeze({ status: committed.status ?? 401, body: errorBody(requestId, committed.safe_error_code ?? "AUTH_SESSION_INVALID", committed.reason) });
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
        roster_source: centralIdentityRepository ? "postgres-v2-account-directory" : MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
        credential_provider: verification.provider_id,
        assurance_level: verification.assurance_level,
        mfa_verified: true,
        phishing_resistant_verified: true,
        conditional_access_verified: true,
        local_dev_synthetic_only: false,
        token_material_returned: true,
        production_ready_claim: false,
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
    const user = await directoryUserByUserId(payload.user_id, payload.tenant_id ?? trustedTenantId);
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
    const derivedPrincipal = provider
      ? deriveServerPrincipal({
          request: { headers: { authorization: `Bearer ${user.local_dev.synthetic_token}` } },
          provider,
          trustedTenantId: homeTenantId,
          request_id: requestId,
        })
      : principalFromSignedSession({ user, payload, trustedTenantId: homeTenantId, requestId, credential });
    if (!derivedPrincipal.ok) {
      return Object.freeze({
        ok: false,
        status: derivedPrincipal.status_code ?? 401,
        body: errorBody(requestId, "AUTH_SESSION_INVALID", derivedPrincipal.reason),
      });
    }
    const principal = principalWithDirectoryRoleContext(derivedPrincipal, user, homeTenantId);
    return Object.freeze({
      ok: true,
      principal,
      token_payload: Object.freeze({ jti: payload.jti, user_id: payload.user_id, tenant_id: payload.tenant_id, exp: payload.exp }),
      context: permissionContextFromPrincipal(principal, { allowSyntheticTenantAliases: syntheticLoginEnabled }),
      session: publicSession({
        user,
        principal,
        expiresAt: new Date(payload.exp).toISOString(),
        roleAssignment: resolveSessionRoleAssignment(user, { tenantId: principal.tenant_id }),
      }),
    });
  }

  async function login(body = {}, { requestId = "req_unset" } = {}) {
    if (federatedStaffAuthEnabled) {
      return Object.freeze({
        status: 403,
        body: errorBody(requestId, "AUTH_PASSWORD_LOGIN_DISABLED", "auth_password_login_disabled"),
      });
    }
    const email = String(body.email ?? "").trim();
    const credential = String(body.password ?? body.credential ?? body.local_dev_token ?? "").trim();
    if (!email || !credential) {
      return Object.freeze({
        status: 400,
        body: errorBody(requestId, "AUTH_EMAIL_CREDENTIAL_REQUIRED", "email_credential_required"),
      });
    }
    const user = await directoryUserByEmail(email);
    const lock = await failedLoginState(email, user);
    let principal;
    let credentialResult = null;
    if (syntheticLoginEnabled) {
      const eligible = Boolean(user) && !lock.locked && await accountStatus(user) === "active";
      if (eligible) {
        const homeTenantId = homeTenantIdForUser(user, trustedTenantId);
        principal = deriveServerPrincipal({
          request: { headers: { authorization: `Bearer ${credential}` } },
          provider,
          trustedTenantId: homeTenantId,
          request_id: requestId,
        });
      }
    } else {
      credentialResult = await verifyOperationalPassword(user, credential);
      const syntheticCredential = Boolean(user) && safeEqual(credential, user.local_dev?.synthetic_token ?? "");
      if (user && !lock.locked && credentialResult.ok && !syntheticCredential) {
        const homeTenantId = homeTenantIdForUser(user, trustedTenantId);
        principal = principalFromSignedSession({
          user,
          payload: { sid: `sess_${user.user_id}`, credential_rev: credentialResult.credential_rev },
          trustedTenantId: homeTenantId,
          requestId,
          credential: credentialResult,
        });
      }
    }
    if (!user || lock.locked || !principal?.ok || principal.user_id !== user.user_id) {
      if (!lock.locked) await recordFailedLogin(email, user);
      return publicLoginFailure(requestId);
    }

    const homeTenantId = homeTenantIdForUser(user, trustedTenantId);
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
        return publicLoginFailure(requestId);
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
        roster_source: centralIdentityRepository ? "postgres-v2-account-directory" : MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
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
    if (pathname === "/api/auth/oidc/start") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      return startOidcAuthorization(body, headers, { requestId });
    }
    if (pathname === "/api/auth/oidc/complete") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      return completeOidcAuthorization(body, headers, { requestId });
    }
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
      const user = await directoryUserByUserId(payload.user_id, payload.tenant_id ?? trustedTenantId);
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
      if (federatedStaffAuthEnabled) {
        return Object.freeze({
          status: 403,
          body: errorBody(requestId, "AUTH_ENTRA_STEP_UP_REQUIRED", "auth_entra_step_up_required"),
        });
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
      const stepUpUser = await directoryUserByUserId(resolved.principal.user_id, resolved.principal.tenant_id);
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
          metadata: {
            factor: verification?.factor ?? "totp",
            primary_session_jti: resolved.principal.session_jti ?? null,
          },
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
      if (federatedStaffAuthEnabled) {
        return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_PASSWORD_LOGIN_DISABLED", "auth_password_login_disabled") });
      }
      return requestPasswordReset(body, { requestId });
    }
    if (pathname === "/api/auth/password-reset/confirm") {
      if (method !== "POST") {
        return Object.freeze({ status: 405, body: errorBody(requestId, "AUTH_METHOD_NOT_ALLOWED", "auth_method_not_allowed") });
      }
      if (federatedStaffAuthEnabled) {
        return Object.freeze({ status: 403, body: errorBody(requestId, "AUTH_PASSWORD_LOGIN_DISABLED", "auth_password_login_disabled") });
      }
      return confirmPasswordReset(body, { requestId });
    }
    return Object.freeze({ status: 404, body: errorBody(requestId, "AUTH_ROUTE_NOT_FOUND", "auth_route_not_found") });
  }

  async function validateStepUpChallenge({ token, principal = {}, purpose } = {}) {
    const challengeHash = hashIdentityToken(token);
    if (!centralIdentityRepository) return Object.freeze({ ok: true, authority: "signed-token-local-dev" });
    if (!principal.session_jti) {
      return Object.freeze({
        ok: false,
        status: 403,
        reason: "hrx_step_up_session_binding_missing",
        safe_error_code: "HRX_STEP_UP_CHALLENGE_INVALID",
      });
    }
    const validation = await centralIdentityRepository.consumeChallenge({
      tenant_id: principal.tenant_id,
      challenge_type: "step_up",
      challenge_hash: challengeHash,
      user_id: principal.user_id,
      purpose,
      expected_metadata: { primary_session_jti: principal.session_jti },
      actor_id: principal.user_id,
      audit_action: "auth.step_up.consumed",
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
      const users = await directoryUsers(context.principal.tenant_id);
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: "passed",
          items: Object.freeze(await Promise.all(users.map(publicSecurityUser))),
          safe_error_codes: Object.freeze([]),
          production_ready_claim: false,
        }),
      });
    }

    const userTransitionMatch = pathname.match(/^\/api\/admin\/security\/users\/([^/]+)\/(disable|reactivate)$/);
    if (userTransitionMatch && method === "POST") {
      const userId = decodeURIComponent(userTransitionMatch[1]);
      const action = userTransitionMatch[2];
      const target = await directoryUserByUserId(userId, context.principal.tenant_id);
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
      const requester = await directoryUserByUserId(requesterUserId, context.principal.tenant_id);
      if (!requester) return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_REQUESTER_REQUIRED", "admin_security_break_glass_requester_required") });
      const reason = String(body.reason ?? "").trim();
      if (!reason) return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_REASON_REQUIRED", "admin_security_break_glass_reason_required") });
      const breakGlassAccountRef = String(body.break_glass_account_ref ?? "").trim();
      if (!breakGlassAccountRef || breakGlassAccountRef === requester.user_id) {
        return Object.freeze({ status: 400, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_SEPARATE_ACCOUNT_REQUIRED", "admin_security_break_glass_separate_account_required") });
      }
      let request = Object.freeze({
        break_glass_request_id: `break_glass_${randomUUID()}`,
        requester_user_id: requester.user_id,
        requester_label: requester.display_name,
        reason,
        break_glass_account_ref: breakGlassAccountRef,
        minimum_privilege_profile: "break_glass_minimum",
        required_approvals: 2,
        approval_count: 0,
        approvals: Object.freeze([]),
        state: "pending",
        requested_at: new Date(now()).toISOString(),
        expires_at: new Date(now() + 15 * 60 * 1_000).toISOString(),
        activated_at: null,
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
          break_glass_account_ref: request.break_glass_account_ref,
          required_approvals: request.required_approvals,
          requested_at: request.requested_at,
          expires_at: request.expires_at,
          actor_id: securityActorId(context),
        });
      } else {
        breakGlassRequests.set(request.break_glass_request_id, request);
        await appendSecurityAudit({
          action: "admin.security.break_glass.requested",
          object_id: request.break_glass_request_id,
          context,
          details: { requester_user_id: requester.user_id, separate_account_reference_present: true, required_approvals: 2 },
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
          evidence_sha256: body.evidence_sha256,
        });
        if (!transition.ok) return Object.freeze({ status: transition.status ?? 409, body: errorBody(requestId, transition.safe_error_code, transition.reason) });
        next = transition.record;
      } else {
        const current = breakGlassRequests.get(breakGlassRequestId);
        if (!current) return Object.freeze({ status: 404, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_NOT_FOUND", "admin_security_break_glass_not_found") });
        const actorId = securityActorId(context);
        if (action === "approve") {
          if (actorId === current.requester_user_id) {
            return Object.freeze({ status: 403, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_SELF_APPROVAL_DENIED", "admin_security_break_glass_self_approval_denied") });
          }
          if (Date.parse(current.expires_at) <= now()) {
            return Object.freeze({ status: 409, body: errorBody(requestId, "ADMIN_SECURITY_BREAK_GLASS_EXPIRED", "admin_security_break_glass_expired") });
          }
          const approvals = new Set(current.approvals ?? []);
          approvals.add(actorId);
          const activated = approvals.size >= current.required_approvals;
          next = Object.freeze({
            ...current,
            approvals: Object.freeze([...approvals]),
            approval_count: approvals.size,
            state: activated ? "approved" : "pending",
            activated_at: activated ? new Date(now()).toISOString() : null,
            decided_by: activated ? actorId : null,
            decided_at: activated ? new Date(now()).toISOString() : null,
          });
        } else {
          next = Object.freeze({
            ...current,
            state: "revoked",
            decided_by: actorId,
            decided_at: new Date(now()).toISOString(),
          });
        }
        breakGlassRequests.set(breakGlassRequestId, next);
        await appendSecurityAudit({
          action: action === "approve" && next.state !== "approved"
            ? "admin.security.break_glass.approval_recorded"
            : action === "approve" ? "admin.security.break_glass.approved" : "admin.security.break_glass.revoked",
          object_id: breakGlassRequestId,
          context,
          details: { state: next.state, approval_count: next.approval_count, required_approvals: next.required_approvals },
        });
      }
      return Object.freeze({
        status: 200,
        body: Object.freeze({
          request_id: requestId,
          outcome: next.state,
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
    capabilities: Object.freeze({
      provider: federatedStaffAuthEnabled ? staffOidcProvider.provider_id : syntheticLoginEnabled ? "local-dev-synthetic-provider" : LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
      staff_auth_authority: federatedStaffAuthEnabled ? "entra-oidc" : syntheticLoginEnabled ? "local-dev-synthetic" : "internal-password",
      federated_staff_auth: federatedStaffAuthEnabled,
      local_password_login: !federatedStaffAuthEnabled,
      local_synthetic_login: syntheticLoginEnabled,
      account_directory: centralIdentityRepository ? "postgres-v2" : "static-fixture",
      default_totp: !federatedStaffAuthEnabled,
      phishing_resistant_mfa_required: federatedStaffAuthEnabled,
    }),
    login,
    requestPasswordReset,
    processPasswordResetQueue,
    confirmPasswordReset,
    verifyToken,
    resolvePermissionContextFromHeaders,
    handleAuthApiRequest,
    validateStepUpChallenge,
    handleSecurityAdminApiRequest,
  });
}
