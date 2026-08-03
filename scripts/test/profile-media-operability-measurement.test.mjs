import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runTenProfileApiRead } from "../lib/profile-media-api-smoke.mjs";
import {
  PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
  runProfileMediaOperabilityMeasurement,
} from "../lib/profile-media-measurement.mjs";
import { validateTestOnlyProfileMediaMeasurementReceipt } from "../lib/profile-media-measurement-validator.mjs";
import {
  prepareProfilePhotoChange,
  readPreparedProfilePhotoChange,
} from "../lib/profile-photo-server-operation.mjs";
import { profilePhotoOperationPaths, resolveActiveGeneration } from "../lib/profile-photo-operation-root.mjs";
import { PROFILE_PHOTO_SLOT_REFS, verifyProfilePhotoManifest } from "../validate-profile-photo-replacement-manifest.mjs";
import {
  createActiveProfileReader,
  createFixtureRepo,
  createPassingProfileReader,
  opaqueChangeRef,
  passingProfileResponse,
  pngWithUndecodableIdat,
  provisionOperationRoot,
  sequenceClock,
  syntheticPng,
} from "./profile-media-test-fixture.mjs";

const CLOCK = [
  "2026-08-01T00:00:00.000Z",
  "2026-08-01T00:00:01.000Z",
  "2026-08-01T00:10:01.000Z",
  "2026-08-01T00:10:02.000Z",
  "2026-08-01T00:12:02.000Z",
  "2026-08-01T00:13:02.000Z",
  "2026-08-01T00:14:02.000Z",
  "2026-08-01T00:14:03.000Z",
];

function prepared(testContext, label = "api-smoke") {
  const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef(label) });
  const options = { ...fixture, testOnly: true, execute: true };
  prepareProfilePhotoChange(options);
  return { fixture, options, state: readPreparedProfilePhotoChange(options) };
}

function marker(root) {
  const path = join(root, ".desktop-package-marker");
  writeFileSync(path, "test-only-package-marker\n", { mode: 0o600 });
  return path;
}

function receiptDescriptor(relativePath, absolutePath) {
  const bytes = readFileSync(absolutePath);
  return { path: relativePath, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
}

test("ten-profile smoke decodes PNGs and binds every slot to active generation plus content digest", async (testContext) => {
  const { state } = prepared(testContext);
  const seen = [];
  const reader = createPassingProfileReader({
    directory: state.candidateDirectory,
    manifest: state.candidateManifest,
    generationRef: state.candidateGenerationRef,
  });
  const result = await runTenProfileApiRead({
    expectedManifest: state.candidateManifest,
    expectedGenerationRef: state.candidateGenerationRef,
    readProfile(ref) { seen.push(ref); return reader(ref); },
  });
  assert.deepEqual(seen, PROFILE_PHOTO_SLOT_REFS);
  assert.ok(Object.values(result).every((value) => value === 10));
  assert.doesNotMatch(JSON.stringify(result), /profile_slot|data:image|base64|[a-f0-9]{64}/u);
});

test("smoke rejects stale generation, swapped payload, malformed encoding, undecodable PNG, and valid wrong PNG", async (testContext) => {
  const { state } = prepared(testContext, "api-adversaries");
  const baseReader = createPassingProfileReader({
    directory: state.candidateDirectory,
    manifest: state.candidateManifest,
    generationRef: state.candidateGenerationRef,
  });
  const run = (readProfile) => runTenProfileApiRead({
    readProfile,
    expectedManifest: state.candidateManifest,
    expectedGenerationRef: state.candidateGenerationRef,
  });
  await assert.rejects(run((ref) => ({ ...baseReader(ref), generation_ref: state.baselineGenerationRef })), (error) => error.code === "PROFILE_API_COHORT_FAILED");
  await assert.rejects(run((ref) => baseReader(ref === PROFILE_PHOTO_SLOT_REFS[0] ? PROFILE_PHOTO_SLOT_REFS[1] : ref)), (error) => error.code === "PROFILE_API_COHORT_FAILED");
  await assert.rejects(run((ref) => {
    const response = baseReader(ref);
    response.body.item.photo_url = "data:image/png;base64,%%%";
    return response;
  }), (error) => error.code === "PROFILE_PNG_BASE64_INVALID");
  await assert.rejects(run((ref) => passingProfileResponse({ bytes: pngWithUndecodableIdat(), generationRef: state.candidateGenerationRef })), (error) => error.code === "PROFILE_PNG_DECODE_INVALID");
  await assert.rejects(run(() => passingProfileResponse({ bytes: syntheticPng(200, 7), generationRef: state.candidateGenerationRef })), (error) => error.code === "PROFILE_API_COHORT_FAILED");
});

test("measured TEST_ONLY rehearsal restores hash and post-rollback 10/10, then re-reads root, journal, sources, and marker", async (testContext) => {
  const { fixture, options, state } = prepared(testContext, "measurement-pass");
  const repoRoot = createFixtureRepo(testContext);
  const suffix = fixture.changeRef.slice("profile_change_".length);
  const relativeReceipt = `.omo/evidence/profile-media-operability-measurement-${suffix}.json`;
  const receiptPath = join(repoRoot, relativeReceipt);
  const desktopMarkerPath = marker(fixture.root);
  const result = await runProfileMediaOperabilityMeasurement({
    ...options,
    repoRoot,
    receiptPath,
    desktopMarkerPath,
    now: sequenceClock(CLOCK),
    readProfile: createActiveProfileReader({ root: fixture.root, state }),
  });
  assert.deepEqual({ verdict: result.verdict, promoted: result.promoted_profile_reads_passed, rollback: result.rollback_profile_reads_passed }, {
    verdict: "PASS", promoted: 10, rollback: 10,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  assert.equal(receipt.environment, "TEST_ONLY");
  assert.equal(receipt.rollback.profile_reads.png_decoded, 10);
  assert.equal(receipt.rollback.profile_reads.generation_match, 10);
  assert.equal(receipt.rollback.profile_reads.content_digest_match, 10);
  assert.equal(receipt.boundary.production_profile_mutation_executed, false);
  assert.equal("path" in receipt.observation_journal, false);
  assert.doesNotMatch(JSON.stringify(receipt.promoted_profile_reads), /profile_slot|data:image|base64/u);

  const measurement = validateTestOnlyProfileMediaMeasurementReceipt(receiptDescriptor(relativeReceipt, receiptPath), {
    repoRoot,
    root: fixture.root,
    desktopMarkerPath,
    now: new Date("2026-08-01T01:00:00.000Z"),
  });
  assert.equal(measurement.metrics.profile_api_reads.passed, 10);
  assert.equal(measurement.metrics.rollback.profile_reads_passed, 10);
  assert.equal(measurement.metrics.rollback.minutes, 4);
});

test("failed promoted smoke restores baseline and cannot write a passing receipt", async (testContext) => {
  const { fixture, options, state } = prepared(testContext, "smoke-failure");
  const repoRoot = createFixtureRepo(testContext);
  const relativeReceipt = `.omo/evidence/profile-media-operability-measurement-${fixture.changeRef.slice("profile_change_".length)}.json`;
  const receiptPath = join(repoRoot, relativeReceipt);
  const underlying = createActiveProfileReader({ root: fixture.root, state });
  let calls = 0;
  await assert.rejects(runProfileMediaOperabilityMeasurement({
    ...options,
    repoRoot,
    receiptPath,
    desktopMarkerPath: marker(fixture.root),
    now: sequenceClock(CLOCK),
    readProfile(ref) {
      calls += 1;
      const response = underlying(ref);
      if (calls === 1) response.status = 503;
      return response;
    },
  }), (error) => error.code === "PROFILE_API_COHORT_FAILED");
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  verifyProfilePhotoManifest({ directory: resolveActiveGeneration(fixture.root).directory, manifestPath: paths.baselineManifest });
  assert.equal(existsSync(receiptPath), false);
});

test("independently re-read journal samples drive frequency, p95, and marker-change counts", async (testContext) => {
  const prior = {
    schema_version: PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
    event_ref: opaqueChangeRef("prior-observed"),
    started_at: "2026-07-15T00:00:00.000Z",
    completed_at: "2026-07-15T00:45:00.000Z",
    desktop_install_state_changed: true,
  };
  const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef("second-observed"), priorEvents: [prior] });
  const options = { ...fixture, testOnly: true, execute: true };
  prepareProfilePhotoChange(options);
  const state = readPreparedProfilePhotoChange(options);
  const repoRoot = createFixtureRepo(testContext);
  const relativeReceipt = `.omo/evidence/profile-media-operability-measurement-${fixture.changeRef.slice("profile_change_".length)}.json`;
  const receiptPath = join(repoRoot, relativeReceipt);
  const desktopMarkerPath = marker(fixture.root);
  await runProfileMediaOperabilityMeasurement({
    ...options,
    repoRoot,
    receiptPath,
    desktopMarkerPath,
    now: sequenceClock(CLOCK),
    readProfile: createActiveProfileReader({ root: fixture.root, state }),
  });
  const result = validateTestOnlyProfileMediaMeasurementReceipt(receiptDescriptor(relativeReceipt, receiptPath), {
    repoRoot, root: fixture.root, desktopMarkerPath, now: new Date("2026-08-01T01:00:00.000Z"),
  });
  assert.ok(result.metrics.monthly_changes > 1);
  assert.equal(result.metrics.operator_minutes_p95, 45);
  assert.equal(result.metrics.desktop_reinstall_count, 1);
});
