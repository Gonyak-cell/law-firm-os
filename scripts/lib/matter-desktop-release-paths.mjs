import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  desktopReleaseChannelConfig,
} from "./matter-desktop-provenance.mjs";

export const DESKTOP_RELEASE_ARTIFACT_SCHEMA = "law-firm-os.matter-desktop-release-artifacts.v1";

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function desktopReleaseArtifactRelativeRoot({ version, sourceSha, channel }) {
  assert.match(version ?? "", VERSION_PATTERN, "version must be a semantic version");
  assert.match(sourceSha ?? "", GIT_OBJECT_PATTERN, "sourceSha must be a full 40-character Git SHA");
  const channelConfig = desktopReleaseChannelConfig(channel);
  return path.posix.join(
    "apps/desktop/dist/releases",
    version,
    sourceSha,
    channelConfig.channel,
  );
}

export function desktopReleaseArtifactRoot({ repoRoot, version, sourceSha, channel }) {
  assert.ok(path.isAbsolute(repoRoot ?? ""), "repoRoot must be absolute");
  return path.join(
    repoRoot,
    desktopReleaseArtifactRelativeRoot({ version, sourceSha, channel }),
  );
}

export function assertDesktopReleaseArtifactPath({
  relativePath,
  version,
  sourceSha,
  channel,
}) {
  assert.equal(typeof relativePath, "string", "release artifact path must be a string");
  assert.equal(path.posix.isAbsolute(relativePath), false, "release artifact path must be relative");
  const normalizedPath = path.posix.normalize(relativePath.replaceAll("\\", "/"));
  const artifactRoot = desktopReleaseArtifactRelativeRoot({ version, sourceSha, channel });
  assert.ok(
    normalizedPath.startsWith(artifactRoot + "/"),
    "release artifact path must stay inside the exact SHA-scoped release root: " + artifactRoot,
  );
  return normalizedPath;
}

export function validateDesktopReleaseArtifactIndex(index) {
  assert.ok(index && typeof index === "object", "release artifact index is required");
  assert.equal(index.schema_version, DESKTOP_RELEASE_ARTIFACT_SCHEMA);
  const channelConfig = desktopReleaseChannelConfig(index.channel);
  const artifactRoot = desktopReleaseArtifactRelativeRoot({
    version: index.version,
    sourceSha: index.source_sha,
    channel: index.channel,
  });
  assert.match(index.source_tree ?? "", GIT_OBJECT_PATTERN, "source_tree must be a full Git tree");
  assert.equal(index.source_dirty, false, "release artifact index source_dirty must be false");
  assert.equal(index.app_id, channelConfig.appId, "release artifact index app_id must match channel");
  assert.equal(index.artifact_root, artifactRoot, "release artifact_root must match version, full SHA, and channel");
  assert.equal(
    index.generic_build_paths_are_release_truth,
    false,
    "generic build paths must not be release truth",
  );
  assert.equal(index.public_release_claim, false);
  assert.equal(index.production_go_live_claim, false);
  assert.match(index.renderer?.sha256 ?? "", SHA256_PATTERN);
  assert.ok(Number.isInteger(index.renderer?.file_count) && index.renderer.file_count > 0);
  assert.equal(index.renderer?.algorithm, DESKTOP_RENDERER_DIGEST_ALGORITHM);
  assert.equal(new Date(index.generated_at).toISOString(), index.generated_at);
  assert.ok(Array.isArray(index.artifacts) && index.artifacts.length > 0);

  const ids = new Set();
  const paths = new Set();
  for (const artifact of index.artifacts) {
    assert.equal(typeof artifact.id, "string");
    assert.ok(artifact.id.length > 0);
    assert.equal(ids.has(artifact.id), false, "duplicate release artifact id: " + artifact.id);
    ids.add(artifact.id);
    const artifactPath = assertDesktopReleaseArtifactPath({
      relativePath: artifact.path,
      version: index.version,
      sourceSha: index.source_sha,
      channel: index.channel,
    });
    assert.equal(paths.has(artifactPath), false, "duplicate release artifact path: " + artifactPath);
    paths.add(artifactPath);
    assert.ok(Number.isInteger(artifact.bytes) && artifact.bytes > 0);
    assert.match(artifact.sha256 ?? "", SHA256_PATTERN);
  }
  return index;
}

export function readDesktopReleaseArtifactStage({ repoRoot, version, sourceSha, channel }) {
  const artifactRoot = desktopReleaseArtifactRoot({ repoRoot, version, sourceSha, channel });
  const relativeRoot = desktopReleaseArtifactRelativeRoot({ version, sourceSha, channel });
  const indexPath = path.join(artifactRoot, "artifact-index.json");
  const checksumsPath = path.join(artifactRoot, "checksums.sha256");
  assert.equal(existsSync(indexPath), true, "missing SHA-scoped release artifact index");
  assert.equal(existsSync(checksumsPath), true, "missing SHA-scoped release artifact checksums");
  const index = validateDesktopReleaseArtifactIndex(JSON.parse(readFileSync(indexPath, "utf8")));
  const checksums = readFileSync(checksumsPath, "utf8");
  for (const artifact of index.artifacts) {
    const artifactPath = path.join(repoRoot, artifact.path);
    assert.equal(existsSync(artifactPath), true, "missing SHA-scoped release artifact: " + artifact.path);
    assert.equal(statSync(artifactPath).isFile(), true, "release artifact must be a file: " + artifact.path);
    const digest = createHash("sha256").update(readFileSync(artifactPath)).digest("hex");
    assert.equal(digest, artifact.sha256, "release artifact sha256 mismatch: " + artifact.path);
    assert.ok(
      checksums.includes(artifact.sha256 + "  " + artifact.path),
      "release artifact checksum entry missing: " + artifact.path,
    );
  }
  return {
    artifactRoot,
    relativeRoot,
    indexPath,
    checksumsPath,
    index,
    checksums,
  };
}

export function requireDesktopReleaseArtifact(index, id) {
  const artifact = index.artifacts.find((candidate) => candidate.id === id);
  assert.ok(artifact, "missing required SHA-scoped release artifact: " + id);
  return artifact;
}
