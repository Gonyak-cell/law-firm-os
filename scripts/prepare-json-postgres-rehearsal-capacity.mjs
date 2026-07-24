#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  prepareJsonPostgresDmsObjectManifest,
} from "../packages/dms/src/json-postgres-dms-migration.js";
import {
  createJsonPostgresRehearsalCapacityResult,
} from "./lib/json-postgres-rehearsal-capacity.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = {};
  const executionResults = [];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    if (flag === "--execution-result") {
      executionResults.push(value);
    } else if (values[flag] != null) {
      throw new TypeError(`duplicate option: ${flag}`);
    } else {
      values[flag] = value;
    }
  }
  return Object.freeze({ values, executionResults });
}

function required(value, label) {
  if (!value) throw new TypeError(`${label} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

const parsed = parse(process.argv.slice(2));
const option = (name) => parsed.values[name] ?? null;
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error(
    "W12 capacity preparation requires a clean exact-head worktree",
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "W12 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(
  packetSource,
  {
    sourceSha,
    sourceTree,
    phase: "w12-real-data-rehearsal",
  },
);
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required(option("--registry"), "--registry"),
  trustRegistrySha256: required(
    option("--registry-sha256"),
    "--registry-sha256",
  ),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const performanceBudget = readPrivateProgramJson(
  required(option("--performance-budget"), "--performance-budget"),
  "W12 performance budget",
);
const dmsManifest = prepareJsonPostgresDmsObjectManifest(
  readPrivateProgramJson(
    required(option("--dms-manifest"), "--dms-manifest"),
    "W12 DMS manifest",
  ),
);
const executionResults = parsed.executionResults.map((path) =>
  readPrivateProgramJson(path, "W12 execution result"));
const result = createJsonPostgresRehearsalCapacityResult({
  packet,
  performanceBudget,
  executionResults,
  dmsObjectCount: dmsManifest.objects.length,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const capacityOutput = writePrivateProgramJson(
  join(outputDir, "capacity-result.json"),
  result,
);
const acceptanceOutput = writePrivateProgramJson(
  join(outputDir, "performance-acceptance.json"),
  result.acceptance,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  execution_result_count: executionResults.length,
  capacity_result_sha256: result.result_sha256,
  performance_acceptance_sha256:
    result.acceptance.acceptance_sha256,
  capacity_result_path: capacityOutput.path,
  capacity_result_file_sha256: capacityOutput.sha256,
  performance_acceptance_path: acceptanceOutput.path,
  performance_acceptance_file_sha256: acceptanceOutput.sha256,
}, null, 2)}\n`);
