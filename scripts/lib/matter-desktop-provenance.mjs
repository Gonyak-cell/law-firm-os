import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const DESKTOP_BUILD_MANIFEST_SCHEMA = "law-firm-os.matter-desktop-build-provenance.v2";
export const DESKTOP_RELEASE_POLICY_SCHEMA = "law-firm-os.matter-desktop-release-policy.v1";
export const DESKTOP_RENDERER_DIGEST_ALGORITHM = "sha256(sorted sha256 file manifest with ./ relative paths)";
export const DESKTOP_RELEASE_CHANNELS = Object.freeze(["dev", "internal", "candidate", "formal"]);
export const DESKTOP_RUNTIME_DATA_MODES = Object.freeze(["none", "synthetic", "private-local"]);

export const DESKTOP_RELEASE_CHANNEL_POLICY = Object.freeze({
  dev: Object.freeze({
    dataMode: "synthetic",
    allowedDataClass: "synthetic_only",
    allowedDataModes: Object.freeze(["synthetic", "private-local"]),
    allowedDataClasses: Object.freeze({ synthetic: "synthetic_only", "private-local": "private_local" }),
    privateLocalAllowed: true,
    privateLocalRequiresExplicitGuards: true,
    apiTarget: "local_api",
    deploymentTarget: "developer_workstation",
    deliveryTarget: "none",
    distributable: false,
    thinClient: false,
  }),
  internal: Object.freeze({
    dataMode: "synthetic",
    allowedDataClass: "synthetic_only",
    allowedDataModes: Object.freeze(["synthetic", "private-local"]),
    allowedDataClasses: Object.freeze({ synthetic: "synthetic_only", "private-local": "private_local" }),
    privateLocalAllowed: true,
    privateLocalRequiresExplicitGuards: true,
    apiTarget: "local_api",
    deploymentTarget: "internal_qa",
    deliveryTarget: "internal_only",
    distributable: false,
    thinClient: false,
  }),
  candidate: Object.freeze({
    dataMode: "none",
    allowedDataClass: "none",
    allowedDataModes: Object.freeze(["none"]),
    allowedDataClasses: Object.freeze({ none: "none" }),
    privateLocalAllowed: false,
    privateLocalRequiresExplicitGuards: false,
    apiTarget: "external_authenticated_api",
    deploymentTarget: "controlled_review",
    deliveryTarget: "controlled_review_only",
    distributable: false,
    thinClient: true,
  }),
  formal: Object.freeze({
    dataMode: "none",
    allowedDataClass: "none",
    allowedDataModes: Object.freeze(["none"]),
    allowedDataClasses: Object.freeze({ none: "none" }),
    privateLocalAllowed: false,
    privateLocalRequiresExplicitGuards: false,
    apiTarget: "external_authenticated_api",
    deploymentTarget: "formal_distribution",
    deliveryTarget: "external_distribution",
    distributable: true,
    thinClient: true,
  }),
});

const DESKTOP_RELEASE_CHANNEL_CONFIG = Object.freeze({
  dev: Object.freeze({
    channel: "dev",
    appId: "com.amic.matter.desktop.dev",
    artifactPrefix: "matter-dev",
    receiptLabel: "Development",
    receiptStatusPrefix: "dev",
    receiptSigningKey: "matter-dev-nonproduction-signing-key",
    formal: false,
  }),
  internal: Object.freeze({
    channel: "internal",
    appId: "com.amic.matter.desktop.internal",
    artifactPrefix: "matter-internal",
    receiptLabel: "Internal",
    receiptStatusPrefix: "internal",
    receiptSigningKey: "matter-internal-nonproduction-signing-key",
    formal: false,
  }),
  candidate: Object.freeze({
    channel: "candidate",
    appId: "com.amic.matter.desktop.candidate",
    artifactPrefix: "matter-candidate",
    receiptLabel: "Candidate",
    receiptStatusPrefix: "candidate",
    receiptSigningKey: "matter-candidate-nonproduction-signing-key",
    formal: false,
  }),
  formal: Object.freeze({
    channel: "formal",
    appId: "com.amic.matter.desktop",
    artifactPrefix: "matter",
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
  "policy_version",
  "policy",
  "requested_runtime_mode",
  "effective_runtime_mode",
  "runtime_included",
  "runtime_data_class",
  "non_distributable",
  "distributable",
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

export function desktopReleaseChannelPolicy(channel = "internal") {
  desktopReleaseChannelConfig(channel);
  return DESKTOP_RELEASE_CHANNEL_POLICY[channel];
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

function policyManifestForChannel(channel) {
  const policy = desktopReleaseChannelPolicy(channel);
  return {
    data_mode: policy.dataMode,
    allowed_data_modes: [...policy.allowedDataModes],
    allowed_data_classes: { ...policy.allowedDataClasses },
    api_target: policy.apiTarget,
    deployment_target: policy.deploymentTarget,
    delivery_target: policy.deliveryTarget,
    distributable: policy.distributable,
    thin_client: policy.thinClient,
    private_local_allowed: policy.privateLocalAllowed,
    private_local_requires_explicit_guards: policy.privateLocalRequiresExplicitGuards,
  };
}

function validateRuntimeManifestFields(manifest, channelConfig) {
  assert.equal(manifest.policy_version, DESKTOP_RELEASE_POLICY_SCHEMA);
  assert.deepEqual(Object.keys(manifest.policy), [
    "data_mode",
    "allowed_data_modes",
    "allowed_data_classes",
    "api_target",
    "deployment_target",
    "delivery_target",
    "distributable",
    "thin_client",
    "private_local_allowed",
    "private_local_requires_explicit_guards",
  ]);
  assert.deepEqual(manifest.policy, policyManifestForChannel(manifest.channel), "manifest policy must match its release channel");
  assert.ok(DESKTOP_RUNTIME_DATA_MODES.includes(manifest.requested_runtime_mode));
  assert.ok(DESKTOP_RUNTIME_DATA_MODES.includes(manifest.effective_runtime_mode));
  assert.ok(manifest.policy.allowed_data_modes.includes(manifest.requested_runtime_mode), "requested runtime mode is not allowed by the channel policy");
  assert.equal(manifest.effective_runtime_mode, manifest.requested_runtime_mode, "effective runtime mode must equal requested runtime mode");
  assert.equal(
    manifest.runtime_data_class,
    manifest.policy.allowed_data_classes[manifest.effective_runtime_mode],
    "runtime data class must match the policy mode",
  );
  assert.equal(typeof manifest.runtime_included, "boolean");
  assert.equal(manifest.runtime_included, manifest.effective_runtime_mode !== "none");
  assert.equal(typeof manifest.non_distributable, "boolean");
  assert.equal(typeof manifest.distributable, "boolean");
  assert.equal(manifest.distributable, manifest.policy.distributable);
  assert.equal(manifest.non_distributable, !manifest.distributable);
  if (manifest.effective_runtime_mode === "private-local") {
    assert.equal(manifest.policy.private_local_allowed, true);
    assert.equal(manifest.policy.private_local_requires_explicit_guards, true);
    assert.equal(manifest.non_distributable, true);
  }
  if (channelConfig.formal) {
    assert.equal(manifest.effective_runtime_mode, "none");
    assert.equal(manifest.runtime_included, false);
    assert.equal(manifest.non_distributable, false);
  }
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
  validateRuntimeManifestFields(manifest, channelConfig);
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
  requestedRuntimeMode,
  effectiveRuntimeMode,
  runtimeIncluded,
  runtimeDataClass,
  nonDistributable,
  distributable,
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
    policy_version: DESKTOP_RELEASE_POLICY_SCHEMA,
    policy: policyManifestForChannel(channel),
    requested_runtime_mode: requestedRuntimeMode,
    effective_runtime_mode: effectiveRuntimeMode,
    runtime_included: runtimeIncluded,
    runtime_data_class: runtimeDataClass,
    non_distributable: nonDistributable,
    distributable,
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
