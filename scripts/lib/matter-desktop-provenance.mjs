import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const DESKTOP_BUILD_MANIFEST_SCHEMA = "law-firm-os.matter-desktop-build-provenance.v1";
export const DESKTOP_RENDERER_DIGEST_ALGORITHM = "sha256(sorted sha256 file manifest with ./ relative paths)";
export const DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM = "sha256(UTF-8 byte-sorted sha256 bytes file manifest with ./ relative paths)";
export const DESKTOP_INSTALLED_TREE_SBOM_SCHEMA = "law-firm-os.matter-desktop-installed-tree-sbom.v1";
export const DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA = "law-firm-os.windows-installed-tree-native-snapshot.v1";
export const DESKTOP_RELEASE_CHANNELS = Object.freeze(["dev", "internal", "candidate", "formal"]);

const DESKTOP_RELEASE_CHANNEL_CONFIG = Object.freeze({
  dev: Object.freeze({
    channel: "dev",
    appId: "com.amic.matter.desktop.dev",
    artifactPrefix: "matter-dev",
    windowsArtifactPrefix: "matter-dev",
    windowsProductName: "matter",
    windowsExecutableName: "matter",
    macAppBundleName: "matter.app",
    macArtifactPrefix: "matter-dev",
    macDisplayName: "matter",
    macVolumeName: "matter",
    receiptLabel: "Development",
    receiptStatusPrefix: "dev",
    receiptSigningKey: "matter-dev-nonproduction-signing-key",
    formal: false,
  }),
  internal: Object.freeze({
    channel: "internal",
    appId: "com.amic.matter.desktop.internal",
    artifactPrefix: "matter-internal",
    windowsArtifactPrefix: "AMIC-OS-internal",
    windowsProductName: "AMIC OS",
    windowsExecutableName: "matter",
    macAppBundleName: "AMIC OS.app",
    macArtifactPrefix: "AMIC-OS-internal",
    macDisplayName: "AMIC OS",
    macVolumeName: "AMIC OS",
    receiptLabel: "Internal",
    receiptStatusPrefix: "internal",
    receiptSigningKey: "matter-internal-nonproduction-signing-key",
    formal: false,
  }),
  candidate: Object.freeze({
    channel: "candidate",
    appId: "com.amic.matter.desktop.candidate",
    artifactPrefix: "matter-candidate",
    windowsArtifactPrefix: "matter-candidate",
    windowsProductName: "matter",
    windowsExecutableName: "matter",
    macAppBundleName: "matter.app",
    macArtifactPrefix: "matter-candidate",
    macDisplayName: "matter",
    macVolumeName: "matter",
    receiptLabel: "Candidate",
    receiptStatusPrefix: "candidate",
    receiptSigningKey: "matter-candidate-nonproduction-signing-key",
    formal: false,
  }),
  formal: Object.freeze({
    channel: "formal",
    appId: "com.amic.matter.desktop",
    artifactPrefix: "matter",
    windowsArtifactPrefix: "matter",
    windowsProductName: "matter",
    windowsExecutableName: "matter",
    macAppBundleName: "matter.app",
    macArtifactPrefix: "matter",
    macDisplayName: "matter",
    macVolumeName: "matter",
    receiptLabel: "Formal Release Candidate",
    receiptStatusPrefix: "formal_release_candidate",
    receiptSigningKey: "matter-formal-candidate-nonproduction-signing-key",
    formal: true,
  }),
});

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const FORMAL_BUILD_BRANCH_PATTERNS = [
  /^main$/,
  /^integration\/forest-v\d+\.\d+\.\d+$/,
  /^release\/forest-v\d+\.\d+\.\d+$/,
];
const GENERATED_BUILD_EVIDENCE_PATHS = new Set([
  "docs/desktop/matter-desktop-formal-release-receipt.md",
  "docs/desktop/matter-desktop-temporary-release-receipt.md",
  "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md",
  "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md",
]);
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

export function desktopReleaseChannelConfig(channel = "internal") {
  assert.ok(
    DESKTOP_RELEASE_CHANNELS.includes(channel),
    `release channel must be one of: ${DESKTOP_RELEASE_CHANNELS.join(", ")}`,
  );
  return DESKTOP_RELEASE_CHANNEL_CONFIG[channel];
}

export function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

export function assertPathOutsideWorktree({ repoRoot, candidate, label = "path" }) {
  assert.equal(typeof candidate, "string", `${label} must be a path`);
  assert.ok(candidate && !candidate.includes("\0"), `${label} must be a non-empty path`);
  const worktree = realpathSync(repoRoot);
  const target = path.resolve(candidate);
  let existingAncestor = target;
  let ancestorStat;
  while (!ancestorStat) {
    try {
      ancestorStat = lstatSync(existingAncestor);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
    }
    if (ancestorStat) break;
    const parent = path.dirname(existingAncestor);
    assert.notEqual(parent, existingAncestor, `${label} has no existing ancestor`);
    existingAncestor = parent;
  }
  assert.equal(ancestorStat.isSymbolicLink(), false, `${label} cannot traverse a symlink entry`);
  const canonicalTarget = path.resolve(
    realpathSync(existingAncestor),
    path.relative(existingAncestor, target),
  );
  const relativeTarget = path.relative(worktree, canonicalTarget);
  assert.ok(
    relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget),
    `${label} must remain outside the worktree`,
  );
  return target;
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
  const portableRelativePath = (filePath) => path.relative(directoryPath, filePath).split(path.sep).join("/");
  files.sort((left, right) => portableRelativePath(left).localeCompare(portableRelativePath(right)));
  const fileManifest = files.map((filePath) => (
    `${sha256File(filePath)}  ./${portableRelativePath(filePath)}\n`
  )).join("");
  return {
    sha256: sha256(fileManifest),
    file_count: files.length,
    algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM,
  };
}

export function directoryFileInventory(directoryPath) {
  const requestedRoot = lstatSync(directoryPath);
  assert.equal(requestedRoot.isSymbolicLink(), false, "installed-tree root cannot be a symbolic link");
  assert.equal(requestedRoot.isDirectory(), true, "installed-tree root must be a directory");
  const root = realpathSync(directoryPath);
  const files = [];
  let totalBytes = 0;
  const portableRelativePath = (filePath) => path.relative(root, filePath).split(path.sep).join("/");
  const assertContained = (candidate, label) => {
    const relative = path.relative(root, realpathSync(candidate));
    assert.ok(
      relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`)),
      `${label} escapes the installed tree`,
    );
  };
  const sameSnapshot = (left, right) => left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.birthtimeNs === right.birthtimeNs;
  const readStableFile = (absolutePath, relativePath) => {
    const noFollow = constants.O_NOFOLLOW ?? 0;
    let descriptor;
    try {
      descriptor = openSync(absolutePath, constants.O_RDONLY | noFollow);
      const before = fstatSync(descriptor, { bigint: true });
      const openedPath = lstatSync(absolutePath, { bigint: true });
      const openedTarget = realpathSync(absolutePath);
      assert.equal(before.isFile(), true, `installed-tree entry is not a regular file: ${relativePath}`);
      assert.equal(before.nlink, 1n, `installed-tree file is hard-linked: ${relativePath}`);
      assert.equal(openedPath.isSymbolicLink(), false, `installed-tree file became a symbolic link: ${relativePath}`);
      assert.equal(sameSnapshot(before, openedPath), true, `installed-tree file changed before hashing: ${relativePath}`);
      assertContained(openedTarget, "installed-tree opened file");
      assert.equal(sameSnapshot(before, statSync(openedTarget, { bigint: true })), true, `installed-tree file identity changed before hashing: ${relativePath}`);
      const bytes = readFileSync(descriptor);
      const after = fstatSync(descriptor, { bigint: true });
      const closedPath = lstatSync(absolutePath, { bigint: true });
      const closedTarget = realpathSync(absolutePath);
      assert.equal(closedPath.isSymbolicLink(), false, `installed-tree file became a symbolic link: ${relativePath}`);
      assert.equal(openedTarget, closedTarget, `installed-tree file target changed while hashing: ${relativePath}`);
      assertContained(closedTarget, "installed-tree closed file");
      assert.equal(sameSnapshot(before, after), true, `installed-tree file changed while hashing: ${relativePath}`);
      assert.equal(sameSnapshot(after, closedPath), true, `installed-tree file path changed while hashing: ${relativePath}`);
      assert.equal(sameSnapshot(after, statSync(closedTarget, { bigint: true })), true, `installed-tree file identity changed while hashing: ${relativePath}`);
      assert.equal(after.size, BigInt(bytes.length), `installed-tree file size changed while hashing: ${relativePath}`);
      return bytes;
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
  };
  function visit(currentPath) {
    const beforeDirectory = lstatSync(currentPath, { bigint: true });
    const beforeTarget = realpathSync(currentPath);
    assert.equal(beforeDirectory.isSymbolicLink(), false, "installed-tree directory cannot be a symbolic link");
    assert.equal(beforeDirectory.isDirectory(), true, "installed-tree directory entry is invalid");
    assertContained(currentPath, "installed-tree directory");
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      const stat = lstatSync(absolutePath);
      assert.equal(stat.isSymbolicLink(), false, `installed tree cannot contain symbolic links: ${absolutePath}`);
      if (stat.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      assert.equal(stat.isFile(), true, `installed tree entries must be regular files: ${absolutePath}`);
      assert.equal(stat.nlink, 1, `installed tree files cannot be hard-linked: ${absolutePath}`);
      assertContained(absolutePath, "installed-tree file");
      const relativePath = portableRelativePath(absolutePath);
      assert.ok(relativePath && !relativePath.startsWith("../"), "installed-tree file path is invalid");
      assert.equal(relativePath, relativePath.normalize("NFC"), "installed-tree file paths must use NFC");
      assert.doesNotMatch(relativePath, /[\0\r\n]/u, "installed-tree file paths cannot contain control delimiters");
      const bytes = readStableFile(absolutePath, relativePath);
      assert.equal(bytes.length, stat.size, `installed-tree file changed before hashing: ${relativePath}`);
      totalBytes += bytes.length;
      assert.ok(Number.isSafeInteger(totalBytes), "installed-tree byte count exceeds the safe integer range");
      files.push(Object.freeze({
        path: `./${relativePath}`,
        bytes: bytes.length,
        sha256: sha256(bytes),
      }));
    }
    const afterDirectory = lstatSync(currentPath, { bigint: true });
    const afterTarget = realpathSync(currentPath);
    assert.equal(beforeTarget, afterTarget, "installed-tree directory target changed while hashing");
    assert.equal(sameSnapshot(beforeDirectory, afterDirectory), true, "installed-tree directory changed while hashing");
  }
  visit(root);
  files.sort((left, right) => Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")));
  assert.equal(new Set(files.map(({ path: filePath }) => filePath)).size, files.length, "installed-tree file paths must be unique");
  const fileManifest = files.map((file) => (
    `${file.sha256} ${file.bytes} ${file.path}\n`
  )).join("");
  return Object.freeze({
    sha256: sha256(fileManifest),
    file_count: files.length,
    bytes: totalBytes,
    algorithm: DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM,
    files: Object.freeze(files),
  });
}

function sriSha512(integrity, label) {
  assert.match(integrity ?? "", /^sha512-[A-Za-z0-9+/]+={0,2}$/u, `${label} integrity must be SHA-512 SRI`);
  const digest = Buffer.from(integrity.slice("sha512-".length), "base64");
  assert.equal(digest.length, 64, `${label} integrity must decode to 64 bytes`);
  return digest.toString("hex").toUpperCase();
}

export function buildMatterDesktopInstalledTreeSbom({
  packageLock,
  desktopPackage,
  inventory,
  sourceSha,
  sourceTree,
  installerSha256,
  packagedExecutableSha256,
  installedExecutableSha256,
  installedExecutableRelativePath,
  authenticodeValid,
  signerCertificateSha1 = null,
  timestampCertificateSha1s = [],
  generatedAt,
}) {
  assert.equal(packageLock?.lockfileVersion, 3, "npm lockfile v3 is required for desktop SBOM");
  const workspace = packageLock.packages?.["apps/desktop"];
  assert.equal(workspace?.name, desktopPackage?.name, "desktop SBOM workspace name changed");
  assert.equal(workspace?.version, desktopPackage?.version, "desktop SBOM workspace version changed");
  assert.match(sourceSha ?? "", GIT_OBJECT_PATTERN, "desktop SBOM source SHA is invalid");
  assert.match(sourceTree ?? "", GIT_OBJECT_PATTERN, "desktop SBOM source tree is invalid");
  assert.match(installedExecutableRelativePath ?? "", /^\.\/(?!\.\.\/)[^\\\0\r\n]+$/u, "installed executable relative path is invalid");
  const installedExecutablePathBody = installedExecutableRelativePath.slice(2);
  assert.equal(path.posix.normalize(installedExecutablePathBody), installedExecutablePathBody, "installed executable relative path must be canonical");
  assert.equal(installedExecutableRelativePath, installedExecutableRelativePath.normalize("NFC"), "installed executable relative path must use NFC");
  for (const [label, value] of Object.entries({
    installerSha256,
    packagedExecutableSha256,
    installedExecutableSha256,
    installedTreeSha256: inventory?.sha256,
  })) assert.match(value ?? "", SHA256_PATTERN, `${label} is invalid`);
  assert.equal(packagedExecutableSha256, installedExecutableSha256, "installed executable bytes differ from packaged executable");
  assert.equal(inventory?.algorithm, DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM);
  assert.ok(Number.isInteger(inventory?.file_count) && inventory.file_count > 0, "installed-tree SBOM requires files");
  assert.ok(Number.isSafeInteger(inventory?.bytes) && inventory.bytes > 0, "installed-tree SBOM requires bytes");
  assert.ok(Array.isArray(inventory?.files) && inventory.files.length === inventory.file_count);
  assert.equal(inventory?.native?.schema_version, DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA);
  assert.equal(inventory?.native?.filesystem, "NTFS", "installed-tree SBOM requires an NTFS native snapshot");
  assert.ok(Number.isInteger(inventory?.native?.directory_count) && inventory.native.directory_count > 0, "installed-tree SBOM requires native directory identities");
  assert.match(inventory?.native?.identity_sha256 ?? "", SHA256_PATTERN, "installed-tree native identity digest is invalid");
  assert.deepEqual(inventory?.native?.fixed_point_sequence, ["B0", "I1", "B1", "I2", "B2"]);
  assert.equal(inventory?.native?.fixed_point_exact, true, "installed-tree native fixed point is not exact");
  assert.equal(
    inventory?.native?.equality_proof,
    "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY",
    "installed-tree native equality proof is invalid",
  );
  assert.ok(Array.isArray(inventory?.native?.phases) && inventory.native.phases.length === 5, "installed-tree native phases are incomplete");
  for (const [index, phase] of inventory.native.phases.entries()) {
    assert.equal(phase?.name, inventory.native.fixed_point_sequence[index]);
    assert.equal(phase?.content_sha256, inventory.sha256);
    assert.equal(phase?.identity_sha256, inventory.native.identity_sha256);
    assert.equal(phase?.file_count, inventory.file_count);
    assert.equal(phase?.directory_count, inventory.native.directory_count);
    assert.equal(phase?.bytes, inventory.bytes);
  }
  assert.equal(inventory?.native?.reparse_point_count, 0);
  assert.equal(inventory?.native?.alternate_data_stream_count, 0);
  assert.equal(inventory?.native?.hard_link_count, 0);
  const installedExecutableEntry = inventory.files.find(({ path: filePath }) => filePath === installedExecutableRelativePath);
  assert.ok(installedExecutableEntry, "installed executable is missing from the installed-tree inventory");
  assert.equal(installedExecutableEntry.sha256, installedExecutableSha256, "installed executable inventory hash differs");
  assert.equal(typeof authenticodeValid, "boolean", "desktop SBOM Authenticode state is required");
  if (authenticodeValid) {
    assert.match(signerCertificateSha1 ?? "", /^[0-9A-F]{40}$/u, "desktop SBOM signer certificate SHA-1 is invalid");
    assert.ok(timestampCertificateSha1s.length > 0, "desktop SBOM timestamp certificate is required");
    for (const thumbprint of timestampCertificateSha1s) {
      assert.match(thumbprint, /^[0-9A-F]{40}$/u, "desktop SBOM timestamp certificate SHA-1 is invalid");
    }
  } else {
    assert.equal(signerCertificateSha1, null, "unsigned desktop SBOM cannot claim a signer");
    assert.deepEqual(timestampCertificateSha1s, [], "unsigned desktop SBOM cannot claim timestamps");
  }
  assert.equal(new Date(generatedAt).toISOString(), generatedAt, "desktop SBOM timestamp must be canonical ISO");
  const dependency = (name, type) => {
    const descriptor = packageLock.packages?.[`node_modules/${name}`];
    assert.ok(descriptor, `desktop SBOM dependency is missing from lockfile: ${name}`);
    assert.equal(descriptor.license, "MIT", `desktop SBOM dependency license changed: ${name}`);
    return {
      type,
      "bom-ref": `pkg:npm/${name}@${descriptor.version}`,
      name,
      version: descriptor.version,
      scope: "required",
      hashes: [{ alg: "SHA-512", content: sriSha512(descriptor.integrity, name) }],
      licenses: [{ license: { id: descriptor.license } }],
      purl: `pkg:npm/${name}@${descriptor.version}`,
      externalReferences: [{ type: "distribution", url: descriptor.resolved }],
    };
  };
  const dependencyComponents = [dependency("electron", "framework"), dependency("unpdf", "library")];
  const fileComponents = inventory.files.map((file) => ({
    type: "file",
    "bom-ref": `urn:law-firm-os:installed-file:${sha256(file.path)}`,
    name: file.path,
    hashes: [{ alg: "SHA-256", content: file.sha256.toUpperCase() }],
    properties: [{ name: "law-firm-os:file-bytes", value: String(file.bytes) }],
  }));
  const rootRef = `pkg:npm/%40law-firm-os/desktop@${desktopPackage.version}`;
  const properties = [
    ["schema-version", DESKTOP_INSTALLED_TREE_SBOM_SCHEMA],
    ["source-sha", sourceSha],
    ["source-tree", sourceTree],
    ["installer-sha256", installerSha256],
    ["packaged-executable-sha256", packagedExecutableSha256],
    ["installed-executable-sha256", installedExecutableSha256],
    ["installed-executable-path", installedExecutableRelativePath],
    ["installed-tree-sha256", inventory.sha256],
    ["installed-tree-file-count", String(inventory.file_count)],
    ["installed-tree-bytes", String(inventory.bytes)],
    ["installed-file-content-complete", "true"],
    ["installed-directory-identity-complete", "true"],
    ["native-snapshot-schema-version", inventory.native.schema_version],
    ["native-filesystem", inventory.native.filesystem],
    ["native-directory-count", String(inventory.native.directory_count)],
    ["native-identity-sha256", inventory.native.identity_sha256],
    ["native-fixed-point-sequence", inventory.native.fixed_point_sequence.join("->")],
    ["native-fixed-point-exact", String(inventory.native.fixed_point_exact)],
    ["dependency-inventory-complete", "false"],
    ["dependency-inventory-scope", "direct-runtime-declarations"],
    ["reparse-point-count", "0"],
    ["alternate-data-stream-count", "0"],
    ["authenticode-valid", String(authenticodeValid)],
    ["signer-certificate-sha1", signerCertificateSha1 ?? ""],
    ["timestamp-certificate-sha1s", timestampCertificateSha1s.join(",")],
  ].map(([name, value]) => ({ name: `law-firm-os:${name}`, value }));
  const bom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      timestamp: generatedAt,
      component: {
        type: "application",
        "bom-ref": rootRef,
        group: "law-firm-os",
        name: "matter-desktop-windows-installed-tree",
        version: desktopPackage.version,
        properties,
      },
    },
    components: [...dependencyComponents, ...fileComponents],
    dependencies: [{ ref: rootRef, dependsOn: dependencyComponents.map((entry) => entry["bom-ref"]) }],
  };
  return bom;
}

export function readDesktopBuildSourceIdentity(repoRoot) {
  const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
  const gitPaths = (args) => execFileSync("git", args, { cwd: repoRoot })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const dirtyPaths = [...new Set([
    ...gitPaths(["diff", "--name-only", "-z", "HEAD", "--"]),
    ...gitPaths(["ls-files", "--others", "--exclude-standard", "-z"]),
  ])].sort();
  const sourceDirtyPaths = dirtyPaths.filter((filePath) => !GENERATED_BUILD_EVIDENCE_PATHS.has(filePath));
  const ignoredEvidenceDirtyPaths = dirtyPaths.filter((filePath) => GENERATED_BUILD_EVIDENCE_PATHS.has(filePath));
  return {
    sourceSha: git(["rev-parse", "HEAD"]),
    sourceTree: git(["rev-parse", "HEAD^{tree}"]),
    sourceDirty: sourceDirtyPaths.length > 0,
    sourceBranch: git(["branch", "--show-current"]),
    sourceDirtyPaths,
    ignoredEvidenceDirtyPaths,
  };
}

export function assertDesktopFormalBuildProvenance({
  releaseChannel,
  sourceIdentity,
  expectedSourceSha,
}) {
  const channelConfig = desktopReleaseChannelConfig(releaseChannel);
  if (!channelConfig.formal) {
    return { enforced: false, verdict: "NOT_APPLICABLE" };
  }

  assert.ok(sourceIdentity && typeof sourceIdentity === "object", "sourceIdentity is required");
  if (sourceIdentity.sourceDirty) {
    throw new Error(`formal build blocked: Git worktree is dirty (${sourceIdentity.sourceDirtyPaths?.join(", ") || "unknown paths"})`);
  }
  if (typeof expectedSourceSha !== "string" || !GIT_OBJECT_PATTERN.test(expectedSourceSha)) {
    throw new Error("MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA");
  }
  if (sourceIdentity.sourceSha !== expectedSourceSha) {
    throw new Error(`formal build blocked: HEAD ${sourceIdentity.sourceSha} does not match expected source SHA ${expectedSourceSha}`);
  }

  const sourceBranch = sourceIdentity.sourceBranch ?? "";
  const branchAllowed = sourceBranch === ""
    || FORMAL_BUILD_BRANCH_PATTERNS.some((pattern) => pattern.test(sourceBranch));
  if (!branchAllowed) {
    throw new Error(`formal build blocked: branch ${sourceBranch} is not release-authorized`);
  }

  return {
    enforced: true,
    verdict: "PASS",
    source_sha: sourceIdentity.sourceSha,
    source_branch: sourceBranch || "DETACHED",
    ignored_evidence_dirty_paths: sourceIdentity.ignoredEvidenceDirtyPaths ?? [],
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
  const channelConfig = desktopReleaseChannelConfig(manifest.channel);
  assert.ok(["darwin", "win32"].includes(manifest.platform));
  assert.ok(manifest.platform === "darwin" ? ["arm64", "x64"].includes(manifest.arch) : manifest.arch === "x64");
  assert.equal(manifest.app_id, channelConfig.appId, "app_id must match release channel");
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
