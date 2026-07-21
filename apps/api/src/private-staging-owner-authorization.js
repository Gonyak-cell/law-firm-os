import { createHash } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { canonicalizeJson, validateRuntimeSafetyApprovalPayload } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export const PRIVATE_STAGING_OWNER_AUTHORIZATION_ACTION = "lawos-private-staging-exact-head-execution";

function requiredText(value, name, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) throw new TypeError(`${name} is invalid`);
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function authorizationBytes(event = {}) {
  const bundle = event.owner_authorization;
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("signed owner authorization bundle is required");
  const keys = Object.keys(bundle).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["receipt_json", "registry_json", "signature_base64"])) {
    throw new Error("signed owner authorization bundle shape is invalid");
  }
  if (typeof bundle.registry_json !== "string" || !bundle.registry_json.trim() || typeof bundle.receipt_json !== "string" || !bundle.receipt_json.trim()) {
    throw new Error("owner authorization registry and receipt JSON are required");
  }
  const registryJson = bundle.registry_json;
  const receiptJson = bundle.receipt_json;
  if (Buffer.byteLength(registryJson) > 64 * 1024 || Buffer.byteLength(receiptJson) > 16 * 1024) throw new Error("signed owner authorization bundle is too large");
  const signature = Buffer.from(requiredText(bundle.signature_base64, "owner approval signature", /^[A-Za-z0-9+/]+={0,2}$/u), "base64");
  if (signature.length !== 64) throw new Error("owner approval signature must be Ed25519");
  return Object.freeze({ registry: Buffer.from(registryJson), receipt: Buffer.from(receiptJson), signature });
}

async function putImmutableClaim({ env, action, approval, now }) {
  const region = requiredText(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION, "AWS region");
  const bucket = requiredText(env.LAWOS_APPROVAL_AUDIT_BUCKET, "LAWOS_APPROVAL_AUDIT_BUCKET");
  const kmsKeyId = requiredText(env.LAWOS_STAGING_KMS_KEY_ARN, "LAWOS_STAGING_KMS_KEY_ARN");
  const claimFingerprint = sha256(`${approval.receipt_sha256}\0${action}`);
  const claimedAt = new Date(now).toISOString();
  const body = Buffer.from(`${canonicalizeJson({
    schema_version: "law-firm-os.private-staging.owner-authorization-claim.v1",
    approval_id: approval.approval_id,
    action,
    environment: "lawos-staging",
    key_id: approval.key_id,
    receipt_sha256: approval.receipt_sha256,
    registry_sha256: approval.registry_sha256,
    claimed_at: claimedAt,
    expires_at: approval.expires_at,
  })}\n`);
  const client = new S3Client({ region });
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `approval-audit/${claimFingerprint}.json`,
      Body: body,
      ContentType: "application/json",
      IfNoneMatch: "*",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: new Date(Math.max(Date.parse(approval.expires_at), now) + 30 * 24 * 60 * 60 * 1000),
    }));
  } catch (error) {
    if (error?.name === "PreconditionFailed" || error?.$metadata?.httpStatusCode === 412) {
      const replay = new Error("owner authorization was already consumed for this action");
      replay.code = "PRIVATE_STAGING_APPROVAL_REPLAY";
      throw replay;
    }
    throw error;
  } finally {
    client.destroy();
  }
  return Object.freeze({ claim_fingerprint: claimFingerprint, claim_body_sha256: sha256(body) });
}

export async function authorizePrivateStagingAdminInvocation({
  event,
  env = process.env,
  action,
  approvalId,
  now = Date.now(),
  claimAuthorization = putImmutableClaim,
} = {}) {
  const bytes = authorizationBytes(event);
  const approval = validateRuntimeSafetyApprovalPayload({
    registryBytes: bytes.registry,
    receiptBytes: bytes.receipt,
    signatureBytes: bytes.signature,
    expectedRegistrySha256: requiredText(env.LAWOS_OWNER_TRUST_REGISTRY_SHA256, "LAWOS_OWNER_TRUST_REGISTRY_SHA256", /^[a-f0-9]{64}$/u),
    expectedRole: "owner",
    expectedAction: PRIVATE_STAGING_OWNER_AUTHORIZATION_ACTION,
    expectedEnvironment: "staging",
    expectedPacketSha256: requiredText(env.LAWOS_OWNER_INSTRUCTION_SHA256, "LAWOS_OWNER_INSTRUCTION_SHA256", /^[a-f0-9]{64}$/u),
    expectedSourceSha: requiredText(env.LAWOS_DEPLOYMENT_COMMIT, "LAWOS_DEPLOYMENT_COMMIT", /^[a-f0-9]{40}$/u),
    expectedSourceTree: requiredText(env.LAWOS_DEPLOYMENT_TREE, "LAWOS_DEPLOYMENT_TREE", /^[a-f0-9]{40}$/u),
    allowedDataScope: ["synthetic-only"],
    allowedContactScope: ["synthetic-mailbox-only"],
    now,
  });
  if (approval.decision !== "approved" || approval.approval_id !== approvalId) throw new Error("signed owner authorization decision or id does not match");
  const claim = await claimAuthorization({ env, action: requiredText(action, "admin action"), approval, now });
  return Object.freeze({
    approval_id: approval.approval_id,
    key_id: approval.key_id,
    receipt_sha256: approval.receipt_sha256,
    claim_fingerprint: claim.claim_fingerprint,
    claim_body_sha256: claim.claim_body_sha256,
  });
}
