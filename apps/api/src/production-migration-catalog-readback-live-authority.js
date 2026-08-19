import { createHash } from "node:crypto";

import {
  validateCatalogReadbackLiveAuthority,
} from "../../../packages/persistence/src/postgres/catalog-readback-authorization-fields.js";
import {
  catalogReadbackCanonicalSnapshot,
} from "../../../packages/persistence/src/postgres/catalog-readback-canonical.js";

// This is the exact environment projection validated by the local Task 3
// AWS reader. Lambda also exposes AWS-managed process.env entries, so the
// projection is closed to deployment-owned values without rejecting those
// runtime-managed entries.
export const PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS =
  Object.freeze([
    "LAWOS_APPROVAL_AUDIT_BUCKET",
    "LAWOS_AWS_ACCOUNT_ID",
    "LAWOS_DATABASE_HOST",
    "LAWOS_DATABASE_IDENTIFIER",
    "LAWOS_DATABASE_NAME",
    "LAWOS_DATABASE_PORT",
    "LAWOS_DEPLOYMENT_ARTIFACT_SHA256",
    "LAWOS_DEPLOYMENT_COMMIT",
    "LAWOS_DEPLOYMENT_TREE",
    "LAWOS_EXECUTION_PACKET_SHA256",
    "LAWOS_OWNER_TRUST_REGISTRY_SHA256",
    "LAWOS_PERSISTENCE_AUTHORITY",
    "LAWOS_POSTGRES_SSL_MODE",
    "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
    "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
    "LAWOS_PROGRAM_EXECUTION_ROLE",
    "LAWOS_PROGRAM_INPUT_BUCKET",
    "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN",
    "LAWOS_RUNTIME_PROFILE",
    "NODE_EXTRA_CA_CERTS",
  ]);

const LIVE_AUTHORITY_FIXED_ENVIRONMENT = Object.freeze({
  LAWOS_AWS_ACCOUNT_ID: "770880870480",
  LAWOS_DATABASE_NAME: "lawos",
  LAWOS_DATABASE_PORT: "5432",
  LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
  LAWOS_POSTGRES_SSL_MODE: "verify-full",
  LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
  LAWOS_RUNTIME_PROFILE: "operational",
  NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
});
const LIVE_AUTHORITY_HASHED_ENVIRONMENT = Object.freeze({
  LAWOS_APPROVAL_AUDIT_BUCKET: "approval_audit_bucket_sha256",
  LAWOS_DATABASE_HOST: "database_host_sha256",
  LAWOS_DATABASE_IDENTIFIER: "database_identifier_sha256",
  LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "tenant_context_secret_id_sha256",
  LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID:
    "projection_auditor_database_secret_id_sha256",
  LAWOS_PROGRAM_INPUT_BUCKET: "program_input_bucket_sha256",
  LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: "program_input_kms_key_arn_sha256",
});
const LIVE_AUTHORITY_EXACT_ENVIRONMENT = Object.freeze({
  LAWOS_DEPLOYMENT_ARTIFACT_SHA256: "deployment_artifact_sha256",
  LAWOS_DEPLOYMENT_COMMIT: "deployment_commit",
  LAWOS_DEPLOYMENT_TREE: "deployment_tree",
  LAWOS_EXECUTION_PACKET_SHA256: "execution_packet_sha256",
});

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function environmentValue(env, key) {
  if (typeof env?.[key] !== "string" || env[key].length === 0) {
    fail(
      "LAWOS_CATALOG_READBACK_LIVE_AUTHORITY",
      "live projection-auditor authority is unavailable",
    );
  }
  return env[key];
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function validateProductionMigrationCatalogReadbackLiveAuthority({
  env,
  liveAuthority,
  ownerTrustRegistrySha256,
} = {}) {
  validateCatalogReadbackLiveAuthority(liveAuthority);
  const projection = catalogReadbackCanonicalSnapshot(
    Object.fromEntries(
      PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS.map((key) => [
        key,
        environmentValue(env, key),
      ]),
    ),
  );
  if (projection.LAWOS_OWNER_TRUST_REGISTRY_SHA256
      !== ownerTrustRegistrySha256) {
    fail(
      "LAWOS_CATALOG_READBACK_LIVE_AUTHORITY",
      "live projection-auditor authority is unavailable",
    );
  }
  if (Object.entries(LIVE_AUTHORITY_FIXED_ENVIRONMENT).some(
    ([key, expected]) => projection[key] !== expected,
  )) {
    fail(
      "LAWOS_CATALOG_READBACK_LIVE_AUTHORITY",
      "live projection-auditor authority is unavailable",
    );
  }
  if (Object.entries(LIVE_AUTHORITY_HASHED_ENVIRONMENT).some(
    ([key, authorityKey]) => sha256Text(projection[key])
      !== liveAuthority[authorityKey],
  )) {
    fail(
      "LAWOS_CATALOG_READBACK_LIVE_AUTHORITY",
      "live projection-auditor authority is unavailable",
    );
  }
  if (Object.entries(LIVE_AUTHORITY_EXACT_ENVIRONMENT).some(
    ([key, authorityKey]) => projection[key] !== liveAuthority[authorityKey],
  )) {
    fail(
      "LAWOS_CATALOG_READBACK_LIVE_AUTHORITY",
      "live projection-auditor authority is unavailable",
    );
  }
  return projection;
}
