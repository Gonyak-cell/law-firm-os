import assert from "node:assert/strict";
import { sign } from "node:crypto";
import { existsSync, readFileSync as readText } from "node:fs";
import test, { after } from "node:test";

import {
  OUTLOOK_DESKTOP_LIFECYCLE_CONTROL_PORT_SCHEMA,
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
  assertOutlookDesktopLifecycleControlPort,
  createOutlookDesktopLifecycleControlPort,
  createOutlookDesktopLifecycleProofTranscript,
  executeOutlookDesktopLifecycleVerifier,
} from "../src/outlook-desktop-lifecycle-verifier.js";
import {
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ENABLED_ENV,
  createOutlookDesktopLifecycleVerifierHandler,
} from "../src/outlook-desktop-lifecycle-verifier-lambda.js";
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

test("closed lifecycle control port forwards only its three injected services", async () => {
  const inputs = {
    verify: Object.freeze({ exact: "verify" }),
    issue: Object.freeze({ exact: "issue" }),
    consume: Object.freeze({ exact: "consume" }),
  };
  const results = {
    verify: Object.freeze({ exact: "verified" }),
    issue: Object.freeze({ exact: "issued" }),
    consume: Object.freeze({ exact: "consumed" }),
  };
  const calls = [];
  const port = createOutlookDesktopLifecycleControlPort({
    verifyLifecycleTransition(input) {
      calls.push(["verify", input]);
      return results.verify;
    },
    issueLifecycleChallenge(input) {
      calls.push(["issue", input]);
      return results.issue;
    },
    consumeLifecycleTransition(input) {
      calls.push(["consume", input]);
      return results.consume;
    },
  });
  assert.equal(Object.isFrozen(port), true);
  assert.deepEqual(Object.keys(port), [
    "schema_version",
    "verifyLifecycleTransition",
    "issueLifecycleChallenge",
    "consumeLifecycleTransition",
  ]);
  assert.equal(port.schema_version, OUTLOOK_DESKTOP_LIFECYCLE_CONTROL_PORT_SCHEMA);
  assert.equal(
    port.schema_version,
    "law-firm-os.outlook-desktop-lifecycle-control-port.v1",
  );
  assert.ok(Object.values(Object.getOwnPropertyDescriptors(port)).every(
    (descriptor) => "value" in descriptor && descriptor.get === undefined,
  ));
  assert.equal(assertOutlookDesktopLifecycleControlPort(port), port);
  assert.equal(Object.isFrozen(port.verifyLifecycleTransition), true);
  assert.equal(Object.isFrozen(port.issueLifecycleChallenge), true);
  assert.equal(Object.isFrozen(port.consumeLifecycleTransition), true);
  assert.equal(await port.verifyLifecycleTransition(inputs.verify), results.verify);
  assert.equal(await port.issueLifecycleChallenge(inputs.issue), results.issue);
  assert.equal(await port.consumeLifecycleTransition(inputs.consume), results.consume);
  assert.deepEqual(calls, [
    ["verify", inputs.verify],
    ["issue", inputs.issue],
    ["consume", inputs.consume],
  ]);

  for (const dependencies of [
    undefined,
    {},
    { verifyLifecycleTransition() {} },
  ]) {
    assert.throws(
      () => createOutlookDesktopLifecycleControlPort(dependencies),
      { code: "OUTLOOK_LIFECYCLE_CONTROL_PORT_CONFIGURATION_INVALID", status: 500 },
    );
  }
  assert.throws(
    () => createOutlookDesktopLifecycleControlPort({
      verifyLifecycleTransition() {},
      credential: "forbidden",
    }),
    { code: "OUTLOOK_LIFECYCLE_CONTROL_PORT_CONFIGURATION_INVALID", status: 500 },
  );
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "verifyLifecycleTransition", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return () => {};
    },
  });
  assert.throws(
    () => createOutlookDesktopLifecycleControlPort(accessor),
    { code: "OUTLOOK_LIFECYCLE_CONTROL_PORT_CONFIGURATION_INVALID", status: 500 },
  );
  assert.equal(getterCalls, 0);
  const forged = Object.freeze({
    schema_version: OUTLOOK_DESKTOP_LIFECYCLE_CONTROL_PORT_SCHEMA,
    verifyLifecycleTransition() {},
    issueLifecycleChallenge() {},
    consumeLifecycleTransition() {},
  });
  assert.throws(
    () => assertOutlookDesktopLifecycleControlPort(forged),
    { name: "TypeError" },
  );
});

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

function eventFor(item) {
  const proof = {
    operation: "register",
    tenant_id: item.principal.lawos_tenant_id,
    user_id: item.principal.lawos_user_id,
    entra_subject_id: item.principal.entra_subject,
    device_id: item.request.candidate_device.continuity_key_fingerprint_sha256,
    installation_id: "odi_boundaryabcdefghijklmnop",
    release_authority_sha256: hash(Buffer.from("release authority boundary")),
    local_measurement_evidence_sha256: localMeasurementFor(item),
    policy_version: item.pilotPolicy.policy_revision,
    expected_state_version: 1,
    request_id: "request-lifecycle-register-boundary-0001",
    event_id: "event-lifecycle-register-boundary-0001",
    idempotency_key: "request-lifecycle-register-boundary-0001",
    challenge_nonce_base64url: item.challenge.challenge_nonce_base64url,
    challenge_id: item.challenge.activation_id,
    issued_challenge_sha256: hash(canonicalBytes(item.challenge)),
    activation_receipt_sha256: hash(item.operator_receipt_bytes),
    proof_id: "lifecycle-register-boundary-0001",
    issued_at_epoch_ms: String(ACTIVATION_NOW),
    expires_at_epoch_ms: String(ACTIVATION_NOW + 60_000),
    retire_intent_id: null,
    retire_reason: null,
    device_public_key_spki_base64:
      item.request.candidate_device.continuity_public_key_spki,
  };
  const rawRequestBody = Buffer.from(JSON.stringify({
    request_id: proof.request_id,
    event_id: proof.event_id,
    idempotency_key: proof.idempotency_key,
    local_measurement_evidence_sha256: proof.local_measurement_evidence_sha256,
  }));
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
    activation_reference: proof.challenge_id,
    proof,
    proof_signature_base64: sign(
      null,
      createOutlookDesktopLifecycleProofTranscript({ proof, rawRequestBody }),
      item.keys.device.privateKey,
    ).toString("base64"),
  };
}

function reservationFor(item) {
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
  return {
    async assertActivationReservation({ activation_contract: activationContract, reservation }) {
      const verifiedActivation = activationContract.verifyOperatorActivation(reservation);
      return Object.freeze({
        mode: "exact_replay",
        state: "authorized",
        activation_reference: item.challenge.activation_id,
        installation_id: "odi_boundaryabcdefghijklmnop",
        reservation: Object.freeze({
          activation_replay_identity: Object.freeze({
            replay_identity_sha256:
              verifiedActivation.single_use_consumption.replay_identity_sha256,
          }),
        }),
        verified_activation: verifiedActivation,
      });
    },
    assertActivationReservationProofBinding({
      reservation_authority: reservationAuthority,
      verified_proof: verifiedProof,
    }) {
      return Object.freeze({
        activation_reference: reservationAuthority.activation_reference,
        installation_id: reservationAuthority.installation_id,
        mode: reservationAuthority.mode,
        verified_proof: verifiedProof,
      });
    },
  };
}

test("handler is disabled by default and accepts only the literal true flag", async () => {
  for (const value of [undefined, "false", "1", "TRUE"]) {
    let calls = 0;
    const handler = createOutlookDesktopLifecycleVerifierHandler({
      env: value === undefined ? {} : {
        [OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ENABLED_ENV]: value,
      },
      async execute() {
        calls += 1;
      },
    });
    await assert.rejects(handler({}), {
      code: "OUTLOOK_LIFECYCLE_RUNTIME_DISABLED",
    });
    assert.equal(calls, 0);
  }
  const env = { [OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ENABLED_ENV]: "true" };
  const event = { exact: true };
  const handler = createOutlookDesktopLifecycleVerifierHandler({
    env,
    async execute(input) {
      assert.deepEqual(input, { event, env });
      return { outcome: "authorized" };
    },
  });
  assert.deepEqual(await handler(event), { outcome: "authorized" });
});

test("secret role, shape, length, material, and reference drift fail before pool creation", async (t) => {
  const item = await activationFixture(t);
  const event = eventFor(item);
  const baseEnv = {
    AWS_REGION: "ap-northeast-2",
    LAWOS_DATABASE_HOST: "lawos.example.internal",
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_DATABASE_PORT: "5432",
    LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID: "db-secret",
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "tenant-secret",
  };
  let callsWithoutLoader = 0;
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event,
      env: baseEnv,
      activationContract: activationContractFor(item),
      ...activationAssertionsFor(item),
      async resolveSecret() {
        callsWithoutLoader += 1;
      },
    }),
    {
      code: "OUTLOOK_LIFECYCLE_ACTIVATION_RESERVATION_UNAVAILABLE",
      status: 503,
    },
  );
  assert.equal(callsWithoutLoader, 0);
  let secretGetterCalls = 0;
  const accessorSecret = {
    username: "lawos_outlook_lifecycle_verifier",
    configuration_state: "ready",
    password: "database-password-material-000000000000000000000",
  };
  Object.defineProperty(accessorSecret, "password", {
    configurable: true,
    enumerable: true,
    get() {
      secretGetterCalls += 1;
      return "database-password-material-000000000000000000000";
    },
  });
  for (const databaseSecret of [
    accessorSecret,
    {
      username: "lawos_outlook_lifecycle_verifier",
      configuration_state: "pending_admin_bootstrap",
      password: "database-password-material-000000000000000000000",
    },
    {
      username: "lawos_app",
      configuration_state: "ready",
      password: "database-password-material-000000000000000000000",
    },
    {
      username: "lawos_outlook_lifecycle_verifier",
      configuration_state: "ready",
      password: "database-password-material-000000000000000000000",
      tenant_context_secret: "forbidden-combined-material-0000000000",
    },
    {
      username: "lawos_outlook_lifecycle_verifier",
      configuration_state: "ready",
      password: "too-short",
    },
    {
      username: "lawos_outlook_lifecycle_verifier",
      configuration_state: "ready",
      password: "tenant-context-material-000000000000000000000000",
    },
  ]) {
    let poolCalls = 0;
    await assert.rejects(
      executeOutlookDesktopLifecycleVerifier({
        event,
        env: baseEnv,
        activationContract: activationContractFor(item),
        ...activationAssertionsFor(item),
        async loadActivationReservation() {
          return reservationFor(item);
        },
        async resolveSecret({ secretId }) {
          return secretId === "db-secret" ? databaseSecret : {
            schema_version: "law-firm-os.tenant-context-secret.v1",
            tenant_context_secret: "tenant-context-material-000000000000000000000000",
          };
        },
        createPool() {
          poolCalls += 1;
        },
      }),
      (error) => new Set([
        "OUTLOOK_LIFECYCLE_DATABASE_SECRET_INVALID",
        "OUTLOOK_LIFECYCLE_SECRET_AUTHORITY_INVALID",
      ]).has(error?.code),
    );
    assert.equal(poolCalls, 0);
  }
  assert.equal(secretGetterCalls, 0);

  let secretCalls = 0;
  await assert.rejects(
    executeOutlookDesktopLifecycleVerifier({
      event,
      env: {
        ...baseEnv,
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "db-secret",
      },
      activationContract: activationContractFor(item),
      ...activationAssertionsFor(item),
      async loadActivationReservation() {
        return reservationFor(item);
      },
      async resolveSecret() {
        secretCalls += 1;
      },
    }),
    { code: "OUTLOOK_LIFECYCLE_SECRET_AUTHORITY_INVALID" },
  );
  assert.equal(secretCalls, 0);
});

test("isolated source has one mint entrypoint and no consume or provider authority", () => {
  const runtime = readText(
    new URL("../src/outlook-desktop-lifecycle-verifier.js", import.meta.url),
    "utf8",
  );
  const handler = readText(
    new URL("../src/outlook-desktop-lifecycle-verifier-lambda.js", import.meta.url),
    "utf8",
  );
  const contract = readText(
    new URL(
      "../../../packages/email-dms/src/outlook-desktop-lifecycle-proof.js",
      import.meta.url,
    ),
    "utf8",
  );
  const isolatedSource = `${runtime}\n${handler}\n${contract}`;
  assert.equal(
    (runtime.match(/mint_outlook_desktop_lifecycle_verifier_receipt/gu) ?? []).length,
    1,
  );
  assert.doesNotMatch(isolatedSource, /consume_outlook_desktop_activation_authorization/iu);
  assert.doesNotMatch(
    isolatedSource,
    /authorize_outlook_desktop_activation|lawos_outlook_control_operator/iu,
  );
  assert.doesNotMatch(isolatedSource, /LAWOS_M365|MicrosoftGraph|graph\.microsoft|provider[_-]mutation/iu);
  assert.doesNotMatch(handler, /FunctionUrl|APIGateway|server\.js|lambda\.js/iu);
  assert.match(
    runtime,
    /packages\/email-dms\/src\/outlook-desktop-lifecycle-proof\.js/u,
  );
  assert.equal(
    existsSync(new URL("../src/outlook-desktop-lifecycle-verifier-contract.js", import.meta.url)),
    false,
  );
  assert.match(runtime, /LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID/u);
  assert.match(runtime, /LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID/u);
});
