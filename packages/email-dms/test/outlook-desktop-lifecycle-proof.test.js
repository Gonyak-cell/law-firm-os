import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  OUTLOOK_DESKTOP_LIFECYCLE_COMMAND_KEYS,
  OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS,
  createOutlookDesktopLifecycleProof,
  createOutlookDesktopLifecycleProofTranscript,
  createOutlookDesktopLifecycleSignedTransition,
  outlookDesktopLifecycleTransitionFingerprint,
  parseOutlookDesktopLifecycleTransitionCommand,
  signOutlookDesktopLifecycleProof,
  verifyOutlookDesktopLifecycleProof,
} from "../src/outlook-desktop-lifecycle-proof.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function fixture(operation = "register") {
  const keys = generateKeyPairSync("ed25519");
  const spki = keys.publicKey.export({ format: "der", type: "spki" });
  const requestId = `request-${operation}-1`;
  const proof = {
    operation,
    tenant_id: "tenant.lifecycle",
    user_id: "user.lifecycle",
    entra_subject_id: "entra.lifecycle",
    device_id: sha256(spki),
    installation_id: "odi_abcdefghijklmnopqrstuvwx",
    release_authority_sha256: operation === "register" ? sha256("release") : null,
    local_measurement_evidence_sha256:
      operation === "register" ? sha256("local measurement") : null,
    policy_version: operation === "register" ? "policy.1" : null,
    expected_state_version: operation === "register" ? 1 : 2,
    request_id: requestId,
    event_id: `event-${operation}-1`,
    idempotency_key: operation === "register"
      ? requestId : `idempotency-${operation}-1`,
    challenge_nonce_base64url: Buffer.alloc(32, 0x41).toString("base64url"),
    challenge_id: operation === "register"
      ? `oda_${"a".repeat(24)}` : `olc_${"b".repeat(32)}`,
    issued_challenge_sha256: sha256(`issued challenge ${operation}`),
    activation_receipt_sha256: operation === "register" ? sha256("receipt") : null,
    proof_id: `proof-${operation}-1`,
    issued_at_epoch_ms: "1786924800000",
    expires_at_epoch_ms: "1786924830000",
    retire_intent_id: operation === "retire" ? `ori_${"c".repeat(32)}` : null,
    retire_reason: operation === "retire" ? "device_disconnect" : null,
    device_public_key_spki_base64: spki.toString("base64"),
  };
  const command = {
    request_id: proof.request_id,
    event_id: proof.event_id,
    idempotency_key: proof.idempotency_key,
    ...(operation === "register" ? {
      local_measurement_evidence_sha256: proof.local_measurement_evidence_sha256,
    } : {}),
    ...(operation === "retire" ? { retire_reason: proof.retire_reason } : {}),
  };
  return {
    command,
    keys,
    proof,
    rawRequestBody: Buffer.from(JSON.stringify(command)),
  };
}

test("shared lifecycle protocol signs one canonical transition command", () => {
  assert.deepEqual(OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS, [
    "operation", "tenant_id", "user_id", "entra_subject_id", "device_id",
    "installation_id", "release_authority_sha256",
    "local_measurement_evidence_sha256", "policy_version", "expected_state_version",
    "request_id", "event_id", "idempotency_key", "challenge_nonce_base64url",
    "challenge_id", "issued_challenge_sha256", "activation_receipt_sha256", "proof_id",
    "issued_at_epoch_ms", "expires_at_epoch_ms", "retire_intent_id", "retire_reason",
    "device_public_key_spki_base64",
  ]);
  assert.equal(Object.isFrozen(OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS), true);
  assert.deepEqual(OUTLOOK_DESKTOP_LIFECYCLE_COMMAND_KEYS, {
    register: [
      "request_id", "event_id", "idempotency_key", "local_measurement_evidence_sha256",
    ],
    heartbeat: ["request_id", "event_id", "idempotency_key"],
    retire: ["request_id", "event_id", "idempotency_key", "retire_reason"],
  });
  assert.equal(Object.isFrozen(OUTLOOK_DESKTOP_LIFECYCLE_COMMAND_KEYS), true);
  assert.equal(Object.isFrozen(OUTLOOK_DESKTOP_LIFECYCLE_COMMAND_KEYS.register), true);
  const item = fixture();
  const signed = createOutlookDesktopLifecycleSignedTransition({
    privateKey: item.keys.privateKey,
    proof: Object.fromEntries(Object.entries(item.proof).reverse()),
  });
  assert.deepEqual(Object.keys(signed), [
    "proof", "proof_signature_base64", "raw_request_body_base64",
  ]);
  assert.deepEqual(Object.keys(signed.proof), Object.keys(item.proof));
  assert.deepEqual(
    Buffer.from(signed.raw_request_body_base64, "base64"),
    item.rawRequestBody,
  );
  assert.deepEqual(
    parseOutlookDesktopLifecycleTransitionCommand({
      proof: item.proof,
      rawRequestBody: item.rawRequestBody,
    }),
    item.command,
  );
  const signature = signOutlookDesktopLifecycleProof({
    privateKey: item.keys.privateKey,
    proof: item.proof,
    rawRequestBody: item.rawRequestBody,
  });
  const verified = verifyOutlookDesktopLifecycleProof({
    proof: item.proof,
    proofSignatureBase64: signed.proof_signature_base64,
    rawRequestBody: item.rawRequestBody,
  });
  assert.deepEqual(Object.keys(verified), [
    "expectedStateVersion", "expiresAt", "issuedAt", "nonce", "publicKey",
    "nonceBindingSha256", "nonceSha256", "rawRequestSha256", "signatureSha256",
    "transcriptSha256",
  ]);
  assert.equal(verified.nonceSha256, sha256(Buffer.alloc(32, 0x41)));
  assert.notEqual(verified.nonceBindingSha256, verified.nonceSha256);
  assert.equal(signature, signed.proof_signature_base64);
  assert.equal(
    verified.transcriptSha256,
    sha256(createOutlookDesktopLifecycleProofTranscript({
      proof: item.proof,
      rawRequestBody: item.rawRequestBody,
    })),
  );
  assert.match(
    outlookDesktopLifecycleTransitionFingerprint({ proof: item.proof }),
    /^[a-f0-9]{64}$/u,
  );
  assert.notEqual(
    outlookDesktopLifecycleTransitionFingerprint({ proof: item.proof }),
    outlookDesktopLifecycleTransitionFingerprint({
      proof: {
        ...item.proof,
        local_measurement_evidence_sha256: sha256("other local measurement"),
      },
    }),
  );
  assert.equal(
    outlookDesktopLifecycleTransitionFingerprint({ proof: item.proof }),
    outlookDesktopLifecycleTransitionFingerprint({
      proof: {
        ...item.proof,
        challenge_id: `oda_${"d".repeat(24)}`,
      },
    }),
  );
  assert.equal(
    outlookDesktopLifecycleTransitionFingerprint({ proof: item.proof }),
    outlookDesktopLifecycleTransitionFingerprint({
      proof: {
        ...item.proof,
        issued_challenge_sha256: sha256("other persisted challenge"),
      },
    }),
  );
  assert.equal(
    outlookDesktopLifecycleTransitionFingerprint({ proof: item.proof }),
    outlookDesktopLifecycleTransitionFingerprint({
      proof: {
        ...item.proof,
        challenge_nonce_base64url: Buffer.alloc(32, 0x42).toString("base64url"),
        proof_id: "proof-register-2",
        issued_at_epoch_ms: "1786924800100",
        expires_at_epoch_ms: "1786924830100",
      },
    }),
  );
});

test("shared parser rejects noncanonical, mismatched, and expanded command bytes", () => {
  const item = fixture();
  const invalidBodies = [
    Buffer.from(JSON.stringify(item.command, null, 2)),
    Buffer.from(JSON.stringify({
      event_id: item.command.event_id,
      request_id: item.command.request_id,
      idempotency_key: item.command.idempotency_key,
    })),
    Buffer.from(JSON.stringify({ ...item.command, extra: true })),
    Buffer.from(JSON.stringify({ ...item.command, request_id: "request-other" })),
    Buffer.from(JSON.stringify({ ...item.command, event_id: "event-other" })),
    Buffer.from(JSON.stringify({ ...item.command, idempotency_key: "idempotency-other" })),
    Buffer.from(JSON.stringify({ ...item.command, retire_reason: "device_disconnect" })),
    Buffer.from([0xff]),
  ];
  for (const rawRequestBody of invalidBodies) {
    assert.throws(
      () => parseOutlookDesktopLifecycleTransitionCommand({
        proof: item.proof,
        rawRequestBody,
      }),
      (error) => error?.code === "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
    );
  }
});

test("retire alone carries the exact closed retire reason", () => {
  const retire = fixture("retire");
  assert.deepEqual(
    parseOutlookDesktopLifecycleTransitionCommand({
      proof: retire.proof,
      rawRequestBody: retire.rawRequestBody,
    }),
    retire.command,
  );
  for (const command of [
    {
      request_id: retire.proof.request_id,
      event_id: retire.proof.event_id,
      idempotency_key: retire.proof.idempotency_key,
    },
    { ...retire.command, retire_reason: "account_removed" },
  ]) {
    assert.throws(
      () => parseOutlookDesktopLifecycleTransitionCommand({
        proof: retire.proof,
        rawRequestBody: Buffer.from(JSON.stringify(command)),
      }),
      (error) => error?.code === "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
    );
  }
});

test("operation-specific server authority fields reject cross-flow values", () => {
  const register = fixture("register");
  const heartbeat = fixture("heartbeat");
  const retire = fixture("retire");
  const invalidProofs = [
    { ...register.proof, expected_state_version: "1" },
    { ...register.proof, expected_state_version: 0 },
    { ...register.proof, expected_state_version: 1.5 },
    { ...register.proof, expected_state_version: Number.MAX_SAFE_INTEGER + 1 },
    { ...register.proof, policy_version: null },
    { ...register.proof, challenge_id: heartbeat.proof.challenge_id },
    { ...heartbeat.proof, policy_version: "policy.1" },
    {
      ...Object.fromEntries(Object.entries(heartbeat.proof).filter(
        ([key]) => key !== "challenge_nonce_base64url",
      )),
      server_nonce_base64url: heartbeat.proof.challenge_nonce_base64url,
    },
    {
      ...Object.fromEntries(Object.entries(register.proof).filter(
        ([key]) => key !== "activation_receipt_sha256",
      )),
      activation_receipt_id: register.proof.activation_receipt_sha256,
    },
    { ...heartbeat.proof, challenge_id: register.proof.challenge_id },
    { ...heartbeat.proof, issued_challenge_sha256: null },
    { ...heartbeat.proof, issued_challenge_sha256: "A".repeat(64) },
    { ...heartbeat.proof, retire_intent_id: retire.proof.retire_intent_id },
    { ...retire.proof, challenge_id: `olc_${"A".repeat(32)}` },
    { ...retire.proof, retire_intent_id: `ori_${"A".repeat(32)}` },
  ];
  for (const proof of invalidProofs) {
    assert.throws(
      () => createOutlookDesktopLifecycleProofTranscript({
        proof,
        rawRequestBody: fixture(proof.operation).rawRequestBody,
      }),
      (error) => String(error?.code ?? "").startsWith("OUTLOOK_LIFECYCLE_PROOF_"),
    );
  }
  const mismatchedRegister = {
    ...register.proof,
    idempotency_key: "different-register-idempotency",
  };
  assert.throws(
    () => createOutlookDesktopLifecycleProofTranscript({
      proof: mismatchedRegister,
      rawRequestBody: Buffer.from(JSON.stringify({
        ...register.command,
        idempotency_key: mismatchedRegister.idempotency_key,
      })),
    }),
    { code: "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID" },
  );
});

test("proof string fields reject numeric aliases before transcript canonicalization", () => {
  const register = fixture("register");
  const heartbeat = fixture("heartbeat");
  const invalidProofs = [
    { ...register.proof, tenant_id: 1 },
    { ...register.proof, user_id: 1 },
    { ...register.proof, entra_subject_id: 1 },
    { ...register.proof, policy_version: 1 },
    { ...register.proof, proof_id: 1 },
    { ...heartbeat.proof, request_id: 1 },
    { ...heartbeat.proof, event_id: 1 },
    { ...heartbeat.proof, idempotency_key: 1 },
  ];
  for (const proof of invalidProofs) {
    assert.throws(
      () => createOutlookDesktopLifecycleProof(proof),
      (error) => String(error?.code ?? "").startsWith("OUTLOOK_LIFECYCLE_PROOF_"),
    );
  }
});

test("proof normalization rejects accessors without invoking caller code", () => {
  const item = fixture();
  const accessorProof = { ...item.proof };
  let getterCalls = 0;
  Object.defineProperty(accessorProof, "tenant_id", {
    configurable: true,
    enumerable: true,
    get() {
      getterCalls += 1;
      return item.proof.tenant_id;
    },
  });
  assert.throws(
    () => createOutlookDesktopLifecycleProof(accessorProof),
    { code: "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID" },
  );
  assert.equal(getterCalls, 0);
});
