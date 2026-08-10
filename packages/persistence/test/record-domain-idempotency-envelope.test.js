import assert from "node:assert/strict";
import test from "node:test";

import { INTAKE_DOMAIN_DESCRIPTOR } from "../../intake/src/central-ledger.js";
import { createIntakeRuntimeRepository } from "../../intake/src/runtime-repository.js";
import {
  createRecordRepositoryDomainSnapshot,
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

function snapshotWithIdempotency(entry) {
  return createRecordRepositoryDomainSnapshot({
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    repositories: {
      snapshot: () => ({ records: [], idempotency: [entry], audit_events: [] }),
    },
  }).snapshot;
}

function ledgerFor(snapshot) {
  return {
    list: async () => snapshot.records,
    listIdempotency: async () => snapshot.idempotency_entries,
    listAudit: async () => snapshot.audit_events,
  };
}

function authorityMismatch(error) {
  return error?.code === "LAWOS_DOMAIN_IDEMPOTENCY_AUTHORITY_MISMATCH"
    && error.safe_error_code === "DOMAIN_IDEMPOTENCY_AUTHORITY_MISMATCH"
    && error.message === "idempotency authority does not match durable request hash"
    && !Object.hasOwn(error, "idempotency_key")
    && !Object.hasOwn(error, "request_hash")
    && !Object.hasOwn(error, "request_fingerprint");
}

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

test("materialization rejects a valid authority wrapper that disagrees with the durable request hash", async () => {
  let repository;
  try {
    await assert.rejects(materializeRecordRepositoryFromDomainLedger({
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
      create_repository: (options) => {
        repository = createIntakeRuntimeRepository(options);
        return repository;
      },
    }), authorityMismatch);
    assert.equal(repository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: "mismatched-wrapper",
    }), undefined);
  } finally {
    repository?.close();
  }
});

test("snapshot normalization rejects divergent durable and authority request hashes", () => {
  assert.throws(() => snapshotWithIdempotency({
    tenant_id: TENANT,
    idempotency_key: "snapshot-mismatched-wrapper",
    operation: AUTHORITY.operation,
    actor_id: AUTHORITY.actor_id,
    object_type: AUTHORITY.object_type,
    object_id: AUTHORITY.object_id,
    request_hash: "b".repeat(64),
    request_fingerprint: AUTHORITY.request_fingerprint,
    response: { outcome: "must-not-snapshot" },
    created_at: "2026-08-09T00:00:00.000Z",
  }), authorityMismatch);
});

test("equal durable and authority hashes round-trip through snapshot materialization", async () => {
  const snapshot = snapshotWithIdempotency({
    tenant_id: TENANT,
    idempotency_key: "snapshot-equal-wrapper",
    operation: AUTHORITY.operation,
    actor_id: AUTHORITY.actor_id,
    object_type: AUTHORITY.object_type,
    object_id: AUTHORITY.object_id,
    request_hash: AUTHORITY.request_fingerprint,
    request_fingerprint: AUTHORITY.request_fingerprint,
    response: { outcome: "canonical" },
    created_at: "2026-08-09T00:00:00.000Z",
  });
  const repository = await materializeRecordRepositoryFromDomainLedger({
    ledger: ledgerFor(snapshot), descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT, create_repository: createIntakeRuntimeRepository,
  });
  assert.equal(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "snapshot-equal-wrapper",
  }).request_fingerprint, AUTHORITY.request_fingerprint);
  repository.close();
});

test("materialization preserves legacy idempotency without an authority wrapper", async () => {
  const snapshot = snapshotWithIdempotency({
    tenant_id: TENANT,
    idempotency_key: "legacy-wrapper-absent",
    request_hash: "b".repeat(64),
    response: { outcome: "legacy" },
    created_at: "2026-08-09T00:00:00.000Z",
  });
  const repository = await materializeRecordRepositoryFromDomainLedger({
    ledger: ledgerFor(snapshot),
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createIntakeRuntimeRepository,
  });
  assert.deepEqual(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "legacy-wrapper-absent",
  }), {
    tenant_id: TENANT,
    idempotency_key: "legacy-wrapper-absent",
    operation: `request-hash:${"b".repeat(64)}`,
    object_type: null,
    object_id: null,
    actor_id: null,
    request_fingerprint: null,
    response: { outcome: "legacy" },
    created_at: "2026-08-09T00:00:00.000Z",
  });
  repository.close();
});
