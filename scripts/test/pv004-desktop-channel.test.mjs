import assert from "node:assert/strict";
import test from "node:test";
import {
  DESKTOP_RELEASE_CHANNELS,
  assertDesktopFormalBuildProvenance,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
  desktopReleaseChannelPolicy,
  validateDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const RENDERER = {
  sha256: "c".repeat(64),
  file_count: 28,
  algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
};

function runtimeFor(channel) {
  const policy = desktopReleaseChannelPolicy(channel);
  return {
    requestedRuntimeMode: policy.dataMode,
    effectiveRuntimeMode: policy.dataMode,
    runtimeIncluded: policy.dataMode !== "none",
    runtimeDataClass: policy.allowedDataClasses[policy.dataMode],
    nonDistributable: !policy.distributable,
    distributable: policy.distributable,
  };
}

test("PV-004 defines exactly four collision-free desktop release channels", () => {
  assert.deepEqual(DESKTOP_RELEASE_CHANNELS, ["dev", "internal", "candidate", "formal"]);
  const configs = DESKTOP_RELEASE_CHANNELS.map(desktopReleaseChannelConfig);

  assert.equal(new Set(configs.map(({ appId }) => appId)).size, configs.length);
  assert.equal(new Set(configs.map(({ artifactPrefix }) => artifactPrefix)).size, configs.length);
  assert.deepEqual(configs.map(({ appId }) => appId), [
    "com.amic.matter.desktop.dev",
    "com.amic.matter.desktop.internal",
    "com.amic.matter.desktop.candidate",
    "com.amic.matter.desktop",
  ]);
  assert.deepEqual(configs.map(({ artifactPrefix }) => artifactPrefix), [
    "matter-dev",
    "matter-internal",
    "matter-candidate",
    "matter",
  ]);
});

test("PV-004 rejects unknown channels instead of falling back to another app identity", () => {
  assert.throws(() => desktopReleaseChannelConfig("preview"), /release channel must be one of/);
  assert.throws(() => desktopReleaseChannelConfig(""), /release channel must be one of/);
  assert.throws(() => desktopReleaseChannelPolicy("preview"), /release channel must be one of/);
});

test("PV-004 freezes policy objects and exposes observable channel behavior", () => {
  for (const channel of DESKTOP_RELEASE_CHANNELS) {
    const policy = desktopReleaseChannelPolicy(channel);
    const bundledMode = ["dev", "internal"].includes(channel) ? "synthetic" : "none";
    const privateLocalAllowed = ["dev", "internal"].includes(channel);
    assert.equal(policy.dataMode, bundledMode);
    assert.equal(policy.allowedDataModes.includes(bundledMode), true);
    assert.equal(policy.allowedDataClasses[bundledMode], bundledMode === "none" ? "none" : "synthetic_only");
    if (privateLocalAllowed) assert.equal(policy.allowedDataClasses["private-local"], "private_local");
    assert.equal(policy.privateLocalAllowed, privateLocalAllowed);
    assert.equal(policy.privateLocalRequiresExplicitGuards, privateLocalAllowed);
    assert.equal(policy.apiTarget, privateLocalAllowed ? "local_api" : "external_authenticated_api");
    assert.equal(policy.thinClient, !privateLocalAllowed);
    assert.equal(policy.distributable, channel === "formal");
  }
  for (const channel of DESKTOP_RELEASE_CHANNELS) {
    const policy = desktopReleaseChannelPolicy(channel);
    assert.equal(Object.isFrozen(policy), true);
    assert.equal(Object.isFrozen(policy.allowedDataModes), true);
    assert.equal(Object.isFrozen(policy.allowedDataClasses), true);
  }
  const formalPolicy = desktopReleaseChannelPolicy("formal");
  assert.throws(() => { formalPolicy.dataMode = "private-local"; }, TypeError);
  assert.throws(() => { formalPolicy.allowedDataModes.push("private-local"); }, TypeError);
});

test("PV-004 build manifests bind every channel to its canonical app ID", () => {
  for (const channel of DESKTOP_RELEASE_CHANNELS) {
    const config = desktopReleaseChannelConfig(channel);
    const manifest = createDesktopBuildManifest({
      version: "0.1.17",
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      sourceDirty: false,
      renderer: RENDERER,
      channel,
      platform: "darwin",
      arch: "arm64",
      appId: config.appId,
      ...runtimeFor(channel),
      builtAt: "2026-07-16T00:00:00.000Z",
    });

    assert.equal(manifest.channel, channel);
    assert.equal(manifest.app_id, config.appId);
    assert.throws(
      () => createDesktopBuildManifest({
        version: "0.1.17",
        sourceSha: SOURCE_SHA,
        sourceTree: SOURCE_TREE,
        sourceDirty: false,
        renderer: RENDERER,
        channel,
        platform: "darwin",
        arch: "arm64",
        appId: "com.amic.matter.desktop.wrong",
        ...runtimeFor(channel),
        builtAt: "2026-07-16T00:00:00.000Z",
      }),
      /app_id must match release channel/,
    );
  }
});

test("PV-004 keeps the clean-SHA gate formal-only", () => {
  const sourceIdentity = {
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: true,
    sourceBranch: "codex/local-work",
    sourceDirtyPaths: ["dirty.txt"],
    ignoredEvidenceDirtyPaths: [],
  };

  for (const releaseChannel of ["dev", "internal", "candidate"]) {
    assert.deepEqual(
      assertDesktopFormalBuildProvenance({ releaseChannel, sourceIdentity }),
      { enforced: false, verdict: "NOT_APPLICABLE" },
    );
  }
  assert.throws(
    () => assertDesktopFormalBuildProvenance({ releaseChannel: "formal", sourceIdentity }),
    /formal build blocked: Git worktree is dirty/,
  );
});

test("PV-004 rejects manifests whose runtime claim is not the channel policy", () => {
  const manifest = createDesktopBuildManifest({
    version: "0.1.17",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: RENDERER,
    channel: "internal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop.internal",
    ...runtimeFor("internal"),
    builtAt: "2026-07-16T00:00:00.000Z",
  });
  assert.throws(
    () => validateDesktopBuildManifest({
      ...manifest,
      runtime_data_class: "none",
    }),
    /runtime data class must match the policy mode/,
  );
  assert.throws(
    () => validateDesktopBuildManifest({
      ...manifest,
      policy: { ...manifest.policy, allowed_data_modes: ["none"] },
    }),
    /manifest policy must match its release channel/,
  );
});
