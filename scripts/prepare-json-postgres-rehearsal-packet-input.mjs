#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  createJsonPostgresRehearsalPacketInput,
} from "./lib/json-postgres-rehearsal-packet.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    const key = flag.slice(2);
    if (result[key] != null) throw new TypeError(`duplicate option: ${flag}`);
    result[key] = value;
  }
  return result;
}

function required(value, name) {
  if (!value) throw new TypeError(`--${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

const options = parse(process.argv.slice(2));
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W12 packet input preparation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const read = (key, label = key) =>
  readPrivateProgramJson(required(options[key], key), label);
const packetInput = createJsonPostgresRehearsalPacketInput({
  packetId: required(options["packet-id"], "packet-id"),
  sourceSha,
  sourceTree,
  target: read("target", "W12 target"),
  inventory: read("inventory", "source inventory"),
  recordAuthority: read("record-authority", "record authority"),
  recordTypeCatalog: read("catalog", "record-type catalog"),
  fieldCrosswalk: read("field-crosswalk", "field crosswalk"),
  authorityManifest: read("authority-manifest", "source authority manifest"),
  authoritySummary: read("authority-summary", "authority bundle summary"),
  corpus: read("corpus", "migration corpus"),
  sourceTransformResult: read(
    "source-transform-result",
    "source transform result",
  ),
  dmsManifest: read("dms-manifest", "DMS object manifest"),
  dmsClassification: read("dms-classification", "DMS classification"),
  artifactStoreTemplate: read(
    "artifact-store-template",
    "W12 artifact-store template",
  ),
  infrastructureTemplate: read(
    "infrastructure-template",
    "W12 infrastructure template",
  ),
  migrationCatalog: read("migration-catalog", "migration catalog"),
  dmsProviderContract: read(
    "dms-provider-contract",
    "DMS provider contract",
  ),
  backupRetentionContract: read(
    "backup-retention-contract",
    "backup retention contract",
  ),
  performanceBudget: read(
    "performance-acceptance",
    "W12 performance budget",
  ),
  postWriteRunbook: read(
    "post-write-runbook",
    "post-write runbook contract",
  ),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const packet = writePrivateProgramJson(
  join(outputDir, "w12-execution-packet-input.json"),
  packetInput,
);
const summary = writePrivateProgramJson(
  join(outputDir, "w12-execution-packet-input-summary.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-packet-input-summary.v1",
    packet_id: packetInput.packet_id,
    phase: packetInput.phase,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_input_file_sha256: packet.sha256,
    binding_count: Object.keys(packetInput.binding_sha256).length,
    target_ref: packetInput.target.target_ref,
    approved_tenant_count: packetInput.target.approved_tenant_ids.length,
    external_actions_authorized: false,
    aws_mutated: false,
    postgres_mutated: false,
    real_data_mutated: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_input_path: packet.path,
  packet_input_file_sha256: packet.sha256,
  summary_path: summary.path,
  external_actions_authorized: false,
}, null, 2)}\n`);
