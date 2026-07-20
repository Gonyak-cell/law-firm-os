#!/usr/bin/env node
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { canonicalizeJson } from "./lib/runtime-safety-approval-contract.mjs";
import {
  resolvePrivateStagingReceiptSigner,
  validatePrivateStagingExecutionReceipt,
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

function privateRegularFile(candidate, name) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) throw new Error(`${name} must be a private 0600 regular file`);
  return path;
}

function outsideWorktreeDirectory(candidate) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("sealed receipts must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("receipt output directory cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

const receiptPath = privateRegularFile(option("--receipt"), "unsigned execution receipt");
const registryPath = privateRegularFile(option("--registry"), "owner trust registry");
const privateKeyPath = privateRegularFile(option("--private-key"), "owner private key");
const registryBytes = readFileSync(registryPath);
if (sha256(registryBytes) !== option("--registry-sha256")) throw new Error("owner trust registry digest mismatch");
const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
validatePrivateStagingExecutionReceipt(receipt, {
  sourceSha: option("--source-sha"),
  sourceTree: option("--source-tree"),
  artifactSha256: option("--artifact-sha256"),
  ownerInstructionSha256: option("--owner-instruction-sha256"),
  approvalId: option("--approval-id"),
});
const signer = resolvePrivateStagingReceiptSigner(JSON.parse(registryBytes), receipt.key_id);
const privateKey = createPrivateKey(readFileSync(privateKeyPath));
const publicKey = createPublicKey(privateKey);
if (publicKey.export({ type: "spki", format: "pem" }) !== signer.public_key_spki_pem) throw new Error("owner private key does not match the registered signer");
const canonicalBytes = Buffer.from(canonicalizeJson(receipt));
const signature = sign(null, canonicalBytes, privateKey);
if (!verify(null, canonicalBytes, signer.public_key_spki_pem, signature)) throw new Error("execution receipt self-verification failed");

const outputDir = outsideWorktreeDirectory(option("--output-dir"));
const sealedReceiptPath = resolve(outputDir, basename(receiptPath));
const signaturePath = `${sealedReceiptPath}.sig`;
const checksumPath = `${sealedReceiptPath}.sha256`;
for (const path of [sealedReceiptPath, signaturePath, checksumPath]) if (existsSync(path)) throw new Error(`sealed receipt output already exists: ${basename(path)}`);
copyFileSync(receiptPath, sealedReceiptPath, 0);
chmodSync(sealedReceiptPath, 0o600);
writeFileSync(signaturePath, signature, { flag: "wx", mode: 0o600 });
writeFileSync(checksumPath, `${sha256(readFileSync(sealedReceiptPath))}  ${basename(sealedReceiptPath)}\n`, { flag: "wx", mode: 0o600 });
chmodSync(signaturePath, 0o600);
chmodSync(checksumPath, 0o600);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  receipt_id: receipt.receipt_id,
  receipt_kind: receipt.receipt_kind,
  execution_state: receipt.execution_state,
  receipt_path: sealedReceiptPath,
  signature_path: signaturePath,
  signature_valid: true,
  secret_material_recorded: false,
}, null, 2)}\n`);
