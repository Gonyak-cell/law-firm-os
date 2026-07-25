#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createJsonPostgresW15ContractBundle,
} from "./lib/json-postgres-w15-contracts.mjs";
import {
  createHrxRelationalMappingResolution,
} from "../packages/hrx/src/relational-projection-contract.js";
import {
  prepareJsonPostgresMigrationCorpus,
} from "../packages/persistence/src/postgres/json-postgres-migration.js";
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

function optionalOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  if (!process.argv[index + 1]
    || process.argv[index + 1].startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return process.argv[index + 1];
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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
const migrationCorpusPath = optionalOption("--migration-corpus");
const closeoutEvidencePath =
  optionalOption("--phase-a-closeout-evidence");
if ((migrationCorpusPath == null) !== (closeoutEvidencePath == null)) {
  throw new Error(
    "mapping remediation requires both migration corpus and Phase A closeout evidence",
  );
}
let mappingResolution = null;
if (migrationCorpusPath) {
  const corpus = readPrivateProgramJson(
    migrationCorpusPath,
    "approved migration corpus",
  );
  const closeoutEvidence = readPrivateProgramJson(
    closeoutEvidencePath,
    "W15 Phase A closeout evidence",
  );
  if (closeoutEvidence.schema_version
      !== "law-firm-os.json-postgres-w15-phase-a-closeout.v1"
    || closeoutEvidence.outcome !== "BLOCKED") {
    throw new Error("W15 Phase A closeout evidence is invalid");
  }
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, {
    allowRealData: true,
  });
  mappingResolution = createHrxRelationalMappingResolution({
    schema,
    inventory,
    sourceRecords: prepared.domains.find((domain) =>
      domain.domain_id === "hrx")?.records ?? [],
    migrationCorpusFileSha256: fileSha256(migrationCorpusPath),
    migrationCorpusManifestSha256: prepared.manifest_sha256,
    phaseACloseoutEvidenceSha256:
      fileSha256(closeoutEvidencePath),
  });
}
const bundle = createJsonPostgresW15ContractBundle({
  schema,
  inventory,
  performanceAcceptance,
  mappingResolution,
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
if (bundle.mappingResolution) {
  files.mapping_resolution = writePrivateProgramJson(
    join(outputDir, "w15-hrx-mapping-resolution.json"),
    bundle.mappingResolution,
  );
}
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
  mapping_resolution_sha256:
    bundle.summary.mapping_resolution_sha256,
  output_dir: outputDir,
  files,
  external_action_executed: false,
}, null, 2)}\n`);
if (bundle.summary.outcome !== "PASS") process.exitCode = 2;
