#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  assertCanonicalLaunchProcessState,
  classifyMatterProcesses,
  darwinProcessExecutable,
  inspectCanonicalMacBundle,
  parseMatterProcessTable,
} from "./lib/matter-desktop-canonical-launch.mjs";
import { desktopReleaseChannelConfig } from "./lib/matter-desktop-provenance.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const USAGE = [
  "usage: node scripts/launch-matter-desktop-canonical.mjs --expected-sha <40-char-sha> [options]",
  "",
  "Options:",
  "  --app <absolute-app>         Exact app bundle path (default: repo internal macOS bundle)",
  "  --channel <channel>          Release channel (default: internal)",
  "  --receipt <path>             Write the launch receipt JSON",
  "  --wait-ms <milliseconds>     Launch/termination timeout, 1000-60000 (default: 15000)",
  "  --dry-run                    Validate bundle, release truth, and process state without mutation",
  "  --help                       Show this help",
].join("\n");

function usageError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

function parseArgs(argv) {
  const options = {
    appBundlePath: "",
    channel: "internal",
    dryRun: false,
    expectedSourceSha: "",
    receiptPath: "",
    waitMs: 15_000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") return { help: true };
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (!["--app", "--channel", "--expected-sha", "--receipt", "--wait-ms"].includes(argument)) {
      throw usageError(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw usageError(`missing value for ${argument}`);
    index += 1;
    if (argument === "--app") options.appBundlePath = value;
    if (argument === "--channel") options.channel = value;
    if (argument === "--expected-sha") options.expectedSourceSha = value;
    if (argument === "--receipt") options.receiptPath = path.resolve(value);
    if (argument === "--wait-ms") options.waitMs = Number(value);
  }
  if (!options.expectedSourceSha) throw usageError("--expected-sha is required");
  if (!options.appBundlePath) {
    options.appBundlePath = path.join(
      ROOT,
      "apps/desktop/dist/mac",
      desktopReleaseChannelConfig(options.channel).macAppBundleName,
    );
  }
  if (!path.isAbsolute(options.appBundlePath)) throw usageError("--app must be an absolute path");
  if (!Number.isInteger(options.waitMs) || options.waitMs < 1_000 || options.waitMs > 60_000) {
    throw usageError("--wait-ms must be an integer between 1000 and 60000");
  }
  return options;
}

function processRecords() {
  return parseMatterProcessTable(
    execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" }),
    { resolveExecutable: darwinProcessExecutable },
  );
}

function signal(pid, name) {
  try {
    process.kill(pid, name);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor({ targetExecutable, waitMs, predicate, description }) {
  const deadline = Date.now() + waitMs;
  while (Date.now() <= deadline) {
    const processes = processRecords();
    assertCanonicalLaunchProcessState({ processes, targetExecutable });
    const classified = classifyMatterProcesses({ processes, targetExecutable });
    if (predicate(classified.exact)) return classified.exact;
    await pause(100);
  }
  throw new Error(`timed out waiting for ${description}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }
  assert.equal(process.platform, "darwin", "canonical desktop app launcher requires macOS");
  const inspection = inspectCanonicalMacBundle({
    repoRoot: ROOT,
    appBundlePath: options.appBundlePath,
    expectedSourceSha: options.expectedSourceSha,
    expectedChannel: options.channel,
  });
  const initialProcesses = processRecords();
  const initialState = assertCanonicalLaunchProcessState({
    processes: initialProcesses,
    targetExecutable: inspection.executable,
  });

  if (options.dryRun) {
    console.log(JSON.stringify({
      verdict: "PASS",
      mode: "dry-run",
      ...inspection,
      duplicate_pids_to_terminate: initialState.duplicate_pids,
      conflicting_pids: [],
      mutation_performed: false,
    }, null, 2));
    return;
  }

  for (const pid of initialState.duplicate_pids) signal(pid, "SIGTERM");
  if (initialState.duplicate_pids.length > 0) {
    try {
      await waitFor({
        targetExecutable: inspection.executable,
        waitMs: Math.min(options.waitMs, 5_000),
        predicate: (exact) => exact.length === 0,
        description: "exact-path duplicate termination",
      });
    } catch {
      const remaining = classifyMatterProcesses({
        processes: processRecords(),
        targetExecutable: inspection.executable,
      }).exact;
      for (const { pid } of remaining) signal(pid, "SIGKILL");
      await waitFor({
        targetExecutable: inspection.executable,
        waitMs: 5_000,
        predicate: (exact) => exact.length === 0,
        description: "forced exact-path duplicate termination",
      });
    }
  }

  const child = spawn(inspection.executable, [], {
    detached: true,
    env: process.env,
    stdio: "ignore",
  });
  child.unref();
  let launched;
  try {
    const exact = await waitFor({
      targetExecutable: inspection.executable,
      waitMs: options.waitMs,
      predicate: (records) => records.some(({ pid }) => pid === child.pid),
      description: "canonical matter process",
    });
    launched = exact.find(({ pid }) => pid === child.pid);
    assert.ok(launched, "launched PID was not bound to the canonical executable path");
    assert.equal(exact.length, 1, "canonical launch must leave exactly one root matter process");
  } catch (error) {
    signal(child.pid, "SIGTERM");
    throw error;
  }

  const receipt = {
    schema_version: "law-firm-os.pv007-canonical-launch.v1",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    mode: "launch",
    expected_source_sha: options.expectedSourceSha,
    app_bundle: inspection.app_bundle,
    executable: inspection.executable,
    artifact_index: inspection.artifact_index,
    manifest_path: inspection.manifest_path,
    source_tree: inspection.source_tree,
    version: inspection.version,
    channel: inspection.channel,
    app_id: inspection.app_id,
    renderer: inspection.renderer,
    terminated_duplicate_pids: initialState.duplicate_pids,
    conflicting_pids: [],
    launched_pid: launched.pid,
    process_executable: launched.matter_executable,
    exact_path_match: launched.matter_executable === inspection.executable,
    staged_manifest_equal: inspection.staged_manifest_equal,
    public_release_claim: false,
    production_go_live_claim: false,
  };
  if (options.receiptPath) {
    mkdirSync(path.dirname(options.receiptPath), { recursive: true });
    writeFileSync(options.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(`PV-007 canonical launch blocked: ${error.message}`);
  if (error.exitCode === 2) console.error(USAGE);
  process.exit(error.exitCode ?? 1);
});
