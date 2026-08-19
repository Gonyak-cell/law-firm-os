import {
  validateDevice,
  validatePrincipal,
} from "../../../packages/email-dms/src/outlook-desktop-activation-bindings.js";
import {
  outlookDesktopActivationIssuedChallengeSha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-challenge.js";
import {
  outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease,
  outlookDesktopActivationLocalMeasurementEvidenceSha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-local-measurement.js";
import {
  canonicalBytes,
  deepFreeze,
} from "../../../packages/email-dms/src/outlook-desktop-activation-primitives.js";
import {
  createOutlookDesktopLifecycleProof,
  outlookDesktopLifecycleTransitionFingerprint,
  verifyOutlookDesktopLifecycleProof,
} from "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js";
import {
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
  assertOutlookDesktopLifecycleControlPort,
} from "./outlook-desktop-lifecycle-verifier.js";
import {
  OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION,
  OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA,
  assertOutlookDesktopActivationControlPort,
  executeOutlookDesktopActivationAuthority,
} from "./outlook-desktop-activation-authority.js";
import {
  ACTIVATION_AUTHORITY_ACTIVATION_ID,
  ACTIVATION_AUTHORITY_INSTALLATION_ID,
  ACTIVATION_AUTHORITY_SHA256,
  activationAuthorityFailure,
  exactActivationAuthorityData,
  isActivationAuthorityRecord,
  normalizeOutlookDesktopActivationReservation,
  zeroOutlookDesktopActivationReservationBytes,
} from "./outlook-desktop-activation-authority-reservation.js";

export const OUTLOOK_DESKTOP_ACTIVATION_SERVICE_AUTHORITY =
  "outlook-desktop-activation-registration-authority";
export const OUTLOOK_DESKTOP_ACTIVATION_SERVICE_SCHEMA =
  "law-firm-os.outlook-desktop-activation-service.v1";

const FACTORY_KEYS = Object.freeze([
  "activation_contract", "clock", "control_port", "env", "lifecycle_port",
]);
const ISSUE_INPUT_KEYS = Object.freeze([
  "principal", "candidate_device", "issue_request_id",
]);
const READ_INPUT_KEYS = Object.freeze([
  "activation_reference", "authenticated_principal",
]);
const CONSUME_INPUT_KEYS = Object.freeze(["principal", "submission"]);
const SIGNED_SESSION_PRINCIPAL_KEYS = Object.freeze([
  "tenant_id", "user_id", "entra_subject_id", "entra_tenant_id",
]);
const SUBMISSION_KEYS = Object.freeze([
  "activation_reference", "raw_request_body_base64", "proof",
  "proof_signature_base64",
]);
const INTERNAL_ISSUE_RESULT_KEYS = Object.freeze([
  "activation_reference", "installation_id", "issue_request_id", "issued_challenge",
  "issued_challenge_sha256", "registration_event_id", "release_authority",
  "schema_version",
]);
const REGISTRATION_EVENT_ID = /^oae_[a-f0-9]{32}$/u;
const ISSUE_REQUEST_ID = /^oar_[A-Za-z0-9_-]{20,128}$/u;
const RELEASE_AUTHORITY_KEYS = Object.freeze([
  "release_artifact_id", "release_authority_sha256",
  "release_ticket_bytes_sha256", "release_ticket_owner_signature_sha256",
  "authority_binding_sha256", "valid_until",
]);

function exactOptions(value) {
  if (value === undefined) return {};
  if (!isActivationAuthorityRecord(value)) {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_CONFIGURATION_INVALID");
  }
  let keys;
  try {
    keys = Reflect.ownKeys(Object.getOwnPropertyDescriptors(value));
  } catch {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_CONFIGURATION_INVALID");
  }
  return exactActivationAuthorityData(
    value,
    keys,
    "OUTLOOK_ACTIVATION_SERVICE_CONFIGURATION_INVALID",
  );
}

function factoryOptions(value) {
  const options = exactOptions(value);
  if (Object.keys(options).some((key) => !FACTORY_KEYS.includes(key))) {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_CONFIGURATION_INVALID");
  }
  if (["activation_contract", "clock"]
    .some((key) => options[key] !== undefined)
      && process.env.NODE_ENV !== "test") {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_TEST_OVERRIDE_FORBIDDEN");
  }
  return options;
}

function lifecyclePort(value) {
  try {
    return assertOutlookDesktopLifecycleControlPort(value);
  } catch {
    activationAuthorityFailure("OUTLOOK_LIFECYCLE_CONTROL_PORT_INVALID");
  }
}

function zeroServiceBytes(value) {
  try {
    if (Buffer.isBuffer(value)) value.fill(0);
  } catch {
    // Cleanup must not replace the protected boundary result.
  }
}

function canonicalResult(value, code) {
  let canonical;
  try {
    if (!Buffer.isBuffer(value) || value.byteLength < 1
        || value.byteLength > 128 * 1_024) activationAuthorityFailure(code);
    let parsed;
    try {
      parsed = JSON.parse(value.toString("utf8"));
    } catch {
      activationAuthorityFailure(code);
    }
    canonical = canonicalBytes(parsed);
    if (!canonical.equals(value)) activationAuthorityFailure(code);
    return deepFreeze(parsed);
  } finally {
    zeroServiceBytes(canonical);
    zeroServiceBytes(value);
  }
}

function lifecycleControlEvent(principal, submission) {
  return Object.freeze({
    schema_version: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
    action: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
    mode: "mint",
    raw_request_body_base64: submission.raw_request_body_base64,
    authenticated_principal: Object.freeze({
      tenant_id: principal.lawos_tenant_id,
      user_id: principal.lawos_user_id,
      entra_subject_id: principal.entra_subject,
    }),
    activation_reference: submission.activation_reference,
    proof: submission.proof,
    proof_signature_base64: submission.proof_signature_base64,
  });
}

function normalizeSubmission(value) {
  const submission = exactActivationAuthorityData(
    value,
    SUBMISSION_KEYS,
    "OUTLOOK_ACTIVATION_SERVICE_SUBMISSION_INVALID",
  );
  if (typeof submission.activation_reference !== "string"
      || !ACTIVATION_AUTHORITY_ACTIVATION_ID.test(submission.activation_reference)
      || !isActivationAuthorityRecord(submission.proof)) {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_SUBMISSION_INVALID", 400);
  }
  let proof;
  try {
    proof = createOutlookDesktopLifecycleProof(submission.proof);
  } catch {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_SUBMISSION_INVALID", 400);
  }
  return Object.freeze({ ...submission, proof });
}

function task15Principal(value) {
  const principal = exactActivationAuthorityData(
    value,
    SIGNED_SESSION_PRINCIPAL_KEYS,
    "OUTLOOK_ACTIVATION_SERVICE_PRINCIPAL_INVALID",
  );
  try {
    return Object.freeze(validatePrincipal({
      lawos_tenant_id: principal.tenant_id,
      lawos_user_id: principal.user_id,
      entra_subject: principal.entra_subject_id,
      entra_tenant_id: principal.entra_tenant_id,
    }));
  } catch {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_PRINCIPAL_INVALID", 401);
  }
}

function verifyLocalMeasurement({ approved_release: approvedRelease, expected_sha256: expected }) {
  const actual = outlookDesktopActivationLocalMeasurementEvidenceSha256(
    outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(approvedRelease),
  );
  if (actual !== expected) {
    activationAuthorityFailure("OUTLOOK_ACTIVATION_AUTHORITY_MEASUREMENT_INVALID", 401);
  }
  return Object.freeze({ local_measurement_evidence_sha256: actual });
}

function registrationReservationMatches(reservation, principal, proof) {
  const issuedChallenge = reservation.issued_challenge;
  return ["authorized", "consumed"].includes(reservation.state)
    && proof.operation === "register"
    && proof.expected_state_version === 1
    && proof.tenant_id === reservation.tenant_id
    && proof.user_id === reservation.user_id
    && proof.entra_subject_id === reservation.entra_subject_id
    && reservation.activation_reference === proof.challenge_id
    && reservation.installation_id === proof.installation_id
    && reservation.issue_request_id === proof.request_id
    && reservation.issue_request_id === proof.idempotency_key
    && reservation.registration_event_id === proof.event_id
    && reservation.issued_challenge_sha256 === proof.issued_challenge_sha256
    && reservation.activation_receipt_sha256 === proof.activation_receipt_sha256
    && reservation.local_measurement_evidence_sha256
      === proof.local_measurement_evidence_sha256
    && reservation.release_authority_sha256 === proof.release_authority_sha256
    && reservation.device_key_fingerprint === proof.device_id
    && issuedChallenge.candidate_device.continuity_public_key_spki
      === proof.device_public_key_spki_base64
    && reservation.tenant_id === principal.lawos_tenant_id
    && reservation.user_id === principal.lawos_user_id
    && reservation.entra_subject_id === principal.entra_subject;
}

export function createOutlookDesktopActivationService(value = {}) {
  const options = factoryOptions(value);
  const controlPort = assertOutlookDesktopActivationControlPort(options.control_port);
  const closedLifecyclePort = lifecyclePort(options.lifecycle_port);
  const env = options.env ?? process.env;
  const execute = (event, principal) => executeOutlookDesktopActivationAuthority({
    env,
    event,
    control_port: controlPort,
    resolve_authenticated_principal: async () => principal,
    lifecycle_transition_fingerprint: (proof) => (
      outlookDesktopLifecycleTransitionFingerprint({ proof })
    ),
    verify_lifecycle_proof: verifyOutlookDesktopLifecycleProof,
    verify_operator_measurement: verifyLocalMeasurement,
    ...(options.activation_contract === undefined
      ? {} : { activation_contract: options.activation_contract }),
    ...(options.clock === undefined ? {} : { clock: options.clock }),
  });

  const issueChallenge = async (value) => {
    const input = exactActivationAuthorityData(
      value,
      ISSUE_INPUT_KEYS,
      "OUTLOOK_ACTIVATION_SERVICE_ISSUE_INPUT_INVALID",
    );
    const principal = task15Principal(input.principal);
    if (!ISSUE_REQUEST_ID.test(input.issue_request_id ?? "")) {
      activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_ISSUE_INPUT_INVALID", 400);
    }
    let candidateDevice;
    try {
      candidateDevice = Object.freeze(validateDevice(input.candidate_device));
    } catch {
      activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_ISSUE_INPUT_INVALID", 400);
    }
    const internal = canonicalResult(await execute(Object.freeze({
      schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA,
      action: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION,
      operation: "issue",
      request: Object.freeze({
        candidate_device: candidateDevice,
        issue_request_id: input.issue_request_id,
      }),
    }), principal), "OUTLOOK_ACTIVATION_SERVICE_ISSUE_RESULT_INVALID");
    const result = exactActivationAuthorityData(
      internal,
      INTERNAL_ISSUE_RESULT_KEYS,
      "OUTLOOK_ACTIVATION_SERVICE_ISSUE_RESULT_INVALID",
    );
    const releaseAuthority = exactActivationAuthorityData(
      result.release_authority,
      RELEASE_AUTHORITY_KEYS,
      "OUTLOOK_ACTIVATION_SERVICE_ISSUE_RESULT_INVALID",
    );
    let issuedChallengeSha256;
    try {
      issuedChallengeSha256 = outlookDesktopActivationIssuedChallengeSha256(
        result.issued_challenge,
      );
    } catch {
      activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_ISSUE_RESULT_INVALID");
    }
    if (!ACTIVATION_AUTHORITY_ACTIVATION_ID.test(result.activation_reference ?? "")
        || !ACTIVATION_AUTHORITY_INSTALLATION_ID.test(result.installation_id ?? "")
        || result.issue_request_id !== input.issue_request_id
        || !REGISTRATION_EVENT_ID.test(result.registration_event_id ?? "")
        || !ACTIVATION_AUTHORITY_SHA256.test(result.issued_challenge_sha256 ?? "")
        || !ACTIVATION_AUTHORITY_SHA256.test(
          releaseAuthority.release_authority_sha256 ?? "",
        )
        || result.issued_challenge_sha256 !== issuedChallengeSha256) {
      activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_ISSUE_RESULT_INVALID");
    }
    return deepFreeze({
      activation_reference: result.activation_reference,
      installation_id: result.installation_id,
      issued_challenge: result.issued_challenge,
      issued_challenge_sha256: result.issued_challenge_sha256,
      release_authority_sha256: releaseAuthority.release_authority_sha256,
    });
  };

  const readActivationProofSeed = async (value) => {
    const input = exactActivationAuthorityData(
      value,
      READ_INPUT_KEYS,
      "OUTLOOK_ACTIVATION_SERVICE_READ_INPUT_INVALID",
    );
    const principal = task15Principal(input.authenticated_principal);
    return canonicalResult(await execute(Object.freeze({
      schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA,
      action: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION,
      operation: "read_proof_seed",
      request: Object.freeze({ activation_reference: input.activation_reference }),
    }), principal), "OUTLOOK_ACTIVATION_SERVICE_READ_RESULT_INVALID");
  };

  const consumeRegistration = async (value) => {
    const input = exactActivationAuthorityData(
      value,
      CONSUME_INPUT_KEYS,
      "OUTLOOK_ACTIVATION_SERVICE_CONSUME_INPUT_INVALID",
    );
    const principal = task15Principal(input.principal);
    const submission = normalizeSubmission(input.submission);
    canonicalResult(await execute(Object.freeze({
      schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA,
      action: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION,
      operation: "finalize",
      request: submission,
    }), principal), "OUTLOOK_ACTIVATION_SERVICE_CONSUME_RESULT_INVALID");

    const reservation = normalizeOutlookDesktopActivationReservation(
      await controlPort.loadActivationReservation(Object.freeze({
        activation_reference: submission.activation_reference,
      })),
    );
    try {
      if (reservation.activation_reference !== submission.activation_reference
          || !registrationReservationMatches(
            reservation,
            principal,
            submission.proof,
          )) {
        activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_TOCTOU_CONFLICT", 409);
      }
      const authorization = await closedLifecyclePort.verifyLifecycleTransition(
        lifecycleControlEvent(principal, submission),
      );
      if (!isActivationAuthorityRecord(authorization)
          || !Object.isFrozen(authorization)) {
        activationAuthorityFailure("OUTLOOK_ACTIVATION_SERVICE_AUTHORIZATION_INVALID");
      }
      return Object.freeze({ authorization });
    } finally {
      zeroOutlookDesktopActivationReservationBytes(reservation);
    }
  };

  return Object.freeze({
    authority: OUTLOOK_DESKTOP_ACTIVATION_SERVICE_AUTHORITY,
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_SERVICE_SCHEMA,
    issueChallenge,
    readActivationProofSeed,
    consumeRegistration,
    issueLifecycleChallenge: (input) => (
      closedLifecyclePort.issueLifecycleChallenge(input)
    ),
    consumeLifecycleTransition: (input) => (
      closedLifecyclePort.consumeLifecycleTransition(input)
    ),
  });
}
