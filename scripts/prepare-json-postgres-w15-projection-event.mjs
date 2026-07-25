#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  createJsonPostgresW15ProjectionEvent,
} from "./lib/json-postgres-w15-execution.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    const key = flag.slice(2);
    if (values[key] != null) throw new TypeError(`duplicate option: ${flag}`);
    values[key] = value;
  }
  return values;
}

function required(value, label) {
  if (!value) throw new TypeError(`--${label} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

const options = parse(process.argv.slice(2));
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W15 event preparation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("W15 event preparation requires exact origin/main");
}
const packet = readPrivateProgramJson(
  required(options.packet, "packet"),
  "W15 execution packet",
);
if (packet.source_sha !== sourceSha || packet.source_tree !== sourceTree) {
  throw new Error("W15 packet source SHA/tree drifted");
}
const event = createJsonPostgresW15ProjectionEvent({
  packet,
  artifactSha256: required(options["artifact-sha256"], "artifact-sha256"),
  mode: required(options.mode, "mode"),
  attemptRef: required(options["attempt-ref"], "attempt-ref"),
  authorization: readPrivateProgramJson(
    required(options.authorization, "authorization"),
    "W15 authorization locators",
  ),
  inputs: readPrivateProgramJson(
    required(options.inputs, "inputs"),
    "W15 input locators",
  ),
  backfillWave: options["backfill-wave"] == null
    ? null
    : Number(options["backfill-wave"]),
  rolloutAction: options["rollout-action"] ?? null,
  queryFamily: options["query-family"] ?? null,
  maxStalenessMs: options["max-staleness-ms"] == null
    ? null
    : Number(options["max-staleness-ms"]),
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const file = writePrivateProgramJson(
  join(outputDir, `w15-${event.attempt_ref}-event.json`),
  event,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: event.packet_sha256,
  mode: event.mode,
  attempt_ref: event.attempt_ref,
  event_path: file.path,
  event_sha256: file.sha256,
  aws_mutation_executed: false,
  production_write_executed: false,
}, null, 2)}\n`);
