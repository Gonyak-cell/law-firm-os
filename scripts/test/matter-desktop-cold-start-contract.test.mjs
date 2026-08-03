import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import {
  COLD_START_SCHEMA,
  DESKTOP_MEMBER_DIGEST_ALGORITHM,
  PERCENTILE_METHOD,
  REQUIRED_RUN_COUNT,
  assertColdStartAuthorityValidation,
  blockedByArtifactReceipt,
  blockedByExecutionGuardReceipt,
  measureBundle,
  measureColdStartRuns,
  validateFormalPackagedArtifactAuthoritatively,
  validateColdStartReceiptAuthoritatively,
  percentile,
  sanitizedHostFingerprint,
  summarizeColdStartRuns,
  validateColdStartReceipt,
  validateFormalPackagedArtifact,
} from "../lib/matter-desktop-cold-start-contract.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  createRf13DistPrivacyMemberReceipt,
  inspectExpandedDesktopArtifact,
  inspectZipDesktopArtifact,
  serializeDesktopArtifactMemberManifest,
  validateDesktopArtifactPrivacyEvidence,
} from "../lib/matter-desktop-artifact-privacy.mjs";
import {
  createDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";
import {
  countHistoricalPageFailures,
  createLaunchWrapper,
  isBenignPlaywrightHandshakeLine,
  parseLaunchTelemetry,
} from "../run-matter-desktop-cold-start-probe.mjs";
import { buildReleaseFixture } from "./helpers/rf13-dist-fixture.mjs";

const execFileAsync = promisify(execFile);
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function cleanGitSource(root) {
  await write(path.join(root, ".gitignore"), "matter.app/\nformal-build-manifest.json\nfinal-rf13.json\nuser-data-runs/\napps/desktop/dist/\nprivacy-sources/\n");
  await write(path.join(root, "source.txt"), "cold-start source\n");
  await execFileAsync("git", ["init", "-q"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "cold-start@example.invalid"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Cold Start Fixture"], { cwd: root });
  await execFileAsync("git", ["add", ".gitignore", "source.txt"], { cwd: root });
  await execFileAsync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });
  const sourceSha = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const sourceTree = (await execFileAsync("git", ["rev-parse", "HEAD^{tree}"], { cwd: root })).stdout.trim();
  return { sourceSha, sourceTree };
}

async function createFormalArtifactAt(root, { sourceSha, sourceTree }) {
  const artifactPath = path.join(root, "matter.app");
  const rendererPath = path.join(artifactPath, "Contents/Resources/app/src/renderer/web");
  const executablePath = path.join(artifactPath, "Contents/MacOS/matter");
  await write(path.join(rendererPath, "index.html"), "<!doctype html><div data-home-dashboard-shell=\"true\"></div>\n");
  await write(path.join(rendererPath, "assets/index.js"), "console.log('cold-start fixture');\n");
  await write(executablePath, "#!/bin/sh\nexit 0\n", 0o755);
  const rendererMeasured = measureBundle(rendererPath, { includeTypes: false });
  const manifest = createDesktopBuildManifest({
    version: "1.2.3",
    sourceSha,
    sourceTree,
    sourceDirty: false,
    renderer: {
      sha256: rendererMeasured.sha256,
      file_count: rendererMeasured.file_count,
      algorithm: rendererMeasured.algorithm,
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
    builtAt: "2026-07-31T00:00:00.000Z",
  });
  const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestPath = path.join(root, "formal-build-manifest.json");
  await write(path.join(artifactPath, "Contents/Resources/matter-build-manifest.json"), manifestBody);
  await write(manifestPath, manifestBody);
  return { artifactPath, rendererPath, manifestPath, manifest, manifestBody };
}

async function createPrivacyCorpus(root) {
  const sources = {
    roster: path.join(root, "privacy-sources/roster.json"),
    contact: path.join(root, "privacy-sources/contact.json"),
    registrationSeed: path.join(root, "privacy-sources/registration.json"),
    photos: path.join(root, "privacy-sources/photos"),
  };
  await write(sources.roster, `${JSON.stringify({
    tenant_id: "cold-start-private-tenant-7782",
    members: [{ display_name: "Cold Start Private Person 7782", employee_id: "cold-start-private-employee-7782", work_email: "cold-start-private-7782@example.invalid" }],
  })}\n`);
  await write(sources.contact, `${JSON.stringify({
    contacts: [{ work_email: "cold-start-private-7782@example.invalid", mobile_phone: "+82-10-7782-4400" }],
  })}\n`);
  await write(sources.registrationSeed, `${JSON.stringify({
    users: [{ user_id: "cold-start-private-user-7782", clientSecret: "cold-start-private-secret-7782" }],
  })}\n`);
  await write(path.join(sources.photos, "private.png"), Buffer.from([0, 1, 7, 7, 8, 2, 4, 9]));
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
  await execFileAsync("/usr/bin/zip", ["-qry", archivePath, path.basename(sourceRoot)], {
    cwd: path.dirname(sourceRoot),
  });
}

function authorityFromRf13Fixture(root, manifest) {
  const relative = (target) => path.relative(root, target).split(path.sep).join("/");
  const rf13Path = path.join(root, "final-rf13.json");
  const rf13Body = `${JSON.stringify(manifest, null, 2)}\n`;
  const releaseIndexPath = path.join(root, manifest.release.release_index.path);
  const archiveArtifact = manifest.artifacts.find(({ id }) => id === "macos_zip_archive");
  const privacyMember = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === archiveArtifact.id);
  const privacyReceiptPath = path.join(root, privacyMember.receipt.path);
  const privacyReceipt = JSON.parse(readFileSync(privacyReceiptPath, "utf8"));
  return {
    rf13Path,
    rf13Body,
    authority: {
      rf13_dist_manifest_path: relative(rf13Path),
      rf13_dist_manifest_sha256: sha256(rf13Body),
      release_index_path: manifest.release.release_index.path,
      release_index_sha256: sha256(readFileSync(releaseIndexPath)),
      artifact_id: archiveArtifact.id,
      indexed_artifact_sha256: archiveArtifact.sha256,
      privacy_receipt_path: privacyMember.receipt.path,
      privacy_receipt_sha256: privacyMember.receipt.sha256,
      member_manifest_path: privacyReceipt.member_manifest_path,
      member_manifest_sha256: privacyReceipt.member_manifest_sha256,
    },
  };
}

async function write(target, body, mode = null) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  if (mode) await chmod(target, mode);
}

async function createFormalFixture() {
  const root = realpathSync(await mkdtemp(path.join(tmpdir(), "matter-cold-start-contract-")));
  const artifactPath = path.join(root, "matter.app");
  const rendererPath = path.join(artifactPath, "Contents/Resources/app/src/renderer/web");
  const executablePath = path.join(artifactPath, "Contents/MacOS/matter");
  await write(path.join(rendererPath, "index.html"), "<!doctype html><div data-home-dashboard-shell=\"true\"></div>\n");
  await write(path.join(rendererPath, "assets/index.js"), "console.log('cold-start fixture');\n");
  await write(executablePath, "#!/bin/sh\nexit 0\n", 0o755);
  const rendererMeasured = measureBundle(rendererPath, { includeTypes: false });
  const manifest = createDesktopBuildManifest({
    version: "0.1.18",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: {
      sha256: rendererMeasured.sha256,
      file_count: rendererMeasured.file_count,
      algorithm: rendererMeasured.algorithm,
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
    builtAt: "2026-07-31T00:00:00.000Z",
  });
  const manifestPath = path.join(root, "formal-build-manifest.json");
  const body = `${JSON.stringify(manifest, null, 2)}\n`;
  await write(path.join(artifactPath, "Contents/Resources/matter-build-manifest.json"), body);
  await write(manifestPath, body);
  return {
    root,
    artifactPath,
    rendererPath,
    manifestPath,
    manifest,
  };
}

function fakeRun(runIndex, userDataPath, hostFingerprint, { failed = false, homeReady = true } = {}) {
  const start = Date.parse("2026-07-31T00:00:00.000Z") + runIndex * 1000;
  const renderer = start + 100 + runIndex;
  const home = renderer + 900 + runIndex * 10;
  return {
    run_index: runIndex,
    run_id: `fixture-run-${String(runIndex).padStart(2, "0")}-opaque`,
    user_data_path_digest: sha256(path.resolve(userDataPath)),
    isolated_user_data_created: true,
    cleanup_attempted: true,
    cleanup_succeeded: true,
    post_cleanup_exists: false,
    process_start_at: new Date(start).toISOString(),
    renderer_ready_at: new Date(renderer).toISOString(),
    home_ready_at: new Date(home).toISOString(),
    duration_ms: home - start,
    exit_code: failed ? 1 : 0,
    signal: null,
    error_count: failed ? 1 : 0,
    console_count: failed ? 1 : 0,
    console_error_count: failed ? 1 : 0,
    home_ready_observed: homeReady,
    host_fingerprint: hostFingerprint,
  };
}

test("RFD-TUW-038 validates only a formal, clean, exact-source packaged artifact", async () => {
  const fixture = await createFormalFixture();
  try {
    const artifact = validateFormalPackagedArtifact({
      artifactManifest: fixture.manifest,
      artifactManifestPath: fixture.manifestPath,
      artifactPath: fixture.artifactPath,
      rendererPath: fixture.rendererPath,
      expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
      hostPlatform: "darwin",
      requireHostPlatform: true,
    });
    assert.equal(artifact.verdict, "PASS");
    assert.equal(artifact.manifest.channel, "formal");
    assert.equal(artifact.source.source_dirty, false);
    assert.equal(artifact.renderer.file_count, 2);
    assert.equal(artifact.artifact.algorithm, DESKTOP_MEMBER_DIGEST_ALGORITHM);
    assert.match(artifact.renderer.algorithm, /^sha256\(sorted sha256 file manifest/u);
    assert.ok(artifact.artifact.bytes > artifact.renderer.bytes);
    assert.throws(() => validateFormalPackagedArtifact({
      artifactManifest: fixture.manifest,
      artifactManifestPath: fixture.manifestPath,
      artifactPath: fixture.artifactPath,
      rendererPath: fixture.rendererPath,
      expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: true },
      hostPlatform: "darwin",
      requireHostPlatform: true,
    }), /dirty/u);
    assert.throws(() => validateFormalPackagedArtifact({
      artifactManifest: fixture.manifest,
      artifactManifestPath: fixture.manifestPath,
      artifactPath: fixture.artifactPath,
      rendererPath: fixture.rendererPath,
      expectedSourceSha: "c".repeat(40),
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
      hostPlatform: "darwin",
      requireHostPlatform: true,
    }), /source SHA/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 rejects internal/QA_ONLY artifacts and never treats them as a baseline", async () => {
  const fixture = await createFormalFixture();
  try {
    const internal = createDesktopBuildManifest({
      version: fixture.manifest.version,
      sourceSha: fixture.manifest.source_sha,
      sourceTree: fixture.manifest.source_tree,
      sourceDirty: fixture.manifest.source_dirty,
      renderer: fixture.manifest.renderer,
      platform: fixture.manifest.platform,
      arch: fixture.manifest.arch,
      channel: "internal",
      appId: "com.amic.matter.desktop.internal",
      requestedRuntimeMode: "synthetic",
      effectiveRuntimeMode: "synthetic",
      runtimeIncluded: true,
      runtimeDataClass: "synthetic_only",
      nonDistributable: true,
      distributable: false,
    });
    assert.throws(() => validateFormalPackagedArtifact({
      artifactManifest: internal,
      artifactPath: fixture.artifactPath,
      rendererPath: fixture.rendererPath,
      expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
    }), /formal release channel/u);
    const blocked = blockedByArtifactReceipt({
      blockers: ["historical RF13 internal package rejected: channel=internal"],
      artifactManifestPath: "/tmp/internal-manifest.json",
      artifactPath: "/tmp/matter-internal.app",
      expectedSourceSha: SOURCE_SHA,
    });
    validateColdStartReceipt(blocked);
    assert.equal(blocked.status, "BLOCKED_BY_ARTIFACT");
    assert.equal(blocked.claims.historical_rf13_internal_artifact_used, false);
    assert.equal(blocked.claims.formal_artifact_baseline, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 runs exactly five isolated injected fake processes and records median/p95", async () => {
  const fixture = await createFormalFixture();
  const host = sanitizedHostFingerprint({ platformName: "darwin", architecture: "arm64", osRelease: "23.5.0", cpuCount: 10, memoryBytes: 16 * 1024 ** 3 });
  const artifact = validateFormalPackagedArtifact({
    artifactManifest: fixture.manifest,
    artifactManifestPath: fixture.manifestPath,
    artifactPath: fixture.artifactPath,
    rendererPath: fixture.rendererPath,
    expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
    hostPlatform: "darwin",
  });
  let launches = 0;
  try {
    const receipt = await measureColdStartRuns({
      artifact,
      hostFingerprint: host,
      userDataFactory: async ({ runIndex }) => mkdtemp(path.join(fixture.root, `user-data-${runIndex}-`)),
      launchProcess: async ({ run_index: runIndex, user_data_path: userDataPath, host_fingerprint: hostFingerprint }) => {
        launches += 1;
        return fakeRun(runIndex, userDataPath, hostFingerprint);
      },
    });
    assert.equal(launches, REQUIRED_RUN_COUNT);
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.run_count, 5);
    assert.equal(receipt.percentile_method, PERCENTILE_METHOD);
    assert.equal(receipt.median_ms, percentile(receipt.runs.map((run) => run.duration_ms), 0.5));
    assert.equal(receipt.p95_ms, percentile(receipt.runs.map((run) => run.duration_ms), 0.95));
    assert.equal(new Set(receipt.runs.map((run) => run.run_id)).size, 5);
    assert.equal(receipt.user_data_root, null);
    assert.equal(receipt.runs.every((run) => !Object.hasOwn(run, "user_data_path")), true);
    assert.equal(receipt.runs.every((run) => run.isolated_user_data_created && run.cleanup_attempted && run.cleanup_succeeded && !run.post_cleanup_exists), true);
    assert.throws(() => validateColdStartReceipt(receipt), /opaque canonical measurement capability/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 emits RECOVERY_REQUIRED without retaining private userData paths when cleanup fails", () => {
  const host = sanitizedHostFingerprint({ platformName: "darwin", architecture: "arm64", osRelease: "23.5.0", cpuCount: 10, memoryBytes: 16 * 1024 ** 3 });
  const failedCleanup = fakeRun(1, "/private/tmp/opaque-user-data", host);
  failedCleanup.cleanup_succeeded = false;
  failedCleanup.post_cleanup_exists = true;
  const receipt = summarizeColdStartRuns([failedCleanup], {
    artifact: null,
    renderer: null,
    source: null,
    hostFingerprint: host,
  });
  assert.equal(receipt.status, "RECOVERY_REQUIRED");
  assert.equal(receipt.user_data_root, null);
  assert.equal(Object.hasOwn(receipt.runs[0], "user_data_path"), false);
  validateColdStartReceipt(receipt);
  const rootRecovery = summarizeColdStartRuns([fakeRun(1, "/private/tmp/opaque-user-data-root", host)], {
    artifact: null,
    renderer: null,
    source: null,
    hostFingerprint: host,
    status: "RECOVERY_REQUIRED",
    blockers: ["authenticated isolated userData root cleanup failed; manual recovery is required"],
  });
  assert.equal(rootRecovery.status, "RECOVERY_REQUIRED");
  validateColdStartReceipt(rootRecovery);
});

test("RFD-TUW-038 fails closed for reused userData, missing Home-ready, and run errors", async () => {
  const fixture = await createFormalFixture();
  const host = sanitizedHostFingerprint({ platformName: "darwin", architecture: "arm64", osRelease: "23.5.0", cpuCount: 10, memoryBytes: 16 * 1024 ** 3 });
  const artifact = validateFormalPackagedArtifact({
    artifactManifest: fixture.manifest,
    artifactManifestPath: fixture.manifestPath,
    artifactPath: fixture.artifactPath,
    rendererPath: fixture.rendererPath,
    expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
    hostPlatform: "darwin",
  });
  try {
    const reusedPath = await mkdtemp(path.join(fixture.root, "reused-user-data-"));
    await assert.rejects(() => measureColdStartRuns({
      artifact,
      hostFingerprint: host,
      userDataFactory: async () => reusedPath,
      launchProcess: async ({ run_index: runIndex, user_data_path: userDataPath, host_fingerprint: hostFingerprint }) => fakeRun(runIndex, userDataPath, hostFingerprint),
    }), /reused/u);
    const missingHomeReceipt = await measureColdStartRuns({
      artifact,
      hostFingerprint: host,
      userDataFactory: async ({ runIndex }) => mkdtemp(path.join(fixture.root, `missing-home-${runIndex}-`)),
      launchProcess: async ({ run_index: runIndex, user_data_path: userDataPath, host_fingerprint: hostFingerprint }) => fakeRun(runIndex, userDataPath, hostFingerprint, { homeReady: false }),
    });
    assert.equal(missingHomeReceipt.status, "FAILED_CLOSED");
    assert.equal(missingHomeReceipt.runs.every((run) => run.home_ready_observed === false), true);
    const rawErrorReceipt = await measureColdStartRuns({
      artifact,
      hostFingerprint: host,
      userDataFactory: async ({ runIndex }) => mkdtemp(path.join(fixture.root, `raw-error-${runIndex}-`)),
      launchProcess: async ({ run_index: runIndex, user_data_path: userDataPath, host_fingerprint: hostFingerprint }) => ({
        ...fakeRun(runIndex, userDataPath, hostFingerprint, { failed: true }),
        error: `private launch failure at ${userDataPath}`,
      }),
    });
    assert.equal(rawErrorReceipt.status, "FAILED_CLOSED");
    assert.doesNotMatch(JSON.stringify(rawErrorReceipt), /private launch failure at \/private|raw-error-/u);
    const failedRuns = [];
    for (let runIndex = 1; runIndex <= 5; runIndex += 1) {
      const userDataPath = await mkdtemp(path.join(fixture.root, `failed-${runIndex}-`));
      failedRuns.push(fakeRun(runIndex, userDataPath, host, { failed: runIndex === 3 }));
    }
    const failedReceipt = summarizeColdStartRuns(failedRuns, {
      artifact: artifact.artifact,
      renderer: artifact.renderer,
      source: artifact.source,
      hostFingerprint: host,
    });
    assert.equal(failedReceipt.status, "FAILED_CLOSED");
    validateColdStartReceipt(failedReceipt);
    assert.throws(() => validateColdStartReceipt({ ...failedReceipt, status: "PASS" }), /(?:formal artifact claim|unsuccessful run)/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 host fingerprint is sanitized and percentile method is deterministic", () => {
  const host = sanitizedHostFingerprint({
    platformName: "darwin",
    architecture: "arm64",
    osRelease: "23.5.0-private-hostname",
    cpuCount: 10,
    memoryBytes: 12 * 1024 ** 3,
  });
  assert.equal(host.sanitized, true);
  assert.match(host.fingerprint_sha256, /^[0-9a-f]{64}$/u);
  assert.equal(host.os_release_major, "23");
  assert.equal(host.memory_gib_bucket, "8to16");
  assert.doesNotMatch(JSON.stringify(host), /private-hostname|hostname|home|username|password/iu);
  assert.equal(percentile([100, 200, 300, 400, 500], 0.5), 300);
  assert.equal(percentile([100, 200, 300, 400, 500], 0.95), 480);
});

test("RFD-TUW-038 launch telemetry permits only exact local Playwright handshakes", () => {
  const debuggerLine = "Debugger listening on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643";
  const devtoolsLine = "DevTools listening on ws://127.0.0.1:12346/devtools/browser/9184b27b-4f44-4d64-bc5a-37c88d503643";
  const debuggerEndLine = "Debugger ending on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643";
  assert.equal(isBenignPlaywrightHandshakeLine(debuggerLine), true);
  assert.equal(isBenignPlaywrightHandshakeLine(devtoolsLine), true);
  assert.equal(isBenignPlaywrightHandshakeLine("Debugger attached."), false);
  assert.equal(isBenignPlaywrightHandshakeLine("Waiting for the debugger to disconnect..."), false);
  assert.equal(isBenignPlaywrightHandshakeLine("For help, see: https://nodejs.org/learn/getting-started/debugging"), false);
  assert.equal(isBenignPlaywrightHandshakeLine(debuggerEndLine), false);
  assert.equal(parseLaunchTelemetry([
    JSON.stringify({ kind: "child_spawn", at: "2026-07-31T00:00:00.000Z" }),
    JSON.stringify({
      kind: "child_stderr",
      bytes: debuggerLine.length + devtoolsLine.length,
      line_count: 2,
      benign_line_count: 2,
      protocol: "playwright_handshake",
      error: false,
    }),
    JSON.stringify({ kind: "child_exit", code: 0, signal: null }),
  ].join("\n")).error_count, 0);
});

test("RFD-TUW-038 launch telemetry rejects malformed, mixed, remote, and lookalike handshake lines", () => {
  const validDebugger = "Debugger listening on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643";
  const redLines = [
    "Debugger listening on ws://127.0.0.1:12345/not-a-uuid",
    "DevTools listening on ws://192.0.2.10:12346/devtools/browser/9184b27b-4f44-4d64-bc5a-37c88d503643",
    "Debugger listening on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643?remote=true",
    "Debugger listening on ws://127.0.0.1:012345/9184b27b-4f44-4d64-bc5a-37c88d503643",
    "Debugger ending on ws://192.0.2.10:12345/9184b27b-4f44-4d64-bc5a-37c88d503643",
    "DevTools ending on ws://127.0.0.1:12346/devtools/browser/9184b27b-4f44-4d64-bc5a-37c88d503643",
    `prefix ${validDebugger}`,
    `${validDebugger}\nstartup failed before handoff`,
  ];
  for (const line of redLines) {
    assert.equal(isBenignPlaywrightHandshakeLine(line), false, line);
    assert.equal(parseLaunchTelemetry(line).error_count, 1, line);
  }
});

test("RFD-TUW-038 launch telemetry recovers a pre-handoff child error", () => {
  const telemetry = parseLaunchTelemetry([
    JSON.stringify({ kind: "child_spawn", at: "2026-07-31T00:00:00.000Z" }),
    JSON.stringify({ kind: "child_stderr", bytes: 19, line_count: 1, benign_line_count: 0, protocol: null, error: true }),
    JSON.stringify({ kind: "child_exit", code: 0, signal: null }),
  ].join("\n"));
  assert.equal(telemetry.line_count, 3);
  assert.equal(telemetry.child_spawn_at, "2026-07-31T00:00:00.000Z");
  assert.equal(telemetry.child_exit_observed, true);
  assert.equal(telemetry.error_count, 1);
  assert.equal(countHistoricalPageFailures([
    { failure: () => ({ errorText: "request failed before listener" }) },
    { failure: () => null },
  ]), 1);
});

test("RFD-TUW-038 executable launch adapter forwards early stderr and records only sanitized metadata", { skip: process.platform === "win32" }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "matter-cold-start-wrapper-"));
  try {
    const childPath = path.join(root, "child.sh");
    const startupLogPath = path.join(root, "launch.log");
    await write(childPath, "#!/bin/sh\nprintf 'stdout marker\\n'\nprintf 'Debugger listening on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643\\nstartup failed before handoff\\n' >&2\nexit 0\n", 0o755);
    const wrapper = await createLaunchWrapper({ realExecutablePath: childPath, startupLogPath });
    const environment = {
      ...process.env,
      MATTER_COLD_START_REAL_EXECUTABLE: childPath,
      MATTER_COLD_START_WRAPPER_LOG: startupLogPath,
      MATTER_COLD_START_WRAPPER_SCRIPT: wrapper.wrapperScriptPath,
      MATTER_COLD_START_NODE: process.execPath,
    };
    const result = await new Promise((resolve, reject) => {
      const child = spawn(wrapper.executablePath, ["--fixture"], { env: environment });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
    });
    assert.equal(result.code, 0);
    assert.match(result.stdout, /stdout marker/u);
    assert.match(result.stderr, /Debugger listening on ws:\/\/127\.0\.0\.1:12345/u);
    assert.match(result.stderr, /startup failed before handoff/u);
    const telemetry = parseLaunchTelemetry(readFileSync(startupLogPath, "utf8"));
    assert.equal(telemetry.child_spawn_at !== null, true);
    assert.equal(telemetry.child_exit_observed, true);
    assert.equal(telemetry.error_count, 1);
    assert.doesNotMatch(readFileSync(startupLogPath, "utf8"), /ERROR early/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 executable launch adapter accepts the exact healthy stderr handshake transcript", { skip: process.platform === "win32" }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "matter-cold-start-wrapper-healthy-"));
  try {
    const childPath = path.join(root, "child.sh");
    const startupLogPath = path.join(root, "launch.log");
    await write(childPath, "#!/bin/sh\nprintf 'Debugger listening on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643\\nFor help, see: https://nodejs.org/learn/getting-started/debugging\\nDebugger attached.\\n\\nDevTools listening on ws://127.0.0.1:12346/devtools/browser/9184b27b-4f44-4d64-bc5a-37c88d503643\\nWaiting for the debugger to disconnect...\\nDebugger ending on ws://127.0.0.1:12345/9184b27b-4f44-4d64-bc5a-37c88d503643\\nFor help, see: https://nodejs.org/learn/getting-started/debugging\\n' >&2\nexit 0\n", 0o755);
    const wrapper = await createLaunchWrapper({ realExecutablePath: childPath, startupLogPath });
    const environment = {
      ...process.env,
      MATTER_COLD_START_REAL_EXECUTABLE: childPath,
      MATTER_COLD_START_WRAPPER_LOG: startupLogPath,
      MATTER_COLD_START_WRAPPER_SCRIPT: wrapper.wrapperScriptPath,
      MATTER_COLD_START_NODE: process.execPath,
    };
    const result = await new Promise((resolve, reject) => {
      const child = spawn(wrapper.executablePath, ["--fixture"], { env: environment });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("exit", (code, signal) => resolve({ code, signal, stderr }));
    });
    assert.equal(result.code, 0);
    assert.match(result.stderr, /Debugger listening on ws:\/\/127\.0\.0\.1:12345/u);
    assert.match(result.stderr, /DevTools listening on ws:\/\/127\.0\.0\.1:12346\/devtools\/browser/u);
    const telemetry = parseLaunchTelemetry(readFileSync(startupLogPath, "utf8"));
    assert.equal(telemetry.child_spawn_at !== null, true);
    assert.equal(telemetry.child_exit_observed, true);
    assert.equal(telemetry.error_count, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 execution guard is closed unless --execute is explicit", () => {
  const receipt = blockedByExecutionGuardReceipt();
  validateColdStartReceipt(receipt);
  assert.equal(receipt.status, "BLOCKED_BY_EXECUTION_GUARD");
  assert.equal(receipt.run_count, 0);
  assert.equal(receipt.claims.formal_artifact_baseline, false);
});

test("RFD-TUW-038 CLI default path emits artifact block without launching", async () => {
  let output;
  await assert.rejects(
    execFileAsync(process.execPath, ["scripts/run-matter-desktop-cold-start-probe.mjs"], {
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: { ...process.env, MATTER_DESKTOP_EXPECTED_SOURCE_SHA: SOURCE_SHA },
    }),
    (error) => {
      output = error;
      return error.code === 2;
    },
  );
  const receipt = JSON.parse(output.stdout);
  assert.equal(receipt.schema_version, COLD_START_SCHEMA);
  assert.equal(receipt.status, "BLOCKED_BY_ARTIFACT");
  assert.equal(receipt.run_count, 0);
});

test("RFD-TUW-038 receipt acceptance rejects fabricated PASS claims and recomputation gaps", async () => {
  const fixture = await createFormalFixture();
  const host = sanitizedHostFingerprint({ platformName: "darwin", architecture: "arm64", osRelease: "23.5.0", cpuCount: 10, memoryBytes: 16 * 1024 ** 3 });
  const artifact = validateFormalPackagedArtifact({
    artifactManifest: fixture.manifest,
    artifactManifestPath: fixture.manifestPath,
    artifactPath: fixture.artifactPath,
    rendererPath: fixture.rendererPath,
    expectedSourceSha: SOURCE_SHA,
    sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
    hostPlatform: "darwin",
  });
  try {
    const runs = Array.from({ length: REQUIRED_RUN_COUNT }, (_, index) => fakeRun(index + 1, path.join(fixture.root, `reused-user-data-${index + 1}`), host));
    const baseReceipt = summarizeColdStartRuns(runs, {
      artifact: artifact.artifact,
      renderer: artifact.renderer,
      source: artifact.source,
      hostFingerprint: host,
      userDataRoot: fixture.root,
    });
    const fabricated = {
      ...baseReceipt,
      status: "PASS",
      generated_at: "2000-01-01T00:00:00.000Z",
      median_ms: -999,
      p95_ms: -999,
      artifact: null,
      renderer: null,
      source: null,
      claims: {
        formal_artifact_baseline: true,
        historical_rf13_internal_artifact_used: false,
        production_go_live: false,
        public_release: false,
      },
    };
    assert.throws(() => validateColdStartReceipt(fabricated), /(?:stale|artifact|run indices|user_data)/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 accepts a complete RF13 archive/member authority control and rejects each binding mutation", async (t) => {
  const root = realpathSync(await mkdtemp(path.join(tmpdir(), "matter-cold-start-authority-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = await cleanGitSource(root);
  const formal = await createFormalArtifactAt(root, source);
  const releaseFixture = buildReleaseFixture({ after: (callback) => t.after(callback) }, {
    sourceSha: source.sourceSha,
    sourceTree: source.sourceTree,
    artifactBodies: { macos_build_manifest: Buffer.from(formal.manifestBody) },
  });
  await cp(path.join(releaseFixture.root, "apps/desktop/dist"), path.join(root, "apps/desktop/dist"), { recursive: true });
  const privacyCorpus = await createPrivacyCorpus(root);
  const archiveArtifact = releaseFixture.manifest.artifacts.find(({ id }) => id === "macos_zip_archive");
  const archivePath = path.join(root, archiveArtifact.path);
  await rm(archivePath, { force: true });
  await createZipArchive(formal.artifactPath, archivePath);
  const expandedInspection = await inspectExpandedDesktopArtifact({
    rootPath: formal.artifactPath,
    buildManifest: formal.manifest,
    corpus: privacyCorpus,
    displayBase: root,
  });
  const archiveDescriptor = {
    ...archiveArtifact,
    bytes: (await stat(archivePath)).size,
  };
  archiveDescriptor.sha256 = sha256(readFileSync(archivePath));
  const zipInspection = await inspectZipDesktopArtifact({
    artifactPath: archivePath,
    artifactKind: archiveDescriptor.kind,
    expectedRootName: "matter.app",
    expectedExpandedInspection: expandedInspection,
    buildManifest: formal.manifest,
    corpus: privacyCorpus,
    displayBase: root,
  });
  const memberManifestPath = path.join(root, `${releaseFixture.manifest.release.artifact_root}/evidence/members-macos_zip_archive.json`);
  await write(memberManifestPath, serializeDesktopArtifactMemberManifest(expandedInspection.member_manifest));
  const privacyMember = releaseFixture.manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === archiveDescriptor.id);
  const privacyReceiptPath = path.join(root, privacyMember.receipt.path);
  const privacyReceipt = createRf13DistPrivacyMemberReceipt({
    receiptId: `RFD018-PRIVACY-${archiveDescriptor.id}`,
    artifact: archiveDescriptor,
    buildManifest: formal.manifest,
    inspection: zipInspection,
    memberManifestPath: releaseFixture.manifest.release.artifact_root + "/evidence/members-macos_zip_archive.json",
  });
  await write(privacyReceiptPath, `${JSON.stringify(privacyReceipt, null, 2)}\n`);
  archiveArtifact.bytes = archiveDescriptor.bytes;
  archiveArtifact.sha256 = archiveDescriptor.sha256;
  const indexPath = path.join(root, releaseFixture.manifest.release.release_index.path);
  const releaseIndex = JSON.parse(readFileSync(indexPath, "utf8"));
  const indexedArchive = releaseIndex.artifacts.find(({ id }) => id === archiveDescriptor.id);
  indexedArchive.bytes = archiveDescriptor.bytes;
  indexedArchive.sha256 = archiveDescriptor.sha256;
  await write(indexPath, `${JSON.stringify(releaseIndex, null, 2)}\n`);
  await write(
    path.join(root, releaseFixture.manifest.release.artifact_root, "checksums.sha256"),
    `${releaseIndex.artifacts.map(({ sha256: digest, path: memberPath }) => `${digest}  ${memberPath}`).join("\n")}\n`,
  );
  privacyMember.receipt = {
    ...privacyMember.receipt,
    sha256: sha256(readFileSync(privacyReceiptPath)),
  };
  releaseFixture.manifest.release.release_index = {
    ...releaseFixture.manifest.release.release_index,
    sha256: sha256(readFileSync(indexPath)),
  };
  const rf13 = authorityFromRf13Fixture(root, releaseFixture.manifest);
  rf13.rf13Body = `${JSON.stringify(releaseFixture.manifest, null, 2)}\n`;
  await write(rf13.rf13Path, rf13.rf13Body);
  const privacyValidation = await validateDesktopArtifactPrivacyEvidence({
    receipt: privacyReceipt,
    artifact: archiveDescriptor,
    artifactPath: archivePath,
    artifactRoot: releaseFixture.manifest.release.artifact_root,
    expectedRootName: "matter.app",
    buildManifest: formal.manifest,
    corpus: privacyCorpus,
    repoRoot: root,
    displayBase: root,
  });
  const artifact = await validateFormalPackagedArtifactAuthoritatively({
    artifactManifest: formal.manifest,
    artifactManifestPath: formal.manifestPath,
    artifactPath: formal.artifactPath,
    rendererPath: formal.rendererPath,
    expectedSourceSha: source.sourceSha,
    sourceState: { ...source, source_dirty: false },
    hostPlatform: "darwin",
    requireHostPlatform: true,
    authority: rf13.authority,
    repoRoot: root,
    privacyValidation,
    privacyArtifact: archiveDescriptor,
  });
  assert.equal(artifact.verdict, "PASS");
  assert.ok(artifact.authority_validation);
  const host = sanitizedHostFingerprint({ platformName: "darwin", architecture: "arm64", osRelease: "23.5.0", cpuCount: 10, memoryBytes: 16 * 1024 ** 3 });
  const userDataRoot = await mkdtemp(path.join(root, "user-data-runs-"));
  try {
    const receipt = await measureColdStartRuns({
      artifact,
      hostFingerprint: host,
      userDataRoot,
      launchProcess: async ({ run_index: runIndex, user_data_path: userDataPath, host_fingerprint: hostFingerprint }) => fakeRun(runIndex, userDataPath, hostFingerprint),
    });
    assert.equal(receipt.status, "PASS");
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(receipt, { repoRoot: root }),
      /opaque canonical measurement capability/u,
    );
    await assert.rejects(
      validateColdStartReceiptAuthoritatively(receipt, {
        repoRoot: root,
        measurementValidation: artifact.authority_validation,
        receiptBytes: Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
      }),
      /opaque canonical measurement capability/u,
    );

    const capabilityBinding = {
      artifact_sha256: receipt.artifact.sha256,
      artifact_manifest_sha256: receipt.artifact.manifest_sha256,
      source_sha: receipt.source.source_sha,
      source_tree: receipt.source.source_tree,
      ...Object.fromEntries(Object.entries(receipt.artifact.authority).map(([key, value]) => [`authority.${key}`, value])),
    };
    assert.equal(
      assertColdStartAuthorityValidation(artifact.authority_validation, capabilityBinding),
      artifact.authority_validation,
    );

    const originalRf13Body = readFileSync(rf13.rf13Path, "utf8");
    const originalReleaseIndexBody = readFileSync(indexPath, "utf8");
    const replayReleaseIndex = JSON.parse(originalReleaseIndexBody);
    replayReleaseIndex.generated_at = "2026-07-31T00:00:01.000Z";
    const replayReleaseIndexBody = `${JSON.stringify(replayReleaseIndex, null, 2)}\n`;
    await write(indexPath, replayReleaseIndexBody);
    const replayManifest = JSON.parse(originalRf13Body);
    replayManifest.release.release_index.sha256 = sha256(Buffer.from(replayReleaseIndexBody, "utf8"));
    const replayRf13Body = `${JSON.stringify(replayManifest, null, 2)}\n`;
    await write(rf13.rf13Path, replayRf13Body);
    const coordinatedReplay = {
      ...capabilityBinding,
      "authority.release_index_sha256": replayManifest.release.release_index.sha256,
      "authority.rf13_dist_manifest_sha256": sha256(Buffer.from(replayRf13Body, "utf8")),
    };
    assert.throws(
      () => assertColdStartAuthorityValidation(artifact.authority_validation, coordinatedReplay),
      /(?:RF13-DIST manifest|release index) hash/u,
      "coordinated release-index and RF13 receipt replay must not reuse the old capability",
    );
    await write(indexPath, originalReleaseIndexBody);
    await write(rf13.rf13Path, originalRf13Body);

    const mutations = [
      ["rf13_dist_manifest_sha256", (value) => { value["authority.rf13_dist_manifest_sha256"] = "f".repeat(64); }, /RF13-DIST manifest hash/u],
      ["rf13_dist_manifest_path", (value) => { value["authority.rf13_dist_manifest_path"] = "missing-rf13.json"; }, /RF13-DIST manifest path/u],
      ["release_index_sha256", (value) => { value["authority.release_index_sha256"] = "f".repeat(64); }, /release index hash/u],
      ["release_index_path", (value) => { value["authority.release_index_path"] = "missing-index.json"; }, /release index path/u],
      ["artifact_id", (value) => { value["authority.artifact_id"] = "macos_dmg_image"; }, /indexed artifact hash\/ID/u],
      ["indexed_artifact_sha256", (value) => { value["authority.indexed_artifact_sha256"] = "f".repeat(64); }, /indexed artifact hash/u],
      ["privacy_receipt_path", (value) => { value["authority.privacy_receipt_path"] = "missing-privacy.json"; }, /privacy receipt path/u],
      ["privacy_receipt_sha256", (value) => { value["authority.privacy_receipt_sha256"] = "f".repeat(64); }, /privacy receipt hash/u],
      ["member_manifest_path", (value) => { value["authority.member_manifest_path"] = "missing-members.json"; }, /member manifest path/u],
      ["member_manifest_sha256", (value) => { value["authority.member_manifest_sha256"] = "f".repeat(64); }, /member manifest hash/u],
      ["source_sha", (value) => { value.source_sha = "c".repeat(40); }, /source_sha/u],
      ["source_tree", (value) => { value.source_tree = "d".repeat(40); }, /source_tree/u],
      ["manifest_sha256", (value) => { value.artifact_manifest_sha256 = "f".repeat(64); }, /artifact_manifest_sha256/u],
      ["artifact_sha256", (value) => { value.artifact_sha256 = "f".repeat(64); }, /artifact_sha256/u],
    ];
    for (const [field, mutate, expectedPattern] of mutations) {
      const mutated = { ...capabilityBinding };
      mutate(mutated);
      assert.throws(() => assertColdStartAuthorityValidation(artifact.authority_validation, mutated), expectedPattern, field);
    }
    const executablePath = path.join(formal.artifactPath, "Contents/MacOS/matter");
    const executableBytes = readFileSync(executablePath);
    await write(executablePath, "#!/bin/sh\necho tampered\n", 0o755);
    assert.throws(() => validateFormalPackagedArtifact({
      artifactManifest: formal.manifest,
      artifactManifestPath: formal.manifestPath,
      artifactPath: formal.artifactPath,
      rendererPath: formal.rendererPath,
      expectedSourceSha: source.sourceSha,
      sourceState: { ...source, source_dirty: false },
      hostPlatform: "darwin",
      requireHostPlatform: true,
      authority: rf13.authority,
      repoRoot: root,
    }), /measured packaged bundle|artifact|member/u);
    await write(executablePath, executableBytes, 0o755);

    const forgedArchivePath = path.join(root, "mutually-forged.zip");
    await write(forgedArchivePath, "this is not a ZIP archive\n");
    const forgedArtifact = {
      ...archiveDescriptor,
      bytes: readFileSync(forgedArchivePath).byteLength,
      sha256: sha256(readFileSync(forgedArchivePath)),
    };
    const forgedMembers = structuredClone(expandedInspection.member_manifest);
    forgedMembers.members = [{ path: "fabricated.bin", type: "file", sha256: "f".repeat(64), bytes: 4096 }];
    const forgedMemberBody = serializeDesktopArtifactMemberManifest(forgedMembers);
    const forgedMemberRelativePath = `${releaseFixture.manifest.release.artifact_root}/evidence/members-macos_zip_archive.json`;
    const forgedMemberPath = path.join(root, forgedMemberRelativePath);
    await write(forgedMemberPath, forgedMemberBody);
    const forgedReceipt = {
      ...privacyReceipt,
      artifact_sha256: forgedArtifact.sha256,
      artifact_bytes: forgedArtifact.bytes,
      scanned_member_count: 1,
      member_manifest_path: forgedMemberRelativePath,
      member_manifest_sha256: sha256(forgedMemberBody),
    };
    await assert.rejects(
      validateDesktopArtifactPrivacyEvidence({
        receipt: forgedReceipt,
        artifact: forgedArtifact,
        artifactPath: forgedArchivePath,
        artifactRoot: releaseFixture.manifest.release.artifact_root,
        expectedRootName: "matter.app",
        buildManifest: formal.manifest,
        corpus: privacyCorpus,
        repoRoot: root,
      }),
      (error) => ["ZIP_EXTRACTION_FAILED", "ZIP_EXTRACTION_ESCAPED", "ARCHIVE_MEMBER_MANIFEST_MISMATCH", "PRIVACY_MEMBER_EVIDENCE_INVALID"].includes(error.code),
    );
  } finally {
    await rm(userDataRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 rejects renderer path escape and stale formal manifest", async () => {
  const fixture = await createFormalFixture();
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "matter-cold-start-outside-"));
  try {
    const externalRenderer = path.join(outsideRoot, "renderer");
    await write(path.join(externalRenderer, "index.html"), "<div data-home-dashboard-shell=\"true\"></div>\n");
    await write(path.join(externalRenderer, "assets.js"), "console.log('outside');\n");
    assert.throws(() => validateFormalPackagedArtifact({
      artifactManifest: fixture.manifest,
      artifactManifestPath: fixture.manifestPath,
      artifactPath: fixture.artifactPath,
      rendererPath: externalRenderer,
      expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
      hostPlatform: "darwin",
    }), /contained by the artifact root/u);

    const staleManifest = createDesktopBuildManifest({
      version: fixture.manifest.version,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      sourceDirty: false,
      renderer: fixture.manifest.renderer,
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
      builtAt: "2000-01-01T00:00:00.000Z",
    });
    const stalePath = path.join(fixture.root, "stale-build-manifest.json");
    const staleBody = `${JSON.stringify(staleManifest, null, 2)}\n`;
    await write(stalePath, staleBody);
    await write(path.join(fixture.artifactPath, "Contents/Resources/matter-build-manifest.json"), staleBody);
    assert.throws(() => validateFormalPackagedArtifact({
      artifactManifest: staleManifest,
      artifactManifestPath: stalePath,
      artifactPath: fixture.artifactPath,
      rendererPath: fixture.rendererPath,
      expectedSourceSha: SOURCE_SHA,
      sourceState: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
      hostPlatform: "darwin",
    }), /stale/u);
  } finally {
    await rm(outsideRoot, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-038 measures framework symlinks with RF13 link-text semantics and rejects unsafe targets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "matter-cold-start-symlink-"));
  const bundle = path.join(root, "matter.app");
  const framework = path.join(bundle, "Contents/Frameworks/Electron Framework.framework");
  const versioned = path.join(framework, "Versions/A");
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "matter-cold-start-symlink-outside-"));
  try {
    await write(path.join(versioned, "Electron Framework"), "framework\n");
    await symlink("A", path.join(framework, "Versions/Current"));
    await symlink("Versions/Current/Electron Framework", path.join(framework, "Electron Framework"));
    const measured = measureBundle(bundle);
    assert.equal(measured.file_count, 3);
    assert.equal(measured.bytes, Buffer.byteLength("framework\n") + Buffer.byteLength("A") + Buffer.byteLength("Versions/Current/Electron Framework"));

    const substitutionTarget = path.join(bundle, "substitution-target");
    const substitutionPath = path.join(bundle, "substitution-entry");
    await write(substitutionTarget, "substitution-target");
    await symlink("substitution-target", substitutionPath);
    const symlinkMeasured = measureBundle(bundle);
    await rm(substitutionPath, { force: true });
    await write(substitutionPath, "substitution-target");
    const regularMeasured = measureBundle(bundle);
    assert.equal(symlinkMeasured.bytes, regularMeasured.bytes);
    assert.equal(symlinkMeasured.file_count, regularMeasured.file_count);
    assert.notEqual(symlinkMeasured.sha256, regularMeasured.sha256, "member type must be part of the measured digest");
    await rm(substitutionPath, { force: true });
    await rm(substitutionTarget, { force: true });

    await write(path.join(outsideRoot, "escape.txt"), "outside\n");
    await symlink(path.join(outsideRoot, "escape.txt"), path.join(bundle, "escape.txt"));
    assert.throws(() => measureBundle(bundle), /escapes its root/u);
    await rm(path.join(bundle, "escape.txt"), { force: true });

    const retargetPath = path.join(bundle, "retargeted-framework");
    await symlink("Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework", retargetPath);
    await rm(retargetPath, { force: true });
    await symlink(path.join(outsideRoot, "escape.txt"), retargetPath);
    assert.throws(() => measureBundle(bundle), /escapes its root/u);
    await rm(retargetPath, { force: true });

    await symlink("missing-target", path.join(bundle, "dangling"));
    assert.throws(() => measureBundle(bundle), /broken or looping/u);
    await rm(path.join(bundle, "dangling"), { force: true });

    await symlink("loop", path.join(bundle, "loop"));
    assert.throws(() => measureBundle(bundle), /broken or looping/u);
    await rm(path.join(bundle, "loop"), { force: true });

    if (process.platform !== "win32") {
      const fifoTarget = path.join(bundle, "fifo-target");
      const fifoLink = path.join(bundle, "fifo-link");
      await execFileAsync("mkfifo", [fifoTarget]);
      await symlink("fifo-target", fifoLink);
      assert.throws(() => measureBundle(bundle), /symlink target type is unsupported/u);
      await rm(fifoLink, { force: true });
      await rm(fifoTarget, { force: true });
      const fifoPath = path.join(bundle, "unsupported.fifo");
      await execFileAsync("mkfifo", [fifoPath]);
      assert.throws(() => measureBundle(bundle), /unsupported filesystem entry/u);
    }
  } finally {
    await rm(outsideRoot, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});
