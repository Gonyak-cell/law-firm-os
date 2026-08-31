#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildProductionManifestBindings,
  buildStaticDryRunPlan,
  buildStaticFilesReleaseReceipt,
  openProtectedEvidenceRoot,
  sha256,
  validateCandidateBuildRevision,
  validateForwardStaticRollbackContract,
  validateStaticFilesReleaseReceipt,
  verifyForwardStaticRollbackSnapshot,
} from "./lib/outlook-release-gates.mjs";
import { createCommandRunner, trackedGitPaths } from "./lib/outlook-release/cli-runtime.mjs";
import { createOutlookReleaseCandidateReceipt } from "./validate-outlook-release-candidate.mjs";
import { validateOutlookM365CanaryManifestSet } from "./validate-outlook-m365-canary-manifests.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const forwardRollbackContractRef = "contracts/outlook-addin-forward-static-rollback.json";
const productionManifestPaths = [
  "apps/addin/manifest.canary.taskpane.production.xml",
  "apps/addin/manifest.canary.rollback.production.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.inquiry.production.xml",
];

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

async function releaseContext(contract, contractBytes, receipt) {
  const baselineBytes = await readFile(path.join(repoRoot, contract.baseline_receipt));
  const rollbackBytes = await readFile(path.join(repoRoot, contract.rollback_contract));
  const surfaceBytes = await readFile(path.join(repoRoot, contract.surface_contract));
  const packageLockBytes = await readFile(path.join(repoRoot, "package-lock.json"));
  const manifestHashesByPath = {};
  for (const manifest of contract.manifests) {
    manifestHashesByPath[manifest] = sha256(await readFile(path.join(repoRoot, manifest)));
  }
  const runCommand = createCommandRunner({ cwd: repoRoot, allowedCommands: ["git"] });
  return {
    baseline: JSON.parse(baselineBytes),
    contractArtifacts: {
      baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineBytes) },
      release_gate: { ref: "contracts/outlook-addin-release-gates.json", sha256: sha256(contractBytes) },
      rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackBytes) },
      surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
    },
    existingPaths: trackedGitPaths(runCommand),
    expectedSourceIdentity: {
      source_sha: receipt.source_sha,
      source_tree: receipt.source_tree,
      package_lock_sha256: receipt.package_lock_sha256,
    },
    packageLock: JSON.parse(packageLockBytes),
    packageLockBytes,
    manifestHashesByPath,
    rollback: JSON.parse(rollbackBytes),
    surface: JSON.parse(surfaceBytes),
  };
}

export async function createOutlookStaticFilesReleaseReceipt({
  expectedSourceSha,
  priorSnapshotRoot,
  bucketRef,
} = {}) {
  if (!expectedSourceSha || !priorSnapshotRoot || !bucketRef) {
    throw new TypeError("expectedSourceSha, priorSnapshotRoot, and bucketRef are required");
  }
  const contractRef = "contracts/outlook-addin-release-gates.json";
  const contractBytes = await readFile(path.join(repoRoot, contractRef));
  const contract = JSON.parse(contractBytes);
  const releaseReceipt = await createOutlookReleaseCandidateReceipt({ expectedSourceSha, root: repoRoot });
  const context = await releaseContext(contract, contractBytes, releaseReceipt);

  const manifestBytesByPath = new Map();
  for (const manifest of productionManifestPaths) {
    manifestBytesByPath.set(manifest, await readFile(path.join(repoRoot, manifest)));
  }
  const forwardRollbackBytes = await readFile(path.join(repoRoot, forwardRollbackContractRef));
  const forwardRollback = JSON.parse(forwardRollbackBytes);
  const manifestBindings = buildProductionManifestBindings({
    manifestBytesByPath,
    releaseContract: contract,
    origin: forwardRollback.origin,
  });
  const sourceLocations = Object.fromEntries(contract.profiles.map((profile) => [
    profile.profile,
    manifestBindings.find(({ path: manifestPath }) => manifestPath === profile.production_manifest).source_locations,
  ]));
  const staticPlan = buildStaticDryRunPlan({
    releaseReceipt,
    releaseContext: context,
    sourceLocations,
    contract,
    bucketRef,
  });
  const rollbackManifestBytes = manifestBytesByPath.get(forwardRollback.forward_rollback.manifest_path);
  const forwardRollbackResult = validateForwardStaticRollbackContract(
    forwardRollback,
    contract,
    rollbackManifestBytes,
  );
  const priorSnapshotProof = verifyForwardStaticRollbackSnapshot(
    forwardRollback,
    contract,
    rollbackManifestBytes,
    openProtectedEvidenceRoot(priorSnapshotRoot),
  );
  const buildBytesByPath = new Map();
  for (const artifact of releaseReceipt.inventory.filter(({ path: file }) => file.endsWith(".js"))) {
    buildBytesByPath.set(artifact.path, await readFile(path.join(repoRoot, contract.build.root, artifact.path)));
  }
  const buildRevisionBindings = validateCandidateBuildRevision({
    inventory: releaseReceipt.inventory,
    bytesByPath: buildBytesByPath,
    releaseContract: contract,
    sourceSha: releaseReceipt.source_sha,
  });
  const canaryManifestSet = await validateOutlookM365CanaryManifestSet({ repoRoot });
  const options = {
    releaseReceipt,
    releaseContext: context,
    staticPlan,
    releaseContract: contract,
    manifestBindings,
    canaryManifestSet,
    forwardRollback,
    forwardRollbackContractRef,
    forwardRollbackContractSha256: sha256(forwardRollbackBytes),
    forwardRollbackResult,
    priorSnapshotProof,
    buildRevisionBindings,
  };
  const receipt = buildStaticFilesReleaseReceipt(options);
  validateStaticFilesReleaseReceipt(receipt, options);
  return receipt;
}

async function main() {
  const receipt = await createOutlookStaticFilesReleaseReceipt({
    expectedSourceSha: option("--source-sha"),
    priorSnapshotRoot: path.resolve(option("--prior-snapshot-root")),
    bucketRef: option("--bucket-ref"),
  });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
