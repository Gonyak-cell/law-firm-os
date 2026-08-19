#!/usr/bin/env node
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS,
  createJsonPostgresExecutionPacket,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./lib/json-postgres-production-artifact.mjs";
import {
  createJsonPostgresExecutionPacketWithDatabaseTarget,
} from "./lib/json-postgres-database-target-receipt-producer.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const INPUT_VERSION = "law-firm-os.json-postgres-execution-packet-input.v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const COMPUTED_BINDINGS = new Set([
  "artifact_sha256",
  "artifact_manifest_sha256",
  "lockfile_sha256",
]);

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
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

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length) throw new Error(`${label} contains unsupported fields: ${extras.join(", ")}`);
}

const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("execution packet generation requires a clean exact-head worktree");
}
const input = readPrivateProgramJson(
  required(option("--packet-input"), "--packet-input"),
  "packet input",
);
closedObject(input, ["schema_version", "packet_id", "phase", "binding_sha256", "target"], "packet input");
if (input.schema_version !== INPUT_VERSION) throw new Error("packet input schema is invalid");
closedObject(
  input.binding_sha256,
  JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS.filter((key) => !COMPUTED_BINDINGS.has(key)),
  "packet input binding_sha256",
);
const expectedProvided = JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS
  .filter((key) => !COMPUTED_BINDINGS.has(key))
  .sort();
if (JSON.stringify(Object.keys(input.binding_sha256).sort()) !== JSON.stringify(expectedProvided)) {
  throw new Error("packet input binding set is incomplete");
}
for (const [key, digest] of Object.entries(input.binding_sha256)) {
  if (!SHA256.test(String(digest ?? ""))) throw new Error(`${key} is not a SHA-256 digest`);
}

const artifactBytes = readPrivateProgramBytes(
  required(option("--artifact"), "--artifact"),
  "production artifact",
);
const artifactManifestBytes = readPrivateProgramBytes(
  required(option("--artifact-manifest"), "--artifact-manifest"),
  "production artifact manifest",
);
const artifactManifest = JSON.parse(artifactManifestBytes);
validateJsonPostgresProductionDeploymentManifest(artifactManifest);
const artifactSha256 = sha256ProgramBytes(artifactBytes);
if (artifactManifest.source_sha !== sourceSha
  || artifactManifest.source_tree !== sourceTree
  || artifactManifest.artifact_sha256 !== artifactSha256
  || artifactManifest.artifact_filename !== basename(required(option("--artifact"), "--artifact"))) {
  throw new Error("production artifact manifest exact-head binding drifted");
}
const bindings = {
  artifact_sha256: artifactSha256,
  artifact_manifest_sha256: sha256ProgramBytes(artifactManifestBytes),
  lockfile_sha256: sha256ProgramBytes(gitBytes("cat-file", "blob", `${sourceSha}:package-lock.json`)),
  ...input.binding_sha256,
};
const created = createJsonPostgresExecutionPacketWithDatabaseTarget({
  createPacket: createJsonPostgresExecutionPacket,
  packetOptions: {
    packetId: input.packet_id,
    sourceSha,
    sourceTree,
    phase: input.phase,
    bindings,
    target: input.target,
  },
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const packetFile = writePrivateProgramJson(
  join(outputDir, `${input.phase}-execution-packet.json`),
  created.packet,
);
const summaryFile = writePrivateProgramJson(
  join(outputDir, `${input.phase}-execution-packet-summary.json`),
  {
    schema_version: "law-firm-os.json-postgres-execution-packet-summary.v1",
    packet_id: input.packet_id,
    phase: input.phase,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_canonical_sha256: created.packet_sha256,
    packet_file_sha256: packetFile.sha256,
    artifact_sha256: artifactSha256,
    artifact_manifest_sha256: bindings.artifact_manifest_sha256,
    lockfile_sha256: bindings.lockfile_sha256,
    inventory_delta_policy_sha256: bindings.inventory_delta_policy_sha256,
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    real_data_read: false,
    aws_mutation_executed: false,
    production_write: false,
    release: false,
    go_live: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  packet_id: input.packet_id,
  phase: input.phase,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_canonical_sha256: created.packet_sha256,
  packet_path: packetFile.path,
  packet_file_sha256: packetFile.sha256,
  summary_path: summaryFile.path,
  current_state: "PENDING_HUMAN_APPROVAL",
  external_actions_authorized: false,
}, null, 2)}\n`);
