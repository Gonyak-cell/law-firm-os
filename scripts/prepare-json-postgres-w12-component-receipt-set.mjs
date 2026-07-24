#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  JSON_POSTGRES_W12_RECEIPTS,
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresW12ComponentReceiptSet,
} from "./lib/json-postgres-w12-component-receipt-set.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = {};
  const receipts = [];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    if (flag === "--receipt") {
      receipts.push(value);
    } else {
      if (values[flag] != null) {
        throw new TypeError(`duplicate option: ${flag}`);
      }
      values[flag] = value;
    }
  }
  return { values, receipts };
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

const parsed = parse(process.argv.slice(2));
const option = (name) => parsed.values[name] ?? null;
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error(
    "W12 component receipt collection requires a clean exact-head worktree",
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
  { sourceSha, sourceTree },
);
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const registryPath = required(option("--registry"), "--registry");
const trustRegistry = readPrivateProgramJson(
  registryPath,
  "owner trust registry",
);
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: required(
    option("--registry-sha256"),
    "--registry-sha256",
  ),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const expectedKinds = JSON_POSTGRES_W12_RECEIPTS.filter(
  (kind) => kind !== "w12-terminal",
);
if (parsed.receipts.length !== expectedKinds.length) {
  throw new Error("W12 component receipt paths are incomplete");
}
const verifiedReceipts = parsed.receipts.map((path, index) => {
  const receipt = readPrivateProgramJson(
    path,
    `${expectedKinds[index]} receipt`,
  );
  if (receipt.receipt_kind !== expectedKinds[index]) {
    throw new Error("W12 component receipt order drifted");
  }
  return verifyJsonPostgresProgramReceipt({
    receipt,
    signature: readPrivateProgramBytes(
      `${path}.sig`,
      `${receipt.receipt_kind} receipt signature`,
    ),
    trustRegistry,
    expected: {
      sourceSha,
      sourceTree,
      packetSha256: packet.packet_sha256,
    },
  });
});
const result = createJsonPostgresW12ComponentReceiptSet({
  packet,
  verifiedReceipts,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "w12-component-receipt-set.json"),
  result,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  component_receipt_count: result.safe_counts.component_receipt_count,
  verified_signature_count: result.safe_counts.verified_signature_count,
  result_path: output.path,
  result_file_sha256: output.sha256,
  result_sha256: result.result_sha256,
}, null, 2)}\n`);
