#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  openProtectedEvidenceRoot, sha256, validateM365ReleaseReceipt,
} from "./lib/outlook-release-gates.mjs";
import { createCommandRunner, exactGitIdentity, trackedGitPaths } from "./lib/outlook-release/cli-runtime.mjs";
import { parseOutlookManifest } from "./lib/outlook-manifest-projection.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function main() {
  const validationCutoffUtc = new Date().toISOString();
  const expectedSourceSha = option("--source-sha");
  const receipt = await readJson(path.resolve(option("--receipt")));
  const releaseCandidate = await readJson(path.resolve(option("--release-receipt")));
  const protectedEvidence = openProtectedEvidenceRoot(path.resolve(option("--protected-root")));
  const runCommand = createCommandRunner({ cwd: repoRoot, allowedCommands: ["git"] });
  const { sourceSha, sourceTree } = exactGitIdentity({ expectedSourceSha, runCommand });

  const contractRef = "contracts/outlook-addin-release-gates.json";
  const contractBytes = await readFile(path.join(repoRoot, contractRef));
  const contract = JSON.parse(contractBytes);
  const packageLockBytes = await readFile(path.join(repoRoot, "package-lock.json"));
  if (releaseCandidate.source_sha !== sourceSha
    || releaseCandidate.source_tree !== sourceTree
    || releaseCandidate.package_lock_sha256 !== sha256(packageLockBytes)) {
    throw new Error("release candidate source SHA/tree/lock does not match HEAD");
  }
  const baselineBytes = await readFile(path.join(repoRoot, contract.baseline_receipt));
  const rollbackBytes = await readFile(path.join(repoRoot, contract.rollback_contract));
  const surfaceBytes = await readFile(path.join(repoRoot, contract.surface_contract));
  const baseline = JSON.parse(baselineBytes);
  const rollback = JSON.parse(rollbackBytes);
  const surface = JSON.parse(surfaceBytes);
  const expectedSourceIdentity = {
    source_sha: sourceSha,
    source_tree: sourceTree,
    package_lock_sha256: sha256(packageLockBytes),
  };
  const manifestHashesByPath = {};
  for (const manifest of contract.manifests) {
    manifestHashesByPath[manifest] = sha256(await readFile(path.join(repoRoot, manifest)));
  }
  const releaseContext = {
    baseline,
    contractArtifacts: {
      baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineBytes) },
      release_gate: { ref: contractRef, sha256: sha256(contractBytes) },
      rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackBytes) },
      surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
    },
    existingPaths: trackedGitPaths(runCommand),
    expectedSourceIdentity,
    manifestHashesByPath,
    packageLock: JSON.parse(packageLockBytes),
    packageLockBytes,
    rollback,
    surface,
  };
  const candidateManifestHashes = {};
  const candidateManifestProjections = {};
  for (const profile of contract.profiles) {
    const bytes = await readFile(path.join(repoRoot, profile.production_manifest));
    candidateManifestHashes[profile.profile] = sha256(bytes);
    candidateManifestProjections[profile.profile] = parseOutlookManifest(bytes.toString("utf8"));
  }
  const result = validateM365ReleaseReceipt(receipt, {
    contract,
    baseline,
    rollback,
    releaseCandidate,
    releaseContext,
    candidateManifestHashes,
    candidateManifestProjections,
    expectedSourceIdentity,
    protectedEvidence,
    validationCutoffUtc,
  });
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    source_sha: sourceSha,
    ...result,
    allowed_claim: result.status === "awaiting_authorized_deployment"
      ? "The dual-ProductId packet is structurally valid and awaits separate deployment authorization."
      : "Only the operations, readbacks, propagation observations, and real-host scenarios present in this receipt are verified.",
    blocked_claim: result.status === "awaiting_authorized_deployment"
      ? "No Microsoft 365 update, assignment change, propagation, real Outlook QA, or go-live occurred."
      : "Unrecorded clients, times, provider flows, propagation, and go-live remain unverified.",
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
