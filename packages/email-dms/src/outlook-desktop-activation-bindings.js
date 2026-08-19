import { outlookDesktopPublicKeyFingerprint } from "./outlook-desktop-installation-proof.js";
import { OUTLOOK_DESKTOP_FINAL_ARTIFACT_MAX_BYTES } from "./outlook-desktop-release-artifact-authority.js";
import { OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES } from "./outlook-desktop-release-artifact-snapshot.js";
import {
  outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease,
  outlookDesktopActivationLocalMeasurementEvidenceSha256,
} from "./outlook-desktop-activation-local-measurement.js";
import {
  assertExactKeys,
  assertFalseAttestations,
  fail,
  canonicalBytes,
  parseTime,
  pureObject,
  sha256,
} from "./outlook-desktop-activation-primitives.js";
import {
  ACTIVATION_ID,
  BINDING_KEYS,
  DEVICE_KEYS,
  ENTRA_TENANT,
  IDENTIFIER,
  OUTLOOK_DESKTOP_ACTIVATION_MODE,
  POLICY_KEYS,
  PRINCIPAL_KEYS,
  RELEASE_KEYS,
  SHA1,
  SHA256,
  TEAM_ID,
  VERSION,
} from "./outlook-desktop-activation-schema.js";

export function validatePrincipal(value) {
  assertExactKeys(
    value,
    PRINCIPAL_KEYS,
    "OUTLOOK_ACTIVATION_PRINCIPAL_INVALID",
    "authenticated principal",
  );
  if (!IDENTIFIER.test(value.lawos_tenant_id)
      || !IDENTIFIER.test(value.lawos_user_id)
      || !ENTRA_TENANT.test(value.entra_tenant_id)
      || !IDENTIFIER.test(value.entra_subject)
      || value.lawos_tenant_id === value.entra_tenant_id) {
    fail(
      "OUTLOOK_ACTIVATION_PRINCIPAL_INVALID",
      "authenticated tenant, user, or Entra subject binding is invalid",
    );
  }
  return pureObject(value);
}

export function validateDevice(value) {
  assertExactKeys(
    value,
    DEVICE_KEYS,
    "OUTLOOK_ACTIVATION_DEVICE_KEY_INVALID",
    "candidate device",
  );
  if (!SHA256.test(value.continuity_key_fingerprint_sha256)) {
    fail("OUTLOOK_ACTIVATION_DEVICE_FINGERPRINT_MISMATCH", "candidate device fingerprint is invalid");
  }
  let fingerprint;
  try {
    fingerprint = outlookDesktopPublicKeyFingerprint(value.continuity_public_key_spki);
  } catch {
    fail(
      "OUTLOOK_ACTIVATION_DEVICE_KEY_INVALID",
      "candidate continuity key must be canonical Ed25519 SPKI bytes",
    );
  }
  if (fingerprint !== value.continuity_key_fingerprint_sha256) {
    fail(
      "OUTLOOK_ACTIVATION_DEVICE_FINGERPRINT_MISMATCH",
      "candidate continuity key fingerprint does not match its SPKI bytes",
    );
  }
  return pureObject(value);
}

export function validatePolicy(value) {
  assertExactKeys(value, POLICY_KEYS, "OUTLOOK_ACTIVATION_POLICY_INVALID", "pilot policy");
  if (value.pilot_id !== "jwsuh_canary"
      || !IDENTIFIER.test(value.policy_revision)
      || !SHA256.test(value.roster_sha256)
      || !IDENTIFIER.test(value.owner_principal_id)) {
    fail(
      "OUTLOOK_ACTIVATION_POLICY_INVALID",
      "jwsuh_canary policy revision, roster, or owner binding is invalid",
    );
  }
  return pureObject(value);
}

export function validateApprovedRelease(value, now) {
  assertExactKeys(
    value,
    RELEASE_KEYS,
    "OUTLOOK_ACTIVATION_RELEASE_INVALID",
    "approved release",
  );
  const stringFields = RELEASE_KEYS.filter((field) => ![
    "measured_inner_artifact_bytes", "registered_final_artifact_bytes",
    "trust_registry_serial", "valid",
  ].includes(field));
  if (stringFields.some((field) => typeof value[field] !== "string")
      || value.valid !== true
      || !Number.isSafeInteger(value.measured_inner_artifact_bytes)
      || value.measured_inner_artifact_bytes < 1
      || value.measured_inner_artifact_bytes > OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES
      || !Number.isSafeInteger(value.registered_final_artifact_bytes)
      || value.registered_final_artifact_bytes < 1
      || value.registered_final_artifact_bytes > OUTLOOK_DESKTOP_FINAL_ARTIFACT_MAX_BYTES
      || !Number.isSafeInteger(value.trust_registry_serial)
      || value.trust_registry_serial < 1
      || value.platform !== "darwin"
      || value.arch !== "arm64"
      || value.channel !== "formal"
      || value.app_id !== "com.amic.matter.desktop"
      || !VERSION.test(value.app_version)
      || !IDENTIFIER.test(value.tenant_id)
      || !IDENTIFIER.test(value.release_artifact_id)
      || !IDENTIFIER.test(value.release_ticket_id)
      || !TEAM_ID.test(value.macos_team_id)
      || !SHA1.test(value.source_sha)
      || !SHA1.test(value.source_tree)) {
    fail(
      "OUTLOOK_ACTIVATION_RELEASE_INVALID",
      "approved release must be an exact darwin arm64 formal artifact binding",
    );
  }
  for (const field of [
    "approval_sha256", "embedded_build_manifest_sha256",
    "macos_code_directory_sha256", "macos_designated_requirement_sha256",
    "macos_technical_evidence_sha256", "measured_inner_artifact_sha256",
    "registered_final_artifact_sha256", "release_ticket_sha256",
    "release_ticket_signature_sha256", "trust_registry_sha256",
  ]) {
    if (!SHA256.test(value[field])) {
      fail(
        "OUTLOOK_ACTIVATION_RELEASE_INVALID",
        `approved release ${field} is not an exact SHA-256`,
      );
    }
  }
  const validUntil = parseTime(
    value.valid_until,
    "OUTLOOK_ACTIVATION_RELEASE_INVALID",
    "approved_release.valid_until",
  );
  if (validUntil <= now) {
    fail("OUTLOOK_ACTIVATION_RELEASE_INVALID", "approved release is not valid at the server clock");
  }
  return { validUntil, value: pureObject(value) };
}

export function makeBindings({
  activationId,
  approvedRelease,
  candidateDevice,
  pilotPolicy,
  principal,
}) {
  const localMeasurementEvidence =
    outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(approvedRelease);
  return pureObject({
    activation_id: activationId,
    activation_mode: OUTLOOK_DESKTOP_ACTIVATION_MODE,
    approved_release: approvedRelease,
    authenticated_principal: principal,
    candidate_device: candidateDevice,
    hardware_key_attested: false,
    local_measurement_evidence_sha256:
      outlookDesktopActivationLocalMeasurementEvidenceSha256(localMeasurementEvidence),
    mdm_attested: false,
    pilot_policy: pilotPolicy,
    remote_app_attested: false,
  });
}

export function bindingDigest(challengeNonceSha256, bindings) {
  return sha256(canonicalBytes({ challenge_nonce_sha256: challengeNonceSha256, ...bindings }));
}

export function validateBindings(value, now) {
  assertExactKeys(
    value,
    BINDING_KEYS,
    "OUTLOOK_ACTIVATION_OPERATOR_BINDING_MISMATCH",
    "operator receipt bindings",
  );
  if (value.activation_mode !== OUTLOOK_DESKTOP_ACTIVATION_MODE) {
    fail(
      "OUTLOOK_ACTIVATION_MODE_UNSUPPORTED",
      "activation mode is unsupported by this operator-controlled contract",
    );
  }
  if (!ACTIVATION_ID.test(value.activation_id)) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_BINDING_MISMATCH",
      "operator receipt activation id is invalid",
    );
  }
  assertFalseAttestations(value);
  const bindings = makeBindings({
    activationId: value.activation_id,
    approvedRelease: validateApprovedRelease(value.approved_release, now).value,
    candidateDevice: validateDevice(value.candidate_device),
    pilotPolicy: validatePolicy(value.pilot_policy),
    principal: validatePrincipal(value.authenticated_principal),
  });
  if (value.local_measurement_evidence_sha256
      !== bindings.local_measurement_evidence_sha256) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_BINDING_MISMATCH",
      "operator receipt local measurement does not match the approved release",
    );
  }
  return bindings;
}
