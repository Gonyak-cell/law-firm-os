import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { linkSync, readFileSync, realpathSync, renameSync, symlinkSync } from "node:fs";
import { chmod, mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  __testOnlySnapshotAuthenticatedSessionFixture,
  blockedByArtifactReceipt,
  measureBundle,
  measureColdStartRuns,
  measureColdStartRunsCanonically,
  sanitizedHostFingerprint,
  summarizeColdStartRuns,
  validateColdStartReceipt,
  validateColdStartReceiptAuthoritatively,
  validateFormalPackagedArtifactAuthoritatively,
} from "../lib/matter-desktop-cold-start-contract.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  createRf13DistPrivacyMemberReceipt,
  inspectExpandedDesktopArtifact,
  inspectZipDesktopArtifact,
  serializeDesktopArtifactMemberManifest,
  validateDesktopArtifactPrivacyEvidence,
} from "../lib/matter-desktop-artifact-privacy.mjs";
import { createDesktopBuildManifest } from "../lib/matter-desktop-provenance.mjs";
import { validateColdStartProducerEvidence } from "../lib/matter-rf13-operational-evidence.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const ELECTRON_EXECUTABLE = require("electron");
const VERSION = "1.2.3";
const HOST = sanitizedHostFingerprint({
  platformName: "darwin",
  architecture: "arm64",
  osRelease: "23.5.0",
  cpuCount: 10,
  memoryBytes: 16 * 1024 ** 3,
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function write(target, body, mode = null) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  if (mode !== null) await chmod(target, mode);
}

async function git(root, args) {
  return (await execFileAsync("git", args, { cwd: root })).stdout.trim();
}

async function sourceIdentity(root, revision = "HEAD") {
  return Object.freeze({
    sourceSha: await git(root, ["rev-parse", `${revision}^{commit}`]),
    sourceTree: await git(root, ["rev-parse", `${revision}^{tree}`]),
  });
}

async function initializeRepository() {
  const root = realpathSync(await mkdtemp(path.join(tmpdir(), "cold-start-historical-authority-")));
  await git(root, ["init", "-q", "-b", "main"]);
  await git(root, ["config", "user.email", "cold-start-history@example.invalid"]);
  await git(root, ["config", "user.name", "Cold Start History"]);
  await write(path.join(root, ".gitignore"), [
    "apps/desktop/dist/",
    "artifacts/",
    "privacy-sources/",
    "race/",
    "session-fixtures/",
    "*.receipt.json",
    "",
  ].join("\n"));
  await write(path.join(root, "source.txt"), "baseline\n");
  await git(root, ["add", ".gitignore", "source.txt"]);
  await git(root, ["commit", "-q", "-m", "baseline"]);
  const baseline = await sourceIdentity(root);

  await write(path.join(root, "source.txt"), "candidate\n");
  await git(root, ["add", "source.txt"]);
  await git(root, ["commit", "-q", "-m", "candidate"]);
  const candidate = await sourceIdentity(root);

  await write(path.join(root, "source.txt"), "current head\n");
  await git(root, ["add", "source.txt"]);
  await git(root, ["commit", "-q", "-m", "current head"]);
  const head = await sourceIdentity(root);

  await git(root, ["switch", "-q", "--orphan", "unrelated"]);
  await write(path.join(root, ".gitignore"), [
    "apps/desktop/dist/",
    "artifacts/",
    "privacy-sources/",
    "race/",
    "session-fixtures/",
    "*.receipt.json",
    "",
  ].join("\n"));
  await write(path.join(root, "source.txt"), "unrelated root\n");
  await git(root, ["add", ".gitignore", "source.txt"]);
  await git(root, ["commit", "-q", "-m", "unrelated root"]);
  const unrelated = await sourceIdentity(root);
  await git(root, ["switch", "-q", "main"]);
  return { root, baseline, candidate, head, unrelated };
}

async function createPrivacyCorpus(root) {
  const sources = {
    roster: path.join(root, "privacy-sources/roster.json"),
    contact: path.join(root, "privacy-sources/contact.json"),
    registrationSeed: path.join(root, "privacy-sources/registration.json"),
    photos: path.join(root, "privacy-sources/photos"),
  };
  await write(sources.roster, `${JSON.stringify({
    tenant_id: "cold-start-history-private-tenant",
    members: [{
      display_name: "Cold Start History Private Person",
      employee_id: "cold-start-history-private-employee",
      work_email: "cold-start-history-private@example.invalid",
    }],
  })}\n`);
  await write(sources.contact, `${JSON.stringify({
    contacts: [{ work_email: "cold-start-history-private@example.invalid", mobile_phone: "+82-10-2000-3000" }],
  })}\n`);
  await write(sources.registrationSeed, `${JSON.stringify({
    users: [{ user_id: "cold-start-history-private-user", clientSecret: "cold-start-history-private-secret" }],
  })}\n`);
  await write(path.join(sources.photos, "private.png"), Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]));
  return buildDesktopArtifactPrivacyCorpus({
    repoRoot: root,
    rosterSourcePath: sources.roster,
    contactSourcePath: sources.contact,
    registrationSeedSourcePath: sources.registrationSeed,
    photoSourcePath: sources.photos,
    env: {},
  });
}

async function createZipArchive(sourceRoot, archivePath) {
  await mkdir(path.dirname(archivePath), { recursive: true });
  await execFileAsync("/usr/bin/zip", ["-qry", archivePath, path.basename(sourceRoot)], {
    cwd: path.dirname(sourceRoot),
  });
}

async function createSealedArtifact(root, corpus, source, label, {
  launchable = true,
  version = VERSION,
} = {}) {
  const artifactPath = path.join(root, "artifacts", label, "matter.app");
  const rendererPath = path.join(artifactPath, "Contents/Resources/app/src/renderer/web");
  const executablePath = path.join(artifactPath, "Contents/MacOS/matter");
  await write(path.join(rendererPath, "index.html"), `<!doctype html><div data-source="${label}"></div>\n`);
  await write(path.join(rendererPath, "assets/index.js"), `console.log(${JSON.stringify(label)});\n`);
  const mainPath = path.join(artifactPath, "Contents/Resources/app/cold-start-main.cjs");
  const readyPagePath = path.join(artifactPath, "Contents/Resources/app/cold-start-ready.html");
  if (!launchable) {
    await write(
      path.join(artifactPath, "Contents/Resources/app/cold-start-failure.js"),
      'throw new Error("intentional canonical cold-start failure fixture");\n',
    );
  }
  await write(readyPagePath, [
    "<!doctype html>",
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; style-src \'unsafe-inline\'">',
    "<style>main { display: block; }</style>",
    ...(!launchable ? ['<script src="cold-start-failure.js"></script>'] : []),
    '<main data-home-dashboard-shell="true">ready</main>',
    "",
  ].join("\n"));
  await write(mainPath, [
    'process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";',
    'const path = require("node:path");',
    'const { app, BrowserWindow } = require("electron");',
    'app.setPath("userData", process.env.MATTER_DESKTOP_USER_DATA_PATH);',
    "let window;",
    "app.whenReady().then(async () => {",
    "  window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false } });",
    '  await window.loadFile(path.join(__dirname, "cold-start-ready.html"));',
    "  window.show();",
    "});",
    'app.on("window-all-closed", () => app.quit());',
    "",
  ].join("\n"));
  await write(
    executablePath,
    `#!/bin/sh\nexec ${JSON.stringify(ELECTRON_EXECUTABLE)} ${JSON.stringify(mainPath)} "$@"\n`,
    0o755,
  );
  const renderer = measureBundle(rendererPath, { includeTypes: false });
  const builtAt = new Date(Date.now() - 60_000).toISOString();
  const manifest = createDesktopBuildManifest({
    version,
    sourceSha: source.sourceSha,
    sourceTree: source.sourceTree,
    sourceDirty: false,
    renderer: {
      sha256: renderer.sha256,
      file_count: renderer.file_count,
      algorithm: renderer.algorithm,
    },
    channel: "formal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop",
    requestedRuntimeMode: "none",
    effectiveRuntimeMode: "none",
    runtimeIncluded: false,
    runtimeDataClass: "none",
    nonDistributable: false,
    distributable: true,
    builtAt,
  });
  const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestPath = path.join(root, "artifacts", label, "formal-build-manifest.json");
  await write(path.join(artifactPath, "Contents/Resources/matter-build-manifest.json"), manifestBody);
  await write(manifestPath, manifestBody);

  const artifactRoot = `apps/desktop/dist/releases/${version}/${source.sourceSha}/formal`;
  const buildManifestPath = `${artifactRoot}/mac/matter-${version}-macos-build-manifest.json`;
  await write(path.join(root, buildManifestPath), manifestBody);
  const archivePathRelative = `${artifactRoot}/mac/matter-${version}-macos.zip`;
  const archivePath = path.join(root, archivePathRelative);
  await createZipArchive(artifactPath, archivePath);
  const expanded = await inspectExpandedDesktopArtifact({
    rootPath: artifactPath,
    buildManifest: manifest,
    corpus,
    displayBase: root,
  });
  const provisionalArchive = {
    id: "macos_zip_archive",
    path: archivePathRelative,
    platform: "darwin",
    kind: "zip_archive",
    bytes: (await stat(archivePath)).size,
    sha256: sha256(readFileSync(archivePath)),
  };
  const archiveInspection = await inspectZipDesktopArtifact({
    artifactPath: archivePath,
    artifactKind: provisionalArchive.kind,
    expectedRootName: "matter.app",
    expectedExpandedInspection: expanded,
    buildManifest: manifest,
    corpus,
    displayBase: root,
  });
  const memberManifestRelative = `${artifactRoot}/evidence/members-${provisionalArchive.id}.json`;
  await write(path.join(root, memberManifestRelative), serializeDesktopArtifactMemberManifest(expanded.member_manifest));
  const privacyReceipt = createRf13DistPrivacyMemberReceipt({
    receiptId: `RFD018-PRIVACY-${label}`,
    artifact: provisionalArchive,
    buildManifest: manifest,
    inspection: archiveInspection,
    memberManifestPath: memberManifestRelative,
  });
  const privacyReceiptRelative = `${artifactRoot}/evidence/privacy-${provisionalArchive.id}.json`;
  const privacyReceiptBody = `${JSON.stringify(privacyReceipt, null, 2)}\n`;
  await write(path.join(root, privacyReceiptRelative), privacyReceiptBody);

  const buildManifestDescriptor = {
    id: "macos_build_manifest",
    path: buildManifestPath,
    platform: "darwin",
    kind: "build_manifest",
    bytes: Buffer.byteLength(manifestBody),
    sha256: sha256(manifestBody),
  };
  const releaseIndexRelative = `${artifactRoot}/artifact-index.json`;
  const releaseIndexBody = `${JSON.stringify({
    schema_version: "law-firm-os.matter-desktop-release-artifacts.v1",
    source_sha: source.sourceSha,
    source_tree: source.sourceTree,
    artifacts: [buildManifestDescriptor, provisionalArchive],
  }, null, 2)}\n`;
  await write(path.join(root, releaseIndexRelative), releaseIndexBody);
  const rf13Manifest = {
    schema_version: "law-firm-os.rf13-dist.manifest.v1",
    manifest_id: "RF13-DIST",
    status: "PASS",
    template: false,
    source: { sha: source.sourceSha, tree: source.sourceTree, dirty: false },
    release: {
      version,
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      artifact_root: artifactRoot,
      release_index: { path: releaseIndexRelative, sha256: sha256(releaseIndexBody) },
    },
    artifacts: [buildManifestDescriptor, provisionalArchive],
    gates: {
      privacy: {
        status: "PASS",
        members: [{
          artifact_id: provisionalArchive.id,
          receipt: { path: privacyReceiptRelative, sha256: sha256(privacyReceiptBody) },
        }],
      },
    },
    sealed_at: builtAt,
  };
  const rf13Relative = `${artifactRoot}/evidence/rf13-dist.json`;
  const rf13Body = `${JSON.stringify(rf13Manifest, null, 2)}\n`;
  await write(path.join(root, rf13Relative), rf13Body);
  const authority = {
    rf13_dist_manifest_path: rf13Relative,
    rf13_dist_manifest_sha256: sha256(rf13Body),
    release_index_path: releaseIndexRelative,
    release_index_sha256: sha256(releaseIndexBody),
    artifact_id: provisionalArchive.id,
    indexed_artifact_sha256: provisionalArchive.sha256,
    privacy_receipt_path: privacyReceiptRelative,
    privacy_receipt_sha256: sha256(privacyReceiptBody),
    member_manifest_path: memberManifestRelative,
    member_manifest_sha256: privacyReceipt.member_manifest_sha256,
  };
  const privacyValidation = await validateDesktopArtifactPrivacyEvidence({
    receipt: privacyReceipt,
    artifact: provisionalArchive,
    artifactPath: archivePath,
    artifactRoot,
    buildManifest: manifest,
    corpus,
    repoRoot: root,
    displayBase: root,
    expectedRootName: "matter.app",
  });
  const validated = await validateFormalPackagedArtifactAuthoritatively({
    artifactManifest: manifest,
    artifactManifestPath: manifestPath,
    artifactPath,
    rendererPath,
    expectedSourceSha: source.sourceSha,
    sourceState: {
      source_sha: source.sourceSha,
      source_tree: source.sourceTree,
      source_dirty: false,
    },
    hostPlatform: "darwin",
    requireHostPlatform: true,
    authority,
    repoRoot: root,
    privacyValidation,
    privacyArtifact: provisionalArchive,
  });
  return Object.freeze({
    ...validated,
    sourceIdentity: source,
    rf13Path: path.join(root, rf13Relative),
    rf13Body,
  });
}

async function createAuthenticatedSessionFixture(root, label = "canonical") {
  const fixturePath = path.join(root, "session-fixtures", label);
  await mkdir(fixturePath, { recursive: true, mode: 0o700 });
  await chmod(fixturePath, 0o700);
  await write(path.join(fixturePath, "secure-session-store.json"), "{}\n", 0o600);
  return realpathSync(fixturePath);
}

function fakeRun(runIndex, { failed = false } = {}) {
  const start = Date.now() - 60_000 + runIndex * 1_000;
  const renderer = start + 100;
  const home = renderer + 900 + runIndex * 10;
  return {
    process_start_at: new Date(start).toISOString(),
    renderer_ready_at: new Date(renderer).toISOString(),
    home_ready_at: failed ? null : new Date(home).toISOString(),
    duration_ms: failed ? 1_000 : home - start,
    exit_code: failed ? 1 : 0,
    signal: null,
    error_count: failed ? 1 : 0,
    console_count: failed ? 1 : 0,
    console_error_count: failed ? 1 : 0,
    home_ready_observed: !failed,
    ...(failed ? { error: "fixture launch failed" } : {}),
  };
}

async function measure(artifact, { failedIndex = null } = {}) {
  return measureColdStartRuns({
    artifact,
    hostFingerprint: HOST,
    launchProcess: async ({ run_index: runIndex }) => fakeRun(runIndex, { failed: runIndex === failedIndex }),
  });
}

async function measureCanonically(artifact, authenticatedSessionFixturePath) {
  return measureColdStartRunsCanonically({
    artifact,
    authenticatedSessionFixturePath,
    timeoutMs: 10_000,
  });
}

function authorityOptions(measurement, repoRoot) {
  return {
    repoRoot,
    measurementValidation: measurement.measurement_validation,
    receiptBytes: Buffer.from(measurement.serialized_receipt, "utf8"),
  };
}

function producerInput(measurement, label) {
  const bytes = Buffer.from(measurement.serialized_receipt, "utf8");
  return {
    bytes,
    reference: Object.freeze({ path: `${label}.receipt.json`, sha256: sha256(bytes), bytes: bytes.length }),
  };
}

test("canonical authenticated-session snapshot rejects post-preflight file and root redirection", async (testContext) => {
  const root = await mkdtemp(path.join(tmpdir(), "cold-start-session-snapshot-race-"));
  testContext.after(() => rm(root, { recursive: true, force: true }));
  const repoRoot = path.join(root, "repository");
  const fixtureBase = path.join(root, "external-fixtures");
  await mkdir(repoRoot, { mode: 0o700 });

  const privateOutputFixture = await createAuthenticatedSessionFixture(fixtureBase, "private-output");
  const privateOutput = await __testOnlySnapshotAuthenticatedSessionFixture(privateOutputFixture, { repoRoot });
  assert.deepEqual(Object.keys(privateOutput).toSorted(), ["file_count", "total_bytes"]);
  assert.equal(JSON.stringify(privateOutput).includes(privateOutputFixture), false);

  const symlinkFixture = await createAuthenticatedSessionFixture(fixtureBase, "symlink-live");
  const secureStorePath = path.join(symlinkFixture, "secure-session-store.json");
  const replacementPath = path.join(root, "symlink-replacement.json");
  await write(replacementPath, '{"attacker":true}\n', 0o600);
  await assert.rejects(
    __testOnlySnapshotAuthenticatedSessionFixture(symlinkFixture, {
      repoRoot,
      __testHooks: {
        afterPreflight() {
          renameSync(secureStorePath, path.join(symlinkFixture, "secure-session-store.original.json"));
          symlinkSync(replacementPath, secureStorePath);
        },
      },
    }),
    /metadata drifted|changed while it was snapshotted/u,
  );

  const liveRoot = await createAuthenticatedSessionFixture(fixtureBase, "root-live");
  const candidateRoot = await createAuthenticatedSessionFixture(fixtureBase, "root-candidate");
  await assert.rejects(
    __testOnlySnapshotAuthenticatedSessionFixture(liveRoot, {
      repoRoot,
      __testHooks: {
        afterPreflight() {
          renameSync(liveRoot, path.join(root, "root-original"));
          renameSync(candidateRoot, liveRoot);
        },
      },
    }),
    /metadata drifted|changed while it was snapshotted/u,
  );

  const broadModeFixture = await createAuthenticatedSessionFixture(fixtureBase, "broad-mode");
  await chmod(path.join(broadModeFixture, "secure-session-store.json"), 0o644);
  await assert.rejects(
    __testOnlySnapshotAuthenticatedSessionFixture(broadModeFixture, { repoRoot }),
    /must not grant group or other permissions/u,
  );

  const hardlinkFixture = await createAuthenticatedSessionFixture(fixtureBase, "hardlink");
  linkSync(
    path.join(hardlinkFixture, "secure-session-store.json"),
    path.join(hardlinkFixture, "secure-session-store-copy.json"),
  );
  await assert.rejects(
    __testOnlySnapshotAuthenticatedSessionFixture(hardlinkFixture, { repoRoot }),
    /must not be hard linked/u,
  );

  const specialModeFixture = await createAuthenticatedSessionFixture(fixtureBase, "special-mode");
  await chmod(specialModeFixture, 0o1700);
  await assert.rejects(
    __testOnlySnapshotAuthenticatedSessionFixture(specialModeFixture, { repoRoot }),
    /must use exactly mode 0700/u,
  );

  const containedFixture = await createAuthenticatedSessionFixture(repoRoot, "contained");
  await assert.rejects(
    __testOnlySnapshotAuthenticatedSessionFixture(containedFixture, { repoRoot }),
    /outside and disjoint from the repository/u,
  );
});

test("historical cold-start authority accepts only capability-bound clean ancestor commits", async (testContext) => {
  const repository = await initializeRepository();
  testContext.after(() => rm(repository.root, { recursive: true, force: true }));
  const corpus = await createPrivacyCorpus(repository.root);
  const [baselineArtifact, candidateArtifact, headArtifact, unrelatedArtifact, failedArtifact] = await Promise.all([
    createSealedArtifact(repository.root, corpus, repository.baseline, "baseline"),
    createSealedArtifact(repository.root, corpus, repository.candidate, "candidate"),
    createSealedArtifact(repository.root, corpus, repository.head, "head"),
    createSealedArtifact(repository.root, corpus, repository.unrelated, "unrelated"),
    createSealedArtifact(repository.root, corpus, repository.candidate, "failed", { launchable: false, version: "1.2.4" }),
  ]);
  const externalSessionRoot = await mkdtemp(path.join(tmpdir(), "cold-start-historical-session-"));
  testContext.after(() => rm(externalSessionRoot, { recursive: true, force: true }));
  const authenticatedSessionFixturePath = await createAuthenticatedSessionFixture(externalSessionRoot);
  const baselineMeasurement = await measureCanonically(baselineArtifact, authenticatedSessionFixturePath);
  const candidateMeasurement = await measureCanonically(candidateArtifact, authenticatedSessionFixturePath);
  const headMeasurement = await measureCanonically(headArtifact, authenticatedSessionFixturePath);
  const baselineReceipt = baselineMeasurement.receipt;
  const candidateReceipt = candidateMeasurement.receipt;
  const headReceipt = headMeasurement.receipt;
  for (const measurement of [baselineMeasurement, candidateMeasurement, headMeasurement]) {
    assert.equal(measurement.serialized_receipt.includes(realpathSync(externalSessionRoot)), false);
    assert.doesNotMatch(measurement.serialized_receipt, /secure-session-store|fixture_snapshot|session-fixtures/u);
  }
  assert.equal(baselineReceipt.status, "PASS", JSON.stringify(baselineReceipt, null, 2));
  assert.equal(candidateReceipt.status, "PASS", JSON.stringify(candidateReceipt, null, 2));
  assert.equal(headReceipt.status, "PASS", JSON.stringify(headReceipt, null, 2));

  await testContext.test("current HEAD and two distinct sealed ancestors validate with their own canonical measurement capabilities", async () => {
    await validateColdStartReceiptAuthoritatively(headReceipt, authorityOptions(headMeasurement, repository.root));
    await validateColdStartReceiptAuthoritatively(baselineReceipt, authorityOptions(baselineMeasurement, repository.root));
    await validateColdStartReceiptAuthoritatively(candidateReceipt, authorityOptions(candidateMeasurement, repository.root));
    assert.notEqual(baselineReceipt.source.source_sha, candidateReceipt.source.source_sha);
    assert.notEqual(candidateReceipt.source.source_sha, headReceipt.source.source_sha);
  });

  await testContext.test("RFD038 and RFD040 producer integration consumes two historical capabilities in one process", async () => {
    const baselineInput = producerInput(baselineMeasurement, "rfd038-baseline");
    const candidateInput = producerInput(candidateMeasurement, "rfd040-candidate");
    const baseline = await validateColdStartProducerEvidence({
      ...baselineInput,
      repoRoot: repository.root,
      receiptSource: { sha: repository.baseline.sourceSha, tree: repository.baseline.sourceTree, dirty: false },
      coldStartAuthority: {
        measurementValidation: baselineMeasurement.measurement_validation,
        receiptBytes: baselineInput.bytes,
      },
      requirePass: true,
      unitId: "RFD-TUW-038",
    });
    const candidate = await validateColdStartProducerEvidence({
      ...candidateInput,
      repoRoot: repository.root,
      receiptSource: { sha: repository.candidate.sourceSha, tree: repository.candidate.sourceTree, dirty: false },
      coldStartAuthority: {
        measurementValidation: candidateMeasurement.measurement_validation,
        receiptBytes: candidateInput.bytes,
      },
      requirePass: false,
      unitId: "RFD-TUW-040",
    });
    assert.equal(baseline.source.sha, repository.baseline.sourceSha);
    assert.equal(candidate.source.sha, repository.candidate.sourceSha);
  });

  await testContext.test("caller-fabricated runs, plain objects, swapped capabilities, receipt mutation, and byte replay fail closed", async () => {
    const fabricated = await measure(baselineArtifact);
    assert.equal(fabricated.status, "PASS");
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(fabricated, {
        repoRoot: repository.root,
        measurementValidation: baselineArtifact.authority_validation,
      }),
      /opaque canonical measurement capability/u,
    );
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(baselineReceipt, {
        repoRoot: repository.root,
        measurementValidation: baselineMeasurement.measurement_validation,
      }),
      /exact canonical producer byte buffer/u,
    );
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(baselineReceipt, {
        repoRoot: repository.root,
        measurementValidation: candidateMeasurement.measurement_validation,
        receiptBytes: Buffer.from(baselineMeasurement.serialized_receipt, "utf8"),
      }),
      /canonical measurement capability does not match/u,
    );
    const wrongTree = structuredClone(baselineReceipt);
    wrongTree.source.source_tree = repository.candidate.sourceTree;
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(wrongTree, {
        ...authorityOptions(baselineMeasurement, repository.root),
        receiptBytes: Buffer.from(`${JSON.stringify(wrongTree, null, 2)}\n`, "utf8"),
      }),
      /canonical measurement capability does not match/u,
    );
    const missing = structuredClone(baselineReceipt);
    missing.source.source_sha = "f".repeat(40);
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(missing, {
        ...authorityOptions(baselineMeasurement, repository.root),
        receiptBytes: Buffer.from(`${JSON.stringify(missing, null, 2)}\n`, "utf8"),
      }),
      /canonical measurement capability does not match/u,
    );
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(baselineReceipt, {
        ...authorityOptions(baselineMeasurement, repository.root),
        receiptBytes: Buffer.from(JSON.stringify(baselineReceipt), "utf8"),
      }),
      /not the canonical producer serialization/u,
    );
  });

  await testContext.test("unrelated and then dangling capability-bound commits fail canonical Git proof", async () => {
    const unrelatedMeasurement = await measureCanonically(unrelatedArtifact, authenticatedSessionFixturePath);
    const unrelatedReceipt = unrelatedMeasurement.receipt;
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(unrelatedReceipt, authorityOptions(unrelatedMeasurement, repository.root)),
      /ancestry could not be proven by Git/u,
    );
    await git(repository.root, ["branch", "-D", "unrelated"]);
    await git(repository.root, ["reflog", "expire", "--expire=now", "--all"]);
    await git(repository.root, ["gc", "--prune=now"]);
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(unrelatedReceipt, authorityOptions(unrelatedMeasurement, repository.root)),
      /commit could not be proven by Git/u,
    );
  });

  await testContext.test("dirty worktrees and forged sealed manifests fail", async () => {
    const dirtyPath = path.join(repository.root, "untracked-dirty.txt");
    await write(dirtyPath, "dirty\n");
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(baselineReceipt, authorityOptions(baselineMeasurement, repository.root)),
      /source worktree is dirty/u,
    );
    await rm(dirtyPath, { force: true });

    const forged = JSON.parse(baselineArtifact.rf13Body);
    forged.status = "FAILED";
    await write(baselineArtifact.rf13Path, `${JSON.stringify(forged, null, 2)}\n`);
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(baselineReceipt, authorityOptions(baselineMeasurement, repository.root)),
      /RF13-DIST manifest changed while it was read/u,
    );
    await write(baselineArtifact.rf13Path, baselineArtifact.rf13Body);
  });

  await testContext.test("a real ref move during Git reads is detected without a validator test seam", async () => {
    const marker = path.join(repository.root, "race/moved");
    const hook = path.join(repository.root, "race/fsmonitor.sh");
    const hookBody = `#!/bin/sh\nif [ ! -e ${JSON.stringify(marker)} ]; then\n  : > ${JSON.stringify(marker)}\n  git -C ${JSON.stringify(repository.root)} update-ref refs/heads/main ${repository.candidate.sourceSha} ${repository.head.sourceSha}\nfi\nprintf 'race-token\\n'\n`;
    await write(hook, hookBody, 0o755);
    await git(repository.root, ["config", "core.fsmonitor", hook]);
    try {
      await assert.rejects(
        validateColdStartReceiptAuthoritatively(headReceipt, authorityOptions(headMeasurement, repository.root)),
        /Git HEAD or receipt source moved/u,
      );
    } finally {
      await git(repository.root, ["config", "--unset", "core.fsmonitor"]).catch(() => {});
      const currentMain = await git(repository.root, ["rev-parse", "refs/heads/main"]);
      if (currentMain !== repository.head.sourceSha) {
        await git(repository.root, ["update-ref", "refs/heads/main", repository.head.sourceSha, currentMain]);
      }
    }
    assert.equal((await sourceIdentity(repository.root)).sourceSha, repository.head.sourceSha);
    assert.equal(await git(repository.root, ["status", "--porcelain", "--untracked-files=all"]), "");
  });

  await testContext.test("FAILED_CLOSED and RECOVERY_REQUIRED require the exact live capability", async () => {
    const fabricatedFailed = await measure(candidateArtifact, { failedIndex: 3 });
    assert.equal(fabricatedFailed.status, "FAILED_CLOSED");
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(fabricatedFailed, { repoRoot: repository.root }),
      /opaque canonical measurement capability/u,
    );
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(fabricatedFailed, {
        repoRoot: repository.root,
        measurementValidation: failedArtifact.authority_validation,
      }),
      /opaque canonical measurement capability/u,
    );
    const failedMeasurement = await measureCanonically(failedArtifact, authenticatedSessionFixturePath);
    assert.equal(failedMeasurement.receipt.status, "FAILED_CLOSED");
    await validateColdStartReceiptAuthoritatively(
      failedMeasurement.receipt,
      authorityOptions(failedMeasurement, repository.root),
    );

    const unboundFailed = structuredClone(failedMeasurement.receipt);
    unboundFailed.artifact = null;
    unboundFailed.renderer = null;
    unboundFailed.source = null;
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(unboundFailed, {
        ...authorityOptions(failedMeasurement, repository.root),
        receiptBytes: Buffer.from(`${JSON.stringify(unboundFailed, null, 2)}\n`, "utf8"),
      }),
      /canonical measurement capability does not match/u,
    );

    const recoveryRuns = structuredClone(candidateReceipt.runs);
    recoveryRuns[0].cleanup_succeeded = false;
    recoveryRuns[0].post_cleanup_exists = true;
    const recovery = summarizeColdStartRuns(recoveryRuns, {
      artifact: candidateReceipt.artifact,
      renderer: candidateReceipt.renderer,
      source: candidateReceipt.source,
      hostFingerprint: candidateReceipt.host_fingerprint,
    });
    assert.equal(recovery.status, "RECOVERY_REQUIRED");
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(recovery, { repoRoot: repository.root }),
      /opaque canonical measurement capability/u,
    );
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(recovery, {
        ...authorityOptions(candidateMeasurement, repository.root),
        receiptBytes: Buffer.from(`${JSON.stringify(recovery, null, 2)}\n`, "utf8"),
      }),
      /canonical measurement capability does not match/u,
    );
  });

  await testContext.test("honest blocked receipts remain structurally valid without authority", async () => {
    const blocked = blockedByArtifactReceipt({
      blockers: ["formal artifact is unavailable"],
      artifactManifestPath: "/tmp/missing-manifest.json",
      artifactPath: "/tmp/missing-matter.app",
      expectedSourceSha: repository.head.sourceSha,
    });
    validateColdStartReceipt(blocked);
    const validated = await validateColdStartReceiptAuthoritatively(blocked, { repoRoot: repository.root });
    assert.equal(validated.receipt, blocked);
    assert.equal(validated.sealed_archive, null);
  });
});
