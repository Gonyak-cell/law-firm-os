import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  HRX_APPEND_ONLY_TABLES,
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "./store/file-store.js";
import { listHrxPostgresMigrations } from "./postgres-migrations.js";

export const HRX_RELATIONAL_MAPPING_VERSION =
  "law-firm-os.hrx-relational-mapping-manifest.v2";
export const HRX_RELATIONAL_INVENTORY_VERSION =
  "law-firm-os.hrx-relational-production-inventory.v2";
export const HRX_RELATIONAL_INTERNAL_COLUMNS = Object.freeze([
  "lawos_projection_deleted_at",
]);

const SHA256 = /^[a-f0-9]{64}$/u;
const TABLE_SET = new Set(HRX_STORE_TABLES);
const APPEND_ONLY = new Set(HRX_APPEND_ONLY_TABLES);
const INTERNAL_COLUMN_SET = new Set(HRX_RELATIONAL_INTERNAL_COLUMNS);

const WAVE_ONE = new Set([
  "hrx_employees",
  "hrx_employment_profiles",
  "hrx_employee_user_links",
  "hrx_documents",
  "hrx_compensation_records",
]);
const WAVE_TWO = new Set([
  "hrx_job_openings",
  "hrx_candidates",
  "hrx_candidate_consents",
  "hrx_applications",
  "hrx_interviews",
  "hrx_offers",
  "hrx_onboarding_plans",
  "hrx_offboarding_cases",
]);
const WAVE_FIVE = new Set([
  "hrx_audit_events",
  "hrx_risk_events",
  "hrx_operational_approvals",
  "hrx_operational_policies",
  "hrx_ai_review_items",
  "hrx_ai_source_registry",
  "hrx_ai_source_chunks",
  "hrx_analytics_snapshots",
  "hrx_leave_sync_outbox",
  "hrx_leave_job_outbox",
  "hrx_payroll_outbox",
]);

function fail(message, code = "LAWOS_HRX_RELATIONAL_MAPPING") {
  throw Object.assign(new Error(message), { code, safe_error_code: code });
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) fail(`${label} is required`);
  return text;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const observed = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    fail(`${label} fields are invalid`);
  }
}

function digest(value) {
  return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}

function manifestMaterial(value) {
  const { manifest_sha256: ignored, ...material } = value;
  return material;
}

function inventoryMaterial(value) {
  const { inventory_sha256: ignored, ...material } = value;
  return material;
}

function safeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} must be a non-negative integer`);
  return value;
}

function rolloutWave(table) {
  if (WAVE_ONE.has(table)) return 1;
  if (WAVE_TWO.has(table)) return 2;
  if (WAVE_FIVE.has(table)) return 5;
  if (table.startsWith("hrx_payroll_")) return 4;
  return 3;
}

function migrationCatalogMaterial() {
  return listHrxPostgresMigrations().map((migration) => ({
    id: migration.id,
    file_name: migration.file_name,
    sql_sha256: createHash("sha256").update(migration.sql).digest("hex"),
  }));
}

export function hrxRelationalMigrationCatalogSha256() {
  return digest(migrationCatalogMaterial());
}

export function hrxRelationalRecordTypeCatalogSha256() {
  return digest(HRX_STORE_TABLES.map((table) => ({
    table_name: table,
    source_record_type: table,
    primary_key: HRX_TABLE_PRIMARY_KEYS[table],
    append_only: APPEND_ONLY.has(table),
  })));
}

function normalizeColumns(rows) {
  const byTable = new Map(HRX_STORE_TABLES.map((table) => [table, []]));
  for (const row of rows ?? []) {
    if (!TABLE_SET.has(row.table_name)) continue;
    byTable.get(row.table_name).push({
      column_name: requiredText(row.column_name, "column_name"),
      ordinal_position: Number(row.ordinal_position),
      nullable: row.is_nullable === true || row.is_nullable === "YES",
      data_type: requiredText(row.data_type, "data_type"),
      has_default: row.column_default != null,
      internal: INTERNAL_COLUMN_SET.has(row.column_name),
    });
  }
  for (const [table, columns] of byTable) {
    columns.sort((left, right) => left.ordinal_position - right.ordinal_position);
    if (columns.length === 0) fail(`relational table is missing: ${table}`);
    const expectedPrimaryKey = HRX_TABLE_PRIMARY_KEYS[table];
    if (!expectedPrimaryKey.every((field) => columns.some((column) => column.column_name === field))) {
      fail(`relational primary-key column is missing: ${table}`);
    }
  }
  return byTable;
}

function normalizeForeignKeys(rows) {
  const grouped = new Map();
  for (const row of rows ?? []) {
    if (!TABLE_SET.has(row.table_name) || !TABLE_SET.has(row.referenced_table_name)) continue;
    const key = `${row.table_name}:${requiredText(row.constraint_name, "constraint_name")}`;
    const current = grouped.get(key) ?? {
      constraint_name: row.constraint_name,
      table_name: row.table_name,
      referenced_table_name: row.referenced_table_name,
      columns: [],
      referenced_columns: [],
    };
    current.columns.push([Number(row.ordinal_position), requiredText(row.column_name, "foreign-key column")]);
    current.referenced_columns.push([
      Number(row.ordinal_position),
      requiredText(row.referenced_column_name, "foreign-key referenced column"),
    ]);
    grouped.set(key, current);
  }
  const byTable = new Map(HRX_STORE_TABLES.map((table) => [table, []]));
  for (const value of grouped.values()) {
    const columns = value.columns.sort(([left], [right]) => left - right).map(([, column]) => column);
    const referencedColumns = value.referenced_columns
      .sort(([left], [right]) => left - right)
      .map(([, column]) => column);
    byTable.get(value.table_name).push({
      constraint_name: value.constraint_name,
      columns,
      referenced_table: value.referenced_table_name,
      referenced_columns: referencedColumns,
      deferred_validation: value.table_name === value.referenced_table_name,
    });
  }
  for (const rowsForTable of byTable.values()) {
    rowsForTable.sort((left, right) => left.constraint_name.localeCompare(right.constraint_name));
  }
  return byTable;
}

function dependencyOrder(foreignKeysByTable) {
  const dependencies = new Map(HRX_STORE_TABLES.map((table) => [
    table,
    new Set((foreignKeysByTable.get(table) ?? [])
      .filter((foreignKey) => !foreignKey.deferred_validation)
      .map((foreignKey) => foreignKey.referenced_table)),
  ]));
  const remaining = new Set(HRX_STORE_TABLES);
  const ordered = [];
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((table) => [...dependencies.get(table)].every((dependency) => !remaining.has(dependency)))
      .sort();
    if (ready.length === 0) {
      fail("cross-table foreign-key dependency cycle requires an explicit contract");
    }
    for (const table of ready) {
      ordered.push(table);
      remaining.delete(table);
    }
  }
  return ordered;
}

export async function inspectHrxRelationalSchema(client) {
  if (!client || typeof client.query !== "function") fail("PostgreSQL client is required");
  const columns = await client.query(
      `SELECT table_name, column_name, ordinal_position, is_nullable,
              data_type, column_default
         FROM information_schema.columns
        WHERE table_schema = 'lawos_hrx'
          AND table_name = ANY($1::text[])
        ORDER BY table_name, ordinal_position`,
      [HRX_STORE_TABLES],
    );
  const foreignKeys = await client.query(
      `SELECT source.relname AS table_name,
              constraint_row.conname AS constraint_name,
              source_column.attname AS column_name,
              target.relname AS referenced_table_name,
              target_column.attname AS referenced_column_name,
              paired.ordinality AS ordinal_position
         FROM pg_constraint AS constraint_row
         JOIN pg_class AS source ON source.oid = constraint_row.conrelid
         JOIN pg_namespace AS source_namespace ON source_namespace.oid = source.relnamespace
         JOIN pg_class AS target ON target.oid = constraint_row.confrelid
         JOIN pg_namespace AS target_namespace ON target_namespace.oid = target.relnamespace
         JOIN LATERAL unnest(constraint_row.conkey, constraint_row.confkey)
              WITH ORDINALITY AS paired(source_attnum, target_attnum, ordinality) ON true
         JOIN pg_attribute AS source_column
           ON source_column.attrelid = source.oid
          AND source_column.attnum = paired.source_attnum
         JOIN pg_attribute AS target_column
           ON target_column.attrelid = target.oid
          AND target_column.attnum = paired.target_attnum
        WHERE constraint_row.contype = 'f'
          AND source_namespace.nspname = 'lawos_hrx'
          AND target_namespace.nspname = 'lawos_hrx'
        ORDER BY source.relname, constraint_row.conname, paired.ordinality`,
    );
  return Object.freeze({
    columns: Object.freeze(columns.rows.map((row) => Object.freeze({ ...row }))),
    foreign_keys: Object.freeze(foreignKeys.rows.map((row) => Object.freeze({ ...row }))),
  });
}

export function createHrxRelationalProductionInventory({
  tenantCount,
  tables,
  outboxEventCount,
  outboxLagMs,
  referenceCount,
  queryTelemetryAvailable = false,
  genericLedgerQueryCount = 0,
  genericLedgerQueryP95Ms = 0,
} = {}) {
  const normalizedTables = [...(tables ?? [])]
    .map((table) => {
      exactKeys(table, [
        "table_name",
        "source_count",
        "source_hash",
        "state_version_min",
        "state_version_max",
        "payload_bytes_p50",
        "payload_bytes_p95",
        "payload_bytes_max",
        "soft_deleted_count",
        "append_only_count",
        "reference_count",
        "json_path_presence_sha256",
        "json_path_null_ratio_sha256",
        "unmapped_nonnull_field_count",
        "primary_key_conflict_count",
        "foreign_key_conflict_count",
        "inventory_classification",
      ], "inventory table");
      const tableName = requiredText(table.table_name, "inventory table_name");
      if (!TABLE_SET.has(tableName) || !SHA256.test(table.source_hash)
        || !SHA256.test(table.json_path_presence_sha256)
        || !SHA256.test(table.json_path_null_ratio_sha256)
        || !["populated", "schema_only", "blocked_mapping"]
          .includes(table.inventory_classification)) {
        fail("inventory table identity or digest is invalid");
      }
      for (const key of [
        "source_count",
        "state_version_min",
        "state_version_max",
        "payload_bytes_p50",
        "payload_bytes_p95",
        "payload_bytes_max",
        "soft_deleted_count",
        "append_only_count",
        "reference_count",
        "unmapped_nonnull_field_count",
        "primary_key_conflict_count",
        "foreign_key_conflict_count",
      ]) safeInteger(table[key], `inventory ${tableName}.${key}`);
      if (table.payload_bytes_p50 > table.payload_bytes_p95
        || table.payload_bytes_p95 > table.payload_bytes_max
        || (table.source_count === 0
          && table.inventory_classification !== "schema_only")
        || (table.source_count > 0
          && table.inventory_classification === "schema_only")
        || (table.unmapped_nonnull_field_count > 0
          || table.primary_key_conflict_count > 0
          || table.foreign_key_conflict_count > 0)
          && table.inventory_classification !== "blocked_mapping"
      ) {
        fail(`inventory classification or payload distribution is invalid: ${tableName}`);
      }
      return Object.freeze({ ...table });
    })
    .sort((left, right) => left.table_name.localeCompare(right.table_name));
  if (normalizedTables.length !== HRX_STORE_TABLES.length
    || new Set(normalizedTables.map((table) => table.table_name)).size !== HRX_STORE_TABLES.length) {
    fail("inventory must contain every HRX table exactly once");
  }
  const value = {
    schema_version: HRX_RELATIONAL_INVENTORY_VERSION,
    tenant_count: safeInteger(tenantCount, "inventory tenant_count"),
    table_count: normalizedTables.length,
    source_record_count: normalizedTables.reduce((total, table) => total + table.source_count, 0),
    outbox_event_count: safeInteger(outboxEventCount, "inventory outbox_event_count"),
    outbox_lag_ms: safeInteger(outboxLagMs, "inventory outbox_lag_ms"),
    reference_count: safeInteger(referenceCount, "inventory reference_count"),
    query_telemetry_available: queryTelemetryAvailable === true,
    generic_ledger_query_count: safeInteger(
      genericLedgerQueryCount,
      "inventory generic_ledger_query_count",
    ),
    generic_ledger_query_p95_ms: safeInteger(
      genericLedgerQueryP95Ms,
      "inventory generic_ledger_query_p95_ms",
    ),
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    tables: normalizedTables,
  };
  return Object.freeze({ ...value, inventory_sha256: digest(value) });
}

export function validateHrxRelationalProductionInventory(value = {}) {
  exactKeys(value, [
    "schema_version",
    "tenant_count",
    "table_count",
    "source_record_count",
    "outbox_event_count",
    "outbox_lag_ms",
    "reference_count",
    "query_telemetry_available",
    "generic_ledger_query_count",
    "generic_ledger_query_p95_ms",
    "raw_value_returned",
    "pii_returned",
    "secret_material_returned",
    "tables",
    "inventory_sha256",
  ], "production inventory");
  const recreated = createHrxRelationalProductionInventory({
    tenantCount: value.tenant_count,
    tables: value.tables,
    outboxEventCount: value.outbox_event_count,
    outboxLagMs: value.outbox_lag_ms,
    referenceCount: value.reference_count,
    queryTelemetryAvailable: value.query_telemetry_available,
    genericLedgerQueryCount: value.generic_ledger_query_count,
    genericLedgerQueryP95Ms: value.generic_ledger_query_p95_ms,
  });
  if (value.raw_value_returned !== false
    || value.pii_returned !== false
    || value.secret_material_returned !== false
    || value.table_count !== recreated.table_count
    || value.source_record_count !== recreated.source_record_count
    || value.inventory_sha256 !== digest(inventoryMaterial(value))) {
    fail("production inventory contract or digest is invalid");
  }
  return Object.freeze({
    valid: true,
    inventory_sha256: value.inventory_sha256,
    source_record_count: value.source_record_count,
    table_count: value.table_count,
  });
}

export function createHrxRelationalMappingManifest({
  schema,
  inventory,
  performanceAcceptanceSha256,
} = {}) {
  validateHrxRelationalProductionInventory(inventory);
  if (inventory.tables.some((table) =>
    table.inventory_classification === "blocked_mapping"
    || table.unmapped_nonnull_field_count !== 0
    || table.primary_key_conflict_count !== 0
    || table.foreign_key_conflict_count !== 0)) {
    fail("production inventory contains unresolved mapping gaps");
  }
  if (!SHA256.test(performanceAcceptanceSha256 ?? "")) {
    fail("performance acceptance digest is invalid");
  }
  const columnsByTable = normalizeColumns(schema?.columns);
  const foreignKeysByTable = normalizeForeignKeys(schema?.foreign_keys);
  const order = dependencyOrder(foreignKeysByTable);
  const inventoryByTable = new Map(inventory.tables.map((table) => [table.table_name, table]));
  const rolloutWaveByTable = new Map(
    HRX_STORE_TABLES.map((table) => [table, rolloutWave(table)]),
  );
  for (let pass = 0; pass < HRX_STORE_TABLES.length; pass += 1) {
    let changed = false;
    for (const table of HRX_STORE_TABLES) {
      const dependencyWave = (foreignKeysByTable.get(table) ?? [])
        .reduce(
          (maximum, foreignKey) => Math.max(
            maximum,
            rolloutWaveByTable.get(foreignKey.referenced_table) ?? 1,
          ),
          rolloutWaveByTable.get(table),
        );
      if (dependencyWave !== rolloutWaveByTable.get(table)) {
        rolloutWaveByTable.set(table, dependencyWave);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const tables = order.map((table) => {
    const columns = columnsByTable.get(table);
    const sourceColumns = columns.filter((column) => !column.internal);
    const requiredColumns = sourceColumns
      .filter((column) => !column.nullable && !column.has_default)
      .map((column) => column.column_name);
    const nullableColumns = sourceColumns
      .filter((column) => column.nullable)
      .map((column) => column.column_name);
    const expectation = inventoryByTable.get(table);
    const schemaContractSha256 = digest({
      table_name: table,
      columns: sourceColumns,
      foreign_keys: foreignKeysByTable.get(table) ?? [],
    });
    return Object.freeze({
      table_name: table,
      source_record_type: table,
      primary_key: Object.freeze([...HRX_TABLE_PRIMARY_KEYS[table]]),
      foreign_keys: Object.freeze((foreignKeysByTable.get(table) ?? []).map((value) => Object.freeze({
        ...value,
        columns: Object.freeze([...value.columns]),
        referenced_columns: Object.freeze([...value.referenced_columns]),
      }))),
      payload_columns: Object.freeze(sourceColumns.map((column) => column.column_name)),
      internal_columns: HRX_RELATIONAL_INTERNAL_COLUMNS,
      required_columns: Object.freeze(requiredColumns),
      nullable_columns: Object.freeze(nullableColumns),
      append_only: APPEND_ONLY.has(table),
      tombstone_policy: APPEND_ONLY.has(table)
        ? "append-only-tombstone-rejected"
        : "projection-metadata-soft-delete",
      unknown_field_policy: "reject-non-null",
      expected_source_count: expectation.source_count,
      expected_source_hash: expectation.source_hash,
      inventory_classification: expectation.inventory_classification,
      rollout_wave: rolloutWaveByTable.get(table),
      performance_budget_sha256: performanceAcceptanceSha256,
      schema_contract_sha256: schemaContractSha256,
      migration_catalog_sha256: hrxRelationalMigrationCatalogSha256(),
    });
  });
  const value = {
    schema_version: HRX_RELATIONAL_MAPPING_VERSION,
    table_count: tables.length,
    record_type_catalog_sha256: hrxRelationalRecordTypeCatalogSha256(),
    migration_catalog_sha256: hrxRelationalMigrationCatalogSha256(),
    inventory_sha256: inventory.inventory_sha256,
    performance_acceptance_sha256: performanceAcceptanceSha256,
    dependency_order: Object.freeze([...order]),
    deferred_reference_count: tables.reduce(
      (total, table) => total + table.foreign_keys.filter((foreignKey) => foreignKey.deferred_validation).length,
      0,
    ),
    schema_only_table_count: tables.filter((table) => table.inventory_classification === "schema_only").length,
    unknown_field_policy: "reject-non-null",
    authority: "postgres-v2-generic-ledger",
    projection_role: "read-model-only",
    tables: Object.freeze(tables),
  };
  return Object.freeze({ ...value, manifest_sha256: digest(value) });
}

export function validateHrxRelationalMappingManifest(value = {}) {
  exactKeys(value, [
    "schema_version",
    "table_count",
    "record_type_catalog_sha256",
    "migration_catalog_sha256",
    "inventory_sha256",
    "performance_acceptance_sha256",
    "dependency_order",
    "deferred_reference_count",
    "schema_only_table_count",
    "unknown_field_policy",
    "authority",
    "projection_role",
    "tables",
    "manifest_sha256",
  ], "mapping manifest");
  if (value.schema_version !== HRX_RELATIONAL_MAPPING_VERSION
    || value.table_count !== HRX_STORE_TABLES.length
    || value.record_type_catalog_sha256 !== hrxRelationalRecordTypeCatalogSha256()
    || value.migration_catalog_sha256 !== hrxRelationalMigrationCatalogSha256()
    || !SHA256.test(value.inventory_sha256 ?? "")
    || !SHA256.test(value.performance_acceptance_sha256 ?? "")
    || value.unknown_field_policy !== "reject-non-null"
    || value.authority !== "postgres-v2-generic-ledger"
    || value.projection_role !== "read-model-only"
    || value.manifest_sha256 !== digest(manifestMaterial(value))) {
    fail("mapping manifest identity or digest is invalid");
  }
  if (!Array.isArray(value.dependency_order)
    || value.dependency_order.length !== HRX_STORE_TABLES.length
    || new Set(value.dependency_order).size !== HRX_STORE_TABLES.length
    || value.dependency_order.some((table) => !TABLE_SET.has(table))) {
    fail("mapping dependency order is invalid");
  }
  if (!Array.isArray(value.tables) || value.tables.length !== HRX_STORE_TABLES.length) {
    fail("mapping table set is incomplete");
  }
  const byTable = new Map();
  for (const table of value.tables) {
    exactKeys(table, [
      "table_name",
      "source_record_type",
      "primary_key",
      "foreign_keys",
      "payload_columns",
      "internal_columns",
      "required_columns",
      "nullable_columns",
      "append_only",
      "tombstone_policy",
      "unknown_field_policy",
      "expected_source_count",
      "expected_source_hash",
      "inventory_classification",
      "rollout_wave",
      "performance_budget_sha256",
      "schema_contract_sha256",
      "migration_catalog_sha256",
    ], "mapping table");
    if (!TABLE_SET.has(table.table_name)
      || table.source_record_type !== table.table_name
      || JSON.stringify(table.primary_key) !== JSON.stringify(HRX_TABLE_PRIMARY_KEYS[table.table_name])
      || table.append_only !== APPEND_ONLY.has(table.table_name)
      || table.unknown_field_policy !== "reject-non-null"
      || !SHA256.test(table.expected_source_hash ?? "")
      || !SHA256.test(table.performance_budget_sha256 ?? "")
      || !SHA256.test(table.schema_contract_sha256 ?? "")
      || table.migration_catalog_sha256 !== value.migration_catalog_sha256
      || table.performance_budget_sha256 !== value.performance_acceptance_sha256
      || !["populated", "schema_only"].includes(table.inventory_classification)
      || !Number.isSafeInteger(table.rollout_wave)
      || table.rollout_wave < 1
      || table.rollout_wave > 5) {
      fail(`mapping table contract is invalid: ${table.table_name ?? "unknown"}`);
    }
    safeInteger(table.expected_source_count, `${table.table_name}.expected_source_count`);
    if (table.inventory_classification === "schema_only" && table.expected_source_count !== 0) {
      fail(`schema-only mapping contains source rows: ${table.table_name}`);
    }
    if (!Array.isArray(table.payload_columns)
      || !Array.isArray(table.internal_columns)
      || !Array.isArray(table.required_columns)
      || !Array.isArray(table.nullable_columns)
      || !Array.isArray(table.foreign_keys)
      || table.primary_key.some((column) => !table.payload_columns.includes(column))
      || table.internal_columns.some((column) => !INTERNAL_COLUMN_SET.has(column))) {
      fail(`mapping columns are invalid: ${table.table_name}`);
    }
    byTable.set(table.table_name, table);
  }
  if (byTable.size !== HRX_STORE_TABLES.length) fail("mapping table names are duplicated");
  const position = new Map(value.dependency_order.map((table, index) => [table, index]));
  for (const table of value.tables) {
    for (const foreignKey of table.foreign_keys) {
      exactKeys(foreignKey, [
        "constraint_name",
        "columns",
        "referenced_table",
        "referenced_columns",
        "deferred_validation",
      ], "mapping foreign key");
      if (!TABLE_SET.has(foreignKey.referenced_table)
        || foreignKey.columns.length === 0
        || foreignKey.columns.length !== foreignKey.referenced_columns.length
        || (!foreignKey.deferred_validation
          && position.get(foreignKey.referenced_table) >= position.get(table.table_name))
        || byTable.get(foreignKey.referenced_table).rollout_wave
          > table.rollout_wave) {
        fail(`mapping foreign-key order is invalid: ${table.table_name}`);
      }
    }
  }
  return Object.freeze({
    valid: true,
    manifest_sha256: value.manifest_sha256,
    table_count: value.table_count,
    dependency_order: Object.freeze([...value.dependency_order]),
  });
}

export async function assertHrxRelationalMappingMatchesDatabase(client, manifest) {
  validateHrxRelationalMappingManifest(manifest);
  const schema = await inspectHrxRelationalSchema(client);
  const inventory = {
    schema_version: HRX_RELATIONAL_INVENTORY_VERSION,
    tenant_count: 0,
    table_count: manifest.table_count,
    source_record_count: manifest.tables.reduce((total, table) => total + table.expected_source_count, 0),
    outbox_event_count: 0,
    outbox_lag_ms: 0,
    reference_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    tables: manifest.tables.map((table) => ({
      table_name: table.table_name,
      source_count: table.expected_source_count,
      source_hash: table.expected_source_hash,
      state_version_min: 0,
      state_version_max: 0,
      payload_bytes_p50: 0,
      payload_bytes_p95: 0,
      payload_bytes_max: 0,
      soft_deleted_count: 0,
      append_only_count: 0,
      reference_count: 0,
      json_path_presence_sha256: digest([]),
      json_path_null_ratio_sha256: digest([]),
      unmapped_nonnull_field_count: 0,
      primary_key_conflict_count: 0,
      foreign_key_conflict_count: 0,
      inventory_classification:
        table.expected_source_count === 0 ? "schema_only" : "populated",
    })),
    query_telemetry_available: false,
    generic_ledger_query_count: 0,
    generic_ledger_query_p95_ms: 0,
  };
  inventory.inventory_sha256 = digest(inventory);
  const recreated = createHrxRelationalMappingManifest({
    schema,
    inventory,
    performanceAcceptanceSha256: manifest.performance_acceptance_sha256,
  });
  const structural = (value) => value.tables.map((table) => ({
    table_name: table.table_name,
    primary_key: table.primary_key,
    foreign_keys: table.foreign_keys,
    payload_columns: table.payload_columns,
    internal_columns: table.internal_columns,
    required_columns: table.required_columns,
    nullable_columns: table.nullable_columns,
    append_only: table.append_only,
    tombstone_policy: table.tombstone_policy,
    unknown_field_policy: table.unknown_field_policy,
    rollout_wave: table.rollout_wave,
    performance_budget_sha256: table.performance_budget_sha256,
    schema_contract_sha256: table.schema_contract_sha256,
    migration_catalog_sha256: table.migration_catalog_sha256,
  }));
  if (digest(structural(recreated)) !== digest(structural(manifest))
    || JSON.stringify(recreated.dependency_order) !== JSON.stringify(manifest.dependency_order)) {
    fail("mapping manifest drifted from the deployed relational schema");
  }
  return Object.freeze({
    valid: true,
    manifest_sha256: manifest.manifest_sha256,
    schema_contract_sha256: digest(structural(recreated)),
  });
}

export function hrxRelationalMappingTable(manifest, tableName) {
  validateHrxRelationalMappingManifest(manifest);
  return manifest.tables.find((table) => table.table_name === tableName) ?? null;
}

export function createHrxRelationalMappingGapReport(inventory) {
  validateHrxRelationalProductionInventory(inventory);
  const tables = inventory.tables
    .filter((table) =>
      table.inventory_classification === "blocked_mapping"
      || table.unmapped_nonnull_field_count > 0
      || table.primary_key_conflict_count > 0
      || table.foreign_key_conflict_count > 0)
    .map((table) => Object.freeze({
      table_name: table.table_name,
      unmapped_nonnull_field_count: table.unmapped_nonnull_field_count,
      primary_key_conflict_count: table.primary_key_conflict_count,
      foreign_key_conflict_count: table.foreign_key_conflict_count,
    }));
  const material = {
    schema_version: "law-firm-os.hrx-relational-mapping-gap-report.v1",
    inventory_sha256: inventory.inventory_sha256,
    blocked_table_count: tables.length,
    unmapped_nonnull_field_count: tables.reduce(
      (total, table) => total + table.unmapped_nonnull_field_count,
      0,
    ),
    primary_key_conflict_count: tables.reduce(
      (total, table) => total + table.primary_key_conflict_count,
      0,
    ),
    foreign_key_conflict_count: tables.reduce(
      (total, table) => total + table.foreign_key_conflict_count,
      0,
    ),
    raw_value_returned: false,
    pii_returned: false,
    tables,
  };
  return Object.freeze({ ...material, result_sha256: digest(material) });
}

export function createHrxRelationalDependencyOrder(manifest) {
  validateHrxRelationalMappingManifest(manifest);
  const edges = manifest.tables.flatMap((table) =>
    table.foreign_keys.map((foreignKey) => Object.freeze({
      table_name: table.table_name,
      referenced_table: foreignKey.referenced_table,
      deferred_validation: foreignKey.deferred_validation,
    })));
  const material = {
    schema_version: "law-firm-os.hrx-relational-dependency-order.v1",
    mapping_manifest_sha256: manifest.manifest_sha256,
    table_count: manifest.table_count,
    dependency_order: [...manifest.dependency_order],
    deferred_reference_count: manifest.deferred_reference_count,
    edge_count: edges.length,
    edges,
  };
  return Object.freeze({ ...material, result_sha256: digest(material) });
}
