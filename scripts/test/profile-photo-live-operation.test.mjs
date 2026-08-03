import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readProfileMediaJournal } from "../lib/profile-media-measurement.mjs";
import {
  runLiveProfilePhotoPromotion,
  runLiveProfilePhotoRollback,
} from "../lib/profile-photo-live-operation.mjs";
import { profilePhotoOperationPaths, resolveActiveGeneration, validateProfilePhotoSafeRoot } from "../lib/profile-photo-operation-root.mjs";
import { prepareProfilePhotoChange, readPreparedProfilePhotoChange } from "../lib/profile-photo-server-operation.mjs";
import { inspectProfilePhotoDirectory } from "../validate-profile-photo-replacement-manifest.mjs";
import {
  createActiveProfileReader,
  opaqueChangeRef,
  provisionOperationRoot,
  sequenceClock,
} from "./profile-media-test-fixture.mjs";

function setup(testContext, label) {
  const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef(label) });
  const desktopMarkerPath = join(fixture.root, ".desktop-package-marker");
  writeFileSync(desktopMarkerPath, "test-only-package-marker\n", { mode: 0o600 });
  const options = { ...fixture, testOnly: true, desktopMarkerPath };
  prepareProfilePhotoChange({ ...options, execute: true });
  const state = readPreparedProfilePhotoChange({ ...options, execute: true });
  return { fixture, state, options: { ...options, readProfile: createActiveProfileReader({ root: fixture.root, state }) } };
}

test("TEST_ONLY promotion dry-run and denied authority leave baseline active", async (testContext) => {
  const { fixture, options } = setup(testContext, "live-denied");
  const dry = await runLiveProfilePhotoPromotion(options);
  assert.equal(dry.verdict, "DRY_RUN");
  assert.equal(dry.mutation_executed, false);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  await assert.rejects(runLiveProfilePhotoPromotion({ ...options, execute: true, authorize: () => false }), (error) => error.code === "LIVE_OPERATION_AUTHORITY");
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
});

test("TEST_ONLY promotion proves candidate 10/10 and rollback restores hash plus baseline 10/10", async (testContext) => {
  const { fixture, state, options } = setup(testContext, "live-success");
  const execute = { ...options, execute: true, authorize: () => true };
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  const promoted = await runLiveProfilePhotoPromotion({
    ...execute,
    now: sequenceClock(["2026-08-01T01:00:00.000Z", "2026-08-01T01:08:00.000Z"]),
  });
  assert.equal(promoted.profile_reads_passed, 10);
  assert.equal(promoted.candidate_generation_retained, true);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, state.candidateGenerationRef);
  const journal = readProfileMediaJournal(validateProfilePhotoSafeRoot(fixture.root, { testOnly: true }).journalPath);
  assert.equal(journal.events.length, 1);

  const rolledBack = await runLiveProfilePhotoRollback({
    ...execute,
    now: sequenceClock([
      "2026-08-01T02:00:00.000Z", "2026-08-01T02:02:00.000Z",
      "2026-08-01T02:03:00.000Z", "2026-08-01T02:04:00.000Z",
    ]),
  });
  assert.equal(rolledBack.profile_reads_passed, 10);
  assert.equal(rolledBack.exact_hash_match, true);
  assert.equal(rolledBack.rollback_seconds, 240);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  assert.equal(existsSync(paths.candidateGeneration), false);
  assert.equal(existsSync(paths.operationRecord), false);
});

test("failed TEST_ONLY candidate smoke restores and re-smokes exact baseline before cleanup", async (testContext) => {
  const { fixture, state, options } = setup(testContext, "live-smoke-fail");
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  const underlying = options.readProfile;
  let reads = 0;
  await assert.rejects(runLiveProfilePhotoPromotion({
    ...options,
    execute: true,
    authorize: () => true,
    readProfile(ref) {
      reads += 1;
      const response = underlying(ref);
      if (reads === 1) response.status = 503;
      return response;
    },
    now: sequenceClock(["2026-08-01T03:00:00.000Z"]),
  }), (error) => error.code === "PROFILE_API_COHORT_FAILED");
  assert.equal(reads, 11);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  inspectProfilePhotoDirectory(resolveActiveGeneration(fixture.root).directory, { expectedManifest: state.baselineManifest });
  assert.equal(existsSync(paths.candidateGeneration), false);
});
