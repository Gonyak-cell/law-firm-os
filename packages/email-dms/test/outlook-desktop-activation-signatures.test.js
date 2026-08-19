import assert from "node:assert/strict";
import { sign } from "node:crypto";
import test, { after } from "node:test";

import { verifyOutlookDesktopReleaseTicket } from "../src/outlook-desktop-release-ticket-verifier.js";
import {
  ACTIVATION_NOW,
  activationFixture,
  canonicalBytes,
  hash,
  receiptBindings,
  signedTicket,
} from "./helpers/outlook-desktop-activation-contract-fixture.js";
import { clone, hasCode, useActivationTestEnvironment } from "./helpers/outlook-desktop-activation-test-utils.js";

after(useActivationTestEnvironment());

function activationRequest(challenge) {
  return {
    activation_binding_sha256: challenge.activation_binding_sha256,
    activation_id: challenge.activation_id,
    activation_mode: challenge.activation_mode,
    approved_release: challenge.approved_release,
    authenticated_principal: challenge.authenticated_principal,
    candidate_device: challenge.candidate_device,
    challenge_nonce_base64url: challenge.challenge_nonce_base64url,
    hardware_key_attested: false,
    local_measurement_evidence_sha256: challenge.local_measurement_evidence_sha256,
    mdm_attested: false,
    pilot_policy: challenge.pilot_policy,
    remote_app_attested: false,
  };
}

function switchingBuffer(initial, replacement) {
  assert.equal(initial.length, replacement.length);
  const bytes = Buffer.from(initial);
  Object.defineProperty(bytes, "equals", {
    value(expected) {
      const matches = Buffer.prototype.equals.call(this, expected);
      replacement.copy(this);
      return matches;
    },
  });
  Object.defineProperty(bytes, "valueOf", { value() { throw new Error("caller-owned Buffer.valueOf must not be invoked"); } });
  return bytes;
}

function sharedCopy(bytes) {
  const copy = Buffer.from(new SharedArrayBuffer(bytes.length));
  Uint8Array.prototype.set.call(copy, bytes);
  return copy;
}

test("shared release-ticket verifier rejects caller-supplied parsed fields", async (t) => {
  const item = await activationFixture(t);
  assert.throws(
    () => verifyOutlookDesktopReleaseTicket({
      fail(code, message, details = {}) {
        throw Object.assign(new Error(message), { code, details });
      },
      now: ACTIVATION_NOW,
      parsed: {
        expiresAt: Date.parse(item.releaseTicket.expires_at),
        issuedAt: Date.parse(item.releaseTicket.issued_at),
        ticket: { ...item.releaseTicket, app_id: "com.example.unsigned" },
      },
      registryTrust: item.registry,
      signatureBytes: item.release_ticket_signature_bytes,
      ticketBytes: item.release_ticket_bytes,
    }),
    hasCode("RELEASE_TICKET_SCHEMA_INVALID"),
  );
});

test("mutable caller buffers cannot substitute signed ticket bytes", async (t) => {
  const item = await activationFixture(t);
  const forgedTicketBytes = canonicalBytes({
    ...item.releaseTicket,
    approval_sha256: "f".repeat(64),
  });
  assert.throws(
    () => verifyOutlookDesktopReleaseTicket({
      fail(code, message, details = {}) {
        throw Object.assign(new Error(message), { code, details });
      },
      now: ACTIVATION_NOW,
      registryTrust: item.registry,
      signatureBytes: item.release_ticket_signature_bytes,
      ticketBytes: switchingBuffer(forgedTicketBytes, item.release_ticket_bytes),
    }),
    hasCode("RELEASE_TICKET_SIGNATURE_INVALID"),
  );
});

test("mutable caller buffers cannot substitute signed receipt bytes", async (t) => {
  const item = await activationFixture(t);
  const approvedRelease = {
    ...item.approvedRelease,
    macos_technical_evidence_sha256: "f".repeat(64),
  };
  const challenge = item.contract.issueChallenge({
    ...item.issue_input,
    approved_release: approvedRelease,
  });
  const request = activationRequest(challenge);
  const receiptBytes = canonicalBytes({
    ...item.receipt,
    activation_binding_sha256: challenge.activation_binding_sha256,
    bindings: receiptBindings(request),
    challenge_nonce_sha256: challenge.challenge_nonce_sha256,
  });
  assert.throws(
    () => item.contract.verifyOperatorActivation({
      ...item.verification_input,
      activation_request: request,
      issued_challenge: challenge,
      operator_receipt_bytes: switchingBuffer(receiptBytes, item.operator_receipt_bytes),
    }),
    hasCode("OUTLOOK_ACTIVATION_OPERATOR_SIGNATURE_INVALID"),
  );
});

test("detached signatures are copied before caller byte hooks can replace them", async (t) => {
  const item = await activationFixture(t);
  for (const [bytesField, signatureField, expectedCode] of [
    ["release_ticket_bytes", "release_ticket_signature_bytes", "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNATURE_INVALID"],
    ["operator_receipt_bytes", "operator_receipt_signature_bytes", "OUTLOOK_ACTIVATION_OPERATOR_SIGNATURE_INVALID"],
  ]) {
    const signature = Buffer.alloc(64);
    const bytes = Buffer.from(item[bytesField]);
    Object.defineProperty(bytes, "equals", {
      value(expected) {
        const matches = Buffer.prototype.equals.call(this, expected);
        item[signatureField].copy(signature);
        return matches;
      },
    });
    assert.throws(
      () => item.contract.verifyOperatorActivation({
        ...item.verification_input,
        [bytesField]: bytes,
        [signatureField]: signature,
      }),
      hasCode(expectedCode),
    );
  }
});

test("SharedArrayBuffer inputs are snapshotted before deterministic caller mutation", async (t) => {
  const item = await activationFixture(t);
  const input = { ...item.verification_input };
  for (const field of ["release_ticket_bytes", "release_ticket_signature_bytes",
    "operator_receipt_bytes", "operator_receipt_signature_bytes"]) {
    input[field] = sharedCopy(input[field]);
    Object.defineProperties(input[field], {
      byteLength: { value: 1_000_000 },
      valueOf: { value() { throw new Error("caller-owned Buffer.valueOf must not be invoked"); } },
      [Symbol.iterator]: { value() { throw new Error("caller-owned iterator must not be invoked"); } },
    });
  }
  for (const field of ["release_ticket_bytes", "operator_receipt_bytes"]) {
    Object.defineProperty(input[field], "equals", {
      value() {
        throw new Error("caller-owned Buffer.equals must not be invoked");
      },
    });
  }
  Object.defineProperty(input, "issued_challenge", {
    enumerable: true,
    get() {
      for (const field of ["release_ticket_bytes", "release_ticket_signature_bytes",
        "operator_receipt_bytes", "operator_receipt_signature_bytes"]) input[field].fill(0);
      return item.verification_input.issued_challenge;
    },
  });
  assert.equal(item.contract.verifyOperatorActivation(input).valid, true);
  assert.equal(["release_ticket_bytes", "release_ticket_signature_bytes",
    "operator_receipt_bytes", "operator_receipt_signature_bytes"]
    .every((field) => input[field].every((byte) => byte === 0)), true);
});

test("copied digests cannot replace exact raw ticket and signature bytes", async (t) => {
  const item = await activationFixture(t);
  for (const patch of [
    { release_ticket_bytes: item.approvedRelease.release_ticket_sha256 },
    { release_ticket_bytes: new Proxy(item.release_ticket_bytes, {}) },
    { release_ticket_bytes: Buffer.alloc(16_385) },
    { release_ticket_signature_bytes: item.approvedRelease.release_ticket_signature_sha256 },
    { operator_receipt_bytes: hash(item.operator_receipt_bytes) },
    { operator_receipt_bytes: Buffer.alloc(32_769) },
    { operator_receipt_signature_bytes: hash(item.operator_receipt_signature_bytes) },
  ]) {
    assert.throws(
      () => item.contract.verifyOperatorActivation({ ...item.verification_input, ...patch }),
      (error) => /_BYTES_REQUIRED$|_SIGNATURE_FORMAT$/u.test(error?.code ?? ""),
    );
  }
});

test("altered ticket or receipt bytes and raw signatures fail closed", async (t) => {
  const item = await activationFixture(t);
  const ticketSignature = Buffer.from(item.release_ticket_signature_bytes);
  ticketSignature[0] ^= 0xff;
  const receiptSignature = Buffer.from(item.operator_receipt_signature_bytes);
  receiptSignature[0] ^= 0xff;
  for (const patch of [
    { release_ticket_bytes: Buffer.concat([item.release_ticket_bytes, Buffer.from(" ")]) },
    { release_ticket_signature_bytes: ticketSignature },
    { operator_receipt_bytes: Buffer.concat([item.operator_receipt_bytes, Buffer.from(" ")]) },
    { operator_receipt_signature_bytes: receiptSignature },
  ]) {
    assert.throws(
      () => item.contract.verifyOperatorActivation({ ...item.verification_input, ...patch }),
      (error) => /CANONICAL|SIGNATURE/u.test(error?.code ?? ""),
    );
  }
});

test("release ticket canonical bytes, signer scope, and approved evidence remain exact", async (t) => {
  const item = await activationFixture(t);
  const wrongArch = clone(item.releaseTicket);
  wrongArch.arch = "x64";
  assert.throws(
    () => item.contract.verifyOperatorActivation({
      ...item.verification_input,
      ...signedTicket(item, wrongArch),
    }),
    hasCode("OUTLOOK_ACTIVATION_RELEASE_TICKET_INVALID"),
  );
  const wrongArtifact = clone(item.releaseTicket);
  wrongArtifact.inner_artifact_sha256 = "f".repeat(64);
  assert.throws(
    () => item.contract.verifyOperatorActivation({
      ...item.verification_input,
      ...signedTicket(item, wrongArtifact),
    }),
    hasCode("OUTLOOK_ACTIVATION_RELEASE_TICKET_SCOPE_MISMATCH"),
  );
  assert.throws(
    () => item.contract.verifyOperatorActivation({
      ...item.verification_input,
      ...signedTicket(item, {
        ...item.releaseTicket,
        inner_artifact_bytes: 536_870_913,
      }),
    }),
    hasCode("OUTLOOK_ACTIVATION_RELEASE_TICKET_INVALID"),
  );
  assert.throws(
    () => item.contract.verifyOperatorActivation({
      ...item.verification_input,
      release_ticket_signature_bytes: sign(
        null,
        item.release_ticket_bytes,
        item.keys.operator.privateKey,
      ),
    }),
    hasCode("OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNATURE_INVALID"),
  );
});
