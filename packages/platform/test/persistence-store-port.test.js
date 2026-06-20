import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../../hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../hrx/src/store/file-store.js";
import { HRX_DURABLE_CORE_TABLES, HRX_DURABLE_WORKFLOW_TABLES } from "../../hrx/src/store/port.js";
import {
  PLATFORM_PERSISTENCE_PORT_VERSION,
  assertRuntimePersistenceStore,
  createRuntimePersistenceDescriptor,
} from "../src/persistence/store-port.js";

test("runtime persistence port rejects Map and non-durable stores", () => {
  assert.throws(
    () => assertRuntimePersistenceStore(new Map(), { bounded_context: "cmp" }),
    /durable persistence store object/,
  );
  assert.throws(
    () =>
      assertRuntimePersistenceStore(
        {
          query() {},
          transaction() {},
          migrate() {},
          close() {},
          capabilities: { durable: false, migrations: true, transactions: true, tables: [] },
        },
        { bounded_context: "cmp" },
      ),
    /durable=true/,
  );
});

test("runtime persistence port accepts migrated durable file-backed HRX store", () => {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "platform-persistence-")), "store.json") });
  runHrxMigrations(store);
  const requiredTables = [...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES];
  assert.equal(assertRuntimePersistenceStore(store, { bounded_context: "hrx", requiredTables }), true);
  const descriptor = createRuntimePersistenceDescriptor({ store, bounded_context: "hrx", requiredTables });
  assert.equal(descriptor.port_version, PLATFORM_PERSISTENCE_PORT_VERSION);
  assert.equal(descriptor.store_kind, "hrx-file-sql-store");
  assert.deepEqual(descriptor.required_tables, requiredTables);
  store.close();
});
