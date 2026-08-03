import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  MACOS_RELEASE_APPROVAL_SCHEMA,
  MACOS_RELEASE_BOUNDARY_SCHEMA,
  MACOS_RELEASE_CHECKPOINT,
  MACOS_RELEASE_COMMAND_PLAN,
  MACOS_RELEASE_MANIFEST_SCHEMA,
  RF13_DIST_MACOS_RELEASE_SIDECAR_SCHEMA,
  assertNoSigningOrSubmissionCommands,
  canonicalSha256,
  collectMacosReleaseBoundaryReceipt,
  createMacosReleaseManifestBinding,
  createRf13DistMacosReleaseSidecar,
  sha256,
  validateMacosReleaseBoundaryLive,
  validateMacosReleaseBoundaryReceipt,
  validateRf13DistMacosReleaseSidecar,
} from "../lib/matter-desktop-macos-release-boundary.mjs";
import { createDesktopBuildManifest, DESKTOP_RENDERER_DIGEST_ALGORITHM } from "../lib/matter-desktop-provenance.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const FINGERPRINT = "AB".repeat(32);
const TEAM_ID = "LHDXU66NX3";
const NOW = "2026-07-31T08:00:00.000Z";
const APP_REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const DMG_REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const SCRIPT = fileURLToPath(new URL("../validate-matter-desktop-macos-release-boundary.mjs", import.meta.url));
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

function json(pathname, value) {
  mkdirSync(path.dirname(pathname), { recursive: true });
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture(testContext, { manifestSigning } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "matter-rfd012-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const macRoot = path.join(root, "apps/desktop/dist/mac");
  const appPath = path.join(macRoot, "matter.app");
  const executable = path.join(appPath, "Contents/MacOS/matter");
  const resource = path.join(appPath, "Contents/Resources/app/main.cjs");
  mkdirSync(path.dirname(executable), { recursive: true });
  mkdirSync(path.dirname(resource), { recursive: true });
  writeFileSync(executable, "#!/bin/sh\nexit 0\n");
  chmodSync(executable, 0o755);
  writeFileSync(resource, "module.exports = 'synthetic formal app';\n");
  const dmgPath = path.join(macRoot, "matter-0.1.17-macos.dmg");
  writeFileSync(dmgPath, "synthetic immutable disk image\n");
  const manifestPath = path.join(macRoot, "matter-0.1.17-macos-build-manifest.json");
  const manifest = {
    ...createDesktopBuildManifest({
      version: "0.1.17",
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      sourceDirty: false,
      renderer: { sha256: "c".repeat(64), file_count: 1, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
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
      builtAt: "2026-07-31T07:55:00.000Z",
    }),
    ...(manifestSigning === undefined ? {} : { macos_signing: manifestSigning }),
  };
  json(manifestPath, manifest);
  const approval = {
    schema_version: MACOS_RELEASE_APPROVAL_SCHEMA,
    checkpoint_id: MACOS_RELEASE_CHECKPOINT,
    approval_id: "RFD-TUW-012-test-approval",
    decision: "APPROVED",
    approved_at: "2026-07-31T07:50:00.000Z",
    expires_at: "2026-08-01T08:00:00.000Z",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    signing_identity: {
      fingerprint_algorithm: "sha256",
      certificate_fingerprint: FINGERPRINT,
      team_id: TEAM_ID,
    },
    operations: {
      developer_id_signing: true,
      notarization_submission: true,
      notary_status_query: true,
    },
    public_release_approved: false,
    owner_approval_claim: false,
  };
  return { root, appPath, dmgPath, manifestPath, manifest, approval };
}

function fakeRunner({ failId, adhocId, rejectedNotaryId, throwId, fingerprint = FINGERPRINT, teamId = TEAM_ID } = {}) {
  const invocations = [];
  const runner = ({ id, binary, args }) => {
    invocations.push({ id, binary, args });
    if (id === throwId) throw new Error("password=hunter2 /Users/private/secret.key");
    if (id === failId) return { status: 1, stderr: "password=hunter2 /Users/private/secret.key" };
    if (id.endsWith("_identity_verify")) {
      return {
        status: 0,
        stderr: id === adhocId
          ? "Signature=adhoc\nTeamIdentifier=not set\n"
          : `Authority=Developer ID Application: intentionally not recorded (${teamId})\nTeamIdentifier=${teamId}\n`,
      };
    }
    if (id.endsWith("_identity_fingerprint")) {
      return { status: 0, stdout: `sha256 Fingerprint=${fingerprint.match(/../gu).join(":")}\n` };
    }
    if (id.endsWith("_notary_status")) {
      const requestId = id.startsWith("app_") ? APP_REQUEST_ID : DMG_REQUEST_ID;
      return { status: 0, stdout: JSON.stringify({ id: requestId, status: id === rejectedNotaryId ? "Rejected" : "Accepted" }) };
    }
    return { status: 0 };
  };
  return { runner, invocations };
}

function collect(testContext, runnerOptions = {}, fixtureOptions = {}) {
  const inputs = fixture(testContext, fixtureOptions);
  const fake = fakeRunner(runnerOptions);
  const receipt = collectMacosReleaseBoundaryReceipt({
    repoRoot: inputs.root,
    manifestPath: inputs.manifestPath,
    appPath: inputs.appPath,
    dmgPath: inputs.dmgPath,
    approval: inputs.approval,
    appNotaryRequestId: APP_REQUEST_ID,
    dmgNotaryRequestId: DMG_REQUEST_ID,
    notaryProfile: "synthetic-profile-never-recorded",
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    sourceDirty: false,
    runner: fake.runner,
    now: NOW,
  });
  return { ...inputs, ...fake, receipt };
}

function releaseManifest(receipt, receiptBody) {
  return {
    schema_version: MACOS_RELEASE_MANIFEST_SCHEMA,
    release_id: "matter-desktop-v0.1.17-rfd012-test",
    artifact_root: `apps/desktop/dist/releases/0.1.17/${SOURCE_SHA}/formal`,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    source_dirty: false,
    channel: "formal-candidate",
    app_id: "com.amic.matter.desktop",
    public_release_claim: false,
    production_go_live_claim: false,
    owner_approval_claim: false,
    macos_release_boundary: createMacosReleaseManifestBinding(receipt, sha256(receiptBody)),
  };
}

function validateCollected(collected, overrides = {}) {
  const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
  const { releaseManifest: suppliedReleaseManifest, ...validationOverrides } = overrides;
  return validateMacosReleaseBoundaryReceipt(collected.receipt, {
    repoRoot: collected.root,
    manifest: collected.manifest,
    manifestPath: collected.manifestPath,
    appPath: collected.appPath,
    dmgPath: collected.dmgPath,
    approval: collected.approval,
    releaseManifest: suppliedReleaseManifest ?? releaseManifest(collected.receipt, receiptBody),
    receiptFileSha256: sha256(receiptBody),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    now: NOW,
    allowTestOnly: true,
    ...validationOverrides,
  });
}

function forgeReceipt(collected, mutate) {
  const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
  const boundReleaseManifest = releaseManifest(collected.receipt, receiptBody);
  const forged = { ...collected, receipt: structuredClone(collected.receipt) };
  mutate(forged.receipt);
  return { forged, boundReleaseManifest };
}

test("RFD-TUW-012 command plan is verification-only and covers every app/DMG check", () => {
  assert.equal(assertNoSigningOrSubmissionCommands(), true);
  assert.deepEqual(MACOS_RELEASE_COMMAND_PLAN.map(({ id }) => id), [
    "app_codesign_verify",
    "app_gatekeeper_assess",
    "app_stapler_validate",
    "app_identity_verify",
    "app_identity_fingerprint",
    "app_notary_status",
    "dmg_codesign_verify",
    "dmg_gatekeeper_assess",
    "dmg_stapler_validate",
    "dmg_image_verify",
    "dmg_identity_verify",
    "dmg_identity_fingerprint",
    "dmg_notary_status",
  ]);
  const serialized = JSON.stringify(MACOS_RELEASE_COMMAND_PLAN);
  assert.doesNotMatch(serialized, /"--sign"|"submit"|"staple"/u);
});

test("injected-runner fixtures are structured TEST_ONLY evidence and cannot mint RF13 authority", (testContext) => {
  const collected = collect(testContext);
  assert.equal(collected.receipt.schema_version, MACOS_RELEASE_BOUNDARY_SCHEMA);
  assert.equal(collected.receipt.verdict, "TEST_ONLY");
  assert.equal(collected.receipt.source.source_sha, SOURCE_SHA);
  assert.equal(collected.receipt.source.source_tree, SOURCE_TREE);
  assert.equal(collected.receipt.artifacts.application.path, "apps/desktop/dist/mac/matter.app");
  assert.equal(collected.receipt.artifacts.disk_image.path, "apps/desktop/dist/mac/matter-0.1.17-macos.dmg");
  assert.match(collected.receipt.artifacts.application.sha256, /^[0-9a-f]{64}$/u);
  assert.match(collected.receipt.artifacts.disk_image.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(collected.receipt.artifacts.application.bytes > 0);
  assert.ok(collected.receipt.artifacts.disk_image.bytes > 0);
  assert.deepEqual(collected.receipt.signing_identity, {
    fingerprint_algorithm: "sha256",
    certificate_fingerprint: FINGERPRINT,
    team_id: TEAM_ID,
  });
  assert.equal(collected.receipt.notarization.application.status, "accepted");
  assert.equal(collected.receipt.notarization.disk_image.status, "accepted");
  assert.equal(collected.receipt.boundaries.legacy_markdown_authority, false);
  assert.equal(collected.receipt.boundaries.signing_executed, false);
  assert.equal(collected.receipt.boundaries.notarization_submission_executed, false);
  assert.equal(collected.receipt.execution.mode, "test_only_injected_runner");
  assert.equal(collected.receipt.execution.command_count_executed, MACOS_RELEASE_COMMAND_PLAN.length);
  assert.match(collected.receipt.execution.sequence_sha256, /^[0-9a-f]{64}$/u);
  let priorCompletedAt = -Infinity;
  for (const check of Object.values(collected.receipt.checks)) {
    assert.match(check.raw_transcript_sha256, /^[0-9a-f]{64}$/u);
    assert.ok(Date.parse(check.started_at) > priorCompletedAt);
    assert.ok(Date.parse(check.completed_at) > Date.parse(check.started_at));
    priorCompletedAt = Date.parse(check.completed_at);
  }
  assert.deepEqual(collected.invocations.map(({ id }) => id), MACOS_RELEASE_COMMAND_PLAN.map(({ id }) => id));
  for (const invocation of collected.invocations) {
    assert.equal(invocation.args.includes("--sign"), false);
    assert.equal(invocation.args.includes("submit"), false);
    assert.equal(invocation.args.includes("staple"), false);
  }
  const validated = validateCollected(collected);
  assert.equal(validated.verdict, "STRUCTURAL_ONLY");
  assert.equal(validated.receipt_verdict, "TEST_ONLY");
  assert.equal(validated.authoritative, false);
  assert.equal(validated.application_sha256, collected.receipt.artifacts.application.sha256);
  assert.equal(validated.disk_image_sha256, collected.receipt.artifacts.disk_image.sha256);
  assert.throws(
    () => createRf13DistMacosReleaseSidecar(validated, { receiptId: "RFD-TUW-012-test-only" }),
    (error) => error.code === "STRICT_PASS_REQUIRED",
  );
  assert.doesNotMatch(JSON.stringify(collected.receipt), /Developer ID Application|synthetic-profile-never-recorded/u);
});

test("reviewer zero-probe unsigned app and plain DMG fixture cannot authorize PASS or RF13-DIST", (testContext) => {
  const collected = collect(testContext);
  const forged = structuredClone(collected.receipt);
  forged.verdict = "PASS";
  forged.execution.mode = "native_live";
  for (const [id, check] of Object.entries(forged.checks)) check.raw_transcript_sha256 = sha256(`self-authored-${id}`);
  forged.execution.sequence_sha256 = canonicalSha256(Object.values(forged.checks));
  collected.invocations.length = 0;
  const receiptBody = Buffer.from(`${JSON.stringify(forged, null, 2)}\n`);
  const forgedManifest = releaseManifest(forged, receiptBody);
  const structural = validateMacosReleaseBoundaryReceipt(forged, {
    repoRoot: collected.root,
    manifest: collected.manifest,
    manifestPath: collected.manifestPath,
    appPath: collected.appPath,
    dmgPath: collected.dmgPath,
    approval: collected.approval,
    releaseManifest: forgedManifest,
    receiptFileSha256: sha256(receiptBody),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedReleaseRoot: forgedManifest.artifact_root,
    now: NOW,
  });
  assert.equal(collected.invocations.length, 0);
  assert.equal(structural.verdict, "STRUCTURAL_ONLY");
  assert.equal(structural.authoritative, false);
  assert.throws(
    () => createRf13DistMacosReleaseSidecar(structural, { receiptId: "RFD-TUW-012-zero-probe" }),
    (error) => error.code === "STRICT_PASS_REQUIRED",
  );
  const forgedPath = path.join(collected.root, "self-authored-pass.json");
  json(forgedPath, forged);
  const directCli = spawnSync(process.execPath, [
    SCRIPT,
    "--repo-root", REPO_ROOT,
    "--receipt", forgedPath,
    "--approval-intake", forgedPath,
    "--release-manifest", forgedPath,
  ], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(directCli.status, 1);
  assert.equal(JSON.parse(directCli.stderr).code, "SHA_SCOPED_AUTHORITY_REQUIRED");
  assert.throws(
    () => validateMacosReleaseBoundaryLive(forged, {
      repoRoot: collected.root,
      manifest: collected.manifest,
      manifestPath: collected.manifestPath,
      appPath: collected.appPath,
      dmgPath: collected.dmgPath,
      approval: collected.approval,
      releaseManifest: forgedManifest,
      receiptFileSha256: sha256(receiptBody),
      expectedSourceSha: SOURCE_SHA,
      expectedSourceTree: SOURCE_TREE,
      expectedReleaseRoot: forgedManifest.artifact_root,
      notaryProfile: "synthetic-profile-never-recorded",
      sourceDirty: false,
      now: NOW,
    }),
    (error) => error.code === "APP_CODESIGN_VERIFY_FAILED",
  );
});

test("unsigned, unstapled, rejected, or corrupt artifacts cannot produce a receipt", async (testContext) => {
  const cases = [
    ["app_codesign_verify", "APP_CODESIGN_VERIFY_FAILED"],
    ["app_gatekeeper_assess", "APP_GATEKEEPER_ASSESS_FAILED"],
    ["app_stapler_validate", "APP_STAPLER_VALIDATE_FAILED"],
    ["dmg_codesign_verify", "DMG_CODESIGN_VERIFY_FAILED"],
    ["dmg_gatekeeper_assess", "DMG_GATEKEEPER_ASSESS_FAILED"],
    ["dmg_stapler_validate", "DMG_STAPLER_VALIDATE_FAILED"],
    ["dmg_image_verify", "DMG_IMAGE_VERIFY_FAILED"],
  ];
  for (const [failId, code] of cases) {
    await testContext.test(failId, (subtest) => {
      assert.throws(() => collect(subtest, { failId }), (error) => {
        assert.equal(error.code, code);
        assert.doesNotMatch(error.message, /hunter2|\/Users\/private/u);
        return true;
      });
    });
  }
  await testContext.test("ad-hoc app", (subtest) => {
    assert.throws(() => collect(subtest, { adhocId: "app_identity_verify" }), (error) => error.code === "APP_DEVELOPER_ID_REQUIRED");
  });
  await testContext.test("ad-hoc DMG", (subtest) => {
    assert.throws(() => collect(subtest, { adhocId: "dmg_identity_verify" }), (error) => error.code === "DMG_DEVELOPER_ID_REQUIRED");
  });
  await testContext.test("notary rejection", (subtest) => {
    assert.throws(() => collect(subtest, { rejectedNotaryId: "app_notary_status" }), (error) => error.code === "NOTARIZATION_NOT_ACCEPTED");
  });
});

test("approved intake binds the exact certificate fingerprint and Team ID", (testContext) => {
  assert.throws(() => collect(testContext, { fingerprint: "CD".repeat(32) }), (error) => error.code === "SIGNING_IDENTITY_MISMATCH");
});

test("missing notary authority blocks before any probe command executes", (testContext) => {
  const inputs = fixture(testContext);
  const fake = fakeRunner();
  assert.throws(() => collectMacosReleaseBoundaryReceipt({
    repoRoot: inputs.root,
    manifestPath: inputs.manifestPath,
    appPath: inputs.appPath,
    dmgPath: inputs.dmgPath,
    approval: inputs.approval,
    appNotaryRequestId: APP_REQUEST_ID,
    dmgNotaryRequestId: DMG_REQUEST_ID,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    sourceDirty: false,
    runner: fake.runner,
    now: NOW,
  }), (error) => error.code === "NOTARY_AUTHORITY_REQUIRED");
  assert.equal(fake.invocations.length, 0);
});

test("runner exceptions are reduced to stable errors without path or secret disclosure", (testContext) => {
  assert.throws(() => collect(testContext, { throwId: "app_codesign_verify" }), (error) => {
    assert.equal(error.code, "APP_CODESIGN_VERIFY_FAILED");
    assert.doesNotMatch(`${error.message} ${JSON.stringify(error.details)}`, /hunter2|\/Users\/private|secret\.key/u);
    return true;
  });
});

test("missing app staple and forged command statuses are rejected structurally", async (testContext) => {
  await testContext.test("missing app staple", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { delete receipt.checks.app_stapler_validate; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "MISSING_FIELD");
  });
  await testContext.test("forged DMG image PASS", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { receipt.checks.dmg_image_verify.status = "FAIL"; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "OS_CHECK_NOT_PASS");
  });
  await testContext.test("missing app notarization", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { delete receipt.notarization.application; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "MISSING_FIELD");
  });
  await testContext.test("zero probe count", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { receipt.execution.command_count_executed = 0; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "PROBE_COMMAND_COUNT_INVALID");
  });
  await testContext.test("raw transcript hash removed", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { receipt.checks.app_codesign_verify.raw_transcript_sha256 = "PASS"; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "INVALID_SHA256");
  });
  await testContext.test("non-monotonic command chronology", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => {
      receipt.checks.app_gatekeeper_assess.started_at = receipt.checks.app_codesign_verify.completed_at;
    });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "PROBE_EXECUTION_TIME_INVALID");
  });
});

test("altered source, path, hash/bytes, or stale timestamp cannot reuse a PASS receipt", async (testContext) => {
  await testContext.test("altered source", (subtest) => {
    const collected = collect(subtest);
    collected.receipt.source.source_sha = "d".repeat(40);
    assert.throws(() => validateCollected(collected), (error) => error.code === "SOURCE_SHA_MISMATCH");
  });
  await testContext.test("internal receipt", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { receipt.source.channel = "internal"; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "FORMAL_ARTIFACT_REQUIRED");
  });
  await testContext.test("altered app bytes", (subtest) => {
    const collected = collect(subtest);
    writeFileSync(path.join(collected.appPath, "Contents/Resources/app/main.cjs"), "altered after receipt\n");
    assert.throws(() => validateCollected(collected), (error) => error.code === "ARTIFACT_BINDING_MISMATCH");
  });
  await testContext.test("altered DMG bytes", (subtest) => {
    const collected = collect(subtest);
    writeFileSync(collected.dmgPath, "altered disk image after receipt\n");
    assert.throws(() => validateCollected(collected), (error) => error.code === "ARTIFACT_BINDING_MISMATCH");
  });
  await testContext.test("altered artifact path", (subtest) => {
    const collected = collect(subtest);
    const { forged, boundReleaseManifest } = forgeReceipt(collected, (receipt) => { receipt.artifacts.application.path = "../other.app"; });
    assert.throws(() => validateCollected(forged, { releaseManifest: boundReleaseManifest }), (error) => error.code === "ARTIFACT_PATH_INVALID");
  });
  await testContext.test("stale receipt", (subtest) => {
    const collected = collect(subtest);
    assert.throws(
      () => validateCollected(collected, { now: "2026-08-02T08:00:00.001Z" }),
      (error) => error.code === "RECEIPT_STALE",
    );
  });
});

test("release and build manifests must copy the structured identity/receipt binding exactly", async (testContext) => {
  await testContext.test("release manifest mismatch", (subtest) => {
    const collected = collect(subtest);
    const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
    const forged = releaseManifest(collected.receipt, receiptBody);
    forged.macos_release_boundary = structuredClone(forged.macos_release_boundary);
    forged.macos_release_boundary.team_id = "AAAAAAAAAA";
    assert.throws(
      () => validateMacosReleaseBoundaryReceipt(collected.receipt, {
        repoRoot: collected.root,
        manifest: collected.manifest,
        manifestPath: collected.manifestPath,
        appPath: collected.appPath,
        dmgPath: collected.dmgPath,
        approval: collected.approval,
        releaseManifest: forged,
        receiptFileSha256: sha256(receiptBody),
        expectedSourceSha: SOURCE_SHA,
        expectedSourceTree: SOURCE_TREE,
        now: NOW,
        allowTestOnly: true,
      }),
      (error) => error.code === "RELEASE_MANIFEST_SIGNING_MISMATCH",
    );
  });
  await testContext.test("legacy release manifest signing prose", (subtest) => {
    const collected = collect(subtest);
    const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
    const legacy = releaseManifest(collected.receipt, receiptBody);
    legacy.macos_signing = { resolved_signing_identity: "Developer ID Application: arbitrary" };
    assert.throws(
      () => validateCollected(collected, { releaseManifest: legacy }),
      (error) => error.code === "LEGACY_SIGNING_MANIFEST_REJECTED",
    );
  });
  await testContext.test("missing release manifest schema", (subtest) => {
    const collected = collect(subtest);
    const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
    const unversioned = releaseManifest(collected.receipt, receiptBody);
    delete unversioned.schema_version;
    assert.throws(
      () => validateCollected(collected, { releaseManifest: unversioned }),
      (error) => error.code === "RELEASE_MANIFEST_SCHEMA_MISMATCH",
    );
  });
  await testContext.test("unknown release manifest schema", (subtest) => {
    const collected = collect(subtest);
    const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
    const unknown = releaseManifest(collected.receipt, receiptBody);
    unknown.schema_version = "law-firm-os.matter-desktop-formal-release-candidate.v999";
    assert.throws(
      () => validateCollected(collected, { releaseManifest: unknown }),
      (error) => error.code === "RELEASE_MANIFEST_SCHEMA_MISMATCH",
    );
  });
  await testContext.test("build manifest identity mismatch", (subtest) => {
    assert.throws(
      () => collect(subtest, {}, { manifestSigning: { fingerprint_algorithm: "sha256", certificate_fingerprint: "CD".repeat(32), team_id: TEAM_ID } }),
      (error) => error.code === "BUILD_MANIFEST_INVALID",
    );
  });
});

test("legacy Markdown PASS text never authorizes the boundary and is not echoed", (testContext) => {
  const root = mkdtempSync(path.join(tmpdir(), "matter-rfd012-markdown-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const markdown = path.join(root, "legacy.md");
  writeFileSync(markdown, "PASS\nresolved signing identity: Developer ID Application: fake\npassword=hunter2\n");
  const result = spawnSync(process.execPath, [
    SCRIPT,
    "--receipt", markdown,
    "--approval-intake", markdown,
    "--release-manifest", markdown,
  ], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.status, 1);
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.code, "LEGACY_MARKDOWN_REJECTED");
  assert.doesNotMatch(result.stderr, /hunter2|Developer ID Application: fake/u);
});

test("plan output rejects a symlink without overwriting its target", (testContext) => {
  const evidenceRoot = path.join(REPO_ROOT, ".omo/evidence");
  mkdirSync(evidenceRoot, { recursive: true });
  const outputRoot = mkdtempSync(path.join(evidenceRoot, "rfd012-output-test-"));
  const outsideRoot = mkdtempSync(path.join(tmpdir(), "rfd012-output-target-"));
  testContext.after(() => {
    rmSync(outputRoot, { recursive: true, force: true });
    rmSync(outsideRoot, { recursive: true, force: true });
  });
  const target = path.join(outsideRoot, "must-remain.txt");
  const output = path.join(outputRoot, "receipt.json");
  writeFileSync(target, "unchanged\n");
  symlinkSync(target, output);
  const result = spawnSync(process.execPath, [SCRIPT, "--plan", "--output", output], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).code, "OUTPUT_TARGET_UNSAFE");
  assert.equal(readFileSync(target, "utf8"), "unchanged\n");
});

test("RF13-DIST sidecar cannot be created without a strict release-validator result", () => {
  assert.throws(
    () => createRf13DistMacosReleaseSidecar({ schema_version: MACOS_RELEASE_BOUNDARY_SCHEMA, verdict: "BLOCKED_BY_ARTIFACT" }, { receiptId: "RFD-TUW-012-blocked" }),
    (error) => error.code === "STRICT_PASS_REQUIRED",
  );
});

test("RF13-DIST and rollback reject hand-written native-live PASS for an unsigned shell app and plain DMG", (testContext) => {
  const collected = collect(testContext);
  const receiptBody = Buffer.from(`${JSON.stringify(collected.receipt, null, 2)}\n`);
  const forgedLiveValidation = {
    verdict: "PASS",
    authoritative: true,
    execution_mode: "native_live_revalidation",
    command_count_executed: MACOS_RELEASE_COMMAND_PLAN.length,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    application_sha256: collected.receipt.artifacts.application.sha256,
    disk_image_sha256: collected.receipt.artifacts.disk_image.sha256,
    receipt_sha256: sha256(receiptBody),
  };
  const forgedSidecar = {
    schema_version: RF13_DIST_MACOS_RELEASE_SIDECAR_SCHEMA,
    receipt_id: "RFD-TUW-012-hand-written-pass",
    gate: "macos_release",
    status: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: [collected.receipt.artifacts.disk_image.sha256],
    executed: true,
    authoritative: true,
    template: false,
  };
  assert.throws(
    () => validateRf13DistMacosReleaseSidecar(forgedSidecar, {
      liveValidation: forgedLiveValidation,
      expectedSourceSha: SOURCE_SHA,
      expectedSourceTree: SOURCE_TREE,
      expectedArtifactSha256: collected.receipt.artifacts.disk_image.sha256,
      expectedReceiptSha256: sha256(receiptBody),
    }),
    (error) => error.code === "MACOS_LIVE_AUTHORITY_REQUIRED",
  );
});

test("fixture manifest remains unchanged during read-only collection", (testContext) => {
  const inputs = fixture(testContext);
  const before = readFileSync(inputs.manifestPath);
  const fake = fakeRunner();
  collectMacosReleaseBoundaryReceipt({
    repoRoot: inputs.root,
    manifestPath: inputs.manifestPath,
    appPath: inputs.appPath,
    dmgPath: inputs.dmgPath,
    approval: inputs.approval,
    appNotaryRequestId: APP_REQUEST_ID,
    dmgNotaryRequestId: DMG_REQUEST_ID,
    notaryProfile: "synthetic-profile-never-recorded",
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    sourceDirty: false,
    runner: fake.runner,
    now: NOW,
  });
  assert.deepEqual(readFileSync(inputs.manifestPath), before);
});
