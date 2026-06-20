import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHrxRuntimeContext } from "../../src/hrx-runtime-context.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";

test("HRX runtime repository write survives store reopen", () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-runtime-durability-")), "hrx-store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store });
  context.repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-durable",
    display_name: "Durable Employee",
    status: "active",
  });
  context.repository.createEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-durable",
    employee_id: "emp-durable",
    employment_type: "full_time",
    status: "active",
    effective_from: "2026-06-20",
  });
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedRepository = createSqlHrxRepository({ store: reopenedStore });
  assert.equal(
    reopenedRepository.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-durable" }).display_name,
    "Durable Employee",
  );
  assert.equal(reopenedRepository.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  reopenedStore.close();
});
