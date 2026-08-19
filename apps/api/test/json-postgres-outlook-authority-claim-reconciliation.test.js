import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import {
  claimJsonPostgresProgramInvocation,
} from "../src/json-postgres-program-inputs.js";
import {
  createOutlookAuthorityClaimFailure,
} from "../src/json-postgres-outlook-authority-claim-store.js";
import {
  boundAuthorization,
  BUCKET,
  DATABASE_SECRET,
  environment,
  KMS,
  memoryS3,
  NOW,
  operationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";

const FAILURE_KEYS = Object.freeze([
  "claim_write_attempted", "claim_write_commit_ambiguous",
  "claim_write_committed", "expected_claim_receipt", "outcome", "safe_code",
]);
const EXPECTED_KEYS = Object.freeze([
  "approval_receipt_sha256", "claim_ref_sha256", "claim_sha256",
  "claimed_at", "database_target_receipt_sha256", "expires_at",
  "operation_binding_sha256", "program_input_kms_key_ref_sha256",
  "registry_sha256", "request_sha256",
]);

function invoke(client, { env = environment() } = {}) {
  const event = operationEvent();
  return claimJsonPostgresProgramInvocation({
    event,
    authorization: boundAuthorization(event),
    env,
    client,
    now: NOW,
  });
}

function serviceError(name = "ServiceUnavailable") {
  return Object.assign(new Error("untrusted provider text"), { name });
}

function clientFailing({ putError, getError }) {
  const operations = [];
  return {
    operations,
    async send(command) {
      operations.push(command);
      if (command instanceof PutObjectCommand) throw putError;
      if (command instanceof GetObjectCommand) throw getError;
      throw new Error("unexpected operation");
    },
  };
}

function assertFailure(error, {
  code,
  attempted,
  committed,
  ambiguous,
  expected,
}) {
  assert.equal(error?.code, code);
  const failure = error?.claim_failure;
  assert.deepEqual(Object.keys(failure).sort(), [...FAILURE_KEYS].sort());
  assert.equal(Object.isFrozen(failure), true);
  assert.equal(failure.outcome, "blocked");
  assert.equal(failure.claim_write_attempted, attempted);
  assert.equal(failure.claim_write_committed, committed);
  assert.equal(failure.claim_write_commit_ambiguous, ambiguous);
  assert.equal(failure.safe_code, code);
  if (!expected) {
    assert.equal(failure.expected_claim_receipt, null);
    return true;
  }
  const receipt = failure.expected_claim_receipt;
  assert.deepEqual(Object.keys(receipt).sort(), [...EXPECTED_KEYS].sort());
  assert.equal(Object.isFrozen(receipt), true);
  for (const key of [
    "claim_sha256", "claim_ref_sha256", "request_sha256",
    "operation_binding_sha256", "database_target_receipt_sha256",
    "approval_receipt_sha256", "registry_sha256",
  ]) assert.match(receipt[key], /^[0-9a-f]{64}$/u);
  assert.equal(
    receipt.program_input_kms_key_ref_sha256,
    createHash("sha256").update(KMS).digest("hex"),
  );
  for (const key of ["claimed_at", "expires_at"]) {
    assert.equal(new Date(Date.parse(receipt[key])).toISOString(), receipt[key]);
  }
  const serialized = JSON.stringify(failure);
  for (const leaked of [
    BUCKET,
    DATABASE_SECRET,
    "lawos-production-postgres.fixture123",
    "untrusted provider text",
    "program-approval-audit/",
    "password",
    KMS,
  ]) assert.equal(serialized.includes(leaked), false);
  return true;
}

test("claim reconciles a committed Put whose response was lost", async () => {
  const stored = memoryS3();
  const client = {
    ...stored,
    async send(command) {
      if (command instanceof PutObjectCommand) {
        await stored.send(command);
        throw serviceError();
      }
      return stored.send(command);
    },
  };

  const outcome = await invoke(client);
  assert.equal(outcome.outcome, "claimed");
  assert.equal(outcome.claim_write_attempted, true);
  assert.equal(outcome.claim_write_committed, true);
  assert.equal(Object.isFrozen(outcome.receipt.database_target_receipt), true);
  assert.equal(
    Object.isFrozen(
      outcome.receipt.database_target_receipt.readback_source.operations,
    ),
    true,
  );
  assert.equal(stored.operations.length, 2);
  assert.equal(stored.operations[0] instanceof PutObjectCommand, true);
  assert.equal(stored.operations[1] instanceof GetObjectCommand, true);
});

test("claim proves a failed Put absent with safe immutable identity", async () => {
  const missing = Object.assign(new Error("missing"), {
    name: "NoSuchKey",
    $metadata: { httpStatusCode: 404 },
  });
  const client = clientFailing({ putError: serviceError(), getError: missing });
  await assert.rejects(
    invoke(client),
    (error) => assertFailure(error, {
      code: "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
      attempted: true,
      committed: false,
      ambiguous: false,
      expected: true,
    }),
  );
  assert.equal(client.operations.length, 2);
});

test("claim reports only commit-unknown when reconciliation is inconclusive", async () => {
  const client = clientFailing({
    putError: serviceError(),
    getError: serviceError("InternalError"),
  });
  await assert.rejects(
    invoke(client),
    (error) => assertFailure(error, {
      code: "LAWOS_OUTLOOK_AUTHORIZATION_CLAIM_COMMIT_UNKNOWN",
      attempted: true,
      committed: null,
      ambiguous: true,
      expected: true,
    }),
  );
  assert.equal(client.operations.length, 2);
});

test("412 replay read failure is proven non-commit and non-ambiguous", async () => {
  const precondition = Object.assign(new Error("exists"), {
    name: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 },
  });
  const client = clientFailing({
    putError: precondition,
    getError: serviceError(),
  });
  await assert.rejects(
    invoke(client),
    (error) => assertFailure(error, {
      code: "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_RECONCILIATION",
      attempted: true,
      committed: false,
      ambiguous: false,
      expected: true,
    }),
  );
  assert.equal(client.operations.length, 2);
});

test("pre-Put binding failure has zero access and no proposed identity", async () => {
  const client = memoryS3();
  await assert.rejects(
    invoke(client, {
      env: {
        ...environment(),
        LAWOS_PROGRAM_INPUT_KMS_KEY_ARN:
          "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-1111-1111-1111-111111111111",
      },
    }),
    (error) => assertFailure(error, {
      code: "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
      attempted: false,
      committed: false,
      ambiguous: false,
      expected: false,
    }),
  );
  assert.deepEqual(client.operations, []);
});

test("claim failure sanitizer strips unclosed codes and expected receipts", () => {
  const error = createOutlookAuthorityClaimFailure("unsafe-message", {
    attempted: true,
    committed: true,
    ambiguous: true,
    expectedClaimReceipt: {
      endpoint_host: "do-not-leak.example",
      master_secret_arn: DATABASE_SECRET,
    },
  });
  assert.deepEqual(Object.keys(error.claim_failure).sort(), [...FAILURE_KEYS].sort());
  assert.equal(error.code, "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_FAILURE");
  assert.equal(error.claim_failure.claim_write_attempted, true);
  assert.equal(error.claim_failure.claim_write_committed, null);
  assert.equal(error.claim_failure.claim_write_commit_ambiguous, true);
  assert.equal(error.claim_failure.expected_claim_receipt, null);
  assert.equal(JSON.stringify(error.claim_failure).includes(DATABASE_SECRET), false);
});
