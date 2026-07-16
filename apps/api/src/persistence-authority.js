import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { runtimePreflightError } from "./runtime-profile.js";

export const LAWOS_PERSISTENCE_AUTHORITY_ENV = "LAWOS_PERSISTENCE_AUTHORITY";
export const LAWOS_POSTGRES_URL_ENV = "LAWOS_POSTGRES_URL";
export const LAWOS_POSTGRES_SSL_MODE_ENV = "LAWOS_POSTGRES_SSL_MODE";
export const LAWOS_PERSISTENCE_AUTHORITIES = Object.freeze({
  fileCurrent: "file-current",
  postgresV2: "postgres-v2",
});

export function resolvePersistenceAuthority({ value, env = process.env } = {}) {
  const selected = String(value ?? env[LAWOS_PERSISTENCE_AUTHORITY_ENV] ?? LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent).trim();
  if (Object.values(LAWOS_PERSISTENCE_AUTHORITIES).includes(selected)) return selected;
  throw runtimePreflightError(`Unsupported ${LAWOS_PERSISTENCE_AUTHORITY_ENV} selection`);
}

function resolvePostgresSslMode(env) {
  const value = String(env[LAWOS_POSTGRES_SSL_MODE_ENV] ?? "verify-full").trim();
  if (value === "verify-full" || value === "disable") return value;
  throw runtimePreflightError(`Unsupported ${LAWOS_POSTGRES_SSL_MODE_ENV} selection`);
}

async function defaultConnectPostgres({ connectionString, sslMode }) {
  const url = new URL(connectionString);
  const local = new Set(["127.0.0.1", "::1", "localhost"]).has(url.hostname);
  const pool = createPostgresPool({
    connectionString,
    sslMode,
    allowInsecureLocal: sslMode === "disable" && local,
    applicationName: "law-firm-os-api-authority-preflight",
  });
  return pool;
}

export async function preparePersistenceAuthority({
  value,
  env = process.env,
  connectPostgres = defaultConnectPostgres,
} = {}) {
  const authority = resolvePersistenceAuthority({ value, env });
  if (authority === LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent) {
    return Object.freeze({
      authority,
      initialized: true,
      postgres_connected: false,
      fallback_attempted: false,
      production_ready_claim: false,
    });
  }

  const connectionString = String(env[LAWOS_POSTGRES_URL_ENV] ?? "").trim();
  if (!connectionString) throw runtimePreflightError(`${LAWOS_POSTGRES_URL_ENV} is required for postgres-v2 authority`);
  const sslMode = resolvePostgresSslMode(env);
  let connection;
  try {
    connection = await connectPostgres({ connectionString, sslMode });
    if (!connection || typeof connection.query !== "function") {
      throw new TypeError("PostgreSQL authority connector returned an invalid connection");
    }
    await connection.query("SELECT 1 AS authority_ready");
    return Object.freeze({
      authority,
      initialized: true,
      postgres_connected: true,
      fallback_attempted: false,
      production_ready_claim: false,
      close: async () => connection.end?.(),
    });
  } catch {
    if (connection?.end) await connection.end().catch(() => {});
    throw runtimePreflightError("selected PostgreSQL authority failed initialization; file fallback is disabled");
  }
}
