import { timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual, types } from "node:util";

import {
  assertOutlookDesktopActivationReplayIdentity,
} from "../../../packages/email-dms/src/outlook-desktop-activation-contract.js";
import {
  outlookDesktopActivationIssuedChallengeSha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-challenge.js";
import {
  canonicalBytes,
  sha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-primitives.js";
import {
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  REQUEST_KEYS,
} from "../../../packages/email-dms/src/outlook-desktop-activation-schema.js";
import {
  verifyOperatorActivation,
} from "../../../packages/email-dms/src/outlook-desktop-activation-result.js";
import {
  OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
  snapshotOutlookDesktopBytes,
} from "../../../packages/email-dms/src/outlook-desktop-release-ticket-verifier.js";
import {
  OUTLOOK_DESKTOP_ACTIVATION_RESERVATION_KEYS,
  normalizeOutlookDesktopActivationReservation as normalizeCoreActivationReservation,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-contract.js";
import {
  verifyProductionTrustedRegistry,
} from "../../../packages/runtime-auth/src/external-release-trust.js";

export const ACTIVATION_AUTHORITY_MAX_PUBLIC_RESPONSE_BYTES = 128 * 1_024;
export const ACTIVATION_AUTHORITY_INSTALLATION_ID =
  /^odi_[A-Za-z0-9_-]{20,128}$/u;
export const ACTIVATION_AUTHORITY_ACTIVATION_ID =
  /^oda_[A-Za-z0-9_-]{20,128}$/u;
export const ACTIVATION_AUTHORITY_SHA256 = /^[a-f0-9]{64}$/u;

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const ISSUE_REQUEST_ID = /^oar_[A-Za-z0-9_-]{20,128}$/u;
const REGISTRATION_EVENT_ID = /^oae_[a-f0-9]{32}$/u;
const RESERVATION_KEYS = OUTLOOK_DESKTOP_ACTIVATION_RESERVATION_KEYS;

const ACTIVATION_REPLAY_IDENTITY_KEYS = Object.freeze([
  "activation_binding_sha256", "activation_id", "challenge_nonce_sha256",
  "replay_identity_sha256",
]);
const LIFECYCLE_REGISTRATION_CONSUMPTION_KEYS = Object.freeze([
  "activation_reference", "installation_id", "lifecycle_authorization_id",
  "resulting_state_version", "consumed_at",
]);
const ISSUE_PUBLIC_RESPONSE_KEYS = Object.freeze([
  "activation_reference", "installation_id", "issue_request_id",
  "issued_challenge", "issued_challenge_sha256", "registration_event_id",
  "release_authority", "schema_version",
]);
const ISSUE_RELEASE_AUTHORITY_KEYS = Object.freeze([
  "authority_binding_sha256", "release_artifact_id",
  "release_authority_sha256", "release_ticket_bytes_sha256",
  "release_ticket_owner_signature_sha256", "valid_until",
]);

export class OutlookDesktopActivationAuthorityError extends Error {
  constructor(code, status = 500) {
    super("Outlook desktop activation failed at a protected authority boundary");
    this.name = "OutlookDesktopActivationAuthorityError";
    this.code = code;
    this.safe_error_code = code;
    this.status = status;
  }
}

export function activationAuthorityFailure(code, status) {
  throw new OutlookDesktopActivationAuthorityError(code, status);
}

function zeroActivationAuthorityBytes(value) {
  try {
    if (Buffer.isBuffer(value)) value.fill(0);
  } catch {
    // A failed wipe must not replace the protected boundary result.
  }
}

export function zeroOutlookDesktopActivationReservationBytes(reservation) {
  if (!isActivationAuthorityRecord(reservation)) return;
  const descriptors = Object.getOwnPropertyDescriptors(reservation);
  for (const field of [
    "release_ticket_bytes", "release_ticket_signature_bytes",
    "operator_receipt_bytes", "operator_receipt_signature_bytes",
  ]) {
    if ("value" in (descriptors[field] ?? {})) {
      zeroActivationAuthorityBytes(descriptors[field].value);
    }
  }
}

export function isActivationAuthorityRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || types.isProxy(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function exactActivationAuthorityData(value, keys, code) {
  let descriptors;
  try {
    if (!isActivationAuthorityRecord(value)) activationAuthorityFailure(code);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    activationAuthorityFailure(code);
  }
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
      || keys.some((key) => !("value" in descriptors[key]))) {
    activationAuthorityFailure(code);
  }
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

export function activationAuthorityText(value, code, maximum = 1_024) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum
      || value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    activationAuthorityFailure(code);
  }
  return value;
}

export function activationAuthorityDigest(value, code) {
  if (typeof value !== "string" || !ACTIVATION_AUTHORITY_SHA256.test(value)) {
    activationAuthorityFailure(code);
  }
  return value;
}

export function exactActivationAuthorityBuffer(value, {
  code,
  maxBytes,
  minBytes = 1,
}) {
  try {
    return snapshotOutlookDesktopBytes(value, {
      code,
      fail: (failureCode) => activationAuthorityFailure(failureCode),
      maxBytes,
      minBytes,
      message: code,
    });
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    activationAuthorityFailure(code);
  }
}

export function canonicalActivationAuthorityBase64(value, {
  code,
  maxBytes,
  minBytes = 1,
}) {
  if (typeof value !== "string" || !BASE64.test(value)) {
    activationAuthorityFailure(code);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength < minBytes || bytes.byteLength > maxBytes
      || bytes.toString("base64") !== value) {
    zeroActivationAuthorityBytes(bytes);
    activationAuthorityFailure(code);
  }
  return bytes;
}

export function sameActivationAuthorityBytes(left, right) {
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

export function exactActivationAuthorityUtcTimestamp(value, code) {
  if (typeof value !== "string") activationAuthorityFailure(code);
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed) || new Date(parsed).toISOString() !== value) {
    activationAuthorityFailure(code);
  }
  return value;
}

export function storedActivationAuthorityResponseText(value, code) {
  if (typeof value !== "string" || value.length < 1
      || Buffer.byteLength(value, "utf8")
        > ACTIVATION_AUTHORITY_MAX_PUBLIC_RESPONSE_BYTES) {
    activationAuthorityFailure(code);
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    activationAuthorityFailure(code);
  }
  if (!isActivationAuthorityRecord(parsed)) activationAuthorityFailure(code);
  let canonical;
  let completed = false;
  try {
    canonical = canonicalBytes(parsed);
    if (canonical.byteLength > ACTIVATION_AUTHORITY_MAX_PUBLIC_RESPONSE_BYTES) {
      activationAuthorityFailure(code);
    }
    completed = true;
    return Object.freeze({ canonical, value: parsed });
  } finally {
    if (!completed) zeroActivationAuthorityBytes(canonical);
  }
}

function validateStoredResponseText(value, code) {
  const stored = storedActivationAuthorityResponseText(value, code);
  try {
    return stored.value;
  } finally {
    zeroActivationAuthorityBytes(stored.canonical);
  }
}

function nullableStoredResponseText(value, code) {
  return value === null ? null : validateStoredResponseText(value, code);
}

function nullableDigest(value, code) {
  return value === null ? null : activationAuthorityDigest(value, code);
}

function nullableTimestamp(value, code) {
  return value === null ? null : exactActivationAuthorityUtcTimestamp(value, code);
}

function historicalTask15Verifier({ input, verification_time: verificationTime }) {
  if (!Number.isSafeInteger(verificationTime) || verificationTime < 0) {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_STATE_INVALID");
  }
  try {
    return verifyOperatorActivation(
      input,
      verificationTime,
      () => verifyProductionTrustedRegistry(),
    );
  } catch {
    activationAuthorityFailure(
      "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_VERIFICATION_FAILED",
      409,
    );
  }
}

function activationRequestFromChallenge(challenge) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_INVALID";
  if (!isActivationAuthorityRecord(challenge)) activationAuthorityFailure(code);
  const request = Object.fromEntries(REQUEST_KEYS.map((key) => [
    key,
    challenge[key],
  ]));
  if (Object.values(request).some((value) => value === undefined)) {
    activationAuthorityFailure(code);
  }
  return request;
}

export function createOutlookDesktopActivationReservationTask15Input(
  reservation,
  operatorEvidence = null,
) {
  const source = operatorEvidence ?? reservation;
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_INVALID";
  const existingBuffer = (owner, key, { maxBytes, minBytes = 1 }) => {
    let descriptor;
    try {
      if (!isActivationAuthorityRecord(owner)) activationAuthorityFailure(code);
      descriptor = Object.getOwnPropertyDescriptor(owner, key);
    } catch (error) {
      if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
      activationAuthorityFailure(code);
    }
    const bytes = descriptor && "value" in descriptor ? descriptor.value : null;
    if (!Buffer.isBuffer(bytes) || bytes.byteLength < minBytes
        || bytes.byteLength > maxBytes) activationAuthorityFailure(code);
    return bytes;
  };
  const operatorReceiptBytes = existingBuffer(source, "operator_receipt_bytes", {
    maxBytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  });
  const operatorSignatureBytes = existingBuffer(
    source,
    "operator_receipt_signature_bytes",
    { minBytes: 64, maxBytes: 64 },
  );
  return Object.freeze({
    activation_request: activationRequestFromChallenge(reservation.issued_challenge),
    issued_challenge: reservation.issued_challenge,
    operator_receipt_bytes: operatorReceiptBytes,
    operator_receipt_signature_bytes: operatorSignatureBytes,
    release_ticket_bytes: existingBuffer(reservation, "release_ticket_bytes", {
      maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
    }),
    release_ticket_signature_bytes: existingBuffer(
      reservation,
      "release_ticket_signature_bytes",
      { minBytes: 64, maxBytes: 64 },
    ),
  });
}

function ownedActivationAuthorityBase64(value, options, ownedBytes) {
  const bytes = canonicalActivationAuthorityBase64(value, options);
  ownedBytes.push(bytes);
  return bytes;
}

function normalizeOutlookDesktopActivationReservationOwned(value, ownedBytes) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_INVALID";
  let reservation;
  try {
    reservation = exactActivationAuthorityData(
      normalizeCoreActivationReservation(value),
      RESERVATION_KEYS,
      code,
    );
  } catch {
    activationAuthorityFailure(code);
  }
  if (reservation.schema_version
        !== "lawos.outlook-desktop-activation-reservation.v1"
      || !["issued", "evidence_attached", "authorized", "consumed"]
        .includes(reservation.state)
      || !ACTIVATION_AUTHORITY_ACTIVATION_ID.test(reservation.activation_reference)
      || !ACTIVATION_AUTHORITY_INSTALLATION_ID.test(reservation.installation_id)
      || !ISSUE_REQUEST_ID.test(reservation.issue_request_id ?? "")
      || !REGISTRATION_EVENT_ID.test(reservation.registration_event_id ?? "")) {
    activationAuthorityFailure(code);
  }
  for (const field of [
    "tenant_id", "user_id", "entra_subject_id", "release_artifact_id",
  ]) activationAuthorityText(reservation[field], code, 200);
  for (const field of [
    "device_key_fingerprint", "device_public_key_spki_sha256",
    "release_authority_sha256", "release_ticket_bytes_sha256",
    "release_ticket_owner_signature_sha256", "challenge_nonce_sha256",
    "issued_challenge_sha256", "local_measurement_evidence_sha256",
    "issue_request_sha256",
  ]) activationAuthorityDigest(reservation[field], code);
  if (reservation.device_key_fingerprint !== reservation.device_public_key_spki_sha256) {
    activationAuthorityFailure(code);
  }
  exactActivationAuthorityUtcTimestamp(reservation.issued_at, code);
  exactActivationAuthorityUtcTimestamp(reservation.valid_until, code);
  validateStoredResponseText(reservation.issue_response_text, code);
  const releaseTicketBytes = ownedActivationAuthorityBase64(
    reservation.release_ticket_base64,
    { code, maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES },
    ownedBytes,
  );
  const releaseTicketSignatureBytes = ownedActivationAuthorityBase64(
    reservation.release_ticket_signature_base64,
    { code, minBytes: 64, maxBytes: 64 },
    ownedBytes,
  );
  const issuedChallengeBytes = ownedActivationAuthorityBase64(
    reservation.issued_challenge_base64,
    { code, maxBytes: ACTIVATION_AUTHORITY_MAX_PUBLIC_RESPONSE_BYTES },
    ownedBytes,
  );
  let issuedChallengeSha256;
  try {
    issuedChallengeSha256 = outlookDesktopActivationIssuedChallengeSha256(
      reservation.issued_challenge,
    );
  } catch {
    activationAuthorityFailure(code);
  }
  const issuePublicResponseBytes = ownedActivationAuthorityBase64(
    reservation.issue_public_response_base64,
    { code, maxBytes: ACTIVATION_AUTHORITY_MAX_PUBLIC_RESPONSE_BYTES },
    ownedBytes,
  );
  const issuePublicResponse = storedActivationAuthorityResponseText(
    issuePublicResponseBytes.toString("utf8"),
    code,
  );
  ownedBytes.push(issuePublicResponse.canonical);
  if (!sameActivationAuthorityBytes(
    issuePublicResponseBytes,
    issuePublicResponse.canonical,
  )) activationAuthorityFailure(code);
  const publicPackage = exactActivationAuthorityData(
    issuePublicResponse.value,
    ISSUE_PUBLIC_RESPONSE_KEYS,
    code,
  );
  const publicReleaseAuthority = exactActivationAuthorityData(
    publicPackage.release_authority,
    ISSUE_RELEASE_AUTHORITY_KEYS,
    code,
  );
  const canonicalIssuedChallenge = canonicalBytes(reservation.issued_challenge);
  ownedBytes.push(canonicalIssuedChallenge);
  if (sha256(releaseTicketBytes) !== reservation.release_ticket_bytes_sha256
      || sha256(releaseTicketSignatureBytes)
        !== reservation.release_ticket_owner_signature_sha256
      || issuedChallengeSha256 !== reservation.issued_challenge_sha256
      || !sameActivationAuthorityBytes(
        issuedChallengeBytes,
        canonicalIssuedChallenge,
      )
      || reservation.issued_challenge.activation_id !== reservation.activation_reference
      || reservation.issued_challenge.challenge_nonce_base64url
        !== reservation.challenge_nonce_base64url
      || reservation.issued_challenge.challenge_nonce_sha256
        !== reservation.challenge_nonce_sha256
      || reservation.issued_challenge.local_measurement_evidence_sha256
        !== reservation.local_measurement_evidence_sha256
      || reservation.issued_challenge.authenticated_principal?.lawos_tenant_id
        !== reservation.tenant_id
      || reservation.issued_challenge.authenticated_principal?.lawos_user_id
        !== reservation.user_id
      || reservation.issued_challenge.authenticated_principal?.entra_subject
        !== reservation.entra_subject_id
      || reservation.issued_challenge.candidate_device
        ?.continuity_key_fingerprint_sha256 !== reservation.device_key_fingerprint
      || reservation.issued_challenge.approved_release?.release_artifact_id
        !== reservation.release_artifact_id
      || reservation.issued_challenge.approved_release?.release_ticket_sha256
        !== reservation.release_ticket_bytes_sha256
      || reservation.issued_challenge.approved_release
        ?.release_ticket_signature_sha256
          !== reservation.release_ticket_owner_signature_sha256
      || publicPackage.schema_version
        !== "lawos.outlook-desktop-activation-authority-result.v1"
      || publicPackage.activation_reference !== reservation.activation_reference
      || publicPackage.installation_id !== reservation.installation_id
      || publicPackage.issue_request_id !== reservation.issue_request_id
      || publicPackage.registration_event_id !== reservation.registration_event_id
      || publicPackage.issued_challenge_sha256
        !== reservation.issued_challenge_sha256
      || !isDeepStrictEqual(
        publicPackage.issued_challenge,
        reservation.issued_challenge,
      )
      || !ACTIVATION_AUTHORITY_SHA256.test(
        publicReleaseAuthority.authority_binding_sha256,
      )
      || publicReleaseAuthority.release_artifact_id
        !== reservation.release_artifact_id
      || publicReleaseAuthority.release_authority_sha256
        !== reservation.release_authority_sha256
      || publicReleaseAuthority.release_ticket_bytes_sha256
        !== reservation.release_ticket_bytes_sha256
      || publicReleaseAuthority.release_ticket_owner_signature_sha256
        !== reservation.release_ticket_owner_signature_sha256
      || publicReleaseAuthority.valid_until
        !== reservation.issued_challenge.approved_release.valid_until) {
    activationAuthorityFailure(code);
  }
  const attached = reservation.state !== "issued";
  const authorized = ["authorized", "consumed"].includes(reservation.state);
  const consumed = reservation.state === "consumed";
  const attachedValues = [
    reservation.operator_receipt_base64, reservation.operator_receipt_sha256,
    reservation.operator_signature_base64, reservation.operator_signature_sha256,
    reservation.owner_operator_packet_sha256, reservation.evidence_receipt_sha256,
    reservation.activation_receipt_sha256,
    reservation.attachment_request_sha256, reservation.attachment_response_text,
    reservation.attached_at, reservation.activation_replay_identity,
  ];
  const authorizedValues = [
    reservation.proof_id, reservation.idempotency_key,
    reservation.request_id, reservation.event_id,
    reservation.request_fingerprint,
    reservation.evidence_binding_sha256,
    reservation.activation_authorization_receipt_sha256,
    reservation.device_command_sha256,
    reservation.device_proof_transcript_sha256,
    reservation.device_signature_sha256,
    reservation.proof_issued_at, reservation.proof_expires_at,
    reservation.authorization_request_sha256,
    reservation.authorization_binding_sha256,
    reservation.authorization_response_text,
    reservation.authorized_at,
  ];
  if (attachedValues.some((item) => attached ? item === null : item !== null)
      || authorizedValues.some((item) => authorized ? item === null : item !== null)
      || (consumed
        ? reservation.consumed_at === null
          || !isActivationAuthorityRecord(
            reservation.lifecycle_registration_consumption,
          )
        : reservation.consumed_at !== null
          || reservation.lifecycle_registration_consumption !== null)
      || (attached
        && !isActivationAuthorityRecord(reservation.activation_replay_identity))) {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_STATE_INVALID", 409);
  }
  if (authorized
      && (reservation.request_id !== reservation.issue_request_id
        || reservation.idempotency_key !== reservation.issue_request_id
        || reservation.event_id !== reservation.registration_event_id)) {
    activationAuthorityFailure(code);
  }
  if (attached) {
    const replayIdentity = exactActivationAuthorityData(
      reservation.activation_replay_identity,
      ACTIVATION_REPLAY_IDENTITY_KEYS,
      code,
    );
    for (const field of [
      "activation_binding_sha256", "challenge_nonce_sha256",
      "replay_identity_sha256",
    ]) activationAuthorityDigest(replayIdentity[field], code);
    if (replayIdentity.activation_id !== reservation.activation_reference
        || replayIdentity.challenge_nonce_sha256
          !== reservation.challenge_nonce_sha256) {
      activationAuthorityFailure(code);
    }
  }
  if (consumed) {
    const lifecycleConsumption = exactActivationAuthorityData(
      reservation.lifecycle_registration_consumption,
      LIFECYCLE_REGISTRATION_CONSUMPTION_KEYS,
      code,
    );
    if (lifecycleConsumption.activation_reference
          !== reservation.activation_reference
        || lifecycleConsumption.installation_id !== reservation.installation_id
        || !IDENTIFIER.test(lifecycleConsumption.lifecycle_authorization_id ?? "")
        || !Number.isSafeInteger(lifecycleConsumption.resulting_state_version)
        || lifecycleConsumption.resulting_state_version < 1
        || lifecycleConsumption.consumed_at !== reservation.consumed_at) {
      activationAuthorityFailure(code);
    }
  }
  for (const field of [
    "operator_receipt_sha256", "operator_signature_sha256",
    "owner_operator_packet_sha256", "evidence_receipt_sha256",
    "evidence_binding_sha256",
    "activation_receipt_sha256", "attachment_request_sha256",
    "activation_authorization_receipt_sha256",
    "request_fingerprint",
    "device_command_sha256", "device_proof_transcript_sha256",
    "device_signature_sha256", "authorization_request_sha256",
    "authorization_binding_sha256",
  ]) nullableDigest(reservation[field], code);
  nullableStoredResponseText(reservation.attachment_response_text, code);
  nullableStoredResponseText(reservation.authorization_response_text, code);
  for (const field of [
    "proof_id", "idempotency_key", "request_id", "event_id",
  ]) {
    if (reservation[field] !== null) {
      activationAuthorityText(reservation[field], code, 200);
    }
  }
  nullableTimestamp(reservation.attached_at, code);
  nullableTimestamp(reservation.proof_issued_at, code);
  nullableTimestamp(reservation.proof_expires_at, code);
  nullableTimestamp(reservation.authorized_at, code);
  nullableTimestamp(reservation.consumed_at, code);
  let operatorReceiptBytes = null;
  let operatorSignatureBytes = null;
  if (attached) {
    operatorReceiptBytes = ownedActivationAuthorityBase64(
      reservation.operator_receipt_base64,
      { code, maxBytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES },
      ownedBytes,
    );
    operatorSignatureBytes = ownedActivationAuthorityBase64(
      reservation.operator_signature_base64,
      { code, minBytes: 64, maxBytes: 64 },
      ownedBytes,
    );
    if (sha256(operatorReceiptBytes) !== reservation.operator_receipt_sha256
        || sha256(operatorSignatureBytes) !== reservation.operator_signature_sha256
        || reservation.activation_receipt_sha256
          !== reservation.operator_receipt_sha256
        || (authorized && reservation.activation_authorization_receipt_sha256
          === reservation.activation_receipt_sha256)) {
      activationAuthorityFailure(code);
    }
  }
  const normalized = Object.freeze({
    ...reservation,
    release_ticket_bytes: releaseTicketBytes,
    release_ticket_signature_bytes: releaseTicketSignatureBytes,
    operator_receipt_bytes: operatorReceiptBytes,
    operator_receipt_signature_bytes: operatorSignatureBytes,
  });
  zeroActivationAuthorityBytes(issuedChallengeBytes);
  zeroActivationAuthorityBytes(issuePublicResponseBytes);
  zeroActivationAuthorityBytes(issuePublicResponse.canonical);
  zeroActivationAuthorityBytes(canonicalIssuedChallenge);
  return normalized;
}

export function normalizeOutlookDesktopActivationReservation(value) {
  const ownedBytes = [];
  try {
    return normalizeOutlookDesktopActivationReservationOwned(value, ownedBytes);
  } catch (error) {
    for (const bytes of ownedBytes) zeroActivationAuthorityBytes(bytes);
    throw error;
  }
}

function assertVerifiedActivationBindings(reservation, verifiedActivation) {
  const principal = verifiedActivation?.bindings?.authenticated_principal;
  const device = verifiedActivation?.bindings?.candidate_device;
  const release = verifiedActivation?.bindings?.approved_release;
  const localMeasurement =
    verifiedActivation?.bindings?.local_measurement_evidence_sha256;
  if (verifiedActivation?.valid !== true
      || verifiedActivation.activation_id !== reservation.activation_reference
      || principal?.lawos_tenant_id !== reservation.tenant_id
      || principal?.lawos_user_id !== reservation.user_id
      || principal?.entra_subject !== reservation.entra_subject_id
      || device?.continuity_key_fingerprint_sha256
        !== reservation.device_key_fingerprint
      || release?.release_artifact_id !== reservation.release_artifact_id
      || verifiedActivation.release?.release_ticket_sha256
        !== reservation.release_ticket_bytes_sha256
      || verifiedActivation.release?.release_ticket_signature_sha256
        !== reservation.release_ticket_owner_signature_sha256
      || verifiedActivation.challenge?.challenge_nonce_sha256
        !== reservation.challenge_nonce_sha256
      || verifiedActivation.operator?.receipt_sha256
        !== reservation.operator_receipt_sha256
      || verifiedActivation.operator?.receipt_signature_sha256
        !== reservation.operator_signature_sha256
      || localMeasurement !== reservation.local_measurement_evidence_sha256
      || verifiedActivation.operator?.local_measurement_evidence_sha256
        !== reservation.local_measurement_evidence_sha256) {
    activationAuthorityFailure(
      "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_BINDING_MISMATCH",
      409,
    );
  }
}

export async function assertOutlookDesktopActivationReservation({
  activation_contract: activationContract,
  historical_verifier: historicalVerifier = historicalTask15Verifier,
  reservation: rawReservation,
} = {}) {
  const reservation = normalizeOutlookDesktopActivationReservation(rawReservation);
  try {
    if (reservation.state === "issued") {
      activationAuthorityFailure(
        "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_NOT_ATTACHED",
        409,
      );
    }
    if (typeof activationContract?.verifyOperatorActivation !== "function"
        || typeof historicalVerifier !== "function") {
      activationAuthorityFailure("OUTLOOK_ACTIVATION_AUTHORITY_CONTRACT_INVALID");
    }
    const input = createOutlookDesktopActivationReservationTask15Input(reservation);
    const replay = ["authorized", "consumed"].includes(reservation.state);
    let verifiedActivation;
    try {
      verifiedActivation = replay
        ? await historicalVerifier({
          input,
          verification_time: Date.parse(reservation.authorized_at),
        })
        : await activationContract.verifyOperatorActivation(input);
    } catch (error) {
      if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
      activationAuthorityFailure(
        replay
          ? "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_VERIFICATION_FAILED"
          : "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_INVALID",
        replay ? 409 : 401,
      );
    }
    assertVerifiedActivationBindings(reservation, verifiedActivation);
    try {
      assertOutlookDesktopActivationReplayIdentity({
        stored_consumption: reservation.activation_replay_identity,
        verified_activation: verifiedActivation,
      });
    } catch {
      activationAuthorityFailure(
        "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH",
        409,
      );
    }
    return Object.freeze({
      mode: replay ? "exact_replay" : "fresh",
      activation_reference: reservation.activation_reference,
      installation_id: reservation.installation_id,
      verified_activation: verifiedActivation,
      release_authority: Object.freeze({
        release_artifact_id: reservation.release_artifact_id,
        release_authority_sha256: reservation.release_authority_sha256,
      }),
      state: reservation.state,
      issued_challenge_sha256: reservation.issued_challenge_sha256,
      local_measurement_evidence_sha256:
        reservation.local_measurement_evidence_sha256,
      authorized_at: reservation.authorized_at,
      consumed_at: reservation.consumed_at,
      reservation,
    });
  } finally {
    zeroOutlookDesktopActivationReservationBytes(reservation);
  }
}

export function assertOutlookDesktopActivationReservationProofBinding({
  current_time: currentTime,
  proof,
  proof_fingerprint_sha256: proofFingerprintSha256,
  reservation_authority: reservationAuthority,
  verified_proof: verifiedProof,
} = {}) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_BINDING_MISMATCH";
  if (!isActivationAuthorityRecord(proof)
      || !isActivationAuthorityRecord(verifiedProof)
      || !isActivationAuthorityRecord(reservationAuthority)
      || !isActivationAuthorityRecord(reservationAuthority.reservation)) {
    activationAuthorityFailure(code, 401);
  }
  const reservation = reservationAuthority.reservation;
  const verifiedActivation = reservationAuthority.verified_activation;
  const principal = verifiedActivation.bindings.authenticated_principal;
  const device = verifiedActivation.bindings.candidate_device;
  const policy = verifiedActivation.bindings.pilot_policy;
  const operator = verifiedActivation.operator;
  const challenge = verifiedActivation.challenge;
  const expectedValidationTime = reservationAuthority.mode === "exact_replay"
    ? Date.parse(reservationAuthority.authorized_at) : currentTime;
  if (!Number.isSafeInteger(expectedValidationTime) || expectedValidationTime < 0
      || proof.operation !== "register"
      || proof.tenant_id !== principal.lawos_tenant_id
      || proof.user_id !== principal.lawos_user_id
      || proof.entra_subject_id !== principal.entra_subject
      || proof.device_id !== device.continuity_key_fingerprint_sha256
      || proof.device_public_key_spki_base64
        !== device.continuity_public_key_spki
      || proof.installation_id !== reservation.installation_id
      || proof.release_authority_sha256 !== reservation.release_authority_sha256
      || proof.policy_version !== policy.policy_revision
      || proof.expected_state_version !== 1
      || !IDENTIFIER.test(proof.request_id ?? "")
      || !IDENTIFIER.test(proof.event_id ?? "")
      || !IDENTIFIER.test(proof.idempotency_key ?? "")
      || !IDENTIFIER.test(proof.proof_id ?? "")
      || proof.request_id !== reservation.issue_request_id
      || proof.idempotency_key !== reservation.issue_request_id
      || proof.event_id !== reservation.registration_event_id
      || proof.challenge_id !== reservation.activation_reference
      || proof.challenge_nonce_base64url !== reservation.challenge_nonce_base64url
      || proof.issued_challenge_sha256 !== reservation.issued_challenge_sha256
      || proof.activation_receipt_sha256 !== operator.receipt_sha256
      || proof.local_measurement_evidence_sha256
        !== reservation.local_measurement_evidence_sha256
      || verifiedProof.nonceSha256 !== challenge.challenge_nonce_sha256
      || !ACTIVATION_AUTHORITY_SHA256.test(proofFingerprintSha256 ?? "")
      || !ACTIVATION_AUTHORITY_SHA256.test(verifiedProof.rawRequestSha256 ?? "")
      || !ACTIVATION_AUTHORITY_SHA256.test(verifiedProof.signatureSha256 ?? "")
      || !ACTIVATION_AUTHORITY_SHA256.test(verifiedProof.transcriptSha256 ?? "")
      || !Number.isSafeInteger(verifiedProof.issuedAt)
      || !Number.isSafeInteger(verifiedProof.expiresAt)
      || verifiedProof.expectedStateVersion !== 1
      || proof.issued_at_epoch_ms !== String(verifiedProof.issuedAt)
      || proof.expires_at_epoch_ms !== String(verifiedProof.expiresAt)
      || verifiedProof.issuedAt > expectedValidationTime + 30_000
      || verifiedProof.expiresAt <= expectedValidationTime
      || verifiedProof.issuedAt < Date.parse(challenge.issued_at)
      || verifiedProof.issuedAt < Date.parse(operator.issued_at)
      || verifiedProof.expiresAt > Date.parse(challenge.expires_at)
      || verifiedProof.expiresAt > Date.parse(operator.expires_at)
      || verifiedProof.expiresAt > Date.parse(reservation.valid_until)) {
    activationAuthorityFailure(code, 401);
  }
  if (reservationAuthority.mode === "exact_replay"
      && (reservation.proof_id !== proof.proof_id
        || reservation.idempotency_key !== proof.idempotency_key
        || reservation.request_id !== proof.request_id
        || reservation.event_id !== proof.event_id
        || reservation.request_fingerprint !== proofFingerprintSha256
        || reservation.device_command_sha256 !== verifiedProof.rawRequestSha256
        || reservation.device_proof_transcript_sha256
          !== verifiedProof.transcriptSha256
        || reservation.device_signature_sha256 !== verifiedProof.signatureSha256
        || reservation.proof_issued_at
          !== new Date(verifiedProof.issuedAt).toISOString()
        || reservation.proof_expires_at
          !== new Date(verifiedProof.expiresAt).toISOString())) {
    activationAuthorityFailure(
      "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH",
      409,
    );
  }
  const authorization = Object.freeze({
    activation_reference: reservation.activation_reference,
    installation_id: reservation.installation_id,
    user_id: principal.lawos_user_id,
    entra_subject_id: principal.entra_subject,
    device_key_fingerprint: device.continuity_key_fingerprint_sha256,
    device_public_key_spki_sha256: device.continuity_key_fingerprint_sha256,
    challenge_nonce_sha256: verifiedProof.nonceSha256,
    issued_challenge_sha256: reservation.issued_challenge_sha256,
    evidence_binding_sha256: reservation.evidence_binding_sha256,
    proof_id: proof.proof_id,
    request_id: proof.request_id,
    event_id: proof.event_id,
    idempotency_key: proof.idempotency_key,
    request_fingerprint: proofFingerprintSha256,
    device_command_sha256: verifiedProof.rawRequestSha256,
    device_proof_transcript_sha256: verifiedProof.transcriptSha256,
    device_signature_sha256: verifiedProof.signatureSha256,
    proof_issued_at: new Date(verifiedProof.issuedAt).toISOString(),
    proof_expires_at: new Date(verifiedProof.expiresAt).toISOString(),
  });
  return Object.freeze({
    activation_reference: reservationAuthority.activation_reference,
    installation_id: reservation.installation_id,
    authorization,
    finalize_request_identity: Object.freeze({
      proof_id: proof.proof_id,
      idempotency_key: proof.idempotency_key,
      request_id: proof.request_id,
      event_id: proof.event_id,
      request_fingerprint: proofFingerprintSha256,
      device_command_sha256: verifiedProof.rawRequestSha256,
      device_proof_transcript_sha256: verifiedProof.transcriptSha256,
      device_signature_sha256: verifiedProof.signatureSha256,
      proof_issued_at: new Date(verifiedProof.issuedAt).toISOString(),
      proof_expires_at: new Date(verifiedProof.expiresAt).toISOString(),
    }),
    mode: reservationAuthority.mode,
    verified_proof: verifiedProof,
  });
}
