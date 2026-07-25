#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";
import {
  createJsonPostgresW15IncrementalComponentResult,
  createJsonPostgresW15IncrementalObservation,
} from "./lib/json-postgres-w15-incremental-observation.mjs";

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
  throw new Error(
    "W15 incremental observation requires a clean exact-head worktree",
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("W15 incremental observation requires exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(options.packet, "packet"),
  "W15 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w15-relational-projection",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const mappingManifest = readPrivateProgramJson(
  required(options["mapping-manifest"], "mapping-manifest"),
  "W15 mapping manifest",
);
const performanceAcceptance = readPrivateProgramJson(
  required(options["performance-acceptance"], "performance-acceptance"),
  "W15 performance acceptance",
);
const windows = [1, 2].map((index) => ({
  window_ref: required(
    options[`window-${index}-ref`],
    `window-${index}-ref`,
  ),
  started_at: required(
    options[`window-${index}-started-at`],
    `window-${index}-started-at`,
  ),
  finished_at: required(
    options[`window-${index}-finished-at`],
    `window-${index}-finished-at`,
  ),
  execution: readPrivateProgramJson(
    required(
      options[`window-${index}-execution`],
      `window-${index}-execution`,
    ),
    `W15 event window ${index} execution`,
  ),
  validation: readPrivateProgramJson(
    required(
      options[`window-${index}-validation`],
      `window-${index}-validation`,
    ),
    `W15 event window ${index} validation`,
  ),
}));
const replay = {
  observed_at: required(
    options["replay-observed-at"],
    "replay-observed-at",
  ),
  execution: readPrivateProgramJson(
    required(options["replay-execution"], "replay-execution"),
    "W15 incremental replay execution",
  ),
};
const observation = createJsonPostgresW15IncrementalObservation({
  packet,
  mappingManifest,
  performanceAcceptance,
  windows,
  replay,
});
const componentResult = createJsonPostgresW15IncrementalComponentResult({
  packet,
  observation,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const observationFile = writePrivateProgramJson(
  join(outputDir, "w15-incremental-observation.json"),
  observation,
);
const componentFile = writePrivateProgramJson(
  join(outputDir, "w15-incremental-component-result.json"),
  componentResult,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  observation_path: observationFile.path,
  observation_sha256: observationFile.sha256,
  observation_result_sha256: observation.result_sha256,
  component_result_path: componentFile.path,
  component_result_sha256: componentFile.sha256,
  event_window_count: observation.event_window_count,
  populated_rollout_waves: observation.populated_rollout_waves,
  execution_claimed_complete: false,
}, null, 2)}\n`);
