#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  inspectHrxRelationalSchema,
} from "../packages/hrx/src/relational-projection-contract.js";
import {
  collectHrxRelationalProductionInventory,
} from "../packages/hrx/src/relational-projection-validation.js";
import {
  createPostgresPool,
} from "../packages/persistence/src/postgres/pool.js";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  postgresUrlFromSecret,
} from "../apps/api/src/persistence-authority.js";
import {
  createJsonPostgresW15InventorySummary,
} from "./lib/json-postgres-w15-contracts.mjs";
import {
  assertJsonPostgresProductionCaller,
} from "./lib/json-postgres-production-execution.mjs";
import {
  JSON_POSTGRES_W15_INVENTORY_READ_ACTION,
  JSON_POSTGRES_W15_INVENTORY_READ_DATA_SCOPE,
  JSON_POSTGRES_W15_INVENTORY_READ_ENVIRONMENT,
  validateJsonPostgresW15InventoryReadPacket,
} from "./lib/json-postgres-w15-preflight.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return process.argv[index + 1];
}

function requiredOption(name) {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function awsJson(args, { profile, region }) {
  const value = execFileSync("aws", [
    ...args,
    "--profile", profile,
    "--region", region,
    "--no-cli-pager",
    "--output", "json",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return value ? JSON.parse(value) : {};
}

function awsSecret(secretId, options) {
  const response = awsJson([
    "secretsmanager",
    "get-secret-value",
    "--secret-id", secretId,
  ], options);
  if (typeof response.SecretString !== "string") {
    throw new Error("W15 production inventory secret did not resolve");
  }
  return JSON.parse(response.SecretString);
}

function tenantContextSecret(value) {
  const secret = String(
    value?.tenant_context_secret
    ?? value?.TENANT_CONTEXT_SECRET
    ?? value?.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET
    ?? "",
  );
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("W15 tenant-context secret is invalid");
  }
  return secret;
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 production inventory requires a clean exact-head worktree");
}
const packet = readPrivateProgramJson(
  requiredOption("--packet"),
  "W15 inventory-read packet",
);
validateJsonPostgresW15InventoryReadPacket(packet);
if (git("rev-parse", "HEAD") !== packet.source_sha
  || git("rev-parse", "HEAD^{tree}") !== packet.source_tree
  || git("rev-parse", "origin/main") !== packet.source_sha) {
  throw new Error("W15 production inventory source is not exact origin/main");
}
const registryBytes = readPrivateProgramBytes(
  requiredOption("--trust-registry"),
  "W15 owner trust registry",
);
const receiptBytes = readPrivateProgramBytes(
  requiredOption("--approval-receipt"),
  "W15 inventory-read approval receipt",
);
const signatureBytes = readPrivateProgramBytes(
  requiredOption("--approval-signature"),
  "W15 inventory-read approval signature",
);
validateRuntimeSafetyApprovalPayload({
  registryBytes,
  receiptBytes,
  signatureBytes,
  expectedRegistrySha256: requiredOption("--trust-registry-sha256"),
  expectedRole: "owner",
  expectedAction: JSON_POSTGRES_W15_INVENTORY_READ_ACTION,
  expectedEnvironment: JSON_POSTGRES_W15_INVENTORY_READ_ENVIRONMENT,
  expectedPacketSha256: packet.packet_sha256,
  expectedSourceSha: packet.source_sha,
  expectedSourceTree: packet.source_tree,
  allowedDataScope: [JSON_POSTGRES_W15_INVENTORY_READ_DATA_SCOPE],
  allowedContactScope: [],
});
const profile = option("--profile", "matter-readonly-auditor");
if (profile !== "matter-readonly-auditor") {
  throw new Error("W15 production inventory requires matter-readonly-auditor");
}
const awsOptions = { profile, region: packet.target.aws_region };
assertJsonPostgresProductionCaller(
  awsJson(["sts", "get-caller-identity"], awsOptions),
  { role: profile },
);
const databaseSecret = awsSecret(
  packet.target.projection_auditor_secret_ref,
  awsOptions,
);
const contextSecret = awsSecret(
  packet.target.tenant_context_secret_ref,
  awsOptions,
);
if (databaseSecret.username !== "lawos_hrx_projection_auditor"
  || databaseSecret.host !== packet.target.database_host
  || String(databaseSecret.dbname ?? databaseSecret.database)
    !== packet.target.database_name) {
  throw new Error("W15 production inventory database target drifted");
}
const pool = createPostgresPool({
  connectionString: postgresUrlFromSecret(JSON.stringify(databaseSecret)),
  sslMode: "verify-full",
  tenantContextSecret: tenantContextSecret(contextSecret),
  applicationName: "lawos-w15-production-inventory-auditor",
  connectionTimeoutMillis: 10_000,
  statementTimeoutMillis: 120_000,
  max: 1,
});
let inventory;
let schema;
try {
  [inventory, schema] = await Promise.all([
    collectHrxRelationalProductionInventory({
      pool,
      approvedTenantIds: packet.target.approved_tenant_ids,
    }),
    inspectHrxRelationalSchema(pool),
  ]);
} finally {
  await pool.end();
}
const inventorySummary = createJsonPostgresW15InventorySummary(inventory);
const outputDir = createPrivateProgramOutputDirectory(
  requiredOption("--output-dir"),
);
const inventoryFile = writePrivateProgramJson(
  join(outputDir, "w15-production-inventory.json"),
  inventory,
);
const summaryFile = writePrivateProgramJson(
  join(outputDir, "w15-production-inventory-summary.json"),
  inventorySummary,
);
const schemaFile = writePrivateProgramJson(
  join(outputDir, "w15-production-schema-observation.json"),
  schema,
);
const authorizationMaterial = {
  schema_version:
    "law-firm-os.json-postgres-w15-inventory-read-authorization-evidence.v1",
  outcome: "PASS",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  approval_receipt_file_sha256: sha256ProgramBytes(receiptBytes),
  trust_registry_file_sha256: sha256ProgramBytes(registryBytes),
  inventory_sha256: inventory.inventory_sha256,
  schema_observation_sha256: sha256ProgramBytes(
    Buffer.from(canonicalizeJson(schema)),
  ),
  approved_tenant_count: packet.target.approved_tenant_ids.length,
  production_read_executed: true,
  production_write: false,
  raw_value_returned: false,
  pii_returned: false,
  secret_material_returned: false,
};
const authorizationFile = writePrivateProgramJson(
  join(outputDir, "w15-production-inventory-authorization-evidence.json"),
  authorizationMaterial,
);
process.stdout.write(`${JSON.stringify({
  outcome: "PASS",
  inventory_sha256: inventory.inventory_sha256,
  source_record_count: inventory.source_record_count,
  table_count: inventory.table_count,
  output_dir: outputDir,
  inventory_file: inventoryFile,
  summary_file: summaryFile,
  schema_file: schemaFile,
  authorization_file: authorizationFile,
  production_read_executed: true,
  production_write: false,
}, null, 2)}\n`);
