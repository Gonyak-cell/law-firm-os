#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildStaticDryRunPlan,
  collectBuildInventory,
  sha256,
  validateBuildInventories,
  validateStaticDryRunPlan,
} from "./lib/outlook-release-gates.mjs";
import { parseOutlookManifest } from "./lib/outlook-manifest-projection.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function main() {
  const expectedSourceSha = option("--source-sha");
  const receiptPath = path.resolve(option("--release-receipt"));
  const bucketRef = option("--bucket-ref");
  if (!/^[A-Z][A-Z0-9_]{2,63}$/u.test(bucketRef)) throw new Error("--bucket-ref must be a symbolic environment/config reference, not a bucket value");
  const sourceSha = git("rev-parse", "HEAD");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  if (sourceSha !== expectedSourceSha) throw new Error(`exact source SHA mismatch: expected ${expectedSourceSha}, got ${sourceSha}`);
  if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("worktree changes make exact-SHA planning impossible");

  const contractRef = "contracts/outlook-addin-release-gates.json";
  const contractBytes = await readFile(path.join(repoRoot, contractRef));
  const contract = JSON.parse(contractBytes);
  const releaseReceipt = await readJson(receiptPath);
  const packageLockBytes = await readFile(path.join(repoRoot, "package-lock.json"));
  if (releaseReceipt.source_sha !== sourceSha
    || releaseReceipt.source_tree !== sourceTree
    || releaseReceipt.package_lock_sha256 !== sha256(packageLockBytes)) {
    throw new Error("release receipt source SHA/tree/lock does not match HEAD");
  }
  const currentInventory = await collectBuildInventory(path.join(repoRoot, contract.build.root), contract);
  validateBuildInventories(releaseReceipt.inventory, currentInventory, contract);
  const manifestHashesByPath = {};
  for (const manifest of contract.manifests) {
    manifestHashesByPath[manifest] = sha256(await readFile(path.join(repoRoot, manifest)));
  }
  const sourceLocations = {};
  for (const profile of contract.profiles) {
    const xml = await readFile(path.join(repoRoot, profile.production_manifest), "utf8");
    sourceLocations[profile.profile] = parseOutlookManifest(xml).form_source_locations;
  }
  const baselineBytes = await readFile(path.join(repoRoot, contract.baseline_receipt));
  const rollbackBytes = await readFile(path.join(repoRoot, contract.rollback_contract));
  const surfaceBytes = await readFile(path.join(repoRoot, contract.surface_contract));
  const releaseContext = {
    baseline: JSON.parse(baselineBytes),
    contractArtifacts: {
      baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineBytes) },
      release_gate: { ref: contractRef, sha256: sha256(contractBytes) },
      rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackBytes) },
      surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
    },
    existingPaths: new Set(git("ls-files", "-z").split("\0").filter(Boolean)),
    expectedSourceIdentity: {
      source_sha: sourceSha,
      source_tree: sourceTree,
      package_lock_sha256: sha256(packageLockBytes),
    },
    packageLock: JSON.parse(packageLockBytes),
    packageLockBytes,
    manifestHashesByPath,
    rollback: JSON.parse(rollbackBytes),
    surface: JSON.parse(surfaceBytes),
  };
  const plan = buildStaticDryRunPlan({ releaseReceipt, releaseContext, sourceLocations, contract, bucketRef });
  validateStaticDryRunPlan(plan, { contract, releaseReceipt, releaseContext, sourceLocations });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
