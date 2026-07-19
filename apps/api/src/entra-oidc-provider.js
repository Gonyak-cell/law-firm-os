import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as verifySignature,
} from "node:crypto";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";

export const ENTRA_OIDC_PROVIDER_ID = "microsoft-entra-id-oidc";
export const LAWOS_ENTRA_OIDC_CONFIG_SECRET_ID_ENV = "LAWOS_ENTRA_OIDC_CONFIG_SECRET_ID";
export const DEFAULT_ENTRA_STEP_UP_MAX_AUTH_AGE_MS = 5 * 60 * 1000;

const PHISHING_RESISTANT_METHODS = new Set(["fido", "fido2", "webauthn"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function requireUuid(value, name) {
  const text = requiredText(value, name);
  if (!UUID_PATTERN.test(text)) throw new TypeError(`${name} must be a UUID`);
  return text.toLowerCase();
}

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function decodeJsonPart(value, name) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    const error = new Error(`Entra ${name} is invalid`);
    error.code = "LAWOS_ENTRA_TOKEN_INVALID";
    throw error;
  }
}

function codedError(message, code, status = 401) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code.replace(/^LAWOS_/u, ""),
    status,
  });
}

function normalizeConfig(input = {}) {
  const tenantId = requireUuid(input.tenant_id, "Entra tenant_id");
  const clientId = requireUuid(input.client_id, "Entra client_id");
  const redirectUris = [...new Set((input.redirect_uris ?? []).map((value) => requiredText(value, "Entra redirect_uri")))];
  if (!redirectUris.length) throw new TypeError("Entra redirect_uris are required");
  for (const redirectUri of redirectUris) {
    const parsed = new URL(redirectUri);
    if (!['https:', 'matter:'].includes(parsed.protocol)) throw new TypeError("Entra redirect_uri protocol is not allowed");
  }
  return Object.freeze({
    tenant_id: tenantId,
    client_id: clientId,
    client_secret: input.client_secret ? requiredText(input.client_secret, "Entra client_secret") : null,
    redirect_uris: Object.freeze(redirectUris),
    conditional_access_auth_context_id: requiredText(
      input.conditional_access_auth_context_id,
      "Entra conditional_access_auth_context_id",
    ),
  });
}

function claimList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase());
  if (typeof value === "string") return value.split(/\s+/u).filter(Boolean).map((item) => item.toLowerCase());
  return [];
}

function assertTokenClaims(claims, {
  config,
  expectedNonceHash,
  expectedUserId,
  maxAuthAgeMs,
  now,
} = {}) {
  const current = Math.floor((typeof now === "function" ? now() : Date.now()) / 1000);
  const issuer = `https://login.microsoftonline.com/${config.tenant_id}/v2.0`;
  if (claims.iss !== issuer || claims.tid?.toLowerCase() !== config.tenant_id) {
    throw codedError("Entra tenant or issuer is not authorized", "LAWOS_ENTRA_TENANT_DENIED", 403);
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(config.client_id)) throw codedError("Entra audience is invalid", "LAWOS_ENTRA_AUDIENCE_INVALID");
  if ((audiences.length > 1 && !claims.azp) || (claims.azp && claims.azp !== config.client_id)) {
    throw codedError("Entra authorized party is invalid", "LAWOS_ENTRA_AUTHORIZED_PARTY_INVALID");
  }
  if (!Number.isFinite(claims.exp) || claims.exp <= current || (claims.nbf != null && claims.nbf > current + 60)) {
    throw codedError("Entra token is expired or not active", "LAWOS_ENTRA_TOKEN_EXPIRED");
  }
  if (maxAuthAgeMs != null) {
    const maxAgeMs = Number(maxAuthAgeMs);
    const authTime = Number(claims.auth_time);
    if (
      !Number.isFinite(maxAgeMs)
      || maxAgeMs <= 0
      || !Number.isFinite(authTime)
      || authTime > current + 60
      || (current - authTime) * 1000 > maxAgeMs
    ) {
      throw codedError("Fresh Entra reauthentication is required", "LAWOS_ENTRA_REAUTHENTICATION_REQUIRED", 403);
    }
  }
  if (!claims.nonce || sha256(claims.nonce) !== expectedNonceHash) {
    throw codedError("Entra nonce is invalid", "LAWOS_ENTRA_NONCE_INVALID");
  }
  if (expectedUserId && claims.oid !== expectedUserId && claims.sub !== expectedUserId) {
    throw codedError("Entra subject does not match the requested account", "LAWOS_ENTRA_SUBJECT_MISMATCH", 403);
  }
  const methods = claimList(claims.amr);
  const contexts = new Set(claimList(claims.acrs));
  if (!methods.includes("mfa")) throw codedError("Entra MFA claim is required", "LAWOS_ENTRA_MFA_REQUIRED", 403);
  const phishingResistant = methods.some((method) => PHISHING_RESISTANT_METHODS.has(method));
  if (!phishingResistant) {
    throw codedError("Entra FIDO2 or WebAuthn authentication is required", "LAWOS_ENTRA_PHISHING_RESISTANT_MFA_REQUIRED", 403);
  }
  if (!contexts.has(config.conditional_access_auth_context_id.toLowerCase())) {
    throw codedError("Entra Conditional Access authentication context is required", "LAWOS_ENTRA_CONDITIONAL_ACCESS_REQUIRED", 403);
  }
  const email = String(claims.preferred_username ?? claims.email ?? "").trim().toLowerCase();
  if (!email) throw codedError("Entra account email is required", "LAWOS_ENTRA_ACCOUNT_UNMAPPED", 403);
  return Object.freeze({
    provider_id: ENTRA_OIDC_PROVIDER_ID,
    assertion_id: requiredText(claims.oid ?? claims.sub, "Entra subject"),
    tenant_id: config.tenant_id,
    email,
    display_name: String(claims.name ?? "").trim() || null,
    assurance_level: "phishing-resistant-mfa",
    factor: "fido2-webauthn",
    mfa: true,
    conditional_access_context: config.conditional_access_auth_context_id,
    authenticated_at: claims.auth_time != null && Number.isFinite(Number(claims.auth_time))
      ? new Date(Number(claims.auth_time) * 1000).toISOString()
      : null,
    issued_at: new Date(Number(claims.iat ?? current) * 1000).toISOString(),
    expires_at: new Date(Number(claims.exp) * 1000).toISOString(),
  });
}

export function createEntraOidcProvider({
  config: rawConfig,
  fetchFn = fetch,
  now = () => Date.now(),
  jwksTtlMs = 5 * 60 * 1000,
  stepUpMaxAuthAgeMs = DEFAULT_ENTRA_STEP_UP_MAX_AUTH_AGE_MS,
} = {}) {
  const config = normalizeConfig(rawConfig);
  if (!Number.isFinite(Number(stepUpMaxAuthAgeMs)) || Number(stepUpMaxAuthAgeMs) <= 0) {
    throw new TypeError("stepUpMaxAuthAgeMs must be a positive number");
  }
  const resolvedStepUpMaxAuthAgeMs = Number(stepUpMaxAuthAgeMs);
  const authority = `https://login.microsoftonline.com/${config.tenant_id}`;
  const authorizeEndpoint = `${authority}/oauth2/v2.0/authorize`;
  const tokenEndpoint = `${authority}/oauth2/v2.0/token`;
  const jwksEndpoint = `${authority}/discovery/v2.0/keys`;
  let jwksCache = null;

  async function signingKey(kid) {
    const current = typeof now === "function" ? now() : Date.now();
    if (!jwksCache || jwksCache.expires_at <= current) {
      const response = await fetchFn(jwksEndpoint, { headers: { accept: "application/json" } });
      if (!response.ok) throw codedError("Entra signing keys are unavailable", "LAWOS_ENTRA_JWKS_UNAVAILABLE", 503);
      const body = await response.json();
      jwksCache = Object.freeze({ keys: Object.freeze(body.keys ?? []), expires_at: current + jwksTtlMs });
    }
    let jwk = jwksCache.keys.find((candidate) => candidate.kid === kid && candidate.kty === "RSA" && candidate.use === "sig");
    if (!jwk) {
      jwksCache = null;
      const response = await fetchFn(jwksEndpoint, { headers: { accept: "application/json" } });
      if (!response.ok) throw codedError("Entra signing keys are unavailable", "LAWOS_ENTRA_JWKS_UNAVAILABLE", 503);
      const body = await response.json();
      jwksCache = Object.freeze({ keys: Object.freeze(body.keys ?? []), expires_at: current + jwksTtlMs });
      jwk = jwksCache.keys.find((candidate) => candidate.kid === kid && candidate.kty === "RSA" && candidate.use === "sig");
    }
    if (!jwk) throw codedError("Entra signing key is unknown", "LAWOS_ENTRA_SIGNING_KEY_UNKNOWN");
    return createPublicKey({ key: jwk, format: "jwk" });
  }

  async function verifyIdToken(idToken, { expected_nonce_hash, expected_user_id, max_auth_age_ms } = {}) {
    const parts = String(idToken ?? "").split(".");
    if (parts.length !== 3) throw codedError("Entra ID token is invalid", "LAWOS_ENTRA_TOKEN_INVALID");
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = decodeJsonPart(headerPart, "token header");
    if (header.alg !== "RS256" || !header.kid) throw codedError("Entra signing algorithm is invalid", "LAWOS_ENTRA_ALGORITHM_INVALID");
    const claims = decodeJsonPart(payloadPart, "token payload");
    const verified = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
      await signingKey(header.kid),
      Buffer.from(signaturePart, "base64url"),
    );
    if (!verified) throw codedError("Entra ID token signature is invalid", "LAWOS_ENTRA_SIGNATURE_INVALID");
    return assertTokenClaims(claims, {
      config,
      expectedNonceHash: requiredText(expected_nonce_hash, "expected_nonce_hash"),
      expectedUserId: expected_user_id,
      maxAuthAgeMs: max_auth_age_ms,
      now,
    });
  }

  function createAuthorizationRequest({ redirect_uri, code_challenge, login_hint, max_age_seconds } = {}) {
    const redirectUri = requiredText(redirect_uri, "redirect_uri");
    if (!config.redirect_uris.includes(redirectUri)) throw codedError("Entra redirect URI is not approved", "LAWOS_ENTRA_REDIRECT_URI_DENIED", 400);
    const codeChallenge = requiredText(code_challenge, "code_challenge");
    if (!/^[A-Za-z0-9_-]{43,128}$/u.test(codeChallenge)) throw codedError("PKCE code challenge is invalid", "LAWOS_ENTRA_PKCE_INVALID", 400);
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const url = new URL(authorizeEndpoint);
    const parameters = new URLSearchParams({
      client_id: config.client_id,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      login_hint: requiredText(login_hint, "login_hint"),
      claims: JSON.stringify({
        id_token: {
          acrs: { essential: true, values: [config.conditional_access_auth_context_id] },
        },
      }),
    });
    if (max_age_seconds != null) {
      const maxAgeSeconds = Number(max_age_seconds);
      if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
        throw codedError("Entra max_age is invalid", "LAWOS_ENTRA_MAX_AGE_INVALID", 400);
      }
      parameters.set("max_age", String(maxAgeSeconds));
    }
    url.search = parameters.toString();
    return Object.freeze({
      authorization_url: url.toString(),
      state,
      nonce_hash: sha256(nonce),
      redirect_uri_hash: sha256(redirectUri),
      code_challenge: codeChallenge,
      provider_id: ENTRA_OIDC_PROVIDER_ID,
      token_material_returned: true,
    });
  }

  async function exchangeAuthorizationCode({ code, redirect_uri, code_verifier } = {}) {
    const redirectUri = requiredText(redirect_uri, "redirect_uri");
    if (!config.redirect_uris.includes(redirectUri)) throw codedError("Entra redirect URI is not approved", "LAWOS_ENTRA_REDIRECT_URI_DENIED", 400);
    const form = new URLSearchParams({
      client_id: config.client_id,
      grant_type: "authorization_code",
      code: requiredText(code, "authorization code"),
      redirect_uri: redirectUri,
      code_verifier: requiredText(code_verifier, "code_verifier"),
      scope: "openid profile email",
    });
    if (config.client_secret) form.set("client_secret", config.client_secret);
    const response = await fetchFn(tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form.toString(),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.id_token !== "string") {
      throw codedError("Entra authorization code exchange failed", "LAWOS_ENTRA_CODE_EXCHANGE_FAILED", 401);
    }
    return Object.freeze({ id_token: body.id_token });
  }

  return Object.freeze({
    provider_id: ENTRA_OIDC_PROVIDER_ID,
    capabilities: Object.freeze({
      oidc: true,
      pkce_s256: true,
      mfa_required: true,
      phishing_resistant_required: true,
      conditional_access_required: true,
      step_up_max_auth_age_ms: resolvedStepUpMaxAuthAgeMs,
      local_password_login: false,
      default_totp: false,
    }),
    createAuthorizationRequest,
    exchangeAuthorizationCode,
    verifyIdToken,
    async completeAuthorization(input = {}) {
      const exchange = await exchangeAuthorizationCode(input);
      return verifyIdToken(exchange.id_token, {
        expected_nonce_hash: input.expected_nonce_hash,
        expected_user_id: input.expected_user_id,
        max_auth_age_ms: input.max_auth_age_ms,
      });
    },
    async verifyStepUp({ proof, principal, expected_nonce_hash } = {}) {
      const verification = await verifyIdToken(proof, {
        expected_nonce_hash,
        expected_user_id: principal?.entra_subject_id,
        max_auth_age_ms: resolvedStepUpMaxAuthAgeMs,
      });
      return Object.freeze({ ok: true, ...verification });
    },
  });
}

export async function createEntraOidcProviderFromSecretReference({
  env = process.env,
  secretsClient,
  fetchFn = fetch,
  now,
} = {}) {
  const secretId = requiredText(env[LAWOS_ENTRA_OIDC_CONFIG_SECRET_ID_ENV], LAWOS_ENTRA_OIDC_CONFIG_SECRET_ID_ENV);
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION ?? "ap-northeast-2", "AWS region");
  const config = await resolveAwsJsonSecret({ secretId, region, client: secretsClient });
  return createEntraOidcProvider({ config, fetchFn, now });
}
