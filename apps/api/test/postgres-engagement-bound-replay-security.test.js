import assert from "node:assert/strict";
import test from "node:test";

import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { prepareEngagementApproval } from "../../../packages/intake/src/engagement-approval-command.js";
import { inspectPostgresEngagementLegacyIdempotency } from "../../../packages/intake/src/engagement-legacy-idempotency-readiness.js";
import {
  ENGAGEMENT_APPROVAL_BINDING_FIELD,
  engagementApprovalReplayAuthorityDigest,
} from "../../../packages/intake/src/engagement-approval-response.js";
import { approveEngagement } from "../../../packages/intake/src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIntakeEngagementCompletionCheckpoint } from "../src/intake-engagement-completion-checkpoint.js";
import { handleCrmIntakeApiRequest } from "../src/crm-intake-runtime-context.js";

const TENANT = "tenant-postgres-engagement-bound-replay";
const ACTOR = "actor-postgres-engagement-bound-replay";
const KEY = "postgres-engagement-bound-replay";
const ENGAGEMENT = Object.freeze({
  engagement_id: "engagement-postgres-bound-replay",
  tenant_id: TENANT,
  intake_request_id: "intake-postgres-bound-replay",
  template_id: "matter_engagement_letter",
  signed_document_id: "document-postgres-bound-replay",
  signature_ref: "signature:document-postgres-bound-replay",
  signed_document_upload: Object.freeze({
    signed_document_upload_id: "signed-upload-postgres-bound-replay",
    document_id: "document-postgres-bound-replay",
    content_sha256: "a".repeat(64),
    byte_size: 2048,
    mime_type: "application/pdf",
  }),
});

async function stateHash(pool) {
  const [records, idempotency, audits, outbox] = await Promise.all([
    pool.query("SELECT * FROM lawos_domain.records WHERE tenant_id = $1 ORDER BY record_type, record_id", [TENANT]),
    pool.query("SELECT * FROM lawos_domain.idempotency_keys WHERE tenant_id = $1 ORDER BY idempotency_key", [TENANT]),
    pool.query("SELECT * FROM lawos_domain.audit_events WHERE tenant_id = $1 ORDER BY event_id", [TENANT]),
    pool.query("SELECT * FROM lawos_domain.outbox_events WHERE tenant_id = $1 ORDER BY event_id", [TENANT]),
  ]);
  return hashDomainValue({ records: records.rows, idempotency: idempotency.rows, audits: audits.rows, outbox: outbox.rows });
}

test("PostgreSQL API never reflects unsafe fields from a bound engagement replay", { timeout: 30_000 }, async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const ledger = createPostgresDomainLedger({ pool: postgres.appPool });
  const repository = createIntakeRuntimeRepository({ seedRecords: [{
    model_type: "IntakeRequest", intake_request_id: "intake-postgres-bound-replay",
    tenant_id: TENANT, opportunity_id: "opportunity-postgres-bound-replay",
    requesting_party_id: "party-postgres-bound-replay", party_ids: ["party-postgres-bound-replay"],
    status: "open", owner_user_id: ACTOR,
  }] });
  await approveEngagement({ repository, engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY });
  await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    repositories: [{ source_id: "bound-engagement-replay", repository }],
    tenant_id: TENANT,
  }).snapshot);
  repository.close();
  const canonicalStoredResponse = (await postgres.adminPool.query(
    `SELECT response FROM lawos_domain.idempotency_keys
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY],
  )).rows[0].response;

  const checkpoint = createPostgresIntakeEngagementCompletionCheckpoint({ ledger });
  const requestRepository = createIntakeRuntimeRepository();
  t.after(() => requestRepository.close());
  let providerCalls = 0;
  const request = () => handleCrmIntakeApiRequest({
    pathname: "/api/intake/engagements", method: "POST", query: {},
    body: {
      tenant_id: TENANT, permission_ref: "permission-bound-replay",
      audit_hint_ref: "audit-bound-replay", idempotency_key: KEY, engagement: ENGAGEMENT,
    },
    context: Object.freeze({
      principal: Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: [], scopes: [] }),
      rules: Object.freeze([{ id: "allow-bound-replay", effect: "allow", action: "intake:engagement:write" }]),
      object_acl: Object.freeze([]),
    }),
    requestId: "request-postgres-bound-replay",
    runtime: Object.freeze({
      intakeRepository: requestRepository,
      dmsRuntime: Object.freeze({ upload_runtime: Object.freeze({
        async uploadDocument() { providerCalls += 1; throw new Error("provider must not run"); },
      }) }),
      engagementApprovalCheckpoint: checkpoint,
    }),
  });

  const beforeExactReplay = await stateHash(postgres.adminPool);
  const replay = await request();
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent_replay, true);
  assert.equal(await stateHash(postgres.adminPool), beforeExactReplay);
  assert.equal(providerCalls, 0);

  const resealed = structuredClone(canonicalStoredResponse);
  resealed.engagement.owner_module = "attacker-resealed";
  const publicResponse = { ...resealed };
  delete publicResponse[ENGAGEMENT_APPROVAL_BINDING_FIELD];
  delete publicResponse.__lawos_idempotency_authority_v1;
  resealed[ENGAGEMENT_APPROVAL_BINDING_FIELD].response_sha256 = hashDomainValue(publicResponse);
  resealed.__lawos_idempotency_authority_v1.request_fingerprint =
    engagementApprovalReplayAuthorityDigest({
      request_fingerprint: prepareEngagementApproval({
        engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
      }).request_fingerprint,
      response_sha256: resealed[ENGAGEMENT_APPROVAL_BINDING_FIELD].response_sha256,
    });
  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys SET response = $3::jsonb
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY, JSON.stringify(resealed)],
  );
  const resealedReadiness = await inspectPostgresEngagementLegacyIdempotency({
    ledger, tenant_id: TENANT,
  });
  assert.equal(resealedReadiness.ready, false);
  assert.equal(resealedReadiness.invalid_current_authority_count, 1);
  const beforeResealedReplay = await stateHash(postgres.adminPool);
  const resealedReplay = await request();
  assert.equal(resealedReplay.status, 409);
  assert.deepEqual(resealedReplay.body.safe_error_codes, [
    "DOMAIN_IDEMPOTENCY_AUTHORITY_MISMATCH",
  ]);
  assert.equal(JSON.stringify(resealedReplay.body).includes("attacker-resealed"), false);
  assert.equal(await stateHash(postgres.adminPool), beforeResealedReplay);
  assert.equal(providerCalls, 0);
  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys SET response = $3::jsonb
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY, JSON.stringify(canonicalStoredResponse)],
  );

  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys
        SET response = jsonb_set(
          jsonb_set(response, '{engagement,storage_pointer_ref}', to_jsonb($3::text), true),
          '{signed_document_upload,raw_path}', to_jsonb($4::text), true)
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY, "s3://bound-replay-secret", "/bound/replay/secret"],
  );
  const beforeUnsafeReplay = await stateHash(postgres.adminPool);
  const unsafe = await request();
  assert.equal(unsafe.status, 409);
  assert.deepEqual(unsafe.body.safe_error_codes, [
    "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
  ]);
  assert.equal(JSON.stringify(unsafe.body).includes("bound-replay-secret"), false);
  assert.equal(await stateHash(postgres.adminPool), beforeUnsafeReplay);
  assert.equal(providerCalls, 0);

  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys
        SET response = ((response - '__lawos_engagement_approval_binding_v1')
          #- '{engagement,storage_pointer_ref}') #- '{signed_document_upload,raw_path}'
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY],
  );
  const beforeMissingBinding = await stateHash(postgres.adminPool);
  const missingBinding = await request();
  assert.equal(missingBinding.status, 409);
  assert.deepEqual(missingBinding.body.safe_error_codes, [
    "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
  ]);
  assert.equal(await stateHash(postgres.adminPool), beforeMissingBinding);
  assert.equal(providerCalls, 0);

  await postgres.adminPool.query(
    `UPDATE lawos_domain.idempotency_keys
        SET response = jsonb_set(response, '{engagement,matter_id}', $3::jsonb, true)
      WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
    [TENANT, KEY, JSON.stringify({ raw_path: "/nested/known-field" })],
  );
  const beforeInvalidReplay = await stateHash(postgres.adminPool);
  const invalid = await request();
  assert.equal(invalid.status, 409);
  assert.deepEqual(invalid.body.safe_error_codes, [
    "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
  ]);
  assert.equal(JSON.stringify(invalid.body).includes("nested/known-field"), false);
  assert.equal(await stateHash(postgres.adminPool), beforeInvalidReplay);
  assert.equal(providerCalls, 0);

  for (const mutate of [
    (response) => ({ ...response, engagement: { ...response.engagement, approval_state: "draft" } }),
    (response) => ({ ...response, engagement: { ...response.engagement, production_ready_claim: true } }),
    (response) => ({ ...response, audit_event: { ...response.audit_event, decision: "deny" } }),
  ]) {
    await postgres.adminPool.query(
      `UPDATE lawos_domain.idempotency_keys SET response = $3::jsonb
        WHERE tenant_id = $1 AND domain_id = 'intake' AND idempotency_key = $2`,
      [TENANT, KEY, JSON.stringify(mutate(canonicalStoredResponse))],
    );
    const beforeDerivedDrift = await stateHash(postgres.adminPool);
    const derivedDrift = await request();
    assert.equal(derivedDrift.status, 409);
    assert.deepEqual(derivedDrift.body.safe_error_codes, [
      "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
    ]);
    assert.equal(await stateHash(postgres.adminPool), beforeDerivedDrift);
    assert.equal(providerCalls, 0);
  }
});
