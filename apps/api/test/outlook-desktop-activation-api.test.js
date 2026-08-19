import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";
import test, { after } from "node:test";
import { isDeepStrictEqual } from "node:util";

import {
  ACTIVATION_NOW,
  activationFixture,
  canonicalBytes,
} from "../../../packages/email-dms/test/helpers/outlook-desktop-activation-contract-fixture.js";
import {
  useActivationTestEnvironment,
} from "../../../packages/email-dms/test/helpers/outlook-desktop-activation-test-utils.js";
import {
  createOutlookDesktopLifecycleSignedTransition,
} from "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import {
  OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
  OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
  OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
  handleOutlookDesktopActivationApiRequest,
} from "../src/outlook-desktop-activation-runtime-context.js";
import {
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
  createOutlookDesktopLifecycleControlPort,
  createOutlookDesktopLifecycleProofTranscript,
  executeOutlookDesktopLifecycleVerifier,
  outlookDesktopLifecycleTransitionFingerprint,
} from "../src/outlook-desktop-lifecycle-verifier.js";
import { outlookDesktopPrincipalRef } from "../src/session-auth.js";

after(useActivationTestEnvironment());

const INSTALLATION_ID = "odi_task15_api_000000000001";
const ISSUE_REQUEST_ID = "oar_task15_api_000000000001";
const EVENT_ID = "oae_0123456789abcdef0123456789abcdef";
const RELEASE_AUTHORITY_SHA256 = "a".repeat(64);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const challengeSha256 = (value) => sha256(canonicalBytes(value));
const issuedChallengeSha256 = (item) => challengeSha256(item.challenge);

function sessionPrincipal(item, overrides = {}) {
  return {
    tenant_id: item.principal.lawos_tenant_id,
    user_id: item.principal.lawos_user_id,
    entra_subject_id: item.principal.entra_subject,
    scopes: [OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE],
    ...overrides,
  };
}

function roster(item) {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "task15-api-v1",
    entries: [
      {
        tenant_id: item.principal.lawos_tenant_id,
        user_id: item.principal.lawos_user_id,
        entra_subject_id: item.principal.entra_subject,
        enabled: true,
      },
      ...Array.from({ length: 9 }, (_, index) => ({
        tenant_id: item.principal.lawos_tenant_id,
        user_id: `user_task15_${index + 2}`,
        entra_subject_id: `subject_task15_${index + 2}`,
        enabled: true,
      })),
    ],
  });
}

function permissionContext(value, allowed = true) {
  return {
    principal: value,
    rules: allowed ? [{
      id: "outlook-desktop-activation-manage",
      effect: "allow",
      action_prefix: "outlook:connection:",
    }] : [],
    object_acl: [],
  };
}

function proof(item, overrides = {}) {
  return {
    operation: "register",
    tenant_id: item.principal.lawos_tenant_id,
    user_id: item.principal.lawos_user_id,
    entra_subject_id: item.principal.entra_subject,
    device_id: item.challenge.candidate_device.continuity_key_fingerprint_sha256,
    installation_id: INSTALLATION_ID,
    release_authority_sha256: RELEASE_AUTHORITY_SHA256,
    local_measurement_evidence_sha256:
      item.challenge.local_measurement_evidence_sha256,
    policy_version: item.challenge.pilot_policy.policy_revision,
    expected_state_version: 1,
    request_id: ISSUE_REQUEST_ID,
    event_id: EVENT_ID,
    idempotency_key: ISSUE_REQUEST_ID,
    challenge_nonce_base64url: item.challenge.challenge_nonce_base64url,
    challenge_id: item.challenge.activation_id,
    issued_challenge_sha256: issuedChallengeSha256(item),
    activation_receipt_sha256: sha256(item.operator_receipt_bytes),
    proof_id: "lifecycle_task15_register_0001",
    issued_at_epoch_ms: String(ACTIVATION_NOW),
    expires_at_epoch_ms: String(ACTIVATION_NOW + 4 * 60 * 1_000),
    retire_intent_id: null,
    retire_reason: null,
    device_public_key_spki_base64:
      item.challenge.candidate_device.continuity_public_key_spki,
    ...overrides,
  };
}

function consumptionBody(item, overrides = {}) {
  const lifecycleProof = overrides.proof ?? proof(item);
  let transition;
  try {
    transition = createOutlookDesktopLifecycleSignedTransition({
      privateKey: item.keys.device.privateKey,
      proof: lifecycleProof,
    });
  } catch {
    transition = {
      raw_request_body_base64: Buffer.from(JSON.stringify({
        request_id: lifecycleProof.request_id,
        event_id: lifecycleProof.event_id,
        idempotency_key: lifecycleProof.idempotency_key,
        local_measurement_evidence_sha256:
          lifecycleProof.local_measurement_evidence_sha256,
      })).toString("base64"),
      proof: lifecycleProof,
      proof_signature_base64: Buffer.alloc(64, 0x42).toString("base64"),
    };
  }
  return {
    activation_reference: item.challenge.activation_id,
    raw_request_body_base64: transition.raw_request_body_base64,
    proof: transition.proof,
    proof_signature_base64: transition.proof_signature_base64,
    ...overrides,
  };
}

function activationContractFor(item) {
  return {
    verifyOperatorActivation(input) {
      const verified = item.contract.verifyOperatorActivation(input);
      const localMeasurement = verified.bindings
        .local_measurement_evidence_sha256
        ?? item.challenge.local_measurement_evidence_sha256;
      return {
        ...verified,
        bindings: {
          ...verified.bindings,
          local_measurement_evidence_sha256: localMeasurement,
        },
        operator: {
          ...verified.operator,
          local_measurement_evidence_sha256: localMeasurement,
        },
      };
    },
  };
}

function activationReservationInput(item) {
  return {
    activation_request: item.request,
    issued_challenge: item.challenge,
    operator_receipt_bytes: item.operator_receipt_bytes,
    operator_receipt_signature_bytes: item.operator_receipt_signature_bytes,
    release_ticket_bytes: item.release_ticket_bytes,
    release_ticket_signature_bytes: item.release_ticket_signature_bytes,
  };
}

function successEnvelope(
  authorization,
  responseStatus = 201,
  installationId = authorization.installation_id,
) {
  return {
    response_status: responseStatus,
    body: {
      outcome: "registered",
      installation: {
        installation_id: installationId,
        status: "active",
        state_version: 1,
        lease_expires_at: "2026-08-24T00:00:00.000Z",
        retired_at: null,
      },
      private_authority_detail: "must-not-escape",
    },
  };
}

function lifecyclePortFixture(item, {
  calls,
  registrationInstallationId,
  registrationResponseStatus,
}) {
  const expectedBody = consumptionBody(item);
  const expectedProof = expectedBody.proof;
  const expectedRawRequestBody = Buffer.from(
    expectedBody.raw_request_body_base64,
    "base64",
  );
  const expectedTranscriptSha256 = sha256(
    createOutlookDesktopLifecycleProofTranscript({
      proof: expectedProof,
      rawRequestBody: expectedRawRequestBody,
    }),
  );
  const expectedSignatureSha256 = sha256(Buffer.from(
    expectedBody.proof_signature_base64,
    "base64",
  ));
  const expectedRequestFingerprint =
    outlookDesktopLifecycleTransitionFingerprint({ proof: expectedProof });
  const expectedIssuedAt = new Date(
    Number(expectedProof.issued_at_epoch_ms),
  ).toISOString();
  const expectedExpiresAt = new Date(
    Number(expectedProof.expires_at_epoch_ms),
  ).toISOString();
  const activationContract = activationContractFor(item);
  const evidenceBindingSha256 = sha256("activation evidence binding");
  let lifecyclePort;

  lifecyclePort = createOutlookDesktopLifecycleControlPort({
    verifyLifecycleTransition: (event) => (
      executeOutlookDesktopLifecycleVerifier({
        event,
        activationContract,
        async loadActivationReservation() {
          return activationReservationInput(item);
        },
        async assertActivationReservation({
          activation_contract: contract,
          reservation,
        }) {
          const verifiedActivation = contract.verifyOperatorActivation(
            reservation,
          );
          return Object.freeze({
            mode: "exact_replay",
            state: "authorized",
            activation_reference: expectedProof.challenge_id,
            installation_id: expectedProof.installation_id,
            authorized_at: expectedIssuedAt,
            reservation: Object.freeze({
              activation_reference: expectedProof.challenge_id,
              installation_id: expectedProof.installation_id,
              release_authority_sha256:
                expectedProof.release_authority_sha256,
              issue_request_id: expectedProof.request_id,
              registration_event_id: expectedProof.event_id,
              challenge_nonce_base64url:
                expectedProof.challenge_nonce_base64url,
              issued_challenge_sha256:
                expectedProof.issued_challenge_sha256,
              local_measurement_evidence_sha256:
                expectedProof.local_measurement_evidence_sha256,
              valid_until: expectedExpiresAt,
              proof_id: expectedProof.proof_id,
              idempotency_key: expectedProof.idempotency_key,
              request_id: expectedProof.request_id,
              event_id: expectedProof.event_id,
              request_fingerprint: expectedRequestFingerprint,
              device_command_sha256: sha256(expectedRawRequestBody),
              device_proof_transcript_sha256: expectedTranscriptSha256,
              device_signature_sha256: expectedSignatureSha256,
              proof_issued_at: expectedIssuedAt,
              proof_expires_at: expectedExpiresAt,
              evidence_binding_sha256: evidenceBindingSha256,
              activation_replay_identity: Object.freeze({
                replay_identity_sha256:
                  verifiedActivation.single_use_consumption
                    .replay_identity_sha256,
              }),
            }),
            verified_activation: verifiedActivation,
          });
        },
        assertActivationReservationProofBinding({
          proof: actualProof,
          proof_fingerprint_sha256: proofFingerprint,
          reservation_authority: reservationAuthority,
          verified_proof: verifiedProof,
        }) {
          if (!isDeepStrictEqual(actualProof, expectedProof)
              || proofFingerprint !== expectedRequestFingerprint
              || verifiedProof.rawRequestSha256
                !== sha256(expectedRawRequestBody)
              || verifiedProof.transcriptSha256
                !== expectedTranscriptSha256) {
            throw new Error("test activation reservation changed");
          }
          return Object.freeze({
            activation_reference: expectedProof.challenge_id,
            authorization: Object.freeze({
              activation_reference: expectedProof.challenge_id,
              installation_id: expectedProof.installation_id,
              user_id: expectedProof.user_id,
              entra_subject_id: expectedProof.entra_subject_id,
              device_key_fingerprint: expectedProof.device_id,
              device_public_key_spki_sha256: expectedProof.device_id,
              challenge_nonce_sha256: verifiedProof.nonceSha256,
              issued_challenge_sha256:
                expectedProof.issued_challenge_sha256,
              proof_id: expectedProof.proof_id,
              request_id: expectedProof.request_id,
              event_id: expectedProof.event_id,
              idempotency_key: expectedProof.idempotency_key,
              request_fingerprint: proofFingerprint,
              device_command_sha256: verifiedProof.rawRequestSha256,
              device_proof_transcript_sha256:
                verifiedProof.transcriptSha256,
              device_signature_sha256: verifiedProof.signatureSha256,
              proof_issued_at: expectedIssuedAt,
              proof_expires_at: expectedExpiresAt,
            }),
            installation_id: expectedProof.installation_id,
            mode: reservationAuthority.mode,
            verified_proof: verifiedProof,
          });
        },
        async mintLifecycleAuthorization({ authorization }) {
          return Object.freeze({
            authorization_binding_sha256: sha256("authorization binding"),
            authorized_at: authorization.proof_issued_at,
            lifecycle_authorization_id:
              authorization.lifecycle_authorization_id,
            outcome: "authorized",
            tenant_id: item.principal.lawos_tenant_id,
            valid_until: authorization.proof_expires_at,
          });
        },
      })
    ),
    async issueLifecycleChallenge() {
      throw new Error("lifecycle challenge issuance is disabled in this fixture");
    },
    async consumeLifecycleTransition(input) {
      calls.push({ operation: "register", input });
      return successEnvelope(
        input.authorization,
        registrationResponseStatus,
        registrationInstallationId,
      );
    },
  });
  return lifecyclePort;
}

function runtimeFixture(item, {
  challengeResult = {
    activation_reference: item.challenge.activation_id,
    installation_id: INSTALLATION_ID,
    issued_challenge: item.challenge,
    issued_challenge_sha256: issuedChallengeSha256(item),
    release_authority_sha256: RELEASE_AUTHORITY_SHA256,
  },
  proofSeedResult = {
    status: "ready",
    activation_reference: item.challenge.activation_id,
    installation_id: INSTALLATION_ID,
    activation_receipt_sha256: sha256(item.operator_receipt_bytes),
    local_measurement_evidence_sha256:
      item.challenge.local_measurement_evidence_sha256,
    release_authority_sha256: RELEASE_AUTHORITY_SHA256,
    issued_challenge_sha256: issuedChallengeSha256(item),
    valid_until: item.challenge.expires_at,
    event_id: EVENT_ID,
  },
  proofSeedError = null,
  authorizationOverride,
  consumeError = null,
  registrationInstallationId = INSTALLATION_ID,
  registrationResponseStatus = 201,
} = {}) {
  const calls = [];
  const lifecyclePort = lifecyclePortFixture(item, {
    calls,
    registrationInstallationId,
    registrationResponseStatus,
  });
  return {
    calls,
    runtime: {
      activation_enabled: true,
      entitlement_roster: roster(item),
      entra_tenant_id: item.principal.entra_tenant_id,
      activation_service: {
        async issueChallenge(input) {
          calls.push({ operation: "issueChallenge", input });
          return challengeResult;
        },
        async readActivationProofSeed(input) {
          calls.push({ operation: "readActivationProofSeed", input });
          if (proofSeedError) throw proofSeedError;
          return proofSeedResult;
        },
        async consumeRegistration(input) {
          calls.push({ operation: "consumeRegistration", input });
          if (consumeError) throw consumeError;
          if (authorizationOverride !== undefined) {
            return { authorization: authorizationOverride };
          }
          return {
            authorization: await lifecyclePort.verifyLifecycleTransition({
              schema_version: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
              action: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
              mode: "mint",
              raw_request_body_base64:
                input.submission.raw_request_body_base64,
              authenticated_principal: {
                tenant_id: input.principal.tenant_id,
                user_id: input.principal.user_id,
                entra_subject_id: input.principal.entra_subject_id,
              },
              activation_reference: input.submission.activation_reference,
              proof: input.submission.proof,
              proof_signature_base64:
                input.submission.proof_signature_base64,
            }),
          };
        },
      },
      lifecycle_port: lifecyclePort,
    },
  };
}

async function directRequest(item, {
  pathname,
  body,
  runtime,
  headers,
  requestId = "request-task15-api",
  value = sessionPrincipal(item),
  context = permissionContext(value),
} = {}) {
  return handleOutlookDesktopActivationApiRequest({
    pathname,
    method: "POST",
    body,
    headers: headers ?? (pathname === OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH
      ? { "idempotency-key": ISSUE_REQUEST_ID }
      : {}),
    principal: value,
    context,
    requestId,
    runtime,
  });
}

test("challenge route accepts only the candidate device and returns the exact server challenge", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  const requestBody = { candidate_device: item.challenge.candidate_device };

  const result = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: requestBody,
    runtime: fixture.runtime,
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.outcome, "issued");
  assert.deepEqual(Object.keys(result.body), [
    "request_id",
    "outcome",
    "activation_reference",
    "installation_id",
    "outlook_desktop_principal_ref",
    "issued_challenge",
    "issued_challenge_sha256",
    "release_authority_sha256",
    "safe_error_codes",
    "raw_artifact_material_returned",
    "token_material_returned",
    "private_key_material_returned",
    "production_ready_claim",
  ]);
  assert.equal(result.body.activation_reference, item.challenge.activation_id);
  assert.equal(result.body.installation_id, INSTALLATION_ID);
  assert.equal(
    result.body.outlook_desktop_principal_ref,
    outlookDesktopPrincipalRef(sessionPrincipal(item)),
  );
  assert.deepEqual(result.body.issued_challenge, item.challenge);
  assert.equal(
    result.body.issued_challenge_sha256,
    issuedChallengeSha256(item),
  );
  assert.match(
    result.body.issued_challenge.local_measurement_evidence_sha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.equal(result.body.release_authority_sha256, RELEASE_AUTHORITY_SHA256);
  assert.deepEqual(fixture.calls, [{
    operation: "issueChallenge",
    input: {
      principal: {
        tenant_id: item.principal.lawos_tenant_id,
        user_id: item.principal.lawos_user_id,
        entra_subject_id: item.principal.entra_subject,
        entra_tenant_id: item.principal.entra_tenant_id,
      },
      candidate_device: item.challenge.candidate_device,
      issue_request_id: ISSUE_REQUEST_ID,
    },
  }]);
  assert.deepEqual(Object.keys(requestBody), ["candidate_device"]);
  assert.equal(JSON.stringify(result.body).includes(ISSUE_REQUEST_ID), false);
  assert.equal(result.body.token_material_returned, false);
  assert.equal(result.body.private_key_material_returned, false);
  assert.equal(result.body.production_ready_claim, false);

  const retry = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: requestBody,
    requestId: "request-task15-api-retry",
    runtime: fixture.runtime,
  });
  assert.equal(retry.status, 201);
  assert.equal(retry.body.activation_reference, result.body.activation_reference);
  assert.deepEqual(retry.body.issued_challenge, result.body.issued_challenge);
  assert.deepEqual(fixture.calls[1].input, fixture.calls[0].input);
  assert.equal(fixture.calls[1].input.issue_request_id, ISSUE_REQUEST_ID);
});

test("same-oar challenge replay returns the exact stored package after its window closes", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  assert.equal(Date.now() > Date.parse(item.challenge.expires_at), true);

  const result = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: { candidate_device: item.challenge.candidate_device },
    runtime: fixture.runtime,
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.outcome, "issued");
  assert.equal(result.body.activation_reference, item.challenge.activation_id);
  assert.equal(result.body.installation_id, INSTALLATION_ID);
  assert.deepEqual(result.body.issued_challenge, item.challenge);
  assert.equal(
    result.body.issued_challenge_sha256,
    issuedChallengeSha256(item),
  );
  assert.deepEqual(fixture.calls, [{
    operation: "issueChallenge",
    input: {
      principal: {
        tenant_id: item.principal.lawos_tenant_id,
        user_id: item.principal.lawos_user_id,
        entra_subject_id: item.principal.entra_subject,
        entra_tenant_id: item.principal.entra_tenant_id,
      },
      candidate_device: item.challenge.candidate_device,
      issue_request_id: ISSUE_REQUEST_ID,
    },
  }]);
});

test("challenge route rejects client authority fields and service-side principal drift", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  for (const extra of [
    { authenticated_principal: item.principal },
    { approved_release: item.approvedRelease },
    { pilot_policy: item.pilotPolicy },
    { activation_id: item.challenge.activation_id },
    { challenge_nonce_base64url: item.challenge.challenge_nonce_base64url },
    { issue_request_id: ISSUE_REQUEST_ID },
    { idempotency_key: ISSUE_REQUEST_ID },
    { event_id: EVENT_ID },
    { hardware_key_attested: false },
  ]) {
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      body: { candidate_device: item.challenge.candidate_device, ...extra },
      runtime: fixture.runtime,
    });
    assert.equal(result.status, 400);
  }
  assert.equal(fixture.calls.length, 0);

  for (const headers of [
    {},
    { "idempotency-key": "invalid" },
    { "idempotency-key": ` ${ISSUE_REQUEST_ID}` },
    { "idempotency-key": [ISSUE_REQUEST_ID, ISSUE_REQUEST_ID] },
    { "x-request-id": ISSUE_REQUEST_ID },
  ]) {
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      body: { candidate_device: item.challenge.candidate_device },
      headers,
      runtime: fixture.runtime,
    });
    assert.equal(result.status, 400);
  }
  assert.equal(fixture.calls.length, 0);

  const driftedChallenge = {
    ...item.challenge,
    authenticated_principal: {
      ...item.challenge.authenticated_principal,
      lawos_user_id: "user_other",
    },
  };
  const drift = runtimeFixture(item, {
    challengeResult: {
      activation_reference: item.challenge.activation_id,
      installation_id: INSTALLATION_ID,
      issued_challenge: driftedChallenge,
      issued_challenge_sha256: challengeSha256(driftedChallenge),
      release_authority_sha256: RELEASE_AUTHORITY_SHA256,
    },
  });
  const result = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: { candidate_device: item.challenge.candidate_device },
    runtime: drift.runtime,
  });
  assert.equal(result.status, 503);
  assert.equal(drift.calls.length, 1);

  const referenceDrift = runtimeFixture(item, {
    challengeResult: {
      activation_reference: "oda_BBBBBBBBBBBBBBBBBBBBBBBB",
      installation_id: INSTALLATION_ID,
      issued_challenge: item.challenge,
      issued_challenge_sha256: issuedChallengeSha256(item),
      release_authority_sha256: RELEASE_AUTHORITY_SHA256,
    },
  });
  const referenceResult = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: { candidate_device: item.challenge.candidate_device },
    runtime: referenceDrift.runtime,
  });
  assert.equal(referenceResult.status, 503);
  assert.equal(referenceDrift.calls.length, 1);

  const challengeWithInvalidBinding = {
    ...item.challenge,
    activation_binding_sha256: "f".repeat(64),
  };
  const invalidBinding = runtimeFixture(item, {
    challengeResult: {
      activation_reference: item.challenge.activation_id,
      installation_id: INSTALLATION_ID,
      issued_challenge: challengeWithInvalidBinding,
      issued_challenge_sha256: challengeSha256(challengeWithInvalidBinding),
      release_authority_sha256: RELEASE_AUTHORITY_SHA256,
    },
  });
  const bindingResult = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: { candidate_device: item.challenge.candidate_device },
    runtime: invalidBinding.runtime,
  });
  assert.equal(bindingResult.status, 503);
  assert.equal(invalidBinding.calls.length, 1);

  const digestDrift = runtimeFixture(item, {
    challengeResult: {
      activation_reference: item.challenge.activation_id,
      installation_id: INSTALLATION_ID,
      issued_challenge: item.challenge,
      issued_challenge_sha256: "f".repeat(64),
      release_authority_sha256: RELEASE_AUTHORITY_SHA256,
    },
  });
  const digestResult = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
    body: { candidate_device: item.challenge.candidate_device },
    runtime: digestDrift.runtime,
  });
  assert.equal(digestResult.status, 503);
  assert.equal(digestDrift.calls.length, 1);
});

test("proof-seed route returns only exact ready or pending safe fields", async (t) => {
  const item = await activationFixture(t);
  const readyFixture = runtimeFixture(item);
  const ready = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
    body: { activation_reference: item.challenge.activation_id },
    runtime: readyFixture.runtime,
  });

  assert.equal(ready.status, 200);
  assert.equal(ready.body.status, "ready");
  assert.equal(ready.body.event_id, EVENT_ID);
  assert.deepEqual(readyFixture.calls, [{
    operation: "readActivationProofSeed",
    input: {
      activation_reference: item.challenge.activation_id,
      authenticated_principal: {
        tenant_id: item.principal.lawos_tenant_id,
        user_id: item.principal.lawos_user_id,
        entra_subject_id: item.principal.entra_subject,
        entra_tenant_id: item.principal.entra_tenant_id,
      },
    },
  }]);
  assert.deepEqual(Object.keys(ready.body), [
    "request_id",
    "outcome",
    "status",
    "activation_reference",
    "installation_id",
    "activation_receipt_sha256",
    "local_measurement_evidence_sha256",
    "release_authority_sha256",
    "issued_challenge_sha256",
    "valid_until",
    "event_id",
    "safe_error_codes",
    "raw_artifact_material_returned",
    "token_material_returned",
    "private_key_material_returned",
    "production_ready_claim",
  ]);

  const pendingFixture = runtimeFixture(item, {
    proofSeedResult: {
      status: "pending",
      activation_reference: item.challenge.activation_id,
      installation_id: INSTALLATION_ID,
      valid_until: item.challenge.expires_at,
    },
  });
  const pending = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
    body: { activation_reference: item.challenge.activation_id },
    runtime: pendingFixture.runtime,
  });
  assert.equal(pending.status, 202);
  assert.deepEqual(Object.keys(pending.body), [
    "request_id",
    "outcome",
    "status",
    "activation_reference",
    "installation_id",
    "valid_until",
    "safe_error_codes",
    "raw_artifact_material_returned",
    "token_material_returned",
    "private_key_material_returned",
    "production_ready_claim",
  ]);
  assert.equal(JSON.stringify(pending.body).includes("sha256"), false);
  assert.equal(pending.body.installation_id, INSTALLATION_ID);
  assert.equal(pending.body.valid_until, item.challenge.expires_at);
});

test("proof-seed route rejects client authority fields before its port and maps typed denials", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  for (const body of [
    {},
    { activation_reference: "invalid" },
    {
      activation_reference: item.challenge.activation_id,
      authenticated_principal: item.principal,
    },
    {
      activation_reference: item.challenge.activation_id,
      authorization: { legacy_direct_007_authority: true },
    },
    {
      activation_reference: item.challenge.activation_id,
      event_id: EVENT_ID,
    },
    {
      activation_reference: item.challenge.activation_id,
      operator_receipt_base64: item.operator_receipt_bytes.toString("base64"),
    },
  ]) {
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
      body,
      runtime: fixture.runtime,
    });
    assert.equal(result.status, 400);
  }
  assert.equal(fixture.calls.length, 0);

  for (const [safeErrorCode, serviceStatus, expectedStatus] of [
    ["OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_INVALID", 404, 403],
    ["OUTLOOK_DESKTOP_ACTIVATION_EXPIRED", 400, 409],
  ]) {
    const denied = runtimeFixture(item, {
      proofSeedError: Object.assign(new Error("private activation detail"), {
        safe_error_code: safeErrorCode,
        status: serviceStatus,
      }),
    });
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
      body: { activation_reference: item.challenge.activation_id },
      runtime: denied.runtime,
    });
    assert.equal(result.status, expectedStatus);
    assert.deepEqual(result.body.safe_error_codes, [safeErrorCode]);
    assert.doesNotMatch(JSON.stringify(result.body), /private activation detail/u);
    assert.equal(denied.calls.length, 1);
  }

  const invalidResult = runtimeFixture(item, {
    proofSeedResult: {
      status: "ready",
      activation_reference: item.challenge.activation_id,
      installation_id: INSTALLATION_ID,
      activation_receipt_sha256: "not-a-digest",
      local_measurement_evidence_sha256: "b".repeat(64),
      release_authority_sha256: RELEASE_AUTHORITY_SHA256,
      issued_challenge_sha256: "c".repeat(64),
      valid_until: item.challenge.expires_at,
      event_id: EVENT_ID,
    },
  });
  const invalid = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
    body: { activation_reference: item.challenge.activation_id },
    runtime: invalidResult.runtime,
  });
  assert.equal(invalid.status, 503);
  assert.equal(invalidResult.calls.length, 1);

  const invalidEventResult = runtimeFixture(item, {
    proofSeedResult: {
      status: "ready",
      activation_reference: item.challenge.activation_id,
      installation_id: INSTALLATION_ID,
      activation_receipt_sha256: sha256(item.operator_receipt_bytes),
      local_measurement_evidence_sha256:
        item.challenge.local_measurement_evidence_sha256,
      release_authority_sha256: RELEASE_AUTHORITY_SHA256,
      issued_challenge_sha256: issuedChallengeSha256(item),
      valid_until: item.challenge.expires_at,
      event_id: "event_client_chosen",
    },
  });
  const invalidEvent = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
    body: { activation_reference: item.challenge.activation_id },
    runtime: invalidEventResult.runtime,
  });
  assert.equal(invalidEvent.status, 503);
  assert.equal(invalidEventResult.calls.length, 1);
});

test("consume route sends only reference, detached command, and proof to one isolated authority", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  const body = consumptionBody(item);

  const result = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
    body,
    runtime: fixture.runtime,
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.outcome, "registered");
  assert.equal(result.body.activation_reference, body.activation_reference);
  assert.equal(result.body.activation_reference, body.proof.challenge_id);
  assert.deepEqual(Object.keys(result.body), [
    "request_id",
    "outcome",
    "activation_reference",
    "installation",
    "safe_error_codes",
    "raw_artifact_material_returned",
    "token_material_returned",
    "private_key_material_returned",
    "production_ready_claim",
  ]);
  assert.deepEqual(Object.keys(result.body.installation), [
    "installation_id",
    "status",
    "state_version",
    "lease_expires_at",
    "retired_at",
  ]);
  assert.deepEqual(result.body.safe_error_codes, []);
  assert.equal(result.body.raw_artifact_material_returned, false);
  assert.equal(result.body.token_material_returned, false);
  assert.equal(result.body.private_key_material_returned, false);
  assert.equal(result.body.production_ready_claim, false);
  assert.deepEqual(fixture.calls.map(({ operation }) => operation), [
    "consumeRegistration",
    "register",
  ]);
  assert.deepEqual(fixture.calls[0].input, {
    principal: {
      tenant_id: item.principal.lawos_tenant_id,
      user_id: item.principal.lawos_user_id,
      entra_subject_id: item.principal.entra_subject,
      entra_tenant_id: item.principal.entra_tenant_id,
    },
    submission: body,
  });
  assert.deepEqual(Object.keys(body), [
    "activation_reference",
    "raw_request_body_base64",
    "proof",
    "proof_signature_base64",
  ]);
  assert.doesNotMatch(
    JSON.stringify(body),
    /operator_receipt|release_ticket|activation_verification/iu,
  );
  assert.deepEqual(fixture.calls[1].input.principal, {
    tenant_id: item.principal.lawos_tenant_id,
    user_id: item.principal.lawos_user_id,
    entra_subject_id: item.principal.entra_subject,
  });
  assert.equal(
    fixture.calls[1].input.authorization.installation_id,
    INSTALLATION_ID,
  );
  const responseText = JSON.stringify(result.body);
  assert.doesNotMatch(responseText, /operator_receipt|release_ticket|authorization_id/iu);
  assert.doesNotMatch(responseText, /must-not-escape/u);

  const nonAuthoritativeStatus = runtimeFixture(item, {
    registrationResponseStatus: 200,
  });
  const nonAuthoritativeResult = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
    body: consumptionBody(item),
    runtime: nonAuthoritativeStatus.runtime,
  });
  assert.equal(nonAuthoritativeResult.status, 503);
  assert.deepEqual(
    nonAuthoritativeStatus.calls.map(({ operation }) => operation),
    ["consumeRegistration", "register"],
  );

  const mismatchedInstallation = runtimeFixture(item, {
    registrationInstallationId: "odi_task15_api_000000000099",
  });
  const mismatchedInstallationResult = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
    body: consumptionBody(item),
    runtime: mismatchedInstallation.runtime,
  });
  assert.equal(mismatchedInstallationResult.status, 503);
  assert.deepEqual(
    mismatchedInstallation.calls.map(({ operation }) => operation),
    ["consumeRegistration", "register"],
  );

  const crossPort = runtimeFixture(item);
  const unrelatedLifecyclePort = createOutlookDesktopLifecycleControlPort({
    async verifyLifecycleTransition() {
      throw new Error("unrelated lifecycle verifier must not run");
    },
    async issueLifecycleChallenge() {
      throw new Error("unrelated lifecycle issuer must not run");
    },
    async consumeLifecycleTransition() {
      throw new Error("unrelated lifecycle consumer must not run");
    },
  });
  const crossPortResult = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
    body: consumptionBody(item),
    runtime: {
      ...crossPort.runtime,
      lifecycle_port: unrelatedLifecyclePort,
    },
  });
  assert.equal(crossPortResult.status, 403);
  assert.deepEqual(
    crossPort.calls.map(({ operation }) => operation),
    ["consumeRegistration"],
  );
});

test("public binding errors stop before the authority and stored-reference drift stops before register", async (t) => {
  const item = await activationFixture(t);
  const publicBindingErrors = [
    consumptionBody(item, {
      proof: proof(item, { user_id: "user_other" }),
    }),
    consumptionBody(item, {
      activation_reference: "oda_BBBBBBBBBBBBBBBBBBBBBBBB",
    }),
    consumptionBody(item, {
      proof: proof(item, { challenge_id: "oda_AAAAAAAAAAAAAAAAAAAAAAAA" }),
    }),
  ];
  for (const body of publicBindingErrors) {
    const fixture = runtimeFixture(item);
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
      body,
      runtime: fixture.runtime,
    });
    assert.equal(result.status, 403);
    assert.equal(fixture.calls.length, 0);
  }

  const storedReferenceDrift = [
    consumptionBody(item, {
      proof: proof(item, { policy_version: "policy_other" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { activation_receipt_sha256: "f".repeat(64) }),
    }),
    consumptionBody(item, {
      proof: proof(item, {
        event_id: "oae_ffffffffffffffffffffffffffffffff",
      }),
    }),
  ];
  for (const body of storedReferenceDrift) {
    const fixture = runtimeFixture(item, {
      consumeError: Object.assign(new Error("stored activation mismatch"), {
        safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_BINDING_MISMATCH",
        status: 403,
      }),
    });
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
      body,
      runtime: fixture.runtime,
    });
    assert.equal(result.status, 403);
    assert.deepEqual(fixture.calls.map(({ operation }) => operation), [
      "consumeRegistration",
    ]);
  }

  const invalidAuthorization = runtimeFixture(item, {
    authorizationOverride: Object.freeze({
      authorization_binding_sha256: "a".repeat(64),
      authorized_at: new Date(ACTIVATION_NOW).toISOString(),
      lifecycle_authorization_id: "lifecycle_other",
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      valid_until: new Date(ACTIVATION_NOW + 30_000).toISOString(),
    }),
  });
  const result = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
    body: consumptionBody(item),
    runtime: invalidAuthorization.runtime,
  });
  assert.equal(result.status, 503);
  assert.deepEqual(invalidAuthorization.calls.map(({ operation }) => operation), [
    "consumeRegistration",
  ]);
});

test("malformed detached proof input and any raw artifact fields fail closed", async (t) => {
  const item = await activationFixture(t);
  const {
    challenge_nonce_base64url: legacyNonce,
    ...proofWithoutChallengeNonce
  } = proof(item);
  const {
    activation_receipt_sha256: legacyReceiptDigest,
    ...proofWithoutReceiptDigest
  } = proof(item);
  const invalidBodies = [
    consumptionBody(item, {
      activation_reference: {
        activation_id: item.challenge.activation_id,
        installation_id: INSTALLATION_ID,
      },
    }),
    consumptionBody(item, { raw_request_body_base64: "not/base64" }),
    consumptionBody(item, { proof_signature_base64: Buffer.alloc(63).toString("base64") }),
    consumptionBody(item, {
      proof: proof(item, { local_measurement_evidence_sha256: "invalid" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { challenge_id: "invalid" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { device_id: "f".repeat(64) }),
    }),
    consumptionBody(item, {
      proof: proof(item, { policy_version: "invalid policy" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { activation_receipt_sha256: "invalid" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { issued_challenge_sha256: "invalid" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { event_id: "event_client_chosen" }),
    }),
    consumptionBody(item, {
      proof: proof(item, { request_id: "request_task15_register_other" }),
    }),
    consumptionBody(item, {
      proof: proof(item, {
        idempotency_key: "idempotency_task15_register_other",
      }),
    }),
    consumptionBody(item, {
      proof: {
        ...proofWithoutChallengeNonce,
        server_nonce_base64url: legacyNonce,
      },
    }),
    consumptionBody(item, {
      proof: {
        ...proofWithoutReceiptDigest,
        activation_receipt_id: legacyReceiptDigest,
      },
    }),
    consumptionBody(item, {
      operator_receipt_base64: item.operator_receipt_bytes.toString("base64"),
    }),
    consumptionBody(item, {
      release_ticket_signature_base64:
        item.release_ticket_signature_bytes.toString("base64"),
    }),
    consumptionBody(item, {
      raw_request_body_base64: Buffer.from(JSON.stringify({
        request_id: ISSUE_REQUEST_ID,
        event_id: EVENT_ID,
        idempotency_key: ISSUE_REQUEST_ID,
        local_measurement_evidence_sha256:
          item.challenge.local_measurement_evidence_sha256,
        email: "forbidden@example.invalid",
      })).toString("base64"),
    }),
    consumptionBody(item, {
      raw_request_body_base64: Buffer.from(JSON.stringify({
        request_id: ISSUE_REQUEST_ID,
        event_id: EVENT_ID,
        idempotency_key: ISSUE_REQUEST_ID,
        local_measurement_evidence_sha256: "f".repeat(64),
      })).toString("base64"),
    }),
  ];
  for (const body of invalidBodies) {
    const fixture = runtimeFixture(item);
    const result = await directRequest(item, {
      pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
      body,
      runtime: fixture.runtime,
    });
    assert.equal(result.status, 400);
    assert.equal(fixture.calls.length, 0);
  }

  let registerCalls = 0;
  const unavailable = await directRequest(item, {
    pathname: OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
    body: consumptionBody(item),
    runtime: {
      entitlement_roster: roster(item),
      entra_tenant_id: item.principal.entra_tenant_id,
      installation_service: {
        async register() {
          registerCalls += 1;
        },
      },
    },
  });
  assert.equal(unavailable.status, 503);
  assert.equal(registerCalls, 0);
});

async function withServer(options, callback) {
  const { createApiServer } = await import("../src/server.js");
  const server = createApiServer(options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postJson(baseUrl, pathname, body, authorization, extraHeaders = {}) {
  const result = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  return { status: result.status, body: await result.json() };
}

function postJsonWithDuplicateIdempotency(
  baseUrl,
  pathname,
  body,
  authorization,
) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = httpRequest(new URL(`${baseUrl}${pathname}`), {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        "idempotency-key": [ISSUE_REQUEST_ID, ISSUE_REQUEST_ID],
      },
    }, (result) => {
      const chunks = [];
      result.on("data", (chunk) => chunks.push(chunk));
      result.on("end", () => {
        try {
          resolve({
            status: result.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.end(payload);
  });
}

test("HTTP dispatcher authenticates both new activation routes before isolated authority work", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  const value = sessionPrincipal(item);
  const context = permissionContext(value);
  const sessionAuth = {
    capabilities: {},
    async resolvePermissionContextFromHeaders(headers) {
      if (headers.authorization !== "Bearer signed-task15-session") {
        return {
          ok: false,
          status: 401,
          body: {
            outcome: "blocked",
            safe_error_codes: ["AUTH_SESSION_REQUIRED"],
          },
        };
      }
      return {
        ok: true,
        principal: value,
        context,
        token_payload: { surface: "desktop" },
      };
    },
  };

  await withServer({
    sessionAuth,
    outlookDesktopRuntime: fixture.runtime,
  }, async (baseUrl) => {
    const unauthorized = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      { candidate_device: item.challenge.candidate_device },
    );
    assert.equal(unauthorized.status, 401);
    assert.equal(fixture.calls.length, 0);

    const challenge = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      { candidate_device: item.challenge.candidate_device },
      "Bearer signed-task15-session",
      { "idempotency-key": ISSUE_REQUEST_ID },
    );
    assert.equal(challenge.status, 201);
    assert.equal(challenge.body.installation_id, INSTALLATION_ID);
    assert.equal(
      challenge.body.outlook_desktop_principal_ref,
      outlookDesktopPrincipalRef(value),
    );

    const missingIssueRequest = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      { candidate_device: item.challenge.candidate_device },
      "Bearer signed-task15-session",
    );
    assert.equal(missingIssueRequest.status, 400);

    const duplicateIssueRequest = await postJsonWithDuplicateIdempotency(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      { candidate_device: item.challenge.candidate_device },
      "Bearer signed-task15-session",
    );
    assert.equal(duplicateIssueRequest.status, 400);

    const proofSeed = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_PROOF_SEED_PATH,
      { activation_reference: item.challenge.activation_id },
      "Bearer signed-task15-session",
    );
    assert.equal(proofSeed.status, 200);
    assert.equal(proofSeed.body.status, "ready");

    const consumption = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CONSUMPTION_PATH,
      consumptionBody(item),
      "Bearer signed-task15-session",
    );
    assert.equal(consumption.status, 201);
    assert.equal(consumption.body.installation.installation_id, INSTALLATION_ID);
    assert.deepEqual(fixture.calls.map(({ operation }) => operation), [
      "issueChallenge",
      "readActivationProofSeed",
      "consumeRegistration",
      "register",
    ]);

    const oversized = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      {
        candidate_device: item.challenge.candidate_device,
        padding: "x".repeat(257 * 1024),
      },
      "Bearer signed-task15-session",
    );
    assert.equal(oversized.status, 413);
    assert.deepEqual(oversized.body.safe_error_codes, [
      "OUTLOOK_DESKTOP_ACTIVATION_REQUEST_TOO_LARGE",
    ]);
  });
});

test("HTTP dispatcher does not mount activation routes when entitlement is disabled", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(item);
  const value = sessionPrincipal(item);
  const sessionAuth = {
    capabilities: {},
    async resolvePermissionContextFromHeaders() {
      return {
        ok: true,
        principal: value,
        context: permissionContext(value),
        token_payload: { surface: "desktop" },
      };
    },
  };

  await withServer({
    sessionAuth,
    outlookDesktopRuntime: Object.freeze({
      ...fixture.runtime,
      activation_enabled: false,
    }),
  }, async (baseUrl) => {
    const result = await postJson(
      baseUrl,
      OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_PATH,
      { candidate_device: item.challenge.candidate_device },
      "Bearer signed-task15-session",
      { "idempotency-key": ISSUE_REQUEST_ID },
    );
    assert.equal(result.status, 404);
    assert.equal(fixture.calls.length, 0);

    const health = await fetch(`${baseUrl}/api/health`, {
      headers: { connection: "close" },
    }).then((response) => response.json());
    assert.equal(
      Object.hasOwn(health, "outlook_desktop_activation"),
      false,
    );
  });
});
