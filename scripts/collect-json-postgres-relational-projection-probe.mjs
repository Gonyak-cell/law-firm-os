#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  createJsonPostgresRelationalProjectionProbe,
  createJsonPostgresRelationalProjectionValidation,
} from "./lib/json-postgres-relational-projection-closeout.mjs";
import {
  createPrivateProgramOutputDirectory,
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

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 closeout requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("W15 closeout requires exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "W15 execution packet",
);
const validated = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w15-relational-projection",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: validated.packet_sha256,
});
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required(option("--registry"), "--registry"),
  trustRegistrySha256: required(option("--registry-sha256"), "--registry-sha256"),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const closeout = createJsonPostgresRelationalProjectionValidation({
  packet,
  execution: readPrivateProgramJson(
    required(option("--execution"), "--execution"),
    "W15 projection execution",
  ),
  validation: readPrivateProgramJson(
    required(option("--validation"), "--validation"),
    "W15 projection validation",
  ),
});
const probe = createJsonPostgresRelationalProjectionProbe({
  packet,
  closeout,
  monthlyCostForecastKrw: Number(
    required(option("--monthly-cost-krw"), "--monthly-cost-krw"),
  ),
  startedAt: required(option("--started-at"), "--started-at"),
  finishedAt: required(option("--finished-at"), "--finished-at"),
  probeId: required(option("--probe-id"), "--probe-id"),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const closeoutFile = writePrivateProgramJson(
  join(outputDir, "w15-relational-projection-closeout.json"),
  closeout,
);
const probeFile = writePrivateProgramJson(
  join(outputDir, "w15-relational-projection-probe.json"),
  probe,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  closeout_path: closeoutFile.path,
  closeout_sha256: closeoutFile.sha256,
  probe_path: probeFile.path,
  probe_result_sha256: probe.result_sha256,
  authority_promotion_executed: false,
}, null, 2)}\n`);
