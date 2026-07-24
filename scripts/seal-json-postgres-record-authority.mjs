#!/usr/bin/env node
import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  validateJsonPostgresRecordAuthority,
} from "../packages/persistence/src/postgres/source-adjudication.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const ACTION = "lawos-json-postgres-record-authority";
const ENVIRONMENT = "lawos-source-local";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error(
    "record authority sealing requires a clean exact-head worktree",
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const inventory = readPrivateProgramJson(
  option("--inventory"),
  "safe source inventory",
);
const recommendations = readPrivateProgramJson(
  option("--recommendations"),
  "source adjudication recommendations",
);
const residualComparison = readPrivateProgramJson(
  option("--residual-comparison"),
  "residual structural comparison",
);
const authority = readPrivateProgramJson(
  option("--record-authority"),
  "record authority manifest",
);
validateJsonPostgresRecordAuthority(authority, {
  inventory,
  recommendations,
  residualComparison,
});
if (authority.source_sha !== sourceSha
  || authority.source_tree !== sourceTree) {
  throw new Error("record authority exact-head binding drifted");
}

const signedAt = new Date(option("--signed-at")).toISOString();
const expiresAt = new Date(option("--expires-at")).toISOString();
if (Date.parse(expiresAt) <= Date.parse(signedAt)) {
  throw new TypeError("record authority approval expiry is invalid");
}
const keyId = option("--key-id");
const baseRegistryBytes = readPrivateProgramBytes(
  option("--base-registry"),
  "base owner trust registry",
);
if (sha256ProgramBytes(baseRegistryBytes)
    !== option("--base-registry-sha256")) {
  throw new Error("base owner trust registry digest mismatch");
}
const baseRegistry = JSON.parse(baseRegistryBytes);
const privateKey = createPrivateKey(readPrivateProgramBytes(
  option("--private-key"),
  "owner private key",
));
const publicKey = createPublicKey(privateKey);
const publicKeyPem = publicKey.export({
  type: "spki",
  format: "pem",
});
const selectedKey = baseRegistry.keys?.find((key) =>
  key.key_id === keyId);
if (!selectedKey
  || selectedKey.algorithm !== "Ed25519"
  || selectedKey.public_key_spki_pem !== publicKeyPem
  || selectedKey.revoked_at != null
  || Date.parse(signedAt) < Date.parse(selectedKey.valid_from)
  || Date.parse(expiresAt) > Date.parse(selectedKey.valid_until)) {
  throw new Error(
    "owner private key does not match an active registry signer",
  );
}
const registry = {
  ...baseRegistry,
  generated_at: signedAt,
  keys: baseRegistry.keys.map((key) => key.key_id === keyId
    ? {
        ...key,
        actions: [...new Set([...key.actions, ACTION])].sort(),
        environments:
          [...new Set([...key.environments, ENVIRONMENT])].sort(),
      }
    : key),
};
const dataScope = [
  `record-authority:${authority.authority_sha256}`,
  `inventory:${authority.inventory_content_sha256}`,
  `recommendation:${authority.recommendation_sha256}`,
  `residual-comparison:${authority.policy.residual_comparison_sha256}`,
];
const receipt = {
  schema_version: "law-firm-os.runtime-safety.approval.v1",
  approval_id: option("--approval-id"),
  key_id: keyId,
  role: "owner",
  decision: "approved",
  packet_sha256: authority.authority_sha256,
  source_sha: sourceSha,
  source_tree: sourceTree,
  action: ACTION,
  environment: ENVIRONMENT,
  signed_at: signedAt,
  expires_at: expiresAt,
  data_scope: dataScope,
  contact_scope: [],
};
const authorityCanonical = Buffer.from(canonicalizeJson(authority));
const receiptCanonical = Buffer.from(canonicalizeJson(receipt));
const authoritySignature = sign(null, authorityCanonical, privateKey);
const receiptSignature = sign(null, receiptCanonical, privateKey);
if (!verify(null, authorityCanonical, publicKey, authoritySignature)) {
  throw new Error("record authority detached signature is invalid");
}

const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const registryOutput = writePrivateProgramJson(
  join(outputDir, "record-authority-trust-registry.json"),
  registry,
);
const authorityOutput = writePrivateProgramJson(
  join(outputDir, "record-authority-manifest.json"),
  authority,
);
const authoritySignatureOutput = writePrivateProgramBytes(
  join(outputDir, "record-authority-manifest.json.sig"),
  authoritySignature,
);
const receiptOutput = writePrivateProgramJson(
  join(outputDir, "record-authority-owner-decision-receipt.json"),
  receipt,
);
const receiptSignatureOutput = writePrivateProgramBytes(
  join(
    outputDir,
    "record-authority-owner-decision-receipt.json.sig",
  ),
  receiptSignature,
);
const receiptVerification = validateRuntimeSafetyApprovalPayload({
  registryBytes: Buffer.from(
    `${JSON.stringify(registry, null, 2)}\n`,
  ),
  receiptBytes: Buffer.from(
    `${JSON.stringify(receipt, null, 2)}\n`,
  ),
  signatureBytes: receiptSignature,
  expectedRegistrySha256: registryOutput.sha256,
  expectedRole: "owner",
  expectedAction: ACTION,
  expectedEnvironment: ENVIRONMENT,
  expectedPacketSha256: authority.authority_sha256,
  expectedSourceSha: sourceSha,
  expectedSourceTree: sourceTree,
  allowedDataScope: dataScope,
  allowedContactScope: [],
  now: Date.parse(signedAt),
});
const summary = writePrivateProgramJson(
  join(outputDir, "record-authority-signing-summary.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-record-authority-signing-summary.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    authority_sha256: authority.authority_sha256,
    authority_canonical_sha256:
      sha256ProgramBytes(authorityCanonical),
    authority_file_sha256: authorityOutput.sha256,
    authority_signature_sha256: authoritySignatureOutput.sha256,
    approval_id: receipt.approval_id,
    approval_receipt_sha256: receiptVerification.receipt_sha256,
    approval_receipt_file_sha256: receiptOutput.sha256,
    approval_signature_sha256: receiptSignatureOutput.sha256,
    trust_registry_sha256: registryOutput.sha256,
    authority_signature_valid: true,
    approval_signature_valid: true,
    source_mutated: false,
    postgres_mutated: false,
    aws_mutated: false,
    production_contacted: false,
    private_key_recorded: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  authority_sha256: authority.authority_sha256,
  authority_path: authorityOutput.path,
  authority_signature_path: authoritySignatureOutput.path,
  approval_receipt_path: receiptOutput.path,
  approval_signature_path: receiptSignatureOutput.path,
  trust_registry_path: registryOutput.path,
  trust_registry_sha256: registryOutput.sha256,
  summary_path: summary.path,
  authority_signature_valid: true,
  approval_signature_valid: true,
  private_key_recorded: false,
}, null, 2)}\n`);
