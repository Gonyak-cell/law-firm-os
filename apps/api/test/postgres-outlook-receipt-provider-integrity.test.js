import assert from "node:assert/strict";
import test from "node:test";
import { fileEmailThreadToMatter } from "../../../packages/email-dms/src/email-filing-service.js";
import {
  ACTOR,
  TENANT,
  createPgReceiptFixture,
  createPgUploadRuntime,
  pgSnapshot,
  readback,
} from "./postgres-outlook-receipt-authority-fixture.js";

function filing(state, authority) {
  return fileEmailThreadToMatter({
    repository: state.repository,
    thread: state.thread,
    actor_id: ACTOR,
    require_original_mime_document: true,
    idempotency_key: state.key,
    durable_mime_authority: authority,
  });
}

async function unchanged(state, before) {
  assert.equal(JSON.stringify(state.repository.snapshot()), before.local);
  assert.equal(JSON.stringify(await pgSnapshot(state.pg.adminPool)), before.pg);
  assert.deepEqual((await readback(state.fixture)).body.items, []);
}

test("provider object deletion is rejected before replay/readback mutation, including fresh runtime", async (t) => {
  const state = await createPgReceiptFixture(t);
  if (!state) return;
  const restarted = createPgUploadRuntime(state.pg, state.storage);
  state.fixture.runtime.dmsRuntime.upload_runtime = restarted;
  assert.equal((await filing(state, restarted)).outcome, "idempotent_replay");
  assert.equal((await readback(state.fixture)).body.items.length > 0, true);
  const authorityState = await restarted.getDocumentIntegrityState({ tenant_id: TENANT, document_id: state.documentId });
  assert.equal(Object.hasOwn(authorityState, "bytes"), false);
  assert.equal(Object.hasOwn(authorityState.provider_integrity, "bytes"), false);
  const documentState = await restarted.getDocumentState({ tenant_id: TENANT, document_id: state.documentId });
  const fileObject = documentState.file_objects.find((entry) => entry.file_object_id === documentState.versions[0].file_object_id);
  const before = { local: JSON.stringify(state.repository.snapshot()), pg: JSON.stringify(await pgSnapshot(state.pg.adminPool)) };
  assert.equal(state.storage.deleteCommittedObject({ tenant_id: TENANT, object_id: fileObject.object_id, expected_sha256: fileObject.sha256 }).deleted, true);
  await assert.rejects(filing(state, restarted), /authority/u);
  await unchanged(state, before);
});

test("stat and digest provider disagreement fail closed without receipt or PostgreSQL mutation", async (t) => {
  const state = await createPgReceiptFixture(t);
  if (!state) return;
  const digestDriftStorage = Object.freeze({
    ...state.storage,
    async digestObject(input) {
      const digest = await state.storage.digestObject(input);
      return digest ? { ...digest, sha256: "f".repeat(64) } : digest;
    },
  });
  const digestDriftRuntime = createPgUploadRuntime(state.pg, digestDriftStorage);
  state.fixture.runtime.dmsRuntime.upload_runtime = digestDriftRuntime;
  const beforeDigest = { local: JSON.stringify(state.repository.snapshot()), pg: JSON.stringify(await pgSnapshot(state.pg.adminPool)) };
  await assert.rejects(filing(state, digestDriftRuntime), /authority/u);
  await unchanged(state, beforeDigest);

  const statDriftStorage = Object.freeze({
    ...state.storage,
    async statObject(input) {
      const stat = await state.storage.statObject(input);
      return stat ? { ...stat, mime_type: "application/pdf" } : stat;
    },
  });
  const statDriftRuntime = createPgUploadRuntime(state.pg, statDriftStorage);
  state.fixture.runtime.dmsRuntime.upload_runtime = statDriftRuntime;
  const beforeStat = { local: JSON.stringify(state.repository.snapshot()), pg: JSON.stringify(await pgSnapshot(state.pg.adminPool)) };
  await assert.rejects(filing(state, statDriftRuntime), /authority/u);
  await unchanged(state, beforeStat);
  assert.equal((await readback(state.fixture)).status, 200);
});
