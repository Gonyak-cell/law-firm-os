#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createPostgresPool } from "../packages/persistence/src/postgres/pool.js";
import { createPostgresPrecedentRepository } from "../packages/dms/src/search/postgres-precedent-repository.js";
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
const pool = createPostgresPool({ connectionString,
  sslMode: process.env.LAWOS_POSTGRES_SSL_MODE ?? "verify-full",
  allowInsecureLocal: process.env.LAWOS_POSTGRES_ALLOW_INSECURE_LOCAL === "true",
  tenantContextSecret, applicationName: "amic-os-precedent-import" });
try {
  const repository = createPostgresPrecedentRepository({ pool, authoritySecret });
  const result = await executeApprovedPrecedentImport({ repository,
    manifest: JSON.parse(readFileSync(manifestPath, "utf8")), actor_id: actorId });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await pool.end();
}
