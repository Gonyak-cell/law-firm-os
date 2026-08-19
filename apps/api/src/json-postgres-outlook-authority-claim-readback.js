import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { programEvidenceRetainUntil } from "./program-evidence-retention.js";

export const OUTLOOK_AUTHORITY_CLAIM_VERSION =
  "law-firm-os.json-postgres-outlook-authority-authorization-claim.v3";
export const OUTLOOK_AUTHORITY_CLAIM_REQUEST_VERSION =
  "law-firm-os.json-postgres-outlook-authority-authorization-request.v3";
export const OUTLOOK_AUTHORITY_LEGACY_CLAIM_VERSION =
  "law-firm-os.json-postgres-outlook-authority-authorization-claim.v2";
export const OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION =
  "law-firm-os.json-postgres-outlook-authority-authorization-request.v2";
export const OUTLOOK_AUTHORITY_CLAIM_RESULT_VERSION =
  "law-firm-os.json-postgres-outlook-authority-authorization-result.v1";
export const OUTLOOK_AUTHORITY_CLAIM_MAX_BYTES = 64 * 1024;

const REF_DOMAIN_V2 = "law-firm-os/json-postgres/outlook-authority-claim-ref/v2";
const REF_DOMAIN_V3 = "law-firm-os/json-postgres/outlook-authority-claim-ref/v3";
const REQUEST_DOMAIN_V2 = "law-firm-os/json-postgres/outlook-authority-claim-request/v2";
const REQUEST_DOMAIN_V3 = "law-firm-os/json-postgres/outlook-authority-claim-request/v3";
const CLAIM_KEYS = Object.freeze(["schema_version", "request", "result"]);
const REQUEST_KEYS = Object.freeze([
  "schema_version", "approval_id", "key_id", "action", "phase", "mode",
  "stage", "operation", "attempt_ref", "source_sha", "source_tree",
  "packet_sha256", "operation_binding_sha256", "approval_receipt_sha256",
  "registry_sha256", "authorization_input_sha256",
  "program_input_kms_key_ref", "expires_at",
]);
const CURRENT_REQUEST_KEYS = Object.freeze([
  ...REQUEST_KEYS,
  "approval_signature_sha256",
  "registry_serial",
  "trust_anchor_sha256",
  "registry_signature_sha256",
  "external_authority_binding_sha256",
  "database_target_receipt",
  "database_target_receipt_sha256",
]);
const RESULT_KEYS = Object.freeze([
  "schema_version", "status", "claim_ref_sha256", "request_sha256",
  "claimed_at", "expires_at",
]);

function conflict(message) {
  const error = new Error(message);
  error.code = "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_CONFLICT";
  throw error;
}

function closed(value, keys) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain)
    .update("\0")
    .update(canonicalizeJson(value))
    .digest("hex");
}

export function parseOutlookAuthorityCanonicalInstant(value) {
  if (typeof value !== "string") return Number.NaN;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return Number.NaN;
  return new Date(milliseconds).toISOString() === value
    ? milliseconds
    : Number.NaN;
}

export function createOutlookAuthorityClaimRef(operationBindingSha256, {
  legacy = false,
} = {}) {
  return domainDigest(legacy ? REF_DOMAIN_V2 : REF_DOMAIN_V3, {
    operation_binding_sha256: operationBindingSha256,
  });
}

export function createOutlookAuthorityClaimRequestSha256(request) {
  return domainDigest(
    request?.schema_version === OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION
      ? REQUEST_DOMAIN_V2
      : REQUEST_DOMAIN_V3,
    request,
  );
}

function freezeDatabaseTargetReceipt(receipt) {
  if (!receipt) return receipt;
  return Object.freeze({
    ...receipt,
    readback_source: Object.freeze({
      ...receipt.readback_source,
      operations: Object.freeze([
        ...receipt.readback_source.operations,
      ]),
    }),
  });
}

export function createOutlookAuthorityClaimReceipt(claim, bytes) {
  const current = claim.schema_version === OUTLOOK_AUTHORITY_CLAIM_VERSION;
  return Object.freeze({
    claim_sha256: createHash("sha256").update(bytes).digest("hex"),
    claim_ref_sha256: claim.result.claim_ref_sha256,
    request_sha256: claim.result.request_sha256,
    operation_binding_sha256: claim.request.operation_binding_sha256,
    program_input_kms_key_ref: claim.request.program_input_kms_key_ref,
    approval_receipt_sha256: claim.request.approval_receipt_sha256,
    registry_sha256: claim.request.registry_sha256,
    claimed_at: claim.result.claimed_at,
    expires_at: claim.result.expires_at,
    ...(current ? {
      approval_signature_sha256: claim.request.approval_signature_sha256,
      registry_serial: claim.request.registry_serial,
      trust_anchor_sha256: claim.request.trust_anchor_sha256,
      registry_signature_sha256:
        claim.request.registry_signature_sha256,
      external_authority_binding_sha256:
        claim.request.external_authority_binding_sha256,
      database_target_receipt: freezeDatabaseTargetReceipt(
        claim.request.database_target_receipt,
      ),
      database_target_receipt_sha256:
        claim.request.database_target_receipt_sha256,
    } : {}),
  });
}

export async function readOutlookAuthorityClaimBytes(body) {
  if (Buffer.isBuffer(body) || ArrayBuffer.isView(body)) {
    const bytes = Buffer.from(body);
    if (bytes.byteLength > OUTLOOK_AUTHORITY_CLAIM_MAX_BYTES) {
      conflict("claim body is oversized");
    }
    return bytes;
  }
  if (!body) conflict("claim body is missing");
  const chunks = [];
  let size = 0;
  for await (const chunk of body) {
    const bytes = Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > OUTLOOK_AUTHORITY_CLAIM_MAX_BYTES) {
      conflict("claim body is oversized");
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

export function validateOutlookAuthorityStoredClaim({
  claim,
  request,
  claimRef,
  bytes,
  retainedUntil,
  now,
}) {
  const claimedAt = parseOutlookAuthorityCanonicalInstant(
    claim?.result?.claimed_at,
  );
  const legacy = claim?.schema_version === OUTLOOK_AUTHORITY_LEGACY_CLAIM_VERSION
    && claim?.request?.schema_version
      === OUTLOOK_AUTHORITY_LEGACY_CLAIM_REQUEST_VERSION;
  const current = claim?.schema_version === OUTLOOK_AUTHORITY_CLAIM_VERSION
    && claim?.request?.schema_version === OUTLOOK_AUTHORITY_CLAIM_REQUEST_VERSION;
  const requestKeys = legacy ? REQUEST_KEYS : CURRENT_REQUEST_KEYS;
  let requiredRetention = Number.POSITIVE_INFINITY;
  if (Number.isFinite(claimedAt)) {
    try {
      requiredRetention = programEvidenceRetainUntil({
        approvalExpiresAt: request.expires_at,
        now: claimedAt,
      }).getTime();
    } catch {
      // Invalid claim times fail the closed conflict predicate below.
    }
  }
  if (!closed(claim, CLAIM_KEYS)
    || (!legacy && !current)
    || !closed(claim.request, requestKeys)
    || !closed(claim.result, RESULT_KEYS)
    || claim.result.schema_version !== OUTLOOK_AUTHORITY_CLAIM_RESULT_VERSION
    || claim.result.status !== "CLAIMED"
    || claim.result.claim_ref_sha256 !== claimRef
    || claim.result.request_sha256
      !== createOutlookAuthorityClaimRequestSha256(claim.request)
    || canonicalizeJson(claim.request) !== canonicalizeJson(request)
    || !Buffer.from(`${canonicalizeJson(claim)}\n`).equals(bytes)
    || !Number.isFinite(claimedAt)
    || claimedAt > now
    || retainedUntil < requiredRetention
    || claim.result.expires_at !== request.expires_at) {
    conflict("immutable Outlook authority authorization claim conflicts with the request");
  }
  return createOutlookAuthorityClaimReceipt(claim, bytes);
}
