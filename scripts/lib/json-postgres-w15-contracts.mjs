import { createHash } from "node:crypto";
import {
  createHrxRelationalDependencyOrder,
  createHrxRelationalMappingGapReport,
  createHrxRelationalMappingManifest,
  validateHrxRelationalMappingManifest,
  validateHrxRelationalProductionInventory,
} from "../../packages/hrx/src/relational-projection-contract.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_W15_CONTRACT_BUNDLE_VERSION =
  "law-firm-os.json-postgres-w15-contract-bundle.v1";

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

function assertSchemaObservation(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)
    || JSON.stringify(Object.keys(schema).sort())
      !== JSON.stringify(["columns", "foreign_keys"])) {
    fail("W15 schema observation must contain only columns and foreign_keys");
  }
  if (!Array.isArray(schema.columns) || !Array.isArray(schema.foreign_keys)) {
    fail("W15 schema observation arrays are required");
  }
  for (const row of schema.columns) {
    if (!row || typeof row !== "object" || Array.isArray(row)
      || typeof row.table_name !== "string"
      || typeof row.column_name !== "string"
      || !Number.isSafeInteger(Number(row.ordinal_position))) {
      fail("W15 schema column observation is invalid");
    }
  }
  for (const row of schema.foreign_keys) {
    if (!row || typeof row !== "object" || Array.isArray(row)
      || typeof row.table_name !== "string"
      || typeof row.constraint_name !== "string"
      || typeof row.column_name !== "string"
      || typeof row.referenced_table_name !== "string"
      || typeof row.referenced_column_name !== "string"
      || !Number.isSafeInteger(Number(row.ordinal_position))) {
      fail("W15 schema foreign-key observation is invalid");
    }
  }
  return schema;
}

export function createJsonPostgresW15InventorySummary(inventory) {
  validateHrxRelationalProductionInventory(inventory);
  const material = {
    schema_version: "law-firm-os.json-postgres-w15-inventory-summary.v1",
    inventory_sha256: inventory.inventory_sha256,
    tenant_count: inventory.tenant_count,
    table_count: inventory.table_count,
    source_record_count: inventory.source_record_count,
    populated_table_count: inventory.tables.filter((table) =>
      table.inventory_classification === "populated").length,
    schema_only_table_count: inventory.tables.filter((table) =>
      table.inventory_classification === "schema_only").length,
    blocked_mapping_table_count: inventory.tables.filter((table) =>
      table.inventory_classification === "blocked_mapping").length,
    outbox_event_count: inventory.outbox_event_count,
    outbox_lag_ms: inventory.outbox_lag_ms,
    reference_count: inventory.reference_count,
    query_telemetry_available: inventory.query_telemetry_available,
    generic_ledger_query_count: inventory.generic_ledger_query_count,
    generic_ledger_query_p95_ms: inventory.generic_ledger_query_p95_ms,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function createJsonPostgresW15ContractBundle({
  schema,
  inventory,
  performanceAcceptance,
} = {}) {
  assertSchemaObservation(schema);
  validateHrxRelationalProductionInventory(inventory);
  validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (performanceAcceptance.record_count !== inventory.source_record_count
    || performanceAcceptance.tenant_count !== inventory.tenant_count) {
    fail("W15 performance acceptance does not bind the production inventory");
  }
  const gapReport = createHrxRelationalMappingGapReport(inventory);
  const inventorySummary = createJsonPostgresW15InventorySummary(inventory);
  const blocked = gapReport.blocked_table_count > 0
    || gapReport.unmapped_nonnull_field_count > 0
    || gapReport.primary_key_conflict_count > 0
    || gapReport.foreign_key_conflict_count > 0;
  if (blocked) {
    const material = {
      schema_version: JSON_POSTGRES_W15_CONTRACT_BUNDLE_VERSION,
      outcome: "BLOCKED",
      inventory_sha256: inventory.inventory_sha256,
      inventory_summary_sha256: inventorySummary.result_sha256,
      performance_acceptance_sha256:
        performanceAcceptance.acceptance_sha256,
      mapping_gap_report_sha256: gapReport.result_sha256,
      mapping_manifest_sha256: null,
      dependency_order_sha256: null,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    };
    return Object.freeze({
      summary: Object.freeze({ ...material, result_sha256: sha256(material) }),
      inventorySummary,
      gapReport,
      mappingManifest: null,
      dependencyOrder: null,
    });
  }
  const mappingManifest = createHrxRelationalMappingManifest({
    schema,
    inventory,
    performanceAcceptanceSha256:
      performanceAcceptance.acceptance_sha256,
  });
  validateHrxRelationalMappingManifest(mappingManifest);
  const dependencyOrder =
    createHrxRelationalDependencyOrder(mappingManifest);
  const material = {
    schema_version: JSON_POSTGRES_W15_CONTRACT_BUNDLE_VERSION,
    outcome: "PASS",
    inventory_sha256: inventory.inventory_sha256,
    inventory_summary_sha256: inventorySummary.result_sha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    mapping_gap_report_sha256: gapReport.result_sha256,
    mapping_manifest_sha256: mappingManifest.manifest_sha256,
    dependency_order_sha256: dependencyOrder.result_sha256,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  return Object.freeze({
    summary: Object.freeze({ ...material, result_sha256: sha256(material) }),
    inventorySummary,
    gapReport,
    mappingManifest,
    dependencyOrder,
  });
}
