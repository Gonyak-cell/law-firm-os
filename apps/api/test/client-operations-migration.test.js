import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_OPERATIONS_MIGRATION_ID_MAP,
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  createClientOperationsMigrationPlan,
  selectClientOperationsReadPath,
} from "../src/client-operations-migration.js";
import {
  resolveClientOperationsV2Enabled,
} from "../src/client-operations-config.js";
import {
  CLIENT_OPERATIONS_MODEL_REGISTRY,
  validateClientOperationsModelRegistry,
} from "../src/client-operations-model-registry.js";
import {
  clientOperationSources,
} from "./helpers/client-operations-migration-fixture.js";

test("Client catalog, registry provenance, and rollback defaults are stable", async () => {
  assert.deepEqual(validateClientOperationsModelRegistry(), {
    model_count: 13,
    registry_sha256:
      "fdf387d7e1fbddf40d9441ef3acc405ef9d1d6804c5b6112cfe9afebfd81ff30",
  });
  assert.equal(
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
    68,
  );
  assert.equal(
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.client_schema_migration_count,
    3,
  );
  assert.equal(
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
    "aa15f73279daeaf4971a3d33bfcf76182148ee4473aef858f6a6e882425dd6e0",
  );
  assert.deepEqual(
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.slice(-3).map(
      ({ id }) => id,
    ),
    [
      "300_client_m365_connection",
      "301_client_inquiry_evidence",
      "302_client_email_filing_correction",
    ],
  );
  assert.deepEqual(CLIENT_OPERATIONS_MIGRATION_ID_MAP, {
    "001_m365_connection": "300_client_m365_connection",
    "002_inquiry_evidence":
      "301_client_inquiry_evidence",
    "003_email_filing_correction":
      "302_client_email_filing_correction",
  });
  assert.equal(
    CLIENT_OPERATIONS_MODEL_REGISTRY.entries.find(
      ({ model_type }) => model_type === "CRMActivity",
    ).source_tuw,
    "CL-P3-W02-T03",
  );
  assert.equal(
    CLIENT_OPERATIONS_MODEL_REGISTRY.entries.every(
      (entry) => (
        entry.persistence_classification
          === "generic-domain-ledger-persisted"
        && entry.postgres_destination
          === "lawos_domain.records"
        && entry.postgres_discriminator.domain_id
          === entry.domain_id
        && entry.postgres_discriminator.record_type
          === entry.model_type
      ),
    ),
    true,
  );
  assert.throws(
    () => validateClientOperationsModelRegistry({
      ...CLIENT_OPERATIONS_MODEL_REGISTRY,
      registry_sha256: "0".repeat(64),
    }),
    /digest/u,
  );

  const plan = createClientOperationsMigrationPlan({
    snapshots: clientOperationSources(),
  });
  assert.deepEqual(
    plan.plan().map(({ id }) => id),
    [
      "client_operations_crm",
      "client_operations_finance",
      "client_operations_email_dms",
    ],
  );
  assert.equal(plan.run().rollback_available, false);
  assert.equal(
    (await selectClientOperationsReadPath()).read_path,
    "legacy-client-v1",
  );
});

test("Client v2 runtime configuration is validated and defaults false", () => {
  assert.equal(
    resolveClientOperationsV2Enabled({ env: {} }),
    false,
  );
  assert.equal(
    resolveClientOperationsV2Enabled({
      env: {
        LAWOS_CLIENT_OPERATIONS_V2_ENABLED: "false",
      },
    }),
    false,
  );
  assert.equal(
    resolveClientOperationsV2Enabled({
      env: {
        LAWOS_CLIENT_OPERATIONS_V2_ENABLED: "true",
      },
    }),
    true,
  );
  assert.throws(
    () => resolveClientOperationsV2Enabled({
      env: {
        LAWOS_CLIENT_OPERATIONS_V2_ENABLED: "enabled",
      },
    }),
    /must be true or false/u,
  );
});
