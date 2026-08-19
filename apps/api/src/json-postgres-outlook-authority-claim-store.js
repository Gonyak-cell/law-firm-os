import { createHash } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  OUTLOOK_AUTHORITY_CLAIM_MAX_BYTES,
  createOutlookAuthorityClaimReceipt,
  readOutlookAuthorityClaimBytes,
  validateOutlookAuthorityStoredClaim,
} from "./json-postgres-outlook-authority-claim-readback.js";

const SAFE_CODE = /^LAWOS_[A-Z0-9_]{1,120}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const EXPECTED_RECEIPT_KEYS = Object.freeze([
  "claim_sha256", "claim_ref_sha256", "request_sha256",
  "operation_binding_sha256", "program_input_kms_key_ref_sha256",
  "database_target_receipt_sha256", "approval_receipt_sha256",
  "registry_sha256", "claimed_at", "expires_at",
]);

function canonicalInstant(value) {
  if (typeof value !== "string") return Number.NaN;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : Number.NaN;
}

function normalizeExpectedClaimReceipt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== EXPECTED_RECEIPT_KEYS.length
    || EXPECTED_RECEIPT_KEYS.some((key) => !Object.hasOwn(value, key))) {
    return null;
  }
  const normalized = Object.fromEntries(
    EXPECTED_RECEIPT_KEYS.map((key) => [key, value[key]]),
  );
  const claimedAt = canonicalInstant(normalized.claimed_at);
  const expiresAt = canonicalInstant(normalized.expires_at);
  if ([
    normalized.claim_sha256,
    normalized.claim_ref_sha256,
    normalized.request_sha256,
    normalized.operation_binding_sha256,
    normalized.database_target_receipt_sha256,
    normalized.approval_receipt_sha256,
    normalized.registry_sha256,
  ].some((item) => typeof item !== "string" || !SHA256.test(item))
    || typeof normalized.program_input_kms_key_ref_sha256 !== "string"
    || !SHA256.test(normalized.program_input_kms_key_ref_sha256)
    || !Number.isFinite(claimedAt)
    || !Number.isFinite(expiresAt)
    || claimedAt >= expiresAt) return null;
  return Object.freeze(normalized);
}

export function createOutlookAuthorityExpectedClaimReceipt(claim, bytes) {
  const receipt = createOutlookAuthorityClaimReceipt(claim, bytes);
  const expected = Object.fromEntries(
    EXPECTED_RECEIPT_KEYS.map((key) => [key,
      key === "program_input_kms_key_ref_sha256"
        ? createHash("sha256")
          .update(receipt.program_input_kms_key_ref)
          .digest("hex")
        : receipt[key],
    ]),
  );
  const normalized = normalizeExpectedClaimReceipt(expected);
  if (!normalized) {
    throw createOutlookAuthorityClaimFailure(
      "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
    );
  }
  return normalized;
}

export function createOutlookAuthorityClaimFailure(code, {
  attempted = false,
  committed = false,
  ambiguous = false,
  expectedClaimReceipt = null,
} = {}) {
  const safeCode = typeof code === "string" && SAFE_CODE.test(code)
    ? code
    : "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_FAILURE";
  const attemptedValue = attempted === true;
  const ambiguousValue = attemptedValue && ambiguous === true;
  const committedValue = ambiguousValue
    ? null
    : attemptedValue && committed === true;
  const error = new Error(
    "Outlook authority claim failed at a protected boundary",
  );
  error.code = safeCode;
  error.claim_failure = Object.freeze({
    outcome: "blocked",
    claim_write_attempted: attemptedValue,
    claim_write_committed: committedValue,
    claim_write_commit_ambiguous: ambiguousValue,
    safe_code: safeCode,
    expected_claim_receipt: attemptedValue
      ? normalizeExpectedClaimReceipt(expectedClaimReceipt)
      : null,
  });
  return error;
}

export function outlookAuthorityClaimOutcome(
  outcome,
  receipt,
  claimWriteAttempted = true,
) {
  return Object.freeze({
    outcome,
    claim_write_attempted: claimWriteAttempted,
    claim_write_committed: outcome === "claimed",
    receipt,
  });
}

function missingClaim(error) {
  return error?.name === "NoSuchKey"
    || error?.name === "NotFound"
    || error?.$metadata?.httpStatusCode === 404;
}

function replayMetadata(existing, kmsKeyId, now) {
  const {
    VersionId: versionId,
    ContentLength: contentLength,
    ContentType: contentType,
    ServerSideEncryption: encryption,
    SSEKMSKeyId: storedKmsKeyId,
    ObjectLockMode: lockMode,
    ObjectLockRetainUntilDate: retainUntilDate,
  } = existing ?? {};
  let retainedUntil = Number.NaN;
  if (retainUntilDate instanceof Date) {
    try {
      retainedUntil = Date.prototype.getTime.call(retainUntilDate);
    } catch {
      // The closed predicate below rejects a non-Date receiver.
    }
  }
  if (typeof versionId !== "string" || !versionId.trim()
    || !Number.isSafeInteger(contentLength)
    || contentLength < 1
    || contentLength > OUTLOOK_AUTHORITY_CLAIM_MAX_BYTES
    || contentType !== "application/json"
    || encryption !== "aws:kms"
    || storedKmsKeyId !== kmsKeyId
    || lockMode !== "COMPLIANCE"
    || !Number.isFinite(retainedUntil)
    || retainedUntil <= now) {
    throw new Error("stored claim governance drifted");
  }
  return Object.freeze({ contentLength, retainedUntil });
}

export async function readJsonPostgresOutlookAuthorityClaim({
  client,
  bucket,
  key,
  expectedOwner,
  kmsKeyId,
  request,
  claimRef,
  now,
  claimWriteAttempted,
  proposedBytes,
  ambiguousOnReadFailure = false,
  expectedClaimReceipt = null,
}) {
  let existing;
  try {
    existing = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ExpectedBucketOwner: expectedOwner,
      ChecksumMode: "ENABLED",
    }));
  } catch (error) {
    if (missingClaim(error)) {
      throw createOutlookAuthorityClaimFailure(
        "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
        {
          attempted: claimWriteAttempted,
          expectedClaimReceipt,
        },
      );
    }
    throw createOutlookAuthorityClaimFailure(
      ambiguousOnReadFailure
        ? "LAWOS_OUTLOOK_AUTHORIZATION_CLAIM_COMMIT_UNKNOWN"
        : "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_RECONCILIATION",
      {
        attempted: claimWriteAttempted,
        ambiguous: ambiguousOnReadFailure,
        expectedClaimReceipt,
      },
    );
  }
  let existingBytes;
  try {
    existingBytes = await readOutlookAuthorityClaimBytes(existing.Body);
  } catch {
    throw createOutlookAuthorityClaimFailure(
      ambiguousOnReadFailure
        ? "LAWOS_OUTLOOK_AUTHORIZATION_CLAIM_COMMIT_UNKNOWN"
        : "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
      {
        attempted: claimWriteAttempted,
        ambiguous: ambiguousOnReadFailure,
        expectedClaimReceipt,
      },
    );
  }
  const proposedMatch = Buffer.isBuffer(proposedBytes)
    && existingBytes.equals(proposedBytes);
  try {
    const metadata = replayMetadata(existing, kmsKeyId, now);
    if (existingBytes.byteLength !== metadata.contentLength) {
      throw new Error("stored claim size drifted");
    }
    const claim = JSON.parse(existingBytes);
    const receipt = validateOutlookAuthorityStoredClaim({
      claim,
      request,
      claimRef,
      bytes: existingBytes,
      retainedUntil: metadata.retainedUntil,
      now,
    });
    return outlookAuthorityClaimOutcome(
      proposedMatch ? "claimed" : "replayed",
      receipt,
      claimWriteAttempted,
    );
  } catch {
    throw createOutlookAuthorityClaimFailure(
      "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT",
      {
        attempted: claimWriteAttempted,
        committed: proposedMatch,
        expectedClaimReceipt,
      },
    );
  }
}
