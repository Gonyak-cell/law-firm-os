#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresW15BaselineManifest,
  createJsonPostgresW15PredecessorVerification,
  createJsonPostgresW15ReceiptLocator,
  JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS,
} from "./lib/json-postgres-w15-preflight.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]
    || process.argv[index + 1].startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return process.argv[index + 1];
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 baseline preparation requires a clean exact-head worktree");
}
git("fetch", "--quiet", "origin", "main");
const exactMainSha = git("rev-parse", "origin/main");
const exactMainTree = git("rev-parse", "origin/main^{tree}");
if (git("rev-parse", "HEAD") !== exactMainSha) {
  throw new Error("W15 baseline preparation requires exact origin/main");
}
const baselineInput = readPrivateProgramJson(
  option("--baseline-input"),
  "W15 baseline input",
);
const receiptSet = readPrivateProgramJson(
  option("--receipt-set"),
  "W15 predecessor receipt set",
);
if (receiptSet?.schema_version
    !== "law-firm-os.json-postgres-w15-predecessor-receipt-set.v1"
  || !Array.isArray(receiptSet.entries)
  || receiptSet.entries.length
    !== JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.length) {
  throw new Error("W15 predecessor receipt-set manifest is invalid");
}
const trustRegistryBytes = readPrivateProgramBytes(
  option("--trust-registry"),
  "W15 owner trust registry",
);
const trustRegistry = JSON.parse(trustRegistryBytes);
const expectedRegistrySha256 = option("--trust-registry-sha256");
if (sha256ProgramBytes(trustRegistryBytes) !== expectedRegistrySha256) {
  throw new Error("W15 trust registry digest drifted");
}
const observedKinds = new Set();
const locators = [];
const verifiedReceipts = receiptSet.entries.map((entry) => {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)
    || JSON.stringify(Object.keys(entry).sort())
      !== JSON.stringify(["receipt_kind", "receipt_path", "signature_path"])
    || observedKinds.has(entry.receipt_kind)) {
    throw new Error("W15 predecessor receipt-set entry is invalid");
  }
  observedKinds.add(entry.receipt_kind);
  const receiptBytes = readPrivateProgramBytes(
    entry.receipt_path,
    `W15 ${entry.receipt_kind} receipt`,
  );
  const signatureBytes = readPrivateProgramBytes(
    entry.signature_path,
    `W15 ${entry.receipt_kind} receipt signature`,
  );
  const receipt = JSON.parse(receiptBytes);
  if (receipt.receipt_kind !== entry.receipt_kind) {
    throw new Error("W15 predecessor receipt kind drifted");
  }
  const verified = verifyJsonPostgresProgramReceipt({
    receipt,
    signature: signatureBytes,
    trustRegistry,
  });
  locators.push(createJsonPostgresW15ReceiptLocator({
    kind: entry.receipt_kind,
    receiptBytes,
    signatureBytes,
    canonicalSha256: verified.canonical_sha256,
  }));
  return { receipt, verified };
});
const predecessorVerification =
  createJsonPostgresW15PredecessorVerification({
    verifiedReceipts,
    receiptLocators: locators,
  });
const baseline = createJsonPostgresW15BaselineManifest({
  input: baselineInput,
  exactMainSha,
  exactMainTree,
  predecessorVerification,
});
const outputDir = createPrivateProgramOutputDirectory(option("--output-dir"));
const predecessorFile = writePrivateProgramJson(
  join(outputDir, "w15-predecessor-verification.json"),
  predecessorVerification,
);
const baselineFile = writePrivateProgramJson(
  join(outputDir, "w15-baseline-manifest.json"),
  baseline,
);
const terminalLocatorFiles = Object.fromEntries(
  ["w12-terminal", "cut-012", "go-live"].map((kind) => [
    kind,
    writePrivateProgramJson(
      join(outputDir, `${kind}-private-receipt-locator.json`),
      locators.find((locator) => locator.receipt_kind === kind),
    ),
  ]),
);
process.stdout.write(`${JSON.stringify({
  outcome: "PASS",
  exact_main_sha: exactMainSha,
  exact_main_tree: exactMainTree,
  baseline_sha256: baseline.result_sha256,
  predecessor_verification_sha256:
    predecessorVerification.result_sha256,
  output_dir: outputDir,
  baseline_file: baselineFile,
  predecessor_file: predecessorFile,
  terminal_locator_files: terminalLocatorFiles,
  production_write: false,
}, null, 2)}\n`);
