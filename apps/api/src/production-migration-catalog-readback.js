import {
  createCatalogReadbackCatalogReceipt,
} from "../../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import {
  readPostgresMigrationCatalogReadback,
  validatePostgresMigrationCatalogReadback,
} from "../../../packages/persistence/src/postgres/migration-catalog-readback.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import { postgresUrlFromSecret } from "./persistence-authority.js";
import {
  loadEmbeddedCatalogReadbackDeploymentManifest,
  PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS,
  validateProductionMigrationCatalogReadbackEvent,
} from "./production-migration-catalog-readback-event.js";

const SAFE_READER_ERROR_CODES = new Set([
  "LAWOS_CATALOG_READBACK_INPUT",
  "LAWOS_CATALOG_READBACK_DATABASE_ROLE",
  "LAWOS_CATALOG_READBACK_SCHEMA",
  "LAWOS_CATALOG_READBACK_DATABASE",
]);

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) fail("LAWOS_CATALOG_READBACK_RUNTIME", `${label} is required`);
  return text;
}

function safeRuntimeFailure(code) {
  return Object.assign(
    new Error("production migration catalog readback failed at a protected boundary"),
    { code },
  );
}

function runtimeEnvironment(env) {
  const deploymentEnvironment = Object.fromEntries(
    PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS.map((key) => [
      key,
      env[key],
    ]),
  );
  return Object.freeze({
    ...deploymentEnvironment,
    AWS_REGION: env.AWS_REGION,
    AWS_DEFAULT_REGION: env.AWS_DEFAULT_REGION,
    AWS_LAMBDA_FUNCTION_NAME: env.AWS_LAMBDA_FUNCTION_NAME,
  });
}

function structuredAuditorSecret(secret, env) {
  if (!secret || typeof secret !== "object" || Array.isArray(secret)
    || secret.username !== "lawos_hrx_projection_auditor") {
    fail(
      "LAWOS_CATALOG_READBACK_SECRET_ROLE",
      "projection-auditor database secret role drifted",
    );
  }
  const port = Number(requiredText(env.LAWOS_DATABASE_PORT, "LAWOS_DATABASE_PORT"));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("LAWOS_CATALOG_READBACK_RUNTIME", "LAWOS_DATABASE_PORT is invalid");
  }
  return {
    host: requiredText(env.LAWOS_DATABASE_HOST, "LAWOS_DATABASE_HOST"),
    port,
    dbname: requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME"),
    username: "lawos_hrx_projection_auditor",
    password: requiredText(secret.password, "projection-auditor database password"),
  };
}

export async function executeProductionMigrationCatalogReadback({
  event,
  env = process.env,
  now = Date.now(),
  verifyApproval,
  deploymentManifest = loadEmbeddedCatalogReadbackDeploymentManifest(),
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  readCatalog = readPostgresMigrationCatalogReadback,
} = {}) {
  const stableEnv = runtimeEnvironment(env);
  const validationOptions = {
    event,
    env: stableEnv,
    now,
    deploymentManifest,
  };
  if (verifyApproval !== undefined) {
    validationOptions.verifyApproval = verifyApproval;
  }
  const authorization = validateProductionMigrationCatalogReadbackEvent(
    validationOptions,
  );
  const region = authorization.packet.target.aws_region;
  const secretId = requiredText(
    stableEnv.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
    "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
  );
  let secret;
  try {
    secret = await resolveSecret({ secretId, region });
  } catch {
    throw safeRuntimeFailure("LAWOS_CATALOG_READBACK_SECRET");
  }
  const credential = structuredAuditorSecret(secret, stableEnv);
  let pool;
  let result;
  try {
    pool = createPool({
      connectionString: postgresUrlFromSecret(JSON.stringify(credential)),
      sslMode: "verify-full",
      applicationName: "lawos-production-catalog-readback",
      connectionTimeoutMillis: 5_000,
      statementTimeoutMillis: 15_000,
      max: 1,
    });
    result = createCatalogReadbackCatalogReceipt({
      lineage: authorization.lineage,
      preflightReceiptSha256:
        authorization.event.preflight_receipt_sha256,
      catalog: validatePostgresMigrationCatalogReadback(
        await readCatalog(pool),
      ),
    });
  } catch (error) {
    if (SAFE_READER_ERROR_CODES.has(error?.code)) {
      throw safeRuntimeFailure(error.code);
    }
    throw safeRuntimeFailure("LAWOS_CATALOG_READBACK_DATABASE");
  } finally {
    if (pool?.end) {
      try {
        await pool.end();
      } catch {
        throw safeRuntimeFailure("LAWOS_CATALOG_READBACK_POOL_CLOSE");
      }
    }
  }
  return result;
}

export {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_ENVIRONMENT,
  CATALOG_READBACK_OPERATION,
  PRODUCTION_MIGRATION_CATALOG_READBACK_EVENT_SCHEMA_VERSION,
  loadEmbeddedCatalogReadbackDeploymentManifest,
  PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS,
  validateProductionMigrationCatalogReadbackEvent,
} from "./production-migration-catalog-readback-event.js";
