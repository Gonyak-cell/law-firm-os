import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex } from "../../dms/src/storage/storage-adapter.js";
import { approveEngagement } from "../src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../src/runtime-repository.js";

const TENANT = "tenant-engagement-upload-runtime";
const BYTES = Buffer.from("%PDF-1.4\nasync signed engagement\n%%EOF\n");
const ENGAGEMENT = Object.freeze({
  engagement_id: "engagement-async-upload",
  tenant_id: TENANT,
  intake_request_id: "intake-async-upload",
  signed_document_id: "document-async-upload",
  signature_ref: "signature:document-async-upload",
  signed_document_upload: {
    signed_document_upload_id: "signed-upload-async",
    document_id: "document-async-upload",
    bytes_base64: BYTES.toString("base64"),
    byte_size: BYTES.byteLength,
    mime_type: "application/pdf",
  },
});

function uploadResult(input) {
  const versionId = input.document.current_version_id;
  const fileObjectId = `file:${versionId}`;
  return {
    outcome: "created",
    document: { document_id: input.document.document_id },
    version: { version_id: versionId, file_object_id: fileObjectId },
    file_object: { file_object_id: fileObjectId },
    storage_receipt: { sha256: sha256Hex(input.bytes), byte_size: input.bytes.byteLength },
  };
}

test("engagement uses async PostgreSQL DMS upload authority before intake persistence", async () => {
  let uploadCalls = 0;
  let legacyPutCalls = 0;
  const uploadRuntime = {
    async uploadDocument(input) {
      uploadCalls += 1;
      assert.deepEqual(input.bytes, BYTES);
      return uploadResult(input);
    },
  };
  const repository = createIntakeRuntimeRepository();
  const request = {
    repository,
    engagement: ENGAGEMENT,
    actor_id: "actor-async-upload",
    idempotency_key: "engagement-async-upload",
    dms_upload_runtime: uploadRuntime,
    dms_storage: { putObject() { legacyPutCalls += 1; throw new Error("legacy storage called"); } },
  };
  const first = await approveEngagement(request);
  assert.deepEqual(
    [first.signed_document_upload.dms_document_id, first.signed_document_upload.dms_version_id, first.signed_document_upload.dms_file_object_id],
    ["document-async-upload", "version:document-async-upload:1", "file:version:document-async-upload:1"],
  );
  assert.equal(repository.list({ tenant_id: TENANT }).length, 3);
  assert.equal(repository.getIdempotency({ tenant_id: TENANT, idempotency_key: request.idempotency_key }).response.outcome, "approved");
  assert.equal((await approveEngagement(request)).idempotent_replay, true);
  assert.equal(uploadCalls, 1);
  assert.equal(legacyPutCalls, 0);

  const rejectedRepository = createIntakeRuntimeRepository();
  await assert.rejects(approveEngagement({
    ...request,
    repository: rejectedRepository,
    engagement: { ...ENGAGEMENT, engagement_id: "engagement-async-rejected" },
    idempotency_key: "engagement-async-rejected",
    dms_upload_runtime: { async uploadDocument() { throw new Error("DMS upload rejected"); } },
  }), /DMS upload rejected/);
  assert.equal(rejectedRepository.list({ tenant_id: TENANT }).length, 0);
  assert.equal(rejectedRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: "engagement-async-rejected" }), undefined);
});

test("engagement serializes concurrent exact keys and rejects fingerprint drift before DMS", async () => {
  let uploadCalls = 0;
  let releaseUpload;
  const uploadBlocked = new Promise((resolve) => { releaseUpload = resolve; });
  let firstUploadStarted;
  const firstUpload = new Promise((resolve) => { firstUploadStarted = resolve; });
  const uploadRuntime = {
    async uploadDocument(input) {
      uploadCalls += 1;
      firstUploadStarted();
      await uploadBlocked;
      return uploadResult(input);
    },
  };
  const repository = createIntakeRuntimeRepository();
  const request = {
    repository,
    engagement: ENGAGEMENT,
    actor_id: "actor-async-upload",
    idempotency_key: "engagement-async-concurrent",
    dms_upload_runtime: uploadRuntime,
  };
  const owner = approveEngagement(request);
  await firstUpload;
  const follower = approveEngagement(request);
  releaseUpload();
  const results = await Promise.all([owner, follower]);
  assert.equal(uploadCalls, 1);
  assert.deepEqual(results.map((result) => result.idempotent_replay).sort(), [false, true]);

  await assert.rejects(
    approveEngagement({
      ...request,
      engagement: { ...ENGAGEMENT, signature_ref: "signature:changed" },
    }),
    (error) => error?.safe_error_code === "IDEMPOTENCY_KEY_REUSED",
  );
  assert.equal(uploadCalls, 1);
});

test("engagement local single-flight is tenant scoped for identical keys", async () => {
  const repository = createIntakeRuntimeRepository();
  const tenants = ["tenant-engagement-local-a", "tenant-engagement-local-b"];
  let uploadCalls = 0;
  const uploadRuntime = {
    async uploadDocument(input) {
      uploadCalls += 1;
      await Promise.resolve();
      return uploadResult(input);
    },
  };
  const results = await Promise.all(tenants.map((tenantId, index) => approveEngagement({
    repository,
    engagement: {
      ...ENGAGEMENT,
      tenant_id: tenantId,
      engagement_id: `engagement-local-${index}`,
      intake_request_id: `intake-local-${index}`,
      signed_document_id: `document-local-${index}`,
      signature_ref: `signature:document-local-${index}`,
      signed_document_upload: {
        ...ENGAGEMENT.signed_document_upload,
        signed_document_upload_id: `signed-upload-local-${index}`,
        document_id: `document-local-${index}`,
      },
    },
    actor_id: "actor-local-cross-tenant",
    idempotency_key: "shared-local-key",
    dms_upload_runtime: uploadRuntime,
  })));
  assert.equal(uploadCalls, 2);
  assert.deepEqual(results.map(({ idempotent_replay }) => idempotent_replay), [false, false]);
});
