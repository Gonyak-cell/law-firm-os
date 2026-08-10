import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresIntakeEngagementCompletionCheckpoint } from "../../../apps/api/src/intake-engagement-completion-checkpoint.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../../dms/src/postgres-consumer-storage.js";
import { createPostgresDmsUploadRuntime } from "../../dms/src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../../dms/src/storage/local-storage-adapter.js";
import { createRecordRepositoryDomainSnapshot } from "../../persistence/src/record-domain-adapter.js";
import {
  createAuthenticatedTransactionBoundDomainLedger,
  createPostgresDomainLedger,
} from "../../persistence/src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { prepareEngagementApproval } from "../src/engagement-approval-command.js";
import { approveEngagement } from "../src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../src/runtime-repository.js";

const TENANT = "tenant-engagement-atomicity";
const ACTOR = "actor-engagement-atomicity";
const KEY = "engagement-atomicity-key";
const BYTES = Buffer.from("%PDF-1.4\ndurable engagement approval\n%%EOF\n");
const ENGAGEMENT = Object.freeze({
  engagement_id: "engagement-atomicity",
  tenant_id: TENANT,
  intake_request_id: "intake-atomicity",
  signed_document_id: "document-engagement-atomicity",
  signature_ref: "signature:document-engagement-atomicity",
  signed_document_upload: Object.freeze({
    signed_document_upload_id: "signed-upload-engagement-atomicity",
    document_id: "document-engagement-atomicity",
    bytes_base64: BYTES.toString("base64"),
    byte_size: BYTES.byteLength,
    mime_type: "application/pdf",
  }),
});

async function seedIntake(ledger) {
  const repository = createIntakeRuntimeRepository({
    seedRecords: [{
      model_type: "IntakeRequest",
      intake_request_id: ENGAGEMENT.intake_request_id,
      tenant_id: TENANT,
      opportunity_id: "opportunity-engagement-atomicity",
      requesting_party_id: "party-engagement-atomicity",
      party_ids: ["party-engagement-atomicity"],
      status: "open",
      owner_user_id: ACTOR,
      created_at: "2026-08-09T00:00:00.000Z",
      updated_at: "2026-08-09T00:00:00.000Z",
    }],
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: INTAKE_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "engagement-atomicity-seed", repository }],
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    repository.close();
  }
}

async function domainCounts(pool) {
  const result = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_domain.records
         WHERE tenant_id = $1 AND domain_id = 'intake'
           AND record_type IN ('Engagement', 'EngagementTemplateDocument', 'EngagementSignedDocumentUpload')) AS records,
       (SELECT count(*)::int FROM lawos_domain.idempotency_keys
         WHERE tenant_id = $1 AND domain_id = 'intake') AS idempotency,
       (SELECT count(*)::int FROM lawos_domain.audit_events
         WHERE tenant_id = $1 AND domain_id = 'intake') AS audit,
       (SELECT count(*)::int FROM lawos_domain.outbox_events
         WHERE tenant_id = $1 AND domain_id = 'intake') AS outbox`,
    [TENANT],
  );
  return result.rows[0];
}

function countedStorage() {
  const base = createLocalStorageAdapter({ adapter_id: "engagement-atomicity-storage" });
  const calls = { finalize: 0, consumer_read: 0 };
  return {
    calls,
    storage: Object.freeze({
      ...base,
      finalizeObject(input) { calls.finalize += 1; return base.finalizeObject(input); },
      getObject(input) { calls.consumer_read += 1; return base.getObject(input); },
      statObject(input) {
        if (input?.session_id == null) calls.consumer_read += 1;
        return base.statObject(input);
      },
      digestObject(input) {
        if (input?.session_id == null) calls.consumer_read += 1;
        return base.digestObject(input);
      },
      readObjectBounded(input) { calls.consumer_read += 1; return base.readObjectBounded(input); },
    }),
  };
}

test("engagement callback and DMS metadata commit roll back together, then restart resumes without provider duplication", async (t) => {
  const postgres = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!postgres) return;
  const ledger = createPostgresDomainLedger({ pool: postgres.appPool });
  await seedIntake(ledger);
  await withPostgresTransaction(postgres.appPool, { tenant_id: TENANT }, async (client) => {
    const bound = await createAuthenticatedTransactionBoundDomainLedger({
      client, tenant_id: TENANT, domain_id: "intake",
    });
    for (const method of ["transaction", "connect", "commit", "rollback", "release"]) {
      assert.equal(bound[method], undefined);
    }
    await assert.rejects(
      createAuthenticatedTransactionBoundDomainLedger({
        client, tenant_id: "tenant-engagement-wrong", domain_id: "intake",
      }),
      (error) => error?.safe_error_code === "POSTGRES_TENANT_CONTEXT_MISMATCH",
    );
  });
  const { storage, calls } = countedStorage();
  const authority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await authority.probe({ tenant_id: TENANT, adapter_id: storage.adapter_id });
  const guarded = createPostgresDmsConsumerStorage({ storage, authority });
  const checkpoint = createPostgresIntakeEngagementCompletionCheckpoint({ ledger });
  let failMetadataOnce = true;
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage,
    committedStorage: guarded,
    completionDenyAuthority: authority,
    faultInjector(phase) {
      if (phase === "before_metadata_commit" && failMetadataOnce) {
        failMetadataOnce = false;
        throw new Error("forced post-callback DMS metadata failure");
      }
    },
  });
  const request = {
    repository: createIntakeRuntimeRepository(),
    engagement: ENGAGEMENT,
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_upload_runtime: runtime,
    engagement_approval_checkpoint: checkpoint,
  };
  await assert.rejects(approveEngagement(request), (error) =>
    error?.safe_error_code === "DMS_METADATA_PRECOMMIT_FAILED");
  request.repository.close();

  const sessionRow = (await postgres.adminPool.query(
    `SELECT * FROM lawos_dms.upload_sessions
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [TENANT, `engagement-signed-document:${KEY}`],
  )).rows[0];
  assert.ok(sessionRow);
  assert.equal(sessionRow.state, "provider_finalized");
  assert.equal(sessionRow.metadata_committed_at, null);
  assert.equal(
    sessionRow.provider_receipt.completion_authority.request_fingerprint,
    prepareEngagementApproval({
      engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
    }).request_fingerprint,
  );
  assert.equal(calls.finalize, 1);
  assert.deepEqual(await domainCounts(postgres.adminPool), { records: 0, idempotency: 0, audit: 0, outbox: 0 });
  assert.equal((await postgres.adminPool.query(
    "SELECT count(*)::int AS count FROM lawos_dms.documents WHERE tenant_id = $1",
    [TENANT],
  )).rows[0].count, 0);
  const readsBeforeDeny = calls.consumer_read;
  await assert.rejects(
    guarded.getObject({ tenant_id: TENANT, object_id: sessionRow.object_id }),
    (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED",
  );
  assert.equal(calls.consumer_read, readsBeforeDeny);

  const restartedRuntime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage,
    committedStorage: guarded,
    completionDenyAuthority: authority,
  });
  const restartedCheckpoint = createPostgresIntakeEngagementCompletionCheckpoint({ ledger });
  const recoveredRepository = createIntakeRuntimeRepository();
  const recovered = await approveEngagement({
    ...request,
    repository: recoveredRepository,
    dms_upload_runtime: restartedRuntime,
    engagement_approval_checkpoint: restartedCheckpoint,
  });
  recoveredRepository.close();
  assert.equal(recovered.idempotent_replay, false);
  assert.equal(calls.finalize, 1);
  assert.deepEqual(await domainCounts(postgres.adminPool), { records: 3, idempotency: 1, audit: 3, outbox: 3 });
  const finalized = await restartedRuntime.getUploadSession({ tenant_id: TENANT, session_id: sessionRow.session_id });
  assert.equal(finalized.state, "finalized");
  assert.equal(recovered.dms_upload.committed_at, finalized.metadata_committed_at);
  assert.equal((await postgres.adminPool.query(
    "SELECT count(*)::int AS count FROM lawos_dms.documents WHERE tenant_id = $1",
    [TENANT],
  )).rows[0].count, 1);

  const replayRepository = createIntakeRuntimeRepository();
  const replay = await approveEngagement({
    ...request,
    repository: replayRepository,
    dms_upload_runtime: restartedRuntime,
    engagement_approval_checkpoint: restartedCheckpoint,
  });
  replayRepository.close();
  assert.deepEqual(replay, { ...recovered, idempotent_replay: true });
  assert.equal(calls.finalize, 1);
  assert.deepEqual(await domainCounts(postgres.adminPool), { records: 3, idempotency: 1, audit: 3, outbox: 3 });
  assert.equal((await guarded.getObject({ tenant_id: TENANT, object_id: sessionRow.object_id })).sha256, sessionRow.expected_sha256);
});
