import assert from "node:assert/strict";
import test from "node:test";

import {
  claimJsonPostgresProgramInvocation,
} from "../src/json-postgres-program-inputs.js";
import {
  boundAuthorization,
  environment,
  firstStoredClaim,
  memoryS3,
  NOW,
  operationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";

function claim(client, event, authorization) {
  return claimJsonPostgresProgramInvocation({
    client, event, authorization, env: environment(), now: NOW,
  });
}

test("V7 claim rejects unverified external trust facts before S3 access", async () => {
  for (const mutate of [
    (approval) => { approval.trust_root_verified = false; },
    (approval) => { approval.signature_sha256 = {}; },
    (approval) => { approval.registry_serial = "7"; },
    (approval) => { approval.trust_anchor_sha256 = "wrong"; },
    (approval) => { approval.registry_signature_sha256 = null; },
    (approval) => { approval.external_authority_binding_sha256 = "0"; },
    (approval) => { approval.signed_at = "2026-08-17T00:06:00.001Z"; },
    (approval) => { approval.expires_at = "2026-08-17T00:20:00.000Z"; },
  ]) {
    const client = memoryS3();
    const event = operationEvent();
    const authorized = boundAuthorization(event);
    const approval = { ...authorized.approval };
    mutate(approval);
    await assert.rejects(
      claim(client, event, { ...authorized, approval }),
      (error) => error?.code ===
        "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
    );
    assert.deepEqual(client.operations, []);
  }
});

test("V7 durable request and receipt close over fixed-root trust facts", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const outcome = await claim(client, event, boundAuthorization(event));
  const request = JSON.parse(firstStoredClaim(client).body).request;
  assert.deepEqual(Object.keys(request).sort(), [
    "action", "approval_id", "approval_receipt_sha256",
    "approval_signature_sha256", "attempt_ref", "authorization_input_sha256",
    "database_target_receipt", "database_target_receipt_sha256", "expires_at",
    "external_authority_binding_sha256", "key_id", "mode", "operation",
    "operation_binding_sha256", "packet_sha256", "phase",
    "program_input_kms_key_ref", "registry_serial", "registry_sha256",
    "registry_signature_sha256", "schema_version", "source_sha", "source_tree",
    "stage", "trust_anchor_sha256",
  ].sort());
  assert.deepEqual(Object.keys(outcome.receipt).sort(), [
    "approval_receipt_sha256", "approval_signature_sha256",
    "claim_ref_sha256", "claim_sha256", "claimed_at",
    "database_target_receipt", "database_target_receipt_sha256", "expires_at",
    "external_authority_binding_sha256", "operation_binding_sha256",
    "program_input_kms_key_ref", "registry_serial", "registry_sha256",
    "registry_signature_sha256", "request_sha256", "trust_anchor_sha256",
  ].sort());
});
