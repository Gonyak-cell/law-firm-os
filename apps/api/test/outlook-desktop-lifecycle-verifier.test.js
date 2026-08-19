import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test, { after } from "node:test";
import { isDeepStrictEqual } from "node:util";

import {
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
  OutlookDesktopLifecycleVerifierError,
  assertOutlookDesktopLifecycleRegistrationContinuation,
  consumeOutlookDesktopLifecycleRegistrationContinuation,
  createOutlookDesktopLifecycleControlPort,
  createOutlookDesktopLifecycleProofTranscript,
  executeOutlookDesktopLifecycleVerifier,
  outlookDesktopLifecycleTransitionFingerprint,
} from "../src/outlook-desktop-lifecycle-verifier.js";
import {
  ACTIVATION_NOW,
  activationFixture,
  canonicalBytes,
  hash,
} from "../../../packages/email-dms/test/helpers/outlook-desktop-activation-contract-fixture.js";
import {
  useActivationTestEnvironment,
} from "../../../packages/email-dms/test/helpers/outlook-desktop-activation-test-utils.js";

after(useActivationTestEnvironment());

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const LIFECYCLE_AUTHORIZATION_KEYS = Object.freeze([
  "activation_authorization_id", "device_key_fingerprint",
  "device_public_key_spki_sha256", "device_signature_sha256",
  "entra_subject_id", "event_id", "expected_state_version",
  "idempotency_key", "installation_id", "issued_challenge_sha256",
  "lifecycle_authorization_id", "lifecycle_challenge_id", "nonce_hash",
  "operation", "proof_expires_at", "proof_issued_at", "proof_receipt_sha256",
  "proof_transcript_sha256", "release_authority_sha256", "request_fingerprint",
  "request_id", "retire_intent_id", "user_id",
]);
const LIFECYCLE_RECEIPT_KEYS = Object.freeze([
  "authorization_binding_sha256", "authorized_at",
  "lifecycle_authorization_id", "outcome", "tenant_id", "valid_until",
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

function localMeasurementFor(item) {
  return item.request.local_measurement_evidence_sha256
    ?? hash(Buffer.from("local measurement evidence\n"));
}

function activationContractFor(item) {
  return {
    verifyOperatorActivation(input) {
      const verified = item.contract.verifyOperatorActivation(input);
      const localMeasurement = verified.bindings.local_measurement_evidence_sha256
        ?? localMeasurementFor(item);
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

function activationAssertionsFor(item) {
  const expectedProof = baseProof(item);
  const expectedRawRequestBody = requestBodyFor(expectedProof);
  const expectedTranscriptSha256 = sha256(
    createOutlookDesktopLifecycleProofTranscript({
      proof: expectedProof,
      rawRequestBody: expectedRawRequestBody,
    }),
  );
  const expectedSignatureSha256 = sha256(Buffer.from(
    signedEvent(item, {
      proof: expectedProof,
      rawRequestBody: expectedRawRequestBody,
    }).proof_signature_base64,
    "base64",
  ));
  const expectedIssuedAt = new Date(
    Number(expectedProof.issued_at_epoch_ms),
  ).toISOString();
  const expectedExpiresAt = new Date(
    Number(expectedProof.expires_at_epoch_ms),
  ).toISOString();
  const expectedRequestFingerprint =
    outlookDesktopLifecycleTransitionFingerprint({ proof: expectedProof });
  return {
    async assertActivationReservation({ activation_contract: activationContract, reservation }) {
      const verifiedActivation = activationContract.verifyOperatorActivation(reservation);
      return Object.freeze({
        mode: "exact_replay",
        state: "authorized",
        activation_reference: item.challenge.activation_id,
        installation_id: "odi_abcdefghijklmnopqrstuvwx",
        authorized_at: expectedIssuedAt,
        reservation: Object.freeze({
          activation_reference: expectedProof.challenge_id,
          activation_replay_identity: Object.freeze({
            replay_identity_sha256:
              verifiedActivation.single_use_consumption.replay_identity_sha256,
          }),
          challenge_nonce_base64url: expectedProof.challenge_nonce_base64url,
          device_command_sha256: sha256(expectedRawRequestBody),
          device_proof_transcript_sha256: expectedTranscriptSha256,
          device_signature_sha256: expectedSignatureSha256,
          evidence_binding_sha256: sha256("activation evidence binding"),
          event_id: expectedProof.event_id,
          idempotency_key: expectedProof.idempotency_key,
          installation_id: expectedProof.installation_id,
          issue_request_id: expectedProof.request_id,
          issued_challenge_sha256: expectedProof.issued_challenge_sha256,
          local_measurement_evidence_sha256:
            expectedProof.local_measurement_evidence_sha256,
          proof_expires_at: expectedExpiresAt,
          proof_id: expectedProof.proof_id,
          proof_issued_at: expectedIssuedAt,
          registration_event_id: expectedProof.event_id,
          release_authority_sha256: expectedProof.release_authority_sha256,
          request_fingerprint: expectedRequestFingerprint,
          request_id: expectedProof.request_id,
          valid_until: expectedExpiresAt,
        }),
        verified_activation: verifiedActivation,
      });
    },
    assertActivationReservationProofBinding({
      proof,
      proof_fingerprint_sha256: proofFingerprint,
      reservation_authority: reservationAuthority,
      verified_proof: verifiedProof,
    }) {
      const verifiedActivation = reservationAuthority.verified_activation;
      if (!isDeepStrictEqual(proof, expectedProof)
          || verifiedProof.rawRequestSha256 !== sha256(expectedRawRequestBody)
          || verifiedProof.transcriptSha256 !== expectedTranscriptSha256) {
        throw Object.assign(new Error("stored replay identity changed"), {
          code: "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH",
        });
      }
      assert.equal(proof.challenge_id, item.challenge.activation_id);
      assert.equal(
        proof.issued_challenge_sha256,
        hash(canonicalBytes(item.challenge)),
      );
      assert.equal(
        proof.activation_receipt_sha256,
        hash(item.operator_receipt_bytes),
      );
      assert.equal(proof.challenge_nonce_base64url, item.challenge.challenge_nonce_base64url);
      assert.equal(verifiedProof.nonceSha256, item.challenge.challenge_nonce_sha256);
      assert.equal(
        proof.local_measurement_evidence_sha256,
        verifiedActivation.bindings.local_measurement_evidence_sha256,
      );
      assert.match(proofFingerprint, /^[a-f0-9]{64}$/u);
      const authorization = Object.freeze({
        activation_reference: proof.challenge_id,
        installation_id: proof.installation_id,
        user_id: proof.user_id,
        entra_subject_id: proof.entra_subject_id,
        device_key_fingerprint: proof.device_id,
        device_public_key_spki_sha256: proof.device_id,
        challenge_nonce_sha256: verifiedProof.nonceSha256,
        issued_challenge_sha256: proof.issued_challenge_sha256,
        evidence_binding_sha256: sha256("activation evidence binding"),
        proof_id: proof.proof_id,
        request_id: proof.request_id,
        event_id: proof.event_id,
        idempotency_key: proof.idempotency_key,
        request_fingerprint: proofFingerprint,
        device_command_sha256: verifiedProof.rawRequestSha256,
        device_proof_transcript_sha256: verifiedProof.transcriptSha256,
        device_signature_sha256: verifiedProof.signatureSha256,
        proof_issued_at: new Date(verifiedProof.issuedAt).toISOString(),
        proof_expires_at: new Date(verifiedProof.expiresAt).toISOString(),
      });
      return Object.freeze({
        activation_reference: reservationAuthority.activation_reference,
        authorization,
        installation_id: reservationAuthority.installation_id,
        mode: reservationAuthority.mode,
        verified_proof: verifiedProof,
      });
    },
  };
}

function baseProof(item, operation = "register") {
  const requestId = operation === "register"
    ? `oar_${"a".repeat(32)}`
    : `request-lifecycle-${operation}-0001`;
  return {
    operation,
    tenant_id: item.principal.lawos_tenant_id,
    user_id: item.principal.lawos_user_id,
    entra_subject_id: item.principal.entra_subject,
    device_id: item.request.candidate_device.continuity_key_fingerprint_sha256,
    installation_id: "odi_abcdefghijklmnopqrstuvwx",
    release_authority_sha256: operation === "register"
      ? hash(Buffer.from("shared v2 artifact authority\n")) : null,
    local_measurement_evidence_sha256:
      operation === "register" ? localMeasurementFor(item) : null,
    policy_version: operation === "register" ? item.pilotPolicy.policy_revision : null,
    expected_state_version: operation === "register" ? 1 : 2,
    request_id: requestId,
    event_id: operation === "register"
      ? `oae_${"b".repeat(32)}`
      : `event-lifecycle-${operation}-0001`,
    idempotency_key: operation === "register"
      ? requestId : `lifecycle-${operation}-idempotency-0001`,
    challenge_nonce_base64url: item.challenge.challenge_nonce_base64url,
    challenge_id: operation === "register"
      ? item.challenge.activation_id : `olc_${"a".repeat(32)}`,
    issued_challenge_sha256: operation === "register"
      ? hash(canonicalBytes(item.challenge))
      : hash(Buffer.from(`lifecycle challenge ${operation}`)),
    activation_receipt_sha256:
      operation === "register" ? hash(item.operator_receipt_bytes) : null,
    proof_id: `lifecycle-${operation}-proof-0001`,
    issued_at_epoch_ms: String(ACTIVATION_NOW),
    expires_at_epoch_ms: String(ACTIVATION_NOW + 5 * 60 * 1_000),
    retire_intent_id: operation === "retire" ? `ori_${"b".repeat(32)}` : null,
    retire_reason: operation === "retire" ? "device_disconnect" : null,
    device_public_key_spki_base64:
      item.request.candidate_device.continuity_public_key_spki,
  };
}

function requestBodyFor(proof) {
  return Buffer.from(JSON.stringify({
    request_id: proof.request_id,
    event_id: proof.event_id,
    idempotency_key: proof.idempotency_key,
    ...(proof.operation === "register" ? {
      local_measurement_evidence_sha256: proof.local_measurement_evidence_sha256,
    } : {}),
    ...(proof.operation === "retire" ? { retire_reason: proof.retire_reason } : {}),
  }));
}

function signedEvent(item, {
  operation = "register",
  proof = baseProof(item, operation),
  rawRequestBody = requestBodyFor(proof),
} = {}) {
  const transcript = createOutlookDesktopLifecycleProofTranscript({
    proof,
    rawRequestBody,
  });
  return {
    schema_version: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
    action: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
    mode: "mint",
    raw_request_body_base64: rawRequestBody.toString("base64"),
    authenticated_principal: {
      tenant_id: item.principal.lawos_tenant_id,
      user_id: item.principal.lawos_user_id,
      entra_subject_id: item.principal.entra_subject,
    },
    activation_reference: operation === "register" ? proof.challenge_id : null,
    proof,
    proof_signature_base64: sign(
      null,
      transcript,
      item.keys.device.privateKey,
    ).toString("base64"),
  };
}

function runtimeFixture(t, item, { resultForPayload } = {}) {
  const calls = {
    challenge: [],
    mint: [],
    pool: [],
    poolEnd: 0,
    reservation: [],
    secret: [],
    transaction: [],
  };
  const pool = {
    async end() {
      calls.poolEnd += 1;
    },
  };
  let result;
  const dependencies = {
    activationContract: activationContractFor(item),
    ...activationAssertionsFor(item),
    env: {
      AWS_REGION: "ap-northeast-2",
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID:
        "/lawos/production/postgres/outlook-lifecycle-verifier",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID:
        "/lawos/production/postgres/tenant-context",
      LAWOS_DATABASE_HOST: "lawos.example.internal",
      LAWOS_DATABASE_NAME: "lawos",
      LAWOS_DATABASE_PORT: "5432",
    },
    async resolveSecret(options) {
      calls.secret.push(options);
      if (options.secretId === "/lawos/production/postgres/tenant-context") {
        return {
          schema_version: "law-firm-os.tenant-context-secret.v1",
          tenant_context_secret: "tenant-context-material-000000000000000000000000",
        };
      }
      return {
        configuration_state: "ready",
        password: "database-password-material-000000000000000000000",
        username: "lawos_outlook_lifecycle_verifier",
      };
    },
    async loadActivationReservation(reference) {
      calls.reservation.push(reference);
      return activationReservationInput(item);
    },
    async loadLifecycleChallenge(binding) {
      calls.challenge.push(binding);
      return Object.freeze({
        schema_version: "lawos.outlook-desktop-lifecycle-challenge.v1",
        outcome: "issued",
        tenant_id: binding.tenant_id,
        user_id: binding.user_id,
        entra_subject_id: binding.entra_subject_id,
        installation_id: binding.installation_id,
        device_key_fingerprint: binding.device_key_fingerprint,
        operation: binding.operation,
        expected_state_version: binding.expected_state_version,
        request_id: binding.request_id,
        event_id: binding.event_id,
        idempotency_key: binding.idempotency_key,
        lifecycle_challenge_id: binding.challenge_id,
        challenge_nonce_base64url: binding.challenge_nonce_base64url,
        challenge_nonce_sha256: binding.nonce_hash,
        retire_intent_id: binding.retire_intent_id,
        release_authority_sha256: sha256(`release ${binding.operation}`),
        issued_challenge_sha256: binding.issued_challenge_sha256,
        issued_at: binding.proof_issued_at,
        valid_until: binding.proof_expires_at,
      });
    },
    assertLifecycleChallengeReceipt(value) {
      return value;
    },
    createPool(options) {
      calls.pool.push(options);
      return pool;
    },
    async transaction(actualPool, options, callback) {
      assert.equal(actualPool, pool);
      calls.transaction.push(options);
      return callback({
        async query(sql, parameters) {
          calls.mint.push({ sql, parameters });
          const payload = JSON.parse(parameters[1]);
          result ??= Object.freeze(resultForPayload?.(payload, parameters[0]) ?? {
            outcome: "authorized",
            tenant_id: parameters[0],
            lifecycle_authorization_id: payload.lifecycle_authorization_id,
            authorization_binding_sha256: sha256("authorization binding"),
            authorized_at: payload.proof_issued_at,
            valid_until: payload.proof_expires_at,
          });
          return { rowCount: 1, rows: [{ value: result }] };
        },
      });
    },
  };
  return { calls, dependencies, get result() { return result; } };
}

test("isolated verifier validates Task 15 artifacts and mints one exact 007 receipt", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);

  const actual = await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });

  assert.deepEqual(actual, fixture.result);
  assert.deepEqual(fixture.calls.secret, [
    {
      secretId: "/lawos/production/postgres/outlook-lifecycle-verifier",
      region: "ap-northeast-2",
    },
    {
      secretId: "/lawos/production/postgres/tenant-context",
      region: "ap-northeast-2",
    },
  ]);
  assert.equal(fixture.calls.pool.length, 1);
  assert.equal(fixture.calls.poolEnd, 1);
  assert.equal(
    fixture.calls.pool[0].tenantContextSecret,
    "tenant-context-material-000000000000000000000000",
  );
  assert.match(
    fixture.calls.pool[0].connectionString,
    /^postgresql:\/\/lawos_outlook_lifecycle_verifier:/u,
  );
  assert.doesNotMatch(fixture.calls.pool[0].connectionString, /tenant-context-material/u);
  assert.equal(fixture.calls.pool[0].sslMode, "verify-full");
  assert.equal(fixture.calls.pool[0].max, 1);
  assert.deepEqual(fixture.calls.transaction, [{
    tenant_id: item.principal.lawos_tenant_id,
    isolationLevel: "serializable",
    readOnly: false,
  }]);
  assert.deepEqual(fixture.calls.reservation, [{
    activation_reference: event.proof.challenge_id,
  }]);
  assert.equal(fixture.calls.mint.length, 1);
  assert.equal(
    fixture.calls.mint[0].sql,
    "SELECT lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt($1,$2::jsonb) AS value",
  );
  const [tenantId, payloadJson] = fixture.calls.mint[0].parameters;
  const payload = JSON.parse(payloadJson);
  assert.deepEqual(Object.keys(payload), LIFECYCLE_AUTHORIZATION_KEYS);
  assert.equal(tenantId, item.principal.lawos_tenant_id);
  assert.equal(payload.lifecycle_authorization_id, event.proof.proof_id);
  assert.equal(
    payload.request_fingerprint,
    outlookDesktopLifecycleTransitionFingerprint({ proof: event.proof }),
  );
  assert.notEqual(
    payload.request_fingerprint,
    sha256(Buffer.from(event.raw_request_body_base64, "base64")),
  );
  assert.equal(payload.proof_transcript_sha256, sha256(
    createOutlookDesktopLifecycleProofTranscript({
      proof: event.proof,
      rawRequestBody: Buffer.from(event.raw_request_body_base64, "base64"),
    }),
  ));
  assert.match(payload.nonce_hash, /^[a-f0-9]{64}$/u);
  assert.equal(payload.nonce_hash, item.challenge.challenge_nonce_sha256);
  assert.equal(payload.activation_authorization_id, item.challenge.activation_id);
  assert.equal(payload.issued_challenge_sha256, event.proof.issued_challenge_sha256);
  assert.equal(payload.release_authority_sha256, event.proof.release_authority_sha256);
  assert.equal(payload.lifecycle_challenge_id, null);
  assert.equal(payload.request_id, event.proof.request_id);
  assert.equal(payload.event_id, event.proof.event_id);
  assert.equal(payload.idempotency_key, event.proof.idempotency_key);
  assert.equal(payload.retire_intent_id, null);
  assert.equal(
    payload.proof_expires_at,
    new Date(Number(event.proof.expires_at_epoch_ms)).toISOString(),
  );
  assert.equal(
    Date.parse(payload.proof_expires_at) - Date.parse(payload.proof_issued_at),
    5 * 60 * 1_000,
  );
});

test("standalone mint accepts the minimal closed activation binding", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  const assertReservation = fixture.dependencies.assertActivationReservation;
  let protectedAuthority;
  let bindingCalls = 0;
  fixture.dependencies.assertActivationReservation = async (input) => {
    const authority = await assertReservation(input);
    protectedAuthority = Object.freeze({
      mode: authority.mode,
      state: authority.state,
      activation_reference: authority.activation_reference,
      installation_id: authority.installation_id,
      reservation: Object.freeze({
        activation_replay_identity:
          authority.reservation.activation_replay_identity,
      }),
      verified_activation: Object.freeze({
        bindings: Object.freeze({
          authenticated_principal:
            authority.verified_activation.bindings.authenticated_principal,
        }),
      }),
    });
    return protectedAuthority;
  };
  fixture.dependencies.assertActivationReservationProofBinding = (input) => {
    bindingCalls += 1;
    assert.equal(input.reservation_authority, protectedAuthority);
    return Object.freeze({
      activation_reference: event.activation_reference,
      installation_id: event.proof.installation_id,
      mode: "exact_replay",
      verified_proof: input.verified_proof,
    });
  };

  const actual = await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });

  assert.deepEqual(actual, fixture.result);
  assert.equal(bindingCalls, 1);
  assert.equal(fixture.calls.secret.length, 2);
  assert.equal(fixture.calls.pool.length, 1);
  assert.equal(fixture.calls.poolEnd, 1);
  assert.equal(fixture.calls.transaction.length, 1);
  assert.equal(fixture.calls.mint.length, 1);
});

test("injected registration mint delegates one exact authorization without secret transport", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  const delegateCalls = [];
  let environmentReads = 0;
  let expectedReceipt;
  const guardedEnvironment = {};
  for (const [key, value] of [
    ["AWS_REGION", "ap-northeast-2"],
    ["LAWOS_DATABASE_HOST", "forbidden.example.internal"],
    ["LAWOS_DATABASE_NAME", "forbidden"],
    ["LAWOS_DATABASE_PORT", "5432"],
    ["LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID", "forbidden"],
    ["LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID", "forbidden"],
  ]) {
    Object.defineProperty(guardedEnvironment, key, {
      enumerable: true,
      get() {
        environmentReads += 1;
        return value;
      },
    });
  }
  fixture.dependencies.env = guardedEnvironment;
  fixture.dependencies.mintLifecycleAuthorization = async (input) => {
    delegateCalls.push(input);
    assert.equal(Object.isFrozen(input), true);
    assert.deepEqual(Object.keys(input), ["authorization"]);
    assert.equal(Object.isFrozen(input.authorization), true);
    assert.deepEqual(
      Object.keys(input.authorization),
      LIFECYCLE_AUTHORIZATION_KEYS,
    );
    const authorization = input.authorization;
    assert.equal(authorization.operation, "register");
    assert.equal(
      authorization.activation_authorization_id,
      event.activation_reference,
    );
    assert.equal(authorization.lifecycle_challenge_id, null);
    assert.equal(authorization.retire_intent_id, null);
    assert.equal(authorization.expected_state_version, 1);
    assert.equal(authorization.user_id, item.principal.lawos_user_id);
    assert.match(authorization.request_id, /^oar_[A-Za-z0-9_-]{20,128}$/u);
    assert.equal(authorization.idempotency_key, authorization.request_id);
    assert.match(authorization.event_id, /^oae_[a-f0-9]{32}$/u);
    assert.equal(
      authorization.proof_issued_at,
      new Date(Number(event.proof.issued_at_epoch_ms)).toISOString(),
    );
    assert.equal(
      authorization.proof_expires_at,
      new Date(Number(event.proof.expires_at_epoch_ms)).toISOString(),
    );
    expectedReceipt = Object.freeze({
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      lifecycle_authorization_id: authorization.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("injected authorization binding"),
      authorized_at: authorization.proof_issued_at,
      valid_until: authorization.proof_expires_at,
    });
    return expectedReceipt;
  };

  const actual = await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });

  assert.deepEqual(Object.keys(actual), LIFECYCLE_RECEIPT_KEYS);
  assert.deepEqual(actual, expectedReceipt);
  assert.equal(Object.isFrozen(actual), true);
  assert.throws(
    () => assertOutlookDesktopLifecycleRegistrationContinuation(actual),
    { name: "TypeError" },
  );
  assert.equal(delegateCalls.length, 1);
  assert.equal(environmentReads, 0);
  assert.deepEqual(fixture.calls.reservation, [{
    activation_reference: event.activation_reference,
  }]);
  assert.deepEqual(fixture.calls.secret, []);
  assert.deepEqual(fixture.calls.pool, []);
  assert.equal(fixture.calls.poolEnd, 0);
  assert.deepEqual(fixture.calls.transaction, []);
  assert.deepEqual(fixture.calls.mint, []);
});

test("branded port promotes one opaque registration continuation into exact Core consume", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  const consumeCalls = [];
  let mintCalls = 0;
  fixture.dependencies.mintLifecycleAuthorization = async ({ authorization }) => {
    mintCalls += 1;
    return Object.freeze({
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      lifecycle_authorization_id: authorization.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("continuation mint binding"),
      authorized_at: authorization.proof_issued_at,
      valid_until: authorization.proof_expires_at,
    });
  };
  const installationEnvelope = Object.freeze({
    response_status: 201,
    body: Object.freeze({
      outcome: "registered",
      installation: Object.freeze({
        installation_id: event.proof.installation_id,
        status: "active",
        state_version: 1,
        lease_expires_at: "2026-08-25T00:00:00.000Z",
        retired_at: null,
      }),
    }),
  });
  const port = createOutlookDesktopLifecycleControlPort({
    verifyLifecycleTransition: (input) => (
      executeOutlookDesktopLifecycleVerifier({
        event: input,
        ...fixture.dependencies,
      })
    ),
    async issueLifecycleChallenge() {
      throw new Error("lifecycle challenge must remain disabled");
    },
    async consumeLifecycleTransition(input) {
      consumeCalls.push(input);
      return installationEnvelope;
    },
  });

  const continuation = await port.verifyLifecycleTransition(event);
  assert.equal(
    assertOutlookDesktopLifecycleRegistrationContinuation(continuation),
    continuation,
  );
  assert.equal(Object.isFrozen(continuation), true);
  assert.deepEqual(Reflect.ownKeys(continuation), LIFECYCLE_RECEIPT_KEYS);
  assert.equal(Object.getOwnPropertySymbols(continuation).length, 0);
  const publicContinuation = JSON.stringify(continuation);
  for (const forbidden of [
    "activation_authorization_id", "device_command_sha256",
    "device_public_key", "nonce_hash", "proof_transcript_sha256",
    "request_fingerprint",
  ]) assert.equal(publicContinuation.includes(forbidden), false);

  const clone = Object.freeze({ ...continuation });
  assert.throws(
    () => assertOutlookDesktopLifecycleRegistrationContinuation(clone),
    { name: "TypeError" },
  );
  const otherPortCalls = [];
  const otherPort = createOutlookDesktopLifecycleControlPort({
    async verifyLifecycleTransition() {
      return continuation;
    },
    async issueLifecycleChallenge() {
      throw new Error("unreachable");
    },
    async consumeLifecycleTransition(input) {
      otherPortCalls.push(input);
      throw new Error("cross-port consume must remain unreachable");
    },
  });
  const principal = Object.freeze({
    tenant_id: item.principal.lawos_tenant_id,
    user_id: item.principal.lawos_user_id,
    entra_subject_id: item.principal.entra_subject,
  });
  await assert.rejects(
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation: clone,
      lifecycle_port: port,
      principal,
    }),
    { name: "TypeError" },
  );
  await assert.rejects(
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation,
      lifecycle_port: otherPort,
      principal,
    }),
    { code: "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_MISMATCH" },
  );
  await assert.rejects(
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation,
      lifecycle_port: port,
      principal: { ...principal, user_id: "user-substituted" },
    }),
    { code: "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_MISMATCH" },
  );
  assert.deepEqual(consumeCalls, []);
  assert.deepEqual(otherPortCalls, []);

  const attempts = await Promise.allSettled(Array.from({ length: 4 }, () => (
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation,
      lifecycle_port: port,
      principal,
    })
  )));
  const fulfilled = attempts.filter(({ status }) => status === "fulfilled");
  const rejected = attempts.filter(({ status }) => status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 3);
  assert.equal(fulfilled[0].value, installationEnvelope);
  for (const attempt of rejected) {
    assert.equal(
      attempt.reason?.code,
      "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_CONSUMED",
    );
  }
  await assert.rejects(
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation,
      lifecycle_port: port,
      principal,
    }),
    { code: "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_CONSUMED" },
  );
  assert.equal(mintCalls, 1);
  assert.equal(consumeCalls.length, 1);
  const consumeInput = consumeCalls[0];
  assert.equal(Object.isFrozen(consumeInput), true);
  assert.deepEqual(Object.keys(consumeInput), [
    "authorization", "operation", "principal",
  ]);
  assert.equal(consumeInput.operation, "register");
  assert.equal(Object.isFrozen(consumeInput.authorization), true);
  assert.equal(Object.isFrozen(consumeInput.principal), true);
  assert.deepEqual(Object.keys(consumeInput.authorization), REGISTRATION_AUTHORIZATION_KEYS);
  assert.deepEqual(consumeInput.principal, principal);
  const authorization = consumeInput.authorization;
  assert.equal(authorization.installation_id, event.proof.installation_id);
  assert.equal(authorization.user_id, event.proof.user_id);
  assert.equal(authorization.entra_subject_id, event.proof.entra_subject_id);
  assert.equal(
    authorization.device_public_key,
    event.proof.device_public_key_spki_base64,
  );
  assert.equal(authorization.device_key_fingerprint, event.proof.device_id);
  assert.equal(authorization.platform, item.request.approved_release.platform);
  assert.equal(authorization.app_version, item.request.approved_release.app_version);
  assert.equal(authorization.source_sha, item.request.approved_release.source_sha);
  assert.equal(authorization.activation_authorization_id, event.proof.challenge_id);
  assert.equal(authorization.lifecycle_authorization_id, event.proof.proof_id);
  assert.equal(
    authorization.device_command_sha256,
    sha256(Buffer.from(event.raw_request_body_base64, "base64")),
  );
  assert.equal(
    authorization.issued_challenge_sha256,
    event.proof.issued_challenge_sha256,
  );
  assert.equal(authorization.request_id, event.proof.request_id);
  assert.equal(authorization.event_id, event.proof.event_id);
  assert.equal(authorization.idempotency_key, event.proof.idempotency_key);
  assert.equal(
    authorization.issued_at,
    new Date(Number(event.proof.issued_at_epoch_ms)).toISOString(),
  );
  assert.equal(
    authorization.expires_at,
    new Date(Number(event.proof.expires_at_epoch_ms)).toISOString(),
  );
  assert.deepEqual(fixture.calls.secret, []);
  assert.deepEqual(fixture.calls.pool, []);
  assert.equal(fixture.calls.poolEnd, 0);
  assert.deepEqual(fixture.calls.transaction, []);
  assert.deepEqual(fixture.calls.mint, []);
});

test("direct verifier receipt cannot be adopted by a later branded wrapper", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  fixture.dependencies.mintLifecycleAuthorization = async ({ authorization }) => (
    Object.freeze({
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      lifecycle_authorization_id: authorization.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("pending exact receipt"),
      authorized_at: authorization.proof_issued_at,
      valid_until: authorization.proof_expires_at,
    })
  );
  const pending = await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });
  assert.throws(
    () => assertOutlookDesktopLifecycleRegistrationContinuation(pending),
    { name: "TypeError" },
  );
  const clone = Object.freeze({ ...pending });
  const cloningPort = createOutlookDesktopLifecycleControlPort({
    async verifyLifecycleTransition() {
      return clone;
    },
    async issueLifecycleChallenge() {
      throw new Error("unreachable");
    },
    async consumeLifecycleTransition() {
      throw new Error("unreachable");
    },
  });
  assert.equal(await cloningPort.verifyLifecycleTransition(event), clone);
  assert.throws(
    () => assertOutlookDesktopLifecycleRegistrationContinuation(clone),
    { name: "TypeError" },
  );
  let adoptionConsumeCalls = 0;
  const exactPort = createOutlookDesktopLifecycleControlPort({
    async verifyLifecycleTransition() {
      return pending;
    },
    async issueLifecycleChallenge() {
      throw new Error("unreachable");
    },
    async consumeLifecycleTransition() {
      adoptionConsumeCalls += 1;
      return Object.freeze({ response_status: 201 });
    },
  });
  assert.equal(await exactPort.verifyLifecycleTransition(event), pending);
  assert.throws(
    () => assertOutlookDesktopLifecycleRegistrationContinuation(pending),
    { name: "TypeError" },
  );
  await assert.rejects(
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation: pending,
      lifecycle_port: exactPort,
      principal: {
        tenant_id: item.principal.lawos_tenant_id,
        user_id: item.principal.lawos_user_id,
        entra_subject_id: item.principal.entra_subject,
      },
    }),
    { name: "TypeError" },
  );
  assert.equal(adoptionConsumeCalls, 0);
});

test("activation authority accessors fail closed before mint or continuation consume", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);
  const cases = [
    {
      wrap(fixture, reads) {
        const assertReservation = fixture.dependencies.assertActivationReservation;
        fixture.dependencies.assertActivationReservation = async (input) => {
          const authority = await assertReservation(input);
          const descriptors = Object.getOwnPropertyDescriptors(authority);
          descriptors.mode = {
            configurable: false,
            enumerable: true,
            get() {
              reads.count += 1;
              throw new Error("private reservation accessor detail");
            },
          };
          return Object.freeze(Object.defineProperties({}, descriptors));
        };
      },
    },
    {
      wrap(fixture, reads) {
        const assertProofBinding =
          fixture.dependencies.assertActivationReservationProofBinding;
        fixture.dependencies.assertActivationReservationProofBinding = (input) => {
          const binding = assertProofBinding(input);
          const descriptors = Object.getOwnPropertyDescriptors(binding);
          descriptors.mode = {
            configurable: false,
            enumerable: true,
            get() {
              reads.count += 1;
              throw new Error("private proof binding accessor detail");
            },
          };
          return Object.freeze(Object.defineProperties({}, descriptors));
        };
      },
    },
  ];

  for (const testCase of cases) {
    const fixture = runtimeFixture(t, item);
    const reads = { count: 0 };
    let mintCalls = 0;
    let consumeCalls = 0;
    testCase.wrap(fixture, reads);
    fixture.dependencies.mintLifecycleAuthorization = async () => {
      mintCalls += 1;
      throw new Error("mint must remain unreachable");
    };
    const port = createOutlookDesktopLifecycleControlPort({
      verifyLifecycleTransition: (input) => executeOutlookDesktopLifecycleVerifier({
        event: input,
        ...fixture.dependencies,
      }),
      async issueLifecycleChallenge() {
        throw new Error("unreachable");
      },
      async consumeLifecycleTransition() {
        consumeCalls += 1;
        throw new Error("consume must remain unreachable");
      },
    });

    await assert.rejects(
      port.verifyLifecycleTransition(event),
      (error) => error instanceof OutlookDesktopLifecycleVerifierError
        && error.code === "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH"
        && error.status === 401
        && !error.message.includes("private"),
    );
    assert.equal(reads.count, 0);
    assert.equal(mintCalls, 0);
    assert.equal(consumeCalls, 0);
  }
});

test("activation assertion errors never invoke getters or Proxy traps", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);
  const seams = [
    {
      install(fixture, source) {
        fixture.dependencies.assertActivationReservation = async () => {
          throw source;
        };
      },
    },
    {
      install(fixture, source) {
        fixture.dependencies.assertActivationReservationProofBinding = () => {
          throw source;
        };
      },
    },
  ];
  const adversaries = [
    (reads) => {
      const source = new Error("PRIVATE_ASSERTOR_DETAIL");
      Object.defineProperty(source, "code", {
        enumerable: true,
        get() {
          reads.count += 1;
          throw new Error("PRIVATE_ASSERTOR_CODE_GETTER_DETAIL");
        },
      });
      return source;
    },
    (reads) => new Proxy(Object.assign(new Error("PRIVATE_PROXY_DETAIL"), {
      code: "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_NOT_ATTACHED",
    }), {
      getPrototypeOf() {
        reads.count += 1;
        throw new Error("PRIVATE_PROXY_PROTOTYPE_DETAIL");
      },
      get() {
        reads.count += 1;
        throw new Error("PRIVATE_PROXY_GET_DETAIL");
      },
      getOwnPropertyDescriptor() {
        reads.count += 1;
        throw new Error("PRIVATE_PROXY_DESCRIPTOR_DETAIL");
      },
    }),
  ];

  for (const seam of seams) {
    for (const adversary of adversaries) {
      const fixture = runtimeFixture(t, item);
      const reads = { count: 0 };
      const source = adversary(reads);
      let mintCalls = 0;
      let consumeCalls = 0;
      seam.install(fixture, source);
      fixture.dependencies.mintLifecycleAuthorization = async () => {
        mintCalls += 1;
        throw new Error("mint must remain unreachable");
      };
      const port = createOutlookDesktopLifecycleControlPort({
        verifyLifecycleTransition: (input) => executeOutlookDesktopLifecycleVerifier({
          event: input,
          ...fixture.dependencies,
        }),
        async issueLifecycleChallenge() {
          throw new Error("unreachable");
        },
        async consumeLifecycleTransition() {
          consumeCalls += 1;
          throw new Error("consume must remain unreachable");
        },
      });

      await assert.rejects(
        port.verifyLifecycleTransition(event),
        (error) => error !== source
          && error instanceof OutlookDesktopLifecycleVerifierError
          && error.code === "OUTLOOK_LIFECYCLE_ACTIVATION_INVALID"
          && error.status === 401
          && !error.message.includes("PRIVATE"),
      );
      assert.equal(reads.count, 0);
      assert.equal(mintCalls, 0);
      assert.equal(consumeCalls, 0);
      assert.deepEqual(fixture.calls.secret, []);
      assert.deepEqual(fixture.calls.pool, []);
      assert.deepEqual(fixture.calls.transaction, []);
      assert.deepEqual(fixture.calls.mint, []);
    }
  }
});

test("caught concurrent registration mint poisons the wrapper invocation", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  let mintCalls = 0;
  let consumeCalls = 0;
  let settled;
  fixture.dependencies.mintLifecycleAuthorization = async ({ authorization }) => {
    mintCalls += 1;
    return Object.freeze({
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      lifecycle_authorization_id: authorization.lifecycle_authorization_id,
      authorization_binding_sha256: sha256(`concurrent mint ${mintCalls}`),
      authorized_at: authorization.proof_issued_at,
      valid_until: authorization.proof_expires_at,
    });
  };
  const port = createOutlookDesktopLifecycleControlPort({
    async verifyLifecycleTransition(input) {
      settled = await Promise.allSettled([
        executeOutlookDesktopLifecycleVerifier({
          event: input,
          ...fixture.dependencies,
        }),
        executeOutlookDesktopLifecycleVerifier({
          event: input,
          ...fixture.dependencies,
        }),
      ]);
      return settled.find(({ status }) => status === "fulfilled").value;
    },
    async issueLifecycleChallenge() {
      throw new Error("unreachable");
    },
    async consumeLifecycleTransition() {
      consumeCalls += 1;
      throw new Error("poisoned continuation must remain unreachable");
    },
  });

  const receipt = await port.verifyLifecycleTransition(event);
  assert.equal(mintCalls, 2);
  assert.equal(settled.filter(({ status }) => status === "fulfilled").length, 1);
  const rejected = settled.filter(({ status }) => status === "rejected");
  assert.equal(rejected.length, 1);
  assert.equal(
    rejected[0].reason?.code,
    "OUTLOOK_LIFECYCLE_RUNTIME_CONFIGURATION_INVALID",
  );
  assert.throws(
    () => assertOutlookDesktopLifecycleRegistrationContinuation(receipt),
    { name: "TypeError" },
  );
  await assert.rejects(
    consumeOutlookDesktopLifecycleRegistrationContinuation({
      continuation: receipt,
      lifecycle_port: port,
      principal: {
        tenant_id: item.principal.lawos_tenant_id,
        user_id: item.principal.lawos_user_id,
        entra_subject_id: item.principal.entra_subject,
      },
    }),
    { name: "TypeError" },
  );
  assert.equal(consumeCalls, 0);
});

test("failed or malformed second registration mint still poisons the wrapper", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);

  for (const mode of ["throw", "malformed"]) {
    const fixture = runtimeFixture(t, item);
    let mintCalls = 0;
    let consumeCalls = 0;
    let settled;
    fixture.dependencies.mintLifecycleAuthorization = async ({ authorization }) => {
      mintCalls += 1;
      if (mintCalls === 2 && mode === "throw") {
        throw new Error("private second mint failure");
      }
      const receipt = {
        outcome: "authorized",
        tenant_id: item.principal.lawos_tenant_id,
        lifecycle_authorization_id: authorization.lifecycle_authorization_id,
        authorization_binding_sha256: sha256(`${mode} concurrent mint ${mintCalls}`),
        authorized_at: authorization.proof_issued_at,
        valid_until: authorization.proof_expires_at,
      };
      if (mintCalls === 2 && mode === "malformed") receipt.extra = true;
      return Object.freeze(receipt);
    };
    const port = createOutlookDesktopLifecycleControlPort({
      async verifyLifecycleTransition(input) {
        settled = await Promise.allSettled([
          executeOutlookDesktopLifecycleVerifier({
            event: input,
            ...fixture.dependencies,
          }),
          executeOutlookDesktopLifecycleVerifier({
            event: input,
            ...fixture.dependencies,
          }),
        ]);
        return settled.find(({ status }) => status === "fulfilled").value;
      },
      async issueLifecycleChallenge() {
        throw new Error("unreachable");
      },
      async consumeLifecycleTransition() {
        consumeCalls += 1;
        throw new Error("poisoned continuation must remain unreachable");
      },
    });

    const receipt = await port.verifyLifecycleTransition(event);
    assert.equal(mintCalls, 2);
    assert.equal(settled.filter(({ status }) => status === "fulfilled").length, 1);
    const rejected = settled.filter(({ status }) => status === "rejected");
    assert.equal(rejected.length, 1);
    assert.equal(
      rejected[0].reason?.code,
      mode === "throw"
        ? "OUTLOOK_LIFECYCLE_DATABASE_FAILED"
        : "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID",
    );
    assert.throws(
      () => assertOutlookDesktopLifecycleRegistrationContinuation(receipt),
      { name: "TypeError" },
    );
    await assert.rejects(
      consumeOutlookDesktopLifecycleRegistrationContinuation({
        continuation: receipt,
        lifecycle_port: port,
        principal: {
          tenant_id: item.principal.lawos_tenant_id,
          user_id: item.principal.lawos_user_id,
          entra_subject_id: item.principal.entra_subject,
        },
      }),
      { name: "TypeError" },
    );
    assert.equal(consumeCalls, 0);
    assert.deepEqual(fixture.calls.secret, []);
    assert.deepEqual(fixture.calls.pool, []);
    assert.equal(fixture.calls.poolEnd, 0);
    assert.deepEqual(fixture.calls.transaction, []);
    assert.deepEqual(fixture.calls.mint, []);
  }
});

test("registration continuation sanitizes Core failures and burns its capability", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);
  let getterReads = 0;
  const getterError = new Error("opaque Core failure");
  Object.defineProperty(getterError, "safe_error_code", {
    enumerable: true,
    get() {
      getterReads += 1;
      throw new Error("private getter detail");
    },
  });
  for (const source of [
    Object.assign(new Error("private Core registration row detail"), {
      detail: "private SQL material",
    }),
    new OutlookDesktopLifecycleVerifierError(
      "PRIVATE_CORE_ERROR",
      "private password and SQL row detail",
      599,
    ),
    getterError,
  ]) {
    const fixture = runtimeFixture(t, item);
    let consumeCalls = 0;
    fixture.dependencies.mintLifecycleAuthorization = async ({ authorization }) => (
      Object.freeze({
        outcome: "authorized",
        tenant_id: item.principal.lawos_tenant_id,
        lifecycle_authorization_id: authorization.lifecycle_authorization_id,
        authorization_binding_sha256: sha256("consume failure receipt"),
        authorized_at: authorization.proof_issued_at,
        valid_until: authorization.proof_expires_at,
      })
    );
    const port = createOutlookDesktopLifecycleControlPort({
      verifyLifecycleTransition: (input) => executeOutlookDesktopLifecycleVerifier({
        event: input,
        ...fixture.dependencies,
      }),
      async issueLifecycleChallenge() {
        throw new Error("unreachable");
      },
      async consumeLifecycleTransition() {
        consumeCalls += 1;
        throw source;
      },
    });
    const continuation = await port.verifyLifecycleTransition(event);
    const principal = {
      tenant_id: item.principal.lawos_tenant_id,
      user_id: item.principal.lawos_user_id,
      entra_subject_id: item.principal.entra_subject,
    };
    await assert.rejects(
      consumeOutlookDesktopLifecycleRegistrationContinuation({
        continuation,
        lifecycle_port: port,
        principal,
      }),
      (error) => error !== source
        && error?.code === "OUTLOOK_LIFECYCLE_REGISTRATION_CONSUME_FAILED"
        && error?.status === 503
        && !error.message.includes("private")
        && !error.message.includes("SQL"),
    );
    await assert.rejects(
      consumeOutlookDesktopLifecycleRegistrationContinuation({
        continuation,
        lifecycle_port: port,
        principal,
      }),
      { code: "OUTLOOK_LIFECYCLE_REGISTRATION_CONTINUATION_CONSUMED" },
    );
    assert.equal(consumeCalls, 1);
    assert.deepEqual(fixture.calls.secret, []);
    assert.deepEqual(fixture.calls.pool, []);
    assert.equal(fixture.calls.poolEnd, 0);
  }
  assert.equal(getterReads, 0);
});

test("registration continuation rejects coercive and active exact field values", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);
  const replaceApprovedRelease = (fixture, replacement) => {
    const assertReservation = fixture.dependencies.assertActivationReservation;
    fixture.dependencies.assertActivationReservation = async (input) => {
      const authority = await assertReservation(input);
      const verified = authority.verified_activation;
      return Object.freeze({
        ...authority,
        verified_activation: Object.freeze({
          ...verified,
          bindings: Object.freeze({
            ...verified.bindings,
            approved_release: replacement(verified.bindings.approved_release),
          }),
        }),
      });
    };
  };
  const exact21Cases = [
    {
      mutate(release) {
        return Object.freeze({ ...release, app_version: new String(release.app_version) });
      },
      reads: () => 0,
    },
    (() => {
      let reads = 0;
      return {
        mutate(release) {
          return Object.freeze({
            ...release,
            source_sha: Object.freeze({
              toString() {
                reads += 1;
                return release.source_sha;
              },
            }),
          });
        },
        reads: () => reads,
      };
    })(),
    (() => {
      let reads = 0;
      return {
        mutate(release) {
          const descriptors = Object.getOwnPropertyDescriptors(release);
          descriptors.app_version = {
            configurable: false,
            enumerable: true,
            get() {
              reads += 1;
              throw new Error("private approved release getter");
            },
          };
          return Object.freeze(Object.defineProperties({}, descriptors));
        },
        reads: () => reads,
      };
    })(),
    (() => {
      let reads = 0;
      return {
        mutate(release) {
          return new Proxy(release, {
            get(target, key, receiver) {
              reads += 1;
              return Reflect.get(target, key, receiver);
            },
          });
        },
        reads: () => reads,
      };
    })(),
  ];
  for (const testCase of exact21Cases) {
    const fixture = runtimeFixture(t, item);
    let mintCalls = 0;
    replaceApprovedRelease(fixture, testCase.mutate);
    fixture.dependencies.mintLifecycleAuthorization = async () => {
      mintCalls += 1;
      throw new Error("coercive exact21 must not reach mint");
    };
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({ event, ...fixture.dependencies }),
      (error) => error?.code === "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH"
        && !error.message.includes("private"),
    );
    assert.equal(mintCalls, 0);
    assert.equal(testCase.reads(), 0);
  }

  let receiptCoercions = 0;
  const receiptCases = [
    () => Object.freeze({
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      lifecycle_authorization_id: event.proof.proof_id,
      authorization_binding_sha256: Object.freeze({
        toString() {
          receiptCoercions += 1;
          return sha256("coercive receipt binding");
        },
      }),
      authorized_at: new Date(Number(event.proof.issued_at_epoch_ms)).toISOString(),
      valid_until: new Date(Number(event.proof.expires_at_epoch_ms)).toISOString(),
    }),
    () => {
      const receipt = {
        outcome: "authorized",
        tenant_id: item.principal.lawos_tenant_id,
        lifecycle_authorization_id: event.proof.proof_id,
        authorized_at: new Date(Number(event.proof.issued_at_epoch_ms)).toISOString(),
        valid_until: new Date(Number(event.proof.expires_at_epoch_ms)).toISOString(),
      };
      Object.defineProperty(receipt, "authorization_binding_sha256", {
        enumerable: true,
        get() {
          receiptCoercions += 1;
          throw new Error("private receipt getter");
        },
      });
      return receipt;
    },
    () => new Proxy(Object.freeze({
      outcome: "authorized",
      tenant_id: item.principal.lawos_tenant_id,
      lifecycle_authorization_id: event.proof.proof_id,
      authorization_binding_sha256: sha256("proxied receipt binding"),
      authorized_at: new Date(Number(event.proof.issued_at_epoch_ms)).toISOString(),
      valid_until: new Date(Number(event.proof.expires_at_epoch_ms)).toISOString(),
    }), {}),
  ];
  for (const receipt of receiptCases) {
    const fixture = runtimeFixture(t, item);
    fixture.dependencies.mintLifecycleAuthorization = async () => receipt();
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({ event, ...fixture.dependencies }),
      { code: "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID" },
    );
  }
  assert.equal(receiptCoercions, 0);
});

test("injected mint stays behind proof and protected upstream gates", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);
  const cases = [
    {
      expected: "OUTLOOK_LIFECYCLE_PROOF_SIGNATURE_INVALID",
      mutate(fixture) {
        return {
          ...event,
          proof_signature_base64: Buffer.alloc(64).toString("base64"),
        };
      },
    },
    {
      expected: "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH",
      mutate(fixture) {
        const assertReservation = fixture.dependencies.assertActivationReservation;
        fixture.dependencies.assertActivationReservation = async (input) => ({
          ...await assertReservation(input),
          installation_id: "odi_substitutedabcdefghijkl",
        });
        return event;
      },
    },
    {
      expected: "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH",
      mutate(fixture) {
        const assertProofBinding =
          fixture.dependencies.assertActivationReservationProofBinding;
        fixture.dependencies.assertActivationReservationProofBinding = (input) => {
          const binding = assertProofBinding(input);
          return Object.freeze({
            ...binding,
            authorization: Object.freeze({
              ...binding.authorization,
              device_command_sha256: sha256("substituted device command"),
            }),
          });
        };
        return event;
      },
    },
    {
      expected: "OUTLOOK_LIFECYCLE_CHALLENGE_UNAVAILABLE",
      mutate(fixture) {
        fixture.dependencies.loadLifecycleChallenge = undefined;
        return signedEvent(item, { operation: "heartbeat" });
      },
    },
  ];

  for (const testCase of cases) {
    const fixture = runtimeFixture(t, item);
    let delegateCalls = 0;
    fixture.dependencies.mintLifecycleAuthorization = async () => {
      delegateCalls += 1;
      throw new Error("mint delegate must remain unreachable");
    };
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({
        event: testCase.mutate(fixture),
        ...fixture.dependencies,
      }),
      { code: testCase.expected },
    );
    assert.equal(delegateCalls, 0);
    assert.deepEqual(fixture.calls.secret, []);
    assert.deepEqual(fixture.calls.pool, []);
    assert.equal(fixture.calls.poolEnd, 0);
    assert.deepEqual(fixture.calls.mint, []);
  }
});

test("injected mint sanitizes Core replay and private failures without fallback", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);
  let getterReads = 0;
  const getterError = new Error("opaque Core mint failure");
  Object.defineProperty(getterError, "safe_error_code", {
    enumerable: true,
    get() {
      getterReads += 1;
      throw new Error("private Core getter detail");
    },
  });
  const cases = [
    {
      source: Object.assign(new Error("private Core replay detail"), {
        code: "LAWOS_OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REPLAY_CONFLICT",
        safe_error_code:
          "OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REPLAY_CONFLICT",
        status: 409,
      }),
      expectedCode: "OUTLOOK_LIFECYCLE_REPLAY_CONFLICT",
      expectedStatus: 409,
    },
    {
      source: Object.assign(new Error("private Core database detail"), {
        code: "PRIVATE_CORE_DATABASE_FAILURE",
      }),
      expectedCode: "OUTLOOK_LIFECYCLE_DATABASE_FAILED",
      expectedStatus: 503,
    },
    {
      source: new OutlookDesktopLifecycleVerifierError(
        "PRIVATE_CORE_DATABASE_FAILURE",
        "private password and SQL row detail",
        599,
      ),
      expectedCode: "OUTLOOK_LIFECYCLE_DATABASE_FAILED",
      expectedStatus: 503,
    },
    {
      source: getterError,
      expectedCode: "OUTLOOK_LIFECYCLE_DATABASE_FAILED",
      expectedStatus: 503,
    },
  ];

  for (const testCase of cases) {
    const fixture = runtimeFixture(t, item);
    let delegateCalls = 0;
    fixture.dependencies.mintLifecycleAuthorization = async () => {
      delegateCalls += 1;
      throw testCase.source;
    };
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({
        event,
        ...fixture.dependencies,
      }),
      (error) => error !== testCase.source
        && error?.code === testCase.expectedCode
        && error?.status === testCase.expectedStatus
        && !error.message.includes("private Core"),
    );
    assert.equal(delegateCalls, 1);
    assert.deepEqual(fixture.calls.secret, []);
    assert.deepEqual(fixture.calls.pool, []);
    assert.equal(fixture.calls.poolEnd, 0);
    assert.deepEqual(fixture.calls.mint, []);
  }
  assert.equal(getterReads, 0);

  const malformed = runtimeFixture(t, item);
  malformed.dependencies.mintLifecycleAuthorization = async ({ authorization }) => ({
    outcome: "authorized",
    tenant_id: item.principal.lawos_tenant_id,
    lifecycle_authorization_id: authorization.lifecycle_authorization_id,
    authorization_binding_sha256: sha256("malformed injected receipt"),
    authorized_at: authorization.proof_issued_at,
    valid_until: authorization.proof_expires_at,
    extra: true,
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event,
      ...malformed.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID" },
  );
  assert.deepEqual(malformed.calls.secret, []);
  assert.deepEqual(malformed.calls.pool, []);
  assert.equal(malformed.calls.poolEnd, 0);
  assert.deepEqual(malformed.calls.mint, []);
});

test("registration requires a protected authorized reload before mint", async (t) => {
  const item = await activationFixture(t);
  const event = signedEvent(item);

  const fresh = runtimeFixture(t, item);
  const assertAuthorized = fresh.dependencies.assertActivationReservation;
  fresh.dependencies.assertActivationReservation = async (input) => ({
    ...await assertAuthorized(input),
    mode: "fresh",
    state: "evidence_attached",
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({ event, ...fresh.dependencies }),
    { code: "OUTLOOK_LIFECYCLE_ACTIVATION_NOT_AUTHORIZED" },
  );
  assert.deepEqual(fresh.calls.secret, []);
  assert.deepEqual(fresh.calls.mint, []);

  const issued = runtimeFixture(t, item);
  issued.dependencies.assertActivationReservation = async () => {
    throw Object.assign(new Error("private evidence state"), {
      code: "OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_NOT_ATTACHED",
    });
  };
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({ event, ...issued.dependencies }),
    (error) => error?.code === "OUTLOOK_LIFECYCLE_ACTIVATION_NOT_AUTHORIZED"
      && error?.status === 409
      && !error.message.includes("private evidence state"),
  );
  assert.deepEqual(issued.calls.secret, []);
  assert.deepEqual(issued.calls.mint, []);

  const other = await activationFixture(t);
  const swapped = runtimeFixture(t, item);
  swapped.dependencies.loadActivationReservation = async () => ({
    ...activationReservationInput(item),
    operator_receipt_bytes: other.operator_receipt_bytes,
    operator_receipt_signature_bytes: other.operator_receipt_signature_bytes,
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({ event, ...swapped.dependencies }),
    { code: "OUTLOOK_LIFECYCLE_ACTIVATION_INVALID" },
  );
  assert.deepEqual(swapped.calls.secret, []);
  assert.deepEqual(swapped.calls.mint, []);
  const substitutedReservation = runtimeFixture(t, item);
  const assertReservation = substitutedReservation.dependencies.assertActivationReservation;
  substitutedReservation.dependencies.assertActivationReservation = async (input) => ({
    ...await assertReservation(input),
    installation_id: "odi_substitutedabcdefghijkl",
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event,
      ...substitutedReservation.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_ACTIVATION_BINDING_MISMATCH" },
  );
  assert.deepEqual(substitutedReservation.calls.secret, []);
  assert.deepEqual(substitutedReservation.calls.mint, []);
  const shiftedWindow = runtimeFixture(t, item);
  const loadShiftedChallenge = shiftedWindow.dependencies.loadLifecycleChallenge;
  shiftedWindow.dependencies.loadLifecycleChallenge = async (binding) => {
    const challenge = await loadShiftedChallenge(binding);
    return {
      ...challenge,
      issued_at: new Date(Date.parse(challenge.issued_at) - 1).toISOString(),
    };
  };
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event: signedEvent(item, { operation: "heartbeat" }),
      ...shiftedWindow.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_CHALLENGE_BINDING_MISMATCH" },
  );
  assert.deepEqual(shiftedWindow.calls.secret, []);
  assert.deepEqual(shiftedWindow.calls.mint, []);

  const consumed = runtimeFixture(t, item);
  const assertConsumed = consumed.dependencies.assertActivationReservation;
  consumed.dependencies.assertActivationReservation = async (input) => ({
    ...await assertConsumed(input),
    mode: "exact_replay",
    state: "consumed",
  });
  await executeOutlookDesktopLifecycleVerifier({ event, ...consumed.dependencies });
  assert.equal(consumed.calls.mint.length, 1);
});

test("signature and every upstream artifact gate execute before secrets or PostgreSQL", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const base = signedEvent(item);
  let eventGetterCalls = 0;
  const accessorEvent = { ...base };
  Object.defineProperty(accessorEvent, "proof", {
    configurable: true,
    enumerable: true,
    get() {
      eventGetterCalls += 1;
      return base.proof;
    },
  });
  const failures = [
    accessorEvent,
    { ...base, extra: true },
    {
      action: base.action,
      schema_version: base.schema_version,
      ...Object.fromEntries(Object.entries(base).slice(2)),
    },
    { ...base, raw_request_body_base64: Buffer.from("changed").toString("base64") },
    { ...base, proof_signature_base64: Buffer.alloc(63).toString("base64") },
    {
      ...base,
      authenticated_principal: {
        ...base.authenticated_principal,
        user_id: "user-other",
      },
    },
    { ...base, activation_reference: null },
    {
      ...signedEvent(item, { operation: "heartbeat" }),
      activation_reference: base.activation_reference,
    },
    {
      ...base,
      activation_reference: "oda_changed_activation_reference_0001",
    },
    {
      ...base,
      activation_reference: {
        activation_id: base.proof.challenge_id,
        installation_id: base.proof.installation_id,
      },
    },
    {
      ...base,
      activation_verification: activationReservationInput(item),
    },
    {
      ...base,
      activation_id: base.proof.challenge_id,
    },
  ];
  for (const event of failures) {
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({ event, ...fixture.dependencies }),
      (error) => String(error?.code ?? "").startsWith("OUTLOOK_LIFECYCLE_"),
    );
  }
  assert.equal(eventGetterCalls, 0);
  assert.deepEqual(fixture.calls.reservation, []);
  fixture.dependencies.loadActivationReservation = async () => ({
    ...activationReservationInput(item),
    release_ticket_bytes: Buffer.from("not a ticket"),
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({ event: base, ...fixture.dependencies }),
    { code: "OUTLOOK_LIFECYCLE_ACTIVATION_INVALID" },
  );
  assert.deepEqual(fixture.calls.secret, []);
  assert.deepEqual(fixture.calls.pool, []);
  assert.deepEqual(fixture.calls.transaction, []);
  assert.deepEqual(fixture.calls.mint, []);
});

test("protected reservation await cannot replace the verified event or runtime snapshot", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  const expectedProofId = event.proof.proof_id;
  const expectedInstallationId = event.proof.installation_id;
  const expectedTenantId = event.proof.tenant_id;
  fixture.dependencies.loadActivationReservation = async (reference) => {
    assert.equal(Object.isFrozen(reference), true);
    event.proof.proof_id = "proof-substituted";
    event.proof.installation_id = "odi_substitutedabcdefghijkl";
    event.proof.tenant_id = "tenant-substituted";
    event.authenticated_principal.tenant_id = "tenant-substituted";
    event.activation_reference = "oda_activation_substituted_0001";
    event.raw_request_body_base64 = Buffer.from("substituted").toString("base64");
    fixture.dependencies.env.LAWOS_DATABASE_HOST = "substituted.example.invalid";
    return activationReservationInput(item);
  };

  await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });

  const [tenantId, payloadJson] = fixture.calls.mint[0].parameters;
  const payload = JSON.parse(payloadJson);
  assert.equal(tenantId, expectedTenantId);
  assert.equal(payload.lifecycle_authorization_id, expectedProofId);
  assert.equal(payload.installation_id, expectedInstallationId);
  assert.match(fixture.calls.pool[0].connectionString, /lawos\.example\.internal/u);
  assert.doesNotMatch(fixture.calls.pool[0].connectionString, /substituted/u);
});

test("closed proof fields, transcript domain, length framing, and exact body are signed", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const base = signedEvent(item);
  const mutateProof = (field, value) => ({
    ...base,
    proof: Object.fromEntries(Object.entries(base.proof).map(([key, current]) => [
      key,
      key === field ? value : current,
    ])),
  });
  const mutateProofFields = (values) => ({
    ...base,
    proof: Object.fromEntries(Object.entries(base.proof).map(([key, current]) => [
      key,
      Object.hasOwn(values, key) ? values[key] : current,
    ])),
  });
  const heartbeatProof = baseProof(item, "heartbeat");
  const rsaDer = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({
    format: "der",
    type: "spki",
  });
  const trailingDer = Buffer.concat([
    Buffer.from(base.proof.device_public_key_spki_base64, "base64"),
    Buffer.from([0]),
  ]);
  const mutations = [
    {
      ...base,
      activation_reference: null,
      proof: heartbeatProof,
    },
    mutateProof("tenant_id", "tenant_other"),
    mutateProof("user_id", "user_other"),
    mutateProof("entra_subject_id", "entra-subject-other"),
    mutateProof("device_id", "f".repeat(64)),
    mutateProof("installation_id", "odi_zyxwvutsrqponmlkjihgfedc"),
    mutateProof("release_authority_sha256", "e".repeat(64)),
    mutateProof("local_measurement_evidence_sha256", "c".repeat(64)),
    mutateProof("policy_version", "policy.other"),
    mutateProof("expected_state_version", 2),
    mutateProof("expected_state_version", "1"),
    mutateProof("request_id", "request-lifecycle-register-other"),
    mutateProof("event_id", "event-lifecycle-register-other"),
    mutateProof("idempotency_key", "lifecycle-register-idempotency-other"),
    mutateProof("challenge_nonce_base64url", Buffer.alloc(32, 0x11).toString("base64url")),
    mutateProof("challenge_nonce_base64url", Buffer.alloc(31, 0x11).toString("base64url")),
    mutateProof("challenge_id", "oda_changed_challenge_0001"),
    mutateProof("issued_challenge_sha256", "b".repeat(64)),
    mutateProof("activation_receipt_sha256", "d".repeat(64)),
    mutateProof("proof_id", "lifecycle-register-changed-0001"),
    mutateProof("issued_at_epoch_ms", String(ACTIVATION_NOW + 1)),
    mutateProof("expires_at_epoch_ms", String(ACTIVATION_NOW + 60_001)),
    mutateProof("expires_at_epoch_ms", String(ACTIVATION_NOW + 5 * 60 * 1_000 + 1)),
    mutateProofFields({
      issued_at_epoch_ms: "8640000000000001",
      expires_at_epoch_ms: "8640000000000002",
    }),
    mutateProof("retire_intent_id", "retire-intent-forbidden"),
    mutateProof("retire_reason", "windows_uninstall"),
    mutateProof("device_public_key_spki_base64", `${base.proof.device_public_key_spki_base64.slice(0, -1)}A`),
    mutateProofFields({
      device_id: sha256(rsaDer),
      device_public_key_spki_base64: rsaDer.toString("base64"),
    }),
    mutateProofFields({
      device_id: sha256(trailingDer),
      device_public_key_spki_base64: trailingDer.toString("base64"),
    }),
    {
      ...base,
      authenticated_principal: {
        user_id: base.authenticated_principal.user_id,
        tenant_id: base.authenticated_principal.tenant_id,
        entra_subject_id: base.authenticated_principal.entra_subject_id,
      },
    },
    {
      ...base,
      proof: {
        ...base.proof,
        extra: true,
      },
    },
  ];
  const transcript = createOutlookDesktopLifecycleProofTranscript({
    proof: base.proof,
    rawRequestBody: Buffer.from(base.raw_request_body_base64, "base64"),
  });
  const splitPrincipalProof = (userId, entraSubjectId) => Object.fromEntries(
    Object.entries(base.proof).map(([key, value]) => [
      key,
      key === "user_id" ? userId
        : key === "entra_subject_id" ? entraSubjectId : value,
    ]),
  );
  assert.notEqual(
    sha256(createOutlookDesktopLifecycleProofTranscript({
      proof: splitPrincipalProof("a", "bc"),
      rawRequestBody: Buffer.from(base.raw_request_body_base64, "base64"),
    })),
    sha256(createOutlookDesktopLifecycleProofTranscript({
      proof: splitPrincipalProof("ab", "c"),
      rawRequestBody: Buffer.from(base.raw_request_body_base64, "base64"),
    })),
  );
  const wrongDomain = Buffer.from(transcript);
  wrongDomain[0] ^= 1;
  mutations.push({
    ...base,
    proof_signature_base64: sign(null, wrongDomain, item.keys.device.privateKey).toString("base64"),
  });
  const wrongLength = Buffer.from(transcript);
  const firstLength = Buffer.byteLength("lawos.outlook.lifecycle-proof.v1") + 1;
  wrongLength[firstLength + 3] ^= 1;
  mutations.push({
    ...base,
    proof_signature_base64: sign(null, wrongLength, item.keys.device.privateKey).toString("base64"),
  });

  for (const event of mutations) {
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({ event, ...fixture.dependencies }),
      (error) => String(error?.code ?? "").startsWith("OUTLOOK_LIFECYCLE_"),
    );
  }
  assert.equal(fixture.calls.secret.length, 0);
  assert.equal(fixture.calls.mint.length, 0);
});

test("heartbeat and retire mint operation-only receipts with no activation DB fields", async (t) => {
  const item = await activationFixture(t);
  const blocked = runtimeFixture(t, item);
  blocked.dependencies.loadLifecycleChallenge = undefined;
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event: signedEvent(item, { operation: "heartbeat" }),
      ...blocked.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_CHALLENGE_UNAVAILABLE" },
  );
  assert.deepEqual(blocked.calls.secret, []);
  assert.deepEqual(blocked.calls.mint, []);
  const unasserted = runtimeFixture(t, item);
  unasserted.dependencies.assertLifecycleChallengeReceipt = undefined;
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event: signedEvent(item, { operation: "heartbeat" }),
      ...unasserted.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_CHALLENGE_ASSERTOR_UNAVAILABLE" },
  );
  assert.deepEqual(unasserted.calls.secret, []);
  assert.deepEqual(unasserted.calls.mint, []);
  const swapped = runtimeFixture(t, item);
  const loadChallenge = swapped.dependencies.loadLifecycleChallenge;
  swapped.dependencies.loadLifecycleChallenge = async (binding) => ({
    ...await loadChallenge(binding),
    event_id: "event-swapped-by-loader",
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event: signedEvent(item, { operation: "heartbeat" }),
      ...swapped.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_CHALLENGE_BINDING_MISMATCH" },
  );
  assert.deepEqual(swapped.calls.secret, []);
  assert.deepEqual(swapped.calls.mint, []);
  for (const operation of ["heartbeat", "retire"]) {
    const fixture = runtimeFixture(t, item);
    let activationCalls = 0;
    fixture.dependencies.activationContract = {
      verifyOperatorActivation() {
        activationCalls += 1;
        throw new Error("non-registration must not verify activation artifacts");
      },
    };
    const event = signedEvent(item, { operation });
    const result = await executeOutlookDesktopLifecycleVerifier({
      event,
      ...fixture.dependencies,
    });
    const payload = JSON.parse(fixture.calls.mint[0].parameters[1]);
    assert.equal(result.lifecycle_authorization_id, event.proof.proof_id);
    assert.ok(Date.now() > Number(event.proof.expires_at_epoch_ms));
    assert.equal(payload.operation, operation);
    assert.equal(payload.activation_authorization_id, null);
    assert.equal(payload.release_authority_sha256, null);
    assert.equal(payload.expected_state_version, 2);
    assert.equal(payload.lifecycle_challenge_id, event.proof.challenge_id);
    assert.equal(payload.issued_challenge_sha256, event.proof.issued_challenge_sha256);
    assert.equal(payload.request_id, event.proof.request_id);
    assert.equal(payload.event_id, event.proof.event_id);
    assert.equal(payload.idempotency_key, event.proof.idempotency_key);
    assert.equal(
      payload.retire_intent_id,
      operation === "retire" ? event.proof.retire_intent_id : null,
    );
    assert.equal(fixture.calls.challenge.length, 1);
    assert.equal(Object.isFrozen(fixture.calls.challenge[0]), true);
    assert.equal(fixture.calls.challenge[0].challenge_id, event.proof.challenge_id);
    assert.equal(
      fixture.calls.challenge[0].issued_challenge_sha256,
      event.proof.issued_challenge_sha256,
    );
    assert.equal(fixture.calls.challenge[0].nonce_hash, item.challenge.challenge_nonce_sha256);
    assert.equal(
      fixture.calls.challenge[0].request_fingerprint,
      payload.request_fingerprint,
    );
    assert.equal(activationCalls, 0);
    assert.equal(event.activation_reference, null);
    assert.equal(event.proof.activation_receipt_sha256, null);
    assert.equal(event.proof.release_authority_sha256, null);
    assert.equal(event.proof.policy_version, null);
    assert.equal(
      event.proof.retire_intent_id !== null,
      operation === "retire",
    );
    assert.equal(
      event.proof.retire_reason !== null,
      operation === "retire",
    );
  }
});

test("byte-identical invocation reuses one payload while canonical semantics fence replay", async (t) => {
  const item = await activationFixture(t);
  const fixture = runtimeFixture(t, item);
  const event = signedEvent(item);
  const first = await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });
  const replay = await executeOutlookDesktopLifecycleVerifier({
    event,
    ...fixture.dependencies,
  });
  assert.deepEqual(replay, first);
  assert.ok(Date.now() > Number(event.proof.expires_at_epoch_ms));
  assert.equal(fixture.calls.mint.length, 2);
  assert.equal(fixture.calls.poolEnd, 2);
  assert.equal(
    fixture.calls.mint[0].parameters[1],
    fixture.calls.mint[1].parameters[1],
  );

  const noncanonical = {
    ...event,
    raw_request_body_base64: Buffer.from(JSON.stringify({
      request_id: event.proof.request_id,
      event_id: event.proof.event_id,
      idempotency_key: event.proof.idempotency_key,
    }, null, 2)).toString("base64"),
  };
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event: noncanonical,
      ...fixture.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID" },
  );
  assert.equal(fixture.calls.mint.length, 2);
  const changedSemanticProof = Object.fromEntries(
    Object.entries(event.proof).map(([key, value]) => [
      key,
      key === "request_id" || key === "idempotency_key"
        ? "request-lifecycle-register-other" : value,
    ]),
  );
  assert.notEqual(
    outlookDesktopLifecycleTransitionFingerprint({ proof: event.proof }),
    outlookDesktopLifecycleTransitionFingerprint({ proof: changedSemanticProof }),
  );
  const changed = signedEvent(item, {
    proof: changedSemanticProof,
    rawRequestBody: requestBodyFor(changedSemanticProof),
  });
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event: changed,
      ...fixture.dependencies,
    }),
    { code: "OUTLOOK_LIFECYCLE_REPLAY_CONFLICT" },
  );
  assert.equal(fixture.calls.mint.length, 2);
});

test("protected database failures expose only stable lifecycle error codes", async (t) => {
  const item = await activationFixture(t);
  for (const postgresCode of ["42501", "P0001"]) {
    const fixture = runtimeFixture(t, item);
    fixture.dependencies.transaction = async () => {
      throw Object.assign(new Error(`private database detail ${postgresCode}`), {
        postgres_code: postgresCode,
      });
    };
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({
        event: signedEvent(item),
        ...fixture.dependencies,
      }),
      (error) => error?.code === "OUTLOOK_LIFECYCLE_DATABASE_FAILED"
        && !error.message.includes("private database detail"),
    );
  }
});

test("malformed or overlong database receipts fail closed after one mint", async (t) => {
  const item = await activationFixture(t);
  const invalidResults = [
    (payload, tenantId) => ({
      outcome: "authorized",
      tenant_id: tenantId,
      lifecycle_authorization_id: payload.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("authorization binding"),
      authorized_at: payload.proof_issued_at,
      valid_until: payload.proof_expires_at,
      extra: true,
    }),
    (payload, tenantId) => ({
      outcome: "authorized",
      tenant_id: tenantId,
      lifecycle_authorization_id: payload.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("authorization binding"),
      authorized_at: payload.proof_issued_at,
      valid_until: new Date(Date.parse(payload.proof_expires_at) + 1).toISOString(),
    }),
    (payload, tenantId) => ({
      outcome: "authorized",
      tenant_id: tenantId,
      lifecycle_authorization_id: payload.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("authorization binding"),
      authorized_at: new Date(Date.parse(payload.proof_issued_at) - 30_001).toISOString(),
      valid_until: payload.proof_expires_at,
    }),
    (payload, tenantId) => ({
      outcome: "authorized",
      tenant_id: tenantId,
      lifecycle_authorization_id: payload.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("authorization binding"),
      authorized_at: payload.proof_issued_at.replace(".000Z", "Z"),
      valid_until: payload.proof_expires_at,
    }),
    (payload, tenantId) => ({
      outcome: "authorized",
      tenant_id: tenantId,
      lifecycle_authorization_id: payload.lifecycle_authorization_id,
      authorization_binding_sha256: sha256("authorization binding"),
      authorized_at: payload.proof_issued_at,
      valid_until: payload.proof_expires_at.replace(".000Z", ".0000Z"),
    }),
  ];
  for (const resultForPayload of invalidResults) {
    const fixture = runtimeFixture(t, item, { resultForPayload });
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({
        event: signedEvent(item),
        ...fixture.dependencies,
      }),
      { code: "OUTLOOK_LIFECYCLE_DATABASE_RESULT_INVALID" },
    );
    assert.equal(fixture.calls.mint.length, 1);
    assert.equal(fixture.calls.poolEnd, 1);
  }
});
