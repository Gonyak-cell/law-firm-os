#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  createJsonPostgresRehearsalDmsControlResult,
} from "./lib/json-postgres-rehearsal-dms-controls.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const TEST_FILES = Object.freeze([
  "packages/dms/test/postgres-security-regressions.test.js",
  "packages/dms/test/json-postgres-dms-migration.test.js",
]);
const TEST_COMMAND = `node --test ${TEST_FILES.join(" ")}`;

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function required(name) {
  const value = option(name);
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
  throw new Error(
    "W12 DMS control collection requires a clean exact-head worktree",
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(
  required("--packet"),
  "W12 execution packet",
);
const validated = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: validated.packet_sha256,
});
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required("--registry"),
  trustRegistrySha256: required("--registry-sha256"),
  approvalReceiptPath: required("--approval"),
});
const test = spawnSync(process.execPath, ["--test", ...TEST_FILES], {
  cwd: process.cwd(),
  encoding: null,
  maxBuffer: 64 * 1024 * 1024,
  stdio: ["ignore", "pipe", "pipe"],
});
const testOutput = Buffer.concat([
  test.stdout ?? Buffer.alloc(0),
  test.stderr ?? Buffer.alloc(0),
]);
if (test.status !== 0) {
  throw new Error("W12 exact-head DMS governance tests failed");
}
const result = createJsonPostgresRehearsalDmsControlResult({
  packet,
  dmsManifest: readPrivateProgramJson(
    required("--dms-manifest"),
    "W12 DMS manifest",
  ),
  execution: readPrivateProgramJson(
    required("--execution-evidence"),
    "W12 DMS execution evidence",
  ),
  infrastructure: readPrivateProgramJson(
    required("--infrastructure-result"),
    "W12 infrastructure result",
  ),
  testCommand: TEST_COMMAND,
  testOutput,
  testExitCode: test.status,
});
const outputDir = createPrivateProgramOutputDirectory(
  required("--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "w12-dms-control-result.json"),
  result,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  dms_source_object_count: 0,
  provider_write_count: 0,
  result_path: output.path,
  result_file_sha256: output.sha256,
  result_sha256: result.result_sha256,
}, null, 2)}\n`);
