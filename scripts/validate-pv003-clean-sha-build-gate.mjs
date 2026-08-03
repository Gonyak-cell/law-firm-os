#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertDesktopFormalBuildProvenance,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";
import { validateFormalBuildEntrypointSource } from "./lib/formal-build-entrypoint-contract.mjs";

const usage = "usage: node scripts/validate-pv003-clean-sha-build-gate.mjs [--source|--current|--help] [--source-root <path>]";
const command = process.argv[2] ?? "--source";
if (command === "--help") {
  console.log(usage);
  console.log("Checks that every formal desktop artifact entrypoint fails closed on dirty, mismatched-SHA, or unauthorized-branch sources.");
  process.exit(0);
}
const sourceRootIndex = process.argv.indexOf("--source-root");
const sourceRoot = sourceRootIndex >= 0 ? process.argv[sourceRootIndex + 1] : undefined;
const allowedArgumentCount = sourceRoot ? 5 : 3;
if (
  !["--source", "--current"].includes(command)
  || process.argv.length > allowedArgumentCount
  || (sourceRootIndex >= 0 && (!sourceRoot || command !== "--source"))
) {
  console.error(usage);
  process.exit(2);
}

const ROOT = sourceRoot
  ? path.resolve(sourceRoot)
  : execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (!sourceRoot && path.resolve(ROOT) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${ROOT}`);

const entrypoints = [
  "scripts/build-matter-desktop-mac.mjs",
  "scripts/build-matter-desktop-win.mjs",
  "scripts/build-matter-desktop-win-installer.mjs",
  "scripts/release-matter-desktop-formal.mjs",
];

function validateSource() {
  const contracts = [];
  for (const relativePath of entrypoints) {
    const absolutePath = path.join(ROOT, relativePath);
    execFileSync(process.execPath, ["--check", absolutePath], { stdio: "pipe" });
    contracts.push(validateFormalBuildEntrypointSource(readFileSync(absolutePath, "utf8"), { relativePath }));
  }
  return {
    protected_entrypoints: entrypoints,
    protected_entrypoint_count: entrypoints.length,
    formal_bypass_count: 0,
    structural_contracts: contracts,
    allowed_refs: [
      "main",
      "integration/forest-v<semver>",
      "release/forest-v<semver>",
      "DETACHED exact SHA",
    ],
  };
}

const source = validateSource();
if (command === "--source") {
  console.log(JSON.stringify({ verdict: "PASS", mode: "source", ...source }, null, 2));
  process.exit(0);
}

const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
const gate = assertDesktopFormalBuildProvenance({
  releaseChannel: process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "formal",
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
});
console.log(JSON.stringify({
  verdict: gate.verdict,
  mode: "current",
  ...source,
  gate,
  source_identity: {
    sha: sourceIdentity.sourceSha,
    tree: sourceIdentity.sourceTree,
    branch: sourceIdentity.sourceBranch || "DETACHED",
    dirty: sourceIdentity.sourceDirty,
    dirty_paths: sourceIdentity.sourceDirtyPaths,
    ignored_generated_evidence_paths: sourceIdentity.ignoredEvidenceDirtyPaths,
  },
}, null, 2));
