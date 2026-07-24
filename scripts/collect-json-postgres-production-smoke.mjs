#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  createJsonPostgresEventAcceptanceEvidence,
  createJsonPostgresProductionSmokeEvidence,
} from "./lib/json-postgres-production-smoke.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function options(name) {
  return process.argv.flatMap((value, index) =>
    value === name && process.argv[index + 1] ? [process.argv[index + 1]] : []);
}

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("production smoke aggregation requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("production smoke aggregation requires exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "W13/W14 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required(option("--registry"), "--registry"),
  trustRegistrySha256: required(option("--registry-sha256"), "--registry-sha256"),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const productionComponents = options("--production-component")
  .map((path) => readPrivateProgramJson(path, "production smoke component"));
const eventComponents = options("--event-component")
  .map((path) => readPrivateProgramJson(path, "event acceptance component"));
const authorityCounters = readPrivateProgramJson(
  required(option("--authority-counters"), "--authority-counters"),
  "legacy authority counters",
);
const productionSmoke = createJsonPostgresProductionSmokeEvidence({
  packet,
  components: productionComponents,
  authorityCounters,
});
const eventAcceptance = createJsonPostgresEventAcceptanceEvidence({
  packet,
  components: eventComponents,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const smokeOutput = writePrivateProgramJson(
  join(outputDir, "production-smoke.json"),
  productionSmoke,
);
const eventOutput = writePrivateProgramJson(
  join(outputDir, "event-acceptance.json"),
  eventAcceptance,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  production_smoke_path: smokeOutput.path,
  production_smoke_result_sha256: productionSmoke.result_sha256,
  event_acceptance_path: eventOutput.path,
  event_acceptance_result_sha256: eventAcceptance.result_sha256,
  production_component_count: productionComponents.length,
  event_component_count: eventComponents.length,
  active_stop_condition_count: 0,
  secret_material_recorded: false,
}, null, 2)}\n`);
