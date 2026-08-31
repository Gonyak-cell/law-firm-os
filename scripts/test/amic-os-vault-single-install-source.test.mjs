import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { validateAmicOsVaultSingleInstallSource } from "../validate-amic-os-vault-single-install-source.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const contract = JSON.parse(await readFile(
  path.join(repoRoot, "contracts/amic-os-vault-single-install-source.json"),
  "utf8",
));

function changedContract(mutate) {
  const value = structuredClone(contract);
  mutate(value);
  return value;
}

test("single-install source gate records one AMIC OS product with Classic adapter and broker source", async () => {
  const result = await validateAmicOsVaultSingleInstallSource({ repoRoot });
  assert.deepEqual(result, {
    schema_version: "law-firm-os.amic-os-vault-single-install-source-validation.v1",
    verdict: "PASS",
    user_visible_product: "AMIC OS",
    desktop_product_root_count: 1,
    desktop_build_hook_count: 3,
    desktop_vault_capability_preflight_count: 2,
    formal_local_runtime_exclusion_gate_count: 3,
    separate_vault_product_count: 0,
    current_artifact_product_name: "matter",
    current_user_visible_product_name: "AMIC OS",
    technical_executable_name: "matter",
    user_visible_identity_aligned: true,
    classic_native_source_present: true,
    broker_source_present: true,
    installer_may_mutate_m365_assignment: false,
    integrated_installer_verified: false,
    signed_artifact_verified: false,
    install_repair_upgrade_uninstall_verified: false,
    production_ready_claim: false,
  });
});

test("temporary and formal desktop release flows run the single-install gate before building", async () => {
  const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  const desktopPackage = JSON.parse(await readFile(path.join(repoRoot, "apps/desktop/package.json"), "utf8"));
  for (const scriptName of ["matter-desktop:temporary-release", "matter-desktop:formal-release"]) {
    const command = packageJson.scripts[scriptName];
    const gateIndex = command.indexOf("npm run vault:single-install-source:validate");
    const buildIndex = command.indexOf("run build:mac");
    assert.equal(gateIndex, 0, `${scriptName} must begin with the single-install source gate`);
    assert.ok(buildIndex > gateIndex, `${scriptName} must gate before its first desktop build`);
  }
  const expectedBuildPreflight = [
    contract.source_evidence.desktop_build_preflight,
    contract.source_evidence.desktop_release_lineage_preflight,
    contract.source_evidence.desktop_file_bridge_contract_preflight,
    contract.source_evidence.desktop_file_bridge_source_preflight,
  ].join(" && ");
  for (const buildScript of contract.source_evidence.desktop_build_scripts) {
    assert.equal(
      desktopPackage.scripts[`pre${buildScript}`],
      expectedBuildPreflight,
      `${buildScript} must preserve the npm lifecycle gate for direct CI and local builds`,
    );
  }
});

test("file-bridge preflights resolve repository evidence from the desktop lifecycle directory", () => {
  for (const scriptPath of [
    "scripts/validate-desktop-file-bridge-contract.mjs",
    "scripts/validate-matter-desktop-file-bridge.mjs",
  ]) {
    const output = execFileSync(process.execPath, [path.join(repoRoot, scriptPath)], {
      cwd: path.join(repoRoot, "apps/desktop"),
      encoding: "utf8",
    });
    assert.match(output, /"verdict": "PASS"/u, `${scriptPath} must be independent of process.cwd()`);
  }
});

test("single-install source gate rejects product, platform, deployment, uninstall, and release overclaims", async (t) => {
  const cases = [
    {
      name: "second user-visible product",
      mutate: (value) => { value.goal.user_visible_product_count = 2; },
      expected: /one-product goal/iu,
    },
    {
      name: "separate Vault product",
      mutate: (value) => { value.goal.separate_vault_product_count = 1; },
      expected: /one-product goal/iu,
    },
    {
      name: "Classic native code in macOS package",
      mutate: (value) => { value.platform_packages[1].classic_native_component_allowed = true; },
      expected: /macOS package must exclude Classic native code/iu,
    },
    {
      name: "installer mutates M365 assignment",
      mutate: (value) => { value.deployment_boundaries.installer_may_mutate_m365_assignment = true; },
      expected: /deployment boundary drifted/iu,
    },
    {
      name: "uninstall deletes a Vault document",
      mutate: (value) => { value.uninstall_preservation.remote_or_immutable_data_never_deleted.shift(); },
      expected: /remote preservation set drifted/iu,
    },
    {
      name: "local-only NSIS uninstall hook removed",
      mutate: (value) => { value.uninstall_preservation.custom_nsis_uninstall_hook_present = false; },
      expected: /local-only NSIS uninstall hook/iu,
    },
    {
      name: "premature signed artifact claim",
      mutate: (value) => { value.release_status.signed_artifact_verified = true; },
      expected: /signed_artifact_verified cannot be claimed/iu,
    },
    {
      name: "false product identity alignment claim",
      mutate: (value) => { value.current_desktop_lineage.user_visible_identity_aligned = false; },
      expected: /identity alignment claim differs from source/iu,
    },
    {
      name: "technical executable identity transition",
      mutate: (value) => { value.current_desktop_lineage.technical_executable_name = "AMIC OS"; },
      expected: /technical lineage must remain matter/iu,
    },
    {
      name: "build preflight removed",
      mutate: (value) => { value.source_evidence.desktop_build_preflight = "node bypass.mjs"; },
      expected: /desktop build preflight drifted/iu,
    },
    {
      name: "release-lineage preflight removed",
      mutate: (value) => { value.source_evidence.desktop_release_lineage_preflight = "node bypass.mjs"; },
      expected: /desktop release-lineage preflight drifted/iu,
    },
    {
      name: "file-bridge contract preflight removed",
      mutate: (value) => { value.source_evidence.desktop_file_bridge_contract_preflight = "node bypass.mjs"; },
      expected: /desktop file-bridge contract preflight drifted/iu,
    },
    {
      name: "file-bridge source preflight removed",
      mutate: (value) => { value.source_evidence.desktop_file_bridge_source_preflight = "node bypass.mjs"; },
      expected: /desktop file-bridge source preflight drifted/iu,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      await assert.rejects(
        validateAmicOsVaultSingleInstallSource({
          repoRoot,
          contractOverride: changedContract(item.mutate),
        }),
        item.expected,
      );
    });
  }
});
