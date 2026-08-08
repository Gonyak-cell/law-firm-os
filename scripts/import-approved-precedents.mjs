#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createPostgresPool } from "../packages/persistence/src/postgres/pool.js";
import { createS3StorageAdapter } from "../packages/dms/src/storage/s3-storage-adapter.js";
import {
  createPostgresPrecedentRepository,
  derivePrecedentAuthorityKeys,
} from "../packages/dms/src/search/postgres-precedent-repository.js";
import { createImmutablePrecedentExtractionAuthority } from "../packages/dms/src/search/precedent-immutable-extractor.js";
import {
  executeApprovedPrecedentImport,
  precedentImportUsage,
} from "../packages/dms/src/search/precedent-import-command.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

if (process.argv.includes("--help")) {
  process.stdout.write(`${precedentImportUsage()}\n`);
  process.exit(0);
}

const manifestPath = argument("--manifest");
const actorId = argument("--actor-id");
if (!manifestPath || !actorId) throw new TypeError(precedentImportUsage());
const connectionString = process.env.LAWOS_POSTGRES_URL;
const authoritySecret = process.env.LAWOS_PRECEDENT_AUTHORITY_SECRET;
const tenantContextSecret = process.env.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET;
if (!connectionString || !authoritySecret || !tenantContextSecret) {
  throw new TypeError("LAWOS_POSTGRES_URL, LAWOS_PRECEDENT_AUTHORITY_SECRET, and LAWOS_POSTGRES_TENANT_CONTEXT_SECRET are required");
}
function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}
const pool = createPostgresPool({ connectionString,
  sslMode: process.env.LAWOS_POSTGRES_SSL_MODE ?? "verify-full",
  allowInsecureLocal: process.env.LAWOS_POSTGRES_ALLOW_INSECURE_LOCAL === "true",
  tenantContextSecret, applicationName: "amic-os-precedent-import" });
try {
  const keys = derivePrecedentAuthorityKeys(authoritySecret);
  const repository = createPostgresPrecedentRepository({ pool,
    cursorSecret: keys.cursor, extractionReceiptSecret: keys.extraction_receipt });
  const storage = createS3StorageAdapter({ adapter_id: "lawos-dms-s3-production",
    credential_ref: requiredEnv("LAWOS_DMS_S3_CREDENTIAL_REF"),
    bucket: requiredEnv("LAWOS_DMS_S3_BUCKET"),
    expected_bucket_owner: requiredEnv("LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER"),
    region: requiredEnv("LAWOS_DMS_S3_REGION"),
    prefix: process.env.LAWOS_DMS_S3_PREFIX ?? "lawos-dms",
    kms_key_id: requiredEnv("LAWOS_DMS_S3_KMS_KEY_ID") });
  const extractor = createImmutablePrecedentExtractionAuthority({ pool, storage,
    receiptSecret: keys.extraction_receipt });
  const result = await executeApprovedPrecedentImport({ repository, extractor,
    manifest: JSON.parse(readFileSync(manifestPath, "utf8")), actor_id: actorId });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await pool.end();
}
