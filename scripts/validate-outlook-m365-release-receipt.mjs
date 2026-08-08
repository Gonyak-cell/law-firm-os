#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256, validateM365ReleaseReceipt } from "./lib/outlook-release-gates.mjs";
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
  const receipt = await readJson(path.resolve(option("--receipt")));
  const releaseCandidate = await readJson(path.resolve(option("--release-receipt")));
  const sourceSha = git("rev-parse", "HEAD");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  if (sourceSha !== expectedSourceSha) throw new Error(`exact source SHA mismatch: expected ${expectedSourceSha}, got ${sourceSha}`);
  if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("worktree changes make exact-SHA validation impossible");

  const contract = await readJson(path.join(repoRoot, "contracts/outlook-addin-release-gates.json"));
  const packageLockBytes = await readFile(path.join(repoRoot, "package-lock.json"));
  if (releaseCandidate.source_tree !== sourceTree
    || releaseCandidate.package_lock_sha256 !== sha256(packageLockBytes)) {
    throw new Error("release candidate source tree/lock does not match HEAD");
  }
  const baseline = await readJson(path.join(repoRoot, contract.baseline_receipt));
  const rollback = await readJson(path.join(repoRoot, contract.rollback_contract));
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
    candidateManifestHashes,
    candidateManifestProjections,
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
