#!/usr/bin/env node
import { join } from "node:path";
import {
  createJsonPostgresW15ContractBundle,
} from "./lib/json-postgres-w15-contracts.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
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

const schema = readPrivateProgramJson(
  option("--schema-observation"),
  "W15 schema observation",
);
const inventory = readPrivateProgramJson(
  option("--production-inventory"),
  "W15 production inventory",
);
const performanceAcceptance = readPrivateProgramJson(
  option("--performance-acceptance"),
  "W15 performance acceptance",
);
const bundle = createJsonPostgresW15ContractBundle({
  schema,
  inventory,
  performanceAcceptance,
});
const outputDir = createPrivateProgramOutputDirectory(option("--output-dir"));
const files = {
  inventory_summary: writePrivateProgramJson(
    join(outputDir, "w15-production-inventory-summary.json"),
    bundle.inventorySummary,
  ),
  mapping_gap_report: writePrivateProgramJson(
    join(outputDir, "w15-hrx-mapping-gap-report.json"),
    bundle.gapReport,
  ),
  bundle_summary: writePrivateProgramJson(
    join(outputDir, "w15-contract-bundle-summary.json"),
    bundle.summary,
  ),
};
if (bundle.mappingManifest) {
  files.mapping_manifest = writePrivateProgramJson(
    join(outputDir, "w15-hrx-relational-mapping-manifest.json"),
    bundle.mappingManifest,
  );
  files.dependency_order = writePrivateProgramJson(
    join(outputDir, "w15-hrx-table-dependency-order.json"),
    bundle.dependencyOrder,
  );
}
process.stdout.write(`${JSON.stringify({
  outcome: bundle.summary.outcome,
  result_sha256: bundle.summary.result_sha256,
  inventory_sha256: bundle.summary.inventory_sha256,
  mapping_manifest_sha256: bundle.summary.mapping_manifest_sha256,
  mapping_gap_report_sha256: bundle.summary.mapping_gap_report_sha256,
  output_dir: outputDir,
  files,
  external_action_executed: false,
}, null, 2)}\n`);
if (bundle.summary.outcome !== "PASS") process.exitCode = 2;
