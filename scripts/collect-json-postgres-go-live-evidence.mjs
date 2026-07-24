#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresGoLiveEvidence,
} from "./lib/json-postgres-release-program.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
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

function receipt(path, kind, trustRegistry, packet) {
  const verified = verifyJsonPostgresProgramReceipt({
    receipt: readPrivateProgramJson(path, `${kind} receipt`),
    signature: readPrivateProgramBytes(`${path}.sig`, `${kind} signature`),
    trustRegistry,
  });
  if (verified.receipt_kind !== kind
    || verified.source_sha !== packet.source_sha
    || verified.source_tree !== packet.source_tree
    || verified.packet_sha256 !== packet.packet_sha256) {
    throw new Error(`${kind} receipt exact binding drifted`);
  }
  return verified;
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("go-live closeout requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("go-live closeout requires exact origin/main");
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
const registryPath = required(option("--registry"), "--registry");
const trustRegistry = readPrivateProgramJson(registryPath, "owner trust registry");
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: required(option("--registry-sha256"), "--registry-sha256"),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const evidence = createJsonPostgresGoLiveEvidence({
  packet,
  cut012Receipt: receipt(
    required(option("--cut012-receipt"), "--cut012-receipt"),
    "cut-012",
    trustRegistry,
    packet,
  ),
  formalReleaseReceipt: receipt(
    required(option("--formal-release-receipt"), "--formal-release-receipt"),
    "formal-release",
    trustRegistry,
    packet,
  ),
  trafficActivation: readPrivateProgramJson(
    required(option("--traffic-activation"), "--traffic-activation"),
    "production traffic activation",
  ),
  smoke: readPrivateProgramJson(
    required(option("--production-smoke"), "--production-smoke"),
    "production smoke",
  ),
  eventAcceptance: readPrivateProgramJson(
    required(option("--event-acceptance"), "--event-acceptance"),
    "event-based acceptance",
  ),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "go-live-evidence.json"),
  evidence,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  evidence_path: output.path,
  evidence_result_sha256: evidence.result_sha256,
  traffic_activated: true,
  event_based_acceptance_passed: true,
  active_stop_condition_count: 0,
  secret_material_recorded: false,
}, null, 2)}\n`);
