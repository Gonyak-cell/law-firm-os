#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createInMemoryHrxRepository } from "../packages/hrx/src/repository.js";

const dryRun = process.argv.includes("--dry-run");
if (!dryRun) {
  console.error("HRX fixture seeding is dry-run only in HRX-P04. Pass --dry-run.");
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

const repository = createInMemoryHrxRepository({
  employees: fixture.employees,
  employment_profiles: fixture.employment_profiles,
});

console.log("HRX synthetic fixture dry-run passed.");
console.log(`employees: ${repository.listEmployees({ tenant_id: "tenant-synthetic" }).length}`);
console.log(`employment_profiles: ${repository.listEmploymentProfiles({ tenant_id: "tenant-synthetic" }).length}`);
