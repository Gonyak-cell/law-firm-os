import assert from "node:assert/strict";
import test from "node:test";
import { createAiGovernanceRepository } from "../../ai-governance/src/runtime-repository.js";
import { createAnalyticsRepository } from "../../analytics/src/runtime-repository.js";
import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import { createClientPortalRepository } from "../../client-portal/src/runtime-repository.js";
import { createCrmRuntimeRepository } from "../../crm/src/runtime-repository.js";
import { createDmsRepository } from "../../dms/src/repository.js";
import { createEnterpriseReadinessRepository } from "../../enterprise/src/enterprise-readiness-repository.js";
import { createIntakeRuntimeRepository } from "../../intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../../master-data/src/repository.js";
import { createMatterRepository } from "../../matter/src/repository.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../matter/src/central-ledger.js";
import { createUiReadinessRepository } from "../../platform/src/ui-readiness-repository.js";
import {
  createRecordRepositoryDomainSnapshot,
  materializeRecordRepositoryFromDomainLedger,
} from "../src/record-domain-adapter.js";

const TENANT = "tenant_seed_preservation_synthetic";
const UPDATED_AT = "2026-07-18T07:00:00.000Z";

const GENERIC_RECORD = Object.freeze({
  tenant_id: TENANT,
  model_type: "RuntimeAuthorityProbe",
  resource_id: "runtime-authority-probe-001",
  updated_at: UPDATED_AT,
  synthetic_only: true,
});

const REPOSITORIES = Object.freeze([
  ["master-data", createMasterDataRepository, Object.freeze({
    tenant_id: TENANT,
    model_type: "Party",
    party_id: "party-seed-preservation-001",
    party_type: "person",
    display_name: "Synthetic Seed Preservation",
    status: "active",
    owner_user_id: "user-seed-preservation",
    updated_at: UPDATED_AT,
    synthetic_only: true,
  })],
  ["matter", createMatterRepository, GENERIC_RECORD],
  ["dms", createDmsRepository, Object.freeze({
    ...GENERIC_RECORD,
    model_type: "VaultSearchPreferences",
  })],
  ["crm", createCrmRuntimeRepository, GENERIC_RECORD],
  ["intake", createIntakeRuntimeRepository, GENERIC_RECORD],
  ["finance", createFinanceRepository, GENERIC_RECORD],
  ["analytics", createAnalyticsRepository, GENERIC_RECORD],
  ["ai-governance", createAiGovernanceRepository, GENERIC_RECORD],
  ["client-portal", createClientPortalRepository, GENERIC_RECORD],
  ["ui-readiness", createUiReadinessRepository, GENERIC_RECORD],
  ["enterprise-readiness", createEnterpriseReadinessRepository, GENERIC_RECORD],
]);

for (const [domain, createRepository, record] of REPOSITORIES) {
  test(`${domain} materialization preserves PostgreSQL seed bytes`, () => {
    const repository = createRepository({ seedRecords: [record], preserveSeedRecords: true });
    try {
      assert.deepEqual(repository.snapshot().records, [record]);
    } finally {
      repository.close();
    }
  });
}

test("Matter idempotency authority survives a PostgreSQL domain-ledger round trip", async () => {
  const repository = createMatterRepository();
  repository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: "matter-opening-authority-round-trip",
    operation: "matter_vault_opening",
    object_type: "Matter",
    object_id: "matter-authority-round-trip",
    actor_id: "user-authority-round-trip",
    request_fingerprint: "a".repeat(64),
    response: { outcome: "created", matter: { tenant_id: TENANT, matter_id: "matter-authority-round-trip" } },
  });
  const snapshot = createRecordRepositoryDomainSnapshot({
    descriptor: MATTER_DOMAIN_DESCRIPTOR,
    repositories: repository,
    tenant_id: TENANT,
  }).snapshot;
  assert.equal(snapshot.idempotency_entries[0].request_hash, "a".repeat(64));

  const materialized = await materializeRecordRepositoryFromDomainLedger({
    ledger: {
      list: async () => [],
      listIdempotency: async () => snapshot.idempotency_entries,
      listAudit: async () => [],
    },
    descriptor: MATTER_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createMatterRepository,
  });
  const replay = materialized.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "matter-opening-authority-round-trip",
  });
  assert.deepEqual({
    operation: replay.operation,
    object_type: replay.object_type,
    object_id: replay.object_id,
    actor_id: replay.actor_id,
    request_fingerprint: replay.request_fingerprint,
  }, {
    operation: "matter_vault_opening",
    object_type: "Matter",
    object_id: "matter-authority-round-trip",
    actor_id: "user-authority-round-trip",
    request_fingerprint: "a".repeat(64),
  });
  assert.equal(Object.hasOwn(replay.response, "__lawos_idempotency_authority_v1"), false);
});
