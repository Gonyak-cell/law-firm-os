import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresDmsUploadRuntime,
  matchesCanonicalPendingMetadataReceipt,
} from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-pending-metadata-receipt";
const ACTOR = "actor-pending-metadata-receipt";
const BYTES = Buffer.from("canonical pending metadata receipt");
const SHA = createHash("sha256").update(BYTES).digest("hex");

test("pending metadata receipt is an exact canonical DMS projection", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: createLocalStorageAdapter({ adapter_id: "pending-metadata-receipt-storage" }),
    clock: () => new Date("2026-08-09T12:00:00.000Z"),
  });
  let receipt;
  const sessionId = "dms-upload:engagement:pending-receipt";
  const versionId = "version:document-pending-receipt:1";
  await runtime.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: "matter-pending-receipt",
      workspace_id: "workspace-pending-receipt",
      document_id: "document-pending-receipt",
      current_version_id: versionId,
      title: "Pending receipt.pdf",
      mime_type: "application/pdf",
      permission_envelope_id: "permission-pending-receipt",
      audit_trace_id: "audit-pending-receipt",
    },
    bytes: BYTES,
    actor_id: ACTOR,
    idempotency_key: "engagement-signed-document:pending-receipt",
    session_id: sessionId,
    object_id: `object:${versionId}`,
    completion_authority: {
      schema_version: "law-firm-os.dms-external-metadata-guard.v1",
      provider: "lawos-intake",
      tenant_id: TENANT,
      claim_id: createHash("sha256").update("claim-pending-receipt").digest("hex"),
      request_fingerprint: createHash("sha256").update("request-pending-receipt").digest("hex"),
      session_id: sessionId,
      idempotency_key: "engagement-signed-document:pending-receipt",
      document_id: "document-pending-receipt",
      version_id: versionId,
      object_id: `object:${versionId}`,
      expected_sha256: SHA,
      expected_byte_size: BYTES.byteLength,
      content_type: "application/pdf",
      actor_id: ACTOR,
    },
    beforePersist(input) {
      if (input.phase === "before_metadata") receipt = input.pending_metadata_receipt;
    },
  });
  const session = await runtime.getUploadSession({ tenant_id: TENANT, session_id: sessionId });
  assert.equal(matchesCanonicalPendingMetadataReceipt({ session, receipt }), true);

  const mutations = [
    (value) => { value.tenant_id = "tenant-other"; },
    (value) => { value.session_id = "session-other"; },
    (value) => { value.document.document_id = "document-other"; },
    (value) => { value.version.version_id = "version-other"; },
    (value) => { value.file_object.object_id = "object-other"; },
    (value) => { value.storage_receipt.adapter_id = "adapter-other"; },
    (value) => { value.storage_receipt.sha256 = "0".repeat(64); },
    (value) => { value.storage_receipt.byte_size += 1; },
    (value) => { value.file_object.content_type = "application/octet-stream"; },
    (value) => { value.version.created_by = "actor-other"; },
    (value) => { value.provider_finalize_before_metadata = false; },
    (value) => { value.committed_at = "2026-08-09T12:00:00Z"; },
    (value) => { value.unknown_field = true; },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(receipt);
    mutate(candidate);
    assert.equal(matchesCanonicalPendingMetadataReceipt({ session, receipt: candidate }), false);
  }
});
