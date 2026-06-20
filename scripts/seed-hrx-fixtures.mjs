#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInMemoryHrxRepository } from "../packages/hrx/src/repository.js";
import { createSqlHrxRepository } from "../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";

const dryRun = process.argv.includes("--dry-run");
const storeFileIndex = process.argv.indexOf("--store-file");
const storeFile =
  storeFileIndex === -1
    ? undefined
    : process.argv[storeFileIndex + 1] && resolve(process.argv[storeFileIndex + 1]);

if (!dryRun && !storeFile) {
  console.error("HRX fixture seeding requires --store-file unless --dry-run is set.");
  process.exit(1);
}

const fixturePath = "packages/hrx/fixtures/seed-employees.synthetic.json";
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const errors = [];

if (fixture.synthetic !== true) errors.push("fixture must be synthetic=true");
if (fixture.production_data !== false) errors.push("fixture must be production_data=false");
if (fixture.real_employee_data_included !== false) errors.push("fixture must be real_employee_data_included=false");
if (!Array.isArray(fixture.employees) || fixture.employees.length === 0) errors.push("fixture employees are required");
if (!Array.isArray(fixture.employment_profiles)) errors.push("fixture employment_profiles must be an array");

if (errors.length > 0) {
  console.error("HRX fixture validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

let repository;
let store;

if (storeFile) {
  store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  repository = createSqlHrxRepository({ store });
  for (const employee of fixture.employees) repository.createEmployee(employee);
  for (const profile of fixture.employment_profiles) repository.createEmploymentProfile(profile);
} else {
  repository = createInMemoryHrxRepository({
    employees: fixture.employees,
    employment_profiles: fixture.employment_profiles,
  });
}

console.log("HRX synthetic fixture seed passed.");
console.log(`dry_run: ${dryRun}`);
console.log(`repository_mode: ${storeFile ? "file-backed" : "in-memory-fixture"}`);
console.log(`employees: ${repository.listEmployees({ tenant_id: "tenant-synthetic" }).length}`);
console.log(`employment_profiles: ${repository.listEmploymentProfiles({ tenant_id: "tenant-synthetic" }).length}`);
store?.close();
