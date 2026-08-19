import test from "node:test";
import assert from "node:assert/strict";

import {
  OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION,
  OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA,
  OUTLOOK_DESKTOP_OPERATOR_PACKET_EVIDENCE_VERIFIER_SCHEMA,
  assertOutlookDesktopOperatorPacketEvidenceVerifier,
  createOutlookDesktopActivationControlPort,
  createOutlookDesktopOperatorPacketEvidenceVerifier,
  createPostgresOutlookDesktopActivationControlPort,
  executeOutlookDesktopActivationAuthority,
} from "../src/outlook-desktop-activation-authority.js";
import {
  assertOutlookDesktopActivationReservation,
  assertOutlookDesktopActivationReservationProofBinding,
  createOutlookDesktopActivationReservationTask15Input,
} from "../src/outlook-desktop-activation-authority-reservation.js";
import {
  OUTLOOK_DESKTOP_ACTIVATION_SERVICE_AUTHORITY,
  OUTLOOK_DESKTOP_ACTIVATION_SERVICE_SCHEMA,
  createOutlookDesktopActivationService,
} from "../src/outlook-desktop-activation-authority-service.js";
import {
  ACTIVATION_NOW,
  activationFixture,
  canonicalBytes,
  hash,
} from "../../../packages/email-dms/test/helpers/outlook-desktop-activation-contract-fixture.js";
import {
  createOutlookDesktopActivationContract,
} from "../../../packages/email-dms/src/outlook-desktop-activation-contract.js";
import {
  outlookDesktopActivationIssuedChallengeSha256,
  validateActivationRequest,
  validateIssuedChallenge,
} from "../../../packages/email-dms/src/outlook-desktop-activation-challenge.js";
import {
  validateActivationRegistryTrust,
  verifyActivationReleaseTicket,
} from "../../../packages/email-dms/src/outlook-desktop-activation-release.js";
import {
  useActivationTestEnvironment,
} from "../../../packages/email-dms/test/helpers/outlook-desktop-activation-test-utils.js";
import {
  createOutlookDesktopLifecycleControlPort,
} from "../src/outlook-desktop-lifecycle-verifier.js";
import {
  createOutlookDesktopLifecycleSignedTransition,
  verifyOutlookDesktopLifecycleProof,
} from "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js";
import {
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  seedCanaryPolicy,
} from "../../../packages/email-dms/test/support/postgres-outlook-desktop-assignment-authority-fixture.js";

const ISSUE_REQUEST_ID = "oar_registration_jwsuh_001";
const REGISTRATION_EVENT_ID = `oae_${"a".repeat(32)}`;

function enabledEnvironment(overrides = {}) {
  return {
    AWS_REGION: "ap-northeast-2",
    LAWOS_OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED: "true",
    LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID:
      "/lawos/production/postgres/outlook-control-operator",
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID:
      "/lawos/production/postgres/tenant-context",
    LAWOS_DATABASE_HOST:
      "lawos-production-postgres.cluster-example.ap-northeast-2.rds.amazonaws.com",
    LAWOS_DATABASE_PORT: "5432",
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_POSTGRES_SSL_MODE: "verify-full",
    NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
    LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
    ...overrides,
  };
}

function event(operation, request) {
  return {
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA,
    action: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION,
    operation,
    request,
  };
}

function signedSessionPrincipal(principal) {
  return {
    tenant_id: principal.lawos_tenant_id,
    user_id: principal.lawos_user_id,
    entra_subject_id: principal.entra_subject,
    entra_tenant_id: principal.entra_tenant_id,
  };
}

function currentReleaseAuthority(fixture, label) {
  return {
    release_artifact_id: fixture.approvedRelease.release_artifact_id,
    release_authority_sha256: hash(Buffer.from(`${label} release authority\n`)),
    release_ticket_bytes_sha256: hash(fixture.release_ticket_bytes),
    release_ticket_owner_signature_sha256:
      hash(fixture.release_ticket_signature_bytes),
    authority_binding_sha256: hash(Buffer.from(`${label} authority binding\n`)),
    valid_until: fixture.approvedRelease.valid_until,
  };
}

function coreIssueReceipt(fixture, input, releaseAuthority, installationId) {
  return {
    outcome: "issued",
    tenant_id: fixture.principal.lawos_tenant_id,
    activation_reference: input.issued_challenge.activation_id,
    installation_id: installationId,
    issue_request_id: input.issue_request_id,
    registration_event_id: REGISTRATION_EVENT_ID,
    release_artifact_id: fixture.approvedRelease.release_artifact_id,
    release_authority_sha256: releaseAuthority.release_authority_sha256,
    challenge_nonce_sha256: input.issued_challenge.challenge_nonce_sha256,
    issued_challenge: input.issued_challenge,
    issued_challenge_base64: input.issued_challenge_base64,
    issued_challenge_sha256: input.issued_challenge_sha256,
    issued_at: input.issued_challenge.issued_at,
    valid_until: input.issued_challenge.expires_at,
  };
}

async function unavailableControlPortMethod() {
  throw new Error("unexpected control port call");
}

async function unavailableOperatorReceiptAuthority() {
  throw new Error("unexpected operator receipt authority load");
}

function operatorPacketVerifier(load = unavailableOperatorReceiptAuthority) {
  return createOutlookDesktopOperatorPacketEvidenceVerifier({
    loadOperatorReceiptAuthority: load,
  });
}

function controlPortDependencies(overrides = {}, load = unavailableOperatorReceiptAuthority) {
  return {
    loadCurrentIssueAuthority: unavailableControlPortMethod,
    issueActivationChallenge: unavailableControlPortMethod,
    loadActivationReservation: unavailableControlPortMethod,
    attachActivationEvidence: unavailableControlPortMethod,
    authorizeActivation: unavailableControlPortMethod,
    readActivationProofSeed: unavailableControlPortMethod,
    ...overrides,
    operator_packet_evidence_verifier: operatorPacketVerifier(load),
  };
}

function inertPort(overrides = {}, load = unavailableOperatorReceiptAuthority) {
  return createOutlookDesktopActivationControlPort(controlPortDependencies(overrides, load));
}

function freezeTree(value) {
  if (value === null || typeof value !== "object" || Buffer.isBuffer(value)
      || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeTree(child);
  return Object.freeze(value);
}

function operatorReceiptAuthority(fixture) {
  const normalizedChallenge = validateIssuedChallenge(fixture.challenge, ACTIVATION_NOW);
  const normalizedRequest = validateActivationRequest(fixture.request, normalizedChallenge);
  validateActivationRegistryTrust(
    fixture.registry,
    normalizedRequest.bindings.approved_release,
  );
  const normalizedRelease = verifyActivationReleaseTicket({
    approvedRelease: normalizedRequest.bindings.approved_release,
    challengeExpiresAt: normalizedChallenge.expiresAt,
    now: ACTIVATION_NOW,
    principal: normalizedRequest.bindings.authenticated_principal,
    registryTrust: fixture.registry,
    signatureBytes: fixture.release_ticket_signature_bytes,
    ticketBytes: fixture.release_ticket_bytes,
  });
  const challenge = freezeTree({
    activationBindingSha256: normalizedChallenge.activationBindingSha256,
    expiresAt: normalizedChallenge.expiresAt,
    issuedAt: normalizedChallenge.issuedAt,
    nonceSha256: normalizedChallenge.nonceSha256,
  });
  const request = freezeTree({ bindings: normalizedRequest.bindings });
  const release = freezeTree({
    expiresAt: normalizedRelease.expiresAt,
    key: normalizedRelease.key,
    ticket: normalizedRelease.ticket,
  });
  return Object.freeze({
    challenge,
    request,
    release,
    registryTrust: fixture.registry,
  });
}

function operatorPacketEvidence(fixture, overrides = {}) {
  const packet = {
    activation_reference: fixture.challenge.activation_id,
    authenticated_principal: fixture.principal,
    local_measurement_evidence_sha256:
      fixture.challenge.local_measurement_evidence_sha256,
    operator_receipt_bytes: Buffer.from(fixture.operator_receipt_bytes),
    operator_receipt_signature_bytes:
      Buffer.from(fixture.operator_receipt_signature_bytes),
    request_id: ISSUE_REQUEST_ID,
    ...overrides,
  };
  packet.owner_operator_packet_sha256 = overrides.owner_operator_packet_sha256
    ?? hash(canonicalBytes({
      domain: "lawos.outlook-desktop-owner-operator-packet.v1",
      activation_reference: packet.activation_reference,
      authenticated_principal: packet.authenticated_principal,
      local_measurement_evidence_sha256:
        packet.local_measurement_evidence_sha256,
      operator_receipt_sha256: hash(packet.operator_receipt_bytes),
      operator_signature_sha256: hash(packet.operator_receipt_signature_bytes),
      request_id: packet.request_id,
    }));
  return packet;
}

function inertLifecyclePort(overrides = {}) {
  const unavailable = async () => {
    throw new Error("unexpected lifecycle port call");
  };
  return createOutlookDesktopLifecycleControlPort({
    verifyLifecycleTransition: unavailable,
    issueLifecycleChallenge: unavailable,
    consumeLifecycleTransition: unavailable,
    ...overrides,
  });
}

function issuedReservation(fixture, activationReference, releaseAuthority) {
  const issuedChallengeSha256 = outlookDesktopActivationIssuedChallengeSha256(
    fixture.challenge,
  );
  const issueReceipt = coreIssueReceipt(fixture, {
    issue_request_id: ISSUE_REQUEST_ID,
    issued_challenge: fixture.challenge,
    issued_challenge_base64: canonicalBytes(fixture.challenge).toString("base64"),
    issued_challenge_sha256: issuedChallengeSha256,
  }, releaseAuthority, activationReference.installation_id);
  const issuePublicResponse = {
    activation_reference: activationReference.activation_id,
    installation_id: activationReference.installation_id,
    issue_request_id: ISSUE_REQUEST_ID,
    issued_challenge: fixture.challenge,
    issued_challenge_sha256: issuedChallengeSha256,
    registration_event_id: REGISTRATION_EVENT_ID,
    release_authority: releaseAuthority,
    schema_version: "lawos.outlook-desktop-activation-authority-result.v1",
  };
  return {
    schema_version: "lawos.outlook-desktop-activation-reservation.v1",
    state: "issued",
    tenant_id: fixture.principal.lawos_tenant_id,
    user_id: fixture.principal.lawos_user_id,
    entra_subject_id: fixture.principal.entra_subject,
    activation_reference: activationReference.activation_id,
    installation_id: activationReference.installation_id,
    device_key_fingerprint:
      fixture.issue_input.candidate_device.continuity_key_fingerprint_sha256,
    device_public_key_spki_sha256:
      fixture.issue_input.candidate_device.continuity_key_fingerprint_sha256,
    release_artifact_id: fixture.approvedRelease.release_artifact_id,
    release_authority_sha256: releaseAuthority.release_authority_sha256,
    release_ticket_base64: fixture.release_ticket_bytes.toString("base64"),
    release_ticket_signature_base64:
      fixture.release_ticket_signature_bytes.toString("base64"),
    release_ticket_bytes_sha256: hash(fixture.release_ticket_bytes),
    release_ticket_owner_signature_sha256:
      hash(fixture.release_ticket_signature_bytes),
    challenge_nonce_base64url: fixture.challenge.challenge_nonce_base64url,
    challenge_nonce_sha256: fixture.challenge.challenge_nonce_sha256,
    issued_challenge: fixture.challenge,
    issued_challenge_base64: canonicalBytes(fixture.challenge).toString("base64"),
    issued_challenge_sha256: issuedChallengeSha256,
    operator_receipt_base64: null,
    operator_receipt_sha256: null,
    operator_signature_base64: null,
    operator_signature_sha256: null,
    owner_operator_packet_sha256: null,
    evidence_receipt_sha256: null,
    local_measurement_evidence_sha256:
      fixture.challenge.local_measurement_evidence_sha256,
    proof_id: null,
    idempotency_key: null,
    request_id: null,
    event_id: null,
    request_fingerprint: null,
    device_command_sha256: null,
    device_proof_transcript_sha256: null,
    device_signature_sha256: null,
    evidence_binding_sha256: null,
    activation_receipt_sha256: null,
    activation_authorization_receipt_sha256: null,
    issue_public_response_base64:
      canonicalBytes(issuePublicResponse).toString("base64"),
    issue_request_id: ISSUE_REQUEST_ID,
    issue_request_sha256: hash(Buffer.from("issue request\n")),
    registration_event_id: REGISTRATION_EVENT_ID,
    attachment_request_sha256: null,
    authorization_request_sha256: null,
    authorization_binding_sha256: null,
    issue_response_text: canonicalBytes(issueReceipt).toString("utf8"),
    attachment_response_text: null,
    authorization_response_text: null,
    issued_at: fixture.challenge.issued_at,
    valid_until: fixture.challenge.expires_at,
    attached_at: null,
    proof_issued_at: null,
    proof_expires_at: null,
    authorized_at: null,
    consumed_at: null,
    activation_replay_identity: null,
    lifecycle_registration_consumption: null,
  };
}

function attachedReservation(fixture, activationReference, releaseAuthority, {
  state = "evidence_attached",
  authorizationResult = null,
  authorizationRequestSha256 = null,
  proof = null,
  semanticFingerprint = null,
  verifiedActivation,
  verifiedProof = null,
} = {}) {
  const measurementSha256 = fixture.challenge.local_measurement_evidence_sha256;
  const challenge = fixture.challenge;
  const issuedChallengeSha256 = outlookDesktopActivationIssuedChallengeSha256(challenge);
  const authorized = ["authorized", "consumed"].includes(state);
  const reservation = {
    ...issuedReservation(fixture, activationReference, releaseAuthority),
    state,
    issued_challenge: challenge,
    issued_challenge_base64: canonicalBytes(challenge).toString("base64"),
    issued_challenge_sha256: issuedChallengeSha256,
    operator_receipt_base64: fixture.operator_receipt_bytes.toString("base64"),
    operator_receipt_sha256: hash(fixture.operator_receipt_bytes),
    operator_signature_base64: fixture.operator_receipt_signature_bytes.toString("base64"),
    operator_signature_sha256: hash(fixture.operator_receipt_signature_bytes),
    owner_operator_packet_sha256: hash(Buffer.from("owner operator packet\n")),
    evidence_receipt_sha256: hash(Buffer.from("operator evidence receipt\n")),
    local_measurement_evidence_sha256: measurementSha256,
    evidence_binding_sha256: authorized
      ? hash(Buffer.from("attached evidence binding\n")) : null,
    activation_receipt_sha256: hash(fixture.operator_receipt_bytes),
    attachment_request_sha256: hash(Buffer.from("attachment request\n")),
    attachment_response_text: canonicalBytes({
      activation_receipt_sha256: hash(fixture.operator_receipt_bytes),
      activation_reference: activationReference.activation_id,
      attached_at: "2026-08-16T12:00:01.000Z",
      installation_id: activationReference.installation_id,
      issued_challenge_sha256: issuedChallengeSha256,
      local_measurement_evidence_sha256: measurementSha256,
      status: "evidence_attached",
      tenant_id: fixture.principal.lawos_tenant_id,
      valid_until: challenge.expires_at,
    }).toString("utf8"),
    attached_at: "2026-08-16T12:00:01.000Z",
    activation_replay_identity: verifiedActivation.single_use_consumption,
  };
  if (["authorized", "consumed"].includes(state)) {
    Object.assign(reservation, {
      proof_id: proof.proof_id,
      idempotency_key: proof.idempotency_key,
      request_id: proof.request_id,
      event_id: proof.event_id,
      request_fingerprint: semanticFingerprint,
      activation_authorization_receipt_sha256:
        authorizationResult.activation_authorization_receipt_sha256,
      device_command_sha256: verifiedProof.rawRequestSha256,
      device_proof_transcript_sha256: verifiedProof.transcriptSha256,
      device_signature_sha256: verifiedProof.signatureSha256,
      authorization_request_sha256: authorizationRequestSha256,
      authorization_binding_sha256:
        authorizationResult.authorization_binding_sha256,
      authorization_response_text: canonicalBytes(authorizationResult).toString("utf8"),
      proof_issued_at: new Date(verifiedProof.issuedAt).toISOString(),
      proof_expires_at: new Date(verifiedProof.expiresAt).toISOString(),
      authorized_at: authorizationResult.authorized_at,
      consumed_at: state === "consumed" ? "2026-08-16T12:00:20.000Z" : null,
      lifecycle_registration_consumption: state === "consumed"
        ? {
          activation_reference: activationReference.activation_id,
          installation_id: activationReference.installation_id,
          lifecycle_authorization_id: proof.proof_id,
          resulting_state_version: 1,
          consumed_at: "2026-08-16T12:00:20.000Z",
        }
        : null,
    });
  }
  return reservation;
}

function registerProof(fixture, activationReference, releaseAuthority, reservation) {
  return {
    operation: "register",
    tenant_id: fixture.principal.lawos_tenant_id,
    user_id: fixture.principal.lawos_user_id,
    entra_subject_id: fixture.principal.entra_subject,
    device_id: fixture.issue_input.candidate_device.continuity_key_fingerprint_sha256,
    device_public_key_spki_base64:
      fixture.issue_input.candidate_device.continuity_public_key_spki,
    installation_id: activationReference.installation_id,
    release_authority_sha256: releaseAuthority.release_authority_sha256,
    policy_version: fixture.pilotPolicy.policy_revision,
    expected_state_version: 1,
    request_id: ISSUE_REQUEST_ID,
    event_id: REGISTRATION_EVENT_ID,
    idempotency_key: ISSUE_REQUEST_ID,
    challenge_id: activationReference.activation_id,
    challenge_nonce_base64url: fixture.challenge.challenge_nonce_base64url,
    issued_challenge_sha256: reservation.issued_challenge_sha256,
    activation_receipt_sha256: reservation.activation_receipt_sha256,
    proof_id: "proof-register-jwsuh-001",
    issued_at_epoch_ms: "1786881605000",
    expires_at_epoch_ms: "1786881840000",
    retire_intent_id: null,
    retire_reason: null,
    local_measurement_evidence_sha256:
      reservation.local_measurement_evidence_sha256,
  };
}

function lifecycleVerification(fixture, rawRequestBody, proofSignatureBase64) {
  return {
    expectedStateVersion: 1,
    expiresAt: Date.parse("2026-08-16T12:04:00.000Z"),
    issuedAt: Date.parse("2026-08-16T12:00:05.000Z"),
    nonce: Buffer.from(fixture.challenge.challenge_nonce_base64url, "base64url"),
    publicKey: {},
    nonceBindingSha256: hash(Buffer.from("nonce binding\n")),
    nonceSha256: fixture.challenge.challenge_nonce_sha256,
    rawRequestSha256: hash(rawRequestBody),
    signatureSha256: hash(Buffer.from(proofSignatureBase64, "base64")),
    transcriptSha256: hash(Buffer.from("lifecycle proof transcript\n")),
  };
}

async function finalizeFixture(t) {
  const fixture = await activationFixture(t);
  const activationReference = {
    activation_id: fixture.challenge.activation_id,
    installation_id: `odi_${Buffer.alloc(24, 0x46).toString("base64url")}`,
  };
  const releaseAuthority = currentReleaseAuthority(fixture, "finalize");
  const verifiedActivation = fixture.contract.verifyOperatorActivation(
    fixture.verification_input,
  );
  const evidenceReservation = attachedReservation(
    fixture,
    activationReference,
    releaseAuthority,
    { verifiedActivation },
  );
  const proof = registerProof(
    fixture,
    activationReference,
    releaseAuthority,
    evidenceReservation,
  );
  const rawRequestBody = canonicalBytes({
    event_id: REGISTRATION_EVENT_ID,
    idempotency_key: ISSUE_REQUEST_ID,
    local_measurement_evidence_sha256:
      evidenceReservation.local_measurement_evidence_sha256,
    request_id: ISSUE_REQUEST_ID,
  });
  const proofSignatureBase64 = Buffer.alloc(64, 0x53).toString("base64");
  const verifiedProof = lifecycleVerification(
    fixture,
    rawRequestBody,
    proofSignatureBase64,
  );
  const semanticFingerprint = hash(Buffer.from("semantic lifecycle register proof\n"));
  const authorizationRequestSha256 = hash(canonicalBytes({
    domain: "lawos.outlook-desktop-activation-finalize-request.v1",
    activation_reference: activationReference.activation_id,
    proof_sha256: hash(canonicalBytes(proof)),
    proof_signature_sha256: hash(Buffer.from(proofSignatureBase64, "base64")),
    raw_request_body_sha256: hash(rawRequestBody),
  }));
  const authorizationResult = {
    outcome: "authorized",
    tenant_id: fixture.principal.lawos_tenant_id,
    activation_reference: activationReference.activation_id,
    installation_id: activationReference.installation_id,
    authorization_binding_sha256: hash(Buffer.from("authorization binding\n")),
    activation_receipt_sha256: evidenceReservation.activation_receipt_sha256,
    activation_authorization_receipt_sha256:
      hash(Buffer.from("activation authorization receipt v2\n")),
    release_authority_sha256: releaseAuthority.release_authority_sha256,
    release_artifact_id: releaseAuthority.release_artifact_id,
    authorized_at: "2026-08-16T12:00:10.000Z",
    valid_until: "2026-08-16T12:04:00.000Z",
  };
  const request = {
    activation_reference: activationReference.activation_id,
    raw_request_body_base64: rawRequestBody.toString("base64"),
    proof,
    proof_signature_base64: proofSignatureBase64,
  };
  return {
    activationReference,
    authorizationRequestSha256,
    authorizationResult,
    evidenceReservation,
    fixture,
    proof,
    proofSignatureBase64,
    rawRequestBody,
    releaseAuthority,
    request,
    semanticFingerprint,
    verifiedActivation,
    verifiedProof,
  };
}

test("activation authority runtime exists and is fail-closed without injected ports", async () => {
  const { schema_version: ignoredSchema, ...methods } = inertPort();
  assert.equal(typeof ignoredSchema, "string");
  assert.throws(
    () => createOutlookDesktopActivationControlPort({
      ...methods,
      readActivationProofSeed: undefined,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  assert.throws(
    () => createOutlookDesktopActivationControlPort({
      ...methods,
      extra: async () => {},
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  let accessorReads = 0;
  const accessorMethods = { ...methods };
  Object.defineProperty(accessorMethods, "loadCurrentIssueAuthority", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return methods.loadCurrentIssueAuthority;
    },
  });
  assert.throws(
    () => createOutlookDesktopActivationControlPort(accessorMethods),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  assert.equal(accessorReads, 0);
  let proxyTraps = 0;
  const proxiedMethods = new Proxy(methods, {
    getPrototypeOf() {
      proxyTraps += 1;
      return Object.prototype;
    },
    ownKeys() {
      proxyTraps += 1;
      return Reflect.ownKeys(methods);
    },
    getOwnPropertyDescriptor(target, key) {
      proxyTraps += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assert.throws(
    () => createOutlookDesktopActivationControlPort(proxiedMethods),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  assert.equal(proxyTraps, 0);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: { LAWOS_OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED: "true" },
      event: {},
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: { LAWOS_OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED: "true" },
      event: {},
      control_port: { ...inertPort() },
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: { LAWOS_OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED: "true" },
      event: {},
      control_port: Object.freeze({ ...inertPort(), extra: () => {} }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
});

test("operator packet evidence verifier is private-branded and hidden behind the exact six-method port", async () => {
  const verifier = operatorPacketVerifier();
  assert.equal(
    verifier.schema_version,
    OUTLOOK_DESKTOP_OPERATOR_PACKET_EVIDENCE_VERIFIER_SCHEMA,
  );
  assert.equal(assertOutlookDesktopOperatorPacketEvidenceVerifier(verifier), verifier);
  assert.deepEqual(Object.keys(verifier), [
    "schema_version", "verifyOperatorPacketEvidence",
  ]);
  assert.throws(
    () => assertOutlookDesktopOperatorPacketEvidenceVerifier(
      Object.freeze({ ...verifier }),
    ),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID",
  );
  assert.throws(
    () => createOutlookDesktopActivationControlPort({
      ...controlPortDependencies(),
      operator_packet_evidence_verifier: Object.freeze({ ...verifier }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  const missingVerifier = controlPortDependencies();
  delete missingVerifier.operator_packet_evidence_verifier;
  assert.throws(
    () => createOutlookDesktopActivationControlPort(missingVerifier),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  let accessorReads = 0;
  const accessorVerifier = {};
  Object.defineProperty(accessorVerifier, "loadOperatorReceiptAuthority", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return unavailableOperatorReceiptAuthority;
    },
  });
  assert.throws(
    () => createOutlookDesktopOperatorPacketEvidenceVerifier(accessorVerifier),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID",
  );
  assert.equal(accessorReads, 0);
  let proxyTraps = 0;
  const proxiedVerifier = new Proxy({
    loadOperatorReceiptAuthority: unavailableOperatorReceiptAuthority,
  }, {
    getPrototypeOf() {
      proxyTraps += 1;
      return Object.prototype;
    },
    ownKeys() {
      proxyTraps += 1;
      return ["loadOperatorReceiptAuthority"];
    },
  });
  assert.throws(
    () => createOutlookDesktopOperatorPacketEvidenceVerifier(proxiedVerifier),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID",
  );
  assert.equal(proxyTraps, 0);
  const port = inertPort();
  assert.deepEqual(Object.keys(port), [
    "schema_version", "loadCurrentIssueAuthority", "issueActivationChallenge",
    "loadActivationReservation", "attachActivationEvidence",
    "authorizeActivation", "readActivationProofSeed",
  ]);
  assert.equal(Object.hasOwn(port, "operator_packet_evidence_verifier"), false);
  let attachCalls = 0;
  const guardedPort = inertPort({
    async attachActivationEvidence() {
      attachCalls += 1;
      throw new Error("a forged evidence object must not reach protected storage");
    },
  });
  await assert.rejects(
    guardedPort.attachActivationEvidence({
      core_request: Object.freeze({}),
      operator_packet_evidence: Object.freeze({}),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(attachCalls, 0);
});

test("operator packet evidence verifier accepts only the protected authority loader seam", () => {
  let loaderCalls = 0;
  const verifier = createOutlookDesktopOperatorPacketEvidenceVerifier({
    async loadOperatorReceiptAuthority() {
      loaderCalls += 1;
      throw new Error("constructor must not invoke the protected loader");
    },
  });
  assert.equal(
    assertOutlookDesktopOperatorPacketEvidenceVerifier(verifier),
    verifier,
  );
  assert.equal(loaderCalls, 0);
  assert.throws(
    () => createOutlookDesktopOperatorPacketEvidenceVerifier({
      verifyOperatorPacketEvidence: async () => {},
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID",
  );
});

test("a verified operator packet is bound to the exact private verifier owned by its control port", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const firstVerifier = operatorPacketVerifier(
    async () => operatorReceiptAuthority(fixture),
  );
  const packet = await firstVerifier.verifyOperatorPacketEvidence(
    operatorPacketEvidence(fixture),
  );
  let attachCalls = 0;
  const secondPort = inertPort({
    async attachActivationEvidence() {
      attachCalls += 1;
      throw new Error("cross-verifier evidence must not reach protected storage");
    },
  }, async () => operatorReceiptAuthority(fixture));
  try {
    await assert.rejects(
      secondPort.attachActivationEvidence({
        core_request: Object.freeze({}),
        operator_packet_evidence: packet,
      }),
      (error) => error?.code
        === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
    );
    assert.equal(attachCalls, 0);
  } finally {
    packet.operator_receipt_bytes.fill(0);
    packet.operator_receipt_signature_bytes.fill(0);
  }
});

test("disabled runtime touches no event, principal authority, entropy, or control port", async () => {
  const result = await executeOutlookDesktopActivationAuthority({
    env: {},
    event: Object.defineProperty({}, "requestContext", {
      get() {
        throw new Error("must not inspect a disabled event");
      },
    }),
  });
  assert.deepEqual(result, {
    schema_version: "lawos.outlook-desktop-activation-authority-result.v1",
    outcome: "DISABLED",
    authority_enabled: false,
  });
});

test("issue obtains server authority, generates oda/nonce, and accepts only the ODI atomically reserved by core", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  const releaseAuthority = currentReleaseAuthority(fixture, "current");
  let stored = null;
  const coreInstallationId = `odi_${Buffer.alloc(24, 0x49).toString("base64url")}`;
  let persistedResponseBytes = null;
  let persistedRequestFingerprint = null;
  let observedAuthorityInput = null;
  let challengeCalls = 0;
  const port = inertPort({
    async loadCurrentIssueAuthority(input) {
      observedAuthorityInput = input;
      if (persistedResponseBytes) {
        if (persistedRequestFingerprint !== input.request_fingerprint_sha256) {
          return { outcome: "conflict" };
        }
        return {
          outcome: "replay",
          request_fingerprint_sha256: persistedRequestFingerprint,
          response_bytes: persistedResponseBytes,
        };
      }
      persistedRequestFingerprint = input.request_fingerprint_sha256;
      return {
        outcome: "ready",
        request_fingerprint_sha256: input.request_fingerprint_sha256,
        approved_release: fixture.approvedRelease,
        pilot_policy: fixture.pilotPolicy,
        release_authority: releaseAuthority,
        release_ticket_bytes: Buffer.from(fixture.release_ticket_bytes),
        release_ticket_signature_bytes:
          Buffer.from(fixture.release_ticket_signature_bytes),
      };
    },
    async issueActivationChallenge(input) {
      assert.equal(Object.hasOwn(input, "installation_id"), false);
      assert.equal(Object.hasOwn(input, "response_bytes"), false);
      stored = input;
      return coreIssueReceipt(
        fixture,
        input,
        releaseAuthority,
        coreInstallationId,
      );
    },
  });
  const options = {
    env: enabledEnvironment(),
    event: event("issue", {
      candidate_device: fixture.issue_input.candidate_device,
      issue_request_id: "oar_activate_jwsuh_device_001",
    }),
    activation_contract: {
      issueChallenge(input) {
        challengeCalls += 1;
        return fixture.contract.issueChallenge(input);
      },
      verifyOperatorActivation: fixture.contract.verifyOperatorActivation,
    },
    control_port: port,
    resolve_authenticated_principal: async () => fixture.principal,
  };
  const first = await executeOutlookDesktopActivationAuthority(options);
  persistedResponseBytes = Buffer.from(first);
  const persistedResponseSnapshot = Buffer.from(persistedResponseBytes);
  assert.equal(Date.parse(stored.issued_challenge.expires_at) < Date.now(), true);
  const replay = await executeOutlookDesktopActivationAuthority(options);
  assert.equal(Buffer.compare(first, replay), 0);
  assert.deepEqual(persistedResponseSnapshot, first);
  assert.equal(persistedResponseBytes.every((byte) => byte === 0), true);
  assert.equal(challengeCalls, 1);
  assert.equal(stored.issued_challenge.challenge_nonce_base64url.length, 43);
  assert.match(stored.issued_challenge.activation_id, /^oda_[A-Za-z0-9_-]{24}$/u);
  assert.equal(Object.hasOwn(stored, "installation_id"), false);
  assert.equal(stored.issued_challenge.challenge_nonce_sha256.length, 64);
  assert.equal(stored.issued_challenge_base64,
    canonicalBytes(stored.issued_challenge).toString("base64"));
  assert.equal(stored.release_ticket_base64,
    fixture.release_ticket_bytes.toString("base64"));
  assert.equal(stored.release_ticket_signature_base64,
    fixture.release_ticket_signature_bytes.toString("base64"));
  assert.deepEqual(Object.keys(observedAuthorityInput).sort(), [
    "authenticated_principal", "candidate_device", "issue_request_id",
    "request_fingerprint_sha256",
  ]);
  assert.equal(Object.hasOwn(observedAuthorityInput, "authority_configuration"), false);
  const publicPackage = JSON.parse(first.toString("utf8"));
  assert.deepEqual(Object.keys(publicPackage).sort(), [
    "activation_reference", "installation_id", "issue_request_id", "issued_challenge",
    "issued_challenge_sha256", "registration_event_id", "release_authority",
    "schema_version",
  ]);
  assert.equal(publicPackage.activation_reference,
    stored.issued_challenge.activation_id);
  assert.equal(publicPackage.installation_id, coreInstallationId);
  assert.equal(publicPackage.issue_request_id,
    "oar_activate_jwsuh_device_001");
  assert.equal(publicPackage.registration_event_id, REGISTRATION_EVENT_ID);
  assert.equal(publicPackage.issued_challenge_sha256, stored.issued_challenge_sha256);
  assert.equal(publicPackage.release_authority.release_authority_sha256,
    releaseAuthority.release_authority_sha256);
});

test("closed activation service projects only the exact five-key persisted issue result", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  assert.throws(
    () => createOutlookDesktopActivationService({
      control_port: { ...inertPort() },
      lifecycle_port: inertLifecyclePort(),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  assert.throws(
    () => createOutlookDesktopActivationService({
      control_port: inertPort(),
      lifecycle_port: { ...inertLifecyclePort() },
    }),
    (error) => error?.code === "OUTLOOK_LIFECYCLE_CONTROL_PORT_INVALID",
  );
  const releaseAuthority = currentReleaseAuthority(fixture, "service");
  const coreInstallationId = `odi_${Buffer.alloc(24, 0x4f).toString("base64url")}`;
  let stored = null;
  const controlPort = inertPort({
    async loadCurrentIssueAuthority(input) {
      return {
        outcome: "ready",
        request_fingerprint_sha256: input.request_fingerprint_sha256,
        approved_release: fixture.approvedRelease,
        pilot_policy: fixture.pilotPolicy,
        release_authority: releaseAuthority,
        release_ticket_bytes: Buffer.from(fixture.release_ticket_bytes),
        release_ticket_signature_bytes:
          Buffer.from(fixture.release_ticket_signature_bytes),
      };
    },
    async issueActivationChallenge(input) {
      assert.equal(Object.hasOwn(input, "installation_id"), false);
      stored = input;
      return coreIssueReceipt(
        fixture,
        input,
        releaseAuthority,
        coreInstallationId,
      );
    },
  });
  const service = createOutlookDesktopActivationService({
    activation_contract: fixture.contract,
    control_port: controlPort,
    env: enabledEnvironment(),
    lifecycle_port: inertLifecyclePort(),
  });
  assert.equal(Object.isFrozen(service), true);
  assert.deepEqual(Object.keys(service), [
    "authority", "schema_version", "issueChallenge", "readActivationProofSeed",
    "consumeRegistration", "issueLifecycleChallenge", "consumeLifecycleTransition",
  ]);
  assert.equal(service.authority, OUTLOOK_DESKTOP_ACTIVATION_SERVICE_AUTHORITY);
  assert.equal(service.schema_version, OUTLOOK_DESKTOP_ACTIVATION_SERVICE_SCHEMA);
  const input = {
    principal: signedSessionPrincipal(fixture.principal),
    candidate_device: fixture.issue_input.candidate_device,
    issue_request_id: "oar_service_issue_request_001",
  };
  const result = await service.issueChallenge(input);
  const replay = await service.issueChallenge(input);
  assert.deepEqual(result, replay);
  assert.deepEqual(Object.keys(result), [
    "activation_reference", "installation_id", "issued_challenge",
    "issued_challenge_sha256", "release_authority_sha256",
  ]);
  assert.equal(result.issued_challenge_sha256, stored.issued_challenge_sha256);
  assert.equal(result.release_authority_sha256,
    releaseAuthority.release_authority_sha256);
  assert.deepEqual(
    stored.issued_challenge.authenticated_principal,
    fixture.principal,
  );
  assert.equal(Object.hasOwn(result, "release_artifact_id"), false);
  assert.equal(Object.hasOwn(result, "schema_version"), false);
  await assert.rejects(
    service.issueChallenge({
      ...input,
      principal: fixture.principal,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_SERVICE_PRINCIPAL_INVALID",
  );
});

test("issue rejects public authority material, URL aliases, conflicts, and expired issue requests before challenge creation", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  let challengeCalls = 0;
  let authorityCalls = 0;
  const base = {
    env: enabledEnvironment(),
    activation_contract: Object.freeze({
      issueChallenge(input) {
        challengeCalls += 1;
        return fixture.contract.issueChallenge(input);
      },
      verifyOperatorActivation: fixture.contract.verifyOperatorActivation,
    }),
    control_port: inertPort({
      loadCurrentIssueAuthority: async () => {
        authorityCalls += 1;
        return { outcome: "expired" };
      },
    }),
    resolve_authenticated_principal: async () => fixture.principal,
  };
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...base,
      event: event("issue", {
        candidate_device: fixture.issue_input.candidate_device,
        issue_request_id: "oar_expired_issue_request_001",
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_EXPIRED",
  );
  assert.equal(challengeCalls, 0);
  assert.equal(authorityCalls, 1);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...base,
      event: event("issue", {
        candidate_device: fixture.issue_input.candidate_device,
        issue_request_id: "expired-issue-001",
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_REQUEST_INVALID",
  );
  assert.equal(authorityCalls, 1);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...base,
      event: event("issue", {
        candidate_device: fixture.issue_input.candidate_device,
        issue_request_id: "oar_expired_issue_request_001",
        approved_release: fixture.approvedRelease,
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_REQUEST_INVALID",
  );
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...base,
      env: enabledEnvironment({ DATABASE_URL: "postgres://forbidden.invalid/lawos" }),
      event: event("issue", {
        candidate_device: fixture.issue_input.candidate_device,
        issue_request_id: "oar_expired_issue_request_001",
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_ENVIRONMENT_INVALID",
  );
});

test("protected wrong pilot policy fails before Task15 entropy or core mint", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  const releaseAuthority = currentReleaseAuthority(fixture, "wrong-policy");
  let entropyCalls = 0;
  let mintCalls = 0;
  const contract = createOutlookDesktopActivationContract({
    testOnlyNow: ACTIVATION_NOW,
    testOnlyRandomBytes(size) {
      entropyCalls += 1;
      return Buffer.alloc(size);
    },
    testOnlyVerifiedRegistry: fixture.registry,
  });
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("issue", {
        candidate_device: fixture.issue_input.candidate_device,
        issue_request_id: "oar_wrong_policy_request_001",
      }),
      activation_contract: contract,
      control_port: inertPort({
        async loadCurrentIssueAuthority(input) {
          return {
            outcome: "ready",
            request_fingerprint_sha256: input.request_fingerprint_sha256,
            approved_release: fixture.approvedRelease,
            pilot_policy: {
              ...fixture.pilotPolicy,
              pilot_id: "unapproved_pilot",
            },
            release_authority: releaseAuthority,
            release_ticket_bytes: Buffer.from(fixture.release_ticket_bytes),
            release_ticket_signature_bytes:
              Buffer.from(fixture.release_ticket_signature_bytes),
          };
        },
        async issueActivationChallenge() {
          mintCalls += 1;
          throw new Error("core mint must not run");
        },
      }),
      resolve_authenticated_principal: async () => fixture.principal,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_CHALLENGE_INVALID",
  );
  assert.equal(entropyCalls, 0);
  assert.equal(mintCalls, 0);
});

test("authenticated proof-seed polling exposes no protected artifacts while pending and only exact digests when ready", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  const activationReference = {
    activation_id: fixture.challenge.activation_id,
    installation_id: `odi_${Buffer.alloc(24, 0x50).toString("base64url")}`,
  };
  const validUntil = "2026-08-16T12:05:00.000Z";
  let ready = false;
  let readCalls = 0;
  const port = inertPort({
    async readActivationProofSeed(input) {
      readCalls += 1;
      assert.deepEqual(input.authenticated_principal, {
        tenant_id: fixture.principal.lawos_tenant_id,
        user_id: fixture.principal.lawos_user_id,
        entra_subject_id: fixture.principal.entra_subject,
      });
      assert.equal(input.activation_reference, activationReference.activation_id);
      if (!ready) {
        return {
          status: "pending",
          activation_reference: activationReference.activation_id,
          installation_id: activationReference.installation_id,
          valid_until: validUntil,
        };
      }
      return {
        status: "ready",
        activation_reference: activationReference.activation_id,
        installation_id: activationReference.installation_id,
        activation_receipt_sha256: hash(Buffer.from("activation receipt\n")),
        local_measurement_evidence_sha256: hash(Buffer.from("local measurement\n")),
        release_authority_sha256: hash(Buffer.from("release authority\n")),
        issued_challenge_sha256: hash(Buffer.from("issued challenge\n")),
        valid_until: validUntil,
        event_id: REGISTRATION_EVENT_ID,
      };
    },
  });
  const options = {
    env: enabledEnvironment(),
    event: event("read_proof_seed", {
      activation_reference: activationReference.activation_id,
    }),
    activation_contract: fixture.contract,
    control_port: port,
    resolve_authenticated_principal: async () => fixture.principal,
  };
  const pending = JSON.parse(
    (await executeOutlookDesktopActivationAuthority(options)).toString("utf8"),
  );
  assert.deepEqual(Object.keys(pending), [
    "activation_reference", "installation_id", "status", "valid_until",
  ]);
  assert.equal(JSON.stringify(pending).includes("receipt"), false);
  ready = true;
  const seed = JSON.parse(
    (await executeOutlookDesktopActivationAuthority(options)).toString("utf8"),
  );
  assert.deepEqual(Object.keys(seed), [
    "activation_receipt_sha256", "activation_reference", "event_id",
    "installation_id", "issued_challenge_sha256",
    "local_measurement_evidence_sha256", "release_authority_sha256",
    "status", "valid_until",
  ]);
  assert.equal(JSON.stringify(seed).includes("operator_receipt_bytes"), false);
  assert.equal(seed.event_id, REGISTRATION_EVENT_ID);
  assert.equal(JSON.stringify(seed).includes("release_ticket"), false);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      event: event("read_proof_seed", { activation_reference: activationReference }),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_REFERENCE_REQUEST_INVALID",
  );
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      event: event("read_proof_seed", {
        activation_id: activationReference.activation_id,
      }),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_REFERENCE_REQUEST_INVALID",
  );
  assert.equal(readCalls, 2);
});

test("operator-only attach verifies the signed packet and Task15 bytes before persisting bounded evidence", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const activationReference = {
    activation_id: fixture.challenge.activation_id,
    installation_id: `odi_${Buffer.alloc(24, 0x41).toString("base64url")}`,
  };
  const releaseAuthority = currentReleaseAuthority(fixture, "operator");
  const measurementSha256 = fixture.challenge.local_measurement_evidence_sha256;
  const reservation = issuedReservation(
    fixture,
    activationReference,
    releaseAuthority,
  );
  let attachInput = null;
  const evidence = operatorPacketEvidence(fixture);
  const ownerOperatorPacketSha256 = evidence.owner_operator_packet_sha256;
  const evidenceReceiptSha256 = hash(Buffer.from("operator evidence receipt\n"));
  const port = inertPort({
    async loadActivationReservation(input) {
      assert.equal(input.activation_reference, activationReference.activation_id);
      return reservation;
    },
    async attachActivationEvidence(input) {
      attachInput = input;
      assert.deepEqual(
        input.operator_packet_evidence.operator_receipt_bytes,
        fixture.operator_receipt_bytes,
      );
      assert.deepEqual(
        input.operator_packet_evidence.operator_receipt_signature_bytes,
        fixture.operator_receipt_signature_bytes,
      );
      return {
        core_result: {
          status: "evidence_attached",
          tenant_id: fixture.principal.lawos_tenant_id,
          activation_reference: activationReference.activation_id,
          installation_id: activationReference.installation_id,
          issued_challenge_sha256: reservation.issued_challenge_sha256,
          activation_receipt_sha256: hash(fixture.operator_receipt_bytes),
          local_measurement_evidence_sha256: measurementSha256,
          attached_at: "2026-08-16T12:00:01.000Z",
          valid_until: reservation.valid_until,
        },
        owner_operator_packet_sha256: ownerOperatorPacketSha256,
        evidence_receipt_sha256: evidenceReceiptSha256,
      };
    },
  }, async (input) => {
    assert.deepEqual(Object.keys(input), [
      "activation_reference", "authenticated_principal", "request_id",
    ]);
    assert.equal(input.activation_reference, activationReference.activation_id);
    assert.deepEqual(input.authenticated_principal, fixture.principal);
    assert.equal(input.request_id, ISSUE_REQUEST_ID);
    return operatorReceiptAuthority(fixture);
  });
  const result = JSON.parse((await executeOutlookDesktopActivationAuthority({
    env: enabledEnvironment(),
    event: event("attach_operator_evidence", evidence),
    activation_contract: fixture.contract,
    control_port: port,
    verify_operator_measurement: async ({ approved_release: release, expected_sha256 }) => {
      assert.equal(release.release_artifact_id, fixture.approvedRelease.release_artifact_id);
      assert.equal(expected_sha256, measurementSha256);
      return { local_measurement_evidence_sha256: measurementSha256 };
    },
  })).toString("utf8"));
  assert.equal(result.status, "evidence_attached");
  assert.deepEqual(Object.keys(attachInput), [
    "core_request", "operator_packet_evidence",
  ]);
  assert.equal(attachInput.core_request.operator_receipt_base64,
    fixture.operator_receipt_bytes.toString("base64"));
  assert.equal(attachInput.core_request.operator_signature_base64,
    fixture.operator_receipt_signature_bytes.toString("base64"));
  assert.equal(attachInput.core_request.local_measurement_evidence_sha256, measurementSha256);
  assert.equal(attachInput.core_request.request_id, ISSUE_REQUEST_ID);
  assert.deepEqual(
    attachInput.core_request.activation_replay_identity,
    fixture.contract.verifyOperatorActivation(fixture.verification_input)
      .single_use_consumption,
  );
  assert.deepEqual(Object.keys(attachInput.core_request), [
    "activation_reference", "activation_replay_identity", "installation_id",
    "issued_challenge_sha256", "local_measurement_evidence_sha256",
    "operator_receipt_base64", "operator_receipt_sha256",
    "operator_signature_base64", "operator_signature_sha256", "request_id",
  ]);
  assert.equal(Object.hasOwn(attachInput.core_request, "release_ticket_base64"), false);
  assert.equal(Object.hasOwn(attachInput.core_request, "approved_release"), false);
  assert.equal(Object.hasOwn(attachInput.core_request, "owner_operator_packet_sha256"), false);
  assert.equal(
    attachInput.operator_packet_evidence.owner_operator_packet_sha256,
    ownerOperatorPacketSha256,
  );
  assert.equal(Object.hasOwn(result, "owner_operator_packet_sha256"), false);
  assert.equal(Object.hasOwn(result, "evidence_receipt_sha256"), false);
  assert.equal(Object.hasOwn(result, "operator_receipt_bytes"), false);
  assert.equal(evidence.operator_receipt_bytes.every((byte) => byte === 0), true);
  assert.equal(
    evidence.operator_receipt_signature_bytes.every((byte) => byte === 0),
    true,
  );
  assert.equal(
    attachInput.operator_packet_evidence.operator_receipt_bytes
      .every((byte) => byte === 0),
    true,
  );
  assert.equal(
    attachInput.operator_packet_evidence.operator_receipt_signature_bytes
      .every((byte) => byte === 0),
    true,
  );
});

test("operator attach rejects a drifted durable evidence readback and zeroizes every runtime-owned packet copy", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const activationReference = {
    activation_id: fixture.challenge.activation_id,
    installation_id: `odi_${Buffer.alloc(24, 0x51).toString("base64url")}`,
  };
  const releaseAuthority = currentReleaseAuthority(fixture, "operator-readback");
  const reservation = issuedReservation(fixture, activationReference, releaseAuthority);
  const measurementSha256 = fixture.challenge.local_measurement_evidence_sha256;
  const evidence = operatorPacketEvidence(fixture);
  let persistedReceiptBytes;
  let persistedSignatureBytes;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", evidence),
      activation_contract: fixture.contract,
      control_port: inertPort({
        loadActivationReservation: async () => reservation,
        attachActivationEvidence: async ({ operator_packet_evidence: packet }) => {
          persistedReceiptBytes = packet.operator_receipt_bytes;
          persistedSignatureBytes = packet.operator_receipt_signature_bytes;
          return {
            core_result: {
              status: "evidence_attached",
              tenant_id: fixture.principal.lawos_tenant_id,
              activation_reference: activationReference.activation_id,
              installation_id: activationReference.installation_id,
              issued_challenge_sha256: reservation.issued_challenge_sha256,
              activation_receipt_sha256: hash(fixture.operator_receipt_bytes),
              local_measurement_evidence_sha256: measurementSha256,
              attached_at: "2026-08-16T12:00:01.000Z",
              valid_until: reservation.valid_until,
            },
            owner_operator_packet_sha256:
              hash(Buffer.from("drifted owner operator packet\n")),
            evidence_receipt_sha256: hash(Buffer.from("operator evidence receipt\n")),
          };
        },
      }, async () => operatorReceiptAuthority(fixture)),
      verify_operator_measurement: async () => ({
        local_measurement_evidence_sha256: measurementSha256,
      }),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_ATTACHMENT_RESULT_INVALID",
  );
  for (const bytes of [
    evidence.operator_receipt_bytes,
    evidence.operator_receipt_signature_bytes,
    persistedReceiptBytes,
    persistedSignatureBytes,
  ]) {
    assert.equal(bytes.every((byte) => byte === 0), true);
  }
});

test("operator attach rejects a different signed OAR before Task15 verification or core persistence", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const activationReference = {
    activation_id: fixture.challenge.activation_id,
    installation_id: `odi_${Buffer.alloc(24, 0x42).toString("base64url")}`,
  };
  const releaseAuthority = currentReleaseAuthority(fixture, "operator-oar");
  const reservation = issuedReservation(
    fixture,
    activationReference,
    releaseAuthority,
  );
  let task15Calls = 0;
  let measurementCalls = 0;
  let attachCalls = 0;
  const evidence = operatorPacketEvidence(fixture, {
    request_id: "oar_registration_jwsuh_changed",
  });

  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", evidence),
      activation_contract: {
        issueChallenge: fixture.contract.issueChallenge,
        verifyOperatorActivation() {
          task15Calls += 1;
          return fixture.contract.verifyOperatorActivation(fixture.verification_input);
        },
      },
      control_port: inertPort({
        loadActivationReservation: async () => reservation,
        attachActivationEvidence: async () => {
          attachCalls += 1;
          throw new Error("must not persist mismatched OAR evidence");
        },
      }, async () => operatorReceiptAuthority(fixture)),
      verify_operator_measurement: async () => {
        measurementCalls += 1;
        throw new Error("must not measure mismatched OAR evidence");
      },
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_BINDING_MISMATCH",
  );
  assert.equal(task15Calls, 0);
  assert.equal(measurementCalls, 0);
  assert.equal(attachCalls, 0);
});

test("concrete PostgreSQL activation port stops an untrusted packet before evidence persistence", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-activation-runtime-private-verifier-pg",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "91" });
  const prepared = await prepareRegistration(authority, "activation-runtime-private-verifier", {
    mintLifecycle: false,
  });
  const port = createPostgresOutlookDesktopActivationControlPort({
    app_pool: authority.appPool,
    control_pool: authority.controlPool,
    tenant_id: authority.tenantId,
  });
  const packet = {
    ...prepared.operatorPacketEvidence,
    operator_receipt_bytes:
      Buffer.from(prepared.operatorPacketEvidence.operator_receipt_bytes),
    operator_receipt_signature_bytes:
      Buffer.from(prepared.operatorPacketEvidence.operator_receipt_signature_bytes),
  };
  const snapshot = async () => (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence)
         AS evidence_count,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
          AS row_value) AS evidence_rows,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_challenges
          AS row_value) AS reservation_rows`,
  )).rows[0];
  const before = await snapshot();
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      activation_contract: {
        issueChallenge() {
          throw new Error("the untrusted packet path must not issue a challenge");
        },
        verifyOperatorActivation() {
          throw new Error("the untrusted packet path must not reach Task15 evidence verification");
        },
      },
      control_port: port,
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", packet),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(packet.operator_receipt_bytes.every((byte) => byte === 0), true);
  assert.equal(packet.operator_receipt_signature_bytes.every((byte) => byte === 0), true);
  assert.deepEqual(await snapshot(), before);
});

test("PostgreSQL authorization remains untouched when finalize proof verification rejects", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-activation-runtime-finalize-rejection-pg",
  });
  if (!authority) return;
  const scenario = await finalizeFixture(t);
  const postgresPort = createPostgresOutlookDesktopActivationControlPort({
    app_pool: authority.appPool,
    control_pool: authority.controlPool,
    tenant_id: authority.tenantId,
  });
  const snapshot = async () => (await authority.observerPool.query(
    `SELECT
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_challenges
          AS row_value) AS reservation_rows,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
          AS row_value) AS evidence_rows,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_authorization_id)::text
          FROM lawos_email_dms.outlook_desktop_activation_authorizations
          AS row_value) AS authorization_rows`,
  )).rows[0];
  const before = await snapshot();
  const retainedProtectedBytes = [];
  let retainedRawCommand;
  let retainedProofSignature;
  let authorizeCalls = 0;
  const originalBufferFrom = Buffer.from;
  t.mock.method(Buffer, "from", function captureProofSignature(value, encoding, ...rest) {
    const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
    if (value === scenario.proofSignatureBase64 && encoding === "base64") {
      retainedProofSignature = bytes;
    }
    return bytes;
  });
  const port = inertPort({
    loadActivationReservation: async () => scenario.evidenceReservation,
    authorizeActivation: async (input) => {
      authorizeCalls += 1;
      return postgresPort.authorizeActivation(input);
    },
  });

  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      activation_contract: {
        issueChallenge() {
          throw new Error("finalize rejection must not issue a challenge");
        },
        verifyOperatorActivation(input) {
          for (const field of [
            "release_ticket_bytes", "release_ticket_signature_bytes",
            "operator_receipt_bytes", "operator_receipt_signature_bytes",
          ]) retainedProtectedBytes.push(input[field]);
          return scenario.verifiedActivation;
        },
      },
      control_port: port,
      env: enabledEnvironment(),
      event: event("finalize", scenario.request),
      resolve_authenticated_principal: async () => scenario.fixture.principal,
      verify_lifecycle_proof: async ({ rawRequestBody }) => {
        retainedRawCommand = rawRequestBody;
        throw new Error("device proof rejected before authorization");
      },
      lifecycle_transition_fingerprint() {
        throw new Error("a rejected proof must not be fingerprinted");
      },
      verify_operator_measurement() {
        throw new Error("a rejected proof must not reach measurement");
      },
    }),
    (error) => {
      assert.equal(
        error?.code,
        "OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_INVALID",
      );
      return true;
    },
  );
  assert.equal(authorizeCalls, 0);
  assert.deepEqual(await snapshot(), before);
  assert.equal(retainedProtectedBytes.length, 4);
  for (const bytes of [
    ...retainedProtectedBytes,
    retainedRawCommand,
    retainedProofSignature,
  ]) {
    assert.equal(Buffer.isBuffer(bytes), true);
    assert.equal(bytes.every((byte) => byte === 0), true);
  }
  assert.deepEqual(scenario.rawRequestBody, canonicalBytes({
    event_id: REGISTRATION_EVENT_ID,
    idempotency_key: ISSUE_REQUEST_ID,
    local_measurement_evidence_sha256:
      scenario.evidenceReservation.local_measurement_evidence_sha256,
    request_id: ISSUE_REQUEST_ID,
  }));
  assert.equal(
    scenario.fixture.operator_receipt_bytes.every((byte) => byte === 0),
    false,
  );
  assert.equal(
    scenario.fixture.operator_receipt_signature_bytes.every((byte) => byte === 0),
    false,
  );

  let contractCalls = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      activation_contract: {
        issueChallenge() {
          contractCalls += 1;
        },
        verifyOperatorActivation() {
          contractCalls += 1;
        },
      },
      control_port: postgresPort,
      env: enabledEnvironment(),
      event: event("finalize", {
        ...scenario.request,
        proof: {
          ...scenario.proof,
          oversized_padding: `pg-outer-request-${"x".repeat(300 * 1_024)}`,
        },
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_EVENT_INVALID",
  );
  assert.equal(contractCalls, 0);
  assert.deepEqual(await snapshot(), before);
});

test("operator attach is direct-invoke-only and cannot be reached through an HTTP-shaped event", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  let verifierCalls = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: {
        ...event("attach_operator_evidence", {}),
        requestContext: {},
      },
      activation_contract: fixture.contract,
      control_port: inertPort({}, async () => {
        verifierCalls += 1;
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_DIRECT_INVOKE_REQUIRED",
  );
  assert.equal(verifierCalls, 0);
});

test("operator packet verification cannot be supplied through the public runtime options", async () => {
  let verifierCalls = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", {}),
      control_port: inertPort(),
      verify_operator_attach_packet: async () => {
        verifierCalls += 1;
        throw new Error("a public verifier option must never be callable");
      },
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPTIONS_INVALID",
  );
  assert.equal(verifierCalls, 0);
});

test("private packet verification rejects an extra protected authority field and zeroizes input bytes", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const evidence = operatorPacketEvidence(fixture);
  const authority = operatorReceiptAuthority(fixture);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", evidence),
      activation_contract: fixture.contract,
      control_port: inertPort({}, async () => Object.freeze({
        ...authority,
        extra: "must reject before receipt verification or protected storage",
      })),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(evidence.operator_receipt_bytes.every((byte) => byte === 0), true);
  assert.equal(
    evidence.operator_receipt_signature_bytes.every((byte) => byte === 0),
    true,
  );
});

test("private packet verification recomputes the owner packet digest after Task15 receipt verification", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const evidence = operatorPacketEvidence(fixture, {
    owner_operator_packet_sha256: hash(Buffer.from("caller supplied drift\n")),
  });
  let authorityLoads = 0;
  let reservationLoads = 0;
  let attachCalls = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", evidence),
      activation_contract: fixture.contract,
      control_port: inertPort({
        async loadActivationReservation() {
          reservationLoads += 1;
          throw new Error("a mismatched computed packet must not load a reservation");
        },
        async attachActivationEvidence() {
          attachCalls += 1;
          throw new Error("a mismatched computed packet must not persist");
        },
      }, async () => {
        authorityLoads += 1;
        return operatorReceiptAuthority(fixture);
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(authorityLoads, 1);
  assert.equal(reservationLoads, 0);
  assert.equal(attachCalls, 0);
  assert.equal(evidence.operator_receipt_bytes.every((byte) => byte === 0), true);
  assert.equal(
    evidence.operator_receipt_signature_bytes.every((byte) => byte === 0),
    true,
  );
});

test("private packet verification rejects a correctly hashed packet with an invalid Ed25519 receipt signature", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const invalidSignature = Buffer.from(fixture.operator_receipt_signature_bytes);
  invalidSignature[0] ^= 0xff;
  const evidence = operatorPacketEvidence(fixture, {
    operator_receipt_signature_bytes: invalidSignature,
  });
  let authorityLoads = 0;
  let reservationLoads = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", evidence),
      activation_contract: fixture.contract,
      control_port: inertPort({
        async loadActivationReservation() {
          reservationLoads += 1;
          throw new Error("an invalid signature must not reach reservation storage");
        },
      }, async () => {
        authorityLoads += 1;
        return operatorReceiptAuthority(fixture);
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(authorityLoads, 1);
  assert.equal(reservationLoads, 0);
  assert.equal(evidence.operator_receipt_bytes.every((byte) => byte === 0), true);
  assert.equal(
    evidence.operator_receipt_signature_bytes.every((byte) => byte === 0),
    true,
  );
});

test("private packet verification rejects accessor and proxy authority results without invoking traps", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  t.mock.method(Date, "now", () => ACTIVATION_NOW);
  const fixture = await activationFixture(t);
  const authority = operatorReceiptAuthority(fixture);
  let accessorReads = 0;
  const accessorAuthority = {
    request: authority.request,
    release: authority.release,
    registryTrust: authority.registryTrust,
  };
  Object.defineProperty(accessorAuthority, "challenge", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return authority.challenge;
    },
  });
  Object.freeze(accessorAuthority);
  const accessorEvidence = operatorPacketEvidence(fixture);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", accessorEvidence),
      activation_contract: fixture.contract,
      control_port: inertPort({}, async () => accessorAuthority),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(accessorReads, 0);
  let proxyTraps = 0;
  const proxiedAuthority = new Proxy(authority, {
    getPrototypeOf() {
      proxyTraps += 1;
      return Object.prototype;
    },
    ownKeys() {
      proxyTraps += 1;
      return Reflect.ownKeys(authority);
    },
  });
  const proxyEvidence = operatorPacketEvidence(fixture);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", proxyEvidence),
      activation_contract: fixture.contract,
      control_port: inertPort({}, async () => proxiedAuthority),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(proxyTraps, 0);
});

test("attach evidence rejects accessor and proxy request shapes before a protected authority load", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  const evidence = operatorPacketEvidence(fixture);
  const {
    operator_receipt_bytes: hiddenReceiptBytes,
    ...accessorEvidence
  } = evidence;
  let accessorReads = 0;
  Object.defineProperty(accessorEvidence, "operator_receipt_bytes", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return hiddenReceiptBytes;
    },
  });
  let authorityLoads = 0;
  const port = inertPort({}, async () => {
    authorityLoads += 1;
    return operatorReceiptAuthority(fixture);
  });
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", accessorEvidence),
      activation_contract: fixture.contract,
      control_port: port,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  assert.equal(accessorReads, 0);
  assert.equal(authorityLoads, 0);
  let proxyTraps = 0;
  const proxiedEvidence = new Proxy(operatorPacketEvidence(fixture), {
    getPrototypeOf() {
      proxyTraps += 1;
      return Object.prototype;
    },
    ownKeys() {
      proxyTraps += 1;
      return [];
    },
  });
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("attach_operator_evidence", proxiedEvidence),
      activation_contract: fixture.contract,
      control_port: port,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_EVENT_INVALID",
  );
  assert.equal(proxyTraps, 0);
  assert.equal(authorityLoads, 0);
});

test("attach evidence cannot select a clock, trust registry, root, or path", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const fixture = await activationFixture(t);
  let authorityLoads = 0;
  const port = inertPort({}, async () => {
    authorityLoads += 1;
    return operatorReceiptAuthority(fixture);
  });
  for (const [field, value] of [
    ["now", ACTIVATION_NOW],
    ["registryTrust", fixture.registry],
    ["root", "/caller-selected-root"],
    ["path", "caller-selected-registry.json"],
  ]) {
    const evidence = operatorPacketEvidence(fixture);
    evidence[field] = value;
    await assert.rejects(
      executeOutlookDesktopActivationAuthority({
        env: enabledEnvironment(),
        event: event("attach_operator_evidence", evidence),
        activation_contract: fixture.contract,
        control_port: port,
      }),
      (error) => error?.code
        === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
    );
  }
  assert.equal(authorityLoads, 0);
});

test("finalize rehydrates protected authority, verifies the device proof, and authorizes only the bound reservation", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  let authorizeInput = null;
  let lifecycleInput = null;
  const result = JSON.parse((await executeOutlookDesktopActivationAuthority({
    env: enabledEnvironment(),
    event: event("finalize", scenario.request),
    activation_contract: {
      issueChallenge: scenario.fixture.contract.issueChallenge,
      verifyOperatorActivation: async () => scenario.verifiedActivation,
    },
    clock: () => Date.parse("2026-08-16T12:00:10.000Z"),
    control_port: inertPort({
      async loadActivationReservation(input) {
        assert.deepEqual(input, {
          activation_reference: scenario.activationReference.activation_id,
        });
        return scenario.evidenceReservation;
      },
      async authorizeActivation(input) {
        authorizeInput = input;
        return scenario.authorizationResult;
      },
    }),
    lifecycle_transition_fingerprint(proof) {
      assert.deepEqual(proof, scenario.proof);
      return scenario.semanticFingerprint;
    },
    resolve_authenticated_principal: async () => scenario.fixture.principal,
    verify_lifecycle_proof: async (input) => {
      assert.equal(Buffer.compare(input.rawRequestBody, scenario.rawRequestBody), 0);
      lifecycleInput = input;
      return scenario.verifiedProof;
    },
    verify_operator_measurement: async ({ approved_release: release, expected_sha256 }) => {
      assert.equal(release.release_artifact_id, scenario.releaseAuthority.release_artifact_id);
      assert.equal(
        expected_sha256,
        scenario.evidenceReservation.local_measurement_evidence_sha256,
      );
      return { local_measurement_evidence_sha256: expected_sha256 };
    },
  })).toString("utf8"));

  assert.deepEqual(Object.keys(lifecycleInput), [
    "proof", "proofSignatureBase64", "rawRequestBody",
  ]);
  assert.equal(
    lifecycleInput.rawRequestBody.every((byte) => byte === 0),
    true,
  );
  assert.equal(
    authorizeInput.request_fingerprint,
    scenario.semanticFingerprint,
  );
  assert.equal(
    authorizeInput.proof_id,
    scenario.proof.proof_id,
  );
  assert.equal(Object.hasOwn(authorizeInput, "authorization_request_sha256"), false);
  assert.equal(Object.hasOwn(authorizeInput, "finalize_request_identity"), false);
  assert.equal(Object.hasOwn(authorizeInput, "release_ticket_base64"), false);
  assert.equal(Object.hasOwn(authorizeInput, "operator_receipt_base64"), false);
  assert.deepEqual(result, {
    activation_receipt: scenario.authorizationResult,
    activation_reference: scenario.activationReference.activation_id,
    installation_id: scenario.activationReference.installation_id,
    release_authority: {
      release_artifact_id: scenario.releaseAuthority.release_artifact_id,
      release_authority_sha256: scenario.releaseAuthority.release_authority_sha256,
    },
    schema_version: "lawos.outlook-desktop-activation-authority-result.v1",
  });
});

test("finalize zeroizes owned protected bytes on fresh failure, exact replay, and verifier rejection", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  const callerSnapshots = [
    scenario.fixture.release_ticket_bytes,
    scenario.fixture.release_ticket_signature_bytes,
    scenario.fixture.operator_receipt_bytes,
    scenario.fixture.operator_receipt_signature_bytes,
    scenario.rawRequestBody,
  ].map((bytes) => Buffer.from(bytes));
  const callerRequestSnapshot = JSON.stringify(scenario.request);
  const expectedFinalBytes = canonicalBytes({
    activation_receipt: scenario.authorizationResult,
    activation_reference: scenario.activationReference.activation_id,
    installation_id: scenario.activationReference.installation_id,
    release_authority: {
      release_artifact_id: scenario.releaseAuthority.release_artifact_id,
      release_authority_sha256: scenario.releaseAuthority.release_authority_sha256,
    },
    schema_version: "lawos.outlook-desktop-activation-authority-result.v1",
  });
  const retainedOuterRequests = [];
  const retainedProtectedBytes = [];
  const retainedRawCommands = [];
  const retainedProofSignatures = [];
  const originalBufferFrom = Buffer.from;
  t.mock.method(Buffer, "from", function captureProofSignature(value, encoding, ...rest) {
    const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
    if (value === scenario.proofSignatureBase64 && encoding === "base64") {
      retainedProofSignatures.push(bytes);
    }
    if (typeof value === "string"
        && value.includes(`"activation_reference":"${scenario.request.activation_reference}"`)
        && value.includes(`"proof_signature_base64":"${scenario.proofSignatureBase64}"`)
        && value.includes(`"raw_request_body_base64":"${scenario.request.raw_request_body_base64}"`)) {
      retainedOuterRequests.push(bytes);
    }
    return bytes;
  });
  const captureTask15Input = (input) => {
    for (const field of [
      "release_ticket_bytes", "release_ticket_signature_bytes",
      "operator_receipt_bytes", "operator_receipt_signature_bytes",
    ]) {
      assert.equal(Buffer.isBuffer(input[field]), true);
      retainedProtectedBytes.push(input[field]);
    }
    return scenario.verifiedActivation;
  };
  const options = ({
    authorizeActivation,
    reservation,
    verifyLifecycleProof,
    verifyTask15Historical,
  }) => ({
    env: enabledEnvironment(),
    event: event("finalize", scenario.request),
    activation_contract: {
      issueChallenge: scenario.fixture.contract.issueChallenge,
      verifyOperatorActivation: async (input) => captureTask15Input(input),
    },
    clock: () => Date.parse("2026-08-16T12:00:10.000Z"),
    control_port: inertPort({
      loadActivationReservation: async () => reservation,
      authorizeActivation,
    }),
    lifecycle_transition_fingerprint: () => scenario.semanticFingerprint,
    resolve_authenticated_principal: async () => scenario.fixture.principal,
    verify_lifecycle_proof: async (input) => {
      retainedRawCommands.push(input.rawRequestBody);
      return verifyLifecycleProof(input);
    },
    verify_operator_measurement: async ({ expected_sha256 }) => ({
      local_measurement_evidence_sha256: expected_sha256,
    }),
    ...(verifyTask15Historical === undefined ? {} : {
      verify_task15_historical: async ({ input, verification_time }) => {
        assert.equal(
          verification_time,
          Date.parse(scenario.authorizationResult.authorized_at),
        );
        captureTask15Input(input);
        return verifyTask15Historical();
      },
    }),
  });

  const acceptedBytes = await executeOutlookDesktopActivationAuthority(options({
    reservation: scenario.evidenceReservation,
    authorizeActivation: async () => scenario.authorizationResult,
    verifyLifecycleProof: async () => scenario.verifiedProof,
  }));
  assert.deepEqual(acceptedBytes, expectedFinalBytes);

  await assert.rejects(
    executeOutlookDesktopActivationAuthority(options({
      reservation: scenario.evidenceReservation,
      authorizeActivation: async () => {
        throw new Error("fresh authorization failed after protected bytes were decoded");
      },
      verifyLifecycleProof: async () => scenario.verifiedProof,
    })),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_FAILED",
  );

  const replayReservation = attachedReservation(
    scenario.fixture,
    scenario.activationReference,
    scenario.releaseAuthority,
    {
      state: "authorized",
      authorizationResult: scenario.authorizationResult,
      authorizationRequestSha256: scenario.authorizationRequestSha256,
      proof: scenario.proof,
      semanticFingerprint: scenario.semanticFingerprint,
      verifiedActivation: scenario.verifiedActivation,
      verifiedProof: scenario.verifiedProof,
    },
  );
  const replayBytes = await executeOutlookDesktopActivationAuthority(options({
    reservation: replayReservation,
    authorizeActivation: async () => scenario.authorizationResult,
    verifyLifecycleProof: async () => scenario.verifiedProof,
    verifyTask15Historical: () => scenario.verifiedActivation,
  }));
  assert.deepEqual(replayBytes, expectedFinalBytes);

  let rejectedAuthorizeCalls = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority(options({
      reservation: scenario.evidenceReservation,
      authorizeActivation: async () => {
        rejectedAuthorizeCalls += 1;
        return scenario.authorizationResult;
      },
      verifyLifecycleProof: async () => {
        throw new Error("device proof rejected after protected bytes were decoded");
      },
    })),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_INVALID",
  );
  assert.equal(rejectedAuthorizeCalls, 0);

  assert.equal(retainedOuterRequests.length, 4);
  assert.equal(retainedProtectedBytes.length, 16);
  assert.equal(retainedRawCommands.length, 4);
  assert.equal(retainedProofSignatures.length, 4);
  for (const bytes of [
    ...retainedOuterRequests,
    ...retainedProtectedBytes,
    ...retainedRawCommands,
    ...retainedProofSignatures,
  ]) {
    assert.equal(bytes.every((byte) => byte === 0), true);
  }
  for (const [index, callerBytes] of [
    scenario.fixture.release_ticket_bytes,
    scenario.fixture.release_ticket_signature_bytes,
    scenario.fixture.operator_receipt_bytes,
    scenario.fixture.operator_receipt_signature_bytes,
    scenario.rawRequestBody,
  ].entries()) {
    assert.deepEqual(callerBytes, callerSnapshots[index]);
  }
  assert.equal(JSON.stringify(scenario.request), callerRequestSnapshot);
});

test("oversized finalize zeroizes the outer canonical request before every protected delegate", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  const sentinel = `outer-request-oversized-${"x".repeat(300 * 1_024)}`;
  const oversizedRequest = {
    ...scenario.request,
    proof: { ...scenario.proof, oversized_padding: sentinel },
  };
  const callerSnapshot = JSON.stringify(oversizedRequest);
  const originalBufferFrom = Buffer.from;
  let retainedOuterRequest;
  t.mock.method(Buffer, "from", function captureOuterRequest(value, encoding, ...rest) {
    const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
    if (typeof value === "string" && value.includes("outer-request-oversized-")) {
      retainedOuterRequest = bytes;
    }
    return bytes;
  });
  let protectedDelegateCalls = 0;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("finalize", oversizedRequest),
      control_port: inertPort({
        loadActivationReservation: async () => {
          protectedDelegateCalls += 1;
          return scenario.evidenceReservation;
        },
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_EVENT_INVALID",
  );
  assert.equal(protectedDelegateCalls, 0);
  assert.equal(Buffer.isBuffer(retainedOuterRequest), true);
  assert.equal(retainedOuterRequest.every((byte) => byte === 0), true);
  assert.equal(JSON.stringify(oversizedRequest), callerSnapshot);
});

test("activation authority has one bounded owner for every acquired Buffer", async (t) => {
  await t.test("S1 wipes a decoded release ticket when the following signature decode rejects", async (t) => {
    const authority = await createOutlookAssignmentAuthorityFixture(t, {
      tenantId: "tenant-activation-runtime-r4-ticket-decode",
    });
    if (!authority) return;
    await seedCanaryPolicy(authority, { suffix: "94" });
    const prepared = await prepareRegistration(authority, "activation-runtime-r4-ticket", {
      authorizeActivation: false,
      mintLifecycle: false,
    });
    const port = createPostgresOutlookDesktopActivationControlPort({
      app_pool: authority.appPool,
      control_pool: authority.controlPool,
      tenant_id: authority.tenantId,
    });
    const r4Packet = {
      ...prepared.operatorPacketEvidence,
      authenticated_principal: {
        ...prepared.operatorPacketEvidence.authenticated_principal,
        entra_tenant_id: "11111111-2222-4333-8444-555555555555",
      },
    };
    const loadedReservation = await port.loadActivationReservation({
      activation_reference: r4Packet.activation_reference,
    });
    assert.equal(
      loadedReservation.release_ticket_base64,
      prepared.issueRequest.release_ticket_base64,
    );
    assert.equal(
      loadedReservation.release_ticket_signature_base64,
      prepared.issueRequest.release_ticket_signature_base64,
    );
    assert.equal(
      loadedReservation.activation_reference,
      prepared.operatorPacketEvidence.activation_reference,
    );
    assert.equal(loadedReservation.issue_request_id, prepared.issueRequest.issue_request_id);
    assert.equal(
      loadedReservation.tenant_id,
      r4Packet.authenticated_principal.lawos_tenant_id,
    );
    assert.equal(
      loadedReservation.user_id,
      r4Packet.authenticated_principal.lawos_user_id,
    );
    assert.equal(
      loadedReservation.entra_subject_id,
      r4Packet.authenticated_principal.entra_subject,
    );
    assert.deepEqual(Object.keys(prepared.operatorPacketEvidence), [
      "activation_reference", "authenticated_principal",
      "local_measurement_evidence_sha256", "operator_receipt_bytes",
      "operator_receipt_signature_bytes", "owner_operator_packet_sha256",
      "request_id",
    ]);
    assert.deepEqual(
      Object.keys(prepared.operatorPacketEvidence.authenticated_principal),
      ["entra_subject", "entra_tenant_id", "lawos_tenant_id", "lawos_user_id"],
    );
    assert.equal(prepared.operatorPacketEvidence.operator_receipt_bytes.byteLength > 0, true);
    assert.equal(
      prepared.operatorPacketEvidence.operator_receipt_signature_bytes.byteLength,
      64,
    );
    const packet = {
      ...r4Packet,
      operator_receipt_bytes:
        Buffer.from(prepared.operatorPacketEvidence.operator_receipt_bytes),
      operator_receipt_signature_bytes:
        Buffer.from(prepared.operatorPacketEvidence.operator_receipt_signature_bytes),
    };
    const snapshot = async () => (await authority.observerPool.query(
      `SELECT
         (SELECT jsonb_agg(to_jsonb(row_value)
            ORDER BY row_value.activation_reference)::text
            FROM lawos_email_dms.outlook_desktop_activation_challenges
            AS row_value) AS reservation_rows,
         (SELECT jsonb_agg(to_jsonb(row_value)
            ORDER BY row_value.activation_reference)::text
            FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
            AS row_value) AS evidence_rows,
         (SELECT jsonb_agg(to_jsonb(row_value)
            ORDER BY row_value.activation_authorization_id)::text
            FROM lawos_email_dms.outlook_desktop_activation_authorizations
            AS row_value) AS authorization_rows`,
    )).rows[0];
    const before = await snapshot();
    const retainedTicketCopies = [];
    const retainedCoreTicketCopies = [];
    const retainedCoreSignatureCopies = [];
    let rejectedSignatureDecodes = 0;
    const originalBufferFrom = Buffer.from;
    t.mock.method(Buffer, "from", function rejectPrivateAuthoritySignature(
      value,
      encoding,
      ...rest
    ) {
      const stack = new Error().stack ?? "";
      if (encoding === "base64"
          && stack.includes("loadOperatorReceiptAuthority")
          && stack.includes("outlook-desktop-activation-authority-reservation.js")
          && value === prepared.issueRequest.release_ticket_signature_base64) {
        rejectedSignatureDecodes += 1;
        throw new Error("R4 causal signature decode rejection");
      }
      const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
      if (encoding === "base64"
          && stack.includes("outlook-desktop-assignment-contract.js")) {
        if (value === prepared.issueRequest.release_ticket_base64) {
          retainedCoreTicketCopies.push(bytes);
        } else if (value === prepared.issueRequest.release_ticket_signature_base64) {
          retainedCoreSignatureCopies.push(bytes);
        }
      }
      if (encoding === "base64"
          && stack.includes("loadOperatorReceiptAuthority")
          && stack.includes("outlook-desktop-activation-authority-reservation.js")
          && value === prepared.issueRequest.release_ticket_base64) {
        retainedTicketCopies.push(bytes);
      }
      return bytes;
    });

    await assert.rejects(
      executeOutlookDesktopActivationAuthority({
        activation_contract: {
          issueChallenge() {
            throw new Error("attach must not issue a challenge");
          },
          verifyOperatorActivation() {
            throw new Error("signature decode rejection must precede Task15 verification");
          },
        },
        control_port: port,
        env: enabledEnvironment(),
        event: event("attach_operator_evidence", packet),
      }),
      (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
    );
    assert.equal(rejectedSignatureDecodes, 1);
    assert.equal(retainedTicketCopies.length, 1);
    assert.equal(retainedTicketCopies[0].every((byte) => byte === 0), true);
    assert.equal(retainedCoreTicketCopies.length > 0, true);
    assert.equal(retainedCoreSignatureCopies.length > 0, true);
    for (const bytes of [
      ...retainedCoreTicketCopies,
      ...retainedCoreSignatureCopies,
    ]) assert.equal(bytes.every((byte) => byte === 0), true);
    assert.equal(
      prepared.issueRequest.release_ticket_base64,
      authority.releaseMaterial.ticket_base64,
    );
    assert.equal(
      prepared.issueRequest.release_ticket_signature_base64,
      authority.releaseMaterial.ticket_signature_base64,
    );
    assert.deepEqual(await snapshot(), before);
  });

  for (const rejection of ["wrong-outcome", "wrong-fingerprint"]) {
    await t.test(`S2 wipes transferred READY authority bytes before snapshots on ${rejection}`, async (t) => {
      const restore = useActivationTestEnvironment();
      t.after(restore);
      const fixture = await activationFixture(t);
      const releaseAuthority = currentReleaseAuthority(fixture, `r4-${rejection}`);
      const callbackTicket = Buffer.from(fixture.release_ticket_bytes);
      const callbackSignature = Buffer.from(fixture.release_ticket_signature_bytes);
      const callbackTicketSnapshot = Buffer.from(callbackTicket);
      const callbackSignatureSnapshot = Buffer.from(callbackSignature);
      const retainedSnapshots = [];
      const originalAlloc = Buffer.alloc;
      t.mock.method(Buffer, "alloc", function captureAuthoritySnapshot(...args) {
        const bytes = Reflect.apply(originalAlloc, Buffer, args);
        const stack = new Error().stack ?? "";
        if (stack.includes("snapshotOutlookDesktopBytes")
            && stack.includes("issueAuthorityResult")) retainedSnapshots.push(bytes);
        return bytes;
      });
      const issueRequestId = `oar_r4_${rejection.replace("-", "_")}_001`;
      await assert.rejects(
        executeOutlookDesktopActivationAuthority({
          activation_contract: fixture.contract,
          control_port: inertPort({
            async loadCurrentIssueAuthority(input) {
              return {
                outcome: rejection === "wrong-outcome" ? "ready-drift" : "ready",
                request_fingerprint_sha256: rejection === "wrong-fingerprint"
                  ? hash(Buffer.from("R4 wrong fingerprint\n"))
                  : input.request_fingerprint_sha256,
                approved_release: fixture.approvedRelease,
                pilot_policy: fixture.pilotPolicy,
                release_authority: releaseAuthority,
                release_ticket_bytes: callbackTicket,
                release_ticket_signature_bytes: callbackSignature,
              };
            },
          }),
          env: enabledEnvironment(),
          event: event("issue", {
            candidate_device: fixture.issue_input.candidate_device,
            issue_request_id: issueRequestId,
          }),
          resolve_authenticated_principal: async () => fixture.principal,
        }),
        (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_PORT_RESULT_INVALID",
      );
      assert.equal(retainedSnapshots.length, 0);
      for (const bytes of retainedSnapshots) {
        assert.equal(bytes.every((byte) => byte === 0), true);
      }
      assert.deepEqual(callbackTicketSnapshot, fixture.release_ticket_bytes);
      assert.deepEqual(callbackSignatureSnapshot, fixture.release_ticket_signature_bytes);
      assert.equal(callbackTicket.every((byte) => byte === 0), true);
      assert.equal(callbackSignature.every((byte) => byte === 0), true);
    });
  }

  await t.test("S2 preserves release-authority precedence over malformed transferred bytes", async (t) => {
    const restore = useActivationTestEnvironment();
    t.after(restore);
    const fixture = await activationFixture(t);
    const releaseAuthority = currentReleaseAuthority(fixture, "r6-release-precedence");
    const callbackTicket = Buffer.from(fixture.release_ticket_bytes);
    const callbackSignature = Buffer.alloc(63, 0x6a);
    const retainedSnapshots = [];
    const originalAlloc = Buffer.alloc;
    t.mock.method(Buffer, "alloc", function capturePrematureAuthoritySnapshot(...args) {
      const bytes = Reflect.apply(originalAlloc, Buffer, args);
      const stack = new Error().stack ?? "";
      if (stack.includes("snapshotOutlookDesktopBytes")
          && stack.includes("issueAuthorityResult")) retainedSnapshots.push(bytes);
      return bytes;
    });
    let issueCalls = 0;
    const error = await executeOutlookDesktopActivationAuthority({
      activation_contract: fixture.contract,
      control_port: inertPort({
        async loadCurrentIssueAuthority(input) {
          return {
            outcome: "ready",
            request_fingerprint_sha256: input.request_fingerprint_sha256,
            approved_release: fixture.approvedRelease,
            pilot_policy: fixture.pilotPolicy,
            release_authority: {
              ...releaseAuthority,
              release_authority_sha256: "not-a-release-authority-digest",
            },
            release_ticket_bytes: callbackTicket,
            release_ticket_signature_bytes: callbackSignature,
          };
        },
        async issueActivationChallenge() {
          issueCalls += 1;
          throw new Error("invalid protected release must not issue a challenge");
        },
      }),
      env: enabledEnvironment(),
      event: event("issue", {
        candidate_device: fixture.issue_input.candidate_device,
        issue_request_id: "oar_r6_release_precedence_001",
      }),
      resolve_authenticated_principal: async () => fixture.principal,
    }).then(
      () => null,
      (reason) => reason,
    );
    for (const bytes of retainedSnapshots) {
      assert.equal(bytes.every((byte) => byte === 0), true);
    }
    assert.deepEqual({
      error_code: error?.code,
      issue_calls: issueCalls,
      retained_snapshot_count: retainedSnapshots.length,
      transferred_signature_zero: callbackSignature.every((byte) => byte === 0),
      transferred_ticket_zero: callbackTicket.every((byte) => byte === 0),
    }, {
      error_code: "OUTLOOK_ACTIVATION_AUTHORITY_RELEASE_INVALID",
      issue_calls: 0,
      retained_snapshot_count: 0,
      transferred_signature_zero: true,
      transferred_ticket_zero: true,
    });
  });

  await t.test("S3 Task15 input never decodes a fallback receipt from stored base64", (t) => {
    const receiptBase64 = Buffer.from("R4 stored operator receipt fallback\n")
      .toString("base64");
    const retainedFallbackCopies = [];
    const originalBufferFrom = Buffer.from;
    t.mock.method(Buffer, "from", function captureFallbackDecode(value, encoding, ...rest) {
      const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
      const stack = new Error().stack ?? "";
      if (value === receiptBase64 && encoding === "base64"
          && stack.includes("createOutlookDesktopActivationReservationTask15Input")) {
        retainedFallbackCopies.push(bytes);
      }
      return bytes;
    });
    assert.throws(
      () => createOutlookDesktopActivationReservationTask15Input({
        operator_receipt_base64: receiptBase64,
        operator_signature_base64: "not-canonical-base64",
      }),
      (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_INVALID",
    );
    assert.equal(retainedFallbackCopies.length, 0);
  });

  await t.test("S4 wipes rejected replay response copies and the transferred callback bytes", async (t) => {
    const restore = useActivationTestEnvironment();
    t.after(restore);
    const fixture = await activationFixture(t);
    const marker = "r4-replay-response-late-rejection";
    const callbackResponse = canonicalBytes({ marker });
    const callbackSnapshot = Buffer.from(callbackResponse);
    const retainedCopies = [];
    const originalAlloc = Buffer.alloc;
    const originalBufferFrom = Buffer.from;
    t.mock.method(Buffer, "alloc", function captureReplaySnapshot(...args) {
      const bytes = Reflect.apply(originalAlloc, Buffer, args);
      const stack = new Error().stack ?? "";
      if (args[0] === callbackResponse.byteLength
          && stack.includes("parseCanonicalResponse")) retainedCopies.push(bytes);
      return bytes;
    });
    t.mock.method(Buffer, "from", function captureReplayCanonical(value, encoding, ...rest) {
      const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
      const stack = new Error().stack ?? "";
      if (typeof value === "string" && value.includes(marker)
          && stack.includes("parseCanonicalResponse")) retainedCopies.push(bytes);
      return bytes;
    });
    await assert.rejects(
      executeOutlookDesktopActivationAuthority({
        activation_contract: fixture.contract,
        control_port: inertPort({
          async loadCurrentIssueAuthority(input) {
            return {
              outcome: "replay",
              request_fingerprint_sha256: input.request_fingerprint_sha256,
              response_bytes: callbackResponse,
            };
          },
        }),
        env: enabledEnvironment(),
        event: event("issue", {
          candidate_device: fixture.issue_input.candidate_device,
          issue_request_id: "oar_r4_replay_response_001",
        }),
        resolve_authenticated_principal: async () => fixture.principal,
      }),
      (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID",
    );
    assert.equal(retainedCopies.length, 2);
    for (const bytes of retainedCopies) {
      assert.equal(bytes.every((byte) => byte === 0), true);
    }
    assert.deepEqual(callbackSnapshot, canonicalBytes({ marker }));
    assert.equal(callbackResponse.every((byte) => byte === 0), true);
  });

  await t.test("issued-challenge validation wipes late-rejected runtime copies", async (t) => {
    const restore = useActivationTestEnvironment();
    t.after(restore);
    const fixture = await activationFixture(t);
    const releaseAuthority = currentReleaseAuthority(fixture, "r4-late-challenge");
    const callbackTicket = Buffer.from(fixture.release_ticket_bytes);
    const callbackSignature = Buffer.from(fixture.release_ticket_signature_bytes);
    const callbackTicketSnapshot = Buffer.from(callbackTicket);
    const callbackSignatureSnapshot = Buffer.from(callbackSignature);
    const retainedAuthoritySnapshots = [];
    const retainedChallengeCopies = [];
    let issuedChallengeBase64;
    const originalAlloc = Buffer.alloc;
    const originalBufferFrom = Buffer.from;
    t.mock.method(Buffer, "alloc", function captureIssueAuthoritySnapshot(...args) {
      const bytes = Reflect.apply(originalAlloc, Buffer, args);
      const stack = new Error().stack ?? "";
      if (stack.includes("snapshotOutlookDesktopBytes")
          && stack.includes("issueAuthorityResult")) {
        retainedAuthoritySnapshots.push(bytes);
      }
      return bytes;
    });
    t.mock.method(Buffer, "from", function captureIssuedChallengeCopy(
      value,
      encoding,
      ...rest
    ) {
      const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
      const stack = new Error().stack ?? "";
      if (encoding === "base64" && value === issuedChallengeBase64
          && stack.includes("validateIssueReceipt")) {
        retainedChallengeCopies.push(bytes);
      } else if (typeof value === "string"
          && value.includes("lawos.outlook-desktop-activation-challenge.v1")
          && stack.includes("outlook-desktop-activation-authority.js")
          && !stack.includes("outlook-desktop-activation-challenge.js")) {
        retainedChallengeCopies.push(bytes);
      }
      return bytes;
    });
    await assert.rejects(
      executeOutlookDesktopActivationAuthority({
        activation_contract: fixture.contract,
        control_port: inertPort({
          async loadCurrentIssueAuthority(input) {
            return {
              outcome: "ready",
              request_fingerprint_sha256: input.request_fingerprint_sha256,
              approved_release: fixture.approvedRelease,
              pilot_policy: fixture.pilotPolicy,
              release_authority: releaseAuthority,
              release_ticket_bytes: callbackTicket,
              release_ticket_signature_bytes: callbackSignature,
            };
          },
          async issueActivationChallenge(input) {
            issuedChallengeBase64 = input.issued_challenge_base64;
            return {
              ...coreIssueReceipt(
                fixture,
                input,
                releaseAuthority,
                `odi_${Buffer.alloc(24, 0x72).toString("base64url")}`,
              ),
              valid_until: new Date(
                Date.parse(input.issued_challenge.expires_at) - 1_000,
              ).toISOString(),
            };
          },
        }),
        env: enabledEnvironment(),
        event: event("issue", {
          candidate_device: fixture.issue_input.candidate_device,
          issue_request_id: "oar_r4_late_challenge_001",
        }),
        resolve_authenticated_principal: async () => fixture.principal,
      }),
      (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_RESULT_INVALID",
    );
    assert.equal(retainedAuthoritySnapshots.length, 2);
    assert.equal(retainedChallengeCopies.length >= 2, true);
    for (const bytes of [
      ...retainedAuthoritySnapshots,
      ...retainedChallengeCopies,
    ]) assert.equal(bytes.every((byte) => byte === 0), true);
    assert.deepEqual(callbackTicketSnapshot, fixture.release_ticket_bytes);
    assert.deepEqual(callbackSignatureSnapshot, fixture.release_ticket_signature_bytes);
    assert.equal(callbackTicket.every((byte) => byte === 0), true);
    assert.equal(callbackSignature.every((byte) => byte === 0), true);
  });

  await t.test("successful service issue wipes internal response and validation copies", async (t) => {
    const restore = useActivationTestEnvironment();
    t.after(restore);
    const fixture = await activationFixture(t);
    const releaseAuthority = currentReleaseAuthority(fixture, "r4-service-success");
    const callbackTicket = Buffer.from(fixture.release_ticket_bytes);
    const callbackSignature = Buffer.from(fixture.release_ticket_signature_bytes);
    const callbackTicketSnapshot = Buffer.from(callbackTicket);
    const callbackSignatureSnapshot = Buffer.from(callbackSignature);
    const retainedInternalResponses = [];
    const retainedChallengeCopies = [];
    let issuedChallengeBase64;
    const originalBufferFrom = Buffer.from;
    t.mock.method(Buffer, "from", function captureServiceInternalCopy(
      value,
      encoding,
      ...rest
    ) {
      const bytes = Reflect.apply(originalBufferFrom, Buffer, [value, encoding, ...rest]);
      const stack = new Error().stack ?? "";
      if (typeof value === "string"
          && value.includes("lawos.outlook-desktop-activation-authority-result.v1")) {
        if (stack.includes("outlook-desktop-activation-authority-service.js")) {
          retainedInternalResponses.push(bytes);
        } else if (stack.includes("issuePublicPackage")) {
          retainedInternalResponses.push(bytes);
        }
      }
      if (encoding === "base64" && value === issuedChallengeBase64
          && stack.includes("validateIssueReceipt")) {
        retainedChallengeCopies.push(bytes);
      } else if (typeof value === "string"
          && value.includes("lawos.outlook-desktop-activation-challenge.v1")
          && stack.includes("outlook-desktop-activation-authority.js")
          && !stack.includes("outlook-desktop-activation-challenge.js")) {
        retainedChallengeCopies.push(bytes);
      }
      return bytes;
    });
    const service = createOutlookDesktopActivationService({
      activation_contract: fixture.contract,
      control_port: inertPort({
        async loadCurrentIssueAuthority(input) {
          return {
            outcome: "ready",
            request_fingerprint_sha256: input.request_fingerprint_sha256,
            approved_release: fixture.approvedRelease,
            pilot_policy: fixture.pilotPolicy,
            release_authority: releaseAuthority,
            release_ticket_bytes: callbackTicket,
            release_ticket_signature_bytes: callbackSignature,
          };
        },
        async issueActivationChallenge(input) {
          issuedChallengeBase64 = input.issued_challenge_base64;
          return coreIssueReceipt(
            fixture,
            input,
            releaseAuthority,
            `odi_${Buffer.alloc(24, 0x73).toString("base64url")}`,
          );
        },
      }),
      env: enabledEnvironment(),
      lifecycle_port: inertLifecyclePort(),
    });
    const result = await service.issueChallenge({
      candidate_device: fixture.issue_input.candidate_device,
      issue_request_id: "oar_r4_service_success_001",
      principal: signedSessionPrincipal(fixture.principal),
    });
    assert.deepEqual(Object.keys(result), [
      "activation_reference", "installation_id", "issued_challenge",
      "issued_challenge_sha256", "release_authority_sha256",
    ]);
    assert.equal(retainedInternalResponses.length, 2);
    assert.equal(retainedChallengeCopies.length >= 2, true);
    for (const bytes of [
      ...retainedInternalResponses,
      ...retainedChallengeCopies,
    ]) assert.equal(bytes.every((byte) => byte === 0), true);
    assert.deepEqual(callbackTicketSnapshot, fixture.release_ticket_bytes);
    assert.deepEqual(callbackSignatureSnapshot, fixture.release_ticket_signature_bytes);
    assert.equal(callbackTicket.every((byte) => byte === 0), true);
    assert.equal(callbackSignature.every((byte) => byte === 0), true);
  });
});

test("finalize rejects a different core-issued registration event before lifecycle verification or authorization", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  const changedEventId = `oae_${"b".repeat(32)}`;
  const changedRawRequestBody = canonicalBytes({
    event_id: changedEventId,
    idempotency_key: ISSUE_REQUEST_ID,
    local_measurement_evidence_sha256:
      scenario.evidenceReservation.local_measurement_evidence_sha256,
    request_id: ISSUE_REQUEST_ID,
  });
  let lifecycleVerifierCalls = 0;
  let lifecycleFingerprintCalls = 0;
  let measurementVerifierCalls = 0;
  let authorizeCalls = 0;

  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("finalize", {
        ...scenario.request,
        proof: {
          ...scenario.proof,
          event_id: changedEventId,
        },
        raw_request_body_base64: changedRawRequestBody.toString("base64"),
      }),
      activation_contract: {
        issueChallenge: scenario.fixture.contract.issueChallenge,
        verifyOperatorActivation: async () => scenario.verifiedActivation,
      },
      clock: () => Date.parse("2026-08-16T12:00:10.000Z"),
      control_port: inertPort({
        loadActivationReservation: async () => scenario.evidenceReservation,
        authorizeActivation: async () => {
          authorizeCalls += 1;
          return scenario.authorizationResult;
        },
      }),
      lifecycle_transition_fingerprint: () => {
        lifecycleFingerprintCalls += 1;
        return scenario.semanticFingerprint;
      },
      resolve_authenticated_principal: async () => scenario.fixture.principal,
      verify_lifecycle_proof: async () => {
        lifecycleVerifierCalls += 1;
        return {
          ...scenario.verifiedProof,
          rawRequestSha256: hash(changedRawRequestBody),
        };
      },
      verify_operator_measurement: async ({ expected_sha256 }) => {
        measurementVerifierCalls += 1;
        return { local_measurement_evidence_sha256: expected_sha256 };
      },
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_BINDING_MISMATCH",
  );
  assert.equal(lifecycleVerifierCalls, 0);
  assert.equal(lifecycleFingerprintCalls, 0);
  assert.equal(measurementVerifierCalls, 0);
  assert.equal(authorizeCalls, 0);
});

test("service registration re-reads authorized state before lifecycle mint and returns only authorization", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  const signedTransition = createOutlookDesktopLifecycleSignedTransition({
    privateKey: scenario.fixture.keys.device.privateKey,
    proof: scenario.proof,
  });
  const signedSubmission = {
    activation_reference: scenario.activationReference.activation_id,
    raw_request_body_base64: signedTransition.raw_request_body_base64,
    proof: signedTransition.proof,
    proof_signature_base64: signedTransition.proof_signature_base64,
  };
  verifyOutlookDesktopLifecycleProof({
    proof: signedSubmission.proof,
    proofSignatureBase64: signedSubmission.proof_signature_base64,
    rawRequestBody: Buffer.from(signedSubmission.raw_request_body_base64, "base64"),
  });
  const authorizedReservation = attachedReservation(
    scenario.fixture,
    scenario.activationReference,
    scenario.releaseAuthority,
    {
      state: "authorized",
      authorizationResult: scenario.authorizationResult,
      authorizationRequestSha256: scenario.authorizationRequestSha256,
      proof: scenario.proof,
      semanticFingerprint: scenario.semanticFingerprint,
      verifiedActivation: scenario.verifiedActivation,
      verifiedProof: scenario.verifiedProof,
    },
  );
  const order = [];
  let storedReservation = scenario.evidenceReservation;
  const controlPort = inertPort({
    async loadActivationReservation() {
      order.push(`load:${storedReservation.state}`);
      return storedReservation;
    },
    async authorizeActivation() {
      order.push("authorize");
      storedReservation = authorizedReservation;
      return scenario.authorizationResult;
    },
  });
  const authorization = Object.freeze({
    authorization_binding_sha256: hash(Buffer.from("lifecycle authorization\n")),
    authorized_at: scenario.authorizationResult.authorized_at,
    lifecycle_authorization_id: scenario.proof.proof_id,
    outcome: "authorized",
    tenant_id: scenario.fixture.principal.lawos_tenant_id,
    valid_until: scenario.authorizationResult.valid_until,
  });
  let lifecycleEvent = null;
  const lifecyclePort = inertLifecyclePort({
    async verifyLifecycleTransition(input) {
      order.push("verify");
      lifecycleEvent = input;
      return authorization;
    },
  });
  const service = createOutlookDesktopActivationService({
    activation_contract: {
      issueChallenge: scenario.fixture.contract.issueChallenge,
      verifyOperatorActivation: async () => scenario.verifiedActivation,
    },
    clock: () => Date.parse(scenario.authorizationResult.authorized_at),
    control_port: controlPort,
    env: enabledEnvironment(),
    lifecycle_port: lifecyclePort,
  });
  const result = await service.consumeRegistration({
    principal: signedSessionPrincipal(scenario.fixture.principal),
    submission: signedSubmission,
  });
  assert.deepEqual(order, [
    "load:evidence_attached", "authorize", "load:authorized", "verify",
  ]);
  assert.equal(result.authorization, authorization);
  assert.deepEqual(Object.keys(result), ["authorization"]);
  assert.deepEqual(Object.keys(lifecycleEvent), [
    "schema_version", "action", "mode", "raw_request_body_base64",
    "authenticated_principal", "activation_reference", "proof",
    "proof_signature_base64",
  ]);
  assert.equal(lifecycleEvent.activation_reference,
    scenario.activationReference.activation_id);
  assert.equal(lifecycleEvent.proof.installation_id,
    scenario.activationReference.installation_id);
  assert.equal(Object.hasOwn(lifecycleEvent, "operator_receipt_base64"), false);
  assert.equal(Object.hasOwn(lifecycleEvent, "release_ticket_base64"), false);

  let forbiddenMintCalls = 0;
  const staleService = createOutlookDesktopActivationService({
    activation_contract: {
      issueChallenge: scenario.fixture.contract.issueChallenge,
      verifyOperatorActivation: async () => scenario.verifiedActivation,
    },
    clock: () => Date.parse(scenario.authorizationResult.authorized_at),
    control_port: inertPort({
      loadActivationReservation: async () => scenario.evidenceReservation,
      authorizeActivation: async () => scenario.authorizationResult,
    }),
    env: enabledEnvironment(),
    lifecycle_port: inertLifecyclePort({
      verifyLifecycleTransition: async () => {
        forbiddenMintCalls += 1;
        return authorization;
      },
    }),
  });
  await assert.rejects(
    staleService.consumeRegistration({
      principal: signedSessionPrincipal(scenario.fixture.principal),
      submission: signedSubmission,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_SERVICE_TOCTOU_CONFLICT",
  );
  assert.equal(forbiddenMintCalls, 0);
});

test("finalize rejects public operator or release authority, unattached evidence, and mismatched ODI before authorization", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  let loadCalls = 0;
  let authorizeCalls = 0;
  let loadedReservation = scenario.evidenceReservation;
  let authorizationResult = scenario.authorizationResult;
  const port = inertPort({
    async loadActivationReservation() {
      loadCalls += 1;
      return loadedReservation;
    },
    async authorizeActivation() {
      authorizeCalls += 1;
      return authorizationResult;
    },
  });
  const options = {
    env: enabledEnvironment(),
    activation_contract: {
      issueChallenge: scenario.fixture.contract.issueChallenge,
      verifyOperatorActivation: async () => scenario.verifiedActivation,
    },
    clock: () => Date.parse("2026-08-16T12:00:10.000Z"),
    control_port: port,
    lifecycle_transition_fingerprint: () => scenario.semanticFingerprint,
    resolve_authenticated_principal: async () => scenario.fixture.principal,
    verify_lifecycle_proof: async () => scenario.verifiedProof,
    verify_operator_measurement: async ({ expected_sha256 }) => ({
      local_measurement_evidence_sha256: expected_sha256,
    }),
  };
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      event: event("finalize", {
        ...scenario.request,
        operator_receipt_base64: scenario.fixture.operator_receipt_bytes.toString("base64"),
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_FINALIZE_REQUEST_INVALID",
  );
  assert.equal(loadCalls, 0);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      event: event("finalize", {
        ...scenario.request,
        activation_reference: scenario.activationReference,
      }),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_FINALIZE_REQUEST_INVALID",
  );
  assert.equal(loadCalls, 0);

  loadedReservation = issuedReservation(
    scenario.fixture,
    scenario.activationReference,
    scenario.releaseAuthority,
  );
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      control_port: port,
      event: event("finalize", scenario.request),
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_NOT_ATTACHED",
  );

  loadedReservation = scenario.evidenceReservation;
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      control_port: port,
      event: event("finalize", {
        ...scenario.request,
        proof: {
          ...scenario.proof,
          installation_id: `odi_${Buffer.alloc(24, 0x58).toString("base64url")}`,
        },
      }),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_BINDING_MISMATCH",
  );
  const {
    challenge_nonce_base64url: omittedChallengeNonce,
    ...legacyNonceProof
  } = scenario.proof;
  assert.equal(omittedChallengeNonce, scenario.fixture.challenge.challenge_nonce_base64url);
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      control_port: port,
      event: event("finalize", {
        ...scenario.request,
        proof: {
          ...legacyNonceProof,
          server_nonce_base64url: omittedChallengeNonce,
        },
      }),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_BINDING_MISMATCH",
  );
  assert.equal(authorizeCalls, 0);
  authorizationResult = {
    ...scenario.authorizationResult,
    activation_receipt_sha256:
      scenario.authorizationResult.activation_authorization_receipt_sha256,
    activation_authorization_receipt_sha256:
      scenario.authorizationResult.activation_receipt_sha256,
  };
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      ...options,
      control_port: port,
      event: event("finalize", scenario.request),
    }),
    (error) => error?.code
      === "OUTLOOK_ACTIVATION_AUTHORITY_AUTHORIZATION_RESULT_INVALID",
  );
  assert.equal(authorizeCalls, 1);
});

test("authorized and consumed exact replay use stored authorization time and reject changed command bytes before SQL", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  let historicalCalls = 0;
  let authorizeCalls = 0;
  for (const state of ["authorized", "consumed"]) {
    const reservation = attachedReservation(
      scenario.fixture,
      scenario.activationReference,
      scenario.releaseAuthority,
      {
        state,
        authorizationResult: scenario.authorizationResult,
        authorizationRequestSha256: scenario.authorizationRequestSha256,
        proof: scenario.proof,
        semanticFingerprint: scenario.semanticFingerprint,
        verifiedActivation: scenario.verifiedActivation,
        verifiedProof: scenario.verifiedProof,
      },
    );
    const result = await executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("finalize", scenario.request),
      activation_contract: {
        issueChallenge: scenario.fixture.contract.issueChallenge,
        verifyOperatorActivation() {
          throw new Error("live Task15 verification must not run for replay");
        },
      },
      clock: () => Date.parse("2026-08-17T12:00:00.000Z"),
      control_port: inertPort({
        loadActivationReservation: async () => reservation,
        authorizeActivation: async () => {
          authorizeCalls += 1;
          return scenario.authorizationResult;
        },
      }),
      lifecycle_transition_fingerprint: () => scenario.semanticFingerprint,
      resolve_authenticated_principal: async () => scenario.fixture.principal,
      verify_lifecycle_proof: async () => scenario.verifiedProof,
      verify_operator_measurement: async ({ expected_sha256 }) => ({
        local_measurement_evidence_sha256: expected_sha256,
      }),
      verify_task15_historical: async ({ verification_time }) => {
        historicalCalls += 1;
        assert.equal(verification_time, Date.parse(scenario.authorizationResult.authorized_at));
        return scenario.verifiedActivation;
      },
    });
    assert.deepEqual(
      JSON.parse(result.toString("utf8")).activation_receipt,
      scenario.authorizationResult,
    );
  }
  assert.equal(historicalCalls, 2);
  assert.equal(authorizeCalls, 2);

  const authorizedReservation = attachedReservation(
    scenario.fixture,
    scenario.activationReference,
    scenario.releaseAuthority,
    {
      state: "authorized",
      authorizationResult: scenario.authorizationResult,
      authorizationRequestSha256: scenario.authorizationRequestSha256,
      proof: scenario.proof,
      semanticFingerprint: scenario.semanticFingerprint,
      verifiedActivation: scenario.verifiedActivation,
      verifiedProof: scenario.verifiedProof,
    },
  );
  let changedAuthorizeCalls = 0;
  const changedBody = canonicalBytes({
    event_id: "event-register-jwsuh-changed",
    idempotency_key: "register-jwsuh-001",
    local_measurement_evidence_sha256:
      scenario.evidenceReservation.local_measurement_evidence_sha256,
    request_id: "request-register-jwsuh-001",
  });
  await assert.rejects(
    executeOutlookDesktopActivationAuthority({
      env: enabledEnvironment(),
      event: event("finalize", {
        ...scenario.request,
        raw_request_body_base64: changedBody.toString("base64"),
      }),
      activation_contract: {
        issueChallenge: scenario.fixture.contract.issueChallenge,
        verifyOperatorActivation: async () => scenario.verifiedActivation,
      },
      clock: () => Date.parse("2026-08-17T12:00:00.000Z"),
      control_port: inertPort({
        loadActivationReservation: async () => authorizedReservation,
        authorizeActivation: async () => {
          changedAuthorizeCalls += 1;
          return scenario.authorizationResult;
        },
      }),
      lifecycle_transition_fingerprint: () => scenario.semanticFingerprint,
      resolve_authenticated_principal: async () => scenario.fixture.principal,
      verify_lifecycle_proof: async ({ rawRequestBody }) => ({
        ...scenario.verifiedProof,
        rawRequestSha256: hash(rawRequestBody),
      }),
      verify_operator_measurement: async ({ expected_sha256 }) => ({
        local_measurement_evidence_sha256: expected_sha256,
      }),
      verify_task15_historical: async () => scenario.verifiedActivation,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH",
  );
  assert.equal(changedAuthorizeCalls, 0);
});

test("narrow reservation assertor rejects a changed lifecycle proof identity on exact replay", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  const reservation = attachedReservation(
    scenario.fixture,
    scenario.activationReference,
    scenario.releaseAuthority,
    {
      state: "authorized",
      authorizationResult: scenario.authorizationResult,
      authorizationRequestSha256: scenario.authorizationRequestSha256,
      proof: scenario.proof,
      semanticFingerprint: scenario.semanticFingerprint,
      verifiedActivation: scenario.verifiedActivation,
      verifiedProof: scenario.verifiedProof,
    },
  );
  const authority = await assertOutlookDesktopActivationReservation({
    activation_contract: {
      verifyOperatorActivation() {
        throw new Error("live verification is forbidden for replay");
      },
    },
    historical_verifier: async () => scenario.verifiedActivation,
    reservation,
  });
  assert.throws(
    () => assertOutlookDesktopActivationReservationProofBinding({
      current_time: Date.parse("2026-08-17T12:00:00.000Z"),
      proof: {
        ...scenario.proof,
        proof_id: "proof-register-jwsuh-changed",
      },
      proof_fingerprint_sha256: scenario.semanticFingerprint,
      reservation_authority: authority,
      verified_proof: scenario.verifiedProof,
    }),
    (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH",
  );
});

test("narrow reservation assertor rejects stored OAR or OAE drift before historical Task15 verification", async (t) => {
  const restore = useActivationTestEnvironment();
  t.after(restore);
  const scenario = await finalizeFixture(t);
  const reservation = attachedReservation(
    scenario.fixture,
    scenario.activationReference,
    scenario.releaseAuthority,
    {
      state: "authorized",
      authorizationResult: scenario.authorizationResult,
      authorizationRequestSha256: scenario.authorizationRequestSha256,
      proof: scenario.proof,
      semanticFingerprint: scenario.semanticFingerprint,
      verifiedActivation: scenario.verifiedActivation,
      verifiedProof: scenario.verifiedProof,
    },
  );
  let historicalCalls = 0;
  for (const drift of [
    { request_id: "oar_registration_jwsuh_changed" },
    { idempotency_key: "oar_registration_jwsuh_changed" },
    { event_id: `oae_${"b".repeat(32)}` },
  ]) {
    await assert.rejects(
      assertOutlookDesktopActivationReservation({
        activation_contract: scenario.fixture.contract,
        historical_verifier: async () => {
          historicalCalls += 1;
          return scenario.verifiedActivation;
        },
        reservation: { ...reservation, ...drift },
      }),
      (error) => error?.code === "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_INVALID",
    );
  }
  assert.equal(historicalCalls, 0);
});
