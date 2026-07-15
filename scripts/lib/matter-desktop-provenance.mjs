import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const DESKTOP_BUILD_MANIFEST_SCHEMA = "law-firm-os.matter-desktop-build-provenance.v1";
export const DESKTOP_RENDERER_DIGEST_ALGORITHM = "sha256(sorted sha256 file manifest with ./ relative paths)";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const MANIFEST_KEYS = [
  "schema_version",
  "product_name",
  "package_name",
  "version",
  "source_sha",
  "source_tree",
  "source_dirty",
  "renderer",
  "channel",
  "platform",
  "arch",
  "app_id",
  "built_at",
  "public_release_claim",
  "production_go_live_claim",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

export function directoryDigest(directoryPath) {
  const files = [];
  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
    }
  }
  visit(directoryPath);
  files.sort((left, right) => path.relative(directoryPath, left).localeCompare(path.relative(directoryPath, right)));
  const fileManifest = files.map((filePath) => (
    `${sha256File(filePath)}  ./${path.relative(directoryPath, filePath)}\n`
  )).join("");
  return {
    sha256: sha256(fileManifest),
    file_count: files.length,
    algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM,
  };
}

export function readDesktopBuildSourceIdentity(repoRoot) {
  const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
  return {
    sourceSha: git(["rev-parse", "HEAD"]),
    sourceTree: git(["rev-parse", "HEAD^{tree}"]),
    sourceDirty: git(["status", "--porcelain", "--untracked-files=all"]) !== "",
  };
}

export function validateDesktopBuildManifest(manifest) {
  assert.ok(manifest && typeof manifest === "object" && !Array.isArray(manifest), "build manifest must be an object");
  assert.deepEqual(Object.keys(manifest), MANIFEST_KEYS, "build manifest keys must match the PV-002 schema");
  assert.equal(manifest.schema_version, DESKTOP_BUILD_MANIFEST_SCHEMA);
  assert.equal(manifest.product_name, "matter");
  assert.equal(manifest.package_name, "@law-firm-os/desktop");
  assert.match(manifest.version, VERSION_PATTERN);
  assert.match(manifest.source_sha, GIT_OBJECT_PATTERN, "source_sha must be a full 40-character Git SHA");
  assert.match(manifest.source_tree, GIT_OBJECT_PATTERN, "source_tree must be a full 40-character Git tree SHA");
  assert.equal(typeof manifest.source_dirty, "boolean");
  assert.deepEqual(Object.keys(manifest.renderer), ["sha256", "file_count", "algorithm"]);
  assert.match(manifest.renderer.sha256, SHA256_PATTERN);
  assert.ok(Number.isInteger(manifest.renderer.file_count) && manifest.renderer.file_count > 0);
  assert.equal(manifest.renderer.algorithm, DESKTOP_RENDERER_DIGEST_ALGORITHM);
  assert.ok(["internal", "formal"].includes(manifest.channel));
  assert.ok(["darwin", "win32"].includes(manifest.platform));
  assert.ok(manifest.platform === "darwin" ? ["arm64", "x64"].includes(manifest.arch) : manifest.arch === "x64");
  assert.equal(
    manifest.app_id,
    manifest.channel === "formal" ? "com.amic.matter.desktop" : "com.amic.matter.desktop.internal",
  );
  assert.equal(new Date(manifest.built_at).toISOString(), manifest.built_at, "built_at must be a canonical ISO timestamp");
  assert.equal(manifest.public_release_claim, false);
  assert.equal(manifest.production_go_live_claim, false);
  return manifest;
}

export function createDesktopBuildManifest({
  version,
  sourceSha,
  sourceTree,
  sourceDirty,
  renderer,
  channel,
  platform,
  arch,
  appId,
  builtAt = new Date().toISOString(),
}) {
  return validateDesktopBuildManifest({
    schema_version: DESKTOP_BUILD_MANIFEST_SCHEMA,
    product_name: "matter",
    package_name: "@law-firm-os/desktop",
    version,
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_dirty: sourceDirty,
    renderer,
    channel,
    platform,
    arch,
    app_id: appId,
    built_at: builtAt,
    public_release_claim: false,
    production_go_live_claim: false,
  });
}

export function serializeDesktopBuildManifest(manifest) {
  validateDesktopBuildManifest(manifest);
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function writeDesktopBuildManifest({ manifest, internalPath, externalPath }) {
  const body = serializeDesktopBuildManifest(manifest);
  await mkdir(path.dirname(internalPath), { recursive: true });
  await mkdir(path.dirname(externalPath), { recursive: true });
  await writeFile(internalPath, body, "utf8");
  await writeFile(externalPath, body, "utf8");
  return {
    body,
    sha256: sha256(body),
  };
}
