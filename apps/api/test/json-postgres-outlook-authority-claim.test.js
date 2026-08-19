import assert from "node:assert/strict";
import test from "node:test";
import { claimJsonPostgresProgramInvocation } from "../src/json-postgres-program-inputs.js";
import {
  ACCOUNT,
  boundAuthorization,
  environment,
  firstStoredClaim,
  memoryS3,
  mutateStoredClaim,
  NOW,
  operationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";
async function writeClaim({
  client,
  event,
  authorization,
  env = environment(),
  now = NOW,
}) {
  return claimJsonPostgresProgramInvocation({
    event,
    authorization,
    env,
    client,
    now,
  });
}

test("Outlook claim rejects event and binding drift before S3 access", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const approved = boundAuthorization(event);
  await assert.rejects(
    writeClaim({ client, event: { ...event, extra: "forbidden" }, authorization: approved }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
  );
  await assert.rejects(
    writeClaim({
      client,
      event,
      authorization: { ...approved, operation_binding_sha256: "0".repeat(64) },
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
  );
  assert.deepEqual(client.operations, []);
});

test("Outlook claim writes its closed durable request and result", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const claim = await writeClaim({
    client,
    event,
    authorization: boundAuthorization(event),
  });
  const { receipt } = claim;
  const stored = firstStoredClaim(client);
  const envelope = JSON.parse(stored.body);
  assert.equal(stored.input.Key.endsWith(`${receipt.claim_ref_sha256}.json`), true);
  assert.equal(stored.input.ExpectedBucketOwner, ACCOUNT);
  assert.equal(stored.input.IfNoneMatch, "*");
  assert.equal(stored.input.ServerSideEncryption, "aws:kms");
  assert.equal(stored.input.ObjectLockMode, "COMPLIANCE");
  assert.deepEqual(Object.keys(envelope).sort(), [
    "request", "result", "schema_version",
  ]);
  assert.equal(envelope.request.stage, "cut-009");
  assert.equal(envelope.request.operation, "outlook-authority-bootstrap-001-007");
  assert.equal(envelope.request.operation_binding_sha256, receipt.operation_binding_sha256);
  assert.equal(
    envelope.request.database_target_receipt_sha256,
    receipt.database_target_receipt_sha256,
  );
  assert.equal(envelope.request.program_input_kms_key_ref, stored.input.SSEKMSKeyId);
  assert.equal(receipt.program_input_kms_key_ref, stored.input.SSEKMSKeyId);
  assert.equal(envelope.request.approval_signature_sha256, receipt.approval_signature_sha256);
  assert.equal(envelope.request.registry_serial, receipt.registry_serial);
  assert.equal(envelope.request.trust_anchor_sha256, receipt.trust_anchor_sha256);
  assert.equal(envelope.request.registry_signature_sha256, receipt.registry_signature_sha256);
  assert.equal(envelope.request.external_authority_binding_sha256, receipt.external_authority_binding_sha256);
  assert.equal(claim.outcome, "claimed");
  assert.equal(claim.claim_write_attempted, true);
  assert.equal(claim.claim_write_committed, true);
});

test("Outlook claim rejects runtime KMS identity drift before S3 access", async () => {
  const client = memoryS3();
  const event = operationEvent();
  await assert.rejects(
    writeClaim({
      client,
      event,
      authorization: boundAuthorization(event),
      env: {
        ...environment(),
        LAWOS_PROGRAM_INPUT_KMS_KEY_ARN:
          "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-1111-1111-1111-111111111111",
      },
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
  );
  assert.deepEqual(client.operations, []);
});

test("Outlook claim returns the same receipt for an exact replay", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const approved = boundAuthorization(event);
  const first = await writeClaim({ client, event, authorization: approved });
  const replay = await writeClaim({
    client, event, authorization: approved, now: NOW + 1_000,
  });
  assert.deepEqual(Object.keys(first).sort(), [
    "claim_write_attempted", "claim_write_committed", "outcome", "receipt",
  ]);
  assert.equal(first.outcome, "claimed");
  assert.equal(first.claim_write_attempted, true);
  assert.equal(first.claim_write_committed, true);
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.claim_write_attempted, true);
  assert.equal(replay.claim_write_committed, false);
  assert.deepEqual(replay.receipt, first.receipt);
  assert.match(first.receipt.operation_binding_sha256, /^[0-9a-f]{64}$/u);
  assert.match(first.receipt.request_sha256, /^[0-9a-f]{64}$/u);
  assert.match(first.receipt.claim_sha256, /^[0-9a-f]{64}$/u);
});

test("Outlook claim conflicts when the replay attempt changes", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const approved = boundAuthorization(event);
  await writeClaim({ client, event, authorization: approved });
  await assert.rejects(
    writeClaim({
      client,
      event: { ...event, attempt_ref: "changed-replay-attempt" },
      authorization: approved,
      now: NOW + 1_000,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
  );
});

test("Outlook claim conflicts when an authorization fingerprint changes", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const approved = boundAuthorization(event);
  await writeClaim({ client, event, authorization: approved });
  await assert.rejects(
    writeClaim({
      client,
      event,
      authorization: {
        ...approved,
        approval: { ...approved.approval, receipt_sha256: "4".repeat(64) },
      },
      now: NOW + 1_000,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
  );
  await assert.rejects(
    writeClaim({
      client,
      event,
      authorization: {
        ...approved,
        approval: { ...approved.approval, registry_serial: 8 },
      },
      now: NOW + 1_000,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
  );
});

for (const [label, claimedAt] of [
  ["numeric zero", 0],
  ["coercion object", { toString: null, valueOf: null }],
  ["noncanonical string", "2026-08-17T00:00:00Z"],
  ["invalid string", "not-a-timestamp"],
  ["expired instant", "2026-08-18T00:00:00.000Z"],
]) {
  test(`Outlook claim rejects stored ${label} claimed_at with its typed conflict`, async () => {
    const client = memoryS3();
    const event = operationEvent();
    const approved = boundAuthorization(event);
    await writeClaim({ client, event, authorization: approved });
    mutateStoredClaim(client, (claim) => {
      claim.result.claimed_at = claimedAt;
    });
    await assert.rejects(
      writeClaim({ client, event, authorization: approved, now: NOW + 1_000 }),
      (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
    );
  });
}

for (const [label, transform] of [
  ["missing version", (metadata) => ({ ...metadata, VersionId: null })],
  ["coercive length", (metadata) => ({
    ...metadata, ContentLength: String(metadata.ContentLength),
  })],
  ["content type drift", (metadata) => ({ ...metadata, ContentType: "text/plain" })],
  ["encryption drift", (metadata) => ({
    ...metadata, ServerSideEncryption: "AES256",
  })],
  ["KMS drift", (metadata) => ({ ...metadata, SSEKMSKeyId: "alias/wrong" })],
  ["lock mode drift", (metadata) => ({ ...metadata, ObjectLockMode: "GOVERNANCE" })],
  ["coercive retention", (metadata) => ({
    ...metadata,
    ObjectLockRetainUntilDate: metadata.ObjectLockRetainUntilDate.toISOString(),
  })],
]) {
  test(`Outlook claim rejects replay ${label} governance metadata`, async () => {
    const client = memoryS3();
    const event = operationEvent();
    const approved = boundAuthorization(event);
    await writeClaim({ client, event, authorization: approved });
    client.setReplayMetadata(transform);
    await assert.rejects(
      writeClaim({ client, event, authorization: approved, now: NOW + 1_000 }),
      (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
    );
  });
}
