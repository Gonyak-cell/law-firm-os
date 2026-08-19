import assert from "node:assert/strict";
import test from "node:test";

import {
  createOutlookDesktopAssignmentOutboxPayload,
  parseOutlookDesktopAssignmentOutboxPayload,
} from "../src/outlook-desktop-assignment-model.js";
import {
  createPostgresOutlookDesktopAssignmentOutbox,
} from "../src/postgres-outlook-desktop-assignment-outbox.js";

const INTENT = Object.freeze({
  tenant_id: "tenant-outlook-assignment-a",
  user_id: "user-outlook-assignment-a",
  entra_subject_id: "subject-outlook-assignment-a",
  provider_generation: 4,
  desired_assigned: true,
  provider_intent_sha256: "c".repeat(64),
});

test("assignment outbox payload is exact, deterministic, and opaque", () => {
  const left = createOutlookDesktopAssignmentOutboxPayload(INTENT);
  const right = createOutlookDesktopAssignmentOutboxPayload({ ...INTENT });
  assert.deepEqual(left, right);
  assert.deepEqual(Object.keys(left).sort(), [
    "action",
    "desired_assigned",
    "entra_subject_id",
    "operation_id",
    "provider_generation",
    "provider_intent_sha256",
    "schema_version",
    "tenant_id",
    "user_id",
  ]);
  assert.equal(left.action, "add");
  assert.match(left.operation_id, /^outlook_assignment_[a-f0-9]{64}$/u);
  assert.deepEqual(parseOutlookDesktopAssignmentOutboxPayload(left), left);
  assert.deepEqual(
    parseOutlookDesktopAssignmentOutboxPayload(
      Object.fromEntries(Object.entries(left).reverse()),
    ),
    left,
  );
  assert.doesNotMatch(JSON.stringify(left), /@|email|token|secret|credential/iu);
});

test("assignment outbox parser rejects changed intent and sensitive or extra data", () => {
  const payload = createOutlookDesktopAssignmentOutboxPayload(INTENT);
  for (const changed of [
    { ...payload, action: "remove" },
    { ...payload, provider_generation: 3 },
    { ...payload, operation_id: `outlook_assignment_${"0".repeat(64)}` },
    { ...payload, access_token: "secret" },
    { ...payload, user_id: "jwsuh@amic.kr" },
  ]) {
    assert.throws(
      () => parseOutlookDesktopAssignmentOutboxPayload(changed),
      /assignment/u,
    );
  }
});

test("assignment outbox rejects application clocks and loose runtime options", () => {
  const base = {
    pool: { connect() {} },
    tenant_id: "tenant-outlook-assignment-a",
  };
  assert.equal(
    createPostgresOutlookDesktopAssignmentOutbox(base).authority,
    "postgres-outlook-desktop-assignment-outbox",
  );
  assert.throws(
    () => createPostgresOutlookDesktopAssignmentOutbox({
      ...base,
      clock: () => new Date(),
    }),
    /unknown option|clock/u,
  );
});
