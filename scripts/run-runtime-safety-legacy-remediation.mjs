#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { validateRuntimeSafetyEvidence } from "./lib/runtime-safety-evidence-contract.mjs";
import { inspectRuntimeSafetyCheckout } from "./lib/runtime-safety-dependency-materialization.mjs";
import { runIsolatedCommand, validateRuntimeSafetyCommand } from "./lib/runtime-safety-isolated-runner.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const EVIDENCE_ROOT = join(ROOT, "workbook/lawos-runtime-safety-evidence");

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function exactTimestampAfter(startedAt, candidate = new Date()) {
  const started = Date.parse(startedAt);
  const candidateTime = candidate.getTime();
  return new Date(candidateTime > started ? candidateTime : started + 1).toISOString();
}

function interpolate(arg, variables) {
  return arg.replaceAll(/\{\{([A-Z0-9_]+)\}\}/gu, (_, name) => {
    const replacement = variables[name];
    if (typeof replacement !== "string" || !replacement || /[\0\r\n]/u.test(replacement)) {
      throw new TypeError(`missing or unsafe manifest variable: ${name}`);
    }
    return replacement;
  });
}

function skippedCount(output) {
  const matches = [...output.matchAll(/^(?:#|ℹ) skipped (\d+)$/gmu)];
  if (matches.length) return Number(matches.at(-1)[1]);
  return (output.match(/# SKIP\b/gu) ?? []).length;
}

function containsSecret(output) {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]+=*|\b(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|cookie|secret|private[_-]?key)\s*[:=]\s*\S+/iu.test(output);
}

function profileFor(row) {
  return ({
    "internal-unsigned-package": "internal-unsigned-package",
    "approval-packet-local-only": "approval-packet-local-only",
    "source-browser-local": "source-browser-local",
    "provider-neutral-local": "provider-neutral-local",
  })[row.selector] ?? "source-local";
}

function receiptState(row, commandsPassed) {
  if (row.tuw_id === "RS-BKP-005") {
    return Object.freeze({
      implementation_state: "READY",
      execution_state: "APPROVAL_REQUIRED",
      verified: false,
      outcome: "packet_missing",
      blocker: "approval packet was not supplied; source-local safety commands were still rerun",
    });
  }
  if (commandsPassed) {
    return Object.freeze({
      implementation_state: "VERIFIED",
      execution_state: "NOT_APPLICABLE",
      verified: true,
      outcome: row.tuw_id === "RS-GOV-008" ? "active" : "pass",
      blocker: null,
    });
  }
  return Object.freeze({
    implementation_state: "BLOCKED_NOT_REPRODUCIBLE",
    execution_state: "NOT_APPLICABLE",
    verified: false,
    outcome: "blocked_not_reproducible",
    blocker: "the exact manifest command did not reproduce without failure or skip at the historical source SHA",
  });
}

function writeExclusive(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(path, typeof value === "string" || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
}

async function executeRow({ row, target, dependency, toolchainSha, runRoot, variables }) {
  const tuwRoot = join(runRoot, "generated", row.tuw_id);
  const rawRoot = join(runRoot, "raw", row.tuw_id);
  mkdirSync(rawRoot, { recursive: true, mode: 0o700 });
  const startedAt = new Date().toISOString();
  const env = {
    ...row.env,
    PATH: `${process.execPath.slice(0, process.execPath.lastIndexOf("/"))}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
  };
  const commandRows = [];
  const resultRows = [];
  const combined = [];
  const commands = row.commands.map((argv) => argv.map((arg) => interpolate(arg, variables)));

  for (const [index, argv] of commands.entries()) {
    const ordinal = index + 1;
    const resultSlice = commands.length === 1 ? `isolated:${row.tuw_id}:all` : `isolated:${row.tuw_id}:command-${ordinal}`;
    let result;
    try {
      validateRuntimeSafetyCommand(argv, { tuwId: row.tuw_id, allowGitFetch: row.tuw_id === "RS-GOV-001" });
      result = await runIsolatedCommand({ argv, cwd: target.checkout, env, timeoutMs: row.timeout_ms });
    } catch (error) {
      const started = new Date().toISOString();
      const output = Buffer.from(`${error.code ?? "RUNNER_ERROR"}: ${error.message}\n`);
      result = { started_at: started, finished_at: exactTimestampAfter(started), exit_code: 126, output };
    }
    let output = result.output;
    if (containsSecret(output.toString("utf8"))) {
      output = Buffer.from("RUNNER_SECRET_OUTPUT: command output was withheld\n");
      result = { ...result, exit_code: 125 };
    }
    const outputSha256 = sha256(output);
    const outputPath = join(rawRoot, `command-${ordinal}.log`);
    writeExclusive(outputPath, output);
    const skipped = skippedCount(output.toString("utf8"));
    const passed = result.exit_code === 0 && skipped === 0;
    commandRows.push({
      ordinal,
      argv,
      cwd: target.checkout,
      env_keys: Object.keys(env).sort(),
      parser: row.parser,
      timeout_ms: row.timeout_ms,
      result_slice: resultSlice,
    });
    resultRows.push({
      ordinal,
      exit_code: result.exit_code,
      started_at: result.started_at,
      finished_at: exactTimestampAfter(result.started_at, new Date(result.finished_at)),
      output_sha256: outputSha256,
      result_slice: resultSlice,
      passed,
      skipped,
    });
    combined.push(output);
  }

  const combinedOutput = Buffer.concat(combined);
  const combinedPath = join(rawRoot, "combined.log");
  writeExclusive(combinedPath, combinedOutput);
  const commandsPassed = resultRows.every((result) => result.passed);
  const state = receiptState(row, commandsPassed);
  const legacyRelativePath = `workbook/lawos-runtime-safety-evidence/${row.tuw_id}/command-evidence.json`;
  const legacyPath = join(ROOT, legacyRelativePath);
  const finishedAt = exactTimestampAfter(startedAt);
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.command-evidence.v0.2",
    tuw_id: row.tuw_id,
    implementation_state: state.implementation_state,
    execution_state: state.execution_state,
    target_source_sha: target.source_sha,
    target_tree: target.tree,
    toolchain_sha: toolchainSha,
    profile: profileFor(row),
    commands: commandRows,
    results: resultRows,
    started_at: startedAt,
    finished_at: finishedAt,
    safe_counts: {
      commands_passed: resultRows.filter((result) => result.passed).length,
      commands_failed: resultRows.filter((result) => !result.passed).length,
    },
    skip_count: resultRows.reduce((sum, result) => sum + result.skipped, 0),
    output_path: combinedPath,
    output_sha256: sha256(combinedOutput),
    claims: {
      verified: state.verified,
      source_merge_candidate: false,
      production_ready: false,
      release_executed: false,
      aws_mutation_executed: false,
      provider_contacted: false,
      idp_contacted: false,
      staging_contacted: false,
      production_contacted: false,
      real_data_contacted: false,
      windows_signing_executed: false,
      cutover_executed: false,
      json_authority_disabled: false,
      go_live: false,
    },
    external_actions: [],
    legacy_evidence: {
      path: legacyRelativePath,
      sha256: sha256(readFileSync(legacyPath)),
      blob_oid: git(ROOT, "rev-parse", `HEAD:${legacyRelativePath}`),
    },
    dependency_receipt: {
      path: target.dependency_receipt,
      sha256: sha256(readFileSync(target.dependency_receipt)),
      lockfile_sha256: dependency.lockfile_sha256,
    },
    selected_outcome: state.outcome,
  };
  validateRuntimeSafetyEvidence(receipt, { outputBytes: combinedOutput, allowedOutputRoots: [runRoot] });
  writeExclusive(join(tuwRoot, "command-evidence.v0.2.json"), receipt);
  const outputHashes = {
    schema_version: "law-firm-os.runtime-safety.output-hashes.v0.2",
    tuw_id: row.tuw_id,
    target_source_sha: target.source_sha,
    combined_output_sha256: receipt.output_sha256,
    command_output_sha256: Object.fromEntries(resultRows.map((result) => [String(result.ordinal), result.output_sha256])),
  };
  writeExclusive(join(tuwRoot, "output-hashes.json"), outputHashes);
  if (!state.verified) {
    writeExclusive(join(tuwRoot, "status.json"), {
      schema_version: "law-firm-os.runtime-safety.status.v0.2",
      tuw_id: row.tuw_id,
      implementation_state: state.implementation_state,
      execution_state: state.execution_state,
      blocker: state.blocker,
      selected_outcome: state.outcome,
      external_actions: [],
    });
  }
  return Object.freeze({
    tuw_id: row.tuw_id,
    target_source_sha: target.source_sha,
    target_tree: target.tree,
    implementation_state: state.implementation_state,
    execution_state: state.execution_state,
    verified: state.verified,
    selected_outcome: state.outcome,
    legacy_path: legacyRelativePath,
    legacy_sha256: receipt.legacy_evidence.sha256,
    legacy_blob_oid: receipt.legacy_evidence.blob_oid,
    v0_2_path: `workbook/lawos-runtime-safety-evidence/${row.tuw_id}/command-evidence.v0.2.json`,
  });
}

async function main() {
  const manifestPath = resolve(value("--manifest") ?? join(EVIDENCE_ROOT, "evidence-rerun-manifest-v0.2.json"));
  const targetMapPath = resolve(value("--target-map"));
  const runRoot = resolve(value("--output-root"));
  const platformGoalRecord = resolve(value("--platform-goal-record"));
  const platformGoalId = value("--platform-goal-id");
  const finalPlanSha256 = value("--final-plan-sha256");
  if (!existsSync(targetMapPath) || !existsSync(platformGoalRecord) || !platformGoalId || !/^[a-f0-9]{64}$/u.test(finalPlanSha256 ?? "")) {
    throw new TypeError("target map, platform goal bindings, and exact final plan SHA-256 are required");
  }
  if (existsSync(join(runRoot, "generated")) || existsSync(join(runRoot, "raw"))) throw new Error("output root already contains a remediation run");
  mkdirSync(runRoot, { recursive: true, mode: 0o700 });
  const manifest = readJson(manifestPath);
  const targetMap = readJson(targetMapPath);
  const toolchainSha = git(ROOT, "rev-parse", "HEAD");
  if (git(ROOT, "status", "--porcelain=v1")) throw new Error("toolchain checkout must be clean");

  const legacyRows = manifest.rows.filter((row) => existsSync(join(EVIDENCE_ROOT, row.tuw_id, "command-evidence.json")));
  if (legacyRows.length !== 113) throw new Error(`expected 113 legacy rows, found ${legacyRows.length}`);
  const grouped = new Map();
  for (const row of legacyRows) {
    if (!Array.isArray(row.commands)) throw new Error(`${row.tuw_id} historical commands must be a closed array`);
    const legacy = readJson(join(EVIDENCE_ROOT, row.tuw_id, "command-evidence.json"));
    const target = targetMap.targets?.[legacy.source_sha];
    if (!target) throw new Error(`${row.tuw_id} target map is missing ${legacy.source_sha}`);
    const rows = grouped.get(legacy.source_sha) ?? [];
    rows.push(row);
    grouped.set(legacy.source_sha, rows);
  }
  if (grouped.size !== 9) throw new Error(`expected 9 historical targets, found ${grouped.size}`);

  const groupResults = await Promise.all([...grouped].map(async ([sourceSha, rows]) => {
    const target = targetMap.targets[sourceSha];
    const dependency = readJson(target.dependency_receipt);
    const inspection = inspectRuntimeSafetyCheckout({
      repo: target.checkout,
      targetSourceSha: sourceSha,
      targetTree: target.tree,
      requireNoNodeModules: false,
    });
    if (dependency.target_source_sha !== sourceSha || dependency.target_tree !== target.tree || dependency.lockfile_sha256 !== inspection.lockfile_sha256) {
      throw new Error(`${sourceSha} dependency receipt is not exact`);
    }
    const results = [];
    for (const row of rows) {
      if (git(target.checkout, "status", "--porcelain=v1")) throw new Error(`${sourceSha} became dirty before ${row.tuw_id}`);
      results.push(await executeRow({
        row,
        target: { ...target, source_sha: sourceSha },
        dependency,
        toolchainSha,
        runRoot,
        variables: {
          TARGET_CHECKOUT: target.checkout,
          TARGET_SOURCE_SHA: sourceSha,
          TOOLCHAIN: ROOT,
          PLATFORM_GOAL_RECORD: platformGoalRecord,
          PLATFORM_GOAL_ID: platformGoalId,
          FINAL_PLAN_SHA256: finalPlanSha256,
        },
      }));
    }
    return results;
  }));
  const rows = groupResults.flat().sort((left, right) => left.tuw_id.localeCompare(right.tuw_id));
  const remediation = {
    schema_version: "law-firm-os.runtime-safety.evidence-contract-remediation.v0.2",
    legacy_receipt_count: 113,
    historical_target_count: 9,
    v0_2_receipt_count: rows.length,
    verified_count: rows.filter((row) => row.verified).length,
    blocked_not_reproducible_count: rows.filter((row) => row.implementation_state === "BLOCKED_NOT_REPRODUCIBLE").length,
    approval_required_count: rows.filter((row) => row.execution_state === "APPROVAL_REQUIRED").length,
    legacy_files_modified: 0,
    rows,
  };
  writeExclusive(join(runRoot, "generated", "evidence-contract-remediation-v0.2.json"), remediation);

  const generatedFiles = [];
  for (const row of rows) {
    for (const name of ["command-evidence.v0.2.json", "output-hashes.json", ...(row.verified ? [] : ["status.json"])]) {
      generatedFiles.push({
        source_path: `${row.tuw_id}/${name}`,
        destination_path: `workbook/lawos-runtime-safety-evidence/${row.tuw_id}/${name}`,
      });
    }
  }
  generatedFiles.push({
    source_path: "evidence-contract-remediation-v0.2.json",
    destination_path: "workbook/lawos-runtime-safety-evidence/evidence-contract-remediation-v0.2.json",
  });
  const entries = generatedFiles.map((entry) => ({
    ...entry,
    sha256: sha256(readFileSync(join(runRoot, "generated", entry.source_path))),
  }));
  writeExclusive(join(runRoot, "materialize-manifest.json"), { entries });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", toolchain_sha: toolchainSha, ...remediation, rows: undefined, materialize_entry_count: entries.length }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "LEGACY_REMEDIATION", message: error.message, stack: error.stack })}\n`);
  process.exit(1);
});
