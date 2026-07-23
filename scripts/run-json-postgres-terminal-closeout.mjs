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
  createJsonPostgresCut012Probe,
} from "./lib/json-postgres-terminal-closeout.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = { receipt: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    const key = flag.slice(2);
    if (key === "receipt") values.receipt.push(value);
    else if (values[key] != null) throw new TypeError(`duplicate option: ${flag}`);
    else values[key] = value;
  }
  return values;
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
  throw new Error("CUT-012 closeout requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("CUT-012 closeout requires exact origin/main");
}
const packetSource = readPrivateProgramJson(required(options.packet, "packet"), "W13 execution packet");
const validated = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({ ...packetSource, packet_sha256: validated.packet_sha256 });
const registryPath = required(options.registry, "registry");
const trustRegistry = readPrivateProgramJson(registryPath, "owner trust registry");
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: required(options["registry-sha256"], "registry-sha256"),
  approvalReceiptPath: required(options.approval, "approval"),
});
const verifiedReceipts = options.receipt.map((path) =>
  verifyJsonPostgresProgramReceipt({
    receipt: readPrivateProgramJson(path, "program receipt"),
    signature: readPrivateProgramBytes(`${path}.sig`, "program receipt signature"),
    trustRegistry,
  }));
const outputDir = createPrivateProgramOutputDirectory(required(options["output-dir"], "output-dir"));
const probe = createJsonPostgresCut012Probe({
  packet,
  verifiedReceipts,
  migrationResult: readPrivateProgramJson(required(options["cut009-result"], "cut009-result"), "CUT-009 result"),
  drResult: readPrivateProgramJson(required(options["cut010-result"], "cut010-result"), "CUT-010 result"),
  retirementResult: readPrivateProgramJson(required(options["cut011-result"], "cut011-result"), "CUT-011 result"),
  criticalFlowResult: readPrivateProgramJson(
    required(options["critical-flow-result"], "critical-flow-result"),
    "production critical-flow result",
  ),
  monthlyCostForecastKrw: Number(
    required(options["monthly-cost-forecast-krw"], "monthly-cost-forecast-krw"),
  ),
  startedAt: required(options["started-at"], "started-at"),
  finishedAt: new Date().toISOString(),
  probeId: required(options["probe-id"], "probe-id"),
});
const output = writePrivateProgramJson(join(outputDir, "cut-012-probe.json"), probe);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  probe_path: output.path,
  probe_sha256: output.sha256,
  verified_component_receipt_count: probe.safe_counts.verified_component_receipt_count,
}, null, 2)}\n`);
