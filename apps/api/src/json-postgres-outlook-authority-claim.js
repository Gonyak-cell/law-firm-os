import { PutObjectCommand } from "@aws-sdk/client-s3";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { programEvidenceRetainUntil } from "./program-evidence-retention.js";
import {
  createOutlookAuthorityClaimReceipt,
  createOutlookAuthorityClaimRef,
  createOutlookAuthorityClaimRequestSha256,
  OUTLOOK_AUTHORITY_CLAIM_REQUEST_VERSION,
  OUTLOOK_AUTHORITY_CLAIM_RESULT_VERSION,
  OUTLOOK_AUTHORITY_CLAIM_VERSION,
  OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION,
  parseOutlookAuthorityCanonicalInstant,
} from "./json-postgres-outlook-authority-claim-readback.js";
import {
  createOutlookAuthorityClaimFailure,
  createOutlookAuthorityExpectedClaimReceipt,
  outlookAuthorityClaimOutcome,
  readJsonPostgresOutlookAuthorityClaim,
} from "./json-postgres-outlook-authority-claim-store.js";
import {
  JSON_POSTGRES_OUTLOOK_AUTHORITY_LEGACY_OPERATION_BINDING_VERSION,
} from "./json-postgres-outlook-authority-operation.js";
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_APPROVAL_VALIDITY_MS = 15 * 60 * 1_000;
function fail(code) {
  throw createOutlookAuthorityClaimFailure(code);
}
function preconditionFailed(error) {
  return error?.name === "PreconditionFailed"
    || error?.$metadata?.httpStatusCode === 412;
}
export async function claimJsonPostgresOutlookAuthorityOperation({
  event,
  authorization,
  operationBinding,
  env = process.env,
  client,
  now = Date.now(),
} = {}) {
  const packet = authorization?.packet;
  const approval = authorization?.approval;
  const target = packet?.target;
  const region = String(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "").trim();
  const bucket = String(env.LAWOS_APPROVAL_AUDIT_BUCKET ?? "").trim();
  const kmsKeyId = String(env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN ?? "").trim();
  const expectedOwner = target?.program_input_expected_bucket_owner;
  let claimedAt = null;
  try {
    if (Number.isSafeInteger(now)) claimedAt = new Date(now).toISOString();
  } catch {
    // The closed binding predicate below rejects out-of-range instants.
  }
  if (!client || typeof client.send !== "function"
    || !SHA256.test(operationBinding?.operation_binding_sha256 ?? "")
    || authorization?.operation_binding_sha256
      !== operationBinding.operation_binding_sha256
    || bucket !== target?.program_input_bucket_name
    || expectedOwner !== target?.aws_account
    || region !== target?.aws_region
    || kmsKeyId !== target?.program_input_kms_key_ref
    || claimedAt == null) {
    fail(
      "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
      "Outlook authority authorization claim target drifted",
    );
  }
  const approvalExpiresAt = parseOutlookAuthorityCanonicalInstant(
    approval?.expires_at,
  );
  const approvalSignedAt = parseOutlookAuthorityCanonicalInstant(
    approval?.signed_at,
  );
  if (!Number.isFinite(approvalExpiresAt)) {
    fail(
      "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
      "Outlook authority approval expiry is invalid",
    );
  }
  const legacy = operationBinding.schema_version
    === JSON_POSTGRES_OUTLOOK_AUTHORITY_LEGACY_OPERATION_BINDING_VERSION;
  if (!legacy && (approval?.trust_root_verified !== true
    || approval?.packet_sha256 !== packet?.packet_sha256
    || approval?.phase !== packet?.phase
    || approval?.action !== packet?.action
    || approval?.environment !== packet?.environment
    || !SHA256.test(approval?.signature_sha256 ?? "")
    || !Number.isSafeInteger(approval?.registry_serial)
    || approval.registry_serial < 1
    || !SHA256.test(approval?.trust_anchor_sha256 ?? "")
    || !SHA256.test(approval?.registry_signature_sha256 ?? "")
    || !SHA256.test(
      approval?.external_authority_binding_sha256 ?? "",
    )
    || !Number.isFinite(approvalSignedAt)
    || approvalSignedAt > now
    || approvalExpiresAt <= approvalSignedAt
    || approvalExpiresAt - approvalSignedAt > MAX_APPROVAL_VALIDITY_MS)) {
    fail("LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING");
  }
  const databaseTargetExpiresAt = legacy
    ? Number.POSITIVE_INFINITY
    : parseOutlookAuthorityCanonicalInstant(
      operationBinding.database_target_receipt?.expires_at,
    );
  if (!legacy && (!Number.isFinite(databaseTargetExpiresAt)
    || approvalExpiresAt > databaseTargetExpiresAt
    || !authorization?.databaseTargetReceipt
    || authorization?.database_target_receipt_sha256
      !== operationBinding.database_target_receipt_sha256
    || canonicalizeJson(authorization.databaseTargetReceipt)
      !== canonicalizeJson(operationBinding.database_target_receipt))) {
    fail(
      "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING",
      "Outlook authority database target binding drifted",
    );
  }
  const request = Object.freeze({
    schema_version: legacy
      ? OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION
      : OUTLOOK_AUTHORITY_CLAIM_REQUEST_VERSION,
    approval_id: approval.approval_id,
    key_id: approval.key_id,
    action: event.action,
    phase: event.phase,
    mode: event.mode,
    stage: event.stage,
    operation: event.operation,
    attempt_ref: event.attempt_ref,
    source_sha: authorization.exact.sourceSha,
    source_tree: authorization.exact.sourceTree,
    packet_sha256: packet.packet_sha256,
    operation_binding_sha256: operationBinding.operation_binding_sha256,
    approval_receipt_sha256: approval.receipt_sha256,
    registry_sha256: approval.registry_sha256,
    authorization_input_sha256: authorization.authorization_input_sha256,
    program_input_kms_key_ref: target.program_input_kms_key_ref,
    expires_at: approval.expires_at,
    ...(legacy ? {} : {
      approval_signature_sha256: approval.signature_sha256,
      registry_serial: approval.registry_serial,
      trust_anchor_sha256: approval.trust_anchor_sha256,
      registry_signature_sha256: approval.registry_signature_sha256,
      external_authority_binding_sha256:
        approval.external_authority_binding_sha256,
      database_target_receipt:
        operationBinding.database_target_receipt,
      database_target_receipt_sha256:
        operationBinding.database_target_receipt_sha256,
    }),
  });
  const claimRef = createOutlookAuthorityClaimRef(
    operationBinding.operation_binding_sha256,
    { legacy },
  );
  const key = `program-approval-audit/${region}/outlook-authority/${claimRef}.json`;
  if (legacy || approvalExpiresAt <= now || databaseTargetExpiresAt <= now) {
    return readJsonPostgresOutlookAuthorityClaim({
      client,
      bucket,
      key,
      expectedOwner,
      kmsKeyId,
      request,
      claimRef,
      now,
      claimWriteAttempted: false,
    });
  }
  const result = Object.freeze({
    schema_version: OUTLOOK_AUTHORITY_CLAIM_RESULT_VERSION,
    status: "CLAIMED",
    claim_ref_sha256: claimRef,
    request_sha256: createOutlookAuthorityClaimRequestSha256(request),
    claimed_at: claimedAt,
    expires_at: approval.expires_at,
  });
  const claim = Object.freeze({
    schema_version: OUTLOOK_AUTHORITY_CLAIM_VERSION,
    request,
    result,
  });
  const bytes = Buffer.from(`${canonicalizeJson(claim)}\n`);
  const expectedClaimReceipt =
    createOutlookAuthorityExpectedClaimReceipt(claim, bytes);
  let retainUntil;
  try {
    retainUntil = programEvidenceRetainUntil({
      approvalExpiresAt: approval.expires_at,
      now,
    });
  } catch {
    fail("LAWOS_PROGRAM_AUTHORIZATION_CLAIM_BINDING");
  }
  let putError;
  try {
    const stored = await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: "application/json",
      ExpectedBucketOwner: expectedOwner,
      IfNoneMatch: "*",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: retainUntil,
    }));
    if (typeof stored?.VersionId === "string" && stored.VersionId.trim()) {
      return outlookAuthorityClaimOutcome(
        "claimed",
        createOutlookAuthorityClaimReceipt(claim, bytes),
      );
    }
  } catch (error) {
    putError = error;
  }
  const replay = preconditionFailed(putError);
  return readJsonPostgresOutlookAuthorityClaim({
    client,
    bucket,
    key,
    expectedOwner,
    kmsKeyId,
    request,
    claimRef,
    now,
    claimWriteAttempted: true,
    proposedBytes: replay ? undefined : bytes,
    ambiguousOnReadFailure: !replay,
    expectedClaimReceipt,
  });
}
