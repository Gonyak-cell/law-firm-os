#!/usr/bin/env node
import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  canonicalizeJson,
  sha256Hex,
  validateRuntimeSafetyApprovalBundle,
} from "./lib/runtime-safety-approval-contract.mjs";
import { validateDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";

const APPROVAL_ID = "LAWOS-PRIVATE-STAGING-ENTRA-PILOT-CONDITIONAL-EXECUTION-APPROVAL-20260720";
const APPROVED_BASELINE_SHA = "27a1ddf95845dc1e71e2598af423e8bcf50dfbef";
const APPROVED_BASELINE_TREE = "5d2c152cebdddfe29035b78d34bf7f7072cb40ec";
const APPROVED_INSTRUCTION_SHA256 = "ab82188c0b7f4ea2ff6155da1bf40b70086e4dcf04f2b84ca8f4274e9e4b2b2a";
const APPROVED_MONTHLY_COST_LIMIT_KRW = 300_000;
const APPROVED_EFFECTIVE_AWS_BUDGET_USD = 100;
const APPROVAL_EXPIRY = "2026-08-31T14:59:59.000Z";
const ACTIONS = Object.freeze([
  { id: "infrastructure-preflight", action: "lawos-private-staging-preflight", environment: "staging", dataScope: [] },
  { id: "aws-private-staging", action: "lawos-private-staging-provision", environment: "staging", dataScope: ["synthetic-only"] },
  { id: "entra-pilot", action: "lawos-entra-pilot", environment: "entra-directory", dataScope: ["synthetic-only"] },
  { id: "synthetic-migration", action: "lawos-synthetic-staging-migration", environment: "staging", dataScope: ["synthetic-only"] },
  { id: "cut-005", action: "lawos-cut-005", environment: "staging", dataScope: ["synthetic-only"] },
  { id: "cut-006", action: "lawos-cut-006", environment: "staging", dataScope: ["synthetic-only"] },
  { id: "cut-007", action: "lawos-cut-007", environment: "staging", dataScope: ["synthetic-only"] },
]);

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${name} must be a positive integer`);
  return number;
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeExclusive(path, value, mode = 0o600) {
  writeFileSync(path, value, { flag: "wx", mode });
  chmodSync(path, mode);
}

function packetFor(entry, { sourceSha, sourceTree, instructionSha, monthlyCostLimitKrw, effectiveAwsBudgetUsd }) {
  return {
    schema_version: "law-firm-os.runtime-safety.decision-packet.v1",
    packet_id: `lawos-private-staging-${entry.id}-20260720`,
    decision_source_sha: sourceSha,
    decision_source_tree: sourceTree,
    action: entry.action,
    environment: entry.environment,
    required_role: "owner",
    allowed_decisions: ["approved", "rejected"],
    current_state: "PENDING_HUMAN_APPROVAL",
    requirements: [
      `owner instruction sha256 ${instructionSha}`,
      `monthly cost must not exceed KRW ${monthlyCostLimitKrw}`,
      `existing AWS account budget USD ${effectiveAwsBudgetUsd} remains the stricter runtime budget`,
      "existing AMIC Vault staging resources are read-only and must not be modified",
      "only synthetic tenants, users, records, and documents may be used",
      "secrets, raw PII, document bytes, credentials, and private signing material must not enter evidence",
      "execution must stop on every owner stop condition",
    ],
    options: [
      {
        decision: "approved",
        effects: ["permits only this bounded action after every prerequisite gate passes"],
        prohibited_actions: ["blanket PASS", "production mutation", "real-data migration", "secret or PII disclosure"],
      },
      {
        decision: "rejected",
        effects: ["keeps this bounded action blocked"],
        prohibited_actions: ["execution of the rejected action"],
      },
    ],
    external_actions_authorized: false,
    claims: { release: false, deployment: false, cutover: false, go_live: false },
  };
}

const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const expectedSourceSha = required(option("--source-sha"), "--source-sha");
const expectedSourceTree = required(option("--source-tree"), "--source-tree");
if (
  sourceSha !== APPROVED_BASELINE_SHA
  || sourceTree !== APPROVED_BASELINE_TREE
  || expectedSourceSha !== APPROVED_BASELINE_SHA
  || expectedSourceTree !== APPROVED_BASELINE_TREE
) {
  throw new Error("current source SHA/tree does not match the owner-approved baseline");
}
const sourceStatus = git("status", "--porcelain=v1", "--untracked-files=all")
  .split("\n")
  .filter(Boolean);
const allowedToolStatus = "?? scripts/generate-private-staging-execution-authority.mjs";
if (sourceStatus.some((line) => line !== allowedToolStatus)) {
  throw new Error("approval authority must be generated from the exact baseline plus only its untracked authority generator");
}
const toolchainSha = sha256Hex(readFileSync(new URL(import.meta.url)));

const instructionPath = resolve(required(option("--instruction-file"), "--instruction-file"));
const privateKeyPath = resolve(required(process.env.LAWOS_OWNER_PRIVATE_KEY_PATH, "LAWOS_OWNER_PRIVATE_KEY_PATH"));
const priorRegistryPath = resolve(required(process.env.LAWOS_OWNER_REGISTRY_PATH, "LAWOS_OWNER_REGISTRY_PATH"));
const registryOutputPath = resolve(required(option("--registry-output"), "--registry-output"));
const outputDir = resolve(required(option("--output-dir"), "--output-dir"));
const monthlyCostLimitKrw = positiveInteger(option("--monthly-cost-limit-krw"), "--monthly-cost-limit-krw");
const effectiveAwsBudgetUsd = positiveInteger(option("--effective-aws-budget-usd"), "--effective-aws-budget-usd");
if (monthlyCostLimitKrw !== APPROVED_MONTHLY_COST_LIMIT_KRW || effectiveAwsBudgetUsd !== APPROVED_EFFECTIVE_AWS_BUDGET_USD) {
  throw new Error("cost authority does not match the approved owner cap and stricter AWS budget");
}
const signedAt = new Date().toISOString();
const expiresAt = required(option("--expires-at", APPROVAL_EXPIRY), "--expires-at");
if (expiresAt !== APPROVAL_EXPIRY) throw new Error("approval receipt expiry must remain fixed to the registered authority window");
const instructionSha = sha256Hex(readFileSync(instructionPath));
if (instructionSha !== APPROVED_INSTRUCTION_SHA256) throw new Error("owner instruction bytes do not match the approved attachment");

mkdirSync(outputDir, { recursive: true, mode: 0o700 });
chmodSync(outputDir, 0o700);

const privateKey = createPrivateKey(readFileSync(privateKeyPath));
const publicKey = createPublicKey(privateKey);
const priorRegistry = JSON.parse(readFileSync(priorRegistryPath, "utf8"));
const priorKey = priorRegistry.keys[0];
if (publicKey.export({ type: "spki", format: "pem" }) !== priorKey.public_key_spki_pem) {
  throw new Error("owner private key does not match the registered public key");
}

const registry = {
  schema_version: priorRegistry.schema_version,
  generated_at: signedAt,
  keys: [{
    ...priorKey,
    actions: [...new Set([...priorKey.actions, ...ACTIONS.map((entry) => entry.action)])].sort(),
    environments: [...new Set([...priorKey.environments, ...ACTIONS.map((entry) => entry.environment)])].sort(),
  }],
};
const registryBytes = `${JSON.stringify(registry, null, 2)}\n`;
writeExclusive(registryOutputPath, registryBytes);
const registrySha = sha256Hex(registryBytes);

const ownerInstruction = {
  schema_version: "law-firm-os.private-staging-entra-pilot.owner-instruction.v1",
  instruction_id: APPROVAL_ID,
  instruction_sha256: instructionSha,
  key_id: priorKey.key_id,
  signed_at: signedAt,
  expires_at: expiresAt,
  baseline_source_sha: sourceSha,
  baseline_source_tree: sourceTree,
  toolchain_sha256: toolchainSha,
  required_branch: "codex/lawos-private-staging-entra-pilot-20260720",
  monthly_cost_limit_krw: monthlyCostLimitKrw,
  effective_aws_budget_usd: effectiveAwsBudgetUsd,
  aws_account_id: "770880870480",
  aws_region: "ap-northeast-2",
  existing_amic_vault_staging_access: "read-only-inventory-only",
  staging_data_scope: "synthetic-only",
  entra_policy_rollout: "report-only-minimum-seven-days-then-pilot-only",
  production_actions_authorized: false,
  release_actions_authorized: false,
  go_live_authorized: false,
  blanket_pass_prohibited: true,
};
const ownerInstructionPath = join(outputDir, "owner-instruction.json");
const ownerInstructionSignaturePath = `${ownerInstructionPath}.sig`;
writeExclusive(ownerInstructionPath, `${JSON.stringify(ownerInstruction, null, 2)}\n`);
const ownerInstructionSignature = sign(null, Buffer.from(canonicalizeJson(ownerInstruction)), privateKey);
writeExclusive(ownerInstructionSignaturePath, ownerInstructionSignature);
if (!verify(null, Buffer.from(canonicalizeJson(ownerInstruction)), publicKey, ownerInstructionSignature)) {
  throw new Error("owner instruction signature verification failed");
}

const approvals = [];
for (const entry of ACTIONS) {
  const packet = packetFor(entry, { sourceSha, sourceTree, instructionSha, monthlyCostLimitKrw, effectiveAwsBudgetUsd });
  const validatedPacket = validateDecisionPacket(packet, {
    sourceSha,
    sourceTree,
    action: entry.action,
    environment: entry.environment,
    role: "owner",
  });
  const packetPath = join(outputDir, `${entry.id}.decision-packet.json`);
  writeExclusive(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: `lawos-private-staging-${entry.id}-20260720`,
    key_id: priorKey.key_id,
    role: "owner",
    decision: "approved",
    packet_sha256: validatedPacket.packet_sha256,
    source_sha: sourceSha,
    source_tree: sourceTree,
    action: entry.action,
    environment: entry.environment,
    signed_at: signedAt,
    expires_at: expiresAt,
    data_scope: entry.dataScope,
    contact_scope: [],
  };
  const receiptPath = join(outputDir, `${entry.id}.approval.json`);
  const signaturePath = `${receiptPath}.sig`;
  writeExclusive(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  const signature = sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey);
  writeExclusive(signaturePath, signature);
  const validation = validateRuntimeSafetyApprovalBundle({
    registryPath: registryOutputPath,
    expectedRegistrySha256: registrySha,
    receiptPath,
    signaturePath,
    expectedRole: "owner",
    expectedAction: entry.action,
    expectedEnvironment: entry.environment,
    expectedPacketSha256: validatedPacket.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope: ["synthetic-only"],
    allowedContactScope: [],
    now: Date.parse(signedAt),
  });
  approvals.push({
    id: entry.id,
    action: entry.action,
    environment: entry.environment,
    decision: validation.decision,
    packet_sha256: validatedPacket.packet_sha256,
    receipt_sha256: validation.receipt_sha256,
    signature_sha256: sha256Hex(signature),
    validated: validation.valid,
    execution_pass_claim: false,
  });
}

const manifest = {
  schema_version: "law-firm-os.private-staging-entra-pilot.authority-manifest.v1",
  generated_at: signedAt,
  instruction_id: APPROVAL_ID,
  instruction_sha256: instructionSha,
  baseline_source_sha: sourceSha,
  baseline_source_tree: sourceTree,
  toolchain_sha256: toolchainSha,
  key_id: priorKey.key_id,
  monthly_cost_limit_krw: monthlyCostLimitKrw,
  effective_aws_budget_usd: effectiveAwsBudgetUsd,
  private_key: {
    stored_outside_repository: true,
    basename: basename(privateKeyPath),
    copied: false,
    committed: false,
    exposed_in_receipts: false,
  },
  registry: { path: registryOutputPath, sha256: registrySha },
  owner_instruction: {
    path: ownerInstructionPath,
    canonical_sha256: sha256Hex(canonicalizeJson(ownerInstruction)),
    signature_sha256: sha256Hex(ownerInstructionSignature),
    signature_valid: true,
  },
  approvals,
  independent_approval_receipt_count: approvals.length,
  execution_pass_receipt_count: 0,
  blanket_pass: false,
  protected_root_mutated: false,
  external_action_executed_by_registration: false,
};
writeExclusive(join(outputDir, "authority-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  instruction_id: APPROVAL_ID,
  source_sha: sourceSha,
  source_tree: sourceTree,
  instruction_sha256: instructionSha,
  registry_sha256: registrySha,
  independent_approval_receipt_count: approvals.length,
  execution_pass_receipt_count: 0,
  all_receipts_valid: approvals.every((entry) => entry.validated),
  monthly_cost_limit_krw: monthlyCostLimitKrw,
  effective_aws_budget_usd: effectiveAwsBudgetUsd,
  existing_private_key_reused_without_copy: true,
  external_action_executed_by_registration: false,
}, null, 2)}\n`);
