#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSqlHrxRepository } from "../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";
import { assertHrxStoreReadyForCoreRuntime } from "../packages/hrx/src/store/port.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of [
  "packages/hrx/src/store/port.js",
  "packages/hrx/src/store/file-store.js",
  "packages/hrx/src/repository-sql.js",
  "packages/hrx/src/migrations/index.js",
  "packages/hrx/src/migrations/001_hrx_core.sql",
  "scripts/migrate-hrx.mjs",
  "scripts/seed-hrx-fixtures.mjs",
  "packages/hrx/test/repository-sql.test.js",
  "packages/hrx/test/migration.test.js",
  "apps/api/test/hrx/durability.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
assert(packageJson.scripts?.["hrx:persistence:validate"] === "node scripts/validate-hrx-persistence.mjs", "package script hrx:persistence:validate missing");
assert(packageJson.scripts?.["db:migrate:test"] === "node --test packages/hrx/test/migration.test.js", "package script db:migrate:test mismatch");

const repositorySource = readFileSync(resolve(root, "packages/hrx/src/repository.js"), "utf8");
assert(repositorySource.includes("HRX_IN_MEMORY_REPOSITORY_SCOPE"), "in-memory repository must declare fixture-only scope");
assert(repositorySource.includes("test_fixture_only"), "in-memory repository must be marked test_fixture_only");

try {
  const dir = mkdtempSync(join(tmpdir(), "hrx-persistence-"));
  const storeFile = join(dir, "hrx-store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  assertHrxStoreReadyForCoreRuntime(store);
  const repo = createSqlHrxRepository({ store, clock: () => "2026-06-20T00:00:00.000Z" });
  repo.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  repo.createEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-001",
    employee_id: "emp-001",
    employment_type: "full_time",
    status: "active",
    effective_from: "2026-06-20",
  });
  repo.createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-001",
    employee_id: "emp-001",
    user_id: "user-001",
    purpose: "login_mapping",
  });
  try {
    repo.transaction((tx) => {
      tx.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-rollback", display_name: "Rollback", status: "active" });
      throw new Error("force rollback");
    });
  } catch (error) {
    assert(error.message === "force rollback", "rollback test should throw expected error");
  }
  assert(!repo.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-rollback" }), "transaction rollback must discard employee write");
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedRepo = createSqlHrxRepository({ store: reopenedStore });
  assert(
    reopenedRepo.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" })?.display_name === "Ari Kim",
    "employee must survive store reopen",
  );
  assert(
    reopenedRepo.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1,
    "employment profile must survive store reopen",
  );
  assert(
    reopenedRepo.listEmployeeUserLinks({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1,
    "employee user link must survive store reopen",
  );
  reopenedStore.close();
} catch (error) {
  errors.push(error.stack ?? error.message);
}

if (errors.length > 0) {
  console.error("HRX persistence validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX persistence validation passed.");
console.log("durable_store: file-backed");
console.log("core_tables: hrx_employees, hrx_employment_profiles, hrx_employee_user_links");
