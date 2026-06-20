import assert from "node:assert/strict";
import test from "node:test";
import {
  createVaultObjectEnvelope,
  readHrxVaultEnvelope,
} from "../src/vault-service.js";

function vaultEnvelopeFixture() {
  return createVaultObjectEnvelope({
    tenant_id: "tenant-a",
    vault_object_id: "vault-001",
    document_id: "hr-doc-001",
    owning_context: "HRX",
    content_hash: "sha256:abc123",
    size_bytes: 1024,
    content_type: "application/pdf",
    storage_ref: "vault://objects/vault-001",
  });
}

test("HRX vault envelope read returns metadata without storage ref or bytes", () => {
  const events = [];
  const response = readHrxVaultEnvelope({
    envelope: vaultEnvelopeFixture(),
    principal: {
      tenant_id: "tenant-a",
      actor_id: "user-hr",
      scopes: ["hrx:documents:read"],
    },
    audit: { append: (event) => events.push(event) },
  });
  assert.equal(response.outcome, "ok");
  assert.equal(response.envelope.storage_ref_included, false);
  assert.equal(response.envelope.document_bytes_included, false);
  assert.equal(Object.hasOwn(response.envelope, "storage_ref"), false);
  assert.equal(events.length, 1);
  assert.equal(events[0].decision, "allow");
});

test("HRX vault envelope denies non-HR scope and audits the read attempt", () => {
  const events = [];
  const response = readHrxVaultEnvelope({
    envelope: vaultEnvelopeFixture(),
    principal: {
      tenant_id: "tenant-a",
      actor_id: "user-non-hr",
      scopes: ["matter:documents:read"],
    },
    audit: { append: (event) => events.push(event) },
  });
  assert.equal(response.outcome, "blocked");
  assert.equal(response.safe_error_code, "DMS_HRX_VAULT_ENVELOPE_DENIED");
  assert.equal(events.length, 1);
  assert.equal(events[0].decision, "deny");
});

test("vault envelope rejects raw storage path fields", () => {
  assert.throws(
    () =>
      createVaultObjectEnvelope({
        tenant_id: "tenant-a",
        vault_object_id: "vault-002",
        document_id: "hr-doc-002",
        owning_context: "HRX",
        content_hash: "sha256:def456",
        storage_ref: "vault://objects/vault-002",
        raw_path: "/private/storage/hr-doc-002.pdf",
      }),
    /must not include raw_path/,
  );
});
