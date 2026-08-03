import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  writeSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { runTenProfileApiRead } from "./profile-media-api-smoke.mjs";
import {
  createDesktopMarkerAdapter,
  describeDesktopMarker,
  privateDesktopStateFingerprint,
} from "./profile-media-desktop-state.mjs";
import {
  describeRepoFile,
  evidenceFail,
  exactObject,
  sha256Bytes,
  timestampMillis,
} from "./profile-media-evidence-shared.mjs";
import { writePrivateJsonExclusive } from "./profile-media-private-json.mjs";
import {
  canonicalDirectory,
  canonicalRegularFile,
  validateChangeRef,
  validateProfilePhotoSafeRoot,
} from "./profile-photo-operation-root.mjs";
import {
  cleanupRolledBackProfilePhotoChange,
  promoteProfilePhotoChange,
  readPreparedProfilePhotoChange,
  rollbackProfilePhotoChange,
} from "./profile-photo-server-operation.mjs";
import { verifyProfilePhotoManifest } from "../validate-profile-photo-replacement-manifest.mjs";

export const PROFILE_MEDIA_MEASUREMENT_SCHEMA = "law-firm-os.profile-media-operability-measurement.v3";
export const PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA = "law-firm-os.profile-media-operation-event.v2";
export const PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS = Object.freeze([
  "scripts/lib/profile-media-admin-goal.mjs",
  "scripts/lib/profile-media-api-smoke.mjs",
  "scripts/lib/profile-media-desktop-state.mjs",
  "scripts/lib/profile-media-evidence-shared.mjs",
  "scripts/lib/profile-media-measurement-validator.mjs",
  "scripts/lib/profile-media-measurement.mjs",
  "scripts/lib/profile-media-private-json.mjs",
  "scripts/lib/profile-photo-generation-pointer.mjs",
  "scripts/lib/profile-photo-operation-root.mjs",
  "scripts/lib/profile-photo-png.mjs",
  "scripts/lib/profile-photo-server-operation.mjs",
  "scripts/run-profile-media-operability-measurement.mjs",
  "scripts/validate-profile-media-operability-decision.mjs",
  "scripts/validate-profile-photo-replacement-manifest.mjs",
]);

function instant(now, label) {
  const value = now();
  if (!(value instanceof Date) || !Number.isFinite(value.valueOf())) evidenceFail("MEASUREMENT_CLOCK_INVALID", `${label} clock value is invalid`);
  return value.toISOString();
}

export function appendProfileMediaJournalEvent(journalPath, event) {
  canonicalRegularFile(journalPath, "operation journal", { ownerOnly: true });
  if (readProfileMediaJournal(journalPath).events.some((existing) => existing.event_ref === event.event_ref)) {
    evidenceFail("JOURNAL_EVENT_DUPLICATE", "operation journal already contains this event ref");
  }
  const line = Buffer.from(`${JSON.stringify(event)}\n`, "utf8");
  let descriptor;
  try {
    descriptor = openSync(journalPath, "a", 0o600);
    if (writeSync(descriptor, line, 0, line.length) !== line.length) throw new Error();
    fsyncSync(descriptor);
  } catch {
    evidenceFail("JOURNAL_APPEND_FAILED", "operation journal event could not be appended durably");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function readProfileMediaJournal(journalPath) {
  canonicalRegularFile(journalPath, "operation journal", { ownerOnly: true });
  const bytes = readFileSync(journalPath);
  const lines = bytes.toString("utf8").split("\n").filter(Boolean);
  if (lines.length > 500) evidenceFail("JOURNAL_TOO_LARGE", "operation journal exceeds the bounded event count");
  const refs = new Set();
  const events = lines.map((line) => {
    let event;
    try { event = JSON.parse(line); } catch { evidenceFail("JOURNAL_JSON_INVALID", "operation journal contains invalid JSON"); }
    exactObject(event, ["schema_version", "event_ref", "started_at", "completed_at", "desktop_install_state_changed"], "operation journal event");
    try { validateChangeRef(event.event_ref); } catch { evidenceFail("JOURNAL_EVENT_INVALID", "operation journal event ref is invalid"); }
    if (event.schema_version !== PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA || refs.has(event.event_ref)
      || typeof event.desktop_install_state_changed !== "boolean") {
      evidenceFail("JOURNAL_EVENT_INVALID", "operation journal event is invalid or duplicated");
    }
    const started = timestampMillis(event.started_at, "journal event start");
    const completed = timestampMillis(event.completed_at, "journal event completion");
    if (completed < started) evidenceFail("JOURNAL_EVENT_ORDER", "operation journal event timestamps are reversed");
    refs.add(event.event_ref);
    return Object.freeze({ ...event, started, completed });
  });
  return Object.freeze({ sha256: sha256Bytes(bytes), bytes: bytes.length, events: Object.freeze(events) });
}

function sourceDescriptors(repoRoot) {
  return Object.freeze(PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS.map((path) => describeRepoFile(repoRoot, path, "measurement source")));
}

function writeReceipt(path, receipt, repoRoot) {
  if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path) evidenceFail("MEASUREMENT_RECEIPT_PATH", "measurement receipt path must be absolute and canonical");
  const root = realpathSync(resolve(repoRoot));
  const repositoryRelative = relative(root, path);
  if (repositoryRelative === ".." || repositoryRelative.startsWith(`..${sep}`)
    || !/^\.omo\/evidence\/profile-media-operability-measurement-[a-f0-9]{32}\.json$/u.test(repositoryRelative)) {
    evidenceFail("MEASUREMENT_RECEIPT_PATH", "measurement receipt must use the canonical opaque repository evidence path");
  }
  canonicalDirectory(dirname(path), "measurement receipt parent");
  if (existsSync(path)) evidenceFail("MEASUREMENT_RECEIPT_EXISTS", "measurement receipt already exists");
  try { writePrivateJsonExclusive(path, receipt); } catch { evidenceFail("MEASUREMENT_RECEIPT_WRITE", "measurement receipt could not be written atomically"); }
}

function smokeOptions(readProfile, state, phase) {
  return phase === "candidate"
    ? { readProfile, expectedManifest: state.candidateManifest, expectedGenerationRef: state.candidateGenerationRef }
    : { readProfile, expectedManifest: state.baselineManifest, expectedGenerationRef: state.baselineGenerationRef };
}

export async function runProfileMediaOperabilityMeasurement(options = {}) {
  const now = options.now ?? (() => new Date());
  const safeRoot = validateProfilePhotoSafeRoot(options.root, { testOnly: options.testOnly === true, now: now() });
  const changeRef = validateChangeRef(options.changeRef);
  const state = readPreparedProfilePhotoChange(options);
  promoteProfilePhotoChange({ ...options, execute: false });
  if (options.execute !== true) {
    return Object.freeze({
      runner: "profile-media-operability-measurement",
      verdict: "DRY_RUN",
      environment: "TEST_ONLY",
      expected_profile_reads_per_phase: 10,
      mutation_executed: false,
      api_reads_executed: false,
      receipt_written: false,
      private_values_emitted: false,
    });
  }
  if (safeRoot.metadata.environment !== "TEST_ONLY") evidenceFail("PRODUCTION_CAPABILITY_UNAVAILABLE", "source-tree measurement cannot establish production authority");
  if (typeof options.readProfile !== "function") evidenceFail("PROFILE_ADAPTER_REQUIRED", "profile read adapter is required");
  if (typeof options.desktopMarkerPath !== "string") evidenceFail("DESKTOP_STATE_ADAPTER_REQUIRED", "canonical TEST_ONLY desktop marker path is required");
  const readDesktopInstallState = createDesktopMarkerAdapter(options.desktopMarkerPath);

  const markerDescriptor = describeDesktopMarker(options.desktopMarkerPath);
  const desktopBefore = privateDesktopStateFingerprint(await readDesktopInstallState());
  const operationStartedAt = instant(now, "operation start");
  let promoted = false;
  let rolledBack = false;
  try {
    promoteProfilePhotoChange({ ...options, execute: true });
    promoted = true;
    const promotedReads = await runTenProfileApiRead(smokeOptions(options.readProfile, state, "candidate"));
    const operationCompletedAt = instant(now, "operation completion");
    const rollbackStartedAt = instant(now, "rollback start");
    rollbackProfilePhotoChange({ ...options, execute: true });
    rolledBack = true;
    const restorationCompletedAt = instant(now, "rollback restoration");
    verifyProfilePhotoManifest({ directory: state.baselineDirectory, manifestPath: state.baselineManifestPath });
    const hashVerificationCompletedAt = instant(now, "rollback hash verification");
    const rollbackReads = await runTenProfileApiRead(smokeOptions(options.readProfile, state, "baseline"));
    const profileReadsCompletedAt = instant(now, "rollback profile smoke");
    const desktopAfter = privateDesktopStateFingerprint(await readDesktopInstallState());
    const markerAfter = describeDesktopMarker(options.desktopMarkerPath);
    if (markerAfter.sha256 !== markerDescriptor.sha256 || markerAfter.bytes !== markerDescriptor.bytes || desktopBefore !== desktopAfter) {
      evidenceFail("DESKTOP_REINSTALL_DETECTED", "TEST_ONLY desktop marker changed during measurement");
    }
    const event = Object.freeze({
      schema_version: PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
      event_ref: changeRef,
      started_at: operationStartedAt,
      completed_at: operationCompletedAt,
      desktop_install_state_changed: false,
    });
    cleanupRolledBackProfilePhotoChange({ ...options, execute: true });
    appendProfileMediaJournalEvent(safeRoot.journalPath, event);
    const journal = readProfileMediaJournal(safeRoot.journalPath);
    const generatedAt = instant(now, "receipt generation");
    const receipt = Object.freeze({
      schema_version: PROFILE_MEDIA_MEASUREMENT_SCHEMA,
      producer: "run-profile-media-operability-measurement",
      generated_at: generatedAt,
      environment: "TEST_ONLY",
      operation_ref: changeRef,
      source_files: sourceDescriptors(options.repoRoot ?? process.cwd()),
      observation_journal: Object.freeze({ sha256: journal.sha256, bytes: journal.bytes }),
      desktop_marker: markerDescriptor,
      promoted_profile_reads: promotedReads,
      rollback: Object.freeze({
        started_at: rollbackStartedAt,
        restoration_completed_at: restorationCompletedAt,
        hash_verification_completed_at: hashVerificationCompletedAt,
        profile_reads_completed_at: profileReadsCompletedAt,
        exact_hash_match: true,
        profile_reads: rollbackReads,
      }),
      boundary: Object.freeze({
        dry_run: false,
        test_only_profile_mutation_executed: true,
        production_profile_mutation_executed: false,
        deployment_executed: false,
      }),
    });
    writeReceipt(options.receiptPath, receipt, options.repoRoot ?? process.cwd());
    return Object.freeze({
      runner: "profile-media-operability-measurement",
      verdict: "PASS",
      environment: "TEST_ONLY",
      expected_profile_reads_per_phase: 10,
      promoted_profile_reads_passed: promotedReads.passed,
      rollback_profile_reads_passed: rollbackReads.passed,
      rollback_includes_restoration_hash_and_smoke: true,
      mutation_executed: true,
      receipt_written: true,
      private_values_emitted: false,
    });
  } catch (error) {
    if (promoted && !rolledBack) {
      try {
        rollbackProfilePhotoChange({ ...options, execute: true });
        verifyProfilePhotoManifest({ directory: state.baselineDirectory, manifestPath: state.baselineManifestPath });
        await runTenProfileApiRead(smokeOptions(options.readProfile, state, "baseline"));
      } catch {
        evidenceFail("MEASUREMENT_EMERGENCY_ROLLBACK_FAILED", "measurement failed and emergency rollback did not complete");
      }
    }
    throw error;
  }
}
