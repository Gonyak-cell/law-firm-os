#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  collectBuildInventory,
  sha256,
  validateBuildInventories,
  validateCoveragePaths,
  validateDependencyLicenses,
  validateReleaseCandidateReceipt,
  validateReleaseContract,
  validateRollbackContract,
  validateSurfaceSeparation,
} from "./lib/outlook-release-gates.mjs";
import { validateOutlookAddinSurfaces } from "./validate-outlook-addin-surfaces.mjs";

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

function run(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, CI: "1" },
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim().slice(-4_000);
    throw new Error(`${command} ${args.join(" ")} failed${output ? `: ${output}` : ""}`);
  }
}

export async function profileArtifacts(contract, inventory) {
  const byPath = new Map(inventory.map((entry) => [entry.path, entry]));
  const result = [];
  for (const profile of contract.profiles) {
    const html = await readFile(path.join(repoRoot, contract.build.root, profile.taskpane_html), "utf8");
    const scripts = [...html.matchAll(/<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+\.js)["']/giu)]
      .map((match) => match[1]);
    if (scripts.length !== 1) throw new Error(`${profile.profile} task pane must reference exactly one JavaScript entry bundle`);
    const sourcePath = new URL(scripts[0], "https://release.invalid/").pathname.replace(/^\/(?:addin|outlook-addin)\//u, "");
    const bundlePath = profile.profile === "inquiry-only" ? `outlook-addin/${sourcePath}` : sourcePath;
    const bundle = byPath.get(bundlePath);
    const taskpane = byPath.get(profile.taskpane_html);
    if (!bundle || !taskpane) throw new Error(`${profile.profile} task pane bundle is missing from the build inventory`);
    result.push({
      profile: profile.profile,
      product_id: profile.product_id,
      taskpane_html_path: taskpane.path,
      taskpane_html_sha256: taskpane.sha256,
      bundle_path: bundle.path,
      bundle_sha256: bundle.sha256,
    });
  }
  return result;
}

export async function graphScopeFingerprint(contract) {
  const graphModel = await import(pathToFileURL(path.join(repoRoot, "packages/email-dms/src/m365-connection-model.js")));
  const oauthClient = await import(pathToFileURL(path.join(repoRoot, "apps/api/src/microsoft-delegated-oauth-client.js")));
  const graphScopes = [...graphModel.M365_GRAPH_REQUIRED_SCOPES].sort();
  const oauthScopes = [...oauthClient.CLIENT_OUTLOOK_OAUTH_SCOPES].sort();
  if (JSON.stringify(graphScopes) !== JSON.stringify([...contract.client_outlook_graph_connection_scopes].sort())
    || JSON.stringify(oauthScopes) !== JSON.stringify([...contract.client_outlook_oauth_scopes].sort())) {
    throw new Error("Client Outlook delegated OAuth/Graph scope drifted");
  }
  return {
    graph_connection_scopes: graphScopes,
    oauth_scopes: oauthScopes,
    fingerprint_sha256: sha256(JSON.stringify({ graphScopes, oauthScopes })),
    diff: "none",
  };
}

async function main() {
  const expectedSourceSha = option("--source-sha");
  const contractRef = "contracts/outlook-addin-release-gates.json";
  const contractBytes = await readFile(path.join(repoRoot, contractRef));
  const contract = JSON.parse(contractBytes);
  const baselineBytes = await readFile(path.join(repoRoot, contract.baseline_receipt));
  const surfaceBytes = await readFile(path.join(repoRoot, contract.surface_contract));
  const rollbackBytes = await readFile(path.join(repoRoot, contract.rollback_contract));
  const baseline = JSON.parse(baselineBytes);
  const surface = JSON.parse(surfaceBytes);
  const rollback = JSON.parse(rollbackBytes);
  const packageLockBytes = await readFile(path.join(repoRoot, "package-lock.json"));
  const packageLock = JSON.parse(packageLockBytes);

  validateReleaseContract(contract);
  const sourceSha = git("rev-parse", "HEAD");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  if (sourceSha !== expectedSourceSha) throw new Error(`exact source SHA mismatch: expected ${expectedSourceSha}, got ${sourceSha}`);
  if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("worktree changes make exact-SHA validation impossible");

  const trackedPaths = new Set(git("ls-files", "-z").split("\0").filter(Boolean));
  const coverage = validateCoveragePaths(trackedPaths, contract);
  const licenses = validateDependencyLicenses(packageLock, contract);
  const rollbackResult = validateRollbackContract(rollback, baseline, contract);
  const surfaceResult = validateSurfaceSeparation(surface, baseline, contract);
  const graphScopes = await graphScopeFingerprint(contract);
  const candidateResult = await validateOutlookAddinSurfaces({ repoRoot, baseline, mode: "candidate" });
  if (candidateResult.permission_event_assignment_diff !== "none") throw new Error("candidate manifest drifted from frozen identity contract");

  const [buildCommand, ...buildArgs] = contract.build.command;
  run(buildCommand, buildArgs);
  const first = await collectBuildInventory(path.join(repoRoot, contract.build.root), contract);
  run(buildCommand, buildArgs);
  const second = await collectBuildInventory(path.join(repoRoot, contract.build.root), contract);
  const build = validateBuildInventories(first, second, contract);

  const manifests = [];
  for (const manifest of contract.manifests) {
    run("npx", ["--yes", "office-addin-manifest@2.1.6", "validate", manifest]);
    const bytes = await readFile(path.join(repoRoot, manifest));
    manifests.push({ path: manifest, sha256: sha256(bytes) });
  }
  const artifacts = await profileArtifacts(contract, build.inventory);
  const eventRuntime = build.inventory.find(({ path: file }) => file === "event-runtime.js");
  if (!eventRuntime) throw new Error("event runtime is missing from the release inventory");
  if (git("rev-parse", "HEAD") !== sourceSha
    || git("rev-parse", "HEAD^{tree}") !== sourceTree
    || git("status", "--porcelain=v1", "--untracked-files=all")) {
    throw new Error("release validation changed or drifted from the exact source tree");
  }

  const contractArtifacts = {
    baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineBytes) },
    release_gate: { ref: contractRef, sha256: sha256(contractBytes) },
    rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackBytes) },
    surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
  };
  const receipt = {
    schema_version: "amic-os.outlook-release-candidate.v1",
    verdict: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    package_lock_sha256: sha256(packageLockBytes),
    exact_sha_bound: true,
    builds_identical: build.builds_identical,
    artifact_count: build.artifact_count,
    inventory_sha256: build.inventory_sha256,
    inventory: build.inventory,
    profile_artifacts: artifacts,
    event_runtime: eventRuntime,
    profiles: candidateResult.profiles,
    manifest_validation: {
      validator: "office-addin-manifest@2.1.6",
      official_validation_count: manifests.length,
      manifests,
    },
    coverage,
    licenses,
    rollback: rollbackResult,
    surface: surfaceResult,
    graph_scopes: graphScopes,
    contract_artifacts: contractArtifacts,
    runtime_provider_calls: 0,
    external_mutations: 0,
    allowed_claim: "Exact source, deterministic local build, four official manifest validations, frozen profile drift, rollback metadata, and dependency licenses passed.",
    blocked_claim: "This receipt is not API/static/M365 deployment, propagation, real Outlook host, Graph delivery, DocuSign sandbox, or go-live evidence.",
  };
  validateReleaseCandidateReceipt(receipt, contract, {
    baseline,
    contractArtifacts,
    existingPaths: trackedPaths,
    expectedSourceIdentity: {
      source_sha: sourceSha,
      source_tree: sourceTree,
      package_lock_sha256: sha256(packageLockBytes),
    },
    packageLock,
    packageLockBytes,
    manifestHashesByPath: Object.fromEntries(manifests.map(({ path: manifest, sha256: digest }) => [manifest, digest])),
    rollback,
    surface,
  });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
