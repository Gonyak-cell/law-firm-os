import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DESKTOP_ARTIFACT_MEMBER_MANIFEST_SCHEMA,
  DesktopArtifactPrivacyError,
  buildDesktopArtifactPrivacyCorpus,
  createDesktopZipExtractor,
  createRf13DistPrivacyMemberReceipt,
  createWindowsInstallerNativePrivacyReceipt,
  createWindowsInstallerPrivacyBuilderReceipt,
  desktopArtifactPrivacyCorpusSha256,
  desktopBuildManifestSha256,
  expandedDesktopArtifactDescriptor,
  inspectDesktopArtifactBytes,
  inspectDmgDesktopArtifact,
  inspectExpandedDesktopArtifact,
  inspectPlainDesktopArtifact,
  inspectZipDesktopArtifact,
  serializeDesktopArtifactMemberManifest,
  validateRf13DistPrivacyMemberReceipt,
  validateRf13DistPrivacyMemberReceiptStructure,
  validateDesktopArtifactPrivacyEvidence,
  validateWindowsInstallerPrivacyBuilderEvidence,
  validateWindowsInstallerNativePrivacyReceipt,
  validateWindowsInstallerPrivacyBuilderReceipt,
  validateDesktopArtifactPrivacyCorpusSha256,
} from "../lib/matter-desktop-artifact-privacy.mjs";
import {
  createDesktopBuildManifest,
  serializeDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";

const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const RENDERER_SHA = "3".repeat(64);
const VERSION = "0.1.17";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function write(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
  return filePath;
}

function temporaryRoot(testContext, prefix = "matter-artifact-privacy-") {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function buildManifest(channel, platform = "darwin") {
  const formal = channel === "formal";
  const candidate = channel === "candidate";
  const runtimeMode = formal || candidate ? "none" : "private-local";
  return createDesktopBuildManifest({
    version: VERSION,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: {
      sha256: RENDERER_SHA,
      file_count: 2,
      algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    },
    channel,
    platform,
    arch: platform === "darwin" ? "arm64" : "x64",
    appId: channel === "formal"
      ? "com.amic.matter.desktop"
      : channel === "candidate"
        ? "com.amic.matter.desktop.candidate"
        : "com.amic.matter.desktop.internal",
    requestedRuntimeMode: runtimeMode,
    effectiveRuntimeMode: runtimeMode,
    runtimeIncluded: runtimeMode !== "none",
    runtimeDataClass: runtimeMode === "none" ? "none" : "private_local",
    nonDistributable: !formal,
    distributable: formal,
    builtAt: "2026-08-01T00:00:00.000Z",
  });
}

function writeExpandedRoot(root, name, manifest, { privateValue = null, extra = null } = {}) {
  const expandedRoot = path.join(root, name);
  const embedded = manifest.platform === "darwin"
    ? path.join(expandedRoot, "Contents/Resources/matter-build-manifest.json")
    : path.join(expandedRoot, "resources/matter-build-manifest.json");
  write(embedded, serializeDesktopBuildManifest(manifest));
  write(path.join(expandedRoot, manifest.platform === "darwin" ? "Contents/MacOS/matter" : "matter.exe"), "binary\n");
  write(path.join(expandedRoot, manifest.platform === "darwin" ? "Contents/Resources/app/index.js" : "resources/app/index.js"), "export const ready = true;\n");
  if (privateValue) write(path.join(expandedRoot, "private.bin"), privateValue);
  if (extra) write(path.join(expandedRoot, extra.path), extra.value);
  return expandedRoot;
}

async function fixture(testContext) {
  const root = temporaryRoot(testContext);
  const privateValue = "artifact-private-contact-7782@example.invalid";
  const sources = {
    roster: write(path.join(root, "sources/roster.json"), `${JSON.stringify({
      tenant_id: "artifact-private-tenant-7782",
      members: [{
        display_name: "Artifact Private Person 7782",
        employee_id: "artifact-private-employee-7782",
        work_email: privateValue,
      }],
    })}\n`),
    contact: write(path.join(root, "sources/contact.json"), `${JSON.stringify({
      contacts: [{ work_email: privateValue, mobile_phone: "+82-10-7782-4400" }],
    })}\n`),
    registrationSeed: write(path.join(root, "sources/registration.json"), `${JSON.stringify({
      tenant_id: "artifact-private-tenant-7782",
      users: [{ user_id: "artifact-private-user-7782", clientSecret: "artifact-private-secret-7782" }],
    })}\n`),
    photos: path.join(root, "sources/photos"),
  };
  write(path.join(sources.photos, "private.png"), Buffer.from([0, 1, 7, 7, 8, 2, 4, 9]));
  const corpus = await buildDesktopArtifactPrivacyCorpus({
    repoRoot: root,
    rosterSourcePath: sources.roster,
    contactSourcePath: sources.contact,
    registrationSeedSourcePath: sources.registrationSeed,
    photoSourcePath: sources.photos,
    env: {},
  });
  return { root, sources, corpus, privateValue };
}

function createZip(sourceRoot, targetPath) {
  if (existsSync("/usr/bin/zip")) {
    execFileSync("/usr/bin/zip", ["-qry", targetPath, path.basename(sourceRoot)], { cwd: path.dirname(sourceRoot) });
    return;
  }
  execFileSync("zip", ["-qry", targetPath, path.basename(sourceRoot)], { cwd: path.dirname(sourceRoot) });
}

test("RFD-TUW-007 formal and candidate expanded packages pass the shared corpus gate", async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  for (const channel of ["formal", "candidate"]) {
    const manifest = buildManifest(channel);
    const expandedRoot = writeExpandedRoot(root, `${channel}.app`, manifest);
    const inspection = await inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus, displayBase: root });
    assert.equal(inspection.verdict, "PASS");
    assert.equal(inspection.finding_count, 0);
    assert.equal(inspection.member_manifest.schema_version, DESKTOP_ARTIFACT_MEMBER_MANIFEST_SCHEMA);
    assert.equal(inspection.member_manifest.build_manifest_sha256, desktopBuildManifestSha256(manifest));
    assert.equal(inspection.member_manifest.effective_runtime_mode, "none");
    assert.equal(inspection.omitted_member_count, 0);
    assert.equal(inspection.uninspected_archive_count, 0);
    const artifact = expandedDesktopArtifactDescriptor({
      id: `${channel}_package_directory`,
      inspection,
    });
    assert.equal(artifact.sha256, inspection.member_manifest_sha256);
    if (channel !== "formal") continue;
    const artifactRoot = "privacy";
    const memberManifestPath = `${artifactRoot}/evidence/members-${artifact.id}.json`;
    write(path.join(root, memberManifestPath), inspection.member_manifest_body);
    const receipt = createRf13DistPrivacyMemberReceipt({
      receiptId: `RFD007-${channel}-package-directory`,
      artifact,
      buildManifest: manifest,
      inspection,
      memberManifestPath,
    });
    const validation = await validateDesktopArtifactPrivacyEvidence({
      receipt,
      artifact,
      artifactPath: expandedRoot,
      artifactRoot,
      buildManifest: manifest,
      corpus,
      repoRoot: root,
      displayBase: root,
    });
    assert.equal(validateRf13DistPrivacyMemberReceipt(receipt, {
      artifact,
      artifactRoot,
      expectedBuildManifestSha256: desktopBuildManifestSha256(manifest),
      expectedSourceSha: manifest.source_sha,
      expectedSourceTree: manifest.source_tree,
      repoRoot: root,
      validation,
    }), receipt);
    assert.equal(receipt.artifact_sha256, receipt.member_manifest_sha256);
  }
});

test("RFD-TUW-007 rejects private expanded content and missing roots without exposing protected bytes", async (testContext) => {
  const { root, corpus, privateValue } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "private.app", manifest, { privateValue });
  await assert.rejects(
    inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus, displayBase: root }),
    (error) => {
      assert.equal(error.code, "EXPANDED_PRIVACY_SCAN_FAILED");
      assert.equal(JSON.stringify(error).includes(privateValue), false);
      return true;
    },
  );
  await assert.rejects(
    inspectExpandedDesktopArtifact({ rootPath: path.join(root, "missing.app"), buildManifest: manifest, corpus }),
    (error) => error.code === "EXPANDED_ROOT_MISSING",
  );
});

test("RFD-TUW-007 member manifests are code-point deterministic and bind safe symlinks", async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "matter.app", manifest);
  write(path.join(expandedRoot, "z.txt"), "z\n");
  write(path.join(expandedRoot, "Å.txt"), "ring\n");
  write(path.join(expandedRoot, "😀.txt"), "face\n");
  symlinkSync("z.txt", path.join(expandedRoot, "a-link.txt"), "file");
  const first = await inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus });
  const second = await inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus });
  assert.equal(first.member_manifest_body, second.member_manifest_body);
  assert.equal(first.member_manifest_sha256, second.member_manifest_sha256);
  const interesting = first.member_manifest.members
    .map((member) => member.path)
    .filter((memberPath) => /^(?:a-link|z|Å|😀)\.txt$/u.test(memberPath));
  assert.deepEqual(interesting, ["a-link.txt", "z.txt", "Å.txt", "😀.txt"]);
  assert.equal(first.member_manifest.members.find(({ path: memberPath }) => memberPath === "a-link.txt").type, "symlink");

  const outside = write(path.join(root, "outside.txt"), "outside\n");
  symlinkSync(outside, path.join(expandedRoot, "outside-link.txt"), "file");
  await assert.rejects(
    inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus }),
    (error) => error.code === "UNSAFE_SYMLINK",
  );
});

test("RFD-TUW-007 extracts clean ZIPs and rejects private compressed members hidden from raw bytes", async (testContext) => {
  const { root, corpus, privateValue } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const cleanRoot = writeExpandedRoot(root, "matter.app", manifest);
  const expanded = await inspectExpandedDesktopArtifact({ rootPath: cleanRoot, buildManifest: manifest, corpus });
  const cleanZip = path.join(root, "matter-0.1.17-macos.zip");
  createZip(cleanRoot, cleanZip);
  const clean = await inspectZipDesktopArtifact({
    artifactPath: cleanZip,
    expectedRootName: "matter.app",
    expectedExpandedInspection: expanded,
    buildManifest: manifest,
    corpus,
    displayBase: root,
  });
  assert.equal(clean.verdict, "PASS");
  assert.equal(clean.container_byte_verdict, "PASS");
  assert.equal(clean.container_raw_uninspected_count, 1);
  assert.equal(clean.inspection_method, "zip_extract");
  assert.equal(clean.member_manifest_sha256, expanded.member_manifest_sha256);

  const privateRoot = path.join(root, "private-archive", "matter.app");
  cpSync(cleanRoot, privateRoot, { recursive: true });
  write(path.join(privateRoot, "Contents/Resources/app/compressed.bin"), privateValue.repeat(2048));
  const privateZip = path.join(root, "private-archive.zip");
  createZip(privateRoot, privateZip);
  assert.equal(readFileSync(privateZip).includes(Buffer.from(privateValue)), false, "fixture must hide the protected value from raw bytes");
  await assert.rejects(
    inspectZipDesktopArtifact({
      artifactPath: privateZip,
      expectedRootName: "matter.app",
      expectedExpandedInspection: expanded,
      buildManifest: manifest,
      corpus,
    }),
    (error) => error.code === "EXPANDED_PRIVACY_SCAN_FAILED",
  );
});

test("RFD-TUW-007 rejects raw-only archive substitution", async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "matter.app", manifest);
  const zipPath = path.join(root, "matter-0.1.17-macos.zip");
  createZip(expandedRoot, zipPath);
  await assert.rejects(
    inspectPlainDesktopArtifact({ artifactPath: zipPath, artifactKind: "zip_archive", buildManifest: manifest, corpus }),
    (error) => error.code === "RAW_ONLY_CONTAINER_FORBIDDEN",
  );
});

test("RFD-TUW-007 production archive extractors reject command and callback injection", async () => {
  assert.throws(
    () => createDesktopZipExtractor({ execFile: async () => {} }),
    (error) => error.code === "EXTRACTOR_INJECTION_FORBIDDEN",
  );
  await assert.rejects(
    inspectZipDesktopArtifact({ extract: async () => {} }),
    (error) => error.code === "INSPECTION_OPTION_INVALID",
  );
});

test("RFD-TUW-007 real hdiutil read-only DMG extraction is guarded and executable", {
  skip: process.platform !== "darwin" || !existsSync("/usr/bin/hdiutil"),
}, async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "matter.app", manifest);
  const expanded = await inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus });
  const imageSource = path.join(root, "image-source");
  cpSync(expandedRoot, path.join(imageSource, "matter.app"), { recursive: true });
  const dmgPath = path.join(root, "matter-real-macos.dmg");
  execFileSync("/usr/bin/hdiutil", ["create", "-volname", "matter-privacy-test", "-srcfolder", imageSource, "-ov", "-format", "UDZO", dmgPath]);
  const result = await inspectDmgDesktopArtifact({
    artifactPath: dmgPath,
    expectedRootName: "matter.app",
    expectedExpandedInspection: expanded,
    buildManifest: manifest,
    corpus,
  });
  assert.equal(result.verdict, "PASS");
  assert.equal(result.member_manifest_sha256, expanded.member_manifest_sha256);
});

test("RFD-TUW-007 live validation rejects one-sided and mutually forged archive evidence", async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "matter.app", manifest);
  const expanded = await inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus });
  const zipPath = path.join(root, "matter-0.1.17-macos.zip");
  createZip(expandedRoot, zipPath);
  const archive = await inspectZipDesktopArtifact({
    artifactPath: zipPath,
    expectedRootName: "matter.app",
    expectedExpandedInspection: expanded,
    buildManifest: manifest,
    corpus,
  });
  const artifactRoot = `apps/desktop/dist/releases/${VERSION}/${SOURCE_SHA}/formal`;
  const memberPath = `${artifactRoot}/evidence/members-macos_zip_archive.json`;
  write(path.join(root, memberPath), serializeDesktopArtifactMemberManifest(expanded.member_manifest));
  const artifact = {
    id: "macos_zip_archive",
    kind: "zip_archive",
    sha256: archive.artifact_sha256,
    bytes: archive.artifact_bytes,
  };
  const receipt = createRf13DistPrivacyMemberReceipt({
    receiptId: "RFD007-macos-zip",
    artifact,
    buildManifest: manifest,
    inspection: archive,
    memberManifestPath: memberPath,
  });
  const options = {
    artifact,
    artifactRoot,
    expectedBuildManifestSha256: desktopBuildManifestSha256(manifest),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    repoRoot: root,
  };
  const validation = await validateDesktopArtifactPrivacyEvidence({
    receipt,
    artifact,
    artifactPath: zipPath,
    artifactRoot,
    expectedRootName: "matter.app",
    buildManifest: manifest,
    corpus,
    repoRoot: root,
  });
  assert.equal(validateRf13DistPrivacyMemberReceipt(receipt, { ...options, validation }), receipt);
  assert.throws(
    () => validateRf13DistPrivacyMemberReceipt(receipt, { ...options, validation: { ...validation } }),
    (error) => error.code === "LIVE_PRIVACY_VALIDATION_REQUIRED",
  );
  const relabeledReceipt = { ...receipt, receipt_id: "RFD007-macos-zip-relabeled" };
  assert.equal(validateRf13DistPrivacyMemberReceiptStructure(relabeledReceipt, options), relabeledReceipt);
  assert.throws(
    () => validateRf13DistPrivacyMemberReceipt(relabeledReceipt, { ...options, validation }),
    (error) => error.code === "LIVE_PRIVACY_VALIDATION_MISMATCH",
  );
  for (const mutate of [
    (value) => { value.artifact_sha256 = "9".repeat(64); },
    (value) => { value.member_manifest_sha256 = "8".repeat(64); },
    (value) => {
      value.scan_method = "artifact_bytes";
      value.expanded_scan_verdict = "NOT_APPLICABLE";
      value.member_manifest_path = null;
      value.member_manifest_sha256 = null;
    },
  ]) {
    const forged = structuredClone(receipt);
    mutate(forged);
    assert.throws(() => validateRf13DistPrivacyMemberReceiptStructure(forged, options));
  }

  const fabricatedManifest = structuredClone(expanded.member_manifest);
  fabricatedManifest.members = [{
    path: "fabricated.bin",
    type: "file",
    sha256: "f".repeat(64),
    bytes: 4096,
  }];
  const fabricatedBody = serializeDesktopArtifactMemberManifest(fabricatedManifest);
  write(path.join(root, memberPath), fabricatedBody);
  const mutuallyForged = {
    ...receipt,
    scanned_member_count: 1,
    member_manifest_sha256: sha256(fabricatedBody),
  };
  assert.equal(validateRf13DistPrivacyMemberReceiptStructure(mutuallyForged, options), mutuallyForged);
  await assert.rejects(
    validateDesktopArtifactPrivacyEvidence({
      receipt: mutuallyForged,
      artifact,
      artifactPath: zipPath,
      artifactRoot,
      expectedRootName: "matter.app",
      buildManifest: manifest,
      corpus,
      repoRoot: root,
    }),
    (error) => error.code === "ARCHIVE_MEMBER_MANIFEST_MISMATCH",
  );
});

test("RFD-TUW-007 NSIS remains source-payload-bound and pending until native installed-tree completion", async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  const manifest = buildManifest("formal", "win32");
  const sourceRoot = writeExpandedRoot(root, "win-unpacked", manifest);
  const sourceInspection = await inspectExpandedDesktopArtifact({ rootPath: sourceRoot, buildManifest: manifest, corpus });
  const installerPath = write(path.join(root, "matter-0.1.17-win-x64.exe"), "clean installer bytes\n");
  const byteInspection = await inspectDesktopArtifactBytes({
    artifactPath: installerPath,
    artifactKind: "nsis_installer",
    corpus,
  });
  const artifact = {
    id: "windows_installer",
    kind: "nsis_installer",
    sha256: byteInspection.artifact_sha256,
    bytes: byteInspection.artifact_bytes,
  };
  const builder = createWindowsInstallerPrivacyBuilderReceipt({
    receiptId: "RFD007-windows-installer-builder",
    artifact,
    buildManifest: manifest,
    byteInspection,
    sourcePayloadInspection: sourceInspection,
  });
  assert.equal(builder.status, "PENDING_NATIVE");
  assert.equal(builder.uninspected_archive_count, 1);
  assert.equal(builder.native_completion_required, true);
  assert.equal(validateWindowsInstallerPrivacyBuilderReceipt(builder, {
    artifact,
    buildManifest: manifest,
    byteInspection,
    sourcePayloadInspection: sourceInspection,
  }), builder);
  const falsePass = { ...builder, status: "PASS" };
  assert.throws(() => validateWindowsInstallerPrivacyBuilderReceipt(falsePass, {
    artifact,
    buildManifest: manifest,
    byteInspection,
    sourcePayloadInspection: sourceInspection,
  }));
  const builderValidation = await validateWindowsInstallerPrivacyBuilderEvidence({
    receipt: builder,
    artifact,
    artifactPath: installerPath,
    buildManifest: manifest,
    sourcePayloadPath: sourceRoot,
    corpus,
    displayBase: root,
  });
  assert.equal(builderValidation.verdict, "PENDING_NATIVE");

  const installedRoot = path.join(root, "native-installed");
  cpSync(sourceRoot, installedRoot, { recursive: true });
  write(path.join(installedRoot, "Uninstall matter.exe"), "uninstaller\n");
  const installedInspection = await inspectExpandedDesktopArtifact({ rootPath: installedRoot, buildManifest: manifest, corpus });
  const builderReceiptPath = write(`${installerPath}.privacy-builder.json`, `${JSON.stringify(builder, null, 2)}\n`);
  const fakeStrictPath = write(path.join(root, "artifacts/rfd-tuw-013-windows-native-qa.json"), `${JSON.stringify({
    schema_version: "law-firm-os.rfd-tuw-013.windows-native-qa.v1",
    receipt_id: "rfd-tuw-013-fake-native-pass",
  }, null, 2)}\n`);
  assert.throws(
    () => createWindowsInstallerNativePrivacyReceipt({
      receiptId: "RFD013-windows-installer-native",
      artifact,
      builderReceiptPath,
      installedRootInspection: installedInspection,
      nativeQaReceiptPath: fakeStrictPath,
      repoRoot: root,
    }),
    (error) => error.code === "STRICT_NATIVE_QA_INVALID",
  );
  assert.throws(
    () => createWindowsInstallerNativePrivacyReceipt({
      receiptId: "RFD013-windows-installer-native",
      artifact,
      builderReceiptPath,
      installedRootInspection: installedInspection,
      nativeQaReceiptPath: path.join(root, "artifacts/missing/rfd-tuw-013-windows-native-qa.json"),
      repoRoot: root,
    }),
    (error) => error.code === "EVIDENCE_FILE_MISSING",
  );
});

test("RFD-TUW-007 rejects expanded-tree and raw-artifact mutation at inspection boundaries", async (testContext) => {
  const { root, corpus, privateValue } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "race.app", manifest);
  write(path.join(expandedRoot, "m-large.bin"), Buffer.alloc(32 * 1024 * 1024, 0x61));
  const targetPath = write(path.join(expandedRoot, "z-target.txt"), "clean\n");
  const expandedMutation = new Promise((resolve) => {
    setTimeout(() => {
      writeFileSync(targetPath, privateValue);
      resolve();
    }, 5);
  });
  await assert.rejects(
    inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus, displayBase: root }),
    (error) => new Set(["EXPANDED_TREE_CHANGED", "EXPANDED_PRIVACY_SCAN_FAILED"]).has(error.code),
  );
  await expandedMutation;

  const rawPath = write(path.join(root, "large-receipt.json"), Buffer.alloc(32 * 1024 * 1024, 0x62));
  const rawMutation = new Promise((resolve) => {
    setTimeout(() => {
      writeFileSync(rawPath, privateValue);
      resolve();
    }, 5);
  });
  await assert.rejects(
    inspectDesktopArtifactBytes({ artifactPath: rawPath, artifactKind: "receipt", corpus, displayBase: root }),
    (error) => new Set(["ARTIFACT_CHANGED_DURING_SCAN", "ARTIFACT_BYTE_SCAN_FAILED"]).has(error.code),
  );
  await rawMutation;
});

test("RFD-TUW-007 rejects hardlinks instead of silently deduplicating member inspection", async (testContext) => {
  const { root, corpus } = await fixture(testContext);
  const manifest = buildManifest("formal");
  const expandedRoot = writeExpandedRoot(root, "hardlink.app", manifest);
  const firstPath = write(path.join(expandedRoot, "first.bin"), "clean hardlink bytes\n");
  linkSync(firstPath, path.join(expandedRoot, "second.bin"));
  await assert.rejects(
    inspectExpandedDesktopArtifact({ rootPath: expandedRoot, buildManifest: manifest, corpus }),
    (error) => error.code === "UNSAFE_HARDLINK",
  );
});

test("RFD-TUW-007 corpus loader refuses absent contact authority", async (testContext) => {
  const root = temporaryRoot(testContext);
  await assert.rejects(
    buildDesktopArtifactPrivacyCorpus({ repoRoot: root, env: {} }),
    (error) => error instanceof DesktopArtifactPrivacyError && error.code === "CONTACT_AUTHORITY_REQUIRED",
  );
});

test("RFD-TUW-007 exposes only an opaque deterministic shared-corpus digest", async (testContext) => {
  const { corpus, privateValue } = await fixture(testContext);
  const digest = desktopArtifactPrivacyCorpusSha256(corpus);
  assert.match(digest, /^[0-9a-f]{64}$/u);
  assert.equal(desktopArtifactPrivacyCorpusSha256(corpus), digest);
  assert.equal(digest.includes(privateValue), false);
  assert.equal(validateDesktopArtifactPrivacyCorpusSha256(corpus, digest), digest);
  assert.throws(
    () => validateDesktopArtifactPrivacyCorpusSha256(corpus, "f".repeat(64)),
    (error) => error.code === "CORPUS_DIGEST_MISMATCH",
  );
});
