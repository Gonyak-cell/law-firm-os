import {
  attachPostgresTenantContextSecret,
  createPostgresPool,
} from "../../../packages/persistence/src/postgres/pool.js";
import { verifyPostgresMigrationState } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { resolveAwsSecretString } from "./aws-secret-reference.js";
import { runtimePreflightError } from "./runtime-profile.js";

export const LAWOS_PERSISTENCE_AUTHORITY_ENV = "LAWOS_PERSISTENCE_AUTHORITY";
export const LAWOS_POSTGRES_URL_ENV = "LAWOS_POSTGRES_URL";
export const LAWOS_POSTGRES_URL_SECRET_ID_ENV = "LAWOS_POSTGRES_URL_SECRET_ID";
export const LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ENV = "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET";
export const LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID_ENV = "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID";
export const LAWOS_POSTGRES_SSL_MODE_ENV = "LAWOS_POSTGRES_SSL_MODE";
export const LAWOS_POSTGRES_API_POOL_MAX = 1;
export const LAWOS_PERSISTENCE_AUTHORITIES = Object.freeze({
  fileCurrent: "file-current",
  postgresV2: "postgres-v2",
});
export const LAWOS_OFFLINE_REJECTED_POLICY = Object.freeze({
  offline_capability: "rejected",
  offline_mutation: false,
  local_authority: false,
  latest_wins_conflict_resolution: false,
  json_fallback: false,
  dual_write: false,
  authority_loss_mode: "fail_closed",
  cached_read_authority: false,
});

export function resolvePersistenceAuthority({ value, env = process.env } = {}) {
  const operational = String(env.LAWOS_RUNTIME_PROFILE ?? "").trim() === "operational";
  const selected = String(
    value
    ?? env[LAWOS_PERSISTENCE_AUTHORITY_ENV]
    ?? (operational ? LAWOS_PERSISTENCE_AUTHORITIES.postgresV2 : LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent),
  ).trim();
  if (!Object.values(LAWOS_PERSISTENCE_AUTHORITIES).includes(selected)) {
    throw runtimePreflightError(`Unsupported ${LAWOS_PERSISTENCE_AUTHORITY_ENV} selection`);
  }
  if (operational && selected !== LAWOS_PERSISTENCE_AUTHORITIES.postgresV2) {
    throw runtimePreflightError("operational runtime requires postgres-v2 persistence authority");
  }
  return selected;
}

function resolvePostgresSslMode(env) {
  const value = String(env[LAWOS_POSTGRES_SSL_MODE_ENV] ?? "verify-full").trim();
  if (value === "verify-full" || value === "disable") return value;
  throw runtimePreflightError(`Unsupported ${LAWOS_POSTGRES_SSL_MODE_ENV} selection`);
}

async function defaultConnectPostgres({ connectionString, sslMode, tenantContextSecret }) {
  const url = new URL(connectionString);
  const local = new Set(["127.0.0.1", "::1", "localhost"]).has(url.hostname);
  const pool = createPostgresPool({
    connectionString,
    sslMode,
    allowInsecureLocal: sslMode === "disable" && local,
    applicationName: "law-firm-os-api-authority-preflight",
    tenantContextSecret,
    max: LAWOS_POSTGRES_API_POOL_MAX,
  });
  return pool;
}

function tenantContextSecretFromSecret(value) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError("PostgreSQL tenant context secret reference resolved without secret material");
  let secret = text;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError();
    secret = String(
      parsed.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET
      ?? parsed.TENANT_CONTEXT_SECRET
      ?? parsed.tenant_context_secret
      ?? parsed.secret
      ?? "",
    ).trim();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new TypeError("PostgreSQL tenant context secret must contain at least 32 bytes");
  }
  return secret;
}

export function postgresUrlFromSecret(value) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError("PostgreSQL secret reference resolved without secret material");
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError();
    const connectionString = String(
      parsed.LAWOS_POSTGRES_URL ?? parsed.DATABASE_URL ?? parsed.database_url ?? parsed.url ?? "",
    ).trim();
    if (connectionString) return connectionString;
    const host = String(parsed.host ?? parsed.hostname ?? "").trim();
    const database = String(parsed.dbname ?? parsed.database ?? parsed.database_name ?? "").trim();
    const username = String(parsed.username ?? parsed.user ?? "").trim();
    const password = String(parsed.password ?? "");
    const port = String(parsed.port ?? "5432").trim();
    if (!host || !database || !username || !password || !/^\d{1,5}$/u.test(port)) {
      throw new TypeError("PostgreSQL secret JSON does not contain a complete structured credential");
    }
    const portNumber = Number(port);
    if (portNumber < 1 || portNumber > 65535) throw new TypeError("PostgreSQL secret port is invalid");
    const endpoint = new URL("postgresql://localhost");
    endpoint.hostname = host;
    endpoint.port = port;
    return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${endpoint.host}/${encodeURIComponent(database)}`;
  } catch (error) {
    if (error instanceof SyntaxError) return text;
    throw error;
  }
}

export async function resolvePostgresConnectionString({ env, secretsClient, resolveSecret = resolveAwsSecretString }) {
  const direct = String(env[LAWOS_POSTGRES_URL_ENV] ?? "").trim();
  const secretId = String(
    env[LAWOS_POSTGRES_URL_SECRET_ID_ENV] ?? env.LAWOS_DATABASE_URL_SECRET_ID ?? "",
  ).trim();
  const operational = String(env.LAWOS_RUNTIME_PROFILE ?? "").trim() === "operational";
  if (operational && direct) {
    throw runtimePreflightError(
      `${LAWOS_POSTGRES_URL_ENV} must not contain production credentials; use ${LAWOS_POSTGRES_URL_SECRET_ID_ENV}`,
    );
  }
  if (secretId) {
    const region = String(
      env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION ?? "ap-northeast-2",
    ).trim();
    return postgresUrlFromSecret(await resolveSecret({ secretId, region, client: secretsClient }));
  }
  if (direct) return direct;
  throw runtimePreflightError(
    `${LAWOS_POSTGRES_URL_SECRET_ID_ENV} is required for operational postgres-v2 authority`,
  );
}

export async function resolvePostgresTenantContextSecret({ env, secretsClient, resolveSecret = resolveAwsSecretString }) {
  const direct = String(env[LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ENV] ?? "").trim();
  const secretId = String(env[LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID_ENV] ?? "").trim();
  const operational = String(env.LAWOS_RUNTIME_PROFILE ?? "").trim() === "operational";
  if (operational && direct) {
    throw runtimePreflightError(
      `${LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ENV} must not contain production secret material; use ${LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID_ENV}`,
    );
  }
  if (secretId) {
    const region = String(
      env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION ?? "ap-northeast-2",
    ).trim();
    return tenantContextSecretFromSecret(await resolveSecret({ secretId, region, client: secretsClient }));
  }
  if (direct) return tenantContextSecretFromSecret(direct);
  throw runtimePreflightError(
    `${LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID_ENV} is required for authenticated tenant RLS context`,
  );
}

export async function preparePersistenceAuthority({
  value,
  env = process.env,
  connectPostgres = defaultConnectPostgres,
  verifyPostgresMigrations = verifyPostgresMigrationState,
  secretsClient,
  resolvePostgresSecret,
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

  const sslMode = resolvePostgresSslMode(env);
  let connection;
  try {
    const connectionString = await resolvePostgresConnectionString({
      env,
      secretsClient,
      resolveSecret: resolvePostgresSecret,
    });
    const tenantContextSecret = await resolvePostgresTenantContextSecret({
      env,
      secretsClient,
      resolveSecret: resolvePostgresSecret,
    });
    connection = await connectPostgres({ connectionString, sslMode, tenantContextSecret });
    if (!connection || typeof connection.query !== "function") {
      throw new TypeError("PostgreSQL authority connector returned an invalid connection");
    }
    attachPostgresTenantContextSecret(connection, tenantContextSecret);
    await connection.query("SELECT 1 AS authority_ready");
    const migrations = typeof connection.connect === "function"
      ? await verifyPostgresMigrations(connection)
      : [];
    if (typeof connection.connect === "function") {
      const tenantAuthority = await connection.query(
        "SELECT lawos_security.tenant_context_authority_ready() AS ready",
      );
      if (tenantAuthority.rows[0]?.ready !== true) {
        throw new Error("PostgreSQL runtime role has no active authenticated tenant authority");
      }
    }
    return Object.freeze({
      authority,
      initialized: true,
      postgres_connected: true,
      fallback_attempted: false,
      json_fallback: false,
      dual_write: false,
      offline_policy: LAWOS_OFFLINE_REJECTED_POLICY,
      production_ready_claim: false,
      migration_count: migrations.length,
      pool: connection,
      close: async () => connection.end?.(),
    });
  } catch {
    if (connection?.end) await connection.end().catch(() => {});
    throw runtimePreflightError("selected PostgreSQL authority failed initialization; file fallback is disabled");
  }
}
