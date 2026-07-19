import { createHmac, randomBytes } from "node:crypto";
import { isRetryablePostgresError, sanitizePostgresError } from "./errors.js";
import { POSTGRES_TENANT_CONTEXT_SECRET } from "./pool.js";

const ISOLATION_LEVELS = new Map([
  ["read committed", "READ COMMITTED"],
  ["repeatable read", "REPEATABLE READ"],
  ["serializable", "SERIALIZABLE"],
]);

function requireTenantId(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("tenant_id is required");
  return value;
}

function positiveInteger(value, name, defaultValue) {
  const resolved = value ?? defaultValue;
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive integer`);
  return resolved;
}

function retryDelay(milliseconds) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requireTenantContextSecret(pool, value) {
  const source = value ?? pool?.[POSTGRES_TENANT_CONTEXT_SECRET];
  const secret = Buffer.isBuffer(source) ? source : Buffer.from(String(source ?? ""), "utf8");
  if (secret.byteLength < 32) {
    throw Object.assign(new Error("PostgreSQL authenticated tenant context is not configured"), {
      code: "LAWOS_POSTGRES_TENANT_CONTEXT_REQUIRED",
      safe_error_code: "POSTGRES_TENANT_CONTEXT_REQUIRED",
      status: 500,
    });
  }
  return secret;
}

export async function withPostgresTransaction(pool, {
  tenant_id,
  isolationLevel = "read committed",
  statementTimeoutMillis = 15_000,
  maxAttempts = 3,
  retryDelayMillis = 10,
  readOnly = false,
  tenantContextSecret,
} = {}, callback) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  if (typeof callback !== "function") throw new TypeError("transaction callback is required");
  const tenantId = requireTenantId(tenant_id);
  const isolation = ISOLATION_LEVELS.get(String(isolationLevel).toLowerCase());
  if (!isolation) throw new TypeError("unsupported transaction isolation level");
  const timeout = positiveInteger(statementTimeoutMillis, "statementTimeoutMillis", 15_000);
  const attempts = positiveInteger(maxAttempts, "maxAttempts", 3);
  const contextSecret = requireTenantContextSecret(pool, tenantContextSecret);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let client;
    let retry = false;
    let releaseError;
    try {
      client = await pool.connect();
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}${readOnly ? " READ ONLY" : ""}`);
      await client.query(`SET LOCAL statement_timeout = ${timeout}`);
      const contextNonce = randomBytes(32).toString("base64url");
      const contextSignature = createHmac("sha256", contextSecret)
        .update(`${tenantId}\x1f${contextNonce}`)
        .digest("hex");
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      await client.query("SELECT set_config('app.tenant_context_nonce', $1, true)", [contextNonce]);
      await client.query("SELECT set_config('app.tenant_context_signature', $1, true)", [contextSignature]);
      const authenticated = await client.query("SELECT lawos_security.current_tenant_id() AS tenant_id");
      if (authenticated.rows[0]?.tenant_id !== tenantId) {
        throw Object.assign(new Error("PostgreSQL tenant context authentication failed"), {
          code: "42501",
          safe_error_code: "POSTGRES_TENANT_CONTEXT_AUTHENTICATION_FAILED",
          status: 403,
        });
      }
      const result = await callback(client, Object.freeze({ attempt, tenant_id: tenantId }));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          releaseError = rollbackError;
        }
      }
      if (isRetryablePostgresError(error) && attempt < attempts) {
        retry = true;
      } else {
        throw sanitizePostgresError(error);
      }
    } finally {
      client?.release(releaseError);
    }
    if (retry) {
      await retryDelay(retryDelayMillis * (2 ** (attempt - 1)));
      continue;
    }
  }
  throw new Error("unreachable PostgreSQL transaction state");
}
