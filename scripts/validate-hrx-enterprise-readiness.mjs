#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "packages/hrx/src/compliance-report.js",
  "packages/hrx/test/compliance-report.test.js",
  "scripts/hrx-backup-restore-smoke.mjs",
  "scripts/validate-hrx-security-negative-tests.mjs",
  "docs/hrx-enterprise/uat-scenarios.md",
  "apps/web/e2e/hrx/people-home.spec.ts",
  "apps/web/e2e/hrx/leave-request.spec.ts",
  "apps/web/e2e/hrx/hr-documents.spec.ts",
  "apps/web/e2e/hrx/candidate-portal.spec.ts",
  "apps/web/e2e/hrx/hrx-audit-viewer.spec.ts",
  "apps/api/test/hrx/tenant-isolation.test.js",
];

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const requiredScripts = ["hrx:runtime:validate", "hrx:security:validate", "hrx:enterprise:validate", "web:e2e", "rp30:hrx:validate"];
const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`${file}: missing`);
}
for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json scripts.${script}: missing`);
}

const traceability = readFileSync(resolve(root, "docs/hrx-enterprise/tuw-traceability-matrix.md"), "utf8");
for (const tuw of ["HRX-ENT-L8-W01-T06", "HRX-ENT-L8-W01-T07", "HRX-ENT-L8-W01-T08", "HRX-ENT-L8-W01-T09", "HRX-ENT-L8-W01-T10"]) {
  if (!traceability.includes(tuw)) errors.push(`${tuw}: missing from traceability matrix`);
}

if (errors.length > 0) {
  console.error("HRX enterprise readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX enterprise readiness validation passed.");
console.log("p0_missing: 0");
console.log(`required_files: ${requiredFiles.length}`);
console.log(`required_scripts: ${requiredScripts.length}`);
