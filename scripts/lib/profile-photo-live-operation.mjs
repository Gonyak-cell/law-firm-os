import { runTenProfileApiRead } from "./profile-media-api-smoke.mjs";
import { createDesktopMarkerAdapter, privateDesktopStateFingerprint } from "./profile-media-desktop-state.mjs";
import { evidenceFail } from "./profile-media-evidence-shared.mjs";
import {
  PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
  appendProfileMediaJournalEvent,
} from "./profile-media-measurement.mjs";
import { validateProfilePhotoSafeRoot } from "./profile-photo-operation-root.mjs";
import {
  cleanupRolledBackProfilePhotoChange,
  promoteProfilePhotoChange,
  readPreparedProfilePhotoChange,
  rollbackProfilePhotoChange,
} from "./profile-photo-server-operation.mjs";
import { verifyProfilePhotoManifest } from "../validate-profile-photo-replacement-manifest.mjs";

function instant(now, label) {
  const value = now();
  if (!(value instanceof Date) || !Number.isFinite(value.valueOf())) evidenceFail("LIVE_OPERATION_CLOCK", `${label} timestamp is invalid`);
  return value;
}

async function authorize(options, action) {
  if (typeof options.authorize !== "function" || await options.authorize(action) !== true) {
    evidenceFail("LIVE_OPERATION_AUTHORITY", "TEST_ONLY profile-photo operation is not authorized");
  }
}

function smoke(readProfile, state, phase) {
  return runTenProfileApiRead(phase === "candidate" ? {
    readProfile,
    expectedManifest: state.candidateManifest,
    expectedGenerationRef: state.candidateGenerationRef,
  } : {
    readProfile,
    expectedManifest: state.baselineManifest,
    expectedGenerationRef: state.baselineGenerationRef,
  });
}

async function baselineRecovery(options, state) {
  rollbackProfilePhotoChange({ ...options, execute: true });
  verifyProfilePhotoManifest({ directory: state.baselineDirectory, manifestPath: state.baselineManifestPath });
  await smoke(options.readProfile, state, "baseline");
  cleanupRolledBackProfilePhotoChange({ ...options, execute: true });
}

export async function runLiveProfilePhotoPromotion(options = {}) {
  promoteProfilePhotoChange({ ...options, execute: false });
  if (options.execute !== true) return liveResult("promote", "DRY_RUN", false);
  await authorize(options, "promote");
  if (typeof options.desktopMarkerPath !== "string") evidenceFail("DESKTOP_STATE_ADAPTER_REQUIRED", "TEST_ONLY desktop marker is required");
  const safeRoot = validateProfilePhotoSafeRoot(options.root, { testOnly: options.testOnly === true });
  const state = readPreparedProfilePhotoChange(options);
  const readDesktopInstallState = createDesktopMarkerAdapter(options.desktopMarkerPath);
  const now = options.now ?? (() => new Date());
  const desktopBefore = privateDesktopStateFingerprint(await readDesktopInstallState());
  const startedAt = instant(now, "promotion start");
  let promoted = false;
  try {
    promoteProfilePhotoChange({ ...options, execute: true });
    promoted = true;
    const reads = await smoke(options.readProfile, state, "candidate");
    const completedAt = instant(now, "promotion completion");
    const desktopAfter = privateDesktopStateFingerprint(await readDesktopInstallState());
    if (desktopBefore !== desktopAfter) evidenceFail("DESKTOP_REINSTALL_DETECTED", "desktop marker changed during TEST_ONLY profile-photo promotion");
    appendProfileMediaJournalEvent(safeRoot.journalPath, {
      schema_version: PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
      event_ref: options.changeRef,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      desktop_install_state_changed: false,
    });
    return Object.freeze({ ...liveResult("promote", "PASS", true), profile_reads_passed: reads.passed, candidate_generation_retained: true });
  } catch (error) {
    if (promoted) {
      try { await baselineRecovery(options, state); } catch { evidenceFail("LIVE_PROMOTION_RECOVERY_FAILED", "TEST_ONLY promotion failed and baseline recovery did not complete"); }
    }
    throw error;
  }
}

export async function runLiveProfilePhotoRollback(options = {}) {
  rollbackProfilePhotoChange({ ...options, execute: false });
  if (options.execute !== true) return liveResult("rollback", "DRY_RUN", false);
  await authorize(options, "rollback");
  if (typeof options.desktopMarkerPath !== "string") evidenceFail("DESKTOP_STATE_ADAPTER_REQUIRED", "TEST_ONLY desktop marker is required");
  validateProfilePhotoSafeRoot(options.root, { testOnly: options.testOnly === true });
  const state = readPreparedProfilePhotoChange(options);
  const readDesktopInstallState = createDesktopMarkerAdapter(options.desktopMarkerPath);
  const now = options.now ?? (() => new Date());
  const desktopBefore = privateDesktopStateFingerprint(await readDesktopInstallState());
  const startedAt = instant(now, "rollback start");
  rollbackProfilePhotoChange({ ...options, execute: true });
  instant(now, "rollback restoration");
  verifyProfilePhotoManifest({ directory: state.baselineDirectory, manifestPath: state.baselineManifestPath });
  instant(now, "rollback hash verification");
  const reads = await smoke(options.readProfile, state, "baseline");
  const completedAt = instant(now, "rollback profile smoke");
  const desktopAfter = privateDesktopStateFingerprint(await readDesktopInstallState());
  if (desktopBefore !== desktopAfter) evidenceFail("DESKTOP_REINSTALL_DETECTED", "desktop marker changed during TEST_ONLY rollback");
  cleanupRolledBackProfilePhotoChange({ ...options, execute: true });
  return Object.freeze({
    ...liveResult("rollback", "PASS", true),
    profile_reads_passed: reads.passed,
    exact_hash_match: true,
    rollback_seconds: (completedAt.valueOf() - startedAt.valueOf()) / 1000,
    candidate_generation_removed: true,
  });
}

function liveResult(mode, verdict, mutationExecuted) {
  return Object.freeze({
    runner: "profile-photo-live-operation",
    mode,
    verdict,
    environment: "TEST_ONLY",
    expected_profile_reads: 10,
    mutation_executed: mutationExecuted,
    production_capability_available: false,
    deployment_executed: false,
    desktop_reinstall_executed: false,
    private_values_emitted: false,
  });
}
