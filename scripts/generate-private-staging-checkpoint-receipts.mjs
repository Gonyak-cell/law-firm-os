#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { buildPrivateStagingExecutionReceipt } from "./lib/private-staging-aws-execution.mjs";
import {
  PRIVATE_STAGING_CLOSEOUT_CHECKPOINT,
  PRIVATE_STAGING_PRIOR_CHECKPOINT_SOURCES,
  privateStagingScreenshotManifestSha256,
  sha256PrivateStagingCloseout,
  validatePrivateStagingCloseoutArtifactManifest,
  validatePrivateStagingCloseoutRebind,
  validatePrivateStagingCloseoutSourceDelta,
  validatePrivateStagingCut007CloseoutEvidence,
  validatePrivateStagingPriorCheckpointReceipt,
} from "./lib/private-staging-checkpoint-closeout.mjs";
import {
  PRIVATE_STAGING_EXACT_HEAD_ACTION,
  validatePrivateStagingExactHeadPacket,
} from "./lib/private-staging-exact-head-authority.mjs";
import {
  privateStagingReceiptSignerScope,
  resolvePrivateStagingReceiptSigner,
  verifyPrivateStagingExecutionReceipt,
} from "./lib/private-staging-execution-receipt.mjs";
import { validateRuntimeSafetyApprovalBundle } from "./lib/runtime-safety-approval-contract.mjs";

const PRIOR_OPTIONS = Object.freeze({
  "infrastructure-deployment": "--infrastructure-receipt",
  "database-bootstrap": "--database-bootstrap-receipt",
  "cost-verification": "--cost-receipt",
  "protected-resource-non-interference": "--protected-resource-receipt",
  "cut-005": "--cut005-receipt",
  "cut-006": "--cut006-receipt",
});

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function privatePath(candidate, name, kind = "file") {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must exist and cannot be a symlink`);
  const path = realpathSync(input);
  const stats = statSync(path);
  if ((kind === "directory" ? !stats.isDirectory() : !stats.isFile()) || (stats.mode & 0o077) !== 0) {
    throw new Error(`${name} must be private and have the expected type`);
  }
  return path;
}

function outputDirectory(candidate) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("checkpoint receipts must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("checkpoint receipt output cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

const sourceSha = git("rev-parse", "HEAD^{commit}");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("checkpoint closeout requires a clean exact-head worktree");
execFileSync("git", ["merge-base", "--is-ancestor", PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha, "HEAD"], { cwd: process.cwd(), stdio: "ignore" });
const changedPaths = git("diff", "--name-only", `${PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha}..HEAD`).split("\n").filter(Boolean);
const sourceDelta = validatePrivateStagingCloseoutSourceDelta({
  baseSourceSha: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha,
  baseSourceTree: git("rev-parse", `${PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha}^{tree}`),
  currentSourceSha: sourceSha,
  changedPaths,
});

const packetPath = privatePath(option("--packet"), "exact-head packet");
const rawPacket = JSON.parse(readFileSync(packetPath, "utf8"));
const packetValidation = validatePrivateStagingExactHeadPacket(rawPacket, {
  sourceSha,
  sourceTree,
  baseMainSha: git("rev-parse", "origin/main^{commit}"),
  baseMainTree: git("rev-parse", "origin/main^{tree}"),
});
const packet = Object.freeze({ ...rawPacket, packet_sha256: packetValidation.packet_sha256 });
const artifactManifestPath = privatePath(option("--artifact-manifest"), "artifact manifest");
const artifactManifestBytes = readFileSync(artifactManifestPath);
const artifactManifest = JSON.parse(artifactManifestBytes);
validatePrivateStagingCloseoutArtifactManifest(artifactManifest, packet);

const registryPath = privatePath(option("--registry"), "owner trust registry");
const registryBytes = readFileSync(registryPath);
const registrySha256 = option("--registry-sha256");
if (sha256PrivateStagingCloseout(registryBytes) !== registrySha256) throw new Error("owner trust registry digest mismatch");
const registry = JSON.parse(registryBytes);
const approvalReceiptPath = privatePath(option("--approval-receipt"), "exact-head approval receipt");
const approvalSignaturePath = privatePath(`${approvalReceiptPath}.sig`, "exact-head approval signature");
const approvalReceipt = JSON.parse(readFileSync(approvalReceiptPath, "utf8"));
const approval = validateRuntimeSafetyApprovalBundle({
  registryPath,
  expectedRegistrySha256: registrySha256,
  receiptPath: approvalReceiptPath,
  signaturePath: approvalSignaturePath,
  expectedRole: "owner",
  expectedAction: PRIVATE_STAGING_EXACT_HEAD_ACTION,
  expectedEnvironment: "staging",
  expectedPacketSha256: packet.packet_sha256,
  expectedSourceSha: packet.source_sha,
  expectedSourceTree: packet.source_tree,
  allowedDataScope: ["synthetic-only"],
  allowedContactScope: ["synthetic-mailbox-only"],
});
if (approval.decision !== "approved") throw new Error("exact-head closeout approval is not approved");

const rebindSummaryPath = privatePath(option("--rebind-summary"), "closeout rebind summary");
const rebindSummaryBytes = readFileSync(rebindSummaryPath);
const rebindSummary = JSON.parse(rebindSummaryBytes);
validatePrivateStagingCloseoutRebind(rebindSummary, packet);

const priorReceipts = new Map();
for (const [kind, optionName] of Object.entries(PRIOR_OPTIONS)) {
  const receiptPath = privatePath(option(optionName), `${kind} prior checkpoint receipt`);
  const signaturePath = privatePath(`${receiptPath}.sig`, `${kind} prior checkpoint signature`);
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
  verifyPrivateStagingExecutionReceipt({
    receipt,
    signature: readFileSync(signaturePath),
    publicKey: signer.public_key_spki_pem,
    expected: { executionState: "PASS" },
  });
  validatePrivateStagingPriorCheckpointReceipt(receipt, kind);
  const expectedSource = PRIVATE_STAGING_PRIOR_CHECKPOINT_SOURCES[kind].source_sha;
  execFileSync("git", ["merge-base", "--is-ancestor", expectedSource, PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha], { cwd: process.cwd(), stdio: "ignore" });
  priorReceipts.set(kind, Object.freeze({
    receipt,
    receipt_sha256: sha256PrivateStagingCloseout(readFileSync(receiptPath)),
    signature_sha256: sha256PrivateStagingCloseout(readFileSync(signaturePath)),
  }));
}

const resultPath = privatePath(option("--cut007-result"), "CUT-007 browser result");
const diagnosticsPath = privatePath(option("--browser-diagnostics"), "CUT-007 browser diagnostics");
const currentReadbackPath = privatePath(option("--current-readback"), "CUT-007 current PostgreSQL readback");
const screenshotDirectory = privatePath(option("--screenshot-dir"), "CUT-007 screenshot directory", "directory");
const screenshotManifestSha256 = privateStagingScreenshotManifestSha256(screenshotDirectory);
const cut007 = validatePrivateStagingCut007CloseoutEvidence({
  resultBytes: readFileSync(resultPath),
  browserDiagnosticsBytes: readFileSync(diagnosticsPath),
  currentReadbackBytes: readFileSync(currentReadbackPath),
  screenshotManifestSha256,
});

const outputDir = outputDirectory(option("--output-dir"));
const startedAt = new Date().toISOString();
const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
const commonDigests = Object.freeze({
  source_delta_sha256: sourceDelta.changed_paths_sha256,
  artifact_manifest_sha256: sha256PrivateStagingCloseout(artifactManifestBytes),
  rebind_summary_sha256: sha256PrivateStagingCloseout(rebindSummaryBytes),
});
const commonClaims = Object.freeze({
  checkpoint_signature_verified: true,
  source_ancestry_verified: true,
  receipt_only_delta_verified: true,
  current_exact_binding_verified: true,
});
const specs = [...priorReceipts.entries()].map(([kind, prior]) => ({
  kind,
  safeCounts: {
    ...prior.receipt.safe_counts,
    checkpoint_reused_count: 1,
    current_exact_binding_count: 1,
  },
  digests: {
    ...commonDigests,
    checkpoint_receipt_sha256: prior.receipt_sha256,
    checkpoint_signature_sha256: prior.signature_sha256,
  },
  claims: {
    ...prior.receipt.claims,
    ...commonClaims,
  },
}));
specs.push({
  kind: "cut-007",
  safeCounts: cut007.safe_counts,
  digests: {
    ...commonDigests,
    result_sha256: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.result_sha256,
    browser_diagnostics_sha256: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.browser_diagnostics_sha256,
    current_postgres_readback_sha256: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.current_postgres_readback_sha256,
    screenshot_manifest_sha256: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.screenshot_manifest_sha256,
    execution_fingerprint_sha256: cut007.result.execution_fingerprint,
    browser_evidence_fingerprint_sha256: cut007.result.browser_smoke.evidence_fingerprint,
    current_readback_fingerprint_sha256: cut007.result.readback_fingerprint,
  },
  claims: {
    ...commonClaims,
    cut_007_executed: true,
    prior_control_evidence_reused: true,
    current_postgres_readback_passed: true,
    browser_smoke_passed: true,
    synthetic_mailbox_delivery_verified: true,
  },
});

const receiptPaths = [];
for (const spec of specs) {
  const receipt = buildPrivateStagingExecutionReceipt({
    kind: spec.kind,
    keyId: approvalReceipt.key_id,
    approvalId: approval.approval_id,
    packet,
    startedAt,
    finishedAt,
    command: "node scripts/generate-private-staging-checkpoint-receipts.mjs --private-inputs redacted",
    profile: "checkpoint-derived-readonly",
    safeCounts: spec.safeCounts,
    digests: spec.digests,
    claims: spec.claims,
  });
  const path = resolve(outputDir, `${receipt.receipt_id}.json`);
  writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  receiptPaths.push(path);
}

process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  artifact_sha256: packet.artifact_sha256,
  packet_sha256: packet.packet_sha256,
  derived_receipt_count: receiptPaths.length,
  source_delta_path_count: sourceDelta.changed_path_count,
  runtime_dependency_change_count: 0,
  cut005_rerun_count: 0,
  cut006_rerun_count: 0,
  cut007_control_rerun_count: 0,
  cut007_browser_rerun_count: 0,
  synthetic_mutation_count: 0,
  output_directory: outputDir,
  receipt_ids: receiptPaths.map((path) => basename(path, ".json")),
}, null, 2)}\n`);
