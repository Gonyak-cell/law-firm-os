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
  createJsonPostgresW15ReceiptSetEvidence,
} from "./lib/json-postgres-relational-projection-closeout.mjs";
import {
  JSON_POSTGRES_W15_COMPONENT_RECEIPTS,
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function options(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name) values.push(process.argv[index + 1]);
  }
  return values;
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
  trustRegistrySha256: required(option("--registry-sha256"), "--registry-sha256"),
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const componentReceiptPaths = options("--component-receipt");
if (componentReceiptPaths.length !== JSON_POSTGRES_W15_COMPONENT_RECEIPTS.length) {
  throw new Error("W15 closeout requires the complete component receipt set");
}
const verifiedComponentReceipts = componentReceiptPaths.map((path) => {
  const receipt = readPrivateProgramJson(path, "W15 component receipt");
  const signature = readPrivateProgramBytes(
    `${path}.sig`,
    "W15 component receipt signature",
  );
  return verifyJsonPostgresProgramReceipt({
    receipt,
    signature,
    trustRegistry,
    expected: {
      sourceSha,
      sourceTree,
      packetSha256: packet.packet_sha256,
    },
  });
});
const receiptSet = createJsonPostgresW15ReceiptSetEvidence({
  packet,
  verifiedReceipts: verifiedComponentReceipts,
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
  receiptSet,
});
const probe = createJsonPostgresRelationalProjectionProbe({
  packet,
  closeout,
  receiptSet,
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
const receiptSetFile = writePrivateProgramJson(
  join(outputDir, "w15-component-receipt-set-evidence.json"),
  receiptSet,
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
  component_receipt_set_path: receiptSetFile.path,
  component_receipt_set_sha256: receiptSet.result_sha256,
  probe_path: probeFile.path,
  probe_result_sha256: probe.result_sha256,
  authority_promotion_executed: false,
}, null, 2)}\n`);
