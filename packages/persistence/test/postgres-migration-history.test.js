import assert from "node:assert/strict";
import test from "node:test";

import { checksumPostgresMigration } from "../src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../src/postgres/migration-runner.js";

function poolWithMigrationHistory(rows) {
  const client = {
    async query(sql) {
      if (String(sql).includes("FROM lawos_meta.schema_migrations")) return { rows };
      return { rows: [] };
    },
    release() {},
  };
  return { connect: async () => client };
}

test("allowed historical gaps fail closed on every other catalog drift", async (t) => {
  const migrations = [
    { id: "001_foundation_first", sql: "SELECT 1;" },
    { id: "002_foundation_second", sql: "SELECT 2;" },
    { id: "012_outlook_document_source_identity", sql: "SELECT 12;" },
    { id: "013_dms_precedent_search", sql: "SELECT 13;" },
    { id: "014_docusign_outbox", sql: "SELECT 14;" },
    { id: "100_hrx_first", sql: "SELECT 100;" },
    { id: "101_hrx_second", sql: "SELECT 101;" },
  ];
  const checksum = (index) => checksumPostgresMigration(migrations[index].sql);
  const row = (index) => ({
    migration_id: migrations[index].id,
    checksum: checksum(index),
  });
  const scenarios = [
    {
      name: "unknown migration",
      rows: [{ migration_id: "999_subset_unknown", checksum: checksum(0) }],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    },
    {
      name: "checksum mismatch",
      rows: [{ migration_id: migrations[0].id, checksum: "0".repeat(64) }],
      code: "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
    },
    {
      name: "catalog-relative order drift",
      rows: [row(1), row(0)],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    },
    {
      name: "duplicate migration",
      rows: [row(0), row(0)],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    },
    {
      name: "unallowed foundation hole",
      rows: [row(0), row(5)],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    },
    {
      name: "unallowed HRX hole",
      rows: [row(0), row(1), row(6)],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      await assert.rejects(
        runPostgresMigrations(poolWithMigrationHistory(scenario.rows), {
          migrations,
          appliedBy: "historical-gap-negative-test",
          allowedHistoricalGapIds: [
            "012_outlook_document_source_identity",
            "013_dms_precedent_search",
            "014_docusign_outbox",
          ],
        }),
        (error) => error?.code === scenario.code,
      );
    });
  }
  for (const [name, allowedHistoricalGapIds] of [
    ["non-string gap id", [12]],
    ["padded gap id", [" 012_outlook_document_source_identity"]],
  ]) {
    await t.test(name, async () => {
      await assert.rejects(
        runPostgresMigrations(poolWithMigrationHistory([]), {
          migrations,
          allowedHistoricalGapIds,
        }),
        TypeError,
      );
    });
  }
});
