#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  assertJsonPostgresW15SourcePublished,
  createJsonPostgresW15BootstrapEvent,
} from "./lib/json-postgres-w15-bootstrap-event.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
}

function required(name) {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 bootstrap event preparation requires a clean worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const originMainSha = git("rev-parse", "origin/main");
const originMainTree = git("rev-parse", "origin/main^{tree}");
assertJsonPostgresW15SourcePublished({
  sourceSha,
  sourceTree,
  originMainSha,
  originMainTree,
  sourceIsAncestor: spawnSync(
    "git",
    ["merge-base", "--is-ancestor", sourceSha, originMainSha],
    { cwd: process.cwd(), encoding: "utf8" },
  ).status === 0,
});
const packet = readPrivateProgramJson(
  required("--packet"),
  "W15 bootstrap packet",
);
if (packet.source_sha !== sourceSha || packet.source_tree !== sourceTree) {
  throw new Error("W15 bootstrap packet source drifted");
}
const event = createJsonPostgresW15BootstrapEvent({
  packet,
  artifactSha256: required("--artifact-sha256"),
  mode: required("--mode"),
  attemptRef: required("--attempt-ref"),
  authorization: readPrivateProgramJson(
    required("--authorization"),
    "W15 bootstrap authorization locators",
  ),
  inputs: readPrivateProgramJson(
    required("--inputs"),
    "W15 bootstrap input locators",
  ),
  schemaBootstrapResultSha256:
    option("--schema-bootstrap-result-sha256"),
});
const outputDir = createPrivateProgramOutputDirectory(
  required("--output-dir"),
);
const file = writePrivateProgramJson(
  join(outputDir, `w15-${event.attempt_ref}-event.json`),
  event,
);
process.stdout.write(`${JSON.stringify({
  outcome: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  mode: event.mode,
  packet_sha256: event.packet_sha256,
  event_path: file.path,
  event_sha256: file.sha256,
  external_actions_authorized: false,
  aws_mutated: false,
  postgres_mutated: false,
}, null, 2)}\n`);
