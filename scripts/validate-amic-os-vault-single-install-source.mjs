#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desktopReleaseChannelConfig } from "./lib/matter-desktop-provenance.mjs";
import { parseOutlookManifest } from "./lib/outlook-manifest-projection.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");
const contractPath = "contracts/amic-os-vault-single-install-source.json";
const expectedForbiddenSurfaces = Object.freeze([
  "vault_desktop_application",
  "vault_installer",
  "vault_launcher",
  "vault_tray",
  "vault_login",
  "vault_updater",
]);
const expectedForbiddenRoots = Object.freeze([
  "apps/vault-desktop",
  "apps/amic-vault-desktop",
  "apps/vault-installer",
  "apps/amic-vault-installer",
]);
const remotePreservationSet = Object.freeze([
  "vault_documents",
  "vault_immutable_versions",
  "vault_audit_records",
  "legal_hold_or_retention_material",
  "outlook_drafts",
  "outlook_sent_mail",
  "recipient_copies",
]);
const expectedEquivalentManifestPaths = Object.freeze([
  "apps/addin/manifest.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.canary.taskpane.production.xml",
  "apps/addin/manifest.canary.rollback.production.xml",
]);
const expectedNonEquivalentManifestPaths = Object.freeze([
  "apps/addin/manifest.inquiry.xml",
  "apps/addin/manifest.inquiry.production.xml",
]);

function fail(message) {
  throw new Error(`AMIC_OS_VAULT_SINGLE_INSTALL_SOURCE_INVALID: ${message}`);
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drifted`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  exact(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function yamlScalar(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "mu"));
  if (!match) fail(`desktop builder is missing ${key}`);
  const value = match[1].replace(/^(["'])(.*)\1$/u, "$2");
  return value === "null" ? null : value;
}

function yamlSection(source, key) {
  const lines = source.split(/\r?\n/u);
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start < 0) fail(`desktop builder is missing ${key} section`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index] && !/^\s/u.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

async function desktopProductRoots(repoRoot) {
  const appsRoot = path.join(repoRoot, "apps");
  const entries = await readdir(appsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `apps/${entry.name}`)
    .filter((root) => existsSync(path.join(repoRoot, root, "electron-builder.yml"))
      || existsSync(path.join(repoRoot, root, "electron-builder.yaml")))
    .sort();
}

function validateContract(contract) {
  exactKeys(contract, [
    "current_desktop_lineage",
    "deployment_boundaries",
    "forbidden_product_roots",
    "forbidden_user_visible_surfaces",
    "goal",
    "platform_packages",
    "release_status",
    "schema_version",
    "source_evidence",
    "uninstall_preservation",
  ], "contract");
  if (contract.schema_version !== "law-firm-os.amic-os-vault-single-install-source.v1") {
    fail("schema version drifted");
  }

  exactKeys(contract.goal, [
    "separate_vault_product_count",
    "user_visible_product",
    "user_visible_product_count",
    "vault_is_capability_not_product",
  ], "goal");
  if (contract.goal.user_visible_product !== "AMIC OS"
      || contract.goal.user_visible_product_count !== 1
      || contract.goal.separate_vault_product_count !== 0
      || contract.goal.vault_is_capability_not_product !== true) {
    fail("one-product goal must remain AMIC OS with Vault as a capability");
  }

  exactKeys(contract.current_desktop_lineage, [
    "app_id",
    "artifact_name_template",
    "artifact_product_name",
    "identity_transition_requires_upgrade_lineage_gate",
    "internal_artifact_prefix",
    "internal_macos_app_bundle_name",
    "internal_macos_display_name",
    "internal_windows_product_name",
    "main_window_title",
    "package_name",
    "renderer_document_title",
    "source_package",
    "technical_executable_name",
    "technical_runtime_name",
    "technical_url_scheme",
    "user_visible_identity_aligned",
  ], "current desktop lineage");
  if (contract.current_desktop_lineage.identity_transition_requires_upgrade_lineage_gate !== true) {
    fail("desktop identity transition must remain upgrade-lineage gated");
  }
  if (contract.current_desktop_lineage.technical_runtime_name !== "matter"
      || contract.current_desktop_lineage.technical_executable_name !== "matter"
      || contract.current_desktop_lineage.technical_url_scheme !== "matter") {
    fail("desktop technical lineage must remain matter during the display-name transition");
  }

  if (!Array.isArray(contract.platform_packages)
      || contract.platform_packages.map(({ id }) => id).join(",") !== "windows,macos") {
    fail("platform package order and IDs drifted");
  }
  const [windowsPackage, macosPackage] = contract.platform_packages;
  exactKeys(windowsPackage, [
    "broker_source_present",
    "classic_native_component_allowed",
    "classic_native_source_present",
    "id",
    "integrated_package_verified",
    "package_target",
    "required_component_roles",
    "user_visible_entrypoint_count",
  ], "Windows package");
  exact(windowsPackage.required_component_roles, [
    "desktop_shell",
    "classic_outlook_adapter",
    "click_time_broker",
    "required_runtime",
  ], "Windows component roles");
  if (windowsPackage.package_target !== "nsis"
      || windowsPackage.user_visible_entrypoint_count !== 1
      || windowsPackage.classic_native_component_allowed !== true) {
    fail("Windows package topology drifted");
  }
  if (windowsPackage.classic_native_source_present !== true
      || windowsPackage.broker_source_present !== true
      || windowsPackage.integrated_package_verified !== false) {
    fail("Windows package must record present Classic/broker source without claiming a verified installer");
  }

  exactKeys(macosPackage, [
    "classic_native_component_allowed",
    "id",
    "integrated_package_verified",
    "package_target",
    "required_component_roles",
    "user_visible_entrypoint_count",
  ], "macOS package");
  exact(macosPackage.required_component_roles, ["desktop_shell", "secure_file_bridge"], "macOS component roles");
  if (macosPackage.package_target !== "dmg"
      || macosPackage.user_visible_entrypoint_count !== 1
      || macosPackage.classic_native_component_allowed !== false
      || macosPackage.integrated_package_verified !== false) {
    fail("macOS package must exclude Classic native code and remain unverified");
  }

  exactKeys(contract.deployment_boundaries, [
    "classic_and_officejs_cohort_intersection_required",
    "classic_native_registry_prog_id",
    "installer_may_mutate_m365_assignment",
    "officejs_equivalent_addin_manifest_paths",
    "officejs_deployment_owner",
    "officejs_non_equivalent_manifest_paths",
    "vault_provider_credentials_are_server_side",
  ], "deployment boundaries");
  if (contract.deployment_boundaries.installer_may_mutate_m365_assignment !== false
      || contract.deployment_boundaries.officejs_deployment_owner !== "m365_admin"
      || contract.deployment_boundaries.classic_and_officejs_cohort_intersection_required !== 0
      || contract.deployment_boundaries.classic_native_registry_prog_id !== "AMIC.OS.Vault.Outlook"
      || contract.deployment_boundaries.vault_provider_credentials_are_server_side !== true) {
    fail("deployment boundary drifted");
  }
  exact(
    contract.deployment_boundaries.officejs_equivalent_addin_manifest_paths,
    expectedEquivalentManifestPaths,
    "Office.js equivalent-addin manifest paths",
  );
  exact(
    contract.deployment_boundaries.officejs_non_equivalent_manifest_paths,
    expectedNonEquivalentManifestPaths,
    "Office.js non-equivalent manifest paths",
  );

  exact(contract.forbidden_user_visible_surfaces, expectedForbiddenSurfaces, "forbidden user-visible surfaces");
  exact(contract.forbidden_product_roots, expectedForbiddenRoots, "forbidden product roots");

  exactKeys(contract.uninstall_preservation, [
    "custom_nsis_uninstall_hook_present",
    "installer_may_call_remote_delete",
    "local_components_may_be_removed",
    "remote_or_immutable_data_never_deleted",
  ], "uninstall preservation");
  if (contract.uninstall_preservation.installer_may_call_remote_delete !== false
      || contract.uninstall_preservation.custom_nsis_uninstall_hook_present !== true) {
    fail("installer must preserve remote data and retain its local-only NSIS uninstall hook");
  }
  exact(contract.uninstall_preservation.remote_or_immutable_data_never_deleted, remotePreservationSet, "remote preservation set");

  exactKeys(contract.source_evidence, [
    "broker_candidate_roots",
    "broker_candidate_roots_present",
    "builder_config_path",
    "classic_native_project_root",
    "classic_native_project_root_present",
    "desktop_build_preflight",
    "desktop_release_lineage_preflight",
    "desktop_file_bridge_contract_preflight",
    "desktop_file_bridge_source_preflight",
    "desktop_build_scripts",
    "desktop_package_path",
    "desktop_product_roots",
    "separate_vault_desktop_roots_present",
  ], "source evidence");
  if (contract.source_evidence.classic_native_project_root_present !== true) {
    fail("Classic native project must remain present");
  }
  exact(contract.source_evidence.broker_candidate_roots, [
    "apps/desktop/src/main/broker",
    "apps/desktop/src/broker",
    "apps/desktop/native",
  ], "broker candidate roots");
  exact(contract.source_evidence.broker_candidate_roots_present, [
    "apps/desktop/src/main/broker",
  ], "present broker roots");
  exact(contract.source_evidence.desktop_build_scripts, [
    "build:mac",
    "build:win",
    "build:win:installer",
  ], "desktop build scripts");
  if (contract.source_evidence.desktop_build_preflight
      !== "node ../../scripts/validate-amic-os-vault-single-install-source.mjs") {
    fail("desktop build preflight drifted");
  }
  if (contract.source_evidence.desktop_release_lineage_preflight
      !== "node ../../scripts/validate-amic-os-desktop-release-lineage.mjs --build") {
    fail("desktop release-lineage preflight drifted");
  }
  if (contract.source_evidence.desktop_file_bridge_contract_preflight
      !== "node ../../scripts/validate-desktop-file-bridge-contract.mjs") {
    fail("desktop file-bridge contract preflight drifted");
  }
  if (contract.source_evidence.desktop_file_bridge_source_preflight
      !== "node ../../scripts/validate-matter-desktop-file-bridge.mjs") {
    fail("desktop file-bridge source preflight drifted");
  }
  exact(contract.source_evidence.separate_vault_desktop_roots_present, [], "separate Vault desktop roots");

  exactKeys(contract.release_status, [
    "install_repair_upgrade_uninstall_verified",
    "integrated_installer_verified",
    "production_ready_claim",
    "real_host_verified",
    "signed_artifact_verified",
    "source_inventory_verified",
  ], "release status");
  if (contract.release_status.source_inventory_verified !== true) fail("source inventory must be verified");
  for (const field of [
    "integrated_installer_verified",
    "signed_artifact_verified",
    "install_repair_upgrade_uninstall_verified",
    "real_host_verified",
    "production_ready_claim",
  ]) {
    if (contract.release_status[field] !== false) fail(`${field} cannot be claimed by a source-only gate`);
  }
}

export async function validateAmicOsVaultSingleInstallSource({
  repoRoot = defaultRepoRoot,
  contractOverride,
} = {}) {
  const contract = contractOverride ?? JSON.parse(await readFile(path.join(repoRoot, contractPath), "utf8"));
  validateContract(contract);

  const packageJson = JSON.parse(await readFile(
    path.join(repoRoot, contract.source_evidence.desktop_package_path),
    "utf8",
  ));
  const builderSource = await readFile(path.join(repoRoot, contract.source_evidence.builder_config_path), "utf8");
  const [installerNshSource, nativeProjectSource, nativeAddInSource, nativePipeSource, brokerSource] = await Promise.all([
    "apps/desktop/build/installer.nsh",
    "apps/outlook-classic-native/AMIC.OS.Vault.Outlook.csproj",
    "apps/outlook-classic-native/VaultOutlookAddIn.cs",
    "apps/outlook-classic-native/AttachPipeServer.cs",
    "apps/desktop/src/main/broker/classicOutlookBridge.js",
  ].map((filePath) => readFile(path.join(repoRoot, filePath), "utf8")));
  const [windowSource, mainSource, rendererIndexSource, offlineRendererSource, shellSource, ...packagingSources] = await Promise.all([
    "apps/desktop/src/main/window.js",
    "apps/desktop/src/main/main.js",
    "apps/web/index.html",
    "apps/desktop/src/renderer/offline.html",
    "apps/web/src/components/Shell.jsx",
    "scripts/build-matter-desktop-mac.mjs",
    "scripts/build-matter-desktop-win.mjs",
    "scripts/build-matter-desktop-win-installer.mjs",
  ].map((filePath) => readFile(path.join(repoRoot, filePath), "utf8")));
  const lineage = contract.current_desktop_lineage;
  const internalChannel = desktopReleaseChannelConfig("internal");

  if (packageJson.name !== lineage.package_name) fail("desktop package name differs from inventory");
  const expectedBuildPreflight = [
    contract.source_evidence.desktop_build_preflight,
    contract.source_evidence.desktop_release_lineage_preflight,
    contract.source_evidence.desktop_file_bridge_contract_preflight,
    contract.source_evidence.desktop_file_bridge_source_preflight,
  ].join(" && ");
  for (const buildScript of contract.source_evidence.desktop_build_scripts) {
    if (packageJson.scripts?.[`pre${buildScript}`] !== expectedBuildPreflight) {
      fail(`${buildScript} must run the single-install, release-lineage, and file-bridge preflights`);
    }
  }
  if (lineage.source_package !== "apps/desktop") fail("desktop source package drifted");
  if (yamlScalar(builderSource, "appId") !== lineage.app_id) fail("desktop app ID differs from inventory");
  if (yamlScalar(builderSource, "productName") !== lineage.artifact_product_name) {
    fail("desktop product name differs from inventory");
  }
  if (yamlScalar(builderSource, "artifactName") !== lineage.artifact_name_template) {
    fail("desktop artifact template differs from inventory");
  }
  if (yamlScalar(builderSource, "publish") !== null) fail("desktop builder must not expose a publish channel");
  if (lineage.artifact_product_name !== lineage.technical_runtime_name) {
    fail("desktop builder product name must remain bound to the technical runtime lineage");
  }
  if (internalChannel.appId !== lineage.app_id
      || internalChannel.macArtifactPrefix !== lineage.internal_artifact_prefix
      || internalChannel.windowsArtifactPrefix !== lineage.internal_artifact_prefix
      || internalChannel.macAppBundleName !== lineage.internal_macos_app_bundle_name
      || internalChannel.macDisplayName !== lineage.internal_macos_display_name
      || internalChannel.windowsProductName !== lineage.internal_windows_product_name
      || internalChannel.windowsExecutableName !== lineage.technical_executable_name) {
    fail("internal AMIC OS channel identity differs from inventory");
  }
  const [macPackagingSource, windowsPackagingSource, windowsInstallerSource] = packagingSources;
  if (!macPackagingSource.includes("channelConfig.macAppBundleName")
      || !macPackagingSource.includes("channelConfig.macArtifactPrefix")
      || !macPackagingSource.includes("channelConfig.macDisplayName")
      || !macPackagingSource.includes("channelConfig.macVolumeName")) {
    fail("macOS packaging must consume the internal AMIC OS display identity");
  }
  if (!windowsPackagingSource.includes("channelConfig.windowsArtifactPrefix")
      || !windowsPackagingSource.includes("name: channelConfig.windowsProductName")
      || !windowsPackagingSource.includes("executableName: channelConfig.windowsExecutableName")) {
    fail("Windows packaging must consume the internal AMIC OS display identity");
  }
  if (!windowsInstallerSource.includes("channelConfig.windowsArtifactPrefix")
      || !windowsInstallerSource.includes("-c.productName=${channelConfig.windowsProductName}")
      || !windowsInstallerSource.includes("-c.executableName=${channelConfig.windowsExecutableName}")) {
    fail("Windows installer must consume the internal AMIC OS display identity");
  }
  if (!windowsInstallerSource.includes("classicOutlookProjectPath")
      || !windowsInstallerSource.includes("classicOutlookDllPath")
      || !windowsInstallerSource.includes('"dotnet",')
      || !windowsInstallerSource.includes(".release-provenance/classic-outlook")
      || !windowsInstallerSource.includes('classic_outlook_user_registration: "nsis_hklm_regasm_com_hkcu_activation_views_32_and_64"')
      || !windowsInstallerSource.includes("Classic Outlook adapter must match the exact built DLL")) {
    fail("Windows installer must build, bundle, and hash-verify the Classic Outlook adapter");
  }
  if (!mainSource.includes(`setAsDefaultProtocolClient?.("${lineage.technical_url_scheme}")`)
      || !macPackagingSource.includes(`CFBundleURLSchemes:0 string ${lineage.technical_url_scheme}`)) {
    fail("desktop technical URL scheme differs from inventory");
  }
  if (!new RegExp(`title:\\s*["']${lineage.main_window_title}["']`, "u").test(windowSource)) {
    fail("desktop main-window title differs from inventory");
  }
  for (const [source, label] of [
    [rendererIndexSource, "web renderer"],
    [offlineRendererSource, "offline renderer"],
  ]) {
    if (!source.includes(`<title>${lineage.renderer_document_title}</title>`)) {
      fail(`${label} document title differs from inventory`);
    }
  }
  if ((shellSource.match(/title:\s*"AMIC OS"/gu) ?? []).length < 2) {
    fail("desktop shell fallback identity must remain AMIC OS");
  }
  const identityAligned = lineage.internal_macos_app_bundle_name === `${contract.goal.user_visible_product}.app`
    && lineage.internal_macos_display_name === contract.goal.user_visible_product
    && lineage.internal_windows_product_name === contract.goal.user_visible_product
    && lineage.main_window_title === contract.goal.user_visible_product
    && lineage.renderer_document_title === contract.goal.user_visible_product;
  if (lineage.user_visible_identity_aligned !== identityAligned) {
    fail("desktop user-visible identity alignment claim differs from source");
  }

  const macSection = yamlSection(builderSource, "mac");
  const windowsSection = yamlSection(builderSource, "win");
  const nsisSection = yamlSection(builderSource, "nsis");
  if (!/^\s+-\s+dmg\s*$/mu.test(macSection)) fail("macOS DMG target is missing");
  if (!/^\s+-\s+nsis\s*$/mu.test(windowsSection)) fail("Windows NSIS target is missing");
  if (!/^\s+include:\s+build\/installer\.nsh\s*$/mu.test(nsisSection)
      || !/^\s+perMachine:\s+true\s*$/mu.test(nsisSection)
      || /deleteAppDataOnUninstall:\s*true/iu.test(builderSource)) {
    fail("Windows NSIS must elevate its machine COM registration and keep uninstall cleanup local-only");
  }
  if (!installerNshSource.includes("!macro customInstall")
      || !installerNshSource.includes("!macro customUnInstall")
      || !installerNshSource.includes('WriteRegStr HKCU "Software\\Microsoft\\Office\\Outlook\\Addins\\${AMIC_OUTLOOK_PROGID}"')
      || !installerNshSource.includes("Microsoft.NET\\${FRAMEWORK}\\v4.0.30319\\RegAsm.exe")
      || !installerNshSource.includes('DeleteRegKey HKLM "Software\\Classes\\CLSID\\${AMIC_OUTLOOK_CLSID}"')
      || !installerNshSource.includes('DeleteRegKey HKLM "Software\\Classes\\${AMIC_OUTLOOK_PROGID}"')
      || !installerNshSource.includes("SetRegView 32")
      || !installerNshSource.includes("SetRegView 64")
      || !/!macro customUnInstall[\s\S]*\$\{If\} \$\{RunningX64\}\s+SetRegView 64\s+\$\{Else\}\s+SetRegView 32\s+\$\{EndIf\}\s+RMDir \/r "\$LOCALAPPDATA\\AMIC OS\\OutlookAttachments"\s+!macroend/u.test(installerNshSource)
      || !installerNshSource.includes('RMDir /r "$LOCALAPPDATA\\AMIC OS\\OutlookAttachments"')
      || /WriteReg(?:Str|DWORD)\s+HKCU\s+"Software\\Classes\\/u.test(installerNshSource)
      || /https?:\/\/|vault_documents|immutable_versions|audit_records/iu.test(installerNshSource)) {
    fail("Windows NSIS integration must use machine RegAsm COM registration, current-user Outlook activation, and local-only cleanup");
  }
  const progIdMatch = installerNshSource.match(/^!define AMIC_OUTLOOK_PROGID "([^"]+)"$/mu);
  const installerProgId = progIdMatch?.[1];
  if (installerProgId !== contract.deployment_boundaries.classic_native_registry_prog_id) {
    fail("Classic Outlook installer ProgID differs from the deployment contract");
  }
  const expectedEquivalentAddin = [`VersionOverridesV1_1:${installerProgId}:COM`];
  for (const manifestPath of contract.deployment_boundaries.officejs_equivalent_addin_manifest_paths) {
    const manifest = parseOutlookManifest(await readFile(path.join(repoRoot, manifestPath), "utf8"));
    exact(manifest.equivalent_addins, expectedEquivalentAddin, `${manifestPath} equivalent add-in`);
    exact(manifest.equivalent_addin_effects, [], `${manifestPath} equivalent add-in effects`);
  }
  for (const manifestPath of contract.deployment_boundaries.officejs_non_equivalent_manifest_paths) {
    const manifest = parseOutlookManifest(await readFile(path.join(repoRoot, manifestPath), "utf8"));
    exact(manifest.equivalent_addins, [], `${manifestPath} equivalent add-in`);
    exact(manifest.equivalent_addin_effects, [], `${manifestPath} equivalent add-in effects`);
  }
  if (!nativeProjectSource.includes("<TargetFramework>net48</TargetFramework>")
      || /VSTO|SignAssembly|AssemblyOriginatorKeyFile/iu.test(nativeProjectSource)
      || !nativeAddInSource.includes("Microsoft.Outlook.Mail.Compose")
      || !nativeAddInSource.includes("OutlookByValue = 1")
      || /ItemChanged|SelectionChange|NewInspector/iu.test(nativeAddInSource)
      || !nativePipeSource.includes("GetNamedPipeClientProcessId")
      || !nativePipeSource.includes("WindowsIdentity.GetCurrent().User")
      || !nativePipeSource.includes("metadata.exact_version.byte_size != byteLength")
      || !nativePipeSource.includes("AttachRequest.Hex(digest.Hash) != expectedSha256")) {
    fail("Classic Outlook native adapter must remain click-only and exact-version bound");
  }
  if (!brokerSource.includes("--amic-outlook-attach")
      || !brokerSource.includes("installationRefSha256")
      || !brokerSource.includes("composeTargetSha256")
      || !brokerSource.includes("AMICVLT1")) {
    fail("Classic Outlook broker must remain short-lived and compose-bound");
  }

  const productRoots = await desktopProductRoots(repoRoot);
  exact(productRoots, contract.source_evidence.desktop_product_roots, "desktop product roots");
  const vaultProductRoots = productRoots.filter((root) => /vault/iu.test(root));
  exact(vaultProductRoots, contract.source_evidence.separate_vault_desktop_roots_present, "Vault desktop product roots");
  if (productRoots.length !== contract.goal.user_visible_product_count
      || vaultProductRoots.length !== contract.goal.separate_vault_product_count) {
    fail("source product count differs from the one-product goal");
  }
  for (const forbiddenRoot of contract.forbidden_product_roots) {
    if (existsSync(path.join(repoRoot, forbiddenRoot))) fail(`forbidden product root exists: ${forbiddenRoot}`);
  }

  const nativeRootPresent = existsSync(path.join(repoRoot, contract.source_evidence.classic_native_project_root));
  if (nativeRootPresent !== contract.source_evidence.classic_native_project_root_present) {
    fail("Classic native project presence differs from inventory");
  }
  const windowsPackage = contract.platform_packages[0];
  if (windowsPackage.classic_native_source_present !== nativeRootPresent) {
    fail("Windows Classic native source claim differs from inventory");
  }
  const brokerRootsPresent = contract.source_evidence.broker_candidate_roots
    .filter((candidate) => existsSync(path.join(repoRoot, candidate)));
  exact(brokerRootsPresent, contract.source_evidence.broker_candidate_roots_present, "present broker roots");
  if (windowsPackage.broker_source_present !== (brokerRootsPresent.length > 0)) {
    fail("Windows broker source claim differs from inventory");
  }

  const packagingSource = packagingSources.join("\n");
  if (/(?:m365|office\s*365|office\.js|microsoft\s+graph).{0,120}(?:assign|membership|group)|(?:assign|membership).{0,120}(?:m365|office\s*365|office\.js)/isu.test(packagingSource)) {
    fail("desktop packaging source may not mutate M365 assignment");
  }

  const [desktopRuntimeSource, formalMacQaSource, formalWinQaSource] = await Promise.all([
    "scripts/lib/matter-desktop-runtime.mjs",
    "scripts/run-formal-macos-package-qa.mjs",
    "scripts/run-formal-windows-package-qa.mjs",
  ].map((filePath) => readFile(path.join(repoRoot, filePath), "utf8")));
  if (!/await rm\(runtimeDir, \{ recursive: true, force: true \}\);\s*if \(formalRelease\) return \{ included: false, runtimeDir \};/u.test(desktopRuntimeSource)) {
    fail("formal packaging must remove the complete local runtime tree");
  }
  if (!/existsSync\(PACKAGED_LOCAL_RUNTIME\), false, "formal package must not bundle the local API runtime tree"/u.test(formalMacQaSource)) {
    fail("formal macOS QA must reject any packaged local runtime tree");
  }
  if (!/existsSync\(UNPACKED_LOCAL_RUNTIME\), false, "formal package must not bundle the local API runtime tree"/u.test(formalWinQaSource)) {
    fail("formal Windows QA must reject any packaged local runtime tree");
  }

  return Object.freeze({
    schema_version: "law-firm-os.amic-os-vault-single-install-source-validation.v1",
    verdict: "PASS",
    user_visible_product: "AMIC OS",
    desktop_product_root_count: productRoots.length,
    desktop_build_hook_count: contract.source_evidence.desktop_build_scripts.length,
    desktop_vault_capability_preflight_count: 2,
    formal_local_runtime_exclusion_gate_count: 3,
    separate_vault_product_count: vaultProductRoots.length,
    current_artifact_product_name: lineage.artifact_product_name,
    current_user_visible_product_name: lineage.internal_macos_display_name,
    technical_executable_name: lineage.technical_executable_name,
    user_visible_identity_aligned: identityAligned,
    classic_native_source_present: nativeRootPresent,
    broker_source_present: windowsPackage.broker_source_present,
    installer_may_mutate_m365_assignment: false,
    classic_and_officejs_cohort_intersection_required: 0,
    classic_native_registry_prog_id: installerProgId,
    officejs_equivalent_addin_manifest_count: expectedEquivalentManifestPaths.length,
    integrated_installer_verified: false,
    signed_artifact_verified: false,
    install_repair_upgrade_uninstall_verified: false,
    production_ready_claim: false,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  validateAmicOsVaultSingleInstallSource()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
