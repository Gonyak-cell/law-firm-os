import assert from "node:assert/strict";
import test from "node:test";

import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { approveEngagement } from "../src/engagement-service.js";
import { inspectEngagementLegacyIdempotencyEntries } from "../src/engagement-legacy-idempotency-readiness.js";
import { createIntakeRuntimeRepository } from "../src/runtime-repository.js";

const TENANT = "tenant-engagement-readiness-classifier";
const ACTOR = "actor-engagement-readiness-classifier";
const KEY = "engagement-readiness-classifier";
const AUTHORITY_FIELD = "__lawos_idempotency_authority_v1";
const RESPONSE_FIELD = "__lawos_idempotency_response_v1";

function entry(response, authority) {
  return {
    key: KEY,
    request_hash: authority?.request_fingerprint ?? "a".repeat(64),
    response: response && typeof response === "object" && !Array.isArray(response)
      ? { ...response, [AUTHORITY_FIELD]: authority }
      : { [AUTHORITY_FIELD]: authority, [RESPONSE_FIELD]: response },
  };
}

test("readiness accepts only a canonical current engagement authority and response", async () => {
  const repository = createIntakeRuntimeRepository();
  const publicResponse = await approveEngagement({
    repository,
    engagement: {
      engagement_id: "engagement-readiness-classifier",
      tenant_id: TENANT,
      intake_request_id: "intake-readiness-classifier",
      signed_document_id: "document-readiness-classifier",
      signature_ref: "signature:document-readiness-classifier",
      signed_document_upload: {
        signed_document_upload_id: "signed-upload-readiness-classifier",
        document_id: "document-readiness-classifier",
        content_sha256: "b".repeat(64),
        byte_size: 2048,
        mime_type: "application/pdf",
      },
    },
    actor_id: ACTOR,
    idempotency_key: KEY,
  });
  const stored = repository.getIdempotency({ tenant_id: TENANT, idempotency_key: KEY });
  repository.close();
  const authority = Object.freeze({
    operation: stored.operation,
    actor_id: stored.actor_id,
    object_type: stored.object_type,
    object_id: stored.object_id,
    request_fingerprint: stored.request_fingerprint,
  });
  assert.equal(inspectEngagementLegacyIdempotencyEntries([
    entry(stored.response, authority),
  ]).ready, true);

  const cases = [
    publicResponse,
    null,
    "scalar-parent-response",
    { ...stored.response, signed_document_upload: null },
    { ...stored.response, signed_document_upload: {
      ...stored.response.signed_document_upload,
      signature_ref: "signature:cross-link-drift",
    } },
    { ...stored.response, engagement: {
      ...stored.response.engagement,
      storage_pointer_ref: "s3://must-remain-unresolved",
    } },
  ];
  for (const candidate of cases) {
    const readiness = inspectEngagementLegacyIdempotencyEntries([
      entry(candidate, authority),
    ]);
    assert.deepEqual({
      ready: readiness.ready,
      unresolved: readiness.legacy_unresolved_count,
      invalid_current: readiness.invalid_current_authority_count,
    }, { ready: false, unresolved: 1, invalid_current: 1 });
    assert.equal(JSON.stringify(readiness).includes("must-remain-unresolved"), false);
  }

  const parentHash = hashDomainValue({ operation: "engagement_approve", key: KEY });
  const legacyShapes = [
    { key: KEY, request_hash: parentHash, response: { outcome: "damaged" } },
    entry(null, { operation: "engagement_approve", actor_id: ACTOR }),
    entry(null, { ...authority, unknown_authority_field: true }),
  ];
  for (const candidate of legacyShapes) {
    const readiness = inspectEngagementLegacyIdempotencyEntries([candidate]);
    assert.equal(readiness.ready, false);
    assert.equal(readiness.legacy_unresolved_count, 1);
  }

  const unrelated = inspectEngagementLegacyIdempotencyEntries([{
    key: "unrelated-idempotency",
    request_hash: "c".repeat(64),
    response: { outcome: "approved", object: { model_type: "UnrelatedIntakeDecision" } },
  }]);
  assert.equal(unrelated.ready, true);
});
