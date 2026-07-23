#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  createJsonPostgresFormalReleaseProbe,
  createJsonPostgresGoLiveProbe,
  createJsonPostgresMacosSigningEvidence,
  createJsonPostgresMacosSigningProbe,
  createJsonPostgresWindowsSigningEvidence,
  createJsonPostgresWindowsSigningProbe,
} from "./lib/json-postgres-release-program.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const STAGES = new Set([
  "macos-signing",
  "windows-signing",
  "formal-release",
  "go-live",
]);

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    const key = flag.slice(2);
    if (values[key] != null) throw new TypeError(`duplicate option: ${flag}`);
    values[key] = value;
  }
  return values;
}

function required(value, name) {
  if (!value) throw new TypeError(`--${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

const options = parse(process.argv.slice(2));
const stage = required(options.stage, "stage");
if (!STAGES.has(stage)) throw new Error("unsupported release program stage");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("release evidence collection requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("release evidence collection requires exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(options.packet, "packet"),
  "execution packet",
);
const validation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: validation.packet_sha256,
});
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required(options.registry, "registry"),
  trustRegistrySha256: required(options["registry-sha256"], "registry-sha256"),
  approvalReceiptPath: required(options.approval, "approval"),
});
const startedAt = required(options["started-at"], "started-at");
const finishedAt = required(options["finished-at"], "finished-at");
const common = {
  packet,
  probeId: required(options["probe-id"], "probe-id"),
  monthlyCostForecastKrw: Number(required(options["monthly-cost-krw"], "monthly-cost-krw")),
  startedAt,
  finishedAt,
};

let evidence;
let probe;
if (stage === "macos-signing") {
  evidence = createJsonPostgresMacosSigningEvidence({
    packet,
    build: readPrivateProgramJson(required(options.build, "build"), "macOS build result"),
    artifacts: readPrivateProgramJson(
      required(options["artifact-inventory"], "artifact-inventory"),
      "macOS artifact inventory",
    ).artifacts,
  });
  probe = createJsonPostgresMacosSigningProbe({ ...common, evidence });
} else if (stage === "windows-signing") {
  evidence = createJsonPostgresWindowsSigningEvidence({
    packet,
    build: readPrivateProgramJson(required(options.build, "build"), "Windows build result"),
    artifacts: readPrivateProgramJson(
      required(options["artifact-inventory"], "artifact-inventory"),
      "Windows artifact inventory",
    ).artifacts,
  });
  probe = createJsonPostgresWindowsSigningProbe({ ...common, evidence });
} else {
  evidence = readPrivateProgramJson(
    required(options.evidence, "evidence"),
    `${stage} evidence`,
  );
  probe = stage === "formal-release"
    ? createJsonPostgresFormalReleaseProbe({ ...common, evidence })
    : createJsonPostgresGoLiveProbe({ ...common, evidence });
}

const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const evidenceFile = writePrivateProgramJson(
  join(outputDir, `${stage}-evidence.json`),
  evidence,
);
const probeFile = writePrivateProgramJson(
  join(outputDir, `${stage}-probe.json`),
  probe,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  stage,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  evidence_path: evidenceFile.path,
  evidence_sha256: evidenceFile.sha256,
  probe_path: probeFile.path,
  probe_result_sha256: probe.result_sha256,
  external_action_executed: false,
}, null, 2)}\n`);
