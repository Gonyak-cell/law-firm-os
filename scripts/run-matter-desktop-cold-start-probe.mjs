#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, chmod, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLD_START_SCHEMA,
  blockedByArtifactReceipt,
  blockedByExecutionGuardReceipt,
  measureColdStartRunsCanonically,
  sanitizedHostFingerprint,
  sourceIdentityFromGit,
  validateFormalPackagedArtifactAuthoritatively,
  validateColdStartReceiptAuthoritatively,
} from "./lib/matter-desktop-cold-start-contract.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  validateDesktopArtifactPrivacyEvidence,
} from "./lib/matter-desktop-artifact-privacy.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const HOME_READY_SELECTOR = "[data-home-dashboard-shell=\"true\"]";

function usage() {
  return [
    "Usage:",
    "  node scripts/run-matter-desktop-cold-start-probe.mjs --execute --artifact-manifest <path> --artifact-path <path> --expected-source-sha <40-hex> [options]",
    "",
    "Required for execution:",
    "  --execute                         Explicitly allow packaged launches (never the default)",
    "  --artifact-manifest <path>        Exact formal build manifest JSON",
    "  --artifact-path <path>            Exact app bundle/package directory",
    "  --expected-source-sha <40-hex>    SHA the package must match",
    "  --rf13-dist-manifest <path>       Sealed RFD-TUW-018 RF13-DIST PASS manifest",
    "",
    "Optional:",
    "  --renderer-path <path>            Exact renderer directory (otherwise derived from manifest platform)",
    `  Home-ready milestone               Fixed renderer marker ${HOME_READY_SELECTOR}`,
    "  --authority-artifact-id <id>      Indexed RF13 archive artifact ID (default: macos_zip_archive/windows_package_zip)",
    "  --authenticated-session-fixture <path>  Explicit operator-provisioned auth fixture",
    "  --timeout-ms <number>              Per-launch timeout (default: 45000)",
    "  --output <path>                    JSON receipt path (writes only evidence/receipt output)",
    "  --help                             Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") values.help = true;
    else if (token === "--execute") values.execute = true;
    else if (token.startsWith("--")) {
      const key = token.slice(2);
      if (key === "home-ready-selector") throw new Error("Home-ready selector is fixed to the renderer-emitted Home milestone");
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for --${key}`);
      values[key.replaceAll("-", "_")] = value;
      index += 1;
    } else {
      throw new Error(`unexpected argument: ${token}`);
    }
  }
  return values;
}

function absoluteInput(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const resolved = path.resolve(REPO_ROOT, value);
  assert.equal(path.isAbsolute(resolved), true, `${label} must resolve to an absolute path`);
  return resolved;
}

function safeErrorText(error, privatePaths = []) {
  let text = String(error?.message ?? error)
    .replaceAll(REPO_ROOT, "<repo>")
    .replaceAll(process.env.HOME ?? "", "<home>")
    .replaceAll(/\/private\/tmp\/[^\s)]+/gu, "<isolated-path>");
  for (const privatePath of privatePaths) {
    if (privatePath) text = text.replaceAll(privatePath, "<isolated-path>");
  }
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function repoRelativeInput(filePath, label) {
  const relative = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
  if (!relative || relative.startsWith("../") || relative === ".." || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside the repository root`);
  }
  return relative;
}

function sealedRelativeInput(value, label) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) {
    throw new Error(`${label} must be repository-relative`);
  }
  if (value.includes("\\") || path.posix.normalize(value) !== value || value.split("/").includes("..")) {
    throw new Error(`${label} must be a normalized repository-relative path`);
  }
  const absolute = path.resolve(REPO_ROOT, value);
  if (absolute !== REPO_ROOT && !absolute.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error(`${label} must be contained by the repository root`);
  }
  return absolute;
}

function assertFixtureTreeSafe(rootPath) {
  const visit = (currentPath) => {
    const stat = lstatSync(currentPath);
    if (stat.isSymbolicLink()) throw new Error("authenticated session fixture cannot contain symlinks");
    if (!stat.isDirectory()) return;
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      visit(path.join(currentPath, entry.name));
    }
  };
  visit(rootPath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeReceipt(filePath, receipt) {
  if (!filePath) return;
  const resolved = absoluteInput(filePath, "output");
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "w" });
}

function executableForArtifact(artifact) {
  const manifest = artifact.manifest;
  if (manifest.platform === "darwin") return path.join(artifact.artifact.path, "Contents", "MacOS", "matter");
  return path.join(artifact.artifact.path, "matter.exe");
}

function userFacingExitCode(status) {
  return status === "PASS" ? 0 : 2;
}

export function isBenignPlaywrightHandshakeLine(value) {
  const match = String(value).match(/^(Debugger|DevTools) listening on (ws:\/\/[^\s]+)$/u);
  if (!match) return false;
  const endpointSyntax = match[2].match(/^ws:\/\/(?:127\.0\.0\.1|\[::1\]):([0-9]+)(\/[^?#]*)$/u);
  if (!endpointSyntax) return false;
  if (endpointSyntax[1].length > 1 && endpointSyntax[1].startsWith("0")) return false;
  let endpoint;
  try {
    endpoint = new URL(match[2]);
  } catch {
    return false;
  }
  if (endpoint.protocol !== "ws:") return false;
  if (!(endpoint.hostname === "127.0.0.1" || endpoint.hostname === "[::1]")) return false;
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return false;
  const port = Number(endpoint.port);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return false;
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  if (match[1] === "Debugger") {
    return new RegExp(`^/${uuid}$`, "iu").test(endpoint.pathname);
  }
  return new RegExp(`^/devtools/browser/${uuid}$`, "iu").test(endpoint.pathname);
}

function createPlaywrightHandshakeClassifier() {
  let debuggerEndpoint = null;
  return (value) => {
    const line = String(value);
    if (isBenignPlaywrightHandshakeLine(line)) {
      const debuggerMatch = line.match(/^Debugger listening on (ws:\/\/[^\s]+)$/u);
      if (debuggerMatch) {
        if (debuggerEndpoint !== null && debuggerEndpoint !== debuggerMatch[1]) return false;
        debuggerEndpoint = debuggerMatch[1];
        return true;
      }
      return debuggerEndpoint !== null;
    }
    if (debuggerEndpoint === null) return false;
    if (line === "Debugger attached."
      || line === "Waiting for the debugger to disconnect..."
      || line === "For help, see: https://nodejs.org/learn/getting-started/debugging"
      || line === "For help, see: https://nodejs.org/en/docs/inspector") return true;
    const endingMatch = line.match(/^Debugger ending on (ws:\/\/[^\s]+)$/u);
    return endingMatch?.[1] === debuggerEndpoint;
  };
}

export function parseLaunchTelemetry(startupLog) {
  const lines = String(startupLog ?? "").split(/\r?\n/u).filter(Boolean);
  const parsedLines = lines.map((line) => { try { return JSON.parse(line); } catch { return null; } });
  const errorCount = lines.reduce((count, line, index) => {
    const parsed = parsedLines[index];
    if (parsed?.kind === "child_stderr") {
      const benign = parsed.error === false
        && parsed.protocol === "playwright_handshake"
        && Number.isInteger(parsed.line_count)
        && parsed.line_count > 0
        && parsed.benign_line_count === parsed.line_count;
      return count + (benign ? 0 : 1);
    }
    if (parsed?.kind === "child_error" || parsed?.error === true) return count + 1;
    if (parsed) return count;
    return count + (isBenignPlaywrightHandshakeLine(line) ? 0 : 1);
  }, 0);
  const childSpawnLine = parsedLines.find((entry) => entry?.kind === "child_spawn" && typeof entry.at === "string");
  return Object.freeze({
    line_count: lines.length,
    error_count: errorCount,
    child_spawn_at: childSpawnLine?.at ?? null,
    child_exit_observed: parsedLines.some((entry) => entry?.kind === "child_exit"),
  });
}

export function countHistoricalPageFailures(requests) {
  if (!Array.isArray(requests)) return 0;
  return requests.reduce((count, request) => {
    try {
      return count + (typeof request?.failure === "function" && request.failure() ? 1 : 0);
    } catch {
      return count + 1;
    }
  }, 0);
}

async function withObserverTimeout(promise, timeoutMs, label) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export async function createLaunchWrapper({ realExecutablePath, startupLogPath }) {
  const wrapperRoot = path.join(path.dirname(startupLogPath), "launcher");
  await mkdir(wrapperRoot, { recursive: true });
  const wrapperScriptPath = path.join(wrapperRoot, "launch-child.mjs");
  const handshakeClassifierSource = isBenignPlaywrightHandshakeLine.toString();
  const handshakeTranscriptClassifierSource = createPlaywrightHandshakeClassifier.toString();
  const wrapperScript = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { spawn } from "node:child_process";

const executable = process.env.MATTER_COLD_START_REAL_EXECUTABLE;
const telemetryPath = process.env.MATTER_COLD_START_WRAPPER_LOG;
function record(kind, value = {}) {
  try {
    appendFileSync(telemetryPath, JSON.stringify({ kind, at: new Date().toISOString(), ...value }) + "\\n");
  } catch {}
}
${handshakeClassifierSource}
${handshakeTranscriptClassifierSource}
const classifyPlaywrightHandshakeLine = createPlaywrightHandshakeClassifier();
function recordStderrLines(lines) {
  const meaningfulLines = lines.filter((line) => line.length > 0);
  if (meaningfulLines.length === 0) return;
  const benignLineCount = meaningfulLines.filter(classifyPlaywrightHandshakeLine).length;
  const error = benignLineCount !== meaningfulLines.length;
  record("child_stderr", {
    bytes: Buffer.byteLength(meaningfulLines.join("\\n"), "utf8"),
    line_count: meaningfulLines.length,
    benign_line_count: benignLineCount,
    protocol: error ? null : "playwright_handshake",
    error,
    ...(process.env.MATTER_COLD_START_DEBUG_TELEMETRY === "1" ? { lines: meaningfulLines } : {}),
  });
}
let stderrBuffer = "";
function forwardStdout(chunk) {
  process.stdout.write(chunk);
}
function forwardStderr(chunk) {
  const text = String(chunk);
  stderrBuffer += text;
  const lines = stderrBuffer.split(/\\r?\\n/u);
  stderrBuffer = lines.pop() ?? "";
  if (lines.length > 0) recordStderrLines(lines);
  process.stderr.write(chunk);
}
function flushStderr() {
  if (stderrBuffer.length === 0) return;
  recordStderrLines([stderrBuffer]);
  stderrBuffer = "";
}
record("child_spawn");
const child = spawn(executable, process.argv.slice(2), { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", forwardStdout);
child.stderr.on("data", forwardStderr);
child.stderr.on("end", flushStderr);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => { try { child.kill(signal); } catch {} });
child.on("error", (error) => { record("child_error", { error: true }); process.exitCode = 1; });
child.on("exit", (code, signal) => { flushStderr(); record("child_exit", { code, signal }); process.exit(code ?? 1); });
`;
  await writeFile(wrapperScriptPath, wrapperScript, { encoding: "utf8" });
  await chmod(wrapperScriptPath, 0o755);
  let executablePath = wrapperScriptPath;
  if (process.platform === "win32") {
    executablePath = path.join(wrapperRoot, "launch-child.cmd");
    await writeFile(executablePath, `@echo off\r\n"%MATTER_COLD_START_NODE%" "%MATTER_COLD_START_WRAPPER_SCRIPT%" %*\r\n`, { encoding: "utf8" });
  }
  return { executablePath, wrapperRoot, wrapperScriptPath, realExecutablePath };
}

export async function launchElectronProcess({
  artifact,
  user_data_path: userDataPath,
  startup_log_path: startupLogPath,
  host_fingerprint: hostFingerprint,
  timeoutMs = 45_000,
} = {}) {
  let processStartAt = null;
  let app = null;
  let page = null;
  let childProcess = null;
  let rendererReadyAt = null;
  let homeReadyAt = null;
  let errorCount = 0;
  let consoleCount = 0;
  let consoleErrorCount = 0;
  let failureText = null;
  let childExit = null;
  let childExitPromise = null;
  let mainErrorCount = 0;
  let startupLogErrorCount = 0;
  let historicalTelemetryCoverageIncomplete = false;
  let wrapperRoot = null;
  const observedPages = new WeakSet();
  const historicalTelemetryObservedPages = new WeakSet();
  const pendingPageTelemetry = new Set();
  const observePage = (candidatePage) => {
    if (!candidatePage || observedPages.has(candidatePage)) return;
    observedPages.add(candidatePage);
    candidatePage.on("console", (message) => {
      consoleCount += 1;
      if (message.type() === "error") consoleErrorCount += 1;
    });
    candidatePage.on("pageerror", () => { errorCount += 1; });
    candidatePage.on("requestfailed", () => { errorCount += 1; });
  };
  const observePageHistory = async (candidatePage) => {
    if (!candidatePage || historicalTelemetryObservedPages.has(candidatePage)) return;
    historicalTelemetryObservedPages.add(candidatePage);
    try {
      const messages = await candidatePage.consoleMessages?.() ?? [];
      consoleCount += messages.length;
      consoleErrorCount += messages.filter((message) => message.type?.() === "error").length;
      const errors = await candidatePage.pageErrors?.() ?? [];
      errorCount += errors.length;
      if (typeof candidatePage.requests !== "function") {
        historicalTelemetryCoverageIncomplete = true;
        failureText = failureText ?? "historical page request telemetry is unavailable";
      } else {
        const requests = await candidatePage.requests();
        errorCount += countHistoricalPageFailures(requests);
      }
    } catch (error) {
      errorCount += 1;
      failureText = failureText ?? safeErrorText(error, [userDataPath, startupLogPath]);
    }
  };
  const schedulePageHistory = (candidatePage) => {
    const pending = observePageHistory(candidatePage);
    pendingPageTelemetry.add(pending);
    pending.finally(() => pendingPageTelemetry.delete(pending)).catch(() => {});
  };
  try {
    const { _electron: electron } = await import("playwright");
    const executablePath = executableForArtifact(artifact);
    if (!existsSync(executablePath)) throw new Error(`formal executable is missing: ${executablePath}`);
    const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => (
      !name.startsWith("LAWOS_")
      && !/password|secret|token|credential|private/iu.test(name)
    )));
    processStartAt = new Date().toISOString();
    if (typeof startupLogPath !== "string" || !path.isAbsolute(startupLogPath)) {
      throw new Error("isolated launch telemetry log path is required");
    }
    await mkdir(path.dirname(startupLogPath), { recursive: true });
    const wrapper = await createLaunchWrapper({ realExecutablePath: executablePath, startupLogPath });
    wrapperRoot = wrapper.wrapperRoot;
    app = await electron.launch({
      executablePath: wrapper.executablePath,
      args: ["--disable-gpu", "--enable-logging=stderr"],
      env: {
        ...inheritedEnv,
        ELECTRON_ENABLE_LOGGING: "1",
        MATTER_COLD_START_REAL_EXECUTABLE: executablePath,
        MATTER_COLD_START_WRAPPER_LOG: startupLogPath,
        MATTER_COLD_START_WRAPPER_SCRIPT: wrapper.wrapperScriptPath,
        MATTER_COLD_START_NODE: process.execPath,
        MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
        MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
      },
      timeout: timeoutMs,
    });
    childProcess = typeof app.process === "function" ? app.process() : null;
    if (childProcess?.once) {
      childExitPromise = new Promise((resolve) => {
        childProcess.once("exit", (code, signal) => {
          childExit = { code, signal };
          resolve(childExit);
        });
      });
      // The wrapper records child stderr from spawn. electron.launch resolves
      // only after the opening debugger handshakes, so attaching here would
      // observe an incomplete tail and count Playwright's closing handshake a
      // second time.
      childProcess.on?.("error", (error) => {
        mainErrorCount += 1;
        failureText = failureText ?? safeErrorText(error, [userDataPath, startupLogPath]);
      });
    }
    app.on?.("console", (message) => {
      consoleCount += 1;
      if (message?.type?.() === "error") consoleErrorCount += 1;
    });
    // Playwright emits already-created windows while electron.launch() is
    // resolving. Attach to both future and existing windows before waiting on
    // firstWindow so the first observable renderer boundary is covered.
    app.on?.("window", (candidatePage) => {
      observePage(candidatePage);
      schedulePageHistory(candidatePage);
    });
    for (const existingPage of app.windows?.() ?? []) {
      observePage(existingPage);
      await observePageHistory(existingPage);
    }
    page = await app.firstWindow({ timeout: timeoutMs });
    observePage(page);
    await observePageHistory(page);
    await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs });
    rendererReadyAt = new Date().toISOString();
    await page.waitForSelector(HOME_READY_SELECTOR, { state: "visible", timeout: timeoutMs });
    homeReadyAt = new Date().toISOString();
  } catch (error) {
    errorCount += 1;
    failureText = safeErrorText(error, [userDataPath, startupLogPath]);
  } finally {
    if (app) {
      const cleanupTimeoutMs = Math.min(timeoutMs, 5_000);
      try {
        await withObserverTimeout(
          Promise.allSettled([...pendingPageTelemetry]),
          cleanupTimeoutMs,
          "historical page telemetry settlement",
        );
      } catch (error) {
        errorCount += 1;
        failureText = failureText ?? safeErrorText(error, [userDataPath, startupLogPath]);
      }
      try {
        await withObserverTimeout(app.close(), cleanupTimeoutMs, "Electron application close");
      } catch (error) {
        errorCount += 1;
        failureText = failureText ?? safeErrorText(error, [userDataPath, startupLogPath]);
        try {
          childProcess?.kill?.("SIGTERM");
        } catch {}
      }
    }
    if (childExitPromise && !childExit) {
      await Promise.race([
        childExitPromise,
        new Promise((resolve) => setTimeout(resolve, 2_000)),
      ]);
      if (!childExit) {
        mainErrorCount += 1;
        failureText = failureText ?? "packaged child process did not exit after close";
        try {
          childProcess?.kill?.("SIGKILL");
        } catch {}
      }
    }
    if (startupLogPath && existsSync(startupLogPath)) {
      try {
        const startupLog = readFileSync(startupLogPath, "utf8");
        if (process.env.MATTER_COLD_START_DEBUG_TELEMETRY === "1") process.stderr.write(`COLD_START_DEBUG\n${startupLog}\n`);
        const telemetry = parseLaunchTelemetry(startupLog);
        startupLogErrorCount = telemetry.error_count;
        if (telemetry.child_spawn_at) processStartAt = telemetry.child_spawn_at;
      } catch {
        mainErrorCount += 1;
        failureText = failureText ?? "launch telemetry log could not be read";
      }
    } else {
      mainErrorCount += 1;
      failureText = failureText ?? "launch telemetry log was not produced";
    }
    if (wrapperRoot) {
      try {
        await rm(wrapperRoot, { recursive: true, force: true });
      } catch {
        mainErrorCount += 1;
        failureText = failureText ?? "launch telemetry wrapper cleanup failed";
      }
    }
  }
  const endAt = new Date().toISOString();
  const processExitCode = Number.isInteger(childExit?.code)
    ? childExit.code
    : Number.isInteger(childProcess?.exitCode) ? childProcess.exitCode : null;
  const processSignal = childExit?.signal ?? childProcess?.signalCode ?? null;
  if (!Number.isInteger(processExitCode)) {
    mainErrorCount += 1;
    failureText = failureText ?? "packaged child process exit was not observed";
  }
  const effectiveStartAt = processStartAt ?? endAt;
  const durationEndAt = homeReadyAt ?? endAt;
  const durationMs = Math.max(0, Date.parse(durationEndAt) - Date.parse(effectiveStartAt));
  return {
    process_start_at: effectiveStartAt,
    renderer_ready_at: rendererReadyAt ?? effectiveStartAt,
    home_ready_at: homeReadyAt,
    duration_ms: durationMs,
    exit_code: processExitCode ?? 1,
    signal: processSignal,
    error_count: errorCount + mainErrorCount + startupLogErrorCount + (historicalTelemetryCoverageIncomplete ? 1 : 0),
    console_count: consoleCount,
    console_error_count: consoleErrorCount,
    home_ready_observed: homeReadyAt !== null,
    host_fingerprint: hostFingerprint,
    ...(failureText ? { error: failureText } : {}),
  };
}

function failedClosedReceipt({ artifactManifestPath, artifactPath, rf13DistManifestPath = null, expectedSourceSha, blockers, hostFingerprint, failedRun = null }) {
  return {
    schema_version: COLD_START_SCHEMA,
    generated_at: new Date().toISOString(),
    status: "FAILED_CLOSED",
    blockers: [...new Set(blockers.map((value) => String(value)))],
    required_run_count: 5,
    run_count: failedRun ? 1 : 0,
    percentile_method: "linear_interpolation_(n-1)",
    median_ms: null,
    p95_ms: null,
    artifact: null,
    renderer: null,
    source: null,
    host_fingerprint: hostFingerprint,
    user_data_root: null,
    runs: failedRun ? [failedRun] : [],
    inputs: {
      artifact_manifest_path: artifactManifestPath,
      artifact_path: artifactPath,
      rf13_dist_manifest_path: rf13DistManifestPath,
      expected_source_sha: expectedSourceSha ?? null,
    },
    claims: {
      formal_artifact_baseline: false,
      historical_rf13_internal_artifact_used: false,
      production_go_live: false,
      public_release: false,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }
  const artifactManifestPath = absoluteInput(args.artifact_manifest ?? args.manifest, "artifact manifest");
  const artifactPath = absoluteInput(args.artifact_path ?? args.artifact, "artifact");
  const rendererPath = absoluteInput(args.renderer_path, "renderer");
  const rf13DistManifestPath = absoluteInput(args.rf13_dist_manifest ?? args.authority_manifest, "RF13-DIST manifest");
  let authenticatedSessionFixturePath = absoluteInput(args.authenticated_session_fixture ?? args.session_fixture, "authenticated session fixture");
  const expectedSourceSha = args.expected_source_sha ?? args.source_sha ?? process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA ?? null;
  const outputPath = args.output ?? args.receipt ?? null;
  const hostFingerprint = sanitizedHostFingerprint();

  const missingInputs = [];
  if (!artifactManifestPath) missingInputs.push("exact --artifact-manifest input is required");
  if (!artifactPath) missingInputs.push("exact --artifact-path input is required");
  if (!expectedSourceSha) missingInputs.push("exact --expected-source-sha input is required");
  if (args.execute === true && !rf13DistManifestPath) missingInputs.push("sealed --rf13-dist-manifest input is required for execution");
  if (missingInputs.length > 0) {
    missingInputs.push("no exact-source formal packaged artifact/manifest is available; historical RF13 internal or QA_ONLY artifacts are not a baseline");
  }
  if (missingInputs.length > 0) {
    const receipt = blockedByArtifactReceipt({
      blockers: missingInputs,
      artifactManifestPath,
      artifactPath,
      rf13DistManifestPath,
      expectedSourceSha,
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }

  let artifactManifest;
  try {
    artifactManifest = await readJson(artifactManifestPath);
  } catch (error) {
    const receipt = blockedByArtifactReceipt({
      blockers: [`cannot read exact artifact manifest: ${safeErrorText(error)}`],
      artifactManifestPath,
      artifactPath,
      rf13DistManifestPath,
      expectedSourceSha,
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }

  let sourceState;
  try {
    sourceState = sourceIdentityFromGit(REPO_ROOT);
  } catch (error) {
    const receipt = blockedByArtifactReceipt({
      blockers: [`cannot establish exact source identity: ${safeErrorText(error)}`],
      artifactManifestPath,
      artifactPath,
      rf13DistManifestPath,
      expectedSourceSha,
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }

  let authority = null;
  let privacyValidation = null;
  let privacyArtifact = null;
  if (args.execute === true) {
    try {
      if (!rf13DistManifestPath || !existsSync(rf13DistManifestPath) || lstatSync(rf13DistManifestPath).isSymbolicLink()) {
        throw new Error("sealed RF13-DIST manifest is missing or is a symlink");
      }
      const rf13Body = await readFile(rf13DistManifestPath);
      const rf13Manifest = JSON.parse(rf13Body.toString("utf8"));
      const releaseIndexPath = rf13Manifest.release?.release_index?.path;
      const artifactId = args.authority_artifact_id
        ?? (artifactManifest.platform === "darwin" ? "macos_zip_archive" : "windows_package_zip");
      const indexedArtifact = Array.isArray(rf13Manifest.artifacts)
        ? rf13Manifest.artifacts.find(({ id }) => id === artifactId)
        : null;
      const privacyMember = rf13Manifest.gates?.privacy?.members?.find(({ artifact_id: selectedId }) => selectedId === artifactId);
      const privacyReceiptPath = privacyMember?.receipt?.path;
      if (!releaseIndexPath || !indexedArtifact || !privacyReceiptPath) {
        throw new Error("sealed RF13-DIST manifest lacks the selected archive artifact or privacy receipt");
      }
      const absoluteIndexPath = sealedRelativeInput(releaseIndexPath, "RF13-DIST release index path");
      if (!existsSync(absoluteIndexPath) || lstatSync(absoluteIndexPath).isSymbolicLink()) throw new Error("sealed RF13-DIST release index is missing or is a symlink");
      const absolutePrivacyReceiptPath = sealedRelativeInput(privacyReceiptPath, "RF13 privacy receipt path");
      if (!existsSync(absolutePrivacyReceiptPath) || lstatSync(absolutePrivacyReceiptPath).isSymbolicLink()) throw new Error("sealed RF13-DIST privacy receipt is missing or is a symlink");
      const privacyReceiptBody = await readFile(absolutePrivacyReceiptPath);
      const privacyReceipt = JSON.parse(privacyReceiptBody.toString("utf8"));
      if (typeof privacyReceipt.member_manifest_path !== "string" || typeof privacyReceipt.member_manifest_sha256 !== "string") {
        throw new Error("sealed RF13-DIST privacy receipt lacks the authenticated member manifest");
      }
      privacyArtifact = indexedArtifact;
      const absoluteArchivePath = sealedRelativeInput(indexedArtifact.path, "RF13 archive artifact path");
      const privacyCorpus = await buildDesktopArtifactPrivacyCorpus({
        repoRoot: REPO_ROOT,
        env: process.env,
      });
      privacyValidation = await validateDesktopArtifactPrivacyEvidence({
        receipt: privacyReceipt,
        artifact: indexedArtifact,
        artifactPath: absoluteArchivePath,
        artifactRoot: rf13Manifest.release.artifact_root,
        expectedRootName: artifactManifest.platform === "darwin"
          ? "matter.app"
          : path.basename(absoluteArchivePath, path.extname(absoluteArchivePath)),
        buildManifest: artifactManifest,
        corpus: privacyCorpus,
        repoRoot: REPO_ROOT,
        displayBase: REPO_ROOT,
      });
      authority = {
        rf13_dist_manifest_path: repoRelativeInput(rf13DistManifestPath, "RF13-DIST manifest"),
        rf13_dist_manifest_sha256: sha256(rf13Body),
        release_index_path: releaseIndexPath,
        release_index_sha256: sha256(await readFile(absoluteIndexPath)),
        artifact_id: artifactId,
        indexed_artifact_sha256: indexedArtifact.sha256,
        privacy_receipt_path: repoRelativeInput(absolutePrivacyReceiptPath, "RF13 privacy receipt"),
        privacy_receipt_sha256: sha256(privacyReceiptBody),
        member_manifest_path: privacyReceipt.member_manifest_path,
        member_manifest_sha256: privacyReceipt.member_manifest_sha256,
      };
    } catch (error) {
      const receipt = blockedByArtifactReceipt({
        blockers: [`sealed RF13-DIST authority is invalid: ${safeErrorText(error)}`],
        artifactManifestPath,
        artifactPath,
        rf13DistManifestPath,
        expectedSourceSha,
      });
      await writeReceipt(outputPath, receipt);
      console.log(JSON.stringify(receipt, null, 2));
      return userFacingExitCode(receipt.status);
    }
  }

  let artifact;
  try {
    artifact = await validateFormalPackagedArtifactAuthoritatively({
      artifactManifest,
      artifactManifestPath,
      artifactPath,
      rendererPath,
      expectedSourceSha,
      sourceState,
      hostPlatform: process.platform,
      requireHostPlatform: true,
      authority,
      repoRoot: REPO_ROOT,
      privacyValidation,
      privacyArtifact,
    });
  } catch (error) {
    const receipt = blockedByArtifactReceipt({
      blockers: [safeErrorText(error)],
      artifactManifestPath,
      artifactPath,
      rf13DistManifestPath,
      expectedSourceSha,
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }

  if (args.execute !== true) {
    const receipt = blockedByExecutionGuardReceipt({ artifact });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }

  if (!authenticatedSessionFixturePath) {
    const receipt = blockedByExecutionGuardReceipt({
      blockers: ["an explicit authenticated session fixture is required before launching isolated empty userData"],
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }
  if (!existsSync(authenticatedSessionFixturePath)
    || lstatSync(authenticatedSessionFixturePath).isSymbolicLink()
    || !lstatSync(authenticatedSessionFixturePath).isDirectory()) {
    const receipt = blockedByExecutionGuardReceipt({
      blockers: ["authenticated session fixture is missing or is a symlink"],
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }
  try {
    assertFixtureTreeSafe(authenticatedSessionFixturePath);
    const secureSessionStorePath = path.join(authenticatedSessionFixturePath, "secure-session-store.json");
    if (!existsSync(secureSessionStorePath) || !lstatSync(secureSessionStorePath).isFile()) {
      throw new Error("authenticated session fixture must contain secure-session-store.json");
    }
    authenticatedSessionFixturePath = realpathSync(authenticatedSessionFixturePath);
  } catch (error) {
    const receipt = blockedByExecutionGuardReceipt({ blockers: [safeErrorText(error)] });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }

  const timeoutMs = args.timeout_ms ? Number(args.timeout_ms) : 45_000;
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0, "--timeout-ms must be positive");
  try {
    const measurement = await measureColdStartRunsCanonically({
      artifact,
      authenticatedSessionFixturePath,
      timeoutMs,
    });
    await validateColdStartReceiptAuthoritatively(measurement.receipt, {
      repoRoot: REPO_ROOT,
      measurementValidation: measurement.measurement_validation,
      receiptBytes: Buffer.from(measurement.serialized_receipt, "utf8"),
    });
    await writeReceipt(outputPath, measurement.receipt);
    console.log(JSON.stringify(measurement.receipt, null, 2));
    return userFacingExitCode(measurement.receipt.status);
  } catch (error) {
    const receipt = failedClosedReceipt({
      artifactManifestPath,
      artifactPath,
      rf13DistManifestPath,
      expectedSourceSha,
      hostFingerprint,
      blockers: [safeErrorText(error), "cold-start probe did not produce five successful Home-ready runs"],
    });
    await writeReceipt(outputPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return userFacingExitCode(receipt.status);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
    .then((exitCode) => { process.exitCode = exitCode; })
    .catch((error) => {
      console.error(safeErrorText(error));
      process.exitCode = 2;
    });
}
