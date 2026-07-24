import { createHash } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION = "law-firm-os.immutable-program-input-locator.v1";

const LOCATOR_KEYS = Object.freeze([
  "schema_version",
  "bucket",
  "key",
  "version_id",
  "expected_bucket_owner",
  "sha256",
  "byte_size",
]);
const SHA256 = /^[0-9a-f]{64}$/u;
const AWS_ACCOUNT = /^\d{12}$/u;
const BUCKET = /^(?!xn--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 1024 || /[\u0000-\u001f\u007f]/u.test(text)) {
    fail("LAWOS_PROGRAM_INPUT_LOCATOR", `${label} is invalid`);
  }
  return text;
}

export function normalizeImmutableProgramInputLocator(locator = {}, {
  bucket,
  expectedBucketOwner,
} = {}) {
  if (!locator || typeof locator !== "object" || Array.isArray(locator)) {
    fail("LAWOS_PROGRAM_INPUT_LOCATOR", "immutable program input locator must be an object");
  }
  const extras = Object.keys(locator).filter((key) => !LOCATOR_KEYS.includes(key));
  if (extras.length > 0 || locator.schema_version !== IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION) {
    fail("LAWOS_PROGRAM_INPUT_LOCATOR", "immutable program input locator schema is invalid");
  }
  const normalized = Object.freeze({
    schema_version: IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION,
    bucket: requiredText(locator.bucket, "program input bucket"),
    key: requiredText(locator.key, "program input key"),
    version_id: requiredText(locator.version_id, "program input version"),
    expected_bucket_owner: requiredText(locator.expected_bucket_owner, "program input bucket owner"),
    sha256: String(locator.sha256 ?? "").toLowerCase(),
    byte_size: Number(locator.byte_size),
  });
  if (!BUCKET.test(normalized.bucket)
    || normalized.key.startsWith("/")
    || normalized.key.split("/").includes("..")
    || !AWS_ACCOUNT.test(normalized.expected_bucket_owner)
    || !SHA256.test(normalized.sha256)
    || !Number.isSafeInteger(normalized.byte_size)
    || normalized.byte_size < 1
    || normalized.bucket !== bucket
    || normalized.expected_bucket_owner !== expectedBucketOwner) {
    fail("LAWOS_PROGRAM_INPUT_LOCATOR", "immutable program input locator drifted from the approved target");
  }
  return normalized;
}

async function bodyToBuffer(body, maxBytes) {
  if (!body) fail("LAWOS_PROGRAM_INPUT_BODY", "immutable program input has no body");
  if (typeof body.transformToByteArray === "function") {
    const bytes = Buffer.from(await body.transformToByteArray());
    if (bytes.byteLength > maxBytes) fail("LAWOS_PROGRAM_INPUT_SIZE", "immutable program input exceeds its size limit");
    return bytes;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of body) {
    const bytes = Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maxBytes) fail("LAWOS_PROGRAM_INPUT_SIZE", "immutable program input exceeds its size limit");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

export async function readImmutableProgramInput({
  locator,
  client,
  expectedBucket,
  expectedBucketOwner,
  expectedKmsKeyArn,
  maxBytes,
  now = Date.now(),
} = {}) {
  if (!client || typeof client.send !== "function") throw new TypeError("S3 client is required");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError("maxBytes must be a positive integer");
  const normalized = normalizeImmutableProgramInputLocator(locator, {
    bucket: expectedBucket,
    expectedBucketOwner,
  });
  if (normalized.byte_size > maxBytes) fail("LAWOS_PROGRAM_INPUT_SIZE", "immutable program input exceeds its size limit");
  const response = await client.send(new GetObjectCommand({
    Bucket: normalized.bucket,
    Key: normalized.key,
    VersionId: normalized.version_id,
    ExpectedBucketOwner: normalized.expected_bucket_owner,
    ChecksumMode: "ENABLED",
  }));
  if (response.VersionId !== normalized.version_id
    || Number(response.ContentLength) !== normalized.byte_size
    || response.ServerSideEncryption !== "aws:kms"
    || response.SSEKMSKeyId !== expectedKmsKeyArn
    || !["GOVERNANCE", "COMPLIANCE"].includes(response.ObjectLockMode)
    || !Number.isFinite(Date.parse(response.ObjectLockRetainUntilDate))
    || Date.parse(response.ObjectLockRetainUntilDate) <= now) {
    fail("LAWOS_PROGRAM_INPUT_GOVERNANCE", "immutable program input storage governance drifted");
  }
  const bytes = await bodyToBuffer(response.Body, maxBytes);
  if (bytes.byteLength !== normalized.byte_size
    || createHash("sha256").update(bytes).digest("hex") !== normalized.sha256) {
    fail("LAWOS_PROGRAM_INPUT_DIGEST", "immutable program input content drifted");
  }
  return bytes;
}

export async function readImmutableProgramJson(options = {}) {
  const bytes = await readImmutableProgramInput(options);
  try {
    return JSON.parse(bytes);
  } catch {
    fail("LAWOS_PROGRAM_INPUT_JSON", "immutable program input is not valid JSON");
  }
}
