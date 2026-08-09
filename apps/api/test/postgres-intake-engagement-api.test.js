import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../../../packages/dms/src/postgres-consumer-storage.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";
import { handleCrmIntakeApiRequest } from "../src/crm-intake-runtime-context.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";

const TENANT = "tenant-postgres-engagement-api";
const ACTOR = "actor-postgres-engagement-api";
const BYTES = Buffer.from("%PDF-1.4\nconcurrent API engagement\n%%EOF\n");
const TOKENS = createBankImportPreviewTokenAuthority({
  secret: "postgres-intake-engagement-api-preview-token-secret",
});

async function seed(ledger) {
  const hrx = createFileHrxStore();
  const intake = createIntakeRuntimeRepository({
    seedRecords: [{
      model_type: "IntakeRequest",
      intake_request_id: "intake-postgres-engagement-api",
      tenant_id: TENANT,
      opportunity_id: "opportunity-postgres-engagement-api",
      requesting_party_id: "party-postgres-engagement-api",
      party_ids: ["party-postgres-engagement-api"],
      status: "open",
      owner_user_id: ACTOR,
      created_at: "2026-08-09T00:00:00.000Z",
      updated_at: "2026-08-09T00:00:00.000Z",
    }],
  });
  try {
    runHrxMigrations(hrx);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store: hrx, tenant_id: TENANT }).snapshot);
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: INTAKE_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "postgres-engagement-api-seed", repository: intake }],
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    hrx.close();
    intake.close();
  }
}

function engagementBody({ key, engagementId, bytes = BYTES } = {}) {
  const documentId = `document-${engagementId}`;
  return {
    tenant_id: TENANT,
    permission_ref: "permission-postgres-engagement-api",
    audit_hint_ref: "audit-postgres-engagement-api",
    idempotency_key: key,
    engagement: {
      engagement_id: engagementId,
      tenant_id: TENANT,
      intake_request_id: "intake-postgres-engagement-api",
      signed_document_id: documentId,
      signature_ref: `signature:${documentId}`,
      signed_document_upload: {
        signed_document_upload_id: `signed-upload-${engagementId}`,
        document_id: documentId,
        ...(bytes ? { bytes_base64: bytes.toString("base64") } : { content_sha256: "a".repeat(64) }),
        byte_size: bytes?.byteLength ?? 4096,
        mime_type: "application/pdf",
      },
    },
  };
}

test("PostgreSQL engagement API serializes owner/follower and preserves 201, 200 replay, and 409 drift", { timeout: 30_000 }, async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const ledger = createPostgresDomainLedger({ pool: postgres.appPool });
  await seed(ledger);
  const base = createLocalStorageAdapter({ adapter_id: "postgres-engagement-api-storage" });
  let releaseFinalize;
  const finalizeReleased = new Promise((resolve) => { releaseFinalize = resolve; });
  let signalFinalize;
  const finalizeStarted = new Promise((resolve) => { signalFinalize = resolve; });
  let finalizeCalls = 0;
  const storage = Object.freeze({
    ...base,
    async finalizeObject(input) {
      finalizeCalls += 1;
      signalFinalize();
      await finalizeReleased;
      return base.finalizeObject(input);
    },
  });
  const readAuthority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await readAuthority.probe({ tenant_id: TENANT, adapter_id: storage.adapter_id });
  const guarded = createPostgresDmsConsumerStorage({ storage, authority: readAuthority });
  const uploadRuntime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage,
    committedStorage: guarded,
    completionDenyAuthority: readAuthority,
    sourceOnly: false,
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage: guarded,
    payrollArtifactStorage: storage,
    inquiryEvidenceStorage: storage,
    dmsUploadRuntime: uploadRuntime,
    payrollArtifactSecret: "postgres-engagement-api-payroll-artifact-secret",
    bankImportPreviewTokens: TOKENS,
    requireDmsConsumerReadAuthority: true,
  });
  const context = Object.freeze({
    principal: Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: Object.freeze([]), scopes: Object.freeze([]) }),
    rules: Object.freeze([{ id: "allow-engagement-api", effect: "allow", action: "intake:engagement:write" }]),
    object_acl: Object.freeze([]),
  });
  let requestSequence = 0;
  const run = (body) => authority.run({
    tenant_id: TENANT,
    request_context: {
      method: "POST",
      pathname: "/api/intake/engagements",
      actor_id: ACTOR,
      retry_idempotent_conflict: true,
    },
    command: (runtimes) => handleCrmIntakeApiRequest({
      pathname: "/api/intake/engagements",
      method: "POST",
      query: {},
      body,
      context,
      requestId: `request-postgres-engagement-api-${requestSequence += 1}`,
      runtime: runtimes.crmIntakeRuntime,
    }),
  });

  const body = engagementBody({ key: "postgres-engagement-api-key", engagementId: "postgres-engagement-api" });
  const owner = run(body);
  await finalizeStarted;
  const follower = run(body);
  await new Promise((resolve) => setTimeout(resolve, 25));
  releaseFinalize();
  const results = await Promise.all([owner, follower]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 201]);
  assert.deepEqual(results.map(({ body: resultBody }) => resultBody.idempotent_replay).sort(), [false, true]);
  assert.equal(finalizeCalls, 1);
  assert.equal((await postgres.adminPool.query(
    "SELECT count(*)::int AS count FROM lawos_dms.upload_sessions WHERE tenant_id = $1",
    [TENANT],
  )).rows[0].count, 1);

  const drift = await run({
    ...body,
    engagement: { ...body.engagement, signature_ref: "signature:drifted" },
  });
  assert.equal(drift.status, 409);
  assert.deepEqual(drift.body.safe_error_codes, ["IDEMPOTENCY_KEY_REUSED"]);
  assert.equal(drift.body.retryable, false);
  assert.equal(finalizeCalls, 1);

  const noBytes = engagementBody({ key: "postgres-engagement-api-no-bytes", engagementId: "postgres-engagement-api-no-bytes", bytes: null });
  const noBytesCreated = await run(noBytes);
  const noBytesReplay = await run(noBytes);
  assert.equal(noBytesCreated.status, 201);
  assert.equal(noBytesReplay.status, 200);
  assert.deepEqual([noBytesCreated.body.idempotent_replay, noBytesReplay.body.idempotent_replay], [false, true]);
  assert.equal(finalizeCalls, 1);
  assert.equal((await postgres.adminPool.query(
    "SELECT count(*)::int AS count FROM lawos_dms.upload_sessions WHERE tenant_id = $1",
    [TENANT],
  )).rows[0].count, 1);
  const intakeCounts = (await postgres.adminPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_domain.records WHERE tenant_id = $1 AND domain_id = 'intake'
         AND record_type IN ('Engagement', 'EngagementTemplateDocument', 'EngagementSignedDocumentUpload')) AS records,
       (SELECT count(*)::int FROM lawos_domain.idempotency_keys WHERE tenant_id = $1 AND domain_id = 'intake') AS idempotency,
       (SELECT count(*)::int FROM lawos_domain.audit_events WHERE tenant_id = $1 AND domain_id = 'intake') AS audit,
       (SELECT count(*)::int FROM lawos_domain.outbox_events WHERE tenant_id = $1 AND domain_id = 'intake') AS outbox`,
    [TENANT],
  )).rows[0];
  assert.deepEqual(intakeCounts, { records: 6, idempotency: 2, audit: 6, outbox: 6 });
});
