import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateAmicOsInternalWindowsStateReceipt,
  validateAmicOsInternalWindowsZeroOneZeroReceipts,
} from "../validate-amic-os-internal-windows-state.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const COLLECTOR = path.join(ROOT, "scripts/collect-amic-os-internal-windows-state.ps1");
const VALIDATOR = path.join(ROOT, "scripts/validate-amic-os-internal-windows-state.mjs");
import { createSyntheticAmicWindowsState } from "./fixtures/amic-internal-windows-state.mjs";
const { trusted, sequence } = createSyntheticAmicWindowsState();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("Windows state receipts prove only exact host state 0 to 1 to 0", () => {
  const values = sequence();
  const result = validateAmicOsInternalWindowsZeroOneZeroReceipts({ ...values, trusted });
  assert.equal(result.verdict, "PASS");
  assert.deepEqual(result.state_sequence, [0, 1, 0]);
  assert.equal(result.host_fingerprint_sha256, "4".repeat(64));
  assert.equal(result.installed_tree_sha256, values.installed.observed.native_installed_tree.content_sha256);
  assert.equal(result.g9_complete_claim, false);
});

test("Windows state receipt validation rejects boundary, lineage, host, and native-tree drift", () => {
  const mutations = [
    ["write boundary", (value) => { value.boundaries.registry_write_count = 1; }],
    ["lineage", (value) => { value.expected.source_tree = "9".repeat(40); }],
    ["host", (value) => { value.host.computer_name = "OTHER-HOST"; }],
    ["native bytes", (value) => { value.observed.native_installed_tree.files[0].bytes += 1; }],
    ["extra field", (value) => { value.observed.raw_user_name = "forbidden"; }],
    ["false check", (value) => { value.checks.shortcut_state_exact = false; }],
  ];
  for (const [label, mutate] of mutations) {
    const value = structuredClone(sequence().installed);
    mutate(value);
    assert.throws(
      () => validateAmicOsInternalWindowsStateReceipt(value, { ...trusted, stage: "installed" }),
      (error) => error?.code === "WINDOWS_STATE_RECEIPT_INVALID",
      label,
    );
  }
  const values = sequence();
  values.postuninstall.host.host_fingerprint_sha256 = "a".repeat(64);
  assert.throws(
    () => validateAmicOsInternalWindowsZeroOneZeroReceipts({ ...values, trusted }),
    /one exact host/u,
  );
});

test("Windows state collector is read-only apart from one create-new evidence receipt", async (t) => {
  const source = await readFile(COLLECTOR, "utf8");
  assert.doesNotMatch(source, /\$(?:Host|HOME|PID|Matches|PSVersionTable|IsWindows|IsLinux|IsMacOS)\s*=/iu,
    "collector locals must not overwrite PowerShell automatic variables");
  assert.match(source, /#requires -Version 7\.2/u);
  assert.match(source, /JWS-GALAXYBOOK/u);
  assert.match(source, /C:\\Program Files\\matter/u);
  assert.match(source, /windows-installed-tree-native-snapshot\.ps1/u);
  assert.match(source, /FileMode\]::CreateNew/u);
  assert.match(source, /evidence_file_write_count = 1/u);
  assert.doesNotMatch(source, /\b(?:Set|New|Remove|Clear|Rename|Move|Copy)-Item(?:Property)?\b/iu);
  assert.doesNotMatch(source, /\bStart-Process\b|\bInvoke-(?:WebRequest|RestMethod)\b/iu);
  assert.doesNotMatch(source, /\b(?:Start|Stop|Restart)-Service\b|\bStop-Process\b/iu);
  assert.doesNotMatch(source, /\breg(?:\.exe)?\s+(?:add|delete)\b|\bmsiexec(?:\.exe)?\b/iu);
  assert.doesNotMatch(source, /Get-Secret|Get-Content[^\n]*(?:registration|roster|contact|photo)/iu);
  assert.doesNotMatch(source, /logged_in_user|user_name|user_profile|preserved_hosted_targets/iu);
  assert.equal((source.match(/\[IO\.File\]::Open\(/gu) ?? []).length, 1);

  const version = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
  });
  if (version.error?.code === "ENOENT") {
    t.skip("PowerShell is unavailable on this test host");
    return;
  }
  assert.equal(version.status, 0, version.stderr);

  const root = await mkdtemp(path.join(tmpdir(), "amic-windows-state-"));
  const output = path.join(root, "preinstall.json");
  const args = [
    "-NoLogo", "-NoProfile", "-File", COLLECTOR,
    "-Stage", "preinstall",
    "-CanaryId", trusted.canaryId,
    "-ExpectedVersion", trusted.version,
    "-ExpectedSourceSha", trusted.sourceSha,
    "-ExpectedSourceTree", trusted.sourceTree,
    "-ExpectedInstallerSha256", trusted.installerSha256,
    "-OutputPath", output,
  ];
  const result = spawnSync("pwsh", args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, process.platform === "win32" ? result.status : 2, result.stderr);
  const summary = JSON.parse(result.stdout);
  const bytes = await readFile(output);
  assert.equal(summary.receipt_sha256, sha256(bytes));
  assert.equal(summary.evidence_file_write_count, 1);
  const value = JSON.parse(bytes);
  if (process.platform !== "win32") {
    assert.equal(value.verdict, "BLOCKED");
    assert.deepEqual(value.safe_error_codes, ["WINDOWS_REQUIRED"]);
    assert.equal(value.host.computer_name, null);
    const validation = validateAmicOsInternalWindowsStateReceipt(value, {
      ...trusted,
      stage: "preinstall",
    });
    assert.equal(validation.valid, true);
    assert.equal(validation.passed, false);
  } else {
    assert.notEqual(value.host, null, `Windows host collection must actually run: ${result.stderr}`);
    assert.equal(value.host.windows, true);
    assert.equal(value.safe_error_codes.includes("WINDOWS_STATE_COLLECTION_FAILED"), false);
  }
  const before = sha256(bytes);
  const overwrite = spawnSync("pwsh", args, { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(overwrite.status, 0);
  assert.equal(sha256(await readFile(output)), before);
});

test("collector task predicate handles non-executable actions without hiding product references", (t) => {
  const result = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", `
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($env:AMIC_COLLECTOR_TEST_PATH, [ref]$null, [ref]$null)
    $pathFunction = $ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-ProductPathReference'}, $true)
    . ([scriptblock]::Create($pathFunction.Extent.Text))
    $taskAssignment = $ast.Find({param($node) $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and $node.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and $node.Left.VariablePath.UserPath -eq 'productTasks'}, $true)
    $InstallRoot = 'C:\\Program Files\\matter'
    $ExecutablePath = "$InstallRoot\\matter.exe"
    function Get-ScheduledTask {
      [pscustomobject]@{ Actions = @([pscustomobject]@{ ClassId = 'unrelated-com-handler' }) }
      [pscustomobject]@{ Actions = @([pscustomobject]@{ Execute = 'C:\\Windows\\System32\\notepad.exe' }) }
      [pscustomobject]@{ Actions = @([pscustomobject]@{ Execute = $ExecutablePath }) }
      [pscustomobject]@{ Actions = @([pscustomobject]@{ Arguments = ('"' + $ExecutablePath + '"') }) }
      [pscustomobject]@{ Actions = @() }
    }
    $observed = @(& ([scriptblock]::Create($taskAssignment.Right.Extent.Text)))
    if ($observed.Count -ne 2) { throw 'Product task predicate count differs' }
  `], { cwd: ROOT, encoding: "utf8", env: { ...process.env, AMIC_COLLECTOR_TEST_PATH: COLLECTOR } });
  if (result.error?.code === "ENOENT") {
    t.skip("PowerShell is unavailable on this test host");
    return;
  }
  assert.equal(result.status, 0, result.stderr);
});

test("Windows zero-one-zero CLI emits only hashes and a bounded claim", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-windows-state-cli-"));
  const values = sequence();
  for (const [stage, value] of Object.entries(values)) {
    await writeFile(path.join(root, `${stage}.json`), `${JSON.stringify(value, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  }
  const result = spawnSync(process.execPath, [
    VALIDATOR,
    "--preinstall", path.join(root, "preinstall.json"),
    "--installed", path.join(root, "installed.json"),
    "--postuninstall", path.join(root, "postuninstall.json"),
    "--canary-id", trusted.canaryId,
    "--version", trusted.version,
    "--source-sha", trusted.sourceSha,
    "--source-tree", trusted.sourceTree,
    "--installer-sha256", trusted.installerSha256,
  ], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.verdict, "PASS");
  assert.equal(output.g9_complete_claim, false);
  assert.deepEqual(Object.keys(output.receipt_sha256), ["preinstall", "installed", "postuninstall"]);
  assert.equal(JSON.stringify(output).includes(root), false);
});
