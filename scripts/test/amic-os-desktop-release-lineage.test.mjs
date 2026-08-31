import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  compareDesktopCoreVersions,
  validateAmicOsDesktopReleaseLineage,
} from "../validate-amic-os-desktop-release-lineage.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const contract = JSON.parse(await readFile(
  path.join(repoRoot, "contracts/amic-os-desktop-release-lineage.json"),
  "utf8",
));

function packageAt(version) {
  return { name: "@law-firm-os/desktop", version };
}

function changedContract(mutate) {
  const value = structuredClone(contract);
  mutate(value);
  return value;
}

test("release-lineage source report binds the protected 0.1.29 baseline to selected version 0.1.31", async () => {
  const result = await validateAmicOsDesktopReleaseLineage({ repoRoot });
  assert.deepEqual(result, {
    schema_version: "law-firm-os.amic-os-desktop-release-lineage-validation.v1",
    verdict: "PASS",
    mode: "source",
    intent: "source_report",
    channel: "internal",
    user_visible_product: "AMIC OS",
    technical_executable_name: "matter",
    current_version: "0.1.31",
    protected_version_floor: "0.1.29",
    version_comparison: 1,
    version_forward: true,
    release_eligible: false,
    probe_only: false,
    protected_profile_count: 2,
    developer_id_notarized_profile_count: 1,
    windows_unsigned_internal_canary_preserved: true,
    release_version_selected: true,
    selected_release_version: "0.1.31",
    candidate_artifact_built: false,
    candidate_artifact_signed: false,
    production_ready: false,
  });
});

test("version comparison is numeric and requires a strict forward patch, minor, or major version", () => {
  assert.equal(compareDesktopCoreVersions("0.1.30", "0.1.29"), 1);
  assert.equal(compareDesktopCoreVersions("0.2.0", "0.1.29"), 1);
  assert.equal(compareDesktopCoreVersions("1.0.0", "0.1.29"), 1);
  assert.equal(compareDesktopCoreVersions("0.1.29", "0.1.29"), 0);
  assert.equal(compareDesktopCoreVersions("0.1.9", "0.1.29"), -1);
  assert.throws(() => compareDesktopCoreVersions("0.1.30-rc.1", "0.1.29"), /numeric major\.minor\.patch/iu);
});

test("the current lower version remains usable only as an explicit unsigned internal probe", async () => {
  const result = await validateAmicOsDesktopReleaseLineage({
    repoRoot,
    mode: "build",
    environment: {
      MATTER_DESKTOP_RELEASE_CHANNEL: "internal",
      MATTER_DESKTOP_BUILD_RECEIPT: "0",
      MATTER_DESKTOP_SIGN: "internal",
      MATTER_DESKTOP_NOTARIZE: "0",
    },
    packageOverride: packageAt("0.1.27"),
  });
  assert.equal(result.intent, "probe");
  assert.equal(result.probe_only, true);
  assert.equal(result.version_forward, false);
  assert.equal(result.release_eligible, false);
});

test("release intent rejects versions below or equal to the protected baseline", async (t) => {
  const cases = [
    {
      name: "default internal build with receipt",
      mode: "build",
      environment: { MATTER_DESKTOP_RELEASE_CHANNEL: "internal" },
      version: "0.1.27",
    },
    {
      name: "Developer ID internal build",
      mode: "build",
      environment: {
        MATTER_DESKTOP_RELEASE_CHANNEL: "internal",
        MATTER_DESKTOP_BUILD_RECEIPT: "0",
        MATTER_DESKTOP_SIGN: "developer-id",
      },
      version: "0.1.27",
    },
    {
      name: "notarized internal build",
      mode: "build",
      environment: {
        MATTER_DESKTOP_RELEASE_CHANNEL: "internal",
        MATTER_DESKTOP_BUILD_RECEIPT: "0",
        MATTER_DESKTOP_NOTARIZE: "1",
      },
      version: "0.1.27",
    },
    {
      name: "candidate channel",
      mode: "build",
      environment: { MATTER_DESKTOP_RELEASE_CHANNEL: "candidate" },
      version: "0.1.27",
    },
    {
      name: "formal channel equal to floor",
      mode: "build",
      environment: { MATTER_DESKTOP_RELEASE_CHANNEL: "formal" },
      version: "0.1.29",
    },
    {
      name: "explicit release mode",
      mode: "release",
      environment: { MATTER_DESKTOP_RELEASE_CHANNEL: "internal" },
      version: "0.1.27",
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      await assert.rejects(
        validateAmicOsDesktopReleaseLineage({
          repoRoot,
          mode: item.mode,
          environment: item.environment,
          packageOverride: packageAt(item.version),
        }),
        /must be greater than protected baseline 0\.1\.29/iu,
      );
    });
  }
});

test("a forward version remains blocked until that exact version is recorded, then passes without artifact claims", async () => {
  await assert.rejects(
    validateAmicOsDesktopReleaseLineage({
      repoRoot,
      mode: "release",
      environment: { MATTER_DESKTOP_RELEASE_CHANNEL: "internal" },
      packageOverride: packageAt("0.1.30"),
    }),
    /exact desktop version 0\.1\.30 to be recorded/iu,
  );
  const selectedContract = changedContract((value) => {
    value.enforcement.release_version_selection_recorded = true;
    value.enforcement.selected_release_version = "0.1.30";
  });
  const result = await validateAmicOsDesktopReleaseLineage({
    repoRoot,
    mode: "release",
    environment: { MATTER_DESKTOP_RELEASE_CHANNEL: "internal" },
    packageOverride: packageAt("0.1.30"),
    contractOverride: selectedContract,
  });
  assert.equal(result.intent, "release");
  assert.equal(result.version_forward, true);
  assert.equal(result.release_eligible, true);
  assert.equal(result.release_version_selected, true);
  assert.equal(result.selected_release_version, "0.1.30");
  assert.equal(result.candidate_artifact_built, false);
  assert.equal(result.candidate_artifact_signed, false);
});

test("dev cannot be promoted by an explicit release-intent flag", async () => {
  await assert.rejects(
    validateAmicOsDesktopReleaseLineage({
      repoRoot,
      mode: "build",
      environment: {
        MATTER_DESKTOP_RELEASE_CHANNEL: "dev",
        MATTER_DESKTOP_RELEASE_INTENT: "1",
      },
      packageOverride: packageAt("0.1.30"),
    }),
    /dev channel cannot carry release intent/iu,
  );
});

test("the lineage gate rejects baseline and release-claim drift", async (t) => {
  const cases = [
    {
      name: "baseline contract hash drift",
      mutate: (value) => { value.protected_baseline.contract_sha256 = "0".repeat(64); },
      expected: /protected baseline contract hash drifted/iu,
    },
    {
      name: "version floor drift",
      mutate: (value) => { value.protected_baseline.version_floor = "0.1.28"; },
      expected: /protected baseline policy drifted/iu,
    },
    {
      name: "premature signed artifact claim",
      mutate: (value) => { value.claims.candidate_artifact_signed = true; },
      expected: /release claims must remain false/iu,
    },
    {
      name: "selected release version without recorded selection",
      mutate: (value) => { value.enforcement.release_version_selection_recorded = false; },
      expected: /unrecorded release version must remain null/iu,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      await assert.rejects(
        validateAmicOsDesktopReleaseLineage({
          repoRoot,
          contractOverride: changedContract(item.mutate),
        }),
        item.expected,
      );
    });
  }
});

test("all direct desktop builds and both release flows run the release-lineage gate before build", async () => {
  const rootPackage = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  const desktopPackage = JSON.parse(await readFile(path.join(repoRoot, "apps/desktop/package.json"), "utf8"));
  assert.equal(
    rootPackage.scripts["matter-desktop:release-lineage:validate"],
    "node scripts/validate-amic-os-desktop-release-lineage.mjs --source",
  );
  for (const scriptName of ["prebuild:mac", "prebuild:win", "prebuild:win:installer"]) {
    assert.match(desktopPackage.scripts[scriptName], /validate-amic-os-desktop-release-lineage\.mjs --build/iu);
  }
  for (const scriptName of ["matter-desktop:temporary-release", "matter-desktop:formal-release"]) {
    const command = rootPackage.scripts[scriptName];
    const lineageIndex = command.indexOf("validate-amic-os-desktop-release-lineage.mjs --build");
    const firstBuildIndex = command.indexOf("run build:mac");
    assert.ok(lineageIndex > 0, `${scriptName} must include the release-lineage gate`);
    assert.ok(firstBuildIndex > lineageIndex, `${scriptName} must gate before the first package build`);
  }
});
