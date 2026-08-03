import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  validateFormalPackageLoopbackNativeLauncherCapability,
} from "../lib/formal-package-loopback-launcher.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const MAC_RUNNER = path.join(ROOT, "scripts/run-formal-macos-package-qa.mjs");
const WINDOWS_RUNNER = path.join(ROOT, "scripts/run-formal-windows-package-qa.mjs");
const MAC_LAUNCHER = path.join(ROOT, "scripts/run-formal-macos-package-qa.sh");
const WINDOWS_LAUNCHER = path.join(ROOT, "scripts/run-formal-windows-package-qa.ps1");

function minimalEnvironment(extra = {}) {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    ...extra,
  };
}

test("RFD-TUW-014 direct internal JS runners stop at LAUNCHER_REQUIRED", () => {
  for (const runner of [MAC_RUNNER, WINDOWS_RUNNER]) {
    const result = spawnSync(process.execPath, [runner], {
      cwd: ROOT,
      encoding: "utf8",
      env: minimalEnvironment(),
    });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /"code":"LAUNCHER_REQUIRED"/u);
    assert.doesNotMatch(result.stderr, /formal QA source is dirty|missing QA prerequisite/u);
  }
});

test("RFD-TUW-014 rejects a fabricated OS launcher capability", () => {
  assert.throws(
    () => validateFormalPackageLoopbackNativeLauncherCapability({
      schema_version: "law-firm-os.formal-package-os-launcher-capability.v1",
      platform: "macos",
      role: "native_runner",
      runner_path: MAC_RUNNER,
    }, { platform: "macos" }),
    (error) => error?.code === "LAUNCHER_REQUIRED",
  );
});

test("RFD-TUW-014 rejects a forged one-time attestation without the canonical OS launcher parent", (context) => {
  if (process.platform !== "darwin") return;
  const directory = mkdtempSync(path.join(tmpdir(), "formal-launcher-forgery-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const token = randomUUID();
  const attestationPath = path.join(directory, "attestation.json");
  writeFileSync(attestationPath, `${JSON.stringify({
    schema_version: "law-firm-os.formal-package-os-launcher.v1",
    created_at: new Date().toISOString(),
    token,
    launcher_pid: process.pid,
    launcher_path: realpathSync(MAC_LAUNCHER),
    runner_path: realpathSync(MAC_RUNNER),
    node_path: realpathSync(process.execPath),
    platform: "macos",
  })}\n`);
  chmodSync(attestationPath, 0o600);
  const result = spawnSync(process.execPath, [MAC_RUNNER], {
    cwd: ROOT,
    encoding: "utf8",
    env: minimalEnvironment({
      MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH: attestationPath,
      MATTER_FORMAL_QA_LAUNCH_TOKEN: token,
    }),
  });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /"code":"LAUNCHER_REQUIRED"/u);
  assert.doesNotMatch(result.stderr, /formal QA source is dirty|missing QA prerequisite/u);
});

test("RFD-TUW-014 macOS launcher rejects present-empty and nonempty Node injection variables", () => {
  if (process.platform !== "darwin") return;
  for (const injected of [
    { NODE_OPTIONS: "" },
    { NODE_PATH: "" },
    { NODE_OPTIONS: "--import=file:///does-not-exist/preload.mjs" },
    { NODE_PATH: "/does-not-exist/modules" },
  ]) {
    const result = spawnSync("/bin/zsh", [MAC_LAUNCHER], {
      cwd: ROOT,
      encoding: "utf8",
      env: minimalEnvironment(injected),
    });
    assert.equal(result.status, 2, `${JSON.stringify(injected)}\n${result.stderr}`);
    assert.match(result.stderr, /"code":"LAUNCHER_REQUIRED"/u);
  }
});

test("RFD-TUW-014 preload erasure cannot turn a direct internal runner into a launcher child", (context) => {
  const directory = mkdtempSync(path.join(tmpdir(), "formal-launcher-preload-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const preloadPath = path.join(directory, "erase-node-injection.mjs");
  writeFileSync(preloadPath, [
    "delete process.env.NODE_OPTIONS;",
    "delete process.env.NODE_PATH;",
    "process.execArgv.splice(0, process.execArgv.length);",
    `process.argv[1] = ${JSON.stringify(MAC_RUNNER)};`,
  ].join("\n"));
  const result = spawnSync(process.execPath, [MAC_RUNNER], {
    cwd: ROOT,
    encoding: "utf8",
    env: minimalEnvironment({
      NODE_OPTIONS: `--import=${pathToFileURL(preloadPath).href}`,
    }),
  });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /"code":"LAUNCHER_REQUIRED"/u);
  assert.doesNotMatch(result.stderr, /formal QA source is dirty|missing QA prerequisite/u);
});

test("RFD-TUW-014 Windows launcher rejects injection before invoking one exact Node 22 runner", () => {
  const launcher = readFileSync(WINDOWS_LAUNCHER, "utf8");
  assert.match(launcher, /GetEnvironmentVariable\(\$name, "Process"\) -ne \$null/u);
  assert.match(launcher, /\(& \$nodePath --version\) -notmatch '\^v22\\\.'/u);
  assert.match(launcher, /law-firm-os\.formal-package-os-launcher\.v1/u);
  assert.match(launcher, /MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH/u);
  assert.match(launcher, /MATTER_FORMAL_QA_LAUNCH_TOKEN/u);
  assert.match(launcher, /& \$nodePath \$runnerPath/u);
  assert.doesNotMatch(launcher, /Invoke-Expression|Start-Process/u);
});
