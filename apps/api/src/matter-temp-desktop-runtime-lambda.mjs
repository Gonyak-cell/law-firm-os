import https from "node:https";
import { createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  MATTER_VAULT_USER_REGISTRATION_SEED,
  findRegisteredAccountByEmail,
  normalizeAccountEmail,
  registeredAccountPublicRef,
} from "./matter-vault-account-registry.js";

const seed = MATTER_VAULT_USER_REGISTRATION_SEED;

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-matter-actor-email"
});

const FEATURE_CATALOG = Object.freeze([
  {
    feature_id: "matter_vault_dashboard",
    label: "Matter-Vault dashboard",
    minimum_role: "matter_vault_user",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_search",
    label: "Matter-Vault search",
    minimum_role: "matter_vault_user",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_file_bridge",
    label: "Desktop file bridge handoff",
    minimum_role: "matter_vault_user",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_audit",
    label: "Matter-Vault audit read",
    minimum_role: "matter_vault_admin",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_admin",
    label: "Matter-Vault admin controls",
    minimum_role: "system_super_admin",
    synthetic_runtime_supported: true
  }
]);

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const PASSWORD_HASH_ITERATIONS = 120_000;
const PASSWORD_MIN_LENGTH = 8;
const MAX_PERSISTED_RESET_TOKENS = 20;
const MAX_PERSISTED_OUTBOX_MESSAGES = 20;

const memoryAuthState = (globalThis.__matterDesktopAuthState ??= {
  passwordCredentials: new Map(),
  resetTokens: new Map(),
  outbox: [],
  sessionGeneration: new Map()
});

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  };
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

function hashOpaqueToken(token) {
  return `sha256:${sha256Hex(token)}`;
}

function normalizeEmail(email) {
  return normalizeAccountEmail(email);
}

function hashPassword(password, salt = randomBytes(16).toString("base64url")) {
  const hash = pbkdf2Sync(String(password), salt, PASSWORD_HASH_ITERATIONS, 32, "sha256").toString("hex");
  return {
    algorithm: "pbkdf2-sha256",
    iterations: PASSWORD_HASH_ITERATIONS,
    salt,
    hash
  };
}

function verifyPassword(credential, password) {
  if (!credential?.hash || !credential?.salt) return false;
  const candidate = hashPassword(password, credential.salt);
  return safeEqualHex(candidate.hash, credential.hash);
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(String(left)) || !/^[a-f0-9]{64}$/i.test(String(right))) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function persistentAuthStateSecretName() {
  return process.env.MATTER_DESKTOP_AUTH_STATE_SECRET_NAME ?? process.env.AUTH_STATE_SECRET_NAME ?? "";
}

function emptyAuthState() {
  return {
    passwordCredentials: new Map(),
    resetTokens: new Map(),
    outbox: [],
    sessionGeneration: new Map()
  };
}

function pruneAuthState(state) {
  const now = Date.now();
  const activeResetEntries = [...state.resetTokens.entries()]
    .filter(([, reset]) => !reset.used_at && Date.parse(reset.expires_at) > now)
    .sort(([, left], [, right]) => Date.parse(right.expires_at) - Date.parse(left.expires_at))
    .slice(0, MAX_PERSISTED_RESET_TOKENS);
  const activeResetHashes = new Set(activeResetEntries.map(([tokenHash]) => tokenHash));

  state.resetTokens.clear();
  for (const [tokenHash, reset] of activeResetEntries) state.resetTokens.set(tokenHash, reset);

  state.outbox = state.outbox
    .filter((message) => {
      const resetToken = String(message.reset_token ?? "");
      return Date.parse(message.expires_at) > now && activeResetHashes.has(hashOpaqueToken(resetToken));
    })
    .slice(-MAX_PERSISTED_OUTBOX_MESSAGES);

  return state;
}

function authStateToSecretString(state) {
  pruneAuthState(state);
  return JSON.stringify({
    schema_version: "law-firm-os.matter-desktop-auth-state.v0.1",
    updated_at: new Date().toISOString(),
    password_credentials: Object.fromEntries(state.passwordCredentials),
    reset_tokens: Object.fromEntries(state.resetTokens),
    outbox: state.outbox.slice(-100),
    session_generation: Object.fromEntries(state.sessionGeneration)
  });
}

function authStateFromSecretString(secretString = "{}") {
  const parsed = JSON.parse(secretString || "{}");
  return {
    passwordCredentials: new Map(Object.entries(parsed.password_credentials ?? {})),
    resetTokens: new Map(Object.entries(parsed.reset_tokens ?? {})),
    outbox: Array.isArray(parsed.outbox) ? parsed.outbox : [],
    sessionGeneration: new Map(Object.entries(parsed.session_generation ?? {}).map(([key, value]) => [key, Number(value) || 0]))
  };
}

function awsJsonRpcRequest({ service, target, body }) {
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-northeast-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  if (!accessKeyId || !secretAccessKey) throw new Error("aws_credentials_unavailable");

  const host = `${service}.${region}.amazonaws.com`;
  const payload = JSON.stringify(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers = {
    "content-type": "application/x-amz-json-1.1",
    host,
    "x-amz-date": amzDate,
    "x-amz-target": target
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, sha256Hex(payload)].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");

  return new Promise((resolvePromise, reject) => {
    const request = https.request(
      {
        method: "POST",
        hostname: host,
        path: "/",
        headers: {
          ...headers,
          authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
          "content-length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            const error = new Error(parsed.__type ?? parsed.code ?? `aws_${service}_error`);
            error.statusCode = res.statusCode;
            error.body = parsed;
            reject(error);
            return;
          }
          resolvePromise(parsed);
        });
      }
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function loadAuthState() {
  const secretName = persistentAuthStateSecretName();
  if (!secretName) return memoryAuthState;
  try {
    const result = await awsJsonRpcRequest({
      service: "secretsmanager",
      target: "secretsmanager.GetSecretValue",
      body: { SecretId: secretName }
    });
    return authStateFromSecretString(result.SecretString);
  } catch (error) {
    if (String(error.message).includes("ResourceNotFoundException")) return emptyAuthState();
    throw error;
  }
}

async function saveAuthState(state) {
  const secretName = persistentAuthStateSecretName();
  if (!secretName) return;
  await awsJsonRpcRequest({
    service: "secretsmanager",
    target: "secretsmanager.PutSecretValue",
    body: {
      SecretId: secretName,
      SecretString: authStateToSecretString(state),
      ClientRequestToken: randomUUID()
    }
  });
}

function headerValue(headers = {}, name) {
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === normalizedName) return value;
  }
  return undefined;
}

function bearerToken(event = {}) {
  const authorization = headerValue(event.headers, "authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization));
  return match?.[1]?.trim();
}

function requireOperatorToken(event = {}) {
  const expectedHash = process.env.OPERATOR_TOKEN_SHA256 ?? "";
  if (!expectedHash) {
    return response(503, {
      ok: false,
      reason: "operator_token_not_configured",
      token_material_returned: false
    });
  }
  const token = bearerToken(event);
  if (!token) {
    return response(401, {
      ok: false,
      reason: "operator_token_required",
      token_material_returned: false
    });
  }
  if (!safeEqualHex(sha256Hex(token), expectedHash)) {
    return response(403, {
      ok: false,
      reason: "operator_token_invalid",
      token_material_returned: false
    });
  }
  return null;
}

function parseBody(event = {}) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(raw);
}

function users(state) {
  return seed.users.map((user) => ({
    ...registeredAccountPublicRef(user),
    password_state: state.passwordCredentials.has(normalizeEmail(user.email)) ? "password_set" : "reset_required"
  }));
}

function findUser(email) {
  return findRegisteredAccountByEmail(email, seed);
}

function sessionFor(user, state) {
  const email = normalizeEmail(user.email);
  return {
    state: "signed_in",
    mode: "aws-temporary-execute-api",
    synthetic_only: true,
    tenant_id: seed.tenant_id,
    user_id: user.user_id,
    email: user.email,
    display_name: user.display_name,
    highest_privilege: user.highest_privilege,
    privilege_rank: user.privilege_rank,
    role_ids: user.role_ids,
    group_ids: user.group_ids,
    scopes: user.scopes,
    session_generation: state.sessionGeneration.get(email) ?? 0,
    token_material_returned: false
  };
}

function featureAccessFor(user) {
  return FEATURE_CATALOG.map((feature) => {
    const allowed =
      feature.minimum_role === "matter_vault_user"
        ? user.role_ids.includes("matter_vault_user")
        : user.role_ids.includes(feature.minimum_role);
    return {
      ...feature,
      allowed,
      decision: allowed ? "allow" : "deny"
    };
  });
}

function actorFromEvent(event = {}, body = {}) {
  return (
    body.email ??
    body.actor_email ??
    event.headers?.["x-matter-actor-email"] ??
    event.headers?.["X-Matter-Actor-Email"] ??
    event.queryStringParameters?.email ??
    event.queryStringParameters?.actor_email
  );
}

function publicResetUrl(token) {
  return `matter://password-reset/confirm?token=${encodeURIComponent(token)}`;
}

function requestPasswordReset(body = {}, state) {
  const email = normalizeEmail(body.email);
  const user = findUser(email);
  if (user) {
    const token = createOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
    const normalizedUserEmail = normalizeEmail(user.email);
    for (const reset of state.resetTokens.values()) {
      if (reset.email === normalizedUserEmail && !reset.used_at) reset.used_at = new Date().toISOString();
    }
    state.resetTokens.set(tokenHash, {
      token_hash: tokenHash,
      email: normalizedUserEmail,
      user_id: user.user_id,
      expires_at: expiresAt,
      used_at: null
    });
    state.outbox.push({
      id: `synthetic-reset-${state.outbox.length + 1}`,
      to: user.email,
      subject: "matter password reset",
      body: "Use this one-time matter reset link to set your desktop password.",
      reset_url: publicResetUrl(token),
      reset_token: token,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });
    pruneAuthState(state);
  }
  return response(200, {
    ok: true,
    accepted: true,
    email_delivery: {
      mode: "synthetic_email_outbox",
      status: "accepted",
      token_material_returned: false
    },
    token_material_returned: false
  });
}

function latestSyntheticResetEmail(body = {}, state) {
  const email = normalizeEmail(body.email);
  const latest = [...state.outbox].reverse().find((message) => normalizeEmail(message.to) === email);
  if (!latest) {
    return response(404, {
      ok: false,
      reason: "reset_email_not_found",
      token_material_returned: false
    });
  }
  return response(200, {
    ok: true,
    email_message: latest,
    synthetic_only: true,
    token_material_returned: true
  });
}

function confirmPasswordReset(body = {}, state) {
  const token = String(body.token ?? body.reset_token ?? "");
  const password = String(body.password ?? body.new_password ?? "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return response(400, {
      ok: false,
      reason: "password_too_short",
      minimum_length: PASSWORD_MIN_LENGTH,
      token_material_returned: false
    });
  }
  const tokenHash = hashOpaqueToken(token);
  const reset = state.resetTokens.get(tokenHash);
  if (!reset || reset.used_at || Date.parse(reset.expires_at) <= Date.now()) {
    return response(401, {
      ok: false,
      reason: "invalid_reset_token",
      token_material_returned: false
    });
  }
  const user = findUser(reset.email);
  if (!user) {
    return response(401, {
      ok: false,
      reason: "invalid_reset_token",
      token_material_returned: false
    });
  }
  reset.used_at = new Date().toISOString();
  state.passwordCredentials.set(normalizeEmail(user.email), hashPassword(password));
  state.sessionGeneration.set(normalizeEmail(user.email), (state.sessionGeneration.get(normalizeEmail(user.email)) ?? 0) + 1);
  return response(200, {
    ok: true,
    accepted: true,
    activated: true,
    token_material_returned: false
  });
}

function loginWithPassword(body = {}, state) {
  const allowedKeys = new Set(["email", "password"]);
  const unexpectedKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (unexpectedKeys.length > 0) {
    return response(400, {
      ok: false,
      reason: "email_password_only",
      unexpected_fields: unexpectedKeys,
      token_material_returned: false
    });
  }
  if (!body.email || !body.password) {
    return response(400, {
      ok: false,
      reason: "email_password_required",
      token_material_returned: false
    });
  }
  const user = findUser(body.email);
  if (!user) {
    return response(401, {
      ok: false,
      reason: "auth_required",
      token_material_returned: false
    });
  }
  const credential = state.passwordCredentials.get(normalizeEmail(user.email));
  if (!credential) {
    return response(403, {
      ok: false,
      reason: "password_reset_required",
      token_material_returned: false
    });
  }
  if (!verifyPassword(credential, body.password)) {
    return response(401, {
      ok: false,
      reason: "auth_required",
      token_material_returned: false
    });
  }
  return response(200, {
    ok: true,
    session: sessionFor(user, state),
    features: featureAccessFor(user),
    token_material_returned: false
  });
}

function normalizeLambdaPath(value = "/") {
  const path = String(value || "/");
  return `/${path}`.replace(/^\/+/, "/") || "/";
}

function routeFromEvent(event = {}) {
  const method = event.httpMethod ?? event.requestContext?.http?.method ?? "GET";
  const path = normalizeLambdaPath(event.path ?? event.rawPath ?? event.requestContext?.http?.path ?? "/");
  return { method: method.toUpperCase(), path: path.replace(/\/+$/, "") || "/" };
}

function health() {
  return response(200, {
    ok: true,
    service: "matter-temp-desktop-runtime",
    mode: "aws-temporary-execute-api",
    custom_domain_required: false,
    tenant_id: seed.tenant_id,
    registered_account_count: seed.users.length,
    highest_privilege_account: seed.highest_privilege_account.email,
    synthetic_only: true,
    operator_token_required_for_runtime_routes: true,
    operator_token_configured: Boolean(process.env.OPERATOR_TOKEN_SHA256),
    password_login_required: true,
    password_reset_delivery_mode: "synthetic_email_outbox",
    password_credential_store: persistentAuthStateSecretName() ? "aws_secrets_manager" : "ephemeral_lambda_memory",
    production_ready_completed: false,
    public_release_completed: false
  });
}

export async function handler(event = {}) {
  const { method, path } = routeFromEvent(event);
  if (method === "OPTIONS") return response(204, {});

  if ((path === "/" || path === "/health") && method === "GET") return health();

  if (path === "/api/desktop/accounts" && method === "GET") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    return response(200, {
      ok: true,
      tenant_id: seed.tenant_id,
      count: seed.users.length,
      users: users(state),
      token_material_returned: false
    });
  }

  if (path === "/api/desktop/login" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    return loginWithPassword(parseBody(event), state);
  }

  if (path === "/api/desktop/password-reset/request" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    const result = requestPasswordReset(parseBody(event), state);
    await saveAuthState(state);
    return result;
  }

  if (path === "/api/desktop/password-reset/latest-email" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    return latestSyntheticResetEmail(parseBody(event), state);
  }

  if (path === "/api/desktop/password-reset/confirm" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    const result = confirmPasswordReset(parseBody(event), state);
    if (result.statusCode === 200) await saveAuthState(state);
    return result;
  }

  if (path === "/api/matter-vault/features" && method === "GET") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    const user = findUser(actorFromEvent(event));
    if (!user) return response(401, { ok: false, reason: "unknown_seed_account" });
    return response(200, {
      ok: true,
      session: sessionFor(user, state),
      features: featureAccessFor(user)
    });
  }

  if (path === "/api/matter-vault/smoke" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const body = parseBody(event);
    const user = findUser(actorFromEvent(event, body));
    if (!user) return response(401, { ok: false, reason: "unknown_seed_account" });
    const requestedFeature = body.feature_id ?? "matter_vault_dashboard";
    const feature = featureAccessFor(user).find((candidate) => candidate.feature_id === requestedFeature);
    if (!feature) return response(404, { ok: false, reason: "unknown_feature" });
    return response(feature.allowed ? 200 : 403, {
      ok: feature.allowed,
      decision: feature.decision,
      feature_id: feature.feature_id,
      actor_email: user.email,
      tenant_id: seed.tenant_id,
      synthetic_only: true,
      real_client_data_used: false,
      production_ready_completed: false
    });
  }

  return response(404, {
    ok: false,
    reason: "not_found",
    path,
    method
  });
}
