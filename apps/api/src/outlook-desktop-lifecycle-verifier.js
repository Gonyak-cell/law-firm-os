import { AsyncLocalStorage } from "node:async_hooks";
import { timingSafeEqual } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  createOutlookDesktopActivationContract,
} from "../../../packages/email-dms/src/outlook-desktop-activation-contract.js";
import {
  ACTIVATION_ID,
} from "../../../packages/email-dms/src/outlook-desktop-activation-schema.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import { postgresUrlFromSecret } from "./persistence-authority.js";
import {
  OutlookDesktopLifecycleVerifierError,
  assertOrderedKeys,
  createOutlookDesktopLifecycleProof,
  createOutlookDesktopLifecycleProofTranscript,
  decodeCanonicalBase64,
  lifecycleVerifierFailure,
  outlookDesktopLifecycleReceiptSha256,
  outlookDesktopLifecycleTransitionFingerprint,
  verifyOutlookDesktopLifecycleProof,
} from "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js";

export const OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA =
  "lawos.outlook-desktop-lifecycle-verifier-event.v1";
export const OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION =
  "lawos-outlook-desktop-lifecycle-verifier";
export const OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID_ENV =
  "LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID";
export const OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_TENANT_CONTEXT_SECRET_ID_ENV =
  "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID";
export const OUTLOOK_DESKTOP_LIFECYCLE_CONTROL_PORT_SCHEMA =
  "law-firm-os.outlook-desktop-lifecycle-control-port.v1";

export {
  OUTLOOK_DESKTOP_LIFECYCLE_PROOF_DOMAIN,
  OUTLOOK_DESKTOP_LIFECYCLE_PROOF_MAX_LIFETIME_MS,
  OutlookDesktopLifecycleVerifierError,
  createOutlookDesktopLifecycleProofTranscript,
  outlookDesktopLifecycleTransitionFingerprint,
} from "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js";

const EVENT_KEYS = Object.freeze([
  "schema_version",
  "action",
  "mode",
  "raw_request_body_base64",
  "authenticated_principal",
  "activation_reference",
  "proof",
  "proof_signature_base64",
]);
const AUTHENTICATED_PRINCIPAL_KEYS = Object.freeze([
  "tenant_id", "user_id", "entra_subject_id",
]);
const DATABASE_SECRET_KEYS = Object.freeze([
  "configuration_state", "password", "username",
]);
const TENANT_SECRET_KEYS = Object.freeze([
  "schema_version", "tenant_context_secret",
]);
const CONTROL_PORT_METHOD_KEYS = Object.freeze([
  "verifyLifecycleTransition",
  "issueLifecycleChallenge",
  "consumeLifecycleTransition",
]);
const REGISTRATION_CONTINUATION_INPUT_KEYS = Object.freeze([
  "continuation", "lifecycle_port", "principal",
]);
const REGISTRATION_CONTINUATION_PRINCIPAL_KEYS = Object.freeze([
  "tenant_id", "user_id", "entra_subject_id",
]);
const REGISTRATION_AUTHORIZATION_KEYS = Object.freeze([
  "installation_id", "user_id", "entra_subject_id", "device_public_key",
  "device_key_fingerprint", "platform", "app_version", "source_sha",
  "activation_authorization_id", "lifecycle_authorization_id",
  "device_command_sha256", "issued_challenge_sha256",
  "proof_transcript_sha256", "request_id", "event_id", "idempotency_key",
  "request_fingerprint", "nonce_hash", "device_signature_sha256",
  "issued_at", "expires_at",
]);
const LIFECYCLE_CONTROL_PORT_INSTANCES = new WeakSet();
const LIFECYCLE_CONTROL_PORT_INVOCATION = new AsyncLocalStorage();
const REGISTRATION_CONTINUATIONS = new WeakMap();
const IN_FLIGHT_REGISTRATION_CONTINUATIONS = new WeakSet();
const CONSUMED_REGISTRATION_CONTINUATIONS = new WeakSet();
const MINT_SQL =
  "SELECT lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt($1,$2::jsonb) AS value";
const CORE_LIFECYCLE_REPLAY_SAFE_ERROR =
  "OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REPLAY_CONFLICT";
const ACTIVATION_ASSERTION_REPLAY_SAFE_ERRORS = Object.freeze([
  "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH",
  "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_STATE_INVALID",
  "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_VERIFICATION_FAILED",
]);
const ACTIVATION_ASSERTION_SAFE_ERRORS = Object.freeze([
  "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_NOT_ATTACHED",
  ...ACTIVATION_ASSERTION_REPLAY_SAFE_ERRORS,
]);
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const ISSUE_REQUEST_ID = /^oar_[A-Za-z0-9_-]{20,128}$/u;
const REGISTRATION_EVENT_ID = /^oae_[a-f0-9]{32}$/u;
const VERSION = /^\d+[.]\d+[.]\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const CANONICAL_UTC_MILLISECONDS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 1_024 || /[\u0000-\u001f\u007f]/u.test(text)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_RUNTIME_CONFIGURATION_INVALID",
      `${label} is invalid`,
      500,
    );
  }
  return text;
}

function requiredSecretText(value, label) {
  if (typeof value !== "string"
      || value.length !== 48
      || Buffer.byteLength(value, "utf8") !== 48
      || /[\u0000-\u001f\u007f]/u.test(value)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_SECRET_AUTHORITY_INVALID",
      `${label} must contain the exact generated 48-byte value`,
      500,
    );
  }
  return value;
}

function exactKeySet(value, keys, code, label) {
  let descriptors;
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)
        || utilTypes.isProxy(value)) {
      lifecycleVerifierFailure(code, `${label} does not match its closed schema`, 500);
    }
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(code, `${label} does not match its closed schema`, 500);
  }
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)
        || !("value" in descriptors[key]))) {
    lifecycleVerifierFailure(code, `${label} does not match its closed schema`, 500);
  }
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

function snapshotOwnDataFields(value, keys, code, label, status = 401) {
  let descriptors;
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)
        || utilTypes.isProxy(value)) {
      lifecycleVerifierFailure(code, `${label} must use trusted data properties`, status);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      lifecycleVerifierFailure(code, `${label} must use trusted data properties`, status);
    }
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(code, `${label} must use trusted data properties`, status);
  }
  if (keys.some((key) => {
    const descriptor = descriptors[key];
    return !descriptor || !("value" in descriptor);
  })) {
    lifecycleVerifierFailure(code, `${label} must use trusted data properties`, status);
  }
  return Object.freeze(Object.fromEntries(
    keys.map((key) => [key, descriptors[key].value]),
  ));
}

function activationReference(value, proof) {
  if (typeof value !== "string" || value !== proof.challenge_id) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_ACTIVATION_REFERENCE_MISMATCH",
      "activation reference does not bind the signed reservation",
      401,
    );
  }
  return value;
}

async function unavailableActivationReservationLoader() {
  lifecycleVerifierFailure(
    "OUTLOOK_LIFECYCLE_ACTIVATION_RESERVATION_UNAVAILABLE",
    "protected activation reservation loader is not configured",
    503,
  );
}

function unavailableActivationReservationAssertor() {
  lifecycleVerifierFailure(
    "OUTLOOK_LIFECYCLE_ACTIVATION_ASSERTOR_UNAVAILABLE",
    "protected activation reservation assertor is not configured",
    503,
  );
}

function unavailableActivationReservationProofAssertor() {
  lifecycleVerifierFailure(
    "OUTLOOK_LIFECYCLE_ACTIVATION_ASSERTOR_UNAVAILABLE",
    "protected activation proof assertor is not configured",
    503,
  );
}

async function unavailableLifecycleChallengeLoader() {
  lifecycleVerifierFailure(
    "OUTLOOK_LIFECYCLE_CHALLENGE_UNAVAILABLE",
    "protected lifecycle challenge loader is not configured",
    503,
  );
}

function unavailableLifecycleChallengeAssertor() {
  lifecycleVerifierFailure(
    "OUTLOOK_LIFECYCLE_CHALLENGE_ASSERTOR_UNAVAILABLE",
    "protected lifecycle challenge assertor is not configured",
    503,
  );
}

function lifecycleControlPortDependencies(value) {
  let descriptors;
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_CONTROL_PORT_CONFIGURATION_INVALID",
        "lifecycle control port dependencies must use a closed object",
        500,
      );
    }
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_CONTROL_PORT_CONFIGURATION_INVALID",
      "lifecycle control port dependencies must expose data properties",
      500,
    );
  }
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== CONTROL_PORT_METHOD_KEYS.length
      || keys.some((key) => typeof key !== "string"
      || !CONTROL_PORT_METHOD_KEYS.includes(key)
      || !("value" in descriptors[key])
      || typeof descriptors[key].value !== "function")) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_CONTROL_PORT_CONFIGURATION_INVALID",
      "lifecycle control port dependencies must be exact functions",
      500,
    );
  }
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

export function createOutlookDesktopLifecycleControlPort(dependencies) {
  dependencies = lifecycleControlPortDependencies(dependencies);
  let controlPort;
  const verifyLifecycleTransition = async (input) => {
    const invocation = {
      lifecyclePort: controlPort,
      open: true,
      pendingRegistration: null,
      poisoned: false,
      registrationMintAttempt: null,
    };
    try {
      const result = await LIFECYCLE_CONTROL_PORT_INVOCATION.run(
        invocation,
        () => dependencies.verifyLifecycleTransition(input),
      );
      const pending = invocation.pendingRegistration;
      if (invocation.poisoned !== true && pending?.receipt === result) {
        REGISTRATION_CONTINUATIONS.set(result, Object.freeze({
          lifecyclePort: controlPort,
          principal: pending.principal,
          registrationAuthorization: pending.registrationAuthorization,
        }));
      }
      return result;
    } finally {
      invocation.open = false;
      invocation.pendingRegistration = null;
      invocation.registrationMintAttempt = null;
    }
  };
  controlPort = Object.freeze({
    schema_version: OUTLOOK_DESKTOP_LIFECYCLE_CONTROL_PORT_SCHEMA,
    verifyLifecycleTransition: Object.freeze(verifyLifecycleTransition),
    issueLifecycleChallenge: Object.freeze(
      (input) => dependencies.issueLifecycleChallenge(input),
    ),
    consumeLifecycleTransition: Object.freeze(
      (input) => dependencies.consumeLifecycleTransition(input),
    ),
  });
  LIFECYCLE_CONTROL_PORT_INSTANCES.add(controlPort);
  return controlPort;
}

export function assertOutlookDesktopLifecycleControlPort(value) {
  if (!LIFECYCLE_CONTROL_PORT_INSTANCES.has(value) || !Object.isFrozen(value)) {
    throw new TypeError("Outlook desktop lifecycle control port is required");
  }
  return value;
}

export function assertOutlookDesktopLifecycleRegistrationContinuation(value) {
  if (!REGISTRATION_CONTINUATIONS.has(value) || !Object.isFrozen(value)) {
    throw new TypeError(
      "Outlook desktop lifecycle registration continuation is required",
    );
  }
  return value;
}

export async function consumeOutlookDesktopLifecycleRegistrationContinuation(
  input,
) {
  input = assertOrderedKeys(
    input,
    REGISTRATION_CONTINUATION_INPUT_KEYS,
    "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_INVALID",
    "lifecycle registration continuation input",
  );
  const continuation = assertOutlookDesktopLifecycleRegistrationContinuation(
    input.continuation,
  );
  let lifecyclePort;
  try {
    lifecyclePort = assertOutlookDesktopLifecycleControlPort(input.lifecycle_port);
  } catch {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_INVALID",
      "lifecycle registration continuation port is invalid",
      500,
    );
  }
  const state = REGISTRATION_CONTINUATIONS.get(continuation);
  const principal = assertOrderedKeys(
    input.principal,
    REGISTRATION_CONTINUATION_PRINCIPAL_KEYS,
    "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_MISMATCH",
    "lifecycle registration continuation principal",
  );
  if (state.lifecyclePort !== lifecyclePort
      || !IDENTIFIER.test(principal.tenant_id ?? "")
      || !IDENTIFIER.test(principal.user_id ?? "")
      || !IDENTIFIER.test(principal.entra_subject_id ?? "")
      || principal.tenant_id !== state.principal.tenant_id
      || principal.user_id !== state.principal.user_id
      || principal.entra_subject_id !== state.principal.entra_subject_id) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_MISMATCH",
      "lifecycle registration continuation authority does not match",
      403,
      );
  }
  if (IN_FLIGHT_REGISTRATION_CONTINUATIONS.has(continuation)
      || CONSUMED_REGISTRATION_CONTINUATIONS.has(continuation)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_CONSUMED",
      "lifecycle registration continuation has already been consumed",
      409,
    );
  }
  IN_FLIGHT_REGISTRATION_CONTINUATIONS.add(continuation);
  try {
    return await lifecyclePort.consumeLifecycleTransition(Object.freeze({
      authorization: state.registrationAuthorization,
      operation: "register",
      principal,
    }));
  } catch (error) {
    throw safeInjectedDelegateFailure(error, {
      fallbackCode: "OUTLOOK_LIFECYCLE_REGISTRATION_CONSUME_FAILED",
      fallbackMessage: "lifecycle registration failed at the protected database boundary",
    });
  } finally {
    IN_FLIGHT_REGISTRATION_CONTINUATIONS.delete(continuation);
    CONSUMED_REGISTRATION_CONTINUATIONS.add(continuation);
  }
}

function authenticatedPrincipal(value, proof) {
  value = assertOrderedKeys(
    value,
    AUTHENTICATED_PRINCIPAL_KEYS,
    "OUTLOOK_LIFECYCLE_AUTHENTICATED_PRINCIPAL_INVALID",
    "authenticated principal",
  );
  if (!IDENTIFIER.test(value.tenant_id ?? "")
      || !IDENTIFIER.test(value.user_id ?? "")
      || !IDENTIFIER.test(value.entra_subject_id ?? "")
      || value.tenant_id !== proof?.tenant_id
      || value.user_id !== proof?.user_id
      || value.entra_subject_id !== proof?.entra_subject_id) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_AUTHENTICATED_PRINCIPAL_MISMATCH",
      "authenticated principal does not bind the lifecycle proof",
      401,
    );
  }
  return Object.freeze({
    entra_subject: value.entra_subject_id,
    lawos_tenant_id: value.tenant_id,
    lawos_user_id: value.user_id,
  });
}

function activationAssertionSafeCode(error) {
  try {
    if (!error || (typeof error !== "object" && typeof error !== "function")
        || utilTypes.isProxy(error)) {
      return null;
    }
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    return descriptor && "value" in descriptor
      && typeof descriptor.value === "string"
      && ACTIVATION_ASSERTION_SAFE_ERRORS.includes(descriptor.value)
      ? descriptor.value : null;
  } catch {
    return null;
  }
}

function rethrowActivationAssertion(error) {
  const safeCode = activationAssertionSafeCode(error);
  if (safeCode === "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_NOT_ATTACHED") {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_ACTIVATION_NOT_AUTHORIZED",
      "activation reservation is not authorized for lifecycle minting",
      409,
    );
  }
  if (ACTIVATION_ASSERTION_REPLAY_SAFE_ERRORS.includes(safeCode)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REPLAY_CONFLICT",
      "activation reservation conflicts with its committed replay identity",
      409,
    );
  }
  lifecycleVerifierFailure(
    "OUTLOOK_LIFECYCLE_ACTIVATION_INVALID",
    "operator-controlled activation artifacts are untrusted",
    401,
  );
}

function lifecyclePayload({ proof, requestFingerprint, upstream, verifiedProof }) {
  const proofReceiptSha256 = outlookDesktopLifecycleReceiptSha256({
    activationReplayIdentitySha256: upstream.activationReplayIdentitySha256,
    proof,
    proofReceiptExpiresAtEpochMs: proof.expires_at_epoch_ms,
    requestFingerprint,
    verifiedProof,
  });
  return Object.freeze({
    activation_authorization_id:
      proof.operation === "register" ? proof.challenge_id : null,
    device_key_fingerprint: proof.device_id,
    device_public_key_spki_sha256: proof.device_id,
    device_signature_sha256: verifiedProof.signatureSha256,
    entra_subject_id: upstream.principal.entra_subject,
    event_id: proof.event_id,
    expected_state_version: verifiedProof.expectedStateVersion,
    idempotency_key: proof.idempotency_key,
    installation_id: proof.installation_id,
    issued_challenge_sha256: proof.issued_challenge_sha256,
    lifecycle_authorization_id: proof.proof_id,
    lifecycle_challenge_id: proof.operation === "register" ? null : proof.challenge_id,
    nonce_hash: verifiedProof.nonceSha256,
    operation: proof.operation,
    proof_expires_at: new Date(verifiedProof.expiresAt).toISOString(),
    proof_issued_at: new Date(verifiedProof.issuedAt).toISOString(),
    proof_receipt_sha256: proofReceiptSha256,
    proof_transcript_sha256: verifiedProof.transcriptSha256,
    release_authority_sha256:
      proof.operation === "register" ? proof.release_authority_sha256 : null,
    request_fingerprint: requestFingerprint,
    request_id: proof.request_id,
    retire_intent_id: proof.operation === "retire" ? proof.retire_intent_id : null,
    user_id: upstream.principal.lawos_user_id,
  });
}

function lifecycleRegistrationAuthorization({
  lifecycleAuthorization,
  proof,
  proofBinding,
  reservationAuthority,
  verifiedProof,
}) {
  const code = "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH";
  const binding = snapshotOwnDataFields(
    proofBinding,
    ["authorization"],
    code,
    "trusted activation proof binding",
  );
  const activationAuthorization = snapshotOwnDataFields(
    binding.authorization,
    [
      "activation_reference", "installation_id", "user_id", "entra_subject_id",
      "device_key_fingerprint", "device_public_key_spki_sha256",
      "challenge_nonce_sha256", "issued_challenge_sha256", "proof_id",
      "request_id", "event_id", "idempotency_key", "request_fingerprint",
      "device_command_sha256", "device_proof_transcript_sha256",
      "device_signature_sha256", "proof_issued_at", "proof_expires_at",
    ],
    code,
    "trusted activation authorization",
  );
  const reservation = snapshotOwnDataFields(
    reservationAuthority,
    ["verified_activation"],
    code,
    "trusted activation reservation",
  );
  const verifiedActivation = snapshotOwnDataFields(
    reservation.verified_activation,
    ["bindings"],
    code,
    "trusted verified activation",
  );
  const bindings = snapshotOwnDataFields(
    verifiedActivation.bindings,
    ["approved_release"],
    code,
    "trusted activation bindings",
  );
  const approvedRelease = snapshotOwnDataFields(
    bindings.approved_release,
    ["platform", "app_version", "source_sha"],
    code,
    "trusted approved release",
  );
  const authorization = Object.freeze({
    installation_id: lifecycleAuthorization.installation_id,
    user_id: lifecycleAuthorization.user_id,
    entra_subject_id: lifecycleAuthorization.entra_subject_id,
    device_public_key: proof.device_public_key_spki_base64,
    device_key_fingerprint: lifecycleAuthorization.device_key_fingerprint,
    platform: approvedRelease?.platform,
    app_version: approvedRelease?.app_version,
    source_sha: approvedRelease?.source_sha,
    activation_authorization_id:
      lifecycleAuthorization.activation_authorization_id,
    lifecycle_authorization_id:
      lifecycleAuthorization.lifecycle_authorization_id,
    device_command_sha256: activationAuthorization?.device_command_sha256,
    issued_challenge_sha256:
      lifecycleAuthorization.issued_challenge_sha256,
    proof_transcript_sha256:
      lifecycleAuthorization.proof_transcript_sha256,
    request_id: lifecycleAuthorization.request_id,
    event_id: lifecycleAuthorization.event_id,
    idempotency_key: lifecycleAuthorization.idempotency_key,
    request_fingerprint: lifecycleAuthorization.request_fingerprint,
    nonce_hash: lifecycleAuthorization.nonce_hash,
    device_signature_sha256:
      lifecycleAuthorization.device_signature_sha256,
    issued_at: lifecycleAuthorization.proof_issued_at,
    expires_at: lifecycleAuthorization.proof_expires_at,
  });
  if (JSON.stringify(Object.keys(authorization))
        !== JSON.stringify(REGISTRATION_AUTHORIZATION_KEYS)
      || REGISTRATION_AUTHORIZATION_KEYS.some(
        (key) => typeof authorization[key] !== "string",
      )
      || !INSTALLATION_ID.test(authorization.installation_id)
      || !IDENTIFIER.test(authorization.user_id)
      || !IDENTIFIER.test(authorization.entra_subject_id)
      || authorization.device_public_key.length < 40
      || authorization.device_public_key.length > 512
      || !SHA256.test(authorization.device_key_fingerprint)
      || authorization.platform !== "darwin"
      || !VERSION.test(authorization.app_version)
      || !SHA1.test(authorization.source_sha)
      || !ACTIVATION_ID.test(authorization.activation_authorization_id)
      || !IDENTIFIER.test(authorization.lifecycle_authorization_id)
      || !SHA256.test(authorization.device_command_sha256)
      || !SHA256.test(authorization.issued_challenge_sha256)
      || !SHA256.test(authorization.proof_transcript_sha256)
      || !ISSUE_REQUEST_ID.test(authorization.request_id)
      || !REGISTRATION_EVENT_ID.test(authorization.event_id)
      || authorization.idempotency_key !== authorization.request_id
      || !SHA256.test(authorization.request_fingerprint)
      || !SHA256.test(authorization.nonce_hash)
      || !SHA256.test(authorization.device_signature_sha256)
      || !CANONICAL_UTC_MILLISECONDS.test(authorization.issued_at)
      || !CANONICAL_UTC_MILLISECONDS.test(authorization.expires_at)
      || lifecycleAuthorization.operation !== "register"
      || lifecycleAuthorization.expected_state_version !== 1
      || activationAuthorization?.activation_reference
        !== authorization.activation_authorization_id
      || activationAuthorization?.installation_id
        !== authorization.installation_id
      || activationAuthorization?.user_id !== authorization.user_id
      || activationAuthorization?.entra_subject_id
        !== authorization.entra_subject_id
      || activationAuthorization?.device_key_fingerprint
        !== authorization.device_key_fingerprint
      || activationAuthorization?.device_public_key_spki_sha256
        !== authorization.device_key_fingerprint
      || activationAuthorization?.challenge_nonce_sha256
        !== authorization.nonce_hash
      || activationAuthorization?.issued_challenge_sha256
        !== authorization.issued_challenge_sha256
      || activationAuthorization?.proof_id
        !== authorization.lifecycle_authorization_id
      || activationAuthorization?.request_id !== authorization.request_id
      || activationAuthorization?.event_id !== authorization.event_id
      || activationAuthorization?.idempotency_key
        !== authorization.idempotency_key
      || activationAuthorization?.request_fingerprint
        !== authorization.request_fingerprint
      || activationAuthorization?.device_command_sha256
        !== verifiedProof.rawRequestSha256
      || activationAuthorization?.device_proof_transcript_sha256
        !== authorization.proof_transcript_sha256
      || activationAuthorization?.device_signature_sha256
        !== authorization.device_signature_sha256
      || activationAuthorization?.proof_issued_at !== authorization.issued_at
      || activationAuthorization?.proof_expires_at !== authorization.expires_at) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH",
      "trusted activation cannot create the exact registration continuation",
      401,
    );
  }
  return authorization;
}

function requirePrimitiveStringFields(snapshot, keys, code, label) {
  if (keys.some((key) => typeof snapshot[key] !== "string")) {
    lifecycleVerifierFailure(code, `${label} must use primitive string data`, 401);
  }
  return snapshot;
}

function snapshotActivationReservationBinding(value) {
  const code = "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH";
  const authority = snapshotOwnDataFields(
    value,
    [
      "mode", "state", "activation_reference", "installation_id",
      "reservation", "verified_activation",
    ],
    code,
    "trusted activation reservation authority",
  );
  requirePrimitiveStringFields(
    authority,
    ["mode", "state", "activation_reference", "installation_id"],
    code,
    "trusted activation reservation authority",
  );
  const reservation = snapshotOwnDataFields(
    authority.reservation,
    ["activation_replay_identity"],
    code,
    "trusted activation reservation record",
  );
  const replayIdentity = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      reservation.activation_replay_identity,
      ["replay_identity_sha256"],
      code,
      "trusted activation replay identity",
    ),
    ["replay_identity_sha256"],
    code,
    "trusted activation replay identity",
  );
  const verifiedActivation = snapshotOwnDataFields(
    authority.verified_activation,
    ["bindings"],
    code,
    "trusted verified activation",
  );
  const bindings = snapshotOwnDataFields(
    verifiedActivation.bindings,
    ["authenticated_principal"],
    code,
    "trusted activation bindings",
  );
  const principal = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      bindings.authenticated_principal,
      ["lawos_tenant_id", "lawos_user_id", "entra_subject"],
      code,
      "trusted activation principal",
    ),
    ["lawos_tenant_id", "lawos_user_id", "entra_subject"],
    code,
    "trusted activation principal",
  );
  return Object.freeze({
    ...authority,
    reservation: Object.freeze({
      ...reservation,
      activation_replay_identity: replayIdentity,
    }),
    verified_activation: Object.freeze({
      ...verifiedActivation,
      bindings: Object.freeze({
        ...bindings,
        authenticated_principal: principal,
      }),
    }),
  });
}

function snapshotActivationProofBindingSummary(value) {
  const code = "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH";
  const binding = snapshotOwnDataFields(
    value,
    ["activation_reference", "installation_id", "mode", "verified_proof"],
    code,
    "trusted activation proof binding",
  );
  return requirePrimitiveStringFields(
    binding,
    ["activation_reference", "installation_id", "mode"],
    code,
    "trusted activation proof binding",
  );
}

function snapshotActivationReservationAuthority(value) {
  const code = "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH";
  const authority = snapshotOwnDataFields(
    value,
    [
      "mode", "state", "activation_reference", "installation_id",
      "authorized_at", "reservation", "verified_activation",
    ],
    code,
    "trusted activation reservation authority",
  );
  requirePrimitiveStringFields(
    authority,
    ["mode", "state", "activation_reference", "installation_id", "authorized_at"],
    code,
    "trusted activation reservation authority",
  );
  const reservation = snapshotOwnDataFields(
    authority.reservation,
    [
      "activation_reference", "installation_id", "release_authority_sha256",
      "issue_request_id", "registration_event_id", "challenge_nonce_base64url",
      "issued_challenge_sha256", "local_measurement_evidence_sha256",
      "valid_until", "proof_id", "idempotency_key", "request_id", "event_id",
      "request_fingerprint", "device_command_sha256",
      "device_proof_transcript_sha256", "device_signature_sha256",
      "proof_issued_at", "proof_expires_at", "evidence_binding_sha256",
      "activation_replay_identity",
    ],
    code,
    "trusted activation reservation record",
  );
  requirePrimitiveStringFields(
    reservation,
    [
      "activation_reference", "installation_id", "release_authority_sha256",
      "issue_request_id", "registration_event_id", "challenge_nonce_base64url",
      "issued_challenge_sha256", "local_measurement_evidence_sha256",
      "valid_until", "proof_id", "idempotency_key", "request_id", "event_id",
      "request_fingerprint", "device_command_sha256",
      "device_proof_transcript_sha256", "device_signature_sha256",
      "proof_issued_at", "proof_expires_at", "evidence_binding_sha256",
    ],
    code,
    "trusted activation reservation record",
  );
  const replayIdentity = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      reservation.activation_replay_identity,
      ["replay_identity_sha256"],
      code,
      "trusted activation replay identity",
    ),
    ["replay_identity_sha256"],
    code,
    "trusted activation replay identity",
  );
  const verifiedActivation = snapshotOwnDataFields(
    authority.verified_activation,
    ["bindings", "operator", "challenge"],
    code,
    "trusted verified activation",
  );
  const bindings = snapshotOwnDataFields(
    verifiedActivation.bindings,
    [
      "authenticated_principal", "candidate_device", "pilot_policy",
      "approved_release", "local_measurement_evidence_sha256",
    ],
    code,
    "trusted activation bindings",
  );
  requirePrimitiveStringFields(
    bindings,
    ["local_measurement_evidence_sha256"],
    code,
    "trusted activation bindings",
  );
  const principal = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      bindings.authenticated_principal,
      ["lawos_tenant_id", "lawos_user_id", "entra_subject"],
      code,
      "trusted activation principal",
    ),
    ["lawos_tenant_id", "lawos_user_id", "entra_subject"],
    code,
    "trusted activation principal",
  );
  const device = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      bindings.candidate_device,
      ["continuity_key_fingerprint_sha256", "continuity_public_key_spki"],
      code,
      "trusted activation device",
    ),
    ["continuity_key_fingerprint_sha256", "continuity_public_key_spki"],
    code,
    "trusted activation device",
  );
  const policy = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      bindings.pilot_policy,
      ["policy_revision"],
      code,
      "trusted activation policy",
    ),
    ["policy_revision"],
    code,
    "trusted activation policy",
  );
  const approvedRelease = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      bindings.approved_release,
      ["platform", "app_version", "source_sha"],
      code,
      "trusted approved release",
    ),
    ["platform", "app_version", "source_sha"],
    code,
    "trusted approved release",
  );
  const operator = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      verifiedActivation.operator,
      ["receipt_sha256", "issued_at", "expires_at"],
      code,
      "trusted activation operator receipt",
    ),
    ["receipt_sha256", "issued_at", "expires_at"],
    code,
    "trusted activation operator receipt",
  );
  const challenge = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      verifiedActivation.challenge,
      ["challenge_nonce_sha256", "issued_at", "expires_at"],
      code,
      "trusted activation challenge",
    ),
    ["challenge_nonce_sha256", "issued_at", "expires_at"],
    code,
    "trusted activation challenge",
  );
  return Object.freeze({
    ...authority,
    reservation: Object.freeze({
      ...reservation,
      activation_replay_identity: replayIdentity,
    }),
    verified_activation: Object.freeze({
      ...verifiedActivation,
      bindings: Object.freeze({
        ...bindings,
        authenticated_principal: principal,
        candidate_device: device,
        pilot_policy: policy,
        approved_release: approvedRelease,
      }),
      operator,
      challenge,
    }),
  });
}

function snapshotActivationProofBinding(value) {
  const code = "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH";
  const binding = snapshotOwnDataFields(
    value,
    ["activation_reference", "authorization", "installation_id", "mode", "verified_proof"],
    code,
    "trusted activation proof binding",
  );
  requirePrimitiveStringFields(
    binding,
    ["activation_reference", "installation_id", "mode"],
    code,
    "trusted activation proof binding",
  );
  const authorization = requirePrimitiveStringFields(
    snapshotOwnDataFields(
      binding.authorization,
      [
        "activation_reference", "installation_id", "user_id", "entra_subject_id",
        "device_key_fingerprint", "device_public_key_spki_sha256",
        "challenge_nonce_sha256", "issued_challenge_sha256", "proof_id",
        "request_id", "event_id", "idempotency_key", "request_fingerprint",
        "device_command_sha256", "device_proof_transcript_sha256",
        "device_signature_sha256", "proof_issued_at", "proof_expires_at",
      ],
      code,
      "trusted activation authorization",
    ),
    [
      "activation_reference", "installation_id", "user_id", "entra_subject_id",
      "device_key_fingerprint", "device_public_key_spki_sha256",
      "challenge_nonce_sha256", "issued_challenge_sha256", "proof_id",
      "request_id", "event_id", "idempotency_key", "request_fingerprint",
      "device_command_sha256", "device_proof_transcript_sha256",
      "device_signature_sha256", "proof_issued_at", "proof_expires_at",
    ],
    code,
    "trusted activation authorization",
  );
  return Object.freeze({ ...binding, authorization });
}

function reserveRegistrationMintAttempt() {
  const invocation = LIFECYCLE_CONTROL_PORT_INVOCATION.getStore();
  if (!invocation || invocation.open !== true
      || !LIFECYCLE_CONTROL_PORT_INSTANCES.has(invocation.lifecyclePort)) {
    return undefined;
  }
  const attempt = Object.freeze({
    invocation,
    primary: invocation.registrationMintAttempt === null,
  });
  if (attempt.primary) {
    invocation.registrationMintAttempt = attempt;
  } else {
    invocation.poisoned = true;
    invocation.pendingRegistration = null;
  }
  return attempt;
}

function pendingRegistrationContinuation({
  lifecycleAuthorization,
  receipt,
  registrationAuthorization,
  registrationMintAttempt,
}) {
  const invocation = LIFECYCLE_CONTROL_PORT_INVOCATION.getStore();
  if (registrationMintAttempt === undefined
      || !invocation || invocation.open !== true
      || !LIFECYCLE_CONTROL_PORT_INSTANCES.has(invocation.lifecyclePort)) {
    return receipt;
  }
  if (registrationMintAttempt.invocation !== invocation
      || registrationMintAttempt.primary !== true) {
    invocation.poisoned = true;
    invocation.pendingRegistration = null;
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_RUNTIME_CONFIGURATION_INVALID",
      "lifecycle control port invocation minted more than one registration receipt",
      500,
    );
  }
  if (invocation.poisoned === true) return receipt;
  if (invocation.registrationMintAttempt !== registrationMintAttempt
      || invocation.pendingRegistration !== null) {
    invocation.poisoned = true;
    invocation.pendingRegistration = null;
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_RUNTIME_CONFIGURATION_INVALID",
      "lifecycle control port invocation minted more than one registration receipt",
      500,
    );
  }
  invocation.pendingRegistration = Object.freeze({
    receipt,
    principal: Object.freeze({
      tenant_id: receipt.tenant_id,
      user_id: lifecycleAuthorization.user_id,
      entra_subject_id: lifecycleAuthorization.entra_subject_id,
    }),
    registrationAuthorization,
  });
  return receipt;
}

function databaseRuntimeConfig(env) {
  const port = Number(requiredText(env.LAWOS_DATABASE_PORT, "LAWOS_DATABASE_PORT"));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_RUNTIME_CONFIGURATION_INVALID",
      "LAWOS_DATABASE_PORT is invalid",
      500,
    );
  }
  return Object.freeze({
    host: requiredText(env.LAWOS_DATABASE_HOST, "LAWOS_DATABASE_HOST"),
    name: requiredText(env.LAWOS_DATABASE_NAME, "LAWOS_DATABASE_NAME"),
    port,
  });
}

function structuredSecrets({ databaseConfig, databaseSecret, tenantSecret }) {
  databaseSecret = exactKeySet(
    databaseSecret,
    DATABASE_SECRET_KEYS,
    "OUTLOOK_LIFECYCLE_DATABASE_SECRET_INVALID",
    "lifecycle database secret",
  );
  tenantSecret = exactKeySet(
    tenantSecret,
    TENANT_SECRET_KEYS,
    "OUTLOOK_LIFECYCLE_TENANT_SECRET_INVALID",
    "tenant-context secret",
  );
  if (databaseSecret.username !== "lawos_outlook_lifecycle_verifier"
      || databaseSecret.configuration_state !== "ready"
      || tenantSecret.schema_version !== "law-firm-os.tenant-context-secret.v1") {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_SECRET_AUTHORITY_INVALID",
      "lifecycle database or tenant-context secret authority drifted",
      500,
    );
  }
  const password = requiredSecretText(databaseSecret.password, "database password");
  const tenantContextSecret = requiredSecretText(
    tenantSecret.tenant_context_secret,
    "tenant-context secret material",
  );
  const passwordBytes = Buffer.from(password);
  const tenantBytes = Buffer.from(tenantContextSecret);
  if (timingSafeEqual(passwordBytes, tenantBytes)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_SECRET_AUTHORITY_INVALID",
      "database and tenant-context secret material must be distinct",
      500,
    );
  }
  return {
    connectionString: postgresUrlFromSecret(JSON.stringify({
      host: databaseConfig.host,
      port: databaseConfig.port,
      dbname: databaseConfig.name,
      username: databaseSecret.username,
      password,
    })),
    tenantContextSecret,
  };
}

function validateMintResult(result, { payload, tenantId }) {
  const expectedKeys = [
    "authorization_binding_sha256", "authorized_at",
    "lifecycle_authorization_id", "outcome", "tenant_id", "valid_until",
  ];
  result = exactKeySet(
    result,
    expectedKeys,
    "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID",
    "lifecycle mint result",
  );
  const parseCanonicalTimestamp = (value) => {
    if (typeof value !== "string" || !CANONICAL_UTC_MILLISECONDS.test(value)) return NaN;
    const milliseconds = Date.parse(value);
    return Number.isSafeInteger(milliseconds)
      && new Date(milliseconds).toISOString() === value ? milliseconds : NaN;
  };
  const authorizedAt = parseCanonicalTimestamp(result.authorized_at);
  const validUntil = parseCanonicalTimestamp(result.valid_until);
  if (expectedKeys.some((key) => typeof result[key] !== "string")
      || result.outcome !== "authorized"
      || result.tenant_id !== tenantId
      || result.lifecycle_authorization_id !== payload.lifecycle_authorization_id
      || !SHA256.test(result.authorization_binding_sha256)
      || !Number.isSafeInteger(authorizedAt)
      || !Number.isSafeInteger(validUntil)
      || validUntil !== Date.parse(payload.proof_expires_at)
      || Date.parse(payload.proof_issued_at) > authorizedAt + 30_000
      || authorizedAt >= validUntil) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID",
      "lifecycle mint result is not exact or receipt-bounded",
      500,
    );
  }
  return Object.freeze(result);
}

function ownDataErrorCodes(error) {
  try {
    if (!error || (typeof error !== "object" && typeof error !== "function")
        || utilTypes.isProxy(error)) {
      return Object.freeze({ postgresCode: null, safeErrorCode: null });
    }
    const descriptors = Object.getOwnPropertyDescriptors(error);
    const postgresCode = descriptors.postgres_code;
    const safeErrorCode = descriptors.safe_error_code;
    return Object.freeze({
      postgresCode: postgresCode && "value" in postgresCode
        && typeof postgresCode.value === "string" ? postgresCode.value : null,
      safeErrorCode: safeErrorCode && "value" in safeErrorCode
        && typeof safeErrorCode.value === "string" ? safeErrorCode.value : null,
    });
  } catch {
    return Object.freeze({ postgresCode: null, safeErrorCode: null });
  }
}

function replaySafeDatabaseError(error) {
  const { postgresCode, safeErrorCode } = ownDataErrorCodes(error);
  return postgresCode === "LLC01"
    || safeErrorCode === CORE_LIFECYCLE_REPLAY_SAFE_ERROR;
}

function safeInjectedDelegateFailure(error, { fallbackCode, fallbackMessage }) {
  if (replaySafeDatabaseError(error)) {
    return new OutlookDesktopLifecycleVerifierError(
      "OUTLOOK_LIFECYCLE_REPLAY_CONFLICT",
      "lifecycle proof conflicts with an existing opaque receipt",
      409,
    );
  }
  return new OutlookDesktopLifecycleVerifierError(
    fallbackCode,
    fallbackMessage,
    503,
  );
}

function safeDatabaseFailure(error) {
  try {
    if (error instanceof OutlookDesktopLifecycleVerifierError) return error;
  } catch {
    // Unknown database failures are sanitized below.
  }
  if (replaySafeDatabaseError(error)) {
    return new OutlookDesktopLifecycleVerifierError(
      "OUTLOOK_LIFECYCLE_REPLAY_CONFLICT",
      "lifecycle proof conflicts with an existing opaque receipt",
      409,
    );
  }
  return new OutlookDesktopLifecycleVerifierError(
    "OUTLOOK_LIFECYCLE_DATABASE_FAILED",
    "lifecycle verification failed at the protected database boundary",
    503,
  );
}

export async function executeOutlookDesktopLifecycleVerifier({
  event,
  env = process.env,
  activationContract = createOutlookDesktopActivationContract(),
  assertActivationReservation = unavailableActivationReservationAssertor,
  assertActivationReservationProofBinding =
    unavailableActivationReservationProofAssertor,
  assertLifecycleChallengeReceipt = unavailableLifecycleChallengeAssertor,
  loadActivationReservation = unavailableActivationReservationLoader,
  loadLifecycleChallenge = unavailableLifecycleChallengeLoader,
  mintLifecycleAuthorization,
  resolveSecret = resolveAwsJsonSecret,
  createPool = createPostgresPool,
  transaction = withPostgresTransaction,
} = {}) {
  const injectedMint = mintLifecycleAuthorization !== undefined;
  if (injectedMint && typeof mintLifecycleAuthorization !== "function") {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_RUNTIME_CONFIGURATION_INVALID",
      "lifecycle authorization mint delegate is invalid",
      500,
    );
  }
  event = assertOrderedKeys(
    event,
    EVENT_KEYS,
    "OUTLOOK_LIFECYCLE_EVENT_INVALID",
    "lifecycle verifier event",
  );
  if (event.schema_version !== OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA
      || event.action !== OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION
      || event.mode !== "mint") {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_EVENT_INVALID",
      "lifecycle verifier requires its exact direct-invoke event",
    );
  }
  const proof = createOutlookDesktopLifecycleProof(event.proof);
  if ((proof?.operation === "register" && event.activation_reference === null)
      || (proof?.operation !== "register" && event.activation_reference !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_ACTIVATION_SCHEMA_INVALID",
      "activation reference must exist only for registration",
    );
  }
  const principal = authenticatedPrincipal(event.authenticated_principal, proof);
  const rawRequestBody = decodeCanonicalBase64(event.raw_request_body_base64, {
    code: "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
    label: "raw request body",
    maxBytes: 64 * 1_024,
  });
  const verifiedProof = verifyOutlookDesktopLifecycleProof({
    proof,
    proofSignatureBase64: event.proof_signature_base64,
    rawRequestBody,
  });
  const reference = proof.operation === "register"
    ? activationReference(event.activation_reference, proof) : null;
  const requestFingerprint = outlookDesktopLifecycleTransitionFingerprint({ proof });
  let standaloneMint;
  if (!injectedMint) {
    const region = requiredText(
      env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
      "AWS region",
    );
    const databaseSecretId = requiredText(
      env[OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID_ENV],
      OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID_ENV,
    );
    const tenantSecretId = requiredText(
      env[OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_TENANT_CONTEXT_SECRET_ID_ENV],
      OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_TENANT_CONTEXT_SECRET_ID_ENV,
    );
    if (databaseSecretId === tenantSecretId) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_SECRET_AUTHORITY_INVALID",
        "database and tenant-context secrets must use distinct references",
        500,
      );
    }
    standaloneMint = Object.freeze({
      databaseConfig: databaseRuntimeConfig(env),
      databaseSecretId,
      region,
      tenantSecretId,
    });
  }
  let registrationProofBinding;
  let registrationReservationAuthority;
  let upstream;
  if (proof.operation === "register") {
    let storedActivation;
    try {
      storedActivation = await loadActivationReservation(Object.freeze({
        activation_reference: reference,
      }));
    } catch {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_ACTIVATION_RESERVATION_UNAVAILABLE",
        "protected activation reservation could not be rehydrated",
        503,
      );
    }
    let rawReservationAuthority;
    try {
      rawReservationAuthority = await assertActivationReservation({
        activation_contract: activationContract,
        reservation: storedActivation,
      });
    } catch (error) {
      rethrowActivationAssertion(error);
    }
    const reservationAuthority = injectedMint
      ? snapshotActivationReservationAuthority(rawReservationAuthority)
      : snapshotActivationReservationBinding(rawReservationAuthority);
    if (reservationAuthority?.mode !== "exact_replay"
        || !new Set(["authorized", "consumed"]).has(reservationAuthority?.state)) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_ACTIVATION_NOT_AUTHORIZED",
        "activation reservation is not authorized for lifecycle minting",
        409,
      );
    }
    let rawProofBinding;
    try {
      rawProofBinding = await assertActivationReservationProofBinding({
        current_time: Date.now(),
        proof,
        proof_fingerprint_sha256: requestFingerprint,
        reservation_authority: injectedMint
          ? reservationAuthority : rawReservationAuthority,
        verified_proof: verifiedProof,
      });
    } catch (error) {
      rethrowActivationAssertion(error);
    }
    const proofBinding = injectedMint
      ? snapshotActivationProofBinding(rawProofBinding)
      : snapshotActivationProofBindingSummary(rawProofBinding);
    const verifiedActivation = reservationAuthority.verified_activation;
    const activationPrincipal = verifiedActivation?.bindings?.authenticated_principal;
    const replayIdentity = reservationAuthority?.reservation
      ?.activation_replay_identity?.replay_identity_sha256;
    if (proofBinding?.mode !== "exact_replay"
        || proofBinding.verified_proof !== verifiedProof
        || reservationAuthority.activation_reference !== reference
        || reservationAuthority.installation_id !== proof.installation_id
        || proofBinding.activation_reference !== reference
        || proofBinding.installation_id !== proof.installation_id
        || activationPrincipal?.lawos_tenant_id !== principal.lawos_tenant_id
        || activationPrincipal?.lawos_user_id !== principal.lawos_user_id
        || activationPrincipal?.entra_subject !== principal.entra_subject
        || !SHA256.test(replayIdentity ?? "")) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH",
        "trusted activation does not bind the exact lifecycle proof",
        401,
      );
    }
    upstream = Object.freeze({
      activationReplayIdentitySha256: replayIdentity,
      principal: activationPrincipal,
    });
    registrationProofBinding = proofBinding;
    registrationReservationAuthority = reservationAuthority;
  } else {
    let rawChallenge;
    try {
      rawChallenge = await loadLifecycleChallenge(Object.freeze({
        challenge_id: proof.challenge_id,
        issued_challenge_sha256: proof.issued_challenge_sha256,
        operation: proof.operation,
        tenant_id: principal.lawos_tenant_id,
        user_id: principal.lawos_user_id,
        entra_subject_id: principal.entra_subject,
        installation_id: proof.installation_id,
        device_key_fingerprint: proof.device_id,
        device_public_key_spki_sha256: proof.device_id,
        expected_state_version: verifiedProof.expectedStateVersion,
        request_id: proof.request_id,
        event_id: proof.event_id,
        idempotency_key: proof.idempotency_key,
        request_fingerprint: requestFingerprint,
        raw_request_sha256: verifiedProof.rawRequestSha256,
        lifecycle_authorization_id: proof.proof_id,
        challenge_nonce_base64url: proof.challenge_nonce_base64url,
        nonce_hash: verifiedProof.nonceSha256,
        proof_transcript_sha256: verifiedProof.transcriptSha256,
        device_signature_sha256: verifiedProof.signatureSha256,
        proof_issued_at: new Date(verifiedProof.issuedAt).toISOString(),
        proof_expires_at: new Date(verifiedProof.expiresAt).toISOString(),
        retire_intent_id: proof.retire_intent_id,
        retire_reason: proof.retire_reason,
      }));
    } catch {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_CHALLENGE_UNAVAILABLE",
        "protected lifecycle challenge could not be rehydrated",
        503,
      );
    }
    let challenge;
    try {
      challenge = await assertLifecycleChallengeReceipt(rawChallenge);
    } catch (error) {
      if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_CHALLENGE_INVALID",
        "protected lifecycle challenge is untrusted",
        401,
      );
    }
    const challengeIssuedAt = Date.parse(challenge?.issued_at);
    const challengeExpiresAt = Date.parse(challenge?.valid_until);
    if (challenge?.schema_version
          !== "lawos.outlook-desktop-lifecycle-challenge.v1"
        || challenge.outcome !== "issued"
        || challenge.tenant_id !== principal.lawos_tenant_id
        || challenge.user_id !== principal.lawos_user_id
        || challenge.entra_subject_id !== principal.entra_subject
        || challenge.installation_id !== proof.installation_id
        || challenge.device_key_fingerprint !== proof.device_id
        || challenge.operation !== proof.operation
        || challenge.expected_state_version !== verifiedProof.expectedStateVersion
        || challenge.request_id !== proof.request_id
        || challenge.event_id !== proof.event_id
        || challenge.idempotency_key !== proof.idempotency_key
        || challenge.lifecycle_challenge_id !== proof.challenge_id
        || challenge.challenge_nonce_base64url !== proof.challenge_nonce_base64url
        || challenge.challenge_nonce_sha256 !== verifiedProof.nonceSha256
        || challenge.issued_challenge_sha256 !== proof.issued_challenge_sha256
        || challenge.retire_intent_id !== proof.retire_intent_id
        || !SHA256.test(challenge.release_authority_sha256 ?? "")
        || !Number.isSafeInteger(challengeIssuedAt)
        || !Number.isSafeInteger(challengeExpiresAt)
        || verifiedProof.issuedAt !== challengeIssuedAt
        || verifiedProof.expiresAt !== challengeExpiresAt) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_CHALLENGE_BINDING_MISMATCH",
        "protected lifecycle challenge does not bind the signed proof",
        401,
      );
    }
    upstream = {
      activationReplayIdentitySha256: verifiedProof.nonceBindingSha256,
      principal,
    };
  }
  const payload = lifecyclePayload({
    proof,
    requestFingerprint,
    upstream,
    verifiedProof,
  });
  const registrationAuthorization = injectedMint && proof.operation === "register"
    ? lifecycleRegistrationAuthorization({
      lifecycleAuthorization: payload,
      proof,
      proofBinding: registrationProofBinding,
      reservationAuthority: registrationReservationAuthority,
      verifiedProof,
    })
    : null;

  const tenantId = proof.tenant_id;
  if (injectedMint) {
    const registrationMintAttempt = registrationAuthorization
      ? reserveRegistrationMintAttempt() : undefined;
    let rawReceipt;
    try {
      rawReceipt = await mintLifecycleAuthorization(Object.freeze({
        authorization: payload,
      }));
    } catch (error) {
      throw safeInjectedDelegateFailure(error, {
        fallbackCode: "OUTLOOK_LIFECYCLE_DATABASE_FAILED",
        fallbackMessage: "lifecycle verification failed at the protected database boundary",
      });
    }
    const receipt = validateMintResult(rawReceipt, { payload, tenantId });
    return registrationAuthorization
      ? pendingRegistrationContinuation({
        lifecycleAuthorization: payload,
        receipt,
        registrationAuthorization,
        registrationMintAttempt,
      })
      : receipt;
  }
  const {
    databaseConfig, databaseSecretId, region, tenantSecretId,
  } = standaloneMint;
  let secrets;
  try {
    const [databaseSecret, tenantSecret] = await Promise.all([
      resolveSecret({ secretId: databaseSecretId, region }),
      resolveSecret({ secretId: tenantSecretId, region }),
    ]);
    secrets = structuredSecrets({ databaseConfig, databaseSecret, tenantSecret });
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_SECRET_READ_FAILED",
      "lifecycle verifier secrets failed at a protected boundary",
      500,
    );
  }

  let pool;
  let operationError;
  try {
    pool = createPool({
      connectionString: secrets.connectionString,
      sslMode: "verify-full",
      applicationName: "lawos-outlook-lifecycle-verifier",
      connectionTimeoutMillis: 5_000,
      statementTimeoutMillis: 15_000,
      max: 1,
      tenantContextSecret: secrets.tenantContextSecret,
    });
    const result = await transaction(pool, {
      tenant_id: tenantId,
      isolationLevel: "serializable",
      readOnly: false,
    }, async (client) => {
      const response = await client.query(MINT_SQL, [
        tenantId,
        JSON.stringify(payload),
      ]);
      if (response?.rowCount !== 1 || response.rows?.length !== 1) {
        lifecycleVerifierFailure(
          "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID",
          "lifecycle mint returned an invalid row count",
          500,
        );
      }
      return validateMintResult(response.rows[0].value, {
        payload,
        tenantId,
      });
    });
    return result;
  } catch (error) {
    operationError = safeDatabaseFailure(error);
    throw operationError;
  } finally {
    if (pool?.end) {
      try {
        await pool.end();
      } catch {
        if (!operationError) {
          lifecycleVerifierFailure(
            "OUTLOOK_LIFECYCLE_DATABASE_CLOSE_FAILED",
            "lifecycle verifier database pool did not close cleanly",
            503,
          );
        }
      }
    }
  }
}
