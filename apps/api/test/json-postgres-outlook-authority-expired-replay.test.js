import assert from "node:assert/strict";
import test from "node:test";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { claimJsonPostgresProgramInvocation } from "../src/json-postgres-program-inputs.js";
import {
  boundAuthorization,
  environment,
  memoryS3,
  NOW,
  operationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";

const AFTER_EXPIRY = Date.parse("2026-08-18T00:00:01.000Z");

function claim({ client, event, authorization, now }) {
  return claimJsonPostgresProgramInvocation({
    client,
    event,
    authorization,
    env: environment(),
    now,
  });
}

test("expired exact claim replay is GET-only and returns the stored receipt", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const approved = boundAuthorization(event);
  const fresh = await claim({ client, event, authorization: approved, now: NOW });
  const beforeReplay = client.operations.length;
  const replay = await claim({
    client,
    event,
    authorization: approved,
    now: AFTER_EXPIRY,
  });
  const replayOperations = client.operations.slice(beforeReplay);
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.claim_write_attempted, false);
  assert.equal(replay.claim_write_committed, false);
  assert.deepEqual(replay.receipt, fresh.receipt);
  assert.equal(replayOperations.length, 1);
  assert.equal(replayOperations[0] instanceof GetObjectCommand, true);
  assert.equal(replayOperations.some((command) => command instanceof PutObjectCommand), false);
});

test("expired authorization with no stored claim fails typed and performs zero writes", async () => {
  const client = memoryS3();
  const event = operationEvent();
  await assert.rejects(
    claim({
      client,
      event,
      authorization: boundAuthorization(event),
      now: AFTER_EXPIRY,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
  );
  assert.equal(client.operations.length, 1);
  assert.equal(client.operations[0] instanceof GetObjectCommand, true);
  assert.equal(client.operations.some((command) => command instanceof PutObjectCommand), false);
});

test("expired changed authorization conflicts after GET and performs zero writes", async () => {
  const client = memoryS3();
  const event = operationEvent();
  const approved = boundAuthorization(event);
  await claim({ client, event, authorization: approved, now: NOW });
  const beforeReplay = client.operations.length;
  await assert.rejects(
    claim({
      client,
      event,
      authorization: {
        ...approved,
        approval: { ...approved.approval, receipt_sha256: "4".repeat(64) },
      },
      now: AFTER_EXPIRY,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
  );
  const replayOperations = client.operations.slice(beforeReplay);
  assert.equal(replayOperations.length, 1);
  assert.equal(replayOperations[0] instanceof GetObjectCommand, true);
  assert.equal(replayOperations.some((command) => command instanceof PutObjectCommand), false);
});
