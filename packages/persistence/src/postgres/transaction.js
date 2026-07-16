import { isRetryablePostgresError, sanitizePostgresError } from "./errors.js";

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

export async function withPostgresTransaction(pool, {
  tenant_id,
  isolationLevel = "read committed",
  statementTimeoutMillis = 15_000,
  maxAttempts = 3,
  retryDelayMillis = 10,
  readOnly = false,
} = {}, callback) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  if (typeof callback !== "function") throw new TypeError("transaction callback is required");
  const tenantId = requireTenantId(tenant_id);
  const isolation = ISOLATION_LEVELS.get(String(isolationLevel).toLowerCase());
  if (!isolation) throw new TypeError("unsupported transaction isolation level");
  const timeout = positiveInteger(statementTimeoutMillis, "statementTimeoutMillis", 15_000);
  const attempts = positiveInteger(maxAttempts, "maxAttempts", 3);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let client;
    let retry = false;
    let releaseError;
    try {
      client = await pool.connect();
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}${readOnly ? " READ ONLY" : ""}`);
      await client.query(`SET LOCAL statement_timeout = ${timeout}`);
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
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
