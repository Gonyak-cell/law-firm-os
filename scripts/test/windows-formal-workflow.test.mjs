import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { desktopReleaseChannelConfig } from "../lib/matter-desktop-provenance.mjs";

const workflowPath = fileURLToPath(
  new URL("../../.github/workflows/windows-formal-package-qa.yml", import.meta.url),
);
const desktopPackagePath = fileURLToPath(
  new URL("../../apps/desktop/package.json", import.meta.url),
);
const authenticodeWorkflowPath = fileURLToPath(
  new URL("../../.github/workflows/windows-authenticode-package-qa.yml", import.meta.url),
);
const formalQaPath = fileURLToPath(
  new URL("../run-formal-windows-package-qa.mjs", import.meta.url),
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Windows formal workflow preserves current-version provenance outside the worktree", async () => {
  const [workflow, desktopPackage] = await Promise.all([
    readFile(workflowPath, "utf8"),
    readFile(desktopPackagePath, "utf8").then(JSON.parse),
  ]);
  const artifactStem = `${desktopReleaseChannelConfig("formal").artifactPrefix}-${desktopPackage.version}`;
  const expectedEvidence = [
    `apps\\desktop\\dist\\win\\${artifactStem}-win-build-manifest.json`,
    `apps\\desktop\\dist\\win\\${artifactStem}-win-installer-manifest.json`,
    `apps\\desktop\\dist\\win\\${artifactStem}-win-installer-manifest.json.sig`,
    `apps\\desktop\\dist\\${artifactStem}-win-x64.exe`,
    `apps\\desktop\\dist\\${artifactStem}-win-x64.exe.blockmap`,
    `apps\\desktop\\dist\\win\\${artifactStem}-win32-x64-unsigned.zip`,
  ];
  const expandedWorkflow = workflow.replaceAll("$desktopVersion", desktopPackage.version);

  assert.match(
    workflow,
    /MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH: \$\{\{ runner\.temp \}\}\\matter-desktop-windows-receipt\\windows-build\.md/,
  );
  assert.match(
    workflow,
    /\$desktopVersion = \(Get-Content -Raw "apps\\desktop\\package\.json" \| ConvertFrom-Json\)\.version/,
  );
  for (const expectedPath of expectedEvidence) {
    assert.match(expandedWorkflow, new RegExp(escapeRegExp(expectedPath)));
  }
  assert.match(workflow, /Test-Path -LiteralPath \$path -PathType Leaf/);
  assert.match(
    workflow,
    /"\$\{\{ runner\.temp \}\}\\matter-desktop-windows-receipt\\windows-build\.md"\s*\n\s*\)/,
  );
  assert.match(workflow, /Copy-Item -LiteralPath \$path -Destination "artifacts\\QA-006\\build\\"/);
  assert.match(workflow, /Copy-Item -LiteralPath \$path -Destination "artifacts\\QA-006\\artifacts\\"/);
  assert.match(workflow, /include-hidden-files: true/);
  assert.match(workflow, /^\s+- scripts\/lib\/matter-desktop-authenticode\.mjs$/mu);
  assert.doesNotMatch(workflow, /matter-0\.1\.17-win-(?:build|installer)-manifest\.json/);
  assert.doesNotMatch(
    workflow,
    /Copy-Item "(?:apps\\desktop\\dist\\win|docs\\lazycodex).*?-ErrorAction SilentlyContinue/,
  );
});

test("Windows Authenticode preparation stays manual, protected, pinned, and fail closed before secrets", async () => {
  const workflow = await readFile(authenticodeWorkflowPath, "utf8");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request):/mu);
  assert.match(workflow, /environment: windows-authenticode-pilot/u);
  for (const variable of ["SSL_COM_ESIGNER_CKA_VERSION", "SSL_COM_ESIGNER_CKA_SHA256"]) {
    assert.match(workflow, new RegExp(variable, "u"));
  }
  const sourceGuard = workflow.indexOf("Verify exact source, tree, tenant, app, and unexpired approval");
  const publicGuard = workflow.indexOf("Verify protected public SSL.com configuration before any secret reference");
  const stop = workflow.indexOf("NOT_CONFIGURED_VENDOR_SIGNING");
  const firstSecret = workflow.indexOf("secrets.SSL_COM_ESIGNER_USERNAME");
  assert.ok(sourceGuard >= 0 && sourceGuard < firstSecret);
  assert.ok(publicGuard >= 0 && publicGuard < firstSecret);
  assert.ok(stop >= 0 && stop < firstSecret);
  assert.match(workflow, /if: \$\{\{ false \}\}/u);
  assert.match(workflow, /if: always\(\)/u);
  for (const action of workflow.matchAll(/uses:\s+([^\s]+)/gu)) {
    assert.match(action[1], /@[0-9a-f]{40}$/u);
  }
  assert.doesNotMatch(workflow, /password.*Write-Host|totp.*Write-Host|echo.*password/iu);
});

test("formal Windows QA structurally gates every NSIS execution and app launch on Authenticode", async () => {
  const source = await readFile(formalQaPath, "utf8");
  assert.match(source, /authenticodeConfiguration === null\s*\? runAfterUnsignedMatterDesktopTechnicalCandidateInspection\(options\)\s*:\s*runAfterMatterDesktopAuthenticodeVerification/u);
  assert.equal(source.match(/runAfterFormalWindowsTrustInspection\(\{/gu)?.length, 3);
  const preinstallProbe = source.indexOf("installerAuthenticode = authenticode(INSTALLER_PATH)");
  const installAction = source.indexOf("action: async () => installPackage()");
  const installedProbe = source.indexOf("installedExecutableAuthenticode = authenticode(installed.executablePath)");
  const installedHash = source.indexOf("actualExecutableSha256: sha256File(installed.executablePath)");
  const firstLaunch = source.indexOf("action: async () => launchFormalApp");
  const restartProbe = source.indexOf("restartExecutableAuthenticode = authenticode(installed.executablePath)");
  const restartHash = source.indexOf("actualExecutableSha256: sha256File(installed.executablePath)", installedHash + 1);
  const restartLaunch = source.indexOf("action: async () => launchFormalApp", firstLaunch + 1);
  assert.ok(preinstallProbe >= 0 && preinstallProbe < installAction);
  assert.ok(installedProbe > installAction && installedProbe < firstLaunch);
  assert.ok(installedHash > installedProbe && installedHash < firstLaunch);
  assert.ok(restartProbe > firstLaunch && restartProbe < restartLaunch);
  assert.ok(restartHash > restartProbe && restartHash < restartLaunch);
  assert.match(source, /executable_byte_parity_prelaunch: installedExecutablePrelaunchParity/u);
  assert.match(source, /executable_byte_parity_restart_prelaunch: installedExecutableRestartPrelaunchParity/u);
  assert.match(source, /cleanupFailedWindowsNsisInstallation/u);
  assert.match(source, /primary_error_preserved: qaError !== null/u);
});
