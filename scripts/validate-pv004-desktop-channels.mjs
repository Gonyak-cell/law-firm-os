#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DESKTOP_RELEASE_CHANNELS,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
  desktopReleaseChannelPolicy,
} from "./lib/matter-desktop-provenance.mjs";

const usage = "usage: node scripts/validate-pv004-desktop-channels.mjs [--source|--help]";
const command = process.argv[2] ?? "--source";
if (command === "--help") {
  console.log(usage);
  console.log("Checks the collision-free dev/internal/candidate/formal desktop channel and package metadata contract.");
  process.exit(0);
}
if (command !== "--source" || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(ROOT) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${ROOT}`);

const channelMatrix = DESKTOP_RELEASE_CHANNELS.map((channel) => desktopReleaseChannelConfig(channel));
assert.deepEqual(DESKTOP_RELEASE_CHANNELS, ["dev", "internal", "candidate", "formal"]);
assert.equal(new Set(channelMatrix.map(({ appId }) => appId)).size, channelMatrix.length, "desktop app IDs must be unique");
assert.equal(new Set(channelMatrix.map(({ artifactPrefix }) => artifactPrefix)).size, channelMatrix.length, "desktop artifact prefixes must be unique");
assert.equal(channelMatrix.filter(({ formal }) => formal).length, 1, "only the formal channel may be formal");

const sourceSha = "a".repeat(40);
const sourceTree = "b".repeat(40);
const renderer = {
  sha256: "c".repeat(64),
  file_count: 1,
  algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
};
for (const config of channelMatrix) {
  const policy = desktopReleaseChannelPolicy(config.channel);
  for (const [platform, arch] of [["darwin", "arm64"], ["win32", "x64"]]) {
    const manifest = createDesktopBuildManifest({
      version: "0.1.17",
      sourceSha,
      sourceTree,
      sourceDirty: false,
      renderer,
      channel: config.channel,
      platform,
      arch,
      appId: config.appId,
      requestedRuntimeMode: policy.dataMode,
      effectiveRuntimeMode: policy.dataMode,
      runtimeIncluded: policy.dataMode !== "none",
      runtimeDataClass: policy.allowedDataClasses[policy.dataMode],
      nonDistributable: !policy.distributable,
      distributable: policy.distributable,
      builtAt: "2026-07-16T00:00:00.000Z",
    });
    assert.equal(manifest.app_id, config.appId);
  }
}

const builderPaths = [
  "scripts/build-matter-desktop-mac.mjs",
  "scripts/build-matter-desktop-win.mjs",
  "scripts/build-matter-desktop-win-installer.mjs",
];
const bypasses = [];
for (const relativePath of builderPaths) {
  const source = readFileSync(path.join(ROOT, relativePath), "utf8");
  if (!source.includes("desktopReleaseChannelConfig")) bypasses.push(`${relativePath}:config`);
  if (!source.includes("channelConfig.appId")) bypasses.push(`${relativePath}:app-id`);
  if (!source.includes("channelConfig.artifactPrefix")) bypasses.push(`${relativePath}:artifact-prefix`);
  if (!source.includes("copyDesktopLocalApiRuntime")) bypasses.push(`${relativePath}:runtime-stager`);
  if (!source.includes("runtimeMetadata")) bypasses.push(`${relativePath}:runtime-manifest-binding`);
  if (/\["internal",\s*"formal"\]/.test(source)) bypasses.push(`${relativePath}:legacy-two-channel-list`);
}
assert.deepEqual(bypasses, [], `PV-004 channel registry bypasses found: ${bypasses.join(", ")}`);

console.log(JSON.stringify({
  verdict: "PASS",
  mode: "source",
  channels: channelMatrix.map(({ receiptSigningKey: _receiptSigningKey, ...config }) => config),
  channel_count: channelMatrix.length,
  unique_app_id_count: new Set(channelMatrix.map(({ appId }) => appId)).size,
  unique_artifact_prefix_count: new Set(channelMatrix.map(({ artifactPrefix }) => artifactPrefix)).size,
  platform_manifest_contract_count: channelMatrix.length * 2,
  protected_builders: builderPaths,
  channel_registry_bypass_count: bypasses.length,
}, null, 2));
