import assert from "node:assert/strict";
import test from "node:test";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { programEvidenceRetainUntil } from "../src/program-evidence-retention.js";
import {
  claimJsonPostgresOutlookAuthorityOperation,
} from "../src/json-postgres-outlook-authority-claim.js";
import {
  createOutlookAuthorityClaimRef,
  createOutlookAuthorityClaimRequestSha256,
  OUTLOOK_AUTHORITY_CLAIM_RESULT_VERSION,
  OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION,
  OUTLOOK_AUTHORITY_LEGACY_CLAIM_VERSION,
} from "../src/json-postgres-outlook-authority-claim-readback.js";
import {
  createJsonPostgresOutlookAuthorityOperationBinding,
} from "../src/json-postgres-outlook-authority-operation.js";
import {
  authorization,
  boundAuthorization,
  environment,
  KMS,
  legacyAuthorization,
  memoryS3,
  NOW,
  operationEvent,
  REGION,
} from "./json-postgres-outlook-authority-fixtures.js";

function context(base = authorization()) {
  const event = operationEvent({ packet_sha256: base.packet.packet_sha256 });
  const authorized = boundAuthorization(event, base);
  return {
    event,
    authorization: authorized,
    operationBinding: createJsonPostgresOutlookAuthorityOperationBinding({
      event,
      authorization: authorized,
      env: environment(),
    }),
  };
}

function invoke(client, value, now = NOW) {
  return claimJsonPostgresOutlookAuthorityOperation({
    ...value,
    client,
    env: environment(),
    now,
  });
}

function seedLegacyClaim(client, value) {
  const { event, authorization: approved, operationBinding } = value;
  const request = {
    schema_version: OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION,
    approval_id: approved.approval.approval_id,
    key_id: approved.approval.key_id,
    action: event.action,
    phase: event.phase,
    mode: event.mode,
    stage: event.stage,
    operation: event.operation,
    attempt_ref: event.attempt_ref,
    source_sha: approved.exact.sourceSha,
    source_tree: approved.exact.sourceTree,
    packet_sha256: approved.packet.packet_sha256,
    operation_binding_sha256: operationBinding.operation_binding_sha256,
    approval_receipt_sha256: approved.approval.receipt_sha256,
    registry_sha256: approved.approval.registry_sha256,
    authorization_input_sha256: approved.authorization_input_sha256,
    program_input_kms_key_ref: approved.packet.target.program_input_kms_key_ref,
    expires_at: approved.approval.expires_at,
  };
  const claimRef = createOutlookAuthorityClaimRef(
    operationBinding.operation_binding_sha256,
    { legacy: true },
  );
  const claim = {
    schema_version: OUTLOOK_AUTHORITY_LEGACY_CLAIM_VERSION,
    request,
    result: {
      schema_version: OUTLOOK_AUTHORITY_CLAIM_RESULT_VERSION,
      status: "CLAIMED",
      claim_ref_sha256: claimRef,
      request_sha256: createOutlookAuthorityClaimRequestSha256(request),
      claimed_at: new Date(NOW).toISOString(),
      expires_at: approved.approval.expires_at,
    },
  };
  const body = Buffer.from(`${canonicalizeJson(claim)}\n`);
  const key = `program-approval-audit/${REGION}/outlook-authority/${claimRef}.json`;
  client.objects.set(key, {
    body,
    input: {
      ContentType: "application/json",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: KMS,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: programEvidenceRetainUntil({
        approvalExpiresAt: approved.approval.expires_at,
        now: NOW,
      }),
    },
  });
}

test("V7 target expiry permits only exact GET-only claim replay", async () => {
  const client = memoryS3();
  const value = context();
  const first = await invoke(client, value);
  client.operations.length = 0;
  const replay = await invoke(client, value, NOW + 15 * 60 * 1_000 + 1);

  assert.equal(first.outcome, "claimed");
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.claim_write_attempted, false);
  assert.equal(replay.claim_write_committed, false);
  assert.equal(replay.receipt.database_target_receipt_sha256,
    value.operationBinding.database_target_receipt_sha256);
  assert.equal(client.operations.length, 1);
  assert.equal(client.operations[0] instanceof GetObjectCommand, true);
});

test("V7 expired target with no claim fails closed without a Put", async () => {
  const client = memoryS3();
  await assert.rejects(
    invoke(client, context(), NOW + 15 * 60 * 1_000 + 1),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT"
      && error.claim_failure?.claim_write_attempted === false
      && error.claim_failure?.claim_write_committed === false,
  );
  assert.equal(client.operations.length, 1);
  assert.equal(client.operations.some((item) => item instanceof PutObjectCommand), false);
});

test("V6 is GET-only and returns only an exact historical receipt", async () => {
  const value = context(legacyAuthorization());
  const missingClient = memoryS3();
  await assert.rejects(
    invoke(missingClient, value),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
  );
  assert.equal(missingClient.operations.length, 1);
  assert.equal(missingClient.operations[0] instanceof GetObjectCommand, true);

  const replayClient = memoryS3();
  seedLegacyClaim(replayClient, value);
  const replay = await invoke(replayClient, value);
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.claim_write_attempted, false);
  assert.equal(replay.claim_write_committed, false);
  assert.equal("database_target_receipt" in replay.receipt, false);
  assert.equal("database_target_receipt_sha256" in replay.receipt, false);
  assert.equal(replayClient.operations.length, 1);
  assert.equal(replayClient.operations[0] instanceof GetObjectCommand, true);
});
