import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/run-outlook-classic-windows-toolchain-preflight.ps1");

test("Classic Outlook Windows toolchain preflight is read-only and fail-closed", async (t) => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /#requires -Version 7\.2/u);
  assert.match(source, /Get-Command 'dotnet'/u);
  assert.match(source, /NET Framework Setup\\NDP\\v4\\Full/u);
  assert.match(source, /ClickToRun\\Configuration/u);
  assert.match(source, /OUTLOOK\.EXE/u);
  assert.doesNotMatch(source, /VSTO Runtime|signtool|Visual Studio|MSBuild/iu);
  assert.doesNotMatch(
    source,
    /\b(?:Set|New|Remove|Clear|Rename|Move|Copy)-Item(?:Property)?\b|\bStart-Process\b|\bInvoke-(?:WebRequest|RestMethod)\b|\b(?:Start|Stop|Restart)-Service\b|\breg(?:\.exe)?\s+(?:add|delete)\b/iu,
  );

  const pwshVersion = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
  });
  if (pwshVersion.error?.code === "ENOENT") {
    t.skip("PowerShell is unavailable on this test host");
    return;
  }
  assert.equal(pwshVersion.status, 0, pwshVersion.stderr);

  const result = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-File", scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.ok([0, 2].includes(result.status), result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.schema_version, "law-firm-os.outlook-classic-windows-toolchain-preflight.v2");
  assert.equal(receipt.boundaries.read_only, true);
  assert.equal(receipt.boundaries.registry_write_count, 0);
  assert.equal(receipt.boundaries.mutation_process_start_count, 0);
  assert.ok(Number.isSafeInteger(receipt.boundaries.read_only_discovery_process_count));
  assert.ok(receipt.boundaries.read_only_discovery_process_count >= 0);
  assert.equal(receipt.boundaries.network_request_count, 0);
  assert.equal(receipt.boundaries.outlook_launch_count, 0);
  assert.equal(receipt.boundaries.custom_signature_system_required, false);
  assert.equal(receipt.boundaries.vsto_required, false);
  assert.equal(receipt.boundaries.m365_assignment_checked, false);
  assert.equal(receipt.boundaries.production_ready_claim, false);
  assert.equal(JSON.stringify(receipt).match(/(?:hostname|machine_name|user_name|user_profile|installation_path)/giu), null);

  if (process.platform === "win32") {
    assert.equal(receipt.checks.windows, true);
    assert.equal(receipt.verdict, result.status === 0 ? "PASS" : "BLOCKED");
    assert.equal(receipt.build_toolchain_ready && receipt.classic_outlook_host_ready, result.status === 0);
  } else {
    assert.equal(result.status, 2);
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.windows, false);
    assert.equal(receipt.boundaries.read_only_discovery_process_count, 0);
    assert.deepEqual(receipt.safe_error_codes, ["WINDOWS_REQUIRED"]);
  }
});
