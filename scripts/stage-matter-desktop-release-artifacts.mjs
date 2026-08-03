#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  desktopReleaseChannelConfig,
  readDesktopBuildSourceIdentity,
  validateDesktopBuildManifest,
} from "./lib/matter-desktop-provenance.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  createRf13DistPrivacyMemberReceipt,
  desktopArtifactPrivacyCorpusSha256,
  desktopBuildManifestSha256,
  expandedDesktopArtifactDescriptor,
  inspectExpandedDesktopArtifact,
  inspectPlainDesktopArtifact,
  validateDesktopArtifactPrivacyEvidence,
  validateRf13DistPrivacyMemberReceipt,
  validateWindowsInstallerPrivacyBuilderEvidence,
  writeDesktopArtifactPrivacyJson,
} from "./lib/matter-desktop-artifact-privacy.mjs";
import {
  DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  desktopReleaseArtifactRelativeRoot,
  desktopReleaseArtifactRoot,
  validateDesktopReleaseArtifactIndex,
} from "./lib/matter-desktop-release-paths.mjs";
import { publishPreparedDesktopRelease } from "./lib/matter-desktop-release-promotion.mjs";

const usage = "usage: node scripts/stage-matter-desktop-release-artifacts.mjs [--help]";
if (process.argv[2] === "--help") {
  console.log(usage);
  console.log("Promotes verified generic build outputs into dist/releases/<version>/<full-sha>/<channel>/.");
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
assert.equal(path.resolve(process.cwd()), path.resolve(ROOT), "run from repository root");
const desktopRoot = path.join(ROOT, "apps/desktop");
const desktopPackage = JSON.parse(await readFile(path.join(desktopRoot, "package.json"), "utf8"));
const version = desktopPackage.version;
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceDirty, false, "release artifact staging requires a clean product source");
const expectedSourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA ?? sourceIdentity.sourceSha;
assert.match(expectedSourceSha, /^[0-9a-f]{40}$/, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA");
assert.equal(sourceIdentity.sourceSha, expectedSourceSha, "release artifact staging source SHA mismatch");

const channelConfig = desktopReleaseChannelConfig(process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal");
const channel = channelConfig.channel;
const artifactName = channelConfig.artifactPrefix + "-" + version;
const releaseRelativeRoot = desktopReleaseArtifactRelativeRoot({
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel,
});
const releaseRoot = desktopReleaseArtifactRoot({
  repoRoot: ROOT,
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel,
});

function receiptValue(source, label) {
  const match = source.match(new RegExp("^" + label + ": \\x60([^\\x60]+)\\x60$", "m"));
  assert.ok(match, "build receipt is missing " + label);
  return match[1];
}

function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

const generic = {
  mac: {
    appBundle: path.join(desktopRoot, "dist/mac/matter.app"),
    buildManifest: path.join(desktopRoot, "dist/mac", artifactName + "-macos-build-manifest.json"),
    packagedManifest: path.join(desktopRoot, "dist/mac/matter.app/Contents/Resources/matter-build-manifest.json"),
    zip: path.join(desktopRoot, "dist/mac", artifactName + "-macos.zip"),
    dmg: path.join(desktopRoot, "dist/mac", artifactName + "-macos.dmg"),
    receipt: path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md"),
    privacyArtifactRoot: "apps/desktop/dist/mac/privacy",
    zipPrivacyReceipt: path.join(desktopRoot, "dist/mac", artifactName + "-macos.zip.privacy.json"),
    dmgPrivacyReceipt: path.join(desktopRoot, "dist/mac", artifactName + "-macos.dmg.privacy.json"),
  },
  windows: {
    packageDirectory: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64"),
    unpackedDirectory: path.join(desktopRoot, "dist/win-unpacked"),
    buildManifest: path.join(desktopRoot, "dist/win", artifactName + "-win-build-manifest.json"),
    packagedManifest: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64/resources/matter-build-manifest.json"),
    installerManifest: path.join(desktopRoot, "dist/win", artifactName + "-win-installer-manifest.json"),
    installerManifestSignature: path.join(desktopRoot, "dist/win", artifactName + "-win-installer-manifest.json.sig"),
    zip: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64-unsigned.zip"),
    installer: path.join(desktopRoot, "dist", artifactName + "-win-x64.exe"),
    installerBlockmap: path.join(desktopRoot, "dist", artifactName + "-win-x64.exe.blockmap"),
    receipt: path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md"),
    privacyArtifactRoot: "apps/desktop/dist/win/privacy",
    directoryPrivacyReceipt: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64.privacy.json"),
    zipPrivacyReceipt: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64-unsigned.zip.privacy.json"),
    installerPrivacyBuilderReceipt: path.join(desktopRoot, "dist", artifactName + "-win-x64.exe.privacy-builder.json"),
  },
};

for (const filePath of [
  generic.mac.buildManifest,
  generic.mac.packagedManifest,
  generic.mac.zip,
  generic.mac.dmg,
  generic.mac.receipt,
  generic.windows.buildManifest,
  generic.windows.packagedManifest,
  generic.windows.installerManifest,
  generic.windows.installerManifestSignature,
  generic.windows.zip,
  generic.windows.receipt,
]) {
  assert.equal(existsSync(filePath), true, "missing verified build output: " + path.relative(ROOT, filePath));
}

const [macManifestBody, packagedMacManifestBody, windowsManifestBody, packagedWindowsManifestBody] = await Promise.all([
  readFile(generic.mac.buildManifest),
  readFile(generic.mac.packagedManifest),
  readFile(generic.windows.buildManifest),
  readFile(generic.windows.packagedManifest),
]);
assert.deepEqual(packagedMacManifestBody, macManifestBody, "Mac packaged/external build manifest mismatch");
assert.deepEqual(packagedWindowsManifestBody, windowsManifestBody, "Windows packaged/external build manifest mismatch");
const macManifest = validateDesktopBuildManifest(JSON.parse(macManifestBody));
const windowsManifest = validateDesktopBuildManifest(JSON.parse(windowsManifestBody));
for (const manifest of [macManifest, windowsManifest]) {
  assert.equal(manifest.version, version);
  assert.equal(manifest.source_sha, sourceIdentity.sourceSha);
  assert.equal(manifest.source_tree, sourceIdentity.sourceTree);
  assert.equal(manifest.source_dirty, false);
  assert.equal(manifest.channel, channel);
  assert.equal(manifest.app_id, channelConfig.appId);
  assert.equal(manifest.requested_runtime_mode, "none", "release staging requires runtime mode none");
  assert.equal(manifest.effective_runtime_mode, "none", "release staging rejects private or synthetic runtime data");
  assert.equal(manifest.runtime_included, false, "release staging rejects a bundled local runtime");
  assert.equal(manifest.runtime_data_class, "none", "release staging rejects runtime data classes");
  assert.equal(manifest.non_distributable, false, "release staging rejects non-distributable builds");
  assert.equal(manifest.distributable, true, "release staging requires distributable builds");
}
assert.deepEqual(macManifest.renderer, windowsManifest.renderer, "Mac/Windows renderer mismatch");

for (const privacySidecar of [
  generic.mac.zipPrivacyReceipt,
  generic.mac.dmgPrivacyReceipt,
  generic.windows.directoryPrivacyReceipt,
  generic.windows.zipPrivacyReceipt,
]) {
  assert.equal(existsSync(privacySidecar), true, "missing mandatory artifact privacy sidecar: " + path.relative(ROOT, privacySidecar));
}

const privacyCorpus = await buildDesktopArtifactPrivacyCorpus({ repoRoot: ROOT, env: process.env });
const privacyCorpusSha256 = desktopArtifactPrivacyCorpusSha256(privacyCorpus);

async function artifactDescriptor(id, kind, filePath) {
  const body = await readFile(filePath);
  const metadata = await stat(filePath);
  return Object.freeze({ id, kind, bytes: metadata.size, sha256: sha256(body) });
}

async function validateGenericArchivePrivacy({
  id,
  kind,
  artifactPath,
  artifactRoot,
  receiptPath,
  expectedRootName,
  buildManifest,
}) {
  const artifact = await artifactDescriptor(id, kind, artifactPath);
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const validation = await validateDesktopArtifactPrivacyEvidence({
    receipt,
    artifact,
    artifactPath,
    artifactRoot,
    expectedRootName,
    buildManifest,
    corpus: privacyCorpus,
    repoRoot: ROOT,
    displayBase: ROOT,
  });
  validateRf13DistPrivacyMemberReceipt(receipt, {
    artifact,
    artifactRoot,
    expectedBuildManifestSha256: desktopBuildManifestSha256(buildManifest),
    expectedSourceSha: buildManifest.source_sha,
    expectedSourceTree: buildManifest.source_tree,
    repoRoot: ROOT,
    validation,
  });
  return Object.freeze({ artifact, receipt, validation });
}

const genericArchivePrivacy = new Map();
const windowsDirectoryInspection = await inspectExpandedDesktopArtifact({
  rootPath: generic.windows.packageDirectory,
  buildManifest: windowsManifest,
  corpus: privacyCorpus,
  displayBase: ROOT,
});
const windowsDirectoryArtifact = expandedDesktopArtifactDescriptor({
  id: "windows_package_directory",
  inspection: windowsDirectoryInspection,
});
const windowsDirectoryReceipt = JSON.parse(await readFile(generic.windows.directoryPrivacyReceipt, "utf8"));
const windowsDirectoryValidation = await validateDesktopArtifactPrivacyEvidence({
  receipt: windowsDirectoryReceipt,
  artifact: windowsDirectoryArtifact,
  artifactPath: generic.windows.packageDirectory,
  artifactRoot: generic.windows.privacyArtifactRoot,
  buildManifest: windowsManifest,
  corpus: privacyCorpus,
  repoRoot: ROOT,
  displayBase: ROOT,
});
validateRf13DistPrivacyMemberReceipt(windowsDirectoryReceipt, {
  artifact: windowsDirectoryArtifact,
  artifactRoot: generic.windows.privacyArtifactRoot,
  expectedBuildManifestSha256: desktopBuildManifestSha256(windowsManifest),
  expectedSourceSha: windowsManifest.source_sha,
  expectedSourceTree: windowsManifest.source_tree,
  repoRoot: ROOT,
  validation: windowsDirectoryValidation,
});
for (const specification of [
  {
    id: "macos_zip_archive",
    kind: "zip_archive",
    artifactPath: generic.mac.zip,
    artifactRoot: generic.mac.privacyArtifactRoot,
    receiptPath: generic.mac.zipPrivacyReceipt,
    expectedRootName: "matter.app",
    buildManifest: macManifest,
  },
  {
    id: "macos_dmg_image",
    kind: "dmg_image",
    artifactPath: generic.mac.dmg,
    artifactRoot: generic.mac.privacyArtifactRoot,
    receiptPath: generic.mac.dmgPrivacyReceipt,
    expectedRootName: "matter.app",
    buildManifest: macManifest,
  },
  {
    id: "windows_package_zip",
    kind: "unsigned_package_zip",
    artifactPath: generic.windows.zip,
    artifactRoot: generic.windows.privacyArtifactRoot,
    receiptPath: generic.windows.zipPrivacyReceipt,
    expectedRootName: path.basename(generic.windows.packageDirectory),
    buildManifest: windowsManifest,
  },
]) {
  genericArchivePrivacy.set(specification.id, await validateGenericArchivePrivacy(specification));
}

const [macReceipt, windowsReceipt] = await Promise.all([
  readFile(generic.mac.receipt, "utf8"),
  readFile(generic.windows.receipt, "utf8"),
]);
for (const [platform, receipt] of [["macOS", macReceipt], ["Windows", windowsReceipt]]) {
  assert.equal(receiptValue(receipt, "Version"), version, platform + " receipt version mismatch");
  assert.equal(receiptValue(receipt, "Channel"), channel, platform + " receipt channel mismatch");
  assert.equal(receiptValue(receipt, "App ID"), channelConfig.appId, platform + " receipt app ID mismatch");
  assert.equal(receiptValue(receipt, "Source SHA"), sourceIdentity.sourceSha, platform + " receipt source SHA mismatch");
  assert.equal(receiptValue(receipt, "Source tree"), sourceIdentity.sourceTree, platform + " receipt source tree mismatch");
  assert.equal(receiptValue(receipt, "Source dirty"), "false", platform + " receipt source dirtiness mismatch");
}

const stagedSpecs = [
  ["macos_zip_archive", generic.mac.zip, "mac/" + path.basename(generic.mac.zip), "darwin", "zip_archive"],
  ["macos_dmg_image", generic.mac.dmg, "mac/" + path.basename(generic.mac.dmg), "darwin", "dmg_image"],
  ["macos_build_manifest", generic.mac.buildManifest, "mac/" + path.basename(generic.mac.buildManifest), "darwin", "build_manifest"],
  ["windows_package_zip", generic.windows.zip, "win/" + path.basename(generic.windows.zip), "win32", "unsigned_package_zip"],
  ["windows_installer_manifest", generic.windows.installerManifest, "win/" + path.basename(generic.windows.installerManifest), "win32", "installer_manifest"],
  ["windows_manifest_signature", generic.windows.installerManifestSignature, "win/" + path.basename(generic.windows.installerManifestSignature), "win32", "detached_receipt_signature"],
  ["windows_build_manifest", generic.windows.buildManifest, "win/" + path.basename(generic.windows.buildManifest), "win32", "build_manifest"],
  ["macos_build_receipt", generic.mac.receipt, "receipts/macos-build.md", "darwin", "receipt"],
  ["windows_build_receipt", generic.windows.receipt, "receipts/windows-build.md", "win32", "receipt"],
];
let genericInstallerPrivacy = null;
if (existsSync(generic.windows.installer) || existsSync(generic.windows.installerBlockmap)) {
  assert.equal(existsSync(generic.windows.installer), true, "Windows installer/blockmap must be staged as a pair");
  assert.equal(existsSync(generic.windows.installerBlockmap), true, "Windows installer/blockmap must be staged as a pair");
  assert.equal(existsSync(generic.windows.installerPrivacyBuilderReceipt), true, "Windows installer privacy builder sidecar is required");
  assert.equal(existsSync(generic.windows.unpackedDirectory), true, "Windows installer expanded source payload is required for privacy validation");
  const installerBuildManifest = validateDesktopBuildManifest(JSON.parse(await readFile(
    path.join(generic.windows.unpackedDirectory, "resources/matter-build-manifest.json"),
  )));
  assert.deepEqual(installerBuildManifest, windowsManifest, "Windows installer source payload build manifest mismatch");
  assert.equal(installerBuildManifest.source_sha, sourceIdentity.sourceSha);
  assert.equal(installerBuildManifest.source_tree, sourceIdentity.sourceTree);
  assert.equal(installerBuildManifest.effective_runtime_mode, "none");
  assert.equal(installerBuildManifest.runtime_included, false);
  const installerArtifact = await artifactDescriptor("windows_installer", "nsis_installer", generic.windows.installer);
  const installerBuilderReceipt = JSON.parse(await readFile(generic.windows.installerPrivacyBuilderReceipt, "utf8"));
  const builderValidation = await validateWindowsInstallerPrivacyBuilderEvidence({
    receipt: installerBuilderReceipt,
    artifact: installerArtifact,
    artifactPath: generic.windows.installer,
    buildManifest: installerBuildManifest,
    sourcePayloadPath: generic.windows.unpackedDirectory,
    corpus: privacyCorpus,
    displayBase: ROOT,
  });
  genericInstallerPrivacy = Object.freeze({
    artifact: installerArtifact,
    buildManifest: installerBuildManifest,
    receipt: installerBuilderReceipt,
    sourcePayloadPath: generic.windows.unpackedDirectory,
    validation: builderValidation,
  });
  stagedSpecs.push(
    ["windows_installer", generic.windows.installer, "win/" + path.basename(generic.windows.installer), "win32", "nsis_installer"],
    ["windows_installer_blockmap", generic.windows.installerBlockmap, "win/" + path.basename(generic.windows.installerBlockmap), "win32", "installer_blockmap"],
  );
}

await mkdir(path.dirname(releaseRoot), { recursive: true });
const candidateRoot = path.join(
  path.dirname(releaseRoot),
  `.${path.basename(releaseRoot)}.rfd007-candidate-${randomUUID()}`,
);
await mkdir(candidateRoot, { recursive: false });
let promotion;
try {
for (const [, sourcePath, targetSuffix] of stagedSpecs) {
  const targetPath = path.join(candidateRoot, targetSuffix);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath);
}

const artifacts = [];
const stagedSuffixById = new Map(stagedSpecs.map(([id, , targetSuffix]) => [id, targetSuffix]));
for (const [id, , targetSuffix, platform, kind] of stagedSpecs) {
  const targetPath = path.join(candidateRoot, targetSuffix);
  const body = await readFile(targetPath);
  const fileStat = await stat(targetPath);
  artifacts.push({
    id,
    path: path.posix.join(releaseRelativeRoot, targetSuffix.replaceAll(path.sep, "/")),
    platform,
    kind,
    bytes: fileStat.size,
    sha256: sha256(body),
  });
}

const privacyEvidenceRoot = path.join(candidateRoot, "evidence");
await mkdir(privacyEvidenceRoot, { recursive: true });
const privacyMembers = [];

function privacyReference(relativePath, record) {
  return Object.freeze({
    path: path.posix.join(releaseRelativeRoot, relativePath),
    sha256: record.sha256,
    bytes: record.bytes,
  });
}

{
  const id = windowsDirectoryArtifact.id;
  const memberRelativePath = `evidence/members-${id}.json`;
  const genericMember = JSON.parse(await readFile(path.join(ROOT, windowsDirectoryReceipt.member_manifest_path), "utf8"));
  await writeDesktopArtifactPrivacyJson(path.join(candidateRoot, memberRelativePath), genericMember);
  const receipt = Object.freeze({
    ...windowsDirectoryReceipt,
    member_manifest_path: path.posix.join(releaseRelativeRoot, memberRelativePath),
  });
  const receiptRelativePath = `evidence/privacy-${id}.json`;
  const receiptWrite = await writeDesktopArtifactPrivacyJson(path.join(candidateRoot, receiptRelativePath), receipt);
  const validation = await validateDesktopArtifactPrivacyEvidence({
    receipt,
    artifact: windowsDirectoryArtifact,
    artifactPath: generic.windows.packageDirectory,
    artifactRoot: releaseRelativeRoot,
    artifactPhysicalRoot: candidateRoot,
    buildManifest: windowsManifest,
    corpus: privacyCorpus,
    repoRoot: ROOT,
    displayBase: ROOT,
  });
  validateRf13DistPrivacyMemberReceipt(receipt, {
    artifact: windowsDirectoryArtifact,
    artifactRoot: releaseRelativeRoot,
    artifactPhysicalRoot: candidateRoot,
    expectedBuildManifestSha256: desktopBuildManifestSha256(windowsManifest),
    expectedSourceSha: windowsManifest.source_sha,
    expectedSourceTree: windowsManifest.source_tree,
    repoRoot: ROOT,
    validation,
  });
  privacyMembers.push({
    artifact_id: id,
    status: "PASS",
    receipt: privacyReference(receiptRelativePath, receiptWrite),
  });
}

for (const artifact of artifacts) {
  const buildManifest = artifact.platform === "darwin" ? macManifest : windowsManifest;
  const stagedArtifactPath = path.join(candidateRoot, stagedSuffixById.get(artifact.id));
  if (artifact.id === "windows_installer") {
    assert.ok(genericInstallerPrivacy, "Windows installer live privacy builder validation is required");
    assert.equal(artifact.sha256, genericInstallerPrivacy.artifact.sha256, "staged Windows installer changed after privacy validation");
    assert.equal(artifact.bytes, genericInstallerPrivacy.artifact.bytes, "staged Windows installer size changed after privacy validation");
    await validateWindowsInstallerPrivacyBuilderEvidence({
      receipt: genericInstallerPrivacy.receipt,
      artifact,
      artifactPath: stagedArtifactPath,
      buildManifest: genericInstallerPrivacy.buildManifest,
      sourcePayloadPath: genericInstallerPrivacy.sourcePayloadPath,
      corpus: privacyCorpus,
      displayBase: ROOT,
    });
    const builderRelativePath = "evidence/windows-installer.privacy-builder.json";
    const builderTargetPath = path.join(candidateRoot, builderRelativePath);
    const builderWrite = await writeDesktopArtifactPrivacyJson(builderTargetPath, genericInstallerPrivacy.receipt);
    privacyMembers.push({
      artifact_id: artifact.id,
      status: "PENDING_NATIVE",
      builder_receipt: privacyReference(builderRelativePath, builderWrite),
    });
    continue;
  }

  const archivePrivacy = genericArchivePrivacy.get(artifact.id);
  let receipt;
  let expectedRootName = null;
  if (archivePrivacy) {
    const memberRelativePath = `evidence/members-${artifact.id}.json`;
    const genericMember = JSON.parse(await readFile(path.join(ROOT, archivePrivacy.receipt.member_manifest_path), "utf8"));
    await writeDesktopArtifactPrivacyJson(path.join(candidateRoot, memberRelativePath), genericMember);
    receipt = Object.freeze({
      ...archivePrivacy.receipt,
      member_manifest_path: path.posix.join(releaseRelativeRoot, memberRelativePath),
    });
    expectedRootName = artifact.id.startsWith("macos_")
      ? "matter.app"
      : path.basename(generic.windows.packageDirectory);
  } else {
    const inspection = await inspectPlainDesktopArtifact({
      artifactPath: stagedArtifactPath,
      artifactKind: artifact.kind,
      buildManifest,
      corpus: privacyCorpus,
      displayBase: ROOT,
    });
    receipt = createRf13DistPrivacyMemberReceipt({
      receiptId: `rfd-tuw-007-${sourceIdentity.sourceSha.slice(0, 12)}-${artifact.id}`,
      artifact,
      buildManifest,
      inspection,
    });
  }
  const receiptRelativePath = `evidence/privacy-${artifact.id}.json`;
  const receiptWrite = await writeDesktopArtifactPrivacyJson(path.join(candidateRoot, receiptRelativePath), receipt);
  const validation = await validateDesktopArtifactPrivacyEvidence({
    receipt,
    artifact,
    artifactPath: stagedArtifactPath,
    artifactRoot: releaseRelativeRoot,
    artifactPhysicalRoot: candidateRoot,
    expectedRootName,
    buildManifest,
    corpus: privacyCorpus,
    repoRoot: ROOT,
    displayBase: ROOT,
  });
  validateRf13DistPrivacyMemberReceipt(receipt, {
    artifact,
    artifactRoot: releaseRelativeRoot,
    artifactPhysicalRoot: candidateRoot,
    expectedBuildManifestSha256: desktopBuildManifestSha256(buildManifest),
    expectedSourceSha: buildManifest.source_sha,
    expectedSourceTree: buildManifest.source_tree,
    repoRoot: ROOT,
    validation,
  });
  privacyMembers.push({
    artifact_id: artifact.id,
    status: "PASS",
    receipt: privacyReference(receiptRelativePath, receiptWrite),
  });
}

privacyMembers.sort((left, right) => left.artifact_id.localeCompare(right.artifact_id, "en"));
await writeFile(path.join(privacyEvidenceRoot, "privacy-index.json"), `${JSON.stringify({
  schema_version: "law-firm-os.rfd-tuw-007.staged-privacy-evidence.v1",
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  channel,
  corpus_sha256: privacyCorpusSha256,
  status: genericInstallerPrivacy ? "PENDING_WINDOWS_NATIVE" : "PASS",
  members: privacyMembers,
}, null, 2)}\n`);

const index = validateDesktopReleaseArtifactIndex({
  schema_version: DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  source_dirty: false,
  channel,
  app_id: channelConfig.appId,
  artifact_root: releaseRelativeRoot,
  renderer: macManifest.renderer,
  generated_at: macManifest.built_at > windowsManifest.built_at
    ? macManifest.built_at
    : windowsManifest.built_at,
  generic_build_paths_are_release_truth: false,
  public_release_claim: false,
  production_go_live_claim: false,
  artifacts,
});
await writeFile(path.join(candidateRoot, "artifact-index.json"), JSON.stringify(index, null, 2) + "\n");
await writeFile(
  path.join(candidateRoot, "checksums.sha256"),
  artifacts.map((artifact) => artifact.sha256 + "  " + artifact.path).join("\n") + "\n",
);

const persistedIndex = validateDesktopReleaseArtifactIndex(JSON.parse(await readFile(
  path.join(candidateRoot, "artifact-index.json"),
  "utf8",
)));
assert.deepEqual(persistedIndex, index, "prepared release index changed before atomic publication");
const persistedPrivacyIndex = JSON.parse(await readFile(path.join(privacyEvidenceRoot, "privacy-index.json"), "utf8"));
assert.equal(persistedPrivacyIndex.source_sha, sourceIdentity.sourceSha);
assert.equal(persistedPrivacyIndex.source_tree, sourceIdentity.sourceTree);
assert.equal(persistedPrivacyIndex.members.length, privacyMembers.length);

promotion = await publishPreparedDesktopRelease({ candidateRoot, releaseRoot });

console.log(JSON.stringify({
  verdict: genericInstallerPrivacy ? "PASS_PENDING_WINDOWS_NATIVE" : "PASS",
  artifact_root: releaseRelativeRoot,
  artifact_index: path.posix.join(releaseRelativeRoot, "artifact-index.json"),
  checksums: path.posix.join(releaseRelativeRoot, "checksums.sha256"),
  version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  channel,
  app_id: channelConfig.appId,
  renderer_sha256: index.renderer.sha256,
  renderer_files: index.renderer.file_count,
  artifact_count: artifacts.length,
  privacy_corpus_sha256: privacyCorpusSha256,
  privacy_evidence: path.posix.join(releaseRelativeRoot, "evidence/privacy-index.json"),
  privacy_member_count: privacyMembers.length,
  publication: promotion.status,
  generic_build_paths_are_release_truth: false,
  public_release_claim: false,
  production_go_live_claim: false,
}, null, 2));
} catch (error) {
  await rm(candidateRoot, { recursive: true, force: true });
  throw error;
}
