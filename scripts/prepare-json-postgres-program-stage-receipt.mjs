#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  deriveJsonPostgresProgramStageObservation,
} from "../packages/persistence/src/postgres/program-stage-observation.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresProgramStageReceipt,
} from "./lib/json-postgres-program-stage.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = {};
  const repeated = { probe: [], predecessor: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    const key = flag.slice(2);
    if (Object.hasOwn(repeated, key)) {
      repeated[key].push(value);
    } else if (values[key] != null) {
      throw new TypeError(`duplicate option: ${flag}`);
    } else {
      values[key] = value;
    }
  }
  return { ...values, ...repeated };
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
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("stage receipt preparation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(required(options.packet, "packet"), "execution packet");
const validatedPacket = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
});
if (packetSource.phase !== "w12-real-data-rehearsal"
  && git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("production/release stage receipt preparation requires exact origin/main");
}
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: validatedPacket.packet_sha256,
});
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
const stage = required(options.stage, "stage");
const probes = options.probe.map((path) =>
  readPrivateProgramJson(path, `${stage} probe`));
const derived = deriveJsonPostgresProgramStageObservation({
  stage,
  packet,
  probes,
});
const predecessors = options.predecessor.map((path) => {
  const receipt = readPrivateProgramJson(path, "program predecessor receipt");
  const signature = readPrivateProgramBytes(`${path}.sig`, "program predecessor signature");
  return verifyJsonPostgresProgramReceipt({
    receipt,
    signature,
    trustRegistry,
  });
});
const command = `node scripts/prepare-json-postgres-program-stage-receipt.mjs --stage ${stage}`;
const created = createJsonPostgresProgramStageReceipt({
  stage,
  packet,
  observed: derived.observed,
  predecessors,
  receiptId: required(options["receipt-id"], "receipt-id"),
  signerKeyId: required(options["signer-key-id"], "signer-key-id"),
  startedAt: derived.started_at,
  finishedAt: derived.finished_at,
  command,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const observation = writePrivateProgramJson(
  join(outputDir, `${stage}-observation.json`),
  {
    ...derived.observed,
    probe_result_sha256: derived.probe_result_sha256,
    result_sha256: created.result.result_sha256,
  },
);
const receipt = writePrivateProgramJson(
  join(outputDir, `${stage}-unsigned-receipt.json`),
  created.receipt,
);
const manifest = writePrivateProgramJson(
  join(outputDir, `${stage}-receipt-preparation-manifest.json`),
  {
    schema_version: "law-firm-os.json-postgres-stage-receipt-preparation.v1",
    stage,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packet.packet_sha256,
    observation_sha256: observation.sha256,
    unsigned_receipt_sha256: receipt.sha256,
    probe_result_sha256: derived.probe_result_sha256,
    predecessor_receipt_sha256: predecessors.map((item) => item.canonical_sha256),
    receipt_signed: false,
    execution_claimed_complete: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  stage,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  observation_path: observation.path,
  observation_sha256: observation.sha256,
  unsigned_receipt_path: receipt.path,
  unsigned_receipt_sha256: receipt.sha256,
  manifest_path: manifest.path,
  receipt_signed: false,
}, null, 2)}\n`);
