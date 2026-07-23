#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  createJsonPostgresArtifactReproducibilityEvidence,
} from "./lib/json-postgres-artifact-reproducibility.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (Number(process.versions.node.split(".")[0]) !== 22) {
  throw new Error("artifact reproducibility verification requires Node.js 22");
}
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("artifact reproducibility verification requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const evidence = createJsonPostgresArtifactReproducibilityEvidence({
  sourceSha,
  sourceTree,
  firstArtifact: readPrivateProgramBytes(
    required(option("--first-artifact"), "--first-artifact"),
    "first production artifact",
  ),
  secondArtifact: readPrivateProgramBytes(
    required(option("--second-artifact"), "--second-artifact"),
    "second production artifact",
  ),
  firstManifest: readPrivateProgramJson(
    required(option("--first-manifest"), "--first-manifest"),
    "first production artifact manifest",
  ),
  secondManifest: readPrivateProgramJson(
    required(option("--second-manifest"), "--second-manifest"),
    "second production artifact manifest",
  ),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "artifact-reproducibility-evidence.json"),
  evidence,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  artifact_sha256: evidence.artifact_sha256,
  build_count: 2,
  mismatch_count: 0,
  evidence_path: output.path,
  evidence_sha256: output.sha256,
  external_action_executed: false,
}, null, 2)}\n`);
