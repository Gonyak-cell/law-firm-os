#!/usr/bin/env node
import {
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  validateJsonPostgresExecutionPacket,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_DATA_SCOPE,
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PACKET_VERSION,
  validateJsonPostgresW15InventoryBootstrapPacket,
} from "../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";
import {
  JSON_POSTGRES_SOURCE_READ_PACKET_VERSION,
  validateJsonPostgresSourceReadPacket,
} from "../packages/persistence/src/postgres/source-read-contract.js";
import {
  AMIC_PRIVATE_BOOTSTRAP_EXECUTION_PACKET_VERSION,
  createAmicPrivateBootstrapApprovalDataScope,
  validateAmicPrivateBootstrapExecutionPacket,
} from "./lib/amic-private-bootstrap-execution.mjs";
import {
  AMIC_BOOTSTRAP_ENRICHMENT_VERSION,
  enrichmentApprovalDataScope,
  validateAmicPrivateBootstrapEnrichmentPlan,
} from "./lib/amic-private-bootstrap-enrichment.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

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
  throw new Error("execution approval sealing requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packet = readPrivateProgramJson(
  option("--packet"),
  "execution packet",
);
const sourceRead =
  packet.schema_version === JSON_POSTGRES_SOURCE_READ_PACKET_VERSION;
const w15Bootstrap =
  packet.schema_version
    === JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PACKET_VERSION;
const amicPrivateBootstrap =
  packet.schema_version === AMIC_PRIVATE_BOOTSTRAP_EXECUTION_PACKET_VERSION;
const amicEnrichment = packet.schema_version === AMIC_BOOTSTRAP_ENRICHMENT_VERSION;
const validated = amicEnrichment
  ? validateAmicPrivateBootstrapEnrichmentPlan(packet, { sourceSha, sourceTree })
  : sourceRead
  ? validateJsonPostgresSourceReadPacket(packet, {
      sourceSha,
      sourceTree,
    })
  : w15Bootstrap
    ? validateJsonPostgresW15InventoryBootstrapPacket(packet, {
        sourceSha,
        sourceTree,
      })
    : amicPrivateBootstrap
      ? validateAmicPrivateBootstrapExecutionPacket(packet, {
          sourceSha,
          sourceTree,
        })
      : validateJsonPostgresExecutionPacket(packet, {
          sourceSha,
          sourceTree,
        });
const signedAt = new Date(option("--signed-at")).toISOString();
const expiresAt = new Date(option("--expires-at")).toISOString();
if (Date.parse(expiresAt) <= Date.parse(signedAt)) {
  throw new TypeError("execution approval expiry is invalid");
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
const publicKeyPem = createPublicKey(privateKey).export({
  type: "spki",
  format: "pem",
});
const selectedKey = baseRegistry.keys?.find((key) => key.key_id === keyId);
if (!selectedKey
  || selectedKey.algorithm !== "Ed25519"
  || selectedKey.public_key_spki_pem !== publicKeyPem
  || selectedKey.revoked_at != null
  || Date.parse(signedAt) < Date.parse(selectedKey.valid_from)
  || Date.parse(expiresAt) > Date.parse(selectedKey.valid_until)) {
  throw new Error("owner private key does not match an active registry signer");
}
const registry = {
  ...baseRegistry,
  generated_at: signedAt,
  keys: baseRegistry.keys.map((key) => key.key_id === keyId
    ? {
        ...key,
        actions: [...new Set([...key.actions, packet.action])].sort(),
        environments:
          [...new Set([...key.environments, packet.environment])].sort(),
      }
    : key),
};
const dataScope = amicEnrichment
  ? enrichmentApprovalDataScope(packet)
  : sourceRead
  ? packet.data_scope
  : w15Bootstrap
    ? [
        JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_DATA_SCOPE,
        `baseline:${packet.bindings.baseline_sha256}`,
        `predecessors:${packet.bindings.predecessor_verification_sha256}`,
      ]
    : amicPrivateBootstrap
      ? createAmicPrivateBootstrapApprovalDataScope(packet)
      : [
          "approved-real-manifest",
          `authority-manifest:${packet.bindings.authority_manifest_sha256}`,
          `inventory:${packet.bindings.inventory_content_sha256}`,
          `inventory-delta-policy:${packet.bindings.inventory_delta_policy_sha256}`,
        ];
const contactScope = amicPrivateBootstrap || amicEnrichment ? [] : packet.contact_scope;
const approvalPhase = amicEnrichment ? "amic-private-bootstrap-enrichment" : sourceRead
  ? "source-read"
  : amicPrivateBootstrap
    ? "amic-private-bootstrap"
    : packet.phase;
const receipt = {
  schema_version: "law-firm-os.runtime-safety.approval.v1",
  approval_id: option("--approval-id"),
  key_id: keyId,
  role: "owner",
  decision: "approved",
  packet_sha256: validated.packet_sha256,
  source_sha: sourceSha,
  source_tree: sourceTree,
  action: packet.action,
  environment: packet.environment,
  signed_at: signedAt,
  expires_at: expiresAt,
  data_scope: dataScope,
  contact_scope: contactScope,
};
const signature = sign(
  null,
  Buffer.from(canonicalizeJson(receipt)),
  privateKey,
);
const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const registryOutput = writePrivateProgramJson(
  join(outputDir, "execution-approval-trust-registry.json"),
  registry,
);
const receiptOutput = writePrivateProgramJson(
  join(outputDir, "execution-approval-receipt.json"),
  receipt,
);
const signatureOutput = writePrivateProgramBytes(
  join(outputDir, "execution-approval-receipt.json.sig"),
  signature,
);
const verified = validateRuntimeSafetyApprovalPayload({
  registryBytes: Buffer.from(`${JSON.stringify(registry, null, 2)}\n`),
  receiptBytes: Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`),
  signatureBytes: signature,
  expectedRegistrySha256: registryOutput.sha256,
  expectedRole: "owner",
  expectedAction: packet.action,
  expectedEnvironment: packet.environment,
  expectedPacketSha256: validated.packet_sha256,
  expectedSourceSha: sourceSha,
  expectedSourceTree: sourceTree,
  allowedDataScope: dataScope,
  allowedContactScope: contactScope,
  now: Date.parse(signedAt),
});
const summary = writePrivateProgramJson(
  join(outputDir, "execution-approval-signing-summary.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-execution-approval-signing-summary.v1",
    approval_id: receipt.approval_id,
    source_sha: sourceSha,
    source_tree: sourceTree,
    phase: approvalPhase,
    packet_sha256: validated.packet_sha256,
    approval_receipt_sha256: verified.receipt_sha256,
    approval_receipt_file_sha256: receiptOutput.sha256,
    approval_signature_sha256: signatureOutput.sha256,
    trust_registry_sha256: registryOutput.sha256,
    approval_signature_valid: true,
    private_key_recorded: false,
    aws_mutated: false,
    postgres_mutated: false,
    production_contacted: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  approval_id: receipt.approval_id,
  phase: approvalPhase,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: validated.packet_sha256,
  approval_receipt_path: receiptOutput.path,
  approval_signature_path: signatureOutput.path,
  trust_registry_path: registryOutput.path,
  trust_registry_sha256: registryOutput.sha256,
  summary_path: summary.path,
  approval_signature_valid: true,
  private_key_recorded: false,
}, null, 2)}\n`);
