import assert from "node:assert/strict";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { prepareEngagementApproval } from "../../../packages/intake/src/engagement-approval-command.js";
import { approveEngagement } from "../../../packages/intake/src/engagement-service.js";
import { inspectPostgresEngagementLegacyIdempotency } from "../../../packages/intake/src/engagement-legacy-idempotency-readiness.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIntakeEngagementCompletionCheckpoint } from "../src/intake-engagement-completion-checkpoint.js";
import { handleCrmIntakeApiRequest } from "../src/crm-intake-runtime-context.js";

const TENANT = "tenant-postgres-engagement-legacy-review";
const OTHER_TENANT = "tenant-postgres-engagement-legacy-other";
const ACTOR = "actor-postgres-engagement-legacy-review";
const KEY = "postgres-engagement-legacy-review-key";
const BYTES = Buffer.from("%PDF-1.4\npostgres legacy engagement\n%%EOF\n");
const AUTHORITY_FIELD = "__lawos_idempotency_authority_v1";

function engagement(tenantId = TENANT) {
  return {
    engagement_id: "engagement-postgres-legacy-review",
    tenant_id: tenantId,
    intake_request_id: "intake-postgres-legacy-review",
    signed_document_id: "document-postgres-legacy-review",
    signature_ref: "signature:document-postgres-legacy-review",
    signed_document_upload: {
      signed_document_upload_id: "signed-upload-postgres-legacy-review",
      document_id: "document-postgres-legacy-review",
      bytes_base64: BYTES.toString("base64"),
      byte_size: BYTES.byteLength,
      mime_type: "application/pdf",
    },
  };
}

async function tenantState(pool) {
  const [records, idempotency, audits, outbox] = await Promise.all([
    pool.query("SELECT * FROM lawos_domain.records WHERE tenant_id = $1 ORDER BY record_type, record_id", [TENANT]),
    pool.query("SELECT * FROM lawos_domain.idempotency_keys WHERE tenant_id = $1 ORDER BY idempotency_key", [TENANT]),
    pool.query("SELECT * FROM lawos_domain.audit_events WHERE tenant_id = $1 ORDER BY event_id", [TENANT]),
    pool.query("SELECT * FROM lawos_domain.outbox_events WHERE tenant_id = $1 ORDER BY event_id", [TENANT]),
  ]);
  return hashDomainValue({
    records: records.rows,
    idempotency: idempotency.rows,
    audits: audits.rows,
    outbox: outbox.rows,
  });
}

test("PostgreSQL restart classifies absent, partial, and unknown parent authority for manual review", { timeout: 30_000 }, async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const ledger = createPostgresDomainLedger({ pool: postgres.appPool });
  const repository = createIntakeRuntimeRepository({
    seedRecords: [{
      model_type: "IntakeRequest",
      intake_request_id: "intake-postgres-legacy-review",
      tenant_id: TENANT,
      opportunity_id: "opportunity-postgres-legacy-review",
      requesting_party_id: "party-postgres-legacy-review",
      party_ids: ["party-postgres-legacy-review"],
      status: "open",
      owner_user_id: ACTOR,
      created_at: "2026-08-08T00:00:00.000Z",
      updated_at: "2026-08-08T00:00:00.000Z",
    }],
  });
  const dms = createDmsRepository();
  const first = await approveEngagement({
    repository,
    engagement: engagement(),
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_repository: dms,
    dms_storage: createLocalStorageAdapter({ adapter_id: "postgres-legacy-seed-storage" }),
  });
  repository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: KEY,
    operation: "engagement_approve",
    response: {
      ...first,
      signed_document_upload: {
        ...first.signed_document_upload,
        parent_unknown_provider_alias: "ambiguous-parent-authority",
      },
    },
    created_at: "2026-08-08T00:00:00.000Z",
  });
  await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    repositories: [{ source_id: "parent-engagement-legacy-review", repository }],
    tenant_id: TENANT,
  }).snapshot);
  repository.close();
  dms.close();

  const checkpoint = createPostgresIntakeEngagementCompletionCheckpoint({ ledger });
  const requestRepository = createIntakeRuntimeRepository();
  t.after(() => requestRepository.close());
  let providerCalls = 0;
  const request = () => approveEngagement({
    repository: requestRepository,
    engagement: engagement(),
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_upload_runtime: { async uploadDocument() { providerCalls += 1; throw new Error("provider must not run"); } },
    engagement_approval_checkpoint: checkpoint,
  });
  const assertManualReviewWithoutMutation = async () => {
    const before = await tenantState(postgres.adminPool);
    const results = await Promise.allSettled([request(), request()]);
    assert.deepEqual(results.map(({ status }) => status), ["rejected", "rejected"]);
    assert.deepEqual(results.map(({ reason }) => [
      reason?.safe_error_code, reason?.status, reason?.retryable,
    ]), [
      ["INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW", 409, false],
      ["INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW", 409, false],
    ]);
    assert.equal(await tenantState(postgres.adminPool), before);
    assert.equal(providerCalls, 0);
  };

  await assertManualReviewWithoutMutation();
  assert.deepEqual({
    absent: (await inspectPostgresEngagementLegacyIdempotency({ ledger, tenant_id: TENANT })).absent_authority_count,
    partial: (await inspectPostgresEngagementLegacyIdempotency({ ledger, tenant_id: TENANT })).partial_authority_count,
  }, { absent: 1, partial: 0 });
  const prepared = prepareEngagementApproval({ engagement: engagement(), actor_id: ACTOR, idempotency_key: KEY });
  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys
        SET response = response || jsonb_build_object($3::text, $4::jsonb)
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY, AUTHORITY_FIELD, JSON.stringify({ operation: "engagement_approve", actor_id: ACTOR })],
  );
  await assertManualReviewWithoutMutation();
  assert.deepEqual({
    partial: (await inspectPostgresEngagementLegacyIdempotency({ ledger, tenant_id: TENANT })).partial_authority_count,
    malformed: (await inspectPostgresEngagementLegacyIdempotency({ ledger, tenant_id: TENANT })).malformed_authority_count,
  }, { partial: 1, malformed: 0 });
  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys
        SET response = response || jsonb_build_object($3::text, $4::jsonb)
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY, AUTHORITY_FIELD, JSON.stringify({
      operation: "engagement_approve", actor_id: ACTOR, object_type: "Engagement",
      object_id: prepared.engagement_id, request_fingerprint: prepared.request_fingerprint,
      unknown_authority_field: true,
    })],
  );
  await assertManualReviewWithoutMutation();

  await postgres.adminPool.query(
    `INSERT INTO lawos_domain.idempotency_keys
       (tenant_id, domain_id, idempotency_key, request_hash, response, created_at)
     VALUES ($1, 'intake', $2, $3, $4::jsonb, now())`,
    [TENANT, "unrelated-approved-outcome", hashDomainValue({ unrelated: true }), JSON.stringify({
      outcome: "approved",
      engagement: { model_type: "UnrelatedIntakeDecision", tenant_id: TENANT },
    })],
  );
  const readiness = await inspectPostgresEngagementLegacyIdempotency({ ledger, tenant_id: TENANT });
  assert.deepEqual({
    ready: readiness.ready,
    inspected: readiness.inspected_idempotency_count,
    unresolved: readiness.legacy_unresolved_count,
    malformed: readiness.malformed_authority_count,
    digest: /^[a-f0-9]{64}$/u.test(readiness.inventory_sha256),
    raw_ids: readiness.raw_ids_included,
    raw_keys: readiness.raw_keys_included,
    responses: readiness.response_payloads_included,
  }, {
    ready: false, inspected: 2, unresolved: 1, malformed: 1, digest: true,
    raw_ids: false, raw_keys: false, responses: false,
  });
  const serializedReadiness = JSON.stringify(readiness);
  assert.equal(serializedReadiness.includes(TENANT), false);
  assert.equal(serializedReadiness.includes(KEY), false);
  assert.equal(serializedReadiness.includes("ambiguous-parent-authority"), false);
  assert.equal((await inspectPostgresEngagementLegacyIdempotency({
    ledger, tenant_id: OTHER_TENANT,
  })).ready, true);

  const beforeHttp = await tenantState(postgres.adminPool);
  const http = await handleCrmIntakeApiRequest({
    pathname: "/api/intake/engagements",
    method: "POST",
    query: {},
    body: {
      tenant_id: TENANT,
      permission_ref: "permission-postgres-legacy-review",
      audit_hint_ref: "audit-postgres-legacy-review",
      idempotency_key: KEY,
      engagement: engagement(),
    },
    context: Object.freeze({
      principal: Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: Object.freeze([]), scopes: Object.freeze([]) }),
      rules: Object.freeze([{ id: "allow-postgres-legacy-review", effect: "allow", action: "intake:engagement:write" }]),
      object_acl: Object.freeze([]),
    }),
    requestId: "request-postgres-engagement-legacy-review",
    runtime: Object.freeze({
      intakeRepository: requestRepository,
      dmsRuntime: Object.freeze({ upload_runtime: Object.freeze({
        async uploadDocument() { providerCalls += 1; throw new Error("provider must not run"); },
      }) }),
      engagementApprovalCheckpoint: checkpoint,
    }),
  });
  assert.equal(http.status, 409);
  assert.deepEqual(http.body.safe_error_codes, [
    "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
  ]);
  assert.equal(http.body.retryable, false);
  assert.equal(JSON.stringify(http.body).includes("ambiguous-parent-authority"), false);
  assert.equal(await tenantState(postgres.adminPool), beforeHttp);
  assert.equal(providerCalls, 0);

  assert.equal(await checkpoint.read({ prepared: prepareEngagementApproval({
    engagement: engagement(OTHER_TENANT), actor_id: ACTOR, idempotency_key: KEY,
  }) }), null);
});
