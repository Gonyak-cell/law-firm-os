import { OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES } from "./outlook-desktop-release-artifact-snapshot.js";
import {
  assertExactKeys,
  canonicalBytes,
  deepFreeze,
  fail,
  isRecord,
  pureObject,
  sha256,
} from "./outlook-desktop-activation-primitives.js";
import {
  SHA1,
  SHA256,
  VERSION,
} from "./outlook-desktop-activation-schema.js";

export const OUTLOOK_DESKTOP_LOCAL_MEASUREMENT_EVIDENCE_DOMAIN =
  "lawos.outlook-desktop-local-measurement-evidence.v1";

const LOCAL_MEASUREMENT_EVIDENCE_KEYS = Object.freeze([
  "arch", "build_manifest_sha256", "inner_artifact_bytes",
  "inner_artifact_sha256", "platform", "release_ticket_sha256",
  "release_ticket_signature_sha256", "source_sha", "source_tree", "version",
]);

export function normalizeOutlookDesktopActivationLocalMeasurementEvidence(value) {
  if (!isRecord(value)) {
    fail(
      "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID",
      "local measurement evidence must be a plain object with a closed schema",
    );
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  assertExactKeys(
    descriptors,
    LOCAL_MEASUREMENT_EVIDENCE_KEYS,
    "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID",
    "local measurement evidence",
  );
  const entries = LOCAL_MEASUREMENT_EVIDENCE_KEYS.map((key) => {
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, "value")) {
      fail(
        "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID",
        "local measurement evidence cannot contain accessor properties",
      );
    }
    return [key, descriptor.value];
  });
  const snapshot = Object.fromEntries(entries);
  const {
    arch,
    build_manifest_sha256,
    inner_artifact_bytes,
    inner_artifact_sha256,
    platform,
    release_ticket_sha256,
    release_ticket_signature_sha256,
    source_sha,
    source_tree,
    version,
  } = snapshot;
  if (!Number.isSafeInteger(inner_artifact_bytes)
      || inner_artifact_bytes < 1
      || inner_artifact_bytes > OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES
      || typeof inner_artifact_sha256 !== "string"
      || !SHA256.test(inner_artifact_sha256)
      || typeof build_manifest_sha256 !== "string"
      || !SHA256.test(build_manifest_sha256)
      || typeof platform !== "string"
      || platform !== "darwin"
      || typeof arch !== "string"
      || arch !== "arm64"
      || typeof version !== "string"
      || !VERSION.test(version)
      || typeof source_sha !== "string"
      || !SHA1.test(source_sha)
      || typeof source_tree !== "string"
      || !SHA1.test(source_tree)
      || typeof release_ticket_sha256 !== "string"
      || !SHA256.test(release_ticket_sha256)
      || typeof release_ticket_signature_sha256 !== "string"
      || !SHA256.test(release_ticket_signature_sha256)) {
    fail(
      "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID",
      "local measurement evidence does not match the exact darwin arm64 release identity",
    );
  }
  return deepFreeze(pureObject(snapshot));
}

export function outlookDesktopActivationLocalMeasurementEvidenceSha256(value) {
  return sha256(canonicalBytes({
    domain: OUTLOOK_DESKTOP_LOCAL_MEASUREMENT_EVIDENCE_DOMAIN,
    local_measurement_evidence:
      normalizeOutlookDesktopActivationLocalMeasurementEvidence(value),
  }));
}

export function outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(
  approvedRelease,
) {
  if (!isRecord(approvedRelease)) {
    fail(
      "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID",
      "approved release is required for local measurement evidence",
    );
  }
  return normalizeOutlookDesktopActivationLocalMeasurementEvidence({
    arch: approvedRelease.arch,
    build_manifest_sha256: approvedRelease.embedded_build_manifest_sha256,
    inner_artifact_bytes: approvedRelease.measured_inner_artifact_bytes,
    inner_artifact_sha256: approvedRelease.measured_inner_artifact_sha256,
    platform: approvedRelease.platform,
    release_ticket_sha256: approvedRelease.release_ticket_sha256,
    release_ticket_signature_sha256: approvedRelease.release_ticket_signature_sha256,
    source_sha: approvedRelease.source_sha,
    source_tree: approvedRelease.source_tree,
    version: approvedRelease.app_version,
  });
}
