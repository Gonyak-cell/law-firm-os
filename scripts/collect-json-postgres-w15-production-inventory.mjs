#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  validateHrxRelationalProductionInventory,
} from "../packages/hrx/src/relational-projection-contract.js";
import {
  createJsonPostgresW15InventoryProvenance,
  validateJsonPostgresW15InventoryBootstrapPacket,
} from "../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";
import {
  assertJsonPostgresW15SourcePublished,
} from "./lib/json-postgres-w15-bootstrap-event.mjs";
import {
  createJsonPostgresW15InventorySummary,
} from "./lib/json-postgres-w15-contracts.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]
    || process.argv[index + 1].startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return process.argv[index + 1];
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 inventory extraction requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const originMainSha = git("rev-parse", "origin/main");
const originMainTree = git("rev-parse", "origin/main^{tree}");
assertJsonPostgresW15SourcePublished({
  sourceSha,
  sourceTree,
  originMainSha,
  originMainTree,
  sourceIsAncestor: spawnSync(
    "git",
    ["merge-base", "--is-ancestor", sourceSha, originMainSha],
    { cwd: process.cwd(), encoding: "utf8" },
  ).status === 0,
});
const packet = readPrivateProgramJson(
  option("--packet"),
  "W15 inventory bootstrap packet",
);
const packetValidation =
  validateJsonPostgresW15InventoryBootstrapPacket(packet, {
    sourceSha,
    sourceTree,
  });
const responseBytes = readPrivateProgramBytes(
  option("--invocation-response"),
  "W15 inventory Lambda response",
);
const response = JSON.parse(responseBytes);
if (response?.schema_version
    !== "law-firm-os.json-postgres-w15-inventory-observation.v1"
  || response.outcome !== "PASS"
  || response.mode !== "inventory-read"
  || response.source_sha !== sourceSha
  || response.source_tree !== sourceTree
  || response.packet_sha256 !== packetValidation.packet_sha256
  || response.claims?.generic_ledger_authority_preserved !== true
  || response.claims?.aggregate_inventory_only !== true
  || response.claims?.projection_data_written !== false
  || response.claims?.consumer_rollout_performed !== false
  || response.claims?.raw_value_returned !== false
  || response.claims?.pii_returned !== false
  || response.claims?.secret_material_returned !== false
  || response.safe_counts?.projection_data_write_count !== 0
  || response.safe_counts?.source_authority_write_count !== 0
  || response.safe_counts?.consumer_route_change_count !== 0) {
  throw new Error("W15 inventory observation response is invalid");
}
const expectedProvenance = createJsonPostgresW15InventoryProvenance({
  sourceSha,
  sourceTree,
  bootstrapPacketSha256: packetValidation.packet_sha256,
  schemaBootstrapResultSha256:
    response.schema_bootstrap_result_sha256,
});
if (JSON.stringify(response.provenance)
    !== JSON.stringify(expectedProvenance)
  || response.inventory?.inventory_provenance_sha256
    !== expectedProvenance.provenance_sha256) {
  throw new Error("W15 inventory provenance drifted");
}
validateHrxRelationalProductionInventory(response.inventory);
const summary = createJsonPostgresW15InventorySummary(response.inventory);
const outputDir = createPrivateProgramOutputDirectory(option("--output-dir"));
const inventoryFile = writePrivateProgramJson(
  join(outputDir, "w15-production-inventory.json"),
  response.inventory,
);
const summaryFile = writePrivateProgramJson(
  join(outputDir, "w15-production-inventory-summary.json"),
  summary,
);
const schemaFile = writePrivateProgramJson(
  join(outputDir, "w15-production-schema-observation.json"),
  response.schema,
);
const authorizationFile = writePrivateProgramJson(
  join(outputDir, "w15-production-inventory-authorization-evidence.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-w15-inventory-authorization-evidence.v2",
    outcome: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    bootstrap_packet_sha256: packetValidation.packet_sha256,
    schema_bootstrap_result_sha256:
      response.schema_bootstrap_result_sha256,
    inventory_provenance_sha256:
      response.inventory.inventory_provenance_sha256,
    inventory_sha256: response.inventory.inventory_sha256,
    invocation_response_sha256: sha256ProgramBytes(responseBytes),
    execution_evidence_sha256: response.execution_evidence_sha256,
    production_read_executed: true,
    production_write: false,
    projection_data_write_count: 0,
    source_authority_write_count: 0,
    consumer_route_change_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  },
);
process.stdout.write(`${JSON.stringify({
  outcome: "PASS",
  inventory_sha256: response.inventory.inventory_sha256,
  inventory_provenance_sha256:
    response.inventory.inventory_provenance_sha256,
  source_record_count: response.inventory.source_record_count,
  table_count: response.inventory.table_count,
  output_dir: outputDir,
  inventory_file: inventoryFile,
  summary_file: summaryFile,
  schema_file: schemaFile,
  authorization_file: authorizationFile,
  production_read_executed: true,
  production_write: false,
}, null, 2)}\n`);
