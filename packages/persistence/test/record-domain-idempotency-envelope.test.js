import assert from "node:assert/strict";
import test from "node:test";

import { INTAKE_DOMAIN_DESCRIPTOR } from "../../intake/src/central-ledger.js";
import { createIntakeRuntimeRepository } from "../../intake/src/runtime-repository.js";
import {
  decodeRecordDomainIdempotencyResponse,
  materializeRecordRepositoryFromDomainLedger,
} from "../src/record-domain-adapter.js";

const TENANT = "tenant-record-domain-envelope";
const AUTHORITY = Object.freeze({
  operation: "engagement_approve",
  actor_id: "actor-record-domain-envelope",
  object_type: "Engagement",
  object_id: "engagement-record-domain-envelope",
  request_fingerprint: "a".repeat(64),
});
const MALFORMED_WRAPPER = Object.freeze({
  __lawos_idempotency_authority_v1: AUTHORITY,
  __lawos_idempotency_response_v1: null,
  unexpected_outer_field: "must-not-materialize",
});

test("materialization rejects wrapped idempotency envelopes with unexpected outer fields", async () => {
  assert.throws(
    () => decodeRecordDomainIdempotencyResponse(MALFORMED_WRAPPER),
    /idempotency response envelope contains unexpected fields/u,
  );
  assert.deepEqual(decodeRecordDomainIdempotencyResponse(
    MALFORMED_WRAPPER,
    { inspection: true },
  ), {
    authority: null,
    authority_state: "malformed",
    authority_operation_hint: "engagement_approve",
    response: null,
  });
  await assert.rejects(materializeRecordRepositoryFromDomainLedger({
    ledger: {
      list: async () => [],
      listIdempotency: async () => [{
        key: "malformed-wrapper", request_hash: "b".repeat(64),
        response: MALFORMED_WRAPPER, created_at: "2026-08-09T00:00:00.000Z",
      }],
      listAudit: async () => [],
    },
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createIntakeRuntimeRepository,
  }), /idempotency response envelope contains unexpected fields/u);
});

test("materialization uses the durable request hash over a mismatched valid authority wrapper", async () => {
  const repository = await materializeRecordRepositoryFromDomainLedger({
    ledger: {
      list: async () => [],
      listIdempotency: async () => [{
        key: "mismatched-wrapper", request_hash: "b".repeat(64),
        response: {
          outcome: "must-not-replay",
          __lawos_idempotency_authority_v1: AUTHORITY,
        },
        created_at: "2026-08-09T00:00:00.000Z",
      }],
      listAudit: async () => [],
    },
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createIntakeRuntimeRepository,
  });
  assert.deepEqual(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "mismatched-wrapper",
  }), {
    tenant_id: TENANT,
    idempotency_key: "mismatched-wrapper",
    operation: AUTHORITY.operation,
    object_type: AUTHORITY.object_type,
    object_id: AUTHORITY.object_id,
    actor_id: AUTHORITY.actor_id,
    request_fingerprint: "b".repeat(64),
    response: { outcome: "must-not-replay" },
    created_at: "2026-08-09T00:00:00.000Z",
  });
  repository.close();
});
