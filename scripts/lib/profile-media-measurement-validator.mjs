import { readFileSync, statSync } from "node:fs";
import {
  assertNoPrivateMaterial,
  canonicalRepoFile,
  evidenceFail,
  exactObject,
  timestampMillis,
  validateRepoFileDescriptor,
} from "./profile-media-evidence-shared.mjs";
import { describeDesktopMarker } from "./profile-media-desktop-state.mjs";
import {
  PROFILE_MEDIA_MEASUREMENT_SCHEMA,
  PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS,
  readProfileMediaJournal,
} from "./profile-media-measurement.mjs";
import { validateChangeRef, validateProfilePhotoSafeRoot } from "./profile-photo-operation-root.mjs";

const RECEIPT_PATH = /^\.omo\/evidence\/profile-media-operability-measurement-[a-f0-9]{32}\.json$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_OBSERVATION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_OBSERVATION_MS = 366 * 24 * 60 * 60 * 1000;
const READ_KEYS = [
  "expected", "passed", "http_200", "outcome_passed", "ui_state_populated", "photo_included",
  "png_decoded", "generation_match", "content_digest_match",
];

function readReceipt(repoRoot, descriptor) {
  exactObject(descriptor, ["path", "sha256", "bytes"], "measurement receipt descriptor");
  if (typeof descriptor.path !== "string" || !RECEIPT_PATH.test(descriptor.path)) {
    evidenceFail("MEASUREMENT_RECEIPT_PATH", "measurement receipt must use the canonical opaque evidence path");
  }
  validateRepoFileDescriptor(repoRoot, descriptor, descriptor.path, "measurement receipt");
  const path = canonicalRepoFile(repoRoot, descriptor.path, "measurement receipt");
  if ((statSync(path).mode & 0o077) !== 0) evidenceFail("MEASUREMENT_RECEIPT_MODE", "measurement receipt must be owner-only");
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { evidenceFail("MEASUREMENT_RECEIPT_JSON", "measurement receipt JSON is invalid"); }
}

function validateReadAggregate(value, label) {
  exactObject(value, READ_KEYS, label);
  if (READ_KEYS.some((key) => value[key] !== 10)) evidenceFail("PROFILE_READ_AGGREGATE", `${label} must be ten-of-ten in every category`);
  return Object.freeze({ ...value });
}

function validateDescriptor(value, label) {
  exactObject(value, ["sha256", "bytes"], label);
  if (!SHA256.test(value.sha256) || !Number.isInteger(value.bytes) || value.bytes <= 0) {
    evidenceFail("ARTIFACT_DESCRIPTOR_INVALID", `${label} descriptor is invalid`);
  }
}

function nearestRankP95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

export function validateTestOnlyProfileMediaMeasurementReceipt(descriptor, {
  repoRoot,
  root,
  desktopMarkerPath,
  now = new Date(),
} = {}) {
  if (!repoRoot || !root || !desktopMarkerPath) evidenceFail("TEST_ONLY_CONTEXT_REQUIRED", "TEST_ONLY validation requires independently supplied repo, root, and desktop marker paths");
  const receipt = readReceipt(repoRoot, descriptor);
  assertNoPrivateMaterial(receipt);
  exactObject(receipt, [
    "schema_version", "producer", "generated_at", "environment", "operation_ref", "source_files",
    "observation_journal", "desktop_marker", "promoted_profile_reads", "rollback", "boundary",
  ], "measurement receipt");
  if (receipt.schema_version !== PROFILE_MEDIA_MEASUREMENT_SCHEMA
    || receipt.producer !== "run-profile-media-operability-measurement" || receipt.environment !== "TEST_ONLY") {
    evidenceFail("MEASUREMENT_SCHEMA", "measurement receipt is not an explicit TEST_ONLY structural receipt");
  }
  validateChangeRef(receipt.operation_ref);
  const generated = timestampMillis(receipt.generated_at, "measurement generation");
  const age = now.valueOf() - generated;
  if (age < 0 || age > MAX_FRESHNESS_MS) evidenceFail("MEASUREMENT_STALE", "measurement receipt is future-dated or stale");

  if (!Array.isArray(receipt.source_files) || receipt.source_files.length !== PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS.length) {
    evidenceFail("MEASUREMENT_SOURCE_SET", "measurement source descriptor set is incomplete");
  }
  PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS.forEach((path, index) => {
    validateRepoFileDescriptor(repoRoot, receipt.source_files[index], path, "measurement source");
  });

  validateDescriptor(receipt.desktop_marker, "TEST_ONLY desktop marker");
  const actualMarker = describeDesktopMarker(desktopMarkerPath);
  if (actualMarker.sha256 !== receipt.desktop_marker.sha256 || actualMarker.bytes !== receipt.desktop_marker.bytes) {
    evidenceFail("DESKTOP_MARKER_BINDING_MISMATCH", "independently re-read TEST_ONLY desktop marker bytes changed");
  }
  validateDescriptor(receipt.observation_journal, "observation journal");
  const safeRoot = validateProfilePhotoSafeRoot(root, { testOnly: true, now });
  const journal = readProfileMediaJournal(safeRoot.journalPath);
  if (journal.sha256 !== receipt.observation_journal.sha256 || journal.bytes !== receipt.observation_journal.bytes) {
    evidenceFail("JOURNAL_BINDING_MISMATCH", "independently resolved operation journal changed after receipt generation");
  }

  const promotedReads = validateReadAggregate(receipt.promoted_profile_reads, "promoted profile reads");
  exactObject(receipt.rollback, [
    "started_at", "restoration_completed_at", "hash_verification_completed_at", "profile_reads_completed_at",
    "exact_hash_match", "profile_reads",
  ], "rollback measurement");
  const rollbackTimes = [
    timestampMillis(receipt.rollback.started_at, "rollback start"),
    timestampMillis(receipt.rollback.restoration_completed_at, "rollback restoration"),
    timestampMillis(receipt.rollback.hash_verification_completed_at, "rollback hash verification"),
    timestampMillis(receipt.rollback.profile_reads_completed_at, "rollback profile smoke"),
  ];
  if (rollbackTimes.some((value, index) => index > 0 && value < rollbackTimes[index - 1]) || rollbackTimes.at(-1) > generated) {
    evidenceFail("ROLLBACK_MEASUREMENT_ORDER", "rollback measurement does not include ordered restoration, hash verification, and smoke");
  }
  if (receipt.rollback.exact_hash_match !== true) evidenceFail("ROLLBACK_HASH_MISMATCH", "rollback exact hash verification did not pass");
  const rollbackReads = validateReadAggregate(receipt.rollback.profile_reads, "rollback profile reads");

  exactObject(receipt.boundary, ["dry_run", "test_only_profile_mutation_executed", "production_profile_mutation_executed", "deployment_executed"], "measurement boundary");
  if (receipt.boundary.dry_run !== false || receipt.boundary.test_only_profile_mutation_executed !== true
    || receipt.boundary.production_profile_mutation_executed !== false || receipt.boundary.deployment_executed !== false) {
    evidenceFail("MEASUREMENT_BOUNDARY", "TEST_ONLY measurement execution boundary is inconsistent");
  }

  const initialized = timestampMillis(safeRoot.metadata.initialized_at, "safe-root initialization");
  const observationMs = generated - initialized;
  if (observationMs < MIN_OBSERVATION_MS || observationMs > MAX_OBSERVATION_MS || journal.events.length === 0) {
    evidenceFail("OBSERVATION_WINDOW_INVALID", "canonical TEST_ONLY observation window is insufficient or unbounded");
  }
  if (journal.events.some((event) => event.started < initialized || event.completed > generated)) {
    evidenceFail("JOURNAL_EVENT_OUTSIDE_WINDOW", "operation journal event is outside the canonical observation window");
  }
  if (journal.events.filter((event) => event.event_ref === receipt.operation_ref).length !== 1) {
    evidenceFail("MEASUREMENT_EVENT_MISSING", "receipt operation is not bound exactly once in the observation journal");
  }

  const monthlyChanges = journal.events.length * (30 * 24 * 60 * 60 * 1000) / observationMs;
  const operatorMinutesP95 = nearestRankP95(journal.events.map((event) => (event.completed - event.started) / 60_000));
  const desktopReinstallCount = journal.events.filter((event) => event.desktop_install_state_changed).length;
  const rollbackMinutes = (rollbackTimes.at(-1) - rollbackTimes[0]) / 60_000;
  return Object.freeze({
    generated_at: receipt.generated_at,
    environment: "TEST_ONLY",
    metrics: Object.freeze({
      monthly_changes: monthlyChanges,
      operator_minutes_p95: operatorMinutesP95,
      desktop_reinstall_count: desktopReinstallCount,
      profile_api_reads: Object.freeze({ expected: promotedReads.expected, passed: promotedReads.passed }),
      rollback: Object.freeze({ minutes: rollbackMinutes, exact_hash_match: true, profile_reads_passed: rollbackReads.passed }),
    }),
  });
}
