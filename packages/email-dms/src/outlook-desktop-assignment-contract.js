import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const OUTLOOK_DESKTOP_ASSIGNMENT_SCHEMA_VERSION =
  "lawos.outlook-desktop-assignment.v1";
export const OUTLOOK_DESKTOP_ASSIGNMENT_STATUSES = Object.freeze([
  "pending",
  "leased",
  "retry",
  "ambiguous",
  "completed",
  "superseded",
  "dead_letter",
]);
export const OUTLOOK_DESKTOP_ASSIGNMENT_REMOTE_COMMIT_STATES = Object.freeze([
  "not_sent",
  "unknown",
  "confirmed",
  "reconciled",
]);

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const ACTIVATION_REFERENCE = /^oda_[A-Za-z0-9_-]{24}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const ACTIVATION_ISSUE_REQUEST_ID = /^oar_[A-Za-z0-9_-]{20,128}$/u;
const ACTIVATION_REGISTRATION_EVENT_ID = /^oae_[a-f0-9]{32}$/u;
const LIFECYCLE_CHALLENGE_ID = /^olc_[a-f0-9]{32}$/u;
const RETIRE_INTENT_ID = /^ori_[a-f0-9]{32}$/u;
const NONCE_BASE64URL = /^[A-Za-z0-9_-]{43}$/u;
const PAYLOAD_KEYS = Object.freeze([
  "action",
  "desired_assigned",
  "entra_subject_id",
  "operation_id",
  "provider_generation",
  "provider_intent_sha256",
  "schema_version",
  "tenant_id",
  "user_id",
]);

export function assignmentInvalid(field) {
  throw new TypeError(`outlook assignment ${field} is invalid`);
}

export function assignmentRecord(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    assignmentInvalid(field);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    assignmentInvalid(field);
  }
  return value;
}

export function assignmentExactKeys(value, keys, field) {
  assignmentRecord(value, field);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    assignmentInvalid(field);
  }
}

export function assignmentIdentifier(value, field) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    assignmentInvalid(field);
  }
  return value;
}

export function assignmentDigest(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    assignmentInvalid(field);
  }
  return value;
}

export function assignmentInteger(value, field, { allowZero = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    assignmentInvalid(field);
  }
  return value;
}

export function assignmentBoolean(value, field) {
  if (typeof value !== "boolean") assignmentInvalid(field);
  return value;
}

export function assignmentIso(value, field) {
  if (typeof value !== "string") assignmentInvalid(field);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    assignmentInvalid(field);
  }
  return value;
}

function assignmentNullable(value, validate, field) {
  return value === null ? null : validate(value, field);
}

function assignmentString(value, field, { maxLength = 65_536 } = {}) {
  if (typeof value !== "string" || value.length < 1
      || Buffer.byteLength(value, "utf8") > maxLength) {
    assignmentInvalid(field);
  }
  return value;
}

function withAssignmentBase64Bytes(
  value,
  field,
  { byteLength, maxBytes } = {},
  use,
) {
  assignmentString(value, field, { maxLength: 131_072 });
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) assignmentInvalid(field);
  const bytes = Buffer.from(value, "base64");
  try {
    if (bytes.toString("base64") !== value
        || (byteLength !== undefined && bytes.length !== byteLength)
        || (maxBytes !== undefined
          && (bytes.length < 1 || bytes.length > maxBytes))) {
      assignmentInvalid(field);
    }
    return use(bytes);
  } finally {
    bytes.fill(0);
  }
}

function assignmentBase64(value, field, options = {}) {
  return withAssignmentBase64Bytes(value, field, options, () => value);
}

function activationReference(value, field = "activation_reference") {
  if (typeof value !== "string" || !ACTIVATION_REFERENCE.test(value)) {
    assignmentInvalid(field);
  }
  return value;
}

function installationId(value, field = "installation_id") {
  if (typeof value !== "string" || !INSTALLATION_ID.test(value)) {
    assignmentInvalid(field);
  }
  return value;
}

function activationIssueRequestId(value, field = "issue_request_id") {
  if (typeof value !== "string" || !ACTIVATION_ISSUE_REQUEST_ID.test(value)) {
    assignmentInvalid(field);
  }
  return value;
}

function activationRegistrationEventId(value, field = "registration_event_id") {
  if (typeof value !== "string" || !ACTIVATION_REGISTRATION_EVENT_ID.test(value)) {
    assignmentInvalid(field);
  }
  return value;
}

export const OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_RECEIPT_KEYS = Object.freeze([
  "activation_reference", "challenge_nonce_sha256", "installation_id",
  "issue_request_id", "issued_at", "issued_challenge", "issued_challenge_base64",
  "issued_challenge_sha256", "outcome", "registration_event_id",
  "release_artifact_id", "release_authority_sha256", "tenant_id",
  "valid_until",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_REQUEST_KEYS = Object.freeze([
  "issue_request_id", "issued_challenge", "issued_challenge_base64",
  "issued_challenge_sha256", "release_ticket_base64",
  "release_ticket_signature_base64",
]);
const ACTIVATION_CHALLENGE_KEYS = Object.freeze([
  "activation_binding_sha256", "activation_id", "activation_mode",
  "approved_release", "authenticated_principal", "candidate_device",
  "challenge_nonce_base64url", "challenge_nonce_sha256", "expires_at",
  "hardware_key_attested", "issued_at", "local_measurement_evidence_sha256",
  "mdm_attested", "pilot_policy", "remote_app_attested", "schema_version",
]);
const TASK15_ACTIVATION_PRINCIPAL_KEYS = Object.freeze([
  "entra_subject", "entra_tenant_id", "lawos_tenant_id", "lawos_user_id",
]);
const TASK15_ACTIVATION_DEVICE_KEYS = Object.freeze([
  "continuity_key_fingerprint_sha256", "continuity_public_key_spki",
]);
const TASK15_ACTIVATION_POLICY_KEYS = Object.freeze([
  "owner_principal_id", "pilot_id", "policy_revision", "roster_sha256",
]);
const TASK15_ACTIVATION_RELEASE_KEYS = Object.freeze([
  "app_id", "app_version", "approval_sha256", "arch", "channel",
  "embedded_build_manifest_sha256", "macos_code_directory_sha256",
  "macos_designated_requirement_sha256", "macos_team_id",
  "macos_technical_evidence_sha256", "measured_inner_artifact_bytes",
  "measured_inner_artifact_sha256", "platform", "registered_final_artifact_bytes",
  "registered_final_artifact_sha256", "release_artifact_id", "release_ticket_id",
  "release_ticket_sha256", "release_ticket_signature_sha256", "source_sha",
  "source_tree", "tenant_id", "trust_registry_serial", "trust_registry_sha256",
  "valid", "valid_until",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_RECEIPT_KEYS = Object.freeze([
  "activation_receipt_sha256", "activation_reference", "attached_at",
  "installation_id", "issued_challenge_sha256",
  "local_measurement_evidence_sha256", "status", "tenant_id", "valid_until",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_REQUEST_KEYS = Object.freeze([
  "activation_reference", "activation_replay_identity", "installation_id",
  "issued_challenge_sha256",
  "local_measurement_evidence_sha256", "operator_receipt_base64",
  "operator_receipt_sha256", "operator_signature_base64",
  "operator_signature_sha256", "request_id",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_OPERATOR_PACKET_EVIDENCE_KEYS =
  Object.freeze([
    "activation_reference", "authenticated_principal",
    "local_measurement_evidence_sha256", "operator_receipt_bytes",
    "operator_receipt_signature_bytes", "owner_operator_packet_sha256",
    "request_id",
  ]);
export const OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_ATTACHMENT_INPUT_KEYS =
  Object.freeze(["core_request", "operator_packet_evidence"]);
export const OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_ATTACHMENT_RESULT_KEYS =
  Object.freeze([
    "core_result", "evidence_receipt_sha256",
    "owner_operator_packet_sha256",
  ]);
export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORIZATION_RECEIPT_KEYS = Object.freeze([
  "activation_authorization_receipt_sha256", "activation_receipt_sha256",
  "activation_reference", "authorization_binding_sha256", "authorized_at",
  "installation_id", "outcome", "release_artifact_id",
  "release_authority_sha256", "tenant_id", "valid_until",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORIZATION_REQUEST_KEYS = Object.freeze([
  "activation_reference", "challenge_nonce_sha256", "device_command_sha256",
  "device_key_fingerprint", "device_proof_transcript_sha256",
  "device_public_key_spki_sha256", "device_signature_sha256",
  "entra_subject_id", "event_id", "evidence_binding_sha256",
  "idempotency_key", "installation_id", "issued_challenge_sha256",
  "proof_expires_at", "proof_id", "proof_issued_at", "request_fingerprint",
  "request_id", "user_id",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_RESERVATION_KEYS = Object.freeze([
  "activation_authorization_receipt_sha256", "activation_receipt_sha256",
  "activation_reference", "activation_replay_identity",
  "attached_at", "attachment_request_sha256", "attachment_response_text",
  "authorization_binding_sha256", "authorization_request_sha256",
  "authorization_response_text", "authorized_at", "challenge_nonce_base64url",
  "challenge_nonce_sha256", "consumed_at", "device_command_sha256",
  "device_key_fingerprint", "device_proof_transcript_sha256",
  "device_public_key_spki_sha256", "device_signature_sha256",
  "entra_subject_id", "event_id", "evidence_binding_sha256",
  "evidence_receipt_sha256", "idempotency_key", "installation_id",
  "issue_public_response_base64", "issue_request_id", "issue_request_sha256",
  "issue_response_text", "issued_at",
  "issued_challenge", "issued_challenge_base64", "issued_challenge_sha256",
  "lifecycle_registration_consumption", "local_measurement_evidence_sha256",
  "operator_receipt_base64",
  "operator_receipt_sha256", "operator_signature_base64",
  "operator_signature_sha256", "owner_operator_packet_sha256",
  "proof_expires_at", "proof_id",
  "proof_issued_at", "registration_event_id", "release_artifact_id",
  "release_authority_sha256",
  "release_ticket_base64", "release_ticket_bytes_sha256",
  "release_ticket_owner_signature_sha256", "release_ticket_signature_base64",
  "request_fingerprint", "request_id", "schema_version", "state", "tenant_id",
  "user_id", "valid_until",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PENDING_KEYS = Object.freeze([
  "activation_reference", "installation_id", "status", "valid_until",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_READY_KEYS = Object.freeze([
  "activation_receipt_sha256", "activation_reference", "event_id",
  "installation_id", "issued_challenge_sha256", "local_measurement_evidence_sha256",
  "release_authority_sha256", "status", "valid_until",
]);
export const OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_RECEIPT_KEYS = Object.freeze([
  "challenge_nonce_base64url", "challenge_nonce_sha256",
  "device_key_fingerprint", "entra_subject_id", "event_id",
  "expected_state_version", "idempotency_key", "installation_id", "issued_at",
  "issued_challenge", "issued_challenge_base64", "issued_challenge_sha256",
  "lifecycle_challenge_id", "operation", "outcome",
  "release_authority_sha256", "request_id", "retire_intent_id",
  "schema_version", "tenant_id", "user_id", "valid_until",
]);
export const OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_REQUEST_KEYS = Object.freeze([
  "device_key_fingerprint", "entra_subject_id", "event_id",
  "expected_state_version", "idempotency_key", "installation_id", "operation",
  "request_id", "user_id",
]);
export const OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REQUEST_KEYS = Object.freeze([
  "activation_authorization_id", "device_key_fingerprint",
  "device_public_key_spki_sha256", "device_signature_sha256",
  "entra_subject_id", "event_id", "expected_state_version",
  "idempotency_key", "installation_id", "issued_challenge_sha256",
  "lifecycle_authorization_id", "lifecycle_challenge_id", "nonce_hash",
  "operation", "proof_expires_at", "proof_issued_at", "proof_receipt_sha256",
  "proof_transcript_sha256", "release_authority_sha256", "request_fingerprint",
  "request_id", "retire_intent_id", "user_id",
]);
export const OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_RECEIPT_KEYS = Object.freeze([
  "authorization_binding_sha256", "authorized_at",
  "lifecycle_authorization_id", "outcome", "tenant_id", "valid_until",
]);
const LIFECYCLE_CHALLENGE_KEYS = Object.freeze([
  "challenge_nonce_base64url", "challenge_nonce_sha256",
  "device_key_fingerprint", "entra_subject_id", "event_id",
  "expected_state_version", "idempotency_key", "installation_id", "issued_at",
  "lifecycle_challenge_id", "operation", "release_authority_sha256",
  "request_id", "retire_intent_id", "schema_version", "tenant_id", "user_id",
  "valid_until",
]);
const LIFECYCLE_REGISTRATION_CONSUMPTION_KEYS = Object.freeze([
  "activation_reference", "consumed_at", "installation_id",
  "lifecycle_authorization_id", "resulting_state_version",
]);
const ACTIVATION_REPLAY_IDENTITY_KEYS = Object.freeze([
  "activation_binding_sha256", "activation_id", "challenge_nonce_sha256",
  "replay_identity_sha256",
]);

export const OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLICATION_REQUEST_KEYS =
  Object.freeze([
    "macos_code_directory_sha256", "macos_designated_requirement_sha256",
    "pilot_policy", "release_artifact_id", "release_ticket_base64",
    "release_ticket_signature_base64", "request_id",
  ]);
export const OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLICATION_RECEIPT_KEYS =
  Object.freeze([
    "authority_binding_sha256", "outcome", "published_at",
    "release_artifact_id", "release_authority_sha256", "request_id",
    "tenant_id", "valid_until",
  ]);
export const OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_LOAD_REQUEST_KEYS =
  Object.freeze([
    "authenticated_principal", "candidate_device", "issue_request_id",
    "request_fingerprint_sha256",
  ]);
const ACTIVATION_ISSUE_AUTHORITY_READY_ROW_KEYS = Object.freeze([
  "approved_release", "authority_binding_sha256", "outcome", "pilot_policy",
  "release_artifact_id", "release_authority_sha256", "release_ticket_base64",
  "release_ticket_bytes_sha256", "release_ticket_owner_signature_sha256",
  "release_ticket_signature_base64", "request_fingerprint_sha256",
  "schema_version", "tenant_id", "valid_until",
]);
const ACTIVATION_ISSUE_AUTHORITY_REPLAY_ROW_KEYS = Object.freeze([
  "outcome", "request_fingerprint_sha256", "response_base64",
]);
export const OUTLOOK_DESKTOP_ACTIVATION_ISSUE_PUBLIC_RESPONSE_KEYS = Object.freeze([
  "activation_reference", "installation_id", "issue_request_id",
  "issued_challenge", "issued_challenge_sha256", "registration_event_id",
  "release_authority", "schema_version",
]);
const ACTIVATION_ISSUE_PUBLIC_RELEASE_AUTHORITY_KEYS = Object.freeze([
  "authority_binding_sha256", "release_artifact_id", "release_authority_sha256",
  "release_ticket_bytes_sha256", "release_ticket_owner_signature_sha256",
  "valid_until",
]);
const ACTIVATION_EVIDENCE_BINDING_KEYS = Object.freeze([
  "activation_reference", "device_command_sha256",
  "device_proof_transcript_sha256", "device_signature_sha256",
  "installation_id", "issued_challenge_sha256",
  "local_measurement_evidence_sha256", "operator_receipt_sha256",
  "operator_signature_sha256", "release_authority_sha256", "tenant_id",
]);

function normalizeActivationReplayIdentity(value) {
  assignmentExactKeys(
    value,
    ACTIVATION_REPLAY_IDENTITY_KEYS,
    "activation replay identity",
  );
  return Object.freeze({
    activation_binding_sha256: assignmentDigest(
      value.activation_binding_sha256,
      "activation_binding_sha256",
    ),
    activation_id: activationReference(value.activation_id),
    challenge_nonce_sha256: assignmentDigest(
      value.challenge_nonce_sha256,
      "challenge_nonce_sha256",
    ),
    replay_identity_sha256: assignmentDigest(
      value.replay_identity_sha256,
      "replay_identity_sha256",
    ),
  });
}

function normalizeLifecycleRegistrationConsumption(value) {
  assignmentExactKeys(
    value,
    LIFECYCLE_REGISTRATION_CONSUMPTION_KEYS,
    "lifecycle registration consumption",
  );
  return Object.freeze({
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    lifecycle_authorization_id: assignmentIdentifier(
      value.lifecycle_authorization_id,
      "lifecycle_authorization_id",
    ),
    resulting_state_version: assignmentInteger(
      value.resulting_state_version,
      "resulting_state_version",
    ),
    consumed_at: assignmentIso(value.consumed_at, "consumed_at"),
  });
}

function normalizeTask15ActivationPrincipal(value) {
  assignmentExactKeys(
    value,
    TASK15_ACTIVATION_PRINCIPAL_KEYS,
    "activation principal",
  );
  return Object.freeze({
    entra_subject: assignmentIdentifier(value.entra_subject, "entra_subject"),
    entra_tenant_id: assignmentIdentifier(
      value.entra_tenant_id,
      "entra_tenant_id",
    ),
    lawos_tenant_id: assignmentIdentifier(
      value.lawos_tenant_id,
      "lawos_tenant_id",
    ),
    lawos_user_id: assignmentIdentifier(value.lawos_user_id, "lawos_user_id"),
  });
}

function normalizeTask15ActivationDevice(value) {
  assignmentExactKeys(value, TASK15_ACTIVATION_DEVICE_KEYS, "activation device");
  let actualFingerprint;
  const spki = withAssignmentBase64Bytes(
    value.continuity_public_key_spki,
    "continuity_public_key_spki",
    { byteLength: 44 },
    (bytes) => {
      actualFingerprint = createHash("sha256").update(bytes).digest("hex");
      return value.continuity_public_key_spki;
    },
  );
  const fingerprint = assignmentDigest(
    value.continuity_key_fingerprint_sha256,
    "continuity_key_fingerprint_sha256",
  );
  if (actualFingerprint !== fingerprint) assignmentInvalid("activation device");
  return Object.freeze({
    continuity_key_fingerprint_sha256: fingerprint,
    continuity_public_key_spki: spki,
  });
}

function normalizeTask15PilotPolicy(value) {
  assignmentExactKeys(value, TASK15_ACTIVATION_POLICY_KEYS, "pilot policy");
  if (value.pilot_id !== "jwsuh_canary") assignmentInvalid("pilot policy");
  return Object.freeze({
    owner_principal_id: assignmentIdentifier(
      value.owner_principal_id,
      "owner_principal_id",
    ),
    pilot_id: value.pilot_id,
    policy_revision: assignmentIdentifier(
      value.policy_revision,
      "policy_revision",
    ),
    roster_sha256: assignmentDigest(value.roster_sha256, "roster_sha256"),
  });
}

function normalizeTask15ApprovedRelease(value) {
  assignmentExactKeys(value, TASK15_ACTIVATION_RELEASE_KEYS, "approved release");
  if (value.valid !== true || value.platform !== "darwin"
      || value.channel !== "formal" || value.app_id !== "com.amic.matter.desktop"
      || !new Set(["arm64", "x64"]).has(value.arch)
      || typeof value.macos_team_id !== "string"
      || !/^[A-Z0-9]{10}$/u.test(value.macos_team_id)
      || typeof value.source_sha !== "string"
      || !/^[a-f0-9]{40}$/u.test(value.source_sha)
      || typeof value.source_tree !== "string"
      || !/^[a-f0-9]{40}$/u.test(value.source_tree)) {
    assignmentInvalid("approved release");
  }
  for (const field of [
    "approval_sha256", "embedded_build_manifest_sha256",
    "macos_code_directory_sha256", "macos_designated_requirement_sha256",
    "macos_technical_evidence_sha256", "measured_inner_artifact_sha256",
    "registered_final_artifact_sha256", "release_ticket_sha256",
    "release_ticket_signature_sha256", "trust_registry_sha256",
  ]) assignmentDigest(value[field], field);
  for (const field of [
    "measured_inner_artifact_bytes", "registered_final_artifact_bytes",
    "trust_registry_serial",
  ]) assignmentInteger(value[field], field);
  for (const field of [
    "app_id", "app_version", "arch", "channel", "platform",
    "release_artifact_id", "release_ticket_id", "tenant_id",
  ]) assignmentIdentifier(value[field], field);
  assignmentIso(value.valid_until, "approved_release.valid_until");
  return Object.freeze({ ...value });
}

function normalizeIssuedChallenge(value) {
  assignmentExactKeys(value, ACTIVATION_CHALLENGE_KEYS, "issued challenge");
  const principal = normalizeTask15ActivationPrincipal(
    value.authenticated_principal,
  );
  const device = normalizeTask15ActivationDevice(value.candidate_device);
  const pilotPolicy = normalizeTask15PilotPolicy(value.pilot_policy);
  const approvedRelease = normalizeTask15ApprovedRelease(value.approved_release);
  if (value.schema_version !== "lawos.outlook-desktop-activation-challenge.v1"
      || value.activation_mode !== "operator_controlled_macos_v1"
      || value.hardware_key_attested !== false
      || value.mdm_attested !== false
      || value.remote_app_attested !== false
      || typeof value.challenge_nonce_base64url !== "string"
      || !NONCE_BASE64URL.test(value.challenge_nonce_base64url)
      || !ACTIVATION_REFERENCE.test(value.activation_id)
      || principal.lawos_tenant_id !== approvedRelease.tenant_id) {
    assignmentInvalid("issued challenge");
  }
  for (const field of [
    "activation_binding_sha256", "challenge_nonce_sha256",
    "local_measurement_evidence_sha256",
  ]) assignmentDigest(value[field], field);
  const issuedAt = assignmentIso(value.issued_at, "issued_at");
  const expiresAt = assignmentIso(value.expires_at, "expires_at");
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)
      || Date.parse(expiresAt) > Date.parse(approvedRelease.valid_until)) {
    assignmentInvalid("issued challenge");
  }
  return Object.freeze({
    ...value,
    approved_release: approvedRelease,
    authenticated_principal: principal,
    candidate_device: device,
    pilot_policy: pilotPolicy,
  });
}

function normalizeIssuedChallengeBytes(challenge, encoded, digest) {
  return withAssignmentBase64Bytes(
    encoded,
    "issued_challenge_base64",
    { maxBytes: 65_536 },
    (bytes) => {
      let expected;
      let parsed;
      try {
        try {
          parsed = JSON.parse(bytes.toString("utf8"));
        } catch {
          assignmentInvalid("issued_challenge_base64");
        }
        expected = assignmentCanonicalJsonBytes(challenge);
        if (bytes.at(-1) !== 0x0a || !isDeepStrictEqual(parsed, challenge)
            || !bytes.equals(expected)
            || createHash("sha256").update(bytes).digest("hex") !==
              assignmentDigest(digest, "issued_challenge_sha256")) {
          assignmentInvalid("issued_challenge_base64");
        }
        return encoded;
      } finally {
        expected?.fill(0);
      }
    },
  );
}

function assignmentCanonicalValue(value) {
  if (Array.isArray(value)) return value.map(assignmentCanonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      assignmentCanonicalValue(value[key]),
    ]));
  }
  return value;
}

export function assignmentCanonicalJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(assignmentCanonicalValue(value))}\n`, "utf8");
}

export function normalizeOutlookDesktopActivationChallengeRequest(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_REQUEST_KEYS,
    "activation challenge request",
  );
  const issueRequestId = activationIssueRequestId(value.issue_request_id);
  const issuedChallenge = normalizeIssuedChallenge(value.issued_challenge);
  const issuedChallengeSha256 = assignmentDigest(
    value.issued_challenge_sha256,
    "issued_challenge_sha256",
  );
  normalizeIssuedChallengeBytes(
    issuedChallenge,
    value.issued_challenge_base64,
    issuedChallengeSha256,
  );
  let releaseTicketSha256;
  const releaseTicketBase64 = withAssignmentBase64Bytes(
    value.release_ticket_base64,
    "release_ticket_base64",
    { maxBytes: 65_536 },
    (bytes) => {
      releaseTicketSha256 = createHash("sha256").update(bytes).digest("hex");
      return value.release_ticket_base64;
    },
  );
  let releaseTicketSignatureSha256;
  const releaseTicketSignatureBase64 = withAssignmentBase64Bytes(
    value.release_ticket_signature_base64,
    "release_ticket_signature_base64",
    { byteLength: 64 },
    (bytes) => {
      releaseTicketSignatureSha256 = createHash("sha256")
        .update(bytes).digest("hex");
      return value.release_ticket_signature_base64;
    },
  );
  if (releaseTicketSha256 !==
      issuedChallenge.approved_release.release_ticket_sha256
      || releaseTicketSignatureSha256 !==
        issuedChallenge.approved_release.release_ticket_signature_sha256) {
    assignmentInvalid("activation challenge release ticket");
  }
  return Object.freeze({
    issue_request_id: issueRequestId,
    issued_challenge: issuedChallenge,
    issued_challenge_base64: value.issued_challenge_base64,
    issued_challenge_sha256: issuedChallengeSha256,
    release_ticket_base64: releaseTicketBase64,
    release_ticket_signature_base64: releaseTicketSignatureBase64,
  });
}

export function normalizeOutlookDesktopActivationEvidenceRequest(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_REQUEST_KEYS,
    "activation evidence request",
  );
  const reference = activationReference(value.activation_reference);
  const replayIdentity = normalizeActivationReplayIdentity(
    value.activation_replay_identity,
  );
  let actualOperatorReceiptSha256;
  const operatorReceiptBase64 = withAssignmentBase64Bytes(
    value.operator_receipt_base64,
    "operator_receipt_base64",
    { maxBytes: 65_536 },
    (bytes) => {
      actualOperatorReceiptSha256 = createHash("sha256")
        .update(bytes).digest("hex");
      return value.operator_receipt_base64;
    },
  );
  let actualOperatorSignatureSha256;
  const operatorSignatureBase64 = withAssignmentBase64Bytes(
    value.operator_signature_base64,
    "operator_signature_base64",
    { byteLength: 64 },
    (bytes) => {
      actualOperatorSignatureSha256 = createHash("sha256")
        .update(bytes).digest("hex");
      return value.operator_signature_base64;
    },
  );
  const operatorReceiptSha256 = assignmentDigest(
    value.operator_receipt_sha256,
    "operator_receipt_sha256",
  );
  const operatorSignatureSha256 = assignmentDigest(
    value.operator_signature_sha256,
    "operator_signature_sha256",
  );
  if (replayIdentity.activation_id !== reference
      || actualOperatorReceiptSha256 !== operatorReceiptSha256
      || actualOperatorSignatureSha256 !== operatorSignatureSha256) {
    assignmentInvalid("activation evidence request");
  }
  return Object.freeze({
    activation_reference: reference,
    activation_replay_identity: replayIdentity,
    installation_id: installationId(value.installation_id),
    issued_challenge_sha256: assignmentDigest(
      value.issued_challenge_sha256,
      "issued_challenge_sha256",
    ),
    local_measurement_evidence_sha256: assignmentDigest(
      value.local_measurement_evidence_sha256,
      "local_measurement_evidence_sha256",
    ),
    operator_receipt_base64: operatorReceiptBase64,
    operator_receipt_sha256: operatorReceiptSha256,
    operator_signature_base64: operatorSignatureBase64,
    operator_signature_sha256: operatorSignatureSha256,
    request_id: activationIssueRequestId(value.request_id, "request_id"),
  });
}

function activationEvidenceBytes(value, field, { byteLength, maxBytes } = {}) {
  if (!Buffer.isBuffer(value)
      || (byteLength !== undefined && value.length !== byteLength)
      || (maxBytes !== undefined && (value.length < 1 || value.length > maxBytes))) {
    assignmentInvalid(field);
  }
  return Buffer.from(value);
}

export function normalizeOutlookDesktopActivationOperatorPacketEvidence(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_OPERATOR_PACKET_EVIDENCE_KEYS,
    "activation operator packet evidence",
  );
  const activationReferenceValue = activationReference(
    value.activation_reference,
  );
  const authenticatedPrincipal = normalizeTask15ActivationPrincipal(
    value.authenticated_principal,
  );
  const localMeasurementEvidenceSha256 = assignmentDigest(
    value.local_measurement_evidence_sha256,
    "local_measurement_evidence_sha256",
  );
  const ownerOperatorPacketSha256 = assignmentDigest(
    value.owner_operator_packet_sha256,
    "owner_operator_packet_sha256",
  );
  const requestId = activationIssueRequestId(value.request_id, "request_id");
  let operatorReceiptBytes;
  let operatorReceiptSignatureBytes;
  let ownershipTransferred = false;
  try {
    operatorReceiptBytes = activationEvidenceBytes(
      value.operator_receipt_bytes,
      "operator_receipt_bytes",
      { maxBytes: 65_536 },
    );
    operatorReceiptSignatureBytes = activationEvidenceBytes(
      value.operator_receipt_signature_bytes,
      "operator_receipt_signature_bytes",
      { byteLength: 64 },
    );
    const packet = Object.freeze({
      activation_reference: activationReferenceValue,
      authenticated_principal: authenticatedPrincipal,
      local_measurement_evidence_sha256: localMeasurementEvidenceSha256,
      operator_receipt_bytes: operatorReceiptBytes,
      operator_receipt_signature_bytes: operatorReceiptSignatureBytes,
      owner_operator_packet_sha256: ownerOperatorPacketSha256,
      request_id: requestId,
    });
    ownershipTransferred = true;
    return packet;
  } finally {
    if (!ownershipTransferred) {
      operatorReceiptBytes?.fill(0);
      operatorReceiptSignatureBytes?.fill(0);
    }
  }
}

export const assertOutlookDesktopActivationOperatorPacketEvidence =
  normalizeOutlookDesktopActivationOperatorPacketEvidence;

export function normalizeOutlookDesktopActivationAuthorizationRequest(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_AUTHORIZATION_REQUEST_KEYS,
    "activation authorization request",
  );
  const issuedAt = assignmentIso(value.proof_issued_at, "proof_issued_at");
  const expiresAt = assignmentIso(value.proof_expires_at, "proof_expires_at");
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)
      || value.device_key_fingerprint !== value.device_public_key_spki_sha256) {
    assignmentInvalid("activation authorization request");
  }
  const request = { ...value };
  request.activation_reference = activationReference(value.activation_reference);
  request.installation_id = installationId(value.installation_id);
  for (const field of [
    "entra_subject_id", "proof_id", "user_id",
  ]) request[field] = assignmentIdentifier(value[field], field);
  request.event_id = activationRegistrationEventId(value.event_id, "event_id");
  request.request_id = activationIssueRequestId(value.request_id, "request_id");
  request.idempotency_key = activationIssueRequestId(
    value.idempotency_key,
    "idempotency_key",
  );
  if (request.request_id !== request.idempotency_key) {
    assignmentInvalid("activation authorization request id");
  }
  for (const field of [
    "challenge_nonce_sha256", "device_command_sha256",
    "device_key_fingerprint", "device_proof_transcript_sha256",
    "device_public_key_spki_sha256", "device_signature_sha256",
    "evidence_binding_sha256", "issued_challenge_sha256",
    "request_fingerprint",
  ]) request[field] = assignmentDigest(value[field], field);
  request.proof_issued_at = issuedAt;
  request.proof_expires_at = expiresAt;
  return Object.freeze(request);
}

export function normalizeOutlookDesktopActivationIssueAuthorityPublicationRequest(
  value,
) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLICATION_REQUEST_KEYS,
    "activation issue authority publication request",
  );
  return Object.freeze({
    macos_code_directory_sha256: assignmentDigest(
      value.macos_code_directory_sha256,
      "macos_code_directory_sha256",
    ),
    macos_designated_requirement_sha256: assignmentDigest(
      value.macos_designated_requirement_sha256,
      "macos_designated_requirement_sha256",
    ),
    pilot_policy: normalizeTask15PilotPolicy(value.pilot_policy),
    release_artifact_id: assignmentIdentifier(
      value.release_artifact_id,
      "release_artifact_id",
    ),
    release_ticket_base64: assignmentBase64(
      value.release_ticket_base64,
      "release_ticket_base64",
      { maxBytes: 65_536 },
    ),
    release_ticket_signature_base64: assignmentBase64(
      value.release_ticket_signature_base64,
      "release_ticket_signature_base64",
      { byteLength: 64 },
    ),
    request_id: assignmentIdentifier(value.request_id, "request_id"),
  });
}

export function normalizeOutlookDesktopActivationIssueAuthorityPublicationReceipt(
  value,
) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLICATION_RECEIPT_KEYS,
    "activation issue authority publication receipt",
  );
  const publishedAt = assignmentIso(value.published_at, "published_at");
  const validUntil = assignmentIso(value.valid_until, "valid_until");
  if (value.outcome !== "published"
      || Date.parse(validUntil) <= Date.parse(publishedAt)) {
    assignmentInvalid("activation issue authority publication receipt");
  }
  return Object.freeze({
    authority_binding_sha256: assignmentDigest(
      value.authority_binding_sha256,
      "authority_binding_sha256",
    ),
    outcome: value.outcome,
    published_at: publishedAt,
    release_artifact_id: assignmentIdentifier(
      value.release_artifact_id,
      "release_artifact_id",
    ),
    release_authority_sha256: assignmentDigest(
      value.release_authority_sha256,
      "release_authority_sha256",
    ),
    request_id: assignmentIdentifier(value.request_id, "request_id"),
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    valid_until: validUntil,
  });
}

export function createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256(
  value,
) {
  assignmentExactKeys(
    value,
    ["authenticated_principal", "candidate_device", "issue_request_id", "tenant_id"],
    "activation issue authority fingerprint input",
  );
  const tenantId = assignmentIdentifier(value.tenant_id, "tenant_id");
  const principal = normalizeTask15ActivationPrincipal(
    value.authenticated_principal,
  );
  const device = normalizeTask15ActivationDevice(value.candidate_device);
  if (principal.lawos_tenant_id !== tenantId) {
    assignmentInvalid("activation issue authority tenant");
  }
  return assignmentLengthPrefixedSha256(
    "lawos.outlook-desktop-activation-issue-authority-load-request.v1",
    [
      tenantId,
      principal.lawos_user_id,
      principal.entra_subject,
      principal.entra_tenant_id,
      device.continuity_key_fingerprint_sha256,
      device.continuity_public_key_spki,
      activationIssueRequestId(value.issue_request_id),
    ],
  );
}

export function normalizeOutlookDesktopActivationIssueAuthorityLoadRequest(
  value,
  { tenant_id: tenantId } = {},
) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_LOAD_REQUEST_KEYS,
    "activation issue authority load request",
  );
  const principal = normalizeTask15ActivationPrincipal(
    value.authenticated_principal,
  );
  const device = normalizeTask15ActivationDevice(value.candidate_device);
  const issueRequestId = activationIssueRequestId(value.issue_request_id);
  const expected = createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256({
    authenticated_principal: principal,
    candidate_device: device,
    issue_request_id: issueRequestId,
    tenant_id: tenantId,
  });
  if (assignmentDigest(
    value.request_fingerprint_sha256,
    "request_fingerprint_sha256",
  ) !== expected) {
    assignmentInvalid("activation issue authority request fingerprint");
  }
  return Object.freeze({
    authenticated_principal: principal,
    candidate_device: device,
    issue_request_id: issueRequestId,
    request_fingerprint_sha256: expected,
  });
}

export function normalizeOutlookDesktopActivationIssuePublicResponse(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_ISSUE_PUBLIC_RESPONSE_KEYS,
    "activation issue public response",
  );
  const challenge = normalizeIssuedChallenge(value.issued_challenge);
  const release = assignmentRecord(
    value.release_authority,
    "activation issue release authority",
  );
  assignmentExactKeys(
    release,
    ACTIVATION_ISSUE_PUBLIC_RELEASE_AUTHORITY_KEYS,
    "activation issue release authority",
  );
  const normalizedRelease = Object.freeze({
    authority_binding_sha256: assignmentDigest(
      release.authority_binding_sha256,
      "authority_binding_sha256",
    ),
    release_artifact_id: assignmentIdentifier(
      release.release_artifact_id,
      "release_artifact_id",
    ),
    release_authority_sha256: assignmentDigest(
      release.release_authority_sha256,
      "release_authority_sha256",
    ),
    release_ticket_bytes_sha256: assignmentDigest(
      release.release_ticket_bytes_sha256,
      "release_ticket_bytes_sha256",
    ),
    release_ticket_owner_signature_sha256: assignmentDigest(
      release.release_ticket_owner_signature_sha256,
      "release_ticket_owner_signature_sha256",
    ),
    valid_until: assignmentIso(release.valid_until, "valid_until"),
  });
  const issuedChallengeSha256 = assignmentDigest(
    value.issued_challenge_sha256,
    "issued_challenge_sha256",
  );
  if (value.schema_version !==
        "lawos.outlook-desktop-activation-authority-result.v1"
      || value.activation_reference !== challenge.activation_id
      || normalizedRelease.release_artifact_id !==
        challenge.approved_release.release_artifact_id
      || normalizedRelease.release_ticket_bytes_sha256 !==
        challenge.approved_release.release_ticket_sha256
      || normalizedRelease.release_ticket_owner_signature_sha256 !==
        challenge.approved_release.release_ticket_signature_sha256
      || normalizedRelease.valid_until !== challenge.approved_release.valid_until) {
    assignmentInvalid("activation issue public response");
  }
  const canonicalChallengeBytes = assignmentCanonicalJsonBytes(challenge);
  let canonicalChallengeSha256;
  try {
    canonicalChallengeSha256 = createHash("sha256")
      .update(canonicalChallengeBytes).digest("hex");
  } finally {
    canonicalChallengeBytes.fill(0);
  }
  if (canonicalChallengeSha256 !== issuedChallengeSha256) {
    assignmentInvalid("activation issue public response");
  }
  return Object.freeze({
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    issue_request_id: activationIssueRequestId(value.issue_request_id),
    issued_challenge: challenge,
    issued_challenge_sha256: issuedChallengeSha256,
    registration_event_id: activationRegistrationEventId(
      value.registration_event_id,
    ),
    release_authority: normalizedRelease,
    schema_version: value.schema_version,
  });
}

export function createOutlookDesktopActivationIssuePublicResponseBytes(value) {
  return assignmentCanonicalJsonBytes(
    normalizeOutlookDesktopActivationIssuePublicResponse(value),
  );
}

function normalizeOutlookDesktopActivationIssuePublicResponseBytes(value) {
  if (!Buffer.isBuffer(value) || value.length < 1 || value.length > 128 * 1_024) {
    assignmentInvalid("activation issue public response bytes");
  }
  let expected;
  let parsed;
  try {
    try {
      parsed = JSON.parse(value.toString("utf8"));
    } catch {
      assignmentInvalid("activation issue public response bytes");
    }
    expected = createOutlookDesktopActivationIssuePublicResponseBytes(parsed);
    if (!value.equals(expected)) {
      assignmentInvalid("activation issue public response bytes");
    }
    return Buffer.from(value);
  } finally {
    expected?.fill(0);
  }
}

export function normalizeOutlookDesktopActivationIssueAuthorityLoadResult(value) {
  if (value?.outcome === "replay") {
    assignmentExactKeys(
      value,
      ACTIVATION_ISSUE_AUTHORITY_REPLAY_ROW_KEYS,
      "activation issue authority replay",
    );
    return withAssignmentBase64Bytes(
      value.response_base64,
      "response_base64",
      { maxBytes: 65_536 },
      (storedResponseBytes) => {
        const requestFingerprintSha256 = assignmentDigest(
          value.request_fingerprint_sha256,
          "request_fingerprint_sha256",
        );
        let responseBytes;
        let ownershipTransferred = false;
        try {
          responseBytes = normalizeOutlookDesktopActivationIssuePublicResponseBytes(
            storedResponseBytes,
          );
          const result = Object.freeze({
            outcome: value.outcome,
            request_fingerprint_sha256: requestFingerprintSha256,
            response_bytes: responseBytes,
          });
          ownershipTransferred = true;
          return result;
        } finally {
          if (!ownershipTransferred) responseBytes?.fill(0);
        }
      },
    );
  }
  assignmentExactKeys(
    value,
    ACTIVATION_ISSUE_AUTHORITY_READY_ROW_KEYS,
    "activation issue authority ready row",
  );
  const approvedRelease = normalizeTask15ApprovedRelease(value.approved_release);
  const pilotPolicy = normalizeTask15PilotPolicy(value.pilot_policy);
  let ticketBytes;
  let signatureBytes;
  let ownershipTransferred = false;
  try {
    ticketBytes = withAssignmentBase64Bytes(
      value.release_ticket_base64,
      "release_ticket_base64",
      { maxBytes: 65_536 },
      (bytes) => Buffer.from(bytes),
    );
    signatureBytes = withAssignmentBase64Bytes(
      value.release_ticket_signature_base64,
      "release_ticket_signature_base64",
      { byteLength: 64 },
      (bytes) => Buffer.from(bytes),
    );
    if (value.outcome !== "ready"
        || value.schema_version !==
          "lawos.outlook-desktop-activation-issue-authority.v1"
        || value.tenant_id !== approvedRelease.tenant_id
        || value.release_artifact_id !== approvedRelease.release_artifact_id
        || value.valid_until !== approvedRelease.valid_until
        || createHash("sha256").update(ticketBytes).digest("hex") !==
          assignmentDigest(value.release_ticket_bytes_sha256,
            "release_ticket_bytes_sha256")
        || value.release_ticket_bytes_sha256 !==
          approvedRelease.release_ticket_sha256
        || createHash("sha256").update(signatureBytes).digest("hex") !==
          assignmentDigest(value.release_ticket_owner_signature_sha256,
            "release_ticket_owner_signature_sha256")
        || value.release_ticket_owner_signature_sha256 !==
          approvedRelease.release_ticket_signature_sha256) {
      assignmentInvalid("activation issue authority ready row");
    }
    const authorityBindingSha256 = assignmentDigest(
      value.authority_binding_sha256,
      "authority_binding_sha256",
    );
    const result = Object.freeze({
      outcome: value.outcome,
      request_fingerprint_sha256: assignmentDigest(
        value.request_fingerprint_sha256,
        "request_fingerprint_sha256",
      ),
      approved_release: approvedRelease,
      pilot_policy: pilotPolicy,
      release_authority: Object.freeze({
        authority_binding_sha256: authorityBindingSha256,
        release_artifact_id: assignmentIdentifier(
          value.release_artifact_id,
          "release_artifact_id",
        ),
        release_authority_sha256: assignmentDigest(
          value.release_authority_sha256,
          "release_authority_sha256",
        ),
        release_ticket_bytes_sha256: assignmentDigest(
          value.release_ticket_bytes_sha256,
          "release_ticket_bytes_sha256",
        ),
        release_ticket_owner_signature_sha256: assignmentDigest(
          value.release_ticket_owner_signature_sha256,
          "release_ticket_owner_signature_sha256",
        ),
        valid_until: assignmentIso(value.valid_until, "valid_until"),
      }),
      release_ticket_bytes: ticketBytes,
      release_ticket_signature_bytes: signatureBytes,
    });
    ownershipTransferred = true;
    return result;
  } finally {
    if (!ownershipTransferred) {
      ticketBytes?.fill(0);
      signatureBytes?.fill(0);
    }
  }
}

export function normalizeOutlookDesktopLifecycleChallengeRequest(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_REQUEST_KEYS,
    "lifecycle challenge request",
  );
  if (!new Set(["heartbeat", "retire"]).has(value.operation)) {
    assignmentInvalid("lifecycle operation");
  }
  return Object.freeze({
    device_key_fingerprint: assignmentDigest(
      value.device_key_fingerprint,
      "device_key_fingerprint",
    ),
    entra_subject_id: assignmentIdentifier(
      value.entra_subject_id,
      "entra_subject_id",
    ),
    event_id: assignmentIdentifier(value.event_id, "event_id"),
    expected_state_version: assignmentInteger(
      value.expected_state_version,
      "expected_state_version",
    ),
    idempotency_key: assignmentIdentifier(
      value.idempotency_key,
      "idempotency_key",
    ),
    installation_id: installationId(value.installation_id),
    operation: value.operation,
    request_id: assignmentIdentifier(value.request_id, "request_id"),
    user_id: assignmentIdentifier(value.user_id, "user_id"),
  });
}

export function normalizeOutlookDesktopLifecycleAuthorizationRequest(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REQUEST_KEYS,
    "lifecycle authorization request",
  );
  if (!new Set(["register", "heartbeat", "retire"]).has(value.operation)) {
    assignmentInvalid("lifecycle operation");
  }
  const register = value.operation === "register";
  const retire = value.operation === "retire";
  if ((register && (value.activation_authorization_id === null
      || value.release_authority_sha256 === null
      || value.lifecycle_challenge_id !== null
      || typeof value.request_id !== "string"
      || typeof value.event_id !== "string"
      || typeof value.idempotency_key !== "string"
      || value.retire_intent_id !== null))
      || (!register && (value.activation_authorization_id !== null
        || value.release_authority_sha256 !== null
        || typeof value.lifecycle_challenge_id !== "string"
        || !LIFECYCLE_CHALLENGE_ID.test(value.lifecycle_challenge_id)
        || value.request_id === null || value.event_id === null
        || value.idempotency_key === null
        || (retire
          ? typeof value.retire_intent_id !== "string"
            || !RETIRE_INTENT_ID.test(value.retire_intent_id)
          : value.retire_intent_id !== null)))) {
    assignmentInvalid("lifecycle authorization request");
  }
  const request = { ...value };
  for (const field of [
    "entra_subject_id", "lifecycle_authorization_id", "user_id",
  ]) request[field] = assignmentIdentifier(value[field], field);
  for (const field of [
    "device_key_fingerprint", "device_public_key_spki_sha256",
    "device_signature_sha256", "issued_challenge_sha256", "nonce_hash",
    "proof_receipt_sha256", "proof_transcript_sha256", "request_fingerprint",
  ]) request[field] = assignmentDigest(value[field], field);
  if (request.device_key_fingerprint !== request.device_public_key_spki_sha256) {
    assignmentInvalid("lifecycle device key");
  }
  request.installation_id = installationId(value.installation_id);
  request.expected_state_version = assignmentInteger(
    value.expected_state_version,
    "expected_state_version",
  );
  request.proof_issued_at = assignmentIso(value.proof_issued_at, "proof_issued_at");
  request.proof_expires_at = assignmentIso(
    value.proof_expires_at,
    "proof_expires_at",
  );
  if (Date.parse(request.proof_expires_at) <= Date.parse(request.proof_issued_at)) {
    assignmentInvalid("lifecycle authorization window");
  }
  if (register) {
    request.activation_authorization_id = assignmentIdentifier(
      value.activation_authorization_id,
      "activation_authorization_id",
    );
    request.release_authority_sha256 = assignmentDigest(
      value.release_authority_sha256,
      "release_authority_sha256",
    );
    request.request_id = activationIssueRequestId(value.request_id, "request_id");
    request.idempotency_key = activationIssueRequestId(
      value.idempotency_key,
      "idempotency_key",
    );
    request.event_id = activationRegistrationEventId(value.event_id, "event_id");
    if (request.request_id !== request.idempotency_key) {
      assignmentInvalid("lifecycle registration request id");
    }
  } else {
    for (const field of ["event_id", "idempotency_key", "request_id"]) {
      request[field] = assignmentIdentifier(value[field], field);
    }
  }
  return Object.freeze(request);
}

export function normalizeOutlookDesktopActivationChallengeReceipt(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_RECEIPT_KEYS,
    "activation challenge receipt",
  );
  const issuedChallenge = normalizeIssuedChallenge(value.issued_challenge);
  const principal = issuedChallenge.authenticated_principal;
  const release = issuedChallenge.approved_release;
  if (value.outcome !== "issued"
      || value.tenant_id !== principal.lawos_tenant_id
      || value.activation_reference !== issuedChallenge.activation_id
      || value.release_artifact_id !== release.release_artifact_id
      || value.challenge_nonce_sha256 !== issuedChallenge.challenge_nonce_sha256
      || value.issued_at !== issuedChallenge.issued_at
      || value.valid_until !== issuedChallenge.expires_at) {
    assignmentInvalid("activation challenge receipt");
  }
  normalizeIssuedChallengeBytes(
    issuedChallenge,
    value.issued_challenge_base64,
    value.issued_challenge_sha256,
  );
  return Object.freeze({
    outcome: value.outcome,
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    issue_request_id: activationIssueRequestId(value.issue_request_id),
    registration_event_id: activationRegistrationEventId(
      value.registration_event_id,
    ),
    release_artifact_id: assignmentIdentifier(
      value.release_artifact_id,
      "release_artifact_id",
    ),
    release_authority_sha256: assignmentDigest(
      value.release_authority_sha256,
      "release_authority_sha256",
    ),
    challenge_nonce_sha256: issuedChallenge.challenge_nonce_sha256,
    issued_challenge: issuedChallenge,
    issued_challenge_base64: value.issued_challenge_base64,
    issued_challenge_sha256: assignmentDigest(
      value.issued_challenge_sha256,
      "issued_challenge_sha256",
    ),
    issued_at: issuedChallenge.issued_at,
    valid_until: issuedChallenge.expires_at,
  });
}

export const assertOutlookDesktopActivationChallengeReceipt =
  normalizeOutlookDesktopActivationChallengeReceipt;

export function normalizeOutlookDesktopActivationEvidenceReceipt(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_RECEIPT_KEYS,
    "activation evidence receipt",
  );
  if (value.status !== "evidence_attached") {
    assignmentInvalid("activation evidence receipt");
  }
  return Object.freeze({
    status: value.status,
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    issued_challenge_sha256: assignmentDigest(
      value.issued_challenge_sha256,
      "issued_challenge_sha256",
    ),
    activation_receipt_sha256: assignmentDigest(
      value.activation_receipt_sha256,
      "activation_receipt_sha256",
    ),
    local_measurement_evidence_sha256: assignmentDigest(
      value.local_measurement_evidence_sha256,
      "local_measurement_evidence_sha256",
    ),
    attached_at: assignmentIso(value.attached_at, "attached_at"),
    valid_until: assignmentIso(value.valid_until, "valid_until"),
  });
}

export const assertOutlookDesktopActivationEvidenceReceipt =
  normalizeOutlookDesktopActivationEvidenceReceipt;

export function normalizeOutlookDesktopActivationEvidenceAttachmentResult(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_EVIDENCE_ATTACHMENT_RESULT_KEYS,
    "activation evidence attachment result",
  );
  return Object.freeze({
    core_result: normalizeOutlookDesktopActivationEvidenceReceipt(
      value.core_result,
    ),
    evidence_receipt_sha256: assignmentDigest(
      value.evidence_receipt_sha256,
      "evidence_receipt_sha256",
    ),
    owner_operator_packet_sha256: assignmentDigest(
      value.owner_operator_packet_sha256,
      "owner_operator_packet_sha256",
    ),
  });
}

export const assertOutlookDesktopActivationEvidenceAttachmentResult =
  normalizeOutlookDesktopActivationEvidenceAttachmentResult;

export function normalizeOutlookDesktopActivationAuthorizationReceipt(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_AUTHORIZATION_RECEIPT_KEYS,
    "activation authorization receipt",
  );
  if (value.outcome !== "authorized") {
    assignmentInvalid("activation authorization receipt");
  }
  return Object.freeze({
    outcome: value.outcome,
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    authorization_binding_sha256: assignmentDigest(
      value.authorization_binding_sha256,
      "authorization_binding_sha256",
    ),
    activation_receipt_sha256: assignmentDigest(
      value.activation_receipt_sha256,
      "activation_receipt_sha256",
    ),
    activation_authorization_receipt_sha256: assignmentDigest(
      value.activation_authorization_receipt_sha256,
      "activation_authorization_receipt_sha256",
    ),
    release_authority_sha256: assignmentDigest(
      value.release_authority_sha256,
      "release_authority_sha256",
    ),
    release_artifact_id: assignmentIdentifier(
      value.release_artifact_id,
      "release_artifact_id",
    ),
    authorized_at: assignmentIso(value.authorized_at, "authorized_at"),
    valid_until: assignmentIso(value.valid_until, "valid_until"),
  });
}

export const assertOutlookDesktopActivationAuthorizationReceipt =
  normalizeOutlookDesktopActivationAuthorizationReceipt;

export function normalizeOutlookDesktopActivationReservation(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_ACTIVATION_RESERVATION_KEYS,
    "activation reservation",
  );
  if (!new Set(["issued", "evidence_attached", "authorized", "consumed"])
    .has(value.state)) {
    assignmentInvalid("activation reservation state");
  }
  const attached = value.state !== "issued";
  const authorized = new Set(["authorized", "consumed"]).has(value.state);
  const consumed = value.state === "consumed";
  const digest = (field, present = true) => present
    ? assignmentDigest(value[field], field)
    : assignmentNullable(value[field], assignmentDigest, field);
  const iso = (field, present = true) => present
    ? assignmentIso(value[field], field)
      : assignmentNullable(value[field], assignmentIso, field);
  const issuedChallenge = normalizeIssuedChallenge(value.issued_challenge);
  normalizeIssuedChallengeBytes(
    issuedChallenge,
    value.issued_challenge_base64,
    value.issued_challenge_sha256,
  );
  if ((attached !== (value.activation_replay_identity !== null))
      || (consumed !== (value.lifecycle_registration_consumption !== null))
      || (attached !== (value.attached_at !== null))
      || (authorized !== (value.authorized_at !== null))
      || (consumed !== (value.consumed_at !== null))) {
    assignmentInvalid("activation reservation state");
  }
  const reservation = {
    schema_version: value.schema_version,
    state: value.state,
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    user_id: assignmentIdentifier(value.user_id, "user_id"),
    entra_subject_id: assignmentIdentifier(value.entra_subject_id, "entra_subject_id"),
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    issue_request_id: activationIssueRequestId(value.issue_request_id),
    registration_event_id: activationRegistrationEventId(
      value.registration_event_id,
    ),
    device_key_fingerprint: digest("device_key_fingerprint"),
    device_public_key_spki_sha256: digest("device_public_key_spki_sha256"),
    release_artifact_id: assignmentIdentifier(
      value.release_artifact_id,
      "release_artifact_id",
    ),
    release_authority_sha256: digest("release_authority_sha256"),
    release_ticket_base64: assignmentBase64(
      value.release_ticket_base64,
      "release_ticket_base64",
      { maxBytes: 65_536 },
    ),
    release_ticket_signature_base64: assignmentBase64(
      value.release_ticket_signature_base64,
      "release_ticket_signature_base64",
      { byteLength: 64 },
    ),
    release_ticket_bytes_sha256: digest("release_ticket_bytes_sha256"),
    release_ticket_owner_signature_sha256:
      digest("release_ticket_owner_signature_sha256"),
    challenge_nonce_base64url: value.challenge_nonce_base64url,
    challenge_nonce_sha256: digest("challenge_nonce_sha256"),
    issued_challenge: issuedChallenge,
    issued_challenge_base64: value.issued_challenge_base64,
    issued_challenge_sha256: digest("issued_challenge_sha256"),
    operator_receipt_base64: attached
      ? assignmentBase64(value.operator_receipt_base64, "operator_receipt_base64", {
        maxBytes: 65_536,
      }) : assignmentNullable(value.operator_receipt_base64, assignmentString,
        "operator_receipt_base64"),
    operator_receipt_sha256: digest("operator_receipt_sha256", attached),
    operator_signature_base64: attached
      ? assignmentBase64(value.operator_signature_base64, "operator_signature_base64", {
        byteLength: 64,
      }) : assignmentNullable(value.operator_signature_base64, assignmentString,
        "operator_signature_base64"),
    operator_signature_sha256: digest("operator_signature_sha256", attached),
    owner_operator_packet_sha256:
      digest("owner_operator_packet_sha256", attached),
    evidence_receipt_sha256: digest("evidence_receipt_sha256", attached),
    local_measurement_evidence_sha256:
      digest("local_measurement_evidence_sha256"),
    device_command_sha256: digest("device_command_sha256", authorized),
    device_proof_transcript_sha256:
      digest("device_proof_transcript_sha256", authorized),
    device_signature_sha256: digest("device_signature_sha256", authorized),
    evidence_binding_sha256: digest("evidence_binding_sha256", authorized),
    activation_replay_identity: attached
      ? normalizeActivationReplayIdentity(value.activation_replay_identity)
      : assignmentNullable(
        value.activation_replay_identity,
        normalizeActivationReplayIdentity,
        "activation_replay_identity",
      ),
    activation_receipt_sha256: digest("activation_receipt_sha256", attached),
    activation_authorization_receipt_sha256:
      digest("activation_authorization_receipt_sha256", authorized),
    issue_request_sha256: digest("issue_request_sha256"),
    issue_public_response_base64: assignmentBase64(
      value.issue_public_response_base64,
      "issue_public_response_base64",
      { maxBytes: 128 * 1_024 },
    ),
    attachment_request_sha256: digest("attachment_request_sha256", attached),
    authorization_request_sha256: digest("authorization_request_sha256", authorized),
    authorization_binding_sha256:
      digest("authorization_binding_sha256", authorized),
    proof_id: authorized
      ? assignmentIdentifier(value.proof_id, "proof_id")
      : assignmentNullable(value.proof_id, assignmentIdentifier, "proof_id"),
    request_id: authorized
      ? activationIssueRequestId(value.request_id, "request_id")
      : assignmentNullable(value.request_id, assignmentIdentifier, "request_id"),
    event_id: authorized
      ? activationRegistrationEventId(value.event_id, "event_id")
      : assignmentNullable(value.event_id, assignmentIdentifier, "event_id"),
    idempotency_key: authorized
      ? activationIssueRequestId(value.idempotency_key, "idempotency_key")
      : assignmentNullable(value.idempotency_key, assignmentIdentifier,
        "idempotency_key"),
    request_fingerprint: digest("request_fingerprint", authorized),
    proof_issued_at: iso("proof_issued_at", authorized),
    proof_expires_at: iso("proof_expires_at", authorized),
    issue_response_text: assignmentString(
      value.issue_response_text,
      "issue_response_text",
    ),
    attachment_response_text: attached
      ? assignmentString(value.attachment_response_text, "attachment_response_text")
      : assignmentNullable(value.attachment_response_text, assignmentString,
        "attachment_response_text"),
    authorization_response_text: authorized
      ? assignmentString(value.authorization_response_text,
        "authorization_response_text")
      : assignmentNullable(value.authorization_response_text, assignmentString,
        "authorization_response_text"),
    issued_at: iso("issued_at"),
    valid_until: iso("valid_until"),
    attached_at: iso("attached_at", attached),
    authorized_at: iso("authorized_at", authorized),
    consumed_at: iso("consumed_at", consumed),
    lifecycle_registration_consumption: consumed
      ? normalizeLifecycleRegistrationConsumption(
        value.lifecycle_registration_consumption,
      )
      : assignmentNullable(
        value.lifecycle_registration_consumption,
        normalizeLifecycleRegistrationConsumption,
        "lifecycle_registration_consumption",
      ),
  };
  if (reservation.schema_version !==
      "lawos.outlook-desktop-activation-reservation.v1"
      || typeof reservation.challenge_nonce_base64url !== "string"
      || !NONCE_BASE64URL.test(reservation.challenge_nonce_base64url)
      || reservation.device_key_fingerprint !==
        reservation.device_public_key_spki_sha256
      || issuedChallenge.activation_id !== reservation.activation_reference
      || issuedChallenge.authenticated_principal.lawos_tenant_id !==
        reservation.tenant_id
      || issuedChallenge.authenticated_principal.lawos_user_id !==
        reservation.user_id
      || issuedChallenge.authenticated_principal.entra_subject !==
        reservation.entra_subject_id
      || issuedChallenge.candidate_device.continuity_key_fingerprint_sha256 !==
        reservation.device_key_fingerprint
      || issuedChallenge.approved_release.release_artifact_id !==
        reservation.release_artifact_id
      || issuedChallenge.challenge_nonce_base64url !==
        reservation.challenge_nonce_base64url
      || issuedChallenge.challenge_nonce_sha256 !== reservation.challenge_nonce_sha256
      || issuedChallenge.issued_at !== reservation.issued_at
      || issuedChallenge.expires_at !== reservation.valid_until
      || (authorized && (
        reservation.request_id !== reservation.issue_request_id
        || reservation.idempotency_key !== reservation.issue_request_id
        || reservation.event_id !== reservation.registration_event_id
      ))
      || (attached && reservation.activation_receipt_sha256 !==
        reservation.operator_receipt_sha256)
      || (attached && (
        reservation.activation_replay_identity.activation_id !==
          reservation.activation_reference
        || reservation.activation_replay_identity.challenge_nonce_sha256 !==
          reservation.challenge_nonce_sha256
      ))
      || (authorized && (
        Date.parse(reservation.proof_expires_at) <=
          Date.parse(reservation.proof_issued_at)
        || Date.parse(reservation.authorized_at) >
          Date.parse(reservation.proof_expires_at)
      ))) {
    assignmentInvalid("activation reservation");
  }
  return Object.freeze(reservation);
}

export const assertOutlookDesktopActivationReservation =
  normalizeOutlookDesktopActivationReservation;

export function normalizeOutlookDesktopActivationProofSeed(value) {
  const ready = value?.status === "ready";
  assignmentExactKeys(
    value,
    ready
      ? OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_READY_KEYS
      : OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PENDING_KEYS,
    "activation proof seed",
  );
  if (!ready && value.status !== "pending") {
    assignmentInvalid("activation proof seed");
  }
  const seed = {
    status: value.status,
    activation_reference: activationReference(value.activation_reference),
    installation_id: installationId(value.installation_id),
    valid_until: assignmentIso(value.valid_until, "valid_until"),
  };
  if (ready) {
    Object.assign(seed, {
      activation_receipt_sha256: assignmentDigest(
        value.activation_receipt_sha256,
        "activation_receipt_sha256",
      ),
      event_id: activationRegistrationEventId(value.event_id, "event_id"),
      local_measurement_evidence_sha256: assignmentDigest(
        value.local_measurement_evidence_sha256,
        "local_measurement_evidence_sha256",
      ),
      release_authority_sha256: assignmentDigest(
        value.release_authority_sha256,
        "release_authority_sha256",
      ),
      issued_challenge_sha256: assignmentDigest(
        value.issued_challenge_sha256,
        "issued_challenge_sha256",
      ),
    });
  }
  return Object.freeze(seed);
}

export const assertOutlookDesktopActivationProofSeed =
  normalizeOutlookDesktopActivationProofSeed;

export function createOutlookDesktopActivationEvidenceBindingSha256(value) {
  assignmentExactKeys(
    value,
    ACTIVATION_EVIDENCE_BINDING_KEYS,
    "activation evidence binding",
  );
  const tenantId = assignmentIdentifier(value.tenant_id, "tenant_id");
  const reference = activationReference(value.activation_reference);
  const reservedInstallationId = installationId(value.installation_id);
  const digests = Object.fromEntries([
    "issued_challenge_sha256", "operator_receipt_sha256",
    "operator_signature_sha256", "local_measurement_evidence_sha256",
    "device_command_sha256", "device_proof_transcript_sha256",
    "device_signature_sha256", "release_authority_sha256",
  ].map((field) => [field, assignmentDigest(value[field], field)]));
  return assignmentLengthPrefixedSha256(
    "lawos.outlook-desktop-activation-evidence-binding.v1",
    [
      tenantId,
      reference,
      reservedInstallationId,
      digests.issued_challenge_sha256,
      digests.operator_receipt_sha256,
      digests.operator_signature_sha256,
      digests.local_measurement_evidence_sha256,
      digests.device_command_sha256,
      digests.device_proof_transcript_sha256,
      digests.device_signature_sha256,
      digests.release_authority_sha256,
    ],
  );
}

export function normalizeOutlookDesktopLifecycleChallengeReceipt(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_RECEIPT_KEYS,
    "lifecycle challenge receipt",
  );
  assignmentExactKeys(
    value.issued_challenge,
    LIFECYCLE_CHALLENGE_KEYS,
    "lifecycle issued challenge",
  );
  const retire = value.operation === "retire";
  if (value.schema_version !== "lawos.outlook-desktop-lifecycle-challenge.v1"
      || value.outcome !== "issued"
      || !new Set(["heartbeat", "retire"]).has(value.operation)
      || typeof value.lifecycle_challenge_id !== "string"
      || !LIFECYCLE_CHALLENGE_ID.test(value.lifecycle_challenge_id)
      || typeof value.challenge_nonce_base64url !== "string"
      || !NONCE_BASE64URL.test(value.challenge_nonce_base64url)
      || (retire
        ? typeof value.retire_intent_id !== "string"
          || !RETIRE_INTENT_ID.test(value.retire_intent_id)
        : value.retire_intent_id !== null)) {
    assignmentInvalid("lifecycle challenge receipt");
  }
  withAssignmentBase64Bytes(
    value.issued_challenge_base64,
    "issued_challenge_base64",
    { maxBytes: 65_536 },
    (challengeBytes) => {
      let parsedChallenge;
      try {
        parsedChallenge = JSON.parse(challengeBytes.toString("utf8"));
      } catch {
        assignmentInvalid("lifecycle issued challenge bytes");
      }
      if (challengeBytes.at(-1) !== 0x0a
          || !isDeepStrictEqual(parsedChallenge, value.issued_challenge)
          || createHash("sha256").update(challengeBytes).digest("hex") !==
            value.issued_challenge_sha256
          || Object.entries(value.issued_challenge).some(([key, child]) =>
            value[key] !== child)) {
        assignmentInvalid("lifecycle issued challenge bytes");
      }
    },
  );
  return Object.freeze({
    schema_version: value.schema_version,
    outcome: value.outcome,
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    user_id: assignmentIdentifier(value.user_id, "user_id"),
    entra_subject_id: assignmentIdentifier(value.entra_subject_id, "entra_subject_id"),
    installation_id: installationId(value.installation_id),
    device_key_fingerprint: assignmentDigest(
      value.device_key_fingerprint,
      "device_key_fingerprint",
    ),
    operation: value.operation,
    expected_state_version: assignmentInteger(
      value.expected_state_version,
      "expected_state_version",
    ),
    request_id: assignmentIdentifier(value.request_id, "request_id"),
    event_id: assignmentIdentifier(value.event_id, "event_id"),
    idempotency_key: assignmentIdentifier(value.idempotency_key, "idempotency_key"),
    lifecycle_challenge_id: value.lifecycle_challenge_id,
    challenge_nonce_base64url: value.challenge_nonce_base64url,
    challenge_nonce_sha256: assignmentDigest(
      value.challenge_nonce_sha256,
      "challenge_nonce_sha256",
    ),
    retire_intent_id: value.retire_intent_id,
    release_authority_sha256: assignmentDigest(
      value.release_authority_sha256,
      "release_authority_sha256",
    ),
    issued_challenge: Object.freeze({ ...value.issued_challenge }),
    issued_challenge_base64: value.issued_challenge_base64,
    issued_challenge_sha256: assignmentDigest(
      value.issued_challenge_sha256,
      "issued_challenge_sha256",
    ),
    issued_at: assignmentIso(value.issued_at, "issued_at"),
    valid_until: assignmentIso(value.valid_until, "valid_until"),
  });
}

export const assertOutlookDesktopLifecycleChallengeReceipt =
  normalizeOutlookDesktopLifecycleChallengeReceipt;

export function normalizeOutlookDesktopLifecycleAuthorizationReceipt(value) {
  assignmentExactKeys(
    value,
    OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_RECEIPT_KEYS,
    "lifecycle authorization receipt",
  );
  if (value.outcome !== "authorized") {
    assignmentInvalid("lifecycle authorization receipt");
  }
  const authorizedAt = assignmentIso(value.authorized_at, "authorized_at");
  const validUntil = assignmentIso(value.valid_until, "valid_until");
  if (Date.parse(validUntil) <= Date.parse(authorizedAt)) {
    assignmentInvalid("lifecycle authorization receipt");
  }
  return Object.freeze({
    authorization_binding_sha256: assignmentDigest(
      value.authorization_binding_sha256,
      "authorization_binding_sha256",
    ),
    authorized_at: authorizedAt,
    lifecycle_authorization_id: assignmentIdentifier(
      value.lifecycle_authorization_id,
      "lifecycle_authorization_id",
    ),
    outcome: value.outcome,
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    valid_until: validUntil,
  });
}

export const assertOutlookDesktopLifecycleAuthorizationReceipt =
  normalizeOutlookDesktopLifecycleAuthorizationReceipt;

export function assignmentSha256(domain, material) {
  return createHash("sha256")
    .update(`${domain}\u001f${JSON.stringify(material)}`)
    .digest("hex");
}

export function assignmentLengthPrefixedSha256(domain, material) {
  const values = [domain, ...material].map(String);
  return createHash("sha256")
    .update(values.map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`).join(""))
    .digest("hex");
}

export function normalizeAssignmentPrincipal(value) {
  assignmentExactKeys(
    value,
    ["entra_subject_id", "tenant_id", "user_id"],
    "principal",
  );
  return Object.freeze({
    tenant_id: assignmentIdentifier(value.tenant_id, "tenant_id"),
    user_id: assignmentIdentifier(value.user_id, "user_id"),
    entra_subject_id: assignmentIdentifier(
      value.entra_subject_id,
      "entra_subject_id",
    ),
  });
}

export function assignmentProviderIntent(boundPrincipal, generation, desired) {
  return assignmentSha256("lawos.outlook-assignment.provider-intent.v1", [
    boundPrincipal.tenant_id,
    boundPrincipal.user_id,
    boundPrincipal.entra_subject_id,
    generation,
    desired,
  ]);
}

export function createOutlookDesktopAssignmentOutboxPayload(intent = {}) {
  const principal = normalizeAssignmentPrincipal({
    tenant_id: intent.tenant_id,
    user_id: intent.user_id,
    entra_subject_id: intent.entra_subject_id,
  });
  const generation = assignmentInteger(
    intent.provider_generation,
    "provider_generation",
  );
  const desired = assignmentBoolean(intent.desired_assigned, "desired_assigned");
  const intentSha = assignmentDigest(
    intent.provider_intent_sha256,
    "provider intent",
  );
  const operationId = `outlook_assignment_${assignmentSha256(
    "lawos.outlook-assignment.operation.v1",
    [...Object.values(principal), generation, desired, intentSha],
  )}`;
  return Object.freeze({
    schema_version: OUTLOOK_DESKTOP_ASSIGNMENT_SCHEMA_VERSION,
    operation_id: operationId,
    ...principal,
    provider_generation: generation,
    desired_assigned: desired,
    action: desired ? "add" : "remove",
    provider_intent_sha256: intentSha,
  });
}

export function parseOutlookDesktopAssignmentOutboxPayload(value) {
  assignmentExactKeys(value, PAYLOAD_KEYS, "outbox payload");
  const expected = createOutlookDesktopAssignmentOutboxPayload(value);
  if (PAYLOAD_KEYS.some((key) => value[key] !== expected[key])) {
    assignmentInvalid("outbox payload");
  }
  return expected;
}
