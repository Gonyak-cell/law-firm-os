import assert from "node:assert/strict";
import test from "node:test";
import {
  DESKTOP_RELEASE_CHANNELS,
  assertDesktopFormalBuildProvenance,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
} from "../lib/matter-desktop-provenance.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const RENDERER = {
  sha256: "c".repeat(64),
  file_count: 28,
  algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
};

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
