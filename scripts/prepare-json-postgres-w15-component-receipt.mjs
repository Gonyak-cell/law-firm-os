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
  createJsonPostgresW15ComponentReceipt,
  validateJsonPostgresW15ComponentResult,
} from "./lib/json-postgres-w15-receipts.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = {};
  const predecessors = [];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    if (flag === "--predecessor") predecessors.push(value);
    else {
      const key = flag.slice(2);
      if (values[key] != null) throw new TypeError(`duplicate option: ${flag}`);
      values[key] = value;
    }
  }
  return { ...values, predecessors };
}

function required(value, label) {
  if (!value) throw new TypeError(`--${label} is required`);
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
  throw new Error("W15 component receipt preparation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("W15 component receipt preparation requires exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(options.packet, "packet"),
  "W15 execution packet",
);
const validatedPacket = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w15-relational-projection",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: validatedPacket.packet_sha256,
});
const registryPath = required(options.registry, "registry");
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
    options["registry-sha256"],
    "registry-sha256",
  ),
  approvalReceiptPath: required(options.approval, "approval"),
});
const result = readPrivateProgramJson(
  required(options.result, "result"),
  "W15 component result",
);
validateJsonPostgresW15ComponentResult(result, {
  packet,
  kind: required(options.kind, "kind"),
});
const predecessors = options.predecessors.map((path) => {
  const receipt = readPrivateProgramJson(path, "W15 predecessor receipt");
  const signature = readPrivateProgramBytes(
    `${path}.sig`,
    "W15 predecessor receipt signature",
  );
  return verifyJsonPostgresProgramReceipt({
    receipt,
    signature,
    trustRegistry,
  });
});
const receipt = createJsonPostgresW15ComponentReceipt({
  packet,
  result,
  predecessors,
  receiptId: required(options["receipt-id"], "receipt-id"),
  signerKeyId: required(options["signer-key-id"], "signer-key-id"),
  command:
    `node scripts/prepare-json-postgres-w15-component-receipt.mjs --kind ${result.receipt_kind}`,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const receiptFile = writePrivateProgramJson(
  join(outputDir, `${result.receipt_kind}-unsigned-receipt.json`),
  receipt,
);
const manifestFile = writePrivateProgramJson(
  join(outputDir, `${result.receipt_kind}-receipt-preparation-manifest.json`),
  {
    schema_version:
      "law-firm-os.json-postgres-w15-receipt-preparation.v1",
    receipt_kind: result.receipt_kind,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packet.packet_sha256,
    component_result_sha256: result.result_sha256,
    unsigned_receipt_sha256: receiptFile.sha256,
    predecessor_receipt_sha256:
      receipt.predecessor_receipt_sha256,
    receipt_signed: false,
    execution_claimed_complete: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  receipt_kind: result.receipt_kind,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  unsigned_receipt_path: receiptFile.path,
  unsigned_receipt_sha256: receiptFile.sha256,
  manifest_path: manifestFile.path,
  receipt_signed: false,
}, null, 2)}\n`);
