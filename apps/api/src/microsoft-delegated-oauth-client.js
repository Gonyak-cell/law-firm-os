import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";

import {
  PEOPLE_OUTLOOK_DELEGATED_SCOPE,
} from "../../../packages/email-dms/src/people-outlook-connection-model.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  MICROSOFT_EGRESS_REDIRECT_URIS,
} from "./microsoft-egress-broker-transport.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const AUTHORIZATION_CODE_PATTERN = /^(?=.{1,4096}$)[\x21-\x7e]+$/u;
const PKCE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;
const OIDC_SCOPES = Object.freeze([
  "openid",
  "profile",
  "email",
  "offline_access",
]);
export const PEOPLE_OUTLOOK_OAUTH_SCOPES = Object.freeze([
  ...OIDC_SCOPES,
  PEOPLE_OUTLOOK_DELEGATED_SCOPE,
]);
export const CLIENT_OUTLOOK_OAUTH_SCOPES = Object.freeze([
  ...new Set([...OIDC_SCOPES, ...M365_GRAPH_REQUIRED_SCOPES]),
]);

const MICROSOFT_DELEGATED_OAUTH_SCOPE_PROFILES = Object.freeze({
  people_outlook: Object.freeze({
    scopes: PEOPLE_OUTLOOK_OAUTH_SCOPES,
    required_access_scopes: Object.freeze([PEOPLE_OUTLOOK_DELEGATED_SCOPE]),
    connection_scopes: Object.freeze([PEOPLE_OUTLOOK_DELEGATED_SCOPE]),
    redirect_profile: "people",
    redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
  }),
  client_outlook_addin: Object.freeze({
    scopes: CLIENT_OUTLOOK_OAUTH_SCOPES,
    required_access_scopes: Object.freeze(
      M365_GRAPH_REQUIRED_SCOPES.filter((scope) => scope !== "offline_access"),
    ),
    connection_scopes: M365_GRAPH_REQUIRED_SCOPES,
    redirect_profile: "client",
    redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.client,
  }),
});

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

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function providerError(code, message, status = 502) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function redirectUri(value) {
  const text = requiredText(value, "redirect_uri", 2048);
  const url = new URL(text);
  const allowed = url.protocol === "https:"
    || (
      url.protocol === "matter:"
      && url.hostname === "auth"
      && url.pathname === "/callback"
    );
  if (
    !allowed
    || url.username
    || url.password
    || url.hash
    || url.search
  ) {
    throw new TypeError("redirect_uri is not an approved callback URI");
  }
  return url.toString();
}

export function normalizeMicrosoftDelegatedOAuthConfig(input = {}) {
  return Object.freeze({
    tenant_id: requiredUuid(input.tenant_id, "tenant_id"),
    client_id: requiredUuid(input.client_id, "client_id"),
    client_secret: input.client_secret
      ? requiredText(input.client_secret, "client_secret", 4096)
      : null,
    redirect_uri: redirectUri(input.redirect_uri),
  });
}

function decodeJsonPart(value, name) {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
      throw new TypeError(`${name} is not an object`);
    }
    return decoded;
  } catch {
    throw providerError(
      "OUTLOOK_ID_TOKEN_INVALID",
      `Microsoft ${name} is invalid`,
      401,
    );
  }
}

function normalizedEmail(value) {
  const email = typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase()
    : "";
  if (
    !email
    || email.length > 320
    || !email.includes("@")
    || /[\u0000-\u001f\u007f\s]/u.test(email)
  ) {
    throw providerError(
      "OUTLOOK_ACCOUNT_EMAIL_INVALID",
      "Microsoft account email is invalid",
      403,
    );
  }
  return email;
}

function oauthScopeProfile(value) {
  const profile = MICROSOFT_DELEGATED_OAUTH_SCOPE_PROFILES[value];
  if (!profile) throw new TypeError("scope_profile is invalid");
  return profile;
}

function canonicalScope(value, profile) {
  let scope = String(value ?? "").trim();
  try {
    scope = decodeURIComponent(scope);
  } catch {
    throw providerError(
      "OUTLOOK_SCOPE_INSUFFICIENT",
      "Microsoft authorization returned an invalid scope",
      403,
    );
  }
  const graphPrefix = "https://graph.microsoft.com/";
  if (scope.toLowerCase().startsWith(graphPrefix)) {
    scope = scope.slice(graphPrefix.length);
  }
  return profile.scopes.find(
    (allowed) => allowed.toLowerCase() === scope.toLowerCase(),
  ) ?? scope;
}

function grantedScopes(value, profile) {
  const returnedScopes = String(value ?? "")
    .split(/\s+/u)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const scopes = (returnedScopes.length > 0
    ? returnedScopes
    : profile.required_access_scopes
  ).map((scope) => canonicalScope(scope, profile));
  const byLowercase = new Map(scopes.map((scope) => [scope.toLowerCase(), scope]));
  const missingScopes = profile.required_access_scopes.filter(
    (scope) => !byLowercase.has(scope.toLowerCase()),
  );
  if (missingScopes.length > 0) {
    throw providerError(
      "OUTLOOK_SCOPE_INSUFFICIENT",
      `Microsoft authorization did not grant ${missingScopes.join(", ")}`,
      403,
    );
  }
  const allowed = new Set(
    profile.scopes.map((scope) => scope.toLowerCase()),
  );
  const unexpectedGraphScope = scopes.find((scope) => (
    scope.includes(".") && !allowed.has(scope.toLowerCase())
  ));
  if (unexpectedGraphScope) {
    throw providerError(
      "OUTLOOK_SCOPE_OVERBROAD",
      "Microsoft authorization returned an unapproved Graph scope",
      403,
    );
  }
  return Object.freeze([...byLowercase.values()]);
}

function connectionScopes(scopes, profile) {
  const resolved = new Map(
    scopes.map((scope) => [scope.toLowerCase(), scope]),
  );
  if (profile.scopes.includes("offline_access")) {
    resolved.set("offline_access", "offline_access");
  }
  return Object.freeze([...resolved.values()]);
}

function tokenExpiry(body, now) {
  const expiresIn = Number(body?.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn < 60 || expiresIn > 86_400) {
    throw providerError(
      "OUTLOOK_TOKEN_RESPONSE_INVALID",
      "Microsoft token expiry is invalid",
    );
  }
  return new Date(now + (expiresIn * 1000)).toISOString();
}

export function createMicrosoftDelegatedOAuthClient({
  config: rawConfig,
  microsoft_egress_transport,
  clock = () => Date.now(),
  jwks_ttl_ms = 5 * 60 * 1000,
  scope_profile = "people_outlook",
} = {}) {
  const config = normalizeMicrosoftDelegatedOAuthConfig(rawConfig);
  const scopeProfile = oauthScopeProfile(scope_profile);
  for (const method of [
    "oauthJwksGet",
    "oauthTokenExchange",
    "oauthTokenRefresh",
  ]) {
    if (typeof microsoft_egress_transport?.[method] !== "function") {
      throw new TypeError(`Microsoft egress transport ${method} is required`);
    }
  }
  if (config.redirect_uri !== scopeProfile.redirect_uri) {
    throw new TypeError(
      `redirect_uri must match the ${scopeProfile.redirect_profile} broker profile`,
    );
  }
  if (typeof clock !== "function") throw new TypeError("clock is required");
  if (!Number.isSafeInteger(jwks_ttl_ms) || jwks_ttl_ms < 1) {
    throw new TypeError("jwks_ttl_ms must be a positive integer");
  }
  const authority = `https://login.microsoftonline.com/${config.tenant_id}`;
  const authorizeEndpoint = `${authority}/oauth2/v2.0/authorize`;
  let jwksCache = null;

  function nowMilliseconds() {
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

  async function providerOperation(method, request, operation) {
    try {
      return await microsoft_egress_transport[method](request);
    } catch (error) {
      if (error?.status === 400 || error?.status === 401) {
        throw providerError(
          "OUTLOOK_PROVIDER_REJECTED",
          `Microsoft ${operation} was rejected`,
          401,
        );
      }
      throw providerError(
        "OUTLOOK_PROVIDER_UNAVAILABLE",
        `Microsoft ${operation} request failed`,
        error?.status === 403 ? 403 : 503,
      );
    }
  }

  async function signingKey(kid) {
    const now = nowMilliseconds();
    if (!jwksCache || jwksCache.expires_at <= now) {
      const body = await providerOperation(
        "oauthJwksGet",
        { tenant_id: config.tenant_id },
        "signing key",
      );
      jwksCache = Object.freeze({
        keys: Object.freeze(Array.isArray(body.keys) ? body.keys : []),
        expires_at: now + jwks_ttl_ms,
      });
    }
    let jwk = jwksCache.keys.find((candidate) => (
      candidate?.kid === kid
      && candidate.kty === "RSA"
      && (candidate.use === undefined || candidate.use === "sig")
    ));
    if (!jwk) {
      jwksCache = null;
      const body = await providerOperation(
        "oauthJwksGet",
        { tenant_id: config.tenant_id },
        "signing key",
      );
      jwksCache = Object.freeze({
        keys: Object.freeze(Array.isArray(body.keys) ? body.keys : []),
        expires_at: now + jwks_ttl_ms,
      });
      jwk = jwksCache.keys.find((candidate) => (
        candidate?.kid === kid
        && candidate.kty === "RSA"
        && (candidate.use === undefined || candidate.use === "sig")
      ));
    }
    if (!jwk) {
      throw providerError(
        "OUTLOOK_SIGNING_KEY_UNKNOWN",
        "Microsoft signing key is unknown",
        401,
      );
    }
    return createPublicKey({ key: jwk, format: "jwk" });
  }

  async function verifyIdToken(idToken, {
    expected_nonce_hash,
    expected_email_hash,
    expected_subject_id = null,
  } = {}) {
    const parts = requiredText(idToken, "id_token", 32 * 1024).split(".");
    if (parts.length !== 3) {
      throw providerError(
        "OUTLOOK_ID_TOKEN_INVALID",
        "Microsoft ID token is invalid",
        401,
      );
    }
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = decodeJsonPart(headerPart, "ID token header");
    const claims = decodeJsonPart(payloadPart, "ID token payload");
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      throw providerError(
        "OUTLOOK_ID_TOKEN_INVALID",
        "Microsoft ID token algorithm is invalid",
        401,
      );
    }
    const verified = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
      await signingKey(header.kid),
      Buffer.from(signaturePart, "base64url"),
    );
    if (!verified) {
      throw providerError(
        "OUTLOOK_ID_TOKEN_INVALID",
        "Microsoft ID token signature is invalid",
        401,
      );
    }
    const nowSeconds = Math.floor(nowMilliseconds() / 1000);
    const issuer = `${authority}/v2.0`;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      claims.iss !== issuer
      || String(claims.tid ?? "").toLowerCase() !== config.tenant_id
      || !audiences.includes(config.client_id)
      || (audiences.length > 1 && !claims.azp)
      || (claims.azp && claims.azp !== config.client_id)
      || !Number.isFinite(claims.exp)
      || claims.exp <= nowSeconds
      || (claims.nbf != null && claims.nbf > nowSeconds + 60)
      || typeof claims.nonce !== "string"
      || sha256(claims.nonce) !== requiredText(
        expected_nonce_hash,
        "expected_nonce_hash",
        64,
      )
    ) {
      throw providerError(
        "OUTLOOK_ID_TOKEN_INVALID",
        "Microsoft ID token claims are invalid",
        401,
      );
    }
    const subjectId = requiredText(
      claims.oid ?? claims.sub,
      "Microsoft account subject",
      512,
    );
    if (expected_subject_id && subjectId !== expected_subject_id) {
      throw providerError(
        "OUTLOOK_ACCOUNT_MISMATCH",
        "Microsoft account does not match the existing connection",
        403,
      );
    }
    const mailboxAddress = normalizedEmail(
      claims.preferred_username ?? claims.email ?? claims.upn,
    );
    if (
      expected_email_hash != null
      && sha256(mailboxAddress)
        !== requiredText(expected_email_hash, "expected_email_hash", 64)
    ) {
      throw providerError(
        "OUTLOOK_ACCOUNT_MISMATCH",
        "Microsoft account does not match the signed LawOS account",
        403,
      );
    }
    return Object.freeze({
      provider_subject_id: subjectId,
      mailbox_address: mailboxAddress,
    });
  }

  return Object.freeze({
    provider: "microsoft-identity-platform",
    delegated_scope: scopeProfile.connection_scopes.length === 1
      ? scopeProfile.connection_scopes[0]
      : null,
    delegated_scopes: scopeProfile.connection_scopes,
    redirect_uri: config.redirect_uri,
    authorizationUrl({
      state,
      code_challenge,
      nonce,
      login_hint,
    } = {}) {
      const stateValue = requiredText(state, "state", 4096);
      const codeChallenge = requiredText(
        code_challenge,
        "code_challenge",
        128,
      );
      const nonceValue = requiredText(nonce, "nonce", 200);
      if (!PKCE_PATTERN.test(codeChallenge)) {
        throw new TypeError("code_challenge is invalid");
      }
      const url = new URL(authorizeEndpoint);
      const parameters = new URLSearchParams({
        client_id: config.client_id,
        response_type: "code",
        redirect_uri: config.redirect_uri,
        response_mode: "query",
        scope: scopeProfile.scopes.join(" "),
        state: stateValue,
        nonce: nonceValue,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      });
      if (login_hint != null && String(login_hint).trim()) {
        parameters.set("login_hint", normalizedEmail(login_hint));
      }
      url.search = parameters.toString();
      return url.toString();
    },
    async exchange({
      code,
      code_verifier,
      expected_nonce_hash,
      expected_email_hash,
      expected_subject_id = null,
    } = {}) {
      const authorizationCode = requiredText(code, "authorization code");
      const codeVerifier = requiredText(
        code_verifier,
        "code_verifier",
        128,
      );
      if (
        !AUTHORIZATION_CODE_PATTERN.test(authorizationCode)
        || !PKCE_PATTERN.test(codeVerifier)
      ) {
        throw providerError(
          "OUTLOOK_OAUTH_CALLBACK_INVALID",
          "Microsoft OAuth callback is invalid",
          400,
        );
      }
      const now = nowMilliseconds();
      const body = await providerOperation("oauthTokenExchange", {
        tenant_id: config.tenant_id,
        client_id: config.client_id,
        client_secret: config.client_secret,
        authorization_code: authorizationCode,
        code_verifier: codeVerifier,
        redirect_profile: scopeProfile.redirect_profile,
        scopes: scopeProfile.scopes,
      }, "authorization code exchange");
      const identity = await verifyIdToken(body.id_token, {
        expected_nonce_hash,
        expected_email_hash,
        expected_subject_id,
      });
      const refreshToken = requiredText(
        body.refresh_token,
        "refresh_token",
        32 * 1024,
      );
      return Object.freeze({
        ...identity,
        access_token: requiredText(body.access_token, "access_token", 32 * 1024),
        refresh_token: refreshToken,
        expires_at: tokenExpiry(body, now),
        granted_scopes: connectionScopes(
          grantedScopes(body.scope, scopeProfile),
          scopeProfile,
        ),
      });
    },
    async refresh({ refresh_token } = {}) {
      const currentRefreshToken = requiredText(
        refresh_token,
        "refresh_token",
        32 * 1024,
      );
      const now = nowMilliseconds();
      const body = await providerOperation("oauthTokenRefresh", {
        tenant_id: config.tenant_id,
        client_id: config.client_id,
        client_secret: config.client_secret,
        refresh_token: currentRefreshToken,
        scopes: scopeProfile.scopes,
      }, "token refresh");
      return Object.freeze({
        access_token: requiredText(body.access_token, "access_token", 32 * 1024),
        refresh_token: body.refresh_token
          ? requiredText(body.refresh_token, "refresh_token", 32 * 1024)
          : currentRefreshToken,
        expires_at: tokenExpiry(body, now),
        granted_scopes: connectionScopes(
          grantedScopes(body.scope, scopeProfile),
          scopeProfile,
        ),
      });
    },
  });
}
