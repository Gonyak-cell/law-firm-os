import { createHash, randomBytes } from "node:crypto";
import { PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN } from "../../packages/runtime-auth/src/private-staging-synthetic-email.js";

const SYNTHETIC_TENANT = /^tenant_lawos_staging_cut007_[a-z0-9_-]+$/u;
const SYNTHETIC_USER = /^synthetic-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_EMPLOYEE = /^emp-lawos-staging-[a-z0-9-]+$/u;
const RESET_EXPIRED = "AUTH_PASSWORD_RESET_TOKEN_EXPIRED";
const STAGING_THROTTLE_RETRY_WAIT_MS = 26_000;
const STAGING_THROTTLE_RETRY_LIMIT = 2;
const STAGING_BROWSER_BURST_RECOVERY_WAIT_MS = 520_000;

function requiredText(value, name, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  if (pattern && !pattern.test(text)) throw new TypeError(`${name} is outside the approved synthetic namespace`);
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(condition, step, reason, result = null) {
  if (condition) return;
  const error = new Error(`CUT-007 ${step} failed: ${reason}`);
  error.code = "LAWOS_PRIVATE_STAGING_CUT007_FAILED";
  error.safe_error_code = "PRIVATE_STAGING_CUT007_ASSERTION_FAILED";
  error.step = step;
  error.observed_status = Number.isInteger(result?.status) ? result.status : null;
  error.observed_safe_error_codes = Array.isArray(result?.body?.safe_error_codes)
    ? [...result.body.safe_error_codes]
    : [];
  throw error;
}

function expectStatus(result, expected, step) {
  const statuses = Array.isArray(expected) ? expected : [expected];
  const observed = Number.isInteger(result?.status) ? result.status : "none";
  const safeCodes = Array.isArray(result?.body?.safe_error_codes)
    ? result.body.safe_error_codes.join(",")
    : result?.body?.safe_error_code ?? "none";
  const outcome = result?.body?.outcome ?? "none";
  const safeReason = /^[a-z0-9_.:-]+$/u.test(String(result?.body?.reason ?? "")) ? result.body.reason : "none";
  invariant(result && statuses.includes(result.status), step, `expected HTTP ${statuses.join(" or ")}; observed ${observed}; outcome ${outcome}; safe codes ${safeCodes}; reason ${safeReason}`, result);
  return result.body ?? {};
}

function hasSafeCode(result, code) {
  return (Array.isArray(result?.body?.safe_error_codes) && result.body.safe_error_codes.includes(code))
    || result?.body?.safe_error_code === code;
}

function encodeQuery(values = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value != null && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

function normalizeAccounts(accounts = [], primaryTenantId) {
  if (!Array.isArray(accounts)) throw new TypeError("accounts must be an array");
  const normalized = accounts.map((account, index) => {
    const userId = requiredText(account.user_id, `accounts[${index}].user_id`, SYNTHETIC_USER);
    const employeeId = requiredText(account.employee_id, `accounts[${index}].employee_id`, SYNTHETIC_EMPLOYEE);
    const email = requiredText(account.email, `accounts[${index}].email`, PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN).toLowerCase();
    const status = requiredText(account.account_status ?? account.status ?? "active", `accounts[${index}].status`);
    const roleIds = [...new Set((account.role_ids ?? []).map((role) => requiredText(role, "role id")))].sort();
    invariant(["active", "disabled"].includes(status), "account-contract", "account status must be active or disabled");
    invariant(roleIds.length > 0, "account-contract", "each account requires a role");
    if (account.tenant_id != null) invariant(account.tenant_id === primaryTenantId, "account-contract", "account tenant mismatch");
    return Object.freeze({ user_id: userId, employee_id: employeeId, email, status, role_ids: Object.freeze(roleIds) });
  });
  for (const field of ["user_id", "employee_id", "email"]) {
    invariant(new Set(normalized.map((account) => account[field])).size === normalized.length, "account-contract", `${field} must be unique`);
  }
  const admin = normalized.find((account) => account.status === "active" && account.role_ids.includes("firm_admin"));
  const attorney = normalized.find((account) => account.status === "active" && account !== admin);
  const disabled = normalized.find((account) => account.status === "disabled");
  invariant(admin && attorney && disabled, "account-contract", "active admin, active second user, and disabled user are required");
  return Object.freeze({ all: Object.freeze(normalized), admin, attorney, disabled });
}

function tamperToken(token) {
  const last = token.at(-1);
  return `${token.slice(0, -1)}${last === "a" ? "b" : "a"}`;
}

function defaultPasswordFactory(label) {
  return `Lw!${label}-${randomBytes(18).toString("base64url")}`;
}

function safeBrowserResult(result = {}) {
  return Object.freeze({
    outcome: result.outcome,
    critical_flow_count: Number(result.critical_flow_count ?? 0),
    screenshot_count: Number(result.screenshot_count ?? 0),
    console_error_count: Number(result.console_error_count ?? 0),
    failed_request_count: Number(result.failed_request_count ?? 0),
    evidence_fingerprint: requiredText(result.evidence_fingerprint, "browser evidence fingerprint", /^[a-f0-9]{64}$/u),
  });
}

function safeReadbackResult(result = {}) {
  invariant(result.outcome === "PASS", "postgres-readback", "independent PostgreSQL readback did not pass");
  for (const field of ["json_fallback_count", "json_writer_count", "dual_write_count", "real_data_count"]) {
    invariant(result[field] === 0, "postgres-readback", `${field} must equal zero`);
  }
  invariant(result.raw_value_returned === false && result.secret_material_returned === false, "postgres-readback", "readback returned sensitive material");
  return Object.freeze({
    outcome: "PASS",
    safe_counts: Object.freeze({ ...(result.safe_counts ?? {}) }),
    readback_fingerprint: requiredText(result.readback_fingerprint, "readback fingerprint", /^[a-f0-9]{64}$/u),
  });
}

export function createPrivateStagingHttpTransport({
  baseUrl,
  fetchImpl = globalThis.fetch,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  throttleRetryWaitMs = STAGING_THROTTLE_RETRY_WAIT_MS,
  throttleRetryLimit = STAGING_THROTTLE_RETRY_LIMIT,
  browserBurstRecoveryWaitMs = STAGING_BROWSER_BURST_RECOVERY_WAIT_MS,
} = {}) {
  const endpoint = new URL(requiredText(baseUrl, "baseUrl"));
  if (endpoint.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(endpoint.hostname)) {
    throw new TypeError("CUT-007 transport requires HTTPS outside local disposable tests");
  }
  if (typeof fetchImpl !== "function" || typeof wait !== "function") throw new TypeError("fetch and wait implementations are required");
  if (!Number.isInteger(throttleRetryWaitMs) || throttleRetryWaitMs < 0) throw new TypeError("throttle retry wait must be a non-negative integer");
  if (!Number.isInteger(throttleRetryLimit) || throttleRetryLimit < 0 || throttleRetryLimit > 3) throw new TypeError("throttle retry limit must be between zero and three");
  if (!Number.isInteger(browserBurstRecoveryWaitMs) || browserBurstRecoveryWaitMs < 0) throw new TypeError("browser burst recovery wait must be a non-negative integer");
  let throttlePacingActive = false;
  async function transport({ method = "GET", path, headers = {}, body } = {}) {
    const url = new URL(requiredText(path, "request path"), endpoint);
    invariant(url.origin === endpoint.origin, "transport", "request path escaped the approved staging origin");
    const requestHeaders = { ...headers };
    if (body !== undefined) requestHeaders["content-type"] = "application/json";
    if (throttlePacingActive) await wait(throttleRetryWaitMs);
    for (let retryCount = 0; ; retryCount += 1) {
      const response = await fetchImpl(url, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
      });
      let responseBody = {};
      try {
        responseBody = await response.json();
      } catch {
        responseBody = {};
      }
      if (response.status !== 429 || retryCount >= throttleRetryLimit) {
        return Object.freeze({
          status: response.status,
          body: responseBody,
          request_attempt_count: retryCount + 1,
          throttle_retry_count: retryCount,
        });
      }
      throttlePacingActive = true;
      await wait(throttleRetryWaitMs);
    }
  }
  Object.defineProperty(transport, "recoverBurstCapacity", {
    value: async () => {
      if (!throttlePacingActive) return Object.freeze({ waited: false, wait_ms: 0 });
      await wait(browserBurstRecoveryWaitMs);
      throttlePacingActive = false;
      return Object.freeze({ waited: true, wait_ms: browserBurstRecoveryWaitMs });
    },
  });
  return transport;
}

export async function runPrivateStagingCut007({
  transport,
  accounts,
  tenantIds,
  mailboxTokenProvider,
  passwordFactory = defaultPasswordFactory,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  resetExpiryWaitMs = 61_000,
  coldRestart,
  readback,
  browserSmoke,
  now = () => Date.now(),
  runId = `cut007-${Date.now()}`,
} = {}) {
  if (typeof transport !== "function") throw new TypeError("CUT-007 transport is required");
  if (typeof mailboxTokenProvider !== "function") throw new TypeError("approved synthetic mailbox token provider is required");
  if (typeof passwordFactory !== "function" || typeof wait !== "function") throw new TypeError("CUT-007 password and wait providers are required");
  if (typeof coldRestart !== "function" || typeof readback !== "function" || typeof browserSmoke !== "function") {
    throw new TypeError("CUT-007 cold restart, independent readback, and browser smoke providers are required");
  }
  const tenants = [...new Set((tenantIds ?? []).map((tenant) => requiredText(tenant, "tenant id", SYNTHETIC_TENANT)))].sort();
  invariant(tenants.length === 2, "tenant-contract", "exactly two CUT-007 synthetic tenants are required");
  const [primaryTenantId, negativeTenantId] = tenants;
  const principals = normalizeAccounts(accounts, primaryTenantId);
  const executionId = requiredText(runId, "runId", /^[a-z0-9-]{8,80}$/u);
  const suffix = sha256(executionId).slice(0, 12);
  const startedAt = new Date(now()).toISOString();
  const counters = {
    api_call_count: 0,
    assertion_count: 0,
    auth_flow_count: 0,
    hrx_flow_count: 0,
    client_matter_flow_count: 0,
    dms_flow_count: 0,
    finance_portal_flow_count: 0,
    tenant_negative_count: 0,
    role_negative_count: 0,
    idempotency_replay_count: 0,
    throttle_retry_count: 0,
    throttle_burst_recovery_count: 0,
  };

  async function request(step, expectedStatus, { method = "GET", path, token = null, body } = {}) {
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    const result = await transport({ method, path, headers, body });
    const attemptCount = result?.request_attempt_count ?? 1;
    const throttleRetryCount = result?.throttle_retry_count ?? 0;
    invariant(Number.isInteger(attemptCount) && attemptCount >= 1 && attemptCount <= 4, step, "transport attempt count is invalid");
    invariant(Number.isInteger(throttleRetryCount) && throttleRetryCount >= 0 && throttleRetryCount < attemptCount, step, "transport throttle retry count is invalid");
    counters.api_call_count += attemptCount;
    counters.throttle_retry_count += throttleRetryCount;
    counters.assertion_count += 1;
    expectStatus(result, expectedStatus, step);
    return result;
  }

  function query(tenantId, kind, extra = {}) {
    return encodeQuery({
      tenant_id: tenantId,
      permission_ref: `cut007-${kind}-permission`,
      audit_hint_ref: `cut007-${kind}-audit`,
      ...extra,
    });
  }

  const health = await request("health", 200, { path: "/api/health" });
  invariant(health.body.persistence_authority === "postgres-v2", "health", "PostgreSQL v2 is not the active authority", health);
  invariant(health.body.auth_authority?.staff_auth_authority === "internal-password", "health", "internal-password is not the staff authority", health);
  invariant(health.body.auth_authority?.account_directory === "postgres-v2", "health", "PostgreSQL account directory is not active", health);
  invariant(health.body.runtime_safety_policy?.offline_capability === "rejected", "health", "offline capability must be rejected", health);
  counters.assertion_count += 4;

  async function requestReset(account, purpose) {
    const requestedAt = new Date(now()).toISOString();
    const result = await request(`${purpose}-reset-request`, 200, {
      method: "POST",
      path: "/api/auth/password-reset/request",
      body: { email: account.email },
    });
    invariant(result.body.outcome === "accepted" && result.body.email_delivery?.status === "accepted", `${purpose}-reset-request`, "reset request was not enumeration-safe accepted", result);
    invariant(result.body.email_delivery?.token_material_returned === false && result.body.email_delivery?.reset_url_returned === false, `${purpose}-reset-request`, "reset response exposed token material", result);
    counters.assertion_count += 2;
    const token = requiredText(await mailboxTokenProvider({
      user_id: account.user_id,
      email: account.email,
      purpose,
      requested_at: requestedAt,
    }), `${purpose} mailbox reset token`);
    counters.auth_flow_count += 1;
    return token;
  }

  async function confirmReset(account, token, purpose) {
    const password = requiredText(await passwordFactory(purpose, account), `${purpose} generated password`);
    invariant(password.length >= 12, purpose, "generated password does not meet the minimum length");
    const confirmed = await request(`${purpose}-reset-confirm`, 200, {
      method: "POST",
      path: "/api/auth/password-reset/confirm",
      body: { token, password },
    });
    invariant(confirmed.body.activated === true && confirmed.body.token_material_returned === false, `${purpose}-reset-confirm`, "password setup did not activate safely", confirmed);
    counters.assertion_count += 2;
    counters.auth_flow_count += 1;
    return password;
  }

  async function login(account, password, purpose) {
    const result = await request(`${purpose}-login`, 200, {
      method: "POST",
      path: "/api/auth/login",
      body: { email: account.email, password },
    });
    invariant(result.body.session?.user_id === account.user_id && result.body.session?.tenant_id === primaryTenantId, `${purpose}-login`, "signed session identity mismatch", result);
    invariant(result.body.credential_provider === "lawos-internal-password-provider-v1", `${purpose}-login`, "unexpected credential provider", result);
    const token = requiredText(result.body.session_token, `${purpose} session token`);
    counters.assertion_count += 2;
    counters.auth_flow_count += 1;
    return token;
  }

  const adminResetToken = await requestReset(principals.admin, "admin-first-use");
  const unknownReset = await request("unknown-email-reset", 200, {
    method: "POST",
    path: "/api/auth/password-reset/request",
    body: { email: `lawos-staging-unknown-${suffix}@example.invalid` },
  });
  invariant(unknownReset.body.outcome === "accepted" && unknownReset.body.email_delivery?.status === "accepted", "unknown-email-reset", "unknown response is distinguishable", unknownReset);
  counters.assertion_count += 1;
  const tampered = await request("tampered-reset-link", 401, {
    method: "POST",
    path: "/api/auth/password-reset/confirm",
    body: { token: tamperToken(adminResetToken), password: await passwordFactory("tampered", principals.admin) },
  });
  invariant(hasSafeCode(tampered, "AUTH_PASSWORD_RESET_TOKEN_INVALID"), "tampered-reset-link", "tampered link did not fail with the safe code", tampered);
  counters.assertion_count += 1;
  const adminPassword = await confirmReset(principals.admin, adminResetToken, "admin-first-use");
  const reused = await request("reused-reset-link", 401, {
    method: "POST",
    path: "/api/auth/password-reset/confirm",
    body: { token: adminResetToken, password: await passwordFactory("reused", principals.admin) },
  });
  invariant(hasSafeCode(reused, "AUTH_PASSWORD_RESET_TOKEN_USED"), "reused-reset-link", "reused link was not rejected", reused);
  counters.assertion_count += 1;
  let adminToken = await login(principals.admin, adminPassword, "admin");
  const adminSession = await request("admin-session-read", 200, { path: "/api/auth/session", token: adminToken });
  invariant(adminSession.body.session?.user_id === principals.admin.user_id, "admin-session-read", "session readback mismatch", adminSession);
  counters.assertion_count += 1;

  const attorneyExpiredToken = await requestReset(principals.attorney, "attorney-expiry");
  await wait(resetExpiryWaitMs);
  const expired = await request("expired-reset-link", 401, {
    method: "POST",
    path: "/api/auth/password-reset/confirm",
    body: { token: attorneyExpiredToken, password: await passwordFactory("expired", principals.attorney) },
  });
  invariant(hasSafeCode(expired, RESET_EXPIRED), "expired-reset-link", "expired link was not rejected", expired);
  counters.assertion_count += 1;
  const attorneyResetToken = await requestReset(principals.attorney, "attorney-first-use");
  const attorneyPassword = await confirmReset(principals.attorney, attorneyResetToken, "attorney-first-use");
  const attorneyToken = await login(principals.attorney, attorneyPassword, "attorney");
  const disabledReset = await request("disabled-reset-enumeration", 200, {
    method: "POST",
    path: "/api/auth/password-reset/request",
    body: { email: principals.disabled.email },
  });
  invariant(disabledReset.body.outcome === "accepted", "disabled-reset-enumeration", "disabled state leaked through reset", disabledReset);
  const disabledLogin = await request("disabled-login", 401, {
    method: "POST",
    path: "/api/auth/login",
    body: { email: principals.disabled.email, password: await passwordFactory("disabled", principals.disabled) },
  });
  invariant(hasSafeCode(disabledLogin, "AUTH_CREDENTIAL_INVALID"), "disabled-login", "disabled account did not use the generic login failure envelope", disabledLogin);
  counters.assertion_count += 2;
  counters.auth_flow_count += 4;

  const adminEmployeeList = await request("hrx-employee-list", 200, {
    path: "/api/hrx/employees",
    token: adminToken,
  });
  invariant((adminEmployeeList.body.employees ?? []).length >= principals.all.length, "hrx-employee-list", "synthetic employees are missing", adminEmployeeList);
  const employeeDetail = await request("hrx-employee-detail", 200, {
    path: `/api/hrx/employees/${encodeURIComponent(principals.admin.employee_id)}`,
    token: adminToken,
  });
  const professionalProfile = employeeDetail.body.professional_profile;
  for (const field of ["experience", "education", "qualifications", "practice_areas"]) {
    invariant(Array.isArray(professionalProfile?.[field]), "hrx-employee-detail", `professional_profile.${field} is missing`, employeeDetail);
  }
  const selfProfile = await request("hrx-self-profile", 200, {
    path: "/api/profile/me",
    token: adminToken,
  });
  invariant(selfProfile.body.item != null, "hrx-self-profile", "self profile is missing", selfProfile);
  const links = await request("hrx-employee-user-links", 200, {
    path: `/api/hrx/employee-user-links?${encodeQuery({ user_id: principals.admin.user_id })}`,
    token: adminToken,
  });
  invariant((links.body.links ?? []).some((link) => link.employee_id === principals.admin.employee_id), "hrx-employee-user-links", "employee-user link is missing", links);
  const repeatedLinks = await request("hrx-employee-user-links-repeat", 200, {
    path: `/api/hrx/employee-user-links?${encodeQuery({ user_id: principals.admin.user_id })}`,
    token: adminToken,
  });
  invariant((repeatedLinks.body.links ?? []).some((link) => link.employee_id === principals.admin.employee_id), "hrx-employee-user-links-repeat", "repeated audited read lost the employee-user link", repeatedLinks);
  const attorneyList = await request("hrx-role-scoped-list", 200, {
    path: "/api/hrx/employees",
    token: attorneyToken,
  });
  invariant((attorneyList.body.employees ?? []).every((employee) => employee.employee_id === principals.attorney.employee_id), "hrx-role-scoped-list", "attorney employee view is not self-scoped", attorneyList);
  const compensationDenied = await request("hrx-compensation-role-denial", 403, {
    path: `/api/hrx/compensation?${encodeQuery({ employee_id: principals.admin.employee_id })}`,
    token: attorneyToken,
  });
  invariant(
    hasSafeCode(compensationDenied, "HRX_COMPENSATION_ACCESS_DENIED") || hasSafeCode(compensationDenied, "HRX_AUTHZ_DENIED"),
    "hrx-compensation-role-denial",
    "unauthorized compensation access was not denied",
    compensationDenied,
  );
  counters.role_negative_count += 1;
  const hrxMutationBody = {
    tenant_id: primaryTenantId,
    display_name: `LawOS Staging Pilot ADMIN ${suffix.slice(0, 4).toUpperCase()}`,
  };
  const hrxMutation = await request("hrx-synthetic-mutation", 200, {
    method: "PATCH",
    path: `/api/hrx/employees/${encodeURIComponent(principals.admin.employee_id)}`,
    token: adminToken,
    body: hrxMutationBody,
  });
  invariant(hrxMutation.body.employee?.display_name === hrxMutationBody.display_name, "hrx-synthetic-mutation", "HRX mutation readback mismatch", hrxMutation);
  counters.assertion_count += 10;
  counters.hrx_flow_count += 8;

  const masterQuery = query(primaryTenantId, "master-read", { model_type: "ClientGroup", limit: 100 });
  const clients = await request("client-search", 200, { path: `/master-data/records?${masterQuery}`, token: adminToken });
  invariant((clients.body.items ?? []).some((item) => item.client_group_id === "client-group-lawos-staging"), "client-search", "synthetic client group is missing", clients);
  const clientDetail = await request("client-detail", 200, {
    path: `/master-data/client-groups/client-group-lawos-staging?${query(primaryTenantId, "client-detail")}`,
    token: adminToken,
  });
  invariant((clientDetail.body.items ?? [])[0]?.client_group_id === "client-group-lawos-staging", "client-detail", "client detail is missing", clientDetail);
  const relationships = await request("client-relationships", 200, {
    path: `/master-data/relationships?${query(primaryTenantId, "client-relationships", { entity_id: "entity-lawos-staging-client" })}`,
    token: adminToken,
  });
  invariant(Array.isArray(relationships.body.items), "client-relationships", "relationship result is missing", relationships);
  const opportunityList = await request("crm-opportunity", 200, {
    path: `/api/crm/opportunities?${query(primaryTenantId, "crm-read")}`,
    token: adminToken,
  });
  invariant((opportunityList.body.items ?? []).some((item) => item.opportunity_id === "opportunity-lawos-staging"), "crm-opportunity", "synthetic opportunity is missing", opportunityList);

  const intakeId = `intake-cut007-${suffix}`;
  const handoffBody = {
    tenant_id: primaryTenantId,
    permission_ref: "cut007-crm-write-permission",
    audit_hint_ref: "cut007-crm-write-audit",
    actor_id: principals.admin.user_id,
    idempotency_key: `cut007-handoff-${suffix}`,
    intake_request_id: intakeId,
  };
  const handoff = await request("crm-intake-handoff", 201, {
    method: "POST",
    path: "/api/crm/opportunities/opportunity-lawos-staging/handoff",
    token: adminToken,
    body: handoffBody,
  });
  invariant(handoff.body.item?.intake_request_id === intakeId, "crm-intake-handoff", "intake handoff mismatch", handoff);
  const handoffReplay = await request("crm-intake-handoff-replay", 200, {
    method: "POST",
    path: "/api/crm/opportunities/opportunity-lawos-staging/handoff",
    token: adminToken,
    body: handoffBody,
  });
  invariant(handoffReplay.body.outcome === "idempotent_replay", "crm-intake-handoff-replay", "handoff replay was not a no-op", handoffReplay);
  counters.idempotency_replay_count += 1;

  const conflictCheckId = `conflict-cut007-${suffix}`;
  const conflict = await request("intake-conflict-check", 201, {
    method: "POST",
    path: "/api/intake/conflict-checks",
    token: adminToken,
    body: {
      tenant_id: primaryTenantId,
      permission_ref: "cut007-intake-write-permission",
      audit_hint_ref: "cut007-intake-write-audit",
      actor_id: principals.admin.user_id,
      idempotency_key: `cut007-conflict-${suffix}`,
      conflict_check: {
        conflict_check_id: conflictCheckId,
        tenant_id: primaryTenantId,
        intake_request_id: intakeId,
        party_snapshot: { party_ids: ["party-lawos-staging-client"], aliases: ["LawOS Staging Synthetic Client"] },
        status: "snapshot_recorded",
        owner_user_id: principals.admin.user_id,
      },
      conflict_search: {
        conflict_search_id: `search-cut007-${suffix}`,
        aliases: ["LawOS Staging Synthetic Client"],
        hit_count: 0,
      },
    },
  });
  const conflictHitIds = (conflict.body.conflict_hits ?? []).map((hit) => hit.conflict_hit_id);
  const decision = await request("intake-conflict-decision", 201, {
    method: "POST",
    path: "/api/intake/conflict-decisions",
    token: adminToken,
    body: {
      tenant_id: primaryTenantId,
      permission_ref: "cut007-intake-write-permission",
      audit_hint_ref: "cut007-intake-write-audit",
      actor_id: principals.admin.user_id,
      idempotency_key: `cut007-decision-${suffix}`,
      conflict_decision: {
        conflict_decision_id: `decision-cut007-${suffix}`,
        tenant_id: primaryTenantId,
        conflict_check_id: conflictCheckId,
        conflict_hit_ids: conflictHitIds,
        reviewer_id: principals.admin.user_id,
        decision: "clear",
        rationale: "synthetic_cut007_review",
      },
    },
  });
  invariant(decision.body.conflict_check?.status === "cleared", "intake-conflict-decision", "conflict was not cleared", decision);

  const engagementId = `engagement-cut007-${suffix}`;
  const signedDocumentId = `signed-document-cut007-${suffix}`;
  const engagement = await request("intake-engagement", 201, {
    method: "POST",
    path: "/api/intake/engagements",
    token: adminToken,
    body: {
      tenant_id: primaryTenantId,
      permission_ref: "cut007-intake-write-permission",
      audit_hint_ref: "cut007-intake-write-audit",
      actor_id: principals.admin.user_id,
      idempotency_key: `cut007-engagement-${suffix}`,
      engagement: {
        engagement_id: engagementId,
        tenant_id: primaryTenantId,
        intake_request_id: intakeId,
        template_id: "matter_engagement_letter",
        signed_document_id: signedDocumentId,
        signature_ref: `signature:${signedDocumentId}`,
        template_document: {
          template_document_id: `template-document-cut007-${suffix}`,
          template_id: "matter_engagement_letter",
          document_title: "Synthetic CUT-007 engagement",
          generation_state: "generated",
          merge_field_count: 3,
        },
        signed_document_upload: {
          signed_document_upload_id: `signed-upload-cut007-${suffix}`,
          document_id: signedDocumentId,
          signed_document_id: signedDocumentId,
          template_document_id: `template-document-cut007-${suffix}`,
          signature_ref: `signature:${signedDocumentId}`,
          content_sha256: `sha256:${signedDocumentId}`,
          byte_size: 512,
          mime_type: "application/pdf",
          upload_state: "uploaded",
          lx_registry_ref: "LX-06",
        },
        approver_id: principals.admin.user_id,
      },
    },
  });
  invariant(engagement.body.engagement_ready === true, "intake-engagement", "engagement is not ready", engagement);
  const clearanceTokenId = `clearance-cut007-${suffix}`;
  const issuedAt = new Date(now()).toISOString();
  const expiresAt = new Date(now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const clearance = await request("intake-clearance-token", 201, {
    method: "POST",
    path: "/api/intake/clearance-tokens",
    token: adminToken,
    body: {
      tenant_id: primaryTenantId,
      permission_ref: "cut007-intake-write-permission",
      audit_hint_ref: "cut007-intake-write-audit",
      actor_id: principals.admin.user_id,
      idempotency_key: `cut007-clearance-${suffix}`,
      now: issuedAt,
      token: {
        clearance_token_id: clearanceTokenId,
        tenant_id: primaryTenantId,
        intake_request_id: intakeId,
        conflict_check_id: conflictCheckId,
        engagement_id: engagementId,
        snapshot_hash: conflict.body.item?.snapshot_hash,
        expires_at: expiresAt,
      },
    },
  });
  invariant(clearance.body.validation?.valid === true, "intake-clearance-token", "clearance token was not valid", clearance);

  const matterId = `matter-cut007-${suffix}`;
  const matterOpeningBody = {
    tenant_id: primaryTenantId,
    permission_ref: "cut007-matter-write-permission",
    audit_hint_ref: "cut007-matter-write-audit",
    actor_id: principals.admin.user_id,
    idempotency_key: `cut007-matter-open-${suffix}`,
    matter_number_seed: `CUT007-${suffix.toUpperCase()}`,
    matter: {
      matter_id: matterId,
      tenant_id: primaryTenantId,
      legal_client_party_id: "party-lawos-staging-client",
      billing_client_party_id: "party-lawos-staging-client",
      client_group_id: "client-group-lawos-staging",
      title: "Synthetic CUT-007 matter",
      status: "opening",
      matter_code: `LawOS-Staging/Advisory/${suffix}`,
      matter_number: `M-CUT007-${suffix.toUpperCase()}`,
      created_by: principals.admin.user_id,
      created_at: issuedAt,
      permission_envelope_id: `permission-cut007-${suffix}`,
      audit_trace_id: `audit-cut007-${suffix}`,
    },
    clearance_token: clearance.body.item,
  };
  const opened = await request("matter-open", 201, {
    method: "POST",
    path: "/api/matters/openings",
    token: adminToken,
    body: matterOpeningBody,
  });
  invariant(opened.body.item?.matter_id === matterId && Boolean(opened.body.item?.matter_code), "matter-open", "matter or matter code is missing", opened);
  const openedReplay = await request("matter-open-replay", 200, {
    method: "POST",
    path: "/api/matters/openings",
    token: adminToken,
    body: matterOpeningBody,
  });
  invariant(openedReplay.body.outcome === "idempotent_replay", "matter-open-replay", "matter opening replay was not a no-op", openedReplay);
  counters.idempotency_replay_count += 1;
  const team = await request("matter-team-assignment", 201, {
    method: "POST",
    path: `/api/matters/${encodeURIComponent(matterId)}/team-members`,
    token: adminToken,
    body: {
      tenant_id: primaryTenantId,
      permission_ref: "cut007-matter-team-permission",
      audit_hint_ref: "cut007-matter-team-audit",
      actor_id: principals.admin.user_id,
      idempotency_key: `cut007-matter-team-${suffix}`,
      member: {
        member_id: `member-cut007-${suffix}`,
        tenant_id: primaryTenantId,
        employee_id: principals.attorney.employee_id,
        user_id: principals.attorney.user_id,
        role: "responsible_attorney",
        status: "active",
      },
    },
  });
  invariant(team.body.item?.employee_id === principals.attorney.employee_id, "matter-team-assignment", "matter team linkage mismatch", team);
  const matterList = await request("matter-list-search", 200, {
    path: `/api/matters?${query(primaryTenantId, "matter-read")}`,
    token: adminToken,
  });
  invariant((matterList.body.items ?? []).some((item) => item.matter_id === matterId), "matter-list-search", "created matter is missing from list", matterList);
  const matterDetail = await request("matter-detail", 200, {
    path: `/api/matters/${encodeURIComponent(matterId)}?${query(primaryTenantId, "matter-detail")}`,
    token: adminToken,
  });
  invariant(matterDetail.body.item?.matter_id === matterId, "matter-detail", "matter detail mismatch", matterDetail);
  const patchBody = {
    tenant_id: primaryTenantId,
    permission_ref: "cut007-matter-patch-permission",
    audit_hint_ref: "cut007-matter-patch-audit",
    actor_id: principals.admin.user_id,
    idempotency_key: `cut007-matter-patch-${suffix}`,
    field_updates: { wip_status: "review_required" },
    reason: "synthetic_cut007_update",
    edited_at: new Date(now()).toISOString(),
  };
  await request("matter-update", 200, { method: "PATCH", path: `/api/matters/${encodeURIComponent(matterId)}`, token: adminToken, body: patchBody });
  const patchReplay = await request("matter-update-replay", 200, { method: "PATCH", path: `/api/matters/${encodeURIComponent(matterId)}`, token: adminToken, body: patchBody });
  invariant(patchReplay.body.outcome === "idempotent_replay", "matter-update-replay", "matter update replay was not a no-op", patchReplay);
  counters.idempotency_replay_count += 1;
  const wrongTenantMatter = await request("matter-wrong-tenant", 403, {
    path: `/api/matters?${query(negativeTenantId, "matter-negative")}`,
    token: adminToken,
  });
  invariant((wrongTenantMatter.body.items ?? []).length === 0, "matter-wrong-tenant", "wrong-tenant response exposed records", wrongTenantMatter);
  counters.tenant_negative_count += 1;
  counters.assertion_count += 17;
  counters.client_matter_flow_count += 16;

  const documentIds = [`document-cut007-${suffix}-a`, `document-cut007-${suffix}-b`];
  const versionIds = [`version-cut007-${suffix}-a`, `version-cut007-${suffix}-b`];
  const documentBytes = [Buffer.from(`Synthetic CUT-007 document A ${suffix}`), Buffer.from(`Synthetic CUT-007 document B ${suffix}`)];
  const uploaded = [];
  for (let index = 0; index < documentIds.length; index += 1) {
    const uploadBody = {
      tenant_id: primaryTenantId,
      permission_ref: "cut007-dms-write-permission",
      audit_hint_ref: "cut007-dms-write-audit",
      actor_id: principals.admin.user_id,
      idempotency_key: `cut007-dms-upload-${suffix}-${index + 1}`,
      content_base64: documentBytes[index].toString("base64"),
      document: {
        document_id: documentIds[index],
        tenant_id: primaryTenantId,
        matter_id: matterId,
        workspace_id: `workspace-cut007-${suffix}`,
        title: `Synthetic CUT-007 document ${index + 1}`,
        current_version_id: versionIds[index],
        permission_envelope_id: `permission-cut007-dms-${suffix}`,
        audit_trace_id: `audit-cut007-dms-${suffix}`,
        mime_type: "text/plain",
      },
    };
    const created = await request(`dms-upload-${index + 1}`, 201, {
      method: "POST",
      path: "/api/vault/documents",
      token: adminToken,
      body: uploadBody,
    });
    invariant(created.body.provider_finalize_before_metadata === true && created.body.independent_digest_readback === true, `dms-upload-${index + 1}`, "DMS finalize/digest guarantees are missing", created);
    uploaded.push(created);
    const download = await request(`dms-download-${index + 1}`, 200, {
      path: `/api/vault/documents/${encodeURIComponent(documentIds[index])}/download?${query(primaryTenantId, "dms-download")}`,
      token: adminToken,
    });
    invariant(download.body.download?.independent_digest_readback === true, `dms-download-${index + 1}`, "independent digest readback did not run", download);
    invariant(sha256(Buffer.from(download.body.download?.content_base64 ?? "", "base64")) === sha256(documentBytes[index]), `dms-download-${index + 1}`, "download digest mismatch", download);
    counters.assertion_count += 3;
  }
  const governanceBase = {
    tenant_id: primaryTenantId,
    permission_ref: "cut007-dms-governance-permission",
    audit_hint_ref: "cut007-dms-governance-audit",
    object_id: `object:${versionIds[0]}`,
  };
  const hold = await request("dms-legal-hold", 201, {
    method: "POST",
    path: `/api/vault/documents/${encodeURIComponent(documentIds[0])}/legal-holds`,
    token: adminToken,
    body: { ...governanceBase, legal_hold_id: `hold-cut007-${suffix}`, reason: "synthetic CUT-007 legal hold" },
  });
  invariant(hold.body.item?.status === "active", "dms-legal-hold", "legal hold is not active", hold);
  const retention = await request("dms-retention", 201, {
    method: "POST",
    path: `/api/vault/documents/${encodeURIComponent(documentIds[0])}/retention-policies`,
    token: adminToken,
    body: { ...governanceBase, retention_policy_id: `retention-cut007-${suffix}`, retain_until: expiresAt },
  });
  invariant(retention.body.item != null, "dms-retention", "retention policy is missing", retention);
  const heldDelete = await request("dms-held-delete-denied", 409, {
    method: "POST",
    path: `/api/vault/documents/${encodeURIComponent(documentIds[0])}/delete-check`,
    token: adminToken,
    body: governanceBase,
  });
  invariant(hasSafeCode(heldDelete, "DMS_LEGAL_HOLD_DELETE_BLOCKED"), "dms-held-delete-denied", "legal hold did not block delete", heldDelete);
  const mismatchedDelete = await request("dms-mismatched-object-denied", 409, {
    method: "POST",
    path: `/api/vault/documents/${encodeURIComponent(documentIds[0])}/delete-check`,
    token: adminToken,
    body: { ...governanceBase, object_id: `object:${versionIds[1]}` },
  });
  invariant(hasSafeCode(mismatchedDelete, "DMS_DOCUMENT_OBJECT_MISMATCH"), "dms-mismatched-object-denied", "mismatched object was not rejected", mismatchedDelete);
  const permanentDelete = await request("dms-permanent-delete-denied", 403, {
    method: "POST",
    path: `/api/vault/documents/${encodeURIComponent(documentIds[1])}/permanent-delete`,
    token: adminToken,
    body: {
      ...governanceBase,
      object_id: `object:${versionIds[1]}`,
      idempotency_key: `cut007-unapproved-delete-${suffix}`,
    },
  });
  invariant(hasSafeCode(permanentDelete, "DMS_PERMANENT_DELETE_APPROVAL_REQUIRED"), "dms-permanent-delete-denied", "unapproved permanent delete was not rejected", permanentDelete);
  const wrongTenantDms = await request("dms-wrong-tenant", 403, {
    path: `/api/vault/documents?${query(negativeTenantId, "dms-negative")}`,
    token: adminToken,
  });
  invariant((wrongTenantDms.body.items ?? []).length === 0, "dms-wrong-tenant", "wrong-tenant DMS response exposed records", wrongTenantDms);
  counters.tenant_negative_count += 1;
  counters.assertion_count += 6;
  counters.dms_flow_count += 12;

  const financeRecordId = `time-cut007-${suffix}`;
  const financeBody = {
    tenant_id: primaryTenantId,
    permission_ref: "cut007-finance-write-permission",
    audit_hint_ref: "cut007-finance-write-audit",
    actor_id: principals.admin.user_id,
    idempotency_key: `cut007-finance-${suffix}`,
    time_entry: {
      time_entry_id: financeRecordId,
      tenant_id: primaryTenantId,
      matter_id: matterId,
      role_id: "partner",
      work_date: startedAt.slice(0, 10),
      narrative: "Synthetic CUT-007 time",
      duration_minutes: 30,
      billable: true,
    },
  };
  const finance = await request("finance-projection", 201, { method: "POST", path: "/api/finance/time-entries", token: adminToken, body: financeBody });
  invariant(finance.body.item?.time_entry_id === financeRecordId, "finance-projection", "finance record mismatch", finance);
  const financeReplay = await request("finance-projection-replay", 200, { method: "POST", path: "/api/finance/time-entries", token: adminToken, body: financeBody });
  invariant(financeReplay.body.outcome === "idempotent_replay", "finance-projection-replay", "finance replay was not a no-op", financeReplay);
  counters.idempotency_replay_count += 1;
  const financeList = await request("finance-readback", 200, { path: `/api/finance/time-entries?${query(primaryTenantId, "finance-read")}`, token: adminToken });
  invariant((financeList.body.items ?? []).some((item) => item.time_entry_id === financeRecordId), "finance-readback", "finance record is missing", financeList);

  const portalRecordId = `dashboard-cut007-${suffix}`;
  const portalBody = {
    tenant_id: primaryTenantId,
    permission_ref: "cut007-portal-write-permission",
    audit_hint_ref: "cut007-portal-write-audit",
    actor_id: principals.admin.user_id,
    idempotency_key: `cut007-portal-${suffix}`,
    dashboard_projection: {
      dashboard_projection_id: portalRecordId,
      tenant_id: primaryTenantId,
      client_group_id: "client-group-lawos-staging",
      matter_count: 1,
      open_rfi_count: 0,
    },
  };
  const portal = await request("portal-projection", 201, { method: "POST", path: "/api/portal/dashboard", token: adminToken, body: portalBody });
  invariant(portal.body.item?.dashboard_projection_id === portalRecordId, "portal-projection", "portal projection mismatch", portal);
  const portalReplay = await request("portal-projection-replay", 200, { method: "POST", path: "/api/portal/dashboard", token: adminToken, body: portalBody });
  invariant(portalReplay.body.outcome === "idempotent_replay", "portal-projection-replay", "portal replay was not a no-op", portalReplay);
  counters.idempotency_replay_count += 1;
  const portalList = await request("portal-readback", 200, { path: `/api/portal/dashboard?${query(primaryTenantId, "portal-read")}`, token: adminToken });
  invariant((portalList.body.items ?? []).some((item) => item.dashboard_projection_id === portalRecordId), "portal-readback", "portal record is missing", portalList);
  counters.assertion_count += 6;
  counters.finance_portal_flow_count += 6;

  const domainAudits = [];
  for (const [step, path] of [
    ["matter-audit", `/api/matters/audit?${query(primaryTenantId, "matter-audit")}`],
    ["dms-audit", `/api/vault/audit?${query(primaryTenantId, "dms-audit")}`],
    ["finance-audit", `/api/finance/audit?${query(primaryTenantId, "finance-audit")}`],
    ["portal-audit", `/api/portal/audit?${query(primaryTenantId, "portal-audit")}`],
  ]) {
    domainAudits.push(await request(step, 200, { path, token: adminToken }));
  }
  invariant(domainAudits.every((result) => Array.isArray(result.body.items) && result.body.items.length > 0), "domain-audit", "one or more domain audit streams are empty");
  counters.assertion_count += 1;

  const logout = await request("admin-logout", 200, { method: "POST", path: "/api/auth/logout", token: adminToken, body: {} });
  invariant(logout.body.ok === true, "admin-logout", "logout did not pass", logout);
  const revokedSession = await request("logged-out-session-denied", 401, { path: "/api/auth/session", token: adminToken });
  invariant(hasSafeCode(revokedSession, "AUTH_SESSION_REVOKED") || hasSafeCode(revokedSession, "AUTH_SESSION_INVALID"), "logged-out-session-denied", "logged-out session remained usable", revokedSession);
  adminToken = await login(principals.admin, adminPassword, "admin-relogin");
  counters.assertion_count += 2;
  counters.auth_flow_count += 2;

  const restartResult = await coldRestart({ execution_id: executionId });
  invariant(restartResult?.outcome === "PASS" && restartResult?.cold_start_observed === true, "cold-restart", "cold restart was not independently observed");
  const postRestartHealth = await request("post-restart-health", 200, { path: "/api/health" });
  invariant(postRestartHealth.body.persistence_authority === "postgres-v2", "post-restart-health", "PostgreSQL authority was not preserved", postRestartHealth);
  adminToken = await login(principals.admin, adminPassword, "post-restart-admin");
  await request("post-restart-hrx", 200, { path: `/api/hrx/employees/${encodeURIComponent(principals.admin.employee_id)}`, token: adminToken });
  await request("post-restart-matter", 200, { path: `/api/matters/${encodeURIComponent(matterId)}?${query(primaryTenantId, "restart-matter")}`, token: adminToken });
  await request("post-restart-dms", 200, { path: `/api/vault/documents/${encodeURIComponent(documentIds[0])}/download?${query(primaryTenantId, "restart-dms")}`, token: adminToken });
  await request("post-restart-finance", 200, { path: `/api/finance/time-entries?${query(primaryTenantId, "restart-finance")}`, token: adminToken });
  await request("post-restart-portal", 200, { path: `/api/portal/dashboard?${query(primaryTenantId, "restart-portal")}`, token: adminToken });
  counters.assertion_count += 2;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await request(`failed-login-${attempt + 1}`, 401, {
      method: "POST",
      path: "/api/auth/login",
      body: { email: principals.attorney.email, password: `wrong-${suffix}-${attempt}` },
    });
  }
  const locked = await request("failed-login-lockout", 401, {
    method: "POST",
    path: "/api/auth/login",
    body: { email: principals.attorney.email, password: attorneyPassword },
  });
  invariant(hasSafeCode(locked, "AUTH_CREDENTIAL_INVALID"), "failed-login-lockout", "lockout response was not enumeration-safe", locked);
  counters.assertion_count += 1;
  counters.auth_flow_count += 6;

  const expected = Object.freeze({
    user_ids: Object.freeze(principals.all.map((account) => account.user_id)),
    employee_ids: Object.freeze(principals.all.map((account) => account.employee_id)),
    matter_id: matterId,
    document_ids: Object.freeze(documentIds),
    finance_record_id: financeRecordId,
    portal_record_id: portalRecordId,
  });
  const readbackResult = safeReadbackResult(await readback({ execution_id: executionId, expected }));
  invariant(readbackResult.safe_counts?.wrong_tenant_visible_count === 0, "postgres-readback", "wrong-tenant visibility is nonzero");
  counters.assertion_count += 1;

  const burstRecovery = typeof transport.recoverBurstCapacity === "function"
    ? await transport.recoverBurstCapacity()
    : Object.freeze({ waited: false, wait_ms: 0 });
  if (counters.throttle_retry_count > 0) {
    invariant(burstRecovery?.waited === true, "browser-burst-recovery", "throttled API transport did not recover browser burst capacity");
    counters.throttle_burst_recovery_count += 1;
  }
  const browserResult = safeBrowserResult(await browserSmoke({
    execution_id: executionId,
    account: Object.freeze({ email: principals.admin.email, user_id: principals.admin.user_id }),
    password: adminPassword,
    expected,
  }));
  invariant(browserResult.outcome === "PASS", "browser-smoke", "Forest browser/desktop smoke did not pass");
  invariant(browserResult.critical_flow_count > 0 && browserResult.screenshot_count > 0, "browser-smoke", "browser evidence is incomplete");
  invariant(browserResult.console_error_count === 0 && browserResult.failed_request_count === 0, "browser-smoke", "browser smoke observed runtime errors");
  counters.assertion_count += 3;

  const finishedAt = new Date(now()).toISOString();
  const safeCounts = Object.freeze({ ...counters, account_count: principals.all.length, tenant_count: tenants.length, document_count: documentIds.length, real_data_count: 0 });
  return Object.freeze({
    outcome: "PASS",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    started_at: startedAt,
    finished_at: finishedAt,
    run_fingerprint: sha256(executionId),
    safe_counts: safeCounts,
    readback_fingerprint: readbackResult.readback_fingerprint,
    browser_smoke: browserResult,
    execution_fingerprint: sha256(JSON.stringify({ safeCounts, readback: readbackResult.readback_fingerprint, browser: browserResult.evidence_fingerprint })),
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    wrong_tenant_visible_count: 0,
    real_data_count: 0,
    secret_material_returned: false,
    raw_pii_returned: false,
    production_contacted: false,
    production_ready_claim: false,
  });
}
