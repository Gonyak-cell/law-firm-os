#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS,
  privateStagingReceiptSignerScope,
  resolvePrivateStagingReceiptSigner,
  validatePrivateStagingReceiptSet,
  verifyPrivateStagingExecutionReceipt,
} from "./lib/private-staging-execution-receipt.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function privatePath(candidate, name, kind) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must exist and cannot be a symlink`);
  const path = realpathSync(input);
  const stats = statSync(path);
  if ((kind === "directory" ? !stats.isDirectory() : !stats.isFile()) || (stats.mode & 0o077) !== 0) throw new Error(`${name} must be private and have the expected type`);
  return path;
}

const receiptDir = privatePath(option("--receipt-dir"), "receipt directory", "directory");
const registryPath = privatePath(option("--registry"), "owner trust registry", "file");
const registryBytes = readFileSync(registryPath);
if (sha256(registryBytes) !== option("--registry-sha256")) throw new Error("owner trust registry digest mismatch");
const registry = JSON.parse(registryBytes);
const expected = {
  sourceSha: option("--source-sha"),
  sourceTree: option("--source-tree"),
  artifactSha256: option("--artifact-sha256"),
  ownerInstructionSha256: option("--owner-instruction-sha256"),
  approvalId: option("--approval-id"),
  requiredKinds: PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS,
};
const files = readdirSync(receiptDir).filter((name) => name.endsWith(".json")).sort();
const receipts = [];
for (const name of files) {
  const receiptPath = privatePath(resolve(receiptDir, name), `receipt ${name}`, "file");
  const signaturePath = privatePath(`${receiptPath}.sig`, `signature ${name}`, "file");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  const signerScope = privateStagingReceiptSignerScope(receipt.receipt_kind);
  const signer = resolvePrivateStagingReceiptSigner(registry, receipt.key_id, Date.now(), {
    expectedRole: signerScope.role,
    expectedAction: signerScope.action,
    expectedEnvironment: signerScope.environment,
    receiptEnvironment: receipt.environment,
    receiptStartedAt: Date.parse(receipt.started_at),
    receiptFinishedAt: Date.parse(receipt.finished_at),
  });
  verifyPrivateStagingExecutionReceipt({ receipt, signature: readFileSync(signaturePath), publicKey: signer.public_key_spki_pem, expected });
  receipts.push(receipt);
}
const result = validatePrivateStagingReceiptSet(receipts, expected);
if (result.pass_count !== result.receipt_count) throw new Error("one or more required receipts is not PASS");
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  ...result,
  required_receipt_count: PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS.length,
  signature_valid_count: receipts.length,
  source_sha: expected.sourceSha,
  source_tree: expected.sourceTree,
  artifact_sha256: expected.artifactSha256,
  secret_material_returned: false,
}, null, 2)}\n`);
