#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  createJsonPostgresProgramStageProbeFromEvidence,
  validateJsonPostgresProgramStageEvidence,
  verifyJsonPostgresProgramStageEvidenceArtifacts,
} from "../packages/persistence/src/postgres/program-stage-evidence.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = {};
  const sourceArtifacts = [];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    if (flag === "--source-artifact") {
      sourceArtifacts.push(value);
    } else {
      if (values[flag] != null) throw new TypeError(`duplicate option: ${flag}`);
      values[flag] = value;
    }
  }
  return { values, sourceArtifacts };
}

function required(value, name) {
  if (!value || value.startsWith?.("--")) throw new TypeError(`${name} is required`);
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
  throw new Error("program stage probe collection requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
});
if (packetSource.phase === "w13-production-cutover"
  && git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("production stage probe collection requires exact origin/main");
}
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
const evidence = readPrivateProgramJson(
  required(option("--evidence"), "--evidence"),
  "program stage evidence",
);
const stage = required(option("--stage"), "--stage");
const probeKind = required(option("--probe-kind"), "--probe-kind");
if (evidence.stage !== stage || evidence.probe_kind !== probeKind) {
  throw new Error("program stage evidence route drifted");
}
validateJsonPostgresProgramStageEvidence(evidence, { packet });
const sourceArtifacts = parsed.sourceArtifacts.map((value) => {
  const separator = value.indexOf("=");
  if (separator < 1 || separator === value.length - 1) {
    throw new Error("--source-artifact must use kind=/private/path");
  }
  const kind = value.slice(0, separator);
  return {
    kind,
    bytes: readPrivateProgramBytes(
      value.slice(separator + 1),
      `${kind} source artifact`,
    ),
  };
});
verifyJsonPostgresProgramStageEvidenceArtifacts({
  evidence,
  artifacts: sourceArtifacts,
});
const probe = createJsonPostgresProgramStageProbeFromEvidence({
  packet,
  evidence,
  probeId: required(option("--probe-id"), "--probe-id"),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, `${stage}-${probeKind}-probe.json`),
  probe,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  stage,
  probe_kind: probeKind,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  evidence_sha256: evidence.result_sha256,
  source_artifact_count: sourceArtifacts.length,
  probe_path: output.path,
  probe_file_sha256: output.sha256,
  probe_result_sha256: probe.result_sha256,
}, null, 2)}\n`);
