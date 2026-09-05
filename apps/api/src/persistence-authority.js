import {
  attachPostgresTenantContextSecret,
  createPostgresPool,
} from "../../../packages/persistence/src/postgres/pool.js";
import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  listClientOperationsPostgresMigrations,
  verifyClientOperationsPostgresMigrations,
} from "./client-operations-schema.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { verifyPostgresMigrationState } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { sanitizePostgresError } from "../../../packages/persistence/src/postgres/errors.js";
import { resolveAwsSecretString } from "./aws-secret-reference.js";
import { runtimePreflightError } from "./runtime-profile.js";

export const LAWOS_PERSISTENCE_AUTHORITY_ENV = "LAWOS_PERSISTENCE_AUTHORITY";
export const LAWOS_POSTGRES_URL_ENV = "LAWOS_POSTGRES_URL";
export const LAWOS_POSTGRES_URL_SECRET_ID_ENV = "LAWOS_POSTGRES_URL_SECRET_ID";
export const LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ENV = "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET";
export const LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID_ENV = "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID";
export const LAWOS_POSTGRES_SSL_MODE_ENV = "LAWOS_POSTGRES_SSL_MODE";
export const LAWOS_POSTGRES_API_POOL_MAX = 1;
const POSTGRES_PREFLIGHT_REASONS = new Map([
  ["LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED", "MIGRATION_HISTORY_DIVERGED"],
  ["LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH", "MIGRATION_CHECKSUM_MISMATCH"],
  ["LAWOS_POSTGRES_ACCESS_DENIED", "ACCESS_DENIED"],
  ["LAWOS_INTERNAL_INSTALLATION_SCHEMA_REQUIRED", "INTERNAL_INSTALLATION_SCHEMA_REQUIRED"],
]);
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

export function verifyOperationalPostgresMigrationState(pool) {
  return verifyClientOperationsPostgresMigrations(pool);
}

export async function verifyOperationalPostgresBridgeMigrationState(pool) {
  const migrations = listClientOperationsPostgresMigrations();
  const entries = CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries;
  const historyError = () => Object.assign(new Error("PostgreSQL schema bridge requires an exact reviewed catalog"), {
    code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    safe_error_code: "POSTGRES_MIGRATION_HISTORY_DIVERGED", status: 500,
  });
  const authorityMigrations = migrations.filter(({ id }) => id !== "016_dms_corporate_workspace");
  const historicalMigrations = authorityMigrations.filter(({ id }) =>
    id !== "309_client_internal_unsigned_installation_authority");
  const authorityEntries = entries.filter(({ id }) => id !== "016_dms_corporate_workspace");
  const historicalEntries = authorityEntries.filter(({ id }) =>
    id !== "309_client_internal_unsigned_installation_authority");
  if (migrations.length !== 81 || entries.length !== 81
      || hashDomainValue(entries) !==
        "29530ec602b720deeb1e26625c85a3dcc1268e2bfc116b6b86bfada761cb38a7"
      || authorityEntries.length !== 80
      || hashDomainValue(authorityEntries) !==
        "4d2b71686f05f483fee882b742e363ee4ce24e95879dce267a81083adc47287f"
      || historicalEntries.length !== 79
      || hashDomainValue(historicalEntries) !==
        "fe0b9c53de1617361fd607692beb7e462b28159321e7830d507836948fcfdbc3") {
    throw historyError();
  }
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("PostgreSQL schema bridge requires a transaction-capable pool");
  }
  let client;
  let releaseError;
  try {
    client = await pool.connect();
    if (!client || typeof client.query !== "function" || typeof client.release !== "function") {
      throw new TypeError("PostgreSQL schema bridge requires a transaction-capable client");
    }
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
    const rows = (await client.query(
      "SELECT count(*)::integer AS migration_count FROM lawos_meta.schema_migrations",
    )).rows;
    const count = rows.length === 1 ? rows[0].migration_count : null;
    if (![79, 80, 81].includes(count)) throw historyError();
    const verified = await verifyPostgresMigrationState(client, {
      migrations: count === 79 ? historicalMigrations : count === 80 ? authorityMigrations : migrations,
    });
    await client.query("COMMIT");
    return verified;
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { releaseError = error; }
    }
    throw sanitizePostgresError(error);
  } finally { client?.release?.(releaseError); }
}

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
  let stage = "database-credential";
  try {
    const connectionString = await resolvePostgresConnectionString({
      env,
      secretsClient,
      resolveSecret: resolvePostgresSecret,
    });
    stage = "tenant-context-credential";
    const tenantContextSecret = await resolvePostgresTenantContextSecret({
      env,
      secretsClient,
      resolveSecret: resolvePostgresSecret,
    });
    stage = "connection";
    connection = await connectPostgres({ connectionString, sslMode, tenantContextSecret });
    if (!connection || typeof connection.query !== "function") {
      throw new TypeError("PostgreSQL authority connector returned an invalid connection");
    }
    attachPostgresTenantContextSecret(connection, tenantContextSecret);
    stage = "health-query";
    await connection.query("SELECT 1 AS authority_ready");
    stage = "migration-catalog";
    const migrations = typeof connection.connect === "function"
      ? await verifyOperationalPostgresBridgeMigrationState(connection)
      : [];
    if (![80, 81].includes(migrations.length)
        && String(env.LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID ?? "").trim()) {
      throw Object.assign(new Error("Internal installation signing requires an exact schema containing installation authority"), {
        code: "LAWOS_INTERNAL_INSTALLATION_SCHEMA_REQUIRED",
      });
    }
    if (typeof connection.connect === "function") {
      stage = "tenant-authority";
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
  } catch (error) {
    if (connection?.end) await connection.end().catch(() => {});
    const reason = POSTGRES_PREFLIGHT_REASONS.get(error?.code) ?? "INITIALIZATION_FAILED";
    throw Object.assign(runtimePreflightError(
      `selected PostgreSQL authority failed initialization [${stage}:${reason}]; file fallback is disabled`,
    ), { persistence_stage: stage, persistence_reason: reason });
  }
}
