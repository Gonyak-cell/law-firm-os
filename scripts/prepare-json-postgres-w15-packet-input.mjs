#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  createJsonPostgresW15PacketInput,
  createJsonPostgresW15PacketReadiness,
} from "./lib/json-postgres-w15-packet.mjs";
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
  throw new Error("W15 packet input preparation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const read = (key, label = key) =>
  readPrivateProgramJson(required(options[key], key), label);
const baseline = read("baseline", "W15 baseline manifest");
if (spawnSync(
  "git",
  ["merge-base", "--is-ancestor", baseline.exact_main_sha, sourceSha],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
).status !== 0) {
  throw new Error("W15 baseline is not an ancestor of the exact packet source");
}
const predecessorVerification = read(
  "predecessor-verification",
  "W15 predecessor verification",
);
const mappingManifest = read("mapping-manifest", "W15 mapping manifest");
const productionInventory = read(
  "production-inventory",
  "W15 production inventory",
);
const performanceAcceptance = read(
  "performance-acceptance",
  "W15 performance acceptance",
);
const packetInput = createJsonPostgresW15PacketInput({
  packetId: required(options["packet-id"], "packet-id"),
  sourceSha,
  sourceTree,
  baseline,
  predecessorVerification,
  priorProductionPacket: read(
    "prior-production-packet",
    "completed W13 production packet",
  ),
  mappingManifest,
  productionInventory,
  performanceAcceptance,
  artifactStoreTemplate: read(
    "artifact-store-template",
    "production artifact-store template",
  ),
  infrastructureTemplate: read(
    "infrastructure-template",
    "production infrastructure template",
  ),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const packetInputFile = writePrivateProgramJson(
  join(outputDir, "w15-execution-packet-input.json"),
  packetInput,
);
const readiness = createJsonPostgresW15PacketReadiness({
  sourceSha,
  sourceTree,
  packetInput,
  baseline,
  predecessorVerification,
  mappingManifest,
  productionInventory,
  performanceAcceptance,
  packetInputFileSha256: packetInputFile.sha256,
});
const readinessFile = writePrivateProgramJson(
  join(outputDir, "w15-execution-packet-readiness.json"),
  readiness,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  outcome: readiness.outcome,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_input_path: packetInputFile.path,
  packet_input_file_sha256: packetInputFile.sha256,
  readiness_path: readinessFile.path,
  external_actions_authorized: false,
}, null, 2)}\n`);
