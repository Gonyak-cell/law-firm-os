#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  REQUIRED_EFFORT,
  REQUIRED_MODEL,
  canonicalToolsString,
  normalizePackId,
  parseArgs,
  readJson,
  reviewArtifactRoot,
  writeJson,
} from "./lib/closeout-pack-claude-review-hardening.mjs";
import { readFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const packId = normalizePackId(args._[0]);
const root = args.dir ?? reviewArtifactRoot(packId);
const request = await readJson(path.join(root, "review-request.json"));
const readiness = await readJson(path.join(root, "readiness-report.json"));
if (readiness.ready !== true) {
  console.error(`Readiness gate is not ready for ${packId}; no review attempt will be run.`);
  process.exit(1);
}

const prompt = await readFile(path.resolve(request.prompt_ref), "utf8");
const schema = await readFile(path.resolve(request.json_schema_ref), "utf8");
const commandArgs = [
  "-p",
  prompt,
  "--model",
  request.model ?? REQUIRED_MODEL,
  "--effort",
  request.effort ?? REQUIRED_EFFORT,
  "--permission-mode",
  "dontAsk",
  "--tools",
  canonicalToolsString(request.tools),
  "--json-schema",
  schema,
  "--output-format",
  "json",
];

const startedAt = new Date().toISOString();
const result = spawnSync("claude", commandArgs, {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 20,
  timeout: Number(args.timeout_ms ?? 600_000),
});
const raw = {
  schema_version: "law-firm-os.closeout-pack-claude-review-raw-output.v0.1",
  pack_id: packId,
  runner: "scripts/run-closeout-pack-claude-review.mjs",
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  command: "claude",
  args: commandArgs.map((arg) => (arg === prompt ? "<prompt.txt content>" : arg === schema ? "<review-schema.json content>" : arg)),
  status: result.status,
  signal: result.signal,
  stdout: result.stdout ?? "",
  stderr: result.stderr ?? "",
  stdout_bytes: Buffer.byteLength(result.stdout ?? "", "utf8"),
  stderr_bytes: Buffer.byteLength(result.stderr ?? "", "utf8"),
};
try {
  const parsedStdout = JSON.parse(raw.stdout);
  raw.claude_cli = {
    type: parsedStdout.type,
    subtype: parsedStdout.subtype,
    is_error: parsedStdout.is_error,
    api_error_status: parsedStdout.api_error_status,
    session_id: parsedStdout.session_id,
    uuid: parsedStdout.uuid,
    total_cost_usd: parsedStdout.total_cost_usd,
    permission_denials: parsedStdout.permission_denials ?? [],
    terminal_reason: parsedStdout.terminal_reason,
  };
} catch {}

await writeJson(request.raw_output_ref, raw);
console.log(`Claude raw review output written for ${packId}.`);
console.log(`raw_output: ${request.raw_output_ref}`);
console.log("Normalize before using this as review evidence.");

if (result.status !== 0) process.exit(1);
