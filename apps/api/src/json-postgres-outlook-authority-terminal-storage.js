import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { programEvidenceRetainUntil } from "./program-evidence-retention.js";
import {
  MAX_TERMINAL_BYTES,
  assertExpectedBindings,
  bindingFailure,
  conflict,
  normalizeExpectedBindings,
} from "./json-postgres-outlook-authority-terminal-contract.js";
import {
  createTerminal,
  terminalBytes,
  terminalSha256,
} from "./json-postgres-outlook-authority-terminal-receipts.js";

const PREFIX = "program-approval-audit/outlook-authority-terminal";
const BUCKET = /^(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u;
const KMS_ARN = /^arn:(?:aws|aws-us-gov|aws-cn):kms:[a-z0-9-]+:(\d{12}):key\/[A-Za-z0-9-]{1,128}$/u;
const VERSION = /^[A-Za-z0-9._:+/=-]{1,512}$/u;
const BASE64_SHA256 = /^[A-Za-z0-9+/]{43}=$/u;

function text(value, label) {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    bindingFailure(`${label} is required`);
  }
  return value;
}

function storageOptions({ bucket, expectedBucketOwner, kmsKeyId,
  approvalExpiresAt, client, now }) {
  const safeBucket = text(bucket, "terminal evidence bucket");
  const owner = text(expectedBucketOwner, "terminal evidence bucket owner");
  const kms = text(kmsKeyId, "terminal evidence KMS key");
  const match = KMS_ARN.exec(kms);
  const expires = Date.parse(approvalExpiresAt ?? "");
  if (!BUCKET.test(safeBucket) || !/^\d{12}$/u.test(owner) || !match
    || match[1] !== owner || typeof approvalExpiresAt !== "string"
    || !Number.isFinite(expires)
    || new Date(expires).toISOString() !== approvalExpiresAt
    || !client || typeof client.send !== "function"
    || !Number.isSafeInteger(now) || now < 0) {
    bindingFailure("terminal evidence storage options are invalid");
  }
  return Object.freeze({ bucket: safeBucket, owner, kms });
}

function absent(error) {
  const { name, code } = error ?? {};
  return name === "NoSuchKey" || code === "NoSuchKey";
}

function preconditionFailed(error) {
  const { name, code } = error ?? {};
  return name === "PreconditionFailed" || code === "PreconditionFailed";
}

function retentionMillis(value) {
  if (!(value instanceof Date)) return Number.NaN;
  try { return Date.prototype.getTime.call(value); } catch { return Number.NaN; }
}

async function boundedBytes(body, expected) {
  if (!body) conflict("immutable terminal evidence has no body");
  if (Buffer.isBuffer(body) || ArrayBuffer.isView(body)) {
    const bytes = Buffer.from(body);
    if (bytes.byteLength === expected && expected <= MAX_TERMINAL_BYTES) return bytes;
    conflict("immutable terminal evidence size drifted");
  }
  if (typeof body.transformToByteArray === "function") {
    return boundedBytes(await body.transformToByteArray(), expected);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of body) {
    const bytes = Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > expected || size > MAX_TERMINAL_BYTES) {
      conflict("immutable terminal evidence exceeds its bounded size");
    }
    chunks.push(bytes);
  }
  return boundedBytes(Buffer.concat(chunks), expected);
}

function keyForNormalized(bindings) {
  return `${PREFIX}/${bindings.operation_binding_sha256}/${bindings.claim_sha256}.json`;
}

export function terminalKey(bindings) {
  return keyForNormalized(normalizeExpectedBindings(bindings));
}

export function terminalDigest(value) {
  return terminalSha256(createTerminal(value));
}

export async function readTerminal({ bindings, bucket, expectedBucketOwner,
  kmsKeyId, approvalExpiresAt, client, now = Date.now() } = {}) {
  const expected = normalizeExpectedBindings(bindings);
  const storage = storageOptions({ bucket, expectedBucketOwner, kmsKeyId,
    approvalExpiresAt, client, now });
  let response;
  try {
    response = await client.send(new GetObjectCommand({ Bucket: storage.bucket,
      Key: keyForNormalized(expected), ExpectedBucketOwner: storage.owner,
      ChecksumMode: "ENABLED" }));
  } catch (error) {
    if (absent(error)) return Object.freeze({ outcome: "absent" });
    throw error;
  }
  const { VersionId: versionId, ContentLength: length, ContentType: contentType,
    ServerSideEncryption: encryption, SSEKMSKeyId: storedKms,
    ObjectLockMode: lockMode, ObjectLockRetainUntilDate: retainUntilDate,
    ChecksumSHA256: storedChecksum, Body: body } = response ?? {};
  const retainedUntil = retentionMillis(retainUntilDate);
  if (typeof versionId !== "string" || !VERSION.test(versionId)
    || !Number.isSafeInteger(length) || length < 1 || length > MAX_TERMINAL_BYTES
    || contentType !== "application/json" || encryption !== "aws:kms"
    || storedKms !== storage.kms || lockMode !== "COMPLIANCE"
    || !Number.isFinite(retainedUntil) || retainedUntil <= now
    || typeof storedChecksum !== "string" || !BASE64_SHA256.test(storedChecksum)) {
    conflict("immutable terminal evidence storage governance drifted");
  }
  const bytes = await boundedBytes(body, length);
  if (createHash("sha256").update(bytes).digest("base64") !== storedChecksum) {
    conflict("immutable terminal evidence checksum drifted");
  }
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); }
  catch { conflict("immutable terminal evidence is not valid JSON"); }
  let terminal;
  try { terminal = createTerminal(parsed); }
  catch { conflict("immutable terminal evidence schema drifted"); }
  if (!bytes.equals(terminalBytes(terminal))
    || Date.parse(terminal.recorded_at) > now) {
    conflict("immutable terminal evidence is noncanonical or future-dated");
  }
  let required = Number.POSITIVE_INFINITY;
  try {
    required = programEvidenceRetainUntil({ approvalExpiresAt,
      now: Date.parse(terminal.recorded_at) }).getTime();
  } catch { conflict("immutable terminal evidence approval timing drifted"); }
  if (retainedUntil < required) conflict("immutable terminal evidence retention drifted");
  assertExpectedBindings(terminal.bindings, expected);
  return Object.freeze({ outcome: terminal.status === "PASS" ? "pass" : "partial",
    terminal, terminal_sha256: terminalSha256(terminal) });
}

export async function writeTerminal({ terminal: supplied, bindings, bucket,
  expectedBucketOwner, kmsKeyId, approvalExpiresAt, client,
  now = Date.now() } = {}) {
  const terminal = createTerminal(supplied);
  const expected = normalizeExpectedBindings(bindings);
  if (!Object.hasOwn(expected, "role_bootstrap_sha256")) {
    bindingFailure("terminal writes require the observed role bootstrap binding");
  }
  assertExpectedBindings(terminal.bindings, expected);
  const storage = storageOptions({ bucket, expectedBucketOwner, kmsKeyId,
    approvalExpiresAt, client, now });
  if (Date.parse(terminal.recorded_at) > now) {
    bindingFailure("terminal evidence cannot be future-dated");
  }
  const body = terminalBytes(terminal);
  const checksum = createHash("sha256").update(body).digest("base64");
  try {
    const response = await client.send(new PutObjectCommand({
      Bucket: storage.bucket, Key: keyForNormalized(expected), Body: body,
      ContentType: "application/json", ExpectedBucketOwner: storage.owner,
      IfNoneMatch: "*", ChecksumAlgorithm: "SHA256", ChecksumSHA256: checksum,
      ServerSideEncryption: "aws:kms", SSEKMSKeyId: storage.kms,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: programEvidenceRetainUntil({
        approvalExpiresAt, now }),
    }));
    const versionId = response?.VersionId;
    if (typeof versionId !== "string" || !VERSION.test(versionId)) {
      conflict("immutable terminal evidence write has no version identity");
    }
    return Object.freeze({ outcome: "written", terminal,
      terminal_sha256: terminalSha256(terminal) });
  } catch (error) {
    let existing;
    try {
      existing = await readTerminal({ bindings: expected,
        bucket: storage.bucket, expectedBucketOwner: storage.owner,
        kmsKeyId: storage.kms, approvalExpiresAt, client, now });
    } catch (readError) {
      if (preconditionFailed(error)) {
        conflict("immutable terminal evidence conflicts with an existing object");
      }
      throw readError;
    }
    if (existing.outcome === "absent") {
      if (preconditionFailed(error)) {
        conflict("immutable terminal evidence disappeared after a write conflict");
      }
      throw error;
    }
    if (canonicalizeJson(existing.terminal) !== canonicalizeJson(terminal)) {
      conflict("immutable terminal evidence conflicts with existing bytes");
    }
    return Object.freeze({ outcome: "existing", terminal: existing.terminal,
      terminal_sha256: existing.terminal_sha256 });
  }
}
