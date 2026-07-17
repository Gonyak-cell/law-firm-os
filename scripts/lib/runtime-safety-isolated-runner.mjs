import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { inspectRuntimeSafetyCheckout } from "./runtime-safety-dependency-materialization.mjs";
import { EVIDENCE_SCHEMA_VERSION, validateRuntimeSafetyEvidence } from "./runtime-safety-evidence-contract.mjs";

export class RuntimeSafetyRunnerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeSafetyRunnerError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeSafetyRunnerError(code, message, details);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function flagValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function isLoopbackUrl(value) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return true;
  }
}

export function validateRuntimeSafetyCommand(argv, {
  tuwId,
  allowGitFetch = false,
  externalAuthorized = false,
  userInstructionSha256,
} = {}) {
  if (!Array.isArray(argv) || argv.length === 0 || argv.some((arg) => typeof arg !== "string" || !arg || /[\0\r\n]/.test(arg))) {
    fail("RUNNER_COMMAND", "command must be a non-empty literal argv array");
  }
  const executable = basename(argv[0]).toLowerCase();
  const lower = argv.map((arg) => arg.toLowerCase());
  const authorizeExternal = () => {
    if (!externalAuthorized || !/^[0-9a-f]{64}$/.test(userInstructionSha256 ?? "")) {
      fail("RUNNER_PROHIBITED_COMMAND", "external or mutating command lacks exact approval and user instruction authority", { argv });
    }
  };

  if (["aws", "az", "gcloud", "terraform", "kubectl", "ssh", "scp", "rsync"].includes(executable)) authorizeExternal();
  if (["curl", "wget"].includes(executable) && argv.slice(1).some((arg) => /^https?:\/\//i.test(arg) && !isLoopbackUrl(arg))) authorizeExternal();
  if (executable === "git") {
    const subcommand = lower[1];
    const readOnly = new Set(["rev-parse", "merge-base", "status", "cat-file", "diff-tree", "ls-files", "hash-object", "show", "log"]);
    if (subcommand === "fetch" && tuwId === "RS-GOV-001" && allowGitFetch) {
      // Standalone-clone baseline refresh is the only networked Git command in the catalog.
    } else if (!readOnly.has(subcommand)) {
      fail("RUNNER_PROHIBITED_COMMAND", "Git mutation is not allowed in a TUW runner", { argv });
    }
  }
  if (executable === "npm") {
    if (["publish", "version", "dist-tag"].includes(lower[1])) authorizeExternal();
    if (lower[1] === "run" && /(?:release|deploy|notari|sign|publish)/.test(lower[2] ?? "")) authorizeExternal();
  }
  const script = lower.find((arg) => arg.endsWith(".mjs") || arg.endsWith(".js")) ?? "";
  if (/(?:release|deploy|notari|sign|backup-runtime-stores-to-s3)/.test(script)) authorizeExternal();
  if (/(?:run-central-ledger-cutover|run-dms-provider)/.test(script)) {
    const mode = flagValue(lower, "--mode");
    const safeMode = ["preflight-only", "approval-required", "dependency-preflight", "synthetic-import"].includes(mode) || lower.includes("--preflight-only");
    if (!safeMode) authorizeExternal();
  }
  if (lower.some((arg) => /^(?:--production|--staging|--provider-write|--go-live)$/.test(arg))) authorizeExternal();
  return true;
}

function interpolateArg(arg, variables) {
  return arg.replaceAll(/\{\{([A-Z0-9_]+)\}\}/g, (_, name) => {
    const value = variables[name];
    if (typeof value !== "string" || value.length === 0 || /[\0\r\n]/.test(value)) fail("RUNNER_VARIABLE", "manifest variable is missing or unsafe", { name });
    return value;
  });
}

function selectCommands(row, variant) {
  if (Array.isArray(row.commands)) return row.commands;
  if (!variant || !Array.isArray(row.commands?.[variant])) fail("RUNNER_VARIANT", "conditional recipe requires an explicit closed variant", { variant });
  return row.commands[variant];
}

function resolveExecutable(command) {
  if (command === "node") return process.execPath;
  return command;
}

function safeOutputDirectory(outputDir, checkout) {
  if (!isAbsolute(outputDir)) fail("RUNNER_OUTPUT_PATH", "raw output directory must be absolute");
  const full = resolve(outputDir);
  const rel = relative(realpathSync(checkout), full);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) fail("RUNNER_OUTPUT_PATH", "raw output must remain outside the Git checkout");
  mkdirSync(full, { recursive: true, mode: 0o700 });
  return full;
}

function containsSecret(output) {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]+=*|\b(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|cookie|secret|private[_-]?key)\s*[:=]\s*\S+/i.test(output);
}

export async function runIsolatedCommand({ argv, cwd, env, timeoutMs, maxOutputBytes = 16 * 1024 * 1024 }) {
  const startedAt = new Date().toISOString();
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(resolveExecutable(argv[0]), argv.slice(1), {
      cwd,
      env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    let size = 0;
    let timedOut = false;
    const append = (chunk) => {
      size += chunk.length;
      if (size > maxOutputBytes) {
        try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
        rejectPromise(new RuntimeSafetyRunnerError("RUNNER_OUTPUT_LIMIT", "command output exceeded the safe limit"));
        return;
      }
      chunks.push(chunk);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", (error) => rejectPromise(new RuntimeSafetyRunnerError("RUNNER_SPAWN", error.message)));
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
    }, timeoutMs);
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        rejectPromise(new RuntimeSafetyRunnerError("RUNNER_TIMEOUT", "command exceeded its exact timeout", { timeout_ms: timeoutMs }));
        return;
      }
      const output = Buffer.concat(chunks);
      resolvePromise({ started_at: startedAt, finished_at: new Date().toISOString(), exit_code: exitCode ?? 1, signal, output });
    });
  });
}

export async function runRuntimeSafetyTuw({
  row,
  checkout,
  targetSourceSha,
  targetTree,
  toolchainSha,
  dependencyReceipt,
  outputDir,
  variables = {},
  injectedEnv = {},
  variant,
  profile = "source-local",
  requiredPostgres = false,
  allowGitFetch = false,
  externalAuthorized = false,
  userInstructionSha256,
}) {
  const inspection = inspectRuntimeSafetyCheckout({ repo: checkout, targetSourceSha, targetTree, requireNoNodeModules: false });
  if (!dependencyReceipt || dependencyReceipt.target_source_sha !== inspection.target_source_sha || dependencyReceipt.target_tree !== inspection.target_tree || dependencyReceipt.lockfile_sha256 !== inspection.lockfile_sha256) {
    fail("RUNNER_DEPENDENCY_RECEIPT", "dependency receipt does not bind the exact checkout and lockfile");
  }
  const rawRoot = safeOutputDirectory(outputDir, checkout);
  const commands = selectCommands(row, variant).map((argv) => argv.map((arg) => interpolateArg(arg, variables)));
  const allowedInjected = new Set(["LAWOS_TEST_POSTGRES_URL", "LAWOS_APPROVAL_TRUST_REGISTRY_SHA256"]);
  for (const [key, value] of Object.entries(injectedEnv)) {
    if (!allowedInjected.has(key) || typeof value !== "string" || /[\0\r\n]/.test(value)) fail("RUNNER_ENV", "injected environment key or value is not allowed", { key });
  }
  const env = {
    ...row.env,
    PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
    ...injectedEnv,
  };
  const startedAt = new Date().toISOString();
  const evidenceCommands = [];
  const results = [];
  const combined = [];
  for (const [index, argv] of commands.entries()) {
    validateRuntimeSafetyCommand(argv, { tuwId: row.tuw_id, allowGitFetch, externalAuthorized, userInstructionSha256 });
    const resultSlice = commands.length === 1 ? `isolated:${row.tuw_id}:all` : `isolated:${row.tuw_id}:command-${index + 1}`;
    const result = await runIsolatedCommand({ argv, cwd: checkout, env, timeoutMs: row.timeout_ms });
    if (containsSecret(result.output.toString("utf8"))) fail("RUNNER_SECRET_OUTPUT", "command output contained secret-like material", { ordinal: index + 1 });
    if (requiredPostgres && /#\s*SKIP|\bskipped?\s*[:=]?\s*[1-9]\d*/i.test(result.output.toString("utf8"))) fail("RUNNER_POSTGRES_SKIPPED", "required PostgreSQL coverage was skipped", { ordinal: index + 1 });
    const outputPath = join(rawRoot, `${row.tuw_id}-command-${index + 1}.log`);
    writeFileSync(outputPath, result.output, { flag: "wx", mode: 0o600 });
    const outputSha256 = sha256(result.output);
    evidenceCommands.push({
      ordinal: index + 1,
      argv,
      cwd: checkout,
      env_keys: Object.keys(env).sort(),
      parser: row.parser,
      timeout_ms: row.timeout_ms,
      result_slice: resultSlice,
    });
    results.push({
      ordinal: index + 1,
      exit_code: result.exit_code,
      started_at: result.started_at,
      finished_at: result.finished_at,
      output_sha256: outputSha256,
      result_slice: resultSlice,
      passed: result.exit_code === 0,
      skipped: 0,
    });
    combined.push(result.output);
    if (result.exit_code !== 0) fail("RUNNER_COMMAND_FAILED", "isolated command failed", { ordinal: index + 1, exit_code: result.exit_code, output_sha256: outputSha256 });
  }
  const combinedOutput = Buffer.concat(combined);
  const combinedPath = join(rawRoot, `${row.tuw_id}-combined.log`);
  writeFileSync(combinedPath, combinedOutput, { flag: "wx", mode: 0o600 });
  const receipt = {
    schema_version: EVIDENCE_SCHEMA_VERSION,
    tuw_id: row.tuw_id,
    implementation_state: "VERIFIED",
    execution_state: externalAuthorized ? "EXECUTED" : "NOT_APPLICABLE",
    target_source_sha: inspection.target_source_sha,
    target_tree: inspection.target_tree,
    toolchain_sha: toolchainSha,
    profile,
    commands: evidenceCommands,
    results,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    safe_counts: { passed: results.length, failed: 0 },
    skip_count: 0,
    output_path: combinedPath,
    output_sha256: sha256(combinedOutput),
    claims: { verified: true, production_ready: false, release_executed: false, go_live: false },
    external_actions: externalAuthorized ? [{ action: row.selector, environment: "authorized", executed: true, approval_id: "bound-by-run-manifest", user_instruction_sha256: userInstructionSha256 }] : [],
  };
  validateRuntimeSafetyEvidence(receipt, { outputBytes: combinedOutput, allowedOutputRoots: [rawRoot] });
  return Object.freeze(receipt);
}
