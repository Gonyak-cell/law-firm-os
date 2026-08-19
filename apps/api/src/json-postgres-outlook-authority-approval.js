import { isDeepStrictEqual } from "node:util";

import {
  externalReleaseAuthorityBindingSha256,
  verifyDetachedReceiptBytes,
} from "../../../packages/runtime-auth/src/external-release-trust.js";
import { JSON_POSTGRES_EXECUTION_PACKET_VERSION } from "../../../packages/persistence/src/postgres/execution-contract.js";
import { validateJsonPostgresDatabaseTargetReceiptBinding } from "../../../packages/persistence/src/postgres/database-target-receipt.js";
export const JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SCHEMA_VERSION =
  "law-firm-os.json-postgres-production-cutover-owner-approval.v2";
export const JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_TYPE =
  "lawos-json-postgres-production-cutover-owner-approval";
export const JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SOURCE = "law-firm-os";
export const JSON_POSTGRES_OUTLOOK_APPROVAL_ENTRA_TENANT_ID =
  "2f10d109-c2ad-43a4-a813-4dea28119e52";
export const JSON_POSTGRES_OUTLOOK_APPROVAL_TRUST_VERSION =
  JSON_POSTGRES_EXECUTION_PACKET_VERSION;
const PILOT_ID = "amic-os-outlook";
const LAWOS_TENANT_ID = "lawos-production";
const ROLE = "owner";
const OPERATION = "lawos-json-postgres-production-cutover";
const ENVIRONMENT = "lawos-production";
const MAX_VALIDITY_MS = 15 * 60 * 1_000;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const RECEIPT_KEYS = Object.freeze([
  "schema_version", "approval_id", "key_id", "receipt_type",
  "receipt_source", "pilot_id", "lawos_tenant_id", "entra_tenant_id",
  "source_sha", "source_tree", "version", "role", "operation",
  "artifact_sha256", "binding_sha256", "packet_sha256", "environment",
  "decision", "issued_at", "expires_at", "data_scope", "contact_scope",
  "registry_sha256", "registry_serial", "trust_anchor_sha256",
  "registry_signature_sha256",
]);
function fail(message) {
  throw Object.assign(new Error(message), {
    code: "LAWOS_OUTLOOK_AUTHORITY_EXTERNAL_APPROVAL",
  });
}
function exactObject(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function canonicalInstant(value) {
  if (typeof value !== "string") return Number.NaN;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : Number.NaN;
}

function approvalDataScope(packet) {
  return Object.freeze([
    "approved-real-manifest",
    `authority-manifest:${packet?.bindings?.authority_manifest_sha256}`,
    `inventory:${packet?.bindings?.inventory_content_sha256}`,
    `inventory-delta-policy:${packet?.bindings?.inventory_delta_policy_sha256}`,
  ]);
}

function authorityScope(packet) {
  return {
    pilot_id: PILOT_ID,
    lawos_tenant_id: LAWOS_TENANT_ID,
    entra_tenant_id: JSON_POSTGRES_OUTLOOK_APPROVAL_ENTRA_TENANT_ID,
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    version: packet?.schema_version,
  };
}

export function jsonPostgresOutlookAuthorityApprovalBindingSha256(packet) {
  return externalReleaseAuthorityBindingSha256(authorityScope(packet));
}

function exactTrust(productionTrust) {
  const trust = {
    registry_sha256: productionTrust?.sha256,
    registry_serial: productionTrust?.registrySerial,
    trust_anchor_sha256: productionTrust?.anchorSha256,
    registry_signature_sha256: productionTrust?.registrySignatureSha256,
  };
  if (!productionTrust?.registryTrust
    || !SHA256.test(trust.registry_sha256 ?? "")
    || !Number.isSafeInteger(trust.registry_serial)
    || trust.registry_serial < 1
    || !SHA256.test(trust.trust_anchor_sha256 ?? "")
    || !SHA256.test(trust.registry_signature_sha256 ?? "")) {
    fail("production trust facts are incomplete");
  }
  return trust;
}

export function createJsonPostgresOutlookAuthorityApprovalReceiptInput({
  event,
  packet,
  productionTrust,
  approvalId,
  keyId,
  issuedAt,
  expiresAt,
} = {}) {
  const trust = exactTrust(productionTrust);
  return Object.freeze({
    schema_version: JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SCHEMA_VERSION,
    approval_id: approvalId,
    key_id: keyId,
    receipt_type: JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_TYPE,
    receipt_source: JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SOURCE,
    pilot_id: PILOT_ID,
    lawos_tenant_id: LAWOS_TENANT_ID,
    entra_tenant_id: JSON_POSTGRES_OUTLOOK_APPROVAL_ENTRA_TENANT_ID,
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    version: packet?.schema_version,
    role: ROLE,
    operation: OPERATION,
    artifact_sha256: event?.artifact_sha256,
    binding_sha256:
      jsonPostgresOutlookAuthorityApprovalBindingSha256(packet),
    packet_sha256: packet?.packet_sha256,
    environment: ENVIRONMENT,
    decision: "approved",
    issued_at: issuedAt,
    expires_at: expiresAt,
    data_scope: approvalDataScope(packet),
    contact_scope: Object.freeze([...(packet?.contact_scope ?? [])]),
    ...trust,
  });
}

function assertExactReceipt({ receipt, event, packet, productionTrust }) {
  const trust = exactTrust(productionTrust);
  let target;
  try {
    target = validateJsonPostgresDatabaseTargetReceiptBinding(packet?.target);
  } catch {
    fail("signed database target receipt is invalid");
  }
  const issuedAt = canonicalInstant(receipt?.issued_at);
  const expiresAt = canonicalInstant(receipt?.expires_at);
  const targetObservedAt = canonicalInstant(
    target?.database_target_receipt?.observed_at,
  );
  const targetExpiresAt = canonicalInstant(
    target?.database_target_receipt?.expires_at,
  );
  const expected = createJsonPostgresOutlookAuthorityApprovalReceiptInput({
    event, packet, productionTrust,
    approvalId: receipt?.approval_id, keyId: receipt?.key_id,
    issuedAt: receipt?.issued_at, expiresAt: receipt?.expires_at,
  });
  if (!exactObject(receipt, RECEIPT_KEYS)
    || !TOKEN.test(receipt.approval_id ?? "")
    || !TOKEN.test(receipt.key_id ?? "")
    || !SHA256.test(packet?.packet_sha256 ?? "")
    || packet.packet_sha256 !== event?.packet_sha256
    || packet.schema_version !== JSON_POSTGRES_OUTLOOK_APPROVAL_TRUST_VERSION
    || packet.phase !== "w13-production-cutover"
    || packet.source_sha !== event?.source_sha
    || packet.source_tree !== event?.source_tree
    || packet.bindings?.artifact_sha256 !== event?.artifact_sha256
    || packet.action !== OPERATION
    || packet.environment !== ENVIRONMENT
    || receipt.registry_sha256 !== trust.registry_sha256
    || receipt.registry_serial !== trust.registry_serial
    || receipt.trust_anchor_sha256 !== trust.trust_anchor_sha256
    || receipt.registry_signature_sha256
      !== trust.registry_signature_sha256
    || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)
    || !Number.isFinite(targetObservedAt) || !Number.isFinite(targetExpiresAt)
    || expiresAt <= issuedAt || expiresAt - issuedAt > MAX_VALIDITY_MS
    || issuedAt < targetObservedAt || expiresAt > targetExpiresAt
    || !isDeepStrictEqual(receipt, expected)) {
    fail("owner approval drifted from the exact V7 cutover authority");
  }
}

export function verifyJsonPostgresOutlookAuthorityApproval({
  event,
  packet,
  productionTrust,
  receiptBytes,
  signatureBytes,
  now = Date.now(),
  verifyReceipt = verifyDetachedReceiptBytes,
} = {}) {
  if (!Buffer.isBuffer(receiptBytes) || !Buffer.isBuffer(signatureBytes)
    || typeof verifyReceipt !== "function") {
    fail("owner approval byte snapshots are required");
  }
  let suppliedReceipt;
  try {
    suppliedReceipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch {
    fail("owner approval receipt is not valid JSON");
  }
  assertExactReceipt({ receipt: suppliedReceipt, event, packet, productionTrust });
  const verification = verifyReceipt({
    registry: productionTrust.registryTrust,
    receiptBytes,
    signatureBytes,
    expectedReceiptType: JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_TYPE,
    expectedReceiptSource: JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SOURCE,
    expectedPilotId: PILOT_ID,
    expectedLawosTenantId: LAWOS_TENANT_ID,
    expectedEntraTenantId: JSON_POSTGRES_OUTLOOK_APPROVAL_ENTRA_TENANT_ID,
    expectedSourceSha: packet.source_sha,
    expectedSourceTree: packet.source_tree,
    expectedVersion: JSON_POSTGRES_OUTLOOK_APPROVAL_TRUST_VERSION,
    expectedRole: ROLE,
    expectedOperation: OPERATION,
    expectedArtifactSha256: event.artifact_sha256,
    expectedBindingSha256:
      jsonPostgresOutlookAuthorityApprovalBindingSha256(packet),
    now,
  });
  if (verification?.valid !== true
    || verification.key_id !== suppliedReceipt.key_id
    || !isDeepStrictEqual(verification.receipt, suppliedReceipt)
    || verification.issued_at !== suppliedReceipt.issued_at
    || verification.expires_at !== suppliedReceipt.expires_at
    || !SHA256.test(verification.receipt_sha256 ?? "")
    || !SHA256.test(verification.signature_sha256 ?? "")) {
    fail("owner approval verification result drifted from its byte snapshot");
  }
  return Object.freeze({
    valid: true,
    decision: "approved",
    approval_id: suppliedReceipt.approval_id,
    key_id: suppliedReceipt.key_id,
    receipt_sha256: verification.receipt_sha256,
    signature_sha256: verification.signature_sha256,
    registry_sha256: suppliedReceipt.registry_sha256,
    registry_serial: suppliedReceipt.registry_serial,
    trust_anchor_sha256: suppliedReceipt.trust_anchor_sha256,
    registry_signature_sha256: suppliedReceipt.registry_signature_sha256,
    signed_at: suppliedReceipt.issued_at,
    expires_at: suppliedReceipt.expires_at,
    packet_sha256: packet.packet_sha256,
    phase: packet.phase,
    action: packet.action,
    environment: packet.environment,
    external_authority_binding_sha256: suppliedReceipt.binding_sha256,
    trust_root_verified: true,
  });
}
