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
  createJsonPostgresReleaseSecurityEvidence,
} from "./lib/json-postgres-release-security.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const REPOSITORY = "Gonyak-cell/law-firm-os";

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

function ghJson(args) {
  return JSON.parse(execFileSync("gh", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }));
}

function ghPages(endpoint) {
  const pages = ghJson(["api", "--paginate", "--slurp", endpoint]);
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
    throw new Error("GitHub security inventory is incomplete");
  }
  const result = pages.flat();
  if (result.length > 10_000) throw new Error("GitHub security inventory exceeds the review limit");
  return result;
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("release security collection requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("release security collection requires exact origin/main");
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
const cut008Path = required(option("--cut008-receipt"), "--cut008-receipt");
const cut008Receipt = verifyJsonPostgresProgramReceipt({
  receipt: readPrivateProgramJson(cut008Path, "CUT-008 receipt"),
  signature: readPrivateProgramBytes(`${cut008Path}.sig`, "CUT-008 signature"),
  trustRegistry,
});
const checks = ghJson([
  "api",
  `repos/${REPOSITORY}/commits/${sourceSha}/check-runs?per_page=100`,
]);
if (Number(checks.total_count) !== (checks.check_runs ?? []).length) {
  throw new Error("GitHub exact-head check inventory is incomplete or paginated");
}
const evidence = createJsonPostgresReleaseSecurityEvidence({
  packet,
  cut008Receipt,
  checkRuns: checks.check_runs,
  codeAlerts: ghPages(`repos/${REPOSITORY}/code-scanning/alerts?state=open&per_page=100`),
  dependencyAlerts: ghPages(`repos/${REPOSITORY}/dependabot/alerts?state=open&per_page=100`),
  secretAlerts: ghPages(`repos/${REPOSITORY}/secret-scanning/alerts?state=open&per_page=100`),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "release-security-evidence.json"),
  evidence,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  trusted_action_check_count: evidence.trusted_action_check_count,
  trusted_codeql_check_count: evidence.trusted_codeql_check_count,
  open_critical_count: 0,
  open_high_count: 0,
  sensitive_material_finding_count: 0,
  evidence_path: output.path,
  evidence_sha256: output.sha256,
  github_mutation_executed: false,
}, null, 2)}\n`);
