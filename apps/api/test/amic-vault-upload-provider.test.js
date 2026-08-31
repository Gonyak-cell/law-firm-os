import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAmicVaultUploadCommit,
  normalizeAmicVaultUploadPreflight,
  normalizeAmicVaultUploadReadback,
  normalizeAmicVaultUploadTransfer,
  requireAmicVaultStagedUploadProvider,
  requireAmicVaultUploadProvider,
} from "../src/amic-vault-upload-provider.js";

const CORRELATION = "vaultcorr_1234567890abcdef";
const AUTHORITY = "amic-vault-api:revision-1";
const EXACT = Object.freeze({
  document_id: "11111111-1111-4111-8111-111111111111",
  version_id: "22222222-2222-4222-8222-222222222222",
  file_object_id: "33333333-3333-4333-8333-333333333333",
  sha256: "a".repeat(64),
  byte_size: 17,
  mime_type: "text/plain",
});

function decision(name, effect = "allow") {
  return { effect, decision_ref: `decision:${name}:1` };
}

function decisions({ dlpEffect = "deferred" } = {}) {
  return {
    permission: decision("permission"),
    ethical_wall: decision("ethical-wall"),
    records: decision("records"),
    dlp: decision("dlp", dlpEffect),
  };
}

function preflight(overrides = {}) {
  return {
    authority_kind: "amic-vault-api",
    authority_ref: AUTHORITY,
    provider_revision: "provider-revision-1",
    preflight_ref: "provider-preflight-1",
    expires_at: "2026-08-28T12:10:00.000Z",
    resolved: {
      vault_tenant_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      vault_actor_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      vault_matter_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      vault_workspace_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      vault_folder_id: null,
    },
    decisions: decisions(),
    audit: { event_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", correlation_id: CORRELATION },
    ...overrides,
  };
}

function commit(overrides = {}) {
  return {
    authority_kind: "amic-vault-api",
    authority_ref: AUTHORITY,
    provider_revision: "provider-revision-1",
    state: "quarantined",
    provider_operation_ref: "provider-upload-1",
    accepted: {
      sha256: EXACT.sha256,
      byte_size: EXACT.byte_size,
      mime_type: EXACT.mime_type,
    },
    exact_version: null,
    retry_after_ms: 1_000,
    audit: { event_id: "ffffffff-ffff-4fff-8fff-ffffffffffff", correlation_id: CORRELATION },
    ...overrides,
  };
}

function readback(overrides = {}) {
  return {
    authority_kind: "amic-vault-api",
    authority_ref: AUTHORITY,
    provider_revision: "provider-revision-1",
    state: "readback_verified",
    provider_operation_ref: "provider-upload-1",
    exact_version: EXACT,
    retry_after_ms: null,
    decisions: decisions(),
    audit: { event_id: "99999999-9999-4999-8999-999999999999", correlation_id: CORRELATION },
    ...overrides,
  };
}

function safeCode(error) {
  return error?.safe_error_code;
}

test("AMIC Vault upload provider contract requires three explicit authority methods", () => {
  assert.throws(
    () => requireAmicVaultUploadProvider(null),
    (error) => safeCode(error) === "VAULT_PROVIDER_UNAVAILABLE",
  );
  assert.throws(
    () => requireAmicVaultUploadProvider({
      authority_kind: "local-dms",
      preflightUpload() {},
      commitUpload() {},
      readbackUpload() {},
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_UNAVAILABLE",
  );
  assert.equal(requireAmicVaultUploadProvider({
    authority_kind: "amic-vault-api",
    preflightUpload() {},
    commitUpload() {},
    readbackUpload() {},
  }).authority_kind, "amic-vault-api");
  assert.throws(
    () => requireAmicVaultStagedUploadProvider({
      authority_kind: "amic-vault-api",
      preflightUpload() {},
      commitUpload() {},
      readbackUpload() {},
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_UNAVAILABLE",
  );
  assert.equal(requireAmicVaultStagedUploadProvider({
    authority_kind: "amic-vault-api",
    preflightUpload() {},
    prepareStagedUpload() {},
    commitUpload() {},
    completeStagedUpload() {},
    readbackUpload() {},
  }).authority_kind, "amic-vault-api");
});

test("direct transfer is bound to one file and exactly 1 GiB capacity", () => {
  const expected = Object.freeze({
    filename: "one-gib.txt",
    byte_size: 1024 * 1024 * 1024,
    mime_type: "text/plain",
  });
  const value = {
    authority_kind: "amic-vault-api",
    authority_ref: AUTHORITY,
    provider_revision: "provider-revision-1",
    state: "transfer_ready",
    transfer_ref: "vault-transfer:one-gib",
    expires_at: "2026-08-28T12:30:00.000Z",
    method: "PUT",
    upload_url: `https://vault-bucket.s3.ap-northeast-2.amazonaws.com/quarantine/one-gib?X-Amz-Signature=${"a".repeat(64)}`,
    required_headers: {
      "content-length": String(expected.byte_size),
      "content-type": expected.mime_type,
      "if-none-match": "*",
      "x-amz-server-side-encryption": "AES256",
    },
    file: expected,
    max_upload_bytes: 1024 * 1024 * 1024,
  };
  const normalized = normalizeAmicVaultUploadTransfer(value, {
    authorityRef: AUTHORITY,
    providerRevision: "provider-revision-1",
    expected,
    now: () => Date.parse("2026-08-28T12:00:00.000Z"),
  });
  assert.equal(normalized.file.byte_size, 1024 * 1024 * 1024);
  assert.equal(normalized.max_upload_bytes, 1024 * 1024 * 1024);

  assert.throws(
    () => normalizeAmicVaultUploadTransfer({ ...value, max_upload_bytes: expected.byte_size + 1 }, {
      authorityRef: AUTHORITY,
      providerRevision: "provider-revision-1",
      expected,
      now: () => Date.parse("2026-08-28T12:00:00.000Z"),
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_RESPONSE_INVALID",
  );
});

test("provider preflight accepts only exact bound allow decisions and audit correlation", () => {
  const normalized = normalizeAmicVaultUploadPreflight(preflight(), {
    correlationId: CORRELATION,
    expected: { workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", folderId: null },
    now: () => Date.parse("2026-08-28T12:00:00.000Z"),
  });
  assert.equal(normalized.decisions.ethical_wall.effect, "allow");
  assert.equal(normalized.decisions.dlp.effect, "deferred");
  assert.equal(normalized.resolved.vault_folder_id, null);

  assert.throws(
    () => normalizeAmicVaultUploadPreflight(preflight({
      decisions: { ...decisions(), records: { effect: "deny", decision_ref: "decision:records:deny" } },
    }), {
      correlationId: CORRELATION,
      now: () => Date.parse("2026-08-28T12:00:00.000Z"),
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_RECORDS_DENIED",
  );
  assert.throws(
    () => normalizeAmicVaultUploadPreflight(preflight({
      audit: { event_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", correlation_id: "different" },
    }), {
      correlationId: CORRELATION,
      now: () => Date.parse("2026-08-28T12:00:00.000Z"),
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_AUDIT_MISMATCH",
  );
});

test("quarantine acceptance binds bytes without exact IDs and status reaches promoted exact readback", () => {
  const normalizedCommit = normalizeAmicVaultUploadCommit(commit(), {
    correlationId: CORRELATION,
    expected: { sha256: EXACT.sha256, byte_size: EXACT.byte_size, mime_type: EXACT.mime_type },
    authorityRef: AUTHORITY,
    providerRevision: "provider-revision-1",
  });
  assert.equal(normalizedCommit.state, "quarantined");
  assert.equal(normalizedCommit.exact_version, null);
  assert.equal(normalizedCommit.accepted.sha256, EXACT.sha256);

  const scanning = normalizeAmicVaultUploadReadback(readback({
    state: "scanning",
    exact_version: null,
    retry_after_ms: 750,
  }), {
    correlationId: CORRELATION,
    expected: normalizedCommit.accepted,
    authorityRef: AUTHORITY,
    providerRevision: "provider-revision-1",
    providerOperationRef: normalizedCommit.provider_operation_ref,
  });
  assert.equal(scanning.state, "scanning");
  assert.equal(scanning.exact_version, null);

  const promoted = normalizeAmicVaultUploadReadback(readback({
    state: "promoted",
    retry_after_ms: 750,
  }), {
    correlationId: CORRELATION,
    expected: normalizedCommit.accepted,
    authorityRef: AUTHORITY,
    providerRevision: "provider-revision-1",
    providerOperationRef: normalizedCommit.provider_operation_ref,
  });
  assert.deepEqual(promoted.exact_version, EXACT);

  const normalizedReadback = normalizeAmicVaultUploadReadback(readback(), {
    correlationId: CORRELATION,
    expected: promoted.exact_version,
    authorityRef: AUTHORITY,
    providerRevision: "provider-revision-1",
    providerOperationRef: normalizedCommit.provider_operation_ref,
  });
  assert.deepEqual(normalizedReadback.exact_version, EXACT);

  assert.throws(
    () => normalizeAmicVaultUploadCommit(commit({
      accepted: { sha256: "b".repeat(64), byte_size: EXACT.byte_size, mime_type: EXACT.mime_type },
    }), {
      correlationId: CORRELATION,
      expected: { sha256: EXACT.sha256, byte_size: EXACT.byte_size, mime_type: EXACT.mime_type },
      authorityRef: AUTHORITY,
      providerRevision: "provider-revision-1",
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_COMMIT_MISMATCH",
  );
  assert.throws(
    () => normalizeAmicVaultUploadReadback(readback({ authority_ref: "amic-vault-api:revision-2" }), {
      correlationId: CORRELATION,
      expected: EXACT,
      authorityRef: AUTHORITY,
      providerRevision: "provider-revision-1",
      providerOperationRef: "provider-upload-1",
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_AUTHORITY_CHANGED",
  );
  assert.throws(
    () => normalizeAmicVaultUploadReadback(readback({
      state: "scanning",
      retry_after_ms: 750,
    }), {
      correlationId: CORRELATION,
      expected: EXACT,
      authorityRef: AUTHORITY,
      providerRevision: "provider-revision-1",
      providerOperationRef: "provider-upload-1",
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_RESPONSE_INVALID",
  );
});

test("negative scan states are bounded and cannot smuggle exact IDs or policy decisions", () => {
  const normalized = normalizeAmicVaultUploadReadback(readback({
    state: "infected",
    exact_version: null,
    retry_after_ms: null,
    decisions: null,
  }), {
    correlationId: CORRELATION,
    expected: EXACT,
    authorityRef: AUTHORITY,
    providerRevision: "provider-revision-1",
    providerOperationRef: "provider-upload-1",
  });
  assert.equal(normalized.safe_reason_code, "VAULT_UPLOAD_INFECTED");
  assert.equal(normalized.exact_version, null);
  assert.equal(normalized.decisions, null);

  assert.throws(
    () => normalizeAmicVaultUploadReadback(readback({
      state: "security_hold",
      retry_after_ms: null,
      decisions: null,
    }), {
      correlationId: CORRELATION,
      expected: EXACT,
      authorityRef: AUTHORITY,
      providerRevision: "provider-revision-1",
      providerOperationRef: "provider-upload-1",
    }),
    (error) => safeCode(error) === "VAULT_PROVIDER_RESPONSE_INVALID",
  );
});
