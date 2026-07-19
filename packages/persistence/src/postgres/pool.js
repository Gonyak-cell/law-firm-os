import pg from "pg";

const { Pool } = pg;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
export const POSTGRES_TENANT_CONTEXT_SECRET = Symbol.for("lawos.postgres.tenant-context-secret");

function tenantContextSecret(value) {
  if (value === undefined || value === null) return null;
  const secret = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(String(value), "utf8");
  if (secret.byteLength < 32) throw new TypeError("PostgreSQL tenant context secret must contain at least 32 bytes");
  return secret;
}

export function attachPostgresTenantContextSecret(pool, value) {
  if (!pool || (typeof pool.connect !== "function" && typeof pool.query !== "function")) {
    throw new TypeError("PostgreSQL pool is required");
  }
  const secret = tenantContextSecret(value);
  if (!secret) throw new TypeError("PostgreSQL tenant context secret is required");
  if (pool[POSTGRES_TENANT_CONTEXT_SECRET]) return pool;
  Object.defineProperty(pool, POSTGRES_TENANT_CONTEXT_SECRET, {
    value: secret,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return pool;
}

function positiveInteger(value, name, defaultValue) {
  const resolved = value ?? defaultValue;
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive integer`);
  return resolved;
}

export function resolvePostgresPoolConfig({
  connectionString,
  sslMode = "verify-full",
  allowInsecureLocal = false,
  connectionTimeoutMillis = 5_000,
  statementTimeoutMillis = 15_000,
  idleTimeoutMillis = 30_000,
  max = 10,
  applicationName = "law-firm-os",
} = {}) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new TypeError("a valid PostgreSQL connection URL is required");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    throw new TypeError("PostgreSQL connection URL must use postgres or postgresql");
  }
  if ([...url.searchParams.keys()].length > 0) {
    throw new Error("PostgreSQL connection URL query parameters are not allowed; use the verified pool configuration");
  }
  if (!new Set(["verify-full", "disable"]).has(sslMode)) {
    throw new TypeError("sslMode must be verify-full or disable");
  }
  if (sslMode === "disable" && (!allowInsecureLocal || !LOOPBACK_HOSTS.has(url.hostname))) {
    throw new Error("unencrypted PostgreSQL is allowed only for an explicit loopback disposable database");
  }
  return Object.freeze({
    connectionString,
    ssl: sslMode === "verify-full" ? Object.freeze({ rejectUnauthorized: true }) : false,
    connectionTimeoutMillis: positiveInteger(connectionTimeoutMillis, "connectionTimeoutMillis", 5_000),
    statement_timeout: positiveInteger(statementTimeoutMillis, "statementTimeoutMillis", 15_000),
    idleTimeoutMillis: positiveInteger(idleTimeoutMillis, "idleTimeoutMillis", 30_000),
    max: positiveInteger(max, "max", 10),
    application_name: String(applicationName || "law-firm-os").slice(0, 64),
  });
}

export function createPostgresPool(options = {}) {
  const config = resolvePostgresPoolConfig(options);
  const pool = new (options.PoolClass ?? Pool)(config);
  const secret = tenantContextSecret(options.tenantContextSecret);
  if (secret) attachPostgresTenantContextSecret(pool, secret);
  return pool;
}
