import { existsSync, readFileSync } from "node:fs";
import { createHash, timingSafeEqual } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagedSeedPath = join(__dirname, "matter-vault-user-registration-seed.json");
const repoSeedPath = resolve(
  __dirname,
  "../../../docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json"
);
const seed = JSON.parse(readFileSync(existsSync(packagedSeedPath) ? packagedSeedPath : repoSeedPath, "utf8"));

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-mater-actor-email"
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

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(String(left)) || !/^[a-f0-9]{64}$/i.test(String(right))) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
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

function users() {
  return seed.users.map((user) => ({
    user_id: user.user_id,
    email: user.email,
    display_name: user.display_name,
    english_name: user.english_name,
    source_title: user.source_title,
    highest_privilege: user.highest_privilege,
    privilege_rank: user.privilege_rank,
    role_ids: user.role_ids,
    group_ids: user.group_ids,
    scopes: user.scopes
  }));
}

function findUser(email) {
  return seed.users.find((user) => user.email.toLowerCase() === String(email ?? "").trim().toLowerCase()) ?? null;
}

function sessionFor(user) {
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
    event.headers?.["x-mater-actor-email"] ??
    event.headers?.["X-Mater-Actor-Email"] ??
    event.queryStringParameters?.email ??
    event.queryStringParameters?.actor_email
  );
}

function routeFromEvent(event = {}) {
  const method = event.httpMethod ?? event.requestContext?.http?.method ?? "GET";
  const path = event.path ?? event.rawPath ?? "/";
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
    return response(200, {
      ok: true,
      tenant_id: seed.tenant_id,
      count: seed.users.length,
      users: users(),
      token_material_returned: false
    });
  }

  if (path === "/api/desktop/login" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const body = parseBody(event);
    const user = findUser(body.email);
    if (!user) {
      return response(401, {
        ok: false,
        reason: "unknown_seed_account",
        token_material_returned: false
      });
    }
    return response(200, {
      ok: true,
      session: sessionFor(user),
      features: featureAccessFor(user)
    });
  }

  if (path === "/api/matter-vault/features" && method === "GET") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const user = findUser(actorFromEvent(event));
    if (!user) return response(401, { ok: false, reason: "unknown_seed_account" });
    return response(200, {
      ok: true,
      session: sessionFor(user),
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
