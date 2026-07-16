#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertDesktopFormalBuildProvenance,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";

const usage = "usage: node scripts/validate-pv003-clean-sha-build-gate.mjs [--source|--current|--help]";
const command = process.argv[2] ?? "--source";
if (command === "--help") {
  console.log(usage);
  console.log("Checks that every formal desktop artifact entrypoint fails closed on dirty, mismatched-SHA, or unauthorized-branch sources.");
  process.exit(0);
}
if (!["--source", "--current"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(ROOT) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${ROOT}`);

const entrypoints = [
  "scripts/build-matter-desktop-mac.mjs",
  "scripts/build-matter-desktop-win.mjs",
  "scripts/build-matter-desktop-win-installer.mjs",
  "scripts/release-matter-desktop-formal.mjs",
];

function validateSource() {
  const bypasses = [];
  for (const relativePath of entrypoints) {
    const source = readFileSync(path.join(ROOT, relativePath), "utf8");
    assert.match(source, /assertDesktopFormalBuildProvenance/);
    assert.match(source, /MATTER_DESKTOP_EXPECTED_SOURCE_SHA/);
    const gateIndex = source.indexOf("assertDesktopFormalBuildProvenance({");
    const firstMutationIndexes = [
      source.indexOf("await rm("),
      source.indexOf("await writeFile("),
      source.indexOf("await cp("),
    ].filter((index) => index >= 0);
    const firstMutationIndex = firstMutationIndexes.length ? Math.min(...firstMutationIndexes) : Number.POSITIVE_INFINITY;
    if (gateIndex < 0 || gateIndex > firstMutationIndex) bypasses.push(relativePath);
  }
  assert.deepEqual(bypasses, [], `formal build gate bypasses found: ${bypasses.join(", ")}`);
  return {
    protected_entrypoints: entrypoints,
    protected_entrypoint_count: entrypoints.length,
    formal_bypass_count: bypasses.length,
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
