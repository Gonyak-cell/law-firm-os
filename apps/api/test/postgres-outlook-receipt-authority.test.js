import assert from "node:assert/strict";
import test from "node:test";
import { fileEmailThreadToMatter } from "../../../packages/email-dms/src/email-filing-service.js";
import {
  ACTOR,
  GRAPH_ID,
  INTERNET_ID,
  MATTER,
  SUBJECT,
  TENANT,
  THREAD_ID,
  createPgReceiptFixture,
  pgCounts,
  readback,
} from "./postgres-outlook-receipt-authority-fixture.js";

test("PostgreSQL DMS authority binds Outlook replay to live rows and HTTP readback", async (t) => {
  const state = await createPgReceiptFixture(t);
  if (!state) return;
  const { pg, fixture, uploadRuntime, repository, thread, key, digest, documentId, versionId, bytes } = state;
  const filing = { repository, thread, actor_id: ACTOR, require_original_mime_document: true, idempotency_key: key };
  const replay = await fileEmailThreadToMatter({ ...filing, durable_mime_authority: uploadRuntime });
  assert.equal(replay.outcome, "idempotent_replay");
  const validReadback = await readback(fixture);
  assert.equal(validReadback.status, 200);
  assert.equal(validReadback.body.items.some((item) => item.email_thread_id === THREAD_ID), true);

  const versionTwoId = `version:${documentId}:2`;
  await uploadRuntime.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: MATTER,
      document_id: documentId,
      workspace_id: "workspace:readback",
      title: `${SUBJECT}.pdf`,
      mime_type: "application/pdf",
      current_version_id: versionTwoId,
      permission_envelope_id: "permission:readback",
      audit_trace_id: "audit:readback",
    },
    bytes,
    actor_id: ACTOR,
    idempotency_key: `pg-original-mime-v2:${THREAD_ID}`,
    version_number: 2,
  });
  const beforeMimeDrift = { local: JSON.stringify(repository.snapshot()), pg: await pgCounts(pg.adminPool) };
  await assert.rejects(fileEmailThreadToMatter({ ...filing, durable_mime_authority: uploadRuntime }), /authority/u);
  assert.equal(JSON.stringify(repository.snapshot()), beforeMimeDrift.local);
  assert.deepEqual(await pgCounts(pg.adminPool), beforeMimeDrift.pg);
  assert.deepEqual((await readback(fixture)).body.items, []);
  await pg.adminPool.query(
    `UPDATE lawos_dms.documents SET current_version_id = $3 WHERE tenant_id = $1 AND document_id = $2`,
    [TENANT, documentId, versionId],
  );

  const liveGetDocumentState = uploadRuntime.getDocumentState.bind(uploadRuntime);
  const liveGetDocumentIntegrityState = uploadRuntime.getDocumentIntegrityState.bind(uploadRuntime);
  const byteSizeDriftAuthority = Object.freeze({
    ...uploadRuntime,
    getDocumentState: async (input) => {
      const authorityState = await liveGetDocumentState(input);
      if (input.document_id !== documentId || !authorityState) return authorityState;
      return {
        ...authorityState,
        file_objects: authorityState.file_objects.map((fileObject) => ({
          ...fileObject,
          byte_size: "drifted-at-authority-boundary",
        })),
      };
    },
    getDocumentIntegrityState: async (input) => {
      const authorityState = await liveGetDocumentIntegrityState(input);
      if (input.document_id !== documentId || !authorityState) return authorityState;
      return {
        ...authorityState,
        file_objects: authorityState.file_objects.map((fileObject) => ({
          ...fileObject,
          byte_size: "drifted-at-authority-boundary",
        })),
      };
    },
  });
  fixture.runtime.dmsRuntime.upload_runtime = byteSizeDriftAuthority;
  const beforeByteSizeDrift = { local: JSON.stringify(repository.snapshot()), pg: await pgCounts(pg.adminPool) };
  await assert.rejects(fileEmailThreadToMatter({ ...filing, durable_mime_authority: byteSizeDriftAuthority }), /authority/u);
  assert.equal(JSON.stringify(repository.snapshot()), beforeByteSizeDrift.local);
  assert.deepEqual(await pgCounts(pg.adminPool), beforeByteSizeDrift.pg);
  assert.deepEqual((await readback(fixture)).body.items, []);
  fixture.runtime.dmsRuntime.upload_runtime = uploadRuntime;

  const staleState = await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: documentId });
  assert.equal(Object.hasOwn(staleState.versions[0], "matter_id"), false);
  assert.equal(Object.hasOwn(staleState.file_objects[0], "matter_id"), false);
  const beforeMismatch = { local: JSON.stringify(repository.snapshot()), pg: await pgCounts(pg.adminPool) };
  await pg.adminPool.query(
    `UPDATE lawos_dms.documents SET current_version_id = $3 WHERE tenant_id = $1 AND document_id = $2`,
    [TENANT, documentId, "version:missing-current"],
  );
  await assert.rejects(fileEmailThreadToMatter({ ...filing, durable_mime_authority: uploadRuntime }), /authority/u);
  assert.equal(JSON.stringify(repository.snapshot()), beforeMismatch.local);
  assert.deepEqual(await pgCounts(pg.adminPool), beforeMismatch.pg);
  assert.deepEqual((await readback(fixture)).body.items, []);
  await pg.adminPool.query(
    `UPDATE lawos_dms.documents SET current_version_id = $3 WHERE tenant_id = $1 AND document_id = $2`,
    [TENANT, documentId, staleState.document.current_version_id],
  );
  const beforeDelete = { local: JSON.stringify(repository.snapshot()), pg: await pgCounts(pg.adminPool) };
  const deleteIntent = await uploadRuntime.requestCommittedObjectDelete({
    tenant_id: TENANT,
    document_id: documentId,
    object_id: staleState.file_objects[0].object_id,
    idempotency_key: `pg-delete:${THREAD_ID}`,
    requested_by: ACTOR,
    approval_receipt: { receipt_ref: "approval:pg-receipt-authority", receipt_sha256: "d".repeat(64), key_id: "key:pg-receipt-authority" },
  });
  await uploadRuntime.executeCommittedObjectDelete({ tenant_id: TENANT, delete_intent_id: deleteIntent.intent.delete_intent_id });
  await assert.rejects(fileEmailThreadToMatter({ ...filing, durable_mime_authority: uploadRuntime }), /authority/u);
  assert.equal(JSON.stringify(repository.snapshot()), beforeDelete.local);
  const afterDelete = await pgCounts(pg.adminPool);
  assert.deepEqual(afterDelete, beforeDelete.pg);
  assert.deepEqual((await readback(fixture)).body.items, []);
  const beforeRaw = { local: JSON.stringify(repository.snapshot()), pg: afterDelete };
  await assert.rejects(fileEmailThreadToMatter({ ...filing, durable_mime_authority: uploadRuntime, durable_mime_document: staleState }), /snapshot/u);
  assert.equal(JSON.stringify(repository.snapshot()), beforeRaw.local);
  assert.deepEqual(await pgCounts(pg.adminPool), beforeRaw.pg);
});
