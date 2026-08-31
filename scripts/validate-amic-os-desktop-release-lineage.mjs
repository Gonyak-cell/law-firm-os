#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desktopReleaseChannelConfig } from "./lib/matter-desktop-provenance.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");
const contractRef = "contracts/amic-os-desktop-release-lineage.json";
const usage = "usage: node scripts/validate-amic-os-desktop-release-lineage.mjs --source|--build|--release|--help";
const sha256Pattern = /^[0-9a-f]{64}$/u;
const gitObjectPattern = /^[0-9a-f]{40}$/u;
const coreVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

function fail(message) {
  throw new Error(`AMIC_OS_DESKTOP_RELEASE_LINEAGE_INVALID: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drifted`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  exact(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function parseCoreVersion(value, label) {
  const match = coreVersionPattern.exec(value ?? "");
  if (!match) fail(`${label} must be a numeric major.minor.patch version`);
  return match.slice(1).map(Number);
}

export function compareDesktopCoreVersions(left, right) {
  const leftParts = parseCoreVersion(left, "left version");
  const rightParts = parseCoreVersion(right, "right version");
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] > rightParts[index] ? 1 : -1;
  }
  return 0;
}

function validateContract(contract) {
  exactKeys(contract, [
    "claims",
    "enforcement",
    "goal_regression_savepoint",
    "product_identity",
    "protected_baseline",
    "schema_version",
  ], "release lineage contract");
  if (contract.schema_version !== "law-firm-os.amic-os-desktop-release-lineage.v1") {
    fail("schema version drifted");
  }
  if (contract.goal_regression_savepoint !== "LAWOS-SP-20260828-1787901890994922") {
    fail("goal regression savepoint drifted");
  }

  exactKeys(contract.product_identity, [
    "internal_app_id",
    "technical_executable_name",
    "technical_package_name",
    "technical_url_scheme",
    "user_visible_product",
  ], "product identity");
  exact(contract.product_identity, {
    user_visible_product: "AMIC OS",
    technical_package_name: "@law-firm-os/desktop",
    technical_executable_name: "matter",
    technical_url_scheme: "matter",
    internal_app_id: "com.amic.matter.desktop.internal",
  }, "product identity");

  exactKeys(contract.protected_baseline, [
    "contract_ref",
    "contract_sha256",
    "desktop_action",
    "desktop_surface_sha256",
    "minimum_developer_id_notarized_profile_count",
    "platforms",
    "version_floor",
    "windows_unsigned_internal_canary_must_not_be_promoted_to_signed",
  ], "protected baseline");
  if (contract.protected_baseline.contract_ref !== "contracts/outlook-addin-forward-rollback-packet.json"
      || !sha256Pattern.test(contract.protected_baseline.contract_sha256)
      || !sha256Pattern.test(contract.protected_baseline.desktop_surface_sha256)
      || contract.protected_baseline.desktop_action !== "none_remain_on_sealed_0.1.29"
      || contract.protected_baseline.version_floor !== "0.1.29"
      || contract.protected_baseline.minimum_developer_id_notarized_profile_count !== 1
      || contract.protected_baseline.windows_unsigned_internal_canary_must_not_be_promoted_to_signed !== true) {
    fail("protected baseline policy drifted");
  }
  parseCoreVersion(contract.protected_baseline.version_floor, "protected version floor");
  exact(contract.protected_baseline.platforms, ["macos-arm64", "windows-x64"], "protected platforms");

  exactKeys(contract.enforcement, [
    "always_release_intent_channels",
    "explicit_release_intent_is_irreversible_for_the_process",
    "internal_probe_forbids_developer_id_signing",
    "internal_probe_forbids_notarization",
    "internal_probe_requires_build_receipt_disabled",
    "probe_channels",
    "release_version_rule",
    "release_version_selection_recorded",
    "selected_release_version",
  ], "release enforcement");
  if (contract.enforcement.release_version_rule !== "strictly_greater_than_protected_baseline"
      || contract.enforcement.internal_probe_requires_build_receipt_disabled !== true
      || contract.enforcement.internal_probe_forbids_developer_id_signing !== true
      || contract.enforcement.internal_probe_forbids_notarization !== true
      || contract.enforcement.explicit_release_intent_is_irreversible_for_the_process !== true) {
    fail("release enforcement policy drifted");
  }
  if (contract.enforcement.release_version_selection_recorded === false) {
    if (contract.enforcement.selected_release_version !== null) fail("unrecorded release version must remain null");
  } else if (contract.enforcement.release_version_selection_recorded === true) {
    parseCoreVersion(contract.enforcement.selected_release_version, "selected release version");
  } else {
    fail("release version selection state drifted");
  }
  exact(contract.enforcement.always_release_intent_channels, ["candidate", "formal"], "release-intent channels");
  exact(contract.enforcement.probe_channels, ["dev", "internal"], "probe channels");

  exactKeys(contract.claims, [
    "candidate_artifact_built",
    "candidate_artifact_signed",
    "production_ready",
    "rollback_verified",
    "upgrade_verified",
  ], "release claims");
  if (Object.values(contract.claims).some((value) => value !== false)) fail("release claims must remain false");
}

function validateProtectedDesktopSurface(contract, packet, packetBytes) {
  const baseline = contract.protected_baseline;
  if (sha256(packetBytes) !== baseline.contract_sha256) fail("protected baseline contract hash drifted");
  const desktop = packet?.surfaces?.desktop;
  if (sha256(JSON.stringify(desktop)) !== baseline.desktop_surface_sha256) {
    fail("protected desktop surface hash drifted");
  }
  if (desktop?.action !== baseline.desktop_action || desktop?.mutation_count !== 0) {
    fail("protected desktop action drifted");
  }
  const profiles = desktop?.profiles;
  if (!Array.isArray(profiles)) fail("protected desktop profiles are missing");
  exact(profiles.map(({ platform }) => platform), baseline.platforms, "protected desktop profile order");
  for (const profile of profiles) {
    if (profile.version !== baseline.version_floor
        || !gitObjectPattern.test(profile.source_sha ?? "")
        || !gitObjectPattern.test(profile.source_tree ?? "")) {
      fail(`${profile.platform} protected source identity drifted`);
    }
    if (!profile.package_hashes || Object.values(profile.package_hashes).some((value) => !sha256Pattern.test(value))) {
      fail(`${profile.platform} protected package hashes drifted`);
    }
  }
  const notarizedProfileCount = profiles
    .filter(({ trust_boundary: trustBoundary }) => trustBoundary === "notarized_developer_id_internal")
    .length;
  if (notarizedProfileCount < baseline.minimum_developer_id_notarized_profile_count) {
    fail("Developer ID notarized baseline profile is missing");
  }
  const windows = profiles.find(({ platform }) => platform === "windows-x64");
  if (windows?.trust_boundary !== "unsigned_named_internal_canary_only") {
    fail("Windows unsigned internal canary boundary drifted");
  }
  return notarizedProfileCount;
}

function buildIntent({ mode, channel, environment }) {
  if (mode === "source") return "source_report";
  if (mode === "release") return "release";
  const explicitReleaseIntent = environment.MATTER_DESKTOP_RELEASE_INTENT === "1";
  if (channel === "candidate" || channel === "formal" || explicitReleaseIntent) return "release";
  if (channel === "dev") return "probe";
  const internalProbe = environment.MATTER_DESKTOP_BUILD_RECEIPT === "0"
    && environment.MATTER_DESKTOP_SIGN !== "developer-id"
    && environment.MATTER_DESKTOP_NOTARIZE !== "1";
  return internalProbe ? "probe" : "release";
}

export async function validateAmicOsDesktopReleaseLineage({
  repoRoot = defaultRepoRoot,
  mode = "source",
  environment = process.env,
  contractOverride,
  packetOverride,
  packageOverride,
} = {}) {
  if (!["source", "build", "release"].includes(mode)) fail("mode must be source, build, or release");
  const contract = contractOverride ?? JSON.parse(await readFile(path.join(repoRoot, contractRef), "utf8"));
  validateContract(contract);
  const baselinePath = path.join(repoRoot, contract.protected_baseline.contract_ref);
  const packetBytes = await readFile(baselinePath);
  const packet = packetOverride ?? JSON.parse(packetBytes);
  const notarizedProfileCount = validateProtectedDesktopSurface(contract, packet, packetBytes);

  const desktopPackage = packageOverride ?? JSON.parse(await readFile(path.join(repoRoot, "apps/desktop/package.json"), "utf8"));
  if (desktopPackage.name !== contract.product_identity.technical_package_name) fail("desktop package name drifted");
  parseCoreVersion(desktopPackage.version, "desktop source version");
  const channel = environment.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
  const channelConfig = desktopReleaseChannelConfig(channel);
  if (channelConfig.channel === "internal"
      && (channelConfig.appId !== contract.product_identity.internal_app_id
        || channelConfig.windowsExecutableName !== contract.product_identity.technical_executable_name)) {
    fail("internal channel technical identity drifted");
  }

  const intent = buildIntent({ mode, channel, environment });
  if (channel === "dev" && intent === "release") fail("dev channel cannot carry release intent");
  const comparison = compareDesktopCoreVersions(desktopPackage.version, contract.protected_baseline.version_floor);
  const versionForward = comparison > 0;
  if (intent === "release" && !versionForward) {
    fail(`release version ${desktopPackage.version} must be greater than protected baseline ${contract.protected_baseline.version_floor}`);
  }
  const releaseVersionSelected = contract.enforcement.release_version_selection_recorded === true
    && contract.enforcement.selected_release_version === desktopPackage.version;
  if (intent === "release" && !releaseVersionSelected) {
    fail(`release intent requires the exact desktop version ${desktopPackage.version} to be recorded in the lineage contract`);
  }

  return Object.freeze({
    schema_version: "law-firm-os.amic-os-desktop-release-lineage-validation.v1",
    verdict: "PASS",
    mode,
    intent,
    channel,
    user_visible_product: contract.product_identity.user_visible_product,
    technical_executable_name: contract.product_identity.technical_executable_name,
    current_version: desktopPackage.version,
    protected_version_floor: contract.protected_baseline.version_floor,
    version_comparison: comparison,
    version_forward: versionForward,
    release_eligible: intent === "release" && versionForward && releaseVersionSelected,
    probe_only: intent === "probe",
    protected_profile_count: contract.protected_baseline.platforms.length,
    developer_id_notarized_profile_count: notarizedProfileCount,
    windows_unsigned_internal_canary_preserved: true,
    release_version_selected: releaseVersionSelected,
    selected_release_version: contract.enforcement.selected_release_version,
    candidate_artifact_built: false,
    candidate_artifact_signed: false,
    production_ready: false,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const option = process.argv[2] ?? "--source";
  if (option === "--help") {
    process.stdout.write(`${usage}\n`);
  } else if (!["--source", "--build", "--release"].includes(option) || process.argv.length !== 3) {
    process.stderr.write(`${usage}\n`);
    process.exitCode = 2;
  } else {
    validateAmicOsDesktopReleaseLineage({ mode: option.slice(2) })
      .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
      .catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
      });
  }
}
