import { createHmac, timingSafeEqual } from "node:crypto";
import { createHrxStepUpSession } from "../../../packages/authz/src/hrx-step-up-session.js";
import {
  LAWOS_RUNTIME_PROFILES,
  resolveRuntimeProfile,
  runtimePreflightError,
} from "./runtime-profile.js";

export const HRX_STEP_UP_TOKEN_PREFIX = "lawos_hrx_step_up_v1";
export const HRX_STEP_UP_TOKEN_CONTRACT_REF = "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-04";

export const HRX_STEP_UP_DEFAULT_SECRET = "lawos-local-wave1-hrx-step-up-secret";
export const HRX_STEP_UP_DEFAULT_TOTP_SECRET = "lawos-local-wave1-hrx-step-up-totp-secret";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TOTP_STEP_MS = 30 * 1000;

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeBase64UrlJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hmac(secret, value) {
  return createHmac("sha256", secret).update(value, "utf8").digest("base64url");
}

function hmacBytes(secret, value) {
  return createHmac("sha256", secret).update(value, "utf8").digest();
}

function currentMs(now) {
  const value = typeof now === "function" ? now() : now;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  return Date.now();
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertOperationalStepUpSecret(value, { envName, knownDefault }) {
  const secret = clean(value);
  if (!secret) {
    throw runtimePreflightError(`${envName} is required for operational runtime profile`);
  }
  if (secret === knownDefault) {
    throw runtimePreflightError(`${envName} must not use the local default for operational runtime profile`);
  }
  if (secret.length < 32) {
    throw runtimePreflightError(`${envName} must be at least 32 characters for operational runtime profile`);
  }
  return secret;
}

export function resolveHrxStepUpConfig({
  env = process.env,
  profile = resolveRuntimeProfile(env),
  secret,
  totpSecret,
} = {}) {
  const resolvedProfile = resolveRuntimeProfile({ ...env, LAWOS_RUNTIME_PROFILE: profile });
  const configuredSecret = secret === undefined ? env.LAWOS_HRX_STEP_UP_SECRET : secret;
  const configuredTotpSecret = totpSecret === undefined ? env.LAWOS_HRX_STEP_UP_TOTP_SECRET : totpSecret;
  if (resolvedProfile === LAWOS_RUNTIME_PROFILES.operational) {
    return Object.freeze({
      secret: assertOperationalStepUpSecret(configuredSecret, {
        envName: "LAWOS_HRX_STEP_UP_SECRET",
        knownDefault: HRX_STEP_UP_DEFAULT_SECRET,
      }),
      totpSecret: assertOperationalStepUpSecret(configuredTotpSecret, {
        envName: "LAWOS_HRX_STEP_UP_TOTP_SECRET",
        knownDefault: HRX_STEP_UP_DEFAULT_TOTP_SECRET,
      }),
    });
  }
  return Object.freeze({
    secret: clean(configuredSecret) || HRX_STEP_UP_DEFAULT_SECRET,
    totpSecret: clean(configuredTotpSecret) || HRX_STEP_UP_DEFAULT_TOTP_SECRET,
  });
}

function normalizePrincipal(principal = {}) {
  const tenantId = clean(principal.tenant_id ?? principal.tenantId);
  const actorId = clean(principal.user_id ?? principal.actor_id ?? principal.actorId);
  return Object.freeze({ tenantId, actorId });
}

function errorBody(requestId, safeErrorCode, reason) {
  return Object.freeze({
    request_id: requestId,
    outcome: "blocked",
    ok: false,
    reason,
    safe_error_codes: Object.freeze([safeErrorCode]),
    step_up_required: true,
    token_material_returned: false,
    production_ready_claim: false,
  });
}

function totpInput({ tenant_id, tenantId, actor_id, actorId, purpose } = {}, window) {
  return [
    clean(tenant_id ?? tenantId),
    clean(actor_id ?? actorId),
    clean(purpose),
    window,
  ].join(".");
}

export function createHrxStepUpAuthority({
  secret,
  totpSecret,
  profile,
  env = process.env,
  ttlMs = Number(process.env.LAWOS_HRX_STEP_UP_TTL_MS || DEFAULT_TTL_MS),
  totpStepMs = DEFAULT_TOTP_STEP_MS,
  now = () => Date.now(),
} = {}) {
  const config = resolveHrxStepUpConfig({ env, profile, secret, totpSecret });
  secret = config.secret;
  totpSecret = config.totpSecret;
  const nowMs = () => currentMs(now);
  const nowIso = () => new Date(nowMs()).toISOString();

  function totpForWindow(input, window) {
    const digest = hmacBytes(totpSecret, totpInput(input, window));
    const numeric = (digest.readUInt32BE(0) & 0x7fffffff) % 1_000_000;
    return String(numeric).padStart(6, "0");
  }

  function generateTotp(input = {}, { at } = {}) {
    const timestamp = at === undefined ? nowMs() : currentMs(at);
    const window = Math.floor(timestamp / totpStepMs);
    return totpForWindow(input, window);
  }

  function verifyTotp(input = {}, code) {
    const supplied = clean(code);
    if (!/^\d{6}$/.test(supplied)) return false;
    const window = Math.floor(nowMs() / totpStepMs);
    return [-1, 0, 1].some((offset) => safeEqual(supplied, totpForWindow(input, window + offset)));
  }

  function sign(payloadPart) {
    return hmac(secret, payloadPart);
  }

  function issueVerifiedSession({ normalized, resolvedPurpose, requestId }) {
    const issuedAtMs = nowMs();
    const session = createHrxStepUpSession({
      tenant_id: normalized.tenantId,
      actor_id: normalized.actorId,
      purpose: resolvedPurpose,
      mfa: true,
      assurance_level: 2,
      issued_at: new Date(issuedAtMs).toISOString(),
      expires_at: new Date(issuedAtMs + ttlMs).toISOString(),
    });
    const payloadPart = base64UrlJson({
      typ: HRX_STEP_UP_TOKEN_PREFIX,
      ...session,
      iat: Date.parse(session.issued_at),
      exp: Date.parse(session.expires_at),
    });
    const stepUpToken = `${HRX_STEP_UP_TOKEN_PREFIX}.${payloadPart}.${sign(payloadPart)}`;
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "passed",
        ok: true,
        token_type: "HrxStepUp",
        step_up_token: stepUpToken,
        step_up_session: session,
        contract_ref: HRX_STEP_UP_TOKEN_CONTRACT_REF,
        expires_at: session.expires_at,
        token_material_returned: true,
        production_ready_claim: false,
      }),
    });
  }

  function validateIssueContext(principal, purpose, requestId) {
    const normalized = normalizePrincipal(principal);
    const resolvedPurpose = clean(purpose);
    if (!normalized.tenantId || !normalized.actorId) {
      return Object.freeze({ error: Object.freeze({
        status: 401,
        body: errorBody(requestId, "HRX_STEP_UP_SESSION_REQUIRED", "hrx_step_up_session_required"),
      }) });
    }
    if (!resolvedPurpose) {
      return Object.freeze({ error: Object.freeze({
        status: 400,
        body: errorBody(requestId, "HRX_STEP_UP_PURPOSE_REQUIRED", "hrx_step_up_purpose_required"),
      }) });
    }
    return Object.freeze({ normalized, resolvedPurpose });
  }

  function issue({ principal = {}, purpose, totp_code, requestId = "req_unset" } = {}) {
    const context = validateIssueContext(principal, purpose, requestId);
    if (context.error) return context.error;
    const totpContext = {
      tenant_id: context.normalized.tenantId,
      actor_id: context.normalized.actorId,
      purpose: context.resolvedPurpose,
    };
    if (!verifyTotp(totpContext, totp_code)) {
      return Object.freeze({
        status: 403,
        body: errorBody(requestId, "HRX_STEP_UP_TOTP_INVALID", "hrx_step_up_totp_invalid"),
      });
    }
    return issueVerifiedSession({ ...context, requestId });
  }

  function issueVerified({ principal = {}, purpose, provider_verification: verification, requestId = "req_unset" } = {}) {
    const context = validateIssueContext(principal, purpose, requestId);
    if (context.error) return context.error;
    if (verification?.ok !== true || !clean(verification.provider_id) || !clean(verification.assertion_id)) {
      return Object.freeze({
        status: 403,
        body: errorBody(requestId, "HRX_STEP_UP_PROVIDER_INVALID", "hrx_step_up_provider_invalid"),
      });
    }
    return issueVerifiedSession({ ...context, requestId });
  }

  function verify(token) {
    const parts = String(token ?? "").split(".");
    if (parts.length !== 3 || parts[0] !== HRX_STEP_UP_TOKEN_PREFIX) {
      return Object.freeze({ ok: false, reason: "hrx_step_up_token_invalid" });
    }
    const [, payloadPart, signature] = parts;
    if (!safeEqual(signature, sign(payloadPart))) {
      return Object.freeze({ ok: false, reason: "hrx_step_up_token_invalid" });
    }

    let payload;
    try {
      payload = decodeBase64UrlJson(payloadPart);
    } catch {
      return Object.freeze({ ok: false, reason: "hrx_step_up_token_invalid" });
    }
    if (payload.typ !== HRX_STEP_UP_TOKEN_PREFIX) {
      return Object.freeze({ ok: false, reason: "hrx_step_up_token_invalid" });
    }
    if (Number(payload.exp) <= nowMs()) {
      return Object.freeze({ ok: false, reason: "hrx_step_up_token_expired" });
    }
    return Object.freeze({
      ok: true,
      source: "signed_step_up_token",
      token: Object.freeze({
        session_id: payload.session_id,
        tenant_id: payload.tenant_id,
        actor_id: payload.actor_id,
        purpose: payload.purpose,
        mfa: payload.mfa,
        assurance_level: payload.assurance_level,
        issued_at: payload.issued_at,
        expires_at: payload.expires_at,
        revoked_at: payload.revoked_at ?? null,
      }),
    });
  }

  return Object.freeze({
    issue,
    issueVerified,
    verify,
    generateTotp,
    nowIso,
    contract_ref: HRX_STEP_UP_TOKEN_CONTRACT_REF,
  });
}
