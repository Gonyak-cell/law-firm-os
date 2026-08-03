import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  buildDesktopArtifactPrivacyCorpus,
  createRf13DistPrivacyMemberReceipt,
  createWindowsInstallerPrivacyBuilderReceipt,
  expandedDesktopArtifactDescriptor,
  inspectDesktopArtifactBytes,
  inspectDmgDesktopArtifact,
  inspectExpandedDesktopArtifact,
  inspectZipDesktopArtifact,
  serializeDesktopArtifactMemberManifest,
} from "../lib/matter-desktop-artifact-privacy.mjs";
import {
  desktopReleaseTreeManifest,
  publishPreparedDesktopRelease,
} from "../lib/matter-desktop-release-promotion.mjs";
import {
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
  serializeDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";

const STAGE_SCRIPT = path.resolve(import.meta.dirname, "../stage-matter-desktop-release-artifacts.mjs");
const MAC_BUILDER = path.resolve(import.meta.dirname, "../build-matter-desktop-mac.mjs");
const WINDOWS_BUILDER = path.resolve(import.meta.dirname, "../build-matter-desktop-win.mjs");
const WINDOWS_INSTALLER_BUILDER = path.resolve(import.meta.dirname, "../build-matter-desktop-win-installer.mjs");
const RELEASE_PROMOTION_MODULE = path.resolve(import.meta.dirname, "../lib/matter-desktop-release-promotion.mjs");
const VERSION = "0.1.17";
const RENDERER = Object.freeze({
  sha256: "3".repeat(64),
  file_count: 2,
  algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM,
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function write(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
  return filePath;
}

function writeJson(filePath, value) {
  return write(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function fileDescriptor(id, kind, filePath) {
  const body = readFileSync(filePath);
  return Object.freeze({ id, kind, sha256: sha256(body), bytes: body.length });
}

function createZip(sourceRoot, targetPath) {
  execFileSync("/usr/bin/zip", ["-qry", targetPath, path.basename(sourceRoot)], {
    cwd: path.dirname(sourceRoot),
  });
}

function initializeRepository(root) {
  write(root + "/.gitignore", "apps/desktop/dist/\ndocs/lazycodex/evidence/\nartifacts/\n");
  writeJson(root + "/apps/desktop/package.json", { name: "@law-firm-os/desktop", version: VERSION });
  write(root + "/source.txt", "stage fixture source\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.name", "RFD007 Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "rfd007-test@example.invalid"], { cwd: root });
  execFileSync("git", ["add", ".gitignore", "apps/desktop/package.json", "source.txt"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
  return Object.freeze({
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    sourceTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: root, encoding: "utf8" }).trim(),
  });
}

function buildManifest({ channel, platform, sourceSha, sourceTree }) {
  const formal = channel === "formal";
  const config = desktopReleaseChannelConfig(channel);
  return createDesktopBuildManifest({
    version: VERSION,
    sourceSha,
    sourceTree,
    sourceDirty: false,
    renderer: RENDERER,
    channel,
    platform,
    arch: platform === "darwin" ? "arm64" : "x64",
    appId: config.appId,
    requestedRuntimeMode: formal ? "none" : "private-local",
    effectiveRuntimeMode: formal ? "none" : "private-local",
    runtimeIncluded: !formal,
    runtimeDataClass: formal ? "none" : "private_local",
    nonDistributable: !formal,
    distributable: formal,
    builtAt: "2026-08-01T00:00:00.000Z",
  });
}

function writeExpandedRoot(rootPath, manifest) {
  const embedded = manifest.platform === "darwin"
    ? path.join(rootPath, "Contents/Resources/matter-build-manifest.json")
    : path.join(rootPath, "resources/matter-build-manifest.json");
  write(embedded, serializeDesktopBuildManifest(manifest));
  write(
    path.join(rootPath, manifest.platform === "darwin" ? "Contents/MacOS/matter" : "matter.exe"),
    "executable bytes\n",
  );
  write(
    path.join(rootPath, manifest.platform === "darwin" ? "Contents/Resources/app/index.js" : "resources/app/index.js"),
    "export const ready = true;\n",
  );
}

function writeBuildReceipt(filePath, { channel, appId, sourceSha, sourceTree }) {
  write(filePath, [
    "# fixture build receipt",
    `Version: \`${VERSION}\``,
    `Channel: \`${channel}\``,
    `App ID: \`${appId}\``,
    `Source SHA: \`${sourceSha}\``,
    `Source tree: \`${sourceTree}\``,
    "Source dirty: `false`",
    "",
  ].join("\n"));
}

async function createFormalPrivacyEvidence(value) {
  const corpus = await buildDesktopArtifactPrivacyCorpus({
    repoRoot: value.root,
    rosterSourcePath: value.sources.roster,
    contactSourcePath: value.sources.contact,
    registrationSeedSourcePath: value.sources.registration,
    photoSourcePath: value.sources.photos,
    env: {},
  });
  const macExpanded = await inspectExpandedDesktopArtifact({
    rootPath: value.macApp,
    buildManifest: value.macManifest,
    corpus,
    displayBase: value.root,
  });
  const winExpanded = await inspectExpandedDesktopArtifact({
    rootPath: value.winPackage,
    buildManifest: value.windowsManifest,
    corpus,
    displayBase: value.root,
  });
  const archiveRows = [
    {
      artifact: expandedDesktopArtifactDescriptor({
        id: "windows_package_directory",
        inspection: winExpanded,
      }),
      inspection: winExpanded,
      expanded: winExpanded,
      artifactRoot: "apps/desktop/dist/win/privacy",
      receiptPath: `${value.winPackage}.privacy.json`,
    },
    {
      artifact: fileDescriptor("macos_zip_archive", "zip_archive", value.paths.macZip),
      inspection: await inspectZipDesktopArtifact({
        artifactPath: value.paths.macZip,
        expectedRootName: "matter.app",
        expectedExpandedInspection: macExpanded,
        buildManifest: value.macManifest,
        corpus,
      }),
      expanded: macExpanded,
      artifactRoot: "apps/desktop/dist/mac/privacy",
      receiptPath: `${value.paths.macZip}.privacy.json`,
    },
    {
      artifact: fileDescriptor("macos_dmg_image", "dmg_image", value.paths.macDmg),
      inspection: await inspectDmgDesktopArtifact({
        artifactPath: value.paths.macDmg,
        expectedRootName: "matter.app",
        expectedExpandedInspection: macExpanded,
        buildManifest: value.macManifest,
        corpus,
      }),
      expanded: macExpanded,
      artifactRoot: "apps/desktop/dist/mac/privacy",
      receiptPath: `${value.paths.macDmg}.privacy.json`,
    },
    {
      artifact: fileDescriptor("windows_package_zip", "unsigned_package_zip", value.paths.winZip),
      inspection: await inspectZipDesktopArtifact({
        artifactPath: value.paths.winZip,
        artifactKind: "unsigned_package_zip",
        expectedRootName: path.basename(value.winPackage),
        expectedExpandedInspection: winExpanded,
        buildManifest: value.windowsManifest,
        corpus,
      }),
      expanded: winExpanded,
      artifactRoot: "apps/desktop/dist/win/privacy",
      receiptPath: `${value.paths.winZip}.privacy.json`,
    },
  ];
  for (const row of archiveRows) {
    const memberPath = `${row.artifactRoot}/evidence/members-${row.artifact.id}.json`;
    writeJson(path.join(value.root, memberPath), row.expanded.member_manifest);
    writeJson(row.receiptPath, createRf13DistPrivacyMemberReceipt({
      receiptId: `rfd-tuw-007-stage-${row.artifact.id}`,
      artifact: row.artifact,
      buildManifest: row.artifact.id.startsWith("macos_") ? value.macManifest : value.windowsManifest,
      inspection: row.inspection,
      memberManifestPath: memberPath,
    }));
  }

  const installerExpanded = await inspectExpandedDesktopArtifact({
    rootPath: value.winUnpacked,
    buildManifest: value.windowsManifest,
    corpus,
    displayBase: value.root,
  });
  const installerBytes = await inspectDesktopArtifactBytes({
    artifactPath: value.paths.installer,
    artifactKind: "nsis_installer",
    corpus,
    displayBase: value.root,
  });
  const installerArtifact = fileDescriptor("windows_installer", "nsis_installer", value.paths.installer);
  writeJson(`${value.paths.installer}.privacy-builder.json`, createWindowsInstallerPrivacyBuilderReceipt({
    receiptId: "rfd-tuw-007-stage-windows-installer-builder",
    artifact: installerArtifact,
    buildManifest: value.windowsManifest,
    byteInspection: installerBytes,
    sourcePayloadInspection: installerExpanded,
  }));
}

async function fixture(testContext, { channel = "formal" } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "rfd007-stage-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const source = initializeRepository(root);
  const config = desktopReleaseChannelConfig(channel);
  const artifactName = `${config.artifactPrefix}-${VERSION}`;
  const macManifest = buildManifest({ channel, platform: "darwin", ...source });
  const windowsManifest = buildManifest({ channel, platform: "win32", ...source });
  const macApp = path.join(root, "apps/desktop/dist/mac/matter.app");
  const winPackage = path.join(root, `apps/desktop/dist/win/${artifactName}-win32-x64`);
  const winUnpacked = path.join(root, "apps/desktop/dist/win-unpacked");
  writeExpandedRoot(macApp, macManifest);
  writeExpandedRoot(winPackage, windowsManifest);
  writeExpandedRoot(winUnpacked, windowsManifest);
  const paths = {
    macManifest: path.join(root, `apps/desktop/dist/mac/${artifactName}-macos-build-manifest.json`),
    macZip: path.join(root, `apps/desktop/dist/mac/${artifactName}-macos.zip`),
    macDmg: path.join(root, `apps/desktop/dist/mac/${artifactName}-macos.dmg`),
    winManifest: path.join(root, `apps/desktop/dist/win/${artifactName}-win-build-manifest.json`),
    winZip: path.join(root, `apps/desktop/dist/win/${artifactName}-win32-x64-unsigned.zip`),
    installerManifest: path.join(root, `apps/desktop/dist/win/${artifactName}-win-installer-manifest.json`),
    installerSignature: path.join(root, `apps/desktop/dist/win/${artifactName}-win-installer-manifest.json.sig`),
    installer: path.join(root, `apps/desktop/dist/${artifactName}-win-x64.exe`),
    blockmap: path.join(root, `apps/desktop/dist/${artifactName}-win-x64.exe.blockmap`),
  };
  write(paths.macManifest, serializeDesktopBuildManifest(macManifest));
  write(paths.winManifest, serializeDesktopBuildManifest(windowsManifest));
  write(paths.installerManifest, "installer manifest\n");
  write(paths.installerSignature, "installer signature\n");
  writeBuildReceipt(path.join(root, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md"), {
    channel,
    appId: config.appId,
    sourceSha: source.sourceSha,
    sourceTree: source.sourceTree,
  });
  writeBuildReceipt(path.join(root, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md"), {
    channel,
    appId: config.appId,
    sourceSha: source.sourceSha,
    sourceTree: source.sourceTree,
  });
  const sources = {
    roster: writeJson(path.join(root, "artifacts/privacy-sources/roster.json"), {
      tenant_id: "stage-private-tenant-8821",
      members: [{ display_name: "Stage Private 8821", employee_id: "stage-private-8821" }],
    }),
    contact: writeJson(path.join(root, "artifacts/privacy-sources/contact.json"), {
      contacts: [{ work_email: "stage-private-8821@example.invalid", mobile_phone: "+82-10-8821-4411" }],
    }),
    registration: writeJson(path.join(root, "artifacts/privacy-sources/registration.json"), {
      users: [{ user_id: "stage-private-user-8821", clientSecret: "stage-private-secret-8821" }],
    }),
    photos: path.join(root, "artifacts/privacy-sources/photos"),
  };
  write(path.join(sources.photos, "private.png"), Buffer.from([8, 8, 2, 1, 4, 4]));
  if (channel === "formal") {
    createZip(macApp, paths.macZip);
    createZip(winPackage, paths.winZip);
    execFileSync("/usr/bin/hdiutil", [
      "create", "-volname", "rfd007-stage", "-srcfolder", macApp, "-ov", "-format", "UDZO", paths.macDmg,
    ]);
    write(paths.installer, "clean installer bytes\n");
    write(paths.blockmap, "clean blockmap bytes\n");
  } else {
    write(paths.macZip, "internal private ZIP placeholder\n");
    write(paths.macDmg, "internal private DMG placeholder\n");
    write(paths.winZip, "internal private ZIP placeholder\n");
  }
  const value = {
    root,
    source,
    channel,
    artifactName,
    macManifest,
    windowsManifest,
    macApp,
    winPackage,
    winUnpacked,
    paths,
    sources,
  };
  if (channel === "formal") await createFormalPrivacyEvidence(value);
  return value;
}

function runStage(value) {
  return spawnSync(process.execPath, [STAGE_SCRIPT], {
    cwd: value.root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    env: {
      ...process.env,
      MATTER_DESKTOP_RELEASE_CHANNEL: value.channel,
      MATTER_DESKTOP_EXPECTED_SOURCE_SHA: value.source.sourceSha,
      LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: value.sources.roster,
      LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: value.sources.contact,
      LAWOS_MATTER_VAULT_USER_REGISTRATION_SEED_PATH: value.sources.registration,
      LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: value.sources.photos,
    },
  });
}

test("RFD-TUW-007 release stage accepts live formal evidence and rejects missing or mutually forged sidecars", {
  skip: process.platform !== "darwin" || !existsSync("/usr/bin/hdiutil") || !existsSync("/usr/bin/zip"),
}, async (testContext) => {
  const value = await fixture(testContext);
  const success = runStage(value);
  assert.equal(success.status, 0, success.stderr);
  const output = JSON.parse(success.stdout);
  assert.equal(output.verdict, "PASS_PENDING_WINDOWS_NATIVE");
  assert.equal(output.publication, "PROMOTED");
  assert.equal(output.privacy_member_count, 12);
  const releaseRoot = path.join(value.root, output.artifact_root);
  const artifactIndexPath = path.join(releaseRoot, "artifact-index.json");
  const privacyIndexPath = path.join(releaseRoot, "evidence/privacy-index.json");
  assert.equal(existsSync(artifactIndexPath), true);
  assert.equal(JSON.parse(readFileSync(privacyIndexPath, "utf8")).status, "PENDING_WINDOWS_NATIVE");
  const preservedIndex = readFileSync(artifactIndexPath);

  const idempotent = runStage(value);
  assert.equal(idempotent.status, 0, idempotent.stderr);
  assert.equal(JSON.parse(idempotent.stdout).publication, "EXACT_IDEMPOTENT");
  assert.deepEqual(readFileSync(artifactIndexPath), preservedIndex, "exact rerun must not rewrite the live release root");

  const missingPath = `${value.paths.winZip}.privacy.json`;
  const savedMissing = readFileSync(missingPath);
  unlinkSync(missingPath);
  const missing = runStage(value);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /missing mandatory artifact privacy sidecar/u);
  assert.deepEqual(readFileSync(artifactIndexPath), preservedIndex, "missing evidence must not replace the prior release stage");
  write(missingPath, savedMissing);

  const windowsBuildReceiptPath = path.join(value.root, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
  const savedWindowsBuildReceipt = readFileSync(windowsBuildReceiptPath);
  write(windowsBuildReceiptPath, Buffer.concat([
    savedWindowsBuildReceipt,
    Buffer.from("stage-private-8821@example.invalid\n", "utf8"),
  ]));
  const privacyInvalid = runStage(value);
  assert.notEqual(privacyInvalid.status, 0);
  assert.match(privacyInvalid.stderr, /artifact byte scan found protected data/u);
  assert.deepEqual(readFileSync(artifactIndexPath), preservedIndex, "privacy-invalid plain evidence must restore the prior release stage");
  write(windowsBuildReceiptPath, savedWindowsBuildReceipt);

  const memberPath = path.join(value.root, "apps/desktop/dist/mac/privacy/evidence/members-macos_zip_archive.json");
  const receiptPath = `${value.paths.macZip}.privacy.json`;
  const memberManifest = JSON.parse(readFileSync(memberPath, "utf8"));
  memberManifest.members = [{ path: "fabricated.bin", type: "file", sha256: "f".repeat(64), bytes: 4096 }];
  const memberBody = serializeDesktopArtifactMemberManifest(memberManifest);
  write(memberPath, memberBody);
  const forgedReceipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  forgedReceipt.scanned_member_count = 1;
  forgedReceipt.member_manifest_sha256 = sha256(memberBody);
  writeJson(receiptPath, forgedReceipt);
  const forged = runStage(value);
  assert.notEqual(forged.status, 0);
  assert.match(forged.stderr, /archive members do not match/u);
  assert.deepEqual(readFileSync(artifactIndexPath), preservedIndex, "forged evidence must not replace the prior release stage");
  const candidateNames = readdirSync(path.dirname(releaseRoot)).filter((name) => name.includes(".rfd007-candidate-"));
  assert.deepEqual(candidateNames, [], "ordinary validation failures must not retain candidate directories");
});

test("RFD-TUW-007 release stage rejects an internal private-runtime fixture before sidecar acceptance", async (testContext) => {
  const value = await fixture(testContext, { channel: "internal" });
  const result = runStage(value);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release staging requires runtime mode none/u);
});

test("RFD-TUW-007 atomic publication rejects a boundary mutation before it reaches the live root", async (testContext) => {
  const root = mkdtempSync(path.join(tmpdir(), "rfd007-promotion-mutation-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const candidateRoot = path.join(root, ".release.candidate");
  const releaseRoot = path.join(root, "release");
  const candidateArtifact = write(path.join(candidateRoot, "artifact-index.json"), "candidate complete\n");
  write(path.join(candidateRoot, "evidence/privacy-index.json"), "privacy complete\n");

  await assert.rejects(
    publishPreparedDesktopRelease({
      candidateRoot,
      releaseRoot,
      checkpoint: async (point) => {
        if (point === "atomic_rename_boundary") write(candidateArtifact, "mutated at boundary\n");
      },
    }),
    (error) => error.code === "RELEASE_CANDIDATE_CHANGED",
  );
  assert.equal(existsSync(releaseRoot), false, "mutated candidate must never become the live release root");
  assert.equal(readFileSync(candidateArtifact, "utf8"), "mutated at boundary\n");
});

test("RFD-TUW-007 atomic publication survives process death before, at, and after rename", {
  skip: process.platform === "win32",
}, async (testContext) => {
  const root = mkdtempSync(path.join(tmpdir(), "rfd007-promotion-death-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const runnerPath = write(path.join(root, "kill-at-checkpoint.mjs"), [
    `import { publishPreparedDesktopRelease } from ${JSON.stringify(pathToFileURL(RELEASE_PROMOTION_MODULE).href)};`,
    "const [candidateRoot, releaseRoot, deathPoint] = process.argv.slice(2);",
    "await publishPreparedDesktopRelease({",
    "  candidateRoot,",
    "  releaseRoot,",
    "  checkpoint: async (point) => { if (point === deathPoint) process.kill(process.pid, 'SIGKILL'); },",
    "});",
    "",
  ].join("\n"));

  for (const [label, deathPoint, promoted] of [
    ["before", "prepared_and_synced", false],
    ["boundary", "atomic_rename_boundary", false],
    ["after", "atomic_rename_complete", true],
  ]) {
    const caseRoot = path.join(root, label);
    const priorRoot = path.join(caseRoot, "prior-release");
    const candidateRoot = path.join(caseRoot, ".release.candidate");
    const releaseRoot = path.join(caseRoot, "release");
    write(path.join(priorRoot, "artifact-index.json"), "prior complete\n");
    write(path.join(candidateRoot, "artifact-index.json"), "new complete\n");
    write(path.join(candidateRoot, "evidence/privacy-index.json"), "privacy complete\n");
    const result = spawnSync(process.execPath, [runnerPath, candidateRoot, releaseRoot, deathPoint], {
      encoding: "utf8",
    });
    assert.equal(result.signal, "SIGKILL", `${label} checkpoint must terminate the publisher process`);
    assert.equal(readFileSync(path.join(priorRoot, "artifact-index.json"), "utf8"), "prior complete\n");
    assert.equal(existsSync(releaseRoot), promoted);
    assert.equal(existsSync(candidateRoot), !promoted);
    const visibleNewRoot = promoted ? releaseRoot : candidateRoot;
    assert.deepEqual((await desktopReleaseTreeManifest(visibleNewRoot)).map(({ path: filePath }) => filePath), [
      "artifact-index.json",
      "evidence/privacy-index.json",
    ]);
  }
});

test("RFD-TUW-007 atomic publication is exact-idempotent and rejects release-root collisions", async (testContext) => {
  const root = mkdtempSync(path.join(tmpdir(), "rfd007-promotion-collision-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const releaseRoot = path.join(root, "release");
  const exactCandidate = path.join(root, ".exact-candidate");
  write(path.join(releaseRoot, "artifact-index.json"), "same\n");
  write(path.join(exactCandidate, "artifact-index.json"), "same\n");
  assert.deepEqual(await publishPreparedDesktopRelease({ candidateRoot: exactCandidate, releaseRoot }), {
    status: "EXACT_IDEMPOTENT",
    file_count: 1,
  });
  assert.equal(existsSync(exactCandidate), false);
  assert.equal(readFileSync(path.join(releaseRoot, "artifact-index.json"), "utf8"), "same\n");

  const collisionCandidate = path.join(root, ".collision-candidate");
  write(path.join(collisionCandidate, "artifact-index.json"), "different\n");
  await assert.rejects(
    publishPreparedDesktopRelease({ candidateRoot: collisionCandidate, releaseRoot }),
    (error) => error.code === "RELEASE_ROOT_COLLISION",
  );
  assert.equal(readFileSync(path.join(releaseRoot, "artifact-index.json"), "utf8"), "same\n");
  assert.equal(readFileSync(path.join(collisionCandidate, "artifact-index.json"), "utf8"), "different\n");
});

test("RFD-TUW-007 production builders emit every mandatory post-package privacy sidecar", () => {
  const mac = readFileSync(MAC_BUILDER, "utf8");
  const windows = readFileSync(WINDOWS_BUILDER, "utf8");
  const installer = readFileSync(WINDOWS_INSTALLER_BUILDER, "utf8");
  const stage = readFileSync(STAGE_SCRIPT, "utf8");

  assert.ok(mac.indexOf("await execFileAsync(\"/usr/bin/hdiutil\", [\"create\", \"-volname\", \"matter\", \"-srcfolder\", appBundle, \"-ov\", \"-format\", \"UDZO\", dmgPath]);") < mac.indexOf("if (formalRelease) {\n  const corpus = await buildDesktopArtifactPrivacyCorpus"));
  assert.match(mac, /const zipPrivacyReceiptPath = `\$\{zipPath\}\.privacy\.json`/u);
  assert.match(mac, /const dmgPrivacyReceiptPath = `\$\{dmgPath\}\.privacy\.json`/u);
  assert.match(mac, /inspectZipDesktopArtifact\(\{/u);
  assert.match(mac, /inspectDmgDesktopArtifact\(\{/u);

  assert.ok(windows.indexOf("await zipPackageDirectory(packageDir, packageZipPath);") < windows.indexOf("if (formalRelease) {\n  const corpus = await buildDesktopArtifactPrivacyCorpus"));
  assert.match(windows, /const packageDirectoryPrivacyReceiptPath = `\$\{packageDir\}\.privacy\.json`/u);
  assert.match(windows, /const packageZipPrivacyReceiptPath = `\$\{packageZipPath\}\.privacy\.json`/u);
  assert.match(windows, /expandedDesktopArtifactDescriptor\(\{\s*id: "windows_package_directory"/u);

  assert.ok(installer.indexOf("const installer = await fileRecord(installerPath);") < installer.indexOf("if (formalRelease) {\n  const corpus = await buildDesktopArtifactPrivacyCorpus"));
  assert.match(installer, /const installerPrivacyBuilderReceiptPath = `\$\{installerPath\}\.privacy-builder\.json`/u);
  assert.match(installer, /createWindowsInstallerPrivacyBuilderReceipt\(\{/u);

  for (const mandatoryPath of [
    "generic.mac.zipPrivacyReceipt",
    "generic.mac.dmgPrivacyReceipt",
    "generic.windows.directoryPrivacyReceipt",
    "generic.windows.zipPrivacyReceipt",
  ]) {
    assert.match(stage, new RegExp(mandatoryPath.replaceAll(".", "\\."), "u"));
  }
  assert.match(stage, /assert\.equal\(existsSync\(generic\.windows\.installerPrivacyBuilderReceipt\), true/u);
  assert.doesNotMatch(stage, /releaseBackup|rename\(releaseRoot/u);
  assert.match(stage, /publishPreparedDesktopRelease\(\{ candidateRoot, releaseRoot \}\)/u);
});
