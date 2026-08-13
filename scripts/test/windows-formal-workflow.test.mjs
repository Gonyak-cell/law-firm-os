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
  assert.doesNotMatch(workflow, /matter-0\.1\.17-win-(?:build|installer)-manifest\.json/);
  assert.doesNotMatch(
    workflow,
    /Copy-Item "(?:apps\\desktop\\dist\\win|docs\\lazycodex).*?-ErrorAction SilentlyContinue/,
  );
});
