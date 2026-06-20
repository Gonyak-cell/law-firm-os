#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pr13RequiredFiles = [
  "packages/authz/src/sso-subject-map.js",
  "packages/authz/test/sso-subject-map.test.js",
  "packages/hrx/src/scim-boundary.js",
  "packages/hrx/test/scim-boundary.test.js",
  "packages/authz/src/hrx-step-up-session.js",
  "packages/authz/test/hrx-step-up-session.test.js",
  "apps/api/test/hrx/tenant-isolation.test.js",
  "packages/hrx/src/observability.js",
  "packages/hrx/test/observability.test.js",
  "docs/hrx-enterprise/slo-definition.md",
  "packages/hrx/src/compliance-report.js",
  "packages/hrx/test/compliance-report.test.js",
  "packages/hrx/src/retention-job.js",
  "packages/hrx/test/retention-job.test.js",
];

const pr14RequiredFiles = [
  "scripts/hrx-backup-restore-smoke.mjs",
  "docs/hrx-enterprise/dr-runbook.md",
  "apps/api/test/hrx/performance-smoke.test.js",
  "apps/api/test/hrx/security-regression.test.js",
  "apps/api/test/hrx/secret-exposure.test.js",
  "docs/hrx-enterprise/uat-scenarios.md",
  "docs/hrx-enterprise/uat-results.md",
];

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const requiredScripts = [
  "hrx:runtime:validate",
  "hrx:security:validate",
  "hrx:enterprise:validate",
  "hrx:release:validate",
  "hrx:no-premature-claim:validate",
  "web:e2e",
  "rp30:hrx:validate",
];
const pr13Tuws = ["HRX-L7-001", "HRX-L7-002", "HRX-L7-003", "HRX-L7-004", "HRX-L7-005", "HRX-L7-006", "HRX-L7-007", "HRX-L7-008"];
const pr14Tuws = ["HRX-L7-009", "HRX-L7-010", "HRX-L7-011", "HRX-L7-012", "HRX-L7-013", "HRX-L7-014", "HRX-L7-015", "HRX-L7-016"];
const errors = [];

for (const file of pr13RequiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`${file}: missing`);
}
for (const file of pr14RequiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`${file}: missing`);
}
for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json scripts.${script}: missing`);
}

const traceability = readFileSync(resolve(root, "docs/hrx-enterprise/tuw-traceability-matrix.md"), "utf8");
for (const tuw of pr13Tuws) {
  if (!traceability.includes(tuw)) errors.push(`${tuw}: missing from traceability matrix`);
  const closedPattern = new RegExp(`\\| ${tuw} \\|[^\\n]+\\| closed \\|`);
  if (!closedPattern.test(traceability)) errors.push(`${tuw}: not closed in traceability matrix`);
}
for (const tuw of pr14Tuws) {
  if (!traceability.includes(tuw)) errors.push(`${tuw}: missing from traceability matrix`);
  const closedPattern = new RegExp(`\\| ${tuw} \\|[^\\n]+\\| closed \\|`);
  if (!closedPattern.test(traceability)) errors.push(`${tuw}: not closed in traceability matrix`);
}

if (errors.length > 0) {
  console.error("HRX enterprise readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX enterprise readiness validation passed.");
console.log("p0_missing: 0");
console.log(`pr13_required_files: ${pr13RequiredFiles.length}`);
console.log(`pr14_required_files: ${pr14RequiredFiles.length}`);
console.log(`required_scripts: ${requiredScripts.length}`);
