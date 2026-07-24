import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION,
  readImmutableProgramInput,
  readImmutableProgramJson,
} from "../src/immutable-program-input.js";

const OWNER = "770880870480";
const BUCKET = "lawos-prod-program-input-770880870480";
const KMS = "arn:aws:kms:ap-northeast-2:770880870480:key/00000000-0000-0000-0000-000000000000";
const BYTES = Buffer.from('{"approved":true}');

function locator(overrides = {}) {
  return {
    schema_version: IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION,
    bucket: BUCKET,
    key: "approved/run-001/input.json",
    version_id: "version-001",
    expected_bucket_owner: OWNER,
    sha256: createHash("sha256").update(BYTES).digest("hex"),
    byte_size: BYTES.byteLength,
    ...overrides,
  };
}

function client(overrides = {}) {
  return {
    async send(command) {
      assert.equal(command.input.VersionId, "version-001");
      return {
        VersionId: "version-001",
        ContentLength: BYTES.byteLength,
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: KMS,
        ObjectLockMode: "COMPLIANCE",
        ObjectLockRetainUntilDate: new Date("2027-07-23T00:00:00.000Z"),
        Body: {
          async transformToByteArray() {
            return BYTES;
          },
        },
        ...overrides,
      };
    },
  };
}

test("immutable program input requires exact version, KMS, retention, owner, size and digest", async () => {
  const result = await readImmutableProgramJson({
    locator: locator(),
    client: client(),
    expectedBucket: BUCKET,
    expectedBucketOwner: OWNER,
    expectedKmsKeyArn: KMS,
    maxBytes: 1024,
    now: Date.parse("2026-07-23T00:00:00.000Z"),
  });
  assert.deepEqual(result, { approved: true });

  for (const overrides of [
    { VersionId: "other-version" },
    { ServerSideEncryption: "AES256" },
    { SSEKMSKeyId: "other-key" },
    { ObjectLockMode: undefined },
    { ObjectLockRetainUntilDate: new Date("2026-07-22T00:00:00.000Z") },
  ]) {
    await assert.rejects(
      readImmutableProgramInput({
        locator: locator(),
        client: client(overrides),
        expectedBucket: BUCKET,
        expectedBucketOwner: OWNER,
        expectedKmsKeyArn: KMS,
        maxBytes: 1024,
        now: Date.parse("2026-07-23T00:00:00.000Z"),
      }),
      (error) => error?.code === "LAWOS_PROGRAM_INPUT_GOVERNANCE",
    );
  }
});

test("immutable program input rejects target drift, mutable locators and digest drift", async () => {
  for (const invalid of [
    locator({ bucket: "other-bucket" }),
    locator({ version_id: "" }),
    locator({ key: "../escape.json" }),
  ]) {
    await assert.rejects(
      readImmutableProgramInput({
        locator: invalid,
        client: client(),
        expectedBucket: BUCKET,
        expectedBucketOwner: OWNER,
        expectedKmsKeyArn: KMS,
        maxBytes: 1024,
      }),
      (error) => error?.code === "LAWOS_PROGRAM_INPUT_LOCATOR",
    );
  }
  await assert.rejects(
    readImmutableProgramInput({
      locator: locator({ sha256: "f".repeat(64) }),
      client: client(),
      expectedBucket: BUCKET,
      expectedBucketOwner: OWNER,
      expectedKmsKeyArn: KMS,
      maxBytes: 1024,
      now: Date.parse("2026-07-23T00:00:00.000Z"),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_INPUT_DIGEST",
  );
});
