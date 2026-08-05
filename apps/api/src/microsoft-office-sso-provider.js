import {
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";

export const MICROSOFT_OFFICE_SSO_PROVIDER_ID =
  "microsoft-office-naa-sso";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const JWT_PART_PATTERN = /^[A-Za-z0-9_-]+$/u;
const CLOCK_SKEW_SECONDS = 60;

function requiredText(value, name, maxLength = 4096) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) {
    throw new TypeError(`${name} is required`);
  }
  return text;
}

function requiredUuid(value, name) {
  const text = requiredText(value, name, 64);
  if (!UUID_PATTERN.test(text)) throw new TypeError(`${name} must be a UUID`);
  return text.toLowerCase();
}

function normalizedEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (
    !email
    || email.length > 320
    || /\s/u.test(email)
    || email.startsWith("@")
    || email.endsWith("@")
    || email.indexOf("@") !== email.lastIndexOf("@")
  ) {
    throw providerError(
      "OFFICE_SSO_ACCOUNT_UNMAPPED",
      "Microsoft account email is invalid",
      403,
    );
  }
  return email;
}

function providerError(code, message, status = 401) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function normalizeConfig(input = {}) {
  const tenantId = requiredUuid(input.tenant_id, "Office SSO tenant_id");
  const clientId = requiredUuid(input.client_id, "Office SSO client_id");
  const callbackUri = new URL(requiredText(
    input.callback_uri,
    "Office SSO callback_uri",
    2048,
  ));
  if (
    callbackUri.protocol !== "https:"
    || callbackUri.username
    || callbackUri.password
    || callbackUri.hash
  ) {
    throw new TypeError("Office SSO callback_uri must be HTTPS");
  }
  return Object.freeze({
    tenant_id: tenantId,
    client_id: clientId,
    api_scope: `api://${clientId}/access_as_user`,
    callback_uri: callbackUri.toString(),
  });
}

function decodeJsonPart(value, name) {
  if (
    typeof value !== "string"
    || !JWT_PART_PATTERN.test(value)
    || Buffer.from(value, "base64url").toString("base64url") !== value
  ) {
    throw providerError(
      "OFFICE_SSO_ACCESS_TOKEN_INVALID",
      `Microsoft access token ${name} is invalid`,
    );
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("JWT part must be an object");
    }
    return parsed;
  } catch {
    throw providerError(
      "OFFICE_SSO_ACCESS_TOKEN_INVALID",
      `Microsoft access token ${name} is invalid`,
    );
  }
}

function nowMilliseconds(clock) {
  const value = clock();
  const milliseconds = value instanceof Date
    ? value.getTime()
    : Number.isFinite(Number(value))
      ? Number(value)
      : Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("clock must return a valid instant");
  }
  return milliseconds;
}

function accessTokenClaims(claims, config, clock) {
  const current = Math.floor(nowMilliseconds(clock) / 1000);
  const issuer = `https://login.microsoftonline.com/${config.tenant_id}/v2.0`;
  if (
    claims.iss !== issuer
    || claims.tid !== config.tenant_id
  ) {
    throw providerError(
      "OFFICE_SSO_TENANT_DENIED",
      "Microsoft access token tenant or issuer is not authorized",
      403,
    );
  }
  if (claims.ver !== "2.0") {
    throw providerError(
      "OFFICE_SSO_TOKEN_VERSION_INVALID",
      "Microsoft v2 access token is required",
    );
  }
  if (claims.aud !== config.client_id) {
    throw providerError(
      "OFFICE_SSO_AUDIENCE_INVALID",
      "Microsoft access token audience is invalid",
    );
  }
  if (claims.azp !== config.client_id) {
    throw providerError(
      "OFFICE_SSO_AUTHORIZED_PARTY_INVALID",
      "Microsoft access token authorized party is invalid",
    );
  }
  if (
    !Number.isInteger(claims.exp)
    || !Number.isInteger(claims.nbf)
    || !Number.isInteger(claims.iat)
    || claims.exp <= current
    || claims.nbf > current + CLOCK_SKEW_SECONDS
    || claims.iat > current + CLOCK_SKEW_SECONDS
    || claims.nbf >= claims.exp
    || claims.iat >= claims.exp
  ) {
    throw providerError(
      "OFFICE_SSO_ACCESS_TOKEN_EXPIRED",
      "Microsoft access token is expired or not active",
    );
  }
  if (Object.hasOwn(claims, "roles")) {
    throw providerError(
      "OFFICE_SSO_APP_ONLY_TOKEN_DENIED",
      "Microsoft application-only tokens are not allowed",
      403,
    );
  }
  const delegatedScopes = typeof claims.scp === "string"
    ? claims.scp.trim().split(/\s+/u).filter(Boolean)
    : [];
  if (
    delegatedScopes.length !== 1
    || delegatedScopes[0] !== "access_as_user"
  ) {
    throw providerError(
      "OFFICE_SSO_SCOPE_REQUIRED",
      "Microsoft delegated access_as_user scope is required",
      403,
    );
  }
  const subjectId = typeof claims.oid === "string"
    ? claims.oid
    : "";
  if (!UUID_PATTERN.test(subjectId)) {
    throw providerError(
      "OFFICE_SSO_SUBJECT_REQUIRED",
      "Microsoft account oid is required",
      403,
    );
  }
  const rawEmail = claims.preferred_username ?? claims.email ?? claims.upn;
  const email = rawEmail == null ? null : normalizedEmail(rawEmail);
  return Object.freeze({
    provider_id: MICROSOFT_OFFICE_SSO_PROVIDER_ID,
    tenant_id: config.tenant_id,
    assertion_id: subjectId,
    email,
    display_name: String(claims.name ?? "").trim() || null,
    assurance_level: "microsoft-office-naa",
    delegated_scopes: Object.freeze([...new Set(delegatedScopes)]),
    api_scope: config.api_scope,
    issued_at: new Date(claims.iat * 1000).toISOString(),
    not_before: new Date(claims.nbf * 1000).toISOString(),
    expires_at: new Date(claims.exp * 1000).toISOString(),
    token_material_returned: false,
  });
}

export function createMicrosoftOfficeSsoProvider({
  config: rawConfig,
  microsoft_egress_transport,
  clock = () => Date.now(),
  jwks_ttl_ms = 5 * 60 * 1000,
} = {}) {
  const config = normalizeConfig(rawConfig);
  if (typeof microsoft_egress_transport?.oauthJwksGet !== "function") {
    throw new TypeError("Microsoft egress transport oauthJwksGet is required");
  }
  if (typeof clock !== "function") throw new TypeError("clock is required");
  if (!Number.isSafeInteger(jwks_ttl_ms) || jwks_ttl_ms < 1) {
    throw new TypeError("jwks_ttl_ms must be a positive integer");
  }
  let jwksCache = null;

  async function fetchSigningKeys() {
    let body;
    try {
      body = await microsoft_egress_transport.oauthJwksGet({
        tenant_id: config.tenant_id,
      });
    } catch {
      throw providerError(
        "OFFICE_SSO_JWKS_UNAVAILABLE",
        "Microsoft signing keys are unavailable",
        503,
      );
    }
    const keys = Array.isArray(body?.keys) ? body.keys : [];
    if (keys.length === 0 || keys.length > 50) {
      throw providerError(
        "OFFICE_SSO_JWKS_UNAVAILABLE",
        "Microsoft signing keys are unavailable",
        503,
      );
    }
    jwksCache = Object.freeze({
      keys: Object.freeze([...keys]),
      expires_at: nowMilliseconds(clock) + jwks_ttl_ms,
    });
  }

  async function signingKey(kid) {
    const matches = (candidate) => (
      candidate?.kid === kid
      && candidate.kty === "RSA"
      && (candidate.use === undefined || candidate.use === "sig")
      && (candidate.alg === undefined || candidate.alg === "RS256")
      && typeof candidate.n === "string"
      && typeof candidate.e === "string"
    );
    if (!jwksCache || jwksCache.expires_at <= nowMilliseconds(clock)) {
      await fetchSigningKeys();
    }
    let jwk = jwksCache.keys.find(matches);
    if (!jwk) {
      jwksCache = null;
      await fetchSigningKeys();
      jwk = jwksCache.keys.find(matches);
    }
    if (!jwk) {
      throw providerError(
        "OFFICE_SSO_SIGNING_KEY_UNKNOWN",
        "Microsoft signing key is unknown",
      );
    }
    try {
      return createPublicKey({ key: jwk, format: "jwk" });
    } catch {
      throw providerError(
        "OFFICE_SSO_SIGNING_KEY_INVALID",
        "Microsoft signing key is invalid",
      );
    }
  }

  async function verifyAccessToken(accessToken) {
    const parts = requiredText(
      accessToken,
      "access_token",
      32 * 1024,
    ).split(".");
    if (
      parts.length !== 3
      || parts.some((part) => !part || !JWT_PART_PATTERN.test(part))
    ) {
      throw providerError(
        "OFFICE_SSO_ACCESS_TOKEN_INVALID",
        "Microsoft access token is invalid",
      );
    }
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = decodeJsonPart(headerPart, "header");
    if (
      header.alg !== "RS256"
      || typeof header.kid !== "string"
      || !header.kid
      || header.kid.length > 512
    ) {
      throw providerError(
        "OFFICE_SSO_ALGORITHM_INVALID",
        "Microsoft access token signing algorithm is invalid",
      );
    }
    const claims = decodeJsonPart(payloadPart, "payload");
    const signature = Buffer.from(signaturePart, "base64url");
    let verified = false;
    try {
      verified = verifySignature(
        "RSA-SHA256",
        Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
        await signingKey(header.kid),
        signature,
      );
    } catch (error) {
      if (error?.safe_error_code) throw error;
    }
    if (
      signature.toString("base64url") !== signaturePart
      || signature.byteLength === 0
      || !verified
    ) {
      throw providerError(
        "OFFICE_SSO_SIGNATURE_INVALID",
        "Microsoft access token signature is invalid",
      );
    }
    return accessTokenClaims(claims, config, clock);
  }

  return Object.freeze({
    provider_id: MICROSOFT_OFFICE_SSO_PROVIDER_ID,
    public_config: Object.freeze({ ...config }),
    verifyAccessToken,
  });
}
