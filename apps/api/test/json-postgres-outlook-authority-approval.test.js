import assert from "node:assert/strict";
import test from "node:test";

import {
  createJsonPostgresOutlookAuthorityApprovalReceiptInput,
  JSON_POSTGRES_OUTLOOK_APPROVAL_ENTRA_TENANT_ID,
  JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SCHEMA_VERSION,
  JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SOURCE,
  JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_TYPE,
  JSON_POSTGRES_OUTLOOK_APPROVAL_TRUST_VERSION,
  jsonPostgresOutlookAuthorityApprovalBindingSha256,
  verifyJsonPostgresOutlookAuthorityApproval,
} from "../src/json-postgres-outlook-authority-approval.js";
import {
  authorization,
  operationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";

const ISSUED_AT = "2026-08-17T00:05:00.000Z";
const EXPIRES_AT = "2026-08-17T00:10:00.000Z";
const HASH = (digit) => digit.repeat(64);

function trust(overrides = {}) {
  return {
    registryTrust: Object.freeze({ fixed_root: true }),
    sha256: HASH("1"),
    registrySerial: 7,
    anchorSha256: HASH("2"),
    registrySignatureSha256: HASH("3"),
    ...overrides,
  };
}

function fixture(overrides = {}) {
  const base = authorization();
  const event = operationEvent({
    packet_sha256: base.packet.packet_sha256,
  });
  const productionTrust = trust();
  const receipt = createJsonPostgresOutlookAuthorityApprovalReceiptInput({
    event,
    packet: base.packet,
    productionTrust,
    approvalId: "owner-v7-cutover-001",
    keyId: "owner-key-001",
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  return { event, packet: base.packet, productionTrust, receipt, ...overrides };
}

function verify(value, receipt = value.receipt) {
  const calls = [];
  const verified = verifyJsonPostgresOutlookAuthorityApproval({
    ...value,
    receiptBytes: Buffer.from(JSON.stringify(receipt)),
    signatureBytes: Buffer.alloc(64, 7),
    now: Date.parse("2026-08-17T00:06:00.000Z"),
    verifyReceipt(options) {
      calls.push(options);
      return Object.freeze({
        valid: true,
        key_id: receipt.key_id,
        receipt,
        receipt_sha256: HASH("4"),
        signature_sha256: HASH("5"),
        issued_at: receipt.issued_at,
        expires_at: receipt.expires_at,
      });
    },
  });
  return { verified, call: calls[0] };
}

test("V7 owner receipt binds exact external authority and fixed-root facts", () => {
  const value = fixture();
  const { verified, call } = verify(value);
  assert.equal(value.receipt.schema_version,
    JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SCHEMA_VERSION);
  assert.equal(value.receipt.receipt_type,
    JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_TYPE);
  assert.equal(value.receipt.receipt_source,
    JSON_POSTGRES_OUTLOOK_APPROVAL_RECEIPT_SOURCE);
  assert.equal(value.receipt.entra_tenant_id,
    JSON_POSTGRES_OUTLOOK_APPROVAL_ENTRA_TENANT_ID);
  assert.equal(value.receipt.version,
    JSON_POSTGRES_OUTLOOK_APPROVAL_TRUST_VERSION);
  assert.equal(value.receipt.binding_sha256,
    jsonPostgresOutlookAuthorityApprovalBindingSha256(value.packet));
  assert.deepEqual(Object.keys(value.receipt).sort(), [
    "approval_id", "artifact_sha256", "binding_sha256", "contact_scope",
    "data_scope", "decision", "entra_tenant_id", "environment", "expires_at",
    "issued_at", "key_id", "lawos_tenant_id", "operation", "packet_sha256",
    "pilot_id", "receipt_source", "receipt_type", "registry_serial",
    "registry_sha256", "registry_signature_sha256", "role", "schema_version",
    "source_sha", "source_tree", "trust_anchor_sha256", "version",
  ].sort());
  assert.equal(call.registry, value.productionTrust.registryTrust);
  assert.equal(call.expectedPacketSha256, undefined);
  assert.equal(call.expectedOperation,
    "lawos-json-postgres-production-cutover");
  assert.equal(call.expectedArtifactSha256, value.event.artifact_sha256);
  assert.equal(verified.signed_at, ISSUED_AT);
  assert.equal(verified.registry_sha256, value.productionTrust.sha256);
  assert.equal(verified.trust_root_verified, true);
  assert.equal(Object.isFrozen(verified), true);
});

test("V7 owner receipt rejects closed scope, trust, target and time drift", () => {
  const value = fixture();
  for (const mutate of [
    (receipt) => { receipt.packet_sha256 = HASH("f"); },
    (receipt) => { receipt.registry_serial = 8; },
    (receipt) => { receipt.data_scope = [...receipt.data_scope, "extra"]; },
    (receipt) => { receipt.contact_scope = []; },
    (receipt) => { receipt.unexpected = true; },
    (receipt) => { receipt.expires_at = "2026-08-17T00:20:00.000Z"; },
  ]) {
    const receipt = structuredClone(value.receipt);
    mutate(receipt);
    assert.throws(
      () => verify(value, receipt),
      (error) => error?.code ===
        "LAWOS_OUTLOOK_AUTHORITY_EXTERNAL_APPROVAL",
    );
  }
});
