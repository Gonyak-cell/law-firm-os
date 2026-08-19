import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  ACTIVATION_ID,
  CHALLENGE_KEYS,
  POLICY_KEYS,
  PRINCIPAL_KEYS,
  RELEASE_KEYS,
  OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA,
  OUTLOOK_DESKTOP_ACTIVATION_MODE,
} from "../../../packages/email-dms/src/outlook-desktop-activation-schema.js";
import {
  outlookDesktopActivationIssuedChallengeSha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-challenge.js";
import {
  OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS,
  createOutlookDesktopLifecycleProof,
  parseOutlookDesktopLifecycleTransitionCommand,
} from "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js";
import {
  evaluateOutlookDesktopLifecycleAuthority,
  projectOutlookDesktopRegistrationAuthorityResult,
} from "./outlook-desktop-installation-runtime-context.js";
import {
  assertOutlookDesktopLifecycleRegistrationContinuation,
  consumeOutlookDesktopLifecycleRegistrationContinuation,
} from "./outlook-desktop-lifecycle-verifier.js";
import { outlookDesktopPrincipalRef } from "./session-auth.js";

export const OUTLOOK_DESKTOP_ACTIVATION_MAX_BODY_BYTES = 256 * 1024;
export const OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH =
  "/api/desktop/activation-challenges";
export const OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH =
  "/api/desktop/activation-proof-seeds";
export const OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH =
  "/api/desktop/activation-consumptions";
export const OUTLOOK_DESKTOP_ACTIVATION_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "outlook-desktop-activation",
  contract_schema_version: "lawos.outlook-desktop-activation-api.v1",
  endpoints: Object.freeze([
    `POST ${OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH}`,
    `POST ${OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH}`,
    `POST ${OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH}`,
  ]),
  challenge_authority: "server-resolved-current-release-and-roster",
  verifier_authority: "isolated-lifecycle-verifier",
  registration_authority: "postgres-007-security-definer",
  raw_artifact_material_returned: false,
  token_material_returned: false,
  production_ready_claim: false,
  fail_closed: true,
});

const CHALLENGE_REQUEST_FIELDS = Object.freeze(["candidate_device"]);
const PROOF_SEED_REQUEST_FIELDS = Object.freeze(["activation_reference"]);
const CANDIDATE_DEVICE_FIELDS = Object.freeze([
  "continuity_key_fingerprint_sha256",
  "continuity_public_key_spki",
]);
const CONSUMPTION_FIELDS = Object.freeze([
  "activation_reference", "raw_request_body_base64", "proof",
  "proof_signature_base64",
]);
const ACTIVATION_RESULT_FIELDS = Object.freeze([
  "activation_reference", "installation_id", "issued_challenge",
  "issued_challenge_sha256", "release_authority_sha256",
]);
const PROOF_SEED_PENDING_FIELDS = Object.freeze([
  "status", "activation_reference", "installation_id", "valid_until",
]);
const PROOF_SEED_READY_FIELDS = Object.freeze([
  "status", "activation_reference", "installation_id",
  "activation_receipt_sha256", "local_measurement_evidence_sha256",
  "release_authority_sha256", "issued_challenge_sha256", "valid_until",
  "event_id",
]);
const CONSUMPTION_RESULT_FIELDS = Object.freeze(["authorization"]);
const SHA256 = /^[a-f0-9]{64}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const ACTIVATION_REFERENCE = /^oda_[A-Za-z0-9_-]{20,128}$/u;
const ISSUE_REQUEST_ID = /^oar_[A-Za-z0-9_-]{20,128}$/u;
const REGISTER_EVENT_ID = /^oae_[a-f0-9]{32}$/u;
const ENTRA_TENANT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const RFC3339_MILLISECONDS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.]\d{3}Z$/u;
const PUBLIC_ERROR_CODE =
  /^(?:AUTH_SESSION_REQUIRED|OUTLOOK_DESKTOP_[A-Z0-9_]+)$/u;
const PUBLIC_ERROR_STATUSES = new Set([400, 401, 403, 404, 409, 413, 503]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value, expected) {
  return isPlainObject(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...expected].sort());
}

function response(status, requestId, {
  outcome = "blocked",
  safeErrorCodes = [],
  issuedChallenge,
  issuedChallengeSha256,
  installationId,
  releaseAuthoritySha256,
  principalRef,
  proofSeed,
  activationReference,
  installation,
} = {}) {
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: String(requestId ?? "request-outlook-desktop-activation"),
      outcome,
      ...(issuedChallenge === undefined ? {} : {
        activation_reference: activationReference,
        installation_id: installationId,
        outlook_desktop_principal_ref: principalRef,
        issued_challenge: issuedChallenge,
        issued_challenge_sha256: issuedChallengeSha256,
        release_authority_sha256: releaseAuthoritySha256,
      }),
      ...(installation === undefined ? {} : {
        activation_reference: activationReference,
        installation,
      }),
      ...(proofSeed === undefined ? {} : proofSeed),
      safe_error_codes: Object.freeze([...safeErrorCodes]),
      raw_artifact_material_returned: false,
      token_material_returned: false,
      private_key_material_returned: false,
      production_ready_claim: false,
    }),
  });
}

function failure(status, requestId, safeErrorCode) {
  return response(status, requestId, { safeErrorCodes: [safeErrorCode] });
}

function requestBodyBytes(body) {
  try {
    return Buffer.byteLength(JSON.stringify(body), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function activationIssueRequestId(headers) {
  try {
    const values = Object.entries(headers ?? {})
      .filter(([key]) => key.toLowerCase() === "idempotency-key")
      .map(([, value]) => value);
    return values.length === 1
      && typeof values[0] === "string"
      && ISSUE_REQUEST_ID.test(values[0])
      ? values[0]
      : null;
  } catch {
    return null;
  }
}

function decodeCanonicalBase64(value, { minBytes = 1, maxBytes }) {
  if (typeof value !== "string" || !BASE64.test(value)) return null;
  const bytes = Buffer.from(value, "base64");
  return bytes.byteLength >= minBytes
    && bytes.byteLength <= maxBytes
    && bytes.toString("base64") === value
    ? bytes
    : null;
}

function registrationTransition(body) {
  const rawRequestBody = decodeCanonicalBase64(
    body?.raw_request_body_base64,
    { maxBytes: 64 * 1024 },
  );
  if (!rawRequestBody
      || !isPlainObject(body?.proof)
      || JSON.stringify(Object.keys(body.proof))
        !== JSON.stringify(OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS)) {
    return null;
  }
  try {
    const proof = createOutlookDesktopLifecycleProof(body.proof);
    if (proof.operation !== "register") return null;
    const command = parseOutlookDesktopLifecycleTransitionCommand({
      proof,
      rawRequestBody,
    });
    return Object.freeze({ command, proof });
  } catch {
    return null;
  }
}

function exactTimestamp(value) {
  if (typeof value !== "string" || !RFC3339_MILLISECONDS.test(value)) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isSafeInteger(milliseconds)
    && new Date(milliseconds).toISOString() === value;
}

function boundedProofSeed(value, activationReference) {
  const pending = value?.status === "pending";
  const expected = pending
    ? PROOF_SEED_PENDING_FIELDS
    : PROOF_SEED_READY_FIELDS;
  if (!exactFields(value, expected)
      || value.activation_reference !== activationReference
      || !ACTIVATION_REFERENCE.test(value.activation_reference ?? "")
      || !INSTALLATION_ID.test(value.installation_id ?? "")
      || !exactTimestamp(value.valid_until)) {
    return null;
  }
  if (pending) {
    return Object.freeze({
      status: "pending",
      activation_reference: value.activation_reference,
      installation_id: value.installation_id,
      valid_until: value.valid_until,
    });
  }
  if (value.status !== "ready" || ![
    value.activation_receipt_sha256,
    value.local_measurement_evidence_sha256,
    value.release_authority_sha256,
    value.issued_challenge_sha256,
  ].every((digest) => SHA256.test(digest ?? ""))
      || !REGISTER_EVENT_ID.test(value.event_id ?? "")) {
    return null;
  }
  return Object.freeze({
    status: "ready",
    activation_reference: value.activation_reference,
    installation_id: value.installation_id,
    activation_receipt_sha256: value.activation_receipt_sha256,
    local_measurement_evidence_sha256:
      value.local_measurement_evidence_sha256,
    release_authority_sha256: value.release_authority_sha256,
    issued_challenge_sha256: value.issued_challenge_sha256,
    valid_until: value.valid_until,
    event_id: value.event_id,
  });
}

function validCandidateDevice(value) {
  if (!exactFields(value, CANDIDATE_DEVICE_FIELDS)
      || !SHA256.test(value.continuity_key_fingerprint_sha256 ?? "")) {
    return false;
  }
  const publicKey = decodeCanonicalBase64(value.continuity_public_key_spki, {
    minBytes: 44,
    maxBytes: 44,
  });
  return Boolean(
    publicKey
      && publicKey.subarray(0, 12).toString("hex")
        === "302a300506032b6570032100"
      && createHash("sha256").update(publicKey).digest("hex")
        === value.continuity_key_fingerprint_sha256,
  );
}

function boundPrincipal(principal, runtime) {
  if (!ENTRA_TENANT.test(runtime?.entra_tenant_id ?? "")) return null;
  return Object.freeze({
    tenant_id: principal.tenant_id,
    user_id: principal.user_id,
    entra_subject_id: principal.entra_subject_id,
    entra_tenant_id: runtime.entra_tenant_id,
  });
}

function task15PrincipalMatches(value, principal) {
  return exactFields(value, PRINCIPAL_KEYS)
    && value.lawos_tenant_id === principal.tenant_id
    && value.lawos_user_id === principal.user_id
    && value.entra_subject === principal.entra_subject_id
    && value.entra_tenant_id === principal.entra_tenant_id;
}

function validIssuedChallenge(value, { candidateDevice, principal }) {
  let issuedChallengeSha256;
  try {
    issuedChallengeSha256 =
      outlookDesktopActivationIssuedChallengeSha256(value);
  } catch {
    return null;
  }
  if (!exactFields(value, CHALLENGE_KEYS)
      || value.schema_version !== OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA
      || value.activation_mode !== OUTLOOK_DESKTOP_ACTIVATION_MODE
      || !ACTIVATION_ID.test(value.activation_id ?? "")
      || value.hardware_key_attested !== false
      || value.mdm_attested !== false
      || value.remote_app_attested !== false
      || !task15PrincipalMatches(value.authenticated_principal, principal)
      || !exactFields(value.approved_release, RELEASE_KEYS)
      || !exactFields(value.pilot_policy, POLICY_KEYS)
      || !validCandidateDevice(value.candidate_device)
      || !isDeepStrictEqual(value.candidate_device, candidateDevice)
      || value.approved_release?.tenant_id !== principal.tenant_id
      || !BASE64URL.test(value.challenge_nonce_base64url ?? "")
      || !SHA256.test(value.challenge_nonce_sha256 ?? "")
      || !SHA256.test(value.activation_binding_sha256 ?? "")) {
    return null;
  }
  const nonce = Buffer.from(value.challenge_nonce_base64url, "base64url");
  return nonce.byteLength === 32
    && nonce.toString("base64url") === value.challenge_nonce_base64url
    && createHash("sha256").update(nonce).digest("hex")
      === value.challenge_nonce_sha256
    ? issuedChallengeSha256
    : null;
}

function validRegistrationProof(proof, principal) {
  return exactFields(proof, OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS)
    && proof.operation === "register"
    && proof.tenant_id === principal.tenant_id
    && proof.user_id === principal.user_id
    && proof.entra_subject_id === principal.entra_subject_id
    && REGISTER_EVENT_ID.test(proof.event_id ?? "");
}

function validConsumptionEncoding(body, transition) {
  return exactFields(body, CONSUMPTION_FIELDS)
    && ACTIVATION_REFERENCE.test(body.activation_reference ?? "")
    && Boolean(transition)
    && REGISTER_EVENT_ID.test(transition?.proof.event_id ?? "")
    && Boolean(decodeCanonicalBase64(body.proof_signature_base64, {
      minBytes: 64,
      maxBytes: 64,
    }));
}

function validConsumptionBinding(body, principal, transition) {
  return Boolean(transition)
    && body.activation_reference === transition.proof.challenge_id
    && validRegistrationProof(transition.proof, principal);
}

function mappedFailure(error, requestId) {
  const candidateCode = String(error?.safe_error_code ?? error?.code ?? "");
  const safeErrorCode = PUBLIC_ERROR_CODE.test(candidateCode)
    ? candidateCode
    : "OUTLOOK_DESKTOP_ACTIVATION_FAILED";
  const status = safeErrorCode === "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_INVALID"
    ? 403
    : safeErrorCode === "OUTLOOK_DESKTOP_ACTIVATION_EXPIRED"
      ? 409
      : PUBLIC_ERROR_STATUSES.has(Number(error?.status))
        ? Number(error.status)
        : 503;
  return failure(status, requestId, safeErrorCode);
}

export function isOutlookDesktopActivationApiPath(pathname) {
  return pathname === OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH
    || pathname === OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH
    || pathname === OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH;
}

export function mapOutlookDesktopActivationRequestBodyError(error, requestId) {
  return error?.status === 413
    ? failure(413, requestId, "OUTLOOK_DESKTOP_ACTIVATION_REQUEST_TOO_LARGE")
    : failure(400, requestId, "OUTLOOK_DESKTOP_ACTIVATION_REQUEST_INVALID");
}

export async function handleOutlookDesktopActivationApiRequest({
  pathname,
  method,
  body = {},
  headers = {},
  principal,
  context,
  requestId,
  runtime,
} = {}) {
  if (!isOutlookDesktopActivationApiPath(pathname)) {
    return failure(404, requestId, "OUTLOOK_DESKTOP_ACTIVATION_NOT_FOUND");
  }
  if (method !== "POST") {
    return failure(405, requestId, "OUTLOOK_DESKTOP_ACTIVATION_METHOD_NOT_ALLOWED");
  }
  if (!principal) return failure(401, requestId, "AUTH_SESSION_REQUIRED");
  if (requestBodyBytes(body) > OUTLOOK_DESKTOP_ACTIVATION_MAX_BODY_BYTES) {
    return failure(413, requestId, "OUTLOOK_DESKTOP_ACTIVATION_REQUEST_TOO_LARGE");
  }
  const operation = pathname === OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH
    ? "issueChallenge"
    : pathname === OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH
      ? "readActivationProofSeed"
      : "consumeRegistration";
  const issueRequestId = operation === "issueChallenge"
    ? activationIssueRequestId(headers)
    : null;
  const bodyValid = operation === "issueChallenge"
    ? exactFields(body, CHALLENGE_REQUEST_FIELDS)
      && validCandidateDevice(body.candidate_device)
      && issueRequestId !== null
    : operation === "readActivationProofSeed"
      ? exactFields(body, PROOF_SEED_REQUEST_FIELDS)
        && ACTIVATION_REFERENCE.test(body.activation_reference ?? "")
      : exactFields(body, CONSUMPTION_FIELDS);
  if (!bodyValid) {
    return failure(400, requestId, "OUTLOOK_DESKTOP_ACTIVATION_REQUEST_INVALID");
  }
  const consumptionTransition = operation === "consumeRegistration"
    ? registrationTransition(body)
    : null;
  if (operation === "consumeRegistration"
      && !validConsumptionEncoding(body, consumptionTransition)) {
    return failure(400, requestId, "OUTLOOK_DESKTOP_ACTIVATION_REQUEST_INVALID");
  }
  const targetId = operation === "issueChallenge"
    ? "NEW"
    : operation === "readActivationProofSeed"
      ? "ACTIVATION_PROOF_SEED"
      : body.proof?.installation_id;
  const authority = evaluateOutlookDesktopLifecycleAuthority({
    principal,
    context,
    roster: runtime?.entitlement_roster,
    targetId,
  });
  if (!authority.allowed) {
    return failure(authority.status, requestId, authority.safe_error_code);
  }
  const serverPrincipal = boundPrincipal(principal, runtime);
  if (!serverPrincipal) {
    return failure(
      503,
      requestId,
      "OUTLOOK_DESKTOP_ACTIVATION_RUNTIME_UNAVAILABLE",
    );
  }
  const service = runtime?.activation_service;
  if (!service || typeof service[operation] !== "function") {
    return failure(
      503,
      requestId,
      "OUTLOOK_DESKTOP_ACTIVATION_RUNTIME_UNAVAILABLE",
    );
  }
  if (operation === "issueChallenge") {
    try {
      const result = await service.issueChallenge({
        principal: serverPrincipal,
        candidate_device: body.candidate_device,
        issue_request_id: issueRequestId,
      });
      const issuedChallengeSha256 = validIssuedChallenge(
        result?.issued_challenge,
        {
          candidateDevice: body.candidate_device,
          principal: serverPrincipal,
        },
      );
      if (!exactFields(result, ACTIVATION_RESULT_FIELDS)
          || !ACTIVATION_REFERENCE.test(result.activation_reference ?? "")
          || result.activation_reference !== result.issued_challenge?.activation_id
          || !INSTALLATION_ID.test(result.installation_id ?? "")
          || !SHA256.test(result.issued_challenge_sha256 ?? "")
          || !SHA256.test(result.release_authority_sha256 ?? "")
          || result.issued_challenge_sha256 !== issuedChallengeSha256) {
        throw Object.assign(new Error("invalid activation authority result"), {
          safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_INVALID",
          status: 503,
        });
      }
      return response(201, requestId, {
        outcome: "issued",
        activationReference: result.activation_reference,
        installationId: result.installation_id,
        issuedChallenge: result.issued_challenge,
        issuedChallengeSha256: result.issued_challenge_sha256,
        principalRef: outlookDesktopPrincipalRef(principal),
        releaseAuthoritySha256: result.release_authority_sha256,
      });
    } catch (error) {
      return mappedFailure(error, requestId);
    }
  }
  if (operation === "readActivationProofSeed") {
    try {
      const result = await service.readActivationProofSeed({
        activation_reference: body.activation_reference,
        authenticated_principal: serverPrincipal,
      });
      const proofSeed = boundedProofSeed(result, body.activation_reference);
      if (!proofSeed) {
        throw Object.assign(new Error("invalid activation proof seed result"), {
          safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_INVALID",
          status: 503,
        });
      }
      return response(proofSeed.status === "ready" ? 200 : 202, requestId, {
        outcome: proofSeed.status,
        proofSeed,
      });
    } catch (error) {
      return mappedFailure(error, requestId);
    }
  }
  if (!validConsumptionBinding(
    body,
    serverPrincipal,
    consumptionTransition,
  )) {
    return failure(403, requestId, "OUTLOOK_DESKTOP_ACTIVATION_BINDING_MISMATCH");
  }
  try {
    const result = await service.consumeRegistration({
      principal: serverPrincipal,
      submission: body,
    });
    if (!exactFields(result, CONSUMPTION_RESULT_FIELDS)) {
      throw Object.assign(new Error("invalid registration authority result"), {
        safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_INVALID",
        status: 503,
      });
    }
    const continuation = assertOutlookDesktopLifecycleRegistrationContinuation(
      result.authorization,
    );
    const authorityResult = await (
      consumeOutlookDesktopLifecycleRegistrationContinuation({
        continuation,
        lifecycle_port: runtime?.lifecycle_port,
        principal: Object.freeze({
          tenant_id: serverPrincipal.tenant_id,
          user_id: serverPrincipal.user_id,
          entra_subject_id: serverPrincipal.entra_subject_id,
        }),
      })
    );
    const transition = projectOutlookDesktopRegistrationAuthorityResult(
      authorityResult,
      consumptionTransition.proof.installation_id,
    );
    return transition.response_status === 201
      && transition.outcome === "registered"
      ? response(201, requestId, {
          outcome: "registered",
          activationReference: body.activation_reference,
          installation: transition.installation,
        })
      : failure(
          503,
          requestId,
          "OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_INVALID",
        );
  } catch (error) {
    return mappedFailure(error, requestId);
  }
}
