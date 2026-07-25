#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { basename, join } from "node:path";
import {
  createJsonPostgresW15InventoryBootstrapPacket,
} from "../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";
import {
  validateJsonPostgresExecutionPacket,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  hrxRelationalMigrationCatalogSha256,
} from "../packages/hrx/src/relational-projection-contract.js";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./lib/json-postgres-production-artifact.mjs";
import {
  validateJsonPostgresProductionArtifactStoreTemplate,
  validateJsonPostgresProductionTemplate,
} from "./lib/json-postgres-production-infrastructure.mjs";
import {
  jsonPostgresProductionCombinedTemplateSha256,
} from "./lib/json-postgres-production-execution.mjs";
import {
  validateJsonPostgresW15BaselineManifest,
  validateJsonPostgresW15PredecessorVerification,
} from "./lib/json-postgres-w15-preflight.mjs";
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

function gitBytes(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
}

const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 bootstrap packet requires a clean exact-head worktree");
}
const baseline = readPrivateProgramJson(
  option("--baseline"),
  "W15 baseline manifest",
);
const predecessorVerification = readPrivateProgramJson(
  option("--predecessor-verification"),
  "W15 predecessor verification",
);
validateJsonPostgresW15BaselineManifest(baseline);
validateJsonPostgresW15PredecessorVerification(predecessorVerification);
if (spawnSync(
  "git",
  ["merge-base", "--is-ancestor", baseline.exact_main_sha, sourceSha],
  { cwd: process.cwd(), encoding: "utf8" },
).status !== 0
  || baseline.predecessor_verification_sha256
    !== predecessorVerification.result_sha256) {
  throw new Error("W15 bootstrap baseline or predecessor drifted");
}
const priorPacket = readPrivateProgramJson(
  option("--prior-production-packet"),
  "completed W13 production packet",
);
validateJsonPostgresExecutionPacket(priorPacket, {
  phase: "w13-production-cutover",
});
if (JSON.stringify(
  [...priorPacket.target.approved_tenant_ids].sort(),
) !== JSON.stringify(
  [...baseline.target.approved_tenant_ids].sort(),
)
  || priorPacket.target.aws_account !== baseline.target.aws_account
  || priorPacket.target.aws_region !== baseline.target.aws_region
  || priorPacket.target.monthly_cost_ceiling_krw
    !== baseline.target.monthly_cost_ceiling_krw
  || priorPacket.target.public_access !== false
  || priorPacket.target.tls_mode !== "verify-full") {
  throw new Error("W15 bootstrap target drifted from the completed baseline");
}
const artifactPath = option("--artifact");
const artifactBytes = readPrivateProgramBytes(
  artifactPath,
  "W15 bootstrap artifact",
);
const manifestBytes = readPrivateProgramBytes(
  option("--artifact-manifest"),
  "W15 bootstrap artifact manifest",
);
const artifactManifest = JSON.parse(manifestBytes);
validateJsonPostgresProductionDeploymentManifest(artifactManifest);
const artifactSha256 = sha256ProgramBytes(artifactBytes);
if (artifactManifest.source_sha !== sourceSha
  || artifactManifest.source_tree !== sourceTree
  || artifactManifest.artifact_sha256 !== artifactSha256
  || artifactManifest.artifact_filename !== basename(artifactPath)) {
  throw new Error("W15 bootstrap artifact exact-head binding drifted");
}
const artifactStoreTemplate = readPrivateProgramJson(
  option("--artifact-store-template"),
  "production artifact-store template",
);
const infrastructureTemplate = readPrivateProgramJson(
  option("--infrastructure-template"),
  "production infrastructure template",
);
validateJsonPostgresProductionArtifactStoreTemplate(artifactStoreTemplate);
validateJsonPostgresProductionTemplate(infrastructureTemplate);
const bindings = {
  artifact_sha256: artifactSha256,
  artifact_manifest_sha256: sha256ProgramBytes(manifestBytes),
  lockfile_sha256: sha256ProgramBytes(
    gitBytes("cat-file", "blob", `${sourceSha}:package-lock.json`),
  ),
  migration_catalog_sha256: hrxRelationalMigrationCatalogSha256(),
  infrastructure_template_sha256:
    jsonPostgresProductionCombinedTemplateSha256({
      artifactStoreTemplate,
      productionTemplate: infrastructureTemplate,
    }),
  baseline_sha256: baseline.result_sha256,
  predecessor_verification_sha256:
    predecessorVerification.result_sha256,
  w12_terminal_receipt_sha256:
    baseline.w12_terminal_receipt_sha256,
  cut012_terminal_receipt_sha256:
    baseline.cut012_terminal_receipt_sha256,
  go_live_receipt_sha256:
    baseline.go_live_receipt_sha256,
};
const created = createJsonPostgresW15InventoryBootstrapPacket({
  packetId: option("--packet-id"),
  sourceSha,
  sourceTree,
  bindings,
  target: priorPacket.target,
});
const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const packetFile = writePrivateProgramJson(
  join(outputDir, "w15-inventory-bootstrap-packet.json"),
  created.packet,
);
const summaryFile = writePrivateProgramJson(
  join(outputDir, "w15-inventory-bootstrap-packet-summary.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-w15-inventory-bootstrap-packet-summary.v1",
    outcome: "READY_FOR_OWNER_SIGNATURE",
    packet_id: created.packet.packet_id,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_canonical_sha256: created.packet_sha256,
    packet_file_sha256: packetFile.sha256,
    artifact_sha256: bindings.artifact_sha256,
    artifact_manifest_sha256: bindings.artifact_manifest_sha256,
    infrastructure_template_sha256:
      bindings.infrastructure_template_sha256,
    migration_catalog_sha256: bindings.migration_catalog_sha256,
    allowed_modes: created.packet.allowed_modes,
    projection_data_write_authorized: false,
    consumer_rollout_authorized: false,
    authority_promotion_authorized: false,
    external_actions_authorized: false,
  },
);
process.stdout.write(`${JSON.stringify({
  outcome: "PASS",
  readiness: "READY_FOR_OWNER_SIGNATURE",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_canonical_sha256: created.packet_sha256,
  packet_path: packetFile.path,
  packet_file_sha256: packetFile.sha256,
  summary_path: summaryFile.path,
  external_actions_authorized: false,
}, null, 2)}\n`);
