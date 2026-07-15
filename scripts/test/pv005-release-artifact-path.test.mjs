import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  assertDesktopReleaseArtifactPath,
  desktopReleaseArtifactRelativeRoot,
  desktopReleaseArtifactRoot,
  validateDesktopReleaseArtifactIndex,
} from "../lib/matter-desktop-release-paths.mjs";

const VERSION = "0.1.17";
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);

function validIndex() {
  const artifactRoot = desktopReleaseArtifactRelativeRoot({
    version: VERSION,
    sourceSha: SOURCE_SHA,
    channel: "internal",
  });
  return {
    schema_version: DESKTOP_RELEASE_ARTIFACT_SCHEMA,
    version: VERSION,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    source_dirty: false,
    channel: "internal",
    app_id: "com.amic.matter.desktop.internal",
    artifact_root: artifactRoot,
    renderer: {
      sha256: "c".repeat(64),
      file_count: 28,
      algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    },
    generated_at: "2026-07-16T00:00:00.000Z",
    generic_build_paths_are_release_truth: false,
    public_release_claim: false,
    production_go_live_claim: false,
    artifacts: [
      {
        id: "macos_zip_archive",
        path: artifactRoot + "/mac/matter-internal-0.1.17-macos.zip",
        bytes: 1,
        sha256: "d".repeat(64),
      },
    ],
  };
}

test("PV-005 derives one exact version/full-SHA/channel release root", () => {
  const relativeRoot = desktopReleaseArtifactRelativeRoot({
    version: VERSION,
    sourceSha: SOURCE_SHA,
    channel: "internal",
  });
  assert.equal(
    relativeRoot,
    "apps/desktop/dist/releases/0.1.17/" + SOURCE_SHA + "/internal",
  );
  assert.equal(
    desktopReleaseArtifactRoot({
      repoRoot: "/repo",
      version: VERSION,
      sourceSha: SOURCE_SHA,
      channel: "internal",
    }),
    path.join("/repo", relativeRoot),
  );
});

test("PV-005 rejects malformed versions, abbreviated SHAs, and unknown channels", () => {
  assert.throws(
    () => desktopReleaseArtifactRelativeRoot({ version: "../0.1.17", sourceSha: SOURCE_SHA, channel: "internal" }),
    /version/,
  );
  assert.throws(
    () => desktopReleaseArtifactRelativeRoot({ version: VERSION, sourceSha: SOURCE_SHA.slice(0, 8), channel: "internal" }),
    /full 40-character Git SHA/,
  );
  assert.throws(
    () => desktopReleaseArtifactRelativeRoot({ version: VERSION, sourceSha: SOURCE_SHA, channel: "preview" }),
    /release channel must be one of/,
  );
});

test("PV-005 permits only paths contained by the exact scoped release root", () => {
  const artifactRoot = desktopReleaseArtifactRelativeRoot({
    version: VERSION,
    sourceSha: SOURCE_SHA,
    channel: "candidate",
  });
  assert.equal(
    assertDesktopReleaseArtifactPath({
      relativePath: artifactRoot + "/win/matter-candidate-0.1.17-win32-x64-unsigned.zip",
      version: VERSION,
      sourceSha: SOURCE_SHA,
      channel: "candidate",
    }),
    artifactRoot + "/win/matter-candidate-0.1.17-win32-x64-unsigned.zip",
  );
  for (const relativePath of [
    "apps/desktop/dist/mac/matter.app",
    "apps/desktop/dist/win/matter-candidate-0.1.17-win32-x64-unsigned.zip",
    "apps/desktop/dist/release/matter-desktop-v0.1.17/release-manifest.json",
    artifactRoot + "/../formal/matter-0.1.17-macos.zip",
  ]) {
    assert.throws(
      () => assertDesktopReleaseArtifactPath({
        relativePath,
        version: VERSION,
        sourceSha: SOURCE_SHA,
        channel: "candidate",
      }),
      /exact SHA-scoped release root/,
    );
  }
});

test("PV-005 release indexes bind every artifact to the exact scoped root", () => {
  const index = validIndex();
  assert.equal(validateDesktopReleaseArtifactIndex(index), index);

  assert.throws(
    () => validateDesktopReleaseArtifactIndex({
      ...index,
      artifacts: [{ ...index.artifacts[0], path: "apps/desktop/dist/mac/matter.app" }],
    }),
    /exact SHA-scoped release root/,
  );
  assert.throws(
    () => validateDesktopReleaseArtifactIndex({ ...index, source_dirty: true }),
    /source_dirty/,
  );
  assert.throws(
    () => validateDesktopReleaseArtifactIndex({ ...index, app_id: "com.amic.matter.desktop" }),
    /app_id/,
  );
  assert.throws(
    () => validateDesktopReleaseArtifactIndex({ ...index, generic_build_paths_are_release_truth: true }),
    /generic build paths/,
  );
});
