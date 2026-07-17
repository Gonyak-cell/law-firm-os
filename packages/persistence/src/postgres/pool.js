import pg from "pg";

const { Pool } = pg;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

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
  return new (options.PoolClass ?? Pool)(config);
}
