import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAmicVaultExportAuthorization,
  normalizeAmicVaultExportDownload,
  normalizeAmicVaultExportReadback,
  requireAmicVaultExportProvider,
} from "../src/amic-vault-export-provider.js";

const NOW = Date.parse("2026-08-28T12:00:00.000Z");
const CORRELATION = "vaultcorr_export_test";
const EXACT = Object.freeze({
  document_id: "document_exact_1",
  version_id: "version_exact_7",
  file_object_id: "file_object_exact_7",
  sha256: "a".repeat(64),
  byte_size: 4,
  mime_type: "application/pdf",
});

function decisions(effect = "allow") {
  return Object.freeze({
    permission: Object.freeze({ effect, decision_ref: "decision_permission_1" }),
    ethical_wall: Object.freeze({ effect, decision_ref: "decision_wall_1" }),
    records: Object.freeze({ effect, decision_ref: "decision_records_1" }),
    dlp: Object.freeze({ effect, decision_ref: "decision_dlp_1" }),
  });
}

function authorization(overrides = {}) {
  return {
    authority_kind: "amic-vault-api",
    authority_ref: "amic-vault-api:export-test",
    provider_revision: "amic-vault-source:5a04cc31",
    state: "authorized",
    provider_export_ref: "vault-export:one-time-1",
    expires_at: "2026-08-28T12:00:45.000Z",
    exact_version: EXACT,
    attachment_name: "contract-v7.pdf",
    decisions: decisions(),
    audit: {
      event_id: "vault-export-authorized:event-1",
      correlation_id: CORRELATION,
    },
    ...overrides,
  };
}

test("exact export provider requires explicit authorize, download, and readback methods", () => {
  assert.throws(
    () => requireAmicVaultExportProvider(null),
    (error) => error.safe_error_code === "VAULT_EXPORT_PROVIDER_UNAVAILABLE",
  );
  assert.throws(
    () => requireAmicVaultExportProvider({
      authority_kind: "amic-vault-api",
      authorizeExactExport() {},
      downloadExactExport() {},
    }),
    (error) => error.safe_error_code === "VAULT_EXPORT_PROVIDER_UNAVAILABLE",
  );
  const provider = {
    authority_kind: "amic-vault-api",
    authorizeExactExport() {},
    downloadExactExport() {},
    readbackExactExport() {},
  };
  assert.equal(requireAmicVaultExportProvider(provider), provider);
});

test("authorization binds one exact version, four allow decisions, audit, filename, and a maximum 60 second grant", () => {
  const normalized = normalizeAmicVaultExportAuthorization(authorization(), {
    correlationId: CORRELATION,
    expectedExactVersion: EXACT,
    now: () => NOW,
  });
  assert.deepEqual(normalized.exact_version, EXACT);
  assert.equal(normalized.attachment_name, "contract-v7.pdf");
  assert.equal(normalized.expires_at, "2026-08-28T12:00:45.000Z");

  for (const changed of [
    authorization({ expires_at: "2026-08-28T12:01:01.000Z" }),
    authorization({ exact_version: { ...EXACT, version_id: "version_latest" } }),
    authorization({ attachment_name: "../contract.pdf" }),
    authorization({ decisions: decisions("deny") }),
    authorization({ audit: { event_id: "other", correlation_id: "wrong" } }),
  ]) {
    assert.throws(() => normalizeAmicVaultExportAuthorization(changed, {
      correlationId: CORRELATION,
      expectedExactVersion: EXACT,
      now: () => NOW,
    }));
  }
});

test("download returns only the same provider grant, revision, exact version, name, and server-owned body", () => {
  const auth = normalizeAmicVaultExportAuthorization(authorization(), {
    correlationId: CORRELATION,
    expectedExactVersion: EXACT,
    now: () => NOW,
  });
  const body = Buffer.from([1, 2, 3, 4]);
  const input = {
    authority_kind: auth.authority_kind,
    authority_ref: auth.authority_ref,
    provider_revision: auth.provider_revision,
    state: "downloaded",
    provider_export_ref: auth.provider_export_ref,
    exact_version: EXACT,
    attachment_name: auth.attachment_name,
    body,
    audit: {
      event_id: "vault-export-downloaded:event-1",
      correlation_id: CORRELATION,
    },
  };
  const normalized = normalizeAmicVaultExportDownload(input, {
    correlationId: CORRELATION,
    authorization: auth,
  });
  assert.equal(normalized.body, body);

  for (const changed of [
    { ...input, provider_revision: "amic-vault-source:changed" },
    { ...input, provider_export_ref: "vault-export:other" },
    { ...input, exact_version: { ...EXACT, sha256: "b".repeat(64) } },
    { ...input, attachment_name: "other.pdf" },
    { ...input, body: "base64-is-not-a-server-stream" },
  ]) {
    assert.throws(() => normalizeAmicVaultExportDownload(changed, {
      correlationId: CORRELATION,
      authorization: auth,
    }));
  }
});

test("readback accepts only consumed state for the same one-time grant and exact version", () => {
  const auth = normalizeAmicVaultExportAuthorization(authorization(), {
    correlationId: CORRELATION,
    expectedExactVersion: EXACT,
    now: () => NOW,
  });
  const readback = {
    authority_kind: auth.authority_kind,
    authority_ref: auth.authority_ref,
    provider_revision: auth.provider_revision,
    state: "consumed",
    provider_export_ref: auth.provider_export_ref,
    exact_version: EXACT,
    decisions: decisions(),
    audit: {
      event_id: "vault-export-consumed:event-1",
      correlation_id: CORRELATION,
    },
  };
  assert.equal(normalizeAmicVaultExportReadback(readback, {
    correlationId: CORRELATION,
    authorization: auth,
  }).state, "consumed");
  assert.throws(() => normalizeAmicVaultExportReadback({ ...readback, state: "ready" }, {
    correlationId: CORRELATION,
    authorization: auth,
  }));
  assert.throws(() => normalizeAmicVaultExportReadback({
    ...readback,
    exact_version: { ...EXACT, file_object_id: "file_object_latest" },
  }, {
    correlationId: CORRELATION,
    authorization: auth,
  }));
});
