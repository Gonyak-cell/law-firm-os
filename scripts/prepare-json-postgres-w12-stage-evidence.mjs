#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  readPrivateProgramBytes,
  readPrivateProgramJson,
  createPrivateProgramOutputDirectory,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";
import {
  deriveJsonPostgresW12StageEvidence,
} from "./lib/json-postgres-w12-stage-evidence.mjs";

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
      if (values[flag] != null) {
        throw new TypeError(`duplicate option: ${flag}`);
      }
      values[flag] = value;
    }
  }
  return { values, sourceArtifacts };
}

function required(value, name) {
  if (!value || value.startsWith?.("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

const startedAt = new Date().toISOString();
const parsed = parse(process.argv.slice(2));
const option = (name) => parsed.values[name] ?? null;
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error(
    "W12 stage evidence derivation requires a clean exact-head worktree",
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "W12 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
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
  trustRegistrySha256: required(
    option("--registry-sha256"),
    "--registry-sha256",
  ),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const stage = required(option("--stage"), "--stage");
const sourceArtifacts = parsed.sourceArtifacts.map((value) => {
  const separator = value.indexOf("=");
  if (separator < 1 || separator === value.length - 1) {
    throw new Error("--source-artifact must use kind=/private/path");
  }
  const kind = value.slice(0, separator);
  return Object.freeze({
    kind,
    bytes: readPrivateProgramBytes(
      value.slice(separator + 1),
      `${kind} source artifact`,
    ),
  });
});
const commandSha256 = digest(
  `node scripts/prepare-json-postgres-w12-stage-evidence.mjs`
  + ` --stage ${stage}`,
);
const evidence = deriveJsonPostgresW12StageEvidence({
  packet,
  stage,
  evidenceId:
    `w12-${stage}-${packet.packet_sha256.slice(0, 20)}`,
  startedAt,
  finishedAt: new Date().toISOString(),
  commandSha256,
  sourceArtifacts,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, `${stage}-evidence.json`),
  evidence,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  stage,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  evidence_path: output.path,
  evidence_file_sha256: output.sha256,
  evidence_result_sha256: evidence.result_sha256,
  source_artifact_count: sourceArtifacts.length,
}, null, 2)}\n`);
