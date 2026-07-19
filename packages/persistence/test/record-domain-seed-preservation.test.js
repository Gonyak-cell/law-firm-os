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
import { createUiReadinessRepository } from "../../platform/src/ui-readiness-repository.js";

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
